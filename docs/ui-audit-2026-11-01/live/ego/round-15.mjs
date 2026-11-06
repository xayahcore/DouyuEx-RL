
import fs from "node:fs/promises";
const OUT = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live";
const task = await taskSpace("dyex-icon-ego");
const tab = (await task.tabs()).find((t) => t.active) || (await task.tabs())[0];
const page = tab.page;
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.evaluate(() => { document.querySelectorAll(".miuix-modal__close").forEach((b) => b.click()); }); await page.waitForTimeout(300);
if (await page.evaluate(() => { const d = document.querySelector(".ex-panel"); return !d || getComputedStyle(d).display === "none"; })) { await page.evaluate(() => { const a = document.querySelector(".ex-icon a"); a && a.click(); }); await page.waitForTimeout(800); }
const openBy = async (i) => { await page.evaluate((idx) => { const t = document.querySelectorAll(".ex-panel__wrap > div")[idx]; if (t) t.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false })); }, i); await page.waitForTimeout(800); };
const panels = [[0,".sign-panel"],[1,".fans-continue-panel"],[2,".bloop"],[3,".extool"],[4,".livetool"],[5,".popup-player-panel"],[6,".exlottery"],[7,".exupdate-panel"]];
const out = [];
for (const [idx, sel] of panels) {
  await page.evaluate(() => { document.querySelectorAll(".miuix-modal__close").forEach((b) => b.click()); }); await page.waitForTimeout(300);
  await openBy(idx);
  const res = await page.evaluate((s) => {
    const p = document.querySelector(s); if (!p) return null;
    const scan = () => {
      const nodes = Array.from(p.querySelectorAll("*")).filter((n) => n.children.length === 0 && (n.textContent || "").trim().length > 2);
      const clipY = nodes.filter((n) => n.scrollHeight > n.clientHeight + 2).map((n) => ({ t: n.textContent.trim().slice(0, 26), cls: String(n.className).slice(0, 26), over: n.scrollHeight - n.clientHeight }));
      const clipX = nodes.filter((n) => n.scrollWidth > n.clientWidth + 2).map((n) => ({ t: n.textContent.trim().slice(0, 30), cls: String(n.className).slice(0, 26), over: n.scrollWidth - n.clientWidth, cw: n.clientWidth }));
      return { clipX, clipY };
    };
    const body = p.querySelector(".miuix-modal__body");
    const wrap = p.querySelector(".fans-panel__action-wrap, .popup-panel__action-wrap, .exupdate-panel__action-wrap");
    const before = scan();
    if (body) body.scrollTop = body.scrollHeight;
    const after = scan();
    if (body) body.scrollTop = 0;
    return { panel: s, bodyScroll: body ? { sh: body.scrollHeight, ch: body.clientHeight } : null,
      actionWrapInline: wrap ? { style: wrap.getAttribute("style"), position: getComputedStyle(wrap).position, z: getComputedStyle(wrap).zIndex, bg: getComputedStyle(wrap).backgroundColor, pt: getComputedStyle(wrap).paddingTop } : null,
      before, after, countX: before.clipX.length, countY: before.clipY.length };
  }, sel);
  out.push(res);
  console.log(sel, JSON.stringify({ x: res.countX, y: res.countY, sample: res.before.clipX.slice(0, 3), wrap: res.actionWrapInline }));
}
await fs.writeFile(OUT + "/measure-truncation.json", JSON.stringify(out, null, 2), "utf8");
await page.evaluate(() => { document.querySelectorAll(".miuix-modal__close").forEach((b) => b.click()); });
