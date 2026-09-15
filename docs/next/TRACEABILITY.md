# 📋 DouyuEx-RL NEXT 全量功能、面板与路由追踪矩阵 (TRACEABILITY.md)

> 任务包：`P0.1`  
> 状态定义：`planned` (已规划) · `implementing` (实现中) · `mock-tested` (脱敏夹具通过) · `live-verified` (真机验收) · `blocked` (受阻)  
> 当前阶段：**Phase 0.1 基线冻结**（全部状态初始为 `planned`）  
> 风险等级：`H` (高危：资产/账号/写操作) · `M` (中等：外部接口/媒体流) · `L` (低危：纯本地视图/状态)  

---

## 一、 62 项交付能力组追踪矩阵 (F-01 ～ F-62)

| 能力ID | 功能名称与业务能力描述 | 源码依据与锚点 | 目标实现文件 (src/下) | 关联API / 状态路径 | 对应测试编号 | 风险 | 当前状态 |
|:---:|:---|:---|:---|:---|:---:|:---:|:---:|
| **F-01** | 最高画质截杀、预载流掐断与 12s 保护窗 | M1.1; `quality.js:1-171` | `core/quality.js` | A-01, A-02; `core.quality` | T-F-01 | H | `mock-tested` |
| **F-02** | 日周月总榜贡献值与 STT 双重转义解码 | M1.2; `rank_engine.js:1-1318` | `core/rank_engine.js` | WS STT; `core.rank` | T-F-02 | H | `planned` |
| **F-03** | WebRTC P2P 上传阻断与假原型装配 | M1.3; `01_setup.js:6` | `core/p2p_blocker.js` | local; `core.p2p` | T-F-03 | H | `mock-tested` |
| **F-04** | 增强版画中画 (DocumentPictureInPicture) 弹幕流与小窗打字 | M2.1; `05_services.js:2150-2350` | `modules/media/pip.js` | chat adapter; `media.pip` | T-F-04 | M | `planned` |
| **F-05** | 同屏多直播间联播 (FLV极速流/iframe、拖拽缩放、独立音量) | M2.2; `02_dom_ui.js:770`, `05_services.js:86` | `modules/media/multi_room.js` | A-02; `media.multiRoom` | T-F-05 | M | `planned` |
| **F-06** | 播放器色彩滤镜 (亮/对比/饱和度滑块、预设模式、旋转缩放、影院) | M2.3; `05_services.js:2010` | `modules/media/filters.js` | local; `media.filters` | T-F-06 | L | `planned` |
| **F-07** | 播放器滚轮音量平滑微调与百分比提示气泡 | M2.4; `05_services.js:2060` | `modules/media/volume.js` | local; `media.volume` | T-F-07 | L | `planned` |
| **F-08** | 切后台自动静音/自动暂停与切回毫秒级恢复 | M2.5; `05_services.js:530` | `modules/media/background_saver.js` | local; `media.background` | T-F-08 | L | `planned` |
| **F-09** | 360° 全景播放器球面透视与交互 | 源码 `ex-panorama`, `THREE.*` | `modules/media/panorama.js` | THREE; `media.panorama` | T-F-09 | M | `planned` |
| **F-10** | 一键极速截图 (PNG) 与长按录制高清动态 GIF | M3.1; `05_services.js:1310` | `modules/media/recorder.js` | GIF/Worker; `media.recorder` | T-F-10 | M | `planned` |
| **F-11** | 录播弹幕 ASS 字幕导出、Excel 报表、绝对时间校准与快捷直达 | M3.2-3.3; `05_services.js:2070` | `modules/vod/exporter.js`, `helper.js` | B-VOD; `vod.exporter` | T-F-11 | M | `planned` |
| **F-12** | 弹幕小尾巴 (多模板预设、前缀/后缀模式、回车自动拼接) | M4.1; `02_dom_ui.js:1077` | `modules/danmaku/tail.js` | chat adapter; `danmaku.tail` | T-F-12 | M | `planned` |
| **F-13** | 无限弹幕本地收藏库、模糊搜索与点击填入 | M4.2; `02_dom_ui.js:1947` | `modules/danmaku/collect.js` | local; `danmaku.collect` | T-F-13 | L | `planned` |
| **F-14** | 关键词自动回复小助手 (CD冷却、增删与规则导入导出) | M4.3; `02_dom_ui.js:1427` | `modules/danmaku/auto_reply.js` | B-CHAT; `danmaku.reply` | T-F-14 | H | `planned` |
| **F-15** | 实时弹幕时速监测、活跃发言者与真实观众热度雷达 | M4.4; `02_dom_ui.js:1083` | `modules/danmaku/velocity.js` | B-AUDIENCE; `danmaku.velocity` | T-F-15 | M | `planned` |
| **F-16** | 弹幕深度净化 (N秒重复合并、进房广播、大表情、背景框、字体放大) | M4.5; `05_services.js:80-120` | `modules/danmaku/filter.js` | local; `danmaku.filter` | T-F-16 | L | `planned` |
| **F-17** | 进房欢迎词与自动谢礼物 (等级范围、增删与规则导入导出) | M4.6; `02_dom_ui.js:1380` | `modules/danmaku/greeter.js` | B-CHAT; `danmaku.greeter` | T-F-17 | H | `planned` |
| **F-18** | 关键词与快捷禁言管理 (禁言时长1/3/7/30天、名单查询、导入导出) | M4.7; `02_dom_ui.js:1320` | `modules/danmaku/mute.js` | B-MUTE; `danmaku.mute` | T-F-18 | H | `planned` |
| **F-19** | 实时弹幕溯源搜索、聊天区 +1 跟风复读与作者四合一快捷卡片 | M4.8-4.9; `05_services.js:120` | `modules/danmaku/search.js`, `interaction.js` | B-SEARCH/CHAT; `danmaku.interaction` | T-F-19 | H | `planned` |
| **F-20** | 5 级礼物大选择器 (专属+通用140+款双流聚合、背包直探、搜索回填) | M5.1; `02_dom_ui.js:16-177` | `ui/gift_picker.js` | A-01, A-12, B-GIFTS; `economy.picker` | T-F-20 | M | `planned` |
| **F-21** | 跨房打榜送礼与背包清空 (精准道具映射、数量、延迟、确认安全) | M5.2; `02_dom_ui.js:1111` | `modules/economy/backpack.js` | A-12, A-13, B-SEND; `economy.backpack` | T-F-21 | H | `planned` |
| **F-22** | 一键续牌 (动态识别真实佩戴牌子、荧光棒数量计算、自动打卡) | M5.3; `02_dom_ui.js:350` | `modules/economy/fans_continue.js` | A-11, A-12, A-13; `economy.fans` | T-F-22 | H | `planned` |
| **F-23** | 一键签到五大日常任务闭环 (房间/客户端/鱼吧打卡补签/星推全满/钻粉) | M5.4; `02_dom_ui.js:498` | `modules/economy/sign_engine.js` | A-03～11, B-SIGN; `economy.sign` | T-F-23 | H | `planned` |
| **F-24** | 自动钓鱼挂机系统 (全天/钓鱼大赛双模式、鱼饵/时间戳探测、自动提竿结算) | M5.5; `02_dom_ui.js:1711`, `05_services.js:242` | `modules/economy/autofish.js` | B-FISH; `economy.fish` | T-F-24 | H | `planned` |
| **F-25** | 全站抽奖监控雷达 (大奖/红包房间列表、一键上车、通知过滤) | M6.1; `02_dom_ui.js:344` | `modules/radar/lottery.js` | B-LOTTERY; `radar.lottery` | T-F-25 | M | `planned` |
| **F-26** | 房间宝箱自动拾取与房间红包自动抢 (拾取延迟、验证码暂停人工接管) | A6.8; `02_dom_ui.js:344`, `05_services.js` | `modules/radar/treasure.js` | B-TREASURE; `radar.treasure` | T-F-26 | H | `planned` |
| **F-27** | 主播真实电脑硬件配置一键探测 (CPU/独显/主板/码率分辨率) | M6.2; `05_services.js:15` | `modules/radar/hardware.js` | B-HARDWARE; `radar.hardware` | T-F-27 | M | `planned` |
| **F-28** | 粉丝勋章佩戴满 300 天铁粉红字标记与贵族钻粉到期天数指示 | M6.3, M7.3; `02_dom_ui.js:1947` | `modules/radar/badges.js` | A-11, B-VIP; `radar.badges` | T-F-28 | M | `planned` |
| **F-29** | 顶部导航栏多账号无感免密热切换中心 (LTP0凭据备份/注入/删除) | M7.1; `02_dom_ui.js:1937`, `06_router.js:1` | `modules/passport/account_switcher.js` | passport adapter; `passport.switcher` | T-F-29 | H | `planned` |
| **F-30** | 全局版本更新多态雷达 (12h静默限频、检查中/最新/前往更新多态按钮) | M6.4; `02_dom_ui.js:780` | `modules/system/updater.js` | B-UPDATE; `system.update` | T-F-30 | M | `planned` |
| **F-31** | 播放器客户端性能监控看板 (实时内存/GC状态/首帧延迟探针) | L3-10; `02_dom_ui.js:341` | `modules/system/perf_monitor.js` | performance API; `runtime.perf` | T-F-31 | L | `planned` |
| **F-32** | 弹幕投票 (增删选项/限时/重复) 与独立大屏结果看板、Bloop发送小助手 | L3-01, L3-06; `02_dom_ui.js:987` | `modules/danmaku/vote.js`, `bloop.js` | B-CHAT; `danmaku.vote/bloop` | T-F-32 | H | `planned` |
| **F-33** | 鱼吧已关闭/封禁板块浏览恢复管道与公开内容兼容 | M7.3; `06_router.js:1` | `modules/passport/yuba.js` | B-YUBA; `passport.yuba` | T-F-33 | M | `planned` |
| **F-34** | 油猴菜单重置所有设置 (白名单清理)、清爽模式与网页自动全屏 | 维护指南; `01_setup.js:21` | `modules/system/settings.js`, `reset.js` | local; `system.settings` | T-F-34 | H | `planned` |
| **F-35** | 播放器画质增强微光弹窗 (超分辨率与锐化管线说明与强度滑块) | L3-12; `02_dom_ui.js:341` | `modules/media/enhance.js` | C-ENHANCE; `media.enhance` | T-F-35 | M | `planned` |
| **F-36** | 全局脚本插入靶向安全过滤 (`Node.prototype.appendChild/insertBefore`) | `01_setup.js:6` | `platform/script_bridge.js` | local; `platform.script` | T-F-36 | H | `planned` |
| **F-37** | `/firstqueue` 关键路径拦截与内联补丁管道 | `01_setup.js:6` | `platform/script_bridge.js` | local; `platform.firstqueue` | T-F-37 | H | `planned` |
| **F-38** | 通用 XHR 响应转换器注册表与生命周期改写链 | `01_setup.js:6` | `platform/xhr_transform.js` | local; `platform.xhr` | T-F-38 | H | `planned` |
| **F-39** | P2P 完整原型替换 (`createOffer`/`getStats`/`dataChannel`) | `01_setup.js:6` | `core/p2p_blocker.js` | local; `core.p2p` | T-F-39 | H | `mock-tested` |
| **F-40** | 贡献榜 Page-World WebSocket 代理与 Blob/ArrayBuffer 解码通道 | `rank_engine.js:488-568` | `core/rank_engine.js` | page bridge; `core.rank` | T-F-40 | H | `planned` |
| **F-41** | 榜单注入调度防抖 (50ms debounce, 5s fallback, click 触发, debug 开关) | `rank_engine.js:78-100` | `core/rank_engine.js` | local; `core.rank` | T-F-41 | M | `planned` |
| **F-42** | 最高画质属性劫持 (`preloadStreamUrlPromise` 抑制预载, `getLegacyFirstStream` 强锁 rate=0) | `quality.js:37-70` | `core/quality.js` | local; `core.quality` | T-F-42 | H | `mock-tested` |
| **F-43** | 六个斗鱼播放器官方画质偏好 key 一年期 rate=0 镜像硬化 | `quality.js:23-35` | `core/quality.js` | local; `core.quality` | T-F-43 | M | `mock-tested` |
| **F-44** | 录播视频 Shadow DOM 观察器 (video/share/controller 三路监听) | `06_router.js:1` | `adapters/vod_player.js` | observer; `adapters.vod` | T-F-44 | M | `planned` |
| **F-45** | 普通房间/exid 就绪探测与侧边栏/全屏触发 | `01_setup.js:6`, `06_router.js:5` | `adapters/room.js` | observer; `adapters.room` | T-F-45 | M | `mock-tested` |
| **F-46** | 60 秒任务心跳调度器 | `03_cron.js:2-6` | `runtime/heartbeat.js` | timer; `runtime.heartbeat` | T-F-46 | M | `planned` |
| **F-47** | 粉丝勋章页 DOM 增强渲染 (佩戴天数、开通日期、红字高亮) | `06_router.js:1` | `modules/radar/badges.js` | DOM; `radar.badges` | T-F-47 | L | `planned` |
| **F-48** | Level 2 Dock 9 按钮固定装配顺序与点击/展开生命周期控制 | `02_dom_ui.js:916-1045` | `ui/dock.js` | UI; `ui.dock` | T-F-48 | M | `planned` |
| **F-49** | 四大一级控制台面板具体交互 (fans, sign, popup, update) | `02_dom_ui.js:350-914` | `ui/modals/` | UI; `ui.modals` | T-F-49 | M | `planned` |
| **F-50** | GiftPicker 完整选择器交互 (双Tab/搜索/懒图/回填/mask关闭/160ms移除) | `02_dom_ui.js:16-175` | `ui/gift_picker.js` | UI; `ui.picker` | T-F-50 | M | `planned` |
| **F-51** | 月度消费统计、明文/隐藏状态与礼物消费清单 | `05_services.js:576` | `modules/system/month_cost.js` | B-USER; `system.cost` | T-F-51 | M | `planned` |
| **F-52** | 用户等级任务详情、任务状态查询与经验奖励领取 | `05_services.js:546` | `modules/economy/level_task.js` | B-SIGN; `economy.level` | T-F-52 | H | `planned` |
| **F-53** | 房间卡任务信息查询与状态感知 | `05_services.js:576` | `modules/economy/card_task.js` | B-SIGN; `economy.card` | T-F-53 | M | `planned` |
| **F-54** | 关注列表增强 (开播过滤/未循环/最多10项/新标签页/长按同屏播放) | `05_services.js:530-546` | `modules/media/follow_list.js` | A-FOLLOW; `media.follow` | T-F-54 | M | `planned` |
| **F-55** | Pocket 互动有效信息展示 | `05_services.js:120` | `modules/radar/pocket.js` | B-AUDIENCE; `radar.pocket` | T-F-55 | M | `planned` |
| **F-56** | 弹幕 `[DouyuEx图片...]` Base36 协议编码与净化渲染 | `05_services.js:86` | `modules/danmaku/image_codec.js` | local; `danmaku.codec` | T-F-56 | M | `planned` |
| **F-57** | 录播视频高能弹幕热度进度条 (100 桶聚合算法) | `05_services.js:120-130` | `modules/vod/heatmap.js` | B-VOD; `vod.heatmap` | T-F-57 | M | `planned` |
| **F-58** | 录播视频流直链解析、m3u8 复制与多档清晰度选择下载 | `05_services.js:120-216` | `modules/vod/stream_parser.js` | B-VOD; `vod.stream` | T-F-58 | M | `planned` |
| **F-59** | 跨平台 Bilibili / 虎牙直播流与同屏播放解析适配器 | `05_services.js:2471` | `modules/media/external_stream.js` | B-STREAM; `media.external` | T-F-59 | M | `planned` |
| **F-60** | Bloop 弹幕发送高级参数 (随机抖动间隔、颜色轮播、自动倒计时安全停发) | `05_services.js:86` | `modules/danmaku/bloop.js` | local; `danmaku.bloop` | T-F-60 | M | `planned` |
| **F-61** | 跨环境特权适配器 (GM_openInTab, Toast, 依赖按需加载调度) | `05_services.js:1,50` | `platform/capabilities.js` | local; `platform.caps` | T-F-61 | M | `planned` |
| **F-62** | 四站跨域 Clean 管道编排 (yuba/msg/v/cz 凭据清理与父子通信) | `05_services.js:74`, `06_router.js:1` | `modules/passport/clean_pipeline.js` | postMessage; `passport.clean` | T-F-62 | H | `planned` |

---

## 二、 12 个套娃子面板与悬浮大屏看板追踪矩阵 (L3-01 ～ L3-12)

| 面板ID | 基线 DOM 标识 | 隐藏归属位置与触发形式 | 内部核心控件与参数 | 导出/导入/联动看板 | 当前状态 |
|:---:|:---|:---|:---|:---|:---:|
| **L3-01** | `vote__panel` / `vote__result` | `livetool` 点击 `#vote__title` 展开手风琴 | 主题选择、主题/选项输入、限时秒数、重复投票 | 联动点击弹出**独立悬浮大屏结果看板** (`vote__result`) | `planned` |
| **L3-02** | `enter__panel` | `livetool` 点击 `#enter__title` 展开手风琴 | 欢迎语选择、等级阈值输入、欢迎语文本、增删按钮 | 剪贴板一键**导入 (`#enter__import`)** 与 **导出 (`#enter__export`)** | `planned` |
| **L3-03** | `mute__panel` | `livetool` 点击 `#mute__title` 展开手风琴 | 违规词选择、禁言时长(1/3/7/30天)、增删按钮 | 禁言名单查询 (`#mute__idlist`)、规则导入导出 | `planned` |
| **L3-04** | `gift__panel` | `livetool` 点击 `#gift__title` 展开手风琴 | 礼物选择、感谢语模板输入、增删按钮 | 谢礼模板一键剪贴板**导入与导出 (`#gift__import/export`)** | `planned` |
| **L3-05** | `reply__panel` | `livetool` 点击 `#reply__title` 展开手风琴 | 关键词选择、回复内容、CD冷却秒数、增删按钮 | 关键词回复规则 JSON 一键剪贴板**导入与导出** | `planned` |
| **L3-06** | `bloop` | Dock 点击 `#bloop-icon` 弹出模态面板 | 循环多行文本框、发送间隔、随机/顺序切换 | 内置纯净短语预设，彻底淘汰外部彩虹屁接口 | `planned` |
| **L3-07** | `extool__sendgift` | 嵌入在 `extool` 扩展功能面板中 | 礼物回显胶囊、送礼数量、间隔毫秒、送礼按钮 | 点击胶囊无缝调起 **5 级拟态模态大选择器** (`GiftPicker`) | `planned` |
| **L3-08** | `extool__clearbag` | 嵌入在 `extool` 扩展功能面板中 | 背包道具资产动态展示、赠送数量、送出按钮 | 点击胶囊调起 **5 级拟态模态大选择器**，直选背包道具回填 | `planned` |
| **L3-09** | `extool__redpacket_room` / `treasure` | 嵌入在 `extool` 扩展功能面板中 | 房间红包自动抢开关、宝箱自动拾取、延迟毫秒 | 毫秒级后台守护，遇验证码自动暂停并弹窗呼叫人工 | `planned` |
| **L3-10** | `extool__player_perf` | 嵌入在 `extool` 扩展功能面板中 | 实时堆内存、GC状态指示、首帧截杀耗时看板 | 纯客户端沙盒性能探针 | `planned` |
| **L3-11** | `filter__panel` | 播放器悬浮条 `vtoolbar-menu` 点击滑出抽屉 | 亮度/对比度/饱和度三条滑块、快捷预设下拉框 | 实时计算 CSS Filter 动态注入播放器视频实体 | `planned` |
| **L3-12** | `enhance-modal__panel` | 播放器悬浮条 `vtoolbar-menu` 触发弹窗 | 微光增强开启开关、强度滑动条、原理说明 | 针对 Edge/Chromium 原生锐化管线说明弹窗 | `planned` |

---

## 三、 5 个核心一级控制台面板追踪矩阵 (P-01 ～ P-05)

| 面板ID | 面板名称与 DOM 标识 | 尺寸与触发锚点 | 核心控件与业务流 | 对应能力编号 | 当前状态 |
|:---:|:---|:---:|:---|:---:|:---:|
| **P-01** | 一键续牌面板 (`fans-panel`) | 380×370px; Dock `fans-continue` | 真实佩戴牌子动态识别、背包荧光棒数量回显、自定义赠送数量、一键打卡按钮 | F-22 | `planned` |
| **P-02** | 一键签到控制台 (`sign-panel`) | 380×370px; Dock `ex-sign` | 5 大任务复选框 (房间/客户端/鱼吧/星推/钻粉)、实时滚动日志视窗、纯文字开始签到 | F-23 | `planned` |
| **P-03** | 同屏播放控制台 (`popup-player-panel`) | 380×370px; Dock `popup-player` | 房间号/URL 输入框、剪贴板一键粘贴、极速流/iframe模式切换单选组、创建同屏窗 | F-05 | `planned` |
| **P-04** | 版本更新面板 (`exupdate-panel`) | 380×370px; Dock `ex-update` | 三段式演进日志展示 (新增/优化/其它)、多态交互按钮 (我已收到/检查更新/前往更新) | F-30 | `planned` |
| **P-05** | Level 5 大礼物选择器 (`ex-gift-picker`) | 540×410px; 全屏居中悬浮模态 | 房间在播/背包道具双 Tab 切换、顶部实时模糊搜索框、礼物网格流、4px 滚动条 | F-20 | `planned` |

---

## 四、 8 大场景路由归一化判定追踪 (R-01 ～ R-08)

| 路由ID | 场景名称与判定规则 | 优先级 | 初始化挂载范围 | 对应期望测试 | 当前状态 |
|:---:|:---|:---:|:---|:---:|:---:|
| **R-01** | 普通数字房间主模式 (`*.douyu.com/0-9*`, `beta/*`, `topic/*`) | 7 | 激活底层拦截 -> 挂载 Dock -> 挂载 MIUIX 模态窗 -> 启动业务心跳 | T-R-01 | `mock-tested` |
| **R-02** | 同屏画中画纯净流模式 (`URL 携带 ?exid=chun`) | 6 | 剥离聊天区/礼物区/顶栏，自动网页全屏，提供纯净视频流 | T-R-02 | `mock-tested` |
| **R-03** | 录播视频播放增强 (`v.douyu.com/show/*`) | 5 | 监听 Shadow DOM，挂载时间戳校准、截图录制与 ASS 字幕导出 | T-R-03 | `mock-tested` |
| **R-04** | 鱼吧已关闭板块浏览恢复 (`yuba.douyu.com/*?exRestore`) | 4 | 拦截改写接口 `group_id`，解除被封禁/关闭鱼吧话题的浏览限制 | T-R-04 | `mock-tested` |
| **R-05** | passport 跨域多账号免密切换管道 (`passport.douyu.com/*?exid=chun`) | 2 | 隐藏 iframe 通道：执行 `switch` / `clean` / `delete`，通过 GM_cookie 热切凭据 | T-R-05 | `mock-tested` |
| **R-06** | 粉丝勋章精确佩戴天数统计页 (`douyu.com/member/cp/getFansBadgeList`) | 3 | 解析 `data-fans-gbdgts` 时间戳推算天数，超 300 天标记高亮红字 | T-R-06 | `mock-tested` |
| **R-07** | 四站跨域 Clean 管道 (`msg/v/cz/yuba` 携带 `?exClean`) | 1 | 清理指定站点 Cookie 后通过 postMessage 通知父级并安全关闭管道 | T-R-07 | `mock-tested` |
| **R-08** | 其他非目标页面或未授权命令 (template, h5, 无关页) | 8 | 明确 no-op 静默退出，不启动任何业务逻辑 | T-R-08 | `mock-tested` |

---

## 五、 API 契约台账索引 (A-01 ～ A-13 与 B-* / C-*)

| 契约ID | 接口分类与 URL / 协议 | 认证凭据需求 | 消费能力 | 证据等级 | 当前状态 |
|:---:|:---|:---|:---:|:---:|:---:|
| **A-01** | `GET /betard/{rid}` | 无 (同源) | F-01, F-20 | B | `planned` |
| **A-02** | `POST /lapi/live/getH5Play/{rid}` | `token`, `cdn`, `rate=0` | F-01, F-05 | B | `planned` |
| **A-03** | `POST /japi/carnival/nc/sign/webSign` | Cookie, `uid` | F-23 | B | `planned` |
| **A-04** | `POST https://yuba.douyu.com/wb/sign` | Cookie, `group_id` | F-23 | B | `planned` |
| **A-05** | `POST /japi/roomtask/task/sign` | Cookie, `rid` | F-23 | B | `planned` |
| **A-06** | `GET /japi/livebiznc/web/anchorstardiscover/user/task/list` | Cookie | F-23 | A | `planned` |
| **A-07** | `POST /japi/livebiznc/web/anchorstardiscover/user/task/report` | `ctn`, `dy-csrf-token` | F-23 | A | `planned` |
| **A-08** | `GET /japi/livebiznc/web/anchorstardiscover/user/task/follow/introduce` | Cookie, `rid` | F-23 | A | `planned` |
| **A-09** | `POST /wgapi/livenc/liveweb/follow/add` | `rid`, `ctn (ccn)` | F-23 | A | `planned` |
| **A-10** | `POST /wgapi/livenc/liveweb/follow/rm` | `rid`, `ctn (ccn)` | F-23 | A | `planned` |
| **A-11** | `GET /member/cp/getFansBadgeList` | Cookie 登录态 | F-22, F-28 | B | `planned` |
| **A-12** | `GET /japi/prop/backpack/web/v5?rid={rid}` | Cookie 登录态 | F-20, F-21, F-22 | A | `planned` |
| **A-13** | `POST /japi/prop/donate/mainsite/v1` (或送礼接口) | Cookie, `propId`, `count`, `roomId` | F-21, F-22 | B | `planned` |
| **B-FISH** | `GET .../fishing/homePage`, `POST .../fishing/reelIn` | Cookie, `ctn`, `rid` | F-24 | A | `planned` |
| **B-GIFTS** | `GET open.douyucdn.cn/api/RoomApi/room/{rid}` | 无 (公网CDN) | F-20 | A | `planned` |
| **B-SEND** | 跨房送礼执行调用链 | Cookie, `ctn` | F-21 | B | `planned` |
| **B-SIGN** | `fanshome/sign`, `dfansact/userSign`, `wb/v3/supplement` | Cookie, `ctn`, `token` | F-23 | A | `planned` |
| **B-CHAT** | 聊天弹幕发射接口与 React 事件分发 | 页面上下文事件 | F-12, F-14, F-17, F-19, F-32 | B | `planned` |
| **B-MUTE** | `room/roomSetting/addMuteUser` 房管禁言接口 | Cookie 房管凭据 | F-18 | B | `planned` |
| **B-SEARCH** | `doseeing.com/api/suggest_all` 弹幕搜索 | 跨域 GET | F-15, F-19 | B | `planned` |
| **B-AUDIENCE**| 真实观看人数与时长接口 (`swf_api/h5room/{rid}`) | GET | F-15 | B | `planned` |
| **B-VOD** | `getVideoUrl`, `getBarrageListByPage`, `getBindGroup` | Cookie, `vid` | F-11, F-57, F-58 | B | `planned` |
| **B-LOTTERY** | 全站抽奖与红包广播 WebSocket/HTTP 接口 | 长连接 / GET | F-25, F-26 | B | `planned` |
| **B-HARDWARE**| `www.douyu.com/member/cp` 推流助手硬件解析 | Cookie 登录态 | F-27 | B | `planned` |
| **B-UPDATE** | Greasy Fork 脚本版本查询接口 | 跨域 GET | F-30 | B | `planned` |
| **B-YUBA** | 鱼吧已关闭板块解除限制接口 | Cookie | F-33 | B | `planned` |
| **C-ENHANCE** | Chromium/Edge 微光增强与超分滤镜管线 | 本地能力检测 | F-35 | C | `planned` |