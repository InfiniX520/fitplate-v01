#!/usr/bin/env node
/**
 * Build the FitPlate workbench panel bundle.
 *
 *   node scripts/build-client.mjs [--check]
 *
 * Inputs:  plugin/client/** + plugin/src/report-facts.{mjs,d.mts}
 *          (shared pure facts; React/three live in node_modules)
 * Outputs: plugin/extensions/main/client/index.js   (native ESM for the browser)
 *          plugin/extensions/main/client/index.css
 *          plugin/extensions/main/client/index.js.map
 *          plugin/extensions/main/client/build-manifest.json
 *
 * The bundle keeps the host's shared platform modules external. The list is not
 * guessed: it is read back from the AGH checkout's own `externals.ts` contract
 * (packages/web-client/src/externals.ts) and the build fails if the two lists
 * disagree, so a host-side change can never silently inline a second React.
 *
 * It also refuses to emit a bundle that:
 *   - imports anything outside that external list (bare specifiers must all be host-provided),
 *   - carries an absolute http(s) script/style URL (no CDN loading at runtime),
 *   - inlines React itself,
 *   - exceeds the client-asset size caps that the AGH package manager enforces
 *     at install time (4 MiB per file, 16 MiB total).
 *
 * `--check` rebuilds in memory and fails if the files on disk differ, which is
 * what the browser test uses to prove the verified bundle is the built one.
 *
 * Identity: `buildHash` is a digest of the complete build recipe - this script's
 * own bytes, the explicit esbuild options, the tool versions, the source digest
 * and the externals contract. Nothing in it depends on the emitted bytes, so it
 * is deterministic across rebuilds yet changes whenever the recipe changes (the
 * old source-only digest could not tell a minified from an unminified build).
 * `sourceHash` covers the client sources and their shared report-facts module, and each output's
 * `sha256` in the manifest is the actual artifact identity.
 */

import { createHash } from 'node:crypto'
import { readFile, readdir, mkdir, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const CLIENT_SRC = join(ROOT, 'plugin', 'client')
const OUT_DIR = join(ROOT, 'plugin', 'extensions', 'main', 'client')
const AGH_SOURCE_ROOT = process.env.AGH_SOURCE_ROOT ?? '/home/Heliora/ANG/agnes-harness'
const EXTERNALS_FILE = join(AGH_SOURCE_ROOT, 'packages', 'web-client', 'src', 'externals.ts')

/** Fallback copy of the contract; the build verifies it against the AGH source. */
const EXPECTED_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@agnes/cordis',
  '@agnes/web-client',
]

/** client-assets.ts caps enforced by the AGH package manager at install time. */
const MAX_FILE_BYTES = 4 * 1024 * 1024
const MAX_TOTAL_BYTES = 16 * 1024 * 1024

/**
 * The explicit esbuild options that shape the emitted bundle. They are passed to the build
 * below and hashed (canonically) into the build identity, so an option flip - e.g. minify -
 * changes `buildHash` even when the sources do not.
 */
const BUILD_RECIPE_OPTIONS = Object.freeze({
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['chrome120', 'edge120', 'firefox121', 'safari17'],
  jsx: 'automatic',
  sourcemap: 'external',
  sourcesContent: true,
  legalComments: 'none',
  minify: true,
})

const checkMode = process.argv.includes('--check')

function fail(message) {
  console.error(`✗ build-client: ${message}`)
  process.exit(1)
}

async function sha256File(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex')
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await listFiles(full)))
    else if (entry.isFile()) files.push(full)
  }
  return files.sort()
}

/** Read the host's shared-platform list from the AGH checkout contract file. */
async function readHostExternals() {
  if (!existsSync(EXTERNALS_FILE)) {
    console.warn(
      `… AGH externals contract not found at ${EXTERNALS_FILE}; using the pinned copy from this script`,
    )
    return { externals: EXPECTED_EXTERNALS, source: 'script-fallback' }
  }
  const text = await readFile(EXTERNALS_FILE, 'utf8')
  const block = text.match(/export const externals = \[([\s\S]*?)\]/)
  if (!block) fail(`cannot parse the externals list in ${EXTERNALS_FILE}`)
  const list = [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1])
  if (list.length === 0) fail(`the externals list in ${EXTERNALS_FILE} is empty`)
  const missing = EXPECTED_EXTERNALS.filter((name) => !list.includes(name))
  if (missing.length > 0)
    fail(
      `the host externals contract changed: ${missing.join(', ')} missing from ${EXTERNALS_FILE}. ` +
        'Update plugin/client imports and this script before shipping.',
    )
  return { externals: list, source: relative(ROOT, EXTERNALS_FILE) }
}

async function dependencyVersion(name) {
  const path = join(ROOT, 'node_modules', name, 'package.json')
  if (!existsSync(path)) return 'not-installed'
  const pkg = JSON.parse(await readFile(path, 'utf8'))
  return String(pkg.version ?? 'unknown')
}

async function readPackageVersion() {
  for (const candidate of [join(ROOT, 'plugin', 'package.json'), join(ROOT, 'package.json')]) {
    if (!existsSync(candidate)) continue
    try {
      const pkg = JSON.parse(await readFile(candidate, 'utf8'))
      if (typeof pkg.version === 'string') return { version: pkg.version, from: relative(ROOT, candidate) }
    } catch {
      // fall through to the next candidate
    }
  }
  return { version: '0.0.0-dev', from: 'fallback' }
}

/** Digest over client sources, inlined shared report facts, and the external contract. */
async function sourceDigest(externals) {
  const files = [...await listFiles(CLIENT_SRC),
    join(ROOT, 'plugin', 'src', 'report-facts.mjs'),
    join(ROOT, 'plugin', 'src', 'report-facts.d.mts'),
  ]
  const hash = createHash('sha256')
  const entries = []
  for (const file of files) {
    const digest = await sha256File(file)
    entries.push([relative(CLIENT_SRC, file).split('\\').join('/'), digest])
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]))
  hash.update('client-sources-v2\n')
  for (const [name, digest] of entries) hash.update(`${name} ${digest}\n`)
  hash.update(`externals ${[...externals].sort().join(',')}\n`)
  return { digest: hash.digest('hex'), files: entries }
}

/**
 * Digest of the whole build recipe - not of the emitted bytes. Covers this script's own bytes,
 * the explicit esbuild options, the tool versions, the client source digest and the externals
 * contract, so it is stable across rebuilds on the same recipe and changes with any of them.
 */
async function buildRecipeDigest({ externals, version, sources, tools }) {
  const scriptDigest = createHash('sha256')
    .update(await readFile(fileURLToPath(import.meta.url)))
    .digest('hex')
  const hash = createHash('sha256')
  hash.update('fitplate-build-recipe-v1\n')
  hash.update(`script-sha256 ${scriptDigest}\n`)
  hash.update(`version ${version}\n`)
  hash.update(`sources ${sources.digest}\n`)
  hash.update(`externals ${[...externals].sort().join(',')}\n`)
  hash.update(`tools ${JSON.stringify(tools)}\n`)
  hash.update(`options ${JSON.stringify(BUILD_RECIPE_OPTIONS)}\n`)
  return hash.digest('hex')
}

function verifyBundle(text, externals) {
  const problems = []
  const importRe = /(?:^|\n)\s*import\s+(?:[^'"]*?\sfrom\s+)?["']([^"']+)["']|new URL\(["']([^"']+)["']/g
  for (const match of text.matchAll(importRe)) {
    const specifier = match[1] ?? match[2]
    if (!specifier) continue
    if (specifier.startsWith('.') || specifier.startsWith('/')) continue
    if (specifier.startsWith('http://') || specifier.startsWith('https://')) {
      problems.push(`bundle references an absolute URL import: ${specifier}`)
      continue
    }
    if (!externals.includes(specifier))
      problems.push(`bundle imports a bare specifier the host does not provide: ${specifier}`)
  }
  if (/(?:^|[^\w.])react\.(?:development|production)\.min|ReactCurrentOwner|__SECRET_INTERNALS_DO_NOT_USE/.test(text))
    problems.push('bundle appears to inline React instead of importing the host instance')
  if (/import\s*\(\s*["'`]https?:\/\//.test(text))
    problems.push('bundle dynamically imports from a CDN URL')
  if (/["'`]https?:\/\/[^"'`\s]+\.(?:js|mjs|css)["'`]/.test(text))
    problems.push('bundle contains an absolute http(s) script/style URL (CDN loading is not allowed)')
  if (/from\s*["']node:/.test(text) || /require\(\s*["']node:/.test(text))
    problems.push('bundle imports a node: builtin and cannot run in the browser')
  return problems
}

const hostExternals = await readHostExternals()
const externals = hostExternals.externals
const { version, from } = await readPackageVersion()
const sources = await sourceDigest(externals)
const esbuildVersion = await dependencyVersion('esbuild')
const threeVersion = await dependencyVersion('three')

// The embedded build info is deliberately timestamp-free so the bundle is
// byte-reproducible; `--check` (used by the browser acceptance) compares the
// bytes on disk against a fresh in-memory build.
const builtAt = new Date().toISOString()
const tools = { esbuild: esbuildVersion, three: threeVersion, node: process.version }
const buildHash = await buildRecipeDigest({ externals, version, sources, tools })
const buildInfo = {
  name: '@fitplate/plugin-client',
  version,
  buildHash,
  sourceHash: sources.digest,
  builtWith: tools,
  externals,
  buildHashAlgorithm: 'sha256',
}

const banner = `/* FitPlate workbench panel · version ${version} · build ${buildHash.slice(0, 12)} · sources ${from} */`

const result = await esbuild.build({
  entryPoints: [join(CLIENT_SRC, 'index.tsx')],
  outfile: join(OUT_DIR, 'index.js'),
  external: externals,
  define: { __FITPLATE_BUILD__: JSON.stringify(buildInfo) },
  // Minified on purpose (in BUILD_RECIPE_OPTIONS): the daemon serves one client-module file
  // over its private read channel, whose result JSON is capped at 1 MiB (`@agnes/protocol`
  // package-admin data check), so the base64 of the entry must fit that bound. The unminified
  // three.js bundle is 1.33 MB and was refused with an INTERNAL_ERROR/RESULT_INVALID 404 on the
  // real BFF; minified it is ~640 KB. The source map is written beside it for debugging but is
  // not a declared, served asset. `legalComments: 'none'` strips the inlined three.js MIT text
  // from the bundle, which is why the plugin snapshot ships it in `plugin/THIRD_PARTY.md`.
  banner: { js: banner },
  metafile: true,
  write: false,
  logLevel: 'silent',
  ...BUILD_RECIPE_OPTIONS,
})
if (result.errors.length > 0) {
  for (const error of result.errors) console.error(error.text)
  fail('esbuild reported errors')
}

const jsOutput = result.outputFiles.find((file) => file.path.endsWith('.js'))
const mapOutput = result.outputFiles.find((file) => file.path.endsWith('.map'))
if (!jsOutput) fail('esbuild produced no .js output')

const problems = verifyBundle(jsOutput.text, externals)
const cssResult = await esbuild.build({
  entryPoints: [join(CLIENT_SRC, 'style.css')],
  outfile: join(OUT_DIR, 'index.css'),
  bundle: true,
  write: false,
  logLevel: 'silent',
})
const cssOutput = cssResult.outputFiles.find((file) => file.path.endsWith('.css'))
if (!cssOutput) fail('esbuild produced no .css output')
for (const match of cssOutput.text.matchAll(/url\(\s*["']?(https?:)?\/\//g))
  problems.push(`stylesheet references an absolute URL: ${match[0]}`)
if (problems.length > 0) {
  for (const problem of problems) console.error(`✗ ${problem}`)
  fail('the built bundle violates the host integration contract')
}

const outputs = [
  { name: 'index.js', bytes: jsOutput.contents.byteLength, text: jsOutput.text, binary: jsOutput.contents },
  ...(mapOutput
    ? [{ name: 'index.js.map', bytes: mapOutput.contents.byteLength, text: mapOutput.text, binary: mapOutput.contents }]
    : []),
  { name: 'index.css', bytes: cssOutput.contents.byteLength, text: cssOutput.text, binary: cssOutput.contents },
]
const totalBytes = outputs.reduce((sum, file) => sum + file.bytes, 0)
for (const file of outputs) {
  if (file.bytes > MAX_FILE_BYTES)
    fail(`${file.name} is ${file.bytes} bytes, over the AGH per-file cap of ${MAX_FILE_BYTES}`)
}
if (totalBytes > MAX_TOTAL_BYTES)
  fail(`client assets total ${totalBytes} bytes, over the AGH cap of ${MAX_TOTAL_BYTES}`)

if (checkMode) {
  let changed = false
  for (const file of outputs) {
    const path = join(OUT_DIR, file.name)
    if (!existsSync(path)) {
      console.error(`✗ ${relative(ROOT, path)} is missing; run: node scripts/build-client.mjs`)
      changed = true
      continue
    }
    const onDisk = await readFile(path)
    if (!onDisk.equals(Buffer.from(file.binary))) {
      console.error(`✗ ${relative(ROOT, path)} differs from the current sources`)
      changed = true
    }
  }
  if (changed) process.exit(1)
  console.log(`✓ client bundle is up to date (build ${buildHash.slice(0, 12)} · sources ${sources.digest.slice(0, 12)})`)
  process.exit(0)
}

await mkdir(OUT_DIR, { recursive: true })
for (const file of outputs) await writeFile(join(OUT_DIR, file.name), file.binary)

const manifestEntries = []
for (const file of outputs) {
  manifestEntries.push({
    path: `./client/${file.name}`,
    bytes: file.bytes,
    sha256: createHash('sha256').update(file.binary).digest('hex'),
  })
}
const manifest = {
  schema: 'fitplate.client-build/1',
  name: buildInfo.name,
  version,
  buildHash,
  buildHashAlgorithm: 'sha256',
  buildHashCovers: 'script-bytes+options+tools+client-and-shared-sources+externals',
  sourceHash: sources.digest,
  builtAt,
  builtWith: tools,
  hostExternals: { source: hostExternals.source, list: externals },
  sources: sources.files.map(([path, sha256]) => ({ path, sha256 })),
  outputs: manifestEntries,
  descriptorHints: {
    descriptorPath: './extensions/main/agnes.client.json',
    entry: './client/index.js',
    styles: ['./client/index.css'],
    slots: ['workbench.panel'],
    services: ['fitplate.run', 'fitplate.scene', 'fitplate.artifact'],
  },
}
await writeFile(join(OUT_DIR, 'build-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

const sizeKb = (bytes) => `${(bytes / 1024).toFixed(1)}KiB`
console.log(`✓ built FitPlate panel ${version} · build ${buildHash.slice(0, 12)} · sources ${sources.digest.slice(0, 12)}`)
for (const entry of manifestEntries) console.log(`  ${entry.path}  ${sizeKb(entry.bytes)}  ${entry.sha256}`)
console.log(`  externals from ${hostExternals.source}: ${externals.join(', ')}`)
console.log(`  bundle manifest: ${relative(ROOT, join(OUT_DIR, 'build-manifest.json'))}`)
