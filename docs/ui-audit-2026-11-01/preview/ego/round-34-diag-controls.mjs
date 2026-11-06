const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
await page.goto("http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html?skin=glass2&delta=0");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 25000 });
await page.waitForTimeout(400);
const info = await page.evaluate(() => {
  const pane = document.querySelector("#row-controls .pane.after");
  const modal = pane && pane.querySelector(".miuix-modal");
  const item = pane && pane.querySelector(".sign-option-item");
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  return {
    paneRect: rect(pane),
    paneChildren: pane ? pane.children.length : -1,
    modalRect: rect(modal),
    modalStyle: modal ? { pos: getComputedStyle(modal).position, bg: getComputedStyle(modal).backgroundColor, disp: getComputedStyle(modal).display, inline: modal.getAttribute("style") } : null,
    itemRect: rect(item),
    itemBg: item ? getComputedStyle(item).backgroundColor : null,
    bodyScroll: document.body.scrollTop,
  };
});
console.log(JSON.stringify(info, null, 1));
