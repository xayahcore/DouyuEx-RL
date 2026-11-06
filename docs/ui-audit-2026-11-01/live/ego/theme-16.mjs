
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
// 播放器工具栏「设置」齿轮里有没有夜间/护眼开关
const gear = await page.evaluate(() => {
  const cands = Array.from(document.querySelectorAll("[class*=PlayerToolbar] [class*=setting], [class*=PlayerToolbar] [class*=Setting], [class*=player] [class*=gear], [title*=设置], [aria-label*=设置]"))
    .map((e) => { const r = e.getBoundingClientRect(); return { cls: String(e.className).slice(0, 40), title: e.getAttribute("title"), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }; })
    .filter((x) => x.rect[2] > 6);
  return cands.slice(0, 10);
});
console.log("GEAR CANDIDATES:", JSON.stringify(gear));
const clicked = [];
for (const g of gear.slice(0, 3)) {
  if (!g.rect[2]) continue;
  await page.mouse.click(g.rect[0] + g.rect[2] / 2, g.rect[1] + g.rect[3] / 2, { label: "打开设置菜单" });
  await page.waitForTimeout(900);
  const items = await page.evaluate(() => {
    const re = /夜间|深色|浅色|主题|外观|护眼|暗色|明亮|模式/;
    const hits = [];
    const all = document.querySelectorAll("*");
    for (let i = 0; i < all.length && i < 12000; i++) {
      const el = all[i];
      const t = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
      if (t && t.length < 10 && re.test(t)) { const r = el.getBoundingClientRect(); if (r.width > 4) hits.push({ t, cls: String(el.className).slice(0, 24), rect: [Math.round(r.x), Math.round(r.y)] }); }
    }
    return hits.slice(0, 15);
  });
  clicked.push({ on: g.cls || g.title, items });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
}
console.log("PLAYER SETTINGS SWEEP:", JSON.stringify(clicked, null, 1).slice(0, 2500));
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-player-settings.png" });

// 最终状态核对 + 存储快照
const final = await page.evaluate(() => ({
  scheme: document.documentElement.getAttribute("data-mantine-color-scheme"),
  bodyBg: getComputedStyle(document.body).backgroundColor,
  lsHasTheme: (() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/mantine|theme|color-scheme/i.test(k)) o[k] = String(localStorage.getItem(k)).slice(0, 20); } return o; })(),
  ssHasTheme: (() => { const o = {}; for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); if (/mantine|theme|color-scheme/i.test(k)) o[k] = String(sessionStorage.getItem(k)).slice(0, 20); } return o; })(),
  cookie: document.cookie.split(";").map((c) => c.trim()).filter((c) => /mantine|theme/i.test(c)),
}));
console.log("FINAL:", JSON.stringify(final, null, 1));
