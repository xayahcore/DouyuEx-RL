
import fs from "node:fs/promises";
const OUT = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live";
const task = await taskSpace("dyex-icon-ego");
const tab = (await task.tabs()).find((t) => t.active) || (await task.tabs())[0];
const page = tab.page;
const P = [".sign-panel",".fans-continue-panel",".bloop",".extool",".livetool",".exlottery",".popup-player-panel",".exupdate-panel"];
const mute = () => page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
const closeAll = async () => { await page.evaluate(() => { document.querySelectorAll(".miuix-modal__close").forEach((b) => b.click()); }); await page.waitForTimeout(350); };
const openBy = async (i) => { await page.evaluate((idx) => { const t = document.querySelectorAll(".ex-panel__wrap > div")[idx]; if (t) t.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false })); }, i); await page.waitForTimeout(850); };
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
await mute();
await closeAll();
if (await page.evaluate(() => { const d = document.querySelector(".ex-panel"); return !d || getComputedStyle(d).display === "none"; })) {
  await page.evaluate(() => { const a = document.querySelector(".ex-icon a"); a && a.click(); }); await page.waitForTimeout(800);
}

// ===== 1. 粘底条遮挡：逐滚动位测正文命中 =====
const contentHit = (panelSel, barSel) => page.evaluate(({ panelSel, barSel }) => {
  const panel = document.querySelector(panelSel); const body = panel.querySelector(".miuix-modal__body"); const bar = panel.querySelector(barSel);
  const btn = bar.querySelector(".ex-btn-primary");
  const R = (el) => { const r = el.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right }; };
  const leaves = Array.from(body.querySelectorAll("*")).filter((n) => n.children.length === 0 && (n.textContent || "").trim().length > 3 && n.getBoundingClientRect().height > 4 && !bar.contains(n));
  const res = [];
  const max = body.scrollHeight - body.clientHeight;
  for (const st of [0, Math.round(max / 2), max]) {
    body.scrollTop = st;
    const br = R(btn), rr = R(bar), bd = R(body);
    const covered = leaves.filter((n) => { const x = R(n); return x.t < br.b - 1 && x.b > br.t + 1 && x.l < br.r && x.r > br.l; });
    const inGutter = leaves.filter((n) => { const x = R(n); return x.t < rr.b - 1 && x.b > rr.t + 1 && !(x.l < br.r && x.r > br.l) && x.l < rr.r && x.r > rr.l; });
    const lastContent = leaves.filter((n) => R(n).b <= bd.b + 1).sort((a, b) => R(b).b - R(a).b)[0];
    res.push({ scrollTop: st, max, coveredLines: covered.length,
      coveredSample: covered.slice(0, 2).map((n) => n.textContent.trim().slice(0, 18)),
      gutterLines: inGutter.length,
      lastVisibleBottom: lastContent ? +R(lastContent).b.toFixed(1) : null,
      btnTop: +br.t.toFixed(1), barTop: +rr.t.toFixed(1), bodyBottom: +bd.b.toFixed(1),
      lastLineVsBtnTop: lastContent ? +(R(lastContent).b - br.t).toFixed(1) : null });
  }
  body.scrollTop = 0;
  return res;
}, { panelSel, barSel });

await openBy(7);
const updHit = await contentHit(".exupdate-panel", ".exupdate-panel__action-wrap");
await closeAll();
await openBy(0);
const signHit = await contentHit(".sign-panel", ".fans-panel__action-wrap");
await closeAll();
console.log("UPD-HIT:", JSON.stringify(updHit, null, 1));
console.log("SIGN-HIT:", JSON.stringify(signHit, null, 1));

// ===== 2. 悬停→单击→ESC 重测（此时 Dock 在视口内）=====
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
const dockRect = await page.evaluate(() => { const d = document.querySelector(".ex-panel"); const r = d.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, display: getComputedStyle(d).display }; });
const tile3 = await page.evaluate(() => { const t = document.querySelectorAll(".ex-panel__wrap > div")[3]; const r = t.getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, x: r.x, y: r.y, w: r.width, h: r.height }; });
const disp = () => page.evaluate(() => { const e = document.querySelector(".extool"); return e ? getComputedStyle(e).display : "missing"; });
const seq = { dockRect, tile3 };
await page.mouse.move(5, 5); await page.waitForTimeout(200);
seq.before = await disp();
await page.mouse.move(tile3.cx, tile3.cy); await page.waitForTimeout(900);
seq.afterHover = await disp();
await page.mouse.down(); await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(700);
seq.afterClick = await disp();
await page.mouse.move(tile3.cx + 3, tile3.cy + 2); await page.waitForTimeout(900);
seq.afterNudgeHover = await disp();
await page.keyboard.press("Escape"); await page.waitForTimeout(600);
seq.afterEsc = await disp();
console.log("INTERACTION:", JSON.stringify(seq, null, 1));

// ===== 3. 视口/缩放 =====
const shot = async (n) => { await page.screenshot({ path: OUT + "/" + n + ".png" }); };
const snap = () => page.evaluate(() => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: +r.left.toFixed(1), t: +r.top.toFixed(1), r: +r.right.toFixed(1), b: +r.bottom.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  const dock = document.querySelector(".ex-panel");
  const panels = Array.from(document.querySelectorAll(".sign-panel,.fans-continue-panel,.bloop,.extool,.livetool,.exlottery,.popup-player-panel,.exupdate-panel"));
  const open = panels.filter((p) => getComputedStyle(p).display !== "none");
  return { viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio }, scrollY: window.scrollY,
    dock: R(dock), dockBottomCss: dock ? getComputedStyle(dock).bottom : null,
    toolbarH: (() => { const t = document.querySelector(".PlayerToolbar"); return t ? t.offsetHeight : null; })(),
    openPanels: open.map((p) => ({ cls: p.className.split(" ")[0], ...R(p) })),
    overflowRight: open.filter((p) => p.getBoundingClientRect().right > window.innerWidth).map((p) => p.className.split(" ")[0]),
    overflowLeft: open.filter((p) => p.getBoundingClientRect().left < 0).map((p) => p.className.split(" ")[0]) };
});
const runs = [];
for (const vp of [{ name: "1280x720-dpr1", w: 1280, h: 720, dpr: 1 }, { name: "1024x576-dpr1.25", w: 1024, h: 576, dpr: 1.25 }]) {
  await page.cdp("Emulation.setDeviceMetricsOverride", { width: vp.w, height: vp.h, deviceScaleFactor: vp.dpr, mobile: false });
  await page.waitForTimeout(900);
  await mute();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  if (await page.evaluate(() => { const d = document.querySelector(".ex-panel"); return !d || getComputedStyle(d).display === "none"; })) { await page.evaluate(() => { const a = document.querySelector(".ex-icon a"); a && a.click(); }); await page.waitForTimeout(700); }
  const base = await snap();
  await shot("vp-" + vp.name + "-dock");
  await closeAll(); await openBy(0);
  const p0 = await snap();
  await shot("vp-" + vp.name + "-panel-sign");
  await closeAll(); await openBy(7);
  const p7 = await snap();
  await shot("vp-" + vp.name + "-panel-update");
  await closeAll();
  runs.push({ vp, base, p0, p7 });
}
await page.cdp("Emulation.clearDeviceMetricsOverride", {});
await page.waitForTimeout(600);
await mute();
await fs.writeFile(OUT + "/measure-footer-hit.json", JSON.stringify({ updHit, signHit }, null, 2), "utf8");
await fs.writeFile(OUT + "/measure-viewport.json", JSON.stringify(runs, null, 2), "utf8");
await fs.writeFile(OUT + "/interaction-hover-click-esc.json", JSON.stringify(seq, null, 2), "utf8");
console.log("VP-SUMMARY:", JSON.stringify(runs.map((r) => ({ vp: r.vp.name, viewport: r.base.viewport, dock: r.base.dock, dockBottom: r.base.dockBottomCss, toolbarH: r.base.toolbarH, p0: r.p0.openPanels, p7: r.p7.openPanels, overR: { a: r.p0.overflowRight, b: r.p7.overflowRight }, overL: { a: r.p0.overflowLeft, b: r.p7.overflowLeft } })), null, 1));
