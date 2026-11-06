const task = await taskSpace("dyex-icon-ego");
const tabs = await task.tabs();
console.log("tabs:", tabs.map(t => ({ label: t.label, active: t.active, url: (t.url||"").slice(0,60) })));
const page = (tabs.find(t => t.active) || tabs[0]).page;
const info = await page.evaluate(() => {
  const styles = [...document.querySelectorAll("style")].map(s => s.textContent || "");
  const joined = styles.join("");
  const hasNew = joined.includes("rgba(255, 255, 255, 0.34)");
  const hasOld = joined.includes("rgba(255, 255, 255, 0.72)");
  const token = getComputedStyle(document.documentElement).getPropertyValue("--miuix-modal-bg").trim();
  const dock = document.querySelector(".ex-panel");
  return {
    styleTags: styles.length, hasNew, hasOld, token,
    dockExists: !!dock, dockDisplay: dock ? getComputedStyle(dock).display : null,
    icons: document.querySelectorAll(".ex-icon").length,
    injected: !!window.__DYEX_EGO_INJECTED__,
  };
});
console.log("page info:", JSON.stringify(info));
