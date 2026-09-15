# DouyuEx-RL NEXT：Gemini 执行型实施契约

> 修订日期：2026-09-16。执行对象：Gemini 3.8 Flash 或其他接手模型。
> 唯一施工分支：`DYEXRL-NEXT`；不得合并、推送或发布到 `main`。
> 本文定义未来实现要求，不代表这些模块、测试、接口已经实现或验收。
> 目标：保留基线中的有效能力与 MIUIX 交互，除批准的 core 例外外从零实现；以证据、逐项验收和可恢复交付代替口号。

## 阅读导航

- [0. 执行边界与使用方式](#execution)
- [1. 证据与已纠正事实](#evidence)
- [2. 工程与构建契约](#build)
- [3. 运行时接口契约](#contracts)
- [4. MIUIX 视觉与交互契约](#ui)
- [5. 分阶段任务包](#phases)
- [6. 功能追踪矩阵](#features)
- [7. 子面板与路由矩阵](#routes)
- [8. API 取证台账](#api)
- [9. 存储与迁移契约](#migration)
- [10. 安全、兼容与失败处理](#safety)
- [11. 测试与验收门禁](#tests)
- [12. Gemini 接力协议](#handoff)

<a id="execution"></a>
## 0. 执行边界与使用方式

### 0.1 必须遵守

1. 先读本文，再按当前任务包读取指定基线源码。不得把审计文档中的历史推断直接当成当前平台事实。
2. 老业务代码只用于辨认输入、输出、交互、协议和数据格式，不得复制其实现。允许保留/提取的实现仅为 `quality.js`、`rank_engine.js` 和 `01_setup.js` 中 P2P 基础阻断段；记录提取范围与依赖。MIUIX 视觉规范可复用，旧 UI/业务代码不可复制。
3. 保留功能不等于保留漏洞：凭据泄露、全站 Cookie 删除、无限重试、伪造成功、验证码绕过不得复刻。任何功能因平台不可用而阻塞，保留入口和原因，不冒充完成或偷偷删掉。
4. 当前旧源码和根目录生产包是比对依据。新实现通过独立构建清单接入，不先删光旧文件；不让旧业务和新业务同时挂载同一页面。退休旧文件必须有逐项替代证据，删除前检查内容与用户改动。
5. 不运行 `release.js` 或 `npm run release`：当前脚本会改版本、复制产物、`git add -A`、提交并执行 `git push origin main`。本计划不授权提交、推送、安装或发布。
6. 只修改当前任务包文件及必要依赖，不顺带大范围重构。不修改 `.zcode/` 或无关用户文件。
7. 自动化默认使用假传输/脱敏夹具。计划授权编码，不授权在真实账号上发弹幕、送礼、关注/取关、禁言、切换 Cookie 或批量领取。
8. 禁止假 API、随机数据冒充真实数据、空函数返回成功、用 TODO 占位后勾选完成。允许测试替身，但只能在测试环境使用；正式 adapter 未就绪必须返回 `UNSUPPORTED` 或明确失败。

### 0.2 进度与范围

本文的 F-01～F-35 是 **35 个交付能力组**，不是“老脚本恰好有 35 个函数”的统计。组内子能力不能因合并计数而遗漏。L3-01～L3-12 是历史子面板编号，不等于全部 UI 数量；R-01～R-08 是本文归一化后的路由类别，不等于源码只有八条分支。

发现基线之外仍有活跃能力时，先加入 `docs/next/TRACEABILITY.md` 的候选项；核实后分配扩展编号，不为凑齐 35 而舍弃。历史确认淘汰项：腾讯云 IM 车队、第三方彩虹屁、假礼物伪造与硬编码“幻神”兜底，不得复活。

<a id="evidence"></a>
## 1. 证据与已纠正事实

### 1.1 信息优先级

- 用户明确要求决定功能范围和安全边界。
- 冻结版本源码与可复现的脱敏测试决定“当前实现事实”；真实平台验证决定“当前接口可用性”。
- [功能映射白皮书](LEGACY_CODE_FEATURE_MAPPING.md) 提供功能意图与隐式交互清单。
- [审计报告](AUDIT_REPORT_NEXT.md) 提供查找线索，不保证每个 URL、行号、键名仍准确。
- [维护指南](MAINTENANCE.md) 仅作历史补充，不执行其中的发布命令。
- 本文决定 NEXT 的新结构与接口。若上述来源冲突，记录冲突，不默默选一个数字。

证据标签必须附在接口/能力台账上：

| 标签 | 定义 | 可以作出的结论 |
|---|---|---|
| A | 已阅读冻结源码的相关完整调用链，保存路径、符号、必要上下文和脱敏夹具 | 证明基线实现如何工作，不证明线上仍可用 |
| B | 仅文档记载，或找到调用但输入/输出/权限尚不完整 | 可以保留需求，必须先取证再写正式 adapter |
| C | 新设计或平台能力假设 | 先做最小实验，失败则记录阻塞/降级 |

独立记录 `liveVerified`、环境版本和日期。不得把 A 自动等同线上通过。

### 1.2 本轮已核对的纠错清单

| 问题 | 核对结果与施工约束 |
|---|---|
| three.js 被判为无调用 | `02_dom_ui.js` 的 `ex-panorama` 入口与 `05_services.js` 的 `THREE.*` 调用仍存在；不得直接移除，全景能力纳入 F-09 |
| 背包 v1 被当现行接口 | `05_services.js` 的 `pt` 与背包读取实际使用 `/japi/prop/backpack/web/v5`；审计 v1 仅保留冲突记录 |
| 钓鱼只有名称没有 URL | 映射 §5.5 和源码 `rt/ct` 附近可找到 `homePage/reelIn`，提竿有 `ctn` 和 `rid`；仍须完整核实字段与状态机 |
| 24 小时更新频率 | 源码 `Ex_LastUpdateCheckTime` 使用 12 小时；NEXT 沿用 12 小时，不无故改成 24 小时 |
| 12 条 @match | `src/meta.js` 实际有 18 条 @match；正则概述不能替代元数据原文 |
| 44 个 ExSave + 2 个 GM 是完整字典 | 本轮对 src 的字面量扫描得到 38 个不同 `ExSave_*`，含可能废弃项；GM 还存在 `Ex_accountList`、更新相关键等。字面量扫描也不覆盖动态键，不能据此宣称完整 |
| 32px / 400ms 都是生产值 | 400ms 在 `scheduleSubPanelClose` 可定位；32px 是历史设计规范，不能称已核实的当前 CSS 值 |
| vm.Script 是 AST 审计 | 它是编译级语法检查，不检查类型、业务、权限、泄漏，也不能证明依赖正确 |

纯 JS + Node 内置模块是本次选型，不是因为 Rollup 无法生成 userscript。JSDoc 是契约说明，不冒充静态类型检查。CSS 放 `tokens.js` 是减少资源编译路径的设计选择，并非 CSS 与 JS 工程不兼容。

<a id="build"></a>
## 2. 工程与构建契约

### 2.1 目标目录

以下是未来目录，未创建前不得声称存在。各业务组的精确文件名见 F 矩阵。

```text
src/
  meta.js
  runtime/namespace.js, scope.js, events.js, orchestrator.js
  core/quality.js, rank_engine.js, p2p_blocker.js
  platform/credentials.js, transport.js, page_bridge.js, capabilities.js
  adapters/room.js, chat.js, player.js, selectors.js
  api/client.js, room.js, user.js, backpack.js, routine.js,
      danmaku.js, media.js, radar.js, passport.js
  store/index.js, schema.js, storage.js, migrator.js
  ui/tokens.js, icons.js, miuix.js, dock.js, gift_picker.js
  router/index.js, handlers.js
  modules/economy/...
  modules/danmaku/...
  modules/media/...
  modules/vod/...
  modules/radar/...
  modules/passport/...
  modules/system/...
  main.js
build/next-manifest.json
tests/unit/, tests/integration/, tests/fixtures/
docs/next/BASELINE.md, TRACEABILITY.md, API_CONTRACTS.md,
          STORAGE_MAPPING.md, DEPENDENCIES.md, PROGRESS.md
artifacts/next/evidence/
```

经济领域含原 routine，媒体播放器与 vod 导出分开；账号从 radar 拆出为 passport；公共资源与生命周期归 runtime/platform/adapters。本文取代先前四/五切片混杂的目录方案。

### 2.2 拼接与命名空间

- `namespace.js` 是唯一初始化沙箱命名空间 `globalThis.DYEXRL_NEXT` 的文件。其余文件由 IIFE 包裹，注册模块，不泄露裸顶层变量，不使用 `import/export`。
- Registry 统一接口：`register(id, dependencies, factory)`、`resolve(id)`。工厂接收按 dependencies 顺序解析的模块；每个模块实例化一次；重名、循环、缺失依赖立即抛错。测试明确覆盖三种失败。
- 模块 ID 使用点号，例如 `api.backpack`、`modules.economy.backpack`；文件名不能充当隐式依赖。禁止两个文件互相调用尚未注册的全局函数。
- manifest 精确列出全部文件，不使用业务目录通配符来猜拓扑。未列入清单的旧文件不进入 NEXT 包。检查清单重复/缺失、依赖环、入口唯一和元数据位置。
- 顺序：元数据、namespace、同步 core 安装文件、其他模块注册文件、main。共享文件顺序由声明依赖验证；异步就绪不是文件顺序能解决的，交给 orchestrator。
- `tokens.js` 在 IIFE 内保存静态 CSS 字符串，以 `style.textContent` 注入；`head` 不存在时在安全挂载点出现后安装，不能阻塞 core。样式只注入一次，每个 Document 独立管理。
- 保留 `new vm.Script(finalCode)`。不要用正则同名变量扫描声称完成作用域分析；局部同名合法。用模块隔离、registry 测试和整包编译检查处理冲突。
- 所有输入检查和整包编译通过后才写临时文件并替换目标；失败非零退出，原成功产物保持不变。相同输入两次构建字节相同，不注入当前时间戳。

### 2.3 构建隔离

Phase 0 为 `build.js` 增加 NEXT 模式：`node build.js --next`，输出 `artifacts/next/DouyuEx_RL_NEXT.user.js`；原 `node build.js` 暂保留旧模式。NEXT 元数据采用独立 name/namespace，移除指向生产自动更新渠道的 update/download URL；不得更改线上身份。测试时禁止同时启用旧包和 NEXT 包。

本计划不要求立刻覆盖根目录 `DouyuEx_RL.user.js`。根产物切换、退休旧源码和发布另设经授权的门禁。每次 NEXT 代码改动运行 `node build.js --next`；仅改 Markdown 不运行构建生成用户脚本。

<a id="contracts"></a>
## 3. 运行时接口契约

### 3.1 上下文、启动和销毁

1. core 在 document-start 同步安装，不能等网络、Store 全量 hydration、DOM 或 CDN。油猴 @require 本身可能延迟执行，必须记录首流时序测试，不能仅凭元数据保证抢先。
2. core 读取最小本地开关快照：先读新版有效开关，再按已核实解析器回退旧值，最后取冻结默认值；不写回斗鱼其他偏好以外的数据。不得等待异步凭据。
3. main 实例化 platform、Store、migrator；迁移成功或安全降级后标记 `config.ready`；readyState 已非 loading 时直接开始，否则仅监听一次 DOMContentLoaded，不再切换 @run-at。
4. router 判定页面角色；bridge/adapter 就绪后发出 room/player/chat 事件；只启用该角色需要的模块。身份失效先关闭写操作，其他只读能力可继续。
5. SPA 导航监听 history push/replace 和 popstate，包装前保留原函数，禁止盲查 URL。房间 ID 相同不重复初始化；换房先销毁旧 roomScope，再创建新代次。
6. 每次换房、账号变化递增 `generation`。所有异步回包更新状态前检查 generation 与 signal；旧房回包一律丢弃。

主世界与 userscript 沙箱不保证共享 globalThis。core 的主世界钩子保留既有必要注入方式，凭据与特权函数留在沙箱。bridge 仅传白名单房间/弹幕/播放器数据，校验结构、来源、来源窗口和代次；不向页面暴露 Cookie 或通用 GM 请求代理。同页面脚本可观察页面消息，因此 nonce 不是防恶意宿主页的秘密凭证，任何页面消息不得直接授权资产/账号操作。

### 3.2 Scope 与 Feature

```javascript
createScope({ signal, generation })
// 返回 { signal, add(dispose), timeout(fn, ms), destroy() }
createFeature(context)
// 返回 { init(), enable(), disable(), destroy() }
```

`init` 只做依赖绑定，不执行真实写请求；enable 幂等；disable 取消活动任务；destroy 幂等并撤销订阅和视图。事件监听、Observer、timer、animationFrame、worker、objectURL、FLV/THREE 实例、子窗引用均登记到 scope。关闭窗口也必须触发销毁。恢复 hook 时仅在当前函数仍为自己安装版本时回退，不能覆盖其他脚本后装的 hook。

禁止无界 DOM 探测轮询；允许可取消的业务定时任务。探测 Observer 限定容器，初次发现后断开；播放器替换由单独生命周期 Observer 负责，不能误将所有观察一次销毁。后台只暂停可视采样/动画；用户明确启用的钓鱼等挂机任务不因 hidden 一律停止。标签恢复或系统睡眠后先重新校准服务端状态，不补发积压任务。

### 3.3 Store 与事件

```javascript
createStore(initialState)
// get(path) -> immutable snapshot
// set(path, value) -> void
// patch(path, partialObject) -> void
// subscribe(path, listener) -> unsubscribe
// destroy() -> void
```

- patch 为浅合并；数组整体替换；拒绝 `__proto__`、`prototype`、`constructor` 路径；set 按 schema 验证；同值不通知；subscriber 异常隔离。
- Store 不反向依赖 UI。API 不读取 Store，全部接收显式 rid/uid/signal。client 仅使用独立 credential adapter，不依赖 Store 或 core。数据拉取由 orchestrator/feature 调用 API 再写 Store；迁移不得联网。
- 状态根：`config`（有版本持久化）、`room:{rid,anchorName,live,generation}`、`user:{uid,loggedIn,badgeName}`、`backpack:{items,updatedAt,status}`、`runtime:{capabilities,featureStatus}`。Cookie 不进 Store。
- ID 统一用经过校验的数字字符串，避免超过安全整数；日期内部毫秒；接口秒值在 adapter 边界转换；金额/礼物数量使用已核实最小单位与整数，不用浮点估算资产。
- events：`room.changed:{previousRid,rid,generation}`、`auth.changed:{uid,loggedIn}`、`player.changed:{available,generation}`、`chat.received:{rid,messageId,uid,text,timestamp,kind,generation}`、`feature.failed:{id,code,recoverable}`。DOM 节点不进持久状态；节点只经 adapter 访问。
- 配置防抖写入 300ms；销毁前显式 flush。高频弹幕、视频帧、token 不持久化。binder 属于 UI 绑定层，`bindInput(element,store,path)` / `bindCheckbox` / `bindSlider` 返回 unsubscribe；Store 更新控件与控件提交 Store 不形成循环。

### 3.4 API client

```javascript
client.request({ endpointId, params, body, signal, generation })
// Promise<{ data, receivedAt }>
// reject: { code, message, endpointId, retryable, outcomeUnknown }
```

- endpointId 指向契约字典中的 URL 模板、方法、host 白名单、认证字段、序列化和响应校验，不接受业务随意传入任意 URL。
- 仅按端点契约注入 ccn/ctn/csrf/设备标识；不得所有请求统一散发全部凭据。禁止复制旧 `mode:'no-cors'` 后期待读取跨域 JSON。
- 同源优先 fetch；跨域需要时用授权 GM transport，禁止无限切换通道重试。timeout 默认 15 秒；signal 可取消传输及排队；结果同时检查 HTTP 与业务错误码。
- 默认每账号最多两个并行只读请求，一个串行写队列；同账号写请求初始间隔至少 1000ms，端点要求更长时取更长。平台拒绝时不加速、不换账号规避限制。
- 只读且确认幂等请求最多额外重试两次，退避 1s/2s，加 0～250ms 抖动；尊重 Retry-After。401/403 不自动重试；429 暂停相应队列，通知用户。
- 送礼、领取、关注、提竿等非幂等操作不自动重试。超时为 `outcomeUnknown`，先只读查状态；无法确认则暂停待人工，不重复扣资产。
- 统一错误码：`AUTH_REQUIRED`、`RATE_LIMITED`、`NETWORK`、`TIMEOUT`、`ABORTED`、`CONTRACT_MISMATCH`、`CAPTCHA_REQUIRED`、`UNSUPPORTED`。用户取消不显示错误风暴。

<a id="ui"></a>
## 4. MIUIX 视觉与交互契约

### 4.1 固定 NEXT 设计值

这些是 NEXT 目标，不虚称全部来自生产 CSS。标准面板 380×370px；礼物选择器 540×410px。小视口按 viewport 减 16px 留边缩小，内容可滚动，不溢出屏幕。品牌蓝 #0066FF，圆角 22px，面板 blur(36px) saturate(220%)，Header blur(28px)，滚动条 4px；backdrop-filter 不支持时用高不透明背景降级。

面板采用 flex column、padding:0、overflow:hidden；Header 不收缩；Body `min-height:0; overflow:auto`。关闭按钮拥有独立点击热区，不被标题/透明桥覆盖。Dock 一级入口位置与基线一致，按钮顺序从实际 DOCK_DEFS 冻结，不凑十个图标或添加“占位功能”。

NEXT 隐形桥设 32px，关闭延迟 400ms，指示胶囊 16×3px；它们集中为 tokens，不允许同时存在 180/250/400ms 三套规则。历史 250ms 非当前执行值。二级 Dock 保持展开；该 timer 仅关闭子面板。移入按钮/面板取消 timer。桥不能覆盖相邻按钮或拦截关闭按钮。参数若实测需要改，先更新本文与测试，不在业务里另写常量。

### 4.2 工厂接口

所有新增 UI 通过 MIUIX；宿主 DOM 查找/监听属于 adapter，可直接访问但不能自行造一套面板。CSS、SVG path、ASS 序列化字符串允许；禁止业务 `innerHTML`、内联 onclick、拼接用户输入 markup。

```javascript
MIUIX.Panel({ id, title, width: 380, height: 370, body: [] })
MIUIX.Card({ title, subtitle, items: [] })
MIUIX.Accordion({ id, title, actions: [], content: [], group })
MIUIX.Switch({ id, label, storeKey, store })
MIUIX.InputRow({ id, label, storeKey, store, validate })
MIUIX.SelectRow({ id, label, storeKey, store, options: [] })
MIUIX.Slider({ id, label, storeKey, store, min, max, step })
MIUIX.Dialog({ mode: 'confirm', title, message, initialValue: '' })
MIUIX.Toast({ message, type: 'info', durationMs: 3000 })
```

普通组件返回 `{element,destroy}`；body/items/content 接受组件句柄或纯文本，禁止 HTML 字符串。Select options 为 `{value,label}`；Accordion actions 为 `{label,onClick}`。Switch 绑定模式不同时接受 checked/onChange 第二真源。Dialog 返回 `{element,result,destroy}`，result 为 Promise `{confirmed,value}`；取消、Escape、destroy 均 settle，不挂起 Promise。真正阻断对话框使用焦点限制，关闭恢复触发点；Dock 非模态浮层不滥用焦点限制。子窗组件接收目标 Document，不能使用主窗全局 document 偷挂节点。

新增 loading/empty/error/disabled/success 状态必须真实反映请求。按钮键盘可达，原生 checkbox/select 优先；支持 Escape、回车、可见焦点、减少动画偏好。导入规则先验证 schema/长度，预览后替换；导出不含凭据。

<a id="phases"></a>
## 5. 分阶段任务包

所有任务包完成前都更新 TRACEABILITY 和 PROGRESS。依赖未通过不得生成依赖它的整批业务。一次会话只处理一个包；过大则拆成编号子包。定义完成不等于创建文件。

| 任务包 | 前置 | 必读与产出 | 必须通过后才继续 |
|---|---|---|---|
| P0.1 基线冻结 | 无 | git 状态/分支；meta、build、release、router；BASELINE 记录 commit、源码哈希、符号位置、环境；初始化 F/L3/R 台账 | 不覆盖用户改动；18 条匹配和完整路由用例入表；禁发版规则入报告 |
| P0.2 协议/存储/依赖取证 | P0.1 | 逐项读调用链，填写 API_CONTRACTS/STORAGE_MAPPING/DEPENDENCIES，脱敏夹具 | 当前待实现任务的契约无未知必需字段；未决项有阻塞编号；不是凭关键词搜到就算验证 |
| P0.3 NEXT 构建与测试架 | P0.1 | manifest、build --next、node:test 最小测试、独立元数据 | 确定性构建；缺文件/重复/语法错误失败且保留旧产物；根生产包不变 |
| P1.1 core 与主世界边界 | P0.2/P0.3 | core 三件、最小 bootstrap、page_bridge、capabilities | STT 双重转义/坏包/分帧；12 秒窗口；hook 双装；禁用透明行为；主/沙箱实测 |
| P1.2 Store/迁移/Scope | P0.2/P0.3 | runtime、schema、storage、migrator | 订阅取消、损坏数据、幂等重跑、账号隔离、资源销毁测试 |
| P1.3 Client/Router/Adapters | P1.1/P1.2 | transport/client、router、room/chat/player adapter、orchestrator | 非幂等超时不重发；切房旧回包丢弃；路由优先级；未登录不启动写任务 |
| P2 MIUIX 全套 | P1.2/P1.3 | tokens/icons/miuix/dock、组件演示夹具、gift_picker 壳 | 32px/400ms 交互、尺寸、键盘、嵌套关闭、PiP Document 清理；不得假装业务完成 |
| P3.A 经济 | P2 + 对应 API 取证 | F-20～F-24，先查询选择器，再赠送/续牌，再签到/钓鱼 | T-F-20～24；每一子项成功/失败/取消；真实写测试单独授权 |
| P3.B 弹幕 | P2 + chat adapter | F-12～F-19、F-32；先本地展示/计数，再发送/管理 | 单条消息只处理一次；CD/白名单/回环保护；所有规则导入导出 |
| P3.C 媒体 | P2 + player adapter | F-04～F-11、F-31；按单个播放器能力交付 | 子窗恢复、流释放、录制上限、导出正确、用户原设置恢复 |
| P3.D 雷达/账号/站点 | P2 + 对应契约 | F-25～F-29、F-33、F-35 | 未知数据不伪造；消息来源验证；账号切换失败恢复；站点普通页不误入管道 |
| P3.E 系统 | P2 | F-30、F-34 与所有设置入口 | 重置范围白名单；12h 更新状态；广告/夜间不污染宿主；性能不可测显示 N/A |
| P4 回归与交付 | 全部前置 | 全 F/L3/R 验收、兼容、4h 测量、未决清单 | 单元/集成/GUI 分开出证据；无凭据泄露；阻塞不能计完成；不发布 |

每个实现包结束运行 `node --test tests/unit/*.test.js tests/integration/*.test.js` 和 `node build.js --next`（由 P0.3 创建这些路径/命令）。先修当前包失败，再进入后续。浏览器测试缺访问/权限时标 `blocked`，不能以 Node 通过代替。

<a id="features"></a>
## 6. 功能追踪矩阵

### 6.1 编号与归属

以下来源 M 指功能映射白皮书章节；A 指审计报告章节。**默认来源证据 B**，除 §1.2 已明确核对的局部事实外，不声称完整链路 A。状态初始全部 planned。

状态键使用 `config.<领域>.<能力>` 存配置，实时数据留对应 runtime slice；以下简写省略 config 前缀。API 栏 `local` 不代表可以省略宿主 DOM/bridge 取证。风险 H 为账号/资产/协议/敏感数据，M 为外部接口或媒体，L 为本地展示。

| ID | 必须保留的能力及来源 | 新文件（src/ 下） | API / 状态 / 入口与路由 | 风险 |
|---|---|---|---|---|
| F-01 | 最高画质、预载与12秒保护；M1.1 | core/quality.js | A-01/02；core.quality；设置，R-01/02 | H |
| F-02 | 日周月总榜贡献值与 STT；M1.2 | core/rank_engine.js | WS；core.rank；原榜单，R-01 | H |
| F-03 | P2P 上传阻断；M1.3 | core/p2p_blocker.js | local；core.p2p；设置，R-01/02 | H |
| F-04 | 增强 PiP、弹幕、小窗发言；M2.1 | modules/media/pip.js | chat adapter；media.pip；悬浮条，R-01 | M |
| F-05 | 多房联播、直链/iframe、拖拽缩放/独立音量；M2.2 | modules/media/multi_room.js | A-02；media.multiRoom；Dock，R-01/02 | M |
| F-06 | 色彩、预设、旋转缩放、影院；M2.3 | modules/media/filters.js | local；media.filters；L3-11，R-01/03 | L |
| F-07 | 滚轮音量与百分比提示；M2.4 | modules/media/volume.js | local；media.volume；播放器，R-01/03 | L |
| F-08 | 后台静音/暂停和恢复；M2.5 | modules/media/background_saver.js | local；media.background；设置，R-01 | L |
| F-09 | 全景播放器；源码 ex-panorama/THREE | modules/media/panorama.js | THREE；media.panorama；原入口，R-01 | M |
| F-10 | PNG、长按 GIF、隐藏相机与命名；M3.1 | modules/media/recorder.js | GIF/worker；media.recorder；相机，R-01/03 | M |
| F-11 | ASS、XLSX、时间校准/回看/投稿/鱼吧/复制源；M3.2～3.3 | modules/vod/exporter.js, helper.js | B-VOD；vod；录播工具，R-03 | M |
| F-12 | 尾巴前后缀、多模板与两种发送路径；M4.1 | modules/danmaku/tail.js | chat adapter；danmaku.tail；尾巴入口，R-01 | M |
| F-13 | 本地收藏、搜索、点击填入；M4.2 | modules/danmaku/collect.js | local；danmaku.collect；聊天工具，R-01 | L |
| F-14 | 关键词回复/CD/规则增删导入导出；M4.3 | modules/danmaku/auto_reply.js | B-CHAT；danmaku.reply；L3-05，R-01 | H |
| F-15 | 弹幕时速、活跃发言者、真实人数/已播时长；M4.4、维护指南 | modules/danmaku/velocity.js | B-AUDIENCE；danmaku.velocity；monitor，R-01 | M |
| F-16 | 重复/进场/大图/背景/字体净化；M4.5 | modules/danmaku/filter.js | local；danmaku.filter；设置，R-01 | L |
| F-17 | 欢迎与谢礼物、等级/房间范围、规则交换；M4.6 | modules/danmaku/greeter.js | B-CHAT；danmaku.greeter；L3-02/04，R-01 | H |
| F-18 | 关键词/快捷禁言、时长/名单；M4.7 | modules/danmaku/mute.js | B-MUTE；danmaku.mute；L3-03，R-01 | H |
| F-19 | 查弹幕、+1、作者禁言/回复/欢迎/复制昵称UID；M4.8～4.9 | modules/danmaku/search.js, interaction.js | B-SEARCH/CHAT；danmaku.interaction；聊天区，R-01 | H |
| F-20 | 礼物选择器、双来源/背包/搜索/去重回填；M5.1 | ui/gift_picker.js | A-01/12、B-GIFTS；economy.picker；L3-07/08，R-01 | M |
| F-21 | 跨房送礼/背包/数量/期限/延迟；M5.2、L3-07/08 | modules/economy/backpack.js | A-12/13、B-SEND；economy.backpack；extool，R-01 | H |
| F-22 | 真实牌子与续牌分配；M5.3 | modules/economy/fans_continue.js | A-11/12/13；economy.fans；Dock，R-01 | H |
| F-23 | 五项签到完整链路；M5.4 | modules/economy/sign_engine.js | A-03～11、B-SIGN；economy.sign；Dock，R-01 | H |
| F-24 | 常驻/比赛钓鱼、鱼饵/倒计时/提竿/收益；M5.5 | modules/economy/autofish.js | B-FISH；economy.fish；extool，R-01 | H |
| F-25 | 全站抽奖列表/跳转/通知过滤；M6.1 | modules/radar/lottery.js | B-LOTTERY；radar.lottery；Dock，R-01 | M |
| F-26 | 本房宝箱/红包/延迟/人工验证；A6.8 | modules/radar/treasure.js | B-TREASURE；radar.treasure；L3-09，R-01 | H |
| F-27 | 主播硬件字段；M6.2 | modules/radar/hardware.js | B-HARDWARE；radar.hardware；原入口，R-01 | M |
| F-28 | 铁粉300天/贵族钻粉到期；M6.3、7.3 | modules/radar/badges.js | A-11、B-VIP；radar.badges；背包/勋章，R-01/06 | M |
| F-29 | 头像账号列表/备份/切换/删除；M7.1 | modules/passport/account_switcher.js | passport adapter；passport；导航，R-01/05/07 | H |
| F-30 | 更新多态通知/版本比较/收到状态；M6.4 | modules/system/updater.js | B-UPDATE；system.update；Dock，R-01 | M |
| F-31 | 播放器性能看板；L3-10 | modules/system/perf_monitor.js | performance API；runtime.perf；extool，R-01 | L |
| F-32 | 投票与独立结果看板、Bloop随机顺序；L3-01/06 | modules/danmaku/vote.js, bloop.js | B-CHAT；danmaku.vote/bloop；livetool/Dock，R-01 | H |
| F-33 | 鱼吧普通增强/恢复入口与公开内容兼容；M7.3、router | modules/passport/yuba.js | B-YUBA；passport.yuba；鱼吧，R-04 | M |
| F-34 | 重置/缓存/菜单、夜间/广告/简化/全屏/其他配置；维护指南、setup/styles | modules/system/settings.js, reset.js | local；system.settings；菜单/Dock，R-01/03 | H |
| F-35 | 微光增强开关/强度/说明；L3-12 | modules/media/enhance.js | C-ENHANCE；media.enhance；悬浮条，R-01 | M |

### 6.2 各组最低验收用例（T-F 同号）

每行是 Given / When / Then 的最低用例，额外统一执行 §11 失败/销毁用例。多子能力分 T-F-xx.a/b，不能只测其中一项。

| 测试 | Given / When / Then |
|---|---|
| T-F-01 | 开启/关闭两套回包夹具；0秒与12秒后请求；窗口内仅目标画质字段改变，窗口后手动选择不被覆盖 |
| T-F-02 | 含 @A/@S、坏包、分帧与四榜夹具；解析/换房；值正确且旧房条目不串入新房 |
| T-F-03 | 启用及禁用阻断；播放器启动；目标 P2P 路径受控、播放保留、无未处理 rejection，不破坏无关媒体能力 |
| T-F-04 | 正在播放；开PiP/输入/关闭；发送走同一 adapter 一次，视频回原位，子窗资源归零 |
| T-F-05 | 两房；开窗调音拖拽关闭其中一房；另一房不受影响，关闭流实例销毁 |
| T-F-06 | 默认画面；修改/切预设/重置；CSS与数值对应，无累加变换 |
| T-F-07 | 音量0和1；向外滚轮；仍在[0,1]，只在播放器区域阻止页面滚动，300ms合并持久化 |
| T-F-08 | 用户已暂停或静音；隐藏再恢复；不擅自播放/取消用户静音，PiP/录制例外正确 |
| T-F-09 | THREE可用及不可用；开关全景；可用时画面响应，不可用提示，退出释放纹理/renderer/动画 |
| T-F-10 | 可采样视频与跨域污染视频；单击/长按/取消；PNG/GIF可打开、命名正确，污染提示而非下载空文件 |
| T-F-11 | 固定弹幕时间轴；导出和跳转；ASS轨道/转义正确，XLSX有真实单元格，绝对时间及所有快捷链接正确 |
| T-F-12 | 中文输入法组合输入与普通输入；回车/按钮；不误发组合文本、不重复加尾巴，长度限制明确 |
| T-F-13 | 大于20条收藏；导入/搜索/点击；无20条人为上限，点击只填入不擅自发送，配额失败保留旧数据 |
| T-F-14 | 同关键词密集到达；启用规则；CD内不重复、自己消息不回环、关闭立即停，规则坏JSON不覆盖 |
| T-F-15 | 可数消息和接口失败；统计窗口过期；本地速率精确，外部人数未知显示不可用，不以弹幕数伪称真实观众 |
| T-F-16 | 五类消息；分别开关；仅目标受影响，重复窗口过期释放记录 |
| T-F-17 | 多等级/多房/礼物事件；启用规则；范围/阈值生效，每条只发一次，导入导出等价 |
| T-F-18 | 有权限/无权限；禁言或查询；无权限不发写请求，时长单位正确，失败不显示已禁言 |
| T-F-19 | 有来源与不可用来源；查弹幕/+1/作者四操作；每项作用正确，敏感查询不自动外发，来源失败明确 |
| T-F-20 | 重复ID、缺图、单来源失败；选择；去重和来源标签正确，房间礼物与背包道具不串图/串ID |
| T-F-21 | 不足库存/超时/确认取消；执行；不会扣错数量或重发，UI先查证再更新资产 |
| T-F-22 | 原有牌子/零棒/多房；预览分配；总赠送不超过库存，不赠送无关房间，失败可定位 |
| T-F-23 | 五任务部分完成；运行/取消；跳过已完成项，逐项日志，星推只取关本次新关注且仍符合条件的目标 |
| T-F-24 | 无饵、进行中、到期、睡眠恢复；启用/提竿；一次在途，未知结果先查状态，不凭固定12点假定可领取 |
| T-F-25 | 多活动与重复广播；刷新/通知；不重复提醒，跳转真实房间，活动失败不显示空成功 |
| T-F-26 | 倒计时/验证码/未到期拒绝；领取；暂停等待人工，不持续抢请求或绕验证码，取消后不恢复 |
| T-F-27 | 缺CPU/GPU字段；展示；缺项标未知，不能从码率推测或捏造硬件 |
| T-F-28 | 299/300/301天和过期；计算；边界300天起高亮，秒/毫秒转换有夹具，过期明确 |
| T-F-29 | 备份/无Cookie/错误回调/切换失败；操作；不挂死、不删无关Cookie，验证目标UID后才报成功 |
| T-F-30 | 新版/最新/离线/12h缓存；检查/收到；版本分段数值比较正确，更新按钮多态且失败不当最新 |
| T-F-31 | 不支持堆指标环境；开关面板；显示N/A而非伪造GC，关闭后停止采样 |
| T-F-32 | 投票重复UID/超时、Bloop空列表/随机；开始/停止；结果统计准确，停止后不再发送 |
| T-F-33 | 普通鱼吧、exRestore、服务端拒绝；进入；角色正确，拒绝提示，不绕服务端访问权限 |
| T-F-34 | 有配置/账号备份/无关键；分别重置；只删白名单目标，账号与迁移不被误删，样式不破坏宿主页 |
| T-F-35 | 无公开超分控制能力；开关；仅实际实现的滤镜效果生效，不声称已启用浏览器/显卡原生超分 |

F-23 五项必须逐项实现：房间/粉丝牌、客户端礼盒、鱼吧打卡/补签、星推、粉丝家园/钻粉。星推历史积分 +10/+9/+5/+15 和 1.8s 仅是基线行为线索，当前规则以响应验证为准，不硬编码奖励结论；不得取关用户本来关注的主播。

F-24 比赛历史时段 12:00～12:30、00:00～00:30 只作配置候选；确认平台时区和活动数据。服务器 deadline 驱动一次性任务，响应后再调度，不并发抛竿/提竿；自动买饵涉及资产，单独授权，不因“有饵循环”推导自动购买。

F-10 建议初始录制上限10秒、10fps、最长边720px；达到上限停止采样再编码，取消终止worker。它们是安全默认值，可配置但必须有上限，不冒称基线规格。OffscreenCanvas 非必需，允许普通 Canvas+worker 降级。

<a id="routes"></a>
## 7. 子面板与路由矩阵

### 7.1 子面板：所有行必须独立验证

| ID | 基线标识 | 所属能力 | 必须验证的隐藏交互 |
|---|---|---|---|
| L3-01 | vote__panel / vote__result | F-32 | 主题选择/增删、选项、限时、重复投票、独立结果看板 |
| L3-02 | enter__panel | F-17 | 等级/欢迎词/房间范围、增删与导入导出 |
| L3-03 | mute__panel | F-18 | 关键词、1/3/7/30天、名单查询、导入导出 |
| L3-04 | gift__panel | F-17 | 礼物/感谢模板、范围、增删导入导出 |
| L3-05 | reply__panel | F-14 | 关键词、文本、CD、增删导入导出 |
| L3-06 | bloop | F-32 | 多行词库、间隔、随机/顺序、快捷短语、停止 |
| L3-07 | extool__sendgift | F-20/21 | 在播礼物/数量/延迟/房间、选择器回填 |
| L3-08 | extool__clearbag | F-20/21 | 背包资产/有效期/数量、选择器回填 |
| L3-09 | extool__redpacket_room + extool__treasure | F-26 | 两个开关独立生效，延迟、验证码暂停 |
| L3-10 | extool__player_perf | F-31 | 指标/不可用/关闭停采样 |
| L3-11 | filter__panel | F-06 | 三滑块、预设、抽屉关闭 |
| L3-12 | enhance-modal__panel | F-35 | 开关、强度、真实能力说明 |

这些基线 DOM 名用于溯源，不强迫 NEXT 使用相同 ID。若改名，在 TRACEABILITY 映射新 test-id；不得因此搬动用户入口或丢掉手风琴操作。

### 7.2 路由归一化与优先级

来源：`src/modules/06_router.js`。使用 URL / URLSearchParams / hash 解析，不复制 substring 误匹配与无条件 document.domain。域名精确白名单，多个标志冲突按下表优先级处理。

| ID | 类别与判定 | 初始化范围 | T-R 同号期望 |
|---|---|---|---|
| R-01 | 允许的普通数字房间、beta/topic，不是其他特殊角色 | roomScope、Dock、直播能力 | 主页面仅一次；数字字符串归一化；换房销毁 |
| R-02 | 直播站合法 exid=chun 且非 passport/msg | 纯净同屏播放器角色 | 不加载完整Dock/挂机，关闭释放 |
| R-03 | v.douyu.com 的可播放录播页，非 exClean | vod/player scope | shadowRoot 就绪/替换可恢复，其他视频页不误挂 |
| R-04 | yuba.douyu.com 普通页或 exRestore，非 exClean | yuba scope | exRestore 与普通页区分，权限拒绝停止 |
| R-05 | passport.douyu.com 且 exid=chun，cmd 白名单 | 受验证账号管道 | clean/switch/delete 各有完成/失败/超时，未知cmd拒绝 |
| R-06 | www.douyu.com/member/cp/getFansBadgeList | 勋章统计 | 不启动直播业务 |
| R-07 | msg/v/cz/yuba 的 exClean | 精确站点清理管道 | 四站各有用例，父窗来源验证，不清所有站点数据 |
| R-08 | msg 普通/遗留车队、cz 普通、template/h5、其他页面 | no-op/明确不支持 | 不复活Xn车队；不执行清理或直播逻辑 |

判定优先级：R-07 > R-05 > R-06 > R-04 > R-03 > R-02 > R-01 > R-08。对 hash 中遗留参数单独建 fixture；nonce/来源窗口/过期命令校验失败均不得执行。原消息字符串可以在封闭兼容层接收，但不能仅凭收到 `switchOver` 就认定账号切换成功。

<a id="api"></a>
## 8. API 取证台账

### 8.1 审计中的13条候选，不冒称已验证线上契约

A-xx 是追踪编号，不等于证据等级 A。下表保留审计原始名称供定位，默认证据 B；P0.2 必须对照源码和夹具纠正后才能启用。参数仅为历史线索，绝非可直接请求的完整协议。

| ID | 历史候选端点 / 方法 | 参数线索 | adapter / 消费者 |
|---|---|---|---|
| A-01 | /betard/{rid} GET | rid | api.room；F-01/20 |
| A-02 | /lapi/live/getH5Play/{rid} POST | rate/cdn/token；也核对V1变体 | api.room；F-01/05 |
| A-03 | /japi/carnival/nc/sign/webSign POST | uid | api.routine；F-23 |
| A-04 | yuba.douyu.com/wb/sign POST | group_id；核对wbapi变体 | api.routine；F-23 |
| A-05 | /japi/roomtask/task/sign POST | rid | api.routine；F-23 |
| A-06 | /japi/star_push/task/list GET | rid | api.routine；F-23 |
| A-07 | /japi/star_push/task/finish POST | task_id/rid | api.routine；F-23 |
| A-08 | /japi/star_push/introduce/list GET | page/pageSize | api.routine；F-23 |
| A-09 | /japi/roomtask/user/follow POST | rid/认证字段 | api.user；F-23 |
| A-10 | /japi/roomtask/user/unfollow POST | rid/认证字段 | api.user；F-23 |
| A-11 | /member/cp/getFansBadgeList GET | 登录态；可能返回HTML | api.user；F-22/28 |
| A-12 | /japi/prop/backpack/web/v1 GET（审计） | 源码实际v5?rid=，以取证修正 | api.backpack；F-20/21/22 |
| A-13 | /japi/prop/send/backpack/prop POST | propId/count/roomId须核对 | api.backpack；F-21/22 |

### 8.2 必须补全的协议组

| 追踪ID | 取证入口 | 消费模块与阻塞条件 |
|---|---|---|
| B-FISH | /japi/revenuenc/web/actfans/fishing/homePage GET、reelIn POST；M5.5和rt/ct | F-24；必须确认 baitNum/stat/fishEtMs、ctn、抛竿是否隐式及收益结构 |
| B-GIFTS | betard、open.douyucdn.cn/api/RoomApi/room/{rid}、loadLiveGiftsDualStream | F-20；房间/通用来源与道具ID分离 |
| B-SEND | Ut及跨房送礼调用链 | F-21；确认免费/付费路径，不拿背包ID冒充通用礼物ID |
| B-SIGN | executeSignEngine、fanshome/sign、dfansact/userSign、鱼吧supplement | F-23；五链路逐项请求/响应/查询状态取证 |
| B-CHAT / B-MUTE | 发送入口、回复/禁言调用链 | F-14/17/18/19/32；真实发送一次、权限和CD明确 |
| B-SEARCH / B-AUDIENCE | barragePanel__search、doseeing.com、real-audience | F-15/19；第三方可用性与隐私提示，不暗传查询 |
| B-VOD | getVideoUrl、弹幕分页/分片、getBindGroup | F-11；分页终止、时间单位、失败重试范围 |
| B-LOTTERY / B-TREASURE | exlottery、宝箱/红包状态与验证码路径 | F-25/26；来源协议、deadline、领取结果确认 |
| B-HARDWARE / B-VIP | getAnchorPCInfo、room-vip-expire-days | F-27/28；只展示实际返回字段 |
| B-UPDATE | createExUpdatePanel、Ex_LastUpdateCheckTime | F-30；确切更新URL、响应格式、版本多态 |
| B-YUBA | wn/_n/exClean调用链 | F-33、R-04/07；仅公开内容兼容，不绕权限 |
| C-ENHANCE | enhance-modal调用链与浏览器能力探针 | F-35；没有公共超分API时不得创造“开启成功” |

每个端点契约必须含：源码路径/符号/哈希、完整host/path/method、query/body类型、认证来源、成功/失败schema、时间/数量单位、HTTP与业务码、是否幂等、取消方式、脱敏夹具、liveVerified日期。缺必需字段即 blocked。不能用“13个接口齐了”代替以上组的覆盖。

<a id="migration"></a>
## 9. 存储与迁移契约

### 9.1 新存储与事务

- 新配置建议使用 GM key `DYEXRL_NEXT_CONFIG`：`{schemaVersion:1,revision,updatedAt,settings}`。账户备份独立 key `DYEXRL_NEXT_ACCOUNTS`，不可包含在一般配置导出。
- 同步 core 开关镜像使用当前 origin localStorage `DYEXRL_NEXT_CORE`，仅含三类开关和版本；统一 storage adapter 写入，防双真源。镜像丢失可回退旧值但不覆盖新主配置。
- GM 同脚本跨域与 localStorage 同源隔离不同，必须按 origin 收集 legacy 配置，不能在直播页宣称读到鱼吧/视频全部键。支持账号设置的 uid 命名空间，切号不继承上一账号自动化运行态。
- 不使用单个 `_migrated:true`。迁移版本、阶段、origin、成功键列表、冲突、校验结果分别记录。配置写临时key、回读校验、替换正式key、最后记完成；旧值保留到用户确认。
- 新版有效值优先；旧值冲突保留备份与选择依据；坏 JSON/配额失败不覆盖旧数据。无数据用 schema 默认；重跑幂等；部分失败只重试失败项。
- 拒绝原型污染路径；数值 finite、范围、字符串长度和数组上限检查。收藏不设20条上限，但有分页/配额提示，不许宣称真正无限存储。

### 9.2 本轮词法扫描清单与目标分组

这是38个字面量候选的起点，不是最终完整迁移字典。P0.2 必须逐键读写交叉验证，补动态拼接键与历史别名；每键记录格式、默认、origin、目标、转换器、测试、保留/退休理由。

| 目标 | 候选旧键（全部含 ExSave_ 前缀） |
|---|---|
| core | HighestVideoQuality、P2P |
| system.settings | FullScreen、Mode、Refresh、isRemoveMsgNotice |
| economy | AutoFish、FansContinue、SignConfig |
| danmaku.tail/collect/bloop/vote | DanmakuTail、DanmakuCollect、BarrageLoopOptions、Vote |
| danmaku.greeter | Enter、isEnter、LastEnterWord、Gift、isGift |
| danmaku.mute/reply | Mute、isMute、Reply、ReplyCd、isReply |
| danmaku.filter | isEnlargeDanmaku、isRemoveDanmakuBackground、isRemoveDanmakuImage、isRemoveEnterBarrage、isRemoveRepeatedDanmaku、repeatedDanmakuSeconds |
| radar | Lottery、Treasure、RedPacket_Room |
| media | Camera_Hidden、PipSet、TabSwitch |
| 待核实额外能力 | MonthCost、MonthCost_SeeStatus（不因矩阵未单列就丢消费统计；核实后补F-34子项或扩展编号） |
| 退休候选 | GoldBadgeName（旧伪造名称不激活；保留备份与迁移说明） |

审计另记载 AutoSignConf、FavDanmaku、BloopList、PopupPlayer 等候选别名，不能未经查证替代 SignConfig/DanmakuCollect/BarrageLoopOptions。GM 至少核查 `Ex_accountList`、`Ex_accountListPassport`、`Ex_LastNotifiedVersion`、`Ex_LastUpdateCheckTime`、审计提到的 `Ex_VersionCache`，以及所有 GM get/set/delete/list 的动态键。斗鱼播放器自有偏好另列，不加入“重置插件”删除白名单。

### 9.3 重置不是清空全部

三个独立操作：重置插件设置、清理可再生缓存、删除用户选定账号备份。每项预览确切 key/账号范围并确认；仅删除所有权白名单。一般重置保留账号凭据、备份与迁移完成记录，防刷新后旧配置自动回灌；要恢复旧备份另设显式操作。不得 `GM_listValues` 后无差别删除，也不得删全站 Cookie。

<a id="safety"></a>
## 10. 安全、兼容与失败处理

### 10.1 操作授权

首次升级保存旧自动化配置，但高风险运行态暂停，提示用户重新启用；这是安全变化，不伪称完全无感。批量送礼/续牌/签到关注取关显示账号、目标、道具、数量、总量和预计操作，确认仅覆盖本次批次；持续挂机用明确房间白名单、预算/频率和停止按钮，不要求每次定时动作弹框。

取关只针对本轮新增关注且经状态验证未被用户改动的目标，禁止取消原关注。自动回复/禁言有权限验证、CD与回环防护。验证码暂停并等人工；风控拒绝停止，不以提前150～300ms高频抢请求作为验收目标。

Cookie 保存在脚本管理器存储也不等于加密保险箱；明确告知风险，不日志输出、不进截图/夹具/版本库。备份/注入字段按域/path/name白名单，不能导出通用 Cookie jar。切换前暂停所有账号任务；逐条GM回调检查、空数组结束、超时失败；验证目标UID后完成。失败在可行时恢复本次改动字段，否则指引正常登录，不谎报恢复成功。

### 10.2 依赖审计和加载

- 先锁定现有6个 @require 版本，升级单独提案。three.js 有全景消费者，不删除；svgaplayerweb 查超级火箭/动画消费者，未确认前保留。DOMPurify是否需要取决于可信渲染边界，不因禁用 innerHTML 就自动判死。
- `@connect` 对 GM 请求许可，不等同 @require 的加载许可。核对11个域名的实际请求、动态 loader、dead-code来源；doseeing 已有查弹幕/人数线索，不能称无用途。仅确认下线的 shadiao 可列移除；其他逐域证明后决定。
- 所有 `@match` 保留18条基线记录，路由层细分 no-op。不为方便增加通配全网权限。
- 全局 @require 加载失败可能让整个脚本不启动，“捕获库undefined”不能解决。P0.2 记录启动风险；若影响 core 时序，应将非核心库改为版本锁定的按需加载适配器，先做CSP/Worker/管理器兼容实验。失败隔离对应功能，不能擅自加载最新版或无限换CDN。

### 10.3 兼容矩阵（计划目标，不是已通过声明）

| 环境/能力 | 目标与检测 | 失败行为 |
|---|---|---|
| Chrome/Edge + Tampermonkey | 发布测试时的稳定版记录完整版本，各至少一组实测 | 未测环境标未测，不概括为兼容全部 |
| Chromium + Violentmonkey | 独立验证权限/沙箱/GM异步行为 | 缺权限能力禁用，不误用另一管理器API |
| documentPictureInPicture | 检测requestWindow与用户手势 | 可用时退原生视频PiP；明确降级后无小窗输入，失败仍保留主播放器 |
| GM_cookie | 实测list/set/delete回调与字段支持 | 停用账号切换，提示正常登录 |
| CSP/主世界/跨域iframe | 验证注入、来源、frame限制 | 隔离依赖能力，禁止无保护document.domain |
| Canvas/Worker/OffscreenCanvas | 检测采样、编码、worker资源可加载 | 普通Canvas降级或明确无法录制，不下载空GIF |
| 内存/GC信息 | 非标准performance.memory可选；GC无通用可靠信号 | N/A；不以堆下降断言GC发生 |
| 超分与硬件 | 只使用确实可访问的数据/API | 未知/不可用；CSS锐化不能标原生超分 |

### 10.4 失败处理表

| 信号 | 动作 | 恢复 |
|---|---|---|
| 登录失效/账号改变 | 中止写队列、清旧账户缓存/代次，保留配置 | 新身份验证后用户再启用 |
| 限流/验证码 | 暂停相应任务，不绕过、不自动重放写请求 | 到期只读核验或人工验证后恢复 |
| 网络超时/离线 | 幂等读有限重试；写标未知结果 | 查询状态，无法确认则人工 |
| schema不匹配 | adapter返回CONTRACT_MISMATCH，隔离功能 | 新夹具和契约修复后恢复 |
| DOM缺失/改版 | 局部有界观察，无反复错误弹窗 | player/chat.changed重挂；超时标不可用 |
| SPA/重复初始化 | generation隔离，scope销毁，安装幂等 | 只启动当前角色 |
| 迁移/存储失败 | 留旧值，不记完成；关闭依赖持久授权的任务 | 提供备份和重试，不静默丢配置 |
| CDN/媒体/编码失败 | 关闭对应能力，释放对象/worker/流 | 显式重试，不拖垮core |

<a id="tests"></a>
## 11. 测试与验收门禁

### 11.1 三层证据

1. Node 原生 node:test：registry、Store、迁移、URL分类、STT、版本比较、时间/数量转换、客户端重试与取消。使用可控时钟和假传输，不靠真实等待。
2. 集成夹具：受控DOM/桥消息/回包，验证初始化、切房、销毁、异常。P0.3 明确夹具运行方式；Node没有真实DOM，不以假的document证明浏览器兼容。
3. 浏览器 GUI：在授权环境测试入口、嵌套面板、显示、键盘、子窗和真实播放。真实写操作需单独授权；没有授权只能报告mock通过/实测阻塞。

每个 T-F 都必须附带：正常、空、失败、取消/关闭、重复init、换房六类结果；适用性明确写N/A理由。执行记录包含 commit/包哈希、环境、步骤、期望、实际、截图或日志位置。证据不得含Cookie、token或未经允许的私密聊天内容。

### 11.2 可复现性能门禁

- 构建运行10次记录总时长及编译阶段P50/P95，Node版本/机器/包哈希固定；不承诺15ms。记录源码字节、未压缩产物、gzip产物和外部库大小，不靠挪到CDN伪称瘦身。
- 泄漏测试在受控空闲页面预热10分钟，20轮打开/关闭面板、5轮切房、3轮PiP/联播；资源登记数回到基线（允许常驻appScope），roomScope残留为0。保留Detached DOM分析，不凭WeakMap宣称无泄漏。
- 4小时挂机另做同房旧版对照，固定采样每分钟一次。堆指标可用时记录自然GC低水位、长任务、CPU、网络请求数；建议调查阈值为暖机后低水位增长超过max(10MiB,20%)，这是调查门槛而非平台保证。无法区分宿主噪声则标待分析，不凭单一斜率宣判。
- 可视性能面板默认每5秒采样一次，仅打开可见时运行。后台挂机按服务器deadline，不为刷新倒计时每秒发请求。
- 本轮文档交付不等于已完成上述长期测试；后续执行者不得编造4小时数据。

### 11.3 完成定义与阻塞

每个任务只有 planned / implementing / mock-tested / live-verified / blocked 五种状态。必须逐项勾选：真实实现、契约更新、测试通过、失败/销毁覆盖、UI入口存在、无非授权写操作、NEXT构建通过、对应证据路径。需要平台实测的能力停在mock-tested不能称完整交付。

最终完成需F/L3/R全覆盖或每个阻塞有用户认可的处置；缺源/平台停服不自动算裁剪批准。未解决缺陷列优先级与复现步骤。不删旧实现直到新能力覆盖、数据可回退且用户允许退休。

<a id="handoff"></a>
## 12. Gemini 接力协议

### 12.1 首轮指令（可直接复制）

> 你正在 D:\DouyuEx-RL 的 DYEXRL-NEXT 分支执行 docs/NEXT_IMPLEMENTATION_PLAN.md。先读本计划的执行边界、证据纠错与P0任务，只完成第一个未完成任务包。检查git状态，不覆盖用户修改，不运行release，不提交推送，不触碰main。老业务代码只能作为行为/协议参考，core例外范围按计划记录。接口不明先取证，不猜URL/字段，不用stub冒充完成。每个包落实测试和证据后更新docs/next/PROGRESS.md；缺真实账号授权则mock测试并报告阻塞，不能偷偷执行送礼/发言/取关/切Cookie。继续时从PROGRESS接力，不一次性重写全部功能。

### 12.2 每次会话固定流程

1. 读本文、PROGRESS、当前任务依赖；若PROGRESS不存在从P0.1开始。
2. 输出本次任务ID、涉及F/L3/R、允许修改文件、依据、预期测试。不要把未完成后续包一并实现。
3. 对当前必需接口完成取证；无法确认就记录blocker，同时可实现不依赖未知协议的纯逻辑，不伪造成功。
4. 实现最小纵向闭环并测试；缺依赖只补明确必需模块。禁止为了过测试删除断言或改弱验收条件。
5. 更新追踪表和进度：完成了什么、在哪、测了什么、未测什么、下一包前置是什么。
6. 检查git diff，确保只有授权范围改动；不自动commit/push。

### 12.3 PROGRESS / 包报告模板

```text
任务包：P?.?（状态）
基线commit / 当前产物SHA256：
涉及能力：F-xx / L3-xx / R-xx
已阅读的源码符号及契约：
修改文件：
命令与结果：命令、退出码、证据路径
浏览器环境与测试：步骤、期望、实际；没有实测就写未测
数据/权限：是否触发真实写操作；授权范围
未完成：精确到子能力，不写“基本完成”
阻塞：编号、缺失证据、影响范围、当前安全行为
下一任务：单个任务包及前置条件
```

**最终纪律：文件创建不是完成，语法通过不是功能正确，mock通过不是线上通过，按钮可点不是业务成功。以逐项证据交付，不以代码行数、功能口号或主观“100%”交付。**
<a id="service-scan-gap"></a>
## 14. 服务层二次扫描补全（05_services.js）

第二轮服务层扫描在 F-01～F-50 之外确认了以下可触达能力。它们不得被“合并进某个大功能”后遗忘；P0.2 必须为每项分配状态、API 契约、存储映射和测试编号。

| ID | 源码确认的能力 | 证据锚点 | 施工处理 |
|---|---|---|---|
| F-51 | 月度消费统计、明文/隐藏状态与礼物消费列表 | `05_services.js:576`；`ExSave_MonthCost*` | 独立纳入 `modules/system/month_cost.js`；核验分页、日期、隐私和导出；不得默认展示消费金额 |
| F-52 | 用户等级任务：详情、状态查询、奖励领取 | `05_services.js:546`；`userLevelDetail/getTaskStatus/getPrize` | 作为 F-23 独立子能力；领取是非幂等操作，状态先查、结果未知暂停 |
| F-53 | 房间卡任务信息 | `05_services.js:576`；`getCardTaskInfo` | 纳入 routine 取证；不能因与签到同页而假定同一接口或状态 |
| F-54 | 关注列表增强：过滤开播/未循环、最多10项、当前页/新页/长按同屏 | `05_services.js:530-546` | `modules/media/follow_list.js`；为加载方式、右键、长按、导航销毁单独验收 |
| F-55 | Pocket effective 互动有效信息 | `05_services.js:120`；`/japi/interact/cdn/pocket/effective` | 先确定 `data.list` 消费者和 UI；契约未明前标 B，不以真实人数代称 |
| F-56 | 弹幕 `[DouyuEx图片...]` Base36 图片协议与净化渲染 | `05_services.js:86` | F-16 增加 `danmaku/image_codec.js`；只生成白名单 CDN URL，DOMPurify 失败则纯文本 |
| F-57 | 录播高能弹幕进度条/100桶聚合 | `05_services.js:120-130` | F-11 增加 VOD heatmap；时间轴夹具、Shadow DOM重挂和销毁测试 |
| F-58 | 录播流下载/复制 m3u8 与多档清晰度选择 | `05_services.js:120-216`；`getStreamUrl` | F-11 单独验收真实 URL、下载取消、剪贴板权限和来源提示 |
| F-59 | 跨平台 Bilibili/Huya 流信息适配与斗鱼 V1/加密流接口 | `05_services.js:2471` | 候选能力，不默认保留；在 TRACEABILITY 标 `A(调用)/C(NEXT范围)`，先做权限/隐私/许可证评估；确认保留后再分配模块 |
| F-60 | Bloop 的随机间隔、颜色循环、停止时间和旧“舔狗”模式 | `05_services.js:86`；`ExSave_BarrageLoopOptions` | F-32 补齐 schema 和停止条件；第三方 shadiao 永久退休，替换为本地词库或明确 disabled |
| F-61 | `GM_openInTab`、通知、Toast、资源按需加载工具 | `05_services.js:1,50` | 纳入 platform/capabilities；权限缺失必须降级，不能在业务中直接假定 GM API 存在 |
| F-62 | 四站 clean iframe 编排：yuba/msg/v/cz | `05_services.js:74-84`、`06_router.js:1` | R-07 增加创建方、targetOrigin、nonce、超时、失败恢复；不能把子窗完成消息当作服务端成功 |

### 14.1 服务层的硬性取证补充

- 礼物赠送的真实端点是源码中的 `/japi/prop/donate/mainsite/v1`，红包领取是 `/japi/interactnc/web/propredpacket/grab_prp`；二者都属于非幂等写操作。旧代码中红包成功后的递归重试不得原样迁移。
- 直播间背包源码使用 `/japi/prop/backpack/web/v5?rid=`，通用礼物还来自 `betard` 与 `open.douyucdn.cn/api/RoomApi/room/{rid}`；房间礼物覆盖同 ID 通用礼物、按价值排序和免费道具图标回退都要进入 F-20 测试。
- 禁言调用链包含 `room/roomSetting/addMuteUser`，查弹幕使用 `doseeing.com/api/suggest_all` 并可能打开 `data/fan/{uid}`；这些是外部隐私/权限操作，不能仅用“查弹幕”概括。
- 关注列表、用户等级任务、月消费统计、房间卡任务、鱼吧签到/补签、客户端礼盒和星推任务必须在 `API_CONTRACTS.md` 分成独立端点组，不把整个 F-23 写成一个“签到 API”。
- 旧代码还覆盖 `v.douyu.com/wgapi/vod/center/getBarrageListByPage`、`v.douyu.com/api/stream/getStreamUrl`、`video/video/getVideoUrl`；F-11 必须包含分页终止、m3u8档位选择、ASS/XLSX字段和下载取消。
- `ExSave_TabSwitch` 的旧实现会伪造 `document.hidden/visibilityState/hasFocus` 并阻止 `visibilitychange`。NEXT 不得复制全局伪造；只能提供可撤销、作用域限定、用户明确启用的后台策略。
- 旧实现包含跨平台 URL 与外部站点跳转（Bilibili、Huya、doseeing、Greasy Fork）。任何保留都必须有独立隐私说明、`@connect` 证据、失败降级和用户可关闭开关。

### 14.2 追加验收编号

新增最低测试：`T-F-51` 月消费默认隐藏、日期边界和接口失败；`T-F-52` 任务领取状态先查且未知结果不重发；`T-F-53` 房间卡任务独立状态；`T-F-54` 关注列表右键/长按/换房销毁；`T-F-55` pocket 数据不可伪称观众；`T-F-56` 图片协议恶意输入纯文本降级；`T-F-57` 100桶时间轴正确销毁；`T-F-58` 下载/复制失败不报成功；`T-F-59` 跨平台能力未验证时安全禁用；`T-F-60` Bloop 停止时间/随机间隔和旧第三方模式禁用；`T-F-61` GM 权限缺失可用性；`T-F-62` 四站 clean 消息来源、nonce、超时和恢复。

计划书当前能力编号范围为 F-01～F-62。编号扩展仍然不是完成证明；最终状态以 `TRACEABILITY.md` 的逐项证据为准。

<a id="scan-gap"></a>
## 13. 全仓库扫描补全清单（2026-09-16 二次扫描）

本节是对原有 F-01～F-35 的补充，不把“计划书没有单独列名”误判为“源码没有能力”。扫描范围包括 `meta.js`、`main.js`、`build.js`、`core/*`、`modules/01_setup.js`、`02_dom_ui.js`、`03_cron.js`、`04_styles.js`、`05_services.js`、`06_router.js`。以下能力必须进入 TRACEABILITY；在实现前仍按 A/B/C 取证规则确认，不得因有旧代码就宣称线上可用。

### 13.1 新增能力编号（F-36～F-50）

| ID | 扫描发现的能力 | 证据锚点 | NEXT 处理要求 | 风险 |
|---|---|---|---|---|
| F-36 | 全局脚本插入拦截：`Node.prototype.appendChild/insertBefore`，外部与内联脚本分别转换 | `src/modules/01_setup.js:6` | 独立 `platform/script_bridge.js`；只允许白名单目标，保存/恢复原方法，重复安装幂等；不得默认拦截宿主所有脚本 | H |
| F-37 | `/firstqueue` 与内联脚本补丁管道 | `src/modules/01_setup.js:6` | 记录补丁目的、输入/输出夹具和 kill switch；补丁失败必须放行原脚本并告警，不可吞错 | H |
| F-38 | 通用 XHR 响应转换器：保存 URL/请求体并按转换器链改写响应 | `src/modules/01_setup.js:6` | `platform/xhr_transform.js`；转换器注册表、生命周期、响应类型校验；与 quality hook 分离，禁止双重改写 | H |
| F-39 | P2P 完整构造器替换：RTCPeerConnection 多前缀、createOffer/getStats/dataChannel | `src/modules/01_setup.js:6` | `core/p2p_blocker.js`；保存构造器/方法、禁用时恢复；明确 NotSupportedError 与空统计降级，不破坏非P2P媒体 | H |
| F-40 | 贡献榜 page-world WebSocket 代理与 Blob/ArrayBuffer/STT 解码 | `src/core/rank_engine.js:488-568` | 在 F-02 之外单列 hook 子项；bridge 只传白名单榜单数据；测试坏包、Blob、分帧、重复安装 | H |
| F-41 | 榜单注入调度：50ms debounce、5s fallback、document click 触发、`window.__DYRANK.dump/refresh` 调试接口 | `src/core/rank_engine.js:78-100,1272-1306` | `core/rank_engine.js` 记录可选 debug 开关；生产默认不输出敏感消息；所有 timer/listener 可销毁 | M |
| F-42 | 最高画质属性 hook：`preloadStreamUrlPromise` 抑制预载、`getLegacyFirstStream` 强制 rate=0 | `src/core/quality.js:37-70` | 与 F-01 共用状态机但单独验收 getter/setter 可恢复、第三方属性描述符异常和12秒过期 | H |
| F-43 | 画质偏好写入：六个斗鱼播放器官方偏好 key 的一年期 rate=0 镜像 | `src/core/quality.js:23-35` | 归类为宿主偏好，不进入插件 reset 白名单；记录写入失败和恢复策略 | M |
| F-44 | 视频 Shadow DOM 三观察器：video、share/hashid、controller/showtime/isshow | `src/modules/06_router.js:1` | `adapters/vod_player.js`；每个 observer 独立 disposer，shadowRoot 替换可重挂，停止后无回调 | M |
| F-45 | 普通房间/特殊 exid 初始化就绪探测与全屏/侧栏点击 | `src/modules/01_setup.js:6`, `06_router.js:5` | 用有界 readiness observer/一次性超时替代旧1秒轮询；行为开关、用户原状态保护；R-01/R-02测试 | M |
| F-46 | 60秒用户任务心跳 `Qt()` | `src/modules/03_cron.js:2-6` | `runtime/heartbeat.js`；只调度已启用且可取消任务，切房/登出清理；不得成为所有功能的万能轮询 | M |
| F-47 | 粉丝勋章页 DOM 增强：获取天数、日期、300天红字 | `src/modules/06_router.js:1` | F-28 增加 DOM 子项；使用节点幂等标记，避免重复追加 HTML/日期；R-06独立验收 | L |
| F-48 | 精灵球展开后的九按钮 Dock 与入口顺序 | `src/modules/02_dom_ui.js:916-1045`及用户确认 | `ui/dock.js` 必须固定从左到右：一键签到、一键续牌、扩展功能、直播间工具、弹幕小助手、全站抽奖、同屏播放器、在线弹幕助手、版本更新；在线弹幕助手是唯一不打开三级菜单的按钮，直接执行在线助手入口；其余八项按对应面板/三级菜单规则工作，不得添加占位按钮 | M |
| F-49 | 现有四个一级面板的具体交互：fans、sign、popup-player、update | `src/modules/02_dom_ui.js:350-440,442,498,632-914` | L3 扩展表新增 P-01～P-04；实现按钮/日志/粘贴/URL/更新状态/打开链接/销毁，不仅实现空壳 | M |
| F-50 | GiftPicker 完整交互：双 tab、搜索、ID过滤、懒加载图、点击回填、mask/Escape关闭、160ms移除 | `src/modules/02_dom_ui.js:16-175` | F-20 增加完整验收；`fetchCurrentRoomGifts/fetchUserBackpackGifts` 失败可分别降级；选择器必须返回结构化礼物对象 | M |

F-36～F-46 属于底层/生命周期能力，不能因没有可见按钮而删除；它们是旧业务功能正常工作的隐式依赖。F-48～F-50 属于此前计划书只写了“有面板”但未写完交互的可见缺口。若核验后确认某个补丁已是死代码，状态改为 retired 并保留证据，而不是直接从矩阵移除。

### 13.2 Dock 与面板补全

扫描确认现有 Dock 在 `02_dom_ui.js:916-1045` 经用户确认的最终产品规格为 **9 个按钮**，从左到右固定为：**一键签到、一键续牌、扩展功能、直播间工具、弹幕小助手、全站抽奖、同屏播放器、在线弹幕助手、版本更新**。其中在线弹幕助手是唯一没有三级菜单、也不需要三级菜单的入口，直接打开/执行在线助手；其余八项按对应面板或三级菜单规则工作。旧源码中的 `ex-monitor` 外部监控链接属于在线弹幕助手的历史实现线索，不得再作为第十个 Dock 按钮或额外占位按钮。所有入口均有 hover/click、active indicator、重复插入拦截或面板装配行为；NEXT 必须以本用户确认的九按钮顺序覆盖旧源码可能存在的名称差异。

除 L3-01～L3-12 外，必须在 UI 追踪中增加以下一级面板：

| ID | 面板/入口 | 锚点 | 最低验收 |
|---|---|---|---|
| P-01 | `fans-panel` / fans continue | `02_dom_ui.js:350-460,442` | 粘贴/数量、牌子读取、开始/停止、失败日志、销毁 |
| P-02 | `sign-panel` | `02_dom_ui.js:498-630` | 五任务复选、记忆、开始/取消、滚动日志、逐项状态 |
| P-03 | `popup-player-panel` | `02_dom_ui.js:632-713,713` | URL输入/粘贴/房间校验、创建/关闭/拖拽/流释放 |
| P-04 | `exupdate-panel` | `02_dom_ui.js:780-914` | 12小时限频、检查中/最新/可更新/错误、打开更新链接 |
| P-05 | `ex-gift-picker` | `02_dom_ui.js:16-175` | 房间/背包 tab、搜索、mask/Escape、160ms关闭、结构化回填 |

- **在线弹幕助手**：这是九个 Dock 按钮中唯一不打开三级菜单的入口；不得为它创建空的三级面板。它可直接打开/执行在线助手，但必须遵守 Brave 外部导航、隐私、`@connect` 和用户确认规则；外部服务不可用时显示明确的不可用状态。
- **其余八项**：一键签到、一键续牌、扩展功能、直播间工具、弹幕小助手、全站抽奖、同屏播放器、版本更新，均需按各自 P/L3 面板矩阵实现对应三级菜单或一级面板，不得把所有功能塞进一个通用面板。


### 13.3 隐式 hook 与定时任务登记表

| 类别 | 旧行为 | NEXT 规则 |
|---|---|---|
| quality | fetch + XHR 双路径，`/betard` response clone，`getH5Play`/`/super/stream` body改写 | F-01/F-42/F-43 共用可恢复 hook；hook 顺序与重复安装测试 |
| setup | XHR transformer 与 script insertion patch | F-36～38 独立 registry；不能与 client API 混为一谈 |
| rank | page WebSocket、Blob/ArrayBuffer、DOM注入 fallback | F-40/F-41；page bridge 白名单与 debug开关 |
| router | 普通房/视频 shadow、fullscreen/side panel readiness | F-44/F-45；scope 与 route generation 清理 |
| heartbeat | `setInterval(Qt,60000)` | F-46；仅任务调度，不做DOM探测 |
| UI | hover bridge timer、gift picker Escape/mask delayed remove | F-48～50；组件 destroy 取消 timer/listener |

### 13.4 扫描后必须更新的台账

P0.2 不能只更新 API_CONTRACTS。必须生成并维护：

```text
docs/next/BASELINE.md              # 源码哈希、扫描范围、文件:行号锚点
docs/next/TRACEABILITY.md          # F-01～F-50、L3、P、R、A状态与测试
docs/next/API_CONTRACTS.md         # A/B/C、完整请求/响应和未决项
docs/next/STORAGE_MAPPING.md        # 动态键、GM键、宿主播放器键、迁移/重置白名单
docs/next/DEPENDENCIES.md           # 6个@require、11个@connect、实际消费者/失败降级
docs/next/HOOKS_AND_LIFECYCLE.md    # hook安装顺序、timer/observer/disposer
docs/next/PROGRESS.md               # 任务包与证据报告
docs/next/ui-baseline/              # Brave截图、状态说明、尺寸与环境元数据
```

目录不存在时由 P0.1 创建；上述文件未落盘前，P0.1 不得标记完成。`TRACEABILITY.md` 必须记录本扫描新增 F-36～F-62 和 P-01～P-05，并把原 F-01～F-35 逐项关联至少一个测试。

<a id="team-ui"></a>
## 15. Hermes 主施工与 Brave UI 基线协议

### 15.1 Hermes + Gemini 3.8 Flash 单一施工体系

本项目不再使用 ZCode 参与施工、审计或验收。**Hermes 是唯一主施工者、项目编排者和最终交付责任者；Gemini 3.8 Flash 是 Hermes 内置的执行模型/子任务协作者。**所有检查、审计、截图、构建、测试、台账和风险决策都必须由 Hermes 负责组织并记录，不能把责任转移给 Gemini 或其他工具。

- **Hermes**：读取本计划、分解任务、决定依赖顺序、调用或驱动 Gemini 3.8 Flash 完成局部实现，审核其输出，运行构建/测试/浏览器验收，维护 `TRACEABILITY.md`、`PROGRESS.md`、UI 基线和阻塞清单；不发布、不推送、不触碰 `main`。
- **Gemini 3.8 Flash**：在 Hermes 明确的任务包内实现单个组件、adapter、测试、文档或修复；必须先读取任务包的契约和允许修改文件；不得自行改变架构、范围、安全门禁或验收条件；不得把 mock、静态推断或文件存在当作线上完成。
- **Hermes 的复核责任**：Gemini 每次返回后，Hermes 必须检查 git diff、构建输出、测试结果、截图、资源销毁和矩阵状态；发现不一致先退回 Gemini 修复，不能直接勾选完成。

推荐工作流：

```text
Hermes 冻结一个任务包与验收条件
  -> Hermes 读取基线并向 Gemini 分派一个最小子任务
  -> Gemini 实现局部代码/测试，不越过允许文件
  -> Hermes 运行 node:test、node build.js --next 和 Brave 截图验收
  -> Hermes 更新 TRACEABILITY、PROGRESS、UI 基线和风险
  -> 失败则回到同一任务包修复；通过后才开放下一个任务包
```

Gemini 的调用提示必须明确写出：任务 ID、前置条件、允许修改文件、禁止修改文件、证据等级、接口契约、验收用例、构建命令和输出格式。Hermes 不得向 Gemini 提供“把所有功能一次性写完”这类模糊指令。

### 15.2 Hermes 首轮 UI 指令（可直接复制）

> 你是 Hermes，负责在 D:\DouyuEx-RL 的 DYEXRL-NEXT 分支中编排 Gemini 3.8 Flash 完成 NEXT。先读取 `docs/NEXT_IMPLEMENTATION_PLAN.md`、`docs/next/PROGRESS.md`、`docs/next/BASELINE.md` 和当前 git 状态；若台账不存在，先执行 P0.1，不得直接写全套 UI。每次只冻结一个任务包，再给 Gemini 分派一个最小子任务；提示中必须写出任务 ID、允许修改文件、禁止修改文件、证据等级、接口契约、验收用例和命令。Gemini 返回后由你检查 diff、测试、构建、截图、资源销毁和矩阵状态；未通过不得勾选完成。不要运行 `release.js`，不提交、不推送、不触碰 `main`。UI 必须通过 NEXT MIUIX 工厂构造，业务模块不得手写第二套样式。对当前 Brave 浏览器中的基线页面进行截图取证，保存截图和环境元数据后再实现对应组件；禁止凭文字猜测尺寸、位置、颜色或交互。每完成一个组件/面板，运行测试与 `node build.js --next`，更新 `TRACEABILITY.md`、`PROGRESS.md` 和 UI 状态证据。真实送礼、关注/取关、禁言、Cookie 切换和其他写操作默认不执行；API 不明标记 blocked，不用假响应冒充完成。

### 15.3 Brave 浏览器取证边界

Hermes 可以调用用户当前使用的 Brave 浏览器进行**只读 UI 取证**，但必须遵守：

1. Hermes 必须能够在当前会话调用 Brave 浏览器时才执行浏览器取证；不能把“可以调用”理解为无条件已有权限。
2. 先确认当前浏览器窗口、页面 URL 和用户是否已登录；不得擅自切换账号、打开陌生外部站点、提交表单或执行资产/账号写操作。
2. 仅使用用户已打开或明确允许的页面截图。真实直播间中，点击 Dock、打开面板、切换 Tab、展开手风琴、按 Escape、滚动和调整窗口属于低风险只读交互；如动作会发送弹幕、送礼、关注、取关、禁言、领奖、切 Cookie 或触发外部导航，停止并记录 blocked。
3. 截图前记录：URL（敏感参数脱敏）、页面角色、面板状态、视口宽高、devicePixelRatio、浏览器版本、脚本管理器、脚本版本、主题/缩放、登录状态（只记已登录/未登录，不记 UID/Cookie）。
4. 截图不得含 Cookie、token、完整账号标识、私人聊天内容、支付信息或其他不必要隐私；必要时使用脱敏夹具或裁剪。证据文件不得上传外部服务。
5. Brave 取证失败、页面无法访问或没有授权时，使用现有源码/脱敏 DOM 夹具继续静态实现，并在报告中标记 `browser-blocked`，不能伪称视觉验收通过。
6. 浏览器截图是验收证据，不是实现输入的唯一来源。源码行为、CSS、DOM、面板事件和截图互相冲突时，记录冲突并以当前用户明确的行为目标为准。

### 15.4 UI 基线库目录和命名

P0.1/P2 必须建立以下截图资产；不要求一次性全部完成，按面板任务包增量提交：

```text
docs/next/ui-baseline/
  README.md
  metadata/
    dock-open.json
    fans-panel.json
    sign-panel.json
    popup-player-panel.json
    update-panel.json
    gift-picker-room.json
    gift-picker-backpack.json
    extool.json
    livetool-vote.json
    livetool-enter.json
    livetool-mute.json
    livetool-gift.json
    livetool-reply.json
    filter-panel.json
    enhance-panel.json
    perf-panel.json
  images/
    dock-open.png
    fans-panel.png
    sign-panel.png
    popup-player-panel.png
    update-panel.png
    gift-picker-room.png
    gift-picker-backpack.png
    extool.png
    livetool-vote.png
    livetool-enter.png
    livetool-mute.png
    livetool-gift.png
    livetool-reply.png
    filter-panel.png
    enhance-panel.png
    perf-panel.png
  states/
    loading/
    empty/
    error/
    disabled/
    destroying/
    narrow-viewport/
```

每个 JSON 至少包含：

```json
{
  "captureId": "gift-picker-room-default",
  "source": "legacy-browser|next-browser|fixture",
  "route": "room|vod|passport|yuba|other",
  "urlRedacted": "https://www.douyu.com/<rid>",
  "viewport": { "width": 1440, "height": 900 },
  "devicePixelRatio": 1,
  "browser": "Brave <version>",
  "manager": "Tampermonkey|Violentmonkey|unknown",
  "scriptVersion": "redacted",
  "state": "default|loading|empty|error|disabled|destroying",
  "panel": "gift-picker-room",
  "interactionsPerformed": ["open", "search:none"],
  "redactions": ["account", "chat", "query"],
  "capturedAt": "YYYY-MM-DDTHH:mm:ssZ",
  "notes": ""
}
```

截图命名必须稳定；同一状态重拍覆盖前先保留旧哈希或写入变更说明。不要提交包含账号/聊天隐私的原始截图。`README.md` 记录截图来源、是否为 legacy/NEXT、已知差异、不可验证项和预期视觉重点。

### 15.5 UI 状态矩阵

每个组件至少验证以下状态；没有某状态时填写 N/A 理由：

| 组件 | 默认 | loading | empty | error | disabled | destroying | Escape/键盘 | 窄视口 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Dock | □ | □ | N/A | □ | □ | □ | □ | □ |
| fans-panel | □ | □ | □ | □ | □ | □ | □ | □ |
| sign-panel | □ | □ | □ | □ | □ | □ | □ | □ |
| popup-player-panel | □ | □ | □ | □ | □ | □ | □ | □ |
| update-panel | □ | □ | □ | □ | □ | □ | □ | □ |
| gift-picker | □ | □ | □ | □ | □ | □ | □ | □ |
| L3-01～L3-05 | □ | □ | □ | □ | □ | □ | □ | □ |
| bloop/extool | □ | □ | □ | □ | □ | □ | □ | □ |
| filter/enhance/perf | □ | □ | □ | □ | □ | □ | □ | □ |
| PiP/联播子窗 | □ | □ | □ | □ | □ | □ | □ | □ |

状态证据必须包含可执行操作：open、hover、leave、expand、collapse、Escape、Enter、Tab、输入法组合输入、paste、drag、wheel、long-press（适用时）、close、destroy、再次 open。只截图默认态不能勾选 UI 完成。

### 15.6 UI 几何与交互核对清单

Hermes 在实现前从 Brave 截图和源码台账确认，不自行猜测：

- Dock 视口边距、按钮尺寸、排列顺序、active indicator、z-index；
- Panel 相对按钮的锚定、左右/上下翻转、窄视口留边和 mask；
- Header 高度、Body padding、滚动槽、卡片间距、输入/按钮高度；
- `32px` Hover Bridge 与 `400ms` close timer 的真实覆盖范围；
- Modal 与 Dock 的遮挡/关闭优先级；
- loading/empty/error/disabled 的视觉和按钮状态；
- 原始 SVG 图标的 ID、viewBox、path、尺寸、颜色、hover/active 状态；
- `ensureMiuixPanelHeader` 的旧关闭控件隐藏、body wrapping、mouseenter/leave 清理；
- GiftPicker 的双 Tab、搜索、懒图、mask/Escape 和 160ms removal；
- Bloop 长按/停止、GIF 长按、compositionstart/end、复制粘贴、拖拽和滚轮；
- PiP/Shadow DOM 子 Document 的挂载和销毁。

### 15.7 UI Definition of Done

一个 UI 组件或面板只有同时满足以下条件才能在矩阵标记 `mock-tested` 或更高：

1. 对应 legacy/fixture 基线截图和 metadata 已保存，或写明 `browser-blocked`；
2. 通过 MIUIX 工厂和统一 tokens/icons 构造，无业务级第二套样式；
3. 默认、loading、empty、error、disabled、destroying 状态已覆盖或说明 N/A；
4. 鼠标、键盘、Escape、输入法、粘贴、拖拽、长按等适用交互已测试；
5. 窄视口不溢出，焦点、滚动、z-index、遮罩和关闭行为正确；
6. `destroy()` 后没有 timer、listener、Observer、worker、object URL、子窗或 DOM 残留；
7. `node --test` 与 `node build.js --next` 通过；
8. `TRACEABILITY.md` 记录 F/L3/P、来源截图、测试证据和已知差异；
9. 截图对比中明显差异（位置、尺寸、颜色、字体、遮挡、间距、动画时序）已修复或明确记录为平台差异；
10. 未执行真实写操作，或有独立、明确、可回滚的授权记录。

Hermes 不得以“组件可渲染”“默认截图相似”宣布 UI 完成。UI 最终完成必须有截图、交互和销毁三类证据；没有 Brave 权限时最多标 `mock-tested`，不得标 `live-verified`。

**最终纪律：文件创建不是完成，语法通过不是功能正确，mock通过不是线上通过，按钮可点不是业务成功。以逐项证据交付，不以代码行数、功能口号或主观“100%”交付。**
