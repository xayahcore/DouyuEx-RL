const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";

async function shoot(name, query, target) {
  await page.goto(BASE + query);
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  if (target) {
    await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (el) el.scrollIntoView({ block: "start" });
    }, target);
  }
  await page.waitForTimeout(240);
  await page.screenshot({ path: DIR + name });
  console.log("SHOT " + name);
}
await shoot("32-g3-panel.png", "?skin=glass3&delta=0", "#row-extool .row__grid");
await shoot("33-g3-light.png", "?skin=glass3&video=light&delta=0", "#row-extool .row__grid");
await shoot("35-g2-dock.png", "?skin=glass2&delta=0", "#row-livetool .row__grid");

await page.goto(BASE + "?skin=glass3&delta=0");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
await page.evaluate(() => {
  const row = document.querySelector("#row-extool");
  window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 8);
});
await page.waitForTimeout(240);
await page.screenshot({ path: DIR + "tier-glass3.png" });
console.log("SHOT tier-glass3.png");
