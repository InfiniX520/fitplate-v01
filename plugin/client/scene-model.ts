/**
 * Pure scene model for the FitPlate panel: device pose resolution, envelope
 * descriptors and status helpers. No three.js, no React — Node tests and the
 * browser panel run exactly these functions.
 *
 * Two honesty rules shape this file:
 *
 * 1. Where a moving envelope is drawn is decided by what the *validator
 *    measured* (G04 derives the device pose from the holes that are actually
 *    in the STEP file), not by what a candidate design asked for. A candidate
 *    pose may still be shown, but it is labelled as unverified and never as a
 *    passing assembly.
 * 2. A check result is only "current" when it belongs to the frozen task
 *    revision and binds the STEP hash of the candidate being displayed.
 *    Anything else is reported as stale ("按旧要求通过") rather than silently
 *    reused as today's PASS.
 */

import { isSha256, type Vec3 } from './mesh.ts'

export const CHECK_IDS = ['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08'] as const
export type CheckId = (typeof CHECK_IDS)[number]

export const CHECK_TITLES: Record<CheckId, string> = {
  G01: '实体有效性',
  G02: '板体尺寸与姿态',
  G03: '底座通孔',
  G04: '传感器孔组 / 位姿',
  G05: '孔边与孔间材料',
  G06: '装配自由空间',
  G07: '固定条件保持',
  G08: '导出一致性',
}

export type CheckStatus = 'PASS' | 'FAIL' | 'UNKNOWN' | 'BORDERLINE'

export interface ReportCheck {
  id: CheckId
  status: CheckStatus
  objects: string[]
  measured: Record<string, unknown>
  required: Record<string, unknown>
  reasonCode?: string
  evidenceRef?: string
  note?: string
  /** Present only when the report writer emitted a check outside G01..G08. */
  rawId?: string
}

export interface ReportView {
  reportId: string
  overall: CheckStatus
  taskRevision: number | null
  createdAt: string | null
  validatorVersion: string | null
  candidateId: string | null
  stepSha256: string | null
  checks: ReportCheck[]
  errors: { code: string; message: string }[]
  raw: unknown
}

export type ReportFreshness =
  | { state: 'current'; label: string }
  | { state: 'stale-revision'; label: string }
  | { state: 'stale-binding'; label: string }
  | { state: 'unverified-metadata'; label: string }
  | { state: 'missing'; label: string }

// ---------------------------------------------------------------------------
// Task documents
// ---------------------------------------------------------------------------

/**
 * Normalized view of a TaskSpec. The backend exposes two shapes of the same
 * frozen task: the full TaskSpec (with provenance) and a `task_summary`
 * (request_text / task_revision, no provenance). Both are read here so the UI
 * shows what exists and marks the rest as unknown instead of guessing.
 */
export interface TaskView {
  taskId: string | null
  revision: number | null
  requestText: string | null
  plate: {
    width: number | null
    height: number | null
    thickness: number | null
    locked: string[]
    editable: Record<string, { min: number | null; max: number | null }>
  } | null
  baseHoles: { diameter: number | null; centers: [number, number][]; locked: boolean } | null
  sensor: {
    modelId: string | null
    bodySize: [number, number, number] | null
    holeDiameter: number | null
    holeOffsets: [number, number][]
    allowedCenterX: { min: number | null; max: number | null } | null
    allowedCenterY: { min: number | null; max: number | null } | null
    allowedRotationDeg: number[]
  } | null
  requirements: Record<string, unknown> | null
  tolerances: Record<string, unknown> | null
  provenance: { kind: string | null; source: string | null; reviewStatus: string | null } | null
  /** True when only the service's summary was available (e.g. provenance absent). */
  summaryOnly: boolean
  raw: unknown
}

function range(value: unknown): { min: number | null; max: number | null } | null {
  if (!isRecord(value)) return null
  return { min: asNumber(value.min), max: asNumber(value.max) }
}

export function parseTask(raw: unknown): TaskView | null {
  if (!isRecord(raw)) return null
  const plateRaw = isRecord(raw.plate) ? raw.plate : null
  const editableRaw = plateRaw && isRecord(plateRaw.editable) ? plateRaw.editable : {}
  const editable: Record<string, { min: number | null; max: number | null }> = {}
  for (const [key, value] of Object.entries(editableRaw)) {
    const parsed = range(value)
    if (parsed) editable[key] = parsed
  }
  const baseRaw = isRecord(raw.base_holes) ? raw.base_holes : null
  const sensorRaw = isRecord(raw.sensor) ? raw.sensor : null
  const body = sensorRaw && Array.isArray(sensorRaw.body_size) ? sensorRaw.body_size : null
  const bodySize: [number, number, number] | null =
    body && body.length >= 3 && asNumber(body[0]) !== null && asNumber(body[1]) !== null && asNumber(body[2]) !== null
      ? [body[0] as number, body[1] as number, body[2] as number]
      : null
  const provenanceRaw = isRecord(raw.provenance) ? raw.provenance : null
  const requestRaw = isRecord(raw.request) ? raw.request : null
  return {
    taskId: asString(raw.task_id),
    revision: asNumber(raw.revision) ?? asNumber(raw.task_revision),
    requestText: asString(raw.request_text) ?? (requestRaw ? asString(requestRaw.text) : null),
    plate: plateRaw
      ? {
          width: asNumber(plateRaw.width),
          height: asNumber(plateRaw.height),
          thickness: asNumber(plateRaw.thickness),
          locked: Array.isArray(plateRaw.locked) ? plateRaw.locked.filter((item): item is string => typeof item === 'string') : [],
          editable,
        }
      : null,
    baseHoles: baseRaw
      ? {
          diameter: asNumber(baseRaw.diameter),
          centers: Array.isArray(baseRaw.centers)
            ? baseRaw.centers.flatMap((item) => {
                const pair = xyPair(item)
                return pair ? [pair] : []
              })
            : [],
          locked: baseRaw.locked === true,
        }
      : null,
    sensor: sensorRaw
      ? {
          modelId: asString(sensorRaw.model_id),
          bodySize,
          holeDiameter: asNumber(sensorRaw.hole_diameter),
          holeOffsets: Array.isArray(sensorRaw.hole_offsets)
            ? sensorRaw.hole_offsets.flatMap((item) => {
                const pair = xyPair(item)
                return pair ? [pair] : []
              })
            : [],
          allowedCenterX: range(sensorRaw.allowed_center_x),
          allowedCenterY: range(sensorRaw.allowed_center_y),
          allowedRotationDeg: Array.isArray(sensorRaw.allowed_rotation_deg)
            ? sensorRaw.allowed_rotation_deg.flatMap((item) => (asNumber(item) === null ? [] : [item as number]))
            : [],
        }
      : null,
    requirements: isRecord(raw.requirements) ? raw.requirements : null,
    tolerances: isRecord(raw.tolerances) ? raw.tolerances : null,
    provenance: parseProvenance(provenanceRaw),
    summaryOnly: provenanceRaw === null,
    raw,
  }
}

/**
 * Read a `provenance` block — either the block itself or a document (task or
 * frozen scene) that contains one. The run summary strips provenance from the
 * task; the frozen scene the panel also receives keeps it, so the data-source
 * row can still name where the numbers came from.
 */
export function parseProvenance(raw: unknown): TaskView['provenance'] {
  if (!isRecord(raw)) return null
  const block = isRecord(raw.provenance) ? raw.provenance : raw
  const parsed = {
    kind: asString(block.kind),
    source: asString(block.source),
    reviewStatus: asString(block.review_status),
  }
  if (parsed.kind === null && parsed.source === null && parsed.reviewStatus === null) return null
  return parsed
}

export interface PoseInfo {
  /** Measured (or candidate) device centre in plate XY, null when unknown. */
  center: [number, number] | null
  rotationDeg: number
  source: 'report_g04' | 'evidence' | 'design_candidate' | 'unknown'
  /** True only for a validator-derived pose (report G04 / evidence). */
  verified: boolean
  poseSolutions: number | null
  worstDeviationMm: number | null
  note: string
}

export interface EnvelopeBox {
  id: string
  role: string
  kind: 'box'
  center: Vec3
  size: Vec3
  movable: boolean
  source: string
}

export interface EnvelopeCylinder {
  id: string
  role: string
  kind: 'cylinder'
  center: Vec3
  radius: number
  height: number
  movable: boolean
  source: string
}

export type SceneEnvelope = EnvelopeBox | EnvelopeCylinder

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function xyPair(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null
  const x = asNumber(value[0])
  const y = asNumber(value[1])
  return x === null || y === null ? null : [x, y]
}

function zRange(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null
  const lo = asNumber(value[0])
  const hi = asNumber(value[1])
  if (lo === null || hi === null || hi < lo) return null
  return [lo, hi]
}

function coordRange(value: unknown): [number, number] | null {
  if (!isRecord(value)) return null
  const min = asNumber(value.min)
  const max = asNumber(value.max)
  if (min === null || max === null || max < min) return null
  return [min, max]
}

// ---------------------------------------------------------------------------
// Report parsing
// ---------------------------------------------------------------------------

const STATUS_VALUES: readonly CheckStatus[] = ['PASS', 'FAIL', 'UNKNOWN', 'BORDERLINE']

function asStatus(value: unknown): CheckStatus | null {
  return typeof value === 'string' && (STATUS_VALUES as readonly string[]).includes(value)
    ? (value as CheckStatus)
    : null
}

/** Parse one validator report document (report.json) defensively but without inventing values. */
export function parseReport(raw: unknown): ReportView | null {
  if (!isRecord(raw)) return null
  const overall = asStatus(raw.overall)
  if (overall === null) return null
  const checks: ReportCheck[] = []
  const rawChecks = Array.isArray(raw.checks) ? raw.checks : []
  for (const entry of rawChecks) {
    if (!isRecord(entry)) continue
    const status = asStatus(entry.status)
    const id = asString(entry.id)
    if (status === null || id === null) continue
    const objects = Array.isArray(entry.objects)
      ? entry.objects.filter((item): item is string => typeof item === 'string')
      : []
    checks.push({
      id: (CHECK_IDS as readonly string[]).includes(id) ? (id as CheckId) : 'G01',
      rawId: id,
      status,
      objects,
      measured: isRecord(entry.measured) ? entry.measured : {},
      required: isRecord(entry.required) ? entry.required : {},
      ...(asString(entry.reason_code) ? { reasonCode: asString(entry.reason_code) as string } : {}),
      ...(asString(entry.evidence_ref) ? { evidenceRef: asString(entry.evidence_ref) as string } : {}),
      ...(asString(entry.note) ? { note: asString(entry.note) as string } : {}),
    })
  }
  const hashes = isRecord(raw.hashes) ? raw.hashes : {}
  return {
    reportId: asString(raw.report_id) ?? '(未命名报告)',
    overall,
    taskRevision: asNumber(raw.task_revision),
    createdAt: asString(raw.created_at),
    validatorVersion: asString(raw.validator_version),
    candidateId: asString(raw.candidate_id),
    stepSha256: isSha256(hashes.step_sha256) ? hashes.step_sha256 : null,
    checks,
    errors: Array.isArray(raw.errors)
      ? raw.errors.flatMap((entry) =>
          isRecord(entry) && asString(entry.code)
            ? [{ code: String(entry.code), message: asString(entry.message) ?? '' }]
            : [],
        )
      : [],
    raw,
  }
}

/** All eight checks in frozen order; missing ones are explicit, never implied PASS. */
export function orderedChecks(report: ReportView | null): (ReportCheck | null)[] {
  if (!report) return CHECK_IDS.map(() => null)
  const byId = new Map<string, ReportCheck>()
  for (const check of report.checks) {
    if (!byId.has(check.rawId ?? check.id)) byId.set(check.rawId ?? check.id, check)
  }
  return CHECK_IDS.map((id) => byId.get(id) ?? null)
}

export function reportFreshness(
  report: ReportView | null,
  currentTaskRevision: number | null,
  candidateStepSha256: string | null,
  candidateId?: string | null,
): ReportFreshness {
  if (!report) return { state: 'missing', label: '尚无验证报告' }
  if (candidateId && report.candidateId && candidateId !== report.candidateId)
    return { state: 'stale-binding', label: '报告与当前候选不匹配（已失效）' }
  if (
    report.stepSha256 !== null &&
    candidateStepSha256 !== null &&
    report.stepSha256 !== candidateStepSha256
  )
    return { state: 'stale-binding', label: '报告与当前 STEP 不匹配（已失效）' }
  if (
    report.taskRevision !== null &&
    currentTaskRevision !== null &&
    report.taskRevision !== currentTaskRevision
  )
    return {
      state: 'stale-revision',
      label: `按旧要求 revision ${report.taskRevision} 通过/失败（当前 revision ${currentTaskRevision}）`,
    }
  if (report.taskRevision === null || report.stepSha256 === null || currentTaskRevision === null || candidateStepSha256 === null || report.candidateId === null
    || !isRecord(report.raw) || asString(report.raw.report_id) === null)
    return {
      state: 'unverified-metadata',
      label: '报告缺少 revision/候选/STEP/报告身份元数据，无法确认与当前要求一致',
    }
  return { state: 'current', label: '与当前要求一致' }
}

/** Object ids that a non-PASS check points at (used for red highlighting). */
export function failingObjects(report: ReportView | null): string[] {
  if (!report) return []
  const ids = new Set<string>()
  for (const check of report.checks) {
    if (check.status === 'PASS') continue
    for (const object of check.objects) ids.add(object)
  }
  return [...ids]
}

export function checkObjects(report: ReportView | null, checkId: CheckId): string[] {
  if (!report) return []
  const check = orderedChecks(report)[CHECK_IDS.indexOf(checkId)]
  return check?.objects ?? []
}

// ---------------------------------------------------------------------------
// Short, report-derived readouts for the G01–G08 cards
// ---------------------------------------------------------------------------

/** One labelled readout shown on a check card before opening the raw data. */
export interface SummaryLine {
  label: string
  value: string
  tone?: 'ok' | 'warn' | 'muted'
  /** Extra context (rendered as a tooltip) — never a replacement for the value. */
  hint?: string
}

/** One measured pair from the validator's per-pair clearance evidence. */
export interface EvidencePair {
  moving: string
  fixed: string
  distanceMm: number | null
  intersectionVolumeMm3: number | null
  allowedSupport: boolean
  requiredClearanceMm: number | null
  status: string | null
  reasonCode: string | null
}

export interface PairClearance {
  pairs: EvidencePair[]
  /**
   * True only when every listed entry parsed into a pair and every pair carries a measured
   * distance. A partial list can still be displayed, but it must not be used to *verify* a
   * report summary: a skipped entry could have been the smallest distance.
   */
  evidenceComplete: boolean
  /**
   * Smallest distance between a moving and a fixed solid, *excluding* the
   * contacts the task explicitly allows (for example the device resting on the
   * plate). This is what G06 is about: the report's own aggregate field counts
   * allowed support contacts too, so it can read 0 while the free space is not
   * zero — the panel must never show that 0 as the minimum free gap.
   */
  minimumFreeClearanceMm: number | null
  freeClearancePair: EvidencePair | null
  /** Smallest distance including allowed support contacts (shown for contrast). */
  minimumContactDistanceMm: number | null
  failingPairs: EvidencePair[]
  /** Pair with the largest intersection volume, when the evidence lists any. */
  worstPair: EvidencePair | null
  maxIntersectionMm3: number | null
}

/**
 * Read the validator's per-pair clearance evidence (`evidence.pairs`).
 * Returns null when the response carries no pair list at all — callers must
 * then say "未测量" instead of reusing the report's aggregate number.
 */
export function summarizePairs(evidence: unknown): PairClearance | null {
  if (!isRecord(evidence)) return null
  const raw = Array.isArray(evidence.pairs)
    ? evidence.pairs
    : isRecord(evidence.sensor_group) && Array.isArray(evidence.sensor_group.pairs)
      ? evidence.sensor_group.pairs
      : null
  if (!raw) return null
  const pairs: EvidencePair[] = []
  let skipped = 0
  for (const entry of raw) {
    if (!isRecord(entry)) {
      skipped += 1
      continue
    }
    const moving = asString(entry.moving)
    const fixed = asString(entry.fixed)
    if (!moving || !fixed) {
      skipped += 1
      continue
    }
    pairs.push({
      moving,
      fixed,
      distanceMm: asNumber(entry.distance_mm),
      intersectionVolumeMm3: asNumber(entry.intersection_volume_mm3),
      allowedSupport: entry.allowed_support === true,
      requiredClearanceMm: asNumber(entry.required_clearance_mm),
      status: asString(entry.status),
      reasonCode: asString(entry.reason_code),
    })
  }
  if (pairs.length === 0) return null
  // The same stable rule the validator documents for its own summary: compare on the distance
  // the report pairs already carry (6 decimals) and break ties on (moving, fixed) id order, so
  // the pairs-derived choice here can never disagree with a report summary about a tie.
  const closer = (candidate: EvidencePair, current: EvidencePair): boolean => {
    if (candidate.distanceMm === null) return false
    if (current.distanceMm === null) return true
    const candidateMm = Math.round(candidate.distanceMm * 1e6)
    const currentMm = Math.round(current.distanceMm * 1e6)
    if (candidateMm !== currentMm) return candidateMm < currentMm
    if (candidate.moving !== current.moving) return candidate.moving < current.moving
    return candidate.fixed < current.fixed
  }
  let freePair: EvidencePair | null = null
  let contactPair: EvidencePair | null = null
  let worstPair: EvidencePair | null = null
  const failingPairs: EvidencePair[] = []
  for (const pair of pairs) {
    if (pair.distanceMm !== null) {
      if (contactPair === null || closer(pair, contactPair)) contactPair = pair
      if (!pair.allowedSupport && (freePair === null || closer(pair, freePair))) freePair = pair
    }
    const volume = pair.intersectionVolumeMm3 ?? -1
    if (worstPair === null || volume > (worstPair.intersectionVolumeMm3 ?? -1)) worstPair = pair
    if (pair.status === 'FAIL' || (pair.intersectionVolumeMm3 ?? 0) > 0) failingPairs.push(pair)
  }
  return {
    pairs,
    evidenceComplete: pairs.length > 0 && skipped === 0 && pairs.every((pair) => pair.distanceMm !== null),
    minimumFreeClearanceMm: freePair?.distanceMm ?? null,
    freeClearancePair: freePair,
    minimumContactDistanceMm: contactPair?.distanceMm ?? null,
    failingPairs,
    worstPair,
    maxIntersectionMm3: worstPair?.intersectionVolumeMm3 ?? null,
  }
}

/**
 * The allowed-support aggregate the validator documents, derived from pair evidence alone:
 * penetration first (still a FAIL pair), then a declared support that is not seated, then the
 * uncertainty band, then seated. Returns null when there is no complete evidence to derive from.
 */
function deriveSupportContactStatus(pairs: PairClearance): string | null {
  if (!pairs.evidenceComplete) return null
  const support = pairs.pairs.filter((pair) => pair.allowedSupport)
  if (support.length === 0) return 'NONE'
  if (support.some((pair) => pair.status === 'FAIL' && pair.reasonCode === 'SOLID_INTERFERENCE')) return 'PENETRATION'
  if (support.some((pair) => pair.status === 'FAIL')) return 'NOT_SEATED'
  if (support.some((pair) => pair.status === 'BORDERLINE')) return 'GAP_BORDERLINE'
  return 'SEATED'
}

export type SupportContactStatus = 'SEATED' | 'GAP_BORDERLINE' | 'NOT_SEATED' | 'PENETRATION' | 'NONE' | 'POSE_UNKNOWN'

export interface FreeClearanceReadout {
  /** Where the number came from: the report's own field, the pairs evidence, or nowhere. */
  source: 'report' | 'pairs' | 'none'
  minimumFreeClearanceMm: number | null
  pair: { moving: string; fixed: string } | null
  /** Verified against complete pair evidence, and every pair is an allowed support contact. */
  noFreePair: boolean
  /** The report's summary contradicts the pair evidence (or its own shape). */
  inconsistent: boolean
  note: string | null
  /** verified = cross-checked against complete pair evidence; declared = report-only; none = unusable. */
  confidence: 'verified' | 'declared' | 'none'
  /** The report's summary field exists but is not a finite number / a valid pair shape. */
  malformed: boolean
  /** Complete pair evidence (every entry parsed, every distance measured) was available. */
  evidenceComplete: boolean
}

/** The 6-decimal quantum the report pairs carry; comparisons happen on it, never on raw floats. */
const sixDp = (value: number): number => Math.round(value * 1e6)

/**
 * The G06 free-clearance readout (P02-06, plan section 7.1).
 *
 * Reports produced since 2026-10-08 carry the summary themselves
 * (`measured.minimum_free_clearance_mm` / `minimum_free_clearance_pair`); older reports do
 * not, so the value is derived from complete `evidence.pairs` exactly as before. When both
 * are present the report is only *verified* if, at the 6-decimal precision the pairs carry,
 * (a) the value equals the pairs-derived minimum, (b) the named pair exists in the evidence,
 * is not an allowed support contact, carries exactly that distance, and (c) is the stable
 * `(moving, fixed)` winner among the minimum pairs — a 2 mm summary may never be attributed
 * to a pair the evidence shows at 3.5 mm. Anything that fails this is reported as such and is
 * never dressed up as a good result.
 *
 * Without complete pair evidence the number is a *declaration* only: it may be shown, but
 * marked unverified, and it never lights a verified state. A JSON `null` value means "no free
 * pair was measured" — but that state is only *claimed* until complete evidence confirms it;
 * `noFreePair` is true only for the verified case, so a broken or absent summary can never
 * masquerade as a measured all-support assembly. The legacy `minimum_clearance_mm` (all
 * pairs, allowed contacts included, may read 0) is still not allowed to stand in for the
 * free clearance.
 */
export function freeClearanceReadout(
  measured: Record<string, unknown>,
  pairs: PairClearance | null,
): FreeClearanceReadout {
  const hasValueField = Object.hasOwn(measured, 'minimum_free_clearance_mm')
  const rawValue = measured.minimum_free_clearance_mm
  const valueNull = hasValueField && rawValue === null
  const valueNumber = hasValueField && typeof rawValue === 'number' && Number.isFinite(rawValue)
  const valueInvalid = hasValueField && !valueNull && !valueNumber

  const hasPairField = Object.hasOwn(measured, 'minimum_free_clearance_pair')
  const rawPair = measured.minimum_free_clearance_pair
  const pairNull = hasPairField && rawPair === null
  const pairNamed =
    hasPairField && isRecord(rawPair) && asString(rawPair.moving) !== null && asString(rawPair.fixed) !== null
      ? { moving: asString(rawPair.moving) as string, fixed: asString(rawPair.fixed) as string }
      : null
  const pairInvalid = hasPairField && !pairNull && pairNamed === null

  const evidenceComplete = pairs !== null && pairs.evidenceComplete

  // A summary is complete (a finite number naming its pair, or an explicit null pair with a
  // null value) or it is malformed. A non-number is never silently read as "not measured" -
  // that would turn a broken summary into a measured fact - and a missing pair is not the
  // same as an explicit null pair.
  let malformed = valueInvalid || pairInvalid || (hasPairField && !hasValueField)
  if (hasValueField && !valueInvalid && !pairInvalid) {
    if (valueNumber && pairNamed === null) malformed = true
    if (valueNull && !pairNull) malformed = true
  }

  const pairsFree = pairs ? pairs.minimumFreeClearanceMm : null
  const derivedPair = pairs?.freeClearancePair ?? null

  let inconsistent = false
  let note: string | null = null
  if (malformed) {
    note = '报告的自由间隙摘要字段无效（不是有限数值或对象对形状不符），不能当作已测结果'
  } else if (hasValueField && evidenceComplete) {
    if (valueNull !== (pairsFree === null)) {
      inconsistent = true
      note = '报告摘要与逐对证据对"是否存在自由对象对"说法不一致，不能据此判好'
    } else if (valueNumber && sixDp(rawValue) !== sixDp(pairsFree as number)) {
      inconsistent = true
      note = `报告摘要 ${rawValue} mm 与逐对证据 ${pairsFree} mm 不一致，不能据此判好`
    } else if (valueNumber && pairNamed !== null) {
      const match = pairs.pairs.find((entry) => entry.moving === pairNamed.moving && entry.fixed === pairNamed.fixed)
      if (!match) {
        inconsistent = true
        note = '报告摘要点名的对象对不在逐对证据中，无法核对'
      } else if (match.allowedSupport) {
        inconsistent = true
        note = '报告摘要点名的对象对是允许支撑接触，与自由间隙口径不一致，不能据此判好'
      } else if (match.distanceMm === null || sixDp(match.distanceMm) !== sixDp(rawValue)) {
        inconsistent = true
        note = `报告摘要点名 ${pairNamed.moving} ↔ ${pairNamed.fixed}，但逐对证据里该对距离是 ${match.distanceMm} mm，与摘要值 ${rawValue} mm 不符`
      } else if (derivedPair !== null && (derivedPair.moving !== pairNamed.moving || derivedPair.fixed !== pairNamed.fixed)) {
        inconsistent = true
        note = '报告摘要点名的对象对不是逐对证据的最小自由对（同距按 (moving, fixed) 稳定破平），不能据此判好'
      }
    }
  }

  const source: FreeClearanceReadout['source'] = hasValueField ? 'report' : pairs ? 'pairs' : 'none'
  const confidence: FreeClearanceReadout['confidence'] = malformed
    ? 'none'
    : hasValueField
      ? evidenceComplete && !inconsistent
        ? 'verified'
        : 'declared'
      : pairs
        ? evidenceComplete
          ? 'verified'
          : 'declared'
        : 'none'
  const minimumFreeClearanceMm = malformed ? null : valueNumber ? rawValue : hasValueField ? null : pairsFree
  const pair = malformed ? null : hasValueField ? pairNamed : derivedPair
  const noFreePair =
    !malformed && !inconsistent && evidenceComplete && ((hasValueField && valueNull) || (!hasValueField && pairsFree === null))
  return { source, minimumFreeClearanceMm, pair, noFreePair, inconsistent, note, confidence, malformed, evidenceComplete }
}

/** Human label for the validator's reason codes; unknown codes stay raw. */
const REASON_LABELS: Record<string, string> = {
  SOLID_INVALID: '实体无效',
  NO_SOLID: 'STEP 中没有实体',
  MULTIPLE_OR_FREE_BODIES: '存在多个实体或游离体',
  NON_POSITIVE_VOLUME: '体积非正',
  UNSUPPORTED_FEATURE: '含不支持的几何特征',
  PLATE_GEOMETRY_MISMATCH: '板体几何与冻结要求不符',
  PLATE_SIZE_MISMATCH: '板体尺寸与冻结要求不符',
  AMBIGUOUS_BASE_HOLE_MATCH: '底座孔匹配不唯一',
  BASE_HOLE_MISSING_OR_DISPLACED: '底座孔缺失或位置偏离',
  BASE_HOLE_MISMATCH: '底座孔与冻结要求不符',
  SENSOR_HOLE_MISSING: '缺少传感器安装孔',
  SENSOR_HOLE_EXTRA: '存在多余的传感器孔',
  SENSOR_HOLE_DIAMETER: '传感器孔径超出公差',
  SENSOR_HOLE_COUNT_MISMATCH: '传感器孔数量不符',
  SENSOR_HOLE_PATTERN_MISMATCH: '传感器孔组形状不符',
  SENSOR_HOLE_MISMATCH: '传感器孔与要求不符',
  AMBIGUOUS_SENSOR_POSE: '传感器位姿不唯一',
  EDGE_LIGAMENT: '孔边材料不足',
  HOLE_LIGAMENT: '孔间材料不足',
  LIGAMENT_VIOLATION: '孔边/孔间材料不足',
  NO_HOLES_IDENTIFIED: '未识别到孔',
  SOLID_INTERFERENCE: '实体干涉：操作空间与固定对象相交',
  CLEARANCE_VIOLATION: '自由间隙小于要求',
  ASSEMBLY_CONSTRAINT: '装配约束不满足',
  UPSTREAM_G03_NOT_MATCHED: '上游 G03（底座孔）未通过，本项无法判断',
  UPSTREAM_G04_NOT_PASSED: '上游 G04（传感器孔组）未通过，本项无法判断',
  UPSTREAM_ARTEFACT_UNREADABLE: '产物不可读，检查未执行',
  SCENE_HASH_MISMATCH: '冻结场景与引用哈希不一致',
  FROZEN_CONDITION_CHANGED: '冻结条件被改动',
  STL_NOT_PROVIDED: '缺少 STL 导出',
  EXPORT_INCONSISTENT: '导出结果与 STEP 不一致',
  PREVIEW_MESH_NOT_PROVIDED: '未提供预览网格',
  PREVIEW_MESH_UNREADABLE: '预览网格不可读',
  PREVIEW_MESH_MALFORMED: '预览网格格式错误',
  PREVIEW_MESH_HASH_MISMATCH: '预览网格哈希与 STEP 不符',
  PREVIEW_MESH_CANDIDATE_MISMATCH: '预览网格属于其他候选',
  PREVIEW_MESH_UNVERIFIABLE: '预览网格无法校验',
  PREVIEW_MESH_TRIANGLE_MISMATCH: '预览网格三角面与报告不符',
  PREVIEW_MESH_BOUNDS_MISMATCH: '预览网格包围盒不符',
  PREVIEW_MESH_DEGENERATE_TRIANGLE: '预览网格含退化三角面',
  PREVIEW_MESH_TOLERANCE_MISSING: '预览网格缺少容差',
  PREVIEW_MESH_TOLERANCE_OUT_OF_RANGE: '预览网格容差超出范围',
  STALE_INPUT: '输入已过期（重新运行后再验证）',
}

export interface ReasonDescription {
  /** Chinese label when the code is known, otherwise the raw code. */
  label: string
  code: string
  known: boolean
}

export function describeReason(code: string | null | undefined): ReasonDescription | null {
  if (!code) return null
  const label = REASON_LABELS[code]
  return { label: label ?? code, code, known: label !== undefined }
}

/** Display formatter shared by the check cards and the raw-data lists. */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '未测量'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value)
    if (Number.isInteger(value)) return String(value)
    return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  }
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(', ')
  if (isRecord(value)) return JSON.stringify(value)
  return String(value)
}

function numberAt(source: Record<string, unknown>, key: string): number | null {
  return asNumber(source[key])
}

function boolAt(source: Record<string, unknown>, key: string): boolean | null {
  const value = source[key]
  return typeof value === 'boolean' ? value : null
}

function stringAt(source: Record<string, unknown>, key: string): string | null {
  return asString(source[key])
}

function mm(value: number): string {
  return `${formatValue(value)} mm`
}

function diameter(min: number | null, max: number | null, nominal: number | null): string | null {
  if (min !== null && max !== null) return min === max ? `⌀${formatValue(min)} mm` : `⌀${formatValue(min)}–${formatValue(max)} mm`
  if (nominal !== null) return `⌀${formatValue(nominal)} mm`
  return null
}

/**
 * A few meaningful, *report-derived* readouts per check (typically 3–5).
 * Every value comes from `measured`/`required`; nothing is inferred or filled
 * in by the panel. Keys the panel does not recognise fall back to a handful of
 * raw entries so a renamed field can never blank a card.
 */
export function checkSummary(
  check: ReportCheck | null,
  options: { pairs?: PairClearance | null } = {},
): SummaryLine[] {
  if (!check) return []
  const lines = summaryLines(check.id, check.measured, check.required, options.pairs ?? null)
  if (lines.length === 0) {
    for (const [key, value] of Object.entries(check.measured).slice(0, 4)) {
      lines.push({ label: key, value: formatValue(value) })
    }
  }
  return lines.slice(0, 6)
}

function summaryLines(
  id: CheckId,
  m: Record<string, unknown>,
  r: Record<string, unknown>,
  pairs: PairClearance | null,
): SummaryLine[] {
  const lines: SummaryLine[] = []
  const tolerance =
    numberAt(m, 'dimensional_tolerance_mm') ?? numberAt(r, 'dimensional_tolerance_mm') ?? null

  switch (id) {
    case 'G01': {
      const volume = numberAt(m, 'volume_mm3')
      if (volume !== null) lines.push({ label: '实测体积', value: `${formatValue(volume)} mm³` })
      const solids = numberAt(m, 'solid_count')
      if (solids !== null)
        lines.push({
          label: '实体数',
          value: solids === 1 ? '1（单一连通实体）' : formatValue(solids),
          tone: solids === 1 ? 'ok' : 'warn',
        })
      const freeShapes = numberAt(m, 'free_shape_count')
      if (freeShapes !== null)
        lines.push({
          label: '游离形状',
          value: freeShapes === 0 ? '无' : formatValue(freeShapes),
          tone: freeShapes === 0 ? undefined : 'warn',
        })
      const missing = numberAt(m, 'missing_material_mm3')
      const extra = numberAt(m, 'unexpected_material_mm3')
      if (missing !== null || extra !== null) {
        const bad = (missing ?? 0) > 0 || (extra ?? 0) > 0
        lines.push({
          label: '缺失/多余材料',
          value: `${formatValue(missing ?? 0)} / ${formatValue(extra ?? 0)} mm³`,
          tone: bad ? 'warn' : 'ok',
        })
      }
      break
    }
    case 'G02': {
      const width = numberAt(m, 'width_mm')
      const height = numberAt(m, 'height_mm')
      const thickness = numberAt(m, 'thickness_mm')
      if (width !== null && height !== null && thickness !== null)
        lines.push({
          label: '实测尺寸',
          value: `${formatValue(width)} × ${formatValue(height)} × ${formatValue(thickness)} mm`,
          hint: '宽 × 高 × 厚',
        })
      const deviations = ['width_deviation_mm', 'height_deviation_mm', 'thickness_deviation_mm']
        .map((key) => numberAt(m, key))
        .filter((value): value is number => value !== null)
      if (deviations.length > 0) {
        const worst = Math.max(...deviations.map((value) => Math.abs(value)))
        lines.push({
          label: '尺寸偏差（最大）',
          value: mm(worst),
          tone: tolerance !== null && worst > tolerance ? 'warn' : 'ok',
        })
      }
      if (tolerance !== null) lines.push({ label: '允许偏差', value: `±${formatValue(tolerance)} mm`, tone: 'muted' })
      break
    }
    case 'G03': {
      const holes = numberAt(m, 'base_hole_count') ?? numberAt(r, 'base_hole_count')
      if (holes !== null) lines.push({ label: '孔数', value: `${formatValue(holes)} 个` })
      const measured = diameter(
        numberAt(m, 'min_measured_diameter_mm'),
        numberAt(m, 'max_measured_diameter_mm'),
        null,
      )
      if (measured !== null) lines.push({ label: '实测孔径', value: measured })
      else {
        const nominal = numberAt(r, 'base_hole_diameter_mm')
        if (nominal !== null) lines.push({ label: '要求孔径', value: `⌀${formatValue(nominal)} mm`, tone: 'muted' })
      }
      const deviation = numberAt(m, 'worst_center_deviation_mm')
      if (deviation !== null)
        lines.push({
          label: '中心偏差（最大）',
          value: mm(deviation),
          tone: tolerance !== null && deviation > tolerance ? 'warn' : 'ok',
        })
      const nonThrough = numberAt(m, 'non_through_holes')
      if (nonThrough !== null)
        lines.push({
          label: '未通孔',
          value: nonThrough === 0 ? '无' : `${formatValue(nonThrough)} 个`,
          tone: nonThrough === 0 ? undefined : 'warn',
        })
      break
    }
    case 'G04': {
      const holes = numberAt(m, 'hole_count') ?? numberAt(r, 'hole_count')
      if (holes !== null) lines.push({ label: '孔数', value: `${formatValue(holes)} 个` })
      const measured = diameter(
        numberAt(m, 'min_measured_diameter_mm'),
        numberAt(m, 'max_measured_diameter_mm'),
        numberAt(r, 'hole_diameter_mm'),
      )
      if (measured !== null) lines.push({ label: '孔径', value: measured })
      const solutions = numberAt(m, 'pose_solutions')
      if (solutions !== null)
        lines.push({
          label: '位姿解',
          value: solutions === 1 ? '1（唯一解）' : `${formatValue(solutions)}（不唯一）`,
          tone: solutions === 1 ? 'ok' : 'warn',
          hint: '由 STEP 实际孔组推导；只有唯一解才能用于装配判断',
        })
      const cx = numberAt(m, 'derived_center_x_mm')
      const cy = numberAt(m, 'derived_center_y_mm')
      if (cx !== null && cy !== null)
        lines.push({ label: '实测中心', value: `(${formatValue(cx)}, ${formatValue(cy)}) mm`, hint: '板面坐标系' })
      const pattern = numberAt(m, 'worst_pattern_deviation_mm')
      if (pattern !== null)
        lines.push({
          label: '孔组偏差（最大）',
          value: mm(pattern),
          tone: tolerance !== null && pattern > tolerance ? 'warn' : 'ok',
        })
      break
    }
    case 'G05': {
      const checked = numberAt(m, 'holes_checked')
      if (checked !== null) lines.push({ label: '检查孔数', value: `${formatValue(checked)} 个` })
      const edge = numberAt(m, 'minimum_edge_ligament_mm') ?? numberAt(m, 'min_edge_ligament_mm')
      const edgeRequired = numberAt(r, 'minimum_edge_ligament_mm')
      if (edge !== null) {
        const tightest = stringAt(m, 'tightest_edge_hole')
        lines.push({
          label: '最小孔边材料',
          value: `${mm(edge)}${edgeRequired !== null ? `（要求 ≥${formatValue(edgeRequired)} mm）` : ''}`,
          tone: edgeRequired !== null && edge < edgeRequired ? 'warn' : 'ok',
          ...(tightest ? { hint: `最紧处：${tightest}` } : {}),
        })
      }
      const hole = numberAt(m, 'minimum_hole_ligament_mm')
      const holeRequired = numberAt(r, 'minimum_hole_ligament_mm')
      if (hole !== null) {
        const tightest = stringAt(m, 'tightest_hole_pair')
        lines.push({
          label: '最小孔间材料',
          value: `${mm(hole)}${holeRequired !== null ? `（要求 ≥${formatValue(holeRequired)} mm）` : ''}`,
          tone: holeRequired !== null && hole < holeRequired ? 'warn' : 'ok',
          ...(tightest ? { hint: `最紧处：${tightest}` } : {}),
        })
      }
      const unexplained = numberAt(m, 'unexplained_holes')
      if (unexplained !== null)
        lines.push({
          label: '未解释孔',
          value: unexplained === 0 ? '无' : `${formatValue(unexplained)} 个`,
          tone: unexplained === 0 ? undefined : 'warn',
        })
      break
    }
    case 'G06': {
      const freeRequired = numberAt(r, 'minimum_free_clearance_mm')
      const readout = freeClearanceReadout(m, pairs)
      const requiredText = freeRequired !== null ? `（要求 ≥${formatValue(freeRequired)} mm）` : ''
      if (readout.inconsistent || readout.malformed) {
        // The report and its own evidence disagree (or the summary itself is broken): show
        // what the report says, but never as a good result, and say why.
        lines.push({
          label: '最小自由间隙',
          value: readout.minimumFreeClearanceMm !== null ? `${mm(readout.minimumFreeClearanceMm)}${requiredText}` : '无法核对',
          tone: 'warn',
          hint: readout.note ?? '报告摘要与逐对证据不一致，不能据此判好',
        })
      } else if (readout.minimumFreeClearanceMm !== null) {
        const verified = readout.confidence === 'verified'
        lines.push({
          label: '最小自由间隙',
          value: `${mm(readout.minimumFreeClearanceMm)}${requiredText}${verified ? '' : '・未核对'}`,
          tone: freeRequired !== null && readout.minimumFreeClearanceMm < freeRequired ? 'warn' : verified ? 'ok' : 'muted',
          hint: verified
            ? readout.pair
              ? `最紧处：${readout.pair.moving} ↔ ${readout.pair.fixed}；已排除允许支撑接触`
              : '已排除允许支撑接触'
            : '报告声明值：没有（完整的）逐对证据可核对，不能当作已测正常结果',
        })
      } else if (readout.noFreePair) {
        lines.push({
          label: '最小自由间隙',
          value: '无自由对象对',
          tone: 'muted',
          hint: '逐对证据核对过：已测对象对都是允许支撑接触；没有自由（非支撑）对象对，不能拿 0 当自由间隙',
        })
      } else if (readout.source === 'report') {
        // Declared "no free pair" without complete evidence: a claim, not a verified state.
        lines.push({
          label: '最小自由间隙',
          value: '未核对',
          tone: 'muted',
          hint: '报告声明没有自由对象对，但缺少（完整）逐对证据核对；不能当作已测结果',
        })
      } else {
        lines.push({
          label: '最小自由间隙',
          value: '未测量',
          tone: 'muted',
          hint: '响应未提供逐对（pairs）间隙证据或独立自由间隙摘要，不能用报告汇总值代替',
        })
      }
      const CONTACT_READOUTS: Record<string, { value: string; tone?: 'ok' | 'warn' | 'muted'; hint?: string }> = {
        SEATED: { value: '贴合正常（允许接触，无穿透）', tone: 'ok', hint: '允许支撑接触可以贴合，但不允许穿透' },
        GAP_BORDERLINE: { value: '接触间隙处于临界带', tone: 'warn', hint: '在数值不确定带内：需要更大余量或人工复核' },
        NOT_SEATED: { value: '未贴合（允许支撑接触缺失）', tone: 'warn', hint: '声明为支撑的对象对没有接触，设备处于悬空' },
        PENETRATION: { value: '穿透（不允许）', tone: 'warn', hint: '允许接触不允许穿透，该对象对按 FAIL 计' },
        NONE: { value: '无允许支撑接触对', tone: 'muted', hint: '该装配没有声明支撑接触，此状态不代表贴合' },
        POSE_UNKNOWN: { value: '位姿未知，未测量', tone: 'muted', hint: 'G04 未通过时没有任何装配测量，也没有编造的数字' },
      }
      const contactStatus = asString(m.support_contact_status)
      const derivedContact = pairs !== null ? deriveSupportContactStatus(pairs) : null
      if (contactStatus !== null) {
        const readoutLine = CONTACT_READOUTS[contactStatus]
        const label = readoutLine?.value ?? contactStatus
        if (contactStatus === 'POSE_UNKNOWN') {
          lines.push({ label: '支撑接触', value: label, tone: 'muted', hint: readoutLine?.hint })
        } else if (!readout.evidenceComplete) {
          // Declared without complete pair evidence: show it, but never as a checked result.
          const declaredWarn = !['SEATED', 'NONE'].includes(contactStatus)
          lines.push({
            label: '支撑接触',
            value: `${label}・报告声明，未核对`,
            tone: declaredWarn ? 'warn' : 'muted',
            hint: '缺少（完整）逐对证据核对支撑接触状态，不能当作已核对结果',
          })
        } else if (derivedContact !== null && derivedContact !== contactStatus) {
          lines.push({
            label: '支撑接触',
            value: `${label}（与逐对证据不一致：证据判 ${CONTACT_READOUTS[derivedContact]?.value ?? derivedContact}）`,
            tone: 'warn',
            hint: '报告摘要与逐对证据的支撑接触状态不一致，不能据此判好',
          })
        } else {
          lines.push({
            label: '支撑接触',
            value: label,
            ...(readoutLine?.tone ? { tone: readoutLine.tone } : {}),
            ...(readoutLine?.hint ? { hint: readoutLine.hint } : {}),
          })
        }
      } else if (derivedContact !== null && !readout.inconsistent && !readout.malformed) {
        // Old report without the field: derive the contact state from complete pair evidence.
        const derivedLine = CONTACT_READOUTS[derivedContact]
        lines.push({
          label: '支撑接触',
          value: derivedLine?.value ?? derivedContact,
          ...(derivedLine?.tone ? { tone: derivedLine.tone } : {}),
          hint: '由逐对证据推导（旧报告没有该摘要字段）',
        })
      }
      const interference = numberAt(m, 'maximum_intersection_volume_mm3') ?? numberAt(m, 'intersection_volume_mm3')
      const epsilon = numberAt(r, 'interference_volume_epsilon_mm3')
      if (interference !== null) {
        const bad = epsilon !== null ? interference > epsilon : interference > 0
        lines.push({ label: '最大干涉体积', value: `${formatValue(interference)} mm³`, tone: bad ? 'warn' : 'ok' })
      }
      const pairsChecked = numberAt(m, 'pairs_checked')
      const failing = numberAt(m, 'failing_pairs') ?? (pairs ? pairs.failingPairs.length : null)
      if (pairsChecked !== null || failing !== null)
        lines.push({
          label: '检查对',
          value:
            pairsChecked !== null
              ? `${formatValue(pairsChecked)} 对${failing !== null ? `（失败 ${formatValue(failing)}）` : ''}`
              : `失败 ${formatValue(failing ?? 0)} 对`,
          tone: failing !== null && failing > 0 ? 'warn' : undefined,
        })
      let worstPair = stringAt(m, 'worst_pair')
      if (worstPair === null && pairs && pairs.failingPairs.length > 0 && pairs.worstPair)
        worstPair = `${pairs.worstPair.moving}/${pairs.worstPair.fixed}`
      if (worstPair !== null && failing !== null && failing > 0)
        lines.push({ label: '干涉对象', value: worstPair.replace('/', ' ↔ '), tone: 'warn' })
      const pairsContactMin = pairs?.minimumContactDistanceMm ?? null
      // The all-pairs minimum, allowed contacts included: pairs-derived when evidence exists,
      // otherwise the report's own field (new name first, legacy `minimum_clearance_mm`).
      const contactMin =
        pairsContactMin ?? numberAt(m, 'minimum_pair_distance_mm') ?? numberAt(m, 'minimum_clearance_mm')
      if (contactMin !== null && !readout.inconsistent && (readout.minimumFreeClearanceMm === null || contactMin < readout.minimumFreeClearanceMm))
        lines.push({
          label: '含允许支撑最小距离',
          value: mm(contactMin),
          tone: 'muted',
          hint:
            pairsContactMin !== null
              ? '设备与板的贴合等允许支撑接触不算自由间隙'
              : 'minimum_pair_distance_mm 是全对最小值（旧字段 minimum_clearance_mm 同义，含允许接触），不能当自由间隙',
        })
      break
    }
    case 'G07': {
      const preserved = boolAt(m, 'frozen_dimensions_preserved')
      if (preserved !== null)
        lines.push({ label: '冻结尺寸保持', value: preserved ? '是' : '否', tone: preserved ? 'ok' : 'warn' })
      const sections = numberAt(m, 'section_holes_found')
      if (sections !== null) lines.push({ label: '截面实测孔数', value: `${formatValue(sections)} 个` })
      const deviation = numberAt(m, 'section_worst_deviation_mm')
      if (deviation !== null)
        lines.push({
          label: '截面偏差（最大）',
          value: mm(deviation),
          tone: tolerance !== null && deviation > tolerance ? 'warn' : 'ok',
        })
      const hashMatches = boolAt(m, 'scene_hash_matches')
      if (hashMatches !== null)
        lines.push({ label: '冻结场景哈希', value: hashMatches ? '一致' : '不一致', tone: hashMatches ? 'ok' : 'warn' })
      break
    }
    case 'G08': {
      const closed = boolAt(m, 'stl_closed')
      if (closed !== null) lines.push({ label: 'STL 闭合', value: closed ? '是' : '否', tone: closed ? 'ok' : 'warn' })
      const triangles = numberAt(m, 'stl_triangles')
      if (triangles !== null) lines.push({ label: '三角面', value: `${formatValue(triangles)} 个` })
      const boundary = numberAt(m, 'stl_boundary_edges')
      const nonManifold = numberAt(m, 'stl_non_manifold_edges')
      if (boundary !== null || nonManifold !== null) {
        const bad = (boundary ?? 0) > 0 || (nonManifold ?? 0) > 0
        lines.push({
          label: '边界边/非流形边',
          value: `${formatValue(boundary ?? 0)} / ${formatValue(nonManifold ?? 0)}`,
          tone: bad ? 'warn' : 'ok',
        })
      }
      const delta = numberAt(m, 'stl_volume_delta_mm3')
      const budget = numberAt(m, 'stl_volume_budget_mm3')
      if (delta !== null)
        lines.push({
          label: 'STEP↔STL 体积差',
          value: `${formatValue(Math.abs(delta))} mm³${budget !== null ? `（预算 ${formatValue(budget)} mm³）` : ''}`,
          tone: budget !== null && Math.abs(delta) > budget ? 'warn' : 'ok',
        })
      break
    }
  }
  return lines
}

/** User-facing data-source line for the task region. */
export interface ProvenanceDescription {
  text: string
  /** Long declared source string, shown as a tooltip instead of inline. */
  hint?: string
  warn: boolean
}

const PROVENANCE_KINDS: Record<string, string> = {
  synthetic_teaching_fixture: '教学用合成数据（非实测设备）',
  user_supplied: '用户提供的数据',
  measured_device: '实测设备数据',
  vendor_datasheet: '厂商数据手册数据',
}

const REVIEW_LABELS: Record<string, string> = {
  not_reviewed: '未复核',
  awaiting_geometry_verification: '等待几何验证',
  verified: '已复核',
}

export function describeProvenance(provenance: TaskView['provenance']): ProvenanceDescription {
  if (!provenance || (!provenance.kind && !provenance.source && !provenance.reviewStatus)) {
    return { text: '本次运行的输入任务（未附来源标注）', warn: false }
  }
  const kind = provenance.kind ? (PROVENANCE_KINDS[provenance.kind] ?? provenance.kind) : '来源未标注'
  const review = provenance.reviewStatus
    ? (REVIEW_LABELS[provenance.reviewStatus] ?? provenance.reviewStatus)
    : '未标注复核状态'
  const warn = provenance.kind !== 'measured_device' && provenance.kind !== 'vendor_datasheet'
  return {
    text: `${kind} · ${review}`,
    ...(provenance.source ? { hint: provenance.source } : {}),
    warn,
  }
}

// ---------------------------------------------------------------------------
// Device pose resolution
// ---------------------------------------------------------------------------

export interface PoseInputs {
  report: ReportView | null
  evidence: unknown
  /** DesignSpec document, when the service chose to include it. */
  design: unknown
  /**
   * The backend's own resolved device block (`fitplate.scene.device`), which
   * already states whether the pose was measured (source `g04-measured`) or is
   * the unverified design fallback (`design-fallback`).
   */
  device?: unknown
}

/**
 * Resolve where the moving device sits, preferring the pose the validator
 * derived from the actual holes (G04) over anything the candidate asked for.
 */
export function resolveDevicePose(inputs: PoseInputs): PoseInfo {
  const declared = declaredDevicePose(inputs.device)
  if (declared) return declared
  const unknown: PoseInfo = {
    center: null,
    rotationDeg: 0,
    source: 'unknown',
    verified: false,
    poseSolutions: null,
    worstDeviationMm: null,
    note: '没有可用的实测位姿：G04 尚未给出唯一解，设备与操作空间无法定位',
  }

  // 1. report G04 measured pose (derived from the holes present in the STEP).
  const g04 = inputs.report ? orderedChecks(inputs.report)[3] : null
  if (g04) {
    const measured = g04.measured
    const cx = asNumber(measured.derived_center_x_mm)
    const cy = asNumber(measured.derived_center_y_mm)
    const solutions = asNumber(measured.pose_solutions)
    const worst = asNumber(measured.worst_pattern_deviation_mm)
    if (g04.status === 'FAIL' && (solutions === null || solutions === 0)) {
      return {
        ...unknown,
        poseSolutions: solutions,
        worstDeviationMm: worst,
        note: `G04 失败：${g04.reasonCode ?? 'SENSOR_HOLE_MISMATCH'}，孔组无法解释出唯一位姿`,
      }
    }
    if (cx !== null && cy !== null && (solutions === null || solutions === 1)) {
      const solved = solutions === 1
      return {
        center: [cx, cy],
        rotationDeg: 0,
        source: 'report_g04',
        verified: solved,
        poseSolutions: solutions,
        worstDeviationMm: worst,
        note: solved
          ? `实测位姿：由 G04 从 STEP 实际孔组推导（孔组最大偏差 ${worst === null ? '未记录' : `${worst.toFixed(4)}mm`}）`
          : 'G04 报告了实测孔组中心，但未标记唯一解；按实测孔组中心显示',
      }
    }
    if (solutions !== null && solutions > 1) {
      return {
        ...unknown,
        poseSolutions: solutions,
        worstDeviationMm: worst,
        note: `G04 有 ${solutions} 个解，位姿不唯一；不显示设备包络`,
      }
    }
  }

  // 2. Evidence document (validator feature-level output).
  const evidencePose = evidenceDevicePose(inputs.evidence)
  if (evidencePose) {
    return {
      center: evidencePose.center,
      rotationDeg: 0,
      source: 'evidence',
      verified: evidencePose.verified,
      poseSolutions: evidencePose.solutions,
      worstDeviationMm: evidencePose.worst,
      note: evidencePose.verified
        ? '实测位姿：由 STEP 实测孔组推导'
        : '验证器给出了孔组位姿但状态非 PASS，按未验证显示',
    }
  }

  // 3. Candidate design pose: shown, but explicitly unverified.
  if (isRecord(inputs.design)) {
    const pose = inputs.design.sensor_pose
    if (isRecord(pose)) {
      const center = xyPair(pose.center)
      const rotation = asNumber(pose.rotation_deg)
      if (center) {
        return {
          center,
          rotationDeg: rotation ?? 0,
          source: 'design_candidate',
          verified: false,
          poseSolutions: null,
          worstDeviationMm: null,
          note: '候选位姿（来自 DesignSpec，尚未由 G04 实测确认）',
        }
      }
    }
  }

  return unknown
}

/** Read the backend `device` block (`fitplate.scene.device`). */
function declaredDevicePose(device: unknown): PoseInfo | null {
  if (!isRecord(device)) return null
  const center = xyPair(device.center_xy)
  if (!center) return null
  const source = asString(device.source)
  const verified = device.verified === true && source !== 'design-fallback'
  const worst = asNumber(device.worst_deviation_mm)
  const warning = asString(device.warning)
  return {
    center,
    rotationDeg: asNumber(device.rotation_deg) ?? 0,
    source: verified ? 'evidence' : 'design_candidate',
    verified,
    poseSolutions: null,
    worstDeviationMm: worst,
    note: verified
      ? `实测位姿：由 STEP 实际孔组推导${worst === null ? '' : `（最大偏差 ${worst.toFixed(4)}mm）`}`
      : warning ?? '候选位姿（未由孔组实测确认），不得作为通过结果展示',
  }
}

function evidenceDevicePose(evidence: unknown): {
  center: [number, number]
  verified: boolean
  solutions: number | null
  worst: number | null
} | null {
  if (!isRecord(evidence)) return null
  // Two shapes exist in the wild: the nested `sensor_group` block and an older
  // flattened form with `derived_pose` / `pose_status` at the evidence root.
  const nested = isRecord(evidence.sensor_group) ? evidence.sensor_group : null
  const group = nested ?? (isRecord(evidence.derived_pose) ? evidence : null)
  if (!group) return null
  const pose = isRecord(group.derived_pose) ? group.derived_pose : null
  const center = pose ? xyPair(pose.center_xy) : null
  if (!center) return null
  const poseStatus = group.pose_status
  return {
    center,
    verified: poseStatus === 'PASS',
    solutions: poseStatus === 'PASS' ? 1 : null,
    worst: pose ? asNumber(pose.worst_deviation_mm) : null,
  }
}

/** Plate thickness used to seat the device body; measured value wins over the frozen one. */
export function resolvePlateThickness(
  report: ReportView | null,
  task: TaskView | null,
): { thicknessMm: number | null; source: 'report_g02' | 'task_frozen' | 'unknown' } {
  const g02 = report ? orderedChecks(report)[1] : null
  const measured = g02 ? asNumber(g02.measured.thickness_mm) : null
  if (measured !== null) return { thicknessMm: measured, source: 'report_g02' }
  const nominal = task?.plate?.thickness ?? null
  if (nominal !== null) return { thicknessMm: nominal, source: 'task_frozen' }
  return { thicknessMm: null, source: 'unknown' }
}

// ---------------------------------------------------------------------------
// Envelope descriptors
// ---------------------------------------------------------------------------

export interface BuildEnvelopesInput {
  scene: unknown
  task: TaskView | null
  pose: PoseInfo
  plateTopZ: number | null
}

export interface BuildEnvelopesResult {
  envelopes: SceneEnvelope[]
  notes: string[]
}

/**
 * Turn the frozen scene + task + measured pose into drawable envelopes.
 *
 * Cylinders come straight from the frozen scene (they are absolute). The
 * connector box is stored in the device-local frame, so it can only be placed
 * once a device centre is known; the device body comes from the frozen task
 * size seated on the plate top.
 */
export function buildEnvelopes(input: BuildEnvelopesInput): BuildEnvelopesResult {
  const envelopes: SceneEnvelope[] = []
  const notes: string[] = []
  const scene = isRecord(input.scene) ? input.scene : null
  if (!scene) {
    notes.push('冻结场景缺失：无法构造固定环境包络')
    return { envelopes, notes }
  }

  const objects = Array.isArray(scene.objects) ? scene.objects : []
  for (const entry of objects) {
    if (!isRecord(entry)) continue
    const id = asString(entry.id)
    if (!id) continue
    if (entry.kind === 'cylinder') {
      const axis = xyPair(entry.axis_xy)
      const radius = asNumber(entry.radius)
      const range = zRange(entry.z_range)
      if (!axis || radius === null || !range) continue
      envelopes.push({
        id,
        role: asString(entry.role) ?? 'fixed_obstacle',
        kind: 'cylinder',
        center: [axis[0], axis[1], (range[0] + range[1]) / 2],
        radius,
        height: range[1] - range[0],
        movable: false,
        source: 'frozen_scene',
      })
      continue
    }
    if (entry.kind === 'box_local_xy_abs_z') {
      const localX = coordRange(Array.isArray(entry.local_xy_range) ? entry.local_xy_range[0] : null)
      const localY = coordRange(Array.isArray(entry.local_xy_range) ? entry.local_xy_range[1] : null)
      const range = zRange(entry.absolute_z_range)
      if (!localX || !localY || !range) continue
      if (!input.pose.center) {
        notes.push(`操作空间 ${id} 是设备局部坐标，缺少设备中心，暂不显示`)
        continue
      }
      const [cx, cy] = input.pose.center
      envelopes.push({
        id,
        role: asString(entry.role) ?? 'connector_access',
        kind: 'box',
        center: [
          cx + (localX[0] + localX[1]) / 2,
          cy + (localY[0] + localY[1]) / 2,
          (range[0] + range[1]) / 2,
        ],
        size: [localX[1] - localX[0], localY[1] - localY[0], range[1] - range[0]],
        movable: true,
        source: input.pose.verified ? 'device_pose_measured' : 'device_pose_candidate',
      })
    }
  }

  // Device body envelope from the frozen task size, seated on the plate top.
  const body = input.task?.sensor?.bodySize ?? null
  if (body) {
    const [sx, sy, sz] = body
    if (input.pose.center && input.plateTopZ !== null) {
      const [cx, cy] = input.pose.center
      envelopes.push({
        id: 'sensor_body',
        role: 'sensor_body',
        kind: 'box',
        center: [cx, cy, input.plateTopZ + sz / 2],
        size: [sx, sy, sz],
        movable: true,
        source: input.pose.verified ? 'device_pose_measured' : 'device_pose_candidate',
      })
    } else if (!input.pose.center) {
      notes.push('设备包络需要实测位姿(G04)：位姿未知，不显示设备')
    } else {
      notes.push('设备包络需要板顶高度：G02/任务值缺失，不显示设备')
    }
  } else {
    notes.push('任务缺少 sensor.body_size：不显示设备包络')
  }

  return { envelopes, notes }
}

/**
 * Build a ReportView from the run list's flattened report fields
 * (`report_id` / `overall` / `report_created_at` / `validator_version`).
 * Such a summary has no per-check rows and no hashes; the UI marks it as a
 * summary and never treats it as proof of a current pass.
 */
export function reportFromSummary(raw: unknown): ReportView | null {
  if (!isRecord(raw)) return null
  const overall = asStatus(raw.overall)
  if (overall === null) return null
  return {
    reportId: asString(raw.report_id) ?? '(未命名报告)',
    overall,
    taskRevision: asNumber(raw.task_revision),
    createdAt: asString(raw.created_at) ?? asString(raw.report_created_at),
    validatorVersion: asString(raw.validator_version),
    candidateId: asString(raw.candidate_id),
    stepSha256: null,
    checks: Array.isArray(raw.checks)
      ? (parseReport({ overall, checks: raw.checks, report_id: asString(raw.report_id) ?? 'summary' })?.checks ?? [])
      : [],
    errors: [],
    raw,
  }
}

// ---------------------------------------------------------------------------
// Change summary between versions
// ---------------------------------------------------------------------------

export interface DesignSummary {
  plate?: Record<string, unknown>
  sensorCenterXy?: [number, number] | null
  sensorRotationDeg?: number | null
  sensorHoleCenters?: [number, number][]
}

export function parseDesignSummary(raw: unknown): DesignSummary | null {
  if (!isRecord(raw)) return null
  const plate = isRecord(raw.plate) ? raw.plate : undefined
  return {
    ...(plate ? { plate } : {}),
    sensorCenterXy: xyPair(raw.sensor_center_xy),
    sensorRotationDeg: asNumber(raw.sensor_rotation_deg),
    sensorHoleCenters: Array.isArray(raw.sensor_hole_centers_xy)
      ? raw.sensor_hole_centers_xy.flatMap((item) => {
          const pair = xyPair(item)
          return pair ? [pair] : []
        })
      : undefined,
  }
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
}

/** Human-readable diff of two design summaries; empty when nothing comparable changed. */
export function describeDesignChange(previous: DesignSummary | null, current: DesignSummary | null): string[] {
  if (!previous || !current) return []
  const lines: string[] = []
  const dims = ['width', 'height', 'thickness'] as const
  const names: Record<(typeof dims)[number], string> = { width: '板宽', height: '板高', thickness: '板厚' }
  for (const dim of dims) {
    const before = asNumber(previous.plate?.[dim])
    const after = asNumber(current.plate?.[dim])
    if (before !== null && after !== null && Math.abs(before - after) > 1e-9)
      lines.push(`${names[dim]} ${formatNumber(before)} → ${formatNumber(after)} mm`)
  }
  const [bx, by] = previous.sensorCenterXy ?? [null, null]
  const [ax, ay] = current.sensorCenterXy ?? [null, null]
  if (bx !== null && by !== null && ax !== null && ay !== null) {
    if (Math.abs(bx - ax) > 1e-9 || Math.abs(by - ay) > 1e-9)
      lines.push(`设备中心 (${formatNumber(bx)}, ${formatNumber(by)}) → (${formatNumber(ax)}, ${formatNumber(ay)}) mm`)
  }
  const beforeRotation = previous.sensorRotationDeg ?? null
  const afterRotation = current.sensorRotationDeg ?? null
  if (beforeRotation !== null && afterRotation !== null && Math.abs(beforeRotation - afterRotation) > 1e-9)
    lines.push(`设备旋转 ${formatNumber(beforeRotation)}° → ${formatNumber(afterRotation)}°`)
  return lines
}

/** Differences between two reports' per-check statuses. */
export function describeReportChange(previous: ReportView | null, current: ReportView | null): string[] {
  if (!previous || !current) return []
  const before = orderedChecks(previous)
  const after = orderedChecks(current)
  const lines: string[] = []
  for (let i = 0; i < CHECK_IDS.length; i += 1) {
    const a = before[i]
    const b = after[i]
    const aStatus = a ? a.status : '未验证'
    const bStatus = b ? b.status : '未验证'
    if (aStatus !== bStatus) lines.push(`${CHECK_IDS[i]} ${aStatus} → ${bStatus}`)
  }
  return lines
}

// ---------------------------------------------------------------------------
// Version comparison (P02-07): previous/current/compare inside one run
// ---------------------------------------------------------------------------

/**
 * Parse a candidate *design document* (`design.json`) into the comparable
 * summary shape. The frozen design docs carry `plate{width,height,thickness}`
 * and `sensor_pose{center,rotation_deg}`; run summaries (when a backend adds
 * them) carry the `sensor_center_xy`/`sensor_rotation_deg` spelling — both are
 * accepted, and anything else is refused rather than guessed.
 */
export function designSummaryFromDocument(raw: unknown): DesignSummary | null {
  if (!isRecord(raw)) return null
  const summary = parseDesignSummary(raw)
  const pose = isRecord(raw.sensor_pose) ? raw.sensor_pose : null
  const center = pose ? xyPair(pose.center) : (summary?.sensorCenterXy ?? null)
  const rotation = pose ? asNumber(pose.rotation_deg) : (summary?.sensorRotationDeg ?? null)
  const plate = isRecord(raw.plate) ? raw.plate : summary?.plate
  if (plate || center || rotation !== null) {
    return {
      ...(plate ? { plate } : {}),
      sensorCenterXy: center,
      sensorRotationDeg: rotation,
    }
  }
  return summary
}

/** One side of a comparison; every field is that candidate's own fact. */
export interface CompareSide {
  candidateId: string
  stepSha256: string | null
  /** The candidate's own report (null when the response carried none). */
  report: ReportView | null
  /** Freshness of that report against the run's frozen revision + this candidate's STEP. */
  freshness: ReportFreshness
  /** The candidate's own measured pair evidence (from its own scene response). */
  pairs: PairClearance | null
  /** The candidate's own design document (raw; parsed here, never invented). */
  design: unknown
}

export interface CompareCheckRow {
  id: CheckId
  baseline: CheckStatus | 'MISSING'
  current: CheckStatus | 'MISSING'
  changed: boolean
}

export interface ComparePlateRow {
  axis: 'width' | 'height' | 'thickness'
  label: string
  baselineMm: number | null
  currentMm: number | null
}

export interface CompareView {
  /**
   * single   = no baseline chosen (or baseline === current);
   * ready    = both reports are current and bound to this run/revision;
   * unverified = at least one side has no report or a stale/unbound one —
   *              the numbers shown are still each side's own, but the pair is
   *              explicitly not a verified comparison.
   */
  status: 'single' | 'ready' | 'unverified'
  baseline: CompareSide | null
  current: CompareSide
  designLines: string[]
  plateRows: ComparePlateRow[]
  checkRows: CompareCheckRow[]
  failingGained: string[]
  failingResolved: string[]
  notes: string[]
}

const checkStatuses = (report: ReportView | null): Array<CheckStatus | 'MISSING'> =>
  CHECK_IDS.map((_, index) => {
    const check = orderedChecks(report)[index]
    return check ? check.status : 'MISSING'
  })

const g02Measured = (report: ReportView | null): Record<string, unknown> => {
  const check = orderedChecks(report)[CHECK_IDS.indexOf('G02')]
  return check ? check.measured : {}
}

/**
 * Build the comparison view for two candidates *of the same run*. Everything
 * here is read from each candidate's own facts: designs from its design
 * document, measurements from its own report, pairs from its own scene
 * response. Missing or stale reports (or an unparsable design) are surfaced as
 * unverified notes — the builder never fills a gap with the other side's
 * value, and it never turns a bare `overall` string into a verdict.
 */
export function buildCompareView(input: { baseline: CompareSide | null; current: CompareSide }): CompareView {
  const { baseline, current } = input
  const notes: string[] = []
  if (!baseline) {
    return {
      status: 'single',
      baseline: null,
      current,
      designLines: [],
      plateRows: [],
      checkRows: [],
      failingGained: [],
      failingResolved: [],
      notes: ['未选择对比基准：本次运行内的版本对比需要一个基准版本。'],
    }
  }
  if (baseline.candidateId === current.candidateId) {
    return {
      status: 'single',
      baseline,
      current,
      designLines: [],
      plateRows: [],
      checkRows: [],
      failingGained: [],
      failingResolved: [],
      notes: ['对比基准与当前版本相同；请选择另一个版本作为基准。'],
    }
  }

  const baselineSummary = designSummaryFromDocument(baseline.design)
  const currentSummary = designSummaryFromDocument(current.design)
  const designLines =
    baselineSummary && currentSummary ? describeDesignChange(baselineSummary, currentSummary) : []
  if (!baselineSummary || !currentSummary) {
    notes.push(
      `设计文档缺失或不可解析（${[!baselineSummary ? '基准' : null, !currentSummary ? '当前' : null].filter(Boolean).join('、')}），无法给出设计差异；以下仅展示各自报告的实测。`,
    )
  }

  const AXES: Array<{ axis: ComparePlateRow['axis']; label: string; key: string }> = [
    { axis: 'width', label: '板宽', key: 'width_mm' },
    { axis: 'height', label: '板高', key: 'height_mm' },
    { axis: 'thickness', label: '板厚', key: 'thickness_mm' },
  ]
  const baselineG02 = g02Measured(baseline.report)
  const currentG02 = g02Measured(current.report)
  const plateRows: ComparePlateRow[] = AXES.map(({ axis, label, key }) => ({
    axis,
    label,
    baselineMm: asNumber(baselineG02[key]),
    currentMm: asNumber(currentG02[key]),
  }))

  const baselineStatuses = checkStatuses(baseline.report)
  const currentStatuses = checkStatuses(current.report)
  const checkRows: CompareCheckRow[] = CHECK_IDS.map((id, index) => ({
    id,
    baseline: baselineStatuses[index] ?? 'MISSING',
    current: currentStatuses[index] ?? 'MISSING',
    changed: baselineStatuses[index] !== currentStatuses[index],
  }))

  let failingGained: string[] = []
  let failingResolved: string[] = []
  if (baseline.report && current.report) {
    const before = new Set(failingObjects(baseline.report))
    const after = new Set(failingObjects(current.report))
    failingGained = [...after].filter((object) => !before.has(object))
    failingResolved = [...before].filter((object) => !after.has(object))
  } else {
    notes.push('一侧缺少报告：无法给出失败对象的变化，只能展示已有的一侧。')
  }

  let status: CompareView['status'] = 'ready'
  const unverifiedSides: string[] = []
  if (!baseline.report) unverifiedSides.push(`基准 ${baseline.candidateId} 没有报告`)
  else if (baseline.freshness.state !== 'current') unverifiedSides.push(`基准 ${baseline.candidateId} 报告${baseline.freshness.label}`)
  if (!current.report) unverifiedSides.push(`当前 ${current.candidateId} 没有报告`)
  else if (current.freshness.state !== 'current') unverifiedSides.push(`当前 ${current.candidateId} 报告${current.freshness.label}`)
  if (unverifiedSides.length > 0) {
    status = 'unverified'
    notes.push(`未验证：${unverifiedSides.join('；')}——本对比不代表当前要求下的结果。`)
  }

  return { status, baseline, current, designLines, plateRows, checkRows, failingGained, failingResolved, notes }
}
