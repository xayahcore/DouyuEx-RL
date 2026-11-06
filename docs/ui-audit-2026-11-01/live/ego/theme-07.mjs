
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");

// 0) 先看 Mantine 存取机制（chunk 596）
const chunk = await page.evaluate(() => Array.from(document.querySelectorAll("script[src]")).map((s) => s.src).find((u) => /596-/.test(u)));
if (chunk) {
  const t = await (await fetch(chunk)).text();
  const i = t.indexOf("mantine-color-scheme");
  console.log("CHUNK596 ctx:", i >= 0 ? t.slice(Math.max(0, i - 260), i + 200).replace(/\s+/g, " ") : "not found");
  for (const k of ["localStorageColorSchemeManager", "cookieStorage", "colorSchemeManager", "document.cookie"]) {
    const j = t.indexOf(k);
    if (j >= 0) console.log("· " + k + " →", t.slice(Math.max(0, j - 130), j + 130).replace(/\s+/g, " "));
  }
}

// 1) 记录当前存储原值
const before = await page.evaluate(() => ({ cookie: document.cookie, ls: localStorage.getItem("mantine-color-scheme-value"), schemeAttr: document.documentElement.getAttribute("data-mantine-color-scheme") }));
console.log("BEFORE:", JSON.stringify(before));

// 2) 安装 document-start 追踪器
const tracer = `
(() => {
  window.__THEME_TRACE__ = { start: 0, samples: [], mutations: [], mqDark: null };
  const T = window.__THEME_TRACE__;
  const snap = (tag) => {
    const el = document.documentElement, b = document.body;
    const cs = b ? getComputedStyle(b) : null;
    return { t: Math.round(performance.now()), tag,
      scheme: el ? el.getAttribute("data-mantine-color-scheme") : null,
      htmlClass: el ? el.className : null,
      bodyClass: b ? b.className : null,
      bodyBg: cs ? cs.backgroundColor : null,
      bodyColor: cs ? cs.color : null,
      textColorVar: cs ? cs.getPropertyValue("--text-color").trim() : null,
      bgColorVar: cs ? cs.getPropertyValue("--bg-color").trim() : null };
  };
  const push = (tag) => { try { T.samples.push(snap(tag)); } catch (e) {} };
  T.push = push;
  push("document-start");
  try { T.mqDark = matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) {}
  let last = "";
  const tick = () => {
    try {
      const el = document.documentElement, b = document.body;
      const key = (el ? el.getAttribute("data-mantine-color-scheme") : "") + "|" + (b ? getComputedStyle(b).backgroundColor : "") + "|" + (b ? b.className : "");
      if (key !== last) { last = key; push("frame-change"); }
    } catch (e) {}
    if (performance.now() < 6000) requestAnimationFrame(tick);
  };
  const raf = () => { try { requestAnimationFrame(tick); } catch (e) {} };
  if (document.readyState === "loading") raf(); else raf();
  const attach = () => {
    const el = document.documentElement;
    if (!el) { setTimeout(attach, 4); return; }
    const obs = new MutationObserver((recs) => {
      for (const r of recs) if (r.type === "attributes") T.mutations.push({ t: Math.round(performance.now()), target: r.target.nodeName, attr: r.attributeName, old: r.oldValue, now: r.target.getAttribute(r.attributeName) });
    });
    obs.observe(el, { attributes: true, attributeOldValue: true, attributeFilter: ["data-mantine-color-scheme", "class", "style"] });
    const attachBody = () => {
      if (!document.body) { setTimeout(attachBody, 4); return; }
      new MutationObserver((recs) => {
        for (const r of recs) if (r.type === "attributes") T.mutations.push({ t: Math.round(performance.now()), target: "BODY", attr: r.attributeName, old: r.oldValue, now: String(r.target.getAttribute(r.attributeName)).slice(0, 80) });
      }).observe(document.body, { attributes: true, attributeOldValue: true, attributeFilter: ["class", "style"] });
      push("body-ready");
    };
    attachBody();
  };
  attach();
})();
`;
await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source: tracer });

const cycle = async (label, applyStorage) => {
  await applyStorage();
  await page.reload();
  await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
  await page.waitForTimeout(6500);
  await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
  const res = await page.evaluate(() => {
    const T = window.__THEME_TRACE__ || { samples: [], mutations: [] };
    const b = document.body, el = document.documentElement;
    const cs = getComputedStyle(b);
    const uniq = [];
    let prev = "";
    for (const s of T.samples) { const k = s.scheme + "|" + s.bodyBg + "|" + s.bodyClass; if (k !== prev) { uniq.push(s); prev = k; } }
    return { final: { scheme: el.getAttribute("data-mantine-color-scheme"), htmlClass: el.className, bodyClass: b.className,
        bodyBg: cs.backgroundColor, bodyColor: cs.color, textColorVar: cs.getPropertyValue("--text-color").trim(),
        bgColorVar: cs.getPropertyValue("--bg-color").trim(), panelBg: cs.getPropertyValue("--panel-bg").trim(),
        fontSize: cs.fontSize, mqDark: matchMedia("(prefers-color-scheme: dark)").matches },
      distinctStates: uniq.map((s) => ({ t: s.t, tag: s.tag, scheme: s.scheme, bodyBg: s.bodyBg, bodyClass: (s.bodyClass || "").slice(0, 40), textColorVar: s.textColorVar })),
      mutationCount: T.mutations.length,
      mutations: T.mutations.slice(0, 12),
      totalSamples: T.samples.length };
  });
  console.log("\n===== " + label + " =====");
  console.log(JSON.stringify(res, null, 1).slice(0, 4200));
  return res;
};

const results = {};
results.auto = await cycle("AUTO（清空 storage）", async () => {
  await page.evaluate(() => { localStorage.removeItem("mantine-color-scheme-value"); document.cookie = "mantine-color-scheme-value=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"; });
});
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-auto.png" });

results.dark = await cycle("DARK（cookie+localStorage=dark）", async () => {
  await page.evaluate(() => { document.cookie = "mantine-color-scheme-value=dark; path=/"; localStorage.setItem("mantine-color-scheme-value", "dark"); });
});
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-dark.png" });

results.light = await cycle("LIGHT（cookie+localStorage=light）", async () => {
  await page.evaluate(() => { document.cookie = "mantine-color-scheme-value=light; path=/"; localStorage.setItem("mantine-color-scheme-value", "light"); });
});
await page.screenshot({ path: "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-light.png" });

const fs = await import("node:fs/promises");
await fs.writeFile("D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/theme-cycle-raw.json", JSON.stringify(results, null, 2), "utf8");
console.log("\nBEFORE-CLOSING:", JSON.stringify(before));
