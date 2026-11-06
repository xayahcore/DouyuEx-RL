
import fs from "node:fs/promises";
const OUT = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live";
const task = await taskSpace("dyex-icon-ego");
const tab = (await task.tabs()).find((t) => t.active) || (await task.tabs())[0];
const page = tab.page;
const disp = (sel) => page.evaluate((s) => { const el = document.querySelector(s); return el ? getComputedStyle(el).display : "missing"; }, sel);
const state = () => page.evaluate(() => {
  const map = { ".extool": "扩展功能", ".sign-panel": "一键签到", ".bloop": "弹幕", ".livetool": "直播工具" };
  const out = {}; for (const k in map) { const el = document.querySelector(k); out[k] = el ? getComputedStyle(el).display : "missing"; } return out; });
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.evaluate(() => { document.querySelectorAll(".miuix-modal__close").forEach((b) => b.click()); });
await page.waitForTimeout(400);
if ((await disp(".ex-panel")) === "none") { await page.evaluate(() => { const a = document.querySelector(".ex-icon a"); a && a.click(); }); await page.waitForTimeout(700); }

const t3 = await page.evaluate(() => { const t = document.querySelectorAll(".ex-panel__wrap > div")[3]; const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, tile: { x: r.x, y: r.y, w: r.width, h: r.height } }; });
const results = {};

// A) 悬停 → 打开
await page.mouse.move(20, 20); await page.waitForTimeout(150);
await page.mouse.move(t3.x, t3.y); await page.waitForTimeout(900);
results.A_hover = await state();

// B) 同一点单击 → 观察
await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up();
await page.waitForTimeout(600);
results.B_click_after_hover = await state();

// C) 移开再移回 → 悬停重开
await page.mouse.move(30, 30); await page.waitForTimeout(300);
await page.mouse.move(t3.x, t3.y); await page.waitForTimeout(900);
results.C_hover_again = await state();

// D) ESC
await page.keyboard.press("Escape"); await page.waitForTimeout(600);
results.D_esc = await state();
await page.screenshot({ path: OUT + "/12-esc-after-panel-open.png" });

// E) focus ring（面板打开时）
results.E_ring = await page.evaluate(() => {
  const btn = document.querySelector(".extool .miuix-modal__close");
  if (!btn) return { err: "no-btn" };
  btn.focus();
  const c = getComputedStyle(btn);
  return { activeIsBtn: document.activeElement === btn, outlineStyle: c.outlineStyle, outlineWidth: c.outlineWidth, outlineColor: c.outlineColor, boxShadow: c.boxShadow, bg: c.backgroundColor };
});
// F) 从关闭按钮按 Tab
await page.evaluate(() => { const b = document.querySelector(".extool .miuix-modal__close"); b && b.focus(); });
await page.keyboard.press("Tab");
results.F_tab_from_close = await page.evaluate(() => { const a = document.activeElement; return { tag: a.tagName, cls: String(a.className).slice(0, 40), inPanel: !!a.closest(".extool") }; });
console.log("A-F:", JSON.stringify(results, null, 1));

// G) 面板内部可聚焦元素总数
results.G_panelFocusable = await page.evaluate(() => {
  const sel = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const out = {};
  for (const cls of [".extool", ".sign-panel", ".livetool", ".bloop", ".exlottery", ".exupdate-panel", ".fans-continue-panel", ".popup-player-panel"]) {
    const p = document.querySelector(cls); out[cls] = p ? p.querySelectorAll(sel).length : "missing";
  }
  return out;
});
console.log("G:", JSON.stringify(results.G_panelFocusable));

// H) 粘底操作条 vs 正文重叠（签到面板）
await page.evaluate(() => { document.querySelectorAll(".miuix-modal__close").forEach((b) => b.click()); });
await page.waitForTimeout(400);
const t0 = await page.evaluate(() => { const t = document.querySelectorAll(".ex-panel__wrap > div")[0]; const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await page.mouse.move(30, 30); await page.waitForTimeout(150);
await page.mouse.move(t0.x, t0.y); await page.waitForTimeout(1000);
const bar = await page.evaluate(() => {
  const p = document.querySelector(".sign-panel"); if (!p) return null;
  const body = p.querySelector(".miuix-modal__body");
  const wrap = p.querySelector(".fans-panel__action-wrap");
  const btn = p.querySelector(".fans-panel__submit-btn") || p.querySelector(".ex-btn-primary");
  const px = (n) => +n.toFixed(1);
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: px(r.x), y: px(r.y), w: px(r.width), h: px(r.height) }; };
  const cw = wrap ? getComputedStyle(wrap) : null, cb = btn ? getComputedStyle(btn) : null;
  return { panel: R(p), body: R(body), bodyScrollH: body ? body.scrollHeight : null, bodyClientH: body ? body.clientHeight : null,
    bodyPadB: body ? getComputedStyle(body).paddingBottom : null,
    wrap: R(wrap), wrapPos: cw && cw.position, wrapBg: cw && cw.backgroundColor, wrapBlur: cw && cw.backdropFilter, wrapPad: cw && cw.padding,
    btn: R(btn), btnBg: cb && cb.backgroundColor, btnColor: cb && cb.color, btnFs: cb && cb.fontSize, btnRadius: cb && cb.borderRadius,
    overlap: (wrap && body) ? +(body.getBoundingClientRect().bottom - wrap.getBoundingClientRect().top).toFixed(1) : null };
});
console.log("H-ACTIONBAR:", JSON.stringify(bar, null, 1));
// 中间位置截图（正文从操作条底下穿过）
await page.evaluate(() => { const b = document.querySelector(".sign-panel .miuix-modal__body"); if (b) b.scrollTop = 120; });
await page.waitForTimeout(300);
const pr = bar && bar.panel;
if (pr) {
  const r = await page.cdp("Page.captureScreenshot", { format: "png", clip: { x: Math.max(0, pr.x - 8), y: Math.max(0, pr.y - 8), width: pr.w + 16, height: pr.h + 16, scale: 2 }, captureBeyondViewport: false });
  await fs.writeFile(OUT + "/13-sign-actionbar-overlap.png", Buffer.from(r.data, "base64"));
}
await fs.writeFile(OUT + "/a11y-esc-click.json", JSON.stringify(results, null, 2), "utf8");
await fs.writeFile(OUT + "/measure-actionbar.json", JSON.stringify(bar, null, 2), "utf8");
