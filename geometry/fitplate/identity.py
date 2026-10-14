"""Validator identity: the code hash that binds a report to its implementing modules.

The report must not merely claim which validator produced it - it must carry a
hash of the actual decision code, so a report produced by one revision of the
checker can never be presented as evidence for a different one. The algorithm is
deliberately shared with the AGH plugin bridge
(``plugin/src/python_bridge.py::_validator_code_hash``) so both layers compute
the *same* value for the same geometry root:

1. SHA-256 of each of the three validator modules
   (``fitplate/constraints.py``, ``fitplate/inspect_step.py``,
   ``fitplate/scene.py``), relative to the geometry root;
2. the mapping ``{relative path: file sha256}`` is serialised as canonical JSON
   (``sort_keys=True``, ``separators=(",", ":")``, ``allow_nan=False``, UTF-8);
3. SHA-256 of those bytes.

Only the three modules that decide acceptance are hashed: growing the mapping
would change every historical hash, and the bridge pins the same three.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

#: The modules whose bytes decide a report. The order is irrelevant (the JSON
#: mapping is sorted), but it is kept identical to the bridge for clarity.
VALIDATOR_MODULES: tuple[str, ...] = (
    "fitplate/constraints.py",
    "fitplate/inspect_step.py",
    "fitplate/scene.py",
)

#: ``geometry/`` next to the installed package - the geometry root the caller
#: points the plugin at.
DEFAULT_GEOMETRY_ROOT = Path(__file__).resolve().parents[1]

_CHUNK = 1 << 20


def sha256_file(path: str | Path) -> str:
    """Raw-byte SHA-256 of one file."""
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(_CHUNK), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validator_code_sha256(geometry_root: str | Path | None = None) -> str:
    """The canonical code hash of the acceptance validator.

    ``geometry_root`` is the directory that contains the ``fitplate`` package
    (the plugin's ``geometry_root``); it defaults to this checkout. Raises
    :class:`FileNotFoundError` when a module is missing, so a caller can never
    record a hash that does not describe real code.
    """
    root = Path(geometry_root) if geometry_root is not None else DEFAULT_GEOMETRY_ROOT
    parts: dict[str, str] = {}
    for relative in VALIDATOR_MODULES:
        path = root / relative
        if not path.is_file():
            raise FileNotFoundError(f"validator module is missing from {root}: {relative}")
        parts[relative] = sha256_file(path)
    blob = json.dumps(parts, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()
