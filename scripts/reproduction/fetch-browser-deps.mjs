#!/usr/bin/env node
/**
 * Fetch the pieces the browser acceptance needs but this WSL image does not
 * ship, WITHOUT touching the system:
 *
 *   node scripts/reproduction/fetch-browser-deps.mjs
 *
 *   - `apt-get download` (download only: no `install`, no root, no dpkg state
 *     change) fetches libnspr4 / libnss3 / libasound2t64 and the WenQuanYi Zen
 *     Hei CJK font into a temporary directory;
 *   - the .deb files are unpacked with `dpkg-deb -x` into `.cache/chromium-libs/`
 *     and `.cache/fonts/` inside this project;
 *   - the browser test points LD_LIBRARY_PATH at the library directory and the
 *     harness page loads the font from there, so the Chinese UI text is legible
 *     in the screenshots instead of rendering as tofu boxes.
 *
 * Nothing is installed system-wide and no sudo is used. Only project cache
 * files are written; repeat runs may refresh them. Delete `.cache/` to undo it.
 */

import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'

const run = promisify(execFile)
const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..', '..')
const LIB_TARGET = join(ROOT, '.cache', 'chromium-libs')
const FONT_TARGET = join(ROOT, '.cache', 'fonts')
const LIBRARY_PACKAGES = ['libnspr4', 'libnss3', 'libasound2t64']
const FONT_PACKAGES = ['fonts-wqy-zenhei']

async function fetchInto(packages, target) {
  const scratch = await mkdtemp(join(tmpdir(), 'fitplate-deps-'))
  try {
    console.log(`… downloading ${packages.join(', ')} (no install, no sudo)`)
    await run('apt-get', ['download', ...packages], { cwd: scratch })
    const debs = (await readdir(scratch)).filter((name) => name.endsWith('.deb'))
    if (debs.length === 0) throw new Error(`apt-get download produced no .deb files for ${packages.join(', ')}`)
    await mkdir(target, { recursive: true })
    for (const deb of debs) {
      console.log(`… extracting ${deb}`)
      await run('dpkg-deb', ['-x', join(scratch, deb), target])
    }
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}

/**
 * Chromium does not reliably load TrueType *collections* through @font-face,
 * so the first face is extracted into a plain .ttf and subset to the glyphs
 * the panel actually uses. Uses the project venv's fontTools; when that is
 * unavailable the harness simply renders Chinese with the system font (tofu in
 * screenshots) — the tests never depend on the font.
 */
async function extractFont(ttcPath) {
  const python = join(ROOT, '.venv', 'bin', 'python')
  if (!existsSync(python)) return null
  const output = join(FONT_TARGET, 'wqy-zenhei-panel.ttf')
  const textFile = join(FONT_TARGET, 'panel-text.txt')
  const script = `
import sys
from fontTools.ttLib import TTCollection
from fontTools.subset import main as subset_main
ttc, out, text_file = sys.argv[1], sys.argv[2], sys.argv[3]
collection = TTCollection(ttc)
font = collection.fonts[0]
font.save(out + '.full.ttf')
chars = sorted(set(open(text_file, encoding='utf-8').read()))
with open(out + '.txt', 'w', encoding='utf-8') as handle:
    handle.write(''.join(chars))
subset_main([out + '.full.ttf', '--text-file=' + out + '.txt', '--output-file=' + out, '--no-hinting', '--desubroutinize', '--drop-tables+=DSIG'])
`
  await writeFile(textFile, await collectPanelText())
  try {
    await run(python, ['-c', script, ttcPath, output, textFile], { maxBuffer: 64 * 1024 * 1024 })
  } catch (error) {
    console.warn(`… font extraction skipped: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
  await rm(`${output}.full.ttf`, { force: true })
  await rm(`${output}.txt`, { force: true })
  return existsSync(output) ? output : null
}

/** Every character the panel and the harness can render (sources are the truth). */
async function collectPanelText() {
  const { readdir } = await import('node:fs/promises')
  const roots = [join(ROOT, 'plugin', 'client'), join(ROOT, 'plugin', 'src')]
  let text = ''
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (/\.(tsx?|css|mjs|json)$/.test(entry.name)) text += await readFile(full, 'utf8')
    }
  }
  for (const root of roots) if (existsSync(root)) await walk(root)
  // ASCII plus a generous punctuation set so nothing common is dropped.
  let chars = ''
  for (let code = 32; code < 127; code += 1) chars += String.fromCharCode(code)
  chars += '，。、；：？！“”‘’（）《》—…·×°≤≥±→←⌀≈'
  return `${chars}${text}`
}

async function main() {
  await fetchInto(LIBRARY_PACKAGES, LIB_TARGET)
  const libDir = join(LIB_TARGET, 'usr', 'lib', 'x86_64-linux-gnu')
  if (!existsSync(libDir)) throw new Error(`no extracted library directory at ${libDir}`)
  console.log(`✓ libraries ready in ${libDir} (browser test sets LD_LIBRARY_PATH automatically)`)

  await fetchInto(FONT_PACKAGES, FONT_TARGET)
  const ttc = join(FONT_TARGET, 'usr', 'share', 'fonts', 'truetype', 'wqy', 'wqy-zenhei.ttc')
  if (!existsSync(ttc)) throw new Error(`no extracted font at ${ttc}`)
  const subset = await extractFont(ttc)
  if (subset) console.log(`✓ CJK subset ready in ${subset} (harness page loads it for readable screenshots)`)
  else console.log('… CJK font left as the original .ttc; screenshots may show tofu boxes')
  // Real AGH pages use system font discovery, independently of the fixture's
  // @font-face. Make the downloaded TTC visible to headless Chromium too.
  const xml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  const configDir = join(ROOT, '.cache', 'native-fontconfig')
  await mkdir(configDir, { recursive: true })
  const fontConfig = join(configDir, 'fonts.conf')
  await writeFile(fontConfig, `<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">\n<fontconfig>\n  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>\n  <dir>${xml(join(FONT_TARGET, 'usr/share/fonts/truetype/wqy'))}</dir>\n  <cachedir>${xml(join(ROOT, '.cache/fontconfig'))}</cachedir>\n</fontconfig>\n`)
  console.log(`✓ Set FONTCONFIG_FILE=${fontConfig} for native browser recording`)
}

await main()
