
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");
const NAME = "mantine-color-scheme-value";

const tracer = `
(() => {
  window.__FR__ = [];
  const t0 = performance.now();
  const snap = (why) => {
    try {
      const el = document.documentElement, b = document.body;
      const bg = b ? getComputedStyle(b).backgroundColor : "n/a";
      window.__FR__.push({ t: Math.round(performance.now() - t0), why, scheme: el ? el.getAttribute("data-mantine-color-scheme") : "no-html", bg });
    } catch (e) {}
  };
  snap("start");
  let last = "";
  const tick = () => {
    let k = "";
    try { const el = document.documentElement, b = document.body; k = (el ? el.getAttribute("data-mantine-color-scheme") : "") + "|" + (b ? getComputedStyle(b).backgroundColor : ""); } catch (e) {}
    if (k !== last) { last = k; snap("frame"); }
    if (performance.now() - t0 < 6000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
`;
await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source: tracer });

const wipe = async () => { const c = await page.cdp("Network.getCookies", { urls: ["https://www.douyu.com/9999"] });
  for (const ck of (c.cookies || []).filter((x) => x.name === NAME)) { try { await page.cdp("Network.deleteCookies", { name: NAME, domain: ck.domain, path: ck.path }); } catch (e) {} } };
const put = (v) => page.cdp("Network.setCookie", { name: NAME, value: v, domain: ".douyu.com", path: "/", secure: false });

const runOne = async (label, value) => {
  await wipe(); await put(value);
  await page.goto("https://www.douyu.com/9999");
  await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
  await page.waitForTimeout(6500);
  await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
  const frames = await page.evaluate(() => window.__FR__ || []);
  const uniq = []; let prev = "";
  for (const f of frames) { const k = f.scheme + "|" + f.bg; if (k !== prev) { uniq.push(f); prev = k; } }
  console.log("\n=== " + label + " 首屏帧级时间线 ===");
  console.log(JSON.stringify(uniq, null, 0));
  return uniq;
};
const darkFrames = await runOne("DARK", "dark");
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-dark.png" });
const lightFrames = await runOne("LIGHT", "light");
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-light.png" });

// storage 事件即时生效（不刷新）
const live = await page.evaluate(async (n) => {
  const before = document.documentElement.getAttribute("data-mantine-color-scheme");
  document.cookie = n + "=dark; path=/; domain=.douyu.com";
  window.dispatchEvent(new StorageEvent("storage", { key: "global-store", newValue: "x" }));
  await new Promise((r) => setTimeout(r, 400));
  const mid = document.documentElement.getAttribute("data-mantine-color-scheme");
  const midBg = getComputedStyle(document.body).backgroundColor;
  document.cookie = n + "=light; path=/; domain=.douyu.com";
  window.dispatchEvent(new StorageEvent("storage", { key: "global-store", newValue: "y" }));
  await new Promise((r) => setTimeout(r, 400));
  const after = document.documentElement.getAttribute("data-mantine-color-scheme");
  return { before, afterStorageEventDark: mid, midBg, afterRestore: after, finalBg: getComputedStyle(document.body).backgroundColor };
}, NAME);
console.log("\nLIVE STORAGE APPLY:", JSON.stringify(live));

// 判据复核（两个态各一次）
const pred = await page.evaluate(() => {
  const el = document.documentElement, cs = getComputedStyle(document.body);
  const m = cs.backgroundColor.match(/\d+/g).map(Number);
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin(m[0]) + 0.7152 * lin(m[1]) + 0.0722 * lin(m[2]);
  return { scheme: el.getAttribute("data-mantine-color-scheme"), bg: cs.backgroundColor, lum: +L.toFixed(4), predAttr: el.getAttribute("data-mantine-color-scheme") === "dark", predLum: L < 0.2, textVar: cs.getPropertyValue("--text-color").trim() };
});
console.log("PREDICATE(light):", JSON.stringify(pred));

const fs = await import("node:fs/promises");
await fs.writeFile("D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-frames-raw.json", JSON.stringify({ darkFrames, lightFrames, live }, null, 2), "utf8");
