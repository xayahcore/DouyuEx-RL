# 🗺️ DouyuEx-RL NEXT AST 模块全量评估与三梯队渐进汰换全景图 (MIGRATION_TIERS_EVALUATION.md)

> **评估基准**：当前 `DYEXRL-NEXT` 分支 `src/next/` 目录下全部 76 个 AST 物理模块及契约字典 `build/module-contracts.json`。  
> **实施宗旨**：**严禁任何“推倒重来”的大爆炸式伪重构；坚持基于 AST 契约网关的“绞杀者模式”（Strangler Fig Pattern），自外围无毒工具逐个单模块替换，单改单测，稳扎稳打，逐步将历史混淆代码彻底换血为 100% 现代语义化 ES6+。**

---

## 一、 全量 76 模块整体分布与量化矩阵

根据**模块扇入 (Fan-in) 依赖度、扇出 (Fan-out) 影响面、代码耦合度与底层拦截敏感性**，全域 76 个模块严格划分为三大梯队：

```text
       ┌─────────────────────────────────────────────────────────┐
       │   第一梯队: 零风险外围工具与独立子服务 (18 模块 / ~24%)     │  <-- 【当前启动阶段】
       │   - 特征: 纯计算/微工具/单向存储，无 DOM 深度侵入，单点可测    │
       ├─────────────────────────────────────────────────────────┤
       │   第二梯队: 业务领域切片与独立控制面板 (44 模块 / ~58%)     │  <-- 【第二推进阶段】
       │   - 特征: 涵盖签到/续牌/弹幕/雷达/三级面板，依托契约网关逐步替换│
       ├─────────────────────────────────────────────────────────┤
       │   第三梯队: 深水区核心底层拦截与总挂载 (14 模块 / ~18%)     │  <-- 【终局封板阶段】
       │   - 特征: 原画 12s 秒开、WebSocket STT 解码、主闭包房间装配 │
       └─────────────────────────────────────────────────────────┘
```

---

## 二、 第一梯队：零风险外围工具与独立服务 (18 模块)

该梯队模块具备高内聚、低耦合、职责单一的特征，不直接操作复杂播放器 DOM，即使逻辑出错也不会影响核心观播流程，是**首批汰换与沉淀工程规范的绝佳试验田**。

| 模块路径 | 代码行数 | 导入数 | 导出接口 (Exports) | 核心职责与汰换收益 |
| :--- | :---: | :---: | :--- | :--- |
| `src/next/services/version.js` | 76 | 7 | `initVersionLifecycleNotice`, `isNewerVersion` | **版本生命周期与更新提示**：消灭老式 `var` 和 XMLHttpRequest，改为标准 Semver 比较与现代 `async/await fetch`。 |
| `src/next/services/pip/packet-dedup.js` | 11 | 3 | `isRepeatedPipPacket` | **画中画弹幕去重**：消灭混淆变量 `e, t, o, n, i`，改用清晰的时间滑窗去重语义。 |
| `src/next/services/pip/persistence.js` | 14 | 2 | `persistPipPreferences`, `restorePipPreferences` | **画中画配置持久化**：规范化 JSON 容错与防抖落盘。 |
| `src/next/services/pip/merge-rules.js` | 27 | 1 | `findPipMergeKey` | **画中画弹幕合并规则**：提取纯函数，规范多弹幕叠加合并键。 |
| `src/next/services/pip/packet-parser.js` | 26 | 1 | `parsePipChatPacket` | **画中画消息协议反序列化**：纯粹的数据解析器，无 DOM 副作用。 |
| `src/next/services/pip/state.js` | 17 | 0 | `pipDedupCapacity`, `pipMergeGroups`, `pipPacketTimes` 等 | **画中画状态容器**：将混淆变量名（`Oa`, `ja`, `za`）全面映射为规范命名。 |
| `src/next/services/pip/markup.js` | 25 | 0 | `createPipWindowMarkup` 等 | **画中画原生微窗骨架**：纯 HTML 模板生成，组件化收敛。 |
| `src/next/services/spending.js` | 115 | 4 | `initSpendingTracker`, `getMonthlyCost` 等 | **当月鱼翅与消费统计**：从散乱逻辑重构为纯净数据模型。 |
| `src/next/platform/cron.js` | 120 | 6 | `scheduleCronTask` | **定时任务轻量调度器**：消除野生 `setInterval`，实现统一可销毁的任务树。 |
| `src/next/platform/md5.js` | 230 | 5 | `hex_md5`, `b64_md5` | **标准哈希算法库**：直接引入标准现代纯净实现。 |
| `src/next/runtime/heartbeat.js` | 17 | 3 | `startTaskHeartbeat`, `stopTaskHeartbeat` | **经验心跳调度**：60s 幂等定时器，彻底防止重复开启。 |
| `src/next/ui/panels/update.js` | 135 | 9 | `createExUpdatePanel` | **版本更新三级控制台**：纯静态说明模态，重写状态机（检查/最新/升级）。 |
| `src/next/services/video-timestamps.js` | 102 | 8 | `formatVideoTimestamp`, `jumpToOffset` | **视频录播时间戳换算**：纯数学与日期格式化工具。 |
| `src/next/ui/room/last-live.js` | 45 | 2 | `mountLastLiveBadge` | **上次开播时间标签**：独立小气泡渲染，依赖极轻。 |
| `src/next/ui/bindings.js` | 30 | 2 | `safeBind`, `safeEl` | **DOM 安全绑定网关**：强化弱引用与防重复监听保护。 |
| `src/next/services/pip/packet-dispatch.js` | 46 | 8 | `dispatchPipPacket` | **画中画分发管道**：流转给去重、解析与渲染器。 |
| `src/next/services/pip/window.js` | 360 | 37 | `openEnhancedPip`, `closeEnhancedPip` | **画中画独立小窗控制器**：Chromium 原生 PiP 控制。 |
| `src/next/entry.js` | 5 | 1 | (无导出，总引导) | **总执行入口**：调用 `installNavigation`。 |

---

## 三、 第二梯队：业务领域切片与独立控制面板 (44 模块)

该梯队构成了 DouyuEx-RL 最丰富的业务矩阵。此梯队模块涉及特定的 API 交互与子控制面板，**依托第一梯队积累的契约网关经验，按业务线逐块汰换**。

### 1. 资产打卡与日常运营业务线
- `src/next/services/fans.js` & `src/next/ui/panels/fans.js`：一键续牌、荧光棒分配与三级控制面板；
- `src/next/services/sign-engine.js` & `src/next/ui/panels/sign.js`：5 大日常任务全景打卡闭环（房间/客户端/鱼吧/星推/钻粉）；
- `src/next/services/gifts.js` & `src/next/ui/gift-picker.js`：背包资产赠送与 5 级拟态大选择器；
- `src/next/services/automation.js`：星推任务自动上报与安全取关状态机。

### 2. 弹幕社交与房管工具业务线
- `src/next/services/danmaku-filters.js`：重复弹幕折叠、大表情屏蔽与高级正则过滤；
- `src/next/services/batch-danmaku.js`：弹幕小尾巴自动拼接与延迟发生器；
- `src/next/services/blocked-danmaku.js`：屏蔽词本地极速探测（800ms 删除线提示）；
- `src/next/services/danmaku-history.js`：无限本地弹幕收藏库；
- `src/next/ui/room/bloop.js`：弹幕小助手顺序/随机轮播。

### 3. 全站感知雷达与扩展系统业务线
- `src/next/services/lottery.js` & `src/next/services/lottery-page.js`：全站大奖雷达广播解析与一键上车；
- `src/next/services/accounts.js`：多账号跨域无感免密热切换；
- `src/next/services/yuba.js`：鱼吧解除限制与主贴直达；
- `src/next/ui/dock.js` & `src/next/ui/icons.js`：76px 晶透微胶囊 Dock 工具栏与 9 大按钮事件。

---

## 四、 第三梯队：深水区核心底层与高耦合拦截 (14 模块)

该梯队是 DouyuEx-RL 能否“秒开最高画质”和“精准解析 STT 榜单”的生命线。内部包含深度的 WebSocket 原型包装、DOM 原型劫持与巨型房间闭包，**在此阶段严禁改动，保持原版物理守恒，留在最后进行针对性收敛**。

| 模块路径 | 职责描述 | 维持原版的核心原因 |
| :--- | :--- | :--- |
| `src/next/core/quality.js` | 首流原画 12s 保护窗状态机 | 原生主上下文直接拦截，与斗鱼底层播放器高度耦合，改动极易产生黑屏或切流卡顿。 |
| `src/next/core/rank_engine.js` | WebSocket STT 报文双重转义解码 | 斗鱼实时 STT 协议高度混淆，现有转义算法已经历数年线上实战检验，极其稳定。 |
| `src/next/platform/flv-player.js` | 原生 flv.js 播放器接管 | 承载同屏联播与独立流媒体播放底层。 |
| `src/next/platform/dom-observers.js` | 全局 MutationObserver 订阅管理器 | 负责捕捉动态异步加载的各种播放器 DOM。 |
| `src/next/platform/script-hooks.js` | 外部脚本/全局变量原生劫持 | 包含关键的全局 window 属性垫片。 |
| `src/next/runtime/room-hooks.js` | 房间级原生 Hook 总调度 | 调度原画拦截与榜单引擎注入。 |
| `src/next/runtime/router.js` | 8 大路由场景分发器 | 准确识别普通房、同屏房、鱼吧、跨域认证管道等。 |
| `src/next/services/session.js` | 核心 Session 凭据与房间 ID 计算 | 导出全域最敏感的 `currentRoomId`、`userToken`。 |
| `src/next/services/room-actions.js` | 房间核心动作总装配 | 包含大量与官方页面通信的历史动作。 |
| `src/next/services/danmaku-renderer.js` | 弹幕渲染引擎 | 播放器内部 Canvas 与 DOM 弹幕高速绘制。 |
| `src/next/ui/room/mount.js` | 房间 DOM 挂载总入口 | 控制所有面板与工具栏的初始化时序。 |
| `src/next/ui/room/shell.js` | 播放器主容器外壳注入 | 承接 Dock 与工具栏的外层定位。 |
| `src/next/ui/room/player-bindings.js` | 播放器事件高密绑定 | 键盘快捷键、全屏切换、滚轮调音。 |
| `src/next/ui/styles.js` | 全局 102 KB 样式表 | 包含所有 MIUIX 晶透变量、极细滚动条与去广告规则。 |

---

## 五、 渐进汰换的黄金四步法

在替换第一梯队任一模块时，必须严格执行以下四步纪律：

```text
[Step 1] 契约审查 ───> 查阅 build/module-contracts.json 明确入参与出参
  │
[Step 2] 现代重写 ───> 编写 100% 语义化 ES6+ 源码，彻底消灭 var 与单字母混淆
  │
[Step 3] 构建与语法 ─> 运行 node build.js --next，通过 V8 AST 编译检查与零失真拼接
  │
[Step 4] 自动化双检 ─> 运行 npm test 与 npm run verify (7/7 门禁全绿)，浏览器抽检
```
