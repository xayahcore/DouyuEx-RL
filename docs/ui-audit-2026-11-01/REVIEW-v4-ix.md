# REVIEW-v4-ix —— findings-interaction.md（I-01…I-22）在 HEAD 上的复核

> 复核员：ix-auditor（task-2） · 复核时间：2026-11-01 18:xx
> **基线**：`DYEXRL-NEXT @ 9871bfa`（父 = 828cef7）；工作区唯一改动是 docs/ui-audit-2026-11-01/ 全套新增，src/ 干净。
> **旧文基线**：findings-interaction.md 自称"main @ 828cef7 + 工作区未提交的 Phosphor 图标层"——那正是 9871bfa 的内容，所以**旧文指出的问题大多仍指向 HEAD 的真实代码**；但旧文给的"修复"全是提案，代码里一行没有（见 §0）。
> **只读声明**：未修改 src/、tests/、tools/、产物、版本号；未执行 build / npm test。
> **行号口径**：全部按 HEAD 工作区取。⚠ 旧文 ExPanel.css 的行号普遍比 HEAD **小 2**（例：`.sign-checkbox` 的 `outline:none` 旧文记 731，HEAD 是 733；`.miuix-modal__close` 旧文 316 区间记 314，HEAD 是 316）。ExPanel.js 的行号则与旧文一致。
> **路径口径**：证据列 `path:line` 一律相对仓库根，可直接 grep。

---

## 0. 先确认：旧文的"修法"有没有落地

| 旧文提案函数 | src 命中文件数 |
|---|---|
| `ExPanel_bindDockKeyboard` / `ExPanel_bindEscClose` / `ExPanel_bindIframeBlurClose` / `ExPanel_openPanelByHover` | 0 / 0 / 0 / 0 |
| `ExPanel_hidePanel` / `ExPanel_measurePanelWidth` / `ExStore_safeWrite` | 0 / 0 / 0 |
| `ExPanel_nameBareSwitches` / `PopupPlayer_captureFocusKey` | 0 / 0 |

判据：`grep -rl <函数名> src` 全部返回空。**结论：I-01…I-22 是待施工清单，不是已修回归项。**（上一轮把整套改版做进 58b178a 又从 NEXT 回退，与本文件这 22 条无关——它们从未进入 HEAD。）

---

## 1. 主表（22 条，逐条按 HEAD 复核）

| ID | 旧定级 | HEAD 现况 | 证据（file:line） | 一句话处置 | 施工成本 |
|---|---|---|---|---|---|
| I-01 | P0 | **仍存在**（入口数口径要改：9 个不是 10 个） | `src/packages/ExPanel/ExPanel.js:411`（Dock 外壳只有 1 个原生 button=×）、`:481-486`（磁贴唯一交互绑 mouseenter）、`src/packages/Sign/Sign.js:14-18`、`src/packages/FansContinue/FansContinue.js:28-34`、`src/packages/ExpandTool/ExpandTool.js:273-280`、`src/packages/LiveTool/LiveTool.js:110-117`、`src/packages/BarrageLoop/BarrageLoop.js:120-126`、`src/packages/Lottery/Lottery.js:33-37`、`src/packages/PopupPlayer/PopupPlayer.js:26-32`、`src/packages/Update/Update.js:100-108`、`src/packages/ExIcon/ExIcon.js:21-23`（精灵球 a 无 href）、`src/common.js:632-644`（click 的 toggle 分支） | 入口补 role/tabindex/aria-label + Enter/Space 转发 `btn.click()`；触屏 tap 序列另需 I-02 的"已展开时吞点击" | M（shell 一处，8 包不动） |
| I-02 | P1 | **仍存在**（6 关 / 2 留，与旧文一致） | hover 传 forceOpen=true：`src/packages/ExPanel/ExPanel.js:481-486`；click 不传 → toggle：`src/common.js:635-641`；toggle 的 6 个：`Sign.js:32-44`、`FansContinue.js:47-57`、`ExpandTool.js:286-289`、`LiveTool.js:127-129`、`BarrageLoop.js:328-330`、`Lottery.js:97-99`；"只开不关"的 2 个：`PopupPlayer.js:38-59`（注释 46-49 自证）、`Update.js:121-124`（判据写 `display==="block"`，而开面板写的是 flex） | 把"点击=只开不关"提升成外壳契约（捕获阶段吞掉 e.detail>0 那一次），顺带修掉触屏净效果 0 | S |
| I-03 | P1 | **仍存在**（8 面板里 1 个有 ESC） | 外壳只有 × 的 onclick、无 keydown：`ExPanel.js:646-658`；全项目 Escape 监听 3 处：`src/packages/PopupPlayer/PopupPlayer.js:354-364`、`src/packages/ExpandTool/ExpandTool_GiftPicker.js:300-305`、`src/packages/VideoTools/VideoToolbarMenu/VideoToolbarMenu.js:148-153`；`grep -n keydown src/packages/ExPanel/ExPanel.js` 零命中 | 外壳绑一次 document keydown：Escape + 非全屏 + 无 defaultPrevented → `ExPanel_closeAllMenus()` | S |
| I-04 | P1 | **仍存在**（16 处 outline:none / 2 处 :focus-visible，行号 +2） | `src/packages/ExPanel/ExPanel.css:733`（sign-checkbox）、`:900`（按钮组）、全文件 outline:none !important 16 处：603/619/733/900/941/961/997/1208/1226/1393/1559/1592/1698/1753/2048/2635；`:focus-visible` 仅 2 处：861（分段控件）、2726（同屏结果行） | 补一段 `:focus-visible` 兜底（2px var(--miuix-blue) + offset 2px），开关再加 box-shadow 光晕 | S |
| I-05 | P1 | **已变化：旧文 6 个 → HEAD 实测 8 个** | 无名字的 8 个：`LiveTool/Enter/Enter.js:20`、`Gift/Gift.js:20`、`Mute/Mute.js:27`、`Reply/Reply.js:22`、`Vote/Vote.js:25`（这 5 个是"标题+开关"结构，input 裸放）＋ `ExpandTool/ExpandTool.js:125 / 159 / 173`（这三行的父节点是 `<div class="sign-option-item">`：119/153/167，**不是 label**）；对照：`Vote.js:23` 的 vote__repeat 包在 label 里、`Sign.js:63-69` / `ExpandTool.js:67-73` 也是 label；`grep -rn 'for="' src/packages` 0 命中 | 外壳兜底命名（取最近 `.livetool__cell_title span[id$="__title"]` 或 `.sign-option-title` 文本 + " 开关"），一个函数覆盖 8 个 | S |
| I-06 | P1 | **仍存在**（且旧文没注意到"子菜单层"逃生门是空的） | 菜单面清单无弹框：`ExPanel.js:14-23`；判定链：`:169-175`；弹框是 100vw×100vh 全屏遮罩：`ExPanel.css:1455-1469`（z-index 100060）、`src/require/PostBirdAlertBox/postbirdAlertBox.js:8`（`containerClass="postbird-box-container active"`，`document.body.appendChild`）；调用点 6 处（面板内 4）：`Enter.js:54`、`Gift.js:130`、`Mute.js:76`、`Reply.js:57`、`Refresh_Barrage.js:54`、`Refresh_BarrageFrame.js:92`。**新发现**：`ExPanel_markMenuLayer`（`ExPanel.js:116-120`）在生产代码里零调用，仅测试注入（`tests/test_menu_outside_close.js:51`）→ `[data-ex-menu-layer]` 这条逃生门等于没接线 | 把 `.postbird-box-container` 补进 EX_MENU_SURFACE_EXTRA（一行）；并让 PostbirdAlertBox 自己在创建时调 `ExPanel_markMenuLayer` | S |
| I-07 | P1 | **仍存在**（两份清单仍在漂移） | 收敛清单：`ExPanel.js:6`（无小尾巴）；互斥清单手抄：`ExPanel.js:668-670`（有小尾巴）；面板本体：`src/packages/DanmakuTail/DanmakuTail.js:15` | 668-670 改为引用 `EX_THIRD_LEVEL_PANELS`，清单补 `.ChatToolBar-DanmakuTail-Panel`（顺手删死条目 `.fans-panel`，见 I-19） | S |
| I-08 | P1 | **仍存在**（5 个跨域 iframe） | 监听只在父文档：`ExPanel.js:177-182`；iframe：`src/packages/AccountList/AccountList.js:457-467`（passport / yuba / msg / v.douyu / cz 五个跨域） | `window.blur` + `document.activeElement.tagName==="IFRAME"` 兜底收敛（拿不到就退化为无条件 blur，需产品拍板） | S |
| I-09 | P2 | **仍存在**（160ms 硬切观感可忽略；hover 不取消计时器是真坑） | `ExPanel.js:554-565`（setTimeout 160）、`ExPanel.css:60-63`（0.2s + pointer-events:none）、`ExPanel.js:541-546`（pendingClose 已接管"收起中重开"）、`:481-486`（hover 直接 showExRightPanel，不经 openExPanel → 不清 miuix-dock-out） | 收场改 animationend + 240ms 兜底；mouseenter 开头若 `.miuix-dock-out` 先 `openExPanel()` | S |
| I-10 | P2 | **仍存在**（无防抖；手册仍在描述不存在的机制） | `ExPanel.js:481-490`（每次 mouseenter 立刻切面板）、`ExPanel.css:114-123`（gap 10px）、`ExPanel.css:125-138`（56px 磁贴）；手册：`docs/MAINTENANCE.md:113` 写"18px 隐形连桥 + 400ms 防抖"，`grep -rn 'bridge\|连桥' src` 零命中 | 只给"切换面板"加 180ms 防抖（首个 mouseenter 仍零延迟）；不补连桥 | S |
| I-11 | P2 | **仍存在**（并多出一条 700ms 重画路径） | 整表重画：`src/packages/PopupPlayer/PopupPlayer.js:216`（`roomsEl.innerHTML = list.map(...)`）、chip 点击后重画：`:274-289`、移除房间后重画：`:291-298`、多屏状态变化 700ms 后重画：`:138-146`（只跳过 range 焦点：`:143-144`）；只保滚动不保焦点：`:215 / :257` | 重画前记 `{rid,key}`，重画后 `focus({preventScroll:true})` 还回去；700ms 那条也复用同一对函数 | M |
| I-12 | P2 | **仍存在**（3 份宽度真源） | `ExPanel.js:690-692`（`var panelWidth = 380` + 用它算居中）、`:342` 与 `:350`（`|| 360` 兜底）、`ExPanel.css:7`（`--miuix-modal-width: 380px`）；产物仍是 `380px`/`370px` 各 1 次（`node -e` 复核） | 宽度只读实测 + token 兜底，量不到就不写 left；删 `panel.style.width` 死写 | M |
| I-13 | P2 | **已变化：抽屉标题 6 个 → HEAD 5 个**；尺寸全部不变 | 26×26：`ExPanel.css:76-99`（Dock ×）、`:316-337`（面板 ×）；38×22 开关：`:721-742`；抽屉标题无 padding、13px/1.3≈17px：`:468-478` + `:485-487`；小胶囊 ≈19px：`:519-533`；翻页 24×24：`:2036-2039`；抽屉只有 5 个：Enter/Gift/Mute/Reply/Vote 各 1 个 `.livetool__cell`（`grep -c livetool__cell`=1×5） | 只补 ::after 热区（44×44 / 开关 ±11px / 标题 padding+负 margin），视觉尺寸一个不动 | S |
| I-14 | P2 | **已变化：图标层覆盖 4/8 → HEAD 6/8，且"直播间工具没图标"已不成立；反过来同屏/版本更新现在没图标** | 新选择器：`src/packages/ExIcon/ExIcons.js:104` = `.ui-card__title, .miuix-card__title, .livetool__cell_title, .fans-panel__card-title`；其中 `.ui-card__title`、`.miuix-card__title` 在 src **无任何 DOM**（只在 `ExPanel.css:450` 有个样式）→ 实际生效的两个 = `.livetool__cell_title`（`LiveTool/*/*.js:13/15/19/22` 共 5 处）+ `.fans-panel__card-title`（Sign/ExpandTool/BarrageLoop/FansContinue/Lottery）；被踢掉的：`.popup-panel__card-title`（`PopupPlayer.js:72/84`）、`.exupdate-panel__card-title`（`Update.js:302`）→ 这两面板 0 图标 | 把两个被踢掉的类名加回选择器（或把 8 面板的卡片头收敛成 `.miuix-card__title`），再把两个死选择器删掉 | M |
| I-15 | P2 | **仍存在**（续牌关闭分支仍不复位蓝条） | 关闭分支只写 display：`src/packages/FansContinue/FansContinue.js:47-57`；对照有回调的：`Sign.js:33-37`；复位函数本体：`ExPanel.js:524-534`（映射表 `:503-514`） | 外壳加 `ExPanel_hidePanel(el)` 统一出口（return 是否真关），续牌/签到/PopupPlayer 各包改调它 | M |
| I-16 | P2 | **仍存在**（导入失败仍报"JSON格式错误"） | `src/packages/LiveTool/Enter/Enter.js:57-76`（try 58-73、catch 73-75 一律报 JSON 错；`saveData_Enter()` 在 71 行）、`:163-166`（`localStorage.setItem` 裸调）；同类裸调 20+ 处（如 `BarrageLoop.js`、`DanmakuTail.js`、`ExpandTool_*`） | 加 `ExStore_safeWrite(scope,key,val)` 包装（QuotaExceeded/隐私模式给不同提示），JSON.parse 单独 try | M |
| I-17 | P2 | **仍存在**（两条归位路径行为不一致） | 归位只摘 class：`ExPanel.js:374-386`；自愈路径会清内联：`:281-299`（286-289）；内联 fixed 压过 CSS：`ExPanel.css:31-32`（position:absolute 无 !important）vs `:109-112` | `ExPanel_restoreToGiftBar` 末尾补 4 行 removeProperty(position/left/right/top) | S |
| I-18 | P3 | **仍存在**（52 vs 实测 51，仍差 1） | `ExPanel.css:357`（`max-height: calc(var(--miuix-modal-height) - 52px)`）；header 高度 = 12+26+12+1：`:283-302`（padding 12px 16px）+ `:316-337`（close 26px）+ `:295`（1px border） | 删 `calc(... - 52px)` 交给 flex（`.miuix-modal__body` 已有 `flex:1 1 auto; min-height:0`：`:353-356`） | S |
| I-19 | P3 | **仍存在**（3 条死条目全在） | `.fans-panel`：`ExPanel.js:6` + `:669`，`grep -rc 'class="fans-panel"' src` = 0 文件；`exlottery-icon`：`ExPanel.js:445` + `:510` + `ExIcons.js:64`，无任何插入点（Lottery 插的是 `.ex-lottery`：`Lottery.js:33`）；`danmaku-history`：`ExPanel.js:513`，磁贴不存在 | 随 I-07 同源化时删 `.fans-panel`；另两条各自包主人确认后删 | S |
| I-20 | P3 | **仍存在**（精灵球只有 title；红点无 role） | `src/packages/ExIcon/ExIcon.js:21-23`（`<div class="ex-icon"><a title="DouyuEx ver.X">`，无 href/role/tabindex/aria-label）；红点只切 display：`src/packages/Update/Update.js:32-38`；红点样式 8×8：`ExPanel.css:202-210` | 精灵球补 role/tabindex/aria-label(+aria-expanded)；红点补 `role="status"` + `aria-label` | S |
| I-21 | P3 | **仍存在**（红线提示项） | `src/packages/ExpandTool/ExpandTool_TabSwitch.js:77`：`localStorage.setItem("freetimed", "1")` | 写新键 `ExSave_freetimed` + 读时兼容旧键（或登记为例外并注明） | S |
| I-22 | P3 | **仍存在**（标题双写，图标映射只认后者） | 建面板写"弹幕小助手"：`src/packages/BarrageLoop/BarrageLoop.js:115-116`；磁贴 title/映射键写"弹幕发送小助手"：`ExPanel.js:443`；图标表只有后者：`ExIcons.js:70-79`（`:75`） | `EX_ICO_TITLE_MAP` 加别名"弹幕小助手"，或把 `BarrageLoop.js:116` 改成"弹幕发送小助手"（一处更彻底） | S |

**合计（22 条）**：**仍存在 19 条**、**已变化 3 条**（I-05 开关数 6→8；I-13 抽屉 6→5；I-14 图标覆盖 4/8→6/8 且方向反转）、**已消失 0 条**。另：I-01 的"10 个入口"本身是旧文的算术错误（实为 9），问题本身仍成立。

---

## 2. 自己数出来的数字（不是抄旧文）

### 2.1 Dock 磁贴

| 项 | HEAD 实测 | 判据 |
|---|---|---|
| 磁贴数 | **8** | 8 个包各 `insertBefore(a, .ex-panel__wrap.childNodes[0])`：Sign.js:17-18 / FansContinue.js:33-34 / ExpandTool.js:279-280 / LiveTool.js:115-117 / BarrageLoop.js:124-126 / Lottery.js:36-37 / PopupPlayer.js:31-32 / Update.js:107-108 |
| 第 9 个插入点 | 存在但**永久短路** | `src/packages/Monitor/Monitor.js:17`（`MONITOR_ENTRY_ENABLED=false`）+ `:21-24` 早退；`ExPanel.js:190` 注释里"九个按钮是九个包"因此与实际不符（实际渲染 8 个） |
| 每枚的 role | **0 / 8** | `grep -rn role= src` 只命中 VideoTools 两个文件（`PictureInPictureControl.js` 的 `role="menu"`、`VideoToolbarMenu.js` 的 `role="menu/menuitem"`）；`.ex-panel__wrap > div` 无任何 role |
| 每枚的 tabindex | **0 / 8** | `grep -rn tabindex src` 只命中 5 个 `.sign-checkbox` input（Enter:20 / Gift:20 / Mute:27 / Reply:22 / Vote:25） |
| 每枚的 aria-label | **0 / 8** | `grep -rn aria-label src` 只命中：ExPanel.js:411（Dock ×）、ExPanel.js:600（面板 ×）、LastLiveTime.js:202、PopupPlayer.js:226（音量 range）、VideoTools 若干；磁贴只靠内部 `a[title]`（悬停 tooltip，不是可访问名） |
| 9871bfa 是否补过 | **没补** | `git show 9871bfa -- src/packages/ExPanel/ExPanel.js \| grep -Ei 'role\|tabindex\|aria'` 无输出；该提交只做 SVG 换装（ExPanel.js:457-476） |
| 可聚焦入口总数 | **0**（精灵球 1 + 磁贴 8） | 精灵球是 `<a>` 无 href（ExIcon.js:23）→ 不入 Tab 序；Dock 内唯一可聚焦 = `.ex-panel__close`（ExPanel.js:411，且 Dock 默认 `display:none`：ExPanel.css:48） |

### 2.2 ESC 键处理的位置（主文档 3 处：1 个面板 + 2 个子菜单）

| 位置 | 覆盖谁 | 行号 |
|---|---|---|
| PopupPlayer.js | 只关 `.popup-player-panel` 自己 | `PopupPlayer.js:351-365`（`:359` 判 display≠flex 直接 return） |
| ExpandTool_GiftPicker.js | 只关礼物选择器 | `ExpandTool_GiftPicker.js:300-305` |
| VideoToolbarMenu.js | 视频工具条菜单 + 筛选面板 | `VideoToolbarMenu.js:148-153`（监听在 `:145`） |
| **ExPanel.js（外壳）** | **没有** | `grep -n 'keydown\|Escape' src/packages/ExPanel/ExPanel.js` 零命中（另：PiP 独立窗口的 keydown 只处理 Enter，不算 ESC：`PictureInPictureControl.js:1030-1041`） → 签到 / 续牌 / 扩展功能 / 直播间工具 / 弹幕小助手 / 抽奖 / 版本更新 7 个面板 + `.danmaku-history-panel` 的 ESC 均无操作 |

### 2.3 「点菜单外面就关」的实现与缺口

| 项 | 位置 | 判据 |
|---|---|---|
| 绑定 | `ExPanel.js:177-182` | `document.addEventListener("mousedown", handler, true)`，捕获阶段 |
| 判定 | `ExPanel.js:169-175` | 只认左键（`e.button!==0` 返回）、`isInsideMenu` 为假且 `hasOpenMenu` 为真 → `closeAllMenus()` |
| 菜单面 | `ExPanel.js:26-30` | `EX_MENU_SURFACE_EXTRA`（`:14-23`）9 条 + `EX_THIRD_LEVEL_PANELS`（`:6`）10 条 = 19 条选择器；开关白名单 `:34`（`.ex-icon, .ChatToolBar-DanmakuTail`） |
| 缺口 A：弹框 | 缺 `.postbird-box-container` | 该容器 100vw×100vh、z-index 100060（`ExPanel.css:1455-1469`）；实例由 `postbirdAlertBox.js:8` 直接 append 到 body，不带 `data-ex-menu-layer` → 点弹框任意像素 = 点"外面" |
| 缺口 B：iframe | 5 个跨域 iframe | `AccountList.js:457-467`；跨域 iframe 内 mousedown 不进父文档，捕获也拿不到 → 该区域"点外面"0% 生效 |
| 缺口 C：子菜单逃生门形同虚设 | `ExPanel_markMenuLayer`（`ExPanel.js:116-120`）零生产调用 | 只有 `tests/test_menu_outside_close.js:51` 注入过 → 任何未登记进 EXTRA 的新浮层都会重演缺口 A |

### 2.4 开关（Enter/Gift/Mute/Reply/Vote）可访问名

| 项 | HEAD 实测 | 判据 |
|---|---|---|
| `.sign-checkbox` input 总数 | **29** | Enter 1 / Gift 1 / Mute 1 / Reply 1 / Vote 2 / Sign 6 / ExpandTool 11 / BarrageLoop 4 / Lottery 1 / DanmakuTail 1 |
| 缺可访问名的 | **8** | LiveTool 的 5 个（`Enter.js:20`、`Gift.js:20`、`Mute.js:27`、`Reply.js:22`、`Vote.js:25`——父节点是 `.livetool__cell_option` 的 div，不是 label）；ExpandTool 的 3 个（`:125 / :159 / :173`——父节点是 `div.sign-option-item`，见 `:119 / :153 / :167`） |
| 有名字的 | 其余 **21** 个 | 全部包在 `<label>` 里，原生 label 即名字：Sign 6 + ExpandTool 8 + BarrageLoop 4 + Lottery 1 + DanmakuTail 1 + Vote__repeat 1 = 21 |
| `<label for>` | **0 命中** | `grep -rn 'for="' src/packages` 为空 |

### 2.5 定时器 / 重绘 / 380 真源

| 项 | 数值 | 位置 |
|---|---|---|
| Dock 收起落地 | **160ms**（CSS 动画 0.2s → 被砍 40ms，线性进度 0.8，视觉残影 ≈7% 不透明） | `ExPanel.js:559-564` + `ExPanel.css:60-63` |
| Dock 展开 / 面板入场 | 0.28s / **0.18s** | `ExPanel.css:56` / `:272` |
| Dock 自愈巡检 | 3000ms → 连续 20 次无事降 30000ms | `ExPanel.js:202-204`、`:212`、`:227` |
| 同屏面板延迟重画 | **700ms**（只跳过 range 焦点） | `PopupPlayer.js:138-146` |
| innerHTML 重建 | 主房间表 `PopupPlayer.js:216`；恢复行 `:308/313`；清晰度/搜索结果 `:429/486/493`；Dock 图标一次性注入 `ExPanel.js:472` | 焦点无任何保存/还原 |
| 380 真源 | `ExPanel.css:7` token 1 处 + `ExPanel.js:690` 硬编码 1 处（`:692` 用它算居中）+ `ExPanel.js:342/350` `\|\|360` 兜底 2 处 | 产物复核：`380px`×1、`370px`×1（红线仍守住） |

---

## 3. HEAD 实测看板（一屏结论）

| 维度 | HEAD 实测 | 判据一句话 |
|---|---|---|
| 入口可达 | **0 / 9 可聚焦** | 8 磁贴是 div、精灵球是无 href 的 a；Tab 从 body 出发停不到任何入口 |
| 磁贴语义 | **role 0 / tabindex 0 / aria-label 0** | 9871bfa 只换了 SVG，没加无障碍属性 |
| 面板 ESC | **1 / 8**（另有 `.danmaku-history-panel` 也没有） | 只有 PopupPlayer 有 document keydown；外壳零 keydown |
| 点外面关闭 | 19 条菜单面 + 2 类缺口（弹框、iframe）+ 1 条空机制（markMenuLayer） | ExPanel.js:14-34 / 169-182；AccountList.js:457-467；postbirdAlertBox.js:8 |
| 开关名字 | **21 有 / 8 无**（共 29） | LiveTool 5 + ExpandTool 3 裸放 |
| 焦点可见 | 16 处 outline:none / 2 处 :focus-visible | ExPanel.css:733 等 16 处；:861、:2726 |
| 点击语义 | **6 toggle / 2 只开不关** | common.js:635-641 vs PopupPlayer.js:38-59、Update.js:121-124 |
| 蓝条复位 | 续牌关闭分支漏调 | FansContinue.js:47-57 对比 Sign.js:33-37 |
| 卡片图标覆盖 | **6 / 8**（同屏、版本更新缺） | ExIcons.js:104 少了两个 card-title 类名；两个新类名是死选择器 |
| 宽度真源 | 3 份（380 token / 380 硬编码 / 360 兜底） | ExPanel.css:7；ExPanel.js:690、342、350 |
| 存储失败反馈 | 仍静默 + 误报 JSON 错 | Enter.js:57-76（catch 73-75）、163-166 |
| 畸形归位 | fixed 内联残留 | ExPanel.js:374-386 vs 286-289 |

---

## 4. 旧文已过时的段落清单（逐条说明为什么）

| 旧文位置 | 旧文说法 | HEAD 事实 | 处置 |
|---|---|---|---|
| 结论速览 I-01（第 15 行）+ §2 I-01 现状第 1 点 | "页面里共 10 个入口：精灵球 1 + 8 个磁贴" | 1+8=9；**9 个**入口（另有一个 2026-10-27 撤下的 `.ex-monitor`，`Monitor.js:17,21-24` 永久短路） | 数字改用 9；"Tab 可达 = 0"不变 |
| 结论速览 I-05 + §3 I-05 | "6 个开关没有可访问名字"，只列 5 处 | **8 个**：LiveTool 5 + ExpandTool 3（`:125/159/173` 的父节点是 div 不是 label） | 计数与清单都更新；修法要覆盖 8 个 |
| §3 I-14 矩阵 + "图标层只覆盖 4/8" + 修复建议 | 直播间工具 6 张卡片一个图标都没有；建议把 `.livetool__cell_title > span[id$=__title]` 加进选择器 | `.livetool__cell_title` **已经**进了选择器（ExIcons.js:104），直播间工具有图标；反而 `.popup-panel__card-title`、`.exupdate-panel__card-title` 被移除 → 同屏 / 版本更新 0 图标；且 `.ui-card__title`、`.miuix-card__title` 在 src 无 DOM | 覆盖口径改 6/8；修法改成"补回两个 card-title 或统一收敛类名 + 删两个死选择器" |
| §4 I-13 表格第 4 行 | "6 个抽屉标题" | **5 个**：只有 Enter/Gift/Mute/Reply/Vote 建 `.livetool__cell`（Treasure 用 `.livetool__Treasure`、BarrageSpeed 用 `.barrageSpeed`） | 数量改 5；热区补丁不变 |
| I-04 / I-13 / I-18 全部 ExPanel.css 行号 | 731 / 898 / 859 / 2724 / 719 / 314 / 1453 … | HEAD 普遍 **+2**：733 / 900 / 861 / 2726 / 721 / 316 / 1455 | 以本表行号为准 |
| §7 相容性表 + §8 验收命令 第 2 条 | 断言 `const EX_THIRD_LEVEL_PANELS` 唯一、清单同源 | 常量确实只有 1 处（ExPanel.js:6），但 668-670 仍是**手抄串**（含小尾巴）→ 清单并未同源 | 该验收命令通过 ≠ I-07 已修；补一条 `grep -c 'ChatToolBar-DanmakuTail-Panel' ExPanel.js` 应为 1（现状 2） |
| 全文所有"修复/补丁"代码块 | 以补丁形式给出 | src 内 **0 命中**（§0 清单） | 视为待施工设计稿，不要当现状引用 |
| §6 历史禁忌核对 第 3 条 | `[data-ex-menu-layer]` 作为"运行期次级菜单层"兜底 | 该机制无生产调用（仅 tests:51）→ 不能当既有兜底 | 若要靠它兜 PostbirdAlertBox，需先接线 |

---

## 5. 未覆盖 / 需真机确认（沿用旧文口径，未实测）

1. 触屏 tap 序列（I-01/I-02）仍是"代码推演"：本次只读源码，未在 Edge 触屏模拟下复现，结论为静态必然性（规范事件序）。
2. `document.activeElement === IFRAME` 在各内核时机不同（I-08），补丁可行性需真机；退化方案（无条件 blur）会连带切窗口收菜单，需产品拍板。
3. 160ms 硬切（I-09）只做了数学换算，未逐帧比对；按换算观感可忽略。
4. I-14 的 6/8 覆盖是"选择器 × DOM 类名"静态比对，未在真机逐面板数图标；若某面板用组件层重建卡片头（`.ui-card__title`），覆盖会变，需实机确认。
