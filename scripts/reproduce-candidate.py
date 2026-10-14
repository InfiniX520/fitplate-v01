#!/usr/bin/env python
"""One-command offline reproduction of a candidate build, measurement and export bundle.

This is a *manual, structured engineering reference*: it takes a real design file, copies the
public fixture inputs plus the generic method skill into a NEW directory, drives the real
geometry CLI (`python -m fitplate.cli build|validate|export --request-stdin`, the same request
documents the plugin bridge sends), and then re-verifies the artefacts from outside with
`scripts/verify-cad.py` and `scripts/verify-bundle.py`. It is not a model session, not a
model-produced fix, and it never touches the reference layouts or expected results.

Usage:

    PYTHONPATH=geometry .venv/bin/python scripts/reproduce-candidate.py \
        --design <real design.json> [--input-dir fixtures/dev/sensor-swap-01] \
        [--out demo-workspaces/repro-<new>] [--run-id r-repro-1] [--candidate-id v001]

Defaults: `--input-dir` is the public sensor-swap-01 fixture; `--design` defaults to that
fixture's own `initial-design.json` (the measurement verdict for it is whatever the geometry
actually says - a failing initial candidate is reported as FAIL, never hidden). The output
directory defaults to `demo-workspaces/repro-<task_id>-<UTC stamp>` and **must not exist**:
old evidence is never overwritten (exit 3 otherwise).

stdout carries only actual results (real ids, hashes, statuses and the verifiers' own output);
diagnostics go to stderr. Exit codes: 0 verified bundle / 1 a step or verifier failed /
2 usage / 3 refused (output dir exists, inputs missing).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEOMETRY = ROOT / "geometry"
SKILL_SOURCE = ROOT / ".agh" / "skills" / "fitplate-design" / "SKILL.md"
DEFAULT_INPUT = ROOT / "fixtures" / "dev" / "sensor-swap-01"
PYTHON = ROOT / ".venv" / "bin" / "python"

EXIT_OK = 0
EXIT_FAILED = 1
EXIT_USAGE = 2
EXIT_REFUSED = 3


def fail(code: int, message: str) -> None:
    print(f"✗ {message}", file=sys.stderr)
    raise SystemExit(code)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def cli_env() -> dict[str, str]:
    env = dict(os.environ)
    env["PYTHONPATH"] = str(GEOMETRY) + (os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")
    return env


def run_cli(command: str, request: dict, cwd: Path) -> dict:
    """One real CLI call over the documented stdin/stdout JSON boundary."""
    process = subprocess.run(
        [str(PYTHON), "-m", "fitplate.cli", command, "--request-stdin"],
        input=json.dumps(request, ensure_ascii=False).encode("utf-8"),
        capture_output=True,
        cwd=cwd,
        env=cli_env(),
    )
    stdout = process.stdout.decode("utf-8", "replace").strip()
    try:
        envelope = json.loads(stdout)
    except json.JSONDecodeError:
        print(process.stderr.decode("utf-8", "replace"), file=sys.stderr)
        fail(EXIT_FAILED, f"{command}: the CLI did not answer one JSON document (exit {process.returncode})")
    if process.returncode != 0 or envelope.get("status") != "OK":
        for error in envelope.get("errors") or []:
            print(f"  {error.get('code')}: {error.get('message')}", file=sys.stderr)
        print(process.stderr.decode("utf-8", "replace"), file=sys.stderr)
        fail(EXIT_FAILED, f"{command}: refused or failed (status={envelope.get('status')}, exit {process.returncode})")
    return envelope["result"]


def run_verifier(script: str, directory: Path) -> int:
    process = subprocess.run(
        [str(PYTHON), str(ROOT / "scripts" / script), str(directory)],
        capture_output=True,
        cwd=ROOT,
        env=cli_env(),
    )
    for stream, sink in ((process.stdout, sys.stdout), (process.stderr, sys.stderr)):
        text = stream.decode("utf-8", "replace").rstrip()
        if text:
            print(text, file=sink)
    return process.returncode


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Offline candidate reproduction (manual engineering reference).")
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT, help="public fixture directory (task.json + scene + initial-design.json)")
    parser.add_argument("--design", type=Path, default=None, help="real design JSON (default: <input-dir>/initial-design.json)")
    parser.add_argument("--out", type=Path, default=None, help="new output directory (default: demo-workspaces/repro-<task_id>-<UTC stamp>; must not exist)")
    parser.add_argument("--run-id", default="r-repro-1")
    parser.add_argument("--candidate-id", default="v001")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    if not PYTHON.exists():
        fail(EXIT_REFUSED, f"project interpreter missing: {PYTHON} (run the documented .venv setup)")
    options = parse_args(argv)

    input_dir = options.input_dir.resolve()
    task_path = input_dir / "task.json"
    if not task_path.is_file():
        fail(EXIT_USAGE, f"input fixture has no task.json: {input_dir}")
    task = json.loads(task_path.read_text(encoding="utf-8"))
    scene_path = input_dir / task["scene_ref"]
    if not scene_path.is_file():
        fail(EXIT_USAGE, f"scene referenced by the task is missing: {scene_path}")
    scene = json.loads(scene_path.read_text(encoding="utf-8"))
    design_path = (options.design or input_dir / "initial-design.json").resolve()
    if not design_path.is_file():
        fail(EXIT_USAGE, f"design file missing: {design_path} (pass --design <real design.json>)")
    design = json.loads(design_path.read_text(encoding="utf-8"))

    out_dir = (options.out or ROOT / "demo-workspaces" / f"repro-{task['task_id']}-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}").resolve()
    if out_dir.exists():
        fail(EXIT_REFUSED, f"output directory already exists and is never overwritten: {out_dir}")

    # -- copy the public fixture inputs + the generic method skill into the new directory --
    task_input_dir = out_dir / "input" / "tasks" / task["task_id"]
    task_input_dir.mkdir(parents=True)
    shutil.copyfile(task_path, task_input_dir / "task.json")
    shutil.copyfile(scene_path, task_input_dir / scene_path.name)
    shutil.copyfile(design_path, task_input_dir / "design.json")
    if SKILL_SOURCE.is_file():
        skill_dir = out_dir / ".agh" / "skills" / "fitplate-design"
        skill_dir.mkdir(parents=True)
        shutil.copyfile(SKILL_SOURCE, skill_dir / "SKILL.md")
    audit = {
        "kind": "fitplate-manual-reproduction",
        "note": "manual structured engineering reference; copied inputs come from the public fixture, the design file is passed explicitly and is not a model fix",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "task": {"source": str(task_path), "sha256": sha256_file(task_path)},
        "scene": {"source": str(scene_path), "sha256": sha256_file(scene_path)},
        "design": {"source": str(design_path), "sha256": sha256_file(design_path)},
        "skill": {"source": str(SKILL_SOURCE), "sha256": sha256_file(SKILL_SOURCE)} if SKILL_SOURCE.is_file() else None,
    }
    (out_dir / "repro-audit.json").write_text(json.dumps(audit, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    run_dir = out_dir / "runs" / options.run_id
    candidates_dir = run_dir / "candidates"
    candidates_dir.mkdir(parents=True)
    print(f"workspace: {out_dir}")
    print(f"design: {design_path} sha256={audit['design']['sha256']}")

    # -- build ------------------------------------------------------------------------------
    built = run_cli(
        "build",
        {
            "schema_version": "1.0",
            "run_id": options.run_id,
            "candidate_id": options.candidate_id,
            "task": task,
            "scene": scene,
            "design": design,
            "output_dir": str(candidates_dir),
        },
        cwd=out_dir,
    )
    candidate_dir = Path(built["candidate_dir"])
    print(f"build: candidate_dir={candidate_dir} step_sha256={built['step_sha256']} duration_ms={built['duration_ms']:.1f}")

    # -- validate (independent measurement) --------------------------------------------------
    step_path = candidate_dir / "model.step"
    stl_path = candidate_dir / "model.stl"
    preview_path = candidate_dir / "preview.json"
    validate_request = {
        "schema_version": "1.0",
        "run_id": options.run_id,
        "candidate_id": options.candidate_id,
        "task": task,
        "scene": scene,
        "step_path": str(step_path),
        "stl_path": str(stl_path),
        **({"preview_path": str(preview_path)} if preview_path.is_file() else {}),
    }
    validated = run_cli("validate", validate_request, cwd=out_dir)
    report = validated["report"]
    evidence = validated.get("evidence")
    checks = " ".join(f"{check.get('id')} {check.get('status')}" for check in report.get("checks") or [])
    print(f"validate: report_id={report.get('report_id')} overall={report.get('overall')}")
    if checks:
        print(f"checks: {checks}")

    # -- export (immutable bundle; export_dir must not exist, its parent is created one level) --
    report_id = str(report.get("report_id") or f"{options.run_id}-{options.candidate_id}")
    exports_dir = run_dir / "exports" / options.candidate_id
    export_dir = exports_dir / report_id
    exports_dir.mkdir(parents=True, exist_ok=True)
    exported = run_cli(
        "export",
        {
            "schema_version": "1.0",
            "run_id": options.run_id,
            "candidate_id": options.candidate_id,
            "task": task,
            "scene": scene,
            "report": report,
            "candidate_dir": str(candidate_dir),
            "export_dir": str(export_dir),
            **({"evidence": evidence} if evidence is not None else {}),
        },
        cwd=out_dir,
    )
    files = sorted(path.name for path in export_dir.iterdir()) if export_dir.is_dir() else []
    print(f"export: export_dir={export_dir} files={len(files)} [{', '.join(files)}]")

    # -- re-verify from outside: candidate re-measurement + bundle consistency ----------------
    cad_exit = run_verifier("verify-cad.py", candidate_dir)
    bundle_exit = run_verifier("verify-bundle.py", export_dir)
    print(f"verify-cad exit={cad_exit} · verify-bundle exit={bundle_exit}")
    if cad_exit != 0 or bundle_exit != 0:
        print("✗ reproduction finished, but a verifier refused the artefacts (see its output above)", file=sys.stderr)
        return EXIT_FAILED
    print(f"reproduced: run_dir={run_dir} candidate_dir={candidate_dir} export_dir={export_dir}")
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
