const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";
await page.goto("http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html?zoom=1");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
await page.waitForTimeout(300);
const info = await page.evaluate(() => {
  const grid = document.querySelector("#row-extool .row__grid");
  const card = document.querySelector("#row-extool .pane--after .fans-panel__card");
  return {
    gridW: Math.round(grid.getBoundingClientRect().width),
    cardW: Math.round(card.getBoundingClientRect().width),
    cardH: Math.round(card.getBoundingClientRect().height),
    cardTop: Math.round(card.getBoundingClientRect().top),
    cardBottom: Math.round(card.getBoundingClientRect().bottom),
    scrollW: document.documentElement.scrollWidth,
    viewport: innerWidth
  };
});
console.log("ZOOM " + JSON.stringify(info));
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: DIR + "11-zoom-text.png" });
console.log("SHOT 11-zoom-text.png");
