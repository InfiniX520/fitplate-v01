"""Fixed-environment geometry (T05): frozen SceneSpec -> actual OCCT solids.

The scene document is the *only* source of the fixed environment. It is frozen
by ``TaskSpec.scene_ref`` + ``scene_sha256`` (checked by ``fitplate.schema``
before this module is ever called), so the solids built here are the same
bodies the acceptance rules were frozen against.

Two kinds of scene object exist in version 1.0:

* ``cylinder`` - a fixed post (``fixed_obstacle``) or a screw-head envelope
  (``screw_head_envelope``, centred on a frozen base hole). World X/Y from
  ``axis_xy``, world Z from ``z_range``.
* ``box_local_xy_abs_z`` - the connector operating envelope. X/Y are *relative
  to the device center* (so it moves with the device), Z is absolute world
  height. It is a conservative envelope for the space a connector/cable needs;
  it is not a simulated insertion motion.

The sensor body itself is not a scene object: it is derived from the frozen
``TaskSpec.sensor`` envelope and the pose **measured from the STEP artefact**
(never from a DesignSpec). It seats on the measured plate top face.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Mapping, Sequence

import cadquery as cq

from .errors import CODE_INVALID_VALUE, CODE_MISSING_FIELD, RequestRefused

ROLE_FIXED_OBSTACLE = "fixed_obstacle"
ROLE_SCREW_HEAD = "screw_head_envelope"
ROLE_CONNECTOR_ACCESS = "connector_access"

KIND_CYLINDER = "cylinder"
KIND_BOX = "box_local_xy_abs_z"

#: Participants that may appear in ``support_contacts`` without being scene objects.
PARTICIPANT_SENSOR_BODY = "sensor_body"
PARTICIPANT_PLATE_TOP = "plate_top"


def _require(mapping: Mapping[str, Any], key: str, where: str) -> Any:
    if key not in mapping:
        raise RequestRefused(CODE_MISSING_FIELD, f"{where}: required field {key!r} is missing")
    return mapping[key]


def _two_numbers(value: Any, where: str) -> tuple[float, float]:
    """Two finite numbers, with no ordering requirement (a point, not a range)."""
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        raise RequestRefused(CODE_INVALID_VALUE, f"{where}: expected a two-element pair")
    first, second = value
    for item in (first, second):
        if not isinstance(item, (int, float)) or isinstance(item, bool) or not math.isfinite(item):
            raise RequestRefused(CODE_INVALID_VALUE, f"{where}: both values must be finite numbers")
    return float(first), float(second)


def _pair(value: Any, where: str) -> tuple[float, float]:
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        raise RequestRefused(CODE_INVALID_VALUE, f"{where}: expected a two-element range")
    lo, hi = value
    if not isinstance(lo, (int, float)) or not isinstance(hi, (int, float)) or isinstance(lo, bool) or isinstance(hi, bool):
        raise RequestRefused(CODE_INVALID_VALUE, f"{where}: range endpoints must be numbers")
    if lo > hi:
        raise RequestRefused(CODE_INVALID_VALUE, f"{where}: range min must not exceed max")
    return float(lo), float(hi)


# --------------------------------------------------------------------------
# Object descriptions
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class SceneObject:
    """One frozen environment object, straight from the scene document."""

    id: str
    role: str
    kind: str
    axis_xy: tuple[float, float] | None = None
    radius: float | None = None
    z_range: tuple[float, float] | None = None
    local_xy_range: tuple[tuple[float, float], tuple[float, float]] | None = None
    base_hole_index: int | None = None

    @property
    def is_cylinder(self) -> bool:
        return self.kind == KIND_CYLINDER

    @property
    def is_connector_access(self) -> bool:
        return self.role == ROLE_CONNECTOR_ACCESS


def _object_from_doc(doc: Mapping[str, Any], index: int) -> SceneObject:
    where = f"/objects/{index}"
    kind = _require(doc, "kind", where)
    role = _require(doc, "role", where)
    object_id = _require(doc, "id", where)
    if kind == KIND_CYLINDER:
        axis = _require(doc, "axis_xy", where)
        origin = _two_numbers(axis, f"{where}/axis_xy")
        radius = _require(doc, "radius", where)
        if not isinstance(radius, (int, float)) or isinstance(radius, bool) or not radius > 0 or not radius < float("inf"):
            raise RequestRefused(CODE_INVALID_VALUE, f"{where}/radius: must be a positive finite number")
        z_range = _pair(_require(doc, "z_range", where), f"{where}/z_range")
        hole_index = doc.get("base_hole_index")
        if role == ROLE_SCREW_HEAD and not isinstance(hole_index, int):
            raise RequestRefused(CODE_MISSING_FIELD, f"{where}: a screw-head envelope must name its base hole")
        return SceneObject(
            id=str(object_id),
            role=str(role),
            kind=KIND_CYLINDER,
            axis_xy=origin,
            radius=float(radius),
            z_range=z_range,
            base_hole_index=hole_index if isinstance(hole_index, int) and not isinstance(hole_index, bool) else None,
        )
    if kind == KIND_BOX:
        local = _require(doc, "local_xy_range", where)
        if not isinstance(local, (list, tuple)) or len(local) != 2:
            raise RequestRefused(CODE_INVALID_VALUE, f"{where}/local_xy_range: expected two ranges")
        x_range = _pair((_require(local[0], "min", f"{where}/local_xy_range/0"), _require(local[0], "max", f"{where}/local_xy_range/0")), f"{where}/local_xy_range/0")
        y_range = _pair((_require(local[1], "min", f"{where}/local_xy_range/1"), _require(local[1], "max", f"{where}/local_xy_range/1")), f"{where}/local_xy_range/1")
        z_range = _pair(_require(doc, "absolute_z_range", where), f"{where}/absolute_z_range")
        if role != ROLE_CONNECTOR_ACCESS:
            raise RequestRefused(CODE_INVALID_VALUE, f"{where}/role: only connector_access boxes are supported")
        return SceneObject(
            id=str(object_id),
            role=str(role),
            kind=KIND_BOX,
            local_xy_range=(x_range, y_range),
            z_range=z_range,
        )
    raise RequestRefused(CODE_INVALID_VALUE, f"{where}/kind: unsupported scene object kind {kind!r}")


@dataclass(frozen=True)
class SceneModel:
    """The frozen environment as usable objects plus the declared support pairs."""

    scene_id: str
    objects: tuple[SceneObject, ...]
    support_pairs: frozenset[frozenset[str]]

    # -- construction -----------------------------------------------------
    @classmethod
    def from_scene(cls, scene: Mapping[str, Any]) -> "SceneModel":
        raw_objects = _require(scene, "objects", "/scene")
        if not isinstance(raw_objects, (list, tuple)) or not raw_objects:
            raise RequestRefused(CODE_INVALID_VALUE, "/objects: the scene must declare at least one object")
        objects = tuple(_object_from_doc(doc, index) for index, doc in enumerate(raw_objects))
        pairs = frozenset(
            frozenset((str(_require(contact, "a", "/support_contacts")), str(_require(contact, "b", "/support_contacts"))))
            for contact in _require(scene, "support_contacts", "/scene")
        )
        return cls(
            scene_id=str(scene.get("scene_id", "")),
            objects=objects,
            support_pairs=pairs,
        )

    # -- queries ----------------------------------------------------------
    @property
    def fixed_cylinders(self) -> tuple[SceneObject, ...]:
        """Fixed bodies the moving envelopes are checked against (posts + screw heads)."""
        return tuple(obj for obj in self.objects if obj.is_cylinder)

    @property
    def connector_access(self) -> SceneObject | None:
        for obj in self.objects:
            if obj.is_connector_access:
                return obj
        return None

    def is_support_pair(self, a: str, b: str) -> bool:
        """True when the scene explicitly allows these two participants to touch."""
        return frozenset((a, b)) in self.support_pairs

    # -- solids -----------------------------------------------------------
    def solid_for_cylinder(self, obj: SceneObject) -> cq.Solid:
        if not obj.is_cylinder or obj.axis_xy is None or obj.radius is None or obj.z_range is None:
            raise RequestRefused(CODE_INVALID_VALUE, f"scene object {obj.id!r} is not a cylinder")
        return cylinder_solid(obj.axis_xy, obj.radius, obj.z_range)

    def connector_access_solid(self, device_center_xy: Sequence[float]) -> cq.Solid:
        """World-space connector envelope for the *measured* device center."""
        obj = self.connector_access
        if obj is None or obj.local_xy_range is None or obj.z_range is None:
            raise RequestRefused(CODE_MISSING_FIELD, "the scene declares no connector_access envelope")
        cx, cy = float(device_center_xy[0]), float(device_center_xy[1])
        x_range = (cx + obj.local_xy_range[0][0], cx + obj.local_xy_range[0][1])
        y_range = (cy + obj.local_xy_range[1][0], cy + obj.local_xy_range[1][1])
        return box_solid(x_range, y_range, obj.z_range)


# --------------------------------------------------------------------------
# Primitive solids
# --------------------------------------------------------------------------


def cylinder_solid(
    axis_xy: Sequence[float],
    radius: float,
    z_range: Sequence[float],
) -> cq.Solid:
    """A Z-axis cylinder from an explicit axis position and height range."""
    z_lo, z_hi = float(z_range[0]), float(z_range[1])
    height = z_hi - z_lo
    if height <= 0:
        raise RequestRefused(CODE_INVALID_VALUE, "cylinder height must be positive")
    return cq.Solid.makeCylinder(
        float(radius),
        height,
        cq.Vector(float(axis_xy[0]), float(axis_xy[1]), z_lo),
        cq.Vector(0, 0, 1),
    )


def box_solid(
    x_range: Sequence[float],
    y_range: Sequence[float],
    z_range: Sequence[float],
) -> cq.Solid:
    """An axis-aligned box from three explicit world ranges."""
    dx = float(x_range[1]) - float(x_range[0])
    dy = float(y_range[1]) - float(y_range[0])
    dz = float(z_range[1]) - float(z_range[0])
    if min(dx, dy, dz) <= 0:
        raise RequestRefused(CODE_INVALID_VALUE, "box ranges must have positive extent")
    return cq.Solid.makeBox(
        dx,
        dy,
        dz,
        cq.Vector(float(x_range[0]), float(y_range[0]), float(z_range[0])),
    )


def sensor_body_ranges(
    task: Mapping[str, Any],
    device_center_xy: Sequence[float],
    plate_top_z: float,
) -> tuple[tuple[float, float], tuple[float, float], tuple[float, float]]:
    """World X/Y/Z ranges of the simplified device envelope at the measured pose.

    The device seats on the plate top: its base plane is ``plate_top_z``, and it
    extends upward by ``body_size[2]``. The envelope is a teaching simplification
    of the real device, not a certified part outline.
    """
    body = task["sensor"]["body_size"]
    size_x, size_y, size_z = float(body[0]), float(body[1]), float(body[2])
    cx, cy = float(device_center_xy[0]), float(device_center_xy[1])
    return (
        (cx - size_x / 2.0, cx + size_x / 2.0),
        (cy - size_y / 2.0, cy + size_y / 2.0),
        (plate_top_z, plate_top_z + size_z),
    )


def sensor_body_solid(
    task: Mapping[str, Any],
    device_center_xy: Sequence[float],
    plate_top_z: float,
) -> cq.Solid:
    x_range, y_range, z_range = sensor_body_ranges(task, device_center_xy, plate_top_z)
    return box_solid(x_range, y_range, z_range)
