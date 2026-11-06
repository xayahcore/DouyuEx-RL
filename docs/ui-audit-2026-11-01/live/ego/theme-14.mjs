
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");

// 1) 再把候选 UI 文案在全部 bundle 里扫一遍
const srcs = await page.evaluate(() => Array.from(document.querySelectorAll("script[src]")).map((s) => s.src));
const keys = ["暗黑模式", "黑色模式", "明亮模式", "日夜", "换肤", "皮肤", "外观设置", "日间模式", "夜间模式", "主题色", "colorSchemeValue", "setThemeMode", "toggleTheme"];
const hits = [];
for (const u of srcs) {
  try {
    const res = await fetch(u); if (!res.ok) continue;
    const t = await res.text();
    for (const k of keys) {
      const i = t.indexOf(k);
      if (i >= 0) hits.push({ u: u.slice(-40), k, ctx: t.slice(Math.max(0, i - 70), i + 90).replace(/\s+/g, " ") });
    }
  } catch (e) {}
}
console.log("BUNDLE UI-KEYWORD HITS:", hits.length);
console.log(JSON.stringify(hits.slice(0, 12), null, 1).slice(0, 3500));

// 2) 个人中心是否有外观设置
await page.goto("https://www.douyu.com/member/cp");
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.waitForTimeout(4000);
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
const member = await page.evaluate(() => {
  const re = /夜间|黑夜|白天|日间|深色|浅色|暗黑|暗色|主题|外观|护眼|模式|皮肤|换肤/;
  const hits = [];
  const all = document.querySelectorAll("*");
  for (let i = 0; i < all.length && i < 8000; i++) {
    const el = all[i];
    const t = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    if (t && t.length < 14 && re.test(t)) { const r = el.getBoundingClientRect(); hits.push({ t, cls: String(el.className).slice(0, 28), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }); }
  }
  const bg = getComputedStyle(document.body).backgroundColor;
  return { url: location.href.slice(0, 60), title: document.title.slice(0, 30), scheme: document.documentElement.getAttribute("data-mantine-color-scheme"), bodyBg: bg,
    inlinePresent: Array.from(document.querySelectorAll("script:not([src])")).some((s) => (s.textContent || "").indexOf("saveDisplaySettingsToCookie") >= 0),
    textHits: hits.slice(0, 25), hitCount: hits.length };
});
console.log("MEMBER CENTER:", JSON.stringify(member, null, 1).slice(0, 3000));
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-member-cp.png" });

// 3) 回房间
await page.goto("https://www.douyu.com/9999");
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.waitForTimeout(3000);
