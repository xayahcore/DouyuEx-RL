
const OUT = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live";
const DOMDIR = OUT + "/dom";
import fs from "node:fs/promises";
const mute = async (page) => page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v)=>{v.muted=true;v.volume=0;}); });
const shot = async (page, name) => { const p = OUT + "/" + name + ".png"; await page.screenshot({ path: p }); return p; };
const clipShot = async (page, name, rect, scale = 2) => {
  const r = await page.cdp("Page.captureScreenshot", { format: "png",
    clip: { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: rect.width, height: rect.height, scale }, captureBeyondViewport: false });
  await fs.writeFile(OUT + "/" + name + ".png", Buffer.from(r.data, "base64"));
  return OUT + "/" + name + ".png";
};
const rectOf = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }, sel);
const neutral = async (page) => { await page.mouse.move(20, 20); await page.waitForTimeout(120); };
const closeThird = async (page) => { await page.evaluate(() => { document.querySelectorAll(".miuix-modal__close").forEach((b)=>b.click()); }); await page.waitForTimeout(450); };
const openByHover = async (page, idx) => {
  await neutral(page);
  const r = await page.evaluate((i) => { const t = document.querySelectorAll(".ex-panel__wrap > div")[i]; if (!t) return null; const b = t.getBoundingClientRect(); return { x: b.x + b.width/2, y: b.y + b.height/2 }; }, idx);
  if (!r) return null;
  await page.mouse.move(r.x, r.y);
  await page.waitForTimeout(900);
  return r;
};
const panelState = (page) => page.evaluate(() => {
  const map = [["ex-sign",".sign-panel"],["fans-continue",".fans-continue-panel"],["bloop-icon",".bloop"],["extool-icon",".extool"],["livetool-icon",".livetool"],["popup-player",".popup-player-panel"],["ex-lottery",".exlottery"],["ex-update",".exupdate-panel"]];
  return map.map(([btn, sel], i) => { const el = document.querySelector(sel); const b = document.querySelectorAll(".ex-panel__wrap > div")[i];
    return { idx: i, btn, sel, exists: !!el, display: el ? getComputedStyle(el).display : null, cls: el ? el.className : null,
      active: b ? b.className : null, title: el ? (el.querySelector(".miuix-modal__title")||{}).textContent || null : null }; });
});
const saveHtml = async (page, sel, file) => {
  const html = await page.evaluate((s) => { const el = document.querySelector(s); return el ? el.outerHTML : null; }, sel);
  if (html == null) return "MISSING " + sel;
  await fs.mkdir(DOMDIR, { recursive: true });
  await fs.writeFile(DOMDIR + "/" + file, html, "utf8");
  return DOMDIR + "/" + file + " (" + html.length + " bytes)";
};
const task = await taskSpace("dyex-icon-ego");
const tab = (await task.tabs()).find((t) => t.active) || (await task.tabs())[0];
const page = tab.page;
await mute(page);
await closeThird(page);
const dockShown = await page.evaluate(() => { const d = document.querySelector(".ex-panel"); return d ? getComputedStyle(d).display : null; });
if (dockShown === "none") { await page.evaluate(() => { const a = document.querySelector(".ex-icon a"); a && a.click(); }); await page.waitForTimeout(700); }

const tileCss = (i) => page.evaluate((idx) => { const t = document.querySelectorAll(".ex-panel__wrap > div")[idx]; if (!t) return null;
  const c = getComputedStyle(t); const ind = t.querySelector(".ex-panel__indicator"); const ic = t.querySelector(".ex-ico");
  const icf = t.querySelector(".ex-ico--fill");
  return { cls: t.className, bg: c.backgroundColor, border: c.border, transform: c.transform, shadow: c.boxShadow,
    iconColor: ic ? getComputedStyle(ic).color : null,
    fillDisplay: icf ? getComputedStyle(icf).display : null,
    strokeDisplay: ic ? getComputedStyle(ic).display : null,
    ind: ind ? { opacity: getComputedStyle(ind).opacity, transform: getComputedStyle(ind).transform, w: ind.getBoundingClientRect().width, h: ind.getBoundingClientRect().height, bg: getComputedStyle(ind).backgroundColor } : null,
    rect: (() => { const r = t.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: r.width, h: r.height }; })() }; }, i);

// ---- A. 悬停态 + 选中态 ----
await neutral(page);
const hoverData = {};
const tile0 = await page.evaluate(() => { const t = document.querySelectorAll(".ex-panel__wrap > div")[3]; const r = t.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; });
await page.mouse.move(tile0.x, tile0.y);
await page.waitForTimeout(800);
hoverData.hoverExtool = await tileCss(3);
const dockRect = await rectOf(page, ".ex-panel");
await clipShot(page, "dock-03-hover-crop", { x: dockRect.x - 10, y: dockRect.y - 10, width: dockRect.width + 20, height: dockRect.height + 20 }, 3);
hoverData.activeOther = await tileCss(0);
console.log("HOVER+ACTIVE:", JSON.stringify(hoverData));

// ---- B. 其余 4 个面板 ----
const targets = [
  { idx: 0, sel: ".sign-panel", name: "07-panel-sign" },
  { idx: 1, sel: ".fans-continue-panel", name: "08-panel-fans-continue" },
  { idx: 5, sel: ".popup-player-panel", name: "09-panel-popup-player" },
  { idx: 7, sel: ".exupdate-panel", name: "10-panel-exupdate" },
];
const report = [];
for (const t of targets) {
  await closeThird(page);
  const hv = await openByHover(page, t.idx);
  let st = await page.evaluate((s) => { const el = document.querySelector(s); if (!el) return { exists: false };
    const c = getComputedStyle(el); const r = el.getBoundingClientRect();
    return { exists: true, display: c.display, x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      radius: c.borderRadius, bg: c.backgroundColor, blur: c.backdropFilter, zIndex: c.zIndex,
      title: (el.querySelector(".miuix-modal__title")||{}).textContent || null,
      titleIcon: !!el.querySelector(".ex-title-ico svg"),
      cardCount: el.querySelectorAll("[class*=card]").length,
      scrollable: Array.from(el.querySelectorAll("*")).filter((n) => n.scrollHeight > n.clientHeight + 4 && n.clientHeight > 40).map((n) => ({ cls: String(n.className).slice(0,40), sh: n.scrollHeight, ch: n.clientHeight })),
      innerText: (el.innerText || "").replace(/\s+/g, " ").slice(0, 160) }; }, t.sel);
  if (!st.exists || st.display === "none") {
    // 悬停没开，改点击
    await page.evaluate((i) => { const b = document.querySelectorAll(".ex-panel__wrap > div")[i]; b && b.click(); }, t.idx);
    await page.waitForTimeout(1200);
    st = await page.evaluate((s) => { const el = document.querySelector(s); if (!el) return { exists: false };
      const c = getComputedStyle(el); const r = el.getBoundingClientRect();
      return { exists: true, display: c.display, x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        radius: c.borderRadius, bg: c.backgroundColor, title: (el.querySelector(".miuix-modal__title")||{}).textContent || null,
        innerText: (el.innerText || "").replace(/\s+/g, " ").slice(0, 120), how: "click" }; }, t.sel);
  }
  report.push({ panel: t.name, hover: hv, ...st });
  console.log(t.name, JSON.stringify(st));
  await shot(page, t.name);
  if (st.exists && st.w) await clipShot(page, t.name + "-crop", { x: Math.max(0, st.x - 16), y: Math.max(0, st.y - 16), width: st.w + 32, height: Math.min(st.h + 32, 763 - Math.max(0, st.y - 16)) }, 2);
  console.log("html:", await saveHtml(page, t.sel, t.name.replace("panel-", "") + ".html"));
  const scrolled = await page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null;
    const cands = Array.from(el.querySelectorAll("*")).filter((n) => n.scrollHeight > n.clientHeight + 4 && n.clientHeight > 40);
    cands.forEach((n) => { n.scrollTop = n.scrollHeight; });
    return cands.map((n) => ({ cls: String(n.className).slice(0,40), top: n.scrollTop, max: n.scrollHeight - n.clientHeight })); }, t.sel);
  if (scrolled && scrolled.length) { await page.waitForTimeout(300); await shot(page, t.name + "-bottom"); }
  console.log(t.name + " scroll:", JSON.stringify(scrolled));
}
await fs.writeFile(OUT + "/styles-panels-b.json", JSON.stringify(report, null, 2), "utf8");
await fs.writeFile(OUT + "/styles-dock-states.json", JSON.stringify(hoverData, null, 2), "utf8");
await closeThird(page);
console.log("DONE state:", JSON.stringify(await panelState(page)));
