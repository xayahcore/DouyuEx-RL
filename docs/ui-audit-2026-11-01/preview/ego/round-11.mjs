const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";
await page.cdp("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }]
});
await page.goto(BASE + "?delta=0");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
const rm = await page.evaluate(() => {
  const read = (side) => {
    const tile = document.querySelector("#row-dock .pane--" + side + " .popup-player");
    const style = getComputedStyle(tile);
    const panel = document.querySelector("#row-extool .pane--" + side + " .extool");
    return {
      tileTransition: style.transitionDuration,
      tileAnimation: style.animationDuration,
      tileTransform: style.transform,
      panelAnimation: getComputedStyle(panel).animationName
    };
  };
  return { before: read("before"), after: read("after") };
});
console.log("RM " + JSON.stringify(rm));
await page.evaluate(() => document.querySelector("#row-dock").scrollIntoView({ block: "start" }));
await page.waitForTimeout(200);
await page.screenshot({ path: DIR + "16-reduced-motion-dock.png" });
console.log("SHOT 16 re-taken");
await page.cdp("Emulation.setEmulatedMedia", { features: [] });
