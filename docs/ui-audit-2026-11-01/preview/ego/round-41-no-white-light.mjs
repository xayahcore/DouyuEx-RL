const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";
const OVERRIDE = `
  .after .miuix-modal, .after .sign-panel, .after .fans-continue-panel, .after .extool,
  .after .livetool, .after .bloop, .after .exlottery, .after .popup-player-panel, .after .exupdate-panel {
    background: transparent !important;
    box-shadow: 0 0 0 0.5px rgba(15,23,42,0.16), 0 18px 44px rgba(15,23,42,0.22) !important;
    border-color: rgba(15,23,42,0.10) !important;
  }
  .after .miuix-modal__header { background: rgba(255,255,255,0.62) !important; border-bottom: 0.5px solid rgba(15,23,42,0.10) !important; }
  .after .fans-panel__card, .after .popup-panel__card, .after .exupdate-panel__card,
  .after .miuix-card, .after .livetool__cell {
    background-image: none !important; background-color: rgba(255,255,255,0.62) !important;
    border: 0.5px solid rgba(15,23,42,0.12) !important; box-shadow: 0 6px 16px rgba(15,23,42,0.10) !important;
  }
  .after .ex-panel { background: rgba(255,255,255,0.28) !important; border-color: rgba(15,23,42,0.10) !important; box-shadow: 0 0 0 0.5px rgba(15,23,42,0.12), 0 14px 34px rgba(15,23,42,0.18) !important; }
  .after .ex-panel__wrap > div { background: rgba(255,255,255,0.40) !important; border-color: rgba(15,23,42,0.10) !important; }
`;
async function shot(url, sel, name) {
  await page.goto(BASE + url);
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 25000 });
  await page.evaluate((css) => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }, OVERRIDE);
  await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollIntoView({ block: "start" }); }, sel);
  await page.waitForTimeout(320);
  console.log(name, await page.screenshot({ path: DIR + name }));
}
await shot("?skin=glass2&video=light&delta=0", "#row-extool", "62-nowhite-light.png");
const m = await page.evaluate(() => {
  const pane = document.querySelector(".pane.after");
  const card = pane.querySelector(".fans-panel__card");
  const r = card.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
});
console.log("cardRect", JSON.stringify(m));
