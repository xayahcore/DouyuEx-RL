import fs from "node:fs/promises";
const ROOT = "D:/DouyuEx-RL";
const shim = await fs.readFile(ROOT + "/.zcode/ego-inject/gm-shim.js", "utf8");
const bundle = await fs.readFile(ROOT + "/DouyuEx_RL.user.js", "utf8");
const guard = "if (!window.__DYEX_EGO_INJECTED__) { window.__DYEX_EGO_INJECTED__ = true;\n";
const source = guard + shim + "\n;\n" + bundle + "\n}\n";

const task = await taskSpace("dyex-icon-ego");
const old = (await task.tabs()).filter((t) => t.page);
for (const t of old) { try { await t.page.close(); } catch (e) {} }
const page = await task.newPage();
await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source });
await page.goto("https://www.douyu.com/9999");
await page.waitForSelector(".ex-icon", { timeout: 60000 });
await page.evaluate(() => {
  document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; });
});
await page.waitForTimeout(2500);
const DIR = ROOT + "/docs/ui-audit-2026-11-01/live/g2-local/";
await fs.mkdir(DIR, { recursive: true });

// 打开二级 Dock
await page.evaluate(() => {
  const el = document.querySelector(".ex-icon");
  el && el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
});
await page.waitForTimeout(900);
console.log("dock:", await page.screenshot({ path: DIR + "70-dock.png" }));
const st = await page.evaluate(() => {
  const panel = document.querySelector(".ex-panel");
  const tile = document.querySelector(".ex-panel__wrap > div");
  const cs = (el) => el ? getComputedStyle(el).backgroundColor : null;
  return { dockShown: panel ? getComputedStyle(panel).display : "none", dockBg: cs(panel), tileBg: cs(tile) };
});
console.log("dock state:", JSON.stringify(st));
