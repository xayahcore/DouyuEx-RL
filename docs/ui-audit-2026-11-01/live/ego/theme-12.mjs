
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");
const NAME = "mantine-color-scheme-value";

const listCookies = async () => {
  const c = await page.cdp("Network.getCookies", { urls: ["https://www.douyu.com/9999"] });
  return (c.cookies || []).filter((x) => x.name === NAME).map((x) => ({ domain: x.domain, path: x.path, value: x.value }));
};
const wipeAll = async () => {
  const found = await listCookies();
  for (const ck of found) {
    try { await page.cdp("Network.deleteCookies", { name: NAME, domain: ck.domain, path: ck.path }); } catch (e) {}
  }
  return await listCookies();
};
console.log("wipeAll ->", JSON.stringify(await wipeAll()));
await page.cdp("Network.setCookie", { name: NAME, value: "dark", domain: ".douyu.com", path: "/", secure: false });
console.log("after put:", JSON.stringify(await listCookies()));

await page.reload();
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.waitForTimeout(3000);
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
const tl = [];
for (let i = 0; i < 9; i++) {
  tl.push(await page.evaluate((n) => { const cs = getComputedStyle(document.body);
    return { t: Math.round(performance.now()), scheme: document.documentElement.getAttribute("data-mantine-color-scheme"), bg: cs.backgroundColor, txt: cs.getPropertyValue("--text-color").trim(), cookieCount: (document.cookie.match(new RegExp(n + "=[^;]*", "g")) || []).length }; }, NAME));
  await page.waitForTimeout(1000);
}
console.log("DARK TIMELINE:", JSON.stringify(tl, null, 0));
console.log("cookies now:", JSON.stringify(await listCookies()));

const snap = () => page.evaluate(() => { const b = document.body, el = document.documentElement, cs = getComputedStyle(b);
  const probe = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : null; };
  return { scheme: el.getAttribute("data-mantine-color-scheme"), htmlClass: el.className, htmlAttrs: Array.from(el.attributes).map((a) => a.name + "=" + a.value.slice(0, 40)),
    bodyClass: b.className, bodyBg: cs.backgroundColor, bodyColor: cs.color,
    vars: { textColor: cs.getPropertyValue("--text-color").trim(), bgColor: cs.getPropertyValue("--bg-color").trim(), cardBg: cs.getPropertyValue("--card-bg").trim(), borderColor: cs.getPropertyValue("--border-color").trim(), mantineColorText: cs.getPropertyValue("--mantine-color-text").trim(), bodyColorVar: cs.getPropertyValue("--mantine-color-body").trim() },
    headerBg: probe(".Header-wrap", "backgroundColor"), headerColor: probe(".Header-wrap", "color"),
    panelBg: probe("[class*=panel], [class*=Panel]", "backgroundColor"),
    mqDark: matchMedia("(prefers-color-scheme: dark)").matches }; });
const darkSnap = await snap();
console.log("DARK SNAP:", JSON.stringify(darkSnap, null, 1));
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-dark.png" });
console.log("shot dark @ scheme:", await page.evaluate(() => document.documentElement.getAttribute("data-mantine-color-scheme")));

// 复原 light（单 cookie）
console.log("wipeAll ->", JSON.stringify(await wipeAll()));
await page.cdp("Network.setCookie", { name: NAME, value: "light", domain: ".douyu.com", path: "/", secure: false });
await page.reload();
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.waitForTimeout(4000);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
const lightSnap = await snap();
console.log("LIGHT SNAP:", JSON.stringify(lightSnap, null, 1));
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-light.png" });
console.log("cookies end:", JSON.stringify(await listCookies()));

const fs = await import("node:fs/promises");
await fs.writeFile("D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-states-raw.json", JSON.stringify({ darkSnap, lightSnap, darkTimeline: tl }, null, 2), "utf8");
