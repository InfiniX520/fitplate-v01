/**
 * P02-05 intake form model: pure, React-free logic shared by the panel form, the
 * intake controller and the Node tests. It owns
 *
 *  - the form state (every number is kept as the user typed it, strings only),
 *  - strict validation (finite numbers under the fixed unit table, required
 *    fields, range ordering, nominal-inside-editable, one screw-head envelope
 *    per base hole — the same rules the program compiler will check again),
 *  - the IntakeRequest document builder (schemas/request.schema.json shape),
 *  - the confirmation document builder (the closed field set of the 018
 *    attachment contract: kind / schema_version / request_id / request_revision
 *    / draft_hash / request_attachment_ref / request_attachment_sha256),
 *  - exact-byte serialization: the SHA-256 the UI reports and the base64 it
 *    ships in the file block are computed from the *same* bytes, never from a
 *    re-serialization,
 *  - the prompt texts the panel sends. The model is explicitly told to read the
 *    official attachment ref from the session listing and to use only the
 *    official hashes; `confirmed:true` is forbidden. The browser never builds a
 *    receipt and never writes to disk.
 *
 * This module never fabricates an identity: the confirmation document can only
 * be built from a *verified* service response whose fields all match their
 * patterns — anything else throws a typed IntakeUiError instead of producing a
 * plausible-looking payload.
 */

// ---------------------------------------------------------------------------
// units, sources, vocabulary
// ---------------------------------------------------------------------------

export type Unit = 'mm' | 'cm' | 'm' | 'um' | 'in'
export const UNITS: readonly Unit[] = ['mm', 'cm', 'm', 'um', 'in']

/** The fixed conversion table (Plan02 §4.1). No magnitude guessing, ever. */
export const UNIT_FACTOR_MM: Readonly<Record<Unit, number>> = Object.freeze({
  mm: 1,
  cm: 10,
  m: 1000,
  um: 0.001,
  in: 25.4,
})

export const toMillimeters = (value: number, unit: Unit): number => value * UNIT_FACTOR_MM[unit]

export type SourceKind =
  | 'user_supplied'
  | 'measured_device'
  | 'vendor_datasheet'
  | 'synthetic_teaching_fixture'
  | 'design_assumption'

export const SOURCE_KINDS: readonly SourceKind[] = [
  'user_supplied',
  'measured_device',
  'vendor_datasheet',
  'synthetic_teaching_fixture',
  'design_assumption',
]

export const SOURCE_LABELS: Readonly<Record<SourceKind, string>> = Object.freeze({
  user_supplied: '用户提供（自述事实）',
  measured_device: '实测设备尺寸',
  vendor_datasheet: '厂商资料（数据表）',
  synthetic_teaching_fixture: '教学示例数据',
  design_assumption: '设计假设（非实测）',
})

export type LicenseMode = 'fixed' | 'x_range' | 'y_range' | 'xy_range'
export const LICENSE_LABELS: Readonly<Record<LicenseMode, string>> = Object.freeze({
  fixed: '固定中心（不许平移）',
  x_range: '仅 X 方向范围',
  y_range: '仅 Y 方向范围',
  xy_range: 'X/Y 双向范围',
})

export const REQUEST_FILENAME = 'fitplate-request.json'
export const CONFIRMATION_FILENAME = 'fitplate-confirmation.json'
export const ATTACHMENT_MIME = 'application/json'
export const INTAKE_SERVICE = 'fitplate.intake'
export const REQUEST_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,40}$/
export const HEX64_PATTERN = /^[0-9a-f]{64}$/
export const REF_PATTERN = /^session-file:\/\/([1-9][0-9]*)\/([1-9][0-9]*)$/
const CYLINDER_ID_PATTERN = /^[a-z][a-z0-9_]{0,63}$/
/** The request/confirmation documents must fit the attachment contract's bound. */
export const MAX_DOCUMENT_BYTES = 65536
export const MAX_TEXT_LENGTH = 4000

export class IntakeUiError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'IntakeUiError'
    this.code = code
  }
}

// ---------------------------------------------------------------------------
// form state (strings, exactly what the controlled inputs hold)
// ---------------------------------------------------------------------------

export interface CenterRow {
  x: string
  y: string
}

export interface CylinderRow {
  id: string
  x: string
  y: string
  radius: string
  zMin: string
  zMax: string
}

export interface ScrewHeadRow {
  holeIndex: string
  radius: string
  zMin: string
  zMax: string
}

export interface ConnectorBoxFields {
  xMin: string
  xMax: string
  yMin: string
  yMax: string
  zMin: string
  zMax: string
}

export interface IntakeFormState {
  /** The one unit every numeric field below is expressed in (fixed table on send). */
  unit: Unit
  /** The user's short Chinese requirement, kept verbatim. */
  text: string
  deviceCardId: string
  plate: {
    width: string
    height: string
    thickness: string
    widthEditable: boolean
    widthMin: string
    widthMax: string
    heightEditable: boolean
    heightMin: string
    heightMax: string
  }
  baseHoles: {
    diameter: string
    centers: CenterRow[]
  }
  mounting: {
    holeDiameter: string
    licenseMode: LicenseMode | ''
    centerX: string
    centerY: string
    xMin: string
    xMax: string
    yMin: string
    yMax: string
  }
  environment: {
    source: SourceKind | ''
    note: string
    cylinders: CylinderRow[]
    screwHeads: ScrewHeadRow[]
    connectorMode: 'box' | 'not_covered' | ''
    connector: ConnectorBoxFields
    support: boolean
  }
  requirements: {
    source: SourceKind | ''
    clearance: string
    edge: string
    hole: string
    tolerance: string
  }
}

export function createEmptyForm(): IntakeFormState {
  return {
    unit: 'mm',
    text: '',
    deviceCardId: '',
    plate: {
      width: '',
      height: '',
      thickness: '',
      widthEditable: false,
      widthMin: '',
      widthMax: '',
      heightEditable: false,
      heightMin: '',
      heightMax: '',
    },
    baseHoles: { diameter: '', centers: [{ x: '', y: '' }] },
    mounting: {
      holeDiameter: '',
      licenseMode: '',
      centerX: '',
      centerY: '',
      xMin: '',
      xMax: '',
      yMin: '',
      yMax: '',
    },
    environment: {
      source: '',
      note: '',
      cylinders: [],
      screwHeads: [],
      connectorMode: '',
      connector: { xMin: '', xMax: '', yMin: '', yMax: '', zMin: '', zMax: '' },
      support: true,
    },
    requirements: { source: '', clearance: '', edge: '', hole: '', tolerance: '' },
  }
}

/** Deep-clone a form state (structural — every leaf is a string/boolean). */
export function cloneForm(form: IntakeFormState): IntakeFormState {
  return JSON.parse(JSON.stringify(form)) as IntakeFormState
}

// ---------------------------------------------------------------------------
// validation
// ---------------------------------------------------------------------------

export interface FieldIssue {
  path: string
  message: string
  kind?: 'missing-number'
}

export interface FormCheck {
  ok: boolean
  issues: FieldIssue[]
  canSubmitForClarification: boolean
}

const NUMBER_SYNTAX = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

/**
 * Strict numeric read: the text must be a plain decimal number and the parsed
 * value a finite number. Booleans, blanks, thread specs (M3) and magnitudes
 * like `1e999` are refused — never coerced.
 */
export function readFiniteNumber(text: string, path: string, issues: FieldIssue[]): number | null {
  const trimmed = text.trim()
  if (!trimmed) {
    issues.push({ path, message: '缺少数值', kind: 'missing-number' })
    return null
  }
  if (!NUMBER_SYNTAX.test(trimmed)) {
    issues.push({
      path,
      message: /^[mM]\d/.test(trimmed) ? '螺纹规格（如 M3）不是孔径或长度数值' : `不是有效数值：${trimmed}`,
    })
    return null
  }
  const value = Number(trimmed)
  if (!Number.isFinite(value)) {
    issues.push({ path, message: `数值超出可表示范围：${trimmed}` })
    return null
  }
  return value
}

const readPositive = (text: string, path: string, issues: FieldIssue[], what: string): number | null => {
  const value = readFiniteNumber(text, path, issues)
  if (value === null) return null
  if (value <= 0) {
    issues.push({ path, message: `${what}必须大于 0（当前 ${value}）` })
    return null
  }
  return value
}

const readNonNegative = (text: string, path: string, issues: FieldIssue[]): number | null => {
  const value = readFiniteNumber(text, path, issues)
  if (value === null) return null
  if (value < 0) {
    issues.push({ path, message: `要求值不能为负（当前 ${value}）` })
    return null
  }
  return value
}

function readOrderedRange(
  form: IntakeFormState,
  lowText: string,
  highText: string,
  path: string,
  issues: FieldIssue[],
  what: string,
): [number, number] | null {
  const low = readFiniteNumber(lowText, `${path}.min`, issues)
  const high = readFiniteNumber(highText, `${path}.max`, issues)
  if (low === null || high === null) return null
  const lowMm = toMillimeters(low, form.unit)
  const highMm = toMillimeters(high, form.unit)
  if (!(lowMm < highMm)) {
    issues.push({ path, message: `${what}下限（${low}）须小于上限（${high}）（按 mm 比较：${lowMm} ≥ ${highMm}）` })
    return null
  }
  return [lowMm, highMm]
}

function readZPair(
  form: IntakeFormState,
  lowText: string,
  highText: string,
  path: string,
  issues: FieldIssue[],
): [number, number] | null {
  const low = readFiniteNumber(lowText, `${path}[0]`, issues)
  const high = readFiniteNumber(highText, `${path}[1]`, issues)
  if (low === null || high === null) return null
  const lowMm = toMillimeters(low, form.unit)
  const highMm = toMillimeters(high, form.unit)
  if (!(lowMm < highMm)) {
    issues.push({ path, message: `Z 范围必须递增（当前 ${low} → ${high}，按 mm：${lowMm} → ${highMm}）` })
    return null
  }
  return [lowMm, highMm]
}

/** The full form check. Everything the program would refuse is refused here first. */
export function validateForm(form: IntakeFormState): FormCheck {
  const issues: FieldIssue[] = []
  if (!UNITS.includes(form.unit)) issues.push({ path: 'unit', message: '请选择受支持的长度单位' })
  const text = form.text.trim()
  if (!text) issues.push({ path: 'text', message: '请填写短中文要求' })
  else if (form.text.length > MAX_TEXT_LENGTH) issues.push({ path: 'text', message: `要求文本超过 ${MAX_TEXT_LENGTH} 字` })
  if (!form.deviceCardId) issues.push({ path: 'device_card_id', message: '请选择登记设备卡' })
  else if (!REGISTERED_DEVICE_CARDS.some((card) => card.id === form.deviceCardId)) {
    issues.push({ path: 'device_card_id', message: `未登记的设备卡：${form.deviceCardId}` })
  }

  // plate: nominal sizes + optional editable windows. The thickness is locked
  // by construction (the form has no thickness-editable fields).
  const width = readPositive(form.plate.width, 'form.plate.width', issues, '板宽')
  const height = readPositive(form.plate.height, 'form.plate.height', issues, '板高')
  const thickness = readPositive(form.plate.thickness, 'form.plate.thickness', issues, '板厚')
  if (form.plate.widthEditable) {
    const range = readOrderedRange(form, form.plate.widthMin, form.plate.widthMax, 'form.plate.editable.width', issues, '板宽许可区间')
    if (range && width !== null) {
      const nominal = toMillimeters(width, form.unit)
      if (nominal < range[0] || nominal > range[1]) {
        issues.push({ path: 'form.plate.editable.width', message: `板宽标称值须落在其许可区间内（${nominal} 不在 [${range[0]}, ${range[1]}] mm）` })
      }
    }
  }
  if (form.plate.heightEditable) {
    const range = readOrderedRange(form, form.plate.heightMin, form.plate.heightMax, 'form.plate.editable.height', issues, '板高许可区间')
    if (range && height !== null) {
      const nominal = toMillimeters(height, form.unit)
      if (nominal < range[0] || nominal > range[1]) {
        issues.push({ path: 'form.plate.editable.height', message: `板高标称值须落在其许可区间内（${nominal} 不在 [${range[0]}, ${range[1]}] mm）` })
      }
    }
  }

  // base holes: diameter + at least one center, every center complete.
  readPositive(form.baseHoles.diameter, 'form.base_holes.diameter', issues, '底座孔径')
  if (form.baseHoles.centers.length === 0) {
    issues.push({ path: 'form.base_holes.centers', message: '至少需要 1 个底座孔中心' })
  }
  form.baseHoles.centers.forEach((center, index) => {
    readFiniteNumber(center.x, `form.base_holes.centers[${index}].x`, issues)
    readFiniteNumber(center.y, `form.base_holes.centers[${index}].y`, issues)
  })

  // mounting: plate-side through-hole diameter (a number — M3 is refused above),
  // an explicit movement licence and rotation locked at 0.
  readPositive(form.mounting.holeDiameter, 'form.mounting.plate_hole_diameter', issues, '板侧安装孔径')
  if (!form.mounting.licenseMode) {
    issues.push({ path: 'form.mounting.movement_license', message: '请选择移动许可方式（固定或明确范围）' })
  } else {
    const mode = form.mounting.licenseMode
    if (mode === 'fixed' || mode === 'y_range') {
      readFiniteNumber(form.mounting.centerX, 'form.mounting.center_x', issues)
    }
    if (mode === 'fixed' || mode === 'x_range') {
      readFiniteNumber(form.mounting.centerY, 'form.mounting.center_y', issues)
    }
    if (mode === 'x_range' || mode === 'xy_range') {
      readOrderedRange(form, form.mounting.xMin, form.mounting.xMax, 'form.mounting.center_x_range', issues, 'X 许可范围')
    }
    if (mode === 'y_range' || mode === 'xy_range') {
      readOrderedRange(form, form.mounting.yMin, form.mounting.yMax, 'form.mounting.center_y_range', issues, 'Y 许可范围')
    }
  }

  // environment: source chosen; every list filled to the scene contract.
  if (!form.environment.source) issues.push({ path: 'form.environment.source', message: '请选择环境来源' })
  else if (!SOURCE_KINDS.includes(form.environment.source)) {
    issues.push({ path: 'form.environment.source', message: `未知来源：${form.environment.source}` })
  }
  if (form.environment.note.length > 300) issues.push({ path: 'form.environment.note', message: '环境备注超过 300 字' })
  if (form.environment.cylinders.length === 0) {
    issues.push({ path: 'form.environment.fixed_cylinders', message: '场景合同要求至少 1 个固定柱圆柱障碍' })
  }
  const ids = new Set<string>()
  form.environment.cylinders.forEach((cylinder, index) => {
    const path = `form.environment.fixed_cylinders[${index}]`
    if (!CYLINDER_ID_PATTERN.test(cylinder.id)) issues.push({ path: `${path}.id`, message: '固定柱 id 须为小写字母开头的安全标识（a-z0-9_）' })
    else if (ids.has(cylinder.id)) issues.push({ path: `${path}.id`, message: `固定柱 id 重复：${cylinder.id}` })
    else ids.add(cylinder.id)
    readFiniteNumber(cylinder.x, `${path}.axis_xy[0]`, issues)
    readFiniteNumber(cylinder.y, `${path}.axis_xy[1]`, issues)
    readPositive(cylinder.radius, `${path}.radius`, issues, '固定柱半径')
    readZPair(form, cylinder.zMin, cylinder.zMax, `${path}.z_range`, issues)
  })
  const holeCount = form.baseHoles.centers.length
  const headCounts = new Map<number, number>()
  form.environment.screwHeads.forEach((head, index) => {
    const path = `form.environment.screw_heads[${index}]`
    const holeIndex = readFiniteNumber(head.holeIndex, `${path}.base_hole_index`, issues)
    if (holeIndex !== null) {
      if (!Number.isInteger(holeIndex) || holeIndex < 0 || holeIndex >= Math.max(1, holeCount)) {
        issues.push({ path: `${path}.base_hole_index`, message: `底座孔索引 ${holeIndex} 不存在（共 ${holeCount} 个孔）` })
      } else {
        headCounts.set(holeIndex, (headCounts.get(holeIndex) ?? 0) + 1)
      }
    }
    readPositive(head.radius, `${path}.radius`, issues, '螺钉头半径')
    readZPair(form, head.zMin, head.zMax, `${path}.z_range`, issues)
  })
  for (let hole = 0; hole < holeCount; hole += 1) {
    const count = headCounts.get(hole) ?? 0
    if (count !== 1) {
      issues.push({
        path: 'form.environment.screw_heads',
        message: `底座孔 #${hole} 需要恰好 1 个螺钉头包络（当前 ${count}）`,
      })
    }
  }
  if (!form.environment.connectorMode) {
    issues.push({ path: 'form.environment.connector_access', message: '请声明连接器空间盒，或明确选择“未覆盖”' })
  } else if (form.environment.connectorMode === 'box') {
    const box = form.environment.connector
    readOrderedRange(form, box.xMin, box.xMax, 'form.environment.connector_access.local_x', issues, '连接器局部 X 范围')
    readOrderedRange(form, box.yMin, box.yMax, 'form.environment.connector_access.local_y', issues, '连接器局部 Y 范围')
    readZPair(form, box.zMin, box.zMax, 'form.environment.connector_access.absolute_z', issues)
  }

  // requirements: four values + source.
  if (!form.requirements.source) issues.push({ path: 'form.requirements.source', message: '请选择验收要求来源' })
  else if (!SOURCE_KINDS.includes(form.requirements.source)) {
    issues.push({ path: 'form.requirements.source', message: `未知来源：${form.requirements.source}` })
  }
  readNonNegative(form.requirements.clearance, 'form.requirements.minimum_free_clearance', issues)
  readNonNegative(form.requirements.edge, 'form.requirements.minimum_edge_ligament', issues)
  readNonNegative(form.requirements.hole, 'form.requirements.minimum_hole_ligament', issues)
  const tolerance = readNonNegative(form.requirements.tolerance, 'form.requirements.dimensional_tolerance', issues)
  if (tolerance !== null && tolerance === 0) {
    issues.push({ path: 'form.requirements.dimensional_tolerance', message: '尺寸公差必须大于 0' })
  }

  return {
    ok: issues.length === 0,
    issues,
    canSubmitForClarification: issues.length > 0 && issues.every((issue) =>
      issue.kind === 'missing-number' && !issue.path.endsWith('.base_hole_index')),
  }
}

// ---------------------------------------------------------------------------
// request document (schemas/request.schema.json)
// ---------------------------------------------------------------------------

export interface LengthDoc {
  value: number | null
  unit: Unit
}
export type RangeDoc = { min: LengthDoc; max: LengthDoc }

/** Parsed form facts (post-validation), used to build the request document. */
function buildFormDocument(form: IntakeFormState): Record<string, unknown> {
  const unit = form.unit
  const L = (text: string): LengthDoc => ({ value: text.trim() === '' ? null : Number(text.trim()), unit })
  const R = (low: string, high: string): RangeDoc => ({ min: L(low), max: L(high) })

  const plate: Record<string, unknown> = {
    width: L(form.plate.width),
    height: L(form.plate.height),
    thickness: L(form.plate.thickness),
    editable: {},
  }
  const editable: Record<string, unknown> = {}
  if (form.plate.widthEditable) editable.width = R(form.plate.widthMin, form.plate.widthMax)
  if (form.plate.heightEditable) editable.height = R(form.plate.heightMin, form.plate.heightMax)
  plate.editable = editable

  // rotation is locked to 0 by the P0 program (p0_round_hole_rotation_zero); the
  // reproduction request carries no rotation_deg key and the demo doc must stay
  // value-identical to the supervised artifact, so the document omits it too.
  const mounting: Record<string, unknown> = {
    plate_hole_diameter: L(form.mounting.holeDiameter),
  }
  const mode = form.mounting.licenseMode
  // The licence fact lives only in this field; `form:movement-license` is the
  // registered alias pointing at it (intake.md §2). Never text[...] unless the
  // user actually quotes the text — this form never invents a quote.
  if (mode === 'fixed') {
    mounting.movement_license = { mode: 'fixed', center: [L(form.mounting.centerX), L(form.mounting.centerY)], source_ref: 'form:movement-license' }
  } else if (mode === 'x_range') {
    mounting.movement_license = {
      mode: 'x_range',
      center_x: R(form.mounting.xMin, form.mounting.xMax),
      center_y: L(form.mounting.centerY),
      source_ref: 'form:movement-license',
    }
  } else if (mode === 'y_range') {
    mounting.movement_license = {
      mode: 'y_range',
      center_x: L(form.mounting.centerX),
      center_y: R(form.mounting.yMin, form.mounting.yMax),
      source_ref: 'form:movement-license',
    }
  } else if (mode === 'xy_range') {
    mounting.movement_license = {
      mode: 'xy_range',
      center_x: R(form.mounting.xMin, form.mounting.xMax),
      center_y: R(form.mounting.yMin, form.mounting.yMax),
      source_ref: 'form:movement-license',
    }
  }

  const environment: Record<string, unknown> = {
    source: form.environment.source,
    fixed_cylinders: form.environment.cylinders.map((cylinder) => ({
      id: cylinder.id,
      axis_xy: [L(cylinder.x), L(cylinder.y)],
      radius: L(cylinder.radius),
      z_range: [L(cylinder.zMin), L(cylinder.zMax)],
    })),
    screw_heads: form.environment.screwHeads.map((head) => ({
      base_hole_index: Number(head.holeIndex.trim()),
      radius: L(head.radius),
      z_range: [L(head.zMin), L(head.zMax)],
    })),
  }
  if (form.environment.note.trim()) environment.note = form.environment.note.trim()
  environment.connector_access =
    form.environment.connectorMode === 'not_covered'
      ? 'not_covered'
      : {
          local_xy_range: [
            R(form.environment.connector.xMin, form.environment.connector.xMax),
            R(form.environment.connector.yMin, form.environment.connector.yMax),
          ],
          absolute_z_range: [L(form.environment.connector.zMin), L(form.environment.connector.zMax)],
        }
  if (form.environment.support) environment.support_contacts = [{ a: 'sensor_body', b: 'plate_top' }]

  return {
    plate,
    base_holes: {
      diameter: L(form.baseHoles.diameter),
      centers: form.baseHoles.centers.map((center) => [L(center.x), L(center.y)]),
    },
    mounting,
    environment,
    requirements: {
      source: form.requirements.source,
      minimum_free_clearance: L(form.requirements.clearance),
      minimum_edge_ligament: L(form.requirements.edge),
      minimum_hole_ligament: L(form.requirements.hole),
      dimensional_tolerance: L(form.requirements.tolerance),
    },
  }
}

export interface RequestIdentity {
  requestId: string
  revision: number
}

/** Build the IntakeRequest document; refuses (typed) if the form is not valid. */
export function buildRequestDocument(form: IntakeFormState, identity: RequestIdentity): Record<string, unknown> {
  const check = validateForm(form)
  if (!check.ok && !check.canSubmitForClarification) {
    throw new IntakeUiError('FORM_INVALID', `表单未通过校验（${check.issues.length} 项）：${check.issues[0]?.message ?? ''}`)
  }
  if (!REQUEST_ID_PATTERN.test(identity.requestId)) {
    throw new IntakeUiError('FORM_INVALID', `request_id 不符合约定：${identity.requestId}`)
  }
  if (!Number.isSafeInteger(identity.revision) || identity.revision < 1) {
    throw new IntakeUiError('FORM_INVALID', `request_revision 必须是正整数：${identity.revision}`)
  }
  return {
    schema_version: '1.0',
    request_id: identity.requestId,
    request_revision: identity.revision,
    device_card_id: form.deviceCardId,
    language: 'zh-CN',
    text: form.text.trim(),
    form: buildFormDocument(form),
  }
}

// ---------------------------------------------------------------------------
// exact-byte serialization + SHA-256 (computed here, never taken from a model)
// ---------------------------------------------------------------------------

export interface EncodedDocument {
  bytes: Uint8Array
  base64: string
  sha256: string
  byteLength: number
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let at = 0; at < bytes.length; at += chunk) {
    binary += String.fromCharCode(...bytes.subarray(at, at + chunk))
  }
  return btoa(binary)
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Serialize one document to its exact bytes: compact JSON plus a trailing
 * newline. The SHA the UI reports and the base64 it ships are derived from
 * these bytes and nothing else.
 */
export async function encodeDocument(doc: Record<string, unknown>): Promise<EncodedDocument> {
  const bytes = new TextEncoder().encode(`${JSON.stringify(doc)}\n`)
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new IntakeUiError('DOCUMENT_TOO_LARGE', `请求/确认文件 ${bytes.byteLength} 字节，超过 ${MAX_DOCUMENT_BYTES} 字节上限`)
  }
  return { bytes, base64: bytesToBase64(bytes), sha256: await sha256Hex(bytes), byteLength: bytes.byteLength }
}

// ---------------------------------------------------------------------------
// file blocks (the official ContentBlock file shape) + prompt texts
// ---------------------------------------------------------------------------

export interface FileBlock {
  type: 'file'
  name: string
  mimeType: string
  data: string
}
export interface TextBlock {
  type: 'text'
  text: string
}
export type IntakeBlock = FileBlock | TextBlock

export function buildFileBlock(name: string, mimeType: string, base64: string): FileBlock {
  return { type: 'file', name, mimeType, data: base64 }
}

/**
 * The request prompt. It names the attachment and the request identity, tells
 * the model to read the attachment through the program tools, and forbids
 * guessing dimensions from the prose. It never carries dimensions itself.
 *
 * The one thing the model *may* contribute is a bounded text proposal for the
 * single supported case (a plate-width upper bound): it quotes the real
 * attachment text, and the program re-derives the number, the unit and the
 * source. The prompt never hard-codes this case's answer and never lets the
 * user write a quote offset — the model must read the attachment itself.
 */
export function buildRequestPromptText(identity: RequestIdentity): string {
  return [
    '请使用 $fitplate-design 技能处理本次需求。',
    '本次请求使用中文。请从第一条公开回复起全程使用中文；读取附件前已有或必要的说明也须中文，技术 ID、路径、单位可保留原文，无需增加工具旁白。',
    `FitPlate 面板提交了一份新的安装需求：附件 ${REQUEST_FILENAME}（已作为真实用户消息发出，request_id=${identity.requestId}，revision=${identity.revision}）。`,
    '请先调用 fitplate_get_request 读取当前会话附件的真实字节，再调用 fitplate_propose_constraints 登记程序编译出的草稿；一切数值与单位以附件字节和程序复算为准，不要根据本段文字推断任何尺寸。',
    '若附件文本里含有对板宽的明确上限（例如“最多 N”这类），你可以把该处原文作为文本提议交给程序复核：调用 fitplate_propose_constraints 时附带 text_proposals，每项严格为 {field_path:"plate.width", kind:"upper_bound", quote:{start,end,literal}, value, unit}——quote 必须是你从真实附件文本中取出的连续原文（literal 为原文子串，start/end 为其在文本中的字符偏移），value/unit 为该原文里的数值与单位。当前仅支持板宽上限这一种文本提议；程序会重新核对原文、复算毫米值，并把它作为约束（不是新的名义宽度），最终仍由用户核对确认。',
    '不要编造偏移或数值；无法从原文确定的部分不要猜——若草稿是 NEEDS_INPUT/CONFLICTING_INPUT，请把程序给出的具体问题转达给用户。',
    '请用中文简短说明，仅追问真正缺失或冲突的事实；完整许可区间里的 value_mm=null 是待选候选值，由你在范围内选择，不要求用户另给 Y 坐标。用户在面板修改后点击“让 AI 检查这些要求”产生新版本；READY_TO_CONFIRM 时点击“确认条件，开始设计”，页面会生成确认附件，不让用户手写 JSON、hash 或引用偏移。',
  ].join('\n\n')
}

/**
 * The confirmation prompt. `confirmationSha256` is the SHA-256 the panel
 * computed over the confirmation attachment bytes it just sent; the ref must
 * be taken by the model from the session listing (`read session-file://list`),
 * so the model only ever echoes official references — and never `confirmed:true`.
 */
export function buildConfirmationPromptText(input: {
  requestId: string
  requestRevision: number
  draftHash: string
  requestAttachmentRef: string
  requestAttachmentSha256: string
  confirmationSha256: string
}): string {
  return [
    '请使用 $fitplate-design 技能继续处理已确认的需求。',
    '请继续全程用中文完成本阶段，包括已有或必要的工具前说明与最终交付；技术 ID、路径、单位可保留原文，无需增加工具旁白。',
    `用户在 FitPlate 面板核对了草稿并提交了确认附件 ${CONFIRMATION_FILENAME}（request_id=${input.requestId}，revision=${input.requestRevision}）。`,
    `请先用 read 工具列出会话附件（session-file://list），找到其中最新的 ${CONFIRMATION_FILENAME} 的官方引用 ref（形如 session-file://<seq>/<index>），`,
    `然后调用 fitplate_commit_task，参数必须且只能取官方值：request_ref=${input.requestAttachmentRef}，`,
    `request_sha256=${input.requestAttachmentSha256}，draft_hash=${input.draftHash}，`,
    `confirmation_ref=上面列表里找到的那个 ref，confirmation_sha256=${input.confirmationSha256}（面板对确认附件字节计算的 SHA-256）。`,
    '不要使用 confirmed:true 或任何自报字段；不要自己改参数；冻结成功后继续 fitplate_load_task，再按流程 build/validate/export。',
    '在许可区间内自行选择明确候选坐标，保持锁定值。最终用完整中文短句说明状态、主要改动、实测最紧对象对/数值/要求、当前版本下载和软件几何验证范围；详细哈希、预算、来源与逐项检查留在工作台/报告，不重复内部提议字段。',
  ].join('\n\n')
}

// ---------------------------------------------------------------------------
// intake service payload (tolerant of decoration, strict on identity)
// ---------------------------------------------------------------------------

export interface IntakeDeviceCard {
  id: string
  sha256: string | null
}

export interface IntakeTaskView {
  taskId: string | null
  latestRevision: number | null
  revisions: Array<{ revision: number | null; requestRevision: number | null; draftHash: string | null }>
}

export interface IntakeStagedPayload {
  found: true
  requestId: string
  requestRevision: number
  outcome: string
  stagedAt: string | null
  attachmentRef: string
  attachmentSha256: string
  draftHash: string
  draft: Record<string, unknown> | null
  deviceCard: IntakeDeviceCard | null
  task: IntakeTaskView
  notes: string | null
}

export interface IntakeMissingPayload {
  found: false
  reason: string
  message: string
}

export type IntakeServicePayload = IntakeStagedPayload | IntakeMissingPayload

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null)

/**
 * Parse one fitplate.intake response. A `found:true` response without a
 * complete, well-formed identity is a typed failure — the UI must never show a
 * confirmable card from a decoration-only payload.
 */
export function parseIntakeServicePayload(raw: unknown): IntakeServicePayload {
  const record = asRecord(raw)
  if (!record) throw new IntakeUiError('PAYLOAD_INVALID', 'intake 服务返回的不是对象')
  if (record.found !== true) {
    return {
      found: false,
      reason: asString(record.reason) ?? 'UNKNOWN',
      message: asString(record.message) ?? 'intake 服务未给出原因',
    }
  }
  const requestId = asString(record.request_id)
  const requestRevision = record.request_revision
  const outcome = asString(record.outcome)
  const attachmentRef = asString(record.attachment_ref)
  const attachmentSha256 = asString(record.attachment_sha256)
  const draftRecord = asRecord(record.draft)
  const draftHash = draftRecord ? asString(draftRecord.draft_hash) : null
  const problems: string[] = []
  if (requestId === null || !REQUEST_ID_PATTERN.test(requestId)) problems.push('request_id')
  if (!Number.isSafeInteger(requestRevision) || (requestRevision as number) < 1) problems.push('request_revision')
  if (outcome === null || !['READY_TO_CONFIRM', 'NEEDS_INPUT', 'CONFLICTING_INPUT', 'UNSUPPORTED_REQUEST'].includes(outcome)) {
    problems.push('outcome')
  }
  if (attachmentRef === null || !REF_PATTERN.test(attachmentRef)) problems.push('attachment_ref')
  if (attachmentSha256 === null || !HEX64_PATTERN.test(attachmentSha256)) problems.push('attachment_sha256')
  if (draftHash === null || !HEX64_PATTERN.test(draftHash)) problems.push('draft_hash')
  if (problems.length > 0) {
    throw new IntakeUiError('PAYLOAD_INVALID', `intake 服务响应缺少关键身份字段：${problems.join(', ')}`)
  }
  const cardRecord = asRecord(record.device_card)
  const cardId = cardRecord ? asString(cardRecord.id) : null
  const cardSha = cardRecord ? asString(cardRecord.sha256) : null
  const taskRecord = asRecord(record.task)
  const revisions: IntakeTaskView['revisions'] = []
  if (taskRecord && Array.isArray(taskRecord.revisions)) {
    for (const row of taskRecord.revisions.slice(0, 64)) {
      const revisionRecord = asRecord(row)
      if (!revisionRecord) continue
      revisions.push({
        revision: Number.isSafeInteger(revisionRecord.revision) ? (revisionRecord.revision as number) : null,
        requestRevision: Number.isSafeInteger(revisionRecord.request_revision) ? (revisionRecord.request_revision as number) : null,
        draftHash: asString(revisionRecord.draft_hash),
      })
    }
  }
  return {
    found: true,
    requestId: requestId as string,
    requestRevision: requestRevision as number,
    outcome: outcome as string,
    stagedAt: asString(record.staged_at),
    attachmentRef: attachmentRef as string,
    attachmentSha256: attachmentSha256 as string,
    draftHash: draftHash as string,
    draft: draftRecord,
    deviceCard: cardId !== null ? { id: cardId, sha256: cardSha } : null,
    task: {
      taskId: taskRecord ? asString(taskRecord.task_id) : null,
      latestRevision: taskRecord && Number.isSafeInteger(taskRecord.latest_revision) ? (taskRecord.latest_revision as number) : null,
      revisions,
    },
    notes: asString(record.notes),
  }
}

// ---------------------------------------------------------------------------
// confirmation document (the 018 module's closed field set)
// ---------------------------------------------------------------------------

export const CONFIRMATION_FIELDS = Object.freeze([
  'kind',
  'schema_version',
  'request_id',
  'request_revision',
  'draft_hash',
  'request_attachment_ref',
  'request_attachment_sha256',
])

export interface ConfirmationIdentity {
  requestId: string
  requestRevision: number
  draftHash: string
  requestAttachmentRef: string
  requestAttachmentSha256: string
}

/** Validate one identity; every field must match the exact patterns. */
export function checkConfirmationIdentity(identity: ConfirmationIdentity): ConfirmationIdentity {
  const problems: string[] = []
  if (!REQUEST_ID_PATTERN.test(identity.requestId)) problems.push('request_id')
  if (!Number.isSafeInteger(identity.requestRevision) || identity.requestRevision < 1) problems.push('request_revision')
  if (!HEX64_PATTERN.test(identity.draftHash)) problems.push('draft_hash')
  if (!REF_PATTERN.test(identity.requestAttachmentRef)) problems.push('request_attachment_ref')
  if (!HEX64_PATTERN.test(identity.requestAttachmentSha256)) problems.push('request_attachment_sha256')
  if (problems.length > 0) {
    throw new IntakeUiError('IDENTITY_INVALID', `当前草稿身份不完整或形状非法：${problems.join(', ')}（拒绝生成确认文件）`)
  }
  return identity
}

/**
 * Build the confirmation document. The values must come from the verified
 * intake service response; there is no other constructor and no free-form
 * field. `request_attachment_sha256` is the bytes hash of the request
 * attachment, recomputed by the commit tool — never the model's arithmetic.
 */
export function buildConfirmationDocument(identity: ConfirmationIdentity): Record<string, unknown> {
  const checked = checkConfirmationIdentity(identity)
  return {
    kind: 'fitplate-confirmation',
    schema_version: '1.0',
    request_id: checked.requestId,
    request_revision: checked.requestRevision,
    draft_hash: checked.draftHash,
    request_attachment_ref: checked.requestAttachmentRef,
    request_attachment_sha256: checked.requestAttachmentSha256,
  }
}

// ---------------------------------------------------------------------------
// registered device cards (display summary only; the program reads the real card)
// ---------------------------------------------------------------------------

export interface RegisteredDeviceCard {
  id: string
  name: string
  bodySizeMm: readonly [number, number, number]
  holeOffsetsMm: ReadonlyArray<readonly [number, number]>
  holePitchMm: number
  threadInterface: string
  /** The project's design choice for the plate through-hole (never vendor data). */
  designHoleDiameterMm: number
  sourceLevel: string
  note: string
}

/**
 * The registered cards this build knows. Device dimensions come only from the
 * program's registered card; this summary is display-only and keeps the card's
 * own source labels. One card exists — the panel says so and does not invent more.
 */
export const REGISTERED_DEVICE_CARDS: readonly RegisteredDeviceCard[] = Object.freeze([
  Object.freeze({
    id: 'banner-q20pd',
    name: 'Banner Q20PD（Q20 系列，2 m 出线版本）',
    bodySizeMm: [20, 32, 12] as const,
    holeOffsetsMm: [
      [6.7, -12.7],
      [6.7, 12.7],
    ] as ReadonlyArray<readonly [number, number]>,
    holePitchMm: 25.4,
    threadInterface: '2 × M3×0.5（设备内螺纹）',
    designHoleDiameterMm: 3.4,
    sourceLevel: 'datasheet_derived（资料推导，几何/实物未验证）',
    note: '设备尺寸只来自登记卡；板侧通孔 ⌀3.4 是本项目的设计选择（M3 螺钉间隙孔），不是原厂尺寸。',
  }),
])

// ---------------------------------------------------------------------------
// demo prefill (the supervised public case — real form values, honest sources)
// ---------------------------------------------------------------------------

export const DEMO_BANNER_TEXT = '厂商设备规格＋自设底座/环境，无实物验证'

/**
 * The public Banner example exactly as the supervisor compiled it
 * (ANG/logs/plan02/reproduction/compiled-public-intake/request.json). Loading
 * it fills *visible* form fields with the same values and design_assumption
 * sources — it never claims measured data and never upgrades a source.
 */
export const DEMO_TEXT = '在允许范围内选择合适的安装位置，满足间隙与孔边材料要求。'

export function applyDemoPrefill(form: IntakeFormState): IntakeFormState {
  const next = cloneForm(form)
  next.unit = 'mm'
  next.text = DEMO_TEXT
  next.deviceCardId = 'banner-q20pd'
  next.plate = {
    width: '80',
    height: '80',
    thickness: '4',
    widthEditable: false,
    widthMin: '',
    widthMax: '',
    heightEditable: false,
    heightMin: '',
    heightMax: '',
  }
  next.baseHoles = {
    diameter: '4.4',
    centers: [
      { x: '8', y: '8' },
      { x: '72', y: '8' },
      { x: '8', y: '72' },
      { x: '72', y: '72' },
    ],
  }
  next.mounting = {
    holeDiameter: '3.4',
    licenseMode: 'y_range',
    centerX: '40',
    centerY: '',
    xMin: '',
    xMax: '',
    yMin: '28',
    yMax: '45',
  }
  next.environment = {
    source: 'design_assumption',
    note: '自设演示环境，作为表单事实输入',
    cylinders: [{ id: 'post_a', x: '28', y: '50', radius: '3', zMin: '4', zMax: '20' }],
    screwHeads: [0, 1, 2, 3].map((holeIndex) => ({ holeIndex: String(holeIndex), radius: '4', zMin: '4', zMax: '8' })),
    connectorMode: 'box',
    connector: { xMin: '-20', xMax: '-6', yMin: '-28', yMax: '-12', zMin: '8', zMax: '12' },
    support: true,
  }
  next.requirements = {
    source: 'design_assumption',
    clearance: '1.0',
    edge: '3.0',
    hole: '3.0',
    tolerance: '0.05',
  }
  return next
}

// ---------------------------------------------------------------------------
// misc helpers
// ---------------------------------------------------------------------------

const RANDOM_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** A schema-conformant request id; injectable clock/rng keep tests deterministic. */
export function createRequestId(options: { now?: () => number; random?: () => number } = {}): string {
  const now = options.now ?? (() => Date.now())
  const random = options.random ?? (() => Math.random())
  const stamp = Math.floor(now()).toString(36)
  let suffix = ''
  for (let index = 0; index < 4; index += 1) {
    suffix += RANDOM_ALPHABET[Math.floor(random() * RANDOM_ALPHABET.length) % RANDOM_ALPHABET.length]
  }
  const id = `ui-${stamp}-${suffix}`
  if (!REQUEST_ID_PATTERN.test(id)) throw new IntakeUiError('FORM_INVALID', `生成的 request_id 非法：${id}`)
  return id
}

/** Human summary of the licence for the confirmation card. */
export function describeLicense(form: IntakeFormState): string {
  const u = form.unit
  const mode = form.mounting.licenseMode
  if (!mode) return '未填写'
  if (mode === 'fixed') return `固定中心 (${form.mounting.centerX}, ${form.mounting.centerY}) ${u}`
  if (mode === 'x_range') return `中心 X ∈ [${form.mounting.xMin}, ${form.mounting.xMax}] ${u} · Y=${form.mounting.centerY} ${u}`
  if (mode === 'y_range') return `中心 X=${form.mounting.centerX} ${u} · Y ∈ [${form.mounting.yMin}, ${form.mounting.yMax}] ${u}`
  return `中心 X ∈ [${form.mounting.xMin}, ${form.mounting.xMax}] ${u} · Y ∈ [${form.mounting.yMin}, ${form.mounting.yMax}] ${u}`
}

export const OUTCOME_LABELS: Readonly<Record<string, string>> = Object.freeze({
  READY_TO_CONFIRM: '输入完整一致（可确认）',
  NEEDS_INPUT: '待补充信息',
  CONFLICTING_INPUT: '输入冲突',
  UNSUPPORTED_REQUEST: '超出现有支持范围',
})
