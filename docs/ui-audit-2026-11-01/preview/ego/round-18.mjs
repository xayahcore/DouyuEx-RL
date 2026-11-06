const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
await page.goto("http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
const out = await page.evaluate(() => ({
  errors: window.__PREVIEW_ERRORS__,
  rows: document.querySelectorAll(".row").length,
  extool: (window.__PREVIEW_METRICS__ || {}).extool.filter((r) =>
    /副标题对比|面板底 alpha|选项行高度/.test(r.label)
  ).map((r) => r.label + " " + r.before + " -> " + r.after),
  controls: (window.__PREVIEW_METRICS__ || {}).controls.filter((r) =>
    /描边|旋钮|命中区|焦点环/.test(r.label)
  ).map((r) => r.label + " " + r.before + " -> " + r.after),
  update: (window.__PREVIEW_METRICS__ || {}).update.filter((r) =>
    /压住/.test(r.label)
  ).map((r) => r.label + " " + r.before + " -> " + r.after)
}));
console.log(JSON.stringify(out, null, 1));
