
import fs from "node:fs"; import path from "node:path";
const OUT = path.join(process.cwd(), "docs/ui-audit-2026-11-01/metrics");
const lin=(c)=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
const lum=([r,g,b])=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
const ratio=(a,b)=>{const l1=lum(a),l2=lum(b);const hi=Math.max(l1,l2),lo=Math.min(l1,l2);return (hi+0.05)/(lo+0.05);};
const hex=(h)=>{h=h.replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];};
const over=(fg,a,bg)=>[0,1,2].map(i=>fg[i]*a+bg[i]*(1-a));
const hx=(rgb)=>"#"+rgb.map(v=>Math.round(v).toString(16).padStart(2,"0")).join("");
const r2=x=>Math.round(x*100)/100;
const W=[255,255,255], K=[0,0,0];
const VIDEO_DARK=hex("#101418"), VIDEO_LIGHT=hex("#d8dee6"), VIDEO_MAXW=hex("#ffffff"), VIDEO_BLACK=hex("#000000");

// A) 阈值：白色玻璃 + 深色墨，能否在任意视频帧上达 AA？求每个墨色所需的最小 alpha
function alphaRange(fg, tint, video, target = 4.5) {
  const pass = [];
  for (let a = 0; a <= 1.0001; a += 0.005) {
    const bg = over(tint, a, video);
    if (ratio(fg, bg) >= target) pass.push(Math.round(a * 1000) / 1000);
  }
  if (!pass.length) return { pass: false, min: null, max: null, kind: "never" };
  const min = pass[0], max = pass[pass.length - 1];
  return { pass: true, min, max, kind: max === 1 ? "needsAtLeast" : (min === 0 ? "needsAtMost" : "window") };
}
function maxAlphaFor(fg, tint, worstVideo, target=4.5) {
  // largest alpha such that the ratio still >= target (monotonic increasing for dark ink on white tint)
  let best = null;
  for (let a = 0; a <= 1.0; a += 0.005) {
    const bg = over(tint, a, worstVideo);
    if (ratio(fg, bg) >= target) best = Math.round(a*1000)/1000;
  }
  return best;
}
const whiteGlass = {};
for (const ink of ["#0f172a","#334155","#475569","#64748b","#94a3b8","#0066ff"]) {
  whiteGlass[ink] = { worstFrameBlack: alphaRange(hex(ink), W, VIDEO_BLACK), worstFrameDark: alphaRange(hex(ink), W, VIDEO_DARK), onWhiteOpaque: r2(ratio(hex(ink), W)) };
}
// B) 暗玻璃 + 白墨：需要多大 alpha 才能在纯白帧上仍是暗底
const darkTint = hex("#10141a");
const darkGlass = {};
for (const ink of ["#ffffff","#f8fafc","#cbd5e1","#94a3b8","#7db0ff"]) {
  darkGlass[ink] = { worstFrameWhite: alphaRange(hex(ink), darkTint, VIDEO_MAXW), worstFrameDark: alphaRange(hex(ink), darkTint, VIDEO_BLACK) };
}
// C) 每种候选墨在指定 alpha 下的实际比值（磨砂白卡路线，最坏帧=纯黑）
function table(fgList, tint, alphas, video) {
  return fgList.map(f => ({ hex: f, byAlpha: Object.fromEntries(alphas.map(a => {
    const bg = over(tint, a, video);
    return [a, { bg: hx(bg), ratio: r2(ratio(hex(f), bg)) }];
  })) }));
}
const cardTable = table(["#0f172a","#1e293b","#334155","#3f4a5f","#475569","#44506b","#64748b","#0066ff","#0047b3","#003482"], W, [0.85,0.88,0.90,0.92,0.95], VIDEO_BLACK);
// 蓝字：在 alpha 0.90 的白玻璃(最坏黑帧)上要 4.5 需要多深
const bg90black = over(W,0.90,VIDEO_BLACK);
const bg90d8 = over(W,0.90,VIDEO_LIGHT);
function solveBlueDeep(target, bg){ for(let k=1.0;k>=0;k-=0.002){const c=hex("#0066ff").map(v=>Math.round(v*k)); if(ratio(c,bg)>=target) return hx(c);} return null; }
const blueSolve90 = { on90BlackFrame: solveBlueDeep(4.5,bg90black), on90D8Frame: solveBlueDeep(4.5,bg90d8) };
const bg = over(W,0.90,VIDEO_BLACK);
const verify = Object.fromEntries(["#0047b3","#004dbf","#003482","#0050cc","#0057e0"].map(c=>[c,{on90Black:r2(ratio(hex(c),bg))}]));

fs.writeFileSync(path.join(OUT,"css-route-analysis.json"), JSON.stringify({
  whiteGlassMinAlpha: whiteGlass,
  darkGlassMinAlpha: darkGlass,
  cardInkTable: cardTable,
  blueSolve90, verify,
  note: "minAlpha = 该墨色在指定最坏帧上达到 4.5:1 所需的最小玻璃 alpha"
}, null, 2));
console.log(JSON.stringify({ whiteGlass, darkGlass, blueSolve90, verify }, null, 1));
