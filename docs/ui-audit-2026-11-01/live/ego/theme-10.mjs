
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");
const cookies = await page.cdp("Network.getCookies", { urls: ["https://www.douyu.com/9999", "https://www.douyu.com/"] });
const mine = (cookies.cookies || []).filter((c) => /mantine/i.test(c.name));
console.log("MANTINE COOKIES:", JSON.stringify(mine.map((c) => ({ name: c.name, value: c.value, domain: c.domain, path: c.path, expires: c.expires > 0 ? new Date(c.expires * 1000).toISOString() : "session", httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite })), null, 1));

const state = () => page.evaluate(() => { const b = document.body, el = document.documentElement, cs = getComputedStyle(b);
  return { scheme: el.getAttribute("data-mantine-color-scheme"), bodyBg: cs.backgroundColor, bodyColor: cs.color, textVar: cs.getPropertyValue("--text-color").trim(),
    bodyFontFamily: cs.getPropertyValue("--font-family").trim(), headerBg: (() => { const h = document.querySelector(".Header-wrap"); return h ? getComputedStyle(h).backgroundColor : null; })(),
    cardBg: (() => { const c = document.querySelector("[class*=card], [class*=Card]"); return c ? getComputedStyle(c).backgroundColor : null; })() }; });

const setCookie = (v) => page.evaluate((val) => {
  document.cookie = "mantine-color-scheme-value=" + val + "; path=/; domain=.douyu.com";
  document.cookie = "mantine-color-scheme-value=" + val + "; path=/";
  document.cookie = "mantine-color-scheme-value=" + val + "; path=/; domain=www.douyu.com";
  return document.cookie.match(/mantine-color-scheme-value=[^;]*/g);
}, v);

console.log("READ before:", JSON.stringify(await state()));
// 先强制 dark（domain cookie）
console.log("set dark ->", JSON.stringify(await setCookie("dark")));
await page.reload();
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
const tl = [];
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(1000);
  await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
  tl.push(await page.evaluate(() => { const cs = getComputedStyle(document.body); return { t: Math.round(performance.now()), scheme: document.documentElement.getAttribute("data-mantine-color-scheme"), bg: cs.backgroundColor, txt: cs.getPropertyValue("--text-color").trim(), cookie: (document.cookie.match(/mantine-color-scheme-value=[^;]*/g) || []).join(" & ") }; }));
}
console.log("DARK TIMELINE:", JSON.stringify(tl, null, 0));
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
const darkState = await page.evaluate(() => { const b = document.body, el = document.documentElement, cs = getComputedStyle(b);
  return { scheme: el.getAttribute("data-mantine-color-scheme"), bodyBg: cs.backgroundColor, bodyColor: cs.color, textVar: cs.getPropertyValue("--text-color").trim(),
    headerBg: (() => { const h = document.querySelector(".Header-wrap"); return h ? getComputedStyle(h).backgroundColor : null; })(),
    headerColor: (() => { const h = document.querySelector(".Header-wrap"); return h ? getComputedStyle(h).color : null; })(),
    htmlClass: el.className, bodyClass: b.className, cookies: (document.cookie.match(/mantine-color-scheme-value=[^;]*/g) || []) }; });
console.log("DARK STATE:", JSON.stringify(darkState, null, 1));
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-dark.png" });

// 回 light
console.log("set light ->", JSON.stringify(await setCookie("light")));
await page.reload();
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.waitForTimeout(4000);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
const lightState = await page.evaluate(() => { const b = document.body, el = document.documentElement, cs = getComputedStyle(b);
  return { scheme: el.getAttribute("data-mantine-color-scheme"), bodyBg: cs.backgroundColor, bodyColor: cs.color, textVar: cs.getPropertyValue("--text-color").trim(),
    headerBg: (() => { const h = document.querySelector(".Header-wrap"); return h ? getComputedStyle(h).backgroundColor : null; })(),
    headerColor: (() => { const h = document.querySelector(".Header-wrap"); return h ? getComputedStyle(h).color : null; })(),
    htmlClass: el.className, bodyClass: b.className, cookies: (document.cookie.match(/mantine-color-scheme-value=[^;]*/g) || []) }; });
console.log("LIGHT STATE:", JSON.stringify(lightState, null, 1));
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-light.png" });

const fs = await import("node:fs/promises");
await fs.writeFile("D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-states-raw.json", JSON.stringify({ darkState, lightState, darkTimeline: tl, cookies: mine }, null, 2), "utf8");
