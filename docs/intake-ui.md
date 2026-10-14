# intake 表单与确认卡（P02-05 浏览器端）

> **2026-10-09更新：**[赛事规则](https://agnes-ai.cn/hackathon)不限定模型品牌；下文的未安装/待Agnes等是原交付时记录。最新已安装与会话失败状态见[项目说明](../README.md)，局部界面通过不能代替完整原生验收。

本文件描述 2026-10-08 落地的前端入口：用户在现有原生 FitPlate 面板里填写一份**有限、单位显式**
的表单，面板把请求序列化成真实附件消息发进会话，显示程序编译的草稿，用户核对后由面板生成确认
附件并请求冻结。**用户不需要编辑任何 JSON**；浏览器不构造 receipt、不写磁盘、不直接调用写服务。

新增/修改文件：

| 文件 | 角色 |
| --- | --- |
| `plugin/client/intake-model.ts` | 纯模型：表单状态、校验、请求/确认文档、精确字节序列化（SHA-256 由 UI 对同一份字节计算）、提示词文本、服务响应解析、演示预填、登记卡公开摘要 |
| `plugin/client/intake-controller.ts` | 会话状态机：发送（`SessionService.commands.prompt`，忙碌时官方 `followUp`）、轮询 `fitplate.intake`、精确身份核对、确认、冻结观察、会话切换隔离、去抖与超时 |
| `plugin/client/intake-form.tsx` | React 视图：表单 + 确认卡 + 诊断折叠区（哈希/引用只出现在这里） |
| `plugin/client/panel.tsx` | 在面板顶部接入 `IntakeRegion`，调试句柄增加 `intakeController` |
| `plugin/client/types/host.d.ts` | 按官方 `services.ts` 补 `SessionService.commands`/`handle` 与投影读取结果类型 |
| `plugin/client/style.css` | intake 区域样式（随AGH主题 token） |
| `tests/browser/intake-model.test.mjs`、`tests/browser/intake-controller.test.mjs` | 无模型测试（Node，无 fork） |

## 1. 一次完整流程

1. 表单（统一单位 mm/cm/m/um/in + 各字段值）→ 面板校验（有限数、单位、缺失、上下界、每孔恰一个
   螺钉头包络、标称值落在自身许可区间）→ `buildRequestDocument` 生成 `schemas/request.schema.json`
   形状的文档 → `encodeDocument` 得到**精确字节**（`JSON.stringify + '\n'`，≤64 KiB）与字节 SHA-256。
2. 通过 `ctx.session.commands.prompt([fileBlock, textBlock])` 发送真实用户消息：file block 为
   `{type:'file', name:'fitplate-request.json', mimeType:'application/json', data:<base64>}`（官方
   ContentBlock 形状，AGH转成 ACP resource blob → 会话附件）。`busy`（由会话 UI 投影的
   `opState !== null` 判定）为真时改用官方 `commands.followUp`。AGH把命令**动态绑定到当前会话**，
   所以控制器在每个 await（忙碌查询）与真正的 dispatch 之间复核 generation/token：期间发生
   会话切换或编辑即取消该次发送——旧字节永远不会进入新会话，被取代的发送不写回任何状态。
   `isBusy` 读不到时不是 READY 信号：退回直接 prompt，AGH的拒绝（如会话忙）如实呈现。
   提示词只写指令：调用 `fitplate_get_request` / `fitplate_propose_constraints`，一切以附件
   字节与程序编译为准。
3. 面板轮询只读 `fitplate.intake`（`{session_key: sessionId, request_id}`），**只有**当服务返回的
   request_id、request_revision、附件字节 SHA-256 与本面板发送的字节完全相等时才显示草稿卡。
   旧 revision、不同字节、其他请求 id、服务不可用/不完整、轮询超时都显示各自的状态，绝不显示可确认。
   每次调用都用**闭合输入键**（`session_key` + 可选 `request_id`；AGH拒绝 additionalProperties，
   类型层面也不可能写错拼写），确认前的最终重读同样如此。
4. 草稿卡展示程序 outcome（READY_TO_CONFIRM / NEEDS_INPUT / CONFLICTING_INPUT / UNSUPPORTED_REQUEST）、
   缺失问题与冲突原文、字段提议（value_mm + 来源）。

## 2. 确认与冻结

- 仅“输入完整一致”（READY_TO_CONFIRM）可确认；文案固定声明“只表示可以核对确认，不表示有解或已通过”。
- 点击确认时**先做最后一次精确身份核对**：发送字节、staged 需求版本、**显示的附件 ref**、
  **显示的 draft_hash** 与 **outcome 仍为 READY_TO_CONFIRM** 全部相等；任何漂移（版本更新、
  ref/字节不一致、草稿被重编译、状态降级）都是拒绝，零发送。附件合同把 ref 绑定在字节上
  （每个请求是新的用户消息），因此不存在“同 ref 换内容”的合法更新——控制器的处理就是不把
  任何漂移后的 payload 当作确认对象，而不是重新呈现。随后用该次核对的返回值构造确认文档——
  闭合字段集与 018 附件合同完全一致：
  `kind/schema_version/request_id/request_revision/draft_hash/request_attachment_ref/request_attachment_sha256`。
- 确认附件字节的 SHA-256 由面板计算并出现在发送提示里；提示要求模型先用 `read session-file://list`
  找到该确认附件的**官方 ref**，再以官方 `request_ref/request_sha256/draft_hash` 调用
  `fitplate_commit_task`，并明确禁止 `confirmed:true` 或自报字段。
- 确认卡提示：随后会出现AGH审批（第二道），它不替代用户点击确认；browser 端永远不产生 receipt。
- 冻结由**只读登记观察**判定：`fitplate.intake` 的 task revisions 中出现与确认的需求版本 +
  同一 draft_hash 的修订才显示“已登记冻结”。超时只显示“尚未观察到”，不推断成功。

## 3. 失效与隔离规则

- 编辑任意字段 → **立即**作废一切尚未 dispatch 的旧输入（包括正在编码、正在读忙闲状态、正在
  核对确认的流程），卡片过期（禁止确认），下一次发送生成新的需求版本；版本与**字节**一一对应
  （内容未变的重发沿用同版本；登记状态里出现外来版本时，下次发送从其上继续递增，绝不复用）。
  已经 dispatch 的消息不能假装撤回：状态如实说明“旧附件仍在会话中、程序以最新附件为准”。
- 会话切换：清空表单/草稿/确认态；所有旧异步响应由 generation+token 双门拦截——晚到的答案不会
  落进新会话，旧字节也不会经动态绑定的会话命令被发进新会话。
- 重复点击：操作进行中（busy）直接忽略；等待草稿期间的重复“整理需求”只触发一次登记重读。
- 失败保留用户表单；发送/确认消息被AGH拒绝或传输失败都显示具体状态，不制造 READY；
  `isBusy` 探测失败表示“忙闲未知”，退回直接 prompt 并如实呈现AGH的拒绝。
- 用户在面板外上传输入：面板只如实显示“本面板发送的字节与查询结果不一致”之类的状态；
  **提交时工具的真实重扫仍是最终边界**，面板从声称不了附件仍最新。

### 文案约定

主流程用“需求版本 / AGH审批 / 已整理待核对 / 程序已登记冻结”这类用户语言；request_id、hash、
session-file ref、模块/服务名只出现在折叠的诊断区。READY 只表述为“输入完整一致”，任何位置都
不暗示几何有解或 PASS。

## 4. 来源与演示边界

- 设备尺寸只来自登记卡；当前仅 `banner-q20pd` 一张，选择器如实显示“仅此 1 张”，不虚构卡片；
  登记卡的公开摘要（外形/孔距/螺纹接口/设计通孔 ⌀3.4 标注为项目设计选择）只作展示。
- “载入公开规格演示”按钮把监督编译过的公开案例（`ANG/logs/plan02/reproduction/compiled-public-intake/request.json`）
  的值填入**可见**表单；标注“厂商设备规格＋自设底座/环境，无实物验证”；来源保持
  `design_assumption`，不升级为用户测量；文档值与监督编译件逐值相等（测试固定）。
- 板侧安装孔径必须填数值；`M3` 之类的螺纹规格在表单校验就被拒绝。

## 5. 测试与验证（实际命令与数字）

```
npx tsc -p tsconfig.client.json --noEmit            → exit 0
node --test --test-isolation=none tests/browser/intake-model.test.mjs      → 10/10 pass
node --test --test-isolation=none tests/browser/intake-controller.test.mjs → 23/23 pass
node --test --test-isolation=none tests/browser/adapter.test.mjs tests/browser/scene-model.test.mjs \
     tests/browser/intake-model.test.mjs tests/browser/intake-controller.test.mjs → 95/95 pass, exit 0
node scripts/build-client.mjs                        → 重新生成包内 client 资产
node scripts/build-client.mjs --check                → up to date (build 1196f9bae113)
```

测试覆盖：文件 block 反序列化为 schema 请求（结构走查真实 `request.schema.json`）；忙碌→followUp；
编辑→旧卡过期且新版本；服务返回新版本/不同字节/别的请求 id → 不可确认；确认竞态重读
（draft/ref/outcome 漂移零发送）；非 READY 点击零发送；无 session/无 commands/网络失败/服务错误/
超时 → 不产生 READY；确认文件闭合字段与精确身份、字节 SHA 与提示一致；同 session 旧异步不复活
新卡；切 session 零泄漏；双击去抖（1 请求 + 1 确认）；演示来源边界。022 新增：**所有
`fitplate.intake` 调用按真实 `buildServices()` inputSchema 校验键集**（含确认重读）；**忙闲查询
pending 时切会话/编辑 → 零 dispatch、零状态回流**；**确认重读 pending 时切会话/编辑 → 零确认
dispatch**；`isBusy` 失败→直接 prompt 且拒绝如实呈现；重读 outcome 降级/ref 漂移 → 零发送。
独立监督脚本（未修改，3 反例）复验 `all_passed:true`，输出
`reviews/intake-ui-after-022-worker.json`。

## 6. AGH工作台布局（025 修复）

AGH把本面板作为 `main`（100dvh flex-column）的**最后一个** flex 子项挂载：
topbar → workbench-split（会话页签 + 会话区）→ `#approval` → `#composer-mount` → 本面板。
原生 pilot3 因此失败：面板曾声明 `height:100%`，把审批卡压成一条、会话页签行溢出盖住审批按钮，
Playwright 真点击被 `.session-tabs-bar` 拦截 30 秒超时。修复（只约束自家内容）：

- 面板高度有界：`height: min(44vh, 600px)`、`min-height: 0`、内部区域滚动；
- 自家 slot mount（`div[data-agnes-slot-mount="workbench.panel"]`）`min-height: 0`，可随空间收缩；
- AGH要审批时让位：`main#main-content:has(#approval:not([hidden])) div[data-agnes-slot-mount="workbench.panel"] .fitplate-panel { height: min(22vh, 300px) }` —— 公开属性条件（`#approval`/`[hidden]`），被样式化的元素严格限定为自家面板；
- 面板内：intake 区最多占面板 40%（`flex: 0 0 auto`），工作区网格 `flex: 1 1 0` 拿到余量，3D/检查区域保持可用高度。

验证（**合成布局夹具**，非原生验收）：`node tests/browser/intake-layout.test.mjs` 用真实AGH
DOM 结构与AGH自带样式表（只读）复刻 shell，向 `#approval` 注入**明确标注 SYNTHETIC** 的内置
审批卡 DOM（按钮只计数，无AGH授权、无模型调用、不发送消息），在 1600×1000 与 1366×768 量测
elementFromPoint/真实点击/参数可读/无横向溢出：修复前 20/38 通过（复现拦截与超时），修复后
**40/40 通过**。证据：`ANG/logs/plan02/native-intake/layout-025-fixture/{before,after}-*`。

## 7. 尚未完成（不构成验收）

- 未安装到真实AGH、未在原生 Web 端跑真实用户附件与 Agnes 端到端八门槛（正式打包安装由 root 安排；
  两个窗口尺寸 1366×768 / 1600×1000 的原生验收同样待安排）。
- `session_key` 目前用 `SessionService.sessionId` 作为一致性过滤值；其与AGH `session.key` 的相等性
  属于原生验收必须实测的项（本包只有单测与静态核对，无 live 会话）。
- 无截图；无浏览器端真实上传回环验证。**代码完成 ≠ 产品验收完成。**
