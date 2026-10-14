# 输入、分类与一次调用的真实语义

本文件说明“把任务交给模型之前”这一层：任务冻结（`fitplate_load_task`）、严格输入分类
（`fitplate.preflight`）、以及桥（`plugin/src/python_bridge.py`）对设计参数的判等与失败收尾。
所有行为都能在 `tests/preflight/` 与 `tests/plugin/` 中按名字找到对应测试。

## 1. 放行之前：三种拒绝，一个 OK

`fitplate_load_task` 在创建任何 run 目录**之前**做完合同校验与预分类，因此被拒绝的调用不会
留下半成品 run。结果只有四类：

| 状态 | 含义 | 例子 / 判据 |
| --- | --- | --- |
| `NEEDS_INPUT` | 任务缺本层需要的字段 | `/sensor/hole_offsets` 缺失（F01）；只报最小路径，不猜值 |
| `INVALID_SPEC` | 显式值非法/本版不支持 | 单位不是 `mm`、`allowed_rotation_deg` 不是 `[0]`、范围 min>max |
| `INFEASIBLE` | **可证明**没有任何合法设计能通过 | F02 孔边材料、F03 唯一位姿实体干涉；证明随结果返回 |
| `OK` | 没找到可证明的冲突（包括“域太宽证不了”） | 其余教学与评测用例 |

`INFEASIBLE` 的方向被严格限定：**只**在“整个允许域都不可能达标”时给出，且必须带可复核的
数字。找不到解、域不是单点、图案姿态无法界定，都回到 `OK`，把问题留给设计和测量——不是无解。

### F02（孔边材料）为什么能证

验收对孔的“孔边材料”（G05）判定是：实测 ligament `< required - band` 才 FAIL（band =
`geometry_epsilon_mm`）。所以证明“必 FAIL”必须给出**任何合法工件能测到的最大值上界**：

```
upper_bound = 域上几何最优 + 有利方向容差总和
              （板轮廓 tol+band ｜ 孔心 tol+band ｜ 半径 (tol+band)/2）
margin      = (required - band) - upper_bound      # margin > CERTIFIED_MARGIN(0.05mm) 才判 INFEASIBLE
```

容差**只能加、不能减**：把 `tol` 从界里扣掉会让“边界上本可通过的任务”被误判无解。F02 的
`base_hole[3]`（中心 (3,25)、Ø4.4、板 70×50 锁死）几何最优 0.8mm，即使把三处容差全给有利方向，
上界 0.9275mm 仍远低于 3.0−0.001−0.05，所以严格无解；`required=0.9` 的同款任务则判 `OK`
（tests/preflight 里两种情况都有用例）。

### F03（唯一位姿干涉）的证书

只有设备中心域是**单点**（min==max）且旋转恒为 `[0]`（合同本就只允许 0）时才做碰撞证明。证书是
真实 OCCT 实体交集内切球的半径，减去工件在声明容差内可能发生的一切位移与形变之**上界**：

- 平移：x/y 取 `4·(tol+band)`（派生中心 = 模式匹配 + 允许域带；锚定解在置换/旋转匹配下的界），
  z 取“可调板厚跨度 + 2·(tol+band)”（设备坐在实测板顶）；
- 旋转：图案在匹配容差内旋转 θ = (tol+band)/R_offsets，按 `2·R_body·θ` 扣半径；
- size：本体按负公差收缩按 `√2·(tol+band)` 扣半径（加大只增材料，不扣）。

`certified = ball - 旋转 - 收缩 - (平移 + 固定侧)/2`，要求 `certified >` 干涉体积阈值
（`√[3]{3·V_ε/4π}`）且 `>` 0.05mm。F03 的 3.5mm 内切球在扣完这些项后仍余 ~3.2mm，所以判无解；
如果图案不在设备中心对称（姿态歧义无法界定），本层**拒绝**给出碰撞结论并回到 `OK`。

## 2. 设计参数的判等：重复候选

`fitplate_build_candidate` 的重复保护比较“设计实际请求的几何”，而不是文档写法：

- 参与比较：板宽/高/厚（缺省锁定维度时补齐冻结值）+ 设备中心 + 旋转；
- **不**参与：`note`（换措辞不算新设计）、`parent_candidate_id`（换个父版本同样不算）；
- 命中已有候选的 `param_sha256` → `DUPLICATE_CANDIDATE`（业务拒绝，附已存在的候选号与归一化参数）。

parent 语义是线性链：省略 parent = 接在最新版本后（返回里记录解析出的父版本）；显式给出
非最新版本 → `STALE_PARENT`（拒绝分叉），未知 id → `UNKNOWN_PARENT`。

## 3. 执行的失败与取消：不留“永远 BUILDING”

每次真实 CAD 命令都按**实际耗时**记账（`manifest.budget`），失败也一样：

| 情形 | run 状态 | 事件 | 预算 |
| --- | --- | --- | --- |
| 子进程正常返回、CLI 业务拒绝（exit 3） | 回到该命令前的稳定状态 | `status=REFUSED` + 真实 code | 计实际耗时 |
| 子进程失败/输出不合法/timeout（exit 2） | `ERROR` | `status=ERROR` + 真实 code、`duration_ms` | 计实际耗时 |
| 桥收到 SIGTERM（子进程运行中） | `CANCELLED`（确认子进程组退出后写） | `status=CANCELLED`、`code=SIGTERM`、`charged_ms` | 计已耗 CAD 时间 |
| 预校验拒绝、子进程从未启动（如锁定值被改） | 状态不变 | 不写事件（那次调用没有产生 CAD 工作） | 不计 |

timeout 会向**整个进程组**（child 以 `start_new_session` 启动）发 SIGKILL 并等待回收，不会留下
继续写 run 目录的孙进程；事件里带真实的 `tool_use_id`，前端不会再看到无人负责的
BUILDING/VALIDATING/EXPORTING。`tests/plugin/failure-settlement.test.mjs` 用可控 stub CLI 覆盖了
上面四行（含“孙进程必须死”和“没起子进程不记账”）。

## 4. 报告与代码身份

`report.hashes.validator_code_sha256` 不是自述值：它是 `fitplate/constraints.py`、
`fitplate/inspect_step.py`、`fitplate/scene.py` 三个模块**实际文件的 SHA-256 映射**（相对
geometry root、规范 JSON）再做 SHA-256——算法由 `fitplate/identity.py` 与桥的
`_validator_code_hash` 共享（007 定的同一算法）。桥在 `validate_candidate` 时重算并与报告比对，
不符合即 `REPORT_BINDING_MISMATCH`；`export_package` 前再比对一次，运行中改代码则
`STALE_VALIDATOR` 拒绝导出。

## 5. 单位

合同只接受显式 `mm`；本层不做量级猜测。带显式单位标注的输入（如 N02 的 `10 cm`）由
`scripts/normalize-input.mjs` 的**受限换算**变成 mm 合同，换算只改写模板里已存在的数值字段、
永不新增字段，并且结果必须与冻结 task 逐值相等（`prepare-audit.json` 记录 applied 与
conversion-record 的引用，记录文件本身留在项目里，不进模型工作区）。见
`docs/reproduction.md` 的准备步骤。
