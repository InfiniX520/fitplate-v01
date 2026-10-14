"""Candidate generation (T03): a fixed parametric template plus atomic publish.

The generator is a *controlled template*, not a script runner: it takes the
frozen TaskSpec and one DesignSpec, builds the plate from primitives, cuts the
frozen base holes and the device holes derived from the submitted pose, and
writes the artefact set. There is no hook for executable code, expressions or
caller-chosen files: the only numbers that enter are the ones the contract
already validated.

Publishing is atomic and non-overwriting (plan section 10.3):

1. everything is written into ``<output_dir>/.tmp-<candidate_id>-<token>/``;
2. every file is re-read and hash-checked, and the STEP is re-imported and
   measured (a generator self-check, *not* acceptance evidence);
3. only then is the directory published to ``<output_dir>/<candidate_id>/``
   with :func:`fitplate.publish.publish_directory_noreplace` (``renameat2``
   ``RENAME_NOREPLACE``, flock fallback), so even a concurrently created empty
   target directory is refused instead of replaced;
4. if the target already exists the build is refused - a new candidate never
   overwrites an existing version, not even an empty one;
5. on any failure the temporary directory is removed and nothing is published.

The generator self-check hashes and re-measures the artefact it just wrote so a
broken template fails loudly here. Acceptance, however, is decided elsewhere:
``fitplate.constraints`` re-measures the artefact without the design document.
"""

from __future__ import annotations

import json
import os
import shutil
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

import cadquery as cq

from . import inspect_step, schema as contract
from .errors import (
    CODE_BUILD_FAILED,
    CODE_CANDIDATE_EXISTS,
    CODE_LIMIT_EXCEEDED,
    CODE_PERSISTENCE_FAILED,
    ExecutionFailure,
)
from .publish import publish_directory_noreplace

VERSION = "fitplate-generator/1.0.0"

#: Product-size caps (plan: control the size of what is published).
MAX_STEP_BYTES = 8 * 1024 * 1024
MAX_STL_BYTES = 8 * 1024 * 1024
MAX_PREVIEW_JSON_BYTES = 256 * 1024
MAX_MESH_JSON_BYTES = inspect_step.PREVIEW_BYTE_BUDGET

STL_TOLERANCE = 0.1
STL_ANGULAR_TOLERANCE = 0.3

CANDIDATE_FILES = (
    "model.step",
    "model.stl",
    "preview.json",
    "preview_mesh.json",
    "design.json",
    "task.json",
    "scene.json",
    "repro.py",
)

#: The manifest itself is written last and therefore cannot list its own hash.
MANIFEST_FILE = "build.json"

#: Wall-clock ceiling for one candidate build (plan: 30 s per CAD command).
BUILD_TIMEOUT_SECONDS = 30.0


def cadquery_versions() -> dict[str, str]:
    """Report the kernel versions that actually produced the artefact."""
    versions = {"cadquery": getattr(cq, "__version__", "unknown")}
    try:
        from OCP import __version__ as ocp_version  # type: ignore[attr-defined]

        versions["ocp"] = str(ocp_version)
    except Exception:  # pragma: no cover - version metadata is best-effort
        versions["ocp"] = "unknown"
    return versions


# --------------------------------------------------------------------------
# The template
# --------------------------------------------------------------------------


def sensor_hole_centers(task: Mapping[str, Any], design: Mapping[str, Any]) -> list[tuple[float, float]]:
    """Device hole centers = submitted device center + frozen hole offsets (rotation 0)."""
    center = design["sensor_pose"]["center"]
    cx, cy = float(center[0]), float(center[1])
    return [(cx + float(dx), cy + float(dy)) for dx, dy in task["sensor"]["hole_offsets"]]


def plate_dimensions(task: Mapping[str, Any], design: Mapping[str, Any]) -> dict[str, float]:
    """Locked dimensions come from the task; editable ones must be chosen in the design."""
    plate = task["plate"]
    chosen = design.get("plate", {})
    out: dict[str, float] = {}
    for dim in ("width", "height", "thickness"):
        if dim in plate["locked"]:
            out[dim] = float(plate[dim])
        else:
            out[dim] = float(chosen[dim])
    return out


def build_plate_solid(task: Mapping[str, Any], design: Mapping[str, Any]) -> cq.Shape:
    """Build the single plate solid: box minus frozen base holes minus device holes.

    All holes start below the plate and run past its top face, so every hole in
    this template is a true through hole; the cutting cylinders are far longer
    than the plate on both sides on purpose.
    """
    dims = plate_dimensions(task, design)
    width, height, thickness = dims["width"], dims["height"], dims["thickness"]
    plate = cq.Solid.makeBox(width, height, thickness, cq.Vector(0, 0, 0))

    base_radius = float(task["base_holes"]["diameter"]) / 2.0
    overcut = max(thickness * 4.0, 20.0)
    z_start = -overcut / 2.0
    for x, y in task["base_holes"]["centers"]:
        plate = plate.cut(
            cq.Solid.makeCylinder(base_radius, overcut, cq.Vector(float(x), float(y), z_start), cq.Vector(0, 0, 1))
        )

    sensor_radius = float(task["sensor"]["hole_diameter"]) / 2.0
    for x, y in sensor_hole_centers(task, design):
        plate = plate.cut(
            cq.Solid.makeCylinder(sensor_radius, overcut, cq.Vector(x, y, z_start), cq.Vector(0, 0, 1))
        )
    return plate


# --------------------------------------------------------------------------
# Repro script (fixed template, parameters come from the JSON files)
# --------------------------------------------------------------------------

REPRO_SCRIPT = '''#!/usr/bin/env python3
"""Re-generate this candidate from its frozen inputs and compare the result.

Fixed template: it contains no task-specific code - every number comes from
task.json / scene.json / design.json in this directory. It rebuilds the plate
and compares the *measured* facts with the self-check recorded in build.json.

Run with:  PYTHONPATH=<repo>/geometry python repro.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from fitplate import build as build_module
from fitplate import inspect_step
from fitplate import schema as contract

here = Path(__file__).resolve().parent
task = contract.load_json_file(here / "task.json")
scene = contract.load_json_file(here / "scene.json")
design = contract.load_json_file(here / "design.json")
recorded = contract.load_json_file(here / "build.json")["self_check"]

shape = build_module.build_plate_solid(task, design)
facts = inspect_step.measure_shape(shape)
holes = inspect_step.extract_holes(
    shape,
    plate_z_range=(facts.bbox_min[2], facts.bbox_max[2]),
    eps=float(task["tolerances"]["geometry_epsilon_mm"]),
    volume_eps=float(task["tolerances"]["interference_volume_epsilon_mm3"]),
)
measured = {
    "volume_mm3": round(facts.volume_mm3, 3),
    "size": [round(value, 4) for value in facts.size_xyz],
    "hole_count": len(holes),
    "through_holes": sum(1 for hole in holes if hole.is_through),
}
matches = (
    abs(measured["volume_mm3"] - recorded["volume_mm3"]) <= 0.01
    and measured["hole_count"] == recorded["hole_count"]
    and measured["through_holes"] == recorded["through_holes"]
)
print(json.dumps({"reproduced": matches, "measured": measured, "recorded": recorded}, sort_keys=True))
sys.exit(0 if matches else 1)
'''


# --------------------------------------------------------------------------
# Build request handling
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class BuildPaths:
    output_dir: Path
    candidate_id: str

    @property
    def target(self) -> Path:
        return self.output_dir / self.candidate_id

    def temporary(self, token: str) -> Path:
        return self.output_dir / f".tmp-{self.candidate_id}-{token}"


def _check_sizes(tmp: Path) -> dict[str, int]:
    caps = {
        "model.step": MAX_STEP_BYTES,
        "model.stl": MAX_STL_BYTES,
        "preview.json": MAX_PREVIEW_JSON_BYTES,
        "preview_mesh.json": MAX_MESH_JSON_BYTES,
    }
    sizes: dict[str, int] = {}
    for name, cap in caps.items():
        path = tmp / name
        if not path.is_file():
            raise ExecutionFailure(CODE_PERSISTENCE_FAILED, f"the build did not produce {name}")
        size = path.stat().st_size
        if size <= 0:
            raise ExecutionFailure(CODE_PERSISTENCE_FAILED, f"{name} is empty")
        if size > cap:
            raise ExecutionFailure(
                CODE_LIMIT_EXCEEDED,
                f"{name} is {size} bytes, over the {cap} byte cap for a single candidate artefact",
                {"file": name, "bytes": size, "cap": cap},
            )
        sizes[name] = size
    return sizes


def run_build(
    *,
    task: Mapping[str, Any],
    scene: Mapping[str, Any],
    design: Mapping[str, Any],
    run_id: str,
    candidate_id: str,
    output_dir: str | Path,
) -> dict[str, Any]:
    """Run the template, publish the candidate atomically, and report the facts."""
    started = time.perf_counter()
    paths = BuildPaths(output_dir=Path(output_dir), candidate_id=candidate_id)
    if not paths.output_dir.is_dir():
        raise ExecutionFailure(CODE_PERSISTENCE_FAILED, f"output directory does not exist: {paths.output_dir}")
    if paths.target.exists():
        raise ExecutionFailure(
            CODE_CANDIDATE_EXISTS,
            f"candidate directory already exists and is never overwritten: {paths.target}",
        )

    token = f"{os.getpid()}-{int(started * 1000) % 1000000}"
    tmp = paths.temporary(token)
    if tmp.exists():  # pragma: no cover - token collision is practically impossible
        raise ExecutionFailure(CODE_PERSISTENCE_FAILED, f"temporary directory already exists: {tmp}")
    tmp.mkdir()
    published = False
    try:
        result = _write_candidate(tmp, task, scene, design, run_id, candidate_id, started)
        # The exists() check above is only a fast path; publishing itself must
        # refuse atomically, because a plain rename would replace a target
        # directory that is empty (e.g. one created by a concurrent build).
        try:
            publish_directory_noreplace(tmp, paths.target)
        except FileExistsError as exc:
            raise ExecutionFailure(
                CODE_CANDIDATE_EXISTS,
                f"candidate directory already exists and is never overwritten: {paths.target}",
            ) from exc
        published = True
        result["candidate_dir"] = str(paths.target)
        result["duration_ms"] = round((time.perf_counter() - started) * 1000.0, 3)
        return result
    finally:
        if not published and tmp.exists():
            shutil.rmtree(tmp, ignore_errors=True)


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    text = json.dumps(payload, indent=2, sort_keys=True, allow_nan=False)
    path.write_text(text + "\n", encoding="utf-8")


def _write_candidate(
    tmp: Path,
    task: Mapping[str, Any],
    scene: Mapping[str, Any],
    design: Mapping[str, Any],
    run_id: str,
    candidate_id: str,
    started: float,
) -> dict[str, Any]:
    step_path = tmp / "model.step"
    stl_path = tmp / "model.stl"

    try:
        shape = build_plate_solid(task, design)
    except Exception as exc:  # the template itself failed - report, publish nothing
        raise ExecutionFailure(CODE_BUILD_FAILED, f"the plate template failed: {type(exc).__name__}: {exc}") from exc
    try:
        cq.exporters.export(shape, str(step_path))
        cq.exporters.export(shape, str(stl_path), tolerance=STL_TOLERANCE, angularTolerance=STL_ANGULAR_TOLERANCE)
    except Exception as exc:
        raise ExecutionFailure(CODE_BUILD_FAILED, f"exporting the artefact failed: {type(exc).__name__}: {exc}") from exc

    # Preview: re-import the file that was just written and tessellate *that*
    # entity, so the mesh always belongs to the published STEP.
    imported = inspect_step.import_step(step_path)
    step_sha256 = contract.file_sha256(step_path)
    facts = inspect_step.measure_shape(imported)

    # ---- generator self-check (NOT acceptance evidence) -------------------
    # Measured before the preview is meshed: every measurement in this project
    # is geometry-based and mesh-independent, but keeping the order explicit
    # makes that independence visible in the code as well.
    holes = inspect_step.extract_holes(
        imported,
        plate_z_range=(facts.bbox_min[2], facts.bbox_max[2]),
        eps=float(task["tolerances"]["geometry_epsilon_mm"]),
        volume_eps=float(task["tolerances"]["interference_volume_epsilon_mm3"]),
    )
    expected_holes = len(task["base_holes"]["centers"]) + len(task["sensor"]["hole_offsets"])
    self_check = {
        "note": "generator self-check on the file it just wrote; acceptance is decided by fitplate.constraints",
        "volume_mm3": round(facts.volume_mm3, 3),
        "hole_count": len(holes),
        "through_holes": sum(1 for hole in holes if hole.is_through),
        "size_mm": [round(value, 4) for value in facts.size_xyz],
        "reimport_valid": facts.valid,
        "single_solid": facts.is_single_connected_solid,
    }
    if (
        not facts.valid
        or not facts.is_single_connected_solid
        or len(holes) != expected_holes
        or self_check["through_holes"] != expected_holes
    ):
        raise ExecutionFailure(
            CODE_BUILD_FAILED,
            (
                "the generator self-check failed on the artefact it just wrote "
                f"(holes {len(holes)}/{expected_holes}, through {self_check['through_holes']}, "
                f"valid={facts.valid}, single_solid={facts.is_single_connected_solid})"
            ),
            self_check,
        )

    mesh = inspect_step.tessellate_budgeted(
        imported,
        prefix={
            "schema_version": contract.SCHEMA_VERSION,
            "candidate_id": candidate_id,
            "step_sha256": step_sha256,
        },
    )
    mesh_payload = {
        "schema_version": contract.SCHEMA_VERSION,
        "candidate_id": candidate_id,
        "step_sha256": step_sha256,
        "tolerance_mm": mesh.tolerance,
        "angular_tolerance_rad": mesh.angular_tolerance,
        "vertices": list(mesh.vertices),
        "indices": list(mesh.indices),
        "bounds": {"min": list(mesh.bounds_min), "max": list(mesh.bounds_max)},
    }
    _write_json(tmp / "preview_mesh.json", mesh_payload)

    preview = {
        "schema_version": contract.SCHEMA_VERSION,
        "candidate_id": candidate_id,
        "step_sha256": step_sha256,
        "triangles": mesh.triangle_count,
        "bounds": {"min": list(mesh.bounds_min), "max": list(mesh.bounds_max)},
        "objects": [{"id": "plate", "triangles": mesh.triangle_count}],
    }
    _write_json(tmp / "preview.json", preview)
    _write_json(tmp / "design.json", design)
    _write_json(tmp / "task.json", task)
    _write_json(tmp / "scene.json", scene)
    (tmp / "repro.py").write_text(REPRO_SCRIPT, encoding="utf-8")

    sizes = _check_sizes(tmp)
    files = []
    for name in CANDIDATE_FILES:
        path = tmp / name
        if not path.is_file():
            raise ExecutionFailure(CODE_PERSISTENCE_FAILED, f"missing artefact {name}")
        files.append({"name": name, "bytes": path.stat().st_size, "sha256": contract.file_sha256(path)})

    hashes = {entry["name"]: entry["sha256"] for entry in files}
    manifest = {
        "schema_version": contract.SCHEMA_VERSION,
        "run_id": run_id,
        "candidate_id": candidate_id,
        "task_id": task["task_id"],
        "task_revision": int(task["revision"]),
        "generator_version": VERSION,
        "kernels": cadquery_versions(),
        "created_at": _timestamp(),
        "generation_ms": round((time.perf_counter() - started) * 1000.0, 3),
        "hashes": {
            **contract.frozen_fingerprint(task, scene),
            "design_sha256": hashes["design.json"],
            "step_sha256": hashes["model.step"],
            "stl_sha256": hashes["model.stl"],
            "preview_sha256": hashes["preview.json"],
            "preview_mesh_sha256": hashes["preview_mesh.json"],
        },
        "files": files,
        "sizes": sizes,
        "design_summary": {
            "plate": plate_dimensions(task, design),
            "sensor_center_xy": [float(value) for value in design["sensor_pose"]["center"]],
            "sensor_rotation_deg": float(design["sensor_pose"]["rotation_deg"]),
            "sensor_hole_centers_xy": [list(point) for point in sensor_hole_centers(task, design)],
        },
        "self_check": self_check,
    }
    _write_json(tmp / MANIFEST_FILE, manifest)

    # Re-read everything that was written: the hashes in the manifest must be
    # reproducible from the bytes on disk before the directory is published.
    for entry in manifest["files"]:
        digest = contract.file_sha256(tmp / entry["name"])
        if digest != entry["sha256"]:
            raise ExecutionFailure(
                CODE_PERSISTENCE_FAILED,
                f"artefact {entry['name']} changed between writing and verification",
            )
    if not (tmp / MANIFEST_FILE).is_file():
        raise ExecutionFailure(CODE_PERSISTENCE_FAILED, f"missing artefact {MANIFEST_FILE}")
    if contract.file_sha256(step_path) != manifest["hashes"]["step_sha256"]:  # pragma: no cover - guarded above
        raise ExecutionFailure(CODE_PERSISTENCE_FAILED, "STEP hash mismatch before publish")
    if preview["step_sha256"] != manifest["hashes"]["step_sha256"]:
        raise ExecutionFailure(CODE_PERSISTENCE_FAILED, "preview does not bind the STEP that was written")

    return {
        "manifest": manifest,
        "step_sha256": manifest["hashes"]["step_sha256"],
        "stl_sha256": manifest["hashes"]["stl_sha256"],
        "preview_triangles": mesh.triangle_count,
        "preview_mesh_bytes": mesh.payload_bytes,
        "self_check": self_check,
    }


def _timestamp() -> str:
    import datetime as _dt

    return _dt.datetime.now(tz=_dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
