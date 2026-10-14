// P02-05 intake transport: read the current user's request/confirmation attachments from the
// Host's own session reader - never from model arguments.
//
// The Plan02 §4.3 fallback route rides the official `file` content blocks of real `user/message`
// events; the core implements the reader (`packages/core/src/request/session-files.ts`) and hands
// every tool `tctx.session.readAttachment`. This module only *selects and verifies*:
//
//   * the listing is paged with the official `offset` continuation (`[… with offset=N to continue]`)
//     and must finish; an unfinished listing fails closed instead of silently falling back to an
//     older attachment;
//   * selection is by (event seq, block index) - the newest real request wins; the listing order
//     and the caller's own selector are never trusted. The newest *same-name* attachment is
//     selected first and its mime checked second: a wrong mime on the newest is an explicit,
//     typed refusal - never a silent fallback to an older legal file (that would resurrect a
//     superseded draft). Every integer that enters selection or paging (listing ordinal/seq/index,
//     continuation offsets, reference seq/index) must round-trip as an exact positive safe
//     integer, so no rounded or Infinite value can ever reach a comparison or the reader;
//   * bytes are read back through the same reader, strictly UTF-8 decoded, size-bounded, and the
//     SHA-256 is computed here from those bytes (never taken from the model);
//   * the confirmation document is a closed object whose every field must match the *program's*
//     current request/draft/raw-bytes facts, and it must sit after the request it confirms.
//
// This file is new and NOT wired into the runtime yet; it is import-safe (no bridge, no disk, no
// network) and every failure is a typed, fail-closed error.

import { createHash } from 'node:crypto'

export const REQUEST_FILENAME = 'fitplate-request.json'
export const CONFIRMATION_FILENAME = 'fitplate-confirmation.json'
export const ATTACHMENT_MIME = 'application/json'
export const LIST_PATH = 'session-file://list'
/** A request/confirmation document is small, bounded JSON - anything larger fails closed. */
export const MAX_JSON_BYTES = 65536
export const LIST_PAGE_LIMIT = 100
export const LIST_PAGE_MAX_BYTES = 32768
export const MAX_LIST_PAGES = 64
export const MAX_ATTACHMENTS = 4096
export const CONFIRMATION_KIND = 'fitplate-confirmation'
export const CONFIRMATION_SCHEMA_VERSION = '1.0'
export const REF_PATTERN = /^session-file:\/\/([1-9][0-9]*)\/([1-9][0-9]*)$/
export const HEX64_PATTERN = /^[0-9a-f]{64}$/

const REQUEST_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,40}$/
const LIST_LINE_PATTERN = /^([1-9][0-9]*)\. session-file:\/\/([1-9][0-9]*)\/([1-9][0-9]*) ("(?:[^"\\]|\\.)*") \(([^()]*)\)$/
const LIST_CONTINUE_PATTERN = /^\[read session-file:\/\/list with offset=([1-9][0-9]*) to continue\]$/
const LIST_EMPTY_LINE = 'No attachments at this offset.'

export class IntakeAttachmentError extends Error {
  constructor(code, message, detail) {
    super(message)
    this.name = 'IntakeAttachmentError'
    this.code = code
    this.detail = detail ?? null
  }
}

const fail = (code, message, detail) => {
  throw new IntakeAttachmentError(code, message, detail)
}

/**
 * Every integer read out of the listing or a session-file reference must be an *exact* positive
 * safe integer. `Number()` silently rounds digit strings past 2^53-1 (`…993` becomes `…992`, a
 * different attachment) and turns a long enough one into Infinity; either could select the wrong
 * attachment or poison a page cursor. A digit string is therefore accepted only when it
 * round-trips verbatim, and anything else fails closed with the caller's code.
 */
function parseSafeCount(digits, what, code) {
  const value = Number(digits)
  if (!Number.isSafeInteger(value) || value < 1 || String(value) !== digits) {
    fail(code, `${what} ${JSON.stringify(digits)} is not a safe positive integer`)
  }
  return value
}

export const sha256Hex = (bytes) => createHash('sha256').update(bytes).digest('hex')

/** Strict UTF-8: a single invalid byte sequence fails closed instead of producing replacement chars. */
export function decodeUtf8Strict(bytes, what) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    fail('UTF8_DECODE_FAILED', `${what} is not valid UTF-8`)
  }
}

/**
 * Parse one listing page. The official format is one line per attachment
 * (`<ordinal>. session-file://<seq>/<index> "<json-escaped name>" (<mime>)`) optionally followed
 * by the continuation marker. Any other non-empty line fails closed: skipping it could hide the
 * newest attachment.
 */
export function parseAttachmentListPage(text) {
  const entries = []
  let nextOffset = null
  for (const rawLine of String(text).split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    if (line === LIST_EMPTY_LINE) continue
    const continuation = LIST_CONTINUE_PATTERN.exec(line)
    if (continuation) {
      nextOffset = parseSafeCount(continuation[1], 'the listing continuation offset', 'MALFORMED_LIST_PAGE')
      continue
    }
    const match = LIST_LINE_PATTERN.exec(line)
    if (!match) fail('MALFORMED_LIST_PAGE', `the attachment listing carries a line this reader cannot parse: ${line.slice(0, 120)}`)
    let name
    try {
      name = JSON.parse(match[4])
    } catch {
      fail('MALFORMED_LIST_PAGE', `the attachment listing carries an unescapable name: ${match[4].slice(0, 120)}`)
    }
    entries.push({
      ordinal: parseSafeCount(match[1], 'a listing ordinal', 'MALFORMED_LIST_PAGE'),
      seq: parseSafeCount(match[2], 'a listing seq', 'MALFORMED_LIST_PAGE'),
      index: parseSafeCount(match[3], 'a listing index', 'MALFORMED_LIST_PAGE'),
      name,
      mime: match[5],
    })
  }
  return { entries, nextOffset }
}

async function readListPage(reader, offset) {
  let found
  try {
    found = await reader({ path: LIST_PATH, offset, limit: LIST_PAGE_LIMIT, maxBytes: LIST_PAGE_MAX_BYTES })
  } catch (error) {
    fail('READER_ERROR', `the host attachment reader failed: ${String(error?.message ?? error).slice(0, 200)}`)
  }
  if (!found) fail('LIST_UNAVAILABLE', 'the host attachment reader returned no listing for this session/lane')
  return parseAttachmentListPage(decodeUtf8Strict(found.bytes, 'the attachment listing'))
}

/**
 * Page through the whole listing following the official continuation marker. An unfinished
 * listing (page cap, a marker that does not advance, too many entries) fails closed - the caller
 * must never silently fall back to an older attachment because the newest one was cut off.
 */
export async function listAllAttachments(reader, { maxPages = MAX_LIST_PAGES } = {}) {
  const entries = []
  let offset = 1
  let pages = 0
  for (;;) {
    const page = await readListPage(reader, offset)
    pages += 1
    entries.push(...page.entries)
    if (entries.length > MAX_ATTACHMENTS) {
      fail('INCOMPLETE_LISTING', `the attachment listing exceeds ${MAX_ATTACHMENTS} entries; refusing to guess which one is current`)
    }
    if (page.nextOffset === null) return { entries, pages }
    if (page.nextOffset <= offset) {
      fail('LIST_NOT_ADVANCING', `the listing continuation did not advance (offset ${page.nextOffset} after ${offset})`)
    }
    if (pages >= maxPages) {
      fail('INCOMPLETE_LISTING', `the attachment listing did not finish within ${maxPages} pages; refusing to guess`)
    }
    offset = page.nextOffset
  }
}

/**
 * The newest attachment with this exact name, by (event seq, block index) - never by listing
 * order. Selection happens *before* the mime check: a newest same-name attachment whose mime is
 * not `mime` is an explicit typed refusal, never a silent fallback to an older legal file (a mime
 * pre-filter would ignore the newest input and resurrect a superseded draft). Returns null only
 * when no attachment carries this name.
 */
export function selectLatestAttachment(entries, filename, mime = ATTACHMENT_MIME) {
  let best = null
  for (const entry of entries) {
    if (entry.name !== filename) continue
    if (best === null || entry.seq > best.seq || (entry.seq === best.seq && entry.index > best.index)) best = entry
  }
  if (best === null) return null
  if (best.mime !== mime) {
    fail(
      'ATTACHMENT_MIME_INVALID',
      `the newest ${filename} (session-file://${best.seq}/${best.index}) is ${JSON.stringify(best.mime)}, not ${mime}; refusing to fall back to an older attachment`,
    )
  }
  return best
}

/** Read one already-listed attachment and verify the bytes the reader actually returned. */
export async function readAttachmentJson(reader, entry) {
  // Local invariant at the entry -> reader boundary: whatever produced this entry, the ref built
  // from these numbers must name the same attachment the caller means - never a rounded one.
  for (const field of ['seq', 'index']) {
    const value = entry?.[field]
    if (!Number.isSafeInteger(value) || value < 1) {
      fail('REF_OUT_OF_RANGE', `the attachment ${field} ${JSON.stringify(value)} is not a safe positive integer`)
    }
  }
  const ref = `session-file://${entry.seq}/${entry.index}`
  let found
  try {
    found = await reader({ path: ref, maxBytes: MAX_JSON_BYTES + 1 })
  } catch (error) {
    fail('READER_ERROR', `the host attachment reader failed for ${ref}: ${String(error?.message ?? error).slice(0, 200)}`)
  }
  if (!found) fail('ATTACHMENT_NOT_FOUND', `${ref} is not readable in this session/lane`)
  if (found.name !== entry.name || found.mimeType !== entry.mime) {
    fail('ATTACHMENT_IDENTITY_MISMATCH', `${ref} answered as ${JSON.stringify(found.name)} (${found.mimeType}), not ${JSON.stringify(entry.name)} (${entry.mime})`)
  }
  const bytes = Buffer.from(found.bytes)
  if (bytes.byteLength > MAX_JSON_BYTES) {
    fail('ATTACHMENT_TOO_LARGE', `${ref} is ${bytes.byteLength} bytes; the ${MAX_JSON_BYTES}-byte intake limit fails closed`)
  }
  const text = decodeUtf8Strict(bytes, ref)
  let json
  try {
    json = JSON.parse(text)
  } catch {
    fail('MALFORMED_JSON', `${ref} is not valid JSON`)
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) fail('MALFORMED_JSON', `${ref} is not a JSON object`)
  return { ref, seq: entry.seq, index: entry.index, name: entry.name, mimeType: entry.mime, bytes, sha256: sha256Hex(bytes), json }
}

/** Read one attachment by a caller-named reference (the confirmation path), from the real reader only. */
export async function readAttachmentJsonByRef(reader, ref, { expectedName }) {
  const match = REF_PATTERN.exec(String(ref))
  if (!match) fail('REF_INVALID', `${JSON.stringify(ref)} is not a session-file://<seq>/<index> reference`)
  // The digits must be exact safe positive integers BEFORE the reader is called: a rounded
  // conversion (`…993` -> `…992`) would ask the Host for a different attachment than the caller
  // named, so an out-of-range reference fails closed and the reader is never invoked.
  const seq = parseSafeCount(match[1], 'the reference seq', 'REF_OUT_OF_RANGE')
  const index = parseSafeCount(match[2], 'the reference index', 'REF_OUT_OF_RANGE')
  const entry = { seq, index, name: expectedName, mime: ATTACHMENT_MIME }
  const read = await readAttachmentJson(reader, entry)
  if (read.name !== expectedName) fail('ATTACHMENT_IDENTITY_MISMATCH', `${ref} is not the expected ${expectedName}`)
  return read
}

/** The current request: newest `fitplate-request.json` in this session/lane, read and hashed here. */
export async function readLatestRequestAttachment(reader) {
  if (typeof reader !== 'function') fail('READ_ATTACHMENT_UNAVAILABLE', 'the Host exposes no session attachment reader to this tool')
  const { entries, pages } = await listAllAttachments(reader)
  const entry = selectLatestAttachment(entries, REQUEST_FILENAME)
  if (!entry) fail('REQUEST_ATTACHMENT_MISSING', `this session carries no ${REQUEST_FILENAME} attachment`)
  const read = await readAttachmentJson(reader, entry)
  return { ...read, listing_pages: pages, listing_entries: entries.length }
}

const CONFIRMATION_FIELDS = Object.freeze([
  'kind',
  'schema_version',
  'request_id',
  'request_revision',
  'draft_hash',
  'request_attachment_ref',
  'request_attachment_sha256',
])

/** The confirmation document is a closed object; every field is validated, nothing else is read. */
export function validateConfirmationDocument(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) fail('INVALID_CONFIRMATION', 'the confirmation attachment is not a JSON object')
  const keys = Object.keys(doc).sort()
  const expected = [...CONFIRMATION_FIELDS].sort()
  if (keys.length !== expected.length || keys.some((key, position) => key !== expected[position])) {
    const extra = keys.filter((key) => !CONFIRMATION_FIELDS.includes(key))
    const missing = CONFIRMATION_FIELDS.filter((key) => !keys.includes(key))
    fail('INVALID_CONFIRMATION', `the confirmation must carry exactly the closed field set (missing: ${missing.join(',') || '-'}; unexpected: ${extra.join(',') || '-'})`)
  }
  if (doc.kind !== CONFIRMATION_KIND) fail('INVALID_CONFIRMATION', `confirmation kind must be ${CONFIRMATION_KIND}`)
  if (doc.schema_version !== CONFIRMATION_SCHEMA_VERSION) fail('INVALID_CONFIRMATION', `confirmation schema_version must be ${CONFIRMATION_SCHEMA_VERSION}`)
  if (typeof doc.request_id !== 'string' || !REQUEST_ID_PATTERN.test(doc.request_id)) fail('INVALID_CONFIRMATION', 'confirmation request_id is not a safe request id')
  if (!Number.isSafeInteger(doc.request_revision) || doc.request_revision < 1) fail('INVALID_CONFIRMATION', 'confirmation request_revision must be a positive integer')
  if (typeof doc.draft_hash !== 'string' || !HEX64_PATTERN.test(doc.draft_hash)) fail('INVALID_CONFIRMATION', 'confirmation draft_hash must be a 64-hex digest')
  if (typeof doc.request_attachment_ref !== 'string' || !REF_PATTERN.test(doc.request_attachment_ref)) fail('INVALID_CONFIRMATION', 'confirmation request_attachment_ref is not a session-file reference')
  if (typeof doc.request_attachment_sha256 !== 'string' || !HEX64_PATTERN.test(doc.request_attachment_sha256)) fail('INVALID_CONFIRMATION', 'confirmation request_attachment_sha256 must be a 64-hex digest')
  return {
    kind: doc.kind,
    schema_version: doc.schema_version,
    request_id: doc.request_id,
    request_revision: doc.request_revision,
    draft_hash: doc.draft_hash,
    request_attachment_ref: doc.request_attachment_ref,
    request_attachment_sha256: doc.request_attachment_sha256,
  }
}

/**
 * Every confirmation field must match the *program's* current facts: the request the tool re-read
 * from the same session/lane, the raw bytes hash computed here, and (by the caller) the
 * deterministically compiled draft. The confirmation must also sit strictly after the request it
 * confirms. Model prose, a retyped summary or an in-request `confirmed:true` is never consulted.
 */
export function checkConfirmationBinding({ confirmation, confirmationRef, request }) {
  if (confirmation.request_id !== request.json.request_id) {
    fail('CONFIRMATION_REQUEST_MISMATCH', `the confirmation names request ${confirmation.request_id}, the current request is ${request.json.request_id}`)
  }
  if (confirmation.request_revision !== request.json.request_revision) {
    fail('CONFIRMATION_REVISION_MISMATCH', `the confirmation names revision ${confirmation.request_revision}, the current request is revision ${request.json.request_revision}`)
  }
  if (confirmation.request_attachment_ref !== request.ref) {
    fail('CONFIRMATION_REQUEST_REF_MISMATCH', `the confirmation names ${confirmation.request_attachment_ref}, the current request sits at ${request.ref}`)
  }
  if (confirmation.request_attachment_sha256 !== request.sha256) {
    fail('CONFIRMATION_REQUEST_HASH_MISMATCH', 'the confirmation was approved for different request bytes than the ones this tool just read')
  }
  const after = confirmationRef.seq > request.seq || (confirmationRef.seq === request.seq && confirmationRef.index > request.index)
  if (!after) {
    fail('CONFIRMATION_ORDER_INVALID', `the confirmation (${confirmationRef.seq}/${confirmationRef.index}) is not later than the request (${request.seq}/${request.index})`)
  }
  return true
}

/** The Host-owned scope: session key + lane. The tool-use id is attribution, never scope. */
export function makeSessionScope(session) {
  const key = typeof session?.key === 'string' ? session.key : ''
  const lane = typeof session?.lane === 'string' ? session.lane : ''
  if (!key || !lane) fail('SESSION_UNAVAILABLE', 'the Host did not provide a session key/lane; intake tools only run inside a session')
  return `${key}:${lane}`
}
