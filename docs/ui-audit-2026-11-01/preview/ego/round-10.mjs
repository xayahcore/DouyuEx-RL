const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";

/* ---- reduced-motion：用 CDP 真的把媒体特性切成 reduce ---- */
await page.cdp("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }]
});
await page.goto(BASE + "?delta=0");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
const rm = await page.evaluate(() => {
  const read = (side) => {
    const pane = document.querySelector("#row-dock .pane--" + side);
    const tile = pane.querySelector(".popup-player");
    const style = getComputedStyle(tile);
    return {
      transitionDuration: style.transitionDuration,
      animationDuration: style.animationDuration,
      lift: style.transform
    };
  };
  return { before: read("before"), after: read("after"), matches: matchMedia("(prefers-reduced-motion: reduce)").matches };
});
console.log("RM " + JSON.stringify(rm));
await page.evaluate(() => document.querySelector("#row-dock").scrollIntoView({ block: "start" }));
await page.waitForTimeout(220);
await page.screenshot({ path: DIR + "16-reduced-motion-dock.png" });
console.log("SHOT 16-reduced-motion-dock.png");

/* 复位媒体特性 */
await page.cdp("Emulation.setEmulatedMedia", { features: [] });

/* ---- 整页总览：试 fullPage ---- */
await page.goto(BASE);
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
try {
  await page.screenshot({ path: DIR + "00-overview-full.png", fullPage: true });
  console.log("SHOT 00-overview-full.png (fullPage)");
} catch (error) {
  console.log("FULLPAGE-FAILED " + String(error && error.message || error));
}
