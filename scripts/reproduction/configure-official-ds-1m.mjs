// configure-official-ds-1m.mjs - PUBLIC official DeepSeek 1M route configurator (P3-REPRO-01 r2).
//
// Builds a schema-validated `official-ds41-high` profile route for a brand-new isolated AGH
// home: model deepseek-flash, thinking high (map high->high ONLY), contextWindow 1048576,
// maxTokens 16384, DeepSeek compat, catalog.include [] (single route), secrets pinned to the
// new home's own `<home>/secrets`. Default is DRY-RUN: validates and prints the plan, writes
// nothing, opens no socket, sends no network. `--execute` writes the profile.yaml and stores
// the credential through the PUBLIC `createCredentialStore` into the new home only.
//
// SAFETY CONTRACT
//   * --project-root / --agh-source-root / --home / --origin are explicit required inputs;
//     nothing defaults to a development path and no existing home is ever adopted.
//   * --execute requires the home to NOT exist; symlink or `..` collisions are refused
//     before any read or write (lstat chain to the filesystem root, then resolve).
//   * The key comes ONLY from the env var the user names (default FITPLATE_OFFICIAL_DS_KEY)
//     only. It is never on argv, never printed, never logged,
//     never written anywhere except the new home's credential store via the public API.
//     Development ~/.claude/settings.json is NEVER read.
//   * The manifest and model record are validated with the PUBLIC
//     `validateProfileManifest` / `validateModelRecord` before anything is written.
//   * This script ships in the public reproduction package and imports NOTHING private:
//     only the AGH source tree's public protocol/host entries, resolved from
//     --agh-source-root at runtime.
//
// USAGE
//   dry run:  <AGH>/node_modules/.bin/tsx configure-official-ds-1m.mjs --project-root <unpacked dir> \
//               --agh-source-root <AGH checkout cde816b8...> --home <NEW home path> \
//               --origin http://127.0.0.1:4391
//   execute:  ... --execute          (key from $FITPLATE_OFFICIAL_DS_KEY only)
//
// Exit codes: 0 ok · 2 usage · 3 precondition/refused · 4 unexpected

import { existsSync, lstatSync } from 'node:fs'
import { mkdir, open, readFile, writeFile } from 'node:fs/promises'
import { isAbsolute, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------
// fixed public contract values
// ---------------------------------------------------------------------------
export const ROUTE = 'official-ds41-high'
export const API = 'openai-completions'
export const BASE_URL = 'https://api.deepseek.com/v1'
export const CREDENTIAL_REF = 'secret://official-ds41-high/native'
export const MODEL_ID = 'deepseek-flash'
export const MODEL_NAME = 'DeepSeek-V4.1-Flash（official catalog；high；1M 上下文部署路由）'
export const CONTEXT_WINDOW = 1048576
export const MAX_TOKENS = 16384
export const THINKING = 'high'
export const PROFILE_NAME = 'local-dev'
export const KEY_ENV = 'FITPLATE_OFFICIAL_DS_KEY'

export const CAPABILITY_CEILING = Object.freeze([
  'tools', 'hooks', 'slots', 'events', 'resources', 'ui', 'services',
  'network', 'network.publicRead', 'tools.invoke', 'artifacts', 'subagent',
])

export const EXIT = Object.freeze({ OK: 0, FAILURE: 1, USAGE: 2, PRECONDITION: 3, REFUSED: 4 })

// ---------------------------------------------------------------------------
// pure manifest builders (exported for tests)
// ---------------------------------------------------------------------------
export function buildModelRecord() {
  return {
    id: MODEL_ID,
    name: MODEL_NAME,
    api: API,
    route: ROUTE,
    baseUrl: BASE_URL,
    reasoning: true,
    // ONLY high: the deployment route offers exactly this tier; anything else must be
    // refused by the adapter, never silently downgraded.
    thinkingLevelMap: { [THINKING]: THINKING },
    input: ['text'],
    // UNPRICED placeholder: zero estimates never mean "free".
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: CONTEXT_WINDOW,
    defaultSettings: { thinking: THINKING },
    maxTokens: MAX_TOKENS,
    toolCallFormats: ['native'],
    thinkingReplay: 'native',
    contract_id: null,
    // pi-ai openai-completions buildParams: deepseek thinkingFormat sends
    // thinking:{type:'enabled'} plus reasoning_effort mapped through thinkingLevelMap;
    // max_tokens field per the official DS API.
    compat: { thinkingFormat: 'deepseek', supportsReasoningEffort: true, maxTokensField: 'max_tokens' },
  }
}

export function buildRouteDecl() {
  return {
    route: ROUTE,
    api: API,
    baseUrl: BASE_URL,
    credentialRef: CREDENTIAL_REF,
    displayName: 'Official DS V4.1 Flash (high; 1M; isolated reproduction)',
    models: [buildModelRecord()],
  }
}

export function secretsDirFor(home) {
  return join(resolve(home), 'secrets')
}

export function buildProfileManifest(home) {
  return {
    name: PROFILE_NAME,
    schemaVersion: 1,
    provider: {
      package: '@agnes/ai',
      adapters: ['@agnes/ai'],
      // single-route deployment: the bundled API-key catalogue stays out
      catalog: { include: [] },
      routes: [buildRouteDecl()],
    },
    // Pin the secrets adapter to THIS new home's own secrets dir: the builtin template
    // leaves the path unset and the resolver would fall back to <dataDir>/secrets -
    // the SECRET_UNRESOLVED mismatch. Naming it makes profile and store agree.
    adapters: { secrets: { kind: 'file', path: secretsDirFor(home) } },
    policy: { capabilityCeiling: [...CAPABILITY_CEILING] },
  }
}

// Deterministic YAML emission (every scalar JSON-quoted so `@`/`:`/`//` stay literal).
const q = (value) => JSON.stringify(value)
export function manifestToYaml(manifest) {
  const m = manifest
  const route = m.provider.routes[0]
  const model = route.models[0]
  const lines = []
  lines.push(`name: ${q(m.name)}`)
  lines.push(`schemaVersion: ${m.schemaVersion}`)
  lines.push('provider:')
  lines.push(`  package: ${q(m.provider.package)}`)
  lines.push('  adapters:')
  for (const a of m.provider.adapters) lines.push(`    - ${q(a)}`)
  lines.push('  catalog:')
  lines.push('    include: []')
  lines.push('  routes:')
  lines.push(`    - route: ${q(route.route)}`)
  lines.push(`      api: ${q(route.api)}`)
  lines.push(`      baseUrl: ${q(route.baseUrl)}`)
  lines.push(`      credentialRef: ${q(route.credentialRef)}`)
  lines.push(`      displayName: ${q(route.displayName)}`)
  lines.push('      models:')
  lines.push(`        - id: ${q(model.id)}`)
  lines.push(`          name: ${q(model.name)}`)
  lines.push(`          api: ${q(model.api)}`)
  lines.push(`          route: ${q(model.route)}`)
  lines.push(`          baseUrl: ${q(model.baseUrl)}`)
  lines.push(`          reasoning: ${model.reasoning}`)
  lines.push('          thinkingLevelMap:')
  for (const [from, to] of Object.entries(model.thinkingLevelMap)) lines.push(`            ${q(from)}: ${q(to)}`)
  lines.push('          input:')
  for (const i of model.input) lines.push(`            - ${q(i)}`)
  lines.push('          cost:')
  lines.push(`            input: ${model.cost.input}`)
  lines.push(`            output: ${model.cost.output}`)
  lines.push(`            cacheRead: ${model.cost.cacheRead}`)
  lines.push(`            cacheWrite: ${model.cost.cacheWrite}`)
  lines.push(`          contextWindow: ${model.contextWindow}`)
  lines.push('          defaultSettings:')
  lines.push(`            thinking: ${q(model.defaultSettings.thinking)}`)
  lines.push(`          maxTokens: ${model.maxTokens}`)
  lines.push('          toolCallFormats:')
  for (const f of model.toolCallFormats) lines.push(`            - ${q(f)}`)
  lines.push(`          thinkingReplay: ${q(model.thinkingReplay)}`)
  lines.push(`          contract_id: ${model.contract_id === null ? 'null' : q(model.contract_id)}`)
  lines.push('          compat:')
  lines.push(`            thinkingFormat: ${q(model.compat.thinkingFormat)}`)
  lines.push(`            supportsReasoningEffort: ${model.compat.supportsReasoningEffort}`)
  lines.push(`            maxTokensField: ${q(model.compat.maxTokensField)}`)
  lines.push('adapters:')
  lines.push('  secrets:')
  lines.push(`    kind: ${q(m.adapters.secrets.kind)}`)
  lines.push(`    path: ${q(m.adapters.secrets.path)}`)
  lines.push('policy:')
  lines.push('  capabilityCeiling:')
  for (const c of m.policy.capabilityCeiling) lines.push(`    - ${q(c)}`)
  return lines.join('\n') + '\n'
}

// ---------------------------------------------------------------------------
// path safety: lstat the WHOLE chain up to the filesystem root BEFORE resolve, so a
// symlinked ancestor cannot be swallowed by resolve(); refuse `..`, non-absolute and
// symlinked segments. Then resolve and re-verify containment.
// ---------------------------------------------------------------------------
function assertNoSymlinkChain(absPath, label) {
  // Walk down from the filesystem root to the path, lstat every ancestor segment.
  const parts = absPath.split(sep).filter(Boolean)
  let current = sep
  for (const part of parts) {
    current = join(current, part)
    let st
    try {
      st = lstatSync(current)
    } catch (err) {
      if (err?.code === 'ENOENT') break // not-yet-existing tail is fine (new home)
      throw new Error(`${label}: cannot lstat ${current}: ${err?.code ?? err?.message}`)
    }
    if (st.isSymbolicLink()) throw new Error(`${label}: symlink in the ancestor chain at ${current}`)
  }
}

function assertSafeNewPath(rawPath, label) {
  if (typeof rawPath !== 'string' || rawPath.length === 0) throw new Error(`${label}: a path is required`)
  if (!isAbsolute(rawPath)) throw new Error(`${label}: must be an absolute path (got '${rawPath}')`)
  if (rawPath.includes('..')) throw new Error(`${label}: '..' is not accepted (got '${rawPath}')`)
  const resolved = resolve(rawPath)
  assertNoSymlinkChain(resolved, label)
  if (existsSync(resolved) || lstatSync(resolved, { throwIfNoEntry: false })) {
    throw new Error(`${label}: path already exists - a fresh non-existing target is required (${resolved})`)
  }
  return resolved
}

function assertSafeExistingPath(rawPath, label) {
  if (typeof rawPath !== 'string' || rawPath.length === 0) throw new Error(`${label}: a path is required`)
  if (!isAbsolute(rawPath)) throw new Error(`${label}: must be an absolute path (got '${rawPath}')`)
  if (rawPath.includes('..')) throw new Error(`${label}: '..' is not accepted (got '${rawPath}')`)
  const resolved = resolve(rawPath)
  assertNoSymlinkChain(resolved, label)
  if (!existsSync(resolved)) throw new Error(`${label}: does not exist (${resolved})`)
  return resolved
}

// ---------------------------------------------------------------------------
// credential intake: user-named env var, no interactive fallback. Never argv. Never printed.
// ---------------------------------------------------------------------------
async function readKey({ execute, env = process.env, stdin = process.stdin, out = process.stdout }) {
  if (!execute) return { from: 'dry-run', length: 0 }
  const fromEnv = env[KEY_ENV]
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return { value: fromEnv, from: `env:${KEY_ENV}`, length: fromEnv.length }
  throw new Error(`no credential: set ${KEY_ENV} in the environment; interactive key input is not supported`)
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = [...argv]
  const get = (flag) => {
    const index = args.indexOf(flag)
    return index === -1 ? undefined : args[index + 1]
  }
  const options = {
    execute: args.includes('--execute'),
    projectRoot: get('--project-root'),
    aghSourceRoot: get('--agh-source-root'),
    home: get('--home'),
    origin: get('--origin'),
  }
  const known = ['--execute', '--project-root', '--agh-source-root', '--home', '--origin']
  for (const arg of args) {
    if (known.includes(arg)) continue
    if (arg.startsWith('--') && known.includes(arg)) continue
    if (!arg.startsWith('--') && known.includes(args[args.indexOf(arg) - 1] ?? '')) continue
    throw new Error(`unknown argument ${arg} (known: ${known.join(' ')})`)
  }
  for (const key of ['projectRoot', 'aghSourceRoot', 'home', 'origin']) {
    if (!options[key]) throw new Error(`--${key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())} is required`)
  }
  if (!/^https?:\/\//.test(options.origin)) throw new Error('--origin must be an http(s) origin')
  return options
}

async function importPublic(aghSourceRoot, pkg, file) {
  return import(pathToFileURL(join(aghSourceRoot, 'packages', pkg, 'src', file)).href)
}

async function main(argv) {
  const options = parseArgs(argv)
  const projectRoot = assertSafeExistingPath(options.projectRoot, '--project-root')
  const aghSourceRoot = assertSafeExistingPath(options.aghSourceRoot, '--agh-source-root')
  const home = assertSafeNewPath(options.home, '--home')
  const origin = options.origin

  // Public schema validators (from the pinned AGH tree the user provides).
  const protocol = await importPublic(aghSourceRoot, 'protocol', 'index.ts')
  const { validateProfileManifest, validateModelRecord } = protocol
  if (typeof validateProfileManifest !== 'function' || typeof validateModelRecord !== 'function') {
    throw new Error('the AGH protocol entry does not export validateProfileManifest/validateModelRecord')
  }

  const manifest = buildProfileManifest(home)
  const model = manifest.provider.routes[0].models[0]
  const modelVerdict = validateModelRecord(model)
  if (modelVerdict?.ok !== true) {
    throw new Error('the generated model record failed the public schema: ' + JSON.stringify(modelVerdict?.issues ?? null))
  }
  const manifestVerdict = validateProfileManifest(manifest)
  if (manifestVerdict?.ok !== true) {
    throw new Error('the generated profile manifest failed the public schema: ' + JSON.stringify(manifestVerdict?.issues ?? null))
  }

  const plan = {
    kind: 'official-ds41-high-1m-route',
    mode: options.execute ? 'execute' : 'dry-run',
    project_root: projectRoot,
    agh_source_root: aghSourceRoot,
    home,
    origin,
    profile_name: manifest.name,
    profile_dir: join(home, 'profiles', PROFILE_NAME),
    secrets_dir: manifest.adapters.secrets.path,
    route: ROUTE,
    model: model.id,
    endpoint: model.baseUrl,
    thinking: THINKING,
    thinking_level_map: model.thinkingLevelMap,
    context_window: model.contextWindow,
    max_tokens: model.maxTokens,
    compat: model.compat,
    catalog_include: manifest.provider.catalog.include,
    costs: 'UNPRICED placeholder; zero estimates do not mean free',
    schema_validated: true,
    network_used: false,
    daemon_started: false,
    key_source: null,
    note: 'dry-run writes nothing; --execute writes profile.yaml + credential store into the NEW home only',
  }
  process.stdout.write(JSON.stringify(plan, null, 2) + '\n')
  if (!options.execute) return EXIT.OK

  const key = await readKey({ execute: true })
  plan.key_source = key.from

  // Write the profile into the brand-new home (0700 dirs, 0600 file, exclusive creates).
  await mkdir(home, { recursive: false, mode: 0o700 })
  const profileDir = join(home, 'profiles', PROFILE_NAME)
  await mkdir(profileDir, { recursive: true, mode: 0o700 })
  const profilePath = join(profileDir, 'profile.yaml')
  const handle = await open(profilePath, 'wx', 0o600)
  await handle.writeFile(manifestToYaml(manifest), 'utf8')
  await handle.close()

  // Store the credential through the PUBLIC createCredentialStore into THIS home.
  const host = await importPublic(aghSourceRoot, 'host', 'index.ts')
  if (typeof host.createCredentialStore !== 'function') throw new Error('the AGH host entry does not export createCredentialStore')
  let written
  try { written = await host.createCredentialStore({ root: home }).putApiKey(CREDENTIAL_REF, key.value) }
  catch { throw new Error('Credential store write failed; credential contents omitted') }
  finally { key.value = '' }
  plan.credential_written = Boolean(written ?? true)
  plan.profile_path = profilePath
  process.stdout.write(JSON.stringify({ executed: true, home, profile_path: profilePath, key_source: plan.key_source }, null, 2) + '\n')
  return EXIT.OK
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  try {
    process.exitCode = await main(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`REFUSED: ${error.message}\n`)
    const usage = /is required$|unknown argument|--origin must be/.test(error.message ?? '')
    process.exitCode = usage ? EXIT.USAGE : EXIT.REFUSED
  }
}
