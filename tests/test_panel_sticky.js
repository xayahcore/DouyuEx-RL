/*
 * 三级面板「主按钮常驻面板底部」回归（用户反馈 2，2026-10-27）。
 *
 * 钉住四件事 —— 同屏播放 / 版本更新 / 一键签到 / 一键续牌，四个面板的主操作区：
 *   ① position: sticky + bottom: 0 + z-index: 3：面板内容再长，主按钮也粘在底部、
 *      压在最上层，不会被滚动内容顶出去（与「先加一个房间」同一套写法）；
 *   ② 这套样式只能走内联：共用 CSS 门禁（tests/test_built_bundle.js 场景 11）钉死
 *      「三个 .action-wrap 只能有一条统一规则」，任何包级 CSS 覆盖都会挂 —— 所以这里
 *      直接读 inline style，而不是去查样式表；
 *   ③ 不许带任何背景/渐变：用户刚要求去掉同屏面板按钮底部那层白色渐变遮罩，
 *      四个面板一律不许把它加回来（内联、计算样式两头都查）；
 *   ④ 主按钮点了不抛错（外部接口一律给最小桩：空背包、检查失败、签到直接返回汇总）。
 *
 * 直接读 src 源码，不依赖 dist 产物 —— 改完源码即可自测；产物新鲜度由 Lead 统一构建。
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

const ROOT = path.join(__dirname, "..");
function readSrc(rel) {
  const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
  assert.ok(text.length > 0, "源码读取为空: " + rel);
  return text;
}

// 加载顺序与构建脚本一致：公共函数 → 面板外壳（ensureMiuixPanelHeader）→ 更新日志数据 → 各面板包
const SOURCES = [
  "src/common.js",
  "src/packages/ExPanel/ExPanel.js",
  "src/packages/Update/UpdateLog.js",
  "src/packages/Sign/Sign.js",
  "src/packages/FansContinue/FansContinue.js",
  "src/packages/Update/Update.js",
  "src/packages/PopupPlayer/PopupPlayer.js"
];

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

/*
 * 夹具窗口：jsdom + 源码逐个注入。
 * 依赖一律给最小桩 —— 本测试只关心操作区样式与按钮链路能不能跑通，
 * 不关心多屏取流、签到接口、续牌送礼的返回值。
 */
function makeWin() {
  const dom = new JSDOM("<!DOCTYPE html><html><head></head><body></body></html>", {
    url: "https://www.douyu.com/9999",
    runScripts: "dangerously"
  });
  const win = dom.window;
  win.URL.createObjectURL = function () { return "blob:mock"; };
  win.URL.revokeObjectURL = function () {};
  win.unsafeWindow = win;
  // 通知：产物里的 showMessage 会 new NoticeJs(option).show()，这里只记账不弹窗
  win.__notices = [];
  win.NoticeJs = function (opt) {
    win.__notices.push(opt && opt.text);
    return { show: function () {} };
  };
  win.GM_xmlhttpRequest = function (opt) {
    if (opt && typeof opt.onerror === "function") opt.onerror({ message: "测试不联网" });
  };
  win.GM_getValue = function () { return null; };
  win.GM_setValue = function () {};
  win.GM_deleteValue = function () {};
  win.GM_openInTab = function () {};
  win.GM_registerMenuCommand = function () {};
  win.fetch = function () {
    return Promise.resolve({
      json: function () { return Promise.resolve({}); },
      text: function () { return Promise.resolve(""); }
    });
  };

  // 同屏播放面板依赖的多屏状态机（真实实现在 PopupPlayer_MultiScreen.js，本测试不加载）
  win.MS_MAX_ROOMS = 5;
  win.MS_QUALITY_LIST = [
    { v: "auto", name: "自动", short: "自动" },
    { v: "1", name: "流畅", short: "流畅" }
  ];
  win.__msExited = false;
  win.MultiScreen_getList = function () {
    return [{ rid: "9999", nn: "", avatar: "" }, { rid: "8888", nn: "乙", avatar: "" }];
  };
  win.MultiScreen_getMainRid = function () { return "9999"; };
  win.MultiScreen_getVolume = function () { return 0.5; };
  win.MultiScreen_isRoomOn = function () { return true; };
  win.MultiScreen_roomQnName = function () { return "流畅"; };
  win.MultiScreen_getQuality = function () { return "auto"; };
  win.MultiScreen_setQuality = function () {};
  win.MultiScreen_setVolume = function () {};
  win.MultiScreen_savedConfigForMainRoom = function () { return []; };
  win.MultiScreen_exit = function () { win.__msExited = true; };
  win.MultiScreen_onChange = function () {};
  // 续牌面板：背包接口给空列表（点按钮只会弹一条提示，不抛错）
  win.getBagGifts = function (ridValue, cb) {
    if (typeof cb === "function") cb({ data: { list: [] } });
  };

  /* 共用样式表也注入：真实面板的 .action-wrap 规则来自 ExPanel.css，
     否则「背景为空」只是因为裸 DOM 里根本没有样式可选，断言就失去意义。 */
  const styleEl = win.document.createElement("style");
  styleEl.textContent = readSrc("src/packages/ExPanel/ExPanel.css");
  win.document.head.appendChild(styleEl);

  SOURCES.forEach(function (rel) {
    const script = win.document.createElement("script");
    script.textContent = readSrc(rel);
    win.document.body.appendChild(script);
  });

  // 源码脚本若有一个没跑起来，后面的断言会给出更难懂的报错 —— 先钉死加载成功
  ["ExUI_stickActionBar", "ensureMiuixPanelHeader", "createPopupPlayerPanel",
    "createExUpdatePanel", "createSignPanel", "createFansContinuePanel"].forEach(function (name) {
    assert.strictEqual(typeof win[name], "function", "源码未加载成功：缺少 " + name);
  });
  return win;
}

function styleAttr(el) {
  return (el && el.getAttribute && el.getAttribute("style")) || "";
}

/* 四个操作区共用同一份断言：三种写法（内联 / 计算样式 / 结构位置）都必须成立 */
function assertStickyActionBar(win, wrap, label) {
  assert.ok(wrap, label + "：面板必须有主操作区（.action-wrap），否则主按钮不会粘底");
  const attr = styleAttr(wrap);

  assert.strictEqual(wrap.style.position, "sticky", label + "：操作区必须 position: sticky，实际: " + attr);
  assert.ok(/^0(px)?$/.test(String(wrap.style.bottom || "")), label + "：粘底必须贴面板底边 bottom: 0，实际: " + attr);
  assert.strictEqual(wrap.style.zIndex, "3", label + "：操作区必须 z-index: 3（盖住滚动内容），实际: " + attr);
  assert.strictEqual(wrap.style.paddingTop, "8px", label + "：操作区必须有 padding-top: 8px，实际: " + attr);

  // 背景：用户要求去掉白色渐变 → 内联必须完全为空，且连 background 这个写法都不许出现
  assert.strictEqual(wrap.style.background, "", label + "：操作区不得设置内联背景，实际: " + attr);
  assert.ok(!/linear-gradient/i.test(attr), label + "：操作区不得再带白色渐变背景，实际: " + attr);
  assert.ok(!/background/i.test(attr), label + "：操作区不得声明任何 background，实际: " + attr);

  // 计算样式：样式表那边也不许画出渐变（.action-wrap 只有一条统一规则，且不含背景）
  const cs = win.getComputedStyle(wrap);
  assert.strictEqual(cs.position, "sticky", label + "：计算样式必须是 sticky，实际: " + cs.position);
  assert.ok(!/gradient/i.test(String(cs.backgroundImage || "")), label + "：计算样式不得带渐变背景图，实际: " + cs.backgroundImage);

  // 粘底的前提：操作区必须在滚动容器里（.miuix-modal__body 由 ensureMiuixPanelHeader 生成）
  assert.ok(wrap.closest(".miuix-modal__body"), label + "：操作区必须落在 .miuix-modal__body 内，否则 sticky 没有滚动容器");
}

async function run() {
  console.log("=== 三级面板主按钮粘底（用户反馈 2） ===");
  const win = makeWin();

  // ---------- ① 公共函数本身：空入参安全、可重复调用、不会把背景加回来 ----------
  console.log("--> ① ExUI_stickActionBar：空入参安全返回 0");
  assert.strictEqual(win.ExUI_stickActionBar(null), 0, "ExUI_stickActionBar(null) 必须安全返回 0");
  assert.strictEqual(win.ExUI_stickActionBar(undefined), 0, "ExUI_stickActionBar(undefined) 必须安全返回 0");
  assert.strictEqual(win.ExUI_stickActionBar("not-an-element"), 0, "传错类型必须安全返回 0");
  assert.strictEqual(win.ExUI_stickActionBar(win.document.createElement("div")), 0, "没有操作区的节点必须返回 0");
  console.log("✓ ① 通过: 空入参 / 传错类型 / 无操作区节点均安全返回");

  // ---------- ② 四个面板：操作区全部粘底、置顶、无背景 ----------
  console.log("--> ② 四个面板的操作区：sticky + bottom:0 + z-index:3 + padding-top:8px + 无背景");
  win.createPopupPlayerPanel();
  win.createExUpdatePanel();
  win.createSignPanel();
  win.createFansContinuePanel();

  const CASES = [
    { label: "同屏播放（先加一个房间 / 退出同屏）", panel: ".popup-player-panel", wrap: ".popup-panel__action-wrap", btn: "#popup-ms-toggle-btn" },
    { label: "版本更新（检查更新）", panel: ".exupdate-panel", wrap: ".exupdate-panel__action-wrap", btn: "#exupdate-action-btn" },
    { label: "一键签到（开始签到）", panel: ".sign-panel", wrap: ".fans-panel__action-wrap", btn: "#sign-panel-start-btn" },
    { label: "一键续牌（立即开始续牌）", panel: ".fans-continue-panel", wrap: ".fans-panel__action-wrap", btn: "#fans-panel-start-btn" }
  ];

  CASES.forEach(function (item) {
    const panel = win.document.querySelector(item.panel);
    assert.ok(panel, item.label + "：面板没被创建出来（前置失败）");
    const wraps = panel.querySelectorAll(item.wrap);
    assert.strictEqual(wraps.length, 1, item.label + "：面板必须且只能有一个主操作区（实际 " + wraps.length + "）");
    assertStickyActionBar(win, wraps[0], item.label);
    assert.ok(wraps[0].querySelector(item.btn), item.label + "：主按钮必须在操作区里（粘底才有意义）");
    // 再调一次：幂等，且绝不能把背景/渐变加回来
    win.ExUI_stickActionBar(panel);
    assert.strictEqual(wraps[0].style.background, "", item.label + "：重复调用后仍不得有背景");
    assert.ok(!/linear-gradient/i.test(styleAttr(wraps[0])), item.label + "：重复调用后仍不得有渐变");
  });
  console.log("✓ ② 通过: 四个操作区 sticky / bottom:0 / z-index:3 / padding-top:8px，且无任何背景渐变");

  // ---------- ③ 四个主按钮都能点，且不抛错 ----------
  console.log("--> ③ 主按钮可点击（最小桩，不联网）");

  const popBtn = win.document.querySelector(".popup-player-panel " + CASES[0].btn);
  assert.strictEqual(popBtn.disabled, false, "2 个房间时「退出同屏」必须可点（前置）");
  assert.doesNotThrow(function () { popBtn.click(); }, "点「退出同屏」不得抛错");
  assert.strictEqual(win.__msExited, true, "点「退出同屏」必须真的调到 MultiScreen_exit");

  const updBtn = win.document.querySelector(".exupdate-panel " + CASES[1].btn);
  win.fetchLatestVersion = function (cb) { cb(null); }; // 最小桩：探测失败
  assert.doesNotThrow(function () { updBtn.click(); }, "点「检查更新」不得抛错");
  assert.strictEqual(updBtn.dataset.state, "error", "探测失败时必须落到 error 态（说明点击真的被处理了）");

  const signBtn = win.document.querySelector(".sign-panel " + CASES[2].btn);
  win.executeSignEngine = function () { return Promise.resolve({ ok: 1, fail: 0 }); };
  assert.doesNotThrow(function () { signBtn.click(); }, "点「开始签到」不得抛错");
  await sleep(30);
  assert.strictEqual(
    win.document.getElementById("sign-status-tag").textContent,
    "已完成",
    "签到跑完必须把状态标签落到「已完成」（说明点击链路跑通、按钮没被永久按住）"
  );
  assert.strictEqual(signBtn.disabled, false, "签到结束后按钮必须复位（否则用户只能刷新页面）");

  const fansBtn = win.document.querySelector(".fans-continue-panel " + CASES[3].btn);
  assert.doesNotThrow(function () { fansBtn.click(); }, "点「立即开始续牌」不得抛错");
  assert.ok(
    win.__notices.indexOf("背包礼物为空") !== -1,
    "空背包时必须给出提示（说明点击链路跑通），实际: " + JSON.stringify(win.__notices)
  );
  console.log("✓ ③ 通过: 四个主按钮点击均无异常，且各自的处理链路真的跑到了");

  win.close();
  console.log("=== 全部通过 ===");
}

run().catch(function (err) {
  console.error(err);
  process.exit(1);
});
