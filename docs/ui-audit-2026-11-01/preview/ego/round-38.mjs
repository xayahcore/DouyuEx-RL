const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
await page.goto(BASE);
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
await page.evaluate(() => document.querySelector("#row-diff").scrollIntoView({ block: "start" }));
await page.waitForTimeout(260);
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/16-diff-table.png" });
console.log("SHOT 16-diff-table.png");
const verify = await page.evaluate(() => {
  const card = document.querySelector("#row-extool .pane--after .fans-panel__card");
  const shell = document.querySelector("#row-extool .pane--after .extool");
  return {
    tag: document.querySelector("#row-extool .pane--after .pane__tag small").textContent,
    theme: document.body.dataset.dockTheme,
    tiles: document.querySelectorAll("#row-dock .pane--after .ex-panel__wrap > div").length,
    shellBg: getComputedStyle(shell).backgroundColor,
    cardBg: getComputedStyle(card).backgroundColor,
    cardFilter: getComputedStyle(card).backdropFilter,
    errors: window.__PREVIEW_ERRORS__.length
  };
});
console.log("VERIFY " + JSON.stringify(verify));
