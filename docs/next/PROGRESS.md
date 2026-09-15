# 📊 DouyuEx-RL NEXT 工程实施进度档案 (PROGRESS.md)

任务包：P1.3（已完成）
基线commit / 当前产物SHA256：
- 基线 Commit: `8271b36` (分支: `DYEXRL-NEXT`)
- 当前产物 SHA256: `5f5eba93a5280cbebff86f03d18fa09bb37f1a8739aff7ed6e2b4fdde602ab90` (`DouyuEx_RL.user.js`，严格保持未修改)
- NEXT 产物 SHA256: `36a3e14714f3b06e9ec1966a3d9059e1950d65bcaea1efee98e5e78b79f648d8` (`artifacts/next/DouyuEx_RL_NEXT.user.js`, 61.01 KB)

涉及能力：
- 统一网络与凭据网关：`src/platform/credentials.js`, `src/platform/transport.js`, `src/api/client.js`
- 8 大场景路由拓扑与 SPA 感知：`src/router/index.js` (R-01 ～ R-08 全部 `mock-tested`)
- DOM 适配器防御层：`src/adapters/room.js`, `src/adapters/chat.js`, `src/adapters/player.js`
- 协调引导中心：`src/runtime/orchestrator.js` (F-45 `mock-tested`, 驱动代次递增与 roomScope 销毁)

已阅读的源码符号及契约：
- `src/modules/06_router.js`: il 路由分发器，`exClean`, `exid=chun`, `exRestore` 8 大分支优先级
- `src/platform/credentials.js`: ccn 自动唤醒与提取、post-csrfToken 生成、dy-device-id 注入
- `src/platform/transport.js`: 区分幂等重试与非幂等写操作 (超时严禁自动重发)
- `src/api/client.js`: 严格对应 API_CONTRACTS.md 映射 15 个核心端点

修改文件：
- `src/platform/credentials.js` (凭据中枢：ccn/csrfToken 自动探测与注入)
- `src/platform/transport.js` (传输调度：超时/状态码校验/非幂等写不重发)
- `src/api/client.js` (单例 DouyuClient SDK：覆盖 room, backpack, routine, radar)
- `src/router/index.js` (8 大路由严格优先级分发器与 SPA history 挂钩)
- `src/adapters/room.js` (数字房间号与主播名适配器)
- `src/adapters/chat.js` (React 兼容输入与发送事件适配器)
- `src/adapters/player.js` (安全音量与网页全屏控制适配器)
- `src/runtime/orchestrator.js` (全局总线调度与 roomScope 换房生命周期管理)
- `build/next-manifest.json` (更新拓扑文件清单，共 20 个模块)
- `artifacts/next/DouyuEx_RL_NEXT.user.js` (重新编译产物，61.01 KB)
- `tests/unit/client.test.js` (新增 3 项客户端端点解析与凭据注入测试)
- `tests/unit/router.test.js` (新增 2 项 8 大路由场景判定与 Orchestrator 测试)
- `docs/next/TRACEABILITY.md` (更新 R-01～R-08, F-45 状态为 mock-tested)
- `docs/next/PROGRESS.md` (更新进度档案)

命令与结果：
- `node build.js --next` -> 退出码: 0 (V8 语法核验 6ms 通过，生成 61.01 KB 产物)
- `node --test tests/unit/*.test.js` -> 退出码: 0 (23/23 pass, 耗时 675ms)
- 证据路径: `tests/unit/client.test.js`, `tests/unit/router.test.js`, `docs/next/TRACEABILITY.md`

浏览器环境与测试：
- 步骤：在 Node.js 原生测试环境中模拟 8 大路由 URL，验证优先级判定、参数解析与客户端凭据自动注入
- 期望：R-07 > R-05 > R-06 > R-04 > R-03 > R-02 > R-01 > R-08 优先级准确，非幂等操作超时不重发，换房时 generation 递增并清理旧 roomScope
- 实际：全部 23 项测试 100% 绿灯通过；未测（因当前为 SDK、路由与适配器单元测试阶段）

数据/权限：
- 是否触发真实写操作：否 (严格本地测试与客户端模拟)
- 授权范围：本地 SDK、路由与生命周期编排开发

未完成：
- Phase 2: 全量 MIUIX 拟态组件库工厂 (tokens.css, icons.js, miuix.js, dock.js, gift_picker.js)
- Phase 3: 业务服务领域切片全量重构 (A:资产, B:弹幕, C:播控, D:雷达)
- Phase 4: 老数据平滑迁移集成
- Phase 5: 全域对照验收与分支锁定

阻塞：
- 暂无阻塞。Phase 1 全部三个任务包 (P1.1, P1.2, P1.3) 全部验收通过。

下一任务：
- 单个任务包：`Phase 2: MIUIX 拟态组件系统 (Tokens, Icons, MIUIX Factory, Dock & Modals)`
- 前置条件：Phase 1 基础设施已全部就绪
