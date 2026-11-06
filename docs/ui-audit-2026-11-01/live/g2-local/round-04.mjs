import fs from "node:fs/promises";
const ROOT = "D:/DouyuEx-RL";
const DIR = ROOT + "/docs/ui-audit-2026-11-01/live/g2-local/";
const task = await taskSpace("dyex-g2-local");
const page = task.page("p1");
await page.evaluate(() => { window.openExPanel && window.openExPanel(); });
await page.waitForTimeout(900);
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach(v => { v.muted = true; v.volume = 0; }); });
console.log("dock:", await page.screenshot({ path: DIR + "70-dock.png" }));

async function hoverTile(sel, name) {
  await page.evaluate((s) => {
    const btn = document.querySelector(s);
    if (!btn) return;
    btn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
  }, sel);
  await page.waitForTimeout(1300);
  const st = await page.evaluate(() => {
    const shown = [...document.querySelectorAll(".miuix-modal, .sign-panel, .extool, .livetool, .bloop, .exlottery, .exupdate-panel, .popup-player-panel, .fans-continue-panel")]
      .filter(el => getComputedStyle(el).display !== "none")
      .map(el => el.className.split(" ")[0]);
    return shown;
  });
  console.log(name, "open panels:", JSON.stringify(st), await page.screenshot({ path: DIR + name + ".png" }));
}
await hoverTile(".ex-panel__wrap > div.extool-icon", "71-panel-extool");
await hoverTile(".ex-panel__wrap > div.ex-sign", "72-panel-sign");
await hoverTile(".ex-panel__wrap > div.livetool-icon", "73-panel-livetool");
const meas = await page.evaluate(() => {
  const g = (s) => { const el = document.querySelector(s); return el ? getComputedStyle(el).backgroundColor : null; };
  return { dock: g(".ex-panel"), tile: g(".ex-panel__wrap > div"), item: g(".sign-option-item"), card: g(".fans-panel__card"), header: g(".miuix-modal__header") };
});
console.log("bg:", JSON.stringify(meas));
