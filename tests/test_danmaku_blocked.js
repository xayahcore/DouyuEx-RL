const assert = require("assert");
let JSDOM;
try {
    JSDOM = require("jsdom").JSDOM;
} catch (e) {
    JSDOM = require("D:/harness/_cdp/node_modules/jsdom").JSDOM;
}

function createMockEnvironment() {
    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>
        <div class="Barrage-main">
            <ul id="js-barrage-list" class="Barrage-list"></ul>
        </div>
    </body></html>`, { url: "https://www.douyu.com/9999", runScripts: "dangerously" });
    const win = dom.window;
    return win;
}

// 模拟待实现的 initDanmakuBlockedCheck 逻辑
function installDanmakuBlockedCheck(win, opts = {}) {
    const timeoutMs = opts.timeoutMs || 2500;
    let pendingList = [];
    let seqId = 0;

    function handleChatmsgPacket(msg) {
        if (!msg || typeof msg !== "string") return;
        if (msg.indexOf("type@=chatmsg") === -1) return;

        function getVal(str, start, end) {
            const idx = str.indexOf(start);
            if (idx === -1) return "";
            const s = idx + start.length;
            const e = str.indexOf(end, s);
            return e !== -1 ? str.slice(s, e) : str.slice(s);
        }

        const txt = getVal(msg, "txt@=", "/");
        if (!txt) return;

        const senderUid = getVal(msg, "uid@=", "/");
        const senderNick = getVal(msg, "nn@=", "/");

        const myUid = win.I || "";
        const myNick = win.W || "";

        let isSelf = false;
        if (myUid && senderUid && senderUid === myUid) {
            isSelf = true;
        } else if (myNick && senderNick && senderNick === myNick) {
            isSelf = true;
        } else if (senderNick && pendingList.some(p => p.senderNick === senderNick)) {
            isSelf = true;
            if (!win.W) win.W = senderNick;
        }

        if (!isSelf) return;

        const cleanTxt = txt.replace(/\[DouyuEx图片[^\]]+\]/g, "").replace(/\s+/g, " ").trim();

        for (let i = 0; i < pendingList.length; i++) {
            const item = pendingList[i];
            if (item.cleanText === cleanTxt && (!item.confirmed)) {
                item.confirmed = true;
                item.resolved = true;
                if (item.timer) {
                    clearTimeout(item.timer);
                    item.timer = null;
                }
                if (item.contentEl && item.contentEl.style.textDecoration && item.contentEl.style.textDecoration.includes("line-through")) {
                    item.contentEl.style.textDecoration = "";
                    item.contentEl.style.textDecorationLine = "";
                    item.contentEl.style.textDecorationColor = "";
                    const tip = item.node.querySelector(".ex-danmaku-blocked-tip");
                    if (tip) tip.remove();
                }
                break;
            }
        }

        const now = Date.now();
        pendingList = pendingList.filter(p => !p.resolved || (now - p.createdAt < 10000));
    }

    win.__onDouyuExChatmsg = handleChatmsgPacket;

    function markBlocked(item) {
        item.resolved = true;
        item.timer = null;
        if (!item.contentEl || !item.contentEl.parentNode) return;

        item.contentEl.style.textDecoration = "line-through gray 1px";
        item.contentEl.style.textDecorationLine = "line-through";
        item.contentEl.style.textDecorationColor = "gray";

        if (item.node.querySelector(".ex-danmaku-blocked-tip")) return;

        const tip = win.document.createElement("span");
        tip.className = "ex-danmaku-blocked-tip";
        tip.textContent = "(可能发送失败)";
        tip.style.marginLeft = "4px";
        tip.style.color = "gray";
        tip.style.fontSize = "9px";
        tip.style.cursor = "pointer";
        tip.title = "该条弹幕发送失败/可能被系统屏蔽，不会被其他人看到（可能会误判）";

        item.contentEl.parentNode.insertBefore(tip, item.contentEl.nextSibling);
    }

    function checkAndTrackSelfDanmu(node) {
        if (!node || node.nodeType !== 1) return;

        const hasSelf = node.classList.contains("is-self") || node.querySelector(".is-self");
        if (!hasSelf) return;

        const contentEl = node.classList.contains("Barrage-content") ? node : node.querySelector(".Barrage-content");
        if (!contentEl) return;

        const rawText = (contentEl.innerText || contentEl.textContent || "").trim();
        if (!rawText) return;

        const cleanText = rawText.replace(/\[DouyuEx图片[^\]]+\]/g, "").replace(/\s+/g, " ").trim();

        const nickEl = node.querySelector(".Barrage-nickName.is-self") || node.querySelector(".Barrage-nickName") || node.querySelector(".is-self");
        const senderNick = nickEl ? (nickEl.innerText || nickEl.textContent || "").trim() : (win.W || "");
        if (senderNick && (!win.W || win.W !== senderNick)) {
            win.W = senderNick;
        }

        const item = {
            id: ++seqId,
            node: node,
            contentEl: contentEl,
            rawText: rawText,
            cleanText: cleanText,
            senderNick: senderNick,
            createdAt: Date.now(),
            resolved: false,
            timer: null
        };

        item.timer = setTimeout(() => {
            if (!item.resolved) {
                markBlocked(item);
            }
        }, timeoutMs);

        pendingList.push(item);
    }

    const list = win.document.getElementById("js-barrage-list") || win.document.querySelector(".Barrage-list");
    const observer = new win.MutationObserver((mutations) => {
        for (const m of mutations) {
            if (!m.addedNodes) continue;
            for (let i = 0; i < m.addedNodes.length; i++) {
                checkAndTrackSelfDanmu(m.addedNodes[i]);
            }
        }
    });

    observer.observe(list, { childList: true, subtree: false });

    return {
        getPending: () => pendingList,
        destroy: () => observer.disconnect()
    };
}

async function runTests() {
    console.log("=== 正在运行弹幕屏蔽词检测单元测试 ===");

    // Case 1: 正常弹幕收到回执，不加删除线
    {
        const win = createMockEnvironment();
        win.W = "测试玩家";
        win.I = "10001";
        installDanmakuBlockedCheck(win, { timeoutMs: 300 });

        const list = win.document.getElementById("js-barrage-list");
        const li = win.document.createElement("li");
        li.className = "Barrage-listItem";
        li.innerHTML = `<span class="Barrage-nickName is-self">测试玩家</span><span class="Barrage-content">666主播好球</span>`;
        list.appendChild(li);

        // 模拟 50ms 后 WebSocket 收到服务器广播
        await new Promise(r => setTimeout(r, 50));
        win.__onDouyuExChatmsg("type@=chatmsg/rid@=9999/uid@=10001/nn@=测试玩家/txt@=666主播好球/");

        // 等待超时时间到达 (350ms)
        await new Promise(r => setTimeout(r, 350));
        const content = li.querySelector(".Barrage-content");
        assert.strictEqual(content.style.textDecoration, "", "正常弹幕不应该有删除线");
        assert.strictEqual(li.querySelector(".ex-danmaku-blocked-tip"), null, "正常弹幕不应该有(可能发送失败)提示");
        console.log("✓ Case 1 通过: 正常弹幕成功接收回执，无删除线");
    }

    // Case 2: 违规敏感词弹幕未收到回执，添加删除线与提示
    {
        const win = createMockEnvironment();
        win.W = "测试玩家";
        win.I = "10001";
        installDanmakuBlockedCheck(win, { timeoutMs: 300 });

        const list = win.document.getElementById("js-barrage-list");
        const li = win.document.createElement("li");
        li.className = "Barrage-listItem";
        li.innerHTML = `<span class="Barrage-nickName is-self">测试玩家</span><span class="Barrage-content">这是一条违规敏感词弹幕</span>`;
        list.appendChild(li);

        // 服务器静默丢弃，不发 chatmsg 回执
        await new Promise(r => setTimeout(r, 400));
        const content = li.querySelector(".Barrage-content");
        assert.ok(content.style.textDecoration.includes("line-through"), "被屏蔽弹幕必须具备删除线");
        const tip = li.querySelector(".ex-danmaku-blocked-tip");
        assert.ok(tip !== null, "被屏蔽弹幕必须追加(可能发送失败)提示元素");
        assert.strictEqual(tip.textContent, "(可能发送失败)");
        console.log("✓ Case 2 通过: 违规弹幕被服务器屏蔽，成功触发删除线与(可能发送失败)提示");
    }

    // Case 3: 连续发送两条弹幕（一正常一被屏蔽），互不干扰
    {
        const win = createMockEnvironment();
        win.W = "测试玩家";
        win.I = "10001";
        installDanmakuBlockedCheck(win, { timeoutMs: 300 });

        const list = win.document.getElementById("js-barrage-list");
        
        // 弹幕 A
        const liA = win.document.createElement("li");
        liA.className = "Barrage-listItem";
        liA.innerHTML = `<span class="Barrage-nickName is-self">测试玩家</span><span class="Barrage-content">弹幕A正常通过</span>`;
        list.appendChild(liA);

        // 50ms 后发弹幕 B
        await new Promise(r => setTimeout(r, 50));
        const liB = win.document.createElement("li");
        liB.className = "Barrage-listItem";
        liB.innerHTML = `<span class="Barrage-nickName is-self">测试玩家</span><span class="Barrage-content">弹幕B被系统过滤</span>`;
        list.appendChild(liB);

        // 仅弹幕 A 收到回执
        await new Promise(r => setTimeout(r, 30));
        win.__onDouyuExChatmsg("type@=chatmsg/rid@=9999/uid@=10001/nn@=测试玩家/txt@=弹幕A正常通过/");

        // 等待超时
        await new Promise(r => setTimeout(r, 350));
        const contentA = liA.querySelector(".Barrage-content");
        const contentB = liB.querySelector(".Barrage-content");

        assert.strictEqual(contentA.style.textDecoration, "", "弹幕A不应该有删除线");
        assert.ok(contentB.style.textDecoration.includes("line-through"), "弹幕B必须有删除线");
        assert.ok(liB.querySelector(".ex-danmaku-blocked-tip") !== null, "弹幕B必须有提示标签");
        console.log("✓ Case 3 通过: 连续发送多条弹幕独立判定，无串扰与计时器覆盖问题");
    }

    // Case 4: 极端网络延迟恢复（延迟回执解除删除线）
    {
        const win = createMockEnvironment();
        win.W = "测试玩家";
        win.I = "10001";
        installDanmakuBlockedCheck(win, { timeoutMs: 200 });

        const list = win.document.getElementById("js-barrage-list");
        const li = win.document.createElement("li");
        li.className = "Barrage-listItem";
        li.innerHTML = `<span class="Barrage-nickName is-self">测试玩家</span><span class="Barrage-content">网络大卡顿弹幕</span>`;
        list.appendChild(li);

        // 等待超时触发删除线
        await new Promise(r => setTimeout(r, 250));
        const content = li.querySelector(".Barrage-content");
        assert.ok(content.style.textDecoration.includes("line-through"), "先超时触发删除线");

        // 迟到的 WebSocket 回执到达
        win.__onDouyuExChatmsg("type@=chatmsg/rid@=9999/uid@=10001/nn@=测试玩家/txt@=网络大卡顿弹幕/");
        assert.strictEqual(content.style.textDecoration, "", "迟到回执到达后自动清除删除线");
        assert.strictEqual(li.querySelector(".ex-danmaku-blocked-tip"), null, "迟到回执到达后自动清除提示");
        console.log("✓ Case 4 通过: 迟到回执自愈机制正常，容错性完备");
    }

    // Case 5: 连续发送相同文本的弹幕（如连续两条“666”），严格先进先出核验
    {
        const win = createMockEnvironment();
        win.W = "测试玩家";
        win.I = "10001";
        installDanmakuBlockedCheck(win, { timeoutMs: 300 });

        const list = win.document.getElementById("js-barrage-list");

        // 弹幕 1
        const li1 = win.document.createElement("li");
        li1.className = "Barrage-listItem";
        li1.innerHTML = `<span class="Barrage-nickName is-self">测试玩家</span><span class="Barrage-content">666</span>`;
        list.appendChild(li1);

        // 100ms 后弹幕 2
        await new Promise(r => setTimeout(r, 100));
        const li2 = win.document.createElement("li");
        li2.className = "Barrage-listItem";
        li2.innerHTML = `<span class="Barrage-nickName is-self">测试玩家</span><span class="Barrage-content">666</span>`;
        list.appendChild(li2);

        // 仅收到 1 个 666 回执
        await new Promise(r => setTimeout(r, 50));
        win.__onDouyuExChatmsg("type@=chatmsg/rid@=9999/uid@=10001/nn@=测试玩家/txt@=666/");

        // 等待超时 (400ms)
        await new Promise(r => setTimeout(r, 400));
        const content1 = li1.querySelector(".Barrage-content");
        const content2 = li2.querySelector(".Barrage-content");

        assert.strictEqual(content1.style.textDecoration, "", "第一条666收到回执，无删除线");
        assert.ok(content2.style.textDecoration.includes("line-through"), "第二条666被屏蔽，有删除线");
        assert.ok(li2.querySelector(".ex-danmaku-blocked-tip") !== null, "第二条666有提示");
        console.log("✓ Case 5 通过: 连续重复内容弹幕 FIFO 队列正确匹配");
    }

    console.log("=== 全部 5 项核心测试 100% 通过 ===");
}

runTests().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
