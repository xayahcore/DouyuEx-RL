
import fs from "node:fs/promises";
const OUT = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live";
const task = await taskSpace("dyex-icon-ego");
const tab = (await task.tabs()).find((t) => t.active) || (await task.tabs())[0];
const page = tab.page;
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.evaluate(() => { document.querySelectorAll(".miuix-modal__close").forEach((b) => b.click()); });
await page.waitForTimeout(300);
if (await page.evaluate(() => { const d = document.querySelector(".ex-panel"); return !d || getComputedStyle(d).display === "none"; })) {
  await page.evaluate(() => { const a = document.querySelector(".ex-icon a"); a && a.click(); }); await page.waitForTimeout(800);
}
const openBy = async (idx) => {
  await page.evaluate((i) => { const t = document.querySelectorAll(".ex-panel__wrap > div")[i]; if (t) t.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false })); }, idx);
  await page.waitForTimeout(900);
};

const measureFooter = async (panelSel, barSel, btnSel) => {
  return await page.evaluate(({ panelSel, barSel, btnSel }) => {
    const panel = document.querySelector(panelSel); if (!panel) return { error: "no-panel" };
    const body = panel.querySelector(".miuix-modal__body"); const bar = panel.querySelector(barSel); const btn = panel.querySelector(btnSel);
    const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const cb = cs(bar), cbtn = cs(btn), cbody = cs(body);
    body.scrollTop = 0; const atTop = { ...R(body) };
    const maxScroll = body.scrollHeight - body.clientHeight;
    body.scrollTop = maxScroll;
    // 最后一个文本块
    const texts = Array.from(body.querySelectorAll("*")).filter((n) => n.children.length === 0 && (n.textContent || "").trim().length > 3 && n.getBoundingClientRect().height > 4);
    const lastText = texts.length ? texts[texts.length - 1] : null;
    const lastRect = lastText ? R(lastText) : null;
    const btnRect = R(btn), barRect = R(bar), bodyRect = R(body), panelRect = R(panel);
    const btnTopPoint = btnRect ? document.elementFromPoint((btnRect.left + btnRect.right) / 2, btnRect.top + 1) : null;
    const aboveBtn = btnRect ? document.elementFromPoint((btnRect.left + btnRect.right) / 2, btnRect.top - 3) : null;
    const gapBand = btnRect ? document.elementFromPoint((btnRect.left + btnRect.right) / 2, btnRect.bottom + 6) : null;
    const desc = (el) => (el ? el.tagName + "." + String(el.className).slice(0, 46) : null);
    // 正文是否仍在按钮下方露出（按钮底 → 面板底 之间可见的文字）
    const band = { from: btnRect ? btnRect.bottom : 0, to: panelRect ? panelRect.bottom : 0 };
    const visibleInBand = texts.filter((n) => { const r = n.getBoundingClientRect(); return r.top < band.to - 2 && r.bottom > band.from + 2; }).map((n) => ({ t: n.textContent.trim().slice(0, 20), top: +n.getBoundingClientRect().top.toFixed(1), bottom: +n.getBoundingClientRect().bottom.toFixed(1) })).slice(0, 4);
    const out = {
      panel: panelRect, body: bodyRect, bar: barRect, btn: btnRect,
      barStyle: { position: cb.position, top: cb.top, bottom: cb.bottom, left: cb.left, right: cb.right, zIndex: cb.zIndex, background: cb.backgroundColor, backdropFilter: cb.backdropFilter, padding: cb.padding, margin: cb.margin, display: cb.display },
      btnStyle: { background: cbtn.backgroundColor, color: cbtn.color, fontSize: cbtn.fontSize, height: cbtn.height, borderRadius: cbtn.borderRadius, boxShadow: cbtn.boxShadow, position: cbtn.position, sticky: cbtn.position },
      bodyStyle: { paddingBottom: cbody.paddingBottom, paddingTop: cbody.paddingTop, overflow: cbody.overflowY, scrollBehavior: cbody.scrollBehavior },
      scroll: { scrollHeight: body.scrollHeight, clientHeight: body.clientHeight, maxScroll, scrollTop: body.scrollTop },
      lastText: lastRect ? { bottom: lastRect.bottom, text: lastText.textContent.trim().slice(0, 24) } : null,
      coveredPx: lastRect && barRect ? +(lastRect.bottom - barRect.top).toFixed(1) : null,
      btnTopPoint: desc(btnTopPoint), aboveBtnPoint: desc(aboveBtn), belowBtnPoint: desc(gapBand),
      visibleTextInGap: visibleInBand,
      gapAfterBtn: panelRect && btnRect ? +(panelRect.bottom - btnRect.bottom).toFixed(1) : null,
      bottomPaddingVsBar: barRect && panelRect ? +(panelRect.bottom - barRect.bottom).toFixed(1) : null
    };
    body.scrollTop = 0;
    return out;
  }, { panelSel, barSel, btnSel });
};

await openBy(7);
const upd = await measureFooter(".exupdate-panel", ".exupdate-panel__action-wrap", ".exupdate-panel__submit-btn");
console.log("EXUPDATE:", JSON.stringify(upd, null, 1));
const pr = upd.panel;
const cropCmd = async (name, rect, sc = 2) => { const r = await page.cdp("Page.captureScreenshot", { format: "png", clip: { x: Math.max(0, rect.left - 8), y: Math.max(0, rect.top - 8), width: rect.w + 16, height: rect.h + 16, scale: sc }, captureBeyondViewport: false }); await fs.writeFile(OUT + "/" + name + ".png", Buffer.from(r.data, "base64")); };
await page.evaluate(() => { const b = document.querySelector(".exupdate-panel .miuix-modal__body"); const bar = document.querySelector(".exupdate-panel__action-wrap"); if (b) b.scrollTop = 700; });
await page.waitForTimeout(400);
await cropCmd("14-exupdate-footer-overlap", pr);

await page.evaluate(() => { document.querySelectorAll(".miuix-modal__close").forEach((b) => b.click()); });
await page.waitForTimeout(400);
await openBy(0);
const sign = await measureFooter(".sign-panel", ".fans-panel__action-wrap", ".fans-panel__submit-btn");
console.log("SIGN:", JSON.stringify(sign, null, 1));
if (sign.panel) {
  await page.evaluate(() => { const b = document.querySelector(".sign-panel .miuix-modal__body"); if (b) b.scrollTop = 150; });
  await page.waitForTimeout(400);
  await cropCmd("15-sign-footer-overlap", sign.panel);
}
await fs.writeFile(OUT + "/measure-sticky-footer.json", JSON.stringify({ exupdate: upd, sign }, null, 2), "utf8");
