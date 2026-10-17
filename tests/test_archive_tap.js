/**
 * tests/test_archive_tap.js — P0「本地弹幕档案」采集通道（window.__douyuExTap）契约测试
 *
 * rank_engine.js 是页面主上下文代码（build.js 用 String.replace 把它整段注入 main.js，
 * 再 stringify 成 <script> 塞进页面），无法 require。因此分两条路验证：
 *
 *   ① 源码静态校验：对象结构 / 逐订阅者 try-catch / 16 类白名单 / __onDouyuExChatmsg 调用点仍在
 *   ② 沙箱求值：new vm.Script 语法核验 → 沙箱 A 求出真正注入页面的那段脚本文本
 *      → 沙箱 B 执行它（极简 window/document 桩）→ 真实驱动 WebSocket 劫持链路，
 *        断言多播语义、白名单、订阅者异常隔离、以及单槽 __onDouyuExChatmsg 零变化
 *
 * 另含 build 注入安全校验：新增代码不得出现 $& / $` / $' / $$ 这类替换特殊序列。
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const SRC_PATH = path.join(__dirname, "../src/core/rank_engine.js");
const src = fs.readFileSync(SRC_PATH, "utf8");

// 白名单 16 类：oni / oun 已随"贵宾数停止采集"从白名单移除（原 13 类），
// 另按 F-付费消息字段.md 追加付费行为五类：comm_chatmsg（高能弹幕，cprice/crealPrice 单位分）、
// dfobc（钻粉开通，无金额只有 mn 月数）、dfrbc（钻粉续费，同上）、
// prop_order_finish / prop_amountr_finish（道具·套装成交订单，§4.2，price/org_price 单位分）。
const TAP_WHITELIST = [
    "chatmsg", "dgb", "uenter", "pingreq", "hpsc", "blab",
    "ranklist", "dayrk", "weekrk", "monthrk", "totalrk",
    "comm_chatmsg", "dfobc", "dfrbc",
    "prop_order_finish", "prop_amountr_finish",
];

// 付费行为五类型 → 各自的真实字段（必须多播；金额/月数都在这些报文里，漏了等于收入口径失真）
// 依据 F-付费消息字段.md：comm_chatmsg 价在 cprice/crealPrice（分）；钻粉无金额只有 mn（月数）；
// prop_order_finish / prop_amountr_finish 的 price/org_price 是真正带实付金额的字段（分），且无 uid。
const TAP_PAID_PACKETS = {
    comm_chatmsg: "cprice@=1000/crealPrice@=0/cmgType@=1/cet@=15/vrid@=energy1",
    dfobc: "mn@=1/cdays@=31",
    dfrbc: "mn@=2/cdays@=62",
    prop_order_finish: "goods_id@=1671413/user_name@=凡凡阿冬/price@=7900/org_price@=9900",
    prop_amountr_finish: "goods_id@=1671414/user_name@=某水友/price@=500/org_price@=800",
};
const TAP_PAID_TYPES = Object.keys(TAP_PAID_PACKETS);

// 已下线的类型：既不该出现在白名单表里，也不该被多播
const TAP_REMOVED_TYPES = ["oni", "oun"];

function collapseWhitespace(text) {
    return String(text).replace(/\s+/g, " ").trim();
}

function countOccurrences(haystack, needle) {
    return haystack.split(needle).length - 1;
}

// 去掉注释后再数调用点：注释里出现钩子名字不算"改动调用点"
function stripComments(text) {
    return String(text)
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/* ------------------------------------------------------------------ */
/* ① 源码静态校验                                                       */
/* ------------------------------------------------------------------ */

function checkSourceShape() {
    // 1. 对象存在且为"已存在则沿用"的写法（重复注入不覆盖既有订阅者）
    assert.ok(
        /window\.__douyuExTap\s*=\s*window\.__douyuExTap\s*\|\|/.test(src),
        "rank_engine.js 必须存在 window.__douyuExTap = window.__douyuExTap || {...}"
    );

    // 2. 契约四要素齐全
    const tapBlockStart = src.indexOf("window.__douyuExTap = window.__douyuExTap ||");
    assert.ok(tapBlockStart > -1, "__douyuExTap 定义位置未找到");
    const tapBlockEnd = src.indexOf("function emitTapPacket", tapBlockStart);
    assert.ok(tapBlockEnd > tapBlockStart, "emitTapPacket 必须紧随 __douyuExTap 定义之后");
    // 区块起点回溯到 Set 容器声明（subs 必须是 Set 实例，契约 §五）
    const tapRegionStart = src.indexOf("var douyuExTapSubs = new Set();");
    assert.ok(
        tapRegionStart > -1 && tapRegionStart < tapBlockStart,
        "__douyuExTap 的订阅者容器必须在定义之前以 Set 声明"
    );
    const tapBlock = src.slice(tapRegionStart, tapBlockEnd);

    ["subs", "on:", "off:", "emit:"].forEach((token) => {
        assert.ok(tapBlock.indexOf(token) !== -1, "__douyuExTap 必须提供 " + token);
    });
    assert.ok(/new Set\(\)/.test(tapBlock), "__douyuExTap 订阅者容器必须是 Set");
    assert.ok(
        /off:\s*function\s*\(fn\)\s*\{[^}]*\.delete\(fn\)/.test(tapBlock),
        "off 必须真正把订阅者从 Set 里删除（不能是空实现）"
    );
    assert.ok(
        /on:\s*function\s*\(fn\)\s*\{[^}]*\.add\(fn\)/.test(tapBlock),
        "on 必须真正把订阅者加进 Set（不能是空实现）"
    );

    // 3. emit 内部必须逐订阅者 try/catch（一个抛异常不影响其它订阅者）
    const emitAt = tapBlock.indexOf("emit:");
    const emitBody = tapBlock.slice(emitAt);
    assert.ok(/forEach\(/.test(emitBody), "emit 内部必须 forEach 遍历订阅者");
    assert.ok(/try\s*\{/.test(emitBody), "emit 内部必须 try");
    assert.ok(/\}\s*catch\s*\(/.test(emitBody), "emit 内部必须 catch 单个订阅者异常");
    // try 必须包住对订阅者的调用本身，而不是包在 forEach 外层
    const forEachAt = emitBody.indexOf("forEach(");
    const tryAt = emitBody.indexOf("try");
    const callAt = emitBody.indexOf("fn(type, raw)");
    assert.ok(forEachAt > -1 && tryAt > forEachAt, "try 必须在 forEach 回调内部（逐订阅者隔离）");
    assert.ok(callAt > tryAt, "try 必须包住 fn(type, raw) 调用");

    // 4. 白名单 16 个类型全部出现在白名单表里
    const whitelistAt = src.indexOf("TAP_TYPE_WHITELIST = {");
    assert.ok(whitelistAt > -1, "必须存在 TAP_TYPE_WHITELIST 白名单表");
    const whitelistEnd = src.indexOf("};", whitelistAt);
    const whitelistTable = src.slice(whitelistAt, whitelistEnd);
    TAP_WHITELIST.forEach((type) => {
        assert.ok(
            new RegExp("(^|[^A-Za-z0-9_])" + type + "\\s*:\\s*1").test(whitelistTable),
            "白名单缺少类型：" + type
        );
    });
    // 表里不得混入非白名单类型（键名原文比对）
    const listedKeys = whitelistTable
        .slice(whitelistTable.indexOf("{") + 1)
        .split(",")
        .map((chunk) => chunk.split(":")[0].trim())
        .filter(Boolean);
    assert.deepStrictEqual(
        listedKeys.slice().sort(),
        TAP_WHITELIST.slice().sort(),
        "白名单键集合必须恰好等于契约的 16 个类型，实际：" + listedKeys.join(",")
    );
    // 数量与"下线类型"双向钉死：白名单就是 16 类，且 oni/oun 不得再出现
    assert.strictEqual(TAP_WHITELIST.length, 16, "白名单常量必须是 16 类");
    assert.strictEqual(listedKeys.length, 16, "源码白名单表必须恰好 16 个键，实际：" + listedKeys.join(","));
    TAP_REMOVED_TYPES.forEach((type) => {
        assert.strictEqual(listedKeys.indexOf(type), -1, "已下线的类型不得留在白名单表里：" + type);
        assert.strictEqual(TAP_WHITELIST.indexOf(type), -1, "测试白名单列表不得包含已下线类型：" + type);
    });
    // 付费行为三类型：必须在白名单里，且不得被误当"已下线"
    TAP_PAID_TYPES.forEach((type) => {
        assert.strictEqual(listedKeys.indexOf(type) !== -1, true, "付费类型必须出现在源码白名单表里：" + type);
        assert.strictEqual(TAP_WHITELIST.indexOf(type) !== -1, true, "付费类型必须在测试白名单常量里：" + type);
        assert.strictEqual(TAP_REMOVED_TYPES.indexOf(type), -1, "付费类型不得出现在下线清单里：" + type);
    });

    // 5. decodeBinary 内部确实调用了 emitTapPacket，且传的是类型 + 整条原文
    const decodeAt = src.indexOf("function decodeBinary(buf)");
    const peekAt = src.indexOf("function peekMessage(data)");
    assert.ok(decodeAt > -1 && peekAt > decodeAt, "decodeBinary 定位失败");
    const decodeBody = src.slice(decodeAt, peekAt);
    assert.ok(
        /emitTapPacket\(t,\s*part\)/.test(decodeBody),
        "decodeBinary 必须调用 emitTapPacket(t, part)"
    );
    // emit 必须在既有三类分发之后（不改动既有执行顺序）
    ["handleRanklist(part)", "handleRkMessage(t, part)"].forEach((existingCall) => {
        const existingAt = decodeBody.indexOf(existingCall);
        const tapCallAt = decodeBody.indexOf("emitTapPacket(t, part)");
        assert.ok(existingAt > -1, "既有分发调用被误删：" + existingCall);
        assert.ok(tapCallAt > existingAt, "emitTapPacket 必须排在既有分发之后：" + existingCall);
    });
    // 白名单未命中时必须提前 return（未知类型不 emit，但 msgTypes 计数照旧）
    const emitTapFnStart = src.indexOf("function emitTapPacket");
    const emitTapFnEnd = src.indexOf("/* ============================ 主数据源", emitTapFnStart);
    assert.ok(
        emitTapFnStart > -1 && emitTapFnEnd > emitTapFnStart,
        "emitTapPacket 函数体定位失败"
    );
    const emitTapFn = src.slice(emitTapFnStart, emitTapFnEnd);
    assert.ok(/hasOwnProperty\.call\(TAP_TYPE_WHITELIST/.test(emitTapFn), "必须用 hasOwnProperty 判定白名单");
    assert.ok(/if\s*\(!type\)\s*return;/.test(emitTapFn), "emitTapPacket 必须判空 type");
    assert.ok(/typeof\s+tap\.emit\s*!==\s*"function"/.test(emitTapFn), "emitTapPacket 必须判空 tap.emit");

    // 6. __onDouyuExChatmsg 调用点必须原样保留：整段 chatmsg 分发块逐字未改
    const ORIGINAL_CHATMSG_BLOCK = collapseWhitespace(`
        if (t === "chatmsg") {
            try {
                if (typeof window.__onDouyuExChatmsg === "function") {
                    window.__onDouyuExChatmsg(part);
                }
            } catch (e) { }
        }
    `);
    assert.ok(
        collapseWhitespace(decodeBody).indexOf(ORIGINAL_CHATMSG_BLOCK) !== -1,
        "__onDouyuExChatmsg 的 chatmsg 分发块必须逐字保持原样（含 try/catch 包裹）"
    );
    assert.strictEqual(
        countOccurrences(stripComments(src), "__onDouyuExChatmsg"),
        2,
        "去掉注释后，全文件应只有 2 处 __onDouyuExChatmsg（typeof 判定 + 调用），实际被改动"
    );
    const chatmsgAt = decodeBody.indexOf('t === "chatmsg"');
    const tapCallInDecode = decodeBody.indexOf("emitTapPacket(t, part)");
    assert.ok(chatmsgAt > -1, "chatmsg 分发块丢失");
    assert.ok(
        tapCallInDecode > chatmsgAt,
        "__onDouyuExChatmsg 不得被合并进 tap：tap 调用必须在其之后独立存在"
    );

    // 7. tap 代码必须位于 runDYRankFix 之内（build.js 只 stringify 这个函数送进页面）
    const runAt = src.indexOf("function runDYRankFix()");
    const injectAt = src.indexOf('var s = document.createElement("script")');
    assert.ok(runAt > -1 && injectAt > runAt, "runDYRankFix 结构定位失败");
    assert.ok(
        tapBlockStart > runAt && tapBlockStart < injectAt,
        "__douyuExTap 必须写在 runDYRankFix 内部，否则永远不会在页面里执行"
    );

    console.log("✓ 源码静态校验通过（tap 对象 / 逐订阅者 try-catch / 16 类白名单（含付费五类）/ __onDouyuExChatmsg 原样保留）");
}

/* ------------------------------------------------------------------ */
/* build 注入安全：$& / $` / $' / $$ 一个都不能有                          */
/* ------------------------------------------------------------------ */

function checkBuildInjectionSafety() {
    const DANGEROUS = ["$&", "$`", "$'", "$$"];
    DANGEROUS.forEach((seq) => {
        assert.strictEqual(
            countOccurrences(src, seq),
            0,
            "rank_engine.js 不得包含替换特殊序列 " + seq + "（build.js 用 String.replace 注入，会被展开）"
        );
    });

    // 新增代码里连 $ 字符都不许有（既有代码里 window.$ROOM、正则锚点 $ 属于历史遗留，单独放行）
    const newCodeStart = src.indexOf("var douyuExTapSubs = new Set();");
    const newCodeEnd = src.indexOf("/* ============================ 主数据源", newCodeStart);
    assert.ok(newCodeStart > -1 && newCodeEnd > newCodeStart, "新增代码区块定位失败");
    const newCodeTap = src.slice(newCodeStart, newCodeEnd);
    const newCodeCallAt = src.indexOf("emitTapPacket(t, part);");
    assert.ok(newCodeCallAt > -1, "decodeBinary 的 emitTapPacket 调用点定位失败");
    const newCodeCall = src.slice(newCodeCallAt - 200, newCodeCallAt + 30);
    [["__douyuExTap 区块", newCodeTap], ["decodeBinary 调用点", newCodeCall]].forEach(([label, chunk]) => {
        assert.ok(chunk && chunk.length > 0, label + " 定位失败");
        assert.strictEqual(
            countOccurrences(chunk, "$"),
            0,
            label + " 不得出现 $ 字符（build 注入安全）"
        );
    });

    // 用与 build.js 完全相同的方式做一次往返：字符串替换会展开 $-序列，输出必须与原文逐字相等
    const MARKER = "// 核心层标记 勿删";
    const injected = MARKER.replace(MARKER, src);
    assert.strictEqual(injected, src, "按 build.js 的 String.replace 注入后必须与源文件逐字一致");

    console.log("✓ build 注入安全校验通过（无 $& / $` / $' / $$ 序列，新增代码无 $，String.replace 往返一致）");
}

/* ------------------------------------------------------------------ */
/* ② 语法核验（build.js 同款 new vm.Script）                            */
/* ------------------------------------------------------------------ */

function checkSyntax() {
    // 源文件本身
    new vm.Script(src, { filename: "rank_engine.js" });

    // 模拟 build.js:269 的注入产物（核心层标记被整段替换成核心层源码）
    const MARKER = "// 核心层标记 勿删";
    const composite = MARKER.replace(MARKER, src);
    new vm.Script(composite, { filename: "main.injected.js" });

    console.log("✓ vm.Script 语法核验通过（源文件 + build 注入产物）");
}

/* ------------------------------------------------------------------ */
/* ② 沙箱求值：沙箱 A 取出真正注入页面的脚本文本                          */
/* ------------------------------------------------------------------ */

function captureInjectedPageScript() {
    const created = [];
    function makeElement(tagName) {
        const el = {
            tagName: String(tagName || "").toUpperCase(),
            id: "",
            textContent: "",
            style: { setProperty() {} },
            appendChild(child) { return child; },
            insertBefore(child) { return child; },
            setAttribute() {},
            remove() { el.removed = true; },
        };
        created.push(el);
        return el;
    }
    const documentStub = {
        createElement: makeElement,
        createTextNode(text) { return { nodeType: 3, textContent: String(text) }; },
        head: { appendChild(el) { return el; }, style: { setProperty() {} } },
        documentElement: { appendChild(el) { return el; }, style: { setProperty() {} } },
        body: { appendChild(el) { return el; }, childNodes: [], style: { setProperty() {} } },
        addEventListener() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        getElementById() { return null; },
    };
    const sandbox = { document: documentStub, console };
    vm.createContext(sandbox);
    new vm.Script(src, { filename: "rank_engine.js" }).runInContext(sandbox);

    // 真正送进页面的那句：`(${runDYRankFix.toString()})();`
    const pageScript = created
        .map((el) => el.textContent)
        .filter((text) => typeof text === "string" && text.indexOf("DYRankFix") !== -1)
        .pop();
    assert.ok(pageScript, "未捕获到注入页面的 <script> 内容");
    assert.ok(
        pageScript.indexOf("__douyuExTap") !== -1,
        "注入页面的脚本里必须带有 __douyuExTap（否则采集通道不存在）"
    );
    return pageScript;
}

/* ------------------------------------------------------------------ */
/* ② 沙箱 B：在页面上下文里真实执行，并驱动 WebSocket 劫持链路           */
/* ------------------------------------------------------------------ */

function bootPageSandbox(pageScript) {
    const styleCalls = [];
    function makeElement(tagName) {
        const el = {
            tagName: String(tagName || "").toUpperCase(),
            id: "",
            className: "",
            textContent: "",
            innerHTML: "",
            children: [],
            style: {
                setProperty(name, value) { styleCalls.push([name, value]); },
                removeProperty() {},
            },
            appendChild(child) { el.children.push(child); return child; },
            insertBefore(child) { el.children.push(child); return child; },
            setAttribute() {},
            getAttribute() { return null; },
            remove() { el.removed = true; },
            querySelector() { return null; },
            querySelectorAll() { return []; },
            classList: { add() {}, remove() {}, contains() { return false; } },
        };
        return el;
    }

    // 页面自己的 WebSocket 桩：实例可被测试主动投递 message 事件
    const sockets = [];
    function FakeWebSocket(url, protocols) {
        this.url = url;
        this.protocols = protocols;
        this.__listeners = {};
        sockets.push(this);
    }
    FakeWebSocket.prototype.addEventListener = function (type, fn) {
        (this.__listeners[type] = this.__listeners[type] || []).push(fn);
    };
    FakeWebSocket.prototype.__deliver = function (type, event) {
        (this.__listeners[type] || []).forEach((fn) => fn(event));
    };
    FakeWebSocket.CONNECTING = 0;
    FakeWebSocket.OPEN = 1;
    FakeWebSocket.CLOSING = 2;
    FakeWebSocket.CLOSED = 3;

    const documentStub = {
        createElement: makeElement,
        createTextNode(text) { return { nodeType: 3, textContent: String(text) }; },
        head: null,
        documentElement: null,
        body: null,
        addEventListener() {},
        removeEventListener() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        getElementById() { return null; },
    };
    documentStub.head = makeElement("head");
    documentStub.documentElement = makeElement("html");
    documentStub.body = makeElement("body");

    const chatmsgSlotCalls = [];
    const sandboxWindow = {
        document: documentStub,
        location: { pathname: "/9263298", href: "https://www.douyu.com/9263298" },
        WebSocket: FakeWebSocket,
        // 单槽消费者（BarrageSendCheck.js:236/239 的等价替身）
        __onDouyuExChatmsg(raw) { chatmsgSlotCalls.push(raw); },
        setTimeout() { return 0; },
        clearTimeout() {},
        setInterval() { return 0; },
        clearInterval() {},
        addEventListener() {},
        removeEventListener() {},
        getComputedStyle() { return { color: "" }; },
    };

    const sandbox = {
        window: sandboxWindow,
        document: documentStub,
        location: sandboxWindow.location,
        console,
        TextDecoder,
        TextEncoder,
        WebSocket: FakeWebSocket,
        setTimeout: sandboxWindow.setTimeout,
        clearTimeout: sandboxWindow.clearTimeout,
        setInterval: sandboxWindow.setInterval,
        clearInterval: sandboxWindow.clearInterval,
        getComputedStyle: sandboxWindow.getComputedStyle,
        Element: function Element() {},
        HTMLElement: function HTMLElement() {},
    };
    vm.createContext(sandbox);

    // 页面上下文里执行 `(${runDYRankFix.toString()})();`
    new vm.Script(pageScript, { filename: "DouyuEx.DYRankFix.js" }).runInContext(sandbox);

    // 同 realm 的 ArrayBuffer 构造器（让 decodeBinary 的 instanceof ArrayBuffer 分支真正成立）
    // 字节由宿主按 UTF-8 编码后传入，再由沙箱自己的 Uint8Array 分配 → buffer 属于沙箱 realm
    const makePacketBuffer = vm.runInContext(
        "var __mkPacketBuffer = function (bytes) {" +
        "  var view = new Uint8Array(bytes.length);" +
        "  for (var i = 0; i < bytes.length; i++) { view[i] = bytes[i] & 255; }" +
        "  return view.buffer;" +
        "}; __mkPacketBuffer;",
        sandbox
    );

    return {
        sandbox,
        sandboxWindow,
        sockets,
        chatmsgSlotCalls,
        FakeWebSocket,
        makePacketBuffer,
        styleCalls,
        // 走真实链路：实例化劫持后的 window.WebSocket，再向它投递一条报文
        deliverPacket(packet, asArrayBuffer) {
            const ws = new sandboxWindow.WebSocket("wss://danmuproxy.douyu.com:8502/");
            const plain = sockets[sockets.length - 1];
            assert.ok(plain, "WebSocket 劫持层未创建底层连接");
            assert.strictEqual(ws, plain, "劫持后的构造函数必须返回原始 WebSocket 实例");
            const data = asArrayBuffer
                ? makePacketBuffer(Array.prototype.slice.call(Buffer.from(packet, "utf8")))
                : packet;
            plain.__deliver("message", { data });
            return plain;
        },
    };
}

function checkSandboxBehaviour() {
    const pageScript = captureInjectedPageScript();
    const page = bootPageSandbox(pageScript);

    // 1. 采集通道在页面上下文挂载成功
    const tap = page.sandboxWindow.__douyuExTap;
    assert.ok(tap && typeof tap.emit === "function", "页面上下文必须挂载 window.__douyuExTap");
    assert.ok(tap.subs && typeof tap.subs.add === "function", "__douyuExTap.subs 必须是 Set");
    assert.strictEqual(typeof tap.on, "function", "__douyuExTap.on 必须是函数");
    assert.strictEqual(typeof tap.off, "function", "__douyuExTap.off 必须是函数");

    // 2. 两个订阅者都能收到；其中一个抛异常时另一个仍收到
    const receivedA = [];
    const receivedB = [];
    const throwingSubscriber = vm.runInContext(
        "(function () { throw new Error('订阅者故意抛错'); })",
        page.sandbox
    );
    tap.on(throwingSubscriber);
    tap.on(function subscriberA(type, raw) { receivedA.push([type, raw]); });
    tap.on(function subscriberB(type, raw) { receivedB.push([type, raw]); });

    assert.doesNotThrow(() => tap.emit("chatmsg", "RAW-1"), "订阅者抛异常不得从 emit 逃逸");
    assert.strictEqual(receivedA.length, 1, "抛错订阅者之后的订阅者 A 必须仍收到");
    assert.strictEqual(receivedB.length, 1, "抛错订阅者之后的订阅者 B 必须仍收到");
    assert.deepStrictEqual(receivedA[0], ["chatmsg", "RAW-1"], "订阅者必须收到 (type, raw) 原样参数");
    assert.deepStrictEqual(receivedB[0], ["chatmsg", "RAW-1"], "订阅者必须收到 (type, raw) 原样参数");

    // 3. off 能摘掉订阅者，且不影响其它订阅者
    tap.off(throwingSubscriber);
    tap.emit("dgb", "RAW-2");
    assert.strictEqual(receivedA.length, 2, "off 之后 A 仍应收到后续报文");
    assert.deepStrictEqual(receivedA[1], ["dgb", "RAW-2"], "emit 参数必须原样透传");
    assert.strictEqual(
        tap.subs.has(throwingSubscriber),
        false,
        "off 必须把订阅者从 subs 中真正移除"
    );
    const offProbe = [];
    const offProbeFn = function (type, raw) { offProbe.push([type, raw]); };
    tap.on(offProbeFn);
    tap.emit("pingreq", "RAW-off-1");
    assert.deepStrictEqual(offProbe, [["pingreq", "RAW-off-1"]], "on 注册后必须收到报文");
    tap.off(offProbeFn);
    tap.emit("pingreq", "RAW-off-2");
    assert.deepStrictEqual(offProbe, [["pingreq", "RAW-off-1"]], "off 之后不得再收到报文");

    // 4. 走真实链路：白名单类型全部能从 WebSocket 劫持层多播出来
    const whitelistSeen = [];
    tap.on(function whitelistProbe(type, raw) { whitelistSeen.push([type, raw]); });
    const beforeA = receivedA.length;

    TAP_WHITELIST.forEach((type, index) => {
        const packet = "type@=" + type + "/rid@=9263298/uid@=10086/index@=" + index + "/";
        page.deliverPacket(packet, index % 2 === 1); // 奇偶轮换：string 分支与 ArrayBuffer 分支都要覆盖
        const hit = whitelistSeen.filter((item) => item[0] === type);
        assert.strictEqual(hit.length, 1, "白名单类型未多播：" + type);
        assert.strictEqual(hit[0][1], packet, "多播出去的必须是整条报文原文：" + type);
        assert.strictEqual(
            receivedA.length,
            beforeA + index + 1,
            "既有订阅者在真实链路下必须继续收到报文（" + type + "）"
        );
    });

    // 5. 非白名单类型不 emit，但 state.msgTypes 计数照旧（既有旁听口径零变化）
    const msgTypesAfterWhitelist = page.sandboxWindow.__DYRANK.state.msgTypes;
    TAP_WHITELIST.forEach((type) => {
        assert.ok(msgTypesAfterWhitelist[type] >= 1, "state.msgTypes 必须继续统计：" + type);
    });
    const beforeUnknown = whitelistSeen.length;
    ["rss", "tsboxb", "nosuchtype"].forEach((type) => {
        page.deliverPacket("type@=" + type + "/rid@=9263298/ss@=1/");
    });
    assert.strictEqual(
        whitelistSeen.length,
        beforeUnknown,
        "非白名单类型不得多播（实际多播了：" +
            whitelistSeen.slice(beforeUnknown).map((item) => item[0]).join(",") + "）"
    );
    const msgTypesAfterUnknown = page.sandboxWindow.__DYRANK.state.msgTypes;
    ["rss", "tsboxb", "nosuchtype"].forEach((type) => {
        assert.strictEqual(msgTypesAfterUnknown[type], 1, "非白名单类型仍必须计数：" + type);
    });

    // 5b. 已下线类型（oni / oun）：不得多播，但 msgTypes 计数照旧（旁听口径零变化）
    const beforeRemoved = whitelistSeen.length;
    TAP_REMOVED_TYPES.forEach((type) => {
        page.deliverPacket("type@=" + type + "/rid@=9263298/vn@=1752/un@=8203/");
    });
    assert.strictEqual(
        whitelistSeen.length,
        beforeRemoved,
        "已下线类型不得多播（实际多播了：" +
            whitelistSeen.slice(beforeRemoved).map((item) => item[0]).join(",") + "）"
    );
    const msgTypesAfterRemoved = page.sandboxWindow.__DYRANK.state.msgTypes;
    TAP_REMOVED_TYPES.forEach((type) => {
        assert.strictEqual(msgTypesAfterRemoved[type], 1, "已下线类型仍必须计数（只是不再多播）：" + type);
    });

    // 5c. 付费行为五类型（F-付费消息字段.md）：喂进沙箱后必须 emit，且 state.msgTypes 同步 +1
    const paidSeen = [];
    const paidProbe = function (type, raw) { paidSeen.push([type, raw]); };
    tap.on(paidProbe);
    const slotBeforePaid = page.chatmsgSlotCalls.length;
    const paidCountsBefore = {};
    TAP_PAID_TYPES.forEach((type) => { paidCountsBefore[type] = page.sandboxWindow.__DYRANK.state.msgTypes[type] || 0; });
    TAP_PAID_TYPES.forEach((type, index) => {
        // 每类都用自己真实的字段（依据 F-付费消息字段.md，见 TAP_PAID_PACKETS）
        // prop_order_finish / prop_amountr_finish 尤其关键：这是唯一真正带实付金额 price 的报文
        const packet = "type@=" + type + "/rid@=9263298/" + TAP_PAID_PACKETS[type] + "/";
        page.deliverPacket(packet, index % 2 === 1);
        const hits = paidSeen.filter((item) => item[0] === type);
        assert.strictEqual(hits.length, 1, "付费类型必须多播（且只多播一次）：" + type);
        assert.strictEqual(hits[0][1], packet, "付费类型多播的必须是整条报文原文：" + type);
        assert.strictEqual(
            page.sandboxWindow.__DYRANK.state.msgTypes[type],
            paidCountsBefore[type] + 1,
            "付费类型的 state.msgTypes 必须同步 +1：" + type
        );
    });
    tap.off(paidProbe);
    assert.strictEqual(paidSeen.length, TAP_PAID_TYPES.length, "付费五类型必须各多播一条，实际：" +
        paidSeen.map((item) => item[0]).join(","));
    assert.strictEqual(
        page.chatmsgSlotCalls.length,
        slotBeforePaid,
        "付费类型不得被塞进 __onDouyuExChatmsg 单槽（那会污染弹幕发送检测）"
    );

    // 6. 单槽 __onDouyuExChatmsg 零变化：chatmsg 仍然且仅仍然喂给它一次
    const slotBeforeProbe = page.chatmsgSlotCalls.length;
    const chatmsgPackets = page.deliverPacket("type@=chatmsg/rid@=9263298/uid@=888888/nn@=测试/txt@=你好/", true);
    assert.ok(chatmsgPackets, "chatmsg 投递失败");
    const slotCalls = page.chatmsgSlotCalls;
    assert.strictEqual(
        slotCalls.length,
        slotBeforeProbe + 1,
        "__onDouyuExChatmsg 必须仍然收到 chatmsg（且只收到一次）"
    );
    assert.ok(
        slotCalls[slotCalls.length - 1].indexOf("type@=chatmsg") === 0,
        "__onDouyuExChatmsg 收到的必须是整条 chatmsg 原文"
    );
    assert.strictEqual(
        slotCalls[slotCalls.length - 1],
        "type@=chatmsg/rid@=9263298/uid@=888888/nn@=测试/txt@=你好/",
        "__onDouyuExChatmsg 收到的原文必须逐字一致"
    );

    // 7. 订阅者疯狂抛异常时，既有逻辑（chatmsg 单槽 / 榜单解析 / 计数）仍然完好
    const noisyTap = page.sandboxWindow.__douyuExTap;
    const slotBeforeNoisy = page.chatmsgSlotCalls.length;
    const chatmsgCountBeforeNoisy = page.sandboxWindow.__DYRANK.state.msgTypes.chatmsg;
    TAP_WHITELIST.forEach(() => noisyTap.on(function () { throw new Error("每次都炸"); }));
    assert.doesNotThrow(() => {
        page.deliverPacket("type@=chatmsg/rid@=9263298/uid@=1/nn@=x/txt@=照样能收到/", false);
        page.deliverPacket("type@=ranklist/rid@=9263298/list@=[{nn@=a/gold@=100}]/", true);
        page.deliverPacket("type@=dayrk/rid@=9263298/nickname@=a/gold@=200/", false);
    }, "订阅者全部抛异常时 decodeBinary 不得抛出");
    assert.strictEqual(
        page.chatmsgSlotCalls.length,
        slotBeforeNoisy + 1,
        "订阅者全炸时 __onDouyuExChatmsg 必须照旧收到后来的 chatmsg"
    );
    assert.strictEqual(
        page.sandboxWindow.__DYRANK.state.msgTypes.chatmsg,
        chatmsgCountBeforeNoisy + 1,
        "订阅者全炸时 state.msgTypes 必须照旧累加"
    );

    // 8. tap 被外部删除/改写时，decodeBinary 静默降级，不打断既有逻辑
    const savedTap = page.sandboxWindow.__douyuExTap;
    const slotBeforeSilent = page.chatmsgSlotCalls.length;
    page.sandboxWindow.__douyuExTap = null;
    assert.doesNotThrow(() => {
        page.deliverPacket("type@=chatmsg/rid@=9263298/uid@=2/nn@=y/txt@=tap没了也要活/", false);
    }, "__douyuExTap 被删除后不得抛出");
    assert.strictEqual(
        page.chatmsgSlotCalls.length,
        slotBeforeSilent + 1,
        "tap 缺失时必须不影响 __onDouyuExChatmsg"
    );
    page.sandboxWindow.__douyuExTap = savedTap;

    // 9. 已存在时沿用（重复注入不覆盖旧对象/旧订阅者）
    const reused = page.sandboxWindow.__douyuExTap;
    assert.doesNotThrow(() => {
        new vm.Script(pageScript, { filename: "DouyuEx.DYRankFix.js" }).runInContext(page.sandbox);
    }, "重复执行注入脚本不得抛错");
    assert.strictEqual(
        page.sandboxWindow.__douyuExTap,
        reused,
        "重复注入必须沿用已有 __douyuExTap 对象（不得覆盖，否则会丢订阅者）"
    );

    console.log("✓ 沙箱求值通过（多播 / 逐订阅者异常隔离 / 16 类白名单含付费五类 / 非白名单不 emit / 已下线类型不 emit / __onDouyuExChatmsg 零变化）");
}

/* ------------------------------------------------------------------ */

function main() {
    checkSourceShape();
    checkBuildInjectionSafety();
    checkSyntax();
    checkSandboxBehaviour();
    console.log("✓ test_archive_tap 全部通过（源码静态校验 + vm 语法核验 + 沙箱行为验证）");
}

main();

