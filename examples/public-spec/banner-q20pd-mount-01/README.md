# banner-q20pd-mount-01（未注册的公开规格演示 bundle）

- 状态：**未注册、未确认、几何 pending**。不在 `fixtures/dev`（那里按合同只能是 synthetic），
  也不在 `prepare-workspace` 的注册表里；要用于运行必须先明确立项、注册并确认。
- 来源：设备字段（包络 20×32×12、孔距 25.4、孔边距 3.3、M3×0.5 内螺纹）来自 Banner Q20
  Series 手册 127816（p9/p4/p5，URL 与全文 SHA 见 `docs/public-case-q20pd.md`）；孔位 offsets
  `(6.7,±12.7)` 为 p9 侧视图坐标推导；底座孔/固定柱/螺钉头/允许条带/连接器包络/要求值均为
  **自设演示假设**（无实物、无访谈、无用户反馈）。
- 内容：`task.json`、`banner-q20pd-mount-01.scene.json`、`initial-design.json`（自设起点
  `(40,45)`，不是实测坏板，也不是参考答案；没有隐藏的修复坐标）。
- 边界：矩形只是保守包络不是详细 CAD；出线弯曲半径/光学/啮合长度/强度制造未验证；scene 只检查
  一个 connector_access box；产物通过现有合同校验（`load_task_bundle` OK）不等于几何通过。
