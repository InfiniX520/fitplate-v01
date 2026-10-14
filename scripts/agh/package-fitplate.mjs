// Install / update / trust / enable the real `@fitplate/plugin` package in the isolated AGH
// instance, through the official package-admin SDK (the same RPCs the CLI `package` commands use).
//
// Rules this script upholds (T01/T10, reviews 005/008/012):
//   * the Host package review is never skipped: every run re-inspects the source and prints the
//     real `integrity` and `capabilityHash` before anything is installed;
//   * **snapshot staging**: the daemon resolves `file:` sources against the profile workspace and
//     caches fetched/installed trees, so installing straight from the live `plugin/` tree can keep
//     serving stale bytes after a source edit. This script therefore copies the plugin into an
//     independent, content-addressed staging directory
//     (`.cache/agh-package-staging/plugin-<sha256>`) and installs *that* snapshot. A source change
//     produces a different digest, hence a different source ref, hence no stale cache; identical
//     content reuses the identical snapshot;
//   * the digest is computed with the Host's own `hashDirectory` (public `@agnes/package-manager`
//     export - the exact algorithm the daemon uses), so `integrity` is verified against the real
//     bytes of the staged tree instead of being trusted from the preview: staging integrity,
//     preview integrity and the final installed row must all be the same value;
//   * source edits do not update an installed snapshot - when the fresh preview integrity differs
//     from the installed row this script runs the official `update` path, and trust is re-established
//     against the new integrity + capabilityHash (a source change is never silently active);
//   * a missing UI descriptor / client entry is reported as "waiting", not worked around: the
//     client file the manifest points at is checked on disk before install;
//   * only the project package is touched. No catalogue, no network. Old staging snapshots are kept
//     (the daemon may still reference the ref it was installed from); prune them by hand once no
//     installed row points at them.
//
// Usage: <AGH_SOURCE_ROOT>/node_modules/.bin/tsx scripts/agh/package-fitplate.mjs [--no-update]
//        --no-update inspects + verifies the snapshot and refuses on drift (safe read-only check).
// Exit codes: 0 installed/trusted/enabled and running · 3 daemon missing or precondition (missing
//             client entry) · 4 refused (blockers, failed operation, state not enabled) · 1 unexpected.
import { randomUUID } from 'node:crypto'
import { cp, mkdir, readFile, readdir, stat } from 'node:fs/promises'
import { join, posix, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { EXIT, FITPLATE_ROOT, config, fail, main, openClient, closeClient, printInfo } from './lib.mjs'

const PACKAGE_ID = '@fitplate/plugin'
const PLUGIN_ROOT = join(FITPLATE_ROOT, 'plugin')
const STAGE_ROOT = join(FITPLATE_ROOT, '.cache', 'agh-package-staging')
const TERMINAL_STATES = new Set(['completed', 'failed', 'cancelled', 'rolled-back'])
/** The daemon's own directory-hash exclusions (packages/package-manager/src/sources.ts). */
export const HASH_EXCLUDES = Object.freeze(['node_modules', '.git', 'fixtures/out'])

const commandId = (kind) => `${kind}-${randomUUID().replaceAll('-', '')}`

function parseArgs(argv) {
  const options = { allowUpdate: true }
  for (const arg of argv) {
    if (arg === '--no-update') options.allowUpdate = false
    else fail(EXIT.USAGE, `未知参数 ${arg}`)
  }
  return options
}

async function waitOperation(client, profile, receipt, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const operation = await client.packages.operation.get({ profile, operationId: receipt.operationId })
    if (TERMINAL_STATES.has(operation.state)) {
      if (operation.state !== 'completed') {
        const detail = operation.error ? `${operation.error.code}: ${operation.error.message ?? ''}` : operation.state
        fail(EXIT.REFUSED, `${operation.operation} 未完成（${detail}，operationId=${operation.operationId}）`)
      }
      return operation
    }
    if (Date.now() > deadline) {
      fail(EXIT.REFUSED, `等待 ${operation.operation} 超时，operationId=${operation.operationId}（操作仍在后台，可用 operation.get 继续查看）`)
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
}

/** The Host's own hashDirectory: the same bytes-integrity algorithm the daemon applies. */
async function loadPackageManager() {
  const entry = pathToFileURL(join(config().aghSourceRoot, 'packages', 'package-manager', 'dist', 'src', 'index.js')).href
  const mod = await import(entry)
  if (typeof mod.hashDirectory !== 'function') {
    fail(EXIT.REFUSED, '未从 @agnes/package-manager 公开入口取得 hashDirectory，无法核对快照摘要')
  }
  return mod
}

/** The daemon's exclusion rule, applied to a path relative to the plugin root. */
export function excluded(rel, rules = HASH_EXCLUDES) {
  const parts = rel.split('/')
  return rules.some((rule) => {
    if (!rule.includes('/')) return parts.includes(rule)
    return rel === rule || rel.startsWith(`${rule}/`)
  })
}

/**
 * Copy the live plugin tree into an independent content-addressed snapshot. The copy applies the
 * daemon's own hash exclusions, then the snapshot is hashed with the daemon's algorithm and must
 * equal the source tree's digest - staging drift (or a partial copy) refuses instead of installing.
 */
export async function stageSnapshot(packageManager, sourceIntegrity, { pluginRoot = PLUGIN_ROOT, stageRoot = STAGE_ROOT, log = printInfo } = {}) {
  const hex = sourceIntegrity.replace(/^sha256-/, '')
  const stagedDir = join(stageRoot, `plugin-${hex}`)
  await mkdir(stageRoot, { recursive: true })
  const already = await stat(stagedDir).then((info) => info.isDirectory()).catch(() => false)
  if (!already) {
    await cp(pluginRoot, stagedDir, {
      recursive: true,
      filter: (source) => {
        const rel = source.slice(pluginRoot.length).replaceAll('\\', '/').replace(/^\//, '')
        return rel === '' || !excluded(rel)
      },
    })
    log(`staging: 已从 plugin/ 复制独立快照 → ${stagedDir}`)
  } else {
    log(`staging: 复用已存在的快照（内容摘要相同） ${stagedDir}`)
  }
  const stagedIntegrity = packageManager.hashDirectory(stagedDir)
  if (stagedIntegrity !== sourceIntegrity) {
    fail(
      EXIT.REFUSED,
      `快照 staging 校验失败：源码树 ${sourceIntegrity} != staging 副本 ${stagedIntegrity}（拒绝用漂移副本安装）`,
    )
  }
  const files = []
  const walk = async (dir, base) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      const rel = path.slice(base.length + 1)
      if (excluded(rel.replaceAll('\\', '/'))) continue
      if (entry.isDirectory()) await walk(path, base)
      else files.push(rel)
    }
  }
  await walk(stagedDir, stagedDir)
  return { stagedDir, stagedIntegrity, hex, ref: posix.join('file:./.cache/agh-package-staging', `plugin-${hex}`), files: files.sort() }
}

/**
 * The client descriptor the manifest declares must exist on disk *before* install, so "the panel
 * does not work yet" is never discovered after trust was granted. Returns the resolved descriptor.
 */
async function describeClientEntry() {
  const manifestPath = join(PLUGIN_ROOT, 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const descriptors = manifest?.agnes?.clientDescriptors
  if (!Array.isArray(descriptors) || descriptors.length === 0) {
    return { ok: false, reason: 'plugin/package.json 未声明 agnes.clientDescriptors（等前端批次产出 client entry）' }
  }
  for (const descriptor of descriptors) {
    const descriptorPath = join(PLUGIN_ROOT, descriptor.path.replace(/^\.\//, ''))
    let descriptorDoc
    try {
      descriptorDoc = JSON.parse(await readFile(descriptorPath, 'utf8'))
    } catch (error) {
      return { ok: false, reason: `客户端描述文件不可读：${descriptorPath}（${error.message}）` }
    }
    const entry = descriptorDoc?.client?.entry
    if (typeof entry !== 'string' || !entry) return { ok: false, reason: `${descriptorPath} 未声明 client.entry` }
    const entryPath = join(descriptorPath, '..', entry.replace(/^\.\//, ''))
    try {
      await stat(entryPath)
    } catch {
      return { ok: false, reason: `client entry 尚不存在：${entryPath}（等 006 的浏览器构建产物）` }
    }
    return { ok: true, descriptorPath, entryPath, slots: descriptorDoc?.client?.slots ?? [], services: descriptorDoc?.client?.services ?? [] }
  }
  return { ok: false, reason: 'clientDescriptors 为空' }
}

async function runPackageAdmin() {
  const options = parseArgs(process.argv.slice(2))
  const cfg = config()

  const clientEntry = await describeClientEntry()
  if (!clientEntry.ok) {
    printInfo(`… 等待前端 client entry：${clientEntry.reason}`)
    fail(EXIT.PRECONDITION, '插件包缺少可用的 UI descriptor/client entry，本次不安装（明确等待，不绕过）')
  }
  printInfo(`client: ${clientEntry.descriptorPath}`)
  printInfo(`        entry=${clientEntry.entryPath} slots=[${clientEntry.slots.join(', ')}] services=[${clientEntry.services.join(', ')}]`)

  // -- honest snapshot: hash the live tree with the Host's algorithm, stage an independent copy --
  const packageManager = await loadPackageManager()
  const sourceIntegrity = packageManager.hashDirectory(PLUGIN_ROOT)
  printInfo(`source: plugin/ integrity=${sourceIntegrity}（与 Host 使用的 hashDirectory 算法一致）`)
  const staged = await stageSnapshot(packageManager, sourceIntegrity)
  printInfo(`staged: ${staged.stagedDir}`)
  printInfo(`        ref=${staged.ref} files=${staged.files.length} integrity=${staged.stagedIntegrity}（实测，非声明）`)
  const SOURCE = { type: 'file', ref: staged.ref }

  const { client } = await openClient()
  try {
    const profile = cfg.profile
    const clientId = await client.clientId()

    // -- fresh review of the staged snapshot ---------------------------------
    const inspectReceipt = await client.packages.inspect({ profile, clientId, commandId: commandId('inspect'), source: SOURCE })
    const inspected = await waitOperation(client, profile, inspectReceipt)
    const preview = inspected.preview
    if (!preview) fail(EXIT.REFUSED, 'inspect 未返回 preview')
    if (preview.id !== PACKAGE_ID) fail(EXIT.REFUSED, `preview id=${preview.id}，预期 ${PACKAGE_ID}`)
    printInfo(`inspect: ${preview.id}@${preview.version} source=${preview.source.type}:${preview.source.ref}`)
    printInfo(`  integrity=${preview.integrity}`)
    printInfo(`  capabilityHash=${preview.capabilityHash ?? '(未声明)'}`)
    printInfo(`  contributions=${preview.contributions.map((c) => `${c.kind}:${c.id}${c.rowId ? `@${c.rowId}` : ''}`).join(', ') || '(空)'}`)
    for (const warning of preview.warnings) printInfo(`  warning=${warning.code}: ${warning.safeMessage ?? ''}`)
    if (preview.blockers.length > 0) {
      for (const blocker of preview.blockers) printInfo(`  blocker=${blocker.code} refs=${blocker.references.join(',')}`)
      fail(EXIT.REFUSED, `preview 存在 blockers（${preview.blockers.map((b) => b.code).join(', ')}），不继续授权`)
    }
    if (!preview.capabilityHash) fail(EXIT.REFUSED, 'preview 缺少 capabilityHash，无法进入 trust 流程')
    if (preview.integrity !== staged.stagedIntegrity) {
      fail(
        EXIT.REFUSED,
        `Host inspect 的 integrity=${preview.integrity} 与本机对快照实测的 ${staged.stagedIntegrity} 不一致：拒绝安装（快照或哈希算法有出入）`,
      )
    }
    printInfo('  integrity 核对：Host inspect 结果与本机对 staging 快照的实测摘要一致 ✓')

    // -- is the installed snapshot the one we just inspected? ---------------
    const before = await client.packages.list({ profile })
    const existing = before.packages.find((entry) => entry.id === PACKAGE_ID)
    if (existing) {
      printInfo(`installed: ${existing.id}@${existing.version} desired=${existing.desired} trusted=${existing.trusted} integrity=${existing.integrity}`)
    } else {
      printInfo('installed: (尚未安装)')
    }

    let installedIntegrity = preview.integrity
    if (!existing) {
      const installReceipt = await client.packages.install({
        profile, clientId, commandId: commandId('install'), source: SOURCE, expectedIntegrity: preview.integrity,
      })
      const installed = await waitOperation(client, profile, installReceipt)
      installedIntegrity = installed.installed?.integrity ?? preview.integrity
      printInfo(`install: state=${installed.state} integrity=${installedIntegrity}`)
    } else if (existing.integrity !== preview.integrity) {
      if (!options.allowUpdate) fail(EXIT.REFUSED, `已安装快照与当前源码不一致（${existing.integrity} != ${preview.integrity}），按 --no-update 不更新`)
      const updateReceipt = await client.packages.update({
        profile, clientId, commandId: commandId('update'), id: PACKAGE_ID, source: SOURCE,
        expectedIntegrity: preview.integrity,
        // Activation carries the current installed/active baselines and the explicit trust decision
        // for the *new* revision, so the update cannot land untrusted or against a changed runtime.
        activation: {
          expectedInstalledIntegrity: existing.integrity,
          expectedActiveIntegrity: existing.actual === 'running' ? existing.integrity : null,
          trust: { integrity: preview.integrity, capabilityHash: preview.capabilityHash },
        },
      })
      const updated = await waitOperation(client, profile, updateReceipt)
      installedIntegrity = updated.installed?.integrity ?? preview.integrity
      printInfo(`update: state=${updated.state} 由 ${existing.integrity} → ${installedIntegrity}（源码变更后的快照升级，activation 已携带新摘要的 trust 决策）`)
    } else {
      printInfo('snapshot: 已安装快照与当前源码一致，跳过 install/update')
    }

    // -- trust / enable as needed, always against the real capability hash ---
    const midList = await client.packages.list({ profile })
    let mid = midList.packages.find((entry) => entry.id === PACKAGE_ID)
    if (!mid) fail(EXIT.REFUSED, 'install/update 后列表中未找到该包')
    if (mid.integrity !== preview.integrity) {
      fail(EXIT.REFUSED, `列表 integrity=${mid.integrity} 与本次 inspect 的 ${preview.integrity} 不一致`)
    }
    if (mid.trusted !== true) {
      const trustReceipt = await client.packages.trust({
        profile, clientId, commandId: commandId('trust'), id: PACKAGE_ID,
        expectedIntegrity: installedIntegrity, capabilityHash: preview.capabilityHash,
      })
      const trusted = await waitOperation(client, profile, trustReceipt)
      printInfo(`trust: state=${trusted.state} integrity=${installedIntegrity} capabilityHash=${preview.capabilityHash}`)
    } else {
      printInfo(`trust: 已按 integrity=${installedIntegrity} capabilityHash=${preview.capabilityHash} 授权（无需重复）`)
    }
    if (mid.desired !== 'enabled') {
      const enableReceipt = await client.packages.enable({
        profile, clientId, commandId: commandId('enable'), id: PACKAGE_ID,
        expectedInstalledIntegrity: installedIntegrity,
      })
      const enabled = await waitOperation(client, profile, enableReceipt)
      printInfo(`enable: state=${enabled.state}`)
    } else {
      printInfo('enable: 已是 enabled（无需重复）')
    }

    // -- verify the observed state, not the receipt -------------------------
    const { packages } = await client.packages.list({ profile })
    const row = packages.find((entry) => entry.id === PACKAGE_ID)
    if (!row) fail(EXIT.REFUSED, 'enable 后列表中未找到该包')
    printInfo(`status: ${row.id}@${row.version} desired=${row.desired} actual=${row.actual} trusted=${row.trusted}`)
    printInfo(`  integrity=${row.integrity} capabilityHash=${row.capabilityHash ?? '(未声明)'}`)
    if (row.integrity !== preview.integrity || row.integrity !== staged.stagedIntegrity) {
      fail(
        EXIT.REFUSED,
        `安装行 integrity=${row.integrity} 与 inspect=${preview.integrity} / 快照实测=${staged.stagedIntegrity} 不一致`,
      )
    }
    if (row.desired !== 'enabled' || row.trusted !== true || row.actual !== 'running') {
      fail(EXIT.REFUSED, `期望 desired=enabled/trusted=true/actual=running，实际 desired=${row.desired} trusted=${row.trusted} actual=${row.actual}`)
    }
    printInfo('✓ @fitplate/plugin 已按实测快照摘要安装/授权并在隔离实例中运行（源码变更后必须重跑本脚本）')
    return EXIT.OK
  } finally {
    await closeClient(client)
  }
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
if (invokedDirectly) {
  await main(runPackageAdmin)
}
