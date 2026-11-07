/* 直播间工具面板「打开即卡死」回归（2026-11-07）
 *
 * 事故链：LiveTool 在 .miuix-modal__body 上挂 MutationObserver(childList) 调 LiveTool_sortCells()，
 * 而 sortCells 结尾无条件 cells.forEach(c => body.appendChild(c)) —— appendChild 即使位置不变
 * 也是「移出再插入」，属于 childList 变更，于是观察器再次触发 sortCells → 微任务里无限自我重入，
 * 主线程永不空转，整页卡死（真机表现为：展开 Dock、鼠标划到「直播间工具」磁贴就 froze）。
 *
 * 本用例钉两件事：
 *   ① 乱序能按 rank 排好；
 *   ② 已排好时再调一次，DOM 变更数必须为 0（这是死循环的充分条件）。
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

let JSDOM;
try {
    JSDOM = require("jsdom").JSDOM;
} catch (e) {
    console.error("[测试] 缺少依赖 jsdom，请先执行：npm install");
    throw e;
}

const SRC = fs.readFileSync(path.join(__dirname, "..", "src/packages/LiveTool/LiveTool.js"), "utf8");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { runScripts: "outside-only", url: "https://www.douyu.com/9999" });
const win = dom.window;
win.eval(SRC);

const doc = win.document;
const panel = doc.createElement("div");
panel.className = "livetool";
const body = doc.createElement("div");
body.className = "miuix-modal__body";
panel.appendChild(body);
doc.body.appendChild(panel);

function makeCell(title) {
    const cell = doc.createElement("div");
    cell.className = "ui-cell";
    const head = doc.createElement("div");
    head.className = "ui-cell__title";
    head.textContent = title;
    cell.appendChild(head);
    return cell;
}
function order() {
    return [...body.querySelectorAll(":scope > .ui-cell")].map((c) => c.querySelector(".ui-cell__title").textContent);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    assert.strictEqual(typeof win.LiveTool_sortCells, "function", "LiveTool_sortCells 必须存在（前置）");

    // ① 乱序 → 按 rank 排好
    ["自动谢礼物", "进场欢迎", "关键词回复"].forEach((t) => body.appendChild(makeCell(t)));
    win.LiveTool_sortCells();
    assert.deepStrictEqual(order(), ["关键词回复", "进场欢迎", "自动谢礼物"], "应按 rank 排序，实际 " + order().join(" / "));
    console.log("✓ ① 乱序磁贴按 rank 排好");

    // ② 已排好 → 再调一次不得改 DOM（否则就是死循环的燃料）
    let mutations = 0;
    const mo = new win.MutationObserver((list) => { mutations += list.length; });
    mo.observe(body, { childList: true });
    win.LiveTool_sortCells();
    await wait(20);
    mo.disconnect();
    assert.strictEqual(mutations, 0, "已排好时不得再 appendChild（会重新触发观察器 → 整页卡死），实际变更 " + mutations);
    console.log("✓ ② 已排好时再排一次，DOM 变更 0");

    // ③ 顺序真的变了才允许动 DOM，且只动一次（观察器再跑一遍即收敛）
    body.insertBefore(body.querySelectorAll(":scope > .ui-cell")[2], body.querySelectorAll(":scope > .ui-cell")[0]);
    const before = order().join("|");
    let second = 0;
    const mo2 = new win.MutationObserver((list) => { second += list.length; });
    mo2.observe(body, { childList: true });
    win.LiveTool_sortCells();
    await wait(20);
    mo2.disconnect();
    assert.strictEqual(order().join("|"), "关键词回复|进场欢迎|自动谢礼物", "顺序被改坏后应恢复，实际 " + order().join(" / "));
    assert.ok(second > 0, "顺序真的变了必须重排，实际变更 " + second + "（改前 " + before + "）");
    console.log("✓ ③ 顺序真变了才重排（变更 " + second + "），且再排一次即收敛");

    dom.window.close();
    console.log("=== 直播间工具排序死循环回归 3 组场景全部通过 ===");
})().catch((e) => {
    console.error("[测试失败]", e && e.message ? e.message : e);
    process.exit(1);
});
