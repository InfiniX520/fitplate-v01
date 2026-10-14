"""FitPlate geometry / contract package.

T02 scope: the contract layer (``fitplate.schema``) only. Modelling, STEP
inspection, constraint checking and export modules arrive with T03-T05 and are
deliberately absent here rather than stubbed.

Everything in this package must stay importable on a bare CPython 3.12 with no
third-party packages installed, so the contract tests can run before the CAD
dependency is confirmed.
"""

from __future__ import annotations

__all__ = ["schema"]

__version__ = "0.1.0.dev0"

#: Version of the JSON contracts in ``schemas/`` this package validates against.
CONTRACT_SCHEMA_VERSION = "1.0"
