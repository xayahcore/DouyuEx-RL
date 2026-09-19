function* (__imports) {
yield {"Br": { get: () => Br, set: value => { Br = value; } },
"Cr": { get: () => Cr, set: value => { Cr = value; } },
"Er": { get: () => Er, set: value => { Er = value; } },
"F": { get: () => F, set: value => { F = value; } },
"G": { get: () => G, set: value => { G = value; } },
"H": { get: () => H, set: value => { H = value; } },
"Ir": { get: () => Ir, set: value => { Ir = value; } },
"Ja": { get: () => Ja, set: value => { Ja = value; } },
"Ka": { get: () => Ka, set: value => { Ka = value; } },
"Qa": { get: () => Qa, set: value => { Qa = value; } },
"Tr": { get: () => Tr, set: value => { Tr = value; } },
"Ua": { get: () => Ua, set: value => { Ua = value; } },
"V": { get: () => V, set: value => { V = value; } },
"Wa": { get: () => Wa, set: value => { Wa = value; } },
"Xa": { get: () => Xa, set: value => { Xa = value; } },
"Ya": { get: () => Ya, set: value => { Ya = value; } },
"Za": { get: () => Za, set: value => { Za = value; } },
"_r": { get: () => _r, set: value => { _r = value; } },
"cr": { get: () => cr, set: value => { cr = value; } },
"er": { get: () => er, set: value => { er = value; } },
"fr": { get: () => fr, set: value => { fr = value; } },
"gr": { get: () => gr, set: value => { gr = value; } },
"hr": { get: () => hr, set: value => { hr = value; } },
"ir": { get: () => ir, set: value => { ir = value; } },
"kr": { get: () => kr, set: value => { kr = value; } },
"or": { get: () => or, set: value => { or = value; } },
"pr": { get: () => pr, set: value => { pr = value; } },
"qa": { get: () => qa, set: value => { qa = value; } },
"rr": { get: () => rr, set: value => { rr = value; } },
"setDanmakuVolume": { get: () => setDanmakuVolume, set: value => { setDanmakuVolume = value; } },
"tr": { get: () => tr, set: value => { tr = value; } },
"ur": { get: () => ur, set: value => { ur = value; } },
"vr": { get: () => vr, set: value => { vr = value; } },
"vtoolbarChevronSvg": { get: () => vtoolbarChevronSvg, set: value => { vtoolbarChevronSvg = value; } },
"wr": { get: () => wr, set: value => { wr = value; } },
"xr": { get: () => xr, set: value => { xr = value; } },
"yr": { get: () => yr, set: value => { yr = value; } }};
/**
 * 播放器播控工具栏、滤镜调节状态机与原生音量控制中心
 */
let qa = "";
let Ua = "";
let Wa = "";
let F = "";
let Ya = false;
let Qa = 0;
let Ja = false;
let H = { rotateY: "", rotate: "", scale: "" };
let Za = null;

// 浏览器内核检测
function isEdgeBrowser() {
  return /Edg/i.test(navigator.userAgent);
}
const Xa = isEdgeBrowser;

function showFilterPanel() {
  const el = document.querySelector("#ex-vtoolbar-filter-host .filter__wrap");
  if (el) el.style.display = "block";
}
const Ka = showFilterPanel;

function hideFilterPanel() {
  const el = document.querySelector("#ex-vtoolbar-filter-host .filter__wrap");
  if (el) el.style.display = "none";
}

/**
 * 重置视频色彩滤镜与全景透视状态至默认值 (导出兼容 er)
 */
function resetVideoFilterSettings() {
  (0, __imports.U)("Ex_Style_Filter");
  const filterSelect = document.getElementById("filter__select");
  if (filterSelect) filterSelect.selectedIndex = 0;

  if (V) {
    V.style.filter = "";
    if (V.parentNode) V.parentNode.style.transform = "";
    V.playbackRate = 1;
  }

  Qa = 0;
  H = { rotateY: "", rotate: "", scale: "" };

  const barBright = document.getElementById("bar__bright");
  const barContrast = document.getElementById("bar__contrast");
  const barSaturate = document.getElementById("bar__saturate");
  const maskBright = document.getElementById("mask__bright");
  const maskContrast = document.getElementById("mask__contrast");
  const maskSaturate = document.getElementById("mask__saturate");

  if (barBright) barBright.style.left = "100px";
  if (barContrast) barContrast.style.left = "100px";
  if (barSaturate) barSaturate.style.left = "100px";
  if (maskBright) maskBright.style.width = "100px";
  if (maskContrast) maskContrast.style.width = "100px";
  if (maskSaturate) maskSaturate.style.width = "100px";

  if (Xa()) {
    Ja = false;
    const sliderEnhance = document.getElementById("slider__enhance");
    const switchEnhance = document.getElementById("switch__enhance");
    if (sliderEnhance) sliderEnhance.style.left = "0px";
    if (switchEnhance) switchEnhance.style.background = "#ccc";
    if (V) V.style.imageRendering = "";
    const panelWrap = document.getElementsByClassName("enhance-modal__panel-wrap")[0];
    if (panelWrap) panelWrap.style.display = "none";
  }

  const pano = document.getElementById("ex-panorama");
  if (pano) {
    pano.remove();
    Za = null;
  }

  const entity = document.getElementsByClassName("layout-Player-videoEntity")[0];
  if (entity) {
    entity.style.transform = "";
    entity.style.transformOrigin = "";
  }

  Er = 1;
  (0, __imports.U)("Ex_Style_Cinema");
}
const er = resetVideoFilterSettings;

/**
 * 注入滤镜 CSS 规则 (导出兼容 G)
 * @param {string} css
 */
function applyFilterCss(css) {
  (0, __imports.U)("Ex_Style_Filter");
  (0, __imports.tl)("Ex_Style_Filter", css);
  hideFilterPanel();
}
const G = applyFilterCss;

/**
 * 绑定可拖拽滑动条 (导出兼容 tr)
 * @param {HTMLElement} barContainer
 * @param {HTMLElement} sliderThumb
 * @param {HTMLElement} activeMask
 * @param {Function} onChange
 */
function bindDraggableSlider(barContainer, sliderThumb, activeMask, onChange) {
  sliderThumb.onmousedown = function (e) {
    const startOffset = (e || window.event).clientX - this.offsetLeft;
    const thumbEl = this;

    document.onmousemove = function (ev) {
      const mouseEv = ev || window.event;
      let left = mouseEv.clientX - startOffset;
      const maxLeft = barContainer.offsetWidth - sliderThumb.offsetWidth;

      if (left < 0) left = 0;
      else if (left > maxLeft) left = maxLeft;

      activeMask.style.width = `${left}px`;
      thumbEl.style.left = `${left}px`;

      const ratio = maxLeft > 0 ? left / maxLeft : 0;
      onChange(parseInt(ratio * 255, 10));

      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      } else if (document.selection) {
        document.selection.empty();
      }
    };

    document.onmouseup = function () {
      document.onmousemove = null;
      document.onmouseup = null;
    };
  };
}
const tr = bindDraggableSlider;

// 播放器主视频容器与状态
let V = null;
let or = null;
let nr = false;
let ir = false;
let ar = null;

function getVToolbarMenu() {
  return document.getElementById("ex-vtoolbar-menu");
}
const rr = getVToolbarMenu;

function showMenuImmediate() {
  (0, __imports.clearTimeout)(ar);
  openMenu();
}

function showMenuIfClosed() {
  (0, __imports.clearTimeout)(ar);
  if (!nr) openMenu();
}

function handleMenuMouseLeave(e) {
  const related = e.relatedTarget;
  const menuEl = rr();
  if (menuEl && related && menuEl.contains(related)) return;

  (0, __imports.clearTimeout)(ar);
  ar = (0, __imports.setTimeout)(() => {
    closeMenu();
  }, 80);
}

function bindVToolbarHoverEvents(el, immediate) {
  if (!el) return;
  if (immediate) {
    el.addEventListener("mouseenter", showMenuImmediate);
    el.addEventListener("pointerenter", showMenuImmediate);
  } else {
    el.addEventListener("mouseenter", showMenuIfClosed);
    el.addEventListener("pointerenter", showMenuIfClosed);
  }
  el.addEventListener("mouseleave", handleMenuMouseLeave);
  el.addEventListener("pointerleave", handleMenuMouseLeave);
}
const cr = bindVToolbarHoverEvents;

function handleKeyDownEscape(e) {
  if (e.key === "Escape") {
    closeMenu();
    closeFilterHost();
  }
}
const pr = handleKeyDownEscape;

function openMenu() {
  const menu = document.getElementById("ex-vtoolbar-menu");
  if (menu) {
    nr = true;
    menu.classList.add("is-open");
    menu.querySelector(".vtoolbar-menu__trigger")?.setAttribute("aria-expanded", "true");
  }
}

function closeMenu() {
  const menu = document.getElementById("ex-vtoolbar-menu");
  if (menu) {
    (0, __imports.clearTimeout)(ar);
    nr = false;
    menu.classList.remove("is-open");
    menu.querySelector(".vtoolbar-menu__trigger")?.setAttribute("aria-expanded", "false");
    closeFilterHost();
  }
}
const ur = closeMenu;

function closeFilterHost() {
  const host = document.getElementById("ex-vtoolbar-filter-host");
  const trigger = document.getElementById("vtoolbar-menu-filter");
  ir = false;
  if (host) host.classList.remove("is-visible");
  if (trigger) {
    trigger.classList.remove("is-active");
    trigger.setAttribute("aria-expanded", "false");
  }
  hideFilterPanel();
}
const gr = closeFilterHost;

function getFilterHost() {
  return document.getElementById("ex-vtoolbar-filter-host");
}
const hr = getFilterHost;

// 各种播控 SVG 矢量图标
const fr = __imports.et;
const yr = `<svg class="icon" viewBox="0 0 1024 1024" width="16" height="16"><path d="M921.6 766.634667L257.365333 102.4a68.266667 68.266667 0 0 0-96.597333 0L102.4 160.768a68.266667 68.266667 0 0 0 0 96.597333L766.634667 921.6a68.266667 68.266667 0 0 0 96.597333 0L921.6 863.232a68.266667 68.266667 0 0 0 0-96.597333z" fill="#ffffff"></path></svg>`;
const vtoolbarChevronSvg = `<svg class="vtoolbar-menu__chevron" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const vr = `<svg class="icon" viewBox="0 0 1237 1024"><path d="M648.448 946.347l0.256-1.622-0.256 1.622z" fill="#ffffff"/></svg>`;
const xr = `<svg class="icon" viewBox="0 0 1024 1024"><path d="M496 64A48 48 0 0 1 544 112v800a48 48 0 0 1-96 0v-800A48 48 0 0 1 496 64z" fill="#ffffff"/></svg>`;
const wr = `<svg class="icon vtoolbar-menu__icon-pip" viewBox="3 5 18 12" fill="none"><rect x="3" y="5" width="18" height="12" rx="2" stroke="#ffffff" stroke-width="1.5"/><path d="M7 10h5.5M7 13h3.5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/></svg>`;

let _r = false;
let kr = 0;
let Er = 1;
let Br = null;
let Ir = null;
let Tr = null;
let Cr = null;

/**
 * 驱动原生斗鱼播放器音量滑块与文字提示 (导出兼容 setDanmakuVolume)
 * @param {number} vol - 音量比例 (0.0 ~ 1.0)
 */
function setDanmakuVolume(vol) {
  try {
    const clamped = Math.max(0, Math.min(1, vol));
    const volumeIcon = document.querySelector(".volume-07c230");
    const frontBar = document.querySelector(".volume-bar-93f0b0 .front-99e2aa");
    const point = document.querySelector(".volume-bar-93f0b0 .point-6ef744");
    const tips = document.querySelector(".volume-bar-93f0b0 .tips2-9bb064");

    if (frontBar) frontBar.style.height = `${100 * clamped}px`;
    if (point) point.style.bottom = `${100 * clamped + 7}px`;
    if (tips) tips.textContent = `音量${Math.round(100 * clamped)}%`;

    if (volumeIcon) {
      if (clamped === 0) {
        volumeIcon.classList.add("custom-muted");
        volumeIcon.classList.remove("custom-normal");
      } else {
        volumeIcon.classList.add("custom-normal");
        volumeIcon.classList.remove("custom-muted");
      }
    }
  } catch {}
}

}
