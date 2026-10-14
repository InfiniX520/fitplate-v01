#!/usr/bin/env python3
"""Verify a FitPlate candidate or export bundle, from the outside.

Usage:

    PYTHONPATH=geometry .venv/bin/python scripts/verify-bundle.py <directory> [--json]

``<directory>`` is either

* a candidate directory (``.../candidates/v001``) with ``build.json``, or
* an export directory (``.../exports/v001``) with ``export-manifest.json``.

The verifier deliberately does not trust the manifests it reads. It re-hashes
every listed file with :mod:`hashlib`, parses the STL with its **own**
standard-library reader (no CadQuery, so the mesh check shares no code with the
kernel that wrote the file), re-reads ``preview_mesh.json`` with its own
structural/volume checks, recomputes the canonical validator-code hash that the
report must carry, re-imports the STEP through OCCT and re-measures it, and only
then compares the numbers with what the manifest and the report claim.

Exit code 0 means every check passed; 1 means at least one check failed or the
bundle could not be verified. ``--json`` prints the machine-readable result.

This script is a verification aid, not a replacement for the acceptance run in
``fitplate.constraints``: it re-checks a *bundle's internal consistency*, it
does not re-decide G01-G08 against the frozen task. ``scripts/verify-cad.py``
re-runs the acceptance decision itself.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import struct
import sys
from pathlib import Path
from typing import Any

CHUNK = 1 << 16
STL_VOLUME_RELATIVE_BUDGET = 0.005
STL_VOLUME_ABSOLUTE_BUDGET_MM3 = 0.5

#: The modules whose bytes decide a report (same hash algorithm as the plugin
#: bridge and ``fitplate.identity``: per-file SHA-256 over a sorted compact JSON
#: mapping, hashed again).
VALIDATOR_MODULES = ("fitplate/constraints.py", "fitplate/inspect_step.py", "fitplate/scene.py")
GEOMETRY_ROOT = Path(__file__).resolve().parents[1] / "geometry"
#: Bounds on the tessellation tolerance a preview mesh may declare.
MIN_PREVIEW_TOLERANCE_MM = 1e-4
MAX_PREVIEW_TOLERANCE_MM = 0.5
MAX_PREVIEW_ANGULAR_TOLERANCE_RAD = math.pi / 2
MESH_DEGENERATE_AREA_MM2 = 1e-12


class Report:
    """Collects checks so the exit code and the JSON output agree."""

    def __init__(self) -> None:
        self.checks: list[dict[str, Any]] = []

    def add(self, name: str, ok: bool, detail: Any = None) -> bool:
        self.checks.append({"check": name, "ok": bool(ok), "detail": detail})
        return bool(ok)

    def note(self, name: str, detail: Any) -> None:
        self.checks.append({"check": name, "ok": True, "detail": detail, "note": True})

    @property
    def ok(self) -> bool:
        return all(entry["ok"] for entry in self.checks)

    def failures(self) -> list[dict[str, Any]]:
        return [entry for entry in self.checks if not entry["ok"]]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(CHUNK), b""):
            digest.update(chunk)
    return digest.hexdigest()


def with_quiet_stdout(operation):
    """Run ``operation`` with file descriptor 1 pointed at stderr.

    OCCT reports parser errors on the C++ stdout, which would corrupt this
    script's ``--json`` output exactly when a bundle is broken - the case the
    verifier exists for. Diagnostics stay visible on stderr.
    """
    sys.stdout.flush()
    saved = os.dup(1)
    try:
        os.dup2(2, 1)
        try:
            return operation()
        finally:
            os.dup2(saved, 1)
    finally:
        os.close(saved)


# --------------------------------------------------------------------------
# Standard-library STL reader (independent of the CAD kernel)
# --------------------------------------------------------------------------


def read_stl(path: Path) -> dict[str, Any]:
    data = path.read_bytes()
    if len(data) < 84:
        raise ValueError(f"{path}: too small to be an STL file")
    declared = struct.unpack("<I", data[80:84])[0]
    if 84 + 50 * declared != len(data):
        if data[:5] != b"solid":
            raise ValueError(
                f"{path}: binary STL header declares {declared} triangles ({84 + 50 * declared} bytes) "
                f"but the file is {len(data)} bytes"
            )
        triangles = _read_ascii_stl(data)
        if not triangles:
            raise ValueError(f"{path}: ASCII STL contains no triangles")
    else:
        triangles = []
        for index in range(declared):
            values = struct.unpack("<12fH", data[84 + 50 * index : 84 + 50 * index + 50])
            triangles.append(((values[3], values[4], values[5]), (values[6], values[7], values[8]), (values[9], values[10], values[11])))

    edges: dict[Any, int] = {}
    volume = 0.0
    lows = [math.inf] * 3
    highs = [-math.inf] * 3
    for v1, v2, v3 in triangles:
        for vertex in (v1, v2, v3):
            for axis in range(3):
                lows[axis] = min(lows[axis], vertex[axis])
                highs[axis] = max(highs[axis], vertex[axis])
        volume += (
            v1[0] * (v2[1] * v3[2] - v2[2] * v3[1])
            - v1[1] * (v2[0] * v3[2] - v2[2] * v3[0])
            + v1[2] * (v2[0] * v3[1] - v2[1] * v3[0])
        ) / 6.0
        for a, b in ((v1, v2), (v2, v3), (v3, v1)):
            key = (tuple(round(c, 6) for c in a), tuple(round(c, 6) for c in b))
            key = (key[0], key[1]) if key[0] <= key[1] else (key[1], key[0])
            edges[key] = edges.get(key, 0) + 1
    return {
        "triangles": len(triangles),
        "volume_mm3": volume,
        "bounds_min": lows,
        "bounds_max": highs,
        "boundary_edges": sum(1 for count in edges.values() if count == 1),
        "non_manifold_edges": sum(1 for count in edges.values() if count > 2),
        "closed": all(count == 2 for count in edges.values()) and bool(triangles),
    }


def _read_ascii_stl(data: bytes) -> list[Any]:
    triangles = []
    current: list[Any] = []
    for line in data.decode("ascii", errors="strict").splitlines():
        stripped = line.strip()
        if not stripped.startswith("vertex"):
            continue
        parts = stripped.split()
        if len(parts) != 4:
            raise ValueError(f"malformed ASCII STL vertex line: {stripped!r}")
        current.append(tuple(float(value) for value in parts[1:]))
        if len(current) == 3:
            triangles.append(tuple(current))
            current = []
    if current:
        raise ValueError("truncated ASCII STL: file ends mid-facet")
    return triangles


def validator_code_sha256(geometry_root: Path = GEOMETRY_ROOT) -> str:
    """Canonical validator-code hash, recomputed without importing the package."""
    parts: dict[str, str] = {}
    for relative in VALIDATOR_MODULES:
        path = geometry_root / relative
        if not path.is_file():
            raise FileNotFoundError(f"validator module is missing: {path}")
        parts[relative] = sha256_file(path)
    blob = json.dumps(parts, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


def analyze_mesh(mesh: Any) -> tuple[list[str], dict[str, Any] | None]:
    """Structural facts of a ``preview_mesh.json`` payload, standard library only.

    Returns ``(problems, facts)``; ``facts`` carries the bounds and the enclosed
    volume computed from the triangles themselves, so the caller can compare
    them with the re-measured STEP even when a structural problem was found.
    """
    problems: list[str] = []
    if not isinstance(mesh, dict):
        return ["the mesh document is not a JSON object"], None
    vertices = mesh.get("vertices")
    indices = mesh.get("indices")
    if not isinstance(vertices, list) or not isinstance(indices, list):
        return ["vertices/indices must both be arrays"], None
    if len(vertices) % 3 != 0 or len(vertices) < 9:
        return ["the vertex array is not a non-empty multiple of 3"], None
    if len(indices) % 3 != 0 or len(indices) < 3:
        return ["the index array is not a non-empty multiple of 3"], None
    points: list[tuple[float, float, float]] = []
    for offset in range(0, len(vertices), 3):
        triple = vertices[offset : offset + 3]
        if any(isinstance(value, bool) or not isinstance(value, (int, float)) for value in triple):
            return [f"vertex {offset // 3} is not three numbers"], None
        point = (float(triple[0]), float(triple[1]), float(triple[2]))
        if any(not math.isfinite(component) for component in point):
            return [f"vertex {offset // 3} is not finite"], None
        points.append(point)
    vertex_count = len(points)
    for position, value in enumerate(indices):
        if isinstance(value, bool) or not isinstance(value, int) or not (0 <= value < vertex_count):
            return [f"index {position} = {value!r} is not an index into {vertex_count} vertices"], None

    lows = [min(point[axis] for point in points) for axis in range(3)]
    highs = [max(point[axis] for point in points) for axis in range(3)]
    volume = 0.0
    degenerate = 0
    for offset in range(0, len(indices), 3):
        a, b, c = points[indices[offset]], points[indices[offset + 1]], points[indices[offset + 2]]
        volume += (
            a[0] * (b[1] * c[2] - b[2] * c[1])
            - a[1] * (b[0] * c[2] - b[2] * c[0])
            + a[2] * (b[0] * c[1] - b[1] * c[0])
        ) / 6.0
        ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
        vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
        nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
        if len({a, b, c}) < 3 or 0.5 * math.sqrt(nx * nx + ny * ny + nz * nz) <= MESH_DEGENERATE_AREA_MM2:
            degenerate += 1
    if degenerate:
        problems.append(f"{degenerate} triangles have zero area")

    tolerance = mesh.get("tolerance_mm")
    angular = mesh.get("angular_tolerance_rad")
    for label, value, low, high in (
        ("tolerance_mm", tolerance, MIN_PREVIEW_TOLERANCE_MM, MAX_PREVIEW_TOLERANCE_MM),
        ("angular_tolerance_rad", angular, 0.0, MAX_PREVIEW_ANGULAR_TOLERANCE_RAD),
    ):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(float(value)):
            problems.append(f"the mesh declares no finite {label}")
        elif not (low < float(value) <= high):
            problems.append(f"declared {label}={value} is outside ({low}, {high}]")

    declared_bounds = mesh.get("bounds")
    facts = {
        "triangles": len(indices) // 3,
        "vertices": vertex_count,
        "volume_mm3": volume,
        "bounds_min": lows,
        "bounds_max": highs,
        "degenerate_triangles": degenerate,
    }
    if not isinstance(declared_bounds, dict):
        problems.append("the mesh carries no bounds object")
    else:
        for label, declared, measured in (
            ("min", declared_bounds.get("min"), lows),
            ("max", declared_bounds.get("max"), highs),
        ):
            if (
                not isinstance(declared, list)
                or len(declared) != 3
                or any(isinstance(value, bool) or not isinstance(value, (int, float)) for value in declared)
            ):
                problems.append(f"the declared bounds {label} is not a numeric triple")
                continue
            for axis in range(3):
                if abs(float(declared[axis]) - measured[axis]) > 1e-6:
                    problems.append(f"the declared bounds {label} does not match the shipped vertices on axis {axis}")
    return problems, facts


# --------------------------------------------------------------------------
# Bundle verification
# --------------------------------------------------------------------------


def verify(directory: Path) -> Report:
    report = Report()
    manifest_path = None
    manifest_kind = None
    for name, kind in (("export-manifest.json", "export"), ("build.json", "build")):
        candidate = directory / name
        if candidate.is_file():
            manifest_path = candidate
            manifest_kind = kind
            break
    if manifest_path is None:
        report.add("manifest-present", False, f"no build.json or export-manifest.json in {directory}")
        return report
    report.add("manifest-present", True, {"file": manifest_path.name, "kind": manifest_kind})

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        report.add("manifest-parses", False, str(exc))
        return report
    report.add("manifest-parses", True, {"schema_version": manifest.get("schema_version")})

    # 0. the code identity: recomputed here, not read from the bundle
    try:
        current_validator = validator_code_sha256()
    except OSError as exc:
        current_validator = None
        report.add("validator-code-hash", False, str(exc))
    else:
        report.note("validator-code-hash", current_validator)
        if manifest_kind == "export":
            report.add(
                "manifest-validator-hash",
                manifest.get("hashes", {}).get("validator_code_sha256") == current_validator
                or manifest.get("validator_code_sha256") == current_validator,
                {
                    "declared": manifest.get("hashes", {}).get("validator_code_sha256"),
                    "current": current_validator,
                },
            )

    # 1. every listed file exists and hashes as recorded
    listed: set[str] = set()
    for entry in manifest.get("files", []):
        name = entry.get("name", "")
        listed.add(name)
        path = directory / name
        if not path.is_file():
            report.add(f"file:{name}", False, "listed in the manifest but missing")
            continue
        digest = sha256_file(path)
        size_ok = path.stat().st_size == entry.get("bytes", path.stat().st_size)
        report.add(
            f"file:{name}",
            digest == entry.get("sha256") and size_ok,
            {"sha256": digest, "declared": entry.get("sha256"), "bytes": path.stat().st_size},
        )

    extra = sorted(path.name for path in directory.iterdir() if path.is_file() and path.name not in listed and path.name != manifest_path.name)
    if extra:
        report.note("extra-files", extra)

    # 2. identity binding: the artefacts must agree on which STEP they describe
    step_path = directory / "model.step"
    stl_path = directory / "model.stl"
    if not step_path.is_file():
        report.add("step-present", False, "model.step is missing")
        return report
    step_sha256 = sha256_file(step_path)
    report.add("step-present", True, {"step_sha256": step_sha256})
    if manifest_kind == "build":
        report.add("manifest-step-hash", manifest.get("hashes", {}).get("step_sha256") == step_sha256)
    else:
        report.add("manifest-step-hash", manifest.get("hashes", {}).get("step_sha256") == step_sha256)

    preview_path = directory / "preview.json"
    mesh_facts: dict[str, Any] | None = None
    mesh_sha256: str | None = None
    if preview_path.is_file():
        preview = json.loads(preview_path.read_text(encoding="utf-8"))
        report.add("preview-step-hash", preview.get("step_sha256") == step_sha256, {"declared": preview.get("step_sha256")})
        mesh_path = directory / "preview_mesh.json"
        if mesh_path.is_file():
            mesh_sha256 = sha256_file(mesh_path)
            mesh = json.loads(mesh_path.read_text(encoding="utf-8"))
            report.add(
                "preview-mesh-binding",
                mesh.get("step_sha256") == step_sha256 and mesh.get("candidate_id") == preview.get("candidate_id"),
                {"step_sha256": mesh.get("step_sha256"), "candidate_id": mesh.get("candidate_id")},
            )
            problems, mesh_facts = analyze_mesh(mesh)
            report.add("preview-mesh-structure", not problems, {"problems": problems, **(mesh_facts or {})})
            report.add(
                "preview-mesh-triangles",
                mesh_facts is not None and mesh_facts["triangles"] == preview.get("triangles"),
                {"mesh": (mesh_facts or {}).get("triangles"), "preview": preview.get("triangles")},
            )
        else:
            # A preview without its real mesh cannot be verified at all.
            report.add("preview-mesh-present", False, "preview.json exists but preview_mesh.json is missing")
    else:
        report.add("preview-present", False, "preview.json is missing")

    # 3. STEP re-import and measurement (needs the CAD environment)
    step_facts = None

    def _import_and_measure():
        sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "geometry"))
        from fitplate import inspect_step  # imported here so the stdlib checks work without CadQuery

        loaded = inspect_step.import_step(step_path)
        return inspect_step.measure_shape(loaded)

    try:
        facts = with_quiet_stdout(_import_and_measure)
        step_facts = facts
        report.add(
            "step-reimport",
            facts.valid and facts.is_single_connected_solid,
            facts.as_measured(),
        )
        report.add("step-supported-features", facts.supported_feature_set, {"face_geom_types": facts.face_geom_types})
    except ImportError as exc:  # pragma: no cover - only when run without the venv
        report.note("step-reimport", f"skipped: the geometry package is not importable ({exc})")
    except Exception as exc:
        report.add("step-reimport", False, f"{type(exc).__name__}: {exc}")

    # 3b. the preview mesh against the re-measured STEP (stdlib facts above)
    if mesh_facts is not None and step_facts is not None:
        step_volume = step_facts.volume_mm3
        volume_budget = max(STL_VOLUME_RELATIVE_BUDGET * abs(step_volume), STL_VOLUME_ABSOLUTE_BUDGET_MM3)
        volume_delta = abs(mesh_facts["volume_mm3"] - step_volume)
        report.add(
            "preview-mesh-volume-matches-step",
            volume_delta <= volume_budget,
            {"mesh": mesh_facts["volume_mm3"], "step": step_volume, "delta": volume_delta, "budget": volume_budget},
        )
        bounds_delta = max(
            abs(mesh_facts["bounds_min"][axis] - step_facts.bbox_min[axis]) for axis in range(3)
        )
        bounds_delta = max(
            bounds_delta,
            max(abs(mesh_facts["bounds_max"][axis] - step_facts.bbox_max[axis]) for axis in range(3)),
        )
        report.add(
            "preview-mesh-bounds-match-step",
            bounds_delta <= 0.05,
            {"delta_mm": bounds_delta},
        )

    # 4. STL parsed with this script's own reader
    if stl_path.is_file():
        try:
            stl = read_stl(stl_path)
        except (ValueError, struct.error) as exc:
            report.add("stl-parse", False, str(exc))
            stl = None
        else:
            report.add("stl-closed", stl["closed"], {"boundary_edges": stl["boundary_edges"], "non_manifold_edges": stl["non_manifold_edges"]})
            if step_facts is not None:
                delta = abs(stl["volume_mm3"] - step_facts.volume_mm3)
                budget = max(STL_VOLUME_RELATIVE_BUDGET * abs(step_facts.volume_mm3), STL_VOLUME_ABSOLUTE_BUDGET_MM3)
                report.add(
                    "stl-volume-matches-step",
                    delta <= budget,
                    {"stl": stl["volume_mm3"], "step": step_facts.volume_mm3, "delta": delta, "budget": budget},
                )
                size_deltas = [
                    abs((stl["bounds_max"][axis] - stl["bounds_min"][axis]) - step_facts.size_xyz[axis]) for axis in range(3)
                ]
                report.add("stl-bounds-match-step", max(size_deltas) <= 0.05, {"deltas_mm": size_deltas})
    else:
        report.add("stl-present", False, "model.stl is missing")

    # 5. report consistency (when the bundle carries one)
    report_path = directory / "report.json"
    if report_path.is_file():
        document = json.loads(report_path.read_text(encoding="utf-8"))
        statuses = [check["status"] for check in document.get("checks", [])]
        clean = len(statuses) == 8 and all(status == "PASS" for status in statuses) and not document.get("errors")
        overall = document.get("overall")
        report.add("report-overall-consistent", (overall == "PASS") == clean, {"overall": overall, "statuses": statuses})
        report.add("report-step-hash", document.get("hashes", {}).get("step_sha256") == step_sha256)
        hashes = document.get("hashes", {})
        if current_validator is not None:
            report.add(
                "report-validator-hash",
                hashes.get("validator_code_sha256") == current_validator,
                {"declared": hashes.get("validator_code_sha256"), "current": current_validator},
            )
        if mesh_sha256 is not None and isinstance(hashes.get("preview_mesh_sha256"), str):
            report.add(
                "report-mesh-hash",
                hashes.get("preview_mesh_sha256") == mesh_sha256,
                {"declared": hashes.get("preview_mesh_sha256"), "actual": mesh_sha256},
            )
        if step_facts is not None:
            g01 = next((check for check in document.get("checks", []) if check["id"] == "G01"), None)
            measured_volume = (g01 or {}).get("measured", {}).get("volume_mm3")
            if isinstance(measured_volume, (int, float)):
                delta = abs(float(measured_volume) - step_facts.volume_mm3)
                report.add(
                    "report-volume-matches-step",
                    delta <= max(1e-3 * abs(step_facts.volume_mm3), 1e-3),
                    {"report": measured_volume, "measured": step_facts.volume_mm3, "delta": delta},
                )
            else:
                report.add("report-volume-matches-step", False, "the report carries no measured volume")
    else:
        report.note("report", "no report.json in this bundle")

    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify a FitPlate candidate or export bundle.")
    parser.add_argument("directory", type=Path, help="candidate or export directory to verify")
    parser.add_argument("--json", action="store_true", help="print the machine-readable result")
    arguments = parser.parse_args(argv)

    if not arguments.directory.is_dir():
        print(f"not a directory: {arguments.directory}", file=sys.stderr)
        return 1
    report = verify(arguments.directory)
    payload = {
        "directory": str(arguments.directory),
        "ok": report.ok,
        "failures": report.failures(),
        "checks": report.checks,
    }
    if arguments.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        for entry in report.checks:
            marker = "note" if entry.get("note") else ("ok  " if entry["ok"] else "FAIL")
            print(f"[{marker}] {entry['check']}: {json.dumps(entry['detail'], sort_keys=True)}")
        print("VERIFIED" if report.ok else "NOT VERIFIED")
    return 0 if report.ok else 1


if __name__ == "__main__":
    sys.exit(main())
