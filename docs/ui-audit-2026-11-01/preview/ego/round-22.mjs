const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
await page.goto("http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
const out = await page.evaluate(() => {
  const pane = document.querySelector("#row-extool .pane--after");
  const modal = pane.querySelector(".extool");
  const card = pane.querySelector(".fans-panel__card");
  const header = pane.querySelector(".miuix-modal__header");
  const dockTile = document.querySelector("#row-dock .pane--after .ex-sign");
  const svg = document.querySelector("#row-dock .pane--after .ex-sign svg");
  const tunable = document.querySelectorAll("#row-tunable .gx-stage .extool").length;
  return {
    errors: window.__PREVIEW_ERRORS__,
    skin: document.body.className,
    links: [...document.querySelectorAll("link[data-skin]")].map((l) => l.dataset.skin + ":" + l.media),
    modalBg: getComputedStyle(modal).backgroundColor,
    modalBlur: getComputedStyle(modal).backdropFilter,
    headerBg: getComputedStyle(header).backgroundColor,
    headerMargin: getComputedStyle(header).margin,
    cardBg: getComputedStyle(card).backgroundColor,
    tileBg: getComputedStyle(dockTile).backgroundColor,
    tileIcon: getComputedStyle(svg).color,
    tunablePanels: tunable
  };
});
console.log(JSON.stringify(out, null, 1));
