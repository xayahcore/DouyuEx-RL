const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const rows = [];
for (const q of ["", "?skin=dark", "?skin=glass", "?skin=glass3", "?skin=card"]) {
  await page.goto(BASE + q);
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  rows.push(await page.evaluate((query) => ({
    query: query || "(默认)",
    body: document.body.className,
    tag: document.querySelector("#row-extool .pane--after .pane__tag small").textContent.slice(0, 34),
    loaded: [...document.querySelectorAll("link[data-skin]")].filter((l) => l.media === "all").map((l) => l.dataset.skin),
    errors: window.__PREVIEW_ERRORS__.length
  }), q));
}
console.log(JSON.stringify(rows, null, 1));
