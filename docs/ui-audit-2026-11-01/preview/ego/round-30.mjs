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

/* A：glass2 受影响的 3 张 + 差分表 */
await shoot("30-g2-panel.png", "?skin=glass2&delta=0", "#row-extool .row__grid");
await shoot("31-g2-light.png", "?skin=glass2&video=light&delta=0", "#row-extool .row__grid");
await shoot("35-g2-dock.png", "?skin=glass2&delta=0", "#row-livetool .row__grid");

/* B：深色玻璃 5 张 */
await shoot("40-dark-extool.png", "?skin=dark&delta=0", "#row-extool .row__grid");
await shoot("41-dark-light.png", "?skin=dark&video=light&delta=0", "#row-extool .row__grid");
await shoot("42-dark-livetool.png", "?skin=dark&delta=0", "#row-livetool .row__grid");
await shoot("43-dark-dock.png", "?skin=dark&delta=0", "#row-dock .row__grid");

/* 44：同一行 G2 与 Dark 并排（两张同位置截图合成） */
const pair = [];
for (const skin of ["glass2", "dark"]) {
  await page.goto(BASE + "?skin=" + skin + "&delta=0");
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
  await page.evaluate(() => {
    const row = document.querySelector("#row-extool");
    window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 8);
  });
  await page.waitForTimeout(240);
  const file = DIR + "pair-" + skin + ".png";
  await page.screenshot({ path: file });
  const rect = await page.evaluate(() => {
    const stage = document.querySelector("#row-extool .pane--after .stage");
    const r = stage.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log("PAIR " + skin + " " + JSON.stringify(rect));
}

/* 差分表（内容已改） */
await page.goto(BASE);
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
await page.evaluate(() => document.querySelector("#row-diff").scrollIntoView({ block: "start" }));
await page.waitForTimeout(240);
await page.screenshot({ path: DIR + "16-diff-table.png" });
console.log("SHOT 16-diff-table.png");
