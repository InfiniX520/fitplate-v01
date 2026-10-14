/**
 * Service adapter for the three FitPlate query services (Plan1 section 8.4).
 *
 * The browser may only talk to the backend through `ctx.agnes.services.call`;
 * this module is the single place that knows the wire shapes. It is written to
 * be tolerant about *decoration* (extra fields, alternative key spellings that
 * were discussed while the backend was being written) and strict about
 * *identity*: a run, a candidate and a mesh must agree on run_id /
 * candidate_id / step_sha256 before anything reaches the canvas or the UI.
 *
 * It never fabricates a result. When a service is unavailable, when the
 * session has no run, or when a payload does not satisfy the expected shape,
 * the caller gets a typed failure with a Chinese explanation — not an empty
 * "PASS" and not a plausible-looking placeholder mesh.
 *
 * Expected shapes (confirmed against docs/plugin.md once the 005 backend ships;
 * `plugin/client/adapter.test.mjs` pins these behaviours):
 *
 *   fitplate.run  { session_key, run_id? }
 *     -> { run_id, session_key?, state, task_revision, task, versions: [ {
 *            candidate_id, created_at?, step_sha256, stl_sha256?,
 *            report | report_summary: { report_id, overall, task_revision,
 *                                       created_at?, hashes? , checks? },
 *            design_summary?, artifacts?: [ { artifact_id, name, bytes?, sha256?, mime? } ]
 *        } ], latest_candidate_id?, updated_at? }
 *
 *   fitplate.scene { session_key, run_id, candidate_id }
 *     -> { candidate_id, step_sha256, mesh | preview_mesh | {vertices,indices},
 *          task, scene, report?, evidence?, design? }
 *
 *   fitplate.artifact { session_key, run_id, candidate_id, artifact_id, offset, limit }
 *     -> { artifact_id, offset, data, encoding: 'base64'|'utf8', eof,
 *          total_bytes?, sha256? }
 */

import { isCandidateId, isSha256, normalizeSha256, type PreviewMeshPayload } from './mesh.ts'
import {
  parseDesignSummary,
  parseReport,
  parseTask,
  reportFromSummary,
  type DesignSummary,
  type ReportView,
  type TaskView,
} from './scene-model.ts'

export const SERVICE_RUN = 'fitplate.run'
export const SERVICE_SCENE = 'fitplate.scene'
export const SERVICE_ARTIFACT = 'fitplate.artifact'

/** Chunk ceiling from the backend contract: 64 KiB per artifact read. */
export const ARTIFACT_CHUNK_BYTES = 64 * 1024
/** Local safety cap for a whole artifact assembled out of chunks (STEP/STL cap at 8 MiB each). */
export const ARTIFACT_MAX_BYTES = 32 * 1024 * 1024

export type ServiceCaller = (name: string, input: Record<string, unknown>) => Promise<unknown>

export type AdapterErrorCode =
  | 'SERVICE_UNAVAILABLE'
  | 'NO_SESSION'
  | 'NO_RUN'
  | 'NOT_FOUND'
  | 'TRANSPORT'
  | 'SHAPE'
  | 'IDENTITY_MISMATCH'
  | 'CHUNK'
  | 'HASH_MISMATCH'
  | 'TOO_LARGE'
  | 'REFUSED'

export class AdapterError extends Error {
  readonly code: AdapterErrorCode
  readonly detail: string

  constructor(code: AdapterErrorCode, message: string, detail = '') {
    super(message)
    this.name = 'AdapterError'
    this.code = code
    this.detail = detail
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Map a thrown service error to a typed, user-explainable failure. */
export function classifyServiceError(service: string, error: unknown): AdapterError {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()
  if (lower.includes('service is unavailable') || lower.includes('not authorized'))
    return new AdapterError(
      'SERVICE_UNAVAILABLE',
      `服务 ${service} 当前不可用：插件描述未声明该服务、宿主未授权，或后端行未就绪`,
      message,
    )
  if (lower.includes('active session') || lower.includes('session unavailable'))
    return new AdapterError('NO_SESSION', `服务 ${service} 需要当前会话；请先在 AGH 中选择或创建会话`, message)
  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('timeout'))
    return new AdapterError('TRANSPORT', `调用 ${service} 失败：与宿主的连接中断或超时`, message)
  return new AdapterError('REFUSED', `调用 ${service} 被拒绝：${message}`, message)
}

/**
 * Generation gate that makes late replies from a previous session harmless:
 * every request captures `token`; when a reply arrives it is only applied when
 * `isCurrent(token)` still holds.
 */
export interface RequestGate {
  readonly token: number
  next(): number
  isCurrent(token: number): boolean
}

export function createRequestGate(): RequestGate {
  let token = 0
  return {
    get token() {
      return token
    },
    next() {
      token += 1
      return token
    },
    isCurrent(candidate: number) {
      return candidate === token
    },
  }
}

// ---------------------------------------------------------------------------
// fitplate.run
// ---------------------------------------------------------------------------

export type RunState = string

export interface ArtifactRef {
  artifactId: string
  name: string
  kind: 'step' | 'stl' | 'report' | 'evidence' | 'mesh' | 'preview' | 'other'
  bytes: number | null
  sha256: string | null
  mime: string | null
}

export interface RunVersion {
  candidateId: string
  createdAt: string | null
  stepSha256: string | null
  stlSha256: string | null
  /** Version lifecycle status as recorded by the run store (e.g. BUILT). */
  status: string | null
  report: ReportView | null
  /** True when `report` carries only a summary (no per-check rows). */
  reportIsSummary: boolean
  /** Registered report bytes and bridge content digest are different identities. */
  reportFileSha256: string | null
  reportSha256: string | null
  designSummary: DesignSummary | null
  changeSummary: string | null
  artifacts: ArtifactRef[]
  parentCandidateId: string | null
  raw: unknown
}

export interface RunView {
  sessionKey: string
  runId: string
  state: RunState
  taskRevision: number | null
  task: TaskView | null
  versions: RunVersion[]
  latestCandidateId: string | null
  updatedAt: string | null
  note: string | null
  /** Run-level exports recorded by the run store. */
  exports: { candidateId: string; reportId: string | null; stepSha256: string | null; reportFileSha256: string | null; reportSha256: string | null; exportDir: string | null; failed: boolean; exportedAt: string | null }[]
  raw: unknown
}

/**
 * Artifact ids the run store registers for a candidate (see the Plan §12 run
 * layout). Legacy `fitplate.run` responses do not enumerate them, so the panel offers this
 * standard set only when no registry is supplied and lets the service refuse anything unregistered
 * (`UNKNOWN_ARTIFACT`), which is then shown verbatim rather than hidden.
 */
export const DEFAULT_ARTIFACTS: ArtifactRef[] = [
  { artifactId: 'model.step', name: 'model.step', kind: 'step', bytes: null, sha256: null, mime: 'model/step' },
  { artifactId: 'model.stl', name: 'model.stl', kind: 'stl', bytes: null, sha256: null, mime: 'model/stl' },
  { artifactId: 'report.json', name: 'report.json', kind: 'report', bytes: null, sha256: null, mime: 'application/json' },
  { artifactId: 'evidence.json', name: 'evidence.json', kind: 'evidence', bytes: null, sha256: null, mime: 'application/json' },
]

const TERMINAL_STATES = new Set(['COMPLETED', 'CANCELLED', 'ERROR', 'BUDGET_EXHAUSTED', 'NEEDS_INPUT'])
const ACTIVE_STATES = new Set([
  'DRAFT',
  'READY',
  'BUILDING',
  'BUILT',
  'VALIDATING',
  'REVISING',
  'EXPORTING',
  'FAILED_CONSTRAINTS',
  'PASSED',
  'RUNNING',
])

export function classifyRunState(state: string | null | undefined): 'active' | 'terminal' | 'unknown' {
  if (!state) return 'unknown'
  const upper = state.toUpperCase()
  if (TERMINAL_STATES.has(upper)) return 'terminal'
  if (ACTIVE_STATES.has(upper)) return 'active'
  return 'unknown'
}

function artifactKind(name: string): ArtifactRef['kind'] {
  const lower = name.toLowerCase()
  if (lower.endsWith('.step') || lower.endsWith('.stp')) return 'step'
  if (lower.endsWith('.stl')) return 'stl'
  if (lower.includes('report')) return 'report'
  if (lower.includes('evidence')) return 'evidence'
  if (lower.includes('preview_mesh')) return 'mesh'
  if (lower.includes('preview')) return 'preview'
  return 'other'
}

function normalizeArtifact(raw: unknown): ArtifactRef | null {
  if (typeof raw === 'string' && raw.length > 0)
    return { artifactId: raw, name: raw, kind: artifactKind(raw), bytes: null, sha256: null, mime: null }
  if (!isRecord(raw)) return null
  const artifactId = asString(raw.artifact_id) ?? asString(raw.id) ?? asString(raw.name)
  const name = asString(raw.name) ?? artifactId
  if (!artifactId || !name) return null
  return {
    artifactId,
    name,
    kind: artifactKind(name),
    bytes: asNumber(raw.bytes) ?? asNumber(raw.size),
    sha256: isSha256(raw.sha256) ? normalizeSha256(raw.sha256) : null,
    mime: asString(raw.mime),
  }
}

function normalizeVersion(raw: unknown): RunVersion | null {
  if (!isRecord(raw)) return null
  const candidateId = asString(raw.candidate_id) ?? asString(raw.id)
  if (!isCandidateId(candidateId)) return null
  const reportSource = isRecord(raw.report)
    ? raw.report
    : isRecord(raw.report_summary)
      ? raw.report_summary
      : null
  // `fitplate.run` returns flattened report fields on the version itself
  // (report_id / overall / report_created_at / validator_version) instead of a
  // nested object; both are accepted, the flattened form as a summary.
  const report = reportSource
    ? (parseReport(reportSource) ?? reportFromSummary(reportSource))
    : reportFromSummary(raw)
  const artifacts = Array.isArray(raw.artifacts)
    ? raw.artifacts.flatMap((entry) => {
        const normalized = normalizeArtifact(entry)
        return normalized ? [normalized] : []
      })
    : Array.isArray(raw.files)
      ? raw.files.flatMap((entry) => {
          const normalized = normalizeArtifact(entry)
          return normalized ? [normalized] : []
        })
      : []
  return {
    candidateId,
    createdAt: asString(raw.created_at),
    stepSha256: normalizeSha256(raw.step_sha256) || null,
    stlSha256: normalizeSha256(raw.stl_sha256) || null,
    status: asString(raw.status),
    report,
    reportIsSummary: report !== null && report.checks.length === 0,
    reportFileSha256: normalizeSha256(raw.report_file_sha256) || null,
    reportSha256: normalizeSha256(raw.report_sha256 ?? reportSource?.report_sha256) || null,
    designSummary: parseDesignSummary(raw.design_summary),
    changeSummary: asString(raw.change_summary) ?? asString(raw.rationale),
    artifacts: Array.isArray(raw.artifacts) || Array.isArray(raw.files)
      ? artifacts : DEFAULT_ARTIFACTS.map((artifact) => ({ ...artifact })),
    parentCandidateId: asString(raw.parent_candidate_id) ?? asString(raw.parent),
    raw,
  }
}

/** Turn one `found: false` refusal into an explainable adapter failure. */
function refusal(service: string, reason: unknown): AdapterError {
  const code = asString(reason) ?? 'UNKNOWN'
  if (service === SERVICE_RUN && (code === 'NO_RUN_FOR_SESSION' || code === 'RUN_NOT_AVAILABLE_FOR_SESSION'))
    return new AdapterError(
      'NO_RUN',
      code === 'NO_RUN_FOR_SESSION'
        ? '当前会话还没有 FitPlate 运行记录（可用 fitplate_load_task 建立一次运行）'
        : '该运行不存在，或不属于当前会话（一致性过滤拒绝显示）',
      code,
    )
  if (service === SERVICE_SCENE || service === SERVICE_ARTIFACT) {
    if (code === 'CANDIDATE_NOT_FOUND')
      return new AdapterError('NOT_FOUND', `该候版本不在运行的版本列表中：${code}`, code)
    if (code === 'RUN_NOT_AVAILABLE_FOR_SESSION')
      return new AdapterError('NOT_FOUND', '该运行不存在，或不属于当前会话（一致性过滤拒绝显示）', code)
    if (code === 'UNKNOWN_ARTIFACT')
      return new AdapterError('NOT_FOUND', '该产物未在运行清单中登记，拒绝读取', code)
    return new AdapterError('NOT_FOUND', `${service} 拒绝请求：${code}`, code)
  }
  return new AdapterError('NOT_FOUND', `${service} 拒绝请求：${code}`, code)
}

export interface LoadRunInput {
  sessionKey: string
  runId?: string
}

export function normalizeRunPayload(raw: unknown, expected: LoadRunInput): RunView {
  if (!isRecord(raw)) throw new AdapterError('SHAPE', 'fitplate.run 返回的不是对象')
  if (raw.found === false) throw refusal(SERVICE_RUN, raw.reason)
  const runId = asString(raw.run_id) ?? asString(raw.runId)
  if (!runId) throw new AdapterError('SHAPE', 'fitplate.run 返回缺少 run_id')
  if (expected.runId && runId !== expected.runId)
    throw new AdapterError(
      'IDENTITY_MISMATCH',
      `fitplate.run 返回的是 run ${runId}，而请求的是 ${expected.runId}`,
    )
  const sessionKey = asString(raw.session_key) ?? expected.sessionKey
  if (raw.session_key !== undefined && raw.session_key !== expected.sessionKey)
    throw new AdapterError(
      'IDENTITY_MISMATCH',
      `fitplate.run 返回的 session_key 与当前会话不一致（返回 ${String(raw.session_key)}）`,
    )
  const rawVersions = Array.isArray(raw.versions)
    ? raw.versions
    : Array.isArray(raw.candidates)
      ? raw.candidates
      : []
  const versions = rawVersions.flatMap((entry) => {
    const normalized = normalizeVersion(entry)
    return normalized ? [normalized] : []
  })
  const latest = asString(raw.latest_candidate_id) ?? asString(raw.latest)
  const exportsRaw = Array.isArray(raw.exports) ? raw.exports : []
  return {
    sessionKey,
    runId,
    state: (asString(raw.state) ?? 'UNKNOWN').toUpperCase(),
    taskRevision: asNumber(raw.task_revision),
    // The service sends either the full TaskSpec (`task`) or `task_summary`.
    task: parseTask(raw.task ?? raw.task_summary ?? null),
    versions,
    latestCandidateId: latest && isCandidateId(latest) ? latest : (versions.at(-1)?.candidateId ?? null),
    updatedAt: asString(raw.updated_at),
    note: asString(raw.note) ?? asString(raw.reason),
    exports: exportsRaw.flatMap((entry) => {
      if (!isRecord(entry)) return []
      const candidateId = asString(entry.candidate_id)
      if (!candidateId) return []
      return [
        {
          candidateId,
          reportId: asString(entry.report_id),
          stepSha256: normalizeSha256(entry.step_sha256) || null,
          reportFileSha256: normalizeSha256(entry.report_file_sha256) || null,
          reportSha256: normalizeSha256(entry.report_sha256) || null,
          exportDir: asString(entry.export_dir),
          failed: entry.failed === true,
          exportedAt: asString(entry.exported_at),
        },
      ]
    }),
    raw,
  }
}

// ---------------------------------------------------------------------------
// fitplate.scene
// ---------------------------------------------------------------------------

export interface SceneIdentity {
  runId: string
  candidateId: string
  stepSha256: string
}

export interface MeshBlocked {
  reason: string
  message: string
  artifactId: string | null
  totalBytes: number | null
}

export interface SceneView {
  identity: SceneIdentity
  mesh: PreviewMeshPayload | null
  /** The backend refused or dropped the mesh; the reason is shown, not hidden. */
  meshBlocked: MeshBlocked | null
  task: TaskView | null
  scene: unknown
  report: ReportView | null
  evidence: unknown
  design: unknown
  /** The service's resolved device pose block (`g04-measured` / `design-fallback`). */
  device: unknown
  binding: Record<string, unknown> | null
  raw: unknown
}

function extractMesh(raw: Record<string, unknown>): unknown {
  if (isRecord(raw.mesh)) return raw.mesh
  if (isRecord(raw.preview_mesh)) return raw.preview_mesh
  if (Array.isArray(raw.vertices) && Array.isArray(raw.indices)) return raw
  return null
}

function extractBlocked(raw: Record<string, unknown>): MeshBlocked | null {
  const blocked = isRecord(raw.mesh_blocked) ? raw.mesh_blocked : null
  if (!blocked) return null
  return {
    reason: asString(blocked.reason) ?? 'MESH_UNAVAILABLE',
    message: asString(blocked.message) ?? 'the service did not return a mesh for this candidate',
    artifactId: asString(blocked.artifact_id),
    totalBytes: asNumber(blocked.total_bytes),
  }
}

export function normalizeScenePayload(
  raw: unknown,
  expected: { runId: string; candidateId: string; stepSha256?: string | null; reportId?: string | null; reportFileSha256?: string | null; reportSha256?: string | null },
): SceneView {
  if (!isRecord(raw)) throw new AdapterError('SHAPE', 'fitplate.scene 返回的不是对象')
  if (raw.found === false) throw refusal(SERVICE_SCENE, raw.reason)
  const runId = asString(raw.run_id)
  if (runId && runId !== expected.runId)
    throw new AdapterError('IDENTITY_MISMATCH', `fitplate.scene 返回 run ${runId}，而请求的是 ${expected.runId}`)
  const candidateId = asString(raw.candidate_id)
  if (candidateId !== null && candidateId !== expected.candidateId)
    throw new AdapterError(
      'IDENTITY_MISMATCH',
      `fitplate.scene 返回 candidate ${String(candidateId)}，而请求的是 ${expected.candidateId}`,
    )
  const binding = isRecord(raw.binding) ? raw.binding : null
  const meshRaw = extractMesh(raw)
  const meshBlocked = extractBlocked(raw)

  // Identity is established from the binding block first (the service's own
  // statement of what the bytes are), then from the mesh itself.
  const boundCandidate = binding ? asString(binding.candidate_id) : null
  if (boundCandidate !== null && boundCandidate !== expected.candidateId)
    throw new AdapterError(
      'IDENTITY_MISMATCH',
      `fitplate.scene 的 binding 指向候选 ${boundCandidate}，而请求的是 ${expected.candidateId}`,
    )
  const stepSha256 =
    normalizeSha256(binding?.step_sha256) ||
    (isRecord(meshRaw) ? normalizeSha256(meshRaw.step_sha256) : '') ||
    normalizeSha256(raw.step_sha256)
  if (meshRaw !== null && isRecord(meshRaw)) {
    const meshCandidate = asString(meshRaw.candidate_id)
    if (meshCandidate !== null && meshCandidate !== expected.candidateId)
      throw new AdapterError(
        'IDENTITY_MISMATCH',
        `网格属于候选 ${meshCandidate}，而请求的是 ${expected.candidateId}`,
      )
  }
  if (!stepSha256)
    throw new AdapterError(
      'IDENTITY_MISMATCH',
      'fitplate.scene 响应没有可用的 step_sha256（binding 与 mesh 都缺失），无法与产物绑定',
    )
  if (expected.stepSha256 && normalizeSha256(expected.stepSha256) !== stepSha256)
    throw new AdapterError(
      'IDENTITY_MISMATCH',
      `fitplate.scene 绑定 STEP ${stepSha256.slice(0, 12)}…，与运行记录的 ${expected.stepSha256.slice(0, 12)}… 不一致`,
    )
  const report = parseReport(raw.report ?? raw.report_summary) ?? reportFromSummary(raw.report ?? raw.report_summary)
  const reportId = report && isRecord(report.raw) ? asString(report.raw.report_id) : null
  if (expected.reportId != null && reportId !== null && reportId !== expected.reportId)
    throw new AdapterError('IDENTITY_MISMATCH', 'fitplate.scene 的报告正文与当前 report_id 不一致，请刷新后重试')
  for (const [wanted, actual, label] of [
    [expected.reportId, binding?.report_id ?? report?.reportId, 'report_id'],
    [expected.reportFileSha256, normalizeSha256(binding?.report_file_sha256) || null, 'report_file_sha256'],
    [expected.reportSha256, normalizeSha256(binding?.report_sha256) || null, 'report_sha256'],
  ]) {
    if (wanted != null && wanted !== actual && !(label === 'report_id' && actual == null))
      throw new AdapterError('IDENTITY_MISMATCH', `fitplate.scene 的 ${label} 与当前运行记录不一致，请刷新后重试`)
  }
  return {
    identity: { runId: expected.runId, candidateId: expected.candidateId, stepSha256 },
    mesh: isRecord(meshRaw) ? (meshRaw as unknown as PreviewMeshPayload) : null,
    meshBlocked,
    task: parseTask(raw.task ?? raw.task_summary ?? null),
    scene: raw.scene ?? null,
    report,
    evidence: raw.evidence ?? null,
    design: raw.design ?? null,
    device: raw.device ?? null,
    binding,
    raw,
  }
}

// ---------------------------------------------------------------------------
// fitplate.artifact (bounded chunked reads)
// ---------------------------------------------------------------------------

export interface ArtifactChunk {
  offset: number
  bytes: Uint8Array
  eof: boolean
  totalBytes: number | null
  /** Hash of the whole artifact as declared by the service. */
  sha256: string | null
  /** Hash of this chunk as declared by the service (verified by the reader). */
  chunkSha256: string | null
  encoding: 'base64' | 'utf8'
}

function decodeBase64(text: string): Uint8Array {
  const binary = globalThis.atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export function parseArtifactChunk(raw: unknown, expect: { offset: number; artifactId: string }): ArtifactChunk {
  if (!isRecord(raw)) throw new AdapterError('SHAPE', 'fitplate.artifact 返回的不是对象')
  if (raw.found === false) throw refusal(SERVICE_ARTIFACT, raw.reason)
  const artifactId = asString(raw.artifact_id) ?? asString(raw.id)
  if (artifactId && artifactId !== expect.artifactId)
    throw new AdapterError(
      'IDENTITY_MISMATCH',
      `fitplate.artifact 返回产物 ${artifactId}，而请求的是 ${expect.artifactId}`,
    )
  const offset = asNumber(raw.offset)
  if (offset === null || offset !== expect.offset)
    throw new AdapterError(
      'CHUNK',
      `fitplate.artifact 返回的 offset=${String(raw.offset)}，期望 ${expect.offset}（分块必须顺序读取）`,
    )
  // The backend names the payload `chunk_base64`; `data` is accepted for the
  // documented alternative shape.
  const text = typeof raw.chunk_base64 === 'string' ? raw.chunk_base64 : typeof raw.data === 'string' ? raw.data : null
  if (text === null) throw new AdapterError('SHAPE', 'fitplate.artifact 缺少 chunk_base64/data 字段')
  const encoding: 'base64' | 'utf8' = raw.encoding === 'utf8' ? 'utf8' : 'base64'
  let bytes: Uint8Array
  if (encoding === 'base64') {
    try {
      bytes = decodeBase64(text)
    } catch (error) {
      throw new AdapterError('CHUNK', 'artifact base64 分块解码失败', String(error))
    }
  } else {
    bytes = new TextEncoder().encode(text)
  }
  if (bytes.byteLength > ARTIFACT_CHUNK_BYTES)
    throw new AdapterError(
      'CHUNK',
      `artifact 分块 ${bytes.byteLength} 字节超过 64KiB 上限`,
      '服务端必须按 <=64KiB 分块',
    )
  const declaredBytes = asNumber(raw.bytes)
  if (declaredBytes !== null && declaredBytes !== bytes.byteLength)
    throw new AdapterError(
      'CHUNK',
      `artifact 分块声明 ${declaredBytes} 字节，实际解码 ${bytes.byteLength} 字节，拒绝使用`,
    )
  return {
    offset,
    bytes,
    eof: raw.eof === true,
    totalBytes: asNumber(raw.total_bytes),
    sha256: isSha256(raw.sha256) ? normalizeSha256(raw.sha256) : null,
    chunkSha256: isSha256(raw.chunk_sha256) ? normalizeSha256(raw.chunk_sha256) : null,
    encoding,
  }
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // Every buffer here is freshly allocated (`new Uint8Array(...)`), so the
  // SharedArrayBuffer arm of the typed-array definition cannot occur; the cast
  // is only about TypeScript's generic ArrayBufferLike parameter.
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource)
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

export interface FetchArtifactInput {
  sessionKey: string
  runId: string
  candidateId: string
  artifactId: string
  /** Registered hash to verify after assembly (optional). */
  expectedSha256?: string | null
  maxBytes?: number
  onProgress?: (received: number, total: number | null) => void
}

export interface FetchedArtifact {
  artifactId: string
  bytes: Uint8Array
  sha256: string
  chunks: number
  totalBytes: number | null
}

/**
 * Read a registered artifact in bounded chunks, verifying the assembled bytes.
 * The loop refuses non-sequential offsets, oversized chunks, endless streams
 * and (when the caller knows it) a hash that does not match the registered one.
 */
export async function fetchArtifactBytes(
  call: ServiceCaller,
  input: FetchArtifactInput,
): Promise<FetchedArtifact> {
  const maxBytes = input.maxBytes ?? ARTIFACT_MAX_BYTES
  const parts: Uint8Array[] = []
  let offset = 0
  let total = 0
  let chunks = 0
  let totalBytes: number | null = null
  let declaredSha: string | null = null
  for (;;) {
    let raw: unknown
    try {
      raw = await call(SERVICE_ARTIFACT, {
        session_key: input.sessionKey,
        run_id: input.runId,
        candidate_id: input.candidateId,
        artifact_id: input.artifactId,
        offset,
        limit: ARTIFACT_CHUNK_BYTES,
      })
    } catch (error) {
      throw classifyServiceError(SERVICE_ARTIFACT, error)
    }
    const chunk = parseArtifactChunk(raw, { offset, artifactId: input.artifactId })
    chunks += 1
    if (chunk.chunkSha256) {
      const chunkDigest = await sha256Hex(chunk.bytes)
      if (chunkDigest !== chunk.chunkSha256)
        throw new AdapterError(
          'HASH_MISMATCH',
          `artifact 分块校验失败（offset ${offset}）：实读 ${chunkDigest.slice(0, 12)}…，声明 ${chunk.chunkSha256.slice(0, 12)}…`,
        )
    }
    if (chunk.sha256) declaredSha = chunk.sha256
    if (chunk.totalBytes !== null) totalBytes = chunk.totalBytes
    if (chunk.bytes.byteLength === 0 && !chunk.eof)
      throw new AdapterError('CHUNK', 'artifact 服务返回空块但没有 eof，拒绝无限读取', `offset=${offset}`)
    parts.push(chunk.bytes)
    total += chunk.bytes.byteLength
    if (total > maxBytes)
      throw new AdapterError('TOO_LARGE', `artifact 超过前端上限 ${(maxBytes / 1024 / 1024).toFixed(0)}MiB，已中止`)
    offset += chunk.bytes.byteLength
    input.onProgress?.(total, totalBytes)
    if (chunk.eof) break
  }
  const merged = new Uint8Array(total)
  let cursor = 0
  for (const part of parts) {
    merged.set(part, cursor)
    cursor += part.byteLength
  }
  if (totalBytes !== null && totalBytes !== total)
    throw new AdapterError(
      'CHUNK',
      `artifact 实际读取 ${total} 字节，服务声明 ${totalBytes} 字节，读取不完整`,
    )
  const digest = await sha256Hex(merged)
  // Both the registered hash (caller side) and the hash the service declared
  // must agree with the assembled bytes; neither is trusted over the bytes.
  const registered = normalizeSha256(input.expectedSha256)
  if (registered && digest !== registered)
    throw new AdapterError(
      'HASH_MISMATCH',
      `artifact 校验失败：实读 ${digest.slice(0, 12)}…，登记 ${registered.slice(0, 12)}…，拒绝下载`,
    )
  if (declaredSha && digest !== declaredSha)
    throw new AdapterError(
      'HASH_MISMATCH',
      `artifact 校验失败：实读 ${digest.slice(0, 12)}…，服务声明 ${declaredSha.slice(0, 12)}…，拒绝下载`,
    )
  return { artifactId: input.artifactId, bytes: merged, sha256: digest, chunks, totalBytes }
}
