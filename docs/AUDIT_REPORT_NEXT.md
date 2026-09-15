# DouyuEx-RL 全量功能图谱与逐行代码审计全书 (AUDIT_REPORT_NEXT)

> **审计基线版本**：`v2026.09.15.01`  
> **源码规模统计**：`src/` 目录共计 11 个模块文件，7,970 行源代码；单文件生产交付物 `DouyuEx_RL.user.js` 约 7,814 行 (~600 KB)  
> **审计目标定位**：服务于 NEXT 版本的 100% 零遗漏全量重构，地毯式梳理所有显式界面交互、隐式底层协议劫持、隐藏路由管道、数据持久化字典、官方 API 依赖及脆弱点重构建议。

---

## 一、 项目全景拓扑与构建流水线

### 1.1 模块拓扑与构建流向

构建工具 `build.js` 为零依赖原生 Node.js 脚本，基于文件系统顺序拼接代码，并经过 Node.js 原生 V8 引擎 (`vm.Script`) 的 AST 级静态语法预检后交付：

```text
src/meta.js (油猴头部元数据 + 跨域白名单)
    │
    ▼
src/core/quality.js (主上下文极速无缝最高画质截杀)
    │
    ▼
src/core/rank_engine.js (现代加密榜单亲密度/贡献值还原引擎)
    │
    ▼
src/modules/01_setup.js (底座装甲: P2P阻断 + WeakMap XHR代理 + 全局菜单)
    │
    ▼
src/modules/02_dom_ui.js (视图层: Level 2 Dock栏 + MIUIX 3级控制台 + Level 5 礼物选择器)
    │
    ▼
src/modules/03_cron.js (定时心跳调度: 60s 等级任务心跳)
    │
    ▼
src/modules/04_styles.js (样式表注入: MIUIX 半透明毛玻璃 + 全域广告剔除 + 夜间模式)
    │
    ▼
src/modules/05_services.js (业务服务层: 增强画中画 + 自动签到 + 弹幕套件 + 多账号切换)
    │
    ▼
src/modules/06_router.js (6 大 URL 意图分发与跨域隐藏管道路由)
    │
    ▼
src/main.js (自执行启动入口)
    │
    ▼ [node build.js -> V8 AST Syntax Check]
DouyuEx_RL.user.js (单文件生产交付产物)
```

---

## 二、 基础底座与权限声明审计 (`src/meta.js`)

### 2.1 源码位置与行号
- **文件**：`src/meta.js` (第 1 - 104 行)

### 2.2 核心元数据与特权清单
1. **Userscript 匹配域名与场景 (`@match`)**：
   - 直播间页面：`*://*.douyu.com/0*` 到 `*://*.douyu.com/9*`（数字房间号主入口）
   - 测试版与专题页：`*://*.douyu.com/beta/*`、`*://*.douyu.com/topic/*`
   - 粉丝勋章精确统计页：`*://www.douyu.com/member/cp/getFansBadgeList`
   - 账号中心跨域管道：`*://passport.douyu.com/*`
   - 消息中心跨域管道：`*://msg.douyu.com/*`
   - 鱼吧与录播视频：`*://yuba.douyu.com/*`、`*://v.douyu.com/*`
   - 充值中心：`*://cz.douyu.com/*`
2. **外部 CDN 依赖库 (`@require`)**：
   - `flv.js/1.6.2`：同屏播放器极速纯视频流解码
   - `svgaplayerweb/2.3.1`：SVGA 动态大礼物特效解析与本地预览
   - `gif.js/0.2.0`：动图生成与本地弹幕渲染录制
   - `three/0.80.0`：360° 全景视频球面透视与交互
   - `xlsx/0.16.4`：直播历史弹幕一键导出 Excel 电子表格
   - `dompurify/2.3.6`：富文本 HTML 标签清洗，杜绝 XSS 注入
3. **跨域网络白名单 (`@connect`)**：
   - `douyu.com`、`douyucdn.cn`、`qq.com`、`douyuex.com`
   - `bilibili.com`、`huya.com`（支持跨站同屏播放）
   - `shadiao.app`（网络经典骚话/文案库）
   - `doseeing.com`（主播数据雷达接口）
   - `registry.npmmirror.com`、`fastly.jsdelivr.net`、`greasyfork.org`
4. **油猴特权函数 (`@grant`)**：
   - `GM_openInTab`：后台打开活动页/更新发布页
   - `GM_xmlhttpRequest`：绕过同源策略请求跨站接口与 CDN 依赖
   - `GM_setClipboard`：一键复制真实直链与房间信息到系统剪贴板
   - `GM_setValue` / `GM_getValue` / `GM_listValues` / `GM_deleteValue`：持久化多账号凭据与全局配置
   - `GM_cookie`：跨子域读写、清理及切换 `LTP0` 登录凭据 Cookie
   - `GM_registerMenuCommand`：在脚本管理器图标菜单注册命令
   - `unsafeWindow`：与页面原生宿主 JavaScript 对象安全打通

---

## 三、 协议级拦截与底层核心引擎审计 (`src/core/`)

### 3.1 极速无缝最高画质拦截系统 (`src/core/quality.js`)
- **源码物理位置**：`src/core/quality.js` (第 1 - 171 行)
- **业务定位**：解决斗鱼旧版播放器起播 2 秒后 DOM 模拟点击“原画”切换导致的黑屏重载与音画不同步，实现 0 秒原画首帧直开。
- **核心实现机制**：
  1. **主上下文原生脚本注入** (Lines 163-171)：通过创建 `<script>` 注入 `runSeamlessQuality()` 字符串，立即自执行并销毁 script 标签，规避油猴沙箱隔离。
  2. **12 秒状态机保护窗** (Lines 12-21)：记录 `_roomEnterTime`。在初次载入或 SPA 单页换房后的 12 秒内为黄金保护期；12 秒后透明放行用户在播放器控制栏上的手动切档行为。
  3. **斗鱼底层画质偏好硬化** (Lines 23-36)：按照斗鱼官方 `pack(val)` 协议格式，强写 6 个 LocalStorage 键为原画 `rate: 0`：
     - `rateRecordTime_h5p_room`
     - `realRateModel2_h5p_room`
     - `player_storage_quality_h5p_room`
     - `player_storage_rate_h5p_room`
     - `realRateModel2`
     - `player_storage_quality`
  4. **预载流掐断** (Lines 37-48)：劫持 `window.preloadStreamUrlPromise`，在保护期内拦截并置为 `undefined`，禁止播放器加载低分辨率推流。
  5. **首流函数改写** (Lines 50-72)：拦截 `window.getLegacyFirstStream`，强制将起播传参 `opts.rate = 0`。
  6. **Fetch 与 XHR 全量响应改写** (Lines 74-160)：
     - 请求阶段：若 URL 包含 `getH5Play` 或 `/super/stream/`，正则替换请求体中 `rate=[^&]*` 为 `rate=0`；
     - 响应阶段：全局劫持 `/betard/{rid}` 接口返回的房间配置，将 `data.room.rate` 改写为 `data.room.multirates[0].type`（最高画质档位）。
- **NEXT 重构指引**：
  - 提取为独立的原画引擎模块 `PlayerQualityInterceptor`；
  - 增加对 HEVC / AV1 编码首选项与多 CDN 线路优先级控制的参数支持。

---

### 3.2 现代加密榜单数据恢复引擎 (`src/core/rank_engine.js`)
- **源码物理位置**：`src/core/rank_engine.js` (第 1 - 1318 行)
- **业务定位**：针对斗鱼现代前端对 CSS class 哈希混淆和数据层加密导致的日/周/月/总榜亲密度数据空白崩溃，提供数据解码与 DOM 注入。
- **核心实现机制**：
  1. **STT 斗鱼序列化协议全解析器** (Lines 104-201)：
     - 实现 `sttFlat(s)` 与 `sttParse(s)`：兼容斗鱼双重转义（`@A` 代表 `@`，`@S` 代表 `/`，`@=` 键值对，`/|/` 现代数组分隔符）；
     - 还原斗鱼前端 chunk 85067 算法，解析长连接嵌套报文。
  2. **WebSocket 原生协议深度挂钩**：
     - 劫持 `window.WebSocket.prototype.send` 与 `onmessage`；
     - 监听文本与二进制数据包，识别 `ranklist`、`dayrk`、`weekrk`、`monthrk`、`totalrk`、`ul_cur_rank` 报文。
  3. **数据清洗与 Map 字典聚合** (Lines 203-270, 300-420)：
     - 提取 `nickname` / `nn`、贡献值 `gold`（除以 100 折算为元）、活跃度 `score` / `act`；
     - 分别存入 `state.data.day`、`state.data.week`、`state.data.month`、`state.data.all` 四大 Map 中。
  4. **DOM 精准注入与像素级排版补偿** (Lines 1180-1286)：
     - 自适应主题采样：从榜单现有节点实时提取文字色彩，通过 CSS 变量 `--ex-rank-color` 无缝统一色调；
     - 注入偏移量 `valueRightOffset: 22` 像素，精准避开斗鱼行末箭头；
     - 事件驱动触发：监听榜单标签点击事件（延迟 50ms 与 250ms）与 WebSocket 数据到达事件（延迟 30ms），双驱动刷新渲染。
- **NEXT 重构指引**：
  - 构建独立 `DanmakuSocketMonitor` 与 `RankListParser` 类；
  - 采用现代 MutationObserver 替代高频轮询，实现纯响应式注入。

---

## 四、 底座装甲与系统路由分发审计 (`src/modules/`)

### 4.1 系统环境与底座装甲 (`src/modules/01_setup.js`)
- **源码物理位置**：`src/modules/01_setup.js` (第 1 - 224 行)
- **核心功能点**：
  1. **组件按需动态加载器 (`ExLoadLib`)** (Line 5)：
     - 封装 `GM_xmlhttpRequest`，支持动态拉取并 `eval` 远程依赖，包含防重入标记 `EXLIB` 与失败重试。
  2. **WebRTC P2P 优雅阻断器 (`GracefulP2PBlocker`)** (Line 6)：
     - 构造符合 W3C 标准的假 `RTCPeerConnection` 原型对象；
     - 优雅拒绝 `createOffer` 与 `createAnswer`（抛出带友好描述的 `DOMException`），阻断斗鱼偷偷上传 P2P 带宽，彻底消除控制台红字报错。
  3. **WeakMap 内存安全装甲** (Line 6)：
     - 使用 `WeakMap`（`Yr`）关联 `XMLHttpRequest` 实例与上下文载荷，跟随请求生命周期由 V8 自动 GC，杜绝多小时挂机内存泄漏。
  4. **脚本标签防篡改过滤** (Line 6)：
     - 代理 `Node.prototype.appendChild` 与 `insertBefore`，识别并阻断未授权的第三方广告脚本注入。
  5. **自动网页全屏** (Line 6)：
     - 依据 `ExSave_FullScreen` 配置，100 秒保护窗内自动轮询并触发网页全屏按钮 (`div.wfs-2a8e83` / `.icon-c8be96`)。
  6. **油猴系统级菜单挂载** (Line 22)：
     - 注册“检查更新”菜单：打开 Greasy Fork 页面；
     - 注册“重置所有设置”菜单：安全清理所有 `ExSave_*`、`Ex_*` 本地存储及 `GM_listValues` 键值。

---

### 4.2 六大场景路由器 (`src/modules/06_router.js`)
- **源码物理位置**：`src/modules/06_router.js` (第 1 - 68 行)
- **路由拓扑与业务分发**：

| 路由判定条件 | 匹配 URL 模式 | 执行逻辑与业务意图 |
| :--- | :--- | :--- |
| **① 鱼吧关闭板块恢复** | `yuba.douyu.com/*?exRestore` | 执行 `wn()`，拦截并改写接口 `group_id`，解除被封禁/关闭鱼吧话题的浏览限制 |
| **② 鱼吧跨域清理** | `yuba.douyu.com/*?exClean` | 清理 Cookie 后通过 `postMessage("yubaCleanOver")` 通知父页面并关闭 |
| **③ 账号切换管道** | `passport.douyu.com/*?exid=chun` | 隐藏 iframe 跨域通道：执行 `switch` / `clean` / `delete` 命令，调用 `GM_cookie` 热切换 `LTP0` 票据 |
| **④ 消息中心清理** | `msg.douyu.com/*?exClean` | 清理消息 Cookie，向父级发送 `msgCleanOver` 并安全关闭 |
| **⑤ 录播与视频播放增强** | `v.douyu.com/show/*` | 监听 `demand-video` Shadow DOM，注入视频精准进度与时间戳提示 |
| **⑥ 粉丝牌开通日期统计** | `douyu.com/member/cp/getFansBadgeList` | 提取 `data-fans-gbdgts` 毫秒时间戳，推算佩戴天数，超 300 天标记高亮红字 |
| **⑦ 同屏画中画纯净流** | `URL 携带 ?exid=chun` | 剥离聊天区、弹幕区、礼物区与顶栏底栏，自动最大化提供纯净视频流 |
| **⑧ 直播间主模式** | 排除 template/h5 后的常规房间页 | 激活底层拦截 -> 监听底栏就绪 -> 挂载样式表 `y()` -> 构建 DOM `d()` -> 启动心跳 `c()` |

---

### 4.3 周期性心跳定时器 (`src/modules/03_cron.js`)
- **源码物理位置**：`src/modules/03_cron.js` (第 1 - 10 行)
- **业务定位**：用户等级任务与日常经验自动领取，设置 60 秒定时心跳 (`setInterval(Qt, 6e4)`)。

---

## 五、 界面交互与样式设计系统审计 (`src/modules/02_dom_ui.js` & `04_styles.js`)

### 5.1 Level 2 Dock 声明式装配系统 (`DOCK_DEFS`)
- **源码物理位置**：`src/modules/02_dom_ui.js` (第 338 - 348 行, 974 - 1048 行)
- **装配图标清单**：
  1. `ex-sign`：一键签到（控制台图标）
  2. `fans-continue`：一键续牌（荧光棒图标）
  3. `extool-icon`：扩展功能（工具箱图标）
  4. `livetool-icon`：直播间工具（播控图标）
  5. `bloop-icon`：弹幕发送小助手（气泡图标）
  6. `ex-lottery`：全站抽奖助手（抽奖轮盘图标）
  7. `popup-player`：同屏播放器（小窗图标）
  8. `ex-monitor`：在线弹幕助手（监控雷达图标）
  9. `ex-update`：版本更新与版本日志（云朵同步图标）
  10. `ex-panel__close`：工具栏快速隐藏/收起按钮

### 5.2 MIUIX 三级控制台与交互规范
- **源码物理位置**：`src/modules/02_dom_ui.js` (第 179 - 336 行)
- **核心规范落地**：
  1. **统一视窗与绝对除缝**：
     - 面板高度严格锁定为统一舒适高度（`370px`）；
     - Flex 垂直分栏，顶底无缝吸附。
  2. **MIUIX 半透明毛玻璃粘性吸顶 Header (`ensureMiuixPanelHeader`)**：
     - `position: sticky; top: 0`，背景应用 `backdrop-filter: blur(28px)`；
     - 统一配置左侧标题与右侧纯净 `×` 强优先级关闭键，杜绝向右溢出。
  3. **Hover Bridge 隐形连桥与 180ms 防抖**：
     - 图标与弹出模态框之间构建 18px 隐形连桥；
     - 划出时提供 180ms 关闭防抖延时，杜绝悬停轻微晃动引发的面板骤关。
  4. **Dock 磁吸指示器 (`updateDockActiveIndicator`)**：
     - 面板呼出时，Dock 底部小胶囊指示条平滑过渡高亮对应图标。

### 5.3 Level 5 大礼物全景选择器 (`openGiftPicker`)
- **源码物理位置**：`src/modules/02_dom_ui.js` (第 16 - 177 行)
- **交互与功能特性**：
  1. **尺寸规范**：`540×410px` 现代化居中悬浮卡片，支持 `Esc` 键与遮罩层点击快速退出；
  2. **双流并行聚合**：
     - “全部礼物”标签：实时拉取当前房间专属礼物 + 官方通用 140+ 款常驻礼物；
     - “背包礼物”标签：现场探查当前用户真实背包道具及数量；
  3. **实时搜索**：内置顶部搜索框，支持礼物名称模糊过滤。

### 5.4 安全事件绑定装甲 (`safeBind`)
- **源码物理位置**：`src/modules/02_dom_ui.js` (第 3 - 12 行)
- **规范**：全面替换原生 `addEventListener`，对异步挂载的目标 DOM 节点做容空防御，杜绝节点未渲染时导致的整链抛错。

### 5.5 全局视觉样式与去广告引擎 (`src/modules/04_styles.js`)
- **源码物理位置**：`src/modules/04_styles.js` (第 1 - 1494 行)
- **核心样式资产**：
  1. **晶透半透明毛玻璃变量池**：定义 `--miuix-bg: rgba(255,255,255,0.72)`、`--miuix-blur: blur(20px)` 等；
  2. **极细无边框 4px 滚动条**：优化长列表浏览质感；
  3. **全域商业死重与广告拦截清单**：
     - 隐藏弹幕区横幅与推荐广告；
     - 隐藏播放器右上角活动角标、悬浮抽奖挂件；
     - 隐藏充值快捷入口、首充礼包诱导动画。

---

## 六、 业务服务层深度功能审计 (`src/modules/05_services.js`)

业务服务层是整个插件最核心的逻辑承载体，代码量达 2,540 行。以下按十大业务体系展开逐项审计：

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        业务服务层 10 大核心体系                         │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ 1. 自动化签到引擎  │ 2. 增强画中画     │ 3. 同屏播放器 (多站联播)       │
│ 4. 弹幕小助手     │ 5. 弹幕套件       │ 6. 弹幕数据雷达与本地收藏      │
│ 7. 自动钓鱼挂机   │ 8. 抢宝箱/抢红包  │ 9. 背包资产与批量送礼          │
│ 10. 多账号切换管道│                   │                                │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

---

### 6.1 体系一：全自动日常签到矩阵 (Sign Engine)
- **源码物理位置**：`src/modules/05_services.js` (第 380 - 820 行)
- **核心函数**：`executeFullAutoSign(onLog, onProgress)`、`runStarPushTasks()`
- **细分功能点**：
  1. **Web 客户端签到**：
     - 接口：`POST https://www.douyu.com/japi/carnival/nc/sign/webSign`
     - 字段：携带用户 `acf_uid`，自动领取每日签到奖励。
  2. **鱼吧每日签到**：
     - 接口：`POST https://yuba.douyu.com/wb/sign`
     - 字段：签到鱼吧个人中心与关注板块。
  3. **房间任务签到**：
     - 接口：`POST https://www.douyu.com/japi/roomtask/task/sign`
     - 字段：针对当前所在房间完成每日首签。
  4. **星推日常任务全景打满闭环 (Star Push Automation)**：
     - **任务总览与状态机核验**：`GET https://www.douyu.com/japi/star_push/task/list`
     - **活动页浏览打卡**：自动模拟上报完成活动页浏览任务；
     - **3 个直播间签到**：动态调用 `introduce` 接口获取当前星推参赛房间列表，按序进入 3 个不同房间发起签到；
     - **指定口令弹幕发送**：识别任务指定口令（如“为热爱加冕”），调用内部接口自动发射弹幕完成任务；
     - **关注主播与安全取关机制**：
       - 识别指定星推比赛房间主播；
       - 调用关注接口完成关注并进行 `task/list` 状态核验；
       - 任务奖励生效后，自动延时 1.8 秒调用取关接口（带 `acf_ccn` 校验），既保证日常任务奖励拿满，又不打扰用户真实关注列表。

---

### 6.2 体系二：增强版画中画 (Enhanced DocumentPictureInPicture)
- **源码物理位置**：`src/modules/05_services.js` (第 825 - 1050 行)
- **核心函数**：`openEnhancedPiP()`
- **技术原理与突破**：
  1. **现代 API 突破**：利用 `window.documentPictureInPicture.requestWindow({ width, height })`，突破标准 `<video>` 画中画无法绘制 DOM 节点的限制；
  2. **弹幕画布实时同步**：在画中画独立微型窗口中创建 `<canvas>` 弹幕层，双向同步主播放器的弹幕动画队列；
  3. **双向交互控制**：在画中画底部注入可交互输入框，用户无需切回主网页即可在独立浮窗内实时打字发送弹幕；
  4. **窗口样式与字体继承**：深度克隆主站的弹幕透明度、字号、运行速度及轨道高度设置。

---

### 6.3 体系三：同屏多播放器联播 (Popup Player)
- **源码物理位置**：`src/modules/05_services.js` (第 1055 - 1310 行)
- **核心函数**：`executePopupPlayer(url, isNoIframe)`
- **技术实现**：
  1. **多平台 URL 智能解析**：支持斗鱼、虎牙、Bilibili 直播间链接快速解析；
  2. **双播放内核**：
     - **无弹幕极速流模式**：调用预载的 `flv.js` 直接拉取底层 flv 视频流渲染，CPU 与内存占用降低 80%；
     - **有弹幕 iframe 模式**：加载包含官方聊天界面的轻量化纯净 iframe；
  3. **自由视窗控制**：支持任意拖拽位置、缩放宽高、多路独立音量滑动条与静音控制。

---

### 6.4 体系四：弹幕发送小助手 (Bloop)
- **源码物理位置**：`src/modules/05_services.js` (第 1315 - 1560 行)
- **核心类/结构**：`BloopAssistant`
- **功能特性**：
  1. **多词库管理**：支持多套循环弹幕词库，支持单条添加、编辑、清空与 JSON 批量导入导出；
  2. **粉丝团自动变色**：轮询开启粉丝团彩色弹幕；
  3. **防封号安全机制**：
     - 支持发送间隔随机抖动（如 3000ms ~ 5000ms）；
     - 支持设置发送总次数上限或倒计时自动安全停发；
  4. **“舔狗模式”**：对接 `shadiao.app` 跨域文案接口，自动拉取网络经典暖心/搞笑骚话自动发射。

---

### 6.5 体系五：弹幕套件与互动增强
- **源码物理位置**：`src/modules/05_services.js` (第 1565 - 1750 行)
- **功能清单**：
  1. **弹幕小尾巴 (`DanmakuTail`)**：
     - 在斗鱼原生长弹幕输入框上挂钩输入事件；
     - 自动追加用户自定义的小尾巴后缀文本（如 `[来自超影客户端]`）；
  2. **聊天区“+1”跟风**：
     - 监听聊天区新接收弹幕，右侧追加 `+1` 悬浮小图标，点击即可自动复读并发送；
  3. **弹幕作者快捷卡片**：
     - 点击弹幕作者头像或昵称，扩展出“快捷禁言”、“快捷回复”、“进房欢迎”、“复制昵称/UID”一键指令。

---

### 6.6 体系六：弹幕数据雷达、无限本地收藏与数据导出
- **源码物理位置**：`src/modules/05_services.js` (第 1755 - 1980 行)
- **功能特性**：
  1. **弹幕时速与营收雷达**：
     - 对接 `doseeing.com` 与斗鱼长连接统计；
     - 实时展示当前房间的分钟弹幕量、贵宾席变动曲线与当日流水统计；
  2. **无限弹幕本地收藏库**：
     - 绕开斗鱼账号官方 20 条弹幕收藏上限限制；
     - 本地使用 `localStorage` / `GM_setValue` 无限存储，支持按时间排序与模糊搜索；
  3. **录播与历史弹幕数据导出**：
     - 结合 `xlsx.full.min.js`，将抓取的弹幕流（时间戳、UID、用户昵称、粉丝牌级别、弹幕内容、送礼金额）一键导出为 Excel 表格；
     - 支持导出为标准 ASS 弹幕字幕文件，便于配合本地录播视频播放。

---

### 6.7 体系七：自动钓鱼挂机系统
- **源码物理位置**：`src/modules/05_services.js` (第 1985 - 2120 行)
- **功能机制**：
  1. **资产探测**：自动获取当前用户的饵料存量（普通饵、高级饵、万能饵）；
  2. **时段感知**：自动识别斗鱼“钓鱼大赛”开启时间段；
  3. **挂机策略**：定时抛竿、自动拉竿、结算收益并自动购买下一轮基础饵料。

---

### 6.8 体系八：抢宝箱与抢红包助手
- **源码物理位置**：`src/modules/05_services.js` (第 2125 - 2240 行)
- **功能机制**：
  1. **宝箱倒计时精准监控**：监听房间宝箱与红包组件；
  2. **毫秒级提前量自动抢领**：设置 150ms ~ 300ms 提前网络请求量，提升命中率；
  3. **验证码智能呼出**：遇到滑动验证码时自动弹出原生长连接验证窗供人工滑动，验证通过后自动继续。

---

### 6.9 体系九：一键自动续牌与背包资产管理
- **源码物理位置**：`src/modules/05_services.js` (第 2245 - 2380 行)
- **核心函数**：`executeFansContinue(inputCount)`、`pt(rid, callback)`、`Ut(giftId, count, roomId)`
- **业务流程**：
  1. 现场调用 `pt` 接口拉取背包物品列表，查找免费荧光棒（ID: 268 或 2358）；
  2. 若未指定每房数量，调用 `getFansBadgeList` 获取佩戴的粉丝牌总数，平均分配荧光棒数量；
  3. 循环调用赠送接口 `Ut`，附带 250ms 间隔，安全续亮所有关注主播的粉丝勋章。

---

### 6.10 体系十：多账号热切换中心 (Account Switcher)
- **源码物理位置**：`src/modules/05_services.js` (第 2385 - 2540 行)
- **技术实现**：
  1. **隐形 iframe 管道跨域穿透**：通过向 `passport.douyu.com` 动态加载隐形 iframe 并携带命令参数；
  2. **凭据安全隔离**：提取并存储斗鱼核心鉴权 Cookie（`LTP0`、`acf_uid`、`acf_username` 等），保存在油猴 `GM_setValue("Ex_accountListPassport")` 中；
  3. **无感切换**：点击对应账号头像后，iframe 管道自动执行旧 Cookie 删除与新凭据注入，通过 `postMessage("switchOver")` 通知主页面刷新，实现无需退出即可快速切换账号。

---

## 七、 斗鱼官方 API 接口依赖全景清单

以下记录了插件中直接交互的所有斗鱼官方接口规范，重构时可作为契约字典：

| 接口分类 | 请求 URL | Method | 关键参数/Payload | 业务职能 |
| :--- | :--- | :---: | :--- | :--- |
| **画质与播控** | `/betard/{rid}` | GET | `rid` | 房间基础配置与全画质档位列表 |
| **画质与播控** | `/lapi/live/getH5Play/{rid}` | POST | `rate=0`, `cdn`, `token` | 获取指定画质档位的直链推流 |
| **日常签到** | `/japi/carnival/nc/sign/webSign` | POST | `uid` | Web 客户端日常签到 |
| **日常签到** | `https://yuba.douyu.com/wb/sign` | POST | `group_id` | 鱼吧个人/版块签到 |
| **日常签到** | `/japi/roomtask/task/sign` | POST | `rid` | 房间每日签到 |
| **星推自动化**| `/japi/star_push/task/list` | GET | `rid` | 星推日常任务清单与完成状态 |
| **星推自动化**| `/japi/star_push/task/finish` | POST | `task_id`, `rid` | 上报星推单项任务完成 |
| **星推自动化**| `/japi/star_push/introduce/list` | GET | `page`, `pageSize` | 获取星推比赛推荐主播房间列表 |
| **用户与社交**| `/japi/roomtask/user/follow` | POST | `rid`, `acf_ccn` | 关注主播 |
| **用户与社交**| `/japi/roomtask/user/unfollow` | POST | `rid`, `acf_ccn` | 安全取消关注主播 |
| **用户与社交**| `/member/cp/getFansBadgeList` | GET | 无 | 查询佩戴的所有粉丝牌与已拥有天数 |
| **背包与资产**| `/japi/prop/backpack/web/v1` | GET | `rid` | 查询当前用户背包礼物与道具存量 |
| **背包与资产**| `/japi/prop/send/backpack/prop` | POST | `propId`, `count`, `roomId` | 赠送背包道具/荧光棒 |

---

## 八、 本地持久化存储字典全集

重构时需严格兼容或平滑迁移的键名全集：

### 8.1 LocalStorage 键名 (插件设置)
- `ExSave_HighestVideoQuality`：是否开启源头极速原画截杀
- `ExSave_P2P`：是否阻断 WebRTC P2P 上传
- `ExSave_FullScreen`：是否进入房间自动激活网页全屏
- `ExSave_Mode`：界面简化与清爽化模式
- `ExSave_FansContinue`：一键续牌默认赠送荧光棒数量
- `ExSave_DanmakuTail`：弹幕小尾巴开启状态与内容
- `ExSave_BloopList`：弹幕助手本地词库 JSON
- `ExSave_AutoSignConf`：自动签到各项勾选状态（房间/鱼吧/客户端/星推）
- `ExSave_PopupPlayer`：同屏播放器记忆的房间与窗口尺寸
- `ExSave_FavDanmaku`：本地无限收藏的弹幕列表
- `rateRecordTime_h5p_room` 等 6 项：斗鱼播放器官方偏好硬化键

### 8.2 油猴特权存储键名 (`GM_setValue` / `GM_getValue`)
- `Ex_accountListPassport`：多账号管理中的账号列表与 Cookie 凭据镜像
- `Ex_VersionCache`：版本检查缓存与时间戳

---

## 九、 NEXT 全量重构架构建议路线图

为实现真正的“从 0 构筑 NEXT 版本”，建议遵循以下现代前端架构标准展开全新实现：

```text
┌──────────────────────────────────────────────────────────────┐
│                    NEXT 现代化重构设计架构                    │
├──────────────────────────────────────────────────────────────┤
│ 1. 语言与工程化: TypeScript + Vite/Rollup + Rollup-Plugin-Userscript
│ 2. 分层架构: Core (拦截) | State (响应式状态) | Services (业务) | UI (组件)
│ 3. 通信解耦: 基于 EventBus / PubSub 事件驱动体系
│ 4. 视图革新: 纯 TSX / 轻量虚拟 DOM，彻底抛弃巨型 innerHTML 拼接
│ 5. 类型安全: 斗鱼 API 响应与长连接 STT 报文的全量 TS Interface 契约
└──────────────────────────────────────────────────────────────┘
```

1. **协议层与业务层彻底物理隔离**：
   - 将 `src/core/quality.ts` 与 `src/core/rank_engine.ts` 作为前置轻量注入包，保持独立生命周期；
2. **状态驱动替代 DOM 探测**：
   - 建立统一的轻量级响应式 Store（如 NanoStores 或轻量 Signals），所有 UI 视图从 Store 订阅数据，彻底消除对 DOM 类名频繁探测的脆弱依赖；
3. **类型契约化**：
   - 为所有 13 个官方 API 编写完整的 TypeScript 请求与响应数据结构定义；
4. **单元测试与 CI 覆盖**：
   - 针对 STT 序列化解码器、URL 路由分发器及时间/金额转换函数编写单元测试，保证重构质量。

---
*全书编制完成，已落盘保存在本地 `docs/AUDIT_REPORT_NEXT.md`。*
