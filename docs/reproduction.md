# 复现：在新目录重建几何、报告与完整 bundle

本文件给出一条**可跑的单一离线复现路径**（2026-10-07 实测）：同一个冻结任务（`sensor-swap-01`）
在一个全新目录里重建几何、重新独立测量、导出并在包外验证完整 bundle。它不经过模型、不经过
daemon、不产生费用。STEP 文件头含内核时间戳，**不要求字节相同**；要求的是任务、场景、实际孔位、
体积、状态与报告绑定等价。

这条路径是**人工结构化工程参考**：输入复制自公开 fixture（`fixtures/dev/`），design 文件由命令行
显式传入（例如教学 fixture 运行证据里的真实 design 文件）。它不是模型会话，不是模型修复的证明，
也不会把任何“答案”复制进工作区方法 skill。

## 0. 一次命令（实际跑通）

```bash
# CAD 单并发（与其它批共用）：
flock /tmp/fitplate-task01-cad-test.lock .venv/bin/python scripts/reproduce-candidate.py \
  --design runs/t09-fixture-1/candidates/v002/design.json
```

脚本 `scripts/reproduce-candidate.py` 做四件事，全部使用真实接口：

1. 把公开 fixture 的输入（`task.json`、场景 JSON、`initial-design.json`）与通用方法 skill
   （`.agh/skills/fitplate-design/SKILL.md`）复制进**新建**目录（默认
   `demo-workspaces/repro-<task_id>-<UTC 时间戳>`；目录已存在则拒绝，**绝不覆盖旧证据**），
   并写 `repro-audit.json`（来源路径 + sha256）；
2. 通过几何 CLI 的真实边界 `python -m fitplate.cli build|validate|export --request-stdin`
   依次构建、独立测量、导出（请求形状与插件桥一致，见下节）；
3. 用 `scripts/verify-cad.py` 对候选目录**重新判定 G01–G08**（不信任候选自己的报告）；
4. 用 `scripts/verify-bundle.py` 逐字节复核导出 bundle（文件哈希、网格/STEP 复测、报告绑定）。

stdout 只打印实际结果；退出码 0 仅当两个包外验证脚本都通过。

2026-10-07 实测（本次运行）:

```text
workspace: demo-workspaces/repro-sensor-swap-01-20261007T095916Z
design: …/runs/t09-fixture-1/candidates/v002/design.json sha256=4e50619de527ceec…
build: step_sha256=003de5d27a95bdf7c2… duration_ms=236.5
validate: report_id=r-repro-1-v001 overall=PASS（G01–G08 全 PASS）
export: runs/r-repro-1/exports/v001/r-repro-1-v001 files=10
verify-cad exit=0 · verify-bundle exit=0
```

同一 design 再跑一次（新目录）：`step_sha256=51d09540c1b601f8…`（字节不同），两份的
`verify-cad` / `verify-bundle` 都是 exit 0 —— 等价性由测量事实决定，而不是字节。

## 1. 脚本实际生成的请求（与桥一致）

三个请求字段与 `plugin/src/python_bridge.py` 发出的完全一致（脚本即执行样例，可直接对照）：

| 命令 | 字段 |
| --- | --- |
| `build` | `schema_version, run_id, candidate_id, task, scene, design, output_dir` |
| `validate` | `…, step_path, stl_path, preview_path`（后两者可选，存在即带） |
| `export` | `…, report, candidate_dir, export_dir, evidence`（`evidence` 来自 validate 的实际返回） |

`validate` 用 `build` 返回的候选目录（`model.step` / `model.stl` / `preview.json`）；`export_dir`
不允许已存在，其**父目录**（`runs/<run_id>/exports/<candidate_id>/`）由调用方先建好。

## 2. 默认 design 与“如实报告”

`--design` 不给时用 fixture 自带的 `initial-design.json`（沿用旧设备中心的初始候选）。它**按真实
测量如实判为 FAIL**（本次实测 `G06 FAIL`，`verify-cad exit=1`；导出包本身仍逐字节通过
`verify-bundle`，作为诊断版本可核）。想复现一个全 PASS 的完整证据包，传一个真实 design 文件即可：

```bash
flock /tmp/fitplate-task01-cad-test.lock .venv/bin/python scripts/reproduce-candidate.py \
  --design runs/t09-fixture-1/candidates/v002/design.json   # 教学 fixture 证据目录里的真实 design
```

（该 design 文件是教学 fixture 的人工工程产物，明确标注为人工参考；它不是模型输出的修复，
也从未被复制进任何模型工作区的 method skill。）

## 3. 包外验证整个 bundle（单独命令，注意 runs 层）

```bash
OUT=demo-workspaces/repro-sensor-swap-01-20261007T095916Z
PYTHONPATH=geometry .venv/bin/python scripts/verify-bundle.py \
  "$OUT/runs/r-repro-1/exports/v001/r-repro-1-v001"
# 逐文件重算 sha256、自带 STL/网格检查、重新导入 STEP 复测、重算规范 validator 代码哈希
# 8ad442ed…、比对报告体积 → VERIFIED, exit 0
PYTHONPATH=geometry .venv/bin/python scripts/verify-cad.py \
  "$OUT/runs/r-repro-1/candidates/v001"
# 不信任候选自己的报告，重新判定 G01–G08 → 全 PASS, exit 0
```

实测事实（来自上面的真实输出）：板包络 `80 × 60 × 4 mm`、STEP 体积 `18828.03543 mm³`、
单实体 1 shell、6 个 PLANE + 8 个 CYLINDER 面；预览网格 1388 三角形 / 1384 顶点，与 STEP
体积差 1.386 mm³（预算 94.14 mm³）、包络差 0；报告、预览网格、STL 与 STEP 的哈希互相绑定。

两个脚本都不读参考布局、不做缺陷注入；`verify-bundle.py` 只验包内一致性与“测量—报告”绑定，
`verify-cad.py` 才是重新做验收判定。

## 4. 单位换算的真实应用（N02）

```bash
node scripts/prepare-workspace.mjs --task n02-units-mixed --id demo-n02 --force
#   单位标准化：applied=5，equals_frozen_task=true，
#   record=evaluation/inputs/N02/conversion-record.json（仅引用，不复制）
```

`plate.width: 10 cm → 100 mm` 等 5 处显式换算由 `scripts/normalize-input.mjs` 的受限换算完成
（只改写模板已有字段、角度/索引/哈希永不缩放），结果与冻结 mm 合同逐值相等后才落盘；用真实桥
`load_task` 载入该任务返回 `plate.width = 100`。换算记录留在项目内，工作区只保留标准化的 mm
合同和 `prepare-audit.json` 里的引用（路径 + sha256）。

## 5. 复现的边界

- 输出目录必须不存在（默认新目录、带时间戳）：旧证据永不覆盖；本次实测的两个目录都保留在
  `demo-workspaces/` 作为证据；
- `tests/browser/generate-cad-fixture.mjs` 的固定 run（`t09-fixture-1`）存在即拒绝重建——那是
  fixture 验收的证据目录，本复现对它只读引用；
- 本复现不需要 daemon、不需要模型、不产生费用；它验证的是“几何 + 测量 + 导出 + 包外校验”，
  不代表也不预支真实模型教学/A/B 的结果。
