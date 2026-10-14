#!/usr/bin/env python3
"""Re-run the FitPlate acceptance decision (G01-G08) on a candidate, out of band.

Usage:

    PYTHONPATH=geometry .venv/bin/python scripts/verify-cad.py <candidate_dir> [--json]

``<candidate_dir>`` is a candidate directory produced by ``fitplate.cli build``
(``task.json``, ``scene.json``, ``model.step``, ``model.stl``, ``preview.json``,
``preview_mesh.json``). The frozen task/scene copies are re-validated against
the contract, the artefacts are re-measured in this fresh process and the
acceptance checks are re-decided here - the candidate's own ``report.json`` is
never trusted for the verdict.

Exit code 0 only when every one of G01-G08 is PASS. Anything else (FAIL,
UNKNOWN, BORDERLINE, unreadable artefact) exits 1, so this script can gate an
acceptance run without parsing prose.

This is the out-of-band counterpart of the in-band tooling:

* ``fitplate.cli validate`` - the production path (same code, invoked by the
  plugin through the controlled CLI);
* ``scripts/verify-bundle.py`` - checks a bundle's internal consistency
  (hashes, bindings, independent STL/mesh readers) without re-deciding G01-G08;
* ``scripts/verify-cad.py`` - re-decides G01-G08 on the actual bytes.

It contains no reference layouts and no defect injections: everything it needs
is inside the candidate directory.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
GEOMETRY_ROOT = REPO_ROOT / "geometry"

EXIT_ACCEPTED = 0
EXIT_REJECTED = 1
EXIT_UNUSABLE = 2


def verify(candidate: Path) -> tuple[int, dict[str, Any]]:
    if not candidate.is_dir():
        return EXIT_UNUSABLE, {"ok": False, "error": f"not a directory: {candidate}"}

    if str(GEOMETRY_ROOT) not in sys.path:
        sys.path.insert(0, str(GEOMETRY_ROOT))
    from fitplate import constraints, identity  # noqa: PLC0415 - after sys.path
    from fitplate import schema as contract  # noqa: PLC0415

    problems: list[str] = []
    for name in ("task.json", "scene.json", "model.step"):
        if not (candidate / name).is_file():
            problems.append(f"missing {name}")
    if problems:
        return EXIT_UNUSABLE, {"ok": False, "error": "; ".join(problems)}

    try:
        task = contract.load_json_file(candidate / "task.json")
        scene = contract.load_json_file(candidate / "scene.json")
    except contract.JsonLoadError as exc:
        return EXIT_UNUSABLE, {"ok": False, "error": f"frozen inputs are not readable JSON: {exc}"}

    result = contract.validate_task(task)
    if not result.ok:  # pragma: no cover - contract guard
        return EXIT_UNUSABLE, {
            "ok": False,
            "error": f"the frozen task copy does not satisfy the contract: {result}",
            "task_id": task.get("task_id") if isinstance(task, dict) else None,
        }
    scene_result = contract.validate_scene(scene)
    if not scene_result.ok:  # pragma: no cover - contract guard
        return EXIT_UNUSABLE, {"ok": False, "error": f"the frozen scene copy does not satisfy the contract: {scene_result}"}
    if task.get("scene_sha256") is not None and contract.content_sha256(scene) != task["scene_sha256"]:
        # The scene is frozen by the task; a swapped scene copy is not this task's.
        return EXIT_UNUSABLE, {"ok": False, "error": "the scene copy does not match the hash frozen by the task"}

    # The artefact set is optional beyond the STEP: a missing STL/preview is a
    # G08 verdict (UNKNOWN), not a script error.
    step_path = candidate / "model.step"
    stl_path = candidate / "model.stl"
    preview_path = candidate / "preview.json"

    outcome = constraints.evaluate(
        constraints.ValidationInputs(
            task=task,
            scene=scene,
            run_id=str(task.get("task_id", "out-of-band")),
            candidate_id=candidate.name,
            step_path=step_path,
            stl_path=stl_path if stl_path.is_file() else None,
            preview_path=preview_path if preview_path.is_file() else None,
        )
    )
    report = outcome.report
    checks = [(check["id"], check["status"], check.get("reason_code")) for check in report["checks"]]
    overall = report["overall"]

    current_validator = identity.validator_code_sha256()
    declared_validator = None
    report_path = candidate / "report.json"
    if report_path.is_file():
        try:
            declared_validator = contract.load_json_file(report_path).get("hashes", {}).get("validator_code_sha256")
        except contract.JsonLoadError:
            declared_validator = None

    payload = {
        "candidate_dir": str(candidate),
        "task_id": task.get("task_id"),
        "task_revision": task.get("revision"),
        "overall": overall,
        "checks": [{"id": cid, "status": status, "reason_code": reason} for cid, status, reason in checks],
        "validator_code_sha256": current_validator,
        "report_validator_code_sha256": declared_validator,
        "report_validator_matches": None if declared_validator is None else declared_validator == current_validator,
        "step_sha256": report["hashes"]["step_sha256"],
        "ok": overall == "PASS",
    }
    return (EXIT_ACCEPTED if overall == "PASS" else EXIT_REJECTED), payload


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Re-run the FitPlate acceptance checks on a candidate directory.")
    parser.add_argument("directory", type=Path, help="candidate directory (task.json + artefacts)")
    parser.add_argument("--json", action="store_true", help="print the machine-readable result")
    arguments = parser.parse_args(argv)

    code, payload = verify(arguments.directory)
    if arguments.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    elif payload.get("ok") is False and "error" in payload:
        print(f"NOT VERIFIED: {payload['error']}", file=sys.stderr)
    else:
        for check in payload.get("checks", []):
            reason = check["reason_code"] or ""
            print(f"[{check['status']:<10}] {check['id']} {reason}".rstrip())
        print(f"overall: {payload['overall']}")
        if payload.get("report_validator_matches") is False:
            print(
                "WARNING: report.json was produced by different validator code than the one installed now",
                file=sys.stderr,
            )
    return code


if __name__ == "__main__":
    sys.exit(main())
