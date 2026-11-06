
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
console.log("url:", await page.url());
await mute(page);
await closeThird(page);
// 确保 Dock 可见
const dockShown = await page.evaluate(() => { const d = document.querySelector(".ex-panel"); return d ? getComputedStyle(d).display : null; });
if (dockShown === "none") { await page.evaluate(() => { const a = document.querySelector(".ex-icon a"); a && a.click(); }); await page.waitForTimeout(700); }
console.log("BEFORE:", JSON.stringify(await panelState(page)));
console.log("DOCK HTML:", await saveHtml(page, ".ex-panel", "01-dock.html"));

const targets = [
  { idx: 2, sel: ".bloop", name: "03-panel-bloop" },
  { idx: 3, sel: ".extool", name: "04-panel-extool" },
  { idx: 4, sel: ".livetool", name: "05-panel-livetool" },
  { idx: 6, sel: ".exlottery", name: "06-panel-exlottery" },
];
const report = [];
for (const t of targets) {
  await closeThird(page);
  await openByHover(page, t.idx);
  const st = await page.evaluate((s) => { const el = document.querySelector(s); if (!el) return { exists: false }; const c = getComputedStyle(el); const r = el.getBoundingClientRect();
    return { exists: true, display: c.display, x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      radius: c.borderRadius, bg: c.backgroundColor, blur: c.backdropFilter, shadow: c.boxShadow, border: c.border, zIndex: c.zIndex,
      overflowY: c.overflowY, pad: c.padding,
      title: (el.querySelector(".miuix-modal__title")||{}).textContent || null,
      titleCss: (() => { const t = el.querySelector(".miuix-modal__title"); if (!t) return null; const s = getComputedStyle(t); return { fs: s.fontSize, lh: s.lineHeight, color: s.color, fw: s.fontWeight }; })(),
      close: (() => { const b = el.querySelector(".miuix-modal__close"); if (!b) return null; const s = getComputedStyle(b); const rr = b.getBoundingClientRect(); return { w: rr.width, h: rr.height, bg: s.backgroundColor, color: s.color, fs: s.fontSize, radius: s.borderRadius }; })(),
      scrollable: Array.from(el.querySelectorAll("*")).filter((n) => n.scrollHeight > n.clientHeight + 4 && n.clientHeight > 40).slice(0, 5).map((n) => ({ cls: n.className || n.tagName, sh: n.scrollHeight, ch: n.clientHeight })),
      cardCount: el.querySelectorAll(".miuix-card, .ex-card, [class*=card]").length,
    }; }, t.sel);
  report.push({ panel: t.name, ...st });
  console.log(t.name, JSON.stringify(st));
  await shot(page, t.name);
  if (st.exists && st.w) {
    await clipShot(page, t.name + "-crop", { x: Math.max(0, st.x - 16), y: Math.max(0, st.y - 16), width: st.w + 32, height: Math.min(st.h + 32, 763 - Math.max(0, st.y - 16)) }, 2);
  }
  console.log("html:", await saveHtml(page, t.sel, t.name.replace("panel-", "") + ".html"));
  // 滚到底部
  const scrolled = await page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null;
    const cands = Array.from(el.querySelectorAll("*")).filter((n) => n.scrollHeight > n.clientHeight + 4 && n.clientHeight > 40);
    cands.forEach((n) => { n.scrollTop = n.scrollHeight; });
    return cands.map((n) => ({ cls: String(n.className).slice(0, 40), top: n.scrollTop, max: n.scrollHeight - n.clientHeight })); }, t.sel);
  if (scrolled && scrolled.length) { await page.waitForTimeout(300); await shot(page, t.name + "-bottom"); }
  console.log(t.name + " scroll:", JSON.stringify(scrolled));
}
await fs.writeFile(OUT + "/styles-panels-a.json", JSON.stringify(report, null, 2), "utf8");
await closeThird(page);
console.log("AFTER:", JSON.stringify(await panelState(page)));
