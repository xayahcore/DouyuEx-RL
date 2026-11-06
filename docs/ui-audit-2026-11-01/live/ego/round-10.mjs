
const task = await taskSpace("dyex-icon-ego");
const tab = (await task.tabs()).find((t) => t.active) || (await task.tabs())[0];
const page = tab.page;
console.log("url:", await page.url(), "title:", await page.title());
const d = await page.evaluate(() => {
  const dock = document.querySelector(".ex-panel");
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const tiles = Array.from(document.querySelectorAll(".ex-panel__wrap > div"));
  return {
    scroll: { x: window.scrollX, y: window.scrollY, docH: document.documentElement.scrollHeight, innerH: window.innerHeight },
    dock: r(dock), dockDisplay: dock ? getComputedStyle(dock).display : null, dockCls: dock ? dock.className : null,
    dockParent: dock ? (dock.parentElement ? dock.parentElement.className || dock.parentElement.tagName : null) : null,
    launcher: r(document.querySelector(".ex-icon")),
    tileCount: tiles.length,
    tiles: tiles.map((t) => ({ cls: t.className, ...r(t), bound: t.dataset.hoverBound || null })),
    hitAtDockCenter: (() => { if (!dock) return null; const b = dock.getBoundingClientRect(); const el = document.elementFromPoint(b.x + 60, b.y + 38); return el ? el.tagName + "." + String(el.className).slice(0, 40) : null; })(),
    panels: Array.from(document.querySelectorAll(".sign-panel,.fans-continue-panel,.bloop,.extool,.livetool,.exlottery,.popup-player-panel,.exupdate-panel,.danmaku-history-panel")).map((p) => ({ cls: p.className.split(" ")[0], display: getComputedStyle(p).display, ...r(p) })),
  };
});
console.log(JSON.stringify(d, null, 1));
