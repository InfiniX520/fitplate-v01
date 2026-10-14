// Run-store access from the JavaScript side (T06 store semantics).
//
// Two rules shape this module:
//
//   * the plugin never spawns anything itself and never uses `node:fs` on the
//     workspace - every write (and every creation of a directory) goes through
//     `toolCtx.exec` into the controlled Python bridge, and every read goes
//     through `toolCtx.fs`;
//   * the plugin holds no run state in memory. Each call re-reads the manifest
//     from disk, so a daemon restart, a hot reload or two sessions with the same
//     run id can never see a stale picture.
//
// The bridge speaks one JSON envelope per process (see python_bridge.py). This
// module is the only place that parses it, and it refuses anything that is not
// exactly one well-formed envelope describing the run/candidate the caller
// asked about.

import { randomBytes, createHash } from 'node:crypto'

export const BRIDGE_SCHEMA_VERSION = '1.0'
export const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
export const CANDIDATE_ID_PATTERN = /^v[0-9]{3}$/
export const TASK_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/
export const REPORT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

/** Largest manifest this plugin will read into memory (the bridge caps writes at the same size). */
export const MAX_MANIFEST_BYTES = 4 * 1024 * 1024

/**
 * Failure taxonomy for the tool layer.
 *
 * - `kind: 'business'` - the request was answered; the answer is a refusal the
 *   model is expected to act on (fix the design, reload the task, stop for
 *   budget). These are normal tool results, never `isError`.
 * - `kind: 'execution'` - the tool could not produce an answer (timeout,
 *   cancellation, truncated output, crashed bridge, hash mismatch). These are
 *   `isError` results with a stable code.
 */
export class PluginError extends Error {
  constructor(kind, code, message, { status = 'ERROR', detail } = {}) {
    super(message)
    this.name = 'PluginError'
    this.kind = kind
    this.code = code
    this.status = status
    this.detail = detail
  }
}

export const executionError = (code, message, options) => new PluginError('execution', code, message, options)
export const businessRefusal = (code, message, options = {}) =>
  new PluginError('business', code, message, { status: options.status ?? 'INVALID_SPEC', ...options })

/** A fresh, collision-resistant, path-safe run id (never derived from model input). */
export function newRunId() {
  const stamp = Date.now().toString(36)
  const random = randomBytes(6).toString('hex')
  return `r-${stamp}-${random}`
}

/** Host session identity. The Host owns these values; the model cannot pass them. */
export function sessionIdentity(ctx) {
  const session = ctx?.session
  const key = typeof session?.key === 'string' ? session.key : ''
  const lane = typeof session?.lane === 'string' ? session.lane : ''
  const toolUseId = typeof session?.toolUseId === 'string' ? session.toolUseId : ''
  if (!key || !toolUseId) {
    throw executionError(
      'SESSION_UNAVAILABLE',
      'the Host did not provide a session identity; this tool only runs inside a session',
    )
  }
  return { key, lane, tool_use_id: toolUseId }
}

/**
 * Run the controlled bridge through `toolCtx.exec` and return its envelope.
 *
 * The argument vector is fixed by the plugin: [configured python, configured
 * bridge, subcommand]. Nothing from the tool arguments reaches it.
 */
export async function callBridge(ctx, config, subcommand, request, { runId, candidateId, timeoutMs } = {}) {
  const payload = JSON.stringify({
    schema_version: BRIDGE_SCHEMA_VERSION,
    config: config.bridgeConfig(),
    session: sessionIdentity(ctx),
    request,
  })
  const started = Date.now()
  const result = await ctx.exec([config.pythonPath, config.bridgePath, subcommand], {
    cwd: ctx.cwd,
    stdin: payload,
    timeoutMs,
  })
  const durationMs = Date.now() - started

  if (ctx.signal?.aborted) {
    throw executionError('CANCELLED', `the ${subcommand} call was cancelled; nothing was published`, {
      detail: { duration_ms: durationMs },
    })
  }
  if (result.timedOut) {
    throw executionError(
      'EXEC_TIMEOUT',
      `the ${subcommand} call exceeded its ${timeoutMs} ms budget and was terminated; a timeout is not a geometry result`,
      { detail: { duration_ms: durationMs } },
    )
  }
  if (result.truncated) {
    throw executionError('EXEC_OUTPUT_TRUNCATED', `the ${subcommand} output was truncated and cannot be trusted`, {
      detail: { duration_ms: durationMs },
    })
  }
  const envelope = parseEnvelope(result.stdout, { subcommand, runId, candidateId, exitCode: result.code })

  if (result.code === 0 && envelope.ok !== true) {
    throw executionError('BRIDGE_PROTOCOL', `${subcommand}: exit 0 carried a negative envelope`, {
      detail: { code: envelope.code, status: envelope.status },
    })
  }
  if (result.code === 3 && envelope.ok !== false) {
    throw executionError('BRIDGE_PROTOCOL', `${subcommand}: refusal exit carried a positive envelope`, {
      detail: { code: envelope.code, status: envelope.status },
    })
  }
  if (result.code === 2 && envelope.ok !== true) {
    // Exit 2 is the bridge saying the work could not be carried out: a failed,
    // timed-out or cancelled CAD command, a report that failed the binding
    // re-check, an unreadable artefact. That is an execution failure, not a
    // business refusal, and must surface as `isError` - "could not measure"
    // must never look like "measured and refused".
    throw executionError(envelope.code ?? 'BRIDGE_EXECUTION_FAILED', envelope.message ?? `${subcommand} failed`, {
      status: envelope.status ?? 'ERROR',
      detail: { ...(envelope.detail ?? {}), bridge_status: envelope.status },
    })
  }
  return { envelope, durationMs }
}

/** Parse and cross-check one bridge envelope. Throws execution errors on anything unexpected. */
export function parseEnvelope(stdout, { subcommand, runId, candidateId, exitCode }) {
  if (typeof stdout !== 'string') {
    throw executionError('EXEC_OUTPUT_MISSING', `${subcommand}: the bridge produced no stdout`)
  }
  const text = stdout.trim()
  if (!text) {
    throw executionError('EXEC_OUTPUT_MISSING', `${subcommand}: the bridge produced no stdout (exit ${exitCode})`)
  }
  let envelope
  try {
    // A single JSON.parse over the whole trimmed output rejects any mixing of
    // progress lines, partial writes or two documents in one stream.
    envelope = JSON.parse(text)
  } catch {
    throw executionError('EXEC_OUTPUT_MALFORMED', `${subcommand}: stdout is not a single JSON document`)
  }
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    throw executionError('EXEC_OUTPUT_MALFORMED', `${subcommand}: stdout is not a JSON object`)
  }
  if (envelope.schema_version !== BRIDGE_SCHEMA_VERSION) {
    throw executionError('EXEC_OUTPUT_MALFORMED', `${subcommand}: unexpected bridge schema version`)
  }
  if (typeof envelope.bridge_version !== 'string' || !envelope.bridge_version.startsWith('fitplate-bridge/')) {
    throw executionError('EXEC_OUTPUT_MALFORMED', `${subcommand}: the envelope does not come from the FitPlate bridge`)
  }
  if (envelope.command !== subcommand) {
    throw executionError('EXEC_OUTPUT_MALFORMED', `${subcommand}: the envelope answers ${String(envelope.command)}`)
  }
  if (typeof envelope.ok !== 'boolean') {
    throw executionError('EXEC_OUTPUT_MALFORMED', `${subcommand}: the envelope has no ok flag`)
  }
  // Identity cross-check: the envelope must describe the run/candidate this call
  // was about, so a confused or replayed answer cannot be filed under another id.
  if (runId !== undefined && envelope.run_id !== undefined && envelope.run_id !== runId) {
    throw executionError('IDENTITY_MISMATCH', `${subcommand}: the bridge answered for run ${envelope.run_id}, not ${runId}`)
  }
  if (candidateId !== undefined && envelope.candidate_id !== undefined && envelope.candidate_id !== candidateId) {
    throw executionError(
      'IDENTITY_MISMATCH',
      `${subcommand}: the bridge answered for candidate ${envelope.candidate_id}, not ${candidateId}`,
    )
  }
  return envelope
}

/** Relative path of a run's manifest inside the workspace. */
export const manifestRelPath = (config, runId) => `${config.runsDir}/${runId}/manifest.json`

const decoder = new TextDecoder('utf-8', { fatal: true })

/** Read and shape-check `<workspace>/runs/<run_id>/manifest.json` through `toolCtx.fs`. */
export async function readRunManifest(ctx, config, runId) {
  if (!RUN_ID_PATTERN.test(runId)) {
    throw businessRefusal('INVALID_RUN_ID', `run_id ${JSON.stringify(runId)} is not a run identifier this store issues`, {
      status: 'INVALID_SPEC',
    })
  }
  const path = manifestRelPath(config, runId)
  let bytes
  try {
    bytes = await ctx.fs.read(path)
  } catch {
    return undefined
  }
  if (!bytes || bytes.byteLength === 0) return undefined
  if (bytes.byteLength > MAX_MANIFEST_BYTES) {
    throw executionError('MANIFEST_TOO_LARGE', 'the run manifest is larger than this plugin will read')
  }
  let manifest
  try {
    manifest = JSON.parse(decoder.decode(bytes))
  } catch {
    throw executionError('MANIFEST_UNREADABLE', 'the run manifest is not readable JSON')
  }
  if (!manifest || typeof manifest !== 'object' || manifest.run_id !== runId || typeof manifest.candidates !== 'object') {
    throw executionError('MANIFEST_INVALID', 'the run manifest does not describe this run')
  }
  return manifest
}

/** File names the run store will ever put into a path (mirrors the bridge's registry). */
export const SAFE_FILE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

/** Largest single read this plugin performs through `toolCtx.fs` (registered artefacts cap at 8 MiB). */
export const MAX_REGISTERED_FILE_BYTES = 8 * 1024 * 1024

/**
 * Bounded read of one workspace file through `toolCtx.fs`: `stat` first (regular
 * file, size cap), then a plain unparameterised read whose length is checked
 * again afterwards.
 *
 * The read is deliberately called WITHOUT `offset`/`limit`: the Host only
 * returns a file's true bytes when both options are absent (`Fs.read` decodes
 * and re-encodes text when a line window is requested, which corrupts binary
 * payloads such as model.stl). Both Host read paths load the file before
 * slicing, so this cap is a contract check rather than a memory optimisation:
 * the pre-read `stat` refuses early, and the post-read length check refuses a
 * file that grew between the two calls.
 */
export async function readBoundedFile(ctx, path, { maxBytes = MAX_REGISTERED_FILE_BYTES } = {}) {
  const info = await ctx.fs.stat(path)
  if (info.kind !== 'file') throw businessRefusal('FILE_UNREADABLE', `${path} is not a regular file`)
  if (info.size > maxBytes) {
    throw businessRefusal('FILE_TOO_LARGE', `${path} is ${info.size} bytes, over the ${maxBytes} byte read cap`, {
      status: 'INVALID_SPEC',
      detail: { size: info.size, cap: maxBytes },
    })
  }
  const bytes = await ctx.fs.read(path)
  if (!bytes || bytes.byteLength > maxBytes) {
    throw businessRefusal('FILE_TOO_LARGE', `${path} returned more than the ${maxBytes} byte read cap`, {
      status: 'INVALID_SPEC',
    })
  }
  return { bytes, size: info.size }
}

/**
 * Read and hash-verify a whitelisted file of one candidate through `toolCtx.fs`.
 *
 * A caller cannot turn a file id into an arbitrary path: the id must match a
 * record in the run manifest *and* look like a plain file name (no separators,
 * no leading dot), the path is rebuilt from the store layout, the size is
 * checked before the read, and the bytes must hash to the recorded digest.
 */
export async function readRegisteredFile(ctx, config, runId, candidateId, fileId, { maxBytes = MAX_REGISTERED_FILE_BYTES } = {}) {
  const manifest = await readRunManifest(ctx, config, runId)
  if (!manifest) throw businessRefusal('RUN_NOT_FOUND', `run ${runId} does not exist in this workspace`, { status: 'STALE_INPUT' })
  const candidate = manifest.candidates?.[candidateId]
  if (!candidate) {
    throw businessRefusal('CANDIDATE_NOT_FOUND', `candidate ${candidateId} does not exist in run ${runId}`, {
      status: 'STALE_INPUT',
    })
  }
  const record = (candidate.files ?? []).find((entry) => entry?.name === fileId)
  if (!record) {
    throw businessRefusal('UNKNOWN_ARTIFACT', `artifact ${JSON.stringify(fileId)} is not registered for this candidate`, {
      status: 'INVALID_SPEC',
      detail: { registered: (candidate.files ?? []).map((entry) => entry?.name) },
    })
  }
  if (typeof record.name !== 'string' || !SAFE_FILE_NAME_PATTERN.test(record.name) || !SAFE_FILE_NAME_PATTERN.test(fileId)) {
    throw businessRefusal('INVALID_PATH', 'the candidate manifest lists an unsafe file name', { status: 'INVALID_SPEC' })
  }
  const path = `${config.runsDir}/${runId}/candidates/${candidateId}/${fileId}`
  let bytes
  try {
    ;({ bytes } = await readBoundedFile(ctx, path, { maxBytes }))
  } catch (error) {
    if (error instanceof PluginError && error.kind === 'business') throw error
    throw executionError('ARTIFACT_UNREADABLE', `the registered artifact ${fileId} could not be read`)
  }
  const digest = createHash('sha256').update(bytes).digest('hex')
  if (digest !== record.sha256) {
    throw businessRefusal('ARTEFACT_HASH_MISMATCH', `${fileId} does not match the hash recorded in the run manifest`, {
      status: 'STALE_INPUT',
      detail: { recorded: record.sha256, actual: digest },
    })
  }
  return { bytes, record, manifest, candidate }
}

/**
 * Read one frozen input (task/scene) and verify its raw bytes against the hash
 * the manifest recorded when the task was frozen.
 */
export async function readFrozenInput(ctx, config, runId, name, { maxBytes = MAX_MANIFEST_BYTES } = {}) {
  if (name !== 'task.json' && name !== 'scene.json') {
    throw businessRefusal('INVALID_PATH', `only frozen inputs may be read, not ${name}`, { status: 'INVALID_SPEC' })
  }
  const manifest = await readRunManifest(ctx, config, runId)
  if (!manifest) throw businessRefusal('RUN_NOT_FOUND', `run ${runId} does not exist in this workspace`, { status: 'STALE_INPUT' })
  const relative = `input/${name}`
  const expected = manifest.frozen?.files?.[relative]
  const path = `${config.runsDir}/${runId}/${relative}`
  const { bytes } = await readBoundedFile(ctx, path, { maxBytes })
  if (typeof expected === 'string') {
    const digest = createHash('sha256').update(bytes).digest('hex')
    if (digest !== expected) {
      throw businessRefusal('ARTEFACT_HASH_MISMATCH', `the frozen input ${name} does not match the hash recorded at load time`, {
        status: 'STALE_INPUT',
        detail: { recorded: expected, actual: digest },
      })
    }
  }
  return { bytes, manifest }
}
