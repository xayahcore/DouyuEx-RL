const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";
const out = [];
for (const skin of ["glass", "glass2", "glass3", "card"]) {
  await page.goto(BASE + "?skin=" + skin);
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  out.push(await page.evaluate((s) => {
    const pane = document.querySelector("#row-extool .pane--after");
    return {
      skin: s,
      body: document.body.className,
      shell: getComputedStyle(pane.querySelector(".extool")).backgroundColor,
      card: getComputedStyle(pane.querySelector(".fans-panel__card")).backgroundColor,
      tag: pane.querySelector(".pane__tag small").textContent.slice(0, 30),
      links: [...document.querySelectorAll("link[data-skin]")].filter((l) => l.media === "all").map((l) => l.dataset.skin),
      errors: window.__PREVIEW_ERRORS__.length
    };
  }, skin));
}
console.log(JSON.stringify(out, null, 1));

await page.goto(BASE);
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
await page.evaluate(() => document.querySelector("#row-diff").scrollIntoView({ block: "start" }));
await page.waitForTimeout(240);
await page.screenshot({ path: DIR + "16-diff-table.png" });
console.log("SHOT 16-diff-table.png");
