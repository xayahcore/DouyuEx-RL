#!/usr/bin/env node
/** ui-nest-report.mjs —— 把关层快照算成表（纯 Node）
 *  node tools/ui-nest-report.mjs > docs/ui-migration/nest/_metrics.md
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = "docs/ui-migration/nest";
const PANELS = fs.readdirSync(ROOT).filter((d) => fs.statSync(path.join(ROOT, d)).isDirectory());
const MODES = ["base", "noBody", "noShell", "noCard", "all"];

const load = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { return null; } };
const alpha = (bg) => { const m = String(bg || "").match(/rgba?\(([^)]+)\)/); if (!m) return 0; const p = m[1].split(",").map(Number); return p.length > 3 ? p[3] : 1; };
const inside = (r, R) => r[0] < R[0] - 1 || r[1] < R[1] - 1 || r[0] + r[2] > R[0] + R[2] + 1 || r[1] + r[3] > R[1] + R[3] + 1;
const inter = (a, b) => {
  const x = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]));
  const y = Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
  return x * y;
};
const parentOf = (p) => { const i = p.lastIndexOf(">"); return i < 0 ? "" : p.slice(0, i); };

const rows = [];
for (const panel of PANELS) {
  const base = load(path.join(ROOT, panel, "base.json"));
  if (!base || !base.items) continue;
  const baseMap = new Map(base.items.map((i) => [i.p, i]));
  for (const mode of MODES) {
    const s = load(path.join(ROOT, panel, mode + ".json"));
    if (!s || !s.items) { rows.push({ panel, mode, missing: true }); continue; }
    let moved = 0, maxMove = 0, recolored = 0, overflow = 0, overlaps = 0, onGlass = 0;
    const byParent = new Map();
    for (const it of s.items) {
      const b = baseMap.get(it.p);
      if (b) {
        const d = Math.max(...[0, 1, 2, 3].map((k) => Math.abs(it.rect[k] - b.rect[k])));
        if (d > 1) moved++;
        if (d > maxMove) maxMove = d;
        if (it.bg !== b.bg || it.color !== b.color) recolored++;
      }
      if (inside(it.rect, s.rootRect)) overflow++;
      const par = parentOf(it.p);
      if (!byParent.has(par)) byParent.set(par, []);
      byParent.get(par).push(it.rect);
    }
    for (const arr of byParent.values()) {
      for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) if (inter(arr[i], arr[j]) > 4) overlaps++;
      arr.sort((a, b) => a[1] - b[1]);
      for (let i = 1; i < arr.length; i++) if (arr[i][1] - (arr[i - 1][1] + arr[i - 1][3]) < -4) { /* 重叠已计 */ }
    }
    // 文本是否直接压在透明背景上（无实底祖先）
    const bgByPath = new Map(s.items.map((i) => [i.p, i.bg]));
    for (const tp of s.textItems || []) {
      let cur = tp, hasGround = false;
      for (let guard = 0; guard < 40; guard++) {
        const bg = bgByPath.get(cur);
        if (bg && alpha(bg) > 0.05) { hasGround = true; break; }
        const par = parentOf(cur);
        if (!par) break;
        cur = par;
      }
      if (!hasGround) onGlass++;
    }
    rows.push({ panel, mode, els: s.items.length, moved, maxMove: Math.round(maxMove), recolored, overflow, overlaps, onGlass });
  }
}
console.log("| 面板 | 模式 | 元素 | 位置变化 | 最大位移 | 颜色变化 | 溢出容器 | 兄弟重叠 | 文本裸压 |");
console.log("|---|---|---|---|---|---|---|---|---|");
for (const r of rows) {
  if (r.missing) { console.log("| " + r.panel + " | " + r.mode + " | — | — | — | — | — | — | — |"); continue; }
  console.log("| " + r.panel + " | " + r.mode + " | " + r.els + " | " + r.moved + " | " + r.maxMove + "px | " + r.recolored + " | " + r.overflow + " | " + r.overlaps + " | " + r.onGlass + " |");
}
