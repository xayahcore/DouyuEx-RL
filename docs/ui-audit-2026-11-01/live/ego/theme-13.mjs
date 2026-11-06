
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");
const NAME = "mantine-color-scheme-value";
const setCookie = (v) => page.cdp("Network.setCookie", { name: NAME, value: v, domain: ".douyu.com", path: "/", secure: false });
const probe = () => page.evaluate(() => {
  const b = document.body, el = document.documentElement, cs = getComputedStyle(b);
  const bg = cs.backgroundColor.match(/\d+/g).map(Number);
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = bg && bg.length >= 3 ? 0.2126 * lin(bg[0]) + 0.7152 * lin(bg[1]) + 0.0722 * lin(bg[2]) : null;
  const inlineHas = Array.from(document.querySelectorAll("script:not([src])")).some((s) => (s.textContent || "").indexOf("saveDisplaySettingsToCookie") >= 0);
  return { url: location.href.slice(0, 46), scheme: el.getAttribute("data-mantine-color-scheme"), bodyBg: cs.backgroundColor, bodyColor: cs.color,
    textVar: cs.getPropertyValue("--text-color").trim(), cardVar: cs.getPropertyValue("--card-bg").trim(),
    lum: L == null ? null : +L.toFixed(4), predAttr: el.getAttribute("data-mantine-color-scheme") === "dark", predLum: L != null && L < 0.2,
    inlineScriptPresent: inlineHas, htmlClass: el.className, bodyClass: b.className.slice(0, 50) };
});

// A. 首页 douyu.com 是否也吃这个 cookie
await setCookie("dark");
await page.goto("https://www.douyu.com/");
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.waitForTimeout(4000);
const homeDark = await probe();
console.log("HOME+dark:", JSON.stringify(homeDark, null, 1));
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-home-dark.png" });

await setCookie("light");
await page.goto("https://www.douyu.com/");
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.waitForTimeout(3500);
const homeLight = await probe();
console.log("HOME+light:", JSON.stringify(homeLight, null, 1));

// B. 首页找主题入口：用户菜单 / 设置
const menu = await page.evaluate(() => {
  const avatar = document.querySelector(".UserInfo-link") || document.querySelector(".UserInfo");
  if (!avatar) return { err: "no-avatar" };
  const r = avatar.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, cls: avatar.className };
});
console.log("avatar:", JSON.stringify(menu));
if (menu.x) {
  await page.mouse.move(menu.x, menu.y);
  await page.waitForTimeout(1200);
  const dd = await page.evaluate(() => {
    const re = /设置|主题|夜间|深色|浅色|外观|白天|暗色/;
    const cands = Array.from(document.querySelectorAll("[class*=Drop],[class*=drop],[class*=Menu],[class*=menu],[class*=Panel],[class*=panel]")).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 60 && r.height > 40 && r.y < 400; });
    const items = [];
    for (const c of cands.slice(0, 6)) {
      items.push({ cls: String(c.className).slice(0, 40), text: (c.innerText || "").replace(/\s+/g, " ").slice(0, 120), hit: re.test(c.innerText || "") });
    }
    const hits = Array.from(document.querySelectorAll("a,button,div")).filter((e) => { const t = (e.children.length === 0 ? e.textContent : "").trim(); return t && re.test(t) && t.length < 12; }).slice(0, 12).map((e) => ({ tag: e.tagName, cls: String(e.className).slice(0, 30), t: e.textContent.trim(), rect: (() => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })() }));
    return { dropdowns: items, textHits: hits };
  });
  console.log("DROPDOWN:", JSON.stringify(dd, null, 1).slice(0, 3000));
  await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-home-usermenu.png" });
}
