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

const SRC_PATH = path.join(__dirname, "../src/packages/DanmakuHistory/DanmakuHistory.js");
const COMMON_PATH = path.join(__dirname, "../src/common.js");
const EXPANEL_PATH = path.join(__dirname, "../src/packages/ExPanel/ExPanel.js");
const EXPANEL_CSS_PATH = path.join(__dirname, "../src/packages/ExPanel/ExPanel.css");
const MAIN_PATH = path.join(__dirname, "../src/main.js");

/**
 * 从 common.js 中抽取真实的 getLocalDateStr 一并注入，确保被测的是线上同一份实现
 * （日期取本地分量而非 UTC 是本功能唯一容易写错的细节，不能用桩件糊过去）。
 */
function extractLocalDateFn() {
    const src = fs.readFileSync(COMMON_PATH, "utf8");
    const m = src.match(/function getLocalDateStr[\s\S]*?\n}/);
    if (!m) throw new Error("common.js 中未找到 getLocalDateStr，测试需同步更新（避免静默失效）");
    return m[0];
}

const CARD_HTML = `
<div class="NormalCard NormalCard-common">
  <div class="NormalCard-close">×</div>
  <div class="NormalCard-content">
    <div class="NormalCard-main clearFix">
      <a class="NormalCard-avatar" href="//yuba.douyu.com/wbapi/web/jumpusercenter?id=109771700&amp;name=%E5%9B%BD%E6%9C%8D"></a>
      <div class="NormalCard-title">
        <a class="NormalCard-name" href="//yuba.douyu.com/wbapi/web/jumpusercenter?id=109771700&amp;name=%E5%9B%BD%E6%9C%8D">国服第一黑粉z</a>
      </div>
    </div>
    <div class="NormalCard-action">
      <a class="NormalCard-btn">举报用户</a>
      <a class="NormalCard-btn">屏蔽用户</a>
      <a class="NormalCard-btn">发站内信</a>
      <a class="NormalCard-btn">关注</a>
    </div>
  </div>
</div>`;

// 无 id 的卡片：用来验证解析失败时不会硬注入按钮
const CARD_NO_UID_HTML = `
<div class="NormalCard">
  <div class="NormalCard-content">
    <div class="NormalCard-main"><div class="NormalCard-title"><a class="NormalCard-name" href="">匿名</a></div></div>
    <div class="NormalCard-action"><a class="NormalCard-btn">关注</a></div>
  </div>
</div>`;

// 斗鱼按用户等级渲染多种卡片组件，前缀不同、内部结构一致。
// 早期实现只匹配 .NormalCard-action，导致至尊/礼物展馆用户的卡片没有入口。
function variantCard(prefix, uid, nick) {
    return `
<div class="${prefix} ${prefix}-common">
  <div class="${prefix}-close">×</div>
  <div class="${prefix}-content">
    <div class="${prefix}-main clearFix">
      <a class="${prefix}-avatar" href="//yuba.douyu.com/wbapi/web/jumpusercenter?id=${uid}&amp;name=x"></a>
      <div class="${prefix}-title">
        <a class="${prefix}-name" href="//yuba.douyu.com/wbapi/web/jumpusercenter?id=${uid}&amp;name=x">${nick}</a>
      </div>
    </div>
    <div class="${prefix}-action">
      <a class="${prefix}-btn">举报用户</a>
      <a class="${prefix}-btn">屏蔽用户</a>
      <a class="${prefix}-btn">关注</a>
    </div>
  </div>
</div>`;
}

/**
 * 一条本机档案记录（字段名照 ArchiveDB.queryUserDay 的契约）：
 *   {kind, txt, gfn, gfcnt, rid, roomName, ts, uid}
 * 注意：gift 记录来自 dgb 报文，档案里**没有**礼物图（gfn/gfcnt/gfid 而已），
 * 所以礼物行的徽章只能靠「礼」字区分 —— 断言按这个事实写。
 */
function makeRecord(index, kind, extra) {
    const base = {
        kind: kind,
        uid: "109771700",
        rid: "71415",
        roomName: "寅子",
        ts: new Date(2026, 9, 17, 20, 30, index).getTime(),
    };
    if (kind === "gift") {
        return Object.assign({}, base, {
            kind: "gift",
            txt: "",
            gfn: "年度冲鸭",
            gfcnt: 1,
            rid: "12869486",
            roomName: "白佑兮",
        }, extra || {});
    }
    return Object.assign({}, base, { kind: "chat", txt: "魔法骑士" + index, gfn: "", gfcnt: 1 }, extra || {});
}

function loadModule(opts = {}) {
    const dom = new JSDOM(
        `<!DOCTYPE html><html><body>${CARD_HTML}${CARD_NO_UID_HTML}${opts.extraCards || ""}</body></html>`,
        { url: "https://www.douyu.com/71415", runScripts: "dangerously" }
    );
    const win = dom.window;

    const queries = [];
    const opened = [];
    const messages = [];
    const metaCalls = [];
    let headerCalls = 0;
    let centeredCalls = 0;

    /**
     * dataPlan(dayKey, offset) -> {ok, list, hasMore} | {ok:false, reason}
     *                          | {throw:true}（同步抛） | {neverRespond:true}
     */
    const ArchiveDB = opts.noArchiveDB ? undefined : {
        queryUserDay: (uid, dayKey, queryOptions) => {
            queries.push({ uid: uid, dayKey: dayKey, offset: queryOptions.offset, limit: queryOptions.limit });
            const plan = opts.dataPlan
                ? opts.dataPlan(dayKey, queryOptions.offset)
                : { ok: true, list: [], hasMore: false };
            if (plan.neverRespond) return new Promise(() => {});
            if (plan.throw) throw new Error("IndexedDB 抛异常");
            return Promise.resolve(plan);
        },
        stats: () => Promise.resolve(opts.stats === undefined
            ? { ok: true, rooms: 0, oldestDay: "", newestDay: "" }
            : opts.stats),
    };

    const ArchiveMeta = opts.noArchiveMeta ? undefined : {
        room: (rid) => {
            metaCalls.push(rid);
            return Promise.resolve(opts.metaPlan ? opts.metaPlan(rid) : { ok: false, reason: "bad-arg" });
        },
    };

    // 故意不注入 ArchiveReplay：本文件钉的是"本机档案"这一层；
    // 回放兜底按钮（存在才渲染 / 点击追加 / 抽样口径）在 test_archive_surfaces.js 第六项单独钉。
    const factory = new Function(
        "document", "setTimeout", "clearTimeout", "MutationObserver",
        "ArchiveDB", "ArchiveMeta", "rid",
        "openPage", "showMessage",
        "ensureMiuixPanelHeader", "openMiuixPanelCentered",
        extractLocalDateFn() + "\n" + fs.readFileSync(SRC_PATH, "utf8") + `
        return {
            init: initPkg_DanmakuHistory,
            scan: DanmakuHistory_scanAndInject,
            open: DanmakuHistory_open,
            getUid: DanmakuHistory_getUidFromCard,
            today: DanmakuHistory_today,
            buttons: function () { return Array.prototype.slice.call(document.querySelectorAll(".dyex-danmaku-history")); },
            panel: function () { return document.querySelector(".danmaku-history-panel"); },
            status: function () { var e = document.querySelector(".danmaku-history-panel__status-text"); return e ? e.textContent : null; },
            statusClickable: function () { var e = document.querySelector(".danmaku-history-panel__status-text"); return !!(e && e.onclick); },
            moreVisible: function () { var e = document.querySelector('[data-act="more"]'); return !!(e && e.classList.contains("is-visible")); },
            replayVisible: function () { var e = document.querySelector('[data-act="replay"]'); return !!(e && e.classList.contains("is-visible")); },
            sourceText: function () { var e = document.querySelector(".danmaku-history-panel__source"); return e ? e.textContent : null; },
            rows: function () { return Array.prototype.slice.call(document.querySelectorAll(".danmaku-history-panel__row")); },
            dateText: function () { var e = document.querySelector(".danmaku-history-panel__date"); return e ? e.textContent : null; },
            countText: function () { var e = document.querySelector(".danmaku-history-panel__count"); return e ? e.textContent : null; },
            listEl: function () { return document.querySelector(".danmaku-history-panel__list"); },
            nextBtn: function () { return document.querySelector('.danmaku-history-panel__date-btn[data-act="next"]'); },
            clickMore: function () { document.querySelector('[data-act="more"]').click(); },
            clickPrev: function () { document.querySelector('.danmaku-history-panel__date-btn[data-act="prev"]').click(); },
            clickStatus: function () {
                var e = document.querySelector(".danmaku-history-panel__status-text");
                if (e && typeof e.onclick === "function") e.onclick();
            },
            localDate: getLocalDateStr,
        };`
    );

    const api = factory(
        win.document,
        win.setTimeout,
        win.clearTimeout,
        win.MutationObserver,
        ArchiveDB,
        ArchiveMeta,
        "71415",
        (url) => opened.push(url),
        (msg, type) => messages.push({ msg, type }),
        () => { headerCalls++; },
        () => { centeredCalls++; }
    );

    return {
        win, api, queries, opened, messages, metaCalls, dom,
        get headerCalls() { return headerCalls; },
        get centeredCalls() { return centeredCalls; },
    };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 期望的本地日期（与实现相同的本地分量算法，避免测试自身引入 UTC 偏差）
function expectedLocalToday() {
    const d = new Date();
    const p = (v) => (v < 10 ? "0" + v : "" + v);
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

/** 本地"昨天"的 YYYY-MM-DD（换日箭头必须按它查询）。 */
function expectedLocalYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const p = (v) => (v < 10 ? "0" + v : "" + v);
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

let passed = 0;
function ok(name) { passed++; console.log(`  ✓ ${name}`); }

async function run() {
    console.log("=== 正在运行历史弹幕专项单元测试（真实源码 + 卡片桩 + 本机档案桩） ===\n");

    // ---------- 1. 卡片按钮注入 ----------
    {
        const m = loadModule();
        m.api.scan();
        const btns = m.api.buttons();
        assert.strictEqual(btns.length, 1, "应恰好注入 1 个按钮");

        const savedAction = m.win.document.querySelector(".NormalCard-action");
        const noUidAction = m.win.document.querySelectorAll(".NormalCard-action")[1];
        assert.strictEqual(btns[0].parentElement, savedAction, "按钮应追加进 .NormalCard-action");
        assert.strictEqual(btns[0].textContent, "弹幕历史");
        assert.ok(btns[0].classList.contains("NormalCard-btn"), "必须复用斗鱼原生按钮类名");
        assert.strictEqual(savedAction.querySelectorAll(".NormalCard-btn").length, 5, "原有 4 个按钮必须保留");
        ok("卡片动作行追加第 5 个按钮，且复用斗鱼原生 .NormalCard-btn 类名");

        // 幂等：重复扫描不得重复注入
        m.api.scan();
        m.api.scan();
        assert.strictEqual(m.api.buttons().length, 1, "重复扫描必须幂等");

        // 无 uid 的卡片不得注入
        assert.strictEqual(noUidAction.querySelectorAll(".dyex-danmaku-history").length, 0,
            "解析不出 uid 的卡片不得注入按钮");
        ok("重复扫描幂等，且解析不出 uid 的卡片不注入");
    }

    // ---------- 2. uid 零接口解析 ----------
    {
        const m = loadModule();
        const card = m.win.document.querySelector(".NormalCard");
        assert.strictEqual(m.api.getUid(card), "109771700", "应从卡片链接 href 解析 uid");
        assert.strictEqual(m.queries.length, 0, "解析 uid 不得读取任何档案/发起任何请求");

        const noUid = m.win.document.querySelectorAll(".NormalCard")[1];
        assert.strictEqual(m.api.getUid(noUid), "", "无 id 的卡片应返回空串");
        ok("uid 从卡片链接 href 直接解析，零档案读取（改造前是零接口调用，语义等价）");
    }

    // ---------- 2.1 多卡片变体全覆盖（至尊 / 礼物展馆） ----------
    {
        const m = loadModule({
            extraCards: variantCard("SupremeCard", "223078785", "至尊用户")
                + variantCard("GiftHallCard", "226799112", "展馆用户"),
        });
        m.api.scan();
        // 共 4 张卡片：NormalCard(有uid) / NormalCard(无uid) / SupremeCard / GiftHallCard
        // 无 uid 那张不该有按钮 → 期望 3 个
        assert.strictEqual(m.api.buttons().length, 3,
            "普通/至尊/礼物展馆三种卡片都必须有入口，解析不出 uid 的除外");

        const sup = m.win.document.querySelector(".SupremeCard");
        const supBtn = sup.querySelector(".dyex-danmaku-history");
        assert.ok(supBtn, "SupremeCard（至尊用户）必须有「弹幕历史」按钮");
        assert.strictEqual(m.api.getUid(sup), "223078785", "至尊卡片也要能解析出 uid");
        assert.strictEqual(supBtn.className,
            sup.querySelector(".SupremeCard-btn").className + " dyex-danmaku-history",
            "按钮类名必须逐字克隆同排原生按钮（各卡片前缀不同，写死 .NormalCard-btn 会导致至尊卡片样式错乱）");

        const gift = m.win.document.querySelector(".GiftHallCard");
        assert.ok(gift.querySelector(".dyex-danmaku-history"), "GiftHallCard（礼物展馆）必须有按钮");
        assert.strictEqual(gift.querySelector(".dyex-danmaku-history").className,
            gift.querySelector(".GiftHallCard-btn").className + " dyex-danmaku-history",
            "礼物展馆卡片的按钮类名同样必须克隆自其原生按钮");
        ok("三种卡片变体（普通/至尊/礼物展馆）均有入口，按钮类名各自克隆自本卡片的原生按钮");
    }

    // ---------- 2.2 点击别处收起（弹窗会盖住聊天区） ----------
    {
        const m = loadModule({ dataPlan: () => ({ ok: true, hasMore: false, list: [makeRecord(0, "chat")] }) });
        m.api.scan();
        m.api.buttons()[0].click();
        await wait(60);
        assert.notStrictEqual(m.api.panel().style.display, "none", "先确认弹窗处于打开态");

        m.api.panel().querySelector(".danmaku-history-panel__list")
            .dispatchEvent(new m.win.MouseEvent("mousedown", { bubbles: true }));
        await wait(10);
        assert.notStrictEqual(m.api.panel().style.display, "none", "点击弹窗内部不得收起");

        m.win.document.body.dispatchEvent(new m.win.MouseEvent("mousedown", { bubbles: true }));
        await wait(10);
        assert.strictEqual(m.api.panel().style.display, "none",
            "点击弹窗外部必须收起 —— 弹窗盖住聊天区，不收起用户就没法继续点其它用户名，" +
            "表现就像是「换了个人但没重新查询」");
        ok("点击弹窗内部不收起、点击外部自动收起（不再挡住聊天区里的用户名）");
    }

    // ---------- 3. MutationObserver 去抖探测 ----------
    {
        const m = loadModule();
        m.api.init();
        assert.strictEqual(m.api.buttons().length, 1, "init 应立即扫出已存在的卡片按钮");

        // 动态新增一张卡片（模拟用户点击另一条弹幕）
        const wrap = m.win.document.createElement("div");
        wrap.innerHTML = CARD_HTML.replace("109771700", "39552540");
        m.win.document.body.appendChild(wrap);

        assert.strictEqual(m.api.buttons().length, 1, "去抖窗口内不应立刻注入");
        await wait(400);
        assert.strictEqual(m.api.buttons().length, 2, "去抖后应捕获新增卡片");
        ok("MutationObserver 去抖探测：新增卡片在去抖窗口后自动补按钮");
    }

    // ---------- 4. 点击按钮 → 档案查询参数与渲染 ----------
    {
        const m = loadModule({
            dataPlan: (dayKey, offset) => ({
                ok: true,
                hasMore: false,
                list: offset === 0 ? [makeRecord(0, "chat"), makeRecord(1, "gift")] : [],
            }),
        });
        m.api.scan();
        m.api.buttons()[0].click();
        await wait(60);

        assert.strictEqual(m.queries.length, 1, "点击后应读取 1 次本机档案");
        const query = m.queries[0];
        assert.strictEqual(query.uid, "109771700", "查询须带正确 uid");
        assert.strictEqual(query.offset, 0, "首次查询 offset 应为 0");
        assert.strictEqual(query.limit, 50, "单页固定 50 条");
        assert.strictEqual(query.dayKey, expectedLocalToday(), "查询日必须是本地当天日期");
        assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(query.dayKey), "日期必须是 YYYY-MM-DD 格式，实际 " + query.dayKey);
        assert.notStrictEqual(query.dayKey, "0", "绝不允许出现 0 这类非法日期锚点");
        ok("点击读取本机档案：uid 正确、offset=0、limit=50、dayKey 为本地当天且格式合法");

        assert.strictEqual(m.centeredCalls, 1, "应调用统一开窗函数");
        assert.ok(m.headerCalls >= 1, "应调用统一顶栏生成函数");
        assert.strictEqual(m.api.rows().length, 2, "应渲染 2 行");
        ok("走统一 UI 引擎：ensureMiuixPanelHeader + openMiuixPanelCentered");

        const rows = m.api.rows();
        const chatTitle = rows[0].querySelector(".sign-option-title").textContent;
        const chatDesc = rows[0].querySelector(".sign-option-desc").textContent;
        assert.strictEqual(chatTitle, "魔法骑士0", "弹幕行标题应为弹幕内容");
        assert.ok(chatDesc.indexOf("寅子") !== -1, "弹幕行描述应含主播名");
        assert.ok(rows[0].querySelector(".danmaku-history-panel__badge").classList.contains("is-chat"));
        assert.strictEqual(rows[0].querySelector(".danmaku-history-panel__badge").textContent, "弹",
            "弹幕行徽章必须是「弹」字");
        ok("弹幕行渲染：内容为主标题、主播名+时间为副标题、徽章为弹幕样式");

        const giftTitle = rows[1].querySelector(".sign-option-title").textContent;
        assert.strictEqual(giftTitle, "赠送 年度冲鸭 ×1", "礼物行应使用结构化字段（gfn/gfcnt）渲染");
        const giftBadge = rows[1].querySelector(".danmaku-history-panel__badge");
        assert.ok(giftBadge.classList.contains("is-gift"));
        // 档案里的礼物记录只有 gfn/gfcnt/gfid，没有礼物图 URL（dgb 报文本身就不带图）——
        // 礼物行靠「礼」字与弹幕区分，这是改造后可断言的事实，不是把断言放宽。
        assert.strictEqual(giftBadge.textContent, "礼", "礼物行徽章必须显示「礼」字以与弹幕区分");
        const giftDesc = rows[1].querySelector(".sign-option-desc").textContent;
        assert.ok(giftDesc.indexOf("白佑兮") !== -1, "礼物行描述应含房间名");
        ok("礼物行渲染：赠送名称×数量（结构化字段）、徽章「礼」、描述带房间名");

        assert.ok(rows[0].querySelector(".danmaku-history-panel__room"), "有 rid 的行应有去房间按钮");
        assert.ok(m.api.panel().querySelectorAll(".sign-options-list").length === 1,
            "列表应包在统一的 .sign-options-list 容器里");
    }

    // ---------- 4.1 房间名缺失 → ArchiveMeta 补齐（档案只存 rid 时的真实路径） ----------
    {
        const m = loadModule({
            dataPlan: () => ({ ok: true, hasMore: false, list: [makeRecord(0, "chat", { roomName: "" })] }),
            metaPlan: (rid) => ({ ok: true, room: { rid: rid, roomName: "补出来的房间名" } }),
        });
        m.api.scan();
        m.api.buttons()[0].click();
        await wait(80);
        const desc = m.api.rows()[0].querySelector(".sign-option-desc").textContent;
        assert.ok(desc.indexOf("补出来的房间名") === 0, "缺房间名必须用 ArchiveMeta.room(rid) 补齐，实际 " + desc);
        assert.deepStrictEqual(m.metaCalls, ["71415"], "只对缺房间名的行查一次元数据");
        ok("房间名缺失时用 ArchiveMeta.room(rid) 补齐（档案只存 rid 的真实路径）");
    }

    // ---------- 5. 分页边界 ----------
    {
        const full = [];
        for (let i = 0; i < 50; i++) full.push(makeRecord(i, "chat"));
        const tail = [];
        for (let i = 0; i < 28; i++) tail.push(makeRecord(100 + i, "chat"));

        const m = loadModule({
            dataPlan: (dayKey, offset) => ({
                ok: true,
                hasMore: offset === 0,
                list: offset === 0 ? full : tail,
            }),
        });
        m.api.scan();
        m.api.buttons()[0].click();
        await wait(60);

        assert.strictEqual(m.api.rows().length, 50, "首页应渲染 50 行");
        assert.strictEqual(m.api.moreVisible(), true, "hasMore 为 true 时「加载更多」应可见");
        assert.strictEqual(m.api.countText(), "已加载 50 条");
        ok("首页 50 条、加载更多可见、计数正确");

        m.api.clickMore();
        await wait(60);
        assert.strictEqual(m.queries.length, 2, "加载更多应再读一次档案");
        assert.strictEqual(m.queries[1].offset, 50, "第二次查询 offset 应为 50");
        assert.strictEqual(m.api.rows().length, 78, "应追加至 78 行（不清空已有）");
        assert.strictEqual(m.api.moreVisible(), false, "hasMore 为 false 时「加载更多」应隐藏");
        assert.strictEqual(m.api.status(), "本地有 78 条（已全部加载）", "末页必须如实标注「已全部加载」");
        ok("翻页：offset 步长 50、追加而非清空、末页标注「已全部加载」");
    }

    // ---------- 6. 空数据与日期切换 ----------
    {
        const m = loadModule({ dataPlan: () => ({ ok: true, hasMore: false, list: [] }) });
        m.api.scan();
        m.api.buttons()[0].click();
        await wait(60);
        assert.strictEqual(m.api.status(), "本地未收录", "空结果应给出明确文案");
        assert.strictEqual(m.api.rows().length, 0);
        ok("空数据提示「本地未收录」");

        assert.ok(m.api.dateText().indexOf("（今天）") !== -1, "默认应显示今天并标注");
        assert.strictEqual(m.api.nextBtn().disabled, true, "今天时「后一天」应禁用");
        ok("默认查询今天，且今天不可再往后翻");

        m.api.clickPrev();
        await wait(60);
        assert.ok(m.api.dateText().indexOf("（今天）") === -1, "前一天不应再标注今天");
        assert.strictEqual(m.api.nextBtn().disabled, false, "回到过去后「后一天」应可用");
        const lastQuery = m.queries[m.queries.length - 1];
        assert.notStrictEqual(lastQuery.dayKey, expectedLocalToday(), "前一天查询不应仍使用今天的日期");
        assert.strictEqual(lastQuery.dayKey, expectedLocalYesterday(), "必须按前一天的本地日期查询，实际 " + lastQuery.dayKey);
        assert.strictEqual(lastQuery.offset, 0, "换日后 offset 必须归零");
        ok("日期切换：查询日期随之改变、offset 归零、跨日期状态正确");
    }

    // ---------- 7. 档案不可用与各类失败路径（已无"登录"概念） ----------
    {
        // ① ArchiveDB 整个不可用（IndexedDB 缺失）：如实说明，不伪装成"没有记录"
        const m = loadModule({ noArchiveDB: true });
        m.api.scan();
        m.api.buttons()[0].click();
        await wait(60);
        assert.strictEqual(
            m.api.status(),
            "本机档案不可用（当前环境不支持 IndexedDB）",
            "档案不可用必须如实提示，实际 " + m.api.status()
        );
        assert.strictEqual(m.api.statusClickable(), false, "环境不支持时无处可去，不应可点击");
        assert.strictEqual(m.api.moreVisible(), false, "失败时不得显示加载更多");
        assert.strictEqual(m.api.rows().length, 0, "失败时不得渲染任何行");
        ok("档案不可用（IndexedDB 缺失）如实提示，不伪装成有数据也不假装能重试");
    }

    {
        // ② queryUserDay 同步抛异常 → 明确提示 + 可点击重试
        const m = loadModule({ dataPlan: () => ({ throw: true }) });
        m.api.scan();
        m.api.buttons()[0].click();
        await wait(60);
        assert.ok(m.api.status().indexOf("本机档案") !== -1, "异常提示必须点明是本机档案，实际 " + m.api.status());
        assert.ok(m.api.status().indexOf("重试") !== -1, "异常提示必须引导重试，实际 " + m.api.status());
        assert.strictEqual(m.api.statusClickable(), true, "读取异常时必须可点击重试");
        assert.strictEqual(m.api.moreVisible(), false, "失败时不得显示加载更多");
        ok("读取档案抛异常 → 提示「读取本机档案出错，请重试」且可重试");
    }

    {
        // ③ 档案返回 {ok:false, reason:"bad-arg"} → 参数类失败，说清楚而不是含糊重试
        const m = loadModule({ dataPlan: () => ({ ok: false, reason: "bad-arg", list: [], hasMore: false }) });
        m.api.scan();
        m.api.buttons()[0].click();
        await wait(60);
        assert.strictEqual(m.api.status(), "缺少用户或日期，无法查询本机档案", "参数缺失必须点名，实际 " + m.api.status());
        assert.strictEqual(m.api.statusClickable(), false, "参数缺失重试无意义，不应可点击");
        ok("档案返回 bad-arg → 明确说明参数缺失（重试无意义，故不可点）");
    }

    // 失败后加载标志必须复位：手动重试能真的再读一次并成功渲染（不会永久卡在"加载中"）
    {
        for (const [label, failure] of [
            ["抛异常", { throw: true }],
            ["返回 exception", { ok: false, reason: "exception", list: [], hasMore: false }],
        ]) {
            let attempt = 0;
            const m = loadModule({
                dataPlan: () => (attempt++ === 0 ? failure : { ok: true, hasMore: false, list: [makeRecord(0, "chat")] }),
            });
            m.api.scan();
            m.api.buttons()[0].click();
            await wait(60);
            assert.strictEqual(m.queries.length, 1, label + "：首次查询应发生一次");
            assert.ok(m.api.statusClickable(), label + "：失败态必须可点击重试");

            m.api.clickStatus();
            await wait(60);
            assert.strictEqual(m.queries.length, 2, label + "：重试必须真的再读一次档案（加载标志已复位）");
            assert.strictEqual(m.api.rows().length, 1, label + "：重试成功后应正常渲染");
            ok("失败（" + label + "）后重试可再次读取并成功渲染（不会永久卡在加载中）");
            m.dom.window.close();
        }
    }

    // 房间名补不出来时不得卡在"未知直播间"以外的异常状态（兜底文案必须存在）
    {
        const m = loadModule({
            dataPlan: () => ({ ok: true, hasMore: false, list: [makeRecord(0, "chat", { roomName: "" })] }),
            noArchiveMeta: true,
        });
        m.api.scan();
        m.api.buttons()[0].click();
        await wait(60);
        const desc = m.api.rows()[0].querySelector(".sign-option-desc").textContent;
        assert.ok(desc.indexOf("未知直播间") === 0, "没有 ArchiveMeta 时必须回落到「未知直播间」，实际 " + desc);
        ok("ArchiveMeta 不存在 → 房间名回落「未知直播间」，不抛异常");
    }

    // ---------- 8. 本地日期（跨时区） ----------
    {
        const localDate = extractLocalDateFnTest();
        const d = new Date(2026, 8, 22, 0, 30, 0); // 本地 2026-09-22 00:30
        assert.strictEqual(localDate(d), "2026-09-22", "必须取本地日期分量");
        const d2 = new Date(2026, 0, 1, 23, 30, 0);
        assert.strictEqual(localDate(d2), "2026-01-01", "跨月补零正确");
        const d3 = new Date(2026, 11, 9, 12, 0, 0);
        assert.strictEqual(localDate(d3), "2026-12-09", "个位数月份/日期补零正确");
        if (d.getTimezoneOffset() !== 0) {
            assert.notStrictEqual(localDate(d), d.toISOString().slice(0, 10),
                "不得退化为 UTC 日期写法");
        }
        ok("本地日期取本地分量、补零正确，且未退化为 UTC（toISOString）写法");
    }

    // ---------- 9. 接线与 SSOT（源码级断言，防止未来改版静默脱落） ----------
    {
        const main = fs.readFileSync(MAIN_PATH, "utf8");
        // 接线有两种等价写法：平铺直调，或经 initPkg_Safe 逐包隔离（后者保证单个包抛异常
        // 不会拖垮它后面的包）。两种都算接上了，但必须真的出现在 initPkg() 内部，
        // 否则构建期 tree-shaking 会把这个包整体删掉。
        assert.ok(/initPkg\(\)[\s\S]*?initPkg_DanmakuHistory\(\);/.test(main)
            || /initPkg\(\)[\s\S]*?initPkg_Safe\(\s*"DanmakuHistory"\s*,\s*initPkg_DanmakuHistory\s*\)/.test(main),
            "initPkg() 必须调用 initPkg_DanmakuHistory()，否则会被 tree-shaking 静默删除");
        ok("main.js 接线存在（防被 tree-shaking 静默删除）");

        const exPanel = fs.readFileSync(EXPANEL_PATH, "utf8");
        const selectorLines = exPanel.match(/\.sign-panel, \.fans-continue-panel[\s\S]*?\.exupdate-panel[^\n]*/g) || [];
        assert.strictEqual(selectorLines.length, 3, "应存在 3 处互斥清单");
        selectorLines.forEach((line) => {
            assert.ok(line.indexOf(".danmaku-history-panel") !== -1,
                "3 处互斥清单都必须登记新面板：\n" + line);
        });
        ok("ExPanel.js 三处互斥清单均已登记 .danmaku-history-panel");

        const css = fs.readFileSync(EXPANEL_CSS_PATH, "utf8");
        const cssNorm = css.replace(/\r\n/g, "\n");
        assert.ok(css.indexOf(".danmaku-history-panel.miuix-modal > .miuix-modal__body") !== -1,
            "必须只在自己的面板上做 body 布局覆盖（共用容器不可直改）");
        assert.ok(/\.miuix-modal,\n\.sign-panel,/.test(cssNorm),
            "尺寸铁壁组首条选择器应为 .miuix-modal（新面板靠它自动继承尺寸，无需重复声明）");
        // 与场景 14.1 同源：全项目只允许存在一条 380px 宽度声明，新增面板必须继承而非复制
        const widthDecls = (cssNorm.match(/width:\s*var\(--miuix-modal-width\)/g) || []).length;
        assert.strictEqual(widthDecls, 1, "380 宽度声明必须全局唯一，新面板只能靠 .miuix-modal 继承");
        assert.ok(css.indexOf("`") === -1 && css.indexOf("${") === -1,
            "CSS 不得含反引号或 ${（会提前闭合 main.js 的模板字面量）");
        ok("CSS 走 SSOT：局部覆盖 body、尺寸靠 .miuix-modal 继承且宽度声明仍唯一、无反引号与插值");
    }

    console.log(`\n=== 历史弹幕专项测试全部通过（${passed} 项） ===`);
}

function extractLocalDateFnTest() {
    const fn = extractLocalDateFn();
    const factory = new Function(fn + "\n return getLocalDateStr;");
    return factory();
}

run().then(() => process.exit(0)).catch((e) => {
    console.error("\n✗ 测试失败:", e && e.message);
    if (e && e.stack) console.error(e.stack.split("\n").slice(1, 4).join("\n"));
    process.exit(1);
});
