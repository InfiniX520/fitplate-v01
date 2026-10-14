/**
 * Decoding and identity validation for `preview_mesh.json` payloads (T09).
 *
 * The viewer never re-draws a "looks the same" plate from the DesignSpec: the
 * triangles it renders come from the tessellation of the published STEP file.
 * This module is deliberately free of three.js and React so the same checks run
 * under `node --test` and inside the browser panel.
 *
 * Rejection is explicit and typed. A mesh that does not bind to the candidate
 * and STEP hash the caller asked for is never silently repaired, re-scaled or
 * rendered with a warning sticker: it is refused, and the panel shows why.
 */

export type Vec3 = [number, number, number]

export interface MeshBounds {
  min: Vec3
  max: Vec3
}

/**
 * The subset of `preview_mesh.json` (geometry/build.py) this viewer consumes.
 *
 * `schema_version` is optional because the backend service re-wraps the same
 * arrays in its own `mesh` block (candidate_id / step_sha256 / vertices /
 * indices / bounds / tolerance fields) without repeating the file's schema
 * version; when it is present it must still be `1.0`.
 */
export interface PreviewMeshPayload {
  schema_version?: string
  candidate_id: string
  step_sha256: string
  tolerance_mm?: number | null
  angular_tolerance_rad?: number | null
  vertices: readonly number[]
  indices: readonly number[]
  bounds?: { min: readonly number[]; max: readonly number[] } | null
}

export interface DecodedMesh {
  positions: Float32Array
  indices: Uint32Array
  vertexCount: number
  triangleCount: number
  bounds: MeshBounds
  candidateId: string
  stepSha256: string
  toleranceMm: number | null
  angularToleranceRad: number | null
  /** Bounds recomputed from the vertices, compared against the declared block. */
  boundsAgreementMm: number | null
}

export type MeshRejectionCode =
  | 'PAYLOAD_NOT_OBJECT'
  | 'UNSUPPORTED_SCHEMA'
  | 'CANDIDATE_ID_MISMATCH'
  | 'STEP_HASH_MISMATCH'
  | 'STEP_HASH_MISSING'
  | 'VERTICES_INVALID'
  | 'INDICES_INVALID'
  | 'TRIANGLE_BUDGET_EXCEEDED'
  | 'BOUNDS_DISAGREE'
  | 'PAYLOAD_TOO_LARGE'

export class MeshRejection extends Error {
  readonly code: MeshRejectionCode
  readonly detail: string

  constructor(code: MeshRejectionCode, message: string, detail = '') {
    super(message)
    this.name = 'MeshRejection'
    this.code = code
    this.detail = detail
  }
}

/** Product budget from schemas/report.schema.json previewArtifact.triangles. */
export const MAX_TRIANGLES = 200_000
/** Response budget from Plan1 section 11 (single scene response <= 512 KiB). */
export const MAX_MESH_PAYLOAD_BYTES = 2 * 1024 * 1024

const SHA256_RE = /^[0-9a-f]{64}$/
const CANDIDATE_RE = /^v[0-9]{3}$/

export function isSha256(value: unknown): value is string {
  return typeof value === 'string' && SHA256_RE.test(value)
}

export function isCandidateId(value: unknown): value is string {
  return typeof value === 'string' && CANDIDATE_RE.test(value)
}

/** Normalize a caller-provided hash: trim, lowercase; empty string means "unknown". */
export function normalizeSha256(value: unknown): string {
  if (typeof value !== 'string') return ''
  const text = value.trim().toLowerCase()
  return SHA256_RE.test(text) ? text : ''
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function readVec3(raw: unknown): Vec3 | null {
  if (!Array.isArray(raw) || raw.length !== 3) return null
  const [x, y, z] = raw
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z)) return null
  return [x, y, z]
}

export function computeBounds(positions: Float32Array): MeshBounds {
  if (positions.length === 0) return { min: [0, 0, 0], max: [0, 0, 0] }
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = positions[i + axis] as number
      if (value < (min[axis] as number)) min[axis] = value
      if (value > (max[axis] as number)) max[axis] = value
    }
  }
  return { min, max }
}

function boundsDelta(a: MeshBounds, b: MeshBounds): number {
  let worst = 0
  for (let axis = 0; axis < 3; axis += 1) {
    worst = Math.max(
      worst,
      Math.abs((a.min[axis] as number) - (b.min[axis] as number)),
      Math.abs((a.max[axis] as number) - (b.max[axis] as number)),
    )
  }
  return worst
}

export interface DecodeMeshExpectation {
  candidateId: string
  /** Empty string = the caller has no hash to bind against (rendering is refused anyway). */
  stepSha256: string
  /** Allowed disagreement between declared and recomputed bounds, in mm. */
  boundsToleranceMm?: number
}

/**
 * Validate and decode one mesh payload.
 *
 * `expect.stepSha256` is mandatory on purpose: the panel only renders a mesh
 * whose bytes are bound to the exact STEP artefact it is talking about, so a
 * stale response from a previous candidate or run cannot reach the canvas.
 */
export function decodeMeshPayload(raw: unknown, expect: DecodeMeshExpectation): DecodedMesh {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new MeshRejection('PAYLOAD_NOT_OBJECT', '网格响应不是对象', typeof raw)
  }
  const payload = raw as Partial<PreviewMeshPayload>

  if (payload.schema_version !== undefined && payload.schema_version !== '1.0') {
    throw new MeshRejection(
      'UNSUPPORTED_SCHEMA',
      `网格响应 schema_version=${String(payload.schema_version)}，只支持 1.0`,
    )
  }
  if (!isCandidateId(payload.candidate_id)) {
    throw new MeshRejection('CANDIDATE_ID_MISMATCH', `网格响应 candidate_id 非法：${String(payload.candidate_id)}`)
  }
  if (payload.candidate_id !== expect.candidateId) {
    throw new MeshRejection(
      'CANDIDATE_ID_MISMATCH',
      `网格属于候选 ${payload.candidate_id}，而要渲染的是 ${expect.candidateId}`,
    )
  }
  const expectedHash = normalizeSha256(expect.stepSha256)
  if (!expectedHash) {
    throw new MeshRejection('STEP_HASH_MISSING', '缺少要绑定的 STEP 哈希，拒绝渲染网格')
  }
  const meshHash = normalizeSha256(payload.step_sha256)
  if (!meshHash) {
    throw new MeshRejection('STEP_HASH_MISSING', '网格响应没有携带可校验的 step_sha256')
  }
  if (meshHash !== expectedHash) {
    throw new MeshRejection(
      'STEP_HASH_MISMATCH',
      `网格绑定的 STEP 哈希与候选记录不一致（网格 ${meshHash.slice(0, 12)}…，记录 ${expectedHash.slice(0, 12)}…）`,
    )
  }

  const vertices = payload.vertices
  if (!Array.isArray(vertices) || vertices.length === 0 || vertices.length % 3 !== 0) {
    throw new MeshRejection('VERTICES_INVALID', 'vertices 必须是 3 的倍数长度的非空数组', `len=${String(vertices?.length)}`)
  }
  const indices = payload.indices
  if (!Array.isArray(indices) || indices.length === 0 || indices.length % 3 !== 0) {
    throw new MeshRejection('INDICES_INVALID', 'indices 必须是 3 的倍数长度的非空数组', `len=${String(indices?.length)}`)
  }
  const triangleCount = indices.length / 3
  if (triangleCount > MAX_TRIANGLES) {
    throw new MeshRejection(
      'TRIANGLE_BUDGET_EXCEEDED',
      `三角面 ${triangleCount} 超过预览预算 ${MAX_TRIANGLES}`,
    )
  }
  const vertexCount = vertices.length / 3
  const positions = new Float32Array(vertices.length)
  for (let i = 0; i < vertices.length; i += 1) {
    const value = vertices[i]
    if (!isFiniteNumber(value)) {
      throw new MeshRejection('VERTICES_INVALID', `vertices[${i}] 不是有限数值`, String(value))
    }
    positions[i] = value
  }
  const triangles = new Uint32Array(indices.length)
  for (let i = 0; i < indices.length; i += 1) {
    const value = indices[i]
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value >= vertexCount) {
      throw new MeshRejection(
        'INDICES_INVALID',
        `indices[${i}]=${String(value)} 越界或非整数（顶点数 ${vertexCount}）`,
      )
    }
    triangles[i] = value
  }

  const recomputed = computeBounds(positions)
  let boundsAgreementMm: number | null = null
  if (payload.bounds && typeof payload.bounds === 'object') {
    const declaredMin = readVec3((payload.bounds as { min?: unknown }).min)
    const declaredMax = readVec3((payload.bounds as { max?: unknown }).max)
    if (declaredMin && declaredMax) {
      boundsAgreementMm = boundsDelta(recomputed, { min: declaredMin, max: declaredMax })
      const tolerance = expect.boundsToleranceMm ?? 0.5
      if (boundsAgreementMm > tolerance) {
        throw new MeshRejection(
          'BOUNDS_DISAGREE',
          `顶点重算包围盒与声明值相差 ${boundsAgreementMm.toFixed(3)}mm（容限 ${tolerance}mm），网格与产物不一致`,
        )
      }
    }
  }

  return {
    positions,
    indices: triangles,
    vertexCount,
    triangleCount,
    bounds: recomputed,
    candidateId: payload.candidate_id,
    stepSha256: meshHash,
    toleranceMm: isFiniteNumber(payload.tolerance_mm) ? payload.tolerance_mm : null,
    angularToleranceRad: isFiniteNumber(payload.angular_tolerance_rad) ? payload.angular_tolerance_rad : null,
    boundsAgreementMm,
  }
}

/** Byte-size guard applied by the adapter before decoding. */
export function assertPayloadBudget(text: string): void {
  const bytes = new TextEncoder().encode(text).byteLength
  if (bytes > MAX_MESH_PAYLOAD_BYTES) {
    throw new MeshRejection(
      'PAYLOAD_TOO_LARGE',
      `场景响应 ${(bytes / 1024).toFixed(0)}KiB 超过前端上限 ${(MAX_MESH_PAYLOAD_BYTES / 1024).toFixed(0)}KiB`,
    )
  }
}
