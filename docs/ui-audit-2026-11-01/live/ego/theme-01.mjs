
const task = await taskSpace("dyex-icon-ego");
console.log("spaceId:", task.spaceId, "ownership:", task.ownership);
const tabs = await task.tabs();
console.log("tabs:", JSON.stringify(tabs.map((t) => ({ label: t.label, active: t.active, url: (t.url || "").slice(0, 60) }))));
