
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
const W = [255, 255, 255], K = [0, 0, 0];
const DARK = hex("#101418"), LIGHT = hex("#d8dee6");
const glass = (base, layers) => layers.reduce((acc, [c, a]) => over(c, a, acc), base);
const PANEL_D = glass(DARK, [[W, 0.65]]);        // #abadae
const PANEL_L = glass(hex("#ffffff"), [[W, 0.65]]);
const CARD_D = glass(PANEL_D, [[W, 0.42]]);
const ITEM_D = glass(PANEL_D, [[W, 0.35]]);
const SEG_D  = glass(PANEL_D, [[K, 0.06]]);
const CLOSE_D = glass(PANEL_D, [[K, 0.06]]);
const DOCK_D = glass(DARK, [[W, 0.72]]);
const TILE_D = glass(DOCK_D, [[W, 0.45]]);
const TILE_ACT = glass(DOCK_D, [[W, 0.95]]);
const LOG_D = glass(PANEL_D, [hex("#f1f5f9").concat(0)]) // placeholder
const LOGBOX_D = glass(PANEL_D, [[[241,245,249], 0.5]]);
const PILL_D = glass(PANEL_D, [[[0,102,255], 0.08]]);
const DRAWER_D = glass(PANEL_D, [[W, 0.55]]);

const mid = (a, b) => a.map((v, i) => (v + b[i]) / 2);
const gradMid = (c1, c2, t = 0.5) => c1.map((v, i) => v + (c2[i] - v) * t);

const claims = [];
const add = (id, fgHex, bgRgb, bgLabel, note) => {
  const fg = hex(fgHex);
  const cr = ratio(fg, bgRgb);
  claims.push({ id, fg: fgHex, bg: hex2(bgRgb), bgLabel, note, ratio: r2(cr), aa_normal: r2(cr) >= 4.5, aa_large: r2(cr) >= 3, aaa_normal: r2(cr) >= 7 });
};

// --- 具体引用点 ---
add("C01", "#64748b", ITEM_D, "四级 item 底(rgba255,0.35) over 面板0.65 over #101418", ".sign-option-desc 10.5px 说明文字");
add("C02", "#64748b", SEG_D, "分段胶囊底 rgba(0,0,0,0.06) over 面板0.65 over #101418", ".miuix-seg__label 11.5px 未选中态");
add("C03", "#0066ff", SEG_D, "同上", ".miuix-seg__label 选中态蓝字");
add("C04", "#94a3b8", PANEL_D, "面板0.65 over #101418", ".ex-gift-picker__close / .DanmakuTail-close 图标色");
add("C05", "#334155", PANEL_D, "面板0.65 over #101418", "Phosphor 图标层 .ex-panel__icon svg 基线");
add("C06", "#0066ff", PANEL_D, "面板0.65 over #101418", "var(--miuix-blue) 作正文/图标色");
add("C07", "#0066ff", PILL_D, "胶囊按钮底 rgba(0,102,255,0.08) over 面板0.65", ".ex-picker-btn / .popup-panel__paste-btn 文字");
add("C08", "#475569", CLOSE_D, "关闭按钮底 rgba(0,0,0,0.06) over 面板0.65", ".miuix-modal__close 默认态");
add("C09", "#ffffff", hex("#2b7fff"), "#2b7fff 纯色(渐变起点)", "主按钮白字最亮点");
add("C10", "#ffffff", gradMid(hex("#2b7fff"), hex("#0055ff")), "linear-gradient(135deg,#2b7fff,#0055ff) 中点", "主按钮白字平均值");
add("C11", "#ffffff", hex("#0055ff"), "#0055ff 纯色(渐变终点)", "主按钮白字最暗点");
add("C12", "#ffffff", gradMid(hex("#3d8bff"), hex("#004de6")), "hover 渐变中点 #3d8bff→#004de6", "主按钮 hover 白字");
add("C13", "#ffffff", hex("#94a3b8"), "#94a3b8 禁用底", "禁用主按钮白字");
add("C14", "#ffffff", hex("#f59e0b"), "#f59e0b 升级按钮渐变起点", ".exupdate-state-btn--upgrade");
add("C15", "#ffffff", gradMid(hex("#f59e0b"), hex("#d97706")), "升级按钮渐变中点", ".exupdate-state-btn--upgrade 平均值");
add("C16", "#ffffff", hex("#d97706"), "#d97706 升级按钮渐变终点", ".exupdate-state-btn--upgrade 最暗点");
add("C17", "#ffffff", hex("#ef4444"), "#ef4444", "关闭按钮 hover / 删除按钮 hover 白字");
add("C18", "#10b981", CARD_D, "四级卡片底 over 面板 over #101418", ".sign-status-tag 11px 绿字");
add("C19", "#334155", LOGBOX_D, "日志框 rgba(241,245,249,0.5) over 面板", ".sign-log-box 11px 正文");
add("C20", "#ffffff", DOCK_D, "Dock 0.72 over #101418", "Dock 内白字(若有)");
add("C21", "#334155", TILE_D, "Dock 磁贴 rgba255,0.45 over 0.72 over #101418", "磁贴图标色(旧 SVG 内联色)");
add("C22", "#334155", TILE_ACT, "选中磁贴 rgba255,0.95", "选中态图标色");
add("C23", "#0066ff", TILE_ACT, "选中磁贴", "选中态图标色 --miuix-blue");
add("C24", "#0f172a", PANEL_D, "面板0.65 over #101418", "面板标题/正文主色");
add("C25", "#0f172a", ITEM_D, "item 底", "选项标题");
add("C26", "#64748b", DRAWER_D, "抽屉内部 rgba255,0.55 over 面板", "抽屉内弱文字");
add("C27", "#0066ff", glass(PANEL_D, [[W,0.55]]), "抽屉内底", "抽屉内蓝字");

fs.writeFileSync(path.join(OUT, "css-contrast-claims.json"), JSON.stringify({
  constants: { PANEL_D: hex2(PANEL_D), CARD_D: hex2(CARD_D), ITEM_D: hex2(ITEM_D), SEG_D: hex2(SEG_D), CLOSE_D: hex2(CLOSE_D), DOCK_D: hex2(DOCK_D), TILE_D: hex2(TILE_D), PILL_D: hex2(PILL_D), DRAWER_D: hex2(DRAWER_D), LOGBOX_D: hex2(LOGBOX_D) },
  claims
}, null, 2));

// --- 候选蓝色：在面板玻璃(暗场)上 ≥4.5 ---
const candidates = ["#0066ff","#0058e6","#0050d0","#0048bf","#0040a8","#003d9e","#0b4fd0","#1449c4","#1d4ed8","#1e40af","#1552c9"];
const blues = candidates.map((c) => ({ hex: c, onPanelDark: r2(ratio(hex(c), PANEL_D)), onSegDark: r2(ratio(hex(c), SEG_D)), onWhite: r2(ratio(hex(c), hex("#ffffff"))), whiteOnIt: r2(ratio(hex("#ffffff"), hex(c))) }));

// --- 候选灰阶：说明文字目标 ≥4.5 on ITEM_D ---
const grays = ["#64748b","#5b6a82","#556077","#4b5563","#475569","#44506b","#3f4a5f","#334155"];
const grayTable = grays.map((c) => ({ hex: c, onItemDark: r2(ratio(hex(c), ITEM_D)), onPanelDark: r2(ratio(hex(c), PANEL_D)), onSegDark: r2(ratio(hex(c), SEG_D)), onWhite: r2(ratio(hex(c), hex("#ffffff"))) }));

// --- 候选升级橙：白字 ≥4.5 ---
const oranges = ["#f59e0b","#e08c00","#c77700","#b45309","#a34a00","#92400e"];
const orangeTable = oranges.map((c) => ({ hex: c, whiteOnIt: r2(ratio(hex("#ffffff"), hex(c))) }));

fs.writeFileSync(path.join(OUT, "css-token-v2-candidates.json"), JSON.stringify({ blues, grayTable, orangeTable }, null, 2));
console.log(JSON.stringify({ claims: claims.map(c=>[c.id,c.ratio,c.aa_normal?"AA":"FAIL",c.note]), blues, grayTable, orangeTable }, null, 1));
