const fs = require("fs");
const path = require("path");
const assert = require("assert");
let JSDOM;
try { JSDOM = require("jsdom").JSDOM; } catch (e) { console.error("[测试] 缺少依赖 jsdom，请先执行：npm install"); throw e; }

const ROOT = path.join(__dirname, "..");
const SRC = fs.readFileSync(path.join(ROOT, "src/packages/FansContinue/FansContinue.js"), "utf8");

/**
 * 一键续牌「打开即读数据」回归（2026-10-30 用户回归报障）：
 *   面板可能由「图标点击」之外的路打开（二级菜单悬停 / 快捷键），旧实现只在点击那条路
 *   调 updateFansContinuePanel → 悬停打开时徽章与资产一直停在占位符。
 *   现状：建面板时先读一次；另监听 DouyuEx:thirdLevelOpened 事件补刷新。
 */
const SAMPLE_HTML = `<html><body><table class="aui_room_table fans-badge-list"><tbody>
  <tr data-fans-room="111" data-fans-level="12" data-fans-intimacy="13968.9" data-fans-rank="2928" data-fans-delwaittime="10">
    <td><a title="石页z">石页z</a></td><td>石页的第一根矛s</td><td>13968.9/15000</td><td>25</td><td>2928</td><td>取消佩戴</td>
  </tr>
  <tr data-fans-room="222" data-fans-level="3" data-fans-intimacy="221.4" data-fans-rank="3573" data-fans-delwaittime="10">
    <td><a title="旺仔鱼">旺仔鱼</a></td><td>小鱼小鱼吃虾米</td><td>221.4/240</td><td>0</td><td>3573</td><td>佩戴</td>
  </tr>
</tbody></table></body></html>`;

function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

function load() {
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "https://www.douyu.com/71415" });
    const win = dom.window;
    const stats = { fetch: 0, messages: [], wearCalls: [] };
    const fetchStub = function (url, init) {
        if (String(url).indexOf("operBadge") !== -1) {
            stats.wearCalls.push({ url: String(url), body: (init && init.body) || "" });
            // 实测 operBadge 返回 {"result":0,"msg":"ok"}
            return Promise.resolve({ json: function () { return Promise.resolve({ result: 0, msg: "ok" }); } });
        }
        stats.fetch++;
        return Promise.resolve({ text: function () { return Promise.resolve(SAMPLE_HTML); } });
    };
    const bagStub = function (roomId, cb) {
        cb({ data: { list: [{ id: "268", count: 230 }, { id: "1", count: 3 }] } });
    };
    const factory = new Function(
        "document", "window", "localStorage", "console", "setTimeout", "clearTimeout",
        "fetch", "DOMParser", "getBagGifts", "showMessage", "rid", "CustomEvent", "MutationObserver", "ExGuard_warn",
        SRC + `
        return {
            create: createFansContinuePanel,
            update: updateFansContinuePanel,
            bind: FansContinue_bindRefresh,
            parse: FansContinue_parseBadges
        };`
    );
    const api = factory(
        win.document, win, win.localStorage, { log: function () {}, warn: function () {}, error: function () {} },
        win.setTimeout.bind(win), win.clearTimeout.bind(win),
        fetchStub, win.DOMParser, bagStub,
        function (m) { stats.messages.push(String(m)); },
        "71415", win.CustomEvent, win.MutationObserver,
        function () {}
    );
    return { dom: dom, win: win, api: api, stats: stats };
}

async function testCreateLoadsData() {
    const env = load();
    env.api.create();
    await tick(); await tick(); await tick();
    const doc = env.win.document;
    assert.strictEqual(doc.getElementById("fans-panel-badge-count").textContent, "2", "建面板后必须立刻读到粉丝牌数量");
    assert.ok(doc.getElementById("fans-panel-badge-name").textContent.indexOf("石页z") !== -1,
        "当前佩戴的徽章名必须读到，实际 " + doc.getElementById("fans-panel-badge-name").textContent);
    assert.strictEqual(doc.getElementById("fans-panel-stick-count").textContent, "230", "背包荧光棒数量必须读到");
    assert.strictEqual(doc.querySelectorAll(".fans-panel__badge-row").length, 2, "明细列表必须逐块渲染");
    const firstRow = doc.querySelector(".fans-panel__badge-row").textContent.replace(/\s+/g, " ");
    assert.ok(firstRow.indexOf("Lv.12") !== -1 && firstRow.indexOf("今日 +25") !== -1 && firstRow.indexOf("排名 2928") !== -1,
        "明细行必须给真实字段（等级/今日亲密度/排名），实际 " + firstRow);
    assert.ok(firstRow.indexOf("剩 ") === -1 && firstRow.indexOf("天") === -1,
        "不得再出现编造的「剩 N 天」，实际 " + firstRow);
    assert.strictEqual(doc.getElementById("fans-panel-badge-status").textContent, "+25", "状态格必须是真实的今日亲密度合计，不能编造剩余天数");
    env.dom.window.close();
    console.log("✓ ① 通过: 建面板即读取（数量/徽章/荧光棒/明细/状态）");
}

async function testThirdLevelOpenedRefreshes() {
    const env = load();
    env.api.bind();
    env.api.bind(); // 幂等：重复绑定不得导致多次刷新
    env.api.create();
    await tick(); await tick(); await tick();
    const before = env.stats.fetch;
    env.win.document.dispatchEvent(new env.win.CustomEvent("DouyuEx:thirdLevelOpened", {
        detail: { panel: env.win.document.querySelector(".fans-continue-panel") }
    }));
    await tick(); await tick();
    assert.strictEqual(env.stats.fetch, before + 1, "悬停/快捷键打开也必须触发一次刷新，实际 +" + (env.stats.fetch - before));
    // 其它面板打开事件不该触发续牌刷新
    env.win.document.dispatchEvent(new env.win.CustomEvent("DouyuEx:thirdLevelOpened", {
        detail: { panel: env.win.document.createElement("div") }
    }));
    await tick();
    assert.strictEqual(env.stats.fetch, before + 1, "别的面板打开不应刷新续牌");
    env.dom.window.close();
    console.log("✓ ② 通过: 三级面板打开事件触发刷新（只认续牌面板，绑定幂等）");
}

function testNoPanelRefreshesOnlyOnClickPath() {
    // 同类缺陷（"只在点击那条路刷新"）不允许再出现在其它面板上：
    // 所有需要"打开即刷新"的面板必须监听统一事件，而不是只在 click handler 里做。
    const fsx = require("fs");
    const popup = fsx.readFileSync(path.join(path.join(__dirname, ".."), "src/packages/PopupPlayer/PopupPlayer.js"), "utf8");
    const update = fsx.readFileSync(path.join(path.join(__dirname, ".."), "src/packages/Update/Update.js"), "utf8");
    assert.ok(popup.indexOf("DouyuEx:thirdLevelOpened") !== -1, "同屏播放面板必须监听统一打开事件（悬停打开也要重画）");
    assert.ok(update.indexOf("DouyuEx:thirdLevelOpened") !== -1, "版本更新面板必须监听统一打开事件（悬停打开也要熄灭红点）");
    console.log("✓ ④ 通过: 其它面板不再把刷新只写在点击路径里");
}

async function testWearButtonCallsApi() {
    const env = load();
    env.api.create();
    await tick(); await tick(); await tick();
    const doc = env.win.document;
    const btns = [...doc.querySelectorAll(".fans-panel__badge-wear")];
    assert.strictEqual(btns.length, 2, "每块粉丝牌都要有佩戴/卸下按钮，实际 " + btns.length);
    const wornBtn = btns[0];
    const notWornBtn = btns[1];
    assert.strictEqual(wornBtn.textContent.trim(), "卸下", "佩戴中的那块按钮文案应为「卸下」");
    assert.strictEqual(notWornBtn.textContent.trim(), "佩戴", "未佩戴那块的按钮文案应为「佩戴」");

    // 点未佩戴的那块 → 佩戴（type=1，带上 rid 与 ctn）
    notWornBtn.dispatchEvent(new env.win.Event("click", { bubbles: true }));
    await tick(); await tick(); await tick();
    assert.strictEqual(env.stats.wearCalls.length, 1, "点一次只发一条 operBadge，实际 " + env.stats.wearCalls.length);
    const call = env.stats.wearCalls[0];
    assert.ok(call.url.indexOf("/member/cp/operBadge") !== -1, "必须打斗鱼的佩戴接口，实际 " + call.url);
    assert.ok(call.body.indexOf("rid=222") !== -1 && call.body.indexOf("type=1") !== -1 && call.body.indexOf("ctn=") !== -1,
        "请求体必须带 rid/type/ctn，实际 " + call.body);
    assert.ok(env.stats.fetch >= 2, "操作成功后必须重新拉一次列表");
    env.dom.window.close();
    console.log("✓ ⑤ 通过: 佩戴按钮打的是真实接口（rid/type/ctn），成功后刷新列表");
}

function testParseHandlesEmpty() {
    const env = load();
    assert.deepStrictEqual(env.api.parse("<html><body></body></html>"), [], "没有列表时必须返回空数组而不是抛错");
    const rows = env.api.parse(SAMPLE_HTML);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].worn, true, "出现「取消佩戴」的那行才是当前佩戴");
    assert.strictEqual(rows[1].worn, false);
    env.dom.window.close();
    console.log("✓ ③ 通过: 列表解析容错（空响应不抛、佩戴态识别正确）");
}

(async function main() {
    await testCreateLoadsData();
    await testThirdLevelOpenedRefreshes();
    testParseHandlesEmpty();
    testNoPanelRefreshesOnlyOnClickPath();
    await testWearButtonCallsApi();
    console.log("=== 一键续牌回归 5 组场景全部通过 ===");
})().catch(function (e) {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
