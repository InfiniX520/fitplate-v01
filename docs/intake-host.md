# 会话附件适配与 intake 工具定义（P02-05，未接线）

> **2026-10-09更新：**[输入处理说明](intake.md)允许补充模型字段提议；下文记录当前确定性编译/登记实现，接口尚未改变。尤其“AI只解释、不改编译值”属于现有工具设计，不是赛事规则。新提议接口仍须绑定原始输入、程序校验、明确确认和任务版本；不能只改文档便宣称已支持语义提议。

本文件描述两个**新增、尚未接入 runtime** 的模块：

- `plugin/src/intake-attachments.mjs`：从 Host 的会话附件 reader 里**选择并验证**用户的请求/
  确认附件（Plan02 §4.3 附件路线）；
- `plugin/src/intake-tools.mjs`：三个工具定义
  `fitplate_get_request` / `fitplate_propose_constraints` / `fitplate_commit_task`，沿既有
  TypeBox / ToolMeta / `callBridge` / `PluginError` 合同。

本文这两个模块自身不修改任何冻结文件；geometry、schema、scorer 都不动（runtime 注册与真实
bridge 子命令属于并行的 017 接线包，文件归其所有，本文不描述其状态）。用户入口（表单/确认卡/
原生审批）未完成，**尚无生产真实端到端**。

## 1. 附件的唯一来源与形状

- 读取**只**经 `tctx.session.readAttachment`（官方 core 实现；本机已实测可读真实附件）。工具参数
  只是**选择器**（`session-file://<seq>/<index>` ref 与 64 位 hash），永不携带内容、receipt 或
  session scope。
- 只接受两个正式文件名：`fitplate-request.json`、`fitplate-confirmation.json`，mime 必须是
  `application/json`；严格 UTF-8（fatal）、≤64 KiB、JSON 对象。
- 列表分页遵守官方 `[read session-file://list with offset=N to continue]`；名称按官方
  `JSON.stringify` 转义解析。**列不完（页数上限/offset 不前进/行不可解析）一律 fail-closed**，
  绝不回退旧附件。
- 选择按 `(event seq, block index)` 取**最新**（同 seq 比 index），不信列表顺序、不信调用方
  selector 覆盖；**先按同名取最新，再核 mime**：最新同名附件的 mime 不是 `application/json` 时以
  `ATTACHMENT_MIME_INVALID` 明确拒绝（`STALE_INPUT`）——不读、不编译、不提交、**绝不回退**到更旧
  的合法文件（先筛 mime 会忽略最新输入、让旧稿复活）。最新请求损坏/超限/无权限时同样明确失败，
  不读更旧的那份。
- 所有进入选择/分页的整数——ref 的 `seq`/`index`、列表行 `ordinal`/`seq`/`index`、continuation
  `offset`——必须是**精确**的正安全整数：数字串经 `Number()` 必须原样往返，否则在任何 reader 调用
  或页游标比较**之前** fail-closed（ref → `REF_OUT_OF_RANGE`，列表 → `MALFORMED_LIST_PAGE`）。
  `Number.MAX_SAFE_INTEGER` 之上的强转舍入（`…993`→`…992`）或 Infinity 不可能进入选择、比较与
  分页；恰好 `Number.MAX_SAFE_INTEGER` 本身合法并按原值传给 reader。
- 字节 anchor：本模块对 reader 返回的 bytes 现算 SHA-256；确认附件里重复的
  `request_attachment_sha256` 必须等于它。

## 2. 确认附件（真实的第二条 user/message）

字段是**闭合集合**（多一个/少一个都拒）：
`kind='fitplate-confirmation'`、`schema_version='1.0'`、`request_id`、`request_revision`、
`draft_hash`、`request_attachment_ref`、`request_attachment_sha256`。

绑定核对（全部与**程序事实**比，绝不读模型的 `confirmed:true`/自报摘要）：

1. `request_id`/`request_revision` == 工具刚重扫到的当前请求；
2. `request_attachment_ref`/`request_attachment_sha256` == 该请求的 ref 与本模块算出的字节 hash；
3. `draft_hash` == bridge 对当前请求**确定性重编译**出的 draft hash（commit 参数里的 `draft_hash`
   也必须等于它，三方一致）；
4. 确认的 `(seq,index)` 必须**晚于**请求（顺序倒置拒绝）。

commit 的 `receipt` **只由本模块在通过上述核对后构造**（`confirmation` 语义 + Host
`session.key:lane` scope + 请求字节 hash）；模型参数里没有 receipt/scope 字段，给了也不读。

## 3. 三个工具

| 工具 | 语义 | 审批 |
| --- | --- | --- |
| `fitplate_get_request` | 读当前请求附件 + bridge 确定性编译（设备卡 id/hash + draft + outcome）；**不 stage** | 只读，`requiresApproval:'never'` |
| `fitplate_propose_constraints` | 重扫当前请求 → bridge 编译 → stage（NEEDS_INPUT 也 stage，供新 revision 顶替） | `always`，scope=`stage:<b64url(sha256(request ref+hash))>` |
| `fitplate_commit_task` | 重扫请求 + 读确认附件 → 全部绑定核对 → bridge 重编译 → 构造 receipt → freeze | `always`，scope=`draft:<b64url(sha256(request ref+hash, draft_hash, confirmation ref+hash))>` |

- **commit 每次重扫会话附件**：更新的请求 revision（即使 NEEDS_INPUT、即使损坏）会让旧草稿
  `REQUEST_SELECTOR_STALE`/`MALFORMED_JSON`，**无需**先在 get/propose 里被看过；这些拒绝发生在
  任何 bridge commit 之前（测试断言 commit 调用数为 0）。
- `classify(args)`（纯同步）+ `policyVersion`：scope 由**精确身份**（请求 ref/hash、draft、
  确认 ref/hash）派生，43 字符 base64url 摘要加 `draft:` 前缀（≤64，符合
  `APPROVAL_SCOPE_PATTERN`）；返回完整五项 call-policy。换草稿/换确认/换 revision → 新 scope。如此，
  上一草稿的 session/permanent 授权**不可能**授权这一次的 commit；YOLO/off 或缓存授权也无法替代
  真实确认附件（没有确认附件就没有可核对的绑定 → 拒绝）。
- 模型角色边界：**AI 只解释/追问，不改编译值**。工具没有字段提议参数——`field_proposals` 由程序从
  真实附件 + 登记设备卡确定性地编译；本包**不声称**通用中文理解，只支持 core compiler 文档化的
  子集（未解释的尺寸/约束文本在草稿里成为待澄清项）。

### 3.1 模型可见通道（content.text，020 后补）

官方 core 只把 tool result 的 `content` 交给 provider（`packages/core` 的 tool_result 派生只消费
`d.content`；to-provider 发单条文本），`structured` 只供面板/AGH。因此三个工具的**成功结果**把
程序事实渲染成 content.text 里一个有界 JSON 文档（2 空格缩进，`Buffer.byteLength` ≤ 256 KiB，
与 bridge 结果上限一致），模型不需要猜任何 hash：

- `request`：`ref` / **附件原始字节 SHA-256**（下一工具要重复的选择器）/ `request_id` /
  `request_revision` / 附件 name/mime/bytes；`device_card`：id + sha256；
- `draft`：编译器的 draft 文档**原样**（field_proposals、missing_fields、conflicts、
  unsupported_features、feasibility、draft_hash、outcome……），用于具体解释/追问；
- `next_tool_arguments`：下一工具所需选择器的**原值**——get→propose（request_ref/
  request_sha256）、propose→commit（+draft_hash）、commit→load_task（task_id/revision）；
  只列可由程序事实导出的选择器，**绝不生成确认 ref/hash**（propose 的 `notes` 明说它们只能来自
  真实 Host 附件）；
- propose/commit 的成功文本还带**完整** `staged` 记录 / `task` 身份（task_id、task_revision、
  manifest_id、idempotent、recovered_orphan）与 commit 真实读回的 confirmation ref/sha——
  不是截断 digest 或含糊摘要。

容量与失败：文档超过 256 KiB 时**明确报错**（`MODEL_TEXT_TOO_LARGE`，文本中重复该码，因为
execution error 的文本渲染不含 structured.code），不截断 JSON、不丢失身份/缺失项、不继续声称
完整；附件 64 KiB 与 draft 上限仍在读取侧核。拒绝：business refusal 继续走共享 `refusalResult`
（status 行 + 白名单 detail 行），仅在文本末尾补一行 `code: <CODE>`（该码此前只在模型看不到的
structured 里）；execution failure 维持既有 `<tool>: ERROR - …` 形状。structured 形状/语义、闭合
参数、reader/确认边界与审批 classifier 未改；模型仍不能通过参数注入任何值。

## 4. Bridge 合同（已定义；当前 bridge 尚未实现）

默认路径只经既有受控 `callBridge(ctx, config, subcommand, request, {timeoutMs})`（子命令参数由
插件固定，模型参数只进 `request` payload）；测试可注入窄 `bridge` 替身，**生产默认永远走
callBridge**，Node 侧不直接写盘、不 exec 任意命令、不碰任意路径。

```
intake_compile_request  {request}                                   -> {request_sha256, device_card:{id,sha256}, draft}
intake_stage_request    {request, draft_hash, attachment_sha256,    -> {staged:{request_id,request_revision,draft_hash,outcome,...}}
                         attachment_ref, session_scope}
intake_commit_task      {request, draft_hash, attachment_sha256,    -> {task_id, task_revision, manifest_id, idempotent, ...}
                         attachment_ref, session_scope, receipt}
```

bridge 必须：核 stage 与 receipt 的绑定（request/revision/draft/附件 hash/scope）、对当前请求做
确定性重编译（core `verify_draft_binding` 语义）、经真实 registry 原子 freeze，且**只有可读的
index 才算成功**（含孤儿恢复；`intake.py` 已实现这些语义，下一包把它接成这三个子命令）。
旧 bridge 不认识这些子命令时会以退出码/refusal 回应，工具会把它转成 fail-closed 的结构化拒绝
（`isError:true` 或明确的 business refusal）——因此**当前不能声称端到端可用**。

## 5. 测试与边界

- `node --test --test-isolation=none --test-reporter=tap tests/intake-host/*.test.mjs`
  → **31 tests / 31 pass / exit 0**＝018 原 25 条全部保留通过 ＋ 021 新增 6 条
  （`intake-model-visible.test.mjs`：直接对真实 `execute()` 的 content.text 断言），
  无 fork 的真实执行：fake host reader + bridge 替身/持久 compiler draft，
  全部走真实 `execute()` / `classify()` 路径；纯离线，无模型/网络/CAD。
- `intake-model-visible.test.mjs` 使用的持久 fixture 是真实 compiler 产出的
  `tests/intake-host/fixtures/compiled-public-intake/{request,draft}.json`（逐字节复制，
  request.json 原始 SHA-256 在测试里硬断言防漂移）；覆盖：content.text 含**精确附件原始
  SHA-256**、完整 draft（field_proposals/missing_fields/conflicts/unsupported_features/
  feasibility/draft_hash）、next-tool 选择器原值并可**直接**喂给 propose；NEEDS_INPUT 的
  `{path,question}` 缺失项与 conflicts 具体值模型可见、可据此追问；propose 的完整 staged
  记录与 commit 的 task 身份/idempotent 可见；business refusal 文本含 status 与
  `code:` 行、白名单 detail（missing_paths）渲染；超过 256 KiB 的草稿**明确**
  `MODEL_TEXT_TOO_LARGE`（短错误、不截断）。
- 覆盖：第 21+ 页分页、列表逆序、同 seq 多附件、名称转义、未完成分页/坏行 fail-closed；
  reader 缺失/抛错、伪 ref、跨 lane/session、坏 UTF-8、超限、坏 JSON（且不回退旧请求）；
  **最新同名 mime 错误拒绝且零附件读取（不复活旧稿，含工具层零 compile/stage/commit）**；
  **ref/列表超安全整数范围在 reader 调用前拒绝、MAX_SAFE_INTEGER 边界原值通过**；
  确认闭合字段与全部绑定负例；新 revision 与坏最新请求使旧 commit 拒绝（零 bridge commit）；
  无确认附件/顺序倒置/别请求别 hash 拒绝；同确认幂等；跨 scope 冻结为零；模型参数不能带
  scope/receipt；classify 同身份稳定、换身份换 scope。
- 独立监督脚本复验（`private-tools/check-intake-host-review.mjs`，未修改）：018 前两行
  `passed:false`（旧稿被接受、reader 被调用）；018 后 `all_passed:true`
  （`ATTACHMENT_MIME_INVALID` / `REF_OUT_OF_RANGE`，`reader_calls:0`，`model_calls:0`）。
- 模型可见性独立反例（`private-tools/check-intake-visible-review.mjs`，未修改）：021 前
  0/3（文本只有一行 summary）；021 后 `all_passed:true` 3/3——content.text 含精确附件
  SHA-256、draft 字段名与完整 draft_hash（`intake-visible-before/after-021-worker.json`）。
- 仍未实现：真实 bridge 子命令（Python 侧接 `intake.py`）与 runtime 注册由并行的 017 接线包负责
  （文件归其所有）；浏览器表单/确认卡、原生审批 UI 展示精确 draft、真实 Host 的端到端八门槛复验
  仍缺。**没有表单、没有生产真实端到端**；本包（016/018）只定义并收紧输入边界。
