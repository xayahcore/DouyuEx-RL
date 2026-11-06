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
await shoot("?skin=glass2&delta=0", "#row-controls", "37-g2-switch.png");
await shoot("?skin=glass2&delta=0", "#row-livetool", "30-g2-panel.png");
const st = await page.evaluate(() => {
  const sw = document.querySelector("#row-controls .pane.after .sign-checkbox");
  const cs = getComputedStyle(sw);
  return { shadow: cs.boxShadow, bg: cs.backgroundColor };
});
console.log("switch:", JSON.stringify(st));
