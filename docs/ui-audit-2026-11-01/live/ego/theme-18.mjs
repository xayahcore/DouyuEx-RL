
import fs from "node:fs/promises";
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");
const NAME = "mantine-color-scheme-value";
const wipe = async () => { const c = await page.cdp("Network.getCookies", { urls: ["https://www.douyu.com/9999"] });
  for (const ck of (c.cookies || []).filter((x) => x.name === NAME)) { try { await page.cdp("Network.deleteCookies", { name: NAME, domain: ck.domain, path: ck.path }); } catch (e) {} } };
const put = (v) => page.cdp("Network.setCookie", { name: NAME, value: v, domain: ".douyu.com", path: "/", secure: false });

const sample = () => page.evaluate(() => {
  const sels = [".Header-wrap", "[class*=ChatContent]", "[class*=chatPanel]", "[class*=RankList]", "[class*=player-aside]", "[class*=aside]", "[class*=Sidebar]", "[class*=ChatToolBar]", "[class*=sendBar]", "[class*=CommentList]"];
  const out = {};
  for (const s of sels) { const el = document.querySelector(s); if (!el) { out[s] = null; continue; }
    const cs = getComputedStyle(el); out[s] = { bg: cs.backgroundColor, color: cs.color, cls: String(el.className).slice(0, 34) }; }
  const b = getComputedStyle(document.body);
  return { scheme: document.documentElement.getAttribute("data-mantine-color-scheme"), bodyBg: b.backgroundColor, bodyColor: b.color, parts: out };
});
const cropRight = async (name) => {
  const r = await page.cdp("Page.captureScreenshot", { format: "png", clip: { x: 1210, y: 0, width: 420, height: 470, scale: 2 }, captureBeyondViewport: false });
  await fs.writeFile("D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/" + name + ".png", Buffer.from(r.data, "base64"));
};

const res = {};
await wipe(); await put("dark");
await page.goto("https://www.douyu.com/9999");
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.waitForTimeout(5000);
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
res.dark = await sample();
await cropRight("theme-dark-rail");

await wipe(); await put("light");
await page.goto("https://www.douyu.com/9999");
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.waitForTimeout(5000);
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
res.light = await sample();
await cropRight("theme-light-rail");

console.log(JSON.stringify(res, null, 1));
const fsm = await import("node:fs/promises");
await fsm.writeFile("D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-coverage.json", JSON.stringify(res, null, 2), "utf8");
