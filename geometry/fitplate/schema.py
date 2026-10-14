"""FitPlate contract layer (T02).

Standard library only. This module must import and run on a bare CPython 3.12
with no third-party package installed, so the contract tests can run before the
CAD environment is confirmed.

Responsibilities
----------------
* :func:`load_json_strict` - fail-closed JSON reading: no ``NaN``/``Infinity``,
  no duplicate keys, bounded document size, nesting depth and string length.
* :func:`validate_task` / :func:`validate_scene` / :func:`validate_design` /
  :func:`validate_report` - structural validation against the JSON Schema
  2020-12 documents in ``schemas/`` (documented keyword subset; an unknown
  keyword raises instead of being silently ignored) plus the cross-field
  semantics JSON Schema cannot express: locked/editable partition, hole-count
  and coordinate limits, unit and frame pinning, provenance kind, report
  PASS-consistency.
* :func:`check_design_against_task` / :func:`check_scene_against_task` /
  :func:`check_scene_binding` / :func:`verify_report_binding` - the
  cross-document contract checks (locked values, stale revisions, scene
  replacement, artefact/report identity).
* :func:`canonical_json` / :func:`content_sha256` / :func:`file_sha256` - the
  canonical hashing used to freeze a TaskSpec+scene pair and to bind reports to
  artefacts.
* :func:`load_task_bundle` - read a task directory, resolve ``scene_ref``
  safely (plain file name inside the task directory only) and verify the frozen
  scene hash before anything downstream may use the numbers.

Reporting vocabulary
--------------------
Every check returns a :class:`CheckResult` with a ``status`` and a list of
:class:`Issue` items carrying a JSON-pointer-ish ``path``, a machine ``code``
and a human message. Status semantics follow the plan's state machine:

``OK``
    Nothing to report.
``NEEDS_INPUT``
    Information is missing (a required field, a scene element, a file). The
    caller asks for it; this is *not* a claim that the design is impossible.
``INVALID_SPEC``
    A value is present but illegal: unknown field, wrong type, non-finite
    number, boolean used as a number, out-of-range or over-limit value,
    unsupported feature.
``LOCKED_CONSTRAINT_CHANGED``
    A DesignSpec tried to change a frozen value.
``STALE_INPUT``
    The document belongs to a different task or revision, or the referenced
    scene/artefact hash no longer matches what was frozen.

Nothing in this module performs geometry. It never claims that a design is
physically buildable: only a STEP re-measurement (T04/T05) may do that.
"""

from __future__ import annotations

import datetime as _datetime
import hashlib
import json
import math
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

# --------------------------------------------------------------------------
# Contract constants
# --------------------------------------------------------------------------

SCHEMA_VERSION = "1.0"
UNITS = "mm"
FRAME = "plate_lower_left_bottom_xyz"

#: Units this contract accepts. Only an explicit unit token is accepted; there is
#: no magnitude-based guessing (``80`` in a field documented as mm is never
#: re-interpreted as cm) and no implicit inch conversion. Explicit conversion of
#: other units is a later batch item (T03+) and is deliberately not implemented
#: here - the contract refuses unsupported units instead of converting quietly.
SUPPORTED_UNITS: tuple[str, ...] = ("mm",)

#: Check ids a complete validation report must cover.
CHECK_IDS: tuple[str, ...] = ("G01", "G02", "G03", "G04", "G05", "G06", "G07", "G08")

#: Participants that are not scene objects but may appear in support contacts.
RESERVED_PARTICIPANT_IDS: tuple[str, ...] = ("sensor_body", "plate_top")

#: Derived features a report may name as the subject of a check, in addition to
#: scene object ids and the reserved participants above.
REPORT_FEATURE_IDS: tuple[str, ...] = (
    "plate",
    "plate_top",
    "plate_bottom",
    "base_holes",
    "sensor_body",
    "sensor_holes",
    "post_group",
    "screw_head_group",
)

#: Safe registered reference name: a plain file name, no directory separator, no
#: leading dot, no consecutive dots, must end in ``.scene.json``.
SCENE_REF_PATTERN = r"^[A-Za-z0-9][A-Za-z0-9_-]*(\.[A-Za-z0-9_-]+)*\.scene\.json$"
SCENE_REF_MAX_LENGTH = 128

SCHEMA_NAMES: tuple[str, ...] = ("task", "design", "scene", "report")

# --------------------------------------------------------------------------
# Resource limits (structural guarding, not engineering requirements)
# --------------------------------------------------------------------------

MAX_JSON_BYTES = 1_000_000
MAX_JSON_DEPTH = 24
MAX_STRING_LENGTH = 4096

MAX_COORD_MM = 10_000.0
PLATE_DIM_MIN_MM = 1.0
PLATE_DIM_MAX_MM = 2_000.0
BODY_DIM_MAX_MM = 2_000.0
HOLE_DIAMETER_MAX_MM = 200.0
MAX_BASE_HOLES = 32
MAX_SENSOR_HOLES = 32
MAX_TOTAL_HOLES = 64

_EPS = 1e-9

# --------------------------------------------------------------------------
# Status / code vocabulary
# --------------------------------------------------------------------------

STATUS_OK = "OK"
STATUS_NEEDS_INPUT = "NEEDS_INPUT"
STATUS_INVALID = "INVALID_SPEC"
STATUS_LOCKED = "LOCKED_CONSTRAINT_CHANGED"
STATUS_STALE = "STALE_INPUT"

CODE_MISSING_FIELD = "MISSING_FIELD"
CODE_UNKNOWN_FIELD = "UNKNOWN_FIELD"
CODE_INVALID_VALUE = "INVALID_VALUE"
CODE_BOOLEAN_AS_NUMBER = "BOOLEAN_AS_NUMBER"
CODE_NON_FINITE = "NON_FINITE_NUMBER"
CODE_LIMIT_EXCEEDED = "LIMIT_EXCEEDED"
CODE_UNSUPPORTED_UNIT = "UNSUPPORTED_UNIT"
CODE_UNSUPPORTED_FEATURE = "UNSUPPORTED_FEATURE"
CODE_LOCKED_CONSTRAINT_CHANGED = "LOCKED_CONSTRAINT_CHANGED"
CODE_STALE_INPUT = "STALE_INPUT"
CODE_SCENE_REF_MISMATCH = "SCENE_REF_MISMATCH"
CODE_SCENE_HASH_MISMATCH = "SCENE_HASH_MISMATCH"
CODE_SCENE_FILE_MISSING = "SCENE_FILE_MISSING"
CODE_REPORT_INCONSISTENT = "REPORT_INCONSISTENT"

_STATUS_BY_CODE = {
    CODE_MISSING_FIELD: STATUS_NEEDS_INPUT,
    CODE_SCENE_FILE_MISSING: STATUS_STALE,
    CODE_LOCKED_CONSTRAINT_CHANGED: STATUS_LOCKED,
    CODE_STALE_INPUT: STATUS_STALE,
    CODE_SCENE_REF_MISMATCH: STATUS_STALE,
    CODE_SCENE_HASH_MISMATCH: STATUS_STALE,
}

#: Overall status precedence when several issues of different kinds are present.
_STATUS_ORDER = (STATUS_INVALID, STATUS_LOCKED, STATUS_STALE, STATUS_NEEDS_INPUT)


@dataclass(frozen=True)
class Issue:
    """One machine-readable contract violation."""

    path: str
    code: str
    message: str

    @property
    def status(self) -> str:
        return _STATUS_BY_CODE.get(self.code, STATUS_INVALID)

    def to_dict(self) -> dict[str, str]:
        return {"path": self.path, "code": self.code, "status": self.status, "message": self.message}

    def __str__(self) -> str:  # pragma: no cover - formatting helper
        return f"{self.path or '/'} [{self.code}] {self.message}"


@dataclass
class CheckResult:
    """Result of one contract check."""

    status: str
    issues: list[Issue] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return self.status == STATUS_OK

    @property
    def needs_input(self) -> bool:
        return self.status == STATUS_NEEDS_INPUT

    def codes(self) -> list[str]:
        return [issue.code for issue in self.issues]

    def has_code(self, code: str) -> bool:
        return any(issue.code == code for issue in self.issues)

    def to_dict(self) -> dict[str, Any]:
        return {"status": self.status, "issues": [issue.to_dict() for issue in self.issues]}

    def __str__(self) -> str:  # pragma: no cover - formatting helper
        if self.ok:
            return "OK"
        return self.status + "\n" + "\n".join(f"  {issue}" for issue in self.issues)


class ContractError(RuntimeError):
    """Raised when a caller uses an input document that failed the contract."""

    def __init__(self, message: str, issues: Sequence[Issue] = ()) -> None:
        super().__init__(message)
        self.issues: tuple[Issue, ...] = tuple(issues)


class JsonLoadError(ValueError):
    """Raised when a JSON document is refused by :func:`load_json_strict`."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


class UnsupportedSchemaKeyword(RuntimeError):
    """Raised when a schema document uses a keyword this validator does not implement.

    Failing closed here is deliberate: silently ignoring a keyword would make the
    JSON Schema files look normative while enforcing less than they state.
    """


# --------------------------------------------------------------------------
# Fail-closed JSON loading
# --------------------------------------------------------------------------


class _DuplicateKeyError(ValueError):
    def __init__(self, key: str) -> None:
        super().__init__(f"duplicate object key {key!r}")
        self.key = key


def _reject_constant(token: str) -> Any:
    raise JsonLoadError(CODE_NON_FINITE, f"non-finite JSON literal {token!r} is not accepted")


def _parse_float(token: str) -> float:
    value = float(token)
    if not math.isfinite(value):
        raise JsonLoadError(CODE_NON_FINITE, f"number {token!r} is not finite")
    return value


def _pairs_hook(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise _DuplicateKeyError(key)
        result[key] = value
    return result


def _check_loaded(value: Any, source: str, max_depth: int, max_string_length: int) -> None:
    stack: list[tuple[Any, int]] = [(value, 0)]
    while stack:
        current, depth = stack.pop()
        if depth > max_depth:
            raise JsonLoadError(CODE_LIMIT_EXCEEDED, f"{source}: nesting deeper than {max_depth}")
        if isinstance(current, str):
            if len(current) > max_string_length:
                raise JsonLoadError(
                    CODE_LIMIT_EXCEEDED,
                    f"{source}: string longer than {max_string_length} characters",
                )
        elif isinstance(current, float):
            if not math.isfinite(current):
                raise JsonLoadError(CODE_NON_FINITE, f"{source}: non-finite number")
        elif isinstance(current, dict):
            for key, item in current.items():
                if len(key) > max_string_length:
                    raise JsonLoadError(
                        CODE_LIMIT_EXCEEDED,
                        f"{source}: object key longer than {max_string_length} characters",
                    )
                stack.append((item, depth + 1))
        elif isinstance(current, list):
            for item in current:
                stack.append((item, depth + 1))


def load_json_strict(
    text: str,
    *,
    source: str = "<input>",
    max_bytes: int = MAX_JSON_BYTES,
    max_depth: int = MAX_JSON_DEPTH,
    max_string_length: int = MAX_STRING_LENGTH,
) -> Any:
    """Parse JSON with fail-closed limits.

    Refuses: documents over ``max_bytes``, nesting deeper than ``max_depth``,
    strings or keys longer than ``max_string_length``, ``NaN``/``Infinity``
    literals (and numbers that overflow to infinity), and duplicate object keys.
    Every refusal raises :class:`JsonLoadError`.
    """
    if not isinstance(text, str):
        raise JsonLoadError(CODE_INVALID_VALUE, f"{source}: expected text, got {type(text).__name__}")
    encoded = text.encode("utf-8", errors="surrogatepass")
    if len(encoded) > max_bytes:
        raise JsonLoadError(CODE_LIMIT_EXCEEDED, f"{source}: document larger than {max_bytes} bytes")
    try:
        value = json.loads(
            text,
            parse_constant=_reject_constant,
            parse_float=_parse_float,
            object_pairs_hook=_pairs_hook,
        )
    except JsonLoadError:
        raise
    except _DuplicateKeyError as exc:
        raise JsonLoadError(
            CODE_INVALID_VALUE, f"{source}: {exc}; duplicate keys would make the contract ambiguous"
        ) from exc
    except ValueError as exc:  # malformed JSON, oversized integer literals, ...
        raise JsonLoadError(CODE_INVALID_VALUE, f"{source}: invalid JSON: {exc}") from exc
    _check_loaded(value, source, max_depth, max_string_length)
    return value


def load_json_file(path: str | Path, **kwargs: Any) -> Any:
    """Read a file as UTF-8 and parse it with :func:`load_json_strict`."""
    path = Path(path)
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise JsonLoadError(CODE_INVALID_VALUE, f"{path}: cannot read: {exc}") from exc
    return load_json_strict(text, source=str(path), **kwargs)


# --------------------------------------------------------------------------
# Canonical JSON and content hashing
# --------------------------------------------------------------------------


def _canonical_value(value: Any) -> Any:
    """Normalise a parsed JSON value for hashing.

    * finite floats with an integral value become ints, so ``3`` and ``3.0`` hash
      alike (JSON treats them as the same number);
    * ``-0.0`` becomes ``0``;
    * non-finite floats and non-JSON types raise instead of being coerced.
    """
    if value is None or isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError("non-finite number cannot be hashed")
        if value.is_integer():
            return int(value)
        return value
    if isinstance(value, str):
        return value
    if isinstance(value, Mapping):
        out: dict[str, Any] = {}
        for key, item in value.items():
            if not isinstance(key, str):
                raise ValueError(f"object key must be a string, got {type(key).__name__}")
            out[key] = _canonical_value(item)
        return out
    if isinstance(value, (list, tuple)):
        return [_canonical_value(item) for item in value]
    raise ValueError(f"value of type {type(value).__name__} is not valid JSON")


def canonical_json(value: Any) -> str:
    """Deterministic JSON encoding used for every content hash in this project."""
    return json.dumps(
        _canonical_value(value),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )


def content_sha256(value: Any) -> str:
    """SHA-256 over the canonical JSON encoding of a parsed document."""
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def file_sha256(path: str | Path) -> str:
    """SHA-256 over the raw bytes of a file (used for STEP/STL artefacts)."""
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def frozen_fingerprint(task: Mapping[str, Any], scene: Mapping[str, Any]) -> dict[str, str]:
    """Hashes that freeze a task+scene pair for a run manifest or a report."""
    return {
        "task_sha256": content_sha256(task),
        "scene_sha256": content_sha256(scene),
        "frozen_sha256": content_sha256({"task": task, "scene": scene}),
    }


_ref_re = re.compile(SCENE_REF_PATTERN)


def is_safe_ref_name(name: Any) -> bool:
    """True when ``name`` is a safe registered reference file name.

    A safe name is a plain file name: no path separators, no drive letters, no
    leading dot, no ``..`` component and no consecutive dots - only the
    registered ``<something>.scene.json`` shape.
    """
    if not isinstance(name, str) or not name or len(name) > SCENE_REF_MAX_LENGTH:
        return False
    return _ref_re.fullmatch(name) is not None


# --------------------------------------------------------------------------
# Minimal JSON Schema (2020-12 subset) validator
# --------------------------------------------------------------------------

_SUPPORTED_KEYWORDS = frozenset(
    {
        # annotations / structural
        "$schema",
        "$id",
        "$ref",
        "$defs",
        "title",
        "description",
        "$comment",
        "examples",
        "default",
        "format",
        # value
        "type",
        "const",
        "enum",
        "minimum",
        "maximum",
        "exclusiveMinimum",
        "exclusiveMaximum",
        "minLength",
        "maxLength",
        "pattern",
        # arrays
        "minItems",
        "maxItems",
        "uniqueItems",
        "items",
        "prefixItems",
        # objects
        "required",
        "properties",
        "additionalProperties",
        "propertyNames",
        "minProperties",
        "maxProperties",
        # combinators
        "allOf",
        "oneOf",
        "not",
    }
)

_ANNOTATION_KEYWORDS = frozenset(
    {"$schema", "$id", "title", "description", "$comment", "examples", "default"}
)

_JSON_TYPES = frozenset({"object", "array", "string", "number", "integer", "boolean", "null"})

_FORMAT_CHECKERS: dict[str, Any] = {}


def _register_format(name: str):
    def decorator(func):
        _FORMAT_CHECKERS[name] = func
        return func

    return decorator


@_register_format("date-time")
def _check_date_time(value: str) -> str | None:
    text = value[:-1] + "+00:00" if value.endswith(("Z", "z")) else value
    try:
        parsed = _datetime.datetime.fromisoformat(text)
    except ValueError:
        return "must be an RFC 3339 date-time"
    if parsed.tzinfo is None:
        return "must carry a timezone offset"
    return None


_TYPE_CHECKS = {
    "object": lambda v: isinstance(v, dict),
    "array": lambda v: isinstance(v, list),
    "string": lambda v: isinstance(v, str),
    "boolean": lambda v: isinstance(v, bool),
    "null": lambda v: v is None,
    "integer": lambda v: (
        (isinstance(v, int) and not isinstance(v, bool))
        or (isinstance(v, float) and math.isfinite(v) and v.is_integer())
    ),
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v),
}


def _pattern_matches(pattern: str, value: str) -> bool:
    """JSON Schema ``pattern`` semantics, with anchored patterns made total.

    Python's ``$`` also matches before a trailing newline, which would let
    ``"x.scene.json\\n"`` slip through an anchored pattern. For patterns written
    as ``^...$`` this uses :func:`re.fullmatch` instead, so the whole string must
    match.
    """
    if pattern.startswith("^") and pattern.endswith("$") and len(pattern) >= 2:
        return re.fullmatch(pattern[1:-1], value) is not None
    return re.search(pattern, value) is not None


class _SchemaValidator:
    """Validates instances against one schema document (local ``$ref`` only)."""

    def __init__(self, schema: Mapping[str, Any], *, source: str) -> None:
        self.root = schema
        self.source = source

    # -- entry point -------------------------------------------------------
    def validate(self, instance: Any) -> list[Issue]:
        issues: list[Issue] = []
        self._walk(self.root, instance, "", issues, 0)
        return issues

    # -- helpers -----------------------------------------------------------
    def _resolve(self, ref: str) -> Mapping[str, Any]:
        match = re.fullmatch(r"#/\$defs/([A-Za-z0-9_]+)", ref)
        if not match:
            raise UnsupportedSchemaKeyword(f"{self.source}: only local '#/$defs/<name>' refs are supported, got {ref!r}")
        defs = self.root.get("$defs")
        if not isinstance(defs, Mapping) or match.group(1) not in defs:
            raise UnsupportedSchemaKeyword(f"{self.source}: unresolved ref {ref!r}")
        return defs[match.group(1)]

    @staticmethod
    def _pointer(path: str, token: str | int) -> str:
        return f"{path}/{token}"

    def _type_ok(self, value: Any, expected: Any, path: str, issues: list[Issue]) -> bool:
        if isinstance(expected, list):
            if any(self._type_ok(value, item, path, []) for item in expected):
                return True
            issues.append(
                Issue(path, CODE_INVALID_VALUE, f"must match one of the types {expected}, got {type(value).__name__}")
            )
            return False
        if expected not in _JSON_TYPES:
            raise UnsupportedSchemaKeyword(f"{self.source}: unsupported type name {expected!r}")
        if _TYPE_CHECKS[expected](value):
            return True
        if expected in ("number", "integer") and isinstance(value, bool):
            issues.append(Issue(path, CODE_BOOLEAN_AS_NUMBER, "boolean is not accepted where a number is required"))
        elif expected in ("number", "integer") and isinstance(value, float) and not math.isfinite(value):
            issues.append(Issue(path, CODE_NON_FINITE, "non-finite number is not accepted"))
        else:
            issues.append(Issue(path, CODE_INVALID_VALUE, f"must be {expected}, got {type(value).__name__}"))
        return False

    # -- core walk ---------------------------------------------------------
    def _walk(self, schema: Any, value: Any, path: str, issues: list[Issue], depth: int) -> None:
        if depth > 64:
            raise UnsupportedSchemaKeyword(f"{self.source}: schema recursion too deep")
        if not isinstance(schema, Mapping):
            raise UnsupportedSchemaKeyword(f"{self.source}: schema node must be an object")
        for keyword in schema:
            if keyword not in _SUPPORTED_KEYWORDS:
                raise UnsupportedSchemaKeyword(f"{self.source}: unsupported keyword {keyword!r} at {path or '<root>'}")

        if "$ref" in schema:
            self._walk(self._resolve(schema["$ref"]), value, path, issues, depth + 1)

        expected_type = schema.get("type")
        if expected_type is not None and not self._type_ok(value, expected_type, path, issues):
            return

        if "const" in schema:
            if canonical_json(value) != canonical_json(schema["const"]):
                issues.append(Issue(path, CODE_INVALID_VALUE, f"must equal {schema['const']!r}"))
        if "enum" in schema:
            if not any(canonical_json(value) == canonical_json(item) for item in schema["enum"]):
                issues.append(Issue(path, CODE_INVALID_VALUE, f"must be one of {schema['enum']!r}"))

        if isinstance(value, (int, float)) and not isinstance(value, bool):
            for keyword, ok, code in self._numeric_rules(schema, value, path):
                if not ok:
                    issues.append(Issue(path, code, f"{keyword} {schema[keyword]!r} violated (value {value!r})"))

        if isinstance(value, str):
            if "minLength" in schema and len(value) < schema["minLength"]:
                issues.append(Issue(path, CODE_MISSING_FIELD, f"string shorter than minLength {schema['minLength']}"))
            if "maxLength" in schema and len(value) > schema["maxLength"]:
                issues.append(Issue(path, CODE_LIMIT_EXCEEDED, f"string longer than maxLength {schema['maxLength']}"))
            if "pattern" in schema and not _pattern_matches(schema["pattern"], value):
                issues.append(Issue(path, CODE_INVALID_VALUE, f"does not match pattern {schema['pattern']!r}"))
            if "format" in schema:
                format_name = schema["format"]
                checker = _FORMAT_CHECKERS.get(format_name)
                if checker is None:
                    raise UnsupportedSchemaKeyword(f"{self.source}: unsupported format {format_name!r}")
                problem = checker(value)
                if problem:
                    issues.append(Issue(path, CODE_INVALID_VALUE, problem))

        if isinstance(value, list):
            if "minItems" in schema and len(value) < schema["minItems"]:
                issues.append(Issue(path, CODE_MISSING_FIELD, f"needs at least {schema['minItems']} item(s)"))
            if "maxItems" in schema and len(value) > schema["maxItems"]:
                issues.append(
                    Issue(path, CODE_LIMIT_EXCEEDED, f"has {len(value)} items, limit is {schema['maxItems']}")
                )
            if schema.get("uniqueItems") and len({canonical_json(item) for item in value}) != len(value):
                issues.append(Issue(path, CODE_INVALID_VALUE, "items must be unique"))
            prefix = schema.get("prefixItems", [])
            for index, subschema in enumerate(prefix):
                if index < len(value):
                    self._walk(subschema, value[index], self._pointer(path, index), issues, depth + 1)
            if "items" in schema:
                for index in range(len(prefix), len(value)):
                    self._walk(schema["items"], value[index], self._pointer(path, index), issues, depth + 1)

        if isinstance(value, dict):
            required = schema.get("required", [])
            for name in required:
                if name not in value:
                    issues.append(
                        Issue(self._pointer(path, name), CODE_MISSING_FIELD, "required field is missing")
                    )
            if "minProperties" in schema and len(value) < schema["minProperties"]:
                issues.append(
                    Issue(path, CODE_MISSING_FIELD, f"needs at least {schema['minProperties']} propert(y|ies)")
                )
            if "maxProperties" in schema and len(value) > schema["maxProperties"]:
                issues.append(
                    Issue(path, CODE_LIMIT_EXCEEDED, f"has {len(value)} properties, limit is {schema['maxProperties']}")
                )
            if "propertyNames" in schema:
                name_schema = schema["propertyNames"]
                for name in value:
                    self._walk(name_schema, name, path, issues, depth + 1)
            properties = schema.get("properties", {})
            for name, subschema in properties.items():
                if name in value:
                    self._walk(subschema, value[name], self._pointer(path, name), issues, depth + 1)
            additional = schema.get("additionalProperties", True)
            for name in value:
                if name in properties or name in required:
                    continue
                if additional is False:
                    issues.append(
                        Issue(
                            self._pointer(path, name),
                            CODE_UNKNOWN_FIELD,
                            f"unknown field {name!r}: the contract is closed and does not accept extra data",
                        )
                    )
                elif isinstance(additional, Mapping):
                    self._walk(additional, value[name], self._pointer(path, name), issues, depth + 1)

        for keyword in ("allOf", "oneOf"):
            if keyword in schema:
                branches = schema[keyword]
                outcomes: list[list[Issue]] = []
                for branch in branches:
                    collected: list[Issue] = []
                    self._walk(branch, value, path, collected, depth + 1)
                    outcomes.append(collected)
                passing = [outcome for outcome in outcomes if not outcome]
                if keyword == "allOf":
                    for outcome in outcomes:
                        issues.extend(outcome)
                else:
                    if len(passing) == 0:
                        best = min(outcomes, key=lambda outcome: (len(outcome), outcomes.index(outcome)))
                        issues.extend(best)
                    elif len(passing) > 1:
                        issues.append(Issue(path, CODE_INVALID_VALUE, "matches more than one allowed variant"))
        if "not" in schema:
            collected = []
            self._walk(schema["not"], value, path, collected, depth + 1)
            if not collected:
                issues.append(Issue(path, CODE_INVALID_VALUE, "matches a forbidden variant"))

    @staticmethod
    def _numeric_rules(schema: Mapping[str, Any], value: Any, path: str):
        def numeric_bound(keyword: str) -> float | None:
            bound = schema.get(keyword)
            if bound is None:
                return None
            if isinstance(bound, bool) or not isinstance(bound, (int, float)) or not math.isfinite(bound):
                raise UnsupportedSchemaKeyword(f"schema bound {keyword}={bound!r} at {path or '<root>'} is not finite")
            return float(bound)

        minimum = numeric_bound("minimum")
        if minimum is not None and value < minimum:
            yield ("minimum", False, CODE_INVALID_VALUE)
        maximum = numeric_bound("maximum")
        if maximum is not None and value > maximum:
            yield ("maximum", False, CODE_LIMIT_EXCEEDED)
        exclusive_minimum = numeric_bound("exclusiveMinimum")
        if exclusive_minimum is not None and value <= exclusive_minimum:
            yield ("exclusiveMinimum", False, CODE_INVALID_VALUE)
        exclusive_maximum = numeric_bound("exclusiveMaximum")
        if exclusive_maximum is not None and value >= exclusive_maximum:
            yield ("exclusiveMaximum", False, CODE_LIMIT_EXCEEDED)


def _validate_against(schema: Mapping[str, Any], instance: Any, *, source: str) -> list[Issue]:
    return _SchemaValidator(schema, source=source).validate(instance)


# --------------------------------------------------------------------------
# Schema document loading
# --------------------------------------------------------------------------


def repo_root() -> Path:
    """Repository root, derived from this file's location (``<root>/geometry/fitplate``)."""
    return Path(__file__).resolve().parents[2]


def load_schema(name: str, *, root: Path | None = None) -> Mapping[str, Any]:
    """Load one of the contract schemas by short name (``task``/``design``/``scene``/``report``)."""
    if name not in SCHEMA_NAMES:
        raise ValueError(f"unknown schema name {name!r}; expected one of {SCHEMA_NAMES}")
    path = (root or repo_root()) / "schemas" / f"{name}.schema.json"
    try:
        return load_json_file(path)
    except JsonLoadError as exc:
        raise ContractError(f"cannot load schema {name!r}: {exc}", []) from exc


# --------------------------------------------------------------------------
# Semantic helpers
# --------------------------------------------------------------------------


def _result(issues: Sequence[Issue]) -> CheckResult:
    issues = list(issues)
    if not issues:
        return CheckResult(STATUS_OK, [])
    for status in _STATUS_ORDER:
        if any(issue.status == status for issue in issues):
            return CheckResult(status, issues)
    return CheckResult(STATUS_INVALID, issues)


def _range_ordered(rng: Mapping[str, Any], path: str, issues: list[Issue], what: str) -> bool:
    if rng["min"] > rng["max"]:
        issues.append(Issue(path, CODE_INVALID_VALUE, f"{what} range min must not be greater than max"))
        return False
    return True


def _check_connector_access(access: Mapping[str, Any], path: str, issues: list[Issue]) -> None:
    local = access["local_xy_range"]
    _range_ordered(local[0], f"{path}/local_xy_range/0", issues, "connector access local X")
    _range_ordered(local[1], f"{path}/local_xy_range/1", issues, "connector access local Y")
    z_range = access["absolute_z_range"]
    if z_range[0] > z_range[1]:
        issues.append(Issue(f"{path}/absolute_z_range", CODE_INVALID_VALUE, "Z range min must not be greater than max"))


def _plate_dim_bounds(plate: Mapping[str, Any], dim: str) -> tuple[float, float] | None:
    """(min, max) possible value of a plate dimension, or None when unclassified."""
    if dim in plate["locked"]:
        return (plate[dim], plate[dim])
    rng = plate["editable"].get(dim)
    if rng is None:
        return None
    return (rng["min"], rng["max"])


def _require_numbers(value: Any) -> bool:
    return all(isinstance(item, (int, float)) and not isinstance(item, bool) for item in value)


# --------------------------------------------------------------------------
# TaskSpec
# --------------------------------------------------------------------------


def _semantic_task(doc: Mapping[str, Any]) -> list[Issue]:
    issues: list[Issue] = []
    if doc["units"] not in SUPPORTED_UNITS:
        issues.append(
            Issue(
                "/units",
                CODE_UNSUPPORTED_UNIT,
                f"units must be one of {list(SUPPORTED_UNITS)}; explicit conversion from other units is not implemented",
            )
        )
    if doc["frame"] != FRAME:
        issues.append(Issue("/frame", CODE_INVALID_VALUE, f"frame must be {FRAME!r}"))

    plate = doc["plate"]
    dimensions = ("width", "height", "thickness")
    locked = list(plate["locked"])
    editable = dict(plate["editable"])
    if len(set(locked)) != len(locked):
        issues.append(Issue("/plate/locked", CODE_INVALID_VALUE, "locked dimensions must be unique"))
    for dim in locked:
        if dim in editable:
            issues.append(
                Issue(f"/plate/editable/{dim}", CODE_INVALID_VALUE, "a dimension cannot be both locked and editable")
            )
    for dim in dimensions:
        if dim not in locked and dim not in editable:
            issues.append(
                Issue(
                    "/plate",
                    CODE_INVALID_VALUE,
                    f"dimension {dim!r} is neither locked nor editable; its status must be stated explicitly",
                )
            )
    for dim in sorted(editable):
        rng = editable[dim]
        if _range_ordered(rng, f"/plate/editable/{dim}", issues, f"editable {dim}"):
            if not (rng["min"] - _EPS <= plate[dim] <= rng["max"] + _EPS):
                issues.append(
                    Issue(
                        f"/plate/editable/{dim}",
                        CODE_INVALID_VALUE,
                        f"nominal {dim} {plate[dim]!r} lies outside its own editable range "
                        f"[{rng['min']!r}, {rng['max']!r}]",
                    )
                )

    width_bounds = _plate_dim_bounds(plate, "width")
    height_bounds = _plate_dim_bounds(plate, "height")
    min_width = width_bounds[0] if width_bounds else None
    min_height = height_bounds[0] if height_bounds else None

    base_holes = doc["base_holes"]
    base_radius = base_holes["diameter"] / 2.0
    if len(base_holes["centers"]) > MAX_BASE_HOLES:
        issues.append(
            Issue(
                "/base_holes/centers",
                CODE_LIMIT_EXCEEDED,
                f"{len(base_holes['centers'])} base holes exceed the limit of {MAX_BASE_HOLES}",
            )
        )
    for index, center in enumerate(base_holes["centers"]):
        path = f"/base_holes/centers/{index}"
        if not _require_numbers(center):
            continue
        x, y = center
        if min_width is not None and not (-_EPS <= x <= min_width + _EPS):
            issues.append(
                Issue(path, CODE_INVALID_VALUE, f"base hole X={x!r} leaves the plate for the smallest allowed width")
            )
        if min_height is not None and not (-_EPS <= y <= min_height + _EPS):
            issues.append(
                Issue(path, CODE_INVALID_VALUE, f"base hole Y={y!r} leaves the plate for the smallest allowed height")
            )
        if min_width is not None and (x - base_radius < -_EPS or x + base_radius > min_width + _EPS):
            issues.append(
                Issue(
                    path,
                    CODE_INVALID_VALUE,
                    "base hole would break the plate edge for the smallest allowed width "
                    "(an open edge hole is not an acceptable frozen condition)",
                )
            )
        if min_height is not None and (y - base_radius < -_EPS or y + base_radius > min_height + _EPS):
            issues.append(
                Issue(
                    path,
                    CODE_INVALID_VALUE,
                    "base hole would break the plate edge for the smallest allowed height",
                )
            )

    sensor = doc["sensor"]
    body = sensor["body_size"]
    if len(sensor["hole_offsets"]) > MAX_SENSOR_HOLES:
        issues.append(
            Issue(
                "/sensor/hole_offsets",
                CODE_LIMIT_EXCEEDED,
                f"{len(sensor['hole_offsets'])} sensor holes exceed the limit of {MAX_SENSOR_HOLES}",
            )
        )
    total_holes = len(base_holes["centers"]) + len(sensor["hole_offsets"])
    if total_holes > MAX_TOTAL_HOLES:
        issues.append(
            Issue("/base_holes/centers", CODE_LIMIT_EXCEEDED, f"{total_holes} holes exceed the limit of {MAX_TOTAL_HOLES}")
        )
    for index, offset in enumerate(sensor["hole_offsets"]):
        if not _require_numbers(offset):
            continue
        dx, dy = offset
        if abs(dx) > body[0] / 2.0 + _EPS or abs(dy) > body[1] / 2.0 + _EPS:
            issues.append(
                Issue(
                    f"/sensor/hole_offsets/{index}",
                    CODE_INVALID_VALUE,
                    "hole offset lies outside the device envelope; the mounting interface would not exist",
                )
            )
    if sensor["hole_diameter"] >= min(body[0], body[1]):
        issues.append(
            Issue("/sensor/hole_diameter", CODE_INVALID_VALUE, "hole diameter must be smaller than the device envelope")
        )

    center_x = sensor["allowed_center_x"]
    center_y = sensor["allowed_center_y"]
    _range_ordered(center_x, "/sensor/allowed_center_x", issues, "allowed center X")
    _range_ordered(center_y, "/sensor/allowed_center_y", issues, "allowed center Y")
    for axis, rng, size, limit, label in (
        ("x", center_x, body[0], min_width, "width"),
        ("y", center_y, body[1], min_height, "height"),
    ):
        if limit is None or rng["min"] > rng["max"]:
            continue
        half = size / 2.0
        if rng["min"] - half < -_EPS or rng["max"] + half > limit + _EPS:
            issues.append(
                Issue(
                    f"/sensor/allowed_center_{axis}",
                    CODE_INVALID_VALUE,
                    f"device envelope leaves the plate for some allowed center (plate {label} may be as small as "
                    f"{limit!r}, allowed center range is [{rng['min']!r}, {rng['max']!r}], device size is {size!r})",
                )
            )

    rotations = sensor["allowed_rotation_deg"]
    if not rotations or any(rotation != 0 for rotation in rotations):
        issues.append(
            Issue(
                "/sensor/allowed_rotation_deg",
                CODE_UNSUPPORTED_FEATURE,
                "version 1.0 supports rotation 0 only; a task allowing any other angle is refused rather than approximated",
            )
        )

    tolerance = doc["tolerances"]["dimensional_tolerance_mm"]
    epsilon = doc["tolerances"]["geometry_epsilon_mm"]
    if tolerance < epsilon:
        issues.append(
            Issue(
                "/tolerances/dimensional_tolerance_mm",
                CODE_INVALID_VALUE,
                "dimensional tolerance must not be tighter than the geometry epsilon",
            )
        )

    provenance = doc["provenance"]
    if provenance["kind"] == "synthetic_teaching_fixture" and provenance["review_status"] == "verified":
        issues.append(
            Issue(
                "/provenance/review_status",
                CODE_INVALID_VALUE,
                "synthetic_teaching_fixture data cannot be marked 'verified': teaching coordinates are design "
                "targets, and a verified status would present them as measured device facts",
            )
        )

    prior = doc.get("prior_device")
    if isinstance(prior, Mapping):
        _check_connector_access(prior["connector_access"], "/prior_device/connector_access", issues)

    return issues


def validate_task(doc: Any, *, schema: Mapping[str, Any] | None = None) -> CheckResult:
    """Validate a TaskSpec document (structure + cross-field semantics)."""
    schema = schema if schema is not None else load_schema("task")
    issues = _validate_against(schema, doc, source="task.schema.json")
    if not issues:
        issues.extend(_semantic_task(doc))
    return _result(issues)


# --------------------------------------------------------------------------
# Scene
# --------------------------------------------------------------------------


def _semantic_scene(doc: Mapping[str, Any]) -> list[Issue]:
    issues: list[Issue] = []
    if doc["units"] not in SUPPORTED_UNITS:
        issues.append(
            Issue("/units", CODE_UNSUPPORTED_UNIT, f"units must be one of {list(SUPPORTED_UNITS)}")
        )
    if doc["frame"] != FRAME:
        issues.append(Issue("/frame", CODE_INVALID_VALUE, f"frame must be {FRAME!r}"))

    seen_ids: list[str] = []
    roles: list[str] = []
    for index, obj in enumerate(doc["objects"]):
        path = f"/objects/{index}"
        object_id = obj["id"]
        if object_id in seen_ids:
            issues.append(Issue(f"{path}/id", CODE_INVALID_VALUE, f"duplicate object id {object_id!r}"))
        seen_ids.append(object_id)
        role = obj["role"]
        roles.append(role)
        if obj["kind"] == "cylinder":
            if obj["z_range"][0] > obj["z_range"][1]:
                issues.append(Issue(f"{path}/z_range", CODE_INVALID_VALUE, "Z range min must not be greater than max"))
            if role == "screw_head_envelope":
                if "base_hole_index" not in obj:
                    issues.append(
                        Issue(
                            f"{path}/base_hole_index",
                            CODE_MISSING_FIELD,
                            "a screw-head envelope must name the base hole it covers",
                        )
                    )
            elif "base_hole_index" in obj:
                issues.append(
                    Issue(
                        f"{path}/base_hole_index",
                        CODE_UNKNOWN_FIELD,
                        "a fixed obstacle does not map to a base hole",
                    )
                )
        else:
            _check_connector_access(
                {"local_xy_range": obj["local_xy_range"], "absolute_z_range": obj["absolute_z_range"]},
                path,
                issues,
            )

    if "fixed_obstacle" not in roles:
        issues.append(
            Issue(
                "/objects",
                CODE_MISSING_FIELD,
                "the scene must declare at least one fixed_obstacle cylinder (the fixed post is part of the fixture, "
                "not something this project generates)",
            )
        )
    access_count = roles.count("connector_access")
    if access_count == 0:
        issues.append(
            Issue("/objects", CODE_MISSING_FIELD, "the scene must declare the connector_access envelope")
        )
    elif access_count > 1:
        issues.append(Issue("/objects", CODE_INVALID_VALUE, "exactly one connector_access envelope is supported"))

    participants = set(seen_ids) | set(RESERVED_PARTICIPANT_IDS)
    pairs: set[frozenset[str]] = set()
    for index, contact in enumerate(doc["support_contacts"]):
        path = f"/support_contacts/{index}"
        if contact["a"] == contact["b"]:
            issues.append(Issue(path, CODE_INVALID_VALUE, "a contact pair must reference two distinct participants"))
        for side in ("a", "b"):
            if contact[side] not in participants:
                issues.append(
                    Issue(
                        f"{path}/{side}",
                        CODE_INVALID_VALUE,
                        f"unknown participant {contact[side]!r}; expected a scene object id or one of "
                        f"{list(RESERVED_PARTICIPANT_IDS)}",
                    )
                )
        pairs.add(frozenset((contact["a"], contact["b"])))
    if frozenset(("sensor_body", "plate_top")) not in pairs:
        issues.append(
            Issue(
                "/support_contacts",
                CODE_MISSING_FIELD,
                "the sensor_body/plate_top support contact must be declared explicitly; without it the expected "
                "seating contact would be reported as an interference",
            )
        )
    return issues


def validate_scene(doc: Any, *, schema: Mapping[str, Any] | None = None) -> CheckResult:
    """Validate a scene document (structure + cross-field semantics)."""
    schema = schema if schema is not None else load_schema("scene")
    issues = _validate_against(schema, doc, source="scene.schema.json")
    if not issues:
        issues.extend(_semantic_scene(doc))
    return _result(issues)


def check_scene_against_task(scene: Mapping[str, Any], task: Mapping[str, Any]) -> CheckResult:
    """Check that a scene describes the environment of the given task."""
    issues: list[Issue] = []
    if scene.get("scene_id") != task.get("task_id"):
        issues.append(
            Issue("/scene_id", CODE_INVALID_VALUE, f"scene_id {scene.get('scene_id')!r} does not match task_id {task.get('task_id')!r}")
        )
    if scene.get("units") != task.get("units"):
        issues.append(Issue("/units", CODE_INVALID_VALUE, "scene and task must use the same units"))
    if scene.get("frame") != task.get("frame"):
        issues.append(Issue("/frame", CODE_INVALID_VALUE, "scene and task must use the same coordinate frame"))
    if issues:
        return _result(issues)

    centers = task["base_holes"]["centers"]
    base_radius = task["base_holes"]["diameter"] / 2.0
    heads = [obj for obj in scene["objects"] if obj.get("role") == "screw_head_envelope"]
    if len(heads) != len(centers):
        issues.append(
            Issue(
                "/objects",
                CODE_INVALID_VALUE,
                f"found {len(heads)} screw-head envelope(s) for {len(centers)} frozen base hole(s); "
                "every base hole needs exactly one envelope",
            )
        )
    seen_indexes: list[int] = []
    for index, head in enumerate(heads):
        path = f"/objects/{index}"
        hole_index = head.get("base_hole_index")
        if not isinstance(hole_index, int) or isinstance(hole_index, bool) or not (0 <= hole_index < len(centers)):
            issues.append(
                Issue(f"{path}/base_hole_index", CODE_INVALID_VALUE, f"base_hole_index {hole_index!r} is out of range")
            )
            continue
        if hole_index in seen_indexes:
            issues.append(
                Issue(f"{path}/base_hole_index", CODE_INVALID_VALUE, f"base hole {hole_index} is covered twice")
            )
        seen_indexes.append(hole_index)
        expected = centers[hole_index]
        axis = head["axis_xy"]
        if any(abs(axis[axis_index] - expected[axis_index]) > _EPS for axis_index in (0, 1)):
            issues.append(
                Issue(
                    f"{path}/axis_xy",
                    CODE_INVALID_VALUE,
                    f"screw-head envelope must be centered on the frozen base hole {expected!r}, got {axis!r}",
                )
            )
        if head["radius"] < base_radius - _EPS:
            issues.append(
                Issue(
                    f"{path}/radius",
                    CODE_INVALID_VALUE,
                    "screw-head envelope radius must cover the base hole it protects",
                )
            )
    return _result(issues)


# --------------------------------------------------------------------------
# DesignSpec
# --------------------------------------------------------------------------


def validate_design(doc: Any, *, schema: Mapping[str, Any] | None = None) -> CheckResult:
    """Validate a DesignSpec on its own (no task to compare against)."""
    schema = schema if schema is not None else load_schema("design")
    issues = _validate_against(schema, doc, source="design.schema.json")
    return _result(issues)


def check_design_against_task(design: Mapping[str, Any], task: Mapping[str, Any]) -> CheckResult:
    """Check a design candidate against the frozen task it claims to solve.

    Order of decisions:

    1. structural validity of the design document itself;
    2. task identity and revision - a design for another task or revision is
       ``STALE_INPUT`` and nothing else is compared (the numbers would be
       meaningless);
    3. locked dimensions must keep their frozen value, editable dimensions must
       be present and inside their allowed range;
    4. the device pose must respect the allowed center ranges and allowed
       rotations (version 1.0: 0 only).
    """
    issues: list[Issue] = list(validate_design(design).issues)
    stated_task_id = design.get("task_id")
    if isinstance(stated_task_id, str) and stated_task_id != task.get("task_id"):
        issues.append(
            Issue(
                "/task_id",
                CODE_STALE_INPUT,
                f"design targets task {stated_task_id!r}, current task is {task.get('task_id')!r}",
            )
        )
    stated_revision = design.get("task_revision")
    if isinstance(stated_revision, int) and not isinstance(stated_revision, bool):
        if stated_revision != task.get("revision"):
            issues.append(
                Issue(
                    "/task_revision",
                    CODE_STALE_INPUT,
                    f"design targets revision {stated_revision!r}, current revision is {task.get('revision')!r}; "
                    "re-read the frozen task before comparing anything else",
                )
            )
            return _result(issues)

    plate = design.get("plate")
    plate = plate if isinstance(plate, Mapping) else {}
    task_plate = task["plate"]
    locked = set(task_plate["locked"])
    editable = dict(task_plate["editable"])
    for dim in ("width", "height", "thickness"):
        if dim not in plate:
            continue
        value = plate[dim]
        if dim in locked:
            if not isinstance(value, (int, float)) or isinstance(value, bool):
                continue  # already reported structurally
            if abs(float(value) - float(task_plate[dim])) > _EPS:
                issues.append(
                    Issue(
                        f"/plate/{dim}",
                        CODE_LOCKED_CONSTRAINT_CHANGED,
                        f"{dim} is locked at {task_plate[dim]!r}; the design proposes {value!r}",
                    )
                )
        else:
            rng = editable[dim]
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                if not (rng["min"] - _EPS <= value <= rng["max"] + _EPS):
                    issues.append(
                        Issue(
                            f"/plate/{dim}",
                            CODE_INVALID_VALUE,
                            f"{dim}={value!r} is outside the allowed range [{rng['min']!r}, {rng['max']!r}]",
                        )
                    )
    for dim in sorted(editable):
        if dim not in plate:
            issues.append(
                Issue(
                    f"/plate/{dim}",
                    CODE_MISSING_FIELD,
                    f"{dim} is editable for this task and must be chosen explicitly (no silent default)",
                )
            )

    pose = design.get("sensor_pose")
    if isinstance(pose, Mapping):
        sensor = task["sensor"]
        rotation = pose.get("rotation_deg")
        if isinstance(rotation, (int, float)) and not isinstance(rotation, bool):
            allowed_rotations = sensor["allowed_rotation_deg"]
            if not any(abs(float(rotation) - allowed) <= _EPS for allowed in allowed_rotations):
                issues.append(
                    Issue(
                        "/sensor_pose/rotation_deg",
                        CODE_INVALID_VALUE,
                        f"rotation {rotation!r} is not allowed (allowed: {allowed_rotations!r})",
                    )
                )
        center = pose.get("center")
        if isinstance(center, list) and len(center) == 2 and _require_numbers(center):
            for axis, value, key in (("x", center[0], "allowed_center_x"), ("y", center[1], "allowed_center_y")):
                rng = sensor[key]
                if not (rng["min"] - _EPS <= value <= rng["max"] + _EPS):
                    issues.append(
                        Issue(
                            f"/sensor_pose/center/{0 if axis == 'x' else 1}",
                            CODE_INVALID_VALUE,
                            f"device center {axis}={value!r} is outside the allowed range "
                            f"[{rng['min']!r}, {rng['max']!r}]",
                        )
                    )
    return _result(issues)


# --------------------------------------------------------------------------
# ValidationReport
# --------------------------------------------------------------------------


def _semantic_report(doc: Mapping[str, Any]) -> list[Issue]:
    issues: list[Issue] = []
    checks = doc["checks"]
    ids = [check["id"] for check in checks]
    if len(set(ids)) != len(ids):
        issues.append(Issue("/checks", CODE_INVALID_VALUE, "check ids must be unique"))
    for index, check in enumerate(checks):
        path = f"/checks/{index}"
        status = check["status"]
        measured = check["measured"]
        if status in ("PASS", "FAIL") and not measured:
            issues.append(
                Issue(
                    f"{path}/measured",
                    CODE_MISSING_FIELD,
                    "a PASS/FAIL result must carry the actual re-measured values; "
                    "use status UNKNOWN when nothing could be measured",
                )
            )
        if status != "PASS" and not check.get("reason_code"):
            issues.append(
                Issue(f"{path}/reason_code", CODE_MISSING_FIELD, "a non-PASS result must state a reason code")
            )

    errors = doc["errors"]
    missing = [check_id for check_id in CHECK_IDS if check_id not in ids]
    failing = [check["id"] for check in checks if check["status"] != "PASS"]
    clean = not missing and not failing and not errors and len(checks) == len(CHECK_IDS)
    if doc["overall"] == "PASS" and not clean:
        details = []
        if missing:
            details.append(f"missing check(s) {missing}")
        if failing:
            details.append(f"non-PASS check(s) {failing}")
        if errors:
            details.append(f"{len(errors)} recorded error(s)")
        issues.append(
            Issue(
                "/overall",
                CODE_REPORT_INCONSISTENT,
                "overall PASS is invalid: " + "; ".join(details) + ". A missing, UNKNOWN or BORDERLINE item can never be accepted",
            )
        )
    if doc["overall"] != "PASS" and clean:
        issues.append(
            Issue(
                "/overall",
                CODE_REPORT_INCONSISTENT,
                "all eight checks passed with no recorded errors, so overall must be PASS",
            )
        )
    return issues


def validate_report(doc: Any, *, schema: Mapping[str, Any] | None = None) -> CheckResult:
    """Validate a ValidationReport document (structure + PASS consistency)."""
    schema = schema if schema is not None else load_schema("report")
    issues = _validate_against(schema, doc, source="report.schema.json")
    if not issues:
        issues.extend(_semantic_report(doc))
    return _result(issues)


def validate_preview(doc: Any, *, schema: Mapping[str, Any] | None = None) -> CheckResult:
    """Validate a candidate preview descriptor (``preview.json``, emitted in T09).

    The contract lives in ``report.schema.json#/$defs/previewArtifact`` and
    requires every preview mesh to carry the STEP hash and candidate id of the
    exact artefact it visualises, so a viewer cannot show a mesh that does not
    match the validated entity.
    """
    report_schema = schema if schema is not None else load_schema("report")
    root = {"$defs": report_schema["$defs"], "$ref": "#/$defs/previewArtifact"}
    issues = _validate_against(root, doc, source="report.schema.json#/$defs/previewArtifact")
    return _result(issues)


def verify_report_binding(
    report: Mapping[str, Any],
    *,
    task: Mapping[str, Any] | None = None,
    scene: Mapping[str, Any] | None = None,
    step_sha256: str | None = None,
) -> CheckResult:
    """Check that a report belongs to the current frozen inputs and artefact.

    This is the "old PASS must expire" rule: a report whose task/scene/STEP
    hashes or candidate identity no longer match the current inputs is
    ``STALE_INPUT`` and cannot be used as evidence.
    """
    issues: list[Issue] = []
    hashes = report.get("hashes", {})
    if task is not None:
        if report.get("task_id") != task.get("task_id") or report.get("task_revision") != task.get("revision"):
            issues.append(
                Issue(
                    "/task_revision",
                    CODE_STALE_INPUT,
                    "report was produced for a different task revision",
                )
            )
        if hashes.get("task_sha256") != content_sha256(task):
            issues.append(Issue("/hashes/task_sha256", CODE_STALE_INPUT, "report does not match the current task content hash"))
        if task.get("scene_sha256") is not None and hashes.get("scene_sha256") != task["scene_sha256"]:
            issues.append(
                Issue("/hashes/scene_sha256", CODE_STALE_INPUT, "report does not match the scene hash pinned by the task")
            )
    if scene is not None and hashes.get("scene_sha256") != content_sha256(scene):
        issues.append(Issue("/hashes/scene_sha256", CODE_STALE_INPUT, "report does not match the current scene content"))
    if step_sha256 is not None:
        if hashes.get("step_sha256") != step_sha256:
            issues.append(
                Issue("/hashes/step_sha256", CODE_STALE_INPUT, "report does not match the artefact it claims to describe")
            )

    if scene is not None:
        known = {obj["id"] for obj in scene.get("objects", [])} | set(REPORT_FEATURE_IDS)
        for index, check in enumerate(report.get("checks", [])):
            for object_id in check.get("objects", []):
                if object_id not in known:
                    issues.append(
                        Issue(
                            f"/checks/{index}/objects",
                            CODE_INVALID_VALUE,
                            f"unknown object id {object_id!r}; a report may only name scene objects or registered plate features",
                        )
                    )
    return _result(issues)


# --------------------------------------------------------------------------
# Scene binding (freeze enforcement)
# --------------------------------------------------------------------------


def check_scene_binding(task: Mapping[str, Any], scene: Any, scene_filename: str) -> CheckResult:
    """Check that the scene file is the one the task pinned, by name and content.

    Replacing the referenced scene file - a different name, a different body, or
    both - is detected here, so the freeze cannot be bypassed by swapping files.
    """
    issues: list[Issue] = []
    if not is_safe_ref_name(scene_filename):
        issues.append(
            Issue(
                "/scene_ref",
                CODE_SCENE_REF_MISMATCH,
                f"scene file name {scene_filename!r} is not a safe registered reference name (plain "
                "<name>.scene.json file inside the task directory)",
            )
        )
        return _result(issues)
    if scene_filename != task.get("scene_ref"):
        issues.append(
            Issue(
                "/scene_ref",
                CODE_SCENE_REF_MISMATCH,
                f"scene file {scene_filename!r} does not match task.scene_ref {task.get('scene_ref')!r}",
            )
        )
    digest = content_sha256(scene)
    if digest != task.get("scene_sha256"):
        issues.append(
            Issue(
                "/scene_sha256",
                CODE_SCENE_HASH_MISMATCH,
                "scene content hash does not match the frozen task.scene_sha256; the referenced scene was replaced "
                "or edited after freezing",
            )
        )
    return _result(issues)


# --------------------------------------------------------------------------
# Task bundle loading
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class TaskBundle:
    """A frozen task plus its scene, with the contract result of loading them."""

    directory: Path
    task: Mapping[str, Any]
    scene: Mapping[str, Any] | None
    result: CheckResult

    @property
    def ok(self) -> bool:
        return self.result.ok

    def require_ok(self) -> "TaskBundle":
        """Raise :class:`ContractError` unless the bundle loaded cleanly."""
        if not self.ok:
            raise ContractError(f"task bundle {self.directory} did not pass the contract: {self.result.status}", self.result.issues)
        return self

    def fingerprint(self) -> dict[str, str]:
        if self.scene is None:
            raise ContractError("cannot fingerprint a bundle without a scene", self.result.issues)
        return frozen_fingerprint(self.task, self.scene)


def load_task_bundle(directory: str | Path) -> TaskBundle:
    """Load ``task.json`` + the scene it references from one task directory.

    The scene reference is resolved inside the same directory only, and its
    content hash must match ``task.scene_sha256``. Every problem is reported in
    the returned bundle's :class:`CheckResult`; nothing raises for a *bad input*
    document (only :class:`ContractError` from :meth:`TaskBundle.require_ok`).
    """
    directory = Path(directory)
    issues: list[Issue] = []
    task_path = directory / "task.json"
    try:
        task = load_json_file(task_path)
    except JsonLoadError as exc:
        issues.append(Issue("/", exc.code, str(exc)))
        return TaskBundle(directory, {}, None, _result(issues))

    issues.extend(validate_task(task).issues)

    scene: Mapping[str, Any] | None = None
    ref = task.get("scene_ref") if isinstance(task, Mapping) else None
    if not isinstance(ref, str) or not is_safe_ref_name(ref):
        issues.append(
            Issue(
                "/scene_ref",
                CODE_SCENE_REF_MISMATCH,
                f"scene_ref {ref!r} is not a safe registered reference name",
            )
        )
    else:
        scene_path = directory / ref
        if scene_path.resolve().parent != directory.resolve():
            issues.append(Issue("/scene_ref", CODE_SCENE_REF_MISMATCH, "scene_ref escapes the task directory"))
        elif not scene_path.is_file():
            issues.append(Issue("/scene_ref", CODE_SCENE_FILE_MISSING, f"referenced scene file {ref!r} does not exist"))
        else:
            try:
                scene = load_json_file(scene_path)
            except JsonLoadError as exc:
                issues.append(Issue("/scene_ref", exc.code, f"{ref}: {exc}"))
    if isinstance(scene, Mapping) and isinstance(task, Mapping):
        issues.extend(validate_scene(scene).issues)
        issues.extend(check_scene_binding(task, scene, ref).issues)
        issues.extend(check_scene_against_task(scene, task).issues)
    return TaskBundle(directory, task, scene, _result(issues))
