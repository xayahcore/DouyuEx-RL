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

/* 点小格的行为：**默认什么都不做**，与原生一致（原生多屏点格子不会离开当前页）。
   想改成点小格把它换到主画面，把下面这个开关打开即可（走位置互换，不跳转）。 */
const MS_CLICK_SWAP_TO_MAIN = false;

/* 清晰度档位。getRealLive_Douyu 的约定：0=蓝光4M 1=流畅 2=高清 3=超清 */
const MS_QUALITY_LIST = [
  { v: "0", name: "蓝光4M" },
  { v: "3", name: "超清" },
  { v: "2", name: "高清" },
  { v: "1", name: "流畅" },
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
let msQn = MS_QUALITY_LIST[0].v;
let msEpoch = 0;                // 每次重渲染 +1，用于丢弃过期异步回调
let msDrag = null;
let msDragTimer = null;
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

/* 播放器区域最上层压着 #__h5player —— 一个全屏透明但 pointer-events:auto 的旧播放器树。
   它会把鼠标事件全部吃掉，后果是**连原生弹幕的悬停菜单、用户卡片、弹幕点击都点不出来**
   （用户反馈"没办法点击用户或弹幕出现本来该有的功能"就是这个）。多屏开启期间把它放行，
   关掉多屏时恢复原样。控制条是它上面的独立层，不受影响。 */
const MS_LEGACY_OVERLAY_ID = "__h5player";
let msOverlayPatched = null;

function MultiScreen_setOverlayPassthrough(on) {
  const ov = document.getElementById(MS_LEGACY_OVERLAY_ID);
  if (!ov) return;
  if (on) {
    if (msOverlayPatched === ov) return;
    ov.style.pointerEvents = "none";
    ov.setAttribute("data-ex-ms-passthrough", "1");
    msOverlayPatched = ov;
  } else {
    if (msOverlayPatched !== ov) return;
    ov.style.removeProperty("pointer-events");
    ov.removeAttribute("data-ex-ms-passthrough");
    msOverlayPatched = null;
  }
}

function MultiScreen_slotDom(idx) {
  return MultiScreen_slots()[idx] || null;
}

function MultiScreen_isSupported() {
  if (!MultiScreen_getContainer()) return false;
  const s = MultiScreen_slots();
  for (let i = 0; i < MS_SLOT_COUNT; i++) if (!s[i]) return false;
  return true;
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
  msMultiType = msActiveList.length;
  // 与原生一致：>1 才加 is-multi；否则回到普通单屏
  if (msMultiType > 1) {
    c.className = "layout-Player-multiContainer is-multi is-multi" + msMultiType;
  } else {
    c.className = "layout-Player-multiContainer";
  }
  const table = MS_LAYOUT[msMultiType];
  /* 单屏状态（没开多屏或只剩一个房间）：**完全交回原生**，一格的内联尺寸都不要碰。
     实测线上教训：以前这里走的是"失活位置一律清零隐藏"的分支，于是单屏时把全部 5 个槽位
     都写成了 width:0;height:0;visibility:hidden —— 连主画面格一起，整块播放器区域变成零尺寸，
     后果是原生弹幕飘屏直接不再出现（引擎的轨道数按容器尺寸算，0 高就是 0 轨），
     而画面上看起来"什么都没发生"。 */
  MultiScreen_setOverlayPassthrough(msMultiType > 1);
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
  slots.forEach(function (slot, i) {
    if (!slot) return;
    if (!table || i >= table.length) {
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
    const g = table[i];
    slot.style.top = g[0] + "%";
    slot.style.left = g[1] + "%";
    slot.style.width = g[2] + "%";
    slot.style.height = g[3] + "%";
    slot.style.zIndex = String(MS_SLOT_Z[i]);
    // 原生靠 .is-multiN 后代规则放开槽位的 scale(0)+hidden；宿主样式缺失时内联兜底
    slot.style.transform = "scale(1)";
    slot.style.visibility = "visible";
  });
}

/* ---------- 单格渲染 ---------- */

function MultiScreen_clearSlot(idx) {
  const rec = msSlotPlayers.get(idx);
  if (rec) {
    try { if (rec.flv && typeof rec.flv.destroy === "function") rec.flv.destroy(); } catch (e) {}
    clearTimeout(rec.reloadTimer);
    clearTimeout(rec.startTimer);
    msSlotPlayers.delete(idx);
  }
  const slot = MultiScreen_slotDom(idx);
  if (!slot) return;
  // 判定依据是**格子身份**而不是位置：主画面格（身份 0）里是斗鱼自己的播放器，
  // 换位可能把它挪到任意位置，一旦按位置去"清空"就会把播放器 DOM 连根拔掉
  // （实测：换位后 #__video2 消失、主房间加载出错）。只清我们自己的状态类，内容从不动它。
  if (msPosOwner[idx] !== 0) slot.innerHTML = "";
  slot.classList.remove("ms-slot--loading", "ms-slot--notice", "is-cur", "cur", "dragging-player", "ms-slot--dragging");
}

function MultiScreen_renderSlot(idx, room) {
  const slot = MultiScreen_slotDom(idx);
  if (!slot || !room) return;
  // 主画面格（身份 0）里是斗鱼原生播放器，永远不往里写东西 —— 注意判的是身份不是位置：
  // 换位后它可能在任意位置上，而任意位置上也可能坐着外房格（那种情况要正常渲染）。
  if (msPosOwner[idx] === 0) return;
  MultiScreen_clearSlot(idx);

  const epoch = ++msEpoch;
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
  };
  // 外房一律静音：只有当前直播间的原生播放器出声，避免几路声音叠在一起
  if (rec.video) {
    rec.video.muted = true;
    rec.video.volume = 0;
    rec.video.setAttribute("muted", "");
  }
  msSlotPlayers.set(idx, rec);

  MultiScreen_fillName(slot, room);
  const reloadEl = slot.querySelector(".ms-slot__reload");
  reloadEl.addEventListener("click", function (e) {
    e.stopPropagation();
    MultiScreen_renderSlot(idx, room);
  });
  // 「重新加载」按钮 3 秒后才出现（原生阈值）
  rec.reloadTimer = setTimeout(function () {
    if (msSlotPlayers.get(idx) === rec) reloadEl.classList.add("is-visible");
  }, MS_RELOAD_BTN_MS);

  MultiScreen_resolveRoom(room, function (meta) {
    if (msSlotPlayers.get(idx) !== rec) return;   // 已被重渲染/清空，丢弃过期回调
    MultiScreen_fillName(slot, meta);
    // betard 能给出"未开播"就直接落文案，省掉一次注定失败的取流
    if (+meta.showStatus === 2) { MultiScreen_setTip(slot, "主播正在赶来中…"); return; }
    MultiScreen_fetchStream(idx, meta, epoch);
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

function MultiScreen_fetchStream(idx, room, epoch) {
  const rec = msSlotPlayers.get(idx);
  if (!rec || rec.epoch !== epoch) return;
  const slot = MultiScreen_slotDom(idx);
  if (typeof getRealLive_Douyu !== "function") { MultiScreen_setTip(slot, "取流失败，可点重新加载"); return; }
  getRealLive_Douyu(String(room.rid), true, false, msQn, function (url) {
    const cur = msSlotPlayers.get(idx);
    if (!cur || cur.epoch !== epoch) return;
    if (!url || url === "None") { MultiScreen_setTip(slot, "房间未开播或其他错误"); return; }
    MultiScreen_startFlv(idx, url, epoch);
  });
}

function MultiScreen_startFlv(idx, url, epoch) {
  const rec = msSlotPlayers.get(idx);
  if (!rec || rec.epoch !== epoch) return;
  MultiScreen_noteStreamUrl(idx, url);
  const slot = MultiScreen_slotDom(idx);
  if (!rec.video) { MultiScreen_setTip(slot, "播放器未就绪"); return; }
  // flv.js 已由 @require 预注入；只有真的缺失时才按需加载，避免重复 eval 覆盖全局
  if (typeof flvjs === "undefined" && typeof ExLoadLib === "function" && typeof EXURL !== "undefined") {
    ExLoadLib(EXURL.flv, function () { MultiScreen_startFlv(idx, url, epoch); },
                         function () { MultiScreen_setTip(slot, "flv.js 加载失败"); });
    return;
  }
  if (typeof flvjs === "undefined" || !flvjs.isSupported()) { MultiScreen_setTip(slot, "当前浏览器不支持 flv 播放"); return; }
  try {
    const player = flvjs.createPlayer({ type: "flv", url: url }, { fixAudioTimestampGap: false });
    player.attachMediaElement(rec.video);
    player.load();
    player.play();
    rec.flv = player;
    rec.video.addEventListener("playing", function () {
      const cur = msSlotPlayers.get(idx);
      if (!cur || cur.epoch !== epoch) return;
      clearTimeout(cur.startTimer);
      const s = MultiScreen_slotDom(idx);
      // 出画面即撤掉整个加载层（转圈态与文案态一起清）
      if (s) s.classList.remove("ms-slot--loading", "ms-slot--notice");
    }, { once: true });
    // 起播超时兜底：到点仍未出画面就给一个可操作的提示
    rec.startTimer = setTimeout(function () {
      const cur = msSlotPlayers.get(idx);
      if (cur === rec && rec.video && rec.video.readyState < 2) MultiScreen_setTip(slot, "加载缓慢，可点重新加载");
    }, MS_START_TIMEOUT_MS);
  } catch (e) {
    MultiScreen_setTip(slot, "播放器创建失败");
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
      if (have) MultiScreen_clearSlot(i);
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
  let arr = (Array.isArray(list) ? list : []).filter(function (r) { return r && r.rid; });
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

// action: "fresh" | "add" | "delete" | "close"
function MultiScreen_apply(action, payload) {
  if (action === "close") {
    // 原生：关闭时快照进 historyRoomList 供重开还原，然后清空槽 1~4
    msHistoryList = msActiveList.slice();
    msActiveList = MultiScreen_normalize([]);
    for (let i = 1; i < MS_SLOT_COUNT; i++) MultiScreen_clearSlot(i);
  } else if (action === "add") {
    if (msActiveList.length >= MS_MAX_ROOMS) return MultiScreen_after();
    msActiveList = MultiScreen_normalize(msActiveList.concat([payload]));
  } else if (action === "delete") {
    if (msActiveList.length <= MS_MIN_ROOMS) return MultiScreen_after();
    msActiveList = MultiScreen_normalize(msActiveList.filter(function (r) { return String(r.rid) !== String(payload); }));
  } else {
    // fresh：传入完整列表。数据未变的槽位由差量同步保住，流不会无谓重启
    msActiveList = MultiScreen_normalize(payload);
  }
  MultiScreen_renderAll();
  return MultiScreen_after();
}

function MultiScreen_after() {
  msMultiType = msActiveList.length;
  MultiScreen_save();
  // 进了多屏的房间都记一笔"最近看过"
  for (let i = 1; i < msActiveList.length; i++) MultiScreen_pushRecent(msActiveList[i]);
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
    prev[i] = rec ? rec.url || "" : "";
  });
  msQnCompare = { prev: prev, same: {}, done: {}, timer: 0 };
  // 兜底：某格取流失败时 done 永远凑不齐，到点就按已知情况给结论，不能一直不吭声
  msQnCompare.timer = setTimeout(function () { MultiScreen_finishQnCompare(); }, 15000);
}
function MultiScreen_noteStreamUrl(idx, url) {
  const rec = msSlotPlayers.get(idx);
  if (rec) rec.url = url || "";
  if (!msQnCompare || !(idx in msQnCompare.prev)) return;
  if (msQnCompare.done[idx]) return;
  msQnCompare.done[idx] = 1;
  if ((url || "") === msQnCompare.prev[idx]) msQnCompare.same[idx] = 1;
  const total = Object.keys(msQnCompare.prev).length;
  if (Object.keys(msQnCompare.done).length >= total) MultiScreen_finishQnCompare();
}

function MultiScreen_finishQnCompare() {
  if (!msQnCompare) return;
  const total = Object.keys(msQnCompare.prev).length;
  const doneCount = Object.keys(msQnCompare.done).length;
  const sameCount = Object.keys(msQnCompare.same).length;
  clearTimeout(msQnCompare.timer);
  msQnCompare = null;
  if (!total) return;
  if (doneCount < total) {
    // 有格子没取到流（失败或还在路上）：如实说，不假装成功
    showMessage("画质切换：" + doneCount + "/" + total + " 个格子已确认" + (sameCount ? "，其中 " + sameCount + " 个地址未变化" : ""), "info");
  } else if (sameCount >= total) {
    showMessage("该直播间只提供同一档画质，流地址未变化", "info");
  } else if (sameCount > 0) {
    showMessage("部分直播间只提供同一档画质（" + sameCount + "/" + total + " 未变化）", "info");
  } else {
    showMessage("画质已切换", "success");
  }
}
function MultiScreen_setQuality(qn) {
  if (!qn || String(qn) === msQn) return;
  msQn = String(qn);
  MultiScreen_save();
  const targets = [];
  for (let i = 1; i < msActiveList.length && i < MS_SLOT_COUNT; i++) targets.push(i);
  MultiScreen_beginQnCompare(targets);
  // 只有外房格子需要重拉；主画面归斗鱼原生管
  for (let i = 1; i < msActiveList.length && i < MS_SLOT_COUNT; i++) {
    MultiScreen_renderSlot(i, msActiveList[i]);
  }
}

/* ---------- 落点判定（原生 queryCurrentBox 的等价实现） ---------- */

/* 返回**槽下标 0~4**（0 是主画面格，与布局表、槽位数组同一套编号），死区返回 -1。
   刻意不用原生那套"格子号 1~5"：那个编号比槽下标大 1，很容易在下标运算里错位一格，
   一错就变成"拖这一格却动了隔壁格"。这里全部统一成下标，只在死区用 -1 哨兵值。 */
function MultiScreen_hitTest(clientX, clientY, forLongPress) {
  const c = MultiScreen_getContainer();
  if (!c) return -1;
  const n = msMultiType;
  if (n < MS_MIN_ROOMS || n > MS_MAX_ROOMS) return -1;
  const r = c.getBoundingClientRect();
  if (!r.width || !r.height) return -1;
  const yRel = clientY - r.top;
  if (forLongPress && yRel >= r.height - MS_BOTTOM_GUARD_PX) return -1;  // 底部控制条保护带
  const d = (clientX - r.left) / r.width;   // 归一化 x
  const p = yRel / r.height;                // 归一化 y

  // 死区与分区逐条对应原生 switch(n)，返回值已换算为槽下标
  if (n === 2) {
    if (p < 0.25 || p > 0.75) return -1;
    return d > 0.5 ? 1 : 0;
  }
  if (n === 3) {
    if (p < 0.1713 || p > 0.8287 || d < 0.008 || d > 0.992) return -1;
    if (d < 0.664) return 0;
    return p < 0.4993 ? 1 : 2;
  }
  if (n === 4) {
    if (d < 0.5) return p < 0.5 ? 0 : 3;
    return p < 0.5 ? 1 : 2;
  }
  if (n === 5) {
    if (p < 0.014 || p > 0.986 || d < 0.095 || d > 0.905) return -1;
    if (d < 0.581) return p < 0.5 ? 0 : 3;
    if (p < 0.338) return 1;
    if (p < 0.662) return 2;
    return 4;
  }
  return -1;
}

/* ---------- 拖拽换位 ---------- */

function MultiScreen_onMouseDown(e) {
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
  const g = (MS_LAYOUT[msMultiType] || [])[idx];
  if (g) {
    ph.style.top = g[0] + "%"; ph.style.left = g[1] + "%";
    ph.style.width = g[2] + "%"; ph.style.height = g[3] + "%";
    ph.style.zIndex = String(MS_SLOT_Z[idx]);
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
  ".ms-editbar",
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
      list: msActiveList.map(function (r) { return { rid: r.rid, nn: r.nn || "", avatar: r.avatar || "" }; }),
      qn: msQn,
    }));
  } catch (e) {}
}

function MultiScreen_load() {
  try {
    const raw = localStorage.getItem("ExSave_MultiScreen");
    if (!raw) return null;
    const j = JSON.parse(raw);
    if (j && typeof j.qn === "string") msQn = j.qn;
    const list = (j && Array.isArray(j.list)) ? j.list.filter(function (r) { return r && r.rid; }) : [];
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
    if (!slots[i] || !slots[i].querySelector(".ms-slot__video")) needRender.push(i);
  }
  MultiScreen_applyLayout();
  needRender.forEach(function (i) {
    MultiScreen_renderSlot(i, msActiveList[i]);
  });
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
  }
  MultiScreen_watchContainer();
  MultiScreen_applyLayout();
  // 清掉可能残留在主画面格上的状态类（早期版本按位置清理时会误加）
  const mainCell = MultiScreen_slots()[msPosOwner.indexOf(0)];
  if (mainCell) mainCell.classList.remove("ms-slot--loading", "ms-slot--notice");
  // 已经从持久化恢复了多屏列表的话，把格子一并渲染出来
  if (msActiveList.length > 1) MultiScreen_renderAll();
}

function initPkg_PopupPlayer_MultiScreen() {
  MultiScreen_load();
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
