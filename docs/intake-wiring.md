# Intake 生产接线（P02-04/05 后端：工具 / 桥 / 注册表 / 查询）

> **2026-10-09更新：**[赛事规则](https://agnes-ai.cn/hackathon)不限定模型品牌；下文的未安装/待Agnes等是原交付时记录。最新已安装与会话失败状态见[项目说明](../README.md)，局部界面通过不能代替完整原生验收。

本文件记录 2026-10-08 落地的后端接线。附件适配与三工具定义见
[`docs/intake-host.md`](intake-host.md)（016，未改动）；compiler 合同见
[`docs/intake.md`](intake.md)。**浏览器表单/确认卡尚未实现**，真实 Agnes 新流程未验收。

## 1. 注册进 runtime 的接口

- 原生工具：原五个 CAD 工具 + `fitplate_get_request`（只读）、`fitplate_propose_constraints`
  （stage 写、每草稿审批 scope）、`fitplate_commit_task`（freeze 写、每草稿审批 scope）。
- 只读查询服务：原三个 + **`fitplate.intake`**（确认卡查询；`plugin/package.json` 与
  `plugin/extensions/main/agnes.client.json` 的 services 清单已同步）。
- 附件唯一来源仍是 `tctx.session.readAttachment`；模型参数只有 ref/hash 选择器。

## 2. 桥子命令（python_bridge.py）

| 子命令 | 输入（request 下） | 输出（data） |
| --- | --- | --- |
| `intake_compile_request` | `request`（IntakeRequest 文档） | `request_sha256`、`device_card{id,sha256}`、`draft`（含 `draft_hash`/`outcome`） |
| `intake_stage_request` | `request`、`draft_hash`、`attachment_sha256`、`attachment_ref?`、`session_scope` | `staged{request_id,request_revision,draft_hash,outcome,…}` |
| `intake_commit_task` | 同上 + `receipt`（`fitplate-confirmation-receipt`） | `task_id`、`task_revision`、`manifest_id`、`idempotent`、`directory` |

规则（全部真实执行，测试覆盖）：

- **规范哈希配方唯一（023）**：编译结果的 `request_sha256` 与 `device_card.sha256` 复用合同层
  公开的 `contract.content_sha256`/`canonical_json`（值规格化 + 键排序 + `ensure_ascii=False`），
  与 core draft 里的 `request_sha256`/`device_card_sha256` **恒等**——中文/非 ASCII/浮点输入
  不例外；stage/commit 输出的 `request_sha256` 同源。此前 bridge 自写的
  `json.dumps(..., separators=(",", ":"))` 副本（默认 `ensure_ascii=True`）与 core 配方漂移，
  已删除该副本，不再手抄相似配方。**附件原始字节 SHA**（adapter 对真实附件字节计算）是另一
  个概念、保持不变：同一文档两种字节写法（缩进/键序不同）原始 SHA 不同而规范哈希相同，二者在
  返回里都可见且不互相替代。
- 注册表固定在 `<workspace>/input/intake-registry`（子命令/参数都不接路径）；卡只按安全 id 从
  受信 `data/devices/` 读取（路径/符号链接拒绝由 intake 内核执行）。
- **scope 必须等于本次调用的 Host `session.key:lane`**（桥从顶层 session 计算，payload 自报
  的 scope 只是被比对的对象）；receipt 的 `session_scope` 先于内核再核一次。receipt 由 JS
  受信适配层构造，Python 侧没有 `confirmed` 旁路。
- stage/commit 都**重编译并比对 `draft_hash`**；NEEDS_INPUT 草稿可以 stage（新 revision 会
  顶掉旧草稿），只有 `READY_TO_CONFIRM` 能 freeze；同确认幂等、不同内容 `IDENTITY_CONFLICT`、
  篡改/符号链接/坏索引一律拒绝（`index.json`/revision 字节逐项 hash 核验）。
- stage 成功后写 stage 绑定的只读快照三元组（原子写、大小上限）：草稿字节
  `r<rev>-<draft_hash>.draft.json` → 阶段权威侧车 `…stage-authority.json` → `latest.json` 指针，
  按此顺序写入，指针是提交标记。权威侧车**逐字段照抄受锁 stage 记录**（id、revision、
  request/attachment/device-card hash、outcome、scope、staged_at）并补上记录不可能知道的
  事实（草稿字节 SHA、attachment ref、桥顶层 Host session 的 `key`/`lane`——不取自模型
  payload）；指针只是定位器 + 逐字段副本 + 权威文件字节 SHA。崩溃/半写状态没有指针（或指针
  与权威不符），查询服务明确拒绝；同请求重 stage 幂等并重写三者。

## 3. 注册任务与 load_task

- 冻结任务 id 由程序从 request id 稳定生成：`user-<request_id>`；同 request 新 revision 冻结为
  同 task 的新 revision（`tasks/<task_id>/r<NNN>/` 不可变，含 task/scene/input-manifest）。
- `fitplate_load_task` 先查固定注册表：命中则用 `read_task_bundle` 读**精确 revision**并核
  hash；请求的 revision 早于 latest 时 `STALE_INPUT`（旧 run 仍按原冻结有效，UI 标旧要求），
  绝不据此开新 run。未命中注册表才回落到原 `input/tasks/<id>` 夹具路径（行为不变）。
- **幂等预算**：同 `session.key/lane` + 同 task/revision/输入字节身份 + 同预算配置的重复 load
  不再新建空 run，而是复用本会话已创建的 run，返回其 `status`/`candidates`/`budget`
  （`reused:true`）——重复 load 不重置四候选或时间预算。另一 session/lane、另一 revision/输入、
  另一预算配置都各自独立（不同的 run）；切换任务 id 属于不同身份。并发 load 由
  `runs/.load.lock` 串行化（scan+create 原子）；**复用分支在同一把 run 锁（build/validate 用的
  `RunLock`）下重读 manifest 再追加事件**，扫描后并发写入的 budget/candidates 不会被过期副本
  覆盖。预算/超时/候选上限只来自受信 config，模型 payload 里的同名字段不是预算来源。
  （锁序恒为 `.load.lock` → `RunLock(run)`，与新建分支一致，无环。）
- `runs/<run_id>/manifest.json` 的 `frozen.source` 记录来源（`intake-registry` /
  `workspace-task-dir`），身份比较包含它。

## 4. fitplate.intake 查询（只读）

输入 `{session_key, request_id?}`；输出本 session 当前 stage 的 request/attachment ref 与
SHA、完整 ConstraintDraft、设备卡 id/sha256、注册 task 的 revision 列表。

- 所有读取经 `serviceCtx.fs`、固定在 `input/intake-registry` 内，`stat` 先行 + 读写前后双重
  大小上限（index 512 KiB / pointer 64 KiB / authority 64 KiB / draft 128 KiB）；stat 的 size
  必须有限非负且与读回字节数一致；叶子符号链接/非普通文件、非 UTF-8 字节（fatal 解码，不做
  U+FFFD 替换）一律拒绝。`fs.read` 不带 offset/limit——Host 的 offset/limit 是行窗口语义
  （整文件读出后按行切），字节上限由本服务自己核。
- 目录组件用 `fs.list` 逐级核对（Host `fs.stat` 只 lstat 最后一段、父组件会被解析掉，父目录
  被换成符号链接时 stat 看不见；list 会如实报告 symlink），任一组件是符号链接 → `PATH_UNSAFE`。
- `session_key` 只是**一致性过滤**，且与 stage 时由桥顶层 session 记录的 `host_key` **精确
  相等**——某 key 只是另一 session key 的前缀时绝不匹配（不再用 scope 前缀推断）；跨 session
  查询返回 `SESSION_MISMATCH`/`NO_STAGED_REQUEST_FOR_SESSION`。同 key 不同 lane 的记录同属
  该 session 可见（过滤非授权）。
- **新工作区等待 vs 明确异常（024）**：确实"尚未登记"才是等待——`fs.list` 成功且组件确实缺失，
  或注册表目录已出现而 `index.json` 尚未原子落盘（mkdir 与 os.replace 之间的 stage 窗口）：
  request_id 模式返回 `REQUEST_NOT_STAGED`、latest 模式返回 `NO_STAGED_REQUEST_FOR_SESSION`
  （正是前端 polling 的等待 reasons，UI 无需改动）。列表/读取失败（权限/IO）、组件非目录、
  symlink、index 存在但非普通文件或 JSON 损坏（`REGISTRY_INDEX_INVALID`）一律是明确异常，
  **绝不**伪装成等待；缺失只凭**成功的 list** 结论，不解析 error.message 假装 ENOENT。已登记
  记录的快照缺失/损坏仍是 `SNAPSHOT_MISSING` 等明确拒绝（重 stage 可恢复）。
- 索引记录是唯一锚点：**每条 stage 记录先做 shape / id 安全域 / revision / hash / scope 校验，
  才会据其构造任何路径**——坏记录返回 `STAGE_RECORD_INVALID`（latest 选择也对全部记录整体
  校验，不静默跳过、不因坏值抛未捕获异常）。随后阶段权威侧车与索引记录**逐字段**核对，指针
  与权威逐字段核对且权威文件字节 SHA 与指针一致，草稿字节 SHA 与权威一致，草稿内容属于该
  stage，才返回；缺失/过期/被篡改分别 `SNAPSHOT_MISSING`/`SNAPSHOT_STALE`/
  `SNAPSHOT_TAMPERED`——**不凭文件名猜最新、不把旧草稿当 READY、不让 pointer 自证**。
- 边界（明说而非假装）：服务核对的是 stage 文件之间的一致性（索引 + 权威侧车 + 指针 + 草稿
  字节），不是密码学作者身份——能整体一致重写整个工作区的写入者不在本服务的威胁模型内（工作
  区里没有签名密钥）。020 之前写入的旧版快照（无权威侧车）会被明确拒绝，重 stage（幂等）即可
  升级。服务不 exec、不写，也不替代附件重扫与真人确认（返回值带 scope 说明）。

## 5. prepare-workspace：登记任务的精确 revision

任务 id 解析顺序：`fixtures/dev` → `evaluation/input-cases` → 注册表。注册表只按**固定规则**
搜索 `<project>/runs/sessions/*/input/intake-registry` 与 `demo-workspaces/*/input/intake-registry`
（CLI 不接受任何注册目录参数）；同一 id 命中多个注册表 → 拒绝（不猜）。命中的 revision 经
`scripts/intake-read-revision.py` → `fitplate.intake.read_task_bundle` 逐 hash 核验后按字节复制，
并在目标 task 目录写 `registry-source.json`（来源/ revision / is_latest / manifest_id）。
`--revision N` 只在登记任务上选择精确 revision（缺省 latest）；夹具任务的 revision 来自其文档。

## 6. 激活与未验事实

- 源码改好 ≠ AGH已用：需 root 重新打包/安装插件快照（含 skill trust）后新工具/服务才生效；
  旧 fixture 工作区与既有 run 证据不受影响。
- 2026-10-08（020）修复：独立反例暴露的只读查询问题已修——精确 Host session key 匹配（不再
  scope 前缀推断）、stage 权威侧车绑定（pointer 不再自证）、索引记录路径构造前逐项校验、fatal
  UTF-8 与 stat 大小核验、目录组件符号链接逐级核对、load 复用持 run 锁并重读 manifest。均为
  离线纯测试（含真实 bridge 并发负例），**未安装、未做原生用户入口验收**。
- 2026-10-08（023）修复：原生真实 get_request 出现 wrapper 卡 hash 与 draft 卡 hash 两个值
  （规范配方漂移），已按上文"规范哈希配方唯一"改为复用合同层公开配方；stage 记录/快照权威
  侧车/查询服务本就取 core 绑定（权威侧车逐字段照抄受锁 stage 记录）。020 的 stage/侧车合同与
  原子性、重复 load 预算语义均未改。离线纯测试（真实 bridge 规范相等 + 原始字节/规范可区分），
  **未安装、原生复测仅 root**。
- 2026-10-08（024）修复：原生新工作区首次 poll 曾把"尚未登记"报成 `REGISTRY_NOT_AVAILABLE`，
  前端 `readOnce` 视为异常并停止轮询，之后真实 stage 也无法自动显示。现按上文严格区分等待
  （确实缺失 / index 未落盘的 stage 窗口 → `REQUEST_NOT_STAGED` / `NO_STAGED_REQUEST_FOR_SESSION`）
  与明确异常（权限/IO、非目录、symlink、坏 JSON → 异常码）。真实 IntakeController + 真实
  compile/stage bridge 监督反例 4/4（before 1/4）；离线纯测试；**未安装、原生复测仅 root**。
- 未验：浏览器表单/确认卡、真实 Agnes 八门槛新流程、真实附件端到端（016 适配层已单测）、
  CAD 相关回归（本轮仅纯测试）。`reused` 幂等规则是 017 起的合同，旧"每次 load 新 run"的调用
  方（若有）需按此更新。
