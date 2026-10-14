// Pure report facts shared by native tool text and the browser result card.
// No filesystem, CAD, model output or geometric inference is used here.
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const finite = (value) => typeof value === 'number' && Number.isFinite(value) ? value : null
const id = (value) => typeof value === 'string' && value.length > 0 && value.length <= 128 ? value : null
const sha = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value) ? value.toLowerCase() : null
const numberText = (value) => value === null ? '未提供' : String(Math.round(value * 1e6) / 1e6)

export function clearanceFacts(check) {
  const measured = record(check?.measured) ? check.measured : {}
  const required = record(check?.required) ? check.required : {}
  const rawPair = record(measured.minimum_free_clearance_pair) ? measured.minimum_free_clearance_pair : {}
  const moving = id(rawPair.moving)
  const fixed = id(rawPair.fixed)
  return {
    measuredMm: finite(measured.minimum_free_clearance_mm),
    measurementState: finite(measured.minimum_free_clearance_mm) !== null ? 'measured'
      : measured.minimum_free_clearance_mm === null && measured.minimum_free_clearance_pair === null
        ? 'none-reported' : 'unavailable',
    requiredMm: finite(required.minimum_free_clearance_mm),
    pair: moving && fixed ? { moving, fixed } : null,
    supportContactStatus: id(measured.support_contact_status),
    // This is the check's scope, never the pair attaining the minimum.
    checkScope: Array.isArray(check?.objects) ? check.objects.filter((value) => id(value) !== null) : [],
    failurePair: id(measured.worst_pair),
  }
}

export function clearanceFactLines(facts) {
  const pair = facts.pair ? `${facts.pair.moving} ↔ ${facts.pair.fixed}` : '对象对未提供'
  const measured = facts.measuredMm !== null
    ? `实测最小自由间隙 ${numberText(facts.measuredMm)} mm，实测最小自由间隙对象对 ${pair}`
    : facts.measurementState === 'none-reported'
      ? '报告未测得自由对象对（最小自由间隙为 null）；不以允许支撑接触的 0 mm 代替'
      : '实测最小自由间隙未提供（不以允许支撑接触的 0 mm 代替）'
  const lines = [`${measured}；要求 ${facts.requiredMm === null ? '未提供' : `≥ ${numberText(facts.requiredMm)} mm`}`]
  if (facts.supportContactStatus) lines.push(`支撑接触：${facts.supportContactStatus}（与自由间隙分开判断）`)
  if (facts.failurePair) lines.push(`失败/最差对象对：${facts.failurePair}（不代替实测最小自由间隙对象对）`)
  return lines
}

/** Verify every available report identity against the caller's current artefact. */
export function deliveryFacts(report, binding) {
  const raw = record(report) ? report : {}
  const expected = record(binding) ? binding : {}
  const identity = {
    candidateId: id(raw.candidate_id),
    taskRevision: Number.isInteger(raw.task_revision) && raw.task_revision > 0 ? raw.task_revision : null,
    stepSha256: sha(raw.hashes?.step_sha256),
    reportId: id(raw.report_id),
  }
  const fields = ['candidateId', 'taskRevision', 'stepSha256', 'reportId']
  const missing = fields.filter((key) => identity[key] === null || expected[key] === null || expected[key] === undefined)
  const mismatched = fields.filter((key) => identity[key] !== null && expected[key] != null && identity[key] !== expected[key])
  const bindingState = mismatched.length ? 'stale' : missing.length ? 'unverified' : 'current'
  const checks = Array.isArray(raw.checks) ? raw.checks : []
  const complete = checks.length === 8 && ['G01','G02','G03','G04','G05','G06','G07','G08']
    .every((key) => checks.filter((check) => check?.id === key).length === 1)
  const g06 = checks.find((check) => check?.id === 'G06')
  return {
    identity, bindingState, missing, mismatched,
    overall: id(raw.overall) ?? 'UNKNOWN',
    checksComplete: complete,
    accepted: bindingState === 'current' && complete && raw.overall === 'PASS'
      && checks.every((check) => check.status === 'PASS') && (!Array.isArray(raw.errors) || raw.errors.length === 0),
    clearance: clearanceFacts(g06),
    scope: 'software_geometry_only',
  }
}
