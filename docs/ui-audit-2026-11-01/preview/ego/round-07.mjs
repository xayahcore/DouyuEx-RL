const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const base = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
for (const [row, file] of [["row-update", "probe-update.png"], ["row-controls", "probe-controls.png"]]) {
  await page.goto(base);
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  await page.evaluate((id) => document.getElementById(id).scrollIntoView({ block: "start" }), row);
  await page.waitForTimeout(200);
  await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/" + file });
  console.log("SHOT " + file);
}
