// Serve the AGH browser workbench for this project's isolated daemon.
//
// Usage: <AGH_SOURCE_ROOT>/node_modules/.bin/tsx scripts/agh/web.mjs <start|status|stop>
// Env:   AGH_HOME / AGNES_PROFILE / AGNES_WEB_ORIGIN / AGH_SOURCE_ROOT (scripts/agh/lib.mjs)
//
//   start   Discover the daemon's authenticated loopback WebSocket endpoint, then run the AGH
//           CLI's own browser-facing launcher (`agnes serve`, packages/cli/launch/web-command.ts)
//           with this instance's environment: it serves the compiled public Web bundle
//           (packages/cli/dist/local/web) on the configured loopback origin (default
//           http://127.0.0.1:4387) and wires the real BFF (client-module service/effect calls,
//           package/skin/client-module reads, surface mounts) over its private connection to the
//           daemon. Nothing is rebuilt, no token is read or printed here: the page receives the
//           ws endpoint through the launcher's own index injection, and the listener is
//           loopback-only.
//   status  Report this script's own launcher process (pid file in .cache/agh-web), after
//           re-verifying its /proc identity, and whether the daemon endpoint it serves still
//           matches live discovery.
//   stop    SIGTERM the launcher recorded by this script - never any other process - after
//           re-verifying its /proc identity, and wait for it. On any identity mismatch the stop
//           is refused, nothing is signalled, and the stale own state is cleared.
//
// Only this script's own launcher process is managed; the daemon itself belongs to
// scripts/agh/start.mjs. A port already taken by another process is reported and left untouched.
// The launcher is identified by its exact argv plus /proc/<pid>/stat start time and the
// AGH_HOME/AGNES_PROFILE/AGNES_WEB_ORIGIN scope in its environment (never the rest of the
// environment: no credential or token is ever read into state, printed, or logged). A pid
// file alone is never trusted - a recycled pid must not be mistaken for the server.
// Exit codes: 0 ok · 1 failure · 2 usage · 3 precondition (daemon not discoverable / not running)
//             4 refused (origin mismatch or port conflict).
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { open, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { get } from 'node:http'
import { join } from 'node:path'

import {
  EXIT,
  FITPLATE_ROOT,
  agnesEntry,
  childEnv,
  config,
  discoverDaemon,
  ensurePrivateHome,
  fail,
  main,
  printError,
  printInfo,
  webAssetsRoot,
} from './lib.mjs'

// Per-scope state: the dev scope keeps its historical directory; every other scope gets its own,
// so two scopes can never adopt or stop each other's launcher pid.
const SCOPE = config().scope
const STATE_DIR = SCOPE === 'dev' ? join(FITPLATE_ROOT, '.cache', 'agh-web') : join(FITPLATE_ROOT, '.cache', `agh-web-${SCOPE}`)
const STATE_PATH = join(STATE_DIR, 'web.json')
const LOG_PATH = join(STATE_DIR, 'serve.log')

const processAlive = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

// The only environment keys read from /proc: the instance scope this script owns (home,
// profile, and the loopback origin the launcher serves). Everything else in the launcher's
// environment (credentials included) is never returned by these helpers.
const PROC_SCOPE_KEYS = ['AGH_HOME', 'AGNES_PROFILE', 'AGNES_WEB_ORIGIN']

/** The exact argv this script spawns for the launcher: `node <agnes entry> serve`. */
const expectedLauncherArgv = () => [process.execPath, agnesEntry(), 'serve']

/**
 * Live /proc identity of one pid: the boot-relative start time (stat field 22, which changes
 * when a pid is recycled), the exact argv, and the AGH_HOME/AGNES_PROFILE scope from the
 * process environment (null when it cannot be read). Returns null when the pid is gone.
 */
async function readProcIdentity(pid) {
  try {
    const stat = await readFile(`/proc/${pid}/stat`, 'utf8')
    const fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/)
    const starttime = fields[19]
    const cmdline = (await readFile(`/proc/${pid}/cmdline`, 'utf8')).split('\0').filter(Boolean)
    let scope = null
    try {
      scope = {}
      for (const entry of (await readFile(`/proc/${pid}/environ`, 'utf8')).split('\0')) {
        const separator = entry.indexOf('=')
        if (separator > 0 && PROC_SCOPE_KEYS.includes(entry.slice(0, separator))) {
          scope[entry.slice(0, separator)] = entry.slice(separator + 1)
        }
      }
    } catch {
      scope = null // environment not readable: the scope cannot be confirmed
    }
    return { starttime, cmdline, scope }
  } catch {
    return null
  }
}

/**
 * Does the live process recorded in `state` provably belong to this script's launcher?
 *
 * - the live argv must equal the argv this script spawns *now* (a recorded cmdline never
 *   takes priority; if one is recorded it must match the current expected argv as well),
 * - a recorded /proc start time must match, which catches a recycled pid,
 * - the state must record home/profile/origin and they must equal the *current* config,
 * - and the live environment must confirm the same current scope (all three keys).
 * A legacy state (no argv/start time) is acceptable only in those two fields; its full
 * original scope must still match. Anything else means "not ours": never claimed, never
 * signalled.
 */
async function ownedByState(state) {
  const cfg = config()
  const proc = await readProcIdentity(state.pid)
  if (proc === null || proc.cmdline.length === 0) return false
  const expected = expectedLauncherArgv()
  if (proc.cmdline.length !== expected.length || expected.some((part, index) => proc.cmdline[index] !== part)) {
    return false
  }
  if (Array.isArray(state.cmdline) && state.cmdline.length > 0) {
    if (state.cmdline.length !== expected.length || state.cmdline.some((part, index) => part !== expected[index])) {
      return false
    }
  }
  if (typeof state.starttime === 'string' && proc.starttime !== state.starttime) return false
  if (state.home !== cfg.aghHome || state.profile !== cfg.profile || state.origin !== cfg.webOrigin) return false
  if (proc.scope === null) return false // cannot confirm the scope: never claim it, never kill it
  return (
    proc.scope.AGH_HOME === cfg.aghHome &&
    proc.scope.AGNES_PROFILE === cfg.profile &&
    proc.scope.AGNES_WEB_ORIGIN === cfg.webOrigin
  )
}

async function readState() {
  try {
    const state = JSON.parse(await readFile(STATE_PATH, 'utf8'))
    return typeof state?.pid === 'number' ? state : undefined
  } catch {
    return undefined
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Is the loopback port free for us to bind? */
function portFree(port) {
  return new Promise((resolve) => {
    const probe = createServer()
    probe.once('error', () => resolve(false))
    probe.once('listening', () => probe.close(() => resolve(true)))
    probe.listen(port, '127.0.0.1')
  })
}

/** One bounded GET against the loopback origin (never through an environment proxy). */
function loopbackGet(origin, path, timeoutMs = 5_000) {
  return new Promise((resolvePromise, reject) => {
    const url = new URL(path, origin)
    const request = get(
      { hostname: url.hostname, port: url.port, path: url.pathname, timeout: timeoutMs },
      (response) => {
        let body = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          body += chunk
        })
        response.on('end', () => resolvePromise({ status: response.statusCode ?? 0, body }))
      },
    )
    request.on('timeout', () => request.destroy(new Error(`no answer from ${url.href} within ${timeoutMs} ms`)))
    request.on('error', reject)
  })
}

/** Discover the running daemon and the exact origin it expects its pages to be served from. */
async function requireDaemonWeb() {
  const cfg = config()
  const { discovery } = await discoverDaemon()
  if (!discovery) {
    fail(EXIT.PRECONDITION, `daemon 未运行或不可发现（home=${cfg.aghHome}，profile=${cfg.profile}）。先运行 scripts/agh/start.mjs。`)
  }
  const web = discovery.web
  if (!web?.url || !web?.origin) {
    fail(
      EXIT.PRECONDITION,
      'daemon 未提供本机 Web 端点；以 AGNES_WEB_ORIGIN 启动的隔离实例才有。先运行 scripts/agh/start.mjs。',
    )
  }
  if (web.origin !== cfg.webOrigin) {
    fail(
      EXIT.REFUSED,
      `daemon 期望的页面 origin 是 ${web.origin}，而本脚本配置为 ${cfg.webOrigin}（AGNES_WEB_ORIGIN）。` +
        ' 两边必须一致；未启动任何服务器。',
    )
  }
  return { cfg, discovery, wsUrl: web.url, origin: web.origin }
}

async function start() {
  const { cfg, discovery, wsUrl, origin } = await requireDaemonWeb()
  const assets = webAssetsRoot()
  try {
    if (!(await stat(join(assets, 'index.html'))).isFile()) throw new Error('missing index.html')
  } catch {
    fail(EXIT.PRECONDITION, `编译后的 Web 资产不可用：${assets}（应存在 CLI 发行目录 packages/cli/dist/local/web）`)
  }
  const port = Number(new URL(origin).port)
  if (!Number.isInteger(port) || port <= 0) fail(EXIT.REFUSED, `origin 必须带显式端口：${origin}`)

  const existing = await readState()
  if (existing && processAlive(existing.pid)) {
    if (await ownedByState(existing)) {
      if (existing.wsUrl === wsUrl && existing.origin === origin) {
        printInfo(`✓ Web 已在运行：${origin}/（pid ${existing.pid}，ws ${wsUrl}）`)
        return EXIT.OK
      }
      fail(
        EXIT.REFUSED,
        `已有本脚本启动的 Web 服务器（pid ${existing.pid}，ws ${existing.wsUrl}）指向旧 daemon 端点；` +
          ' 先运行 scripts/agh/web.mjs stop 再 start（不会杀掉别的进程）。',
      )
    }
    printError(
      `⚠ 记录的 pid ${existing.pid} 未通过 /proc cmdline/scope 身份验证（疑似 PID 复用）；` +
        '已丢弃过期状态，未向该进程发送任何信号。',
    )
  }
  if (existing) await rm(STATE_PATH, { force: true })

  if (!(await portFree(port))) {
    fail(
      EXIT.REFUSED,
      `端口 ${port} 已被占用（不是本脚本的服务器，未做任何处理）。释放端口或设置 AGNES_WEB_ORIGIN 指向空闲端口后重试。`,
    )
  }

  await mkdir(STATE_DIR, { recursive: true, mode: 0o700 })
  const logHandle = await open(LOG_PATH, 'a', 0o600)
  const child = spawn(process.execPath, [agnesEntry(), 'serve'], {
    cwd: FITPLATE_ROOT,
    env: childEnv(),
    detached: true,
    stdio: ['ignore', logHandle.fd, logHandle.fd],
  })
  child.unref()
  await logHandle.close()

  // Wait for the launcher to answer its own origin before reporting readiness.
  const deadline = Date.now() + 30_000
  let page
  let exited = false
  child.once('exit', () => {
    exited = true
  })
  for (;;) {
    if (exited || !processAlive(child.pid)) {
      const tail = await readFile(LOG_PATH, 'utf8').catch(() => '')
      fail(EXIT.FAILURE, `agnes serve 未能启动；日志尾部：\n${tail.split('\n').slice(-8).join('\n')}`)
    }
    try {
      page = await loopbackGet(origin, '/', 2_000)
      if (page.status === 200) break
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) {
      try {
        process.kill(child.pid, 'SIGTERM')
      } catch {
        /* already gone */
      }
      fail(EXIT.FAILURE, `agnes serve 在 30s 内未在 ${origin} 提供页面；见 ${LOG_PATH}`)
    }
    await sleep(300)
  }
  if (!page.body.includes(wsUrl)) {
    try {
      process.kill(child.pid, 'SIGTERM')
    } catch {
      /* already gone */
    }
    fail(EXIT.FAILURE, `服务中的页面未携带 daemon 的 ws 端点（${wsUrl}）；日志见 ${LOG_PATH}`)
  }

  // Record the launcher's /proc identity before claiming it: exact argv, start time, and the
  // instance scope its environment must show. A child whose identity cannot be confirmed is
  // stopped again rather than recorded unverifiably.
  const identity = await readProcIdentity(child.pid)
  if (
    identity === null ||
    identity.cmdline.length === 0 ||
    identity.scope === null ||
    identity.scope.AGH_HOME !== cfg.aghHome ||
    identity.scope.AGNES_PROFILE !== cfg.profile ||
    identity.scope.AGNES_WEB_ORIGIN !== origin
  ) {
    try {
      child.kill('SIGTERM')
    } catch {
      /* already gone */
    }
    fail(EXIT.FAILURE, `无法确认 agnes serve（pid ${child.pid}）的 /proc 身份/scope；未记录状态，已停止该子进程。`)
  }

  await writeFile(
    STATE_PATH,
    `${JSON.stringify(
      {
        pid: child.pid,
        origin,
        port,
        wsUrl,
        assets,
        home: cfg.aghHome,
        profile: cfg.profile,
        socketPath: discovery.socketPath,
        launcher: `${agnesEntry()} serve`,
        cmdline: identity.cmdline,
        starttime: identity.starttime,
        log: LOG_PATH,
        startedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  )

  printInfo(`Web: ${origin}/   (ws ${wsUrl})`)
  printInfo(`assets: ${assets}（agnes serve 提供，含真实 BFF 接线）`)
  printInfo(`pid ${child.pid}；停止：scripts/agh/web.mjs stop`)
  return EXIT.OK
}

async function status() {
  const cfg = config()
  const { discovery } = await discoverDaemon()
  const state = await readState()
  const running = Boolean(state && processAlive(state.pid))
  if (!running) {
    printInfo('Web 服务器未运行（本脚本专属进程；daemon 由 scripts/agh/start.mjs 管理）')
    return EXIT.PRECONDITION
  }
  if (!(await ownedByState(state))) {
    printError(
      `⚠ pid ${state.pid} 存活但未通过 /proc cmdline/scope 身份验证（疑似 PID 复用或状态过期）；` +
        '不把它当作本脚本的 Web 服务器，也不发送任何信号。',
    )
    return EXIT.PRECONDITION
  }
  printInfo(`Web 服务器运行中：${state.origin}/（pid ${state.pid}，${state.launcher}）`)
  printInfo(`  服务于 ws ${state.wsUrl}，home=${state.home}，profile=${state.profile}，自 ${state.startedAt}`)
  if (!discovery?.web) {
    printError('⚠ daemon 当前不可发现；该页面将无法建立会话（先运行 scripts/agh/start.mjs）')
    return EXIT.PRECONDITION
  }
  if (discovery.web.url !== state.wsUrl) {
    printError(`⚠ daemon 的 ws 端点已变为 ${discovery.web.url}（服务器仍指向 ${state.wsUrl}）；运行 stop 后重新 start`)
    return EXIT.PRECONDITION
  }
  if (cfg.webOrigin !== state.origin) {
    printError(`⚠ 环境中的 AGNES_WEB_ORIGIN=${cfg.webOrigin} 与运行中的 ${state.origin} 不一致`)
    return EXIT.PRECONDITION
  }
  try {
    const page = await loopbackGet(state.origin, '/')
    printInfo(`  页面自检：GET ${state.origin}/ -> ${page.status}`)
  } catch (error) {
    printError(`⚠ 页面无响应：${error instanceof Error ? error.message : error}`)
    return EXIT.PRECONDITION
  }
  return EXIT.OK
}

async function stop() {
  const state = await readState()
  if (!state || !processAlive(state.pid)) {
    if (state) await rm(STATE_PATH, { force: true })
    printInfo('Web 服务器未运行，无需停止')
    return EXIT.OK
  }
  if (!(await ownedByState(state))) {
    await rm(STATE_PATH, { force: true })
    fail(
      EXIT.REFUSED,
      `拒绝停止 pid ${state.pid}：/proc cmdline/scope 身份与本脚本记录不符（疑似 PID 复用）；` +
        '未向该进程发送任何信号；已清除过期状态。',
    )
  }
  printInfo(`停止 Web 服务器 pid ${state.pid}（/proc starttime/cmdline/scope 身份已验证）`)
  try {
    process.kill(state.pid, 'SIGTERM')
  } catch (error) {
    printError(`无法发送 SIGTERM：${error instanceof Error ? error.message : error}`)
  }
  const deadline = Date.now() + 10_000
  while (processAlive(state.pid) && Date.now() < deadline) await sleep(100)
  if (processAlive(state.pid)) {
    fail(EXIT.FAILURE, `pid ${state.pid} 在 10s 内未退出；未强行 kill，请手工检查。`)
  }
  await rm(STATE_PATH, { force: true })
  printInfo('✓ 已停止')
  return EXIT.OK
}

await main(async () => {
  await ensurePrivateHome()
  const command = process.argv[2] ?? 'start'
  if (command === 'start') return start()
  if (command === 'status') return status()
  if (command === 'stop') return stop()
  fail(EXIT.USAGE, `未知子命令 ${command}；用法: web.mjs <start|status|stop>`)
})
