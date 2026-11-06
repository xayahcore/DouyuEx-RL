
import fs from "node:fs/promises";
import zlib from "node:zlib";
const OUT = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live";
function decodePng(buf) {
  let pos = 8, w = 0, h = 0, colorType = 6; const idat = [];
  while (pos < buf.length) { const len = buf.readUInt32BE(pos); const type = buf.toString("ascii", pos + 4, pos + 8); const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9]; } else if (type === "IDAT") idat.push(data); else if (type === "IEND") break; pos += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)); const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : 0; if (!ch) return null;
  const stride = w * ch, out = Buffer.alloc(h * stride); let p = 0;
  for (let y = 0; y < h; y++) { const f = raw[p++]; const line = raw.subarray(p, p + stride); p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride); const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) { const a = x >= ch ? cur[x - ch] : 0, b = prev ? prev[x] : 0, c = (prev && x >= ch) ? prev[x - ch] : 0;
      let v = line[x]; if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += ((a + b) >> 1);
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); } cur[x] = v & 255; } }
  return { w, h, ch, data: out };
}
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2)); };
const hex = (c) => "#" + c.slice(0, 3).map((v) => v.toString(16).padStart(2, "0")).join("");
const task = await taskSpace("dyex-icon-ego");
const tab = (await task.tabs()).find((t) => t.active) || (await task.tabs())[0];
const page = tab.page;
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.evaluate(() => { document.querySelectorAll(".miuix-modal__close").forEach((b) => b.click()); });
await page.waitForTimeout(300);
if (await page.evaluate(() => { const d = document.querySelector(".ex-panel"); return !d || getComputedStyle(d).display === "none"; })) { await page.evaluate(() => { const a = document.querySelector(".ex-icon a"); a && a.click(); }); await page.waitForTimeout(800); }
await page.evaluate(() => { const t = document.querySelectorAll(".ex-panel__wrap > div")[3]; t.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false })); });
await page.waitForTimeout(900);
await page.mouse.move(5, 5);
await page.waitForTimeout(500);

const sample = async (tag, rect) => {
  const x = Math.max(0, Math.round(rect.x)), y = Math.max(0, Math.round(rect.y)), w = Math.max(1, Math.round(rect.w)), h = Math.max(1, Math.round(rect.h));
  const r = await page.cdp("Page.captureScreenshot", { format: "png", clip: { x, y, width: w, height: h, scale: 1 }, captureBeyondViewport: false });
  const img = decodePng(Buffer.from(r.data, "base64")); if (!img) return { tag, error: "decode" };
  const px = []; const counts = new Map();
  for (let i = 0; i < img.w * img.h; i++) { const o = i * img.ch; const c = [img.data[o], img.data[o + 1], img.data[o + 2]]; px.push(c); const k = c.join(","); counts.set(k, (counts.get(k) || 0) + 1); }
  const sorted = px.slice().sort((a, b) => lum(a) - lum(b));
  const mode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].split(",").map(Number);
  return { tag, rect: { x, y, w, h }, bgMode: hex(mode), darkest: hex(sorted[0]), p05: hex(sorted[Math.floor(px.length * 0.05)]), lightest: hex(sorted[sorted.length - 1]) };
};
const geo = await page.evaluate(() => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const tiles = Array.from(document.querySelectorAll(".ex-panel__wrap > div"));
  const sw = document.querySelector(".extool #extool__highestvideoquality"); // 开
  const swOff = document.querySelector(".extool #extool__autobarragecolor"); // 关
  const item = sw && sw.closest(".sign-option-item");
  return { tile0: R(tiles[0]), tile0Icon: R(tiles[0].querySelector(".ex-ico--line")), tile3: R(tiles[3]), tile3Icon: R(tiles[3].querySelector(".ex-ico--fill")),
    dockClose: R(document.querySelector(".ex-panel__close")), swOn: R(sw), swOff: R(swOff), item: R(item),
    panelClose: R(document.querySelector(".extool .miuix-modal__close")), header: R(document.querySelector(".extool .miuix-modal__header")), body: R(document.querySelector(".extool .miuix-modal__body")) };
});
const S = [];
S.push(await sample("dock tile(normal) 图标区域", geo.tile0Icon));
S.push(await sample("dock tile(选中) 图标区域", geo.tile3Icon));
S.push(await sample("switch ON 左侧轨道", { x: geo.swOn.x + 3, y: geo.swOn.y + 6, w: 6, h: 10 }));
S.push(await sample("switch OFF 右侧轨道", { x: geo.swOff.x + 27, y: geo.swOff.y + 6, w: 8, h: 10 }));
S.push(await sample("switch ON 旋钮", { x: geo.swOn.x + 21, y: geo.swOn.y + 6, w: 10, h: 10 }));
S.push(await sample("switch OFF 旋钮", { x: geo.swOff.x + 5, y: geo.swOff.y + 6, w: 10, h: 10 }));
S.push(await sample("条目底(item) 空白", { x: geo.item.x + geo.item.w - 70, y: geo.item.y + 6, w: 24, h: 8 }));
S.push(await sample("面板头底色", { x: geo.header.x + 8, y: geo.header.y + 6, w: 30, h: 8 }));
S.push(await sample("面板正文底色", { x: geo.body.x + 6, y: geo.body.y + 40, w: 12, h: 40 }));
S.push(await sample("面板关闭按钮 ×", geo.panelClose));
console.log("S2:", JSON.stringify(S, null, 1));
// 纯选中态（无 hover）Dock 裁图
const dr = await page.evaluate(() => { const d = document.querySelector(".ex-panel"); const r = d.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
const cr = await page.cdp("Page.captureScreenshot", { format: "png", clip: { x: Math.max(0, dr.x - 12), y: Math.max(0, dr.y - 12), width: dr.w + 24, height: dr.h + 24, scale: 3 }, captureBeyondViewport: false });
await fs.writeFile(OUT + "/dock-04-active-crop.png", Buffer.from(cr.data, "base64"));
await page.screenshot({ path: OUT + "/dock-05-active-full.png" });
await fs.writeFile(OUT + "/contrast-samples.json", JSON.stringify(S, null, 2), "utf8");
