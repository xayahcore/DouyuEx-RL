const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";
await page.goto("http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html?docktheme=auto&delta=0");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
await page.evaluate(() => {
  const row = document.querySelector("#row-dock");
  window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 6);
});
await page.waitForTimeout(250);
await page.screenshot({ path: DIR + "state-auto.png" });
const r = await page.evaluate(() => {
  const b = document.querySelector("#row-dock .pane--after .ex-theme-badge");
  const rect = b ? b.getBoundingClientRect() : null;
  return rect ? { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) } : "no badge";
});
console.log("BADGE " + JSON.stringify(r));
