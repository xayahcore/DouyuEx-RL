const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
await page.goto("http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
const m = await page.evaluate(() => ({ errors: window.__PREVIEW_ERRORS__, metrics: window.__PREVIEW_METRICS__ }));
const flat = { errors: m.errors };
for (const key of Object.keys(m.metrics || {})) {
  if (key === "video") continue;
  flat[key] = m.metrics[key].map((row) => row.label + " :: " + row.before + " -> " + row.after);
}
console.log(JSON.stringify(flat, null, 1));
