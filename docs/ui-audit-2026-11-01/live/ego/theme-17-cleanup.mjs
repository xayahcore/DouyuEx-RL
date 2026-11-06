
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");
const r = await page.evaluate(() => { const had = localStorage.getItem("mantine-color-scheme-value"); localStorage.removeItem("mantine-color-scheme-value"); return { had, now: localStorage.getItem("mantine-color-scheme-value") }; });
console.log("LS cleanup:", JSON.stringify(r));
const c = await page.cdp("Network.getCookies", { urls: ["https://www.douyu.com/9999"] });
console.log("cookies:", JSON.stringify((c.cookies || []).filter((x) => /mantine/.test(x.name)).map((x) => x.domain + "=" + x.value)));
const st = await page.evaluate(() => ({ scheme: document.documentElement.getAttribute("data-mantine-color-scheme"), bg: getComputedStyle(document.body).backgroundColor, muted: Array.from(document.querySelectorAll("video,audio")).every((v) => v.muted) }));
console.log("FINAL STATE:", JSON.stringify(st));
