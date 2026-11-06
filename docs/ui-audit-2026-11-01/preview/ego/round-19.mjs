const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";

await page.goto(BASE + "?delta=0");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
const nums = await page.evaluate(() => {
  const rows = (window.__PREVIEW_METRICS__ || {}).controls || [];
  return rows.filter((r) => /描边|旋钮|填充|命中区|焦点环/.test(r.label)).map((r) => r.label + " " + r.before + " -> " + r.after);
});
console.log("NUMS " + JSON.stringify(nums, null, 1));

await page.evaluate(() => document.querySelector("#row-controls").scrollIntoView({ block: "start" }));
await page.waitForTimeout(220);
await page.screenshot({ path: DIR + "06-controls.png" });
console.log("SHOT 06-controls.png");

await page.goto(BASE);
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
await page.evaluate(() => document.querySelector("#row-controls .delta").scrollIntoView({ block: "start" }));
await page.waitForTimeout(220);
await page.screenshot({ path: DIR + "10-numbers-controls.png" });
console.log("SHOT 10-numbers-controls.png");

await page.evaluate(() => document.querySelector("#row-diff").scrollIntoView({ block: "start" }));
await page.waitForTimeout(220);
await page.screenshot({ path: DIR + "16-diff-table.png" });
console.log("SHOT 16-diff-table.png");
