// P02-04 spike: the FitPlate input projection.
//
// The projection folds the *real user messages* of the session this row runs in (Plan02 §4): a
// bounded, versioned request payload (`FITPLATE-REQ/1` marker + one JSON object) and the user's
// confirmation of a draft. Design rules, from the Plan and the host contract:
//
//   * only `user/message` events feed it - the capability declares `inputEventTypes`
//     (`['user/message']`), the host adapter filters by event type before `apply`, and `apply`
//     itself re-checks the type defensively;
//   * harness-internal notices ride the same event type with `data.kind === 'runtime_context'`
//     (see the harness's own projection code) - they are dropped here and never become a request
//     or a confirmation;
//   * every accepted payload records the real event sequence number and a SHA-256 of the exact
//     payload text, so a later commit tool can bind to the user's own words instead of trusting
//     tool arguments (a model cannot fabricate a confirmation: `confirmed:true` inside a message
//     is only *recorded as claimed*, and a confirmation only exists when a real user message
//     carries the matching request_revision + draft_hash);
//   * an older revision (STALE_REVISION), an unknown request, a wrong hash, or a same-revision
//     content change without a revision bump (CONTENT_CHANGED_WITHOUT_REVISION) is rejected with a
//     reason code; a newer request_revision supersedes the draft and invalidates old confirmations,
//     and `findValidConfirmation` only resolves a selector that matches the CURRENT revision+hash
//     (a confirmed revision 1 can never be replayed after revision 2 was confirmed);
//   * `draft_hash` / `fields_hash` here is the digest of the raw *user fields* of one revision,
//     not an AI ConstraintDraft; the future compiler must register the model's propose output
//     through the program and hash that - model prose and tool arguments are never a confirmation.
//
// The state is a plain JSON value validated by the host against `stateSchema` on every change, and
// `apply` returns the same state reference whenever nothing changed (the core refuses a new
// reference whose canonical content is unchanged).

import { createHash } from 'node:crypto'

export const INPUT_PROJECTION_NAME = 'fitplate.input'
export const INPUT_PROJECTION_STATE_VERSION = 1
export const INPUT_PROJECTION_MAX_STATE_BYTES = 65536
export const INPUT_PROJECTION_EVENT_TYPES = Object.freeze(['user/message'])
export const SPEC_PAYLOAD_MARKER = 'FITPLATE-REQ/1'
export const SPEC_SCHEMA_VERSION = '1'

const REQUEST_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,40}$/
const MAX_FIELDS = 32
const MAX_FIELD_TEXT = 256

const sha256Hex = (text) => createHash('sha256').update(text, 'utf8').digest('hex')

/** Canonical JSON for hashing: keys sorted, no whitespace, JSON data only. */
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
}

export const contentSha256 = (text) => sha256Hex(String(text ?? ''))

/**
 * SHA-256 over the canonical {request_id, request_revision, fields} triple.
 *
 * This is the digest of the *raw user fields* of one request revision - NOT the hash of an AI
 * ConstraintDraft (this spike has no compiler yet). The future commit flow must register the
 * model's `propose_constraints` output as the draft through the program and hash *that*; until
 * then the payload's `draft_hash` selector means exactly this user-fields digest, and nothing
 * may present it as a verified AI proposal.
 */
export function requestFieldsDigest({ request_id, request_revision, fields }) {
  return sha256Hex(canonicalJson({ request_id, request_revision, fields }))
}

/** Text of one content-block array from a `user/message` event (`[{type:'text',text}]`). */
export function messageText(data) {
  const parts = Array.isArray(data?.content) ? data.content : []
  return parts
    .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
}

/**
 * The user payload inside one message, or null. The marker must start its own line; the JSON is
 * the rest of that line (single-line payload), so the surrounding prose can never smuggle fields.
 */
export function parseSpecPayload(text) {
  const lines = String(text ?? '').split('\n')
  const index = lines.findIndex((line) => line.trim() === SPEC_PAYLOAD_MARKER)
  if (index === -1) return null
  const body = (lines[index + 1] ?? '').trim()
  let raw
  try {
    raw = JSON.parse(body)
  } catch {
    return { ok: false, error: 'MALFORMED_JSON' }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'MALFORMED_PAYLOAD' }
  if (raw.schema_version !== SPEC_SCHEMA_VERSION) return { ok: false, error: 'UNSUPPORTED_SCHEMA_VERSION' }
  if (typeof raw.request_id !== 'string' || !REQUEST_ID_PATTERN.test(raw.request_id)) return { ok: false, error: 'INVALID_REQUEST_ID' }
  if (!Number.isSafeInteger(raw.request_revision) || raw.request_revision < 1) return { ok: false, error: 'INVALID_REVISION' }
  if (raw.kind !== 'spec_request' && raw.kind !== 'confirmation') return { ok: false, error: 'INVALID_KIND' }
  if (raw.kind === 'confirmation') {
    if (typeof raw.draft_hash !== 'string' || !/^[0-9a-f]{64}$/.test(raw.draft_hash)) return { ok: false, error: 'MISSING_DRAFT_HASH' }
    return {
      ok: true,
      payload: { kind: 'confirmation', request_id: raw.request_id, request_revision: raw.request_revision, draft_hash: raw.draft_hash, claimed_confirmed: raw.confirmed === true },
    }
  }
  const fields = raw.fields ?? {}
  if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) return { ok: false, error: 'INVALID_FIELDS' }
  const keys = Object.keys(fields)
  if (keys.length > MAX_FIELDS) return { ok: false, error: 'TOO_MANY_FIELDS' }
  for (const key of keys) {
    const value = fields[key]
    const okValue = (typeof value === 'string' && value.length <= MAX_FIELD_TEXT) || (typeof value === 'number' && Number.isFinite(value)) || typeof value === 'boolean' || value === null
    if (!okValue) return { ok: false, error: 'INVALID_FIELD_VALUE' }
  }
  return {
    ok: true,
    payload: { kind: 'spec_request', request_id: raw.request_id, request_revision: raw.request_revision, fields: { ...fields }, claimed_confirmed: raw.confirmed === true },
  }
}

/**
 * One real user event as projection evidence, or null when the event is not a genuine user
 * message carrying our payload. Runtime-context notices and every non-user event are refused here
 * even if a caller bypasses the capability filter.
 */
export function inputEventRecord(event) {
  if (!event || event.type !== 'user/message') return null
  const data = event.data
  if (!data || typeof data !== 'object') return null
  if (data.kind === 'runtime_context') return null
  const text = messageText(data)
  if (!text.trim()) return null
  const parsed = parseSpecPayload(text)
  if (!parsed) return null
  return {
    seq: Number.isSafeInteger(event.seq) ? event.seq : null,
    sha256: contentSha256(text),
    ...(parsed.ok ? { payload: parsed.payload } : { payload: null, error: parsed.error }),
  }
}

export function initialState() {
  return { version: 1, user_messages: 0, last_user: null, requests: {}, confirmations: [], rejected: [], invalid: 0 }
}

function changed(state, next) {
  return canonicalJson(next) === canonicalJson(state) ? state : next
}

/**
 * Fold one event into the state. Returns the same reference when nothing changed (the host core
 * rejects a new reference with unchanged canonical content).
 */
export function applyInputProjection(state, event) {
  const record = inputEventRecord(event)
  if (!record) return state
  const base = {
    ...state,
    user_messages: state.user_messages + 1,
    last_user: { seq: record.seq, sha256: record.sha256, has_payload: record.payload !== null },
  }
  if (record.payload === null) {
    return changed(state, { ...base, invalid: (state.invalid ?? 0) + 1 })
  }
  const payload = record.payload
  if (payload.kind === 'spec_request') {
    const previous = state.requests[payload.request_id] ?? null
    if (previous && payload.request_revision < previous.request_revision) {
      return changed(state, { ...base, rejected: [...state.rejected, { reason: 'STALE_REVISION', request_id: payload.request_id, request_revision: payload.request_revision, seq: record.seq }] })
    }
    const fields_hash = requestFieldsDigest({ request_id: payload.request_id, request_revision: payload.request_revision, fields: payload.fields })
    if (previous && previous.request_revision === payload.request_revision && previous.fields_hash === fields_hash) {
      return changed(state, base) // idempotent re-send: nothing but the counter moves
    }
    if (previous && previous.request_revision === payload.request_revision) {
      // Plan02 §4.2: changed input means a NEW request_revision. Re-using the revision with
      // different fields would silently invalidate whatever the user confirmed, so it is refused
      // and the existing draft - and any confirmation of it - stays exactly as it was.
      return changed(state, {
        ...base,
        rejected: [...state.rejected, { reason: 'CONTENT_CHANGED_WITHOUT_REVISION', request_id: payload.request_id, request_revision: payload.request_revision, seq: record.seq }],
      })
    }
    return changed(state, {
      ...base,
      requests: {
        ...state.requests,
        [payload.request_id]: {
          request_id: payload.request_id,
          request_revision: payload.request_revision,
          fields: payload.fields,
          fields_hash,
          status: 'draft',
          source: { seq: record.seq, sha256: record.sha256 },
        },
      },
    })
  }
  // confirmation
  const request = state.requests[payload.request_id] ?? null
  const reason = !request
    ? 'UNKNOWN_REQUEST'
    : payload.request_revision !== request.request_revision
      ? 'REVISION_MISMATCH'
      : payload.draft_hash !== request.fields_hash
        ? 'HASH_MISMATCH'
        : null
  if (reason) {
    return changed(state, { ...base, rejected: [...state.rejected, { reason, request_id: payload.request_id, request_revision: payload.request_revision, seq: record.seq }] })
  }
  const already = state.confirmations.find((item) => item.request_id === payload.request_id && item.request_revision === payload.request_revision && item.draft_hash === payload.draft_hash)
  if (already) return changed(state, base)
  return changed(state, {
    ...base,
    requests: {
      ...state.requests,
      [payload.request_id]: { ...request, status: 'confirmed' },
    },
    confirmations: [...state.confirmations, { request_id: payload.request_id, request_revision: payload.request_revision, draft_hash: payload.draft_hash, claimed_confirmed: payload.claimed_confirmed, seq: record.seq, sha256: record.sha256 }],
  })
}

/**
 * The commit-side check: a confirmation only exists when a *real user message* carried the exact
 * request_revision + draft_hash of the draft the projection itself folded. Tool arguments are only
 * a selector; the facts come from the projection state.
 *
 * The selector must match the *current* draft of the request: after the user confirmed revision 1
 * and then proposed+confirmed revision 2, an old selector (revision 1 + its old hash) must NOT
 * resolve - the current request_revision and fields_hash are checked before the historical
 * confirmation entry is even looked up.
 */
export function findValidConfirmation(state, { request_id, request_revision, draft_hash }) {
  if (!state || typeof state !== 'object') return null
  const request = state.requests?.[request_id] ?? null
  if (!request || request.status !== 'confirmed') return null
  if (request.request_revision !== request_revision || request.fields_hash !== draft_hash) return null
  return (
    (state.confirmations ?? []).find(
      (item) => item.request_id === request_id && item.request_revision === request_revision && item.draft_hash === draft_hash && Number.isSafeInteger(item.seq),
    ) ?? null
  )
}

/** The projection definition a verified plugin row registers through `ctx.projections.register`. */
export function createInputProjectionDef() {
  return {
    name: INPUT_PROJECTION_NAME,
    stateVersion: INPUT_PROJECTION_STATE_VERSION,
    inputEventTypes: [...INPUT_PROJECTION_EVENT_TYPES],
    maxStateBytes: INPUT_PROJECTION_MAX_STATE_BYTES,
    stateSchema: {
      type: 'object',
      required: ['version', 'user_messages', 'last_user', 'requests', 'confirmations', 'rejected', 'invalid'],
      additionalProperties: false,
      properties: {
        version: { type: 'integer', minimum: 1 },
        user_messages: { type: 'integer', minimum: 0 },
        last_user: {
          type: ['object', 'null'],
          additionalProperties: false,
          required: ['seq', 'sha256', 'has_payload'],
          properties: {
            seq: { type: ['integer', 'null'] },
            sha256: { type: 'string' },
            has_payload: { type: 'boolean' },
          },
        },
        requests: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            required: ['request_id', 'request_revision', 'fields', 'fields_hash', 'status', 'source'],
            additionalProperties: false,
            properties: {
              request_id: { type: 'string' },
              request_revision: { type: 'integer', minimum: 1 },
              fields: { type: 'object' },
              fields_hash: { type: 'string' },
              status: { type: 'string', enum: ['draft', 'confirmed'] },
              source: {
                type: 'object',
                required: ['seq', 'sha256'],
                additionalProperties: false,
                properties: { seq: { type: ['integer', 'null'] }, sha256: { type: 'string' } },
              },
            },
          },
        },
        confirmations: {
          type: 'array',
          items: {
            type: 'object',
            required: ['request_id', 'request_revision', 'draft_hash', 'claimed_confirmed', 'seq', 'sha256'],
            additionalProperties: false,
            properties: {
              request_id: { type: 'string' },
              request_revision: { type: 'integer', minimum: 1 },
              draft_hash: { type: 'string' },
              claimed_confirmed: { type: 'boolean' },
              seq: { type: ['integer', 'null'] },
              sha256: { type: 'string' },
            },
          },
        },
        rejected: {
          type: 'array',
          items: {
            type: 'object',
            required: ['reason', 'request_id', 'request_revision', 'seq'],
            additionalProperties: false,
            properties: {
              reason: { type: 'string' },
              request_id: { type: 'string' },
              request_revision: { type: 'integer' },
              seq: { type: ['integer', 'null'] },
            },
          },
        },
        invalid: { type: 'integer', minimum: 0 },
      },
    },
    init: initialState,
    apply: applyInputProjection,
    view: (state) => state,
  }
}

/**
 * Read this row's own projection through the host-injected reader. The reader is owner-bound and
 * session-bound in the real host; every failure is reported as the host's own `unavailable`
 * shape - never guessed data.
 */
export async function readOwnInputProjection(projections) {
  if (!projections || typeof projections.readOwn !== 'function') {
    return { status: 'unavailable', name: INPUT_PROJECTION_NAME, error: { code: 'E_PROJECTION_STATE', safeMessage: 'no projection reader in this context' } }
  }
  try {
    return await projections.readOwn(INPUT_PROJECTION_NAME)
  } catch (error) {
    return { status: 'unavailable', name: INPUT_PROJECTION_NAME, error: { code: 'E_PROJECTION_STATE', safeMessage: String(error?.message ?? error).slice(0, 200) } }
  }
}

/** Minimal non-secret summary of one readOwn result, for tool results and probe output. */
export function summarizeProjectionRead(result) {
  if (!result || result.status !== 'available') {
    return { status: 'unavailable', error_code: result?.error?.code ?? 'E_PROJECTION_STATE', safe_message: result?.error?.safeMessage ?? 'projection unavailable' }
  }
  const value = result.value ?? {}
  const requests = Object.values(value.requests ?? {})
  return {
    status: 'available',
    as_of_seq: result.asOfSeq ?? null,
    state_version: result.stateVersion ?? null,
    user_messages: value.user_messages ?? null,
    last_user_seq: value.last_user?.seq ?? null,
    last_user_sha256: value.last_user?.sha256 ?? null,
    requests: requests.map((request) => ({ request_id: request.request_id, request_revision: request.request_revision, status: request.status, source_seq: request.source?.seq ?? null })),
    confirmations: (value.confirmations ?? []).map((item) => ({ request_id: item.request_id, request_revision: item.request_revision, seq: item.seq })),
    rejected: (value.rejected ?? []).map((item) => ({ reason: item.reason, request_id: item.request_id, seq: item.seq })),
  }
}
