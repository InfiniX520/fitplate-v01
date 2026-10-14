"""Atomic, non-overwriting directory publish (plan section 10.3).

The build and export commands write a complete candidate/export into a private
temporary sibling and then move it into place. "Move it into place" must never
overwrite a version that is already there - and on POSIX a plain ``rename(2)``
*can* replace an existing **empty** directory, so an ``exists()`` check followed
by ``os.rename`` has a real race: two builders that both pass the check, with
the loser's empty or just-created target directory in the way, would let the
second rename silently replace the first one's version.

The guard therefore lives at the lowest level, where every writer shares it:

1. primary: ``renameat2(..., RENAME_NOREPLACE)`` on Linux - the kernel refuses
   atomically when the target exists, whatever its type or emptiness;
2. fallback (older kernels, filesystems without the flag): an exclusive
   ``flock`` on the *parent directory* (no lock files are left behind, and
   nothing foreign is ever scanned or deleted) followed by a re-check of the
   target and a plain rename.

Both paths raise :class:`FileExistsError` when the destination exists, and
neither path ever removes or inspects anything other than its own source
directory. Only the directory entry is touched; a caller that fails keeps its
temporary directory (the caller's ``finally`` cleans its own).
"""

from __future__ import annotations

import ctypes
import errno
import fcntl
import os
from pathlib import Path

#: ``renameat2`` flag: fail if the destination exists (Linux 3.15+).
RENAME_NOREPLACE = 1
_AT_FDCWD = -100
#: Errors that mean "this kernel/filesystem cannot do RENAME_NOREPLACE", not
#: "the rename was refused". Anything else propagates as a real error.
_UNSUPPORTED_ERRNOS = frozenset({errno.ENOSYS, errno.EINVAL, errno.ENOTSUP, getattr(errno, "EOPNOTSUPP", errno.ENOTSUP)})

_renameat2 = None
_renameat2_checked = False


def _libc_renameat2():
    """The libc ``renameat2`` symbol, or ``None`` when unavailable."""
    global _renameat2, _renameat2_checked
    if not _renameat2_checked:
        _renameat2_checked = True
        try:
            libc = ctypes.CDLL(None, use_errno=True)
            function = getattr(libc, "renameat2", None)
        except (OSError, AttributeError):  # pragma: no cover - defensive
            function = None
        if function is not None:
            function.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
            function.restype = ctypes.c_int
        _renameat2 = function
    return _renameat2


def _path_exists(path: Path) -> bool:
    """Existence as reported for the directory entry (symlinks count)."""
    return os.path.lexists(path)


def _rename_noreplace(source: Path, destination: Path) -> bool:
    """Try ``renameat2(RENAME_NOREPLACE)``.

    Returns ``True`` when the rename happened, ``False`` when the kernel or the
    filesystem does not support the flag (the caller falls back). Raises
    :class:`FileExistsError` when the destination exists and ``OSError`` for any
    other failure.
    """
    function = _libc_renameat2()
    if function is None:
        return False
    result = function(
        _AT_FDCWD,
        os.fsencode(source),
        _AT_FDCWD,
        os.fsencode(destination),
        RENAME_NOREPLACE,
    )
    if result == 0:
        return True
    error = ctypes.get_errno()
    if error == errno.EEXIST:
        raise FileExistsError(errno.EEXIST, os.strerror(errno.EEXIST), str(destination))
    if error in _UNSUPPORTED_ERRNOS:
        return False
    raise OSError(error, os.strerror(error), str(destination))


def _rename_under_parent_lock(source: Path, destination: Path) -> None:
    """Serialise publishers on the parent directory, then rename without overwrite.

    ``flock`` on the parent directory is advisory and shared by every writer
    that goes through this module; after acquiring it the target is re-checked,
    which closes the race the plain ``exists()`` pre-check leaves open. No lock
    file is created, so nothing has to be cleaned up later.
    """
    flags = os.O_RDONLY
    if hasattr(os, "O_DIRECTORY"):  # POSIX; the platform guard above is Linux-first
        flags |= os.O_DIRECTORY
    descriptor = os.open(destination.parent, flags)
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX)
        try:
            if _path_exists(destination):
                raise FileExistsError(errno.EEXIST, os.strerror(errno.EEXIST), str(destination))
            os.rename(source, destination)
        finally:
            fcntl.flock(descriptor, fcntl.LOCK_UN)
    finally:
        os.close(descriptor)


def publish_directory_noreplace(source: str | Path, destination: str | Path) -> None:
    """Move ``source`` to ``destination`` atomically, refusing to replace anything.

    Raises :class:`FileExistsError` when ``destination`` already exists - even
    when it is an empty directory, which a plain rename would replace.
    """
    source = Path(source)
    destination = Path(destination)
    if _rename_noreplace(source, destination):
        return
    _rename_under_parent_lock(source, destination)
