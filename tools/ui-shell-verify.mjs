/** ui-shell-verify.mjs —— S1-B 外壳批真机验证（ego）
 *  输出 docs/ui-migration/_shell-verify.json 并打印结论
 */
import fs from "node:fs/promises";
const ROOT = "D:/DouyuEx-RL";
const shim = await fs.readFile(ROOT + "/.zcode/ego-inject/gm-shim.js", "utf8");
const bundle = await fs.readFile(ROOT + "/DouyuEx_RL.user.js", "utf8");
const source = "try{\n" + shim + "\n;\n" + bundle + "\n}catch(e){window.__DX_INJECT_ERR=String((e&&e.stack)||e);}\n";

const PANELS = [
  { key: "sign", sel: ".sign-panel", tile: "ex-sign" },
  { key: "fans-continue", sel: ".fans-continue-panel", tile: "fans-continue" },
  { key: "extool", sel: ".extool", tile: "extool-icon" },
  { key: "livetool", sel: ".livetool", tile: "livetool-icon" },
  { key: "bloop", sel: ".bloop", tile: "bloop-icon" },
  { key: "exlottery", sel: ".exlottery", tile: "ex-lottery" },
  { key: "popup", sel: ".popup-player-panel", tile: "popup-player" },
  { key: "exupdate", sel: ".exupdate-panel", tile: "ex-update" },
];

const task = await taskSpace("dyex-shell-verify");
const tab = (await task.tabs()).find((t) => t.active);
const page = (tab && tab.page) || (await task.newPage());
await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source });
await page.cdp("Emulation.setDeviceMetricsOverride", { width: 1625, height: 763, deviceScaleFactor: 1, mobile: false });
await page.goto("https://www.douyu.com/9999", { waitUntil: "domcontentloaded" });
await page.evaluate(() => document.querySelectorAll("video,audio").forEach((v) => { try { v.muted = true; v.volume = 0; } catch (e) {} }));
const boot = await page.evaluate(() => new Promise((res) => {
  const t0 = Date.now();
  const tick = () => {
    if (window.__DX_INJECT_ERR) { res("inject-error"); return; }
    if (document.querySelectorAll(".ex-panel__wrap > div").length >= 8) { res("ready"); return; }
    if (Date.now() - t0 > 75000) { res("timeout"); return; }
    setTimeout(tick, 250);
  };
  tick();
}));
console.log("[boot] " + boot);

const report = { boot, tiles: [], keyboard: {}, esc: {}, closeHit: null, sprite: null };

// 打开 Dock（真实鼠标点精灵球）
const icons = await page.evaluate(() => Array.from(document.querySelectorAll(".ex-icon")).map((el) => {
  const r = el.getBoundingClientRect();
  return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)];
}).filter((r) => r[0] > 0));
let opened = false;
for (const [x, y] of icons) {
  await page.mouse.click(x, y);
  await page.waitForTimeout(450);
  opened = await page.evaluate(() => {
    const d = document.querySelector(".ex-panel");
    return !!d && getComputedStyle(d).display !== "none" && d.getBoundingClientRect().width > 100;
  });
  if (opened) break;
}
if (!opened) {
  await page.evaluate(() => {
    const d = document.querySelector(".ex-panel");
    if (d) { d.classList.remove("miuix-dock-out"); d.style.setProperty("display", "flex", "important"); }
  });
  await page.waitForTimeout(300);
}
await page.evaluate(() => {
  const st = document.createElement("style");
  st.textContent = "*{animation:none!important;transition:none!important}";
  document.head.appendChild(st);
});
// 等一拍：磁贴语义由 MutationObserver 去抖补齐
await page.waitForTimeout(800);

// 1) 磁贴语义
report.tiles = await page.evaluate(() => {
  const wrap = document.querySelector(".ex-panel__wrap");
  return Array.from(wrap.querySelectorAll(":scope > div")).filter((t) => t.getBoundingClientRect().width > 0).map((t) => ({
    cls: t.className.trim(),
    role: t.getAttribute("role"),
    tabindex: t.getAttribute("tabindex"),
    aria: t.getAttribute("aria-label"),
    title: t.getAttribute("title"),
  }));
});

// 2) 精灵球语义
report.sprite = await page.evaluate(() => {
  const a = document.querySelector(".ex-icon a");
  if (!a) return null;
  return { tag: a.tagName, href: a.getAttribute("href"), role: a.getAttribute("role"), tabindex: a.getAttribute("tabindex"), aria: a.getAttribute("aria-label") };
});

// 3) 关闭钮 44 命中区
report.closeHit = await page.evaluate(() => {
  const b = document.querySelector(".ex-panel__close");
  if (!b) return null;
  const r = b.getBoundingClientRect();
  const a = getComputedStyle(b, "::after");
  return { visual: [Math.round(r.width), Math.round(r.height)], afterInset: a.inset || a.top, afterContent: a.content };
});

// 4) 键盘：Tab 进入磁贴并检查焦点环
await page.evaluate(() => document.body.focus());
let focused = null;
for (let i = 0; i < 40; i++) {
  await page.keyboard.press("Tab");
  focused = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const inDock = !!el.closest(".ex-panel__wrap");
    const s = getComputedStyle(el);
    return { tag: el.tagName, cls: (el.className || "").toString().trim(), inDock, outlineW: s.outlineWidth, outlineStyle: s.outlineStyle, outlineColor: s.outlineColor };
  });
  if (focused && focused.inDock) break;
}
report.keyboard.tabIntoDock = focused;

// 5) 键盘 Enter 打开面板
if (focused && focused.inDock) {
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  report.keyboard.enterOpened = await page.evaluate(() => {
    const open = Array.from(document.querySelectorAll(".miuix-modal")).filter((m) => m.offsetWidth > 0).map((m) => m.className);
    return open;
  });
}

// 6) ESC 逐面板关闭
for (const p of PANELS) {
  const r = { open: false, closed: false };
  await page.evaluate(() => document.querySelectorAll(".miuix-modal").forEach((m) => { m.style.display = "none"; }));
  const ok = await page.evaluate((arg) => new Promise((res) => {
    const tile = document.querySelector(".ex-panel__wrap > div." + arg.tile);
    if (!tile) { res("no-tile"); return; }
    tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    const t0 = Date.now();
    const tick = () => {
      const el = document.querySelector(arg.sel);
      if (el && el.offsetWidth > 0) { res("open"); return; }
      if (Date.now() - t0 > 3000) { res("fail"); return; }
      setTimeout(tick, 150);
    };
    tick();
  }), p);
  r.open = ok === "open";
  if (!r.open) {
    const t = await page.evaluate((cls) => {
      const tile = document.querySelector(".ex-panel__wrap > div." + cls);
      if (!tile) return null;
      const b = tile.getBoundingClientRect();
      return [Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2)];
    }, p.tile);
    if (t) { await page.mouse.click(t[0], t[1]); await page.waitForTimeout(600); }
    r.open = await page.evaluate((sel) => { const el = document.querySelector(sel); return !!el && el.offsetWidth > 0; }, p.sel);
  }
  if (r.open) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    r.closed = await page.evaluate((sel) => { const el = document.querySelector(sel); return !el || el.offsetWidth === 0; }, p.sel);
  }
  report.esc[p.key] = r;
  console.log("[esc] " + p.key + " open=" + r.open + " closed=" + r.closed);
}

await fs.writeFile(ROOT + "/docs/ui-migration/_shell-verify.json", JSON.stringify(report, null, 1));
console.log("\n=== 汇总 ===");
console.log("磁贴 " + report.tiles.length + " 枚；带 role " + report.tiles.filter((t) => t.role).length + "；带 tabindex " + report.tiles.filter((t) => t.tabindex === "0").length + "；带 aria-label " + report.tiles.filter((t) => t.aria).length);
console.log("精灵球: " + JSON.stringify(report.sprite));
console.log("关闭钮命中: " + JSON.stringify(report.closeHit));
console.log("Tab 入 Dock: " + JSON.stringify(report.keyboard.tabIntoDock));
console.log("Enter 打开: " + JSON.stringify(report.keyboard.enterOpened));
const escOk = Object.values(report.esc).filter((v) => v.open && v.closed).length;
console.log("ESC 通过: " + escOk + "/" + PANELS.length);
try { await task.finish({ keep: [] }); } catch (e) {}
