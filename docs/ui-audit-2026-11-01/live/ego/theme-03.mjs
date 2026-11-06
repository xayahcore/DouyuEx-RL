
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");
console.log("url:", (await page.url()).slice(0, 50));
const out = await page.evaluate(() => {
  const info = (el) => { const r = el.getBoundingClientRect(); return { tag: el.tagName, cls: String(el.className).slice(0, 70), id: el.id, title: el.getAttribute("title"), aria: el.getAttribute("aria-label"), role: el.getAttribute("role"), text: (el.innerText || "").trim().slice(0, 18), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], hasSvg: !!el.querySelector("svg"), html: el.innerHTML.slice(0, 90).replace(/\s+/g, " ") }; };
  const header = document.querySelector(".Header-wrap");
  const headerInteractive = header ? Array.from(header.querySelectorAll("button, a, [role=button], [class*=Btn], [class*=btn], [class*=icon], [class*=Icon]")).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; }).map(info) : [];
  const mantineEls = Array.from(document.querySelectorAll("[class*=mantine]")).slice(0, 30).map((e) => e.tagName + "." + String(e.className).slice(0, 60));
  const svgIcons = Array.from(document.querySelectorAll("svg")).slice(0, 60).map((s) => { const p = s.querySelector("path"); const r = s.getBoundingClientRect(); return { vb: s.getAttribute("viewBox"), d: p ? (p.getAttribute("d") || "").slice(0, 44) : null, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }; });
  const userArea = Array.from(document.querySelectorAll("[class*=User],[class*=user],[class*=Avatar],[class*=avatar]")).slice(0, 15).map(info);
  return { headerInteractive: headerInteractive.slice(0, 40), mantineEls, svgIcons, userArea };
});
console.log(JSON.stringify(out, null, 1).slice(0, 9000));
