"""STEP re-measurement (T04): read the *actual* artefact, never the parameters.

Everything in this module works on a shape imported from a STEP file on disk.
Nothing here accepts a DesignSpec, a generator return value or any parameter of
the build that produced the file: the acceptance rules in the plan (G01-G08)
must be decided by what the solid actually is.

Feature recognition for version 1.0 (rectangular plate, circular through holes,
no chamfers/countersinks/threads):

* a hole is a group of **cylindrical faces sharing one axis line and one
  radius**; a single hole may be split into several faces by a seam or by a
  boolean, so faces are clustered, not counted (a split cylinder is *one* hole);
* a *through* hole needs all of: the cylinder reaching both plate faces, a
  complete circular rim at both ends (total angular span 2*pi), and a probe
  cylinder at the measured axis that meets no material between the faces. A
  blind hole fails the first test, an edge-open hole fails the rim test, and a
  hole blocked by material fails the probe test;
* any cylindrical face whose axis is not parallel to Z, and any face that is
  neither a plane nor a cylinder, is reported as an unsupported feature - it is
  never approximated into "looks like a hole" or "looks fine".

A second, deliberately different measurement route
(:func:`measure_holes_at_section`) reads hole positions from planar
cross-sections instead of cylinder faces. G07 uses it to re-check frozen
features with an independent method rather than re-reading its own numbers.

The mesh export (:func:`tessellate_budgeted`) always re-tessellates the entity
that was re-imported from the STEP file, so the preview can never show a shape
drawn from parameters.
"""

from __future__ import annotations

import json
import math
import struct
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

import cadquery as cq
from OCP.Bnd import Bnd_Box
from OCP.BRepAdaptor import BRepAdaptor_Curve, BRepAdaptor_Surface
from OCP.BRepBndLib import BRepBndLib
from OCP.BRepTools import BRepTools
from OCP.GeomAbs import GeomAbs_CurveType, GeomAbs_SurfaceType

from .errors import (
    CODE_ARTEFACT_MISSING,
    CODE_MESH_BUDGET_EXCEEDED,
    CODE_STEP_IMPORT_FAILED,
    CODE_STL_TRUNCATED,
    CODE_STL_UNREADABLE,
    ExecutionFailure,
)

VERSION = "fitplate-inspect/1.0.0"

#: Rim completeness tolerance, radians. A real full circle measures 2*pi to
#: within 1e-12 rad; the smallest incomplete rim we must catch is only bounded
#: by the scene geometry, so a micro-radian band is already conservative.
RIM_SPAN_TOLERANCE_RAD = 1e-3

#: Preview mesh budget (plan section 11: about 4,000 triangles and a 512 KiB
#: scene response). Both caps apply at once.
PREVIEW_TRIANGLE_BUDGET = 4000
PREVIEW_BYTE_BUDGET = 512 * 1024

#: Tessellation levels tried in order when the budget is exceeded. Coarsening
#: changes only the preview mesh, never the STEP geometry.
TESSELLATION_LEVELS: tuple[tuple[float, float], ...] = (
    (0.05, 0.10),
    (0.10, 0.30),
    (0.20, 0.50),
    (0.30, 0.70),
    (0.50, 0.90),
)

#: Declared preview-mesh tolerances are only believable inside finite bounds: a
#: mesh may not claim a deflection far outside the levels this project ever
#: uses, or a "giant tolerance" would let an arbitrarily coarse mesh be
#: re-derived from the STEP and pass as the same geometry. The coarsest level
#: above is 0.5 mm / 0.9 rad; 1e-4 mm is two decades finer than the finest
#: level, so a legitimate generator is never squeezed while a hostile mesh is.
MIN_PREVIEW_TOLERANCE_MM = 1e-4
MAX_PREVIEW_TOLERANCE_MM = 0.5
MIN_PREVIEW_ANGULAR_TOLERANCE_RAD = 1e-6
MAX_PREVIEW_ANGULAR_TOLERANCE_RAD = math.pi / 2.0

#: Coordinate quantum of the preview mesh JSON (the writer rounds to 6 decimals)
#: and the area below which a triangle is treated as degenerate.
MESH_COORD_QUANTUM = 1e-6
MESH_DEGENERATE_AREA_MM2 = 1e-12

#: Machine codes for a preview mesh payload that cannot be used as evidence.
MESH_PROBLEM_MALFORMED = "MESH_PROBLEM_MALFORMED"
MESH_PROBLEM_TOLERANCE_MISSING = "MESH_PROBLEM_TOLERANCE_MISSING"
MESH_PROBLEM_TOLERANCE_OUT_OF_RANGE = "MESH_PROBLEM_TOLERANCE_OUT_OF_RANGE"
MESH_PROBLEM_DEGENERATE = "MESH_PROBLEM_DEGENERATE"


# --------------------------------------------------------------------------
# Import
# --------------------------------------------------------------------------


def exact_bbox(shape: Any) -> tuple[float, float, float, float, float, float]:
    """Geometry-based bounding box, independent of any cached triangulation.

    ``Shape.BoundingBox()`` in CadQuery asks OCCT for an "optimal" box that, once
    a shape has been meshed for preview, is measured *on the mesh* and comes
    back inflated by the tessellation deflection (about 6 um at 0.05 mm on a
    4 mm plate - small, but it silently turned every through hole into a "blind
    hole" in an earlier revision of this module). Measurement must not depend on
    whether a preview has been generated, so the box is always rebuilt from the
    geometry with ``useTriangulation=False``.
    """
    box = Bnd_Box()
    BRepBndLib.AddOptimal_s(shape.wrapped, box, False, False)
    x_min, y_min, z_min, x_max, y_max, z_max = box.Get()
    return (float(x_min), float(y_min), float(z_min), float(x_max), float(y_max), float(z_max))


def import_step(path: str | Path) -> cq.Shape:
    """Import a STEP file and return its shape.

    Raises :class:`ExecutionFailure` (never a silent ``None``) when the file is
    missing, empty or unreadable: a truncated STEP must surface as a real
    failure so G01 can report UNKNOWN instead of a checker crash.
    """
    path = Path(path)
    if not path.is_file():
        raise ExecutionFailure(CODE_ARTEFACT_MISSING, f"STEP file does not exist: {path}")
    if path.stat().st_size == 0:
        raise ExecutionFailure(CODE_STEP_IMPORT_FAILED, f"STEP file is empty: {path}")
    try:
        result = cq.importers.importStep(str(path))
    except Exception as exc:  # cadquery raises ValueError for unreadable STEP
        raise ExecutionFailure(
            CODE_STEP_IMPORT_FAILED,
            f"STEP file could not be read by the kernel: {path} ({type(exc).__name__}: {exc})",
        ) from exc
    try:
        shape = result.val()
    except Exception as exc:
        raise ExecutionFailure(
            CODE_STEP_IMPORT_FAILED,
            f"STEP file contained no usable shape: {path} ({type(exc).__name__}: {exc})",
        ) from exc
    if shape is None:
        raise ExecutionFailure(CODE_STEP_IMPORT_FAILED, f"STEP file contained no shape: {path}")
    return shape


# --------------------------------------------------------------------------
# Whole-shape facts
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class ShapeFacts:
    """What the solid actually is, measured from the re-imported entity."""

    shape_kind: str
    valid: bool
    volume_mm3: float
    bbox_min: tuple[float, float, float]
    bbox_max: tuple[float, float, float]
    solid_count: int
    shell_count: int
    free_shape_count: int
    face_count: int
    edge_count: int
    vertex_count: int
    face_geom_types: dict[str, int]
    non_z_cylinders: int

    @property
    def size_xyz(self) -> tuple[float, float, float]:
        return (
            self.bbox_max[0] - self.bbox_min[0],
            self.bbox_max[1] - self.bbox_min[1],
            self.bbox_max[2] - self.bbox_min[2],
        )

    @property
    def is_single_connected_solid(self) -> bool:
        return (
            self.solid_count == 1
            and self.shell_count == 1
            and self.free_shape_count == 0
            and self.volume_mm3 > 0.0
        )

    @property
    def supported_feature_set(self) -> bool:
        """True when every face is a plane or a Z-parallel cylinder (version 1.0 scope)."""
        unexpected = {name: count for name, count in self.face_geom_types.items() if name not in ("PLANE", "CYLINDER")}
        return not unexpected and self.non_z_cylinders == 0

    def as_measured(self) -> dict[str, Any]:
        return {
            "valid": self.valid,
            "volume_mm3": round(self.volume_mm3, 6),
            "solid_count": self.solid_count,
            "shell_count": self.shell_count,
            "free_shape_count": self.free_shape_count,
            "size_x_mm": round(self.size_xyz[0], 6),
            "size_y_mm": round(self.size_xyz[1], 6),
            "size_z_mm": round(self.size_xyz[2], 6),
            "bbox_min_x_mm": round(self.bbox_min[0], 6),
            "bbox_min_y_mm": round(self.bbox_min[1], 6),
            "bbox_min_z_mm": round(self.bbox_min[2], 6),
            "bbox_max_x_mm": round(self.bbox_max[0], 6),
            "bbox_max_y_mm": round(self.bbox_max[1], 6),
            "bbox_max_z_mm": round(self.bbox_max[2], 6),
        }


def measure_shape(shape: cq.Shape) -> ShapeFacts:
    """Measure validity, volume, bounding box and topology counts."""
    x_min, y_min, z_min, x_max, y_max, z_max = exact_bbox(shape)
    face_types: dict[str, int] = {}
    non_z_cylinders = 0
    for face in shape.Faces():
        kind = face.geomType()
        face_types[kind] = face_types.get(kind, 0) + 1
        if kind == "CYLINDER":
            surf = BRepAdaptor_Surface(face.wrapped)
            if surf.GetType() == GeomAbs_SurfaceType.GeomAbs_Cylinder:
                direction = surf.Cylinder().Axis().Direction()
                if abs(abs(direction.Z()) - 1.0) > 1e-9:
                    non_z_cylinders += 1
    try:
        free = len(shape.Free())
    except Exception:  # pragma: no cover - defensive: Free() is stable in OCP 7.9
        free = 0
    return ShapeFacts(
        shape_kind=type(shape).__name__,
        valid=bool(shape.isValid()),
        volume_mm3=float(shape.Volume()),
        bbox_min=(x_min, y_min, z_min),
        bbox_max=(x_max, y_max, z_max),
        solid_count=len(shape.Solids()),
        shell_count=len(shape.Shells()),
        free_shape_count=free,
        face_count=len(shape.Faces()),
        edge_count=len(shape.Edges()),
        vertex_count=len(shape.Vertices()),
        face_geom_types=face_types,
        non_z_cylinders=non_z_cylinders,
    )


# --------------------------------------------------------------------------
# Hole recognition
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class HoleFacts:
    """One hole, grouped from the actual cylindrical faces of the artefact."""

    axis_xy: tuple[float, float]
    radius: float
    z_min: float
    z_max: float
    face_count: int
    rim_top_span_rad: float
    rim_bottom_span_rad: float
    occluded_volume_mm3: float
    plate_z_min: float
    plate_z_max: float
    eps: float

    @property
    def diameter(self) -> float:
        return 2.0 * self.radius

    @property
    def depth(self) -> float:
        return self.z_max - self.z_min

    @property
    def reaches_bottom_face(self) -> bool:
        return abs(self.z_min - self.plate_z_min) <= self.eps

    @property
    def reaches_top_face(self) -> bool:
        return abs(self.z_max - self.plate_z_max) <= self.eps

    @property
    def rim_top_complete(self) -> bool:
        return self.rim_top_span_rad >= 2.0 * math.pi - RIM_SPAN_TOLERANCE_RAD

    @property
    def rim_bottom_complete(self) -> bool:
        return self.rim_bottom_span_rad >= 2.0 * math.pi - RIM_SPAN_TOLERANCE_RAD

    @property
    def is_through(self) -> bool:
        """A complete through hole: both faces reached, both rims whole, no material across."""
        return (
            self.reaches_bottom_face
            and self.reaches_top_face
            and self.rim_top_complete
            and self.rim_bottom_complete
            and self.occluded_volume_mm3 <= 1e-6
        )

    @property
    def defect(self) -> str | None:
        """Why this group is not a valid through hole (``None`` when it is one)."""
        if not self.reaches_top_face or not self.reaches_bottom_face:
            return "BLIND_OR_PARTIAL_DEPTH"
        if not (self.rim_top_complete and self.rim_bottom_complete):
            return "INCOMPLETE_RIM"
        if self.occluded_volume_mm3 > 1e-6:
            return "OCCLUDED"
        return None

    def as_dict(self) -> dict[str, Any]:
        return {
            "axis_xy": [round(self.axis_xy[0], 6), round(self.axis_xy[1], 6)],
            "diameter_mm": round(self.diameter, 6),
            "radius_mm": round(self.radius, 6),
            "z_min_mm": round(self.z_min, 6),
            "z_max_mm": round(self.z_max, 6),
            "depth_mm": round(self.depth, 6),
            "through": self.is_through,
            "defect": self.defect,
            "faces": self.face_count,
            "rim_top_span_deg": round(math.degrees(self.rim_top_span_rad), 6),
            "rim_bottom_span_deg": round(math.degrees(self.rim_bottom_span_rad), 6),
            "occluded_volume_mm3": round(self.occluded_volume_mm3, 9),
        }


@dataclass
class _CylFace:
    face: Any
    radius: float
    axis_x: float
    axis_y: float
    z_min: float
    z_max: float


@dataclass(frozen=True)
class _CircleEdge:
    """A circular edge described by its *true* circle, not its arc centroid.

    ``Edge.Center()`` returns the centre of mass of the edge, which for an arc
    is not the circle centre; a hole split into several faces is bounded by
    arcs, so the circle must be read from the curve itself.
    """

    span_rad: float
    center: tuple[float, float, float]
    radius: float


def _circle_edge(edge: Any) -> _CircleEdge | None:
    """Circle facts of an edge, or ``None`` when the edge is not a circle."""
    if edge.geomType() != "CIRCLE":
        return None
    curve = BRepAdaptor_Curve(edge.wrapped)
    if curve.GetType() != GeomAbs_CurveType.GeomAbs_Circle:
        return None
    circle = curve.Circle()
    location = circle.Location()
    span = abs(curve.LastParameter() - curve.FirstParameter())
    if span > 2.0 * math.pi + 1e-9:
        span = 2.0 * math.pi
    return _CircleEdge(
        span_rad=span,
        center=(float(location.X()), float(location.Y()), float(location.Z())),
        radius=float(circle.Radius()),
    )


def _circle_span_rad(edge: Any) -> float | None:
    """Angular span of a circular edge, or ``None`` when it is not a circle."""
    info = _circle_edge(edge)
    return None if info is None else info.span_rad


def _cluster_key(radius: float, axis_x: float, axis_y: float) -> tuple[float, float, float]:
    return (round(radius, 6), round(axis_x, 6), round(axis_y, 6))


def extract_holes(
    shape: cq.Shape,
    *,
    plate_z_range: tuple[float, float],
    eps: float,
    volume_eps: float,
) -> list[HoleFacts]:
    """Group cylindrical faces into holes and measure each one.

    ``plate_z_range`` is the *measured* plate extent along Z (from the bounding
    box of the re-imported solid), not a value from the task document.
    """
    plate_z_min, plate_z_max = float(plate_z_range[0]), float(plate_z_range[1])
    clusters: dict[tuple[float, float, float], list[_CylFace]] = {}
    for face in shape.Faces():
        if face.geomType() != "CYLINDER":
            continue
        surf = BRepAdaptor_Surface(face.wrapped)
        if surf.GetType() != GeomAbs_SurfaceType.GeomAbs_Cylinder:
            continue
        cylinder = surf.Cylinder()
        axis = cylinder.Axis()
        direction = axis.Direction()
        location = axis.Location()
        if abs(abs(direction.Z()) - 1.0) > 1e-9:
            # A non-Z cylinder is not a mounting hole in this frame; it is
            # reported via ShapeFacts.non_z_cylinders and refused there.
            continue
        _, _, face_z_min, _, _, face_z_max = exact_bbox(face)
        entry = _CylFace(
            face=face,
            radius=float(cylinder.Radius()),
            axis_x=float(location.X()),
            axis_y=float(location.Y()),
            z_min=face_z_min,
            z_max=face_z_max,
        )
        clusters.setdefault(_cluster_key(entry.radius, entry.axis_x, entry.axis_y), []).append(entry)

    holes: list[HoleFacts] = []
    for faces in clusters.values():
        radius = faces[0].radius
        axis_x = faces[0].axis_x
        axis_y = faces[0].axis_y
        z_min = min(item.z_min for item in faces)
        z_max = max(item.z_max for item in faces)
        top_span = 0.0
        bottom_span = 0.0
        for item in faces:
            for edge in item.face.Edges():
                info = _circle_edge(edge)
                if info is None:
                    continue
                if abs(info.radius - radius) > max(eps, 1e-9):
                    continue
                if abs(info.center[0] - axis_x) > max(eps, 1e-9) or abs(info.center[1] - axis_y) > max(eps, 1e-9):
                    continue
                if abs(info.center[2] - z_max) <= max(eps, 1e-9):
                    top_span += info.span_rad
                elif abs(info.center[2] - z_min) <= max(eps, 1e-9):
                    bottom_span += info.span_rad
        holes.append(
            HoleFacts(
                axis_xy=(axis_x, axis_y),
                radius=radius,
                z_min=z_min,
                z_max=z_max,
                face_count=len(faces),
                rim_top_span_rad=min(top_span, 2.0 * math.pi),
                rim_bottom_span_rad=min(bottom_span, 2.0 * math.pi),
                occluded_volume_mm3=_probe_occlusion(
                    shape, axis_x, axis_y, radius, plate_z_min, plate_z_max, eps
                ),
                plate_z_min=plate_z_min,
                plate_z_max=plate_z_max,
                eps=eps,
            )
        )
    holes.sort(key=lambda hole: (round(hole.axis_xy[0], 6), round(hole.axis_xy[1], 6), round(hole.radius, 6)))
    return holes


def _probe_occlusion(
    shape: cq.Shape,
    axis_x: float,
    axis_y: float,
    radius: float,
    plate_z_min: float,
    plate_z_max: float,
    eps: float,
) -> float:
    """Material volume found inside a slim probe cylinder at the measured axis.

    A through hole leaves the probe empty; a blind hole, a blocked hole or a
    hole that stops short of a face leaves measurable material behind.
    """
    probe_radius = max(0.05, radius * 0.8)
    if probe_radius >= radius:
        probe_radius = max(0.01, radius * 0.5)
    z_lo = plate_z_min - max(1.0, eps * 100.0)
    height = (plate_z_max + max(1.0, eps * 100.0)) - z_lo
    probe = cq.Solid.makeCylinder(probe_radius, height, cq.Vector(axis_x, axis_y, z_lo), cq.Vector(0, 0, 1))
    intersection = shape.intersect(probe)
    return float(intersection.Volume())


# --------------------------------------------------------------------------
# Independent section-based route (used by G07)
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class SectionHole:
    """A circular hole boundary found on a planar cross-section."""

    center_xy: tuple[float, float]
    radius: float
    z: float

    def as_dict(self) -> dict[str, Any]:
        return {
            "center_xy": [round(self.center_xy[0], 6), round(self.center_xy[1], 6)],
            "radius_mm": round(self.radius, 6),
            "z_mm": round(self.z, 6),
        }


def measure_holes_at_section(
    shape: cq.Shape,
    z: float,
    *,
    xy_pad: float = 10.0,
    thickness: float = 0.5,
) -> list[SectionHole]:
    """Measure hole boundaries on a planar section at height ``z``.

    This is a different route from :func:`extract_holes`: it slices the solid
    with a thin slab and reads *circular wires on the resulting planar faces*.
    A hole that does not exist at that height (a blind hole above the section)
    simply does not appear, which makes this a genuine cross-check rather than
    the same measurement restated.
    """
    x_min, y_min, _, x_max, y_max, _ = exact_bbox(shape)
    slab = cq.Solid.makeBox(
        (x_max - x_min) + 2.0 * xy_pad,
        (y_max - y_min) + 2.0 * xy_pad,
        thickness,
        cq.Vector(x_min - xy_pad, y_min - xy_pad, z - thickness / 2.0),
    )
    sliced = shape.intersect(slab)
    holes: list[SectionHole] = []
    for face in sliced.Faces():
        if face.geomType() != "PLANE":
            continue
        normal = face.normalAt(cq.Vector(0, 0, 0))
        if abs(abs(normal.z) - 1.0) > 1e-6:
            continue
        for wire in face.Wires():
            edges = wire.Edges()
            if not edges:
                continue
            spans: list[float] = []
            centers: list[tuple[float, float, float]] = []
            radii: list[float] = []
            for edge in edges:
                info = _circle_edge(edge)
                if info is None:
                    spans = []
                    break
                centers.append(info.center)
                radii.append(info.radius)
                spans.append(info.span_rad)
            if not spans:
                continue
            if sum(spans) < 2.0 * math.pi - RIM_SPAN_TOLERANCE_RAD:
                continue
            # Every arc of one boundary must belong to the same circle.
            first_center = centers[0]
            first_radius = radii[0]
            if any(
                abs(item[0] - first_center[0]) > 1e-6
                or abs(item[1] - first_center[1]) > 1e-6
                or abs(radius - first_radius) > 1e-6
                for item, radius in zip(centers, radii)
            ):
                continue
            radius = first_radius
            center_x = first_center[0]
            center_y = first_center[1]
            holes.append(SectionHole(center_xy=(center_x, center_y), radius=radius, z=z))
    # Both slab faces carry the same boundary wires; de-duplicate by position.
    unique: dict[tuple[int, int, int], SectionHole] = {}
    for hole in holes:
        key = (
            round(hole.center_xy[0] * 1e6),
            round(hole.center_xy[1] * 1e6),
            round(hole.radius * 1e6),
        )
        unique.setdefault(key, hole)
    result = sorted(unique.values(), key=lambda hole: (round(hole.center_xy[0], 6), round(hole.center_xy[1], 6)))
    return result


# --------------------------------------------------------------------------
# Preview mesh
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Mesh:
    """A tessellation of the re-imported entity, bounded to a preview budget."""

    vertices: tuple[float, ...]
    indices: tuple[int, ...]
    bounds_min: tuple[float, float, float]
    bounds_max: tuple[float, float, float]
    tolerance: float
    angular_tolerance: float
    payload_bytes: int
    levels_tried: int

    @property
    def triangle_count(self) -> int:
        return len(self.indices) // 3

    @property
    def vertex_count(self) -> int:
        return len(self.vertices) // 3


def _clean_mesh(shape: cq.Shape) -> None:
    """Drop any cached triangulation so a new deflection is actually applied."""
    for face in shape.Faces():
        BRepTools.Clean_s(face.wrapped)


def tessellate_budgeted(
    shape: cq.Shape,
    *,
    prefix: dict[str, Any],
    triangle_budget: int = PREVIEW_TRIANGLE_BUDGET,
    byte_budget: int = PREVIEW_BYTE_BUDGET,
    levels: Sequence[tuple[float, float]] = TESSELLATION_LEVELS,
) -> Mesh:
    """Tessellate the *given* (re-imported) shape within the preview budget.

    When a level exceeds the budget the next, coarser level is tried; the STEP
    geometry is untouched - only the visual mesh changes. If even the coarsest
    level is over budget, the build fails explicitly with
    ``MESH_BUDGET_EXCEEDED`` rather than shipping a silently truncated mesh.
    """
    last_bytes = 0
    last_triangles = 0
    for index, (tolerance, angular) in enumerate(levels):
        _clean_mesh(shape)
        vertices, triangles = shape.tessellate(tolerance, angular)
        flat_vertices = tuple(
            round(component, 6) for vertex in vertices for component in (vertex.x, vertex.y, vertex.z)
        )
        flat_indices = tuple(int(item) for triangle in triangles for item in triangle)
        bounds_min = (
            min(flat_vertices[0::3], default=0.0),
            min(flat_vertices[1::3], default=0.0),
            min(flat_vertices[2::3], default=0.0),
        )
        bounds_max = (
            max(flat_vertices[0::3], default=0.0),
            max(flat_vertices[1::3], default=0.0),
            max(flat_vertices[2::3], default=0.0),
        )
        payload = {
            **prefix,
            "tolerance_mm": tolerance,
            "angular_tolerance_rad": angular,
            "vertices": flat_vertices,
            "indices": flat_indices,
            "bounds": {"min": list(bounds_min), "max": list(bounds_max)},
        }
        encoded = json.dumps(payload, separators=(",", ":"), allow_nan=False).encode("utf-8")
        last_bytes = len(encoded)
        last_triangles = len(flat_indices) // 3
        if last_triangles <= triangle_budget and last_bytes <= byte_budget:
            return Mesh(
                vertices=flat_vertices,
                indices=flat_indices,
                bounds_min=bounds_min,
                bounds_max=bounds_max,
                tolerance=tolerance,
                angular_tolerance=angular,
                payload_bytes=last_bytes,
                levels_tried=index + 1,
            )
    raise ExecutionFailure(
        CODE_MESH_BUDGET_EXCEEDED,
        (
            f"preview mesh stays over budget at the coarsest tessellation level: "
            f"{last_triangles} triangles (limit {triangle_budget}), {last_bytes} bytes (limit {byte_budget}). "
            "The STEP geometry was not modified or truncated."
        ),
        {"triangles": last_triangles, "bytes": last_bytes},
    )


# --------------------------------------------------------------------------
# Preview mesh payload analysis (structure, bounds, volume)
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class MeshPayload:
    """The measurable content of a declared preview mesh document."""

    tolerance_mm: float
    angular_tolerance_rad: float
    vertex_count: int
    triangle_count: int
    bounds_min: tuple[float, float, float]
    bounds_max: tuple[float, float, float]
    volume_mm3: float
    degenerate_triangles: int

    @property
    def size_xyz(self) -> tuple[float, float, float]:
        return tuple(self.bounds_max[axis] - self.bounds_min[axis] for axis in range(3))  # type: ignore[return-value]


@dataclass(frozen=True)
class MeshAnalysis:
    """Result of reading a ``preview_mesh.json`` payload.

    ``facts`` is present whenever the vertex/index structure itself is usable,
    even if the declared tolerances are missing: the caller decides the verdict.
    ``problem`` is ``None`` when the payload is structurally sound *and* carries
    believable tolerances.
    """

    problem: str | None
    detail: str | None
    facts: MeshPayload | None

    @property
    def ok(self) -> bool:
        return self.problem is None and self.facts is not None


def _mesh_problem(code: str, detail: str, facts: MeshPayload | None = None) -> MeshAnalysis:
    return MeshAnalysis(problem=code, detail=detail, facts=facts)


def analyze_preview_mesh(doc: Any) -> MeshAnalysis:
    """Validate a preview mesh payload against its declared content.

    Every element is checked - finiteness, index range, triangle degeneracy,
    bounds consistency and the declared tolerances - and the enclosed volume is
    measured from the triangles themselves. The caller then compares those
    facts with a re-tessellation of the actual STEP entity; nothing here trusts
    a declared hash or a triangle count.
    """
    if not isinstance(doc, Mapping):
        return _mesh_problem(MESH_PROBLEM_MALFORMED, "the mesh document is not a JSON object")
    raw_vertices = doc.get("vertices")
    raw_indices = doc.get("indices")
    if not isinstance(raw_vertices, list) or not isinstance(raw_indices, list):
        return _mesh_problem(MESH_PROBLEM_MALFORMED, "vertices/indices must both be arrays")
    if len(raw_vertices) % 3 != 0 or len(raw_vertices) < 9:
        return _mesh_problem(MESH_PROBLEM_MALFORMED, "the vertex array is not a non-empty multiple of 3")
    if len(raw_indices) % 3 != 0 or len(raw_indices) < 3:
        return _mesh_problem(MESH_PROBLEM_MALFORMED, "the index array is not a non-empty multiple of 3")

    vertices: list[tuple[float, float, float]] = []
    for offset in range(0, len(raw_vertices), 3):
        triple = raw_vertices[offset : offset + 3]
        if any(isinstance(component, bool) or not isinstance(component, (int, float)) for component in triple):
            return _mesh_problem(MESH_PROBLEM_MALFORMED, f"vertex {offset // 3} is not three numbers")
        point = (float(triple[0]), float(triple[1]), float(triple[2]))
        if any(not math.isfinite(component) for component in point):
            return _mesh_problem(MESH_PROBLEM_MALFORMED, f"vertex {offset // 3} is not finite")
        vertices.append(point)

    vertex_count = len(vertices)
    indices: list[int] = []
    for position, value in enumerate(raw_indices):
        if isinstance(value, bool) or not isinstance(value, int):
            return _mesh_problem(MESH_PROBLEM_MALFORMED, f"index {position} is not an integer")
        if value < 0 or value >= vertex_count:
            return _mesh_problem(
                MESH_PROBLEM_MALFORMED,
                f"index {position} = {value} is outside 0..{vertex_count - 1}",
            )
        indices.append(value)

    bounds_min = (
        min(point[0] for point in vertices),
        min(point[1] for point in vertices),
        min(point[2] for point in vertices),
    )
    bounds_max = (
        max(point[0] for point in vertices),
        max(point[1] for point in vertices),
        max(point[2] for point in vertices),
    )

    volume = 0.0
    degenerate = 0
    for offset in range(0, len(indices), 3):
        a, b, c = vertices[indices[offset]], vertices[indices[offset + 1]], vertices[indices[offset + 2]]
        volume += (
            a[0] * (b[1] * c[2] - b[2] * c[1])
            - a[1] * (b[0] * c[2] - b[2] * c[0])
            + a[2] * (b[0] * c[1] - b[1] * c[0])
        ) / 6.0
        if len({a, b, c}) < 3 or _triangle_area(a, b, c) <= MESH_DEGENERATE_AREA_MM2:
            degenerate += 1

    tolerance = doc.get("tolerance_mm")
    angular = doc.get("angular_tolerance_rad")
    if (
        isinstance(tolerance, bool)
        or not isinstance(tolerance, (int, float))
        or not math.isfinite(float(tolerance))
        or isinstance(angular, bool)
        or not isinstance(angular, (int, float))
        or not math.isfinite(float(angular))
    ):
        return _mesh_problem(
            MESH_PROBLEM_TOLERANCE_MISSING,
            "the mesh does not declare finite tolerance_mm / angular_tolerance_rad",
            _payload(tolerance, angular, vertex_count, len(indices) // 3, bounds_min, bounds_max, volume, degenerate),
        )

    facts = _payload(tolerance, angular, vertex_count, len(indices) // 3, bounds_min, bounds_max, volume, degenerate)
    if degenerate:
        return _mesh_problem(
            MESH_PROBLEM_DEGENERATE,
            f"{degenerate} of {facts.triangle_count} triangles have zero area",
            facts,
        )
    tolerance_mm = float(tolerance)
    if not (MIN_PREVIEW_TOLERANCE_MM <= tolerance_mm <= MAX_PREVIEW_TOLERANCE_MM):
        return _mesh_problem(
            MESH_PROBLEM_TOLERANCE_OUT_OF_RANGE,
            f"declared tolerance_mm={tolerance_mm} is outside [{MIN_PREVIEW_TOLERANCE_MM}, {MAX_PREVIEW_TOLERANCE_MM}]",
            facts,
        )
    angular_rad = float(angular)
    if not (MIN_PREVIEW_ANGULAR_TOLERANCE_RAD <= angular_rad <= MAX_PREVIEW_ANGULAR_TOLERANCE_RAD):
        return _mesh_problem(
            MESH_PROBLEM_TOLERANCE_OUT_OF_RANGE,
            f"declared angular_tolerance_rad={angular_rad} is outside "
            f"[{MIN_PREVIEW_ANGULAR_TOLERANCE_RAD}, {MAX_PREVIEW_ANGULAR_TOLERANCE_RAD}]",
            facts,
        )
    return MeshAnalysis(problem=None, detail=None, facts=facts)


def _payload(
    tolerance: Any,
    angular: Any,
    vertex_count: int,
    triangle_count: int,
    bounds_min: tuple[float, float, float],
    bounds_max: tuple[float, float, float],
    volume: float,
    degenerate: int,
) -> MeshPayload:
    return MeshPayload(
        tolerance_mm=float(tolerance) if isinstance(tolerance, (int, float)) and not isinstance(tolerance, bool) else float("nan"),
        angular_tolerance_rad=(
            float(angular) if isinstance(angular, (int, float)) and not isinstance(angular, bool) else float("nan")
        ),
        vertex_count=vertex_count,
        triangle_count=triangle_count,
        bounds_min=bounds_min,
        bounds_max=bounds_max,
        volume_mm3=volume,
        degenerate_triangles=degenerate,
    )


def _triangle_area(
    a: tuple[float, float, float],
    b: tuple[float, float, float],
    c: tuple[float, float, float],
) -> float:
    ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
    vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
    nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
    return 0.5 * math.sqrt(nx * nx + ny * ny + nz * nz)


def triangle_key_set(vertices: Sequence[float], indices: Sequence[int]) -> "Counter[tuple]":
    """Triangles as a multiset of rounded corner triples, independent of vertex order.

    Two meshes with the same triangles stored in a different vertex order (or a
    different vertex order inside a triangle) produce the same multiset; a mesh
    of different geometry never does.
    """
    from collections import Counter

    keys: Counter[tuple] = Counter()
    for offset in range(0, len(indices), 3):
        corners = []
        for index in indices[offset : offset + 3]:
            base = 3 * index
            corners.append(
                (
                    round(vertices[base], 6),
                    round(vertices[base + 1], 6),
                    round(vertices[base + 2], 6),
                )
            )
        keys[tuple(sorted(corners))] += 1
    return keys


# --------------------------------------------------------------------------
# STL verification (standard library only)
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class StlFacts:
    """Independently parsed STL: closedness, volume and bounds from raw bytes."""

    path: str
    encoding: str
    triangle_count: int
    declared_triangles: int
    file_bytes: int
    volume_mm3: float
    bounds_min: tuple[float, float, float]
    bounds_max: tuple[float, float, float]
    boundary_edges: int
    non_manifold_edges: int
    degenerate_triangles: int

    @property
    def is_closed(self) -> bool:
        return self.boundary_edges == 0 and self.non_manifold_edges == 0 and self.triangle_count > 0

    @property
    def is_watertight_positive(self) -> bool:
        return self.is_closed and self.volume_mm3 > 0.0

    def as_measured(self) -> dict[str, Any]:
        return {
            "stl_triangles": self.triangle_count,
            "stl_bytes": self.file_bytes,
            "stl_volume_mm3": round(self.volume_mm3, 6),
            "stl_boundary_edges": self.boundary_edges,
            "stl_non_manifold_edges": self.non_manifold_edges,
            "stl_closed": self.is_closed,
            "stl_size_x_mm": round(self.bounds_max[0] - self.bounds_min[0], 6),
            "stl_size_y_mm": round(self.bounds_max[1] - self.bounds_min[1], 6),
            "stl_size_z_mm": round(self.bounds_max[2] - self.bounds_min[2], 6),
        }


def _edge_key(a: tuple[float, float, float], b: tuple[float, float, float], quantum: float = 1e-6):
    ra = tuple(round(value / quantum) for value in a)
    rb = tuple(round(value / quantum) for value in b)
    return (ra, rb) if ra <= rb else (rb, ra)


def parse_stl(path: str | Path) -> StlFacts:
    """Parse a binary or ASCII STL and measure closedness, volume and bounds.

    Uses only the standard library, so this check shares no code with the CAD
    kernel that wrote the file.
    """
    path = Path(path)
    if not path.is_file():
        raise ExecutionFailure(CODE_ARTEFACT_MISSING, f"STL file does not exist: {path}")
    data = path.read_bytes()
    if len(data) < 84:
        raise ExecutionFailure(CODE_STEP_IMPORT_FAILED, f"STL file is too small to be valid: {path}")
    declared = struct.unpack("<I", data[80:84])[0]
    encoding: str
    triangles: list[tuple[tuple[float, float, float], ...]]
    if 84 + 50 * declared == len(data):
        encoding = "binary"
        triangles = _parse_binary_stl(data, declared)
    elif data[:5] == b"solid":
        encoding = "ascii"
        triangles = _parse_ascii_stl(data, path)
        declared = len(triangles)
    elif _looks_like_truncated_binary_stl(data):
        raise ExecutionFailure(
            CODE_STL_TRUNCATED,
            (
                f"STL is truncated: the header declares {declared} triangles, which needs "
                f"{84 + 50 * declared} bytes, but the file is {len(data)} bytes: {path}"
            ),
        )
    else:
        raise ExecutionFailure(
            CODE_STL_UNREADABLE,
            f"STL file is neither valid binary nor ASCII STL (size {len(data)} bytes): {path}",
        )
    if not triangles:
        raise ExecutionFailure(CODE_STEP_IMPORT_FAILED, f"STL file contains no triangles: {path}")

    edge_counts: dict[Any, int] = {}
    degenerate = 0
    volume = 0.0
    xs: list[float] = []
    ys: list[float] = []
    zs: list[float] = []
    for v1, v2, v3 in triangles:
        xs.extend((v1[0], v2[0], v3[0]))
        ys.extend((v1[1], v2[1], v3[1]))
        zs.extend((v1[2], v2[2], v3[2]))
        volume += (
            v1[0] * (v2[1] * v3[2] - v2[2] * v3[1])
            - v1[1] * (v2[0] * v3[2] - v2[2] * v3[0])
            + v1[2] * (v2[0] * v3[1] - v2[1] * v3[0])
        ) / 6.0
        if v1 == v2 or v2 == v3 or v3 == v1:
            degenerate += 1
        for a, b in ((v1, v2), (v2, v3), (v3, v1)):
            edge_counts[_edge_key(a, b)] = edge_counts.get(_edge_key(a, b), 0) + 1
    boundary = sum(1 for count in edge_counts.values() if count == 1)
    non_manifold = sum(1 for count in edge_counts.values() if count > 2)
    return StlFacts(
        path=str(path),
        encoding=encoding,
        triangle_count=len(triangles),
        declared_triangles=int(declared),
        file_bytes=len(data),
        volume_mm3=volume,
        bounds_min=(min(xs), min(ys), min(zs)),
        bounds_max=(max(xs), max(ys), max(zs)),
        boundary_edges=boundary,
        non_manifold_edges=non_manifold,
        degenerate_triangles=degenerate,
    )


def _looks_like_truncated_binary_stl(data: bytes) -> bool:
    """A binary STL header whose declared triangle count does not fit the file."""
    if len(data) < 84 or data[:5] == b"solid":
        return False
    declared = struct.unpack("<I", data[80:84])[0]
    return 84 + 50 * declared > len(data)


def _parse_binary_stl(data: bytes, count: int) -> list[tuple[tuple[float, float, float], ...]]:
    triangles = []
    for index in range(count):
        offset = 84 + 50 * index
        values = struct.unpack("<12fH", data[offset : offset + 50])
        vertices = (
            (values[3], values[4], values[5]),
            (values[6], values[7], values[8]),
            (values[9], values[10], values[11]),
        )
        if any(not math.isfinite(component) for vertex in vertices for component in vertex):
            raise ExecutionFailure(CODE_STEP_IMPORT_FAILED, "STL contains a non-finite vertex coordinate")
        triangles.append(vertices)
    return triangles


def _parse_ascii_stl(data: bytes, path: Path) -> list[tuple[tuple[float, float, float], ...]]:
    try:
        text = data.decode("ascii", errors="strict")
    except UnicodeDecodeError as exc:
        raise ExecutionFailure(CODE_STEP_IMPORT_FAILED, f"STL is not valid binary and not ASCII text: {path}") from exc
    triangles: list[tuple[tuple[float, float, float], ...]] = []
    current: list[tuple[float, float, float]] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("vertex"):
            continue
        parts = stripped.split()
        if len(parts) != 4:
            raise ExecutionFailure(CODE_STEP_IMPORT_FAILED, f"malformed ASCII STL vertex line in {path}: {stripped!r}")
        try:
            vertex = (float(parts[1]), float(parts[2]), float(parts[3]))
        except ValueError as exc:
            raise ExecutionFailure(CODE_STEP_IMPORT_FAILED, f"malformed ASCII STL vertex in {path}: {stripped!r}") from exc
        current.append(vertex)
        if len(current) == 3:
            triangles.append(tuple(current))  # type: ignore[arg-type]
            current = []
    if current:
        raise ExecutionFailure(CODE_STEP_IMPORT_FAILED, f"truncated ASCII STL: {path} ends mid-facet")
    return triangles
