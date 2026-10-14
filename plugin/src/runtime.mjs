// FitPlate AGH plugin entry: `runtime` (see package.json `agnes.plugins`).
//
// A plain Cordis object plugin. On apply it registers
//
//   * the five CAD tools (fitplate_load_task / _build_candidate /
//     _validate_candidate / _get_run / _export_package) and the three intake
//     tools (fitplate_get_request / _propose_constraints / _commit_task)
//     through the row's `ctx.extension()` API, and
//   * the read-only query services (fitplate.run / fitplate.scene /
//     fitplate.artifact / fitplate.intake) through `ctx.services.register`.
//
// Configuration is validated here (Standard Schema) before anything is
// registered: the geometry root and the project `.venv` interpreter are
// *absolute paths supplied by the local Config*, never by a model argument.
// They are re-checked by the bridge on every call, so a bad path is a refused
// call, not a silently wrong artefact.
//
// The bridge itself is *not* configurable: it is the `python_bridge.py` that
// ships next to this module (``import.meta.url``). Under an installed package
// snapshot that is the snapshot's own copy, so editing the project source tree
// cannot change what an installed row executes; when the source is imported
// directly (unit tests, dev), it is naturally the source copy. An optional
// legacy ``bridgePath`` may still be passed by old configs, but it is only
// accepted when it resolves to that same file - it can never redirect
// execution to arbitrary mutable code, and the Python side re-checks the
// identity again (``config.bridge_path`` must equal ``__file__``).

import { createHash } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import { isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildIntakeTools } from './intake-tools.mjs'
import { buildServices } from './services.mjs'
import { buildTools } from './tools.mjs'
import { registerProductPolicy } from './product-policy.mjs'

/** The bridge file the row executes: the one next to this module. */
export const BRIDGE_FILE = 'python_bridge.py'

/** Absolute path of the bridge that ships with (and is executed by) this runtime. */
export function bridgePathFrom(moduleUrl = import.meta.url) {
  return fileURLToPath(new URL(`./${BRIDGE_FILE}`, moduleUrl))
}

/** The actual bridge identity: its resolved path, byte size and SHA-256. */
export function bridgeIdentity(moduleUrl = import.meta.url) {
  const path = bridgePathFrom(moduleUrl)
  const bytes = readFileSync(path)
  return { path, bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') }
}

const sameFile = (left, right) => {
  try {
    return realpathSync(left) === realpathSync(right)
  } catch {
    return false
  }
}

const DEFAULTS = {
  runsDir: 'runs',
  tasksDir: 'input/tasks',
  commandTimeoutMs: 30_000,
  taskTimeoutMs: 180_000,
  maxCandidates: 4,
}

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

/** A relative, single-purpose directory name inside the workspace (`a` or `a/b`). */
function isSafeRelativeDir(value) {
  if (typeof value !== 'string' || !value) return false
  if (isAbsolute(value) || value.includes('\\') || value.includes('\0')) return false
  return value.split('/').every((segment) => /^[A-Za-z0-9._-]{1,64}$/.test(segment) && segment !== '.' && segment !== '..')
}

function absolutePathField(value, field, issues) {
  if (typeof value !== 'string' || !value) {
    issues.push({ message: `${field} must be an absolute path`, path: [field] })
    return undefined
  }
  if (!isAbsolute(value) || value.includes('\0')) {
    issues.push({ message: `${field} must be an absolute path without NUL bytes`, path: [field] })
    return undefined
  }
  return value
}

const Config = {
  '~standard': {
    version: 1,
    vendor: 'fitplate',
    validate(value) {
      const input = value === undefined ? {} : value
      if (!isPlainObject(input)) {
        return { issues: [{ message: 'fitplate plugin config must be an object', path: [] }] }
      }
      const issues = []
      const known = new Set([
        'geometryRoot',
        'pythonPath',
        'bridgePath',
        'runsDir',
        'tasksDir',
        'budget',
      ])
      for (const key of Object.keys(input)) {
        if (!known.has(key)) issues.push({ message: `unknown config key ${key}`, path: [key] })
      }
      const resolved = {
        geometryRoot: absolutePathField(input.geometryRoot, 'geometryRoot', issues),
        pythonPath: absolutePathField(input.pythonPath, 'pythonPath', issues),
        bridgePath: bridgePathFrom(),
        runsDir: input.runsDir ?? DEFAULTS.runsDir,
        tasksDir: input.tasksDir ?? DEFAULTS.tasksDir,
      }
      // Legacy compatibility only: an old config may still name the bridge it
      // believes in, but that name may not redirect execution anywhere - it is
      // accepted only when it *is* the bridge that ships with this runtime.
      if (input.bridgePath !== undefined) {
        const legacy = absolutePathField(input.bridgePath, 'bridgePath', issues)
        if (legacy !== undefined && !sameFile(legacy, resolved.bridgePath)) {
          issues.push({
            message:
              'bridgePath must be the python_bridge.py that ships next to the runtime; ' +
              'the executed bridge is derived from the module location and cannot be redirected',
            path: ['bridgePath'],
          })
        }
      }
      for (const field of ['runsDir', 'tasksDir']) {
        if (!isSafeRelativeDir(resolved[field])) {
          issues.push({ message: `${field} must be an in-workspace relative path`, path: [field] })
        }
      }

      const budget = input.budget ?? {}
      if (!isPlainObject(budget)) {
        issues.push({ message: 'budget must be an object', path: ['budget'] })
      }
      const budgetKnown = new Set(['commandTimeoutMs', 'taskTimeoutMs', 'maxCandidates'])
      for (const key of Object.keys(budget)) {
        if (!budgetKnown.has(key)) issues.push({ message: `unknown budget key ${key}`, path: ['budget', key] })
      }
      const number = (value, field, { min, max, fallback }) => {
        if (value === undefined) return fallback
        if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
          issues.push({ message: `${field} must be an integer between ${min} and ${max}`, path: ['budget', field] })
          return fallback
        }
        return value
      }
      const resolvedBudget = {
        commandTimeoutMs: number(budget.commandTimeoutMs, 'commandTimeoutMs', {
          min: 1000,
          max: 300_000,
          fallback: DEFAULTS.commandTimeoutMs,
        }),
        taskTimeoutMs: number(budget.taskTimeoutMs, 'taskTimeoutMs', {
          min: 1000,
          max: 3_600_000,
          fallback: DEFAULTS.taskTimeoutMs,
        }),
        maxCandidates: number(budget.maxCandidates, 'maxCandidates', { min: 1, max: 16, fallback: DEFAULTS.maxCandidates }),
      }

      if (issues.length) return { issues }
      return {
        value: Object.freeze({
          geometryRoot: resolved.geometryRoot,
          pythonPath: resolved.pythonPath,
          bridgePath: resolved.bridgePath,
          runsDir: resolved.runsDir,
          tasksDir: resolved.tasksDir,
          budget: Object.freeze(resolvedBudget),
        }),
      }
    },
  },
}

/** The struct the Python bridge validates again before it touches the run store. */
const bridgeConfig = (config) =>
  Object.freeze({
    geometry_root: config.geometryRoot,
    python_path: config.pythonPath,
    bridge_path: config.bridgePath,
    runs_dir: config.runsDir,
    tasks_dir: config.tasksDir,
    budget: Object.freeze({
      command_timeout_ms: config.budget.commandTimeoutMs,
      task_timeout_ms: config.budget.taskTimeoutMs,
      max_candidates: config.budget.maxCandidates,
    }),
  })

export function resolveConfig(config) {
  const checked = Config['~standard'].validate(config)
  if (checked.issues) {
    throw new TypeError(`fitplate plugin config is invalid: ${checked.issues.map((issue) => issue.message).join('; ')}`)
  }
  const value = checked.value
  return Object.freeze({
    ...value,
    bridgeConfig: () => bridgeConfig(value),
    bridgeIdentity: () => bridgeIdentity(),
  })
}

export const runtime = {
  // Declared on the export *and* in package.json `agnes.plugins[0].inject`:
  // the daemon builds the row from static metadata and re-checks that the two
  // agree at mount (a mismatch is E_ROW_METADATA and the row never activates).
  inject: ['extension'],
  Config,
  apply(ctx, config) {
    const resolved = resolveConfig(config)
    const agnes = ctx.extension()
    // The row's own logger. `ctx.log` is a Cordis service that would need its
    // own `inject`; the extension API hands out the row-scoped logger instead.
    const log = agnes.ctx.log

    // P02-05: the three intake tools (get_request / propose_constraints / commit_task). Their
    // attachments come from the Host session reader; their bridge subcommands are implemented by
    // the same python_bridge.py this row executes (intake_compile_request / _stage_request /
    // _commit_task), with the registry fixed at <workspace>/input/intake-registry.
    const productTools = [...buildTools({ config: resolved, log }), ...buildIntakeTools({ config: resolved, log })]
    for (const tool of productTools) {
      agnes.registerTool(tool)
    }
    registerProductPolicy(agnes, productTools.map((tool) => tool.name))
    for (const service of buildServices({ config: resolved, log })) {
      ctx.services.register(service)
    }
    // P02-04 projection route: REMOVED from the product row. The real Agnes probe (2026-10-08,
    // log plan02/probes/2026-10-08T04-15-03-480Z) showed the host registering the projection but
    // every plugin-row TOOL readOwn answering `unavailable` (E_CAPABILITY_UNDECLARED), so this
    // route cannot carry user input in the current host build. The projection module and its
    // probe packages remain as independent research (plugin/src/input-projection.mjs,
    // probe-plugin/); the product registers the five CAD tools plus the three session-attachment
    // intake tools (P02-05), and the read-only services including fitplate.intake.
    // Log the bridge that will actually run - path and content hash - so an
    // operator can tell an installed snapshot copy from a source checkout
    // without inspecting the snapshot internals.
    let bridge = { path: resolved.bridgePath, sha256: 'unavailable', bytes: 0 }
    try {
      bridge = resolved.bridgeIdentity()
    } catch (error) {
      log?.warn?.(`fitplate: the bridge identity could not be read: ${error?.message ?? error}`)
    }
    log?.info?.(
      `fitplate plugin ready (geometry=${resolved.geometryRoot}, bridge=${bridge.path} sha256=${bridge.sha256.slice(0, 16)}..., ` +
        `budget=${resolved.budget.taskTimeoutMs}ms task / ${resolved.budget.commandTimeoutMs}ms command)`,
    )
  },
}

export default runtime
