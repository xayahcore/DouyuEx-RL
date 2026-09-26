# DouyuEx-RL 官方核心架构圣经与开发维护手册
> **版本**：v2026.09.26.02  
> **基准分支**：`preview`（原作者小淳未混淆的 50+ 独立 Package 纯净源码架构）  
> **面向对象**：核心开发维护者、安全审计员与架构贡献者

---

## 一、 架构总览与分支演化契约

### 1.1 分支基准与维护原则
- **底座源码**：完全基于 `preview` 分支（原作者原汁原味未混淆的 `src/packages/*` 与 `src/require/*` 目录）进行维护演进。
- **改动约束**：自 2026-09-21 起，所有业务改动、优化与 Bug 修复**一律直接提交至 `preview` 分支**，彻底废除单体混淆/二次切块旧路线。
- **零混淆契约**：所有新增功能、补丁与重构必须严格保持语义化变量命名（禁止机械复制早期逆向混淆遗留的单字母紧凑变量）。

---

## 二、 仓库目录拓扑

```text
DouyuEx-RL/
├── src/
│   ├── core/                           # 核心底层原生拦截层 (最早期注入主页面上下文)
│   │   ├── quality.js                  # 极速无缝最高画质拦截强锁 (12s 起播保护窗口、截断预载流)
│   │   └── rank_engine.js              # 现代哈希混淆排行榜贡献值实时注入引擎 (DYRankFix, 1332 行原生明文)
│   ├── packages/                       # 50+ 个语义化独立业务组件
│   │   ├── Sign/                       # 一键签到 (含 createSignPanel 三级控制台与 Sign_StarDiscover)
│   │   ├── ExpandTool/                 # 扩展工具 (含 5级模态礼物选择器、P2P优雅阻断器、自动钓鱼等)
│   │   ├── LiveTool/                   # 直播间工具 (含 BarrageSendCheck 弹幕屏蔽词检测 SSOT)
│   │   ├── ExPanel/                    # 二级 Dock 与三级模态居中锚定核心调度器
│   │   ├── VideoTools/                 # 播放器高级控制 (画中画、倍速、滤镜、按需主播配置探针等)
│   │   ├── BarrageLoop/                # 弹幕发送小助手 (单行弹性卡片)
│   │   ├── FansContinue/               # 一键续牌 (真实佩戴粉丝牌动态提取)
│   │   ├── Lottery/                    # 全站抽奖信息 (状态受控零偷跑)
│   │   ├── Refresh/                    # 界面拉高、隐藏礼物栏与纯净观播
│   │   ├── RemoveAD/                   # 广告拦截 (CSS 声明式零开销渲染阻断)
│   │   ├── Update/                     # 静默版本更新与多态交互状态机
│   │   └── ...                         # 其余独立小工具包
│   ├── require/                        # 底层通用运行时库
│   │   ├── ResponseHook/               # XHR 原型 Hook (WeakMap 弱引用托管，零内存泄漏)
│   │   ├── ScriptHook/                 # 脚本动态拦截注入器 (DOM 原型安全规范)
│   │   ├── STT/                        # 斗鱼 STT (Slash-Trans-Text) 序列化与反转义解码
│   │   └── WebSocket/                  # 原生 WebSocket 封装
│   ├── routers/
│   │   └── router.js                   # 6 大运行模式与意图分派统一路由
│   ├── common.js                       # 全局工具函数 (ExLoadLib 动态加载, safeBind 安全事件绑定, getDouyuCtn)
│   └── main.js                         # 用户脚本元数据头部、包初始化调度与样式注入入口
├── docs/
│   └── MAINTENANCE.md                  # 本文档
├── tests/
│   ├── test_danmaku_blocked.js         # 弹幕屏蔽词拦截与回执检测 5 大场景单元测试
│   └── test_built_bundle.js            # 打包产物全量端到端挂载与运行集成测试
├── build.js                            # 原生零依赖极速构建打包器 (含 V8 AST 语法核验)
├── DouyuEx_RL.user.js                  # 生产测试最终产物 (根目录留存供本地测试)
└── dist/                               # 编译输出目录 (douyuex.js 与 douyuex.user.js)
```

---

## 三、 核心底层机制与协议拦截原理

### 3.1 极速无缝最高画质强锁 (`src/core/quality.js`)
1. **起播 12 秒黄金保护窗口**：通过 `isInitialLoad()` 记录 `_roomEnterTime`，配合 `location.pathname` 变化自感知重置；
2. **斩断官方低码率预载流**：在 `window` 上通过 `Object.defineProperty` 劫持 `preloadStreamUrlPromise` 与 `getLegacyFirstStream`，彻底废除官方预载流下载；
3. **拦截 `/betard/{rid}` 响应**：在 XMLHttpRequest 与 fetch 层面精准截获房间配置，将下发的首选清晰度硬改锁定为原画（`rate: 0`）；
4. **本地存储 6 大偏好 Key 镜像硬化**：对齐斗鱼底层包装格式，预先将 `rateRecordTime_h5p_room` 等 6 个本地键全部锁定为原画 `0`，有效期设为 365 天。

### 3.2 活跃榜贡献值实时注入 (`src/core/rank_engine.js`)
1. **主上下文 WebSocket 原型劫持**：在页面初始化最早期劫持原生 WebSocket，截获 `ranklist`、`dayrk`、`weekrk`、`monthrk`、`totalrk` 数据包；
2. **双重反转义 STT 解码**：准确解析复杂昵称、排位与亲密度贡献值；
3. **拟态注入与色阶计算**：实时对齐现代斗鱼排行榜 DOM 容器，将贡献值数值注入在行末右侧偏移（`valueRightOffset: 22px`），并赋予渐变色阶；
4. **广播通道**：对外挂载 `window.__onDouyuExChatmsg`，为弹幕屏蔽词核验提供底层事件源。

### 3.3 优雅 WebRTC P2P 阻断器 (`GracefulP2PBlocker`)
- 在 `ExpandTool_P2P.js` 中实现标准 W3C Mock 代理对象，静默阻断 `RTCPeerConnection` 所有上行推流通道，杜绝官方播放器因空原型而抛出 `TypeError` 崩溃。

---

## 四、 现代化业务系统架构规范

### 4.1 一键签到三级流式控制台 (`src/packages/Sign/`)
- **面板规格**：380×370px 标准 MIUIX 拟态模态框（`createSignPanel`）；
- **5 大日常任务独立勾选**：
  1. `room`: 房间与粉丝牌签到；
  2. `client`: 客户端模拟领礼盒；
  3. `yuba`: 关注鱼吧一键打卡；
  4. `stardiscover`: 星推日常任务打满；
  5. `fanshome`: 粉丝家园打卡与钻粉日常。
- **持久化契约**：勾选状态保存在 `ExSave_SignConfig` 中；
- **终端视窗**：控制台内嵌滚动日志终端，精准回显每一项任务的入账信息。

### 4.2 星推任务打满与白名单安全取关闭环 (`Sign_StarDiscover.js`)
- **零成本收益全覆盖**：活动页打卡 (+10)、3 房间打卡 (+9)、指定参赛房间口令弹幕 (+5)、互动上报、5 位关注任务 (+15)，单日打满 39+ 金币；
- **智能门禁**：通过 `isStarCompetitionRoom`（`hide === 0 && rank > 0`）判断，非比赛房间绝不发送口令弹幕打扰主播；
- **标准凭据**：通过 `getDouyuCtn()` 自动唤醒提取官方标准 `ccn` 凭据；
- **白名单安全取关**：关注前读取用户既有关注列表；**对用户原已关注的主播绝对不执行取关**，仅对本次成功新添加的主播在 1.8 秒服务端入账呼吸窗口后调用 `/follow/rm` 取关（3 次重试 + 末尾全量安全扫尾），确保关注列表 100% 保持纯净。

### 4.3 5 级 MIUIX 悬浮大选择器 (`ExpandTool_GiftPicker.js`)
- **尺寸与排版**：540×410px 悬浮大模态选择器，双 Tab（全部礼物 / 背包道具），4 列网格卡片流；
- **双流礼物聚合**：动态并行拉取房间专属定制礼物与大盘通用 140+ 款礼物，按鱼翅价值排序；
- **背包 0ms 现场直探**：点击“背包礼物”Tab 优先 0 毫秒直探底栏原生 DOM 节点克隆高清图与真实持有量，绕开 API 延迟；
- **弱鸡专属动图**：内置 `COMMON_BACKPACK_PROPS`，映射官方正版大头跳动动图，解决图标串味与 404 死链。

### 4.4 弹幕发送回执与屏蔽词检测系统 SSOT (`BarrageSendCheck.js`)
- **队列机制**：采用 FIFO 队列 `pendingDanmakuList`，记录自身发送弹幕的纯文本内容与时间戳；
- **双通道核验**：监听 `window.__onDouyuExChatmsg` 原生 WebSocket 广播回执包；
- **800ms 敏捷超时**：超时未收到广播回执触发灰色删除线与 `(可能发送失败)` 悬停标签；若网络抖动迟到回执，系统自动自愈解除删除线。

---

## 五、 UI / UX 体系与物理锚定规范

1. **二级 Dock 声明式装配**：胶囊尺寸锁定为 **76px 高度、38px 连续圆角、56px 底座**；移除 800ms 强制隐藏，支持精灵球随时切换锁定；
2. **18px 隐形连桥 (Hover Bridge)**：在 Dock 按键上方向上延伸 18px 透明热区，配合 **400ms** 防抖，消灭鼠标上滑时的悬空盲区；
3. **三级模态物理越狱与 0px 水平居中锚定**：
   - 彻底脱离 `.Barrage-main`，挂载至 `document.body`；
   - 通过 `openMiuixPanelCentered(panel, btnEl)` 动态根据按键视口坐标计算居中水平定位，悬浮于按钮上方 12px；
4. **吸顶 Header 与滚动条下移**：
   - `ensureMiuixPanelHeader(el, title)` 统一生成吸顶顶栏；
   - 内容承载统一移至 `.miuix-modal__body`，滚动条起始于顶栏正下方，配备 4px 细质感滑块；
5. **样式作用域绝对隔离**：所有输入控件样式限定于 `.miuix-modal` 强命名空间内，杜绝污染斗鱼原生播放器选项。

---

## 六、 全量本地存储键名字典 (LocalStorage & GM SSOT)

| 存储键名 | 存储介质 | 数据格式 | 说明与变动契约 |
| :--- | :--- | :--- | :--- |
| **`ExSave_SignConfig`** | LocalStorage | JSON Object | 一键签到 5 大日常子任务勾选记忆配置 |
| `ExSave_HighestVideoQuality` | LocalStorage | JSON `{isHighestVideoQuality: bool}` | 自动最高画质强锁开关 |
| `ExSave_FullScreen` | LocalStorage | JSON `{isFullScreen: bool}` | 自动网页全屏开关 |
| `ExSave_P2P` | LocalStorage | JSON `{isKillP2P: bool}` | 阻止 WebRTC P2P 上传开关 |
| `ExSave_DanmakuTail` | LocalStorage | JSON `{isTailEnabled, tailContent, type}` | 弹幕小尾巴配置 |
| `ExSave_FansContinue` | LocalStorage | String (数字) | 一键续牌各房间赠送荧光棒数量 |
| `ExSave_Lottery` | LocalStorage | JSON `{isNotice: bool}` | 全站抽奖信息按需提醒开关 |
| `ExSave_Treasure` | LocalStorage | JSON `{isGetTreasure: bool, ...}` | 半自动抢宝箱开关与延迟 |
| `ExSave_AutoFish` | LocalStorage | JSON `{rids: [], modes: {}}` | 自动钓鱼挂机房间与模式配置 |
| `ExSave_Vote` | LocalStorage | JSON Object | 弹幕投票主题与选项配置 |
| `ExSave_Enter` | LocalStorage | JSON Array `[{level, word}]` | 进场欢迎等级与词条列表（严格数组结构） |
| `ExSave_isEnter` | LocalStorage | JSON `{rooms: []}` | 进场欢迎启用房间白名单 |
| `ExSave_TabSwitch` | LocalStorage | JSON `{isEnableTabSwitch: bool}` | 防浏览器页签休眠挂机开关 |
| `ExSave_Refresh` | LocalStorage | JSON `{barrageFrame, video, barrage}` | 界面拉高、隐藏礼物栏状态 |
| `ExSave_DanmakuCollect` | LocalStorage | JSON Array | 弹幕无限收藏列表 |
| `ExSave_MonthCost` | LocalStorage | JSON Object | 个人中心月度消费统计缓存 |
| `Ex_accountList` | GM Storage | JSON Object | 多账号 Cookie 凭据托管库 |
| `Ex_LastNotifiedVersion` | GM Storage | String | 已收到确认的更新版本号记录 |
| `Ex_LastUpdateCheckTime`| GM Storage | String (时间戳) | 12小时限频更新检查时间戳 |

---

## 七、 开发、编译与测试命令

```bash
# 1. 编译构建
# 会同时执行 V8 AST 编译核验与 Tree-Shaking，并在根目录下输出 DouyuEx_RL.user.js
npm run build

# 2. 全量自动化回归测试
# 执行单元测试与 JSDOM 端到端真实 Bundle 挂载测试
npm test

# 3. 代码提交
# 记住：所有改动一律提交至 preview 分支
git add -A
git commit -m "feat/fix: 提交说明"
```
