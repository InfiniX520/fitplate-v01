#!/usr/bin/env python3
"""Controlled bridge between the FitPlate AGH plugin and the geometry CLI (T06/T08/T10).

This file is the *only* program the plugin is allowed to start through
``toolCtx.exec``. It is deliberately a plain, dependency-free script that owns
everything the JavaScript layer must not do itself:

* the run store (``runs/<run_id>/``) - directory creation, the frozen input
  copies, the manifest, the event log, version numbering and the budget;
* atomic publication - every file is written to a temporary sibling and
  ``os.replace``d, every directory is renamed into place, and an existing
  version directory is never overwritten (plan section 10.3);
* single-writer locking (``fcntl.flock``) so two concurrent tool calls cannot
  interleave a read-modify-write of the manifest;
* mediation of the geometry CLI - the actual CAD work runs in a *fresh child
  process* (``python -m fitplate.cli <cmd> --request-stdin``), so a validation
  always re-reads the STEP file from disk instead of trusting anything this
  process or the generator remembered.

It also enforces the boundary rules the model must not be able to talk around:
no path ever comes from the model, ``workspace_root`` is the process working
directory (set by the Host through ``toolCtx.exec({cwd})``), every resolved
path must stay inside that workspace, symlinks anywhere along a run path are
refused, and the caller identity (session key / lane / tool-use id) is recorded
for attribution but never used as authority.

Wire contract (one request per process, exit codes mirror the geometry CLI):

    python_bridge.py <subcommand>            # stdin: one JSON request object
    stdout: exactly one JSON envelope; diagnostics go to stderr
    exit 0 encoded a result (which may be a business refusal) ... see below
    exit 3 the request was refused by the run store / contract (business)
    exit 2 the command could not be carried out (execution failure)

Envelope::

    {"schema_version": "1.0", "bridge_version": ..., "command": ...,
     "ok": bool, "status": "OK|NEEDS_INPUT|INVALID_SPEC|LOCKED_CONSTRAINT_CHANGED|
     STALE_INPUT|BUDGET_EXHAUSTED|DUPLICATE_CANDIDATE|...",
     "code": "...", "message": "...", "run_id"?, "candidate_id"?,
     "task_id"?, "task_revision"?, "data": {...}}
"""

from __future__ import annotations

import contextlib
import fcntl
import hashlib
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Iterator, Mapping, Sequence

BRIDGE_VERSION = "fitplate-bridge/1.0.0"
SCHEMA_VERSION = "1.0"

EXIT_OK = 0
EXIT_ERROR = 2
EXIT_REFUSED = 3

SUBCOMMANDS = (
    "load_task",
    "build_candidate",
    "validate_candidate",
    "export_package",
    "get_run",
    "intake_compile_request",
    "intake_stage_request",
    "intake_read_staged_compile",
    "intake_commit_task",
)

MAX_REQUEST_BYTES = 8 * 1024 * 1024
MAX_CHILD_STDOUT_BYTES = 16 * 1024 * 1024
MAX_CHILD_STDERR_BYTES = 256 * 1024

MAX_MANIFEST_BYTES = 4 * 1024 * 1024
MAX_REPORT_BYTES = 4 * 1024 * 1024
MAX_EVIDENCE_BYTES = 16 * 1024 * 1024

RUN_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
TASK_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,62}$")
CANDIDATE_ID_RE = re.compile(r"^v[0-9]{3}$")
SEGMENT_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
FILE_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")

#: Files the export bundle may contain; the artifact service mirrors this list.
REGISTERED_TASK_FILES = ("task.json",)
REGISTERED_CANDIDATE_FILES = (
    "model.step",
    "model.stl",
    "preview.json",
    "preview_mesh.json",
    "design.json",
    "task.json",
    "scene.json",
    "build.json",
    "repro.py",
)
REGISTERED_REPORT_FILES = ("report.json", "evidence.json")

#: Validator modules whose content hash is recorded with every report/export.
VALIDATOR_MODULES = ("fitplate/constraints.py", "fitplate/inspect_step.py", "fitplate/scene.py")

DEFAULT_BUDGET_LIMIT_MS = 180_000
DEFAULT_COMMAND_TIMEOUT_MS = 30_000
DEFAULT_MAX_CANDIDATES = 4  # one initial candidate plus three revisions (plan section 7.2)


class Refusal(Exception):
    """The request is unusable; nothing was published."""

    exit_code = EXIT_REFUSED

    def __init__(self, code: str, message: str, status: str = "INVALID_SPEC", detail: Any = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.detail = detail


class ExecutionFailure(Exception):
    """The request was well-formed but the work could not be completed."""

    exit_code = EXIT_ERROR

    def __init__(self, code: str, message: str, status: str = "ERROR", detail: Any = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.detail = detail


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------


def _now() -> str:
    import datetime

    return datetime.datetime.now(tz=datetime.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _sha256_json(value: Any) -> str:
    return _sha256_bytes(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8"))


def _require_str(request: Mapping[str, Any], field: str, *, pattern: re.Pattern[str] | None = None, max_len: int = 256) -> str:
    value = request.get(field)
    if not isinstance(value, str) or not value:
        raise Refusal("REQUEST_MALFORMED", f"/{field}: expected a non-empty string", status="INVALID_SPEC")
    if len(value) > max_len:
        raise Refusal("REQUEST_MALFORMED", f"/{field}: longer than {max_len} characters", status="INVALID_SPEC")
    if pattern is not None and not pattern.fullmatch(value):
        raise Refusal("REQUEST_MALFORMED", f"/{field}: {value!r} is not a safe identifier", status="INVALID_SPEC")
    return value


def _optional_str(request: Mapping[str, Any], field: str, *, pattern: re.Pattern[str], max_len: int = 256) -> str | None:
    value = request.get(field)
    if value is None:
        return None
    return _require_str(request, field, pattern=pattern, max_len=max_len)


# ---------------------------------------------------------------------------
# Path safety: everything stays inside the Workspace the Host selected
# ---------------------------------------------------------------------------


def refuse_symlinks(root: Path, target: Path) -> None:
    """Refuse a path that escapes the workspace or walks through a symlink.

    Two checks, in this order, because each alone is insufficient:

    1. every component of the *lexical* path below the root must not be a
       symlink - resolving the path first would erase exactly the alias this
       check exists to catch;
    2. the fully resolved path must still be inside the resolved root, which
       catches a root that itself resolves elsewhere and lexical tricks the
       component walk cannot see.

    Both directories and files are checked; the bridge calls this for every run
    path it is about to create or read.
    """
    root = Path(os.path.realpath(root))
    lexical = Path(os.path.abspath(target))
    resolved = Path(os.path.realpath(lexical))
    if resolved != root and not str(resolved).startswith(str(root) + os.sep):
        raise Refusal("INVALID_PATH", f"path escapes the workspace: {target}", status="INVALID_SPEC")
    try:
        relative = lexical.relative_to(root)
    except ValueError:
        relative = Path(os.path.relpath(lexical, root))
    current = root
    for part in relative.parts:
        if part in ("", "."):
            continue
        if part == "..":
            raise Refusal("INVALID_PATH", f"path escapes the workspace: {target}", status="INVALID_SPEC")
        current = current / part
        if current.is_symlink():
            raise Refusal("INVALID_PATH", f"symlink is not allowed in a run path: {current}", status="INVALID_SPEC")


# Backwards-compatible private alias used inside this module.
_refuse_symlinks = refuse_symlinks


def _safe_dir(root: Path, *parts: str, create: bool = False) -> Path:
    for part in parts:
        if not isinstance(part, str) or not SEGMENT_RE.fullmatch(part) or part in (".", ".."):
            raise Refusal("INVALID_PATH", f"refusing unsafe path segment {part!r}", status="INVALID_SPEC")
    target = root.joinpath(*parts)
    _refuse_symlinks(root, target)
    if create:
        target.mkdir(parents=True, exist_ok=True)
        _refuse_symlinks(root, target)
    return target


# ---------------------------------------------------------------------------
# The workspace / run store
# ---------------------------------------------------------------------------


class Workspace:
    """The Host-selected working directory plus the configured layout names."""

    def __init__(self, config: Mapping[str, Any]) -> None:
        self.root = Path(os.getcwd())
        if not self.root.is_dir():
            raise Refusal("INVALID_PATH", "the working directory does not exist", status="INVALID_SPEC")
        self.root = Path(os.path.realpath(self.root))

        geometry_root = config.get("geometry_root")
        if not isinstance(geometry_root, str) or not os.path.isabs(geometry_root):
            raise Refusal("CONFIG_INVALID", "/config/geometry_root: an absolute path is required", status="INVALID_SPEC")
        self.geometry_root = Path(os.path.realpath(geometry_root))
        for marker in ("fitplate/cli.py", "fitplate/schema.py"):
            if not (self.geometry_root / marker).is_file():
                raise Refusal(
                    "CONFIG_INVALID",
                    f"/config/geometry_root: {self.geometry_root} does not contain {marker}",
                    status="INVALID_SPEC",
                )

        python_path = config.get("python_path")
        if not isinstance(python_path, str) or not os.path.isabs(python_path) or not Path(python_path).is_file():
            raise Refusal("CONFIG_INVALID", "/config/python_path: an absolute interpreter path is required", status="INVALID_SPEC")
        self.python_path = str(Path(python_path))

        bridge_path = config.get("bridge_path")
        if not isinstance(bridge_path, str) or os.path.realpath(bridge_path) != os.path.realpath(__file__):
            raise Refusal("CONFIG_INVALID", "/config/bridge_path: must point at this bridge file", status="INVALID_SPEC")
        self.bridge_path = os.path.realpath(__file__)

        runs_dir = config.get("runs_dir", "runs")
        tasks_dir = config.get("tasks_dir", "input/tasks")
        for name, value in (("runs_dir", runs_dir), ("tasks_dir", tasks_dir)):
            if not isinstance(value, str) or not value or os.path.isabs(value) or ".." in value.split("/"):
                raise Refusal("CONFIG_INVALID", f"/config/{name}: a relative in-workspace path is required", status="INVALID_SPEC")
        self.runs_dir_name = runs_dir
        self.tasks_dir_name = tasks_dir

        budget = config.get("budget") if isinstance(config.get("budget"), Mapping) else {}
        self.budget_limit_ms = _positive_int(budget.get("task_timeout_ms"), DEFAULT_BUDGET_LIMIT_MS, "task_timeout_ms")
        self.command_timeout_ms = _positive_int(budget.get("command_timeout_ms"), DEFAULT_COMMAND_TIMEOUT_MS, "command_timeout_ms")
        self.max_candidates = _positive_int(budget.get("max_candidates"), DEFAULT_MAX_CANDIDATES, "max_candidates")

    # -- fixed locations ---------------------------------------------------

    def runs_root(self, *, create: bool = False) -> Path:
        return _safe_dir(self.root, *self.runs_dir_name.split("/"), create=create)

    def tasks_root(self) -> Path:
        return _safe_dir(self.root, *self.tasks_dir_name.split("/"))

    def task_dir(self, task_id: str) -> Path:
        return _safe_dir(self.tasks_root(), task_id)

    def intake_registry_root(self) -> Path:
        """The one fixed registry location inside this workspace (never a payload path)."""
        return _safe_dir(self.root, "input", "intake-registry")

    def run_dir(self, run_id: str, *, create: bool = False) -> Path:
        return _safe_dir(self.runs_root(create=create), run_id, create=create)

    def manifest_path(self, run_id: str) -> Path:
        return self.run_dir(run_id) / "manifest.json"

    # -- manifest ----------------------------------------------------------

    def read_manifest(self, run_id: str) -> dict[str, Any]:
        path = self.manifest_path(run_id)
        refuse_symlinks(self.root, path)
        if not path.is_file():
            raise Refusal("RUN_NOT_FOUND", f"no run manifest for {run_id}", status="STALE_INPUT")
        if path.stat().st_size > MAX_MANIFEST_BYTES:
            raise ExecutionFailure("MANIFEST_TOO_LARGE", "the run manifest exceeds the size cap")
        try:
            with open(path, "r", encoding="utf-8") as handle:
                manifest = json.load(handle)
        except (OSError, json.JSONDecodeError) as exc:
            raise ExecutionFailure("MANIFEST_UNREADABLE", f"the run manifest could not be read: {exc}") from exc
        if not isinstance(manifest, dict) or manifest.get("run_id") != run_id:
            raise ExecutionFailure("MANIFEST_INVALID", "the run manifest does not describe this run")
        return manifest

    def write_manifest(self, run_id: str, manifest: Mapping[str, Any]) -> None:
        manifest = dict(manifest)
        manifest["updated_at"] = _now()
        payload = (json.dumps(manifest, indent=2, sort_keys=True, allow_nan=False) + "\n").encode("utf-8")
        if len(payload) > MAX_MANIFEST_BYTES:
            raise ExecutionFailure("MANIFEST_TOO_LARGE", "the run manifest would exceed the size cap")
        target = self.manifest_path(run_id)
        _atomic_bytes(target, payload)

    def append_event(self, run_id: str, event: Mapping[str, Any]) -> int:
        path = self.run_dir(run_id) / "events.jsonl"
        refuse_symlinks(self.root, path)
        record = dict(event)
        line = json.dumps(record, sort_keys=True, allow_nan=False) + "\n"
        with open(path, "a", encoding="utf-8") as handle:
            handle.write(line)
            handle.flush()
            os.fsync(handle.fileno())
        return int(record["seq"])


def _positive_int(value: Any, default: int, field: str) -> int:
    if value is None:
        return default
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise Refusal("CONFIG_INVALID", f"/config/budget/{field}: expected a positive integer", status="INVALID_SPEC")
    return value


def _atomic_bytes(target: Path, payload: bytes) -> None:
    """Write a file by creating a temporary sibling and renaming it into place."""
    tmp = target.with_name(f".tmp-{target.name}-{os.getpid()}-{int(time.time() * 1000) % 1_000_000}")
    try:
        with open(tmp, "wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp, target)
    finally:
        if tmp.exists():
            tmp.unlink(missing_ok=True)


class RunLock:
    """Serialise read-modify-write of one run (plan: single writer per run)."""

    def __init__(self, run_dir: Path) -> None:
        self.path = run_dir / "run.lock"
        self.handle = None

    def __enter__(self) -> "RunLock":
        self.handle = open(self.path, "a", encoding="utf-8")
        fcntl.flock(self.handle.fileno(), fcntl.LOCK_EX)
        return self

    def __exit__(self, *_exc: Any) -> None:
        if self.handle is not None:
            fcntl.flock(self.handle.fileno(), fcntl.LOCK_UN)
            self.handle.close()
            self.handle = None


def _remove_own_temporary(path: Path) -> None:
    """Remove the temporary this process created; never another process's.

    A concurrent command may be writing its own ``.tmp-*`` sibling, so nothing
    here scans or deletes foreign temporaries. Cleanup of crashed runs'
    leftovers belongs to an explicit, lock-holding recovery step, not to the
    next unrelated call.
    """
    if not path.exists():
        return
    if path.is_symlink():
        path.unlink(missing_ok=True)
        return
    if path.is_dir():
        shutil.rmtree(path, ignore_errors=True)
        return
    path.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Session identity (attribution only - never authority)
# ---------------------------------------------------------------------------


def _session(request: Mapping[str, Any]) -> dict[str, str]:
    session = request.get("session")
    if not isinstance(session, Mapping):
        raise Refusal("REQUEST_MALFORMED", "/session: the Host session identity is required", status="INVALID_SPEC")
    key = session.get("key")
    lane = session.get("lane")
    tool_use_id = session.get("tool_use_id")
    if not isinstance(key, str) or not key or len(key) > 256:
        raise Refusal("REQUEST_MALFORMED", "/session/key: expected the Host session key", status="INVALID_SPEC")
    if not isinstance(lane, str) or len(lane) > 128:
        raise Refusal("REQUEST_MALFORMED", "/session/lane: expected the Host lane", status="INVALID_SPEC")
    if not isinstance(tool_use_id, str) or not tool_use_id or len(tool_use_id) > 128:
        raise Refusal("REQUEST_MALFORMED", "/session/tool_use_id: expected the Host tool-use id", status="INVALID_SPEC")
    return {"key": key, "lane": lane, "tool_use_id": tool_use_id}


def _require_owner(manifest: Mapping[str, Any], session: Mapping[str, str], workspace: Workspace) -> None:
    owner = manifest.get("owner") or {}
    if owner.get("session_key") != session["key"] or owner.get("workspace_root") != str(workspace.root):
        raise Refusal(
            "SESSION_MISMATCH",
            "this run belongs to another session or workspace; runs are not shared across sessions",
            status="STALE_INPUT",
        )


# ---------------------------------------------------------------------------
# Geometry CLI mediation
# ---------------------------------------------------------------------------

_CHILD: subprocess.Popen[bytes] | None = None

#: What the current process is doing, so a termination can be recorded instead
#: of leaving a run stuck in BUILDING/VALIDATING/EXPORTING with no diagnosis.
_ACTIVE: dict[str, Any] = {}

#: How long a SIGTERM waits for the child process group before it is killed.
TERMINATION_GRACE_SECONDS = 5.0


def _terminate_child(*_args: Any) -> None:
    """Answer SIGTERM: stop the working child, record the cancellation, exit.

    The child runs in its own process group (``start_new_session=True``), so it
    is signalled as a group - an interrupted command cannot leave grandchildren
    behind. The handler then *waits* for the child to actually exit (escalating
    to SIGKILL after :data:`TERMINATION_GRACE_SECONDS`) before writing the
    cancellation, because a run must never record "cancelled" while the work it
    describes is still running, and must never exit claiming the geometry
    finished. The CAD time the child actually consumed is charged to the run
    budget before the process leaves.
    """
    global _CHILD
    child = _CHILD
    if child is not None and child.poll() is None:
        _signal_group(child, signal.SIGTERM)
        deadline = time.monotonic() + TERMINATION_GRACE_SECONDS
        while child.poll() is None and time.monotonic() < deadline:
            time.sleep(0.05)
        if child.poll() is None:
            _signal_group(child, signal.SIGKILL)
        try:
            child.wait(timeout=TERMINATION_GRACE_SECONDS)
        except (subprocess.TimeoutExpired, OSError):  # pragma: no cover - unreapable child
            pass
    _record_cancellation()
    raise SystemExit(143)


def _signal_group(child: subprocess.Popen[bytes], signum: int) -> None:
    try:
        os.killpg(os.getpgid(child.pid), signum)
    except (OSError, PermissionError):  # pragma: no cover - fall back to the direct child
        try:
            child.send_signal(signum)
        except OSError:
            pass


def _reap_child(child: subprocess.Popen[bytes]) -> None:
    """Kill a child *and its whole process group*, then wait until it is gone.

    ``Popen.kill`` only signals the direct child; a geometry CLI that spawned
    grandchildren (or a shell wrapper) would survive it and keep writing into
    the run directory after the bridge reported a timeout. The group is
    signalled explicitly, then reaped, so nothing of the command is still
    running when the caller records its outcome.
    """
    _signal_group(child, signal.SIGKILL)
    deadline = time.monotonic() + TERMINATION_GRACE_SECONDS
    while child.poll() is None and time.monotonic() < deadline:
        time.sleep(0.02)
    try:
        child.wait(timeout=TERMINATION_GRACE_SECONDS)
    except (subprocess.TimeoutExpired, OSError):  # pragma: no cover - unreapable child
        pass


def _record_cancellation() -> None:
    """Mark the in-flight run as CANCELLED on disk, then return.

    Best effort by design: a cancellation that cannot be recorded must not stop
    the process from exiting, but when it can be recorded the run stops claiming
    to be BUILDING/VALIDATING/EXPORTING and carries one event that says what
    happened - named with the real tool-use id and charged with the CAD time
    the child actually consumed before it was stopped. The handler is only ever
    entered while this process already holds the run lock (or before any run
    exists), so it writes through a private path rather than trying to
    re-acquire its own lock.
    """
    active = dict(_ACTIVE)
    manifest = active.get("manifest")
    workspace = active.get("workspace")
    if not isinstance(manifest, dict) or not isinstance(workspace, Workspace):
        return
    run_id = str(manifest.get("run_id") or "")
    if not RUN_ID_RE.fullmatch(run_id):
        return
    try:
        in_flight = manifest.get("status") in ("BUILDING", "VALIDATING", "EXPORTING")
        if not in_flight and active.get("finished", False):
            # No command of this run was in flight and none had been left
            # unsettled: there is nothing to cancel and nothing to record.
            return
        duration_ms: float | None = None
        started = active.get("started_perf")
        if isinstance(started, (int, float)) and not active.get("finished", False):
            duration_ms = round(max(0.0, (time.perf_counter() - float(started)) * 1000.0), 3)
            if duration_ms > 0:
                _charge_budget(workspace, manifest, duration_ms, command=str(active.get("command") or "unknown"))
        if in_flight:
            manifest["status"] = "CANCELLED"
        session = active.get("session") if isinstance(active.get("session"), Mapping) else {"key": "?", "lane": "", "tool_use_id": "?"}
        data: dict[str, Any] = {"reason": "the bridge received SIGTERM while the geometry child was running"}
        if duration_ms is not None:
            data["charged_ms"] = duration_ms
        _append_manifest_event(
            workspace,
            manifest,
            {
                "kind": str(active.get("command") or "unknown"),
                "status": "CANCELLED",
                "code": "SIGTERM",
                "session": dict(session),
                "candidate_id": active.get("candidate_id"),
                "data": data,
            },
        )
    except Exception:  # pragma: no cover - a cancellation report is never worth a crash
        pass


def _run_cli(
    workspace: Workspace,
    command: str,
    request: Mapping[str, Any],
    *,
    active: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Run one geometry CLI command in a fresh process and return its result payload.

    The CLI's stdout carries exactly one JSON envelope - enforced here as well,
    so a kernel/library that writes to stdout cannot silently corrupt the
    result the plugin stores.
    """
    global _CHILD
    if active is not None:
        # Register what this process is doing, so a SIGTERM arriving while the
        # child runs can be written into the run as a cancellation instead of
        # leaving it stuck in BUILDING/VALIDATING/EXPORTING. The record stays
        # in place until the process exits (or the next command overwrites it):
        # clearing it here would open a window in which a SIGTERM could not
        # name the command it interrupted.
        _ACTIVE.clear()
        _ACTIVE.update(active)
        _ACTIVE["finished"] = False
    payload = json.dumps(request, sort_keys=True, allow_nan=False).encode("utf-8")
    env = dict(os.environ)
    env["PYTHONPATH"] = os.pathsep.join(
        [str(workspace.geometry_root)] + ([env["PYTHONPATH"]] if env.get("PYTHONPATH") else [])
    )
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    argv = [workspace.python_path, "-m", "fitplate.cli", command, "--request-stdin"]
    started = time.perf_counter()
    try:
        child = subprocess.Popen(
            argv,
            cwd=str(workspace.root),
            env=env,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
        )
    except OSError as exc:
        if active is not None:
            _ACTIVE["finished"] = True
        raise ExecutionFailure(
            "EXEC_FAILED",
            f"the geometry CLI could not be started: {exc}",
            detail={"command": command, "duration_ms": 0.0, "child_started": False},
        ) from exc
    _CHILD = child
    if active is not None:
        _ACTIVE["started_perf"] = started
        _ACTIVE["child_pid"] = child.pid
    try:
        try:
            stdout, stderr = child.communicate(payload, timeout=workspace.command_timeout_ms / 1000.0)
        except subprocess.TimeoutExpired:
            duration_ms = round((time.perf_counter() - started) * 1000.0, 3)
            # Kill the whole process group and wait until it is gone: a timeout
            # must not leave a descendant writing into the run store.
            _reap_child(child)
            stdout, stderr = child.communicate()
            raise ExecutionFailure(
                "EXEC_TIMEOUT",
                f"the geometry CLI exceeded {workspace.command_timeout_ms} ms for {command}",
                detail={"command": command, "duration_ms": duration_ms, "child_started": True},
            )
    finally:
        _CHILD = None
        if active is not None:
            # The child has stopped; the command's outcome is now decided and
            # the caller settles it. The record stays (with ``finished``) so a
            # SIGTERM arriving before that settlement still names the command.
            _ACTIVE["finished"] = True
    duration_ms = round((time.perf_counter() - started) * 1000.0, 3)

    def failed(code: str, message: str, *, extra: Mapping[str, Any] | None = None) -> ExecutionFailure:
        detail: dict[str, Any] = {"command": command, "duration_ms": duration_ms, "child_started": True}
        if extra:
            detail.update(extra)
        return ExecutionFailure(code, message, detail=detail)

    if len(stdout) > MAX_CHILD_STDOUT_BYTES:
        raise failed("OUTPUT_TOO_LARGE", f"{command}: the CLI wrote more than {MAX_CHILD_STDOUT_BYTES} bytes")
    diagnostic = stderr[:MAX_CHILD_STDERR_BYTES].decode("utf-8", "replace")
    text = stdout.decode("utf-8", "replace").strip()
    if not text:
        raise failed(
            "OUTPUT_MISSING",
            f"{command}: the CLI wrote no result (exit {child.returncode})",
            extra={"stderr_tail": diagnostic[-2000:]},
        )
    try:
        envelope = json.loads(text)
    except json.JSONDecodeError as exc:
        raise failed(
            "OUTPUT_MALFORMED",
            f"{command}: the CLI stdout is not a single JSON document",
            extra={"stderr_tail": diagnostic[-2000:]},
        ) from exc
    if not isinstance(envelope, Mapping) or envelope.get("command") != command:
        raise failed("OUTPUT_MALFORMED", f"{command}: the CLI result is not the expected envelope")

    status = envelope.get("status")
    if child.returncode == 0:
        if status != "OK":
            raise failed("OUTPUT_MALFORMED", f"{command}: exit 0 but status {status!r}")
        result = envelope.get("result")
        if not isinstance(result, Mapping):
            raise failed("OUTPUT_MALFORMED", f"{command}: the CLI result carries no result object")
        return {"result": dict(result), "envelope": dict(envelope), "duration_ms": duration_ms, "stderr_tail": diagnostic[-2000:]}

    errors = envelope.get("errors") or []
    first = errors[0] if isinstance(errors, Sequence) and errors and isinstance(errors[0], Mapping) else {}
    code = str(first.get("code") or "CLI_REFUSED")
    message = str(first.get("message") or f"the geometry CLI refused {command}")
    detail = {"errors": [dict(error) for error in errors if isinstance(error, Mapping)][:16], "duration_ms": duration_ms}
    detail.update({"command": command, "child_started": True})
    if child.returncode == 3:
        raise Refusal(code, message, status=str(status or "INVALID_SPEC"), detail=detail)
    raise ExecutionFailure(code, message, status=str(status or "ERROR"), detail=detail)


# ---------------------------------------------------------------------------
# Validator code hash (what actually decided the report)
# ---------------------------------------------------------------------------


def _contract(workspace: Workspace) -> Any:
    """Import the frozen contract layer from the configured geometry root."""
    root = str(workspace.geometry_root)
    if root not in sys.path:
        sys.path.insert(0, root)
    from fitplate import schema as contract  # noqa: PLC0415 - deferred until the root is known

    return contract


def _preflight(workspace: Workspace) -> Any:
    """Import the pre-generation classifier from the configured geometry root.

    Kept lazy (and separate from ``_contract``) because importing it pulls in
    CadQuery; only ``load_task`` pays that cost, once per run.
    """
    root = str(workspace.geometry_root)
    if root not in sys.path:
        sys.path.insert(0, root)
    try:
        from fitplate import preflight as classifier  # noqa: PLC0415 - deferred until the root is known
    except Exception as exc:  # pragma: no cover - a broken installation must be loud
        raise ExecutionFailure(
            "CONFIG_INVALID",
            f"the input classifier is not importable from the geometry root: {type(exc).__name__}: {exc}",
        ) from exc
    return classifier


def _validator_code_hash(workspace: Workspace) -> str:
    parts: dict[str, str] = {}
    for relative in VALIDATOR_MODULES:
        path = workspace.geometry_root / relative
        if not path.is_file():
            raise ExecutionFailure("CONFIG_INVALID", f"the validator module {relative} is missing from the geometry root")
        parts[relative] = _sha256_file(path)
    return _sha256_json(parts)


# ---------------------------------------------------------------------------
# Subcommands
# ---------------------------------------------------------------------------


@contextlib.contextmanager
def _load_lock(workspace: Workspace):
    """Serialise load identity resolution (scan + create) so two loads can never race a new run."""
    runs_root = workspace.runs_root(create=True)
    lock_path = runs_root / ".load.lock"
    refuse_symlinks(workspace.root, lock_path)
    handle = open(lock_path, "a", encoding="utf-8")
    try:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        yield
    finally:
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        finally:
            handle.close()


def _identity_matches(manifest: Mapping[str, Any], *, task_id: str, revision: int, task_sha: Any, scene_sha: Any, source: str, budget_params: tuple[int, int, int]) -> bool:
    """Same input identity AND the same budget contract: a different budget config is a new run."""
    frozen = manifest.get("frozen") or {}
    budget = manifest.get("budget") or {}
    return (
        manifest.get("task_id") == task_id
        and int(manifest.get("task_revision", -1)) == int(revision)
        and frozen.get("task_sha256") == task_sha
        and frozen.get("scene_sha256") == scene_sha
        and frozen.get("source", "workspace-task-dir") == source
        and int(budget.get("limit_ms", -1)) == budget_params[0]
        and int(budget.get("command_timeout_ms", -1)) == budget_params[1]
        and int(budget.get("max_candidates", -1)) == budget_params[2]
    )


def _find_reusable_run(workspace: Workspace, session: Mapping[str, str], identity: Mapping[str, Any]) -> dict[str, Any] | None:
    """The newest run this session/lane already created for exactly this input identity.

    Reused instead of opening another empty run: the four-candidate budget of the
    existing run is never reset by repeating load, and a different session, lane,
    revision, input bytes or budget configuration never matches this identity.
    """
    runs_root = workspace.runs_root()
    if not runs_root.is_dir():
        return None
    best: tuple[tuple[str, str], dict[str, Any]] | None = None
    for entry in runs_root.iterdir():
        if entry.name.startswith(".") or entry.is_symlink() or not entry.is_dir():
            continue
        try:
            manifest = workspace.read_manifest(entry.name)
        except (Refusal, ExecutionFailure):
            continue
        owner = manifest.get("owner") or {}
        if owner.get("session_key") != session["key"] or owner.get("lane") != session["lane"]:
            continue
        if owner.get("workspace_root") != str(workspace.root):
            continue
        if not _identity_matches(manifest, **identity):
            continue
        sort_key = (str(manifest.get("created_at") or ""), entry.name)
        if best is None or sort_key > best[0]:
            best = (sort_key, manifest)
    return None if best is None else best[1]


def _load_response(
    workspace: Workspace,
    manifest: Mapping[str, Any],
    task: Mapping[str, Any],
    scene_doc: Mapping[str, Any],
    fingerprint: Mapping[str, Any],
    seq: int,
    *,
    reused: bool,
) -> dict[str, Any]:
    candidates = [
        {"candidate_id": candidate_id, "status": entry.get("status"), "overall": (entry.get("report") or {}).get("overall")}
        for candidate_id, entry in (manifest.get("candidates") or {}).items()
    ]
    return {
        "run_id": manifest["run_id"],
        "task_id": task["task_id"],
        "task_revision": int(task["revision"]),
        "status": manifest.get("status", "READY"),
        "reused": reused,
        "candidates": candidates,
        "frozen": dict(manifest.get("frozen") or fingerprint),
        "request": dict(task["request"]),
        # The complete frozen environment, so the model can reason about the
        # fixed obstacles without a generic file read: the same objects, the
        # same units and frame, bound to the scene hash that was frozen.
        "scene": _scene_summary(scene_doc, fingerprint.get("scene_sha256")),
        "plate": {
            "width": task["plate"]["width"],
            "height": task["plate"]["height"],
            "thickness": task["plate"]["thickness"],
            "locked": list(task["plate"]["locked"]),
            "editable": dict(task["plate"].get("editable") or {}),
        },
        "base_holes": {
            "diameter": task["base_holes"]["diameter"],
            "centers": [list(center) for center in task["base_holes"]["centers"]],
            "locked": True,
        },
        "sensor": {
            "model_id": task["sensor"]["model_id"],
            "body_size": list(task["sensor"]["body_size"]),
            "hole_diameter": task["sensor"]["hole_diameter"],
            "hole_offsets": [list(offset) for offset in task["sensor"]["hole_offsets"]],
            "allowed_center_x": dict(task["sensor"]["allowed_center_x"]),
            "allowed_center_y": dict(task["sensor"]["allowed_center_y"]),
            "allowed_rotation_deg": list(task["sensor"]["allowed_rotation_deg"]),
        },
        "requirements": dict(task["requirements"]),
        "tolerances": dict(task["tolerances"]),
        "budget": {
            "limit_ms": manifest["budget"]["limit_ms"],
            "spent_ms": manifest["budget"]["spent_ms"],
            "remaining_ms": max(0, manifest["budget"]["limit_ms"] - manifest["budget"]["spent_ms"]),
            "max_candidates": manifest["budget"]["max_candidates"],
        },
        "manifest": "manifest.json",
        "events_last_seq": seq,
        "missing": [],
        # Where the frozen task's numbers came from (verbatim from the frozen document, unknown
        # when it carries none) and the one scope every result of this tool shares.
        "input_provenance": _input_provenance(task),
        "verification_scope": VERIFICATION_SCOPE,
    }


def cmd_load_task(workspace: Workspace, session: Mapping[str, str], request: Mapping[str, Any]) -> dict[str, Any]:
    task_id = _require_str(request, "task_id", pattern=TASK_ID_RE, max_len=64)
    run_id = _require_str(request, "run_id", pattern=RUN_ID_RE, max_len=128)
    revision = request.get("revision")
    if isinstance(revision, bool) or not isinstance(revision, int) or not (1 <= revision <= 1000):
        raise Refusal("REQUEST_MALFORMED", "/revision: expected an integer between 1 and 1000", status="INVALID_SPEC")

    contract = _contract(workspace)
    intake_core = _intake(workspace)
    registry_root = workspace.intake_registry_root()
    source = "workspace-task-dir"
    try:
        index = intake_core.load_registry_index(registry_root)
    except intake_core.IntakeError as error:
        # A registry that exists but is unreadable/tampered must never silently fall
        # back to a same-named fixture directory.
        raise _refuse_intake(error) from error

    if task_id in (index.get("tasks") or {}):
        source = "intake-registry"
        try:
            info = intake_core.read_task_bundle(registry_root, task_id, revision)
        except intake_core.IntakeError as error:
            if error.code in ("TASK_NOT_FOUND", "REVISION_NOT_FOUND"):
                raise Refusal(
                    "STALE_INPUT",
                    f"the intake registry has no published revision {revision} for {task_id!r}",
                    status="STALE_INPUT",
                    detail={"requested_revision": revision},
                ) from error
            raise _refuse_intake(error) from error
        if not info.get("is_latest"):
            latest = max(int(item["revision"]) for item in index["tasks"][task_id].get("revisions", []))
            raise Refusal(
                "STALE_INPUT",
                f"registry task {task_id!r} is at revision {latest}; revision {revision} is historical - "
                "existing runs stay frozen evidence, but a new run must start from the latest revision",
                status="STALE_INPUT",
                detail={"latest_revision": latest, "requested_revision": revision},
            )
        bundle = info["bundle"]
        task = info["task"]
        scene = info["scene"]
        task_dir = Path(str(info["directory"]))
        fingerprint = bundle.fingerprint()
    else:
        task_dir = workspace.task_dir(task_id)
        bundle = contract.load_task_bundle(task_dir)
        if bundle.scene is None or not bundle.ok:
            status = bundle.result.status if bundle.result.status != "OK" else "INVALID_SPEC"
            raise Refusal(
                "TASK_BUNDLE_INVALID",
                f"the registered task {task_id!r} did not pass the contract ({status})",
                status=status,
                detail={"issues": [issue.to_dict() for issue in bundle.result.issues][:16]},
            )
        task = bundle.task
        scene = bundle.scene
        if int(task["revision"]) != revision:
            raise Refusal(
                "STALE_INPUT",
                f"the registered task is at revision {task['revision']}, not {revision}",
                status="STALE_INPUT",
                detail={"current_revision": int(task["revision"]), "requested_revision": revision},
            )
        fingerprint = bundle.fingerprint()

    # Strict pre-generation classification (plan section 10.2). It runs *before*
    # the run directory exists, so a refused classification can never leave a
    # half-made run behind, and an INFEASIBLE verdict carries the proof it was
    # derived from instead of a guessed "no solution".
    scene_doc = json.loads((task_dir / task["scene_ref"]).read_text(encoding="utf-8"))
    verdict = _preflight(workspace).preflight_task(task, scene_doc)
    if not verdict.ok:
        raise Refusal(
            verdict.code,
            verdict.message,
            status=verdict.outcome,
            detail=verdict.to_dict(),
        )

    identity = {
        "task_id": task_id,
        "revision": int(task["revision"]),
        "task_sha": fingerprint.get("task_sha256"),
        "scene_sha": fingerprint.get("scene_sha256"),
        "source": source,
        "budget_params": (workspace.budget_limit_ms, workspace.command_timeout_ms, workspace.max_candidates),
    }

    with _load_lock(workspace):
        reusable = _find_reusable_run(workspace, session, identity)
        if reusable is not None:
            # Never open another empty run for the same input: the current run keeps
            # its budget, candidates and terminal state, and the caller re-enters it.
            # The event is appended under the same RunLock build/validate use, and the
            # manifest is re-read inside that lock - the scan above happened under the
            # load lock only, so a concurrent build/validate may have advanced the
            # budget or candidates since; appending to our stale copy would silently
            # roll those back. Lock order stays .load.lock -> RunLock(run), the same
            # order the create branch below uses, so no cycle is reachable.
            reusable_dir = workspace.run_dir(reusable["run_id"])
            with RunLock(reusable_dir):
                fresh = workspace.read_manifest(reusable["run_id"])
                if fresh.get("run_id") != reusable["run_id"] or not _identity_matches(
                    fresh,
                    task_id=task_id,
                    revision=identity["revision"],
                    task_sha=identity["task_sha"],
                    scene_sha=identity["scene_sha"],
                    source=source,
                    budget_params=identity["budget_params"],
                ):
                    # Identity fields are written once at creation and never mutated; a
                    # mismatch here means the run directory was rewritten under us.
                    raise Refusal(
                        "RUN_IDENTITY_CHANGED",
                        f"run {reusable['run_id']} no longer matches its identity",
                        status="INVALID_SPEC",
                    )
                seq = _append_manifest_event(
                    workspace,
                    fresh,
                    {
                        "kind": "load_task",
                        "status": "OK",
                        "code": "RUN_REUSED",
                        "session": session,
                        "candidate_id": None,
                        "data": {"task_id": task_id, "task_revision": int(task["revision"]), "reused": True, "source": source},
                    },
                )
            manifest = workspace.read_manifest(reusable["run_id"])
            return _load_response(workspace, manifest, task, scene_doc, fingerprint, seq, reused=True)

        runs_root = workspace.runs_root(create=True)
        final_dir = runs_root / run_id
        if final_dir.exists():
            raise Refusal("RUN_EXISTS", f"run {run_id} already exists and is never overwritten", status="INVALID_SPEC")
        _refuse_symlinks(workspace.root, final_dir)

        token = f"{os.getpid()}-{int(time.time() * 1000) % 1_000_000}"
        tmp = runs_root / f".tmp-run-{run_id}-{token}"
        tmp.mkdir()
        try:
            input_dir = tmp / "input"
            input_dir.mkdir()
            shutil.copyfile(task_dir / "task.json", input_dir / "task.json")
            shutil.copyfile(task_dir / task["scene_ref"], input_dir / "scene.json")
            (tmp / "candidates").mkdir()
            (tmp / "exports").mkdir()
            manifest = {
                "schema_version": SCHEMA_VERSION,
                "run_id": run_id,
                "task_id": task_id,
                "task_revision": int(task["revision"]),
                "status": "READY",
                "created_at": _now(),
                "updated_at": _now(),
                "owner": {"session_key": session["key"], "lane": session["lane"], "workspace_root": str(workspace.root)},
                "frozen": {
                    **fingerprint,
                    "source": source,
                    "task_file": "input/task.json",
                    "scene_file": "input/scene.json",
                    "scene_ref": task["scene_ref"],
                    # Raw-file hashes so the read-only services can verify the frozen
                    # inputs byte for byte without a contract layer of their own.
                    "files": {
                        "input/task.json": _sha256_file(task_dir / "task.json"),
                        "input/scene.json": _sha256_file(task_dir / task["scene_ref"]),
                    },
                },
                "budget": {
                    "limit_ms": workspace.budget_limit_ms,
                    "command_timeout_ms": workspace.command_timeout_ms,
                    "spent_ms": 0,
                    "commands": 0,
                    "max_candidates": workspace.max_candidates,
                },
                "revisions": [],
                "candidates": {},
                "exports": {},
                "events": {"last_seq": 0, "file": "events.jsonl"},
                "notes": [],
            }
            (tmp / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            (tmp / "events.jsonl").write_text("", encoding="utf-8")
            os.rename(tmp, final_dir)
        finally:
            _remove_own_temporary(tmp)

        with RunLock(final_dir):
            manifest = workspace.read_manifest(run_id)
            seq = _append_manifest_event(
                workspace,
                manifest,
                {"kind": "load_task", "status": "OK", "code": "OK", "session": session, "candidate_id": None, "data": {"task_id": task_id, "task_revision": int(task["revision"]), "source": source}},
            )
        manifest = workspace.read_manifest(run_id)
        return _load_response(workspace, manifest, task, scene_doc, fingerprint, seq, reused=False)


def _scene_summary(scene: Mapping[str, Any], scene_sha256: Any) -> dict[str, Any]:
    """The frozen environment, complete but bounded, as the model may see it.

    Objects are passed through verbatim (they are the fixed conditions the
    design must respect) while the surrounding document is reduced to the
    fields a reader needs to place them: identity, units, frame and the frozen
    content hash. Nothing here is derived from a report or a design - this is
    the same document the contract just validated.
    """
    objects = scene.get("objects")
    if (
        not isinstance(objects, Sequence)
        or isinstance(objects, (str, bytes))
        or not objects
        or len(objects) > 64
        or not all(isinstance(obj, Mapping) for obj in objects)
    ):
        raise ExecutionFailure("OUTPUT_MALFORMED", "the frozen scene carries an unusable object list")
    contacts = scene.get("support_contacts")
    if not isinstance(contacts, Sequence) or isinstance(contacts, (str, bytes)) or not all(isinstance(contact, Mapping) for contact in contacts):
        raise ExecutionFailure("OUTPUT_MALFORMED", "the frozen scene carries an unusable support-contact list")
    return {
        "scene_id": scene.get("scene_id"),
        "units": scene.get("units"),
        "frame": scene.get("frame"),
        "scene_sha256": scene_sha256,
        "objects": [dict(obj) for obj in objects],
        "support_contacts": [dict(contact) for contact in contacts],
        "object_count": len(objects),
    }


def _append_manifest_event(
    workspace: Workspace,
    manifest: dict[str, Any],
    event: Mapping[str, Any],
) -> int:
    """Append one event and advance the manifest's event counter (caller holds the lock)."""
    seq = int((manifest.get("events") or {}).get("last_seq", 0)) + 1
    record = {
        "seq": seq,
        "at": _now(),
        "run_id": manifest["run_id"],
        "task_id": manifest["task_id"],
        "task_revision": manifest["task_revision"],
        "session_key": event["session"]["key"],
        "lane": event["session"]["lane"],
        "tool_use_id": event["session"]["tool_use_id"],
        "kind": event["kind"],
        "status": event["status"],
        "code": event["code"],
        "candidate_id": event.get("candidate_id"),
        "parent_candidate_id": event.get("parent_candidate_id"),
        "data": dict(event.get("data") or {}),
    }
    workspace.append_event(manifest["run_id"], record)
    manifest.setdefault("events", {})["last_seq"] = seq
    workspace.write_manifest(manifest["run_id"], manifest)
    return seq


def _charge_budget(workspace: Workspace, manifest: dict[str, Any], duration_ms: float, *, command: str) -> None:
    budget = manifest.setdefault("budget", {})
    budget["spent_ms"] = round(float(budget.get("spent_ms", 0.0)) + float(duration_ms), 3)
    budget["commands"] = int(budget.get("commands", 0)) + 1
    budget["last_command"] = command


@contextlib.contextmanager
def _in_flight_command(
    workspace: Workspace,
    manifest: dict[str, Any],
    session: Mapping[str, str],
    *,
    kind: str,
    candidate_id: str | None,
    status: str,
) -> Iterator[None]:
    """Enter an in-flight run status and guarantee a settled terminal state.

    Everything that can fail while a command is in flight sits inside this
    block: starting and reaping the geometry child, and this layer's own
    post-processing (re-reading the published artefact, re-checking the report
    binding, hashing the export). Whichever way the block exits - a refused or
    failed child, a timeout, a binding mismatch, or an unexpected exception -
    the run leaves BUILDING/VALIDATING/EXPORTING, the failure is charged for the
    CAD time it actually consumed and one event carries the real tool-use id.
    A SIGTERM is not an ``Exception`` (the handler raises ``SystemExit``), so
    the cancellation record written by ``_record_cancellation`` is never
    overwritten here. The caller holds the run lock.
    """
    previous_status = str(manifest.get("status") or "READY")
    manifest["status"] = status
    workspace.write_manifest(str(manifest["run_id"]), manifest)
    try:
        yield
    except Exception as exc:
        if manifest.get("status") in ("BUILDING", "VALIDATING", "EXPORTING"):
            if isinstance(exc, (Refusal, ExecutionFailure)):
                failure = exc
            else:  # an unexpected error still must not leave the run in flight
                failure = ExecutionFailure("INTERNAL_ERROR", f"{type(exc).__name__}: {exc}")
            _record_command_failure(
                workspace,
                manifest,
                session,
                kind=kind,
                candidate_id=candidate_id,
                error=failure,
                previous_status=previous_status,
            )
        raise


def _record_command_failure(
    workspace: Workspace,
    manifest: dict[str, Any],
    session: Mapping[str, str],
    *,
    kind: str,
    candidate_id: str | None,
    error: Refusal | ExecutionFailure,
    previous_status: str,
) -> None:
    """Settle a run after its CAD command failed, timed out or was refused.

    Called with the run lock held, on the way out of an in-flight status
    (BUILDING/VALIDATING/EXPORTING). It (1) charges the wall time the geometry
    child actually consumed - a failed or refused command still burned that
    CAD time, and only calls that never started a child are free, (2) moves the
    run to a terminal status instead of leaving the frontend watching a command
    that no longer exists (an execution failure is ERROR; a business refusal
    restores the last settled status, because the run itself is intact), and
    (3) appends one event carrying the real tool-use id, the work code and the
    measured duration.
    """
    detail = error.detail if isinstance(error.detail, Mapping) else {}
    duration_ms = float(detail.get("duration_ms") or 0.0)
    child_started = bool(detail.get("child_started", False))
    if child_started and duration_ms > 0:
        _charge_budget(workspace, manifest, duration_ms, command=str(detail.get("command") or kind))
    status = "ERROR" if isinstance(error, ExecutionFailure) else "REFUSED"
    manifest["status"] = "ERROR" if isinstance(error, ExecutionFailure) else previous_status
    _append_manifest_event(
        workspace,
        manifest,
        {
            "kind": kind,
            "status": status,
            "code": str(error.code),
            "session": dict(session),
            "candidate_id": candidate_id,
            "data": {
                "message": str(error.message)[:512],
                "status": str(error.status),
                "duration_ms": duration_ms,
                "child_started": child_started,
                "previous_status": previous_status,
                "budget_spent_ms": float((manifest.get("budget") or {}).get("spent_ms", 0.0)),
            },
        },
    )


def _budget_exhausted(workspace: Workspace, manifest: Mapping[str, Any]) -> bool:
    budget = manifest.get("budget") or {}
    spent = float(budget.get("spent_ms", 0.0))
    limit = float(budget.get("limit_ms", workspace.budget_limit_ms))
    return spent >= limit


def _effective_params(design: Mapping[str, Any], task: Mapping[str, Any]) -> dict[str, Any] | None:
    """The normalised parameter set a design actually requests, or ``None``.

    ``None`` means the design carries no usable numbers yet (a malformed
    document); such a design is refused by the geometry CLI, so this layer has
    nothing to compare and says so instead of inventing defaults for a
    duplicate check.
    """
    plate = design.get("plate") if isinstance(design.get("plate"), Mapping) else {}
    dims: dict[str, float] = {}
    for dim in ("width", "height", "thickness"):
        value = plate.get(dim, task["plate"][dim])
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return None
        dims[dim] = float(value)
    pose = design.get("sensor_pose")
    if not isinstance(pose, Mapping):
        return None
    center = pose.get("center")
    rotation = pose.get("rotation_deg")
    if (
        not isinstance(center, Sequence)
        or isinstance(center, (str, bytes))
        or len(center) != 2
        or any(isinstance(item, bool) or not isinstance(item, (int, float)) for item in center)
        or isinstance(rotation, bool)
        or not isinstance(rotation, (int, float))
    ):
        return None
    return {
        "plate": dims,
        "sensor_pose": {"center": [float(center[0]), float(center[1])], "rotation_deg": float(rotation)},
    }


def _next_candidate_id(manifest: Mapping[str, Any]) -> str:
    used = {int(candidate_id[1:]) for candidate_id in (manifest.get("candidates") or {})}
    if used:
        nxt = max(used) + 1
    else:
        nxt = 1
    return f"v{nxt:03d}"


def cmd_build_candidate(workspace: Workspace, session: Mapping[str, str], request: Mapping[str, Any]) -> dict[str, Any]:
    run_id = _require_str(request, "run_id", pattern=RUN_ID_RE, max_len=128)
    revision = request.get("task_revision")
    if isinstance(revision, bool) or not isinstance(revision, int):
        raise Refusal("REQUEST_MALFORMED", "/task_revision: expected an integer", status="INVALID_SPEC")
    design = request.get("design_spec")
    if not isinstance(design, Mapping):
        raise Refusal("REQUEST_MALFORMED", "/design_spec: expected the DesignSpec object", status="INVALID_SPEC")
    parent = _optional_str(request, "parent_candidate_id", pattern=CANDIDATE_ID_RE, max_len=8)

    run_dir = workspace.run_dir(run_id)
    with RunLock(run_dir):
        manifest = workspace.read_manifest(run_id)
        _require_owner(manifest, session, workspace)
        if int(manifest["task_revision"]) != revision:
            raise Refusal(
                "STALE_INPUT",
                f"the run is frozen at task revision {manifest['task_revision']}, not {revision}",
                status="STALE_INPUT",
                detail={"current_revision": int(manifest["task_revision"])},
            )
        if design.get("task_id") != manifest["task_id"] or design.get("task_revision") != manifest["task_revision"]:
            raise Refusal(
                "STALE_INPUT",
                "the DesignSpec names another task or revision than the frozen run",
                status="STALE_INPUT",
            )
        candidates = manifest.setdefault("candidates", {})
        if len(candidates) >= int(manifest["budget"].get("max_candidates", workspace.max_candidates)):
            raise Refusal(
                "BUDGET_EXHAUSTED",
                "the run has reached its candidate budget (one initial candidate plus three revisions)",
                status="BUDGET_EXHAUSTED",
                detail={"max_candidates": manifest["budget"].get("max_candidates")},
            )
        if _budget_exhausted(workspace, manifest):
            manifest["status"] = "BUDGET_EXHAUSTED"
            _append_manifest_event(
                workspace,
                manifest,
                {"kind": "build_candidate", "status": "BUDGET_EXHAUSTED", "code": "BUDGET_EXHAUSTED", "session": session, "candidate_id": None, "data": {}},
            )
            raise Refusal(
                "BUDGET_EXHAUSTED",
                "the run's task budget is spent; this is a stopping point, not a proof that no design exists",
                status="BUDGET_EXHAUSTED",
                detail={"budget": dict(manifest["budget"])},
            )
        latest = max(candidates, key=lambda candidate_id: int(candidate_id[1:])) if candidates else None
        if parent is not None and parent not in candidates:
            raise Refusal(
                "UNKNOWN_PARENT",
                f"parent candidate {parent!r} does not exist in this run",
                status="INVALID_SPEC",
                detail={"known": sorted(candidates)},
            )
        if latest is not None and parent is not None and parent != latest:
            # Revisions are linear: a new candidate extends the newest version,
            # so the manifest's chain is the actual history and a reader can say
            # what changed. Naming an older version would fork the run without
            # recording the branch, so it is refused rather than silently
            # re-parented.
            raise Refusal(
                "STALE_PARENT",
                f"revisions must extend the latest candidate ({latest}); got parent {parent!r}",
                status="INVALID_SPEC",
                detail={"latest_candidate_id": latest, "given_parent": parent},
            )
        if latest is not None and parent is None:
            # Omitting the parent means "continue the run", which is the linear
            # chain; the resolved parent is recorded so the trace never shows a
            # gap ("initial after v001").
            parent = latest

        task = _read_frozen(workspace, run_id, "task.json")
        design_sha = _sha256_json(design)
        # The duplicate guard compares what the design *means*, not how it is
        # written: the effective plate dimensions (locked defaults filled in),
        # the sensor centre and the rotation. The note is deliberately excluded
        # - rewording it is not a change - and a different parent does not make
        # an identical geometry a new attempt (plan section 10.1.6: the same
        # parameter hash must stop the loop, not restart it).
        effective = _effective_params(design, task)
        param_sha = _sha256_json(effective) if effective is not None else None
        if param_sha is not None:
            for candidate_id, entry in candidates.items():
                if entry.get("param_sha256") == param_sha:
                    raise Refusal(
                        "DUPLICATE_CANDIDATE",
                        "this parameter set (plate dimensions and sensor pose) is already recorded in this run; "
                        "change a design parameter instead of repeating the same geometry",
                        status="INVALID_SPEC",
                        detail={
                            "existing_candidate_id": candidate_id,
                            "param_sha256": param_sha,
                            "normalized_params": effective,
                            "design_sha256": design_sha,
                        },
                    )

        candidate_id = _next_candidate_id(manifest)
        scene = _read_frozen(workspace, run_id, "scene.json")
        candidates_dir = _safe_dir(run_dir, "candidates", create=True)

        with _in_flight_command(
            workspace, manifest, session, kind="build_candidate", candidate_id=candidate_id, status="BUILDING"
        ):
            response = _run_cli(
                workspace,
                "build",
                {
                    "schema_version": SCHEMA_VERSION,
                    "run_id": run_id,
                    "candidate_id": candidate_id,
                    "task": task,
                    "scene": scene,
                    "design": dict(design),
                    "output_dir": str(candidates_dir),
                },
                active={"workspace": workspace, "manifest": manifest, "session": session, "command": "build_candidate", "candidate_id": candidate_id},
            )
            result = response["result"]
            candidate_dir = Path(str(result.get("candidate_dir") or ""))
            expected_dir = candidates_dir / candidate_id
            if os.path.realpath(candidate_dir) != os.path.realpath(expected_dir):
                raise ExecutionFailure("OUTPUT_MALFORMED", "the geometry CLI published outside this run's candidate directory")

            # Re-read the published artefact: the manifest hashes must describe the
            # bytes that are actually on disk, not what the generator reported.
            step_sha = _sha256_file(expected_dir / "model.step")
            stl_sha = _sha256_file(expected_dir / "model.stl")
            preview_sha = _sha256_file(expected_dir / "preview.json")
            mesh_sha = _sha256_file(expected_dir / "preview_mesh.json")
            if step_sha != result.get("step_sha256") or stl_sha != result.get("stl_sha256"):
                raise ExecutionFailure("ARTEFACT_HASH_MISMATCH", "the published artefact does not match the reported hashes")

            build_manifest = json.loads((expected_dir / "build.json").read_text(encoding="utf-8"))
            if build_manifest.get("hashes", {}).get("step_sha256") != step_sha:
                raise ExecutionFailure("ARTEFACT_HASH_MISMATCH", "build.json does not bind the published STEP file")

            files = [
                {"name": entry["name"], "bytes": int(entry["bytes"]), "sha256": entry["sha256"]}
                for entry in build_manifest.get("files", [])
                if isinstance(entry, Mapping) and entry.get("name") in REGISTERED_CANDIDATE_FILES
            ]

            entry = {
                "candidate_id": candidate_id,
                "parent_candidate_id": parent,
                "task_revision": int(manifest["task_revision"]),
                "created_at": _now(),
                "status": "BUILT",
                "design_sha256": design_sha,
                "param_sha256": param_sha,
                "normalized_params": effective,
                "design_summary": build_manifest.get("design_summary"),
                "generator_version": build_manifest.get("generator_version"),
                "validator_version": None,
                "validator_code_sha256": None,
                "hashes": {
                    "step_sha256": step_sha,
                    "stl_sha256": stl_sha,
                    "preview_sha256": preview_sha,
                    "preview_mesh_sha256": mesh_sha,
                },
                "files": files,
                "report": None,
                "build_duration_ms": response["duration_ms"],
                "validate_duration_ms": None,
                "self_check_note": "generator self-check only; acceptance is decided by an independent validation",
            }
            candidates[candidate_id] = entry
            manifest.setdefault("revisions", []).append(
                {
                    "candidate_id": candidate_id,
                    "parent_candidate_id": parent,
                    "created_at": entry["created_at"],
                    "design_sha256": design_sha,
                    "param_sha256": param_sha,
                    "note": design.get("note") if isinstance(design.get("note"), str) else None,
                }
            )
            _charge_budget(workspace, manifest, response["duration_ms"], command="build")
            manifest["status"] = "BUILT"
            seq = _append_manifest_event(
                workspace,
                manifest,
                {
                    "kind": "build_candidate",
                    "status": "OK",
                    "code": "OK",
                    "session": session,
                    "candidate_id": candidate_id,
                    "parent_candidate_id": parent,
                    "data": {
                        "step_sha256": step_sha,
                        "duration_ms": response["duration_ms"],
                        "parent": parent,
                        "param_sha256": param_sha,
                    },
                },
            )
            budget = dict(manifest["budget"])

    return {
        "run_id": run_id,
        "candidate_id": candidate_id,
        "parent_candidate_id": parent,
        "task_revision": int(manifest["task_revision"]),
        "status": "BUILT",
        "param_sha256": param_sha,
        "normalized_params": effective,
        "step_sha256": step_sha,
        "stl_sha256": stl_sha,
        "preview_triangles": result.get("preview_triangles"),
        "preview_mesh_bytes": result.get("preview_mesh_bytes"),
        "duration_ms": response["duration_ms"],
        "budget": budget,
        "manifest": "manifest.json",
        "events_last_seq": seq,
        "generator_note": "a generator self-check is not acceptance evidence; call fitplate_validate_candidate",
    }


def _read_frozen(workspace: Workspace, run_id: str, name: str) -> dict[str, Any]:
    path = workspace.run_dir(run_id) / "input" / name
    refuse_symlinks(workspace.root, path)
    if not path.is_file():
        raise ExecutionFailure("RUN_INPUT_MISSING", f"the frozen input {name} is missing from the run")
    return json.loads(path.read_text(encoding="utf-8"))


#: The scope every result of this tool shares: software geometry on frozen inputs only.
VERIFICATION_SCOPE = "software_geometry_only"


def _input_provenance(task: Mapping[str, Any]) -> dict[str, Any]:
    """The provenance of the FROZEN task, read from that document - never from live input.

    Absent or malformed provenance answers ``unknown`` explicitly: an old or fixture task that
    never carried a source must never be dressed up as a vendor/official one, and nothing here
    re-derives a source from a path, a constant or an old report's review status.
    """
    provenance = task.get("provenance")
    if not isinstance(provenance, Mapping):
        return {"kind": "unknown", "source": None, "review_status": "unknown"}
    kind = provenance.get("kind")
    source = provenance.get("source")
    review_status = provenance.get("review_status")
    return {
        "kind": kind if isinstance(kind, str) and kind else "unknown",
        "source": source[:512] if isinstance(source, str) and source else None,
        "review_status": review_status if isinstance(review_status, str) and review_status else "unknown",
    }


def cmd_validate_candidate(workspace: Workspace, session: Mapping[str, str], request: Mapping[str, Any]) -> dict[str, Any]:
    run_id = _require_str(request, "run_id", pattern=RUN_ID_RE, max_len=128)
    candidate_id = _require_str(request, "candidate_id", pattern=CANDIDATE_ID_RE, max_len=8)

    run_dir = workspace.run_dir(run_id)
    with RunLock(run_dir):
        manifest = workspace.read_manifest(run_id)
        _require_owner(manifest, session, workspace)
        candidates = manifest.get("candidates") or {}
        entry = candidates.get(candidate_id)
        if not isinstance(entry, dict):
            raise Refusal("CANDIDATE_NOT_FOUND", f"candidate {candidate_id} does not exist in this run", status="STALE_INPUT")
        if _budget_exhausted(workspace, manifest):
            manifest["status"] = "BUDGET_EXHAUSTED"
            _append_manifest_event(
                workspace,
                manifest,
                {"kind": "validate_candidate", "status": "BUDGET_EXHAUSTED", "code": "BUDGET_EXHAUSTED", "session": session, "candidate_id": candidate_id, "data": {}},
            )
            raise Refusal(
                "BUDGET_EXHAUSTED",
                "the run's task budget is spent; this is a stopping point, not a proof that no design exists",
                status="BUDGET_EXHAUSTED",
                detail={"budget": dict(manifest["budget"])},
            )

        candidate_dir = workspace.run_dir(run_id) / "candidates" / candidate_id
        for name in REGISTERED_CANDIDATE_FILES + REGISTERED_REPORT_FILES:
            refuse_symlinks(workspace.root, candidate_dir / name)
        step_path = candidate_dir / "model.step"
        stl_path = candidate_dir / "model.stl"
        preview_path = candidate_dir / "preview.json"
        for path in (step_path, stl_path, preview_path):
            if not path.is_file():
                raise Refusal("ARTEFACT_MISSING", f"the candidate is missing {path.name}", status="STALE_INPUT")
        step_sha = _sha256_file(step_path)
        if step_sha != entry["hashes"]["step_sha256"]:
            raise Refusal(
                "ARTEFACT_HASH_MISMATCH",
                "the STEP file changed after the build; validation would measure an unrecorded artefact",
                status="STALE_INPUT",
                detail={"recorded": entry["hashes"]["step_sha256"], "actual": step_sha},
            )

        task = _read_frozen(workspace, run_id, "task.json")
        scene = _read_frozen(workspace, run_id, "scene.json")
        with _in_flight_command(
            workspace, manifest, session, kind="validate_candidate", candidate_id=candidate_id, status="VALIDATING"
        ):
            response = _run_cli(
                workspace,
                "validate",
                {
                    "schema_version": SCHEMA_VERSION,
                    "run_id": run_id,
                    "candidate_id": candidate_id,
                    "task": task,
                    "scene": scene,
                    "step_path": str(step_path),
                    "stl_path": str(stl_path),
                    "preview_path": str(preview_path),
                },
                active={"workspace": workspace, "manifest": manifest, "session": session, "command": "validate_candidate", "candidate_id": candidate_id},
            )
            result = response["result"]
            report = result.get("report")
            evidence = result.get("evidence")
            if not isinstance(report, Mapping) or not isinstance(evidence, Mapping):
                raise ExecutionFailure("OUTPUT_MALFORMED", "the validator returned no report/evidence pair")

            # The bridge re-checks the binding itself: a report that does not describe
            # *this* artefact and *these* frozen inputs is never stored as evidence.
            actual_step_sha = _sha256_file(step_path)
            hashes = report.get("hashes") or {}
            if (
                report.get("run_id") != run_id
                or report.get("candidate_id") != candidate_id
                or report.get("task_id") != manifest["task_id"]
                or report.get("task_revision") != manifest["task_revision"]
                or hashes.get("step_sha256") != actual_step_sha
                or hashes.get("task_sha256") != manifest["frozen"]["task_sha256"]
                or hashes.get("scene_sha256") != manifest["frozen"]["scene_sha256"]
            ):
                raise ExecutionFailure("REPORT_BINDING_MISMATCH", "the report does not bind this candidate, task and STEP hash")
            validator_code_sha = _validator_code_hash(workspace)
            declared_code_sha = hashes.get("validator_code_sha256")
            # The report must name the code that decided it, and that name must be
            # the code installed right now - a stored report whose implementation is
            # not the one currently on disk could never be exported (STALE_VALIDATOR)
            # and must not enter the run store in the first place.
            if not isinstance(declared_code_sha, str) or not declared_code_sha:
                raise ExecutionFailure(
                    "REPORT_BINDING_MISMATCH",
                    "the report carries no validator_code_sha256, so it cannot be bound to the code that produced it",
                )
            if declared_code_sha != validator_code_sha:
                raise ExecutionFailure(
                    "REPORT_BINDING_MISMATCH",
                    "the report's validator_code_sha256 does not describe the validator code in the geometry root",
                    detail={"report": declared_code_sha, "installed": validator_code_sha},
                )

            report_bytes = (json.dumps(report, indent=2, sort_keys=True, allow_nan=False) + "\n").encode("utf-8")
            evidence_bytes = (json.dumps(evidence, indent=2, sort_keys=True, allow_nan=False) + "\n").encode("utf-8")
            if len(report_bytes) > MAX_REPORT_BYTES or len(evidence_bytes) > MAX_EVIDENCE_BYTES:
                raise ExecutionFailure("LIMIT_EXCEEDED", "the report or evidence exceeds its size cap")
            _atomic_bytes(candidate_dir / "report.json", report_bytes)
            _atomic_bytes(candidate_dir / "evidence.json", evidence_bytes)

            for name in REGISTERED_REPORT_FILES:
                path = candidate_dir / name
                record = {"name": name, "bytes": path.stat().st_size, "sha256": _sha256_file(path)}
                entry["files"] = [item for item in entry.get("files", []) if item.get("name") != name] + [record]

            overall = str(report.get("overall"))
            entry["status"] = "VALIDATED"
            entry["validator_version"] = report.get("validator_version")
            entry["validator_code_sha256"] = validator_code_sha
            entry["report"] = {
                "report_id": report.get("report_id"),
                "overall": overall,
                "created_at": report.get("created_at"),
                "validator_version": report.get("validator_version"),
                "duration_ms": report.get("duration_ms"),
                "hashes": dict(hashes),
                "report_sha256": _contract(workspace).content_sha256(report),
                "report_file_sha256": _sha256_bytes(report_bytes),
                "checks": [
                    {
                        "id": check.get("id"),
                        "status": check.get("status"),
                        **({"reason_code": check.get("reason_code")} if check.get("reason_code") else {}),
                        **({"objects": list(check.get("objects") or [])} if check.get("objects") else {}),
                    }
                    for check in report.get("checks", [])
                    if isinstance(check, Mapping)
                ],
            }
            entry["validate_duration_ms"] = response["duration_ms"]
            _charge_budget(workspace, manifest, response["duration_ms"], command="validate")
            manifest["status"] = {"PASS": "PASSED", "FAIL": "FAILED_CONSTRAINTS", "UNKNOWN": "UNKNOWN", "BORDERLINE": "BORDERLINE"}.get(
                overall, "FAILED_CONSTRAINTS"
            )
            seq = _append_manifest_event(
                workspace,
                manifest,
                {
                    "kind": "validate_candidate",
                    "status": "OK",
                    "code": "OK",
                    "session": session,
                    "candidate_id": candidate_id,
                    "data": {
                        "report_id": report.get("report_id"),
                        "overall": overall,
                        "validator_version": report.get("validator_version"),
                        "duration_ms": response["duration_ms"],
                    },
                },
            )
            budget = dict(manifest["budget"])

    failed_checks = [
        {"id": check.get("id"), "status": check.get("status"), "reason_code": check.get("reason_code")}
        for check in report.get("checks", [])
        if isinstance(check, Mapping) and check.get("status") != "PASS"
    ]
    return {
        "run_id": run_id,
        "candidate_id": candidate_id,
        "task_revision": int(manifest["task_revision"]),
        "status": "VALIDATED",
        "overall": overall,
        "report_id": report.get("report_id"),
        "report": dict(report),
        "failed_checks": failed_checks,
        "evidence_summary": {
            "holes": len(evidence.get("holes", []) if isinstance(evidence.get("holes"), list) else []),
            "derived_pose": (evidence.get("sensor_group") or {}).get("derived_pose"),
            "pose_status": (evidence.get("sensor_group") or {}).get("pose_status"),
            "pairs": len(evidence.get("pairs", []) if isinstance(evidence.get("pairs"), list) else []),
            "evidence_file": f"candidates/{candidate_id}/evidence.json",
        },
        "validator_code_sha256": entry["validator_code_sha256"],
        "duration_ms": response["duration_ms"],
        "budget": budget,
        "events_last_seq": seq,
        "note": "the report was produced by re-importing the STEP file in a fresh process; constraint FAIL is a measured result, not an execution error",
    }


def _verify_published_export(
    export_dir: Path,
    export_manifest: Mapping[str, Any],
    entry: Mapping[str, Any],
    stored: Mapping[str, Any],
) -> dict[str, Any]:
    """Re-read the published bundle and check the identity binding from the bytes."""
    published = Path(str(export_manifest.get("export_dir") or ""))
    if os.path.realpath(published) != os.path.realpath(export_dir):
        raise ExecutionFailure("OUTPUT_MALFORMED", "the exporter published outside this run's export directory")
    export_manifest_path = export_dir / "export-manifest.json"
    if not export_manifest_path.is_file():
        raise ExecutionFailure("OUTPUT_MALFORMED", "the export bundle has no manifest")
    on_disk = json.loads(export_manifest_path.read_text(encoding="utf-8"))
    hashes = on_disk.get("hashes") or {}
    if hashes.get("step_sha256") != entry["hashes"]["step_sha256"] or _sha256_file(export_dir / "model.step") != entry["hashes"]["step_sha256"]:
        raise ExecutionFailure("ARTEFACT_HASH_MISMATCH", "the exported STEP does not match the validated artefact")
    if hashes.get("report_sha256") != stored.get("report_sha256"):
        raise ExecutionFailure("ARTEFACT_HASH_MISMATCH", "the exported report does not match the validated report")
    if on_disk.get("report_id") != stored.get("report_id") or on_disk.get("candidate_id") != entry.get("candidate_id"):
        raise ExecutionFailure("ARTEFACT_HASH_MISMATCH", "the export manifest names another report or candidate")
    for item in on_disk.get("files") or []:
        name = item.get("name")
        if not isinstance(name, str):
            raise ExecutionFailure("OUTPUT_MALFORMED", "the export manifest lists a file without a name")
        path = export_dir / name
        if not path.is_file() or _sha256_file(path) != item.get("sha256"):
            raise ExecutionFailure("ARTEFACT_HASH_MISMATCH", f"the exported {name} does not match its recorded hash")
    return dict(on_disk)


def cmd_export_package(workspace: Workspace, session: Mapping[str, str], request: Mapping[str, Any]) -> dict[str, Any]:
    run_id = _require_str(request, "run_id", pattern=RUN_ID_RE, max_len=128)
    candidate_id = _require_str(request, "candidate_id", pattern=CANDIDATE_ID_RE, max_len=8)
    report_id = _require_str(request, "report_id", pattern=re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$"), max_len=128)
    allow_failed = request.get("allow_failed", False)
    if not isinstance(allow_failed, bool):
        raise Refusal("REQUEST_MALFORMED", "/allow_failed: expected a boolean", status="INVALID_SPEC")

    run_dir = workspace.run_dir(run_id)
    with RunLock(run_dir):
        manifest = workspace.read_manifest(run_id)
        _require_owner(manifest, session, workspace)
        entry = (manifest.get("candidates") or {}).get(candidate_id)
        if not isinstance(entry, dict) or not isinstance(entry.get("report"), dict):
            raise Refusal("REPORT_NOT_FOUND", f"candidate {candidate_id} has no stored report yet", status="STALE_INPUT")
        stored = entry["report"]
        if stored.get("report_id") != report_id:
            raise Refusal(
                "STALE_REPORT",
                f"report {report_id!r} is not the report recorded for this candidate",
                status="STALE_INPUT",
                detail={"current_report_id": stored.get("report_id")},
            )
        overall = stored.get("overall")
        if overall != "PASS" and not allow_failed:
            raise Refusal(
                "REPORT_NOT_PASSED",
                f"the recorded report is {overall}; pass allow_failed to export a diagnostic bundle",
                status="INVALID_SPEC",
                detail={"overall": overall},
            )

        candidate_dir = run_dir / "candidates" / candidate_id
        _refuse_symlinks(workspace.root, candidate_dir)
        report_path = candidate_dir / "report.json"
        evidence_path = candidate_dir / "evidence.json"
        if not report_path.is_file():
            raise Refusal("ARTEFACT_MISSING", "the stored report file is missing", status="STALE_INPUT")
        report_bytes = report_path.read_bytes()
        if _sha256_bytes(report_bytes) != stored.get("report_file_sha256"):
            raise Refusal("ARTEFACT_HASH_MISMATCH", "report.json changed since it was validated", status="STALE_INPUT")
        report = json.loads(report_bytes.decode("utf-8"))
        if _contract(workspace).content_sha256(report) != stored.get("report_sha256"):
            raise Refusal("ARTEFACT_HASH_MISMATCH", "the stored report content changed since it was validated", status="STALE_INPUT")
        # The report file itself - not just this layer's own record of it - must
        # bind the currently installed validator code before its evidence may
        # leave the workspace.
        current_code_sha = _validator_code_hash(workspace)
        if (report.get("hashes") or {}).get("validator_code_sha256") != current_code_sha:
            raise Refusal(
                "STALE_VALIDATOR",
                "the report was not produced by the validator code installed now; re-run validation before exporting",
                status="STALE_INPUT",
                detail={"report": (report.get("hashes") or {}).get("validator_code_sha256"), "installed": current_code_sha},
            )

        # Re-read *every registered file* of the candidate against the hashes the
        # manifest recorded - one uniform list, so adding an artefact to the
        # store automatically adds it here instead of needing a second list that
        # can silently fall behind (mesh, evidence and report included).
        registered = entry.get("files") or []
        if not registered:
            raise Refusal("ARTEFACT_MISSING", "the candidate records no registered files", status="STALE_INPUT")
        for record in registered:
            name = record.get("name")
            if not isinstance(name, str) or not FILE_ID_RE.fullmatch(name):
                raise Refusal("INVALID_PATH", "the candidate manifest lists an unsafe file name", status="INVALID_SPEC")
            path = candidate_dir / name
            if not path.is_file():
                raise Refusal("ARTEFACT_MISSING", f"the candidate is missing {name}", status="STALE_INPUT")
            actual = _sha256_file(path)
            if actual != record.get("sha256"):
                raise Refusal(
                    "ARTEFACT_HASH_MISMATCH",
                    f"{name} changed after it was recorded; the export would not describe the validated artefact",
                    status="STALE_INPUT",
                    detail={"file": name, "recorded": record.get("sha256"), "actual": actual},
                )
        if entry.get("validator_code_sha256") != _validator_code_hash(workspace):
            raise Refusal(
                "STALE_VALIDATOR",
                "the validator code changed since the report was produced; re-run validation before exporting",
                status="STALE_INPUT",
            )

        task = _read_frozen(workspace, run_id, "task.json")
        scene = _read_frozen(workspace, run_id, "scene.json")
        evidence = json.loads(evidence_path.read_text(encoding="utf-8")) if evidence_path.is_file() else None
        exports_dir = _safe_dir(run_dir, "exports", create=True)
        candidate_exports = _safe_dir(exports_dir, candidate_id, create=True)
        export_dir = candidate_exports / report_id
        if export_dir.exists():
            raise Refusal("EXPORT_EXISTS", f"an export for report {report_id} already exists", status="INVALID_SPEC")

        with _in_flight_command(
            workspace, manifest, session, kind="export_package", candidate_id=candidate_id, status="EXPORTING"
        ):
            response = _run_cli(
                workspace,
                "export",
                {
                    "schema_version": SCHEMA_VERSION,
                    "run_id": run_id,
                    "candidate_id": candidate_id,
                    "task": task,
                    "scene": scene,
                    "report": report,
                    "candidate_dir": str(candidate_dir),
                    "export_dir": str(export_dir),
                    **({"evidence": evidence} if evidence is not None else {}),
                },
                active={"workspace": workspace, "manifest": manifest, "session": session, "command": "export_package", "candidate_id": candidate_id},
            )
            export_manifest = response["result"]
            try:
                on_disk = _verify_published_export(export_dir, export_manifest, entry, stored)
            except ExecutionFailure as failure:
                # The bundle was written by the exporter but failed this layer's own
                # re-check: the run store records the failure and never advertises
                # the directory as a verified export.
                manifest["status"] = "ERROR"
                _append_manifest_event(
                    workspace,
                    manifest,
                    {
                        "kind": "export_package",
                        "status": "ERROR",
                        "code": failure.code,
                        "session": session,
                        "candidate_id": candidate_id,
                        "data": {"report_id": report_id, "message": failure.message[:512]},
                    },
                )
                raise

            failed = overall != "PASS"
            record = {
                "export_id": on_disk.get("export_id"),
                "report_id": report_id,
                "report_overall": overall,
                "exported_at": on_disk.get("exported_at"),
                "export_dir": f"exports/{candidate_id}/{report_id}",
                "failed": failed,
                "files": list(on_disk.get("files") or []),
                "hashes": dict(on_disk.get("hashes") or {}),
                "validator_code_sha256": entry.get("validator_code_sha256"),
                "duration_ms": response["duration_ms"],
            }
            manifest.setdefault("exports", {}).setdefault(candidate_id, []).append(record)
            _charge_budget(workspace, manifest, response["duration_ms"], command="export")
            manifest["status"] = "COMPLETED" if not failed else "COMPLETED_WITH_DIAGNOSTIC_EXPORT"
            seq = _append_manifest_event(
                workspace,
                manifest,
                {
                    "kind": "export_package",
                    "status": "OK",
                    "code": "OK",
                    "session": session,
                    "candidate_id": candidate_id,
                    "data": {"report_id": report_id, "overall": overall, "failed": failed, "duration_ms": response["duration_ms"]},
                },
            )
            budget = dict(manifest["budget"])

    return {
        "run_id": run_id,
        "candidate_id": candidate_id,
        "report_id": report_id,
        "status": "EXPORTED",
        "overall": overall,
        "failed": failed,
        "export_dir": record["export_dir"],
        "files": record["files"],
        "hashes": record["hashes"],
        "validator_code_sha256": record["validator_code_sha256"],
        "budget": budget,
        "events_last_seq": seq,
        "input_provenance": _input_provenance(task),
        "verification_scope": VERIFICATION_SCOPE,
        "note": (
            "the bundle re-verified the report, the STEP/STL/preview bytes and the frozen inputs before publishing; "
            "a failed export is labelled failed and must not be presented as accepted. The export proves software "
            "geometry on the frozen inputs only - no physical assembly, material strength, printing tolerance or "
            "sensor performance was measured, and the input provenance is whatever the frozen task states"
        ),
    }


def cmd_get_run(workspace: Workspace, session: Mapping[str, str], request: Mapping[str, Any]) -> dict[str, Any]:
    """Read-only view of the run manifest on disk (fresh read, no cached state)."""
    run_id = _require_str(request, "run_id", pattern=RUN_ID_RE, max_len=128)
    candidate_id = _optional_str(request, "candidate_id", pattern=CANDIDATE_ID_RE, max_len=8)
    manifest = workspace.read_manifest(run_id)
    _require_owner(manifest, session, workspace)

    candidates = manifest.get("candidates") or {}
    versions = []
    for cid in sorted(candidates):
        entry = candidates[cid]
        report = entry.get("report") or {}
        versions.append(
            {
                "candidate_id": cid,
                "parent_candidate_id": entry.get("parent_candidate_id"),
                "status": entry.get("status"),
                "created_at": entry.get("created_at"),
                "step_sha256": (entry.get("hashes") or {}).get("step_sha256"),
                "overall": report.get("overall"),
                "report_id": report.get("report_id"),
                "report_created_at": report.get("created_at"),
                "validator_version": report.get("validator_version"),
            }
        )
    selected = candidates.get(candidate_id) if candidate_id else None
    if candidate_id and selected is None:
        raise Refusal("CANDIDATE_NOT_FOUND", f"candidate {candidate_id} does not exist in this run", status="STALE_INPUT")

    data: dict[str, Any] = {
        "run_id": run_id,
        "task_id": manifest["task_id"],
        "task_revision": int(manifest["task_revision"]),
        "status": manifest.get("status"),
        "created_at": manifest.get("created_at"),
        "updated_at": manifest.get("updated_at"),
        "frozen": dict(manifest.get("frozen") or {}),
        "budget": dict(manifest.get("budget") or {}),
        "versions": versions,
        "exports": {cid: list(entries) for cid, entries in (manifest.get("exports") or {}).items()},
        "events_last_seq": (manifest.get("events") or {}).get("last_seq"),
    }
    if selected is not None:
        data["candidate"] = {
            "candidate_id": selected.get("candidate_id"),
            "parent_candidate_id": selected.get("parent_candidate_id"),
            "status": selected.get("status"),
            "design_sha256": selected.get("design_sha256"),
            "design_summary": selected.get("design_summary"),
            "hashes": dict(selected.get("hashes") or {}),
            "files": list(selected.get("files") or []),
            "report": selected.get("report"),
            "validator_code_sha256": selected.get("validator_code_sha256"),
        }
    return data



# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def _intake(workspace: Workspace) -> Any:
    """Import the intake core from the configured geometry root (never CadQuery)."""
    root = str(workspace.geometry_root)
    if root not in sys.path:
        sys.path.insert(0, root)
    try:
        from fitplate import intake as intake_core  # noqa: PLC0415 - deferred until the root is known
    except Exception as exc:  # pragma: no cover - a broken installation must be loud
        raise ExecutionFailure(
            "CONFIG_INVALID",
            f"the intake core is not importable from the geometry root: {type(exc).__name__}: {exc}",
        ) from exc
    return intake_core


HEX64_RE = re.compile(r"^[0-9a-f]{64}$")
ATTACHMENT_REF_RE = re.compile(r"^session-file://[1-9][0-9]*/[1-9][0-9]*$")
MAX_INTAKE_RESULT_BYTES = 256 * 1024
MAX_SNAPSHOT_BYTES = 128 * 1024

_INTAKE_STALE_CODES = ("STALE_STAGE", "STALE_DRAFT", "REVISION_NOT_FOUND", "TASK_NOT_FOUND")


def _refuse_intake(error: Any) -> Refusal:
    """Map an intake-core IntakeError onto the bridge's refusal vocabulary (codes preserved)."""
    code = str(getattr(error, "code", "INTAKE_REFUSED"))
    message = str(getattr(error, "message", None) or error)
    status = "INVALID_SPEC"
    if code in _INTAKE_STALE_CODES:
        status = "STALE_INPUT"
    elif code == "DRAFT_NOT_READY":
        status = "NEEDS_INPUT"
    elif code == "PATH_UNSAFE":
        status = "INVALID_PATH"
    detail: dict[str, Any] = {}
    issues = getattr(error, "issues", None)
    if issues:
        rendered = []
        for issue in list(issues)[:16]:
            rendered.append(issue.to_dict() if hasattr(issue, "to_dict") else issue)
        detail["issues"] = rendered
    extra = getattr(error, "detail", None)
    if extra is not None:
        detail["detail"] = extra
    return Refusal(code, message, status=status, **({"detail": detail} if detail else {}))


def _canonical_sha256(workspace: Workspace, doc: Mapping[str, Any]) -> str:
    """The contract layer's public content hash - the one recipe the core hashes with too.

    This was a hand-copied ``json.dumps(..., separators=(",", ":"))`` before 023: it silently
    drifted from ``contract.canonical_json`` (which passes ``ensure_ascii=False`` after value
    normalisation), so any non-ASCII document - a Chinese request, for one - hashed differently
    from the core's own draft identity. The recipe is now imported from the contract layer, never
    re-spelled here.
    """
    return _contract(workspace).content_sha256(doc)


def _intake_scope(session: Mapping[str, str]) -> str:
    return f"{session['key']}:{session['lane']}"


def _require_matching_scope(value: Any, session: Mapping[str, str], *, what: str) -> str:
    """The scope a payload claims must be this call's real Host session scope, never a payload string."""
    expected = _intake_scope(session)
    if not isinstance(value, str) or value != expected:
        raise Refusal(
            "SCOPE_MISMATCH",
            f"{what} does not match the Host session scope of this call",
            status="INVALID_SPEC",
        )
    return expected


def _intake_document(payload: Mapping[str, Any]) -> Mapping[str, Any]:
    doc = payload.get("request")
    if not isinstance(doc, Mapping):
        raise Refusal("REQUEST_MALFORMED", "/request/request: the IntakeRequest document is required", status="INVALID_SPEC")
    return doc


def _intake_compile(workspace: Workspace, doc: Mapping[str, Any], text_proposals: Any = None) -> tuple[Any, Mapping[str, Any], Mapping[str, Any]]:
    intake_core = _intake(workspace)
    try:
        issues = intake_core.validate_request(doc)
        if issues:
            raise intake_core.IntakeError("REQUEST_INVALID", "request.schema.json rejected the document", issues=issues)
        card_id = doc.get("device_card_id")
        card = intake_core.load_device_card(card_id if isinstance(card_id, str) else "")
        # The raw proposals go straight to the core, which verifies them against the real text
        # BEFORE any normalization - an unknown key (source/hash/confirmed) or a coerced offset is
        # refused by the core, never sanitized away here.
        draft = intake_core.compile_draft(doc, card, text_proposals=text_proposals)
    except intake_core.IntakeError as error:
        raise _refuse_intake(error) from error
    return intake_core, card, draft


def _intake_text_proposals(payload: Mapping[str, Any]) -> Any:
    """The optional raw proposal list from a tool payload (``None`` when absent).

    A present value must be a JSON list; the core re-verifies each item against the real request
    text. A non-list shape is refused here with a diagnostic code rather than reaching the core as
    an opaque failure.
    """
    proposals = payload.get("text_proposals")
    if proposals is None:
        return None
    if not isinstance(proposals, list):
        raise Refusal("TEXT_PROPOSALS_SHAPE", "/request/text_proposals: expected a JSON list of proposal objects", status="INVALID_SPEC")
    return proposals


#: Payload keys a commit may never carry: the model must not re-supply proposals or program facts
#: at commit time - the trusted stage is the only source. A present key is refused explicitly, never
#: silently ignored.
_COMMIT_FORBIDDEN_KEYS = ("text_proposals", "text_interpretations", "source", "source_ref", "confirmed", "intake_evidence")


def _reject_commit_injected_fields(payload: Mapping[str, Any]) -> None:
    present = [key for key in _COMMIT_FORBIDDEN_KEYS if key in payload]
    if present:
        raise Refusal(
            "COMMIT_FIELD_FORBIDDEN",
            f"/request/{present[0]}: commit may not carry {present[0]!r}; the proposals come only from the trusted stage",
            status="INVALID_SPEC",
        )


def _check_result_size(result: Mapping[str, Any], command: str) -> None:
    size = len(json.dumps(result, allow_nan=False).encode("utf-8"))
    if size > MAX_INTAKE_RESULT_BYTES:
        raise ExecutionFailure("RESULT_TOO_LARGE", f"the {command} result exceeds the {MAX_INTAKE_RESULT_BYTES} byte cap")


def _write_intake_snapshot(
    workspace: Workspace,
    staged: Mapping[str, Any],
    draft: Mapping[str, Any],
    attachment_ref: Any,
    session: Mapping[str, str],
) -> None:
    """Persist the stage-bound read-only snapshot triple the query service verifies.

    Write order is draft bytes -> stage-authority sidecar -> latest.json pointer, each atomic;
    the pointer is the commit marker. The authority sidecar echoes the locked stage record
    verbatim and adds the structured Host session identity taken from the bridge's top-level
    session (never from the model payload), so the read-only service can match sessions exactly
    and bind every returned fact - attachment ref, device card, canonical hashes, outcome,
    staged_at - to the stage instead of letting the pointer certify itself. A crash between the
    writes leaves no pointer, or a pointer without a matching authority file: the service refuses
    explicitly, and re-staging the same request is idempotent and rewrites all three.
    """
    registry_root = workspace.intake_registry_root()
    entry_dir = _safe_dir(registry_root, "snapshots", create=True)
    entry_dir = _safe_dir(entry_dir, str(staged["request_id"]), create=True)
    draft_bytes = json.dumps(draft, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")
    if len(draft_bytes) > MAX_SNAPSHOT_BYTES:
        raise ExecutionFailure("RESULT_TOO_LARGE", "the staged draft exceeds the snapshot size cap")
    revision = int(staged["request_revision"])
    draft_name = f"r{revision:03d}-{staged['draft_hash']}.draft.json"
    authority_name = f"r{revision:03d}-{staged['draft_hash']}.stage-authority.json"
    draft_path = entry_dir / draft_name
    if draft_path.is_symlink():
        raise Refusal("PATH_UNSAFE", f"{draft_path} is a symlink", status="INVALID_PATH")
    _atomic_bytes(draft_path, draft_bytes)

    # Every identity field echoes the locked stage record verbatim (id, hashes, card, outcome,
    # scope, staged_at) - recomputing any of them here would risk a second recipe quietly
    # diverging from the core's canonical form; only the snapshot-local facts the record cannot
    # know (the exact draft bytes, the attachment ref, the Host session identity) are added.
    authority = {
        "schema_version": SCHEMA_VERSION,
        "kind": "fitplate-intake-stage-authority",
        "request_id": staged["request_id"],
        "request_revision": revision,
        "request_sha256": staged.get("request_sha256"),
        "device_card": {"id": staged.get("device_card_id"), "sha256": staged.get("device_card_sha256")},
        "draft_hash": staged["draft_hash"],
        "outcome": staged.get("outcome"),
        "attachment_sha256": staged.get("attachment_sha256"),
        "attachment_ref": attachment_ref if isinstance(attachment_ref, str) else None,
        "session_scope": staged.get("session_scope"),
        "host_key": session["key"],
        "host_lane": session["lane"],
        "staged_at": staged.get("staged_at"),
        "draft_file": draft_name,
        "draft_file_sha256": _sha256_bytes(draft_bytes),
    }
    authority_bytes = (json.dumps(authority, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")
    authority_path = entry_dir / authority_name
    if authority_path.is_symlink():
        raise Refusal("PATH_UNSAFE", f"{authority_path} is a symlink", status="INVALID_PATH")
    _atomic_bytes(authority_path, authority_bytes)

    pointer = {
        **{key: authority[key] for key in (
            "request_id", "request_revision", "request_sha256", "device_card", "draft_hash", "outcome",
            "attachment_sha256", "attachment_ref", "session_scope", "host_key", "host_lane", "staged_at",
            "draft_file", "draft_file_sha256",
        )},
        "schema_version": SCHEMA_VERSION,
        "kind": "fitplate-intake-snapshot",
        "authority_file": authority_name,
        "authority_sha256": _sha256_bytes(authority_bytes),
    }
    pointer_path = entry_dir / "latest.json"
    if pointer_path.is_symlink():
        raise Refusal("PATH_UNSAFE", f"{pointer_path} is a symlink", status="INVALID_PATH")
    _atomic_bytes(pointer_path, (json.dumps(pointer, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8"))


def cmd_intake_compile_request(workspace: Workspace, session: Mapping[str, str], payload: Mapping[str, Any]) -> dict[str, Any]:
    doc = _intake_document(payload)
    _intake_core, card, draft = _intake_compile(workspace, doc, _intake_text_proposals(payload))
    result = {
        # The wrapper identity must be the core's identity: same recipe, so the wrapper digest
        # equals the draft's own request_sha256 / device_card_sha256 for every input.
        "request_sha256": _canonical_sha256(workspace, doc),
        "device_card": {"id": card["device_id"], "sha256": _canonical_sha256(workspace, card)},
        "draft": draft,
    }
    _check_result_size(result, "intake_compile_request")
    return result


def cmd_intake_stage_request(workspace: Workspace, session: Mapping[str, str], payload: Mapping[str, Any]) -> dict[str, Any]:
    doc = _intake_document(payload)
    scope = _require_matching_scope(payload.get("session_scope"), session, what="session_scope")
    attachment_sha = payload.get("attachment_sha256")
    if not isinstance(attachment_sha, str) or not HEX64_RE.fullmatch(attachment_sha):
        raise Refusal("ATTACHMENT_HASH_INVALID", "/request/attachment_sha256: expected 64 hex characters", status="INVALID_SPEC")
    attachment_ref = payload.get("attachment_ref")
    if attachment_ref is not None and (not isinstance(attachment_ref, str) or not ATTACHMENT_REF_RE.fullmatch(attachment_ref)):
        raise Refusal("REF_INVALID", "/request/attachment_ref: expected a session-file://<seq>/<index> reference", status="INVALID_SPEC")
    draft_hash = payload.get("draft_hash")
    if not isinstance(draft_hash, str) or not HEX64_RE.fullmatch(draft_hash):
        raise Refusal("REQUEST_MALFORMED", "/request/draft_hash: expected 64 hex characters", status="INVALID_SPEC")
    text_proposals = _intake_text_proposals(payload)
    intake_core, card, draft = _intake_compile(workspace, doc, text_proposals)
    if draft.get("draft_hash") != draft_hash:
        raise Refusal(
            "DRAFT_MISMATCH",
            "the recompiled draft hash differs from the supplied draft hash",
            status="STALE_INPUT",
        )
    try:
        staged = intake_core.stage_request(
            workspace.intake_registry_root(),
            request=doc,
            card=card,
            draft=draft,
            attachment_sha256=attachment_sha,
            session_scope=scope,
            text_proposals=text_proposals,
        )
        _write_intake_snapshot(workspace, staged, draft, attachment_ref, session)
    except intake_core.IntakeError as error:
        raise _refuse_intake(error) from error
    _check_result_size({"staged": staged}, "intake_stage_request")
    return {"staged": staged}


def cmd_intake_read_staged_compile(workspace: Workspace, session: Mapping[str, str], payload: Mapping[str, Any]) -> dict[str, Any]:
    """Read-only: recompile the CURRENT locked stage from its persisted proposals.

    The bridge checks the *real* Host session scope and the attachment bytes hash the caller
    supplied (never a payload string standing in for identity), loads the registered device card by
    id (never a model-supplied card/hash) and calls the core's locked ``read_staged_compile``. It
    creates no receipt and writes nothing.
    """
    doc = _intake_document(payload)
    scope = _require_matching_scope(payload.get("session_scope"), session, what="session_scope")
    attachment_sha = payload.get("attachment_sha256")
    if not isinstance(attachment_sha, str) or not HEX64_RE.fullmatch(attachment_sha):
        raise Refusal("ATTACHMENT_HASH_INVALID", "/request/attachment_sha256: expected 64 hex characters", status="INVALID_SPEC")
    intake_core = _intake(workspace)
    try:
        issues = intake_core.validate_request(doc)
        if issues:
            raise intake_core.IntakeError("REQUEST_INVALID", "request.schema.json rejected the document", issues=issues)
        card_id = doc.get("device_card_id")
        card = intake_core.load_device_card(card_id if isinstance(card_id, str) else "")
        read = intake_core.read_staged_compile(
            workspace.intake_registry_root(),
            request=doc,
            card=card,
            attachment_sha256=attachment_sha,
            session_scope=scope,
        )
    except intake_core.IntakeError as error:
        raise _refuse_intake(error) from error
    result = {
        "request_sha256": _canonical_sha256(workspace, doc),
        "device_card": {"id": card["device_id"], "sha256": _canonical_sha256(workspace, card)},
        "draft": read["draft"],
        "text_proposals": read["text_proposals"],
        "staged": read["staged"],
    }
    _check_result_size(result, "intake_read_staged_compile")
    return result


def cmd_intake_commit_task(workspace: Workspace, session: Mapping[str, str], payload: Mapping[str, Any]) -> dict[str, Any]:
    doc = _intake_document(payload)
    scope = _require_matching_scope(payload.get("session_scope"), session, what="session_scope")
    attachment_sha = payload.get("attachment_sha256")
    if not isinstance(attachment_sha, str) or not HEX64_RE.fullmatch(attachment_sha):
        raise Refusal("ATTACHMENT_HASH_INVALID", "/request/attachment_sha256: expected 64 hex characters", status="INVALID_SPEC")
    draft_hash = payload.get("draft_hash")
    if not isinstance(draft_hash, str) or not HEX64_RE.fullmatch(draft_hash):
        raise Refusal("REQUEST_MALFORMED", "/request/draft_hash: expected 64 hex characters", status="INVALID_SPEC")
    # The model may not re-supply proposals or program facts at commit time; the trusted stage is
    # the only source. A present forbidden key is refused, never silently ignored.
    _reject_commit_injected_fields(payload)
    receipt = payload.get("receipt")
    # Defense in depth: a receipt minted for another session scope never reaches the core check.
    if isinstance(receipt, Mapping) and receipt.get("session_scope") not in (None, scope):
        raise Refusal(
            "CONFIRMATION_SCOPE_MISMATCH",
            "the confirmation receipt was approved in another session scope",
            status="INVALID_SPEC",
        )
    intake_core = _intake(workspace)
    try:
        issues = intake_core.validate_request(doc)
        if issues:
            raise intake_core.IntakeError("REQUEST_INVALID", "request.schema.json rejected the document", issues=issues)
        card_id = doc.get("device_card_id")
        card = intake_core.load_device_card(card_id if isinstance(card_id, str) else "")
        # The committed draft and its proposals come ONLY from the current locked stage: read them
        # there, so a caller cannot inject proposals and a re-stage between the tool's read and this
        # commit is caught by freeze's own lock. The core recompiles from these persisted proposals.
        read = intake_core.read_staged_compile(
            workspace.intake_registry_root(),
            request=doc,
            card=card,
            attachment_sha256=attachment_sha,
            session_scope=scope,
        )
    except intake_core.IntakeError as error:
        raise _refuse_intake(error) from error
    draft = read["draft"]
    staged_props = read["text_proposals"]
    if draft.get("draft_hash") != draft_hash:
        raise Refusal(
            "DRAFT_MISMATCH",
            "the staged draft hash differs from the supplied draft hash",
            status="STALE_INPUT",
        )
    request_id = doc.get("request_id")
    if not isinstance(request_id, str):
        raise Refusal("REQUEST_MALFORMED", "/request/request/request_id: required", status="INVALID_SPEC")
    task_id = f"user-{request_id}"  # program-generated, stable per request; same request -> new revision
    try:
        frozen = intake_core.freeze_and_publish(
            workspace.intake_registry_root(),
            request=doc,
            card=card,
            draft=draft,
            receipt=receipt,
            attachment_sha256=attachment_sha,
            task_id=task_id,
            text_proposals=staged_props,
        )
    except intake_core.IntakeError as error:
        raise _refuse_intake(error) from error
    result = dict(frozen)
    for key, value in list(result.items()):
        if isinstance(value, os.PathLike):
            result[key] = str(value)
    result["request_sha256"] = _canonical_sha256(workspace, doc)
    _check_result_size(result, "intake_commit_task")
    return result


def _read_request() -> dict[str, Any]:
    raw = sys.stdin.read(MAX_REQUEST_BYTES + 1)
    if not raw or not raw.strip():
        raise Refusal("REQUEST_MALFORMED", "no request document was provided on stdin", status="INVALID_SPEC")
    if len(raw) > MAX_REQUEST_BYTES:
        raise Refusal("REQUEST_MALFORMED", f"the request exceeds {MAX_REQUEST_BYTES} bytes", status="INVALID_SPEC")
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise Refusal("REQUEST_MALFORMED", f"the request is not valid JSON: {exc}", status="INVALID_SPEC") from exc
    if not isinstance(parsed, dict):
        raise Refusal("REQUEST_MALFORMED", "the request must be a JSON object", status="INVALID_SPEC")
    if parsed.get("schema_version") != SCHEMA_VERSION:
        raise Refusal("REQUEST_MALFORMED", "/schema_version: unsupported", status="INVALID_SPEC")
    return parsed


def _envelope(command: str, ok: bool, status: str, code: str, message: str, *, request: Mapping[str, Any], data: Any = None, detail: Any = None) -> dict[str, Any]:
    envelope: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "bridge_version": BRIDGE_VERSION,
        "command": command,
        "ok": ok,
        "status": status,
        "code": code,
        "message": message,
        "data": data if data is not None else {},
    }
    if detail is not None:
        envelope["detail"] = detail
    run = request.get("request") if isinstance(request.get("request"), Mapping) else {}
    for field in ("run_id", "candidate_id", "task_id", "task_revision"):
        if isinstance(run, Mapping) and run.get(field) is not None:
            envelope[field] = run[field]
    return envelope


HANDLERS = {
    "load_task": cmd_load_task,
    "build_candidate": cmd_build_candidate,
    "validate_candidate": cmd_validate_candidate,
    "export_package": cmd_export_package,
    "get_run": cmd_get_run,
    "intake_compile_request": cmd_intake_compile_request,
    "intake_stage_request": cmd_intake_stage_request,
    "intake_read_staged_compile": cmd_intake_read_staged_compile,
    "intake_commit_task": cmd_intake_commit_task,
}

def main(argv: Sequence[str] | None = None) -> int:
    argv = list(sys.argv if argv is None else argv)
    command = argv[1] if len(argv) > 1 else None
    request: dict[str, Any] = {}
    exit_code = EXIT_OK
    try:
        if command not in SUBCOMMANDS or len(argv) > 2:
            raise Refusal(
                "REQUEST_MALFORMED",
                f"usage: python_bridge.py <{'|'.join(SUBCOMMANDS)}> (request on stdin)",
                status="INVALID_SPEC",
            )
        request = _read_request()
        config = request.get("config")
        if not isinstance(config, Mapping):
            raise Refusal("REQUEST_MALFORMED", "/config: the plugin Config is required", status="INVALID_SPEC")
        session = _session(request)
        payload = request.get("request")
        if not isinstance(payload, Mapping):
            raise Refusal("REQUEST_MALFORMED", "/request: the command arguments are required", status="INVALID_SPEC")
        workspace = Workspace(config)
        data = HANDLERS[command](workspace, session, payload)
        envelope = _envelope(command, True, "OK", "OK", "", request=request, data=data)
    except Refusal as refusal:
        envelope = _envelope(command or "unknown", False, refusal.status, refusal.code, refusal.message, request=request, detail=refusal.detail)
        exit_code = refusal.exit_code
    except ExecutionFailure as failure:
        envelope = _envelope(command or "unknown", False, failure.status, failure.code, failure.message, request=request, detail=failure.detail)
        exit_code = failure.exit_code
    except Exception as exc:  # unexpected: still answer with one JSON object
        envelope = _envelope(
            command or "unknown",
            False,
            "ERROR",
            "INTERNAL_ERROR",
            f"{type(exc).__name__}: {exc}",
            request=request,
        )
        exit_code = EXIT_ERROR
    sys.stdout.write(json.dumps(envelope, sort_keys=False, allow_nan=False) + "\n")
    sys.stdout.flush()
    return exit_code


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, _terminate_child)
    sys.exit(main())
