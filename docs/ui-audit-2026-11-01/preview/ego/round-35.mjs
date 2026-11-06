const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const out = [];
for (const q of ["?skin=dark2", "?docktheme=light", "?docktheme=dark", "?docktheme=auto"]) {
  await page.goto(BASE + q);
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  out.push(await page.evaluate((query) => ({
    query,
    body: document.body.className,
    tag: document.querySelector("#row-extool .pane--after .pane__tag small").textContent,
    errors: window.__PREVIEW_ERRORS__.length
  }), q));
}
console.log(JSON.stringify(out, null, 1));
