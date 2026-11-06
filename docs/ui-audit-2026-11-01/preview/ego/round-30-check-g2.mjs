const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";
await page.goto(BASE + "?skin=glass2&delta=0");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 25000 });
await page.evaluate(() => document.querySelector("#row-livetool").scrollIntoView({ block: "start" }));
await page.waitForTimeout(300);
console.log("g2-livetool:", await page.screenshot({ path: DIR + "_check-g2-livetool.png" }));
const st = await page.evaluate(() => {
  const pane = document.querySelector("#row-livetool .pane.after");
  const card = pane && pane.querySelector(".fans-panel__card, .livetool__cell");
  const item = pane && pane.querySelector(".sign-option-item");
  const sw = pane && pane.querySelector(".sign-checkbox");
  const cs = (el) => el ? { bg: getComputedStyle(el).backgroundColor, display: getComputedStyle(el).display, pos: getComputedStyle(el).position, h: Math.round(el.getBoundingClientRect().height) } : null;
  return { pane: cs(pane), card: cs(card), item: cs(item), sw: cs(sw), swShadow: sw ? getComputedStyle(sw).boxShadow : null };
});
console.log("styles:", JSON.stringify(st));
