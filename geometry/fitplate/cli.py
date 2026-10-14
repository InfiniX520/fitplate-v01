"""Controlled command-line boundary for the CAD work (T03/T04/T05/T10).

Contract (fixed by the project plan and the plugin boundary):

* ``python -m fitplate.cli build|validate|export --request-stdin``
* stdin carries exactly one JSON request document;
* stdout carries exactly one JSON result document and nothing else;
* every diagnostic, warning and kernel message goes to stderr;
* unknown request fields are refused (fail closed), as are non-finite numbers,
  malformed hashes, stale revisions and out-of-range values.

The CLI is a *trusted low-level tool*: it accepts explicit file paths, because
the AGH plugin resolves and generates them. A model-facing tool must never be
allowed to pass an arbitrary ``output_dir``/``step_path`` straight through -
path construction belongs to the plugin, not to the model.

Exit codes: ``0`` the request was executed (a validation report may still say
FAIL/UNKNOWN - that is a result, not a crash), ``3`` the request was refused by
the contract, ``2`` execution failed.

OCCT writes parser errors to the process's *stdout* by default, which would
corrupt the single-JSON contract. The whole run therefore executes with file
descriptor 1 redirected to stderr and only the final result is written to the
real stdout (see :func:`_run_with_protected_stdout`).
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Callable, Mapping, Sequence

from . import build as build_module
from . import constraints, export as export_module
from . import schema as contract
from .errors import (
    CODE_INVALID_PATH,
    CODE_INVALID_VALUE,
    CODE_MISSING_FIELD,
    CODE_REQUEST_MALFORMED,
    CODE_UNKNOWN_FIELD,
    EXIT_ERROR,
    EXIT_OK,
    EXIT_REFUSED,
    REFUSAL_STATUSES,
    STATUS_NEEDS_INPUT,
    STATUS_OK,
    ExecutionFailure,
    FitplateError,
    RequestRefused,
)

CLI_VERSION = "fitplate-cli/1.0.0"

MAX_REQUEST_BYTES = 4 * 1024 * 1024
MAX_PATH_LENGTH = 4096

COMMANDS = ("build", "validate", "export")
REQUEST_FLAG = "--request-stdin"

#: field name -> (type, required). ``None`` as a type means "object or null".
_REQUEST_FIELDS: dict[str, dict[str, tuple[type | None, bool]]] = {
    "build": {
        "schema_version": (str, True),
        "run_id": (str, True),
        "candidate_id": (str, True),
        "task": (dict, True),
        "scene": (dict, True),
        "design": (dict, True),
        "output_dir": (str, True),
    },
    "validate": {
        "schema_version": (str, True),
        "run_id": (str, True),
        "candidate_id": (str, True),
        "task": (dict, True),
        "scene": (dict, True),
        "step_path": (str, True),
        "stl_path": (str, False),
        "preview_path": (str, False),
    },
    "export": {
        "schema_version": (str, True),
        "run_id": (str, True),
        "candidate_id": (str, True),
        "task": (dict, True),
        "scene": (dict, True),
        "report": (dict, True),
        "candidate_dir": (str, True),
        "export_dir": (str, True),
        "evidence": (dict, False),
    },
}


# --------------------------------------------------------------------------
# Request validation (fail closed)
# --------------------------------------------------------------------------


def _refuse(code: str, message: str, detail: Any = None, status: str = contract.STATUS_INVALID) -> RequestRefused:
    return RequestRefused(code, message, detail, status=status)


def _contract_refusal(message: str, result: contract.CheckResult) -> RequestRefused:
    """Turn a contract-layer result into a refusal that keeps the first reason code.

    The caller (the AGH plugin) maps codes to its own error vocabulary, so the
    specific code is worth more than a generic "contract violation".
    """
    issues = [issue.to_dict() for issue in result.issues]
    code = result.issues[0].code if result.issues else "CONTRACT_VIOLATION"
    return RequestRefused(code, message, {"issues": issues}, status=result.status)


def _check_identifier(value: Any, field: str, *, kind: str) -> str:
    if not isinstance(value, str):
        raise _refuse(CODE_INVALID_VALUE, f"/{field}: must be a string")
    if field == "candidate_id":
        if not contract.re.fullmatch(r"v[0-9]{3}", value):
            raise _refuse(CODE_INVALID_VALUE, f"/candidate_id: {value!r} does not match 'vNNN'")
    elif field == "run_id":
        if not contract.re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", value):
            raise _refuse(CODE_INVALID_VALUE, f"/run_id: {value!r} is not a safe run identifier")
    elif len(value) == 0 or len(value) > 128:
        raise _refuse(CODE_INVALID_VALUE, f"/{field}: {kind} must be 1..128 characters")
    return value


def _check_path(value: Any, field: str, *, must_exist: bool, kind: str) -> Path:
    if not isinstance(value, str):
        raise _refuse(CODE_INVALID_VALUE, f"/{field}: must be a string path")
    if not value or len(value) > MAX_PATH_LENGTH:
        raise _refuse(CODE_INVALID_VALUE, f"/{field}: path must be 1..{MAX_PATH_LENGTH} characters")
    if "\x00" in value:
        raise _refuse(CODE_INVALID_PATH, f"/{field}: path contains a NUL byte")
    path = Path(value)
    if not path.is_absolute():
        raise _refuse(CODE_INVALID_PATH, f"/{field}: path must be absolute; the caller resolves it, not the model")
    if must_exist and not path.exists():
        raise _refuse(
            CODE_INVALID_PATH,
            f"/{field}: {kind} does not exist: {path}",
            status=contract.STATUS_STALE,
        )
    return path


def validate_request(command: str, request: Any) -> dict[str, Any]:
    """Validate one request document, failing closed on anything unexpected."""
    if command not in COMMANDS:
        raise _refuse(CODE_INVALID_VALUE, f"unknown command {command!r}; expected one of {list(COMMANDS)}")
    if not isinstance(request, Mapping):
        raise _refuse(CODE_REQUEST_MALFORMED, "the request must be a JSON object")

    fields = _REQUEST_FIELDS[command]
    for name in request:
        if name not in fields:
            raise _refuse(
                CODE_UNKNOWN_FIELD,
                f"/{name}: unknown field for command {command!r}; the request contract is closed",
            )
    for name, (expected, required) in fields.items():
        if name not in request:
            if required:
                raise _refuse(
                    CODE_MISSING_FIELD,
                    f"/{name}: required field is missing",
                    status=STATUS_NEEDS_INPUT,
                )
            continue
        value = request[name]
        if expected is not None and not isinstance(value, expected):
            raise _refuse(CODE_INVALID_VALUE, f"/{name}: must be {expected.__name__}, got {type(value).__name__}")
        if expected is None and value is not None and not isinstance(value, (dict,)):
            raise _refuse(CODE_INVALID_VALUE, f"/{name}: must be an object or null")

    if request["schema_version"] != contract.SCHEMA_VERSION:
        raise _refuse(
            CODE_INVALID_VALUE,
            f"/schema_version: must be {contract.SCHEMA_VERSION!r}, got {request['schema_version']!r}",
        )
    _check_identifier(request["run_id"], "run_id", kind="run id")
    _check_identifier(request["candidate_id"], "candidate_id", kind="candidate id")

    checked: dict[str, Any] = {
        "run_id": request["run_id"],
        "candidate_id": request["candidate_id"],
        "task": request["task"],
        "scene": request["scene"],
    }

    # The frozen inputs are validated by the contract layer, not by ad-hoc code.
    task_result = contract.validate_task(request["task"])
    if not task_result.ok:
        raise _contract_refusal(
            f"the task document does not satisfy the frozen contract: {task_result.status}", task_result
        )
    checked["task"] = request["task"]

    scene_result = contract.validate_scene(request["scene"])
    if not scene_result.ok:
        raise _contract_refusal(
            f"the scene document does not satisfy the frozen contract: {scene_result.status}", scene_result
        )
    binding = contract.check_scene_binding(request["task"], request["scene"], request["task"]["scene_ref"])
    if not binding.ok:
        raise _contract_refusal(
            "the scene does not match the reference frozen by the task (name or content hash)", binding
        )
    cross = contract.check_scene_against_task(request["scene"], request["task"])
    if not cross.ok:
        raise _contract_refusal(
            "the scene does not describe the environment of this task", cross
        )
    checked["scene"] = request["scene"]

    if command == "build":
        design_result = contract.check_design_against_task(request["design"], request["task"])
        if not design_result.ok:
            raise _contract_refusal(
                f"the design candidate is not acceptable for the frozen task: {design_result.status}",
                design_result,
            )
        checked["design"] = request["design"]
        checked["output_dir"] = _check_path(request["output_dir"], "output_dir", must_exist=True, kind="output directory")
        if not checked["output_dir"].is_dir():
            raise _refuse(CODE_INVALID_PATH, f"/output_dir: not a directory: {checked['output_dir']}")
    elif command == "validate":
        checked["step_path"] = _check_path(request["step_path"], "step_path", must_exist=True, kind="STEP artefact")
        if not checked["step_path"].is_file():
            raise _refuse(CODE_INVALID_PATH, f"/step_path: not a file: {checked['step_path']}")
        for optional in ("stl_path", "preview_path"):
            if optional in request:
                path = _check_path(request[optional], optional, must_exist=True, kind="artefact")
                if not path.is_file():
                    raise _refuse(CODE_INVALID_PATH, f"/{optional}: not a file: {path}")
                checked[optional] = path
    else:  # export
        checked["candidate_dir"] = _check_path(request["candidate_dir"], "candidate_dir", must_exist=True, kind="candidate directory")
        if not checked["candidate_dir"].is_dir():
            raise _refuse(CODE_INVALID_PATH, f"/candidate_dir: not a directory: {checked['candidate_dir']}")
        checked["export_dir"] = _check_path(request["export_dir"], "export_dir", must_exist=False, kind="export directory")
        if checked["export_dir"].exists():
            raise _refuse(
                CODE_INVALID_PATH,
                f"/export_dir: already exists and is never overwritten: {checked['export_dir']}",
                status=contract.STATUS_INVALID,
            )
        report_result = contract.validate_report(request["report"])
        if not report_result.ok:
            raise _contract_refusal(
                f"the report document does not satisfy the report contract: {report_result.status}",
                report_result,
            )
        if request["report"].get("run_id") != request["run_id"] or request["report"].get("candidate_id") != request["candidate_id"]:
            raise _refuse(
                "STALE_INPUT",
                "the report belongs to a different run or candidate; the export binding is refused",
                status=contract.STATUS_STALE,
            )
        checked["report"] = request["report"]
        checked["evidence"] = request.get("evidence")
    return checked


# --------------------------------------------------------------------------
# stdout protection
# --------------------------------------------------------------------------


def _run_with_protected_stdout(operation: Callable[[], dict[str, Any]]) -> dict[str, Any]:
    """Run ``operation`` with fd 1 pointed at stderr, then return its result.

    OCCT's default message printer writes to the C++ stdout. Redirecting the
    file descriptor (not just ``sys.stdout``) keeps that noise out of the JSON
    channel; callers still see it on stderr.
    """
    sys.stdout.flush()
    sys.stderr.flush()
    saved_fd = os.dup(1)
    try:
        os.dup2(2, 1)
        try:
            return operation()
        finally:
            sys.stdout.flush()
            os.dup2(saved_fd, 1)
    finally:
        os.close(saved_fd)


# --------------------------------------------------------------------------
# Command handlers
# --------------------------------------------------------------------------


def _handle_build(request: Mapping[str, Any]) -> dict[str, Any]:
    outcome = build_module.run_build(
        task=request["task"],
        scene=request["scene"],
        design=request["design"],
        run_id=request["run_id"],
        candidate_id=request["candidate_id"],
        output_dir=request["output_dir"],
    )
    return {
        "candidate_dir": outcome["candidate_dir"],
        "duration_ms": outcome["duration_ms"],
        "step_sha256": outcome["step_sha256"],
        "stl_sha256": outcome["stl_sha256"],
        "preview_triangles": outcome["preview_triangles"],
        "preview_mesh_bytes": outcome["preview_mesh_bytes"],
        "manifest": outcome["manifest"],
        "self_check": outcome["self_check"],
        "note": "self_check is a generator self-test, not acceptance evidence; run validate on the STEP artefact",
    }


def _handle_validate(request: Mapping[str, Any]) -> dict[str, Any]:
    outcome = constraints.evaluate(
        constraints.ValidationInputs(
            task=request["task"],
            scene=request["scene"],
            run_id=request["run_id"],
            candidate_id=request["candidate_id"],
            step_path=request["step_path"],
            stl_path=request.get("stl_path"),
            preview_path=request.get("preview_path"),
        )
    )
    return {"report": outcome.report, "evidence": outcome.evidence}


def _handle_export(request: Mapping[str, Any]) -> dict[str, Any]:
    return export_module.run_export(
        task=request["task"],
        scene=request["scene"],
        report=request["report"],
        run_id=request["run_id"],
        candidate_id=request["candidate_id"],
        candidate_dir=request["candidate_dir"],
        export_dir=request["export_dir"],
        evidence=request.get("evidence"),
    )


_HANDLERS: dict[str, Callable[[Mapping[str, Any]], dict[str, Any]]] = {
    "build": _handle_build,
    "validate": _handle_validate,
    "export": _handle_export,
}


# --------------------------------------------------------------------------
# Entry point
# --------------------------------------------------------------------------


def _error_envelope(command: str | None, request: Any, error: FitplateError) -> dict[str, Any]:
    envelope: dict[str, Any] = {
        "schema_version": contract.SCHEMA_VERSION,
        "command": command,
        "status": error.status,
        "cli_version": CLI_VERSION,
        "result": None,
        "errors": [error.to_dict()],
    }
    if isinstance(request, Mapping):
        for field in ("run_id", "candidate_id"):
            if isinstance(request.get(field), str):
                envelope[field] = request[field]
    return envelope


def _ok_envelope(command: str, request: Mapping[str, Any], result: Mapping[str, Any]) -> dict[str, Any]:
    task = request["task"]
    return {
        "schema_version": contract.SCHEMA_VERSION,
        "command": command,
        "status": STATUS_OK,
        "cli_version": CLI_VERSION,
        "run_id": request["run_id"],
        "candidate_id": request["candidate_id"],
        "task_id": task["task_id"],
        "task_revision": int(task["revision"]),
        "result": dict(result),
        "errors": [],
    }


def _read_request() -> Any:
    raw = sys.stdin.read(MAX_REQUEST_BYTES + 1)
    if raw == "":
        raise _refuse(CODE_REQUEST_MALFORMED, "no request document was provided on stdin")
    if len(raw) > MAX_REQUEST_BYTES:
        raise _refuse(CODE_REQUEST_MALFORMED, f"the request document exceeds {MAX_REQUEST_BYTES} bytes")
    try:
        return contract.load_json_strict(raw, source="<stdin>")
    except contract.JsonLoadError as exc:
        raise _refuse(CODE_REQUEST_MALFORMED, f"the request is not valid JSON: {exc}") from exc


def _parse_argv(argv: Sequence[str]) -> str:
    if len(argv) < 2:
        raise _refuse(CODE_REQUEST_MALFORMED, f"usage: python -m fitplate.cli {'|'.join(COMMANDS)} {REQUEST_FLAG}")
    command = argv[1]
    flags = list(argv[2:])
    if flags != [REQUEST_FLAG]:
        raise _refuse(
            CODE_REQUEST_MALFORMED,
            f"only {REQUEST_FLAG} is supported; got {flags!r}",
        )
    return command


def main(argv: Sequence[str] | None = None) -> int:
    """Entry point: read one request, run one command, print one JSON result."""
    argv = list(sys.argv if argv is None else argv)
    command: str | None = None
    request: Any = None
    try:
        command = _parse_argv(argv)
        request = _read_request()
        checked = validate_request(command, request)
        result = _run_with_protected_stdout(lambda: _HANDLERS[command](checked))  # type: ignore[arg-type]
        envelope = _ok_envelope(command, checked, result)
        exit_code = EXIT_OK
    except RequestRefused as refusal:
        envelope = _error_envelope(command, request, refusal)
        exit_code = EXIT_REFUSED if refusal.status in REFUSAL_STATUSES else EXIT_ERROR
    except ExecutionFailure as failure:
        envelope = _error_envelope(command, request, failure)
        exit_code = EXIT_ERROR
    except FitplateError as failure:  # pragma: no cover - defensive: any other typed error
        envelope = _error_envelope(command, request, failure)
        exit_code = failure.exit_code
    except Exception as exc:  # unexpected: still answer with one JSON object, never a traceback on stdout
        envelope = _error_envelope(
            command,
            request,
            ExecutionFailure("INTERNAL_ERROR", f"{type(exc).__name__}: {exc}"),
        )
        exit_code = EXIT_ERROR
    sys.stdout.write(json.dumps(envelope, sort_keys=False, allow_nan=False) + "\n")
    sys.stdout.flush()
    return exit_code


if __name__ == "__main__":  # pragma: no cover - exercised through subprocess tests
    sys.exit(main())
