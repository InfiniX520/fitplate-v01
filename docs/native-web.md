# 原生 Web：AGH 服务与 Web 界面

这套流程把 AGH 的工作台页跑在本机回环地址上，面板从**已安装的插件快照**加载，数据全部来自
真实 daemon 与真实 run store——没有 fixture 服务、没有替身调用方。

```bash
# 0) 依赖与实例（一次即可；只动本项目的 .agh-home 与自己的 daemon 进程）
/home/Heliora/ANG/agnes-harness/node_modules/.bin/tsx scripts/agh/start.mjs   # 隔离 daemon
/home/Heliora/ANG/agnes-harness/node_modules/.bin/tsx scripts/agh/package-fitplate.mjs
/home/Heliora/ANG/agnes-harness/node_modules/.bin/tsx scripts/agh/web.mjs start
# 浏览器打开 http://127.0.0.1:4387/ （只监听 127.0.0.1）
/home/Heliora/ANG/agnes-harness/node_modules/.bin/tsx scripts/agh/web.mjs status
/home/Heliora/ANG/agnes-harness/node_modules/.bin/tsx scripts/agh/web.mjs stop
```

## 组成与边界

- **daemon**：`scripts/agh/start.mjs` 用隔离的 `AGH_HOME=.agh-home`、profile `local-dev`、
  `AGNES_WEB_ORIGIN=http://127.0.0.1:4387` 启动；配置文件由 AGH 官方入口生成，本项目只写
  自己的 `profiles/local-dev/profile.yaml`（模板默认能力集 + `services`，见下），不碰
  `configuration.json`、lock 或秘密存储。
- **页面服务器**：`scripts/agh/web.mjs` 调 AGH CLI 自己的启动器 `agnes serve`
  （`packages/cli/launch/web-command.ts`），由它提供编译好的公共 Web 资产
  （`packages/cli/dist/local/web`）并接上真实 BFF：`/api/client-modules/service|effect`
  （查询服务 / 效果调用）、包与皮肤资产、client-module 快照、Surface 请求转发。脚本**只**管理自己
  记录的 pid（`.cache/agh-web/web.json`）：端口被别的进程占用时明确报错且不杀任何进程；token
  既不读取也不打印（页面通过服务器自身的 `__AGNES_WS_URL__` 注入获得 ws 端点）。
- **能力上限**：`local-dev` 模板的 `policy.capabilityCeiling` 不含 `services`，而 FitPlate 行
  注册三个查询服务；`scripts/agh/lib.mjs::ensureProfileCeiling()` 会在自己的 profile 目录写入
  `profile.yaml`（保留模板全部默认项 + `services`），已存在的文件**不覆盖**（只提示缺项）。
  没有这一项，行会以 `E_CEILING_EXCEEDED` 拒绝加载。
- **执行快照**：daemon 加载的是安装快照里的 `runtime.mjs`；该 runtime 用
  `import.meta.url` 推出同目录的 `python_bridge.py`（`.agh-home/data/profiles/local-dev/packages/
  .runtime-snapshots/sha256-…/src/python_bridge.py`），所以已安装的调用不会因项目源码被编辑而
  改变；配置里的可选 `bridgePath` 只在它**就是**这个文件时被接受。
- **面板**：`plugin/extensions/main/client/index.js`（`scripts/build-client.mjs` 产物，three.js
  以 MIT 许可内联，React 等由AGH import map 提供）。当前构建带 `minify`：daemon 通过私有通道
  读一个 client-module 文件的返回 JSON 上限为 1 MiB（`@agnes/protocol` 的 bounded JSON 校验），
  未压缩的 1.33 MB 包在真实 BFF 上会被 `INTERNAL_ERROR/RESULT_INVALID` 拒绝成 404。

## 本机实测（2026-10-07）

`node tests/native/run-native.mjs`（19 项断言全过，证据在 `runs/native-web/<UTC 时间戳>/`）：

- 页面 `meta#agnes-config` 的 ws 与 `data/daemon/discovery.json` 的 `web.url` 一致
  （`ws://127.0.0.1:45353`，origin `http://127.0.0.1:4387`）——真实 daemon，不是 fixture；
- 打开既有教学会话后，面板显示**真实 run** `r-muxhkvo7-049241bb898e`：revision 1、状态 `BUILT`、
  冻结约束（`sensor-swap-01`、板 80×60×4、底座孔 ⌀4.4）、该 run 记录里的 STEP 哈希前缀；
- 未验证的 v001 如实标为“未验证 / 尚无验证报告”，G01–G08 全部“未包含”（不得显示为通过），
  3D 视图旁标注“this pose was not measured from the artefact”；
- 三个查询服务经**真实 BFF** `/api/client-modules/service` 200 应答；点击下载的 `model.step`
  与 run manifest 记录的 `step_sha256` **逐字节相同**（468ca4edc865…）；
- 切到另一会话（`smoke` 工作区）后面板只显示该会话自己的（空）状态，切回教学会话 run 恢复
  ——不存在跨会话串任务。

截图：`runs/native-web/*/01-panel-teaching-session.png`、`02-panel-other-session.png`；
机器可读结果：同目录 `results.json`。

## 与 fixture 验收的区别

`tests/browser/run-fixture.mjs` 用真实面板 bundle + fixture 服务端点验证渲染与交互（它自己
声明了这一点）；`tests/native/run-native.mjs` 才是原生路径：真 daemon、真快照、真 BFF、真
run store。两者都存在且互相独立，文档不得用前者的结论代替后者。
