// Shared helpers for the FitPlate T01/GATE-A AGH scripts.
//
// Rules this file exists to uphold:
// - Only public AGH entry points are imported (`@agnes/sdk` -> packages/sdk/.../index.node.js,
//   `@agnes/daemon` -> packages/daemon/.../index.js, both resolved through the package export
//   maps of the local AGH checkout). No private modules, no hand-written configuration.json.
// - The isolated AGH_HOME/profile/workspace are explicit; HOME and CODEX_HOME are never touched.
// - Scripts run under the AGH checkout's own tsx (no installs): the built dist entries still pull
//   workspace TS sources, which plain node cannot execute.
import { realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const FITPLATE_ROOT = resolve(HERE, '..', '..')

export const DEFAULT_AGH_HOME = join(FITPLATE_ROOT, '.agh-home')
export const DEFAULT_AGH_SOURCE_ROOT = '/home/Heliora/ANG/agnes-harness'
export const DEFAULT_PROFILE = 'local-dev'
// AGNES_WEB_ORIGIN is instance-scoped: a non-default origin keeps the isolated daemon's Web
// listener away from any Origin the developer's daily instance may be using.
export const DEFAULT_WEB_ORIGIN = 'http://127.0.0.1:4387'

/**
 * Named instance scopes, selected with `FITPLATE_SCOPE`. Every script derives its daemon home,
 * profile, workspace and web origin from exactly one scope, so two scopes can never share a
 * daemon, a web listener, an installed package snapshot or a session store:
 *
 *   dev         - the existing DS development scope (.agh-home / local-dev / :4387), unchanged;
 *   competition - the Plan02 competition scope (.agh-home-competition / :4388), configured with
 *                 the official Agnes provider and never carrying a third-party model fallback.
 *                 Individual AGH_HOME / AGNES_PROFILE / AGNES_WEB_ORIGIN env vars still override
 *                 each field for one-off diagnostics.
 *
 * Profile naming: this AGH build only resolves *builtin* profile templates — a profile name
 * outside `TEMPLATE_NAMES = ['local-dev', 'enterprise']` fails at boot with
 * `E_DEP_MISSING: no builtin template <name>` (packages/host/src/profile/templates.ts:139,
 * always loaded by collectLayers in profile/resolve.ts:319). The competition scope therefore
 * reuses the reviewed `local-dev` template inside its *own private home*; the isolation that
 * matters (secret store, sessions, packages, daemon socket, web state) comes from the home and
 * the origin, which never overlap with dev.
 */
export const SCOPES = Object.freeze({
  dev: Object.freeze({ home: DEFAULT_AGH_HOME, profile: DEFAULT_PROFILE, origin: DEFAULT_WEB_ORIGIN }),
  competition: Object.freeze({
    home: join(FITPLATE_ROOT, '.agh-home-competition'),
    profile: DEFAULT_PROFILE,
    origin: 'http://127.0.0.1:4388',
  }),
})

/** The active scope row (name + defaults). An unknown FITPLATE_SCOPE is a usage error, never a silent fallback. */
export function activeScope() {
  const name = process.env.FITPLATE_SCOPE ?? 'dev'
  const scope = SCOPES[name]
  if (!scope) fail(EXIT.USAGE, `未知 FITPLATE_SCOPE=${name}（可用：${Object.keys(SCOPES).join(', ')}）`)
  return { name, ...scope }
}

export const EXIT = Object.freeze({
  OK: 0,
  FAILURE: 1,
  USAGE: 2,
  PRECONDITION: 3,
  REFUSED: 4,
})

export class ScriptError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ScriptError'
    this.code = code
  }
}

export const fail = (code, message) => {
  throw new ScriptError(code, message)
}

/** Canonical path for identity checks: symlinks and `..` are resolved when the path exists. */
const canonicalPath = (path) => {
  const resolved = resolve(path)
  try {
    return realpathSync(resolved)
  } catch {
    return resolved
  }
}
const insideOrEquals = (child, parent) => child === parent || child.startsWith(parent.endsWith(sep) ? parent : `${parent}${sep}`)

/**
 * The competition scope must never operate on a home it does not own, whatever single-field env
 * override produced it (AGH_HOME=.../..-style traversal and symlink aliases included), and must
 * never bind a second web listener on the development origin. Explicit *independent* paths (own
 * home, own origin) stay allowed - that is how one-off diagnostics work.
 */
function assertCompetitionBoundaries(cfg) {
  if (cfg.scope !== 'competition') return
  const home = canonicalPath(cfg.aghHome)
  const foreign = [
    { label: '开发 scope home', path: canonicalPath(DEFAULT_AGH_HOME) },
    { label: '日常实例 home', path: canonicalPath(join(homedir(), '.agh')) },
  ]
  for (const row of foreign) {
    if (insideOrEquals(home, row.path)) {
      fail(EXIT.REFUSED, `竞争 scope 的 AGH_HOME（${home}）与${row.label}（${row.path}）重合或位于其内；拒绝在非隔离 home 上操作`)
    }
  }
  if (cfg.webOrigin === DEFAULT_WEB_ORIGIN) {
    fail(EXIT.REFUSED, `竞争 scope 不能使用开发 origin ${DEFAULT_WEB_ORIGIN}；拒绝（两个实例的页面/会话必须分开）`)
  }
}

/** Resolved, non-secret runtime inputs. The scope supplies defaults; explicit env still wins. */
export function config() {
  const scope = activeScope()
  const resolved = {
    scope: scope.name,
    aghSourceRoot: process.env.AGH_SOURCE_ROOT ?? DEFAULT_AGH_SOURCE_ROOT,
    aghHome: process.env.AGH_HOME ?? scope.home,
    profile: process.env.AGNES_PROFILE ?? scope.profile,
    workspace: FITPLATE_ROOT,
    webOrigin: process.env.AGNES_WEB_ORIGIN ?? scope.origin,
  }
  assertCompetitionBoundaries(resolved)
  return resolved
}

/** Environment for child CLI processes: explicit isolated scope, nothing else rewritten. */
export function childEnv() {
  const cfg = config()
  return {
    ...process.env,
    AGH_HOME: cfg.aghHome,
    AGNES_PROFILE: cfg.profile,
    AGNES_WEB_ORIGIN: cfg.webOrigin,
    // This host reaches api.deepseek.com only through the proxy already present in HTTP(S)_PROXY;
    // Node's global fetch ignores those variables unless told to use them. Scoped to this
    // instance's processes only — no shell/proxy/global configuration is touched.
    NODE_USE_ENV_PROXY: process.env.NODE_USE_ENV_PROXY ?? '1',
  }
}

export function agnesEntry() {
  return join(config().aghSourceRoot, 'packages', 'cli', 'dist', 'local', 'agnes.mjs')
}

/**
 * The AGH home root must be a private 0700 directory: the credential store validates the exact
 * mode of every directory it writes through, including the root (mode 0755 here once made
 * config.save fail with CONFIG_CREDENTIAL_STORE). Creates it if missing, tightens it if not.
 */
export async function ensurePrivateHome() {
  const { chmod, mkdir, stat } = await import('node:fs/promises')
  const home = config().aghHome
  await mkdir(home, { recursive: true, mode: 0o700 })
  const info = await stat(home)
  if ((info.mode & 0o7777) !== 0o700) await chmod(home, 0o700)
}

export async function loadPublic(relativeEntry) {
  const target = join(config().aghSourceRoot, relativeEntry)
  return import(pathToFileURL(target).href)
}

export async function loadSdk() {
  return loadPublic(join('packages', 'sdk', 'dist', 'src', 'index.node.js'))
}

export async function loadDaemonLib() {
  return loadPublic(join('packages', 'daemon', 'dist', 'src', 'index.js'))
}

/** The compiled public Web bundle the CLI ships: the static root the workbench is served from. */
export function webAssetsRoot() {
  return join(config().aghSourceRoot, 'packages', 'cli', 'dist', 'local', 'web')
}

/** The public loopback static-server runtime (`@agnes/web-server/createWebServer`). */
export async function loadWebServer() {
  return loadPublic(join('packages', 'web-server', 'src', 'index.ts'))
}

/**
 * Discover the isolated daemon without connecting a client: scope resolution and the discovery
 * record only. `null` means "not running / not discoverable" - callers turn that into a
 * precondition message instead of a stack.
 */
export async function discoverDaemon() {
  const cfg = config()
  const daemon = await loadDaemonLib()
  const scope = await daemon.resolveDaemonScope({
    env: process.env,
    cwd: cfg.workspace,
    home: cfg.aghHome,
    profile: cfg.profile,
    workspace: cfg.workspace,
  })
  let discovery = null
  try {
    discovery = await daemon.readDaemonDiscovery(scope)
  } catch {
    discovery = null
  }
  return { daemon, scope, discovery }
}

/**
 * Connect a Node SDK client to the isolated daemon over its own unix socket, using the same
 * scope resolution and transport the CLI boot path uses. Returns null discovery when the daemon
 * is not running so callers can report a precondition instead of dumping a stack.
 */
export async function openClient() {
  const cfg = config()
  const sdk = await loadSdk()
  const { daemon, scope, discovery } = await discoverDaemon()
  if (!discovery) {
    fail(
      EXIT.PRECONDITION,
      `daemon 未运行或不可发现（home=${cfg.aghHome}，profile=${cfg.profile}）。先运行 scripts/agh/start.mjs。`,
    )
  }
  const client = sdk.createClient({
    transport: { kind: 'unix', path: discovery.socketPath },
    auth: { kind: 'local' },
    journal: sdk.memoryJournal(),
    timeouts: { request: 120_000, initialize: 15_000 },
  })
  await client.initialize()
  return { sdk, daemon, scope, discovery, client }
}

/**
 * The capability ceiling this installation's own profile must grant. It is the builtin local-dev
 * template's default set plus `services`: the FitPlate row registers three surface-callable query
 * services (fitplate.run/scene/artifact), and without the grant the Host refuses the row with
 * E_CEILING_EXCEEDED. Every default that ships with the template is preserved.
 */
export const PROFILE_CAPABILITY_CEILING = Object.freeze([
  'tools',
  'hooks',
  'slots',
  'events',
  'resources',
  'ui',
  'services',
  'network',
  'network.publicRead',
  'tools.invoke',
  'artifacts',
  'subagent',
])

/**
 * Make sure this installation's own profile carries the ceiling above.
 *
 * Only the hand-written *user layer* file (`profiles/<profile>/profile.yaml`) is ever written -
 * never the generated configuration.json, the lock, or anything holding a credential - and an
 * existing file is left byte-for-byte alone (an operator's own ceiling always wins; a missing
 * `services` entry is reported, not patched over). Returns `{ path, created, missingServices }`.
 */
export async function ensureProfileCeiling() {
  const cfg = config()
  const { mkdir, readFile, stat, writeFile } = await import('node:fs/promises')
  const profileDir = join(cfg.aghHome, 'profiles', cfg.profile)
  await mkdir(profileDir, { recursive: true, mode: 0o700 })
  const profilePath = join(profileDir, 'profile.yaml')
  try {
    await stat(profilePath)
  } catch {
    const yaml = [
      `name: ${cfg.profile}`,
      'policy:',
      '  capabilityCeiling:',
      ...PROFILE_CAPABILITY_CEILING.map((capability) => `    - ${capability}`),
      '',
    ].join('\n')
    await writeFile(profilePath, yaml, { mode: 0o600 })
    return { path: profilePath, created: true, missingServices: false }
  }
  let existing = ''
  try {
    existing = await readFile(profilePath, 'utf8')
  } catch {
    existing = ''
  }
  // The official configurator quotes YAML scalars. Inspect the actual policy,
  // not an unquoted-text pattern, and leave the operator's bytes unchanged.
  const { createRequire } = await import('node:module')
  const { parse } = createRequire(join(cfg.aghSourceRoot, 'packages/host/package.json'))('yaml')
  let capabilities
  try { capabilities = parse(existing)?.policy?.capabilityCeiling } catch { capabilities = undefined }
  const missingServices = !Array.isArray(capabilities) || !capabilities.includes('services')
  return { path: profilePath, created: false, missingServices }
}

export async function closeClient(client) {
  await client.close().catch(() => undefined)
}

/** Run a child process with the isolated env; returns { code, stdout, stderr }. */
export async function run(command, args, options = {}) {
  const { spawn } = await import('node:child_process')
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? config().workspace,
      env: options.env ?? childEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new ScriptError(EXIT.FAILURE, `子进程超时（${options.timeoutMs ?? 0}ms）：${command}`))
    }, options.timeoutMs ?? 600_000)
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolvePromise({ code: code ?? -1, stdout, stderr })
    })
  })
}

/** CLI wrapper bound to the isolated instance. */
export async function runAgnes(args, options = {}) {
  return run(process.execPath, [agnesEntry(), ...args], options)
}

/** Thinking tiers, highest first - used to pick the highest tier a model really declares. */
export const THINKING_ORDER = Object.freeze(['max', 'xhigh', 'high', 'medium', 'low', 'minimal'])

/**
 * The thinking tiers an AGH model declaration actually supports, from either declaration map
 * (`thinkingLevelMap` or `thinkingEfforts`; a model with `reasoning: false` and neither map
 * declares none - the caller then omits the parameter instead of guessing one).
 */
export function declaredThinkingLevels(model) {
  const levels = new Set()
  const map = model?.thinkingLevelMap
  if (map && typeof map === 'object') {
    for (const [level, wire] of Object.entries(map)) if (typeof wire === 'string' && wire) levels.add(level)
  }
  const efforts = model?.thinkingEfforts
  if (efforts && typeof efforts === 'object') {
    for (const [level, wire] of Object.entries(efforts)) if (typeof wire === 'string' && wire) levels.add(level)
  }
  return levels
}

/**
 * Extract the single Agnes model key from a key document (e.g. /home/Heliora/ANG/key.md).
 *
 * Value-blind contract: the caller reads the file into memory, passes the text here, and only the
 * returned object may hold the value - it is never logged, hashed, written to disk or echoed in
 * an error. Only a line whose label looks like an API-key/密钥/令牌/token field counts, and only a
 * value shaped like a token (>= 16 chars of [A-Za-z0-9._+/-]) is accepted; anything else returns
 * `found: false` instead of guessing which line is the key (URLs and prose cannot match the shape).
 *
 * Token hygiene: only surrounding markdown quotes/fences are stripped - characters *inside* the
 * token (underscores included) are never rewritten. When several token-shaped candidates exist,
 * Agnes-labelled ones win; a conflict between distinct values is refused (`reason: 'conflict'`)
 * rather than picking one arbitrarily.
 */
export function parseAgnesKeyDocument(text) {
  const candidates = []
  for (const rawLine of String(text ?? '').split(/\r?\n/)) {
    const line = rawLine.replace(/^\s*(?:[-*>]|\d+\.)\s*/, '')
    const match = line.match(/^([^:：=]{0,40}?(?:api[\s_-]*key|密钥|令牌|token|key))\s*(?:为|是)?\s*[:：=]\s*(.+)$/i)
    if (!match) continue
    const label = match[1].replace(/[`*#]+/g, ' ').replace(/\s+/g, ' ').trim()
    const stripped = match[2]
      .trim()
      .replace(/^[`'"“”‘’[]+/, '')
      .replace(/[`'"“”‘’\],;]+$/, '')
      .trim()
    const token = stripped.split(/\s+/)[0] ?? ''
    if (/^[A-Za-z0-9._+/-]{16,}$/.test(token)) candidates.push({ label, value: token })
  }
  if (candidates.length === 0) return { found: false, label: null, value: null, reason: 'no-match' }
  const agnesLabelled = candidates.filter((row) => /agnes/i.test(row.label))
  const pool = agnesLabelled.length > 0 ? agnesLabelled : candidates
  if (new Set(pool.map((row) => row.value)).size > 1) {
    return { found: false, label: null, value: null, reason: 'conflict' }
  }
  return { found: true, label: pool[0].label, value: pool[0].value, reason: null }
}

export function printInfo(text) {
  process.stdout.write(`${text}\n`)
}

export function printError(text) {
  process.stderr.write(`${text}\n`)
}

/** Uniform error handling for every script's entry point. */
export async function main(entrypoint) {
  try {
    const code = await entrypoint()
    process.exitCode = code ?? EXIT.OK
  } catch (error) {
    if (error instanceof ScriptError) {
      printError(`✗ ${error.message}`)
      process.exitCode = error.code
    } else {
      const message = error instanceof Error ? error.message : String(error)
      printError(`✗ 未预期错误：${message}`)
      process.exitCode = EXIT.FAILURE
    }
  }
}
