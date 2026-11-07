/* 只使用 dy.roozj.com 公开榜单聚合；不请求详情、用户数据或任何认证接口。 */
const ROOM_REVENUE_INTERVAL = 150000;
const ROOM_REVENUE_API = "https://dy.roozj.com/api/ranking/anchors";
let roomRevenueState = {
    initialized: false, enabled: true, timer: null, waitTimer: null, waitTries: 0,
    request: null, context: null, blockedRid: "", cache: new Map(),
    income: null, donors: null, paidDonors: null, speakers: null, updatedAt: null, loading: false, stale: false, message: ""
};
let roomRevenueRankNode = null;

function RoomRevenue_id(value) {
    const text = value === undefined || value === null ? "" : String(value).trim();
    return /^[1-9]\d*$/.test(text) ? text : "";
}

function RoomRevenue_today() {
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
}

function RoomRevenue_abort() {
    const request = roomRevenueState.request;
    roomRevenueState.request = null;
    roomRevenueState.loading = false;
    if (request) {
        request.done = true;
        try { if (request.handle && request.handle.abort) request.handle.abort(); } catch (error) {}
    }
}

function RoomRevenue_syncContext() {
    const state = roomRevenueState;
    const path = window.location.pathname;
    const shortId = RoomRevenue_id((path.match(/^\/(?:beta\/)?(\d+)(?:\/|$)/) || [])[1]);
    let realId = RoomRevenue_id(typeof rid === "undefined" ? "" : rid);
    // SPA 换房时全局 rid 可能晚一步更新；在它更新前只用新网址的精确房号/VIP 号。
    if (state.context && state.context.path !== path) state.blockedRid = state.context.realId || state.blockedRid;
    if (state.blockedRid && realId === state.blockedRid && shortId !== realId) realId = "";
    else if (realId !== state.blockedRid || realId === shortId) state.blockedRid = "";
    const date = RoomRevenue_today();
    const context = { path: path, realId: realId, shortId: shortId, date: date };
    context.key = [path, realId, shortId, date].join("|");
    if (!state.context || state.context.key !== context.key) {
        RoomRevenue_abort();
        state.context = context;
        const cached = state.cache.get(context.key);
        state.income = cached ? cached.income : null;
        state.donors = cached ? cached.donors : null;
        state.paidDonors = cached ? cached.paidDonors : null;
        state.speakers = cached ? cached.speakers : null;
        state.updatedAt = cached ? cached.updatedAt : null;
        state.stale = !!(cached && Date.now() - cached.updatedAt >= ROOM_REVENUE_INTERVAL);
        state.message = "";
    }
    return state.context;
}

function RoomRevenue_visible() {
    // 防页签冻结会给 document 覆盖同名 own 属性；读取原型 getter 才是真实后台状态。
    try {
        let prototype = Object.getPrototypeOf(document);
        while (prototype) {
            const hidden = Object.getOwnPropertyDescriptor(prototype, "hidden");
            if (hidden && hidden.get) return !hidden.get.call(document);
            prototype = Object.getPrototypeOf(prototype);
        }
    } catch (error) {}
    return !document.hidden && document.visibilityState !== "hidden";
}

function RoomRevenue_render() {
    const node = document.querySelector(".ex-room-revenue");
    if (!node) return;
    const state = roomRevenueState;
    const value = node.querySelector(".ex-room-revenue__value");
    let text = "";
    if (state.income !== null) {
        text += (state.income > 0 && state.income < 0.01 ? "<0.01" : state.income.toLocaleString("zh-CN", { maximumFractionDigits: 2 })) + "鱼翅";
        if (state.stale) text += "（上次）";
    } else text = state.loading ? "…" : "—";
    if (value) value.textContent = text;
    const refresh = node.querySelector(".ex-room-revenue__refresh");
    if (refresh) refresh.disabled = state.loading;
    const date = state.context ? state.context.date : RoomRevenue_today();
    const detail = ["统计日期：" + date + "（本地今日）", "来源：dy.roozj.com 公开榜单；单位：鱼翅", "第三方统计流水，不代表主播实际到账收入"];
    if (state.income !== null) detail.push("公开流水数值：" + state.income + "鱼翅");
    if (state.donors !== null) detail.push("送礼人数：" + state.donors);
    if (state.paidDonors !== null) detail.push("付费送礼人数：" + state.paidDonors);
    if (state.speakers !== null && state.speakers !== undefined) detail.push("今日发言人数：" + state.speakers);
    if (state.updatedAt !== null) detail.push("获取时间：" + new Date(state.updatedAt).toLocaleString());
    if (state.stale) detail.push("显示上次成功结果");
    if (state.loading) detail.push("正在刷新");
    if (state.message) detail.push(state.message);
    node.title = detail.join("\n");
    const metrics = [
        ["donors", state.donors, "今日送礼人数", "total_fans"],
        ["speakers", state.speakers, "今日发言人数", "danmu_users"]
    ];
    for (const [name, count, label, field] of metrics) {
        const item = node.querySelector('[data-revenue-metric="' + name + '"]');
        const number = node.querySelector(".ex-room-revenue__" + name);
        const formatted = count === null || count === undefined ? "—" : count.toLocaleString("zh-CN");
        if (number) number.textContent = formatted;
        if (item) {
            item.title = label + "（公开榜单 " + field + "）：" + formatted + "\n" + node.title;
            item.setAttribute("aria-label", label + " " + formatted);
        }
    }
    const money = node.querySelector('[data-revenue-metric="income"]');
    if (money) {
        money.title = "今日流水（公开榜单 total_income，单位：鱼翅）\n" + node.title;
        money.setAttribute("aria-label", "今日流水 " + text);
    }
}

/* 指标图标：QingIcon（asorn/qingicon-open 的 Line 档，24 网格线稿，stroke 统一走 currentColor）。
 * 只嵌入这 5 枚，不引整库；缺图标时退回文字符号，数据条不会因此消失。 */
const ROOM_REVENUE_ICONS = {
    donors: "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M17.2738 5.35083C18.5555 5.69213 19.4998 6.86081 19.4998 8.25004C19.4998 9.90689 18.1566 11.25 16.4998 11.25C16.4764 11.25 16.453 11.2498 16.4297 11.2492M17.98 14.5845C19.3737 15.0018 20.4714 15.8111 21.0924 17.0193C21.316 17.4543 21.4347 17.863 21.4854 18.2337C21.6457 19.405 20.5625 20.1025 19.3868 20.2291M13.5 7.25C13.5 9.45914 11.7091 11.25 9.49999 11.25C7.29085 11.25 5.49999 9.45914 5.49999 7.25C5.49999 5.04086 7.29085 3.25 9.49999 3.25C11.7091 3.25 13.5 5.04086 13.5 7.25ZM3.00264 18.9225C3.02296 18.4323 3.16301 17.8655 3.52457 17.25C4.70487 15.2408 6.34704 14.25 9.49999 14.25C12.6529 14.25 14.2951 15.2408 15.4754 17.25C15.837 17.8655 15.977 18.4323 15.9973 18.9225C16.048 20.1437 14.7627 20.75 13.5404 20.75H5.45953C4.2373 20.75 2.95202 20.1437 3.00264 18.9225Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    speakers: "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M9 9H15M9 13H13M3.5 4H20.5V18H15L12 21L9 18H3.5V4Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    income: "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M20 6.25V17.75C20 19.4069 16.4183 20.75 12 20.75C7.58172 20.75 4 19.4069 4 17.75V6.25M20 6.25C20 7.90685 16.4183 9.25 12 9.25C7.58172 9.25 4 7.90685 4 6.25M20 6.25C20 4.59315 16.4183 3.25 12 3.25C7.58172 3.25 4 4.59315 4 6.25M20 12C20 13.6569 16.4183 15 12 15C7.58172 15 4 13.6569 4 12\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    refresh: "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M3.26404 12.5C3.52317 17.0998 7.33531 20.75 12 20.75C16.8325 20.75 20.75 16.8325 20.75 12C20.75 7.16751 16.8325 3.25 12 3.25C8.41193 3.25 5.32829 5.40967 3.97807 8.5M3.49999 4.5V8.5H7.49999\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    source: "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M11.5391 5.25H3.75V20.25H18.75V12.4609M11.25 12.75L20.25 3.75M15.25 3.75H20.25V8.75\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
};

function RoomRevenue_icon(kind) {
    const span = document.createElement("span");
    span.className = "ex-room-revenue__icon ex-room-revenue__icon--" + kind;
    span.setAttribute("aria-hidden", "true");
    const svg = ROOM_REVENUE_ICONS[kind];
    if (svg) span.innerHTML = svg;
    else span.textContent = { donors: "礼", speakers: "言", income: "¥" }[kind] || "";
    return span;
}

function RoomRevenue_reserveSpace(host) {
    let rank = null;
    // 当前版 rankAll/rank 同处 asideMainTop，static 排行榜由横条自然推下。
    // 旧版绝对定位排行榜才需要原版的 top:34px；不改 display，也不全局影响其他播放器。
    const region = host && (host.closest(".layout-Player-asideMainTop") || host.closest(".layout-Player-asideMain") || host.parentElement);
    if (region) {
        const candidates = Array.from(region.querySelectorAll(".layout-Player-rank")).filter(function(item) { return !item.contains(host); });
        if (candidates.length === 1) {
            const position = window.getComputedStyle(candidates[0]).position;
            if (position === "absolute" || position === "fixed") rank = candidates[0];
        }
    }
    if (roomRevenueRankNode && roomRevenueRankNode !== rank) roomRevenueRankNode.classList.remove("ex-room-revenue-rank-offset");
    roomRevenueRankNode = rank;
    if (rank) rank.classList.add("ex-room-revenue-rank-offset");
}

function RoomRevenue_mount() {
    // 沿用原版 RealAudience 的挂载顺序和 prepend 方式。
    const host = document.querySelector(".layout-Player-announce") || document.querySelector(".layout-Player-rankAll");
    let node = document.querySelector(".ex-room-revenue");
    if (!host) {
        if (node) node.remove();
        RoomRevenue_reserveSpace(null);
        return false;
    }
    if (!node) node = document.createElement("div");
    node.className = "ex-room-revenue";
    // 老版本已挂在标题栏的节点也能就地升级、搬移；不留下第二份金额出口。
    if (!node.querySelector(".ex-room-revenue__metrics")) {
        node.replaceChildren();
        const metrics = document.createElement("div");
        metrics.className = "ex-room-revenue__metrics";
        for (const name of ["donors", "speakers", "income"]) {
            const item = document.createElement("span");
            item.className = "ex-room-revenue__metric";
            item.dataset.revenueMetric = name;
            item.appendChild(RoomRevenue_icon(name));
            const value = document.createElement("span");
            value.className = name === "income" ? "ex-room-revenue__value" : "ex-room-revenue__" + name;
            item.appendChild(value);
            metrics.appendChild(item);
        }
        const refresh = document.createElement("button");
        refresh.type = "button";
        refresh.className = "ex-room-revenue__refresh";
        refresh.innerHTML = ROOM_REVENUE_ICONS.refresh || "↻";
        refresh.title = "刷新今日流水";
        refresh.setAttribute("aria-label", "刷新今日流水");
        refresh.addEventListener("click", function(event) { event.stopPropagation(); RoomRevenue_refresh(true); });
        const source = document.createElement("a");
        source.className = "ex-room-revenue__source";
        source.href = "https://dy.roozj.com/";
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        source.innerHTML = ROOM_REVENUE_ICONS.source || "↗";
        source.title = "来源：dy.roozj.com 公开榜单";
        source.setAttribute("aria-label", "查看流水来源 dy.roozj.com");
        node.append(metrics, refresh, source);
    }
    if (node.parentNode !== host || host.firstElementChild !== node) host.insertBefore(node, host.firstChild);
    RoomRevenue_reserveSpace(host);
    RoomRevenue_render();
    return true;
}

function RoomRevenue_masked(value) {
    return value === true || value === 1 || value === "true" || value === "1";
}

function RoomRevenue_count(value) {
    if (typeof value !== "number" && !(typeof value === "string" && /^\d+$/.test(value.trim()))) return null;
    const count = Number(value);
    return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

function RoomRevenue_parse(response, context) {
    if (!response || !Number.isFinite(Number(response.status)) || response.status < 200 || response.status >= 300) return { error: "数据源暂不可用（HTTP错误）" };
    if (response.finalUrl) {
        try {
            const finalUrl = new URL(response.finalUrl);
            if (finalUrl.origin !== "https://dy.roozj.com" || finalUrl.pathname !== "/api/ranking/anchors") return { error: "数据源返回了非榜单页面" };
        } catch (error) { return { error: "数据源地址不可用" }; }
    }
    let payload = response.response;
    if (payload === undefined || payload === null) payload = response.responseText;
    try { if (typeof payload === "string") payload = JSON.parse(payload); } catch (error) { return { error: "数据源未返回有效JSON（可能是HTML页面）" }; }
    if (!payload || typeof payload !== "object") return { error: "数据格式不可用" };
    if (RoomRevenue_masked(payload.isMasked)) return { error: "来源未公开此数据" };
    if (payload.code !== 0 && payload.code !== "0") return { error: "数据源返回错误" };
    if (!Array.isArray(payload.data)) return { error: "榜单数据格式不可用" };
    const matches = payload.data.filter(function(row) {
        if (!row || typeof row !== "object") return false;
        return (context.realId && RoomRevenue_id(row.room_id) === context.realId) ||
            (context.shortId && RoomRevenue_id(row.vip_id) === context.shortId) ||
            (!context.realId && context.shortId && RoomRevenue_id(row.room_id) === context.shortId);
    });
    const exact = context.realId ? matches.filter(function(row) { return RoomRevenue_id(row.room_id) === context.realId; }) : [];
    const rows = exact.length ? exact : matches;
    if (!rows.length) return { error: "公开榜单未找到本房间" };
    if (rows.length !== 1) return { error: "榜单房间匹配不唯一" };
    const row = rows[0];
    if (RoomRevenue_masked(row.isMasked)) return { error: "来源未公开此房间流水" };
    const amount = row.total_income;
    // null、空串、布尔值均不是 0；仅接受明确数值，不做旧站的 /100 换算。
    if (typeof amount !== "number" && !(typeof amount === "string" && /^\d+(?:\.\d+)?$/.test(amount.trim()))) return { error: "来源暂无有效流水数值" };
    const income = Number(amount);
    if (!Number.isFinite(income) || income < 0) return { error: "来源流水数值不可用" };
    return { income: income, donors: RoomRevenue_count(row.total_fans), paidDonors: RoomRevenue_count(row.paid_fans), speakers: RoomRevenue_count(row.danmu_users) };
}

function RoomRevenue_refresh(force) {
    const state = roomRevenueState;
    if (!state.enabled) return;
    const context = RoomRevenue_syncContext();
    if (!RoomRevenue_mount() || !RoomRevenue_visible()) return;
    if (state.request) return;
    const cached = state.cache.get(context.key);
    if (!force && cached && Date.now() - cached.updatedAt < ROOM_REVENUE_INTERVAL) {
        state.income = cached.income;
        state.donors = cached.donors;
        state.paidDonors = cached.paidDonors;
        state.speakers = cached.speakers;
        state.updatedAt = cached.updatedAt;
        state.stale = false;
        state.message = "";
        RoomRevenue_render();
        return;
    }
    const search = context.shortId || context.realId;
    if (!search) { state.message = "无法确定当前房间"; RoomRevenue_render(); return; }
    const request = { key: context.key, handle: null, done: false };
    state.request = request;
    state.loading = true;
    state.stale = state.income !== null && state.updatedAt !== null && Date.now() - state.updatedAt >= ROOM_REVENUE_INTERVAL;
    RoomRevenue_render();
    function finish(result) {
        if (request.done || !state.enabled || state.request !== request) return;
        const current = RoomRevenue_syncContext();
        if (request.done || current.key !== request.key) { RoomRevenue_render(); return; }
        if (!RoomRevenue_visible()) { RoomRevenue_abort(); RoomRevenue_render(); return; }
        request.done = true;
        state.request = null;
        state.loading = false;
        if (result.error) {
            state.message = result.error;
            state.stale = state.income !== null;
        } else {
            state.income = result.income;
            state.donors = result.donors;
            state.paidDonors = result.paidDonors;
            state.speakers = result.speakers;
            state.updatedAt = Date.now();
            state.stale = false;
            state.message = "";
            state.cache.delete(context.key);
            state.cache.set(context.key, { income: result.income, donors: result.donors, paidDonors: result.paidDonors, speakers: result.speakers, updatedAt: state.updatedAt });
            while (state.cache.size > 8) state.cache.delete(state.cache.keys().next().value);
        }
        RoomRevenue_render();
    }
    if (typeof GM_xmlhttpRequest !== "function") { finish({ error: "当前环境无法请求流水来源" }); return; }
    try {
        request.handle = GM_xmlhttpRequest({
            method: "GET",
            url: ROOM_REVENUE_API + "?startDate=" + context.date + "&endDate=" + context.date + "&clubName=all&search=" + encodeURIComponent(search) + "&limit=50",
            anonymous: true,
            timeout: 8000,
            responseType: "json",
            onload: function(response) { finish(RoomRevenue_parse(response, context)); },
            onerror: function() { finish({ error: "流水请求失败" }); },
            ontimeout: function() { finish({ error: "流水请求超时" }); },
            onabort: function() { finish({ error: "流水请求已取消" }); }
        });
    } catch (error) { finish({ error: "流水请求失败" }); }
}

function RoomRevenue_stop() {
    const state = roomRevenueState;
    if (state.timer !== null) clearInterval(state.timer);
    if (state.waitTimer !== null) clearTimeout(state.waitTimer);
    state.timer = null;
    state.waitTimer = null;
    state.waitTries = 0;
    RoomRevenue_abort();
}

function RoomRevenue_start() {
    const state = roomRevenueState;
    if (!state.enabled) return;
    RoomRevenue_syncContext();
    if (!RoomRevenue_mount()) {
        if (state.waitTimer !== null || state.waitTries >= 20) return;
        state.waitTimer = setTimeout(function() {
            state.waitTimer = null;
            state.waitTries++;
            RoomRevenue_start();
        }, 500);
        return;
    }
    if (state.waitTimer !== null) clearTimeout(state.waitTimer);
    state.waitTimer = null;
    state.waitTries = 0;
    if (!RoomRevenue_visible()) return;
    // 周期按发起时间计，不能再被“回包时间 + TTL”跳过一轮而实际拖成 300 秒。
    // 页面恢复/重复初始化仍走下方缓存，进行中的请求仍由 refresh 防重入。
    if (state.timer === null) state.timer = setInterval(function() { RoomRevenue_refresh(true); }, ROOM_REVENUE_INTERVAL);
    RoomRevenue_refresh(false);
}

function RoomRevenue_setEnabled(enabled) {
    roomRevenueState.enabled = !!enabled;
    try { localStorage.setItem("ExSave_RoomRevenue", JSON.stringify({ enabled: !!enabled })); } catch (error) {}
    RoomRevenue_stop();
    if (enabled) RoomRevenue_start();
    else {
        const node = document.querySelector(".ex-room-revenue");
        if (node) node.remove();
        RoomRevenue_reserveSpace(null);
    }
}

function initPkg_RoomRevenue() {
    const state = roomRevenueState;
    if (!state.initialized) {
        state.initialized = true;
        try {
            const saved = JSON.parse(localStorage.getItem("ExSave_RoomRevenue") || "null");
            state.enabled = saved !== false && !(saved && saved.enabled === false);
        } catch (error) {}
        if (typeof GM_registerMenuCommand === "function") GM_registerMenuCommand("切换今日流水显示", function() { RoomRevenue_setEnabled(!state.enabled); });
        // window capture 先于防冻结功能的 document capture，不会被它吞掉事件。
        window.addEventListener("visibilitychange", function() {
            if (RoomRevenue_visible()) RoomRevenue_start();
            else { RoomRevenue_stop(); RoomRevenue_render(); }
        }, true);
        window.addEventListener("popstate", RoomRevenue_start);
        window.addEventListener("hashchange", RoomRevenue_start);
        window.addEventListener("pageshow", RoomRevenue_start);
        window.addEventListener("pagehide", RoomRevenue_stop);
        if (window.navigation && window.navigation.addEventListener) window.navigation.addEventListener("navigatesuccess", RoomRevenue_start);
    }
    if (state.waitTimer === null) state.waitTries = 0;
    RoomRevenue_start();
}
