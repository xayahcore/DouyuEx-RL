const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
await page.goto("http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });

const debug = await page.evaluate(() => {
  const out = { errors: window.__PREVIEW_ERRORS__ || [] };
  for (const id of ["row-update", "row-sign"]) {
    const row = document.getElementById(id);
    const perSide = {};
    for (const side of ["before", "after"]) {
      const pane = row.querySelector(".pane--" + side);
      const body = pane.querySelector(".miuix-modal__body");
      const bar = pane.querySelector(".fans-panel__action-wrap, .exupdate-panel__action-wrap");
      if (!body || !bar) { perSide[side] = "missing body/bar"; continue; }
      body.scrollTop = body.scrollHeight;
      const card = bar.previousElementSibling;
      const lines = card ? card.querySelectorAll("li, .sign-option-item") : [];
      const probe = lines.length ? lines[lines.length - 1] : card;
      const barTop = Math.round(bar.getBoundingClientRect().top);
      const probeBottom = probe ? Math.round(probe.getBoundingClientRect().bottom) : null;
      perSide[side] = {
        barParent: bar.parentElement.className,
        barTop,
        probeBottom,
        overlap: probeBottom === null ? null : probeBottom - barTop,
        scrollTop: Math.round(body.scrollTop),
        scrollHeight: body.scrollHeight,
        clientHeight: Math.round(body.clientHeight)
      };
      body.scrollTop = 0;
    }
    out[id] = perSide;
  }
  return out;
});
console.log("DEBUG " + JSON.stringify(debug, null, 1));

const m = await page.evaluate(() => window.__PREVIEW_METRICS__ || null);
const flat = {};
for (const key of Object.keys(m || {})) {
  if (key === "video") continue;
  flat[key] = m[key].map((row) => row.label + " :: " + row.before + " -> " + row.after);
}
console.log("METRICS " + JSON.stringify(flat, null, 1));
