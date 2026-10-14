"""Export package (T10): bind the frozen inputs, the artefact and the report.

An export directory is a self-describing bundle: the STEP/STL/preview, the
frozen task and scene, the DesignSpec, the validation report and the evidence
file, plus a manifest with the SHA-256 of every file and the identity binding
(``run_id`` / ``candidate_id`` / ``report_id`` / task+scene+STEP hashes).

Four rules make the bundle trustworthy rather than decorative:

* the report must *bind* to the artefact being exported - its task/scene/STEP
  hashes are re-derived from the actual bytes, and a report that describes a
  different file is ``STALE_INPUT`` and is refused;
* the report must carry the canonical hash of the *installed* validator code
  (``validator_code_sha256``); a missing or stale code identity stops the
  export, so a PASS can never be transported from another implementation;
* the report's re-measured values are cross-checked against a fresh
  measurement of the exported STEP, and the STL, ``preview.json`` and
  ``preview_mesh.json`` are re-read and re-measured against that same solid
  (and, where the report recorded it, against the report's own mesh hash);
* the bundle is written into a temporary sibling directory, verified, and only
  then published with a no-replace guard; an existing export directory is never
  overwritten, not even an empty one.
"""

from __future__ import annotations

import json
import os
import shutil
import time
from pathlib import Path
from typing import Any, Mapping

from . import identity
from . import inspect_step
from . import schema as contract
from .constraints import STL_VOLUME_ABSOLUTE_BUDGET_MM3, STL_VOLUME_RELATIVE_BUDGET
from .errors import (
    CODE_ARTEFACT_HASH_MISMATCH,
    CODE_ARTEFACT_INCONSISTENT,
    CODE_ARTEFACT_MISSING,
    CODE_PERSISTENCE_FAILED,
    ExecutionFailure,
    RequestRefused,
)
from .publish import publish_directory_noreplace

VERSION = "fitplate-export/1.0.0"

#: Artefacts copied into the bundle, in a stable order. ``required`` files must
#: exist in the candidate directory; the rest are copied when present.
EXPORT_FILES: tuple[tuple[str, bool], ...] = (
    ("model.step", True),
    ("model.stl", True),
    ("preview.json", True),
    ("preview_mesh.json", True),
    ("design.json", False),
    ("build.json", False),
    ("repro.py", False),
)

#: Relative agreement required between the report's measured values and a fresh
#: measurement of the exported STEP.
CROSS_CHECK_RELATIVE_TOLERANCE = 1e-3
CROSS_CHECK_ABSOLUTE_TOLERANCE_MM = 1e-3


def _require_file(candidate_dir: Path, name: str) -> Path:
    path = candidate_dir / name
    if not path.is_file():
        raise ExecutionFailure(CODE_ARTEFACT_MISSING, f"candidate directory has no {name}: {path}")
    return path


def _check_report_describes_artefact(
    report: Mapping[str, Any],
    facts: inspect_step.ShapeFacts,
) -> list[str]:
    """Cross-check the report's scalar measurements against a fresh measurement."""
    problems: list[str] = []
    checks = {check["id"]: check for check in report["checks"]}
    g01 = checks.get("G01", {}).get("measured", {})
    reported_volume = g01.get("volume_mm3")
    if isinstance(reported_volume, (int, float)) and not isinstance(reported_volume, bool):
        delta = abs(float(reported_volume) - facts.volume_mm3)
        budget = max(CROSS_CHECK_RELATIVE_TOLERANCE * abs(facts.volume_mm3), CROSS_CHECK_ABSOLUTE_TOLERANCE_MM)
        if delta > budget:
            problems.append(
                f"report G01 volume {reported_volume} does not match the exported STEP volume {facts.volume_mm3:.6f}"
            )
    else:
        problems.append("report G01 carries no measured volume to compare against the exported STEP")
    g02 = checks.get("G02", {}).get("measured", {})
    for key, axis in (("width_mm", 0), ("height_mm", 1), ("thickness_mm", 2)):
        reported = g02.get(key)
        if isinstance(reported, (int, float)) and not isinstance(reported, bool):
            delta = abs(float(reported) - facts.size_xyz[axis])
            if delta > CROSS_CHECK_ABSOLUTE_TOLERANCE_MM:
                problems.append(f"report G02 {key}={reported} does not match the exported STEP ({facts.size_xyz[axis]:.6f})")
    return problems


def _require_current_validator(report: Mapping[str, Any]) -> str:
    """Refuse any report that does not carry the hash of the installed validator.

    A report is evidence only together with the code that produced it: a missing
    hash (legacy sample, hand-written report) or a hash that no longer matches
    the installed modules is ``STALE_INPUT`` and nothing is exported.
    """
    declared = (report.get("hashes") or {}).get("validator_code_sha256")
    try:
        current = identity.validator_code_sha256()
    except OSError as exc:
        raise ExecutionFailure(
            CODE_PERSISTENCE_FAILED, f"cannot hash the installed validator modules: {exc}"
        ) from exc
    if not isinstance(declared, str) or not declared:
        raise RequestRefused(
            "VALIDATOR_HASH_MISSING",
            "the report carries no validator_code_sha256; without the code identity it is not exportable evidence",
            status=contract.STATUS_STALE,
        )
    if declared != current:
        raise RequestRefused(
            "STALE_VALIDATOR",
            "the validator code changed since the report was produced; re-run validation before exporting",
            {"declared": declared, "current": current},
            status=contract.STATUS_STALE,
        )
    return current


def _verify_stl(stl_path: Path, facts: inspect_step.ShapeFacts) -> dict[str, Any]:
    """Re-parse the exported STL and hold it to the same budget as G08."""
    stl = inspect_step.parse_stl(stl_path)
    volume_delta = abs(stl.volume_mm3 - facts.volume_mm3)
    volume_budget = max(STL_VOLUME_RELATIVE_BUDGET * abs(facts.volume_mm3), STL_VOLUME_ABSOLUTE_BUDGET_MM3)
    problems: list[str] = []
    if not stl.is_closed:
        problems.append("the STL is not closed")
    if stl.volume_mm3 <= 0.0:
        problems.append("the STL encloses a non-positive volume")
    if volume_delta > volume_budget:
        problems.append(f"the STL volume {stl.volume_mm3:.6f} differs from the STEP volume by {volume_delta:.6f} mm3")
    for axis in range(3):
        size_delta = abs((stl.bounds_max[axis] - stl.bounds_min[axis]) - facts.size_xyz[axis])
        if size_delta > CROSS_CHECK_ABSOLUTE_TOLERANCE_MM:
            problems.append(f"the STL extent along axis {axis} differs by {size_delta:.6f} mm")
    if problems:
        raise RequestRefused(
            CODE_ARTEFACT_INCONSISTENT,
            "the exported STL does not describe the exported STEP: " + "; ".join(problems),
            {"problems": problems},
            status=contract.STATUS_STALE,
        )
    return {
        "stl_volume_mm3": round(stl.volume_mm3, 6),
        "stl_volume_delta_mm3": round(volume_delta, 6),
        "stl_closed": stl.is_closed,
    }


def _verify_preview_mesh(
    mesh_path: Path,
    preview: Mapping[str, Any],
    facts: inspect_step.ShapeFacts,
    *,
    step_sha256: str,
    expected_mesh_sha256: str | None,
) -> dict[str, Any]:
    """Re-read ``preview_mesh.json`` and bind it to the report, preview and STEP.

    The mesh is not taken on trust: its structure is validated (finite
    coordinates, index range, degenerate triangles, believable tolerances), its
    bounds and enclosed volume are compared with the re-measured STEP, its
    triangle count with ``preview.json`` and its bytes with the hash the report
    recorded when it decided the verdict.
    """
    actual_sha256 = contract.file_sha256(mesh_path)
    if expected_mesh_sha256 is not None and actual_sha256 != expected_mesh_sha256:
        raise RequestRefused(
            CODE_ARTEFACT_HASH_MISMATCH,
            "preview_mesh.json changed after the report was produced; the report does not describe this mesh",
            {"recorded": expected_mesh_sha256, "actual": actual_sha256},
            status=contract.STATUS_STALE,
        )
    try:
        mesh_doc = contract.load_json_file(mesh_path)
    except contract.JsonLoadError as exc:
        raise ExecutionFailure(CODE_ARTEFACT_INCONSISTENT, f"preview_mesh.json is not readable JSON: {exc}") from exc
    problems: list[str] = []
    if not isinstance(mesh_doc, Mapping):
        problems.append("the mesh document is not a JSON object")
    else:
        if mesh_doc.get("schema_version") != contract.SCHEMA_VERSION:
            problems.append("the mesh schema_version is not the current contract")
        if mesh_doc.get("step_sha256") != step_sha256:
            problems.append("the mesh does not bind the exported STEP hash")
        if mesh_doc.get("candidate_id") != preview.get("candidate_id"):
            problems.append("the mesh does not bind the preview's candidate id")
        analysis = inspect_step.analyze_preview_mesh(mesh_doc)
        if analysis.problem is not None or analysis.facts is None:
            problems.append(f"the mesh payload is unusable ({analysis.problem}: {analysis.detail})")
        else:
            mesh = analysis.facts
            delta = abs(mesh.volume_mm3 - facts.volume_mm3)
            budget = max(STL_VOLUME_RELATIVE_BUDGET * abs(facts.volume_mm3), STL_VOLUME_ABSOLUTE_BUDGET_MM3)
            if delta > budget:
                problems.append(f"the mesh volume differs from the STEP volume by {delta:.6f} mm3")
            for axis in range(3):
                if abs(mesh.bounds_min[axis] - facts.bbox_min[axis]) > CROSS_CHECK_ABSOLUTE_TOLERANCE_MM or (
                    abs(mesh.bounds_max[axis] - facts.bbox_max[axis]) > CROSS_CHECK_ABSOLUTE_TOLERANCE_MM
                ):
                    problems.append(f"the mesh bounds differ from the STEP bounds on axis {axis}")
            declared_triangles = preview.get("triangles")
            if isinstance(declared_triangles, int) and not isinstance(declared_triangles, bool) and (
                declared_triangles != mesh.triangle_count
            ):
                problems.append(
                    f"the mesh has {mesh.triangle_count} triangles, preview.json declares {declared_triangles}"
                )
    if problems:
        raise RequestRefused(
            CODE_ARTEFACT_INCONSISTENT,
            "the exported preview mesh does not describe the exported STEP: " + "; ".join(problems),
            {"problems": problems},
            status=contract.STATUS_STALE,
        )
    return {"preview_mesh_sha256": actual_sha256}


def _verify_preview_descriptor(preview: Mapping[str, Any], facts: inspect_step.ShapeFacts, step_sha256: str, candidate_id: str) -> None:
    """Cross-check the preview descriptor against the exported STEP, too."""
    problems: list[str] = []
    if preview.get("candidate_id") != candidate_id:
        problems.append(f"preview.json belongs to candidate {preview.get('candidate_id')!r}, not {candidate_id!r}")
    if preview.get("step_sha256") != step_sha256:
        problems.append("preview.json does not bind the STEP file in this candidate directory")
    bounds = preview.get("bounds")
    if isinstance(bounds, Mapping) and isinstance(bounds.get("min"), list) and isinstance(bounds.get("max"), list):
        low, high = bounds["min"], bounds["max"]
        if len(low) == 3 and len(high) == 3:
            for axis in range(3):
                size_delta = abs((float(high[axis]) - float(low[axis])) - facts.size_xyz[axis])
                if size_delta > CROSS_CHECK_ABSOLUTE_TOLERANCE_MM:
                    problems.append(f"preview.json bounds differ from the STEP by {size_delta:.6f} mm on axis {axis}")
    if problems:
        raise RequestRefused(
            CODE_ARTEFACT_INCONSISTENT,
            "the exported preview does not describe the exported STEP: " + "; ".join(problems),
            {"problems": problems},
            status=contract.STATUS_STALE,
        )


def run_export(
    *,
    task: Mapping[str, Any],
    scene: Mapping[str, Any],
    report: Mapping[str, Any],
    run_id: str,
    candidate_id: str,
    candidate_dir: str | Path,
    export_dir: str | Path,
    evidence: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Verify the binding, then publish an immutable export bundle."""
    started = time.perf_counter()
    candidate = Path(candidate_dir)
    destination = Path(export_dir)
    if destination.exists():
        raise RequestRefused(
            "CANDIDATE_EXISTS",
            f"the export directory already exists and is never overwritten: {destination}",
        )
    # The caller owns the run layout; creating one missing level below an
    # existing directory keeps ``runs/<run>/exports/<candidate>`` usable without
    # letting the CLI invent a deep tree it was not told about.
    if not destination.parent.is_dir():
        try:
            destination.parent.mkdir(parents=False)
        except OSError as exc:
            raise ExecutionFailure(
                CODE_PERSISTENCE_FAILED,
                f"cannot create the parent of the export directory {destination.parent}: {exc}",
            ) from exc

    step_path = _require_file(candidate, "model.step")
    stl_path = _require_file(candidate, "model.stl")
    preview_path = _require_file(candidate, "preview.json")

    step_sha256 = contract.file_sha256(step_path)
    binding = contract.verify_report_binding(report, task=task, scene=scene, step_sha256=step_sha256)
    if not binding.ok:
        raise RequestRefused(
            "STALE_INPUT",
            "the report does not bind to the frozen inputs and the STEP artefact being exported",
            {"issues": [issue.to_dict() for issue in binding.issues]},
            status=contract.STATUS_STALE,
        )
    # Which code decided the report must be the code installed right now; a
    # missing or stale code identity stops the export before anything is copied.
    validator_sha256 = _require_current_validator(report)

    # Hash binding first: anything the build manifest registered and that has
    # since changed is a hash mismatch, before any deeper content verification.
    build_manifest_path = candidate / "build.json"
    if build_manifest_path.is_file():
        build_manifest = contract.load_json_file(build_manifest_path)
        for entry in build_manifest.get("files", []):
            path = candidate / entry["name"]
            if not path.is_file():
                raise ExecutionFailure(CODE_ARTEFACT_MISSING, f"candidate manifest lists a missing file: {entry['name']}")
            if contract.file_sha256(path) != entry["sha256"]:
                raise RequestRefused(
                    CODE_ARTEFACT_HASH_MISMATCH,
                    f"{entry['name']} changed after the build manifest was written",
                )

    shape = inspect_step.import_step(step_path)
    facts = inspect_step.measure_shape(shape)
    problems = _check_report_describes_artefact(report, facts)
    if problems:
        raise RequestRefused(
            "STALE_INPUT",
            "the report's measurements do not match the exported STEP; the report belongs to another artefact",
            {"problems": problems},
            status=contract.STATUS_STALE,
        )

    try:
        preview = contract.load_json_file(preview_path)
    except contract.JsonLoadError as exc:
        raise ExecutionFailure(CODE_ARTEFACT_INCONSISTENT, f"preview.json is not readable JSON: {exc}") from exc
    _verify_preview_descriptor(preview, facts, step_sha256, candidate_id)

    # The STL and the mesh are re-read and re-measured, not trusted: a bundle
    # must not be able to carry a report that says PASS next to a broken export.
    cross_stl = _verify_stl(stl_path, facts)

    mesh_path = candidate / "preview_mesh.json"
    recorded_mesh_sha256 = (report.get("hashes") or {}).get("preview_mesh_sha256")
    mesh_summary: dict[str, Any] | None = None
    if mesh_path.is_file():
        mesh_summary = _verify_preview_mesh(
            mesh_path,
            preview,
            facts,
            step_sha256=step_sha256,
            expected_mesh_sha256=recorded_mesh_sha256 if isinstance(recorded_mesh_sha256, str) else None,
        )
    elif isinstance(recorded_mesh_sha256, str) and recorded_mesh_sha256:
        raise RequestRefused(
            CODE_ARTEFACT_MISSING,
            "the report binds a preview mesh hash but the candidate has no preview_mesh.json",
            status=contract.STATUS_STALE,
        )
    if report.get("overall") == "PASS" and not isinstance(recorded_mesh_sha256, str):
        raise RequestRefused(
            "REPORT_NOT_MESH_BOUND",
            "a PASS report must bind the preview mesh it was decided on; this one carries no preview_mesh_sha256",
            status=contract.STATUS_STALE,
        )

    token = f"{os.getpid()}-{int(started * 1000) % 1000000}"
    tmp = destination.parent / f".tmp-export-{candidate_id}-{token}"
    if tmp.exists():  # pragma: no cover - token collision is practically impossible
        raise ExecutionFailure(CODE_PERSISTENCE_FAILED, f"temporary export directory already exists: {tmp}")
    tmp.mkdir()
    published = False
    try:
        files: list[dict[str, Any]] = []
        for name, required in EXPORT_FILES:
            source = candidate / name
            if not source.is_file():
                if required:
                    raise ExecutionFailure(CODE_ARTEFACT_MISSING, f"candidate directory has no {name}")
                continue
            shutil.copy2(source, tmp / name)
            files.append({"name": name, "bytes": source.stat().st_size, "sha256": contract.file_sha256(source), "source": "candidate"})

        report_path = tmp / "report.json"
        report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        files.append({"name": "report.json", "bytes": report_path.stat().st_size, "sha256": contract.file_sha256(report_path), "source": "request"})

        if evidence is not None:
            evidence_path = tmp / "evidence.json"
            evidence_path.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            files.append(
                {"name": "evidence.json", "bytes": evidence_path.stat().st_size, "sha256": contract.file_sha256(evidence_path), "source": "request"}
            )

        manifest = {
            "schema_version": contract.SCHEMA_VERSION,
            "export_id": f"{run_id}-{candidate_id}-export",
            "run_id": run_id,
            "candidate_id": candidate_id,
            "task_id": task["task_id"],
            "task_revision": int(task["revision"]),
            "report_id": report["report_id"],
            "report_overall": report["overall"],
            "exported_at": _timestamp(),
            "export_version": VERSION,
            "validator_version": report["validator_version"],
            "validator_code_sha256": validator_sha256,
            "generator_version": _manifest_generator_version(build_manifest_path),
            "kernels": _kernels(),
            "hashes": {
                **contract.frozen_fingerprint(task, scene),
                "step_sha256": step_sha256,
                "stl_sha256": contract.file_sha256(stl_path),
                "preview_sha256": contract.file_sha256(preview_path),
                "preview_mesh_sha256": contract.file_sha256(mesh_path) if mesh_path.is_file() else None,
                "validator_code_sha256": validator_sha256,
                "report_sha256": contract.content_sha256(report),
                "evidence_sha256": contract.content_sha256(evidence) if evidence is not None else None,
            },
            "cross_check": {
                "step_volume_mm3": round(facts.volume_mm3, 6),
                "step_size_mm": [round(value, 6) for value in facts.size_xyz],
                "report_measurements_agree": True,
                "validator_code_current": True,
                **cross_stl,
                **(mesh_summary or {}),
            },
            "files": files,
        }
        manifest_path = tmp / "export-manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")

        # Verify every copied byte before publishing.
        for entry in manifest["files"]:
            if contract.file_sha256(tmp / entry["name"]) != entry["sha256"]:
                raise ExecutionFailure(CODE_PERSISTENCE_FAILED, f"{entry['name']} changed while being exported")
        if contract.file_sha256(tmp / "model.step") != step_sha256:
            raise ExecutionFailure(CODE_PERSISTENCE_FAILED, "the exported STEP does not match the verified artefact")

        # Publish with the shared no-replace guard: a plain rename would replace
        # a target directory that is empty, e.g. one another export just created.
        try:
            publish_directory_noreplace(tmp, destination)
        except FileExistsError as exc:
            raise RequestRefused(
                "CANDIDATE_EXISTS",
                f"the export directory already exists and is never overwritten: {destination}",
            ) from exc
        published = True
        manifest["export_dir"] = str(destination)
        manifest["duration_ms"] = round((time.perf_counter() - started) * 1000.0, 3)
        return manifest
    finally:
        if not published and tmp.exists():
            shutil.rmtree(tmp, ignore_errors=True)


def _manifest_generator_version(build_manifest_path: Path) -> str | None:
    if not build_manifest_path.is_file():
        return None
    try:
        return contract.load_json_file(build_manifest_path).get("generator_version")
    except contract.JsonLoadError:  # pragma: no cover - the file is verified separately
        return None


def _kernels() -> dict[str, str]:
    from .build import cadquery_versions

    return cadquery_versions()


def _timestamp() -> str:
    import datetime as _dt

    return _dt.datetime.now(tz=_dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
