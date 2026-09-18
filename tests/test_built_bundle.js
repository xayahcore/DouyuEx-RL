const fs = require("fs");
const assert = require("assert");
const { JSDOM } = require("D:/harness/_cdp/node_modules/jsdom");

async function testBuiltBundle() {
    console.log("=== 正在对编译生成的 DouyuEx_RL.user.js 开展端到端集成测试 ===");

    const code = fs.readFileSync("D:/DouyuEx-RL/DouyuEx_RL.user.js", "utf8");

    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>
        <div class="layout-Player-videoEntity"><video></video></div>
        <div class="disable-23f484"></div>
        <div class="right-e7ea5d"></div>
        <div class="Barrage-main">
            <ul id="js-barrage-list" class="Barrage-list"></ul>
        </div>
        <div class="BackpackButton"></div>
    </body></html>`, {
        url: "https://www.douyu.com/9999",
        runScripts: "dangerously"
    });

    const win = dom.window;
    win.URL.createObjectURL = () => "blob:mock";
    win.URL.revokeObjectURL = () => {};
    win.unsafeWindow = win;
    win.fetch = async (url, opts) => {
        if (typeof url === "string" && url.includes("userLevelDetail")) {
            return {
                json: async () => ({ error: 0, data: { taskIds: [] } }),
                text: async () => JSON.stringify({ error: 0, data: { taskIds: [] } })
            };
        }
        if (typeof url === "string" && url.includes("getFansBadgeList")) {
            return {
                text: async () => `<!DOCTYPE html><html><body><div class="fans-badge-list"><div><div data-fans-room="9999"></div></div></div></body></html>`,
                json: async () => ({})
            };
        }
        return {
            json: async () => ({ error: 0, data: { list: [], taskIds: [] } }),
            text: async () => JSON.stringify({ error: 0, data: { list: [], taskIds: [] } })
        };
    };
    win.GM_info = { script: { version: "2026.09.18.01" } };
    win.GM_getValue = () => null;
    win.GM_setValue = () => {};
    win.GM_addStyle = () => {};
    win.GM_setClipboard = () => {};
    win.GM_xmlhttpRequest = () => {};
    win.GM_cookie = () => {};
    win.GM_registerMenuCommand = () => {};
    win.room_id = "9999";
    win.document.cookie = "acf_uid=888888; acf_nickname=%E6%B5%8B%E8%AF%95%E5%A4%A7%E7%A5%9E;";

    const errors = [];
    win.addEventListener("error", (e) => {
        errors.push(e.message || (e.error && e.error.stack) || e.error);
    });

    try {
        win.eval(code);
        console.log("✓ 插件主体执行成功，无同步异常");
    } catch (e) {
        console.error("Plugin eval failed:", e);
        process.exit(1);
    }

    // 等待路由初始化完成 (1000ms + 1500ms 后 d() 会被调用)
    await new Promise(r => setTimeout(r, 3200));
    assert.strictEqual(errors.length, 0, "运行期间不应该产生未捕获异常: " + JSON.stringify(errors));
    assert.strictEqual(typeof win.__onDouyuExChatmsg, "function", "全局 __onDouyuExChatmsg 必须成功挂载");
    console.log("✓ 路由调度与 __onDouyuExChatmsg 初始化成功");

    const list = win.document.getElementById("js-barrage-list");
    assert.ok(list, "#js-barrage-list 节点必须存在");

    // === 测试 1: 发送正常弹幕 ===
    console.log("--> 测试场景 1: 发送正常弹幕并模拟 WebSocket 广播接收...");
    const liNormal = win.document.createElement("li");
    liNormal.className = "Barrage-listItem";
    liNormal.innerHTML = `<span class="Barrage-nickName is-self">测试大神</span><span class="Barrage-content">加油冲呀！</span>`;
    list.appendChild(liNormal);

    // 模拟 100ms 后收到 WebSocket chatmsg 报文
    await new Promise(r => setTimeout(r, 100));
    win.__onDouyuExChatmsg("type@=chatmsg/rid@=9999/uid@=888888/nn@=测试大神/txt@=加油冲呀！/");

    // 等待 950ms 超时判定
    await new Promise(r => setTimeout(r, 950));
    const contentNormal = liNormal.querySelector(".Barrage-content");
    assert.strictEqual(contentNormal.style.textDecoration, "", "正常弹幕在收到 chatmsg 后不得添加删除线");
    assert.strictEqual(liNormal.querySelector(".ex-danmaku-blocked-tip"), null, "正常弹幕不得追加失败提示");
    console.log("✓ 测试场景 1 通过: 正常弹幕成功验证，无删除线");

    // === 测试 2: 发送包含违规屏蔽词的弹幕（服务器静默不广播）===
    console.log("--> 测试场景 2: 发送包含违规屏蔽词的弹幕（服务器静默不广播）...");
    const liBlocked = win.document.createElement("li");
    liBlocked.className = "Barrage-listItem";
    liBlocked.innerHTML = `<span class="Barrage-nickName is-self">测试大神</span><span class="Barrage-content">这是一条被系统屏蔽的违规测试词</span>`;
    list.appendChild(liBlocked);

    // 不发送任何 chatmsg，模拟服务器静默丢弃
    // 等待 950ms 超时判定
    await new Promise(r => setTimeout(r, 950));
    const contentBlocked = liBlocked.querySelector(".Barrage-content");
    assert.ok(contentBlocked.style.textDecoration.includes("line-through"), "被系统屏蔽的弹幕必须带有删除线");
    const tipEl = liBlocked.querySelector(".ex-danmaku-blocked-tip");
    assert.ok(tipEl !== null, "被系统屏蔽的弹幕必须带有 (可能发送失败) 提示标签");
    assert.strictEqual(tipEl.textContent, "(可能发送失败)");
    assert.strictEqual(tipEl.title, "该条弹幕发送失败/可能被系统屏蔽，不会被其他人看到（可能会误判）");
    console.log("✓ 测试场景 2 通过: 屏蔽弹幕准确识别并渲染删除线与(可能发送失败)提示");

    console.log("=== 端到端集成测试全流程 100% 通过 ===");
    process.exit(0);
}

testBuiltBundle().catch(err => {
    console.error("端到端测试失败:", err);
    process.exit(1);
});
