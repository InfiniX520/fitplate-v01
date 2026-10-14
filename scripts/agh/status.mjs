// Read-only status check for the isolated FitPlate AGH instance.
//
// Usage: <AGH_SOURCE_ROOT>/node_modules/.bin/tsx scripts/agh/status.mjs
// Exit codes: 0 daemon ready · 3 daemon not running (details on stderr) · 1 unexpected.
import { EXIT, config, main, closeClient, openClient, printInfo, printError, runAgnes } from './lib.mjs'

await main(async () => {
  const cfg = config()
  const version = await runAgnes(['--version'], { timeoutMs: 60_000 })
  printInfo((version.stdout || version.stderr).trim())
  printInfo(`实例：home=${cfg.aghHome} profile=${cfg.profile} workspace=${cfg.workspace} webOrigin=${cfg.webOrigin}`)

  const status = await runAgnes(['daemon', 'status'], { timeoutMs: 60_000 })
  const statusText = (status.stdout || status.stderr).trim()
  printInfo(statusText)
  if (status.code !== 0) {
    printError(`daemon 未就绪（exit ${status.code}）；运行 scripts/agh/start.mjs 启动隔离实例`)
    return EXIT.PRECONDITION
  }

  const { client } = await openClient()
  try {
    const snapshot = await client.config.get()
    printInfo(
      `config: configured=${String(snapshot.configured)} revision=${snapshot.revision} ` +
        `provider=${snapshot.provider?.id ?? '(无)'} route=${snapshot.provider?.route ?? '(无)'} ` +
        `model=${snapshot.provider?.model ?? '(无)'} credentialConfigured=${String(snapshot.provider?.credentialConfigured ?? false)}`,
    )
    const { packages } = await client.packages.list({ profile: cfg.profile })
    if (packages.length === 0) printInfo('packages: (无)')
    for (const row of packages) {
      printInfo(`package: ${row.id}@${row.version} desired=${row.desired} actual=${row.actual} trusted=${String(row.trusted)}`)
    }
    printInfo('✓ 隔离实例状态检查完成')
    return EXIT.OK
  } finally {
    await closeClient(client)
  }
})
