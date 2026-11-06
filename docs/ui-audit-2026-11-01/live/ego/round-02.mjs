import fs from "node:fs/promises";
const OUT = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live";
const task = await taskSpace("dyex-icon-ego");
const tab = (await task.tabs()).find((t) => t.active) || (await task.tabs())[0];
const page = tab.page;
console.log("page label:", tab.label, "url:", await page.url());

await page.evaluate(() => {
  document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; });
});
const recon = await page.evaluate(() => {
  const dock = document.querySelector(".ex-panel");
  const btns = Array.from(document.querySelectorAll(".ex-panel__wrap > div"));
  const panels = Array.from(document.querySelectorAll(".sign-panel, .fans-continue-panel, .fans-panel, .extool, .livetool, .bloop, .exlottery, .popup-player-panel, .exupdate-panel, .danmaku-history-panel"));
  const cs = (el) => (el ? getComputedStyle(el) : null);
  return {
    injected: !!window.__DYEX_EGO_INJECTED__,
    hasDock: !!dock,
    dockDisplay: dock ? cs(dock).display : null,
    dockClass: dock ? dock.className : null,
    bodyClass: document.body.className,
    btnCount: btns.length,
    buttons: btns.map((b, i) => ({
      i,
      cls: b.className,
      title: b.getAttribute("title"),
      text: (b.textContent || "").trim().slice(0, 12),
      icon: b.querySelector(".ex-ico") ? "phosphor" : b.querySelector("img") ? "img" : b.querySelector("svg") ? "svg" : "none",
      act: b.getAttribute("data-act") || b.getAttribute("data-action") || null,
      childIds: Array.from(b.children).map((c) => c.tagName + "." + c.className).slice(0, 3)
    })),
    panels: panels.map((p) => ({ cls: p.className, display: cs(p).display, id: p.id || null }))
  };
});
console.log(JSON.stringify(recon, null, 1));
console.log("shot:", await page.screenshot({ path: OUT + "/round02-baseline.png" }));
