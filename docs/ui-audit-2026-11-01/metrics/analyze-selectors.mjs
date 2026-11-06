
import fs from "node:fs";
import path from "node:path";
const OUT = path.join(process.cwd(), "docs/ui-audit-2026-11-01/metrics");
const raw = fs.readFileSync("src/packages/ExPanel/ExPanel.css", "utf8");
const src = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
const nl = []; for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) nl.push(i);
const lineOf = (idx) => { let lo = 0, hi = nl.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (nl[mid] < idx) lo = mid + 1; else hi = mid; } return lo + 1; };
const nodes = []; const stack = []; let buf = "", i = 0; const atOf = [];
while (i < src.length) {
  const ch = src[i];
  if (ch === "{") { const sel = buf.trim().replace(/\s+/g, " "); const isAt = sel.startsWith("@"); const pa = atOf.length ? atOf[atOf.length-1] : null; stack.push({ isAt, selector: sel, line: lineOf(i), bodyStart: i+1, parentAt: pa }); atOf.push(isAt ? sel : pa); buf = ""; i++; continue; }
  if (ch === "}") { const top = stack.pop(); atOf.pop(); if (top && !top.isAt) nodes.push({ selector: top.selector, line: top.line, bodyStart: top.bodyStart, bodyEnd: i, parentAt: top.parentAt }); buf = ""; i++; continue; }
  if (ch === ";") { buf = ""; i++; continue; }
  if (ch === "\n" || ch === "\r") { buf += " "; i++; continue; }
  buf += ch; i++;
}
const splitTop = (v) => { const out = []; let d = 0, cur = ""; for (const ch of v) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && d === 0) { out.push(cur.trim()); cur = ""; continue; } cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };
function splitDecls(body) { const out = []; let d = 0, str = null, cur = ""; for (let k = 0; k < body.length; k++) { const ch = body[k]; if (str) { if (ch === str && body[k-1] !== "\\") str = null; cur += ch; continue; } if (ch === '"' || ch === "'") { str = ch; cur += ch; continue; } if (ch === "(") { d++; cur += ch; continue; } if (ch === ")") { d--; cur += ch; continue; } if (ch === ";" && d === 0) { out.push(cur); cur = ""; continue; } cur += ch; } if (cur.trim()) out.push(cur); return out; }
const declsOf = (n) => { const body = src.slice(n.bodyStart, n.bodyEnd); return splitDecls(body).map((t) => { const ci = t.indexOf(":"); if (ci < 0) return null; let pp = t.slice(0, ci).trim(), v = t.slice(ci+1).trim(); const imp = /!\s*important\s*$/i.test(v); v = v.replace(/!\s*important\s*$/i, "").trim(); return { prop: pp.toLowerCase(), value: v, important: imp }; }).filter(Boolean); };

// ---- 1) class frequency ----
const classRe = /\.([a-zA-Z_][\w-]*)/g;
const classRules = new Map();
for (const n of nodes) {
  if (n.parentAt) continue; // skip keyframe children
  const seen = new Set();
  let m; classRe.lastIndex = 0;
  while ((m = classRe.exec(n.selector))) seen.add(m[1]);
  for (const c of seen) { if (!classRules.has(c)) classRules.set(c, []); classRules.get(c).push(n.line); }
}
const classFreq = [...classRules.entries()].map(([c, ls]) => ({ cls: c, ruleCount: ls.length, lines: ls })).sort((a, b) => b.ruleCount - a.ruleCount);

// ---- 2) interactive target sizes ----
const targets = [];
for (const n of nodes) {
  if (n.parentAt) continue;
  const ds = declsOf(n);
  const has = (p) => ds.find((d) => d.prop === p);
  if (!has("cursor")) continue;
  const h = has("height"), w = has("width"), pad = has("padding"), fs_ = has("font-size"), lh = has("line-height");
  const px = (v) => { const m = String(v || "").match(/^([\d.]+)px$/); return m ? +m[1] : null; };
  let hpx = px(h && h.value);
  if (hpx === null && pad && fs_) {
    const parts = pad.value.split(/\s+/).map(px);
    const tb = parts.length >= 2 ? (parts[0] || 0) + (parts[2] !== undefined ? parts[2] : (parts[0] || 0)) : 0;
    const lhv = lh ? (lh.value === "normal" ? null : (px(lh.value) || null)) : null;
    const lineBox = lhv || +(fs_.value.replace("px","")) * 1.2;
    hpx = Math.round((lineBox + tb) * 10) / 10;
  }
  targets.push({ line: n.line, selector: n.selector.slice(0, 110), width: w ? w.value : null, height: h ? h.value : null, padding: pad ? pad.value : null, fontSize: fs_ ? fs_.value : null, computedHeight: hpx });
}
const smallTargets = targets.filter((t) => t.computedHeight !== null && t.computedHeight < 24).sort((a, b) => a.computedHeight - b.computedHeight);

// ---- 3) small fonts ----
const smallFonts = [];
for (const n of nodes) {
  if (n.parentAt) continue;
  const ds = declsOf(n);
  const fs_ = ds.find((d) => d.prop === "font-size");
  if (!fs_) continue;
  const v = parseFloat(fs_.value);
  if (!/^\d/.test(fs_.value)) continue;
  if (v < 11.5) smallFonts.push({ line: n.line, selector: n.selector.slice(0, 110), size: fs_.value, color: (ds.find(d=>d.prop==="color")||{}).value || null, text: null });
}

// ---- 4) section header audit ----
const secRe = /^\s*(\d+(?:\.\d+)?)\.\s*(.+)$/gm;
const secs = [];
raw.split(/\r?\n/).forEach((ln, idx) => {
  const m = ln.match(/^\s{2,}(\d+(?:\.\d+)?)\.\s+(\S.*)$/);
  if (m && /^[\d.]+\./.test(ln.trim())) secs.push({ line: idx + 1, num: m[1], title: m[2].slice(0, 80) });
});

fs.writeFileSync(path.join(OUT, "css-selectors.json"), JSON.stringify({ classFrequency: classFreq, totalRules: nodes.filter(n=>!n.parentAt).length }, null, 2));
fs.writeFileSync(path.join(OUT, "css-target-size.json"), JSON.stringify({ targets, smallTargets }, null, 2));
fs.writeFileSync(path.join(OUT, "css-small-fonts.json"), JSON.stringify({ smallFonts, count: smallFonts.length }, null, 2));
fs.writeFileSync(path.join(OUT, "css-sections.json"), JSON.stringify({ sections: secs }, null, 2));
console.log("top classes:", classFreq.slice(0,15).map(c=>c.cls+":"+c.ruleCount).join(", "));
console.log("smallTargets:", smallTargets.length);
console.log(smallTargets.slice(0,25).map(t=>t.computedHeight+"px  L"+t.line+"  "+t.selector).join("\n"));
console.log("\nsmallFonts:", smallFonts.length);
console.log(smallFonts.map(t=>t.size+"  L"+t.line+"  "+t.selector+"  color="+t.color).join("\n"));
console.log("\nsections:", secs.length, JSON.stringify(secs.map(s=>s.num)));
