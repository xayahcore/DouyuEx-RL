/* ==================== 多屏编辑条（斗鱼 .mutiPlayerEditPanel 的 1:1 复刻） ==================== */
/*
 * 几何全部取自斗鱼 live_player 的样式表（fourth_23bc9cf.css 中的 .mutiPlayerEditPanel 一族），
 * 均为实测原值：
 *   条体        宽 100% / 高 226 / left:0 / bottom:0 / padding:0 0 16px / overflow:hidden
 *               原生底色 rgba(0,0,0,.8) —— 按"编辑条走 MIUIX"的既定决策改磨砂玻璃
 *   顶栏        16px 内边距 + space-between；标题 500/18px/#fff；关闭 24x24
 *   卡片        270x152 / 边框 1px #999 / bg #333 / margin-left:16px / :last-child margin:0 16px
 *               hover 换 2px #ff5d23（原生无 transition，瞬时；此处保持瞬时以对齐手感）
 *   选中图标    24x24，右上角
 *   「当前」角标 40x24，右上角，底 #ff5d23
 *   「未开播」角标 60x24，左上角，底 #ff5d23
 *   卡底信息条  高 32 / linear-gradient(180deg,transparent 8%,rgba(0,0,0,.7)) / 左右 padding 6px
 *               昵称 14px max-width:136px 省略；热度 14px + 16x16 火苗
 *   箭头        28x42 / 垂直居中 / left:0 与 right:0 / z-index:1
 *
 * 与原生刻意不一致之处：
 *   · 顶栏标题副题与关闭按钮用 CSS 自绘（原生用 CDN PNG），不引外部图标资源
 *   · 显隐动画原生是 transition: height 1s ease 0s, opacity 1s ease 0s；1s 与 MIUIX 的
 *     0.32s 弹簧曲线差得太远，按既定决策统一到 MIUIX 口径（常量 MS_EDITBAR_ANIM，一行可改回）
 *   · 卡片底图原生用房间封面图；我们的房池来自搜索/关注接口，只有头像，故用头像作 cover 底图
 */

const MS_EDITBAR_HEIGHT = 226;
const MS_EDITBAR_CARD_W = 270;
const MS_EDITBAR_CARD_H = 152;
const MS_EDITBAR_GAP = 16;              // 卡片左外边距 = 列表两侧留白
const MS_EDITBAR_ARROW_STEP_BASE = 286; // 286 = 270 + 16，原生步进的基准
const MS_EDITBAR_CLICK_DEBOUNCE = 200;  // 卡片点击防抖（原生 trailing 200ms）
const MS_EDITBAR_ANIM = "0.32s cubic-bezier(0.34, 1.56, 0.64, 1)";

let msEditBarEl = null;
let msEditBarListEl = null;
let msEditBarOffset = 0;
let msEditBarClickTimer = null;
let msEditBarVisible = false;

/* 候选房池：编辑条里能看到的全部卡片。已选中的（在 msActiveList 里）打勾。
   池子由房间选择面板填充，结构 { rid, nn, avatar, showStatus, hot }，showStatus===1 才视为在播 */
let msRoomPool = [];

function MS_EditBar_setPool(list) {
  msRoomPool = (Array.isArray(list) ? list : []).filter(function (r) { return r && r.rid; });
  if (msEditBarVisible) MS_EditBar_render();
}

function MS_EditBar_getPool() { return msRoomPool.slice(); }

function MS_EditBar_getQuality() {
  return typeof MultiScreen_getQuality === "function" ? MultiScreen_getQuality() : MS_QUALITY_LIST[0].v;
}

function MS_EditBar_addToPool(room) {
  if (!room || !room.rid) return;
  if (msRoomPool.some(function (r) { return String(r.rid) === String(room.rid); })) return;
  msRoomPool = msRoomPool.concat([room]);
  if (msEditBarVisible) MS_EditBar_render();
}

/* ---------- 宿主 ---------- */

function MS_EditBar_host() {
  // 原生把编辑条挂在播放器根节点上（#__h5player 是定位祖辈），bottom:0 与原生同位
  return document.getElementById("__h5player") || MultiScreen_getContainer();
}

function MS_EditBar_mount() {
  if (msEditBarEl && msEditBarEl.isConnected) return msEditBarEl;
  const host = MS_EditBar_host();
  if (!host) return null;   // 测试 DOM / 非播放器页面：静默跳过，不抛错
  const el = document.createElement("div");
  el.className = "ms-editbar";
  // 顶栏：标题 + 画质档位 + 关闭。画质放这里是既定决策（清晰度在编辑条里选）。
  // 三端对齐沿用原生 .top 的 space-between；档位胶囊高度必须压在 24px 内，
  // 否则顶栏会超过原生的 16+24+16=56，把 226 的条体挤出去（条体是 overflow:hidden 固定高）
  el.innerHTML =
    '<div class="ms-editbar__top">' +
      '<p class="ms-editbar__title">多屏编辑</p>' +
      '<div class="ms-editbar__quality miuix-seg">' +
        MS_QUALITY_LIST.map(function (q) {
          return '<label class="miuix-seg__item"><input type="radio" name="ms_quality" value="' + q.v + '"' +
            (String(MS_EditBar_getQuality()) === q.v ? " checked" : "") + " /><span class=\"miuix-seg__label\">" + q.name + "</span></label>";
        }).join("") +
      "</div>" +
      '<span class="ms-editbar__close" title="关闭">×</span>' +
    "</div>" +
    '<div class="ms-editbar__panel">' +
      '<span class="ms-editbar__arrow ms-editbar__arrow--left"></span>' +
      '<div class="ms-editbar__list"></div>' +
      '<span class="ms-editbar__arrow ms-editbar__arrow--right"></span>' +
    '</div>';
  host.appendChild(el);
  msEditBarEl = el;
  msEditBarListEl = el.querySelector(".ms-editbar__list");
  Array.prototype.forEach.call(el.querySelectorAll('input[name="ms_quality"]'), function (radio) {
    radio.addEventListener("change", function () {
      if (radio.checked) MultiScreen_setQuality(radio.value);
    });
  });
  el.querySelector(".ms-editbar__close").addEventListener("click", function (e) {
    e.stopPropagation();
    MS_EditBar_hide();
  });
  el.querySelector(".ms-editbar__arrow--left").addEventListener("click", function (e) {
    e.stopPropagation();
    MS_EditBar_page(-1);
  });
  el.querySelector(".ms-editbar__arrow--right").addEventListener("click", function (e) {
    e.stopPropagation();
    MS_EditBar_page(1);
  });
  el.addEventListener("mousedown", function (e) { e.stopPropagation(); }); // 别触发多屏长按拖拽
  return el;
}

/* ---------- 显隐（原生：height 0 ↔ 226，opacity 同步） ---------- */

function MS_EditBar_show() {
  const el = MS_EditBar_mount();
  if (!el) return;
  msEditBarVisible = true;
  MS_EditBar_render();
  el.style.transition = "height " + MS_EDITBAR_ANIM + ", opacity " + MS_EDITBAR_ANIM;
  // 先落起始态再放开高度，否则过渡不触发
  el.style.height = "0px";
  el.style.opacity = "0";
  el.style.display = "block";
  void el.offsetHeight;
  el.style.height = MS_EDITBAR_HEIGHT + "px";
  el.style.opacity = "1";
}

function MS_EditBar_hide() {
  const el = msEditBarEl;
  msEditBarVisible = false;
  if (!el) return;
  el.style.height = "0px";
  el.style.opacity = "0";
  setTimeout(function () {
    if (!msEditBarVisible && el) el.style.display = "none";
  }, 340);
}

function MS_EditBar_isVisible() { return msEditBarVisible; }

function MS_EditBar_toggle() {
  if (msEditBarVisible) MS_EditBar_hide();
  else MS_EditBar_show();
}

/* ---------- 渲染 ---------- */

function MS_EditBar_isSelected(rid) {
  return MultiScreen_getList().some(function (r) { return String(r.rid) === String(rid); });
}

function MS_EditBar_render() {
  const el = MS_EditBar_mount();
  if (!el || !msEditBarListEl) return;
  const mainRid = MultiScreen_getMainRid();
  const list = MultiScreen_getList();
  const selected = {};
  list.forEach(function (r) { selected[String(r.rid)] = 1; });

  // 候选池 = 池子 ∪ 已选中的（保证当前多屏房间一定出现在条里，即使池子还没同步）
  const seen = {};
  const cards = [];
  msRoomPool.forEach(function (r) {
    const k = String(r.rid);
    if (seen[k]) return;
    seen[k] = 1;
    cards.push(r);
  });
  list.forEach(function (r) {
    const k = String(r.rid);
    if (seen[k]) return;
    seen[k] = 1;
    cards.push(r);
  });

  msEditBarListEl.innerHTML = cards.map(function (r) {
    const rid = String(r.rid);
    const isMain = rid === String(mainRid);
    const hot = MS_EditBar_isSelected(rid);
    const bg = r.avatar ? ' style="background-image:url(&quot;' + String(r.avatar).replace(/&/g, "&amp;").replace(/"/g, "&quot;") + '&quot;)"' : "";
    // 未开播角标：showStatus 拿不到时不显示（宁可不显示，也不要误标在播房间）
    const closeTag = (!isMain && +r.showStatus === 2) ? '<span class="ms-editbar__close-tag">未开播</span>' : "";
    // 「当前」与选中图标互斥：当前房间归原生管，不给勾选框
    const mark = isMain ? '<span class="ms-editbar__cur-room">当前</span>' : (hot ? '<span class="ms-editbar__check"></span>' : "");
    const hotTxt = r.hot ? '<span class="ms-editbar__hot"><i class="ms-editbar__flame"></i>' + MS_EditBar_formatHot(r.hot) + "</span>" : "";
    return (
      '<div class="ms-editbar__card' + (isMain ? " is-main" : "") + (hot ? " is-selected" : "") + '" data-rid="' + rid + '"' + bg + ">" +
        '<span class="ms-editbar__tag">' + mark + "</span>" +
        closeTag +
        '<div class="ms-editbar__info">' +
          '<span class="ms-editbar__nn">' + MS_EditBar_esc(r.nn || ("房间 " + rid)) + "</span>" +
          hotTxt +
        "</div>" +
      "</div>"
    );
  }).join("");

  Array.prototype.forEach.call(msEditBarListEl.querySelectorAll(".ms-editbar__card"), function (card) {
    card.addEventListener("click", function () { MS_EditBar_onCardClick(card); });
  });

  MS_EditBar_applyOffset();
}

function MS_EditBar_esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 原生把热度原样显示（接口给的是「12.3万」这类已格式化字符串），这里只做兜底
function MS_EditBar_formatHot(h) {
  if (typeof h === "string") return MS_EditBar_esc(h);
  const n = Number(h) || 0;
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return String(n);
}

/* ---------- 翻页（原生步进 286 x floor(条宽/286)，不是固定 286） ---------- */

function MS_EditBar_step() {
  const el = msEditBarEl;
  const w = el ? el.getBoundingClientRect().width : 0;
  if (!w) return MS_EDITBAR_ARROW_STEP_BASE;
  return MS_EDITBAR_ARROW_STEP_BASE * Math.floor(w / MS_EDITBAR_ARROW_STEP_BASE) || MS_EDITBAR_ARROW_STEP_BASE;
}

function MS_EditBar_maxOffset() {
  const el = msEditBarEl;
  if (!el || !msEditBarListEl) return 0;
  const w = el.getBoundingClientRect().width;
  // 列表宽 = 270 x 房间数 + 16 x (房间数 + 1)，与原生 formula 一致
  const n = msEditBarListEl.children.length;
  const listW = MS_EDITBAR_CARD_W * n + MS_EDITBAR_GAP * (n + 1);
  return Math.max(0, listW - w);
}

function MS_EditBar_applyOffset() {
  const el = msEditBarEl;
  if (!el || !msEditBarListEl) return;
  const max = MS_EditBar_maxOffset();
  if (msEditBarOffset > max) msEditBarOffset = max;
  if (msEditBarOffset < 0) msEditBarOffset = 0;
  msEditBarListEl.style.transition = "transform " + MS_EDITBAR_ANIM;
  msEditBarListEl.style.transform = "translate3d(" + (-msEditBarOffset) + "px,0,0)";
  // 左箭头在 offset===0 时不显示（原生是不渲染节点）；右箭头到末尾也不显示
  const left = el.querySelector(".ms-editbar__arrow--left");
  const right = el.querySelector(".ms-editbar__arrow--right");
  if (left) left.style.display = msEditBarOffset === 0 ? "none" : "flex";
  if (right) right.style.display = msEditBarOffset >= max ? "none" : "flex";
}

function MS_EditBar_page(dir) {
  const step = MS_EditBar_step();
  msEditBarOffset += dir * step;   // 原生一次只翻一页
  MS_EditBar_applyOffset();
}

/* ---------- 卡片点击：200ms 防抖 + 四项校验（逐条复刻，含文案） ---------- */

function MS_EditBar_onCardClick(card) {
  clearTimeout(msEditBarClickTimer);
  msEditBarClickTimer = setTimeout(function () {
    MS_EditBar_toggleRoom(String(card.getAttribute("data-rid")));
  }, MS_EDITBAR_CLICK_DEBOUNCE);
}

function MS_EditBar_toggleRoom(rid) {
  rid = String(rid);
  const list = MultiScreen_getList();
  const mainRid = MultiScreen_getMainRid();
  // 校验 1：点当前主房间 → 静默返回（原生同款，不给任何反馈）
  if (rid === mainRid) return false;
  const selected = list.some(function (r) { return String(r.rid) === rid; });

  // 校验 2：未选中且未开播 → 退出全屏 + 「该主播尚未开播喔」
  if (!selected) {
    const room = msRoomPool.filter(function (r) { return String(r.rid) === rid; })[0];
    if (room && +room.showStatus === 2) {
      MS_EditBar_exitFullScreen();
      showMessage("该主播尚未开播喔", "warning");
      return false;
    }
  }
  // 校验 3：取消且列表只剩 2 个 → 「多屏模式下，最少需要2个直播间」
  if (selected && list.length <= MS_MIN_ROOMS) {
    showMessage("多屏模式下，最少需要" + MS_MIN_ROOMS + "个直播间", "warning");
    return false;
  }
  // 校验 4：新增且已达上限 → 「多屏模式下，最多{c}个直播间」
  if (!selected && list.length >= MS_MAX_ROOMS) {
    showMessage("多屏模式下，最多" + MS_MAX_ROOMS + "个直播间", "warning");
    return false;
  }
  // 通过
  if (selected) {
    MultiScreen_removeRoom(rid);
  } else {
    const room = msRoomPool.filter(function (r) { return String(r.rid) === rid; })[0];
    MultiScreen_addRoom(room || { rid: rid, nn: "", avatar: "" });
  }
  if (msEditBarVisible) MS_EditBar_render();   // 没显示时不必挂载 DOM
  return true;
}

function MS_EditBar_exitFullScreen() {
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      const p = document.exitFullscreen();
      if (p && p.catch) p.catch(function () {});
    }
  } catch (e) {}
}

/* ---------- 入口 ---------- */

function initPkg_PopupPlayer_EditBar() {
  if (!MultiScreen_isSupported()) return;
  // 多屏列表变化（含拖拽换位落定）后，编辑条的勾选态要跟着走
  MultiScreen_onChange(function (list) {
    if (msEditBarVisible) MS_EditBar_render();
    void list;
  });
  window.addEventListener("resize", function () {
    // 原生 resize 只重算步进不重置 offset（缺陷）；这里连 offset 一起收拢到合法区间
    if (msEditBarVisible) MS_EditBar_applyOffset();
  });
}

window.MS_EditBar_show = MS_EditBar_show;
window.MS_EditBar_hide = MS_EditBar_hide;
window.MS_EditBar_toggle = MS_EditBar_toggle;
window.MS_EditBar_isVisible = MS_EditBar_isVisible;
window.MS_EditBar_setPool = MS_EditBar_setPool;
window.MS_EditBar_getPool = MS_EditBar_getPool;
window.MS_EditBar_addToPool = MS_EditBar_addToPool;
window.MS_EditBar_toggleRoom = MS_EditBar_toggleRoom;
window.MS_EditBar_page = MS_EditBar_page;
window.MS_EditBar_step = MS_EditBar_step;
window.MS_EditBar_mount = MS_EditBar_mount;
