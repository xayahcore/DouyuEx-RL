
import fs from "node:fs";
import path from "node:path";
const OUT = path.join(process.cwd(), "docs/ui-audit-2026-11-01/metrics");

const srgbToLin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = ([r, g, b]) => 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
const hex = (h) => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const over = (fg, a, bg) => [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
const hex2 = (rgb) => "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const r2 = (x) => Math.round(x * 100) / 100;

// --- backdrops (video frames behind the glass) ---
const VIDEO = {
  "dark #101418 (暗场直播)": hex("#101418"),
  "pure #000000 (全黑帧)": hex("#000000"),
  "mid #6b7280 (中间调)": hex("#6b7280"),
  "light #d8dee6 (亮场/白底)": hex("#d8dee6"),
  "pure #ffffff (全白帧)": hex("#ffffff"),
};

// --- glass surfaces: alpha white layers stacked over the video ---
// order = outermost first applied over video
const SURFACES = [
  { name: "Dock .ex-panel (0.72)", layers: [[255, 255, 255, 0.72]] },
  { name: "三级面板 .miuix-modal (0.65)", layers: [[255, 255, 255, 0.65]] },
  { name: "面板 Header (0.65 + 0.45)", layers: [[255, 255, 255, 0.65], [255, 255, 255, 0.45]] },
  { name: "四级卡片 .miuix-card (0.65 + 0.42)", layers: [[255, 255, 255, 0.65], [255, 255, 255, 0.42]] },
  { name: "列表项 .miuix-item (0.65 + 0.35)", layers: [[255, 255, 255, 0.65], [255, 255, 255, 0.35]] },
  { name: "列表项 hover (0.65 + 0.75)", layers: [[255, 255, 255, 0.65], [255, 255, 255, 0.75]] },
  { name: "Dock 选中磁贴 (0.72 + 0.95)", layers: [[255, 255, 255, 0.72], [255, 255, 255, 0.95]] },
  { name: "面板内 close 按钮 (0.65 + 黑0.06)", layers: [[255, 255, 255, 0.65], [0, 0, 0, 0.06]] },
];

const TEXTS = [
  { name: "#0f172a 主标题/正文", rgb: hex("#0f172a") },
  { name: "#334155 图标/次级标题", rgb: hex("#334155") },
  { name: "#475569 关闭按钮/弱文本", rgb: hex("#475569") },
  { name: "#64748b 说明文字", rgb: hex("#64748b") },
  { name: "#94a3b8 占位/禁用", rgb: hex("#94a3b8") },
  { name: "#0066ff 强调蓝", rgb: hex("#0066ff") },
  { name: "#ffffff 反白", rgb: hex("#ffffff") },
];

const composite = (baseRgb, layers) => layers.reduce((acc, [r, g, b, a]) => over([r, g, b], a, acc), baseRgb);

const rows = [];
for (const [vname, vrgb] of Object.entries(VIDEO)) {
  for (const s of SURFACES) {
    const surf = composite(vrgb, s.layers);
    for (const t of TEXTS) {
      const cr = ratio(t.rgb, surf);
      rows.push({
        video: vname, surface: s.name, surfaceHex: hex2(surf), text: t.name, textHex: hex2(t.rgb),
        ratio: r2(cr), aa_normal: cr >= 4.5, aa_large: cr >= 3, aaa_normal: cr >= 7, aaa_large: cr >= 4.5,
      });
    }
  }
}
fs.writeFileSync(path.join(OUT, "css-contrast-glass.json"), JSON.stringify({ method: "WCAG 2.1 relative luminance; alpha composite of white glass layers over solid video frame; saturation boost of backdrop-filter not modeled (affects chroma only)", rows }, null, 2));

// --- solid pairs (buttons / badges / status) ---
const PAIRS = [
  ["#ffffff", "#0066ff", "主按钮 .ex-btn-primary 白字/蓝底"],
  ["#ffffff", "#2b7fff", "gift badge 白字/#2b7fff"],
  ["#ffffff", "#0055ff", "更新面板 白字/#0055ff"],
  ["#ffffff", "#3d8bff", "白字/#3d8bff"],
  ["#ffffff", "#004de6", "白字/#004de6"],
  ["#ffffff", "#ef4444", "关闭按钮 hover 白字/红底"],
  ["#ffffff", "#dc2626", "白字/#dc2626"],
  ["#ffffff", "#ff5d23", "白字/斗鱼橙"],
  ["#ffffff", "#10b981", "白字/#10b981"],
  ["#ffffff", "#059669", "白字/#059669"],
  ["#ffffff", "#d97706", "白字/#d97706"],
  ["#ffffff", "#f59e0b", "白字/#f59e0b"],
  ["#ffffff", "#b45309", "白字/#b45309"],
  ["#ffffff", "#b91c1c", "白字/#b91c1c"],
  ["#ffffff", "#047857", "白字/#047857"],
  ["#ffffff", "#b26a00", "白字/#b26a00"],
  ["#ffffff", "#d60909", "白字/#d60909"],
  ["#0066ff", "#ffffff", "蓝字白底"],
  ["#0f172a", "#ffffff", "深字白底"],
  ["#64748b", "#ffffff", "灰字白底"],
  ["#94a3b8", "#ffffff", "浅灰字白底"],
  ["#334155", "#ffffff", "图标字白底"],
  ["#475569", "rgba(0,0,0,0.06)overWhite", "placeholder"],
];
const solid = PAIRS.filter((p) => p[1].startsWith("#")).map(([fg, bg, note]) => {
  const cr = ratio(hex(fg), hex(bg));
  return { fg, bg, note, ratio: r2(cr), aa_normal: cr >= 4.5, aa_large: cr >= 3 };
});
// 0.06 black over white
const closeBg = over([0, 0, 0], 0.06, [255, 255, 255]);
solid.push({ fg: "#475569", bg: hex2(closeBg), note: ".miuix-modal__close 默认态 #475569 / rgba(0,0,0,0.06) on 面板", ratio: r2(ratio(hex("#475569"), composite(hex("#101418"), [[255,255,255,0.65],[0,0,0,0.06]]))), aa_normal: ratio(hex("#475569"), composite(hex("#101418"), [[255,255,255,0.65],[0,0,0,0.06]])) >= 4.5 });
fs.writeFileSync(path.join(OUT, "css-contrast-solid.json"), JSON.stringify({ rows: solid }, null, 2));

// --- summary: worst case for each text on the dark-video column ---
const summary = [];
for (const s of SURFACES) {
  const surfDark = composite(hex("#101418"), s.layers);
  const surfLight = composite(hex("#ffffff"), s.layers);
  summary.push({
    surface: s.name,
    overDarkVideo: hex2(surfDark), overWhiteVideo: hex2(surfLight),
    "#0f172a": [r2(ratio(hex("#0f172a"), surfDark)), r2(ratio(hex("#0f172a"), surfLight))],
    "#334155": [r2(ratio(hex("#334155"), surfDark)), r2(ratio(hex("#334155"), surfLight))],
    "#64748b": [r2(ratio(hex("#64748b"), surfDark)), r2(ratio(hex("#64748b"), surfLight))],
    "#94a3b8": [r2(ratio(hex("#94a3b8"), surfDark)), r2(ratio(hex("#94a3b8"), surfLight))],
    "#0066ff": [r2(ratio(hex("#0066ff"), surfDark)), r2(ratio(hex("#0066ff"), surfLight))],
  });
}
fs.writeFileSync(path.join(OUT, "css-contrast-summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 1));
