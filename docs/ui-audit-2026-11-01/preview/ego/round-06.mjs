const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
await page.goto("http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
await page.evaluate(() => document.getElementById("row-extool").scrollIntoView({ block: "start" }));
await page.waitForTimeout(250);
const shot = await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/probe-extool.png" });
console.log("SHOT " + shot);
