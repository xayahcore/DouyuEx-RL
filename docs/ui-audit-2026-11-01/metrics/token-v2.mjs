
import fs from "node:fs";
import path from "node:path";
const OUT = path.join(process.cwd(), "docs/ui-audit-2026-11-01/metrics");
const srgbToLin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = ([r, g, b]) => 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
const hex = (h) => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; };
const over = (fg, a, bg) => [0,1,2].map(i => fg[i]*a + bg[i]*(1-a));
const hex2 = (rgb) => "#" + rgb.map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");
const r2 = x => Math.round(x*100)/100;
const W=[255,255,255], K=[0,0,0], DARK=hex("#101418");
const glass = (base, layers) => layers.reduce((acc,[c,a]) => over(c,a,acc), base);

// 1) alpha ladder: how much does raising the panel white alpha buy?
const ladder = [];
for (const a of [0.60,0.65,0.70,0.75,0.80,0.85,0.90,0.95]) {
  const p = glass(DARK, [[W,a]]);
  const item = glass(p, [[W,0.35]]);
  const seg = glass(p, [[K,0.06]]);
  ladder.push({
    panelAlpha: a,
    panelHexOverDarkVideo: hex2(p),
    "#64748b_onPanel": r2(ratio(hex("#64748b"), p)),
    "#64748b_onItem": r2(ratio(hex("#64748b"), item)),
    "#64748b_onSeg": r2(ratio(hex("#64748b"), seg)),
    "#334155_onPanel": r2(ratio(hex("#334155"), p)),
    "#334155_onSeg": r2(ratio(hex("#334155"), seg)),
    "#0f172a_onPanel": r2(ratio(hex("#0f172a"), p)),
  });
}

// 2) blue solver: smallest darkening that reaches 4.5 on panel-over-dark-video
const PANEL_065 = glass(DARK, [[W,0.65]]);
const SEG_065 = glass(PANEL_065, [[K,0.06]]);
function solveBlue(targetRatio, bg) {
  // keep hue of #0066ff, scale toward black
  const base = hex("#0066ff");
  for (let k = 1.0; k >= 0.0; k -= 0.005) {
    const c = base.map(v => Math.round(v*k));
    if (ratio(c, bg) >= targetRatio) return hex2(c);
  }
  return null;
}
const blueSolve = {
  forPanelDark45: solveBlue(4.5, PANEL_065),
  forPanelDark70: solveBlue(7.0, PANEL_065),
  forSegDark45: solveBlue(4.5, SEG_065),
};
// verify
const verifyBlue = Object.fromEntries(Object.entries(blueSolve).map(([k,v]) => [k, v ? { hex: v, onPanel: r2(ratio(hex(v), PANEL_065)), onSeg: r2(ratio(hex(v), SEG_065)), onWhite: r2(ratio(hex(v), W)), whiteOnIt: r2(ratio(W, hex(v))) } : null]));

// 3) ink ladder on each real surface (dark video worst case), for token v2
const P = PANEL_065, C = glass(P,[[W,0.42]]), I = glass(P,[[W,0.35]]), S = glass(P,[[K,0.06]]), D = glass(DARK,[[W,0.72]]), T = glass(D,[[W,0.45]]);
const inks = ["#0f172a","#1e293b","#334155","#3f4a5f","#44506b","#475569","#64748b","#94a3b8"];
const inkTable = inks.map(c => ({ hex: c, panel: r2(ratio(hex(c),P)), card: r2(ratio(hex(c),C)), item: r2(ratio(hex(c),I)), seg: r2(ratio(hex(c),S)), dock: r2(ratio(hex(c),D)), tile: r2(ratio(hex(c),T)) }));

// 4) proposed v2 palette, verified
const v2 = {
  "--dx-ink-1": "#0f172a",
  "--dx-ink-2": "#334155",
  "--dx-ink-3": "#475569",
  "--dx-accent": blueSolve.forPanelDark45,
  "--dx-accent-strong": "#004de6",
  "--dx-danger": "#dc2626",
  "--dx-danger-text": "#b91c1c",
  "--dx-success": "#047857",
  "--dx-success-text": "#047857",
  "--dx-warning": "#b45309",
};
const v2verify = Object.fromEntries(Object.entries(v2).filter(([k])=>k!=="x").map(([k,val]) => [k, { value: val, onPanelDark: r2(ratio(hex(val), P)), onWhite: r2(ratio(hex(val), W)), whiteOnIt: r2(ratio(W, hex(val))) }]));

fs.writeFileSync(path.join(OUT, "css-token-v2-derivation.json"), JSON.stringify({ alphaLadder: ladder, blueSolve, verifyBlue, inkTable, v2, v2verify }, null, 2));
console.log(JSON.stringify({ alphaLadder: ladder, blueSolve: verifyBlue, inkTable }, null, 1));
