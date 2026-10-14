// Stop the isolated FitPlate AGH daemon (and only it: same home/profile scope).
//
// Usage: <AGH_SOURCE_ROOT>/node_modules/.bin/tsx scripts/agh/stop.mjs
// Exit codes: 0 stopped or already stopped · 1 failure.
import { EXIT, fail, main, printInfo, runAgnes } from './lib.mjs'

await main(async () => {
  const stopped = await runAgnes(['daemon', 'stop'], { timeoutMs: 120_000 })
  const text = (stopped.stdout || stopped.stderr).trim()
  if (text) printInfo(text)
  if (stopped.code !== 0) fail(EXIT.FAILURE, `daemon stop 失败（exit ${stopped.code}）`)
  printInfo('✓ 隔离实例已停止（不影响其他 AGH home/profile 的进程）')
  return EXIT.OK
})
