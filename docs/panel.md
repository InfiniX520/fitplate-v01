# FitPlate 工作台面板（T09）

本文档是面板的接入说明：构建方式、需要由插件清单声明的字段、前端期望的服务合同、验收命令，
以及当前仍未打通的部分。**本文档不复制设计正文**（Plan1 §8.3–8.5 / §11 / §12 为准）。

Plan3 修复候选增加同源事实结果卡，位于可滚动的验证侧栏，保留 3D 网格区域高度。普通轮询
不会用 run 列表摘要覆盖完整报告；task revision、candidate、STEP、报告 ID/文件 SHA/内容摘要
变化时重新读取。信息不足或错配时不显示绿色通过。完整交付仍须另验模型说明和真实 AGH 页面。

下载来自服务登记的文件名、大小和 SHA。结果卡区分几何通过、待导出和已导出；只有导出记录的
候选、报告 ID、STEP、报告文件 SHA 与内容摘要全部匹配，才显示当前版本已导出。缺失或旧绑定
只显示待核实。详细哈希与软件几何范围可展开，不能据此宣称实物或制造验收。

## 1. 交付物与写入范围

| 路径 | 内容 |
| --- | --- |
| `plugin/client/index.tsx` | 客户端模块入口：`export function apply(ctx, config)`，只注册 `workbench.panel` 一个 slot |
| `plugin/client/panel.tsx` | 四区域 React 面板（任务与约束 / 三维视图 / G01–G08 验证清单 / 版本与操作记录） |
| `plugin/client/controller.ts` | 会话生命周期、1s 轮询、迟到回复丢弃、下载状态机（无 React、无 three） |
| `plugin/client/adapter.ts` | 三个 query 服务的唯一适配层：形状归一化 + 身份校验 + 分块产物读取 |
| `plugin/client/mesh.ts` | `preview_mesh.json` 解码与绑定校验（vertices/indices/bounds/哈希） |
| `plugin/client/scene-model.ts` | 实测位姿解析、包络构造、报告新鲜度、版本改动摘要（纯函数） |
| `plugin/client/viewer.ts` | three.js 视图：真实网格、灰板/蓝设备/橙操作空间/红失败对象、相机、释放 |
| `plugin/client/build-info.ts` | 调试行的版本/构建哈希（由构建脚本 `define` 注入，未构建时显式标 `dev-unbuilt`） |
| `plugin/client/style.css` | 面板样式，颜色走AGH `--agnes-*` token，浅/深色自适应 |
| `plugin/extensions/main/client/index.js` | 浏览器构建产物（原生 ESM） |
| `plugin/extensions/main/client/index.css` | 样式产物 |
| `plugin/extensions/main/client/index.js.map` | 源码映射（便于监督复核，非运行必需） |
| `plugin/extensions/main/client/build-manifest.json` | 构建清单：源码摘要、外部模块合同、每个产物的 sha256 |
| `scripts/build-client.mjs` | esbuild 构建 + 合同校验（external 不内联、无 CDN、体积上限） |
| `tests/browser/*` | Node 适配器测试 + Playwright 真实产物渲染验收 |

面板通过只读服务取数据；`plugin/src/report-facts.mjs` 是工具文本和浏览器共同使用的纯事实投影，
不读文件、不计算几何。浏览器不执行 CAD 或写入 run store。

## 2. 构建

```sh
pnpm install                 # 根目录：esbuild 0.28.2 / three 0.186.1（精确锁版本）/ playwright 1.63.0
pnpm run build:client        # 生成 plugin/extensions/main/client/*
node scripts/build-client.mjs --check   # 校验磁盘产物与源码一致（浏览器验收会自动先跑这一步）
```

构建脚本的行为：

- 从 AGH 源码合同 `packages/web-client/src/externals.ts` **读取**AGH共享单例表并与脚本内的副本比对，
  不一致直接失败；`react` / `react/jsx-runtime` / `react-dom` / `react-dom/client` /
  `@agnes/cordis` / `@agnes/web-client` 一律保持 external，不把第二份 React 打进产物。
- 产物中出现的裸导入必须全部属于该表；发现 CDN 绝对 URL、`node:` 内建导入、内联 React 特征、
  超过 AGH 安装期上限（单文件 4 MiB / 合计 16 MiB）都会让构建失败。
- 调试信息来自真实构建：`buildHash` 覆盖脚本字节、构建选项、工具版本、客户端及共享事实源码和 external 合同；
  `sourceHash` 只表示这些源码与 external 列表，实际产物身份见各输出的 SHA-256；
  `version` 取 `plugin/package.json`（存在时）否则取根 `package.json`；`builtAt` 与
  esbuild/three/node 版本写入 `build-manifest.json`。面板右下角调试行显示
  `插件版本 x.y.z · 构建哈希 <12 位>`，不臆造。

## 3. 清单字段（现状：005 已完成对接）

客户端描述文件 `plugin/extensions/main/agnes.client.json`（**已由 005 写好，本批不改**）：

```json
{
  "client": {
    "id": "fitplate-panel",
    "entry": "./client/index.js",
    "styles": ["./client/index.css"],
    "slots": ["workbench.panel"],
    "services": ["fitplate.run", "fitplate.scene", "fitplate.artifact"],
    "projections": [],
    "publicConfig": { "label": "FitPlate · 装得上", "note": "…" }
  }
}
```

`plugin/package.json` 的 `agnes` 段：`plugins[].id = "ext:fitplate/plugin"`，
`clientDescriptors[].rowId` 同名，`path = "./extensions/main/agnes.client.json"`。

构建产物路径必须落在描述文件旁：`plugin/extensions/main/client/{index.js,index.css}`（本批产物即
在此，相对描述文件写作 `./client/index.js` / `./client/index.css`）。

要点：

- `clientDescriptors[].rowId` 必须与 `agnes.plugins[].id` 相同，浏览器行才绑定到同一行；
- `slots` 只列 `workbench.panel`（list 槽，scope `session-maybe`），不申请其他槽；
- `services` 是浏览器**可调用名单**；Host 仍会核对后端行确实用 `ctx.services.register()`
  注册了这些 `kind: query` 服务，且当前会话有权访问；
- 客户端描述里的路径是**包内相对路径**，`entry` 必须落在快照内（扩展名白名单 `js/mjs`，
  样式 `css`）；
- **快照不可变**：改源码或重跑构建都不会改变已安装快照（Plan §8.3）。安装/更新后要核对
  `build-manifest.json` 的产物 sha256 与 `.agh-home/data/daemon/client-modules/<profile>/<pkg>/<rev>/_snapshot.json`
  是否一致；不一致说明面板仍是旧构建。

## 4. 服务合同（已按 005 实际实现对接）

浏览器只经 `ctx.agnes.services.call(name, input)` 调用；面板不新建 SDK/socket、不绕过 BFF。
适配层（`plugin/client/adapter.ts`）对**装饰性字段**宽容，对**身份**严格：候选/STEP 哈希/运行 ID
不一致会拒绝渲染并显示原因，不静默修复。下列形状与 `plugin/src/services.mjs` 的 handler 输出
一致（本批已逐条比对实现，`tests/browser/fixture-services.mjs` 按同一形状作答）。

```jsonc
// fitplate.run { session_key, run_id? }  —— 找不到时 { found: false, reason }
{
  "found": true,
  "reason": null,
  "run_id": "…",
  "task_id": "sensor-swap-01",
  "task_revision": 1,
  "state": "COMPLETED",              // Plan §7.2 状态机字符串
  "created_at": "…", "updated_at": "…",
  "frozen": { "task_sha256": "…", "scene_sha256": "…" },
  "budget": { "candidates_used": 2, "max_candidates": 4 },
  "task_summary": { /* 见下：request_text / plate / base_holes / sensor / requirements / tolerances，
                       不含 provenance，也没有完整 TaskSpec 原文 */ },
  "versions": [
    {
      "candidate_id": "v001",
      "parent_candidate_id": null,
      "status": "VALIDATED",
      "created_at": "…",
      "step_sha256": "…",
      "report_id": "…", "overall": "FAIL",
      "report_created_at": "…", "validator_version": "…"   // 扁平的报告摘要，无 checks/hashes
    }
  ],
  "exports": [ { "candidate_id": "v001", "report_id": "…", "export_dir": "…", "failed": false, "exported_at": "…" } ]
}
```

```jsonc
// fitplate.scene { session_key, run_id, candidate_id }
{
  "found": true,
  "reason": null,
  "run_id": "…", "candidate_id": "v001",
  "task_id": "sensor-swap-01", "task_revision": 1,
  "binding": {
    "candidate_id": "v001", "step_sha256": "…", "preview_sha256": "…",
    "preview_mesh_sha256": "…", "report_id": "…", "report_overall": "FAIL", "verified": true
  },
  "device": {                        // 由后端解析好的位姿
    "center_xy": [40, 30], "rotation_deg": 0,
    "source": "g04-measured",        // 或 "design-fallback"（未实测，面板按未验证显示）
    "verified": true, "pose_status": "PASS", "worst_deviation_mm": 0
  },
  "scene": { /* 冻结 SceneSpec */ },
  "task": { /* task_summary，同 fitplate.run */ },
  "report": { /* report.json 全文（含 checks/hashes）或摘要 */ },
  "evidence": { "sensor_group": { "derived_pose": {...}, "pose_status": "PASS", ... } },
  "mesh": {
    "encoding": "json-arrays", "candidate_id": "v001", "step_sha256": "…",
    "triangle_count": 1388, "tolerance_mm": 0.1, "angular_tolerance_rad": 0.5,
    "bounds": { "min": [...], "max": [...] },
    "vertices": [...], "indices": [...], "bytes": 89923, "sha256": "…"
  },
  "mesh_blocked": null               // 网格被拒绝/超预算时给出 reason + message（+ artifact_id/total_bytes）
}
```

```jsonc
// fitplate.artifact { session_key, run_id, candidate_id, artifact_id, offset?, limit? }
{
  "found": true, "reason": null,
  "run_id": "…", "candidate_id": "v001", "artifact_id": "model.step",
  "encoding": "base64", "offset": 0, "limit": 65536, "bytes": 65536,
  "total_bytes": 44416, "eof": true,
  "sha256": "<整份文件>", "chunk_sha256": "<本块>", "chunk_base64": "…"
}
```

**核对结论（2026-10-07）**：适配层已按上述实际字段对接，无需改 005 的返回结构。面板对以下
差异做了兼容（都只影响装饰，不影响身份校验）：`task` 完整文档 / `task_summary`；
`report` 全文 / 扁平摘要；`artifacts`/`files` 列表缺省时使用运行清单登记的标准产物集
（`model.step` / `model.stl` / `report.json` / `evidence.json`，未登记 id 由服务端
`UNKNOWN_ARTIFACT` 拒绝并原样提示）；evidence 的 `sensor_group` 嵌套形与早期扁平形。

### 身份与诚实性规则（实现即如此，不是愿望）

- 网格必须与请求的 `candidate_id` + `step_sha256` + `run_id` 一致，否则**拒绝渲染**并显示原因；
- 报告的 `hashes.step_sha256` 与候选 STEP 不符 → 标“报告绑定失效”；`task_revision` 与当前
  冻结 revision 不符 → 标“按旧要求通过/失败”，**旧 PASS 绝不当当前通过**；
- 移动设备/操作空间优先用报告 G04 实测位姿（`derived_center_x_mm/y_mm`，唯一解才算实测）；
  退而使用 evidence，再退使用 DesignSpec 位姿并显式标“候选/未验证”；都没有就不画；
- 缺失的 G01–G08 项显示“未包含该检查项，不能视为通过”，不补 PASS；
- 服务不可用 / 无会话 / 无运行 → 友好空态并说明原因，不显示任何 PASS；
- 操作空间标注为“保守包络”；版本切换动画标注“变化示意 …… 不是无碰撞运动规划”。

## 5. 面板行为

- **四区域**（桌面宽屏）：任务与约束（目标、冻结/可改、底座孔、设备、要求值、容差、数据源）、
  三维视图、G01–G08 验证清单、版本与操作记录；窄屏（<1180px）单列堆叠。
- **高度纪律（2026-10-07 收尾；026 选择器收紧）**：面板高 `100%`（AGH无确定高度时以 `100dvh`
  为上限），上三区与版本区各占一行 `fr`（1.8 / 0.5），`min-height: 0` + 区域内部滚动：清单区、
  版本/下载区各用自己的滚动条，把高度让给三维。AGH slot mount 的两条规则都**只命中自家内容**：
  收缩规则作用于 `main#main-content > div[data-agnes-slot-mount='workbench.panel']:has(.fitplate-panel)`
  （占用同一公开 mount 的其它扩展不受影响），审批让位规则直接以 `.fitplate-panel` 为目标；不使用
  `!important`、不 JS 点击。浏览器验收在 1600×1000、1440×900、1080p 以及按 AGH 外壳
  尺寸（288px 侧栏 + 4.75rem 顶栏）模拟的AGH pane（1440×900 → 1152×824）下断言：面板
  `scrollHeight == clientHeight`、页面自身不滚动、展开全部原始数据时画布高度不变且**画布
  ≥240px**、清单区在自己的滚动条里滚动、任何区域不横向溢出。AGH完全不给高度时，
  任务/清单区上限 `min(78vh, 760px)`、版本区 `min(46vh, 460px)` 兜底。窄栏（≤1180px）单列、
  由面板自身滚动；420px 宽的AGH栏不产生横向溢出（有验收断言）。
- **三维视图**：真实 STEP 三角网格（灰）、设备包络（蓝）、连接器操作空间（橙）、
  固定环境（立柱/螺钉头包络，灰）、失败对象（红）；俯视/侧视/正视/等轴/重置相机、
  旋转缩放平移（OrbitControls）、板/设备/操作空间/固定环境可隐藏；点击验证项高亮并聚焦对象；
  切换版本保留相机；WebGL 不可用时显示提示而不是空白画布。报告不属于当前 revision 或绑定失效时，
  视图说明区以警示行写明“此视图不代表当前要求下的通过结果”，不用绿色状态掩盖。
- **检查卡（2026-10-07 收尾）**：G01–G08 每张卡默认只显示中文标题、状态徽章和 3–5 条**来自报告**的
  关键实测（尺寸、孔径/中心偏差、位姿解与实测中心、最小孔边/孔间材料、最小自由间隙与干涉对象、
  导出体积差等，缺项显示“未测量”，不补值）。换名/未知字段退化为少量原始键值，不空卡。
  完整原始 `measured`/`required`、原因代码、证据引用与验证器备注收在“详细测量数据”折叠里；
  **FAIL 项默认展开**。卡片上的实测值直接取自该报告，面板不重算、不四舍五入成“更好看”的数。
- **G06 的最小自由间隙与支撑接触（026 收紧）**：报告自 2026-10-08 起自带独立摘要
  （`minimum_free_clearance_mm` / `minimum_free_clearance_pair` / `support_contact_status`），
  面板区分两种展示：
  - **有完整逐对证据**（每条都解析出 moving/fixed 且都有实测距离）时**核对后**展示：摘要值必须
    等于按 `evidence.pairs` 以 6 位小数 + `(moving, fixed)` 稳定破平得到的最小自由对，且点名对
    必须就是该对、其距离等于摘要值、且不是允许支撑接触——任一项不符（如把 2 mm 记到证据里
    3.5 mm 的对上）以警示显示"不一致"，**不标好**；支撑状态同样与证据推导的聚合核对，矛盾则警示。
  - **没有完整逐对证据**（旧报告缺字段且无 pairs、只有残缺对、或新报告但无 pairs）时，报告数字
    只作为**声明**展示：加 `・未核对`，tone 不用绿色（`SEATED` 声明显式为未核对；声明为
    `PENETRATION`/`NOT_SEATED` 等异常状态仍是警示）。旧报告仍可从**完整** pairs 兼容推导。
  - `minimum_free_clearance_mm` 为 JSON `null`（"无自由对象对"）只有在完整证据核对通过后才显示
    `无自由对象对`；无证据时显示"未核对"，缺全部证据显示"未测量"——绝不显示 0，也绝不把坏摘要
    （非有限数值、缺 pair 字段、pair 形状不符）当成"已测但无自由对"。
  - 允许支撑接触的 0 仍只在"含允许支撑最小距离"里以 muted 出现（旧字段 `minimum_clearance_mm`
    同义），绝不当作自由间隙。
- **数据源**：任务摘要没有 provenance 块时，用同一响应中冻结场景（`scene.provenance`）里的
  真实来源标注，显示为“教学用合成数据（非实测设备）· 等待几何验证”这类说明，声明的 source 原文
  作为提示保留；两者都没有时写明“本次运行的输入任务（未附来源标注）”。
- **技术详情**：构建版本/哈希、数据通道说明与轨迹指引收在版本区底部的“技术详情”折叠里，
  常规流程不再展示 esbuild/three/SDK 等实现细节。
- **轮询**：约 1s 读取 `fitplate.run`；运行进入终态（COMPLETED/CANCELLED/ERROR/
  BUDGET_EXHAUSTED/NEEDS_INPUT）自动停止；手工“刷新”始终可用；`session.projection` 订阅在
  工具事件后触发一次受节流的重读（约 400ms）。同一会话内并发读取会合并，不会重复拉取
  512 KiB 的 scene 响应；scene 只在候选身份变化或手工强制刷新时重取。
- **运行阶段的输入折叠（2026-10-08，P02-07）**：有运行结果时“输入与确认”区默认折叠为一条
  说明 + “展开输入与确认（编辑新请求）”按钮，展开后可编辑并重新整理（新请求走 intake 的
  完整既有流程）。等待草稿/确认阶段（sending/awaiting-draft/draft/confirming/awaiting-commit）
  强制保持展开并完整显示状态——既有任务的 PASS 从不代替新请求的状态；折叠只影响输入资料，
  不改任何证据与报告绑定。
- **版本对比（2026-10-08，P02-07）**：版本列表每行有“设为对比基准”（当前版本禁用），选中后
  版本区内出现对比块：基准/当前两侧各自标注报告新鲜度；读取基准候选**自己的 scene**
  （run/candidate/STEP 三元身份校验，与主场景同一条通道），其真实 STEP 网格以紫色半透明
  ghost 叠加（图例两个版本标签 + 开关），相机不被对比改变；点检查项仍聚焦当前候选的真实
  对象。对比内容：设计差异（仅当两侧设计文档可解析）、G02 实测板尺寸、G01–G08 逐项状态变化
  （不读裸 overall 字符串）、失败对象新增/消除、G06 数值与支撑接触（各自报告 + 各自 pairs
  证据的核对结果），以及两侧 G04 实测中心位移（只有都实测到才显示）。任一侧报告缺失/陈旧/
  绑定失效 → 整块标“未验证对比”并写明原因；基准场景不可用时只比对报告并明说，绝不用示意块
  冒充 STEP 网格。基准报告提供带 `BASELINE-` 前缀的响应副本下载；基准与当前不能是同一版本，
  跨 run/会话/基准换选后迟到响应由令牌门丢弃，绝不串到另一候选。
  **身份复核（030 收紧）**：基准场景绑定的是一枚覆盖“run id + 冻结 task revision + candidate
  + STEP 哈希 + run 可见报告身份（id/overall/created/validator/摘要标记）”的指纹；每次读取
  run 后都按**最新 run** 复核该指纹——包括**请求仍在途**的情形：指纹一变立即作废已加载/在途
  的基准（令牌递增，迟到答案直接丢弃），并按最新身份重新请求；场景完成时再对“控制器已取到
  的最新 run”复算一次指纹与 STEP/revision（不是请求时捕获的旧版本），因此旧 STEP 的迟到场景
  永远不会被接受，报告任务 revision 永远按当前冻结要求计算。同一候选**报告重发布而 STEP 不变**
  同样触发重读。指纹未变时的失败重试只走手动刷新，不随 1s 轮询打服务。
  已知接口缺口（见 §7）：只读服务未暴露候选 design 文档，生产里“设计差异”一行会显示
  “设计文档缺失或不可解析”的诚实说明；实测（G04/G02）不受影响。
- **切换会话**：立即清空 run/版本/网格/报告，丢弃旧请求迟到回复（代际令牌），卸载时清理
  计时器、轮询、订阅、ResizeObserver、WebGL renderer/geometry/material/事件。
- **下载**：STEP/STL/报告等**已登记产物**按 64 KiB 分块读取并校验整份 sha256 后下载；
  未通过版本必须确认，文件名带 `FAILED-` 前缀；登记产物缺失时仅提供“报告 JSON（本次响应
  副本）”并明确标注来源。
- **构建标识**：`插件版本 … · 构建哈希 …`，全部来自构建注入，显示在“技术详情”折叠内；
  工程审阅需要的短 STEP 哈希、candidate id、report id 与完整报告下载仍在常规界面保留。

## 6. 验收

```sh
pnpm run test:adapter            # Node：mesh 绑定、迟到回复、轮询终态、分块下载、新鲜度
pnpm run test:browser:install    # 把 Chromium 装到项目 .cache/playwright（不污染系统）
pnpm run test:browser:deps       # 缺系统库时：只下载 .deb 并用 dpkg-deb -x 解到项目 .cache（不安装、不 sudo）
pnpm run fixture:cad             # 用项目自己的生成器产出真实 CAD 产物到 runs/t09-fixture-1
pnpm run test:browser            # 构建一致性 + Node 测试 + Playwright 真实产物渲染与交互
FITPLATE_BROWSER_OUT=runs/browser-finish-015 node tests/browser/run-fixture.mjs
                                 # 同上，但证据（截图 + fixture-results.json）写入独立目录，
                                 # 不覆盖既有运行记录；不设该变量时默认仍写 runs/browser/
# P02-07 运行阶段/版本对比 fixture（真实 CAD fixture run + AGH DOM 结构 + 真实产物；
# 审批卡为明确标注 synthetic 的注入 DOM；两窗口 1600×1000 / 1366×768）：
FITPLATE_LAYOUT_OUT=<dir> FITPLATE_LAYOUT_PHASE=run node tests/browser/run-stage-layout.test.mjs
# 025 布局回归（输入区折叠也在此夹具中覆盖）：
FITPLATE_LAYOUT_OUT=<dir> FITPLATE_LAYOUT_PHASE=after node tests/browser/intake-layout.test.mjs
# 纯 Node（无浏览器）：版本对比模型与控制器边界
node --test --test-isolation=none tests/browser/version-compare.test.mjs
```

本机环境备注：headless Chromium 缺 `libnspr4 / libnss3 / libnssutil3 / libasound2`
（`ldd chrome-headless-shell` 可复现）。`test:browser:deps` 用 `apt-get download`（**只下载**）
把对应 .deb 解包进 `.cache/chromium-libs/`，脚本运行浏览器时临时设置 `LD_LIBRARY_PATH`
指向该目录，不安装、不 sudo、不改系统；删除 `.cache/` 即完全还原。若机器上已有可用浏览器，
可用 `FITPLATE_CHROMIUM=/path/to/chrome node tests/browser/run-fixture.mjs` 直接复用。
同一步还会把 WenQuanYi Zen Hei 子集字体放进 `.cache/fonts/`，只供 harness 页面加载，
让截图里的中文可读（字体缺失时截图会出现方框，测试不受影响）。

浏览器验收的边界（同样写在 `<证据目录>/fixture-results.json` 的 `notes` 里；2026-10-07 收尾批的
证据在 `runs/browser-finish-015/`，`layout-pane` 场景另用 AGH 外壳尺寸模拟AGH pane——尺寸模拟，
不是原生AGH DOM）：

- 这是 **fixture harness**：真实构建产物 + 真实 HTTP 服务边界 + 真实 CAD 产物，但后端是本地
  fixture 服务，**不是** AGH 原生 BFF 路径；
- 截图只证明“渲染与交互正常”，几何是否通过一律以验证器报告为准（面板不自行判定）；CAD 独立
  验收（004/007）发现的问题不由本面板或本测试背书；
- 原生 AGH 验收（真实 daemon/BFF/会话）需要真实 Web 静态AGH与 `services` 能力，见下节。

## 7. 当前限制与剩余阻塞（截至 2026-10-07 本批结束）

1. **原生 Web 挂载未完成**（不属于本批写入范围的最后一步）：
   - 客户端行**已就绪**：隔离实例里 `@fitplate/plugin` 已 install/trust/enable，名册声明
     `web:@fitplate/plugin`，`entry=extensions/main/client/index.js`、
     `styles=[extensions/main/client/index.css]`、`slots=[workbench.panel]`、
     `services=[fitplate.run,fitplate.scene,fitplate.artifact]`；
   - **静态 Web AGH没有在跑**：daemon 只监听 WS（`discovery.web.url`，如
     `ws://127.0.0.1:45121`），约定的 origin `http://127.0.0.1:4387` 无监听（curl 经环境代理
     得到 503）。启动方式见 006 监督反馈：`packages/web/src/serve-entry.ts --ws <ws> --port 4387
     --root packages/cli/dist/local/web`，由监督/009 的独立启动脚本负责；
   - **能力上限缺 `services`**：运行中 profile 的解析结果
     `.agh-home/data/daemon/profile.json → policy.capabilityCeiling` 不含 `services`，
     即使AGH起来，浏览器服务调用也会按策略被拒（面板会显示“服务不可用”空态）。
     需在隔离 profile 保留原集合并加入 `services` 后**重启实例**（Plan §8.4）；
   - 另注：项目 `scripts/agh/*.mjs` 目前因 AGH 源码导入问题报错
     （`packages/protocol/src/index.ts` 引用 `./request-media.js`，仅存在 `.ts`/`dist`），
     属于 AGH/脚本侧，不在本批写入范围。
2. **已安装快照是本批较早的构建**：`.agh-home/.../_snapshot.json` 记录的 `index.js`
   为 `ca7032b0…`（1308147 字节），而当前构建是 `build-manifest.json` 里的
   `5f3514ae…`（buildHash `e18b31a2ccd1…`）。按 Plan §8.3，快照不可变：需要在监督流程里
   重新 install/update 并核对 sha256，面板才会是当前版本。
3. **AGH原生轨迹入口**：AGH 未提供“从插件槽打开 Traces 面板”的公开 API，面板因此只展示
   业务改动摘要与位姿变化，不注入AGH DOM，也不伪造原生轨迹链接。
4. **改动摘要与设计差异的来源**：`fitplate.run` 的版本摘要不含 `design_summary`，且
   `fitplate.scene` 不返回候选 design 文档——所以面板的“改动摘要”是**实测位姿变化**
   （G04 实测中心对比），版本对比里的“设计差异”在生产环境只能显示“设计文档缺失或不可解析”
   的诚实说明（P02-07 实测对比不受影响：板尺寸来自各自报告 G02、位移来自各自 G04）。
   需要的公开接口缺口：scene（或 run）以只读字段暴露候选 `design.json`（或至少含 plate 的
   `design_summary`）；补齐后 `designSummaryFromDocument` 会直接使用，无需前端再改。
   若后端后续在版本摘要中加入 `design_summary`/`change_summary`，面板会自动使用它们。
5. **`preview_mesh.json` 合同空白**：`schemas/report.schema.json` 的 `previewArtifact` 只覆盖
   `preview.json`（计数 + 身份 + bounds），真实 vertices/indices 在独立文件
   `preview_mesh.json` 中，前端按 §4 读取并自行做绑定校验（服务端也校验一次）。
   建议（非本批改动）为 `preview_mesh.json` 增加一份 additive schema：`candidate_id` /
   `step_sha256` / `tolerance_mm` / `angular_tolerance_rad` / `vertices` / `indices` /
   `bounds`，由 T02 合同层校验，这样身份绑定不必只依赖前端。
6. **three.js 属于插件自有依赖**：随浏览器产物打包（不是AGH external），版本在根
   `package.json` 精确锁定；升级需重跑构建与浏览器验收。
7. **打印强度与运动规划**：面板只展示几何检查结果，不声明可打印强度通过，也不把
   “变化示意”动画当作无碰撞运动规划。
