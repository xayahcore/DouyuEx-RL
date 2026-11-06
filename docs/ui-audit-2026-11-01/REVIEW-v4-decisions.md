# REVIEW-v4-decisions · 回退后重审

> 审计对象：`DYEXRL-NEXT` @ `9871bfa`（工作区干净；`docs/ui-audit-2026-11-01/` 已 staged）。
> 只读 `src/`、`tests/`、`tools/`、产物；未跑 `node build.js` / `npm test`；唯一写入本文件。
> 行号口径：**无前缀 = 当前 HEAD**；`58b178a:` 前缀 = 备份分支 `backup/ui-overhaul-20261101` 的行号（该文件在 HEAD 已不存在）。
> 判据：值相等 / 文件存在性 / grep 计数；不凭印象。

## 0. 先看这五条

| # | 结论 | 一句话证据 |
|---|---|---|
| 1 | **问题还在，修法没了** | HEAD 8 个磁贴仍是裸 `div`（0 role/tabindex/aria），ExPanel 0 处 ESC，16 处 `outline:none`，说明字仍 10.5px `#64748b`，`!important` 94.96%，`@media` 0 处。 |
| 2 | **58b178a 的 v4 能力在 HEAD 全部消失** | `ExUI.js`、`ExTheme.js`、`tools/`、`test_ui_contract.js`、`test_theme.js` 在 HEAD 均不存在；`ExPanel.css` 从 3684 行回到 2875 行。 |
| 3 | **G2“0.62 单层白”从未实现** | 58b178a 是 `0.34 + 0.42 = 0.617`；HEAD 是 `0.65 + 0.42 + 0.35 ≈ 0.868`；PLAN.md D1 已把“托盘透明 + 白片 0.62”判为作废。 |
| 4 | **verify-a11y 是欠账清单，不是验收通过** | 它自己列出 **47 处不达标**（33 文字 + 6 反白 + 5 图形 + 3 黑夜），并声明未跑 build/test/浏览器。 |
| 5 | **metrics 实际是 17 脚本 / 22 JSON** | 旧文写 12 脚本 / 20 JSON；7 个纯 stdout 可跑，10 个会写 `metrics/*.json`（本轮未跑）。 |

### 0.1 三份快照互不相同（证据链断点）

| 快照 | ExPanel.css | ExPanel.js | ExIcon.js | ExTheme.js |
|---|---|---|---|---|
| HEAD `9871bfa` | **2875 行 / md5 5f192e11** | 736 / 43046839 | 74 / 6ad99481 | 不存在 |
| 备份 `58b178a` | **3684 / 2da1a2bf** | 996 / 3f548945 | 105 / 0a72f6a6 | 202 / 1a8ab6aa |
| verify-a11y 自述 | **3779 / 5932aa77** | 955 / f21c5502 | 86 / 8103f2ec | 202 / 1a8ab6aa |

判据：`md5sum`（下表取前 8 位）+ `wc -l`。只有 `ExTheme.js` 在 verify-a11y 与备份之间一致；**verify-a11y 的 47 条行号既不能对 HEAD，也不能对 58b178a**，它测的是第三份工作区快照。verify-ego 没有给 md5，只能算“与 58b178a 的取值一致”，不能算“同一份产物”。

---

## 1. 仍然有效的定版决策

> 出处均为 [UI-UX-REVIEW.md](UI-UX-REVIEW.md)；“HEAD 现状”列是本轮在 9871bfa 上重新核的，不是抄旧文。

| # | 决策 | 旧文出处 | 一句话取值（具体数字） | HEAD 现状（file:line） | 判定 |
|---|---|---|---|---|---|
| 1 | **G2 白天取值** | §2.1、§2.7.1、§4 | 卡片 **0.62** / 透光 **38%**；最终 D1 改为托盘 **0.34** + 白片 **0.42** = 有效 **0.617**（透光 38.3%）；说明文字 `#1e293b` **5.46:1** | `ExPanel.css:10` 0.65、`:15` 0.42、`:19` 0.35；`:237/:415/:678` 三层叠出 **0.868**（透光 13.2%） | 未落地；重做按 **0.617**，不要再追“0.62 单层” |
| 2 | **D2 深色** | §2.5、§4 | 壳 `rgba(16,20,26,.18)` + `blur(30px) saturate(130%) brightness(.45)`；卡 `rgba(16,20,26,.14)`；等效 **0.295≈0.30**（透光 **70%**）；墨 `#fff` **7.35** / `#e2e8f0` **5.96** / `#cbd5e1` **4.95** / `#7db0ff` **3.33** | src 内 `data-dx-theme` 0 次；`ExPanel.css:217-245` 只有亮色；`grep --dx-` 0 次 | 未落地 |
| 3 | **主题三态** | §2.6 | `ExSave_theme` = `light / dark / auto`，默认 **auto**；生效靠 `html[data-dx-theme]` + `[data-dx-theme-mode]`；“跟随”**纯 CSS 属性选择器**；不读 cookie、不用 class、不轮询；MutationObserver 只盯 `data-mantine-color-scheme` | 无 `ExSave_theme` / `ExTheme`；`ExIcon.js:23` 连 `aria-expanded` 都没有；`ExPanel.js:438-448` 只有 8 个磁贴名 | 未落地 |
| 4 | **Dock 第 9 磁贴** | §2.7 | 8 个之后第 **9** 个；胶囊 **556→602px**（1024 视口右间隙 0，放得下）；单击循环 白天→黑夜→跟随；图标 `sun` / `moon-stars` / `circle-half`；`aria-live="polite"` | `ExPanel.js:438-448` 只映射 8 个入口；实测 **556×76**（`live/README.md:68`），CSS 高度 76（`ExPanel.css:37`） | 未落地 |
| 5 | **单层白** | §2.7.1 | 只有两档：托盘 **0.34**、白片 **0.42** + 1px 白边 **0.55**；卡片 **transparent**；叠出 **0.617**；选中态不加白，只图标填色 + 指示条 | 卡片 **0.42**（`:15/:415`）、行 **0.35**（`:19/:678`）、面板 **0.65**（`:10/:237`）→ 三层 **0.868** | 未落地；“单层”指结构（卡片透明），不是单一 alpha |
| 6 | **开关不动** | §2.3 | 轨道 `rgba(0,0,0,.14)` + 白旋钮 + 开态 `#0066ff`；只加键盘焦点环；关态对卡片 **1.26–1.38:1** 属知情接受 | 原样：`:730` / `:754` / `:769`；`close::after` 0 处；开关/关闭钮无 `focus-visible` | 造型已满足；焦点环未加，重做时造型不要碰 |
| 7 | **粘底压正文** | §1 表第 4 行、§0、§4 | scrollTop=0 时压 **17–32.4px**；条底离面板底 **24.5px**；滚到底可读全（余 **21px**）——设计如此，不改 | `common.js:599-603` sticky / bottom:0 / paddingTop:8 / background:""; `ExPanel.css:876-883` 无背景 | 已满足；P2-1 的“加玻璃底”修法不采纳 |
| 8 | **墨色两档** | §2.2 | `#0f172a` **6.66** / `#1e293b` **5.46**；`#334155` **3.86** 只许 ≥0.87 面；`#64748b` / `#94a3b8` 退出文字位；主次靠字号/字重 | `#1e293b` **0 次**；说明字仍 **10.5px `#64748b`**（`:708-716`）；`#64748b` 10 次 | 未落地 |
| 9 | **品牌蓝只作填充** | §2.2 | `#0066ff` 只作填充（白字 **4.83**）；蓝字 `#0052d9` 只在纯白底（**5.80**）；玻璃上裸蓝 **1.6–1.8** | `color: var(--miuix-blue)` **24 处**（如 `:510/:853/:935`）；`color:#0066ff` 0 处；`outline:none` 16 处 | 未落地；比旧 verify 的 12 处更糟 |

> 0.868 的算法：1−(1−0.65)(1−0.42)(1−0.35)=0.868；0.617 = 1−(1−0.34)(1−0.42)。

### 1b. 同级仍有效的周边取值（重做时要一起带回）

| 项 | 旧文出处 | 取值 | HEAD 现状 |
|---|---|---|---|
| 焦点环 | §2.8 | `outline: 2px solid #0066ff; outline-offset: 2px` | 仅 `:861`（分段）与 `:2726`（同屏结果）两条；16 处 `outline:none`（如 `:603/:900/:2635`） |
| 关闭钮命中区 | §2.8 | 视觉 **26×26**，`::after` 撑到 **44×44** | `:316-337` 26×26；`close::after` 0 处 → 命中仍 26 |
| 主按钮 | §2.8、PLAN §9-2 | 高 **44** | `:890` 仍 **38px**；`tests/test_built_bundle.js:522` 锁 38 |
| 动效 | §2.8 | 9→4 档（100/160/220/280ms）+ `prefers-reduced-motion: reduce` 0.001ms | `@media` 0 处；reduce 0 处 |

---

## 2. 落地 vs 回退对照

### 2.1 58b178a 已实现、HEAD 已消失 → 这些是“重做工”

> 本表“58b178a 落地证据”列的行号均属备份提交（HEAD 上这些文件已不存在）。

| # | 能力 | 58b178a 落地证据 | HEAD 现状 | 判定 |
|---|---|---|---|---|
| 1 | **ExUI 组件层** | `src/packages/ExUI/ExUI.js` **157 行**；card:25 / row:49 / prose:64 / empty:69 / btn:74 / field:87 / seg:102；8/8 面板接入 | 文件不存在；`Sign.js` 无 `ExUI.` 调用 | 重做 |
| 2 | **ExTheme 三态 + 第 9 磁贴** | `ExTheme.js` **202 行**；三态:17-21；cycle:112-118；9th:135-163；`main.js:95` 接线 | 文件不存在；`main.js` 无 `ExTheme` | 重做 |
| 3 | **dx 令牌 + 单层白** | `ExPanel.css:36-76`：`--dx-ink-1/2`、`--dx-surface-shell .34`、`--dx-surface-item .42`、`--miuix-card-bg: transparent` | `:10/:15/:19` 旧值 0.65/0.42/0.35；无 `--dx-` | 重做 |
| 4 | **Dock 78/39（修 2px 溢出）** | `58b178a:ExPanel.css:89-90` 78px / 39px | `:37-38` 76px / 38px | 重做（小项） |
| 5 | **focus-visible** | `58b178a:ExPanel.css:3139-3152` 14 个选择器 / 2px `#0066ff` offset 2 | 仅 `:861`、`:2726`；16 处 `outline:none` | 重做 |
| 6 | **reduced-motion + 小窗** | `58b178a:ExPanel.css:3159` reduce 0.001ms；`:3179` 520px；`:3193` 560px | `@media` 0 处、reduce 0 处 | 重做 |
| 7 | **ESC 统一** | `58b178a:ExPanel.js:731-743` + capture 绑定 `:811` | ExPanel 0 处 `keydown/Escape`；仅 GiftPicker:301 / PopupPlayer:181,355 / VideoToolbarMenu:149 | 重做 |
| 8 | **磁贴 ARIA** | `58b178a:ExPanel.js:646-670` decorate + `:767-780` MutationObserver | `ExPanel.js` 0 处 role/tabindex；aria 只有 `:411/:600` 两个关闭钮的 aria-label | 重做 |
| 9 | **内联样式清零** | ExpandTool **1 处**（HEAD 30 处） | `ExpandTool.js` 30 处 `style=`；LiveTool 16 处 | 重做 |
| 10 | **面板清单合一** | `58b178a:ExPanel.js:9` `EX_THIRD_LEVEL_PANELS` 10 项，`:923` 复用同一份 | `:6` 10 项 vs `:668-670` 11 项（多 `.ChatToolBar-DanmakuTail-Panel`、`.fans-panel`） | 重做 |
| 11 | **380 真源** | `58b178a:ExPanel.js:362/943-948` 先显形再量 | `:690` `var panelWidth = 380;` | 重做 |
| 12 | **门禁/测试** | `tools/ui-legacy-guard.mjs` 82 行；tests **32**（+test_ui_contract/test_theme）；`build.js:254-282` !important 棘轮，基线 2072 | `tools/` 不存在；tests **30**；`build.js` 0 处 `important`；`package.json` 无 guard | 重做 |
| 13 | **蓝药丸 + 墨色** | `ui-btn--accent` **11 个按钮 / 6 个包**（BarrageLoop:60、Enter:29-30、Gift:30-31、Mute:51-53、Reply:32-33、Vote:35）+ ExpandTool:244 `miuix-pill--accent`；`.ui-row__desc` 11.5px `#1e293b` | 无 `ui-btn`；desc 仍 10.5px `#64748b` | 重做 |

### 2.2 只写在文档里、从未实现

| # | 项 | 文档口径 | 为什么判定“没做” |
|---|---|---|---|
| 1 | **“托盘 transparent + 白片 0.62”** | UI-UX-REVIEW §2.1 | 58b178a 实际是 `0.34 + 0.42`（`58b178a:ExPanel.css:47-48`）；PLAN.md:87/104 明确判其作废。 |
| 2 | **`!important` 拆到 15–20%** | §3 | 58b178a 只加“只降不升”棘轮（2072）；HEAD 仍 **1526/1607 = 94.96%**。 |
| 3 | **z-index 13→5 档** | §10.5、preview/README §已知边界 2 | 58b178a 只建 3 个令牌（`58b178a:ExPanel.css:61-63`），10000/100030/100080 等原值仍在；HEAD 同样未收敛。 |
| 4 | **字号/圆角/时长 13/14/9 → 5/6/4** | §3 | 58b178a 只建 4 个时长令牌（`58b178a:ExPanel.css:57-60`），没有全量替换；HEAD 无令牌。 |
| 5 | **“同时把斗鱼切深”做成子开关** | UI-UX-REVIEW §2.6、PLAN §9-4 | 58b178a 不是子开关：`58b178a:ExTheme.js:106/116` 在切 light/dark 时**自动**写 cookie，没有 UI 开关。 |
| 6 | **触屏“只开不关”** | PLAN-v3 §4 P0 | 代码可推导 `forceOpen`，但 verify-ego 没有触屏测试；属“未验证”，不是“已实现”。 |

### 2.3 旧审计问题在 HEAD 的存活状态（重新验过）

| # | 旧问题 | 旧证据 | HEAD 证据 | 仍存在？ |
|---|---|---|---|---|
| 1 | 8 个磁贴 0 可聚焦 | `live/a11y-keyboard.json`：8/8 `hasTabIndex:false, role:null, aria:null` | `ExPanel.js:438-448` 只建名字；`:450-491` 只补指示条/图标/hover；0 处 role/tabindex | **是** |
| 2 | ESC 7/8 无响应 | `live/README.md:103` | ExPanel 0 处 `keydown/Escape`；仅 3 个包自带分支 | **是** |
| 3 | 焦点不可见 | `live/a11y-esc-click.json`：`outlineStyle:none` | 2 条 focus-visible；16 处 `outline:none` | **是** |
| 4 | 副标题 10.5px / 2.91:1 | `live/README.md:89` | `:708-716` 10.5px `#64748b` | **是** |
| 5 | 开关关态 1.26–1.38:1 | `live/README.md:91` | `:730` `rgba(0,0,0,.14)`；属**知情接受**，不修 | **是（豁免）** |
| 6 | 面板清单两份不一致 | findings-interaction I-07 | `:6` 10 项 vs `:668-670` 11 项 | **是** |
| 7 | JS 第二份 380 真源 | findings-css F-01 | `:690` `var panelWidth = 380;` | **是** |
| 8 | 裸蓝字 | verify-a11y §5：12 条 | `color: var(--miuix-blue)` **24 条** | **是，且翻倍** |
| 9 | `@media` 0 处 | UI-UX-REVIEW §3 | 解析计数 `@media = 0`、`prefers-reduced-motion = 0` | **是** |
| 10 | 粘底压 17–32.4px | `live/README.md:247-251` | `common.js:599-603` 与 CSS `:876-883` 未变 | **是（设计保留）** |

### 2.4 结论变化（必须在下一份 plan 里改口）

1. **G2 的 0.62 → 0.617**：§2.1 写“卡片 0.62、壳 transparent”，§2.7.1 又写“托盘 0.34 + 白片 0.42 = 0.617、卡片 transparent”；58b178a 落地的是后者，PLAN.md D1 把前者判作废。下一份 plan 只保留 **0.617** 这个数，避免重做时再分叉。
2. **主题默认值已不是待决项**：58b178a `ExTheme.js:21` 默认 `auto`，`58b178a:tests/test_theme.js:57` 已断言；HEAD 只是把整包删了，不是把默认值改回 `light`。
3. **主按钮 44 已被用户拍板过**：PLAN.md:288 仍把 38→44 写成“待拍板”，但 `verify-ego-2026-11-02.md:41` 记“用户 2026-11-02 拍板改的档位”，58b178a 已落 44。HEAD 的 38px 是回退结果，不是新决策。
4. **蓝药丸只完成了“入口级”**：58b178a 改了 **11 个 `ui-btn--accent` 按钮（6 个包）** + 1 个 `miuix-pill--accent`，verify-a11y §5 仍列出 12 条裸蓝；它是“部分落地”，不是“全部完成”。

---

## 3. 验收证据链

### 3.1 两份 verify 各自证明了什么

> “verify-a11y”列的行号是该报告自述快照（3779 行 / 5932aa）的行号，不是 HEAD；verify-ego 没有给 md5。

| 文档 | 证据类型 / 快照 | 实际证明（数字） | 不能证明 |
|---|---|---|---|
| [verify-a11y-2026-11-02.md](verify-a11y-2026-11-02.md) | **静态计算 + 源码核对**；自述 ExPanel.css 3779 行 / md5 5932aa；未跑 build/test/浏览器 | 8/8 磁贴语义（`ExPanel.js:644-656`）；第 9 磁贴（`ExTheme.js:142-144`）；6/6 开关 aria；ESC 统一（`ExPanel.js:729-741`，capture `:774`）；focus-visible 覆盖 12 类、缺 2 处；**47 处不达标**（A 33 文字 + B 6 反白 + C 5 图形 + D 3 黑夜）；裸蓝 12 条 | 运行期 DOM、真实视频帧下的对比度、backdrop-filter 色度增益、HEAD 现状（快照不同）、焦点环是否肉眼可见 |
| [verify-ego-2026-11-02.md](verify-ego-2026-11-02.md) | **真机 ego lite**，斗鱼 9999，全程静音；v4 构建 | 9 磁贴、**9/9** 语义；ESC 真键收起；三态循环 `["light","dark","auto"]`；黑夜 `0.18 + brightness(.45)`；主按钮 **44px**；关闭钮命中 **44**；面板宽 **380**；Dock **622×78**、磁贴 **56×56**；8 面板 C1–C8 宽度一致 | 真实 Tab 进 Dock（被斗鱼搜索框抢走）；最后一次键盘/aria 补丁的真机复验；4 个面板只做 DOM 断言、无逐面板截图；触屏；焦点环目视；逐像素对比度 |

**就绪数字（直接回答任务）**：
- **磁贴语义 9/9**：verify-ego 运行时成立；verify-a11y 代码层成立；**HEAD 是 0/8**（`ExPanel.js` 0 处 role/tabindex）。
- **ESC**：verify-ego 真键通过；verify-a11y 代码层统一；**HEAD 没有** ExPanel 级 ESC。
- **对比度读数**：verify-a11y 不是“通过”，是 **47 条欠账**；典型值 `#0066ff` 1.79、`.popup-ms__*` 2.55–3.15、状态色 1.06–1.99。
- **主题**：verify-ego 三态循环与黑夜取值通过；无纯白帧真机图（只有 CSS 渲染台 `H-*` 与合成模型）。

### 3.2 哪些是“声称”而非证据

1. **“8/8 ExUI 覆盖”**：verify-ego:107 声称 8/8，但 verify-ego:92 又承认 4 个面板只做 DOM 断言；没有 8 份逐面板结构 dump。
2. **“`aria-expanded` 随开合变化”**：verify-ego:29 声称；verify-a11y:77-78 说全仓只有一次 `aria-expanded` 且恒 `false`；verify-ego:86-87 又说该补丁未真机复验——三方不一致。
3. **“焦点环可见”**：规则存在（verify-a11y:112-127），但 verify-ego:50 明确“程序化 `focus()` 不触发 `:focus-visible`，真实 Tab 路径没跑成”。
4. **“触屏只开不关”**：没有任何触屏测试记录。
5. **“47 处已修”**：verify-a11y:184-255 是**修前欠账清单**；PLAN.md W2 说“58 处收敛”，但没有按同一口径重跑那 47 条。
6. **“33 套件”**：verify-ego:17/100 写 33；58b178a 实际是 **32 个 `test_*.js` + 1 个 `ui-legacy-guard` 命令 = 33 条**；HEAD 是 30 个测试、无 guard。数字没错，但不能当成“33 个独立测试文件”。

### 3.3 可复用素材

| 目录 | 实有内容（`ls` 计数） | 可怎么用 |
|---|---|---|
| [live/](live/) | 根目录 **52 PNG** + `v4-verify/` **49 PNG**（共 101）、**22 JSON**、**9 份 DOM**、36 个 ego 脚本 | 命名规律：`NN-panel-<name>{,-crop,-bottom}.png`、`dock-0N-<state>{,-crop}.png`、`vp-1280x720-dpr1-*` / `vp-1024x576-dpr1.25-*`；DOM 快照可直接还原 8 个面板。 |
| live JSON | 3 组：`styles-*`（Dock/面板计算样式）、`measure-*`（矩形/粘连/遮挡/视口）、`contrast-*` / `a11y-*` / `interaction-*`；另有 5 份 `theme-*` | `a11y-keyboard.json` 是 HEAD 基线“0 可聚焦”的铁证；`contrast-ratios.json` 是像素级欠账；`measure-viewport.json` 是 1280/1024 无越界证据。 |
| [preview/](preview/) | **55 张 shots**、6 套 `after-*.css`、`harness.html/js`、`parts.js`、`serve.mjs`、`switch-compare.html` | `node preview/serve.mjs` → `http://127.0.0.1:8899/.../harness.html?skin=glass2`；6 条路线：`glass2`（G2）/ `dark`（D）/ `dark2`（D2）/ `glass`（G）/ `glass3`（G3）/ `card`（B）。 |
| preview 真帧 | `assets/frame-dark.png` 亮度均值 **82/255**；`frame-light.png` **145/255** | 只覆盖两档亮度；纯黑/纯白只存在于合成模型（preview/README §已知边界 3）。 |
| 旧图 | `shots/34-tiers.png` 13/38/80 三档；`58-dark2-pure-white.png` D2 纯白；`38-switch-nohalo.png` 开关对照 | 可当“取值示意”，不能当 HEAD 现状截图。 |

---

## 4. 4 条待拍板

> 采用 [PLAN.md](PLAN.md) §9 的现行 4 条（原文照抄，`PLAN.md:287-290`）。理由里的数字均来自旧文实测。
> UI-UX-REVIEW §8 的 4 条旧口径见 §4.1，已在 58b178a 落地时被回答。
> 最后一列的“文件:行”均指 58b178a（HEAD 上这些文件已不存在）。

| # | 原文（照抄） | 推荐默认 | 理由（旧文数字） | 58b178a 当时怎么做的 |
|---|---|---|---|---|
| 1 | **蓝药丸化**（F-09）：`极速秒开 / 导出 / 导入 / 名单 / 面板` 这批裸蓝字（29 处、2.14:1）改成**蓝底白字药丸**？这是 W2 里观感变化最大的单项；不点就在玻璃上继续不达标。 | **做**，但只做文字位；填充用 `#fff` on `#0066ff` | 裸蓝在 0.617 上 **1.6–1.8**；换 `#0047b3` 也只 **3.05**；白字蓝底 **4.83** 是唯一过线方式。 | 已改 11 个按钮 / 6 个包为 `ui-btn--accent` + 极速秒开 pill（BarrageLoop:60、Enter:29-30、Gift:30-31、Mute:51-53、Reply:32-33、Vote:35、ExpandTool:244） |
| 2 | **主按钮 38→44**（F-07/I-13 的最后一档）：要动仓库测试场景 11 的 `height: 38px` 断言。改 or 不改？（关闭钮的 44 命中区不受此限，W1 照做） | **改成 44**，同批改 `tests/test_built_bundle.js:522` | 关闭钮 44 命中区已验证；44 是 `--dx-control-lg`；38 是最硬的一处旧锁（测试场景 11 直接断言 height）。 | 已落 44（`58b178a:ExPanel.css:18/3079`），测试同步 |
| 3 | **W5 的投放时机**：黑夜态 + 三态 + 第 9 磁贴是压进**同一个 NEXT 包**，还是等 W1–W3 验收后再单独出一个包？（建议后者：先把"用不了"和"读不出"修好，再上新皮肤） | **单独一包**，W1–W3 验收后 | 深色段约 **290 行**（`58b178a:ExPanel.css:3395-3684`）+ `ExTheme.js` 202 行；亮色态已有 44 条（A33+B6+C5）+ 黑夜 3 条欠账，混在一起无法定位。 | 压进同一包（verify-ego 一次测 9 磁贴 + 黑夜） |
| 4 | **"同时把斗鱼切深"子开关**：黑夜态要不要带这个（写 cookie + `StorageEvent`，实测 400ms 免刷新生效）？带了就没有割裂感，但会改宿主页面的主题。 | **做成显式子开关，默认关** | 写宿主 cookie 会改页面主题；旧文实测 5s 后可能回落（4629/6369/6715ms 三次）；400ms 生效只证明“能切”，不证明“稳定”。 | 自动执行：`58b178a:ExTheme.js:106/116` 在切 light/dark 时写 cookie，无开关 |

> 计数口径：PLAN 的 **29 处** = 全仓文字位（含包级 CSS 与内联）；verify-a11y 的 **12 条**只数 `ExPanel.css` 的 `color: var(--miuix-blue)`；HEAD 本轮 grep 是 **24 条**（同一口径）。

### 4.1 旧 UI-UX-REVIEW §8 四条的去向（备查）

| 旧问题 | 原文要点 | 落地时怎么回答的 |
|---|---|---|
| 说明文字墨色 | `0.62 + #1e293b`（5.46 / 38%） vs `0.70 + #334155`（4.94 / 30%） | 选前者；`#334155` 在 0.62 上只有 **3.86**，不达标。最终按 D1 的 0.617 + `#1e293b`。 |
| 蓝色药丸化 | PLAN §9-1 | 已部分落地（11 个按钮 / 6 个包 + 极速秒开 pill），剩余 12 条裸蓝仍需收。 |
| 先做哪批 | B1+B2 先，还是把 B2.5/B2.6 压进同一包 | 实际改成 W0–W6 风险序；W5 单独后置（PLAN.md §5）。 |
| 主题默认值 | `auto` vs `light` | 选 `auto`；`58b178a:ExTheme.js:21` 默认 auto，`58b178a:tests/test_theme.js:57` 断言。 |

---

## 5. metrics 工具清单

> 位置：[metrics/](metrics/)。**必须从仓库根跑**（脚本用 `process.cwd()` + 相对 `src/...`）：
> `cd D:/DouyuEx-RL && node docs/ui-audit-2026-11-01/metrics/<script>.mjs`
> 实有 **17 个 .mjs / 22 个 .json**（旧文写 12 / 20）。17/17 `node --check` 通过。

| # | 脚本 | 作用 | 输出 | HEAD 可跑？ | 备注 |
|---|---|---|---|---|---|
| 1 | `analyze-css.mjs` | 全量 CSS 盘点：规则/颜色/排版/几何/动效/令牌/重复 | `css-inventory` `css-colors` `css-typography` `css-geometry` `css-motion` `css-tokens` `css-duplicates`（7） | ✅ 读 HEAD 的 ExPanel.css + ExIcon.css；但会写 metrics | 唯一能产出“HEAD 当前真实计数”的一类 |
| 2 | `analyze-selectors.mjs` | 类名频次、命中区、最小字号、章节 | `css-selectors` `css-target-size` `css-small-fonts` `css-sections`（4） | ✅ 同上 | 同上 |
| 3 | `analyze-tranches.mjs` | `!important` 分档 | `css-important-tranches`（1） | ✅ 同上 | 可复核 94.96% |
| 4 | `analyze-conflicts.mjs` | 同一选择器重复属性冲突 | `css-conflicts`（1）+ `css-tokenv2-tmp.json`（临时） | ✅ 同上 | 会多写一个临时文件（`:36`），本轮未跑 |
| 5 | `contrast.mjs` | 玻璃/实色对比度合成 | `css-contrast-glass` `css-contrast-solid` `css-contrast-summary`（3） | ⚠️ 能跑，但模型写死 0.65/0.62 | 不读 HEAD 令牌 |
| 6 | `contrast-claims.mjs` | 复核“声称值”，给 token 候选 | `css-contrast-claims` `css-token-v2-candidates`（2） | ⚠️ 同上 | 固定 0.65 面板 |
| 7 | `crosscheck.mjs` | 深/浅面板浮色交叉核对 | `css-crosscheck`（1） | ⚠️ 同上 | 固定 `PANEL_DARK_F` |
| 8 | `frame-matrix.mjs` | 墨色 × 0.65/0.72/0.90 白卡 × 三帧 | `css-frame-matrix`（1） | ⚠️ 同上 | 与 G2 0.617 不同 |
| 9 | `route-analysis.mjs` | 反解“达到 AA 所需最小 alpha” | `css-route-analysis`（1） | ⚠️ 同上 | 设计求解，不是现状 |
| 10 | `token-v2.mjs` | alpha 梯度 / 蓝色求解 / 墨色表 | `css-token-v2-derivation`（1） | ⚠️ 同上 | 同上 |
| 11 | `dark-glass.mjs` | 深玻璃 alpha 0.55/0.62/0.70 表 | **stdout** | ✅ 已实跑 | 纯打印，无写文件 |
| 12 | `dark-glass-plus.mjs` | brightness × alpha 矩阵 | **stdout** | ✅ 可跑 | 纯打印 |
| 13 | `glass-plus-matrix.mjs` | 白玻璃 alpha 0.20–0.87 × 墨色 | **stdout** | ✅ 可跑 | 纯打印 |
| 14 | `glass-v2-matrix.mjs` | 白/深两套玻璃矩阵 | **stdout** | ✅ 可跑 | 纯打印 |
| 15 | `lead-alpha-matrix.mjs` | 0.65/0.78/0.84/0.90 × 四帧 | **stdout** | ✅ 可跑 | 纯打印 |
| 16 | `lead-contrast.mjs` | 实测色对（含 0.42 档） | **stdout（JSON）** | ✅ 已实跑 | 纯打印 |
| 17 | `switch-nohalo.mjs` | 开关描边 alpha 0.6/0.7/0.8 | **stdout** | ✅ 已实跑 | 输出 0.7 档 4.24 / 4.81 |

**回退后能不能跑**：
- **7 个纯 stdout（11–17）**：能，且本轮已实跑（不写文件）。
- **4 个读 HEAD CSS（1–4）**：能，会产出 HEAD 当前值；但会写 `metrics/*.json`，本轮按“唯一写入自己的输出文件”未跑。若要跑，先把 `OUT` 改到临时目录。
- **6 个固定模型（5–10）**：语法能跑，但输入 alpha 写死 0.65/0.62，与 HEAD 的 0.65/0.42/0.35、G2 的 0.617 都不一致；**跑出来的数不能当 HEAD 结论**。
- 所有脚本都依赖 `src/packages/ExPanel/ExPanel.css`（存在）与 `src/packages/ExIcon/ExIcon.css`（存在），回退没有删这两个文件，所以“找不到输入”不是问题；问题是**写文件**与**模型过期**。

---

## 6. 参考

- [UI-UX-REVIEW.md](UI-UX-REVIEW.md) · [PLAN.md](PLAN.md) · [PLAN-v3.md](PLAN-v3.md) · [PLAN-base.md](PLAN-base.md)
- [verify-a11y-2026-11-02.md](verify-a11y-2026-11-02.md) · [verify-ego-2026-11-02.md](verify-ego-2026-11-02.md)
- [live/README.md](live/README.md) · [preview/README.md](preview/README.md) · [metrics/](metrics/)
- 代码：`src/packages/ExPanel/ExPanel.css`、`src/packages/ExPanel/ExPanel.js`、`src/packages/ExIcon/ExIcon.js`、`src/common.js`

---

## 7. 给新 plan 的建议输入（10 条以内）

1. 先把表面取值钉成**一个数**：`0.34 + 0.42 = 0.617`（D1），把“托盘透明 + 白片 0.62”标成历史作废。
2. 把 58b178a 当**代码参考**而非基线：`ExUI.js / ExTheme.js / tests / tools` 可文件级取回；`ExPanel.css` 必须按 HEAD 行号重放，不能整文件搬。
3. 批次固定为 **W0 令牌+门禁 → W1 a11y → W2 墨色 → W3 ExUI → W4 治理 → W5 主题 → W6 收尾**，每批 build+test+截图。
4. **主按钮 44 与 `tests/test_built_bundle.js:522` 的 38px 断言同批改**，否则测试会挡住落地。
5. 键盘验收必须拿到**真实 Tab 进 Dock + 焦点环可见**的证据；`focus()` + 合成事件不算。
6. 触屏“只开不关”单独真机取证；现有 verify-ego 没有触屏证据。
7. 主题三态先只做 `auto` 的 CSS 属性选择器；“同时切斗鱼”做成**显式子开关，默认关**。
8. 对比度验收改为“读 HEAD 令牌 + 真实帧 + 像素采样”；verify-a11y 的 47 条是旧快照的 gap list，不是 HEAD 基线。
9. 每次验收记录 **ExPanel.css md5 + 行数 + 构建字节数**；5932aa/3779 与 2da1a2/3684 已经对不上，不能再靠行号口头对齐。
10. 文档里的“40 张截图 / 12 份 JSON / 20 份 JSON / 12 个脚本”改由脚本输出或 `ls` 生成；实际是 **live 52（另 v4-verify 49）/ live JSON 22 / metrics JSON 22 / 脚本 17**。


