#!/usr/bin/env node
/** ui-diff.mjs —— 结构化快照比对器（纯 Node，无依赖）
 *
 *   node tools/ui-diff.mjs <baselineDir> <afterDir> [--panel sign] [--vp 1625] [--json]
 *
 * 阈值（写死在代码里，改阈值等于改验收标准，必须评审）：
 *   几何 ≤1px · 颜色每通道 ≤2/255 · 字体必须完全相等 · 子项顺序必须一致
 * 退出码：0 = 通过；1 = 有超阈值差异；2 = 输入缺失
 */
import fs from "node:fs";
import path from "node:path";

const GEOM_TOL = 1.0;
const COLOR_TOL = 2;

const argv = process.argv.slice(2);
const dirs = argv.filter((a) => !a.startsWith("--"));
const opt = (n, d) => {
  const i = argv.indexOf("--" + n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const ONLY = opt("panel", "");
const VP = opt("vp", "");
const AS_JSON = argv.includes("--json");

if (dirs.length < 2) {
  console.error("usage: node tools/ui-diff.mjs <baselineDir> <afterDir> [--panel x] [--vp 1625]");
  process.exit(2);
}
const [baseDir, afterDir] = dirs;

const parseColor = (s) => {
  if (!s) return null;
  const m = String(s).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(",").map((x) => parseFloat(x));
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
};
const colorDiff = (a, b) => {
  const ca = parseColor(a), cb = parseColor(b);
  if (!ca || !cb) return ca === cb ? 0 : 999;
  if (Math.abs(ca.a - cb.a) > 0.01) return 999; // 透明度单独严格：它是"层数"的直接指标
  return Math.max(Math.abs(ca.r - cb.r), Math.abs(ca.g - cb.g), Math.abs(ca.b - cb.b));
};

const panels = fs.readdirSync(baseDir).filter((d) => {
  if (d.startsWith("_")) return false;
  if (ONLY && d !== ONLY) return false;
  return fs.statSync(path.join(baseDir, d)).isDirectory();
});

let failed = 0;
const report = [];

for (const panel of panels) {
  const files = fs.readdirSync(path.join(baseDir, panel)).filter((f) => f.startsWith("snapshot-") && f.endsWith(".json"));
  for (const f of files) {
    if (VP && !f.includes("-" + VP + ".")) continue;
    const pa = path.join(baseDir, panel, f);
    const pb = path.join(afterDir, panel, f);
    if (!fs.existsSync(pb)) {
      report.push({ panel, file: f, error: "after snapshot missing" });
      failed++;
      continue;
    }
    const A = JSON.parse(fs.readFileSync(pa, "utf8"));
    const B = JSON.parse(fs.readFileSync(pb, "utf8"));
    const entry = { panel, file: f, geometry: [], color: [], font: [], structure: [], ok: true };

    // 面板锚点会随页面布局漂移：比较前先减去各自面板原点，只比相对几何
    const norm = (snap) => {
      const r = snap.snap.root.rect;
      return (snap.snap.items || []).map((it) => ({ ...it, rect: [it.rect[0] - r[0], it.rect[1] - r[1], it.rect[2], it.rect[3]] }));
    };
    const aItems = A.snap && A.snap.items ? norm(A) : [];
    const bItemsNorm = B.snap && B.snap.items ? norm(B) : [];
    const bItems = bItemsNorm;
    const mapB = new Map(bItems.map((i) => [i.p, i]));
    const mapA = new Map(aItems.map((i) => [i.p, i]));

    for (const it of aItems) {
      const other = mapB.get(it.p);
      if (!other) { entry.structure.push("缺失: " + it.p + " (" + it.cls + ")"); continue; }
      for (let k = 0; k < 4; k++) {
        const d = Math.abs(it.rect[k] - other.rect[k]);
        if (d > GEOM_TOL) entry.geometry.push(it.p + " " + ["x", "y", "w", "h"][k] + " Δ" + d.toFixed(1) + " (" + it.rect[k] + "→" + other.rect[k] + ")");
      }
      const cd = Math.max(colorDiff(it.bg, other.bg), colorDiff(it.color, other.color));
      if (cd > COLOR_TOL) entry.color.push(it.p + " bg " + it.bg + "→" + other.bg + " / color " + it.color + "→" + other.color);
      if (it.font !== other.font) entry.font.push(it.p + " " + it.font + " → " + other.font);
    }
    for (const it of bItems) if (!mapA.has(it.p)) entry.structure.push("新增: " + it.p + " (" + it.cls + ")");

    // 顺序一致性：同父下兄弟的 path 序列必须一致
    const orderKey = (arr) => arr.map((i) => i.p).join("|");
    if (orderKey(aItems) !== orderKey(bItems)) entry.structure.push("元素顺序与基线不一致");

    entry.ok = !(entry.geometry.length || entry.color.length || entry.font.length || entry.structure.length);
    if (!entry.ok) failed++;
    report.push(entry);
    if (!AS_JSON) {
      console.log("\n## " + panel + " / " + f + " -> " + (entry.ok ? "PASS" : "FAIL"));
      console.log("   元素 " + aItems.length + " → " + bItems.length);
      for (const [k, label] of [["geometry", "几何"], ["color", "颜色"], ["font", "字体"], ["structure", "结构/顺序"]]) {
        if (entry[k].length) {
          console.log("   [" + label + "] " + entry[k].length + " 处");
          entry[k].slice(0, 10).forEach((s) => console.log("     - " + s));
          if (entry[k].length > 10) console.log("     … 其余 " + (entry[k].length - 10) + " 处见 JSON");
        }
      }
    }
  }
}

if (AS_JSON) console.log(JSON.stringify(report, null, 1));
console.log("\n[ui-diff] 面板 " + panels.length + " · 失败项 " + failed);
process.exit(failed > 0 ? 1 : 0);
