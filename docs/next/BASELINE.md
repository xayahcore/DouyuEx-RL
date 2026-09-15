# 🔒 DouyuEx-RL 基线冻结报告 (BASELINE.md)

> 任务包：`P0.1`  
> 冻结日期：2026-09-16  
> 施工分支：`DYEXRL-NEXT` (严格独立施工)  
> 基线版本：`v2026.09.15.01` (Commit: `7c6f87d` / 本地工作区状态)  

---

## 一、 严禁发版与分支保护契约 (Release Prohibition Rules)

1. **绝对分支隔离**：当前唯一施工分支为 `DYEXRL-NEXT`。**严禁以任何方式将代码合并、变基、推送至 `main` 主分支**。
2. **严禁调用发布流水线**：**严禁运行 `node release.js`、`npm run release` 或任何自动化发布脚本**。现有 `release.js` 会自动执行 `git add -A`、改动版本号并直接推送 `origin main`，在本重构计划中属于绝对禁止的高危操作。
3. **保护用户未暂存改动**：在进行任何操作前必须执行 `git status`，严禁使用强制 checkout、clean 等操作覆盖用户工作区文件。
4. **禁止线上非授权写操作**：自动化测试默认采用受控测试替身/脱敏夹具。严禁在未经授权的真实用户账号上执行自动送礼、发弹幕、批量关注/取关、房管禁言、修改/清理跨域 Cookie。

---

## 二、 基线源码文件指纹与规模统计 (Source Code Fingerprints)

| 文件路径 | 物理大小 (Bytes) | 源码行数 | SHA256 校验和 | 模块业务职能定位 |
|:---|:---:|:---:|:---|:---|
| `src/meta.js` | 7752 | 104 | `fcddee5f0fc53a952ab4c60773668b9a76436d8c0b965b6daf8e083a3f28cf98` | 油猴元数据声明、18 条 @match 规则、6 个 CDN 依赖与 10 个特权 API |
| `src/main.js` | 42 | 1 | `9aef301a12f624c03eedf2b0328ffae49c38f6277130b28382dbb25ae0712904` | 主入口引导脚本 |
| `src/core/quality.js` | 8217 | 171 | `2cd0c4a478fbeb49ac6ce7497178098c2f600f3343b41cd4cf7cea58e91913cb` | 核心首流极速原画截杀、预载流掐断与 12s 状态机保护窗 |
| `src/core/quality_interceptor.js` | 8217 | 171 | `2cd0c4a478fbeb49ac6ce7497178098c2f600f3343b41cd4cf7cea58e91913cb` | quality.js 的副本镜像 |
| `src/core/rank_engine.js` | 33494 | 1318 | `130cbcf95528a47a60c45b48e3348c1da13f1e03c8fbd8f2d93ed0f684e4fe16` | 现代混淆加密榜单 STT 解码与真实贡献值注入引擎 |
| `src/modules/01_setup.js` | 5631 | 22 | `47a8ea00ac9ddf88e009ffe9ca3db8b97482e47fd74d3bf0f08ee6196dc1fd24` | P2P 阻断假原型、WeakMap XHR 代理、全局菜单与动态依赖加载 |
| `src/modules/02_dom_ui.js` | 221903 | 2137 | `f9b044c75b73b955ef300f41b87cb6db8375720f52257b7c46b0f92ffdabbc29` | Level 2 Dock 栏、Level 3 控制台与 Level 5 大礼物选择器 |
| `src/modules/03_cron.js` | 198 | 7 | `e17ccc73f08451a5c6946a6b3ad6f033fc1f8580e6158a9d893170174e7f4324` | 60 秒经验心跳定时器 |
| `src/modules/04_styles.js` | 101223 | 1494 | `b3bfa8c6ba1379d640a19d79a0d548feb932def8107d5e927dc579dc476bf7fa` | MIUIX 拟态毛玻璃样式表注入与全域广告屏蔽池 |
| `src/modules/05_services.js` | 230510 | 2540 | `0f62bf1d0ee1ec6c131876dce5727231b35888b4e02dbb5eb5d8ddef7e7f5191` | 业务服务集合 (画中画/签到/自动钓鱼/弹幕套件/录播导出等) |
| `src/modules/06_router.js` | 5137 | 5 | `880f12d267e944dfb0f928c1cb81b94ef318a48f9b7ef9e167bdda4e9fa0ec9c` | 6 大场景 URL 路由分发与跨域管道 |
| `build.js` | 3110 | 89 | `f6f70e333e1574bea55467614c283230ba5810bb3fc64205c43167e3f64d4807` | 零依赖构建器与 V8 原生语法核验器 |
| `release.js` | 4948 | 125 | `2e7165047feb1657c5de5513cebb6a10769cd05b3fec911496019422cc6e8b61` | 发布 CLI 脚本 (本工程严格禁用) |
| `DouyuEx_RL.user.js` | 614340 | 7814 | `5f5eba93a5280cbebff86f03d18fa09bb37f1a8739aff7ed6e2b4fdde602ab90` | 生产交付产物 (~600 KB) |

---

## 三、 元数据权限基线 (Metadata Specification)

### 3.1 完整 18 条 `@match` 规则原貌
```javascript
// @match			*://*.douyu.com/0*
// @match			*://*.douyu.com/1*
// @match			*://*.douyu.com/2*
// @match			*://*.douyu.com/3*
// @match			*://*.douyu.com/4*
// @match			*://*.douyu.com/5*
// @match			*://*.douyu.com/6*
// @match			*://*.douyu.com/7*
// @match			*://*.douyu.com/8*
// @match			*://*.douyu.com/9*
// @match			*://*.douyu.com/beta/*
// @match			*://*.douyu.com/topic/*
// @match        *://www.douyu.com/member/cp/getFansBadgeList
// @match        *://passport.douyu.com/*
// @match        *://msg.douyu.com/*
// @match        *://yuba.douyu.com/*
// @match        *://v.douyu.com/*
// @match        *://cz.douyu.com/*
```

### 3.2 外部依赖库 (`@require`)
1. `https://registry.npmmirror.com/flv.js/1.6.2/files/dist/flv.min.js` (同屏视频流纯视频极速解码)
2. `https://fastly.jsdelivr.net/npm/svgaplayerweb@2.3.1/build/svga.min.js` (SVGA 动效引擎)
3. `https://registry.npmmirror.com/gif.js/0.2.0/files/dist/gif.js` (GIF 录制编码器)
4. `https://registry.npmmirror.com/three/0.80.0/files/build/three.min.js` (360° 全景视频透视)
5. `https://registry.npmmirror.com/xlsx/0.16.4/files/dist/xlsx.full.min.js` (弹幕报表 Excel 导出)
6. `https://registry.npmmirror.com/dompurify/2.3.6/files/dist/purify.min.js` (HTML 净化)

### 3.3 跨域白名单 (`@connect`)
`douyucdn.cn`, `douyu.com`, `qq.com`, `douyuex.com`, `bilibili.com`, `huya.com`, `shadiao.app`, `doseeing.com`, `registry.npmmirror.com`, `fastly.jsdelivr.net`, `greasyfork.org`

### 3.4 油猴特权函数 (`@grant`)
`GM_openInTab`, `GM_xmlhttpRequest`, `GM_setClipboard`, `GM_setValue`, `GM_getValue`, `GM_listValues`, `GM_deleteValue`, `GM_cookie`, `GM_registerMenuCommand`, `unsafeWindow`

---

## 四、 运行环境与技术基线
- **宿主操作系统**：Windows 10 Pro (x64)
- **Node.js 运行时**：v22.23.2 (原生搭载 `node:test`, `node:vm`, `node:fs`)
- **Python 工具链**：Python 3.11.15 / Python 3.14.4
- **测试浏览器**：Brave Browser (Chromium 内核，带 Tampermonkey / Violentmonkey)
