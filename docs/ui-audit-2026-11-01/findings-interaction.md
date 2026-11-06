# 交互 / 可达性审计 —— DouyuEx-RL 二级 Dock + 三级控制台

- 审计员：ux-js-auditor（task-2）
- 审计对象：**main @ 828cef7（release 2026.11.01.01）+ 工作区未提交的「Phosphor 图标层」**（ExPanel.css 第 9 节、ExPanel.js 两处注入、新增 src/packages/ExIcon/ExIcons.js），两者都按"当前真实状态"审。
- 只读声明：本审计**未修改 src/ 下任何文件**，未执行 commit/push/checkout。本文档是唯一写入产物。
- 证据方法：每条结论都先用 `grep -n` / `read` 取到 `文件:行号` 再写；行号以工作区当前内容为准（含未提交改动）。
- 语言：简体中文；类名、属性、命令保留原文。

---

## 0. 结论速览

| 编号 | 严重度 | 一句话 | 主要位置 |
|---|---|---|---|
| I-01 | **P0** | 10 个入口 Tab 可达数 = 0；触屏 tap 后 6/8 图标净效果为"什么都没发生" | ExPanel.js:409-411 / 481-490 / Sign.js:16 / common.js:633-643 |
| I-02 | P1 | 同一个「移过去 → 点一下」手势，8 个图标给出 2 种相反结果（6 关、2 留） | ExPanel.js:481-490 + 各包 click |
| I-03 | P1 | 8 个三级面板里 7 个按 ESC 无反应（ESC 只写在 PopupPlayer 自己包里） | ExPanel.js:583-659 / PopupPlayer.js:354-370 |
| I-04 | P1 | 16 处 `outline:none !important` 只有 2 处 `:focus-visible` 兜底 → 键盘焦点不可见 | ExPanel.css:731 / 898 / 859 / 2724 |
| I-05 | P1 | 6 个开关没有可访问名字（读屏只念"复选框 已选中"） | Enter.js:20 / Gift.js:20 / Mute.js:27 / Reply.js:22 / Vote.js:23,25 |
| I-06 | P1 | 点 PostbirdAlertBox 弹框**内部**会把二级胶囊 + 三级面板一起收掉（全屏遮罩未登记为菜单面） | ExPanel.js:14-23 / ExPanel.css:1453-1466 |
| I-07 | P1 | 两套面板清单不一致：`.ChatToolBar-DanmakuTail-Panel` 只进了互斥列表，没进收敛清单 | ExPanel.js:6 vs 668-670 |
| I-08 | P1 | iframe 内的点击收不到，「点外面就关」在账号面板 / 外链区完全失效 | ExPanel.js:181 / AccountList.js:458-467 |
| I-09 | P2 | 160ms 定时器比 200ms 收场动画早切 40ms；真正的坑是 hover 路径不取消计时器 | ExPanel.js:554-565 / ExPanel.css:60-63 |
| I-10 | P2 | 鼠标横扫 8 个磁贴 = 连开 8 次面板（gap 只有 10px，无防抖；手册写的 400ms 防抖代码里不存在） | ExPanel.js:481-490 / ExPanel.css:114-138 |
| I-11 | P2 | 面板内容重建（innerHTML）把键盘焦点丢回 body | PopupPlayer.js:216-217 / 282-297 |
| I-12 | P2 | 面板定位有第二份 380 真源 + 360 兜底，token 一改就错位 | ExPanel.js:690-691 / 342,350 |
| I-13 | P2 | 触控目标：× 26px、开关 38×22、抽屉标题 ≈17px、小胶囊 ≈19px | ExPanel.css:76-99 / 314-335 / 719-740 / 466-476 / 517-531 |
| I-14 | P2 | 卡片结构"外壳统一、内容各写各的"：4 种 card 前缀 + 1 种完全不同的 cell 结构，图标层只覆盖 4/8 面板 | 见 §4 I-14 矩阵 |
| I-15 | P2 | 关闭出口没真正收敛：点续牌图标关闭后蓝色指示条常亮 | FansContinue.js:46-48 |
| I-16 | P2 | 存储写失败静默，且会被误报成"JSON格式错误" | Enter.js:53-77 / 163-166 |
| I-17 | P2 | Dock 从浮动宿主归位后残留 `position:fixed` 内联样式 → 与礼物流水条错位 | ExPanel.js:374-386 vs 281-299 |
| I-18 | P3 | `calc(var(--miuix-modal-height) - 52px)` 的 52 与实际 header 51px 差 1，且是魔法数 | ExPanel.css:351-362 |
| I-19 | P3 | 清单里的死条目：`.fans-panel` / `exlottery-icon` / `danmaku-history` | ExPanel.js:6 / 503-514 / ExIcons.js:61 |
| I-20 | P3 | 精灵球可访问名只有 `title`；更新红点对 AT 不可见 | ExIcon.js:23 / Update.js:31-38 |
| I-21 | P3 | `freetimed` 未走 `ExSave_` 前缀（红线提示） | ExpandTool_TabSwitch.js:77 |
| I-22 | P3 | 弹幕小助手标题双写（"弹幕小助手" / "弹幕发送小助手"），图标映射只有后者 | BarrageLoop.js:116 / ExIcons.js:67-76 |

---

## 1. 任务书十项必查 —— 逐项落点

| # | 必查项 | 结论 | 对应 |
|---|---|---|---|
| ① | 打开/关闭状态机是否卡死/重入 | **不卡死**。三个出口（× / 点外面 / 精灵球）都走 `ExPanel_closeAllMenus()`；160ms 重开竞态已由 `pendingClose` 正确接管（ExPanel.js:543-546）；唯一漏洞是 hover 路径不取消收起计时器 | I-09 |
| ② | 三级面板入口是否只有 mouseenter/click；触屏键盘能否进 | 鼠标：hover + click 双写、互相打架；触屏：tap 先 mouseenter 再 click → 净关；键盘：**0 条路径** | I-01 / I-02 |
| ③ | Tab 顺序 / focus / focus-visible / ESC / 焦点陷阱 | Tab 入口数 0；聚焦不可见；无 ESC；焦点不落进面板、关闭不回位。面板非模态（无遮罩），**不建议做焦点陷阱**（理由见 I-03 末尾） | I-01 / I-03 / I-04 |
| ④ | switch / checkbox 的 role / aria / label | 原生 `<input type=checkbox>` 语义正确、无需 aria-checked；缺的是 6 个开关的**名字**与可见焦点 | I-05 / I-04 |
| ⑤ | 动画期间 pointer-events / display:none / aria-hidden 一致性 | Dock 收场有 `pointer-events:none` ✓（ExPanel.css:62）；但收起后 160ms 内仍在 Tab 序里；全项目没有一处 `aria-hidden`（靠 `display:none` 让 AT 忽略，可用） | I-09 |
| ⑥ | innerHTML 重建导致的焦点丢失与监听泄漏 | 监听**不泄漏**（整树重建，旧监听随节点回收）；**焦点会丢**（同屏面板每次切换都重建整表） | I-11 |
| ⑦ | 空状态 / 加载态 / 失败反馈 | 同屏搜索（搜索中… / 没找到相关直播间 / toast）、续牌（粉丝牌列表请求失败）、弹幕历史（加载中…）都有 ✓；**存储失败**是空白 | I-16 |
| ⑧ | 8 个入口图标 + 标题语义（点谁进谁） | 8 个 mapping 全部命中、标题一致 ✓；`EX_DOCK_PANEL_MAP` 里 3 条死条目，弹幕小助手标题双写 | I-19 / I-22 |
| ⑨ | 触控目标尺寸 vs 44px | Dock 磁贴 56×56 ✓；其余 5 类不达标 | I-13 |
| ⑩ | 点外面关闭是否覆盖 iframe / 三层重叠 / 拖拽误关 | 拖拽不误关 ✓（按下在里、抬手在外）；右键不误关 ✓；**iframe 不覆盖** ✗；**未登记的浮层会反向收菜单** ✗ | I-06 / I-08 |

---

## 2. P0

### I-01【P0】键盘与触屏：10 个入口 0 个可聚焦；触屏 tap 后 6/8 图标净效果为"没反应"

**位置**

- `src/packages/ExPanel/ExPanel.js:409-411`（Dock 外壳只有 1 个原生 button）
- `src/packages/ExPanel/ExPanel.js:481-490`（8 个磁贴的**唯一**交互绑定点是 `mouseenter`）
- 8 个磁贴的插入点（全部是 `<div>` + 内部无 href 的 `<a class="ex-panel__icon">`）：
  `Sign/Sign.js:14-19`、`FansContinue/FansContinue.js:27-33`、`ExpandTool/ExpandTool.js:273-281`、`LiveTool/LiveTool.js:109-113`、`BarrageLoop/BarrageLoop.js:119-125`、`Lottery/Lottery.js:31-38`、`PopupPlayer/PopupPlayer.js:25-32`、`Update/Update.js:99-106`
- `src/packages/ExIcon/ExIcon.js:20-32`（精灵球同样是 div + 无 href 的 a）
- `src/common.js:633-643`（click 走 showExRightPanel 时：已展开且 !forceOpen → 关闭）

**现状**

    // ExPanel.js:409-411
    let a = document.createElement("div");
    a.className = "ex-panel";
    a.innerHTML = '<button type="button" class="ex-panel__close" title="关闭工具条" aria-label="关闭 DouyuEx 工具条">×</button><div class="ex-panel__wrap"></div>';

    // ExPanel.js:481-490 —— 8 个磁贴唯一被 shell 绑定的交互
    btn.addEventListener("mouseenter", () => {
      for (let cls in mapping) {
        if (btn.classList.contains(cls)) {
          if (typeof showExRightPanel === "function") {
            showExRightPanel(mapping[cls], btn, true);   // forceOpen = true：划过即开
          }
          break;
        }
      }
    });

**为什么是问题（可量化）**

1. **可聚焦入口计数 = 0。** 页面里属于插件的入口共 10 个：精灵球 1（ExIcon.js:22）+ 8 个 Dock 磁贴。它们全部是 `div` / 无 href 的 `a`；`grep -rn 'tabindex' src/packages` 只命中 6 个 `<input>`（LiveTool 的开关），磁贴一个都没有。→ 从 `body` 开始按 Tab，**永远不会停在任何入口上**（不是"要按很多次"，是"没有这一站"）。
2. Dock 被鼠标打开后，`.ex-panel` 内可聚焦元素只有 1 个：`.ex-panel__close`（26×26）。8 个磁贴仍然不可聚焦 → Tab 进 Dock 只能停在"关闭工具条"上。
3. 三级面板内部其实有 21 个（`.extool`）、6 个（`.sign-panel`）、7 个（Vote）可聚焦控件 —— **能力是全的，只是没有入口**。全项目唯一键盘可达的面板入口是篡改猴右键菜单「检查更新」→ 版本更新面板（`Menu/Menu.js:13-17`）。
4. **触屏 tap 的双事件序列**：浏览器对一次轻点依次派发 `mouseover → mouseenter → mousedown → mouseup → click`。`mouseenter`（ExPanel.js:481）先把面板打开，随后 `click` 走各包 toggle 分支把它关掉 → **净效果 0**，用户只看到 180ms 的 `miuix-modal-in` 闪一下（ExPanel.css:270）。
   - 8 个图标里 6 个如此：Sign(Sign.js:32-37)、FansContinue(FansContinue.js:44-47)、ExpandTool(→common.js:635-641)、LiveTool(同)、BarrageLoop(同)、Lottery(同)。
   - 只有 2 个活下来：PopupPlayer 显式改成"只开不关"（PopupPlayer.js:41-47 注释自证）；Update 因为判据写成 `style.display === "block"` 而 `openMiuixPanelCentered` 写的是 `flex !important`（Update.js:120 / ExPanel.js:711），关闭分支永远不成立。
   - 触发面：触控屏 Windows 笔记本、平板 Edge、`browser-skill` 的触屏模拟。

**修复（只动 shell，不碰 8 个包）**

    /* ==================== 入口键盘 / 触屏可达 ====================
     * 磁贴是 div、图标是裸 <a>：浏览器不会把它们放进 Tab 序。
     * 补 role/tabindex 与 Enter/Space，并把点击语义**原样转发**给包内既有 click 处理器
     * （btn.click() 会派发 click 事件，包里的 addEventListener("click") 照旧执行，不新增第二条打开路径）。
     */
    var ExPanel_dockKeyboardBound = false;

    function ExPanel_bindDockKeyboard() {
      if (ExPanel_dockKeyboardBound) return;
      var dockWrap = document.querySelector(".ex-panel__wrap");
      if (!dockWrap) return;                       // 容器还没渲染：下次 openExPanel 再补
      ExPanel_dockKeyboardBound = true;

      dockWrap.addEventListener("keydown", function (e) {
        if (!e || (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar")) return;
        var tile = ExPanel_elementOf(e.target);
        if (!tile || typeof tile.closest !== "function") return;
        var btn = tile.closest(".ex-panel__wrap > div");
        if (!btn || !dockWrap.contains(btn)) return;
        e.preventDefault();                        // 空格不要滚页面
        btn.click();                               // 复用包内点击语义
      });
    }

    /* 磁贴类名 → 三级面板选择器：复用既有 EX_DOCK_PANEL_MAP，不再抄第三份清单 */
    function ExPanel_dockPanelSelector(btn) {
      if (!btn || !btn.classList || typeof EX_DOCK_PANEL_MAP === "undefined") return "";
      for (var i = 0; i < EX_DOCK_PANEL_MAP.length; i++) {
        if (btn.classList.contains(EX_DOCK_PANEL_MAP[i][0])) return EX_DOCK_PANEL_MAP[i][1];
      }
      return "";
    }

    // ensureDockIndicators() 内，紧跟 btn.dataset.hoverBound 之前插入（幂等）
    btn.setAttribute("role", "button");
    btn.setAttribute("tabindex", "0");
    btn.setAttribute("aria-label", (function () {
      var iconHost = btn.querySelector(".ex-panel__icon");
      var tipText = iconHost && iconHost.getAttribute("title");
      return tipText || "DouyuEx 面板";
    })());
    btn.setAttribute("aria-expanded", ExPanel_panelIsShown(document.querySelector(ExPanel_dockPanelSelector(btn))) ? "true" : "false");

    // initPkg_ExPanel() 末尾接线（与 ExPanel_bindClickOutside() 并列）
    ExPanel_bindDockKeyboard();

> 兼容性：`EX_DOCK_PANEL_MAP` 已在 ExPanel.js:503-514 定义，`ExPanel_panelIsShown` 在 516-522；`aria-expanded` 的状态跟随放进 `updateDockActiveIndicator()`（见 I-15 补丁）。

---

## 3. P1

### I-02【P1】同一个「移过去 → 点一下」，8 个图标 2 种相反结果

**位置**：`ExPanel.js:481-490`（hover 立即 forceOpen）+ 8 个包的 click 分支 + `common.js:633-643`（toggle）

**现状**

    // common.js:633-643
    let isShowing = targetDom.style.display === "flex" || targetDom.style.display === "block" || (...);
    if (isShowing) {
      if (!forceOpen) {                       // ← 包内 click 调用时 forceOpen 是 undefined
        targetDom.style.setProperty("display", "none", "important");
        ...
        return;                               // ← "划过已经打开了" 变成 "点一下把它关掉"
      }
      return;
    }

    // PopupPlayer.js:41-47 —— 项目自己已经承认并修过这一条
    /* 点击 = **只开不关**（与签到 / 一键续牌 / 版本更新一致）。
       Dock 图标是"划过即打开"的（ExPanel 的 ensureDockIndicators 给 showExRightPanel 传 forceOpen），
       所以指针移到图标上时面板其实已经开了；这里若还做 toggle，"移过去 → 点一下"的必然结果
       就是"刚弹出来又被自己关掉"，看起来像图标坏了。关闭只留两个出口：右上角 × 与 ESC。 */

**为什么是问题**：注释里那句"与签到 / 一键续牌 / 版本更新一致"**已经不成立**——签到是 toggle（Sign.js:32-37）、续牌是 toggle（FansContinue.js:44-47）、版本更新是"永不关闭但谁也没对齐"（Update.js:120）。8 个图标、1 种手势、3 种结果。对鼠标用户是"图标时灵时不灵"，对触屏用户就是 I-01 的"点了没反应"。

**修复**：把"点击只开不关"**提升成外壳契约**，在捕获阶段吞掉"面板已经展开时的那次真实指针点击"。这一条同时解决 I-01 的触屏路径（tap 的 mouseenter 打开 → click 被吞 → 面板保持）。

    /* 点击语义统一：面板已经展开时，吞掉这次"真实指针点击"（e.detail > 0），
     * 保留 hover/tap 已打开的成果；键盘 Enter（btn.click() 产生 detail = 0）不吞，仍可切换。
     * 关闭出口保持用户 2026-11-01 的决定不变：× / ESC / 点菜单外面。
     */
    var ExPanel_dockClickGuardBound = false;

    function ExPanel_onDockClickCapture(e) {
      if (!e || e.detail === 0) return;                    // 键盘/程序化点击放行
      var tile = ExPanel_elementOf(e.target);
      if (!tile || typeof tile.closest !== "function") return;
      var btn = tile.closest(".ex-panel__wrap > div");
      if (!btn) return;
      var selector = ExPanel_dockPanelSelector(btn);
      if (!selector) return;
      if (ExPanel_panelIsShown(document.querySelector(selector))) {
        e.stopImmediatePropagation();                      // 包内 toggle 分支不再执行
        e.preventDefault();
      }
    }

    function ExPanel_bindDockClickGuard() {
      if (ExPanel_dockClickGuardBound) return;
      var dockWrap = document.querySelector(".ex-panel__wrap");
      if (!dockWrap) return;
      ExPanel_dockClickGuardBound = true;
      dockWrap.addEventListener("click", ExPanel_onDockClickCapture, true);   // 捕获：先于包内 handler
    }

    // initPkg_ExPanel() 末尾接线
    ExPanel_bindDockClickGuard();

> 与护栏测试的关系：`tests/test_menu_outside_close.js` 的 `testSourceGuards` 只钉 `document.addEventListener("mousedown", ExPanel_onMenuOutsideMouseDown, true)` 这串字面量，本补丁不触碰它。

---

### I-03【P1】8 个三级面板里 7 个按 ESC 没反应

**位置**

- `ExPanel.js:583-659`（统一外壳 `ensureMiuixPanelHeader`：只有 × 的 onclick，没有 keydown）
- `PopupPlayer.js:354-370`（全项目唯一一处面板 ESC，且只处理自己）
- `ExpandTool_GiftPicker.js:301-305`、`VideoToolbarMenu.js:145-155`（子菜单各自有 ESC）

**现状**

    // ExPanel.js:646-658 —— 外壳唯一关闭出口
    var closeBtn = header.querySelector(".miuix-modal__close");
    if (closeBtn) {
      closeBtn.onclick = function (e) {
        e.stopPropagation();
        el.style.removeProperty("display");
        el.style.setProperty("display", "none", "important");
        el.classList.remove("miuix-modal-in");
        if (typeof updateDockActiveIndicator === "function") updateDockActiveIndicator();
      };
    }

**为什么是问题**：`.miuix-modal__close` 只有 26×26（ExPanel.css:314-317），是唯一的可见关闭按钮；项目自己在 PopupPlayer.js:348-351 写明"用户第一反应是按 ESC 收起"。签到 / 续牌 / 扩展功能 / 直播间工具 / 弹幕小助手 / 抽奖 / 版本更新 7 个面板的 ESC 全是空操作（按下去只会退出浏览器全屏）。

**修复**（统一外壳里绑一次，比 8 个包各绑一次更稳）

    /* ==================== ESC 统一关闭 ====================
     * 8 个三级面板共用一个外壳，ESC 就该只绑一次。
     * 顺序约定：子菜单（礼物选择器 / 视频工具条菜单）先 e.defaultPrevented 表态，外壳不抢；
     * 全屏时 ESC 归浏览器；PostbirdAlertBox 开着时由它自己的关闭按钮负责。
     */
    var ExPanel_escBound = false;

    function ExPanel_bindEscClose() {
      if (ExPanel_escBound) return;
      ExPanel_escBound = true;
      document.addEventListener("keydown", function (e) {
        if (!e || (e.key !== "Escape" && e.keyCode !== 27)) return;
        if (e.defaultPrevented) return;
        if (document.fullscreenElement) return;
        if (document.querySelector(".postbird-box-container.active")) return;
        if (!ExPanel_hasOpenMenu()) return;
        ExPanel_closeAllMenus();
      });
    }

    // initPkg_ExPanel() 末尾接线
    ExPanel_bindEscClose();

> 注册顺序：ExPanel 在 `src/main.js:94` 初始化，早于 PopupPlayer（`:106`），外壳 keydown 先执行 → ESC 变成"全收"（含二级胶囊）；PopupPlayer 自己那份 354-370 行会因 `panel.style.display !== "flex"` 直接返回，不会二次动作。这是行为统一，不是回退。

> **不建议做焦点陷阱**：面板没有遮罩、不与页面互斥、用户还会同时操作聊天框（产品形态如此，不是模态对话框）。需要的是"打开时焦点进面板、关闭时焦点回入口"，见 I-01 / I-11。

---

### I-04【P1】键盘焦点不可见：16 处 `outline:none !important`，只有 2 处 `:focus-visible`

**位置**

- `ExPanel.css:719-740`（`.sign-checkbox` 第 731 行 `outline: none !important`）
- `ExPanel.css:883-900`（`.ex-btn-primary` / `.fans-panel__submit-btn` / `.popup-panel__submit-btn` / `.exupdate-panel__submit-btn`，第 898 行 `outline: none !important`）
- 全文件 `outline: none` 命中 16 处：601/617/731/898/939/959/995/1206/1224/1391/1557/1590/1696/1751/2046/2633；`:focus-visible` 只有 2 处：859（分段控件 radio）、2724（同屏结果行）

**现状**

    /* ExPanel.css:719-740 */
    .sign-checkbox, .miuix-switch, input[type="checkbox"].sign-checkbox {
        -webkit-appearance: none !important;
        appearance: none !important;
        outline: none !important;      /* 731 */
        ...
    }
    /* 之后没有任何 .sign-checkbox:focus 规则 */

**为什么是问题**：WCAG 2.4.7（Focus Visible）直接不达标。键盘用户 Tab 到开场开关（`.extool` 21 个、`.sign-panel` 6 个、Vote 7 个）时**屏幕毫无变化**，只能靠数 Tab 次数猜位置；主操作按钮（立即开始续牌 / 版本更新）同理。

**修复**（只用已有 token，不引入新色）

    /* ==========================================================================
       9.x 键盘可达性：所有可聚焦控件在键盘导航时必须可见焦点（WCAG 2.4.7）
       只补 :focus-visible —— 鼠标点击不出框，键盘导航才出框；颜色只用既有 token。
       ========================================================================== */
    .miuix-modal button:focus-visible,
    .miuix-modal [role="button"]:focus-visible,
    .miuix-modal a[href]:focus-visible,
    .miuix-modal select:focus-visible,
    .miuix-modal input[type="checkbox"]:focus-visible,
    .miuix-modal input[type="range"]:focus-visible,
    .ex-panel button:focus-visible,
    .ex-panel [role="button"]:focus-visible,
    .postbird-box-container button:focus-visible {
        outline: 2px solid var(--miuix-blue) !important;
        outline-offset: 2px !important;
    }

    /* 开关是 38×22 圆角胶囊，2px 外框会被圆角吃掉一半视觉 → 单独再给一圈光晕 */
    .miuix-modal input[type="checkbox"].sign-checkbox:focus-visible {
        outline: 2px solid var(--miuix-blue) !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 4px var(--miuix-blue-glow) !important;
    }

> 特异性核对：`input[type="checkbox"].sign-checkbox` = (0,2,1)，补丁 `.miuix-modal input[type="checkbox"].sign-checkbox:focus-visible` = (0,3,1)，两边都带 `!important` → 补丁胜出。主按钮同理。

---

### I-05【P1】6 个开关没有可访问名字

**位置**（`grep -n 'sign-checkbox' src/packages/LiveTool/*/*.js`）

- `LiveTool/Enter/Enter.js:20` `id="enter__switch"`
- `LiveTool/Gift/Gift.js:20` `id="gift__switch"`
- `LiveTool/Mute/Mute.js:27` `id="mute__switch"`
- `LiveTool/Reply/Reply.js:22` `id="reply__switch"`
- `LiveTool/Vote/Vote.js:25` `id="vote__switch"`（`:23` 的 `vote__repeat` 有 label 包裹，正常）

**现状**

    <!-- Enter.js:13-25 -->
    <div class='livetool__cell_title'>
        <span id='enter__title'>进场欢迎</span>
        <span id='enter__export'>导出</span>
        <span id='enter__import'>导入</span>
    </div>
    <div class='livetool__cell_option'>
        <div class="livetool__cell_switch">
            <input type="checkbox" class="sign-checkbox" id="enter__switch" tabindex="0" checked>
        </div>
    </div>

**为什么是问题**：`grep -rn 'for="' src/packages` 零命中 —— 全项目没有一个 `<label for>`；这 6 个 input 既没有外层 label 包裹（对比 Sign.js:64-70 / ExpandTool.js:66-72 的 `<label class="sign-option-item">`），也没有 `aria-label`。读屏结果是"复选框，已选中"，用户不知道勾的是"进场欢迎"还是"礼物答谢"。`tabindex="0"` 对 input 是冗余（本来就入 Tab 序），不算 bug。

**修复**（外壳统一兜底：一个函数覆盖 6 个，以后新增模块自动生效）

    /* 直播间工具的开关是"标题 + 右侧开关"结构，input 自己没有名字。
     * 名字优先取最近的 .livetool__cell_title 文字；已被 <label> 包住的跳过；幂等。 */
    function ExPanel_nameBareSwitches(root) {
      if (!root || typeof root.querySelectorAll !== "function") return 0;
      var inputs = root.querySelectorAll('input[type="checkbox"].sign-checkbox');
      var named = 0;
      for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i];
        if (!input || input.getAttribute("aria-label")) continue;
        if (input.closest && input.closest("label")) continue;   // 名字天然成立
        var cell = input.closest ? input.closest(".livetool__cell") : null;
        var titleEl = cell ? cell.querySelector('.livetool__cell_title span[id$="__title"]') : null;
        var nameText = titleEl && titleEl.textContent ? titleEl.textContent.trim() : "";
        input.setAttribute("aria-label", nameText ? (nameText + " 开关") : "功能开关");
        named++;
      }
      return named;
    }

    // ensureMiuixPanelHeader(): nodesToMove 搬完、ExIco_decorateCards(body) 之后
    if (typeof ExPanel_nameBareSwitches === "function") ExPanel_nameBareSwitches(body);

---

### I-06【P1】点 PostbirdAlertBox 弹框**内部**会把二级胶囊 + 三级面板一起收掉

**位置**

- `ExPanel.js:14-23`（`EX_MENU_SURFACE_EXTRA` 缺 `.postbird-box-container`）
- `ExPanel.js:169-175`（外部判定）
- `ExPanel.css:1453-1466`（弹框容器 = 100vw × 100vh 全屏遮罩，`z-index: 100060`）
- 使用点：`Enter.js:54`、`Gift.js:130`、`Mute.js:76`、`Reply.js:57`、`Refresh_Barrage.js:54`、`Refresh_BarrageFrame.js:92`

**现状**

    // ExPanel.js:14-23
    const EX_MENU_SURFACE_EXTRA = [
      ".ex-panel", ".ex-icon", ".ChatToolBar-DanmakuTail-Panel", "#ex-vtoolbar-menu",
      ".ex-gift-picker-modal", ".ex-gift-picker-mask", ".ex-pip-menu-root", "[data-ex-menu-layer]"
    ];   // ← 没有 .postbird-box-container

    /* ExPanel.css:1453-1466 */
    .postbird-box-container {
        width: 100vw !important;
        height: 100vh !important;
        position: fixed !important;
        z-index: 100060 !important;    /* 三层之上，全屏遮罩 */
        display: none;
    }

**为什么是问题**：它是全屏遮罩，**点它内部任意一个像素**（输入框 / 确定 / 取消 / 标题）都会走 `ExPanel_isInsideMenu → false` → `hasOpenMenu() → true` → `ExPanel_closeAllMenus()`。

可复现路径（100%）：

1. 点精灵球 → 点「直播间工具」→ 展开「进场欢迎」抽屉 → 点「导入」（或「添加」）
2. PostbirdAlertBox 出现
3. 鼠标点输入框 → **二级胶囊 + `.livetool` 面板当场消失**（弹框还留着，它是独立 body 子节点）
4. 点「确定」→ 导入提示照常弹出，但背后什么都没了

这是 a5098b0 引入"点外面就关"时**漏登记一个浮层**的直接回归，影响 6 个调用点，其中 4 个就在三级面板里。

**修复**（一行 + 注释把"全屏遮罩型浮层"这个类别写清楚）

    const EX_MENU_SURFACE_EXTRA = [
      ".ex-panel",                      /* 二级胶囊菜单（工具条本体） */
      ".ex-icon",                       /* 一级精灵球：展开 / 全部收敛的开关 */
      ".ChatToolBar-DanmakuTail-Panel", /* 弹幕小尾巴面板 */
      "#ex-vtoolbar-menu",              /* 视频工具条上的 DouyuEx 菜单 */
      ".ex-gift-picker-modal",          /* 扩展功能里再打开的礼物选择器 */
      ".ex-gift-picker-mask",           /* 它的遮罩 */
      ".ex-pip-menu-root",              /* 加强版画中画菜单 */
      ".postbird-box-container",        /* 通用提示/确认/输入弹框：100vw×100vh 全屏遮罩，
                                           不登记的话点弹框内部会把背后整套菜单一起收掉 */
      "[data-ex-menu-layer]"            /* 运行期追加的次级菜单层 */
    ];

> 回归用例：`tests/test_menu_outside_close.js` 的 11 组里加一组「弹框内部点击不收敛」（press 到 `.postbird-box-container` 后断言 `.extool` 仍为 flex）。

---

### I-07【P1】两套面板清单不一致：`.ChatToolBar-DanmakuTail-Panel` 只进了互斥列表

**位置**

- `ExPanel.js:6`（收敛清单，**没有**小尾巴面板）
- `ExPanel.js:668-670`（`openMiuixPanelCentered` 的互斥列表，**有**）
- `DanmakuTail.js:15`（面板本体）+ `DanmakuTail.js:138-146`（自己的关闭：`panel.style.display = "none"`，无 `!important`）

**现状**

    // ExPanel.js:6
    const EX_THIRD_LEVEL_PANELS = ".sign-panel, .fans-continue-panel, .fans-panel, .extool, .livetool, .bloop, .exlottery, .popup-player-panel, .exupdate-panel, .danmaku-history-panel";

    // ExPanel.js:668-670
    var allPanels = document.querySelectorAll(
      ".sign-panel, .fans-continue-panel, .fans-panel, .extool, .livetool, .bloop, .exlottery, .popup-player-panel, .exupdate-panel, .ChatToolBar-DanmakuTail-Panel, .danmaku-history-panel"
    );

**可复现差异（两个手势、两种结果）**

| 场景 | 走哪条代码 | 结果 |
|---|---|---|
| 开着小尾巴面板，开签到面板 | `openMiuixPanelCentered`（669 行互斥） | 小尾巴面板**被关**（写 `display:none !important`） |
| 开着小尾巴面板 + 签到面板，点页面空白 | `ExPanel_closeAllMenus → ExPanel_closeAllThirdLevel`（第 6 行清单） | 签到面板关；**小尾巴面板不被这条路径关**（只是碰巧被它自己的 document click 监听关掉） |
| 开着小尾巴面板 + 胶囊，点精灵球 | `ExIcon.js:42 → isAnyThirdLevelPanelOpen()`（第 6 行清单） | 返回 false → 只 `toggleExPanel()` 折胶囊，小尾巴面板**留着**；而 ExIcon.js:36-39 注释写的是"有三级面板展开时 = 全部收敛" |
| `updateDockActiveIndicator()` | EX_DOCK_PANEL_MAP | 小尾巴没有磁贴，天然无蓝条 —— 一致 |

**为什么是问题**：同一份"面板"概念被抄了两遍，新增面板必须记得改两处 —— 而 a5098b0 的整个卖点就是"以后新增面板只改一份清单"（ExPanel.js:4-5 注释）。现在两份已经漂移。

**修复**：第 6 行做成**唯一**清单（补上小尾巴面板），668-670 行改为引用同一常量。

    // ExPanel.js:4-6 —— 唯一真源：收敛、互斥、指示器三处都读它
    const EX_THIRD_LEVEL_PANELS = ".sign-panel, .fans-continue-panel, .extool, .livetool, .bloop, .exlottery, .popup-player-panel, .exupdate-panel, .danmaku-history-panel, .ChatToolBar-DanmakuTail-Panel";

    // openMiuixPanelCentered() 内，删掉手抄字符串：
    var allPanels = document.querySelectorAll(EX_THIRD_LEVEL_PANELS);

> 三点注意：
> 1. `.fans-panel` 在现网**没有任何节点**（`grep -rn 'class="fans-panel"'` 零命中），本次一并删（见 I-19）。
> 2. 小尾巴的开关按钮 `.ChatToolBar-DanmakuTail` 已在 `EX_MENU_TRIGGER_SELECTOR`（ExPanel.js:34），"点开关不被抢先收"的语义**不受影响**。
> 3. `test_menu_outside_close.js` 断言 `const EX_THIRD_LEVEL_PANELS` 只出现 1 次 → 仍然成立。

---

### I-08【P1】iframe 内的点击收不到，「点外面就关」在整块区域失效

**位置**：`ExPanel.js:177-182`（document 捕获 mousedown）；`AccountList.js:458-467`（5 个跨域 iframe：passport / yuba / msg / v.douyu / cz）

**现状**

    // ExPanel.js:177-182
    function ExPanel_bindClickOutside() {
      if (ExPanel_outsideClickBound) return;
      if (typeof document === "undefined" || !document || !document.addEventListener) return;
      ExPanel_outsideClickBound = true;
      document.addEventListener("mousedown", ExPanel_onMenuOutsideMouseDown, true);
    }

    <!-- AccountList.js:464-467 -->
    <iframe id="ex-yuba-iframe" ... src="https://yuba.douyu.com/iframe/tab/6416853?exClean&domain=..."></iframe>

**为什么是问题**：跨域 iframe 内的鼠标事件**永远不会进入父文档**，捕获阶段也捕获不到。于是胶囊/面板开着 → 点进账号面板里的鱼吧 / 登录 / 充值 iframe → 菜单保持展开，直到点回父文档才收。用户感受是"点外面有时候没反应"：同一个手势，点主页 100% 生效，点 iframe 区 0% 生效。

**修复**：补一个"焦点离开文档且落点在 IFRAME"的收敛兜底。

    /* ==================== iframe 兜底 ====================
     * 跨域 iframe 里的 mousedown 不会冒泡到父文档，捕获也捕获不到。
     * 改用 window 的 blur：焦点进 iframe 时父窗口失焦，此时把菜单收掉 ——
     * 与"点外面就关"同一语义，只是换了个能被观测到的信号。
     */
    var ExPanel_iframeBlurBound = false;

    function ExPanel_bindIframeBlurClose() {
      if (ExPanel_iframeBlurBound) return;
      if (typeof window === "undefined" || !window.addEventListener) return;
      ExPanel_iframeBlurBound = true;
      window.addEventListener("blur", function () {
        var active = document.activeElement;
        if (!active || active.tagName !== "IFRAME") return;   // 普通失焦（切页签 / 切窗口）不算
        if (!ExPanel_hasOpenMenu()) return;
        ExPanel_closeAllMenus();
      });
    }

    // initPkg_ExPanel() 末尾接线
    ExPanel_bindIframeBlurClose();

> 局限：`document.activeElement` 在各内核下指到 iframe 的时机不同；若实测拿不到，可退化为"无条件 window blur 收敛"（副作用：切窗口也收菜单，需要用户拍板）。上表是"先低误伤、后保覆盖"的两档方案。

---

## 4. P2

### I-09【P2】160ms 定时器 vs 200ms 收场动画；真正的坑是 hover 路径不取消计时器

**位置**：`ExPanel.js:554-565`、`ExPanel.css:60-63`、`ExPanel.js:536-552`（pendingClose 处理）

**现状**

    // ExPanel.js:559-564
    setTimeout(() => {
      if (exPanelDOM.classList.contains("miuix-dock-out")) {
        exPanelDOM.style.display = "none";
        exPanelDOM.classList.remove("miuix-dock-out");
      }
    }, 160);

    /* ExPanel.css:60-63 */
    .ex-panel.miuix-dock-out {
        animation: miuix-dock-spring-out 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
        pointer-events: none !important;
    }

**实测换算（回答"动画被砍掉尾巴"的观感）**：时间轴 200ms，在 160ms 处进度 = 0.8；`cubic-bezier(0.16,1,0.3,1)` 在 0.8 处约 **0.93** 完成度 → 被硬切时画面是 `opacity ≈ 0.07`、`translateY ≈ 9.3px`、`scale ≈ 0.944`。**结论：肉眼几乎看不出来**（剩 7% 不透明度的残影），这条本身不值一改；而且 `pointer-events:none` 已在 60-63 行生效，160ms 内也点不到。

**真正的坑是同一套计时器在 hover 路径上没人取消**：收起后的 160ms 内，鼠标滑到任意磁贴 → `mouseenter`（ExPanel.js:481）直接 `showExRightPanel`，**不经过 `openExPanel()`**，所以既不清 `miuix-dock-out`、也不被 pendingClose 接管。160ms 到点 → 胶囊 `display:none`。用户看到：**三级面板弹出来了，二级胶囊却消失了**（面板悬空）。

**修复（A：切场交给 animationend；B：hover 路径先抢占重开）**

    function hideExPanel() {
      const exPanelDOM = document.querySelector(".ex-panel");
      if (!exPanelDOM) return;
      exPanelDOM.classList.remove("miuix-dock-in");
      exPanelDOM.classList.add("miuix-dock-out");

      /* 收场结束以 animationend 为准（CSS 时长改了不用改 JS）；
         同时保留 240ms 兜底 —— 系统开启「减少动态效果」时 animationend 不会来。 */
      var finished = false;
      var settle = function () {
        if (finished) return;
        finished = true;
        if (!exPanelDOM.classList.contains("miuix-dock-out")) return;
        exPanelDOM.style.display = "none";
        exPanelDOM.classList.remove("miuix-dock-out");
      };
      exPanelDOM.addEventListener("animationend", function onDockOutEnd(e) {
        if (e && e.animationName && e.animationName !== "miuix-dock-spring-out") return;
        exPanelDOM.removeEventListener("animationend", onDockOutEnd);
        settle();
      });
      setTimeout(settle, 240);
    }

    // ensureDockIndicators() 的 mouseenter 回调开头补一句（对应 B）：
    btn.addEventListener("mouseenter", () => {
      // 收起动画还没走完就滑上来了：先真正重新展开，否则 240ms 后胶囊会在面板底下消失
      const dock = document.querySelector(".ex-panel");
      if (dock && dock.classList.contains("miuix-dock-out")) openExPanel();
      ...
    });

---

### I-10【P2】鼠标横扫 8 个磁贴 = 连开 8 次面板（gap 10px，无防抖）

**位置**：`ExPanel.js:481-490`；`ExPanel.css:114-123`（`gap: 10px`）、`125-138`（56px 磁贴）

**为什么是问题**：磁贴之间的空隙只有 10px，鼠标从 Dock 左端划到右端必然跨 7 个 gap，每次 `mouseenter` 都触发一次 `showExRightPanel → openMiuixPanelCentered`：关掉别人、重算 `left`、重放 180ms 动画。观感是"面板在脚下乱跳"。`docs/MAINTENANCE.md:113` 明文写了"**18px 隐形连桥 + 400ms 防抖**"，而 `grep -rn 'bridge|Bridge|连桥' src/` **零命中** —— 手册描述的那套防抖从未落到代码里。

**修复**（只给"切换面板"加防抖，不碰关闭模型）

    /* ==================== hover 切换防抖 ====================
     * 磁贴间距 10px，横穿 Dock 会连发 7 次 mouseenter。这里只对"从一个面板切到另一个面板"做 180ms 防抖，
     * 第一个 mouseenter（没有任何面板开着）仍然立即打开 —— 不改变"划过即开"的手感。
     * 本次不做鼠标移出关闭（用户 2026-11-01 的决定），也不做 18px 连桥（只会把误开面积从 56px 扩到 74px）。
     */
    var ExPanel_hoverTimer = 0;

    function ExPanel_openPanelByHover(btn, name) {
      if (ExPanel_hoverTimer) {
        clearTimeout(ExPanel_hoverTimer);
        ExPanel_hoverTimer = 0;
      }
      var run = function () {
        ExPanel_hoverTimer = 0;
        if (typeof showExRightPanel === "function") showExRightPanel(name, btn, true);
      };
      if (!isAnyThirdLevelPanelOpen()) { run(); return; }   // 首次打开：零延迟
      ExPanel_hoverTimer = setTimeout(run, 180);             // 已有面板：等指针停稳再换
    }

    // ensureDockIndicators() 的 mouseenter 回调体改成：
    btn.addEventListener("mouseenter", () => {
      const dock = document.querySelector(".ex-panel");
      if (dock && dock.classList.contains("miuix-dock-out")) openExPanel();
      for (let cls in mapping) {
        if (btn.classList.contains(cls)) {
          ExPanel_openPanelByHover(btn, mapping[cls]);
          break;
        }
      }
    });

---

### I-11【P2】面板内容重建（innerHTML）把键盘焦点丢回 body

**位置**：`PopupPlayer.js:216-217`（`roomsEl.innerHTML = list.map(...)`）、`282-297`（合入胶囊 click → `PopupPlayer_renderMultiPage()`）、`259-267`（每次重建后重绑 input 监听）

**现状**

    // PopupPlayer.js:282-287
    btn.addEventListener("click", function () {
      let rid = btn.getAttribute("data-rid");
      let key = btn.getAttribute("data-key");
      let wasOn = btn.getAttribute("aria-pressed") === "true";
      if (!MultiScreen_setRoomFlag(rid, key, !wasOn)) return;
      PopupPlayer_renderMultiPage();          // ← 整张列表 innerHTML 重建

**为什么是问题**：键盘用户 Tab 到某间房的「合弹幕」→ Enter → 整张 `#popup-ms-rooms` 重建 → 有焦点的按钮节点被丢弃 → `document.activeElement` 落到 body。想再切一次「合画面」，得从头 Tab 穿回面板（面板挂在 `document.body` 末尾，ExPanel.js:663-665）。鼠标用户完全无感，键盘用户每切一次就被踢出一次。

**修复**（重绘前后按 `data-rid` / `data-key` 记住焦点，重绘后还回去）

    /* 重绘前记下焦点语义坐标，重绘后按同一坐标还回去：
     * 同屏面板每次切开关都会重建整表，不记的话键盘焦点会被丢回 body。 */
    function PopupPlayer_captureFocusKey(root) {
      var active = document.activeElement;
      if (!root || !active || !root.contains(active)) return null;
      return {
        rid: active.getAttribute ? active.getAttribute("data-rid") : "",
        key: active.getAttribute ? active.getAttribute("data-key") : ""
      };
    }

    function PopupPlayer_restoreFocusKey(root, focusKey) {
      if (!root || !focusKey || !focusKey.rid) return false;
      var target = focusKey.key
        ? root.querySelector('.popup-ms__chip[data-rid="' + focusKey.rid + '"][data-key="' + focusKey.key + '"]')
        : root.querySelector('[data-rid="' + focusKey.rid + '"]');
      if (!target || typeof target.focus !== "function") return false;
      try { target.focus({ preventScroll: true }); return true; } catch (e) { return false; }
    }

    // PopupPlayer_renderMultiPage() 里，roomsEl.innerHTML 前后各插一句：
    var focusKey = PopupPlayer_captureFocusKey(roomsEl);
    roomsEl.innerHTML = /* 原样 */;
    PopupPlayer_restoreFocusKey(roomsEl, focusKey);

> `preventScroll: true` 是必须的：列表已有 `let roomsScroll = roomsEl.scrollTop`（PopupPlayer.js:215）保持滚动位置，focus 不带 preventScroll 会把列表滚走。

---

### I-12【P2】面板定位有第二份 380 真源 + 360 兜底，token 一改就错位

**位置**

- `ExPanel.js:690-691`：`var panelWidth = 380; panel.style.width = panelWidth + "px";`
- `ExPanel.js:342` 与 `ExPanel.js:350`：`const panelWidth = panel.offsetWidth || panel.scrollWidth || 360;`
- `ExPanel.css:7`：`--miuix-modal-width: 380px`（唯一合法真源）

**现状 / 评估**

1. 第 691 行 `panel.style.width = "380px"` **其实是死代码**：`.miuix-modal` 的 `width: var(--miuix-modal-width) !important`（ExPanel.css:224）压过内联普通声明。但它会让人以为"JS 也在管宽度"，改 token 时容易漏。
2. **真正会错位的是第 692 行的居中计算**：`var left = (window.innerWidth - panelWidth) / 2;` 用的是硬编码 380。token 改成 360 → 面板实际 360 宽、left 仍按 380 算 → **整体左偏 10px**；改成 400 → **右偏 10px**。磁贴触发的路径（695-702 行按 btnEl 的 rect 居中）同样偏。
3. 342/350 行的 `|| 360` 是第三份宽度：Dock 实际宽度 = 8×56 + 7×10 gap + 2×18 padding = **554px**。面板此刻 `display:none` 时 `offsetWidth` 为 0 → 落到 360 → 浮动 Dock 居中偏 `(554-360)/2 = 97px`。触发条件：`ExPanel_attachToFloatingHost()` 在从未展开过时调用 `ExPanel_updateFloatingPosition()`（ExPanel.js:362-372）。

**修复**（宽度只读 CSS，读不到就不硬算）

    /* 宽度不持有第二份真源：先量当前布局，量不到（display:none）再读 :root 的 --miuix-modal-width。
     * 仍然拿不到就放弃定位，交给 CSS 默认摆放 —— 宁可不居中，也不要按猜的数字算。 */
    function ExPanel_measurePanelWidth(panel) {
      if (!panel) return 0;
      var rectWidth = panel.getBoundingClientRect ? panel.getBoundingClientRect().width : 0;
      if (rectWidth > 0) return rectWidth;
      try {
        var tokenValue = parseFloat(
          window.getComputedStyle(document.documentElement).getPropertyValue("--miuix-modal-width")
        );
        if (isFinite(tokenValue) && tokenValue > 0) return tokenValue;
      } catch (e) {}
      return panel.offsetWidth || 0;      // 老内核兜底；0 表示拿不到
    }

    // openMiuixPanelCentered() 替换 690-692 三行：
    var panelWidth = ExPanel_measurePanelWidth(panel);
    if (!panelWidth) return;              // 量不到宽度就别写 left/bottom，保持 CSS 原样
    var left = (window.innerWidth - panelWidth) / 2;

    // ExPanel_updateFloatingPosition() 替换 342 / 350 两处兜底：
    const panelWidth = panel.offsetWidth || panel.scrollWidth;
    if (!panelWidth) return;              // 还没布局就跳过，下一次 openExPanel 会再算

> 约束核对：本补丁**没有**新增 `380px` / `370px` 字面量，宽度全部走 `var(--miuix-modal-width)` 或实测值。

---

### I-13【P2】触控目标尺寸：5 类不达 44px 基线

| 控件 | 实测尺寸 | 位置 | 场景 |
|---|---|---|---|
| Dock 关闭 × | **26×26**（还悬在胶囊外 top:-9 right:-9） | ExPanel.css:76-99 | 拇指点关闭，易点到旁边的播放器控件 |
| 面板关闭 × | **26×26** | ExPanel.css:314-335 | 每个面板唯一的可见关闭按钮 |
| 弹簧开关 | **38×22** | ExPanel.css:719-740 | 直播间工具 6 + 扩展功能 21 + 签到 6 |
| 抽屉标题（折叠触发器） | 13px×1.3 ≈ **17px 高**，无 padding | ExPanel.css:466-476 | 6 个抽屉标题，整行可点但只有文字高度 |
| 标题旁小胶囊（导出/导入/名单） | 11px + 2px×7 padding + 1px border ≈ **19px 高** | ExPanel.css:517-531 | 12+ 个 |
| 弹幕历史翻页 ‹ › | **24×24** | ExPanel.css:2034-2039 | 逐日翻页 |

**修复**（视觉尺寸一个都不改，只用伪元素/负 margin 把热区补到 44px）

    /* ==========================================================================
       9.y 触控热区：视觉尺寸不变，热区补到 44×44（iOS HIG / Material 下限）
       ========================================================================== */
    .ex-panel__close::after,
    .miuix-modal__close::after,
    .danmaku-history-panel__date-btn::after {
        content: "" !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        width: 44px !important;
        height: 44px !important;
        transform: translate(-50%, -50%) !important;
        border-radius: 50% !important;
    }

    /* 开关：38×22 本体不动，四周补 11px 透明热区 */
    .sign-checkbox::after {
        content: "" !important;
        position: absolute !important;
        top: -11px !important;
        bottom: -11px !important;
        left: -3px !important;
        right: -3px !important;
    }

    /* 抽屉标题：整行可点，但只有文字高度 → 用对称 padding/负 margin 把热区撑到 ≈41px，视觉位置不变 */
    .livetool__cell_title {
        padding: 12px 0 !important;
        margin: -12px 0 !important;
    }

---

### I-14【P2】卡片结构"外壳统一、内容各写各的"（8 面板实测矩阵）

| 面板 | 面板根类 | 卡片类 | 卡片头类 | 头右槽 | 图标层有头图标 |
|---|---|---|---|---|---|
| 一键签到 | `.sign-panel` | **`.fans-panel__card`** | `.fans-panel__card-header` / `__card-title` | 裸 `<span style="font-size:11px;color:#64748b">`（Sign.js:60） | 有 |
| 一键续牌 | `.fans-continue-panel` | **`.fans-panel__card`** | 同上 | `.fans-panel__badge-tag` | 有 |
| 扩展功能 | `.extool` | **`.fans-panel__card`** | 同上 | 裸 `<span style="...color:#0066ff">`（ExpandTool.js:64） | 有 |
| 弹幕发送小助手 | `.bloop` | **`.fans-panel__card`** | 同上 | — | 有 |
| 全站抽奖信息 | `.exlottery` | **`.fans-panel__card`** | 同上 | — | 有 |
| 同屏播放 | `.popup-player-panel` | `.popup-panel__card` | `.popup-panel__card-header` / `__card-title` | `<button class="popup-panel__paste-btn">` | 有 |
| 版本更新 | `.exupdate-panel` | `.exupdate-panel__card` | `.exupdate-panel__card-header` / `__card-title` | — | 有 |
| 直播间工具 | `.livetool` | **`.livetool__cell`** | `.livetool__cell_title`（**不是** card-header） | 多个小胶囊 span | **无** |

**为什么是问题**

1. 五张面板共用 `fans-panel__` 前缀（历史包袱）：语义上"粉丝牌面板的卡片"出现在签到 / 扩展功能 / 抽奖里，`grep fans-panel` 会捞出 5 个不相关文件。
2. **图标层覆盖 4/8**：`ExIcons.js:100` 只认 `.fans-panel__card-title, .popup-panel__card-title, .exupdate-panel__card-title, .miuix-card__title`，而直播间工具用 `.livetool__cell_title > span[id$="__title"]` → 面板里的 6 张卡片**一个图标都没有**，但同一个面板的头图标（`.ex-title-ico`）有。视觉上"头有图标、卡片没有"比"都没有"更突兀。
3. 头右槽 3 种写法（裸 inline style ×2、`.fans-panel__badge-tag`、`<button>`）→ 同一位置，有的可点有的不可点，用户会去点签到卡片右槽那句灰字。

**修复**

    // ExIcons.js:100 —— 把直播间工具的抽屉标题也纳进来（它们同样是"卡片标题"）
    var nodes = root.querySelectorAll(
      ".fans-panel__card-title, .popup-panel__card-title, .exupdate-panel__card-title, .miuix-card__title, .livetool__cell_title > span[id$='__title']"
    );

    /* ExPanel.css：给"卡片头右槽"一个统一类名，不新增视觉，只做别名收敛。
       新代码用 .miuix-card__aside，旧内联样式可逐个退场（本批不动包级 CSS/内联，只提供归口）。 */
    .miuix-card__aside,
    .fans-panel__badge-tag {
        font-size: 11px !important;
        font-weight: 600 !important;
        color: #64748b !important;
        background: var(--miuix-item-bg) !important;
        border: var(--miuix-item-border) !important;
        border-radius: 7px !important;
        padding: 2px 8px !important;
    }

> 不建议把 `.livetool__cell` 硬改成 `.miuix-card` —— 会动 6 个直播工具模块的 DOM 与既有 CSS 断言，超出"只审不改"的边界，留作后续独立批次。

---

### I-15【P2】关闭出口没真正收敛：点续牌图标关闭后蓝色指示条常亮

**位置**：`FansContinue.js:40-58`（自带 toggle，关闭分支无回调）、对比 `Sign.js:32-37`（有回调）、`ExPanel.js:524-534`（`updateDockActiveIndicator`）

**现状**

    // FansContinue.js:44-48 —— 关闭分支只写了 display
    if (panel.style.display === "block" || panel.style.display === "flex") {
      panel.style.setProperty("display", "none", "important");
    }                                      // ← 没有 updateDockActiveIndicator()

**为什么是问题**：`updateDockActiveIndicator()` 只在 `openMiuixPanelCentered`、`closeAllThirdLevel`、`closeAllMenus`、面板 × 与 Sign.js:37 被调用。续牌走自己的图标关闭时**没有任何一处**复位 → 磁贴下 24×4 蓝条继续亮，用户以为面板还开着。下一次别的打开/关闭才"顺带"修正。

**修复**（新增统一关闭助手，先把 shell 收敛；包内调用点留给后续批次）

    /* 三级面板统一关闭出口：现在 inline display:none 散落在 13 处（ExPanel.js 5 / common.js 2 /
     * FansContinue / Sign / PopupPlayer / DanmakuHistory ...），谁漏调 updateDockActiveIndicator()
     * 谁就让蓝条常亮。先从外壳收敛：× / closeAllMenus / closeAllThirdLevel 三处共用。
     * 返回值 = 这次是否真的关掉了一个"开着"的面板。 */
    function ExPanel_hidePanel(panel) {
      if (!panel || !panel.style) return false;
      var wasShown = ExPanel_panelIsShown(panel);
      panel.style.removeProperty("display");
      panel.style.setProperty("display", "none", "important");
      panel.classList.remove("miuix-modal-in");
      if (wasShown && typeof updateDockActiveIndicator === "function") updateDockActiveIndicator();
      return wasShown;
    }

    // 三处调用点替换（ExPanel.js:41-43、646-655、668-677）：
    //   ExPanel_closeAllThirdLevel():  ExPanel_hidePanel(p);
    //   ensureMiuixPanelHeader 的 ×:    ExPanel_hidePanel(el);
    //   openMiuixPanelCentered 互斥:    if (p !== panel) ExPanel_hidePanel(p);

    // 顺带在 updateDockActiveIndicator() 里同步无障碍状态：
    btn.classList.toggle("is-active", on);
    btn.classList.toggle("ex-dock-active", on);
    if (btn.hasAttribute("role")) btn.setAttribute("aria-expanded", on ? "true" : "false");

**Lead #7 的答案：值不值得全量收敛成 closePanel(el)？** 值，但**分两步**：

- 值得（有数字）：`grep -rn 'setProperty("display", "none"' src/` 命中 **13 处**，其中 9 处是"关一个面板"，而这 9 处里已经有 1 处（FansContinue.js:48）实证漏了指示器复位；`updateDockActiveIndicator` 的调用点与关闭点根本不是一一对应。
- 现在不全量做：剩下 4 处分散在 Sign / FansContinue / PopupPlayer / DanmakuHistory，改它们要动 `src/packages/*` 且各带副作用（Sign 复位按钮文案、PopupPlayer 停 ESC 状态、DanmakuHistory 有日期游标），属于功能改动而非 UI 归口，应单独一批带回归。**先收敛外壳 3 处 + 新增助手**。

---

### I-16【P2】存储写失败静默，且会被误报成"JSON格式错误"

**位置**：`Enter.js:53-77`（导入回调的 try/catch）与 `Enter.js:163-166`（`saveData_Enter` 裸 `localStorage.setItem`）；同类裸调用 20+ 处（BarrageLoop.js:272、DanmakuTail.js:103、ExpandTool_*.js 等）

**现状**

    // Enter.js:53-77
    try {
      let parsed = JSON.parse(data || "[]");
      ...
      enterWordList = list;
      refreshEnterSelectOptions();
      saveData_Enter();                       // ← 这里抛 QuotaExceededError / SecurityError
      showMessage("【进场欢迎】导入完毕", "success");
    } catch (e) {
      showMessage("【进场欢迎】JSON格式错误", "error");   // ← 把所有异常都当成 JSON 错
    }

    // Enter.js:163-166
    function saveData_Enter() {
      let data = enterWordList;
      localStorage.setItem("ExSave_Enter", JSON.stringify(data));   // 无 try/catch
    }

**为什么是问题**：无痕/隐私模式、配额满、`localStorage` 被策略禁用时 `setItem` 会抛。此时 welcome 词列表**已经换成新数据**（`enterWordList = list` 已执行、下拉已刷新），存储却没落盘 → 刷新后回滚，而提示是"JSON格式错误"，用户会反复检查自己的 JSON。同类静默失败覆盖 20+ 个 `saveData_*`，用户感受是"设置老是记不住"。

**修复**（不新增存储键，只包一层）

    /* 统一存储写入：失败必须让用户知道，并且不能把存储异常伪装成语法异常。 */
    function ExStore_safeWrite(scope, storageKey, value) {
      try {
        localStorage.setItem(storageKey, value);
        return true;
      } catch (e) {
        var hint = (e && e.name === "QuotaExceededError")
          ? "浏览器存储空间已满"
          : "浏览器禁止本站写入本地存储（无痕模式 / 隐私策略）";
        if (typeof ExGuard_warn === "function") ExGuard_warn(scope, "保存失败：" + hint, e);
        if (typeof showMessage === "function") showMessage("【" + scope + "】设置没保存成功 · " + hint, "error");
        return false;
      }
    }

    // 导入回调里把两类异常分开（示例 = Enter.js，其余 saveData_* 同构）：
    var parsed;
    try { parsed = JSON.parse(data || "[]"); }
    catch (e) { showMessage("【进场欢迎】JSON格式错误", "error"); return; }
    ...
    if (!ExStore_safeWrite("进场欢迎", "ExSave_Enter", JSON.stringify(enterWordList))) return;
    showMessage("【进场欢迎】导入完毕", "success");

---

### I-17【P2】Dock 从浮动宿主归位后残留 position:fixed 内联样式

**位置**：`ExPanel.js:374-386`（`ExPanel_restoreToGiftBar`）对比 `ExPanel.js:281-299`（`ExPanel_healDock` 的归位分支）

**现状**

    // 374-386：只摘 class，不清内联样式
    panel.classList.remove("ex-panel--floating");

    // 285-290：同文件的自愈路径记得清
    node.classList.remove("ex-panel--floating");
    node.style.removeProperty("position");
    node.style.removeProperty("left");
    node.style.removeProperty("right");
    node.style.removeProperty("top");

**为什么是问题**：`.ex-panel { position: absolute }`（ExPanel.css:32）**没有 !important**，而 `ExPanel_attachToFloatingHost`（336-359 行）写了 `position:fixed; left:Npx; right:auto; bottom:Npx` 的内联样式。归位后这些内联值全部保留 → 工具条仍以 fixed 停在"浮动时算出来的 left"，与礼物流水条不再对齐（全屏进出、礼物栏隐藏后恢复这两个高频场景都会触发）。同文件两条归位路径行为不一致，本身就是缺陷证据。

**修复**

    function ExPanel_restoreToGiftBar() {
      const panel = document.querySelector(".ex-panel");
      const anchor = ExPanel_getGiftBarAnchor();
      if (!panel || !anchor || !panel.classList.contains("ex-panel--floating")) {
        return;
      }
      if (ExPanel_anchorNextSibling && ExPanel_anchorNextSibling.parentNode === anchor) {
        anchor.insertBefore(panel, ExPanel_anchorNextSibling);
      } else {
        anchor.insertBefore(panel, anchor.childNodes[0]);
      }
      panel.classList.remove("ex-panel--floating");
      // 浮动期写进去的固定定位必须一并清掉，否则 CSS 的 position:absolute 压不过内联 fixed
      panel.style.removeProperty("position");
      panel.style.removeProperty("left");
      panel.style.removeProperty("right");
      panel.style.removeProperty("top");
    }

---

## 5. P3

### I-18【P3】calc(var(--miuix-modal-height) - 52px) 的 52 与实测 header 51px 差 1

**核对结论（回应"另一个队友实测 header=51px / body=317px"）**：算得出来 —— `.miuix-modal__header` 的 padding `12px 16px`（ExPanel.css:285）+ 内容高度由最高的 `.miuix-modal__close` **26px**（314-317）决定 + `border-bottom: 1px`（293）= **12+26+12+1 = 51px**。所以：

- 可用给 body = 370 − 51 = **319px**；CSS 上限写 370 − 52 = **318px** → **1px 富余被浪费**（不可见，但说明 52 是拍脑袋的）。
- 标题换行时**不会裁切**：`.miuix-modal__body` 是 `flex: 1 1 auto; min-height: 0`，header 变高时 body 被 flex 自动压回容器内；`max-height` 只是提前 1px 生效。
- 真正的债：token 一改、`.ex-title-ico` 尺寸一改（新增 Phosphor 层是 19px，ExPanel.css:2872-2876）、或标题字号一改，52 就彻底失去意义，而且没人记得同步。

**修复**（删掉魔法数，交给 flex）

    .miuix-modal__body {
        display: block !important;
        flex: 1 1 auto !important;
        min-height: 0 !important;     /* ← 关键：没有它，flex 子项不会收缩，反而会溢出 */
        /* max-height 交给 flex 容器自己算，不再写 calc(高度 - 52px) 这种魔法数 */
        width: 100% !important;
        overflow-y: auto !important;
        overflow-y: overlay !important;
        overflow-x: hidden !important;
        box-sizing: border-box !important;
        padding: 10px 0 16px 0 !important;
    }

> 验证：`.extool`（21 个控件，内容最长）与 `.danmaku-history-panel`（标题含昵称，标题最长）开起来确认（a）底部主按钮仍粘底可点（ExUI_stickActionBar，common.js:592-606），（b）body 内滚动条能到最后一项。未新增 `370px` 字面量。

### I-19【P3】清单里的死条目

- `ExPanel.js:6` 的 `.fans-panel`：`grep -rn 'class="fans-panel"' src/` 零命中（只有 `fans-panel__card` 等 BEM 子元素，不会匹配 `.fans-panel`）→ 白跑一次 `querySelectorAll`，也让"8 个三级面板"这句话对不上（现为 10 项）。
- `ExPanel.js:445` / `510`、`ExIcons.js:61` 的 `exlottery-icon`：只命中这三处定义，**没有一处插入**（Lottery.js:33 插的是 `.ex-lottery`）。
- `ExPanel.js:513` 的 `danmaku-history`：磁贴不存在（弹幕历史面板由聊天卡片上的 `.dyex-danmaku-history` 按钮打开，DanmakuHistory.js:174），指示器映射永不命中。

修复：随 I-07 一起清（清单同源化时删 `.fans-panel`，另两条留给对应包主人确认后删）。

### I-20【P3】精灵球可访问名与更新红点对 AT 不可见

`ExIcon.js:23`：`<a title="DouyuEx ver." + curVersion>` —— 无 href 的 a 不聚焦、title 只在悬停出现；`Update.js:31-38` 的红点是 8×8 的 `<i class="ex-panel__tip">` + `style.display = block/none`（ExPanel.css:200-210），没有文字、没有 `role="status"`。

    // ExIcon.js 的 a 上补 aria-label + role（配合 I-01 的 tabindex 方案）
    a.setAttribute("role", "button");
    a.setAttribute("tabindex", "0");
    a.setAttribute("aria-label", "DouyuEx 工具条开关，当前版本 " + curVersion);
    a.setAttribute("aria-expanded", "false");   // 由 openExPanel / hideExPanel 同步

    // Update_refreshTip()（Update.js:31-38）末尾：让红点可被读屏感知
    tip.setAttribute("role", "status");
    tip.setAttribute("aria-label", show ? ("有新版本 " + lastestVersion + " 可更新") : "");

### I-21【P3】freetimed 未走 ExSave_ 前缀

`ExpandTool_TabSwitch.js:77`：`localStorage.setItem("freetimed", "1")` —— 违反"新存储键必须 `ExSave_` 前缀"（AGENTS.md 四）。若是历史遗留且需兼容老数据，至少"写新键 + 读时兼容旧键"。非交互问题，仅作红线提示。

### I-22【P3】弹幕小助手标题双写

`BarrageLoop.js:116` 建面板时 `ensureMiuixPanelHeader(a, "弹幕小助手")`；Dock 磁贴的 `title` 与 `mapping` 键（ExPanel.js:443）都是"弹幕发送小助手"。首帧（面板创建后、第一次经 Dock 打开前）头图标查不到 `EX_ICO_TITLE_MAP["弹幕小助手"]`（ExIcons.js:67-76 只有"弹幕发送小助手"）→ 那一帧没有头图标；经 Dock 打开后标题被 `showExRightPanel → ensureMiuixPanelHeader` 改写成正确值并补图标。用户基本看不到，但"用标题字符串当索引键"本身脆弱。

修复：`EX_ICO_TITLE_MAP` 补一条别名，或把标题统一成"弹幕发送小助手"（改 BarrageLoop.js:116 一处更彻底）。

---

## 6. 历史禁忌核对（自动关闭）

- `git log`：`a5098b0`（2026-11-01 02:20，feat：点菜单外面就关，版本号未变）→ `828cef7`（2026-11-01 04:28，release 2026.11.01.01）。两条提交说明一致：**点击菜单外部自动关闭**，判定挂在 `document` 捕获阶段的 `mousedown`，只认左键，按下在里抬手在外不误判。
- 代码内注释与之一致：ExPanel.js:8-13（用户要求 2026-11-01）、ExPanel.js:66-67（"仅『点击精灵球』展开、『点击 ×』或『点菜单外面』关闭，不悬停自动打开、不因鼠标移出而自动关闭"）。
- **本审计不含任何"回退 / 鼠标移开自动关闭 / 新增悬停自动收起"的建议。** 涉及关闭模型的建议只有三条，全部是**在已落地逻辑上修缺陷**：
  1. I-06 把 `.postbird-box-container` 补进"菜单面"清单（否则点弹框内部会误收）——把既有"点外面才收"的语义补全。
  2. I-08 用 `window.blur` 给 iframe 补同一个语义（跨域 iframe 捕获不到 mousedown）。
  3. I-02 把"点击=只开不关"提升成外壳契约 —— **不动关闭出口**（仍是 × / ESC / 点外面），只让同一手势不再自相矛盾；与 PopupPlayer.js:41-47 已落地的契约一致，属于统一，不是新增。
- `docs/MAINTENANCE.md:113` 描述的"18px 隐形连桥 + 400ms 防抖"在代码里不存在；**不建议按手册补这条桥**：连桥会把因误滑而自动打开面板的热区从 56px 扩到 74px，与"减少误开"目标相反。I-10 建议的 180ms 防抖只作用于"切换"。

---

## 7. 与硬约束的相容性

| 约束（AGENTS.md） | 是否触碰 | 说明 |
|---|---|---|
| `380px` / `370px` 全产物各只出现一次 | **未新增** | I-12 补丁全部读 CSS/实测；I-18 只删 `calc(... - 52px)`，不写 `370px` |
| 包级 CSS 不得定义 8 个三级面板类名 | 未触碰 | 所有 CSS 补丁都落在 `src/packages/ExPanel/ExPanel.css`（第 9 节之后追加 9.x / 9.y） |
| 所有 DOM 操作判空兜底 | 遵守 | 补丁里 `querySelector` / `closest` / `getBoundingClientRect` 全部先判空早返回；`getComputedStyle` 包 try/catch |
| 新存储键须 `ExSave_` 前缀 | 未新增键 | I-16 只加写入包装；I-21 是既有违规提示 |
| 新包须在 `src/main.js` 的 `initPkg()` 接线 | 未新增包 | 补丁都在既有 ExPanel.js / ExIcons.js / 各包内 |
| 零混淆契约（禁单字母变量） | 遵守 | 补丁变量一律语义化（`dockWrap` / `tile` / `panelWidth` / `focusKey` …） |

**建议的验收命令（改完后跑）**

    # 1) 两个字面量仍然各一次
    node -e "const fs=require('fs');const s=fs.readFileSync('DouyuEx_RL.user.js','utf8');for(const k of ['380px','370px'])console.log(k,(s.match(new RegExp(k,'g'))||[]).length)"
    # 2) 面板清单同源（应只剩 1 处 const 定义 + 0 处手抄串）
    grep -c 'const EX_THIRD_LEVEL_PANELS' src/packages/ExPanel/ExPanel.js
    grep -n 'ChatToolBar-DanmakuTail-Panel' src/packages/ExPanel/ExPanel.js
    # 3) 「点外面就关」护栏
    node tests/test_menu_outside_close.js
    # 4) 全量门禁
    npm run build && npm test

---

## 8. 未覆盖 / 需真机确认

1. **触屏实测**（I-01/I-02）：需用 `browser-skill` 在真机 Edge 上以触屏或 `Emulation.setTouchEmulationEnabled` 复现"tap 精灵球 → 点磁贴 → 面板闪一下就没了"，录 3 秒作为验收证据。本次只做代码推演（事件序列是规范行为，不是猜测）。
2. **iframe blur 兜底**（I-08）：`document.activeElement` 指向 iframe 的时机各内核不同，需真机验证；拿不到就退化为无条件 `window.blur` 收敛（更激进，需用户拍板）。
3. **body 去掉 max-height 后的最长内容**（I-18）：需在 `.extool`（21 控件）与 `.danmaku-history-panel` 上目测 + 截图。
4. **`thirdLevelOpened` 副作用面**：`openMiuixPanelCentered` 每次打开都 dispatch 该事件（ExPanel.js:718-720），续牌 / 版本更新靠它刷新；I-02 的"吞点击"补丁不会影响这条派发（hover 已先行派发过一次），仍建议回归"悬停打开续牌面板后资产是否为实时值"。
