
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs/ui-audit-2026-11-01/metrics");
fs.mkdirSync(OUT, { recursive: true });

const FILES = [
  { key: "ExPanel.css", file: "src/packages/ExPanel/ExPanel.css" },
  { key: "ExIcon.css", file: "src/packages/ExIcon/ExIcon.css" },
];

function parseCss(raw) {
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const nl = [];
  for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) nl.push(i);
  const lineOf = (idx) => { let lo = 0, hi = nl.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (nl[mid] < idx) lo = mid + 1; else hi = mid; } return lo + 1; };
  const nodes = [];
  const stack = [];
  let buf = "", i = 0;
  const atOf = [];
  while (i < src.length) {
    const ch = src[i];
    if (ch === "{") {
      const sel = buf.trim().replace(/\s+/g, " ");
      const isAt = sel.startsWith("@");
      const parentAt = atOf.length ? atOf[atOf.length - 1] : null;
      stack.push({ isAtRule: isAt, selector: sel, line: lineOf(i), bodyStart: i + 1, parentAt });
      atOf.push(isAt ? sel : parentAt);
      buf = ""; i++; continue;
    }
    if (ch === "}") {
      const top = stack.pop(); atOf.pop();
      if (top && !top.isAtRule) nodes.push({ selector: top.selector, line: top.line, bodyStart: top.bodyStart, bodyEnd: i, parentAt: top.parentAt });
      buf = ""; i++; continue;
    }
    if (ch === ";") { buf = ""; i++; continue; }
    if (ch === "\n" || ch === "\r") { buf += " "; i++; continue; }
    buf += ch; i++;
  }
  // declarations
  const decls = [];
  for (const n of nodes) {
    const body = src.slice(n.bodyStart, n.bodyEnd);
    let d = 0, acc = "", propStartIdx = 0;
    const flush = () => {
      const t = acc.trim();
      if (!t) return;
      const ci = t.indexOf(":");
      if (ci < 0) return;
      let prop = t.slice(0, ci).trim();
      let value = t.slice(ci + 1).trim();
      let important = false;
      if (/!\s*important\s*$/i.test(value)) { important = true; value = value.replace(/!\s*important\s*$/i, "").trim(); }
      decls.push({ selector: n.selector, ruleLine: n.line, line: lineOf(n.bodyStart + propStartIdx), prop: prop.toLowerCase(), rawProp: prop, value, important, at: n.parentAt, charIdx: n.bodyStart + propStartIdx });
    };
    let depth = 0, inStr = null;
    for (let k = 0; k < body.length; k++) {
      const c = body[k];
      if (inStr) { if (c === inStr && body[k - 1] !== "\\") inStr = null; acc += c; continue; }
      if (c === '"' || c === "'") { inStr = c; acc += c; continue; }
      if (c === "(") { depth++; acc += c; continue; }
      if (c === ")") { depth--; acc += c; continue; }
      if (c === ";" && depth === 0) { flush(); acc = ""; propStartIdx = k + 1; continue; }
      if (!acc.trim() && /\S/.test(c)) propStartIdx = k;
      acc += c;
    }
    flush();
  }
  return { nodes, decls, lineOf, src };
}

function splitTop(v) { const out = []; let d = 0, cur = ""; for (const ch of v) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && d === 0) { out.push(cur.trim()); cur = ""; continue; } cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; }
function uniq(arr) { return [...new Set(arr)]; }
function countBy(arr, fn) { const m = new Map(); for (const a of arr) { const k = fn(a); m.set(k, (m.get(k) || 0) + 1); } return [...m.entries()].sort((a, b) => b[1] - a[1]); }
function toObj(entries) { const o = {}; for (const [k, v] of entries) o[k] = v; return o; }

// ---------- WCAG ----------
function srgbToLin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lum(rgb) { const [r, g, b] = rgb; return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b); }
function ratio(a, b) { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); }
function hexToRgb(h) {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 8) h = h.slice(0, 6);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function over(fg, alpha, bg) { return [0, 1, 2].map((i) => Math.round(fg[i] * alpha + bg[i] * (1 - alpha))); }
function fmt(rgb) { return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join(""); }

const all = {};
for (const f of FILES) {
  const raw = fs.readFileSync(path.join(ROOT, f.file), "utf8");
  all[f.key] = { raw, ...parseCss(raw), file: f.file };
}

// ============ 1. inventory + !important ============
const inventory = {};
for (const [k, d] of Object.entries(all)) {
  const imp = d.decls.filter((x) => x.important);
  const byProp = countBy(imp, (x) => x.prop);
  const bySel = countBy(imp, (x) => x.selector);
  inventory[k] = {
    file: d.file,
    lines: d.raw.split(/\r?\n/).length,
    bytes: d.raw.length,
    ruleBlocks: d.nodes.length,
    declarations: d.decls.length,
    importantCount: imp.length,
    importantRate: +(imp.length / d.decls.length * 100).toFixed(2),
    rulesWithImportant: uniq(imp.map((x) => x.ruleLine + "|" + x.selector)).length,
    importantByProp: toObj(byProp),
    importantTopSelectors: bySel.slice(0, 25).map(([s, c]) => ({ selector: s.length > 160 ? s.slice(0, 160) + "…" : s, count: c })),
    importantAllLines: imp.map((x) => ({ line: x.line, prop: x.rawProp, selector: x.selector.slice(0, 120) })),
    atRules: uniq(d.decls.map((x) => x.at).filter(Boolean)),
    mediaQueries: uniq(d.nodes.map((n) => n.parentAt).filter((a) => a && a.startsWith("@media"))),
    supportsRules: uniq(d.nodes.map((n) => n.parentAt).filter((a) => a && a.startsWith("@supports"))),
    keyframes: uniq(d.nodes.map((n) => n.parentAt).filter((a) => a && a.startsWith("@keyframes"))),
  };
}
fs.writeFileSync(path.join(OUT, "css-inventory.json"), JSON.stringify(inventory, null, 2));

// ============ 2. colors ============
const colorRe = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(white|black|transparent|currentColor)\b/g;
const colorReport = {};
for (const [k, d] of Object.entries(all)) {
  const found = [];
  for (const x of d.decls) {
    if (x.prop === "--miuix-modal-width" || x.prop === "--miuix-modal-height") { /* not colors */ }
    const m = x.value.match(colorRe);
    if (!m) continue;
    for (const c of m) found.push({ color: c.toLowerCase().replace(/\s+/g, ""), prop: x.prop, selector: x.selector.slice(0, 100), line: x.line });
  }
  const uniqColors = countBy(found, (x) => x.color);
  const isVarRef = found.filter((x) => /var\(/.test(x.color));
  colorReport[k] = {
    totalColorLiterals: found.length,
    uniqueColors: uniqColors.length,
    uniqueColorList: uniqColors.map(([c, n]) => ({ color: c, count: n })),
    occurrences: found,
  };
}
fs.writeFileSync(path.join(OUT, "css-colors.json"), JSON.stringify(colorReport, null, 2));

// ============ 3. typography ============
const typo = {};
for (const [k, d] of Object.entries(all)) {
  const num = (v) => { const m = v.match(/(-?[\d.]+)\s*(px|rem|em|%)/); return m ? { n: +m[1], u: m[2] } : null; };
  const fs_ = countBy(d.decls.filter((x) => x.prop === "font-size"), (x) => x.value);
  const fw = countBy(d.decls.filter((x) => x.prop === "font-weight"), (x) => x.value);
  const lh = countBy(d.decls.filter((x) => x.prop === "line-height"), (x) => x.value);
  const ls = countBy(d.decls.filter((x) => x.prop === "letter-spacing"), (x) => x.value);
  const ff = countBy(d.decls.filter((x) => x.prop === "font-family"), (x) => x.value);
  typo[k] = {
    fontSizes: toObj(fs_), fontSizePxSorted: fs_.map(([v]) => +((num(v) || { n: null }).n)).filter((v) => v !== null).sort((a, b) => a - b),
    fontWeights: toObj(fw),
    lineHeights: toObj(lh),
    letterSpacings: toObj(ls),
    fontFamilies: toObj(ff),
    fontSizeDeclLines: d.decls.filter((x) => x.prop === "font-size").map((x) => ({ line: x.line, value: x.value, selector: x.selector.slice(0, 90) })),
  };
}
fs.writeFileSync(path.join(OUT, "css-typography.json"), JSON.stringify(typo, null, 2));

// ============ 4. geometry (radius/shadow/blur/z-index/spacing) ============
const geo = {};
for (const [k, d] of Object.entries(all)) {
  const rad = countBy(d.decls.filter((x) => /border-radius$/.test(x.prop)), (x) => x.value);
  const shadow = d.decls.filter((x) => /box-shadow$/.test(x.prop));
  const blur = d.decls.filter((x) => /backdrop-filter$|^filter$/.test(x.prop));
  const z = d.decls.filter((x) => x.prop === "z-index");
  const willc = d.decls.filter((x) => x.prop === "will-change");
  const gap = countBy(d.decls.filter((x) => x.prop === "gap"), (x) => x.value);
  const padding = countBy(d.decls.filter((x) => x.prop === "padding"), (x) => x.value);
  geo[k] = {
    borderRadii: toObj(rad),
    boxShadowCount: shadow.length,
    boxShadowValues: shadow.map((x) => ({ line: x.line, selector: x.selector.slice(0, 90), value: x.value, layers: splitTop(x.value).length })),
    shadowLayerHistogram: toObj(countBy(shadow, (x) => String(splitTop(x.value).length))),
    shadowTopLayerCount: shadow.map((x) => ({ line: x.line, layers: splitTop(x.value).length, selector: x.selector.slice(0, 80), value: x.value })),
    backdropFilterCount: blur.length,
    backdropValues: blur.map((x) => ({ line: x.line, prop: x.prop, selector: x.selector.slice(0, 90), value: x.value })),
    blurRadiusHistogram: toObj(countBy(blur, (x) => (x.value.match(/blur\(([^)]*)\)/) || [])[1] || "(none)")),
    zIndexValues: z.map((x) => ({ line: x.line, value: x.value, selector: x.selector.slice(0, 90) })),
    zIndexHistogram: toObj(countBy(z, (x) => x.value)),
    willChange: willc.map((x) => ({ line: x.line, value: x.value, selector: x.selector.slice(0, 90) })),
    gaps: toObj(gap),
    paddings: toObj(padding),
  };
}
fs.writeFileSync(path.join(OUT, "css-geometry.json"), JSON.stringify(geo, null, 2));
console.log("stage1 done");

// ============ 5. motion ============
const motion = {};
for (const [k, d] of Object.entries(all)) {
  const tr = d.decls.filter((x) => x.prop === "transition" || x.prop === "transition-duration" || x.prop === "transition-timing-function" || x.prop === "transition-property");
  const an = d.decls.filter((x) => x.prop === "animation");
  const dur = (v) => (v.match(/\b(\d*\.?\d+)(ms|s)\b/g) || []);
  const ease = (v) => (v.match(/cubic-bezier\([^)]*\)|\b(ease-in-out|ease-in|ease-out|ease|linear|step-start|step-end)\b|var\(--miuix-spring\)/g) || []);
  const durAll = [], easeAll = [];
  for (const x of tr.concat(an)) { for (const v of dur(x.value)) durAll.push(v.replace(/s\b/, "s")); for (const e of ease(x.value)) easeAll.push(e); }
  const transProps = [];
  for (const x of tr) {
    for (const part of x.value.split(/,(?![^(]*\))/)) {
      const first = part.trim().split(/\s+/)[0];
      if (first) transProps.push(first);
    }
  }
  motion[k] = {
    transitionDecls: tr.map((x) => ({ line: x.line, prop: x.prop, value: x.value, selector: x.selector.slice(0, 90) })),
    animationDecls: an.map((x) => ({ line: x.line, value: x.value, selector: x.selector.slice(0, 90) })),
    durationHistogram: toObj(countBy(durAll, (x) => x)),
    easingHistogram: toObj(countBy(easeAll, (x) => x)),
    transitionedPropertyHistogram: toObj(countBy(transProps, (x) => x)),
    keyframeBlocks: d.nodes.filter((n) => n.parentAt && n.parentAt.startsWith("@keyframes")).map((n) => ({ keyframe: n.parentAt, line: n.line, selector: n.selector })),
    prefersReducedMotion: /prefers-reduced-motion/.test(d.raw),
    animatesLayoutProps: d.nodes.filter((n) => /@keyframes/.test(n.parentAt || "")).map((n) => n.selector),
  };
}
// layout-animating keyframes detail
for (const [k, d] of Object.entries(all)) {
  const kf = d.nodes.filter((n) => n.parentAt && n.parentAt.startsWith("@keyframes"));
  const bodyOf = (n) => d.src.slice(n.bodyStart, n.bodyEnd);
  motion[k].keyframeDecls = kf.map((n) => ({ keyframe: n.parentAt, selector: n.selector, line: n.line, decls: bodyOf(n).split(";").map((t) => t.trim()).filter(Boolean) }));
}
fs.writeFileSync(path.join(OUT, "css-motion.json"), JSON.stringify(motion, null, 2));

// ============ 6. tokens / var usage ============
const tokens = {};
for (const [k, d] of Object.entries(all)) {
  const defined = d.decls.filter((x) => x.prop.startsWith("--"));
  const varUses = [];
  for (const x of d.decls) {
    const m = x.value.match(/var\(\s*(--[\w-]+)/g);
    if (m) for (const v of m) varUses.push({ token: v.replace(/var\(\s*/, ""), line: x.line, prop: x.prop, selector: x.selector.slice(0, 80) });
  }
  const useCount = countBy(varUses, (x) => x.token);
  const defNames = defined.map((x) => x.prop);
  tokens[k] = {
    definedTokens: defined.map((x) => ({ name: x.prop, value: x.value, line: x.line })),
    tokenDefinitionCount: defined.length,
    varUses: varUses.length,
    varUseByToken: toObj(useCount),
    definedButUnused: defNames.filter((n) => !varUses.some((u) => u.token === n)),
    usedButUndefined: uniq(varUses.map((u) => u.token).filter((t) => !defNames.includes(t))),
    varUseLines: varUses,
    declarationsTotal: d.decls.length,
    varCoverageRate: +((varUses.length / d.decls.length) * 100).toFixed(2),
  };
}
fs.writeFileSync(path.join(OUT, "css-tokens.json"), JSON.stringify(tokens, null, 2));

// ============ 7. duplicate selectors / specificity conflicts ============
const dup = {};
for (const [k, d] of Object.entries(all)) {
  const bySel = new Map();
  for (const n of d.nodes) {
    const key = n.selector.replace(/\s+/g, " ");
    if (!bySel.has(key)) bySel.set(key, []);
    bySel.get(key).push(n.line);
  }
  const repeated = [...bySel.entries()].filter(([, ls]) => ls.length > 1).map(([sel, ls]) => ({ selector: sel.length > 200 ? sel.slice(0, 200) + "…" : sel, count: ls.length, lines: ls }));
  // same property declared more than once inside the same rule
  const dupInRule = [];
  const groups = new Map();
  for (const x of d.decls) { const key = x.line + "-" + x.prop; }
  const byRule = new Map();
  for (const n of d.nodes) {
    const ds = d.decls.filter((x) => x.ruleLine === n.line);
    const cnt = countBy(ds, (x) => x.prop);
    for (const [prop, c] of cnt) if (c > 1) dupInRule.push({ ruleLine: n.line, selector: n.selector.slice(0, 100), prop, count: c });
  }
  dup[k] = { repeatedSelectors: repeated.sort((a, b) => b.count - a.count), samePropTwiceInRule: dupInRule };
}
fs.writeFileSync(path.join(OUT, "css-duplicates.json"), JSON.stringify(dup, null, 2));
console.log("stage2 done");

