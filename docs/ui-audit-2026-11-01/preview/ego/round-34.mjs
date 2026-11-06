const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";
for (const theme of ["light", "dark", "auto"]) {
  await page.goto(BASE + "?docktheme=" + theme + "&delta=0");
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  await page.evaluate(() => {
    const row = document.querySelector("#row-dock");
    window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 6);
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: DIR + "state-" + theme + ".png" });
  const rect = await page.evaluate(() => {
    const dock = document.querySelector("#row-dock .pane--after .ex-panel");
    const r = dock.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), body: document.body.className };
  });
  console.log("STATE " + theme + " " + JSON.stringify(rect));
}
