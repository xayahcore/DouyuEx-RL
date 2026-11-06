# v4 施工 · 真机验收记录（ego 浏览器）· 2026-11-02

> 验收对象：工作区当前构建 `DouyuEx_RL.user.js`（版本号未变：2026.11.01.01，按 AGENTS 口径验收期不动版本）
> 注入方式：ego lite 页面内注入 `GM 垫片 + 构建产物`（`Page.addScriptToEvaluateOnNewDocument` 或 `page.evaluate`），
> 页面：斗鱼直播间 `https://www.douyu.com/9999`，全程静音（`video/audio` 置 muted+volume 0）。
> 截图：本目录 `live/v4-verify/`（共 30+ 张，下文引用关键几张）。

---

## 1. 门禁（真跑，命令与退出码）

| 门禁 | 命令 | 结果 |
|---|---|---|
| 构建 + 三端语法核验 | `node build.js` | **exit 0** |
| `!important` 棘轮 | 内置于 build | **2150 条**（本轮峰值 2197 → 收回到 2150，基线已回写） |
| 旧类名只减不增 | `node tools/ui-legacy-guard.mjs` | **exit 0**：`fans-panel__card` 46→18 · `sign-option-item` 26→15 · `sign-option-desc` 23→12 · `livetool__cell` 21→11 · `popup-panel__card` 7→1 · `exupdate-panel__card` 4→3 · `bloop__` 52→51 |
| 全量测试 | `npm test` | **exit 0**（33 个套件，含新增 `test_ui_contract.js` / `test_theme.js`） |

---

## 2. 真机实测（读数来自页面内 `getComputedStyle`，非静态推断）

### 2.1 二级 Dock（第 9 个磁贴 + 语义）

| 项 | 实测 |
|---|---|
| 磁贴数 | **9**（8 个面板入口 + 外观） |
| 语义 | 9/9 都有 `role="button"` `tabindex="0"` `aria-label`，例：`一键签到 / 一键续牌 / 弹幕发送小助手 / 扩展功能 / 直播间工具 / 同屏播放 / 全站抽奖信息 / 版本更新 / 外观：跟随网页（当前白天）（点击切换）` |
| 精灵球 | `role="button"` `tabindex="0"` `aria-label="DouyuEx 工具条（点击展开 / 全部收敛）"` `aria-expanded` 随开合变化 |
| Dock 底色 | `rgba(255,255,255,0.34)`（= `--miuix-modal-bg`，已改为引用令牌） |
| Dock 模糊 | `blur(28px) saturate(2)`（白天） |
| 展开稳定性 | 点精灵球后 0→10 次采样（每 100ms）全部 `display:flex`，**不再出现"展开即被收"** |

### 2.2 三级面板（一键签到）

| 项 | 实测 |
|---|---|
| 宽度 | **380px**（唯一真源来自 CSS，JS 不再写死） |
| 结构 | `.ui-card` ×2、`.ui-row` ×6，内联 `style` 仅 1 处（粘底操作区，设计如此） |
| 单层白 | 卡片 `rgba(0,0,0,0)`（transparent）+ 行 `rgba(255,255,255,0.42)`，外壳 `0.34` → 有效 0.617 |
| 主按钮 | `44px`（用户 2026-11-02 拍板改的档位） |
| 关闭钮命中区 | 视觉 `26×26`，`::after` `inset:-9px` → 命中 44×44 |
| 激活指示 | 打开后面板对应磁贴挂 `is-active ex-dock-active` |

### 2.3 焦点 / 键盘

| 项 | 实测 |
|---|---|
| 磁贴可聚焦 | `tile.focus()` 后 `document.activeElement === tile` ✅ |
| 焦点环 | 规则存在（`outline: 2px solid var(--dx-accent-fill)`），但**程序化 `focus()` 不触发 `:focus-visible`**，所以读数里看不到环 —— 需要真实 Tab 才能目视 |
| ESC | 真实 `page.keyboard.press("Escape")` → 三级面板与 Dock 一起收起 ✅ |

### 2.4 黑夜态（D2 + 三态）

| 项 | 白天 | 黑夜（`data-dx-theme="dark"`） |
|---|---|---|
| Dock 底色 | `rgba(255,255,255,0.34)` | `rgba(16,20,26,0.18)` |
| 背景滤镜 | `blur(28px) saturate(2)` | `blur(30px) saturate(1.3) brightness(0.45)` |
| 面板底色 | `rgba(255,255,255,0.34)` | `rgba(16,20,26,0.18)` |
| 行底色 | `rgba(255,255,255,0.42)` | `rgba(16,20,26,0.14)` |
| 标题墨色 | `rgb(15,23,42)` | `rgb(255,255,255)` |
| 三态循环 | 点第 9 磁贴：`light → dark → auto`（实测 `["light","dark","auto"]`） |
| 「同时把斗鱼切深」 | 生效：点黑夜后 `html[data-mantine-color-scheme]` 变成 `dark`，页面同样进深色 |

> 期间抓到并修掉的真机问题：Dock 底色原本写死 `rgba(255,255,255,0.34)`，黑夜态不跟 → 已改为 `var(--miuix-modal-bg)`。

---

## 3. 截图索引（live/v4-verify/）

| 文件 | 内容 |
|---|---|
| `60-dock-open.png` | 9 磁贴 Dock（白天，玻璃胶囊 + 白色磁贴 + Phosphor 图标） |
| `61-panel-light.png` | 同上，首磁贴处于激活态 |
| `11-sign-panel.png` | **一键签到面板**：两张卡片 + 6 条开关行 + 粘底 44px 主按钮（玻璃层次可辨） |
| `62-panel-dark.png` | 黑夜态 Dock（深玻璃 0.18 + brightness 0.45，第 9 磁贴图标切成月亮） |
| `22-theme-0/1/2-*.png` | 三态循环逐帧 |
| `63-after-esc.png` / `72-after-esc.png` | ESC 之后：面板与 Dock 全收 |

---

## 4. 未能在真机验证完的部分（如实记录）

1. **真实 Tab 进入磁贴并看到焦点环**：ego 会话里页面级 Tab 会被斗鱼搜索框抢走（实测 Tab 走到搜索并跳转 `/search`），
   所以"用键盘从页面走到 Dock"这条路径在真机上没跑成；`focus()` + `Enter` 的合成事件链已通过。
2. **最后一次键盘/aria 修补未做真机复验**：`document` 捕获阶段补绑 `Enter/Space`、以及 `aria-expanded` 改成按意图写入，
   这两处在最后一次构建里，但真机页面被本机残留的旧注入占住（见下），只能用单测 + 合成事件覆盖。
3. **环境噪声（与产物无关）**：这台 ego 浏览器上存在早前会话留下的 `Page.addScriptToEvaluateOnNewDocument` 注册，
   每次导航会自动再注入一份**旧 bundle**，于是页面上出现过两套 style / 两套 Dock（旧包 `--miuix-modal-bg:0.65`、
   `.ex-panel` 背景 `0.72`、主按钮 38px）。验收时按"含 `13. v4 设计系统层` 的 style + 带 role 的磁贴"筛出真身后再测，
   §2 的读数都是在筛过的那一份上取的。
4. 4 个面板（同屏播放 / 直播间工具 / 扩展功能 / 弹幕小助手）**只做了 DOM 级断言，没有逐面板真机截图**。


---

# 二轮：全部收尾 + 追加真机验证（2026-11-02 晚）

> 用户口径：「bug 很多，你先全部做完，然后进行实机验证」。下面按"做完 → 验收"两段记。
> 本轮所有门禁都真跑过：`node build.js` exit 0（棘轮 **2074 → 2072**）、`npm test` exit 0（33 套件）、
> `node tools/ui-legacy-guard.mjs` exit 0（基线已按新低点回写）。

## A. 施工收尾（W3 补齐 + W6 清零）

| 项 | 结果 |
|---|---|
| ExUI 组件层覆盖率 | **8/8 面板**：ExpandTool 14 行、DanmakuHistory 行、LiveTool 五个抽屉、BarrageLoop 容器、FansContinue 资产格、Update 卡片头全部改由 `.ui-card/.ui-row/.ui-field/.ui-stat` 产出 |
| 旧类名（guard） | `sign-option-item` 26→**0** · `sign-option-desc` 23→**0** · `fans-panel__card` 46→**0** · `popup-panel__card` 7→**0** · `exupdate-panel__card` 4→**0** · `bloop__` 52→**48**（余下全是 id）· `livetool__cell` 21→**3**（余下是必须保留的 `.livetool__cell_title`） |
| 内联样式 | ExpandTool 44→0 · LiveTool 15→0 · BarrageLoop/FansContinue/Lottery/Update/Sign 0（粘底操作区那条是契约内） |
| `transition: all` | 25 + 7 处 → **0**，全部展开成"颜色/边框/阴影/位移/透明度"显式列表 |
| 焦点恢复（I-11） | 同屏播放重画后按"身份钥匙"找回焦点，房间被移除时退到列表容器，不再掉回 body |
| 粘底操作区 | 签到 / 续牌 / 同屏 / 版本更新四处 44px 主按钮，ESC 与点外部收敛一致 |

## B. 追加修掉的 4 个真 bug（都是二轮才暴露的）

1. **`..miuix-modal` 双点选择器**（ExPanel.css §11.3）——整条"面板按钮 28px 三档"规则被浏览器判为非法选择器**整条丢弃**，
   所有面板里的原生 button 因此没有高度/边框/底色。二轮用 jsdom 逐条 `matches()` 全量校验 706 条规则时抓到，已修。
2. **面板没有基色**——斗鱼自己会切深色，面板是浅玻璃却没人写 `color`，文字继承页面 → **深色页面上白字压浅玻璃**（截图 C5 就是现场）。
   已加 §13.0 基色层（`.miuix-modal/.ex-panel/.ui-row/.ui-card__body → var(--dx-ink-1)`，不用 !important 以过棘轮）。
3. **黑夜态药丸失蓝**——基类 `rgba(255,255,255,.10)` 把 `.ui-btn--accent/--primary` 的蓝底盖掉。
   改法：基类加 `:not()` 收窄，药丸保留 `var(--dx-accent-fill)`（黑夜 0.52d9）。
4. **Update 面板卡片类与测试硬绑**——`test_built_bundle` 断言 `.exupdate-panel__card`，导致旧类删不掉。二轮改断言到组件层（`.ui-card/.ui-card__title`），旧类清到 0。

## C. 真机巡场（ego lite · 斗鱼 9999 直播间 · 静音）

8 个三级面板逐个点开（`live/v4-verify/C1…C8-panel.png`），读数一致：

| 面板 | 宽 | 卡片 | 行 | 粘底按钮 | 行底/标题色 |
|---|---|---|---|---|---|
| 一键签到 | 380 | 2 | 6 | 44px | 0.42 / `#0f172a` |
| 一键续牌 | 380 | 3 | — | 44px | — |
| 弹幕小助手 | 380 | 3 | 4 | — | 0.42 / `#0f172a` |
| 扩展功能 | 380 | 5 | 14 | — | 0.42 / `#0f172a` |
| 直播间工具 | 380 | 10 | 10 | — | 0.42 |
| 同屏播放 | 380 | 2 | — | 44px | — |
| 全站抽奖 | 380 | 2 | 1 | — | 0.42 / `#0f172a` |
| 版本更新 | 380 | 3 | — | 44px | — |

Dock：**622×78**、磁贴 **56×56**、无横向溢出（F-10 的 2px 溢出已随 `height 78` 修掉）；
ESC 逐面板可收敛；面板底色 `rgba(255,255,255,0.34)`。

## D. 组件层渲染台（真 CSS，无注入依赖）

ego 会话里本机残留的旧包会自动再注入一份（`Page.addScriptToEvaluateOnNewDocument` 注册残留），
会导致"测到的是旧包"。因此另建 `.zcode/tmp/panel-preview.html`：把 `src/**/*.css` 按构建顺序拼成一张样式表，
配真实组件 DOM（Dock 9 磁贴 / 签到卡 / 直播间工具抽屉 / 按钮三档 / 字段 / 分段 / 数值 / 空态），
用 `?theme=light|dark|auto-dark` 三态各渲染一次（截图 `H-light.png` / `H-dark.png` / `H-auto-dark.png`）：

| 读数 | light | dark | auto(页面深色) |
|---|---|---|---|
| 面板底色 / 滤镜 | `rgba(255,255,255,0.34)` / `blur(28px) saturate(2)` | `rgba(16,20,26,0.18)` / `blur(30px) saturate(1.3) brightness(0.45)` | 同 dark |
| 面板墨色 | `#0f172a` | `#ffffff` | `#ffffff` |
| 行底 / 标题 / 描述 | `0.42` / `#0f172a` / `#1e293b` | `rgba(16,20,26,0.14)` / 白 / `#e2e8f0` | 同 dark |
| 主按钮 | 350×44 渐变 | 350×44 | 350×44 |
| 药丸按钮 | `#0066ff` | `#0052d9` | `#0052d9` |
| 危险按钮 | `#b91c1c` | `#ff9e9e` | `#ff9e9e` |
| 状态色（正常） | `#0f9d63` | 白（见"已知取舍"） | 白 |
| Dock / 磁贴 | 622×78 / 56×56 | 同 | 同 |

## E. 已知取舍与未做完（不粉饰）

1. **黑夜态状态色**：语义色元素落在"整棵染色"的 `*!important`(0,2,1) 之下，要压过去必须再加 !important，会撞 `!important` 棘轮；
   本轮选择让状态字在黑夜态读作白色（信息仍可读，颜色语义丢失）。想恢复得先做"染色分档"重构。
2. **`!important` 棘轮**：2072 条。组件层（§12/§13，约 310 条）目前仍靠 !important 压住 `.miuix-modal button:not(…)`（0,2,1）这类基类规则；
   要摘掉必须同步把组件层选择器加 `.miuix-modal` 前缀提权，属独立一批，不在本轮硬塞。
3. **Dock 第 9 磁贴以外的键盘路径**：真实 Tab 在斗鱼页会被搜索框抢焦点并跳转 `/search`，仍无法在真机走通"Tab 进 Dock→焦点环→Enter"全链；
   `focus()` + 合成 `keydown` 的链路已通过。
4. 直播间工具仍是"每个抽屉一个卡片"（10 个 .ui-card），几何上比"一个卡片装 5 行"更松；属观感取舍，未在真机上做定稿截图对比。
