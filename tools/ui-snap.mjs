
/* 2026-11-05：page.screenshot 的默认 CDP 超时偏短 —— 直播页（视频 + 半透明面板）偶发 5~15s 才合成完，
   超过阈值就抛 "CDP request timed out: Page.captureScreenshot"，看起来像浏览器崩了。
   改为直连 CDP 并显式给 60s 超时，稳定出图。 */
async function shot(page, file) {
  const res = await page.cdp('Page.captureScreenshot', { format: 'png' }, { timeout: 60000 });
  const data = res && (res.data || (res.result && res.result.data));
  if (!data) throw new Error('captureScreenshot returned no data');
  await fs.writeFile(file, Buffer.from(data, 'base64'));
}
/** ui-snap.mjs —— UI 迁移基线采集器（ego-browser）
 * 参数走环境变量：DX_OUT / DX_VIEWPORTS / DX_ROOM / DX_ONLY（ego-cli 只接受一个 source 参数）
 * 产出 docs/ui-migration/<out>/<panel>/snapshot-<vp>.json + panel-<vp>.png */
import fs from "node:fs/promises";
const ROOT = "D:/DouyuEx-RL";
const OUT_ROOT = ROOT + "/docs/ui-migration";
// 参数来源：docs/ui-migration/_run.json（ego-cli 不透传环境变量，实测）
let RUN = {};
try { RUN = JSON.parse(await fs.readFile(OUT_ROOT + "/_run.json", "utf8")); } catch (e) {}
const argOf = (n, d) => (RUN[n] !== undefined ? String(RUN[n]) : (process.env["DX_" + n.toUpperCase()] || d));
const OUT = argOf("out", "baseline");
const ONLY = argOf("only", "");
const ROOM = argOf("room", "https://www.douyu.com/9999");
const VPS = argOf("viewports", "1625x763").split(",").map((s) => { const [w, h] = s.split("x").map(Number); return { w, h }; });
const ENV = [];
const PANELS = [
  { key: "sign", sel: ".sign-panel", tile: "ex-sign" },
  { key: "fans-continue", sel: ".fans-continue-panel", tile: "fans-continue" },
  { key: "extool", sel: ".extool", tile: "extool-icon" },
  { key: "livetool", sel: ".livetool", tile: "livetool-icon" },
  { key: "bloop", sel: ".bloop", tile: "bloop-icon" },
  { key: "exlottery", sel: ".exlottery", tile: "ex-lottery" },
  { key: "popup", sel: ".popup-player-panel", tile: "popup-player" },
  { key: "exupdate", sel: ".exupdate-panel", tile: "ex-update" },
].filter((p) => !ONLY || ONLY.split(",").includes(p.key));
const shim = await fs.readFile(ROOT + "/.zcode/ego-inject/gm-shim.js", "utf8");
const bundle = await fs.readFile(ROOT + "/DouyuEx_RL.user.js", "utf8");
const source = "try{\n" + shim + "\n;\n" + bundle + "\n}catch(e){window.__DX_INJECT_ERR=String((e&&e.stack)||e);}\n";
console.log("[fp] bytes=" + bundle.length + " version=" + ((bundle.match(/@version\s+(\S+)/) || [])[1] || "?"));

const COLLECT = (sel) => {
  // 页面可能同时存在「本构建」与「环境里常驻的旧版」两份；本构建总在 DOM 后面，取最后一个
  var all = document.querySelectorAll(sel);
  var matchCount = all.length;
  // 环境里可能常驻一份旧版插件：只认「当前可见（刚被我们打开）」的那一份，避免抓到常驻副本
  // 只认带本构建指纹（--dx-build）的那一份；没有指纹时才退回「可见的那一份」
  var mine = [];
  for (var mi = 0; mi < all.length; mi++) {
    var mark = getComputedStyle(all[mi]).getPropertyValue("--dx-build").trim();
    if (mark) mine.push(all[mi]);
  }
  var visible = mine.length ? mine : (function () { var v = []; for (var vi = 0; vi < all.length; vi++) { if (all[vi].offsetWidth > 0) v.push(all[vi]); } return v; })();
  const root = visible.length ? visible[visible.length - 1] : (all.length ? all[all.length - 1] : null);
  if (!root) return { found: false };
  if (root.offsetWidth === 0) return { found: true, visible: false };
  const pathOf = (el) => {
    const parts = []; let n = el;
    while (n && n !== root) {
      let idx = 1, sib = n;
      while ((sib = sib.previousElementSibling)) idx++;
      parts.unshift(String(idx)); n = n.parentElement;
    }
    return parts.join(">");
  };
  const styleOf = (e) => {
    const s = getComputedStyle(e);
    return {
      bg: s.backgroundColor, color: s.color,
      border: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].join("/") + "|" + s.borderTopColor,
      radius: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].join(" "),
      font: s.fontSize + "/" + s.lineHeight + "/" + s.fontWeight,
      shadow: s.boxShadow, z: s.zIndex, display: s.display, pos: s.position,
    };
  };
  const items = [];
  for (const el of root.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.opacity === "0") continue;
    const ownText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    items.push({ p: pathOf(el), tag: el.tagName.toLowerCase(), cls: (el.getAttribute("class") || "").trim(), id: el.id || "",
      rect: [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10],
      text: ownText ? el.textContent.trim().replace(/\s+/g, " ").slice(0, 40) : "", ...styleOf(el) });
    if (items.length >= 1500) break;
  }
  const rr = root.getBoundingClientRect();
  return { found: true, visible: true, count: items.length, matches: matchCount,
    root: { cls: root.className, rect: [Math.round(rr.x), Math.round(rr.y), Math.round(rr.width), Math.round(rr.height)], ...styleOf(root) }, items };
};

async function run() {
  await fs.mkdir(OUT_ROOT + "/" + OUT, { recursive: true });
  const task = await taskSpace("dyex-ui-" + OUT);
  console.log("[space] " + task.spaceId);
  const page = await task.newPage();   // 全新标签页：不继承任何历史 addScript 注册
  await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source });

  for (const vp of VPS) {
    await page.cdp("Emulation.setDeviceMetricsOverride", { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: false });
    await page.goto(ROOM, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.querySelectorAll("video,audio").forEach((v) => { try { v.muted = true; v.volume = 0; v.pause && v.pause(); } catch (e) {} }));
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
    if (boot !== "ready") throw new Error("plugin not ready: " + boot);

    // ===== 清场：删掉「非本构建」的面板实例（ego profile 里常驻旧版）=====
    // 本构建的磁贴带 data-dx-a11y，据此认领我们自己的 Dock；其它 .ex-panel 与全部 .miuix-modal 先清掉，
    // 否则抓到的可能是常驻旧版（它有另一套 CSS，会把结论带偏）。
    await page.evaluate(() => {
      document.querySelectorAll(".ex-panel").forEach((d) => { if (!d.dataset.dxBuild) d.remove(); });
      // 面板两套实例都清掉：随后点磁贴时本构建会按需重建自己的那一份
      document.querySelectorAll(".miuix-modal").forEach((m) => { if (!m.dataset.dxBuild) m.remove(); });
    });
    await page.waitForTimeout(200);
    // 等磁贴打上本构建的语义标记（MutationObserver 去抖后才会有），否则点不到自己的 Dock
    await page.evaluate(() => new Promise((res) => {
      const t0 = Date.now();
      const tick = () => {
        if (document.querySelector(".ex-panel__wrap > div[data-dx-a11y]")) { res(1); return; }
        if (Date.now() - t0 > 8000) { res(0); return; }
        setTimeout(tick, 120);
      };
      tick();
    }));
    // ===== 环境隔离检查 =====
    // ego profile 里可能常驻一份旧版插件（实测：不注入任何东西时页面已有 1 个 .ex-panel）。
    // 本工具用 data-dx-a11y 认出「本构建」的磁贴，并在输出里记录污染计数。
    const env = await page.evaluate(() => {
      const wraps = Array.from(document.querySelectorAll(".ex-panel__wrap"));
      const ours = wraps.filter((w) => w.closest(".ex-panel") && w.closest(".ex-panel").dataset.dxBuild);
      return { wraps: wraps.length, ours: ours.length, icons: document.querySelectorAll(".ex-icon").length,
        a11yTiles: document.querySelectorAll(".ex-panel__wrap > div[data-dx-a11y]").length };
    });
    console.log("[env] wraps=" + env.wraps + " ours=" + env.ours + " icons=" + env.icons + " a11yTiles=" + env.a11yTiles + (env.wraps > 1 ? "  ← 环境里有第二份实例（常驻旧版），绝对计数会偏大，差分结论不受影响" : ""));
    ENV.push(env);
    const icons = await page.evaluate(() => Array.from(document.querySelectorAll(".ex-icon")).map((el) => {
      const r = el.getBoundingClientRect(); return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)];
    }).filter((r) => r[0] > 0));
    let dockOpen = false;
    for (const [x, y] of icons) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(500);
      dockOpen = await page.evaluate(() => {
        const d = document.querySelector(".ex-panel");
        return !!d && getComputedStyle(d).display !== "none" && d.getBoundingClientRect().width > 100;
      });
      if (dockOpen) break;
    }
    if (!dockOpen) {
      // 兜底：直接把胶囊置为展开（基线采集只关心几何，不依赖入口动画）
      dockOpen = await page.evaluate(() => {
        const d = document.querySelector(".ex-panel");
        if (!d) return false;
        d.classList.remove("miuix-dock-out");
        d.style.setProperty("display", "flex", "important");
        return true;
      });
      await page.waitForTimeout(400);
      console.log("[dock] forced visible");
    }
    await page.evaluate(() => {
      if (document.getElementById("__dx_freeze")) return;
      const st = document.createElement("style"); st.id = "__dx_freeze";
      st.textContent = "*{animation:none!important;transition:none!important}";
      document.head.appendChild(st);
      // 背景归一化：隐藏视频/画布并把页面底色钉成常量，否则半透明玻璃下是直播画面，像素比对永远失败
      const bg = document.createElement("style"); bg.id = "__dx_bg";
      bg.textContent = "video,canvas,iframe{visibility:hidden!important}html{background:#1f2430!important}";
      document.head.appendChild(bg);
    });
    await page.waitForTimeout(300);

    const dockDir = OUT_ROOT + "/" + OUT + "/_dock";
    await fs.mkdir(dockDir, { recursive: true });
    await shot(page, dockDir + "/dock-" + vp.w + ".png");
    const dockInfo = await page.evaluate(() => {
      const d = document.querySelector(".ex-panel"); const r = d.getBoundingClientRect();
      return { rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
        tiles: Array.from(document.querySelectorAll(".ex-panel__wrap > div")).map((t) => {
          const tr = t.getBoundingClientRect();
          return { cls: t.className.trim(), rect: [Math.round(tr.x), Math.round(tr.y), Math.round(tr.width), Math.round(tr.height)],
            role: t.getAttribute("role"), tabindex: t.getAttribute("tabindex"), aria: t.getAttribute("aria-label") };
        }) };
    });
    await fs.writeFile(dockDir + "/dock-" + vp.w + ".json", JSON.stringify({ ...dockInfo, env: env }, null, 1));
    console.log("[dock] " + JSON.stringify(dockInfo.rect) + " tiles=" + dockInfo.tiles.length + " withRole=" + dockInfo.tiles.filter((t) => t.role).length);

    for (const p of PANELS) {
      const dir = OUT_ROOT + "/" + OUT + "/" + p.key;
      await fs.mkdir(dir, { recursive: true });
      const rec = { panel: p.key, sel: p.sel, tile: p.tile, vp };
      try {
        await page.evaluate(() => document.querySelectorAll(".miuix-modal").forEach((m) => { m.style.display = "none"; }));
        const OUR = "(:scope > div[data-dx-a11y])";
        let opened = await page.evaluate((arg) => new Promise((res) => {
          const wraps = Array.from(document.querySelectorAll(".ex-panel__wrap"));
          const ourWrap = wraps.find((w) => w.closest(".ex-panel") && w.closest(".ex-panel").dataset.dxBuild) || null;
          const tile = ourWrap ? ourWrap.querySelector(":scope > div." + arg.tile) : null;
          if (!tile) { res("no-tile"); return; }
          tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
          tile.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
          const t0 = Date.now();
          const tick = () => {
            const el = document.querySelector(arg.sel);
            if (el && el.offsetWidth > 0) { res("hover"); return; }
            if (Date.now() - t0 > 2500) { res("no-hover"); return; }
            setTimeout(tick, 150);
          };
          tick();
        }), p);
        if (opened !== "hover") {
          const t = await page.evaluate((cls) => {
            const wraps = Array.from(document.querySelectorAll(".ex-panel__wrap"));
            const ourWrap = wraps.find((w) => w.closest(".ex-panel") && w.closest(".ex-panel").dataset.dxBuild) || null;
            const tile = ourWrap ? ourWrap.querySelector(":scope > div." + cls) : null;
            if (!tile) return null;
            const r = tile.getBoundingClientRect();
            return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)];
          }, p.tile);
          if (t) await page.mouse.click(t[0], t[1]);
          opened = await page.evaluate((arg) => new Promise((res) => {
            const t0 = Date.now();
            const tick = () => {
              const el = document.querySelector(arg.sel);
              if (el && el.offsetWidth > 0) { res("click"); return; }
              if (Date.now() - t0 > 8000) { res("fail"); return; }
              setTimeout(tick, 200);
            };
            tick();
          }), p);
        }
        rec.openedBy = opened;
        if (opened === "fail" || opened === "no-tile") throw new Error("open failed: " + opened);
        // 打开的可能仍是常驻旧版的面板（showExRightPanel 按全局选择器找）：确认指纹，不是自己的就删掉重开
        for (let attempt = 0; attempt < 3; attempt++) {
          const mine = await page.evaluate((arg) => {
            const all = Array.from(document.querySelectorAll(arg.sel));
            const ours = all.filter((el) => getComputedStyle(el).getPropertyValue("--dx-build").trim());
            if (ours.length) return { ok: true, foreign: all.filter((el) => !ours.includes(el)).length };
            all.forEach((el) => el.remove());
            const wraps = Array.from(document.querySelectorAll(".ex-panel__wrap"));
            const ourWrap = wraps.find((w) => w.closest(".ex-panel") && w.closest(".ex-panel").dataset.dxBuild) || null;
            const tile = ourWrap ? ourWrap.querySelector(":scope > div." + arg.tile) : null;
            if (tile) { tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true })); tile.click(); }
            return { ok: false, foreign: all.length };
          }, p);
          if (mine.ok) break;
          await page.waitForTimeout(700);
        }
        await page.waitForTimeout(400);
        await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.scrollTop = 0; }, p.sel);
        rec.snap = await page.evaluate(COLLECT, p.sel);
        await shot(page, dir + "/panel-" + vp.w + ".png");
        console.log("[panel] " + p.key + " via=" + opened + " els=" + (rec.snap && rec.snap.count) + " rect=" + JSON.stringify(rec.snap && rec.snap.root && rec.snap.root.rect));
      } catch (e) {
        rec.error = String((e && e.message) || e);
        console.log("[panel] " + p.key + " FAILED: " + rec.error);
      }
      await fs.writeFile(dir + "/snapshot-" + vp.w + ".json", JSON.stringify(rec, null, 1));
    }
  }
  try { await task.finish({ keep: [] }); } catch (e) {}
}
await run();
console.log("[done]");
