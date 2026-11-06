
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");

const tracer = `
(() => {
  window.__TH__ = { setAttr: [], setItem: [], cookieFlags: [] };
  const origSet = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    try { if (name === "data-mantine-color-scheme") window.__TH__.setAttr.push({ t: Math.round(performance.now()), value: String(value), stack: (new Error()).stack.split("\\n").slice(1, 6).join(" | ").slice(0, 320) }); } catch (e) {}
    return origSet.apply(this, arguments);
  };
  const origItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    try { if (String(k).indexOf("color-scheme") >= 0 || String(k).indexOf("theme") >= 0) window.__TH__.setItem.push({ t: Math.round(performance.now()), k: String(k), v: String(v).slice(0, 20), stack: (new Error()).stack.split("\\n").slice(1, 5).join(" | ").slice(0, 240) }); } catch (e) {}
    return origItem.apply(this, arguments);
  };
  window.__TH__.mqDark = matchMedia("(prefers-color-scheme: dark)").matches;
})();
`;
await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source: tracer });

await page.evaluate(() => { document.cookie = "mantine-color-scheme-value=dark; path=/"; localStorage.setItem("mantine-color-scheme-value", "dark"); });
await page.reload();
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
const timeline = [];
for (let i = 0; i < 14; i++) {
  await page.waitForTimeout(1000);
  await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
  const st = await page.evaluate(() => { const b = document.body, el = document.documentElement; const cs = getComputedStyle(b);
    return { t: Math.round(performance.now()), scheme: el.getAttribute("data-mantine-color-scheme"), bodyBg: cs.backgroundColor, bodyColor: cs.color, textVar: cs.getPropertyValue("--text-color").trim(), ls: localStorage.getItem("mantine-color-scheme-value"), cookie: (document.cookie.match(/mantine-color-scheme-value=[^;]*/) || ["none"])[0] }; });
  timeline.push(st);
}
console.log("TIMELINE (dark 注入后每秒采样):");
console.log(JSON.stringify(timeline, null, 0));

const th = await page.evaluate(() => ({ setAttr: window.__TH__.setAttr, setItem: window.__TH__.setItem, mqDark: window.__TH__.mqDark }));
console.log("\nSETATTR TRACE:", JSON.stringify(th.setAttr, null, 1).slice(0, 3000));
console.log("\nSETITEM TRACE:", JSON.stringify(th.setItem, null, 1).slice(0, 2000));

// 深色下再取一张图（若此刻仍为 dark）
const st = await page.evaluate(() => document.documentElement.getAttribute("data-mantine-color-scheme"));
console.log("scheme now:", st);
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-dark-probe.png" });
