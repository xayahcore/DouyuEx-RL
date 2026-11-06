const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
await page.goto("http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/switch-compare.html");
await page.waitForTimeout(600);
console.log("shot:", await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/38-switch-nohalo.png" }));
