// Read-only workbench services (T08): fitplate.run, fitplate.scene, fitplate.artifact.
//
// Boundary rules these handlers are built around:
//
//   * `ServiceContext` has no session field. The only thing a service may treat
//     as a boundary is `serviceCtx.cwd` - the workspace root the Host verified
//     for this call - and `serviceCtx.fs`, which is already confined to it.
//     A `session_key` arriving from the browser is used as a *consistency
//     filter* so a stale panel never displays another session's run; it is
//     never an authorization decision.
//   * every read is bounded before it happens (`stat` first, then a capped
//     read) and hash-verified against what the run manifest registered: frozen
//     inputs against the hashes recorded at freeze time, candidate artefacts,
//     report and evidence against their recorded SHA-256. A panel therefore
//     only ever draws bytes the run store vouched for.
//   * the mesh a panel draws always comes from the candidate's own
//     preview_mesh.json, which binds the candidate id and the STEP hash of the
//     artefact that was measured - never from design parameters. The device is
//     placed at the pose measured from the actual STEP (G04 evidence); the
//     submitted design center is only a clearly-labelled unverified fallback.
//   * no service accepts a path, and none can reach outside the current
//     workspace.

import { createHash } from 'node:crypto'

import {
  CANDIDATE_ID_PATTERN,
  RUN_ID_PATTERN,
  businessRefusal,
  readFrozenInput,
  readRegisteredFile,
  readRunManifest,
} from './run-store.mjs'

export const SERVICE_NAMES = Object.freeze(['fitplate.run', 'fitplate.scene', 'fitplate.artifact', 'fitplate.intake'])

/** Hard caps, mirrored in the deployment docs and enforced before anything is returned. */
export const MAX_SCENE_RESPONSE_BYTES = 512 * 1024
export const MAX_ARTIFACT_CHUNK_BYTES = 64 * 1024
/** The submitted design document is small by construction; anything larger is refused unread. */
export const MAX_DESIGN_BYTES = 64 * 1024
const MAX_FROZEN_INPUT_BYTES = 1024 * 1024

const SERVICE_TIMEOUT_MS = 5000

const SESSION_KEY_SCHEMA = { type: 'string', minLength: 1, maxLength: 512 }
const RUN_ID_SCHEMA = { type: 'string', pattern: RUN_ID_PATTERN.source, maxLength: 128 }
const CANDIDATE_ID_SCHEMA = { type: 'string', pattern: CANDIDATE_ID_PATTERN.source, maxLength: 8 }

const byteLength = (value) => Buffer.byteLength(JSON.stringify(value), 'utf8')
const textDecoder = new TextDecoder('utf-8', { fatal: true })

/**
 * Load one run manifest and apply the browser-side consistency filter.
 *
 * Returns undefined when the run does not exist, is not readable, or belongs to
 * a different session key than the one the browser says it is displaying.
 */
async function loadRunForSession(serviceCtx, config, runId, sessionKey) {
  if (!RUN_ID_PATTERN.test(runId)) return undefined
  let manifest
  try {
    manifest = await readRunManifest(serviceCtx, config, runId)
  } catch {
    return undefined
  }
  if (!manifest) return undefined
  if (manifest.owner?.session_key !== sessionKey) return undefined
  return manifest
}

/** Latest run created by this session key inside the Host-verified workspace. */
async function latestRunForSession(serviceCtx, config, sessionKey) {
  let entries
  try {
    entries = await serviceCtx.fs.list(config.runsDir)
  } catch {
    return undefined
  }
  const candidates = []
  for (const entry of entries.slice(0, 128)) {
    if (entry?.kind !== 'dir' || !RUN_ID_PATTERN.test(entry.name)) continue
    let manifest
    try {
      manifest = await readRunManifest(serviceCtx, config, entry.name)
    } catch {
      continue
    }
    if (!manifest || manifest.owner?.session_key !== sessionKey) continue
    candidates.push(manifest)
  }
  if (!candidates.length) return undefined
  candidates.sort((left, right) => String(left.created_at ?? '').localeCompare(String(right.created_at ?? '')))
  return candidates[candidates.length - 1]
}

/** Read + verify a frozen input; undefined when the run has no such file. */
async function frozenJson(serviceCtx, config, runId, name) {
  try {
    const { bytes } = await readFrozenInput(serviceCtx, config, runId, name, { maxBytes: MAX_FROZEN_INPUT_BYTES })
    if (!bytes?.byteLength) return undefined
    return JSON.parse(textDecoder.decode(bytes))
  } catch (error) {
    if (error?.kind === 'business' && error.code === 'FILE_UNREADABLE') return undefined
    throw error
  }
}

/** Read + verify a registered candidate file; undefined when it is not registered. */
async function registeredJson(serviceCtx, config, runId, candidateId, fileId, { maxBytes } = {}) {
  try {
    const { bytes } = await readRegisteredFile(serviceCtx, config, runId, candidateId, fileId, { maxBytes })
    return JSON.parse(textDecoder.decode(bytes))
  } catch (error) {
    if (error?.kind === 'business' && (error.code === 'UNKNOWN_ARTIFACT' || error.code === 'FILE_UNREADABLE')) return undefined
    throw error
  }
}

function versionSummaries(manifest) {
  return Object.keys(manifest.candidates ?? {})
    .sort()
    .map((candidateId) => {
      const entry = manifest.candidates[candidateId]
      return {
        candidate_id: candidateId,
        parent_candidate_id: entry.parent_candidate_id ?? null,
        status: entry.status ?? null,
        created_at: entry.created_at ?? null,
        step_sha256: entry.hashes?.step_sha256 ?? null,
        report_id: entry.report?.report_id ?? null,
        overall: entry.report?.overall ?? null,
        report_created_at: entry.report?.created_at ?? null,
        validator_version: entry.report?.validator_version ?? null,
        report_file_sha256: (entry.files ?? []).find((file) => file.name === 'report.json')?.sha256 ?? null,
        report_sha256: entry.report?.report_sha256 ?? null,
        // Registered names and digests only: the browser never receives a filesystem path.
        files: (entry.files ?? []).map((file) => ({ name: file.name, bytes: file.bytes ?? null, sha256: file.sha256 ?? null })),
      }
    })
}

function exportSummaries(manifest) {
  const out = []
  for (const candidateId of Object.keys(manifest.exports ?? {}).sort()) {
    for (const record of manifest.exports[candidateId] ?? []) {
      out.push({
        candidate_id: candidateId,
        report_id: record.report_id ?? null,
        step_sha256: record.hashes?.step_sha256 ?? null,
        report_file_sha256: (record.files ?? []).find((file) => file.name === 'report.json')?.sha256 ?? null,
        report_sha256: record.hashes?.report_sha256 ?? null,
        export_dir: record.export_dir ?? null,
        failed: record.failed === true,
        exported_at: record.exported_at ?? null,
      })
    }
  }
  return out
}

/** The frozen task facts a panel needs to show the constraint column. */
function taskSummary(task) {
  return {
    task_id: task.task_id,
    task_revision: task.revision,
    units: task.units,
    frame: task.frame,
    request_text: task.request?.text ?? null,
    // Where this frozen input actually came from, verbatim from the task file:
    // a synthesised run carries its real kind/source/review_status, and a
    // synthetic teaching fixture keeps saying so. The panel must never have to
    // guess the origin, and must never upgrade a synthetic fixture into a
    // verified real source.
    provenance: task.provenance ?? null,
    plate: {
      width: task.plate.width,
      height: task.plate.height,
      thickness: task.plate.thickness,
      locked: task.plate.locked ?? [],
      editable: task.plate.editable ?? {},
    },
    base_holes: { diameter: task.base_holes.diameter, centers: task.base_holes.centers, locked: task.base_holes.locked === true },
    sensor: {
      model_id: task.sensor.model_id,
      body_size: task.sensor.body_size,
      hole_diameter: task.sensor.hole_diameter,
      hole_offsets: task.sensor.hole_offsets,
      allowed_center_x: task.sensor.allowed_center_x,
      allowed_center_y: task.sensor.allowed_center_y,
      allowed_rotation_deg: task.sensor.allowed_rotation_deg,
    },
    requirements: task.requirements,
    tolerances: task.tolerances,
  }
}

// ---------------------------------------------------------------------------
// fitplate.run
// ---------------------------------------------------------------------------

const RUN_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    session_key: SESSION_KEY_SCHEMA,
    run_id: RUN_ID_SCHEMA,
  },
  required: ['session_key'],
  additionalProperties: false,
}

const NULLABLE_STRING = { type: ['string', 'null'] }
const NULLABLE_NUMBER = { type: ['number', 'null'] }
const RUN_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    found: { type: 'boolean' },
    reason: NULLABLE_STRING,
    run_id: NULLABLE_STRING,
    task_id: NULLABLE_STRING,
    task_revision: { type: ['integer', 'null'] },
    state: NULLABLE_STRING,
    created_at: NULLABLE_STRING,
    updated_at: NULLABLE_STRING,
    frozen: { type: ['object', 'null'] },
    budget: { type: ['object', 'null'] },
    task_summary: { type: ['object', 'null'] },
    versions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          candidate_id: { type: 'string' },
          parent_candidate_id: NULLABLE_STRING,
          status: NULLABLE_STRING,
          created_at: NULLABLE_STRING,
          step_sha256: NULLABLE_STRING,
          report_id: NULLABLE_STRING,
          overall: NULLABLE_STRING,
          report_created_at: NULLABLE_STRING,
          validator_version: NULLABLE_STRING,
          report_file_sha256: NULLABLE_STRING,
          report_sha256: NULLABLE_STRING,
          files: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, bytes: NULLABLE_NUMBER, sha256: NULLABLE_STRING },
              required: ['name'],
              additionalProperties: false,
            },
          },
        },
        required: ['candidate_id'],
        additionalProperties: false,
      },
    },
    exports: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          candidate_id: { type: 'string' },
          report_id: NULLABLE_STRING,
          export_dir: NULLABLE_STRING,
          step_sha256: NULLABLE_STRING,
          report_file_sha256: NULLABLE_STRING,
          report_sha256: NULLABLE_STRING,
          failed: { type: 'boolean' },
          exported_at: NULLABLE_STRING,
        },
        required: ['candidate_id'],
        additionalProperties: false,
      },
    },
  },
  required: ['found'],
  additionalProperties: false,
}

async function runHandler(input, serviceCtx, config) {
  const manifest = input.run_id
    ? await loadRunForSession(serviceCtx, config, input.run_id, input.session_key)
    : await latestRunForSession(serviceCtx, config, input.session_key)
  if (!manifest) {
    return { found: false, reason: input.run_id ? 'RUN_NOT_AVAILABLE_FOR_SESSION' : 'NO_RUN_FOR_SESSION' }
  }
  const task = await frozenJson(serviceCtx, config, manifest.run_id, 'task.json')
  return {
    found: true,
    reason: null,
    run_id: manifest.run_id,
    task_id: manifest.task_id,
    task_revision: manifest.task_revision,
    state: manifest.status,
    created_at: manifest.created_at ?? null,
    updated_at: manifest.updated_at ?? null,
    frozen: manifest.frozen ?? null,
    budget: manifest.budget ?? null,
    task_summary: task ? taskSummary(task) : null,
    versions: versionSummaries(manifest),
    exports: exportSummaries(manifest),
  }
}

// ---------------------------------------------------------------------------
// fitplate.scene
// ---------------------------------------------------------------------------

const SCENE_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    session_key: SESSION_KEY_SCHEMA,
    run_id: RUN_ID_SCHEMA,
    candidate_id: CANDIDATE_ID_SCHEMA,
  },
  required: ['session_key', 'run_id', 'candidate_id'],
  additionalProperties: false,
}

const SCENE_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    found: { type: 'boolean' },
    reason: NULLABLE_STRING,
    run_id: NULLABLE_STRING,
    candidate_id: NULLABLE_STRING,
    task_id: NULLABLE_STRING,
    task_revision: { type: ['integer', 'null'] },
    binding: { type: ['object', 'null'] },
    device: { type: ['object', 'null'] },
    scene: { type: ['object', 'null'] },
    task: { type: ['object', 'null'] },
    report: { type: ['object', 'null'] },
    evidence: { type: ['object', 'null'] },
    mesh: { type: ['object', 'null'] },
    mesh_blocked: { type: ['object', 'null'] },
    design: { type: ['object', 'null'] },
    design_blocked: { type: ['object', 'null'] },
  },
  required: ['found'],
  additionalProperties: false,
}

/**
 * Check the registered design document against the run's frozen task identity.
 *
 * The document is submitted data the panel displays (a design diff), never a measured result -
 * but it must at least describe THIS run's task and revision: a candidate may never be shown
 * next to another revision's design. Returns a block description or null.
 */
function designBindingProblem(document, manifest) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    return { reason: 'DESIGN_INVALID', message: 'the registered design.json is not a JSON object' }
  }
  if (document.task_id !== manifest.task_id) {
    return {
      reason: 'DESIGN_TASK_MISMATCH',
      message: `the registered design belongs to task ${JSON.stringify(document.task_id)}, not ${JSON.stringify(manifest.task_id)}`,
    }
  }
  if (document.task_revision !== manifest.task_revision) {
    return {
      reason: 'DESIGN_TASK_MISMATCH',
      message: `the registered design is for task revision ${JSON.stringify(document.task_revision)}, not ${JSON.stringify(manifest.task_revision)}`,
    }
  }
  return null
}

async function sceneHandler(input, serviceCtx, config) {
  const manifest = await loadRunForSession(serviceCtx, config, input.run_id, input.session_key)
  if (!manifest) return { found: false, reason: 'RUN_NOT_AVAILABLE_FOR_SESSION' }
  const candidate = manifest.candidates?.[input.candidate_id]
  if (!candidate) return { found: false, reason: 'CANDIDATE_NOT_FOUND' }

  const sceneDoc = await frozenJson(serviceCtx, config, manifest.run_id, 'scene.json')
  const task = await frozenJson(serviceCtx, config, manifest.run_id, 'task.json')

  // The mesh comes from the candidate's own recorded artefact; its binding to
  // this candidate and this STEP is checked before anything is returned.
  let mesh = null
  let meshBlocked = null
  let meshRecord = null
  try {
    const { bytes, record } = await readRegisteredFile(serviceCtx, config, manifest.run_id, input.candidate_id, 'preview_mesh.json', {
      maxBytes: 2 * 1024 * 1024,
    })
    meshRecord = record
    const parsed = JSON.parse(textDecoder.decode(bytes))
    if (parsed.candidate_id !== input.candidate_id || parsed.step_sha256 !== candidate.hashes?.step_sha256) {
      meshBlocked = { reason: 'MESH_BINDING_MISMATCH', message: 'the recorded mesh does not bind this candidate and STEP hash' }
    } else {
      mesh = {
        encoding: 'json-arrays',
        candidate_id: parsed.candidate_id,
        step_sha256: parsed.step_sha256,
        triangle_count: Array.isArray(parsed.indices) ? Math.floor(parsed.indices.length / 3) : null,
        tolerance_mm: parsed.tolerance_mm ?? null,
        angular_tolerance_rad: parsed.angular_tolerance_rad ?? null,
        bounds: parsed.bounds ?? null,
        vertices: parsed.vertices ?? [],
        indices: parsed.indices ?? [],
        bytes: bytes.byteLength,
        sha256: record.sha256,
      }
    }
  } catch (error) {
    if (error?.kind === 'business' && error.code === 'UNKNOWN_ARTIFACT') {
      meshBlocked = { reason: 'MESH_NOT_RECORDED', message: 'this candidate has no registered preview_mesh.json' }
    } else if (error?.kind === 'business') {
      meshBlocked = { reason: error.code, message: error.message }
    } else {
      throw error
    }
  }

  // The full report and evidence as recorded (hash-verified reads), so the panel
  // can show measured values, not just the manifest's summary.
  const report = await registeredJson(serviceCtx, config, manifest.run_id, input.candidate_id, 'report.json')
  const evidence = await registeredJson(serviceCtx, config, manifest.run_id, input.candidate_id, 'evidence.json')

  // The submitted design document as registered with this candidate (raw bytes hash-verified
  // against the manifest by readRegisteredFile). `manifest.candidates[..].design_sha256` is the
  // bridge's own content hash of the submitted document and the candidate's `files` entry is the
  // RAW file hash - the two are different namespaces and are both carried as identity, never
  // conflated and never recomputed here in a second recipe. A historical run without a
  // registered design answers null (compatible); a registered design that is unreadable,
  // oversized, malformed or bound to another task/revision is withheld with an explicit
  // design_blocked reason instead of being shown.
  let design = null
  let designBlocked = null
  try {
    const { bytes } = await readRegisteredFile(serviceCtx, config, manifest.run_id, input.candidate_id, 'design.json', {
      maxBytes: MAX_DESIGN_BYTES,
    })
    let parsed
    try {
      parsed = JSON.parse(textDecoder.decode(bytes))
    } catch {
      parsed = undefined
      designBlocked = { reason: 'DESIGN_INVALID', message: 'the registered design.json is not valid UTF-8 JSON' }
    }
    if (parsed !== undefined) {
      const problem = designBindingProblem(parsed, manifest)
      if (problem !== null) designBlocked = problem
      else design = parsed
    }
  } catch (error) {
    if (error?.kind === 'business' && error.code === 'UNKNOWN_ARTIFACT') {
      // Not registered at all: a historical run simply has no design document to show.
      designBlocked = null
    } else if (error?.kind === 'business') {
      designBlocked = { reason: error.code, message: error.message }
    } else if (error?.kind === 'execution' && error.code === 'ARTIFACT_UNREADABLE') {
      designBlocked = { reason: 'DESIGN_UNREADABLE', message: 'the registered design.json could not be read' }
    } else {
      throw error
    }
  }
  const designFileSha256 = (candidate.files ?? []).find((entry) => entry?.name === 'design.json')?.sha256 ?? null

  const reportSummary = candidate.report
    ? {
        report_id: candidate.report.report_id ?? null,
        overall: candidate.report.overall ?? null,
        created_at: candidate.report.created_at ?? null,
        validator_version: candidate.report.validator_version ?? null,
        validator_code_sha256: candidate.validator_code_sha256 ?? null,
        report_sha256: candidate.report.report_sha256 ?? null,
        checks: candidate.report.checks ?? [],
      }
    : null

  // The device is drawn at the pose measured from the actual STEP (G04); the
  // submitted design center is only a fallback and is explicitly unverified.
  const measuredPose = evidence?.sensor_group?.derived_pose ?? null
  const device = measuredPose
    ? {
        center_xy: measuredPose.center_xy ?? null,
        rotation_deg: task?.sensor?.allowed_rotation_deg?.[0] ?? 0,
        source: 'g04-measured',
        verified: true,
        pose_status: evidence?.sensor_group?.pose_status ?? null,
        worst_deviation_mm: measuredPose.worst_deviation_mm ?? null,
      }
    : {
        center_xy: candidate.design_summary?.sensor_center_xy ?? null,
        rotation_deg: candidate.design_summary?.sensor_rotation_deg ?? 0,
        source: 'design-fallback',
        verified: false,
        pose_status: null,
        worst_deviation_mm: null,
        warning: 'this pose was not measured from the artefact; do not render it as an accepted result',
      }

  // Reaching this point means every block below was read *and* matched the
  // hash the run store recorded (an integrity failure throws above); a blocked
  // mesh is only "unverified" when the mesh itself failed its binding.
  const integrityFailure = ['ARTEFACT_HASH_MISMATCH', 'MESH_BINDING_MISMATCH'].includes(meshBlocked?.reason)
  const response = {
    found: true,
    reason: null,
    run_id: manifest.run_id,
    candidate_id: input.candidate_id,
    task_id: manifest.task_id,
    task_revision: manifest.task_revision,
    binding: {
      candidate_id: input.candidate_id,
      step_sha256: candidate.hashes?.step_sha256 ?? null,
      preview_sha256: candidate.hashes?.preview_sha256 ?? null,
      preview_mesh_sha256: candidate.hashes?.preview_mesh_sha256 ?? null,
      report_id: reportSummary?.report_id ?? null,
      report_overall: reportSummary?.overall ?? null,
      validator_version: reportSummary?.validator_version ?? null,
      validator_code_sha256: candidate.validator_code_sha256 ?? null,
      report_sha256: reportSummary?.report_sha256 ?? null,
      report_file_sha256: (candidate.files ?? []).find((file) => file.name === 'report.json')?.sha256 ?? null,
      // Two distinct identities, never conflated: the RAW registered-file hash of the bytes
      // that were read and verified here, and the bridge's own content hash of the submitted
      // design document as recorded with the candidate.
      design_file_sha256: designFileSha256,
      design_sha256: candidate.design_sha256 ?? null,
      verified: !integrityFailure,
    },
    device,
    scene: sceneDoc ?? null,
    task: task ? taskSummary(task) : null,
    report: report ?? reportSummary,
    evidence: evidence ?? null,
    mesh,
    mesh_blocked: meshBlocked,
    // The submitted design document itself (display data for the version diff, never a
    // measured result); null without a registered design, withheld with design_blocked when
    // it fails its identity or integrity checks.
    design,
    design_blocked: designBlocked,
  }

  // Bound the response: the mesh is dropped (and the panel told why) rather
  // than silently sending a truncated or over-budget payload.
  if (byteLength(response) > MAX_SCENE_RESPONSE_BYTES) {
    response.mesh_blocked = {
      reason: 'SCENE_RESPONSE_BUDGET',
      message: `the full mesh would exceed ${MAX_SCENE_RESPONSE_BYTES} bytes; fetch it in chunks via fitplate.artifact`,
      artifact_id: meshRecord ? meshRecord.name : null,
      artifact_sha256: meshRecord ? meshRecord.sha256 : null,
      total_bytes: meshRecord ? meshRecord.bytes : null,
    }
    response.mesh = null
  }
  if (byteLength(response) > MAX_SCENE_RESPONSE_BYTES) {
    // Still too large even without the mesh: drop the heaviest optional block.
    response.evidence = null
    response.mesh_blocked = { ...(response.mesh_blocked ?? {}), evidence_dropped: true }
  }
  return response
}

// ---------------------------------------------------------------------------
// fitplate.artifact
// ---------------------------------------------------------------------------

const ARTIFACT_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    session_key: SESSION_KEY_SCHEMA,
    run_id: RUN_ID_SCHEMA,
    candidate_id: CANDIDATE_ID_SCHEMA,
    artifact_id: { type: 'string', minLength: 1, maxLength: 128, pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$' },
    offset: { type: 'integer', minimum: 0, maximum: 512 * 1024 * 1024 },
    limit: { type: 'integer', minimum: 1, maximum: MAX_ARTIFACT_CHUNK_BYTES },
  },
  required: ['session_key', 'run_id', 'candidate_id', 'artifact_id'],
  additionalProperties: false,
}

const ARTIFACT_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    found: { type: 'boolean' },
    reason: NULLABLE_STRING,
    message: NULLABLE_STRING,
    run_id: NULLABLE_STRING,
    candidate_id: NULLABLE_STRING,
    artifact_id: NULLABLE_STRING,
    encoding: NULLABLE_STRING,
    offset: NULLABLE_NUMBER,
    limit: NULLABLE_NUMBER,
    bytes: NULLABLE_NUMBER,
    total_bytes: NULLABLE_NUMBER,
    eof: { type: ['boolean', 'null'] },
    sha256: NULLABLE_STRING,
    chunk_sha256: NULLABLE_STRING,
    chunk_base64: NULLABLE_STRING,
  },
  required: ['found'],
  additionalProperties: false,
}

async function artifactHandler(input, serviceCtx, config) {
  const manifest = await loadRunForSession(serviceCtx, config, input.run_id, input.session_key)
  if (!manifest) return { found: false, reason: 'RUN_NOT_AVAILABLE_FOR_SESSION' }
  if (!manifest.candidates?.[input.candidate_id]) return { found: false, reason: 'CANDIDATE_NOT_FOUND' }

  const limit = Number.isInteger(input.limit) ? input.limit : MAX_ARTIFACT_CHUNK_BYTES
  if (limit > MAX_ARTIFACT_CHUNK_BYTES) {
    return { found: false, reason: 'CHUNK_LIMIT_EXCEEDED', message: `limit must be <= ${MAX_ARTIFACT_CHUNK_BYTES} bytes` }
  }
  if (limit < 1) return { found: false, reason: 'CHUNK_LIMIT_EXCEEDED', message: 'limit must be at least 1 byte' }

  let bytes
  let record
  try {
    // readRegisteredFile verifies size before reading and the SHA-256 after:
    // bytes that no longer match their recorded hash are never returned.
    ;({ bytes, record } = await readRegisteredFile(serviceCtx, config, manifest.run_id, input.candidate_id, input.artifact_id))
  } catch (error) {
    if (error?.kind === 'business') return { found: false, reason: error.code, message: error.message }
    throw error
  }

  const offset = Number.isInteger(input.offset) ? input.offset : 0
  if (offset > bytes.byteLength) {
    return { found: false, reason: 'OFFSET_OUT_OF_RANGE', message: `offset ${offset} is past the end of the file` }
  }
  const chunk = bytes.subarray(offset, Math.min(offset + limit, bytes.byteLength))
  return {
    found: true,
    reason: null,
    run_id: manifest.run_id,
    candidate_id: input.candidate_id,
    artifact_id: record.name,
    encoding: 'base64',
    offset,
    limit,
    bytes: chunk.byteLength,
    total_bytes: bytes.byteLength,
    eof: offset + chunk.byteLength >= bytes.byteLength,
    sha256: record.sha256,
    chunk_sha256: createHash('sha256').update(chunk).digest('hex'),
    chunk_base64: Buffer.from(chunk).toString('base64'),
  }
}

// ---------------------------------------------------------------------------
// fitplate.intake
// ---------------------------------------------------------------------------

/**
 * The read-only intake query (P02-05): the current staged request of one session, its
 * program-compiled draft and the registry's task revisions for it - for the confirmation card.
 *
 * Boundaries: every read goes through `serviceCtx.fs`; read sizes are bounded before and after
 * the read; the browser's `session_key` is a consistency filter only, compared exactly against
 * the structured Host key the bridge recorded at stage time (a key that merely prefixes another
 * session's key never matches). The locked stage record in the registry index is the anchor:
 * every stage record is shape/id-validated *before* any path is built from it, and each returned
 * fact (attachment ref, device card, canonical hashes, outcome, staged_at) must agree item-by-item
 * with the stage-authority sidecar written next to the draft bytes at stage time - latest.json is
 * a locator that must agree with both, never a self-certification. Missing, stale, tampered,
 * symlinked or non-UTF-8 state is refused explicitly - never dressed up as a fresh READY draft.
 * A workspace with nothing registered yet (listing succeeds, registry/index genuinely absent, or
 * the stage window before index.json is published) is the one *waiting* state and answers with
 * the frontend's waiting reasons (REQUEST_NOT_STAGED / NO_STAGED_REQUEST_FOR_SESSION); broken,
 * unreadable or wrongly-shaped state is always an explicit refusal instead.
 * This service never executes, never writes, and cannot stand in for the user's real confirmation.
 * It checks internal consistency of the stage files, not cryptographic authorship: a writer able
 * to rewrite the whole workspace consistently is outside this service's threat model (no signing
 * key lives in the workspace, so that boundary is documented rather than pretended).
 */
const INTAKE_REGISTRY_DIR = 'input/intake-registry'
const MAX_INTAKE_INDEX_BYTES = 512 * 1024
const MAX_INTAKE_POINTER_BYTES = 64 * 1024
const MAX_INTAKE_AUTHORITY_BYTES = 64 * 1024
const MAX_INTAKE_DRAFT_BYTES = 128 * 1024
const MAX_INTAKE_STAGES = 1024
const REQUEST_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,40}$/
const SNAPSHOT_DRAFT_FILE_PATTERN = /^r[0-9]{3}-[0-9a-f]{64}\.draft\.json$/
const INTAKE_AUTHORITY_FILE_PATTERN = /^r[0-9]{3}-[0-9a-f]{64}\.stage-authority\.json$/
const INTAKE_HEX64_PATTERN = /^[0-9a-f]{64}$/
const INTAKE_ATTACHMENT_REF_PATTERN = /^session-file:\/\/[0-9]{1,9}\/[0-9]{1,9}$/
const INTAKE_DEVICE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/
const INTAKE_STAGE_FIELDS = ['request_id', 'request_revision', 'request_sha256', 'draft_hash', 'outcome', 'attachment_sha256', 'session_scope', 'staged_at']
const INTAKE_POINTER_FIELDS = ['request_id', 'request_revision', 'request_sha256', 'draft_hash', 'outcome', 'draft_file', 'draft_file_sha256', 'attachment_sha256', 'attachment_ref', 'session_scope', 'host_key', 'host_lane', 'staged_at']

const INTAKE_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    session_key: SESSION_KEY_SCHEMA,
    request_id: { type: 'string', pattern: REQUEST_ID_PATTERN.source, maxLength: 41 },
  },
  required: ['session_key'],
  additionalProperties: false,
}

const INTAKE_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    found: { type: 'boolean' },
    reason: NULLABLE_STRING,
    message: NULLABLE_STRING,
    request_id: NULLABLE_STRING,
    request_revision: NULLABLE_NUMBER,
    outcome: NULLABLE_STRING,
    staged_at: NULLABLE_STRING,
    request_sha256: NULLABLE_STRING,
    attachment_sha256: NULLABLE_STRING,
    attachment_ref: NULLABLE_STRING,
    device_card: { type: ['object', 'null'] },
    draft: { type: ['object', 'null'] },
    task: { type: ['object', 'null'] },
    notes: NULLABLE_STRING,
  },
  required: ['found'],
  additionalProperties: false,
}

const INTAKE_UTF8_DECODER = new TextDecoder('utf-8', { fatal: true })

/**
 * Strict UTF-8: a byte sequence that is not valid UTF-8 refuses. `Buffer.toString('utf8')` (and a
 * non-fatal TextDecoder) would silently replace the bad bytes with U+FFFD and let a mangled file
 * through as if it were the staged bytes.
 */
function decodeIntakeUtf8(bytes) {
  try {
    return { ok: true, text: INTAKE_UTF8_DECODER.decode(bytes) }
  } catch {
    return { ok: false }
  }
}

/**
 * Bounded raw-bytes read through the fenced fs. The Host's `fs.read` treats offset/limit as a
 * line window (it loads the whole file, splits lines and re-encodes), so this reads raw bytes with
 * no options and enforces the byte cap itself - before the read from stat, after it from the
 * buffer length. A symlinked or non-file leaf, an unreliable size, or a file whose size changes
 * between stat and read all refuse.
 */
async function readIntakeFile(serviceCtx, path, maxBytes) {
  const info = await serviceCtx.fs.stat(path)
  if (info?.kind !== 'file') {
    throw businessRefusal('INTAKE_FILE_UNAVAILABLE', `${path} is not a regular file`, { status: 'STALE_INPUT' })
  }
  const size = info.size
  if (typeof size !== 'number' || !Number.isFinite(size) || size < 0) {
    throw businessRefusal('INTAKE_FILE_UNAVAILABLE', `${path} has no reliable size`, { status: 'STALE_INPUT' })
  }
  if (size > maxBytes) {
    throw businessRefusal('INTAKE_FILE_TOO_LARGE', `${path} exceeds the ${maxBytes} byte read cap`, { status: 'INVALID_SPEC' })
  }
  const bytes = await serviceCtx.fs.read(path)
  if (!bytes || typeof bytes.byteLength !== 'number' || bytes.byteLength > maxBytes) {
    throw businessRefusal('INTAKE_FILE_TOO_LARGE', `${path} returned more than the ${maxBytes} byte read cap`, { status: 'INVALID_SPEC' })
  }
  if (bytes.byteLength !== size) {
    throw businessRefusal('INTAKE_FILE_UNAVAILABLE', `${path} changed size while it was read`, { status: 'STALE_INPUT' })
  }
  return Buffer.from(bytes)
}

/**
 * `invalidReason` (optional): what an *unparseable but present* document means. Omitted, a
 * document that cannot be parsed keeps its caller's missing/unreadable reason - the snapshot
 * reads rely on that shape; the registry index passes 'REGISTRY_INDEX_INVALID' so an existing
 * but broken index is never mistaken for a not-yet-created one.
 */
async function readIntakeJson(serviceCtx, path, maxBytes, missingReason, { invalidReason } = {}) {
  try {
    const bytes = await readIntakeFile(serviceCtx, path, maxBytes)
    const decoded = decodeIntakeUtf8(bytes)
    if (!decoded.ok) return { ok: false, reason: 'INTAKE_FILE_INVALID', message: `${path} is not valid UTF-8` }
    try {
      return { ok: true, value: JSON.parse(decoded.text), bytes }
    } catch {
      return { ok: false, reason: invalidReason ?? missingReason, message: `${path} is not valid JSON` }
    }
  } catch (error) {
    if (error?.kind === 'business') return { ok: false, reason: error.code, message: error.message }
    return { ok: false, reason: missingReason, message: `${path} could not be read` }
  }
}

/** List one directory through the Host fs, distinguishing "not there" from "could not list". */
async function listIntakeDir(serviceCtx, path, listCache) {
  const cached = listCache.get(path)
  if (cached !== undefined) return cached
  let result
  try {
    const entries = await serviceCtx.fs.list(path)
    result = Array.isArray(entries) ? { ok: true, entries } : { ok: false }
  } catch {
    result = { ok: false }
  }
  if (result.ok) listCache.set(path, result)
  return result
}

/**
 * Walk directory components with list() and report one status:
 *   'ok'         every component is a plain directory;
 *   'missing'    a listing succeeded and the next component is genuinely absent;
 *   'symlink'    a component is a symlink (list reports symlinks faithfully; fs.stat resolves
 *                parents and would hide exactly this - "only the final component is then stat'ed
 *                unresolved" in the host's fs view);
 *   'nondir'     a component exists but is not a directory;
 *   'unreadable' the listing itself failed (permission/IO/anything else) - never "absent".
 * Only a successful listing may conclude absence: nothing here parses an error message to
 * pretend ENOENT, so the fresh-workspace wait can never swallow a real IO or permission error.
 */
async function walkIntakeDirs(serviceCtx, dirs, listCache) {
  let prefix = ''
  for (const dir of dirs) {
    const parent = prefix === '' ? '.' : prefix
    const listed = await listIntakeDir(serviceCtx, parent, listCache)
    if (!listed.ok) return 'unreadable'
    const entry = listed.entries.find((row) => row?.name === dir)
    if (!entry) return 'missing'
    if (entry.kind === 'symlink') return 'symlink'
    if (entry.kind !== 'dir') return 'nondir'
    prefix = prefix === '' ? dir : `${prefix}/${dir}`
  }
  return 'ok'
}

const isBoundedIntakeString = (value, maxLength) => typeof value === 'string' && value.length > 0 && value.length <= maxLength

/**
 * Validate one index stage record - shape, id safety domain, bounded revision, hashes, scope -
 * before any path is built from it. Returns a problem description, or null when the record is
 * usable. A record that fails here is refused outright; nothing derived from it is stat'ed,
 * listed or read.
 */
function intakeStageRecordProblem(record, key) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return 'record is not an object'
  if (typeof key !== 'string' || !REQUEST_ID_PATTERN.test(key)) return 'index key is not a safe request id'
  if (record.request_id !== key) return 'record.request_id does not equal its index key'
  if (!Number.isInteger(record.request_revision) || record.request_revision < 1 || record.request_revision > 1000) return 'request_revision is not a bounded integer'
  if (!isBoundedIntakeString(record.request_sha256, 64) || !INTAKE_HEX64_PATTERN.test(record.request_sha256)) return 'request_sha256 is not 64 hex characters'
  if (!isBoundedIntakeString(record.draft_hash, 64) || !INTAKE_HEX64_PATTERN.test(record.draft_hash)) return 'draft_hash is not 64 hex characters'
  if (!isBoundedIntakeString(record.attachment_sha256, 64) || !INTAKE_HEX64_PATTERN.test(record.attachment_sha256)) return 'attachment_sha256 is not 64 hex characters'
  if (!isBoundedIntakeString(record.device_card_id, 64) || !INTAKE_DEVICE_ID_PATTERN.test(record.device_card_id)) return 'device_card_id is not a safe device id'
  if (!isBoundedIntakeString(record.device_card_sha256, 64) || !INTAKE_HEX64_PATTERN.test(record.device_card_sha256)) return 'device_card_sha256 is not 64 hex characters'
  if (!isBoundedIntakeString(record.session_scope, 256)) return 'session_scope is not a bounded string'
  if (record.outcome !== undefined && record.outcome !== null && typeof record.outcome !== 'string') return 'outcome is neither null nor a string'
  if (!isBoundedIntakeString(record.staged_at, 64)) return 'staged_at is not a bounded string'
  return null
}

/** Validate the stage-authority sidecar the bridge wrote next to the draft bytes. */
function intakeAuthorityProblem(authority) {
  if (!authority || typeof authority !== 'object' || Array.isArray(authority)) return 'authority is not an object'
  if (authority.kind !== 'fitplate-intake-stage-authority') return 'authority kind mismatch'
  if (!isBoundedIntakeString(authority.request_id, 41) || !REQUEST_ID_PATTERN.test(authority.request_id)) return 'authority request_id is not a safe request id'
  if (!Number.isInteger(authority.request_revision) || authority.request_revision < 1 || authority.request_revision > 1000) return 'authority request_revision is not a bounded integer'
  if (!isBoundedIntakeString(authority.request_sha256, 64) || !INTAKE_HEX64_PATTERN.test(authority.request_sha256)) return 'authority request_sha256 is not 64 hex characters'
  if (!isBoundedIntakeString(authority.draft_hash, 64) || !INTAKE_HEX64_PATTERN.test(authority.draft_hash)) return 'authority draft_hash is not 64 hex characters'
  if (!isBoundedIntakeString(authority.attachment_sha256, 64) || !INTAKE_HEX64_PATTERN.test(authority.attachment_sha256)) return 'authority attachment_sha256 is not 64 hex characters'
  if (authority.outcome !== null && authority.outcome !== undefined && typeof authority.outcome !== 'string') return 'authority outcome is neither null nor a string'
  if (!isBoundedIntakeString(authority.session_scope, 256)) return 'authority session_scope is not a bounded string'
  if (!isBoundedIntakeString(authority.host_key, 256)) return 'authority host_key is not a bounded string'
  if (!isBoundedIntakeString(authority.host_lane, 64)) return 'authority host_lane is not a bounded string'
  if (authority.attachment_ref !== null && !(isBoundedIntakeString(authority.attachment_ref, 512) && INTAKE_ATTACHMENT_REF_PATTERN.test(authority.attachment_ref))) return 'authority attachment_ref is neither null nor a session-file reference'
  if (!authority.device_card || typeof authority.device_card !== 'object' || Array.isArray(authority.device_card)) return 'authority device_card is not an object'
  if (!isBoundedIntakeString(authority.device_card.id, 64) || !INTAKE_DEVICE_ID_PATTERN.test(authority.device_card.id)) return 'authority device_card.id is not a safe device id'
  if (!isBoundedIntakeString(authority.device_card.sha256, 64) || !INTAKE_HEX64_PATTERN.test(authority.device_card.sha256)) return 'authority device_card.sha256 is not 64 hex characters'
  if (!isBoundedIntakeString(authority.draft_file, 80) || !SNAPSHOT_DRAFT_FILE_PATTERN.test(authority.draft_file)) return 'authority draft_file is not a snapshot draft name'
  if (!isBoundedIntakeString(authority.draft_file_sha256, 64) || !INTAKE_HEX64_PATTERN.test(authority.draft_file_sha256)) return 'authority draft_file_sha256 is not 64 hex characters'
  if (!isBoundedIntakeString(authority.staged_at, 64)) return 'authority staged_at is not a bounded string'
  return null
}

/** Which field (if any) the authority sidecar does not echo verbatim from the locked stage record. */
function intakeAuthorityEchoesRecord(authority, record) {
  for (const field of INTAKE_STAGE_FIELDS) {
    if ((authority[field] ?? null) !== (record[field] ?? null)) return field
  }
  if (authority.device_card.id !== record.device_card_id) return 'device_card.id'
  if (authority.device_card.sha256 !== record.device_card_sha256) return 'device_card.sha256'
  const expectedDraftFile = `r${String(record.request_revision).padStart(3, '0')}-${record.draft_hash}.draft.json`
  if (authority.draft_file !== expectedDraftFile) return 'draft_file'
  return null
}

/** Which pointer field (if any) disagrees with the authority sidecar; the pointer only locates. */
function intakePointerMismatch(snapshot, authority, authorityFile) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return 'pointer'
  if (snapshot.kind !== 'fitplate-intake-snapshot') return 'kind'
  for (const field of INTAKE_POINTER_FIELDS) {
    if ((snapshot[field] ?? null) !== (authority[field] ?? null)) return field
  }
  if (!snapshot.device_card || typeof snapshot.device_card !== 'object') return 'device_card'
  if (snapshot.device_card.id !== authority.device_card.id) return 'device_card.id'
  if (snapshot.device_card.sha256 !== authority.device_card.sha256) return 'device_card.sha256'
  if (snapshot.authority_file !== authorityFile) return 'authority_file'
  return null
}

async function intakeHandler(input, serviceCtx) {
  const listCache = new Map()
  // The fresh-workspace wait: before the model's first stage there is simply nothing registered,
  // and the frontend keeps polling on the two waiting reasons. "Genuinely absent" is only
  // concluded from a successful listing that shows the component missing, or a registry
  // directory whose index.json has not been atomically published yet (the stage window between
  // mkdir and os.replace). A failed listing (permission/IO), a non-directory or a symlink stays
  // an explicit error - presence errors are never dressed up as "wait".
  const pending = input.request_id !== undefined
    ? { found: false, reason: 'REQUEST_NOT_STAGED', message: `request ${input.request_id} is not staged in this workspace` }
    : { found: false, reason: 'NO_STAGED_REQUEST_FOR_SESSION', message: 'this session has no staged request in this workspace' }
  const registryWalk = await walkIntakeDirs(serviceCtx, ['input', 'intake-registry'], listCache)
  if (registryWalk === 'missing') return { ...pending }
  if (registryWalk === 'symlink') return { found: false, reason: 'PATH_UNSAFE', message: 'the intake registry path contains a symlink' }
  if (registryWalk === 'nondir') return { found: false, reason: 'REGISTRY_NOT_AVAILABLE', message: 'the intake registry path exists but is not a directory' }
  if (registryWalk === 'unreadable') return { found: false, reason: 'REGISTRY_NOT_AVAILABLE', message: 'the intake registry could not be listed' }
  const registryListing = await listIntakeDir(serviceCtx, INTAKE_REGISTRY_DIR, listCache)
  if (!registryListing.ok) return { found: false, reason: 'REGISTRY_NOT_AVAILABLE', message: 'the intake registry could not be listed' }
  const indexEntry = registryListing.entries.find((row) => row?.name === 'index.json')
  if (!indexEntry) return { ...pending }
  if (indexEntry.kind === 'symlink') return { found: false, reason: 'PATH_UNSAFE', message: 'the intake registry index is a symlink' }
  if (indexEntry.kind !== 'file') return { found: false, reason: 'REGISTRY_INDEX_INVALID', message: 'the intake registry index is not a regular file' }
  const index = await readIntakeJson(serviceCtx, `${INTAKE_REGISTRY_DIR}/index.json`, MAX_INTAKE_INDEX_BYTES, 'REGISTRY_NOT_AVAILABLE', { invalidReason: 'REGISTRY_INDEX_INVALID' })
  if (!index.ok) return { found: false, reason: index.reason, message: index.message }
  const stages = index.value?.stages
  if (index.value?.kind !== 'fitplate-intake-registry' || !stages || typeof stages !== 'object' || Array.isArray(stages)) {
    return { found: false, reason: 'REGISTRY_INDEX_INVALID', message: 'the registry index is not a fitplate intake registry' }
  }
  const entries = Object.entries(stages)
  if (entries.length > MAX_INTAKE_STAGES) {
    return { found: false, reason: 'REGISTRY_INDEX_INVALID', message: `the registry index lists more than ${MAX_INTAKE_STAGES} staged requests` }
  }
  // Every record is validated before any path is built from it; a bad record refuses the query
  // rather than steering a stat/list/read somewhere unvetted.
  const validated = []
  for (const [key, record] of entries) {
    const problem = intakeStageRecordProblem(record, key)
    if (problem !== null) {
      return { found: false, reason: 'STAGE_RECORD_INVALID', message: `the index record ${key} is invalid (${problem})` }
    }
    validated.push([key, record])
  }
  // Load the stage-authority sidecars (the stage-time identity written next to the draft bytes).
  // In latest mode every record needs one: selecting a session's latest without exact Host keys
  // would fall back to guessing from scope strings. In request mode only the chosen record's
  // authority is needed.
  const wanted = input.request_id !== undefined ? validated.filter(([key]) => key === input.request_id) : validated
  if (input.request_id !== undefined && wanted.length === 0) {
    return { found: false, reason: 'REQUEST_NOT_STAGED', message: `request ${input.request_id} is not staged in this workspace` }
  }
  const authorities = new Map()
  for (const [key, record] of wanted) {
    const entryWalk = await walkIntakeDirs(serviceCtx, ['input', 'intake-registry', 'snapshots', key], listCache)
    if (entryWalk !== 'ok') {
      // The record is registered; a missing, unreadable or malformed snapshot for it is an
      // explicit refusal (re-stage recovers) - never the fresh-workspace wait.
      return entryWalk === 'symlink'
        ? { found: false, reason: 'PATH_UNSAFE', message: `the snapshot path for ${key} contains a symlink` }
        : { found: false, reason: 'SNAPSHOT_MISSING', message: `request ${key} has no readable persisted snapshot` }
    }
    const authorityFile = `r${String(record.request_revision).padStart(3, '0')}-${record.draft_hash}.stage-authority.json`
    if (!INTAKE_AUTHORITY_FILE_PATTERN.test(authorityFile)) {
      return { found: false, reason: 'SNAPSHOT_INVALID', message: `request ${key} names no valid stage authority` }
    }
    const authorityRead = await readIntakeJson(
      serviceCtx,
      `${INTAKE_REGISTRY_DIR}/snapshots/${key}/${authorityFile}`,
      MAX_INTAKE_AUTHORITY_BYTES,
      'SNAPSHOT_MISSING',
    )
    if (!authorityRead.ok) return { found: false, reason: authorityRead.reason, message: authorityRead.message }
    const authorityProblem = intakeAuthorityProblem(authorityRead.value)
    if (authorityProblem !== null) {
      return { found: false, reason: 'SNAPSHOT_TAMPERED', message: `the stage authority for ${key} is invalid (${authorityProblem})` }
    }
    const echoed = intakeAuthorityEchoesRecord(authorityRead.value, record)
    if (echoed !== null) {
      return { found: false, reason: 'SNAPSHOT_TAMPERED', message: `the stage authority for ${key} disagrees with the stage record (${echoed})` }
    }
    authorities.set(key, { value: authorityRead.value, bytes: authorityRead.bytes, file: authorityFile })
  }
  // Session selection: exact Host key equality against the stage-time identity - never a prefix
  // of session_scope, which would let a key that prefixes another session's key match it.
  let chosen = null
  if (input.request_id !== undefined) {
    chosen = wanted[0]
  } else {
    for (const entry of wanted) {
      const authority = authorities.get(entry[0])
      if (authority.value.host_key !== input.session_key) continue
      if (
        chosen === null ||
        String(entry[1].staged_at) > String(chosen[1].staged_at) ||
        (String(entry[1].staged_at) === String(chosen[1].staged_at) && entry[1].request_revision > chosen[1].request_revision) ||
        (String(entry[1].staged_at) === String(chosen[1].staged_at) && entry[1].request_revision === chosen[1].request_revision && entry[0] > chosen[0])
      ) {
        chosen = entry
      }
    }
    if (chosen === null) {
      return { found: false, reason: 'NO_STAGED_REQUEST_FOR_SESSION', message: 'this session has no staged request in this workspace' }
    }
  }
  const [requestId, record] = chosen
  const authority = authorities.get(requestId)
  if (authority.value.host_key !== input.session_key) {
    return { found: false, reason: 'SESSION_MISMATCH', message: 'the staged request belongs to another session' }
  }
  const entryDir = `${INTAKE_REGISTRY_DIR}/snapshots/${requestId}`
  const pointer = await readIntakeJson(serviceCtx, `${entryDir}/latest.json`, MAX_INTAKE_POINTER_BYTES, 'SNAPSHOT_MISSING')
  if (!pointer.ok) return { found: false, reason: pointer.reason, message: pointer.message }
  const pointerMismatch = intakePointerMismatch(pointer.value, authority.value, authority.file)
  if (pointerMismatch !== null) {
    return { found: false, reason: 'SNAPSHOT_TAMPERED', message: `the snapshot pointer disagrees with the stage authority (${pointerMismatch})` }
  }
  if (createHash('sha256').update(authority.bytes).digest('hex') !== pointer.value.authority_sha256) {
    return { found: false, reason: 'SNAPSHOT_TAMPERED', message: 'the stage authority bytes do not match their recorded hash' }
  }
  let draftBytes
  try {
    draftBytes = await readIntakeFile(serviceCtx, `${entryDir}/${authority.value.draft_file}`, MAX_INTAKE_DRAFT_BYTES)
  } catch (error) {
    if (error?.kind === 'business') return { found: false, reason: error.code, message: error.message }
    return { found: false, reason: 'SNAPSHOT_MISSING', message: 'the snapshot draft bytes are unavailable' }
  }
  if (createHash('sha256').update(draftBytes).digest('hex') !== authority.value.draft_file_sha256) {
    return { found: false, reason: 'SNAPSHOT_TAMPERED', message: 'the snapshot draft bytes do not match the stage-bound hash' }
  }
  const draftDecoded = decodeIntakeUtf8(draftBytes)
  if (!draftDecoded.ok) return { found: false, reason: 'SNAPSHOT_INVALID', message: 'the snapshot draft is not valid UTF-8' }
  let draft
  try {
    draft = JSON.parse(draftDecoded.text)
  } catch {
    return { found: false, reason: 'SNAPSHOT_INVALID', message: 'the snapshot draft is not valid JSON' }
  }
  if (draft?.draft_hash !== record.draft_hash || draft?.request_id !== record.request_id || draft?.request_revision !== record.request_revision) {
    return { found: false, reason: 'SNAPSHOT_STALE', message: 'the draft content does not belong to the staged index record' }
  }
  const taskId = `user-${record.request_id}`
  const taskEntry = (index.value.tasks ?? {})[taskId] ?? null
  const revisions = Array.isArray(taskEntry?.revisions)
    ? taskEntry.revisions.slice(0, 64).map((row) => ({
        revision: row?.revision ?? null,
        request_revision: row?.request_revision ?? null,
        draft_hash: typeof row?.draft_hash === 'string' ? row.draft_hash : null,
      }))
    : []
  return {
    found: true,
    reason: null,
    message: null,
    request_id: record.request_id,
    request_revision: record.request_revision,
    outcome: record.outcome ?? null,
    staged_at: record.staged_at,
    request_sha256: record.request_sha256,
    attachment_sha256: record.attachment_sha256,
    attachment_ref: authority.value.attachment_ref,
    device_card: authority.value.device_card,
    draft,
    task: { task_id: taskId, latest_revision: taskEntry?.latest_revision ?? null, revisions },
    notes: 'staged index record + stage authority + snapshot pointer verified item-by-item; this query proves neither execution nor the user confirmation and is not a substitute for them',
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function buildServices({ config, log }) {
  const services = [
    {
      name: 'fitplate.run',
      kind: 'query',
      inputSchema: RUN_INPUT_SCHEMA,
      outputSchema: RUN_OUTPUT_SCHEMA,
      timeoutMs: SERVICE_TIMEOUT_MS,
      maxResultBytes: 256 * 1024,
      handler: (input, serviceCtx) => runHandler(input, serviceCtx, config),
    },
    {
      name: 'fitplate.scene',
      kind: 'query',
      inputSchema: SCENE_INPUT_SCHEMA,
      outputSchema: SCENE_OUTPUT_SCHEMA,
      timeoutMs: SERVICE_TIMEOUT_MS,
      maxResultBytes: MAX_SCENE_RESPONSE_BYTES,
      handler: (input, serviceCtx) => sceneHandler(input, serviceCtx, config),
    },
    {
      name: 'fitplate.artifact',
      kind: 'query',
      inputSchema: ARTIFACT_INPUT_SCHEMA,
      outputSchema: ARTIFACT_OUTPUT_SCHEMA,
      timeoutMs: SERVICE_TIMEOUT_MS,
      maxResultBytes: 256 * 1024,
      handler: (input, serviceCtx) => artifactHandler(input, serviceCtx, config),
    },
    {
      name: 'fitplate.intake',
      kind: 'query',
      inputSchema: INTAKE_INPUT_SCHEMA,
      outputSchema: INTAKE_OUTPUT_SCHEMA,
      timeoutMs: SERVICE_TIMEOUT_MS,
      maxResultBytes: 256 * 1024,
      handler: (input, serviceCtx) => intakeHandler(input, serviceCtx, config),
    },
  ]
  log?.info?.(`fitplate plugin registered ${services.length} query services`)
  return services
}
