"""Error vocabulary for the FitPlate geometry CLI (T03/T04/T05/T10).

Two distinct failure families, because the plan's state machine treats them
differently:

* :class:`RequestRefused` - the *input document* is not usable. The caller must
  fix the request (missing/unknown field, non-finite number, bad path, a design
  that tries to change a locked value, a stale revision). Nothing was measured;
  this is never a statement about the geometry.
* :class:`ExecutionFailure` - the request was well-formed but the geometry
  work could not be completed (STEP unreadable, kernel error, mesh budget
  exceeded, write failure). Per the plan a failed run never publishes a
  candidate directory and never reports a PASS.

Both carry a machine ``code`` from :data:`ERROR_CODES` so the plugin layer can
map them to its own ``isError`` results without parsing prose.
"""

from __future__ import annotations

from typing import Any

# --------------------------------------------------------------------------
# Statuses (envelope-level, mirroring the plan's state machine vocabulary)
# --------------------------------------------------------------------------

STATUS_OK = "OK"
STATUS_ERROR = "ERROR"
STATUS_NEEDS_INPUT = "NEEDS_INPUT"
STATUS_INVALID_SPEC = "INVALID_SPEC"
STATUS_LOCKED_CONSTRAINT_CHANGED = "LOCKED_CONSTRAINT_CHANGED"
STATUS_STALE_INPUT = "STALE_INPUT"

#: Statuses that mean "the CLI refused the request" (exit code 3).
REFUSAL_STATUSES = frozenset(
    {
        STATUS_NEEDS_INPUT,
        STATUS_INVALID_SPEC,
        STATUS_LOCKED_CONSTRAINT_CHANGED,
        STATUS_STALE_INPUT,
    }
)

EXIT_OK = 0
EXIT_ERROR = 2
EXIT_REFUSED = 3

# --------------------------------------------------------------------------
# Codes
# --------------------------------------------------------------------------

CODE_REQUEST_MALFORMED = "REQUEST_MALFORMED"
CODE_UNKNOWN_FIELD = "UNKNOWN_FIELD"
CODE_MISSING_FIELD = "MISSING_FIELD"
CODE_INVALID_VALUE = "INVALID_VALUE"
CODE_NON_FINITE = "NON_FINITE_NUMBER"
CODE_LIMIT_EXCEEDED = "LIMIT_EXCEEDED"
CODE_INVALID_PATH = "INVALID_PATH"
CODE_CONTRACT_VIOLATION = "CONTRACT_VIOLATION"
CODE_PERSISTENCE_FAILED = "PERSISTENCE_FAILED"

CODE_STEP_IMPORT_FAILED = "STEP_IMPORT_FAILED"
CODE_STEP_INVALID = "STEP_INVALID"
CODE_STEP_EMPTY = "STEP_EMPTY"

CODE_BUILD_FAILED = "BUILD_FAILED"
CODE_CANDIDATE_EXISTS = "CANDIDATE_EXISTS"
CODE_MESH_BUDGET_EXCEEDED = "MESH_BUDGET_EXCEEDED"
CODE_ARTEFACT_MISSING = "ARTEFACT_MISSING"
CODE_ARTEFACT_HASH_MISMATCH = "ARTEFACT_HASH_MISMATCH"
CODE_ARTEFACT_INCONSISTENT = "ARTEFACT_INCONSISTENT"
CODE_STL_UNREADABLE = "STL_UNREADABLE"
CODE_STL_TRUNCATED = "STL_TRUNCATED"

ERROR_CODES = tuple(
    sorted(
        name
        for name, value in list(globals().items())
        if name.startswith("CODE_") and isinstance(value, str)
    )
)


class FitplateError(Exception):
    """Base class: a machine-readable failure with a JSON-safe detail payload."""

    status = STATUS_ERROR
    exit_code = EXIT_ERROR

    def __init__(self, code: str, message: str, detail: Any = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.detail = detail

    def to_dict(self) -> dict[str, Any]:
        entry: dict[str, Any] = {"code": self.code, "status": self.status, "message": self.message}
        if self.detail is not None:
            entry["detail"] = self.detail
        return entry


class RequestRefused(FitplateError):
    """The request document is unusable; nothing was measured or written."""

    exit_code = EXIT_REFUSED

    def __init__(self, code: str, message: str, detail: Any = None, status: str = STATUS_INVALID_SPEC) -> None:
        super().__init__(code, message, detail)
        self.status = status


class ExecutionFailure(FitplateError):
    """The request was well-formed but the geometry work failed."""


def refusal(code: str, message: str, detail: Any = None) -> RequestRefused:
    return RequestRefused(code, message, detail)
