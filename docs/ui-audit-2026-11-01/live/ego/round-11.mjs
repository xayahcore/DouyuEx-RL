
import fs from "node:fs/promises";
const OUT = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live";
const task = await taskSpace("dyex-icon-ego");
const tab = (await task.tabs()).find((t) => t.active) || (await task.tabs())[0];
const page = tab.page;

await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(800);
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.evaluate(() => { document.querySelectorAll(".miuix-modal__close").forEach((b) => b.click()); });
await page.waitForTimeout(300);

// 确保 Dock 打开
const openDock = async () => {
  const shown = await page.evaluate(() => { const d = document.querySelector(".ex-panel"); return d ? getComputedStyle(d).display !== "none" : false; });
  if (!shown) { await page.evaluate(() => { const a = document.querySelector(".ex-icon a"); a && a.click(); }); await page.waitForTimeout(800); }
};
await openDock();
const dockInfo = await page.evaluate(() => { const d = document.querySelector(".ex-panel"); const r = d.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, display: getComputedStyle(d).display, scrollY: window.scrollY }; });
console.log("DOCK:", JSON.stringify(dockInfo));

// ---- C. Dock 项目清单 ----
const inv = await page.evaluate(() => {
  const tiles = Array.from(document.querySelectorAll(".ex-panel__wrap > div"));
  const mapped = ["ex-sign","fans-continue","bloop-icon","extool-icon","livetool-icon","popup-player","ex-lottery","ex-update"];
  const present = tiles.map((t) => ({ cls: t.className.split(" ")[0], hasIndicator: !!t.querySelector(".ex-panel__indicator"), hasIcon: !!t.querySelector(".ex-ico"), title: (t.querySelector(".ex-panel__icon") || {}).title || null }));
  const mapDom = [".sign-panel",".fans-continue-panel",".bloop",".extool",".livetool",".popup-player-panel",".exlottery",".exupdate-panel",".danmaku-history-panel","#vote__result"];
  return { tileCount: tiles.length, present, mappedMissing: mapped.filter((m) => !present.some((p) => p.cls === m)),
    panelDom: mapDom.map((s) => ({ sel: s, exists: !!document.querySelector(s) })),
    anyDanmakuTrigger: Array.from(document.querySelectorAll("[class*=danmaku-history], .ChatToolBar-DanmakuTail")).map((n) => n.className).slice(0, 6) };
});
console.log("INVENTORY:", JSON.stringify(inv, null, 1));

// ---- 用合成 mouseenter 稳定打开面板 ----
const openBy = async (idx) => {
  await page.evaluate((i) => { const t = document.querySelectorAll(".ex-panel__wrap > div")[i]; if (!t) return;
    t.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false })); }, idx);
  await page.waitForTimeout(900);
};
await openBy(3);
const extoolShown = await page.evaluate(() => getComputedStyle(document.querySelector(".extool")).display);
console.log("extool via mouseenter:", extoolShown);

// ---- A. CDP 命中样式 ----
await page.cdp("DOM.enable");
await page.cdp("CSS.enable");
const docNode = await page.cdp("DOM.getDocument", { depth: -1 });
const dumpColor = async (selector) => {
  const q = await page.cdp("DOM.querySelector", { nodeId: docNode.root.nodeId, selector });
  if (!q || !q.nodeId) return { selector, error: "not-found" };
  const ms = await page.cdp("CSS.getMatchedStylesForNode", { nodeId: q.nodeId });
  const pick = (list, root) => (list || []).map((m) => {
    const r = m.rule; if (!r) return null;
    const decls = (r.style && r.style.cssProperties || []).filter((p) => p.name === "color");
    return { selector: r.selectorList ? r.selectorList.text : r.selectorText || null, origin: r.origin, sheetId: r.styleSheetId,
      line: r.style && r.style.range ? r.style.range.startLine : null,
      matchingSelectors: m.matchingSelectors, color: decls.map((d) => ({ value: d.value, important: !!d.important, text: d.text })) };
  }).filter((x) => x && x.color.length);
  const inherited = [];
  for (const inh of (ms.inherited || [])) {
    const matched = pick(inh.matchedCSSRules).map((x) => ({ ...x, inheritedFrom: inh.inheritedFrom ? inh.inheritedFrom.nodeName + "." + (inh.inheritedFrom.attributes || []).join(" ") : null }));
    inherited.push(...matched);
  }
  return { selector, nodeId: q.nodeId, matchedColorRules: pick(ms.matchedCSSRules), inline: (ms.inlineStyle && ms.inlineStyle.cssProperties || []).filter((p) => p.name === "color"), inheritedColorRules: inherited,
    computed: null };
};
const traceA = await dumpColor(".extool-icon .ex-panel__icon svg");
const traceB = await dumpColor(".ex-sign .ex-panel__icon svg");

// sheet 文本定位（确认这些规则来自用户脚本注入的风格表的那一段）
const sheetIds = [...new Set([...(traceA.matchedColorRules||[]), ...(traceB.matchedColorRules||[])].map((r) => r.sheetId).filter(Boolean))];
const sheetLines = {};
for (const sid of sheetIds) {
  try {
    const st = await page.cdp("CSS.getStyleSheetText", { styleSheetId: sid });
    const lines = st.text.split("\n");
    const marker = lines.findIndex((l) => l.includes("9. Phosphor 图标层"));
    sheetLines[sid] = { totalLines: lines.length, phosphorSectionLine: marker + 1,
      samples: [ ...(traceA.matchedColorRules||[]), ...(traceB.matchedColorRules||[]) ].filter((r) => r.sheetId === sid && r.line != null)
        .map((r) => ({ line: r.line + 1, text: (lines[r.line] || "").trim().slice(0, 90), prev: (lines[r.line - 1] || "").trim().slice(0, 60) })) };
  } catch (e) { sheetLines[sid] = String(e); }
}
const computed = await page.evaluate(() => {
  const g = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : null; };
  const d = (sel) => { const el = document.querySelector(sel); return el ? { display: getComputedStyle(el).display, color: getComputedStyle(el).color, rect: (() => { const r = el.getBoundingClientRect(); return [ +r.width.toFixed(1), +r.height.toFixed(1) ]; })() } : null; };
  return {
    extoolIconSvg: d(".extool-icon .ex-panel__icon svg"),
    extoolIconLine: d(".extool-icon .ex-ico--line"),
    extoolIconFill: d(".extool-icon .ex-ico--fill"),
    extoolIconFillSvg: d(".extool-icon .ex-ico--fill svg"),
    signIconSvg: d(".ex-sign .ex-panel__icon svg"),
    signIconLine: d(".ex-sign .ex-ico--line"),
    signIconFill: d(".ex-sign .ex-ico--fill"),
    wrapColor: g(".extool-icon .ex-ico--fill", "color"),
    wrapInherit_from: (() => { let el = document.querySelector(".extool-icon .ex-ico--fill"); const chain = []; while (el && chain.length < 6) { chain.push(el.tagName + "." + String(el.className).split(" ")[0] + "=" + getComputedStyle(el).color); el = el.parentElement; } return chain; })(),
  };
});
console.log("COMPUTED:", JSON.stringify(computed, null, 1));
console.log("TRACE-A:", JSON.stringify({ matched: traceA.matchedColorRules, inherited: traceA.inheritedColorRules, inline: traceA.inline }, null, 1));
console.log("TRACE-B:", JSON.stringify({ matched: traceB.matchedColorRules, inherited: traceB.inheritedColorRules, inline: traceB.inline }, null, 1));
console.log("SHEETS:", JSON.stringify(sheetLines, null, 1));
await fs.writeFile(OUT + "/icon-color-trace.json", JSON.stringify({ selectorA: traceA, selectorB: traceB, sheetLines, computed, inventory: inv, dockInfo }, null, 2), "utf8");
