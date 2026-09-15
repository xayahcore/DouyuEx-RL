# 📦 DouyuEx-RL NEXT 依赖、权限与外部网络审计台账 (DEPENDENCIES.md)

> 任务包：`P0.2`  
> 目标：锁定全部 6 个 CDN 依赖、11 个网络域名权限、10 个油猴特权函数，并制定加载失败时的无害降级策略。

---

## 一、 6 大 `@require` 外部 CDN 依赖库审计

| 依赖库名称 | 锁定版本 | 线上 CDN 地址 | 消费业务能力 | 加载失败降级策略 |
|:---|:---:|:---|:---:|:---|
| **flv.js** | 1.6.2 | `https://registry.npmmirror.com/flv.js/1.6.2/files/dist/flv.min.js` | F-05 同屏播放器纯流播放 | 同屏功能回退为纯净 iframe 模式，不拖垮主播放器 |
| **svgaplayerweb** | 2.3.1 | `https://fastly.jsdelivr.net/npm/svgaplayerweb@2.3.1/build/svga.min.js` | 备用动效库 | 若加载失败，静默放弃动效预览，保留主业务 |
| **gif.js** | 0.2.0 | `https://registry.npmmirror.com/gif.js/0.2.0/files/dist/gif.js` | F-10 长按录制动图 | 弹出友好提示“GIF 引擎未就绪，可使用单击截图”，不卡死页面 |
| **three.js** | 0.80.0 | `https://registry.npmmirror.com/three/0.80.0/files/build/three.min.js` | F-09 360° 全景视频播放 | 提示“全景组件加载失败”，保持常规平面视频播放 |
| **xlsx** | 0.16.4 | `https://registry.npmmirror.com/xlsx/0.16.4/files/dist/xlsx.full.min.js` | F-11 录播弹幕报表导出 | 允许导出纯文本/CSV 格式，不阻断字幕导出 |
| **dompurify** | 2.3.6 | `https://registry.npmmirror.com/dompurify/2.3.6/files/dist/purify.min.js` | F-56 弹幕图片协议与富文本 | 回退为严格纯文本转义 (`textContent`)，杜绝 XSS |

---

## 二、 11 个 `@connect` 跨域域名白名单审计

| 域名 | 访问协议 | 业务职能与必要性 | 隐私与安全性保障 |
|:---|:---:|:---|:---|
| `douyucdn.cn` | HTTPS | 官方静态资源、礼物图片、公网 RoomApi | 官方白名单，零隐私泄露 |
| `douyu.com` | HTTPS | 官方主站接口全集 (betard, japi, wgapi, passport) | 核心业务依赖，严格同源凭据管理 |
| `qq.com` | HTTPS | 斗鱼部分登录授权与头像 CDN 域名 | 官方登录链条 |
| `bilibili.com` | HTTPS | F-05 / F-59 跨平台同屏联播 | 用户主动输入目标直播间 URL 时触发 |
| `huya.com` | HTTPS | F-05 / F-59 跨平台同屏联播 | 用户主动输入目标直播间 URL 时触发 |
| `doseeing.com` | HTTPS | F-15 / F-19 弹幕时速与数据雷达 | 仅传输房间号查询公开统计，不上传个人信息 |
| `registry.npmmirror.com` | HTTPS | 国内镜像 CDN (加载 flv, gif, xlsx 依赖) | 仅只读下载脚本依赖库 |
| `fastly.jsdelivr.net` | HTTPS | 国际 CDN 镜像 (加载 svgaplayerweb) | 仅只读下载脚本依赖库 |
| `greasyfork.org` | HTTPS | F-30 检查脚本版本更新 | 仅在 12 小时间隔静默读取更新元数据 |
| `douyuex.com` | - | *已废弃的历史域名* (NEXT 中保留权限但默认不发起调用) | 避免请求 |
| `shadiao.app` | - | *已废弃的第三方彩虹屁域名* (**NEXT 中物理移除**) | 彻底消除外部不安全网络依赖 |

---

## 三、 10 个 `@grant` 油猴特权 API 清单

1. `GM_openInTab`: 用于在后台标签页打开更新发布页或活动页。
2. `GM_xmlhttpRequest`: 用于跨域拉取在播通用礼物池、CDN 依赖库及跨平台直播流。
3. `GM_setClipboard`: 一键复制房间直链、规则 JSON、弹幕小助手模板。
4. `GM_setValue` / `GM_getValue`: 持久化系统总配置 `DYEXRL_NEXT_CONFIG` 与账号镜像。
5. `GM_listValues` / `GM_deleteValue`: 用于配置一键安全重置（带所有权白名单防护）。
6. `GM_cookie`: 仅用于 F-29 多账号热切换，管理 `LTP0` 跨域登录凭据。
7. `GM_registerMenuCommand`: 注册“检查更新”与“重置设置”油猴系统级菜单项。
8. `unsafeWindow`: 仅在 `core` 层用于穿透主上下文注入 WebSocket STT 监听与画质拦截。
