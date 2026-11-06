const task = await taskSpace("dyex-uiux-audit");
const page = task.page("p1");
const BASE = "http://127.0.0.1:8899/docs/ui-audit-2026-11-01/preview/harness.html";

/* A) glass2 的开关必须与 before 列逐项一致 */
await page.goto(BASE + "?skin=glass2");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
const cmp = await page.evaluate(() => {
  const read = (side, sel) => {
    const el = document.querySelector("#row-controls .pane--" + side + " " + sel);
    const knob = getComputedStyle(el, "::before");
    const s = getComputedStyle(el);
    return {
      track: s.backgroundColor,
      shadow: s.boxShadow,
      knobBg: knob.backgroundColor,
      knobShadow: knob.boxShadow,
      knobW: knob.width
    };
  };
  return {
    off: { before: read("before", ".sign-checkbox:not(:checked)"), after: read("after", ".sign-checkbox:not(:checked)") },
    on: { before: read("before", ".sign-checkbox:checked"), after: read("after", ".sign-checkbox:checked") }
  };
});
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
console.log("SWITCH off identical: " + same(cmp.off.before, cmp.off.after));
console.log("SWITCH on  identical: " + same(cmp.on.before, cmp.on.after));
console.log("OFF before " + JSON.stringify(cmp.off.before));
console.log("OFF after  " + JSON.stringify(cmp.off.after));
console.log("ON  before " + JSON.stringify(cmp.on.before));
console.log("ON  after  " + JSON.stringify(cmp.on.after));

/* B) dark 皮肤自检 */
await page.goto(BASE + "?skin=dark");
await page.waitForFunction(() => document.body.dataset.ready === "1", undefined, { timeout: 20000 });
const dark = await page.evaluate(() => {
  const pane = document.querySelector("#row-extool .pane--after");
  const cs = (el) => getComputedStyle(el);
  return {
    shell: cs(pane.querySelector(".extool")).backgroundColor,
    header: cs(pane.querySelector(".miuix-modal__header")).backgroundColor,
    card: cs(pane.querySelector(".fans-panel__card")).backgroundColor,
    title: cs(pane.querySelector(".fans-panel__card-title")).color,
    desc: cs(pane.querySelector(".sign-option-desc")).color,
    offTrack: cs(document.querySelector("#row-controls .pane--after .sign-checkbox:not(:checked)")).backgroundColor,
    dockTile: cs(document.querySelector("#row-dock .pane--after .ex-sign")).backgroundColor,
    dockIcon: cs(document.querySelector("#row-dock .pane--after .ex-sign svg")).color,
    activeTile: cs(document.querySelector("#row-dock .pane--after .extool-icon")).backgroundColor,
    errors: window.__PREVIEW_ERRORS__
  };
});
console.log("DARK " + JSON.stringify(dark, null, 1));
