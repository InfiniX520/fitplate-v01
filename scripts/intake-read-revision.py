#!/usr/bin/env python
"""Thin CLI over ``fitplate.intake.read_task_bundle`` (no logic of its own).

    .venv/bin/python scripts/intake-read-revision.py <registry_root> <task_id> [revision]

Prints one JSON object: ``{"ok": true, "task_id", "revision", "is_latest", "directory",
"manifest_id", "design_file", "scene_ref"}`` - after the intake core has verified the index
record against the bytes on disk (hashes, cross-document agreement, symlink refusals). A
refusal prints ``{"ok": false, "code", "message"}`` and exits 3; a usage error exits 2.

This is the only supported way for the Node-side workspace preparation to read a registered
task revision: the verification stays in the intake core, and no caller passes an arbitrary
directory - the registry root must be a real intake registry (<root>/index.json).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def main(argv: list[str]) -> int:
    if len(argv) not in (2, 3, 4):
        print(json.dumps({"ok": False, "code": "USAGE", "message": "usage: intake-read-revision.py <registry_root> <task_id> [revision]"}), file=sys.stderr)
        return 2
    registry_root = Path(argv[1])
    task_id = argv[2]
    revision = None
    if len(argv) == 4:
        try:
            revision = int(argv[3])
        except ValueError:
            print(json.dumps({"ok": False, "code": "USAGE", "message": "revision must be an integer"}), file=sys.stderr)
            return 2
    sys.path.insert(0, str(REPO_ROOT / "geometry"))
    from fitplate import intake  # noqa: PLC0415 - path is fixed above

    try:
        info = intake.read_task_bundle(registry_root, task_id, revision)
    except intake.IntakeError as error:
        print(json.dumps({"ok": False, "code": error.code, "message": error.message}))
        return 3
    manifest = info["manifest"]
    print(
        json.dumps(
            {
                "ok": True,
                "task_id": info["task_id"],
                "revision": info["revision"],
                "is_latest": info["is_latest"],
                "directory": str(info["directory"]),
                "manifest_id": manifest.get("manifest_id"),
                "scene_ref": info["task"].get("scene_ref"),
                "design_file": "initial-design.json" if info.get("design") is not None else None,
            }
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
