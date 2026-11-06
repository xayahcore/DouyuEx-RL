
const task = await taskSpace("dyex-icon-ego");
const page = task.page("p1");
await page.evaluate(() => { document.querySelectorAll("video,audio").forEach((v) => { v.muted = true; v.volume = 0; }); });
const c = await page.cdp("Network.getCookies", { urls: ["https://www.douyu.com/9999"] });
const st = await page.evaluate(() => ({
  url: location.href.slice(0, 40),
  scheme: document.documentElement.getAttribute("data-mantine-color-scheme"),
  bg: getComputedStyle(document.body).backgroundColor,
  lsTheme: localStorage.getItem("mantine-color-scheme-value"),
  allMuted: Array.from(document.querySelectorAll("video,audio")).every((v) => v.muted),
}));
console.log("FINAL:", JSON.stringify(st));
console.log("cookies:", JSON.stringify((c.cookies || []).filter((x) => /mantine/i.test(x.name)).map((x) => x.domain + "=" + x.value)));
