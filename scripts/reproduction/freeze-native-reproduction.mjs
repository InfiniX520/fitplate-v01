// Freeze a public reproduction run before any model request. No gold, scoring, or secret reads.
// Use the AGH checkout's tsx. Paths come only from this unpacked package and explicit instance env.
import assert from 'node:assert/strict'
import { readFile, readdir, lstat, realpath, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { config, openClient, closeClient, loadPublic } from '../../scripts/agh/lib.mjs'
import { validateCaseInput } from './native-reproduction.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const args = process.argv.slice(2)
const get = flag => args[args.indexOf(flag) + 1]
assert(args.includes('--input') && args.includes('--out'), 'usage: freeze-native-reproduction.mjs --input INPUT --out NEW_PROTOCOL')
const input = resolve(get('--input')), out = resolve(get('--out'))
const cfg = config()
assert.equal(cfg.scope, 'competition')
assert.equal(await realpath(ROOT), ROOT, 'unpacked project must have a canonical path')
const paths = new Set()
const excluded = new Set(['node_modules', '.git', '__pycache__', 'fixtures', 'out', 'tests', 'test', '__tests__'])
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
async function addFile(path) {
  const info = await lstat(path)
  assert(info.isFile() && !info.isSymbolicLink(), 'freeze requires regular files')
  assert.equal(await realpath(path), path, 'freeze refuses symlinked ancestors')
  paths.add(path)
}
async function walk(directory, select = () => true, parts = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue
    const path = join(directory, entry.name), next = [...parts, entry.name]
    assert(!entry.isSymbolicLink(), 'freeze refuses symlinked runtime source')
    if (entry.isDirectory()) await walk(path, select, next)
    else if (entry.isFile() && select(path, next)) await addFile(path)
  }
}
const manifest = JSON.parse(await readFile(join(ROOT, 'pack-manifest.json'), 'utf8'))
assert(Array.isArray(manifest.files) && manifest.files.length > 0)
for (const row of manifest.files) {
  assert(typeof row.file === 'string' && !isAbsolute(row.file))
  const path = resolve(ROOT, row.file), rel = relative(ROOT, path)
  assert(rel !== '..' && !rel.startsWith('../'), 'pack entry escapes root')
  await addFile(path)
}
await addFile(join(ROOT, 'pack-manifest.json'))
await addFile(input)
validateCaseInput(JSON.parse(await readFile(input, 'utf8')))
await addFile(join(cfg.aghHome, 'profiles', cfg.profile, 'profile.yaml'))
const require = createRequire(join(cfg.aghSourceRoot, 'packages/host/package.json'))
const profile = require('yaml').parse(await readFile(join(cfg.aghHome, 'profiles', cfg.profile, 'profile.yaml'), 'utf8'))
const routes = profile.provider?.routes
assert.equal(routes?.length, 1)
const route = routes[0], model = route.models?.[0]
assert.equal(route.route, 'official-ds41-high')
assert.equal(route.models?.length, 1)
assert.equal(model.id, 'deepseek-flash')
assert.equal(model.contextWindow, 1048576)
assert.equal(model.maxTokens, 16384)
assert.deepEqual(model.defaultSettings, { thinking: 'high' })
assert.deepEqual(model.thinkingLevelMap, { high: 'high' })
const serialized = JSON.stringify(route)
assert(serialized.includes('https://api.deepseek.com/v1'), 'official endpoint required')
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: cfg.aghSourceRoot, encoding: 'utf8' }).trim()
assert.equal(commit, 'cde816b88c737b9fd04e7ef55b899e7b4cd55eb7')
assert.equal(execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=normal'], { cwd: cfg.aghSourceRoot, encoding: 'utf8' }), '')
await walk(join(cfg.aghSourceRoot, 'packages'), (path, parts) => (parts.includes('dist') || parts.includes('src') || parts.includes('public') || path.endsWith('/package.json')) && !path.includes('.test.') && !path.includes('.spec.'))
for (const name of ['package.json', 'pnpm-lock.yaml']) await addFile(join(cfg.aghSourceRoot, name))
const installedRoot = join(cfg.aghHome, 'data/profiles', cfg.profile, 'packages/@fitplate__plugin')
await walk(installedRoot)
const packageManager = await loadPublic('packages/package-manager/dist/src/index.js')
const integrity = packageManager.hashDirectory(join(ROOT, 'plugin'))
assert.equal(packageManager.hashDirectory(installedRoot), integrity)
const { client } = await openClient()
try {
  const row = (await client.packages.list({ profile: cfg.profile })).packages.find(p => p.id === '@fitplate/plugin')
  assert(row?.trusted === true && row?.actual === 'running' && row.integrity === integrity, 'current reviewed package must be running')
  assert((await client.config.get()).provider == null, 'configuration provider overlay is forbidden')
} finally { await closeClient(client) }
const rows = []
for (const path of [...paths].sort()) {
  const bytes = await readFile(path)
  rows.push({ file: path, bytes: bytes.length, sha256: hash(bytes) })
}
const protocol = { kind: 'public-fresh-directory-native-reproduction', created_at: new Date().toISOString(), execution_ready: true, formal_evaluation: false, synthetic_user_automation: true, route: 'official-ds41-high', model: 'deepseek-flash', thinking: 'high', context_window: 1048576, max_tokens: 16384, endpoint: 'https://api.deepseek.com/v1', preset: 'standard', agh_home: cfg.aghHome, web_origin: cfg.webOrigin, agh_commit: commit, expected_package_integrity: integrity, candidate_budget_per_revision: 4, case_budget_ms: 300000, cad_run_budget_ms: 180000, record_video: true, input_file: input, runtime_coaching_allowed: false, automatic_retry_allowed: false, tools_core_filter_effective: false, isolation_note: 'Generic method Skill and own user input in a new workspace. This is not a hard filesystem sandbox or complete prompt-isolation proof.', files: rows }
await writeFile(out, JSON.stringify(protocol, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ protocol: out, sha256: hash(await readFile(out)), files: rows.length, product_integrity: integrity, model_requests_sent: 0 }))
