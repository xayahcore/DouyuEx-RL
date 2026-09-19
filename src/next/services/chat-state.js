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
let qa = "",
  Ua = "",
  Wa = "",
  F = "",
  Ya = !1,
  Qa = 0,
  Ja = !1,
  H = { rotateY: "", rotate: "", scale: "" },
  Za = null;
function Xa() {
  return /Edg/i.test(navigator.userAgent);
}
function Ka() {
  var e = document.querySelector("#ex-vtoolbar-filter-host .filter__wrap");
  e && (e.style.display = "block");
}
function $a() {
  var e = document.querySelector("#ex-vtoolbar-filter-host .filter__wrap");
  e && (e.style.display = "none");
}
function er() {
  ((0, __imports.U)("Ex_Style_Filter"),
    (document.getElementById("filter__select").selectedIndex = 0),
    (V.style.filter = ""),
    (Qa = 0),
    (H = { rotateY: "", rotate: "", scale: "" }),
    (V.parentNode.style.transform = ""),
    (document.getElementById("bar__bright").style.left = "100px"),
    (document.getElementById("bar__contrast").style.left = "100px"),
    (document.getElementById("bar__saturate").style.left = "100px"),
    (document.getElementById("mask__bright").style.width = "100px"),
    (document.getElementById("mask__contrast").style.width = "100px"),
    (document.getElementById("mask__saturate").style.width = "100px"),
    Xa() &&
      ((Ja = !1),
      (t = document.getElementById("slider__enhance")),
      (e = document.getElementById("switch__enhance")),
      t && (t.style.left = "0px"),
      e && (e.style.background = "#ccc"),
      (V.style.imageRendering = ""),
      (t = document.getElementsByClassName("enhance-modal__panel-wrap")[0])) &&
      (t.style.display = "none"));
  var e = document.getElementById("ex-panorama"),
    t =
      (e && (e.remove(), (Za = null)),
      document.getElementsByClassName("layout-Player-videoEntity")[0]);
  ((t.style.transform = ""),
    (t.style.transformOrigin = ""),
    (Er = 1),
    (0, __imports.U)("Ex_Style_Cinema"),
    (V.playbackRate = 1));
}
function G(e) {
  ((0, __imports.U)("Ex_Style_Filter"), (0, __imports.tl)("Ex_Style_Filter", e), $a());
}
function tr(e, t, o, n) {
  let i = e,
    a = t,
    r = o,
    l = 0;
  a.onmousedown = function (e) {
    let t = (e || window.event).clientX - this.offsetLeft,
      o = this;
    document.onmousemove = function (e) {
      e = e || window.event;
      ((l = e.clientX - t) < 0
        ? (l = 0)
        : l > i.offsetWidth - a.offsetWidth &&
          (l = i.offsetWidth - a.offsetWidth),
        (r.style.width = l + "px"),
        (o.style.left = l + "px"),
        n(parseInt((l / (i.offsetWidth - a.offsetWidth)) * 255)),
        window.getSelection
          ? window.getSelection().removeAllRanges()
          : document.selection.empty());
    };
  };
}
var V,
  or = null;
let nr = !1,
  ir = !1,
  ar = null;
function rr() {
  return document.getElementById("ex-vtoolbar-menu");
}
function lr() {
  ((0, __imports.clearTimeout)(ar), mr());
}
function sr() {
  ((0, __imports.clearTimeout)(ar), nr || mr());
}
function dr(e) {
  var t,
    e = e.relatedTarget;
  ((e = e),
    ((t = rr()) && e && t.contains(e)) ||
      ((0, __imports.clearTimeout)(ar),
      (ar = (0, __imports.setTimeout)(() => {
        ur();
      }, 80))));
}
function cr(e, t) {
  e &&
    (t
      ? (e.addEventListener("mouseenter", lr),
        e.addEventListener("pointerenter", lr))
      : (e.addEventListener("mouseenter", sr),
        e.addEventListener("pointerenter", sr)),
    e.addEventListener("mouseleave", dr),
    e.addEventListener("pointerleave", dr));
}
function pr(e) {
  "Escape" === e.key && (ur(), gr());
}
function mr() {
  var e = document.getElementById("ex-vtoolbar-menu");
  e &&
    ((nr = !0),
    e.classList.add("is-open"),
    e
      .querySelector(".vtoolbar-menu__trigger")
      .setAttribute("aria-expanded", "true"));
}
function ur() {
  var e = document.getElementById("ex-vtoolbar-menu");
  e &&
    ((0, __imports.clearTimeout)(ar),
    (nr = !1),
    e.classList.remove("is-open"),
    e
      .querySelector(".vtoolbar-menu__trigger")
      .setAttribute("aria-expanded", "false"),
    gr());
}
function gr() {
  var e = document.getElementById("ex-vtoolbar-filter-host"),
    t = document.getElementById("vtoolbar-menu-filter");
  ((ir = !1),
    e && e.classList.remove("is-visible"),
    t &&
      (t.classList.remove("is-active"),
      t.setAttribute("aria-expanded", "false")),
    $a());
}
function hr() {
  return document.getElementById("ex-vtoolbar-filter-host");
}
var fr = __imports.et,
  yr =
    '<svg t="1598941324196" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3146"><path d="M921.6 766.634667L257.365333 102.4a68.266667 68.266667 0 0 0-96.597333 0L102.4 160.768a68.266667 68.266667 0 0 0 0 96.597333L766.634667 921.6a68.266667 68.266667 0 0 0 96.597333 0L921.6 863.232a68.266667 68.266667 0 0 0 0-96.597333zM139.605333 199.338667l59.733334-59.733334A13.312 13.312 0 0 1 208.896 136.533333a13.653333 13.653333 0 0 1 9.898667 4.096l83.968 82.944-79.189334 79.189334-83.968-83.968a13.653333 13.653333 0 0 1 0-19.456z m744.789334 625.322666l-59.733334 59.733334a13.312 13.312 0 0 1-9.557333 4.096 13.653333 13.653333 0 0 1-9.898667-4.096L262.144 341.333333 341.333333 262.144l543.061334 543.061333a13.653333 13.653333 0 0 1 0 19.456zM230.058667 589.824l-50.517334 92.501333-92.842666 50.858667 92.842666 50.517333 50.517334 92.842667 50.517333-92.842667 92.842667-50.517333-92.842667-50.858667-50.517333-92.501333zM541.013333 270.336l31.061334-57.344 57.344-31.402667-57.344-31.402666-31.061334-57.002667-31.402666 57.002667-57.344 31.402666 57.344 31.402667 31.402666 57.344zM827.392 377.173333l21.162667-38.912L887.466667 317.098667l-38.912-21.504-21.162667-38.912-21.504 38.912-38.570667 21.504 38.570667 21.162666 21.504 38.912z" p-id="3147" fill="#ffffff"></path></svg>',
  vtoolbarChevronSvg =
    '<svg class="vtoolbar-menu__chevron" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  vr =
    '<svg class="icon" viewBox="0 0 1237 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M648.448 946.347l0.256-1.622-0.256 1.622z m84.31 13.354c-0.769 4.608-0.769 4.608-4.182 13.483-8.533 16.768-8.533 16.768-49.835 22.784-24.149-14.293-24.149-14.293-27.605-22.613-2.475-5.718-2.475-5.718-3.541-9.387L476.416 335.36l-103.083 499.2c-1.109 5.12-1.109 5.12-4.821 13.27-6.827 12.117-6.827 12.117-35.285 22.527-30.294-7.253-30.294-7.253-38.742-19.37-4.522-8.15-4.522-8.15-6.058-13.227l-74.582-262.357H0v-85.334h278.272l45.781 161.11 104.022-503.424c1.024-4.694 1.024-4.694 4.394-12.502 6.102-11.989 6.102-11.989 35.968-23.338 31.83 8.533 31.83 8.533 39.254 20.736 4.053 7.808 4.053 7.808 5.376 12.544l165.888 609.237 113.92-716.885c0.896-5.248 0.896-5.248 4.864-14.592 9.088-15.574 9.088-15.574 44.928-22.4C868.48 12.587 868.48 12.587 873.6 22.443c3.285 6.912 3.285 6.912 4.523 11.52l112 446.549h221.738v85.333H923.563l-78.507-312.917-112.299 706.773z" fill="#ffffff"/></svg>',
  xr =
    '<svg class="icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M496 64A48 48 0 0 1 544 112v800a48 48 0 0 1-96 0v-800A48 48 0 0 1 496 64z m-224 128A48 48 0 0 1 320 240v544a48 48 0 0 1-96 0v-544A48 48 0 0 1 272 192z m448 0A48 48 0 0 1 768 240v544a48 48 0 0 1-96 0v-544A48 48 0 0 1 720 192z m-672 128A48 48 0 0 1 96 368v288a48 48 0 0 1-96 0v-288A48 48 0 0 1 48 320z m896 0a48 48 0 0 1 48 48v288a48 48 0 0 1-96 0v-288a48 48 0 0 1 48-48z" fill="#ffffff"/></svg>',
  wr =
    '<svg class="icon vtoolbar-menu__icon-pip" viewBox="3 5 18 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2" stroke="#ffffff" stroke-width="1.5"/><path d="M7 10h5.5M7 13h3.5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/></svg>';
var _r = !1;
let kr = 0;
let Er = 1;
var Br = null,
  Ir = null,
  Tr = null,
  Cr = null;
function setDanmakuVolume(e) {
  try {
    var t = document.querySelector(".volume-07c230"),
      o = document.querySelector(".volume-bar-93f0b0 .front-99e2aa"),
      n = document.querySelector(".volume-bar-93f0b0 .point-6ef744"),
      i = document.querySelector(".volume-bar-93f0b0 .tips2-9bb064");
    (o && (o.style.height = 100 * e + "px"),
      n && (n.style.bottom = 100 * e + 7 + "px"),
      i && (i.textContent = `音量${Math.round(100 * e)}%`),
      t &&
        (0 === e
          ? (t.classList.add("custom-muted"),
            t.classList.remove("custom-normal"))
          : (t.classList.add("custom-normal"),
            t.classList.remove("custom-muted"))));
  } catch (e) {}
}

}
