# DouyuEx-RL 真机取证 · 2026-11-01

> 取证方式：ego-browser（ego-lite Chromium）任务空间 `dyex-icon-ego`，注入 `DouyuEx_RL.user.js`（构建于 2026-11-01 05:02，含 Phosphor 图标层未提交改动），打开 `https://www.douyu.com/9999`（斗鱼 9999 真实直播间）。
> 全部数字均为**浏览器内实测**（getBoundingClientRect / getComputedStyle / CDP CSS.getMatchedStylesForNode / PNG 像素解码采样），非估算。
> 只读 src/，未修改任何源码，未 commit。
> **库内范围（2026-11-08 清理）**：本文与同目录其余 `.md` 是记录；`round-*.mjs` / `theme-*.mjs` 与截图已移出仓库（脚本可再生，截图从未入库），需要时从 git 历史取回。

---

## 0. 取证环境

| 项 | 值 |
|---|---|
| 默认视口 | 1625 × 763 CSS px，devicePixelRatio = 1 |
| 附加视口 | 1280 × 720 @DPR1；1024 × 576 @DPR1.25（= 1280×720 窗口 125% 缩放） |
| UA | Chrome/15x（Edge 内核），Windows |
| 注入版本 | 当前构建产物，更新日志最新条目 2026.11.01.01 |
| Dock 数量 | 8 个磁贴（实测 DOM 8 个，见 §5-C） |
| 三级面板 | 8 个（sign-panel / fans-continue-panel / bloop / extool / livetool / popup-player-panel / exlottery / exupdate-panel）全部实拍 |
| 硬约束复核 | `380px` 在 src 与产物中各 1 次、`370px` 各 1 次（`ExPanel.css:7-8`）—— 未越界 |

---

## 1. 文件清单

### 截图（png）
| 文件 | 内容 |
|---|---|
| `round02-baseline.png` | 进场基线（Dock + extool 已展开） |
| `dock-01-collapsed.png` | **Dock 关闭态**（胶囊 display:none，只剩精灵球） |
| `dock-02-expanded.png` / `-crop.png` | **Dock 展开态** 全屏 / 3 倍裁切 |
| `dock-03-hover-crop.png` | **Dock 悬停态**（extool 磁贴 hover，白底+蓝边+上浮+蓝指示条） |
| `dock-04-active-crop.png` / `dock-05-active-full.png` | **Dock 选中态**（面板已开、鼠标已移开，纯选中视觉） |
| `03-panel-bloop` … `10-panel-exupdate`（各 3 张：全屏 / 面板 2 倍裁切 / 滚到底部） | 8 个三级面板逐个 |
| `13-sign-actionbar-overlap.png` | 签到面板：正文从「开始签到」按钮底下穿过 |
| `14-exupdate-footer-overlap.png` | 版本更新面板：同上，按钮下方露出一整行被裁切的正文 |
| `15-sign-footer-overlap.png` | 签到面板滚到中部时的粘底条状态 |
| `11-keyboard-esc-state.png` / `12-esc-after-panel-open.png` | 键盘实测后的页面状态 |
| `vp-1280x720-dpr1-*.png` / `vp-1024x576-dpr1.25-*.png` | 视口与缩放实测（dock / sign 面板 / exupdate 面板） |

### 数据（json）
| 文件 | 内容 |
|---|---|
| `styles-dock-states.json` | Dock 磁贴 hover / 选中态实测（背景、位移、阴影、图标色、指示条） |
| `styles-panels-a.json` / `styles-panels-b.json` | 8 个面板的 380×370 / 22px / 玻璃参数 / 标题排版 / 关闭钮 / 滚动容器 |
| `measure-extool.json` `measure-controls.json` | 面板头、卡片、条目、switch 双态、徽标、关闭钮的逐项实测 |
| `measure-sticky-footer.json` `measure-footer-hit.json` | 粘底主按钮：矩形、定位、elementFromPoint、逐滚动位遮挡行数 |
| `measure-actionbar.json` `measure-truncation.json` | 操作条内联样式 / 8 面板文本溢出与裁切清点 |
| `measure-viewport.json` | 1280×720 与 1024×576@1.25 下的 Dock/面板矩形与越界判定 |
| `icon-color-trace.json` | **CDP 命中样式追踪**（Lead 问题 A） |
| `contrast-samples.json` `contrast-text.json` `contrast-ratios.json` | 像素采样原始色 + WCAG 对比度计算 |
| `a11y-keyboard.json` `a11y-esc-click.json` | 可聚焦元素清点、Tab 26 次轨迹、ESC 实测 |
| `interaction-hover-click-esc.json` | 悬停→单击→再悬停→ESC 的四段状态机实测 |

### DOM 快照（utf-8）
`dom/01-dock.html`、`dom/03-bloop.html`、`dom/04-extool.html`、`dom/05-livetool.html`、`dom/06-exlottery.html`、`dom/07-sign.html`、`dom/08-fans-continue.html`、`dom/09-popup-player.html`、`dom/10-exupdate.html`
—— 均为**面板展开状态**下的 outerHTML（含 Phosphor 图标层两份 svg、`.miuix-modal-in` 类、粘底条内联 style），可直接做忠实预览还原。

### 复现脚本
`ego/round-0*.mjs`（ego-browser nodejs 逐轮脚本，含 PNG 解码与像素采样实现）。

---

## 2. 实测数据摘要表

### 2.1 Dock 二级胶囊
| 对象 | 实测值 |
|---|---|
| 胶囊盒 | 556 × 76 px，border-radius **38px**，bg `rgba(255,255,255,0.72)`，backdrop-filter `blur(40px) saturate(2.2)`，border `1px solid rgba(255,255,255,0.88)`，z-index 10000 |
| 胶囊定位 | `position:absolute; right:0`，**bottom = 112px**（内联，= `.PlayerToolbar.offsetHeight` 108 + 4）；CSS `ExPanel.css:33` 声明的 32px 在真机不生效 |
| 磁贴 | 56 × 56 px × 8，radius 14px，gap **10px**，bg `rgba(255,255,255,0.45)` |
| 磁贴 hover | bg `rgba(255,255,255,0.95)`、`translateY(-2px)`、`border 1px rgba(0,102,255,0.35)`、阴影 `0 6px 18px rgba(0,102,255,0.24)` |
| 磁贴选中 | 与 hover 同值 + 指示条 24×4 `#0066ff`，opacity 0 → 1 |
| 图标 | svg 38 × 38，color `#334155`（像素采样 `#334054`），对磁贴底 **8.97 : 1** |
| 选中图标 | 填充版 svg，color `#0066ff`（像素采样 `#0065fd`），对白底 **4.83 : 1** |
| 胶囊关闭 × | 26 × 26，radius 50%，`top:-9px; right:-9px`，bg #ffffff |

### 2.2 三级面板（8 个全部一致）
| 对象 | 实测值 |
|---|---|
| 面板盒 | 380 × 370 px，radius 22px，bg `rgba(255,255,255,0.65)`，`blur(40px) saturate(2.2)`，border `1px solid rgba(255,255,255,0.85)`，z-index 100030 |
| 头部 | 378 × **51px**，padding 12px 16px，bg `rgba(255,255,255,0.45)`，`blur(28px) saturate(190%)`，radius 21px 21px 0 0 |
| 标题 | **14px / 21px**，`#0f172a`，700 → 对头部底 **17.18 : 1** |
| 关闭 × | 26 × 26，radius 8px，bg `rgba(0,0,0,0.06)`，色 `#475569`，字号 18px → **6.12 : 1** |
| body | 378 × **317px**（`calc(var(--miuix-modal-height) - 52px)`），padding 10px 0 16px，overflow-y auto |
| 四级卡片 | 350 × 304，radius 14px，bg `rgba(255,255,255,0.42)`，border `1px rgba(255,255,255,0.75)`，padding 10px 14px |
| 卡片标题 | **13px / 19.5px**，`#0f172a`，700 → **15.54 : 1** |
| 条目行 | 320 × 45.2，radius 10px，bg `rgba(255,255,255,0.35)` → 对卡片底仅 **1.09 : 1** |
| 条目标题 | 12px / 15.6px，`#0f172a`，600 |
| 条目副标题 | **10.5px / 12.6px**，`#64748b`，nowrap + ellipsis → 理论 **4.33 : 1**，像素 **2.91 : 1** |
| switch | 38 × 22 px，radius 22px，旋钮 18 × 18 |
| switch OFF | 轨道像素 `#d6d6d6` → 对条目底 **1.38 : 1**、对卡片底 **1.26 : 1**；旋钮对轨道 **1.45 : 1** |
| switch ON | 轨道 `#0066ff` → **4.58 : 1**；旋钮 **4.83 : 1** |
| 主按钮 | 350 × 38，radius 10px，`linear-gradient(135deg,#2b7fff,#0055ff)`，白字 14px → **4.83 : 1** |
| 粘底条 | `position:sticky; bottom:0; z-index:3`，**background: transparent**，padding 0 12px，margin 10px 0 8px，**计算 padding-top = 0**（内联 8px 被 `!important` 吃掉） |
| 正文高度 | bloop 567 / extool 1235 / livetool 0 / exlottery 0 / sign 554 / fans-continue 502 / popup 342 / exupdate 1334（scrollHeight，可视 317） |

### 2.3 交互 / 可达性
| 项 | 实测 |
|---|---|
| 悬停→单击→微移 | `none → flex → none → none`（单击即关，且原磁贴内不再重开） |
| Tab 26 次命中 Dock/面板 | **0 次**（全部落在斗鱼自己的 `FansMedalWrap / ChatSend-button / PostCardContent…`） |
| Dock 内可聚焦元素 | **1 个**（`.ex-panel__close`），8 个磁贴均 `<div>` + 无 href 的 `<a>`，无 tabindex/role/aria |
| ESC（面板已开） | 无效，面板仍 `display:flex`（全项目仅 GiftPicker / PopupPlayer / VideoToolbarMenu 有 Escape 分支） |
| 关闭按钮焦点环 | `outline-style: none`（无 `:focus-visible` 样式） |
| 1280×720 @1 | Dock 289→845，面板 146→526 / 608→988，无左右越界 |
| 1024×576 @1.25 | Dock 134→690，sign 面板被夹到 left=12，exupdate 453→833，无越界 |

---

## 3. 发现清单

### P1-1 悬停即开 + 单击即关 —— 同一个磁贴点一下就"消失"
- **位置**：`src/packages/ExPanel/ExPanel.js:475-491`（mouseenter → `showExRightPanel(title, btn, true)`）与 `src/common.js:640-652`（已显示且 `forceOpen` 为假 → 置 `display:none`）
- **现状**：磁贴 binding
  ```js
  btn.addEventListener("mouseenter", () => { ... showExRightPanel(mapping[cls], btn, true); });
  ```
  而 `showExRightPanel` 的关闭分支：
  ```js
  if (isShowing) { if (!forceOpen) { targetDom.style.setProperty("display","none","important"); ... return; } return; }
  ```
- **为什么是问题**：实测状态机 `before=none → hover=flex → click=none`。鼠标移到磁贴面板自己弹出来，用户下意识"点一下"→ 面板立刻关掉；更糟的是鼠标没离开磁贴，`mouseenter` 不会二次触发，实测 `afterNudgeHover=none`——**必须把鼠标移出去再移回来才能重开**。触控板/鼠标用户 100% 会撞上，触屏/笔更是每次点击都关。
- **修复**（点击统一为"打开"，hover 延迟确认；判空兜底）：

  ```js
  if (!btn.dataset.hoverBound) {
    btn.dataset.hoverBound = "1";
    btn.style.cursor = "pointer";
    const hoverDelayMs = 260;
    let hoverTimer = 0;
    const panelSelectorOf = (el) => {
      for (const key in mapping) {
        if (el.classList.contains(key)) return EX_DOCK_PANEL_MAP.find((pair) => pair[0] === key)?.[1] || "";
      }
      return "";
    };
    btn.addEventListener("mouseenter", () => {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        if (typeof showExRightPanel === "function") showExRightPanel(mapping[Object.keys(mapping).find((k) => btn.classList.contains(k))], btn, true);
      }, hoverDelayMs);
    });
    btn.addEventListener("mouseleave", () => { clearTimeout(hoverTimer); });
    btn.addEventListener("click", (event) => {
      clearTimeout(hoverTimer);
      event.stopPropagation();
      const panelSelector = panelSelectorOf(btn);
      const panelEl = panelSelector ? document.querySelector(panelSelector) : null;
      if (!panelEl) return;
      if (ExPanel_panelIsShown(panelEl)) {
        panelEl.style.removeProperty("display");
        panelEl.style.setProperty("display", "none", "important");
        panelEl.classList.remove("miuix-modal-in");
        if (typeof updateDockActiveIndicator === "function") updateDockActiveIndicator();
        return;
      }
      if (typeof showExRightPanel === "function") showExRightPanel(mapping[Object.keys(mapping).find((k) => btn.classList.contains(k))], btn, true);
    });
  }
  ```

### P1-2 键盘完全不可达（8 个入口 + 8 个面板 + ESC 全部为 0）
- **位置**：`src/packages/ExPanel/ExPanel.js:411`（磁贴由各包 `<div>` + `<a class="ex-panel__icon">` 无 href 构成）、`src/packages/ExPanel/ExPanel.js:435-495`（无 tabindex/role/aria 赋值）；全项目 Escape 分支仅 `ExpandTool_GiftPicker.js:301`、`PopupPlayer.js:181/355`、`VideoToolbarMenu.js:149`
- **现状**：
  ```html
  <div class="ex-sign" data-hover-bound="1"><a class="ex-panel__icon" title="一键签到"><span class="ex-ico ex-ico--line">…</span></a><span class="ex-panel__indicator"></span></div>
  ```
- **为什么是问题**：实测 Tab 26 次，**命中 Dock/面板 0 次**；Dock 内唯一可聚焦元素是 1 个关闭按钮（9 个可交互目标里 8 个不可达）；面板打开后按 ESC 无反应（`display` 仍 `flex`）；关闭按钮 `outline-style:none` 无焦点环。纯键盘用户完全无法打开任何功能面板。
- **修复**：

  ```js
  // ensureDockIndicators 内，逐磁贴补语义与键盘路径
  btn.setAttribute("role", "button");
  btn.setAttribute("tabindex", "0");
  btn.setAttribute("aria-label", mapping[Object.keys(mapping).find((k) => btn.classList.contains(k))] || "DouyuEx 功能");
  btn.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (typeof showExRightPanel === "function") showExRightPanel(mapping[Object.keys(mapping).find((k) => btn.classList.contains(k))], btn, true);
  });

  // 面板级 ESC（放在 ExPanel 初始化处，只注册一次）
  if (!window.__DYEX_ESC_BOUND__) {
    window.__DYEX_ESC_BOUND__ = true;
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const anyOpen = document.querySelectorAll(EX_THIRD_LEVEL_PANELS);
      let hasOpen = false;
      for (let i = 0; i < anyOpen.length; i++) {
        if (anyOpen[i].style.display === "flex" || anyOpen[i].style.display === "block") { hasOpen = true; break; }
      }
      if (!hasOpen) return;
      if (typeof ExPanel_closeAllMenus === "function") ExPanel_closeAllMenus();
    }, true);
  }
  ```
  ```css
  /* ExPanel.css 第 1 节追加：焦点可见 */
  .ex-panel__wrap > div:focus-visible {
      outline: 2px solid var(--miuix-blue) !important;
      outline-offset: 2px !important;
  }
  .miuix-modal__close:focus-visible,
  .ex-btn-primary:focus-visible,
  .sign-checkbox:focus-visible {
      outline: 2px solid var(--miuix-blue) !important;
      outline-offset: 2px !important;
  }
  ```

### P1-3 关闭态开关（switch OFF）对背景 1.26 : 1，几乎不可辨认
- **位置**：`src/packages/ExPanel/ExPanel.css:719-740`（`background: rgba(0, 0, 0, 0.14)`）
- **现状**：
  ```css
  .sign-checkbox, .miuix-switch, input[type="checkbox"].sign-checkbox {
      width: 38px; height: 22px;
      background: rgba(0, 0, 0, 0.14) !important;
      border-radius: 22px; border: none; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
  }
  ```
- **为什么是问题**：像素实测轨道为 `#d6d6d6`——对条目底 `#f8f9f9` **1.38 : 1**、对卡片底 `#efeff0` **1.26 : 1**，旋钮 `#ffffff` 对轨道 **1.45 : 1**。WCAG 1.4.11 对 UI 组件边界要求 ≥ 3 : 1。浅色玻璃底 + 浅灰轨道 = 关闭态只能靠"旋钮在左边"猜，弱视/高亮环境下无法分辨开/关。
- **修复**（保持低饱和观感，把**边界**做到 3.87 : 1）：

  ```css
  .sign-checkbox, .miuix-switch, input[type="checkbox"].sign-checkbox {
      background: rgba(15, 23, 42, 0.20) !important;
      box-shadow: inset 0 0 0 1.5px rgba(15, 23, 42, 0.55), inset 0 1px 2px rgba(0, 0, 0, 0.08) !important;
  }
  .sign-checkbox:checked, .miuix-switch:checked, input[type="checkbox"].sign-checkbox:checked {
      background: var(--miuix-blue) !important;
      box-shadow: inset 0 0 0 1.5px rgba(0, 51, 128, 0.45), 0 2px 8px var(--miuix-blue-glow) !important;
  }
  ```
  （`rgba(15,23,42,0.55)` 叠在 `#f8f9f9` 上混合为 `#787d87`，对条目底 **3.92 : 1**。）

### P2-1 粘底主按钮压正文：实测 17 ~ 32.4 px 被遮，且条底无底色
- **位置**：`src/common.js:592-606`（`wrap.style.background = ""`）、`src/packages/ExPanel/ExPanel.css:874-879`（只有 padding/margin，无背景）、`ExPanel.css:351-362`（body 有 `padding-bottom`）
- **现状**：
  ```js
  wrap.style.position = "sticky"; wrap.style.bottom = "0"; wrap.style.zIndex = "3";
  wrap.style.paddingTop = "8px"; wrap.style.background = "";
  ```
- **为什么是问题**（逐位实测，见 `measure-footer-hit.json`）：

  | 面板 | scrollTop | 被按钮压住的行数 | 最后可见行底部 vs 按钮上沿 |
  |---|---|---|---|
  | 版本更新 | 0 | **2 行** | 527 vs 510 → **遮 17 px** |
  | 版本更新 | 509 | 1 行 | 558 vs 510 → 遮 48 px |
  | 版本更新 | 1017（到底） | 0 行 | 480.5 vs 501.5 → 留 21 px |
  | 一键签到 | 0 | **2 行** | 542.4 vs 510 → **遮 32.4 px** |
  | 一键签到 | 237（到底） | 0 行 | 481.1 vs 502.1 → 留 21 px |

  滚到底可读全（所以不是 P0），但中间滚动时正文从按钮底下穿过；且 sticky 条**背景透明**（`rgba(0,0,0,0)`），`elementFromPoint(按钮上沿-3px)` 返回 `DIV.miuix-modal__body`——证明按钮上方 3px 处是正文而不是隔离层。`ExPanel.css:878` 的 `padding: 0 12px !important` 还把 `common.js:602` 想加的 `padding-top:8px` 吃掉了（实测 computed = 0px）。
  另一个可量化副作用：body `padding-bottom:16px` + 条 `margin-bottom:8px` 让 sticky 条停在距面板底 24.5 px 处，那一带里正文露头并被面板圆角裁切（见 `14-exupdate-footer-overlap.png` 按钮下方那行字）。
- **修复**（不动 JS，全部落在 ExPanel.css）：

  ```css
  /* 有粘底条的面板：去掉 body 底部留白与条的 margin，解除 24.5px 露头带 */
  .sign-panel .miuix-modal__body,
  .fans-continue-panel .miuix-modal__body,
  .popup-player-panel .miuix-modal__body,
  .exupdate-panel .miuix-modal__body {
      padding-bottom: 0 !important;
  }
  /* 给粘底条加玻璃底，正文从它背后经过时不再穿帮 */
  .fans-panel__action-wrap,
  .popup-panel__action-wrap,
  .exupdate-panel__action-wrap {
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      padding: 8px 12px !important;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.86) 46%) !important;
      -webkit-backdrop-filter: var(--miuix-modal-blur) !important;
      backdrop-filter: var(--miuix-modal-blur) !important;
      border-top: 1px solid rgba(255, 255, 255, 0.8) !important;
  }
  ```
  （同时删掉 `common.js:602` 那行 `wrap.style.paddingTop = "8px";`——它被 `!important` 覆盖，是死代码。）

### P2-2 四级卡片副标题 10.5px + 4.33 : 1（像素 2.91 : 1）
- **位置**：`src/packages/ExPanel/ExPanel.css:706-715`
- **现状**：
  ```css
  .sign-option-desc { font-size: 10.5px !important; color: #64748b !important; line-height: 1.2 !important;
      white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
  ```
- **为什么是问题**：实测计算字号 10.5px / 行高 12.6px（全站最小），是解释"这开关到底干什么"的唯一文案；`#64748b` 对卡片底 `#f4f4f5` 理论 4.33 : 1（< 4.5），像素采样最暗 5% 分位只有 `#8591a3` → **2.91 : 1**。用户在看不清的 10.5px 灰字上做功能取舍。
- **修复**（12px + 6.89 : 1）：
  ```css
  .sign-option-desc {
      font-size: 11.5px !important;
      color: #475569 !important;
      line-height: 1.35 !important;
  }
  ```
  （维持 `nowrap` 时请在条目里给足宽度；实测 8 个面板**没有**真正的横向截断（唯一 1 例是 `.miuix-seg__label`「仅钓鱼大赛」溢出 6px），所以字号提到 11.5px 仍不会触发放大后的 ellipsis。）

### P2-3 「极速秒开」徽标写死内联样式，绕过 ExPanel.css，且 4.18 : 1
- **位置**：`src/packages/ExpandTool/ExpandTool.js:64`
- **现状**：
  ```js
  <span style="font-size: 11px; color: #0066ff; font-weight: 600;">极速秒开</span>
  ```
- **为什么是问题**：① 违反"UI 改动归口 ExPanel.css"（该徽标不接受设计系统调整，改 `--miuix-blue` 也不联动）；② 实测 11px `#0066ff` 对面板头底 `#efeeef` = **4.18 : 1**，低于 4.5 : 1；③ 该 span 的 `className` 为空，任何 CSS 选择器审计都抓不到它。
- **修复**（JS 去掉内联 style，类名进 CSS）：
  ```js
  <span class="fans-panel__card-badge">极速秒开</span>
  ```
  ```css
  .fans-panel__card-badge {
      font-size: 11px !important;
      font-weight: 600 !important;
      color: #0052cc !important;   /* 对 #efeeef = 5.89 : 1 */
      letter-spacing: 0.2px !important;
  }
  ```

### P2-4 Dock 的 32px 基线在真机被 JS 覆盖成 112px
- **位置**：`src/packages/ExPanel/ExPanel.css:33`（`bottom: 32px`）与 `src/packages/ExPanel/ExPanel.js:415-422`（`a.style.bottom = (domPlayerToolbar.offsetHeight + 4) + "px"`）
- **现状**：实测 `getComputedStyle(.ex-panel).bottom === "112px"`（`.PlayerToolbar.offsetHeight` = 108），与设计 token 的 32px 相差 80px。
- **为什么是问题**：设计文档写的"76px 高 / 38px 圆角 / bottom 32px"三件套里，真机只有前两件对得上；32px 只在礼物栏隐藏/浮层分支生效。做视觉走查和回归比对时，"按规范核对"会一直误报。
- **修复**（二选一，别让 CSS 与 JS 各写一份）：
  ```css
  /* 方案 A：把锚定值也做成 token，JS 只读 token */
  :root { --miuix-dock-offset: 112px; }
  .ex-panel { bottom: var(--miuix-dock-offset) !important; }
  ```
  ```js
  // 方案 B：JS 不再写死 px，只切类，由 CSS 决定
  a.classList.toggle("ex-panel--anchored", !!domPlayerToolbar);
  ```

### P2-5 选中态与 hover 态互相覆盖，上浮位移跳 0.5px
- **位置**：`src/packages/ExPanel/ExPanel.css:140-147`（hover `translateY(-2.5px)`、bg 0.92）与 `ExPanel.css:2858-2863`（`.is-active` `translateY(-2px)`、bg 0.95）
- **现状**：hover 已选中的磁贴时，后面那段特异度更高 → 实测 `transform: matrix(1,0,0,1,0,-2)`（-2px）而非 CSS 里写的 -2.5px。
- **为什么是问题**：同一颗磁贴在"被悬停"和"被选中"之间切换时位移差 0.5px+背景差 0.03 alpha，视觉上是可见的轻微抖动；两处声明同一个属性却没有注释说明谁是权威。
- **修复**：把位移收到一处变量。
  ```css
  :root { --miuix-dock-lift-hover: -2.5px; --miuix-dock-lift-active: -3px; }
  .ex-panel__wrap > div:hover { transform: translateY(var(--miuix-dock-lift-hover)) !important; }
  .ex-panel__wrap > div.is-active,
  .ex-panel__wrap > div.ex-dock-active { transform: translateY(var(--miuix-dock-lift-active)) !important; }
  ```

### P3-1 `.ex-ico` / `.ex-ico--fill` 不声明 color，继承宿主页面的斗鱼橙
- **位置**：`src/packages/ExPanel/ExPanel.css:2820-2829`（`.ex-ico` 与 `.ex-ico--fill` 两块，均无 color 声明）
- **现状**：两个包装 span 只有 `display: flex/none`，没有 `color`。实测 `.ex-ico--fill` 的 computed color 是 `rgb(255,119,0)`（继承自 `.PlayerToolbar-ContentRow`），`.ex-ico--line` 是 `rgb(51,51,51)`。
- **为什么是问题**：目前靠 `ExPanel.css:2830` `.ex-panel__icon svg { color:#334155 !important }` 兜住才没露馅（实测像素确实是 `#334054`）；但只要哪天 svg 改成继承（`fill: currentColor` 不变、规则被挪走），图标会立刻变成斗鱼橙，而且是"换房间才复现"的偶发。
- **修复**：
  ```css
  .ex-ico, .ex-ico--fill, .ex-ico--line { color: #334155 !important; }
  .ex-panel__wrap > div.is-active .ex-ico,
  .ex-panel__wrap > div.ex-dock-active .ex-ico { color: var(--miuix-blue) !important; }
  ```

### P3-2 四级卡片与条目行只差 1.09 : 1，层级只靠 1px 白边
- **位置**：`src/packages/ExPanel/ExPanel.css:19`（`--miuix-card-bg: rgba(255,255,255,0.42)`）与 `ExPanel.css:22`（`--miuix-item-bg: rgba(255,255,255,0.35)`）
- **现状**：实测条目底 `#f8f9f9` vs 卡片底 `#efeff0` = **1.09 : 1**；卡片底 vs 正文底 `#f9fbfa` = **1.06 : 1**。
- **为什么是问题**：三层玻璃透明度 0.42 / 0.35 / 0 在深色视频上几乎同色，卡片与条目的分界实际只由 1px 白边提供；视频画面偏亮时（如白底场景）三层会糊成一片。
- **修复**：
  ```css
  :root { --miuix-card-bg: rgba(255, 255, 255, 0.50); --miuix-item-bg: rgba(255, 255, 255, 0.68); }
  .sign-option-item { box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.05) !important; }
  ```

### P3-3 extool 分段控件标签横向溢出 6px
- **位置**：`.miuix-seg__label`（`ExPanel.css:783-798` 一节）
- **现状**：实测「仅钓鱼大赛」`scrollWidth - clientWidth = 6px`，`clientWidth = 72`。
- **修复**：给分段项加 `min-width: max-content` 或把标签字号降到 11px。

---

## 4. Lead 指定三问的结论

### A. 图标色：规则**命中且生效**，#333/#ff7700 是包装层的继承色，不上屏

CDP `CSS.getMatchedStylesForNode` 实测（`icon-color-trace.json`）：

| 目标 | 命中规则 | 声明 | 来源 | 结果 |
|---|---|---|---|---|
| `.ex-sign .ex-panel__icon svg`（常态） | `.ex-panel__icon svg` | `color: #334155 !important` | style-sheet-12168-562 第 3048 行（1-based；同表"9. Phosphor 图标层"标题在第 3034 行） | computed `rgb(51,65,85)` ✅ |
| `.extool-icon .ex-panel__icon svg`（选中） | `.ex-panel__wrap > div.is-active .ex-panel__icon svg, .ex-panel__wrap > div.ex-dock-active .ex-panel__icon svg` | `color: var(--miuix-blue) !important` | 同一张表第 3063 行（1-based） | computed `rgb(0,102,255)` ✅ |

- 行号偏移 = **218 行**（用户脚本把所有包 CSS 打进一张 style 表）。换算回源码：sheet 3048 ↔ `ExPanel.css:2830`（`.ex-panel__icon svg { color:#334155 !important }`）、sheet 3063 ↔ `ExPanel.css:2845`（选中态选择器第二行，声明 `color: var(--miuix-blue) !important` 在 2846 行），与源码逐字对应。
- `inlineStyle` 中 **color 声明数 = 0**；inherent/继承链只有 `a{color:inherit}`、`body{color:var(--text-color)}`、`:host,body{--mantine-color-text}` 三条，全部被 `!important` 压过。
- 你看到的 `rgb(255,119,0)` 出现在 **`.ex-ico--fill` 这个 span 包装层**上（继承自 `.PlayerToolbar-ContentRow`），而 SVG 的 `fill="currentColor"` 取的是 **svg 自身**的 color，不是包装层的。像素级复核：常态磁贴图标区最暗像素 `#324054`、选中磁贴图标区众数 `#0065fd` —— **屏幕上确实没有橙色**。
- `.ex-ico--line` / `.ex-ico--fill` 的 display 切换正确：选中磁贴 `line=display:none / fill=display:flex, 38×38`；常态磁贴 `line=flex 38×38 / fill=none 0×0`。
- 结论：**新 Phosphor 层已生效**。唯一遗留是 P3-1——包装层没声明 color，靠 svg 规则兜底，属脆弱点不属故障。

### B. 粘底主按钮压内容：确实压，实测 17 ~ 32.4 px；滚到底可读全

| 量化项 | 版本更新 `.exupdate-panel` | 一键签到 `.sign-panel` |
|---|---|---|
| 主按钮 rect | top 501.5 / bottom 539.5 / h 38 / w 350 | top 502.1 / bottom 540.1 / h 38 / w 350 |
| 容器定位 | `position: sticky; bottom: 0; z-index: 3`，无 inset 其它值 | 同 |
| 容器背景 | `rgba(0,0,0,0)`（`common.js:603` 显式清空） | 同 |
| `elementFromPoint(按钮上沿 -3px)` | `DIV.miuix-modal__body` → **是正文，不是隔离层** | 同 |
| `elementFromPoint(按钮上沿 +1px)` | `BUTTON.ex-btn-primary.exupdate-panel__submit-btn` | `BUTTON.ex-btn-primary.fans-panel__submit-btn` |
| body padding-bottom | 16px | 16px |
| 最后一行文字 bottom（scrollTop=0） | 527 | 542.4 |
| **被按钮遮住的量** | 527 - 510 = **17 px** | 542.4 - 510 = **32.4 px** |
| 滚到底（maxScroll）后 | 0 行被遮，正文末行距按钮 21 px | 0 行被遮，距 21 px |
| 条底到面板底的空隙 | **24.5 px**（正文在这一带露头并被面板圆角裁切） | **24.5 px** |

- 「滚不动」不成立：`scrollHeight` 1334 / 554，可视 317，`maxScroll` 1017 / 237 都能打到。
- 真正的问题是两个：**（1）sticky 条完全透明**，正文从按钮上下穿过；（2）`body.padding-bottom(16) + 条 margin-bottom(8)` 让条离面板底 24.5px，压不住那一带。修复见 P2-1。

### C. Dock 项目清单：8 个磁贴全在，`danmaku-history` 从来不是 Dock 项

- 实测 `document.querySelectorAll(".ex-panel__wrap > div")` = **8**，逐个带 `.ex-panel__indicator` 与 `.ex-ico` 双份 svg：
  `ex-sign(一键签到) / fans-continue(一键续牌) / bloop-icon(弹幕发送小助手) / extool-icon(扩展功能) / livetool-icon(直播间工具) / popup-player(同屏播放) / ex-lottery(全站抽奖信息) / ex-update(版本更新，当前版本2026.11.01.01)`
- `dom/01-dock.html` 复核：`<div class="ex-panel__wrap"><div class="ex-sign">` … 直到 `<div class="ex-update">`，`ex-panel__indicator` **8 个**，与 DOM 一致。
- **`ex-update` 确实插进了 Dock**（你数到 7 个是 grep 口径问题：该磁贴类名是 `ex-update`，且它在 html 里出现在 `ex-lottery` 之后）。
- **`danmaku-history` 既没有 Dock 按钮、也没有 DOM 面板**（`.danmaku-history-panel` 实测 exists=false）；它只出现在 `ExPanel.js:6` 的面板选择器列表和 `ExPanel.js:511` 的 `EX_DOCK_PANEL_MAP` 映射表里，实际入口是页面自己的聊天工具栏 `.ChatToolBar-DanmakuTail`（实测存在）。也就是说 `EX_DOCK_PANEL_MAP` 里那条 `["danmaku-history", ".danmaku-history-panel"]` 对 `updateDockActiveIndicator` 是空转——它永远找不到按钮，属无害残留，但会让"8 个面板"与"10 条映射"计数对不上。

---

## 5. 局限与未覆盖

- 只跑了 9999 一个房间（弹幕/礼物/抽奖/签到数据都依赖真实直播间状态）。`exlottery`、`livetool` 是空态（「暂无数据」/5 个开关行），列表满载时的排版未验证。
- `popup-player-panel` 的「先加一个房间」实测为 disabled 态（`ExPanel.css:922` `background:#94a3b8` + 继承 `#ffffff` 白字，计算对比度 **2.56 : 1**，低于 4.5 : 1），未加房间无法验证多房间网格。
- 未做滚动条视觉（`overflow-y: overlay` 在 Chromium 里等价 auto）与深色模式（`[data-mantine-color-scheme=dark]`）取证。
- 未做动画帧采样（`miuix-dock-spring-in 0.28s`、`miuix-modal-in`）——动画时长与缓动只核对了 CSS 声明，未测帧。
- `task.finish()` 未调用，`dyex-icon-ego` 空间保留（p2 标签页仍在 9999 房间，脚本已注入），后续轮次可直接 `taskSpace("dyex-icon-ego")` 续用。
