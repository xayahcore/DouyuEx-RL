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
  await page.waitForTimeout(240);
  await page.screenshot({ path: DIR + name });
  console.log("SHOT " + name);
}

await shoot("30-g2-panel.png", "?skin=glass2&delta=0", "#row-extool .row__grid");
await shoot("31-g2-light.png", "?skin=glass2&video=light&delta=0", "#row-extool .row__grid");
await shoot("32-g3-panel.png", "?skin=glass3&delta=0", "#row-extool .row__grid");
await shoot("33-g3-light.png", "?skin=glass3&video=light&delta=0", "#row-extool .row__grid");
await shoot("35-g2-dock.png", "?skin=glass2&delta=0", "#row-controls");

/* 三档并排的素材：同一位置、同一内容，只有 skin 不同 */
for (const skin of ["glass", "glass2", "glass3"]) {
  await page.goto(BASE + "?skin=" + skin + "&delta=0");
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  await page.evaluate(() => {
    const row = document.querySelector("#row-extool");
    window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 8);
  });
  await page.waitForTimeout(240);
  await page.screenshot({ path: DIR + "tier-" + skin + ".png" });
  const rect = await page.evaluate(() => {
    const pane = document.querySelector("#row-extool .pane--after");
    const stage = pane.querySelector(".stage");
    const r = stage.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), errors: window.__PREVIEW_ERRORS__.length };
  });
  console.log("TIER " + skin + " " + JSON.stringify(rect));
}
