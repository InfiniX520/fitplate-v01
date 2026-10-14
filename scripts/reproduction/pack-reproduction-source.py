#!/usr/bin/env python3
"""Public reproduction source packer for FitPlate.

Builds a reviewable PUBLIC source bundle from a strict whitelist: reads only the
source root, writes a NEW zip target. Contract:

  * ALL targets (zip AND manifest) are validated BEFORE the zip is written; a
    refusal never leaves any output behind. Refused targets include: already
    existing, identical to another output, inside the source root, or reached
    through a symlinked ancestor. The ancestor chain is lstat-walked from the
    filesystem root BEFORE resolve() so a symlinked ancestor cannot be swallowed.
  * `plugin/src/report-facts.d.mts` IS REQUIRED (it is a hand-written source
    declaration, not a tsc output - tsc runs --noEmit).
  * `plugin/extensions/main/client/` built assets (index.js/css/map,
    build-manifest.json) ARE REQUIRED: the manifest entry needs them and the
    main reproduction flow does not force a rebuild. The current built assets
    are shipped byte-identical; binding deployment paths in the new directory
    or rebuilding changes the package identity and must be recorded separately.
  * The packer, the public README and the official-DS-1M configurator from THIS
    preparation directory are included under `scripts/reproduction/` by an
    explicit mapping (the supervision records round1-before/review/PUBLIC-
    DELIVERY are NOT included).
  * Private-path denial uses exact segment rules (a segment equals a denied name
    or a denied segment pair), never substring tricks. Unrelated cache
    directories inside whitelisted trees are skipped; any secret-looking FILE
    name inside a whitelisted tree is a HARD refusal, not a skip.

Usage:
  python3 pack-reproduction-source.py --source-root <fitplate checkout> \
      --target <new .zip path> [--manifest-out <manifest.json path>] \
      [--prep-root <this preparation directory>]

Exit codes: 0 packed · 2 usage · 3 refused · 4 I/O error
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import stat
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

# ---------------------------------------------------------------------------
# strict public whitelist
# ---------------------------------------------------------------------------

REQUIRED_FILES: list[str] = [
    # top-level build/config
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "tsconfig.client.json",
    "LICENSE",
    "THIRD_PARTY.md",
    # plugin manifest + runtime sources; report-facts.d.mts is a REQUIRED hand-written
    # declaration (round1 wrongly excluded it; tsc --noEmit generates nothing)
    "plugin/package.json",
    "plugin/LICENSE",
    "plugin/THIRD_PARTY.md",
    "plugin/extensions/main/agnes.client.json",
    # geometry package
    "geometry/pyproject.toml",
    "geometry/requirements.lock.txt",
    "geometry/README.md",
    # frozen public schemas + device data
    "data/devices/banner-q20pd.json",
    "schemas/constraint-draft.schema.json",
    "schemas/design.schema.json",
    "schemas/input-manifest.schema.json",
    "schemas/report.schema.json",
    "schemas/request.schema.json",
    "schemas/scene.schema.json",
    "schemas/task.schema.json",
    # public example spec (public inputs + README only; initial-design excluded by design)
    "examples/public-spec/banner-q20pd-mount-01/README.md",
    "examples/public-spec/banner-q20pd-mount-01/task.json",
    "examples/public-spec/banner-q20pd-mount-01/banner-q20pd-mount-01.scene.json",
    # generic method skill (no case answers)
    ".agh/skills/fitplate-design/SKILL.md",
    # public docs
    "docs/public-case-q20pd.md",
    "docs/reproduction.md",
    "docs/input.md",
    "docs/cad.md",
    "docs/plugin.md",
    "docs/panel.md",
    "docs/intake.md",
    "docs/intake-ui.md",
    "docs/intake-host.md",
    "docs/intake-wiring.md",
    "docs/native-web.md",
    "docs/workflow.md",
    "docs/agh-development.md",
    "docs/cad-validation.md",
]

REQUIRED_DIRS: list[str] = [
    "plugin/src",                      # product runtime sources (minus cache dirs)
    "plugin/client",                   # panel sources incl. types/host.d.ts
    "plugin/extensions/main/client",   # REQUIRED built assets (manifest entry needs them)
    "geometry/fitplate",               # python geometry layer
]

SCRIPTS_WHITELIST: list[str] = [
    "scripts/build-client.mjs",
    "scripts/normalize-input.mjs",
    "scripts/prepare-workspace.mjs",
    "scripts/reproduce-candidate.py",
    "scripts/verify-bundle.py",
    "scripts/verify-cad.py",
    "scripts/intake-read-revision.py",
    "scripts/agh/lib.mjs",
    "scripts/agh/start.mjs",
    "scripts/agh/stop.mjs",
    "scripts/agh/status.mjs",
    "scripts/agh/web.mjs",
    "scripts/agh/package-fitplate.mjs",
    "scripts/agh/run-fitplate.mjs",
]

# This preparation directory's own public deliverables, mapped into the zip root
# and scripts/reproduction/. Explicit mapping; supervision records stay out.
PREP_MAPPINGS: list[tuple[str, str]] = [
    ("README.md", "README.md"),                                  # the public operating manual
    ("pack-reproduction-source.py", "scripts/reproduction/pack-reproduction-source.py"),
    ("configure-official-ds-1m.mjs", "scripts/reproduction/configure-official-ds-1m.mjs"),
    ("bind-fresh-runtime.mjs", "scripts/reproduction/bind-fresh-runtime.mjs"),
    ("fetch-browser-deps.mjs", "scripts/reproduction/fetch-browser-deps.mjs"),
    ("native-reproduction.mjs", "scripts/reproduction/native-reproduction.mjs"),
    ("native-intake-approval.mjs", "scripts/reproduction/native-intake-approval.mjs"),
    ("native-delivery-observation.mjs", "scripts/reproduction/native-delivery-observation.mjs"),
    ("public-native-trace.mjs", "scripts/reproduction/public-native-trace.mjs"),
    ("freeze-native-reproduction.mjs", "scripts/reproduction/freeze-native-reproduction.mjs"),
]

# Cache/build-noise DIRECTORIES that are skipped (not an error) inside whitelisted trees.
SKIP_DIR_NAMES = frozenset({"__pycache__", "node_modules", ".venv", ".cache", ".git"})

# A denied FILE name inside a whitelisted tree is a HARD refusal - secret-looking
# material must never silently ship, and its presence is itself suspicious.
DENIED_FILE_NAMES = frozenset({
    "key.md", ".env", ".env.local", "credentials", "credential", "secret", "secrets",
    "settings.json", "auth.json", ".npmrc", ".netrc",
})

# Exact segment rules for private paths. A relative path is private when any
# SEGMENT equals one of these names (never a substring test), or when it contains
# one of these exact segment pairs (private/supervisor trees).
DENIED_SEGMENT_NAMES = frozenset({
    ".agh-home", ".agh-home-competition", ".agh-home-official-ds41-high-20261011",
    "demo-workspaces", "runs", "evaluation", "fixtures", "tests", "submission",
    "probe-plugin", "smoke-plugin", "attachment-probe-plugin",
})
DENIED_SEGMENT_EXACT_PAIRS = frozenset({
    ("supervisor-only",), ("supervisor",), ("gold",), ("expectations",), ("holdout",),
})


class Refused(Exception):
    """A hard, reviewable refusal - the packer never silently skips."""


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def segment_is_denied(rel_posix: str) -> str | None:
    parts = PurePosixPath(rel_posix).parts
    for part in parts:
        if part.startswith(".agh-home") or part.startswith("private-") or part in DENIED_SEGMENT_NAMES or any(part == p[0] for p in DENIED_SEGMENT_EXACT_PAIRS):
            return part
        if part in DENIED_FILE_NAMES:
            return part
    return None


def walk_chain_no_symlink(abs_path: Path, label: str, *, must_exist: bool) -> None:
    """lstat every ancestor segment from the filesystem ROOT down to abs_path
    BEFORE any resolve(); refuse any symlink in the chain. A missing TAIL is
    allowed only when must_exist is False (a new target)."""
    parts = abs_path.parts[1:] if abs_path.is_absolute() else abs_path.parts
    current = Path(abs_path.anchor if abs_path.is_absolute() else ".")
    found_upto: Path | None = None
    for index, part in enumerate(parts):
        current = current / part
        try:
            st = os.lstat(current)
        except FileNotFoundError:
            if must_exist or index < len(parts) - 1:
                # an ancestor may be missing only if the whole tail is new
                if found_upto is None and (must_exist or index < len(parts) - 1):
                    if must_exist:
                        raise Refused(f"{label}: path does not exist: {abs_path}") from None
            # new tail: remaining segments must not exist either (checked by caller)
            break
        except OSError as error:
            raise Refused(f"{label}: cannot lstat {current} ({error})") from None
        if stat.S_ISLNK(st.st_mode):
            raise Refused(f"{label}: symlinked ancestor in the chain at {current}")
        found_upto = current
    if must_exist and found_upto is None:
        raise Refused(f"{label}: path does not exist: {abs_path}")


def validate_targets(source_root: Path, target: Path, manifest_out: Path | None) -> None:
    """Validate EVERY output location up front, before any byte is written."""
    outputs = [target] + ([manifest_out] if manifest_out else [])
    seen: set[str] = set()
    for out in outputs:
        out_abs = Path(os.path.abspath(out))
        walk_chain_no_symlink(out_abs, "target", must_exist=False)
        if out_abs.exists() or out_abs.is_symlink():
            raise Refused(f"target already exists: {out_abs}")
        key = str(out_abs)
        if key in seen:
            raise Refused(f"two outputs resolve to the same path: {out_abs}")
        seen.add(key)
        if out_abs == source_root or str(out_abs).startswith(str(source_root) + os.sep):
            raise Refused(f"target would be written inside the source root: {out_abs}")
    if manifest_out is not None:
        manifest_abs = Path(os.path.abspath(manifest_out))
        if manifest_abs == Path(os.path.abspath(target)):
            raise Refused("manifest-out and target are the same path")


def resolve_inside(source_root: Path, rel: str, *, expect_dir: bool = False) -> Path:
    """Resolve a whitelisted relative path inside source_root with per-segment
    lstat (no symlinks anywhere in the chain, no '..')."""
    if rel.startswith("/") or ".." in PurePosixPath(rel).parts:
        raise Refused(f"path escapes the source root: {rel}")
    current = source_root
    parts = PurePosixPath(rel).parts
    for index, part in enumerate(parts):
        current = current / part
        try:
            st = os.lstat(current)
        except FileNotFoundError:
            raise Refused(f"missing whitelist entry: {rel}") from None
        if stat.S_ISLNK(st.st_mode):
            raise Refused(f"symlink in the path chain of a whitelisted entry: {rel}")
        last = index == len(parts) - 1
        if last and expect_dir:
            if not stat.S_ISDIR(st.st_mode):
                raise Refused(f"whitelist entry is not a directory: {rel}")
        elif last and not stat.S_ISREG(st.st_mode):
            raise Refused(f"whitelist entry is not a regular file: {rel}")
        if not last and not stat.S_ISDIR(st.st_mode):
            raise Refused(f"directory segment of a whitelist entry is not a directory: {rel}")
    root_abs = os.path.abspath(source_root)
    file_abs = os.path.abspath(current)
    if os.path.commonpath([root_abs, file_abs]) != root_abs:
        raise Refused(f"resolved path leaves the source root: {rel}")
    return current


def collect_tree(source_root: Path, directory: Path) -> list[str]:
    """All regular files under a whitelisted directory. Cache/noise DIRECTORIES are
    skipped; a secret-looking FILE name is a HARD refusal; symlinks anywhere are
    refused; every collected path is checked against the exact private-segment rules."""
    found: list[str] = []
    stack = [directory]
    while stack:
        current = stack.pop()
        for entry in sorted(os.scandir(current), key=lambda e: e.name):
            rel = entry.path[len(str(source_root)) + 1:].replace(os.sep, "/")
            if entry.is_symlink():
                raise Refused(f"symlink inside a whitelisted directory: {rel}")
            if entry.is_dir(follow_symlinks=False):
                if entry.name in SKIP_DIR_NAMES:
                    continue
                if entry.name in DENIED_SEGMENT_NAMES:
                    continue
                stack.append(entry.path)
            elif entry.is_file(follow_symlinks=False):
                if entry.name in DENIED_FILE_NAMES:
                    raise Refused(f"secret-looking file name inside a whitelisted tree: {rel}")
                hit = segment_is_denied(rel)
                if hit:
                    raise Refused(f"private segment '{hit}' inside a whitelisted tree: {rel}")
                found.append(rel)
            else:
                raise Refused(f"non-regular entry inside a whitelisted directory: {rel}")
    return found


MAX_FILE_BYTES = 8 * 1024 * 1024


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source-root", required=True, help="the FitPlate checkout to read (read-only)")
    parser.add_argument("--target", required=True, help="NEW zip path to write (must not exist)")
    parser.add_argument("--manifest-out", help="optional path for the per-file manifest json (must not exist)")
    parser.add_argument("--prep-root", help="this preparation directory (for README/packer/configurator mapping)")
    args = parser.parse_args()

    for raw in [args.source_root, args.target, args.manifest_out, args.prep_root]:
        if raw and ".." in Path(raw).parts: raise Refused("parent traversal is not accepted")
    source_root = Path(args.source_root)
    if not source_root.is_absolute():
        source_root = Path(os.path.abspath(source_root))
    walk_chain_no_symlink(source_root, "source-root", must_exist=True)
    source_root = source_root.resolve()
    if not source_root.is_dir():
        print(f"REFUSED: source root is not a directory: {source_root}", file=sys.stderr)
        return 2

    target = Path(os.path.abspath(args.target))
    manifest_out = Path(os.path.abspath(args.manifest_out)) if args.manifest_out else None
    # Validate ALL outputs BEFORE writing anything (round2 fix: no side effects after refusal).
    validate_targets(source_root, target, manifest_out)

    prep_root = Path(os.path.abspath(args.prep_root)) if args.prep_root else None
    if prep_root is not None:
        walk_chain_no_symlink(prep_root, "prep-root", must_exist=True)

    entries: dict[str, dict] = {}

    def add(rel: str, data: bytes) -> None:
        hit = segment_is_denied(rel)
        if hit:
            raise Refused(f"private segment '{hit}' in whitelist entry: {rel}")
        if len(data) > MAX_FILE_BYTES:
            raise Refused(f"file exceeds the {MAX_FILE_BYTES}-byte cap: {rel}")
        if rel in entries:
            raise Refused(f"duplicate whitelist entry: {rel}")
        entries[rel] = {"bytes": len(data), "sha256": sha256_bytes(data), "_data": data}

    def add_from(root: Path, rel: str) -> None:
        path = resolve_inside(root, rel)
        add(rel, path.read_bytes())

    # 1. required single files
    for rel in REQUIRED_FILES:
        add_from(source_root, rel)
    # 2. required directories (built client assets included as REQUIRED)
    for rel_dir in REQUIRED_DIRS:
        base = resolve_inside(source_root, rel_dir, expect_dir=True)
        for rel in collect_tree(source_root, base):
            add_from(source_root, rel)
    # 3. scripts whitelist
    for rel in SCRIPTS_WHITELIST:
        add_from(source_root, rel)
    # 4. preparation deliverables (explicit mapping into the package)
    if prep_root is not None:
        for src_rel, zip_rel in PREP_MAPPINGS:
            path = resolve_inside(prep_root, src_rel)
            add(zip_rel, path.read_bytes())
    else:
        raise Refused("--prep-root is required so the package ships its own README/packer/configurator")

    # Required entries that come from directory walks (not the single-file list) are
    # asserted here so their absence is a hard error, never a silent gap.
    for must in ["plugin/src/report-facts.d.mts",
                 "plugin/extensions/main/client/index.js",
                 "plugin/extensions/main/client/index.css",
                 "plugin/extensions/main/client/build-manifest.json"]:
        if must not in entries:
            raise Refused(f"required file missing from the package: {must}")

    manifest = {
        "kind": "fitplate-public-reproduction-source",
        "source_root": ".",
        "file_count": len(entries),
        "total_bytes": sum(row["bytes"] for row in entries.values()),
        "files": [
            {"file": rel, "bytes": entries[rel]["bytes"], "sha256": entries[rel]["sha256"]}
            for rel in sorted(entries)
        ],
        "included_built_client_assets": True,
        "built_assets_note": "plugin/extensions/main/client shipped byte-identical; an optional rebuild may produce a NEW package identity",
        "skip_dir_names": sorted(SKIP_DIR_NAMES),
        "denied_file_names": sorted(DENIED_FILE_NAMES),
        "note": "whitelist-only pack; no tests/runs/workspaces/evaluation/private material",
    }

    # Stage complete artifacts, then publish with exclusive hard links. A competing
    # creator is never overwritten or removed; rollback only this process own inode.
    target.parent.mkdir(parents=True, exist_ok=True)
    if manifest_out is not None:
        manifest_out.parent.mkdir(parents=True, exist_ok=True)
    temporary = []
    published = []
    manifest_bytes = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf8")
    try:
        fd, zip_temp = tempfile.mkstemp(prefix=".fitplate-pack-", dir=target.parent)
        os.close(fd); temporary.append(Path(zip_temp))
        with zipfile.ZipFile(zip_temp, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for rel in sorted(entries):
                info = zipfile.ZipInfo(rel, date_time=(2026, 1, 1, 0, 0, 0))
                info.external_attr = 0o644 << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                zf.writestr(info, entries[rel]["_data"])
            zf.writestr("pack-manifest.json", manifest_bytes)
        stages = [(Path(zip_temp), target)]
        if manifest_out is not None:
            fd, manifest_temp = tempfile.mkstemp(prefix=".fitplate-manifest-", dir=manifest_out.parent)
            with os.fdopen(fd, "wb") as handle: handle.write(manifest_bytes)
            temporary.append(Path(manifest_temp)); stages.append((Path(manifest_temp), manifest_out))
        # Recheck ancestors immediately before publishing; does not claim to be a hostile-filesystem sandbox.
        validate_targets(source_root, target, manifest_out)
        for staged, output in stages:
            os.link(staged, output, follow_symlinks=False)
            published.append((output, os.stat(staged)))
    except BaseException:
        for output, owner in published:
            try:
                live = os.lstat(output)
                if (live.st_dev, live.st_ino) == (owner.st_dev, owner.st_ino): output.unlink()
            except FileNotFoundError: pass
        raise
    finally:
        for staged in temporary: staged.unlink(missing_ok=True)
    print(json.dumps({"files": manifest["file_count"], "bytes": manifest["total_bytes"], "target": str(target), "manifest": str(manifest_out) if manifest_out else None}, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Refused as error:
        print(f"REFUSED: {error}", file=sys.stderr)
        sys.exit(3)
    except OSError as error:
        print(f"IO ERROR: {error}", file=sys.stderr)
        sys.exit(4)
