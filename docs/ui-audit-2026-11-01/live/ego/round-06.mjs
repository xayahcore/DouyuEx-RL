
import fs from "node:fs/promises";
import zlib from "node:zlib";
const OUT = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live";

function decodePng(buf) {
  let pos = 8, w = 0, h = 0, bitDepth = 8, colorType = 6; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0;
  if (!ch || bitDepth !== 8) return null;
  const stride = w * ch, out = Buffer.alloc(h * stride); let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++]; const line = raw.subarray(p, p + stride); p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, b = prev ? prev[x] : 0, c = (prev && x >= ch) ? prev[x - ch] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += ((a + b) >> 1);
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[x] = v & 255;
    }
  }
  return { w, h, ch, data: out };
}
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2)); };
const hex = (c) => "#" + c.slice(0, 3).map((v) => v.toString(16).padStart(2, "0")).join("");

const task = await taskSpace("dyex-icon-ego");
const tab = (await task.tabs()).find((t) => t.active) || (await task.tabs())[0];
const page = tab.page;
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
await page.evaluate(() => { document.querySelectorAll(".miuix-modal__close").forEach((b) => b.click()); });
await page.waitForTimeout(400);

// 打开扩展功能面板（含 switch 开/关两态）
const t3 = await page.evaluate(() => { const t = document.querySelectorAll(".ex-panel__wrap > div")[3]; const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await page.mouse.move(20, 20); await page.waitForTimeout(100);
await page.mouse.move(t3.x, t3.y); await page.waitForTimeout(900);

const region = async (name, rect, pad = 0) => {
  const x = Math.max(0, Math.round(rect.x - pad)), y = Math.max(0, Math.round(rect.y - pad));
  const w = Math.max(1, Math.round(rect.width + pad * 2)), h = Math.max(1, Math.round(rect.height + pad * 2));
  const r = await page.cdp("Page.captureScreenshot", { format: "png", clip: { x, y, width: w, height: h, scale: 1 }, captureBeyondViewport: false });
  const img = decodePng(Buffer.from(r.data, "base64"));
  if (!img) return { name, error: "decode-fail" };
  const px = []; const counts = new Map();
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * img.ch; const c = [img.data[o], img.data[o + 1], img.data[o + 2]];
    px.push(c); const k = c.join(","); counts.set(k, (counts.get(k) || 0) + 1);
  }
  px.sort((a, b) => lum(a) - lum(b));
  const mode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].split(",").map(Number);
  const p05 = px[Math.min(px.length - 1, Math.floor(px.length * 0.05))];
  const p50 = px[Math.floor(px.length * 0.5)];
  const out = { name, rect: { x, y, w, h }, bgMode: hex(mode), p05Dark: hex(p05), median: hex(p50),
    ratio_mode_vs_p05: ratio(mode, p05), ratio_mode_vs_median: ratio(mode, p50) };
  return out;
};

const rects = await page.evaluate(() => {
  const g = (sel, root) => { const el = (root || document).querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
  const panel = document.querySelector(".extool");
  const card = panel && panel.querySelector(".miuix-modal__body > *");
  const cards = panel ? Array.from(panel.querySelectorAll("*")).filter((n) => /card/i.test(n.className)) : [];
  const sw = panel ? panel.querySelector("input[type=checkbox], .miuix-switch, [class*=switch]") : null;
  const swAll = panel ? Array.from(panel.querySelectorAll("*")).filter((n) => /switch/i.test(String(n.className))) : [];
  return {
    panel: g(".extool"),
    header: g(".extool .miuix-modal__header"),
    body: g(".extool .miuix-modal__body"),
    title: g(".extool .miuix-modal__title"),
    titleIcon: g(".extool .ex-title-ico"),
    cardClasses: cards.slice(0, 6).map((n) => n.className + " :: " + JSON.stringify({ w: n.getBoundingClientRect().width, h: n.getBoundingClientRect().height })),
    switchClasses: swAll.slice(0, 4).map((n) => n.className),
    textRects: Array.from(panel.querySelectorAll("*")).filter((n) => n.children.length === 0 && (n.textContent || "").trim().length > 1).slice(0, 10).map((n) => { const r = n.getBoundingClientRect(); return { t: n.textContent.trim().slice(0, 18), cls: String(n.className).slice(0, 30), x: r.x, y: r.y, w: r.width, h: r.height, fs: getComputedStyle(n).fontSize, color: getComputedStyle(n).color }; }),
    actionBar: Array.from(panel.querySelectorAll("*")).filter((n) => /action|footer|sticky/i.test(String(n.className))).slice(0, 4).map((n) => { const r = n.getBoundingClientRect(); const c = getComputedStyle(n); return { cls: n.className, x: r.x, y: r.y, w: r.width, h: r.height, bg: c.backgroundColor, blur: c.backdropFilter, pos: c.position, pad: c.padding }; }),
    bodyScroll: (() => { const b = panel.querySelector(".miuix-modal__body"); if (!b) return null; const c = getComputedStyle(b); return { sh: b.scrollHeight, ch: b.clientHeight, padB: c.paddingBottom, padT: c.paddingTop, overflowY: c.overflowY, rect: (() => { const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })() }; })(),
  };
});
console.log("RECTS:", JSON.stringify(rects, null, 1));

const samples = [];
for (const tr of (rects.textRects || []).slice(0, 8)) samples.push(await region("text:" + tr.t, { x: tr.x, y: tr.y, width: tr.w, height: tr.h }, 1));
console.log("TEXT SAMPLES:", JSON.stringify(samples, null, 1));
await fs.writeFile(OUT + "/contrast-text.json", JSON.stringify({ textMeta: rects.textRects, samples }, null, 2), "utf8");
await fs.writeFile(OUT + "/measure-extool.json", JSON.stringify(rects, null, 2), "utf8");
