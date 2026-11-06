const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";
/* 统一"一块白"：子项行的白 === Dock 磁贴的白（同为 0.42 + 1px 白边 0.55）
   代价：卡片/分组层不再刷白（否则三层叠起来必然比磁贴更白） */
const OVERRIDE = `
  .after .fans-panel__card, .after .popup-panel__card, .after .exupdate-panel__card,
  .after .miuix-card {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 0 6px 0 !important;
  }
  .after .sign-option-item, .after .miuix-item, .after .livetool__cell {
    background: rgba(255, 255, 255, 0.42) !important;
    border: 1px solid rgba(255, 255, 255, 0.55) !important;
    border-radius: 10px !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.55) !important;
  }
  .after .sign-option-item:hover, .after .miuix-item:hover {
    background: rgba(255, 255, 255, 0.56) !important;
    border-color: rgba(0, 102, 255, 0.35) !important;
  }
  /* 面板头也降到同一档白，避免"头比行更白" */
  .after .miuix-modal__header {
    background: rgba(255, 255, 255, 0.42) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.45) !important;
    box-shadow: none !important;
  }
  .after .sign-options-list > * + * { border-top: none !important; }
`;
async function shot(url, sel, name) {
  await page.goto(BASE + url);
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 25000 });
  await page.evaluate((css) => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }, OVERRIDE);
  await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollIntoView({ block: "start" }); }, sel);
  await page.waitForTimeout(320);
  console.log(name, await page.screenshot({ path: DIR + name }));
}
await shot("?skin=glass2&delta=0", "#row-extool", "67-unified-extool.png");
await shot("?skin=glass2&delta=0", "#row-dock", "68-unified-dock.png");
await shot("?skin=glass2&delta=0", "#row-sign", "69-unified-sign.png");
const m = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const g = (el) => el ? getComputedStyle(el).backgroundColor : null;
  return { tile: g(q('.pane.after .ex-panel__wrap > div')), row: g(q('.pane.after .sign-option-item')), card: g(q('.pane.after .fans-panel__card')), head: g(q('.pane.after .miuix-modal__header')) };
});
console.log("computed", JSON.stringify(m));
