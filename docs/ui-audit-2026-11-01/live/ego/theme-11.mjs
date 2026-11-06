
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");
const NAME = "mantine-color-scheme-value";

const wipe = async () => {
  for (const d of [".douyu.com", "www.douyu.com", "douyu.com"]) {
    try { await page.cdp("Network.deleteCookies", { name: NAME, domain: d, path: "/" }); } catch (e) {}
  }
  const c = await page.cdp("Network.getCookies", { urls: ["https://www.douyu.com/9999"] });
  return (c.cookies || []).filter((x) => x.name === NAME).map((x) => x.domain + "=" + x.value);
};
const put = async (value, domain) => { await page.cdp("Network.setCookie", { name: NAME, value, domain, path: "/", secure: false }); };

console.log("wipe ->", JSON.stringify(await wipe()));
await put("dark", ".douyu.com");
const c1 = await page.cdp("Network.getCookies", { urls: ["https://www.douyu.com/9999"] });
console.log("after set:", JSON.stringify((c1.cookies || []).filter((x) => x.name === NAME).map((x) => x.domain + "=" + x.value)));

await page.reload();
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
const tl = [];
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(1000);
  await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
  tl.push(await page.evaluate((n) => { const cs = getComputedStyle(document.body);
    return { t: Math.round(performance.now()), scheme: document.documentElement.getAttribute("data-mantine-color-scheme"), bg: cs.backgroundColor, txt: cs.getPropertyValue("--text-color").trim(), cookies: (document.cookie.match(new RegExp(n + "=[^;]*", "g")) || []).length }; }, NAME));
}
console.log("DARK(单 cookie) TIMELINE:", JSON.stringify(tl, null, 0));
const darkState = await page.evaluate(() => { const b = document.body, el = document.documentElement, cs = getComputedStyle(b);
  return { scheme: el.getAttribute("data-mantine-color-scheme"), htmlClass: el.className, bodyClass: b.className,
    bodyBg: cs.backgroundColor, bodyColor: cs.color, textVar: cs.getPropertyValue("--text-color").trim(),
    headerBg: (() => { const h = document.querySelector(".Header-wrap"); return h ? getComputedStyle(h).backgroundColor : null; })(),
    headerColor: (() => { const h = document.querySelector(".Header-wrap"); return h ? getComputedStyle(h).color : null; })() }; });
console.log("DARK STATE:", JSON.stringify(darkState));
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-dark.png" });

// 单 cookie 回 light
console.log("wipe ->", JSON.stringify(await wipe()));
await put("light", ".douyu.com");
await page.reload();
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.waitForTimeout(4500);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
const lightState = await page.evaluate(() => { const b = document.body, el = document.documentElement, cs = getComputedStyle(b);
  return { scheme: el.getAttribute("data-mantine-color-scheme"), htmlClass: el.className, bodyClass: b.className,
    bodyBg: cs.backgroundColor, bodyColor: cs.color, textVar: cs.getPropertyValue("--text-color").trim(),
    headerBg: (() => { const h = document.querySelector(".Header-wrap"); return h ? getComputedStyle(h).backgroundColor : null; })(),
    headerColor: (() => { const h = document.querySelector(".Header-wrap"); return h ? getComputedStyle(h).color : null; })() }; });
console.log("LIGHT STATE:", JSON.stringify(lightState));
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-light.png" });

const fs = await import("node:fs/promises");
await fs.writeFile("D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-states-raw.json", JSON.stringify({ darkState, lightState, darkTimeline: tl }, null, 2), "utf8");
