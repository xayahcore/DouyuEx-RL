#!/usr/bin/env node
/** ui-legacy-guard.mjs —— 旧类名只减不增（S3 门禁）
 *  统计「DOM 产出点」里的旧类名字面量：排除 ExUI.js（唯一真源）、
 *  排除 querySelector/closest 这类选择器用法、排除注释行。
 *  用法：node tools/ui-legacy-guard.mjs            校验
 *        node tools/ui-legacy-guard.mjs --update   回写基线（仅在该面板确实迁移完成时）
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE = path.join(ROOT, "tools/ui-legacy-baseline.json");
const CLASSES = [
  "fans-panel__card", "fans-panel__card-header", "fans-panel__card-title",
  "sign-option-item", "sign-option-text", "sign-option-title", "sign-option-desc",
  "popup-panel__card", "popup-panel__card-header", "popup-panel__card-title",
  "exupdate-panel__card", "exupdate-panel__card-header", "exupdate-panel__card-title",
  "fans-panel__action-wrap", "popup-panel__action-wrap", "exupdate-panel__action-wrap",
  "livetool__cell", "livetool__cell_title", "livetool__cell_option", "livetool__cell_switch",
  "miuix-card__title"
];

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}

const files = walk(path.join(ROOT, "src"), []).filter((f) => !f.endsWith("ExUI.js"));
const counts = {};
let total = 0;

for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return;
    if (/querySelector|closest\(|matches\(|Selector\b/.test(line)) return;
    for (const c of CLASSES) {
      if (line.indexOf(c) < 0) continue;
      const key = path.relative(ROOT, f).replace(/\\/g, "/") + ":" + (i + 1);
      counts[key] = (counts[key] || 0) + 1;
      total++;
    }
  });
}

const update = process.argv.includes("--update");
const baseline = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, "utf8")) : null;

if (update) {
  fs.writeFileSync(BASE, JSON.stringify({ total, files: counts }, null, 1));
  console.log("[ui-legacy-guard] 基线已回写：total=" + total);
  process.exit(0);
}

console.log("[ui-legacy-guard] 当前 DOM 产出点里的旧类名引用：" + total);
Object.entries(counts).forEach(([k, v]) => console.log("   " + k + " ×" + v));

if (!baseline) {
  console.log("   （无基线，先跑 --update 建档）");
  process.exit(0);
}
if (total > baseline.total) {
  console.error("[ui-legacy-guard] 失败：旧类名引用从 " + baseline.total + " 涨到 " + total + "（只许降不许升）");
  process.exit(1);
}
console.log("[ui-legacy-guard] 通过（基线 " + baseline.total + "，当前 " + total + "）");
