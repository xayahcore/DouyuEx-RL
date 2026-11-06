const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";

/* 200% 放大：CSS zoom:2 + 更高的视口 */
await page.cdp("Emulation.setDeviceMetricsOverride", { width: 1637, height: 900, deviceScaleFactor: 1, mobile: false });
await page.goto(BASE + "?zoom=1");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
await page.waitForTimeout(300);
await page.screenshot({ path: DIR + "11-zoom-text.png" });
console.log("SHOT 11-zoom-text.png");
await page.cdp("Emulation.clearDeviceMetricsOverride");

/* reduced-motion */
await page.cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await page.goto(BASE + "?delta=0");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
await page.evaluate(() => document.querySelector("#row-dock").scrollIntoView({ block: "start" }));
await page.waitForTimeout(240);
await page.screenshot({ path: DIR + "17-reduced-motion-dock.png" });
console.log("SHOT 17-reduced-motion-dock.png");
await page.cdp("Emulation.setEmulatedMedia", { features: [] });
