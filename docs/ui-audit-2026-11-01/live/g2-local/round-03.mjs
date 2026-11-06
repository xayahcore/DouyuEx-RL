import fs from "node:fs/promises";
const ROOT = "D:/DouyuEx-RL";
const shim = await fs.readFile(ROOT + "/.zcode/ego-inject/gm-shim.js", "utf8");
const bundle = await fs.readFile(ROOT + "/DouyuEx_RL.user.js", "utf8");
const guard = "if (!window.__DYEX_PARITY_INJECTED__) { window.__DYEX_PARITY_INJECTED__ = true;\n";
const source = guard + shim + "\n;\n" + bundle + "\n}\n";

const task = await taskSpace("dyex-g2-local");
const page = task.page("p1");
await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source });
await page.goto("https://www.douyu.com/9999");
await page.waitForSelector(".ex-icon", { timeout: 60000 });
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach(v => { v.muted = true; v.volume = 0; }); });
await page.waitForTimeout(2600);
const info = await page.evaluate(() => {
  const styles = [...document.querySelectorAll("style")].map(s => s.textContent || "").join("");
  return {
    token: getComputedStyle(document.documentElement).getPropertyValue("--miuix-modal-bg").trim(),
    hasNew: styles.includes("rgba(255, 255, 255, 0.34)"),
    hasOld: styles.includes("rgba(255, 255, 255, 0.72)"),
    icons: document.querySelectorAll(".ex-icon").length,
    docks: document.querySelectorAll(".ex-panel").length,
  };
});
console.log("info:", JSON.stringify(info));
const DIR = ROOT + "/docs/ui-audit-2026-11-01/live/g2-local/";
await fs.mkdir(DIR, { recursive: true });
await page.evaluate(() => {
  const el = document.querySelector(".ex-icon");
  el && el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
});
await page.waitForTimeout(900);
const st = await page.evaluate(() => {
  const p = document.querySelector(".ex-panel");
  const tile = document.querySelector(".ex-panel__wrap > div");
  return { display: p ? getComputedStyle(p).display : null, dockBg: p ? getComputedStyle(p).backgroundColor : null, tileBg: tile ? getComputedStyle(tile).backgroundColor : null };
});
console.log("dock:", JSON.stringify(st));
console.log("shot:", await page.screenshot({ path: DIR + "70-dock.png" }));
