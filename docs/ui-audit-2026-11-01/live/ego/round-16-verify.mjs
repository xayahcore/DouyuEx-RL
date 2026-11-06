
const task = await taskSpace("dyex-icon-ego");
const tabs = await task.tabs();
console.log("spaceId:", task.spaceId, "tabs:", JSON.stringify(tabs.map((t) => ({ label: t.label, active: t.active, url: (t.url || "").slice(0, 42) }))));
const page = (tabs.find((t) => t.active) || tabs[0]).page;
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
const st = await page.evaluate(() => ({ dock: !!document.querySelector(".ex-panel"), openPanels: Array.from(document.querySelectorAll(".sign-panel,.fans-continue-panel,.bloop,.extool,.livetool,.exlottery,.popup-player-panel,.exupdate-panel")).filter((p) => getComputedStyle(p).display !== "none").length, scrollY: window.scrollY }));
console.log("STATE:", JSON.stringify(st));
