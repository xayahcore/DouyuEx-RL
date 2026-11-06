const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";

async function shoot(name, query, target) {
  await page.goto(BASE + (query || ""));
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  if (target) {
    await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (el) el.scrollIntoView({ block: "start" });
    }, target);
  }
  await page.waitForTimeout(240);
  await page.screenshot({ path: DIR + name });
  console.log("SHOT " + name);
}

await shoot("01-dock.png", "?delta=0", "#row-dock");
await shoot("02-extool.png", "?delta=0", "#row-extool");
await shoot("03-update.png", "?delta=0", "#row-update");
await shoot("04-livetool.png", "?delta=0", "#row-livetool");
await shoot("05-sign.png", "?delta=0", "#row-sign");
await shoot("06-controls.png", "?delta=0", "#row-controls");
await shoot("07-numbers-dock.png", "", "#row-dock .delta");
await shoot("08-numbers-extool.png", "", "#row-extool .delta");
await shoot("09-numbers-update.png", "", "#row-update .delta");
await shoot("10-numbers-controls.png", "", "#row-controls .delta");
await shoot("12-light-extool.png", "?video=light&delta=0", "#row-extool");
await shoot("13-light-dock.png", "?video=light&delta=0", "#row-dock");
await shoot("14-hit-area.png", "?debug=1&delta=0", "#row-controls");
await shoot("15-illegal-states.png", "", "#row-illegal");
await shoot("16-diff-table.png", "", "#row-diff");

/* 2× 放大对照：先切 deviceScaleFactor=2，再拍同一张卡片行 */
await page.cdp("Emulation.setDeviceMetricsOverride", {
  width: 1637, height: 800, deviceScaleFactor: 2, mobile: false
});
await page.goto(BASE + "?zoom=1");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
await page.waitForTimeout(300);
await page.screenshot({ path: DIR + "11-zoom-text.png" });
console.log("SHOT 11-zoom-text.png (dSF=2)");
await page.cdp("Emulation.clearDeviceMetricsOverride");

/* reduced-motion */
await page.cdp("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }]
});
await shoot("17-reduced-motion-dock.png", "?delta=0", "#row-dock");
await page.cdp("Emulation.setEmulatedMedia", { features: [] });

/* 整页总览 */
await shoot("00-overview-full.png", "", null);
