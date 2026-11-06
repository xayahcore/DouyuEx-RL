
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");
await page.goto("https://www.douyu.com/");
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.waitForTimeout(3000);
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
console.log("url:", await page.url(), "title:", (await page.title()).slice(0, 40));
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-home-baseline.png" });

const scan = await page.evaluate(() => {
  const themeRe = /夜间|黑夜|白天|日间|深色|浅色|暗黑|暗色|暗夜|主题|护眼|夜间模式|dark|light|theme|appearance|color-scheme/i;
  const out = { url: location.href, title: document.title,
    htmlAttrs: Array.from(document.documentElement.attributes).map((a) => a.name + "=" + a.value),
    bodyAttrs: Array.from(document.body.attributes).map((a) => a.name + "=" + a.value),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyColor: getComputedStyle(document.body).color,
    textColorVar: getComputedStyle(document.body).getPropertyValue("--text-color"),
    bgColorVar: getComputedStyle(document.body).getPropertyValue("--bg-color"),
    matchesColorScheme: matchMedia("(prefers-color-scheme: dark)").matches,
  };
  const hits = [];
  const all = document.querySelectorAll("*");
  for (let i = 0; i < all.length && i < 6000; i++) {
    const el = all[i];
    const cls = typeof el.className === "string" ? el.className : "";
    const id = el.id || "";
    const aria = el.getAttribute("aria-label") || "";
    const titleAttr = el.getAttribute("title") || "";
    const ownText = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").slice(0, 24);
    const blob = cls + " " + id + " " + aria + " " + titleAttr + " " + ownText;
    if (themeRe.test(blob) && (ownText || aria || titleAttr || /theme|dark|night|skin/i.test(cls + id))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      hits.push({ tag: el.tagName, cls: cls.slice(0, 60), id: id.slice(0, 30), text: (ownText || aria || titleAttr).slice(0, 24), aria: aria.slice(0, 20), title: titleAttr.slice(0, 24), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] });
    }
  }
  out.hits = hits.slice(0, 25);
  out.hitCount = hits.length;
  out.dataThemeEls = Array.from(document.querySelectorAll("[data-theme],[data-color-scheme],[data-mode]")).slice(0, 8).map((el) => el.tagName + "." + String(el.className).slice(0, 30) + " data-theme=" + el.getAttribute("data-theme") + " data-mode=" + el.getAttribute("data-mode"));
  return out;
});
console.log(JSON.stringify(scan, null, 1));

const storage = await page.evaluate(() => {
  const dump = (s) => { const o = {}; for (let i = 0; i < s.length; i++) { const k = s.key(i); if (/theme|dark|night|mode|skin|color/i.test(k)) o[k] = String(s.getItem(k)).slice(0, 60); } return o; };
  return { ls: dump(localStorage), ss: dump(sessionStorage),
    allLsKeys: Object.keys(localStorage).slice(0, 40),
    cookie: document.cookie.split(";").map((c) => c.trim()).filter((c) => /theme|dark|night|mode|skin|color/i.test(c)).slice(0, 10) };
});
console.log("STORAGE:", JSON.stringify(storage, null, 1));
