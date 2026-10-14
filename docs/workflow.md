# 模型工作流与独立评测 — 实际命令与边界

> **2026-10-09更新：**模型规则见[赛事规则](https://agnes-ai.cn/hackathon)。下文是Task01工作流/旧24次回归记录；第三方模型可如实用于参赛核心任务，但旧回归不升级为新评测。新主模型/AGH补丁/工具与协议须另行冻结。44/32为可选增强，先交付完整流程与正常/边界/失败证据。

本文件是 T07/T10/T11 的可复现命令清单：把 `@fitplate/plugin` 装进隔离 AGH 实例、让真实
模型在隔离工作区里跑 `load → build → validate → 修订 → export` 闭环、以及 12 案例 A/B 独立
评测。所有命令与退出码都以当前落盘脚本为准；改提示/案例/工具后原结果集即变为 regression
基线，需重跑。

## 0. 前置与实例边界

- 隔离实例固定为项目内 `<project>/.agh-home` + profile `local-dev`（`scripts/agh/lib.mjs`），
  Web origin 默认 `http://127.0.0.1:4387`。**不是**日常实例；脚本从不改日常 profile/凭据，
  不在命令行放 secret。
- 需要：项目 `.venv`（CadQuery 2.8 / OCCT 7.9.3.1.1）、`geometry/` 包、`plugin/` 包、
  AGH 源码 checkout（只读，默认 `/home/Heliora/ANG/agnes-harness`，可 `AGH_SOURCE_ROOT` 覆盖）。
- 涉及 AGH SDK 的脚本必须用 AGH 自带 tsx 运行（`<AGH_SOURCE_ROOT>/node_modules/.bin/tsx`）；
  纯 Node 脚本（`build-client`、`prepare-workspace`、`normalize-input`、`evaluate-models` 的
  dry-run）用系统 `node`。

```bash
tsx() { /home/Heliora/ANG/agnes-harness/node_modules/.bin/tsx "$@"; }   # 文档中简写

tsx scripts/agh/start.mjs      # 启动/确认隔离 daemon（幂等；退出码 0 ok / 3 未就绪）
tsx scripts/agh/status.mjs     # 只读状态：config、已装包列表（0 ok / 3 daemon 未运行）
tsx scripts/agh/stop.mjs       # 只停本脚本专属 daemon（0 ok/已停 / 1 失败）
```

## 1. 构建面板（前端产物，006）

```bash
node scripts/build-client.mjs            # 构建 plugin 浏览器端产物
node scripts/build-client.mjs --check    # 校验磁盘产物与源码一致（不写盘）
```

## 2. 打包 @fitplate/plugin（安装/升级/信任，T01/T10）

```bash
tsx scripts/agh/package-fitplate.mjs              # inspect → staging → install/update → trust → enable → 状态复核
tsx scripts/agh/package-fitplate.mjs --no-update  # 只做漂移检查：快照≠已安装即拒绝，不更新
```

- 脚本先对 `plugin/` 用 Host 自己的 `hashDirectory` 实测 `sha256-…`，把源码树复制到
  `.cache/agh-package-staging/plugin-<sha256hex>/`（独立快照，排除 node_modules/.git/fixtures/out），
  再对**快照字节**实测摘要并要求等于源码摘要，否则拒绝安装。
- 随后一律用 `file:./.cache/agh-package-staging/plugin-<hex>` 作为 source ref：源码一改 → 摘要变
  → ref 变，daemon 的 ref 缓存不可能再命中旧树；inspect 的 integrity、本机实测摘要、最终安装行
  三者必须一致，否则拒绝。
- **源码更新后必须重跑**（install/update + 重新 trust）：编辑 `plugin/src` 不会让已安装快照改变。
- 缺 UI descriptor / client entry 时脚本按前置条件退出（3）并明确“等待”，不绕过。
- 退出码：`0` 已安装且运行 · `3` daemon 缺失或前置不满足 · `4` 拒绝（blockers、操作失败、状态未达
  enabled、摘要不一致）· `1` 未预期。

## 3. 准备工作区（只复制输入）

```bash
node scripts/prepare-workspace.mjs --task sensor-swap-01 --id demo-01   # demo-workspaces/<id>/
node scripts/prepare-workspace.mjs --list                              # 列出可用 fixture
```

教学/评测会话的工作区由驱动自动准备（`prepareSessionWorkspace`）：只复制冻结
`task.json`、`<task_id>.scene.json`、`initial-design.json`（若有）与通用方法 skill
`.agh/skills/fitplate-design/SKILL.md`，逐文件记录 SHA-256；Plan1/tests/evaluation 私有标签/参考
答案/源码永不进入工作区。

## 4. 单位标准化（N02，受限转换）

```bash
node scripts/normalize-input.mjs --case n02-units-mixed --check-task       # 应用转换并断言 = 冻结 task.json（0）
node scripts/normalize-input.mjs --case n02-units-mixed --json             # 打印转换记录（source/unit→mm、factor）
node scripts/normalize-input.mjs --case n02-units-mixed --write            # 写 evaluation/inputs/N02/conversion-record.json
node scripts/normalize-input.mjs --case n02-units-mixed --emit-task out.json  # 输出标准 TaskSpec
```

- 只换算显式 `{value, unit}` 字段（固定换算表 mm/cm/m/um/in）；旋转角度、索引/冻结位置、
  hash/id/revision 永不按数量级缩放；只能改写模板中已存在的有限数值字段，路径不存在即拒绝；
  标记了但用户没给值 → `NEEDS_INPUT`（退出码 5），不猜。
- 退出码：`0` ok · `2` usage · `3` 缺失/不一致 · `4` 拒绝换算 · `5` NEEDS_INPUT。
- 转换记录是给用户/监督看的公开证据，**不复制进模型工作区**（模型只见已标准化的 mm 合同）。

## 5. 教学运行（真实模型闭环，单次 ≤5 分钟）

```bash
tsx scripts/agh/run-fitplate.mjs --task sensor-swap-01 --revision 1 \
    [--workspace <dir>] [--timeout-ms 300000] [--approval handler|yolo] [--expect workflow|pass]
```

- 模型来自隔离实例当前配置（`route/model`，`thinking: 'max'` 显式请求），通过官方 SDK
  `client.session.*` 驱动；写工具审批走 `session.onPermissionRequest` 正式回调（handler 允许
  5 个 `fitplate_*` 工具并拒绝其它；`yolo` 用正式 `session.setYolo(true)`），每次审批问题与决定都记录。
- 控制器上限 5 分钟（`--timeout-ms` 默认=最大 300000）；超时经 `session.cancel()` 取消并如实记为
  cancelled，绝不算“无解”。
- 教学模式允许把 `initial-design.json` 作为**输入来源**的首版固定演示（summary 记
  `seed_origin=input:initial-design.json`）；后续修订只能模型决策，驱动不代模型求解。
- 产物：`runs/teaching/<stamp>/<session>.agnes.jsonl`（原生 Agnes 轨迹）、`<session>.html`、
  `session-summary.json`（含 copied 文件哈希、skill trust/enable/winner、model settings、tool 序列、
  approvals、usage/credits、turn/end 原因、审计与判定）。thinking 内容永不读取/打印/计分。
- 完成证据（退出码 0）要求：`load/build/validate` 真实成对 tool/call↔tool/result、无未配对调用、
  污染审计干净；`--expect pass` 还要求最终 `overall=PASS`，且终版报告与导出**实际绑定** run
  manifest 最终候选（run/candidate/revision/report id/64 位 STEP 与 validator 哈希、report_sha256——
  取自实际 payload，缺字段不计；validate 响应 `ok:true` 且无执行错误）、turn 正常结束且有最终说明
  文字、审计未污染，并**演示了修复**：输入首版在正常执行下真实 FAIL → 不同候选通过（初版直接 PASS
  不算修复教学成功；只有几何 PASS 记为
  `PASS_NOT_EXPORTED(...)`，export 合格但 turn/终稿未完成记为 `EXPORTED_NOT_FINISHED(...)`，
  均不满足 `--expect pass`）。失败按退出码 `4` 如实报。
- 导出结果按实际字段读：`fitplate_export_package` 成功是 `status='EXPORTED'` + `failed:false` +
  `overall:'PASS'`（**不是** `'OK'`）；诊断导出 `failed:true` 只记录，不计“已发布包”。summary 的
  `outcome` 区分 `PASSED_AND_EXPORTED` 与 `PASS_NOT_EXPORTED(...)`（几何通过但闭环未完成）；
  导出已绑定但 turn 未完成/无终稿时记 `EXPORTED_NOT_FINISHED(transport-error|no-final-text|contaminated)`，
  绝不标成 `PASSED_AND_EXPORTED`。
- 手工导出（可选）：`node <AGH>/packages/cli/dist/local/agnes.mjs export <sessionId> --format agnes -o x.jsonl`
  （`--html -o x.html`），环境 `AGH_HOME=.agh-home AGNES_PROFILE=local-dev`。

## 6. 独立 A/B 评测（12 案例 × A/B，默认 dry-run）

```bash
node scripts/evaluate-models.mjs                                   # dry-run：只打印 24 session 计划，不花钱
tsx scripts/evaluate-models.mjs --execute                          # 真实付费批次（默认 A/B、repeat 1 = 24 session）
tsx scripts/evaluate-models.mjs --execute --only n01-basic-plate --group A   # 单案例调试
```

- **A 组**（一次生成）：`load_task` 后只允许 `build_candidate` 恰好一次，不看任何验证报告；
  判分取第一个候选；出现第二次 build、任何 validate 或 export 记为协议违规，该 trial 不计正确。
  A 组按协议拿不到验证反馈，因此只按磁盘实际 STEP 的几何结果判分（不要求 native validate/export）。
- **B 组**（闭环）：initial + 最多 3 次修订（合计 ≤4 候选），用真实原生报告作反馈；第 5 次
  build 记协议违规。B 的正例只有在“几何 PASS + **同一最终候选**的原生报告 PASS + 绑定该
  候选/报告/STEP 的合格导出 + 无传输错误 + turn 正常结束且有最终说明文字（terminal_complete）”
  时才算闭环完成；只有几何 PASS 记为
  `pipeline.geometry_pass=true / complete=false`（几何过但闭环未完成），不填模型 correct。
  原生 PASS 必须显式带全 run id、candidate id、task revision、report id、64 位 STEP 哈希
  （与离线评分所读字节一致）与 64 位 validator code 哈希（与当前离线报告一致），且该 validate
  为正常执行（桥 `ok:true`、tool/result 非执行错误）；任一字段为 null/缺失即视为证据不足，
  不匹配、不放行。
- 评分对象是**磁盘上的实际 STEP**：离线 `python -m fitplate.cli validate`（与工具同一底层验证器）
  在会话结束后单独执行，记录 validator 身份与 code hash、STEP 实际哈希；preview 按 CLI 合同传
  **描述符 `preview.json`**，并把同目录 `preview_mesh.json` 的实际哈希与报告里的
  `preview_mesh_sha256` 绑定核对（G08）；模型自然语言的 “PASS”（含裸 “PASS” 字样）若没有
  离线 PASS 报告背书，即 wrong PASS。否定判定按**谓词绑定**（中英一致）：`未 PASS`、`不是
  overall PASS`、`PASS 不成立`、`did not pass`、`no design … can pass`、`cannot claim PASS`、
  `PASS is not established` 不算声明；引用工具拒绝、纯 PASS/FAIL 状态词表/逐项引用
  （`PASS/FAIL`、`G01 PASS`）、明确“不作结论”也不算；而 `No errors … final PASS`、
  `No constraint violations … PASS`、`Not only … but PASS` 仍是肯定声明，同文中后出现的真实
  PASS 一律保留（各条款独立）。
- native/离线比较只对**最终候选**（run + candidate + report id + STEP 哈希）逐项进行，不把
  历史候选的 overall 放进集合稀释：早先 `v001 FAIL` 不会掩盖 `v002` 的 native/离线不一致；
  native 报告哈希与磁盘字节不一致同记 disagreement。
- 导出按实际字段读：只有桥返回 `ok:true`、`status='EXPORTED'`、`failed:false`、`overall:'PASS'`
  且绑定最终候选（report id + 64 位 STEP 哈希与报告哈希一致——报告哈希取自最终候选在 run
  store 里记录的 `report_sha256`，validate payload 携带时作回退来源）才算合格导出；
  `failed:true` 的诊断导出、`ok` 为 false/缺失的返回和其它版本的导出永不替当前版本背书。
- F01/F02/F03（早期拒绝类）由固定离线 helper `scripts/evaluation-preflight.py` 在**独立进程**
  用公开冻结输入重算（同 contract + preflight 模块，不读私有标签、不接受模型代码、不写工作区、
  不进模型工具集），记录 `origin:'offline_evaluator'`、module code SHA256、task/scene 哈希、
  读取的冻结 revision 与真实 proof：F02/F03 只有原生 `INFEASIBLE` 拒绝与离线证明**同一任务、
  同一 revision**（比较 load_task 调用参数与 helper 读到的 `inputs.task_revision`），且其
  `detail.findings` 与离线 findings 逐项 canonical 相等（对象/条件/域/关键数字一致，数字容差
  仅显式 1e-9）才算正确——仅 kind 相同、或其它任务的同 kind 证明不算（BUDGET_EXHAUSTED 不是
  无解）；F01 需要 `NEEDS_INPUT` + 最小缺失路径（如 `/sensor/hole_offsets`）经离线复核确认，
  且模型**明确请求**缺失信息（仅提到“孔距”不算）。
- 数据集：`evaluation/input-cases`（12 案例）+ `evaluation/private/labels`（只允许驱动读取，
  绝不复制给模型）；`evaluation/manifest.json` 校验所有输入哈希，drift 即拒绝运行。
- 每个 trial 的 workspace name 由驱动生成并统一 `toLowerCase()`（组名 A/B 与默认 ISO 批次号含大写）
  后才交给 `prepareSessionWorkspace` 的 `^[a-z0-9][a-z0-9._-]{0,63}$` 校验——校验器不放松，
  目录路径、标签与任务 id/revision 的大小写不变。
- 污染审计：workspace 外的任何路径触碰、或提到 tests/evaluation 私有/geometry/scripts/Plan1
  等开发者材料即 contaminated（trial 判 `correct=false`）；工作区内公开输入与方法 skill 读取合法。
- F04（STEP 截断）：注入点在 validate 审批回调里、执行之前（确定性、无竞态），把候选
  `model.step` 截半并记录前后哈希；只有 hook 真实完成截断（`fault.mode='model'` 且
  `sha256_before/after` 为**两个不同的真实 64 位十六进制**）才算模型行为已验（短/伪造哈希
  不算）。故障证据是坏文件被真实拒绝：`STALE_INPUT` + `ARTEFACT_HASH_MISMATCH/ARTEFACT_MISSING`、
  真实导入 `UNKNOWN`（G01/STEP_IMPORT_FAILED）或同级执行错误码；拒绝 payload 无身份，绑定走
  实际请求参数对受控注入（同 run、同被注入候选；revision 以**当前 run manifest 冻结值**为准，
  公开 validate 参数本身没有 revision），响应若携带 run/candidate/revision 则逐字段都须一致。
  普通几何 FAIL 不算故障证据；把可解任务说成“无解”不计成功。拒绝坏件本身正确；真实恢复也算
  完成闭环：**不同**新候选经全字段绑定的 native+offline PASS、绑定导出、正常终态、无污染——
  仅 export/自述、坏候选自身“通过”、native-only 缺 offline 均不算；无法恢复但如实报告故障
  仍正确（不可称无解）。
- 传输/中止与几何成绩分列：完整记录 native `turn/end` reason 与 `error{code,message}`（如
  TRANSPORT）和 session turn 分类；turn ERROR / 取消不算完成闭环。几何/分类判定与 terminal
  completion 分列记录：A 组几何 correct 与 F01-F04 行为 `classification_ok` 不受 turn 状态
  影响，但 `pipeline.terminal_complete`（turn 正常结束且模型给出最终说明文字）与
  `pipeline.complete` 在 ERROR/取消时为 false——几何/分类得分不作为完整流程。batch
  results.json 的 trials 同时列出 `terminal_complete`。
- 结果：`runs/evaluation/<batch>/results.json` + 每 trial `trial.json`；`wrong_pass>0`、
  native/离线（或 native/离线 preflight）不一致，或存在 aborted trial 时退出码 `4`
  （不得宣称完成）。任何提示/案例/工具改动后原集变 regression 基线。
- 离线回归重判（`scripts/rescore-evaluation.mjs`，无模型、无 CAD）：只在**缓存资格**逐项成立时
  才用已存轨迹+已录独立离线报告重判——轨迹 SHA、copied 输入 SHA（合法 M04 revision swap 按
  swap 后哈希）、候选 STEP/preview mesh SHA、报告文件 raw SHA 与 manifest 登记及 report_id/
  overall/STEP/code 一致、当前 `validator_code_sha256`（项目 identity 函数）与缓存报告一致、
  预检模块哈希与所读输入一致；缺任何证据即不重判、保留 raw 标 unverified。输出写独立 revision
  目录（如 `runs/evaluation-regression/ds-final-20261007t1011/revision-028/`），标注
  `dataset_seen:true`、`publication_eligible:false`，不覆盖 raw 与旧 revision。
- **边界（必读）**：这些案例是 `synthetic_teaching_fixture`（教学合成数据，非实测设备）；本流程
  是DeepSeek历史开发链路，**不等于当前新入口验收或新冻结成绩**；样本量不支持总体统计结论；付费批次由监督运行。

## 7. 测试与数据复核

```bash
node --test tests/workflow/*.test.mjs                      # 边界/协议/注入/评测完整性（node:test；含真实 CAD）
.venv/bin/python scripts/evaluation-preflight.py --workspace <ws> --task f03-blocked-domain --pretty
.venv/bin/python evaluation/tools/build_cases.py --check   # 12 案例 C 参考+initial 真几何复验 + N02 标准化应用检查
node scripts/normalize-input.mjs --case n02-units-mixed --check-task
node scripts/test-plugin.mjs [--fast|--with-agh]           # 插件合约/故障注入（见 docs/plugin.md）
node scripts/build-client.mjs --check                      # 面板产物一致性（见 docs/panel.md）
```

- `scripts/evaluation-preflight.py` 是**评分侧离线 helper**（读公开 task/scene，独立进程调用同
  contract/preflight；退出码 `0` 分类已产出 · `2` usage · `3` 输入缺失 · `4` 分类器不可用）。
  它不注册为模型工具、不做原生 tool 记录、不在工作区写任何文件；只有评测驱动在会话结束后调用。

`build_cases.py --check` 全部通过时给出 `last-check.json`（含 validator module 实测哈希）；
任何几何改动后必须重跑，旧导出因哈希不符会被拒（STALE_VALIDATOR）。

## 8. 工具限制与证据边界（诚实声明）

- 本 daemon 构建**不消费**官方的 `tools.core` preset（AGH 源码 `presets/minimal-rl.yaml` 标注
  `NOT CONSUMED`），因此审批 handler 不是 5 工具硬限制（它只覆盖“会发起审批”的工具）。补偿控制
  是会话后对**全部**实际 tool call 的审计：触碰开发者材料即 contaminated。
- 判定一律以原生证据为准：tool/call ↔ tool/result 按 `toolUseId` 配对，报告哈希与 STEP 哈希核对；
  思考过程不读、不打印、不计分。
- 网络/传输故障如实记为 `MODEL_ERROR`/error，保留工作区与轨迹；预算耗尽不是 INFEASIBLE；
  取消不是失败结论。工具故障与模型错误分列。
