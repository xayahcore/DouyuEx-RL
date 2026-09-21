const fs = require("fs");
const path = require("path");
const assert = require("assert");
let JSDOM;
try {
    JSDOM = require("jsdom").JSDOM;
} catch (e) {
    JSDOM = require("D:/harness/_cdp/node_modules/jsdom").JSDOM;
}

async function testBuiltBundle() {
    console.log("=== 正在对编译生成的 douyuex.user.js 开展端到端集成测试 ===");

    const bundlePath = fs.existsSync(path.join(__dirname, "../dist/douyuex.user.js"))
        ? path.join(__dirname, "../dist/douyuex.user.js")
        : (fs.existsSync(path.join(__dirname, "../DouyuEx_RL.user.js"))
            ? path.join(__dirname, "../DouyuEx_RL.user.js")
            : path.join(__dirname, "../dist/douyuex.js"));
    const code = fs.readFileSync(bundlePath, "utf8");

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
    const metaVer = (code.match(/\/\/\s*@version\s+([^\r\n]+)/) || [])[1] || "2026.09.21.01";
    win.GM_info = { script: { version: metaVer.trim() } };
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

    // === 测试 3: PostbirdAlertBox 通用弹框渲染与交互 ===
    console.log("--> 测试场景 3: 验证 PostbirdAlertBox 通用弹窗...");
    assert.ok(win.PostbirdAlertBox, "PostbirdAlertBox 必须挂载在全局");
    let promptResult = null;
    win.PostbirdAlertBox.prompt({
        title: "导入黑名单",
        onConfirm: (val) => { promptResult = val; }
    });
    const promptContainer = win.document.querySelector(".postbird-box-container");
    assert.ok(promptContainer && promptContainer.classList.contains("active"), "弹窗容器必须具备 active 类");
    const promptDialog = promptContainer.querySelector(".postbird-box-dialog");
    assert.ok(promptDialog, "弹窗必须具备 postbird-box-dialog 居中结构");
    const promptInput = promptContainer.querySelector(".postbird-prompt-input");
    assert.ok(promptInput, "输入框必须可读写");
    promptInput.value = "test_blacklist_user";
    const okBtn = promptContainer.querySelector(".btn-footer-ok");
    assert.ok(okBtn, "确认按钮必须存在");
    okBtn.click();
    assert.strictEqual(promptResult, "test_blacklist_user", "点击确认必须正确触发回调并传递输入值");
    assert.strictEqual(win.document.querySelector(".postbird-box-container"), null, "确认后弹窗容器必须从 DOM 中销毁");
    console.log("✓ 测试场景 3 通过: PostbirdAlertBox 居中交互与回调正常，无蒙层卡死");

    // === 测试 4: ExpandTool 礼物徽章与 5 级模态选择器 ===
    console.log("--> 测试场景 4: 验证 ExpandTool 礼物徽章与 5 级模态选择器...");
    const clearBagBadge = win.document.getElementById("extool__clearbag_badge");
    const sendGiftBadge = win.document.getElementById("extool__sendgift_badge");
    assert.ok(clearBagBadge, "背包送礼必须具备可点击礼物徽章 #extool__clearbag_badge");
    assert.ok(sendGiftBadge, "打榜送礼必须具备可点击礼物徽章 #extool__sendgift_badge");
    const clearBagId = win.document.getElementById("extool__clearbag_id");
    const sendGiftId = win.document.getElementById("extool__sendgift_id");
    assert.strictEqual(clearBagId.type, "hidden", "礼物 ID 必须收纳为 hidden 输入框，对用户隐藏");
    assert.strictEqual(sendGiftId.type, "hidden", "打榜 ID 必须收纳为 hidden 输入框，对用户隐藏");

    assert.ok(typeof win.openGiftPicker === "function", "openGiftPicker 必须成功注册到全局");
    let selectedGift = null;
    win.openGiftPicker("backpack", (gift) => { selectedGift = gift; });
    const pickerModal = win.document.querySelector(".ex-gift-picker-modal");
    const pickerMask = win.document.querySelector(".ex-gift-picker-mask");
    assert.ok(pickerModal && pickerMask, "打开礼物选择器时必须在 body 创建 modal 与 mask");
    assert.ok(pickerModal.querySelector(".ex-gift-picker__tabs"), "必须包含选项卡切换区");
    assert.ok(pickerModal.querySelector(".ex-gift-picker__search"), "必须包含搜索输入框");
    const closePickerBtn = pickerModal.querySelector(".ex-gift-picker__close");
    assert.ok(closePickerBtn, "必须包含关闭按钮");
    closePickerBtn.click();
    console.log("✓ 测试场景 4 通过: 礼物徽章与 5 级模态大选择器渲染完备");

    // === 测试 5: DanmakuTail 弹幕小尾巴弹窗 ===
    console.log("--> 测试场景 5: 验证 DanmakuTail 弹幕小尾巴弹窗...");
    const tailBtn = win.document.querySelector(".ChatToolBar-DanmakuTail");
    const tailPanel = win.document.querySelector(".ChatToolBar-DanmakuTail-Panel");
    assert.ok(tailBtn, "工具栏必须存在 .ChatToolBar-DanmakuTail 按钮");
    assert.ok(tailPanel, "必须存在 .ChatToolBar-DanmakuTail-Panel 面板");
    assert.ok(tailPanel.querySelector(".DanmakuTail-close"), "面板必须具备关闭按钮");
    assert.ok(tailPanel.querySelector("#DanmakuTail-checkbox"), "面板必须具备弹簧开关");
    console.log("✓ 测试场景 5 通过: 弹幕小尾巴独立微悬浮面板与关闭按钮就绪");

    // === 测试 6: 二级 Dock 菜单未展开三级菜单时移出自动关闭 ===
    console.log("--> 测试场景 6: 验证二级 Dock 未展开三级菜单时移开自动收拢...");
    const exIcon = win.document.querySelector(".ex-icon");
    const exPanel = win.document.querySelector(".ex-panel");
    assert.ok(exIcon, ".ex-icon 精灵球节点必须存在");
    assert.ok(exPanel, ".ex-panel 二级 Dock 节点必须存在");

    // 模拟鼠标悬停精灵球
    exIcon.dispatchEvent(new win.Event("mouseenter"));
    assert.ok(exPanel.style.display === "flex" || exPanel.style.display === "block", "悬停精灵球后二级 Dock 必须打开");
    assert.ok(exPanel.classList.contains("miuix-dock-in"), "二级 Dock 必须挂载 miuix-dock-in 弹簧动画类");

    // 未展开任何三级菜单，鼠标离开二级 Dock 经过防抖与平滑动画后自动关闭
    exPanel.dispatchEvent(new win.Event("mouseleave"));
    await new Promise(r => setTimeout(r, 450));
    assert.strictEqual(exPanel.style.display, "none", "未展开三级菜单时移开鼠标，二级 Dock 必须自动收拢关闭");
    console.log("✓ 测试场景 6 通过: 未展开三级菜单时移开鼠标自动关闭验证通过");

    // === 测试 7: 三级菜单悬停即开、移开不关、有三级菜单时 Dock 保持展开 ===
    console.log("--> 测试场景 7: 验证三级菜单悬停即开、移开不关、Dock 保持展开...");
    exIcon.dispatchEvent(new win.Event("mouseenter"));
    assert.ok(exPanel.style.display === "flex" || exPanel.style.display === "block", "重新唤出二级 Dock");

    // 模拟悬停一键签到按钮
    const signDockBtn = exPanel.querySelector(".ex-sign");
    assert.ok(signDockBtn, "Dock 必须包含 .ex-sign 签到按钮");
    signDockBtn.dispatchEvent(new win.Event("mouseenter"));

    const signModal = win.document.querySelector(".sign-panel");
    assert.ok(signModal, ".sign-panel 三级面板必须被创建并渲染");
    assert.ok(signModal.style.display === "flex" || signModal.style.display === "block", "悬停 Dock 图标三级菜单必须立即展开");

    // 鼠标离开二级 Dock，但因为三级菜单正展开着，Dock 必须保持展开
    exPanel.dispatchEvent(new win.Event("mouseleave"));
    await new Promise(r => setTimeout(r, 300));
    assert.ok(exPanel.style.display === "flex" || exPanel.style.display === "block", "已展开三级菜单时鼠标移出 Dock，Dock 必须坚挺保持打开");
    assert.ok(signModal.style.display === "flex" || signModal.style.display === "block", "三级菜单移除关闭功能，移开鼠标绝不自动关闭");

    // 点击三级菜单右上角关闭按钮
    const signCloseBtn = signModal.querySelector(".miuix-modal__close");
    assert.ok(signCloseBtn, "三级菜单必须具备关闭按钮");
    signCloseBtn.click();
    assert.strictEqual(signModal.style.display, "none", "点击 × 后三级菜单必须关闭");
    await new Promise(r => setTimeout(r, 220));
    assert.strictEqual(exPanel.style.display, "none", "三级菜单关闭且鼠标不在 Dock 上时，Dock 顺滑收拢");
    console.log("✓ 测试场景 7 通过: 三级菜单悬停打开、移除关闭功能、Dock 联动保活全流程验证通过");

    // === 测试 8: ExpandTool 道具与礼物记忆持久化 ===
    console.log("--> 测试场景 8: 验证道具与礼物 localStorage 记忆持久化...");
    const clearBagCnt = win.document.getElementById("extool__clearbag_cnt");
    clearBagCnt.value = "10";
    clearBagCnt.dispatchEvent(new win.Event("input"));
    const savedClearBag = JSON.parse(win.localStorage.getItem("ExSave_ClearBag"));
    assert.ok(savedClearBag, "ExSave_ClearBag 必须成功持久化到 localStorage");
    assert.strictEqual(savedClearBag.count, "10", "背包道具送出数量必须正确记忆");

    const sendGiftCnt = win.document.getElementById("extool__sendgift_cnt");
    sendGiftCnt.value = "66";
    sendGiftCnt.dispatchEvent(new win.Event("input"));
    const savedSendGift = JSON.parse(win.localStorage.getItem("ExSave_SendGift"));
    assert.ok(savedSendGift, "ExSave_SendGift 必须成功持久化到 localStorage");
    assert.strictEqual(savedSendGift.count, "66", "打榜礼物送出数量必须正确记忆");
    console.log("✓ 测试场景 8 通过: 选择道具与礼物本地记忆读写正常");

    // === 测试 9: 版本更新三级面板分类与【其它】板块恢复 ===
    console.log("--> 测试场景 9: 验证版本更新三级控制台与【其它】板块...");
    assert.strictEqual(win.curVersion, "2026.09.21.01", "全局版本号必须为 2026.09.21.01");
    win.createExUpdatePanel();
    const updateModal = win.document.querySelector(".exupdate-panel");
    assert.ok(updateModal, ".exupdate-panel 必须被创建");
    const cards = updateModal.querySelectorAll(".exupdate-panel__card");
    assert.strictEqual(cards.length, 3, "版本更新面板必须包含 3 个标准分类卡片 (功能升级/交互与体验/其它)");
    const titles = Array.from(cards).map(c => c.querySelector(".exupdate-panel__card-title")?.textContent.trim());
    assert.ok(titles.includes("其它·"), "版本更新面板必须恢复【其它·】板块");
    console.log("✓ 测试场景 9 通过: 版本号 2026.09.21.01、三级菜单分类日志与【其它】板块恢复验证通过");

    // === 测试 10: 检查更新按钮状态机流转与多源容灾 ===
    console.log("--> 测试场景 10: 验证检查更新按钮状态流转 (ack -> check -> checking -> latest/upgrade/error)...");
    const updateBtn = updateModal.querySelector("#exupdate-action-btn");
    assert.ok(updateBtn, "#exupdate-action-btn 按钮必须存在");

    // 1. 点击“我已收到”进入“检查更新”
    updateBtn.dataset.state = "ack";
    updateBtn.click();
    assert.strictEqual(updateBtn.dataset.state, "check", "确认后状态必须流转为 check");
    assert.strictEqual(updateBtn.textContent, "检查更新");

    // 2. 模拟点击“检查更新”，此时远程返回与当前相同版本 (2026.09.21.01)
    win.GM_xmlhttpRequest = (opts) => {
        setTimeout(() => {
            opts.onload({ status: 200, responseText: JSON.stringify({ version: "2026.09.21.01" }) });
        }, 10);
    };
    updateBtn.click();
    assert.strictEqual(updateBtn.dataset.state, "checking", "请求期间按钮必须处于 checking 禁用状态");
    await new Promise(r => setTimeout(r, 60));
    assert.strictEqual(updateBtn.dataset.state, "latest", "版本相同时状态必须流转为 latest");
    assert.ok(updateBtn.textContent.includes("已是最新"), "按钮文本必须提示已是最新");

    // 3. 模拟检测到更高的新版本 (2026.09.22.01)
    win.GM_xmlhttpRequest = (opts) => {
        setTimeout(() => {
            opts.onload({ status: 200, responseText: JSON.stringify({ version: "2026.09.22.01" }) });
        }, 10);
    };
    updateBtn.click();
    await new Promise(r => setTimeout(r, 60));
    assert.strictEqual(updateBtn.dataset.state, "upgrade", "检测到更高版本时状态必须流转为 upgrade");
    assert.ok(updateBtn.textContent.includes("前往更新"), "按钮文本必须引导前往更新");

    // 4. 模拟网络请求彻底失败
    win.GM_xmlhttpRequest = (opts) => {
        setTimeout(() => {
            opts.onerror(new Error("Network Error"));
        }, 10);
    };
    updateBtn.dataset.state = "check";
    updateBtn.click();
    await new Promise(r => setTimeout(r, 60));
    assert.strictEqual(updateBtn.dataset.state, "error", "网络完全异常时状态必须流转为 error，禁止误报已是最新");
    assert.ok(updateBtn.textContent.includes("检查失败"), "必须明确告知用户检查失败");
    console.log("✓ 测试场景 10 通过: 检查更新按钮多态流转与容灾状态判定 100% 正确");

    console.log("=== 端到端集成测试全流程 100% 通过 ===");
    process.exit(0);
}

testBuiltBundle().catch(err => {
    console.error("端到端测试失败:", err);
    process.exit(1);
});
