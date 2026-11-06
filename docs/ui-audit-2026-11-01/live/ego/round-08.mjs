
import fs from "node:fs/promises";
const OUT = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live";
const task = await taskSpace("dyex-icon-ego");
const tab = (await task.tabs()).find((t) => t.active) || (await task.tabs())[0];
const page = tab.page;
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.evaluate(() => { document.querySelectorAll(".miuix-modal__close").forEach((b) => b.click()); });
await page.waitForTimeout(400);
if ((await page.evaluate(() => { const d = document.querySelector(".ex-panel"); return d ? getComputedStyle(d).display : null; })) === "none") {
  await page.evaluate(() => { const a = document.querySelector(".ex-icon a"); a && a.click(); }); await page.waitForTimeout(700);
}

// ---- 1. 可聚焦元素清点 ----
const focusable = await page.evaluate(() => {
  const sel = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const dock = document.querySelector(".ex-panel");
  const dockFocus = dock ? Array.from(dock.querySelectorAll(sel)).map((n) => n.tagName + "." + n.className + " :: " + (n.getAttribute("title") || n.textContent.trim()).slice(0, 12)) : [];
  const dockInteractive = dock ? Array.from(dock.querySelectorAll(".ex-panel__wrap > div")).map((d) => ({ tag: d.tagName, hasTabIndex: d.hasAttribute("tabindex"), innerA: d.querySelector("a") ? d.querySelector("a").hasAttribute("href") : null, role: d.getAttribute("role"), aria: d.getAttribute("aria-label") })) : [];
  const panels = Array.from(document.querySelectorAll(".sign-panel, .fans-continue-panel, .bloop, .extool, .livetool, .exlottery, .popup-player-panel, .exupdate-panel"));
  return { dockFocusable: dockFocus, dockTiles: dockInteractive,
    globalEsc: false,
    panelRoles: panels.map((p) => ({ cls: p.className.split(" ")[0], role: p.getAttribute("role"), ariaModal: p.getAttribute("aria-modal"), ariaLabel: p.getAttribute("aria-label"), tabIndex: p.getAttribute("tabindex") })),
    dockRole: dock ? { role: dock.getAttribute("role"), aria: dock.getAttribute("aria-label") } : null };
});
console.log("FOCUSABLE:", JSON.stringify(focusable, null, 1));

// ---- 2. 用鼠标打开扩展功能（验证点击路径 + 悬停路径）----
const t3 = await page.evaluate(() => { const t = document.querySelectorAll(".ex-panel__wrap > div")[3]; const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await page.mouse.move(20, 20); await page.waitForTimeout(100);
await page.mouse.click(t3.x, t3.y, { label: "点击扩展功能磁贴" });
await page.waitForTimeout(900);
const clickPath = await page.evaluate(() => { const p = document.querySelector(".extool"); return { display: p ? getComputedStyle(p).display : null }; });
console.log("CLICK-PATH:", JSON.stringify(clickPath));

// ---- 3. Tab 焦点实测（在面板打开状态下）----
await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); document.body.focus(); });
const tabSeq = [];
for (let i = 0; i < 26; i++) {
  await page.keyboard.press("Tab");
  await page.waitForTimeout(60);
  const info = await page.evaluate(() => { const a = document.activeElement; if (!a) return null;
    const inDock = !!a.closest(".ex-panel");
    const inPanel = !!a.closest(".sign-panel, .fans-continue-panel, .bloop, .extool, .livetool, .exlottery, .popup-player-panel, .exupdate-panel");
    return { tag: a.tagName, cls: String(a.className).slice(0, 34), text: (a.getAttribute("title") || a.textContent || "").trim().slice(0, 14), inDock, inPanel }; });
  tabSeq.push(info);
}
const hits = tabSeq.filter((x) => x && (x.inDock || x.inPanel));
console.log("TAB-SEQ:", JSON.stringify(tabSeq.map((x, i) => i + ":" + (x ? x.tag + "." + x.cls : "null")), null, 0));
console.log("TAB-HITS-IN-UI:", JSON.stringify(hits));

// ---- 4. ESC 实测 ----
const before = await page.evaluate(() => getComputedStyle(document.querySelector(".extool")).display);
await page.keyboard.press("Escape");
await page.waitForTimeout(600);
const afterEsc = await page.evaluate(() => ({ extool: getComputedStyle(document.querySelector(".extool")).display,
  dock: getComputedStyle(document.querySelector(".ex-panel")).display,
  anyOpen: Array.from(document.querySelectorAll(".sign-panel, .fans-continue-panel, .bloop, .extool, .livetool, .exlottery, .popup-player-panel, .exupdate-panel")).filter((p) => getComputedStyle(p).display !== "none").length }));
console.log("ESC:", JSON.stringify({ before, afterEsc }));

// ---- 5. 焦点可见性：Tab 到关闭按钮时是否有 focus ring ----
const ringInfo = await page.evaluate(() => {
  const btn = document.querySelector(".extool .miuix-modal__close");
  if (!btn) return null; btn.focus();
  const c = getComputedStyle(btn); return { activeIsBtn: document.activeElement === btn, outline: c.outline, outlineWidth: c.outlineWidth, boxShadow: c.boxShadow };
});
console.log("FOCUS-RING:", JSON.stringify(ringInfo));

await page.screenshot({ path: OUT + "/11-keyboard-esc-state.png" });
await fs.writeFile(OUT + "/a11y-keyboard.json", JSON.stringify({ focusable, clickPath, tabSeq, hits, esc: { before, afterEsc }, ringInfo }, null, 2), "utf8");
