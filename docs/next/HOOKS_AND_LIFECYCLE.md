# ⚓ DouyuEx-RL NEXT 拦截点与生命周期管理契约 (HOOKS_AND_LIFECYCLE.md)

> 任务包：`P0.2`  
> 目标：明确所有 Hook 挂载顺序、作用域隔离、DOM 观察器与定时器的装配与注销机制，确保零泄漏与零冲突。

---

## 一、 Hook 安装时序图 (Installation Chronology)

```text
1. document-start (极速同步，不可延迟)
   ├── 安装 P2PBlocker (优雅替换 RTCPeerConnection 假原型)
   ├── 挂载 QualityInterceptor (劫持 preloadStreamUrlPromise, 启动 12s 原画保护窗)
   └── 注入 RankEngine (主上下文 WebSocket STT 报文拦截器)

2. document-idle / DOMContentLoaded (异步初始化)
   ├── 激活 Router 分发器 (判定普通房间 R-01, 同屏 R-02, 录播 R-03, passport 管道 R-05 等)
   ├── 实例化 State Store (加载配置并执行老数据平滑迁移)
   ├── 装配 DouyuClient Gateway (唤醒 ccn, 注入设备指纹)
   └── 靶向监听目标挂载点 (#js-player-toolbar, .layout-Player-chat)

3. UI 装配 (DOM 就绪后一次性挂载)
   ├── 注入 MIUIX Tokens CSS 与集中式 SVG 矢量字典
   ├── 挂载 Level 2 Dock 栏 (9 个功能图标，装配 18px 悬浮连桥与 180ms 防抖)
   └── 绑定页面事件 (画质切档监听, 快捷键, 滚轮调音)
```

---

## 二、 核心 Hook 靶向范围与 Disposer 规约

| 目标对象 | 劫持/挂钩方法 | 作用域与机制 | 恢复与销毁 (Disposer) |
|:---|:---|:---|:---|
| `window.RTCPeerConnection` | 原型属性伪装 | 全局，阻断 WebRTC 偷跑流量 | 保存原构造函数，测试或禁用时安全回退 |
| `window.fetch` | 函数包装 | 拦截 `/betard/` 与推流直链请求，改写画质参数 | 保存原始 `fetch` 引用，仅对特定 URL 进行改写过滤 |
| `window.WebSocket.prototype.send` | 原型方法包装 | 主上下文，嗅探并解码斗鱼 STT 榜单数据 | 保持单例，内部维护监听器集合，换房重置状态 |
| `Node.prototype.appendChild` | 原型方法拦截 | 靶向阻断未授权广告脚本 | 仅放行白名单脚本，不影响正常业务 DOM |
| 播放器 `<video>` 容器 | `wheel` 滚轮事件 | 鼠标滚轮调音，阻止页面原生滚动 | 组件 `destroy()` 时显式 `removeEventListener` |
| 弹幕输入框 (`.ChatSend-txt`) | `keydown` (回车) | 弹幕小尾巴自动无缝拼接 | 组件 `destroy()` 时安全解绑，不干扰输入法组合事件 |

---

## 三、 定时器与观察器统一生命周期托管

NEXT 彻底杜绝全局野生的 `setInterval` 与 `setTimeout`。所有周期性任务与 DOM 观察器统一登记在 `ScopeManager` 中：

1. **`roomScope` (房间作用域)**：
   - 包含：弹幕时速滑窗定时器、自动钓鱼倒计时探测、星推状态机轮询、画中画 Canvas 绘制帧；
   - **换房销毁规则**：当监测到房间号改变（SPA 单页路由）时，立即调用 `roomScope.destroy()`，**一次性清除所有子定时器并断开所有 MutationObserver**，严禁上一房间的任务残留到新房间。
2. **`appScope` (全局常驻作用域)**：
   - 仅包含：60 秒用户等级经验心跳 (`runtime.heartbeat`)、12 小时版本更新雷达。
