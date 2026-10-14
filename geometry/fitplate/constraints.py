"""Acceptance checks G01-G08 (T04/T05): decide from the re-measured artefact.

Inputs are the **frozen TaskSpec + scene** and the **actual STEP file** (plus the
exported STL and preview for G08). A DesignSpec is deliberately not accepted
here: the device pose used for the assembly check is derived from the holes
measured in the solid, so a candidate cannot pass by claiming a pose the part
does not have.

Status vocabulary (report.schema.json):

``PASS``
    Measured, and inside every requirement with margin.
``FAIL``
    Measured, and a requirement is violated by more than the geometry epsilon.
``BORDERLINE``
    Measured, but the margin is inside the numeric uncertainty band
    (``geometry_epsilon_mm``). Never widened into a PASS.
``UNKNOWN``
    Not measurable (unreadable artefact, unresolved ambiguity, a check it
    depends on did not pass). Never treated as a PASS.

Each check carries a flat ``measured``/``required`` summary (the contract's
scalar vocabulary) and a ``reason_code`` whenever it is not PASS. The full
feature-level evidence is returned separately for the caller to persist as an
evidence file; it is not stuffed into the report.
"""

from __future__ import annotations

import datetime as _datetime
import itertools
import math
import time
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

import cadquery as cq

from . import identity
from . import inspect_step
from . import scene as scene_mod
from . import schema as contract
from .errors import CODE_PERSISTENCE_FAILED, CODE_STL_TRUNCATED, ExecutionFailure
from .inspect_step import (
    MESH_PROBLEM_DEGENERATE,
    MESH_PROBLEM_MALFORMED,
    MESH_PROBLEM_TOLERANCE_MISSING,
    MESH_PROBLEM_TOLERANCE_OUT_OF_RANGE,
    HoleFacts,
    ShapeFacts,
    analyze_preview_mesh,
    extract_holes,
    import_step,
    measure_holes_at_section,
    measure_shape,
    parse_stl,
    tessellate_budgeted,
    triangle_key_set,
)

VERSION = "fitplate-validator/1.0.0"

STATUS_PASS = "PASS"
STATUS_FAIL = "FAIL"
STATUS_UNKNOWN = "UNKNOWN"
STATUS_BORDERLINE = "BORDERLINE"

_STATUS_SEVERITY = {STATUS_PASS: 0, STATUS_UNKNOWN: 1, STATUS_BORDERLINE: 2, STATUS_FAIL: 3}

#: Relative budget for the STL-vs-STEP volume comparison. The STL is a
#: polyhedral approximation of the same solid, so its volume differs from the
#: BREP volume by a tessellation-dependent amount; this is stated as an explicit
#: precision budget, not a silently widened tolerance.
STL_VOLUME_RELATIVE_BUDGET = 0.005
STL_VOLUME_ABSOLUTE_BUDGET_MM3 = 0.5

#: Upper bound on distinct base-hole matchings enumerated before the result is
#: declared ambiguous (fail closed: an unresolvable identity question is UNKNOWN).
MAX_MATCHINGS = 64

#: Budget for the two-way difference between the actual solid and the geometry
#: rebuilt from the measured facts (rectangular stock minus the measured
#: holes). Boolean operations on the exact BREP agree to well below this; an
#: unauthorised notch, pocket, chamfer or boss is orders of magnitude larger.
PLATE_DIFFERENCE_RELATIVE_BUDGET = 1e-6

#: Ceiling on the triangles a re-tessellation may produce while verifying a
#: declared mesh; over it the mesh is UNKNOWN ("cannot be verified within a
#: bounded effort"), never PASS.
PREVIEW_RECOMPUTE_TRIANGLE_BUDGET = 400_000
PREVIEW_RECOMPUTE_BYTE_BUDGET = 64 * 1024 * 1024

#: Preview-mesh problems mapped to report vocabulary (plan section 9.5: an
#: unresolvable question is UNKNOWN, a measurable violation is FAIL).
_MESH_PROBLEM_RESULTS: dict[str, tuple[str, str]] = {
    MESH_PROBLEM_MALFORMED: (STATUS_FAIL, "PREVIEW_MESH_MALFORMED"),
    MESH_PROBLEM_DEGENERATE: (STATUS_FAIL, "PREVIEW_MESH_DEGENERATE_TRIANGLE"),
    MESH_PROBLEM_TOLERANCE_MISSING: (STATUS_UNKNOWN, "PREVIEW_MESH_TOLERANCE_MISSING"),
    MESH_PROBLEM_TOLERANCE_OUT_OF_RANGE: (STATUS_FAIL, "PREVIEW_MESH_TOLERANCE_OUT_OF_RANGE"),
}

# --------------------------------------------------------------------------
# Tolerances and comparison helpers
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Tolerances:
    """The three distinct numeric quantities from the plan (section 9.5)."""

    dimensional: float
    epsilon: float
    volume_epsilon: float

    @property
    def band(self) -> float:
        """Half-width of the uncertainty band around a threshold."""
        return self.epsilon

    @classmethod
    def from_task(cls, task: Mapping[str, Any]) -> "Tolerances":
        tol = task["tolerances"]
        return cls(
            dimensional=float(tol["dimensional_tolerance_mm"]),
            epsilon=float(tol["geometry_epsilon_mm"]),
            volume_epsilon=float(tol["interference_volume_epsilon_mm3"]),
        )


def worst_status(statuses: Iterable[str]) -> str:
    """The most severe status, used to grade a group of sub-results."""
    worst = STATUS_PASS
    for status in statuses:
        if _STATUS_SEVERITY.get(status, 3) > _STATUS_SEVERITY[worst]:
            worst = status
    return worst


def compare_value(measured: float, target: float, tol: float, band: float) -> tuple[str, float]:
    """Compare a measured value with a nominal one inside a dimensional tolerance."""
    deviation = abs(measured - target)
    if deviation <= max(tol - band, 0.0):
        return STATUS_PASS, deviation
    if deviation <= tol + band:
        return STATUS_BORDERLINE, deviation
    return STATUS_FAIL, deviation


def compare_minimum(measured: float, minimum: float, band: float) -> str:
    """``measured >= minimum`` with an uncertainty band around the threshold."""
    if measured >= minimum + band:
        return STATUS_PASS
    if measured >= minimum - band:
        return STATUS_BORDERLINE
    return STATUS_FAIL


def compare_maximum(measured: float, maximum: float, band: float) -> str:
    """``measured <= maximum`` with an uncertainty band around the threshold."""
    if measured <= maximum - band:
        return STATUS_PASS
    if measured <= maximum + band:
        return STATUS_BORDERLINE
    return STATUS_FAIL


def compare_within_range(measured: float, low: float, high: float, band: float) -> str:
    """Domain membership (editable plate dimensions, allowed device center).

    Membership of a *domain* is different from a requirement threshold: any
    value inside the closed interval is legal, including a value exactly on the
    boundary (a task may legitimately freeze a single-point domain). Only a
    value outside the interval is judged, and the band then decides whether the
    overshoot is a measurable violation or an unresolved borderline.
    """
    if low <= measured <= high:
        return STATUS_PASS
    if low - band <= measured <= high + band:
        return STATUS_BORDERLINE
    return STATUS_FAIL


# --------------------------------------------------------------------------
# Ligament geometry (measured circles against measured plate edges)
# --------------------------------------------------------------------------


def edge_ligament(center_xy: Sequence[float], radius: float, width: float, height: float) -> float:
    """Shortest material distance from a hole wall to the plate outline."""
    x, y = float(center_xy[0]), float(center_xy[1])
    return min(x - radius, width - x - radius, y - radius, height - y - radius)


def pair_ligament(first: HoleFacts | "_MeasuredCircle", second: HoleFacts | "_MeasuredCircle") -> float:
    """Shortest material distance between two hole walls (negative when they overlap)."""
    if isinstance(first, HoleFacts) and isinstance(second, HoleFacts):
        (x1, y1), r1 = first.axis_xy, first.radius
        (x2, y2), r2 = second.axis_xy, second.radius
    else:
        (x1, y1), r1 = first.center_xy, first.radius  # type: ignore[union-attr]
        (x2, y2), r2 = second.center_xy, second.radius  # type: ignore[union-attr]
    return math.hypot(x1 - x2, y1 - y2) - r1 - r2


@dataclass(frozen=True)
class _MeasuredCircle:
    center_xy: tuple[float, float]
    radius: float
    label: str


# --------------------------------------------------------------------------
# One-to-one matching of frozen base holes to measured holes
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class BaseMatch:
    """Result of matching the frozen base-hole set against the measured holes."""

    matched: tuple[tuple[int, int], ...]  # (frozen index, measured index)
    unmatched_frozen: tuple[int, ...]
    unmatched_measured: tuple[int, ...]
    distinct_remainders: int
    ambiguous: bool
    matchings_enumerated: int
    worst_deviation_mm: float
    nearest_miss_mm: float | None

    @property
    def complete(self) -> bool:
        return not self.unmatched_frozen


def _unmatched_frozen_indices(candidates: Sequence[Sequence[int]]) -> list[int]:
    """Which frozen holes a maximum one-to-one assignment leaves uncovered (Kuhn's algorithm)."""
    covered_measured: dict[int, int] = {}

    def try_assign(frozen_index: int, visited: set[int]) -> bool:
        for measured_index in candidates[frozen_index]:
            if measured_index in visited:
                continue
            visited.add(measured_index)
            if measured_index not in covered_measured or try_assign(covered_measured[measured_index], visited):
                covered_measured[measured_index] = frozen_index
                return True
        return False

    for frozen_index in range(len(candidates)):
        try_assign(frozen_index, set())
    covered_frozen = set(covered_measured.values())
    return [index for index in range(len(candidates)) if index not in covered_frozen]


def _hole_matches(hole: HoleFacts, center: Sequence[float], radius: float, tol: float) -> bool:
    return (
        math.hypot(hole.axis_xy[0] - center[0], hole.axis_xy[1] - center[1]) <= tol
        and abs(hole.radius - radius) <= tol
    )


def match_base_holes(
    measured: Sequence[HoleFacts],
    frozen_centers: Sequence[Sequence[float]],
    frozen_radius: float,
    tol: float,
) -> BaseMatch:
    """Match every frozen base hole to a distinct measured hole.

    Enumerates the possible one-to-one assignments (bounded by
    :data:`MAX_MATCHINGS`). When several assignments leave *different* sets of
    leftover holes, the identity of the sensor hole group is not determined and
    the result is flagged ambiguous instead of picking one arbitrarily.
    """
    candidates: list[list[int]] = []
    for center in frozen_centers:
        options = [index for index, hole in enumerate(measured) if _hole_matches(hole, center, frozen_radius, tol)]
        candidates.append(options)

    matchings: list[tuple[int, ...]] = []
    used: set[int] = set()

    def walk(position: int, current: list[int]) -> None:
        if len(matchings) > MAX_MATCHINGS:
            return
        if position == len(candidates):
            matchings.append(tuple(current))
            return
        for index in candidates[position]:
            if index in used:
                continue
            used.add(index)
            current.append(index)
            walk(position + 1, current)
            current.pop()
            used.discard(index)

    walk(0, [])

    remainders = {
        frozenset(range(len(measured))) - frozenset(matching) for matching in matchings
    } if matchings else set()

    unmatched_frozen: list[int] = []
    worst_deviation = 0.0
    nearest_miss: float | None = None
    if matchings:
        best = matchings[0]
        for frozen_index, measured_index in enumerate(best):
            hole = measured[measured_index]
            center = frozen_centers[frozen_index]
            deviation = math.hypot(hole.axis_xy[0] - center[0], hole.axis_xy[1] - center[1])
            worst_deviation = max(worst_deviation, deviation)
    else:
        # No full assignment exists. Report which frozen holes a maximum
        # matching could not cover, and how close the nearest measured hole
        # came - this is the evidence a human needs to locate the defect.
        unmatched_frozen = sorted(_unmatched_frozen_indices(candidates))
        for frozen_index in unmatched_frozen:
            center = frozen_centers[frozen_index]
            if measured:
                closest = min(
                    math.hypot(hole.axis_xy[0] - center[0], hole.axis_xy[1] - center[1]) for hole in measured
                )
                nearest_miss = closest if nearest_miss is None else min(nearest_miss, closest)
    matching_tuple = matchings[0] if matchings else tuple()
    unmatched_measured = tuple(sorted(set(range(len(measured))) - set(matching_tuple)))
    return BaseMatch(
        matched=tuple((index, value) for index, value in enumerate(matching_tuple)),
        unmatched_frozen=tuple(unmatched_frozen),
        unmatched_measured=unmatched_measured,
        distinct_remainders=len(remainders) if matchings else 0,
        ambiguous=len(remainders) > 1,
        matchings_enumerated=len(matchings),
        worst_deviation_mm=worst_deviation,
        nearest_miss_mm=nearest_miss,
    )


# --------------------------------------------------------------------------
# Device pose derived from the measured sensor hole group
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class PoseSolution:
    """Candidate translations that make the measured holes equal the frozen offsets."""

    center_xy: tuple[float, float]
    worst_deviation_mm: float

    def as_dict(self) -> dict[str, Any]:
        return {
            "center_xy": [round(self.center_xy[0], 6), round(self.center_xy[1], 6)],
            "worst_deviation_mm": round(self.worst_deviation_mm, 6),
        }


def derive_sensor_pose(
    holes: Sequence[HoleFacts],
    offsets: Sequence[Sequence[float]],
    tol: float,
) -> tuple[list[PoseSolution], str | None]:
    """Find every translation that maps the frozen offsets onto the measured holes.

    Returns ``(solutions, reason_code)``. Enumerating *all* consistent
    translations is what makes "unique pose" checkable: a symmetric pattern or
    a duplicated hole position yields several legal poses, and the caller must
    report UNKNOWN rather than pick one.
    """
    if len(holes) != len(offsets):
        return [], "SENSOR_HOLE_COUNT_MISMATCH"
    if not holes:
        return [], "SENSOR_HOLE_COUNT_MISMATCH"

    offset_points = [(float(item[0]), float(item[1])) for item in offsets]
    measured_points = [(hole.axis_xy[0], hole.axis_xy[1]) for hole in holes]
    solutions: list[PoseSolution] = []
    seen: list[tuple[float, float]] = []

    # A consistent translation must be (measured_i - offset_j) for some pair;
    # anchoring on the first measured hole enumerates every possibility.
    for anchor in offset_points:
        tx = measured_points[0][0] - anchor[0]
        ty = measured_points[0][1] - anchor[1]
        predicted = [(tx + point[0], ty + point[1]) for point in offset_points]
        if not _points_match_as_set(measured_points, predicted, tol):
            continue
        worst = max(
            min(math.hypot(point[0] - pred[0], point[1] - pred[1]) for pred in predicted)
            for point in measured_points
        )
        if any(math.hypot(tx - seen_x, ty - seen_y) <= tol for seen_x, seen_y in seen):
            # The same translation reached through a different anchoring: it is
            # one pose, not a second one.
            continue
        seen.append((tx, ty))
        solutions.append(PoseSolution(center_xy=(tx, ty), worst_deviation_mm=worst))
    if not solutions:
        return [], "SENSOR_HOLE_PATTERN_MISMATCH"
    return solutions, None


def _points_match_as_set(
    left: Sequence[tuple[float, float]],
    right: Sequence[tuple[float, float]],
    tol: float,
) -> bool:
    """Greedy multiset comparison of point clouds within ``tol``."""
    remaining = list(right)
    for point in left:
        best_index = None
        best_distance = None
        for index, candidate in enumerate(remaining):
            distance = math.hypot(point[0] - candidate[0], point[1] - candidate[1])
            if best_distance is None or distance < best_distance:
                best_distance = distance
                best_index = index
        if best_distance is None or best_distance > tol:
            return False
        assert best_index is not None
        remaining.pop(best_index)
    return not remaining


# --------------------------------------------------------------------------
# Assembly free-space measurement (G06)
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class PairMeasurement:
    """One moving/fixed body pair, measured on actual solids."""

    moving_id: str
    fixed_id: str
    intersection_volume_mm3: float
    distance_mm: float
    allowed_support: bool
    required_clearance_mm: float | None
    status: str
    reason_code: str | None

    def as_dict(self) -> dict[str, Any]:
        return {
            "moving": self.moving_id,
            "fixed": self.fixed_id,
            "intersection_volume_mm3": round(self.intersection_volume_mm3, 9),
            "distance_mm": round(self.distance_mm, 6),
            "allowed_support": self.allowed_support,
            "required_clearance_mm": self.required_clearance_mm,
            "status": self.status,
            "reason_code": self.reason_code,
        }


def measure_pair(
    moving_id: str,
    moving: cq.Shape,
    fixed_id: str,
    fixed: cq.Shape,
    *,
    tolerances: Tolerances,
    clearance_mm: float,
    allowed_support: bool,
) -> PairMeasurement:
    """Measure intersection volume and minimum distance of two actual solids.

    Bounding boxes are never used as the verdict: they may pre-filter obviously
    distant pairs, but a pair that survives the filter is decided by a real
    boolean intersection and a real shape-to-shape distance.
    """
    intersection_volume = float(moving.intersect(fixed).Volume())
    distance = float(moving.distance(fixed))
    if intersection_volume > tolerances.volume_epsilon:
        status = STATUS_FAIL
        reason = "SOLID_INTERFERENCE"
    elif allowed_support:
        # An explicitly declared support contact may touch (distance 0) but may
        # never penetrate, and the parts must actually be seated: a floating
        # device is not a supported device.
        if abs(distance) <= tolerances.epsilon:
            status = STATUS_PASS
            reason = None
        elif distance <= tolerances.epsilon * 10.0:
            status = STATUS_BORDERLINE
            reason = "SUPPORT_CONTACT_GAP"
        else:
            status = STATUS_FAIL
            reason = "SUPPORT_CONTACT_MISSING"
    else:
        status = compare_minimum(distance, clearance_mm, tolerances.band)
        reason = None if status == STATUS_PASS else "CLEARANCE_VIOLATION"
    return PairMeasurement(
        moving_id=moving_id,
        fixed_id=fixed_id,
        intersection_volume_mm3=intersection_volume,
        distance_mm=distance,
        allowed_support=allowed_support,
        required_clearance_mm=None if allowed_support else clearance_mm,
        status=status,
        reason_code=reason,
    )


# --------------------------------------------------------------------------
# Report plumbing
# --------------------------------------------------------------------------


def make_check(
    check_id: str,
    status: str,
    *,
    objects: Sequence[str] = (),
    measured: Mapping[str, Any] | None = None,
    required: Mapping[str, Any] | None = None,
    reason_code: str | None = None,
    note: str | None = None,
    evidence_ref: str | None = None,
) -> dict[str, Any]:
    """Build one report check in the shape report.schema.json requires."""
    check: dict[str, Any] = {
        "id": check_id,
        "status": status,
        "objects": list(objects),
        "measured": dict(measured or {}),
        "required": dict(required or {}),
    }
    if status != STATUS_PASS:
        if not reason_code:
            raise ValueError(f"check {check_id}: a non-PASS result must carry a reason code")
        check["reason_code"] = reason_code
    if note:
        check["note"] = note[:512]
    if evidence_ref:
        check["evidence_ref"] = evidence_ref
    return check


def _unknown(check_id: str, reason_code: str, note: str, objects: Sequence[str] = ()) -> dict[str, Any]:
    return make_check(check_id, STATUS_UNKNOWN, objects=objects, measured={}, required={}, reason_code=reason_code, note=note)


# --------------------------------------------------------------------------
# Evaluation inputs / outputs
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class ValidationInputs:
    task: Mapping[str, Any]
    scene: Mapping[str, Any]
    run_id: str
    candidate_id: str
    step_path: Path
    stl_path: Path | None = None
    preview_path: Path | None = None


@dataclass
class ValidationOutcome:
    report: dict[str, Any]
    evidence: dict[str, Any]


def _timestamp() -> str:
    return (
        _datetime.datetime.now(tz=_datetime.timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _overall(statuses: Sequence[str]) -> str:
    if all(status == STATUS_PASS for status in statuses):
        return STATUS_PASS
    if STATUS_FAIL in statuses:
        return STATUS_FAIL
    if STATUS_BORDERLINE in statuses:
        return STATUS_BORDERLINE
    return STATUS_UNKNOWN


def evaluate(inputs: ValidationInputs, *, started_at: float | None = None) -> ValidationOutcome:
    """Run G01-G08 against the artefact and return (report, evidence)."""
    started = started_at if started_at is not None else time.perf_counter()
    task = inputs.task
    scene_doc = inputs.scene
    tolerances = Tolerances.from_task(task)
    checks: list[dict[str, Any]] = []
    evidence: dict[str, Any] = {
        "schema_version": contract.SCHEMA_VERSION,
        "run_id": inputs.run_id,
        "candidate_id": inputs.candidate_id,
        "validator_version": VERSION,
        "step_path": str(inputs.step_path),
        "tolerances": {
            "dimensional_tolerance_mm": tolerances.dimensional,
            "geometry_epsilon_mm": tolerances.epsilon,
            "interference_volume_epsilon_mm3": tolerances.volume_epsilon,
        },
    }
    scene_model = scene_mod.SceneModel.from_scene(scene_doc)
    requirements = task["requirements"]

    # ---- read the artefact ------------------------------------------------
    try:
        shape = import_step(inputs.step_path)
    except ExecutionFailure as failure:
        checks.extend(_read_failure_checks(failure))
        report = _finish_report(inputs, checks, [], started)
        evidence["step_read_failure"] = failure.to_dict()
        # Keep the evidence file's shape stable even when nothing could be measured.
        evidence["holes"] = []
        evidence["pairs"] = []
        return ValidationOutcome(report=report, evidence=evidence)

    facts = measure_shape(shape)
    evidence["shape"] = facts.as_measured()
    evidence["face_geom_types"] = dict(facts.face_geom_types)

    # ---- hole recognition -------------------------------------------------
    # Holes are measured before G01 because G01 rebuilds the *allowed* geometry
    # (rectangular stock minus the measured holes) and compares it with the
    # actual solid: a plate with an unauthorised notch keeps its rectangle
    # bounding box and its hole count, so only that reconstruction sees it.
    holes = extract_holes(
        shape,
        plate_z_range=(facts.bbox_min[2], facts.bbox_max[2]),
        eps=tolerances.epsilon,
        volume_eps=tolerances.volume_epsilon,
    )
    evidence["holes"] = [hole.as_dict() for hole in holes]

    # ---- G01 solid validity ----------------------------------------------
    checks.append(_check_g01(facts, shape, holes, tolerances))

    # ---- G02 plate size and pose -----------------------------------------
    checks.append(_check_g02(facts, task, tolerances))

    # ---- G03 frozen base holes -------------------------------------------
    frozen_centers = task["base_holes"]["centers"]
    base_radius = float(task["base_holes"]["diameter"]) / 2.0
    match = match_base_holes(holes, frozen_centers, base_radius, tolerances.dimensional)
    base_holes = [holes[index] for _, index in match.matched]
    evidence["base_hole_matching"] = {
        "matched_pairs": [[frozen_index, measured_index] for frozen_index, measured_index in match.matched],
        "unmatched_frozen": list(match.unmatched_frozen),
        "unmatched_measured": list(match.unmatched_measured),
        "distinct_remainders": match.distinct_remainders,
        "matchings_enumerated": match.matchings_enumerated,
        "worst_deviation_mm": round(match.worst_deviation_mm, 6),
        "nearest_miss_mm": None if match.nearest_miss_mm is None else round(match.nearest_miss_mm, 6),
    }
    g03 = _check_g03(match, base_holes, task, tolerances)
    checks.append(g03)

    # ---- G04 sensor hole group -------------------------------------------
    sensor_holes = [holes[index] for index in match.unmatched_measured]
    g04, pose, pose_status, pose_reason = _check_g04(sensor_holes, match, task, tolerances)
    checks.append(g04)
    evidence["sensor_group"] = {
        "candidate_holes": [hole.as_dict() for hole in sensor_holes],
        "derived_pose": None if pose is None else pose.as_dict(),
        "pose_status": pose_status,
        "pose_reason": pose_reason,
    }

    # ---- G05 ligaments ----------------------------------------------------
    checks.append(_check_g05(base_holes, sensor_holes, facts, task, tolerances, match))

    # ---- G06 assembly free space -----------------------------------------
    g06, pairs = _check_g06(
        task=task,
        scene_model=scene_model,
        plate=shape,
        plate_top_z=facts.bbox_max[2],
        pose=pose,
        pose_status=pose_status,
        pose_reason=pose_reason,
        tolerances=tolerances,
        requirements=requirements,
        g04_status=g04["status"],
    )
    checks.append(g06)
    evidence["pairs"] = [pair.as_dict() for pair in pairs]

    # ---- G07 frozen conditions -------------------------------------------
    checks.append(_check_g07(shape, facts, scene_doc, task, base_radius, tolerances, match))

    # ---- G08 export consistency ------------------------------------------
    g08, export_evidence = _check_g08(inputs, facts, shape, tolerances)
    checks.append(g08)
    evidence["export"] = export_evidence

    report = _finish_report(inputs, checks, [], started)
    return ValidationOutcome(report=report, evidence=evidence)


def _read_failure_checks(failure: ExecutionFailure) -> list[dict[str, Any]]:
    """Every check is UNKNOWN when the artefact cannot be read - never PASS."""
    note = f"artefact could not be read: {failure.code}"
    checks = [_unknown("G01", failure.code, note)]
    for check_id in ("G02", "G03", "G04", "G05", "G06", "G07", "G08"):
        checks.append(_unknown(check_id, "UPSTREAM_ARTEFACT_UNREADABLE", note))
    return checks


def _finish_report(
    inputs: ValidationInputs,
    checks: Sequence[Mapping[str, Any]],
    errors: Sequence[Mapping[str, Any]],
    started: float,
) -> dict[str, Any]:
    statuses = [check["status"] for check in checks]
    duration_ms = max(0.0, (time.perf_counter() - started) * 1000.0)
    report: dict[str, Any] = {
        "schema_version": contract.SCHEMA_VERSION,
        "report_id": f"{inputs.run_id}-{inputs.candidate_id}",
        "run_id": inputs.run_id,
        "task_id": inputs.task["task_id"],
        "task_revision": int(inputs.task["revision"]),
        "candidate_id": inputs.candidate_id,
        "overall": _overall(statuses),
        "created_at": _timestamp(),
        "validator_version": VERSION,
        "hashes": {
            "step_sha256": _safe_file_hash(inputs.step_path),
            "task_sha256": contract.content_sha256(inputs.task),
            "scene_sha256": contract.content_sha256(inputs.scene),
            # Which *code* decided this report: the same three-module canonical
            # hash the plugin bridge computes, so an export can refuse a report
            # whose implementation is not the one currently installed.
            "validator_code_sha256": _validator_code_hash(),
        },
        "duration_ms": round(duration_ms, 3),
        "errors": list(errors),
        "checks": list(checks),
    }
    if inputs.stl_path is not None:
        digest = _safe_file_hash(inputs.stl_path)
        if digest is not None:
            report["hashes"]["stl_sha256"] = digest
    if inputs.preview_path is not None:
        mesh_path = Path(inputs.preview_path).parent / "preview_mesh.json"
        try:
            if mesh_path.is_file():
                report["hashes"]["preview_mesh_sha256"] = contract.file_sha256(mesh_path)
        except OSError:  # pragma: no cover - unreadable mesh is already a non-PASS G08
            pass
    return report


def _validator_code_hash() -> str:
    """The canonical code hash of this validator, as an installation must have it."""
    try:
        return identity.validator_code_sha256()
    except OSError as exc:
        raise ExecutionFailure(
            CODE_PERSISTENCE_FAILED,
            f"the validator code hash cannot be computed, so no report can bind to real code: {exc}",
        ) from exc


def _safe_file_hash(path: Path | None) -> str:
    """Raw-byte SHA-256 of an artefact, or a defined placeholder when unreadable."""
    if path is None:
        return UNMEASURED_PLACEHOLDER
    try:
        return contract.file_sha256(path)
    except OSError:
        return UNMEASURED_PLACEHOLDER


#: The report schema demands a 64-hex digest; an unreadable file is recorded as
#: all zeroes *together with* a non-PASS check and a recorded error, so it can
#: never be mistaken for a real binding.
UNMEASURED_PLACEHOLDER = "0" * 64


# --------------------------------------------------------------------------
# G01 - G08
# --------------------------------------------------------------------------


def _check_g01(
    facts: ShapeFacts,
    shape: cq.Shape,
    holes: Sequence[HoleFacts],
    tolerances: Tolerances,
) -> dict[str, Any]:
    objects = ["plate"]
    measured = facts.as_measured()
    required = {
        "valid": True,
        "single_connected_solid": True,
        "positive_volume": True,
        "supported_features_only": True,
        "solid_equals_stock_minus_measured_holes": True,
    }
    if not facts.valid:
        return make_check("G01", STATUS_FAIL, objects=objects, measured=measured, required=required, reason_code="SOLID_INVALID")
    if facts.solid_count == 0:
        return make_check("G01", STATUS_FAIL, objects=objects, measured=measured, required=required, reason_code="NO_SOLID")
    if facts.solid_count > 1 or facts.free_shape_count > 0 or facts.shell_count != facts.solid_count:
        return make_check(
            "G01",
            STATUS_FAIL,
            objects=objects,
            measured=measured,
            required=required,
            reason_code="MULTIPLE_OR_FREE_BODIES",
            note="the artefact is not a single connected solid; extra or isolated bodies are refused",
        )
    if facts.volume_mm3 <= 0:
        return make_check("G01", STATUS_FAIL, objects=objects, measured=measured, required=required, reason_code="NON_POSITIVE_VOLUME")
    if not facts.supported_feature_set:
        return make_check(
            "G01",
            STATUS_FAIL,
            objects=objects,
            measured=measured,
            required=required,
            reason_code="UNSUPPORTED_FEATURE",
            note=(
                "version 1.0 recognises rectangular plates with Z-axis circular holes only; "
                "unexpected face types or non-Z cylinders are refused rather than approximated"
            ),
        )

    reconstruction_status, reconstruction_reason, reconstruction = _check_plate_reconstruction(
        shape, facts, holes, tolerances
    )
    measured = {**measured, **reconstruction}
    if reconstruction_status == STATUS_PASS:
        return make_check("G01", STATUS_PASS, objects=objects, measured=measured, required=required)
    return make_check(
        "G01",
        reconstruction_status,
        objects=objects,
        measured=measured,
        required=required,
        reason_code=reconstruction_reason or "PLATE_GEOMETRY_MISMATCH",
        note=(
            "the solid is not the rectangular stock minus the holes measured in it; "
            "extra cuts, pockets, chamfers or added material are refused"
            if reconstruction_status == STATUS_FAIL
            else "the allowed geometry could not be reconstructed, so the outline is not verified"
        ),
    )


def _check_plate_reconstruction(
    shape: cq.Shape,
    facts: ShapeFacts,
    holes: Sequence[HoleFacts],
    tolerances: Tolerances,
) -> tuple[str, str | None, dict[str, Any]]:
    """Rebuild the allowed geometry from measured facts and compare it two-way.

    The allowed part is exactly *rectangular stock − through holes*: the stock
    is the measured bounding box (so an editable plate width stays legal - the
    task's own domain rule is applied by G02, not re-imposed here), and the
    holes are the cylinders *measured in the solid itself*. Nothing from the
    DesignSpec or from the generator is used - a template, a script or a
    different profile can therefore never be "verified" against itself.

    The comparison is a real two-way boolean difference: material the solid is
    missing relative to the allowed geometry, and material it carries beyond it.
    Either direction over the volume budget is a FAIL; a kernel failure to
    reconstruct is UNKNOWN, never PASS.
    """
    try:
        stock = cq.Solid.makeBox(
            facts.size_xyz[0],
            facts.size_xyz[1],
            facts.size_xyz[2],
            cq.Vector(*facts.bbox_min),
        )
        overcut = max(facts.size_xyz[2] * 4.0, 20.0)
        z_start = facts.bbox_min[2] - overcut / 2.0
        expected = stock
        for hole in holes:
            expected = expected.cut(
                cq.Solid.makeCylinder(
                    hole.radius,
                    facts.size_xyz[2] + overcut,
                    cq.Vector(hole.axis_xy[0], hole.axis_xy[1], z_start),
                    cq.Vector(0, 0, 1),
                )
            )
        expected_volume = float(expected.Volume())
        removed = float(expected.cut(shape).Volume())
        extra = float(shape.cut(expected).Volume())
    except Exception as exc:  # kernel refused the boolean reconstruction
        return (
            STATUS_UNKNOWN,
            "PLATE_RECONSTRUCTION_FAILED",
            {
                "reconstruction": "stock(bounding box) - measured holes",
                "holes_in_reconstruction": len(holes),
                "reconstruction_error": f"{type(exc).__name__}: {exc}"[:200],
            },
        )

    budget = max(tolerances.volume_epsilon, PLATE_DIFFERENCE_RELATIVE_BUDGET * abs(expected_volume))
    measured: dict[str, Any] = {
        "reconstruction_from_measured_facts": True,
        "holes_in_reconstruction": len(holes),
        "reconstructed_volume_mm3": round(expected_volume, 6),
        "missing_material_mm3": round(removed, 6),
        "unexpected_material_mm3": round(extra, 6),
        "reconstruction_budget_mm3": round(budget, 9),
    }
    if removed > budget:
        return STATUS_FAIL, "UNAUTHORIZED_MATERIAL_REMOVAL", measured
    if extra > budget:
        return STATUS_FAIL, "UNEXPECTED_EXTRA_MATERIAL", measured
    return STATUS_PASS, None, measured


def _check_g02(facts: ShapeFacts, task: Mapping[str, Any], tolerances: Tolerances) -> dict[str, Any]:
    plate = task["plate"]
    locked = set(plate["locked"])
    editable = plate["editable"]
    measured_values = {
        "width": facts.size_xyz[0],
        "height": facts.size_xyz[1],
        "thickness": facts.size_xyz[2],
    }
    measured: dict[str, Any] = {
        "width_mm": round(measured_values["width"], 6),
        "height_mm": round(measured_values["height"], 6),
        "thickness_mm": round(measured_values["thickness"], 6),
        "bbox_min_x_mm": round(facts.bbox_min[0], 6),
        "bbox_min_y_mm": round(facts.bbox_min[1], 6),
        "bbox_min_z_mm": round(facts.bbox_min[2], 6),
        "dimensional_tolerance_mm": tolerances.dimensional,
    }
    required: dict[str, Any] = {"origin_at_bbox_min": True}
    statuses: list[str] = []
    reasons: list[str] = []

    for axis, key in (("x", "bbox_min_x_mm"), ("y", "bbox_min_y_mm"), ("z", "bbox_min_z_mm")):
        status, _ = compare_value(measured[key], 0.0, tolerances.dimensional, tolerances.band)
        statuses.append(status)
        if status != STATUS_PASS:
            reasons.append(f"FRAME_ORIGIN_{axis.upper()}_OFFSET")

    for dim in ("width", "height", "thickness"):
        value = measured_values[dim]
        if dim in locked:
            target = float(plate[dim])
            required[f"{dim}_mm"] = target
            status, deviation = compare_value(value, target, tolerances.dimensional, tolerances.band)
            measured[f"{dim}_deviation_mm"] = round(deviation, 6)
        else:
            domain = editable[dim]
            low, high = float(domain["min"]), float(domain["max"])
            required[f"{dim}_domain_min_mm"] = low
            required[f"{dim}_domain_max_mm"] = high
            status = compare_within_range(value, low, high, tolerances.band)
            measured[f"{dim}_in_domain"] = status == STATUS_PASS
        statuses.append(status)
        if status != STATUS_PASS:
            reasons.append(f"{dim.upper()}_OUT_OF_SPEC")

    status = worst_status(statuses)
    if status == STATUS_PASS:
        return make_check("G02", STATUS_PASS, objects=["plate"], measured=measured, required=required)
    return make_check(
        "G02",
        status,
        objects=["plate"],
        measured=measured,
        required=required,
        reason_code=reasons[0] if reasons else "PLATE_SIZE_MISMATCH",
        note="; ".join(sorted(set(reasons))),
    )


def _check_g03(
    match: BaseMatch,
    base_holes: Sequence[HoleFacts],
    task: Mapping[str, Any],
    tolerances: Tolerances,
) -> dict[str, Any]:
    frozen = task["base_holes"]["centers"]
    required = {
        "base_hole_count": len(frozen),
        "base_hole_diameter_mm": float(task["base_holes"]["diameter"]),
        "through": True,
        "dimensional_tolerance_mm": tolerances.dimensional,
    }
    measured: dict[str, Any] = {
        "base_hole_count": len(base_holes),
        "worst_center_deviation_mm": round(match.worst_deviation_mm, 6),
    }
    objects = ["base_holes"]

    if match.ambiguous:
        measured["matchings_enumerated"] = match.matchings_enumerated
        measured["distinct_remainders"] = match.distinct_remainders
        return make_check(
            "G03",
            STATUS_UNKNOWN,
            objects=objects,
            measured=measured,
            required=required,
            reason_code="AMBIGUOUS_BASE_HOLE_MATCH",
            note="several measured holes could be the frozen base holes; the identity is not determined",
        )
    if not match.complete:
        measured["missing_or_misplaced"] = len(match.unmatched_frozen)
        if match.nearest_miss_mm is not None:
            measured["nearest_measured_distance_mm"] = round(match.nearest_miss_mm, 6)
        return make_check(
            "G03",
            STATUS_FAIL,
            objects=objects,
            measured=measured,
            required=required,
            reason_code="BASE_HOLE_MISSING_OR_DISPLACED",
            note="a frozen base hole has no measured counterpart within the dimensional tolerance",
        )

    statuses: list[str] = []
    reasons: list[str] = []
    diameters = [hole.diameter for hole in base_holes]
    if diameters:
        measured["min_measured_diameter_mm"] = round(min(diameters), 6)
        measured["max_measured_diameter_mm"] = round(max(diameters), 6)
    measured["non_through_holes"] = sum(1 for hole in base_holes if not hole.is_through)
    for hole in base_holes:
        if not hole.is_through:
            statuses.append(STATUS_FAIL)
            reasons.append(f"BASE_HOLE_{hole.defect or 'NOT_THROUGH'}")
    for hole, frozen_center in zip(base_holes, [frozen[index] for index, _ in match.matched]):
        status, deviation = compare_value(hole.axis_xy[0], frozen_center[0], tolerances.dimensional, tolerances.band)
        statuses.append(status)
        if status != STATUS_PASS:
            reasons.append("BASE_HOLE_X_DEVIATION")
        status, deviation = compare_value(hole.axis_xy[1], frozen_center[1], tolerances.dimensional, tolerances.band)
        statuses.append(status)
        if status != STATUS_PASS:
            reasons.append("BASE_HOLE_Y_DEVIATION")
        status, deviation = compare_value(
            hole.diameter, float(task["base_holes"]["diameter"]), tolerances.dimensional, tolerances.band
        )
        statuses.append(status)
        if status != STATUS_PASS:
            reasons.append("BASE_HOLE_DIAMETER")

    status = worst_status(statuses)
    if status == STATUS_PASS:
        return make_check("G03", STATUS_PASS, objects=objects, measured=measured, required=required)
    return make_check(
        "G03",
        status,
        objects=objects,
        measured=measured,
        required=required,
        reason_code=reasons[0] if reasons else "BASE_HOLE_MISMATCH",
        note="; ".join(sorted(set(reasons))),
    )


def _check_g04(
    sensor_holes: Sequence[HoleFacts],
    match: BaseMatch,
    task: Mapping[str, Any],
    tolerances: Tolerances,
) -> tuple[dict[str, Any], PoseSolution | None, str, str | None]:
    sensor = task["sensor"]
    offsets = sensor["hole_offsets"]
    diameter = float(sensor["hole_diameter"])
    required = {
        "hole_count": len(offsets),
        "hole_diameter_mm": diameter,
        "through": True,
        "allowed_center_x_min_mm": float(sensor["allowed_center_x"]["min"]),
        "allowed_center_x_max_mm": float(sensor["allowed_center_x"]["max"]),
        "allowed_center_y_min_mm": float(sensor["allowed_center_y"]["min"]),
        "allowed_center_y_max_mm": float(sensor["allowed_center_y"]["max"]),
        "rotation_deg": 0.0,
        "dimensional_tolerance_mm": tolerances.dimensional,
    }
    objects = ["sensor_holes", "sensor_body"]
    measured: dict[str, Any] = {"hole_count": len(sensor_holes)}
    if match.ambiguous:
        return (
            make_check(
                "G04",
                STATUS_UNKNOWN,
                objects=objects,
                measured=measured,
                required=required,
                reason_code="AMBIGUOUS_BASE_HOLE_MATCH",
                note="the sensor hole group cannot be identified while the base-hole match is ambiguous",
            ),
            None,
            STATUS_UNKNOWN,
            "AMBIGUOUS_BASE_HOLE_MATCH",
        )

    if len(sensor_holes) != len(offsets):
        measured["expected_hole_count"] = len(offsets)
        reason = "SENSOR_HOLE_MISSING" if len(sensor_holes) < len(offsets) else "SENSOR_HOLE_EXTRA"
        return (
            make_check(
                "G04",
                STATUS_FAIL,
                objects=objects,
                measured=measured,
                required=required,
                reason_code=reason,
                note=(
                    f"measured {len(sensor_holes)} hole(s) outside the frozen base holes, "
                    f"the frozen hole group has {len(offsets)}"
                ),
            ),
            None,
            STATUS_FAIL,
            reason,
        )

    statuses: list[str] = []
    reasons: list[str] = []
    for hole in sensor_holes:
        if not hole.is_through:
            statuses.append(STATUS_FAIL)
            reasons.append(f"SENSOR_HOLE_{hole.defect or 'NOT_THROUGH'}")
        status, _ = compare_value(hole.diameter, diameter, tolerances.dimensional, tolerances.band)
        statuses.append(status)
        if status != STATUS_PASS:
            reasons.append("SENSOR_HOLE_DIAMETER")
    diameters = [hole.diameter for hole in sensor_holes]
    if diameters:
        measured["min_measured_diameter_mm"] = round(min(diameters), 6)
        measured["max_measured_diameter_mm"] = round(max(diameters), 6)

    solutions, reason = derive_sensor_pose(sensor_holes, offsets, tolerances.dimensional)
    if not solutions:
        statuses.append(STATUS_FAIL)
        reasons.append(reason or "SENSOR_HOLE_PATTERN_MISMATCH")
        measured["pose_solutions"] = 0
        return (
            make_check(
                "G04",
                worst_status(statuses),
                objects=objects,
                measured=measured,
                required=required,
                reason_code=reasons[0],
                note="the measured hole group does not equal the frozen offsets under any single translation",
            ),
            None,
            STATUS_FAIL,
            reasons[0],
        )
    if len(solutions) > 1:
        measured["pose_solutions"] = len(solutions)
        return (
            make_check(
                "G04",
                STATUS_UNKNOWN,
                objects=objects,
                measured=measured,
                required=required,
                reason_code="AMBIGUOUS_SENSOR_POSE",
                note="more than one device position explains the measured holes; the pose is not unique",
            ),
            None,
            STATUS_UNKNOWN,
            "AMBIGUOUS_SENSOR_POSE",
        )

    pose = solutions[0]
    measured["pose_solutions"] = 1
    measured["derived_center_x_mm"] = round(pose.center_xy[0], 6)
    measured["derived_center_y_mm"] = round(pose.center_xy[1], 6)
    measured["worst_pattern_deviation_mm"] = round(pose.worst_deviation_mm, 6)
    allowed_x = sensor["allowed_center_x"]
    allowed_y = sensor["allowed_center_y"]
    status_x = compare_within_range(pose.center_xy[0], float(allowed_x["min"]), float(allowed_x["max"]), tolerances.band)
    status_y = compare_within_range(pose.center_xy[1], float(allowed_y["min"]), float(allowed_y["max"]), tolerances.band)
    statuses.append(status_x)
    statuses.append(status_y)
    if status_x != STATUS_PASS:
        reasons.append("POSE_X_OUTSIDE_ALLOWED_RANGE")
    if status_y != STATUS_PASS:
        reasons.append("POSE_Y_OUTSIDE_ALLOWED_RANGE")

    status = worst_status(statuses)
    if status == STATUS_PASS:
        return (
            make_check("G04", STATUS_PASS, objects=objects, measured=measured, required=required),
            pose,
            STATUS_PASS,
            None,
        )
    return (
        make_check(
            "G04",
            status,
            objects=objects,
            measured=measured,
            required=required,
            reason_code=reasons[0] if reasons else "SENSOR_HOLE_MISMATCH",
            note="; ".join(sorted(set(reasons))),
        ),
        pose if status == STATUS_BORDERLINE else None,
        status,
        reasons[0] if reasons else "SENSOR_HOLE_MISMATCH",
    )


def _check_g05(
    base_holes: Sequence[HoleFacts],
    sensor_holes: Sequence[HoleFacts],
    facts: ShapeFacts,
    task: Mapping[str, Any],
    tolerances: Tolerances,
    match: BaseMatch,
) -> dict[str, Any]:
    requirements = task["requirements"]
    required = {
        "minimum_edge_ligament_mm": float(requirements["minimum_edge_ligament"]),
        "minimum_hole_ligament_mm": float(requirements["minimum_hole_ligament"]),
        "extra_holes_allowed": False,
    }
    objects = ["base_holes", "sensor_holes", "plate"]
    holes = list(base_holes) + list(sensor_holes)
    measured: dict[str, Any] = {"holes_checked": len(holes)}
    if match.ambiguous:
        return make_check(
            "G05",
            STATUS_UNKNOWN,
            objects=objects,
            measured=measured,
            required=required,
            reason_code="AMBIGUOUS_BASE_HOLE_MATCH",
            note="which holes are base holes and which are sensor holes is not determined",
        )
    if not match.complete:
        return make_check(
            "G05",
            STATUS_UNKNOWN,
            objects=objects,
            measured=measured,
            required=required,
            reason_code="UPSTREAM_G03_NOT_MATCHED",
            note="the frozen base holes were not identified, so the hole inventory cannot be trusted",
        )
    if not holes:
        return make_check(
            "G05",
            STATUS_UNKNOWN,
            objects=objects,
            measured=measured,
            required=required,
            reason_code="NO_HOLES_IDENTIFIED",
            note="no hole could be identified in the artefact, so ligaments cannot be measured",
        )

    width, height = facts.size_xyz[0], facts.size_xyz[1]
    statuses: list[str] = []
    reasons: list[str] = []
    worst_edge = None
    worst_edge_label = None
    # Diagnostic measurements from the re-imported STEP, in the same verified
    # lower-left plate frame as the existing ligament check. These do not change
    # any acceptance threshold or status: they expose which boundary can move
    # when a rectangular plate's width/height changes.
    boundary_minima: dict[str, float] = {}
    for label, hole in [("base", hole) for hole in base_holes] + [("sensor", hole) for hole in sensor_holes]:
        x, y = hole.axis_xy
        for boundary, distance in {
            "left": x - hole.radius,
            "right": width - x - hole.radius,
            "bottom": y - hole.radius,
            "top": height - y - hole.radius,
        }.items():
            boundary_minima[boundary] = min(boundary_minima.get(boundary, distance), distance)
        ligament = edge_ligament(hole.axis_xy, hole.radius, width, height)
        if worst_edge is None or ligament < worst_edge:
            worst_edge = ligament
            worst_edge_label = f"{label}@{round(hole.axis_xy[0], 3)},{round(hole.axis_xy[1], 3)}"
        status = compare_minimum(ligament, float(requirements["minimum_edge_ligament"]), tolerances.band)
        statuses.append(status)
        if status != STATUS_PASS:
            reasons.append("EDGE_LIGAMENT")
    measured["minimum_edge_ligament_mm"] = round(worst_edge, 6) if worst_edge is not None else None
    measured["tightest_edge_hole"] = worst_edge_label
    measured.update({
        f"minimum_{boundary}_edge_ligament_mm": round(distance, 6)
        for boundary, distance in boundary_minima.items()
    })

    worst_pair = None
    worst_pair_label = None
    for first, second in itertools.combinations(range(len(holes)), 2):
        ligament = pair_ligament(holes[first], holes[second])
        if worst_pair is None or ligament < worst_pair:
            worst_pair = ligament
            worst_pair_label = f"{first}-{second}"
        status = compare_minimum(ligament, float(requirements["minimum_hole_ligament"]), tolerances.band)
        statuses.append(status)
        if status != STATUS_PASS:
            reasons.append("HOLE_LIGAMENT")
    measured["minimum_hole_ligament_mm"] = round(worst_pair, 6) if worst_pair is not None else None
    measured["tightest_hole_pair"] = worst_pair_label

    # Every measured hole must be either a frozen base hole or one of the
    # declared sensor holes; anything else is an unexplained hole in the part.
    expected_sensor = len(task["sensor"]["hole_offsets"])
    unexplained = max(0, len(match.unmatched_measured) - expected_sensor)
    measured["unexplained_holes"] = unexplained
    if unexplained > 0:
        statuses.append(STATUS_FAIL)
        reasons.append("EXTRA_UNKNOWN_HOLES")

    status = worst_status(statuses)
    if status == STATUS_PASS:
        return make_check("G05", STATUS_PASS, objects=objects, measured=measured, required=required)
    return make_check(
        "G05",
        status,
        objects=objects,
        measured=measured,
        required=required,
        reason_code=reasons[0] if reasons else "LIGAMENT_VIOLATION",
        note="; ".join(sorted(set(reasons))),
    )


def summarize_free_clearance(pairs: Sequence[PairMeasurement]) -> dict[str, Any]:
    """The free-clearance summary of one measured pair list (P02-06, plan section 7.1).

    ``minimum_pair_distance_mm`` is the minimum over *all* pairs and may legitimately read 0
    for an explicitly allowed support contact; ``minimum_free_clearance_mm`` excludes those
    allowed contacts and is ``None`` when no free pair was measured. The chosen pair is stable
    and reproducible from the report alone: candidates are compared on the *rounded* distance
    every pair already carries (6 decimals) and ties break on ``(moving, fixed)`` id order, so
    re-computing the choice from ``evidence.pairs`` can never disagree with the report about a
    tie. ``support_contact_status`` aggregates the allowed support pairs only: a penetrating
    support is ``PENETRATION`` (and stays a FAIL pair), a floating one is ``NOT_SEATED``, a
    seated one is ``SEATED``; ``NONE`` (no support pair measured) and ``POSE_UNKNOWN`` (no
    pose, hence nothing measured) are explicit states, never silently folded into one another.
    The legacy ``minimum_clearance_mm`` keeps its old meaning (the all-pairs minimum) and is
    documented as legacy; no free pair may ever be reported as a 0 mm free clearance.
    """
    if not pairs:
        return {
            "minimum_pair_distance_mm": None,
            "minimum_free_clearance_mm": None,
            "minimum_free_clearance_pair": None,
            "support_contact_status": "NONE",
        }
    free_pairs = [pair for pair in pairs if not pair.allowed_support]
    if free_pairs:
        best = min(free_pairs, key=lambda pair: (round(pair.distance_mm, 6), pair.moving_id, pair.fixed_id))
        minimum_free: float | None = round(best.distance_mm, 6)
        free_pair: dict[str, str] | None = {"moving": best.moving_id, "fixed": best.fixed_id}
    else:
        minimum_free = None
        free_pair = None
    support_pairs = [pair for pair in pairs if pair.allowed_support]
    if not support_pairs:
        support_status = "NONE"
    elif any(pair.status == STATUS_FAIL and pair.reason_code == "SOLID_INTERFERENCE" for pair in support_pairs):
        support_status = "PENETRATION"
    elif any(pair.status == STATUS_FAIL for pair in support_pairs):
        support_status = "NOT_SEATED"
    elif any(pair.status == STATUS_BORDERLINE for pair in support_pairs):
        support_status = "GAP_BORDERLINE"
    else:
        support_status = "SEATED"
    return {
        "minimum_pair_distance_mm": round(min(pair.distance_mm for pair in pairs), 6),
        "minimum_free_clearance_mm": minimum_free,
        "minimum_free_clearance_pair": free_pair,
        "support_contact_status": support_status,
    }


def _check_g06(
    *,
    task: Mapping[str, Any],
    scene_model: scene_mod.SceneModel,
    plate: cq.Shape,
    plate_top_z: float,
    pose: PoseSolution | None,
    pose_status: str,
    pose_reason: str | None,
    tolerances: Tolerances,
    requirements: Mapping[str, Any],
    g04_status: str,
) -> tuple[dict[str, Any], list[PairMeasurement]]:
    clearance = float(requirements["minimum_free_clearance"])
    required = {
        "minimum_free_clearance_mm": clearance,
        "interference_volume_epsilon_mm3": tolerances.volume_epsilon,
        "support_contact_allows_zero_distance": True,
        "support_contact_allows_penetration": False,
    }
    objects = ["sensor_body", "connector_access"]
    if pose is None or pose_status != STATUS_PASS:
        return (
            make_check(
                "G06",
                STATUS_UNKNOWN,
                objects=objects,
                measured={
                    "pairs_checked": 0,
                    "derived_pose_available": False,
                    # No pose, nothing measured: no distances are invented, and the contact
                    # state is explicitly "unknown", not "no support contact".
                    "support_contact_status": "POSE_UNKNOWN",
                },
                required=required,
                reason_code="UPSTREAM_G04_NOT_PASSED",
                note=(
                    "the device position must be derived from the measured hole group before any "
                    f"assembly space can be measured (G04: {g04_status}"
                    + (f"/{pose_reason}" if pose_reason else "")
                    + ")"
                ),
            ),
            [],
        )

    body = scene_mod.sensor_body_solid(task, pose.center_xy, plate_top_z)
    connector = scene_model.connector_access_solid(pose.center_xy)
    moving: list[tuple[str, cq.Shape]] = [("sensor_body", body)]
    if scene_model.connector_access is not None:
        moving.append((scene_model.connector_access.id, connector))

    fixed: list[tuple[str, cq.Shape, bool]] = [
        (obj.id, scene_model.solid_for_cylinder(obj), False) for obj in scene_model.fixed_cylinders
    ]
    fixed.append(("plate", plate, False))

    pairs: list[PairMeasurement] = []
    for moving_id, moving_solid in moving:
        for fixed_id, fixed_solid, _ in fixed:
            allowed_support = scene_model.is_support_pair(moving_id, fixed_id) or (
                moving_id == "sensor_body" and fixed_id == "plate" and scene_model.is_support_pair("sensor_body", "plate_top")
            )
            pairs.append(
                measure_pair(
                    moving_id,
                    moving_solid,
                    fixed_id,
                    fixed_solid,
                    tolerances=tolerances,
                    clearance_mm=clearance,
                    allowed_support=allowed_support,
                )
            )

    statuses = [pair.status for pair in pairs]
    status = worst_status(statuses)
    summary = summarize_free_clearance(pairs)
    measured: dict[str, Any] = {
        "pairs_checked": len(pairs),
        "derived_center_x_mm": round(pose.center_xy[0], 6),
        "derived_center_y_mm": round(pose.center_xy[1], 6),
        # Legacy field: the minimum over ALL pairs, allowed support contacts included - it may
        # read 0 when the device simply rests on the plate. Kept with its old meaning for old
        # consumers; new readers use minimum_pair_distance_mm / minimum_free_clearance_mm.
        "minimum_clearance_mm": summary["minimum_pair_distance_mm"],
        "maximum_intersection_volume_mm3": round(max(pair.intersection_volume_mm3 for pair in pairs), 9),
        "failing_pairs": sum(1 for pair in pairs if pair.status == STATUS_FAIL),
        "borderline_pairs": sum(1 for pair in pairs if pair.status == STATUS_BORDERLINE),
        **summary,
    }
    if status == STATUS_PASS:
        return (
            make_check("G06", STATUS_PASS, objects=objects, measured=measured, required=required, evidence_ref="pairs"),
            pairs,
        )
    failing = [pair for pair in pairs if pair.status != STATUS_PASS]
    worst_pair = max(failing, key=lambda pair: (_STATUS_SEVERITY[pair.status], pair.intersection_volume_mm3))
    objects = [worst_pair.moving_id, worst_pair.fixed_id]
    measured["worst_pair"] = f"{worst_pair.moving_id}/{worst_pair.fixed_id}"
    measured["worst_pair_distance_mm"] = round(worst_pair.distance_mm, 6)
    measured["worst_pair_volume_mm3"] = round(worst_pair.intersection_volume_mm3, 9)
    return (
        make_check(
            "G06",
            status,
            objects=objects,
            measured=measured,
            required=required,
            reason_code=worst_pair.reason_code or "ASSEMBLY_CONSTRAINT",
            note=f"measured on actual solids: {worst_pair.moving_id} vs {worst_pair.fixed_id}",
            evidence_ref="pairs",
        ),
        pairs,
    )


def _check_g07(
    shape: cq.Shape,
    facts: ShapeFacts,
    scene_doc: Mapping[str, Any],
    task: Mapping[str, Any],
    base_radius: float,
    tolerances: Tolerances,
    match: BaseMatch,
) -> dict[str, Any]:
    """Re-check the frozen conditions on the actual solid, by a second route.

    Not a parameter diff: the plate size is re-read, the frozen base holes are
    re-measured from a planar cross-section (a different method than G03's
    cylinder faces), and the scene content hash is recomputed.
    """
    required = {
        "scene_sha256": task["scene_sha256"],
        "base_hole_count": len(task["base_holes"]["centers"]),
        "base_hole_diameter_mm": float(task["base_holes"]["diameter"]),
        "frozen_dimensions_preserved": True,
    }
    objects = ["plate", "base_holes", "post_group", "screw_head_group"]
    scene_hash = contract.content_sha256(scene_doc)
    measured: dict[str, Any] = {"scene_sha256": scene_hash, "scene_hash_matches": scene_hash == task["scene_sha256"]}
    statuses: list[str] = []
    reasons: list[str] = []
    if scene_hash != task["scene_sha256"]:
        statuses.append(STATUS_FAIL)
        reasons.append("SCENE_HASH_MISMATCH")

    # Locked plate dimensions, re-read from the solid (independent of G02's verdict).
    locked = set(task["plate"]["locked"])
    size = {"width": facts.size_xyz[0], "height": facts.size_xyz[1], "thickness": facts.size_xyz[2]}
    for dim in ("width", "height", "thickness"):
        if dim not in locked:
            continue
        measured[f"locked_{dim}_mm"] = round(size[dim], 6)
        status, _ = compare_value(size[dim], float(task["plate"][dim]), tolerances.dimensional, tolerances.band)
        statuses.append(status)
        if status != STATUS_PASS:
            reasons.append(f"LOCKED_{dim.upper()}_CHANGED")

    # Base holes via the cross-section route.
    z_probe = facts.bbox_min[2] + facts.size_xyz[2] / 2.0
    section_holes = measure_holes_at_section(shape, z_probe)
    measured["section_holes_found"] = len(section_holes)
    measured["section_z_mm"] = round(z_probe, 6)
    frozen = task["base_holes"]["centers"]
    worst_deviation = 0.0
    matched_count = 0
    for center in frozen:
        best = None
        for section_hole in section_holes:
            distance = math.hypot(section_hole.center_xy[0] - center[0], section_hole.center_xy[1] - center[1])
            if best is None or distance < best:
                best = distance
        if best is not None:
            worst_deviation = max(worst_deviation, best)
            if best <= tolerances.dimensional + tolerances.band:
                matched_count += 1
    measured["section_base_holes_matched"] = matched_count
    measured["section_worst_deviation_mm"] = round(worst_deviation, 6)
    if matched_count != len(frozen):
        statuses.append(STATUS_FAIL)
        reasons.append("FROZEN_HOLE_MISSING_AT_SECTION")
    else:
        status, _ = compare_value(worst_deviation, 0.0, tolerances.dimensional, tolerances.band)
        statuses.append(status)
        if status != STATUS_PASS:
            reasons.append("FROZEN_HOLE_DEVIATION_AT_SECTION")

    # The measured hole set must not contain anything the frozen conditions cannot explain.
    unexplained = len(match.unmatched_measured)
    measured["holes_not_explained_by_frozen_conditions"] = unexplained
    if match.complete and unexplained > len(task["sensor"]["hole_offsets"]):
        statuses.append(STATUS_FAIL)
        reasons.append("EXTRA_HOLE_NOT_IN_FROZEN_CONDITIONS")

    status = worst_status(statuses)
    if status == STATUS_PASS:
        return make_check("G07", STATUS_PASS, objects=objects, measured=measured, required=required)
    return make_check(
        "G07",
        status,
        objects=objects,
        measured=measured,
        required=required,
        reason_code=reasons[0] if reasons else "FROZEN_CONDITION_CHANGED",
        note="; ".join(sorted(set(reasons))),
    )


def _check_g08(
    inputs: ValidationInputs,
    facts: ShapeFacts,
    shape: cq.Shape,
    tolerances: Tolerances,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Export consistency: STL is verified independently, preview by identity binding."""
    required = {
        "stl_closed": True,
        "stl_volume_relative_budget": STL_VOLUME_RELATIVE_BUDGET,
        "preview_step_hash_matches": True,
        "preview_candidate_id_matches": True,
        "preview_mesh_structurally_valid": True,
        "preview_mesh_equals_step_tessellation": True,
    }
    objects = ["plate"]
    evidence: dict[str, Any] = {}
    if inputs.stl_path is None:
        return (
            make_check(
                "G08",
                STATUS_UNKNOWN,
                objects=objects,
                measured={"stl_provided": False},
                required=required,
                reason_code="STL_NOT_PROVIDED",
                note="without the exported STL the export consistency cannot be verified",
            ),
            evidence,
        )

    try:
        stl = parse_stl(inputs.stl_path)
    except ExecutionFailure as failure:
        evidence["stl_error"] = failure.to_dict()
        status = STATUS_FAIL if failure.code == CODE_STL_TRUNCATED else STATUS_UNKNOWN
        reason = failure.code if failure.code == CODE_STL_TRUNCATED else "STL_UNVERIFIABLE"
        return (
            make_check(
                "G08",
                status,
                objects=objects,
                measured={"stl_provided": True, "stl_readable": False},
                required=required,
                reason_code=reason,
                note=failure.message[:512],
            ),
            evidence,
        )

    measured: dict[str, Any] = dict(stl.as_measured())
    measured["step_volume_mm3"] = round(facts.volume_mm3, 6)
    volume_delta = abs(stl.volume_mm3 - facts.volume_mm3)
    volume_budget = max(STL_VOLUME_RELATIVE_BUDGET * abs(facts.volume_mm3), STL_VOLUME_ABSOLUTE_BUDGET_MM3)
    measured["stl_volume_delta_mm3"] = round(volume_delta, 6)
    required["stl_volume_budget_mm3"] = round(volume_budget, 6)
    for axis, key in (("size_x_mm", 0), ("size_y_mm", 1), ("size_z_mm", 2)):
        measured[f"stl_vs_step_{axis}_delta_mm"] = round(abs(stl.bounds_max[key] - stl.bounds_min[key] - facts.size_xyz[key]), 6)
    evidence["stl"] = stl.as_measured()

    statuses: list[str] = []
    reasons: list[str] = []
    if not stl.is_closed:
        statuses.append(STATUS_FAIL)
        reasons.append("STL_NOT_CLOSED")
    elif stl.volume_mm3 <= 0:
        statuses.append(STATUS_FAIL)
        reasons.append("STL_NEGATIVE_VOLUME")
    if volume_delta > volume_budget:
        statuses.append(STATUS_FAIL)
        reasons.append("STL_VOLUME_MISMATCH")
    for axis in (0, 1, 2):
        delta = abs((stl.bounds_max[axis] - stl.bounds_min[axis]) - facts.size_xyz[axis])
        status, _ = compare_value(delta, 0.0, tolerances.dimensional, tolerances.band)
        statuses.append(status)
        if status != STATUS_PASS:
            reasons.append("STL_BOUNDS_MISMATCH")

    preview_status, preview_evidence = _check_preview(inputs, shape, facts, tolerances)
    evidence["preview"] = preview_evidence
    if preview_status is not None:
        statuses.append(preview_status[0])
        if preview_status[0] != STATUS_PASS:
            reasons.append(preview_status[1])

    status = worst_status(statuses)
    if status == STATUS_PASS:
        return make_check("G08", STATUS_PASS, objects=objects, measured=measured, required=required), evidence
    return (
        make_check(
            "G08",
            status,
            objects=objects,
            measured=measured,
            required=required,
            reason_code=reasons[0] if reasons else "EXPORT_INCONSISTENT",
            note="; ".join(sorted(set(reasons))) or None,
        ),
        evidence,
    )


def _check_preview(
    inputs: ValidationInputs,
    shape: cq.Shape,
    facts: ShapeFacts,
    tolerances: Tolerances,
) -> tuple[tuple[str, str] | None, dict[str, Any]]:
    """Verify the preview identity binding and the *content* of the sibling mesh.

    Identity alone is not evidence: a mesh can keep its declared hash, candidate
    and triangle count while its vertices describe something else. The mesh is
    therefore checked in full - finite coordinates, index bounds, degenerate
    triangles, believable tolerances, bounds/volume against the re-measured
    solid - and must equal the tessellation of *this* STEP at the tolerance it
    declares. A missing or unverifiable mesh is never a PASS.
    """
    evidence: dict[str, Any] = {}
    if inputs.preview_path is None:
        return (STATUS_UNKNOWN, "PREVIEW_NOT_PROVIDED"), evidence
    path = Path(inputs.preview_path)
    if not path.is_file():
        evidence["error"] = "preview file is missing"
        return (STATUS_UNKNOWN, "PREVIEW_NOT_PROVIDED"), evidence
    try:
        preview = contract.load_json_file(path)
    except contract.JsonLoadError as exc:
        evidence["error"] = str(exc)
        return (STATUS_UNKNOWN, "PREVIEW_UNREADABLE"), evidence

    step_hash = _safe_file_hash(inputs.step_path)
    evidence["declared_step_sha256"] = preview.get("step_sha256")
    evidence["actual_step_sha256"] = step_hash
    evidence["declared_candidate_id"] = preview.get("candidate_id")
    evidence["triangles"] = preview.get("triangles")
    if preview.get("candidate_id") != inputs.candidate_id:
        return (STATUS_FAIL, "PREVIEW_CANDIDATE_MISMATCH"), evidence
    if preview.get("step_sha256") != step_hash:
        return (STATUS_FAIL, "PREVIEW_HASH_MISMATCH"), evidence
    bounds = preview.get("bounds")
    if isinstance(bounds, Mapping):
        low = bounds.get("min")
        high = bounds.get("max")
        if isinstance(low, list) and isinstance(high, list) and len(low) == 3 and len(high) == 3:
            x_min, y_min, z_min, x_max, y_max, z_max = inspect_step.exact_bbox(shape)
            measured_sizes = (x_max - x_min, y_max - y_min, z_max - z_min)
            for axis in (0, 1, 2):
                delta = abs((float(high[axis]) - float(low[axis])) - measured_sizes[axis])
                if delta > tolerances.dimensional + tolerances.band:
                    evidence["bounds_delta_mm"] = round(delta, 6)
                    return (STATUS_FAIL, "PREVIEW_BOUNDS_MISMATCH"), evidence

    # ---- the mesh payload itself -----------------------------------------
    mesh_path = path.parent / "preview_mesh.json"
    if not mesh_path.is_file():
        # preview.json always ships with its real mesh in this project; without
        # it the preview cannot be verified, so it is UNKNOWN, never PASS.
        evidence["mesh_file"] = None
        return (STATUS_UNKNOWN, "PREVIEW_MESH_NOT_PROVIDED"), evidence
    try:
        mesh_doc = contract.load_json_file(mesh_path)
    except contract.JsonLoadError as exc:
        evidence["mesh_error"] = str(exc)
        return (STATUS_UNKNOWN, "PREVIEW_MESH_UNREADABLE"), evidence
    evidence["mesh_file"] = mesh_path.name
    if not isinstance(mesh_doc, Mapping) or mesh_doc.get("schema_version") != contract.SCHEMA_VERSION:
        return (STATUS_FAIL, "PREVIEW_MESH_MALFORMED"), evidence
    if mesh_doc.get("step_sha256") != step_hash:
        return (STATUS_FAIL, "PREVIEW_MESH_HASH_MISMATCH"), evidence
    if mesh_doc.get("candidate_id") != inputs.candidate_id:
        return (STATUS_FAIL, "PREVIEW_MESH_CANDIDATE_MISMATCH"), evidence

    analysis = analyze_preview_mesh(mesh_doc)
    mesh_facts = analysis.facts
    evidence["mesh_vertices"] = None if mesh_facts is None else mesh_facts.vertex_count
    evidence["mesh_triangles"] = None if mesh_facts is None else mesh_facts.triangle_count
    if analysis.problem is not None:
        status, reason = _MESH_PROBLEM_RESULTS[analysis.problem]
        evidence["mesh_problem"] = analysis.detail
        return (status, reason), evidence
    if mesh_facts is None:  # pragma: no cover - a clean analysis always carries facts
        return (STATUS_UNKNOWN, "PREVIEW_MESH_UNVERIFIABLE"), evidence

    declared_triangles = preview.get("triangles")
    if (
        isinstance(declared_triangles, int)
        and not isinstance(declared_triangles, bool)
        and declared_triangles != mesh_facts.triangle_count
    ):
        return (STATUS_FAIL, "PREVIEW_MESH_TRIANGLE_MISMATCH"), evidence

    # Declared bounds must agree with the vertices actually shipped and with
    # the re-measured solid.
    declared_bounds = mesh_doc.get("bounds")
    low = declared_bounds.get("min") if isinstance(declared_bounds, Mapping) else None
    high = declared_bounds.get("max") if isinstance(declared_bounds, Mapping) else None
    if not (
        isinstance(low, list)
        and isinstance(high, list)
        and len(low) == 3
        and len(high) == 3
        and all(isinstance(value, (int, float)) and not isinstance(value, bool) for value in low + high)
    ):
        evidence["mesh_problem"] = "the mesh carries no usable bounds"
        return (STATUS_FAIL, "PREVIEW_MESH_MALFORMED"), evidence
    for axis in range(3):
        self_delta = max(
            abs(float(low[axis]) - mesh_facts.bounds_min[axis]),
            abs(float(high[axis]) - mesh_facts.bounds_max[axis]),
        )
        if self_delta > inspect_step.MESH_COORD_QUANTUM:
            evidence["mesh_bounds_self_delta_mm"] = round(self_delta, 6)
            return (STATUS_FAIL, "PREVIEW_MESH_BOUNDS_MISMATCH"), evidence
        solid_delta = max(
            abs(float(low[axis]) - facts.bbox_min[axis]),
            abs(float(high[axis]) - facts.bbox_max[axis]),
        )
        if solid_delta > tolerances.dimensional + tolerances.band:
            evidence["mesh_bounds_delta_mm"] = round(solid_delta, 6)
            return (STATUS_FAIL, "PREVIEW_MESH_BOUNDS_MISMATCH"), evidence

    # The volume enclosed by the shipped triangles must be the volume of the
    # solid (within the same tessellation budget the STL is held to).
    volume_delta = abs(mesh_facts.volume_mm3 - facts.volume_mm3)
    volume_budget = max(STL_VOLUME_RELATIVE_BUDGET * abs(facts.volume_mm3), STL_VOLUME_ABSOLUTE_BUDGET_MM3)
    evidence["mesh_volume_mm3"] = round(mesh_facts.volume_mm3, 6)
    evidence["mesh_volume_delta_mm3"] = round(volume_delta, 6)
    if volume_delta > volume_budget:
        return (STATUS_FAIL, "PREVIEW_MESH_VOLUME_MISMATCH"), evidence

    # Finally: the mesh must be *the* tessellation of this STEP. Re-tessellate
    # the re-imported entity at the declared tolerance and require the same
    # vertices and triangles - a count comparison alone would let a tampered
    # mesh through.
    try:
        recomputed = tessellate_budgeted(
            shape,
            prefix={
                "schema_version": contract.SCHEMA_VERSION,
                "candidate_id": inputs.candidate_id,
                "step_sha256": step_hash,
            },
            levels=((mesh_facts.tolerance_mm, mesh_facts.angular_tolerance_rad),),
            triangle_budget=PREVIEW_RECOMPUTE_TRIANGLE_BUDGET,
            byte_budget=PREVIEW_RECOMPUTE_BYTE_BUDGET,
        )
    except ExecutionFailure as failure:  # pragma: no cover - bounded-work guard
        evidence["recompute_error"] = failure.to_dict()
        return (STATUS_UNKNOWN, "PREVIEW_MESH_UNVERIFIABLE"), evidence
    evidence["recomputed_triangles"] = recomputed.triangle_count
    if recomputed.triangle_count != mesh_facts.triangle_count:
        return (STATUS_FAIL, "PREVIEW_MESH_NOT_FROM_STEP"), evidence
    if _vertex_multiset(mesh_doc["vertices"]) != _vertex_multiset(recomputed.vertices) or (
        triangle_key_set(mesh_doc["vertices"], mesh_doc["indices"])
        != triangle_key_set(recomputed.vertices, recomputed.indices)
    ):
        return (STATUS_FAIL, "PREVIEW_MESH_GEOMETRY_MISMATCH"), evidence
    return None, evidence


def _vertex_multiset(values: Sequence[float]) -> Counter:
    """The mesh vertices as a multiset of 6-decimal triples (writer quantum)."""
    return Counter(
        (round(values[index], 6), round(values[index + 1], 6), round(values[index + 2], 6))
        for index in range(0, len(values), 3)
    )
