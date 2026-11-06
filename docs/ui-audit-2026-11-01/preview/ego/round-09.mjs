const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";

async function shoot(name, query, target) {
  await page.goto(BASE + (query || ""));
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  if (target) {
    await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (el) el.scrollIntoView({ block: "start" });
    }, target);
    await page.waitForTimeout(220);
  }
  const file = DIR + name;
  await page.screenshot({ path: file });
  const size = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, y: Math.round(scrollY) }));
  console.log("SHOT " + name + " scrollY=" + size.y + " docH=" + size.h);
}

await shoot("01-dock.png", "?delta=0", "#row-dock");
await shoot("02-extool.png", "?delta=0", "#row-extool");
await shoot("03-update.png", "?delta=0", "#row-update");
await shoot("04-livetool.png", "?delta=0", "#row-livetool");
await shoot("05-sign.png", "?delta=0", "#row-sign");
await shoot("06-controls.png", "?delta=0", "#row-controls");
await shoot("07-numbers-dock.png", "", "#row-dock .delta");
await shoot("08-numbers-extool.png", "", "#row-extool .delta");
await shoot("09-numbers-update.png", "", "#row-update .delta");
await shoot("10-numbers-controls.png", "", "#row-controls .delta");
await shoot("11-light-extool.png", "?video=light&delta=0", "#row-extool");
await shoot("12-light-dock.png", "?video=light&delta=0", "#row-dock");
await shoot("13-hit-area.png", "?debug=1&delta=0", "#row-controls");
await shoot("14-illegal-states.png", "", "#row-illegal");
await shoot("15-diff-table.png", "", "#row-diff");
