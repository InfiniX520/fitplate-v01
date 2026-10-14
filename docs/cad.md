# FitPlate CAD 层（T03/T04/T05/T10）入口

> **2026-10-09更新：**[赛事规则](https://agnes-ai.cn/hackathon)不限定模型品牌；下文2026-10-07是历史模块快照。当前Agnes已接通但新入口会话未完整通过，最新实施见[项目说明](../README.md)。几何验收标准保持不变。

CAD/几何层的**完整说明、检查语义、证据与边界**在 [`cad-validation.md`](cad-validation.md)；本文件只做入口索引，避免两份文档各自漂移。

| 想做什么 | 入口 |
| --- | --- |
| 看 G01–G08 的判据、容差与失败原因码 | `cad-validation.md` §6–§8 |
| 看监督两项注入（mesh 顶点篡改、未授权缺口）的复现与修复 | `cad-validation.md` §12 |
| 生成/验收/导出（受控 CLI） | `PYTHONPATH=geometry .venv/bin/python -m fitplate.cli build|validate|export --request-stdin` |
| 包外核对一个候选/导出目录的哈希与绑定 | `PYTHONPATH=geometry .venv/bin/python scripts/verify-bundle.py <dir>` |
| 包外**重判** G01–G08 | `PYTHONPATH=geometry .venv/bin/python scripts/verify-cad.py <candidate_dir>` |
| 跑几何回归 | `PYTHONPATH=geometry .venv/bin/python -m pytest tests/geometry -q` |

代码位置：`geometry/fitplate/`（`build` 生成器、`inspect_step` 实测、`constraints` 判定、`scene` 场景实体、`export` 导出绑定、`identity` 验证器代码哈希、`publish` 原子非覆盖发布、`cli` 边界）。

**当前状态（2026-10-07）**：`tests/geometry` 116 passed、`tests/contracts` 150 passed；监督独立注入脚本上「合法件 PASS / 两类坏实体 FAIL」；生产报告写入 `hashes.validator_code_sha256`，导出必须实读比对。未完成项（单内核、特征范围、验证集与 A/B、真实 Agnes 链路等）见 `cad-validation.md` §10。
