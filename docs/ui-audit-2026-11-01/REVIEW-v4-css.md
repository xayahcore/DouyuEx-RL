# REVIEW v4 —— findings-css.md（F-01…F-26）在 HEAD 9871bfa 上的逐条复核

> 复核对象：`docs/ui-audit-2026-11-01/findings-css.md`（旧文，26 条）
> 复核基线：分支 **DYEXRL-NEXT** / HEAD **9871bfa**（工作区除本目录文档外无改动）
> 实测对象：`src/packages/ExPanel/ExPanel.css`（**2,876 行 / 99,991 字节**）、`src/packages/ExIcon/ExIcon.css`（45 行），交叉读 `ExPanel.js`（737 行）
> 纪律：**只读 src/**；未改任何源文件、未跑 `node build.js` / `npm test`；本文件是唯一写入。
> 行号一律以 HEAD 为准（旧文行号与此有 ±0~4 漂移，见 §5 冲突 10）。

## 0. 一句话结论

**旧文的"修法"确实随改版层一起被回退了，但"问题"基本原样还在**：26 条里 **23 条仍存在**、2 条 **已变化**（各有 1 个子项消失）、1 条 **已消失**。原因是结构性的 —— 被回退的是压在 `ExPanel.css` 之上的 `ExUI.js / ExTheme.js / dx-css.mjs / ui-legacy-guard.mjs`（仅在 `backup/ui-overhaul-20261101` = **58b178a** 里），**`ExPanel.css` 本体从来不是那套改版的一部分**，所以它的 1,529 条 `!important`、0 处 `@media`、2.11:1 的 `#64748b` 一个都没动过。

| 现况 | 条数 | ID |
|---|---|---|
| 仍存在 | **23** | F-01 ~ F-15、F-17、F-19 ~ F-25 |
| 已变化 | **2** | F-16（4 子项中"重复 title-box"已消失）、F-18（"重号 9"已消失，缺 21 仍在） |
| 已消失 | **1** | F-26（HEAD 上根本没有选中态 transform 规则） |

## 1. 改版层已回退的证据（决定"旧修法失效"的边界）

| 事实 | 证据 |
|---|---|
| `ExUI.js` / `ExTheme.js` 在 HEAD 不存在 | `git ls-tree -r HEAD --name-only | grep -Ei 'exui|extheme|dx-'` → 0 命中 |
| 三个治理产物同样不在 HEAD | `tools/dx-css.mjs`、`tools/ui-legacy-guard.mjs`、`tools/ui-legacy-baseline.json` 只出现在 `git diff --name-status HEAD backup/ui-overhaul-20261101` 的 **A** 侧 |
| 契约测试不在 HEAD | `tests/test_ui_contract.js`、`tests/test_theme.js` 同上；HEAD `tests/` 实有 30 个文件，无这两个 |
| `--dx-*` token 全库不存在 | `grep -rl -- '--dx-' src/` → 0 命中；`ExPanel.css:6-26` 的 `:root` 仍是 16 条 `--miuix-*` |
| 备份分支确实留着那套代码 | `git log --oneline -1 backup/ui-overhaul-20261101` → `58b178a backup: 回退前快照 —— 2026-11-01 上个会话 UI 主题化改版` |

> 由此可判定：旧文 §8「token v2 提案 / 迁移映射表」与各处"修复片段"**没有一行在 HEAD 上生效**，全部重新回到"提案"状态；而 F-01…F-25 的**现象**需要用 HEAD 重新确认（下表即结论）。

## 2. 逐条复核表

| ID | 旧定级 | HEAD 现况 | 证据（file:line + 实测值） | 一句话处置 | 施工成本 |
|---|---|---|---|---|---|
| F-01 | P1 | **仍存在** | `ExPanel.js:690` `var panelWidth = 380`；692/698/699 三处用它算居中与夹取；`ExPanel.js:342`/`350` 用 `offsetWidth \|\| scrollWidth \|\| 360` 兜底；宽度真源确为 `ExPanel.css:226` `width: var(--miuix-modal-width)`（全 src 仅 `380px` 1 次，在 `ExPanel.css:7`） | 先 `display:flex` 再 `getBoundingClientRect().width`，JS 只量不写；兜底值改显式测量 | M（跨 2 文件 + 8/9 磁贴两档真机核） |
| F-02 | P1 | **仍存在** | `ExPanel.css:708-711` 10.5px + `#64748b`；同族 88 / 839 / 1204 / 1324 / 1526 / 1870 / 2073 / 2158。自算：0.65 白玻璃叠 #101418 → `rgb(171,173,174)`，#64748b = **2.11:1**（纯黑帧 1.95，亮帧 #d8dee6 → 4.28） | 玻璃上的说明文字整体下沉到深墨（≥#475569）+ 字号 ≥11px；#64748b 只留给纯白底（88 行可保留） | S |
| F-03 | P1 | **仍存在** | 文字 1240 / 1436 / 1767；三角 497-498；底色 924 / 1635。`#94a3b8` 在深帧玻璃 **1.14:1**、纯黑帧 1.05；作底色时白字 2.56 | 关闭类图标换深墨；#94a3b8 退出"文字色"用途，只在禁用底保留并加深色描边 | S |
| F-04 | P1 | **仍存在** | `1620-1670` 六态全手写 hex；白字实测：`--upgrade` 左上 **2.15** / 右下 3.19，`--latest` **2.54** / 3.77，`--checking` 2.56，`--error` 3.76 / 4.83，`--ack/--check` 3.76 / 5.61 | 5 个语义色收成 token，白字一律 ≥4.5（青/绿/橙三档都要压明度） | S |
| F-05 | P1 | **仍存在** | 797 轨道 `rgba(0,0,0,.06)` → 深帧玻璃上合成 `rgb(161,163,164)`；839 未选中 `#64748b` = **1.88:1**（#334155 同底 4.09）；851-853 选中白底蓝字 4.35 | 未选中文字换 `#334155` 并把 11.5px 并到 12px；要"更淡"就改轨道色，不要改字色 | S |
| F-06 | P1 | **仍存在** | `prefers-reduced-motion` 全文件 **0** 命中；`56` dock 弹入（`animation: miuix-dock-spring-in 0.28s var(--miuix-spring)`）；`67` 中间帧 `scale(1.02)` 反向放大；spring = `cubic-bezier(.34,1.56,.64,1)`（25 行）；`transition:all` 27 处 | 一条 `@media (prefers-reduced-motion: reduce)` 收口（时长 0.01ms + 迭代 1 次），loading 单独保留 | S |
| F-07 | P1 | **仍存在** | 显式 ≤22px 的交互目标 ≥8 个：`1336-1337`/`1345-1346`(18×18)、`1438-1439`(20×20)、`2112-2113`(22×22)、`2237-2238`(20×20)、`2505`(h20)、`2607-2608`(20×20 移除房间)、`2628`(h16 音量条)、`727-729`(38×22 开关)；输入框 `995-996` padding 3+3 / 11.5px ≈ 22px | 伪元素 `inset:-4px` 扩命中区（视觉尺寸不变）；`popup-ms__room-sub` 的 `gap:6px`(2495) 抬到 10px | M |
| F-08 | P1 | **仍存在** | `outline:none` **16** 条（603/619/733/900/941/961/997/1208/1226/1393/1559/1592/1698/1753/2048/2635）；`:focus-visible` 规则只有 **2** 条（`861` 分段胶囊、`2726` popup-ms 结果行，`2725` 是注释）；`:hover` **55** / `:active` **18** | 一条 `:where(...):focus-visible` 收口 + 输入类焦点环加深（现 `--miuix-blue-glow` 40% 蓝 ≈1.4:1） | S |
| F-09 | P1 | **仍存在** | `23` 定义 `#0066ff`，`var(--miuix-blue)` **29** 处引用；文字用法 `934-935`（底是 `rgba(0,102,255,.08)`）→ 玻璃上 **2.15:1**、自底 **1.99:1**；填充用法（白字）4.83 合格 | 拆 `--dx-accent-fill`（只做底）与 `--dx-accent-ink`（只做字/图标） | M（牵动 29 处引用） |
| F-10 | P2 | **仍存在** | `37` h76 + `39` padding 10 + `44` border 1 → 内容高 **54px**，而 `126-127` 磁贴 **56px**；`49` `overflow: visible` → 真溢出 1px×2 | 用 `calc(tile + padding*2 + 2px)` 让内容高与磁贴同源 | S |
| F-11 | P2 | **仍存在** | `.ex-panel`(31-50) 只有 `35-36` `min/max-width: max-content`，**无 max-width**；面板 `227` 有 `calc(100vw - 24px)`；8 磁贴 = 8×56 + 7×10(118 gap) + 36 padding + 2 border = **556px**，9 磁贴 622px | Dock 补 `max-width: calc(100vw - 24px)` + `overflow-x: auto` | S |
| F-12 | P2 | **仍存在** | `228-230` `height = max-height = min-height`；`357` `max-height: calc(var(--miuix-modal-height) - 52px)`；`ExPanel.js:700` `Math.max(20, innerHeight - rect.top + 12)` 只夹下界、不夹 `top` | `max-height: min(370, 100vh - 132px)`；body 交给 flex 分配，删掉手写 52 | M |
| F-13 | P2 | **仍存在** | `ExPanel.css` `@media` **0** 命中（全 src CSS 仅 2 处，在 `PictureInPictureControl.css` / `VideoToolbarMenu.css`，与本文件无关）；面板级横向只有 `227` 一条 max-width（其余 max-width 都在组件内部）；`1274` `grid-template-columns: repeat(4, 1fr)` | 补 `max-width:520px`（4→3 列）与 `max-height:560px` 两档 | S |
| F-14 | P2 | **仍存在** | `419` `backdrop-filter: blur(12px)` + `422` `transition: all 0.2s var(--miuix-spring)` + `430` hover 改 background；全文件 `transition: all` **27** 处 | 拆成 background-color / border-color / box-shadow 三条显式过渡 | S（"去 7 层 filter"另算 L） |
| F-15 | P2 | **仍存在** | `752-753` 滑块 18×18；`757` `transition: transform .32s ..., width .2s ease`；`763` `:active` 改 `width: 22px`（布局属性） | 换 `transform: scaleX(1.22)`，保留 0.32s 弹簧 | S |
| F-16 | P2 | **已变化** | ①重复 `.miuix-modal__title-box`：HEAD **只剩 `304-307` 一处** → 该子项**已消失**；②`1676-1680` 与 `1008`+`1012-1013` 重复 border-color/box-shadow → **仍在**（`1915-1926` 同款重复）；③`359` `auto` 紧接 `360` `overlay` → **仍在**；④[hidden] 补丁 `2442-2444` / `2368-2370` → **仍在** | 删重复与死声明；`[hidden]{display:none!important}` 一条收口 | S |
| F-17 | P3 | **仍存在** | Header 高 = `287` padding 12×2 + `318-319` 关闭钮 26 + `295` border 1 = **51px**，而 `357` 按 52 扣 → body 上限 318，51+318=369，面板 370 | 随 F-12 一起把 52 换成 flex 分配，不再手写 | S |
| F-18 | P3 | **已变化** | 缺 21：`2182`(20) → `2363`(22) → `2777`(23)，**21 仍缺**；"重号 9"**已消失** —— Phosphor 块 `2816-2820` 无编号，全文件 `9.` 只剩 `977` 一处 | 只补 21（或把 Phosphor 标为 24），并给每节加 `/* deps: ... */` | S |
| F-19 | P3 | **仍存在** | `708-711`(10.5/#64748b)、`1322-1325`(10/#64748b)、`1868-1871`(11/#64748b)、`2156-2159`(10.5/#64748b)、`2446-2450`(11/rgba(15,23,42,.6))、`2503-2509`(11/rgba .55)、`2749-2752`(11/rgba .55) → 3 种字号 × 3 种写法 | 全部换实色 ink-3，去掉"用 alpha 表达淡"的写法 | M |
| F-20 | P3 | **仍存在** | `2311-2316` `height:34px` + `line-height:34px`（86px 宽按钮）；`642-647` `font-size:11.5px` + `line-height:18px`；全文件 line-height = 7 个无单位值 + 4 个固定值(15/18/24/34) | 34px 按钮改 flex 居中；18px 改 1.55 | S |
| F-21 | P3 | **仍存在（更糟）** | `204` `#ff3b30`（Dock 角标）；红系实际 **6 种**：`#ef4444`×9、`#dc2626`×2、`#b91c1c`×1、`#d60909`×1、`#ff3b30`×1、`#ff5d23`×6 | 语义红收 token（含 #ff5d23），角标点归 danger | S |
| F-22 | P3 | **仍存在** | `1898` `stroke='%2364748b'`；`1926` `stroke='%230066ff'`（URL 编码，色值正则扫不到） | build 时由 token 值生成两份 data URI（build.js 已有字符串替换能力） | S（伪元素方案 M） |
| F-23 | P3 | **仍存在** | `ExIcon.css` 45 行 / `!important` **29/29=100%** / 0 token / 0 `@media`；`31` 橙色光晕 `rgba(255,102,0,.35)`；`7` `margin-left:auto` + `9` `order:9999`；`24-25` 常驻 `blur(12px)`；无任何 `:focus-visible` | 补 token 引用；光晕换 accent；给 `.ex-icon a` 补焦点环 | S |
| F-24 | P3 | **仍存在** | `184-188` Dock 图标 38px；`2856-2860` `.ex-title-ico svg` **19px**；`2871-2874` `.ex-card-ico svg` **15px**；`2862` 注释仍写"15px 正好塞进 13px 标题行"（13×1.2≈15.6，余量 0.6px） | 归到 16 / 20 两档 | S |
| F-25 | P3 | **仍存在** | `476` `.livetool__cell_title` 整行 `cursor: pointer`，而点击绑在 `481` 的标题 span；`2472-2483` `.popup-ms__room` 无 cursor，内部 `2513` chip 才有 | cursor 下移到真实可点元素 | S |
| F-26 | P3 | **已消失** | HEAD 上 `.is-active/.ex-dock-active` 只有 `167-171`（指示条 `scaleX`）、`2832-2845`（图标显隐与配色），**无任何 transform**；全文件唯一磁贴位移是 `142` hover `translateY(-2.5px)`（`1296` 的 -2px 属于 `.ex-gift-cell:hover`） | 无需施工；日后若加选中位移，须保证与 hover **同向单调**（−2.5 → −3.5） | —（0） |

## 3. HEAD 实测数字看板

复核命令（仓库根，零依赖，纯 grep/node 统计）：
```bash
grep -c '!important'              src/packages/ExPanel/ExPanel.css
grep -cE 'outline[[:space:]]*:[[:space:]]*none' src/packages/ExPanel/ExPanel.css
grep -c ':focus-visible'          src/packages/ExPanel/ExPanel.css
grep -c '@media'                  src/packages/ExPanel/ExPanel.css
grep -c 'backdrop-filter'         src/packages/ExPanel/ExPanel.css
grep -cE 'transition[[:space:]]*:[[:space:]]*all' src/packages/ExPanel/ExPanel.css
grep -rn --include=*.css -c '380px\|370px' src/    # 各文件 1/1
grep -rn --include=*.js -E '\b(380|370)\b' src/
```

| 指标 | HEAD 实测 | 口径 / 判读 |
|---|---|---|
| ExPanel.css 规模 | **2,876 行 / 99,991 字节** | 旧文 2,890 行 / 94,222 字节（见 §5-①） |
| 声明 / 规则块 | **1,602** 条声明 / **308** 个规则块 | 声明=去掉 url() 后的 `;` 计数；规则块=行尾 `{` 计数（口径略窄于旧文 317） |
| `!important` | **1,529** 条，占 **95.44%** | 非 !important 声明仅 **73** 条（其中 `:root` **16** 条） |
| ExIcon.css `!important` | **29 / 29 条 = 100%** | 与旧文一致 |
| 内联 style | ExPanel.js `.style.` **52** 处、`style="` **0** 处；全 src JS 合计 `.style.` **381** + `style="` **132** = **513**；CSS 侧 0 | 上游最多：Refresh_Video.js 40+10、VideoFilter.js 41+5、PopupPlayer_MultiScreen.js 29 |
| `outline: none` | **16**（ExPanel.css）/ 17（全 src CSS）/ 3（src JS） | 无一处在按钮类上配了替代焦点环 |
| `:focus-visible` | **3** 命中 = 2 条规则（861、2726）+ 1 条注释（2725） | 对照 `:hover` **55**、`:active` **18** |
| `@media` | **0**（ExPanel.css）/ 2（全 src CSS，两个 VideoTools 包各 1） | ExPanel 仍零响应式 |
| `prefers-reduced-motion` | **0**（ExPanel.css）/ 2（同上两个包） | 动效降级仍缺失 |
| `backdrop-filter` 声明 | **22**（ExPanel.css，11 组 × 含 -webkit-）+ **2**（ExIcon.css）= **12 个可渲染表面** | 其中 9 处写死数值绕过 token |
| `transition: all` | **27**（ExPanel.css）/ 34（全 src CSS） | 与旧文完全一致 |
| `380px` / `370px` | **各 1 次**，都在 `:root`（`ExPanel.css:7`/`:8`） | 数值级重复仍在 JS：`ExPanel.js:690` 的裸 `380`；无关项 `PictureInPictureControl.js:949` `height: 380` |
| `--miuix-modal-bg` | `rgba(255, 255, 255, 0.65)` | `ExPanel.css:10`；被 `var()` 引用 **1** 次（237 行） |
| `--miuix-card-bg` | `rgba(255, 255, 255, 0.42)` | `:15`；引用 1 次（415） |
| `--miuix-item-bg` | `rgba(255, 255, 255, 0.35)` | `:19`；引用 3 次 |
| `--miuix-blue` | `#0066ff`（glow = `rgba(0,102,255,0.4)`） | `:23`/`:24`；`var(--miuix-blue)` **29** 次 |
| 裸 `#0066ff` | **1**（仅 `:23` 的 token 定义；其余全走 var） | 全 src CSS 6 次、全 src JS 2 次 |
| 裸 `#64748b` | **10** | 88 / 506 / 710 / 839 / 1204 / 1324 / 1526 / 1870 / 2073 / 2158 |
| 裸 `#94a3b8` | **7** | 497 / 498 / 924 / 1240 / 1436 / 1635 / 1767 |
| 颜色字面量 | hex **154** / 31 唯一；hex+rgba **330** / **106** 唯一 | 旧文的 339/107 用的是 hex+rgba 口径 |
| 字号档位 | **13** 档（9.5/10/10.5/11/11.5/12/12.5/13/13.5/14/16/18/20） | 半像素 5 档，合计 20 条声明 |
| 行高 | 7 个无单位（1/1.2/1.25/1.3/1.4/1.45/1.5）+ 4 个固定（15/18/24/34） | |
| 圆角档位 | **14** 档 + `50%` | 2/4/5/6/7/8/9/10/12/14/16/20/22/38 |
| 过渡时长 | **9** 档（0.16–0.32s）+ `1.5s` 常驻 ×2 | |
| 缓动 | `ease`(纯) **26** / `var(--miuix-spring)` **24** / `cubic-bezier()` **7** / `linear` **1** | `linear-gradient` 19 处已排除 |
| `var()` 引用 | **91** 次 / 17 个唯一变量 | `:root` 只有 16 条声明，`--miuix-blue` 独占 29 次引用 |
| z-index | **13** 个取值（1/2/3/50/99/10000/10001/100010/100030/100050/100060/100080/100090） | 缺命名，分带已存在 |
| `will-change` / `@supports` | **0 / 0** | |

**自算对比度（WCAG 2.1，独立实现，用于确认"前提色值未变"）**

| 墨色 | 0.65 白玻璃叠 #101418（rgb(171,173,174)） | 纯黑帧（rgb(166,166,166)） | 亮帧 #d8dee6（rgb(241,243,246)） |
|---|---|---|---|
| #0f172a | 7.92 | 7.33 | 16.06 |
| #334155 | 4.60 | **4.25** | 9.31 |
| #475569 | 3.36 | 3.11 | 6.82 |
| #64748b | **2.11** | 1.95 | 4.28 |
| #94a3b8 | **1.14** | 1.05 | 2.31 |
| #0066ff | **2.15** | 1.99 | 4.35 |

> 段控轨道（`rgba(0,0,0,.06)` 叠深帧玻璃 → `rgb(161,163,164)`）：`#64748b` = **1.88:1**，`#334155` = 4.09:1。
> 更新面板白字：`#f59e0b` 2.15 / `#10b981` 2.54 / `#94a3b8` 2.56 / `#d97706` 3.19 / `#ef4444` 3.76 / `#2b7fff` 3.76 / `#059669` 3.77 / `#dc2626` 4.83 / `#0055ff` 5.61。
> 结论：与旧文 F-02/03/04/05/09 的数值**逐项吻合（差 ≤0.01）** → 旧文的对比度前提在 HEAD 上完全没变。

## 4. 施工排序（按"成本 × 收益"重排，不含已消失项）

| 批次 | 内容 | 条目 | 预估 |
|---|---|---|---|
| 第一批（纯安全，无视觉判断） | 删重复/死声明 + 补节号 | F-16（3 子项）、F-18（补 21）、F-17（随 F-12） | 半天内 |
| 第二批（对比度，需设计确认） | 墨色 token + 状态色 + 焦点环 | F-02、F-03、F-04、F-05、F-09、F-08 | 1–2 天 |
| 第三批（性能与响应式） | 拆 transition、开关换 scaleX、Dock 盒模型、两档 media、reduced-motion | F-10、F-11、F-12、F-13、F-14、F-15、F-06 | 2–3 天 |
| 第四批（设计与可维护性） | 说明文字口径、行高、红系、data URI、ExIcon、图标档位、cursor | F-19、F-20、F-21、F-22、F-23、F-24、F-25 | 2 天 |
| 独立（跨文件 + 真机） | JS 去掉 380/360 字面量，先显形再量 | F-01 | 1 天，需 8/9 磁贴两档真机核 |

> 注意：F-07（命中区）与 F-12（竖向死高）都依赖真机量测收尾，静态只能验到"规则还在"。旧文的"13 个 <24px 目标"我这次只静态复核到 **≥8 个**（显式 height ≤22px），其余是行盒估算，未强行凑数。

## 5. 与旧文冲突的地方（旧文说 X、HEAD 是 Y，以 Y 为准）

| # | 旧文说 X | HEAD 实测 Y | 为什么 |
|---|---|---|---|
| ① | ExPanel.css = 2,890 行 / 94,222 字节 | **2,876 行 / 99,991 字节** | 旧文基线是"release 2026.11.01.01 + 工作区未提交的 Phosphor 层"；9871bfa 落地时 Phosphor 块写法更短（`2816-2875`，60 行），行数少 14；字节反增 5,769，与块内 base64 PNG/长选择器同量级 |
| ② | `!important` 1,532 条 / 非 important 76 条 / 声明 1,608 | **1,529 / 73 / 1,602** | 差 3 条，全部落在那 14 行差异对应的规则上；口径一致（去 url() 后计 `;`） |
| ③ | 规则块 317 | **308** | 我的口径是"行尾 `{`"，不含与选择器同行的 `{ ... }` 单行规则（如 keyframes 帧） |
| ④ | 颜色字面量 339 处 / 107 个唯一色 | **hex 154 处 / 31 唯一；hex+rgba 330 处 / 106 唯一** | 旧文计的是 hex+rgba；我用同一口径复现出 330/106，差 9 处与该批行差异同量级（未逐色定位） |
| ⑤ | `@media` **0 处**、`prefers-reduced-motion` **0 处**（作为"全产物"陈述） | ExPanel.css 仍 **0/0**；但**全 src CSS 各 2 处**（`PictureInPictureControl.css`、`VideoToolbarMenu.css`） | 旧文的 0 只对 ExPanel.css 成立；写成"全产物零 @media"会误判那两个包 |
| ⑥ | F-16① `.miuix-modal__title-box` 在 2859-2862 与 302-305 逐字重复 | HEAD **只有 304-307 一处**，尾部无重复 | 9871bfa 的 Phosphor 块不再重写 title-box → 该子项**已消失**，F-16 只能算"部分仍存在" |
| ⑦ | F-18 "章节号重复 9"（974 与 2816） | HEAD 的 Phosphor 块 `2816-2820` **无编号**，全文件 `9.` 只在 `977` | 同 ⑥，编号跟着块一起改了 → 只剩"缺 21" |
| ⑧ | F-26 选中态 `translateY(-2px)`（2850-2856）与 hover `-2.5px` 打架，实测落 −2px | HEAD **没有任何** `.is-active/.ex-dock-active` 上的 transform；唯一位移是 `142` 的 hover `-2.5px` | 那条规则属于旧文基线里另一版 Phosphor 块，没有进 9871bfa → **整条作废**（不是"改好了"，是"规则不存在"） |
| ⑨ | F-07 表写 `.ChatToolBar-DanmakuTail / -tip` 在 1331 / 1342、"计算高度 18px" | HEAD 在 `1333` / `1344`，且是**显式 `width/height: 18px`**（`1336-1337`/`1345-1346`），不是算出来的 | 行号漂移 +2；判据从"行盒推算"升级为"声明直读" |
| ⑩ | 旧文全篇行号（706/837/1202/1238/1434/1618/…） | HEAD 对应 **708/839/1204/1235/1433/1620/…**（±0~4 漂移，`:focus-visible` 861、`outline:none` 16 条等少数完全一致） | 两版文件在被审区间有 ±几行的删改；**引用行号必须以 HEAD 为准**，旧文行号直接套会指到隔壁规则 |
| ⑪ | 旧文把"修法"当可落地补丁（含 `--dx-*` token、`@media` 收口、guard 棘轮） | HEAD **无 `--dx-*`、无 dx-css.mjs、无 ui-legacy-guard.mjs、无 test_ui_contract/test_theme** | 改版层整体回退（见 §1）→ 所有"修法"必须重做为提案，不能当"已生效的既有约定"引用 |
| ⑫ | F-01 说"产物级断言 380px 恰好 1 次" | 断言确实存在（`tests/test_built_bundle.js:716`/`:733`、`tests/test_danmaku_history.js:503-505`），但它只比字符串 `"380px"` / `"var(--miuix-modal-width)"` | 断言看不见 `ExPanel.js:690` 的裸 `380` → 旧文"字符串断言看不见数值重复"的判断在 HEAD 上依然成立 |

## 6. 复核备忘（给下一个会话）

1. `ExPanel.css` 是**未被动过**的老文件：1,529 条 `!important`、0 `@media`、0 `prefers-reduced-motion`、13 档字号、27 处 `transition: all` —— 任何"改版已经落地"的说法都必须先过这张看板。
2. 若要复用旧文的 §8 token v2 表 / §8.5 迁移映射表：**数字仍有效**（字号 13→5、圆角 14→8、时长 9→4+1、缓动 4→3、z-index 13→10 全部与 HEAD 对得上），**但"已落地"的部分为零**，需从 58b178a 之外重新施工。
3. F-16 / F-18 是"部分消失"，别按整条勾销：删重复与补 21 仍是独立可做的小活。
4. F-26 属于"旧文对着另一版文件发现的"：竣工前建议再 grep 一次 `.is-active` 上的 `transform`，避免把"不存在"误读成"已修复"。

---
*本文只读复核，未修改 `src/`、`tests/`、`tools/`、构建产物与版本号；未执行 `node build.js` / `npm test`。*
