
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");
const out = await page.evaluate(() => {
  const symbols = Array.from(document.querySelectorAll("symbol")).map((s) => s.id);
  const themeish = symbols.filter((id) => /moon|sun|dark|night|light|theme|skin|color|appearance|dim/i.test(id));
  const rightSide = Array.from(document.querySelectorAll("header *, .Header-wrap *")).filter((el) => { const r = el.getBoundingClientRect(); return r.width > 6 && r.height > 6 && r.x > 1470; }).slice(0, 30).map((el) => ({ tag: el.tagName, cls: String(el.className).slice(0, 40), text: (el.innerText || "").trim().slice(0, 12), html: el.innerHTML.slice(0, 70).replace(/\s+/g, " ") }));
  const allSymbolCount = symbols.length;
  const anySwitcher = Array.from(document.querySelectorAll("[class*=Switch],[class*=switch],[class*=Segmented],[class*=Seg]")).filter((el) => { const r = el.getBoundingClientRect(); return r.width > 10 && r.height > 10; }).slice(0, 12).map((el) => el.tagName + "." + String(el.className).slice(0, 40) + " :: " + (el.innerText || "").trim().slice(0, 20));
  return { allSymbolCount, themeishSymbols: themeish, symbolsSample: symbols.slice(0, 25), rightSide, anySwitcher };
});
console.log(JSON.stringify(out, null, 1).slice(0, 5000));

// 进房间页再扫一遍
await page.goto("https://www.douyu.com/9999");
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.waitForTimeout(3500);
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
const room = await page.evaluate(() => {
  const themeRe = /夜间|黑夜|白天|日间|深色|浅色|暗黑|暗色|暗夜|护眼|主题|夜间模式|dark|night/i;
  const hits = [];
  const all = document.querySelectorAll("*");
  for (let i = 0; i < all.length && i < 8000; i++) {
    const el = all[i];
    const cls = typeof el.className === "string" ? el.className : "";
    const ownText = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ");
    const attr = (el.getAttribute("title") || "") + " " + (el.getAttribute("aria-label") || "") + " " + (el.getAttribute("data-title") || "");
    if (themeRe.test(ownText + " " + attr + " " + cls)) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      hits.push({ tag: el.tagName, cls: cls.slice(0, 50), text: (ownText || attr).trim().slice(0, 22), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] });
    }
  }
  const symbols = Array.from(document.querySelectorAll("symbol")).map((s) => s.id).filter((id) => /moon|sun|dark|night|light|theme|skin/i.test(id));
  return { url: location.href, htmlAttrs: Array.from(document.documentElement.attributes).map((a) => a.name + "=" + a.value),
    bodyAttrs: Array.from(document.body.attributes).map((a) => a.name + "=" + a.value),
    bodyBg: getComputedStyle(document.body).backgroundColor, bodyColor: getComputedStyle(document.body).color,
    textColorVar: getComputedStyle(document.body).getPropertyValue("--text-color"),
    hits: hits.slice(0, 20), hitCount: hits.length, themeishSymbols: symbols };
});
console.log("ROOM:", JSON.stringify(room, null, 1).slice(0, 4000));
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-room-baseline.png" });
