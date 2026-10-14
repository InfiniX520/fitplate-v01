# AGH 开发底座（T01 / GATE-A）

> **2026-10-09更新：**[赛事规则](https://agnes-ai.cn/hackathon)允许第三方模型参与核心任务，AGH仍是实际执行底座。下文保留各日期的开发/Agnes接入记录；“赛事必须Agnes、DS只能开发”的旧解释失效。现有脚本的provider限制是实现事实，尚未因文档更新而解除。必要AGH二次开发可另版验收；当前版本/补丁、模型身份与原生诊断需登记。

本文记录 FitPlate 在开发阶段使用本机已有 Agnes Harness（AGH）的独立实例：范围、准确命令、
已验证与未验证的事实、进程与停止方式。**本段记录最初开发阶段；其真实DS轨迹可按原身份作为执行证据，不代表当前新入口已经验收。**

## 1. 结论速览

已在本机真实跑通（证据见 `runs/smoke/`）：

1. 独立 AGH 实例（私有 `AGH_HOME`、`local-dev` profile）启动、就绪、可停止；
2. 复用本机 Claude Code 的 DeepSeek API 凭据，经 AGH **正式 configuration 服务**（SDK `client.config.*`）
   验证目录并保存到 AGH secret store；
3. 自有最小原生插件 `@fitplate/smoke-plugin`（工具 `fitplate_smoke_probe`）经真实摘要
   inspect → install → trust → enable，`trusted=true / desired=enabled / actual=running`；
4. 真实 DeepSeek 请求（deepseek-flash，thinking=max）**原生工具调用**成功，并导出原生 Agnes JSONL 与 HTML。

## 2. 环境与版本（非秘密）

| 项 | 值 |
| --- | --- |
| AGH 源码（只读） | `/home/Heliora/ANG/agnes-harness`，`agh --version` 报 `agh 0.0.0 node 24.21.0 protocol _agnes/v1`（源码树自带版本号 0.0.0） |
| Node / 包管理器 | v24.21.0；pnpm 10.34.5（本次未安装任何依赖，未重建 AGH） |
| 脚本运行时 | AGH 仓库自带的 `node_modules/.bin/tsx`（SDK/daemon 的 dist 入口仍引用工作区 TS 源码，需 tsx 执行） |
| Provider / 模型 | AGH 原生 `deepseek` provider（`https://api.deepseek.com`，openai-completions）。真实受支持目录（远端目录 ∩ AGH 已评审目录）为 `deepseek-flash`、`deepseek-v4-pro`；选用 `deepseek-flash`（用户当前 Flash 档） |
| 思考档 | 按 adapter 声明取最高档 `max`（`deepseek-flash` 的 `thinkingLevelMap` 支持 low/high/max；`max` 有映射）。只写入本实例账号的 `defaultSettings`，**未改动 AGH 全局默认**（AGH 自带流程默认 high） |
| 会话上下文预算 | 未显式设置，沿用目录容量 1000000（`x/core/model-switch` 事件可证） |

## 3. 隔离实例

| 项 | 值 |
| --- | --- |
| `AGH_HOME` | `/home/Heliora/work/fitplate/.agh-home`（私有目录，必须 0700） |
| `AGNES_PROFILE` | `local-dev` |
| workspace | `/home/Heliora/work/fitplate`（daemon 从项目根启动；`file:` 源相对它解析） |
| `AGNES_WEB_ORIGIN` | `http://127.0.0.1:4387`（刻意避开日常实例的默认 Origin） |
| socket | `.agh-home/data/daemon/agnesd.sock` |
| dataDir | `.agh-home/data` |

不重设 `HOME`/`CODEX_HOME`，不修改 `~/.claude`、`~/.agh`、代理与 shell 配置，不使用 sudo，
不停止日常 daemon（不同 home/profile 即不同 scope，互不影响）。

### 本机特有的一次性事实：代理

本机经环境变量 `HTTP(S)_PROXY`（本地代理）才能连到 `api.deepseek.com`；Node 的全局 fetch 默认忽略
这些变量，因此脚本给子进程加了 `NODE_USE_ENV_PROXY=1`（仅进程级，见 `scripts/agh/lib.mjs`）。
缺少它时 `config.test` 会返回 `verified=false`（目录探测失败），凭证本身没有问题。

## 4. 命令（全部可复跑）

脚本以 AGH 自带的 tsx 执行；路径默认指向本机位置，均可用 `AGH_SOURCE_ROOT` / `AGH_HOME` /
`AGNES_PROFILE` 覆盖。

```sh
cd /home/Heliora/work/fitplate
T=/home/Heliora/ANG/agnes-harness/node_modules/.bin/tsx

$T scripts/agh/start.mjs              # 启动/确认隔离 daemon          退出码 0 就绪 · 1 失败 · 3 未就绪
$T scripts/agh/configure-deepseek.mjs # 复用 DS 凭据并保存账号         0 已保存 · 3 无凭据/daemon 未运行 · 4 被拒绝
$T scripts/agh/configure-deepseek.mjs --probe   # 只探测凭据是否存在（无网络、无写入）
$T scripts/agh/package-smoke.mjs      # inspect→install→trust→enable   0 完成且 running · 4 被拒绝
$T scripts/agh/run-smoke-session.mjs  # 真实模型请求+导出+原生调用验证  0 已验证 · 4 未通过
$T scripts/agh/status.mjs             # 只读状态总览                   0 就绪 · 3 daemon 未运行
$T scripts/agh/stop.mjs               # 停止隔离实例
```

脚本只通过公开入口（`@agnes/sdk`、`@agnes/daemon` 的包入口）与 daemon 通信；不深导入私有模块、
不手写 `configuration.json`/revision。等价的手工 CLI 路径：`agh daemon start|status|stop`、
`agh -p --mode json --cwd …`、`agh export <id> --format agnes|--html -o …`。

### 复跑注意

- HOME 根必须 0700：AGH secret store 校验根目录权限，0755 会让 `config.save` 返回
  `SEMANTIC_REJECTED:CONFIG_CREDENTIAL_STORE`（脚本已在启动/配置前自动收紧）。
- `--model` 槽位名是 `primary`（不是 `main`），未知槽位直接用法错误退出。
- 重新运行 `package-smoke.mjs` 会以相同摘要再走一遍 install/trust/enable（幂等，本次已复跑验证）。
- 重新运行 `configure-deepseek.mjs` 复用同一账号（revision 递增，本次已复跑验证）。
- `run-smoke-session.mjs` 每次产生 **1 次真实计费模型请求**；不要无目的地反复运行。

## 5. 凭据处理

- 唯一读取的文件：`~/.claude/settings.json`，由短 Node 程序在内存中解析；只接受
  `settings.env.ANTHROPIC_BASE_URL` 指向 `api.deepseek.com` 时的 `ANTHROPIC_AUTH_TOKEN`
  （其次 `ANTHROPIC_API_KEY`）。未读取任何 Claude OAuth 凭据。
- 值不打印、不入日志/轨迹/README、不进命令行参数；脚本输出只含键名、endpoint host 与布尔。
- 提交路径：SDK `client.config.test` → `client.config.save`（本地 unix socket，仅送到 daemon），
  由 AGH 存入 secret store：`.agh-home/secrets/deepseek/<ref>`（目录 0700、文件 0600）。
- 只发送到 `https://api.deepseek.com`；不猜测 endpoint 或模型别名（模型必须出现在真实返回目录中）。
- 若将来该文件不再包含可用 DS 凭据，`configure-deepseek.mjs --probe` 会明确报告
  “未找到可复用 DS API 凭据”并以退出码 3 结束。

## 6. 插件与验收证据

`smoke-plugin/`（只读、无依赖、自包含 ESM）：

- manifest：`agnes.plugins[{ export:"smokeProbe", id:"ext:fitplate/smoke-plugin", runtime:"in-process", inject:["extension"] }]`；
- 工具 `fitplate_smoke_probe`：TypeBox 标记的参数 schema（`text`，必填，`additionalProperties:false`），
  完整 8 键 `ToolMeta`（只读/非破坏/并发安全/封闭世界/`replay:"safe"`/`costHint:undefined`/
  `deferLoading:false`/`requiresApproval:"never"`），返回**计数与版本**，无任何 Python/CAD 伪装结果。

安装走 Host 正式审查（真实摘要，未跳过）：integrity
`sha256-28a32ef5…25e28`、capabilityHash `e3de4e5f…22b01`；三条 operationId 与复跑 id 见
`runs/smoke/README.md`。未安装任何联网第三方插件（唯一提示是 `file:` 源的 `unverified-provenance` 警告）。

真实会话证据（`runs/smoke/`）：

- session `agnes:local:local-dev:cli:workspace:4c3da557afb52d14`，`reason=completed`；
- 原生 `tool/call`：`fitplate_smoke_probe {text:"fitplate gate-a smoke"}`，
  `resolvedPolicy={isReadOnly:true,replay:"safe",requiresApproval:"never"}`；
- 原生 `tool/result`：`isError=false`，`structured={"probe":"fitplate_smoke_probe","version":"0.1.0","characters":21,"words":3}`，
  与按同一文本本地计算的期望计数一致（模型复述数字不算通过）；
- 导出：`<id>.agnes.jsonl`（原生格式）与 `<id>.html`；验证脚本只读 `tool/*` 事件，
  **不读取/展示模型思维链**。

## 7. 进程与停止

当前运行中的是本任务创建的隔离实例：

- pid `13213`（2026-10-07 09:37 启动，`agh daemon status` 可复核），socket
  `/home/Heliora/work/fitplate/.agh-home/data/daemon/agnesd.sock`；
- 停止：`$T scripts/agh/stop.mjs`（等价于 `AGH_HOME=… AGNES_PROFILE=local-dev node <AGH>/packages/cli/dist/local/agnes.mjs daemon stop`）；
- 日志/会话数据留在 `.agh-home/`（私有，勿提交）；删除该目录即可彻底清场（先停止实例）。

禁止用 `pkill` 之类的全局清理：日常实例（默认 `~/.agh`）与本实例是不同 scope，请始终用带
`AGH_HOME`/`AGNES_PROFILE` 的 `daemon stop` 精确停止。

## 8. 已验收 / 未验收（诚实边界）

已验收（本机、真实运行）：

- 真实 AGH + 原生 DeepSeek provider + 真实模型请求 → 最小原生工具调用 → 原生轨迹导出，链路完整；
- 插件生命周期含 Host package 审查与真实摘要绑定；
- 脚本可复跑（start/stop、configure、package 均已复跑验证）。

未验收 / 未完成：

- **赛事 Agnes 验收未进行**：当前 DeepSeek 仅为开发阶段复用，Agnes 账号/网关尚未配置；
- 未做批量评测、未做多会话并发/长任务、未验证压缩（compaction）与预算路径；
- 未在 Windows/macOS 或打包分发上复验；本机为 WSL2（`uname` 6.18.40.1-microsoft-standard-WSL2）；
- Codex 独立验收待执行（重跑第 4 节命令即可；预期 `.agh-home` 为全新目录时可完整重建）；
- 插件仅在 `file:` 源安装链路验证；联网第三方目录、更新/回滚路径未验证。

## 9. 目录与文件

| 路径 | 作用 |
| --- | --- |
| `scripts/agh/lib.mjs` | 公共入口加载、scope/发现、SDK 连接、子进程环境（含 `NODE_USE_ENV_PROXY`）、scope 表、thinking 声明解析、Agnes key 文档解析、退出码工具 |
| `scripts/agh/{start,stop,status,configure-deepseek,configure-agnes,package-smoke,run-smoke-session}.mjs` | 上述命令 |
| `smoke-plugin/` | 最小原生插件（package.json + index.mjs） |
| `demo-workspaces/smoke/` | smoke 会话 cwd（刻意留空） |
| `.agh-home/` | 私有隔离 home（不提交） |
| `.agh-home-competition/` | 竞争 scope 私有 home（不提交；`.gitignore` 用 `.agh-home*/` 覆盖所有变体） |
| `runs/smoke/` | 证据输出（不提交，见其 README） |

## 10. Plan02 竞争作用域（P02-02：实现已落地，八门槛未实测）

赛事实例与 DS 开发实例严格分离，用 `FITPLATE_SCOPE=competition` 选择（`scripts/agh/lib.mjs`
的 `SCOPES`）：home=`.agh-home-competition`（实测 0700）、webOrigin=`http://127.0.0.1:4388`，
workspace 同为项目根。所有脚本（start/status/stop/web/package-fitplate/run-fitplate/
configure-agnes）都从同一 scope 派生 home/profile/workspace/origin；Web 状态按 scope 分目录
（dev 保留 `.cache/agh-web`，其它 scope 为 `.cache/agh-web-<scope>`），两个 scope 不会互相
接管或停止对方的 launcher。

profile 名复用内建模板 `local-dev`：本 AGH 版本只解析 `TEMPLATE_NAMES = ['local-dev',
'enterprise']`（`packages/host/src/profile/templates.ts:139`，profile 解析时无条件调用），
`AGNES_PROFILE=competition` 会以 `E_DEP_MISSING: no builtin template competition` 终止
（2026-10-08 实测）；因此隔离由 home + origin 提供，profile 名不能自定义（除非改 AGH 核心，
本项目不做）。

```sh
T=/home/Heliora/ANG/agnes-harness/node_modules/.bin/tsx
cd /home/Heliora/work/fitplate

FITPLATE_SCOPE=competition $T scripts/agh/status.mjs            # 只读：显示竞争 scope 的 home/origin
FITPLATE_SCOPE=competition $T scripts/agh/configure-agnes.mjs --probe \
  --key-file /home/Heliora/ANG/key.md                           # 只探测 key 文档字段；无网络无写入
FITPLATE_SCOPE=competition $T scripts/agh/configure-agnes.mjs   # Codex 执行：config.test→save 官方 agnes-ai
FITPLATE_SCOPE=competition $T scripts/agh/start.mjs             # 启动竞争 daemon（:4388）
FITPLATE_SCOPE=competition $T scripts/agh/package-fitplate.mjs  # 在该 scope 安装插件快照
FITPLATE_SCOPE=competition $T scripts/agh/run-fitplate.mjs \
  --case n01-basic-plate --expect normal                        # 八门槛示例（见下）
FITPLATE_SCOPE=competition $T scripts/agh/run-fitplate.mjs \
  --case sensor-swap-01 --expect pass                           # 旧布局冲突→修复
FITPLATE_SCOPE=competition $T scripts/agh/run-fitplate.mjs \
  --case f01-missing-hole-spacing --expect refuse               # 缺尺寸：程序 NEEDS_INPUT
FITPLATE_SCOPE=competition $T scripts/agh/run-fitplate.mjs \
  --case f02-ligament-conflict --expect refuse                  # 可证明不可行：程序 INFEASIBLE
FITPLATE_SCOPE=competition $T scripts/agh/stop.mjs
```

- scope 边界（`config()` 每次解析后校验，单字段 env 覆盖也逃不掉）：competition scope 的
  `AGH_HOME` 若（经 realpath/规范化，含 `..` 与已存在 symlink 别名）等于或位于开发
  `.agh-home` 或日常 `~/.agh` 内，直接拒绝；`AGNES_WEB_ORIGIN` 不得等于开发 origin
  `http://127.0.0.1:4387`；显式独立 home+origin（如 `/tmp/...` + `:4399`）仍允许。`--task`
  默认路径不变；`--case` 只接受公开注册（fixtures/dev 或 evaluation/input-cases 的 ID，
  含 `../`、未知 ID、evaluation/private 一律拒绝），复制走 prepare-workspace 的
  `copyTaskInputs`（含单位换算与缺项语义）：缺尺寸的 F01 原样复制、绝不本地预判，让模型
  从 `fitplate_load_task` 的真实业务拒绝里看到缺什么。八门槛是**已见题的集成调试**，不是
  未见评测。
- 凭据：`configure-agnes.mjs` 只读 `--key-file`（默认 `/home/Heliora/ANG/key.md`；等价专用 env
  `FITPLATE_AGNES_KEY_FILE` 给路径）；`parseAgnesKeyDocument` 只接受标签形如 API Key/密钥/令牌
  且值形如 token 的行——只去首尾 Markdown 引号/围栏，**不改 token 内部下划线**；多个候选时
  优先 Agnes 标签，出现不同值即拒绝（`conflict`），未匹配则前置失败、不猜行。`config.test`
  与 `config.save` 失败只输出枚举 code/reason/name，不输出 message/RPC 请求或响应体（可能回显
  密钥）。值不打印、不写文件、不进 hash；非 competition scope 直接拒绝（exit 4，实测）。
  endpoint 必须是本地 AGH 定义的 `https://api.agnes-ai.cn/v1`，保存后复查 provider 身份为
  `agnes-ai`，无第三方回退。
- 模型/参数：默认 `agnes-3.0-flash` 必须出现在真实 `config.test` 目录里（2026-10-08 官方
  catalog 只有它，见 `ANG/logs/plan02/official-model-catalog.json`；静态注册里的 2.5pro/alpha/
  beta/flash/2.0flash 未获实测，不算可用）。thinking 按模型自身声明解析：官方 agnes-ai 定义
  `reasoning:false` ⇒ 不发送该参数并记录；DS 仍取声明最高档 `max`（行为保留）。
- 运行期望：`--expect pass` 语义不变（修复演示）；新增 `normal`（首版通过即可，仍要求绑定导出
  与正常终态）与 `refuse`。`refuse` 只承认**本次指定 task/revision** 的
  `fitplate_load_task` 业务拒绝（其他 task/revision、build/get_run 的 NEEDS_INPUT、模型自述都
  不算；INFEASIBLE 必须带真实 findings 证明），且要求正常终态、无任何成功 PASS 验证或成功
  导出（未绑定的别 run 成功也算失败；`failed:true` 诊断导出不算成功）。**范围说明**：该期望只
  验证「程序拒绝 + 终态」，模型最终解释的语义正确性属另一维度（8 门槛评审），运行器不做语义
  判分、也不做裸 PASS 文本搜索。300s 超时与 4 候选预算未改。
- **未验事实（勿当已完成）**：真实 Key 的 `config.test/save`、竞争 daemon 真实启动、竞争 scope
  的 package 安装、官方模型 8 次门槛、真实 Agnes 原生轨迹——由 Codex 用参赛 Key 执行；
  本仓库不读取真实 Key。
