# FitPlate 几何层说明（T03/T04/T05/T10）

> **2026-10-09更新：**几何规范不因模型品牌改变。按[赛事规则](https://agnes-ai.cn/hackathon)，赛事不要求Agnes自研模型；下文各模块“尚未实现/待账号”仅是原记录时状态，当前见[项目说明](../README.md)。已有失败和产物哈希保留，不随规则更新改写。

> 状态：**已实现并实测**（2026-10-07）。本文档描述 `geometry/fitplate/` 下 CAD 生成、STEP 独立测量、约束判定与导出绑定的实际行为，以及它们**没有**证明的东西。
> 适用环境：本机项目 venv（Python 3.12.3 + CadQuery 2.8.0 + cadquery-ocp 7.9.3.1.1），锁定于 `geometry/requirements.lock.txt`。
> 上游合同：`schemas/*.json` 与 `geometry/fitplate/schema.py`（T02，本次未修改）。

---

## 1. 一句话结构

```
TaskSpec + SceneSpec（冻结） + DesignSpec（可选） + 实际 STEP 文件
        │
        ├─ build    → 受控模板生成 model.step / model.stl / preview.json / preview_mesh.json / design.json / build.json
        ├─ validate → 重新导入 STEP，实测 G01–G08，输出 report + evidence（不读 DesignSpec）
        └─ export   → 核对哈希与绑定后，原子发布不可变导出包
```

**验证器不读 DesignSpec。** `validate` 请求里根本没有 `design` 字段；设备位姿一律由实测孔组反推。这一点由测试 `test_validation_never_reads_a_design_document` 与缺陷用例 `params-correct-entity-broken`（设计文档写 y=18、实际实体在 y=30）共同保证。

## 2. 文件与职责

| 文件 | 职责 |
| --- | --- |
| `geometry/fitplate/cli.py` | 受控 CLI 边界：请求校验（fail closed）、stdout 保护、退出码、三个子命令 |
| `geometry/fitplate/build.py` | 固定参数化模板（板体 + 冻结底座孔 + 位姿推导设备孔）、产物写盘、原子发布、生成器自检 |
| `geometry/fitplate/inspect_step.py` | STEP 重读、实体事实、孔识别、独立剖切测量、预览网格、STL 解析 |
| `geometry/fitplate/constraints.py` | G01–G08、容差/临界带、孔匹配、位姿反推、装配干涉与间隙 |
| `geometry/fitplate/scene.py` | 冻结场景 → 真实 OCCT 实体（固定立柱、螺钉头包络、连接器操作空间、设备包络） |
| `geometry/fitplate/export.py` | 导出包：绑定校验（含 validator code hash）、STL/preview/preview_mesh 实读复测、原子发布 |
| `geometry/fitplate/identity.py` | 验证器代码哈希（与 005 bridge 同一算法）：三个判定模块 → 逐文件 SHA-256 → 排序紧凑 JSON → SHA-256 |
| `geometry/fitplate/publish.py` | 原子非覆盖发布：Linux `renameat2(RENAME_NOREPLACE)`，旧内核回退到父目录 `flock` + 复核 |
| `geometry/fitplate/errors.py` | 错误码与两类失败（请求被拒 / 执行失败） |
| `scripts/verify-bundle.py` | 包外核对工具：自带标准库 STL/mesh 读取器与验证器代码哈希重算，重新哈希并复测候选/导出目录 |
| `scripts/verify-cad.py` | 包外**重判**工具：在新进程中对候选实体重跑 G01–G08（不改判据、不含参考布局） |

`fitplate/schema.py`（T02）保持只读；`fitplate/__init__.py` 只声明 `schema`，因此 `import fitplate` / `import fitplate.schema` 仍可在无第三方包的裸 CPython 上运行，而 `fitplate.build` / `fitplate.cli` 需要 CAD 环境。

## 3. 运行方式

```bash
cd /home/Heliora/work/fitplate

# 几何测试（必须带 PYTHONPATH=geometry，不改全局 PYTHONPATH）
PYTHONPATH=geometry .venv/bin/python -m pytest tests/geometry -q

# CLI：stdin 一个 JSON，stdout 一个 JSON，诊断走 stderr
PYTHONPATH=geometry .venv/bin/python -m fitplate.cli build    --request-stdin < build-request.json
PYTHONPATH=geometry .venv/bin/python -m fitplate.cli validate --request-stdin < validate-request.json
PYTHONPATH=geometry .venv/bin/python -m fitplate.cli export   --request-stdin < export-request.json

# 包外核对（候选目录或导出目录均可）
PYTHONPATH=geometry .venv/bin/python scripts/verify-bundle.py runs/<run_id>/candidates/v001

# 包外重判 G01–G08（读候选目录里的 task.json/scene.json + 实体，不信任 report.json）
PYTHONPATH=geometry .venv/bin/python scripts/verify-cad.py runs/<run_id>/candidates/v001 [--json]

# 复现脚本（由 build 写进候选目录，固定模板、参数全部来自 JSON）
cd runs/<run_id>/candidates/v001 && PYTHONPATH=<repo>/geometry <repo>/.venv/bin/python repro.py
```

## 4. CLI 合同

```
python -m fitplate.cli build|validate|export --request-stdin
```

* stdin：恰好一个 JSON 文档（`load_json_strict`：拒绝 NaN/Infinity、重复键、超长/超深文档）。
* stdout：**恰好一个** JSON 结果对象。OCCT 会把 STEP 解析错误打到进程 stdout，因此命令执行期间文件描述符 1 被临时重定向到 stderr，最后才写结果（`_run_with_protected_stdout`）。测试 `test_stdout_stays_machine_readable_when_the_kernel_complains` 用截断 STEP 验证这一点。
* stderr：全部诊断。
* 退出码：`0` 请求已执行（报告可能是 FAIL/UNKNOWN，那是**结论**不是崩溃）；`3` 合同拒绝；`2` 执行失败。

结果信封：

```json
{ "schema_version": "1.0", "command": "validate", "status": "OK",
  "cli_version": "fitplate-cli/1.0.0", "run_id": "...", "candidate_id": "v001",
  "task_id": "...", "task_revision": 1,
  "result": { "report": { ... }, "evidence": { ... } }, "errors": [] }
```

请求字段（**未知字段一律拒绝**，字段集是封闭的）：

| 命令 | 字段 |
| --- | --- |
| build | `schema_version, run_id, candidate_id, task, scene, design, output_dir` |
| validate | `schema_version, run_id, candidate_id, task, scene, step_path, stl_path?, preview_path?` |
| export | `schema_version, run_id, candidate_id, task, scene, report, candidate_dir, export_dir, evidence?` |

* `task` / `scene` 由 T02 合同层校验（`validate_task` / `validate_scene` / `check_scene_binding` / `check_scene_against_task`）；`design` 由 `check_design_against_task` 校验，改动锁定值 → `LOCKED_CONSTRAINT_CHANGED`，过期 revision → `STALE_INPUT`。
* 路径必须是绝对路径且由调用方（AGH 插件）生成：CLI 是**受控底层**，不接受模型直接指定的任意路径。`output_dir` 必须已存在；`export_dir` 必须不存在（顺便只会创建它缺失的那一级父目录）。
* `run_id` / `candidate_id` 受模式约束（`candidate_id` 必须是 `vNNN`）。

## 5. 产物布局

候选目录（`<output_dir>/<candidate_id>/`，先写 `.tmp-<candidate_id>-<token>/` 再原子 rename）：

| 文件 | 内容 |
| --- | --- |
| `model.step` | 实际几何（唯一权威） |
| `model.stl` | 三角化导出（G08 独立复核） |
| `preview.json` | 符合 `report.schema.json#/$defs/previewArtifact` 的身份/计数/包围盒（`candidate_id` + `step_sha256` + `triangles` + `bounds`） |
| `preview_mesh.json` | 真实 `vertices`/`indices`（由**同一份 STEP 重读后的实体** tessellate 得到），带同一 `step_sha256` |
| `design.json` / `task.json` / `scene.json` | 本次候选的设计与冻结输入副本 |
| `build.json` | 清单：哈希、体积/耗时、内核版本、生成器自检 |
| `repro.py` | 固定模板复现脚本（无任务专用代码） |

`build.json` 里的 `self_check` 明确标注为**生成器自检，不是验收证据**。验收只能由 `validate` 在实际 STEP 上给出。

导出目录（`<export_dir>/`）：上述文件 + `report.json` + `evidence.json` + `export-manifest.json`（逐文件 SHA-256、绑定 id、validator code hash、交叉复测结果）。已存在的候选/导出目录一律拒绝覆盖，**空目录也不行**。

发布由 `fitplate.publish.publish_directory_noreplace` 完成：优先 `renameat2(..., RENAME_NOREPLACE)`（内核对已存在的目标——无论是否为空——原子拒绝），内核/文件系统不支持时回退为「父目录 `flock` + 复核目标 + 普通 rename」。因此「先 `exists()` 再 `rename()` 会把并发空目录替换掉」的竞态在设计上被消除，而不是靠调用方自觉。

导出还会**实读并复测** `model.step`/`model.stl`/`preview.json`/`preview_mesh.json`：STL 必须闭合且体积/包围盒在预算内，mesh 必须结构合法、与 STEP 的包围盒/体积一致、三角数与 `preview.json` 一致，并且（报告记录了 `preview_mesh_sha256` 时）字节哈希一致。任何 PASS 报告都必须绑定它当时判定所依据的 mesh 哈希，否则导出拒绝（`REPORT_NOT_MESH_BOUND`）。

## 6. 检查项 G01–G08（全部来自实测）

| ID | 判据 | 关键失败原因码 |
| --- | --- | --- |
| G01 | STEP 可重读、`isValid`、单个连通实体、正体积、特征集受支持（仅平面 + Z 轴圆柱；非 Z 圆柱与其它曲面类型直接判不支持）；**并从实测包围盒 + 实测孔重建「矩形 stock − 实测孔」，与实际实体做双向布尔差**（超预算即拒，内核无法重建则 UNKNOWN） | `STEP_IMPORT_FAILED`(UNKNOWN)、`SOLID_INVALID`、`MULTIPLE_OR_FREE_BODIES`、`NON_POSITIVE_VOLUME`、`UNSUPPORTED_FEATURE`、`UNAUTHORIZED_MATERIAL_REMOVAL`、`UNEXPECTED_EXTRA_MATERIAL`、`PLATE_RECONSTRUCTION_FAILED`(UNKNOWN) |
| G02 | 实测包围盒尺寸与基准点：锁定尺寸按 `dimensional_tolerance_mm` 比较；**可编辑尺寸按允许域比较**（不全局锁板宽）；`bbox_min` 必须落在原点容差内 | `FRAME_ORIGIN_*_OFFSET`、`WIDTH/HEIGHT/THICKNESS_OUT_OF_SPEC` |
| G03 | 冻结底座孔：圆柱面按（轴线, 半径）聚类去重后与冻结孔一对一匹配；每个孔必须贯通（上下端面 + 完整孔口圆环 + 探针无遮挡） | `BASE_HOLE_MISSING_OR_DISPLACED`、`BASE_HOLE_INCOMPLETE_RIM`、`BASE_HOLE_BLIND_OR_PARTIAL_DEPTH`、`AMBIGUOUS_BASE_HOLE_MATCH`(UNKNOWN) |
| G04 | 剩余实测孔必须等于「冻结偏移 + 唯一平移」；孔径、通孔性、允许中心域逐一核对 | `SENSOR_HOLE_MISSING/EXTRA/DIAMETER/BLIND_OR_PARTIAL_DEPTH`、`SENSOR_HOLE_PATTERN_MISMATCH`、`POSE_X/Y_OUTSIDE_ALLOWED_RANGE`、`AMBIGUOUS_SENSOR_POSE`(UNKNOWN) |
| G05 | 由实测孔与实测板边计算孔边材料、孔间材料（含底座孔与设备孔之间）；额外不明孔判失败（G03 未匹配时本项 UNKNOWN） | `EDGE_LIGAMENT`、`HOLE_LIGAMENT`、`EXTRA_UNKNOWN_HOLES`、`UPSTREAM_G03_NOT_MATCHED`(UNKNOWN) |
| G06 | 用 **G04 反推的位姿**构造设备包络与连接器操作空间，对冻结场景的真实实体逐个求交并测距；支撑对（`sensor_body`/`plate_top`）允许零距但禁止穿透，且必须真的接触。**自由间隙摘要（P02-06）**：`measured.minimum_pair_distance_mm`=全部对象对最小值（允许接触可为 0）、`minimum_free_clearance_mm`=排除允许支撑对后的最小值（无自由对象对为 null，绝不显示 0）、`minimum_free_clearance_pair`=该对的 moving/fixed（按报告 pairs 的 6 位小数 + `(moving, fixed)` 稳定破平）、`support_contact_status`=允许支撑对的聚合（`SEATED`/`GAP_BORDERLINE`/`NOT_SEATED`/`PENETRATION`/`NONE`/`POSE_UNKNOWN`，穿透仍 FAIL）。旧字段 `minimum_clearance_mm` 保留但只是 `minimum_pair_distance_mm` 的旧名（含允许接触，可能为 0），**不能当自由间隙**；G04 未 PASS 时本项 UNKNOWN，只报 `support_contact_status=POSE_UNKNOWN`，不编任何距离 | `SOLID_INTERFERENCE`、`CLEARANCE_VIOLATION`、`SUPPORT_CONTACT_MISSING`；G04 未 PASS 时本项 UNKNOWN |
| G07 | 固定条件复检，**换一条路线**：场景内容哈希重算、锁定尺寸重读、底座孔用**平面剖切**法重测（与 G03 的圆柱面法不同）、孔清单不得解释不了的多余孔 | `SCENE_HASH_MISMATCH`、`LOCKED_*_CHANGED`、`FROZEN_HOLE_MISSING_AT_SECTION`、`EXTRA_HOLE_NOT_IN_FROZEN_CONDITIONS` |
| G08 | STEP 重读的尺寸/体积 vs **标准库解析的 STL**（闭合性、体积预算、包围盒）；`preview.json` 绑定候选 id 与实际 STEP 哈希；`preview_mesh.json` **逐项实检**：结构（有限坐标、索引边界、无退化三角形）、声明容差在合理界限内、包围盒与 STEP 一致、三角面自算体积在预算内，且**必须等于该 STEP 在声明容差下的重三角化结果**（顶点多重集与三角形集合逐项一致） | `STL_TRUNCATED`、`STL_NOT_CLOSED`、`STL_VOLUME_MISMATCH`、`STL_BOUNDS_MISMATCH`、`PREVIEW_HASH_MISMATCH`、`PREVIEW_MESH_NOT_PROVIDED`(UNKNOWN)、`PREVIEW_MESH_MALFORMED`、`PREVIEW_MESH_DEGENERATE_TRIANGLE`、`PREVIEW_MESH_TOLERANCE_MISSING`(UNKNOWN)、`PREVIEW_MESH_TOLERANCE_OUT_OF_RANGE`、`PREVIEW_MESH_BOUNDS_MISMATCH`、`PREVIEW_MESH_VOLUME_MISMATCH`、`PREVIEW_MESH_NOT_FROM_STEP`、`PREVIEW_MESH_GEOMETRY_MISMATCH`；缺 STL/preview → UNKNOWN |

`overall` 只有八项全 PASS 才是 PASS；出现 FAIL→FAIL；否则 BORDERLINE→BORDERLINE；其余→UNKNOWN。**UNKNOWN 与 BORDERLINE 都阻止 PASS**（也由 `schema.py:validate_report` 独立复核）。

## 7. 数值容差

| 量 | 来源 | 语义 |
| --- | --- | --- |
| `geometry_epsilon_mm`（0.001） | TaskSpec | 比较器噪声底；同时是阈值周围的**临界带半宽** |
| `interference_volume_epsilon_mm3`（0.0001） | TaskSpec | 判为干涉的最小交集体积 |
| `dimensional_tolerance_mm`（0.05） | TaskSpec | 名义尺寸验收容差（示例值） |
| `minimum_free_clearance` 等（1.0/3.0） | TaskSpec | 工程要求，与 epsilon 无关 |

* 阈值型判据（间隙、孔边/孔间材料）：`实测 ≥ 要求 + band` → PASS；落在 ±band → **BORDERLINE**；否则 FAIL。**绝不放宽 epsilon 把失败改成通过。**
* **G06 的两个"最小值"**（P02-06，报告 `measured`）：`minimum_pair_distance_mm`（全部对象对，含允许支撑接触，**允许 0**）与 `minimum_free_clearance_mm`（**排除**允许支撑对；无自由对象对为 `null`，绝不显示 0）。配套 `minimum_free_clearance_pair`（moving/fixed，按报告 pairs 的 6 位小数 + `(moving, fixed)` 稳定破平，可从 `evidence.pairs` 独立复算）与 `support_contact_status`（`SEATED`/`GAP_BORDERLINE`/`NOT_SEATED`/`PENETRATION`/`NONE`/`POSE_UNKNOWN`）。旧字段 `minimum_clearance_mm` 保留但只是 `minimum_pair_distance_mm` 的旧名（含允许接触），**不能当自由间隙**；G04 未 PASS 时 G06 为 UNKNOWN，只给出 `POSE_UNKNOWN`，不编造任何距离。教学终版 (40,19.5) 实测：允许接触 0（设备贴合板面），整体最小自由间隙 2 mm（连接器到板面），连接器到立柱/螺钉头 3.5 mm 不作为整体最小值。
* 域型判据（可编辑板宽、允许中心域）：落在闭区间内 → PASS（含贴边，任务可合法地把域冻结成一个点）；越界但在 band 内 → BORDERLINE；否则 FAIL。
* STL 与 STEP 的体积差异是**三角化近似**的必然结果，因此按显式预算比较：`max(0.5% × V_step, 0.5 mm³)`（80×60×4 板实测差 1.39 mm³，预算 94.1 mm³）。preview mesh 的体积（由三角面用散度定理自算）用同一预算。
* **重建差预算**（G01：矩形 stock − 实测孔 vs 实际实体）：`max(interference_volume_epsilon_mm3, 1e-6 × V_expected)`。合法件实测双向差均为 **0.000000 mm³**；3×10×4 缺口实测缺料 120.000 mm³，盲腔 200 mm³，倾斜切面 332.55 mm³，均被拒。
* **preview 容差界限**：`tolerance_mm ∈ [1e-4, 0.5]`、`angular_tolerance_rad ∈ (1e-6, π/2]`。上界即本工程最粗 tessellation 等级，避免「恶意巨型 tol + 重算同款粗网格」自证；下界防止无限细分。超出界限是 FAIL（`PREVIEW_MESH_TOLERANCE_OUT_OF_RANGE`），缺失/非有限是 UNKNOWN。
* 网格比较的数值量子与写出方一致（坐标四舍五入到 6 位小数）；重三角化实测与写出的网格**逐字节一致**（1388 三角面顶点与索引元组相等）。

## 8. 关键实现决定

1. **测量与网格无关。** CadQuery 的 `BoundingBox()` 在实体被 tessellate 之后会按网格重建（4 mm 板上膨胀约 6 µm），曾把所有通孔误判成盲孔。`inspect_step.exact_bbox()` 一律用 `BRepBndLib.AddOptimal(useTriangulation=False)` 从几何重建，回归测试见 `test_bounding_box_is_independent_of_meshing`。
2. **孔的“分裂”不等于“多个孔”。** 同一（轴线, 半径）的多个圆柱面聚成一个孔；孔口圆环按**曲线上真实的圆**（`BRepAdaptor_Curve.Circle()`）求和，不能用边的质心（弧的质心不在圆心上——这也是实测中修掉的一个真实缺陷）。
3. **贯通性三重判据。** 圆柱面贯穿上下端面 + 两端孔口圆环角度和 ≈ 2π + 探针圆柱（半径 0.8r）与实体求交体积 ≈ 0。盲孔失败于第一条、开边孔失败于第二条、被材料堵住的孔失败于第三条。
4. **位姿唯一性。** 给定孔组与冻结偏移，一致的平移至多一个（有限非空集合不可能在非零平移下不变）。代码仍然枚举所有一致解并在多于一个时报 `AMBIGUOUS_SENSOR_POSE`(UNKNOWN)，属于防御性设计，由单元测试说明其只可能在退化输入下触发。
5. **不允许“隐藏修复求解器”。** 生成器只按 design 给出的中心与冻结偏移排孔，不做可行性搜索；判定由验证器独立完成。
6. **预览网格预算。** 4000 三角面 + 512 KiB 双上限；超限时逐级加粗**预览**（0.05→0.5 mm，角度 0.1→0.9 rad），最低一级仍超限则明确报 `MESH_BUDGET_EXCEEDED`，**绝不截断网格、绝不动 STEP**（`test_preview_mesh_does_not_change_the_step`）。
7. **独立测量路线。** G07 用平面剖切（薄板求交 → 平面上的内环圆）重测底座孔，与 G03 的圆柱面路线互为交叉验证；STL 用标准库自己解析，与写出它的内核不共享代码。
8. **允许几何由实测重建，不读 DesignSpec、不调用生成器。** G01 用「实测 bbox 的矩形 stock」减去「实测孔（轴线/半径来自实体本身）」得到期望实体，再与实体做双向布尔差。板宽可调任务因此仍然合法（stock 来自实际尺寸，域判定仍在 G02 按 TaskSpec 执行），而任何额外凹槽、切边、盲腔、倾斜外面、外加料都会在差值里出现。
9. **预览网格必须等于「这份 STEP 在声明容差下的三角化」。** 仅比对声明哈希/候选/三角数不够：同一 hash 与计数下换掉顶点即可骗过。现在结构（有限、索引边界、退化）、包围盒、体积、顶点多重集与三角形集合全部逐项核对；mesh 缺失或容差缺失是 UNKNOWN，不是 PASS。
10. **验证器代码哈希（`identity.py`）与 005 bridge 同算法。** 三模块（`fitplate/constraints.py`、`fitplate/inspect_step.py`、`fitplate/scene.py`）逐文件 SHA-256 → `{relative: sha}` 映射 → `sort_keys=True, separators=(",",":"), allow_nan=False` 的 UTF-8 JSON → SHA-256。生产报告写入 `report.hashes.validator_code_sha256`（并在有 mesh 时写 `report.hashes.preview_mesh_sha256`）；导出必须实读该字段并与当前安装代码比对，缺失 → `VALIDATOR_HASH_MISSING`，不一致 → `STALE_VALIDATOR`（均 STALE_INPUT、退出码 3）。manifest 同时记录 `validator_code_sha256`。schema 对该字段可选（历史样本），但生产导出拒绝缺失。
11. **原子非覆盖发布（`publish.py`）。** `renameat2(RENAME_NOREPLACE)` 为主，`flock` 回退为辅；两条路径都不扫描、不删除任何不属于本进程的临时目录。

## 9. 测试

```bash
PYTHONPATH=geometry .venv/bin/python -m pytest tests/geometry -q
# 实测：116 passed（约 126 s）
PYTHONPATH=geometry .venv/bin/python -m pytest tests/contracts -q
# 实测：150 passed, 228 subtests（含报告 schema 的 validator hash 字段用例）
```

| 文件 | 覆盖 |
| --- | --- |
| `test_defects_geometry.py` | **表格驱动的真实缺陷 STEP**：25 个用例覆盖 25 类缺陷（另有 3 个元测试：表格完整性、每个失败用例必须声明失败位置、参考布局/旧中心的实测数值），每个用例显式声明「哪一项、什么状态、什么原因码」；含本轮新增的未授权缺口/盲腔/倾斜面 |
| `test_cli_contract.py` | 进程级合同：单一 JSON stdout、退出码、fail-closed、能力边界、原子发布与失败清理、不可覆盖（含并发双进程竞态、空目录不被替换、flock 回退路径） |
| `test_g08_export.py` | STL 截断/非闭合/错配、preview 哈希/候选/包围盒/三角数错配、**mesh 顶点篡改/内部顶点微移/缺文件/缺容差/巨型容差/越界索引/退化三角形/非有限坐标/异体 mesh**、导出 validator hash 与 mesh hash 绑定与拒绝 |
| `test_measurement.py` | 测量层单元：包围盒与网格无关、分裂圆柱、开边孔、盲孔、剖切交叉验证、网格预算、STL 读取、匹配与位姿、容差带 |
| `test_evidence_binding.py` | 验证器代码哈希：与独立实现的算法一致、模块改动即变化、缺模块报错、生产报告确实绑定 |
| `test_verify_bundle.py` | 包外核对脚本的正例与篡改反例 |
| `test_verify_cad.py` | 包外重判脚本：合法候选退出 0；缺口板退出 1 且 G01 失败；被换掉的冻结 scene 判不可用 |

缺陷表（均为真实实体，非参数断言）：

| 类别 | 期望判定 |
| --- | --- |
| 可行参考布局（参考中心只存在于测试内） | 全部 PASS |
| 主场景旧中心 → 连接器操作空间与固定立柱 | G06 FAIL `SOLID_INTERFERENCE`（实测交集体积 169.65 mm³） |
| 修复后布局 | G06 PASS（实测立柱间隙 5.000 mm，与设计文档的解析预期一致） |
| 底座孔径/漂移/漏孔 | G03 FAIL `BASE_HOLE_MISSING_OR_DISPLACED` |
| 设备孔径/漏孔/多孔/盲孔/孔距错/偏移出界 | G04 FAIL（各具体原因码） |
| 板厚错、整体平移 | G02 FAIL（`THICKNESS_OUT_OF_SPEC` / `FRAME_ORIGIN_X_OFFSET`）+ G03 |
| 开边孔（板过窄） | G02 + G03 FAIL `BASE_HOLE_INCOMPLETE_RIM` |
| 分裂圆柱（一个孔多个面） | 必须 PASS（防误报） |
| 孔间材料不足（1.2 mm < 3.0） | G05 FAIL `HOLE_LIGAMENT` |
| 孔边材料不足（2.0 mm < 3.0） | G05 FAIL `EDGE_LIGAMENT` |
| 多实体 / 非 Z 轴孔 | G01 FAIL `MULTIPLE_OR_FREE_BODIES` / `UNSUPPORTED_FEATURE` |
| 未授权边缘缺口（3×10×4，监督注入） | G01 FAIL `UNAUTHORIZED_MATERIAL_REMOVAL`（实测缺料 120.000 mm³）；G02/G08 仍 PASS，说明 bbox 与预览无法替代重建 |
| 未授权盲腔（10×10×2 顶面凹坑） | G01 FAIL `UNAUTHORIZED_MATERIAL_REMOVAL`（实测 200 mm³） |
| 未授权倾斜外面（旋转切刀） | G01 FAIL `UNAUTHORIZED_MATERIAL_REMOVAL`（实测 332.55 mm³） |
| STEP 截断 / 非 STEP | G01 UNKNOWN，八项全 UNKNOWN，overall UNKNOWN |
| 参数正确、实体被改坏 | 按实体判定（位姿反推为 30，与 design.json 声称的 18 无关） |

报告本身遵守 `report.schema.json`：测试同时用 `schema.py` 与已安装的 `jsonschema` 库双重校验。

## 10. 明确的边界与未完成项

**已证明的**：在上述环境内，对矩形板 + Z 轴圆通孔的候选，验证器能在真实 STEP 上检出第 9 节列出的缺陷；主场景的冲突与可行布局都有实测数值支撑；导出包哈希可复核；候选目录不可覆盖且失败不留残件。

**未证明的（不要对外宣传为已完成）**：

1. **单内核**。生成器与验证器共用 CadQuery/OCCT，不是两个独立 CAD 内核。独立性靠「不同测量路线 + 缺陷注入 + 文件往返」补强，报告中如实说明。
2. **特征范围**。仅支持平面 + Z 轴圆柱。倒角、圆角、沉孔、螺纹、非 Z 孔一律判 `UNSUPPORTED_FEATURE`，不做近似。
3. **公差叠加未建模**。所有结论是名义尺寸的几何检查，`dimensional_tolerance_mm` 不等于可制造精度。
4. **操作空间是保守包络**，不是插拔运动仿真；连接器包络来自冻结场景，未被证明与真实连接器外形一致。
5. **T06–T09 未实现**：AGH 工具插件、模型修复循环、查询服务与前端面板尚未接入；本层只提供被它们调用的受控 CLI。真实 Agnes 端到端链路仍未跑通。
6. **G06 的支撑判据**要求设备包络与板顶面「实际接触」（距离 ≤ epsilon）；这是本版的设计决定，尚未与真实设备/垫片做法核对。
7. **验收级测试集（12 个任务）与 A/B 对照尚未开始**（Plan1 §13.2/13.3）；当前只有开发集 4 个 fixture 与之上的合成用例。
8. **原阶段DS开发记录保留**；“赛事要求真实Agnes验收”是已废止的旧规则解释。合法第三方模型也可承担核心任务；当前版本仍需真实AGH链路与产物验收。
9. **G01 重建的分辨率与其依赖。** 双向差按体积预算判定（默认 `max(1e-4 mm³, 1e-6 × V)`），预算以下的微小改动不改变结论；重建质量依赖孔识别——未识别的孔会以「缺料」形式暴露，但识别本身仍是单内核几何代码。这不是对制造公差或表面缺陷的检验。
10. **preview mesh 的核对面仍是同一 OCCT 内核**：重三角化一致性能证明「这份 mesh 出自这份 STEP」，不能证明两个独立内核互证。STL 用标准库自解析、剖切法走另一条测量路线，属于补强。

## 11. 复现与证据

```bash
# 1) 环境
.venv/bin/python -V                        # 3.12.3
.venv/bin/python -m pip freeze | diff - geometry/requirements.lock.txt
.venv/bin/python -c "import site,sys;print(site.ENABLE_USER_SITE, site.getusersitepackages() in sys.path)"  # False False

# 2) 构建 → 验收 → 导出 → 包外核对
#    （请求 JSON 由 AGH 插件生成；下方为等价的手工调用）
PYTHONPATH=geometry .venv/bin/python -m fitplate.cli build    --request-stdin < build-request.json
PYTHONPATH=geometry .venv/bin/python -m fitplate.cli validate --request-stdin < validate-request.json
PYTHONPATH=geometry .venv/bin/python -m fitplate.cli export   --request-stdin < export-request.json
PYTHONPATH=geometry .venv/bin/python scripts/verify-bundle.py runs/<run_id>/exports/<candidate_id>
```

STEP 重新生成可能带上时间等元数据，因此**不要求字节级哈希相同**；要求尺寸、孔位、拓扑与验收结论等价（`repro.py` 比较的正是这些实测量）。

## 12. 监督注入复现与修复证据（2026-10-07）

监督用独立实体注入证明了修复前的两处**错误 PASS**（日志 `ANG/logs/task01/cad-independent-injection.log`、反馈 `reviews/004-cad-core.md`）。修复后在独立脚本上重跑（脚本与参考布局是监督私有测试，未进入本仓库、fixtures 或提示）：

```text
Original actual CAD:                  overall PASS（八项全 PASS，合法件不回归）
Same hash/count but changed vertex:   overall FAIL  G08 FAIL PREVIEW_MESH_BOUNDS_MISMATCH
Unauthorized actual notch:            overall FAIL  G01 FAIL UNAUTHORIZED_MATERIAL_REMOVAL
```

对应仓库内回归测试（同样的注入，先复现后修复）：

* `test_preview_mesh_vertex_tamper_with_intact_hash_and_count_is_refused`（原注入：`vertices[0] += 100`，声明 hash/候选/三角数不变）；
* `test_defects_geometry.py::unauthorized-edge-notch`（真实 3×10×4 边缘缺口，导出与预览均重新生成且自洽）；
* 另加 `unauthorized-blind-pocket`、`unauthorized-tilted-face` 两个同类变体，防止只堵单一样例。

本批次同时落地的绑定与发布保障（详见 §5/§7/§8.8–11）：

| 项 | 证据 |
| --- | --- |
| 生产报告写 `hashes.validator_code_sha256`（与 005 bridge 同算法） | `test_evidence_binding.py`；`test_a_fresh_report_binds_the_installed_validator_code` |
| 导出拒绝缺失/过期 validator code | `test_export_refuses_a_report_without_validator_hash`（`VALIDATOR_HASH_MISSING`）与 `..._from_changed_validator_code`（`STALE_VALIDATOR`），均 STALE_INPUT、退出码 3 |
| 导出实读 STL/preview/preview_mesh 并与报告一致 | `test_export_refuses_a_mesh_that_changed_after_validation`、`test_export_refuses_a_missing_mesh_that_the_report_binds`；manifest `cross_check` 记录实测体积/闭合性/mesh 哈希 |
| 原子非覆盖（空目录也拒绝） | `test_an_existing_empty_candidate_directory_is_not_overwritten`、`test_publish_guard_refuses_even_an_empty_target_and_survives_the_flock_fallback`、`test_two_concurrent_builds_publish_exactly_one_candidate` |
| 包外重判 | `scripts/verify-cad.py` + `test_verify_cad.py` |
