const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";
async function shoot(url, sel, name) {
  await page.goto(BASE + url);
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 25000 });
  await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollIntoView({ block: "start" }); }, sel);
  await page.waitForTimeout(320);
  console.log(name, await page.screenshot({ path: DIR + name }));
}
await shoot("?skin=glass3&delta=0", "#row-livetool", "_check-g3-livetool.png");
await shoot("?skin=glass2&delta=0", "#row-dock", "35-g2-dock.png");
await shoot("?skin=glass3&delta=0", "#row-dock", "_check-g3-dock.png");
