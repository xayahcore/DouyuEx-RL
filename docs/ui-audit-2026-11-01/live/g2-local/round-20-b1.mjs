import fs from "node:fs/promises";
const ROOT = "D:/DouyuEx-RL";
const DIR = ROOT + "/docs/ui-audit-2026-11-01/live/g2-local/b1/";
await fs.mkdir(DIR, { recursive: true });
const shim = await fs.readFile(ROOT + "/.zcode/ego-inject/gm-shim.js", "utf8");
const bundle = await fs.readFile(ROOT + "/DouyuEx_RL.user.js", "utf8");
const source = "if (!window.__DYEX_B1_INJECTED__) { window.__DYEX_B1_INJECTED__ = true;\n" + shim + "\n;\n" + bundle + "\n}\n";
const task = await taskSpace("dyex-b1-sign");
const page = task.page("p1");
await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source });
await page.goto("https://www.douyu.com/9999");
await page.waitForSelector(".ex-icon", { timeout: 60000 });
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach(v => { v.muted = true; v.volume = 0; }); });
await page.waitForTimeout(2600);
await page.evaluate(() => { window.openExPanel && window.openExPanel(); });
await page.waitForTimeout(500);
await page.evaluate(() => { const b = document.querySelector(".ex-panel__wrap > div.ex-sign"); b && b.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false })); });
await page.waitForTimeout(1100);
const box = await page.evaluate(() => {
  const el = document.querySelector(".sign-panel");
  if (!el || getComputedStyle(el).display === "none") return null;
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
});
console.log("box", JSON.stringify(box));
if (box) await page.screenshot({ path: DIR + "01-sign.png", clip: { x: box.x - 8, y: box.y - 8, width: box.w + 16, height: box.h + 16 } });
const dom = await page.evaluate(() => {
  const p = document.querySelector(".sign-panel");
  return {
    cards: p.querySelectorAll(".ui-card").length,
    rows: p.querySelectorAll(".ui-row").length,
    legacyCards: p.querySelectorAll(".fans-panel__card").length,
    legacyRows: p.querySelectorAll(".sign-option-item").length,
    checkboxes: p.querySelectorAll("input.sign-checkbox").length,
    ids: [...p.querySelectorAll("input.sign-checkbox")].map(i => i.id).join(","),
    startBtn: !!p.querySelector("#sign-panel-start-btn"),
    statusTag: !!p.querySelector("#sign-status-tag"),
    logBox: !!p.querySelector("#sign-log-box"),
    inlineStyles: p.querySelectorAll("[style]").length
  };
});
console.log("dom", JSON.stringify(dom));
