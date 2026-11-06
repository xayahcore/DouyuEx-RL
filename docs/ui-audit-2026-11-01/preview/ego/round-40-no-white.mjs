const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";
const OVERRIDE = `
  /* 去掉"叠在玻璃上的那层纯白"：壳层透明、卡片单层、Dock 只留一层 */
  .after .miuix-modal, .after .sign-panel, .after .fans-continue-panel, .after .extool,
  .after .livetool, .after .bloop, .after .exlottery, .after .popup-player-panel, .after .exupdate-panel {
    background: transparent !important;
    box-shadow: 0 0 0 0.5px rgba(15,23,42,0.16), 0 18px 44px rgba(15,23,42,0.22) !important;
    border-color: rgba(15,23,42,0.10) !important;
  }
  .after .miuix-modal__header { background: rgba(255,255,255,0.62) !important; border-bottom: 0.5px solid rgba(15,23,42,0.10) !important; }
  .after .fans-panel__card, .after .popup-panel__card, .after .exupdate-panel__card,
  .after .miuix-card, .after .livetool__cell {
    background-image: none !important;
    background-color: rgba(255,255,255,0.62) !important;
    border: 0.5px solid rgba(15,23,42,0.12) !important;
    box-shadow: 0 6px 16px rgba(15,23,42,0.10) !important;
  }
  .after .ex-panel { background: rgba(255,255,255,0.28) !important; border-color: rgba(15,23,42,0.10) !important; box-shadow: 0 0 0 0.5px rgba(15,23,42,0.12), 0 14px 34px rgba(15,23,42,0.18) !important; }
  .after .ex-panel__wrap > div { background: rgba(255,255,255,0.40) !important; border-color: rgba(15,23,42,0.10) !important; }
`;
async function shot(url, sel, name, inject) {
  await page.goto(BASE + url);
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 25000 });
  if (inject) await page.evaluate((css) => { const s = document.createElement("style"); s.id = "lead-no-white"; s.textContent = css; document.head.appendChild(s); }, OVERRIDE);
  await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollIntoView({ block: "start" }); }, sel);
  await page.waitForTimeout(320);
  console.log(name, await page.screenshot({ path: DIR + name }));
}
await shot("?skin=glass2&delta=0", "#row-extool", "60-nowhite-extool.png", true);
await shot("?skin=glass2&delta=0", "#row-dock", "61-nowhite-dock.png", true);
const probe = await page.evaluate(() => {
  const card = document.querySelector(".pane.after .fans-panel__card");
  const shell = document.querySelector(".pane.after .miuix-modal");
  const g = (el) => el ? { bg: getComputedStyle(el).backgroundColor, img: getComputedStyle(el).backgroundImage.slice(0, 40) } : null;
  return { card: g(card), shell: g(shell) };
});
console.log("computed:", JSON.stringify(probe));
