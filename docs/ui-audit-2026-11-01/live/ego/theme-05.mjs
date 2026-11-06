
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");
const srcs = await page.evaluate(() => Array.from(document.querySelectorAll("script[src]")).map((s) => s.src));
console.log("script count:", srcs.length);
const keys = ["mantine-color-scheme", "setColorScheme", "toggleColorScheme", "colorScheme", "夜间", "暗色模式", "深色模式", "主题设置", "护眼"];
const report = [];
for (const u of srcs) {
  try {
    const res = await fetch(u);
    if (!res.ok) { report.push({ u: u.slice(-50), status: res.status }); continue; }
    const text = await res.text();
    const found = {};
    for (const k of keys) {
      const idx = text.indexOf(k);
      if (idx >= 0) {
        found[k] = { count: text.split(k).length - 1, ctx: text.slice(Math.max(0, idx - 90), idx + 110).replace(/\s+/g, " ") };
      }
    }
    if (Object.keys(found).length) report.push({ u: u.slice(-56), size: text.length, found });
  } catch (e) { report.push({ u: u.slice(-50), err: String(e).slice(0, 60) }); }
}
console.log(JSON.stringify(report, null, 1).slice(0, 7000));
