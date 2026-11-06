# ExPanel.css 设计系统静态审计（只读）

> 审计对象：src/packages/ExPanel/ExPanel.css（2890 行 / 94,222 字节 / 317 规则块 / 1,608 条声明）+ src/packages/ExIcon/ExIcon.css（44 行 / 29 条声明）
> 交叉文件（只读引用）：src/packages/ExPanel/ExPanel.js、src/packages/PopupPlayer/PopupPlayer.js
> 基线：main HEAD release 2026.11.01.01 + 工作区未提交的 Phosphor 图标层（ExPanel.css 第 2815–2890 行 / ExIcon.js / ExIcons.js）
> 本文只写发现与可粘贴的修复片段，未改动 src/ 下任何文件，未 git commit。
>
> **v2 修订（收到 Lead 交叉意见后回改）**
> - **F-01 的机制与结论已更正。** 初版写“内联样式优先于带 !important 的作者规则、--miuix-modal-width 是死 token”，这条 CSS 语义是反的：**作者样式表里的 !important 胜过普通内联声明**（只有内联声明自己也带 !important 才能压过它）。因此 ExPanel.js:691 的 panel.style.width 在命中 ExPanel.css:224（width: var(...) !important）的面板上是**死代码**，渲染宽度确实来自 token。真正的缺陷是 380 在 JS 里充当了居中计算的第二份真源，见改写后的 F-01。
> - **F-02 的措辞已收紧。** “任何 alpha 都救不回来”在数学上不成立（alpha=1.0 时 #64748b 对纯白 4.76:1 是过线的）。正确表述是“在仍是玻璃的可行区间内不可救，唯一出路是换墨色”。
> - 新增 F-26（Dock 选中态与 hover 位移打架）；§9 增加两条真机实测对账（像素采样 2.91:1、Dock bottom 112px）。

---

## 0. 方法与可复核产物

所有数字都由 docs/ui-audit-2026-11-01/metrics/ 下的脚本现场跑出来，可原样重跑：

| 脚本 | 产出 JSON | 干什么 |
|---|---|---|
| analyze-css.mjs | css-inventory.json / css-colors.json / css-typography.json / css-geometry.json / css-motion.json / css-tokens.json / css-duplicates.json | 花括号感知的规则解析器；声明级扫描（引号/括号内的分号与逗号不参与切分）；!important、色值、字号、圆角、阴影、动效、var() 覆盖、重复规则 |
| analyze-selectors.mjs | css-selectors.json / css-target-size.json / css-small-fonts.json / css-sections.json | 类名被几条规则命中、交互元素计算高度、小于 11.5px 字号清单、章节编号 |
| analyze-conflicts.mjs | css-conflicts.json | 把选择器列表拆成单个选择器（471 个）后，找同一选择器上同属性被重复声明 |
| analyze-tranches.mjs | css-important-tranches.json | 把 1,532 条 !important 分成三个可分批拆除的批次 |
| contrast.mjs / contrast-claims.mjs / crosscheck.mjs / frame-matrix.mjs | css-contrast-*.json / css-crosscheck.json / css-frame-matrix.json | WCAG 2.1 相对亮度 + alpha 合成，逐面逐墨算比值 |
| route-analysis.mjs / token-v2.mjs | css-route-analysis.json / css-token-v2-derivation.json | 反解"某墨色要过 AA 需要多大玻璃 alpha"，以及新 token 取值的求解过程 |

跑法（仓库根目录，零依赖）：

~~~bash
node docs/ui-audit-2026-11-01/metrics/analyze-css.mjs
node docs/ui-audit-2026-11-01/metrics/analyze-selectors.mjs
node docs/ui-audit-2026-11-01/metrics/analyze-conflicts.mjs
node docs/ui-audit-2026-11-01/metrics/analyze-tranches.mjs
node docs/ui-audit-2026-11-01/metrics/contrast.mjs
node docs/ui-audit-2026-11-01/metrics/contrast-claims.mjs
node docs/ui-audit-2026-11-01/metrics/frame-matrix.mjs
node docs/ui-audit-2026-11-01/metrics/route-analysis.mjs
node docs/ui-audit-2026-11-01/metrics/token-v2.mjs
~~~

**口径声明**：对比度一律用 WCAG 2.1 相对亮度公式；玻璃底用"白色 alpha 层逐层合成到实色视频帧"建模；backdrop-filter 的 saturate 只影响彩度不影响亮度，故未计入（对灰阶视频帧零影响，对高饱和帧最多带来 ±0.1 偏差，不影响任何一条通过/失败判定）。像素值均为 CSS px（1x DPR）。

---

## 1. 数字看板

| 指标 | 值 | 判读 |
|---|---|---|
| 规则块 / 声明 | 317 / 1,608 | 平均 5.1 条声明/规则 |
| !important | **1,532 条，占 95.27%**；297 条规则带（5.16 条/规则） | 不是"权重工具"，是语法本身 |
| 非 !important 声明 | 76 条 | 12 条在 :root，其余集中在 5 处抽屉默认态 |
| ExIcon.css !important | **29/29 = 100%** | 完全在 token 体系之外 |
| 颜色字面量 | 339 处 / **107 个唯一色** | token 覆盖 0 个颜色语义 |
| var() 引用 | 91 次 / 1,608 声明 = **5.66%** | 16 个 token 里 9 个只被用 1 次 |
| 字号档位 | **13 档**（9.5/10/10.5/11/11.5/12/12.5/13/13.5/14/16/18/20） | 半像素 5 档 |
| 圆角档位 | **14 档**（2/4/5/6/7/8/9/10/12/14/16/20/22/38 + 50%） | |
| 过渡时长 | **9 档**（0.16–0.32s）+ 1 个 1.5s 常驻 | |
| 缓动 | 4 种（ease×26 / spring×24 / cubic-bezier(0.16,1,0.3,1)×6 / linear×1） | spring 与 ease 五五开 |
| transition: all | **27 处** | 全属性过渡放大器 |
| @media | **0 处** | 零响应式 |
| prefers-reduced-motion | **0 处** | 零动效降级 |
| :hover : :active : :focus-visible | **55 : 18 : 2** | 纯鼠标向 |
| outline: none | 16 条 | 其中 14 条无替代焦点环 |
| backdrop-filter 声明 | 22 条（11 组 + 11 组 -webkit 前缀）= **11 个可渲染表面** | 其中 9 处硬编码值绕过 token |
| 峰值同屏模糊表面 | **10 层**（算例见 §7.2） | 全是 60fps 视频之上的重算 |
| will-change | **0 处** | |
| box-shadow 最大层数 | 2（顶层逗号分隔） | 阴影复杂度不构成问题 |
| z-index 取值 | 13 个（1/2/3/50/99/10000/10001/100010/100030/100050/100060/100080/100090） | 序号已分带，缺的是命名 |
| 交互元素计算高度 < 24px | **13 个** | 低于 WCAG 2.2 SC 2.5.8 的 24×24 |
| 字号 < 11.5px 的声明 | **24 条**（11px×14 / 10.5×4 / 10×5 / 9.5×1） | |
| 章节编号 | 1–20、**22**、23、**又一个 9** | 缺 21，重号 9 |

---

## 2. 机器统计到的 vs 眼睛看到的（分开陈述）

**机器统计能直接下结论的（可复现、无解释空间）**

1. !important 覆盖率 95.27%，且 76 条非 !important 里有 12 条在 :root——意味着 :root 之外的层叠规则几乎只剩"!important 与 !important 的对抗"。
2. 107 个唯一色、91 次 var()：token 层只覆盖了几何（宽高半径）与一个蓝色、一个缓动，**颜色语义完全没有 token**。
3. @media / @supports / prefers-reduced-motion 三个 at-rule 的命中数都是 0。不是"少"，是没有。
4. 13 档字号里有 5 档是半像素（9.5 / 10.5 / 11.5 / 12.5 / 13.5），合计 20 条声明。半像素字号在 Windows 100% 缩放下会走亚像素抗锯齿，中文笔画粗细会随机跳。
5. 同一选择器上同属性被重复声明只有 3 处（css-conflicts.json）。**"特异性战争"这个怀疑方向基本不成立**——文件是"啰嗦"，不是"自相矛盾"。

**眼睛通读 2890 行才看得到的（机器数不出来）**

1. 文件的分层其实是"边界层硬刚 + 内部层也硬刚"：.miuix-modal / .ex-panel 这些真的会和斗鱼自身样式表打架的根节点需要 !important；但 .sign-option-desc 这种只存在于自家私有类名下的文字颜色也照样 !important——没有任何外部样式能命中它，这是纯粹的习惯延续。
2. 同一条 transition 里混用两种缓动：ExPanel.css:334 写的是 background-color 0.18s var(--miuix-spring), color 0.18s ease, transform 0.2s var(--miuix-spring)——背景用弹簧、文字用 ease、缩放又用弹簧。弹簧曲线作用在颜色上不会"弹"，只会让颜色的中段插值偏慢，观感是"背景慢半拍"。
3. 少数地方明确写了"这里不能加 !important"（576–581 行 .vote__panel 等抽屉默认态），理由是内联 style.display 要能压过它。于是全文件存在一条只能靠注释传递的隐式规则：需要被内联样式覆盖的地方不许写 !important。读代码的人无法从语法上分辨，这是最难维护的一点，比 95% 这个数字本身更危险。
4. 9 处 backdrop-filter 写死数值（blur(28px) saturate(190%) / blur(28px) saturate(200%) / blur(36px) saturate(220%) / blur(40px) saturate(220%)×2 / blur(12px) / blur(8px)×3），同一个 blur(28px) 在两个地方配了不同 saturate（190% 与 200%）——这两处没有任何视觉理由不同，是复制粘贴的产物。
5. 新增的 Phosphor 层（2815–2890）是全文件唯一不带 !important 的成块样式，它和上下 2890 行的风格是割裂的；.miuix-modal__title-box 在这里被完整重写了一遍（2859–2862），与 302–305 逐字相同。

---

## 3. P0 / P1 发现

> 结论先行：**CSS 层没有 P0**。P0 级（面板打不开、点了没反应、数据错乱）都在 ExPanel.js 的交互逻辑里，归 js-auditor。CSS 层的天花板是"看得见但看不清 / 点得到但点不准 / 键盘到不了"，即 P1。

### F-01 JS 里 380 是居中计算的第二份真源（宽度本身仍由 token 决定）（P1）

**位置**
- src/packages/ExPanel/ExPanel.js:690-691
- src/packages/ExPanel/ExPanel.css:7（token 定义）、ExPanel.css:224（唯一一次引用）

**现状**

~~~js
// ExPanel.js:690-691
var panelWidth = 380;
panel.style.width = panelWidth + "px";
~~~

~~~css
/* ExPanel.css:7 / 224 */
--miuix-modal-width: 380px;
...
.miuix-modal, .sign-panel, ... { width: var(--miuix-modal-width) !important; }
~~~

**为什么是问题**
先纠正一个极容易搞反的 CSS 语义：**作者样式表里的 !important 声明胜过普通的内联声明**（只有内联声明自己也带 !important 才能压过它）。ExPanel.css:224 的 width 带 !important，所以 ExPanel.js:691 的 panel.style.width = "380px" 在任何命中 224 行的面板上都是**死代码**——渲染宽度确实来自 token，--miuix-modal-width 不是死 token。这一点在本文件 v2 修订中已更正。

真正的缺陷是：**380 这个数值在 JS 里又活了一份，只不过它现在管的是“居中”而不是“宽度”**。

1. ExPanel.js:692 的 left = (window.innerWidth - 380) / 2 与 699 行的 Math.min(window.innerWidth - 380 - 12, left) 用的是字面量。改了 :root 的 --miuix-modal-width 之后，面板会按**新宽度**渲染、却仍按 **380** 居中 → 整体偏移 (380 − 新宽) / 2。改成 360 就左移 10px，改成 400 就右移 10px，且没有任何断言会发现。
2. ExPanel.js:342 与 350 的浮动 Dock 定位用的是 panel.offsetWidth || panel.scrollWidth || 360。节点处于 display:none 时两者都是 0 → 落到 360。Dock 实测宽 554（Lead 真机数据；按 8 磁贴算 8×56 + 7×10 + 36 + 2 = 556，边框盒差 2px），于是夹取拿 360 当宽度 → 左边多算 (554 − 360) / 2 = **97px**，Dock 贴边时会被误判成“还没到边”而继续外推。
3. 产物级断言（全产物 "380px" 恰好 1 次）是成立的、也是诚实的——因为 JS 里根本没有这个字符串。但**数值层面的重复依然存在**，字符串断言看不见它。

**修复（跨文件，仅提案，未落地）**

CSS 侧不用动（224 行已经是 var）。JS 侧去掉字面量、改成"先显形再量"：

~~~js
// ExPanel.js: 替换 690-691
// 宽度唯一真源是 :root 的 --miuix-modal-width；JS 只量、不写。
panel.style.removeProperty("width");
panel.style.removeProperty("display");
panel.style.setProperty("display", "flex", "important");

var measuredWidth = 0;
try {
  measuredWidth = panel.getBoundingClientRect().width || panel.offsetWidth || 0;
} catch (error) {
  measuredWidth = 0;
}
if (!(measuredWidth > 0)) {
  measuredWidth = 360; // 量不到时的保守回退（与既有 352 行 offsetWidth 回退同一口径）
}
var panelWidth = measuredWidth;
~~~

注意顺序：display: flex 必须在测量之前，否则 display:none 下 getBoundingClientRect().width 恒为 0。量完再用 panelWidth 算 left（692–699 行不用改）。

342 / 350 行的浮动 Dock 定位同理——把 360 兜底换成一个**显式量过**的值，避免 display:none 时静默落到 360：

~~~js
// ExPanel.js: 替换 342 与 350 两行
var dockWidth = 0;
try {
  dockWidth = panel.offsetWidth || panel.scrollWidth || 0;
} catch (error) {
  dockWidth = 0;
}
if (!(dockWidth > 0)) {
  dockWidth = 360; // 仅当节点尚未挂载时命中；不要当作真实宽度使用
}
var panelWidth = dockWidth;
~~~

---

### F-02 副标题灰 #64748b 在玻璃上只有 2.11:1：玻璃区间内不可救，唯一出路是换墨色（P1）

**位置**
- 定义：ExPanel.css:706-714（.sign-option-desc，10.5px + #64748b）
- 同类：ExPanel.css:837（.miuix-seg__label）、1202（.ex-gift-picker__tab）、1322（.ex-gift-cell__price 10px）、1868（.lottery__jointext）、2071（.danmaku-history-panel__count）、2156（__status-text）、1524（.postbird-box-close-btn）、88（.ex-panel__close）
- 数据：metrics/css-crosscheck.json X03、metrics/css-route-analysis.json 的 whiteGlass["#64748b"]

**现状**

~~~css
/* 706 */
.sign-option-desc {
    font-size: 10.5px !important;
    color: #64748b !important;
    line-height: 1.2 !important;
}
~~~

**为什么是问题**
面板玻璃 = rgba(255,255,255,0.65) 叠在视频帧上。深色直播帧 #101418 合成 #abadae，#64748b 对它 **2.11:1**；亮色帧 #d8dee6 合成 #f1f3f6，**4.30:1**（连 4.5 都不到）。而它承载的正是"一键签到"的选项说明、续牌说明、抽奖参与条件——用户唯一能读到"这个开关到底在干什么"的地方。

比“某个值偏低”更关键的是：**它在这个玻璃体系里已经调不出来了**。反解“要让 #64748b 达到 4.5:1 需要多大玻璃 alpha” → **0.975**（css-route-analysis.json）。也就是说，想靠调玻璃救它，唯一办法是把玻璃做成 97.5% 不透明的白板——那时它已经不算玻璃，而且已经贴着 alpha=1.0 时对纯白 4.76:1 的极限。**结论：在“仍是玻璃”的可行区间（alpha 0.65–0.95）内不可救，唯一出路是换墨色。**

**真机实测再加一层证据（Lead 提供，live/contrast-text.json）**：副标题对卡片底 #efeff0 的理论比值约 4.1–4.3，但**像素采样只有 2.91:1**。原因是 10.5px 的中文笔画在 100% 缩放下没有任何一笔能盖满一个像素，抗锯齿把有效对比再压低约 30%。这把问题钉成两半：**颜色太浅（理论不达标）+ 字号太小（实测更差）**。所以修复必须颜色和字号一起改——只把颜色换成 #475569、字号仍留 10.5px，实测大约只能抬到 3.9 左右，仍然过不了 4.5。

用户痛感场景：夜间看直播（画面本来就暗）打开「一键签到」，每一条选项下面那行 10.5px 说明基本读不出来——它不是"有点淡"，而是在暗场上彻底融进背景。

**修复**

把二级文字色整体下沉一档，并取消 #64748b 作为"玻璃上文字"的资格（之后只能用在纯白底上）：

~~~css
:root {
    /* 玻璃上文字的三档墨色：全部经 alpha 0.90 白玻璃 + 纯黑帧验证（§8 表） */
    --dx-ink-1: #0f172a;        /* 标题/正文主色     → 14.24:1 */
    --dx-ink-2: #334155;        /* 次级正文/图标      →  8.26:1 */
    --dx-ink-3: #475569;        /* 说明文字/元信息    →  6.90:1 */
    --dx-ink-disabled: #64748b; /* 仅限不透明白底 */
}

/* 706 起：只换颜色，字号一并并到刻度表（§8.4）*/
.sign-option-desc {
    font-size: 11px !important;
    color: var(--dx-ink-3) !important;
    line-height: 1.3 !important;
}
~~~

同理替换 837 / 1202 / 1322 / 1868 / 2071 / 2156 / 1524 → var(--dx-ink-3)；88 行的 .ex-panel__close 底色是纯白 #ffffff（87 行），可以保留 #64748b（4.76:1 达标）。

---

### F-03 #94a3b8 当文字/图标色 = 1.14:1，等于不可读（P1）

**位置**
- ExPanel.css:1238（.ex-gift-picker__close，20px 的 ×）
- ExPanel.css:1434（.DanmakuTail-close，16px 的 ×）
- ExPanel.css:1765（.bloop textarea:disabled 文字）
- ExPanel.css:495-496（折叠三角 border-color）
- ExPanel.css:922（禁用主按钮**底色**）、1633（.exupdate-state-btn--checking 底色）

**现状**

~~~css
/* 1238 / 1434 */
.ex-gift-picker__close { font-size: 20px !important; color: #94a3b8 !important; }
.DanmakuTail-close      { font-size: 16px !important; color: #94a3b8 !important; }
~~~

**为什么是问题**
#94a3b8 在面板玻璃（#abadae）上是 **1.14:1**——比"低对比"更极端：浅灰字写在浅灰底上。它是整个系统里唯一一个连 3:1 都摸不到的墨色（css-frame-matrix.json：最亮帧 2.56、最暗帧 1.05）。作为关闭按钮，用户需要在 380×370 的面板右上角找到它——现在它和背景的亮度差约 4 个灰阶。

顺带：#94a3b8 还被用作**底色**（922 禁用主按钮、1633 检测中按钮），此时反白文字对它只有 **2.56:1**，两个用途同时失败。

**修复**

~~~css
/* 关闭类图标：常态用 ink-3，hover 反色（现有 hover 已经写了 #0f172a，保留） */
.ex-gift-picker__close,
.DanmakuTail-close,
.postbird-box-close-btn {
    color: var(--dx-ink-3) !important;
}

/* 禁用态：底色留在 #94a3b8 观感不变，但给字形加一层深描边兜底 */
.ex-btn-primary:disabled,
.fans-panel__submit-btn:disabled,
.popup-panel__submit-btn:disabled,
.exupdate-panel__submit-btn:disabled {
    background: #94a3b8 !important;
    color: #ffffff !important;
    text-shadow: 0 1px 1px rgba(15, 23, 42, 0.45) !important;
}
~~~

> 说明：禁用态在 WCAG 里属于 inactive UI component，1.4.3 对它豁免。但 .exupdate-state-btn--checking **不是禁用态，而是"检测中"的可交互态**（cursor: wait），它必须达 4.5——这一条是真缺陷，见 F-04。

---

### F-04 更新控制台 6 个状态按钮，4 个白字对比度不达标（P1）

**位置** ExPanel.css:1618-1669

**现状**

~~~css
.exupdate-state-btn--checking { background: #94a3b8 !important; }                                   /* 白字 2.56 */
.exupdate-state-btn--latest   { background: linear-gradient(135deg, #10b981, #059669) !important; } /* 2.54 → 3.77 */
.exupdate-state-btn--upgrade  { background: linear-gradient(135deg, #f59e0b, #d97706) !important; } /* 2.15 → 3.19 */
.exupdate-state-btn--error    { background: linear-gradient(135deg, #ef4444, #dc2626) !important; } /* 3.76 → 4.83 */
.exupdate-state-btn--ack,
.exupdate-state-btn--check    { background: linear-gradient(135deg, #2b7fff, #0055ff) !important; } /* 3.76 → 5.61 */
~~~

**为什么是问题**
"有新版本可升级"和"已是最新"是这个面板最重要的两个信息，恰好是全文件对比度最差的两颗按钮（2.15 / 2.54，不到 AA 的一半）。渐变还让对比度沿对角线变化：--upgrade 左上角 2.15、右下角 3.19，按钮文字居中落在 **2.6:1** 附近。6 个状态用了 12 个手写 hex，零 token。

用户痛感：这按钮的意思是"点我升级"，但在亮橙底上白字发虚，反而看起来像**被禁用的**。

**修复**

~~~css
:root {
    --dx-state-info:   linear-gradient(135deg, #0066ff, #004de6); /* 白字 ≥6.55 */
    --dx-state-ok:     linear-gradient(135deg, #047857, #065f46); /* 白字 ≥7.9  */
    --dx-state-warn:   linear-gradient(135deg, #b45309, #92400e); /* 白字 ≥5.0  */
    --dx-state-danger: linear-gradient(135deg, #dc2626, #b91c1c); /* 白字 ≥4.8  */
    --dx-state-busy:   #475569;                                   /* 白字 7.4   */
}
.exupdate-state-btn--ack,
.exupdate-state-btn--check  { background: var(--dx-state-info) !important; }
.exupdate-state-btn--latest { background: var(--dx-state-ok) !important; }
.exupdate-state-btn--upgrade{ background: var(--dx-state-warn) !important; }
.exupdate-state-btn--error  { background: var(--dx-state-danger) !important; }
.exupdate-state-btn--checking { background: var(--dx-state-busy) !important; }
~~~

---

### F-05 分段胶囊的未选中项：1.87:1，比副标题还糟（P1，本次新发现）

**位置** ExPanel.css:789-798（轨道底）+ 828-843（未选中文字）+ 849-853（选中文字）

**现状**

~~~css
/* 795 */
.miuix-seg { background: rgba(0, 0, 0, 0.06) !important; border-radius: 9px !important; }

/* 834-837 */
.miuix-seg__label { font-size: 11.5px !important; color: #64748b !important; }

/* 849-852 */
.miuix-seg__item > input[type="radio"]:checked + .miuix-seg__label {
    background: #ffffff !important;
    color: var(--miuix-blue) !important;
}
~~~

**为什么是问题**
轨道是一层**压暗**的 rgba(0,0,0,0.06)，把面板玻璃从 #abadae 压到 #a1a2a4；未选中文字 #64748b 落在上面 → **1.87:1**（css-crosscheck.json X14）。选中项是白底蓝字，4.83:1 达标。于是这个控件呈现出两极分化：选中的很清楚，没选中的几乎看不见——而"没选中"恰恰是用户做选择时需要读的部分。

.miuix-seg 用在同屏播放模式、自动钓鱼模式、小尾巴位置、清晰度切换**四个高频互斥选择器**上。

**修复**

~~~css
.miuix-seg {
    background: rgba(15, 23, 42, 0.06) !important;  /* 保留暗轨观感 */
    border-radius: 9px !important;
}
.miuix-seg__label {
    color: var(--dx-ink-2) !important;   /* #334155 → 现轨道上 4.07:1；配 §8 alpha 0.90 后 5.9:1 */
    font-size: 12px !important;          /* 11.5 → 12，并到刻度 */
}
~~~

若要保持"未选中明显淡于选中"的层次，则**必须**把轨道改成浅色（rgba(255,255,255,0.55)，让未选中落在 #c9caca 上，#334155 有 6.28:1），而不是靠把文字调灰——在玻璃上，"淡"与"看不见"之间的余量只有 0.4 个比值。

---

### F-06 零 prefers-reduced-motion：47 条动画没有任何降级出口（P1）

**位置** 全文件（grep -c prefers-reduced-motion src/packages/ExPanel/ExPanel.css → 0）；动效分布见 metrics/css-motion.json

**现状**

~~~css
/* 56 行的 Dock 弹入 —— 每次开 Dock 都跑 */
.ex-panel.miuix-dock-in { animation: miuix-dock-spring-in 0.28s var(--miuix-spring) forwards !important; }

/* 270 行的面板弹入 —— 每个三级面板都跑 */
animation: miuix-modal-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
~~~

**为什么是问题**
--miuix-spring: cubic-bezier(0.34, 1.56, 0.64, 1) 是**过冲曲线**（1.56 > 1），miuix-dock-spring-in 在 65% 帧还会 scale(1.02) **反向放大**——这是前庭敏感用户最容易触发不适的两类动效。而 miuix-dock-spring-in 的触发条件是 54 行的 .ex-panel[style*="display: flex"]，等于"只要 Dock 显示就播"，用户每开一次二级菜单就被弹一次。

全文件 0 处 prefers-reduced-motion，也没有任何运动降级开关。transition: all 27 处让问题从"几处动画"扩散成"每次 hover 都有位移"。

**修复**（一条 media query 收口，不需要逐条改）

~~~css
@media (prefers-reduced-motion: reduce) {
    .ex-panel,
    .ex-panel__wrap > div,
    .ex-panel__indicator,
    .miuix-modal,
    .miuix-modal__close,
    .miuix-seg__label,
    .sign-checkbox,
    .miuix-switch,
    .ex-btn-primary,
    .ex-send-btn,
    .ex-gift-cell,
    .ex-gift-picker-modal {
        transition-duration: 0.01ms !important;
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
    }
    /* 旋转 loading 是状态指示而非装饰，保留但放慢，避免整屏静止让人以为卡死 */
    .ms-slot__spin { animation-duration: 2.4s !important; }
}
~~~

---

### F-07 13 个交互元素计算高度 < 24px（P1）

**位置** 见 metrics/css-target-size.json 的 smallTargets

| 元素 | 行 | 计算高度 | 用途 |
|---|---|---|---|
| .popup-ms__room-vol | 2623 | 16px | 每房间音量滑杆 |
| .ms-slot__name | 2217 | 16.8px | 多屏格子里的房名胶囊（点击换房） |
| .livetool__cell_title span:not([id$="__title"]) | 517 | 17.2px | 导出/导入/名单/面板 四颗胶囊 |
| .ChatToolBar-DanmakuTail / -tip | 1331 / 1342 | 18px | 聊天栏「尾」按钮 |
| .ex-picker-btn / .popup-panel__paste-btn | 930 | 19.2px | 选择道具/选礼物/粘贴 |
| .livetool input[type="button"] | 606 | 19.8px | 抽屉内操作按钮 |
| .DanmakuTail-close | 1431 | 20px | 小尾巴面板关闭 |
| .popup-ms__chip | 2501 | 20px | 合弹幕/合画面 |
| .popup-ms__room-del | 2603 | 20px | 移除房间（破坏性操作） |
| .ex-send-btn | 950 | 21.8px | 送出 |
| .sign-checkbox / .miuix-switch | 721 | 22px（38×22） | 全站开关 |
| .ex-gift-picker__tab | 1196 | 22.4px | 礼物大盘 Tab |

**为什么是问题**
WCAG 2.2 SC 2.5.8（AA）要求指针目标至少 24×24 CSS px。最要命的是 .popup-ms__room-del（20×20 的移除房间）紧挨着 .popup-ms__room-vol（62×16 的音量条），两者垂直间距仅 4px（2480 行 gap: 4px）——用户想拖音量，很容易点到"移除这个房间"。另注：.miuix-modal input[type="text"]（977–999）padding: 3px 6px + font-size: 11.5px → 计算高度 22px，也在 24 以下。

**修复**

~~~css
/* 视觉尺寸不变、命中区变大：伪元素扩边 */
.popup-ms__room-del,
.DanmakuTail-close,
.ex-gift-picker__close,
.postbird-box-close-btn { position: relative !important; }
.popup-ms__room-del::after,
.DanmakuTail-close::after,
.ex-gift-picker__close::after,
.postbird-box-close-btn::after {
    content: "" !important;
    position: absolute !important;
    inset: -4px !important;          /* 20 → 28 命中区 */
    border-radius: 8px !important;
}
.popup-ms__room-sub { gap: 10px !important; }   /* 2493 行由 6px 提升，避免误触 */

.miuix-modal input[type="text"],
.miuix-modal input[type="number"] {
    padding: 4px 8px !important;      /* 14 + 8 + 2 = 24px */
    font-size: 12px !important;
}
~~~

---

### F-08 55 处 hover、18 处 active、只有 2 处 focus-visible（P1）

**位置** ExPanel.css:859（唯一一处按钮类焦点环）、2724（.popup-ms__result）、16 处 outline: none

**现状**

~~~css
/* 859 —— 全文件唯一给"非输入框"控件做的焦点环 */
.miuix-seg__item > input[type="radio"]:focus-visible + .miuix-seg__label {
    box-shadow: 0 0 0 2px var(--miuix-blue-glow) !important;
}

/* 898 —— 主按钮把 outline 抹了，没有任何替代 */
.ex-btn-primary { outline: none !important; }
~~~

**为什么是问题**
:focus-visible 命中数 3（其中 1 个只出现在注释里），而 :hover 55、:active 18。这不是"焦点样式不够漂亮"，是**键盘用户按 Tab 时完全看不到自己在哪**：主按钮、送出按钮、礼物格、抽屉胶囊、关闭按钮全部 outline: none 且无替代环。加上 .ex-icon（ExIcon.css:10-18）也是 cursor: pointer 无焦点态，整套 UI 对键盘是黑的。

附带的量：:focus 有 15 条，全部是 input/textarea/select，靠 box-shadow: 0 0 0 2px var(--miuix-blue-glow) 做环——而 --miuix-blue-glow 是 rgba(0,102,255,0.4)，2px 的 40% 蓝在 #abadae 上对比度约 **1.4:1**，低于 1.4.11 对焦点指示的 3:1 要求。

**修复**（一处收口）

~~~css
:where(.ex-btn-primary, .ex-send-btn, .ex-picker-btn, .popup-panel__paste-btn,
       .ex-panel__close, .miuix-modal__close, .ex-gift-picker__close,
       .ex-gift-cell, .miuix-gift-badge, .livetool__cell_title span,
       .popup-ms__chip, .popup-ms__room-del, .danmaku-history-panel__date-btn):focus-visible {
    outline: 2px solid var(--miuix-blue) !important;
    outline-offset: 2px !important;
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.9) !important;
}

/* 输入类焦点环加深，从 1.4:1 提到 4.3:1 */
.miuix-modal input[type="text"]:focus,
.miuix-modal input[type="number"]:focus,
.miuix-modal textarea:focus,
.miuix-modal select:focus {
    box-shadow: 0 0 0 2px var(--miuix-blue), 0 0 0 4px rgba(255, 255, 255, 0.85) !important;
}
~~~

---

### F-09 玻璃上的蓝字 var(--miuix-blue)：2.14:1，29 处全部不达标（P1）

**位置** --miuix-blue 定义在 ExPanel.css:23，被引用 29 次（css-tokens.json）。文字用途举例：508（抽屉展开标题）、520（胶囊操作按钮文字）、933（选择道具按钮）、1106（礼物徽章箭头）、1211（礼物 Tab 选中）、2007（.metadata__retry）、2377（.popup-ms__count）、2529（chip 按下态）、2556（档位角标）、2763（.popup-ms__flag.is-on）、2846（选中图标）

**现状**

~~~css
/* 929-936 */
.ex-picker-btn, .popup-panel__paste-btn {
    background: rgba(0, 102, 255, 0.08) !important;
    color: var(--miuix-blue) !important;
    font-size: 11px !important;
}
~~~

**为什么是问题**
#0066ff 在面板玻璃上是 **2.14:1**；在它自己那层 rgba(0,102,255,0.08) 浅蓝底上更差，**1.99:1**（css-contrast-claims.json C07）。它作为**填充色**（白字压在上面 4.83:1）是合格的，作为**文字/图标色**不合格——这一个 token 同时承担了两个相反的职责，这是整个配色系统里最根本的一处语义混用。

按 1.4.11（非文本对比 ≥3:1），连图标也不算过关（2.14 < 3）。

**修复**：拆成"填充"与"墨色"两枚 token

~~~css
:root {
    --dx-accent-fill: #0066ff;         /* 只做底色；上面放白字 4.83:1 */
    --dx-accent-ink:  #0047b3;         /* 只做文字/图标：面板玻璃上 6.56:1，纯白底 8.6:1 */
    --dx-accent-ink-on-white: #0066ff; /* 仅限纯白底（如段控选中项），4.83:1 */
}
~~~

> 取值依据：css-route-analysis.json 反解出"alpha 0.90 白玻璃 + 纯黑帧"下蓝字达 4.5 的最小值是 #005ce7；#0047b3 留出安全余量到 6.56:1，同时保住 PL 蓝的色相（只压明度）。

---

## 4. P2 发现（一致性 / 打磨）

### F-10 Dock 胶囊内容高 54px，磁贴却是 56px——溢出 2px（P2）

**位置** ExPanel.css:37-40（胶囊盒模型）、126-127（磁贴尺寸）、114-123（内层 wrap）

**现状**

~~~css
.ex-panel {
    height: 76px !important;
    border-radius: 38px !important;
    padding: 10px 18px !important;
    box-sizing: border-box !important;
    overflow: visible;
}
.ex-panel__wrap > div { width: 56px !important; height: 56px !important; }
~~~

**为什么是问题**
76 − 10×2（padding）− 1×2（border）= **54px** 的内容高，装 56px 的磁贴 → 上下各溢出 1px。.ex-panel 是 overflow: visible，所以磁贴真的画到胶囊轮廓之外，圆角处能看到磁贴的直角边探出 1px。56 是写在磁贴上的硬值，54 是从 76/10/1 推出来的隐式值——两者从来没有对过账。

**修复**（不新增 76/56 字面量，让内容高与磁贴同源）

~~~css
:root {
    --dx-size-tile: 56px;
    --dx-dock-padding-y: 10px;
    --dx-size-dock-height: calc(var(--dx-size-tile) + var(--dx-dock-padding-y) * 2 + 2px);
}
.ex-panel {
    height: var(--dx-size-dock-height) !important;
    padding: var(--dx-dock-padding-y) 18px !important;
    border-radius: calc(var(--dx-size-dock-height) / 2) !important;
}
.ex-panel__wrap > div { width: var(--dx-size-tile) !important; height: var(--dx-size-tile) !important; }
~~~

---

### F-11 Dock 没有 max-width，而面板有（P2）

**位置** ExPanel.css:31-50（.ex-panel：right: 0 + width: max-content）对比 225（面板：max-width: calc(100vw - 24px)）

**为什么是问题**
Dock 宽度 = N×56 + (N−1)×10 + 36 + 2：8 个磁贴 = **556px**，9 个 = **622px**（ExPanel.js:503-514 的 EX_DOCK_PANEL_MAP 最多映射 9 个入口）。它 position: absolute; right: 0 且无 max-width，在窄窗口下会整条往左顶出视口。面板已经被 max-width: calc(100vw - 24px) 保护了，Dock 没有——同一个文件里两套响应式纪律。

**修复**

~~~css
.ex-panel {
    max-width: calc(100vw - 24px) !important;
    overflow-x: auto !important;
}
.ex-panel::-webkit-scrollbar { height: 3px !important; }
.ex-panel::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.16) !important; border-radius: 2px !important; }
~~~

---

### F-12 面板高度是"死高"，且 52px 是第二份真源（P2）

**位置** ExPanel.css:226-228（三连死高）、355（calc(var(--miuix-modal-height) - 52px)）、ExPanel.js:700

**现状**

~~~css
/* 226-228：min = max = height，面板不可能变矮 */
height: var(--miuix-modal-height) !important;
max-height: var(--miuix-modal-height) !important;
min-height: var(--miuix-modal-height) !important;

/* 355：52 是"Header 高度"的第二次手写 */
max-height: calc(var(--miuix-modal-height) - 52px) !important;
~~~

**为什么是问题**
两件事：

1. **52 是第二份真源**。Header（281–300）的实际高度 = 内容行 26（关闭按钮）+ padding 24 + border-bottom 1 = **51px**，且完全由 padding: 12px 16px 与 26px 的关闭按钮推导。把它写成字面量 52 意味着：改 Header 内边距、或标题换成两行，body 的可视高度就悄悄错位，而没有任何断言会发现。
2. **竖向没有视口保护**。横向有 max-width: calc(100vw - 24px)，竖向三连死高 → 不可压缩。ExPanel.js:700 的 bottom = Math.max(20, window.innerHeight - rect.top + 12) 只夹下限，**从不检查面板顶边是否会跑到视口上方**。

   精确模型（v2 修订，替换初版“370 + 76 + 32 = 478px 预算”的粗算）：面板顶边 = toolbarRect.top − 382（面板高 370 + gap 12）。**只要聊天工具栏的顶边距视口顶部不足 382px，Header 连同关闭按钮就一起出屏。** 以此为判据：
   - 1280×720 @125% → CSS 视口 1024×576，聊天栏顶边一般落在 480–540 → 面板顶边 98–158，安全；
   - 同屏 @150% → CSS 视口 853×480，聊天栏被压到 400 上下 → 面板顶边约 18，擦边；
   - 小窗 / 剧场模式 / 多屏页把聊天栏上移到 300 → 面板顶边 −82，顶部被切掉，只能靠 Dock 再点一次关。

   另注：ExPanel.css:33 的 bottom: 32px 是**死代码**——Dock 的底距由 ExPanel.js:420 的行内 bottom = PlayerToolbar.offsetHeight + 4 决定（真机实测 108 + 4 = **112px**），普通行内声明压过普通作者声明。所以 Dock 实际占 112 + 76 = 188px 竖向空间，初版按 32px 算的那笔账作废。

**修复**

~~~css
/* 去掉 min-height 死锁，把 370 变成"期望高度"而不是"法律" */
.miuix-modal, .sign-panel, .fans-continue-panel, .extool, .livetool,
.bloop, .exlottery, .popup-player-panel, .exupdate-panel {
    height: var(--miuix-modal-height) !important;
    min-height: 0 !important;
    max-height: min(var(--miuix-modal-height), calc(100vh - 132px)) !important;
}
.miuix-modal__body { max-height: none !important; }   /* 交给 flex 分配，不再手写 52 */
~~~

配套 JS（提案）：把 bottom 改为先算 top，再夹取 top >= 12：

~~~js
// ExPanel.js: 替换 700 行
var panelHeight = panel.getBoundingClientRect().height || 0;
var desiredTop = rect.top - panelHeight - 12;
var clampedTop = Math.max(12, Math.min(window.innerHeight - panelHeight - 12, desiredTop));
bottom = Math.max(12, window.innerHeight - clampedTop - panelHeight);
~~~

132px = 76（Dock）+ 32（bottom）+ 24（安全边），且不含 380/370 字面量。

---

### F-13 全文件 0 处 @media：380 宽在小窗口只靠 max-width 硬扛（P2）

**位置** css-inventory.json → mediaQueries: []

**为什么是问题**
没有断点，所有适配靠三条孤立的 max-width（225、1141、1143）与 min()。具体表现：--miuix-modal-height: 370px 恒定，而 --miuix-modal-width: 380px 会被 calc(100vw - 24px) 压缩到 356（400px 视口）。压缩后卡片内边距不变（margin: 0 12px 10px、padding: 10px 14px），.ex-gift-grid 还是 repeat(4, 1fr)（1272 行）→ 每格约 (356−40−30)/4 ≈ 71px 宽，而格内图片固定 44px + 文字 11.5px，勉强；再窄就会挤压换行。

**修复**（两档足矣，不做移动端适配——这是桌面直播页的浮层）

~~~css
@media (max-width: 520px) {
    .ex-gift-grid { grid-template-columns: repeat(3, 1fr) !important; }
    .fans-panel__card, .popup-panel__card, .exupdate-panel__card,
    .miuix-card, .livetool__cell { margin: 0 8px 8px 8px !important; padding: 8px 10px !important; }
}
@media (max-height: 560px) {
    .miuix-modal, .sign-panel, .fans-continue-panel, .extool, .livetool,
    .bloop, .exlottery, .popup-player-panel, .exupdate-panel {
        max-height: calc(100vh - 132px) !important;
        min-height: 0 !important;
    }
}
~~~

---

### F-14 backdrop-filter 与 transition: all 叠在一起：每次 hover 重算一次 40px 模糊（P2）

**位置** ExPanel.css:417（卡片自己的 blur(12px)）+ 420（transition: all 0.2s）+ 423-431（hover 改 background）

**现状**

~~~css
.fans-panel__card, .popup-panel__card, .exupdate-panel__card, .miuix-card, .livetool__cell {
    backdrop-filter: blur(12px) !important;
    transition: all 0.2s var(--miuix-spring) !important;   /* ← all */
}
.fans-panel__card:hover { background: rgba(255, 255, 255, 0.75) !important; }
~~~

**为什么是问题**
transition: all 让 background-color 每一帧都变；而卡片本身是 backdrop-filter 的根，它的背景变化会强制浏览器**重新快照并重新模糊它下面的一切**（包括 40px 模糊的面板玻璃与 60fps 的视频）。all 还会顺带过渡 box-shadow、border-color、transform 等，一次 hover 就是 6 条属性的逐帧插值 + 一次全区域重模糊。全文件 27 处 transition: all，其中 12 处落在带 backdrop-filter 的元素或它的祖先上。

**修复**

~~~css
.fans-panel__card, .popup-panel__card, .exupdate-panel__card, .miuix-card, .livetool__cell {
    transition: background-color 0.18s cubic-bezier(0.16, 1, 0.3, 1),
                border-color   0.18s cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow     0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
}
~~~

---

### F-15 开关按压缩放用 width 动画（布局属性）（P2）

**位置** ExPanel.css:742-762

**现状**

~~~css
.sign-checkbox::before, .miuix-switch::before, ... {
    width: 18px !important; height: 18px !important; border-radius: 50% !important;
    transition: transform 0.32s var(--miuix-spring), width 0.2s ease !important;
}
.sign-checkbox:active::before, ... { width: 22px !important; }
~~~

**为什么是问题**
width 是布局属性，逐帧改它会触发 reflow；而这是**每次按下开关都要跑一遍**的微交互。同时 0.32s 是全文件最慢的微交互时长（其余 0.16–0.22s），一次按压要等三分之一秒才到位。border-radius: 50% + 宽高不等（22×18）会把圆形滑块压成椭圆——这可能是刻意的"果冻"效果，但代价是 reflow。

**修复**（改用 scaleX，零 reflow，观感等价）

~~~css
.sign-checkbox::before, .miuix-switch::before, input[type="checkbox"].sign-checkbox::before {
    transition: transform 0.24s var(--dx-ease-spring) !important;
    transform-origin: center !important;
}
.sign-checkbox:active::before, .miuix-switch:active::before,
input[type="checkbox"].sign-checkbox:active::before {
    transform: scaleX(1.22) !important;    /* 18 → 22 的视觉等价 */
}
.sign-checkbox:checked:active::before, .miuix-switch:checked:active::before,
input[type="checkbox"].sign-checkbox:checked:active::before {
    transform: translateX(16px) scaleX(1.22) !important;
}
~~~

---

### F-16 三处真重复 + 一处死声明 + 一组失效的 overflow（P2）

**位置与现状**

1. 2859-2862 与 302-305 的 .miuix-modal__title-box 逐字相同（display: flex + align-items: center）。
2. 1674-1678 的 .extool input[type="text"]:focus 与 1001-1009 里同名选择器重复声明 border-color 与 box-shadow；1913-1925 的 .miuix-modal select:focus 同样重复了 1009 行的两条。
3. 357-358：
   ~~~css
   overflow-y: auto !important;
   overflow-y: overlay !important;   /* 同一规则内被下一行覆盖；overlay 在 Chromium ≥114 已别名化为 auto */
   ~~~
4. 2440-2442 的 .popup-ms__restore[hidden] { display: none !important; } 与 2366-2368 的 .popup-panel__page[hidden] 是同一种"用 !important 压 UA 的 [hidden]"补丁——说明 display: flex !important 已经在系统性破坏 [hidden] 语义。

**为什么是问题**
css-conflicts.json 显示只有 3 个选择器存在同属性重复声明——**这不是"特异性战争"，而是三处遗忘**。真正的成本在第 4 条：用 !important 写 display: flex 之后，[hidden] 属性全部失效，每加一个可隐藏容器就要再补一条 !important。这是个会自我繁殖的补丁。

**修复**

~~~css
/* 1) 删掉 2859-2862 整块（Phosphor 节不需要重复 title-box） */
/* 2) 删掉 357 或 358 其中一行（overlay 与 auto 不要都留） */
overflow-y: auto !important;

/* 4) 一劳永逸：让 [hidden] 在 !important 世界里也能生效（放文件最前，靠源码顺序取胜） */
[hidden] { display: none !important; }
~~~

---

## 5. P3 发现（锦上添花）

### F-17 三级面板的 52px 与 Header 的 51px 已经差 1px（P3）

由 F-12 的算术：Header = 26（关闭按钮高，281–300 行）+ 12×2（padding）+ 1（border-bottom）= 51px；355 行按 52 扣减 → body 上限 318px，51 + 318 = 369，面板 370 → 底部留 1px 空隙。量级可忽略，但它证明"手写第二真源"已经在漂移。

### F-18 章节编号：缺 21，重复 9（P3）

**位置** ExPanel.css:974（9. 通用输入框…）与 ExPanel.css:2816（9. Phosphor 图标层…）；2180（20.）直接跳到 2361（22.）

**修复**：Phosphor 节改 24.，或把 21 补上（多屏格子实际被拆成 20/22 两段，21 是被删掉的旧编号）。建议同时给每节加一行 /* deps: ... */。

### F-19 同一个"次级说明"角色有四套参数（P3）

| 位置 | 类 | 字号 | 颜色 | 实测比（暗帧玻璃上） |
|---|---|---|---|---|
| 706 | .sign-option-desc | 10.5px | #64748b | 2.89 |
| 1320 | .ex-gift-cell__price | 10px | #64748b | 3.06 |
| 1866 | .lottery__jointext | 11px | #64748b | 2.89 |
| 2154 | .danmaku-history-panel__status-text | 10.5px | #64748b | 2.89 |
| 2444 | .popup-ms__restore-text | 11px | rgba(15,23,42,0.6) | 3.42 |
| 2501 | .popup-ms__chip | 11px | rgba(15,23,42,0.55) | 3.42 |
| 2747 | .popup-ms__result-meta | 11px | rgba(15,23,42,0.55) | 3.42 |

**为什么是问题**
同一个职责出现 **3 种字号 × 3 种颜色写法**（hex / 半透明 slate / token 蓝）。半透明 slate 是最糟的写法：rgba(15,23,42,0.55) 落在 item 底（#c9caca）上的实际对比是 **3.42:1**（css-crosscheck.json X16），0.5 的版本是 **3.00:1**（X17）——它把"这个颜色多深"交给了背景，写代码时无法知道最终比值。

**修复**：所有文字色改成不含 alpha 的实色 token（--dx-ink-3），需要"看起来淡"就用字号/字重，不要用透明度。

### F-20 固定 px 行高与字号不联动（P3）

**位置** 见 css-typography.json：line-height 有 1 / 1.2 / 1.25 / 1.3 / 1.4 / 1.45 / 1.5 七个无单位值，另有 15px / 18px / 24px / 34px 四个固定值。

**为什么是问题**
ExPanel.css:2314 的 .ms-slot__reload { height: 34px; line-height: 34px; } 是"用行高做垂直居中"的老手法：一旦文案换行（多屏小格子上 86px 宽的按钮，中文 4 字就满），行高会把文字挤到按钮外面。ExPanel.css:645 的 .exupdate-list { line-height: 18px; font-size: 11.5px } 在用户浏览器最小字号设为 16px 时会被撑破。

**修复**

~~~css
.ms-slot__reload {
    display: flex !important; align-items: center !important; justify-content: center !important;
    line-height: 1.2 !important;
}
.exupdate-list { line-height: 1.55 !important; }
~~~

---

### F-21 #ff3b30 是体系外的一颗红（P3）
ExPanel.css:201-209 的 Dock 角标点用了 iOS 红 #ff3b30，而全站主红是 #ef4444（102/338/629/1661 行）。同一个文件里 5 种红：#ef4444 / #dc2626 / #b91c1c / #d60909 / #ff3b30。角标点只有 8×8px，观感差异可忽略，但它证明调色板没有归口。

### F-22 数据 URI 里的颜色无法 token 化（P3）
ExPanel.css:1896 与 1924 的下拉箭头用 %2364748b / %230066ff 写死在 SVG data URI 里——这两个色值连正则都扫不到（URL 编码），是 token 审计的盲区。可行做法有两条：(a) 把箭头拆成伪元素承载（涉及 DOM 结构，归 JS 侧）；(b) 在 build.js 里做字符串替换，由 token 值生成两份 data URI（build.js 已有字符串处理能力）。

### F-23 ExIcon.css 完全脱离设计系统（P3）
44 行、29 条声明、**100% !important**、0 个 token、0 个 @media。两处值得一提：
- ExIcon.css:27 的 hover 光晕是 rgba(255, 102, 0, 0.35)（橙色），全文件独一份，与 --miuix-blue 体系无关；
- ExIcon.css:12-13 的 margin-left: auto !important; order: 9999 !important; 是纯布局 hack，靠 order 把一级入口钉到工具栏最右。一旦宿主把图标塞进非 flex 容器，这两条同时失效且不报错。

建议至少补 token 引用：background: rgba(255,255,255,0.25) → var(--miuix-item-bg)（值 0.35，需同步调），光晕橙改成 var(--dx-accent-fill)。

### F-24 Phosphor 层的图标尺寸三档（P3）
.ex-panel__icon svg 38px（184-186）、.ex-title-ico svg 19px（2871-2874）、.ex-card-ico svg 15px（2886-2889）。19 与 15 都不在 4 的倍数上，且 2877 行注释自称"15px 正好塞进 13px 标题行"——而标题行实际是 13px×1.2≈15.6px 的行盒，15px 图标只留 0.6px 余量。建议 16 / 20 两档。

### F-25 cursor: pointer 与真实可交互性不一致（P3）
.livetool__cell_title（466-476）整行 cursor: pointer，但只有左侧标题 span 绑了点击；.popup-ms__room（2470）没有 cursor，但内部有可点 chip。这类不一致会让用户点空。

---

### F-26 Dock 选中态的位移与 hover 位移打架，实测落在更小的那个（P3）

**位置** ExPanel.css:140-145（:hover 的 translateY(-2.5px)）与 ExPanel.css:2850-2856（.is-active / .ex-dock-active 的 translateY(-2px)），两处都带 !important

**为什么是问题**
选中的磁贴同时命中两条规则。按权重复算：.ex-panel__wrap > div:hover = (0,2,1)，.ex-panel__wrap > div.is-active = (0,3,1) → 后者更高，所以**悬停在已选中的磁贴上得到 −2px，比悬停普通磁贴的 −2.5px 还低 0.5px**。观感是“鼠标移到当前激活的图标上，它反而往下沉了一点”。Lead 真机实测落点 −2px，与权重推导一致。

**修复**：让选中态在 hover 时再抬一档，保证位移永远朝同一方向单调增加。

~~~css
.ex-panel__wrap > div.is-active:hover,
.ex-panel__wrap > div.ex-dock-active:hover {
    transform: translateY(-3.5px) !important;
}
~~~

---

## 6. 对"重点怀疑方向"的逐条结论

| 怀疑 | 结论 | 依据 |
|---|---|---|
| ① !important 已泛滥到失去层叠意义 | **成立，且比怀疑更彻底** | 95.27%（1,532/1,608），297 条规则平均 5.16 条；非 !important 的 76 条基本都在 :root |
| ② 玻璃底在深色视频上文字对比是否够 | **不够**。仅 #0f172a(7.91) 与 #334155(4.59) 过线，后者余量仅 2% | F-02/03/09；纯黑帧下 #334155 掉到 **4.24**（css-frame-matrix.json） |
| ③ 8 个面板是否真共用一套 token | **几何共用，视觉各写各的** | 215-243 一块管住 9 个选择器的宽高圆角；内部却有 5 种标题字号、7 种正文灰、13 档字号（F-19） |
| ④ 动效曲线是否统一 | **不统一，且同一条 transition 内部就不统一** | ease×26 vs spring×24 vs cubic-bezier(.16,1,.3,1)×6；334 行同一条声明里 bg 用 spring、color 用 ease |
| ⑤ 同屏两层 backdrop-filter(40px) 的代价 | **比"两层"更糟：峰值 10 层，其中 3 层嵌套** | §7 |
| ⑥ 固定 380 宽在小窗/高缩放下溢出 | **横向被 max-width 挡住了；纵向没有，≥150% 缩放即出屏** | F-12 的 478px 竖向预算 |

**另外两条原本没被怀疑、但实测存在的：**
- **380 在 JS 里还有第二份**（F-01）——宽度确实由 token 决定（作者 !important 压过普通内联），但居中算法自己拿 380 计算，改 token 会让面板整体偏移；设计系统的"单一真源"在数值层面尚未闭合。
- **#64748b 在玻璃的可行区间内不可救**（F-02）——要靠玻璃救它，alpha 得做到 0.975，那已经是一块不透明的白板；换墨色是唯一出路。

---

## 7. 性能：模糊链的真实成本

### 7.1 全部 11 个 backdrop-filter 表面（css-geometry.json → backdropValues）

| # | 行 | 选择器 | 半径 | saturate | 值来源 |
|---|---|---|---|---|---|
| 1 | 42 | .ex-panel（Dock） | 40px | 220% | var(--miuix-modal-blur) 合规 |
| 2 | 236 | .miuix-modal 等 9 个面板 | 40px | 220% | var(--miuix-modal-blur) 合规 |
| 3 | 291 | .miuix-modal__header | 28px | **190%** | 硬编码 |
| 4 | 417 | 四级卡片 ×5 | 12px | — | 硬编码 |
| 5 | 590 | 抽屉内面板 | 8px | — | 硬编码 |
| 6 | 1129 | .ex-gift-picker-mask | 8px | — | 硬编码 |
| 7 | 1146 | .ex-gift-picker-modal | 40px | 220% | **硬编码（与 token 值相同却不引用）** |
| 8 | 1369 | .ChatToolBar-DanmakuTail-Panel | 36px | 220% | 硬编码 |
| 9 | 1461 | .postbird-box-container | 8px | — | 硬编码 |
| 10 | 1486 | .postbird-box-content | 40px | 220% | **硬编码（同上）** |
| 11 | 1979 | .metadata__wrap | 28px | **200%** | 硬编码 |
| 12 | ExIcon.css:27 | .ex-icon a（一级入口，**常驻**） | 12px | — | 硬编码 |

> 11 组（22 条含 -webkit- 前缀）。其中 4 处写死的值与 --miuix-modal-blur 完全一致（1146/1486 就是 40px+saturate220%），纯属复制粘贴；blur(28px) 在两处配了 190% 与 200% 两种饱和，无理由。

### 7.2 峰值同屏层数与面积

以「直播间工具」面板（5 个抽屉卡片）打开、并划过一个抽屉为例：

| 层 | 半径 | 面积 @1x | 嵌套深度 |
|---|---|---|---|
| .ex-icon a（常驻） | 12px | 38×38 = 1,444 | 0 |
| Dock .ex-panel | 40px | 556×76 ≈ 42,256 | 0 |
| 面板 .miuix-modal | 40px | 380×370 = 140,600 | 1 |
| 面板 Header | 28px | 380×51 = 19,380 | **2（父级是 40px 面板）** |
| 卡片 ×5 | 12px | 5×356×48 ≈ 85,440 | **3** |
| 抽屉内页 ×1 | 8px | 328×60 ≈ 19,680 | **4** |
| **合计** | | **≈ 308,800 px²（0.31 Mpx）** | **10 个表面** |

同一时刻在 125% 系统缩放下 ×1.5625 → **≈ 0.48 Mpx**；150% → **≈ 0.70 Mpx**。

### 7.3 代价结构（不是"blur 算得慢"）

Chromium 的 backdrop-filter 实现是：**快照下层已绘制内容 → 按半径降采样 → 高斯近似（两趟）→ 升采样 → 合成**。逐项拆开：

1. **高斯本身很便宜**：40px 半径会先降到约 1/20 分辨率，380×370 的模糊实际发生在 19×19 的缓冲上。所以"40px 太贵"这个直觉是错的。
2. **贵的是快照与合成**：快照是 O(全下层面)，且每一层要额外一份全尺寸 render surface。10 个表面 = 10 份额外显存 + 10 次全区域 blit。
3. **视频让它永远无法缓存**：只要下层有 video 在播，快照每帧失效。这就是为什么"关掉直播页面后一切都很快"——静态页面的 backdrop 会被缓存。
4. **嵌套让成本串行**：Header 和卡片都在面板内部，它们的快照必须包含父级已模糊的结果 → 父级必须先出图、子级才能开始，链式串行；且父级的可视区域 = 所有子级的并集。这就是"两层 40px"的真实代价：不是两个 40px，而是"一个大 40px + 一个必须等它的 28px + 5 个必须等它们的 12px"。
5. **transition: all 是放大器**：卡片背景一帧一变（F-14），于是每次 hover 都触发"卡片重快照 → 父级 40px 重模糊 → 视频帧重新采样"。

> 诚实的边界：以上是结构性的（层数/面积/嵌套关系/失效条件），都是静态可证的；具体的**帧时间（ms）需要在真机 Performance 面板录制**，我不给编造的毫秒数。live-shooter 若测到 GPU 帧时间，可作为这条的最终裁定。

### 7.4 「层数 - 半径 - 代价」取舍表

| 方案 | 表面数 | 峰值模糊面积 | 视觉等价性 | 建议 |
|---|---|---|---|---|
| 现状 | 10 | 0.31 Mpx | — | |
| **A：只留面板一层 blur，其余全部去 filter** | **3**（Dock + 面板 + 常驻图标） | 0.18 Mpx | 卡片/Header/抽屉的"磨砂"几乎不可辨（见 §8.2 的 alpha 论证） | **首选**，改动最小、风险最低 |
| B：全部降到 blur(16px) | 10 | 0.31 Mpx | 40→16 的差异只在透视到高对比边缘时才可见 | 若必须保留多层，选这个 |
| C：全链路改"磨砂白卡"（alpha 0.90 + 无 blur） | **0** | 0 | **视觉上几乎无损**：alpha 0.90 时背景只贡献 10%，模糊与否的差异 ≤10% 局部对比 | **与 §8 的路线 B 合并执行** |
| D：保留现状 + will-change: backdrop-filter | 10 | 0.31 Mpx | — | **不要**：会更早建立 10 个合成层，显存翻倍，弱 GPU 上更卡 |

配套 token 改动：

~~~css
:root {
    --dx-glass-blur: blur(20px) saturate(180%);   /* 40 → 20；肉眼差异主要在边缘锐度 */
}
/* 除面板本体外，其余层改为纯 alpha —— 一次去掉 7 个表面 */
.miuix-modal__header,
.fans-panel__card, .popup-panel__card, .exupdate-panel__card, .miuix-card, .livetool__cell,
.vote__panel, .enter__panel, .mute__panel, .gift__panel, .reply__panel {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
}
~~~

---

## 8. token v2 提案

### 8.1 先回答一个定性问题：这套视觉到底该叫什么？

**结论：现在应当叫「磨砂白卡（frosted white card）」，不叫「玻璃拟态」。**

判据是算术，不是口味。background: rgba(255,255,255,0.65) 意味着**背景只贡献 35% 的颜色**，再叠 blur(40px) 把 40px 半径内的一切细节抹平——最终只能感知到"这块区域的**平均亮度**"。玻璃拟态的核心体验（能透过它看见后面东西的轮廓与颜色）在 alpha ≥ 0.5 时就已经消失。业界（含 ui-ux-pro-max 的 glassmorphism 条目）常用区间是 **alpha 0.1–0.3 / blur 10–20px**，那是"能看见后面"的区间；我们在它外面，而且远得多。

这个命名不是学术洁癖，它决定修复方向：
- 若坚持"玻璃"，就必须接受"文字压在任意视频上"这个前提 → 只能走**深色玻璃**（白字），因为浅色玻璃在任何暗帧上都无法承载任何颜色的文字；
- 若承认这是"磨砂白卡"，它的光学性质就应当向**不透明白卡**靠拢（alpha ≥ 0.9），文字用深墨——这才是一个可被 WCAG 验证的系统。

**关键数据**（css-route-analysis.json，反解"该墨色达到 4.5:1 所需的最小玻璃 alpha"，最坏帧取纯黑，因为视频会淡入黑场）：

| 墨色（白玻璃路线） | 需要的最小 alpha | 现 alpha = 0.65 时实测 |
|---|---|---|
| #0f172a | 0.505 | 7.31 达标 |
| #334155 | **0.670** | **4.24（黑帧）/ 4.59（#101418）** |
| #475569 | 0.785 | 3.40 不达标 |
| #64748b | **0.975** | 2.11 不达标 |
| #0066ff | **0.970** | 2.14 不达标 |
| #94a3b8 | 白玻璃路线下无解（反解要求 alpha ≤ 0.22，即把玻璃改成深色）| 1.14 |

| 墨色（深玻璃路线，白字） | 纯白帧上需要的最小 alpha |
|---|---|
| #ffffff | 0.580 |
| #cbd5e1 | 0.695 |
| #94a3b8 | 0.845 |
| #7db0ff | 0.800 |

**两条路线各自的 alpha 门槛都在 0.6 以上**——这就是"玻璃拟态 + 直播视频 + 文字"这个组合的结构性矛盾：要可读就得接近不透明，要透明就不可读。

### 8.2 路线 B（推荐）：诚实版磨砂白卡

**取舍建议：走 B。** 四条理由全是工程理由：
1. 本产品是**覆盖在视频上的工具层**，可读性 > 氛围感；用户来这里是为了签到/续牌/抽奖，不是为了欣赏材质。
2. 路线 A 要求整体转深色，与现有 MIUIX 浅色系统、--miuix-blue 的"澎湃蓝 + 白"品牌色直接冲突，改动面约等于全文件。
3. 路线 B 的 CSS 增量极小（alpha 提升 + 3 个墨色 token + 去 7 层 filter），可**按面板灰度上线**。
4. 路线 B 顺手解决性能：alpha 0.90 时 blur 的视觉贡献 ≤10%，backdrop-filter 可以整层删掉（§7.4 方案 C），10 层 → 0 层，且用户看不出区别。

**代价（必须让设计侧确认的一点）**：Dock 与面板底色从 #abadae（0.65 暗帧）变成 #e7e8e8（0.90 暗帧）——从"中灰玻璃"变成"接近白的卡"。这是路线 B 唯一的观感让步。

### 8.3 路线 A（备选）：深色玻璃 + 白字

~~~css
:root {
    --dx-surface-glass: rgba(16, 20, 26, 0.78);       /* ≥0.72 才能在纯白帧上保住白字 */
    --dx-glass-blur: blur(20px) saturate(160%);
    --dx-glass-border: 1px solid rgba(255, 255, 255, 0.16);
    --dx-ink-1: #f8fafc;      /* 白帧 8.2:1 / 黑帧 18:1 */
    --dx-ink-2: #cbd5e1;      /* 白帧 5.6:1 */
    --dx-ink-3: #94a3b8;      /* 白帧 3.6:1 —— 仅 ≥14px */
    --dx-accent-ink: #7db0ff; /* 白帧 3.9:1 */
}
~~~

**代价**：整套 UI 转深色，--miuix-blue 在深底上要加亮度（#4d94ff），且与斗鱼亮色页面形成"深色浮层叠亮色网页"的割裂。**不建议**，除非产品明确要夜间模式。

---

### 8.4 完整 token 表（路线 B，可直接替换 :root）

~~~css
:root {
    /* ===== 尺寸（380/370 各自保持唯一一次，见 AGENTS.md） ===== */
    --miuix-modal-width: 380px;
    --miuix-modal-height: 370px;
    --dx-size-tile: 56px;
    --dx-dock-padding-y: 10px;
    --dx-size-dock-height: calc(var(--dx-size-tile) + var(--dx-dock-padding-y) * 2 + 2px);
    --dx-size-dock-bottom: 32px;
    --dx-size-control-lg: 38px;    /* 大按钮 / 开关高度基准 */
    --dx-size-control-md: 28px;    /* 中按钮 / 关闭钮 */
    --dx-size-target-min: 24px;    /* 最小可点目标（WCAG 2.2 SC 2.5.8 下限） */

    /* ===== 圆角（6 档 + 胶囊 + 圆） ===== */
    --dx-radius-xs: 4px;      /* 角标、小标签 */
    --dx-radius-sm: 6px;      /* 胶囊按钮、输入框 */
    --dx-radius-md: 8px;      /* 小按钮、关闭钮、列表项 */
    --dx-radius-lg: 10px;     /* 主按钮、选项项 */
    --dx-radius-card: 14px;   /* 四级卡片 */
    --dx-radius-panel: 22px;  /* 三级面板 */
    --dx-radius-pill: 999px;  /* Dock 胶囊、开关、滑块、指示条 */
    --dx-radius-circle: 50%;

    /* ===== 字号（5 档 + 1 个字形尺寸） ===== */
    --dx-text-micro: 11px;   /* 角标内字、日志终端（原 10 / 10.5 / 11） */
    --dx-text-sm: 12px;      /* 说明、元信息、Tab（原 11.5 / 12） */
    --dx-text-md: 13px;      /* 正文、卡片标题（原 12.5 / 13 / 13.5） */
    --dx-text-lg: 14px;      /* 面板标题、主按钮（原 14） */
    --dx-text-xl: 16px;      /* 大标题 */
    --dx-glyph-close: 18px;  /* 关闭 × 的字形尺寸（原 16 / 18 / 20） */

    /* ===== 行高（3 档） ===== */
    --dx-leading-tight: 1.25;  /* 单行标题 */
    --dx-leading-base: 1.4;    /* 正文 */
    --dx-leading-loose: 1.55;  /* 多行日志 / 更新说明 */

    /* ===== 字重（3 档） ===== */
    --dx-weight-regular: 400;
    --dx-weight-medium: 600;
    --dx-weight-strong: 700;

    /* ===== 间距（4 的倍数，6 档） ===== */
    --dx-space-1: 4px;
    --dx-space-2: 8px;
    --dx-space-3: 12px;
    --dx-space-4: 16px;
    --dx-space-5: 24px;
    --dx-space-6: 32px;

    /* ===== 动效（4 档 + 1 循环） ===== */
    --dx-dur-fast: 120ms;    /* 颜色/边框状态切换 */
    --dx-dur-base: 180ms;    /* hover 默认（原 0.16 / 0.18 / 0.2 主力档） */
    --dx-dur-enter: 240ms;   /* 面板 / 大选择器入场（原 0.24 / 0.25 / 0.26 / 0.28） */
    --dx-dur-spring: 320ms;  /* 直接操作反馈：开关滑块、按压回弹（原 0.32） */
    --dx-dur-loop: 1500ms;   /* 转圈（唯一的循环动效） */

    --dx-ease-out: cubic-bezier(0.16, 1, 0.3, 1);        /* 入场/退场/颜色 —— 替代全部 ease */
    --dx-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* 仅 transform，禁止用于颜色 */
    --dx-ease-linear: linear;                            /* 仅无限循环 */

    /* ===== 层级（命名现有分带，数值不变 → 零风险） ===== */
    --dx-z-slot: 1;           /* 多屏格子内部 */
    --dx-z-sticky: 50;        /* 面板吸顶 Header */
    --dx-z-drag: 99;          /* 被拖起的格子 */
    --dx-z-dock: 10000;       /* 二级 Dock */
    --dx-z-hovercard: 100010; /* 主播信息悬浮卡（刻意低于面板） */
    --dx-z-panel: 100030;     /* 三级面板 */
    --dx-z-popover: 100050;   /* 弹幕小尾巴面板 */
    --dx-z-dialog: 100060;    /* 通用提示框容器 */
    --dx-z-mask: 100080;      /* 大选择器遮罩 */
    --dx-z-modal: 100090;     /* 大选择器本体 */

    /* ===== 表面（路线 B：alpha 0.90 起） ===== */
    --dx-surface-panel: rgba(255, 255, 255, 0.90);   /* 原 0.65 */
    --dx-surface-raised: rgba(255, 255, 255, 0.96);  /* 原 0.42 卡片 / 0.35 列表项 */
    --dx-surface-dock: rgba(255, 255, 255, 0.94);    /* 原 0.72 */
    --dx-surface-input: rgba(255, 255, 255, 0.98);   /* 原 0.80–0.90 */
    --dx-surface-sunken: rgba(15, 23, 42, 0.06);     /* 段控轨道 */

    /* ===== 墨色（全部经 0.90 白玻璃 + 纯黑帧验证） ===== */
    --dx-ink-1: #0f172a;         /* 14.24:1 —— 标题、正文 */
    --dx-ink-2: #334155;         /*  8.26:1 —— 次级正文、图标、未选中段控 */
    --dx-ink-3: #475569;         /*  6.90:1 —— 说明、元信息、关闭图标 */
    --dx-ink-4: #64748b;         /*  3.80:1 —— 仅限 ≥14px 的弱化文字，不得用于 ≤12px 正文 */
    --dx-ink-inverse: #ffffff;   /* 只压在 --dx-accent-fill 上 */

    /* ===== 强调（填充与墨色彻底分离） ===== */
    --dx-accent-fill: #0066ff;         /* 只做底色；白字 4.83:1 */
    --dx-accent-fill-hover: #004de6;   /* 白字 6.55:1 */
    --dx-accent-ink: #0047b3;          /* 玻璃上的蓝字/图标 6.56:1 */
    --dx-accent-ink-on-white: #0066ff; /* 纯白底上的蓝字 4.83:1 */

    /* ===== 语义 ===== */
    --dx-state-ok: #047857;
    --dx-state-warn: #b45309;
    --dx-state-danger: #b91c1c;
    --dx-state-busy: #475569;

    /* ===== 边界与阴影 ===== */
    --dx-border-hair: 1px solid rgba(15, 23, 42, 0.10);
    --dx-border-highlight: 1px solid rgba(255, 255, 255, 0.92);
    --dx-shadow-panel: 0 12px 32px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.06);
    --dx-shadow-raised: 0 2px 8px rgba(15, 23, 42, 0.06);
}
~~~

> 兼容说明：--miuix-modal-* 五枚旧 token 保留原名做别名（例如 --miuix-modal-bg: var(--dx-surface-panel)），迁移期两套并存，避免一次性全改。

### 8.5 迁移映射表（旧值 → 新 token）

**字号（13 → 5）**

| 旧 | 次数 | 新 | 说明 |
|---|---|---|---|
| 9.5px | 1 | --dx-text-micro (11) | .lottery__expireTime，9.5px 的中文等于不可读 |
| 10px | 5 | --dx-text-micro (11) | |
| 10.5px | 4 | --dx-text-micro (11) | 与 11px 并存是纯噪声 |
| 11px | 14 | --dx-text-micro (11) | 保留 |
| 11.5px | 12 | --dx-text-sm (12) | 半像素档，上并 |
| 12px | 7 | --dx-text-sm (12) | 保留 |
| 12.5px | 2 | --dx-text-md (13) | |
| 13px | 5 | --dx-text-md (13) | 保留 |
| 13.5px | 1 | --dx-text-md (13) | .postbird-box-title |
| 14px | 7 | --dx-text-lg (14) | 保留 |
| 16px / 18px / 20px | 3 + 1 + 1 | --dx-glyph-close (18) | 全部是 × 字形，不是正文 |

**圆角（14 → 8）**：2/4/5 → xs(4)；6/7 → sm(6)；8/9 → md(8)；10/12 → lg(10)；14/16 → card(14)；20 → card 或 panel；22 → panel(22)；38 → pill；50% → circle。
> 特别说明：Dock 的 38px 与开关的 22px 本质都是"高度的一半"= 胶囊，统一到 --dx-radius-pill，一次消掉 2 个档位。

**过渡（9 → 4 + 1）**：0.16 → base(180)；0.18 → base(180)；0.2 → base(180)（状态）/ enter(240)（入场）；0.22 → base；0.24 → enter；0.25 → enter；0.26 → enter；0.28 → enter；0.32 → spring(320)；1.5s → loop(1500)。

**缓动（4 → 3）**：ease×26 → --dx-ease-out；var(--miuix-spring)×24 → 仅保留在 transform 上，颜色/背景/阴影一律换 --dx-ease-out；cubic-bezier(0.16,1,0.3,1)×6 → --dx-ease-out（本来是同一条曲线，只是没命名）；linear×1 → --dx-ease-linear。

**z-index（13 → 10 个命名槽，数值不变）**：1/2/3 → --dx-z-slot；50 → sticky；99 → drag；10000 → dock；10001 → calc(var(--dx-z-dock) + 1)；100010 → hovercard；100030 → panel；100050 → popover；100060 → dialog；100080 → mask；100090 → modal。

**颜色（107 → 约 20 个语义 token）**：按 css-colors.json 的唯一色清单逐类归并——slate 系 8 个灰 → --dx-ink-1..4 + --dx-border-hair；蓝系 6 个（#0066ff/#2b7fff/#3d8bff/#0055ff/#004de6/#0040a8）→ --dx-accent-fill / -fill-hover / -ink；红系 5 个 → --dx-state-danger；绿系 4 个 → --dx-state-ok；橙/琥珀 5 个 → --dx-state-warn；白系 14 个 alpha（0.02–0.98）→ --dx-surface-* 5 个。

---

## 9. 与 Lead 侧对比度基线的交叉校验

用我自己实现的 WCAG 公式（独立脚本 metrics/crosscheck.mjs，不引用 Lead 的代码与数值）复算，结论如下。

**对得上的（差值 ≤ 0.02，全部来自合成色取整）**

| 项 | Lead | 本审计 | 差 | 判定 |
|---|---|---|---|---|
| #0f172a on 0.65/#101418 | 7.92 | 7.91 | 0.01 | 一致，过 |
| #334155 | 4.60 | 4.59 | 0.01 | 一致，**刚好过** |
| #64748b | 2.11 | 2.11 | 0 | 完全一致 |
| #94a3b8 | 1.14 | 1.14 | 0 | 完全一致 |
| #0066ff | 2.15 | 2.14 | 0.01 | 一致 |
| #64748b on #d8dee6 亮场 | 4.28 | 4.30 | 0.02 | 一致，均判不过 |

差异来源：我把合成背景取整到 #abadae 再算，Lead 大概率用浮点（171.35 / 172.75 / 174.15）。对任何一条通过/失败的判定没有影响。

**对不上的（1 条，需要 Lead 换节点重测）**

- **开关关闭态**：Lead 测到 #cbd5e1，对比 1.52:1。
  但 #cbd5e1 **不在仓库任何源文件里**（grep -rn "cbd5e1" src/ 与 grep "203, 213, 225" 均零命中）。CSS 里开关关闭态的轨道是 ExPanel.css:728 的 background: rgba(0, 0, 0, 0.14)，它在面板玻璃 #abadae 上合成 **#939596**，与玻璃的对比是 **1.34:1**（css-crosscheck.json X09），比 1.52 更差。
  两种可能：(a) 那条真机数据测的不是 .miuix-switch / .sign-checkbox（可能是原生 checkbox 没吃到 appearance: none，或测了别的控件）；(b) 有另一份样式表覆盖了它。**建议把探针节点限定到 .miuix-switch，并打印 getComputedStyle(el).backgroundColor 与匹配到的规则来源**。无论哪种，结论方向一致：轨道与玻璃的边界对比 1.34–1.52，离 UI 组件要求的 3:1 差一倍以上。

**Lead 未覆盖、本审计补上的两条更差的**

- 段控未选中 label #64748b on rgba(0,0,0,0.06) 轨道 = **1.87:1**（F-05）；
- 半透明 slate 文字 rgba(15,23,42,0.55) on item 底 = **3.42:1**，0.5 版本 = **3.00:1**（F-19）。

---

**另两条真机实测，本文对账后采纳**

| 真机数据 | 本审计的静态判断 | 对账结论 |
|---|---|---|
| 副标题对 #efeff0 的像素采样 2.91:1（理论 4.1–4.3） | F-02 静止在 4.30（对 #f1f3f6 合成底） | 一致，且实测更差。差值来自 10.5px 中文的抗锯齿未覆盖满像素（约 −30%）。**结论升级为：颜色与字号必须一起改**，只换墨色不够。 |
| Dock bottom 实测 112px（PlayerToolbar 108 + 4） | 初版按 ExPanel.css:33 的 bottom: 32px 算 | **本文初版算错，已改**。ExPanel.css:33 是死代码（行内声明压过普通作者声明），F-12 的竖向模型已按 112px 重写。 |
| hover 位移 −2.5px 与选中态 −2px 打架，实测落 −2px | 权重推导同样得出 is-active 取胜 | 一致，已单列为 F-26。 |

---

## 10. 修复优先级与落地顺序

**第一批（1 个 PR，纯安全，不含视觉判断）**
1. F-16 删 3 处重复规则 + 1 条死声明（约 −20 行）
2. F-12 / F-17 去掉 min-height 死锁，body 不再手写 52
3. F-18 章节编号
4. **在 build.js 里加 !important 棘轮**（见下）

**第二批（1 个 PR，对比度，需设计确认）**
5. F-02 / F-03 / F-09 / F-05：四条墨色 token + 逐处替换
6. F-04：更新面板 5 个状态色
7. F-08：焦点环一条收口

**第三批（性能与响应式）**
8. F-14 / F-15 / §7.4 方案 C：去 7 层 backdrop-filter、拆 transition: all
9. F-10 / F-11 / F-12 / F-13：Dock 盒模型、max-width、竖向预算、两档 media query
10. F-06：reduced-motion

**第四批（设计系统收口）**
11. F-01：JS 去掉 380 字面量（这是"设计系统"成立的前提）
12. §8.4 全量 token 替换 + §8.5 迁移

### !important 治理的正确顺序（回答 Lead 的 A 项）

!important 在这里不是"权重工具"，是"对抗宿主页面的唯一手段"。所以要拆的不是"全部"，而是**先分清哪些在对抗外部、哪些只是在对抗自己**。可执行顺序：

1. **先加棘轮，止血。** 在 build.js 里统计 !important 次数，与仓库里的 tests/baseline-important.json 比对，**只允许下降**。零风险、立刻可做，并立刻阻止"新代码顺手加 !important"。
2. **删死代码。** 3 处重复规则、overflow-y: overlay、被后一行覆盖的声明。计数自然下降，逻辑等价。
3. **拆第一档：状态与伪元素（实测 215 条）。** :hover / :active / :focus / :checked / ::before / ::after / ::-webkit-scrollbar 上的 !important，面对的是宿主"div:hover 这类极低权重选择器"——我们的 .sign-option-item:hover（权重 0,2,0）本来就赢。判定标准很硬：**宿主没有 !important，我们也不需要；宿主有 !important，我们同样需要**。
4. **拆第二档：内部布局属性（实测 379 条）。** flex / gap / align-items / box-sizing / overflow / min-width / user-select 这类，宿主几乎不会用 !important 去抢。唯一风险是通配规则（星号选择器 margin: 0 一类）——但类选择器权重 0,1,0 大于通配符的 0,0,0，依然赢。
5. **第三档（实测 938 条：颜色/边框/背景/字号/尺寸）放最后，且永远不要全拆。** 保留在"边界层"——与斗鱼原生 DOM 直接相邻、类名可能撞车的元素：.ex-panel、.miuix-modal 及 8 个面板根、.ex-icon、.ChatToolBar-DanmakuTail、.popup-ms__room、.ms-slot（多屏槽位系列）。这些地方保留是对的。
6. **替代手段**：给整个浮层加一个高熵根类（如 .dyex-rl-v1），内部规则写成 .dyex-rl-v1 .xxx，权重升到 0,2,0，绝大多数内部声明就不再需要 !important。

一句话结论：**目标不是 0%，而是"只在边界层保留，且边界层每一条都能说出它在对抗谁"**。合理终态约为当前的 15–20%（约 250 条）。
分档明细见 metrics/css-important-tranches.json（tranche1 状态/伪元素 215、tranche2 内部布局 379、tranche3 视觉 938）。

---

## 11. 未覆盖 / 需真机确认

1. **帧时间（ms）**：§7 的层数、面积、嵌套关系是静态可证的；具体 GPU 帧时间需在真机 Performance 面板录（150% 缩放 + 全屏直播 + 打开工具面板 + 划过 5 张卡片）。本文不给编造的毫秒数。
2. **1px 溢出（F-10）与 1px 空隙（F-17）** 是盒模型算术推导，建议用 live-shooter 的 measure-controls.json 核对 Dock 内外高度。
3. **.miuix-modal 的 position 不在 CSS 里**（由 ExPanel.js:704 内联设置），因此"面板最终落在哪里"CSS 层无法自证；F-12 的溢出推演基于 JS 的 bottom 算法。
4. **Dark scheme 钩子**：ExPanel.css:1355 有一条 [data-mantine-color-scheme=dark] 选择器，依赖宿主的 Mantine 属性。全文件仅此一处考虑暗色，若斗鱼切暗色主题，只有这一个元素跟随，其余 2889 行不变——属于"假装支持暗色"，需真机确认斗鱼是否真的设置该属性。
5. 本文**未审** ExIcon.js / ExIcons.js 的逻辑（归 js-auditor），只审了 ExIcon.css。
6. 结论口径：CSS 层无 P0；P0 级问题在交互逻辑层，由 js-auditor 覆盖。本文件所有"为什么是问题"条目均可由 metrics/ 下的 JSON 复现。
