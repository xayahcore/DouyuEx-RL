/* ==========================================================================
   harness.js —— 注入真机 DOM、实测几何与对比度、写回「before → after」数值差
   原则：屏幕上的每个 before → after 数字都是这一页当场量出来的；
        量不出来的（焦点环、遮挡行数）就量它本身，量不出写「无」，不编。
   ========================================================================== */
import { ROWS, loadPanels, controlsHTML } from "./parts.js";
import { initAfterProposal } from "./after.js";

/* 直播画面底色的两个代表值（把半透明玻璃逐层合成成一个实色时用） */
/* 底图是 assets/frame-dark.png / frame-light.png（真机截图裁出的两帧真视频），
   这里用它们各自的亮度均值参与玻璃合成，不再用编出来的 #202020 / #f2f2f2。 */
const VIDEO_RGB = {
  dark: [82, 82, 82],    /* frame-dark.png 实测均值 82/255 */
  light: [145, 145, 145],/* frame-light.png 实测均值 145/255 */
  white: [250, 250, 250] /* ?video=white：近似纯白画面，深色路线的极限工况 */
};

/* Dock 真机宽 556px，横着放不进双栏，单独改成上下叠放，保住 1:1 像素 */
const STACKED_ROWS = new Set(["dock"]);

const clamp = (n) => Math.round(n * 100) / 100;
const px = (n) => clamp(n) + "px";
const cs = (el) => getComputedStyle(el);
const rect = (el) => el.getBoundingClientRect();
const q = (pane, sel) => pane.querySelector(sel);
const size = (el) => (el ? px(rect(el).width) + " × " + px(rect(el).height) : "—");

/* ---------- 颜色 ---------- */
function parseColor(text) {
  const m = String(text).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  if (parts.length < 3) return null;
  return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
}
const composite = (layer, base) => [
  layer[0] * layer[3] + base[0] * (1 - layer[3]),
  layer[1] * layer[3] + base[1] * (1 - layer[3]),
  layer[2] * layer[3] + base[2] * (1 - layer[3])
];
function relLum(rgb) {
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}
function contrast(a, b) {
  const la = relLum(a), lb = relLum(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return clamp((hi + 0.05) / (lo + 0.05));
}
/* 从父节点往上叠到 .stage 之前的全部半透明底色 */
function surfaceUnder(el, video) {
  const layers = [];
  let node = el.parentElement;
  while (node && node !== document.body) {
    if (node.classList && node.classList.contains("stage")) break;
    const parsed = parseColor(cs(node).backgroundColor);
    if (parsed && parsed[3] > 0) layers.unshift(parsed);
    node = node.parentElement;
  }
  let out = video.slice();
  for (const layer of layers) out = composite(layer, out);
  return out;
}
const surfaceOf = (el, video) => {
  const own = parseColor(cs(el).backgroundColor);
  const base = surfaceUnder(el, video);
  return own ? composite(own, base) : base;
};
const alphaOf = (el) => {
  const parsed = parseColor(cs(el).backgroundColor);
  return parsed ? clamp(parsed[3]) : 0;
};
function translateYOf(el) {
  if (!el) return 0;
  const t = cs(el).transform;
  if (!t || t === "none") return 0;
  const m = t.match(/matrix\(([^)]+)\)/);
  if (!m) return 0;
  const nums = m[1].split(",").map(Number);
  return nums.length >= 6 ? clamp(nums[5]) : 0;
}
const videoOf = (pane) => {
  const stage = pane && pane.closest ? pane.closest(".pane") : null;
  return VIDEO_RGB[(stage && stage.dataset.video) || document.body.dataset.video] || VIDEO_RGB.dark;
};
const fmtContrast = (pane, el, mode) => {
  if (!el) return "—";
  return String(contrast(parseColor(cs(el).color), surfaceUnder(el, VIDEO_RGB[mode])));
};

/* ==========================================================================
   Dock 主题三态：第 9 个磁贴「外观」，单击循环 白天 → 黑夜 → 跟随网页
   ========================================================================== */
const THEME_ORDER = ["light", "dark", "auto"];
const THEME_LABEL = { light: "白天", dark: "黑夜", auto: "跟随网页" };
const SKIN_LABEL = {
  "skin-glass2": "G2 · 单层玻璃卡（透光 38%）",
  "skin-dark2": "D2 · 深色薄玻璃（透光 70%）",
  "skin-dark": "D · 深色玻璃 v1（alpha 压暗）",
  "skin-glass": "G · 玻璃托盘 + 内容岛（透光 13%）",
  "skin-glass3": "G3 · 玻璃卡 + 文字托（透光 ≈80%）",
  "skin-card": "B · 磨砂白卡（备查）"
};

/** 右列那颗小标签的唯一来源：任何皮肤都不会再出现 "undefined" */
function skinTagText() {
  const active = Object.keys(SKIN_LABEL).find((name) => document.body.classList.contains(name));
  return "路线 " + (SKIN_LABEL[active] || SKIN_LABEL["skin-glass2"]);
}

const THEME_ICONS = {
  light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/></svg>',
  dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20.5 14.6A8.6 8.6 0 1 1 9.4 3.5a6.9 6.9 0 0 0 11.1 11.1Z"/></svg>',
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.2"/><path d="M12 3.8a8.2 8.2 0 0 1 0 16.4Z" fill="currentColor" stroke="none"/></svg>'
};

function applySkin(name) {
  for (const known of ["skin-glass2", "skin-dark2", "skin-dark", "skin-glass", "skin-glass3", "skin-card"]) {
    document.body.classList.remove(known);
  }
  document.body.classList.add("skin-" + name);
  for (const link of document.querySelectorAll("link[data-skin]")) {
    link.media = link.dataset.skin === name ? "all" : "not all";
  }
  for (const tag of document.querySelectorAll(".pane--after .pane__tag small")) tag.textContent = skinTagText();
  for (const tile of document.querySelectorAll(".ex-theme")) paintThemeTile(tile);
  paintThemeBadge();
}

function paintThemeTile(tile) {
  const state = document.body.dataset.dockTheme || "auto";
  tile.dataset.state = state;
  tile.title = "外观：" + THEME_LABEL[state] + "（点击切换）";
  const host = tile.querySelector(".ex-ico--line") || tile.querySelector(".ex-panel__icon");
  if (host) host.innerHTML = THEME_ICONS[state];
}

function paintThemeBadge() {
  for (const pane of document.querySelectorAll(".pane--after")) {
    const dock = pane.querySelector(".ex-panel");
    const stage = pane.querySelector(".stage");
    if (!dock || !stage) continue;
    let badge = stage.querySelector(".ex-theme-badge");
    const auto = (document.body.dataset.dockTheme || "auto") === "auto";
    if (!auto) {
      if (badge) badge.remove();
      continue;
    }
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "ex-theme-badge";
      stage.appendChild(badge);
    }
    const active = ["skin-glass2", "skin-dark2", "skin-dark", "skin-glass", "skin-glass3", "skin-card"]
      .find((name) => document.body.classList.contains(name));
    badge.textContent = "继承自网页 · 当前 " + (SKIN_LABEL[active] || "G2");
  }
}

function installThemeTile() {
  for (const pane of document.querySelectorAll(".pane--after")) {
    const wrap = pane.querySelector(".ex-panel__wrap");
    if (!wrap || wrap.querySelector(".ex-theme")) continue;
    const tile = document.createElement("div");
    tile.className = "ex-theme";
    tile.innerHTML =
      '<a class="ex-panel__icon"><span class="ex-ico ex-ico--line"></span></a>' +
      '<span class="ex-panel__indicator"></span>';
    wrap.appendChild(tile);
    paintThemeTile(tile);
    tile.addEventListener("click", (event) => {
      event.stopPropagation();
      const current = document.body.dataset.dockTheme || "auto";
      const next = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
      document.body.dataset.dockTheme = next;
      applySkin(next === "dark" ? "dark2" : "glass2");
      paintDockMetric();
    });
  }
}

/* Dock 胶囊实测宽度：before 8 磁贴 / after 9 磁贴 */
function paintDockMetric() {
  const host = document.querySelector("#dock-metric");
  if (!host) return;
  const before = document.querySelector("#row-dock .pane--before .ex-panel");
  const after = document.querySelector("#row-dock .pane--after .ex-panel");
  if (!before || !after) return;
  const widthOf = (el) => Math.round(el.getBoundingClientRect().width);
  const countOf = (pane) => document.querySelectorAll("#row-dock .pane--" + pane + " .ex-panel__wrap > div").length;
  const state = document.body.dataset.dockTheme || "auto";
  host.innerHTML =
    "<b>实测胶囊宽</b>：before " + countOf("before") + " 磁贴 = <b>" + widthOf(before) + "px</b>　→　" +
    "after " + countOf("after") + " 磁贴 = <b>" + widthOf(after) + "px</b>（+1 个「外观」磁贴）　·　" +
    "当前主题：<b>" + THEME_LABEL[state] + "</b>（点第 9 个磁贴循环 白天 → 黑夜 → 跟随网页）";
}


/* ==========================================================================
   指标分组： [指标名, 读函数, 可选阈值]
   ========================================================================== */
const GROUPS = {
  dock: [
    ["胶囊尺寸（真机 556×76）", (p) => size(q(p, ".ex-panel"))],
    ["磁贴数（不变量）", (p) => String(p.querySelectorAll(".ex-panel__wrap > div").length)],
    ["磁贴尺寸（不变量）", (p) => size(q(p, ".ex-panel__wrap > div"))],
    ["胶囊内边距", (p) => cs(q(p, ".ex-panel")).padding],
    ["磁贴间距 gap", (p) => cs(q(p, ".ex-panel__wrap")).gap],
    ["磁贴底 alpha", (p) => String(alphaOf(q(p, ".ex-panel__wrap > div")))],
    ["胶囊底 alpha", (p) => String(alphaOf(q(p, ".ex-panel")))],
    ["胶囊 backdrop-filter", (p) => cs(q(p, ".ex-panel")).backdropFilter],
    ["悬停态位移", (p) => px(translateYOf(q(p, ".is-demo-hover")))],
    ["悬停态底色 alpha", (p) => String(alphaOf(q(p, ".is-demo-hover")))],
    ["选中态位移", (p) => px(translateYOf(q(p, ".is-active")))],
    ["选中态底色 alpha", (p) => String(alphaOf(q(p, ".is-active")))],
    ["悬停 ↔ 选中 位移差", (p) => px(Math.abs(translateYOf(q(p, ".is-demo-hover")) - translateYOf(q(p, ".is-active"))))],
    ["悬停 ↔ 选中 底色差", (p) => String(clamp(Math.abs(alphaOf(q(p, ".is-demo-hover")) - alphaOf(q(p, ".is-active")))))],
    ["选中态图标色", (p) => cs(q(p, ".is-active .ex-ico--fill svg") || q(p, ".is-active svg")).color],
    ["未选中图标色", (p) => cs(q(p, ".ex-sign .ex-ico--line svg") || q(p, ".ex-sign svg")).color]
  ],

  extool: [
    ["面板尺寸（不变量）", (p) => size(q(p, ".extool"))],
    ["header 高度（真机 51）", (p) => px(rect(q(p, ".miuix-modal__header")).height)],
    ["body 高度（真机 317）", (p) => px(rect(q(p, ".miuix-modal__body")).height)],
    ["面板底 alpha", (p) => String(alphaOf(q(p, ".extool")))],
    ["面板 backdrop-filter", (p) => cs(q(p, ".extool")).backdropFilter],
    ["0.5px 内描边", (p) => (cs(q(p, ".extool")).boxShadow.indexOf("0px 0px 0px 0.5px") >= 0 ? "有" : "无")],
    ["内容岛 alpha（卡片）", (p) => String(alphaOf(q(p, ".fans-panel__card")))],
    ["卡片 padding（真机 10/14）", (p) => cs(q(p, ".fans-panel__card")).padding],
    ["卡片 margin-bottom", (p) => cs(q(p, ".fans-panel__card")).marginBottom],
    ["选项行高度", (p) => px(rect(q(p, ".sign-option-item")).height)],
    ["选项行 padding", (p) => cs(q(p, ".sign-option-item")).padding],
    ["副标题字号 / 行高", (p) => { const s = cs(q(p, ".sign-option-desc")); return s.fontSize + " / " + s.lineHeight; }],
    ["副标题颜色", (p) => cs(q(p, ".sign-option-desc")).color],
    ["副标题对比（深色画面）", (p) => fmtContrast(p, q(p, ".sign-option-desc"), "dark"), 4.5],
    ["副标题对比（亮色画面）", (p) => fmtContrast(p, q(p, ".sign-option-desc"), "light"), 4.5],
    ["卡片头内联说明对比（深色）", (p) => fmtContrast(p, q(p, ".fans-panel__card-header > span:last-child"), "dark"), 4.5]
  ],

  update: [
    ["面板尺寸（不变量）", (p) => size(q(p, ".exupdate-panel"))],
    ["日志正文字号 / 颜色", (p) => { const s = cs(q(p, ".exupdate-list")); return s.fontSize + " / " + s.color; }],
    ["日志正文对比（深色画面）", (p) => fmtContrast(p, q(p, ".exupdate-list li"), "dark"), 4.5],
    ["主按钮高度", (p) => px(rect(q(p, ".exupdate-panel__submit-btn")).height)],
    ["卡片头图标（EX_ICO_CARD_MAP 未收录）", (p) => (q(p, ".exupdate-panel__card-title .ex-card-ico") ? "有" : "无")]
  ],

  livetool: [
    ["面板尺寸（不变量）", (p) => size(q(p, ".livetool"))],
    ["单元格 padding", (p) => cs(q(p, ".livetool__cell")).padding],
    ["抽屉标题字号 / 颜色", (p) => { const s = cs(q(p, '.livetool__cell_title > span[id$="__title"]')); return s.fontSize + " / " + s.color; }],
    ["药丸按钮字号", (p) => cs(q(p, '.livetool__cell_title > span[id$="__export"]')).fontSize],
    ["药丸按钮对比（深色画面）", (p) => fmtContrast(p, q(p, '.livetool__cell_title > span[id$="__export"]'), "dark"), 4.5],
    ["开关尺寸（不变量）", (p) => size(q(p, ".sign-checkbox"))],
    ["关态填充色", (p) => { const off = p.querySelectorAll(".sign-checkbox:not(:checked)"); return off.length ? cs(off[0]).backgroundColor : "（全部开启）"; }],
    ["关态 1px 描边 vs 卡片底", (p) => {
      const off = p.querySelector(".sign-checkbox:not(:checked)");
      if (!off) return "（全部开启）";
      const ring = insetRingColor(off);
      return ring ? String(contrast(parseColor(ring), surfaceUnder(off, videoOf(p)))) : "无描边";
    }, 3],
    ["开态轨道 vs 卡片底", (p) => {
      const on = q(p, ".sign-checkbox:checked");
      return on ? String(contrast(surfaceOf(on, videoOf(p)), surfaceUnder(on, videoOf(p)))) : "—";
    }, 3]
  ],

  sign: [
    ["面板尺寸（不变量）", (p) => size(q(p, ".sign-panel"))],
    ["选项行高度", (p) => px(rect(q(p, ".sign-option-item")).height)],
    ["列表 gap", (p) => cs(q(p, ".sign-options-list")).gap],
    ["checkbox 位置（源码顺序）", (p) => (q(p, ".sign-option-item").firstElementChild.tagName === "INPUT" ? "行首" : "行尾")],
    ["主按钮高度", (p) => px(rect(q(p, ".fans-panel__submit-btn")).height)],
    ["日志框字号", (p) => cs(q(p, ".sign-log-box")).fontSize],
    ["日志框对比（深色画面）", (p) => fmtContrast(p, q(p, ".sign-log-box"), "dark"), 4.5]
  ],

  controls: [
    ["开关尺寸（不变量）", (p) => size(q(p, ".sign-checkbox:not(:checked)"))],
    ["关态填充色", (p) => cs(q(p, ".sign-checkbox:not(:checked)")).backgroundColor],
    ["关态填充 vs 卡片底", (p) => {
      const el = q(p, ".sign-checkbox:not(:checked)");
      return String(contrast(surfaceOf(el, videoOf(p)), surfaceUnder(el, videoOf(p))));
    }],
    ["关态 1px 描边 vs 卡片底", (p) => {
      const el = q(p, ".sign-checkbox:not(:checked)");
      const ring = insetRingColor(el);
      return ring ? String(contrast(parseColor(ring), surfaceUnder(el, videoOf(p)))) : "无描边";
    }, 3],
    ["旋钮 vs 关态轨道", (p) => {
      const el = q(p, ".sign-checkbox:not(:checked)");
      const knob = parseColor(getComputedStyle(el, "::before").backgroundColor);
      return knob ? String(contrast(knob, surfaceOf(el, videoOf(p)))) : "—";
    }],
    ["开启态轨道色", (p) => cs(q(p, ".sign-checkbox:checked")).backgroundColor],
    ["开态轨道 vs 卡片底", (p) => {
      const el = q(p, ".sign-checkbox:checked");
      return String(contrast(surfaceOf(el, videoOf(p)), surfaceUnder(el, videoOf(p))));
    }, 3],
    ["关闭按钮视觉尺寸", (p) => size(q(p, ".miuix-modal__close"))],
    ["关闭按钮命中区", (p) => {
      const pseudo = getComputedStyle(q(p, ".miuix-modal__close"), "::after");
      return pseudo.width === "auto" || pseudo.content === "none"
        ? "无（= 视觉 26px）"
        : pseudo.width + " × " + pseudo.height;
    }],
    ["键盘焦点环", (p) => {
      const s = cs(q(p, ".is-demo-focus"));
      const visible = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
      return visible ? s.outlineWidth + " " + s.outlineStyle + " " + s.outlineColor : "无（outline:none）";
    }],
    ["主按钮高度", (p) => px(rect(q(p, ".ex-btn-primary")).height)],
    ["分段选中标签色（已达标）", (p) => cs(q(p, ".miuix-seg__item > input:checked + .miuix-seg__label")).color]
  ]
};

const body_of = (pane) => q(pane, ".miuix-modal__body");

/* 从 computed box-shadow 里取出「1px inset 描边」的颜色（Chrome 序列化成 rgb(...) 0px 0px 0px 1px inset） */
function insetRingColor(el) {
  const shadow = cs(el).boxShadow;
  if (!shadow || shadow === "none") return null;
  const match = shadow.match(/rgba?\([^)]+\)\s+0px\s+0px\s+0px\s+1px\s+inset/);
  return match ? match[0].replace(/\s+0px\s+0px\s+0px\s+1px\s+inset$/, "") : null;
}

/* ==========================================================================
   渲染
   ========================================================================== */
function stageMarkup(row, html) {
  return (
    '<div class="stage ' + (STACKED_ROWS.has(row.id) ? "stage--dock" : "stage--panel") + '">' +
      '<div class="stage__video"></div>' +
      '<div class="stage__danmaku"></div>' +
      '<span class="stage__hint"></span>' +
      html +
    "</div>"
  );
}

function decorateDock(pane) {
  for (const tile of pane.querySelectorAll(".ex-panel__wrap > div")) {
    tile.classList.remove("is-active", "ex-dock-active", "is-demo-hover");
  }
  const active = pane.querySelector(".extool-icon");
  if (active) active.classList.add("is-active", "ex-dock-active");
  const hovered = pane.querySelector(".popup-player");
  if (hovered) hovered.classList.add("is-demo-hover");
}

/* 真机导出带着 fixed 定位坐标，注入预览台前先摘掉定位，只留 width / display */
function normalizeRoot(pane, rowId) {
  const root = pane.querySelector(".stage > :not(.stage__video):not(.stage__danmaku):not(.stage__hint)");
  if (!root || !root.style) return;
  for (const prop of ["position", "inset", "top", "right", "bottom", "left", "z-index"]) {
    root.style.removeProperty(prop);
  }
  if (rowId === "dock") decorateDock(pane);
}

function renderRows(panels) {
  const host = document.querySelector("#pg-rows");
  const frag = document.createDocumentFragment();
  for (const row of ROWS) {
    const html = row.file ? panels.get(row.file) : controlsHTML();
    const section = document.createElement("section");
    section.className = "row" + (STACKED_ROWS.has(row.id) ? " row--stack" : "");
    section.id = "row-" + row.id;
    section.innerHTML =
      '<h2 class="row__title">' + row.title + "</h2>" +
      '<p class="row__note">' + row.note + "</p>" +
      '<div class="row__grid">' +
        '<article class="pane pane--before" data-side="before">' +
          '<div class="pane__tag"><span class="tag-before">BEFORE</span><small>现状 · ExPanel.css@HEAD + 未提交 Phosphor 层</small></div>' +
          stageMarkup(row, html) +
        "</article>" +
        '<article class="pane pane--after after" data-side="after">' +
          '<div class="pane__tag"><span class="tag-after">AFTER</span><small>' +
skinTagText() +
          "</small></div>" +
          stageMarkup(row, html) +
        "</article>" +
      "</div>" +
      '<ul class="delta" data-delta="' + row.id + '"></ul>' +
      (row.id === "dock" ? '<p class="dock-metric" id="dock-metric"></p>' : "");

    /* 两列是同一份 outerHTML，id 必然重复：按侧别加前缀。
       源码里靠 [id$="__title"] / [id$="__del"] 后缀选择的地方不受影响。
       同 name 的 radio 在整份文档里只有一个组，也必须各自前缀，否则后一列会取消前一列的勾选。 */
    for (const pane of section.querySelectorAll(".pane")) {
      const prefix = pane.dataset.side === "before" ? "b-" : "a-";
      for (const node of pane.querySelectorAll("[id]")) node.id = prefix + node.id;
      for (const field of pane.querySelectorAll("input[name], select[name], textarea[name]")) {
        field.name = prefix + field.name;
      }
      normalizeRoot(pane, row.id);
    }
    frag.appendChild(section);
  }
  host.appendChild(frag);
}

/* ==========================================================================
   实测 + 写回
   ========================================================================== */
function measureGroup(groupKey) {
  const beforePane = document.querySelector("#row-" + groupKey + " .pane--before");
  const afterPane = document.querySelector("#row-" + groupKey + " .pane--after");
  return (GROUPS[groupKey] || []).map(([label, read, threshold]) => {
    let before = "—", after = "—";
    try { before = read(beforePane); } catch (error) { before = "读取失败"; }
    try { after = read(afterPane); } catch (error) { after = "读取失败"; }
    return { label, before, after, threshold };
  });
}

function renderDeltas() {
  for (const row of ROWS) {
    const list = document.querySelector('[data-delta="' + row.id + '"]');
    if (!list) continue;
    list.innerHTML = "";
    const caption = document.createElement("li");
    caption.className = "delta__cap";
    caption.textContent = "数值差 · 本页当场实测（底图 " +
      ({ light: "frame-light.png 亮度均值 145/255", white: "近似纯白 ≈250/255", dark: "frame-dark.png 亮度均值 82/255" }[document.body.dataset.video] || "frame-dark.png") +
      "，半透明底逐层合成）";
    caption.style.display = "block";   /* .delta li 是 168px + 1fr 两列网格，标题必须跳出网格 */
    list.appendChild(caption);

    for (const item of measureGroup(row.id)) {
      const li = document.createElement("li");
      const same = item.before === item.after;
      let verdict = "";
      if (item.threshold !== undefined) {
        const num = parseFloat(item.after);
        if (!Number.isNaN(num)) {
          verdict = num >= item.threshold
            ? '<span class="d-pass">≥' + item.threshold + " ✓</span>"
            : '<span class="d-fail">＜' + item.threshold + " ✗</span>";
        }
      }
      li.innerHTML =
        '<span class="d-k">' + item.label + "</span>" +
        '<span class="d-v"><code>' + item.before + "</code>" +
        (same ? '<span class="d-note">（不变）</span>'
              : '<i class="arrow">→</i><code class="is-after">' + item.after + "</code>") +
        verdict + "</span>";
      list.appendChild(li);
    }
  }
}

function dumpRaw() {
  const raw = { video: document.body.dataset.video };
  for (const row of ROWS) raw[row.id] = measureGroup(row.id);
  globalThis.__PREVIEW_METRICS__ = raw;
  console.log("[preview] metrics " + JSON.stringify(raw));
}

/* ==========================================================================
   工具栏
   ========================================================================== */
function syncHints() {
  const label = {
    light: "亮色画面 · 白底看不见边界",
    white: "近似纯白 · 深色玻璃极限工况",
    dark: "深色画面 · 文字发灰"
  }[document.body.dataset.video] || "深色画面";
  for (const hint of document.querySelectorAll(".stage__hint")) hint.textContent = label;
}

function applyScrollMode() {
  const mode = new URLSearchParams(location.search).get("scroll");
  for (const body of document.querySelectorAll(".pane .miuix-modal__body")) {
    body.scrollTop = mode === "bottom" ? body.scrollHeight : 0;
  }
}

function bindToolbar() {
  const videoButtons = document.querySelectorAll('[data-act="video"]');
  for (const button of videoButtons) {
    button.addEventListener("click", () => {
      document.body.dataset.video = button.dataset.mode;
      for (const other of videoButtons) other.setAttribute("aria-pressed", String(other === button));
      syncHints();
      refresh();
    });
  }
  const hitButton = document.querySelector('[data-act="hit"]');
  hitButton.addEventListener("click", () => {
    hitButton.setAttribute("aria-pressed", String(document.body.classList.toggle("dbg-hit")));
  });
  document.querySelector('[data-act="restore"]').addEventListener("click", () => {
    for (const panel of document.querySelectorAll(".pane--after .miuix-modal")) {
      panel.style.setProperty("display", "flex", "important");
      panel.classList.add("miuix-modal-in");
    }
  });
}

function refresh() {
  renderDeltas();
  dumpRaw();
}

/* ==========================================================================
   启动
   ========================================================================== */
async function boot() {
  const params = new URLSearchParams(location.search);
  const videoParam = params.get("video");
  document.body.dataset.video = videoParam === "light" || videoParam === "white" ? videoParam : "dark";
  if (params.get("debug") === "1") document.body.classList.add("dbg-hit");
  if (params.get("delta") === "0") document.body.classList.add("no-delta");
  if (params.get("zoom") === "1") document.body.classList.add("zoom-mode");
  /* 皮肤与 Dock 主题是同一件事的两个入口：
       ?skin= 直接指定；?docktheme= 走「白天 → G2 / 黑夜 → dark2 / 跟随 → G2」；
       两个都给时 ?skin= 优先。默认 G2 + 跟随网页。 */
  const SKINS = ["glass2", "dark2", "dark", "glass", "glass3", "card"];
  const themeParam = ["light", "dark", "auto"].indexOf(params.get("docktheme")) >= 0
    ? params.get("docktheme")
    : "auto";
  document.body.dataset.dockTheme = themeParam;
  const requested = params.get("skin");
  const skin = SKINS.indexOf(requested) >= 0
    ? requested
    : (themeParam === "dark" ? "dark2" : "glass2");
  applySkin(skin);
  for (const button of document.querySelectorAll('[data-act="video"]')) {
    button.setAttribute("aria-pressed", String(button.dataset.mode === document.body.dataset.video));
  }
  document.querySelector('[data-act="hit"]').setAttribute("aria-pressed", String(document.body.classList.contains("dbg-hit")));

  let panels;
  try {
    panels = await loadPanels();
  } catch (error) {
    document.querySelector("#pg-rows").innerHTML =
      '<p class="pg-error">真机 DOM 读取失败：' + (error && error.message) +
      "。请确认静态服务根目录是仓库根，且 docs/ui-audit-2026-11-01/live/dom/ 存在。</p>";
    throw error;
  }

  renderRows(panels);
  installThemeTile();
  paintThemeBadge();
  paintDockMetric();
  /* 可调旋钮那一行：把真机扩展功能的同一份 DOM 注入两个预设舞台，
     两边内容完全一致，只有「岛的 alpha」与「说明文字墨色」不同 */
  const tunable = document.querySelector("#row-tunable");
  tunable.hidden = document.body.classList.contains("skin-card");
  if (!tunable.hidden) {
    const source = document.querySelector("#row-extool .pane--before .stage .extool");
    if (source) {
      for (const host of tunable.querySelectorAll(".gx-stage")) {
        const copy = source.cloneNode(true);
        for (const node of copy.querySelectorAll("[id]")) node.removeAttribute("id");
        host.appendChild(copy);
      }
    }
  }
  syncHints();
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  initAfterProposal();          /* 先搬按钮条，再量：否则量到的是搬之前的状态 */
  renderDeltas();
  bindToolbar();
  if (params.get("scroll") === "bottom") applyScrollMode();
  dumpRaw();
  document.body.dataset.ready = "1";
}

boot();