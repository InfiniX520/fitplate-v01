// Explicit, restricted unit normalization for evaluation inputs (T11, Plan1 13.2 N02).
//
// The frozen task contract only accepts millimetres and refuses to guess: this script therefore
// converts *only* the fields a raw input file marks with an explicit `{value, unit}` pair, and it
// both **applies** the conversion to a task template (`applyTaskConversions`, the function the
// prepare step wires) and **verifies** the frozen case input against the result
// (`verifyAgainstTask` / `--check-task`). It refuses everything else:
//
//   * only lengths listed in `fields[]` with a unit in the explicit table are converted;
//   * fields that are already mm (`passthrough_mm`) are checked against the template, never
//     multiplied;
//   * angles (`*_deg`), indices, hashes and unit-less values are structurally refused - magnitude
//     heuristics ("multiply everything by 10") are exactly what this script exists to prevent;
//   * a converted value may only be written where the template already has a finite number (or an
//     array of finite numbers) of the same shape: no path may be invented, no field created;
//   * a value the requester did not supply is reported as NEEDS_INPUT with its paths - it is never
//     guessed, and a missing value stops the standardization instead of producing a task.
//
// The conversion records are public evidence: they prove what the standardization did, with labels
// (source value/unit -> mm target, factor, hashes of the raw input, the template and the frozen
// task). They are never copied into a model session workspace; the session only ever sees the
// frozen, already-standardized mm contract.
//
// Node built-ins only (same rule as the other project scripts).
//
// Usage:
//   node scripts/normalize-input.mjs --case n02-units-mixed [--write] [--json]
//   node scripts/normalize-input.mjs --case n02-units-mixed --check-task
//   node scripts/normalize-input.mjs --case n02-units-mixed --emit-task <out.json>
// Exit codes: 0 ok · 2 usage · 3 input missing/mismatch · 4 refused conversion (unknown unit,
//             denied field, template without that field) · 5 NEEDS_INPUT (a marked value is
//             absent; nothing is applied and nothing is guessed)

import { readFile, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const FITPLATE_ROOT = resolve(HERE, '..')

/** Explicit conversion table. No unit is ever inferred from magnitude. */
export const MM_FACTORS = Object.freeze({ mm: 1, cm: 10, m: 1000, um: 0.001, in: 25.4 })

/** Field-name shapes that are never lengths, whatever they contain. */
const NEVER_SCALED = [
  { test: /_deg$|(^|\.)rotation/, why: 'angle in degrees' },
  { test: /_index$|(^|\.)index$|centers?\[\d+\]$/, why: 'index or frozen position' },
  { test: /sha256|hash|_id$|revision/, why: 'hash, identity or revision' },
]

class Refusal extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'Refusal'
    this.exitCode = code
  }
}

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')

function readPath(doc, path) {
  return path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), doc)
}

/** Structural clone with the dotted path written; refuses when the path cannot exist (no inventing). */
function writePath(clone, path, value) {
  const keys = path.split('.')
  let node = clone
  for (const key of keys.slice(0, -1)) {
    if (node == null || typeof node !== 'object' || !(key in node)) {
      throw new Refusal(4, `refused: template has no field ${path} (a conversion never creates a field)`)
    }
    node = node[key]
  }
  const last = keys.at(-1)
  if (node == null || typeof node !== 'object' || !(last in node)) {
    throw new Refusal(4, `refused: template has no field ${path} (a conversion never creates a field)`)
  }
  node[last] = value
}

export function convertValue(path, value, unit) {
  for (const rule of NEVER_SCALED) {
    if (rule.test.test(path)) {
      throw new Refusal(4, `refused: ${path} looks like ${rule.why} and is never unit-scaled`)
    }
  }
  if (!(unit in MM_FACTORS)) {
    throw new Refusal(4, `refused: ${path} declares unit ${JSON.stringify(unit)}; known units: ${Object.keys(MM_FACTORS).join(', ')}`)
  }
  const factor = MM_FACTORS[unit]
  const scaled = (item) => {
    if (typeof item !== 'number' || !Number.isFinite(item)) {
      throw new Refusal(3, `refused: ${path} carries a non-numeric value ${JSON.stringify(item)}`)
    }
    return { source: item, target: Number((item * factor).toPrecision(12)) }
  }
  const numeric = Array.isArray(value)
    ? { source: value, target: value.map((item) => scaled(item).target) }
    : { source: value, target: scaled(value).target }
  return { path, unit, factor, source_value: numeric.source, target_value_mm: numeric.target }
}

/** Shape check used by both apply and verify: a target must match the template value's shape. */
function shapesAgree(templateValue, target) {
  if (Array.isArray(target)) {
    return (
      Array.isArray(templateValue) &&
      templateValue.length === target.length &&
      templateValue.every((item, index) => typeof item === 'number' && Number.isFinite(item))
    )
  }
  return typeof templateValue === 'number' && Number.isFinite(templateValue)
}

/** Order-insensitive deep equality for the frozen-task comparison (both sides are JSON docs). */
export function deepEqual(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => deepEqual(item, right[index]))
    )
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const leftKeys = Object.keys(left).sort()
    const rightKeys = Object.keys(right).sort()
    return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && deepEqual(left[key], right[key]))
  }
  return Object.is(left, right)
}

/** The first path difference between two docs, for a readable failure message ("$" is the root). */
export function firstDifference(left, right, at = '$') {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return `${at}: ${JSON.stringify(left)} != ${JSON.stringify(right)}`
    if (left.length !== right.length) return `${at}: length ${left.length} != ${right.length}`
    for (let index = 0; index < left.length; index += 1) {
      const found = firstDifference(left[index], right[index], `${at}[${index}]`)
      if (found) return found
    }
    return null
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()
    for (const key of keys) {
      if (!(key in left)) return `${at}.${key}: missing on left`
      if (!(key in right)) return `${at}.${key}: missing on right`
      const found = firstDifference(left[key], right[key], `${at}.${key}`)
      if (found) return found
    }
    return null
  }
  return Object.is(left, right) ? null : `${at}: ${JSON.stringify(left)} != ${JSON.stringify(right)}`
}

/**
 * Normalize one raw-fields document against the frozen case task.
 * Returns { conversions, checks } and refuses on the first inconsistency.
 */
export function normalizeFields(raw, casesRoot) {
  if (raw?.schema_version !== '1.0') throw new Refusal(3, 'raw-fields.json: unsupported schema_version')
  const caseId = raw.case_id
  if (typeof caseId !== 'string' || !/^[a-z0-9][a-z0-9-]{1,62}$/.test(caseId)) {
    throw new Refusal(3, `raw-fields.json: unsafe case_id ${JSON.stringify(caseId)}`)
  }
  const conversions = []
  const checks = []
  const declared = new Set((raw.fields ?? []).map((field) => field.path))
  for (const field of raw.fields ?? []) {
    if (typeof field.path !== 'string' || !field.path) throw new Refusal(3, 'fields[]: each entry needs a path')
    const refused = afterNeverScaled(field.path)
    if (refused) throw new Refusal(4, `refused: ${field.path} looks like ${refused} and is never unit-scaled`)
    if (field.value === undefined || field.value === null) {
      throw new Refusal(5, `NEEDS_INPUT: ${field.path} is marked for conversion but the requester supplied no value; it is never guessed`)
    }
    if (typeof field.value !== 'number' || !Number.isFinite(field.value)) {
      throw new Refusal(3, `fields[${field.path}]: value must be a finite number`)
    }
    conversions.push(convertValue(field.path, field.value, field.unit))
  }
  for (const field of raw.passthrough_mm ?? []) {
    if (declared.has(field.path)) {
      throw new Refusal(3, `${field.path} is listed both as a converted field and as already-mm`)
    }
    const value = field.value
    const numeric = Array.isArray(value) ? value : [value]
    for (const item of numeric) {
      if (typeof item !== 'number' || !Number.isFinite(item)) {
        throw new Refusal(3, `passthrough ${field.path}: not finite numbers`)
      }
    }
    checks.push({ path: field.path, value, unit: 'mm', converted: false })
  }
  for (const field of raw.never_scaled ?? []) {
    if (declared.has(field.path)) {
      throw new Refusal(4, `${field.path} is declared in both fields[] and never_scaled[]`)
    }
    checks.push({ path: field.path, value: field.value, reason: field.reason, converted: false })
  }
  return { caseId, conversions, checks }
}

/**
 * Apply the explicit conversions to a *task template* and return the standardized TaskSpec.
 *
 * This is the restricted application step (never a magnitude heuristic):
 *   * a raw field whose value is absent is reported as NEEDS_INPUT with its paths; nothing is
 *     applied and nothing is guessed (`status: 'NEEDS_INPUT'`, no task);
 *   * each converted path must already exist in the template with a finite number (or an array of
 *     finite numbers) of the same shape - a conversion can rewrite a value, never add or move a
 *     field, so a typo is a refusal instead of a silently empty edit;
 *   * `passthrough_mm` and `never_scaled` entries are cross-checked against the template so the
 *     mm-only fields cannot drift either.
 *
 * `template` is the pre-standardization TaskSpec draft: unit-marked fields still carry the value
 * exactly as the requester wrote it (e.g. `plate.width: 10` for "10 cm"); every other field is the
 * frozen mm value. The output equals the frozen case input - `deepEqual(task, frozenTask)` - and
 * that equality is what `--check-task` verifies.
 */
export function applyTaskConversions({ raw, template }) {
  if (raw?.schema_version !== '1.0') throw new Refusal(3, 'raw-fields.json: unsupported schema_version')
  if (!template || typeof template !== 'object') throw new Refusal(3, 'task template must be a JSON object')

  const missing = []
  const conversions = []
  for (const field of raw.fields ?? []) {
    if (typeof field.path !== 'string' || !field.path) throw new Refusal(3, 'fields[]: each entry needs a path')
    const refused = afterNeverScaled(field.path)
    if (refused) throw new Refusal(4, `refused: ${field.path} looks like ${refused} and is never unit-scaled`)
    if (field.value === undefined || field.value === null) {
      // The requester marked the field but did not supply the value: NEEDS_INPUT, never a guess.
      missing.push(field.path)
      continue
    }
    conversions.push(convertValue(field.path, field.value, field.unit))
  }
  for (const path of raw.missing_fields ?? []) {
    if (typeof path !== 'string' || !path) throw new Refusal(3, 'missing_fields[]: each entry needs a path')
    const refused = afterNeverScaled(path)
    if (refused) throw new Refusal(4, `refused: ${path} looks like ${refused} and is never unit-scaled`)
    missing.push(path)
  }
  if (missing.length > 0) {
    return { status: 'NEEDS_INPUT', missing: [...new Set(missing)].sort(), conversions, applied: [] }
  }

  let task = structuredClone(template)
  const applied = []
  for (const row of conversions) {
    const templateValue = readPath(template, row.path)
    if (templateValue === undefined) {
      throw new Refusal(4, `refused: template has no field ${row.path} (a conversion never creates a field)`)
    }
    if (!shapesAgree(templateValue, row.target_value_mm)) {
      throw new Refusal(3, `refused: template ${row.path} is not a finite number of the converted shape (template ${JSON.stringify(templateValue)}, converted ${JSON.stringify(row.target_value_mm)})`)
    }
    writePath(task, row.path, row.target_value_mm)
    applied.push({ path: row.path, source_value: row.source_value, unit: row.unit, factor: row.factor, target_value_mm: row.target_value_mm, template_value: templateValue })
  }
  for (const field of raw.passthrough_mm ?? []) {
    const templateValue = readPath(template, field.path)
    if (!deepEqual(templateValue, field.value)) {
      throw new Refusal(3, `refused: passthrough ${field.path} says ${JSON.stringify(field.value)} mm but the template has ${JSON.stringify(templateValue)}`)
    }
    applied.push({ path: field.path, value: field.value, unit: 'mm', converted: false })
  }
  return { status: 'OK', missing: [], conversions, applied, task }
}

/** null when `path` is a scaleable length path, else the refusal reason (shared by the NEEDS_INPUT filter). */
function afterNeverScaled(path) {
  for (const rule of NEVER_SCALED) {
    if (rule.test.test(path)) return rule.why
  }
  return null
}

/**
 * Apply the conversion rows to the task template of the case and verify the frozen input already
 * agrees with them. This is the step that turns "standardization happened" from a claim into a
 * checkable record.
 */
export function verifyAgainstTask(conversions, task) {
  const mismatches = []
  for (const row of conversions) {
    const frozen = readPath(task, row.path)
    const agree = Array.isArray(row.target_value_mm)
      ? Array.isArray(frozen) &&
        frozen.length === row.target_value_mm.length &&
        frozen.every((item, index) => Math.abs(item - row.target_value_mm[index]) <= 1e-9)
      : typeof frozen === 'number' && Math.abs(frozen - row.target_value_mm) <= 1e-9
    if (!agree) {
      mismatches.push(`${row.path}: converted ${JSON.stringify(row.target_value_mm)} mm, frozen task has ${JSON.stringify(frozen)}`)
    }
    row.frozen_task_value = frozen
    row.agrees_with_frozen_task = agree
  }
  if (mismatches.length) throw new Refusal(3, `standardized values do not match the frozen case input:\n  ${mismatches.join('\n  ')}`)
  return conversions
}

function parseArgs(argv) {
  const options = { caseId: undefined, write: false, json: false, checkTask: false, emitTask: undefined }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--case') {
      options.caseId = argv[++i]
      if (!options.caseId) throw new Refusal(2, '--case needs the case id')
    } else if (arg === '--write') options.write = true
    else if (arg === '--json') options.json = true
    else if (arg === '--check-task') options.checkTask = true
    else if (arg === '--emit-task') {
      options.emitTask = argv[++i]
      if (!options.emitTask) throw new Refusal(2, '--emit-task needs an output path')
    } else throw new Refusal(2, `unknown argument ${arg}`)
  }
  if (!options.caseId) throw new Refusal(2, 'usage: node scripts/normalize-input.mjs --case <case-id> [--write] [--json] [--check-task] [--emit-task <out.json>]')
  return options
}

/** Map a case id to its raw-input directory (N02 only for now; the layout is the boundary). */
function rawDirFor(caseId) {
  const dirs = {
    'n02-units-mixed': join(FITPLATE_ROOT, 'evaluation', 'inputs', 'N02'),
  }
  const dir = dirs[caseId]
  if (!dir) throw new Refusal(3, `case ${caseId} has no raw-unit input; only ${Object.keys(dirs).join(', ')} do`)
  return dir
}

/** The template file name the raw document declares: a bare file name under the raw dir, nothing else. */
function templateNameFor(raw) {
  const name = raw.task_template ?? 'task.template.json'
  if (typeof name !== 'string' || !name || name !== basename(name) || name.includes('..')) {
    throw new Refusal(3, `raw-fields.json: task_template must be a bare file name under the raw dir, got ${JSON.stringify(name)}`)
  }
  return name
}

export async function normalizeCase(caseId) {
  const rawDir = rawDirFor(caseId)
  const rawBytes = await readFile(join(rawDir, 'raw-fields.json')).catch(() => {
    throw new Refusal(3, `raw-fields.json not found under ${rawDir}`)
  })
  const raw = JSON.parse(rawBytes.toString('utf8'))
  const taskPath = join(FITPLATE_ROOT, 'evaluation', 'input-cases', caseId, 'task.json')
  const taskBytes = await readFile(taskPath).catch(() => {
    throw new Refusal(3, `frozen case input not found: ${taskPath}`)
  })
  const task = JSON.parse(taskBytes.toString('utf8'))
  const { conversions, checks } = normalizeFields(raw, join(FITPLATE_ROOT, 'evaluation', 'input-cases'))
  verifyAgainstTask(conversions, task)

  // The applied form: template (source values) -> standardized TaskSpec, which must equal the
  // frozen case input. A case without a template is verified against its frozen task only.
  let standardization = null
  let standardizedTask = null
  if (raw.task_template !== undefined || (await stat(join(rawDir, templateNameFor(raw))).then(() => true).catch(() => false))) {
    const templatePath = join(rawDir, templateNameFor(raw))
    const templateBytes = await readFile(templatePath).catch(() => {
      throw new Refusal(3, `task template not found: ${templatePath}`)
    })
    const templateDoc = JSON.parse(templateBytes.toString('utf8'))
    const result = applyTaskConversions({ raw, template: templateDoc })
    if (result.status === 'NEEDS_INPUT') {
      throw new Refusal(5, `NEEDS_INPUT: standardization stopped, missing values for ${result.missing.join(', ')} (never guessed)`)
    }
    const agrees = deepEqual(result.task, task)
    standardization = {
      task_template: { path: join('evaluation', 'inputs', 'N02', templateNameFor(raw)), sha256: sha256(templateBytes) },
      applied: result.applied,
      equals_frozen_task: agrees,
      difference: agrees ? null : firstDifference(result.task, task),
    }
    if (!agrees) {
      throw new Refusal(3, `standardized task does not equal the frozen case input: ${standardization.difference}`)
    }
    standardizedTask = result.task
  }

  const record = {
    schema_version: '1.0',
    kind: 'fitplate-unit-normalization-record',
    case_id: caseId,
    created_at: new Date().toISOString(),
    converted_by: 'scripts/normalize-input.mjs',
    source_files: {
      raw_fields: { path: join('evaluation', 'inputs', 'N02', 'raw-fields.json'), sha256: sha256(rawBytes) },
      frozen_task: { path: join('evaluation', 'input-cases', caseId, 'task.json'), sha256: sha256(taskBytes) },
    },
    rule: 'only fields explicitly marked with {value, unit} are converted, with a fixed unit table; angles/indices/hashes are never scaled; the conversion is applied to the task template (existing fields only) and the result must equal the frozen mm contract',
    conversions,
    checked_mm: checks,
    standardization,
    target_unit: 'mm',
    frozen_contract_units: task.units,
  }
  return { rawDir, record, frozenTask: task, standardizedTask }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const { rawDir, record, standardizedTask } = await normalizeCase(options.caseId)
  if (options.write) {
    const out = join(rawDir, 'conversion-record.json')
    await writeFile(out, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
    process.stdout.write(`✓ conversion record written: ${out}\n`)
  }
  if (options.emitTask) {
    if (!standardizedTask) {
      throw new Refusal(3, `case ${options.caseId} has no task template to apply; nothing to emit`)
    }
    await writeFile(options.emitTask, `${JSON.stringify(standardizedTask, null, 2)}\n`, 'utf8')
    process.stdout.write(`✓ standardized TaskSpec written: ${options.emitTask}\n`)
  }
  if (options.checkTask) {
    const standardization = record.standardization
    if (!standardization) throw new Refusal(3, `case ${options.caseId} has no task template to apply; nothing to check`)
    const rows = standardization.applied.map((row) =>
      row.converted === false
        ? `${row.path}: ${JSON.stringify(row.value)} mm (checked, not scaled)`
        : `${row.path}: ${JSON.stringify(row.source_value)} ${row.unit} -> ${JSON.stringify(row.target_value_mm)} mm (x${row.factor})`,
    )
    process.stdout.write(
      `✓ applied conversions to ${standardization.task_template.path} (${rows.join('; ')}) — result equals the frozen task.json (semantic JSON equality)\n`,
    )
  }
  if (options.json) process.stdout.write(`${JSON.stringify(record, null, 2)}\n`)
  else {
    for (const row of record.conversions) {
      process.stdout.write(
        `  ${row.path}: ${JSON.stringify(row.source_value)} ${row.unit} -> ${JSON.stringify(row.target_value_mm)} mm (x${row.factor})${row.agrees_with_frozen_task ? ' ✓ frozen task agrees' : ''}\n`,
      )
    }
    for (const row of record.checked_mm) {
      process.stdout.write(`  ${row.path}: checked, not converted (${row.reason ?? 'already mm'})\n`)
    }
  }
  return 0
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().then(
    (code) => {
      process.exitCode = code ?? 0
    },
    (error) => {
      if (error instanceof Refusal) {
        process.stderr.write(`✗ ${error.message}\n`)
        process.exitCode = error.exitCode
      } else {
        process.stderr.write(`✗ unexpected: ${error?.message ?? error}\n`)
        process.exitCode = 1
      }
    },
  )
}
