import fs from "node:fs/promises";
const ROOT = "D:/DouyuEx-RL";
const DIR = ROOT + "/docs/ui-audit-2026-11-01/live/g2-local/";
const task = await taskSpace("dyex-g2-local");
const page = task.page("p1");
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach(v => { v.muted = true; v.volume = 0; }); });
const m = await page.evaluate(() => {
  const act = document.querySelector(".ex-panel__wrap > div.is-active, .ex-panel__wrap > div.ex-dock-active");
  const nor = document.querySelector(".ex-panel__wrap > div.ex-sign");
  const g = (el) => el ? { cls: el.className, bg: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderColor, shadow: getComputedStyle(el).boxShadow.slice(0, 30) } : null;
  return { active: g(act), normal: g(nor) };
});
console.log("active vs normal:", JSON.stringify(m, null, 1));
const rect = await page.evaluate(() => {
  const p = document.querySelector(".ex-panel");
  const r = p.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
});
console.log("dock rect", JSON.stringify(rect));
console.log("dock crop:", await page.screenshot({ path: DIR + "74-dock-crop.png", clip: { x: rect.x - 12, y: rect.y - 12, width: rect.width + 24, height: rect.height + 24 } }).catch(e => "clip unsupported: " + e));
