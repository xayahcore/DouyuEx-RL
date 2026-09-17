# ⚓ DouyuEx-RL NEXT 拦截点与生命周期管理契约 (HOOKS_AND_LIFECYCLE.md)

> 任务包：`P0.2` / `P2` / `P3`
> 目标：明确所有 Hook 挂载顺序、作用域隔离、DOM 观察器、Dock 与三级面板生命周期、定时器与销毁机制，确保零泄漏与零冲突。

---

## 一、 Hook 安装时序图 (Installation Chronology)

```text
1. document-start (极速同步，不可延迟)
   ├── 安装 P2PBlocker (优雅替换 RTCPeerConnection 假原型，阻断 WebRTC 上传)
   ├── 挂载 QualityInterceptor (劫持 preloadStreamUrlPromise 与 getLegacyFirstStream, 启动 12s 原画保护窗)
   └── 注入 RankEngine (主上下文 WebSocket STT 报文拦截器与 50ms 注入调度)

2. document-idle / DOMContentLoaded (异步初始化)
   ├── 激活 Router 分发器 (判定普通房间 R-01, 同屏 R-02, 录播 R-03, 鱼吧 R-04, passport 管道 R-05, 粉丝页 R-06 等)
   ├── 实例化 State Store (加载配置并执行 44 个老数据键平滑迁移)
   ├── 装配 DouyuClient Gateway (唤醒 ccn, 注入设备指纹与 CSRF 凭据)
   └── 靶向监听目标挂载点 (.PlayerToolbar-ContentCell .PlayerToolbar-Wealth, #js-player-toolbar, .layout-Player-chat)

3. UI 装配 (DOM 就绪后一次性装配并随 SPA 代次重载)
   ├── 注入 MIUIX Tokens CSS (76px 晶透微胶囊、380px 三级面板、极细 4px 滚动条)
   ├── 挂载礼物栏首位红白精灵球入口 (.ex-icon / .miuix-ex-icon，经典 108×108 多色高精度 SVG)
   ├── 装配 Level 2 Dock 栏 (严格 9 按钮顺序，76px 高度微胶囊，56×56px 按钮单元，24×4px 磁吸胶囊指示器，32px 隐形连桥与 400ms 防抖)
   ├── 挂载 6 大核心一级控制面板 (fans, sign, extool, livetool, bloop, lottery, popup, update)
   └── 绑定页面微交互 (画中画独立打字、飘动弹幕悬停 +1 复读、弹幕右键快捷卡片、视频画面右键菜单)
```

---

## 二、 核心 Hook 靶向范围与 Disposer 规约

| 目标对象 | 劫持/挂钩方法 | 作用域与机制 | 恢复与销毁 (Disposer) |
|:---|:---|:---|:---|
| `window.RTCPeerConnection` | 原型属性伪装 | 全局，阻断 WebRTC 偷跑流量 | 保存原构造函数，测试或禁用时安全回退 |
| `window.fetch` | 函数包装 | 拦截 `/betard/` 与推流直链请求，改写画质参数 | 保存原始 `fetch` 引用，仅对特定 URL 进行改写过滤 |
| `window.WebSocket` | 构造器原型方法包装 | 主上下文，嗅探并解码斗鱼 STT 榜单数据 | 保持单例，内部维护监听器集合，换房重置状态 |
| `Node.prototype.appendChild` | 原型方法拦截 | 靶向阻断未授权广告脚本 | 仅放行白名单脚本，不影响正常业务 DOM |
| 播放器 `<video>` 容器 | `wheel` 滚轮事件 | 鼠标滚轮调音，阻止页面原生滚动 | 组件 `destroy()` 时显式 `removeEventListener` |
| 弹幕输入框 (`.ChatSend-txt`) | `keydown` (回车) | 弹幕小尾巴自动无缝拼接 | 组件 `destroy()` 时安全解绑，不干扰输入法组合事件 |
| 弹幕行悬停气泡 | `mouseenter` / `mouseleave` | 飘动弹幕 +1 跟风复读 | 换房与组件销毁时清空 Observer |

---

## 三、 Dock 与三级控制面板生命周期

1. **精灵球挂载 (`mountLauncher`)**：
   - 寻找首选锚点：`d.querySelector(".PlayerToolbar-ContentCell .PlayerToolbar-Wealth") || d.querySelector(".PlayerToolbar-Wealth")`；
   - 插入至第一子节点前 (`insertBefore(iconBtn, wealthBar.firstChild)`)，保持与银币/金币/背包原生排列；
   - 备用锚点：`.ToolbarGiftArea-container` 或 `document.body`；
   - 点击事件：`toggleDock()`，控制 Dock 的显隐状态与位置重校准。
2. **Dock 定位状态机 (`updateDockPosition`)**：
   - **工具栏正常模式**：挂载于财富栏上方，`dockWrap.style.bottom = (toolbar.offsetHeight || 76) + 'px'; dockWrap.style.right = '0px';`；
   - **全屏或底栏隐藏模式**：自动赋予 `.ex-panel--floating` 类名，挂载于 `#js-player-dialog` 或播放器外框，执行 `zt()` 浮动定位计算，居中对齐底栏控制条上方 8px。
3. **连桥防抖机制 (`CLOSE_DELAY_MS = 400`)**：
   - 鼠标移入按钮或面板内部：立即调用 `clearCloseTimer()` 取消销毁计划；
   - 鼠标移出按钮且未进入面板：启动 400ms 延时定时器，超时后调用 `closeActivePanel()` 收起三级面板并熄灭指示灯；
   - 32px 隐形连桥挂载于按钮底部，无缝承接鼠标向面板滑动的过渡轨迹。
4. **三级面板锚定算法 (`anchorPanelToButton`)**：
   - 统一面板宽度：固定为 `380px`；
   - 水平居中算法：`left = rect.left + rect.width / 2 - 380 / 2`，边界保护 `Math.max(12, Math.min(window.innerWidth - 380 - 12, left))`；
   - 垂直停靠算法：`bottom = Math.max(20, window.innerHeight - rect.top + 12)`，悬停在 Dock 对应按钮正上方 12px。

---

## 四、 定时器与观察器统一生命周期托管

NEXT 彻底杜绝全局野生的 `setInterval` 与 `setTimeout`。所有周期性任务与 DOM 观察器统一登记在 `ScopeManager` 中：

1. **`roomScope` (房间作用域)**：
   - 包含：弹幕时速滑窗定时器、自动钓鱼倒计时探测、星推状态机轮询、画中画 Canvas 绘制帧、DOM 观察器；
   - **换房销毁规则**：当监测到房间号改变（SPA 单页路由）时，立即调用 `roomScope.destroy()`，**一次性清除所有子定时器并断开所有 MutationObserver**，严禁上一房间的任务残留到新房间。
2. **`appScope` (全局常驻作用域)**：
   - 仅包含：60 秒用户等级经验心跳 (`runtime.heartbeat`)、12 小时版本更新雷达 (`Ex_LastUpdateCheckTime`)。
