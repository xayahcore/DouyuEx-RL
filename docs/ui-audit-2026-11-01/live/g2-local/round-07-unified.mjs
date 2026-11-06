import fs from "node:fs/promises";
const ROOT = "D:/DouyuEx-RL";
const DIR = ROOT + "/docs/ui-audit-2026-11-01/live/g2-local/panels2/";
await fs.mkdir(DIR, { recursive: true });
const shim = await fs.readFile(ROOT + "/.zcode/ego-inject/gm-shim.js", "utf8");
const bundle = await fs.readFile(ROOT + "/DouyuEx_RL.user.js", "utf8");
const source = "if (!window.__DYEX_UNIFY_INJECTED__) { window.__DYEX_UNIFY_INJECTED__ = true;\n" + shim + "\n;\n" + bundle + "\n}\n";
const task = await taskSpace("dyex-g2-unify");
const page = task.page("p1");
await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source });
await page.goto("https://www.douyu.com/9999");
await page.waitForSelector(".ex-icon", { timeout: 60000 });
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach(v => { v.muted = true; v.volume = 0; }); });
await page.waitForTimeout(2600);
await page.evaluate(() => { window.openExPanel && window.openExPanel(); });
await page.waitForTimeout(700);
console.log("token:", await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--miuix-modal-bg").trim()));
const tiles = [["ex-sign","01-sign"],["fans-continue","02-fans-continue"],["bloop-icon","03-bloop"],["extool-icon","04-extool"],["livetool-icon","05-livetool"],["popup-player","06-popup-player"],["ex-lottery","07-lottery"],["ex-update","08-update"]];
for (const [cls, name] of tiles) {
  await page.evaluate((c) => { const b = document.querySelector(".ex-panel__wrap > div." + c); if (b) b.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false })); }, cls);
  await page.waitForTimeout(1000);
  const box = await page.evaluate(() => {
    const el = [...document.querySelectorAll(".miuix-modal, .sign-panel, .fans-continue-panel, .extool, .livetool, .bloop, .exlottery, .exupdate-panel, .popup-player-panel")].find(e => getComputedStyle(e).display !== "none");
    if (!el) return null; const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  if (!box) { console.log(name, "NOT OPEN"); continue; }
  await page.screenshot({ path: DIR + name + ".png", clip: { x: box.x - 10, y: box.y - 10, width: box.w + 20, height: box.h + 20 } });
  console.log("shot", name);
}
