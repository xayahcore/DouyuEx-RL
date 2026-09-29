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

const STT_SRC = fs.readFileSync(path.join(__dirname, "../src/require/STT/STT.js"), "utf8");
const MODULE_SRC = fs.readFileSync(
    path.join(__dirname, "../src/packages/LiveTool/BarrageSendCheck/BarrageSendCheck.js"),
    "utf8"
);

/**
 * 加载"真实源码"（非镜像实现）：STT 解析器 + BarrageSendCheck 模块本体。
 * 每个用例独立作用域，避免模块级 let/const 状态互相污染。
 */
function loadRealModule(opts) {
    const dom = new JSDOM(
        `<!DOCTYPE html><html><body><div class="Barrage-main"><ul id="js-barrage-list" class="Barrage-list"></ul></div></body></html>`,
        { url: "https://www.douyu.com/9999", runScripts: "dangerously" }
    );
    const win = dom.window;
    const notices = [];

    const combined = STT_SRC + "\n" + MODULE_SRC + `
        return {
            checkAndTrackSelfDanmu: checkAndTrackSelfDanmu,
            handleChatmsgPacket: handleChatmsgPacket,
            extractEchoText: extractEchoText,
            normalizeDanmakuText: normalizeDanmakuText,
            normalizeNick: normalizeNick,
            getFieldValue: getFieldValue,
            buildCheckDiagnostic: buildCheckDiagnostic,
            isBarrageCheckDisabled: function () { return barrageCheckDisabled; },
            getMyLastBarrage: function () { return myLastBarrage; },
            getLastSelfEchoChannel: function () { return lastSelfEchoChannel; },
            getChannelLastSeenAt: function () { return channelLastSeenAt; }
        };
    `;

    const factory = new Function(
        "window", "document", "MutationObserver", "setTimeout", "clearTimeout",
        "setInterval", "clearInterval", "fetch", "DOMParser",
        "my_uid", "myName", "showMessage",
        combined
    );

    const api = factory(
        win, win.document, win.MutationObserver, win.setTimeout, win.clearTimeout,
        win.setInterval, win.clearInterval,
        () => Promise.reject(new Error("no network in test")),
        win.DOMParser,
        opts.uid !== undefined ? opts.uid : "276064895",
        opts.name !== undefined ? opts.name : "测试大神",
        (msg) => notices.push(msg)
    );

    return { win, api, notices, dom };
}

function addSelfDanmaku(win, text, nick) {
    const list = win.document.getElementById("js-barrage-list");
    const li = win.document.createElement("li");
    li.className = "Barrage-listItem";
    li.innerHTML =
        `<span class="Barrage-nickName is-self">${nick || "测试大神"}</span>` +
        `<span class="Barrage-content">${text}</span>`;
    list.appendChild(li);
    return li;
}

function assertNotFlagged(li, label) {
    const content = li.querySelector(".Barrage-content");
    assert.strictEqual(content.style.textDecoration, "", `${label}: 不应有删除线`);
    assert.strictEqual(li.querySelector(".ex-danmaku-blocked-tip"), null, `${label}: 不应有失败提示`);
}

function assertFlagged(li, label) {
    const content = li.querySelector(".Barrage-content");
    assert.ok(content.style.textDecoration.includes("line-through"), `${label}: 必须有删除线`);
    const tip = li.querySelector(".ex-danmaku-blocked-tip");
    assert.ok(tip !== null, `${label}: 必须有失败提示`);
    assert.strictEqual(tip.textContent, "(可能发送失败)");
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function runTests() {
    console.log("=== 正在运行弹幕屏蔽词检测单元测试（真实源码 + 真实报文） ===");

    // ---------- 字段解析：不得被 bnn@=（粉丝牌）误命中 ----------
    {
        const { api } = loadRealModule({});
        const pkt = "type@=chatmsg/rid@=9999/uid@=276064895/nn@=测试大神/txt@=有实力/cid@=abc/bnn@=小僵尸/bl@=26/";
        assert.strictEqual(api.getFieldValue(pkt, "nn"), "测试大神", "nn@= 不得被 bnn@= 误命中");
        assert.strictEqual(api.getFieldValue(pkt, "txt"), "有实力");
        console.log("✓ Case 0 通过: 字段解析锚定边界，bnn@= 不会污染 nn@=");
    }

    // ---------- Case 1: 正常弹幕收到回执 → 不划线 ----------
    {
        const { win, api } = loadRealModule({});
        api.handleChatmsgPacket("type@=chatmsg/rid@=9999/uid@=276064895/nn@=测试大神/txt@=666主播好球/cid@=abc/");
        const li = addSelfDanmaku(win, "666主播好球");
        api.checkAndTrackSelfDanmu(li);
        await wait(700);
        assertNotFlagged(li, "正常弹幕");
        console.log("✓ Case 1 通过: 正常弹幕成功接收回执，无删除线");
    }

    // ---------- Case 2: 违规弹幕零回执 → 划线 + 提示 ----------
    {
        const { win, api } = loadRealModule({});
        api.handleChatmsgPacket("type@=chatmsg/rid@=9999/uid@=276064895/nn@=测试大神/txt@=上一条正常弹幕/cid@=a1/");
        const li = addSelfDanmaku(win, "这是一条被系统屏蔽的违规测试词");
        api.checkAndTrackSelfDanmu(li);
        await wait(700);
        assertFlagged(li, "被屏蔽弹幕");
        console.log("✓ Case 2 通过: 违规弹幕零回执，正确标注删除线与(可能发送失败)");
    }

    // ---------- Case 3: 重渲染产生同文本双节点 → 两个都不得划线 ----------
    {
        const { win, api } = loadRealModule({});
        api.handleChatmsgPacket("type@=chatmsg/rid@=9999/uid@=276064895/nn@=测试大神/txt@=重渲染测试/cid@=a2/");
        const liFirst = addSelfDanmaku(win, "重渲染测试");
        api.checkAndTrackSelfDanmu(liFirst);
        await wait(60);
        const liSecond = addSelfDanmaku(win, "重渲染测试");
        api.checkAndTrackSelfDanmu(liSecond);
        await wait(700);
        assertNotFlagged(liFirst, "重渲染第1个节点");
        assertNotFlagged(liSecond, "重渲染第2个节点");
        console.log("✓ Case 3 通过: 重渲染同文本双节点均不误判（旧版队列算法在此必然误报）");
    }

    // ---------- Case 4: @S/@A 转义文本必须反转义后比对 ----------
    {
        const { win, api } = loadRealModule({});
        assert.strictEqual(api.extractEchoText("type@=chatmsg/rid@=1/txt@=1@S2 走起/cid@=x/"), "1/2 走起", "@S 必须反转义为 /");
        assert.strictEqual(api.extractEchoText("type@=chatmsg/rid@=1/txt@=@A主播 你好/cid@=x/"), "@主播 你好", "@A 必须反转义为 @");

        api.handleChatmsgPacket("type@=chatmsg/rid@=9999/uid@=276064895/nn@=测试大神/txt@=1@S2 走起/cid@=a3/");
        const liSlash = addSelfDanmaku(win, "1/2 走起");
        api.checkAndTrackSelfDanmu(liSlash);
        api.handleChatmsgPacket("type@=chatmsg/rid@=9999/uid@=276064895/nn@=测试大神/txt@=@A主播 你好/cid@=a4/");
        const liAt = addSelfDanmaku(win, "@主播 你好");
        api.checkAndTrackSelfDanmu(liAt);
        await wait(700);
        assertNotFlagged(liSlash, "含 / 的弹幕");
        assertNotFlagged(liAt, "含 @ 的弹幕");
        console.log("✓ Case 4 通过: @S/@A 转义文本反转义正确，不产生误判");
    }

    // ---------- Case 5: 昵称带装饰性冒号，且 uid 缺失时仍能识别为自己 ----------
    {
        const { win, api } = loadRealModule({ uid: "", name: "" });
        // 先出现自身弹幕节点，模块从 DOM 归一化补全 myName（剥离装饰性冒号）
        const li = addSelfDanmaku(win, "装饰昵称测试", "测试大神：");
        api.checkAndTrackSelfDanmu(li);
        await wait(50);
        // 随后回执到达，昵称比对必须成功
        api.handleChatmsgPacket("type@=chatmsg/rid@=9999/uid@=276064895/nn@=测试大神/txt@=装饰昵称测试/cid@=a5/");
        assert.strictEqual(api.getMyLastBarrage() !== "", true, "昵称归一化后应能识别为自己并记录回执");
        await wait(700);
        assertNotFlagged(li, "昵称带全角冒号");
        console.log("✓ Case 5 通过: 昵称带装饰性冒号仍可正确识别为自己");
    }

    // ---------- Case 6: 迟到回执自愈 ----------
    {
        const { win, api } = loadRealModule({});
        // 先建立一条正常回执，证明检测链路可用（否则模块按"零回执不判定"原则拒绝标注）
        api.handleChatmsgPacket("type@=chatmsg/rid@=9999/uid@=276064895/nn@=测试大神/txt@=先来一条正常弹幕/cid@=a6a/");

        const li = addSelfDanmaku(win, "网络大卡顿弹幕");
        api.checkAndTrackSelfDanmu(li);
        await wait(700);
        assertFlagged(li, "迟到回执前");

        api.handleChatmsgPacket("type@=chatmsg/rid@=9999/uid@=276064895/nn@=测试大神/txt@=网络大卡顿弹幕/cid@=a6/");
        await wait(60);
        assertNotFlagged(li, "迟到回执到达后");
        console.log("✓ Case 6 通过: 迟到回执到达后自动撤销删除线与提示（自愈）");
    }

    // ---------- Case 7: 零回执熔断保护，杜绝全量误判 ----------
    {
        const { win, api, notices } = loadRealModule({ uid: "", name: "" });
        const nodes = [];
        // 第一条：超过 5s 观察窗，期间始终零回执
        const first = addSelfDanmaku(win, "熔断测试弹幕0", "");
        nodes.push(first);
        api.checkAndTrackSelfDanmu(first);
        await wait(5300);

        for (let i = 1; i < 6; i++) {
            const li = addSelfDanmaku(win, "熔断测试弹幕" + i, "");
            nodes.push(li);
            api.checkAndTrackSelfDanmu(li);
        }
        assert.strictEqual(api.isBarrageCheckDisabled(), true, "持续零回执必须触发熔断停用");

        await wait(700);
        nodes.forEach((li, i) => assertNotFlagged(li, "熔断后第" + (i + 1) + "条"));
        assert.ok(
            notices.some((n) => n.indexOf("已自动停用检测") !== -1),
            "熔断时必须提示用户检测已停用"
        );
        console.log("✓ Case 7 通过: 零回执熔断保护生效，杜绝全量误判");
    }

    // ---------- Case 8: 文本 + 斗鱼表情码 → 不误判 ----------
    // 实机取证：回执报文 txt 为原文「无敌[南波儿9]」，而渲染后 .Barrage-content 里
    // 表情码被整段替换成 <picture><img class="Emot-image">，DOM 文本只剩「无敌」。
    {
        const { win, api } = loadRealModule({});
        assert.strictEqual(api.normalizeDanmakuText("无敌[南波儿9]"), "无敌", "表情码必须被剥离");
        assert.strictEqual(api.normalizeDanmakuText("[emot:dy666]"), "", "emot:dy 形式同样剥离");

        api.handleChatmsgPacket("type@=chatmsg/rid@=9999/uid@=276064895/nn@=测试大神/txt@=无敌[南波儿9]/cid@=a8/");
        const li = addSelfDanmaku(
            win,
            '无敌<picture><source type="image/webp" srcset="x.webp"><img class="Emot-image" src="x.png"></picture>'
        );
        api.checkAndTrackSelfDanmu(li);
        await wait(700);
        assertNotFlagged(li, "含斗鱼表情的弹幕");
        console.log("✓ Case 8 通过: 文字+斗鱼表情的弹幕不再误判（表情码两侧对称剥离）");
    }

    // ---------- Case 9: 纯表情弹幕（DOM 文本为空）→ 不误判 ----------
    {
        const { win, api } = loadRealModule({});
        api.handleChatmsgPacket("type@=chatmsg/rid@=9999/uid@=276064895/nn@=测试大神/txt@=先来一条正常弹幕/cid@=a9a/");
        const li = addSelfDanmaku(win, '<picture><img class="Emot-image" src="x.png"></picture>');
        api.checkAndTrackSelfDanmu(li);
        await wait(700);
        assertNotFlagged(li, "纯表情弹幕");
        console.log("✓ Case 9 通过: 纯表情弹幕（DOM 文本为空）不误判");
    }

    // ---------- Case 10: 加固不得削弱检测——含表情的弹幕真被屏蔽（零回执）时仍要标记 ----------
    {
        const { win, api } = loadRealModule({});
        api.handleChatmsgPacket("type@=chatmsg/rid@=9999/uid@=276064895/nn@=测试大神/txt@=上一条正常弹幕/cid@=a10a/");
        const li = addSelfDanmaku(
            win,
            '违规词<picture><img class="Emot-image" src="x.png"></picture>'
        );
        api.checkAndTrackSelfDanmu(li);
        await wait(700);
        assertFlagged(li, "含表情的违规弹幕");
        console.log("✓ Case 10 通过: 含表情的违规弹幕零回执仍被标记（加固未削弱检测能力）");
    }

    // ---------- Case 11: 判定依据只进控制台，弹幕区文案保持原样 ----------
    {
        const { win, api } = loadRealModule({});
        // 免登录通道先来一条别人的弹幕（证明通道活着），再来自己的回执
        api.handleChatmsgPacket("type@=chatmsg/rid@=9999/uid@=1/nn@=路人甲/txt@=别人的弹幕/cid@=b1/", "免登录");
        api.handleChatmsgPacket("type@=chatmsg/rid@=9999/uid@=276064895/nn@=测试大神/txt@=上一条正常弹幕/cid@=b2/", "免登录");
        assert.strictEqual(api.getLastSelfEchoChannel(), "免登录", "自身回执必须记下来源通道");
        assert.ok(api.getChannelLastSeenAt()["免登录"] > 0, "通道活性时间戳必须被记录");

        const logged = [];
        const origLog = console.log;
        console.log = function () { logged.push(Array.prototype.join.call(arguments, " ")); };
        let li;
        try {
            li = addSelfDanmaku(win, "这条没收到回执");
            api.checkAndTrackSelfDanmu(li);
            await wait(700);
        } finally {
            console.log = origLog;
        }
        assertFlagged(li, "带诊断的失败弹幕");

        // 弹幕区可见文案保持原样，判定依据挂在悬停提示里
        const tip = li.querySelector(".ex-danmaku-blocked-tip");
        assert.strictEqual(tip.textContent, "(可能发送失败)");
        assert.ok(
            tip.title.indexOf("该条弹幕发送失败/可能被系统屏蔽，不会被其他人看到（可能会误判）") === 0,
            "悬停提示必须保留原免责说明作为开头"
        );
        assert.ok(tip.title.indexOf("本条文本=这条没收到回执") !== -1, "悬停提示必须含本条文本");
        assert.ok(tip.title.indexOf("回执文本=上一条正常弹幕") !== -1, "悬停提示必须含被比对上的回执文本");
        assert.ok(tip.title.indexOf("免登录") !== -1, "悬停提示必须含回执来源通道");

        // 同一份判定依据也同步打一条控制台日志
        const line = logged.filter(function (s) { return s.indexOf("[DouyuEx][弹幕发送检测]") !== -1; })[0] || "";
        assert.ok(line.indexOf("本条文本=这条没收到回执") !== -1, "控制台必须含本条文本");
        assert.ok(line.indexOf("免登录") !== -1, "控制台必须含回执来源通道");
        console.log("✓ Case 11 通过: 判定依据悬停可见 + 同步进控制台，弹幕区可见文案不变");
    }

    console.log("=== 全部 12 项核心测试 100% 通过 ===");
}

runTests().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
});
