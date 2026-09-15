# 📘 DouyuEx-RL 全量功能代码溯源谱系与 NEXT 重构白皮书
> **分支**: `DYEXRL-NEXT`  
> **定位**: 本文档为从零重写 DouyuEx-RL (NEXT 纯净架构版) 的**最高工程宪章与单一真源 (SSOT)**。  
> **原则**: **全量复刻老脚本的所有有用功能，一个不漏；逐行逐字逆向解密老代码；彻底淘汰失效死代码；分层单向流重构。**

---

## 目录索引
1. [一、 核心底层拦截体系 (Core Interception)](#一-核心底层拦截体系-core-interception)
2. [二、 播放器与音画控制系统 (Player & Media System)](#二-播放器与音画控制系统-player--media-system)
3. [三、 录播与媒体创作系统 (VOD & Media Capture)](#三-录播与媒体创作系统-vod--media-capture)
4. [四、 弹幕与社交交互工具箱 (Danmaku & Interaction Suite)](#四-弹幕与社交交互工具箱-danmaku--interaction-suite)
5. [五、 资产运营与日常打卡系统 (Economy & Routine System)](#五-资产运营与日常打卡系统-economy--routine-system)
6. [六、 辅助感知与全站雷达系统 (Perception & Station Radar)](#六-辅助感知与全站雷达系统-perception--station-radar)
7. [七、 账号与路由管理系统 (Passport & Routing)](#七-账号与路由管理系统-passport--routing)
8. [八、 已确认下线的远古失效活动代码清理清单 (Dead Code Ledger)](#八-已确认下线的远古失效活动代码清理清单-dead-code-ledger)
9. [九、 NEXT 纯净分层架构实施映射指南 (Next-Gen Architecture Mapping)](#九-next-纯净分层架构实施映射指南-next-gen-architecture-mapping)

---

## 一、 核心底层拦截体系 (Core Interception)

### 1.1 协议级最高画质强锁 (QualityLock)
- **业务价值**: 彻底根除进房时斗鱼官方“低清起播 ➔ 握手二次切流 ➔ 黑屏卡顿 2 秒”的恶劣体验，首流直达最高原画。
- **老代码锚点**: `src/core/quality.js` (`QualityLock` 模块)
- **底层原理**:
  - 在 `document-start` 阶段前置加载，拦截 `window.fetch` 与 `betard/{rid}` 接口；
  - 动态重写播放器配置 `realRateModel2`、`player_storage_quality`、`rateRecordTime_h5p_room`；
  - 开播前 12 秒强制锁定 `rate=0` (最高画质)，12 秒后透明放行用户手动切流。
- **关联存储**: `ExSave_HighestVideoQuality`
- **NEXT 规划**: 保持 100% 独立，封装为 `src/core/quality.ts`，零外部依赖，置于打包最前列。

### 1.2 主上下文真实贡献榜注入 (RankEngine)
- **业务价值**: 突破斗鱼 2026 年现代类名混淆与加密 STT 消息壁垒，还原房间日榜、周榜、月榜与总榜的真实亲密度。
- **老代码锚点**: `src/core/rank_engine.js`
- **底层原理**:
  - 注入主上下文 (Main World) 监听长连接事件与房间上下文；
  - 解析真实贡献值数据流，计算差额与排名动态；
  - 构造现代微交互挂载至原版榜单容器。
- **NEXT 规划**: 封装为 `src/core/rank.ts`，采用 WeakMap 托管 DOM 节点，杜绝挂机内存泄漏。

### 1.3 WebRTC P2P 上传优雅阻断 (P2PBlocker)
- **业务价值**: 彻底阻断斗鱼在用户后台利用 WebRTC 盗用上行家宽带宽，降低网络延迟与掉帧。
- **老代码锚点**: `src/modules/01_setup.js:5` (`GracefulP2PBlocker` 类)
- **底层原理**:
  - 物理覆写 `window.RTCPeerConnection` 与 `navigator.mediaDevices`；
  - `createDataChannel` 立即设为 `closed`，`createOffer` 返回拒绝 Promise；
  - 配合 `/betard` 接口去除 P2P 参数。
- **关联存储**: `ExSave_P2P`
- **NEXT 规划**: 统一收敛为 `src/core/p2p.ts`。

---

## 二、 播放器与音画控制系统 (Player & Media System)

### 2.1 增强版画中画 (Advanced DocumentPictureInPicture)
- **业务价值**: 脱离浏览器标签页限制，在独立桌面小窗口中播放直播，且**原生支持弹幕流实时滚动与独立发言聊天框**。
- **老代码锚点**: `src/modules/05_services.js:2150-2350` (`__pip_window__`, `__pip_is_active__`)
- **底层原理**:
  - 调用 Chromium 现代 `window.documentPictureInPicture.requestWindow({ width, height })`；
  - 将原生播放器 `<video>`、弹幕 Canvas/DOM 以及自建发送框完整迁移进 PiP 窗口上下文；
  - 监听画中画内按键与发送事件，双向代理回主页面弹幕发送流程。
- **关联存储**: `ExSave_PipSet` (保存 PiP 窗口尺寸、位置、弹幕开关)
- **NEXT 规划**: 重构为 `src/modules/media/pip.ts`，建立纯净样式注入与双向事件代理。

### 2.2 同屏多直播间无缝联播 (Popup Player / Multi-View)
- **业务价值**: 支持在同一页面中分屏多开其他主播房间，实现跨房间赛事/多视角同看。
- **老代码锚点**: `src/modules/02_dom_ui.js:770`, `05_services.js:86-110` (`executePopupPlayer`, `exVideoDiv`)
- **底层原理**:
  - 请求目标房间 FLV/HLS 直播流直链或采用纯净轻量 iframe 嵌入；
  - 动态生成悬浮拖拽分屏视窗 (`exVideoDiv`)，支持独立音量调节与小窗关闭。
- **关联 DOM / 触发**: Dock `popup-player` 按钮, 面板 `.popup-player-panel`
- **NEXT 规划**: 重构为 `src/modules/media/multi_room.ts`，规范 DOM 拖拽手柄与流销毁。

### 2.3 播放器色彩滤镜与影院模式调节 (Video Filters)
- **业务价值**: 针对斗鱼不同主播的画面风格，自由调整亮度、对比度、饱和度、锐化增强，以及画面旋转/缩放/影院比例。
- **老代码锚点**: `src/modules/05_services.js:2010-2100` (`Ka`, `$a`, `er`, `G`, `tr`, `vtoolbar-menu`)
- **底层原理**:
  - 为播放器 `<video>` 容器挂载 CSS `filter` (brightness, contrast, saturate)；
  - 支持快捷预设（默认、清晰、鲜艳、夜间模式、电影模式）；
  - 动态滑块事件绑定与鼠标拖拽比例计算。
- **关联样式**: `Ex_Style_Filter`, `Ex_Style_Cinema`
- **NEXT 规划**: 封装为 `src/modules/media/filters.ts`，基于 CSS 变量集中驱动。

### 2.4 滚轮音量微调与自定义音量条 (Volume Enhancement)
- **业务价值**: 鼠标悬停在播放器上即可通过滚轮精准平滑微调音量，配合百分比气泡回显。
- **老代码锚点**: `src/modules/05_services.js:2060` (`Sr` 函数)
- **底层原理**:
  - 监听播放器 `wheel` 滚轮事件，阻止页面原生滚动；
  - 步进增减 `video.volume` (±0.05)，并同步修改自定义音量条高度与提示文本。
- **NEXT 规划**: 收敛至 `src/modules/media/volume.ts`，增加 100ms 物理防抖。

### 2.5 切后台自动静音 / 自动暂停 (Tab Switch Economy)
- **业务价值**: 切换到其他标签页工作时，自动静音或暂停直播播放以节约 CPU、GPU 与宽带，切回时瞬间恢复。
- **老代码锚点**: `src/modules/05_services.js:530` (`It` 函数), `document.addEventListener("visibilitychange")`
- **关联存储**: `ExSave_TabSwitch`
- **NEXT 规划**: 封装为 `src/modules/media/background_saver.ts`。

---

## 三、 录播与媒体创作系统 (VOD & Media Capture)

### 3.1 极速截图与长按录制高清 GIF (Camera & GIF Engine)
- **业务价值**: 无需第三方截图软件，在直播和点播中单击一键无水印抓拍，长按直接录制高清动态 GIF。
- **老代码锚点**: `src/modules/05_services.js:1310-1340` (`Mi` 函数, `#ex-camera`)
- **底层原理**:
  - 从原生 `<video>` 节点提取高保真 Canvas 帧；
  - 单击导出 PNG 并自动按 `【主播名】时间戳` 命名触发下载；
  - 长按启动 Web Worker GIF 录制流水线，渲染完毕后自动释放 Blob URL。
- **关联存储**: `ExSave_Camera_Hidden` (允许用户永久隐藏或呼出相机图标)
- **NEXT 规划**: 重写为 `src/modules/media/recorder.ts`，采用现代轻量 OffscreenCanvas 与纯净 GIF 编码器，剥离旧版外链死重。

### 3.2 录播弹幕 ASS 字幕导出与 Excel 报表导出 (Danmaku Exporter)
- **业务价值**: 点播视频下将全程弹幕一键导出为播放器专用的标准 ASS 动态字幕文件，或导出为数据分析用的 Excel 表格。
- **老代码锚点**: `src/modules/05_services.js:2070-2130` (`class Lr` ASS 字幕生成器, `EXURL.xl`)
- **底层原理**:
  - 请求点播弹幕接口，按时间戳归一化排序；
  - 按 1080P/1920 物理分辨率与 20 行滚动轨道排版计算 ASS Move 轨迹坐标；
  - 导出标准 `.ass` 文件。
- **NEXT 规划**: 封装为 `src/modules/vod/ass_exporter.ts`，以现代纯净模板函数替换 200 行旧字符串拼接。

### 3.3 点播视频时间戳校准与快捷直达 (VOD Enhancement)
- **业务价值**: 观看斗鱼录播视频时精确显示开播真实绝对时间、提供一键回看、一键投稿与绑定鱼吧一键直达。
- **老代码锚点**: `src/modules/02_dom_ui.js:1085-1095`, `05_services.js:1250-1280` (`vi`, `xi`, `wi`)
- **底层原理**:
  - 请求 `v.douyu.com/video/video/getVideoUrl?vid=` 提取 `viewthumb` 绝对开播时间；
  - 注入主播头像下方按钮（回看、投稿、打开鱼吧 `getBindGroup`、复制源地址 `copy-real-live`）。
- **NEXT 规划**: 收敛至 `src/modules/vod/vod_helper.ts`。

---

## 四、 弹幕与社交交互工具箱 (Danmaku & Interaction Suite)

### 4.1 弹幕小尾巴 (Danmaku Tail)
- **业务价值**: 发送弹幕时自动附带个性化前缀或后缀文本（如小尾巴标志、粉丝口号等）。
- **老代码锚点**: `src/modules/02_dom_ui.js:1077` (`DanmakuTail` 面板与事件监听)
- **底层原理**:
  - Hook 聊天框输入事件（兼容 `textarea` 与现代 `div.ChatSend-txt`）；
  - 在按下回车或点击发送按钮的捕获阶段，自动向内容拼接前缀/后缀；
  - 派发 `input` 事件以激活 React 状态。
- **关联存储**: `ExSave_DanmakuTail`
- **NEXT 规划**: 重构为 `src/modules/danmaku/tail.ts`，基于事件驱动无缝监听。

### 4.2 弹幕收藏夹 (Danmaku Collect & Search)
- **业务价值**: 随时收藏精彩梗弹幕，支持本地/云端持久化存储，自带搜索过滤框，点击直接填入输入框发送。
- **老代码锚点**: `src/modules/02_dom_ui.js:1947`, `05_services.js:460-490` (`ChatBarrageCollect`)
- **关联存储**: `ExSave_DanmakuCollect`
- **NEXT 规划**: 重构为 `src/modules/danmaku/collect.ts`。

### 4.3 关键词自动回复小助手 (Auto Reply)
- **业务价值**: 设定关键词与自动回复模板，当弹幕流中出现指定关键词时，自动按设定的 CD 频率触发回复；支持 JSON 规则导入导出。
- **老代码锚点**: `src/modules/02_dom_ui.js:1427`, `05_services.js:350-400` (`reply__panel`, `reply__export`, `reply__import`)
- **关联存储**: `ExSave_Reply`, `ExSave_ReplyCd`, `ExSave_isReply`
- **NEXT 规划**: 重构为 `src/modules/danmaku/auto_reply.ts`。

### 4.4 弹幕时速监测与真实观众热度雷达 (Barrage Velocity & Real Audience)
- **业务价值**: 实时显示当前直播间的每秒/每分钟弹幕条数，并嗅探今日累计观看人数与实际活跃发言人数。
- **老代码锚点**: `src/modules/02_dom_ui.js:1083`, `05_services.js:1400-1450` (`real-audience`, `real-audience__total`)
- **底层原理**:
  - 拦截弹幕流统计滑窗时间计数；
  - 请求房间公开统计接口读取真实观看人数。
- **NEXT 规划**: 重构为 `src/modules/danmaku/radar.ts`。

### 4.5 弹幕深度净化系统 (Danmaku Filters)
- **业务价值**: 解决高频刷屏、超大表情遮挡画面、各种广播抢镜的痛点。
- **包含能力**:
  1. **防重复弹幕合并 (Repeated Danmaku Filter)**: `ExSave_isRemoveRepeatedDanmaku`, `ExSave_repeatedDanmakuSeconds` (N秒内重复弹幕折叠或忽略)
  2. **屏蔽进房广播通知 (Remove Enter Barrage)**: `ExSave_isRemoveEnterBarrage`
  3. **屏蔽弹幕大表情图片 (Remove Danmaku Stickers)**: `ExSave_isRemoveDanmakuImage`
  4. **净化弹幕彩色背景框 (Clean Danmaku Background)**: `ExSave_isRemoveDanmakuBackground`
  5. **弹幕文字字体放大 (Enlarge Danmaku Font)**: `ExSave_isEnlargeDanmaku`
- **老代码锚点**: `src/modules/05_services.js:80-120`
- **NEXT 规划**: 收敛统一至 `src/modules/danmaku/filter.ts`。

### 4.6 进房欢迎词与自动谢礼物 (Welcome & Thank Gifts)
- **业务价值**:
  - 主播或房管进房时自动发送欢迎弹幕：`ExSave_Enter`, `ExSave_isEnter`, `ExSave_LastEnterWord`
  - 观众送礼物时自动按预设模板发送感谢弹幕：`ExSave_Gift`, `ExSave_isGift`
- **老代码锚点**: `src/modules/02_dom_ui.js:1380-1420`, `05_services.js:300-340`
- **NEXT 规划**: 重构为 `src/modules/danmaku/greeter.ts`。

### 4.7 房管快速禁言工具 (Mute Manager)
- **业务价值**: 房管快速管理黑名单与违规词自动禁言。
- **老代码锚点**: `src/modules/02_dom_ui.js:1320-1360` (`mute__panel`)
- **关联存储**: `ExSave_Mute`, `ExSave_isMute`
- **NEXT 规划**: 重构为 `src/modules/danmaku/mute.ts`。

### 4.8 实时弹幕溯源搜索 (Danmaku Search)
- **业务价值**: 在弹幕栏上方添加“查弹幕”按钮，快速检索用户发言历史。
- **老代码锚点**: `src/modules/05_services.js:120` (`barragePanel__search`, `doseeing.com/api/suggest_all`)
- **NEXT 规划**: 重构为 `src/modules/danmaku/search.ts`。

---

## 五、 资产运营与日常打卡系统 (Economy & Routine System)

### 5.1 5 级 MIUIX 拟态模态礼物大选择器 (Gift Picker Modal)
- **业务价值**: 彻底淘汰手动输入礼物 ID 的远古反人类交互。540×410px 悬浮大窗口，双流并行聚合在播礼物与官方大盘，即点即选即回填。
- **老代码锚点**: `src/modules/02_dom_ui.js:1-330` (`openGiftPicker`, `loadLiveGiftsDualStream`)
- **底层原理**:
  - 第一流：请求当前房间专属在播礼物 (`betard/{rid}`)；
  - 第二流：请求官方通用大盘在播池 (`open.douyucdn.cn/api/RoomApi/room/{rid}`)，按价值降序；
  - 动态反查用户背包道具资产。
- **NEXT 规划**: 封装为 `src/ui/components/GiftPicker.ts`。

### 5.2 现代化背包送礼 (Backpack Manager)
- **业务价值**: 真实反映背包内免费与付费道具资产（解决弱鸡与荧光棒串图问题），支持一键清空背包、定额赠送与指定房间送礼。
- **老代码锚点**: `src/modules/02_dom_ui.js:1111`, `05_services.js:pt, Ut` (`Backpack__clearbag`)
- **底层原理**: 调用官方 `japi/prop/backpack/web/v5` 接口配合数字房间号安全请求。
- **NEXT 规划**: 封装为 `src/modules/economy/backpack.ts`。

### 5.3 一键续牌三级面板 (Fans Continue Panel)
- **业务价值**: 动态检测用户当前佩戴的真实粉丝牌，自动计算所需荧光棒数量，一键赠送打卡维持粉丝牌不掉级。
- **老代码锚点**: `src/modules/02_dom_ui.js:350-460` (`createFansContinuePanel`, `updateFansContinuePanel`)
- **关联存储**: `ExSave_FansContinue`
- **NEXT 规划**: 封装为 `src/modules/routine/fans_continue.ts`。

### 5.4 一键签到三级控制面板 (Sign Control Console)
- **业务价值**: 彻底告别黑盒盲目签到。380×370px 三级控制台，支持 5 大日常任务自由勾选记忆与实时日志滚动回显：
  1. **房间与粉丝牌签到**: 批量赠送已关注拥牌房间在线亲密度 (`$n`)；
  2. **客户端模拟领礼盒**: 模拟手机客户端领取每日免费礼盒；
  3. **关注鱼吧打卡与自动补签**: 鱼吧一键签到领经验 (`yuba.douyu.com/wbapi`) 并自动领补签卡 (`mapi-yuba.douyu.com/wb/v3/supplement`)；
  4. **星推日常任务全景打满闭环**: 打开活动页 (+10)、3直播间打卡 (+9)、指定参赛房间口令弹幕助力门禁 (+5)、动态逐轮 `introduce` 推荐 5 位主播并在 1.8 秒后立即安全取关 (+15)，配合 `task/list` 状态机实时核验；
  5. **粉丝家园与钻粉日常领奖**: 自动打卡 (`fanshome/sign` & `dfansact/userSign`)。
- **老代码锚点**: `src/modules/02_dom_ui.js:510-630`, `05_services.js:executeSignEngine`
- **关联存储**: `ExSave_SignConfig`
- **NEXT 规划**: 封装为 `src/modules/routine/sign_engine.ts`。

---

## 六、 辅助感知与全站雷达系统 (Perception & Station Radar)

### 6.1 全站抽奖信息实时监控雷达 (Lottery Radar)
- **业务价值**: 实时监控全站正在进行的大奖、红包与抽奖活动直播间，一键快速跳转上车，并支持抽奖通知过滤。
- **老代码锚点**: `src/modules/02_dom_ui.js:344`, `05_services.js:560-600` (`exlottery`, `lottery-refresh`)
- **关联存储**: `ExSave_Lottery`
- **NEXT 规划**: 封装为 `src/modules/radar/lottery.ts`。

### 6.2 主播电脑硬件配置一键探测 (Hardware Profiler)
- **业务价值**: 深入斗鱼推流参数与直播助手元数据，一键解析主播真实电脑硬件配置（CPU 型号、显卡型号、主板、推流分辨率与码率）。
- **老代码锚点**: `src/modules/05_services.js:15-30` (`getAnchorPCInfo`)
- **底层原理**: 请求 `www.douyu.com/member/cp` 解析推流助手上报的硬件环境快照。
- **NEXT 规划**: 封装为 `src/modules/radar/hardware.ts`。

### 6.3 房间贵族与钻粉到期天数感知 (VIP Expire Indicator)
- **业务价值**: 在背包入口旁直观回显当前房间的钻粉或贵族剩余到期天数。
- **老代码锚点**: `src/modules/02_dom_ui.js:1947` (`room-vip-expire-days`)
- **NEXT 规划**: 纳入 Store 状态机统一渲染。

### 6.4 版本更新多态交互雷达 (Version Lifecycle Notice)
- **业务价值**: 12 小时限频静默探测 Greasy Fork 新版本；支持【我已收到 ➔ 检查更新 ➔ 正在检查 ➔ 已是最新 / 前往更新】多态交互状态机，图标悬停动态绑定最新版本号。
- **老代码锚点**: `src/modules/02_dom_ui.js:780-870` (`createExUpdatePanel`, `exupdate-action-btn`)
- **关联存储**: `Ex_LastNotifiedVersion`, `Ex_LastUpdateCheckTime`
- **NEXT 规划**: 封装为 `src/modules/radar/version.ts`。

### 6.5 全局配置一键重置引导 (Reset All Settings)
- **业务价值**: 油猴菜单命令“重置所有设置”，一键清空 GM 存储与所有 `ExSave_*` 本地缓存，帮助排障。
- **老代码锚点**: `src/modules/01_setup.js:21` (`GM_registerMenuCommand("重置所有设置")`)
- **NEXT 规划**: 封装为 `src/store/reset.ts`。

---

## 七、 账号与路由管理系统 (Passport & Routing)

### 7.1 导航栏多账号无感切换器 (Multi-Account Switcher)
- **业务价值**: 在斗鱼顶部导航栏直接显示绑定的多个账号头像，点击一键无感切换登录状态，告别繁琐的退出与扫码。
- **老代码锚点**: `src/modules/02_dom_ui.js:1937`, `06_router.js:1-5` (`Ex_accountList`, `Ex_accountListPassport`)
- **底层原理**:
  - 利用 `GM_cookie` 备份与还原当前用户的 `acf_auth`, `acf_uid`, `acf_nickname`, `acf_avatar`；
  - 跨域通过 `passport.douyu.com` 的 iframe 协议写入目标账号凭据。
- **NEXT 规划**: 封装为 `src/modules/passport/account_switcher.ts`。

### 7.2 页面单页路由监听器 (Page Router)
- **业务价值**: 适配普通直播间、点播视频站 (`v.douyu.com`)、鱼吧与错误页的不同生命周期调度。
- **老代码锚点**: `src/modules/06_router.js`
- **NEXT 规划**: 封装为 `src/router/index.ts`。

---


---

## 🔍 深度专项审计：老脚本“套娃式”三级/四级面板与隐藏交互全量谱系

老代码中存在大量**“折叠在父级面板内部、点击标题或按钮后二次滑出展开”的套娃子面板与独立悬浮模态窗**。此前粗略扫描极易将其误判为普通文本行，现全部地毯式起底并逐项建立重构档案：

```text
DouyuEx-RL 全量三级/四级与独立悬浮面板全景树
├── 1. 底栏 Dock 常驻一级入口
│   ├── ex-sign ➔ 【一键签到三级控制台】 (sign-panel, 5大任务可勾选+日志视窗)
│   ├── fans-continue ➔ 【一键续牌三级面板】 (fans-continue-panel, 真实佩戴牌子检测+荧光棒打卡)
│   ├── popup-player ➔ 【同屏播放器三级面板】 (popup-player-panel, 分屏联播/URL直接播放/iframe切换)
│   ├── ex-lottery ➔ 【全站抽奖雷达三级面板】 (exlottery, 全站大奖/红包监控列表+开奖通知开关)
│   ├── bloop-icon ➔ 【弹幕发送小助手三级面板】 (bloop, 循环弹幕列表+频率间隔+随机/顺序+文本框)
│   ├── ex-update ➔ 【版本更新多态三级面板】 (exupdate-panel, 三段式更新日志+状态机按钮)
│   ├── ChatToolBar-DanmakuTail ➔ 【弹幕小尾巴三级面板】 (ChatToolBar-DanmakuTail-Panel, 前缀/后缀+文本配置)
│   ├── livetool-icon ➔ 【直播间工具三级面板】 (livetool, 内部嵌套 5 大折叠子面板 + 1 独立看板)
│   │   ├── 4.1 弹幕投票子面板 (.vote__panel, 主题/选项/限时/增删) + 【独立悬浮大屏结果看板】 (.vote__result)
│   │   ├── 4.2 进场欢迎子面板 (.enter__panel, 等级阈值/自定义词/增删 + 规则导入导出)
│   │   ├── 4.3 关键词禁言子面板 (.mute__panel, 禁言时长/违规词/增删/禁言名单 + 规则导入导出)
│   │   ├── 4.4 自动谢礼物子面板 (.gift__panel, 礼物名称/感谢模板/增删 + 规则导入导出)
│   │   └── 4.5 关键词回复子面板 (.reply__panel, 关键词/回复语/CD时长/增删 + 规则导入导出)
│   └── extool-icon ➔ 【扩展功能三级面板】 (extool, 内部嵌套 4 大配置卡片)
│       ├── 5.1 背包送礼卡片 (extool__clearbag, 资产展示 + 联动 5 级模态大选择器)
│       ├── 5.2 跨房打榜送礼卡片 (extool__sendgift, 房间专属/通用礼物 + 联动 5 级模态选择器 + 延迟)
│       ├── 5.3 房间红包挂机卡片 (extool__redpacket_room, 开启开关 + 自动抢)
│       ├── 5.4 房间宝箱拾取卡片 (extool__treasure, 拾取延迟配置 + 自动收)
│       └── 5.5 播放器性能监控卡片 (extool__player_perf, 实时内存/GC/帧率微质感看板)
│
└── 2. 播放器内悬浮控制条 (vtoolbar-menu)
    ├── 滤镜调整抽屉三级面板 (.filter__panel, 亮度/对比度/饱和度微调滑块)
    ├── 播放器画质增强说明弹窗 (.enhance-modal__panel, 微光画质调节)
    └── 增强画中画小窗 (DocumentPictureInPicture, 独立原生弹幕流与小窗输入框)
```

### 详细子面板交互与参数账本

| 编号 | 面板名称与 DOM 标识 | 触发方式与交互形式 | 内部控件与核心参数 | 导入/导出与附加能力 |
|:---|:---|:---|:---|:---|
| **L3-01** | **弹幕投票配置面板**<br>`div.vote__panel` | 点击 `livetool` 中的 `#vote__title` 展开手风琴折叠层 | • 下拉主题列表 `#vote__select`<br>• 主题输入 `#vote__theme`<br>• 选项输入 `#vote__options`<br>• 限时秒数 `#vote__time`<br>• 重复投票开关 `#vote__repeat` | 联动点击 `#vote__show-result` 打开**独立悬浮大屏结果看板** (`div.vote__result`) |
| **L3-02** | **进场欢迎配置面板**<br>`div.enter__panel` | 点击 `livetool` 中的 `#enter__title` 展开手风琴折叠层 | • 欢迎语选择 `#enter__select`<br>• 触发等级输入 `#enter__level`<br>• 欢迎语文本 `#enter__word`<br>• 房间启用范围开关 | 支持规则一键剪贴板导入 (`#enter__import`) 与导出 (`#enter__export`) |
| **L3-03** | **关键词禁言配置面板**<br>`div.mute__panel` | 点击 `livetool` 中的 `#mute__title` 展开手风琴折叠层 | • 违规词选择 `#mute__select`<br>• 禁言时长下拉（1天/3天/7天/30天）<br>• 增删按钮 `#mute__add`, `#mute__del`<br>• 房间启用范围开关 | 支持禁言名单查询 (`#mute__idlist`) 以及规则导入导出 (`#mute__import/export`) |
| **L3-04** | **自动谢礼物配置面板**<br>`div.gift__panel` | 点击 `livetool` 中的 `#gift__title` 展开手风琴折叠层 | • 礼物选择 `#gift__select`<br>• 感谢语文本输入 `#gift__content`<br>• 增删按钮 `#gift__add`, `#gift__del`<br>• 房间启用范围开关 | 支持礼物感谢词模板一键剪贴板导入与导出 (`#gift__import/export`) |
| **L3-05** | **关键词回复配置面板**<br>`div.reply__panel` | 点击 `livetool` 中的 `#reply__title` 展开手风琴折叠层 | • 关键词选择 `#reply__select`<br>• 回复内容输入 `#reply__content`<br>• 冷却时间 CD 秒数 `#reply__time`<br>• 增删按钮 `#reply__add`, `#reply__del` | 支持自定义回复规则 JSON 剪贴板一键导入与导出 (`#reply__import/export`) |
| **L3-06** | **弹幕发送小助手面板**<br>`div.bloop` | 点击 Dock `#bloop-icon` 弹出 370px 模态面板 | • 多行循环弹幕文本框<br>• 发送间隔秒数设置<br>• 随机发送 / 顺序轮播切换<br>• 快捷短语插入与状态保持 | 彻底淘汰旧版第三方彩虹屁外链，保留纯净本地预设短语库 |
| **L3-07** | **跨房打榜送礼卡片**<br>`div.extool__sendgift` | 嵌入在 `extool` 扩展功能面板中 | • 礼物名称/图标/ID/标签实时回显<br>• 赠送数量输入 `#extool__sendgift_cnt`<br>• 延迟毫秒设置 `#extool__sendgift_delay`<br>• 开始送礼按钮 `#extool__sendgift_btn` | 点击触发胶囊弹出 **5 级拟态模态大选择器** (`openGiftPicker`) 直选在播礼物 |
| **L3-08** | **背包送礼卡片**<br>`div.extool__clearbag` | 嵌入在 `extool` 扩展功能面板中 | • 动态读取用户背包资产与有效期限<br>• 赠送数量输入 `#extool__clearbag_cnt`<br>• 送出礼物按钮 `#extool__clearbag_sendbtn` | 点击触发胶囊弹出 **5 级拟态模态大选择器**，直选背包道具并回填 |
| **L3-09** | **房间红包与宝箱卡片**<br>`extool__redpacket_room` / `extool__treasure` | 嵌入在 `extool` 扩展功能面板中 | • 房间红包自动抢开关 `#extool__redpacekt_room_start`<br>• 宝箱拾取开关 `#extool__treasure_start`<br>• 拾取延迟毫秒输入 `#extool__treasure_delay` | 后台静默守护并自动拾取房间内可领取的官方红包与宝箱 |
| **L3-10** | **播放器性能监控看板**<br>`div.extool__player_perf` | 嵌入在 `extool` 扩展功能面板中 | • 实时内存监控 `extool__perf_item`<br>• 垃圾回收 GC 状态指示<br>• 拦截器响应延迟与首帧时间展示 | 纯客户端沙盒性能探针 |
| **L3-11** | **播放器色彩滤镜抽屉**<br>`div.filter__panel` | 播放器悬浮条 `vtoolbar-menu` 点击【滤镜】滑出 | • 亮度调整滑块 `#bar__bright`<br>• 对比度调整滑块 `#bar__contrast`<br>• 饱和度调整滑块 `#bar__saturate`<br>• 快捷预设下拉框 `#filter__select` | 实时计算 CSS Filter 并注入播放器视频实体容器 |
| **L3-12** | **画质增强微光弹窗**<br>`div.enhance-modal__panel` | 播放器悬浮条 `vtoolbar-menu` 触发 | • 微光增强开启开关 `#switch__enhance`<br>• 增强强度滑动条 `#slider__enhance`<br>• 效果图与原理说明容器 | 针对 Edge/Chromium 的原生超分辨率与锐化管线挂载 |


## 八、 已确认下线的远古失效活动代码清理清单 (Dead Code Ledger)

以下内容已由真机与接口反查**确认永久失效关停**，NEXT 架构中**坚决予以物理清除，绝不让僵尸垃圾污染代码库**：
1. **2021 粉丝节自动钓鱼 (`ExSave_AutoFish`)**:
   - 对应老接口 `/japi/revenuenc/web/actfans/fishing/reelIn`，斗鱼早下线 4 年以上，代码纯属死循环空跑。
2. **失效的腾讯云 IM 车队周常打卡 (`Xn` / `motorcade`)**:
   - 斗鱼已关停车队系统，腾讯云 IM SDK 接口早已 404，已于上一版正式移除。
3. **第三方彩虹屁生成器 (`api.shadiao.app/chp`)**:
   - 原作者私自添加的外部接口，网络不稳定且有安全隐私隐患，NEXT 版改用内置优质本地常用词典库。
4. **废弃的假百变礼物伪造层与原作者硬编码“幻神”兜底 (`ExSave_GoldBadgeName`)**:
   - 已全量清除。

---

## 九、 NEXT 纯净分层架构实施映射指南 (Next-Gen Architecture Mapping)

```text
DYEXRL-NEXT 架构目录映射规范
src/
├── core/                       # [第一层：底层黄金拦截] (首流原画直达、主上下文榜单、阻断P2P)
│   ├── quality.js
│   ├── rank_engine.js
│   └── p2p_blocker.js
│
├── api/                        # [第二层：统一网络与安全网关] (DouyuClient SDK)
│   ├── client.js               # 统一凭据中枢 (自动注入 ccn / post-csrfToken)
│   ├── room.js                 # 房间信息与在播礼物
│   ├── user.js                 # 用户资产、粉丝牌与背包接口
│   ├── routine.js              # 签到、星推打卡取关、鱼吧打卡
│   └── radar.js                # 抽奖与硬件探测
│
├── store/                      # [第三层：全局响应式状态中枢] (Pub/Sub，告别单字母混淆)
│   ├── index.js                # 状态机引导
│   ├── roomStore.js            # 房间号、主播名、开播状态
│   ├── userStore.js            # 登录状态、UID、真实粉丝牌
│   ├── backpackStore.js        # 背包资产字典与有效期限
│   └── configStore.js          # 用户持久化配置 (含老版本 ExSave_* 数据自动平滑迁移器)
│
├── ui/                         # [第四层：MIUIX 拟态设计系统] (组件化与矢量化)
│   ├── tokens.css              # 纯 CSS Variables (样式缩减 70%)
│   ├── icons.js                # 统一 SVG 矢量图标字典 (消除成百上千行冗余字符)
│   ├── dock.js                 # 二级 Dock 控制器与状态保持
│   └── modals/                 # 统一模态控制视窗
│       ├── modal_base.js       # 基础弹窗框架 (370px 齐平三维贴边装甲)
│       ├── gift_picker.js      # 5级礼物大选择器
│       ├── sign_panel.js       # 一键签到控制台
│       ├── fans_panel.js       # 一键续牌面板
│       └── update_panel.js     # 版本多态更新面板
│
├── modules/                    # [第五层：100% 完整保留的独立业务能力集]
│   ├── danmaku/                # 弹幕全家桶 (小尾巴 / 收藏 / 回复 / 查弹幕 / 净化过滤 / 时速)
│   ├── media/                  # 播控全家桶 (增强画中画 / 同屏联播 / 滤镜比例 / 滚轮音量 / 切后台保存)
│   ├── vod/                    # 录播全家桶 (截图 / GIF录制 / ASS弹幕导出 / 时间戳校准)
│   ├── routine/                # 资产打卡 (背包送礼 / 续牌 / 5大签到流水线)
│   ├── radar/                  # 全站雷达 (抽奖雷达 / 主播电脑配置探测)
│   └── passport/               # 账号系统 (导航栏多账号一键切换)
│
└── main.js                     # [引导入口：生命周期编排] (document-start ➔ document-idle 顺序装配)
```

---
*本白皮书由 Hermes Agent 逐行审计逆向提取，作为 `DYEXRL-NEXT` 从零纯净复刻的单一法定真源。*
