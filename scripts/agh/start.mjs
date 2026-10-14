// Start (or verify) the isolated FitPlate AGH daemon.
//
// Usage:  <AGH_SOURCE_ROOT>/node_modules/.bin/tsx scripts/agh/start.mjs
// Env:    AGH_HOME (default <fitplate>/.agh-home), AGNES_PROFILE (default local-dev),
//         AGH_SOURCE_ROOT (default /home/Heliora/ANG/agnes-harness)
//
// Purpose: bring up the dedicated daemon for the isolated home/profile without touching any
// other instance. Idempotent: an already-ready daemon is reported, not restarted.
// The profile's capability ceiling is ensured first (defaults + `services`); when that changes
// the profile, only this script's own daemon is stopped so it boots on the new profile.
// Exit codes: 0 ready · 1 failure · 2 usage · 3 daemon not ready afterwards.
import { EXIT, config, ensurePrivateHome, ensureProfileCeiling, fail, main, openClient, closeClient, printInfo, printError, runAgnes } from './lib.mjs'

await main(async () => {
  const cfg = config()
  await ensurePrivateHome()

  printInfo(`实例：home=${cfg.aghHome} profile=${cfg.profile} workspace=${cfg.workspace}`)
  const ceiling = await ensureProfileCeiling()
  if (ceiling.created) {
    printInfo(`已写入 ${ceiling.path}（模板默认能力集 + services）`)
    // A running daemon keeps the profile it resolved at boot; restart only our own instance.
    const stopped = await runAgnes(['daemon', 'stop'], { timeoutMs: 60_000 })
    if (stopped.code !== 0) printInfo(`（daemon stop 退出 ${stopped.code}：未运行或已停止）`)
  } else if (ceiling.missingServices) {
    printError(`⚠ ${ceiling.path} 已存在但未列出 services 能力；注册查询服务的行会被 E_CEILING_EXCEEDED 拒绝，请手工加入`)
  }
  const started = await runAgnes(['daemon', 'start'], { timeoutMs: 300_000 })
  if (started.code !== 0) {
    printError(started.stderr.trim() || started.stdout.trim())
    fail(EXIT.FAILURE, `daemon start 失败（exit ${started.code}）`)
  }

  const status = await runAgnes(['daemon', 'status'], { timeoutMs: 60_000 })
  if (status.code !== 0) {
    printError(status.stderr.trim() || status.stdout.trim())
    fail(EXIT.FAILURE, `daemon status 失败（exit ${status.code}）`)
  }
  printInfo(status.stdout.trim())

  // Prove discovery + SDK handshake through the same scope resolution the CLI uses.
  const { scope, discovery, client } = await openClient()
  try {
    printInfo(`socket=${discovery.socketPath}`)
    printInfo(`dataDir=${scope.dataDir}`)
    printInfo('✓ 隔离 daemon 已就绪')
  } finally {
    await closeClient(client)
  }
  return EXIT.OK
})
