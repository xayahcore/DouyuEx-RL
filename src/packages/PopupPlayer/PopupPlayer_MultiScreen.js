/* ==================== 多屏引擎（斗鱼「多屏」1:1 复刻） ==================== */
/*
 * 复刻对象：斗鱼 live_player 的多屏。已坐实**无法原生强制开启**——它由服务端长连接消息
 * multiscreenstartv1 触发，载荷带服务端签发的 confId（格子取流当 project_id 用），
 * 接口在 /mgapi/activitync/ 活动命名空间下，状态不落 localStorage。伪造消息拿不到有效
 * confId，格子只会黑屏。所以只能复刻。
 *
 * 下列常量全部是斗鱼源码 / 页面样式表的**实测原值**，不是估算：
 *   布局与 z 序    douyu-web-master/_next/static/css/7ffdfbbf296070ae.css 的 .is-multiN 规则
 *   过渡时长       同文件 :root{--Multi-player-transition:all .2s}
 *   长按/换位/守卫  live_player-master h5-plugin 的 MultiPlayerServices
 *   卡片与 loading h5-plugin 样式表（.nameAndIcon/.nameTxt/.nameIcon/.loadingView/.reload）
 *
 * 与原生刻意不一致之处（原生是可复现缺陷，照抄等于把坑搬过来，各函数内已标注）：
 *   · 原生 moveFlag 全文无复位点、取消拖拽不清 $dragBox
 *   · 原生原地松手（起手格=落点格）会把该格 DOM 从容器摘掉
 *   · 原生落点高亮挂的是 is-cur，而页面样式表只定义了 .cur（全站 372 份样式表 0 命中
 *     → 原生高亮实际是失效的）；我们两个类都挂，正确高亮
 *   · 原生 loading 用 220x128 雪碧图 steps(19)；该图是构建期哈希资源，无法稳定引用
 *     → 改用同尺寸纯 CSS 转圈，文案与层级完全一致
 */

const MS_SLOT_COUNT = 5;
const MS_MAX_ROOMS = 5;
const MS_MIN_ROOMS = 2;
const MS_LONGPRESS_MS = 300;      // 长按进拖拽（原生唯一阈值，没有像素位移阈值）
const MS_SWAP_DELAY_MS = 500;     // 换位后真正重排的延迟
const MS_RELOAD_BTN_MS = 3000;    // 进 loading 后「重新加载」按钮出现的延迟
const MS_START_TIMEOUT_MS = 8000; // 起播超时兜底提示
const MS_BOTTOM_GUARD_PX = 42;    // 拖拽起手的底部控制条保护带
/* 掉线看门狗的节奏：出画面后每 2 秒核一次，6 秒没有 timeupdate 就认定画面卡住了。
   flv 断了而 <video> 没收到 error 时，画面黑着但 readyState 仍是 2+、也没暂停 ——
   用户看不到任何提示，只会觉得"多屏坏了"。节奏可压（MultiScreen_setStallTimings，
   排障与自检用），生产值就是这两个常量。 */
const MS_STALL_TICK_MS = 2000;
const MS_STALL_QUIET_MS = 6000;

/* 点小格的行为：**默认什么都不做**，与原生一致（原生多屏点格子不会离开当前页）。
   想改成点小格把它换到主画面，把下面这个开关打开即可（走位置互换，不跳转）。 */
const MS_CLICK_SWAP_TO_MAIN = false;

/* 清晰度档位。getRealLive_Douyu 的约定：0=蓝光4M 1=流畅 2=高清 3=超清。
   首个 "auto" 不是真档位，而是"按格子实际大小自动选档"（见 MS_QN_AUTO_TIERS）——
   多屏之后每格只有几百像素高，喂它 2K 纯属浪费：实测（2288 房间）默认档 qn0 拿到
   2560×1440、qn2 拿到 960×540，而五格布局里的小格在屏幕上只有约 330×186。 */
const MS_QUALITY_LIST = [
  { v: "auto", name: "自动", short: "自动" },
  { v: "0", name: "蓝光4M", short: "蓝光" },
  { v: "3", name: "超清", short: "超清" },
  { v: "2", name: "高清", short: "高清" },
  { v: "1", name: "流畅", short: "流畅" },
];
/* 自动档规则（用户 2026-09-29 定）：**两房/四房那种大小（格子约占播放区一半高）就给最高档**。
   ① 先看**占播放区高度的比例** ≥ 0.45 → 最高档。用比例而不是绝对像素："两房那种大小"
      本来就是布局决定的（2/4 房是 50%、五房里那两个大格是 48.6%），用像素判会在临界点抖。
   ② 比例不够时再按**绝对高度**兜底（窗口很大时小格也够大，值得给更好的档）：
      ≥ 280px → 最高档；≥ 180px → 高清；否则流畅。
   只在实测过分辨率的三档里选（0 = 实测 1440p、2 = 实测 540p、1 = 最低），
   刻意不选 3（超清）：它的分辨率映射没实测过。 */
const MS_QN_BIG_SHARE = 0.45;
const MS_QN_AUTO_TIERS = [
  { minH: 280, qn: "0" },
  { minH: 180, qn: "2" },
  { minH: 0, qn: "1" },
];

/* 布局表：MS_LAYOUT[分屏数][槽位号] = [top%, left%, width%, height%]
   槽位 0 恒为主画面（斗鱼自己的播放器），尺寸由 is-multiN 规则改写 */
const MS_LAYOUT = {
  2: [[25, 0, 50, 50], [25, 50, 50, 50]],
  3: [[17.2, 0.8, 65.6, 65.6], [17.2, 66.4, 32.8, 32.8], [50, 66.4, 32.8, 32.8]],
  4: [[0, 0, 50, 50], [0, 50, 50, 50], [50, 50, 50, 50], [50, 0, 50, 50]],
  5: [[1.4, 9.5, 48.6, 48.6], [1.4, 58.1, 32.4, 32.4], [33.8, 58.1, 32.4, 32.4], [50, 9.5, 48.6, 48.6], [66.2, 58.1, 32.4, 32.4]],
};
const MS_SLOT_Z = [5, 4, 3, 2, 1];

/* ---------- 状态 ---------- */
let msContainer = null;
let msActiveList = [];          // [{rid,nn,avatar}]，[0] 恒为主房间
let msHistoryList = [];         // 关闭时快照，用于重开还原（原生一次性消费）
let msMultiType = 0;            // 当前分屏数 = msActiveList.length
let msSlotPlayers = new Map();  // 位置 -> { rid, epoch, flv, video, reloadTimer, startTimer }
/* 位置 → 格子身份。格子身份 = 类名编号（0 = 主画面格 .layout-Player-videoEntity，
   1~4 = is-multi2~is-multi5），**永不变**；位置 0~4 才是格子摆在哪儿。
   换位只改这个映射 + 数据/播放器记录，**绝不改任何 className** —— 容器里的节点是斗鱼
   React 管理的，改它的类名会让它重渲染（主房间播放器会在换位后加载出错）。
   位置与几何解耦之后，谁在哪儿只由内联样式表达，React 那一侧完全无感。 */
let msPosOwner = [0, 1, 2, 3, 4];
let msQn = "auto";   // "auto" = 按格子尺寸自动选档；其余为手动固定档位
let msEpoch = 0;                // 每次重渲染 +1，用于丢弃过期异步回调
let msDrag = null;
let msDragTimer = null;
let msStallTickMs = MS_STALL_TICK_MS;    // 看门狗节奏（MultiScreen_setStallTimings 可临时压低）
let msStallQuietMs = MS_STALL_QUIET_MS;
let msStartTimeoutMs = MS_START_TIMEOUT_MS;   // 起播超时兜底（MultiScreen_setStartTimeout 可临时压低）
// 列表变化订阅者。**必须是多播**：编辑条与弹幕合并都要跟列表变化走，
// 早先是单槽（msOnChange = fn），后注册的会静默顶掉先注册的 ——
// 结果编辑条打开着拖拽换位后不再刷新。这里改成数组，逐个调用且互不影响。
let msOnChangeList = [];
let msOnSlotClick = null;
let msMetaCache = new Map();    // rid -> { nn, avatar, showStatus }

function MultiScreen_notifyChange(list) {
  msOnChangeList.forEach(function (fn) {
    try {
      fn(list);
    } catch (e) {
      // 订阅者的问题不能影响多屏本体
    }
  });
}

/* ---------- 宿主与槽位 ---------- */

function MultiScreen_getContainer() {
  if (msContainer && msContainer.isConnected) return msContainer;
  msContainer = document.getElementById("js-player-multiContainer");
  return msContainer;
}

/* 槽位编号对齐斗鱼的命名：槽 0 是主画面（.layout-Player-videoEntity，没有 is-multiN），
   槽 1~4 的类名是 is-multi2 ~ is-multi5 —— 类名数字 = 槽号 + 1，与布局表、落点判定
   用的"格子号 1~5"完全一致（格子号 N 的类就是 is-multiN，格子号 1 即主画面格）。
   这里按类名定位而不是按子节点顺序：拖拽中会把起手格 append 到容器末尾，顺序会变，
   但类名不变；占位块刻意不带 is-multiN，故用 :not 排除。 */
// 按"格子身份"取节点：索引即类名编号（0 = 主画面格，1~4 = is-multi2~is-multi5），顺序固定
function MultiScreen_cells() {
  const c = MultiScreen_getContainer();
  const out = [];
  if (!c) return out;
  out[0] = c.querySelector(".layout-Player-videoEntity");
  for (let i = 1; i < MS_SLOT_COUNT; i++) {
    out[i] = c.querySelector(".layout-Player-multiPlayer.is-multi" + (i + 1) + ":not(.ms-slot--placeholder)");
  }
  return out;
}

// 按"位置"取节点：slots[位置] = 当前摆在这个位置上的格子。其余代码一律只用位置，
// 于是换位只需要改 msPosOwner，不必动任何 DOM 结构。
function MultiScreen_slots() {
  const cells = MultiScreen_cells();
  const out = [];
  for (let pos = 0; pos < MS_SLOT_COUNT; pos++) out[pos] = cells[msPosOwner[pos]] || null;
  return out;
}

function MultiScreen_resetPosOwner() {
  msPosOwner = [0, 1, 2, 3, 4];
}

/* 参与版面的位置（升序）：**关掉「合入画面」的房间不占格子**（用户 2026-10-06 定）。
   版面格数、布局表下标、拖拽命中分区、自动档推算一律以这份名单为准 ——
   房间本身仍留在 msActiveList 里（它的弹幕还要合入、面板里还要能开关），只是不上画面。 */
function MultiScreen_visiblePositions() {
  const out = [];
  for (let i = 0; i < msActiveList.length && i < MS_SLOT_COUNT; i++) {
    const r = msActiveList[i];
    if (r && r.video !== false) out.push(i);
  }
  return out;
}

/* 需要重拉/换档的**外房位置**（升序）：判据是房间身份（外加格子身份兜底），不是下标。
   ⚠ 别再用 for (let i = 1; …)：那等于假定"位置 0 = 主画面"。拖拽换位之后主画面格可能坐在
   任意位置上（位置 0 上反而坐着外房），于是真正要换的外房被跳过，而对主画面格调 switchQuality
   又会被 renderSlot 的主房护栏挡掉 —— 表现是档位角标变了、画面没换（真机 2026-10-26 复现：
   主画面格拖到位置 1 后选「超清」，外房没有任何新流）。 */
function MultiScreen_externalPositions() {
  const mainRid = String(MultiScreen_getMainRid());
  return MultiScreen_visiblePositions().filter(function (pos) {
    const r = msActiveList[pos];
    return !!r && String(r.rid) !== mainRid && msPosOwner[pos] !== 0;   // 身份 0 = 主画面格
  });
}

// 位置 → 版面槽号（它是第几个可见格）；显式关掉画面的位置返回 -1
function MultiScreen_layoutSlotOf(pos) {
  return MultiScreen_visiblePositions().indexOf(pos);
}

/* 格子身份 → 它**此刻**所在的位置。换位只改位置归属，格子身份永远不变（见 msPosOwner），
   所以闭包里存"身份"比存"位置 / 房间对象"可靠：这一格里的按钮换位后仍只作用于自己这格。 */
function MultiScreen_positionOfCell(cellId) {
  return msPosOwner.indexOf(cellId);
}

/* 播放记录 → 它**此刻**所在的位置（-1 = 已经被销毁）。异步回调（betard 回包）拿它定位，
   不要用渲染那一刻的 idx：换位会把记录搬到别的位置上。 */
function MultiScreen_positionOfRecord(rec) {
  let found = -1;
  msSlotPlayers.forEach(function (r, pos) {
    if (r === rec && found < 0) found = pos;
  });
  return found;
}

/* ⚠⚠ 不要再给 #__h5player 设 pointer-events:none（2026-09-29 实测推翻，原实现已撤除）
 *
 * 曾经的做法：多屏开启期间给 `#__h5player` 设 `pointer-events:none`，以为这样能让鼠标事件
 * "穿过"它落到多屏容器上（当时把"点不出原生弹幕菜单/用户卡片"归因于它吃事件）。
 * 实机量测后发现**这个推断是错的，而且这个补丁本身在制造故障**：
 *
 * ① 弹幕层就在这棵树里（实测的祖先链，别再猜）：
 *      .danmuItem → div.danmu-fbb2a3（弹幕层容器）→ div.comment-37342a → **#__h5player** → room-html5-player
 *    悬停时被暂停的那条弹幕会被原生搬进 `#comment-higher-container`，它同样在 `#__h5player` 里。
 * ② `pointer-events` 是**继承**属性：整棵树被置 none 后，只有**自己显式声明 auto** 的后代
 *    才还能点（弹幕节点 `.danmuItem` 与悬停快捷菜单 `.btnscontainer-*` 恰好都声明了，所以它们
 *    看起来正常，把问题掩盖了）；其余原生 UI 一律变成"看得见、点不动"：
 *      · 弹幕右键面板（`clickDanmu` → danmuMenu store，定位基准就是弹幕层容器 cmdiv）
 *      · 我们自己往菜单里插的「+1」按钮（BarragePanel_Tip）
 *      · 任何渲染在这棵树里的原生弹层（举报/屏蔽/字幕等）
 *    表现正是用户报的"右键面板展开了、点 × 关不掉"，以及菜单卡住不走、后续悬停像没悬停上。
 * ③ 这个补丁**没有带来它声称的好处**：把 pointer-events 还原成 auto 后量测，
 *    弹幕节点在自身坐标上依旧是最顶层命中目标（悬停/暂停/快捷菜单全部照常）；
 *    而多屏容器自己的 UI 无论补丁开不开都被原生层盖着（所以"重新加载"按钮一直靠坐标代理）。
 *
 * 结论：这棵树一格 pointer-events 都不要动。要让自有 UI 可点，就用坐标代理（见 onClick 里的做法）。 */

function MultiScreen_slotDom(idx) {
  return MultiScreen_slots()[idx] || null;
}

function MultiScreen_isSupported() {
  if (!MultiScreen_getContainer()) return false;
  const s = MultiScreen_slots();
  for (let i = 0; i < MS_SLOT_COUNT; i++) if (!s[i]) return false;
  return true;
}

/* ---------- 存储脏值容错 ----------
   ExSave_MultiScreen* 是用户能手动改、也会被旧/坏版本写坏的地方（代码里已经见过 qn 被写成
   "ULTRA256"、list 被写成对象数组这类情况）。恢复时必须逐项校验：脏档位拿去取流只会失败，
   脏 rid 会变成 "[object Object]" 请求，脏文本会原样进 UI。 */
const MS_RID_RE = /^\d{1,20}$/;
function MultiScreen_saneRid(v) {
  if (typeof v === "number" && isFinite(v) && v > 0) return String(Math.floor(v));
  if (typeof v === "string") {
    const s = v.trim();
    if (MS_RID_RE.test(s) && s !== "0") return s;
  }
  return "";
}
function MultiScreen_saneText(v, max) {
  return typeof v === "string" ? v.slice(0, max || 60) : "";
}
// 房间项：只认对象 + 合法 rid；nn/avatar 强制字符串；两个开关只认显式 false
function MultiScreen_saneItem(r) {
  if (!r || typeof r !== "object") return null;
  const rid = MultiScreen_saneRid(r.rid);
  if (!rid) return null;
  const o = { rid: rid, nn: MultiScreen_saneText(r.nn), avatar: MultiScreen_saneText(r.avatar, 300) };
  if (r.video === false) o.video = false;
  if (r.danmaku === false) o.danmaku = false;
  return o;
}
// 档位：只认列表里的五档（"auto" 也在表内），其余一律当脏值
function MultiScreen_saneQn(q) {
  if (typeof q !== "string") return "";
  for (let i = 0; i < MS_QUALITY_LIST.length; i++) if (MS_QUALITY_LIST[i].v === q) return q;
  return "";
}

function MultiScreen_getMainRid() {
  return String((typeof rid !== "undefined" && rid) || "");
}

/* 事件与编辑条的宿主 = 容器的第一个"已定位"祖先。
   ⚠ 实测结论（2288 房间）：容器祖先链是
     #js-player-multiContainer > .player__6-Nuo(relative) > .container__3RvjJ
       > #js-player-video > #js-player-video-case > .video__VfhVg > …
   而 #__h5player **虽然与容器同尺寸同位置（都是 813x457 @32,196），却并不包含容器**
   —— 它是这套页面版本里的旧播放器树，真正的播放器与容器在 #js-player-video 那一支。
   所以绝不能像原生那样把事件挂在 #__h5player 上：事件永远收不到，拖拽与点击会整体失效。
   也不能挂在 body 上：那会与页面其它区域的点击相互干扰。 */
function MultiScreen_getHost() {
  const c = MultiScreen_getContainer();
  if (!c) return null;
  let p = c.parentElement;
  for (let i = 0; i < 6 && p && p !== document.body; i++) {
    try {
      if (getComputedStyle(p).position !== "static") return p;
    } catch (e) {
      break;
    }
    p = p.parentElement;
  }
  return c;   // 兜底：容器自己是 absolute，挂它也能收到槽位冒泡上来的事件
}

/* ---------- 布局 ---------- */

function MultiScreen_applyLayout() {
  const c = MultiScreen_getContainer();
  if (!c || msDrag) return;   // 拖拽中不抢内联样式，否则被拖格会跳回原位
  MultiScreen_watchContainer();   // 容器被整棵替换时重新挂上观察（同元素时是空操作）
  const vis = MultiScreen_visiblePositions();
  // 版面格数 = **有画面**的房间数：关掉画面的房间不占格，剩下几个就按几个的版面排
  msMultiType = vis.length;
  // 与原生一致：>1 才加 is-multi；否则回到普通单屏
  if (msMultiType > 1) {
    c.className = "layout-Player-multiContainer is-multi is-multi" + msMultiType;
  } else {
    c.className = "layout-Player-multiContainer";
  }
  const table = MS_LAYOUT[msMultiType];
  /* 单屏状态（没开多屏或只剩一个可见格）：**完全交回原生**，一格的内联尺寸都不要碰。
     实测线上教训：以前这里走的是"失活位置一律清零隐藏"的分支，于是单屏时把全部 5 个槽位
     都写成了 width:0;height:0;visibility:hidden —— 连主画面格一起，整块播放器区域变成零尺寸，
     后果是原生弹幕飘屏直接不再出现（引擎的轨道数按容器尺寸算，0 高就是 0 轨），
     而画面上看起来"什么都没发生"。 */
  if (msMultiType <= 1) {
    MultiScreen_slots().forEach(function (slot) {
      if (!slot) return;
      ["top", "left", "width", "height", "z-index", "transform", "visibility"].forEach(function (prop) {
        slot.style.removeProperty(prop);
      });
    });
    return;
  }
  const slots = MultiScreen_slots();
  slots.forEach(function (slot, pos) {
    if (!slot) return;
    // 该位置在第几个可见格上（关掉画面的位置 = -1，直接隐藏）
    const k = vis.indexOf(pos);
    if (k < 0 || !table || k >= table.length) {
      // 不在本次分屏内的位置：显式清零并隐藏。
      // 这里**不能**只清内联样式"交回原生规则"——主画面格没有 is-multiN，原生规则不会隐藏它，
      // 于是被换到多余位置上的格子会一直摆在画面上。
      slot.style.top = "0px";
      slot.style.left = "0px";
      slot.style.width = "0px";
      slot.style.height = "0px";
      slot.style.zIndex = "0";
      slot.style.transform = "scale(0)";
      slot.style.visibility = "hidden";
      return;
    }
    const g = table[k];
    slot.style.top = g[0] + "%";
    slot.style.left = g[1] + "%";
    slot.style.width = g[2] + "%";
    slot.style.height = g[3] + "%";
    slot.style.zIndex = String(MS_SLOT_Z[k]);
    // 原生靠 .is-multiN 后代规则放开槽位的 scale(0)+hidden；宿主样式缺失时内联兜底
    slot.style.transform = "scale(1)";
    slot.style.visibility = "visible";
  });
  // 几何改完，格子像素尺寸变了：自动档要跟着核一遍（只有档位真变了才重拉）。
  // 这里还要**再通知一次**：面板上的档位角标是"按当前几何算出来的"，布局一变它就得重画 ——
  // 实测踩过：一键恢复时面板会先渲染一轮，那时布局还没套稳，角标停在了旧档位上。
  MultiScreen_reapplyAutoQuality();
  MultiScreen_notifyChange(msActiveList.slice());
}

/* ---------- 单格渲染 ---------- */

function MultiScreen_clearSlot(idx) {
  const rec = msSlotPlayers.get(idx);
  if (rec) {
    // 换档进行中就被清掉（例如切房间）：新旧两条记录都要销毁，否则旧流会在后台继续跑
    if (rec.prev) MultiScreen_destroyPlayer(rec.prev);
    MultiScreen_destroyPlayer(rec);
    msSlotPlayers.delete(idx);
  }
  const slot = MultiScreen_slotDom(idx);
  if (!slot) return;
  // 判定依据是**格子身份**而不是位置：主画面格（身份 0）里是斗鱼自己的播放器，
  // 换位可能把它挪到任意位置，一旦按位置去"清空"就会把播放器 DOM 连根拔掉
  // （实测：换位后 #__video2 消失、主房间加载出错）。只清我们自己的状态类，内容从不动它。
  if (msPosOwner[idx] !== 0) slot.innerHTML = "";
  slot.classList.remove("ms-slot--loading", "ms-slot--notice", "ms-slot--novideo", "is-cur", "cur", "dragging-player", "ms-slot--dragging");
}

/* 关掉了「合入画面」的房间：**不占格子**（版面按有画面的房间数重排），
   只是不取流、不建播放器 —— 相当于"只要这个房间的弹幕，不要它的画面"。
   格子里这份占位内容此刻已被布局隐藏（它连尺寸都没有），留着是为了给自愈一个"这是有意为之"的标记。 */
function MultiScreen_renderSlotNoVideo(idx, room) {
  const slot = MultiScreen_slotDom(idx);
  if (!slot) return;
  MultiScreen_clearSlot(idx);
  slot.innerHTML =
    '<span class="ms-slot__name">' +
      '<span class="ms-slot__name-icon"></span>' +
      '<span class="ms-slot__name-text"></span>' +
    "</span>" +
    '<div class="ms-slot__loading">' +
      '<div class="ms-slot__loading-inner">' +
        '<div class="ms-slot__tip">画面已关闭（弹幕照常显示）</div>' +
        '<div class="ms-slot__reload is-visible">开启画面</div>' +
      "</div>" +
    "</div>";
  MultiScreen_fillName(slot, room);
  slot.classList.add("ms-slot--novideo", "ms-slot--notice");
  const btn = slot.querySelector(".ms-slot__reload");
  if (btn) {
    const cellOwner = msPosOwner[idx];   // 身份，不是位置（换位后这个位置上可能已是别的房间）
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const pos = MultiScreen_positionOfCell(cellOwner);
      const now = pos >= 0 ? msActiveList[pos] : null;
      if (now) MultiScreen_setRoomFlag(String(now.rid), "video", true);
    });
  }
}

function MultiScreen_renderSlot(idx, room) {
  const slot = MultiScreen_slotDom(idx);
  if (!slot || !room) return;
  // 主画面格（身份 0）里是斗鱼原生播放器，永远不往里写东西 —— 注意判的是身份不是位置：
  // 换位后它可能在任意位置上，而任意位置上也可能坐着外房格（那种情况要正常渲染）。
  if (msPosOwner[idx] === 0) return;
  if (room.video === false) return MultiScreen_renderSlotNoVideo(idx, room);
  MultiScreen_clearSlot(idx);

  const epoch = ++msEpoch;
  const cellOwner = msPosOwner[idx];   // 这一格的**身份**：换位不会改它，闭包靠它定位
  // 房名胶囊的类名与取值全部对齐原生 .nameAndIcon / .nameTxt / .nameIcon
  slot.classList.add("ms-slot--loading");
  slot.innerHTML =
    '<video class="ms-slot__video" playsinline></video>' +
    '<span class="ms-slot__name">' +
      '<span class="ms-slot__name-icon"></span>' +
      '<span class="ms-slot__name-text"></span>' +
    '</span>' +
    '<div class="ms-slot__loading">' +
      '<div class="ms-slot__loading-inner">' +
        '<div class="ms-slot__spin"></div>' +
        '<div class="ms-slot__tip">努力加载中…</div>' +
        '<div class="ms-slot__reload">重新加载</div>' +
      '</div>' +
    '</div>';

  const rec = {
    rid: String(room.rid),
    epoch: epoch,
    flv: null,
    video: slot.querySelector(".ms-slot__video"),
    reloadTimer: 0,
    startTimer: 0,
    url: "",
    stallTimer: 0,     // 掉线看门狗（interval，必须被 destroyPlayer 清掉）
    lastTick: 0,       // 最近一次 timeupdate 的时间戳
    stalled: 0,        // 已经提示过"卡住"（timeupdate 回来时清掉）
  };
  // 起播阶段一律静音（浏览器对"带声音自动播放"有限制）；该房间存的音量在出画面后再套上
  if (rec.video) {
    rec.video.muted = true;
    rec.video.volume = 0;
    rec.video.setAttribute("muted", "");
  }
  rec.vol = MultiScreen_getVolume(rec.rid, false);
  msSlotPlayers.set(idx, rec);

  MultiScreen_fillName(slot, room);
  const reloadEl = slot.querySelector(".ms-slot__reload");
  // 红线：DOM 操作必须判空（模板里一定有它，但不赌）
  if (reloadEl) reloadEl.addEventListener("click", function (e) {
    e.stopPropagation();
    /* ⚠ 闭包里的 idx / room 都会过期：换位把记录与数据一起换到别的位置，闭包不会跟着换。
       照旧值重渲染的后果是"清掉隔壁格的记录、把这边的流塞进隔壁格"（两格同房、原房消失）。
       格子身份换位不变，所以按身份现算它此刻在哪个位置，再取那个位置上的房间。 */
    const pos = MultiScreen_positionOfCell(cellOwner);
    const now = pos >= 0 ? msActiveList[pos] : null;
    if (!now) return;
    MultiScreen_renderSlot(pos, now);
  });
  // 「重新加载」按钮 3 秒后才出现（原生阈值）
  rec.reloadTimer = setTimeout(function () {
    /* 判"这条记录还活着"只能按记录身份：换位后它已经不在 idx 上了，
       用位置判会让「重新加载」按钮在换位过的格子里永远不出现（真机 2026-10-26 清单第 3 条）。 */
    if (reloadEl && MultiScreen_positionOfRecord(rec) >= 0) reloadEl.classList.add("is-visible");
  }, MS_RELOAD_BTN_MS);

  MultiScreen_resolveRoom(room, function (meta) {
    /* 记录可能已经被换位搬到别的位置：按**记录**现找它现在的位置。
       以前这里按渲染时的 idx 比对，换位后这条回包会被整条丢弃 ——
       那一格就永远停在"努力加载中…"（没取流、也没有超时兜底，因为超时是 startFlv 里才建的）。 */
    const pos = MultiScreen_positionOfRecord(rec);
    if (pos < 0) return;                          // 已被清空/换档/退出，丢弃过期回调
    MultiScreen_fillName(slot, meta);
    // betard 能给出"未开播"就直接落文案，省掉一次注定失败的取流
    if (+meta.showStatus === 2) { MultiScreen_setTip(slot, "主播正在赶来中…"); return; }
    MultiScreen_fetchStream(pos, meta, epoch);
  });
}

// 补全房名与头像：先吃列表自带的，缺了才打 betard（结果进 msMetaCache，同房不重复请求）
function MultiScreen_resolveRoom(room, cb) {
  const rid = String(room.rid);
  if (room.nn) { cb(room); return; }
  const hit = msMetaCache.get(rid);
  if (hit) { cb(Object.assign({}, room, hit)); return; }
  fetch("https://www.douyu.com/betard/" + rid, { method: "GET", mode: "no-cors", credentials: "include" })
    .then(function (r) { return r.json(); })
    .then(function (ret) {
      const rm = (ret && ret.room) || {};
      const meta = {
        nn: rm.nickname || rm.room_name || "",
        avatar: (rm.avatar && rm.avatar.middle) || "",
        // betard 的 show_status 不保证存在：拿不到就不做开播判定，交给取流结果决定
        showStatus: rm.show_status === undefined ? undefined : +rm.show_status,
      };
      msMetaCache.set(rid, meta);
      cb(Object.assign({}, room, meta));
    })
    .catch(function () { cb(room); });
}

/* 面板补房名用：betard 已经问过的房名（同房不重复请求） */
function MultiScreen_getMetaName(rid) {
  const hit = msMetaCache.get(String(rid));
  return (hit && hit.nn) || "";
}

function MultiScreen_fillName(slot, room) {
  const nameEl = slot.querySelector(".ms-slot__name-text");
  const iconEl = slot.querySelector(".ms-slot__name-icon");
  const label = room.nn || ("房间 " + room.rid);
  if (nameEl) { nameEl.textContent = label; nameEl.title = label; }
  if (iconEl) {
    if (room.avatar) {
      iconEl.style.backgroundImage = 'url("' + room.avatar + '")';
      iconEl.style.display = "";
    } else {
      iconEl.style.display = "none";
    }
  }
}

// 出文案即视为加载结束：撤掉转圈态，切到文案态，并让「重新加载」立刻可用
function MultiScreen_setTip(slot, tip) {
  if (!slot) return;
  const el = slot.querySelector(".ms-slot__tip");
  if (el) el.textContent = tip;
  slot.classList.remove("ms-slot--loading");
  slot.classList.add("ms-slot--notice");
  const r = slot.querySelector(".ms-slot__reload");
  if (r) r.classList.add("is-visible");
}

/* ---------- 自动清晰度：按格子实际渲染高度选档 ---------- */

/* 量的是**格子元素的实际渲染高度**（不是布局表里的百分比）：换位之后外房格可能坐到
   大格位置上，量 DOM 才能跟着位置走；窗口缩放、2/3/4/5 分屏切换也都会反映进来。 */
function MultiScreen_pickQnForSlot(idx) {
  const slot = MultiScreen_slotDom(idx);
  let h = 0;
  try { h = slot ? slot.getBoundingClientRect().height : 0; } catch (e) { h = 0; }
  let ch = 0;
  try { const c = MultiScreen_getContainer(); ch = c ? c.getBoundingClientRect().height : 0; } catch (e) { ch = 0; }
  /* ⚠ 量不到 DOM 尺寸时（进多屏的**第一次**取流就发生在这个时刻：布局还没套上去）
     用布局表 × 容器高度推算，否则首屏会全部落到兜底档（实测踩过：进多屏全是 540p，
     缩放一下才升档）。布局表是同步可算的，不依赖 DOM 改完没有。 */
  if (!h) {
    const k = MultiScreen_layoutSlotOf(idx);
    const table = MS_LAYOUT[msMultiType];
    if (table && k >= 0 && table[k]) h = ch * (table[k][3] / 100);
  }
  if (!h) return "2";   // 连布局表都没有（刚建格/隐藏中）：先给中档，重排时会被纠正
  // ① 约占播放区一半高 → 最高档（两房/四房，以及五房里那两个大格）
  if (ch > 0 && h / ch >= MS_QN_BIG_SHARE) return "0";
  // ② 其余按绝对高度兜底
  for (let i = 0; i < MS_QN_AUTO_TIERS.length; i++) {
    if (h >= MS_QN_AUTO_TIERS[i].minH) return MS_QN_AUTO_TIERS[i].qn;
  }
  return "1";
}

function MultiScreen_qnFor(idx) {
  return msQn === "auto" ? MultiScreen_pickQnForSlot(idx) : msQn;
}

/* ---------- 排障：现在每个外房格用的是哪一档 ---------- */
/* 用户问过「自动清晰度到底生效没有」—— 光看画面看不出来（有些房间只提供一档，换档后地址不变）。
   这里把「量到的格子高度 / 占播放区比例 / 实际档位 / 实际分辨率 / 音量」一次列出来：
   页面控制台执行 MultiScreen_getQnReport() 即可。 */
function MultiScreen_getQnReport() {
  const c = MultiScreen_getContainer();
  let ch = 0;
  try { ch = c ? c.getBoundingClientRect().height : 0; } catch (e) { ch = 0; }
  const out = [];
  for (let i = 0; i < MS_SLOT_COUNT; i++) {
    const room = msActiveList[i];
    if (!room) continue;
    const isMain = msPosOwner[i] === 0;
    const slot = MultiScreen_slotDom(i);
    let h = 0;
    try { h = slot ? slot.getBoundingClientRect().height : 0; } catch (e) { h = 0; }
    const rec = msSlotPlayers.get(i);
    const v = rec && rec.video;
    out.push({
      pos: i,
      rid: String(room.rid),
      isMain: isMain,
      rectH: Math.round(h),
      share: ch ? Math.round((h / ch) * 100) / 100 : 0,
      qn: isMain ? "主画面(原生)" : (room.video === false ? "(未取流)" : MultiScreen_qnFor(i)),
      mode: msQn === "auto" ? "auto" : "manual(" + msQn + ")",
      res: v && v.videoWidth ? v.videoWidth + "x" + v.videoHeight : "(未出画面)",
      vol: MultiScreen_getVolume(room.rid, isMain),
      // 每房间两把"合入"开关（缺省即开）
      video: room.video !== false,
      danmaku: room.danmaku !== false
    });
  }
  return out;
}

/* ---------- 每房间的「合入」开关（弹幕 / 画面） ---------- */
/*
 * 用户 2026-09-30 定：外房要能单独关掉「合入弹幕」或「合入画面」（面板房间列表里那两枚胶囊）。
 *   · 缺省都是**开**：列表项里只存"被关掉"这个事实，字段缺省即开，老配置读进来天然兼容；
 *   · 关画面：格子仍然占位（版面、拖拽、换位都不变），但不取流、不建播放器，省一份带宽；
 *   · 关弹幕：不再为这个房间建免登录连接，挂在队列里还没交出去的报文也一并丢掉；
 *   · 主房间没有这两把开关 —— 它的画面与弹幕本来就是本页的原生本体。
 * 开关随列表项持久化（MultiScreen_roomRecord），跟着"按主房记忆"一起走。
 */
function MultiScreen_roomRecord(r) {
  const o = { rid: String(r.rid), nn: r.nn || "", avatar: r.avatar || "" };
  if (r.video === false) o.video = false;
  if (r.danmaku === false) o.danmaku = false;
  return o;
}

function MultiScreen_roomByRid(rid) {
  const k = String(rid);
  return msActiveList.filter(function (r) { return String(r.rid) === k; })[0] || null;
}

function MultiScreen_slotIndexOfRid(rid) {
  const k = String(rid);
  for (let i = 0; i < msActiveList.length && i < MS_SLOT_COUNT; i++) {
    if (String(msActiveList[i].rid) === k) return i;
  }
  return -1;
}

function MultiScreen_isRoomOn(rid, key) {
  const room = MultiScreen_roomByRid(rid);
  if (!room) return true;
  return room[key] !== false;
}

/* 返回 true = 状态真的变了（面板据此决定要不要重渲染） */
function MultiScreen_setRoomFlag(rid, key, on) {
  if (key !== "video" && key !== "danmaku") return false;
  const room = MultiScreen_roomByRid(rid);
  if (!room) return false;
  if (String(MultiScreen_getMainRid()) === String(room.rid)) return false;   // 主房间没有"合入"一说
  const want = on !== false;
  if ((room[key] !== false) === want) return false;                          // 没有变化
  if (want) delete room[key];
  else room[key] = false;
  MultiScreen_save();
  if (key === "video") {
    const idx = MultiScreen_slotIndexOfRid(room.rid);
    if (idx >= 0) MultiScreen_renderSlot(idx, room);   // 开 → 取流；关 → 清空格子
    // 画面开关会改变"谁占格子"→ 版面要立刻重排（关掉的房间不再占位，其余格子跟着变大）
    MultiScreen_applyLayout();
  }
  // 弹幕开关要靠这条通知让合并侧重建连接；画面开关顺带刷新编辑条/面板上的显示
  MultiScreen_notifyChange(msActiveList.slice());
  return true;
}

/* 面板上那一小枚档位角标：这个房间此刻用的是哪一档（自动档显示的是"选出来的那一档"，
   这样缩放窗口时角标会跟着变，一眼就能看出自动档在干活）。关掉画面的房间没有档位。
   ⚠ 取的是**当前应该用的档**（qnFor = 手动档位或按几何算出来的自动档），不是 rec.qn：
   rec.qn 是"上次取流时用的档"，换档进行中/刚改完档时它还是旧值，角标会显示过期档位。 */
function MultiScreen_roomQnName(rid) {
  if (msActiveList.length < MS_MIN_ROOMS) return "";
  const idx = MultiScreen_slotIndexOfRid(rid);
  if (idx < 0 || msPosOwner[idx] === 0) return "";
  const room = msActiveList[idx];
  if (room && room.video === false) return "";
  const qn = MultiScreen_qnFor(idx);
  const hit = MS_QUALITY_LIST.filter(function (q) { return q.v === String(qn); })[0];
  return hit ? hit.name : "";
}

/* ---------- 每房间音量 ---------- */
/*
 * 用户 2026-09-30 定：每个房间单独设音量（放在面板的房间列表里）。
 *  · 外房：直接作用在我们自己的 <video> 上（volume + muted），改完立刻生效；
 *  · 主房：斗鱼自己的播放器，作用在它的 <video> 上 —— 但它自己的音量条/记忆可能把它盖回来，
 *    所以主房默认仍是 100%，调它属于"顺手改一下"，不是权威音量；
 *  · 外房默认 0（静音）：几个房间同时出声会很吵，要听哪个自己拉；
 *  · 起播前先保持 muted（浏览器对"带声音自动播放"有限制），出画面后再套上存的音量。
 */
const MS_VOLUME_KEY = "ExSave_MultiScreenVol";
let msVolumes = null;

function MultiScreen_loadVolumes() {
  if (msVolumes) return msVolumes;
  msVolumes = {};
  try {
    const j = JSON.parse(localStorage.getItem(MS_VOLUME_KEY) || "null");
    if (j && typeof j === "object") {
      Object.keys(j).forEach(function (k) {
        const v = Number(j[k]);
        if (v >= 0 && v <= 1) msVolumes[String(k)] = v;
      });
    }
  } catch (e) {}
  return msVolumes;
}

function MultiScreen_saveVolumes() {
  try { localStorage.setItem(MS_VOLUME_KEY, JSON.stringify(msVolumes || {})); } catch (e) {}
}

function MultiScreen_getVolume(rid, isMain) {
  const vols = MultiScreen_loadVolumes();
  const k = String(rid);
  if (vols[k] === undefined) return isMain ? 1 : 0;
  return vols[k];
}

function MultiScreen_setVolume(rid, v) {
  const val = Math.max(0, Math.min(1, Number(v) || 0));
  MultiScreen_loadVolumes()[String(rid)] = val;
  MultiScreen_saveVolumes();
  MultiScreen_applyVolume(String(rid), val);
}

// 主房间的视频元素（斗鱼自己的播放器）
function MultiScreen_nativeVideo() {
  return document.querySelector("#__video2")
    || document.querySelector("#__video_container video")
    || document.querySelector(".layout-Player-videoEntity video")
    || null;
}

function MultiScreen_applyVolumeToRec(rec, v) {
  if (!rec || !rec.video) return;
  try {
    rec.video.volume = v;
    rec.video.muted = v === 0;
  } catch (e) {}
}

function MultiScreen_applyVolume(rid, v) {
  const k = String(rid);
  if (k === String(MultiScreen_getMainRid())) {
    const nv = MultiScreen_nativeVideo();
    if (nv) {
      try { nv.volume = v; nv.muted = v === 0; } catch (e) {}
    }
    return;
  }
  msSlotPlayers.forEach(function (rec) {
    if (!rec || String(rec.rid) !== k) return;
    /* rec.vol 是"出画面那一刻要补上的音量"，也是换档继承给新流的音量：
       不同步就会在 playing 回调里被出生值盖回去（表现为"拉了音量，出画面又静音"）。
       换档中的旧流（rec.prev）此刻还在出声，也得跟着改。 */
    rec.vol = v;
    MultiScreen_applyVolumeToRec(rec, v);
    if (rec.prev) {
      rec.prev.vol = v;
      MultiScreen_applyVolumeToRec(rec.prev, v);
    }
  });
}

/* 尺寸/分屏变化后重新按自动档核一遍：只有**档位真的变了**才换那一格。
   换档走**平滑路径**（双画面交叉过渡，见 MultiScreen_switchQuality），不再黑屏重来。 */
function MultiScreen_reapplyAutoQuality() {
  if (msQn !== "auto" || msMultiType <= 1 || msDrag) return;
  let changed = false;
  // 目标位置一律按房间身份筛（换位后主画面格可能不在位置 0，见 MultiScreen_externalPositions）
  const positions = MultiScreen_externalPositions();
  for (let k = 0; k < positions.length; k++) {
    const i = positions[k];
    const rec = msSlotPlayers.get(i);
    if (!rec) continue;
    /* 换档进行中（旧流 + --next 新流交叉过渡）：别在过渡窗口里再起一次 —— switchQuality 会看到
       "旧流没画面"走兜底分支，把两条流一起销毁重取（5 房缩放抖动时最容易踩到）。 */
    if (rec.switching) continue;
    const want = MultiScreen_pickQnForSlot(i);
    if (rec.qn && rec.qn === want) continue;
    MultiScreen_switchQuality(i, msActiveList[i]);
    changed = true;
  }
  // 档位真的变了才通知：面板上的档位角标要跟着变（缩放窗口时一眼就能看出自动档在干活）
  if (changed) MultiScreen_notifyChange(msActiveList.slice());
}

/* ---------- 平滑换档：双画面交叉过渡 ---------- */
/*
 * 换清晰度 = 换一条流（斗鱼接口一次只给一条流，没有多码率清单），所以必然要重新取流；
 * 但**不必清空格子**：新流在叠放的第二个 <video> 里起播，等它真的出画面了，再淡入新的、
 * 撤掉旧的。用户看到的是"画面轻轻跳一下"，而不是黑屏 + 转圈。
 * 新流一直起不来（超时/失败）就放弃这次切换，旧流原样继续播 —— 至少不会越切越糟。
 */
const MS_SWAP_TIMEOUT_MS = 8000;

// 销毁一条播放记录（flv + video + 计时器）。换档时新旧两条各有一份记录，必须能单独销毁。
function MultiScreen_destroyPlayer(rec) {
  if (!rec) return;
  clearTimeout(rec.reloadTimer);
  clearTimeout(rec.startTimer);
  clearTimeout(rec.swapTimer);
  clearTimeout(rec.retryTimer);
  clearInterval(rec.stallTimer);   // 看门狗是 interval：不清就会一直空转并拽着 slot
  rec.stallTimer = 0;
  try { if (rec.flv && typeof rec.flv.destroy === "function") rec.flv.destroy(); } catch (e) {}
  try { if (rec.video && rec.video.parentNode) rec.video.parentNode.removeChild(rec.video); } catch (e) {}
}

function MultiScreen_switchQuality(idx, room) {
  const slot = MultiScreen_slotDom(idx);
  const old = msSlotPlayers.get(idx);
  // 没有旧流、或旧流还没出画面（readyState < 2 = 没拿到可播数据）→ 没有"画面"可保住，走普通重渲染
  if (!slot || !old || !old.video || !old.video.isConnected || old.video.readyState < 2) {
    return MultiScreen_renderSlot(idx, room);
  }
  const epoch = ++msEpoch;
  const fresh = slot.ownerDocument.createElement("video");
  fresh.className = "ms-slot__video ms-slot__video--next";
  fresh.setAttribute("playsinline", "");
  fresh.muted = true;
  fresh.volume = 0;
  fresh.setAttribute("muted", "");
  slot.appendChild(fresh);

  const rec = {
    rid: String(room.rid),
    epoch: epoch,
    flv: null,
    video: fresh,
    reloadTimer: 0,
    startTimer: 0,
    url: "",
    prev: old,          // 旧流：切换成功前一直留着
    switching: true,
    stallTimer: 0,
    lastTick: 0,
    stalled: 0,
    // 该房间存的音量必须跟着新流走：否则新流以 muted 起播后就再没人给它套音量，
    // 表现为"切完清晰度声音没了，手动拉一下音量条才回来"（用户 2026-10-06 报）
    vol: old.vol === undefined ? MultiScreen_getVolume(String(room.rid), false) : old.vol,
  };
  msSlotPlayers.set(idx, rec);
  clearTimeout(old.reloadTimer);   // 旧流的"重新加载"按钮计时器没意义了，但旧流继续播

  rec.swapTimer = setTimeout(function () {
    /* 8 秒里用户可能又换位了：位置现算，否则判错（白等）甚至把旧流塞进错的格子。 */
    const pos = MultiScreen_positionOfRecord(rec);
    if (pos < 0) return;
    // 新流超时没出画面：放弃切换，旧流放回这条记录此刻的位置
    msSlotPlayers.set(pos, old);
    MultiScreen_destroyPlayer(rec);
  }, MS_SWAP_TIMEOUT_MS);

  MultiScreen_fetchStream(idx, room, epoch);
}

/* 切换成功（新流已出画面）：淡入新的，随后撤掉旧的。 */
function MultiScreen_finishSwap(idx, rec) {
  const prev = rec.prev;
  rec.prev = null;
  rec.switching = false;
  clearTimeout(rec.swapTimer);
  rec.swapTimer = 0;
  rec.video.classList.add("is-live");
  if (!prev) return;
  setTimeout(function () {
    MultiScreen_destroyPlayer(prev);
  }, 320);   // 等淡入（0.25s）走完再删，避免中途露出黑底
}

let msAutoQnTimer = 0;
function MultiScreen_onResize() {
  clearTimeout(msAutoQnTimer);
  msAutoQnTimer = setTimeout(function () {
    msAutoQnTimer = 0;
    MultiScreen_reapplyAutoQuality();
  }, 800);
}

/* 外房失败自动重试一次（用户 2026-09-30 定）：间隔 2 秒，仍失败才把"重新加载"提示交给用户。
   返回 true = 已经安排了重试，调用方不要再提示。 */
function MultiScreen_retryOnce(idx, epoch, room) {
  const rec = msSlotPlayers.get(idx);
  if (!rec || rec.epoch !== epoch || rec.retried) return false;
  rec.retried = 1;
  rec.retryTimer = setTimeout(function () {
    /* 这 2 秒里也可能换位：按记录现算位置，别拿排期那一刻的 idx 取房 */
    const pos = MultiScreen_positionOfRecord(rec);
    if (pos < 0 || rec.epoch !== epoch || !room) return;
    MultiScreen_fetchStream(pos, room, epoch);
  }, 2000);
  return true;
}

function MultiScreen_fetchStream(idx, room, epoch) {
  const rec = msSlotPlayers.get(idx);
  if (!rec || rec.epoch !== epoch) return;
  const slot = MultiScreen_slotDom(idx);
  if (typeof getRealLive_Douyu !== "function") {
    if (rec.switching) { MultiScreen_abortSwap(idx, rec); return; }
    MultiScreen_setTip(slot, "取流失败，可点重新加载");
    return;
  }
  const qn = MultiScreen_qnFor(idx);
  rec.qn = qn;
  getRealLive_Douyu(String(room.rid), true, false, qn, function (url) {
    /* 回包落在这个房间**此刻**所在的位置：取流是网络往返，换位可能就发生在 RTT 里 ——
       按渲染时的 idx 判记录还在不在，会让这一格永远停在转圈上，连超时兜底都没有
       （startTimer 是 startFlv 里才建的，而 startFlv 永远没被调到）。 */
    const pos = MultiScreen_positionOfRecord(rec);
    if (pos < 0 || rec.epoch !== epoch) return;
    if (!url || url === "None") {
      if (rec.switching) { MultiScreen_abortSwap(pos, rec); return; }   // 换档失败：旧流继续
      if (MultiScreen_retryOnce(pos, epoch, room)) return;             // 先自动重试一次
      MultiScreen_setTip(MultiScreen_slotDom(pos), "房间未开播或其他错误");
      return;
    }
    MultiScreen_startFlv(pos, url, epoch);
  });
}

/* 换档失败/超时：把旧流放回记录表，销毁新流的半成品。旧流从头到尾没停过。 */
function MultiScreen_abortSwap(idx, rec) {
  if (!rec || !rec.prev) return;
  const prev = rec.prev;
  /* 换档过程中可能又换位了：旧流要放回**这条记录此刻**的位置，不能按入参 idx。 */
  const pos = MultiScreen_positionOfRecord(rec);
  const back = pos >= 0 ? pos : idx;
  if (msSlotPlayers.get(back) === rec) msSlotPlayers.set(back, prev);
  rec.prev = null;
  rec.switching = false;
  MultiScreen_destroyPlayer(rec);
  void prev;
}

/* ---------- 掉线看门狗 ---------- */
/*
 * flv 断了、而媒体元素没收到 error 时，画面会黑着但"还在播"（readyState>=2、没暂停）：
 * 用户看不到任何提示，只会觉得"多屏坏了"。这里每 2 秒核一次 timeupdate 是否还在推进：
 *   · 切换中（rec.switching）跳过 —— 那时旧流还在正常播，不是故障；
 *   · 标签页在后台时跳过（浏览器会节流 timeupdate，不能当卡死）；
 *   · 同一段卡死只提示一次（rec.stalled），画面自己缓过来时由 timeupdate 撤掉提示；
 *   · 记录已不在位置表里（pos < 0）立即失效；定时器由 destroyPlayer 清（interval 必须清）。
 * ⚠ 位置必须**每次现算**：换位（MultiScreen_swapSlotState）只交换 msPosOwner 与 msSlotPlayers，
 *   记录会被搬到别的位置上。还用"渲染那一刻的 idx"就等于换位后这条记录永远对不上号 ——
 *   看门狗当场失效（画面卡住再也不提示），提示也会写到别人那一格。
 */
function MultiScreen_startStallWatch(rec) {
  if (!rec || !rec.video) return;
  clearInterval(rec.stallTimer);
  rec.lastTick = Date.now();
  rec.stallTimer = setInterval(function () {
    const pos = MultiScreen_positionOfRecord(rec);
    if (pos < 0 || rec.switching) return;
    const v = rec.video;
    /* 判"后台"只认 visibilityState === "hidden"：document.hidden 在部分宿主里恒为 true
       （jsdom 默认停在 prerender 态），用它会把所有环境都当成"永远在后台"而永不提示。 */
    if (!v || !v.isConnected || v.readyState < 2 || v.paused || document.visibilityState === "hidden") {
      rec.lastTick = Date.now();   // 还没出画面 / 已暂停 / 页面在后台：都不算卡住
      return;
    }
    if (Date.now() - rec.lastTick < msStallQuietMs) return;
    if (rec.stalled) return;
    rec.stalled = 1;
    // 提示必须落在**这条记录此刻所在位置**的格子上，不是渲染时那一格
    MultiScreen_setTip(MultiScreen_slotDom(pos), "画面卡住了，点「重新加载」");
  }, msStallTickMs);
}

// 画面自己缓过来：把"卡住"的提示撤掉，否则文案会一直盖在正常画面上
function MultiScreen_clearStallTip(idx, rec) {
  if (!rec || !rec.stalled) return;
  rec.stalled = 0;
  const slot = MultiScreen_slotDom(idx);
  if (slot) slot.classList.remove("ms-slot--notice");
}

function MultiScreen_startFlv(idx, url, epoch) {
  const rec = msSlotPlayers.get(idx);
  if (!rec || rec.epoch !== epoch) return;
  MultiScreen_noteStreamUrl(rec, url);
  const slot = MultiScreen_slotDom(idx);
  if (!rec.video) { MultiScreen_setTip(slot, "播放器未就绪"); return; }
  // flv.js 已由 @require 预注入；只有真的缺失时才按需加载，避免重复 eval 覆盖全局
  if (typeof flvjs === "undefined" && typeof ExLoadLib === "function" && typeof EXURL !== "undefined") {
    ExLoadLib(EXURL.flv, function () { MultiScreen_startFlv(idx, url, epoch); },
                         function () { MultiScreen_setTip(slot, "播放组件没能加载，刷新页面再试"); });
    return;
  }
  if (typeof flvjs === "undefined" || !flvjs.isSupported()) { MultiScreen_setTip(slot, "当前浏览器放不了这个流"); return; }
  try {
    /* 同一个 <video> 上再来一次 createPlayer 之前必须销毁旧实例：
       8 秒超时自动重试（startTimer → retryOnce → fetchStream → 这里）会在同一个 rec、
       同一个媒体元素上再建一个 flv 实例 —— 两个 player 抢一个 mediaElement，表现为
       双请求、花屏、声道叠音，而且旧实例从此没人销毁。 */
    if (rec.flv) {
      try { if (typeof rec.flv.destroy === "function") rec.flv.destroy(); } catch (e) {}
      rec.flv = null;
    }
    const player = flvjs.createPlayer({ type: "flv", url: url }, { fixAudioTimestampGap: false });
    player.attachMediaElement(rec.video);
    player.load();
    player.play();
    rec.flv = player;
    rec.video.addEventListener("playing", function () {
      /* 位置现算：换位只交换 msPosOwner / msSlotPlayers，记录会被搬到别的位置上。
         用渲染那一刻的 idx 判"记录还在不在"，换位之后才出画面时就会早退 ——
         loading 层不清、音量不补、看门狗压根不启动（真机 2026-10-26 现场正是"换位后起播"）。 */
      const pos = MultiScreen_positionOfRecord(rec);
      if (pos < 0 || rec.epoch !== epoch) return;
      clearTimeout(rec.startTimer);
      // 换档路径：新流已出画面 → 淡入新的、撤掉旧的（旧流此前一直在播，全程没有黑屏）
      if (rec.switching) {
        MultiScreen_finishSwap(pos, rec);
        // 新流是静音起播的（自动播放限制），出画面这一刻必须把该房间存的音量补上 ——
        // 旧的换档分支在这里直接 return，漏了这一步，于是"切完档就没声音"
        MultiScreen_applyVolumeToRec(rec, rec.vol === undefined ? MultiScreen_getVolume(rec.rid, false) : rec.vol);
        MultiScreen_startStallWatch(rec);   // 新流接管画面，看门狗跟着换
        return;
      }
      const s = MultiScreen_slotDom(pos);
      // 出画面即撤掉整个加载层（转圈态与文案态一起清）
      if (s) s.classList.remove("ms-slot--loading", "ms-slot--notice");
      // 出画面后再套该房间存的音量（0 就是静音，等于保持现状）
      MultiScreen_applyVolumeToRec(rec, rec.vol === undefined ? MultiScreen_getVolume(rec.rid, false) : rec.vol);
      // 出画面 → 开始盯"还在播但画面不动了"（掉线最常见的那种）
      MultiScreen_startStallWatch(rec);
    }, { once: true });

    /* 心跳 + 自愈：timeupdate 说明画面在推进；若刚提示过"卡住"而画面回来了，把提示撤掉。
       监听挂在 rec.video 上，换档时新 rec 有自己的 video，旧的一起销毁，不会累积。 */
    rec.video.addEventListener("timeupdate", function () {
      /* 同上：位置现算。用渲染时的 idx 会在换位后早退 —— 画面缓回来了也撤不掉
         rec.stalled 与提示文案，永久压在正常画面上。 */
      const pos = MultiScreen_positionOfRecord(rec);
      if (pos < 0 || rec.switching) return;
      rec.lastTick = Date.now();
      MultiScreen_clearStallTip(pos, rec);
    });
    // 起播超时兜底：到点仍未出画面就给一个可操作的提示。
    // ⚠ 换档时不提示 —— 旧流还在正常播，提示会盖在画面上（超时由 swapTimer 处理：放弃切换）
    rec.startTimer = setTimeout(function () {
      /* 位置与房间都现算：换位后 msActiveList[idx] 已经是**别的房间**，
         照着它重试等于把这一格的重试打到隔壁去（提示也会写到别人那一格）。 */
      const pos = MultiScreen_positionOfRecord(rec);
      if (pos < 0 || rec.switching || !rec.video || rec.video.readyState >= 2) return;
      if (MultiScreen_retryOnce(pos, epoch, msActiveList[pos])) return;   // 先自动重试一次
      MultiScreen_setTip(MultiScreen_slotDom(pos), "加载缓慢，可点重新加载");
    }, msStartTimeoutMs);
  } catch (e) {
    if (rec.switching) MultiScreen_abortSwap(idx, rec);
    else MultiScreen_setTip(slot, "播放器创建失败");
  }
}

/* ---------- 列表操作（对应原生 changeMultiRoomList 的四个 action） ---------- */

/* 差量同步：只有数据真的换了的槽位才重渲染，其余原样保留 → 流不重启、播放不中断。
   （原生 delete 靠"清空格子再搬 DOM"来避免重启，这里用差量达到同一目的且更稳）
   这是"拖拽/编辑过程始终流畅"的根本原因，必须保持。 */
function MultiScreen_renderAll() {
  // 必须从位置 0 开始：主画面格被换走后，位置 0 上坐的就是外房格，需要正常渲染。
  // 主画面格自身由 renderSlot 内部的身份判定挡掉，不会误碰斗鱼播放器。
  for (let i = 0; i < MS_SLOT_COUNT; i++) {
    const want = msActiveList[i] || null;
    const rec = msSlotPlayers.get(i);
    const have = rec ? rec.rid : null;
    if (!want) {
      /* 这个位置不再属于任何房间 → 清干净。
         ⚠ 判据不能只看播放器记录：关掉「合入画面」的房间本来就没有 rec（见 renderSlotNoVideo），
         但它格子里留着"画面已关闭（弹幕照常显示）"的占位 —— 只按 rec 判就会把这个占位一直留在一个
         已经没人管的位置上（实机自用一遍时看到过，虽然此刻被隐藏着不显眼，但它是颗雷）。 */
      const stale = MultiScreen_slotDom(i);
      if (have || (stale && stale.classList.contains("ms-slot--novideo"))) MultiScreen_clearSlot(i);
      continue;
    }
    if (have === String(want.rid)) continue;   // 同房不动
    MultiScreen_renderSlot(i, want);
  }
  MultiScreen_applyLayout();
}

/* 去重 + 截断上限，并保证主房间一定在列表里。
   刻意**不**把主房间强行挪回槽 0：槽位是用户可以拖拽自由排布的，强行归位会把用户
   刚摆好的版面在下次勾选时又打乱。只有 enter（开启/重开）才按原生口径让主房间占槽 0。 */
function MultiScreen_normalize(list) {
  const mainRid = MultiScreen_getMainRid();
  // 逐项清洗：脏对象 / 空 rid / 非字符串文本一律挡在这里（存储与面板两个入口共用）
  let arr = (Array.isArray(list) ? list : []).map(MultiScreen_saneItem).filter(Boolean);
  if (mainRid && !arr.some(function (r) { return String(r.rid) === mainRid; })) {
    arr = [{ rid: mainRid, nn: "", avatar: "" }].concat(arr);
  }
  const seen = {};
  const out = [];
  for (let i = 0; i < arr.length && out.length < MS_MAX_ROOMS; i++) {
    const k = String(arr[i].rid);
    if (seen[k]) continue;
    seen[k] = 1;
    out.push(arr[i]);
  }
  return out;
}

// 开启/重开时用：主房间归槽 0（原生 changeMainPlayerPosition 的等价物）
function MultiScreen_normalizeMainFirst(list) {
  const mainRid = MultiScreen_getMainRid();
  const arr = MultiScreen_normalize(list);
  if (!mainRid) return arr;
  const main = arr.filter(function (r) { return String(r.rid) === mainRid; })[0] || { rid: mainRid, nn: "", avatar: "" };
  const rest = arr.filter(function (r) { return String(r.rid) !== mainRid; });
  return [main].concat(rest);
}

/* 回到单屏时把「位置归属」也归位。
   ⚠ 真机 2026-10-26 复现（两次）：换位后主画面格坐在位置 1，退出同屏（或把外房全删掉回到单屏）
   之后 msPosOwner 仍是换位后的排列，于是 renderAll 认为"位置 0 上的格子（其实是外房格）应该显示主房间"，
   renderSlot 的主房护栏只挡"格子身份 0"，挡不住这个 → 会在 0×0 的隐藏格里给主房间再建一份流，
   一直播到下次刷新（白耗带宽、后台多一份连接）。
   解法：先把**当前映射**下的每个位置都清干净（记录、flv、外房格内容），再把格子身份复位成 [0,1,2,3,4]，
   这样位置 0 重新是主画面格，主房护栏生效，隐藏格里不会再长出第二份流。 */
function MultiScreen_settleSingleScreen() {
  if (MultiScreen_visiblePositions().length > 1) return;
  for (let i = 0; i < MS_SLOT_COUNT; i++) MultiScreen_clearSlot(i);
  MultiScreen_resetPosOwner();
  MultiScreen_clearPendingWork();   // 回到单屏 = 这一轮多屏的异步工作全部作废（对比/防抖/长按）
}

// action: "fresh" | "add" | "delete" | "close"
function MultiScreen_apply(action, payload) {
  if (action === "close") {
    // 原生：关闭时快照进 historyRoomList 供重开还原，然后清理**全部位置**
    msHistoryList = msActiveList.slice();
    msActiveList = MultiScreen_normalize([]);
    /* ⚠ 必须遍历全部位置，不能写 for (let i = 1; …)：那等于假定「位置 0 = 主画面」。
       换位后外房的记录就坐在位置 0，只清 1~4 会把它连 <video> 带 flv 实例一起留在隐藏格里继续播
       —— 真机 2026-10-26 复现：退出同屏后那一格 currentTime 16.6 → 18.1 仍在推进，白耗带宽。
       clearSlot 自己按格子身份（msPosOwner[idx] !== 0）决定要不要清内容，主画面格永远不动。 */
    for (let i = 0; i < MS_SLOT_COUNT; i++) MultiScreen_clearSlot(i);
  } else if (action === "add") {
    if (msActiveList.length >= MS_MAX_ROOMS) return MultiScreen_after();
    msActiveList = MultiScreen_normalize(msActiveList.concat([payload]));
  } else if (action === "delete") {
    MultiScreen_forgetQnCompare(payload);   // 删掉的房间从换档对比里剔除
    /* 用户 2026-10-06：只剩「1 主房 + 1 外房」时，面板上那个 × 也必须能关掉外房 ——
       关完只剩主房间就自然退回单屏，不需要先去点「退出多屏」。
       所以这里**不再**设"最少 2 个"的门槛（MS_MIN_ROOMS 只管"几个格才算多屏版面"）。 */
    msActiveList = MultiScreen_normalize(msActiveList.filter(function (r) { return String(r.rid) !== String(payload); }));
  } else {
    // fresh：传入完整列表。数据未变的槽位由差量同步保住，流不会无谓重启
    msActiveList = MultiScreen_normalize(payload);
  }
  MultiScreen_renderAll();
  /* 只剩一间房（退出同屏 / 删到只剩主房）= 回到单屏：必须在 renderAll 之后把位置归属复位，
     否则 0×0 的隐藏格里会长出主房间的第二份流（见 settleSingleScreen 的说明）。 */
  MultiScreen_settleSingleScreen();
  MultiScreen_applyLayout();
  return MultiScreen_after();
}

/* 退出/删房时把"还在路上的异步工作"一并收掉：
   · 换档对比（msQnCompare）不清掉的话，15s 后它的定时器还会弹一次「清晰度切换…」—— 那时早就退出同屏了；
   · 尺寸防抖（msAutoQnTimer）会对着已经清空的格子再算一次档位；
   · 长按计时器（msDragTimer）与自愈合并（msHealTimer）同理。 */
function MultiScreen_clearPendingWork() {
  if (msQnCompare) {
    clearTimeout(msQnCompare.timer);
    msQnCompare = null;
  }
  clearTimeout(msAutoQnTimer);
  msAutoQnTimer = 0;
  clearTimeout(msDragTimer);
  msDragTimer = null;
  clearTimeout(msHealTimer);
  msHealTimer = 0;
}

/* 删掉一个房间时把它从换档对比里剔除：否则 total 永远凑不齐，15s 后报「已确认 N/M」。 */
function MultiScreen_forgetQnCompare(rid) {
  if (!msQnCompare) return;
  const k = String(rid);
  if (!(k in msQnCompare.prev)) return;
  delete msQnCompare.prev[k];
  delete msQnCompare.done[k];
  delete msQnCompare.same[k];
  const total = Object.keys(msQnCompare.prev).length;
  if (!total) {
    clearTimeout(msQnCompare.timer);
    msQnCompare = null;
    return;
  }
  if (Object.keys(msQnCompare.done).length >= total) MultiScreen_finishQnCompare();
}

function MultiScreen_after() {
  msMultiType = MultiScreen_visiblePositions().length;
  MultiScreen_save();
  /* 进了多屏的房间都记一笔"最近看过"。按**房间身份**排除主房，不假定它坐在下标 0：
     换过位之后主房可能在下标 1，那时按下标跳 0 会把主房记进"最近看过"、还漏掉真正的外房。 */
  const mrAfter = String(MultiScreen_getMainRid());
  for (let i = 0; i < msActiveList.length && i < MS_SLOT_COUNT; i++) {
    const rr = msActiveList[i];
    if (rr && String(rr.rid) !== mrAfter) MultiScreen_pushRecent(rr);
  }
  MultiScreen_notifyChange(msActiveList.slice());
  return msActiveList;
}

function MultiScreen_enter(list) {
  // 重开还原：优先消费关闭时的快照（原生 getMultiRoomList({isReOpen:true}) 同款语义）
  let target = list;
  if (!target && msHistoryList && msHistoryList.length > 1) {
    target = msHistoryList.slice();
    msHistoryList = [];
  }
  if (!target || !target.length) target = MultiScreen_load() || [];
  // 开启/重开按原生口径把主房间放回槽 0；之后的勾选增删不再强行归位，以免打乱用户拖出来的版面
  msActiveList = MultiScreen_normalizeMainFirst(target);
  MultiScreen_resetPosOwner();   // 开启/重开时回到初始排列
  MultiScreen_renderAll();
  return MultiScreen_after();
}

function MultiScreen_exit() { return MultiScreen_apply("close"); }
function MultiScreen_addRoom(room) { return MultiScreen_apply("add", room); }
function MultiScreen_removeRoom(rid) { return MultiScreen_apply("delete", rid); }

/* 换档自检：斗鱼对同一房间在不同档位可能返回**同一个流地址**（该房间只提供一档，
   或该档位不可用）。早先换档后界面毫无反馈，看起来就像"切了但没生效"。
   这里对比换档前后拿到的地址：全部没变就明确提示，别让人以为切成功了。 */
let msQnCompare = null;
function MultiScreen_beginQnCompare(idxList) {
  const prev = {};
  idxList.forEach(function (i) {
    const rec = msSlotPlayers.get(i);
    if (!rec) return;   // 还没建记录的位置不参与这次对比
    prev[String(rec.rid)] = rec.url || "";   // 键用房间号：换位会把记录搬到别的位置
  });
  msQnCompare = { prev: prev, same: {}, done: {}, timer: 0 };
  // 兜底：某格取流失败时 done 永远凑不齐，到点就按已知情况给结论，不能一直不吭声
  msQnCompare.timer = setTimeout(function () { MultiScreen_finishQnCompare(); }, 15000);
}
function MultiScreen_noteStreamUrl(rec, url) {
  if (rec) rec.url = url || "";
  const k = rec ? String(rec.rid) : "";
  if (!msQnCompare || !k || !(k in msQnCompare.prev)) return;
  if (msQnCompare.done[k]) return;
  msQnCompare.done[k] = 1;
  if ((url || "") === msQnCompare.prev[k]) msQnCompare.same[k] = 1;
  const total = Object.keys(msQnCompare.prev).length;
  if (Object.keys(msQnCompare.done).length >= total) MultiScreen_finishQnCompare();
}

// 档位显示名（提示里用「超清」这种用户口径，不暴露 "3" 这类内部值）
function MultiScreen_qnLabel(qn) {
  for (let i = 0; i < MS_QUALITY_LIST.length; i++) {
    if (String(MS_QUALITY_LIST[i].v) === String(qn)) return MS_QUALITY_LIST[i].name;
  }
  return String(qn);
}
function MultiScreen_finishQnCompare() {
  if (!msQnCompare) return;
  const total = Object.keys(msQnCompare.prev).length;
  const doneCount = Object.keys(msQnCompare.done).length;
  const sameCount = Object.keys(msQnCompare.same).length;
  clearTimeout(msQnCompare.timer);
  msQnCompare = null;
  if (!total) return;
  // 提示一律用用户口径：不提"格子 / 流地址"，直接说画面换没换
  const qnName = MultiScreen_qnLabel(msQn);
  if (doneCount < total) {
    // 有房间还没确认到新画面（失败或还在路上）：如实说，不假装成功
    showMessage("清晰度切换：已确认 " + doneCount + "/" + total + " 个房间" + (sameCount ? "，其中 " + sameCount + " 个本来就是这一档" : ""), "info");
  } else if (sameCount >= total) {
    showMessage("其它房间本来就是「" + qnName + "」，画面没变", "info");
  } else if (sameCount > 0) {
    showMessage("其它房间已切到「" + qnName + "」，其中 " + sameCount + " 个本来就是这一档", "info");
  } else {
    showMessage("其它房间已切到「" + qnName + "」", "success");
  }
}
function MultiScreen_setQuality(qn) {
  if (!qn || String(qn) === msQn) return;
  msQn = String(qn);
  MultiScreen_save();
  // 面板/编辑条上的档位显示跟着走（面板开着时那枚胶囊与角标要立刻反映新档位）
  MultiScreen_notifyChange(msActiveList.slice());
  /* 目标位置按**房间身份**筛，不假定「位置 0 = 主画面」：换位后位置 0 上坐的可能是外房，
     而位置 1 上才是主画面格（真机 2026-10-26：选「超清」只改了角标，外房没有任何新流）。 */
  const targets = MultiScreen_externalPositions();   // 已经排除了主房与关掉画面的房间
  /* 自动档：按尺寸重拉即可，不走"换档前后对比"那套自检 —— 尺寸一变就可能换档，
     每次都弹提示反而吵；自检只在用户手动选具体档位时做。 */
  if (msQn === "auto") {
    for (let k = 0; k < targets.length; k++) MultiScreen_switchQuality(targets[k], msActiveList[targets[k]]);
    showMessage("其它房间清晰度：按每块画面的大小自动选", "success");
    return;
  }
  MultiScreen_beginQnCompare(targets);
  // 只有外房需要重拉；主画面归斗鱼原生管。走平滑换档，不黑屏。
  for (let k = 0; k < targets.length; k++) MultiScreen_switchQuality(targets[k], msActiveList[targets[k]]);
}

/* ---------- 落点判定（原生 queryCurrentBox 的等价实现） ---------- */

/* 返回**槽下标 0~4**（0 是主画面格，与布局表、槽位数组同一套编号），死区返回 -1。
   刻意不用原生那套"格子号 1~5"：那个编号比槽下标大 1，很容易在下标运算里错位一格，
   一错就变成"拖这一格却动了隔壁格"。这里全部统一成下标，只在死区用 -1 哨兵值。
   ⚠ 分区按**版面槽号**（= 有画面的格子数）算，再换算回位置：关掉画面的房间不占格，
   指针落在"第几个可见格"上必须映射到那个格子真正所在的位置，否则会拖错格。 */
function MultiScreen_hitTest(clientX, clientY, forLongPress) {
  const c = MultiScreen_getContainer();
  if (!c) return -1;
  const n = msMultiType;
  if (n < MS_MIN_ROOMS || n > MS_MAX_ROOMS) return -1;
  const r = c.getBoundingClientRect();
  if (!r.width || !r.height) return -1;
  /* 坐标必须落在容器矩形内：2 分屏的分区表没有 x 边界分支、4 分屏连 y 边界都没有，
     容器外的点击（右侧聊天区、页面留白）会被算成命中某一格 —— 长按 300ms 就会把
     格子拎起来，松手漂过界还会真的换位。四套布局统一先在矩形上钳一次。 */
  if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return -1;
  const yRel = clientY - r.top;
  if (forLongPress && yRel >= r.height - MS_BOTTOM_GUARD_PX) return -1;  // 底部控制条保护带
  const d = (clientX - r.left) / r.width;   // 归一化 x
  const p = yRel / r.height;                // 归一化 y

  // 死区与分区逐条对应原生 switch(n)；这里先得到**版面槽号**，最后统一换算成位置
  let hit = -1;
  if (n === 2) {
    if (p < 0.25 || p > 0.75) return -1;
    hit = d > 0.5 ? 1 : 0;
  } else if (n === 3) {
    if (p < 0.1713 || p > 0.8287 || d < 0.008 || d > 0.992) return -1;
    if (d < 0.664) hit = 0;
    else hit = p < 0.4993 ? 1 : 2;
  } else if (n === 4) {
    if (d < 0.5) hit = p < 0.5 ? 0 : 3;
    else hit = p < 0.5 ? 1 : 2;
  } else if (n === 5) {
    if (p < 0.014 || p > 0.986 || d < 0.095 || d > 0.905) return -1;
    if (d < 0.581) hit = p < 0.5 ? 0 : 3;
    else if (p < 0.338) hit = 1;
    else if (p < 0.662) hit = 2;
    else hit = 4;
  }
  if (hit < 0) return -1;
  const vis = MultiScreen_visiblePositions();
  return vis[hit] === undefined ? -1 : vis[hit];
}

/* ---------- 拖拽换位 ---------- */

function MultiScreen_onMouseDown(e) {
  /* 自有界面（面板 / 弹幕历史 / 重载按钮）上的按下不参与多屏拖拽：
     面板与弹幕历史浮在播放器上方，面板里的长按会穿过坐标判定把背后的格子拖起来。 */
  if (MultiScreen_isOwnUi(e.target)) return;
  if (e.button !== 0) return;
  if (!MultiScreen_isSupported() || msActiveList.length < MS_MIN_ROOMS) return;
  // 起手位置必须落在多屏容器的有效格子里：容器外的点击一概不管。
  // 用坐标而非 e.target 判定 —— 播放器区域最上层是 #__h5player 这个
  // 全屏透明但 pointer-events:auto 的覆盖层（见 MultiScreen_getHost 注释），
  // 它既不在容器内也不是容器的祖先，用 target 判定会永远落空。
  if (MultiScreen_hitTest(e.clientX, e.clientY, true) < 0) return;
  if (e.target && e.target.closest && e.target.closest(".ms-slot__reload")) return;
  clearTimeout(msDragTimer);
  const x = e.clientX, y = e.clientY;
  msDragTimer = setTimeout(function () {
    if (msDrag) return;
    const slot = MultiScreen_hitTest(x, y, true);
    if (slot < 0) return;   // 这 300ms 里容器尺寸可能变了，再确认一次
    MultiScreen_beginDrag(x, y, slot);
  }, MS_LONGPRESS_MS);
}

function MultiScreen_beginDrag(startX, startY, idx) {
  const c = MultiScreen_getContainer();
  if (!c || msDrag) return;
  const slotEl = MultiScreen_slotDom(idx);
  if (!slotEl) return;
  const r = c.getBoundingClientRect();

  // 占位块：留在原槽位作为"这里空了"的视觉标记（原生同款外观）。刻意不带 is-multiN 类，
  // 否则按类名定位槽位时会命中占位块
  const ph = document.createElement("div");
  ph.className = "layout-Player-multiPlayer ms-slot--placeholder";
  // 占位块摆在"这格在版面上的位置"（版面槽号），不是房间位置 —— 关掉画面的房间不占格
  const k = MultiScreen_layoutSlotOf(idx);
  const g = k >= 0 ? (MS_LAYOUT[msMultiType] || [])[k] : null;
  if (g) {
    ph.style.top = g[0] + "%"; ph.style.left = g[1] + "%";
    ph.style.width = g[2] + "%"; ph.style.height = g[3] + "%";
    ph.style.zIndex = String(MS_SLOT_Z[k]);
  }
  c.insertBefore(ph, slotEl);

  msDrag = { from: idx, to: idx, slotEl: slotEl, placeholder: ph };
  slotEl.classList.add("dragging-player", "ms-slot--dragging");  // 原生样式：固定 416x234 + 中心跟随
  c.classList.add("is-dragging");                                // 原生：拖拽中禁一切过渡
  MultiScreen_moveDragEl(startX - r.left, startY - r.top);
  c.appendChild(slotEl);                                         // 提到末尾保证绘制在最上
}

function MultiScreen_moveDragEl(x, y) {
  const c = MultiScreen_getContainer();
  if (!msDrag || !c) return;
  if (!c.contains(msDrag.slotEl)) c.appendChild(msDrag.slotEl);
  msDrag.slotEl.style.left = x + "px";
  msDrag.slotEl.style.top = y + "px";
}

function MultiScreen_setCur(idx, on) {
  if (idx < 0) return;
  const slot = MultiScreen_slotDom(idx);
  if (!slot) return;
  // 原生只挂 is-cur，而样式表只有 .cur（高亮实际失效）；两个都挂才能真的亮起来
  if (on) { slot.classList.add("is-cur", "cur"); }
  else { slot.classList.remove("is-cur", "cur"); }
}

function MultiScreen_onMouseMove(e) {
  if (!msDrag) return;
  const c = MultiScreen_getContainer();
  if (!c) return;
  const r = c.getBoundingClientRect();
  MultiScreen_moveDragEl(e.clientX - r.left, e.clientY - r.top);

  const hit = MultiScreen_hitTest(e.clientX, e.clientY, false);
  if (hit === msDrag.to) return;
  MultiScreen_setCur(msDrag.to, false);
  msDrag.to = hit;
  MultiScreen_setCur(hit, true);   // 落点变化即更新，无节流（原生同款）
}

/* 指针离开文档 / 窗口失焦：按"取消拖拽"收尾。
   真机上把鼠标拖出浏览器窗口再松手，document 收不到 mouseup → msDrag 永不复位，
   之后 applyLayout 全程早退（"拖拽中不抢内联样式"），整个版面直接冻住，只能刷新。 */
function MultiScreen_onPointerLost() {
  clearTimeout(msDragTimer);
  const drag = msDrag;
  if (!drag) return;
  msDrag = null;                 // 先复位：cancelDrag 末尾的 applyLayout 会检查它
  MultiScreen_cancelDrag(drag);
}

function MultiScreen_onMouseUp(e) {
  // 定时器必须先取消：mousemove/mouseup 是常驻绑定的，若只在拖拽中才处理，
  // "按一下立刻松开"这种没进拖拽的情况就没有任何东西能取消长按定时器，
  // 手已经松开了 300ms 后仍会凭空进入拖拽态并一直卡住
  clearTimeout(msDragTimer);
  if (e.button !== 0) return;
  if (!msDrag) return;
  const drag = msDrag;
  msDrag = null;

  const to = MultiScreen_hitTest(e.clientX, e.clientY, false);
  // 落死区 或 原地松手 → 取消
  // （原生"原地松手会把该格 DOM 从容器摘掉"是缺陷，这里正确还原）
  if (to < 0 || to === drag.from) { MultiScreen_cancelDrag(drag); return; }
  MultiScreen_swapSlots(drag.from, to, drag);
}

function MultiScreen_cancelDrag(drag) {
  const c = MultiScreen_getContainer();
  MultiScreen_setCur(drag.to, false);
  drag.slotEl.classList.remove("dragging-player", "ms-slot--dragging");
  drag.slotEl.style.removeProperty("left");
  drag.slotEl.style.removeProperty("top");
  if (drag.placeholder && drag.placeholder.parentNode) {
    drag.placeholder.parentNode.insertBefore(drag.slotEl, drag.placeholder);
    drag.placeholder.remove();
  }
  if (c) c.classList.remove("is-dragging");
  MultiScreen_applyLayout();
}

/* 交换两个槽位。**只交换 className，绝不搬动 DOM 节点**：
   槽位的位置完全由类名决定（.is-multiN 决定第 N 格，主画面格是 .layout-Player-videoEntity
   且没有 is-multiN），所以交换类名 = 交换位置，而每个格子里的 <video> 与 flv 实例
   原地不动。这是"拖拽换位时流不中断、播放不闪断"的根本原因。
   若改成搬 DOM 节点，位置不会变（类名还在原地），而且 <video> 一旦被 reparent
   多数浏览器会重置播放——两条都是必须避开的坑。 */
function MultiScreen_swapSlots(a, b, drag) {
  const c = MultiScreen_getContainer();
  const slotA = drag.slotEl;                 // 起手格（拖拽中它已被 append 到容器末尾）
  const slotB = MultiScreen_slotDom(b);      // 落点格
  if (!c || !slotA || !slotB || slotA === slotB) { MultiScreen_cancelDrag(drag); return; }
  MultiScreen_setCur(b, false);
  // 拖拽态是临时的，不参与换位
  slotA.classList.remove("dragging-player", "ms-slot--dragging");
  slotB.classList.remove("dragging-player", "ms-slot--dragging");
  slotA.style.removeProperty("left");
  slotA.style.removeProperty("top");

  // 拖动时把它挪到了容器末尾，放回原位（DOM 顺序不影响定位，只为保持结构稳定）
  if (drag.placeholder && drag.placeholder.parentNode) {
    drag.placeholder.parentNode.insertBefore(slotA, drag.placeholder);
    drag.placeholder.remove();
  }
  c.classList.remove("is-dragging");

  // 三者必须同步交换：位置归属、数据、播放器记录。格子节点本身不动、类名不变，
  // 所以 flv 实例与流都不中断，斗鱼 React 那一侧也毫无感知。
  MultiScreen_swapSlotState(a, b);
  // 位置是内联样式驱动的，必须立刻重算，否则旧的内联值会把元素钉在原处。
  // 容器的 is-dragging 已摘掉，0.2s 的 --Multi-player-transition 会把两格滑到新位置。
  MultiScreen_applyLayout();

  setTimeout(function () {
    MultiScreen_save();
    MultiScreen_notifyChange(msActiveList.slice());
  }, MS_SWAP_DELAY_MS);
}

function MultiScreen_swapSlotState(a, b) {
  // 位置归属
  const tmpOwner = msPosOwner[a];
  msPosOwner[a] = msPosOwner[b];
  msPosOwner[b] = tmpOwner;
  // 播放器记录（跟随格子身份走，所以是"位置上的记录对调"）
  const ra = msSlotPlayers.get(a);
  const rb = msSlotPlayers.get(b);
  if (rb) msSlotPlayers.set(a, rb); else msSlotPlayers.delete(a);
  if (ra) msSlotPlayers.set(b, ra); else msSlotPlayers.delete(b);
  // 数据
  const arr = msActiveList.slice();
  const tmp = arr[a];
  arr[a] = arr[b];
  arr[b] = tmp;
  msActiveList = arr;
}

/* ---------- 点击格子 ---------- */

/* 自有界面的一律不参与"点格子"判定。
   实测踩过的坑：点击处理挂在 document 上、只按坐标判格子，于是点编辑条里的画质档位、
   点格子里的"重新加载"按钮，都会冒泡上来被当成"点了格子"→ 开出对应直播间的新标签页。
   这里先把自有界面整片排除掉，再按坐标判定。 */
const MS_OWN_UI_SELECTOR = [
  ".ms-slot__reload",
  ".popup-player-panel",
  ".popup-player",
  ".ex-panel__wrap",
  ".miuix-modal",
  ".danmaku-history-panel"
].join(",");

function MultiScreen_isOwnUi(target) {
  if (!target) return false;
  if (target.closest) return !!target.closest(MS_OWN_UI_SELECTOR);
  // document 之类的节点没有 closest，按 contains 兜底
  return !!(target.querySelector && target.querySelector(MS_OWN_UI_SELECTOR));
}

function MultiScreen_onClick(e) {
  if (e.button !== undefined && e.button !== 0) return;
  if (!MultiScreen_isSupported()) return;
  if (MultiScreen_isOwnUi(e.target)) return;
  const idx = MultiScreen_hitTest(e.clientX, e.clientY, false);
  if (idx < 0) return;                                   // 死区或容器外
  // 格子的 UI 在容器里，而容器上方压着全屏透明的 #__h5player（见 getHost 注释），
  // 所以"重新加载"按钮其实点不到 —— 这里按坐标代理它。
  if (MultiScreen_handleReloadHit(idx, e.clientX, e.clientY)) return;
  if (idx === 0) return;                                 // 主画面格不接管
  const room = msActiveList[idx];
  if (!room) return;
  if (typeof msOnSlotClick === "function") msOnSlotClick(idx, room);
  if (MS_CLICK_SWAP_TO_MAIN) {
    // 点小格把它与位置 0 互换（不跳转、不重启流：只换位置归属与几何）
    MultiScreen_swapSlotState(0, idx);
    MultiScreen_applyLayout();
    MultiScreen_save();
    MultiScreen_notifyChange(msActiveList.slice());
  }
  // 刻意**不跳转**：原生多屏点格子不会离开当前页（早先这里 window.open 开新标签，
  // 与原生行为不符，也让人误以为"点哪儿都跳转"）。想改成"点格子把它换到主画面"见
  // MS_CLICK_SWAP_TO_MAIN 开关（见文件头常量）。
}

// 命中"重新加载"按钮的热区就代为触发；返回 true 表示这次点击已被消费
function MultiScreen_handleReloadHit(idx, x, y) {
  const slot = MultiScreen_slotDom(idx);
  if (!slot) return false;
  const btn = slot.querySelector(".ms-slot__reload.is-visible");
  if (!btn) return false;
  const r = btn.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  if (x < r.left || x > r.right || y < r.top || y > r.bottom) return false;
  btn.click();
  return true;
}

/* ---------- 持久化 ---------- */

/* 「最近看过」：斗鱼没有可用的公开"最近观看"接口（项目里也没有既有数据源），
   所以这里维护一份本地列表，凡进过多屏的房间都按"最新在前"记一笔。
   上限 20 条，按 rid 去重，同名房间只保留最近一次。 */
const MS_RECENT_MAX = 20;

function MultiScreen_pushRecent(room) {
  if (!room || !room.rid) return;
  let list = MultiScreen_getRecentRaw();
  const rid = String(room.rid);
  list = list.filter(function (r) { return String(r.rid) !== rid; });
  list.unshift({ rid: rid, nn: room.nn || "", avatar: room.avatar || "" });
  if (list.length > MS_RECENT_MAX) list = list.slice(0, MS_RECENT_MAX);
  try { localStorage.setItem("ExSave_MultiScreenRecent", JSON.stringify(list)); } catch (e) {}
}

function MultiScreen_getRecentRaw() {
  try {
    const raw = localStorage.getItem("ExSave_MultiScreenRecent");
    const j = raw ? JSON.parse(raw) : null;
    return Array.isArray(j) ? j.filter(function (r) { return r && r.rid; }) : [];
  } catch (e) { return []; }
}

// 对外：排除已在多屏里的房间，返回可直接当房池用的列表
function MultiScreen_getRecent() {
  const active = {};
  msActiveList.forEach(function (r) { active[String(r.rid)] = 1; });
  return MultiScreen_getRecentRaw().filter(function (r) { return !active[String(r.rid)]; });
}

function MultiScreen_save() {
  try {
    localStorage.setItem("ExSave_MultiScreen", JSON.stringify({
      list: msActiveList.map(MultiScreen_roomRecord),
      qn: msQn,
    }));
  } catch (e) {}
  MultiScreen_rememberForMainRoom();
}

/* ---------- 按主房间记忆多屏配置 ---------- */
/*
 * 用户 2026-09-30 定：在 A 房间开过"多屏 = A+B+C"，下次再进 A 房间要能一键恢复。
 * 存法 { 主房rid: { rooms: [外房...], at } }（主房隐含在键里，不重复存）。
 * 每房间的音量偏好另存在 ExSave_MultiScreenVol（按房间号，跨主房通用）。
 */
const MS_BYROOM_KEY = "ExSave_MultiScreenByRoom";
let msByRoom = null;

function MultiScreen_loadByRoom() {
  if (msByRoom) return msByRoom;
  msByRoom = {};
  try {
    const j = JSON.parse(localStorage.getItem(MS_BYROOM_KEY) || "null");
    if (j && typeof j === "object" && !Array.isArray(j)) msByRoom = j;
  } catch (e) { msByRoom = {}; }
  return msByRoom;
}

/* 每次列表变化都记一笔 —— 但**只在真的有多屏配置时覆盖**：
   退出多屏（单屏）不该抹掉"这个房间上次的配置"，否则一键恢复永远没得恢复。
   记录很小（几个房间号），不必清理。 */
function MultiScreen_rememberForMainRoom() {
  const main = MultiScreen_getMainRid();
  if (!main) return;
  const foreign = msActiveList.slice(1).map(MultiScreen_roomRecord);
  if (!foreign.length) return;   // 单屏状态：不覆盖、也不清空
  const store = MultiScreen_loadByRoom();
  store[main] = { rooms: foreign, at: Date.now() };
  try { localStorage.setItem(MS_BYROOM_KEY, JSON.stringify(store)); } catch (e) {}
}

// 该主房上次的多屏配置；没有、或与当前列表完全一致（不用提示）时返回 null
function MultiScreen_savedConfigForMainRoom() {
  const main = MultiScreen_getMainRid();
  const rec = MultiScreen_loadByRoom()[main];
  if (!rec || !Array.isArray(rec.rooms) || !rec.rooms.length) return null;
  const cur = msActiveList.slice(1).map(function (r) { return String(r.rid); }).join(",");
  const saved = rec.rooms.map(function (r) { return String(r.rid); }).join(",");
  if (cur === saved) return null;
  return rec.rooms.slice(0, MS_MAX_ROOMS - 1);
}

function MultiScreen_load() {
  try {
    const raw = localStorage.getItem("ExSave_MultiScreen");
    if (!raw) return null;
    const j = JSON.parse(raw);
    const qn = MultiScreen_saneQn(j && j.qn);
    if (qn) msQn = qn;                              // 脏档位直接忽略（保持当前值，通常是 auto）
    const rawList = (j && Array.isArray(j.list)) ? j.list : [];
    const list = [];
    rawList.forEach(function (r) {
      const it = MultiScreen_saneItem(r);
      if (it) list.push(it);
    });
    return list.length > 1 ? list.slice(0, MS_MAX_ROOMS) : null;
  } catch (e) { return null; }
}

/* ---------- 自愈：槽位被页面重建时把格子补回来 ---------- */

/* 实测（2288 房间，重载后立即注入）真实发生过：斗鱼在播放器初始化/切房的时机会**重建容器里的
   槽位节点**，于是内联尺寸与格子内容一起丢掉，而容器类名还留着 is-multiN —— 表现为格子
   静默塌回一格，用户看不出原因。这里监听容器的子节点变化，把布局重算一遍；若某格连播放器
   节点都没了（说明确实被重建），再把那一格重新渲染。拖拽期间我们自己在改子节点，必须跳过。 */
let msHealTimer = 0;
let msWatched = null;
let msObserver = null;
let msListenersBound = false;

function MultiScreen_watchContainer() {
  const c = MultiScreen_getContainer();
  if (!c || typeof MutationObserver === "undefined" || msWatched === c) return;
  if (msObserver) msObserver.disconnect();
  msWatched = c;
  msObserver = new MutationObserver(function () {
    if (msDrag) return;            // 拖拽期间改子节点是预期行为，不能自愈
    if (msHealTimer) return;       // 合并短时间内的连续变化
    msHealTimer = setTimeout(function () {
      msHealTimer = 0;
      MultiScreen_heal();
    }, 250);
  });
  msObserver.observe(c, { childList: true });
}

function MultiScreen_heal() {
  if (msDrag) return;
  if (!MultiScreen_getContainer() || msActiveList.length < MS_MIN_ROOMS) return;
  const slots = MultiScreen_slots();
  // 只看 .ms-slot__video 是否存在，避免误伤正在播放的格子（重建会连它一起带走）
  const needRender = [];
  for (let i = 0; i < msActiveList.length && i < MS_SLOT_COUNT; i++) {
    if (msPosOwner[i] === 0) continue;   // 主画面格的内容归斗鱼，永远不重渲染
    // 槽位还没建出来也算需要渲染：renderSlot 内部取不到节点会直接返回，下一次变化再试
    // ⚠ 关掉了「合入画面」的格子本来就没有 .ms-slot__video，它是有意为之，不能被自愈当成"丢了"
    if (slots[i] && slots[i].classList.contains("ms-slot--novideo")) continue;
    if (!slots[i] || !slots[i].querySelector(".ms-slot__video")) needRender.push(i);
  }
  MultiScreen_applyLayout();
  needRender.forEach(function (i) {
    MultiScreen_renderSlot(i, msActiveList[i]);
  });
}

/* ---------- SPA 换房 / 播放器被重建后的收手 ---------- */
/* 斗鱼是 SPA：换房（或播放器初始化）时整棵播放器 DOM 会被重建，旧容器变成游离节点。
   旧记录里的 <video> 随之脱离文档，但 flv.js 仍在按旧地址拉流（用户看不到任何画面、带宽一直烧），
   看门狗 interval 也还在空转。这里每秒核一次"我们正在用的容器还在不在树上"：不在了就整体收手 ——
   销毁全部记录、清掉异步工作、列表退回单屏、通知订阅者（合并侧据此断开所有 socket）。
   宁可让用户重新开一次同屏，也不留"半死不活"的状态。 */
let msSwapPatrolTimer = 0;
let msSwapMissTicks = 0;   // 连续多少次巡检发现容器不在树上（过滤 React 过渡态里的"摘下再放回"）

function MultiScreen_teardownForPlayerSwap() {
  for (let i = 0; i < MS_SLOT_COUNT; i++) MultiScreen_clearSlot(i);
  MultiScreen_clearPendingWork();
  if (msObserver) { try { msObserver.disconnect(); } catch (e) {} }
  msObserver = null;
  msWatched = null;
  msContainer = null;
  msActiveList = MultiScreen_normalize([]);   // 只留当前房间这一条
  msHistoryList = [];                          // 旧房间的快照不能再拿去"重开还原"
  MultiScreen_resetPosOwner();
  msMultiType = 0;
  MultiScreen_save();
  MultiScreen_notifyChange(msActiveList.slice());
}

function MultiScreen_checkPlayerSwap() {
  if (!msContainer) return false;
  if (msContainer.isConnected) { msSwapMissTicks = 0; return false; }
  /* 页面里已经站着**另一个**容器 = 播放器确实被整体重建了，立刻收手；
     只是"暂时不在了"（React 过渡态会短暂摘下再放回）则要连续 3 次巡检（1.5s）才认账，
     否则一次重排就把好好的同屏拆了。 */
  const fresh = document.getElementById("js-player-multiContainer");
  if (fresh && fresh !== msContainer) {
    msSwapMissTicks = 0;
    if (msActiveList.length >= MS_MIN_ROOMS) {
      MultiScreen_teardownForPlayerSwap();
      return true;
    }
    msContainer = null;
    return false;
  }
  msSwapMissTicks++;
  if (msSwapMissTicks < 3) return false;
  msSwapMissTicks = 0;
  if (msActiveList.length < MS_MIN_ROOMS) {
    msContainer = null;                        // 单屏状态：没有资源要收，下次重新取容器即可
    return false;
  }
  MultiScreen_teardownForPlayerSwap();
  return true;
}

/* ---------- 入口 ---------- */

/* 绑监听 + 挂观察 + 落到当前状态。与"是否受支持"分开，便于轮询里重复调用。 */
function MultiScreen_bindOnce() {
  // 幂等：重复初始化会把同一批监听注册多遍，于是"点一下格子开出两个标签页"
  if (!msListenersBound) {
    msListenersBound = true;
    document.addEventListener("mousedown", MultiScreen_onMouseDown);
    document.addEventListener("click", MultiScreen_onClick);
    document.addEventListener("mousemove", MultiScreen_onMouseMove);
    document.addEventListener("mouseup", MultiScreen_onMouseUp);
    // 指针丢了也要收尾（见 MultiScreen_onPointerLost 的注释）
    document.addEventListener("mouseleave", MultiScreen_onPointerLost);
    window.addEventListener("blur", MultiScreen_onPointerLost);
    // 窗口缩放会改变格子像素尺寸 → 自动档需要重新核（防抖，且只在档位变化时重拉）
    window.addEventListener("resize", MultiScreen_onResize);
  }
  MultiScreen_watchContainer();
  // 慢巡检：容器被页面重建（SPA 换房）后要整体收手，见 MultiScreen_checkPlayerSwap
  if (!msSwapPatrolTimer) msSwapPatrolTimer = setInterval(MultiScreen_checkPlayerSwap, 500);
  MultiScreen_applyLayout();
  // 清掉可能残留在主画面格上的状态类（早期版本按位置清理时会误加）
  const mainCell = MultiScreen_slots()[msPosOwner.indexOf(0)];
  if (mainCell) mainCell.classList.remove("ms-slot--loading", "ms-slot--notice");
  // 已经从持久化恢复了多屏列表的话，把格子一并渲染出来
  if (msActiveList.length > 1) MultiScreen_renderAll();
}

function initPkg_PopupPlayer_MultiScreen() {
  MultiScreen_load();
  /* 排障入口挂到**页面 window**：TM 沙箱里 window.* 用户在控制台读不到（同弹幕那侧的教训），
     且必须挂在 init 阶段 —— 同一句放模块顶层实测不生效。 */
  try {
    const W = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
    W.MultiScreen_getQnReport = window.MultiScreen_getQnReport;
  } catch (e) {}
  /* 播放器 DOM 不一定在脚本初始化时就已经就绪。实测（2288 房间，重载后立即注入）：
     容器存在、主画面格也在，但 is-multi2~is-multi5 还没建出来，于是"受支持"判定为假、
     整个多屏静默失效（监听没绑、格子没渲染，看起来就像功能根本没生效）。
     按项目既有做法（initPkg_FollowList 那种）轮询等待，等到就接上，等不到再放弃。
     测试 DOM 里 5 个槽位齐备，这里第一次调用就会成功。 */
  if (MultiScreen_isSupported()) {
    MultiScreen_bindOnce();
    return;
  }
  let tries = 0;
  const timer = setInterval(function () {
    tries++;
    if (MultiScreen_isSupported()) {
      clearInterval(timer);
      MultiScreen_bindOnce();
      return;
    }
    if (tries >= 40) clearInterval(timer);
  }, 1000);
}

window.MultiScreen_enter = MultiScreen_enter;
window.MultiScreen_exit = MultiScreen_exit;
window.MultiScreen_addRoom = MultiScreen_addRoom;
window.MultiScreen_removeRoom = MultiScreen_removeRoom;
window.MultiScreen_setQuality = MultiScreen_setQuality;
window.MultiScreen_isSupported = MultiScreen_isSupported;
window.MultiScreen_getList = function () { return msActiveList.slice(); };
window.MultiScreen_getQuality = function () { return msQn; };
window.MultiScreen_pickQnForSlot = MultiScreen_pickQnForSlot;
window.MultiScreen_qnFor = MultiScreen_qnFor;
window.MultiScreen_getVolume = MultiScreen_getVolume;
window.MultiScreen_setVolume = MultiScreen_setVolume;
window.MultiScreen_setRoomFlag = MultiScreen_setRoomFlag;
window.MultiScreen_isRoomOn = MultiScreen_isRoomOn;
window.MultiScreen_roomQnName = MultiScreen_roomQnName;
window.MultiScreen_getMetaName = MultiScreen_getMetaName;
window.MultiScreen_resolveRoom = MultiScreen_resolveRoom;
window.MultiScreen_slotIndexOfRid = MultiScreen_slotIndexOfRid;
window.MultiScreen_roomRecord = MultiScreen_roomRecord;
window.MultiScreen_savedConfigForMainRoom = MultiScreen_savedConfigForMainRoom;
window.MultiScreen_getQnReport = MultiScreen_getQnReport;
window.MultiScreen_reapplyAutoQuality = MultiScreen_reapplyAutoQuality;
window.MultiScreen_switchQuality = MultiScreen_switchQuality;
window.MultiScreen_finishSwap = MultiScreen_finishSwap;
window.MultiScreen_abortSwap = MultiScreen_abortSwap;
window.MultiScreen_destroyPlayer = MultiScreen_destroyPlayer;
window.MS_SWAP_TIMEOUT_MS = MS_SWAP_TIMEOUT_MS;
window.MS_QN_AUTO_TIERS = MS_QN_AUTO_TIERS;
window.MS_STALL_TICK_MS = MS_STALL_TICK_MS;
window.MS_STALL_QUIET_MS = MS_STALL_QUIET_MS;
/* 排障入口：把掉线看门狗压到毫秒级（自检用；真机复现"画面卡住"也可以先压低再断网，
   不必干等 8 秒）。生产默认值就是 MS_STALL_TICK_MS / MS_STALL_QUIET_MS。 */
window.MultiScreen_setStallTimings = function (tickMs, quietMs) {
  const t = Number(tickMs);
  const q = Number(quietMs);
  if (t >= 20) msStallTickMs = t;
  if (q >= 40) msStallQuietMs = q;
};
/* 排障/自检入口：把起播超时兜底压到毫秒级（生产默认 8s）。与 MultiScreen_setStallTimings 同款 ——
   测"超时 → 自动重试"这条链路时不必干等 8 秒。 */
/* 排障/自检入口：一次列出内部状态（列表几条、还剩几个播放记录、哪些定时器还挂着、位置归属）。
   真机复现"退出/切房后还有东西在跑"时，控制台一句 MultiScreen_getInternalState() 就能定位。 */
window.MultiScreen_getInternalState = function () {
  let players = 0, stallTimers = 0, startTimers = 0, retryTimers = 0, swapTimers = 0;
  msSlotPlayers.forEach(function (rec) {
    if (!rec) return;
    players++;
    if (rec.stallTimer) stallTimers++;
    if (rec.startTimer) startTimers++;
    if (rec.retryTimer) retryTimers++;
    if (rec.swapTimer) swapTimers++;
  });
  return {
    list: msActiveList.length,
    players: players,
    stallTimers: stallTimers,
    startTimers: startTimers,
    retryTimers: retryTimers,
    swapTimers: swapTimers,
    qnCompare: !!msQnCompare,
    qnCompareTotal: msQnCompare ? Object.keys(msQnCompare.prev).length : 0,
    autoQnTimer: !!msAutoQnTimer,
    healTimer: !!msHealTimer,
    dragging: !!msDrag,
    posOwner: msPosOwner.slice(),
    quality: msQn,
    supported: MultiScreen_isSupported(),
  };
};
window.MultiScreen_setStartTimeout = function (ms) {
  const n = Number(ms);
  if (n >= 20) msStartTimeoutMs = n;
};
window.MultiScreen_onChange = function (fn) {
  // 多播订阅：重复注册同一个函数只记一次
  if (typeof fn === "function" && msOnChangeList.indexOf(fn) < 0) msOnChangeList.push(fn);
};
window.MultiScreen_onSlotClick = function (fn) { msOnSlotClick = fn; };
window.MultiScreen_hitTest = MultiScreen_hitTest;
window.MultiScreen_getHost = MultiScreen_getHost;
window.MultiScreen_slots = MultiScreen_slots;
window.MultiScreen_getRecent = MultiScreen_getRecent;
window.MultiScreen_pushRecent = MultiScreen_pushRecent;
window.MultiScreen_QUALITY_LIST = MS_QUALITY_LIST;
