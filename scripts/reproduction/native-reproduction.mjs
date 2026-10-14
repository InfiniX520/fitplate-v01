// Public native reproduction driver, adapted from the frozen generic evaluation driver. One invocation drives ONE case from an
// input file the supervisor supplies; nothing here branches on a case id, centre, dimension or
// expected verdict. The driver loads the public demo spec through the REAL product UI, then fills
// the visible form fields named by the input, submits, and - when the model's own turn finishes and
// the latest program draft is *confirmable* - clicks the product confirmation as a pre-agreed
// synthetic user. A non-confirmable final draft (NEEDS_INPUT / CONFLICTING_INPUT / UNSUPPORTED) is
// recorded as-is: the driver never forces confirmability, never invents dimensions, and never reads
// a gold/expected answer. Scoring is the supervisor's job, from the real artefacts.
//
// The observation/judgement helpers are exported and pure so they can be tested offline without a
// model. `main()` is the only part that touches AGH/Playwright and is guarded by the module entry.
//
// Evidence output is an explicitly derived public-event trace, not an official diagnostic ZIP.
// Private thinking blocks are dropped before retention; official ZIP export remains a separate UI action.
// This driver observes completion. It does not grade the result or claim full isolation.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { decidePilotPermission } from './native-intake-approval.mjs'
import { observeNativeDelivery } from './native-delivery-observation.mjs'

import { publicEvent, writePublicTrace } from './public-native-trace.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const MAX_CANDIDATES_PER_REVISION = 4
const CASE_BUDGET_MS = 300_000
const WIDGET_TIMEOUT_MS = 20_000

// ---------------------------------------------------------------------------
// input validation (pure) - no gold, no unknown keys, no JS/path injection
// ---------------------------------------------------------------------------

/** Keys that would leak an answer/verdict into the driver; their presence anywhere is a hard error. */
export const FORBIDDEN_INPUT_KEYS = Object.freeze([
  'expected', 'expect', 'outcome', 'gold', 'reference', 'reference_answer', 'solution', 'answer',
  'verdict', 'pass', 'fail', 'score', 'reward', 'label_expected', 'should', 'ground_truth',
])

/** The only top-level keys an input file may carry (a data-only request envelope). */
const INPUT_TOP_KEYS = Object.freeze(['id', 'text', 'form_fields', 'steps'])
const STEP_KEYS = Object.freeze(['text', 'form_fields'])

function collectKeys(value, into, depth = 0) {
  if (depth > 12 || value === null || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, into, depth + 1)
    return
  }
  for (const [key, item] of Object.entries(value)) {
    into.add(String(key).toLowerCase())
    collectKeys(item, into, depth + 1)
  }
}

/** Reject any input whose keys anywhere mention an answer/verdict term (a gold leak). */
export function assertNoGoldLeak(raw) {
  const keys = new Set()
  collectKeys(raw, keys)
  const hit = FORBIDDEN_INPUT_KEYS.filter((forbidden) => keys.has(forbidden))
  if (hit.length) throw new Error(`input carries answer/verdict keys (${hit.join(', ')}); the driver accepts user requests only`)
  return true
}

const SAFE_VALUE_RE = /^[^<>{}]*$/ // no markup/JSON-shaped values; values are plain UI strings
const SAFE_SELECT_RE = /^[a-z0-9_]+$/i

function assertScalarString(value, where) {
  if (typeof value !== 'string') throw new Error(`${where}: expected a string, got ${typeof value}`)
  if (value.length > 4000) throw new Error(`${where}: value exceeds 4000 characters`)
  if (!SAFE_VALUE_RE.test(value)) throw new Error(`${where}: value contains disallowed characters`)
  return value
}

// ---------------------------------------------------------------------------
// production form-field whitelist (pure) - unknown field fails closed
// ---------------------------------------------------------------------------

// Scalar length/number fields, keyed by their production aria-label (intake-form.tsx lengthCell).
const LENGTH_LABELS = new Set([
  '板宽', '板高', '板厚', '底座孔径', '板侧安装孔径',
  '固定中心 X', '固定中心 Y', '中心 X', '中心 Y',
  'X 许可下限', 'X 许可上限', 'Y 许可下限', 'Y 许可上限',
  '板宽许可下限', '板宽许可上限', '板高许可下限', '板高许可上限',
  '最小自由间隙', '最小边缘余量', '最小孔间材料', '尺寸公差',
  '连接器 X 下限', '连接器 X 上限', '连接器 Y 下限', '连接器 Y 上限', '连接器 Z 下限', '连接器 Z 上限',
])

// Select controls, keyed by the visible label; the value is the select's option value.
const SELECT_BY_LABEL = Object.freeze({
  统一单位: '[aria-label="统一单位"]',
  设备卡: '[data-fitplate="intake-card-select"]',
  移动许可: '[data-fitplate="intake-license"]',
  环境来源: '[data-fitplate="intake-env-source"]',
  要求来源: '[data-fitplate="intake-req-source"]',
})

const CHECKBOX_LABELS = new Set([
  '板宽允许在范围内调整', '板高允许在范围内调整',
  '声明直接支撑：设备底面 ↔ 板顶面（P0 支撑模型）',
])

const RADIO_LABELS = new Set(['未填写（由程序追问）', '给出一个盒范围', '明确未覆盖（不假装已验）'])

// Indexed table rows. The sub-field names are an explicit whitelist per group (fail closed on an
// unknown sub-field), matching the production aria-labels. The current demo layout has 4 base
// holes and 1 fixed cylinder; a case may address any row index the UI actually renders.
const INDEXED_SUBFIELDS = Object.freeze({
  固定柱: new Set(['id', 'X', 'Y', '半径', 'Z 下限', 'Z 上限']),
  螺钉头: new Set(['底座孔', '半径', 'Z 下限', 'Z 上限']),
  孔: new Set(['中心 X', '中心 Y']),
})
// `螺钉头 N 底座孔` is a <select> (the base-hole index), the rest are length inputs.
const INDEXED_SELECT_SUBFIELD = '底座孔'
const INDEXED_RE = /^(固定柱|螺钉头|孔)\s+(\d+)\s+(.+)$/

/** Resolve one label to a fill operation descriptor; throws on an unknown label (fail closed). */
export function resolveFieldOp(label, value) {
  if (LENGTH_LABELS.has(label)) return { kind: 'length', label, value }
  if (Object.hasOwn(SELECT_BY_LABEL, label)) {
    if (!SAFE_SELECT_RE.test(value)) throw new Error(`field '${label}': select value '${value}' is not a plain option value`)
    return { kind: 'select', label, selector: SELECT_BY_LABEL[label], value }
  }
  if (label === '短中文要求') return { kind: 'text', label, selector: '[data-fitplate="intake-text"]', value }
  if (CHECKBOX_LABELS.has(label)) return { kind: 'checkbox', label, value }
  if (RADIO_LABELS.has(label)) return { kind: 'radio', label, value }
  const indexed = INDEXED_RE.exec(label)
  if (indexed) {
    const group = indexed[1]
    const index = Number(indexed[2])
    const sub = indexed[3]
    const allowed = INDEXED_SUBFIELDS[group]
    if (!allowed || !allowed.has(sub)) throw new Error(`unknown indexed sub-field '${label}' (${group} allows: ${[...(allowed ?? [])].join(', ')})`)
    const kind = sub === INDEXED_SELECT_SUBFIELD ? 'indexed-select' : 'indexed'
    return { kind, label, group, index, sub, value }
  }
  throw new Error(`unknown form field '${label}'; it is not in the production IntakeFormState whitelist`)
}

/**
 * Turn one step's `form_fields` into ordered fill operations. Selects/checkboxes/radios first (they
 * reveal conditional fields), then scalar lengths, text and indexed rows. Every label is resolved
 * (and so validated) up front; an unknown label throws before any browser interaction.
 */
export function planFormOps(formFields) {
  // The two labels address the same latent coordinate in different visible licence modes.
  // Reject conflicting aliases before browser interaction instead of letting a later fill win.
  for (const axis of ['X', 'Y']) {
    const plain = formFields[`中心 ${axis}`], fixed = formFields[`固定中心 ${axis}`]
    if (plain !== undefined && fixed !== undefined) {
      const equal = plain.trim() === fixed.trim() || (plain.trim() !== '' && fixed.trim() !== '' && Number.isFinite(Number(plain)) && Number(plain) === Number(fixed))
      if (!equal) throw new Error(`conflicting centre aliases for ${axis}`)
    }
  }
  const ops = Object.entries(formFields).map(([label, value]) => resolveFieldOp(label, value))
  const order = { select: 0, radio: 1, checkbox: 2, length: 3, text: 4, indexed: 5, 'indexed-select': 6 }
  return ops.sort((a, b) => order[a.kind] - order[b.kind])
}

function normalizeFormFields(fields, where) {
  if (fields === undefined) return {}
  if (fields === null || typeof fields !== 'object' || Array.isArray(fields)) throw new Error(`${where}.form_fields: expected an object`)
  const out = {}
  for (const [label, value] of Object.entries(fields)) {
    if (typeof label !== 'string' || !label.trim()) throw new Error(`${where}.form_fields: a key is not a label string`)
    if (typeof value !== 'string') throw new Error(`${where}.form_fields['${label}']: expected a string (a UI value or select option value)`)
    if (!SAFE_VALUE_RE.test(value)) throw new Error(`${where}.form_fields['${label}']: value contains disallowed characters`)
    out[label] = value
  }
  // Resolve every label now so an unknown field/label/sub-field fails closed before any workspace.
  for (const [label, value] of Object.entries(out)) resolveFieldOp(label, value)
  return out
}

function normalizeStep(step, where) {
  if (step === null || typeof step !== 'object' || Array.isArray(step)) throw new Error(`${where}: a step must be an object`)
  for (const key of Object.keys(step)) {
    if (!STEP_KEYS.includes(key)) throw new Error(`${where}: unknown key '${key}' (allowed: ${STEP_KEYS.join(', ')})`)
  }
  const text = step.text === undefined ? undefined : assertScalarString(step.text, `${where}.text`)
  return { text, form_fields: normalizeFormFields(step.form_fields, where) }
}

/**
 * Validate and normalise one input document into `{ id, steps }`. The steps are the ordered user
 * edits: step 1 is the first request, each later step is a follow-up edit that must become a NEW
 * request revision. No branching on the id; unknown keys are refused.
 */
export function validateCaseInput(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('input: expected an object')
  assertNoGoldLeak(raw)
  for (const key of Object.keys(raw)) {
    if (!INPUT_TOP_KEYS.includes(key)) throw new Error(`input: unknown top-level key '${key}' (allowed: ${INPUT_TOP_KEYS.join(', ')})`)
  }
  const id = raw.id === undefined ? 'case' : assertScalarString(raw.id, 'input.id')
  let steps
  if (Array.isArray(raw.steps)) {
    if (raw.steps.length === 0) throw new Error('input.steps: must not be empty')
    steps = raw.steps.map((step, index) => normalizeStep(step, `input.steps[${index}]`))
  } else {
    steps = [normalizeStep({ text: raw.text, form_fields: raw.form_fields }, 'input')]
  }
  for (const [index, step] of steps.entries()) {
    if (step.text === undefined && Object.keys(step.form_fields).length === 0) throw new Error(`input step ${index}: needs text or form_fields`)
  }
  return { id, steps }
}

// ---------------------------------------------------------------------------
// observation logic (pure) - never reads gold, never forces confirmability
// ---------------------------------------------------------------------------

const NON_CONFIRMABLE_OUTCOMES = new Set(['NEEDS_INPUT', 'CONFLICTING_INPUT', 'UNSUPPORTED_REQUEST'])

/**
 * Decide what the synthetic user does for the latest draft *after that step's turn has ended*.
 *   * a confirmable READY_TO_CONFIRM draft -> 'confirm' (the pre-agreed action);
 *   * a non-confirmable final draft -> 'record-terminal' (record as-is);
 *   * no card yet -> 'wait' (still polling);
 *   * a card that is neither confirmable-ready nor a known non-confirmable outcome -> 'invalid':
 *     a terminal state the driver records and refuses, never a silent completion.
 */
export function caseAction(snapshot) {
  if (!snapshot || !snapshot.card) return { action: 'wait' }
  const outcome = snapshot.card.outcome
  if (snapshot.confirmable === true && outcome === 'READY_TO_CONFIRM') return { action: 'confirm', outcome }
  if (NON_CONFIRMABLE_OUTCOMES.has(outcome)) return { action: 'record-terminal', outcome }
  return { action: 'invalid', outcome }
}

/** The number of native turns one step is expected to produce: 1 without a confirmation, 2 with. */
export function expectedTurnsForStep(confirmed) {
  return confirmed ? 2 : 1
}

/**
 * Count actual candidates per request revision. A run manifest carries `task_id` + `task_revision`
 * (the frozen revision) and a `candidates` map. Every real candidate is charged: two runs for the
 * SAME revision (a repeated load that would reset the four-candidate budget) are summed, not maxed.
 * A second run for the same revision is itself refused - only a *new* revision (a re-confirmation)
 * may open another run.
 */
export function candidatesByRevision(manifests) {
  const byRevision = new Map()
  for (const manifest of manifests) {
    const key = `${manifest.task_id ?? '?'}@r${manifest.task_revision ?? '?'}`
    const entry = byRevision.get(key) ?? { revision: key, count: 0, run_ids: [] }
    entry.count += Object.keys(manifest.candidates ?? {}).length
    entry.run_ids.push(manifest.run_id ?? null)
    byRevision.set(key, entry)
  }
  const perRevision = [...byRevision.values()].map((entry) => ({
    revision: entry.revision,
    count: entry.count,
    run_ids: entry.run_ids,
    run_count: entry.run_ids.length,
    within_budget: entry.count <= MAX_CANDIDATES_PER_REVISION && entry.run_ids.length <= 1,
  }))
  return {
    per_revision: perRevision,
    total: perRevision.reduce((sum, entry) => sum + entry.count, 0),
    within_budget: perRevision.every((entry) => entry.within_budget),
  }
}

/** The number of distinct request revisions seen - a follow-up step must raise it. */
export function revisionCount(revisions) {
  return new Set(revisions.filter((r) => Number.isInteger(r))).size
}

/**
 * Summarise the run from the *actual* native events and manifests. The events are the real native
 * `{type:'turn/end', data:{reason}, seq}` envelopes. A native natural completion is never a driver
 * error, even without an export - the supervisor scores it. Only a non-completed terminal or an
 * exceeded deadline is a failure signal, and even then the record is preserved.
 */
export function summarizeRun({ events, manifests, quiet, deadlineExceeded, expectedTurns }) {
  const delivery = observeNativeDelivery({ manifests, events, quiet, expectedTurns })
  const candidates = candidatesByRevision(manifests)
  const terminal = events.filter((e) => e.type === 'turn/end').at(-1)?.data?.reason ?? null
  let status
  if (deadlineExceeded) status = 'deadline-exceeded'
  else if (delivery.state === 'pending') status = 'incomplete'
  else if (terminal && terminal !== 'completed') status = 'native-failed'
  else if (delivery.exported) status = 'completed-with-export'
  else status = 'completed-without-export'
  return {
    status,
    native_completed: delivery.state !== 'pending' && delivery.state !== 'native-failed',
    exported: delivery.exported,
    final_reason: terminal,
    candidates,
    candidate_total: candidates.total,
    within_candidate_budget: candidates.within_budget,
    delivery,
  }
}

/**
 * Decide whether the panel's controller has bound to the exact expected session yet.
 *
 * The panel DOM can exist before its controller binds asynchronously (the reported race: the
 * `intake-region` was present, but an immediate snapshot still showed `sessionKey === undefined`).
 * Binding is proven ONLY by the controller's own snapshot naming the exact expected session - never
 * by the panel merely being present, and never by falling back to another session. A snapshot that
 * names a DIFFERENT session is a hard failure (`mismatch`), not something to wait past.
 */
export function bindingState(snapshot, expectedSessionId) {
  if (!snapshot || typeof snapshot !== 'object') return { state: 'pending' }
  const key = snapshot.sessionKey
  if (key === undefined || key === null) return { state: 'pending' }
  if (key !== expectedSessionId) return { state: 'mismatch', actual: key, expected: expectedSessionId }
  return { state: 'bound' }
}

/**
 * Poll `readSnapshot` until the controller is bound to `expectedSessionId`, bounded by BOTH the
 * widget timeout and the remaining overall budget. Returns the bound snapshot. A different session
 * throws immediately; exhausting the bound throws a timeout - an explicit setup failure, never a
 * silent pass and never a retry that would spend a model turn.
 */
export async function waitForSessionBinding({ readSnapshot, expectedSessionId, widgetTimeoutMs, remainingMs, sleepMs = 250, now = Date.now, sleep }) {
  const wait = sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  const budget = Math.min(widgetTimeoutMs, Math.max(0, remainingMs))
  const start = now()
  for (;;) {
    const snapshot = await readSnapshot()
    const verdict = bindingState(snapshot, expectedSessionId)
    if (verdict.state === 'bound') return { snapshot, waitedMs: now() - start }
    if (verdict.state === 'mismatch') {
      throw new Error(`panel bound to a different session (${verdict.actual}) than expected (${verdict.expected})`)
    }
    if (now() - start >= budget) {
      throw new Error(`panel did not bind to the exact session within ${budget}ms (still ${verdict.state})`)
    }
    await wait(sleepMs)
  }
}

// ---------------------------------------------------------------------------
// main (real AGH + Playwright) - guarded entry
// ---------------------------------------------------------------------------

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function parseArgs(argv) {
  const args = [...argv]
  const get = (flag) => {
    const index = args.indexOf(flag)
    return index === -1 ? undefined : args[index + 1]
  }
  return { execute: args.includes('--execute'), protocol: get('--protocol'), input: get('--input') }
}

async function fileInventory(workspace) {
  const entries = []
  const walk = async (dir, prefix) => {
    for (const name of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const rel = prefix ? `${prefix}/${name.name}` : name.name
      if (name.isDirectory()) await walk(join(dir, name.name), rel)
      else entries.push(rel)
    }
  }
  await walk(workspace, '')
  return entries.sort()
}

class DeadlineError extends Error {}

export function licenceModesForLabel(label) {
  if (label === '固定中心 X' || label === '固定中心 Y') return ['fixed']
  if (label === '中心 X') return ['y_range']
  if (label === '中心 Y') return ['x_range']
  if (label === 'X 许可下限' || label === 'X 许可上限') return ['x_range', 'xy_range']
  if (label === 'Y 许可下限' || label === 'Y 许可上限') return ['y_range', 'xy_range']
  return []
}

export async function fillFormFields(page, ops) {
  // NEW 4-step wizard: fieldsets are display:none unless the intake region's data-input-step
  // matches (style.css .fp-guided-intake rules), so every op is executed on its own visible step.
  // The mapping mirrors intake-form.tsx: step 0 需求/板体, step 1 底座孔/设备安装, step 2 环境/要求.
  const LABEL_STEP = Object.freeze({
    设备卡: 0, 板宽: 0, 板高: 0, 板厚: 0, 板宽许可下限: 0, 板宽许可上限: 0, 板高许可下限: 0, 板高许可上限: 0,
    板宽允许在范围内调整: 0, 板高允许在范围内调整: 0, 短中文要求: 0,
    底座孔径: 1, 板侧安装孔径: 1, 移动许可: 1,
    固定中心X: 1, 固定中心Y: 1, 中心X: 1, 中心Y: 1,
    X许可下限: 1, X许可上限: 1, Y许可下限: 1, Y许可上限: 1,
    最小自由间隙: 2, 最小边缘余量: 2, 最小孔间材料: 2, 尺寸公差: 2,
    连接器X下限: 2, 连接器X上限: 2, 连接器Y下限: 2, 连接器Y上限: 2, 连接器Z下限: 2, 连接器Z上限: 2,
    环境来源: 2, 要求来源: 2,
    '声明直接支撑设备底面板顶面P0支撑模型': 2,
    未填写由程序追问: 2, 给出一个盒范围: 2, 明确未覆盖不假装已验: 2,
  })
  const norm = (label) => label.replace(/[\s：:（）()↔]/g, '')
  const stepOf = (op) => {
    if (op.kind === 'indexed' || op.kind === 'indexed-select') return op.group === '孔' ? 1 : 2
    if (op.kind === 'select' && op.label === '统一单位') return null // toolbar: visible on every step
    const step = LABEL_STEP[norm(op.label)]
    if (step === undefined) throw new Error(`no wizard step mapped for '${op.label}'`)
    return step
  }
  const byStep = new Map()
  for (const op of ops) {
    const key = stepOf(op) ?? -1
    if (!byStep.has(key)) byStep.set(key, [])
    byStep.get(key).push(op)
  }
  const runOps = async (stepOps) => {
    const licence = page.locator('[data-fitplate="intake-license"]')
    const finalMode = stepOps.find(op => op.label === '移动许可')?.value ?? (byStep.has(1) ? await licence.inputValue() : null)
    const temporaryModeEdits = []
    for (const op of stepOps) {
      if (op.kind === 'length' || op.kind === 'indexed') {
        const label = op.kind === 'indexed' ? `${op.group} ${op.index} ${op.sub}` : op.label
        const modes = licenceModesForLabel(label)
        const current = await licence.inputValue()
        if (modes.length && !modes.includes(current)) {
          await licence.selectOption(modes[0])
          temporaryModeEdits.push({ field: label, from: current, to: modes[0] })
        }
        const field = page.getByLabel(label, { exact: true }).first()
        await field.waitFor({ timeout: WIDGET_TIMEOUT_MS })
        await field.fill(op.value)
      } else if (op.kind === 'select' || op.kind === 'indexed-select') {
        const label = op.kind === 'indexed-select' ? `${op.group} ${op.index} ${op.sub}` : op.label
        const target = op.kind === 'select' ? page.locator(op.selector) : page.getByLabel(label, { exact: true }).first()
        await target.selectOption(op.value)
      } else if (op.kind === 'text') {
        await page.locator(op.selector).fill(op.value)
      } else if (op.kind === 'checkbox') {
        const box = page.getByLabel(op.label, { exact: true }).first()
        const want = op.value === 'true' || op.value === '1' || op.value === 'checked'
        if (want) await box.check()
        else await box.uncheck()
      } else if (op.kind === 'radio') {
        await page.getByLabel(op.label, { exact: true }).first().check()
      }
    }
    if (byStep.has(1)) {
      const current = await licence.inputValue()
      if (finalMode !== null && current !== finalMode) {
        await licence.selectOption(finalMode)
        temporaryModeEdits.push({ field: 'restore-requested-licence', from: current, to: finalMode })
      }
      if (finalMode !== null && await licence.inputValue() !== finalMode) throw new Error('requested final licence mode not restored')
    }
    return temporaryModeEdits
  }
  const temporaryModeEdits = []
  // Toolbar-level ops first (no step navigation), then step 0 -> 1 -> 2 in wizard order.
  if (byStep.has(-1)) temporaryModeEdits.push(...await runOps(byStep.get(-1)))
  for (const step of [0, 1, 2]) {
    if (!byStep.has(step)) continue
    const tab = page.locator(`[data-fitplate="input-step-${step}"]`)
    await tab.waitFor({ timeout: WIDGET_TIMEOUT_MS })
    await tab.click()
    temporaryModeEdits.push(...await runOps(byStep.get(step)))
  }
  const finalMode = ops.find(op => op.label === '移动许可')?.value ?? null
  return { final_mode: finalMode, temporary_mode_edits: temporaryModeEdits, declared_fields_filled: ops.map(op => op.label) }
}

async function main() {
  const { execute, protocol: protocolPath, input: inputPath } = parseArgs(process.argv.slice(2))
  if (!execute || !protocolPath || !inputPath) {
    throw new Error('usage: native-reproduction.mjs --execute --protocol <protocol.json> --input <input.json>')
  }
  const protocol = JSON.parse(await readFile(protocolPath, 'utf8'))
  if (protocol.execution_ready !== true) throw new Error('protocol is not execution_ready')
  const files = protocol.files ?? []
  if (files.length === 0) throw new Error('protocol.files must be a non-empty freeze list')
  for (const file of files) {
    const bytes = await readFile(file.file)
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) throw new Error('frozen source drift: ' + file.file)
  }
  // The input must be inside the freeze list with a matching hash: no arbitrary --input file.
  const inputBytes = await readFile(inputPath)
  const inputSha = sha256(inputBytes)
  const frozenInput = files.find((file) => file.file === inputPath || file.sha256 === inputSha)
  if (!frozenInput) throw new Error('the --input file is not in the frozen protocol.files list (or its hash does not match)')
  if (frozenInput.sha256 !== inputSha) throw new Error('the --input file hash does not match the frozen declaration')
  const rawInput = JSON.parse(inputBytes.toString('utf8'))
  const { id, steps } = validateCaseInput(rawInput)

  const lib = await import(pathToFileURL(join(ROOT, 'scripts/agh/lib.mjs')).href)
  const run = await import(pathToFileURL(join(ROOT, 'scripts/agh/run-fitplate.mjs')).href)
  const prepare = await import(pathToFileURL(join(ROOT, 'scripts/prepare-workspace.mjs')).href)

  const config = lib.config()
  if (config.scope !== 'competition') throw new Error('competition scope required')
  if (protocol.route !== 'official-ds41-high' || protocol.model !== 'deepseek-flash' || protocol.thinking !== 'high') {
    throw new Error('protocol must freeze DS-v4.1 / high')
  }
  if (config.aghHome !== protocol.agh_home || config.webOrigin !== protocol.web_origin) throw new Error('frozen home/origin mismatch')

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const out = join(ROOT, 'runs', 'native-reproduction', `reproduction-${stamp}`)
  const workspace = join(ROOT, 'demo-workspaces', `submission-v2-${stamp.toLowerCase()}`)
  await mkdir(out, { recursive: true })
  // A public source archive carries files, so this parent may not exist on first use.
  await mkdir(dirname(workspace), { recursive: true })
  await mkdir(workspace)
  await prepare.copyMethodSkill({ workspaceRoot: workspace })

  const result = {
    kind: 'FitPlate-public-native-reproduction',
    case_id: id,
    started_at: new Date().toISOString(),
    out,
    workspace,
    synthetic_user_automation: true,
    formal_evaluation: false,
    model_start_requested: false,
    approvals: [],
    permission_rpc: [],
    request_sent: [],
    public_events: [],
    turn_ends: [],
    tool_calls: [],
    cases: [],
    screenshots: [],
    protocol: protocolPath,
    input: inputPath,
    input_sha256: inputSha,
    freeze_verified_files: files.length,
    forbidden_input_keys: [...FORBIDDEN_INPUT_KEYS],
    preset: protocol.preset ?? null,
  }
  const check = (name, ok, detail) => {
    result.assertions ??= []
    result.assertions.push({ name, ok: Boolean(ok), detail })
    if (!ok) throw new Error(`${name}: ${JSON.stringify(detail)}`)
  }

  let client
  let session
  let browser
  let context
  let page
  let video
  let observer
  let observeTask
  const rpcApprovals = new Map()
  const askedByToolId = new Map()
  const callsByToolId = new Map()
  const deadline = Date.now() + CASE_BUDGET_MS
  const remaining = () => Math.max(0, deadline - Date.now())

  try {
    const opened = await lib.openClient()
    client = opened.client
    const packages = await client.packages.list({ profile: config.profile })
    const installed = packages.packages.find((p) => p.id === '@fitplate/plugin')
    check('accepted plugin snapshot running', installed?.actual === 'running' && installed?.trusted === true, { integrity: installed?.integrity, actual: installed?.actual, trusted: installed?.trusted })
    check('installed plugin integrity matches the frozen protocol', installed?.integrity === protocol.expected_package_integrity, { installed: installed?.integrity, expected: protocol.expected_package_integrity })
    result.plugin_integrity = installed?.integrity ?? null
    result.skill = await run.ensureSkillReady({ client, profile: config.profile, clientId: 'submission-v2', workspaceRoot: workspace })
    session = await client.session.new({ cwd: workspace, ...(protocol.preset ? { preset: protocol.preset } : {}) })
    result.session_id = session.id
    // Persist a neutral visible title even when a UI preflight fails before the first request.
    // This lets the official diagnostic UI select an otherwise empty native session.
    await client.session.rename(session.id, 'FitPlate｜原生流程')
    // Prove the effective preset: the session meta must report the frozen preset (or 'standard'
    // when the protocol names none). No provider overlay may be configured.
    const sessionsPage = await client.session.list({})
    const sessionMeta = sessionsPage.items.find((item) => item.sessionId === session.id)
    const expectedPreset = protocol.preset ?? 'standard'
    result.session_preset = sessionMeta?.preset ?? null
    check('session runs under the frozen preset', sessionMeta?.preset === expectedPreset, { actual: sessionMeta?.preset, expected: expectedPreset })
    const configured = await client.config.get()
    check('no configuration-owned provider overlay', configured.provider === null || configured.provider === undefined, { provider: configured.provider })
    result.configuration_provider_overlay_present = false
    result.model_requested = { route: protocol.route, model: protocol.model, thinking: protocol.thinking }
    result.model = await session.setModel({ slot: 'primary', route: protocol.route, model: protocol.model, thinking: protocol.thinking })
    result.resolved_model = (await session.projectUI()).usage?.model
    check('native primary resolved to frozen DS-v4.1 high', result.resolved_model?.route === protocol.route && result.resolved_model?.id === protocol.model && result.resolved_model?.thinking === protocol.thinking, result.resolved_model)
    check('native primary resolved to user requested1M context and frozen output budget', result.resolved_model?.settings?.contextWindow === 1048576 && result.resolved_model?.maxTokens === 16384, result.resolved_model)

    observer = session.events({ types: ['assistant/message', 'user/message', 'tool/call', 'tool/result', 'approval/asked', 'approval/decided', 'turn/end', 'request/sent'] })[Symbol.asyncIterator]()
    observeTask = (async () => {
      for (;;) {
        const next = await observer.next()
        if (next.done) break
        const e = next.value
        const publicRow = publicEvent(e)
        if (publicRow) result.public_events.push(publicRow)
        if (e.type === 'request/sent') result.request_sent.push({ seq: e.seq, at: new Date().toISOString() })
        if (e.type === 'approval/asked') askedByToolId.set(e.data.toolUseId ?? e.data.requestId, e.data)
        if (e.type === 'tool/call') {
          callsByToolId.set(e.data.toolUseId, e.data)
          result.tool_calls.push({ seq: e.seq, toolUseId: e.data.toolUseId, name: e.data.name, args: e.data.args ?? null, at: new Date().toISOString() })
        }
        if (e.type === 'turn/end') {
          result.turn_ends.push({ seq: e.seq, reason: e.data.reason, at: new Date().toISOString() })
          result.native_turn_end_events ??= []
          result.native_turn_end_events.push({ type: 'turn/end', seq: e.seq, data: { reason: e.data.reason } })
        }
      }
    })().catch((error) => { result.observer_error = error.message })

    process.env.PLAYWRIGHT_BROWSERS_PATH = ROOT + '/.cache/playwright'
    process.env.LD_LIBRARY_PATH = ROOT + '/.cache/chromium-libs/usr/lib/x86_64-linux-gnu' + (process.env.LD_LIBRARY_PATH ? ':' + process.env.LD_LIBRARY_PATH : '')
    if (existsSync(ROOT + '/.cache/native-fontconfig/fonts.conf')) process.env.FONTCONFIG_FILE = ROOT + '/.cache/native-fontconfig/fonts.conf'
    const { chromium } = await import(pathToFileURL(join(ROOT, 'node_modules/playwright/index.mjs')).href)
    browser = await chromium.launch({ headless: true })
    context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, ...(protocol.record_video ? { recordVideo: { dir: join(out, 'video-raw'), size: { width: 1600, height: 1000 } } } : {}) })
    page = await context.newPage()
    video = page.video()
    page.on('pageerror', (error) => { result.console_errors ??= []; result.console_errors.push(error.message.slice(0, 400)) })
    page.on('websocket', (ws) => ws.on('framereceived', ({ payload }) => {
      let msg
      try { msg = JSON.parse(typeof payload === 'string' ? payload : payload.toString('utf8')) } catch { return }
      if (msg.method !== 'session/request_permission' || msg.params?.sessionId !== session.id) return
      const p = msg.params
      const clean = { toolCallId: p.toolCall?.toolCallId, tool: p.toolCall?._meta?.['ai.agnes.harness']?.tool ?? null, rawInput: p.toolCall?.rawInput ?? null, requestId: p._meta?.['ai.agnes.harness']?.requestId ?? null, deadline: p._meta?.['ai.agnes.harness']?.deadline ?? null, options: p.options }
      rpcApprovals.set(clean.toolCallId, clean)
      result.permission_rpc.push({ ...clean, at: new Date().toISOString() })
    }))
    await page.goto(protocol.web_origin + '/', { waitUntil: 'domcontentloaded' })
    const entry = page.locator(`button.session[data-session="${session.id}"]`)
    await entry.waitFor({ timeout: WIDGET_TIMEOUT_MS })
    await entry.click()
    await page.locator('[data-fitplate="intake-region"]').waitFor({ timeout: 15_000 })

    const snapshot = () => page.evaluate(() => {
      const controller = globalThis.__fitplateDebug?.intakeController
      const s = controller?.getSnapshot()
      return s ? { sessionKey: s.sessionKey, phase: s.phase, status: s.status, confirmable: s.confirmable, card: s.card, sent: s.sent, confirmation: s.confirmation, frozen: s.frozen } : null
    })
    const quiet = async () => (await session.projectUI()).opState === null
    // The panel element exists before its controller binds asynchronously, so an immediate snapshot
    // can still be unbound. Wait for the EXACT session binding, bounded by both the widget timeout
    // and the remaining overall budget; a different session or a timeout is an explicit setup
    // failure with zero model calls (no force click, no session substitution, no retry).
    const binding = await waitForSessionBinding({
      readSnapshot: snapshot,
      expectedSessionId: session.id,
      widgetTimeoutMs: WIDGET_TIMEOUT_MS,
      remainingMs: remaining(),
    })
    check('panel bound to exact new session', binding.snapshot?.sessionKey === session.id, { session: session.id, waited_ms: binding.waitedMs })

    const approvalKeys = new Set()
    const firstSeen = new Map()
    const serviceApprovals = async () => {
      for (const [toolCallId, rpc] of rpcApprovals) {
        const identity = rpc.requestId ?? toolCallId
        if (approvalKeys.has(identity)) continue
        if (!firstSeen.has(identity)) firstSeen.set(identity, Date.now())
        const age = Date.now() - (firstSeen.get(identity) ?? Date.now())
        const key = 'live:' + toolCallId
        const keys = await page.locator('[data-approval-key]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-approval-key')))
        const call = callsByToolId.get(toolCallId)
        // An unknown-outcome RPC (tool null) is rejected immediately once its card is visible -
        // never delayed or allowed. A null-tool request is never a known product write.
        if (rpc.tool === null && keys.includes(key)) {
          const record = { key, toolUseId: toolCallId, tool: null, expected_scope: null, request_id: identity, policy_reason: 'unknown-outcome', decision: 'rejected', ui_action: 'attempted', at: new Date().toISOString() }
          result.approvals.push(record)
          approvalKeys.add(identity)
          const reject = page.locator(`[data-approval-key="${key}"] [data-approval-action="live:reject_once"]`)
          if (await reject.count()) { await reject.click(); record.ui_action = 'clicked' }
          throw new Error('unknown-outcome approval (tool null) rejected; native failure preserved')
        }
        if (!keys.includes(key) || !call) {
          if (age > 25_000) throw new Error('live permission lacks exact browser card/tool binding')
          continue
        }
        const exact = page.locator(`[data-approval-key="${key}"]`)
        const state = await snapshot()
        const decision = decidePilotPermission({ rpc, call, state })
        const duplicate = result.approvals.some((a) => a.toolUseId === toolCallId)
        const timely = Number.isFinite(Date.parse(rpc.deadline)) && Date.parse(rpc.deadline) > Date.now()
        const allow = decision.allow && !duplicate && timely
        const record = { key, toolUseId: toolCallId, tool: call.name, expected_scope: decision.scope ?? null, request_id: identity, policy_reason: decision.reason, duplicate, timely, decision_intent: allow ? 'allowed-once' : 'rejected', decision: null, ui_action: 'pending', at: new Date().toISOString() }
        result.approvals.push(record)
        approvalKeys.add(identity)
        if (allow) {
          // attempted -> clicked -> the real decision is recorded only after the click resolves.
          record.ui_action = 'attempted'
          await exact.locator('[data-approval-action="live:allow_once"]').click()
          record.ui_action = 'clicked'
          record.decision = 'allowed-once'
        } else {
          record.ui_action = 'attempted'
          const reject = exact.locator('[data-approval-action="live:reject_once"]')
          if (await reject.count()) { await reject.click(); record.ui_action = 'clicked' }
          record.decision = 'rejected'
          throw new Error('unknown, expired or mismatched approval rejected: ' + decision.reason)
        }
      }
    }

    // Wait until `predicate(snapshot)` holds AND the session is quiet (opState null). Every await is
    // bounded by the remaining case deadline; on expiry a DeadlineError is raised so the caller can
    // cancel the model rather than leaving it running.
    const waitQuiet = async (predicate, label) => {
      while (Date.now() < deadline) {
        await serviceApprovals()
        const state = await snapshot()
        if (predicate(state) && (await quiet())) return state
        if (state?.status?.kind === 'error' && state.polling === false) throw new Error(label + ': ' + JSON.stringify(state.status))
        await page.waitForTimeout(600)
      }
      throw new DeadlineError(label + ' exceeded the 300s case budget')
    }

    let previousRevision = 0
    let confirmedTurns = 0
    for (const [index, step] of steps.entries()) {
      const stepRecord = { step: index, started_at: new Date().toISOString() }
      result.cases.push(stepRecord)
      if (index === 0) {
        // NEW UI welcome: 「用示例体验」 is the only intake-demo element while visibleStep < 0.
        await page.locator('[data-fitplate="intake-demo"]').click()
        // The demo-loaded info banner is the new-UI public source warning (intake-demo-note is gone).
        const note = await page.locator('[data-fitplate="intake-status"]').innerText()
        check('public example source warning visible', /无实物验证|非实测|自设/.test(note), note)
      } else {
        // A committed run collapses the panel; expand it so the next edit is real.
        const expand = page.locator('[data-fitplate="intake-expand"]')
        if (await expand.count()) await expand.click().catch(() => {})
        // If expansion landed on the welcome screen, enter the wizard WITHOUT reloading the demo
        // (reloading would wipe the previously entered values this step edits).
        if (await page.locator('[data-fitplate="welcome"]').isVisible().catch(() => false)) {
          await page.locator('[data-fitplate="intake-custom"]').click()
        }
      }
      if (step.text !== undefined) {
        await page.locator('[data-fitplate="input-step-0"]').click()
        await page.locator('[data-fitplate="intake-text"]').fill(step.text)
      }
      // A demo step uses the public example exactly as loaded - no visible field is touched.
      stepRecord.form_operations = Object.keys(step.form_fields).length > 0 ? await fillFormFields(page, planFormOps(step.form_fields)) : []
      if (Object.keys(step.form_fields).length > 0 || step.text !== undefined) {
        // Submission lives on the review step (the submit button is hidden on other steps).
        await page.locator('[data-fitplate="input-step-3"]').click()
      }
      const turnsBefore = result.turn_ends.length
      result.model_start_requested = true
      await page.locator('[data-fitplate="intake-submit"]').click()
      // Wait for the SUBMITTED turn to finish naturally and the session to be quiet, THEN read the
      // latest draft. A first intermediate draft never decides the outcome.
      const drafted = await waitQuiet((s) => s?.card !== null && result.turn_ends.length > turnsBefore, `step ${index} draft turn end`)
      stepRecord.outcome = drafted.card?.outcome ?? null
      stepRecord.confirmable = drafted.confirmable === true
      stepRecord.request_revision = drafted.card?.requestRevision ?? drafted.sent?.revision ?? null
      stepRecord.request_sha256 = drafted.sent?.sha256 ?? null
      if (stepRecord.request_revision !== null) {
        if (index > 0) check(`step ${index} is a NEW request revision`, stepRecord.request_revision > previousRevision, { previous: previousRevision, now: stepRecord.request_revision })
        previousRevision = stepRecord.request_revision
      }
      const sentBytes = drafted.sent?.base64 ? Buffer.from(drafted.sent.base64, 'base64') : null
      if (sentBytes) {
        check(`step ${index} UI request SHA matches uploaded bytes`, sha256(sentBytes) === drafted.sent.sha256)
        stepRecord.request = JSON.parse(sentBytes.toString('utf8'))
        check(`step ${index} request sources stay design assumptions`, stepRecord.request.form?.environment?.source === 'design_assumption' && stepRecord.request.form?.requirements?.source === 'design_assumption', stepRecord.request.form?.environment?.source)
        await writeFile(join(out, `ui-request-step${index}.json`), sentBytes)
      }
      // Exact binding of the latest draft to the sent request (as in v10): the card must name the
      // exact request the panel sent, and the sent bytes must hash to the sent sha.
      if (drafted.card && drafted.sent) {
        check(
          `step ${index} draft card binds to the exact sent request`,
          drafted.card.requestId === drafted.sent.requestId &&
            drafted.card.requestRevision === drafted.sent.revision &&
            drafted.card.attachmentSha256 === drafted.sent.sha256 &&
            typeof drafted.card.attachmentRef === 'string' && drafted.card.attachmentRef.length > 0 &&
            sha256(Buffer.from(drafted.sent.base64, 'base64')) === drafted.sent.sha256,
          { card: { id: drafted.card.requestId, revision: drafted.card.requestRevision, sha: drafted.card.attachmentSha256, ref: drafted.card.attachmentRef }, sent: { id: drafted.sent.requestId, revision: drafted.sent.revision, sha: drafted.sent.sha256 } },
        )
      }
      const action = caseAction(drafted)
      stepRecord.action = action.action
      if (action.action === 'invalid') {
        // A terminal card that is neither confirmable-ready nor a known non-confirmable outcome is
        // recorded and refused - never a silent completion.
        throw new Error(`step ${index}: draft outcome ${action.outcome} is not a confirmable or known non-confirmable state`)
      }
      if (action.action === 'confirm') {
        const confirmTurnsBefore = result.turn_ends.length
        await page.locator('[data-fitplate="intake-confirm"]').click()
        const frozen = await waitQuiet((s) => s?.phase === 'committed' && result.turn_ends.length > confirmTurnsBefore, `step ${index} commit turn end`)
        stepRecord.frozen = frozen.frozen
        confirmedTurns += 1
        check(`step ${index} frozen task bound to the request`, frozen.frozen?.taskId === 'user-' + drafted.sent.requestId, frozen.frozen)
        if (frozen.confirmation?.base64) {
          const confirmationBytes = Buffer.from(frozen.confirmation.base64, 'base64')
          check(`step ${index} confirmation SHA matches`, sha256(confirmationBytes) === frozen.confirmation.sha256)
          await writeFile(join(out, `ui-confirmation-step${index}.json`), confirmationBytes)
        }
      }
      stepRecord.finished_at = new Date().toISOString()
      await page.screenshot({ path: join(out, `step-${index}.png`) }).catch(() => {})
      result.screenshots.push(`step-${index}.png`)
    }

    // One last quiet check, then summarise from the real events and manifests.
    const expectedTurns = steps.length + confirmedTurns
    const nativeEvents = result.native_turn_end_events ?? []
    const runIds = (await readdir(join(workspace, 'runs')).catch(() => [])).filter((n) => /^r-/.test(n))
    const manifests = await Promise.all(runIds.map(async (rid) => JSON.parse(await readFile(join(workspace, 'runs', rid, 'manifest.json'), 'utf8'))))
    result.run_manifests = manifests
    result.summary = summarizeRun({ events: nativeEvents, manifests, quiet: await quiet(), deadlineExceeded: false, expectedTurns })
    check('per-revision candidate count within four', result.summary.within_candidate_budget, result.summary.candidates)
    // Post-decision audit: every approval we answered must match the native `approval/asked` event
    // for the same toolUseId AND the same requestId, with `asked.kind === 'tool'` (a null-kind ask
    // is never a valid product-write approval), plus the classified scope when the decision carried
    // one. This is an audit record, never a live latch; a mismatch is recorded, not dropped.
    result.approval_binding = result.approvals.map((a) => {
      const asked = askedByToolId.get(a.toolUseId)
      const bound =
        Boolean(asked) &&
        asked.toolUseId === a.toolUseId &&
        asked.kind === 'tool' &&
        (asked.requestId === undefined || asked.requestId === a.request_id) &&
        (a.expected_scope === null || asked.scope === a.expected_scope)
      return { toolUseId: a.toolUseId, tool: a.tool, decision: a.decision, ui_action: a.ui_action, asked_kind: asked?.kind ?? null, asked_requestId: asked?.requestId ?? null, request_id: a.request_id, expected_scope: a.expected_scope, asked_scope: asked?.scope ?? null, bound }
    })
    check('every answered approval binds to its native asked event', result.approval_binding.every((b) => b.bound), result.approval_binding)
    await page.screenshot({ path: join(out, 'final-native.png') }).catch(() => {})
    result.screenshots.push('final-native.png')
    result.outcome = 'observed-' + result.summary.status
  } catch (error) {
    result.outcome = error instanceof DeadlineError ? 'deadline-exceeded' : 'FAILED'
    result.error = { name: error.name, message: error.message }
    process.exitCode = 1
    if (page) {
      result.final_intake_state = await page.evaluate(() => {
        const s = globalThis.__fitplateDebug?.intakeController?.getSnapshot()
        return s ? { phase: s.phase, status: s.status, confirmable: s.confirmable, outcome: s.card?.outcome } : null
      }).catch(() => null)
      await page.screenshot({ path: join(out, 'failure-native.png') }).catch(() => {})
      result.screenshots.push('failure-native.png')
    }
    // A deadline (or any failure) must never leave the model running.
    if (session) await session.cancel().catch(() => {})
  } finally {
    try {
      const runIds = (await readdir(join(workspace, 'runs'))).filter((n) => /^r-/.test(n))
      result.run_manifests = await Promise.all(runIds.map(async (rid) => JSON.parse(await readFile(join(workspace, 'runs', rid, 'manifest.json'), 'utf8'))))
      if (!result.summary) {
        const expectedTurns = (result.cases?.length ?? 0) + result.approvals.filter((a) => a.decision === 'allowed-once').length
        result.summary = summarizeRun({ events: result.native_turn_end_events ?? [], manifests: result.run_manifests, quiet: false, deadlineExceeded: result.outcome === 'deadline-exceeded', expectedTurns })
      }
    } catch { result.run_manifests ??= [] }
    try { result.file_inventory = await fileInventory(workspace) } catch { result.file_inventory = [] }
    if (observer) await observer.return().catch(() => {})
    if (observeTask) await observeTask.catch(() => {})
    try {
      result.evidence = await writePublicTrace({ events: result.public_events, sessionId: session?.id ?? null, out })
    } catch (error) { result.export_error = error.message }
    delete result.public_events
    if (context) await context.close().catch(() => {})
    if (protocol.record_video && page && video) {
      try { await video.saveAs(join(out, 'native-session.webm')); result.video = { file: join(out, 'native-session.webm'), synthetic_user_automation: true, edited: false } } catch (error) { result.video_error = error.message }
    }
    if (browser) await browser.close().catch(() => {})
    if (session) await session.detach().catch(() => {})
    if (client) await lib.closeClient(client)
    result.finished_at = new Date().toISOString()
    await writeFile(join(out, 'result.json'), JSON.stringify(result, null, 2) + '\n')
    console.log(JSON.stringify({ out: join(out, 'result.json'), outcome: result.outcome, status: result.summary?.status ?? null }))
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  main().catch((error) => {
    console.error(JSON.stringify({ outcome: 'FAILED', message: error.message }))
    process.exitCode = 1
  })
}
