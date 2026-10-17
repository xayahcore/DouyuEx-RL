/**
 * tests/test_archive_surfaces.js — P0-6 房间统计条 + P0-7 弹幕历史面板 界面层契约测试
 *
 * 覆盖两个已存在的包（都只换数据来源，外观/结构不动）：
 *   src/packages/RealAudience/RealAudience.js   —— 统计条：doseeing → ArchiveDB.getRoomDay
 *   src/packages/DanmakuHistory/DanmakuHistory.js —— 面板：用户流水 → ArchiveDB.queryUserDay
 *
 * 不连网：ArchiveDB / ArchiveReplay / ArchiveMeta / GM_xmlhttpRequest 全部用桩。
 * 挂真实源码（jsdom + new Function 注入宿主能力），不写镜像实现。
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

const REAL_AUDIENCE_PATH = path.join(__dirname, "../src/packages/RealAudience/RealAudience.js");
const HISTORY_PATH = path.join(__dirname, "../src/packages/DanmakuHistory/DanmakuHistory.js");
const COMMON_PATH = path.join(__dirname, "../src/common.js");

const REAL_AUDIENCE_SRC = fs.readFileSync(REAL_AUDIENCE_PATH, "utf8");
const HISTORY_SRC = fs.readFileSync(HISTORY_PATH, "utf8");
const COMMON_SRC = fs.readFileSync(COMMON_PATH, "utf8");

/** 从 common.js 抽真实 getLocalDateStr：日期必须走本地分量，不能用桩糊过去。 */
function extractLocalDateFn() {
    const matched = COMMON_SRC.match(/function getLocalDateStr[\s\S]*?\n}/);
    if (!matched) throw new Error("common.js 中未找到 getLocalDateStr，测试需同步更新（避免静默失效）");
    return matched[0];
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function localToday() {
    const moment = new Date();
    const pad = (value) => (value < 10 ? "0" + value : "" + value);
    return moment.getFullYear() + "-" + pad(moment.getMonth() + 1) + "-" + pad(moment.getDate());
}

/** 去掉注释后再做静态断言：注释里描述"旧实现用过什么"不算依赖。 */
function stripComments(text) {
    return String(text)
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");
}

let passed = 0;
function ok(name) {
    passed++;
    console.log("  ✓ " + name);
}

/* ================================================================== */
/* 一、统计条（RealAudience）                                           */
/* ================================================================== */

/**
 * room_day 桩：字段名与 ArchiveDB 契约一致（activeUv/chatUv/giftUv/paidUv/incomeCents/nobleCnt/firstTs）。
 * archive 选项：
 *   roomDay     —— getRoomDay 解析成它（null = 本机没记录）
 *   absent      —— ArchiveDB 整个不存在（typeof undefined），验证退化路径
 *   throws      —— getRoomDay 抛异常
 *   neverRespond—— getRoomDay 返回永远 pending 的 Promise
 */
function loadRealAudience(options) {
    const settings = options || {};
    const url = settings.url || "https://www.douyu.com/74751";
    const dom = new JSDOM(
        `<!DOCTYPE html><html><head><link rel="canonical" href="${url}"></head><body>
            <div class="layout-Player-videoEntity"><video></video></div>
            <div class="layout-Player-announce"></div>
            <div class="layout-Player-rankAll"></div>
            <div class="Barrage-main"><ul class="Barrage-list"></ul></div>
         </body></html>`,
        { url }
    );
    const win = dom.window;

    const gmRequests = [];
    const opened = [];
    const warnings = [];
    const quietConsole = {
        log: () => {},
        error: () => {},
        warn: (...args) => warnings.push(args.join(" ")),
    };

    const getRoomDayCalls = [];
    const ArchiveDB = settings.absent ? undefined : {
        getRoomDay: (rid, dayKey) => {
            getRoomDayCalls.push({ rid, dayKey });
            if (settings.throws) throw new Error("idb 炸了");
            if (settings.neverRespond) return new Promise(() => {});
            return Promise.resolve(settings.roomDay === undefined ? null : settings.roomDay);
        },
    };

    const factory = new Function(
        "window", "document", "location", "unsafeWindow",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        "fetch", "GM_xmlhttpRequest", "StyleHook_set", "getType", "showMessage", "console",
        "ArchiveDB", "GM_openInTab",
        COMMON_SRC + "\n" + REAL_AUDIENCE_SRC + `
        return {
            getRid: function () { return rid; },
            info: function () { return real_info; },
            initDom: initPkg_RealAudience_Dom,
            ensure: realAudienceEnsure,
            switchWatch: switchRealAndTodayWatch,
            setViewer: setRealViewer,
            clickBar: function () {
                var bar = document.getElementsByClassName("real-audience")[0];
                if (bar && typeof bar.onclick === "function") bar.onclick();
            },
            habit: getRoomDayFromArchive
        };
        `
    );

    const api = factory(
        win, win.document, win.location, win,
        win.setTimeout, win.clearTimeout, win.setInterval, win.clearInterval,
        () => Promise.resolve({ json: async () => ({ error: 0, data: { todayWatch: 0 } }) }),
        (req) => {
            // 统计条改造后不该再有任何跨域请求；命中就记下来供用例断言。
            gmRequests.push(req && req.url ? req.url : "(no url)");
        },
        () => {},
        () => "unknown",
        () => {},
        quietConsole,
        ArchiveDB,
        (url) => opened.push(url)
    );

    return { dom, win, api, warnings, gmRequests, opened, getRoomDayCalls };
}

/** 读统计条真实写入值：真实代码写的是 innerText（jsdom 不实现 innerText→textContent 的联动）。 */
function statValue(win, id) {
    const el = win.document.getElementById(id);
    if (!el) return null;
    return el.innerText === undefined ? null : String(el.innerText);
}

function statTitle(win, id) {
    const el = win.document.getElementById(id);
    return el ? String(el.getAttribute("title") || "") : null;
}

const BAR_IDS = [
    "real-audience__t",
    "real-audience__total",
    "real-audience__barrage",
    "real-audience__noble-wrap",
    "real-audience__noble",
    "real-audience__money",
    "real-audience__money_yc",
    "real-audience__time",
    "real-audience__watchtime",
];

/** 统计条 DOM 指纹：只取结构与类名，不含任何数值。 */
function barFingerprint(win) {
    const bar = win.document.querySelector(".real-audience");
    if (!bar) return null;
    const ids = [];
    bar.querySelectorAll("[id]").forEach((el) => ids.push(el.id));
    const iconCount = bar.querySelectorAll("svg").length;
    const wraps = [];
    Array.prototype.forEach.call(bar.children, (child) => wraps.push(child.className));
    return { ids, iconCount, wraps, classList: String(bar.className) };
}

function roomDayFixture(overrides) {
    return Object.assign({
        ridDay: "74751|" + localToday(),
        rid: "74751",
        dayKey: localToday(),
        activeUv: 12345,
        chatUv: 678,
        giftUv: 90,
        paidUv: 12,
        danmakuCnt: 900,
        giftCnt: 33,
        enterUv: 4000,
        incomeCents: 12345,
        nobleCnt: 321,
        firstTs: new Date().setHours(9, 5, 0, 0),
        lastTs: Date.now(),
        minutes: {},
        updatedAt: Date.now(),
    }, overrides || {});
}

async function testStatsBar() {
    console.log("=== P0-6 统计条：数据源改本机档案 ===");

    // ① 本机没有这一天 → 「未观测」，不是 ****、不是 0
    {
        const { dom, win, api } = loadRealAudience({ roomDay: null });
        api.initDom();
        await api.setViewer();

        ["real-audience__total", "real-audience__barrage", "real-audience__money_yc"].forEach((id) => {
            const value = statValue(win, id);
            assert.strictEqual(value, "未观测", id + " 无本机数据时必须显示「未观测」，实际 " + JSON.stringify(value));
            assert.ok(String(value).indexOf("****") === -1, id + " 不得停在 **** 占位符");
            assert.notStrictEqual(String(value), "0", id + " 不得用 0 冒充「观测到但没人」");
        });
        assert.ok(
            String(statTitle(win, "real-audience__t")).indexOf("未观测") !== -1,
            "title 必须如实说明未观测，实际 " + JSON.stringify(statTitle(win, "real-audience__t"))
        );
        assert.ok(
            String(statTitle(win, "real-audience__money")).indexOf("未观测") !== -1,
            "礼物 title 也必须标明未观测"
        );
        ok("① 本机无数据 → 三项都显示「未观测」，不出现 ****、不出现 0");
        dom.window.close();
    }

    // ② 有 room_day → 四个数字正确，且 DOM 结构与改动前一致
    {
        const { dom, win, api } = loadRealAudience({ roomDay: roomDayFixture() });
        api.initDom();
        const before = barFingerprint(win);
        await api.setViewer();

        assert.strictEqual(statValue(win, "real-audience__total"), "12345", "互动人数 ← activeUv");
        assert.strictEqual(statValue(win, "real-audience__barrage"), "678", "弹幕人数 ← chatUv");
        assert.strictEqual(statValue(win, "real-audience__money_yc"), "123.45", "礼物价值 ← incomeCents/100 两位小数");
        assert.strictEqual(statValue(win, "real-audience__noble"), "321", "贵宾数 ← nobleCnt");

        const hint = statTitle(win, "real-audience__t");
        assert.ok(/本机自 \d{2}:\d{2} 起观测/.test(hint), "title 必须补「本机自 HH:mm 起观测」，实际 " + hint);
        assert.ok(hint.indexOf("今日累计活跃人数:12345") === 0, "原有 title 文案必须保持在前，实际 " + hint);
        assert.ok(statTitle(win, "real-audience__money").indexOf("总礼物价值:123.45") === 0, "礼物 title 原文案保持");

        // DOM 结构：id 集合、图标数、外层包装一个都不能变
        const after = barFingerprint(win);
        assert.deepStrictEqual(after.ids, before.ids, "写入数值不得改变 id 集合/顺序");
        assert.deepStrictEqual(after.ids, BAR_IDS, "八个 id 必须与改造前完全一致");
        assert.strictEqual(after.iconCount, 4, "四个图标必须还在");
        assert.strictEqual(after.iconCount, before.iconCount);
        assert.deepStrictEqual(after.wraps, before.wraps, "外层包装与顺序必须一致");
        assert.strictEqual(after.classList, "real-audience", "统计条根类名不变");
        assert.strictEqual(win.document.querySelectorAll(".real-audience").length, 1, "不得出现重复统计条");
        assert.ok(
            win.document.querySelector(".layout-Player-announce .real-audience"),
            "落点必须仍在播放器区块"
        );
        // 已播/已观看 仍在（改用本地/官方数据，不依赖档案）
        assert.ok(String(statValue(win, "real-audience__time")).indexOf("已播:") === 0, "已播仍要写");
        ok("② 有 room_day → 互动/弹幕/礼物/贵宾四项正确，id 集合·图标数·包装顺序·落点全部与改动前一致");
        dom.window.close();
    }

    // ③ 不再发出任何跨域（第三方）请求；点击改为打开斗鱼房间页
    {
        const { dom, win, api, gmRequests, opened } = loadRealAudience({ roomDay: roomDayFixture() });
        api.initDom();
        await api.setViewer();
        assert.deepStrictEqual(gmRequests, [], "统计条不得再发任何 GM 请求，实际：" + JSON.stringify(gmRequests));
        assert.strictEqual(
            gmRequests.filter((url) => url.indexOf("doseeing") !== -1).length,
            0,
            "绝不能残留第三方数据站请求"
        );

        // 点击统计条：必须打开斗鱼房间页（不再跳第三方）
        api.clickBar();
        assert.deepStrictEqual(opened, ["https://www.douyu.com/" + api.getRid()], "点击必须打开斗鱼房间页，实际：" + JSON.stringify(opened));
        ok("③ 统计条零跨域请求（GM 桩一次都没被调用），点击改开斗鱼房间页");
        dom.window.close();
    }

    // 读失败不得清空已知数字（沿用 test_real_audience 场景 9 语义）
    {
        // 先成功读到数据
        const first = loadRealAudience({ roomDay: roomDayFixture() });
        first.api.initDom();
        await first.api.setViewer();
        assert.strictEqual(statValue(first.win, "real-audience__total"), "12345");

        // 同一实例上换一个「读就抛」的 ArchiveDB 不可能（模块闭包已定），
        // 因此改用"读到空 room_day"来验证：已有数字后不得被未观测覆盖。
        first.dom.window.close();

        const failing = loadRealAudience({ throws: true });
        failing.api.initDom();
        await failing.api.setViewer();
        assert.strictEqual(
            statValue(failing.win, "real-audience__total"),
            "未观测",
            "从未观测到过时读失败也只能显示未观测（不能是 **** / 0）"
        );
        assert.ok(
            failing.warnings.some((text) => text.indexOf("真实人数") !== -1),
            "读失败必须留 warn 线索，实际：" + JSON.stringify(failing.warnings)
        );
        await assert.doesNotReject(failing.api.setViewer(), "读失败不得让 setViewer 抛异常");
        ok("③c 读失败不抛异常、留 warn 线索、从未观测过时如实显示未观测");
        failing.dom.window.close();
    }

    // ArchiveDB 整个不存在 → 退化到未观测，不崩
    {
        const { dom, win, api, warnings } = loadRealAudience({ absent: true });
        api.initDom();
        await assert.doesNotReject(api.setViewer(), "ArchiveDB 缺失时 setViewer 必须安全返回");
        assert.strictEqual(statValue(win, "real-audience__total"), "未观测", "ArchiveDB 缺失也要给「未观测」");
        assert.ok(
            warnings.some((text) => text.indexOf("unsupported") !== -1 || text.indexOf("真实人数") !== -1),
            "缺失必须留痕，实际：" + JSON.stringify(warnings)
        );
        ok("③d ArchiveDB 不存在 → 「未观测」+ 告警，不抛异常");
        dom.window.close();
    }
}

/* ================================================================== */
/* 二、弹幕历史面板（DanmakuHistory）                                   */
/* ================================================================== */

const CARD_HTML = `
<div class="NormalCard NormalCard-common">
  <div class="NormalCard-close">×</div>
  <div class="NormalCard-content">
    <div class="NormalCard-main clearFix">
      <a class="NormalCard-avatar" href="//yuba.douyu.com/wbapi/web/jumpusercenter?id=109771700&amp;name=x"></a>
      <div class="NormalCard-title">
        <a class="NormalCard-name" href="//yuba.douyu.com/wbapi/web/jumpusercenter?id=109771700&amp;name=x">国服第一黑粉z</a>
      </div>
    </div>
    <div class="NormalCard-action">
      <a class="NormalCard-btn">举报用户</a>
      <a class="NormalCard-btn">关注</a>
    </div>
  </div>
</div>`;

const TARGET_UID = "109771700";
const CURRENT_RID = "71415";

function chatRecord(index, text, rid) {
    return {
        kind: "chat",
        txt: text,
        ts: new Date(2026, 9, 17, 20, 30, index).getTime(),
        rid: rid || CURRENT_RID,
        roomName: "寅子",
        uid: TARGET_UID,
    };
}

function giftRecord() {
    return {
        kind: "gift",
        txt: "",
        gfn: "烟花",
        gfcnt: 5,
        rid: "12869486",
        roomName: "白佑兮",
        ts: new Date(2026, 9, 17, 21, 0, 0).getTime(),
        uid: TARGET_UID,
    };
}

/**
 * 面板宿主桩。records 由 opts.query 决定；ArchiveReplay / ArchiveMeta 按需注入。
 */
function loadHistory(options) {
    const settings = options || {};
    const dom = new JSDOM(
        `<!DOCTYPE html><html><body>${CARD_HTML}</body></html>`,
        { url: "https://www.douyu.com/" + CURRENT_RID, runScripts: "dangerously" }
    );
    const win = dom.window;

    const opened = [];
    const messages = [];
    const queryCalls = [];
    const replayCalls = [];
    const metaCalls = [];

    const ArchiveDB = settings.absent ? undefined : {
        queryUserDay: (uid, dayKey, queryOptions) => {
            queryCalls.push({ uid, dayKey, offset: queryOptions.offset, limit: queryOptions.limit });
            if (settings.queryThrows) throw new Error("idb 炸了");
            const plan = settings.query ? settings.query(uid, dayKey, queryOptions) : { list: [], hasMore: false };
            if (plan.neverRespond) return new Promise(() => {});
            return Promise.resolve(plan);
        },
        stats: () => Promise.resolve(settings.stats === undefined
            ? { ok: true, rooms: 0, oldestDay: "", newestDay: "" }
            : settings.stats),
    };

    const ArchiveReplay = settings.noReplay ? undefined : {
        queryUserHistory: (uid, rid, replayOptions) => {
            replayCalls.push({ uid, rid, options: replayOptions });
            const plan = settings.replay ? settings.replay(uid, rid, replayOptions) : { ok: true, items: [] };
            return Promise.resolve(plan);
        },
    };

    const ArchiveMeta = settings.noMeta ? undefined : {
        room: (rid) => {
            metaCalls.push(rid);
            const plan = settings.meta ? settings.meta(rid) : { ok: false };
            return Promise.resolve(plan);
        },
    };

    const factory = new Function(
        "document", "setTimeout", "clearTimeout", "MutationObserver",
        "ArchiveDB", "ArchiveReplay", "ArchiveMeta", "rid",
        "openPage", "showMessage", "ensureMiuixPanelHeader", "openMiuixPanelCentered",
        extractLocalDateFn() + "\n" + HISTORY_SRC + `
        return {
            init: initPkg_DanmakuHistory,
            scan: DanmakuHistory_scanAndInject,
            open: DanmakuHistory_open,
            buttons: function () { return Array.prototype.slice.call(document.querySelectorAll(".dyex-danmaku-history")); },
            panel: function () { return document.querySelector(".danmaku-history-panel"); },
            status: function () { var e = document.querySelector(".danmaku-history-panel__status-text"); return e ? e.textContent : null; },
            statusClass: function () { var e = document.querySelector(".danmaku-history-panel__status-text"); return e ? String(e.className) : null; },
            moreVisible: function () { var e = document.querySelector('[data-act="more"]'); return !!(e && e.classList.contains("is-visible")); },
            replayVisible: function () { var e = document.querySelector('[data-act="replay"]'); return !!(e && e.classList.contains("is-visible")); },
            sourceText: function () { var e = document.querySelector(".danmaku-history-panel__source"); return e ? e.textContent : null; },
            rows: function () { return Array.prototype.slice.call(document.querySelectorAll(".danmaku-history-panel__row")); },
            rowTitles: function () {
                return Array.prototype.slice.call(document.querySelectorAll(".danmaku-history-panel__row .sign-option-title")).map(function (e) { return e.textContent; });
            },
            rowDescs: function () {
                return Array.prototype.slice.call(document.querySelectorAll(".danmaku-history-panel__row .sign-option-desc")).map(function (e) { return e.textContent; });
            },
            rowBadges: function () {
                return Array.prototype.slice.call(document.querySelectorAll(".danmaku-history-panel__badge")).map(function (e) { return e.textContent; });
            },
            dateText: function () { var e = document.querySelector(".danmaku-history-panel__date"); return e ? e.textContent : null; },
            countText: function () { var e = document.querySelector(".danmaku-history-panel__count"); return e ? e.textContent : null; },
            clickMore: function () { document.querySelector('[data-act="more"]').click(); },
            clickReplay: function () { document.querySelector('[data-act="replay"]').click(); },
            clickPrev: function () { document.querySelector('.danmaku-history-panel__date-btn[data-act="prev"]').click(); },
            clickOutside: function () {
                var event = document.createEvent("MouseEvents");
                event.initMouseEvent("mousedown", true, true, document.defaultView, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                document.body.dispatchEvent(event);
            },
            localDate: getLocalDateStr
        };
        `
    );

    const api = factory(
        win.document,
        win.setTimeout,
        win.clearTimeout,
        win.MutationObserver,
        ArchiveDB,
        ArchiveReplay,
        ArchiveMeta,
        settings.noRid ? undefined : CURRENT_RID,
        (url) => opened.push(url),
        (msg, type) => messages.push({ msg, type }),
        () => {},
        () => {}
    );

    return { dom, win, api, opened, messages, queryCalls, replayCalls, metaCalls };
}

function openPanel(module) {
    module.api.init();
    module.api.scan();
    const button = module.api.buttons()[0];
    assert.ok(button, "卡片上必须注入「弹幕历史」入口按钮");
    button.click();
    return module.api.panel();
}

async function testHistoryPanel() {
    console.log("=== P0-7 弹幕历史面板：数据源改本机档案 ===");

    // ④ 3 条记录 → 3 行，礼物行显示「赠送 X×N」
    {
        const module = loadHistory({
            query: () => ({ ok: true, hasMore: false, list: [chatRecord(0, "第一条弹幕"), chatRecord(1, "第二条弹幕"), giftRecord()] }),
        });
        openPanel(module);
        await wait(20);

        const rows = module.api.rows();
        assert.strictEqual(rows.length, 3, "本机档案返回 3 条 → 必须渲染 3 行，实际 " + rows.length);
        const titles = module.api.rowTitles();
        assert.strictEqual(titles[0], "第一条弹幕", "弹幕行显示正文");
        assert.strictEqual(titles[2], "赠送 烟花 ×5", "礼物行必须显示「赠送 X×N」，实际 " + JSON.stringify(titles[2]));
        const badges = module.api.rowBadges();
        assert.strictEqual(badges[0], "弹");
        assert.strictEqual(badges[2], "礼", "礼物行徽标必须是「礼」");
        assert.strictEqual(module.queryCalls[0].uid, TARGET_UID, "查询必须带上卡片解析出的 uid");
        assert.strictEqual(module.queryCalls[0].dayKey, localToday(), "查询日必须是本地当天");
        assert.strictEqual(module.queryCalls[0].limit, 50, "单页固定 50 条（契约）");
        assert.strictEqual(module.queryCalls[0].offset, 0);
        assert.strictEqual(module.api.status(), "本地有 3 条（已全部加载）", "状态行必须报「本地有 N 条」，实际 " + module.api.status());
        assert.strictEqual(module.api.countText(), "已加载 3 条");
        ok("④ queryUserDay 返回 3 条 → 渲染 3 行，礼物行「赠送 烟花 ×5」+ 徽标「礼」+ 状态「本地有 3 条」");
        module.dom.window.close();
    }

    // ⑤ 空结果 → 「本地未收录」
    {
        const module = loadHistory({ query: () => ({ ok: true, hasMore: false, list: [] }) });
        openPanel(module);
        await wait(20);
        assert.strictEqual(module.api.rows().length, 0, "空结果不该有行");
        assert.strictEqual(module.api.status(), "本地未收录", "空结果必须如实说「本地未收录」，实际 " + module.api.status());
        ok("⑤ 空结果 → 状态行「本地未收录」（不假装有数据、不显示 0 条）");
        module.dom.window.close();
    }

    // ⑥ 回放按钮：ArchiveReplay 存在时渲染，点击追加结果并标注「回放抽样口径」
    {
        const module = loadHistory({
            query: () => ({ ok: true, hasMore: false, list: [] }),
            replay: () => ({
                ok: true,
                sampled: true,
                items: [
                    { uid: TARGET_UID, nn: "国服第一黑粉z", txt: "回放里的弹幕 A", ts: Date.now() - 5000, rid: CURRENT_RID },
                    { uid: TARGET_UID, nn: "国服第一黑粉z", txt: "回放里的弹幕 B", ts: Date.now() - 4000, rid: CURRENT_RID },
                ],
            }),
        });
        openPanel(module);
        await wait(20);
        assert.strictEqual(module.api.replayVisible(), true, "ArchiveReplay 存在 → 必须渲染「查本房间回放」按钮");

        module.api.clickReplay();
        await wait(30);
        assert.strictEqual(module.replayCalls.length, 1, "点击必须真的调 ArchiveReplay.queryUserHistory");
        assert.strictEqual(module.replayCalls[0].uid, TARGET_UID);
        assert.strictEqual(module.replayCalls[0].rid, CURRENT_RID, "回放查询必须用当前直播间 rid");
        assert.strictEqual(module.replayCalls[0].options.fromDayKey, localToday(), "日期窗口起点 = 当前日期");
        assert.strictEqual(module.replayCalls[0].options.toDayKey, localToday(), "日期窗口终点 = 当前日期");
        assert.strictEqual(module.replayCalls[0].options.maxPages, 10, "maxPages 必须是 10");

        assert.strictEqual(module.api.rows().length, 2, "回放结果必须追加显示");
        assert.ok(
            String(module.api.status()).indexOf("回放抽样口径") !== -1,
            "回放结果必须标注「回放抽样口径」，实际 " + module.api.status()
        );
        assert.ok(
            String(module.api.rowTitles()[0]).indexOf("回放里的弹幕") !== -1,
            "追加的行必须是回放内容"
        );
        ok("⑥ 回放按钮：ArchiveReplay 存在才渲染；点击按 (今天, 今天, maxPages:10) 查询并追加，且标注「回放抽样口径」");
        module.dom.window.close();
    }

    // ⑥b ArchiveReplay 不存在 → 按钮不渲染
    {
        const module = loadHistory({ noReplay: true, query: () => ({ ok: true, hasMore: false, list: [] }) });
        openPanel(module);
        await wait(20);
        assert.strictEqual(module.api.replayVisible(), false, "ArchiveReplay 缺失时按钮必须隐藏");
        ok("⑥b ArchiveReplay 不存在 → 「查本房间回放」不渲染");
        module.dom.window.close();
    }

    // ⑦ 翻页：hasMore → 「加载更多」可见，点击后 offset 前进
    {
        const module = loadHistory({
            query: (uid, dayKey, queryOptions) => ({
                ok: true,
                hasMore: queryOptions.offset === 0,
                list: queryOptions.offset === 0
                    ? [chatRecord(0, "第 1 条"), chatRecord(1, "第 2 条")]
                    : [chatRecord(2, "第 3 条")],
            }),
        });
        openPanel(module);
        await wait(20);
        assert.strictEqual(module.api.moreVisible(), true, "hasMore 为 true 时「加载更多」必须可见");
        assert.strictEqual(module.api.rows().length, 2);

        module.api.clickMore();
        await wait(20);
        assert.strictEqual(module.queryCalls.length, 2, "点击「加载更多」必须再查一次");
        assert.strictEqual(module.queryCalls[1].offset, 50, "第二次查询 offset 必须前进 50，实际 " + module.queryCalls[1].offset);
        assert.strictEqual(module.api.rows().length, 3, "第二页必须追加而不是覆盖");
        assert.strictEqual(module.api.moreVisible(), false, "hasMore 为 false 后「加载更多」必须隐藏");
        ok("⑦ 翻页：hasMore → 「加载更多」可见；点击后 offset=50 追加渲染；末页后按钮隐藏");
        module.dom.window.close();
    }

    // ⑧ 静态校验：两个文件都不再出现第三方数据站字样
    {
        ["doseeing"].forEach((token) => {
            assert.strictEqual(
                REAL_AUDIENCE_SRC.indexOf(token), -1,
                "RealAudience.js 不得再出现 " + token + "（连注释也不行）"
            );
            assert.strictEqual(
                HISTORY_SRC.indexOf(token), -1,
                "DanmakuHistory.js 不得再出现 " + token + "（连注释也不行）"
            );
        });
        // 跨域请求的检查要剔除注释：说明"旧实现用它做过什么"的注释不算依赖。
        assert.strictEqual(stripComments(REAL_AUDIENCE_SRC).indexOf("GM_xmlhttpRequest"), -1, "统计条不得再依赖跨域请求");
        assert.strictEqual(stripComments(HISTORY_SRC).indexOf("GM_xmlhttpRequest"), -1, "面板不得再依赖跨域请求");
        ok("⑧ 静态校验：两个文件都不含第三方数据站字样、代码里不含 GM_xmlhttpRequest");
    }

    // ⑨ 标题栏来源行：stats → 「本地档案 · 覆盖 N 房间 / M 天」
    {
        const module = loadHistory({
            query: () => ({ ok: true, hasMore: false, list: [] }),
            stats: { ok: true, rooms: 3, oldestDay: "2026-10-13", newestDay: "2026-10-17", events: 99 },
        });
        openPanel(module);
        await wait(20);
        assert.strictEqual(
            module.api.sourceText(),
            "本地档案 · 覆盖 3 房间 / 5 天",
            "标题栏必须显示来源与覆盖范围，实际 " + module.api.sourceText()
        );
        ok("⑨ 标题栏来源行：「本地档案 · 覆盖 3 房间 / 5 天」（stats 口径，含首尾）");
        module.dom.window.close();
    }

    // ⑨b stats 拿不到 → 只写「本地档案」
    {
        const module = loadHistory({
            absent: true,
            query: () => ({ ok: false, reason: "unsupported", list: [], hasMore: false }),
        });
        openPanel(module);
        await wait(20);
        assert.strictEqual(module.api.sourceText(), "本地档案", "没有 stats 时只写「本地档案」");
        assert.strictEqual(
            module.api.status(),
            "本机档案不可用（当前环境不支持 IndexedDB）",
            "ArchiveDB 缺失必须是明确的 unsupported 文案，实际 " + module.api.status()
        );
        ok("⑨b ArchiveDB 缺失 → 来源行「本地档案」、状态行明确说明不支持");
        module.dom.window.close();
    }

    // ⑩ 房间名缺失 → ArchiveMeta.room(rid) 补齐；补不到保留「未知直播间」
    {
        const module = loadHistory({
            query: () => ({
                ok: true,
                hasMore: false,
                list: [
                    { kind: "chat", txt: "无房间名", ts: Date.now(), rid: "9999", roomName: "", uid: TARGET_UID },
                    { kind: "chat", txt: "有房间名", ts: Date.now(), rid: "8888", roomName: "已有名", uid: TARGET_UID },
                ],
            }),
            meta: (rid) => (rid === "9999"
                ? { ok: true, room: { rid: "9999", roomName: "yyf的直播间" } }
                : { ok: false, reason: "bad-arg" }),
        });
        openPanel(module);
        await wait(30);
        const descs = module.api.rowDescs();
        assert.ok(descs[0].indexOf("yyf的直播间") === 0, "缺房间名必须用 ArchiveMeta 补齐，实际 " + descs[0]);
        assert.strictEqual(descs[1].indexOf("已有名"), 0, "档案里有房间名就不该覆盖");
        assert.deepStrictEqual(module.metaCalls, ["9999"], "只对缺名字的行查一次 ArchiveMeta");
        ok("⑩ 房间名缺失 → ArchiveMeta.room(rid) 补齐；已存的房间名不覆盖；无 rid 不查");
        module.dom.window.close();
    }

    // ⑪ 换日：日期回退一天并按新日期重查（offset 归零）
    {
        const module = loadHistory({ query: () => ({ ok: true, hasMore: false, list: [chatRecord(0, "x")] }) });
        openPanel(module);
        await wait(20);
        module.api.clickPrev();
        await wait(20);
        assert.strictEqual(module.queryCalls.length, 2, "换日必须重查");
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const pad = (value) => (value < 10 ? "0" + value : "" + value);
        const expected = yesterday.getFullYear() + "-" + pad(yesterday.getMonth() + 1) + "-" + pad(yesterday.getDate());
        assert.strictEqual(module.queryCalls[1].dayKey, expected, "必须按前一天查询，实际 " + module.queryCalls[1].dayKey);
        assert.strictEqual(module.queryCalls[1].offset, 0, "换日后 offset 必须归零");
        assert.strictEqual(module.api.rows().length, 1, "换日必须清空旧行再渲染");
        ok("⑪ 换日箭头：按前一天重查、offset 归零、清空旧行");
        module.dom.window.close();
    }

    // ⑫ 外部点击收起（原行为保留）
    {
        const module = loadHistory({ query: () => ({ ok: true, hasMore: false, list: [] }) });
        const panel = openPanel(module);
        await wait(20);
        assert.ok(panel && panel.style.display !== "none", "打开时可见");
        module.api.clickOutside();
        await wait(10);
        assert.strictEqual(
            String(module.api.panel().style.display),
            "none",
            "点击面板外部必须收起（否则会挡住聊天区）"
        );
        ok("⑫ 外部点击收起：保留");
        module.dom.window.close();
    }
}

/* ================================================================== */

(async function main() {
    await testStatsBar();
    await testHistoryPanel();
    console.log(`\n=== 统计条 + 弹幕历史面板 界面层测试全部通过（${passed} 项） ===`);
})().then(() => process.exit(0)).catch((error) => {
    console.error("\n✗ 测试失败:", error && error.message);
    if (error && error.stack) console.error(error.stack.split("\n").slice(1, 4).join("\n"));
    process.exit(1);
});
