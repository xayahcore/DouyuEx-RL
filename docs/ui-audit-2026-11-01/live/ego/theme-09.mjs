
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");
const inline = await page.evaluate(() => {
  const out = [];
  const scripts = Array.from(document.querySelectorAll("script:not([src])"));
  scripts.forEach((s, i) => {
    const t = s.textContent || "";
    if (t.indexOf("saveDisplaySettingsToCookie") >= 0 || t.indexOf("checkDisplaySettings") >= 0 || t.indexOf("mantine-color-scheme") >= 0) {
      out.push({ idx: i, len: t.length, text: t });
    }
  });
  return out;
});
console.log("inline hits:", inline.length, inline.map((x) => x.idx + ":" + x.len).join(", "));
for (const h of inline) {
  console.log("\n===== inline script #" + h.idx + " (" + h.len + " chars) =====");
  console.log(h.text.slice(0, 6000));
}
