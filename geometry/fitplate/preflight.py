"""Strict pre-generation classification of a frozen task (T09, Plan1 10.2).

The plan wants ``NEEDS_INPUT`` / ``INVALID_SPEC`` / ``INFEASIBLE`` to be
distinguishable *before* any geometry is generated, and it wants an
``INFEASIBLE`` verdict to carry checkable conflict conditions rather than a
"the solver did not find anything" story. This module is therefore deliberately
narrow:

* it re-checks only the fields it actually uses - the authoritative structural
  contract stays in :mod:`fitplate.schema`, which the caller runs first;
* every infeasibility proof is either a **closed-form bound over the whole
  allowed design domain** (ligament material, which is piecewise linear and
  therefore attains its extremum at a domain corner or at the symmetric
  crossing point) or a **certified-margin collision proof** on real OCCT solids
  (an inscribed ball of the intersection stays inside it under every
  displacement the task's own tolerance band and editable dimensions allow);
* there is no search, no sampling and no general solver hidden here, and a
  domain that is not a single point is never declared collision-infeasible -
  that case is left to the designer, because "not found" is not a proof.

Terminology used below:

``upper bound``
    The largest value the *check* could possibly measure for any artefact that
    stays inside the tolerances the contract grants it - the geometric maximum
    over the allowed design domain (computed exactly, never sampled) *plus*
    every deviation that could move the measurement in the favourable
    direction (measured outline, hole centre, hole radius). The acceptance
    check fails whenever the measured value is below ``required - band``, so a
    proof *must* bound the favourable direction: subtracting a tolerance from
    the bound would declare tasks infeasible that a legal artefact could still
    bring over the line.

``certified ball``
    For a convex intersection ``S = A ∩ B`` of two real solids, a ball centred
    at an interior point ``p`` with radius ``r = dist(p, boundary(S))`` lies
    inside ``S``. Moving ``A`` by ``v`` and ``B`` by ``w`` keeps a ball of
    radius ``r - (|v| + |w|)/2`` inside the moved intersection; rotating ``A``
    by ``θ`` around a centre at distance ``≤ R`` from ``p`` keeps ``r - 2·R·θ``,
    and eroding ``A`` by a square of half-width ``e`` keeps ``r - e·√2``. A
    positive certified radius after charging every displacement/rotation
    allowance the task permits proves the interference exists for *every*
    artefact the tolerances allow (growing a body only adds material, so it
    cannot weaken a containment certificate and is charged nothing).
"""

from __future__ import annotations

import itertools
import math
from dataclasses import dataclass, field
from typing import Any, Mapping, Sequence

import cadquery as cq
from OCP.BRepBuilderAPI import BRepBuilderAPI_MakeVertex
from OCP.gp import gp_Pnt

from . import scene as scene_mod

OUTCOME_OK = "OK"
OUTCOME_NEEDS_INPUT = "NEEDS_INPUT"
OUTCOME_INVALID_SPEC = "INVALID_SPEC"
OUTCOME_INFEASIBLE = "INFEASIBLE"

#: Every proof keeps at least this much material distance between the bound it
#: computes and the threshold it compares against. It is larger than a
#: 0.1 mm^3 ball's radius (0.288 mm is for 0.1 mm^3; the teaching contracts use
#: 0.0001 mm^3 -> 0.0288 mm), so a certified ball that clears it also clears
#: the interference-volume threshold with room to spare; for ligament claims it
#: is the cushion required *in addition* to the contract's own band.
CERTIFIED_MARGIN_MM = 0.05

_PLATE_FRAME = "plate_lower_left_bottom_xyz"

#: Fields this module reads. Missing ones are the minimal NEEDS_INPUT paths.
_NEEDED_PATHS: tuple[tuple[str, ...], ...] = (
    ("units",),
    ("frame",),
    ("plate", "width"),
    ("plate", "height"),
    ("plate", "thickness"),
    ("plate", "locked"),
    ("plate", "editable"),
    ("base_holes", "diameter"),
    ("base_holes", "centers"),
    ("sensor", "body_size"),
    ("sensor", "hole_offsets"),
    ("sensor", "hole_diameter"),
    ("sensor", "allowed_center_x"),
    ("sensor", "allowed_center_y"),
    ("sensor", "allowed_rotation_deg"),
    ("requirements", "minimum_free_clearance"),
    ("requirements", "minimum_edge_ligament"),
    ("requirements", "minimum_hole_ligament"),
    ("tolerances", "geometry_epsilon_mm"),
    ("tolerances", "dimensional_tolerance_mm"),
    ("tolerances", "interference_volume_epsilon_mm3"),
)


@dataclass(frozen=True)
class Finding:
    """One provable conflict: what it is, which objects, and the numbers behind it."""

    kind: str
    objects: tuple[str, ...]
    detail: Mapping[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {"kind": self.kind, "objects": list(self.objects), **dict(self.detail)}


@dataclass(frozen=True)
class PreflightResult:
    outcome: str
    code: str
    message: str
    findings: tuple[Finding, ...] = ()
    missing_paths: tuple[str, ...] = ()
    notes: tuple[str, ...] = field(default=())

    @property
    def ok(self) -> bool:
        return self.outcome == OUTCOME_OK

    def to_dict(self) -> dict[str, Any]:
        return {
            "outcome": self.outcome,
            "code": self.code,
            "message": self.message,
            "findings": [finding.to_dict() for finding in self.findings],
            "missing_paths": list(self.missing_paths),
            "notes": list(self.notes),
        }


# ---------------------------------------------------------------------------
# Structural gate (NEEDS_INPUT / INVALID_SPEC)
# ---------------------------------------------------------------------------


def _lookup(doc: Any, path: Sequence[str]) -> Any:
    node = doc
    for key in path:
        if not isinstance(node, Mapping) or key not in node:
            raise KeyError("/".join(path))
        node = node[key]
    return node


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _structural(task: Mapping[str, Any], scene: Mapping[str, Any]) -> PreflightResult | None:
    missing = [f"/{'/'.join(path)}" for path in _NEEDED_PATHS if _missing(task, path)]
    if missing:
        return PreflightResult(
            OUTCOME_NEEDS_INPUT,
            "MISSING_FIELDS",
            "the frozen task does not carry every field this classification needs",
            missing_paths=tuple(missing),
        )
    scene_paths = (("scene_id",), ("units",), ("frame",), ("objects",), ("support_contacts",))
    missing_scene = [f"/scene/{'/'.join(path)}" for path in scene_paths if _missing(scene, path)]
    if missing_scene:
        return PreflightResult(
            OUTCOME_NEEDS_INPUT,
            "MISSING_SCENE_FIELDS",
            "the frozen scene does not carry every field this classification needs",
            missing_paths=tuple(missing_scene),
        )

    invalid: list[str] = []
    if task.get("units") != "mm":
        invalid.append("/units: only explicit millimetre contracts are classified here")
    if task.get("frame") != _PLATE_FRAME:
        invalid.append(f"/frame: expected {_PLATE_FRAME!r}")
    if scene.get("units") != "mm":
        invalid.append("/scene/units: only explicit millimetre scenes are classified here")
    if scene.get("frame") != _PLATE_FRAME:
        invalid.append(f"/scene/frame: expected {_PLATE_FRAME!r}")

    plate = task["plate"]
    for dim in ("width", "height", "thickness"):
        if not _is_number(plate.get(dim)):
            invalid.append(f"/plate/{dim}: expected a finite number")
    for dim in ("width", "height", "thickness"):
        if dim in (plate.get("locked") or []):
            continue
        rng = (plate.get("editable") or {}).get(dim)
        if not isinstance(rng, Mapping):
            invalid.append(f"/plate/{dim}: neither locked nor editable")
            continue
        lo, hi = rng.get("min"), rng.get("max")
        if not _is_number(lo) or not _is_number(hi) or lo > hi:
            invalid.append(f"/plate/editable/{dim}: expected an ordered numeric range")

    base = task["base_holes"]
    if not _is_number(base.get("diameter")) or float(base["diameter"]) <= 0:
        invalid.append("/base_holes/diameter: expected a positive diameter")
    for index, center in enumerate(base.get("centers") or []):
        if not _pair_of_numbers(center):
            invalid.append(f"/base_holes/centers/{index}: expected a finite [x, y] pair")

    sensor = task["sensor"]
    body = sensor.get("body_size")
    if not isinstance(body, Sequence) or isinstance(body, (str, bytes)) or len(body) != 3 or not all(_is_number(v) and v > 0 for v in body):
        invalid.append("/sensor/body_size: expected three positive finite sizes")
    for index, offset in enumerate(sensor.get("hole_offsets") or []):
        if not _pair_of_numbers(offset):
            invalid.append(f"/sensor/hole_offsets/{index}: expected a finite [dx, dy] pair")
    if not _is_number(sensor.get("hole_diameter")) or float(sensor["hole_diameter"]) <= 0:
        invalid.append("/sensor/hole_diameter: expected a positive diameter")
    for axis in ("x", "y"):
        rng = sensor.get(f"allowed_center_{axis}")
        if not isinstance(rng, Mapping) or not _is_number(rng.get("min")) or not _is_number(rng.get("max")) or rng["min"] > rng["max"]:
            invalid.append(f"/sensor/allowed_center_{axis}: expected an ordered numeric range")
    rotations = sensor.get("allowed_rotation_deg")
    if not isinstance(rotations, Sequence) or isinstance(rotations, (str, bytes)) or len(rotations) != 1 or rotations[0] != 0:
        invalid.append("/sensor/allowed_rotation_deg: version 1.0 classifies rotation [0] only")

    requirements = task["requirements"]
    for key in ("minimum_free_clearance", "minimum_edge_ligament", "minimum_hole_ligament"):
        if not _is_number(requirements.get(key)) or requirements[key] < 0:
            invalid.append(f"/requirements/{key}: expected a non-negative number")
    tolerances = task["tolerances"]
    for key in ("geometry_epsilon_mm", "dimensional_tolerance_mm", "interference_volume_epsilon_mm3"):
        if not _is_number(tolerances.get(key)) or tolerances[key] <= 0:
            invalid.append(f"/tolerances/{key}: expected a positive number")
    if invalid:
        return PreflightResult(
            OUTCOME_INVALID_SPEC,
            "INVALID_VALUES",
            "the frozen task carries values this classification must refuse rather than approximate",
            notes=tuple(invalid),
        )
    return None


def _missing(doc: Any, path: Sequence[str]) -> bool:
    try:
        _lookup(doc, path)
    except KeyError:
        return True
    return False


def _pair_of_numbers(value: Any) -> bool:
    return (
        isinstance(value, Sequence)
        and not isinstance(value, (str, bytes))
        and len(value) == 2
        and all(_is_number(item) for item in value)
    )


# ---------------------------------------------------------------------------
# Domains
# ---------------------------------------------------------------------------


def _dim_bounds(plate: Mapping[str, Any], dim: str) -> tuple[float, float]:
    """(min, max) a plate dimension may take: locked means a single point."""
    if dim in (plate.get("locked") or []):
        value = float(plate[dim])
        return (value, value)
    rng = plate["editable"][dim]
    return (float(rng["min"]), float(rng["max"]))


def _center_bounds(sensor: Mapping[str, Any]) -> tuple[tuple[float, float], tuple[float, float]]:
    x = sensor["allowed_center_x"]
    y = sensor["allowed_center_y"]
    return ((float(x["min"]), float(x["max"])), (float(y["min"]), float(y["max"])))


def _tolerance_terms(task: Mapping[str, Any]) -> tuple[float, float]:
    """The contract's (dimensional tolerance, comparison band) in millimetres."""
    return (
        float(task["tolerances"]["dimensional_tolerance_mm"]),
        float(task["tolerances"]["geometry_epsilon_mm"]),
    )


def _edge_allowance(plate: Mapping[str, Any], dim: str, tolerance: float, band: float) -> float:
    """How far the measured outline may sit beyond its nominal position without FAILing.

    A locked dimension is judged by ``compare_value``, where a measurement up
    to ``tolerance + band`` away is still a non-FAIL; an editable one is judged
    by ``compare_within_range``, where a value up to ``band`` outside the
    domain is borderline. Both directions matter here: the *favourable* one
    (a larger plate helping a hole reach the required ligament) is what the
    proof must charge to its bound.
    """
    if dim in (plate.get("locked") or []):
        return tolerance + band
    return band


def _center_allowance(hole_kind: str, tolerance: float, band: float) -> float:
    """The largest favourable displacement of a measured hole centre.

    Base holes are re-measured against their frozen centres (G03: a deviation
    up to ``tolerance + band`` is still a non-FAIL); sensor holes are recovered
    by a pattern match inside the same tolerance (G04) whose derived centre may
    additionally sit ``band`` outside the allowed range before it fails.
    """
    if hole_kind == "base":
        return tolerance + band
    return tolerance + 2.0 * band


def _radius_allowance(tolerance: float, band: float) -> float:
    """The largest favourable change of a measured radius (the diameter is compared)."""
    return (tolerance + band) / 2.0


# ---------------------------------------------------------------------------
# Ligament bounds (closed form, no search)
# ---------------------------------------------------------------------------


def _best_two_sided(low: float, high: float, span: float, radius: float) -> float:
    """max over t in [low, high] of min(t - r, span - t - r).

    Both terms are linear in ``t`` (one rising, one falling), so the minimum is
    concave and its maximum sits either at the crossing point ``span/2`` - when
    that point is inside the interval - or at one of the two endpoints. This is
    the *exact* extremum of a piecewise-linear function, not a sample.
    """
    if low <= span / 2.0 <= high:
        return span / 2.0 - radius
    return max(min(low - radius, span - low - radius), min(high - radius, span - high - radius))


def _best_edge_ligament(
    x_bounds: tuple[float, float],
    y_bounds: tuple[float, float],
    radius: float,
    width_max: float,
    height_max: float,
) -> tuple[float, dict[str, Any]]:
    """Maximum edge ligament a hole can reach anywhere in its allowed domain.

    ``min`` over the four plate edges is separable in x and y, so the maximum
    over the rectangle is the smaller of the two one-dimensional maxima; the
    right/top terms use the largest plate the task allows, because those are
    the positions where a larger plate would help.
    """
    best_x = _best_two_sided(x_bounds[0], x_bounds[1], width_max, radius)
    best_y = _best_two_sided(y_bounds[0], y_bounds[1], height_max, radius)
    best = min(best_x, best_y)
    detail = {
        "best_edge": "x" if best_x <= best_y else "y",
        "best_x_ligament_mm": round(best_x, 6),
        "best_y_ligament_mm": round(best_y, 6),
        "width_max_mm": round(width_max, 6),
        "height_max_mm": round(height_max, 6),
    }
    return best, detail


def _edge_findings(task: Mapping[str, Any]) -> list[Finding]:
    plate = task["plate"]
    sensor = task["sensor"]
    requirements = float(task["requirements"]["minimum_edge_ligament"])
    tolerance, band = _tolerance_terms(task)
    width_max = _dim_bounds(plate, "width")[1]
    height_max = _dim_bounds(plate, "height")[1]
    edge_allowance = max(
        _edge_allowance(plate, "width", tolerance, band),
        _edge_allowance(plate, "height", tolerance, band),
    )
    radius_allowance = _radius_allowance(tolerance, band)

    holes: list[tuple[str, tuple[float, float], tuple[float, float], float, dict[str, Any]]] = []
    base_radius = float(task["base_holes"]["diameter"]) / 2.0
    for index, center in enumerate(task["base_holes"]["centers"]):
        point = (float(center[0]), float(center[1]))
        holes.append(
            (
                f"base_hole[{index}]",
                (point[0], point[0]),
                (point[1], point[1]),
                base_radius,
                {"hole_kind": "base", "hole_index": index, "center_xy": list(point), "fixed": True},
            )
        )
    sensor_radius = float(sensor["hole_diameter"]) / 2.0
    (cx0, cx1), (cy0, cy1) = _center_bounds(sensor)
    for index, offset in enumerate(sensor["hole_offsets"]):
        dx, dy = float(offset[0]), float(offset[1])
        holes.append(
            (
                f"sensor_hole[{index}]",
                (cx0 + dx, cx1 + dx),
                (cy0 + dy, cy1 + dy),
                sensor_radius,
                {
                    "hole_kind": "sensor",
                    "hole_index": index,
                    "offset_xy": [dx, dy],
                    "center_domain": {"x": [cx0, cx1], "y": [cy0, cy1]},
                },
            )
        )

    findings: list[Finding] = []
    for label, x_bounds, y_bounds, radius, extra in holes:
        best, detail = _best_edge_ligament(x_bounds, y_bounds, radius, width_max, height_max)
        # The accepted measurement of a legal artefact may sit above the best
        # geometric value: a larger plate, a hole centre displaced towards the
        # interior and a smaller hole all raise the measured ligament, and each
        # may move as far as its own check still tolerates. Only when even that
        # upper bound cannot reach ``required - band`` is a PASS impossible.
        center_allowance = _center_allowance(str(extra["hole_kind"]), tolerance, band)
        allowance = edge_allowance + center_allowance + radius_allowance
        upper = best + allowance
        margin = (requirements - band) - upper
        if margin > CERTIFIED_MARGIN_MM:
            findings.append(
                Finding(
                    "EDGE_LIGAMENT",
                    (label, "plate_outline"),
                    {
                        "hole": label,
                        "required_minimum_mm": requirements,
                        "best_geometric_bound_mm": round(best, 6),
                        "measurement_allowance_mm": round(allowance, 6),
                        "allowance_breakdown_mm": {
                            "plate_outline": round(edge_allowance, 6),
                            "hole_center": round(center_allowance, 6),
                            "hole_radius": round(radius_allowance, 6),
                        },
                        "upper_bound_mm": round(upper, 6),
                        "band_mm": band,
                        "margin_mm": round(margin, 6),
                        "hole_radius_mm": round(radius, 6),
                        "plate_domain": {
                            "width": list(_dim_bounds(plate, "width")),
                            "height": list(_dim_bounds(plate, "height")),
                        },
                        "note": "no artefact within the declared tolerances can measure a ligament at or above required - band",
                        **extra,
                        **detail,
                    },
                )
            )
    return findings


# ---------------------------------------------------------------------------
# Hole-to-hole ligament bounds
# ---------------------------------------------------------------------------


def _farthest_corner(point: tuple[float, float], x_bounds: tuple[float, float], y_bounds: tuple[float, float]) -> tuple[float, float]:
    """The point of an axis-aligned box farthest from ``point`` (distance is convex)."""
    return (
        x_bounds[0] if abs(point[0] - x_bounds[0]) >= abs(point[0] - x_bounds[1]) else x_bounds[1],
        y_bounds[0] if abs(point[1] - y_bounds[0]) >= abs(point[1] - y_bounds[1]) else y_bounds[1],
    )


def _hole_ligament_findings(task: Mapping[str, Any]) -> list[Finding]:
    sensor = task["sensor"]
    requirements = float(task["requirements"]["minimum_hole_ligament"])
    tolerance, band = _tolerance_terms(task)
    base_radius = float(task["base_holes"]["diameter"]) / 2.0
    sensor_radius = float(sensor["hole_diameter"]) / 2.0
    (cx0, cx1), (cy0, cy1) = _center_bounds(sensor)
    base_center = _center_allowance("base", tolerance, band)
    sensor_center = _center_allowance("sensor", tolerance, band)
    radius_allowance = _radius_allowance(tolerance, band)

    base_holes = [(f"base_hole[{i}]", (float(c[0]), float(c[1]))) for i, c in enumerate(task["base_holes"]["centers"])]
    sensor_holes = [
        (f"sensor_hole[{i}]", (float(o[0]), float(o[1])), (cx0 + float(o[0]), cx1 + float(o[0])), (cy0 + float(o[1]), cy1 + float(o[1])))
        for i, o in enumerate(sensor["hole_offsets"])
    ]

    findings: list[Finding] = []

    def judge(
        first_label: str,
        second_label: str,
        max_distance: float,
        radius_sum: float,
        allowance: float,
        decided: Mapping[str, Any],
    ) -> None:
        upper = max_distance - radius_sum + allowance
        margin = (requirements - band) - upper
        if margin > CERTIFIED_MARGIN_MM:
            findings.append(
                Finding(
                    "HOLE_LIGAMENT",
                    (first_label, second_label),
                    {
                        "required_minimum_mm": requirements,
                        "best_geometric_bound_mm": round(max_distance - radius_sum, 6),
                        "measurement_allowance_mm": round(allowance, 6),
                        "upper_bound_mm": round(upper, 6),
                        "hole_radius_sum_mm": round(radius_sum, 6),
                        "band_mm": band,
                        "margin_mm": round(margin, 6),
                        "note": "even the most favourable legal measurement stays below required - band",
                        **decided,
                    },
                )
            )

    for (first_label, first_point), (second_label, second_point) in itertools.combinations(base_holes, 2):
        distance = math.hypot(first_point[0] - second_point[0], first_point[1] - second_point[1])
        judge(
            first_label,
            second_label,
            distance,
            base_radius + base_radius,
            2.0 * base_center + 2.0 * radius_allowance,
            {"fixed_centers_xy": [list(first_point), list(second_point)], "both_fixed": True},
        )

    for first_label, first_point in base_holes:
        for second_label, _offset, x_bounds, y_bounds in sensor_holes:
            farthest = _farthest_corner(first_point, x_bounds, y_bounds)
            distance = math.hypot(first_point[0] - farthest[0], first_point[1] - farthest[1])
            judge(
                first_label,
                second_label,
                distance,
                base_radius + sensor_radius,
                base_center + sensor_center + 2.0 * radius_allowance,
                {
                    "fixed_center_xy": list(first_point),
                    "farthest_allowed_center_xy": list(farthest),
                    "sensor_center_domain": {"x": [cx0, cx1], "y": [cy0, cy1]},
                },
            )

    for (first_label, first_offset, *_rest), (second_label, second_offset, *_rest2) in itertools.combinations(sensor_holes, 2):
        distance = math.hypot(first_offset[0] - second_offset[0], first_offset[1] - second_offset[1])
        judge(
            first_label,
            second_label,
            distance,
            sensor_radius + sensor_radius,
            2.0 * sensor_center + 2.0 * radius_allowance,
            {"fixed_offsets": True},
        )
    return findings


# ---------------------------------------------------------------------------
# Unique-pose collision proofs (real OCCT solids, certified margin)
# ---------------------------------------------------------------------------


def _certified_ball_radius(solid: cq.Shape) -> float:
    """Distance from the solid's centre of mass to its boundary (convex ⇒ ball radius).

    The intersection of convex primitives is convex; for a convex body the
    distance from any interior point to the boundary is the largest ball
    centred at that point that is fully inside.
    """
    center = solid.Center()
    vertex = cq.Vertex(BRepBuilderAPI_MakeVertex(gp_Pnt(center.x, center.y, center.z)).Vertex())
    return min(float(vertex.distance(face)) for face in solid.Faces())


def _envelope_allowance(task: Mapping[str, Any]) -> dict[str, Any]:
    """Every way a legal artefact may move the *judged* device envelope, bounded.

    The acceptance judge derives the device pose from the measured hole group
    with a translation-only pattern match inside the dimensional tolerance and
    then compares the derived centre against the allowed range inside the
    comparison band; it always measures the nominal envelope (frozen body size,
    contract rotation 0) at that derived pose. A certificate over the whole
    tolerance domain therefore has to charge:

    ``translation``
        Euclidean magnitude bound on the rigid translation of any point of the
        envelope: 4·(tolerance + band) in x and y (anchor displacement plus
        match tolerance and range band, which also covers a hole group rotated
        within the match tolerance - the derived centre stays inside the same
        bound whether the match is the identity or a permuted/rotated one) and
        the editable thickness span plus twice the measured origin/thickness
        deviation in z.

    ``rotation``
        Radius a containment ball loses to an in-plane pattern rotation up to
        the match window ``θ = (tolerance + band) / R_offsets``: ``2·R·θ`` with
        ``R`` the grown body half-diagonal (rotating about the pattern centre).

    ``shrink``
        Radius a containment ball loses to a body built at the negative size
        tolerance: eroding by a square of half-width ``e`` costs ``e·√2``.
        Growing a body or plate only adds material, so it charges nothing.

    ``blocked``
        A non-``None`` reason the certificate refuses to make a claim at all:
        a hole group with no usable pattern, or off-centre offsets whose
        symmetry-induced pose ambiguity cannot be bounded by the terms above.
    """
    tolerance, band = _tolerance_terms(task)
    window = tolerance + band
    t_lo, t_hi = _dim_bounds(task["plate"], "thickness")
    span = t_hi - t_lo
    sensor = task["sensor"]
    body = [float(value) for value in sensor["body_size"]]
    offsets = [(float(offset[0]), float(offset[1])) for offset in sensor["hole_offsets"]]

    blocked: str | None = None
    if not offsets:
        blocked = "the sensor declares no hole offsets, so no pose can be bounded"
    elif max(math.hypot(dx, dy) for dx, dy in offsets) <= window:
        blocked = "the sensor hole pattern is smaller than its own tolerance window, so every pose matches"
    else:
        # A centred pattern keeps the cycle-sum argument exact: summing the
        # match inequalities over a cycle of any permuted/rotated match forces
        # |derived centre - design centre| <= 4·window, which is what x/y charge.
        sx = sum(dx for dx, _ in offsets)
        sy = sum(dy for _, dy in offsets)
        if math.hypot(sx, sy) > window:
            blocked = "the sensor hole pattern is not centred on the device pose this proof models"

    displacement = 4.0 * window
    z_displacement = span + 2.0 * window
    translation = math.sqrt(2.0 * displacement * displacement + z_displacement * z_displacement)
    r_offset = max((math.hypot(dx, dy) for dx, dy in offsets), default=0.0)
    r_body = math.hypot(body[0] / 2.0 + window, body[1] / 2.0 + window)
    rotation = 2.0 * r_body * (window / r_offset) if r_offset > 0 else 0.0
    shrink = math.sqrt(2.0) * window
    return {
        "blocked": blocked,
        "translation_mm": round(translation, 9),
        "rotation_mm": round(rotation, 9),
        "shrink_mm": round(shrink, 9),
        "window_mm": window,
        "tolerance_mm": tolerance,
        "band_mm": band,
        "thickness_span_mm": round(span, 9),
        "detail": {
            "xy_displacement_mm": round(displacement, 9),
            "z_displacement_mm": round(z_displacement, 9),
            "pattern_radius_mm": round(r_offset, 9),
            "body_half_diagonal_grown_mm": round(r_body, 9),
            "rotation_window_rad": round(window / r_offset, 9) if r_offset > 0 else None,
        },
    }


def _radius_for_volume(volume_mm3: float) -> float:
    """Radius of the ball whose volume is ``volume_mm3`` (the interference floor)."""
    return (3.0 * float(volume_mm3) / (4.0 * math.pi)) ** (1.0 / 3.0)


def _unique_pose(task: Mapping[str, Any]) -> tuple[float, float] | None:
    """The single allowed device centre, or ``None`` when the domain is not a point."""
    (cx0, cx1), (cy0, cy1) = _center_bounds(task["sensor"])
    if cx0 != cx1 or cy0 != cy1:
        return None
    return (cx0, cy0)


def _pose_solids(
    task: Mapping[str, Any],
    scene: Mapping[str, Any],
    pose: tuple[float, float],
    plate_top_z: float,
) -> tuple[list[tuple[str, cq.Shape]], list[tuple[str, cq.Shape]]] | None:
    """The same moving/fixed solid pairs the acceptance check measures.

    Moving: the device envelope and the connector envelope. Fixed: every scene
    cylinder, plus the plate itself when all of its dimensions are frozen
    (an editable plate would move, and a moving "fixed" solid is not something
    this proof layer will reason about).
    """
    try:
        model = scene_mod.SceneModel.from_scene(scene)
    except Exception:
        return None
    moving: list[tuple[str, cq.Shape]] = [
        ("sensor_body", scene_mod.sensor_body_solid(task, pose, plate_top_z))
    ]
    if model.connector_access is not None:
        moving.append((model.connector_access.id, model.connector_access_solid(pose)))
    fixed: list[tuple[str, cq.Shape]] = [(obj.id, model.solid_for_cylinder(obj)) for obj in model.fixed_cylinders]
    plate = task["plate"]
    if all(dim in (plate.get("locked") or []) for dim in ("width", "height", "thickness")):
        fixed.append(
            (
                "plate",
                scene_mod.box_solid(
                    (0.0, float(plate["width"])),
                    (0.0, float(plate["height"])),
                    (0.0, float(plate["thickness"])),
                ),
            )
        )
    return moving, fixed


def _collision_findings(task: Mapping[str, Any], scene: Mapping[str, Any]) -> tuple[list[Finding], list[str]]:
    pose = _unique_pose(task)
    notes: list[str] = []
    if pose is None:
        notes.append(
            "the allowed device-centre domain is not a single point, so no collision claim is made: "
            "a collision at one pose would not prove the whole domain infeasible"
        )
        return [], notes

    allowance = _envelope_allowance(task)
    if allowance["blocked"] is not None:
        notes.append(f"no collision claim is made: {allowance['blocked']}")
        return [], notes

    plate = task["plate"]
    tolerance, epsilon = _tolerance_terms(task)
    volume_epsilon = float(task["tolerances"]["interference_volume_epsilon_mm3"])
    t_lo, _t_hi = _dim_bounds(plate, "thickness")

    # The certificate: the nominal intersection contains a ball; the artefact's
    # envelope may translate by ``translation`` (device seat height, derived
    # centre error), rotate within the match window (``rotation``) and shrink
    # within the size tolerance (``shrink``); the fixed solids carry their own
    # cushion. What remains of the ball is still inside *every* allowed
    # artefact's intersection, and its volume decides the claim.
    moving_slack = float(allowance["translation_mm"])
    rotation_budget = float(allowance["rotation_mm"])
    shrink_budget = float(allowance["shrink_mm"])
    fixed_slack = tolerance + epsilon
    claim_threshold = max(CERTIFIED_MARGIN_MM, _radius_for_volume(volume_epsilon))

    solids = _pose_solids(task, scene, pose, t_lo)
    if solids is None:
        return [], ["the scene could not be turned into solids for a collision proof"]
    moving, fixed = solids

    findings: list[Finding] = []
    for moving_id, moving_solid in moving:
        for fixed_id, fixed_solid in fixed:
            # Every pair is measured for penetration, including the declared
            # support contact: touching is legal, intersecting is not.
            intersection_solid = moving_solid.intersect(fixed_solid)
            intersection = float(intersection_solid.Volume())
            if intersection <= volume_epsilon:
                continue
            ball = _certified_ball_radius(intersection_solid)
            certified = ball - rotation_budget - shrink_budget - (moving_slack + fixed_slack) / 2.0
            if certified > claim_threshold:
                findings.append(
                    Finding(
                        "SOLID_INTERFERENCE",
                        (moving_id, fixed_id),
                        {
                            "pose_xy": list(pose),
                            "intersection_volume_mm3": round(intersection, 9),
                            "interference_volume_epsilon_mm3": volume_epsilon,
                            "certified_ball_radius_mm": round(ball, 6),
                            "moving_slack_mm": round(moving_slack, 6),
                            "rotation_allowance_mm": round(rotation_budget, 6),
                            "size_shrink_allowance_mm": round(shrink_budget, 6),
                            "fixed_slack_mm": round(fixed_slack, 6),
                            "certified_margin_mm": round(certified, 6),
                            "claim_threshold_mm": round(claim_threshold, 6),
                            "allowance_detail": dict(allowance["detail"]),
                            "thickness_domain": list(_dim_bounds(plate, "thickness")),
                            "note": "the certified ball stays inside the intersection for every allowed thickness, pose tolerance, pattern rotation and size tolerance",
                        },
                    )
                )
    return findings, notes


def _clearance_findings(task: Mapping[str, Any], scene: Mapping[str, Any]) -> list[Finding]:
    """Clearance violations that hold for the entire (single-pose) domain.

    The acceptance check passes whenever the *measured* distance is at least
    ``clearance - band``, so proving "no legal artefact can pass" means bounding
    that measurement from **above**: even the most favourable placement within
    the declared tolerances must stay below the threshold. Distance is
    1-Lipschitz under displacement, so the upper bound is the nominal distance
    *plus* every allowance - never the nominal distance minus them (that is a
    lower bound, and using it declares tasks infeasible that a legal artefact
    clears).
    """
    pose = _unique_pose(task)
    if pose is None:
        return []
    allowance = _envelope_allowance(task)
    if allowance["blocked"] is not None:
        return []
    plate = task["plate"]
    tolerance, epsilon = _tolerance_terms(task)
    volume_epsilon = float(task["tolerances"]["interference_volume_epsilon_mm3"])
    clearance = float(task["requirements"]["minimum_free_clearance"])
    t_lo, _t_hi = _dim_bounds(plate, "thickness")
    moving_slack = float(allowance["translation_mm"]) + float(allowance["rotation_mm"]) + float(allowance["shrink_mm"])
    fixed_slack = tolerance + epsilon
    solids = _pose_solids(task, scene, pose, t_lo)
    if solids is None:
        return []
    moving, fixed = solids

    findings: list[Finding] = []
    for moving_id, moving_solid in moving:
        for fixed_id, fixed_solid in fixed:
            if moving_id == "sensor_body" and fixed_id == "plate":
                continue  # support contact: contact is legal, penetration is G01/G06's business
            if float(moving_solid.intersect(fixed_solid).Volume()) > volume_epsilon:
                continue  # already reported as an interference
            distance = float(moving_solid.distance(fixed_solid))
            best_possible_distance = distance + moving_slack + fixed_slack
            margin = (clearance - epsilon) - best_possible_distance
            if margin > max(CERTIFIED_MARGIN_MM, epsilon):
                findings.append(
                    Finding(
                        "CLEARANCE_VIOLATION",
                        (moving_id, fixed_id),
                        {
                            "pose_xy": list(pose),
                            "required_clearance_mm": clearance,
                            "measured_distance_mm": round(distance, 6),
                            "best_possible_distance_mm": round(best_possible_distance, 6),
                            "margin_mm": round(margin, 6),
                            "thickness_domain": list(_dim_bounds(plate, "thickness")),
                            "note": "even a measurement at the favourable end of every declared tolerance stays below required - band",
                        },
                    )
                )
    return findings


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def preflight_task(task: Mapping[str, Any], scene: Mapping[str, Any]) -> PreflightResult:
    """Classify one frozen task/scene pair before any geometry is generated.

    Returns ``OK`` when this layer has no *proof* of a defect - which explicitly
    includes "the domain is too wide to prove anything", not just "the task is
    solvable". The authoritative structural contract is
    :func:`fitplate.schema.load_task_bundle`; this function re-uses that
    vocabulary for the two refusal outcomes it can also detect on its own.
    """
    structural = _structural(task, scene)
    if structural is not None:
        return structural

    findings: list[Finding] = []
    findings.extend(_edge_findings(task))
    findings.extend(_hole_ligament_findings(task))
    collision, notes = _collision_findings(task, scene)
    findings.extend(collision)
    findings.extend(_clearance_findings(task, scene))

    if findings:
        worst = findings[0]
        return PreflightResult(
            OUTCOME_INFEASIBLE,
            "INFEASIBLE_CONSTRAINT",
            f"no design inside the allowed domain can pass: {worst.kind} on {', '.join(worst.objects)}",
            findings=tuple(findings),
            notes=tuple(notes),
        )
    return PreflightResult(
        OUTCOME_OK,
        "OK",
        "no provable conflict was found inside the allowed design domain",
        notes=tuple(notes),
    )


__all__ = [
    "CERTIFIED_MARGIN_MM",
    "Finding",
    "OUTCOME_INFEASIBLE",
    "OUTCOME_INVALID_SPEC",
    "OUTCOME_NEEDS_INPUT",
    "OUTCOME_OK",
    "PreflightResult",
    "preflight_task",
]
