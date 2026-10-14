// Prepare a demo workspace for a live AGH session (T06/T07 input boundary).
//
// Copies the *task inputs only* of one or more teaching fixtures into
//   demo-workspaces/<id>/input/tasks/<task_id>/{task.json, <task_id>.scene.json, initial-design.json}
// which is exactly what `fitplate_load_task` looks for (Config `tasksDir: "input/tasks"`), and
// copies the generic method skill into `.agh/skills/fitplate-design/SKILL.md`.
//
// Unit standardization (T11 wiring): a task whose inputs are unit-marked is *applied* through the
// 012 converter (`scripts/normalize-input.mjs` -> `normalizeCase`, whose restricted
// `applyTaskConversions` never guesses magnitudes) and the resulting mm TaskSpec must equal the
// frozen case input; the standardized contract is what lands in the workspace. The conversion
// record itself stays in the project (`evaluation/inputs/<CASE>/conversion-record.json`) and is
// only *referenced* - path + sha256 - by `prepare-audit.json`, never copied into the model's
// workspace, so a model only ever sees the standardized mm contract.
//
// What is deliberately NOT copied:
//   * Plan1 / docs / prompts - the design write-up is not session input;
//   * tests/ - the reference layouts and expected values live there and must
//     never reach a model or a run workspace;
//   * evaluation/expected - same rule, enforced here rather than promised.
//
// Usage:
//   node scripts/prepare-workspace.mjs --task sensor-swap-01 [--task ...] [--id demo-01] [--force] [--revision N]
//   node scripts/prepare-workspace.mjs --list
// Exit codes: 0 ok · 2 usage · 3 refused (unsafe id, fixture missing, target exists without --force)
//
// A task id may also be a *registered user task* (`user-<request-id>` published by the intake
// flow). Registered tasks are never resolved from an arbitrary directory: the fixed search rule
// is `<project>/runs/sessions/<name>/input/intake-registry` and
// `<project>/demo-workspaces/<name>/input/intake-registry`, and when more than one registry
// contains the id the script refuses as ambiguous. The exact revision is read (and every hash
// re-verified) through `scripts/intake-read-revision.py` -> `fitplate.intake.read_task_bundle`.
// `--revision` selects a published revision for a registered task (default: latest).

import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { normalizeCase } from './normalize-input.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
export const FITPLATE_ROOT = resolve(HERE, '..')
export const FIXTURES_DIR = join(FITPLATE_ROOT, 'fixtures', 'dev')
export const CASES_DIR = join(FITPLATE_ROOT, 'evaluation', 'input-cases')
export const WORKSPACES_DIR = join(FITPLATE_ROOT, 'demo-workspaces')
export const SKILL_SOURCE = join(FITPLATE_ROOT, '.agh', 'skills', 'fitplate-design', 'SKILL.md')
export const VENV_PYTHON = join(FITPLATE_ROOT, '.venv', 'bin', 'python')
export const INTAKE_READER = join(FITPLATE_ROOT, 'scripts', 'intake-read-revision.py')
/** Fixed registry search roots (project-owned only); never a caller-supplied path. */
export const REGISTRY_SEARCH_ROOTS = Object.freeze([join(FITPLATE_ROOT, 'runs', 'sessions'), WORKSPACES_DIR])
const execFileAsync = promisify(execFile)

/** The registries (fixed rule) that contain `taskId`; an ambiguous id is refused, never guessed. */
export async function findRegisteredRegistries(taskId, roots = REGISTRY_SEARCH_ROOTS) {
  const hits = []
  for (const base of roots) {
    let entries = []
    try {
      entries = await readdir(base, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (!entry.isDirectory()) continue
      const registry = join(base, entry.name, 'input', 'intake-registry')
      try {
        const index = JSON.parse(await readFile(join(registry, 'index.json'), 'utf8'))
        if (index?.kind === 'fitplate-intake-registry' && index.tasks?.[taskId]) {
          hits.push({ registry, source: `${entry.name}/input/intake-registry` })
        }
      } catch {
        // No registry there (or an unreadable one): skip; a *selected* registry is verified by the reader.
      }
    }
  }
  return hits
}

/** Read one registered revision through the intake core's own verification (python helper). */
async function readRegisteredRevision(registryRoot, taskId, revision) {
  const args = [INTAKE_READER, registryRoot, taskId]
  if (revision !== undefined) args.push(String(revision))
  let stdout
  try {
    ;({ stdout } = await execFileAsync(VENV_PYTHON, args, { env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } }))
  } catch (error) {
    let detail = error?.stdout ?? ''
    try {
      detail = JSON.parse(String(error?.stdout ?? '')).message ?? detail
    } catch {
      /* keep the raw text */
    }
    throw new UsageError(3, `registered task read failed: ${detail || error.message}`)
  }
  const info = JSON.parse(stdout)
  if (!info?.ok || typeof info.directory !== 'string') throw new UsageError(3, 'registered task read returned no verified revision')
  return info
}

export const TASK_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/
export const WORKSPACE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/

const INPUT_FILES = (taskId) => [`task.json`, `${taskId}.scene.json`, `initial-design.json`]

/** Case ids whose inputs carry explicit unit marks (the 012 converter's boundary). */
const RAW_UNIT_CASES = Object.freeze({ 'n02-units-mixed': 'N02' })

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

class UsageError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'UsageError'
    this.code = code
  }
}

export async function listFixtures() {
  const entries = await readdir(FIXTURES_DIR, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory() && TASK_ID_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort()
}

/** Where a task's inputs come from: the dev fixture, or the evaluation case set. */
async function taskSourceDir(taskId) {
  for (const candidate of [join(FIXTURES_DIR, taskId), join(CASES_DIR, taskId)]) {
    const info = await stat(candidate).catch(() => undefined)
    if (info?.isFile()) return undefined
    if (info?.isDirectory()) return candidate
  }
  return undefined
}

/**
 * Copy one task's inputs into `<workspaceRoot>/input/tasks/<taskId>/`.
 *
 * Returns `{ copied, standardization }`. When the task is a unit-marked case (T11), the frozen
 * mm contract is *produced* by the 012 converter and verified against the frozen case input; the
 * conversion record stays where it is and is referenced (path + sha256) in the audit only.
 * Never writes outside the workspace.
 */
export async function copyTaskInputs({ taskId, workspaceRoot, force = false, revision = undefined, registryRoots = REGISTRY_SEARCH_ROOTS }) {
  if (!TASK_ID_PATTERN.test(taskId)) throw new UsageError(2, `unsafe task id: ${JSON.stringify(taskId)}`)
  const targetDir = join(workspaceRoot, 'input', 'tasks', taskId)
  const sourceDir = await taskSourceDir(taskId)
  if (!sourceDir) {
    // Not a fixture/evaluation case: it may be a registered user task. Fixed registry rule only.
    const registries = await findRegisteredRegistries(taskId, registryRoots)
    if (registries.length === 0) throw new UsageError(3, `no fixture, evaluation case or registered task named ${taskId}`)
    if (registries.length > 1) {
      throw new UsageError(3, `task ${taskId} exists in ${registries.length} registries (${registries.map((hit) => hit.source).join(', ')}); refusing to guess`)
    }
    const registered = await readRegisteredRevision(registries[0].registry, taskId, revision)
    if (!force) {
      try {
        await stat(targetDir)
        throw new UsageError(3, `target ${targetDir} already exists; pass --force to replace the copied inputs`)
      } catch (error) {
        if (error instanceof UsageError) throw error
      }
    }
    await mkdir(targetDir, { recursive: true })
    const copied = []
    await cp(join(registered.directory, 'task.json'), join(targetDir, 'task.json'), { force: true })
    copied.push('task.json')
    await cp(join(registered.directory, registered.scene_ref), join(targetDir, registered.scene_ref), { force: true })
    copied.push(registered.scene_ref)
    if (registered.design_file) {
      await cp(join(registered.directory, registered.design_file), join(targetDir, 'initial-design.json'), { force: true })
      copied.push('initial-design.json')
    }
    const registry = {
      source: registries[0].source,
      task_id: registered.task_id,
      revision: registered.revision,
      is_latest: registered.is_latest === true,
      manifest_id: registered.manifest_id ?? null,
      directory: registered.directory,
    }
    await writeFile(join(targetDir, 'registry-source.json'), `${JSON.stringify(registry, null, 2)}\n`, 'utf8')
    return { copied, standardization: null, registry }
  }
  if (revision !== undefined) {
    const frozen = JSON.parse(await readFile(join(sourceDir, 'task.json'), 'utf8'))
    if (Number(frozen.revision) !== Number(revision)) {
      throw new UsageError(3, `--revision ${revision} only selects registered-task revisions; fixture ${taskId} is at revision ${frozen.revision}`)
    }
  }
  if (!force) {
    try {
      await stat(targetDir)
      throw new UsageError(3, `target ${targetDir} already exists; pass --force to replace the copied inputs`)
    } catch (error) {
      if (error instanceof UsageError) throw error
      // ENOENT: the target does not exist yet, which is what we want.
    }
  }
  await mkdir(targetDir, { recursive: true })
  const copied = []
  for (const name of INPUT_FILES(taskId)) {
    const source = join(sourceDir, name)
    const info = await stat(source).catch(() => undefined)
    if (!info?.isFile()) {
      // initial-design.json is teaching material; the frozen contract and its scene are the
      // inputs a run needs. A fixture that ships the initial design must still ship all of it.
      if (name === 'initial-design.json' && sourceDir === join(CASES_DIR, taskId)) continue
      throw new UsageError(3, `${taskId} is missing ${name}`)
    }
    await cp(source, join(targetDir, name), { force: true })
    copied.push(name)
  }
  // The task must reference the scene it ships with; a fixture that fails this
  // check would fail `fitplate_load_task` later, so the script refuses now.
  const task = JSON.parse(await readFile(join(targetDir, 'task.json'), 'utf8'))
  if (task.scene_ref !== `${taskId}.scene.json`) {
    throw new UsageError(3, `task ${taskId} pins scene ${task.scene_ref}, but the workspace ships ${taskId}.scene.json`)
  }

  // Unit standardization: apply the explicit {value, unit} conversions to the template through
  // the 012 converter and require the result to equal the frozen mm contract. A missing value is
  // NEEDS_INPUT and stops preparation (`never guessed`); a mismatch is a refusal, not a rewrite.
  let standardization = null
  if (RAW_UNIT_CASES[taskId]) {
    let normalized
    try {
      normalized = await normalizeCase(taskId)
    } catch (error) {
      throw new UsageError(error?.code === 5 ? 3 : error?.code ?? 3, `unit standardization refused ${taskId}: ${error?.message ?? error}`)
    }
    if (!normalized.standardizedTask) {
      throw new UsageError(3, `unit standardization for ${taskId} produced no standardized task`)
    }
    await writeFile(join(targetDir, 'task.json'), `${JSON.stringify(normalized.standardizedTask, null, 2)}\n`, 'utf8')
    const recordPath = join('evaluation', 'inputs', RAW_UNIT_CASES[taskId], 'conversion-record.json')
    standardization = {
      converter: 'scripts/normalize-input.mjs',
      applied: normalized.record.standardization?.applied ?? normalized.record.conversions ?? [],
      equals_frozen_task: normalized.record.standardization?.equals_frozen_task === true,
      // The record file itself is project material, not session input: reference it, never copy it.
      record: {
        path: recordPath,
        sha256: sha256(await readFile(join(FITPLATE_ROOT, recordPath))),
      },
    }
  }
  return { copied, standardization }
}

/** Copy the generic method skill into the workspace (`<workspaceRoot>/.agh/skills/...`). */
export async function copyMethodSkill({ workspaceRoot }) {
  const targetDir = join(workspaceRoot, '.agh', 'skills', 'fitplate-design')
  const info = await stat(SKILL_SOURCE).catch(() => undefined)
  if (!info?.isFile()) throw new UsageError(3, `method skill is missing: ${SKILL_SOURCE}`)
  await mkdir(targetDir, { recursive: true })
  await cp(SKILL_SOURCE, join(targetDir, 'SKILL.md'), { force: true })
  return join('.agh', 'skills', 'fitplate-design', 'SKILL.md')
}

/** Prepare a whole workspace: the frozen task inputs plus the generic method skill, nothing else. */
export async function prepareWorkspace({ id, taskIds, force = false, root = WORKSPACES_DIR, revision = undefined }) {
  if (!WORKSPACE_ID_PATTERN.test(id)) throw new UsageError(2, `unsafe workspace id: ${JSON.stringify(id)}`)
  if (!Array.isArray(taskIds) || taskIds.length === 0) throw new UsageError(2, 'at least one --task is required')
  const workspaceRoot = join(root, id)
  await mkdir(workspaceRoot, { recursive: true })
  const prepared = []
  for (const taskId of taskIds) {
    const { copied, standardization, registry } = await copyTaskInputs({ taskId, workspaceRoot, force, revision })
    prepared.push({ taskId, copied, standardization, ...(registry ? { registry } : {}) })
  }
  const skill = await copyMethodSkill({ workspaceRoot })
  const audit = {
    schema_version: '1.0',
    kind: 'fitplate-prepare-audit',
    prepared_at: new Date().toISOString(),
    prepared_by: 'scripts/prepare-workspace.mjs',
    workspace: id,
    skill,
    tasks: prepared.map((entry) => ({
      task_id: entry.taskId,
      source: (entry.taskId in RAW_UNIT_CASES ? 'evaluation/input-cases' : 'fixtures/dev') + `/${entry.taskId}`,
      files: entry.copied,
      standardization: entry.standardization,
      units: 'mm (the frozen TaskSpec contract; conversions are applied before it lands here)',
    })),
  }
  await writeFile(join(workspaceRoot, 'prepare-audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8')
  await writeFile(
    join(workspaceRoot, 'README.md'),
    [
      '# FitPlate demo workspace',
      '',
      `Prepared by scripts/prepare-workspace.mjs at ${audit.prepared_at}.`,
      '',
      'Contents: `input/tasks/<task_id>/` (frozen task + the scene it pins, standardized to mm) and the',
      'generic method skill `.agh/skills/fitplate-design/SKILL.md`. `prepare-audit.json` records where the',
      'inputs came from and, for unit-marked cases, which conversions were applied - the conversion record',
      'itself stays in the project.',
      '',
      'No Plan text, no tests, no expected results and no reference layout are copied into a session workspace.',
      '',
      'Runs started by the FitPlate tools appear under `runs/<run_id>/` in this directory.',
      '',
    ].join('\n'),
    'utf8',
  )
  return { workspaceRoot, prepared, audit }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const options = { id: undefined, tasks: [], force: false, list: false, revision: undefined }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--task') {
      const value = argv[++i]
      if (!value) throw new UsageError(2, '--task needs a task id')
      options.tasks.push(value)
    } else if (arg === '--id') {
      const value = argv[++i]
      if (!value) throw new UsageError(2, '--id needs a workspace id')
      options.id = value
    } else if (arg === '--force') {
      options.force = true
    } else if (arg === '--revision') {
      const value = argv[++i]
      if (!value || !/^[0-9]{1,4}$/.test(value)) throw new UsageError(2, '--revision needs a positive integer')
      options.revision = Number(value)
    } else if (arg === '--list') {
      options.list = true
    } else {
      throw new UsageError(2, `unknown argument ${arg}`)
    }
  }
  return options
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.list) {
    const fixtures = await listFixtures()
    process.stdout.write(`fixtures/dev: ${fixtures.join(', ')}\n`)
    return 0
  }
  const id = options.id ?? `demo-${Date.now().toString(36)}`
  const { workspaceRoot, prepared } = await prepareWorkspace({ id, taskIds: options.tasks, force: options.force, revision: options.revision })
  process.stdout.write(`workspace: ${workspaceRoot}\n`)
  for (const entry of prepared) {
    process.stdout.write(`  input/tasks/${entry.taskId}: ${entry.copied.join(', ')}\n`)
    if (entry.registry) {
      process.stdout.write(
        `    注册任务：${entry.registry.task_id}@r${entry.registry.revision}（is_latest=${entry.registry.is_latest}，manifest=${entry.registry.manifest_id}，` +
          `来源 ${entry.registry.source}；哈希由 intake 内核逐项复核）\n`,
      )
    }
    if (entry.standardization) {
      process.stdout.write(
        `    单位标准化：applied=${entry.standardization.applied.length}，equals_frozen_task=${entry.standardization.equals_frozen_task}，` +
          `record=${entry.standardization.record.path}（仅引用，不复制）\n`,
      )
    }
  }
  process.stdout.write('  .agh/skills/fitplate-design/SKILL.md（通用方法 skill）\n')
  return 0
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().then(
    (code) => {
      process.exitCode = code ?? 0
    },
    (error) => {
      if (error instanceof UsageError) {
        process.stderr.write(`✗ ${error.message}\n`)
        process.exitCode = error.code
      } else {
        process.stderr.write(`✗ unexpected: ${error?.message ?? error}\n`)
        process.exitCode = 1
      }
    },
  )
}
