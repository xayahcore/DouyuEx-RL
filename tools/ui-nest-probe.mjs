/** ui-nest-probe.mjs —— S0.5 关层实验（ego-browser）
 *
 * 对每个面板，依次在真机 DOM 上剥离嵌套层，抓快照 + 截图：
 *   base      不动（同会话对照）
 *   noBody    去掉 .miuix-modal__body 这一层（改名 → 其上的 CSS 全部失效）
 *   noShell   去掉 .miuix-modal 外壳类 + 注入的标题栏
 *   noCard    去掉卡片/子项类名（fans-panel__card / popup-panel__card / sign-option-item …）
 *   all       三者一起关
 * 每次剥离后 restore，保证下一模式量的是原始 DOM。
 *
 * 参数：docs/ui-migration/_probe.json  { "viewports": "1625x763", "panels": "sign,extool" }
 * 产出：docs/ui-migration/nest/<panel>/<mode>.json + <mode>.png
 */
import fs from "node:fs/promises";

const ROOT = "D:/DouyuEx-RL";
const OUT = ROOT + "/docs/ui-migration/nest";
let CFG = {};
try { CFG = JSON.parse(await fs.readFile(ROOT + "/docs/ui-migration/_probe.json", "utf8")); } catch (e) {}
const VPS = String(CFG.viewports || "1625x763").split(",").map((s) => { const [w, h] = s.split("x").map(Number); return { w, h }; });
const ONLY = CFG.panels || "";

const PANELS = [
  { key: "sign", sel: ".sign-panel", tile: "ex-sign" },
  { key: "fans-continue", sel: ".fans-continue-panel", tile: "fans-continue" },
  { key: "extool", sel: ".extool", tile: "extool-icon" },
  { key: "livetool", sel: ".livetool", tile: "livetool-icon" },
  { key: "bloop", sel: ".bloop", tile: "bloop-icon" },
  { key: "exlottery", sel: ".exlottery", tile: "ex-lottery" },
  { key: "popup", sel: ".popup-player-panel", tile: "popup-player" },
  { key: "exupdate", sel: ".exupdate-panel", tile: "ex-update" },
].filter((p) => !ONLY || ONLY.split(",").map((x) => x.trim()).includes(p.key));

const MODES = ["base", "noBody", "noShell", "noCard", "all"];

const shim = await fs.readFile(ROOT + "/.zcode/ego-inject/gm-shim.js", "utf8");
const bundle = await fs.readFile(ROOT + "/DouyuEx_RL.user.js", "utf8");
const source = "try{\n" + shim + "\n;\n" + bundle + "\n}catch(e){window.__DX_INJECT_ERR=String((e&&e.stack)||e);}\n";

const COLLECT = (args) => {
  const [sel, mode] = args;
  const root = document.querySelector(sel);
  if (!root) return { found: false, mode };
  const pathOf = (el) => {
    const parts = [];
    let n = el;
    while (n && n !== root.parentElement) {
      let idx = 1, sib = n;
      while ((sib = sib.previousElementSibling)) idx++;
      parts.unshift(String(idx));
      n = n.parentElement;
    }
    return parts.join(">");
  };
  const rr = root.getBoundingClientRect();
  const out = [];
  const vis = [];
  for (const el of root.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.opacity === "0") continue;
    const rec = { p: pathOf(el), tag: el.tagName.toLowerCase(), cls: (el.getAttribute("class") || "").trim(),
      rect: [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10],
      bg: s.backgroundColor, font: s.fontSize + "/" + s.lineHeight + "/" + s.fontWeight, color: s.color,
      overflow: s.overflow, scrollH: el.scrollHeight, clientH: el.clientHeight };
    out.push(rec);
    if (Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) vis.push(rec);
  }
  return { found: true, mode, rootRect: [Math.round(rr.x), Math.round(rr.y), Math.round(rr.width), Math.round(rr.height)],
    rootCls: root.className, items: out, textItems: vis.map((v) => v.p) };
};

async function run() {
  await fs.mkdir(OUT, { recursive: true });
  const task = await taskSpace("dyex-nest-probe");
  console.log("[space] " + task.spaceId);
  const tab = (await task.tabs()).find((t) => t.active);
  const page = (tab && tab.page) || (await task.newPage());
  await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source });

  for (const vp of VPS) {
    await page.cdp("Emulation.setDeviceMetricsOverride", { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: false });
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
    console.log("[boot " + vp.w + "] " + boot);
    if (boot !== "ready") throw new Error("not ready");
    await page.evaluate(() => {
      const d = document.querySelector(".ex-panel");
      if (d) { d.classList.remove("miuix-dock-out"); d.style.setProperty("display", "flex", "important"); }
      if (!document.getElementById("__dx_freeze")) {
        const st = document.createElement("style"); st.id = "__dx_freeze";
        st.textContent = "*{animation:none!important;transition:none!important}";
        document.head.appendChild(st);
      }
    });
    await page.waitForTimeout(400);

    for (const p of PANELS) {
      const dir = OUT + "/" + p.key;
      await fs.mkdir(dir, { recursive: true });
      // 打开面板（悬停优先，失败点击）
      const opened = await page.evaluate((arg) => new Promise((res) => {
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
      let opened2 = opened;
      if (opened2 !== "open") {
        const t = await page.evaluate((cls) => {
          const tile = document.querySelector(".ex-panel__wrap > div." + cls);
          if (!tile) return null;
          const r = tile.getBoundingClientRect();
          return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)];
        }, p.tile);
        if (t) await page.mouse.click(t[0], t[1]);
        opened2 = await page.evaluate((arg) => new Promise((res) => {
          const t0 = Date.now();
          const tick = () => {
            const el = document.querySelector(arg.sel);
            if (el && el.offsetWidth > 0) { res("open"); return; }
            if (Date.now() - t0 > 8000) { res("fail"); return; }
            setTimeout(tick, 200);
          };
          tick();
        }), p);
      }
      if (opened2 !== "open") { console.log("[panel] " + p.key + " open-fail"); continue; }
      await page.waitForTimeout(250);

      for (const mode of MODES) {
        // 每个模式前先恢复原始 DOM
        await page.evaluate(() => {
          if (window.__dxRestore) {
            for (let i = window.__dxRestore.length - 1; i >= 0; i--) {
              const [el, cls] = window.__dxRestore[i];
              try { el.className = cls; } catch (e) {}
            }
          }
          window.__dxRestore = [];
        });
        await page.evaluate((arg) => {
          const [sel, mode] = arg;
          const root = document.querySelector(sel);
          if (!root) return;
          const off = (el, cls) => { window.__dxRestore.push([el, el.className]); el.className = cls; };
          if (mode === "noBody" || mode === "all") {
            root.querySelectorAll(".miuix-modal__body").forEach((el) => off(el, "__dx_off_body"));
          }
          if (mode === "noShell" || mode === "all") {
            off(root, root.className.replace(/\bmiuix-modal\b/g, "").trim() + " __dx_off_shell");
            root.querySelectorAll(":scope > .miuix-modal__header").forEach((el) => { el.style.display = "none"; });
          }
          if (mode === "noCard" || mode === "all") {
            ["fans-panel__card", "popup-panel__card", "exupdate-panel__card", "sign-option-item", "bloop__param_item", "livetool__cell"].forEach((c) => {
              root.querySelectorAll("." + c).forEach((el) => off(el, el.className.replace(new RegExp("\\b" + c + "\\b", "g"), "").trim() + " __dx_off_" + c.replace(/[^a-z]/g, "")));
            });
          }
          // 强制重排
          void root.offsetWidth;
        }, [p.sel, mode]);
        await page.waitForTimeout(160);
        const snap = await page.evaluate(COLLECT, [p.sel, mode]);
        await fs.writeFile(dir + "/" + mode + ".json", JSON.stringify(snap));
        await page.screenshot({ path: dir + "/" + mode + "-" + vp.w + ".png" });
        console.log("[nest] " + p.key + "/" + mode + " root=" + JSON.stringify(snap.rootRect) + " els=" + ((snap.items || []).length));
      }
      // 关掉面板，避免影响下一块
      await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.style.setProperty("display", "none", "important"); }, p.sel);
    }
  }
  try { await task.finish({ keep: [] }); } catch (e) {}
}
await run();
console.log("[done] " + OUT);
