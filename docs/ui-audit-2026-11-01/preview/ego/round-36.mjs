const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";

async function shoot(name, query, target) {
  await page.goto(BASE + query);
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  if (target) {
    await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (el) el.scrollIntoView({ block: "start" });
    }, target);
  }
  await page.waitForTimeout(250);
  await page.screenshot({ path: DIR + name });
  console.log("SHOT " + name);
}

await shoot("50-dark2-extool.png", "?skin=dark2&delta=0", "#row-extool .row__grid");
await shoot("51-dark2-light.png", "?skin=dark2&video=light&delta=0", "#row-extool .row__grid");
await shoot("52-dark2-livetool.png", "?skin=dark2&delta=0", "#row-livetool .row__grid");
await shoot("53-dark2-dock.png", "?skin=dark2&delta=0", "#row-dock");
await shoot("58-dark2-pure-white.png", "?skin=dark2&video=white&delta=0", "#row-extool .row__grid");

/* 57：1024 视口下 9 磁贴是否还放得下 */
await page.cdp("Emulation.setDeviceMetricsOverride", { width: 1024, height: 640, deviceScaleFactor: 1, mobile: false });
await shoot("57-dock-9tiles-1024.png", "?skin=glass2&delta=0", "#row-dock");
const fit = await page.evaluate(() => {
  const dock = document.querySelector("#row-dock .pane--after .ex-panel");
  const stage = document.querySelector("#row-dock .pane--after .stage");
  const wrap = document.querySelector("#row-dock .pane--after .ex-panel__wrap");
  const r = dock.getBoundingClientRect();
  const s = stage.getBoundingClientRect();
  return {
    viewport: innerWidth + "x" + innerHeight,
    dockW: Math.round(r.width),
    stageW: Math.round(s.width),
    rightGap: Math.round(s.right - r.right),
    overflowX: Math.round(r.left - s.left) < 0 ? "顶到左边" : "不顶边",
    tiles: document.querySelectorAll("#row-dock .pane--after .ex-panel__wrap > div").length,
    scrollW: document.documentElement.scrollWidth
  };
});
console.log("FIT1024 " + JSON.stringify(fit));
await page.cdp("Emulation.clearDeviceMetricsOverride");

/* 54 / 55 素材 */
for (const skin of ["dark", "dark2"]) {
  await page.goto(BASE + "?skin=" + skin + "&delta=0");
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  await page.evaluate(() => {
    const row = document.querySelector("#row-extool");
    window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 8);
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: DIR + "cmp-" + skin + ".png" });
}
for (const theme of ["light", "dark", "auto"]) {
  await page.goto(BASE + "?docktheme=" + theme + "&delta=0");
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  await page.evaluate(() => {
    const row = document.querySelector("#row-dock");
    window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 6);
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: DIR + "state-" + theme + ".png" });
  const r = await page.evaluate(() => {
    const dock = document.querySelector("#row-dock .pane--after .ex-panel");
    const b = dock.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), body: document.body.className };
  });
  console.log("STATE " + theme + " " + JSON.stringify(r));
}
