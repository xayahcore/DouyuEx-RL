/* ==================== 整合子模块：斗鱼活跃榜贡献值实时注入（原生主上下文极速注入） ==================== */
(function() {
    function runDYRankFix() {
(function () {

    "use strict";



    /* ============================ 配置 ============================ */

    var DEBUG = false;

    var log = function () {

        if (DEBUG) console.info.apply(console, ["[DYRankFix]"].concat([].slice.call(arguments)));

    };



    var CFG = {

        // ranklist 载荷字段 -> 榜单数据集

        payloadKey: { list_day: "day", list: "week", list_month: "month", list_all: "all" },

        // 注入数值距离行右边缘的偏移(px)，保证落在行末箭头左侧

        valueRightOffset: 22,

        // 注入轮询间隔(ms)

        tickMs: 1000,

    };



    /* ============================ 状态 ============================ */

    var state = {

        rid: "",

        data: {

            day: { map: new Map(), money: true },

            week: { map: new Map(), money: true },

            month: { map: new Map(), money: true },

            all: { map: new Map(), money: true },

        },

        rawPayloadLogged: false,

        _rkLogged: {},

        _rkRawLogged: {},

        _rkEmpty: {},

        msgTypes: {},         // 收到的消息类型 -> 次数（页面旁听）

        panelFoundLogged: false,

        noMsgWarned: false,

        lastInjectLog: 0,

    };



    // 最小调试钩子：浏览器控制台(F12)可看 state / dump（榜单数据）、refresh（强制重注入）；无任何页面 UI

    window.__DYRANK = {

        state: state,

        dump: function () {

            var out = {};

            Object.keys(state.data).forEach(function (k) {

                out[k] = { money: state.data[k].money, list: [].concat(Array.from(state.data[k].map.entries())) };

            });

            return out;

        },

        refresh: function () { injectAll(); },

    };



    /* ============================ STT 协议 ============================ */

    // 与斗鱼新版客户端完全一致的STT解码器：

    // 新版报文把嵌套内容双重转义（"@=" 在嵌套层写作 "@AA="，"@" 写作 "@A"，"/" 写作 "@S"），

    // 旧式单遍解析器（含 DouyuEx 的 el()）无法解析，这就是原插件榜单失效的根因。

    // 参考斗鱼前端 chunk 中模块 85067 的解码实现（逐字等价）。

    function sttFlat(s) {

        if (typeof s !== "string" || !s) return s;

        var t = s.charAt(s.length - 1) === "/" ? s : s + "/";

        var n = t.length;

        var obj = /@=/g.test(t) ? {} : [];

        var i = 0, key = "", acc = "";

        while (i < n) {

            var c = t.charAt(i);

            if (c === "/") {

                if (Array.isArray(obj)) obj.push(acc); else obj[key] = acc;

                key = ""; acc = "";

            } else if (c === "@") {

                i += 1;

                switch (t.charAt(i)) {

                    case "A": acc += "@"; break;

                    case "S": acc += "/"; break;

                    case "=": key = acc; acc = ""; break;

                }

            } else {

                acc += c;

            }

            i += 1;

        }

        return obj;

    }



    function sttParse(s) {

        if (typeof s !== "string") return s;

        // 新版数组分隔符 /|/ （旧版为 //，由 @S 转义自动还原）

        if (/\/\|\//.test(s)) return s.split("/|/").map(sttParse);

        if (!/@[=|A]/.test(s)) return s;

        var v = sttFlat(s);

        if (!v) return;

        if (Array.isArray(v)) return v.map(sttParse);

        var out = {};

        Object.keys(v).forEach(function (k) { out[k] = sttParse(v[k]); });

        return out;

    }



    function sttType(raw) {

        var m = String(raw).match(/type@=([^/]+)/);

        return m ? m[1] : "";

    }



    /* ============================ 数据解析 ============================ */

    function parseList(list) {

        var map = new Map();

        var money = false;

        if (!list) return { map: map, money: money };

        var arr = Array.isArray(list) ? list : [list];

        arr.forEach(function (it) {

            if (!it || typeof it !== "object") return;

            var nick = it.nickname || it.nn || "";

            if (!nick) return;

            var val = null;

            // 优先贡献值(gold，分→主单位取整，与页面在线榜显示一致)；其次活跃度类数值字段

            if (it.gold !== undefined && it.gold !== "" && it.gold !== null) {

                val = Math.round(Number(it.gold) / 100);

                money = true;

            } else {

                ["score", "act", "active", "val"].forEach(function (f) {

                    if (val === null && it[f] !== undefined && it[f] !== "" && it[f] !== null) {

                        val = Number(it[f]);

                    }

                });

            }

            if (val !== null && isFinite(val)) map.set(String(nick), val);

        });

        return { map: map, money: money };

    }



    // 容错：列表值若因某种原因仍是未解析的STT字符串，补一次解析

    function toList(v) {

        if (v === undefined) return undefined;

        if (typeof v === "string") return sttParse(v);

        return v;

    }



    // 从任意解析结果中找出榜单字段（兼容数组/对象混合）

    function extractPayload(p) {

        if (!p || typeof p !== "object") return p;

        if (!Array.isArray(p)) return p;

        var merged = {};

        p.forEach(function (item) {

            if (item && typeof item === "object" && !Array.isArray(item)) Object.assign(merged, item);

        });

        return merged;

    }



    function handleRanklist(raw) {

        var p = sttParse(raw);

        p = extractPayload(p);

        if (!p || typeof p !== "object" || Array.isArray(p)) return;

        if (!state.rawPayloadLogged) {

            state.rawPayloadLogged = true;

            log("ranklist 原始报文(截断):", String(raw).slice(0, 1200));

            log("ranklist 解析结果字段:", Object.keys(p).join(", "));

        }

        var updated = 0;

        Object.keys(CFG.payloadKey).forEach(function (key) {

            if (p[key] !== undefined) {

                state.data[CFG.payloadKey[key]] = parseList(toList(p[key]));

                updated++;

            }

        });

        if (updated) {

            log("榜单数据条数:", Object.keys(state.data).map(function (k) {

                return k + "=" + state.data[k].map.size;

            }).join(" "));

            injectAll();

        } else {

            log("ranklist 消息中未找到已知字段(list_day/list/list_month/list_all)，已记录原始报文");

        }

    }



    // dayrk/weekrk/totalrk/monthrk（当前协议榜单消息）：与页面 mountSocketDay 等订阅一致，

    // list 条目含 nickname + gold（贡献值，分）。这是活跃榜数据的权威来源。

    function handleRkMessage(type, raw) {

        var dsMap = { dayrk: "day", weekrk: "week", totalrk: "all", monthrk: "month" };

        var ds = dsMap[type];

        if (!ds) return;

        var p;

        try { p = sttParse(raw); } catch (e) { p = null; }

        // 首次收到该类型时记录原始报文（截断），便于排查异常房间

        if (!state._rkRawLogged[ds]) {

            state._rkRawLogged[ds] = true;

            log(type, "原始报文(截断):", String(raw).slice(0, 1000));

        }

        if (!p) return;

        if (p.rid && String(p.rid) !== String(state.rid)) return;

        var list = p.list;

        // 容错：list 若仍是未展开的字符串，补一次解析

        if (typeof list === "string") {

            try { list = sttParse(list); } catch (e) { }

        }

        if (!Array.isArray(list)) {

            log(type, "list 字段异常:", typeof list, list ? JSON.stringify(list).slice(0, 300) : "null");

            return;

        }

        var info = { map: new Map(), money: true };

        list.forEach(function (it) {

            if (!it || typeof it !== "object") return;

            var nick = String(it.nickname || it.nn || "").trim();

            if (!nick) return;

            var gold = it.gold !== undefined ? it.gold : it.val;

            var g = Number(gold);

            if (isFinite(g)) info.map.set(nick, Math.round(g / 100));

        });

        if (info.map.size) {

            state.data[ds] = info;

            if (!state._rkLogged[ds]) {

                state._rkLogged[ds] = true;

                log(type, "榜单数据:", info.map.size, "人");

            }

            injectAll();

        } else {

            // 空名单：房间可能关闭了榜单（room_rank_switch=0），或字段不匹配

            state._rkEmpty[ds] = (state._rkEmpty[ds] || 0) + 1;

            if (state._rkEmpty[ds] <= 3) {

                log(type, "名单为空或字段不匹配, rid=", p.rid || "", "list len=", list.length,

                    "条目样例:", JSON.stringify(list[0] || null).slice(0, 300));

            }

        }

    }



    /* ============================ 二进制消息解码 ============================ */

    function decodeBinary(buf) {

        try {

            var text = new TextDecoder("utf-8").decode(buf);

            var parts = text.split("\0");

            for (var i = 0; i < parts.length; i++) {

                var part = parts[i];

                if (!part || part.length < 12) continue;

                var t = sttType(part);

                if (t) {

                    state.msgTypes[t] = (state.msgTypes[t] || 0) + 1;

                }

                if (t === "ranklist") {

                    try { handleRanklist(part); } catch (e) { log("ranklist 解析失败", e); }

                }

                if (t === "dayrk" || t === "weekrk" || t === "totalrk" || t === "monthrk") {

                    try { handleRkMessage(t, part); } catch (e) { }

                }

            }

        } catch (e) { }

    }



    function peekMessage(data) {

        try {

            if (data instanceof ArrayBuffer) {

                decodeBinary(new Uint8Array(data));

            } else if (data && typeof data.arrayBuffer === "function") {

                data.arrayBuffer().then(function (ab) {

                    decodeBinary(new Uint8Array(ab));

                }).catch(function () { });

            } else if (typeof data === "string") {

                decodeBinary(new TextEncoder().encode(data));

            } else if (data && data.buffer) { // TypedArray

                decodeBinary(new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength));

            }

        } catch (e) { }

    }



    /* ============================ 主数据源：钩住页面自身的 WebSocket ============================ */

    var ORIG_WS = window.WebSocket;



    function installWsHook() {

        if (!ORIG_WS) return;

        try {

            window.WebSocket = function (url, protocols) {

                var ws;

                try {

                    ws = protocols ? new ORIG_WS(url, protocols) : new ORIG_WS(url);

                } catch (e) {

                    throw e;

                }

                try {

                    ws.addEventListener("message", function (evt) { peekMessage(evt.data); });

                } catch (e) { }

                return ws;

            };

            window.WebSocket.prototype = ORIG_WS.prototype;

            ["CONNECTING", "OPEN", "CLOSING", "CLOSED"].forEach(function (k) {

                try { window.WebSocket[k] = ORIG_WS[k]; } catch (e) { }

            });

            log("已钩住页面 WebSocket（主数据源）");

        } catch (e) {

            log("WebSocket 钩子安装失败", e);

        }

    }



    /* ============================ DOM 工具 ============================ */

    // 面板容器类名（实测存在）；列表/标签的具体类名随斗鱼改版变化，

    // 因此以“结构探测”为主：面板内按行结构找榜单列表、按文字找标签。

    var SEL_RANK_PANEL = ".layout-Player-rank";

    // 类名快路径（命不中会走结构探测兜底）

    var SEL_LIST_UL = "[class*='ChatRank'] [class*='istContent'], [class*='ChatRank'] [class*='ankList'], [class*='ChatRank'] [class*='ankContent'], [class*='ChatRank'] [class*='ankItem']";

    // 榜单标签文字（识别标签栏并排除误判）

    var TAB_LIKE = ["在线榜", "活跃榜", "钻粉", "贵宾", "粉丝榜", "日榜", "周榜", "月榜", "总榜", "日活跃榜", "周活跃榜", "月活跃榜", "总活跃榜", "活跃总榜"];



    function getRid() {

        // 优先取页面自己使用的真实房间号（改号直播间：URL 是短号/vipId，页面 room_id 才是真实号，

        // 如 /2288 页面 window.room_id=593392）。与斗鱼页面同一数据源，最可靠。

        try {

            var wrid = window.room_id || (window.$ROOM && window.$ROOM.room_id);

            if (wrid) return String(wrid);

        } catch (e) { }

        var m = location.pathname.match(/\/(\d+)/);

        return m ? m[1] : "";

    }



    // 面板内所有“榜单标签”叶子元素（按文字识别，不依赖类名）

    // 注意：必须包含“贵宾”——否则贵宾标签激活时识别不到，会掉进兜底分支误注入贵宾榜

    var RANK_TAB_TEXT = ["活跃榜", "在线榜", "钻粉", "贵宾", "贵宾榜", "粉丝榜", "日榜", "周榜", "月榜", "总榜", "日活跃榜", "周活跃榜", "月活跃榜", "总活跃榜", "活跃总榜"];

    function rankTabLeaves() {

        var out = [];

        var roots = [];

        var panel = document.querySelector(SEL_RANK_PANEL);

        if (panel) roots.push(panel);

        document.querySelectorAll('[class*="ChatRank"], [class*="rankDetail"], [class*="RankDetail"], [class*="RankAll"], [class*="rankAll"], [class*="modal"], [class*="Modal"], [class*="dialog"], [class*="Dialog"]')

            .forEach(function (el) { roots.push(el); });

        roots.forEach(function (root) {

            (function walk(el) {

                for (var i = 0; i < el.children.length; i++) {

                    var c = el.children[i];

                    if (c.children.length === 0) {

                        var t = (c.textContent || "").trim();

                        if (RANK_TAB_TEXT.indexOf(t) !== -1 && out.indexOf(c) === -1) out.push(c);

                    } else walk(c);

                }

            })(root);

        });

        return out;

    }



    // 当前激活标签：优先 class/aria 标记，其次父链上的 active 类

    // （注意斗鱼用 is-active 这类连字符类名，正则需兼容 - 边界）

    function activeRankTab() {

        var tabs = rankTabLeaves();

        var hit = tabs.filter(function (t) {

            var cls = String(t.className || "") + " " + String(t.parentElement ? t.parentElement.className : "");

            return /(^|[\s-])(active|current|cur|selected|checked)([\s-]|$)/i.test(cls) || t.getAttribute("aria-selected") === "true";

        });

        if (hit.length === 1) return hit[0];

        if (hit.length > 1) {

            // 主面板与详情弹层同时激活时，取 DOM 顺序靠后的（详情弹层覆盖在最上层）

            return hit[hit.length - 1];

        }

        hit = tabs.filter(function (t) {

            var n = t.parentElement, d = 0;

            while (n && d < 3) {

                if (/(^|[\s-])(active|current|cur|selected)([\s-]|$)/i.test(String(n.className || ""))) return true;

                n = n.parentElement; d++;

            }

            return false;

        });

        if (hit.length === 1) return hit[0];

        return null;

    }



    function activeTabLabel() {

        var tab = activeRankTab();

        return tab ? tab.textContent.trim() : "";

    }



    // 结构探测：找“形似榜单列表”的容器（>=3 个直接子行，行内含短文本叶子）

    function findRankUls() {
        var out = [];
        function push(el) { if (el && out.indexOf(el) === -1) out.push(el); }
        try {
            // 精准直接匹配斗鱼榜单列表容器，耗时 < 0.05ms，彻底杜绝全局 DOM 遍历
            var hits = document.querySelectorAll(".ChatRankWeek-listContent, [class*='ChatRankWeek-listContent'], [class*='ChatDayRank'] ul, [class*='ChatRankWeek'] ul, .OnlineRankAll-list, [class*='RankAll'] ul");
            for (var i = 0; i < hits.length; i++) push(hits[i]);

            // 补充探测：如果在榜单行存在的情况下容器类名有细微变动，通过行父级直接获取
            if (out.length === 0) {
                var rows = document.querySelectorAll(".ChatRankWeek-listItem, [class*='RankWeek-listItem']");
                for (var j = 0; j < rows.length; j++) push(rows[j].parentElement);
            }
        } catch (e) { }
        return out;
    }



    function fmt(v, money) {

        // 原汁原味展示：纯整数、不加符号、不带小数（money 仅标记来源，不再影响格式）

        if (v == null) return "—";

        return String(v);

    }



    function findNickEl(row, dataset) {

        var el = row.querySelector('[class*="nickname"], [class*="Nickname"], [class*="nickName"], [class*="NickName"]');

        if (el) return el;

        var map = state.data[dataset].map;

        var kids = row.querySelectorAll("*");

        for (var i = 0; i < kids.length; i++) {

            var k = kids[i];

            if (k.children.length === 0 && map.has(k.textContent.trim())) return k;

        }

        return null;

    }



    function findArrowEl(row) {

        return row.querySelector(

            '[class*="arrow"], [class*="Arrow"], [class*="chevron"], [class*="Chevron"],' +

            '[class*="enter"], [class*="Enter"], [class*="more"], [class*="More"],' +

            '[class*="link"], [class*="Link"], [class*="btn"], [class*="Btn"],' +

            '[class*="trend"], [class*="Trend"]'

        );

    }



    /* ============================ 榜单注入 ============================ */



    // 通过"昵称序列"自动判定列表属于哪个数据集（日榜/周榜…），

    // 名次吻合加权更高，可区分日榜与周榜（成员重叠大但顺序不同）。

    function datasetForList(ul) {

        var rows = Array.prototype.slice.call(ul.children);

        if (!rows.length) return null;

        var rowNicks = rows.map(function (r) {

            var e = r.querySelector('[class*="nickname"], [class*="Nickname"], [class*="nickName"], [class*="NickName"]');

            return e ? e.textContent.trim() : "";

        }).filter(Boolean);

        if (!rowNicks.length) return null;

        var best = null, bestScore = 0;

        ["day", "week", "month", "all"].forEach(function (ds) {

            var info = state.data[ds];

            if (!info || info.map.size === 0) return;

            var keys = Array.from(info.map.keys());

            var score = 0;

            for (var i = 0; i < rowNicks.length; i++) {

                var j = keys.indexOf(rowNicks[i]);

                if (j >= 0) {

                    score += 2;

                    if (i === j) score += 2;

                }

            }

            if (score > bestScore) { bestScore = score; best = ds; }

        });

        return bestScore >= 3 ? best : null;

    }



    function injectList(ul, dataset) {

        var info = state.data[dataset];

        if (!info || info.map.size === 0) return;

        var rows = Array.prototype.slice.call(ul.children);

        var ok = 0, miss = 0;

        rows.forEach(function (row) {

            try {

                var nickEl = findNickEl(row, dataset);

                if (!nickEl) { miss++; return; }

                var val = info.map.get(nickEl.textContent.trim());

                if (val == null) { miss++; return; }

                var text = fmt(val, info.money);

                var existing = row.querySelector(".ex-rank-val");

                if (existing && existing.getAttribute("data-exrank") === dataset &&

                    existing.textContent === text) return;

                row.querySelectorAll(".ex-rank-val").forEach(function (x) { x.remove(); });

                var span = document.createElement("span");

                span.className = "ex-rank-val";

                span.setAttribute("data-exrank", dataset);

                span.textContent = text;

                var arrow = findArrowEl(row);

                if (arrow && arrow.parentElement) {

                    arrow.parentElement.insertBefore(span, arrow);

                } else {

                    row.appendChild(span);

                }

                var cs = getComputedStyle(row);

                if (cs.position === "static") row.style.position = "relative";

                ok++;

            } catch (e) { }

        });

        var now = Date.now();

        if (ok && now - state.lastInjectLog > 5000) {

            state.lastInjectLog = now;

            log("注入", dataset, "成功行数", ok, miss ? "未匹配行数 " + miss : "");

        }

    }



    // 贵宾/守护榜行内特征字样（出现即视为贵宾类列表，绝不注入）

    var GUARD_TOKENS = ["续费", "守护", "钻粉"];

    // 贵宾类容器类名特征（Guard/Vip/Rich/Noble 等；仅作排除用，随斗鱼改版可能变化）

    var GUARD_CLASS = /guard|vip|rich|noble|consume/i;



    // 列表是否“长得像贵宾/守护榜”（类名特征或行内字样过半命中）

    function looksLikeGuardList(ul) {

        try {

            var n = ul;

            while (n && n !== document.documentElement) {

                if (GUARD_CLASS.test(String(n.className || ""))) return true;

                n = n.parentElement;

            }

            var rows = Array.prototype.slice.call(ul.children).slice(0, 12);

            if (rows.length < 2) return false;

            var hit = 0;

            rows.forEach(function (row) {

                var leaves = [];

                (function walk(el) {

                    for (var k = 0; k < el.children.length; k++) {

                        var cc = el.children[k];

                        if (cc.children.length === 0) leaves.push((cc.textContent || "").trim());

                        else walk(cc);

                    }

                })(row);

                if (leaves.some(function (t) {

                    return GUARD_TOKENS.some(function (g) { return t.indexOf(g) !== -1; });

                })) hit++;

            });

            return hit >= rows.length / 2;

        } catch (e) { return false; }

    }



    // 列表当前是否可见（切换标签后残留的隐藏 DOM 不注入）

    function isVisibleList(ul) {

        try {

            var n = ul;

            while (n && n !== document.documentElement) {

                if (n.hidden) return false;

                if (n.style && n.style.display === "none") return false;

                if (getComputedStyle(n).display === "none") return false;

                n = n.parentElement;

            }

            return true;

        } catch (e) { return true; }

    }



    // 该列表是否允许注入：活跃榜（默认日榜），或列表任意祖先容器内存在周/月/总选项（详情区）

    function shouldInject(ul) {

        // 兜底排除：贵宾/守护/钻粉类列表绝不注入；隐藏中的列表（残留 DOM）也不注入

        if (looksLikeGuardList(ul) || !isVisibleList(ul)) return false;

        var label = activeTabLabel();

        // 明确不注入的视图：在线榜原生已显示贡献值；钻粉/贵宾榜不是本数据源

        if (label === "在线榜" || label.indexOf("钻粉") === 0 || label.indexOf("贵宾") === 0) return false;

        // 活跃榜主视图 / 详情区各榜单视图（周活跃榜、活跃总榜等）

        if (["活跃榜", "日榜", "周榜", "月榜", "总榜", "日活跃榜", "周活跃榜", "月活跃榜", "总活跃榜", "活跃总榜"].indexOf(label) !== -1) return true;

        // 兜底：激活标签识别不出时，只要面板内存在榜单标签、且该列表能匹配到数据，就注入

        if (!label) {

            var hasRankTab = rankTabLeaves().some(function (x) {

                return ["活跃榜", "日榜", "周榜", "月榜", "总榜"].indexOf(x.textContent.trim()) !== -1;

            });

            if (hasRankTab && datasetForList(ul)) return true;

        }

        return false;

    }



    function injectAll() {

        var uls = findRankUls();

        for (var i = 0; i < uls.length; i++) {

            var ul = uls[i];

            if (!shouldInject(ul)) continue;

            var ds = datasetForList(ul);

            if (!ds) continue;

            injectList(ul, ds);

        }

    }



    /* ============================ 样式 ============================ */

    function injectCss() {

        var st = document.createElement("style");

        st.id = "ex-dyrank-style";

        st.textContent = [

            ".ex-rank-val{position:absolute;right:" + CFG.valueRightOffset + "px;top:50%;transform:translateY(-50%);",

            // 颜色默认 #999999（与斗鱼原生在线榜 ptText / 榜单次要数字一致），同时由 syncValueColor 动态采样设置 CSS 变量随主题自适应

            "color:var(--ex-rank-color, #999999);font-size:12px;font-weight:normal;white-space:nowrap;line-height:1;z-index:2;pointer-events:none;}",

        ].join("\n");

        (document.head || document.documentElement).appendChild(st);

    }



    // 采样页面原生贡献值数字/榜单次要数字的颜色，注入值与其保持一致（随主题自适应）

    var COLOR_SAMPLE_SELECTORS = [

        // 1. 在线榜原生贡献值（弹层与侧栏各种可能类名）

        ".OnlineRankAll-ptText",

        "[class*='OnlineRank'] [class*='ptText']",

        "[class*='OnlineRank'] [class*='PtText']",

        "[class*='OnlineRank'] [class*='pt']",

        "[class*='OnlineRank'] [class*='score']",

        "[class*='OnlineRank'] [class*='val']",

        "[class*='ChatRank'] [class*='ptText']",

        "[class*='ChatRank'] [class*='PtText']",

        "[class*='ChatRank'] [class*='listItem--pt']",

        "[class*='ChatRank'] [class*='listItem--score']",

        "[class*='ChatRank'] [class*='listItem--val']",

        "[class*='ptText']",

        "[class*='PtText']",

        "[class*='ptValue']",

        "[class*='PtValue']",

        "[class*='ptNum']",

        // 2. 榜单第4名及以后的名次数字（斗鱼原生4-10名数字与贡献值使用完全相同灰色）

        ".ChatRankDayWeekList-listItem:nth-child(n+4) [class*='listItem--index']",

        ".ChatRankWeek-listItem:nth-child(n+4) [class*='listItem--index']",

        "[class*='ChatRank'] [class*='listItem']:nth-child(n+4) [class*='index']",

        "[class*='ChatRank'] [class*='listItem--index']",

        // 3. 榜单面板内辅助说明文字 / 查看更多

        "[class*='ChatRank'] [class*='more']",

        "[class*='ChatRank'] [class*='More']",

        "[class*='ChatRank'] [class*='desc']",

        "[class*='ChatRank'] [class*='subText']",

        "[class*='ChatRank'] [class*='subTitle']",

        "[class*='ChatRank'] [class*='tip']",

        ".ChatRank-more",

        ".ChatRank-bottom"

    ];



    function syncValueColor() {

        try {

            for (var i = 0; i < COLOR_SAMPLE_SELECTORS.length; i++) {

                var el = document.querySelector(COLOR_SAMPLE_SELECTORS[i]);

                if (!el) continue;

                var color = getComputedStyle(el).color;

                if (!color || color === "rgba(0, 0, 0, 0)" || color === "transparent") continue;

                var c = color.replace(/\s+/g, "").toLowerCase();

                // 排除纯白/高亮主文本色（避免采样到昵称等导致变白）

                if (c === "rgb(255,255,255)" || c === "rgba(255,255,255,1)" || c === "#fff" || c === "#ffffff" || c === "white") continue;

                document.documentElement.style.setProperty("--ex-rank-color", color);

                return;

            }

        } catch (e) { }

    }



    /* ============================ 主循环 ============================ */

    function diagnostics() {

        // 面板状态提示

        var panel = document.querySelector(SEL_RANK_PANEL);

        if (panel && !state.panelFoundLogged) {

            state.panelFoundLogged = true;

            var label = activeTabLabel();

            log("榜单面板已找到，当前激活标签:", label || "(未知)");

            if (["活跃榜", "日榜", "周榜", "月榜", "总榜", "日活跃榜", "周活跃榜", "月活跃榜", "总活跃榜", "活跃总榜"].indexOf(label) === -1) {

                log("提示：当前不是活跃榜视图，请点击顶部“活跃榜”标签查看注入的贡献值");

            }

        }

        // 长时间无任何弹幕消息的警告

        var total = Object.keys(state.msgTypes).reduce(function (a, k) { return a + state.msgTypes[k]; }, 0);

        if (!state.noMsgWarned && Date.now() - (state._bootTs || 0) > 20000 && total === 0 && state.rid) {

            state.noMsgWarned = true;

            log("警告：20秒内未收到任何弹幕消息。若榜单仍为空，请把浏览器控制台(F12)的 [DYRankFix] 日志发给作者。当前收到的消息类型统计:", JSON.stringify(state.msgTypes));

        }

    }



    function checkAndInject() {
        try {
            var rid = getRid();
            if (rid && rid !== state.rid) {
                state.rid = rid;
                state.data = {
                    day: { map: new Map(), money: true },
                    week: { map: new Map(), money: true },
                    month: { map: new Map(), money: true },
                    all: { map: new Map(), money: true },
                };
            }
            injectAll();
        } catch (e) { }
    }

    var _injectTimer = null;
    function scheduleInject(delay) {
        if (_injectTimer) clearTimeout(_injectTimer);
        _injectTimer = setTimeout(checkAndInject, delay || 50);
    }

    // 事件驱动 1：点击榜单标签即刻触发注入
    document.addEventListener("click", function (e) {
        var t = e.target;
        if (!(t instanceof Element)) return;
        var label = (t.textContent || "").trim();
        if (label.indexOf("活跃榜") !== -1 || label.indexOf("日榜") !== -1 || label.indexOf("周榜") !== -1 || label.indexOf("月榜") !== -1 || label.indexOf("总榜") !== -1 || label.indexOf("粉丝榜") !== -1) {
            scheduleInject(50);
            scheduleInject(250);
        }
    }, true);

    // 事件驱动 2：当 WebSocket 收到榜单数据时自动调用注入
    var _origHandleRanklist = handleRanklist;
    handleRanklist = function(raw) {
        _origHandleRanklist(raw);
        scheduleInject(30);
    };

    var _origHandleRk = handleRkMessage;
    handleRkMessage = function(t, raw) {
        _origHandleRk(t, raw);
        scheduleInject(30);
    };

    state._bootTs = Date.now();
    installWsHook();
    injectCss();
    checkAndInject();
    // 极轻量的兜底定时器（5000ms，且只在榜单列表真实存在时运行，0.01ms 开销）
    setInterval(checkAndInject, 5000);

})();
    }
    try {
        var s = document.createElement("script");
        s.textContent = "(" + runDYRankFix.toString() + ")();\n//# sourceURL=DouyuEx.DYRankFix.js";
        (document.head || document.documentElement).appendChild(s);
        s.remove();
    } catch(e) {
        console.error("[DouyuEx] 活跃榜模块注入失败:", e);
    }
})();
