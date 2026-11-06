const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";
await page.goto(BASE + "?delta=0");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 25000 });
await page.evaluate(() => {
  const el = document.querySelector("#row-controls");
  if (el) el.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(260);
console.log("shot:", await page.screenshot({ path: DIR + "06-controls.png" }));
const t = await page.evaluate(() => {
  const row = document.querySelector("#row-controls");
  const d = row && row.querySelector(".sign-option-desc");
  return { desc: d ? d.textContent.trim() : null };
});
console.log("caption:", JSON.stringify(t));
