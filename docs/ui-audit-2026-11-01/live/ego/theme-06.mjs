
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");
const srcs = await page.evaluate(() => Array.from(document.querySelectorAll("script[src]")).map((s) => s.src));
const keys = ["getThemeMode", "setThemeMode", "themeMode", "handleDarkMode", "darkMode", "isDarkMode", "浅色", "深色", "跟随系统"];
const report = [];
for (const u of srcs) {
  try {
    const res = await fetch(u);
    if (!res.ok) continue;
    const text = await res.text();
    const found = {};
    for (const k of keys) {
      const idx = text.indexOf(k);
      if (idx >= 0) found[k] = { count: text.split(k).length - 1, ctx: text.slice(Math.max(0, idx - 110), idx + 150).replace(/\s+/g, " ") };
    }
    if (Object.keys(found).length) report.push({ u: u.slice(-52), found });
  } catch (e) {}
}
const brief = report.map((r) => ({ u: r.u, keys: Object.entries(r.found).map(([k, v]) => k + "×" + v.count) }));
console.log("BRIEF:", JSON.stringify(brief, null, 1));
for (const r of report) {
  for (const [k, v] of Object.entries(r.found)) {
    if (["getThemeMode", "setThemeMode", "themeMode", "handleDarkMode", "跟随系统"].includes(k)) console.log("\n### " + r.u + " :: " + k + " (×" + v.count + ")\n" + v.ctx.slice(0, 300));
  }
}
