// Public setup of deployment paths in a fresh extracted source tree.
// Changes only two manifest configuration values; the plugin code/built assets stay unchanged.
import { lstat, readFile, writeFile, rename, unlink } from 'node:fs/promises'
import { resolve, join, parse } from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
export async function bindFreshRuntime(argv) {
  const index = argv.indexOf('--project-root')
  if (index < 0 || !argv[index + 1]) throw new Error('usage: bind-fresh-runtime.mjs --project-root ABSOLUTE_FRESH_ROOT [--execute]')
  const raw = argv[index + 1]
  if (!raw.startsWith('/') || raw.split('/').includes('..')) throw new Error('project root must be absolute without traversal')
  const root = resolve(raw)
  let path = parse(root).root
  for (const part of root.split('/').filter(Boolean)) {
    path = join(path, part)
    const info = await lstat(path)
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('project root contains a symlink or non-directory')
  }
  const target = join(root, 'plugin/package.json')
  const pluginDir = await lstat(join(root, 'plugin'))
  const fileInfo = await lstat(target)
  if (pluginDir.isSymbolicLink() || fileInfo.isSymbolicLink() || !fileInfo.isFile()) throw new Error('plugin manifest must be a regular file in the fresh tree')
  const before = await readFile(target)
  const manifest = JSON.parse(before)
  const row = manifest.agnes?.plugins?.find(p => p.id === 'ext:fitplate/plugin')
  if (!row?.config) throw new Error('expected FitPlate plugin config is absent')
  const geometryRoot = join(root, 'geometry')
  const pythonPath = join(root, '.venv/bin/python')
  // venv's Python launcher is normally a symlink; it is an executable dependency, not a source input.
  await readFile(join(geometryRoot, 'pyproject.toml'))
  row.config = { ...row.config, geometryRoot, pythonPath }
  const after = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
  const result = { kind: 'fresh-runtime-deployment-paths', project_root: root,
    geometryRoot, pythonPath, before_manifest_sha256: hash(before), after_manifest_sha256: hash(after),
    changed_paths_only: ['agnes.plugins[ext:fitplate/plugin].config.geometryRoot', 'agnes.plugins[ext:fitplate/plugin].config.pythonPath'],
    product_code_and_built_assets_modified: false, package_identity_changes: !before.equals(after),
    model_requests_sent: 0, mode: argv.includes('--execute') ? 'execute' : 'dry-run' }
  if (argv.includes('--execute') && !before.equals(after)) {
    const temporary = target + '.setup-' + process.pid
    let created = false
    try {
      await writeFile(temporary, after, { flag: 'wx', mode: fileInfo.mode & 0o777 })
      created = true
      if (!(await readFile(target)).equals(before)) throw new Error('manifest changed during setup')
      await rename(temporary, target)
      created = false
    } finally { if (created) await unlink(temporary) }
  }
  return result
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await bindFreshRuntime(process.argv.slice(2)), null, 2)) }
  catch (error) { console.error('REFUSED:', error.message); process.exitCode = 3 }
}
