const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
await page.goto("http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
const info = await page.evaluate(() => ({
  height: document.documentElement.scrollHeight,
  width: document.documentElement.scrollWidth,
  viewport: { w: innerWidth, h: innerHeight },
  errors: window.__PREVIEW_ERRORS__
}));
console.log("INFO " + JSON.stringify(info));
const shot = await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/probe-viewport.png" });
console.log("SHOT " + shot);
