# DouyuEx-RL · UI/UX 统一施工方案（唯一口径）· 2026-11-02

> 状态：**已执行（2026-11-02）** · 门禁全绿（build exit 0 / `npm test` exit 0 · 33 套件 / 旧类名门禁通过）· **未提交 git**（按用户要求）
> 落地对账见下面「施工状态」表；真机读数见 [verify-ego-2026-11-02.md](verify-ego-2026-11-02.md)。
> 本文件**取代** `PLAN-base.md`（底层梳理 v4）与 `PLAN-v3.md`（G2 + M0–M5）中相互冲突的那部分结论；两份旧文降为历史留档，无争议内容已并入本文。
> 证据源（本文不复制其正文，按需回查）：
> · [findings-css.md](findings-css.md) —— CSS 静态审计 26 条（F-01…F-26）+ token 提案 + `!important` 分档
> · [findings-interaction.md](findings-interaction.md) —— 交互/可达性审计 22 条（I-01…I-22）
> · [UI-UX-REVIEW.md](UI-UX-REVIEW.md) —— 定版取值（G2 / D2 / 三态 / 第 9 磁贴 / 开关不动）
> · `live/`（40 张真机截图 + 12 份实测 JSON）、`metrics/`（20 份 JSON + 12 个可重跑脚本）


---

## ⚠ 施工状态（2026-11-02 实况 · 本文已执行）

> 本节是"计划 vs 落地"的对账表。门禁数字与真机读数见
> [verify-ego-2026-11-02.md](verify-ego-2026-11-02.md) 与 [verify-a11y-2026-11-02.md](verify-a11y-2026-11-02.md)。

| 波次 | 状态 | 落地内容 | 证据 |
|---|---|---|---|
| **W0 止血** | ✅ 完成 | `!important` 棘轮进 `build.js`（只降不升，2197→**2150**）；`ui-legacy-guard` 接进 `npm test`；新增 `tests/test_ui_contract.js`；删 6 条死规则（livetool 开关槽/sp an 小按钮/popup 旧类）；`- 52px` 魔法数改 `--dx-header-h` | build exit 0 / npm test exit 0（33 套件） |
| **W1 可达性** | ✅ 完成 | 9 个 Dock 磁贴 + 精灵球 + 弹幕小尾巴全部补 `role/tabindex/aria-label`（`aria-expanded` 随开合）；`MutationObserver` 盯 Dock 子节点（各包晚于 ExPanel 插磁贴）；ESC 统一在 `ExPanel.js`；`focus-visible` 一条规则收口 16 处 `outline:none`；6 个开关补可访问名；关闭钮 44 命中区（`::after`） | 真机：9/9 磁贴语义齐全；ESC 关闭通过 |
| **W2 墨色** | ✅ 完成 | 58 处色值收敛到 `--dx-ink-2 / --dx-accent-ink / --dx-state-danger`；裸蓝字退出文字位（文字位 20 处 → accent-ink，5 个入口改蓝药丸）；版本更新 6 个状态按钮白字全部 ≥4.5；包级 CSS 4 处裸 `#0066ff` 一并收口 | `test_ui_contract` + verify-a11y 复核 |
| **W3 迁移** | ✅ 8/8 面板 | 已迁：一键签到（先行样板）、版本更新、全站抽奖、一键续牌、弹幕小助手、同屏播放 + 直播间工具（10 个假 span 按钮 → 真 `<button class="ui-btn ui-btn--accent">`）。`ExUI` 补齐 `field/seg/stat` 与 `accent` 变体 | guard：`fans-panel__card` 46→18、`livetool__cell` 21→11、`popup-panel__card` 7→1、`bloop__` 52→51 |
| **W4 治理** | 🟡 完成 3/6 | 完成：`backdrop-filter` 由 13 层收到 6 层（5 个 livetool 子面板 + postbird 容器置 none）、`prefers-reduced-motion` 全量降级、两档 `@media`（520 / 560）、JS 里的第二份 380 真源删除（先显形再量）、160ms/200ms 计时错位修正 + hover 取消、同源 iframe 登记、归位清内联定位 | 未做：`transition: all` 全量拆分、Dock 盒模型 2px 溢出、`!important` tranche 1/2 拆除（见下） |
| **W5 黑夜态** | ✅ 完成 | 新包 `ExTheme`（`ExSave_theme`，三态 light/dark/auto，默认 auto）；判据纯 CSS 属性选择器；内置「同时把斗鱼切深」（写 cookie + `StorageEvent`）；Dock 第 9 磁贴（sun / moon-stars / circle-half 三枚图标入池）；`tests/test_theme.js` 回归 | 真机：三态循环 `["light","dark","auto"]`；黑夜 Dock `rgba(16,20,26,0.18)` + `brightness(0.45)` |
| **W6 收尾** | ✅ 完成 | 完成：`dx-*` 令牌层（尺寸/圆角/字号/行高/墨色/表面/动效/z-index）+ `miuix-*` 别名；主按钮 38→44（测试同步）；ExpandTool 包 44 处内联样式清零（改 `.ui-stack/.ui-inline-*/.ui-num/.dx-hint`）；抽奖两态色与最小高度收进 CSS | 未做：旧别名规则批量删除（要等 W3 剩余 2 面板）、`fans-panel__asset-item` → `ui-stat`（value/label 顺序相反，需同批改 CSS） |

### 施工途中发现并修掉的 3 个真问题（计划里没有）

1. **`Enter.js` 误删名单**：`saveData_isEnter()` 在 `index === -1` 时 `splice(-1,1)` 会删掉数组最后一项 —— 没开过进场欢迎的房间点一下关闭，会把别的房间记录顶掉。已加 `index > -1` 守卫。
2. **Dock 底色写死**：`.ex-panel` 的背景是字面量 `rgba(255,255,255,0.34)`，黑夜态不跟；已改为 `var(--miuix-modal-bg)`。
3. **磁贴语义永远补不上**：各包在自己的 init 里插磁贴，晚于 `ExPanel` 的 init，所以初始化那次 `decorateTiles()` 面对的是空 wrap。已加 `MutationObserver` + 每次 Dock 重建补绑。

### 二轮补齐（2026-11-02 晚）

- **W3 收齐 8/8**：ExpandTool（14 行）、DanmakuHistory、LiveTool 五抽屉、BarrageLoop 容器、FansContinue 资产格全部改由 `.ui-card/.ui-row/.ui-field/.ui-stat` 产出；guard 里 `sign-option-item/desc`、`fans-panel__card`、`popup-panel__card`、`exupdate-panel__card` 全部归零。
- **W6 清零**：旧类名物理删除、`transition: all` 全量展开（0 处）、Dock 2px 溢出修掉（78px 高 / 39px 圆角 / 56 磁贴）。
- **二轮新修 4 个真 bug**：`..miuix-modal` 双点选择器导致"面板按钮 28px 三档"整条规则被丢弃；面板缺基色导致深色页面上白字压浅玻璃；黑夜态药丸被基类盖成灰；Update 旧类被测试硬绑。
- 验收：真机 8 面板巡场（`live/v4-verify/C1…C8`）+ 组件层渲染台三态（`H-light/H-dark/H-auto-dark`），读数见 [verify-ego-2026-11-02.md](verify-ego-2026-11-02.md) §C/§D。

### 仍然是"计划内但没做"的清单（下一轮）

- ~~W3 剩余 2 个面板~~ → 已完成（LiveTool 抽屉 + PopupPlayer I-11 焦点恢复）。
- W4：~~`transition: all` 26 处拆分~~（已 0 处）、~~Dock 2px 溢出~~（已修）、`!important` tranche 仍待做：**依赖把组件层选择器加 `.miuix-modal` 前缀提权**（否则被 `.miuix-modal button:not(…)` 0,2,1 的基类规则反压）。
- W6：旧别名规则物理删除、`.fans-panel__asset-item` → `.ui-stat`、`#vote__show-result` 等 ID 选择器的 `margin` 收进组件层。
- 真机：Tab 焦点环目视、4 个面板逐面板截图（详见验收记录 §4）。

---

## 0. 一页速览

| 项 | 结论 |
|---|---|
| **目标** | 观感按 G2 玻璃定版落地；底层从"八套各写各的 DOM"收敛到 `ExUI` + `.ui-*` 唯一契约；把"用不了"的（键盘/触屏/ESC/焦点）补齐 |
| **不动** | 开关造型（用户两轮否掉白晕与内环）、粘底操作条压正文（刻意设计）、`380/370` 尺寸真源、玻璃 alpha 现取值 |
| **唯一 P0** | I-01 键盘与触屏（10 个入口 Tab 可达 = 0；触屏 6/8 图标等于没反应） |
| **最大存量债** | `!important` 1532/1608（95.27%）· 内联样式 80+ 处 · 旧类名 5 组 · 双份真源 3 处 |
| **施工形态** | 7 个波次（W0–W6），每波独立 build+test+截图，可单独回滚；全部在 `DYEXRL-NEXT`，验收期**不升版本号** |
| **待用户拍板** | 4 条，见 §9 |

---

## 1. 基线（本会话实测，可复核）

| 事实 | 值 / 证据 |
|---|---|
| 分支与提交 | `main` @ `828cef7`（release 2026.11.01.01），工作区**有未提交改动** |
| 未提交内容 | `src/packages/ExUI/ExUI.js`、`src/packages/ExIcon/ExIcons.js`、`ExPanel.css`（+585 行）、`ExPanel.js`、`Sign.js`（已迁 `ExUI`）、`tools/ui-legacy-{guard.mjs,baseline.json}`、`docs/ui-audit-2026-11-01/`（整目录未入库） |
| 构建 | `node build.js` → **exit 0**（3 道 V8 核验全过，产物 1,142,041 字节） |
| 测试 | `npm test` → **exit 0**（30 个套件按 `package.json` 串联） |
| 旧类名门禁 | `node tools/ui-legacy-guard.mjs` → **通过**：`fans-panel__card` 46→40、`sign-option-item` 26→20、`sign-option-desc` 23→17（各 −6，来自 Sign 迁移）；`bloop__` 52、`livetool__cell` 21、`popup-panel__card` 7、`exupdate-panel__card` 4、`miuix-card__title` 1 全部持平 |
| `ExUI` 接入度 | **1/8 面板**：全仓仅 `Sign.js:60` 一处调用 `ExUI.` |
| 现役 token（`ExPanel.css` `:root`） | `--miuix-modal-bg: rgba(255,255,255,0.34)` · `--miuix-card-bg: transparent` · `--miuix-item-bg: rgba(255,255,255,0.42)` · `--miuix-item-hover: 0.56` · `--miuix-item-border: 1px solid rgba(255,255,255,0.55)` · `--miuix-blue: #0066ff` |
| 测试锁死的值 | 场景 11：提交按钮 `height: 38px`；场景 14：`380px/370px` 全产物各一次、包级 CSS 不得定义三级面板类名 |
| 门禁缺口 | `tools/ui-legacy-guard.mjs` **不在** `npm test` 里（现状靠人手动跑）；guard 支持 `--update` 回写基线 |

> **两条读数**：① 当前工作区是绿的，可以作为第一批的干净起点；② 表面 alpha 已经是"托盘 0.34 + 卡片 transparent + 白片 0.42"这套定版取值 —— **观感批不需要再动 alpha**。

---

## 2. 冻结决策（不再重开）

| # | 决策 | 出处 |
|---|---|---|
| D1 | **白天态 = G2 单层白片**：托盘 `0.34`（承担模糊与边界）、卡片 **transparent**（只做分组容器）、白片 `0.42` + `1px` 白边 `0.55`（`0.42/0.34` 叠出有效 `0.617`）。**"托盘透明 + 白片 0.62" 作废** | UI-UX-REVIEW §2.7.1（用户 2026-11-01 定，已落到代码） |
| D2 | 墨色只有两档：`#0f172a`（标题/正文）/ `#1e293b`（说明/元信息/未选中），说明文字 **11.5px**；主次靠字号与字重，不靠变浅 | 同上 §2.2 |
| D3 | 品牌蓝**只作填充**（蓝底白字 4.83），裸蓝字退出文字位 | 同上 §2.2 / F-09 |
| D4 | **开关造型不动**；关态轨道对卡片 1.2–1.3:1 属**知情接受**，不列待办 | 同上 §2.3 |
| D5 | 粘底操作条压正文 = 刻意设计，不改 | 同上 §1-4、§0 |
| D6 | Dock 选中态**不加白**：只留图标填色 + 底部指示条（+2px 上浮可选） | 同上 §2.7.1 |
| D7 | 黑夜态走 **D2 路线**：外壳 `rgba(16,20,26,0.18)` + `blur(30px) brightness(0.45)`，卡片 `rgba(16,20,26,0.14)`（等效 0.30 / 透光 70%）；墨 `#fff/#e2e8f0/#cbd5e1` + `#7db0ff`（仅图形） | 同上 §2.5 |
| D8 | 主题三态 `light/dark/auto`，默认 `auto`；"跟随"**用 CSS 属性选择器**（`html[data-mantine-color-scheme="dark"][data-dx-theme-mode="auto"]`），**不读 cookie、不用 class 判据、不轮询** | 同上 §2.6 |
| D9 | UI 改动归口 `ExPanel.css`（`.ui-*` 全写在这里）；`ExUI.js` 只产 DOM，不含颜色/尺寸字面量 | AGENTS.md 红线 + PLAN-base §2.3 |
| D10 | 组件对象命名 `ExUI`，与 `ExUI_stickActionBar` 无关系（文件头已写明） | PLAN-v3 §10.2/A5 |

---

## 3. 冲突仲裁（三份文档打架的地方，本文只认这一列）

| 冲突点 | 旧文档口径 | **本文裁定** | 为什么 |
|---|---|---|---|
| 白天表面取值 | `PLAN-v3` M0：托盘 transparent + 白片 0.62 | 托盘 0.34 + 卡片 transparent + 白片 0.42（D1） | §2.7.1 是**最后落地**的用户决定，且当前代码已是此值；再改是往回折腾 |
| token 表 | `findings-css` §8.4 整表（surface 0.90 / raised 0.96 / ink-3 `#475569`） | **只取**尺寸 / 圆角 / 字号 / 行高 / 字重 / 间距 / 动效 / z-index / 语义色；**表面与墨色两段作废**，改按 D1/D2 | 路线 B 是"诚实版白卡"，与 G2 玻璃互斥；照抄会一夜之间把玻璃刷成白墙 |
| 落地顺序 | `PLAN-base` B1–B8（按面板）、`PLAN-v3` M0–M5（混观感+结构）、`findings` 四批（按属性） | 按**风险序**重排 W0–W6：零观感 → 观感 → 结构 → 新皮肤 → 收尾 | 三份旧批次都把"改观感"和"改结构"塞在同一批，回滚时说不清是谁弄坏了观感 |
| 关闭出口 | `PLAN-v3` §4 P2："收敛到 `ExPanel_hidePanel()`" | 保留，但**与 I-06/I-08 同批做**（全屏遮罩与 iframe 都要登记） | 只收敛函数不改遮罩登记，等于换汤 |
| 命中区 | `PLAN-v3` §8.1：主按钮 38→44（需改测试） | 关闭钮 **44 命中区**（`::after` 撑开，视觉仍 26）先做；主按钮 38→44 **待拍板** | 场景 11 把 38px 写死了，动它=动门禁 |

---

## 4. 组件契约（唯一 DOM 出口）

```
.miuix-modal                    面板（玻璃托盘）
├─ .miuix-modal__header         面板头（现状保留）
└─ .miuix-modal__body
   └─ section.ui-card           分组容器（transparent，只有圆角+间距）
      ├─ .ui-card__head         .ui-card__title + .ui-card__aside
      └─ .ui-card__body
         ├─ label.ui-row        .ui-row__text(.ui-row__title/.ui-row__desc) + lead/trail 控件
         ├─ div.ui-prose        长正文
         └─ div.ui-empty        空状态
button.ui-btn.ui-btn--{primary|quiet|danger}
div.ui-seg（互斥单选）· label.ui-field（输入行）· ui-stat（统计块，待补）
```

| API | 现状 | 缺口 |
|---|---|---|
| `ExUI.card/row/prose/empty/btn/node` | 已实现（`ExUI.js` 93 行） | — |
| `ExUI.seg` / `field` / `stat` | **缺失** | W3 到同屏播放 / 续牌时补 |
| `.ui-*` 样式（12.1–12.5） | 已落地：卡片 / 行 / 正文 / 空态 / 按钮三档 | 缺 `ui-seg`/`ui-field`/`ui-stat` 规则；`.ui-btn` 高度 28 与主按钮 36 仍是字面量，W6 令牌化 |

> 判断标准仍用 `PLAN-base` 那一句：**一个角色只有一条规则**（测试场景 11/12 的"单一归属"口径），旧别名必须同步删干净，否则会撞。

---

## 5. 施工波次

> 每波结束都要：`node build.js`（exit 0）→ `npm test`（exit 0）→ `node tools/ui-legacy-guard.mjs`（通过）→ 受影响面板真机截图。任一条红即停，先修再进下一波。

### W0 · 止血（零观感，1 个提交）

| 项 | 内容 | 证据 |
|---|---|---|
| F-16 | 删 3 处重复规则 + 1 条死声明 + 失效的 `overflow`（≈ −20 行） | findings-css §5 |
| F-12 / F-17 / I-18 | 去掉 `min-height` 死锁与 `- 52px` 魔法数，改 `calc(var(--miuix-modal-height) - var(--dx-header-h))` | findings-css §4-5、findings-interaction I-18 |
| F-18 | 章节编号缺 21 / 重复 9 修正 | findings-css §5 |
| **新门禁** | `!important` 棘轮进 `build.js`（基线 `tests/baseline-important.json`，只降不升） | findings-css §10 第 1 步 |
| **新门禁** | `ui-legacy-guard` 接进 `npm test`（现在不在里面，靠人手动跑） | 本会话实测 |
| **新断言** | `tests/test_ui_contract.js`：`--miuix-card-bg` 必须是 `transparent`、白片只有一档；`.ui-row` 出现在产物里时不得带 `style=` | 防"有人把两层白改回来" |

**验收**：build/test 绿 + `!important` 计数下降且棘轮可红（故意加一条验证一次）+ 产物字节数不变或略减。

### W1 · 可达性（唯一 P0，观感几乎为零）

| 项 | 内容 |
|---|---|
| **I-01（P0）** | 二级 Dock 10 个入口 + 精灵球：`role="button"` + `tabindex="0"` + Enter/Space；触屏**只开不关**（不破坏 2026-10-31 的"点外面就关"） |
| I-02 | 统一「移过去→点一下」语义：8 个图标 2 种相反结果收敛为一种（hover 开、click 留） |
| I-03 | ESC 统一在面板外壳 `keydown` 收口，删 `PopupPlayer.js:354-370` 的私有实现 |
| I-04 / F-08 | 16 处 `outline:none !important` → 一条 `:focus-visible { outline: 2px solid #0066ff; outline-offset: 2px }`，静态观感为零 |
| I-05 | 6 个开关补 `aria-label`（Enter/Gift/Mute/Reply/Vote×2） |
| I-20 | 精灵球可访问名 + 更新红点对 AT 可见 |
| I-13（部分） | 关闭钮 44×44 命中区（`::after` 撑开，视觉仍 26） |

**验收**：Tab 走一圈能进 8 个磁贴 + 精灵球；ESC 逐面板可关；`:focus-visible` 在静态截图里不可见（对比度与像素差均不变）。

### W2 · 墨色与对比度（观感：说明文字变清晰）

| 项 | 现状 → 定版 |
|---|---|
| F-02 | 副标题 `#64748b` 10.5px（2.11:1）→ `#1e293b` 11.5px（5.46:1）——**已在 `.ui-row__desc` 落地，剩余旧类名逐处替换** |
| F-03 | `#94a3b8` 当文字/图标（1.03–1.14:1）→ 空状态 `#1e293b`；图标改 `#1e293b` |
| F-05 | 分段胶囊未选中 1.87:1 → `#1e293b` on 白片 |
| F-04 | 更新控制台 6 个状态按钮里 4 个白字不达标 → 按 D3 改填充/墨 |
| F-09 | 29 处裸蓝字 2.14:1 → 蓝药丸（`ui-btn--accent`）· **待拍板（§9-1）** |

**验收**：`metrics/contrast.mjs` 重跑，四条墨色全部 ≥4.5；真机暗帧/亮帧各一张。

### W3 · `ExUI` 迁移（7 个面板，一面板一提交）

| 批 | 面板 | 迁移内容 | 旧类名基线（现→目标） |
|---|---|---|---|
| —— | 一键签到 | **已完成**（`Sign.js:60`），作为样板 | `fans-panel__card` 46→40 · `sign-option-item` 26→20 · `sign-option-desc` 23→17 |
| W3-1 | 版本更新 | card + prose（最小形态） | `exupdate-panel__card` 4→0 |
| W3-2 | 全站抽奖 | card + row + empty | 抽奖私有类 → 0 |
| W3-3 | 一键续牌 | card + row + `ui-stat`（需新增） | `asset-item`/`badge-row` → 0 |
| W3-4 | 同屏播放 | card + row + `ui-seg` + `ui-field`（需新增） | `popup-panel__card` 7→0 + I-11 焦点丢失一并修 |
| W3-5 | 直播间工具 | card + row + **真按钮**（现在是 span 假按钮） | `livetool__cell` 21→0 |
| W3-6 | 扩展功能 | card + row + btn，**清 30 处内联** | `fans-panel__card` 40→0 的剩余部分 |
| W3-7 | 弹幕小助手 | card + row + field + seg，**清 52 处 `bloop__` + 7 处内联** | `bloop__` 52→0 |

附带同批修：I-14（4 种 card 前缀 → 1 种）· I-15（`FansContinue` 关闭后蓝条常亮 → 单出口）· I-07（两份面板清单合一为 `EX_THIRD_LEVEL_PANELS`）· I-19（死条目 `.fans-panel`/`exlottery-icon`/`danmaku-history`）。

**验收**：每个面板迁移前后同位置截图做像素差；**差异必须能解释并写进提交信息**（内联样式清零必然有 1px 级差异）。`ui-legacy-guard --update` 只在**该面板确实变少**时回写基线，并在提交信息里写新计数。

### W4 · 系统治理与性能（无观感）

| 项 | 内容 |
|---|---|
| F-14 · §7.4 | `backdrop-filter` 10 层 → **2 层**（外壳 1 + Dock 胶囊 1），半径和 120→56px；拆 `transition: all` |
| F-15 | 开关按压缩放从 `width` 动画改 `transform` |
| F-10 / F-11 / F-13 | Dock 盒模型 2px 溢出、Dock 缺 `max-width`、补两档 `@media`（小窗 `max-width`） |
| F-06 | `prefers-reduced-motion: reduce` 统一降为 0.001ms（47 条动画） |
| F-01 / I-12 | JS 去掉第二份 `380` 真源与 `|| 360` 兜底 → 先显形再量 |
| I-09 / I-10 | 160ms 定时器与 200ms 收场动画对齐，hover 路径取消计时器；磁贴横扫加防抖（手册写着 400ms，代码里没有） |
| I-06 / I-08 | `PostbirdAlertBox` 全屏遮罩登记为菜单面；iframe 区域点击的兜底路径 |
| I-16 / I-17 | 存储写失败不再误报"JSON格式错误"；Dock 归位后清 `position:fixed` 内联残留 |

**验收**：面板打开时 `filter` 层数实测 = 2；reduced-motion 下动画时长 ≈0；`grep -c "380" src/` 只剩 token 一处。

### W5 · 黑夜态 D2 + 主题三态 + Dock 第 9 磁贴（新功能）

| 项 | 内容 |
|---|---|
| D2 皮肤 | 外壳 `rgba(16,20,26,0.18)` + `blur(30px) saturate(130%) brightness(0.45)`；卡片 `rgba(16,20,26,0.14)`；墨 4 档；`#7db0ff` 仅图形；输入框 `rgba(255,255,255,0.08)`；分割线 `rgba(255,255,255,0.10)`；开关轨道由黑 14% 反转为白 22%（造型仍不动） |
| 三态 | `ExSave_theme = light|dark|auto`；`html[data-dx-theme]` + `[data-dx-theme-mode]`；「跟随」纯 CSS 属性选择器；`MutationObserver` 只盯 `html[data-mantine-color-scheme]`，另在 `visibilitychange` 与三级面板打开时补一次；**不轮询、不读 cookie 判据、不用 class** |
| 第 9 磁贴 | 位置在 8 个之后（胶囊 556→602px，1024 视口已出图）；单击循环 白天→黑夜→跟随；图标 `sun`/`moon-stars`/`circle-half`；`aria-live="polite"` 播报；与 8 个磁贴同批具备 `role/tabindex`/`aria-label`/`title` |
| 可选子开关 | 「同时把斗鱼切深」= 写 cookie `mantine-color-scheme-value` + 派发 `StorageEvent`（实测 400ms 内生效、免刷新）——**待拍板（§9-4）** |

**验收**：四种画面（黑场/暗帧/亮帧/纯白）各一张截图；纯白帧白字 ≥4.5；切换瞬间无闪烁（首屏先按 `auto` 探一次再渲染 Dock）。

### W6 · 设计系统收尾

| 项 | 内容 |
|---|---|
| 令牌 | 取 `findings-css` §8.4 的**尺寸/圆角/字号/行高/字重/间距/动效/z-index/语义色**九段；表面与墨色按 D1/D2 重写（不是照抄） |
| 字号圆角收敛 | 13→5 档字号 · 14→8 档圆角 · 9→4 档时长（映射表见 §8.5）。`ExPanel.css` 现每条规则带 `!important`，此项必须与 `!important` 拆分同批做 |
| 零散 P3 | F-19 次级说明四套参数 · F-20 行高与字号不联动 · F-21 `#ff3b30` 出体系 · F-22 数据 URI 颜色 · F-23 `ExIcon.css` 脱离体系 · F-24 图标三档尺寸 · F-25 `cursor` 与真实可交互不一致 · F-26 选中/悬停位移打架 |
| 杂项 | I-21 `freetimed` 补 `ExSave_` 前缀 · I-22 小助手标题双写 |
| 旧类名清算 | W3 全部完成后一次性删除别名规则与旧类名，`ui-legacy-baseline.json` 归零 |
| 内联样式 | `grep 'style="'` 在 `src/packages/**` 归零（ExpandTool 30 / 其余合计 50+） |
| 主按钮尺寸 | 38→44 **待拍板（§9-2）**，动它必须同步改测试场景 11 的断言 |

---

## 6. 门禁总表

| 门禁 | 触发 | 通过标准 |
|---|---|---|
| 构建三核验 | `node build.js` | exit 0（模板/展开/压缩三份 `new vm.Script` 全过） |
| 全量测试 | `npm test` | exit 0（30 套件；**别接管道**，管道会吃掉退出码） |
| 旧类名只减不增 | `node tools/ui-legacy-guard.mjs` | 通过；W0 起接进 `npm test` |
| `!important` 棘轮 | `build.js` 内联 | 只降不升（W0 起） |
| 单层白断言 | `tests/test_ui_contract.js` | `--miuix-card-bg === transparent`、白片一档、`.ui-row` 无内联 style |
| 红线 | 场景 14 + grep | `380px`/`370px` 全产物各 1 次；包级 CSS 不定义 8 个面板类名 |
| 观感 | 迁移前后截图 | 像素差可解释；不可解释即回滚 |
| 对比度 | `metrics/contrast.mjs` + 真机 | 墨 ≥4.5、图形 ≥3.0（D4 的开关关态为**知情豁免**） |

---

## 7. 风险登记

| # | 风险 | 影响 | 对策 |
|---|---|---|---|
| R1 | 有人照着 `findings-css` §8.4 把表面改成 0.90 | 玻璃一夜变白墙，全部对比度结论失效 | §3 已裁定作废那两段；`ui_contract` 断言 `card-bg === transparent` 兜住 |
| R2 | 主按钮 38→44 撞测试场景 11 | 门禁红 | 先改断言再改样式，且需要用户点头（§9-2） |
| R3 | W3-6/W3-7 两个大包（30 / 52 处）中途卡住，留下半新半旧 | 比现状更乱 | 一包一提交；允许拆成"内联清零、类名保留"两个提交 |
| R4 | 迁移引入 1px 级观感差异 | 被判定为"又改坏了" | 同位置截图 + 差异写进提交信息；差异 >2px 即回滚 |
| R5 | ego/bsk 旧会话注入旧 bundle | 误判"回退" | 每次验证开**新空间**并打印注入包指纹（版本号 + 行数）；用完 `bsk session stop` |
| R6 | `ui-legacy-guard --update` 被随手用来"变绿" | 门禁失效 | 只允许在**该面板确实迁移完成**的提交里回写，并把新计数写进提交信息 |
| R7 | `ExGuard_*` 调用点早于声明 | 整包 TDZ 全灭（插件消失） | 新增调用前确认声明位置；`tests/test_exguard_tdz.js` 已存在，改动后必跑 |
| R8 | W5 的 `brightness` 在低端 GPU 掉帧 | 卡顿 | filter 只留外壳 + Dock 胶囊两层；卡片一律 `none` |
| R9 | 30 个套件里没有任何视觉断言 | CSS 回退无人拦截 | W0 新增 `ui_contract`；其余靠截图制度 |

---

## 8. 与仓库红线的相容性（逐条核对）

| 红线 | 本方案是否触碰 | 说明 |
|---|---|---|
| `380px`/`370px` 全产物各一次 | 不触碰 | W4 只是把 JS 里的**第二份**字面量删掉，CSS token 不动 |
| 包级 CSS 不得定义 8 个三级面板类名 | 不触碰 | 所有 `.ui-*` 写进 `ExPanel.css` |
| 新存储键 `ExSave_` 前缀 | 遵守 | `ExSave_theme`；顺手修 I-21 的 `freetimed` |
| 新包要在 `initPkg()` 接线 | **W0 需确认** | `ExUI`/`ExIcons` 是纯构造函数与常量（非 `initPkg` 包），但要确认没被 tree-shaking 删掉——`grep ExUI dist/` 应能命中 |
| DOM 判空兜底 | 遵守 | `ExUI` 全部入参判空；`.node()` 走 `template` 兜底 |
| `ExGuard_*` 声明顺序 | 遵守 | 见 R7 |
| 零混淆契约 | 遵守 | 新代码语义命名，`.ui-*` 规则一条一角色 |
| 分支纪律 | 遵守 | 全部进 `DYEXRL-NEXT`；验收期**不升版本号**；发版才走 main |
| 产物不整读 | 遵守 | 只 grep `dist/`，改动只改 `src/` |

---

## 9. 待用户拍板（4 条，其余本文已按定版决策执行）

1. **蓝药丸化**（F-09）：`极速秒开 / 导出 / 导入 / 名单 / 面板` 这批裸蓝字（29 处、2.14:1）改成**蓝底白字药丸**？这是 W2 里观感变化最大的单项；不点就在玻璃上继续不达标。
2. **主按钮 38→44**（F-07/I-13 的最后一档）：要动仓库测试场景 11 的 `height: 38px` 断言。改 or 不改？（关闭钮的 44 命中区不受此限，W1 照做）
3. **W5 的投放时机**：黑夜态 + 三态 + 第 9 磁贴是压进**同一个 NEXT 包**，还是等 W1–W3 验收后再单独出一个包？（建议后者：先把"用不了"和"读不出"修好，再上新皮肤）
4. **"同时把斗鱼切深"子开关**：黑夜态要不要带这个（写 cookie + `StorageEvent`，实测 400ms 免刷新生效）？带了就没有割裂感，但会改宿主页面的主题。

---

## 10. 变更记录与文档关系

| 文件 | 关系 |
|---|---|
| `PLAN.md`（本文） | **唯一施工口径**；开工后只更新本文的波次状态 |
| `PLAN-base.md` | 历史留档：底层契约与 `ExUI` API 定义仍有效，但 M0 表面取值与批次顺序以本文为准 |
| `PLAN-v3.md` | 历史留档：不变式 I1–I7 与自审 §10 仍有效，同上 |
| `UI-UX-REVIEW.md` | **取值真源**（D1–D8 全部引自此文） |
| `findings-css.md` | 条目真源（F-01…F-26）；§8.4 只有九段可用，见 §3 |
| `findings-interaction.md` | 条目真源（I-01…I-22） |

**本会话验证记录**：`node build.js` → exit 0；`npm test` → exit 0；`node tools/ui-legacy-guard.mjs` → 通过（46→40 / 26→20 / 23→17，其余持平）。除此之外**未验证**任何视觉或交互结论——那些条目仍需 W0–W6 逐波真机取证。
