// P02-05 intake tools: the three native tool definitions the next package wires into the runtime.
//
//   * `fitplate_get_request`        read-only: the current session request attachment + the
//                                   program's deterministic compile (card identity + draft);
//   * `fitplate_propose_constraints` writes (staged): register that same deterministic draft with
//                                   the registry through the controlled bridge - the model cannot
//                                   inject or edit compiled values;
//   * `fitplate_commit_task`         writes (freeze): re-read the CURRENT request AND the user's
//                                   confirmation attachment, verify every binding against the
//                                   program's facts, then freeze through the bridge. Native
//                                   approval is the second gate; a per-draft approval scope stops a
//                                   cached session grant for an earlier draft from authorising this
//                                   one.
//
// Boundaries that matter:
//   * attachments come only from `tctx.session.readAttachment` (see intake-attachments.mjs); tool
//     arguments are selectors (refs/hashes), never content, never a receipt, never a session scope;
//   * the confirmation is a real, separate user attachment with a closed field set; a model-typed
//     `confirmed:true` or a retyped digest is never read;
//   * commit always RESCANS the session's attachments, so a newer request revision (even a
//     NEEDS_INPUT or broken one) invalidates an older draft even if get/propose were never called;
//   * the byte-identity anchor is the SHA-256 this code computes from the bytes the Host reader
//     returned - not any string the model supplied;
//   * the AI's job in this pipeline is to explain and clarify what the program compiled; it never
//     rewrites the compiler's facts, and this package does not claim any general language
//     understanding beyond the compiler's documented subset.
//
// The bridge contract (implemented by python_bridge.py since package 070, and reached through the
// controlled `callBridge`; an optional `text_proposals` list carries the verified proposals):
//
//   intake_compile_request          {request, text_proposals?}          -> {request_sha256, device_card:{id,sha256}, draft}
//   intake_stage_request            {request, draft_hash, attachment_sha256,
//                                    session_scope, attachment_ref?, text_proposals?}
//                                                                       -> {staged:{request_id,request_revision,draft_hash,outcome,...}}
//   intake_read_staged_compile      {request, attachment_sha256, session_scope}
//                                                                       -> {request_sha256, device_card:{id,sha256}, draft, text_proposals, staged}
//   intake_commit_task              {request, draft_hash, attachment_sha256,
//                                    session_scope, receipt, attachment_ref?}
//                                                                       -> {task_id, task_revision, manifest_id, idempotent, ...}
//
// These tools are registered into runtime.mjs by the same package; they follow the existing TypeBox
// / ToolMeta / callBridge / PluginError contracts.

import { createHash } from 'node:crypto'
import { USER_FLOW_GUIDANCE } from './user-guidance.mjs'

import { Kind, object, str } from './typebox.mjs'
import { BRIDGE_SCHEMA_VERSION, PluginError, businessRefusal, callBridge, executionError, sessionIdentity } from './run-store.mjs'
import { refusalResult } from './tools.mjs'
import {
  ATTACHMENT_MIME,
  CONFIRMATION_FILENAME,
  IntakeAttachmentError,
  MAX_JSON_BYTES,
  REQUEST_FILENAME,
  HEX64_PATTERN,
  REF_PATTERN,
  checkConfirmationBinding,
  makeSessionScope,
  readAttachmentJsonByRef,
  readLatestRequestAttachment,
  sha256Hex,
  validateConfirmationDocument,
} from './intake-attachments.mjs'

export const INTAKE_TOOL_NAMES = Object.freeze(['fitplate_get_request', 'fitplate_propose_constraints', 'fitplate_commit_task'])
export const STAGE_POLICY_VERSION = 'intake-stage:v2'
export const COMMIT_POLICY_VERSION = 'intake-commit:v1'
/** The approval-scope grammar the Host enforces (`APPROVAL_SCOPE_PATTERN` in the tool contract). */
const APPROVAL_SCOPE_PATTERN = /^[A-Za-z][A-Za-z0-9_.:-]{0,63}$/

const HEX64 = { pattern: `${HEX64_PATTERN.source}`, maxLength: 64 }
const REF = { pattern: `${REF_PATTERN.source}`, maxLength: 64 }

const text = (value) => [{ type: 'text', text: value }]

/**
 * The model consumes only `content.text` - the host forwards no `structured` payload to the
 * provider - so every program fact the next tool needs is emitted as one bounded JSON document:
 * refs, full SHA-256 digests, ids, revisions, the device card and the complete compiled draft
 * (proposals, missing fields, conflicts, unsupported features, feasibility). The facts are the
 * same ones the structured payload carries, generated from the real compile; nothing is guessed,
 * invented or reformatted into prose a model would have to re-parse. If the document would not
 * fit the cap the tool fails explicitly - the facts are shown whole or the caller is told they do
 * not fit, never truncated behind a completeness claim.
 */
const MAX_MODEL_TEXT_BYTES = 256 * 1024

function modelFacts(tool, document) {
  const body = `${JSON.stringify({ tool, ok: true, ...document }, null, 2)}\n`
  const bytes = Buffer.byteLength(body, 'utf8')
  if (bytes > MAX_MODEL_TEXT_BYTES) {
    // The code is repeated in the message because an execution error's text renders as
    // `<tool>: ERROR - <message>` (the structured code never reaches the model).
    throw executionError(
      'MODEL_TEXT_TOO_LARGE',
      `MODEL_TEXT_TOO_LARGE: ${tool}: the compiled facts need ${bytes} bytes, above the ${MAX_MODEL_TEXT_BYTES} byte model-visible cap`,
    )
  }
  return body
}

function okResult(tool, payload, contentBody) {
  return { content: text(contentBody), structured: { schema_version: BRIDGE_SCHEMA_VERSION, tool, ok: true, ...payload } }
}

/**
 * Business refusals render through the shared refusalResult (status line + whitelisted detail
 * lines); its structured payload - invisible to the model - is the only place the code appears,
 * so append the exact code to the model-visible text as well. The append is idempotent and adds
 * no facts of its own.
 */
function withRefusalCode(result, code) {
  if (typeof code !== 'string' || code.length === 0) return result
  const line = `code: ${code}`
  return {
    ...result,
    content: result.content.map((item) =>
      item.type === 'text' && typeof item.text === 'string' && !item.text.split('\n').includes(line)
        ? { ...item, text: `${item.text}\n${line}` }
        : item,
    ),
  }
}

/** A business refusal in the plugin's existing shape (status/code/message, isError stays false). */
function refusal(tool, code, message, { status = 'INVALID_SPEC', detail } = {}) {
  const error = businessRefusal(code, message, { status, ...(detail !== undefined ? { detail } : {}) })
  return withRefusalCode(refusalResult(tool, error), error.code)
}

/** An execution failure in the plugin's existing shape (isError true, status ERROR). */
function executionFailure(tool, code, message, detail) {
  const error = executionError(code, message, detail !== undefined ? { detail } : {})
  return { isError: true, ...refusalResult(tool, error) }
}

const ATTACHMENT_STATUS = Object.freeze({
  REQUEST_ATTACHMENT_MISSING: 'STALE_INPUT',
  // The newest same-name attachment has the wrong mime: the pipeline's input was superseded by
  // something it cannot consume - a stale-input refusal, never a fallback to the older file.
  ATTACHMENT_MIME_INVALID: 'STALE_INPUT',
  ATTACHMENT_NOT_FOUND: 'STALE_INPUT',
  CONFIRMATION_REQUEST_MISMATCH: 'STALE_INPUT',
  CONFIRMATION_REVISION_MISMATCH: 'STALE_INPUT',
  CONFIRMATION_REQUEST_REF_MISMATCH: 'STALE_INPUT',
  CONFIRMATION_REQUEST_HASH_MISMATCH: 'STALE_INPUT',
  CONFIRMATION_ORDER_INVALID: 'STALE_INPUT',
  REQUEST_SELECTOR_STALE: 'STALE_INPUT',
  DRAFT_MISMATCH: 'STALE_INPUT',
  DRAFT_NOT_READY: 'NEEDS_INPUT',
  SESSION_UNAVAILABLE: 'ERROR',
  READ_ATTACHMENT_UNAVAILABLE: 'ERROR',
  READER_ERROR: 'ERROR',
  LIST_UNAVAILABLE: 'ERROR',
})

const ATTACHMENT_HARD_ERRORS = new Set(['SESSION_UNAVAILABLE', 'READ_ATTACHMENT_UNAVAILABLE', 'READER_ERROR', 'LIST_UNAVAILABLE'])

function resultFromError(tool, error) {
  if (error instanceof PluginError) {
    return error.kind === 'business'
      ? withRefusalCode(refusalResult(tool, error), error.code)
      : { isError: true, ...refusalResult(tool, error) }
  }
  if (error instanceof IntakeAttachmentError) {
    if (ATTACHMENT_HARD_ERRORS.has(error.code)) return executionFailure(tool, error.code, error.message, error.detail)
    return refusal(tool, error.code, error.message, { status: ATTACHMENT_STATUS[error.code] ?? 'INVALID_SPEC', detail: error.detail })
  }
  // A refused bridge answer that arrives as a code-carrying error (bridge or injected test double)
  // stays a business refusal - never rewritten into an internal error.
  if (error && typeof error.code === 'string' && error.code) {
    return refusal(tool, error.code, error.message ?? 'refused', { status: error.status ?? 'INVALID_SPEC', detail: error.detail })
  }
  return executionFailure(tool, 'INTERNAL_ERROR', `unexpected failure: ${error?.message ?? error}`)
}

const wrap = (tool, body) => async (args, ctx) => {
  try {
    return await body(args, ctx)
  } catch (error) {
    return resultFromError(tool, error)
  }
}

/** The next package's bridge, reached only through the existing controlled `callBridge`. */
export function defaultIntakeBridge(config) {
  const timeoutMs = Number.isSafeInteger(config?.budget?.taskTimeoutMs) ? config.budget.taskTimeoutMs : undefined
  const call = async (ctx, subcommand, request) => {
    const { envelope } = await callBridge(ctx, config, subcommand, request, timeoutMs ? { timeoutMs } : {})
    if (envelope.ok !== true) {
      throw businessRefusal(envelope.code ?? 'INTAKE_REFUSED', envelope.message ?? `the ${subcommand} command was refused`, {
        status: envelope.status ?? 'INVALID_SPEC',
        ...(envelope.detail !== undefined ? { detail: envelope.detail } : {}),
      })
    }
    return envelope.data ?? {}
  }
  return {
    async compileRequest(ctx, { request, textProposals }) {
      return call(ctx, 'intake_compile_request', textProposals === undefined ? { request } : { request, text_proposals: textProposals })
    },
    async stageRequest(ctx, payload) {
      return call(ctx, 'intake_stage_request', {
        request: payload.request,
        draft_hash: payload.draftHash,
        attachment_sha256: payload.attachmentSha256,
        attachment_ref: payload.attachmentRef,
        session_scope: payload.sessionScope,
        ...(payload.textProposals === undefined ? {} : { text_proposals: payload.textProposals }),
      })
    },
    async readStagedCompile(ctx, payload) {
      return call(ctx, 'intake_read_staged_compile', {
        request: payload.request,
        attachment_sha256: payload.attachmentSha256,
        session_scope: payload.sessionScope,
      })
    },
    async commitTask(ctx, payload) {
      return call(ctx, 'intake_commit_task', {
        request: payload.request,
        draft_hash: payload.draftHash,
        attachment_sha256: payload.attachmentSha256,
        attachment_ref: payload.attachmentRef,
        session_scope: payload.sessionScope,
        receipt: payload.receipt,
      })
    },
  }
}

/** The program facts a bridge answer must carry before a tool trusts any of it. */
function checkedCompile(data) {
  const draft = data?.draft
  const card = data?.device_card
  if (typeof data?.request_sha256 !== 'string' || !HEX64_PATTERN.test(data.request_sha256)) {
    throw executionError('BRIDGE_PROTOCOL', 'the intake compiler answered without a request_sha256 digest')
  }
  if (!card || typeof card.id !== 'string' || typeof card.sha256 !== 'string' || !HEX64_PATTERN.test(card.sha256)) {
    throw executionError('BRIDGE_PROTOCOL', 'the intake compiler answered without a device card identity')
  }
  if (!draft || typeof draft !== 'object' || typeof draft.draft_hash !== 'string' || !HEX64_PATTERN.test(draft.draft_hash) || typeof draft.outcome !== 'string') {
    throw executionError('BRIDGE_PROTOCOL', 'the intake compiler answered without a deterministic draft')
  }
  return { requestSha256: data.request_sha256, card: { id: card.id, sha256: card.sha256 }, draft }
}

const scopeDigest = (fields) => createHash('sha256').update(JSON.stringify(fields)).digest('base64url')

const PROPOSAL_FIELD_PATH = 'plate.width'
const PROPOSAL_KIND = 'upper_bound'
const MAX_TEXT_PROPOSALS = 4

/**
 * Normalise a model-supplied proposal list into a closed, deterministic digest input.
 *
 * This is a *scope* input only - it distinguishes approvals, it never proves a proposal is true
 * (execute re-verifies the raw text through the core). Two different value/unit/quote inputs must
 * never collide, and an unknown key must not be silently dropped: an unrecognised key yields an
 * explicit ``{invalid: ...}`` marker that hashes to a stable but *different* digest, so the host
 * never reuses an earlier grant. A non-list container or an unreadable shape is ``null``, which
 * ``classify`` turns into an invalid-scope marker (classify itself must never throw).
 */
function normalizeProposalScopeInput(proposals) {
  if (proposals === undefined || proposals === null) return null
  if (!Array.isArray(proposals)) return { invalid: 'not_a_list' }
  if (proposals.length > MAX_TEXT_PROPOSALS) return { invalid: 'too_many' }
  const out = []
  for (const item of proposals) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return { invalid: 'not_an_object' }
    const allowed = new Set(['field_path', 'kind', 'quote', 'value', 'unit'])
    const extra = Object.keys(item).filter((key) => !allowed.has(key))
    if (extra.length > 0) return { invalid: `unknown_key:${extra.sort()[0]}` }
    const quote = item.quote
    if (!quote || typeof quote !== 'object' || Array.isArray(quote)) return { invalid: 'bad_quote' }
    const quoteExtra = Object.keys(quote).filter((key) => !['start', 'end', 'literal'].includes(key))
    if (quoteExtra.length > 0) return { invalid: `unknown_quote_key:${quoteExtra.sort()[0]}` }
    if (item.field_path !== PROPOSAL_FIELD_PATH || item.kind !== PROPOSAL_KIND) return { invalid: 'unsupported' }
    if (typeof quote.start !== 'number' || typeof quote.end !== 'number' || typeof quote.literal !== 'string') return { invalid: 'bad_quote_shape' }
    if (typeof item.value !== 'number' || typeof item.unit !== 'string') return { invalid: 'bad_assertion' }
    out.push({
      field_path: item.field_path,
      kind: item.kind,
      quote: { start: quote.start, end: quote.end, literal: quote.literal },
      value: item.value,
      unit: item.unit,
    })
  }
  out.sort((a, b) => (a.quote.start - b.quote.start) || (a.quote.end - b.quote.end))
  return { proposals: out }
}

/**
 * The closed stage-scope proposal digest. ``null`` (no proposals) is a *stable* empty marker; the
 * caller keeps the no-proposal scope string byte-identical to the pre-proposal era while still
 * bumping ``STAGE_POLICY_VERSION`` (a policy change must invalidate old v1 grants).
 */
export function stageProposalDigest(proposals) {
  return scopeDigest({ proposals: normalizeProposalScopeInput(proposals) })
}

/** Exact per-commit approval scope: any change to request/draft/confirmation derives a new scope. */
export function commitApprovalScope({ requestRef, requestSha256, draftHash, confirmationRef, confirmationSha256 }) {
  const scope = `draft:${scopeDigest({ request_ref: requestRef, request_sha256: requestSha256, draft_hash: draftHash, confirmation_ref: confirmationRef, confirmation_sha256: confirmationSha256 })}`
  if (!APPROVAL_SCOPE_PATTERN.test(scope)) throw new Error('internal error: approval scope does not fit the host grammar')
  return scope
}

export function stageApprovalScope({ requestRef, requestSha256, textProposals }) {
  // No proposals: the exact original scope string (compatibility). With proposals: the closed
  // normalised digest is folded in, so the same request with a different proposal derives a
  // different approval scope and an old grant is never reused.
  const scope =
    textProposals === undefined || textProposals === null
      ? `stage:${scopeDigest({ request_ref: requestRef, request_sha256: requestSha256 })}`
      : `stage:${scopeDigest({ request_ref: requestRef, request_sha256: requestSha256, proposals: normalizeProposalScopeInput(textProposals) })}`
  if (!APPROVAL_SCOPE_PATTERN.test(scope)) throw new Error('internal error: approval scope does not fit the host grammar')
  return scope
}

/** An invalid-scope marker: classify must never throw, so a bad shape becomes a stable distinct scope. */
function invalidStageScope(reason) {
  const scope = `stage:${scopeDigest({ invalid: reason })}`
  if (!APPROVAL_SCOPE_PATTERN.test(scope)) throw new Error('internal error: approval scope does not fit the host grammar')
  return scope
}

/** The trusted receipt: built here from verified facts, never accepted from the model. */
export function buildConfirmationReceipt({ draft, request, sessionScope, approvedAt }) {
  return {
    receipt_kind: 'fitplate-confirmation-receipt',
    receipt_id: `conf-${request.json.request_id}`,
    draft_hash: draft.draft_hash,
    request_id: request.json.request_id,
    request_revision: request.json.request_revision,
    attachment_sha256: request.sha256,
    session_scope: sessionScope,
    approved_at: approvedAt,
  }
}

const requestSelector = {
  request_ref: str({ ...REF, description: 'the session-file://<seq>/<index> reference of fitplate-request.json as returned by fitplate_get_request' }),
  request_sha256: str({ ...HEX64, description: 'the SHA-256 this tool computed over the request attachment bytes' }),
}

/**
 * The optional, bounded text-proposal parameter.
 *
 * The envelope schema is deliberately **permissive** (`Any`): the model may hand in a malformed
 * proposal (an unknown key, a non-integer/boolean offset, a non-list, too many items), and the Host
 * must not reject it *before* `execute` runs - a pre-execute schema rejection is a sticky
 * `schema_invalid` the model cannot self-correct from. Instead the raw JSON reaches the program,
 * which re-verifies every quote against the real request text and returns a business refusal the
 * model can act on. The program is the closed authority (043): it refuses an unknown
 * source/hash/confirmed key, a bad offset, a value/unit mismatch, a non-list or more than four
 * items, and stages nothing on any refusal. The full expected shape is documented in the
 * description so the model still knows what a *correct* proposal looks like.
 */
const textProposalsParam = {
  [Kind]: 'Any',
  description:
    'optional, at most 4 verified width-cap proposals. Full shape: a JSON list of at most 4 items, each '
    + '{"field_path":"plate.width","kind":"upper_bound","quote":{"start":<int>,"end":<int>,"literal":<string>},"value":<number>,"unit":"mm|cm|m|um|in"}. '
    + 'start/end are Python code-point offsets into the current request.text and literal must be exactly request.text[start:end]. '
    + 'value/unit are your ASSERTION only - the program re-derives the real value, unit and source from the quote and refuses any mismatch. '
    + 'Unknown keys (source/hash/confirmed/...), a non-integer or boolean offset, a non-list, more than 4 items, or a value/unit mismatch are refused by the PROGRAM as a business error (nothing is staged); they are not silently dropped.',
}

const readMeta = { isReadOnly: true, isDestructive: false, isConcurrencySafe: true, isOpenWorld: false, replay: 'safe', costHint: undefined, deferLoading: false, requiresApproval: 'never' }
const writeMeta = { isReadOnly: false, isDestructive: false, isConcurrencySafe: false, isOpenWorld: false, replay: 'idempotent', costHint: undefined, deferLoading: false, requiresApproval: 'always' }

/**
 * Build the three intake tool definitions. `bridge` is injectable for offline tests only; the
 * default is the controlled bridge above. Nothing here touches the filesystem directly.
 */
export function buildIntakeTools({ config, log, bridge } = {}) {
  void log
  const backend = bridge ?? defaultIntakeBridge(config)

  const get_request = {
    name: 'fitplate_get_request',
    description:
      'Read the current request from this session: the newest fitplate-request.json user attachment (read through the Host, never from arguments) plus the program\'s deterministic compile - device card identity and the constraint draft with its missing fields, conflicts and unsupported features. Read-only: nothing is staged or frozen. The assistant explains and asks for clarifications; it never rewrites the compiled values.',
    parameters: object({ request_ref: str({ ...REF, description: 'optional: assert the current request sits at this exact reference' }), request_sha256: str({ ...HEX64, description: 'optional: assert the current request bytes hash' }) }, { required: [] }),
    meta: readMeta,
    execute: wrap('fitplate_get_request', async (args, ctx) => {
      const request = await readLatestRequestAttachment(ctx?.session?.readAttachment)
      if (args.request_ref !== undefined && args.request_ref !== request.ref) {
        throw new IntakeAttachmentError('REQUEST_SELECTOR_STALE', `the current request is ${request.ref}, not the asserted ${args.request_ref}`)
      }
      if (args.request_sha256 !== undefined && args.request_sha256 !== request.sha256) {
        throw new IntakeAttachmentError('REQUEST_SELECTOR_STALE', 'the current request bytes differ from the asserted hash')
      }
      const compiled = checkedCompile(await backend.compileRequest(ctx, { request: request.json }))
      // The model needs the REAL request text and language to make a semantic proposal at all; the
      // old id/hash/draft fields stay unchanged, and text/language are read from the attachment the
      // Host returned, never from tool arguments.
      const requestText = typeof request.json.text === 'string' ? request.json.text : ''
      const requestLanguage = typeof request.json.language === 'string' ? request.json.language : null
      return okResult(
        'fitplate_get_request',
        {
          request_ref: request.ref,
          request_sha256: request.sha256,
          request_id: request.json.request_id,
          request_revision: request.json.request_revision,
          language: requestLanguage,
          text: requestText,
          device_card: compiled.card,
          input_form: request.json.form,
          draft: compiled.draft,
          attachment: { name: request.name, mime_type: request.mimeType, bytes: request.bytes.byteLength },
        },
        modelFacts('fitplate_get_request', {
          request: {
            ref: request.ref,
            sha256: request.sha256,
            request_id: request.json.request_id,
            request_revision: request.json.request_revision,
            language: requestLanguage,
            text: requestText,
            attachment: { name: request.name, mime_type: request.mimeType, bytes: request.bytes.byteLength },
          },
          device_card: compiled.card,
          input_form: request.json.form,
          draft: compiled.draft,
          next_tool_arguments: {
            fitplate_propose_constraints: { request_ref: request.ref, request_sha256: request.sha256 },
          },
          notes: [
            'input_form 是同一请求附件的真实表单事实，每个长度自带单位；要求数值见 input_form.requirements，尺寸许可见 input_form.plate.editable，位置许可见 input_form.mounting.movement_license。',
            'field_proposals 中 keep 只表示该条保留所引用的值，不表示该维度没有 editable 许可。是否可改以 input_form 的显式许可及程序编译后的草稿为准；没有 editable 的尺寸保持原值。空的表单长度 value=null 是缺失事实，不能与草稿中许可区间尚未选点的 value_mm=null 混淆。',
            'For NEEDS_INPUT/conflicts ask only unresolved facts in the request language. Users edit the existing form and click “让 AI 检查这些要求”; the panel creates confirmation JSON/hashes automatically. A null candidate scalar with a complete permitted interval is a model design choice, not missing user input.',
            'text is the exact request.text (Python code-point offsets); quote a complete single condition from it for text_proposals.',
            'a proposal value/unit is your assertion only; the program re-derives the real value, unit and source from the quote.',
          ],
        }),
      )
    }),
  }

  const propose_constraints = {
    name: 'fitplate_propose_constraints',
    description:
      'Register the current program-compiled constraint draft for confirmation. The tool re-reads the newest fitplate-request.json attachment from this session and stages exactly the deterministic compile of that request and the registered device card - NEEDS_INPUT drafts are staged too, so a later revision supersedes them. You may optionally hand in at most 4 text_proposals: each is a real quote into the request text plus an assertion, and the program re-verifies every quote and re-derives the value, unit and source. Your assertion is never a source fact, and you cannot otherwise inject or edit the compiled values.',
    parameters: object({ ...requestSelector, text_proposals: textProposalsParam }, { required: ['request_ref', 'request_sha256'] }),
    meta: writeMeta,
    policyVersion: STAGE_POLICY_VERSION,
    classify: (args) => {
      // classify must never throw: an unreadable proposal shape yields a stable *invalid* scope
      // marker (a distinct digest) rather than an exception that would leave the host in an
      // unknown-outcome state. execute re-verifies the raw proposals strictly and refuses.
      let approvalScopes
      try {
        approvalScopes = [stageApprovalScope({ requestRef: args.request_ref, requestSha256: args.request_sha256, textProposals: args.text_proposals })]
      } catch {
        approvalScopes = [invalidStageScope('stage_scope_unavailable')]
      }
      return { isReadOnly: false, isDestructive: false, replay: 'idempotent', requiresApproval: 'always', approvalScopes }
    },
    execute: wrap('fitplate_propose_constraints', async (args, ctx) => {
      const identity = sessionIdentity(ctx)
      const sessionScope = makeSessionScope(ctx?.session)
      const request = await readLatestRequestAttachment(ctx?.session?.readAttachment)
      if (args.request_ref !== request.ref || args.request_sha256 !== request.sha256) {
        throw new IntakeAttachmentError('REQUEST_SELECTOR_STALE', `the current request is ${request.ref} (sha ${request.sha256.slice(0, 12)}…); re-run fitplate_get_request`)
      }
      // The raw proposals (if any) go to the core, which re-verifies each quote against the real
      // request text and refuses an unknown key / bad offset / mismatch - never sanitized here.
      const compiled = checkedCompile(await backend.compileRequest(ctx, { request: request.json, textProposals: args.text_proposals }))
      const staged = await backend.stageRequest(ctx, {
        request: request.json,
        draftHash: compiled.draft.draft_hash,
        attachmentSha256: request.sha256,
        attachmentRef: request.ref,
        sessionScope,
        textProposals: args.text_proposals,
      })
      return okResult(
        'fitplate_propose_constraints',
        {
          request_ref: request.ref,
          request_sha256: request.sha256,
          draft_hash: compiled.draft.draft_hash,
          outcome: compiled.draft.outcome,
          input_form: request.json.form,
          staged: staged.staged ?? null,
          attribution_tool_use_id: identity.tool_use_id,
        },
        modelFacts('fitplate_propose_constraints', {
          request: {
            ref: request.ref,
            sha256: request.sha256,
            request_id: request.json.request_id,
            request_revision: request.json.request_revision,
            attachment: { name: request.name, mime_type: request.mimeType, bytes: request.bytes.byteLength },
          },
          device_card: compiled.card,
          input_form: request.json.form,
          draft: compiled.draft,
          staged: staged.staged ?? null,
          attribution_tool_use_id: identity.tool_use_id,
          next_tool_arguments: {
            fitplate_commit_task: {
              request_ref: request.ref,
              request_sha256: request.sha256,
              draft_hash: compiled.draft.draft_hash,
            },
          },
          notes: [
            'input_form 是同一请求附件的真实表单事实，每个长度自带单位；要求数值见 input_form.requirements，尺寸许可见 input_form.plate.editable，位置许可见 input_form.mounting.movement_license。',
            'field_proposals 中 keep 只表示该条保留所引用的值，不表示该维度没有 editable 许可。是否可改以 input_form 的显式许可及程序编译后的草稿为准；没有 editable 的尺寸保持原值。空的表单长度 value=null 是缺失事实，不能与草稿中许可区间尚未选点的 value_mm=null 混淆。',
            'confirmation_ref/confirmation_sha256 for fitplate_commit_task must name the real fitplate-confirmation.json user attachment read from this session; they are never derived from tool output.',
            'fitplate_commit_task carries no proposals: the staged proposals are read back from the trusted stage at commit time.',
          ],
        }),
      )
    }),
  }

  const commit_task = {
    name: 'fitplate_commit_task',
    description:
      'Freeze the confirmed request into a task revision. The tool re-scans this session\'s attachments: the newest fitplate-request.json must be the exact request the arguments name, the user\'s fitplate-confirmation.json must sit after it and repeat the exact request revision, draft hash and request bytes hash - a model-typed confirmation or an older/other-session confirmation is refused. Native approval is required on top (per-draft scope); this call cannot substitute for the user\'s confirmation attachment. Same confirmation repeats idempotently.',
    parameters: object(
      {
        ...requestSelector,
        draft_hash: str({ ...HEX64, description: 'the draft hash the program reported (the confirmation must repeat it)' }),
        confirmation_ref: str({ ...REF, description: 'the session-file://<seq>/<index> reference of fitplate-confirmation.json' }),
        confirmation_sha256: str({ ...HEX64, description: 'the SHA-256 of the confirmation attachment bytes' }),
      },
      { required: ['request_ref', 'request_sha256', 'draft_hash', 'confirmation_ref', 'confirmation_sha256'] },
    ),
    meta: writeMeta,
    policyVersion: COMMIT_POLICY_VERSION,
    classify: (args) => ({
      isReadOnly: false,
      isDestructive: false,
      replay: 'idempotent',
      requiresApproval: 'always',
      approvalScopes: [
        commitApprovalScope({
          requestRef: args.request_ref,
          requestSha256: args.request_sha256,
          draftHash: args.draft_hash,
          confirmationRef: args.confirmation_ref,
          confirmationSha256: args.confirmation_sha256,
        }),
      ],
    }),
    execute: wrap('fitplate_commit_task', async (args, ctx) => {
      const identity = sessionIdentity(ctx)
      const sessionScope = makeSessionScope(ctx?.session)
      const reader = ctx?.session?.readAttachment
      // 1) Rescan the CURRENT session/lane; the caller's selector can never override it.
      const request = await readLatestRequestAttachment(reader)
      if (args.request_ref !== request.ref || args.request_sha256 !== request.sha256) {
        throw new IntakeAttachmentError('REQUEST_SELECTOR_STALE', `the current request is ${request.ref} (sha ${request.sha256.slice(0, 12)}…); re-run fitplate_get_request`)
      }
      // 2) The confirmation is a genuine attachment read back from the same reader.
      const confirmationRead = await readAttachmentJsonByRef(reader, args.confirmation_ref, { expectedName: CONFIRMATION_FILENAME })
      if (args.confirmation_sha256 !== confirmationRead.sha256) {
        throw new IntakeAttachmentError('CONFIRMATION_HASH_MISMATCH', 'the confirmation bytes differ from the asserted confirmation hash')
      }
      const confirmation = validateConfirmationDocument(confirmationRead.json)
      checkConfirmationBinding({ confirmation, confirmationRef: { seq: confirmationRead.seq, index: confirmationRead.index }, request })
      // 3) The program reads the CURRENT locked stage and recompiles it from its persisted
      //    proposals; every name must agree with that compile. The model never re-supplies
      //    proposals - the trusted stage is the only source.
      const read = checkedCompile(await backend.readStagedCompile(ctx, { request: request.json, attachmentSha256: request.sha256, sessionScope }))
      if (confirmation.draft_hash !== read.draft.draft_hash || args.draft_hash !== read.draft.draft_hash) {
        throw new IntakeAttachmentError('DRAFT_MISMATCH', 'the confirmation and the arguments must name the draft the program compiles from the current stage')
      }
      if (read.draft.outcome !== 'READY_TO_CONFIRM') {
        throw new IntakeAttachmentError('DRAFT_NOT_READY', `the current draft is ${read.draft.outcome}; commit only freezes a READY_TO_CONFIRM draft`)
      }
      // 4) Trusted receipt (never from arguments) + the controlled freeze. The proposals are NOT
      //    passed here: the bridge commit re-reads the locked stage itself, so a re-stage between
      //    this read and the freeze is caught by freeze's own lock.
      const receipt = buildConfirmationReceipt({ draft: read.draft, request, sessionScope, approvedAt: new Date().toISOString() })
      const frozen = await backend.commitTask(ctx, {
        request: request.json,
        draftHash: read.draft.draft_hash,
        attachmentSha256: request.sha256,
        attachmentRef: request.ref,
        sessionScope,
        receipt,
      })
      return okResult(
        'fitplate_commit_task',
        {
          request_ref: request.ref,
          request_sha256: request.sha256,
          draft_hash: read.draft.draft_hash,
          confirmation_ref: confirmationRead.ref,
          confirmation_sha256: confirmationRead.sha256,
          task_id: frozen.task_id ?? null,
          task_revision: frozen.task_revision ?? null,
          manifest_id: frozen.manifest_id ?? null,
          idempotent: frozen.idempotent === true,
          recovered_orphan: frozen.recovered_orphan === true,
          attribution_tool_use_id: identity.tool_use_id,
        },
        modelFacts('fitplate_commit_task', {
          request: {
            ref: request.ref,
            sha256: request.sha256,
            request_id: request.json.request_id,
            request_revision: request.json.request_revision,
            attachment: { name: request.name, mime_type: request.mimeType, bytes: request.bytes.byteLength },
          },
          device_card: read.card,
          draft: read.draft,
          confirmation: { ref: confirmationRead.ref, sha256: confirmationRead.sha256 },
          task: {
            task_id: frozen.task_id ?? null,
            task_revision: frozen.task_revision ?? null,
            manifest_id: frozen.manifest_id ?? null,
            idempotent: frozen.idempotent === true,
            recovered_orphan: frozen.recovered_orphan === true,
          },
          attribution_tool_use_id: identity.tool_use_id,
          ...(frozen.task_id && Number.isInteger(frozen.task_revision)
            ? { next_tool_arguments: { fitplate_load_task: { task_id: frozen.task_id, revision: frozen.task_revision } } }
            : {}),
        }),
      )
    }),
  }

  const tools = [get_request, propose_constraints, commit_task]
  for (const tool of tools) tool.description += USER_FLOW_GUIDANCE
  return tools
}
