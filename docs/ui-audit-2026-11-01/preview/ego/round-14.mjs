const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";

await page.goto(BASE + "?zoom=1");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
await page.waitForTimeout(300);
const info = await page.evaluate(() => {
  const grid = document.querySelector("#row-extool .row__grid");
  const stage = document.querySelector("#row-extool .pane--before .stage");
  const card = document.querySelector("#row-extool .pane--before .fans-panel__card");
  return {
    gridW: Math.round(grid.getBoundingClientRect().width),
    stageW: Math.round(stage.getBoundingClientRect().width),
    stageH: Math.round(stage.getBoundingClientRect().height),
    cardW: Math.round(card.getBoundingClientRect().width),
    cardH: Math.round(card.getBoundingClientRect().height),
    docH: document.documentElement.scrollHeight,
    scrollW: document.documentElement.scrollWidth
  };
});
console.log("ZOOM " + JSON.stringify(info));
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: DIR + "11-zoom-text.png" });
console.log("SHOT 11-zoom-text.png");

/* 数值差清单（标注文案改了，重拍 4 张） */
async function shoot(name, target) {
  await page.goto(BASE);
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  await page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (el) el.scrollIntoView({ block: "start" });
  }, target);
  await page.waitForTimeout(220);
  await page.screenshot({ path: DIR + name });
  console.log("SHOT " + name);
}
await shoot("07-numbers-dock.png", "#row-dock .delta");
await shoot("08-numbers-extool.png", "#row-extool .delta");
await shoot("09-numbers-update.png", "#row-update .delta");
await shoot("10-numbers-controls.png", "#row-controls .delta");
await shoot("16-diff-table.png", "#row-diff");
