import fs from "node:fs/promises";
const OUT = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live";
const task = await taskSpace("dyex-icon-ego");
const tab = (await task.tabs()).find((t) => t.active) || (await task.tabs())[0];
const page = tab.page;

const mute = async () => {
  await page.evaluate(() => {
    document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; });
  });
};
const clip = async (name, rect, scale = 2) => {
  const r = await page.cdp("Page.captureScreenshot", {
    format: "png",
    clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale },
    captureBeyondViewport: false,
  });
  const buf = Buffer.from(r.data, "base64");
  const p = OUT + "/" + name + ".png";
  await fs.writeFile(p, buf);
  return p;
};
const closeThird = async () => {
  await page.evaluate(() => {
    document.querySelectorAll(".miuix-modal__close").forEach((b) => b.click());
  });
  await page.waitForTimeout(500);
};

console.log("url:", await page.url());
await mute();

const env = await page.evaluate(() => ({
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  dpr: window.devicePixelRatio,
  zoom: window.outerWidth ? +(window.outerWidth / window.innerWidth).toFixed(3) : null,
  screen: { w: screen.width, h: screen.height },
  ua: navigator.userAgent.slice(0, 90),
}));
console.log("ENV:", JSON.stringify(env));

// 1) 关闭所有三级面板
await closeThird();

// 2) 收起 Dock（点精灵球）
await page.evaluate(() => { const a = document.querySelector(".ex-icon a"); a && a.click(); });
await page.waitForTimeout(700);
const collapsed = await page.evaluate(() => {
  const d = document.querySelector(".ex-panel");
  return { display: d ? getComputedStyle(d).display : null, cls: d ? d.className : null,
    iconRect: (() => { const i = document.querySelector(".ex-icon"); if (!i) return null; const r = i.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; })() };
});
console.log("COLLAPSED:", JSON.stringify(collapsed));
console.log("shot:", await page.screenshot({ path: OUT + "/dock-01-collapsed.png" }));

// 3) 展开 Dock
await page.evaluate(() => { const a = document.querySelector(".ex-icon a"); a && a.click(); });
await page.waitForTimeout(700);
const geo = await page.evaluate(() => {
  const px = (n) => (n == null ? null : +n.toFixed(2));
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); const c = getComputedStyle(el);
    return { x: px(r.x), y: px(r.y), w: px(r.width), h: px(r.height),
      radius: c.borderRadius, bg: c.backgroundColor, blur: c.backdropFilter, shadow: c.boxShadow,
      border: c.border, zIndex: c.zIndex, position: c.position, bottom: c.bottom, right: c.right,
      padding: c.padding, display: c.display, transform: c.transform }; };
  const dock = document.querySelector(".ex-panel");
  const tiles = Array.from(document.querySelectorAll(".ex-panel__wrap > div"));
  return {
    dock: box(dock),
    dockComputedHeight: dock ? getComputedStyle(dock).height : null,
    close: box(document.querySelector(".ex-panel__close")),
    tiles: tiles.map((t) => { const b = box(t); return { cls: t.className, ...b, iconColor: (() => { const s = t.querySelector("svg"); return s ? getComputedStyle(s).color : null; })(),
      iconSize: (() => { const s = t.querySelector("svg"); if (!s) return null; const r = s.getBoundingClientRect(); return { w: px(r.width), h: px(r.height) }; })(),
      ind: (() => { const i = t.querySelector(".ex-panel__indicator"); if (!i) return null; const c = getComputedStyle(i); return { bg: c.backgroundColor, transform: c.transform, opacity: c.opacity }; })() }; }),
    gap: dock ? getComputedStyle(dock.querySelector(".ex-panel__wrap")).gap : null,
    totalDockWidth: dock ? dock.getBoundingClientRect().width : null,
  };
});
console.log("DOCK GEO:", JSON.stringify(geo, null, 1));
console.log("shot:", await page.screenshot({ path: OUT + "/dock-02-expanded.png" }));
const dr = geo.dock;
console.log("crop:", await clip("dock-02-expanded-crop", { x: Math.max(0, dr.x - 14), y: Math.max(0, dr.y - 14), width: dr.w + 28, height: dr.h + 28 }, 3));
