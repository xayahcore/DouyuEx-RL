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

// 从源码读取 @version 作为期望值：既避免每次发版都要手改这里的版本字面量，
// 也让断言真正校验「产物版本 == 源码版本」，而不是校验一个被同步改过的常量。
const SRC_VERSION = (fs.readFileSync(path.join(__dirname, "../src/main.js"), "utf8")
    .match(/\/\/\s*@version\s+([^\r\n]+)/) || [])[1];
if (!SRC_VERSION) throw new Error("无法从 src/main.js 解析 @version");

// 生成"下一个版本号"（仅递增末段），供版本比对场景推导期望值。
// 否则这些场景会把某个历史版本字面量写死，一旦发版超过它就莫名失败。
function bumpVersion(v) {
    const parts = v.split(".");
    const last = parts[parts.length - 1];
    const next = String(Number(last) + 1);
    parts[parts.length - 1] = next.length < last.length ? next.padStart(last.length, "0") : next;
    return parts.join(".");
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

    // === 测试 2.1: 斗鱼重渲染产生同文本双节点，两个都不得误判 ===
    console.log("--> 测试场景 2.1: 验证重渲染同文本双节点不产生误判...");
    const liDup1 = win.document.createElement("li");
    liDup1.className = "Barrage-listItem";
    liDup1.innerHTML = `<span class="Barrage-nickName is-self">测试大神</span><span class="Barrage-content">重渲染双节点弹幕</span>`;
    list.appendChild(liDup1);
    await new Promise(r => setTimeout(r, 60));
    const liDup2 = win.document.createElement("li");
    liDup2.className = "Barrage-listItem";
    liDup2.innerHTML = `<span class="Barrage-nickName is-self">测试大神</span><span class="Barrage-content">重渲染双节点弹幕</span>`;
    list.appendChild(liDup2);

    // 服务端仅广播一次回执
    await new Promise(r => setTimeout(r, 60));
    win.__onDouyuExChatmsg("type@=chatmsg/rid@=9999/uid@=888888/nn@=测试大神/txt@=重渲染双节点弹幕/cid@=dup1/");

    await new Promise(r => setTimeout(r, 950));
    assert.strictEqual(liDup1.querySelector(".Barrage-content").style.textDecoration, "", "重渲染第 1 个节点不得被误判");
    assert.strictEqual(liDup2.querySelector(".Barrage-content").style.textDecoration, "", "重渲染第 2 个节点不得被误判");
    assert.strictEqual(liDup2.querySelector(".ex-danmaku-blocked-tip"), null, "重渲染第 2 个节点不得带失败提示");
    console.log("✓ 测试场景 2.1 通过: 重渲染同文本双节点均不误判（旧版队列算法在此必然误报）");

    // === 测试 2.2: @S / @A 转义文本必须反转义后再比对 ===
    console.log("--> 测试场景 2.2: 验证 @S/@A 转义文本不产生误判...");
    const liEsc = win.document.createElement("li");
    liEsc.className = "Barrage-listItem";
    liEsc.innerHTML = `<span class="Barrage-nickName is-self">测试大神</span><span class="Barrage-content">1/2 走起</span>`;
    list.appendChild(liEsc);
    await new Promise(r => setTimeout(r, 60));
    // 协议中 "/" 被转义为 "@S"
    win.__onDouyuExChatmsg("type@=chatmsg/rid@=9999/uid@=888888/nn@=测试大神/txt@=1@S2 走起/cid@=esc1/");
    await new Promise(r => setTimeout(r, 950));
    assert.strictEqual(liEsc.querySelector(".Barrage-content").style.textDecoration, "", "含 / 的弹幕经 @S 反转义后不得被误判");
    console.log("✓ 测试场景 2.2 通过: @S/@A 转义文本反转义正确，不产生误判");

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

    // === 测试 6: 二级 Dock 不悬停自动打开、不自动关闭，仅点击打开 ===
    console.log("--> 测试场景 6: 验证二级 Dock 不悬停自动打开、不自动关闭...");
    const exIcon = win.document.querySelector(".ex-icon");
    const exPanel = win.document.querySelector(".ex-panel");
    assert.ok(exIcon, ".ex-icon 精灵球节点必须存在");
    assert.ok(exPanel, ".ex-panel 二级 Dock 节点必须存在");
    assert.ok(exPanel.style.display !== "flex" && exPanel.style.display !== "block", "初始状态下二级 Dock 必须处于关闭状态");

    // 1. 悬停精灵球：不得自动打开
    exIcon.dispatchEvent(new win.Event("mouseenter"));
    await new Promise(r => setTimeout(r, 120));
    assert.ok(
        exPanel.style.display !== "flex" && exPanel.style.display !== "block",
        "悬停精灵球不得自动展开二级 Dock（已改为仅点击打开）"
    );

    // 2. 点击精灵球：打开
    exIcon.click();
    assert.ok(exPanel.style.display === "flex" || exPanel.style.display === "block", "点击精灵球后二级 Dock 必须打开");
    assert.ok(exPanel.classList.contains("miuix-dock-in"), "二级 Dock 必须挂载 miuix-dock-in 弹簧动画类");

    // 3. 鼠标移出 Dock：不得自动关闭
    exPanel.dispatchEvent(new win.Event("mouseleave"));
    await new Promise(r => setTimeout(r, 450));
    assert.ok(
        exPanel.style.display === "flex" || exPanel.style.display === "block",
        "鼠标移出二级 Dock 不得自动关闭，仅「点击 ×」才关闭"
    );
    console.log("✓ 测试场景 6 通过: 二级 Dock 不悬停自动打开、不自动关闭，仅点击打开");

    // === 测试 7: 三级菜单悬停即开、移开不关、Dock 保持展开、× 显式关闭 ===
    console.log("--> 测试场景 7: 验证三级菜单悬停即开、移开不关、Dock 保活...");
    assert.ok(exPanel.style.display === "flex" || exPanel.style.display === "block", "二级 Dock 应仍处于打开状态");

    // 模拟悬停一键签到按钮
    const signDockBtn = exPanel.querySelector(".ex-sign");
    assert.ok(signDockBtn, "Dock 必须包含 .ex-sign 签到按钮");
    signDockBtn.dispatchEvent(new win.Event("mouseenter"));

    const signModal = win.document.querySelector(".sign-panel");
    assert.ok(signModal, ".sign-panel 三级面板必须被创建并渲染");
    assert.ok(signModal.style.display === "flex" || signModal.style.display === "block", "悬停 Dock 图标三级菜单必须立即展开");

    // 鼠标离开二级 Dock：三级菜单与 Dock 都必须保持展开
    exPanel.dispatchEvent(new win.Event("mouseleave"));
    await new Promise(r => setTimeout(r, 300));
    assert.ok(exPanel.style.display === "flex" || exPanel.style.display === "block", "鼠标移出后 Dock 必须保持打开");
    assert.ok(signModal.style.display === "flex" || signModal.style.display === "block", "三级菜单移开鼠标绝不自动关闭");

    // 点击三级菜单右上角关闭按钮：仅关闭三级菜单，Dock 保持展开
    const signCloseBtn = signModal.querySelector(".miuix-modal__close");
    assert.ok(signCloseBtn, "三级菜单必须具备关闭按钮");
    signCloseBtn.click();
    assert.strictEqual(signModal.style.display, "none", "点击 × 后三级菜单必须关闭");
    await new Promise(r => setTimeout(r, 250));
    assert.ok(
        exPanel.style.display === "flex" || exPanel.style.display === "block",
        "关闭三级菜单后二级 Dock 必须保持展开（二级菜单不自动关闭）"
    );

    // 点击二级菜单 × 才关闭 Dock
    const dockCloseBtn = exPanel.querySelector(".ex-panel__close");
    assert.ok(dockCloseBtn, "二级 Dock 必须具备 .ex-panel__close 关闭按钮");
    dockCloseBtn.click();
    assert.ok(exPanel.classList.contains("miuix-dock-out"), "点击 × 后必须触发 miuix-dock-out 退出动画");
    await new Promise(r => setTimeout(r, 250));
    assert.strictEqual(exPanel.style.display, "none", "点击 × 后二级 Dock 必须关闭");
    console.log("✓ 测试场景 7 通过: 三级菜单悬停即开、移开不关，二级 Dock 仅由 × 显式关闭");

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

    // === 测试 9: 版本更新三级面板三大板块与条目格式 ===
    console.log("--> 测试场景 9: 验证版本更新三级控制台三大板块与条目格式...");
    assert.strictEqual(win.curVersion, SRC_VERSION, `全局版本号必须与源码 @version 一致 (${SRC_VERSION})`);
    win.createExUpdatePanel();
    const updateModal = win.document.querySelector(".exupdate-panel");
    assert.ok(updateModal, ".exupdate-panel 必须被创建");
    const cards = updateModal.querySelectorAll(".exupdate-panel__card");
    assert.strictEqual(cards.length, 3, "版本更新面板必须包含 3 个标准分类卡片");
    const titles = Array.from(cards).map(c => c.querySelector(".exupdate-panel__card-title")?.textContent.trim());
    assert.deepStrictEqual(
        titles,
        ["新增功能", "改进与修复", "其它"],
        "三大板块标题必须严格为 新增功能 / 改进与修复 / 其它（不带尾部点缀符），且顺序固定"
    );

    // 每个条目必须严格为 "• 【分类】说明" 格式，且三大板块均不得为空
    const logItems = Array.from(updateModal.querySelectorAll(".exupdate-list li"));
    assert.ok(logItems.length >= 3, "更新日志条目总数不得少于 3 条");
    logItems.forEach((li, i) => {
        const text = li.textContent;
        assert.ok(text.startsWith("• 【"), `第 ${i + 1} 条必须以 "• 【" 开头，实际: ${text.slice(0, 24)}`);
        assert.ok(/^• 【[^】]+】.+/.test(text), `第 ${i + 1} 条格式不合规: ${text.slice(0, 40)}`);
    });
    cards.forEach((card) => {
        const n = card.querySelectorAll(".exupdate-list li").length;
        const name = card.querySelector(".exupdate-panel__card-title").textContent.trim();
        assert.ok(n > 0, `板块【${name}】不得为空`);
    });
    console.log(`✓ 测试场景 9 通过: 版本号 ${SRC_VERSION}、三大板块 新增功能/改进与修复/其它 与 ${logItems.length} 条 "• 【分类】" 格式日志校验通过`);

    // === 测试 10: 检查更新按钮状态机流转与多源容灾 ===
    console.log("--> 测试场景 10: 验证检查更新按钮状态流转 (ack -> check -> checking -> latest/upgrade/error)...");
    const updateBtn = updateModal.querySelector("#exupdate-action-btn");
    assert.ok(updateBtn, "#exupdate-action-btn 按钮必须存在");

    // 1. 点击“我已收到”进入“检查更新”
    updateBtn.dataset.state = "ack";
    updateBtn.click();
    assert.strictEqual(updateBtn.dataset.state, "check", "确认后状态必须流转为 check");
    assert.strictEqual(updateBtn.textContent, "检查更新");

    // 2. 模拟点击“检查更新”，此时远程返回与当前相同版本
    win.GM_xmlhttpRequest = (opts) => {
        setTimeout(() => {
            opts.onload({ status: 200, responseText: JSON.stringify({ version: SRC_VERSION }) });
        }, 10);
    };
    updateBtn.click();
    assert.strictEqual(updateBtn.dataset.state, "checking", "请求期间按钮必须处于 checking 禁用状态");
    await new Promise(r => setTimeout(r, 60));
    assert.strictEqual(updateBtn.dataset.state, "latest", "版本相同时状态必须流转为 latest");
    assert.ok(updateBtn.textContent.includes("已是最新"), "按钮文本必须提示已是最新");

    // 3. 模拟检测到更高的新版本（由当前版本推导，避免写死字面量在下次发版后失效）
    win.GM_xmlhttpRequest = (opts) => {
        setTimeout(() => {
            opts.onload({ status: 200, responseText: JSON.stringify({ version: bumpVersion(SRC_VERSION) }) });
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

    // === 测试 10.1: 多源取最大值 —— 权威源陈旧也不得漏检（历史漏检缺陷回归防线）===
    console.log("--> 测试场景 10.1: 验证多源取最大值，权威源陈旧时不漏检...");
    const versionRequests = [];
    win.GM_xmlhttpRequest = (opts) => {
        versionRequests.push(opts.url);
        setTimeout(() => {
            let v;
            if (opts.url.includes("update.greasyfork.org")) {
                v = SRC_VERSION; // 权威源返回陈旧版本（模拟 CDN 缓存未刷新）
            } else if (opts.url.includes("raw.githubusercontent.com")) {
                v = bumpVersion(SRC_VERSION); // 备选源返回真实最新版本
            } else {
                v = SRC_VERSION; // jsDelivr 同样陈旧
            }
            const body = opts.url.includes(".meta.js")
                ? "// ==UserScript==\n// @version      " + v + "\n// ==/UserScript=="
                : JSON.stringify({ version: v });
            opts.onload({ status: 200, responseText: body });
        }, 10);
    };
    updateBtn.dataset.state = "check";
    updateBtn.click();
    await new Promise(r => setTimeout(r, 80));

    assert.ok(
        versionRequests.some((u) => u.includes("update.greasyfork.org")),
        "必须探测 GreasyFork 官方更新分发端点 meta.js 作为权威判据源"
    );
    assert.ok(
        versionRequests.length >= 3,
        `必须并发探测多个版本源（实际 ${versionRequests.length} 个），禁止“取第一个成功源即返回”`
    );
    assert.strictEqual(
        updateBtn.dataset.state,
        "upgrade",
        "权威源返回陈旧版本、备选源返回新版本时，必须识别出更新，不得漏检"
    );
    assert.ok(
        updateBtn.textContent.includes(bumpVersion(SRC_VERSION)),
        `必须采用各源中的最大版本号，实际按钮文本: ${updateBtn.textContent}`
    );
    console.log(`✓ 测试场景 10.1 通过: 并发探测 ${versionRequests.length} 个源并取最大值，权威源陈旧不漏检`);

    // === 测试 10.2: meta.js 与 package.json 两种载荷均须正确解析 ===
    console.log("--> 测试场景 10.2: 验证 meta.js 与 package.json 双格式版本解析...");
    const dualPayloadVersion = bumpVersion(SRC_VERSION);
    win.GM_xmlhttpRequest = (opts) => {
        setTimeout(() => {
            if (opts.url.includes(".meta.js")) {
                opts.onload({
                    status: 200,
                    responseText: "// ==UserScript==\n// @name  x\n// @version      " + dualPayloadVersion + "\n// ==/UserScript==",
                });
            } else if (opts.url.includes("package.json")) {
                opts.onload({ status: 200, responseText: JSON.stringify({ name: "x", version: dualPayloadVersion }) });
            } else {
                opts.onload({ status: 200, responseText: "<!DOCTYPE html><html>Just a moment...</html>" });
            }
        }, 10);
    };
    updateBtn.dataset.state = "check";
    updateBtn.click();
    await new Promise(r => setTimeout(r, 80));
    assert.strictEqual(updateBtn.dataset.state, "upgrade", "两种载荷格式都必须被正确解析");
    assert.ok(updateBtn.textContent.includes(dualPayloadVersion), "必须解析出 meta.js 中的 @version");
    console.log("✓ 测试场景 10.2 通过: meta.js 的 @version 与 package.json 的 version 均能正确解析，HTML 垃圾载荷被拒绝");

    // === 测试 11: 三大面板操作区宽度一致性（统一 UI 引擎单一归属）===
    console.log("--> 测试场景 11: 验证 检查更新/开始签到/立即开始续牌 按钮宽度一致...");
    const allRules = [];
    Array.from(win.document.styleSheets).forEach((sheet) => {
        try { Array.from(sheet.cssRules).forEach((r) => allRules.push(r)); } catch (e) {}
    });

    const ACTION_WRAPS = [
        ".fans-panel__action-wrap",
        ".popup-panel__action-wrap",
        ".exupdate-panel__action-wrap",
    ];
    const awRules = allRules.filter(
        (r) => r.selectorText && ACTION_WRAPS.some((c) => r.selectorText.includes(c))
    );
    assert.strictEqual(
        awRules.length,
        1,
        `操作区容器必须且只能有一条统一规则（实际 ${awRules.length} 条），禁止任何包再用独立 CSS 覆盖，命中: ` +
            awRules.map((r) => r.selectorText).join(" | ")
    );
    ACTION_WRAPS.forEach((cls) => {
        assert.ok(
            awRules[0].selectorText.includes(cls),
            `统一规则必须同时覆盖 ${cls}，否则该面板按钮宽度会与其他面板不一致`
        );
    });
    assert.strictEqual(
        awRules[0].style.getPropertyValue("padding-left"),
        "12px",
        "操作区左右留白必须为 12px（与四级卡片侧边距对齐）"
    );
    assert.strictEqual(
        awRules[0].style.getPropertyValue("padding-right"),
        "12px",
        "操作区左右留白必须为 12px（与四级卡片侧边距对齐）"
    );

    // 按钮本体规格也必须由同一条统一规则驱动（排除 :hover/:active/:disabled 等伪类变体）
    const submitRules = allRules.filter(
        (r) => r.selectorText &&
               !r.selectorText.includes(":") &&
               r.selectorText.includes(".exupdate-panel__submit-btn") &&
               r.selectorText.includes(".fans-panel__submit-btn") &&
               r.selectorText.includes(".popup-panel__submit-btn")
    );
    assert.strictEqual(
        submitRules.length,
        1,
        `三个提交按钮必须共用同一条基础规格规则（实际 ${submitRules.length} 条）: ` +
            submitRules.map((r) => r.selectorText).join(" | ")
    );
    assert.strictEqual(submitRules[0].style.getPropertyValue("height"), "38px", "提交按钮高度必须统一为 38px");
    assert.strictEqual(submitRules[0].style.getPropertyValue("font-size"), "14px", "提交按钮字号必须统一为 14px");
    console.log("✓ 测试场景 11 通过: 三大面板操作区与提交按钮均由统一 UI 引擎单条规则驱动，宽度一致");

    // === 测试 12: 统一分段胶囊控制器（三组 radio 圆点 → MIUIX）===
    console.log("--> 测试场景 12: 验证三组互斥选项已换装统一分段胶囊...");
    if (typeof win.createPopupPlayerPanel === "function") win.createPopupPlayerPanel();

    const radioGroups = [
        { name: "popup_player_mode", owner: "PopupPlayer", expected: 2 },
        { name: "autofish_mode", owner: "ExpandTool", expected: 2 },
        { name: "DanmakuTailType", owner: "DanmakuTail", expected: 2 },
    ];
    radioGroups.forEach((g) => {
        const radios = win.document.querySelectorAll(`input[name="${g.name}"]`);
        assert.strictEqual(radios.length, g.expected, `[${g.owner}] ${g.name} 必须仍有 ${g.expected} 个原生 radio（语义不变）`);

        radios.forEach((r, i) => {
            const label = r.parentElement;
            assert.strictEqual(
                label && label.className,
                "miuix-seg__item",
                `[${g.owner}] 第 ${i + 1} 个选项必须被 .miuix-seg__item 包裹（当前: ${label && label.className}）`
            );
            const next = r.nextElementSibling;
            assert.ok(next, `[${g.owner}] 第 ${i + 1} 个选项的 radio 必须有相邻兄弟元素`);
            assert.strictEqual(
                next.className,
                "miuix-seg__label",
                `[${g.owner}] radio 的相邻兄弟必须是 .miuix-seg__label（选中态依赖 input:checked + span）`
            );
            assert.ok(next.textContent.trim().length > 0, `[${g.owner}] 第 ${i + 1} 个选项文案不得为空`);
            assert.strictEqual(r.style.display, "", `[${g.owner}] 原生 radio 不得用内联 display:none，应由引擎隐藏`);
        });

        const seg = radios[0].closest(".miuix-seg");
        assert.ok(seg, `[${g.owner}] ${g.name} 必须被 .miuix-seg 容器包裹`);
        assert.strictEqual(seg.children.length, g.expected, `[${g.owner}] 分段胶囊项数必须与选项数一致`);

        const checked = Array.from(radios).filter((r) => r.checked);
        assert.strictEqual(checked.length, 1, `[${g.owner}] ${g.name} 必须恰好有一项选中（互斥）`);
    });

    // ExpandTool 的旧内联包裹层必须已被清除
    assert.strictEqual(
        win.document.querySelectorAll(".autofish__modes").length,
        0,
        "ExpandTool 旧的 .autofish__modes 内联样式包裹层必须已移除"
    );
    assert.strictEqual(
        win.document.querySelectorAll('[class*="popup-panel__seg-"]').length,
        0,
        "PopupPlayer 空壳类 popup-panel__seg-* 必须已替换为统一组件"
    );

    // CSSOM 侧断言：统一组件与选中态规则必须真实存在于样式表中
    const segRules = allRules.filter(
        (r) => r.selectorText && r.selectorText.includes(".miuix-seg__label") && r.selectorText.includes(":checked")
    );
    assert.ok(segRules.length >= 1, "必须存在 `input:checked + .miuix-seg__label` 选中态规则");
    const segBase = allRules.filter(
        (r) => r.selectorText && r.selectorText.trim() === ".miuix-seg"
    );
    assert.strictEqual(segBase.length, 1, "分段胶囊容器必须且只能有一条基础规则（单一归属）");
    assert.strictEqual(segBase[0].style.getPropertyValue("display"), "flex", ".miuix-seg 必须为 flex 容器");
    const radioHide = allRules.filter(
        (r) => r.selectorText && r.selectorText.includes(".miuix-seg__item") && r.selectorText.includes('type="radio"')
    );
    assert.ok(radioHide.length >= 1, "必须存在隐藏原生 radio 圆点的规则");
    assert.ok(
        radioHide.some((r) => r.style.getPropertyValue("appearance") === "none"),
        "原生 radio 必须被 appearance:none 抹除（不允许露出系统圆点）"
    );
    console.log("✓ 测试场景 12 通过: 三组互斥选项均为 .miuix-seg 分段胶囊，原生圆点已抹除，选中态规则就绪");

    // === 测试 13: 直播间工具抽屉标题统一色 + iOS 披露指示器 ===
    console.log("--> 测试场景 13: 验证五个抽屉标题色值统一与折叠指示器联动...");
    const drawerKeys = ["enter", "mute", "gift", "reply", "vote"];
    const titleSpans = drawerKeys.map((k) => win.document.getElementById(k + "__title"));

    titleSpans.forEach((sp, i) => {
        assert.ok(sp, `抽屉标题 #${drawerKeys[i]}__title 必须存在`);
        assert.ok(
            sp.parentElement && sp.parentElement.classList.contains("livetool__cell_title"),
            `抽屉 ${drawerKeys[i]} 的标题必须位于 .livetool__cell_title 内`
        );
    });

    // 1) 所有标题必须由统一引擎单条规则驱动（不再有逐抽屉的独立 color 声明）
    const titleColorRules = allRules.filter(
        (r) => r.selectorText &&
               r.selectorText.includes("__title") &&
               r.selectorText.includes(".livetool__cell_title") &&
               r.style.getPropertyValue("color") &&
               !r.selectorText.includes(":hover") &&
               !r.selectorText.includes("is-open")
    );
    assert.ok(
        titleColorRules.length >= 1,
        "必须存在统一引擎的抽屉标题色值规则（.livetool__cell_title > span[id$=__title]）"
    );

    // 2) 全项目 CSS 不得再出现遗留 royalblue
    const royalblueOffenders = allRules.filter(
        (r) => r.style && String(r.style.cssText || "").toLowerCase().includes("royalblue")
    );
    assert.strictEqual(
        royalblueOffenders.length,
        0,
        `CSS 中不得残留 royalblue（实际 ${royalblueOffenders.length} 条）: ` +
            royalblueOffenders.map((r) => r.selectorText).join(" | ")
    );

    // 3) iOS 披露指示器：箭头几何 + 展开态旋转
    const chevronBase = allRules.filter(
        (r) => r.selectorText && r.selectorText.includes("__title") &&
               r.selectorText.includes("::after") && !r.selectorText.includes("is-open")
    );
    assert.ok(chevronBase.length >= 1, "抽屉标题必须带折叠指示箭头（span[id$=__title]::after）");
    assert.ok(
        chevronBase.some((r) => (r.style.getPropertyValue("border-right") || "").includes("solid")),
        "折叠指示箭头必须由边框绘制（iOS 披露样式）"
    );
    const chevronOpen = allRules.filter(
        (r) => r.selectorText && r.selectorText.includes("is-open") && r.selectorText.includes("::after")
    );
    assert.ok(chevronOpen.length >= 1, "必须存在展开态箭头规则（.is-open ... ::after）");
    assert.ok(
        chevronOpen.some((r) => (r.style.getPropertyValue("transform") || "").includes("rotate")),
        "展开态箭头必须发生旋转（旋转 45° 表示已展开）"
    );

    // 4) 行为验证：点击标题应展开对应抽屉并点亮其指示器，且互斥收起其它抽屉
    const enterTitle = win.document.getElementById("enter__title");
    const muteTitle = win.document.getElementById("mute__title");
    enterTitle.click();
    await new Promise((r) => setTimeout(r, 30));
    assert.ok(
        enterTitle.parentElement.classList.contains("is-open"),
        "点击「进场欢迎」后其标题必须点亮 is-open（箭头转向下）"
    );
    assert.strictEqual(
        muteTitle.parentElement.classList.contains("is-open"),
        false,
        "「关键词禁言」未展开时不得点亮 is-open"
    );

    muteTitle.click();
    await new Promise((r) => setTimeout(r, 30));
    assert.ok(muteTitle.parentElement.classList.contains("is-open"), "点击「关键词禁言」后其箭头必须转向下");
    assert.strictEqual(
        enterTitle.parentElement.classList.contains("is-open"),
        false,
        "抽屉展开互斥：打开「关键词禁言」后「进场欢迎」的箭头必须复位"
    );
    // 5) 回归防线：五个抽屉面板的默认收起态必须由统一引擎【一条】规则统一声明
    //    历史缺陷：弹幕投票漏了这条 → 其面板从加载起就是展开的，而折叠箭头读的是
    //    内联 style.display（无值），于是箭头显示"已折叠"、内容却露着，状态与实际相反。
    const hidesPanel = (r) => String(r.style.getPropertyValue("display")).trim() === "none";
    const unifyHideRules = allRules.filter(
        (r) => r.selectorText &&
               drawerKeys.every((k) => r.selectorText.includes("." + k + "__panel")) &&
               hidesPanel(r)
    );
    assert.strictEqual(
        unifyHideRules.length,
        1,
        `五个抽屉面板必须由同一条规则统一声明默认收起（实际匹配 ${unifyHideRules.length} 条）`
    );
    assert.ok(
        !unifyHideRules[0].style.getPropertyPriority("display"),
        "抽屉默认收起态（display 这一条声明）不得带 !important —— 展开走的是内联 style.display=\"block\"，加了会让抽屉再也打不开"
    );
    drawerKeys.forEach((k) => {
        assert.ok(
            allRules.some((r) => r.selectorText && r.selectorText.includes("." + k + "__panel") && hidesPanel(r)),
            `抽屉 ${k} 的面板必须落在某条 display:none 规则的覆盖范围内（默认收起）`
        );
    });
    assert.strictEqual(
        win.getComputedStyle(win.document.getElementsByClassName("vote__panel")[0]).display,
        "none",
        "弹幕投票面板默认必须收起（此前唯一漏写默认隐藏的抽屉）"
    );

    console.log("✓ 测试场景 13 通过: 五个抽屉标题色值统一、无 royalblue 残留、iOS 披露箭头互斥联动正确、五个面板默认收起");

    // === 测试 14: 统一 UI 引擎单一归属（源码级 + 产物级双重护栏）===
    console.log("--> 测试场景 14: 验证三级面板样式 100% 单一归属 ExPanel.css...");

    // 14.1 产物级：模态铁壁尺寸必须且只能声明一次（ExPanel 使用 :root 设计令牌）
    const modalWidthDecls = allRules.filter((r) => {
        const w = String(r.style && r.style.getPropertyValue("width") || "");
        return w === "380px" || w === "var(--miuix-modal-width)";
    });
    assert.strictEqual(
        modalWidthDecls.length,
        1,
        `模态宽度必须只声明一次（实际 ${modalWidthDecls.length} 次），多一处即为包级 CSS 静默覆盖隐患: ` +
            modalWidthDecls.map((r) => r.selectorText).join(" | ")
    );
    assert.ok(
        modalWidthDecls[0].selectorText.includes(".extool") &&
        modalWidthDecls[0].selectorText.includes(".livetool") &&
        modalWidthDecls[0].selectorText.includes(".bloop") &&
        modalWidthDecls[0].selectorText.includes(".exupdate-panel"),
        "唯一那条模态宽度规则必须同时覆盖全部三级面板（九面板分组规则）"
    );
    const modalHeightDecls = allRules.filter((r) => {
        const h = String(r.style && r.style.getPropertyValue("height") || "");
        return h === "370px" || h === "var(--miuix-modal-height)";
    });
    assert.strictEqual(modalHeightDecls.length, 1, `模态高度必须只声明一次（实际 ${modalHeightDecls.length} 次）`);
    assert.ok(
        modalWidthDecls[0].selectorText.includes(".sign-panel") &&
        modalWidthDecls[0].selectorText.includes(".exlottery") &&
        modalWidthDecls[0].selectorText.includes(".popup-player-panel"),
        "九面板分组规则必须覆盖全部三级控制台"
    );

    // 14.2 源码级：任何包级 CSS 都不得再定义三级面板选择器
    const PANEL_SELECTOR = /\.(sign-panel|fans-continue-panel|extool|livetool|bloop|exlottery|popup-player-panel|exupdate-panel)(?![\w-])/;
    const packageCssFiles = [];
    const packagesRoot = path.join(__dirname, "../src/packages");
    fs.readdirSync(packagesRoot).forEach((pkg) => {
        const dir = path.join(packagesRoot, pkg);
        if (!fs.statSync(dir).isDirectory()) return;
        fs.readdirSync(dir).forEach((f) => {
            if (f.endsWith(".css")) packageCssFiles.push({ pkg, file: path.join(dir, f) });
        });
    });
    const offenders = packageCssFiles.filter(({ pkg, file }) => {
        if (pkg === "ExPanel") return false; // 统一引擎本体
        return PANEL_SELECTOR.test(fs.readFileSync(file, "utf8"));
    });
    assert.strictEqual(
        offenders.length,
        0,
        `包级 CSS 不得定义三级面板选择器（应全部上收 ExPanel.css），违规文件: ` +
            offenders.map((o) => o.pkg + "/" + path.basename(o.file)).join(" | ")
    );
    console.log(`✓ 测试场景 14 通过: 模态尺寸唯一声明，${packageCssFiles.length} 个包级 CSS 无一越权定义三级面板选择器`);
    console.log(`     当前仍保留专有样式的包: ${[...new Set(packageCssFiles.map((f) => f.pkg))].join("、")}`);

    // === 测试 15: 原生下拉框与数字输入框外观已抹除（MIUIX 自绘控件）===
    console.log("--> 测试场景 15: 验证 select / number 原生外观已抹除...");

    // 15.1 select 必须 appearance:none 且带自绘 SVG 箭头
    const selectRules = allRules.filter(
        (r) => r.selectorText && r.selectorText.includes("select") && r.style &&
               (r.style.getPropertyValue("appearance") === "none" ||
                r.style.getPropertyValue("-webkit-appearance") === "none")
    );
    assert.ok(selectRules.length >= 1, "必须存在抹除 select 原生外观的规则（appearance:none）");
    assert.ok(
        selectRules.some((r) => String(r.style.getPropertyValue("background-image")).includes("svg")),
        "select 必须使用内联 SVG 自绘箭头（不得露出系统默认三角）"
    );
    const selectCoverage = selectRules[0].selectorText;
    [".extool", ".livetool", ".bloop", ".sign-panel", ".exupdate-panel"].forEach((panel) => {
        assert.ok(
            selectCoverage.includes(panel),
            `select 统一规则必须覆盖 ${panel}（实际覆盖: ${selectCoverage.slice(0, 120)}）`
        );
    });

    // 15.2 number 输入必须抹除上下微调箭头
    const spinnerRules = allRules.filter(
        (r) => r.selectorText && r.selectorText.includes("spin-button") &&
               r.style && r.style.getPropertyValue("appearance") === "none"
    );
    assert.ok(spinnerRules.length >= 1, "必须存在抹除 number 原生上下微调箭头的规则（::-webkit-inner/outer-spin-button）");
    assert.ok(
        spinnerRules.some((r) => r.selectorText.includes("inner-spin-button")),
        "必须覆盖 ::-webkit-inner-spin-button"
    );

    // 15.3 面板内实际存在的 select 数量核对（收缩到 7 处以内且全部受统一规则管辖）
    const panelSelects = win.document.querySelectorAll(
        ".extool select, .livetool select, .bloop select, .sign-panel select, .popup-player-panel select, .exlottery select, .exupdate-panel select"
    );
    console.log(`     面板内 select 元素 ${panelSelects.length} 个，全部由统一规则管辖`);
    console.log("✓ 测试场景 15 通过: select 原生外观已抹除并自绘箭头，number 微调箭头已隐藏");

    // === 测试 16: 左下角通知换装 MIUIX 深色玻璃 ===
    console.log("--> 测试场景 16: 验证左下角通知已换装深色玻璃...");
    const noticeRules = allRules.filter((r) => r.selectorText && r.selectorText.includes(".noticejs"));
    assert.ok(noticeRules.length > 0, "样式表里必须能找到 .noticejs 相关规则（通知样式应随产物一并注入）");

    const noticePick = (sel, prop) => {
        const hit = noticeRules.filter((r) => r.selectorText === sel && r.style.getPropertyValue(prop));
        return hit.length ? String(hit[hit.length - 1].style.getPropertyValue(prop)).trim() : null;
    };

    // 1) 层级必须高于所有三级面板：原库值是 10050，低于面板的 100030，
    //    通知堆到几条以上就会被面板压住
    const noticeZ = Number(noticePick(".noticejs", "z-index"));
    assert.ok(
        noticeZ > 100030,
        `通知层级必须高于三级面板的 100030（原库值 10050 会被面板压住），实际 ${noticeZ}`
    );

    // 2) 卡片必须换成深色玻璃，并带磨砂
    const DARK_GLASS = /rgba\(28,\s*30,\s*38,\s*0?\.74\)/;
    const itemBg = noticePick(".noticejs .item", "background-color");
    assert.ok(DARK_GLASS.test(String(itemBg)), `通知卡片必须换装深色玻璃底，实际 ${itemBg}`);
    assert.ok(noticePick(".noticejs .item", "backdrop-filter"), "通知卡片必须带磨砂 backdrop-filter");

    // 3) 四种类型的最终生效背景必须是深色玻璃，且该声明要晚于库默认的饱和色
    //    （本文件是"追加覆盖"而非改写库样式，所以库里那几条饱和色规则仍然在表里，
    //     断言要比对先后顺序，而不是断言它们不存在）
    const SATURATED_BG = /#(64ce83|e74c3c|ff7f48|3ea2ff)/i;
    const bgRulesOf = (t) => noticeRules.filter(
        (r) => r.selectorText && r.selectorText.includes(".noticejs ." + t) &&
               r.style.getPropertyValue("background-color")
    );
    ["success", "error", "warning", "info"].forEach((t) => {
        const rules = bgRulesOf(t);
        const glassAt = rules.findLastIndex((r) => DARK_GLASS.test(String(r.style.getPropertyValue("background-color"))));
        const satAt = rules.findLastIndex((r) => SATURATED_BG.test(String(r.style.getPropertyValue("background-color"))));
        assert.ok(glassAt >= 0, `类型 ${t} 缺少深色玻璃底声明`);
        if (satAt >= 0) {
            assert.ok(
                glassAt > satAt,
                `类型 ${t} 的深色玻璃声明必须晚于库默认的饱和色，否则覆盖不生效`
            );
        }
    });

    // 4) 进度条必须由 5px 实心块改为 2px 细线（同样只看最后生效的那条，库里 5px 的默认值仍在表里）
    const barRules = noticeRules.filter(
        (r) => r.selectorText && r.selectorText.includes("noticejs-bar") && r.style.getPropertyValue("height")
    );
    assert.ok(barRules.length > 0, "必须存在通知进度条的尺寸声明");
    const effectiveBarH = String(barRules[barRules.length - 1].style.getPropertyValue("height")).trim();
    assert.strictEqual(effectiveBarH, "2px",
        `最后生效的进度条高度必须是 2px 细线，实际 ${effectiveBarH}（原库为 5px）`);

    // 5) 类型图标：字面字符（不能用反斜杠转义，否则会打断 main.js 的模板字面量）
    const iconExpect = { "success": "✓", "error": "!", "warning": "!", "info": "i" };
    Object.keys(iconExpect).forEach((t) => {
        const re = new RegExp("\\." + t + "::before\\s*\\{\\s*content:\\s*\"" + iconExpect[t].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\"");
        assert.ok(re.test(code), `类型 ${t} 必须带 ::before 图标（字面字符 "${iconExpect[t]}"）`);
    });
    // 说明：CSS 会被拼进 main.js 的模板字面量，因此单个反斜杠紧跟数字这类非法八进制
    // 转义会直接中断构建。该约束由 build.js 的 verifyCssSafety() 在构建期把关（比在这里
    // 扫产物更准确：产物里本就有 rank_engine 编译后的 "\0" 等正常转义，在此处扫描只会误伤）。

    // 6) 通知停留时长契约：断言 showMessage 真正传给 NoticeJs 的选项，而不是去匹配文本 ——
    //    库里也存在同样的 timeout 字面量，文本匹配区分不出是我们的声明还是库的默认值。
    //    NoticeJs 是 UMD 全局，加载后替换掉它即可捕获实际入参（showMessage 调用时按全局查找）。
    //    时长 = timeout × 100ms，故 4 秒 → 40。
    const noticeCalls = [];
    const OrigNoticeJs = win.NoticeJs;
    assert.strictEqual(typeof OrigNoticeJs, "function", "产物必须把 NoticeJs 挂到全局（UMD 导出）");
    win.NoticeJs = function (opts) { noticeCalls.push(opts); return { show() {} }; };
    try {
        win.showMessage("时长契约测试-默认");
        win.showMessage("时长契约测试-错误", "error");
    } finally {
        win.NoticeJs = OrigNoticeJs;
    }
    assert.strictEqual(noticeCalls.length, 2, "两次 showMessage 都应构造一次 NoticeJs");
    assert.strictEqual(noticeCalls[0].timeout, 40,
        `通知时长必须为 4 秒档（timeout × 100ms = 4000ms → 40），实际 ${noticeCalls[0].timeout}`);
    assert.strictEqual(noticeCalls[1].timeout, 40, "所有类型的通知时长都应一致");
    assert.strictEqual(noticeCalls[0].position, "bottomLeft", "通知位置必须固定左下角");
    assert.strictEqual(noticeCalls[0].type, "success", "默认类型必须仍是 success");
    assert.strictEqual(noticeCalls[1].type, "error", "显式传入的类型必须被保留");

    console.log("✓ 测试场景 16 通过: 左下角通知已换装深色玻璃、层级高于面板、四类型图标就位、进度条改细线、时长为 4 秒");

    // === 测试 17: 重制时丢声明类的作用域护栏 ===
    console.log("--> 测试场景 17: 包内不得读取未声明的标识符（重制丢声明是高发坑）...");
    // 背景：camera 的关闭状态 isClosed 曾在一次"全量重制"里被漏掉声明，
    // 结果那个分支一走到 if (isClosed || ...) 就抛 ReferenceError，功能等于废掉。
    // 这类漏声明在语法检查下是合法的（非严格模式的读会在运行时才炸），只能静态兜住。
    const scopeCases = [
        {
            file: "src/packages/VideoTools/Camera/Main/Camera.js",
            ident: "isClosed",
            decl: "let isClosed",
        },
        {
            file: "src/packages/VideoTools/Camera/Video/Camera.js",
            ident: "isClosed",
            decl: "let isClosed",
        },
    ];
    // 扫描前必须剥掉注释：注释里出现同名字符串会把断言骗过去（第一版就栽在这上面）
    const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    scopeCases.forEach((c) => {
        const src = stripComments(fs.readFileSync(path.join(__dirname, "..", c.file), "utf8"));
        const declAt = src.indexOf(c.decl);
        const useAt = src.indexOf(c.ident + " ||");
        assert.ok(declAt >= 0, c.file + " 必须声明 " + c.decl + "（漏了会让该分支抛 ReferenceError）");
        assert.ok(
            useAt < 0 || declAt < useAt,
            c.file + " 里 " + c.ident + " 的声明必须出现在首次读取之前（当前声明位置 " + declAt + "，首次读取 " + useAt + "）"
        );
    });
    // 同时确认摄像头那段代码确实进了产物（只改源码、构建时被 tree-shaking 摘掉 = 白改）。
    // ⚠ 这里必须用**字符串字面量**验证，不能用 isClosed 本身：修好之前它是"未声明的全局"，
    // 压缩器不能改名所以名字侥幸留在产物里；修成正常的局部变量后压缩器会把它改名，
    // 字面量就消失了 —— 拿它断言会得到一个假失败。
    const built = fs.readFileSync(bundlePath, "utf8");
    assert.ok(
        built.indexOf("ex-camera-close") >= 0 && built.indexOf("ExSave_Camera_Hidden") >= 0,
        "摄像头画面模块必须进入产物（未接线会被 tree-shaking 静默删除）"
    );
    console.log("✓ 测试场景 17 通过: 摄像头分支的 isClosed 已声明、注释不干扰扫描、模块已进产物");

    // === 收尾断言: 全流程结束后仍必须零未捕获异常 ===
    assert.strictEqual(errors.length, 0, "全流程结束后不应该产生未捕获异常: " + JSON.stringify(errors));

    console.log("=== 端到端集成测试全流程 100% 通过 ===");
    process.exit(0);
}

testBuiltBundle().catch(err => {
    console.error("端到端测试失败:", err);
    process.exit(1);
});
