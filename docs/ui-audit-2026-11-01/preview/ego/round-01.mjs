const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
await page.goto("http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html");
let ready = "timeout";
try {
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  ready = "ok";
} catch (error) {
  ready = String(error && error.message || error);
}
const report = await page.evaluate(() => ({
  errors: window.__PREVIEW_ERRORS__ || [],
  rows: [...document.querySelectorAll(".row")].map((row) => row.id),
  tiles: document.querySelectorAll("#row-dock .pane--before .ex-panel__wrap > div").length,
  metrics: window.__PREVIEW_METRICS__ || null
}));
console.log(JSON.stringify({ spaceId: task.spaceId, page: page.label, ready, report }, null, 1));
