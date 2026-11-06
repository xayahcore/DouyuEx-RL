# DouyuEx-RL · 设计系统模板（唯一口径 · 2026-11-01）

> 目的：面板**不再各写各的数值**。所有像素、颜色、字号只有一处来源，面板只声明"我用哪个组件"。
> 本文是模板本身；落地进度见 `../ui-audit-2026-11-01/PLAN-v4-2026-11-01.md` 的 S4.5 / S5。

## 一、三层结构（只允许单向依赖）

```
L1 刻度 primitive   ← 只有数字与色值，不含语义
  ↓ 只能被 L2 引用
L2 语义 semantic    ← 面板与组件只认这层；改语义不用碰像素
  ↓ 只能被 L3 引用
L3 组件 component   ← .ui-* 只消费 L2，不含任何字面量
```

**违反判据**：L2 里出现 `#` 十六进制、L3 里出现 `px`、面板 JS 里出现 `style="`" 或类名数组。

## 二、L1 刻度（`:root` 里的 `--dx-*`）

| 家族 | 刻度 | 例子 |
|---|---|---|
| 间距 | 0/2/4/6/8/10/12/16/20/40 | `--dx-space-4: 8px` |
| 尺寸 | 2/4/6/8/10/12/14/18/20/26/32/38/40/44/46/56 | `--dx-size-44: 44px` |
| 圆角 | 4/6/8/10/14/22/full | `--dx-radius-14: 14px` |
| 字阶 | 11 / 11.5 / 12 / 14 / 16（**只有 5 档**） | `--dx-font-115: 11.5px` |
| 字重 | 400/500/600/700 | `--dx-weight-600` |
| 行高 | tight 1.3 / normal 1.5 | `--dx-leading-normal` |
| 层级 | sticky 3 / menu 50 / dock 10000 / panel 100030 | `--dx-z-panel` |
| 动效 | 0.18s / 0.2s / 0.3s + spring | `--dx-dur-base` |
| 色 | ink-1 / ink-2 / ink-muted / inverse / accent / accent-deep / 三状态色 | `--dx-ink-2` |

## 三、L2 语义（面板只认这些）

| 语义 | 指向 | 说明 |
|---|---|---|
| `--dx-surface-panel` | `rgba(var(--dx-tint), .65)` | 面板托盘 |
| `--dx-surface-card` | `rgba(var(--dx-tint), .42)` | 卡片层（中间层，用户要求保留） |
| `--dx-surface-row` | `rgba(var(--dx-tint), .35)` | 行白片 |
| `--dx-surface-row-hover` | `rgba(var(--dx-tint), .75)` | 行悬停 |
| `--dx-border-panel/card/row` | 三档白边 | |
| `--dx-text-title/body/muted/on-accent` | 墨色四档 | 说明文字**不再用 `#64748b`** |
| `--dx-space-row-gap / card-pad-* / card-gap` | 间距语义 | 组件内部间距只读这些 |
| `--dx-size-icon` / `--dx-size-control` | 38 / 44 | 图标与可点控件最小尺寸 |

> `--dx-tint` 是白片基色（`255,255,255`）。**切黑夜时只改它**，所有面自动跟随 —— 这就是黑夜态的入口。

## 四、L3 组件（面板唯一出口）

| 组件 | 由谁产出 | 允许的属性 |
|---|---|---|
| `.ui-card` | `ExUI.card()` | 只有分组、圆角、间距；**无自带底色以外的装饰** |
| `.ui-row` | `ExUI.row()` | title/desc + lead/trail 控件 |
| `.ui-btn`（primary/quiet/danger/accent） | `ExUI.btn()` | 高度统一 `--dx-size-control` |
| `.ui-field` / `.ui-seg` / `.ui-stat` / `.ui-empty` / `.ui-stack` | 同名 API | 只做结构，不写样式 |

**面板硬规矩**：
1. 面板 JS 里**不许**出现色值、字号、间距、宽高字面量；
2. 面板 JS 里**不许**出现 `style="`（运行期动态值除外，必须在注释里写明为什么）；
3. 结构变化必须走 `ExUI`，旧类名只允许出现在 `ExUI.LEGACY_*` 一处。

## 五、旧 → 新 映射（迁移时照这张表）

| 旧类名 | 归到 |
|---|---|
| `fans-panel__card` / `popup-panel__card` / `exupdate-panel__card` | `.ui-card` |
| `sign-option-item` / `fans-panel__asset-item` / `bloop__param_item` | `.ui-row` |
| `ex-btn-primary` / `*__submit-btn` / `ex-picker-btn` | `.ui-btn--primary` / `.ui-btn--quiet` |
| `miuix-seg` | `.ui-seg` |
| `livetool__cell*` | `.ui-row` + `.ui-stack` |
| `.dx-*` 单属性工具类 | 折进所属组件规则，**不再由面板直接使用** |

## 六、门禁（每轮必须全绿）

| 门禁 | 标准 |
|---|---|
| `node build.js` | exit 0 |
| `npm test` | exit 0，断言不减 |
| `tools/ui-legacy-guard.mjs` | 旧类名引用只降不升 |
| `tools/ui-diff.mjs` | 面板结构比对 PASS（几何 ≤1px / 颜色 ≤2 每通道 / 字体必须相等 / 顺序一致） |
| `!important` 计数 | 只降不升（当前基线见 `tools/ui-legacy-baseline.json`） |
| 令牌纪律 | L3 里出现 `px` 或 `#` 即失败（脚本 `tools/dx-lint.mjs`，待建） |

## 七、当前进度（诚实版）

| 层 | 状态 |
|---|---|
| L1 刻度 | ✅ 已写入 `ExPanel.css` 顶部：间距/尺寸/圆角/字阶/字重/行高/层级/动效/颜色 |
| L2 语义 | ✅ 已写入：表面四档 + 边框三档 + 墨色四档 + 组件间距 + 控件尺寸 |
| 旧 `--miuix-*` | ✅ 全部改为指向 L2（值不变，来源统一） |
| 工具类 `.dx-*` | ✅ 45 条已引用令牌（其余是 display/flex 这类无令牌可归的语义类） |
| L3 组件 `.ui-*` | 🟡 结构已由 `ExUI` 产出；样式仍走影子旧类名，`.ui-*` 规则待写 |
| 面板 JS 去数值 | ✅ 内联 93→3（剩 3 处运行期动态值）；`style="` 已清 |

**下一步（S5 前置）**：写 `.ui-*` 组件层（只读 L2），然后把 8 个面板逐个改成"只用 `.ui-*`"，每改一个跑一次 `ui-diff`，差异必须可解释。

## 八、组件层令牌化结果（2026-11-01）

- 组件规则里 193 处字面量改成令牌（font-size / color / border-radius）
- 组件层现在 **0 条字面量 font-size**
- 测试断言改为「令牌感知」：先从同一份 CSS 里解析 `--dx-*` 再比较，允许样式写 `var(--dx-*)`
- 回归：8 面板结构比对 **0 失败**（渲染与令牌化前逐项一致）
