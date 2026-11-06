const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
await page.goto("http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });

const out = await page.evaluate(() => {
  const report = {};
  const pane = document.querySelector("#row-controls .pane--after");
  const btn = pane.querySelector(".miuix-modal__close");
  const focusEl = pane.querySelector(".is-demo-focus");
  const pseudo = getComputedStyle(btn, "::after");
  report.closeButton = {
    matchesAfterClose: btn.matches(".after .miuix-modal__close"),
    paneClass: pane.className,
    pseudoContent: pseudo.content,
    pseudoWidth: pseudo.width,
    pseudoHeight: pseudo.height,
    pseudoPosition: pseudo.position,
    hitVar: getComputedStyle(pane).getPropertyValue("--a-hit"),
    outlineStyle: getComputedStyle(focusEl).outlineStyle,
    focusMatches: focusEl.matches(".after .is-demo-focus")
  };
  // 找出 after.css 里所有含 ::after 或 is-demo-focus 的规则
  const found = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch (error) { continue; }
    for (const rule of rules) {
      const text = rule.cssText || "";
      if (text.indexOf("is-demo-focus") >= 0 || (text.indexOf("__close::after") >= 0)) {
        found.push({ href: (sheet.href || "inline").split("/").pop(), text: text.slice(0, 220) });
      }
    }
  }
  report.rules = found;
  // Dock 宽度拆解
  const dock = document.querySelector("#row-dock .pane--after .ex-panel");
  report.dock = {
    width: dock.getBoundingClientRect().width,
    padding: getComputedStyle(dock).padding,
    children: [...dock.querySelectorAll(".ex-panel__wrap > div")].map((el) => Math.round(el.getBoundingClientRect().width)),
    wrapGap: getComputedStyle(dock.querySelector(".ex-panel__wrap")).gap
  };
  const dockBefore = document.querySelector("#row-dock .pane--before .ex-panel");
  report.dockBefore = { width: dockBefore.getBoundingClientRect().width, padding: getComputedStyle(dockBefore).padding };
  return report;
});
console.log(JSON.stringify(out, null, 1));
