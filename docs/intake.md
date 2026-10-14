# 输入入口 core：请求 → 草稿 → 冻结任务（P02-04，compiler v0.2.0）

> **2026-10-12更新：**已接入原生表单、真实附件和三项需求工具。模型可提交有限的板宽上限语义提议；程序重读原文、重算数值/单位/引用并绑定草稿，不能信任模型给的值或 hash。下述有限编译合同不是赛事对通用语义理解的限制。

本文件描述 `geometry/fitplate/intake.py`、三份 schema
（`schemas/request.schema.json`、`constraint-draft.schema.json`、`input-manifest.schema.json`）与
`tests/intake/` 的字段合同。浏览器表单、Host adapter 和三个 intake 工具消费此接口，
program check、模型提议和真人确认各自执行独立的绑定核查。

## 1. 一次数据流

```
表单+短文本 IntakeRequest ──compile_draft──▶ ConstraintDraft（带 draft_hash）
      │  缺失/冲突/超范围/未解释文本 → NEEDS_INPUT / CONFLICTING_INPUT / UNSUPPORTED_REQUEST
      ▼ READY_TO_CONFIRM
 stage_request（受信调用方记下当前 request revision + 内容 hash + 附件 hash + 会话 scope）
      ▼
 freeze_and_publish（核 stage/receipt/卡/请求/草稿绑定 → 编译 → 真实合同校验 → 原子发布）
      ▼
 registry（index + 不可变 revision 目录） ──read_task_bundle──▶ 核 hash/ref 的精确 bundle
```

- **程序**：schema 校验、固定单位换算、确定性编译（可重编译比对）、id/revision/hash/compiler 版本、
  注册/读取、绑定核对、原子发布与孤儿恢复。
- **模型**：可以产出提议；“重算公开 hash” ≠ 字段合法——`verify_draft_binding` 每次都把
  草稿与 `compile_draft(request, card)` 的确定性结果逐字节比对（排除 `created_at`）。
- **真人确认**：只在 Host 正式审批中发生；core 只核 receipt 的绑定（见 §5）。

## 2. 请求字段（表单；用户不编辑 JSON）

| 路径 | 必填 | 说明 |
| --- | --- | --- |
| `request_id` / `request_revision` | ✓ | 稳定身份 + 递增版本；改任何输入=新 revision |
| `device_card_id` | ✓ | 只登记 id（`data/devices/<id>.json`），**绝不允许文件路径或尺寸**；卡只提供**设备接口尺寸**（body/hole_offsets/pitch/thread/torque），环境与要求永不从卡读取 |
| `text` | ✓ | 用户短中文要求原文（保留作 source ref） |
| `form.plate.{width,height,thickness}` | ✓ | `{value,unit}`；thickness 锁定；nominal 必须落在自身 editable 区间内 |
| `form.plate.editable.{width,height}` | – | 明确许可区间 |
| `form.base_holes.{diameter,centers}` | ✓ | 冻结不动 |
| `form.mounting.plate_hole_diameter` | – | 缺省由程序追问；**M3 等螺纹规格永不当孔径** |
| `form.mounting.rotation_deg` | – | 仅 `0`（P0） |
| `form.mounting.movement_license` | – | 可移动**事实许可**（fixed/x_range/y_range/xy_range）+ `source_ref`：许可事实只存在于本字段，`form:<name>` 必须命中**有限注册别名表**（movement_license / movement-license / motion-license / motion / mounting.movement_license，均指向该字段）——`form:does-not-exist` 这类形状合法但不存在的名字一律拒绝；`text[a:b]` 必须是真实区间，**带字面引用时字面必须等于原文切片**，否则不得伪称同一引用；缺失 → NEEDS_INPUT。只证明定位，不承诺理解 |
| `form.environment` | – | 环境表单（见 §4）；缺整节 → NEEDS_INPUT |
| `form.requirements` | – | 四项要求（clearance/edge/hole ligament/tolerance）`{value,unit}` + `source`；缺 → NEEDS_INPUT |

单位表固定 `mm/cm/m/um/in`；布尔、非有限数、缺单位一律拒绝。

长度的 `value=null` 明确表示用户尚未提供该事实，单位仍须声明。仅缺少长度数值、其余结构和已填值合法时，页面允许先“整理需求”；程序返回绑定当前请求的 NEEDS_INPUT，不能确认、编译冻结任务或建模。补齐后产生新请求 revision，旧草稿/确认失效。非数值、无限数、负尺寸、缺设备卡/来源/单位或缺整数索引仍由页面阻止发送，不把它们当作可猜的空值。

get_request 与 propose_constraints 的模型可见文本包含当前附件的完整 `input_form`：要求值、来源、尺寸 editable 和移动许可均带原单位。草稿单条 `keep` 不是“无 editable 许可”的证据；是否可改看显式许可。表单长度 `value=null` 与草稿许可区间尚未选点的 `value_mm=null` 含义不同。

## 3. 文本子集（有限模式；其余进入待澄清）

新增语法只识别完整、明确主语的条件：`板宽/底板宽度/板高/底板高度 + 数字 + 单位`；四项要求的名称加数值/单位（可用“改为/至少/不小于”等连接词）与当前表单值比较，匹配只重述事实，不同则冲突，永不覆盖表单。保留表单条件的引用不新增许可；“板体和底座孔保持原值”仅在板体未声明 editable 时消除歧义。板宽提议另支持“底板宽度/底板横向/整块底板横向”等明确主语，整句、否定、单位和额外条件校验保持。

完整表单引用支持“其余/其他/其它 + 可选已填/已填写 + 条件/参数 + 保持（原值/不变）或以表单为准”。它只保留已提供事实和许可，不能补齐缺值、授予移动许可或吞掉否定与附加条件。用户更正表单事实后生成新request revision，新值仍可锁定；不要求为更正事实开放editable。editable授权模型在当前确认版本内选择尺寸，不能等同于用户输入新事实。

仅识别：`板宽/宽(度) 不超过|≤ N 单位`（**上限**）、`板宽…改为 N`（nominal）、`板厚 保持/改为 N`、
`中心/位置 不能动|固定`、`旋转 N°`（≠0→UNSUPPORTED）、`在允许范围内选择位置`（移动请求）、`M\d+`
（→ rejected `THREAD_SPEC_NOT_DIAMETER`）、超范围关键词（多设备/垫柱悬空/腰形孔/攻丝）。
- “板宽不超过 9cm”（cap）与“板宽改为 9cm”（set）是两种事实：cap 只给**上界**，set 改 **nominal**。
  - editable `[80,95]` + cap 90 → `editable.max=90`、nominal 80；
  - **锁定 80 + cap 90 → READY**：80 ≤ 90 本来成立，cap 不新增任何 editable 权限、宽度仍锁定 80；
  - 锁定 80 + cap 70 → 冲突（80 ≤ 70 不成立）；锁定 80 + “改为 90” → 仍是冲突（要求放宽冻结）；
  - 同段同时给 set 与 cap 时检查共同约束：set 90 + cap 85（或 cap 小于 nominal）→ 冲突，绝不产生
    “nominal 90 但 max 85”这类自相矛盾 READY 稿；数值按换算后的 mm **严格比较**，不用容差改语义。
- 任何**未被解释的尺寸/约束片段**（数字+单位、不超过/至少/保持…）→ `text.unparsed` **NEEDS_INPUT**，
  绝不静默 READY；引用存在≠语义正确，本 core 不声称通用中文理解。

## 4. 环境与要求：显式输入（不是设备卡的暗默认）

`form.environment`（每项 `{value,unit}`；z 一律**绝对**、原样使用，板厚变化不平移）：
- `fixed_cylinders[]`：`{id, axis_xy, radius, z_range}`（圆柱 `fixed_obstacle`）；
- `screw_heads[]`：`{base_hole_index, radius, z_range}`——**恰好每个底座孔一个**；
- `connector_access`：盒 `{local_xy_range, absolute_z_range}` 或显式字符串 `"not_covered"`
  （记录为“未覆盖”，不假称完整空间已验）；
- `support_contacts[]`：仅 `{sensor_body, plate_top}` 对；缺省=单个该支撑（P0 直接支撑模型）。
- 缺整节 → NEEDS_INPUT；**显式空列表是真实声明**：`screw_heads=[]` 或 `fixed_cylinders=[]` 会被
  接收，但冻结场景合同要求“≥1 个固定柱 + 每底座孔恰一个包络”，因此编译器给出**精确 NEEDS_INPUT**
  而不是悄悄补数（`not_covered` 且无障碍时同理）。
- 来源（`user_supplied/measured_device/vendor_datasheet/synthetic_teaching_fixture/design_assumption`）
  与 `note` 随表单进入 manifest 的 `source_map`；**演示环境预填只能作为真实表单输入**，
  PASS 永不升级 source/physical 级别，review_status 保持 `awaiting_geometry_verification`。

## 5. 冻结：stage + 收据绑定（core 只核绑定，不证明批准）

- `stage_request(root, request, card, draft, attachment_sha256, session_scope)`：受信调用方在收到
  真实附件后调用（下一包 get_request 用它）；记录该 request_id 的**当前** revision + 请求/卡/草稿 hash +
  附件字节 hash + scope。**更高 revision 一进 stage（哪怕草稿是 NEEDS_INPUT、哪怕还没发布）**，
  旧草稿即不可提交（`STALE_DRAFT`）；同 revision 不同内容 → `IDENTITY_CONFLICT`；重复相同 stage 幂等。
- `freeze_and_publish(...)`：先 `verify_draft_binding`（请求字节、卡 hash、确定性重编译）、再核 stage
  四项匹配 + receipt（`fitplate-confirmation-receipt`：draft_hash、request id/revision、
  `attachment_sha256` == 调用方独立提供的字节 hash、`session_scope` == **stage scope**，跨 scope 重放
  `CONFIRMATION_SCOPE_MISMATCH`）；请求内 `confirmed:true`/模型字段/自由字符串一律不读也不接受。
- **边界**：core 证明不了 native approval；生产工具必须把匹配草稿作为真实审批调用的参数，只在正式
  获批调用中提交。

## 6. 注册表：不可变、可恢复、拒绝别名

`<root>/index.json`（tasks/revisions/requests/**stages**）+ `<root>/tasks/<task_id>/r<NNN>/…`。
- 发布：flock（先核 root 别名再建锁）+ `.tmp-*`→`os.replace` 原子；**成功以“index 可读回且逐项复核”
  为准**——索引写失败会留下孤儿目录且第一次尝试绝不报成功。
- **可选 initial-design.json 的完整性**（与 manifest/index 完全一致）：manifest `hashes.design_file_sha256`
  非空 ⇒ 目录内必须有该文件、非符号链接、**字节 hash 相等**、且内容仍是**本 task revision 的合法
  DesignSpec**（真实 `validate_design`+`check_design_against_task`）；为 null ⇒ 目录内不得出现该文件
  （多余即 `DESIGN_FILE_UNEXPECTED`）。`read_task_bundle` 每读必核，返回的 design 就是这些已核字节。
- **幂等身份包含 design**：同 request/draft 再次提交时 design 文件 hash 必须相同——换一个 design、
  原提交无 design 而重试带 design、原提交有 design 而重试传 None（想补写不可变目录）都判
  `IDENTITY_CONFLICT`，未提供 design 的原提交保持兼容。
- 孤儿恢复：r<NNN> 已存在但未登记时，**先核全身份**（task/scene/**initial-design** 字节 hash、
  request/draft/card/receipt/stage 各字段完全一致）才补登记（`recovered_orphan:true`）；内容不符 →
  `ORPHAN_CONFLICT`，**绝不覆盖/删除**不可变证据（被篡改的孤儿 design 即一例）。
- 幂等：同 request revision + 同 draft 再次提交 → 先核盘上 revision（hash+身份）再返回既有结果；
  请求/卡已变 → 拒绝（`DEVICE_CARD_CHANGED`/`DRAFT_MISMATCH`/`STALE_DRAFT`），绝不靠 id 命中假成功。
- 安全：root 自身/父组件别名、`.lock`/index/目录/文件符号链接一律 `PATH_UNSAFE`（写前检查，别名目标
  连锁文件都不会被写）；`..`/分隔符拒绝；全部路径按 bridge 同款“词法逐段无 symlink + realpath 仍在
  root 内”规则；跨工作区边界仍由 Host 决定——路径模块只证明路径规则，不证明 Host 边界。
- `read_task_bundle`：核 index 记录的文件 SHA、内容 SHA、task/scene 交叉一致（真实
  `check_scene_against_task`）后返回解析文档 + 真实 `schema.load_task_bundle`；旧 revision 标
  `is_latest:false`。

## 7. 接入与验证范围

原生表单发送真实请求附件；get_request只读编译，propose_constraints在原生审批后登记草稿，commit_task读取用户确认附件并核对全部身份后冻结。仅READY_TO_CONFIRM可冻结，许可域内的候选由模型选择。

需求编译本身不做CAD，也不证明可行。冻结后的build/validate/export运行实际STEP验证与证据绑定；模型测试、局部检查和独立产物复核分别记录，测试通过不构成实物装配或材料强度证明。
