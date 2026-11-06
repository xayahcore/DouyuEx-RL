const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";
const DIR = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/";
/* 只做用户点名的两件事：
   ① 三级面板里"子项又叠一层白" → 行不再有底色/描边
   ② Dock 选中态"图标背景变白" → 去掉，只留图标填色 + 指示条        */
const OVERRIDE = `
  /* ① 子项不再叠白：直接坐在卡片上 */
  .after .sign-option-item,
  .after .miuix-item {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 8px 4px !important;
  }
  /* 悬停只给极轻的一层反馈，不作为"常驻白底" */
  .after .sign-option-item:hover,
  .after .miuix-item:hover {
    background: rgba(255, 255, 255, 0.18) !important;
    border-radius: 10px !important;
  }
  /* 行与行之间用一条极淡的分隔线代替"白块的边界" */
  .after .sign-options-list > * + * {
    border-top: 0.5px solid rgba(15, 23, 42, 0.07) !important;
  }
  /* 卡片头的分隔线也从"白"改成"暗" */
  .after .fans-panel__card-header,
  .after .exupdate-panel__card-header {
    border-bottom: 0.5px solid rgba(15, 23, 42, 0.08) !important;
  }
  /* ② Dock 选中态：不再变白、不再加蓝框，只留图标填色 + 指示条 + 上浮 */
  .after .ex-panel__wrap > div.is-active,
  .after .ex-panel__wrap > div.ex-dock-active {
    background: rgba(255, 255, 255, 0.42) !important;
    border-color: rgba(255, 255, 255, 0.55) !important;
    box-shadow: none !important;
    transform: translateY(-2px) !important;
  }
`;
async function shot(url, sel, name) {
  await page.goto(BASE + url);
  await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 25000 });
  await page.evaluate((css) => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }, OVERRIDE);
  await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollIntoView({ block: "start" }); }, sel);
  await page.waitForTimeout(320);
  console.log(name, await page.screenshot({ path: DIR + name }));
}
await shot("?skin=glass2&delta=0", "#row-extool", "63-flat-extool.png");
await shot("?skin=glass2&delta=0", "#row-dock", "64-flat-dock.png");
await shot("?skin=glass2&delta=0", "#row-sign", "65-flat-sign.png");
await shot("?skin=glass2&delta=0", "#row-livetool", "66-flat-livetool.png");
