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
await shoot("56-dock-9tiles.png", "?skin=glass2&delta=0", "#row-dock");

/* 三态胶囊素材 */
for (const theme of ["light", "dark", "auto"]) {
  await page.goto(BASE + "?skin=glass2&docktheme=" + theme + "&delta=0");
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
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), skin: document.body.className };
  });
  console.log("STATE " + theme + " " + JSON.stringify(rect));
}

/* dark2 vs dark 素材 */
for (const skin of ["dark", "dark2"]) {
  await page.goto(BASE + "?skin=" + skin + "&delta=0");
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  await page.evaluate(() => {
    const row = document.querySelector("#row-extool");
    window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 8);
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: DIR + "cmp-" + skin + ".png" });
  console.log("CMP " + skin);
}
