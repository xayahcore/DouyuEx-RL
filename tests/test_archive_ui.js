/**
 * 「数据档案」第 10 个 Dock 面板（DanmakuArchive_UI.js·瘦身版）专项测试
 *
 * 搭法与 tests/test_danmaku_history.js 一致：真实源码 + jsdom + 接口桩。
 * 额外从 ExPanel.js 抽出真实的 ensureMiuixPanelHeader / openMiuixPanelCentered 一并注入，
 * 这样"点图标 → 面板真的 flex 打开"验的是线上同一份实现，而不是桩件自说自话。
 *
 * 覆盖：
 *   ①  Dock 图标落在 .ex-panel__wrap 内，且 nextElementSibling 是 .ex-update（插在检查更新之前）
 *   ①-2 检查更新图标迟到时，轮询把本图标补位到它之前
 *   ②  重复 init() 幂等，不会插出第二个图标
 *   ③  点图标 → .ex-archive-panel 出现且 display 非 none
 *   ③-2 每次打开都重新拉数据
 *   ③-3 悬浮（mouseenter）即开，不需要点击；移开不自动关
 *   ③-4 120ms 防抖：连点 5 次 mouseenter 只开一个面板；mouseleave 取消未触发的定时器
 *   ③-5 重复 init() 不叠加监听（一次 mouseenter 只触发一次取数）
 *   ④  所有数据源为空 → 「未收录 / 不可用」，无 NaN / undefined / 0 元
 *   ⑤  窗口只有三档（今天 / 昨天 / 近 7 天），切换真的按对应区间取数
 *   ⑥  有数据时三个核心数字 / 次级行 / 贵宾数 / 覆盖率正确
 *   ⑦  覆盖率口径：今日 13 点 + 观测 60 分钟 = 7.7%；观测 0 分钟 = 0.0%（不是「—」）
 *   ⑧  多日窗口：贵宾数「—」+ 仅今日口径 tooltip；活跃值「人·日」tooltip
 *   ⑨  装入真实 ArchiveMetrics 联调：summarizeWindow / coverageOf 主路径（今日 + 近 7 天）
 *   ⑩  维护区只剩「已用体积 + 房间数」，事件数/用户数/最近写入/时钟偏差全部消失
 *   ⑪  被删区块彻底消失（文案 + DOM 类名 + CSS 段）
 *   ⑫  模块全缺位不抛异常，如实提示
 *   ⑬  清理本地档案必须二次确认；确认后清库并刷新
 *   ⑭  导出复用 exportJsonToExcel；缺少该能力时优雅降级
 *   ⑮  源码静态校验：无 380px/370px；ExPanel.css 新增段类名全部 ex-archive- 前缀
 *   ⑯  运行时装配链路存在
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

const UI_PATH = path.join(__dirname, "../src/packages/DanmakuArchive/DanmakuArchive_UI.js");
const METRICS_PATH = path.join(__dirname, "../src/packages/DanmakuArchive/DanmakuArchive_Metrics.js");
const RUNTIME_PATH = path.join(__dirname, "../src/packages/DanmakuArchive/DanmakuArchive.js");
const MONITOR_PATH = path.join(__dirname, "../src/packages/Monitor/Monitor.js");
const EXPANEL_PATH = path.join(__dirname, "../src/packages/ExPanel/ExPanel.js");
const EXPANEL_CSS_PATH = path.join(__dirname, "../src/packages/ExPanel/ExPanel.css");
const COMMON_PATH = path.join(__dirname, "../src/common.js");

const FORBIDDEN_MODAL_SIZES = ["380px", "370px"];
const CSS_SECTION_MARKER = "20. 数据档案面板";
const OTHER_PANEL_CLASSES = [
    "sign-panel", "fans-continue-panel", "extool", "livetool",
    "bloop", "exlottery", "popup-player-panel", "exupdate-panel",
];

/* 被瘦身删掉的区块：文案必须消失，类名必须连根拔掉 */
const REMOVED_TEXTS = ["时段热力", "围观率", "我的观察榜", "与昨日", "上周同日", "今日 TOP", "覆盖率自证", "近 60 分钟", "近 30 天", "贵宾"];
const REMOVED_CLASSES = [
    "ex-archive-heat", "ex-archive-heat__bars", "ex-archive-heat__slot", "ex-archive-heat__fill",
    "ex-archive-heat__axis", "ex-archive-list", "ex-archive-row", "ex-archive-empty",
    "ex-archive-compare", "ex-archive-compare__row", "ex-archive-kv", "ex-archive-badge",
    "ex-archive-user",
];

/* ------------------------------------------------------------------ 源码抽取 */

function extractFromSource(sourcePath, pattern, label) {
    const src = fs.readFileSync(sourcePath, "utf8");
    const matched = src.match(pattern);
    if (!matched) throw new Error(`${label} 抽取失败，测试需同步更新（避免静默失效）`);
    return matched[0];
}

/** 真实的本地日期实现（唯一容易写错的细节：本地分量 vs UTC） */
function extractLocalDateFn() {
    return extractFromSource(COMMON_PATH, /function getLocalDateStr[\s\S]*?\n}/, "common.js getLocalDateStr");
}

/** 真实的三级模态引擎两件套 */
function extractModalEngine() {
    const header = extractFromSource(
        EXPANEL_PATH,
        /function ensureMiuixPanelHeader[\s\S]*?\n}/,
        "ExPanel.js ensureMiuixPanelHeader"
    );
    const centered = extractFromSource(
        EXPANEL_PATH,
        /function openMiuixPanelCentered[\s\S]*?\n}/,
        "ExPanel.js openMiuixPanelCentered"
    );
    return header + "\n" + centered;
}

/** 真实的口径模块（纯函数、无 DOM/IO 依赖，可直接装进来跑） */
function loadRealMetrics() {
    const source = fs.readFileSync(METRICS_PATH, "utf8");
    assert.ok(!/document\.|window\.|indexedDB|fetch\(/.test(source),
        "DanmakuArchive_Metrics.js 应保持纯函数（无 DOM/IO），否则本测试的直装方式需要同步更新");
    const factory = new Function(source + "\nreturn ArchiveMetrics;");
    return factory();
}

/**
 * 可钉死"现在"的 Date 替身：覆盖率的分母是"今日 00:00 至今的分钟数"，
 * 不钉住时钟就没法断言 13 点 → 7.7% 这个口径。
 */
function makeFixedDate(fixedMs) {
    const RealDate = Date;
    function FixedDate(year, month, day, hours, minutes, seconds, ms) {
        if (arguments.length === 0) return new RealDate(fixedMs);
        // new Date(毫秒数) 与 new Date(y, m, d, ...) 两种构造都必须照常工作，
        // 否则被测代码里 new Date(nowMs) 会静默变成 Invalid Date。
        if (arguments.length === 1) return new RealDate(year);
        return new RealDate(year, month, day, hours || 0, minutes || 0, seconds || 0, ms || 0);
    }
    FixedDate.now = function () { return fixedMs; };
    FixedDate.parse = RealDate.parse;
    FixedDate.UTC = RealDate.UTC;
    FixedDate.prototype = RealDate.prototype;
    return FixedDate;
}

/* ------------------------------------------------------------------ 夹具 */

const DOCK_HTML = `
<div class="ex-panel" style="display:flex">
  <button type="button" class="ex-panel__close">×</button>
  <div class="ex-panel__wrap">
    <div class="ex-sign"><a class="ex-panel__icon" title="一键签到"></a></div>
    <div class="livetool-icon"><a class="ex-panel__icon" title="直播间工具"></a></div>
    <div class="ex-update"><a class="ex-panel__icon" title="版本更新"><i id="ex-update__tip" class="ex-panel__tip"></i></a></div>
  </div>
</div>`;

/** 检查更新图标迟到（Update 包比本包晚插）的场景 */
const DOCK_HTML_WITHOUT_UPDATE = `
<div class="ex-panel" style="display:flex">
  <div class="ex-panel__wrap">
    <div class="ex-sign"><a class="ex-panel__icon" title="一键签到"></a></div>
  </div>
</div>`;

const UPDATE_ICON_HTML = '<div class="ex-update"><a class="ex-panel__icon" title="版本更新"><i id="ex-update__tip" class="ex-panel__tip"></i></a></div>';

/** 契约里的 room_day 形状 */
function makeRoomDay(rid, dayKey, overrides) {
    const base = {
        ridDay: rid + "|" + dayKey,
        rid: String(rid),
        dayKey: dayKey,
        danmakuCnt: 1284,
        incomeCents: 326050,
        giftCnt: 3412,
        activeUv: 412,
        chatUv: 388,
        giftUv: 96,
        paidUv: 71,
        enterUv: 1205,
        nobleCnt: 371,
        firstTs: 0,
        lastTs: 0,
        minutes: {},
        updatedAt: 0,
    };
    return Object.assign(base, overrides || {});
}

/** 新接口 ArchiveDB.sumRoomDays 的返回形状 */
function makeSumResult(opts) {
    const options = opts || {};
    const sum = Object.assign({
        days: 1,
        danmakuCnt: 1284,
        incomeCents: 326050,
        giftCnt: 3412,
        activeUv: 412,
        chatUv: 388,
        giftUv: 96,
        paidUv: 71,
        enterUv: 1205,
        observedMin: 60,
    }, options.sum || {});
    return {
        ok: options.ok === undefined ? true : options.ok,
        days: options.days || [],
        sum: sum,
        latest: Object.assign({ nobleCnt: 371, lastTs: 0 }, options.latest || {}),
    };
}

function makeStubs(plan) {
    const config = plan || {};
    const calls = {
        sumRoomDays: [], getRoomDay: [], stats: 0, clearAll: 0,
        summarizeWindow: [], summarize: [], coverageOf: [], topUsers: [], listRoomDays: [],
    };

    const wrapStats = (value) => {
        if (value === undefined || value === null) {
            return {
                ok: false, reason: "unavailable", windowDays: 30, bytes: 0, rooms: 0, events: 0,
                chatEvents: 0, giftEvents: 0, enterEvents: 0, users: 0, oldestDay: "", newestDay: "",
                lastFlush: 0, clockSkew: 0, prunedDays: 0, roomDetail: [],
            };
        }
        return Object.assign({ ok: true }, value);
    };

    const ArchiveDB = {
        sumRoomDays(rid, fromDayKey, toDayKey) {
            calls.sumRoomDays.push([rid, fromDayKey, toDayKey]);
            const value = config.sumRoomDays ? config.sumRoomDays(rid, fromDayKey, toDayKey) : null;
            return Promise.resolve(value === undefined ? null : value);
        },
        getRoomDay(rid, dayKey) {
            calls.getRoomDay.push([rid, dayKey]);
            const value = config.roomDay ? config.roomDay(rid, dayKey) : null;
            return Promise.resolve(value === undefined ? null : value);
        },
        stats() {
            calls.stats++;
            return Promise.resolve(wrapStats(config.stats ? config.stats() : null));
        },
        clearAll() {
            calls.clearAll++;
            return Promise.resolve({ ok: true });
        },
    };

    const ArchiveMetrics = {
        summarizeWindow(days, windowKey) {
            calls.summarizeWindow.push([days, windowKey]);
            const value = config.summarizeWindow ? config.summarizeWindow(days, windowKey) : null;
            return value === undefined ? null : value;
        },
        summarize(roomDay, options) {
            calls.summarize.push([roomDay, options]);
            const value = config.summarize ? config.summarize(roomDay, options) : null;
            return value === undefined ? null : value;
        },
        coverageOf(observedMin, windowKey, nowMs) {
            calls.coverageOf.push([observedMin, windowKey, nowMs]);
            const value = config.coverageOf ? config.coverageOf(observedMin, windowKey, nowMs) : null;
            return value === undefined ? null : value;
        },
    };

    return {
        ArchiveDB,
        ArchiveMetrics,
        calls,
        snapshot() {
            return config.snapshot ? config.snapshot() : null;
        },
    };
}

/**
 * 每个场景一套全新的 jsdom + 全新模块实例（避免状态串台）。
 */
function setupScenario(plan) {
    const bodyHtml = plan && plan.withoutUpdateIcon ? DOCK_HTML_WITHOUT_UPDATE : DOCK_HTML;
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${bodyHtml}</body></html>`, {
        url: "https://www.douyu.com/9263298",
        pretendToBeVisual: true,
    });
    const win = dom.window;
    const stubs = makeStubs(plan);
    const messages = [];
    const opened = [];
    /* openPage 桩：在线弹幕助手入口点击后必须落到这里 */
    const openedPages = [];
    const DateImpl = plan && plan.fixedNowMs ? makeFixedDate(plan.fixedNowMs) : Date;

    const factory = new Function(
        "document", "window", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date",
        "ArchiveDB", "ArchiveMetrics", "ArchiveRuntime_snapshot",
        "exportJsonToExcel", "showMessage", "confirm", "rid", "URL",
        "openPage", "Monitor_onlineAssistantUrl",
        extractLocalDateFn() + "\n" + extractModalEngine() + "\n" + fs.readFileSync(UI_PATH, "utf8") + `
        return {
            ArchiveUI: ArchiveUI,
            insertDock: archiveUi_insertDockNode,
            coverageLocal: archiveUi_coverageFallback,
            coverageTotal: archiveUi_coverageTotalMinutes,
            formatPercent: archiveUi_formatPercent,
            panel: function () { return document.querySelector(".ex-archive-panel"); },
            dockNode: function () { return document.querySelector(".ex-archive"); },
            field: function (name) {
                var host = document.querySelector(".ex-archive-panel");
                if (!host) return null;
                var node = host.querySelector('[data-field="' + name + '"]');
                return node ? node.textContent : null;
            },
            fieldTitle: function (name) {
                var host = document.querySelector(".ex-archive-panel");
                if (!host) return null;
                var node = host.querySelector('[data-field="' + name + '"]');
                return node ? node.getAttribute("title") : null;
            },
            fieldDisplay: function (name) {
                var host = document.querySelector(".ex-archive-panel");
                if (!host) return null;
                var node = host.querySelector('[data-field="' + name + '"]');
                return node ? node.style.display : null;
            },
            panelText: function () {
                var host = document.querySelector(".ex-archive-panel");
                return host ? host.textContent : "";
            },
            windowButtons: function () {
                var nodes = document.querySelectorAll(".ex-archive-panel [data-window]");
                return Array.prototype.slice.call(nodes);
            },
            clickWindow: function (mode) {
                var host = document.querySelector(".ex-archive-panel");
                var btn = host ? host.querySelector('[data-window="' + mode + '"]') : null;
                if (btn) btn.click();
                return !!btn;
            },
            clickAction: function (action) {
                var host = document.querySelector(".ex-archive-panel");
                var btn = host ? host.querySelector('[data-action="' + action + '"]') : null;
                if (btn) btn.click();
                return !!btn;
            }
        };`
    );

    const exported = plan && plan.noExport
        ? undefined
        : function (header, body, fileName) { opened.push({ header, body, fileName }); };

    const api = factory(
        win.document,
        win,
        win.setTimeout,
        win.clearTimeout,
        win.setInterval,
        win.clearInterval,
        DateImpl,
        plan && plan.missingModules ? undefined : stubs.ArchiveDB,
        plan && plan.missingModules ? undefined : (plan && plan.realMetrics ? loadRealMetrics() : stubs.ArchiveMetrics),
        stubs.snapshot,
        exported,
        function (msg, type) { messages.push({ msg: msg, type: type }); },
        function () { return plan && plan.confirm !== undefined ? plan.confirm : true; },
        plan && plan.rid !== undefined ? plan.rid : "9263298",
        // jsdom 不支持 createObjectURL，且 <a download> 的点击会触发导航告警；
        // 这里显式钉成"不支持"，专测优雅降级分支（真机走的是 Blob 下载）。
        { createObjectURL: function () { return null; }, revokeObjectURL: function () { } },
        function (url, inNewTab) { openedPages.push({ url: url, newTab: inNewTab }); },
        plan && plan.noMonitor ? undefined : function (roomId) { return "https://www.douyuex.com/" + roomId; }
    );

    return { dom, win, api, stubs, messages, opened, openedPages };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function pad2(v) { return v < 10 ? "0" + v : "" + v; }
function dayKeyOf(date) { return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate()); }
function shiftedDayKey(offset) {
    const now = new Date();
    return dayKeyOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
}

let passed = 0;
function ok(name) {
    passed++;
    console.log(`  ✓ ${name}`);
}

/* 打开面板并等数据就绪的小包装 */
async function openPanel(scenario) {
    scenario.api.ArchiveUI.init();
    scenario.win.document.querySelector(".ex-archive .ex-panel__icon").click();
    await wait(40);
    return scenario.api.panel();
}

async function run() {
    console.log("=== 数据档案面板（第 10 个 Dock·瘦身版）专项测试（真实源码 + jsdom + 接口桩） ===\n");

    const todayKey = dayKeyOf(new Date());
    const yesterdayKey = shiftedDayKey(-1);

    // ---------- ① Dock 图标位置 ----------
    {
        const scenario = setupScenario({});
        const doc = scenario.win.document;
        scenario.api.ArchiveUI.init();

        const wrap = doc.querySelector(".ex-panel__wrap");
        const icon = wrap.querySelector(".ex-archive");
        assert.ok(icon, "init() 后 .ex-panel__wrap 内必须出现 .ex-archive");
        assert.strictEqual(icon.nextElementSibling && icon.nextElementSibling.className, "ex-update",
            "数据档案图标必须紧邻在「检查更新」(.ex-update) 之前（用户要求的硬位置）");
        assert.strictEqual(wrap.firstElementChild.className, "ex-sign",
            "插入不得破坏既有顺序：首位仍应是原本第一个图标");
        assert.strictEqual(icon.querySelector("a.ex-panel__icon").getAttribute("title"), "数据档案");
        assert.ok(icon.querySelector("#ex-archive__tip.ex-panel__tip"), "必须带 ex-archive__tip 指示点（照抄 9 个老包结构）");
        assert.ok(icon.querySelector("svg"), "必须内嵌 svg 图标");
        ok("① .ex-archive 插在 .ex-update 之前，nextElementSibling === .ex-update，且结构同 9 个老包");
    }

    // ---------- ①-2 锚点迟到：检查更新图标比我们晚插 ----------
    {
        const scenario = setupScenario({ withoutUpdateIcon: true });
        const doc = scenario.win.document;
        const wrap = doc.querySelector(".ex-panel__wrap");
        scenario.api.ArchiveUI.init();

        const icon = wrap.querySelector(".ex-archive");
        assert.ok(icon, "容器里没有 .ex-update 时也必须先把图标插进去（兜底首位）");
        assert.strictEqual(wrap.firstElementChild.className, "ex-archive", "锚点缺失时应退化为插到首位");

        wrap.insertAdjacentHTML("beforeend", UPDATE_ICON_HTML);
        assert.strictEqual(icon.nextElementSibling.className, "ex-sign",
            "补位前图标仍停在兜底位置（说明确实需要轮询纠偏）");

        await wait(1300); // 轮询间隔 1s
        assert.strictEqual(icon.nextElementSibling && icon.nextElementSibling.className, "ex-update",
            "检查更新图标迟到时，轮询必须在它出现后把本图标补位到它之前（否则位置要求静默失效）");
        assert.strictEqual(wrap.querySelectorAll(".ex-archive").length, 1, "补位不得插出第二个图标");
        ok("①-2 .ex-update 迟到时轮询自动补位（图标最终仍紧邻在检查更新之前）");
    }

    // ---------- ② 幂等 ----------
    {
        const scenario = setupScenario({});
        const doc = scenario.win.document;
        scenario.api.ArchiveUI.init();
        scenario.api.ArchiveUI.init();
        scenario.api.insertDock();
        scenario.api.ArchiveUI.init();
        assert.strictEqual(doc.querySelectorAll(".ex-archive").length, 1, "重复 init() 不得插出第二个图标");
        assert.strictEqual(doc.querySelectorAll(".ex-panel__wrap > div").length, 4,
            "Dock 内图标总数应稳定为 4（3 个夹具 + 我们的 1 个）");
        ok("② 重复 init() / 重复插入均幂等，Dock 内不出现第二个 .ex-archive");
    }

    // ---------- ③ 点击打开面板 ----------
    {
        const scenario = setupScenario({});
        const doc = scenario.win.document;
        scenario.api.ArchiveUI.init();
        assert.strictEqual(doc.querySelector(".ex-archive-panel"), null, "点击前不应有面板节点");

        doc.querySelector(".ex-archive .ex-panel__icon").click();
        await wait(30);

        const panel = doc.querySelector(".ex-archive-panel");
        assert.ok(panel, "点击图标必须建出 .ex-archive-panel");
        assert.ok(panel.classList.contains("miuix-modal"), "面板必须挂 .miuix-modal（尺寸/磨砂/打开态由铁壁组继承）");
        assert.notStrictEqual(panel.style.display, "none", "点击后 display 必须非 none");
        assert.ok(panel.classList.contains("miuix-modal-in"), "打开态必须带 miuix-modal-in");
        assert.ok(panel.querySelector(".miuix-modal__header"), "必须经 ensureMiuixPanelHeader 生成顶栏");
        assert.strictEqual(panel.querySelector(".miuix-modal__title").textContent, "数据档案");
        assert.ok(panel.querySelector(".miuix-modal__body"), "内容必须落在 .miuix-modal__body 内");
        assert.strictEqual(panel.parentNode, doc.body, "三级面板必须脱离聊天区挂 body（物理越狱规范）");
        ok("③ 点图标 → 面板出现、display 非 none、顶栏标题「数据档案」、挂载到 body");

        const beforeClose = scenario.stubs.calls.sumRoomDays.length;
        scenario.api.ArchiveUI.hide();
        assert.strictEqual(panel.style.display, "none", "hide() 必须把面板收起");
        doc.querySelector(".ex-archive .ex-panel__icon").click();
        await wait(30);
        assert.ok(scenario.stubs.calls.sumRoomDays.length > beforeClose,
            "每次打开都必须重新拉数据，不得复用上一次的结果");
        ok("③-2 收起后再次打开会重新拉数据（不缓存到永远不更新）");
    }

    // ---------- ③-3 悬浮即开（不派发任何 click） ----------
    {
        const scenario = setupScenario({
            sumRoomDays: () => makeSumResult({}),
            summarizeWindow: () => ({ danmakuValue: 10, incomeYc: 5, activeUv: 2, chatUv: 2, giftUv: 1, enterUv: 3 }),
        });
        const doc = scenario.win.document;
        scenario.api.ArchiveUI.init();
        const iconLink = doc.querySelector(".ex-archive a.ex-panel__icon");
        assert.ok(iconLink, "图标必须带 <a class=ex-panel__icon>（悬浮绑在它上面）");
        assert.strictEqual(doc.querySelector(".ex-archive-panel"), null, "悬浮之前不应有面板节点");

        // 只派发 mouseenter，全程不派发 click
        iconLink.dispatchEvent(new scenario.win.Event("mouseenter"));
        assert.strictEqual(doc.querySelector(".ex-archive-panel"), null,
            "120ms 防抖窗口内不得立刻建面板（否则快速划过会连弹）");

        await wait(220);
        const panel = doc.querySelector(".ex-archive-panel");
        assert.ok(panel, "仅靠 mouseenter（零 click）就必须打开面板");
        assert.notStrictEqual(panel.style.display, "none", "悬浮打开后面板 display 必须非 none");
        assert.ok(panel.classList.contains("miuix-modal-in"), "悬浮打开也必须走 miuix 打开态");

        // 移开就收起（只给 90ms 宽限，让鼠标能移进面板；超过就隐藏）
        iconLink.dispatchEvent(new scenario.win.Event("mouseleave"));
        await wait(40);
        assert.notStrictEqual(panel.style.display, "none", "宽限期内（<90ms）还不能收起，否则移进面板就点不到按钮");
        await wait(200);
        assert.strictEqual(panel.style.display, "none", "移开后必须在宽限期结束时自动收起");
        ok("③-3 悬浮 120ms 后自动打开（未派发任何 click），移开后自动收起");
    }

    // ---------- ③-3b 移进面板不收起：面板 mouseenter 必须取消收起 ----------
    {
        const scenario = setupScenario({});
        scenario.api.ArchiveUI.init();
        const doc = scenario.win.document;
        const iconLink = doc.querySelector(".ex-archive a.ex-panel__icon");
        iconLink.dispatchEvent(new scenario.win.Event("mouseenter"));
        await wait(220);
        const panel = doc.querySelector(".ex-archive-panel");
        assert.ok(panel, "hover 后应先打开面板");

        iconLink.dispatchEvent(new scenario.win.Event("mouseleave"));
        // 在 90ms 宽限期内把鼠标移进面板
        await wait(20);
        panel.dispatchEvent(new scenario.win.Event("mouseenter"));
        await wait(240);
        assert.notStrictEqual(panel.style.display, "none", "移进面板必须取消收起，否则按钮点不到");

        // 从面板离开 → 立即收起
        panel.dispatchEvent(new scenario.win.Event("mouseleave"));
        await wait(40);
        assert.strictEqual(panel.style.display, "none", "从面板移开必须立刻收起");
        ok("③-3b 移进面板取消收起、移出面板立刻收起");
    }

    // ---------- ③-4 防抖 + mouseleave 取消 ----------
    {
        const scenario = setupScenario({
            sumRoomDays: () => makeSumResult({}),
            summarizeWindow: () => ({ danmakuValue: 10, incomeYc: 5, activeUv: 2, chatUv: 2, giftUv: 1, enterUv: 3 }),
        });
        const doc = scenario.win.document;
        scenario.api.ArchiveUI.init();
        const iconLink = doc.querySelector(".ex-archive a.ex-panel__icon");

        for (let i = 0; i < 5; i++) {
            iconLink.dispatchEvent(new scenario.win.Event("mouseenter"));
        }
        await wait(240);
        assert.strictEqual(doc.querySelectorAll(".ex-archive-panel").length, 1,
            "连续 5 次 mouseenter 只能开出一个面板（不得重复创建节点）");
        assert.strictEqual(scenario.stubs.calls.sumRoomDays.length, 1,
            "防抖 + 打开幂等：取数只应发生一次，而不是每次 mouseenter 都来一遍");
        ok("③-4 120ms 防抖：连发 5 次 mouseenter 只开一个面板、只取一次数");

        const cancelScenario = setupScenario({
            sumRoomDays: () => makeSumResult({}),
            summarizeWindow: () => ({ danmakuValue: 10, incomeYc: 5, activeUv: 2 }),
        });
        const cancelDoc = cancelScenario.win.document;
        cancelScenario.api.ArchiveUI.init();
        const cancelLink = cancelDoc.querySelector(".ex-archive a.ex-panel__icon");
        cancelLink.dispatchEvent(new cancelScenario.win.Event("mouseenter"));
        cancelLink.dispatchEvent(new cancelScenario.win.Event("mouseleave"));
        await wait(220);
        assert.strictEqual(cancelDoc.querySelector(".ex-archive-panel"), null,
            "mouseleave 必须清掉未触发的定时器：快速划过不得弹出面板");
        assert.strictEqual(cancelScenario.stubs.calls.sumRoomDays.length, 0, "划过不应触发任何取数");
        ok("③-5 mouseleave 取消未触发的悬浮打开（快速划过 10 个图标不会挨个弹面板）");
    }

    // ---------- ③-6 绑定幂等（重复 init 不叠加监听） ----------
    {
        const scenario = setupScenario({
            sumRoomDays: () => makeSumResult({}),
            summarizeWindow: () => ({ danmakuValue: 10, incomeYc: 5, activeUv: 2 }),
        });
        const doc = scenario.win.document;
        scenario.api.ArchiveUI.init();
        scenario.api.ArchiveUI.init();
        scenario.api.ArchiveUI.init();
        assert.strictEqual(doc.querySelectorAll(".ex-archive").length, 1, "重复 init 不得插出第二个图标");

        const iconLink = doc.querySelector(".ex-archive a.ex-panel__icon");
        assert.strictEqual(iconLink.getAttribute("data-ex-archive-hover-bound"), "1",
            "悬浮监听必须用 data-ex-archive-hover-bound 打标记（幂等依据）");

        const beforeHover = scenario.stubs.calls.sumRoomDays.length;
        iconLink.dispatchEvent(new scenario.win.Event("mouseenter"));
        await wait(220);
        assert.strictEqual(scenario.stubs.calls.sumRoomDays.length - beforeHover, 1,
            "重复 init() 三次后，一次 mouseenter 仍只触发一次取数（没有叠加两组监听）");
        ok("③-6 重复 init() 不叠加悬浮监听（打标记 + 一次 mouseenter 只取一次数）");
    }

    // ---------- ④ 无数据时如实提示 ----------
    {
        const scenario = setupScenario({});
        const panel = await openPanel(scenario);
        const text = panel.textContent;

        assert.ok(/未收录|不可用|—/.test(text), "无数据时必须出现「未收录 / 不可用 / —」字样");
        assert.ok(!/NaN/.test(text), "无数据时不得出现 NaN：\n" + text);
        assert.ok(!/undefined/.test(text), "无数据时不得出现 undefined：\n" + text);
        assert.ok(!/0\s*元/.test(text), "无数据时不得显示 0 元假装有数据");
        assert.strictEqual(scenario.api.field("overview-danmaku"), "未收录", "三大数字无数据时必须是「未收录」而不是 0");
        assert.strictEqual(scenario.api.field("overview-income"), "未收录");
        assert.strictEqual(scenario.api.field("overview-active"), "未收录");
        ["overview-danmaku-unit", "overview-income-unit", "overview-active-unit"].forEach((name) => {
            assert.strictEqual(scenario.api.fieldDisplay(name), "none",
                `数值不可用时单位 ${name} 必须收起，否则会读成「未收录条 / 未收录鱼翅」`);
        });
        // 覆盖率统一改叫「数据覆盖率」：只能有一种写法，不得与旧文案并存
        assert.ok(/数据覆盖率/.test(text), "面板必须出现「数据覆盖率」字样");
        assert.strictEqual(text.split("数据覆盖率").join("").indexOf("覆盖率"), -1,
            "除「数据覆盖率」外不得再有裸「覆盖率」字样（避免两套文案并存）");
        ok("④ 全部数据源为空时，面板如实显示「未收录 / 不可用」，无 NaN / undefined / 0 元；覆盖率文案唯一为「数据覆盖率」");
    }

    // ---------- ⑤ 三档窗口 ----------
    {
        const scenario = setupScenario({
            sumRoomDays: () => makeSumResult({}),
            summarizeWindow: (days, windowKey) => ({ danmakuValue: 100, incomeYc: 0, activeUv: 10, chatUv: 8, giftUv: 2, enterUv: 12 }),
            stats: () => ({ bytes: 3355443, rooms: 1 }),
        });
        const panel = await openPanel(scenario);

        const buttons = scenario.api.windowButtons();
        assert.strictEqual(buttons.length, 3, "窗口只能有三档（不得残留「近 60 分钟」「近 30 天」等第四档）");
        assert.deepStrictEqual(buttons.map((b) => b.textContent), ["今天", "昨天", "近 7 天"],
            "三个 tab 的文案必须逐字为 今天 / 昨天 / 近 7 天");
        assert.ok(buttons[0].classList.contains("is-active"), "默认窗口必须是「今天」");

        const firstCall = scenario.stubs.calls.sumRoomDays[0];
        assert.deepStrictEqual(firstCall, ["9263298", todayKey, todayKey],
            "「今天」必须按 [今天, 今天] 取数（from 与 to 都是今天）");

        scenario.api.clickWindow("yesterday");
        await wait(40);
        const yesterdayCall = scenario.stubs.calls.sumRoomDays[scenario.stubs.calls.sumRoomDays.length - 1];
        assert.deepStrictEqual(yesterdayCall, ["9263298", yesterdayKey, yesterdayKey],
            "「昨天」必须按 [昨天, 昨天] 取数（from 与 to 都是昨天，不能漏成今天）");
        assert.ok(scenario.api.windowButtons()[1].classList.contains("is-active"), "切到昨天后该 tab 必须高亮");

        scenario.api.clickWindow("7d");
        await wait(40);
        const sevenDayCall = scenario.stubs.calls.sumRoomDays[scenario.stubs.calls.sumRoomDays.length - 1];
        assert.deepStrictEqual(sevenDayCall, ["9263298", shiftedDayKey(-6), todayKey],
            "「近 7 天」必须按 [今天-6, 今天] 取数（含今天共 7 个自然日）");
        assert.ok(scenario.api.windowButtons()[2].classList.contains("is-active"), "切到近 7 天后该 tab 必须高亮");
        ok("⑤ 三档窗口文案精确（今天/昨天/近 7 天），切换按 [今天,今天]/[昨天,昨天]/[今天-6,今天] 取数");
    }

    // ---------- ⑥ 有数据：三数字 / 次级行 / 贵宾数 / 覆盖率 ----------
    {
        const fixedNow = new Date(2026, 9, 17, 13, 0, 0).getTime(); // 本地 13:00 整
        const scenario = setupScenario({
            fixedNowMs: fixedNow,
            sumRoomDays: () => makeSumResult({ sum: { observedMin: 60, activeUv: 412 }, latest: { nobleCnt: 371 } }),
            summarizeWindow: () => ({
                danmakuValue: 1284, incomeYc: 3260.5, activeUv: 412,
                chatUv: 388, giftUv: 96, enterUv: 1205, avgPerUser: 3.31,
            }),
            stats: () => ({ bytes: 3355443, rooms: 1 }),
        });
        const panel = await openPanel(scenario);

        assert.strictEqual(scenario.api.field("overview-danmaku"), "1284", "弹幕值取 summarizeWindow 的 danmakuValue");
        assert.strictEqual(scenario.api.field("overview-income"), "3260.5", "收入值取 incomeYc（鱼翅，一位小数）");
        assert.strictEqual(scenario.api.field("overview-active"), "412", "活跃值取 activeUv");
        ["overview-danmaku-unit", "overview-income-unit", "overview-active-unit"].forEach((name) => {
            assert.notStrictEqual(scenario.api.fieldDisplay(name), "none", `有数值时单位 ${name} 必须显示`);
        });
        assert.strictEqual(scenario.api.field("sub-chatuv"), "弹幕人数 388");
        assert.strictEqual(scenario.api.field("sub-giftuv"), "送礼人数 96");
        assert.strictEqual(scenario.api.field("sub-enteruv"), "进场人数 1205");
        assert.ok(/人均发言 3\.3 条/.test(scenario.api.field("sub-avg")), "人均发言用 Metrics 的 avgPerUser=3.31");
        assert.strictEqual(scenario.api.field("sub-noble"), null, "贵宾数已下线：次级行不得再有 sub-noble 节点");
        assert.strictEqual(panel.textContent.indexOf("贵宾"), -1, "面板文案不得再出现「贵宾」");

        // 覆盖率：60 / (13×60) = 7.69% → 7.7%
        assert.strictEqual(scenario.api.field("coverage-line"), "数据覆盖率 7.7%",
            "数据覆盖率 = 观测 60 分钟 ÷ 今日 00:00 至 13:00 的 780 分钟 = 7.7%");
        const coverageTitle = scenario.api.fieldTitle("coverage-line");
        assert.ok(/观测分钟数/.test(coverageTitle) && /780/.test(coverageTitle),
            "覆盖率的 tooltip 必须写清口径（分子=本机观测分钟数，分母=窗口总分钟数）：" + coverageTitle);
        ok("⑥ 有数据时三数字 / 次级行正确，数据覆盖率显示 7.7% 且 tooltip 写明口径");
    }

    // ---------- ⑦ 覆盖率：0 分钟与口径函数 ----------
    {
        const fixedNow = new Date(2026, 9, 17, 13, 0, 0).getTime();
        assert.strictEqual(fixedNow % 1000, 0, "夹具应为整秒");
        const scenario = setupScenario({
            fixedNowMs: fixedNow,
            sumRoomDays: () => makeSumResult({ sum: { observedMin: 0 } }),
            summarizeWindow: () => ({ danmakuValue: 0, incomeYc: 0, activeUv: 0, chatUv: 0, giftUv: 0, enterUv: 0 }),
        });
        const panel = await openPanel(scenario);

        assert.strictEqual(scenario.api.field("coverage-line"), "数据覆盖率 0.0%",
            "观测 0 分钟必须显示 0.0%，而不是「—」（0 是有效测量结果）");
        assert.strictEqual(panel.textContent.indexOf("数据覆盖率 —"), -1, "有观测数据时不得退回「—」");

        // 口径纯函数：今日 13 点 → 分母 780；7 天 → 10080；30 天 → 43200
        const at13 = new Date(2026, 9, 17, 13, 0, 0).getTime();
        assert.strictEqual(scenario.api.coverageLocal(60, "day", at13), 7.7, "今天 13 点 + 60 分钟 → 7.7");
        assert.strictEqual(scenario.api.coverageLocal(0, "day", at13), 0, "观测 0 分钟 → 0.0");
        assert.strictEqual(scenario.api.coverageLocal(60, "yesterday", at13), 4.2, "昨天分母 1440：60/1440 = 4.2%");
        assert.strictEqual(scenario.api.coverageLocal(504, "7d", at13), 5, "近 7 天分母 10080：504/10080 = 5.0%");
        assert.strictEqual(scenario.api.coverageTotal("day", at13), 780, "今天分母 = 00:00 至现在的分钟数");
        assert.strictEqual(scenario.api.coverageTotal("day", new Date(2026, 9, 17, 0, 0, 0).getTime()), 1,
            "不足 1 分钟按 1 计（避免除零）");
        assert.strictEqual(scenario.api.coverageTotal("yesterday", at13), 1440, "昨天分母固定 1440（全天）");
        assert.strictEqual(scenario.api.coverageTotal("7d", at13), 10080);
        ok("⑦ 覆盖率口径：观测 0 → 0.0%（不是「—」）；今天 13 点→7.7%、昨天→4.2%（分母 1440）、7 天分母 10080");
    }

    // ---------- ⑦-2 「昨天」窗口的覆盖率走 ui 全链路 ----------
    {
        const fixedNow = new Date(2026, 9, 17, 13, 0, 0).getTime();
        const scenario = setupScenario({
            fixedNowMs: fixedNow,
            sumRoomDays: () => makeSumResult({ sum: { observedMin: 60 } }),
            summarizeWindow: () => ({ danmakuValue: 10, incomeYc: 5, activeUv: 2, chatUv: 2, giftUv: 1, enterUv: 3 }),
        });
        const panel = await openPanel(scenario);
        scenario.api.clickWindow("yesterday");
        await wait(40);
        assert.strictEqual(scenario.api.field("coverage-line"), "数据覆盖率 4.2%",
            "昨天窗口的覆盖率 = observedMin 60 ÷ 1440 = 4.2%");
        const yesterdayTip = scenario.api.fieldTitle("coverage-line");
        assert.ok(/昨天全天共 1440 分钟/.test(yesterdayTip),
            "昨天窗口的 tooltip 必须写「昨天全天共 1440 分钟」：" + yesterdayTip);
        assert.strictEqual(panel.textContent.indexOf("近 30 天"), -1, "不得残留近 30 天窗口");
        ok("⑦-2 「昨天」窗口：覆盖率 4.2%（60/1440），tooltip 写明昨天全天 1440 分钟");
    }

    // ---------- ⑦-3 抽样标注（有标记才出现） ----------
    {
        const scenario = setupScenario({
            sumRoomDays: () => makeSumResult({
                sum: { detailSampled: true, detailKept: 100000, detailDropped: 400000 },
            }),
            summarizeWindow: () => ({ danmakuValue: 10, incomeYc: 5, activeUv: 2, chatUv: 2, giftUv: 1, enterUv: 3 }),
        });
        const panel = await openPanel(scenario);
        const text = panel.textContent;

        assert.ok(/该窗口明细为抽样/.test(text), "detailSampled=true 时必须出现抽样说明");
        assert.ok(/保留 100000 条/.test(text), "必须写清保留条数（不加千分位）");
        assert.ok(/丢弃 400000 条/.test(text), "必须写清丢弃条数");
        assert.ok(/仍为全量精确/.test(text), "必须说明统计数据仍是全量精确");
        assert.strictEqual(text.indexOf("约"), -1, "抽样不得在数字上加「约」");
        assert.strictEqual(text.indexOf("*"), -1, "抽样不得在数字上加星号");
        assert.notStrictEqual(scenario.api.fieldDisplay("sample-note"), "none", "抽样行必须展开");
        ok("⑦-3 抽样标注：detailSampled=true → 显示保留/丢弃条数，数字不加「约」或星号");
    }

    // ---------- ⑦-4 未抽样：整行不渲染 ----------
    {
        const scenario = setupScenario({
            sumRoomDays: () => makeSumResult({}),
            summarizeWindow: () => ({ danmakuValue: 10, incomeYc: 5, activeUv: 2, chatUv: 2, giftUv: 1, enterUv: 3 }),
        });
        const panel = await openPanel(scenario);
        const text = panel.textContent;

        assert.strictEqual(text.indexOf("该窗口明细为抽样"), -1, "未抽样时不得出现抽样文案");
        assert.strictEqual(text.indexOf("保留 "), -1, "未抽样时不得出现「保留 N 条」");
        assert.strictEqual(scenario.api.fieldDisplay("sample-note"), "none", "未抽样时该行必须收起（不留空行）");
        assert.strictEqual((scenario.api.field("sample-note") || ""), "", "收起时内容必须为空，避免留下空白行");
        ok("⑦-4 未抽样时抽样行整行不渲染（display:none 且内容为空）");
    }

    // ---------- ⑧ 多日窗口：贵宾数「—」+ 人·日 tooltip ----------
    {
        const scenario = setupScenario({
            sumRoomDays: () => makeSumResult({
                days: [
                    makeRoomDay("9263298", shiftedDayKey(-1), { danmakuCnt: 3000, activeUv: 500 }),
                    makeRoomDay("9263298", todayKey, { danmakuCnt: 5888, activeUv: 734 }),
                ],
                sum: { observedMin: 600, activeUv: 1234 },
            }),
            summarizeWindow: (days, windowKey) => ({
                danmakuValue: 8888, incomeYc: 1234.5, activeUv: 1234,
                chatUv: 900, giftUv: 120, enterUv: 3000, avgPerUser: 9.88,
            }),
        });
        const panel = await openPanel(scenario);
        scenario.api.clickWindow("7d");
        await wait(40);

        assert.strictEqual(scenario.api.field("sub-noble"), null, "贵宾数已下线：多日窗口同样不得有该节点");
        assert.strictEqual(panel.textContent.indexOf("贵宾"), -1, "多日窗口面板同样不得出现「贵宾」");
        assert.ok(/人·日/.test(scenario.api.fieldTitle("metric-active")),
            "多日窗口的活跃值 tooltip 必须写明「人·日（各日去重后相加，非跨日去重）」");
        assert.ok(/非跨日去重/.test(scenario.api.fieldTitle("metric-active")));
        assert.strictEqual(scenario.api.field("overview-danmaku"), "8888", "多日窗口取 summarizeWindow 的结果");
        assert.ok(scenario.stubs.calls.summarizeWindow.some((call) => call[1] === "7d"),
            "近 7 天必须把 window=7d 传给 summarizeWindow");
        ok("⑧ 多日窗口：贵宾数整项消失，活跃值标注「人·日（非跨日去重）」");
    }

    // ---------- ⑨ 与真实 ArchiveMetrics 联调（走 summarizeWindow / coverageOf 主路径） ----------
    {
        const fixedNow = new Date(2026, 9, 17, 13, 0, 0).getTime();
        const roomDay = makeRoomDay("9263298", todayKey);
        const scenario = setupScenario({
            fixedNowMs: fixedNow,
            realMetrics: true,
            sumRoomDays: () => makeSumResult({
                days: [roomDay],
                sum: Object.assign({}, roomDay, { observedMin: 60 }),
                latest: { nobleCnt: 371, lastTs: 0 },
            }),
            stats: () => ({ bytes: 1048576, rooms: 1 }),
        });
        await openPanel(scenario);

        assert.strictEqual(scenario.api.field("overview-danmaku"), "1284",
            "真实 metricsSummarizeWindow 返回 danmakuValue，UI 必须读它");
        assert.strictEqual(scenario.api.field("overview-income"), "3260.5",
            "真实 incomeYc 已是鱼翅（3260.5），UI 必须按鱼翅展示且不重复除 100");
        assert.strictEqual(scenario.api.field("overview-active"), "412");
        assert.ok(/人均发言 3\.3 条/.test(scenario.api.field("sub-avg")), "真实 avgPerUser=3.3 必须被采用");
        assert.strictEqual(scenario.api.field("sub-noble"), null,
            "真实 summarizeWindow 即使回传快照字段，面板也不得再渲染贵宾数");
        assert.strictEqual(scenario.api.field("coverage-line"), "数据覆盖率 7.7%",
            "真实 coverageOf(60, day, 13:00) 必须算出 7.7%（分母 780）");
        ok("⑨-1 真实 ArchiveMetrics.summarizeWindow / coverageOf 主路径：danmakuValue / incomeYc / avgPerUser / 数据覆盖率全部正确");

        // 7 天窗口：真实模块会把每日 activeUv 相加并置 activeUvIsPersonDay
        const day1 = makeRoomDay("9263298", yesterdayKey, {
            danmakuCnt: 3000, incomeCents: 100000, activeUv: 500, chatUv: 400, giftUv: 120, enterUv: 900, nobleCnt: 111,
        });
        const day2 = makeRoomDay("9263298", todayKey, {
            danmakuCnt: 5888, incomeCents: 200000, activeUv: 734, chatUv: 800, giftUv: 60, enterUv: 2100, nobleCnt: 371,
        });
        const weekScenario = setupScenario({
            fixedNowMs: fixedNow,
            realMetrics: true,
            sumRoomDays: () => makeSumResult({
                days: [day1, day2],
                sum: { observedMin: 600 },
                latest: { nobleCnt: 371, lastTs: 0 },
            }),
        });
        await openPanel(weekScenario);
        weekScenario.api.clickWindow("7d");
        await wait(40);

        assert.strictEqual(weekScenario.api.field("overview-danmaku"), "8888",
            "7 天弹幕值 = 3000 + 5888（真实模块按日相加）");
        assert.strictEqual(weekScenario.api.field("overview-income"), "3000.0",
            "7 天收入值 = (100000 + 200000) 分 = 3000.0 鱼翅");
        assert.strictEqual(weekScenario.api.field("overview-active"), "1234",
            "7 天活跃值 = 500 + 734（人·日）");
        assert.strictEqual(weekScenario.api.field("sub-noble"), null, "7 天窗口同样不得有贵宾数节点");
        assert.ok(/人·日/.test(weekScenario.api.fieldTitle("metric-active")),
            "真实模块的 activeUvIsPersonDay=true 必须驱动「人·日」tooltip");
        assert.strictEqual(weekScenario.api.field("coverage-line"), "数据覆盖率 6.0%",
            "真实 coverageOf(600, 7d, now) = 600/10080 = 6.0%");
        ok("⑨-2 真实模块的 7 天汇总：按日相加、贵宾数消失、人·日 tooltip、数据覆盖率 6.0%");
    }

    // ---------- ⑨-3 在线弹幕助手：Monitor 包已整体删除，只剩数据档案面板里的一个链接 ----------
    {
        assert.strictEqual(fs.existsSync(MONITOR_PATH), false,
            "Monitor 包必须已删除（在线弹幕助手不再有自己的胶囊图标与三级面板）");
        const mainSrc = fs.readFileSync(path.join(__dirname, "../src/main.js"), "utf8");
        assert.strictEqual(mainSrc.indexOf("initPkg_Monitor"), -1,
            "main.js 里不得再接线 initPkg_Monitor");
        const uiSrc = fs.readFileSync(UI_PATH, "utf8");
        assert.strictEqual(uiSrc.indexOf("Monitor_"), -1,
            "数据档案 UI 不得再依赖 Monitor_ 模块（URL 规则已内置）");
        assert.ok(/function archiveUi_assistantUrl\(/.test(uiSrc),
            "数据档案必须自己提供 archiveUi_assistantUrl（在线弹幕助手入口）");
        ok("⑨-3 Monitor 包已删除：main.js 无接线、UI 无 Monitor_ 依赖、入口链接由数据档案自己实现");
    }

    // ---------- ⑨-4 在线弹幕助手：点击走 openPage，URL 正确 ----------
    {
        const scenario = setupScenario({
            sumRoomDays: () => makeSumResult({}),
            summarizeWindow: () => ({ danmakuValue: 10, incomeYc: 5, activeUv: 2, chatUv: 2, giftUv: 1, enterUv: 3 }),
        });
        const panel = await openPanel(scenario);

        const link = panel.querySelector('[data-field="assistant-link"]');
        assert.ok(link, "面板必须有「在线弹幕助手」入口");
        assert.strictEqual(link.textContent, "在线弹幕助手", "入口文案必须逐字为「在线弹幕助手」");
        assert.ok(!link.classList.contains("is-disabled"), "有房间号时入口必须是可用状态");
        assert.strictEqual(panel.querySelectorAll(".ex-archive-section").length, 2,
            "在线弹幕助手是链接行，不得额外增加区块");

        link.click();
        await wait(20);
        assert.strictEqual(scenario.openedPages.length, 1, "点入口必须调用一次 openPage");
        assert.strictEqual(scenario.openedPages[0].url, "https://www.douyuex.com/9263298",
            "URL 必须是 https://www.douyuex.com/<真 rid>");
        assert.strictEqual(scenario.openedPages[0].newTab, true, "必须在新标签页打开");
        ok("⑨-4 「在线弹幕助手」入口点击 → openPage(\"https://www.douyuex.com/9263298\", true)");

        // 入口的 URL 规则完全内置，不再依赖任何外部模块（Monitor 包已删除）
        const builtInScenario = setupScenario({
            sumRoomDays: () => makeSumResult({}),
            summarizeWindow: () => ({ danmakuValue: 10, incomeYc: 5, activeUv: 2 }),
        });
        const builtInPanel = await openPanel(builtInScenario);
        builtInPanel.querySelector('[data-field="assistant-link"]').click();
        await wait(20);
        assert.strictEqual(builtInScenario.openedPages.length, 1, "内置规则下入口必须能打开");
        assert.strictEqual(builtInScenario.openedPages[0].url, "https://www.douyuex.com/9263298",
            "URL 由数据档案自己拼：https://www.douyuex.com/<rid>");
        ok("⑨-4b 入口 URL 规则内置在数据档案里（无外部模块依赖），链接照常可用");
    }

    // ---------- ⑨-5 房间号缺失：入口禁用，不导航到 undefined ----------
    {
        const scenario = setupScenario({
            rid: "",
            sumRoomDays: () => makeSumResult({}),
            summarizeWindow: () => ({ danmakuValue: 10, incomeYc: 5, activeUv: 2 }),
        });
        const panel = await openPanel(scenario);
        const link = panel.querySelector('[data-field="assistant-link"]');
        assert.ok(link, "房间号缺失时入口仍应存在（置灰），而不是消失");
        assert.ok(link.classList.contains("is-disabled"), "房间号缺失时入口必须置灰禁用");
        assert.strictEqual(link.getAttribute("data-href"), null, "禁用时不得挂 URL");
        assert.strictEqual(link.getAttribute("aria-disabled"), "true");

        link.click();
        await wait(20);
        assert.strictEqual(scenario.openedPages.length, 0, "禁用时点击不得打开任何页面");
        assert.strictEqual(scenario.api.panelText().indexOf("douyuex.com/undefined"), -1,
            "任何情况下都不允许出现 douyuex.com/undefined 这类死链");
        ok("⑨-5 房间号缺失 → 入口置灰禁用、不挂 URL、点击不导航（绝不出现 douyuex.com/undefined）");
    }
    // ---------- ⑨-6 收入值拆解：钻粉折算 ----------
    {
        const scenario = setupScenario({
            sumRoomDays: () => makeSumResult({ sum: { dfMonths: 4, dfCents: 63200 } }),
            summarizeWindow: () => ({ danmakuValue: 1284, incomeYc: 3260.5, activeUv: 412, chatUv: 388, giftUv: 96, enterUv: 1205 }),
        });
        await openPanel(scenario);
        const tip = scenario.api.fieldTitle("metric-income");
        assert.ok(/钻粉折算/.test(tip), "有钻粉月数时 tooltip 必须出现「钻粉折算」：" + tip);
        assert.ok(/632\.0/.test(tip), "钻粉折算金额应为 632.0 鱼翅（dfCents=63200）：" + tip);
        assert.ok(/4 个月/.test(tip), "必须写明月数 4 个月：" + tip);
        // 真机价目（2026-10-17 实测）：默认按连续包月 158、12 个月档 138；218 单月直购极少见
        assert.ok(/连续包月 158 元\/月/.test(tip), "单价文案必须说明默认按「连续包月 158 元/月」：" + tip);
        assert.ok(/12 个月档 138 元\/月/.test(tip), "单价文案必须含「12 个月档 138 元/月」：" + tip);
        assert.ok(/单月直购 218 元极少见/.test(tip), "必须说明 218 单月直购极少见、不采用：" + tip);
        assert.strictEqual(tip.indexOf("首开"), -1, "文案里不得再出现「首开」：" + tip);
        assert.strictEqual(tip.indexOf("活动价"), -1, "文案里不得再出现「活动价」：" + tip);
        assert.ok(/礼物 2,628\.5 鱼翅/.test(tip),
            "礼物部分 = 收入值 3260.5 − 钻粉 632.0 = 2,628.5（工具提示里带千分位）：" + tip);
        assert.strictEqual(scenario.api.field("overview-income"), "3260.5", "主数字仍只等于 incomeCents");
        ok("⑨-6 收入值 tooltip：钻粉折算 632.0 鱼翅（4 个月）+ 三档单价（218/158/138 元每月，按购买月数分档折算）");
    }

    // ---------- ⑨-7 没有钻粉 → 该行不渲染 ----------
    {
        const scenario = setupScenario({
            sumRoomDays: () => makeSumResult({ sum: { dfMonths: 0, dfCents: 0 } }),
            summarizeWindow: () => ({ danmakuValue: 1284, incomeYc: 3260.5, activeUv: 412, chatUv: 388 }),
        });
        await openPanel(scenario);
        const tip = scenario.api.fieldTitle("metric-income");
        assert.strictEqual(tip.indexOf("钻粉折算"), -1, "dfMonths=0 时不得出现「钻粉折算」这一行：" + tip);
        assert.ok(/礼物 3,260\.5 鱼翅/.test(tip), "没有钻粉时礼物部分应等于整个收入值：" + tip);
        ok("⑨-7 dfMonths=0 → tooltip 不含「钻粉折算」，礼物部分等于全部收入值");
    }

    // ---------- ⑨-8 单价未知次数 ----------
    {
        const withUnknown = setupScenario({
            sumRoomDays: () => makeSumResult({ sum: { unknownGiftCnt: 3 } }),
            summarizeWindow: () => ({ danmakuValue: 1284, incomeYc: 3260.5, activeUv: 412 }),
        });
        await openPanel(withUnknown);
        assert.ok(/3 次礼物单价未知（未计入）/.test(withUnknown.api.fieldTitle("metric-income")),
            "unknownGiftCnt=3 时必须提示 3 次单价未知：" + withUnknown.api.fieldTitle("metric-income"));

        const zeroUnknown = setupScenario({
            sumRoomDays: () => makeSumResult({ sum: { unknownGiftCnt: 0 } }),
            summarizeWindow: () => ({ danmakuValue: 1284, incomeYc: 3260.5, activeUv: 412 }),
        });
        await openPanel(zeroUnknown);
        assert.strictEqual(zeroUnknown.api.fieldTitle("metric-income").indexOf("单价未知"), -1,
            "unknownGiftCnt=0 时不得出现单价未知那一行");
        ok("⑨-8 unknownGiftCnt=3 → 提示「3 次礼物单价未知（未计入）」；为 0 时该行不渲染");
    }

    // ---------- ⑨-9 道具订单实付：另起一行，不并入收入值 ----------
    {
        const baseline = setupScenario({
            sumRoomDays: () => makeSumResult({}),
            summarizeWindow: () => ({ danmakuValue: 1284, incomeYc: 3260.5, activeUv: 412 }),
        });
        await openPanel(baseline);
        const incomeWithoutOrder = baseline.api.field("overview-income");

        const scenario = setupScenario({
            sumRoomDays: () => makeSumResult({ sum: { orderCents: 7900 } }),
            summarizeWindow: () => ({ danmakuValue: 1284, incomeYc: 3260.5, activeUv: 412 }),
        });
        await openPanel(scenario);
        const orderNote = scenario.api.field("order-note");
        assert.strictEqual(orderNote, "另有道具订单实付 79.0 鱼翅（未并入收入值）",
            "维护区必须出现订单实付小字：" + orderNote);
        assert.notStrictEqual(scenario.api.fieldDisplay("order-note"), "none", "有订单金额时该行必须显示");
        assert.strictEqual(scenario.api.field("overview-income"), incomeWithoutOrder,
            "订单实付不得并入主收入值（有/无该字段时收入值必须一致）");
        assert.strictEqual(scenario.api.field("overview-income"), "3260.5");

        const noOrder = setupScenario({
            sumRoomDays: () => makeSumResult({ sum: { orderCents: 0 } }),
            summarizeWindow: () => ({ danmakuValue: 1284, incomeYc: 3260.5, activeUv: 412 }),
        });
        await openPanel(noOrder);
        assert.strictEqual(noOrder.api.field("order-note") || "", "", "orderCents=0 时该行内容必须为空");
        assert.strictEqual(noOrder.api.fieldDisplay("order-note"), "none", "orderCents=0 时该行必须隐藏");
        assert.strictEqual(noOrder.api.panelText().indexOf("另有道具订单实付"), -1, "orderCents=0 时不得出现该文案");
        ok("⑨-9 orderCents=7900 → 维护区「另有道具订单实付 79.0 鱼翅（未并入收入值）」，主收入值不变；为 0 时不渲染");
    }

    // ---------- ⑩ 维护区只剩两项留存数字 ----------
    {
        const scenario = setupScenario({
            sumRoomDays: () => makeSumResult({}),
            summarizeWindow: () => ({ danmakuValue: 10, incomeYc: 5, activeUv: 2, chatUv: 2, giftUv: 1, enterUv: 3 }),
            stats: () => ({
                bytes: 3355443, rooms: 1,
                events: 987654, chatEvents: 900000, giftEvents: 80000, enterEvents: 7654,
                users: 4321, lastFlush: Date.now() - 5000, clockSkew: -20200, windowDays: 30,
            }),
        });
        const panel = await openPanel(scenario);
        const text = panel.textContent;

        assert.ok(/已用体积 3\.2 MB/.test(scenario.api.field("maintain-retention")),
            "维护区必须显示「已用体积 3.2 MB」");
        assert.ok(/房间数 1/.test(scenario.api.field("maintain-retention")),
            "维护区必须显示「房间数 1」");
        ["事件数", "用户数", "最近写入", "时钟偏差"].forEach((word) => {
            assert.strictEqual(text.indexOf(word), -1, `维护区不得再出现「${word}」`);
        });
        // 统计数字本身也不该漏出来
        assert.strictEqual(text.indexOf("987654"), -1, "事件数数值不得出现");
        assert.strictEqual(text.indexOf("4321"), -1, "用户数数值不得出现");
        assert.ok(panel.querySelector('[data-action="refresh"]'), "刷新按钮必须保留");
        assert.ok(panel.querySelector('[data-action="export"]'), "导出 CSV 按钮必须保留");
        assert.ok(panel.querySelector('[data-action="clear"]'), "清理本地档案按钮必须保留");
        ok("⑩ 维护区只剩「已用体积 + 房间数」，事件数/用户数/最近写入/时钟偏差全部消失，三按钮保留");
    }

    // ---------- ⑪ 被删区块彻底消失 ----------
    {
        const scenario = setupScenario({
            sumRoomDays: () => makeSumResult({}),
            summarizeWindow: () => ({ danmakuValue: 10, incomeYc: 5, activeUv: 2, chatUv: 2, giftUv: 1, enterUv: 3 }),
            stats: () => ({ bytes: 1024, rooms: 1 }),
        });
        const panel = await openPanel(scenario);
        const text = panel.textContent.replace(/\s+/g, "");

        REMOVED_TEXTS.forEach((word) => {
            assert.strictEqual(text.indexOf(word.replace(/\s+/g, "")), -1, `面板不得再出现「${word}」`);
        });
        REMOVED_CLASSES.forEach((className) => {
            assert.strictEqual(panel.querySelectorAll("." + className).length, 0,
                `DOM 不得残留被删区块的类名 .${className}`);
        });
        // 连带把"榜单/热力/对比"的整块结构也确认掉（不是只换了文案）
        assert.strictEqual(panel.querySelectorAll(".ex-archive-section").length, 2,
            "面板只应剩「概览」与「维护」两块（在线弹幕助手是一个链接，不是区块）");
        assert.strictEqual(panel.querySelectorAll("[data-field^='heat']").length, 0, "热力柱节点必须一个不剩");
        assert.strictEqual(panel.querySelectorAll("[data-field^='compare']").length, 0, "对比行节点必须一个不剩");
        assert.strictEqual(panel.querySelectorAll("[data-field^='user']").length, 0, "用户历史子面板必须一个不剩");
        assert.strictEqual(panel.querySelectorAll("[data-uid]").length, 0, "TOP 榜行点击入口必须一个不剩");
        assert.strictEqual(panel.querySelectorAll("[data-top]").length, 0, "TOP 榜 tab 必须一个不剩");
        ok("⑪ 七个被删区块彻底消失：8 个字样全无、DOM 类名与结构无残骸（只剩概览 + 维护两块）");
    }

    // ---------- ⑫ 模块全缺位 ----------
    {
        const scenario = setupScenario({ missingModules: true });
        const panel = await openPanel(scenario);

        const text = panel.textContent;
        assert.ok(/不可用|未收录|—/.test(text), "ArchiveDB 等模块全缺位时必须如实提示不可用");
        assert.ok(!/NaN|undefined/.test(text), "模块缺位时同样不得出现 NaN / undefined");
        assert.ok(/ArchiveDB 未就绪/.test(scenario.api.field("overview-note")),
            "必须点名缺位的模块，便于现场定位");
        assert.ok(/已留存数据：不可用/.test(scenario.api.field("maintain-retention")),
            "取不到 stats 时维护区必须说不可用，不能显示 0 MB");
        ok("⑫ ArchiveDB / ArchiveMetrics 全缺位时不抛异常，如实提示「ArchiveDB 未就绪」");
    }

    // ---------- ⑬ 维护动作：清理 ----------
    {
        const scenario = setupScenario({
            confirm: false,
            sumRoomDays: () => makeSumResult({}),
            summarizeWindow: () => ({ danmakuValue: 10, incomeYc: 500, activeUv: 2 }),
        });
        await openPanel(scenario);

        assert.ok(scenario.api.clickAction("clear"), "维护区必须有「清理本地档案」按钮");
        await wait(20);
        assert.strictEqual(scenario.stubs.calls.clearAll, 0, "二次确认被取消时绝对不能调用 clearAll（数据无价）");
        ok("⑬-1 清理本地档案必须二次确认：取消时零调用");

        const confirmScenario = setupScenario({
            confirm: true,
            sumRoomDays: () => makeSumResult({}),
            summarizeWindow: () => ({ danmakuValue: 10, incomeYc: 500, activeUv: 2 }),
        });
        await openPanel(confirmScenario);
        const before = confirmScenario.stubs.calls.sumRoomDays.length;
        confirmScenario.api.clickAction("clear");
        await wait(30);
        assert.strictEqual(confirmScenario.stubs.calls.clearAll, 1, "确认后必须调用一次 clearAll");
        assert.ok(confirmScenario.stubs.calls.sumRoomDays.length > before,
            "清理完成后必须立刻刷新面板（否则界面还挂着已删的数据）");
        ok("⑬-2 确认清理 → clearAll 恰好一次，并立即刷新面板");
    }

    // ---------- ⑭ 导出 ----------
    {
        const scenario = setupScenario({
            sumRoomDays: () => makeSumResult({}),
            summarizeWindow: () => ({ danmakuValue: 10, incomeYc: 500, activeUv: 2, chatUv: 2, giftUv: 1, enterUv: 3 }),
        });
        await openPanel(scenario);
        scenario.api.clickAction("export");
        await wait(10);

        assert.strictEqual(scenario.opened.length, 1, "导出必须真的调用 exportJsonToExcel");
        assert.ok(/\.xlsx$/.test(scenario.opened[0].fileName), "导出文件名应为 xlsx");
        const flat = JSON.stringify(scenario.opened[0].body);
        assert.ok(/弹幕值/.test(flat) && /活跃值/.test(flat) && /数据覆盖率/.test(flat),
            "导出内容必须含三项核心口径 + 数据覆盖率");
        ok("⑭-1 导出复用 exportJsonToExcel，内容含三项核心口径 + 覆盖率");

        const noExportScenario = setupScenario({
            noExport: true,
            sumRoomDays: () => makeSumResult({}),
            summarizeWindow: () => ({ danmakuValue: 10, incomeYc: 500, activeUv: 2 }),
        });
        await openPanel(noExportScenario);
        let threw = false;
        try {
            noExportScenario.api.clickAction("export");
        } catch (e) {
            threw = true;
        }
        await wait(10);
        assert.strictEqual(threw, false, "缺少 exportJsonToExcel 时导出按钮不得抛异常");
        assert.ok(noExportScenario.messages.some((m) => /导出|不支持/.test(m.msg)),
            "必须给出可读提示（jsdom 无 createObjectURL 时优雅降级）");
        ok("⑭-2 缺少 XLSX 导出能力时优雅降级，不抛异常并给出可读提示");
    }

    // ---------- ⑮ 源码静态校验 ----------
    {
        const uiSource = fs.readFileSync(UI_PATH, "utf8");
        FORBIDDEN_MODAL_SIZES.forEach((size) => {
            assert.ok(uiSource.indexOf(size) === -1,
                `UI 源码不得出现 ${size}（全产物各只允许一次，已被 ExPanel 占用）`);
        });
        assert.ok(uiSource.indexOf("380") === -1 && uiSource.indexOf("370") === -1,
            "UI 源码不得出现模态尺寸的数字字面量");
        assert.strictEqual(uiSource.indexOf("nobleCnt"), -1,
            "贵宾数已下线：UI 源码不得再读 nobleCnt（避免留下读不到值的死代码）");
        assert.strictEqual(uiSource.indexOf("贵宾"), -1, "UI 源码不得残留「贵宾」文案");
        assert.strictEqual(uiSource.indexOf("latest"), -1, "UI 源码不得再消费 sumRoomDays 的快照字段");
        // 时段热力 / 分钟桶 / 贵宾数三块残留必须清零（大小写敏感，避免误伤 observedMinutes 之类）
        ["minutes", "hourBuckets", "时段热力", "nobleCnt"].forEach((name) => {
            assert.strictEqual(uiSource.indexOf(name), -1, `UI 源码不得残留已删能力「${name}」`);
        });
        assert.strictEqual(uiSource.indexOf("30d"), -1, "UI 源码不得残留「近 30 天」窗口键");
        // 覆盖率只保留一种写法：所有出现都必须带上「数据」前缀
        assert.strictEqual(uiSource.split("数据覆盖率").join("").indexOf("覆盖率"), -1,
            "UI 源码里除「数据覆盖率」外不得再有裸「覆盖率」文案");
        assert.ok(/var ArchiveUI = \{/.test(uiSource), "必须对外导出 ArchiveUI 对象");
        assert.ok(/function ArchiveUI_init\(\)/.test(uiSource) && /init: ArchiveUI_init/.test(uiSource),
            "ArchiveUI.init 必须存在（DanmakuArchive.js 靠它装配）");

        // 被删能力在源码层面也不能有残骸
        ["openUserHistory", "closeUserHistory", "queryUserHistory", "renderHeat", "renderTop",
            "renderRank", "renderCompare", "sumFromMinutes", "hourBuckets", "formatDelta", "formatClock", "formatSkew"]
            .forEach((name) => {
                assert.strictEqual(uiSource.indexOf(name), -1, `UI 源码不得残留已删能力 ${name} 的定义或引用`);
            });
        ok("⑮-1 UI 源码无 380px/370px、导出 ArchiveUI，且已删能力无任何残留引用");

        const css = fs.readFileSync(EXPANEL_CSS_PATH, "utf8").replace(/\r\n/g, "\n");
        const markerIndex = css.indexOf(CSS_SECTION_MARKER);
        assert.ok(markerIndex > 0, `ExPanel.css 必须包含本包新增段（标记：${CSS_SECTION_MARKER}）`);

        // 从该段注释块的起始处切起，保证注释闭合符在身边（否则注释剥离会把标记本身当成选择器）
        const commentStart = css.lastIndexOf("/*", markerIndex);
        const tail = css.slice(commentStart >= 0 ? commentStart : markerIndex);
        assert.ok(tail.indexOf("`") === -1, "新增段 CSS 不得含反引号（会闭合 main.js 模板字面量）");
        assert.ok(tail.indexOf("${") === -1, "新增段 CSS 不得含 ${ 插值");
        assert.strictEqual((tail.match(/\\[0-9]/g) || []).length, 0, "新增段 CSS 不得含反斜杠+数字");
        FORBIDDEN_MODAL_SIZES.forEach((size) => {
            assert.ok(tail.indexOf(size) === -1, `新增段 CSS 不得出现 ${size}`);
        });
        assert.strictEqual((tail.match(/width:\s*var\(--miuix-modal-width\)/g) || []).length, 0,
            "新增段不得复制模态宽度声明（全产物只允许存在一条，新面板靠 .miuix-modal 继承）");

        const withoutComments = tail.replace(/\/\*[\s\S]*?\*\//g, "");
        const selectors = [];
        const selectorRe = /([^{}]+)\{/g;
        let found;
        while ((found = selectorRe.exec(withoutComments)) !== null) {
            selectors.push(found[1]);
        }
        assert.ok(selectors.length > 0, "新增段必须真的有样式规则");
        selectors.forEach((rawSelector) => {
            rawSelector.split(",").forEach((one) => {
                const selector = one.trim();
                if (!selector) return;
                assert.ok(selector.indexOf(".ex-archive") === 0,
                    `新增段的每个选择器都必须以 .ex-archive 开头，违规：${selector}`);
            });
        });
        /* 借鉴 build 场景 14.2 的口径：不得"接管"别人的三级面板。
           判定按"每个选择器不得以别人的面板类名开头"来查。 */
        OTHER_PANEL_CLASSES.forEach((className) => {
            assert.ok(withoutComments.indexOf("." + className + " ") !== 0
                && withoutComments.indexOf("." + className + "{") !== 0
                && withoutComments.indexOf("." + className + ",") !== 0,
                `新增段不得以 .${className} 作为顶层选择器（应全部上收 ExPanel.css 第 2 节）`);
            selectors.forEach((rawSelector) => {
                rawSelector.split(",").forEach((one) => {
                    const selector = one.trim();
                    if (!selector) return;
                    assert.notStrictEqual(selector.indexOf("." + className), 0,
                        `选择器不得以 .${className} 开头（那是接管别人的面板）：${selector}`);
                });
            });
        });
        REMOVED_CLASSES.forEach((className) => {
            assert.strictEqual(withoutComments.indexOf("." + className), -1,
                `新增段 CSS 不得残留已删区块的 .${className}`);
        });
        ok(`⑮-2 ExPanel.css 新增段：${selectors.length} 条规则全部 ex-archive- 前缀，无禁字符、无越权、无残留规则`);
    }

    // ---------- ⑯ 接线 ----------
    {
        const runtime = fs.readFileSync(RUNTIME_PATH, "utf8");
        assert.ok(/typeof ArchiveUI !== "undefined"/.test(runtime),
            "运行时装配必须用 typeof 判空 ArchiveUI（沙箱里裸引用未声明标识符会抛 ReferenceError）");
        assert.ok(/ArchiveUI\.init\(\)/.test(runtime), "运行时必须调用 ArchiveUI.init()");
        ok("⑯ DanmakuArchive.js 装配链路（typeof 判空 + 调用 init）存在");
    }

    console.log(`\n=== 数据档案面板专项测试全部通过（${passed} 项） ===`);
}

run().then(() => process.exit(0)).catch((e) => {
    console.error("\n✗ 测试失败:", e && e.message);
    if (e && e.stack) console.error(e.stack.split("\n").slice(1, 4).join("\n"));
    process.exit(1);
});
