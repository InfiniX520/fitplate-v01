"""P02-04 intake core: deterministic request -> draft -> frozen task, plus the task registry.

Scope of this module (deliberately narrow, and NOT wired into the plugin yet):

* a **bounded compiler** that turns one ``IntakeRequest`` (browser-form fields plus the user's
  short Chinese text) and one *program-registered* device card into a ``ConstraintDraft`` -
  field proposals with their sources, missing fields, conflicts, unsupported features. It is
  deterministic: the same request + card always produce the same draft hash (``created_at`` and
  ``draft_hash`` are the only time-dependent fields, and the hash covers neither).
* a **freeze step** that accepts a confirmation *receipt* shaped by the next package's trusted
  Host adapter (``fitplate-confirmation-receipt``) and checks only its binding: the staged
  request facts (request revision + draft hash + attachment bytes hash + session scope), the
  card content hash, the deterministic recompilation of the draft, and the receipt scope. The
  core never reads a ``confirmed`` flag from the request, never trusts model fields or a
  free-form string, and does **not** prove that a native approval happened - that proof belongs
  to the Host, and the production tool passes the matched draft as the parameter of the real
  approval call.
* a **task registry**: an append-only index plus immutable revision directories, with an atomic
  publish (tmp dir -> ``os.replace``), an advisory lock, idempotent identical submissions that
  are re-verified against the disk before answering, refusal of a different content under the
  same identity, orphan-revision recovery that re-checks the full identity, and a read API that
  re-verifies hashes and references before returning the exact bundle.

Environment and requirements are **explicit form inputs**: cylinders, screw-head envelopes, one
connector box (or an explicit ``not_covered``), support contacts and the four requirement values
all carry their own units and source. Missing sections are NEEDS_INPUT; an absent section is
never an empty environment, and the device card supplies *device interface dimensions only* - a
card is never the hidden source of obstacles, z values or requirements. All z values are
absolute and used verbatim (a plate-thickness change never shifts an obstacle).

Boundaries (also in docs/intake.md): ``READY_TO_CONFIRM`` never means feasible; ``INFEASIBLE``
with a reviewable proof belongs to the frozen preflight/load path (this module runs no CAD and
imports none; ``classify_with_preflight`` is the explicit lazy bridge). Unit conversion uses one
fixed table; booleans, non-finite numbers and unit-less values are refused. Only the documented
text-pattern subset is interpreted, uninterpreted dimension-like text forces a clarification,
and a source reference that names a real field or text span proves provenance - not that the
model understood it.

The module re-uses the real contract layer (``fitplate.schema``) for every document it emits and
for every bundle it reads back, and is importable on a bare CPython (no third-party packages).
"""

from __future__ import annotations

import fcntl
import hashlib
import json
import math
import os
import re
import shutil
from pathlib import Path
from typing import Any, Mapping, Sequence

from . import schema as contract
from .text_proposals import ProposalError, verify_width_cap_proposal

INTAKE_SCHEMA_VERSION = "1.0"
COMPILER_ID = "fitplate.intake"
COMPILER_VERSION = "0.2.0"
REGISTRY_KIND = "fitplate-intake-registry"
REGISTRY_VERSION = 1

#: The one and only length table: a value is converted with its *declared* unit, never by
#: guessing a magnitude. Unknown units are refused (see :func:`convert_length`).
UNIT_FACTORS_MM: Mapping[str, float] = {"mm": 1.0, "cm": 10.0, "m": 1000.0, "um": 0.001, "in": 25.4}

#: The bounded text-proposal input: at most four verified proposals per compile (the model may
#: hand in only a *quote* plus an *assertion*; the program re-reads the real text).
MAX_TEXT_PROPOSALS = 4
#: Only ``plate.width`` / ``upper_bound`` is supported; a proposal carries no program fact.
_SUPPORTED_PROPOSAL_FIELD = "plate.width"
_SUPPORTED_PROPOSAL_KIND = "upper_bound"

#: Program-generated tolerances that are not part of any user input.
DEFAULT_TOLERANCES = {"geometry_epsilon_mm": 0.001, "interference_volume_epsilon_mm3": 0.0001}

INTAKE_SCHEMA_NAMES = ("request", "constraint-draft", "input-manifest")

_SAFE_ID = re.compile(r"^[a-z0-9][a-z0-9-]{1,62}$")
_SAFE_REQUEST_ID = re.compile(r"^[a-z0-9][a-z0-9-]{1,40}$")
_SHA256_HEX = re.compile(r"^[0-9a-f]{64}$")
_FORM_REF_RE = re.compile(r"^form:[a-z0-9._-]{1,64}$")
_TEXT_REF_RE = re.compile(r"^text\[([0-9]{1,6}):([0-9]{1,6})\]")


class IntakeError(RuntimeError):
    """A refused intake operation: a stable ``code`` plus a human-readable message."""

    def __init__(self, code: str, message: str, *, issues: Sequence[Any] | None = None, detail: Any = None) -> None:
        super().__init__(message)
        self.code = code
        self.issues = list(issues or [])
        self.detail = detail


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------


def repo_root() -> Path:
    return contract.repo_root()


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _sha256_file(path: str | Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 16), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _serialize(doc: Mapping[str, Any]) -> bytes:
    """The registry's canonical on-disk encoding (deterministic for the same document)."""
    return (json.dumps(doc, indent=2, sort_keys=True, ensure_ascii=False) + "\n").encode("utf-8")


def _load_intake_schema(name: str) -> Mapping[str, Any]:
    if name not in INTAKE_SCHEMA_NAMES:
        raise IntakeError("UNKNOWN_SCHEMA", f"unknown intake schema {name!r}; expected one of {INTAKE_SCHEMA_NAMES}")
    path = repo_root() / "schemas" / f"{name}.schema.json"
    try:
        return contract.load_json_file(path)
    except contract.JsonLoadError as exc:  # pragma: no cover - broken installation
        raise IntakeError("SCHEMA_UNREADABLE", f"cannot load intake schema {name!r}: {exc}") from exc


def _schema_issues(name: str, doc: Any) -> list[Any]:
    """Validate one document against an intake schema with the real contract validator."""
    return contract._validate_against(_load_intake_schema(name), doc, source=f"{name}.schema.json")


def _contract_issues(result: Any) -> list[Any]:
    """Issues out of a real contract result (``CheckResult``) or a plain issue list."""
    return list(getattr(result, "issues", result) or [])


def _content_hash(doc: Mapping[str, Any]) -> str:
    return contract.content_sha256(doc)


def _without(doc: Mapping[str, Any], *keys: str) -> dict[str, Any]:
    return {key: value for key, value in doc.items() if key not in keys}


def _fmt_mm(value: float) -> str:
    """Compact mm formatting for draft evidence (no trailing .0 on integral values)."""
    return f"{value:g} mm"


# ---------------------------------------------------------------------------
# Device cards (program-registered; the request only names an id)
# ---------------------------------------------------------------------------


def device_cards_root(root: str | Path | None = None) -> Path:
    return Path(root) if root is not None else repo_root() / "data" / "devices"


def load_device_card(device_id: str, *, cards_root: str | Path | None = None) -> dict[str, Any]:
    """Load one card from the program-registered directory by id - never by path.

    The id is pattern-checked, the resolved file must stay inside the registered root, symlinks
    are refused, and the card's own ``device_id`` must equal the requested one. A request can
    therefore never point the program at arbitrary dimensions or another file. The card supplies
    *device interface dimensions only*; environment and requirements are form inputs.
    """
    if not isinstance(device_id, str) or not _SAFE_ID.fullmatch(device_id):
        raise IntakeError("DEVICE_ID_INVALID", f"device card id {device_id!r} is not a safe id")
    root = device_cards_root(cards_root).resolve()
    card_path = root / f"{device_id}.json"
    if card_path.is_symlink() or not card_path.is_file():
        raise IntakeError("DEVICE_CARD_MISSING", f"no registered device card {device_id!r} under {root}")
    resolved = card_path.resolve()
    if root != resolved.parent:
        raise IntakeError("DEVICE_CARD_ESCAPE", f"device card {device_id!r} resolves outside the registered directory")
    try:
        card = contract.load_json_file(resolved)
    except contract.JsonLoadError as exc:
        raise IntakeError("DEVICE_CARD_UNREADABLE", f"device card {device_id!r} is unreadable: {exc}") from exc
    if card.get("kind") != "fitplate-device-card" or card.get("device_id") != device_id:
        raise IntakeError("DEVICE_CARD_MISMATCH", f"card under {resolved.name} is not the registered card {device_id!r}")
    return card


def _card_field(card: Mapping[str, Any], name: str) -> Mapping[str, Any] | None:
    fields = card.get("fields")
    if not isinstance(fields, Mapping):
        return None
    field = fields.get(name)
    return field if isinstance(field, Mapping) else None


def _card_value(card: Mapping[str, Any], name: str) -> Any:
    field = _card_field(card, name)
    return field.get("value") if field is not None else None


# ---------------------------------------------------------------------------
# Units
# ---------------------------------------------------------------------------


def convert_length(value: Any, unit: Any, *, path: str = "value") -> float:
    """Convert one declared length to mm with the fixed table.

    Booleans (``True`` is not 1 mm), non-finite numbers, non-numeric values and unknown units are
    refused - a magnitude is never used to guess a unit.
    """
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise IntakeError("LENGTH_VALUE_INVALID", f"{path}: expected a number, got {value!r}")
    number = float(value)
    if not math.isfinite(number):
        raise IntakeError("LENGTH_VALUE_INVALID", f"{path}: {value!r} is not finite")
    if not isinstance(unit, str) or unit not in UNIT_FACTORS_MM:
        raise IntakeError("LENGTH_UNIT_UNKNOWN", f"{path}: unit {unit!r} is not one of {sorted(UNIT_FACTORS_MM)}")
    return round(number * UNIT_FACTORS_MM[unit], 9)


def length_pair_mm(pair: Any, *, path: str = "value") -> float:
    """``{"value": ..., "unit": ...}`` -> mm, with the same refusals as :func:`convert_length`."""
    if not isinstance(pair, Mapping):
        raise IntakeError("LENGTH_SHAPE_INVALID", f"{path}: expected {{value, unit}}, got {pair!r}")
    return convert_length(pair.get("value"), pair.get("unit"), path=path)


# ---------------------------------------------------------------------------
# The request
# ---------------------------------------------------------------------------


#: The licence fact lives at exactly one form field; a licence source ref may name it directly or
#: through one of these finite, registered aliases. Anything else - including a plausible-looking
#: but nonexistent field - is refused: a matching pattern is not a fact.
_LICENCE_SOURCE_FIELD = "mounting.movement_license"
_LICENCE_SOURCE_ALIASES = {
    "movement_license": _LICENCE_SOURCE_FIELD,
    "movement-license": _LICENCE_SOURCE_FIELD,
    "motion-license": _LICENCE_SOURCE_FIELD,
    "motion": _LICENCE_SOURCE_FIELD,
    "mounting.movement_license": _LICENCE_SOURCE_FIELD,
}


def _check_source_ref(source_ref: Any, text: str, *, path: str) -> None:
    """A licence source ref must name a real field of *this* form or a real span of this text.

    ``form:<name>`` binds to the licence fact itself through the finite alias map above - a name
    that is not registered (or that names another, unrelated field) is refused even though it
    matches the shape. ``text[a:b]`` must be a real span, and when a trailing literal is attached
    it must equal the actual slice, so a reference can never claim to point at words the text
    does not contain. This proves *location*, never understanding.
    """
    if not isinstance(source_ref, str) or not source_ref:
        raise IntakeError("SOURCE_REF_INVALID", f"{path}: a movement licence needs a source ref (form:<field> or text[<s>:<e>])")
    if _FORM_REF_RE.fullmatch(source_ref):
        name = source_ref.split(":", 1)[1]
        if _LICENCE_SOURCE_ALIASES.get(name) == _LICENCE_SOURCE_FIELD:
            return
        raise IntakeError(
            "SOURCE_REF_INVALID",
            f"{path}: {source_ref!r} does not name a real form field (the licence fact is form:{_LICENCE_SOURCE_FIELD}; registered aliases: {sorted(_LICENCE_SOURCE_ALIASES)})",
        )
    head, _, literal = source_ref.partition(" ")
    match = _TEXT_REF_RE.fullmatch(head)
    if match:
        start, end = int(match.group(1)), int(match.group(2))
        if not (0 <= start < end <= len(text)):
            raise IntakeError("SOURCE_REF_INVALID", f"{path}: text span [{start}:{end}] is outside the request text (len {len(text)})")
        if literal and literal != repr(text[start:end]):
            raise IntakeError("SOURCE_REF_INVALID", f"{path}: the attached literal {literal!r} is not the actual slice {text[start:end]!r}")
        return
    raise IntakeError("SOURCE_REF_INVALID", f"{path}: {source_ref!r} is neither form:<field> nor a real text[a:b] span")


def validate_request(doc: Any) -> list[Any]:
    """Schema issues plus the semantic checks JSON Schema cannot express."""
    issues = list(_schema_issues("request", doc))
    if issues or not isinstance(doc, Mapping):
        return issues
    try:
        lengths = _request_lengths_mm(doc, allow_missing=True)
    except IntakeError as exc:
        issues.append(contract.Issue(path="form", code=exc.code, message=str(exc)))
        return issues
    form = doc["form"]
    for dim in ("width", "height"):
        rng = lengths["editable"].get(dim)
        if rng is not None:
            low, high = rng
            if ((low is not None and low <= 0) or (high is not None and high <= 0)
                    or (low is not None and high is not None and low > high)):
                issues.append(contract.Issue(path=f"form.plate.editable.{dim}", code="RANGE_INVALID", message=f"{dim} editable range must satisfy 0 < min <= max, got [{low}, {high}] mm"))
            nominal = lengths[f"plate_{dim}"]
            if all(v is not None for v in (low, nominal, high)) and not (low <= nominal <= high):
                issues.append(contract.Issue(path=f"form.plate.editable.{dim}", code="RANGE_INVALID", message=f"nominal {dim} {nominal} lies outside its own editable range [{low}, {high}]"))
    environment = form.get("environment")
    if isinstance(environment, Mapping):
        centers = lengths["base_hole_centers"]
        seen_holes = set()
        for index, head in enumerate(environment.get("screw_heads", [])):
            hole_index = head.get("base_hole_index")
            if not isinstance(hole_index, int) or isinstance(hole_index, bool) or not (0 <= hole_index < len(centers)):
                issues.append(contract.Issue(path=f"form.environment.screw_heads[{index}]", code="INVALID_VALUE", message=f"base_hole_index {hole_index!r} does not exist"))
            elif hole_index in seen_holes:
                issues.append(contract.Issue(path=f"form.environment.screw_heads[{index}]", code="INVALID_VALUE", message=f"base_hole_index {hole_index} has more than one envelope"))
            else:
                seen_holes.add(hole_index)
            try:
                low, high = lengths["environment"]["screw_heads"][index]["z_range"]
                if low is not None and high is not None and low > high:
                    issues.append(contract.Issue(path=f"form.environment.screw_heads[{index}].z_range", code="RANGE_INVALID", message=f"z_range must be ordered, got [{low}, {high}]"))
            except IntakeError as exc:
                issues.append(contract.Issue(path=f"form.environment.screw_heads[{index}]", code=exc.code, message=str(exc)))
        for index, cylinder in enumerate(environment.get("fixed_cylinders", [])):
            try:
                low, high = lengths["environment"]["fixed_cylinders"][index]["z_range"]
                if low is not None and high is not None and low > high:
                    issues.append(contract.Issue(path=f"form.environment.fixed_cylinders[{index}].z_range", code="RANGE_INVALID", message=f"z_range must be ordered, got [{low}, {high}]"))
            except IntakeError as exc:
                issues.append(contract.Issue(path=f"form.environment.fixed_cylinders[{index}]", code=exc.code, message=str(exc)))
    return issues


def _request_lengths_mm(doc: Mapping[str, Any], *, allow_missing: bool = False) -> dict[str, Any]:
    """Every length in the request converted to mm (raises on the first invalid value)."""
    def read(value: Mapping[str, Any], *, path: str) -> float | None:
        # Only the intake schema permits an explicit missing value. It never becomes zero,
        # a model-chosen point, or a value accepted by the frozen task/scene contracts.
        if allow_missing and value.get("value") is None:
            return None
        return length_pair_mm(value, path=path)

    form = doc["form"]
    plate = form["plate"]
    mounting = form["mounting"]
    out: dict[str, Any] = {
        "plate_width": read(plate["width"], path="form.plate.width"),
        "plate_height": read(plate["height"], path="form.plate.height"),
        "plate_thickness": read(plate["thickness"], path="form.plate.thickness"),
        "base_hole_diameter": read(form["base_holes"]["diameter"], path="form.base_holes.diameter"),
        "base_hole_centers": [
            (read(pair[0], path=f"form.base_holes.centers[{index}][0]"), read(pair[1], path=f"form.base_holes.centers[{index}][1]"))
            for index, pair in enumerate(form["base_holes"]["centers"])
        ],
    }
    if "plate_hole_diameter" in mounting:
        out["plate_hole_diameter"] = read(mounting["plate_hole_diameter"], path="form.mounting.plate_hole_diameter")
    license_doc = mounting.get("movement_license")
    if isinstance(license_doc, Mapping):
        mode = license_doc.get("mode")
        source_ref = license_doc.get("source_ref")
        _check_source_ref(source_ref, doc.get("text", ""), path="form.mounting.movement_license.source_ref")
        if mode == "fixed":
            out["license"] = {"mode": "fixed", "center": (read(license_doc["center"][0], path="form.mounting.movement_license.center[0]"), read(license_doc["center"][1], path="form.mounting.movement_license.center[1]")), "source_ref": source_ref}
        elif mode == "x_range":
            out["license"] = {
                "mode": "x_range",
                "center_x": (read(license_doc["center_x"]["min"], path="form.mounting.movement_license.center_x.min"), read(license_doc["center_x"]["max"], path="form.mounting.movement_license.center_x.max")),
                "center_y": read(license_doc["center_y"], path="form.mounting.movement_license.center_y"),
                "source_ref": source_ref,
            }
        elif mode == "y_range":
            out["license"] = {
                "mode": "y_range",
                "center_x": read(license_doc["center_x"], path="form.mounting.movement_license.center_x"),
                "center_y": (read(license_doc["center_y"]["min"], path="form.mounting.movement_license.center_y.min"), read(license_doc["center_y"]["max"], path="form.mounting.movement_license.center_y.max")),
                "source_ref": source_ref,
            }
        elif mode == "xy_range":
            out["license"] = {
                "mode": "xy_range",
                "center_x": (read(license_doc["center_x"]["min"], path="form.mounting.movement_license.center_x.min"), read(license_doc["center_x"]["max"], path="form.mounting.movement_license.center_x.max")),
                "center_y": (read(license_doc["center_y"]["min"], path="form.mounting.movement_license.center_y.min"), read(license_doc["center_y"]["max"], path="form.mounting.movement_license.center_y.max")),
                "source_ref": source_ref,
            }
    editable = plate.get("editable", {})
    ranges = {}
    for dim in ("width", "height"):
        rng = editable.get(dim)
        if rng is not None:
            ranges[dim] = (read(rng["min"], path=f"form.plate.editable.{dim}.min"), read(rng["max"], path=f"form.plate.editable.{dim}.max"))
    out["editable"] = ranges
    environment = form.get("environment")
    if isinstance(environment, Mapping):
        env_mm: dict[str, Any] = {
            "source": environment.get("source"),
            "note": environment.get("note"),
            "fixed_cylinders": [],
            "screw_heads": [],
            "connector_access": environment.get("connector_access"),
            "support_contacts": environment.get("support_contacts"),
        }
        for index, cylinder in enumerate(environment.get("fixed_cylinders", [])):
            env_mm["fixed_cylinders"].append(
                {
                    "id": cylinder["id"],
                    "axis_xy": (read(cylinder["axis_xy"][0], path=f"form.environment.fixed_cylinders[{index}].axis_xy[0]"), read(cylinder["axis_xy"][1], path=f"form.environment.fixed_cylinders[{index}].axis_xy[1]")),
                    "radius": read(cylinder["radius"], path=f"form.environment.fixed_cylinders[{index}].radius"),
                    "z_range": (read(cylinder["z_range"][0], path=f"form.environment.fixed_cylinders[{index}].z_range[0]"), read(cylinder["z_range"][1], path=f"form.environment.fixed_cylinders[{index}].z_range[1]")),
                }
            )
        for index, head in enumerate(environment.get("screw_heads", [])):
            env_mm["screw_heads"].append(
                {
                    "base_hole_index": head["base_hole_index"],
                    "radius": read(head["radius"], path=f"form.environment.screw_heads[{index}].radius"),
                    "z_range": (read(head["z_range"][0], path=f"form.environment.screw_heads[{index}].z_range[0]"), read(head["z_range"][1], path=f"form.environment.screw_heads[{index}].z_range[1]")),
                }
            )
        connector = environment.get("connector_access")
        if isinstance(connector, Mapping):
            env_mm["connector_access"] = {
                "local_xy_range": [
                    (read(connector["local_xy_range"][0]["min"], path="form.environment.connector_access.local_xy_range[0].min"), read(connector["local_xy_range"][0]["max"], path="form.environment.connector_access.local_xy_range[0].max")),
                    (read(connector["local_xy_range"][1]["min"], path="form.environment.connector_access.local_xy_range[1].min"), read(connector["local_xy_range"][1]["max"], path="form.environment.connector_access.local_xy_range[1].max")),
                ],
                "absolute_z_range": (read(connector["absolute_z_range"][0], path="form.environment.connector_access.absolute_z_range[0]"), read(connector["absolute_z_range"][1], path="form.environment.connector_access.absolute_z_range[1]")),
            }
        out["environment"] = env_mm
    requirements = form.get("requirements")
    if isinstance(requirements, Mapping):
        out["requirements"] = {
            "source": requirements.get("source"),
            "minimum_free_clearance": read(requirements["minimum_free_clearance"], path="form.requirements.minimum_free_clearance"),
            "minimum_edge_ligament": read(requirements["minimum_edge_ligament"], path="form.requirements.minimum_edge_ligament"),
            "minimum_hole_ligament": read(requirements["minimum_hole_ligament"], path="form.requirements.minimum_hole_ligament"),
            "dimensional_tolerance": read(requirements["dimensional_tolerance"], path="form.requirements.dimensional_tolerance"),
        }
    return out


# ---------------------------------------------------------------------------
# The documented text subset (fixed patterns; everything else stays uninterpreted)
# ---------------------------------------------------------------------------

_UNIT_WORDS = {
    "mm": "mm", "毫米": "mm",
    "cm": "cm", "厘米": "cm",
    "m": "m", "米": "m",
    "um": "um", "微米": "um", "µm": "um",
    "in": "in", "英寸": "in",
}
_NUM = r"(\d+(?:\.\d+)?)"
_UNIT = r"(mm|毫米|cm|厘米|m|米|um|微米|in|英寸)"
_BOUND_WORDS = r"(?:不超过|最大|至多|不大于|≤|<=)"
_SET_WORDS = r"(?:改为|改成|设为|调成|调整为|为|是)"

_WIDTH_BOUND_RE = re.compile(r"(?:板宽|宽度)" + r"[^。;；\n]{0,24}?" + _BOUND_WORDS + r"\s*" + _NUM + r"\s*" + _UNIT)
_WIDTH_SET_RE = re.compile(r"(?:板宽|宽度)" + r"[^。;；\n]{0,8}?" + _SET_WORDS + r"\s*" + _NUM + r"\s*" + _UNIT)
_HEIGHT_BOUND_RE = re.compile(r"(?:板高|高度)" + r"[^。;；\n]{0,24}?" + _BOUND_WORDS + r"\s*" + _NUM + r"\s*" + _UNIT)
_HEIGHT_SET_RE = re.compile(r"(?:板高|高度)" + r"[^。;；\n]{0,8}?" + _SET_WORDS + r"\s*" + _NUM + r"\s*" + _UNIT)
_THICKNESS_KEEP_RE = re.compile(r"(?:板厚|厚度)" + r"[^。;；\n]{0,6}?(?:保持|锁定|不变|固定)" + r"[^。;；\n]{0,6}?" + _NUM + r"\s*" + _UNIT + r"?")
_THICKNESS_CHANGE_RE = re.compile(r"(?:板厚|厚度)" + r"[^。;；\n]{0,6}?(?:改为|改成|设为|调成|调整为)" + r"\s*" + _NUM + r"\s*" + _UNIT)
_CENTER_FIXED_RE = re.compile(r"(?:中心|位置|传感器)" + r"[^。;；\n]{0,8}?(?:不能动|不可移动|不能移动|固定不动|锁死|保持不变)")
_MOVEMENT_REQUEST_RE = re.compile(r"(?:在允许范围内?(?:选择|选|调整|布置)[^。;；\n]{0,6}位置|选择[^。;；\n]{0,6}位置|移动|平移|挪(?:一下|动)?|换[^。;；\n]{0,4}位置)")
_HOLE_DIAMETER_RE = re.compile(r"(?:安装孔|板孔|通孔|孔径|孔直径)" + r"[^。;；\n]{0,8}?" + _NUM + r"\s*" + _UNIT)
_THREAD_SPEC_RE = re.compile(r"\bM\d+(?:[×x]\d+(?:\.\d+)?)?\b")
_ROTATION_RE = re.compile(r"(?:旋转|转过?|转角)" + r"[^。;；\n]{0,6}?" + _NUM + r"\s*[°度]?")
_DIMENSION_LIKE_RE = re.compile(r"\d+(?:\.\d+)?\s*(?:mm|毫米|cm|厘米|um|微米|in|英寸|[mM米])")
_CONSTRAINT_WORDS_RE = re.compile(r"(?:不超过|不大于|至多|至少|不小于|保持|固定|锁死|改为|必须)")
#: Dimension words without a unit (孔距/孔距三十, 长度/直径 …): a number directly after a
#: dimension noun is dimension-like text the fixed subset does not interpret.
_DIMENSION_NOUN_RE = re.compile(r"(?:孔距|间距|中心距|直径|孔径|长度|宽度|高度|厚度|半径|角度|深|边距|间隙|料厚)[^。；;\n，,]{0,4}?\d")
#: The unbounded counterpart of the documented cap words (最少/最小/不低于 …): a lower bound on a
#: dimension is *not* in the supported subset, so it must be confirmed, never read as an upper cap.
_EXTRA_BOUND_RE = re.compile(r"(?:最少|最小|不低于|不小于|至少|不小于)")
#: Chinese numerals used as a dimension without any unit (孔距固定三十, 板宽最多九厘米 already
#: carries 厘米; a bare 三十 does not): only flagged next to a constraint word. The bound words
#: 最多/最少/最大/最小 are included because a Chinese cap on a dimension is exactly what the old
#: guard silently dropped.
_CN_NUMBER_RE = re.compile(r"[零一二两三四五六七八九十百]{1,6}")
_CN_NEAR_WORD_RE = re.compile(r"(?:不超过|不大于|至多|至少|不小于|不低于|保持|固定|锁死|改为|必须|最多|最少|最大|最小)")
#: Approximate-dimension language (差不多/大约/左右 …). A vague magnitude is never a precise value:
#: it must stay NEEDS_INPUT. Flagged only when it sits next to a dimension word or a length unit, so
#: ordinary prose ("大约三天") is not swept in. A bare 约 only counts as approximate when it directly
#: precedes a number, so an ordinary noun like 约束 (constraint) is never read as a magnitude.
_APPROX_WORD_RE = re.compile(r"(?:差不多|大约|大概|大致|将近|接近|左右|约(?:为|等于)?(?=[0-9零一二两三四五六七八九十百]))")
_DIMENSION_NEAR_RE = re.compile(r"(?:板宽|板高|板厚|宽度|高度|厚度|孔径|孔距|间距|中心距|直径|半径|长度|边距|间隙|料厚|厘米|毫米|微米|英寸|mm|cm|um|in|米)")
#: A narrow reference to the *form's* fixed point ("按照表单固定点检查"): it points at a fact already
#: supplied by the form/UI (optionally 给出/填写/提供), it does not assert a new fixed centre and it
#: does not invent a point. Only a phrase that names the *form/UI* next to a fixed-point noun
#: matches; an external document ("图纸"/"清单") was not supplied and is NOT a reference to this form.
_FORM_FIXED_REF_RE = re.compile(r"(?:按照|按|依据|根据|参照|参见|见|查|依|遵)?\s*(?:表单|表内|表里|界面|表中)(?:中|里|内|上的)?(?:的)?\s*(?:给出|填写|提供|登记|录入|记录)?(?:的)?\s*(?:固定点|固定中心|固定位置|固定坐标)")
# These additions are COMPLETE clauses with explicit subjects. They do not accept a keyword
# extracted from a negation, a different subject or an additional unparsed condition.
_CLAUSE_BLOCK_RE = re.compile(r"[^，,。；;\n\r！？!?]+")
_CONDITION_PREFIX_RE = re.compile(r"^(?:(?:增加|新增)条件|要求)\s*[:：]\s*")
_EXACT_PLATE_RE = re.compile(r"(底板宽度|板宽|底板高度|板高)\s*" + _NUM + r"\s*" + _UNIT)
_REQUIREMENT_FIELDS = {
    "最小自由间隙": "minimum_free_clearance",
    "最小孔边材料": "minimum_edge_ligament",
    "最小孔间材料": "minimum_hole_ligament",
    "尺寸公差": "dimensional_tolerance",
}
_REQUIREMENT_RE = re.compile(
    r"(" + "|".join(_REQUIREMENT_FIELDS) + r")\s*"
    r"(?:改为|改成|调整为|设为|为|是|至少|不小于|>=|≥)?\s*" + _NUM + r"\s*" + _UNIT
)
_REST_FORM_REF_RE = re.compile(r"(?:其余|其他|其它)(?:已填(?:写)?)?(?:条件|参数)(?:保持(?:原值|不变)?|以表单为准)")
_PLATE_KEEP_REF_RE = re.compile(r"(?:板体|底板|板)(?:和|与)底座孔(?:全部)?保持(?:原值|不变)")
_FIXED_FORM_CLAUSE_RE = re.compile(
    r"(?:(?:当前)?(?:装配)?中心(?:按|按照)表单固定"
    r"|(?:先)?(?:按|按照)(?:该|当前|上述)?固定(?:位置|中心|坐标|点)(?:实际)?(?:建模|验证|检查)(?:并|和)?(?:实际)?(?:验证|检查)?)"
)
_UNSUPPORTED_PATTERNS = (
    ("multiple_devices", re.compile(r"(?:两|二|多|第二)[台个]设备|再加一[台个]设备")),
    ("standoff_or_suspension", re.compile(r"垫柱|垫高|悬空|支撑柱|架空|离开板面|立起来")),
    ("non_round_holes", re.compile(r"腰形孔|长圆孔|长孔|方孔|沉头孔|埋头|锥孔")),
    ("threaded_plate_hole", re.compile(r"(?:板|孔)[^。;；\n]{0,6}(?:攻丝|螺纹孔|内螺纹)")),
)


def _text_span(text: str, match: re.Match[str]) -> str:
    start = max(0, match.start() - 4)
    end = min(len(text), match.end() + 4)
    return f"text[{start}:{end}] {text[start:end]!r}"


def parse_text_signals(text: str, *, verified_spans: Sequence[tuple[int, int]] = (), form_fixed_licensed: bool = False, form: Mapping[str, Any] | None = None) -> dict[str, Any]:
    """The bounded interpretation of the user's text (fixed patterns only).

    Returns a dictionary of raw signal records; no numbers are invented. Anything outside the
    subset is listed under ``unparsed`` when it looks like a dimension or a constraint, so the
    caller can ask for a clarification instead of silently proceeding.

    ``form_fixed_licensed`` is the program fact that the form supplies a *fixed* movement licence;
    it lets a narrow "按照表单固定点检查" reference be recognised as pointing at that supplied fact
    (never as a new fact), while the same phrase against a movable form stays unparsed.
    """
    signals: dict[str, Any] = {
        "width_bound": None, "width_set": None, "height_bound": None, "height_set": None,
        "thickness_keep": None, "thickness_change": None, "hole_diameter": None,
        "center_fixed": None, "movement_request": None, "form_fixed_ref": None,
        "unsupported": [], "rotation_deg": [], "thread_specs": [], "unparsed": [], "interpreted_spans": [],
        "requirement_assertions": [],
    }
    text = text or ""

    def capture(key: str, pattern: re.Pattern[str]) -> None:
        match = pattern.search(text)
        if match:
            signals[key] = {"value": float(match.group(1)), "unit": _UNIT_WORDS[match.group(2)], "ref": _text_span(text, match)}
            signals["interpreted_spans"].append((match.start(), match.end()))

    for key, pattern in (("width_bound", _WIDTH_BOUND_RE), ("width_set", _WIDTH_SET_RE), ("height_bound", _HEIGHT_BOUND_RE), ("height_set", _HEIGHT_SET_RE), ("hole_diameter", _HOLE_DIAMETER_RE)):
        capture(key, pattern)
    for key, pattern in (("thickness_keep", _THICKNESS_KEEP_RE), ("thickness_change", _THICKNESS_CHANGE_RE)):
        match = pattern.search(text)
        if match:
            unit = match.group(2) if match.lastindex and match.lastindex >= 2 and match.group(2) else "mm"
            signals[key] = {"value": float(match.group(1)), "unit": _UNIT_WORDS.get(unit, "mm"), "ref": _text_span(text, match)}
            signals["interpreted_spans"].append((match.start(), match.end()))
    match = _CENTER_FIXED_RE.search(text)
    if match:
        signals["center_fixed"] = {"ref": _text_span(text, match)}
        signals["interpreted_spans"].append((match.start(), match.end()))
    match = _MOVEMENT_REQUEST_RE.search(text)
    if match:
        signals["movement_request"] = {"ref": _text_span(text, match)}
        signals["interpreted_spans"].append((match.start(), match.end()))
    # A narrow reference to the FORM's fixed point ("按照表单固定点检查") points at a supplied fact.
    # It is only *interpreted* when the form itself licenses a fixed point (the caller passes that
    # fact): against a movable range the same phrase stays unparsed, so a fixed reference vs a
    # genuinely movable form is still ambiguous/needing input. It never becomes a text fact on its
    # own and never invents a point.
    match = _FORM_FIXED_REF_RE.search(text)
    if match:
        signals["form_fixed_ref"] = {"ref": _text_span(text, match)}
        if form_fixed_licensed:
            signals["interpreted_spans"].append((match.start(), match.end()))
    for clause in _CLAUSE_BLOCK_RE.finditer(text):
        literal = clause.group().strip()
        literal = _CONDITION_PREFIX_RE.sub("", literal)
        plate_assertion = _EXACT_PLATE_RE.fullmatch(literal)
        requirement = _REQUIREMENT_RE.fullmatch(literal)
        accepted = False
        if plate_assertion:
            noun, value, unit = plate_assertion.groups()
            key = "width_set" if noun in ("底板宽度", "板宽") else "height_set"
            # A second assertion is not silently discarded; it remains unparsed unless the
            # existing subset already covered this exact clause.
            if signals[key] is None:
                signals[key] = {"value": float(value), "unit": _UNIT_WORDS[unit], "ref": _text_span(text, clause)}
                accepted = True
        elif requirement:
            noun, value, unit = requirement.groups()
            signals["requirement_assertions"].append({
                "field": _REQUIREMENT_FIELDS[noun], "value": float(value),
                "unit": _UNIT_WORDS[unit], "ref": _text_span(text, clause),
            })
            accepted = True
        elif form is not None and _REST_FORM_REF_RE.fullmatch(literal):
            accepted = True  # preserve already supplied facts/licences, never supply new ones
        elif (form is not None and _PLATE_KEEP_REF_RE.fullmatch(literal)
              and not form.get("plate", {}).get("editable") and form.get("base_holes")):
            accepted = True
        elif form_fixed_licensed and _FIXED_FORM_CLAUSE_RE.fullmatch(literal):
            accepted = True
        if accepted:
            signals["interpreted_spans"].append((clause.start(), clause.end()))
    for feature, pattern in _UNSUPPORTED_PATTERNS:
        match = pattern.search(text)
        if match:
            signals["unsupported"].append({"feature": feature, "ref": _text_span(text, match)})
            signals["interpreted_spans"].append((match.start(), match.end()))
    for match in _ROTATION_RE.finditer(text):
        value = float(match.group(1))
        signals["rotation_deg"].append({"value": value, "ref": _text_span(text, match)})
        signals["interpreted_spans"].append((match.start(), match.end()))
        if value != 0:
            signals["unsupported"].append({"feature": "rotation_not_allowed", "ref": _text_span(text, match)})
    for match in _THREAD_SPEC_RE.finditer(text):
        signals["thread_specs"].append({"spec": match.group(0), "ref": _text_span(text, match)})

    # Anything dimension-like or constraint-like the subset did NOT interpret must be confirmed.
    covered = signals["interpreted_spans"] + [tuple(span) for span in verified_spans]

    def is_covered(start: int, end: int) -> bool:
        return any(start >= span_start and end <= span_end for span_start, span_end in covered)

    for pattern in (_DIMENSION_LIKE_RE, _CONSTRAINT_WORDS_RE):
        for match in pattern.finditer(text):
            if not is_covered(match.start(), match.end()):
                signals["unparsed"].append({"ref": _text_span(text, match)})

    # Text the fixed subset does NOT interpret must be confirmed, never silently dropped. The old
    # guard only looked for an ASCII number with a unit next to a constraint word, so a Chinese
    # width cap (整个板子横向最多九厘米), a unit-less pitch (孔距固定三十) or a lower bound
    # (板宽最少…) passed as READY. Those are now unparsed spans; a *verified* text proposal
    # (P1) marks its exact quote covered, so only the precise clause it proves is silenced.
    extra: list[dict[str, Any]] = []

    def flag(pattern: re.Pattern[str]) -> None:
        for match in pattern.finditer(text):
            if not is_covered(match.start(), match.end()):
                extra.append({"ref": _text_span(text, match), "_span": (match.start(), match.end())})

    flag(_DIMENSION_NOUN_RE)
    flag(_EXTRA_BOUND_RE)
    # Approximate dimension language (板宽差不多九厘米) must never read as a precise value, even when
    # the fixed subset would otherwise match it. Flag the approximate word's own span when a
    # dimension word or a length unit is adjacent, so a verified proposal cannot mask the qualifier.
    for approx in _APPROX_WORD_RE.finditer(text):
        window = text[max(0, approx.start() - 6):min(len(text), approx.end() + 6)]
        # Deliberately NOT gated on is_covered: a verified proposal must never mask the qualifier.
        if _DIMENSION_NEAR_RE.search(window):
            extra.append({"ref": _text_span(text, approx), "_span": (approx.start(), approx.end())})
    # A Chinese numeral that sits next to a constraint word but is not inside any interpreted span
    # (孔距固定三十) is dimension-like; a bare numeral elsewhere is left alone.
    for word in _CN_NEAR_WORD_RE.finditer(text):
        for number in _CN_NUMBER_RE.finditer(text):
            if is_covered(number.start(), number.end()):
                continue
            if abs(number.start() - word.end()) <= 3 or abs(word.start() - number.end()) <= 3:
                extra.append({"ref": _text_span(text, number), "_span": (number.start(), number.end())})

    seen: set[tuple[int, int]] = set()
    for entry in extra:
        span = entry.pop("_span")
        if span in seen:
            continue
        seen.add(span)
        signals["unparsed"].append(entry)
    return signals


# ---------------------------------------------------------------------------
# The compiler
# ---------------------------------------------------------------------------


def _missing_length_paths(value: Any, path: str = "form") -> list[str]:
    """Walk a schema-validated intake form, never derive a missing number from text/card."""
    if isinstance(value, Mapping):
        if set(value) == {"value", "unit"}:
            return [path] if value["value"] is None else []
        return [p for key, item in value.items() for p in _missing_length_paths(item, f"{path}.{key}")]
    if isinstance(value, list):
        return [p for i, item in enumerate(value) for p in _missing_length_paths(item, f"{path}[{i}]")]
    return []


def _make_draft(request: Mapping[str, Any], card: Mapping[str, Any], *, outcome: str,
                proposals: Sequence[Any] = (), missing: Sequence[Any] = (), conflicts: Sequence[Any] = (),
                unsupported: Sequence[Any] = (), text_interpretations: Sequence[Any] = (),
                now: str | None = None) -> dict[str, Any]:
    draft = {
        "schema_version": INTAKE_SCHEMA_VERSION,
        "draft_id": f"draft-{request['request_id']}-r{request['request_revision']}",
        "request_id": request["request_id"], "request_revision": request["request_revision"],
        "request_sha256": _content_hash(request), "device_card_id": card["device_id"],
        "device_card_sha256": _content_hash(card), "outcome": outcome,
        "field_proposals": list(proposals), "missing_fields": list(missing),
        "conflicts": list(conflicts), "unsupported_features": list(unsupported),
        "program": {"id": COMPILER_ID, "version": COMPILER_VERSION},
        "feasibility": "not_evaluated_by_intake", "created_at": now if now is not None else _utc_now(),
    }
    if text_interpretations:
        draft["text_interpretations"] = list(text_interpretations)
    draft["draft_hash"] = draft_hash(draft)
    return draft


def verify_text_proposals(text: str, text_proposals: Any) -> list[dict[str, Any]]:
    """Verify each model text proposal against the real request text (043 verifier).

    The model hands in only a closed ``{field_path, kind, quote{start,end,literal}, value, unit}``;
    every proposal is re-checked against *this* text and the program re-derives the number, the
    unit and the source. Any invalid item refuses the whole call with a stable business code - a
    bad proposal is never silently dropped and the rest never partially accepted. Only
    ``plate.width`` / ``upper_bound`` is supported; two proposals for the same field are refused
    rather than merged ambiguously. The returned records are the program facts (never the model's
    ``value``/``unit``) that go into ``text_interpretations``.
    """
    if text_proposals is None:
        return []
    # A closed JSON list only: a tuple/str/dict/bool is not the documented shape and is refused
    # rather than coerced.
    if not isinstance(text_proposals, list):
        raise IntakeError("TEXT_PROPOSALS_SHAPE", "text_proposals must be a JSON list of proposal objects")
    proposals = list(text_proposals)
    if len(proposals) > MAX_TEXT_PROPOSALS:
        raise IntakeError("TEXT_PROPOSALS_TOO_MANY", f"at most {MAX_TEXT_PROPOSALS} text proposals are accepted, got {len(proposals)}")
    interpretations: list[dict[str, Any]] = []
    seen_fields: set[str] = set()
    for index, proposal in enumerate(proposals):
        if not isinstance(proposal, Mapping):
            raise IntakeError("TEXT_PROPOSAL_INVALID", f"text_proposals[{index}] is not an object")
        field_path = proposal.get("field_path")
        kind = proposal.get("kind")
        if field_path != _SUPPORTED_PROPOSAL_FIELD or kind != _SUPPORTED_PROPOSAL_KIND:
            raise IntakeError(
                "TEXT_PROPOSAL_UNSUPPORTED",
                f"text_proposals[{index}] targets {field_path!r}/{kind!r}; only {_SUPPORTED_PROPOSAL_FIELD}/{_SUPPORTED_PROPOSAL_KIND} is supported",
            )
        if field_path in seen_fields:
            raise IntakeError("TEXT_PROPOSAL_DUPLICATE_FIELD", f"two proposals for {field_path!r} cannot be merged unambiguously")
        try:
            verified = verify_width_cap_proposal(text, proposal)
        except ProposalError as exc:
            raise IntakeError(exc.code, f"text_proposals[{index}] was refused: {exc}") from exc
        seen_fields.add(field_path)
        quote = proposal["quote"]
        start, end = int(quote["start"]), int(quote["end"])
        interpretations.append(
            {
                "field_path": verified["field_path"],
                "kind": verified["kind"],
                "quote": {"start": start, "end": end, "literal": quote["literal"]},
                "value_mm": verified["value_mm"],
                "unit_in": verified["unit_in"],
                "source_ref": verified["source"]["ref"],
            }
        )
    return interpretations


def _normalize_text_proposals(text_proposals: Any) -> list[dict[str, Any]]:
    """The closed proposal list in its persisted, canonical form (already 043-verified).

    The stored shape keeps the *original* model assertion shape (``field_path``/``kind``/``quote``/
    ``value``/``unit``), never the program ``text_interpretations`` fact - a later re-verification
    must re-read the real text from the quote, not trust a stored program value. ``None`` (no
    proposals) becomes the empty list, so an old stage record with no such key is identical.
    """
    if text_proposals is None:
        return []
    out: list[dict[str, Any]] = []
    for proposal in text_proposals:
        quote = proposal["quote"]
        out.append(
            {
                "field_path": proposal["field_path"],
                "kind": proposal["kind"],
                "quote": {"start": int(quote["start"]), "end": int(quote["end"]), "literal": quote["literal"]},
                "value": proposal["value"],
                "unit": proposal["unit"],
            }
        )
    out.sort(key=lambda item: (item["field_path"], item["kind"], item["quote"]["start"], item["quote"]["end"]))
    return out


def _raw_staged_proposals(staged: Mapping[str, Any]) -> list[Any]:
    """The *raw* stored proposals of a stage record, strictly.

    A missing key is an old record and means no proposals (the empty list); a present value must be
    a JSON list - a dict/str/bool/tuple-shaped stored value is refused with a stable code, never
    silently coerced via ``list(... or [])``.
    """
    raw = staged.get("text_proposals", None)
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise IntakeError("STAGE_PROPOSALS_INVALID", "the staged text_proposals are not a JSON list")
    return raw


def _prepare_text_proposals(text: str, text_proposals: Any) -> list[dict[str, Any]] | None:
    """Strictly verify a *caller-supplied* raw proposal list; return its canonical stored form.

    ``None`` means "not supplied" and returns ``None`` (the caller then uses the trusted stage).
    Any supplied value must be a JSON list and is verified with the 043 verifier against the real
    text **before** normalization, so an unknown key (``source``), a coerced bool offset or a
    non-list container is refused - the sanitized canonical form is never allowed to stand in for
    real-text verification.
    """
    if text_proposals is None:
        return None
    if not isinstance(text_proposals, list):
        raise IntakeError("TEXT_PROPOSALS_SHAPE", "text_proposals must be a JSON list of proposal objects")
    verify_text_proposals(text, text_proposals)
    return _normalize_text_proposals(text_proposals)


def _find_published_revision(index: Mapping[str, Any], request_id: str, request_revision: int) -> Mapping[str, Any] | None:
    """Search *every* task in the index for a published revision of this request revision.

    A re-stage of an already-published request revision must not change its proposals; scanning all
    tasks (never one presumed task id) means a revision published under a different task id is
    still found.
    """
    for entry in index.get("tasks", {}).values():
        for record in entry.get("revisions", []):
            if record.get("request_id") == request_id and int(record.get("request_revision", -1)) == int(request_revision):
                return record
    return None


def _recompile_staged_locked(request: Mapping[str, Any], card: Mapping[str, Any], staged: Mapping[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Recompile a staged record from its *persisted* proposals and require the exact draft.

    Lock-free (the caller holds the registry lock): re-reads the real text through the 043 verifier
    and refuses if the stored draft hash/outcome no longer follow - a tampered stage (props, quote,
    value or hash) is caught here rather than trusted.
    """
    proposals = _raw_staged_proposals(staged)
    draft = compile_draft(request, card, text_proposals=proposals)
    if draft["draft_hash"] != staged.get("draft_hash") or draft.get("outcome") != staged.get("outcome"):
        raise IntakeError("STAGE_INCONSISTENT", "the staged record does not match a recompilation from its own persisted proposals")
    return draft, proposals


def read_staged_compile(
    registry_root: str | Path,
    *,
    request: Mapping[str, Any],
    card: Mapping[str, Any],
    attachment_sha256: str,
    session_scope: str,
) -> dict[str, Any]:
    """Read the current stage under the registry lock and recompile it from its persisted proposals.

    This is the trusted, read-only source a later bridge uses to obtain the staged proposals and the
    exact draft: it never creates a receipt, never writes the stage, and never accepts a
    caller-supplied hash as fact. Every raw binding (request bytes, card bytes, attachment bytes
    hash, session scope, revision) is checked against the stored record, then the draft is
    re-derived with :func:`compile_draft` from the stored proposals and must reproduce the stored
    ``draft_hash``/``outcome``. Because it holds the lock for the whole read+recompile, a stage
    change between the read and any later commit is caught by that commit's own lock.
    """
    issues = validate_request(request)
    if issues:
        raise IntakeError("REQUEST_INVALID", "request.schema.json rejected the document", issues=issues)
    if card.get("device_id") != request.get("device_card_id"):
        raise IntakeError("DEVICE_CARD_MISMATCH", "the card does not match request.device_card_id")
    if not isinstance(attachment_sha256, str) or not _SHA256_HEX.fullmatch(attachment_sha256):
        raise IntakeError("ATTACHMENT_HASH_INVALID", "the attachment bytes hash must be 64 hex")
    if not isinstance(session_scope, str) or not session_scope.strip():
        raise IntakeError("CONFIRMATION_SCOPE_MISSING", "a session scope is required")

    root = Path(registry_root)
    with _registry_lock(root):
        index = load_registry_index(root)
        staged = index.get("stages", {}).get(request["request_id"])
        if staged is None:
            raise IntakeError("STAGE_MISSING", "the request was never staged")
        if int(staged.get("request_revision", 0)) != int(request["request_revision"]):
            raise IntakeError("STALE_DRAFT", f"request {request['request_id']} is staged at revision {staged.get('request_revision')}, not {request['request_revision']}")
        if staged.get("request_sha256") != _content_hash(request):
            raise IntakeError("STALE_DRAFT", "the staged request bytes differ from the supplied request")
        if staged.get("device_card_sha256") != _content_hash(card):
            raise IntakeError("DEVICE_CARD_CHANGED", "the staged device card differs from the supplied card")
        if staged.get("attachment_sha256") != attachment_sha256:
            raise IntakeError("STAGE_ATTACHMENT_MISMATCH", "the attachment bytes hash does not match the staged request")
        if staged.get("session_scope") != session_scope:
            raise IntakeError("SESSION_MISMATCH", "the stage belongs to another session scope")
        draft, proposals = _recompile_staged_locked(request, card, staged)
        return {
            "draft": draft,
            "text_proposals": proposals,
            "staged": {
                "request_id": staged["request_id"],
                "request_revision": int(staged["request_revision"]),
                "request_sha256": staged["request_sha256"],
                "device_card_sha256": staged["device_card_sha256"],
                "draft_hash": staged["draft_hash"],
                "outcome": staged.get("outcome"),
                "attachment_sha256": staged["attachment_sha256"],
                "session_scope": staged["session_scope"],
            },
        }


def compile_draft(
    request: Mapping[str, Any],
    card: Mapping[str, Any],
    *,
    now: str | None = None,
    text_proposals: Sequence[Any] | None = None,
) -> dict[str, Any]:
    """Compile one request + card into a ConstraintDraft (deterministic).

    Raises :class:`IntakeError` only for structurally unusable inputs (bad schema, bad units,
    card mismatch, unsafe source refs); everything else is reported inside the draft as missing
    fields, conflicts or unsupported features.
    """
    issues = validate_request(request)
    if issues:
        raise IntakeError("REQUEST_INVALID", "request.schema.json rejected the document", issues=issues)
    if card.get("device_id") != request.get("device_card_id"):
        raise IntakeError("DEVICE_CARD_MISMATCH", "the card does not match request.device_card_id")
    text = request["text"]
    # A verified text proposal silences exactly its own quote in the unparsed guard: the program
    # proved that clause, so it is no longer "uninterpreted". A second condition in the same text
    # is a different span and still forces NEEDS_INPUT.
    text_interpretations = verify_text_proposals(text, text_proposals)
    missing_lengths = _missing_length_paths(request["form"])
    if missing_lengths:
        return _make_draft(
            request, card, outcome="NEEDS_INPUT", now=now, text_interpretations=text_interpretations,
            missing=[{"path": path, "question": f"请在表单补充 {path} 的数值及已声明单位；当前为空，不得猜测或冻结。"}
                     for path in missing_lengths],
        )
    lengths = _request_lengths_mm(request)
    verified_spans = [(item["quote"]["start"], item["quote"]["end"]) for item in text_interpretations]
    # The program fact that the form licenses a *fixed* point: it lets a narrow "按照表单固定点检查"
    # reference be recognised without inventing a point. The form's own fixed centre is used verbatim.
    form_fixed_licensed = lengths.get("license", {}).get("mode") == "fixed" if isinstance(lengths.get("license"), Mapping) else False
    signals = parse_text_signals(text, verified_spans=verified_spans, form_fixed_licensed=form_fixed_licensed, form=request["form"])

    proposals: list[dict[str, Any]] = []
    missing: list[dict[str, Any]] = []
    conflicts: list[dict[str, Any]] = []
    unsupported: list[dict[str, Any]] = list(signals["unsupported"])

    def propose(path: str, disposition: str, *, value_mm: float | None = None, unit_in: str | None = None, kind: str, ref: str, reason: str | None = None) -> None:
        proposals.append({"field_path": path, "disposition": disposition, "value_mm": value_mm, "unit_in": unit_in, "source": {"kind": kind, "ref": ref}, "reason": reason})

    def conflict(path: str, form_value: Any, form_ref: str, text_value: Any, text_ref: str) -> None:
        conflicts.append({"path": path, "form": {"value": form_value, "ref": form_ref}, "text": {"value": text_value, "ref": text_ref}})

    # --- plate ------------------------------------------------------------
    width = lengths["plate_width"]
    height = lengths["plate_height"]
    thickness = lengths["plate_thickness"]
    propose("plate.width", "keep", value_mm=width, kind="form", ref="form.plate.width")
    propose("plate.height", "keep", value_mm=height, kind="form", ref="form.plate.height")
    propose("plate.thickness", "locked", value_mm=thickness, kind="form", ref="form.plate.thickness", reason="thickness stays locked in the new intake path")
    for dim, value, bound_key, set_key in (("width", width, "width_bound", "width_set"), ("height", height, "height_bound", "height_set")):
        rng = lengths["editable"].get(dim)
        bound = signals[bound_key]
        set_signal = signals[set_key]
        # A cap ("不超过 N") is an upper bound; a set ("改为 N") is a nominal change. They are
        # different facts: a cap never grants headroom by itself, a set never silently raises a
        # locked freeze. Values are compared exactly on the converted mm (no tolerance that could
        # change what the input means).
        cap = convert_length(bound["value"], bound["unit"]) if bound else None
        cap_ref = bound["ref"] if bound else None
        cap_unit = bound["unit"] if bound else None
        if dim == "width" and text_interpretations:
            # A verified text proposal is a program fact (the model only quoted real text): its
            # re-derived mm is a cap. Only one proposal per field reaches here (the verifier refuses
            # duplicates). When the fixed ASCII subset ALSO found a width cap, the two are merged by
            # keeping the STRICTER one (the minimum upper bound): an already-parsed ASCII cap is
            # never overwritten or dropped by a looser proposal (old 70 + proposal 90 stays 70 ->
            # a locked-80 conflict; old 85 + proposal 90 keeps 85). A cap is never widened.
            verified = text_interpretations[0]
            verified_cap = float(verified["value_mm"])
            if cap is None or verified_cap < cap:
                cap = verified_cap
                cap_ref = verified["source_ref"]
                cap_unit = verified["unit_in"]
        wanted = convert_length(set_signal["value"], set_signal["unit"]) if set_signal else None
        if cap is not None and wanted is not None and wanted > cap:
            conflict(f"plate.{dim}", f"cap {_fmt_mm(cap)}", cap_ref, f"set {_fmt_mm(wanted)}", set_signal["ref"])
        if rng is None:
            # Locked dimension. A cap below the frozen value is unsatisfiable; a cap at or above it
            # merely restates the current bound and adds no editable permission (the dimension stays
            # locked at its value). A set that moves the value stays a conflict.
            if cap is not None:
                if cap < value:
                    conflict(f"plate.{dim}", f"locked at {_fmt_mm(value)}", f"form.plate.{dim}", f"cap {_fmt_mm(cap)}", cap_ref)
                else:
                    propose(f"plate.{dim}", "keep", value_mm=value, kind="text", ref=cap_ref, reason=f"cap {_fmt_mm(cap)} is not binding (locked at {_fmt_mm(value)})")
            if set_signal is not None:
                if wanted != value:
                    conflict(f"plate.{dim}", f"locked at {_fmt_mm(value)}", f"form.plate.{dim}", f"{_fmt_mm(wanted)}", set_signal["ref"])
                else:
                    propose(f"plate.{dim}", "keep", value_mm=value, kind="text", ref=set_signal["ref"])
        else:
            low, high = rng
            effective_max = high
            if cap is not None:
                if cap < low:
                    conflict(f"plate.{dim}", f"editable range [{_fmt_mm(low)}, {_fmt_mm(high)}]", f"form.plate.editable.{dim}", f"cap {_fmt_mm(cap)}", cap_ref)
                elif cap < high:
                    effective_max = cap
                    propose(f"plate.{dim}.editable.max", "proposed", value_mm=cap, unit_in=cap_unit, kind="text", ref=cap_ref, reason="bounded above")
                else:
                    propose(f"plate.{dim}", "keep", value_mm=value, kind="text", ref=cap_ref, reason=f"cap {_fmt_mm(cap)} does not tighten the range")
            if set_signal is not None:
                if wanted < low or wanted > effective_max:
                    detail = f"editable range [{_fmt_mm(low)}, {_fmt_mm(high)}]" + (f" under cap {_fmt_mm(cap)}" if cap is not None and cap < high else "")
                    conflict(f"plate.{dim}", detail, f"form.plate.editable.{dim}", f"{_fmt_mm(wanted)}", set_signal["ref"])
                elif wanted != value:
                    propose(f"plate.{dim}", "proposed", value_mm=wanted, unit_in=set_signal["unit"], kind="text", ref=set_signal["ref"])
                else:
                    propose(f"plate.{dim}", "keep", value_mm=value, kind="text", ref=set_signal["ref"])
            # A cap below the nominal would make the draft self-contradictory (nominal above its own
            # effective maximum) - that is a conflict, never a READY draft.
            if cap is not None and low <= cap < value:
                conflict(f"plate.{dim}", f"nominal {_fmt_mm(value)}", f"form.plate.{dim}", f"cap {_fmt_mm(cap)}", cap_ref)
    if signals["thickness_change"]:
        signal = signals["thickness_change"]
        wanted = convert_length(signal["value"], signal["unit"])
        if wanted != thickness:
            conflict("plate.thickness", f"locked at {_fmt_mm(thickness)}", "form.plate.thickness", f"{_fmt_mm(wanted)}", signal["ref"])
        else:
            propose("plate.thickness", "keep", value_mm=thickness, kind="text", ref=signal["ref"])
    if signals["thickness_keep"]:
        signal = signals["thickness_keep"]
        wanted = convert_length(signal["value"], signal["unit"])
        if wanted != thickness:
            conflict("plate.thickness", f"locked at {_fmt_mm(thickness)}", "form.plate.thickness", f"保持 {_fmt_mm(wanted)}", signal["ref"])
        else:
            propose("plate.thickness", "keep", value_mm=thickness, kind="text", ref=signal["ref"])

    # --- base holes -------------------------------------------------------
    propose("base_holes.diameter", "locked", value_mm=lengths["base_hole_diameter"], kind="form", ref="form.base_holes.diameter", reason="base holes are frozen")
    propose("base_holes.centers", "locked", kind="form", ref="form.base_holes.centers", reason="base holes are frozen")

    # --- device interface (card; device dimensions only) -------------------
    for field_name, path in (("body_size_mm", "device.body_size_mm"), ("mounting_hole_pitch_mm", "device.mounting_hole_pitch_mm"), ("hole_offsets_mm", "device.hole_offsets_mm")):
        field = _card_field(card, field_name)
        if field is None or field.get("value") in (None, [], {}):
            missing.append({"path": path, "question": f"设备卡缺少 {field_name}：请补充登记的设备安装尺寸（不能由模型猜测）"})
        else:
            propose(path, "keep", kind="device_card", ref=f"device_card.{field_name}")
    propose("device.source_map.device_interface", "keep", kind="program", ref="device_card.interface_fields", reason="device interface dimensions come from the registered card; environment and requirements never do")

    # --- plate hole diameter (form fact; thread specs are never diameters) -
    if "plate_hole_diameter" in lengths:
        propose("mounting.plate_hole_diameter", "keep", value_mm=lengths["plate_hole_diameter"], kind="form", ref="form.mounting.plate_hole_diameter")
        signal = signals["hole_diameter"]
        if signal:
            wanted = convert_length(signal["value"], signal["unit"])
            if wanted != lengths["plate_hole_diameter"]:
                conflict("mounting.plate_hole_diameter", _fmt_mm(lengths["plate_hole_diameter"]), "form.mounting.plate_hole_diameter", _fmt_mm(wanted), signal["ref"])
    else:
        if signals["hole_diameter"]:
            signal = signals["hole_diameter"]
            propose("mounting.plate_hole_diameter", "proposed", value_mm=convert_length(signal["value"], signal["unit"]), unit_in=signal["unit"], kind="text", ref=signal["ref"])
        else:
            missing.append({"path": "mounting.plate_hole_diameter", "question": "请提供板侧安装通孔直径的数值（mm）；M3 等螺纹规格不是孔径"})
    for thread in signals["thread_specs"]:
        propose("mounting.plate_hole_diameter", "rejected", kind="text", ref=thread["ref"], reason="THREAD_SPEC_NOT_DIAMETER")

    # --- movement license / sensor domain ---------------------------------
    # FAIRNESS: a movable (x_range/y_range/xy_range) licence is a *domain*, not a chosen point. The
    # draft must display only the user's interval facts - never a program-selected scalar endpoint,
    # which would be a candidate hint before the model designs. A non-fixed axis is therefore
    # proposed with a null scalar and a reason that carries the whole licensed range, pending the
    # model's explicit design. A *fixed* axis keeps its explicitly supplied scalar (a real fact).
    license_mm = lengths.get("license")
    if license_mm is None:
        missing.append({"path": "form.mounting.movement_license", "question": "请填写设备中心的允许范围事实（固定点或明确许可的平移区间）及其来源（form:<字段> 或 text[a:b] 实文片段）；模型不得臆测可移动"})
    else:
        propose("mounting.movement_license.source_ref", "keep", kind="form", ref=license_mm["source_ref"])
        if license_mm["mode"] == "fixed":
            cx, cy = license_mm["center"]
            propose("sensor.allowed_center_x", "locked", value_mm=cx, kind="form", ref="form.mounting.movement_license.center")
            propose("sensor.allowed_center_y", "locked", value_mm=cy, kind="form", ref="form.mounting.movement_license.center")
        else:
            def propose_axis(path: str, span: tuple[float, float] | float, ref: str) -> None:
                # A scalar span is an explicitly fixed axis (kept as a locked fact); a (min, max)
                # tuple is a movable domain, shown as the whole range with NO selected point.
                if isinstance(span, tuple):
                    low, high = span
                    propose(path, "proposed", kind="form", ref=ref, reason=f"licensed range [{_fmt_mm(low)}, {_fmt_mm(high)}]; the model supplies the explicit centre within this range")
                else:
                    propose(path, "locked", value_mm=span, kind="form", ref=ref)

            if license_mm["mode"] == "y_range":
                propose_axis("sensor.allowed_center_x", license_mm["center_x"], "form.mounting.movement_license.center_x")
                propose_axis("sensor.allowed_center_y", license_mm["center_y"], "form.mounting.movement_license.center_y")
                low, high = license_mm["center_y"]
                licensed_axis = f"licensed y range [{_fmt_mm(low)}, {_fmt_mm(high)}]"
            else:
                propose_axis("sensor.allowed_center_x", license_mm["center_x"], "form.mounting.movement_license.center_x")
                if license_mm["mode"] == "x_range":
                    propose_axis("sensor.allowed_center_y", license_mm["center_y"], "form.mounting.movement_license.center_y")
                else:
                    propose_axis("sensor.allowed_center_y", license_mm["center_y"], "form.mounting.movement_license.center_y")
                low, high = license_mm["center_x"]
                licensed_axis = f"licensed x range [{_fmt_mm(low)}, {_fmt_mm(high)}]"
            if signals["center_fixed"]:
                # A genuine "中心不能动" against a *movable* licensed range is always a real conflict:
                # text asserting a fixed centre cannot be satisfied by a movable domain. Referencing
                # a form fixed point does not override that - against a movable form there is no such
                # fixed point, so the fixed text stands.
                conflict("sensor.allowed_center_x", licensed_axis, license_mm["source_ref"], "文本称中心固定不动", signals["center_fixed"]["ref"])
        if signals["movement_request"] and license_mm["mode"] == "fixed":
            conflict("form.mounting.movement_license", "fixed at the licensed point", license_mm["source_ref"], "文本要求选择/移动位置", signals["movement_request"]["ref"])
    propose("sensor.allowed_rotation_deg", "locked", value_mm=0.0, kind="program", ref="p0_round_hole_rotation_zero")

    # --- environment (explicit form input; never from the card) -----------
    environment = lengths.get("environment")
    raw_environment = request["form"].get("environment") if isinstance(request["form"].get("environment"), Mapping) else None
    if environment is None:
        missing.append({"path": "form.environment", "question": "请填写环境表单（固定柱/螺钉头包络/连接器空间或明确 not_covered/支撑接触）；缺字段不等于空环境"})
    else:
        for key in ("fixed_cylinders", "screw_heads"):
            if raw_environment is None or key not in raw_environment:
                missing.append({"path": f"form.environment.{key}", "question": f"环境表单缺少 {key}（如确无障碍请显式给空列表，不能缺字段）"})
        if raw_environment is None or "fixed_cylinders" not in raw_environment or "screw_heads" not in raw_environment:
            environment["fixed_cylinders"] = environment.get("fixed_cylinders", [])
            environment["screw_heads"] = environment.get("screw_heads", [])
            if unsupported or conflicts:
                pass
        propose("environment.source", "keep", kind="form", ref="form.environment.source")
        propose("environment.fixed_cylinders", "keep", kind="form", ref="form.environment.fixed_cylinders", reason=f"{len(environment['fixed_cylinders'])} cylinder(s)")
        propose("environment.screw_heads", "keep", kind="form", ref="form.environment.screw_heads", reason=f"{len(environment['screw_heads'])} screw-head envelope(s)")
        connector = environment.get("connector_access")
        if connector is None:
            missing.append({"path": "form.environment.connector_access", "question": "请声明连接器空间盒，或明确写 not_covered（不得缺省当作已覆盖）"})
        elif connector == "not_covered":
            propose("environment.connector_access", "keep", kind="form", ref="form.environment.connector_access", reason="explicitly not covered; never presented as a verified space")
        else:
            propose("environment.connector_access", "keep", kind="form", ref="form.environment.connector_access")
        if not environment["fixed_cylinders"]:
            # The frozen scene contract requires at least one fixed_obstacle cylinder; an explicit
            # empty list is received, but it cannot be expressed as a scene - so the compiler asks
            # for one instead of silently inventing or silently proceeding.
            missing.append({"path": "form.environment.fixed_cylinders", "question": "场景合同要求至少一个固定柱障碍（圆柱 fixed_obstacle）；显式空列表无法表达，请提供一个固定柱"})
        if len(environment["screw_heads"]) != len(lengths["base_hole_centers"]):
            # The frozen contract needs exactly one screw-head envelope per base hole.
            missing.append({"path": "form.environment.screw_heads", "question": f"每个底座孔需要恰好一个螺钉头包络：{len(lengths['base_hole_centers'])} 个孔、当前 {len(environment['screw_heads'])} 个包络"})
        if not environment["fixed_cylinders"] and not environment["screw_heads"] and connector in (None, "not_covered"):
            missing.append({"path": "form.environment.objects", "question": "环境没有任何障碍物也没有连接器盒：场景合同至少需要一个环境对象；请显式提供至少一个对象"})

    # --- requirements (explicit form input; never re-derived from the card)
    requirements = lengths.get("requirements")
    if requirements is None:
        missing.append({"path": "form.requirements", "question": "请填写间隙/边距/孔边材料/公差要求及其来源；不得从设备卡暗中套用"})
    else:
        propose("requirements", "keep", kind="form", ref="form.requirements", reason=f"source {requirements['source']}")
        for assertion in signals["requirement_assertions"]:
            name = assertion["field"]
            text_value = convert_length(assertion["value"], assertion["unit"])
            if text_value != requirements[name]:
                conflict(f"requirements.{name}", _fmt_mm(requirements[name]), f"form.requirements.{name}",
                         _fmt_mm(text_value), assertion["ref"])

    # --- uninterpreted dimension/constraint text --------------------------
    for entry in signals["unparsed"]:
        missing.append({"path": "text.unparsed", "question": f"文本包含未解释的尺寸/约束片段，请确认意图：{entry['ref']}"})

    for entry in unsupported:
        propose(f"text.{entry['feature']}", "rejected", kind="text", ref=entry["ref"], reason="P0 scope")

    if unsupported:
        outcome = "UNSUPPORTED_REQUEST"
    elif conflicts:
        outcome = "CONFLICTING_INPUT"
    elif missing:
        outcome = "NEEDS_INPUT"
    else:
        outcome = "READY_TO_CONFIRM"

    return _make_draft(request, card, outcome=outcome, proposals=proposals, missing=missing,
                       conflicts=conflicts, unsupported=unsupported,
                       text_interpretations=text_interpretations, now=now)


def draft_hash(draft: Mapping[str, Any]) -> str:
    """Canonical hash of the draft's meaning: everything except ``draft_hash`` and ``created_at``."""
    return _content_hash(_without(draft, "draft_hash", "created_at"))


def draft_identity(draft: Mapping[str, Any]) -> str:
    """Canonical content of a draft, time fields excluded - what a recompilation must reproduce."""
    return contract.canonical_json(_without(draft, "draft_hash", "created_at"))


def validate_draft(doc: Any) -> list[Any]:
    issues = list(_schema_issues("constraint-draft", doc))
    if issues or not isinstance(doc, Mapping):
        return issues
    if doc.get("draft_hash") != draft_hash(doc):
        issues.append(contract.Issue(path="draft_hash", code="DRAFT_HASH_MISMATCH", message="draft_hash does not cover this document"))
    return issues


def _utc_now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# Binding checks: a draft is never trusted because it has a hash
# ---------------------------------------------------------------------------


def verify_draft_binding(
    request: Mapping[str, Any],
    card: Mapping[str, Any],
    draft: Mapping[str, Any],
    *,
    text_proposals: Sequence[Any] | None = None,
) -> None:
    """Verify that this draft *is* the deterministic compile of this request + this card.

    The public hash proves only that nobody edited the document after its hash was recomputed;
    it proves nothing about whether the fields, proposals and outcomes still follow from the
    inputs. The compiler is deterministic, so the strongest check is to recompile (``created_at``
    excluded) and require canonical equality. A hand-edited draft - even one whose draft_hash was
    recomputed - fails here, and a card edited after the draft fails the card-hash check.

    ``text_proposals`` is an **explicit, trusted** parameter: when the draft carries
    ``text_interpretations`` the caller must hand the same verified proposals back in, and every
    quote is re-verified against *this* text before the recompile. A draft that merely carries a
    recomputed hash over fabricated interpretations therefore fails here; a proposal whose quote no
    longer matches the text is refused before any comparison. No proposals at all is the old
    behaviour, byte-for-byte.
    """
    issues = validate_draft(draft)
    if issues:
        raise IntakeError("DRAFT_INVALID", "the draft failed constraint-draft.schema.json", issues=issues)
    if draft.get("device_card_id") != card.get("device_id"):
        raise IntakeError("DEVICE_CARD_MISMATCH", "the draft names another device card")
    if draft.get("device_card_sha256") != _content_hash(card):
        raise IntakeError("DEVICE_CARD_CHANGED", "the device card changed after this draft was compiled; recompile the draft")
    if "text_interpretations" in draft and text_proposals is None:
        # A draft that claims verified interpretations cannot be re-bound without the proposals:
        # the interpretations must be re-derived, never trusted as a hash-covered fact.
        raise IntakeError("DRAFT_PROPOSALS_MISSING", "this draft carries text_interpretations; supply the verified text_proposals to re-bind it")
    recompiled = compile_draft(request, card, now=draft.get("created_at"), text_proposals=text_proposals)
    if draft_identity(recompiled) != draft_identity(draft):
        raise IntakeError("DRAFT_MISMATCH", "the draft does not match the deterministic compile of this request and card")
    if draft.get("request_sha256") != _content_hash(request):
        raise IntakeError("DRAFT_REQUEST_MISMATCH", "the draft was compiled from different request bytes")


# ---------------------------------------------------------------------------
# Compilation to task/scene (still no CAD: contract validation only)
# ---------------------------------------------------------------------------


def source_map_for(request: Mapping[str, Any]) -> dict[str, str]:
    """Where each area's numbers come from (device interface is the only vendor area)."""
    form = request["form"]
    environment_source = (form.get("environment") or {}).get("source", "user_supplied")
    requirements_source = (form.get("requirements") or {}).get("source", "user_supplied")
    return {
        "plate": "user_supplied",
        "base_holes": "user_supplied",
        "device_interface": "vendor_datasheet",
        "environment": environment_source,
        "requirements": requirements_source,
    }


def compile_task(
    draft: Mapping[str, Any],
    request: Mapping[str, Any],
    card: Mapping[str, Any],
    *,
    task_id: str,
    revision: int,
    text_proposals: Sequence[Any] | None = None,
) -> dict[str, Any]:
    """Compile the frozen task/scene documents for an accepted draft.

    Program-generated: ids, revision, scene hash, tolerances, compiler version, provenance review
    status. Deterministic for the same (draft, request, card, task_id, revision); the draft must
    be the deterministic compile of this exact request+card. ``text_proposals`` is the same
    explicit trusted parameter as in :func:`verify_draft_binding`: it is re-verified here, never
    skipped because a hash happens to match.
    """
    if not _SAFE_ID.fullmatch(task_id):
        raise IntakeError("TASK_ID_INVALID", f"task id {task_id!r} is not a safe id")
    if not isinstance(revision, int) or isinstance(revision, bool) or revision < 1:
        raise IntakeError("TASK_REVISION_INVALID", f"revision {revision!r} must be a positive integer")
    if draft.get("outcome") != "READY_TO_CONFIRM":
        raise IntakeError("DRAFT_NOT_READY", f"draft outcome is {draft.get('outcome')!r}; only READY_TO_CONFIRM compiles")
    verify_draft_binding(request, card, draft, text_proposals=text_proposals)

    lengths = _request_lengths_mm(request)
    # The draft's accepted text proposals are the bounded modifications the user asked for (a
    # width inside its permitted range, a tightened editable max, a numeric hole diameter);
    # everything else is the form / card fact. Proposals outside a permitted range never reach a
    # READY draft.
    proposed = {item["field_path"]: item.get("value_mm") for item in draft.get("field_proposals", []) if item.get("disposition") == "proposed" and item.get("value_mm") is not None}
    if "plate.width" in proposed:
        lengths["plate_width"] = float(proposed["plate.width"])
    if "plate.height" in proposed:
        lengths["plate_height"] = float(proposed["plate.height"])
    if "plate.width.editable.max" in proposed:
        low, _high = lengths["editable"]["width"]
        lengths["editable"]["width"] = (low, float(proposed["plate.width.editable.max"]))
    if "plate.height.editable.max" in proposed:
        low, _high = lengths["editable"]["height"]
        lengths["editable"]["height"] = (low, float(proposed["plate.height.editable.max"]))
    if "mounting.plate_hole_diameter" in proposed:
        lengths["plate_hole_diameter"] = float(proposed["mounting.plate_hole_diameter"])
    if "plate_hole_diameter" not in lengths:
        raise IntakeError("DRAFT_NOT_READY", "the plate hole diameter is neither in the form nor proposed by the text")
    environment = lengths.get("environment")
    requirements = lengths.get("requirements")
    if environment is None or requirements is None:
        raise IntakeError("DRAFT_NOT_READY", "environment and requirements are required form inputs")

    # Scene objects come only from the form environment, with z values used verbatim (absolute).
    objects: list[dict[str, Any]] = []
    for cylinder in environment["fixed_cylinders"]:
        objects.append(
            {
                "id": cylinder["id"],
                "kind": "cylinder",
                "role": "fixed_obstacle",
                "axis_xy": [cylinder["axis_xy"][0], cylinder["axis_xy"][1]],
                "radius": cylinder["radius"],
                "z_range": [cylinder["z_range"][0], cylinder["z_range"][1]],
            }
        )
    for index, head in enumerate(environment["screw_heads"]):
        hole = lengths["base_hole_centers"][head["base_hole_index"]]
        objects.append(
            {
                "id": f"screw_head_{index:02d}",
                "kind": "cylinder",
                "role": "screw_head_envelope",
                "base_hole_index": head["base_hole_index"],
                "axis_xy": [hole[0], hole[1]],
                "radius": head["radius"],
                "z_range": [head["z_range"][0], head["z_range"][1]],
            }
        )
    connector = environment.get("connector_access")
    if isinstance(connector, Mapping):
        objects.append(
            {
                "id": "connector_access",
                "kind": "box_local_xy_abs_z",
                "role": "connector_access",
                "local_xy_range": [{"min": connector["local_xy_range"][0][0], "max": connector["local_xy_range"][0][1]}, {"min": connector["local_xy_range"][1][0], "max": connector["local_xy_range"][1][1]}],
                "absolute_z_range": [connector["absolute_z_range"][0], connector["absolute_z_range"][1]],
            }
        )
    if not objects:
        raise IntakeError("ENVIRONMENT_EMPTY_UNSUPPORTED", "the scene contract requires at least one environment object; provide at least one obstacle or the connector box")
    support_contacts = [{"a": item["a"], "b": item["b"], "kind": "support"} for item in (environment.get("support_contacts") or [{"a": "sensor_body", "b": "plate_top"}])]

    # One line per area, from the same source map the draft uses: the plate and the frozen base
    # holes come from the submitted form, requirements carry their own declared source (which may
    # be a design assumption rather than user-supplied data), the environment states its own, and
    # only the device-interface dimensions come from the registered card's vendor fields.
    sources = source_map_for(request)
    provenance_source = (
        f"plate: {sources['plate']}; "
        f"base holes: {sources['base_holes']}; "
        f"requirements: {sources['requirements']}; "
        f"environment: {sources['environment']}"
        + (f" ({environment['note']})" if environment.get("note") else "")
        + f"; device interface dimensions: registered card {card['device_id']} (vendor datasheet fields only)"
    )
    scene = {
        "schema_version": "1.0",
        "scene_id": task_id,
        "units": "mm",
        "frame": "plate_lower_left_bottom_xyz",
        "objects": objects,
        "support_contacts": support_contacts,
        "provenance": {
            "kind": "user_supplied",
            "source": provenance_source[:512],
            "review_status": "awaiting_geometry_verification",
        },
    }
    scene_sha = contract.content_sha256(scene)

    license_mm = lengths["license"]
    if license_mm["mode"] == "fixed":
        cx = license_mm["center"][0]
        cy = license_mm["center"][1]
        allowed_x = {"min": cx, "max": cx}
        allowed_y = {"min": cy, "max": cy}
    elif license_mm["mode"] == "x_range":
        allowed_x = {"min": license_mm["center_x"][0], "max": license_mm["center_x"][1]}
        allowed_y = {"min": license_mm["center_y"], "max": license_mm["center_y"]}
    elif license_mm["mode"] == "y_range":
        allowed_x = {"min": license_mm["center_x"], "max": license_mm["center_x"]}
        allowed_y = {"min": license_mm["center_y"][0], "max": license_mm["center_y"][1]}
    else:
        allowed_x = {"min": license_mm["center_x"][0], "max": license_mm["center_x"][1]}
        allowed_y = {"min": license_mm["center_y"][0], "max": license_mm["center_y"][1]}

    locked = ["width", "height", "thickness"]
    editable: dict[str, Any] = {}
    for dim in ("width", "height"):
        if dim in lengths["editable"]:
            low, high = lengths["editable"][dim]
            editable[dim] = {"min": low, "max": high}
            locked.remove(dim)

    task = {
        "schema_version": "1.0",
        "task_id": task_id,
        "revision": revision,
        "units": "mm",
        "frame": "plate_lower_left_bottom_xyz",
        "scene_ref": f"{task_id}.scene.json",
        "scene_sha256": scene_sha,
        "request": {"language": "zh-CN", "text": request["text"]},
        "plate": {
            "width": lengths["plate_width"],
            "height": lengths["plate_height"],
            "thickness": lengths["plate_thickness"],
            "locked": locked,
            "editable": editable,
        },
        "base_holes": {
            "diameter": lengths["base_hole_diameter"],
            "centers": [[x, y] for x, y in lengths["base_hole_centers"]],
            "locked": True,
        },
        "sensor": {
            "model_id": card["device_id"],
            "body_size": [float(v) for v in _card_value(card, "body_size_mm")],
            "hole_offsets": [[float(p[0]), float(p[1])] for p in _card_value(card, "hole_offsets_mm")],
            "hole_diameter": lengths["plate_hole_diameter"],
            "allowed_center_x": allowed_x,
            "allowed_center_y": allowed_y,
            "allowed_rotation_deg": [0],
        },
        "requirements": {
            "minimum_free_clearance": requirements["minimum_free_clearance"],
            "minimum_edge_ligament": requirements["minimum_edge_ligament"],
            "minimum_hole_ligament": requirements["minimum_hole_ligament"],
        },
        "tolerances": {
            "geometry_epsilon_mm": DEFAULT_TOLERANCES["geometry_epsilon_mm"],
            "interference_volume_epsilon_mm3": DEFAULT_TOLERANCES["interference_volume_epsilon_mm3"],
            "dimensional_tolerance_mm": requirements["dimensional_tolerance"],
        },
        "provenance": {"kind": "user_supplied", "source": provenance_source[:512], "review_status": "awaiting_geometry_verification"},
    }

    task_issues = _contract_issues(contract.validate_task(task))
    if task_issues:
        raise IntakeError("COMPILED_TASK_INVALID", "the compiled task failed the real contract", issues=task_issues)
    scene_issues = _contract_issues(contract.validate_scene(scene))
    if scene_issues:
        raise IntakeError("COMPILED_SCENE_INVALID", "the compiled scene failed the real contract", issues=scene_issues)
    pair_issues = _contract_issues(contract.check_scene_against_task(scene, task))
    if pair_issues:
        raise IntakeError("COMPILED_PAIR_INVALID", "task/scene do not agree under the real contract", issues=pair_issues)
    return {"task": task, "scene": scene}


def check_initial_design(design: Any, task: Mapping[str, Any]) -> None:
    """The optional initial DesignSpec must belong to this exact task id + revision."""
    if not isinstance(design, Mapping):
        raise IntakeError("DESIGN_INVALID", "the initial design is not an object")
    if design.get("task_id") != task["task_id"] or design.get("task_revision") != task["revision"]:
        raise IntakeError(
            "DESIGN_TASK_MISMATCH",
            f"initial design is bound to {design.get('task_id')!r}@r{design.get('task_revision')!r}, not {task['task_id']!r}@r{task['revision']}",
        )
    issues = _contract_issues(contract.validate_design(design)) + _contract_issues(contract.check_design_against_task(design, task))
    if issues:
        raise IntakeError("DESIGN_INVALID", "the initial design failed the real contract", issues=issues)


# ---------------------------------------------------------------------------
# Confirmation receipts (the core checks the binding; the Host proves approval)
# ---------------------------------------------------------------------------


def check_confirmation_receipt(receipt: Any, *, draft: Mapping[str, Any], attachment_sha256: Any, expected_session_scope: Any = None) -> dict[str, Any]:
    """Verify that a receipt is bound to exactly this draft, these attachment bytes and scope.

    The receipt is produced by the trusted Host adapter from a real native approval record. This
    function checks the *binding*: draft hash, request id/revision, the exact attachment bytes
    hash the caller independently supplies, and - when the caller knows it - the session scope
    the request was staged in (a receipt replayed from another scope is refused). It does not
    and cannot prove that a human approved anything; a request-internal ``confirmed: true``, a
    model field or a free-form string is never read here.
    """
    if receipt is None:
        raise IntakeError("CONFIRMATION_MISSING", "no confirmation receipt was provided")
    if not isinstance(receipt, Mapping):
        raise IntakeError("CONFIRMATION_SHAPE", "a free-form confirmation string is not an accepted receipt")
    if receipt.get("receipt_kind") != "fitplate-confirmation-receipt":
        raise IntakeError("CONFIRMATION_SHAPE", "unknown confirmation receipt kind; free-form confirmation strings are refused")
    if not isinstance(receipt.get("receipt_id"), str) or not re.fullmatch(r"conf-[a-z0-9][a-z0-9-]{1,62}", receipt["receipt_id"]):
        raise IntakeError("CONFIRMATION_SHAPE", "receipt_id must be a conf-<id> identifier")
    if receipt.get("draft_hash") != draft.get("draft_hash"):
        raise IntakeError("CONFIRMATION_DRAFT_MISMATCH", "the receipt does not confirm this draft hash")
    if receipt.get("request_id") != draft.get("request_id") or receipt.get("request_revision") != draft.get("request_revision"):
        raise IntakeError("CONFIRMATION_REQUEST_MISMATCH", "the receipt confirms another request id/revision")
    if not isinstance(attachment_sha256, str) or not _SHA256_HEX.fullmatch(attachment_sha256):
        raise IntakeError("ATTACHMENT_HASH_INVALID", "the caller must supply the exact attachment bytes hash (64 hex)")
    if receipt.get("attachment_sha256") != attachment_sha256:
        raise IntakeError("CONFIRMATION_ATTACHMENT_MISMATCH", "the receipt was approved for different attachment bytes")
    scope = receipt.get("session_scope")
    if not isinstance(scope, str) or not scope.strip():
        raise IntakeError("CONFIRMATION_SCOPE_MISSING", "the receipt carries no session scope")
    if expected_session_scope is not None and scope != expected_session_scope:
        raise IntakeError("CONFIRMATION_SCOPE_MISMATCH", "the receipt was approved in another session scope than the staged request")
    return {
        "receipt_kind": receipt["receipt_kind"],
        "receipt_id": receipt["receipt_id"],
        "draft_hash": receipt["draft_hash"],
        "request_id": receipt["request_id"],
        "request_revision": receipt["request_revision"],
        "attachment_sha256": receipt["attachment_sha256"],
        "session_scope": scope,
        "approved_at": str(receipt.get("approved_at", "")),
    }


# ---------------------------------------------------------------------------
# The registry
# ---------------------------------------------------------------------------


def _refuse_symlinks(root: Path, target: Path) -> None:
    """Mirror of the bridge's rule: no symlink on the lexical path below the root, and the
    resolved target must stay inside the resolved root."""
    resolved_root = Path(os.path.realpath(root))
    lexical = Path(os.path.abspath(target))
    resolved = Path(os.path.realpath(lexical))
    if resolved != resolved_root and not str(resolved).startswith(str(resolved_root) + os.sep):
        raise IntakeError("PATH_ESCAPE", f"{target} escapes the registry root {resolved_root}")
    current = lexical
    while True:
        if current == Path(os.path.abspath(root)) or current == lexical.anchor:
            break
        if current.is_symlink():
            raise IntakeError("PATH_UNSAFE", f"{current} is a symlink; the registry never follows links")
        if current.parent == current:
            break
        current = current.parent


def _check_registry_root(root: Any) -> Path:
    """The caller-supplied registry root: trusted location, but its own aliases are refused."""
    if not isinstance(root, (str, os.PathLike)):
        raise IntakeError("PATH_UNSAFE", "registry root must be a path")
    path = Path(root)
    if not str(path) or any(part in ("..", "") for part in path.parts[1:] if part != ""):
        raise IntakeError("PATH_UNSAFE", f"registry root {root!r} contains an empty or '..' component")
    if path.is_symlink():
        raise IntakeError("PATH_UNSAFE", f"registry root {path} is a symlink; the registry never writes through it")
    # Refuse alias components in the root's own path (a symlinked parent would redirect writes).
    current = Path(os.path.abspath(path))
    while current != current.parent:
        if current.is_symlink():
            raise IntakeError("PATH_UNSAFE", f"registry root component {current} is a symlink")
        current = current.parent
    return path


def _registry_paths(root: str | Path) -> tuple[Path, Path]:
    base = _check_registry_root(root)
    return base, base / "index.json"


def _registry_lock(root: Path):
    class _Lock:
        def __enter__(self):
            # The root's own aliases are refused BEFORE anything is created: a symlinked root must
            # never get even a lock file written through it.
            _check_registry_root(root)
            root.mkdir(parents=True, exist_ok=True)
            _refuse_symlinks(root, root)
            lock_path = root / ".lock"
            if lock_path.is_symlink():
                raise IntakeError("PATH_UNSAFE", f"{lock_path} is a symlink")
            self._handle = open(lock_path, "a+")
            fcntl.flock(self._handle.fileno(), fcntl.LOCK_EX)
            return self

        def __exit__(self, *exc):
            try:
                fcntl.flock(self._handle.fileno(), fcntl.LOCK_UN)
            finally:
                self._handle.close()
            return False

    return _Lock()


def _empty_index() -> dict[str, Any]:
    return {"schema_version": INTAKE_SCHEMA_VERSION, "kind": REGISTRY_KIND, "index_version": REGISTRY_VERSION, "tasks": {}, "requests": {}, "stages": {}, "updated_at": _utc_now()}


def load_registry_index(root: str | Path) -> dict[str, Any]:
    _, index_path = _registry_paths(root)
    if not index_path.is_file():
        return _empty_index()
    if index_path.is_symlink():
        raise IntakeError("PATH_UNSAFE", f"{index_path} is a symlink")
    _refuse_symlinks(_check_registry_root(root), index_path)
    try:
        index = contract.load_json_file(index_path)
    except contract.JsonLoadError as exc:
        raise IntakeError("REGISTRY_INDEX_UNREADABLE", f"registry index is unreadable: {exc}") from exc
    if index.get("kind") != REGISTRY_KIND:
        raise IntakeError("REGISTRY_INDEX_INVALID", "the file is not a fitplate intake registry index")
    index.setdefault("stages", {})
    return index


def _atomic_write(path: Path, data: bytes) -> None:
    _refuse_symlinks(path.parent, path.parent)
    tmp = path.with_name(f".tmp-{path.name}-{os.getpid()}-{int.from_bytes(os.urandom(4), 'big')}")
    try:
        with open(tmp, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            tmp.unlink(missing_ok=True)


def _write_index(root: Path, index: Mapping[str, Any]) -> None:
    _, index_path = _registry_paths(root)
    _atomic_write(index_path, _serialize(index))


def _require_safe_components(root: Path, *parts: str) -> Path:
    """Resolve ``root/parts...`` refusing traversal, symlinks and escapes (bridge-style)."""
    current = root
    for part in parts:
        if not isinstance(part, str) or not part or part in (".", "..") or "/" in part or "\\" in part or "\0" in part:
            raise IntakeError("PATH_UNSAFE", f"unsafe path component {part!r}")
        current = current / part
        if current.is_symlink():
            raise IntakeError("PATH_UNSAFE", f"{current} is a symlink; the registry never follows links")
    _refuse_symlinks(root, current)
    return current


def registry_next_revision(root: str | Path, task_id: str) -> int:
    if not _SAFE_ID.fullmatch(task_id):
        raise IntakeError("TASK_ID_INVALID", f"task id {task_id!r} is not a safe id")
    index = load_registry_index(root)
    entry = index["tasks"].get(task_id)
    return int(entry["latest_revision"]) + 1 if entry else 1


# ---------------------------------------------------------------------------
# Staging: the request revision currently on the table
# ---------------------------------------------------------------------------


def stage_request(
    registry_root: str | Path,
    *,
    request: Mapping[str, Any],
    card: Mapping[str, Any],
    draft: Mapping[str, Any],
    attachment_sha256: str,
    session_scope: str,
    now: str | None = None,
    text_proposals: Sequence[Any] | None = None,
) -> dict[str, Any]:
    """Record the request revision currently staged for confirmation (the trusted caller's job).

    Staging a *newer* request revision (even one whose draft is NEEDS_INPUT, and even before any
    task is published) supersedes older revisions: an old draft can no longer be committed. The
    stage binds the request bytes, card bytes, draft hash, attachment bytes hash, scope and the
    verified text proposals, so a commit must match all of them.

    ``text_proposals`` is the same explicit, trusted parameter as in :func:`compile_draft`; it is
    re-verified against the real text here and persisted in its canonical original shape. A
    re-stage of the *same* request revision is allowed to change only the proposals/draft (same raw
    request/card/attachment/session), and only while that revision has **no published** revision -
    a published revision can never have its proposals changed.
    """
    issues = validate_request(request)
    if issues:
        raise IntakeError("REQUEST_INVALID", "request.schema.json rejected the document", issues=issues)
    if card.get("device_id") != request.get("device_card_id"):
        raise IntakeError("DEVICE_CARD_MISMATCH", "the card does not match request.device_card_id")
    if not isinstance(attachment_sha256, str) or not _SHA256_HEX.fullmatch(attachment_sha256):
        raise IntakeError("ATTACHMENT_HASH_INVALID", "the staged attachment bytes hash must be 64 hex")
    if not isinstance(session_scope, str) or not session_scope.strip():
        raise IntakeError("CONFIRMATION_SCOPE_MISSING", "staging requires the session scope the request arrived in")
    # The draft must be the deterministic compile of this request+card (a hand-edited or stale
    # draft can never be staged as this revision's draft). The *raw* proposals are verified against
    # the real text first (so an unknown key or coerced offset is refused before any normalization),
    # then the draft binding is re-checked with those same raw proposals.
    normalized = _prepare_text_proposals(request["text"], text_proposals)
    if normalized is None:
        normalized = []
    verify_draft_binding(request, card, draft, text_proposals=text_proposals)

    root = Path(registry_root)
    with _registry_lock(root):
        index = load_registry_index(root)
        stages = index.setdefault("stages", {})
        previous = stages.get(request["request_id"])
        record = {
            "request_id": request["request_id"],
            "request_revision": request["request_revision"],
            "request_sha256": _content_hash(request),
            "device_card_id": card["device_id"],
            "device_card_sha256": _content_hash(card),
            "draft_hash": draft["draft_hash"],
            "outcome": draft.get("outcome"),
            "attachment_sha256": attachment_sha256,
            "session_scope": session_scope,
            "staged_at": now if now is not None else _utc_now(),
        }
        if previous is not None:
            if int(previous.get("request_revision", 0)) > int(request["request_revision"]):
                raise IntakeError(
                    "STALE_STAGE",
                    f"request {request['request_id']} is already staged at revision {previous['request_revision']}; revision {request['request_revision']} can never be committed",
                )
            if int(previous.get("request_revision", 0)) == int(request["request_revision"]):
                raw_same = all(previous.get(key) == record[key] for key in ("request_sha256", "device_card_sha256", "attachment_sha256", "session_scope"))
                if not raw_same:
                    # Changing the raw input (request bytes, card, attachment or session) under the
                    # same identity is never a re-stage.
                    raise IntakeError("IDENTITY_CONFLICT", "this request revision is already staged with different raw input")
                same = raw_same and previous.get("draft_hash") == record["draft_hash"] and _raw_staged_proposals(previous) == normalized
                if same:
                    return {**previous, "idempotent": True}
                # The proposals/draft changed under the same raw input: allowed only while this
                # revision has no published revision (a frozen revision is immutable evidence).
                if _find_published_revision(index, request["request_id"], int(request["request_revision"])) is not None:
                    raise IntakeError("STALE_DRAFT", "this request revision is already published; its proposals can no longer change")
        if normalized:
            # Omitted when there is no proposal, so a no-proposal stage record keeps exactly its
            # old bytes; a reader treats a missing key as the empty list.
            record["text_proposals"] = normalized
        stages[request["request_id"]] = record
        index["stages"] = stages
        index["updated_at"] = record["staged_at"]
        _write_index(root, index)
        written = load_registry_index(root).get("stages", {}).get(request["request_id"])
        if written is None or any(written.get(key) != record[key] for key in ("request_sha256", "draft_hash", "attachment_sha256", "session_scope", "request_revision")):
            raise IntakeError("INDEX_WRITE_FAILED", "the stage was not readable back from the index")
        return {**record, "idempotent": False, "superseded": previous is not None}


# ---------------------------------------------------------------------------
# Publish
# ---------------------------------------------------------------------------


def _verify_revision_dir(root: Path, record: Mapping[str, Any]) -> dict[str, Any]:
    """Read one revision dir and verify it matches the index record byte-for-byte and in identity."""
    dir_path = _require_safe_components(root, *str(record["dir"]).split("/"))
    if not dir_path.is_dir():
        raise IntakeError("REVISION_DIR_MISSING", f"{dir_path} does not exist")
    manifest_path = dir_path / "input-manifest.json"
    task_path = dir_path / "task.json"
    for path in (manifest_path, task_path):
        if path.is_symlink() or not path.is_file():
            raise IntakeError("REVISION_FILE_MISSING", f"{path} is missing or a symlink")
    if _sha256_file(manifest_path) != record["manifest_file_sha256"]:
        raise IntakeError("HASH_MISMATCH", f"manifest bytes of {record['dir']} do not match the index")
    try:
        manifest = contract.load_json_file(manifest_path)
        task = contract.load_json_file(task_path)
    except contract.JsonLoadError as exc:
        raise IntakeError("REVISION_UNREADABLE", f"revision files are unreadable: {exc}") from exc
    if _sha256_file(task_path) != record["task_file_sha256"] or _content_hash(task) != record["task_content_sha256"]:
        raise IntakeError("HASH_MISMATCH", f"task bytes of {record['dir']} do not match the index")
    scene_path = dir_path / str(task.get("scene_ref", ""))
    if scene_path.is_symlink() or not scene_path.is_file():
        raise IntakeError("REVISION_FILE_MISSING", f"{scene_path} is missing or a symlink")
    try:
        scene = contract.load_json_file(scene_path)
    except contract.JsonLoadError as exc:
        raise IntakeError("REVISION_UNREADABLE", f"scene is unreadable: {exc}") from exc
    if _sha256_file(scene_path) != record["scene_file_sha256"] or _content_hash(scene) != record["scene_content_sha256"]:
        raise IntakeError("HASH_MISMATCH", f"scene bytes of {record['dir']} do not match the index")
    pair_issues = _contract_issues(contract.check_scene_against_task(scene, task))
    if pair_issues:
        raise IntakeError("REVISION_PAIR_INVALID", "task/scene do not agree under the real contract", issues=pair_issues)
    # The optional initial design is a declared file: absent means absent, present means exactly
    # the declared bytes, and its content must still be a legal design for *this* task revision.
    design_hash = manifest.get("hashes", {}).get("design_file_sha256")
    design_path = dir_path / "initial-design.json"
    design = None
    if design_hash is None:
        if design_path.is_symlink() or design_path.exists():
            raise IntakeError("DESIGN_FILE_UNEXPECTED", f"{design_path} exists but the manifest declares no initial design")
    else:
        if design_path.is_symlink() or not design_path.is_file():
            raise IntakeError("REVISION_FILE_MISSING", f"{design_path} is missing or a symlink")
        if _sha256_file(design_path) != design_hash:
            raise IntakeError("HASH_MISMATCH", f"initial-design bytes of {record['dir']} do not match the manifest")
        try:
            design = contract.load_json_file(design_path)
        except contract.JsonLoadError as exc:
            raise IntakeError("REVISION_UNREADABLE", f"initial design is unreadable: {exc}") from exc
        check_initial_design(design, task)
    # The optional intake evidence (present only for a proposal revision) is re-verified against the
    # manifest's own hashes and recompiled here, so a tampered evidence block is caught by the read
    # path - the same check the orphan recovery uses.
    _verify_intake_evidence(manifest, task, scene)
    return {"directory": dir_path, "manifest": manifest, "task": task, "scene": scene, "design": design}


def _verify_intake_evidence(manifest: Mapping[str, Any], task: Mapping[str, Any], scene: Mapping[str, Any]) -> None:
    """Re-verify the optional ``intake_evidence`` block, or do nothing for an old manifest.

    The block is never trusted on its own: the request object is validated with the real request
    schema and must hash to ``manifest.request_sha256``; the card must hash to
    ``manifest.device_card.sha256``; the draft must hash to ``manifest.draft_hash`` and re-bind to
    the request+card with the *original* proposals re-verified against the real text (the program
    ``text_interpretations`` fact is never used as a model input); and the frozen task/scene are
    recompiled from the evidence with the same compiler and must match the published bytes. A
    missing key is an old, compatible revision.
    """
    evidence = manifest.get("intake_evidence")
    if evidence is None:
        return
    if not isinstance(evidence, Mapping):
        raise IntakeError("EVIDENCE_INVALID", "intake_evidence is not an object")
    request = evidence.get("request")
    card = evidence.get("device_card")
    draft = evidence.get("draft")
    raw_props = evidence.get("text_proposals")
    if not isinstance(request, Mapping) or not isinstance(card, Mapping) or not isinstance(draft, Mapping):
        raise IntakeError("EVIDENCE_INVALID", "intake_evidence must carry request, device_card and draft objects")
    if _content_hash(request) != manifest.get("request_sha256"):
        raise IntakeError("EVIDENCE_MISMATCH", "the evidence request does not match manifest.request_sha256")
    if _content_hash(card) != manifest.get("device_card", {}).get("sha256"):
        raise IntakeError("EVIDENCE_MISMATCH", "the evidence card does not match manifest.device_card.sha256")
    if draft_hash(draft) != manifest.get("draft_hash"):
        raise IntakeError("EVIDENCE_MISMATCH", "the evidence draft does not match manifest.draft_hash")
    # Re-verify the original proposals against the real request text and re-bind the draft, then
    # recompile the frozen task/scene and require the published bytes.
    verify_draft_binding(request, card, draft, text_proposals=raw_props)
    recompiled = compile_task(draft, request, card, task_id=manifest["task_id"], revision=int(manifest["task_revision"]), text_proposals=raw_props)
    if contract.content_sha256(recompiled["task"]) != manifest["hashes"]["task_content_sha256"] or contract.content_sha256(recompiled["scene"]) != manifest["hashes"]["scene_content_sha256"]:
        raise IntakeError("EVIDENCE_MISMATCH", "the evidence does not recompile to the frozen task/scene")


def _revision_identity(record: Mapping[str, Any], manifest: Mapping[str, Any]) -> tuple:
    return (
        int(record["revision"]),
        record.get("request_id"),
        int(record.get("request_revision", -1)),
        record.get("draft_hash"),
        manifest.get("draft_hash"),
        manifest.get("request_sha256"),
        manifest.get("device_card", {}).get("sha256"),
        manifest.get("confirmation", {}).get("attachment_sha256"),
        manifest.get("confirmation", {}).get("session_scope"),
    )


def freeze_and_publish(
    registry_root: str | Path,
    *,
    request: Mapping[str, Any],
    card: Mapping[str, Any],
    draft: Mapping[str, Any],
    receipt: Any,
    attachment_sha256: str,
    task_id: str,
    design: Mapping[str, Any] | None = None,
    now: str | None = None,
    text_proposals: Sequence[Any] | None = None,
) -> dict[str, Any]:
    """Confirm (by stage + receipt binding), compile, validate and atomically publish one revision.

    Every exit path - including the idempotent one and orphan recovery - re-verifies the request
    bytes, the card bytes, the deterministic draft and the staged facts first; success is
    returned only after a readable index entry exists.

    The staged record is re-read under this call's own lock (never via the public read function, to
    avoid nesting the registry lock) and the draft is re-derived from the **persisted** proposals,
    so a re-stage between a caller's read and this commit is caught here (TOCTOU). ``text_proposals``
    is an explicit parameter, but the persisted stage is authoritative: it must agree with it.
    """
    if not _SAFE_ID.fullmatch(task_id):
        raise IntakeError("TASK_ID_INVALID", f"task id {task_id!r} is not a safe id")

    root = Path(registry_root)
    with _registry_lock(root):
        index = load_registry_index(root)
        staged = index.get("stages", {}).get(draft["request_id"])
        if staged is None:
            raise IntakeError("STAGE_MISSING", "the request was never staged; stage the request revision before committing")
        if int(staged.get("request_revision", 0)) != int(draft["request_revision"]) or staged.get("draft_hash") != draft["draft_hash"]:
            raise IntakeError("STALE_DRAFT", f"request {draft['request_id']} is staged at revision {staged.get('request_revision')}; this draft is not the current staged one")
        if staged.get("attachment_sha256") != attachment_sha256:
            raise IntakeError("STAGE_ATTACHMENT_MISMATCH", "the attachment bytes hash does not match the staged request")
        if staged.get("request_sha256") != _content_hash(request):
            raise IntakeError("STALE_DRAFT", "the staged request bytes differ from the supplied request")
        if staged.get("device_card_sha256") != _content_hash(card):
            raise IntakeError("DEVICE_CARD_CHANGED", "the staged device card differs from the supplied card")
        # The stage is authoritative: recompile from its persisted proposals (re-verifying the real
        # text through the 043 verifier) and require the exact draft. A caller-supplied
        # text_proposals list is verified against the real text *first* (raw, before normalization),
        # then must agree with what was staged - a sanitized form may never stand in for the raw
        # verification, so an extra key / coerced offset is refused here too.
        staged_props = _raw_staged_proposals(staged)
        supplied = _prepare_text_proposals(request["text"], text_proposals)
        if supplied is not None and supplied != _normalize_text_proposals(staged_props):
            raise IntakeError("PROPOSALS_MISMATCH", "the supplied text_proposals do not match the staged proposals")
        verify_draft_binding(request, card, draft, text_proposals=staged_props)
        confirmation = check_confirmation_receipt(receipt, draft=draft, attachment_sha256=attachment_sha256, expected_session_scope=staged.get("session_scope"))

        request_entry = index["requests"].get(draft["request_id"])
        if request_entry and int(request_entry.get("latest_request_revision", 0)) > int(draft["request_revision"]):
            raise IntakeError(
                "STALE_DRAFT",
                f"request {draft['request_id']} is already at revision {request_entry['latest_request_revision']}; a draft of revision {draft['request_revision']} can never be confirmed",
            )

        task_entry = index["tasks"].get(task_id)
        if task_entry:
            for record in task_entry.get("revisions", []):
                if record.get("request_id") == draft["request_id"] and int(record.get("request_revision", -1)) == int(draft["request_revision"]):
                    existing = _verify_revision_dir(root, record)
                    # The optional initial design is part of the submission identity: the same
                    # request with a *different* design, a design where there was none, or None
                    # where one was published, is a different submission - never an idempotent
                    # replay, and never a silent way to add a file to an immutable revision.
                    new_design_sha = _sha256_bytes(_serialize(design)) if design is not None else None
                    if record.get("draft_hash") != draft["draft_hash"] or record.get("design_file_sha256") != new_design_sha or _revision_identity(record, existing["manifest"]) != (
                        int(record["revision"]), draft["request_id"], int(draft["request_revision"]), draft["draft_hash"], draft["draft_hash"], draft["request_sha256"], _content_hash(card), attachment_sha256, staged.get("session_scope"),
                    ):
                        detail = ""
                        if record.get("design_file_sha256") != new_design_sha:
                            detail = " (the optional initial design differs from the published one)"
                        raise IntakeError("IDENTITY_CONFLICT", f"task {task_id!r} already has a different submission for request revision {draft['request_revision']}{detail}")
                    result = {"task_id": task_id, "task_revision": int(record["revision"]), "directory": existing["directory"], "manifest_id": existing["manifest"]["manifest_id"], "idempotent": True, "design_file_sha256": record.get("design_file_sha256")}
                    return result

        revision = registry_next_revision(root, task_id)
        compiled = compile_task(draft, request, card, task_id=task_id, revision=revision, text_proposals=staged_props)
        task, scene = compiled["task"], compiled["scene"]
        if design is not None:
            check_initial_design(design, task)

        task_bytes = _serialize(task)
        scene_bytes = _serialize(scene)
        design_bytes = _serialize(design) if design is not None else None
        manifest = {
            "schema_version": INTAKE_SCHEMA_VERSION,
            "manifest_id": f"manifest-{task_id}-r{revision}",
            "task_id": task_id,
            "task_revision": revision,
            "request_id": draft["request_id"],
            "request_revision": draft["request_revision"],
            "request_sha256": draft["request_sha256"],
            "draft_hash": draft["draft_hash"],
            "confirmation": confirmation,
            "device_card": {"id": card["device_id"], "sha256": _content_hash(card)},
            "stage": {key: staged[key] for key in ("request_id", "request_revision", "request_sha256", "draft_hash", "attachment_sha256", "session_scope", "staged_at")},
            "source_map": source_map_for(request),
            "compiler": {"id": COMPILER_ID, "version": COMPILER_VERSION},
            "hashes": {
                "task_content_sha256": contract.content_sha256(task),
                "scene_content_sha256": contract.content_sha256(scene),
                "task_file_sha256": _sha256_bytes(task_bytes),
                "scene_file_sha256": _sha256_bytes(scene_bytes),
                "design_file_sha256": _sha256_bytes(design_bytes) if design_bytes is not None else None,
            },
            "created_at": now if now is not None else _utc_now(),
        }
        if staged_props:
            # Additive, only when the revision carries verified proposals: freeze the original
            # request, card, full draft and the canonical original proposals so the frozen inputs
            # are reproducible from the manifest alone (no side file). The manifest's own hashes
            # bind every part, so editing the evidence bytes breaks the index SHA. A no-proposal
            # revision omits the key and keeps its old bytes exactly.
            manifest["intake_evidence"] = {
                "request": request,
                "device_card": card,
                "draft": draft,
                "text_proposals": staged_props,
            }
        manifest_issues = _schema_issues("input-manifest", manifest)
        if manifest_issues:
            raise IntakeError("MANIFEST_INVALID", "the input manifest failed input-manifest.schema.json", issues=manifest_issues)

        task_dir = _require_safe_components(root, "tasks", task_id)
        final_dir = task_dir / f"r{revision:03d}"
        if final_dir.exists():
            # An unregistered revision directory is an orphan of an interrupted publish. It is
            # adopted only when its identity is exactly this submission (same task/scene bytes,
            # same request/draft/card/receipt facts); anything else is refused, never overwritten.
            if final_dir.is_symlink():
                raise IntakeError("PATH_UNSAFE", f"{final_dir} is a symlink")
            try:
                adopted = _adopt_orphan(root, final_dir, manifest)
            except IntakeError:
                raise
            if adopted is not None:
                _register_revision(root, index, task_id, revision, adopted, draft, manifest)
                return {"task_id": task_id, "task_revision": revision, "directory": final_dir, "manifest_id": manifest["manifest_id"], "idempotent": False, "recovered_orphan": True}
            raise IntakeError("ORPHAN_CONFLICT", f"{final_dir} exists with content that is not this submission; refusing to overwrite immutable evidence")

        tmp_dir = task_dir / f".tmp-r{revision:03d}-{os.getpid()}-{int.from_bytes(os.urandom(4), 'big')}"
        try:
            tmp_dir.mkdir(parents=True, exist_ok=False)
            _atomic_write(tmp_dir / "task.json", task_bytes)
            _atomic_write(tmp_dir / f"{scene['scene_id']}.scene.json", scene_bytes)
            if design_bytes is not None:
                _atomic_write(tmp_dir / "initial-design.json", design_bytes)
            _atomic_write(tmp_dir / "input-manifest.json", _serialize(manifest))
            os.replace(tmp_dir, final_dir)
        finally:
            if tmp_dir.exists():
                shutil.rmtree(tmp_dir, ignore_errors=True)

        record = _register_revision(root, index, task_id, revision, {"manifest": manifest, "task": task, "scene": scene}, draft, manifest)
        result = {"task_id": task_id, "task_revision": revision, "directory": final_dir, "manifest_id": manifest["manifest_id"], "idempotent": False, "task": task, "scene": scene, "manifest": manifest}
        if design_bytes is not None:
            result["design_file_sha256"] = record["design_file_sha256"]
        return result


def _adopt_orphan(root: Path, final_dir: Path, manifest: Mapping[str, Any]) -> dict[str, Any] | None:
    """Verify an orphan revision dir against this submission; None means 'not ours'."""
    manifest_path = final_dir / "input-manifest.json"
    if manifest_path.is_symlink() or not manifest_path.is_file():
        raise IntakeError("ORPHAN_CONFLICT", f"{final_dir} exists without a readable manifest; refusing to touch it")
    try:
        existing = contract.load_json_file(manifest_path)
    except contract.JsonLoadError as exc:
        raise IntakeError("ORPHAN_CONFLICT", f"{final_dir} has an unreadable manifest ({exc}); refusing to touch it") from exc
    same = (
        existing.get("task_id") == manifest["task_id"]
        and existing.get("task_revision") == manifest["task_revision"]
        and existing.get("request_id") == manifest["request_id"]
        and existing.get("request_revision") == manifest["request_revision"]
        and existing.get("request_sha256") == manifest["request_sha256"]
        and existing.get("draft_hash") == manifest["draft_hash"]
        and existing.get("hashes") == manifest["hashes"]
        and existing.get("device_card") == manifest["device_card"]
        and existing.get("confirmation") == manifest["confirmation"]
        and existing.get("stage") == manifest["stage"]
        # The optional intake evidence is part of the identity: an orphan with a different evidence
        # block (or one where there was none) is a different submission, never adopted silently.
        and existing.get("intake_evidence") == manifest.get("intake_evidence")
    )
    if not same:
        return None
    for name, digest in (("task.json", manifest["hashes"]["task_file_sha256"]),):
        path = final_dir / name
        if path.is_symlink() or not path.is_file() or _sha256_file(path) != digest:
            raise IntakeError("ORPHAN_CONFLICT", f"orphan {path} does not match the manifest; refusing to touch it")
    scene_name = f"{manifest['task_id']}.scene.json"
    scene_path = final_dir / scene_name
    if scene_path.is_symlink() or not scene_path.is_file() or _sha256_file(scene_path) != manifest["hashes"]["scene_file_sha256"]:
        raise IntakeError("ORPHAN_CONFLICT", f"orphan {scene_path} does not match the manifest; refusing to touch it")
    design_hash = manifest["hashes"].get("design_file_sha256")
    design_path = final_dir / "initial-design.json"
    if design_hash is None:
        if design_path.is_symlink() or design_path.exists():
            raise IntakeError("ORPHAN_CONFLICT", f"orphan {design_path} exists but this submission declares no initial design; refusing to adopt")
    elif design_path.is_symlink() or not design_path.is_file() or _sha256_file(design_path) != design_hash:
        raise IntakeError("ORPHAN_CONFLICT", f"orphan {design_path} does not match the manifest's initial-design hash; refusing to adopt")
    return {"manifest": existing}


def _register_revision(root: Path, index: dict[str, Any], task_id: str, revision: int, verified: Mapping[str, Any], draft: Mapping[str, Any], manifest: Mapping[str, Any]) -> dict[str, Any]:
    """Write the index entry for an already-published revision dir and verify it reads back."""
    entry = index["tasks"].setdefault(task_id, {"task_id": task_id, "latest_revision": 0, "revisions": []})
    entry["latest_revision"] = max(int(entry.get("latest_revision", 0)), revision)
    if not any(int(item["revision"]) == revision for item in entry["revisions"]):
        entry["revisions"].append(
            {
                "revision": revision,
                "dir": f"tasks/{task_id}/r{revision:03d}",
                "task_id": task_id,
                "task_content_sha256": manifest["hashes"]["task_content_sha256"],
                "scene_content_sha256": manifest["hashes"]["scene_content_sha256"],
                "task_file_sha256": manifest["hashes"]["task_file_sha256"],
                "scene_file_sha256": manifest["hashes"]["scene_file_sha256"],
                "manifest_file_sha256": _sha256_file(root / "tasks" / task_id / f"r{revision:03d}" / "input-manifest.json"),
                "request_id": draft["request_id"],
                "request_revision": draft["request_revision"],
                "draft_hash": draft["draft_hash"],
                "design_file_sha256": manifest["hashes"].get("design_file_sha256"),
                "published_at": manifest["created_at"],
            }
        )
    index["requests"][draft["request_id"]] = {
        "request_id": draft["request_id"],
        "latest_request_revision": int(draft["request_revision"]),
        "latest_task": {"task_id": task_id, "revision": revision},
    }
    index["updated_at"] = manifest["created_at"]
    _write_index(root, index)
    # Success requires a readable index entry that still verifies against the bytes on disk.
    written = load_registry_index(root)
    record = next((item for item in written["tasks"].get(task_id, {}).get("revisions", []) if int(item["revision"]) == revision), None)
    if record is None:
        raise IntakeError("INDEX_WRITE_FAILED", "the published revision is not readable from the index")
    _verify_revision_dir(root, record)
    return record


def read_task_bundle(registry_root: str | Path, task_id: str, revision: int | None = None) -> dict[str, Any]:
    """Read one published revision, verifying the index entry against the bytes on disk.

    Returns the parsed task/scene/manifest plus the real ``fitplate.schema`` bundle for the
    revision directory, so a later ``prepare-workspace``/``load_task`` integration gets exactly
    the frozen bytes this registry recorded - never a fixture id.
    """
    if not _SAFE_ID.fullmatch(task_id):
        raise IntakeError("TASK_ID_INVALID", f"task id {task_id!r} is not a safe id")
    root = _check_registry_root(registry_root)
    index = load_registry_index(root)
    entry = index["tasks"].get(task_id)
    if not entry:
        raise IntakeError("TASK_NOT_FOUND", f"no task {task_id!r} in the registry")
    revisions = entry.get("revisions", [])
    if not revisions:
        raise IntakeError("TASK_NOT_FOUND", f"task {task_id!r} has no published revisions")
    latest = max(int(item["revision"]) for item in revisions)
    wanted = latest if revision is None else int(revision)
    record = next((item for item in revisions if int(item["revision"]) == wanted), None)
    if record is None:
        raise IntakeError("REVISION_NOT_FOUND", f"task {task_id!r} has no revision {wanted}")
    verified = _verify_revision_dir(root, record)
    return {
        "task_id": task_id,
        "revision": wanted,
        "is_latest": wanted == latest,
        "directory": verified["directory"],
        "task": verified["task"],
        "scene": verified["scene"],
        "manifest": verified["manifest"],
        "design": verified.get("design"),
        "bundle": contract.load_task_bundle(verified["directory"]),
    }


def classify_with_preflight(task: Mapping[str, Any], scene: Mapping[str, Any]) -> dict[str, Any]:
    """Run the *real* preflight classifier (lazy import: it needs the geometry environment).

    This is the bridge to the production classification. The intake core itself never calls it -
    feasibility/INFEASIBLE belongs to the frozen load path, and this package must not run CAD.
    """
    from . import preflight as preflight_module

    result = preflight_module.preflight_task(task, scene)
    return result.to_dict()
