# 斗鱼网页白天/黑夜主题 · 真机取证（2026-11-01）

> 取证方式：ego-browser 任务空间 `dyex-icon-ego`，真实登录态，页面：`https://www.douyu.com/`（首页）、`https://www.douyu.com/9999`（直播间）、`https://www.douyu.com/member/cp`（个人中心）。
> 所有结论来自真机 DOM / CSS / 网络资源，未使用任何推测。原始快照见 `theme-probe.json`。

---

## 结论速览

| 问题 | 结论 |
|---|---|
| 1 有切换入口吗 | **没有**。全站 376 个脚本里主题类 UI 文案命中 **0** 次；DOM 里没有月亮/太阳图标；用户菜单、个人中心、播放器设置都没有入口 |
| 2 切换时变了什么 | 只有 3 处：`<html data-mantine-color-scheme>` 属性、`body` 的计算背景/文字色、4 个 CSS 变量。**class 不变** |
| 3 状态存哪 | **cookie** `mantine-color-scheme-value`（`.douyu.com`，session，`light&#124;dark&#124;auto`）；localStorage 同键只有人读没人写；sessionStorage 无 |
| 4 首屏时序 | 119ms 首帧浅色 → 122ms 变深色（1 帧 Flash）；之后稳定；同名多域 cookie 会导致 ~5s 二次回落 |
| 5 可靠判据 | `document.documentElement.getAttribute('data-mantine-color-scheme') === 'dark'`，亮度兜底 < 0.2 |

截图：`theme-light.png` / `theme-dark.png`（同一房间同一位置）、`theme-home-dark.png`（首页深色）、`theme-home-usermenu.png`、`theme-member-cp.png`、`theme-player-settings.png`。

---

## 1. 有主题切换入口吗？

### 结论：没有用户可见的入口。三个候选位置全部排空。

### 1.1 脚本层：376 个 script 全文扫描，UI 文案 0 命中

扫描了房间页加载的全部 **376** 个 `<script src>`（含 `douyu-web-master` 的 Next chunks、`live-next-master/js/room`、`header-master`、`live_player`、`player-aside`、各微前端），关键词：`夜间/黑夜/白天/日间/深色/浅色/暗黑/暗色/主题/外观/护眼/换肤/皮肤/跟随系统/暗黑模式/黑色模式/明亮模式/日夜/日间模式/夜间模式/主题色/setThemeMode/toggleTheme/colorSchemeValue` —— **UI 文案命中 0 条**。

唯三与主题相关的代码引用：

| 位置 | 内容 | 性质 |
|---|---|---|
| `common_6a22e8b.js`（房间主包，5.4MB） | `getThemeMode()`：读 `localStorage['mantine-color-scheme-value']`，只用于埋点上报 | **死读**——全站没有任何地方写这个 key |
| `chunks/596-*.js` | `setColorScheme` / `toggleColorScheme` | Mantine 库自带实现，页面没有任何按钮调用它 |
| `yuba-hot-topic-master/assets/index-legacy-*.js` | `setColorSchemeAttribute()` | 微前端把顶层属性再同步一遍 |

两处**假阳性**，别被名字骗：

- `live-next-player-aside` 里的「护眼 / 关灯 / 开灯」是**弹幕指令** `handleDarkMode`，只压暗播放器画面，不改站点主题；
- `live-game-guess` 里的「预言主题设置」是竞猜题目文案。

### 1.2 DOM 层

- SVG 精灵表共 21 个 `<symbol>`：`toggle / logo / arrow / icon-hot / icon-user / icon-up / icon-time / icon-number / icon-play-count / follow / history / download / broadcast / create-center / yubamessage / search / close / arrow / delete / refresh / task1` —— **没有任何 moon / sun / dark / night / theme 图标**。
- 顶栏 `.Header-wrap` 全部可交互节点已枚举：首页/直播/分类/游戏/鱼吧/视频、搜索、历史/关注/下载/开播/消息/创作中心/任务、头像 —— 无主题项。
- hover 头像后展开的下拉：无主题项；全文短文本里唯一命中「模式」的是 **青少年模式设置**（`0×0`，不可见）。
- 个人中心 `https://www.douyu.com/member/cp`（标题「我的资料 - 个人中心 - 斗鱼」）：主题类文本命中 **0**，且**没有**主题内联脚本（`inlineScriptPresent: false`）—— 该页不参与主题。
- 播放器工具栏：`[title*=设置]` / `[class*=setting]` 候选 **0 个**，播放器设置里没有主题项。

### 1.3 谁在写这个属性

用 `Element.prototype.setAttribute` 打桩 + 堆栈回溯，实测只有 3 个来源：

| t(ms) | 值 | 调用者 |
|---|---|---|
| 250 | `light` | 页面**内联脚本** `saveDisplaySettingsToCookie()` |
| 348 / 355 | `dark` | Mantine `chunks/2654-*.js` → `V()` |
| 2970 / 2972 | `dark` | `yuba-hot-topic` 微前端 `setColorSchemeAttribute()` |

**没有任何一次写入来自用户交互。**

---

## 2. 切换时页面到底变了什么

### 2.1 变了（实测）

| 信号 | light | dark |
|---|---|---|
| `html[data-mantine-color-scheme]` | `light` | `dark` |
| `body` background-color | `rgb(245, 246, 250)` | `rgb(29, 30, 35)` |
| `body` color | `rgb(51, 51, 51)` | `rgb(221, 221, 221)` |
| `--text-color`（body 上） | `#333` | `#ddd` |
| `--card-bg` | `#fff` | `#272833` |
| `--mantine-color-text` | `#000` | `#aaa` |
| `--mantine-color-body` | `#fff` | `#222` |
| `.Header-wrap` 背景 / 文字 | 同 body | 同 body |

### 2.2 没变（重要：别拿 class 做判据）

| 信号 | light | dark |
|---|---|---|
| `html.class` | 空字符串 | 空字符串 |
| `body.class` | `3dicgbpa5kd live-next-body is-fullScreen is-fullScreenPage` | 同结构（随机 hash 每次加载都变，与主题无关） |
| `--bg-color` | 空 | 空 |

`MutationObserver`（`attributes: true, attributeOldValue: true`，观察 `html` 与 `body`）抓到的完整属性流（light 页面，6s 窗口共 41 条，节选）：

```
t=188  HTML  data-mantine-color-scheme   null  -> light
t=311  HTML  data-mantine-color-scheme   light -> light   (重复写同值)
t=774  HTML  style                       null  -> --var-ActPendant-border-color: #D9C08B66;
t=1021 BODY  style                       null  -> --player-proxy-holder-ratio: 0.5625;
t=1701 BODY  class   live-next-body      -> live-next-body is-fullScreenPage
t=2241 BODY  class   ...is-fullScreenPage -> ...is-fullScreenPage is-fullScreen
```

> 结论：**主题只走属性 + CSS 变量**，`html`/`body` 的 class 从头到尾没因主题变化过；body 上那些 class 是播放器布局类。

---

### 2.3 覆盖度实测：哪些容器跟着变，哪些写死

| 容器 | light | dark | 是否跟随 |
|---|---|---|---|
| `body` | `rgb(245,246,250)` | `rgb(29,30,35)` | ✅ |
| `.Header-wrap`（顶栏） | `rgb(245,246,250)` / `rgb(51,51,51)` | `rgb(29,30,35)` / `rgb(221,221,221)` | ✅ |
| 右侧信息栏（在线榜/贵宾/钻粉整列） | 白底 + 深字 | 深底 + 浅字 | ✅（见 `theme-light-rail.png` / `theme-dark-rail.png`） |
| `.DiamondsFansRankList`（榜单容器） | 背景 `rgba(0,0,0,0)`，字 `rgb(51,51,51)` | 背景 `rgba(0,0,0,0)`，字 `rgb(221,221,221)` | ✅（透明底套父级） |
| `.ChatToolBar`（聊天工具栏） | 透明底 + `rgb(51,51,51)` | 透明底 + `rgb(221,221,221)` | ✅（只跟文字色） |
| `.aside__KVh9u`（播放器侧栏模块） | **`rgb(46,46,54)`** | **`rgb(46,46,54)`** | ❌ 写死两个态都一样 |

→ 斗鱼自己的深色**只做到顶栏 + 正文/信息栏**，个别模块（如 `.aside__KVh9u`）是写死的深色；首页更深色时大块区域（中秋主题横幅、右侧图标栏）仍是硬编码浅色/彩色。**这意味着「跟随网页颜色」只能跟随 body/顶栏这类主色，别指望整页都变。**

## 3. 主题状态存在哪

| 位置 | 键 | 域/路径 | 有效期 | 值 |
|---|---|---|---|---|
| **cookie**（真正生效） | `mantine-color-scheme-value` | `.douyu.com` / `/` | session | `light` / `dark` / `auto` |
| localStorage | `mantine-color-scheme-value` | — | — | **不存在**（斗鱼 `getThemeMode()` 读它，但全站没有写入点） |
| sessionStorage | — | — | — | 无 |

`auto` = 跟随 `window.matchMedia('(prefers-color-scheme: dark)')`。

**实测佐证**：本机系统是深色（`matchMedia(...).matches === true`），但斗鱼默认仍是浅色 —— 说明站点**不跟随系统**，只认这个 cookie；只有值写成 `auto` 时才去读 matchMedia。

### 3.1 页面里那段权威脚本（原文，2053 字符，文档第 2 个 `<script>`）

```js
function saveDisplaySettingsToCookie() {
    var _colorScheme = (function() {
        function getCookie(name) {
            var value = '; ' + document.cookie;
            var parts = value.split('; ' + name + '=');
            if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
            return null;
        }
        return getCookie('mantine-color-scheme-value');
    })();
    var colorScheme = _colorScheme === 'light' || _colorScheme === 'dark' || _colorScheme === 'auto' ? _colorScheme : 'light';
    var computedColorScheme = colorScheme !== 'auto' ? colorScheme : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-mantine-color-scheme', computedColorScheme);
};
function checkDisplaySettings () {
    try {
        var _displaySettings = window.localStorage.getItem('global-store');
        if (_displaySettings) {
            var displayStrings = JSON.parse(_displaySettings);
            var displaySettings = JSON.parse(displayStrings.v || '{}');
            var dState = displaySettings.state || {};
            var dCustomSetttings = dState.customSetttings || {};
            var displayConfig = dCustomSetttings.displayConfig || {};
            document.body.style.setProperty('--font-family', displayConfig.fontFamily || '');
            document.body.style.setProperty('--player-barrage-font-family', displayConfig.playerFontFamily || '');
        }
    } catch (e) {}
    saveDisplaySettingsToCookie();
};
checkDisplaySettings();
window.addEventListener('storage', function (e) {
    checkDisplaySettings();
});
```

三个直接可用的推论：

1. **cookie 是唯一真源**，写 cookie 就等于切主题；
2. 它**监听 `storage` 事件**（跨标签页同步）→ 改完 cookie 后派发一个 `storage` 事件即可**免刷新**生效（实测见 §5.3）；
3. `getCookie` 里 `if (parts.length === 2)` 这个写法**遇到同名 cookie 就返回 null**（见 §4.3，会导致主题在 5 秒后自己翻回浅色）。

---

## 4. 首屏时序 / 会不会闪

用 `Page.addScriptToEvaluateOnNewDocument` 在**页面脚本之前**注入逐帧采样（`requestAnimationFrame`），只记录「属性值或 body 背景色」发生变化的那一帧。

### 4.1 深色（单 cookie = dark）

```
[{"t":0,"scheme":"no-html","bg":"n/a"},
 {"t":119,"scheme":null,"bg":"rgb(245, 246, 250)"},
 {"t":122,"scheme":"dark","bg":"rgb(29, 30, 35)"}]
```

→ 119ms 首帧仍是**浅色**（属性还没写），122ms 变深色：**1 帧（3ms）的浅色 Flash**。

### 4.2 浅色（单 cookie = light）

```
[{"t":0,"scheme":"no-html","bg":"n/a"},
 {"t":120,"scheme":null,"bg":"rgb(245, 246, 250)"},
 {"t":142,"scheme":"light","bg":"rgb(245, 246, 250)"}]
```

→ 背景色从头到尾没变，无可见闪烁。

### 4.3 二次变更：两种来源

| 来源 | 时刻 | 影响 |
|---|---|---|
| `yuba-hot-topic` 微前端重复写同值 | ~2970ms `dark -> dark` | 无（值相同） |
| **同名多域 cookie**（内联脚本取不到值 → 回退 light） | **4629ms / 6369ms / 6715ms** 三次复现 | 页面从深色**自己翻回浅色** |

复现方式（重要，别踩）：我一开始用 `document.cookie` 写入，结果浏览器里同时存在 `.douyu.com=light` 与 `www.douyu.com=dark` **两条同名 cookie**，`getCookie()` 的 `parts.length === 2` 判断落空返回 `null` → 默认 `light`，于是 dark 只维持约 5 秒就被扳回。用 CDP 只保留**一条** `.douyu.com` cookie 后，深色连续 10 秒稳定不变（`5766 → 13891ms` 全程 `scheme=dark / bg=rgb(29,30,35) / --text-color=#ddd`）。

> 也就是说：**刷新/切房后 < 150ms 就稳定**，只要 cookie 唯一；出现重复 cookie 时会有一个 ~5s 的二次变更，把主题改回浅色。

---

## 5. 可靠判据

### 5.1 一行判据

```js
const isDark = document.documentElement.getAttribute('data-mantine-color-scheme') === 'dark';
```

**为什么是它**：内联脚本在 ~122ms 就把「最终生效值」写进这个属性（`auto` 已被它解析成 `dark`/`light`），之后除了重复写同值没人改它；而 class 完全不变、`--bg-color` 是空的。

### 5.2 带兜底的一行（推荐用这个）

```js
const isDark = (() => {
  const scheme = document.documentElement.getAttribute('data-mantine-color-scheme');
  if (scheme) return scheme === 'dark';
  const rgb = (getComputedStyle(document.body).backgroundColor.match(/\d+/g) || []).map(Number);
  if (rgb.length < 3) return false;
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]) < 0.2;
})();
```

实测亮度：**dark = 0.0131**（`rgb(29,30,35)`）、**light = 0.9223**（`rgb(245,246,250)`）—— 阈值 0.2 落在中间，余量极大。

### 5.3 免刷新跟随（实测）

在页面里改 cookie 并派发一个 `StorageEvent`，400ms 内属性与背景色都跟着变：

```
{"before":"light","afterStorageEventDark":"dark","midBg":"rgb(29, 30, 35)","afterRestore":"light","finalBg":"rgb(245, 246, 250)"}
```

→ 所以「跟随网页颜色」可以做到**零延迟、免刷新**：

```js
new MutationObserver(() => {
  const isDark = document.documentElement.getAttribute('data-mantine-color-scheme') === 'dark';
  // 同步 ExPanel 的 token
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mantine-color-scheme'] });
```

### 5.4 失效情形（必须知道）

| # | 情形 | 表现 | 应对 |
|---|---|---|---|
| 1 | `0 ~ 120ms` 属性窗口期 | `getAttribute` 返回 `null` | 用 5.2 的亮度兜底，或等 `DOMContentLoaded` |
| 2 | 同名多域 cookie | 页面在 ~5s 后自己变回 light | 判据没错，是页面状态被斗鱼自己的脚本改错；读属性反而能正确反映此刻屏幕上的样子 |
| 3 | 站方改版去掉该属性 | 主判据失效 | 保留亮度兜底 |
| 4 | iframe / 微前端内部 | 内层 `document` 没有该属性 | 始终读**顶层** `documentElement` |
| 5 | `member/cp` 等不加载内联脚本的页面 | 属性仍由 Mantine 写入但不跟随 cookie | 亮度兜底同样适用 |

---

## 6. 复现步骤

1. `ego-browser` 打开 `https://www.douyu.com/9999`，**导航后立刻静音**：`document.querySelectorAll('video,audio').forEach(v=>{v.muted=true;v.volume=0})`
2. 读现状：`document.documentElement.getAttribute('data-mantine-color-scheme')`、`getComputedStyle(document.body).backgroundColor`
3. 用 CDP 精确控制 cookie（**必须先删干净同名 cookie**）：`Network.getCookies` → 逐个 `Network.deleteCookies{name,domain,path}` → `Network.setCookie{name:'mantine-color-scheme-value', value:'dark', domain:'.douyu.com', path:'/'}`
4. `page.reload()` → 逐秒采样 `scheme` / `backgroundColor` / `--text-color` / cookie 条数（验证是否被二次改写）
5. 截图对照：`theme-light.png` / `theme-dark.png`
6. 复原：`Network.setCookie{... value:'light'}`，确认 localStorage 无 `mantine-color-scheme-value` 残留

脚本：`ego/theme-01..17.mjs`（`theme-07` = 事件追踪与 mutation、`theme-12` = 单 cookie 对照、`theme-15` = 帧级时间线与 storage 即时生效、`theme-17` = 现场复原）。

---

## 7. 对「跟随网页颜色」的落地建议（3 条硬结论）

1. **不要读 cookie 来判断**：`mantine-color-scheme-value` 可被同名多域污染，读属性才稳。
2. **用属性选择器而不是 JS 判断**：`html[data-mantine-color-scheme="dark"] .ex-panel { … }` 能覆盖 120ms 之后的全部状态，且天然免疫 5s 回落（回落时选择器跟着变）。
3. **切换通知用 `MutationObserver` 观察 `data-mantine-color-scheme`**，不要轮询：一次主题切换只产生 1 次属性变更（实测 188ms / 4629ms 各一次）。

---

## 8. 文件清单

| 文件 | 说明 |
|---|---|
| `theme-probe.json` | 全部原始快照：两态 computed 值、属性 mutation 流、帧级时间线、内联脚本原文、存储信息 |
| `theme-light.png` / `theme-dark.png` | 同一房间同一位置的两态对照（`/9999`，滚动到顶） |
| `theme-home-dark.png` | 首页深色（证明 cookie 对 `www.douyu.com` 同样生效） |
| `theme-home-usermenu.png` | 头像下拉展开（证明菜单里没有主题项） |
| `theme-member-cp.png` | 个人中心（无主题项、无内联脚本） |
| `theme-player-settings.png` | 播放器工具栏（无设置入口） |
| `theme-dark-rail.png` / `theme-light-rail.png` | **右侧信息栏 2× 裁切对照**（同一屏位、无视频干扰，最直接看出主题确实变了） |
| `theme-coverage.json` | 容器级覆盖度实测（body / 顶栏 / 信息栏 / `.aside__KVh9u` 两态背景与文字色） |
| `theme-auto.png` / `theme-room-baseline.png` | 清空存储后的默认态、房间基线 |
| `theme-states-raw.json` / `theme-frames-raw.json` / `theme-cycle-raw.json` | 三轮原始采样 |

> 现场已复原：cookie 只剩 `.douyu.com=light` 一条，localStorage 无 `mantine-color-scheme-value`，页面处于浅色、媒体已静音。