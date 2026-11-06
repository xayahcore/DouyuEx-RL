import fs from "node:fs/promises";
const task = await taskSpace("dyex-icon-ego");
console.log("spaceId:", task.spaceId, "name:", task.name, "ownership:", task.ownership);
const tabs = await task.tabs();
console.log("tabs:", JSON.stringify(tabs.map(t => ({ label: t.label, title: t.title, url: t.url, active: t.active, openedBy: t.openedBy })), null, 1));
const pages = await task.pages();
console.log("pages:", JSON.stringify(pages.map(p => p.label)));
