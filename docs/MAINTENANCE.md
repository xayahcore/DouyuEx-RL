# DouyuEx-RL (Reborn Lite) 深度架构与工程维护指南

> **单一真实信源 (SSOT)**：本文档记录了从作者「小淳」官方原版 (2026.06.03.01)，到 zcode 社区维护版 (2026.08.22.01)，再到当前 **DouyuEx-RL (v2026.09.13.20)** 的全链路技术传承、模块边界、存储字典与已知脆弱点排障规范。

---

## 一、 版本演化代际全景 (Three-Generation Evolution)

```text
[初代: 小淳官方原版 v2026.06.03.01]
  │ (功能全面但陈年死重累积，内联百度统计与FKBUFF商业插件，每周弹窗，2026-08宣布停更)
  ▼
[二代: zcode 社区维护奠基版 v2026.08.22.01]
  │ (物理拔除商业广告/外链追踪/每周弹窗，实装 ExMetaLazy 悬停探针，全套面板毛玻璃化)
  ▼
[三代: DouyuEx-RL 纯净重构版 v2026.09.13.20 (Current)]
    - 全链路协议级画质截杀 (解决开播二次切流黑屏卡顿，首帧 0 秒直接最高画质)
    - 全面换装主上下文现代榜单引擎 (DYRankFix 恢复失效空白的日/周/月/总榜亲密度贡献值)
    - 严格模式深水区缺陷清零 (修复 rn(s,e) 独立流弹窗崩溃、弹幕删除反向过滤等 9 处严重 Bug)
    - 全局 XHR 拦截 WeakMap 弱引用重构 (根除长期挂机内存泄漏，GC 自动回收)
    - 滚轮调音实装 300ms 物理防抖 (消除快速滑动写磁盘造成的掉帧)
    - 建立零依赖 Node.js 模块化工程构建体系 (src/ + build.js)，打通 GitHub Webhook 自动发版流水线
```

---

## 二、 脚本架构与全量入口路由 (Routing Topology)

脚本主入口通过 `il(window.location.href)` 实现严格的 URL 意图分发，共包含 **6 种执行模式**：

| 模式 | 匹配 URL 特征 | 运行机制与承载业务 |
| :--- | :--- | :--- |
| **① 直播间主运行模式** | `douyu.com/数字房间号`<br>`/beta/*`, `/topic/*` | 激活完整主上下文体系：执行 `s()` 底层拦截 ➔ `y()` CSS 注入 ➔ `d()` DOM 工具装配 ➔ `c()` 定时任务。接管原生播放器协议与 WebSocket 弹幕。 |
| **② 跨域任务 Clean 模式** | `msg.douyu.com/*?exClean`<br>`v.douyu.com/*?exClean`<br>`cz.douyu.com/*?exClean`<br>`yuba.douyu.com/*?exClean` | 隐藏 iframe 模式。由主页唤起执行跨域清理或同步任务，完成后通过 `window.parent.postMessage("xxxCleanOver")` 通知父页面刷新。 |
| **③ 鱼吧已关闭话题恢复** | `yuba.douyu.com/*?exRestore` | 激活 `wn()`，利用 XHR / fetch 拦截改写 `group_id`，突破鱼吧已关闭版块的浏览限制。 |
| **④ 账号多开调度管道** | `passport.douyu.com/index/error/show404?exid=chun&cmd=...` | 隐藏通信管道。通过 iframe 携带的 `cmd=switch/delete/clean`，安全读写与切换隔离的登录 Cookie 凭据。 |
| **⑤ 同屏画中画 iframe 模式** | URL 参数携带 `exid=chun` | 纯净视频播放窗，自动进入全屏、剔除侧边栏与弹幕框，专为多直播间小窗联播服务。 |
| **⑥ 粉丝牌日期统计页** | `douyu.com/member/cp/getFansBadgeList` | 注入计算逻辑，提取 `data-fans-gbdgts` 毫秒时间戳，实时渲染每个勋章的“已获取 X 天”及精确获取日期。 |

---

## 三、 功能依赖分类与排障拓扑

遇到功能异常时，优先根据以下依赖拓扑定位故障源：

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. 纯本地前端 DOM/CSS 逻辑 (故障源: 斗鱼前端更新改了 class)      │
│    - 夜间模式 / 影院模式剪裁 / 画面滤镜 / 弹幕小尾巴 / 滚轮调音防抖   │
├─────────────────────────────────────────────────────────────┤
│ 2. 协议与主上下文拦截体系 (故障源: 斗鱼播放器内核重构)           │
│    - 极速无缝最高画质拦截系统 (quality.js)                     │
│    - 现代哈希混淆榜单贡献值引擎 (DYRankFix / rank_engine.js)     │
│    - GracefulP2PBlocker 优雅 P2P 阻断器                     │
├─────────────────────────────────────────────────────────────┤
│ 3. 斗鱼官方 Web API (故障源: 斗鱼接口下线或更换鉴权 ctn)        │
│    - 一键签到 (客户端/鱼吧/车队/房间) / 一键续牌 / 自动钓鱼        │
│    - 背包查询与清空 (`japi/prop/backpack`)                   │
│    - 真实直播流抓取与切换 (`lapi/live/getH5PlayV1`)            │
├─────────────────────────────────────────────────────────────┤
│ 4. 第三方独立服务 (故障源: 第三方服务自身状态)                  │
│    - 真实人数与已播时长监控: doseeing.com API (即使挂掉也不影响脚本整体)│
│    - 弹幕助手舔狗模式语录: api.shadiao.app                     │
│    - 在线弹幕助手/联播: douyuex.com (作者外部服务器)             │
├─────────────────────────────────────────────────────────────┤
│ 5. 获准 CDN 动态按需依赖 (故障源: CDN 访问受限)                 │
│    - 全景播放器: three.js                                    │
│    - 录制 GIF: gif.js                                       │
│    - 录播弹幕数据导出: xlsx.full.min.js                      │
│    - 超级火箭动画: svgaplayerweb                             │
│    - 真实流播放: flv.js                                      │
│    - 富文本过滤: DOMPurify                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 四、 本地存储键名字典 (LocalStorage & GM SSOT)

插件所有用户配置均使用 `ExSave_*` 规范存储，按需索引：

| 本地键名 | 数据类型 | 对应功能模块与说明 |
| :--- | :--- | :--- |
| `ExSave_HighestVideoQuality` | JSON `{isHighestVideoQuality: bool}` | 自动最高画质开关 |
| `ExSave_FullScreen` | JSON `{isFullScreen: bool}` | 自动网页全屏开关 |
| `ExSave_P2P` | JSON `{isKillP2P: bool}` | 阻止 P2P 上传开关 |
| `ExSave_Mode` | JSON `{mode: 0\|1}` | 日间 / 夜间模式状态 |
| `ExSave_DanmakuTail` | JSON `{isTailEnabled, tailContent, type}` | 弹幕小尾巴配置 |
| `ExSave_AutoFish` | JSON `{rids: [], modes: {}}` | 自动钓鱼挂机房间与模式配置 |
| `ExSave_FansContinue` | String (数字) | 一键续牌每个房间赠送荧光棒数量 |
| `ExSave_Vote` | JSON Object | 弹幕投票预设主题、选项与限时配置 |
| `ExSave_Enter` | JSON Array `[{level, word}]` | 进场欢迎等级与对应欢迎词字典 |
| `ExSave_isEnter` | JSON `{rooms: []}` | 进场欢迎启用的房间白名单 |
| `ExSave_Mute` | JSON Object | 关键词禁言规则字典 (词、次数、禁言时长) |
| `ExSave_isMute` | JSON `{rooms: []}` | 关键词禁言启用的房间白名单 |
| `ExSave_Gift` | JSON Object | 自动谢礼物模板与对应礼物 ID 字典 |
| `ExSave_isGift` | JSON `{rooms: []}` | 自动谢礼物启用的房间白名单 |
| `ExSave_Reply` | JSON Object | 关键词自动回复词库与 CD 时间 |
| `ExSave_isReply` | JSON `{rooms: []}` | 关键词自动回复启用的房间白名单 |
| `ExSave_Lottery` | JSON `{isNotice: bool}` | 全站抽奖信息提醒开关 |
| `ExSave_Treasure` | JSON `{isGetTreasure: bool, treasureDelay: int}` | 半自动抢宝箱与防刷延迟毫秒数 |
| `ExSave_RedPacket_Room` | JSON `{isGetRedPacket: bool}` | 自动抢礼物红包开关 |
| `ExSave_Gold` | JSON `{isGold: bool}` | 幻神模式本地视觉伪装开关 |
| `ExSave_GoldGift` | JSON `{isGoldGift: bool}` | 荧光棒变超火视觉特效开关 |
| `ExSave_TabSwitch` | JSON `{isEnableTabSwitch: bool}` | 防浏览器页签冻结与后台挂机开关 |
| `ExSave_Refresh` | JSON `{barrageFrame, video, barrage}` | 界面拉高、隐藏礼物栏、屏蔽前缀状态 |
| `ExSave_isRemoveDanmakuBackground` | Number `0\|1` | 屏蔽弹幕背景开关 |
| `ExSave_isRemoveEnterBarrage` | Number `0\|1` | 屏蔽进场提示弹幕开关 |
| `ExSave_isRemoveRepeatedDanmaku` | String `"0"\|"1"` | 屏蔽重复弹幕开关 |
| `ExSave_repeatedDanmakuSeconds` | String (数字) | 重复弹幕判定时间窗口 (秒) |
| `ExSave_isEnlargeDanmaku` | String `"0"\|"1"` | 重复弹幕连击放大特效开关 |
| `ExSave_DanmakuCollect` | JSON Array | 弹幕本地无限收藏列表 |
| `ExSave_MonthCost` | JSON Object | 个人中心月度消费统计缓存数据 |
| `ExSave_MonthCost_SeeStatus` | String `"0"\|"1"` | 月消费数据明文/密文显示切换 |
| `ExSave_Camera_Hidden` | Timestamp | 截图/录制相机控件 7 天不再提示到期时间 |
| `ExSave_PipSet` | JSON Object | 增强版画中画全量配置 (字号/速度/区域/透明度等) |
| `Ex_accountList` (GM) | JSON Object | 油猴托管的多账号 Cookie 与头像数据 |

---

## 五、 已知脆弱点与官方改版防御指南

当斗鱼官方大版本更新导致个别功能异常时，按以下次序排查：

1. **广告过滤失效**：
   - 检查 `04_styles.js` 中的 `Ex_Style_RemoveAD` 类名黑名单。斗鱼前端经常变动形如 `.noHandlerAd-0566b9` 的哈希类名，失效时通过 F12 审查广告元素最新类名补充进去即可。
2. **精灵球图标挂载失效**：
   - 搜寻 `e.className="ex-icon"`：挂载锚点优先查找 `.PlayerToolbar-Wealth`，若斗鱼重构了底栏，检查 `#js-backpack-enter` 父级或 `#js-player-toolbar`。
3. **Chrome Origin-Agent-Cluster 限制**：
   - 现代 Chromium 115+ 弃用了无保护的 `document.domain = "douyu.com"`。脚本已在各处做了 `try-catch` 安全隔离守卫，任何新模块严禁无条件强写 `document.domain`。
4. **画质拦截失效**：
   - 若出现开播再次卡顿，检查斗鱼是否修改了 `/betard/{rid}` 的下发字段（如 `rate` / `game` 数据结构），确保协议层拦截函数 `interceptPreload()` 始终在首流加载前介入。

---

## 六、 本地开发与发布流 (Release Pipeline)

```bash
# 1. 在 src/ 对应子模块进行代码修改
# 2. 编译并验证
node build.js

# 3. 提交并推送至 GitHub (触发 Webhook 自动同步至 Greasy Fork)
git add -A
git commit -m "feat/fix: <commit description>"
git push origin main
```
