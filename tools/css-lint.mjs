#!/usr/bin/env node
/**
 * css-lint.mjs —— CSS 债务棘轮（2026-11-05）
 * 只看 ExPanel.css 的三个可量化指标，任何一项变差就红灯：
 *   1) 规则总数
 *   2) !important 数量
 *   3) 重复选择器数量（@keyframes 的 0%/100% 不算）
 * 基线在 tools/css-lint-baseline.json；改进后可用 --update 收紧基线。
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CSS = path.join(ROOT, "src/packages/ExPanel/ExPanel.css");
const BASE = path.join(ROOT, "tools/css-lint-baseline.json");

const css = fs.readFileSync(CSS, "utf8");

function parse(text) {
  const rules = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(text))) {
    const sel = m[1].trim().replace(/\s+/g, " ");
    const body = m[2];
    if (!sel || sel.startsWith("@")) continue;
    const props = body.split(";").map((x) => x.trim()).filter(Boolean)
      .map((d) => d.slice(0, d.indexOf(":")).trim()).filter(Boolean);
    rules.push({ sel, props });
  }
  return rules;
}

const rules = parse(css);
const important = (css.match(/!important/g) || []).length;

const counter = new Map();
for (const r of rules) counter.set(r.sel, (counter.get(r.sel) || 0) + 1);
const dups = [...counter.entries()].filter(([sel, n]) => n > 1 && !/^\d+%$/.test(sel));

const dupProps = [];
for (const r of rules) {
  const seen = new Set();
  for (const p of r.props) {
    if (seen.has(p)) dupProps.push({ sel: r.sel, prop: p });
    seen.add(p);
  }
}

const now = { rules: rules.length, important, duplicates: dups.length, dupProps: dupProps.length };
const update = process.argv.includes("--update");
let base = null;
try { base = JSON.parse(fs.readFileSync(BASE, "utf8")); } catch (e) {}

if (update || !base) {
  fs.writeFileSync(BASE, JSON.stringify(now, null, 2) + "\n", "utf8");
  console.log("[css-lint] 基线已写入:", JSON.stringify(now));
  process.exit(0);
}

const worse = [];
if (now.rules > base.rules) worse.push(`规则数 ${base.rules} → ${now.rules}`);
if (now.important > base.important) worse.push(`!important ${base.important} → ${now.important}`);
if (now.duplicates > base.duplicates) worse.push(`重复选择器 ${base.duplicates} → ${now.duplicates}`);
if (now.dupProps > base.dupProps) worse.push(`同规则重复声明 ${base.dupProps} → ${now.dupProps}`);

if (worse.length) {
  console.error("[css-lint] ✗ 债务变差：\n  " + worse.join("\n  "));
  if (dups.length) console.error("  重复选择器：" + dups.map(([s, n]) => `${s} ×${n}`).slice(0, 8).join(" | "));
  process.exit(1);
}

console.log("[css-lint] 通过（规则 " + now.rules + " / !important " + now.important + " / 重复 " + now.duplicates + " / 重复声明 " + now.dupProps + "）");
