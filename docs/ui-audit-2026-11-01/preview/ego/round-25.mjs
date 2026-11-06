const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const out = [];
for (const skin of ["glass", "card"]) {
  await page.goto("http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html?skin=" + skin);
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  out.push(await page.evaluate((s) => ({
    skin: s,
    body: document.body.className,
    shell: getComputedStyle(document.querySelector("#row-extool .pane--after .extool")).backgroundColor,
    header: getComputedStyle(document.querySelector("#row-extool .pane--after .miuix-modal__header")).backgroundColor,
    tunableHidden: document.querySelector("#row-tunable").hidden,
    tag: document.querySelector("#row-extool .pane--after .pane__tag small").textContent.slice(0, 22),
    errors: window.__PREVIEW_ERRORS__.length
  }), skin));
}
console.log(JSON.stringify(out, null, 1));
