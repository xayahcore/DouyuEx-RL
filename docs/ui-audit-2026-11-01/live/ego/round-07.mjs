
import fs from "node:fs/promises";
import zlib from "node:zlib";
const OUT = "D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live";
function decodePng(buf) {
  let pos = 8, w = 0, h = 0, colorType = 6; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9]; }
    else if (type === "IDAT") idat.push(data); else if (type === "IEND") break;
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : 0; if (!ch) return null;
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
const t3 = await page.evaluate(() => { const t = document.querySelectorAll(".ex-panel__wrap > div")[3]; const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await page.mouse.move(20, 20); await page.waitForTimeout(100);
await page.mouse.move(t3.x, t3.y); await page.waitForTimeout(900);

const meas = await page.evaluate(() => {
  const panel = document.querySelector(".extool");
  const body = panel && panel.querySelector(".miuix-modal__body");
  if (body) body.scrollTop = 0;
  const px = (n) => (n == null ? null : +n.toFixed(2));
  const st = (el, pseudo) => { if (!el) return null; const c = getComputedStyle(el, pseudo || undefined); const r = el.getBoundingClientRect();
    return { rect: { x: px(r.x), y: px(r.y), w: px(r.width), h: px(r.height) }, fs: c.fontSize, lh: c.lineHeight, color: c.color, fw: c.fontWeight, bg: c.backgroundColor, radius: c.borderRadius, border: c.border, pad: c.padding, gap: c.gap, shadow: c.boxShadow, opacity: c.opacity, transform: c.transform, display: c.display, lineClamp: c.webkitLineClamp }; };
  const swOff = panel.querySelector("#extool__autobarragecolor");
  const swOn = panel.querySelector("#extool__highestvideoquality");
  const item = panel.querySelector(".sign-option-item");
  const card = panel.querySelector(".fans-panel__card");
  const cardTitle = panel.querySelector(".fans-panel__card-title");
  const badge = Array.from(panel.querySelectorAll("*")).find((n) => n.children.length === 0 && n.textContent.trim() === "极速秒开");
  return {
    header: st(panel.querySelector(".miuix-modal__header")),
    title: st(panel.querySelector(".miuix-modal__title")),
    titleIco: st(panel.querySelector(".ex-title-ico")),
    close: st(panel.querySelector(".miuix-modal__close")),
    body: st(panel.querySelector(".miuix-modal__body")),
    card: st(card),
    cardTitle: st(cardTitle),
    cardIco: st(panel.querySelector(".ex-card-ico")),
    item: st(item),
    itemTitle: st(panel.querySelector(".sign-option-title")),
    itemDesc: st(panel.querySelector(".sign-option-desc")),
    badge: st(badge),
    swOn: { ...st(swOn), pseudo: st(swOn, "::before") },
    swOff: { ...st(swOff), pseudo: st(swOff, "::before") },
    bodyInfo: body ? { sh: body.scrollHeight, ch: body.clientHeight, scrollTop: body.scrollTop } : null
  };
});
console.log("MEAS:", JSON.stringify(meas, null, 1));

const sample = async (tag, rect) => {
  const x = Math.max(0, Math.round(rect.x)), y = Math.max(0, Math.round(rect.y));
  const w = Math.max(1, Math.round(rect.w || rect.width)), h = Math.max(1, Math.round(rect.h || rect.height));
  if (y + h > 763 || x + w > 1625) return { tag, skipped: "out-of-view", x, y, w, h };
  const r = await page.cdp("Page.captureScreenshot", { format: "png", clip: { x, y, width: w, height: h, scale: 1 }, captureBeyondViewport: false });
  const img = decodePng(Buffer.from(r.data, "base64")); if (!img) return { tag, error: "decode" };
  const px = []; const counts = new Map();
  for (let i = 0; i < img.w * img.h; i++) { const o = i * img.ch; const c = [img.data[o], img.data[o + 1], img.data[o + 2]]; px.push(c); const k = c.join(","); counts.set(k, (counts.get(k) || 0) + 1); }
  const sorted = px.slice().sort((a, b) => lum(a) - lum(b));
  const mode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].split(",").map(Number);
  const p05 = sorted[Math.floor(sorted.length * 0.05)], p95 = sorted[Math.max(0, Math.floor(sorted.length * 0.95))];
  return { tag, px: { x, y, w, h }, bgMode: hex(mode), p05: hex(p05), p95: hex(p95), ratio_mode_p05: ratio(mode, p05), ratio_mode_p95: ratio(mode, p95) };
};
const S = [];
const cards = [
  ["cardTitle 12px", meas.cardTitle.rect],
  ["cardDesc 10.5px", (() => { const el = page; return meas.itemDesc.rect; })()],
  ["panelTitle 14px", meas.title.rect],
  ["badge 11px", meas.badge.rect],
  ["switch OFF track", { x: meas.swOff.rect.x + 26, y: meas.swOff.rect.y + 4, w: 10, h: 14 }],
  ["switch ON track", { x: meas.swOn.rect.x + 26, y: meas.swOn.rect.y + 4, w: 10, h: 14 }],
  ["card surface", { x: meas.card.rect.x + 8, y: meas.card.rect.y + meas.card.rect.h - 10, w: 40, h: 6 }],
  ["item surface", { x: meas.item.rect.x + meas.item.rect.w - 60, y: meas.item.rect.y + 4, w: 30, h: 6 }],
];
for (const [tag, rect] of cards) { if (!rect) continue; S.push(await sample(tag, rect)); }
console.log("SAMPLES:", JSON.stringify(S, null, 1));

// Dock 图标 fill/stroke 实测
const icons = await page.evaluate(() => {
  const get = (i) => { const t = document.querySelectorAll(".ex-panel__wrap > div")[i]; if (!t) return null;
    const s = t.querySelector("svg"), fill = t.querySelector(".ex-ico--fill"), stroke = t.querySelector(".ex-ico--stroke, .ex-ico");
    const cs = s ? getComputedStyle(s) : null;
    const find = (el) => { if (!el) return null; const c = getComputedStyle(el); return { display: c.display, color: c.color, fill: c.fill, stroke: c.stroke, w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height }; };
    return { cls: t.className, svgCount: t.querySelectorAll("svg").length, first: find(s), fillEl: find(fill), wrapEl: find(t.querySelector(".ex-ico")) }; };
  return { tile0: get(0), tile3: get(3), tile7: get(7) };
});
console.log("ICONS:", JSON.stringify(icons, null, 1));
await fs.writeFile(OUT + "/measure-controls.json", JSON.stringify({ meas, samples: S, icons }, null, 2), "utf8");
