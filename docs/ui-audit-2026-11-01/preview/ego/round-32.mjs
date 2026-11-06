const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";

await page.goto(BASE + "?skin=dark2&delta=0");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
const verify = await page.evaluate(() => {
  const pane = document.querySelector("#row-extool .pane--after");
  const card = pane.querySelector(".fans-panel__card");
  const shell = pane.querySelector(".extool");
  const row = pane.querySelector(".sign-option-item");
  const dock = document.querySelector("#row-dock .pane--after .ex-panel");
  const tile = document.querySelector("#row-dock .pane--after .ex-theme");
  return {
    shellBg: getComputedStyle(shell).backgroundColor,
    shellFilter: getComputedStyle(shell).backdropFilter,
    cardBg: getComputedStyle(card).backgroundColor,
    cardFilter: getComputedStyle(card).backdropFilter,
    rowFilter: row ? getComputedStyle(row).backdropFilter : "—",
    dockBg: getComputedStyle(dock).backgroundColor,
    dockFilter: getComputedStyle(dock).backdropFilter,
    tileBg: tile ? getComputedStyle(tile).backgroundColor : "—",
    tileFilter: tile ? getComputedStyle(tile).backdropFilter : "—",
    themeState: document.body.dataset.dockTheme,
    themeTitle: tile ? tile.title : "—",
    tileCount: document.querySelectorAll("#row-dock .pane--after .ex-panel__wrap > div").length,
    metric: (document.querySelector("#dock-metric") || {}).textContent,
    errors: window.__PREVIEW_ERRORS__
  };
});
console.log(JSON.stringify(verify, null, 1));
