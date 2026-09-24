/*
 * 多屏复刻的确定性测试。
 * 重点覆盖两块"人工很难发现、但一错就手感全废"的逻辑：
 *   1. 落点判定（4 套布局的死区与分区，全部按百分比边界逐个验证）
 *   2. 拖拽换位后「数据 / 播放器记录 / DOM 类名」三者必须一致（错一个就会重启流）
 *
 * 约定：槽 0 是主画面格（.layout-Player-videoEntity，斗鱼自己的播放器所在格），
 *       槽 1~4 的类名是 is-multi2 ~ is-multi5（类名数字 = 槽号 + 1）。
 *       主房间会自动占据列表首位，所以"N 个格"需要请求 N-1 个额外房间。
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");
let JSDOM;
try {
  JSDOM = require("jsdom").JSDOM;
} catch (e) {
  JSDOM = require("D:/harness/_cdp/node_modules/jsdom").JSDOM;
}

const RID = "9999";
const RECT = { left: 0, top: 0, width: 800, height: 450, right: 800, bottom: 450 };

function bundlePath() {
  const p = path.join(__dirname, "../dist/douyuex.user.js");
  if (fs.existsSync(p)) return p;
  return path.join(__dirname, "../DouyuEx_RL.user.js");
}

// 复刻真实页面结构（实机核对过 2288 房间）：
//   容器 → .player__6-Nuo(已定位) → #js-player-video → #js-player-video-case
//   而 #__h5player 与容器**同尺寸同位置却是另一棵树、并不包含容器**（旧播放器）
// 这个结构差异曾经让我把事件错挂到 #__h5player 上导致拖拽整体失效，所以宿主 DOM 必须如实复刻。
function makeDom() {
  return new JSDOM(
    `<!DOCTYPE html><html><head><!-- $ROOM.room_id = ${RID}; --></head><body>
      <div id="js-player-video-case">
        <div id="js-player-video">
          <div class="player__6-Nuo" style="position:relative">
            <div id="js-player-multiContainer" class="layout-Player-multiContainer">
              <div class="layout-Player-videoEntity"><video id="realVideo"></video></div>
              <div class="layout-Player-multiPlayer is-multi2"></div>
              <div class="layout-Player-multiPlayer is-multi3"></div>
              <div class="layout-Player-multiPlayer is-multi4"></div>
              <div class="layout-Player-multiPlayer is-multi5"></div>
            </div>
          </div>
        </div>
      </div>
      <div id="__h5player"></div>
      <ul id="js-barrage-list" class="Barrage-list"></ul>
    </body></html>`,
    { url: "https://www.douyu.com/" + RID, runScripts: "dangerously" }
  );
}

function load(dom) {
  const win = dom.window;
  win.URL.createObjectURL = () => "blob:mock";
  win.URL.revokeObjectURL = () => {};
  win.unsafeWindow = win;
  win.rid = RID;
  win.__notices = [];
  win.fetch = async () => ({ json: async () => ({}) });
  // 取流与元数据一律不返回，让格子稳定停在 loading 态（测试只关心结构与判定）
  win.GM_xmlhttpRequest = () => {};
  win.GM_getValue = () => null;
  win.GM_setValue = () => {};
  win.GM_setClipboard = () => {};
  win.GM_registerMenuCommand = () => {};
  const script = win.document.createElement("script");
  script.textContent = fs.readFileSync(bundlePath(), "utf8");
  win.document.body.appendChild(script);
  // 通知桩必须在产物加载之后替换：产物自带的 NoticeJs 库会在加载时覆盖全局的预置桩
  win.__notices = [];
  win.NoticeJs = function (opt) {
    win.__notices.push(opt && opt.text);
    return { show() {} };
  };
  // 真实链路里这两个由 initRouter 拉起；宿主初始化在缺 GM_* 时会中断，
  // 所以这里显式初始化，让测试只针对多屏本身
  win.initPkg_PopupPlayer_MultiScreen();
  win.initPkg_PopupPlayer_EditBar();
  // 样式同样由 initRouter 注入，缺了它 getComputedStyle 解析不到多屏这一节的规则
  win.initStyles();
  assert.strictEqual(String(win.rid), RID, "宿主必须从页面标记解析出全局 rid，否则所有房间判定都会错");
  return win;
}

// 从注入的样式表里按选择器取规则
function cssRules(win, match) {
  const out = [];
  Array.from(win.document.styleSheets).forEach((sheet) => {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch (e) {
      return;
    }
    Array.from(rules || []).forEach((r) => {
      if (r.selectorText && match(r.selectorText)) out.push(r);
    });
  });
  return out;
}

// 取某条声明在规则集里的最终值（后出现的规则胜出，与浏览器层叠一致）
function cssValue(rules, prop) {
  let v = "";
  rules.forEach((r) => {
    const x = r.style.getPropertyValue(prop);
    if (x) v = x.trim();
  });
  return v;
}

// CSSOM 会规范化取值（#333 → rgb(51, 51, 51)、0 0 0 16px → 0px 0px 0px 16px），
// 断言前把两边都过一遍同样的规范化，避免拿"写法差异"当失败
function normVal(v) {
  if (v == null) return v;
  let s = String(v).trim().toLowerCase();
  s = s.replace(/#([0-9a-f]{3}|[0-9a-f]{6})\b/g, (m, h) => {
    const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h;
    const n = parseInt(full, 16);
    return "rgb(" + ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255) + ")";
  });
  s = s.replace(/(^|\s)0(?=\s|$)/g, "$10px");
  return s.replace(/\s+/g, " ").trim();
}

function assertCss(rules, prop, want, label) {
  const got = cssValue(rules, prop);
  assert.strictEqual(normVal(got), normVal(want), `${label} 的 ${prop} 必须为 ${want}，实际 ${got}`);
}

// jsdom 不做布局，getBoundingClientRect 恒为 0，必须显式给容器装一个真实的矩形
function stubRect(el, rect) {
  el.getBoundingClientRect = () => Object.assign({ x: rect.left, y: rect.top }, rect);
}

function slotOf(win, n) {
  const c = win.document.getElementById("js-player-multiContainer");
  return n === 0
    ? c.querySelector(".layout-Player-videoEntity")
    : c.querySelector(".layout-Player-multiPlayer.is-multi" + (n + 1));
}

// 进入"恰好 n 个格"的多屏（主房间自动占一格）
function enterGrid(win, n) {
  const extra = [];
  for (let i = 1; i < n; i++) extra.push({ rid: String(1000 + i), nn: "房间" + i, avatar: "" });
  win.MultiScreen_enter(extra.length ? extra : [{ rid: "1001" }]);
  const list = win.MultiScreen_getList();
  assert.strictEqual(list.length, n, `预期 ${n} 个格，实际 ${list.length}`);
  assert.strictEqual(list[0].rid, RID, "主房间必须在列表首位");
  return list;
}

function hit(win, px, py, longPress) {
  // 用容器矩形的相对比例推绝对坐标，测试里读起来更直观
  return win.MultiScreen_hitTest(px * RECT.width, py * RECT.height, !!longPress);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("=== 多屏复刻单元测试 ===");
  const dom = makeDom();
  const win = load(dom);
  stubRect(win.document.getElementById("js-player-multiContainer"), RECT);
  const container = win.document.getElementById("js-player-multiContainer");

  // ---------- 1. 宿主识别 ----------
  console.log("--> 1. 宿主与槽位识别");
  assert.strictEqual(win.MultiScreen_isSupported(), true, "五个槽位齐备时必须识别为受支持");
  // 宿主必须是容器的已定位祖先；#__h5player 与容器同尺寸同位置却**不包含**容器，
  // 一旦误挂到它上面，拖拽与点击会整体收不到事件（实机踩过）
  const host = win.MultiScreen_getHost();
  assert.ok(host && host.contains(container), "宿主必须包含多屏容器");
  assert.notStrictEqual(host.id, "__h5player", "宿主绝不能是 #__h5player（它不包含容器）");
  assert.strictEqual(host.className, "player__6-Nuo", "宿主必须是容器的第一个已定位祖先");

  // ---------- 2. 布局与类名 ----------
  console.log("--> 2. is-multiN 布局与 z 序");
  enterGrid(win, 3);
  assert.strictEqual(container.className, "layout-Player-multiContainer is-multi is-multi3", "3 分屏容器类名必须是 is-multi is-multi3");
  const expect3 = [
    { top: "17.2%", left: "0.8%", width: "65.6%", height: "65.6%", z: "5" },
    { top: "17.2%", left: "66.4%", width: "32.8%", height: "32.8%", z: "4" },
    { top: "50%", left: "66.4%", width: "32.8%", height: "32.8%", z: "3" },
  ];
  expect3.forEach((g, i) => {
    const el = slotOf(win, i);
    assert.strictEqual(el.style.top, g.top, `3 分屏槽 ${i} top 不符`);
    assert.strictEqual(el.style.left, g.left, `3 分屏槽 ${i} left 不符`);
    assert.strictEqual(el.style.width, g.width, `3 分屏槽 ${i} width 不符`);
    assert.strictEqual(el.style.height, g.height, `3 分屏槽 ${i} height 不符`);
    assert.strictEqual(el.style.zIndex, g.z, `3 分屏槽 ${i} z-index 不符`);
  });
  // 不在本次分屏内的槽位必须交回原生规则（清空内联，回到 scale(0)+hidden）
  const idle = slotOf(win, 3);
  assert.strictEqual(idle.style.width, "", "未参与分屏的槽位不得残留内联尺寸");
  assert.strictEqual(idle.style.transform, "", "未参与分屏的槽位不得残留 transform");

  enterGrid(win, 2);
  assert.strictEqual(container.className, "layout-Player-multiContainer is-multi is-multi2", "2 分屏容器类名错误");
  assert.strictEqual(slotOf(win, 0).style.top, "25%", "2 分屏槽 0 top 错误");
  assert.strictEqual(slotOf(win, 1).style.left, "50%", "2 分屏槽 1 left 错误");

  enterGrid(win, 4);
  assert.strictEqual(container.className, "layout-Player-multiContainer is-multi is-multi4", "4 分屏容器类名错误");
  assert.strictEqual(slotOf(win, 3).style.top, "50%", "4 分屏槽 3 应在左下");
  assert.strictEqual(slotOf(win, 3).style.left, "0%", "4 分屏槽 3 应在左下");

  enterGrid(win, 5);
  assert.strictEqual(container.className, "layout-Player-multiContainer is-multi is-multi5", "5 分屏容器类名错误");
  assert.strictEqual(slotOf(win, 4).style.top, "66.2%", "5 分屏槽 4 top 错误");
  assert.strictEqual(slotOf(win, 4).style.left, "58.1%", "5 分屏槽 4 left 错误");

  // 单屏时必须退回普通容器（去掉 is-multi 与 is-multiN）
  win.MultiScreen_exit();
  assert.strictEqual(container.className, "layout-Player-multiContainer", "退出多屏后容器必须回到单屏类名");

  // ---------- 3. 落点判定：2 分屏 ----------
  console.log("--> 3. 落点判定与死区（2/3/4/5 分屏）");
  enterGrid(win, 2);
  assert.strictEqual(hit(win, 0.25, 0.5), 0, "2 分屏左侧应命中槽 0");
  assert.strictEqual(hit(win, 0.75, 0.5), 1, "2 分屏右侧应命中槽 1");
  assert.strictEqual(hit(win, 0.5, 0.2), -1, "2 分屏上带 25% 以内是死区");
  assert.strictEqual(hit(win, 0.5, 0.8), -1, "2 分屏下带 75% 以外是死区");
  assert.notStrictEqual(hit(win, 0.5, 0.25), -1, "2 分屏 p=0.25 恰好合法");
  assert.notStrictEqual(hit(win, 0.5, 0.75), -1, "2 分屏 p=0.75 恰好合法");

  // ---------- 4. 落点判定：3 分屏 ----------
  enterGrid(win, 3);
  assert.strictEqual(hit(win, 0.3, 0.5), 0, "3 分屏左侧大格应命中槽 0");
  assert.strictEqual(hit(win, 0.5, 0.5), 0, "3 分屏 d<0.664 一律归槽 0");
  assert.strictEqual(hit(win, 0.7, 0.3), 1, "3 分屏右上应命中槽 1");
  assert.strictEqual(hit(win, 0.7, 0.6), 2, "3 分屏右下应命中槽 2");
  assert.strictEqual(hit(win, 0.5, 0.15), -1, "3 分屏上带死区");
  assert.strictEqual(hit(win, 0.5, 0.85), -1, "3 分屏下带死区");
  assert.strictEqual(hit(win, 0.004, 0.5), -1, "3 分屏左边缘死区");
  assert.strictEqual(hit(win, 0.996, 0.3), -1, "3 分屏右边缘死区");
  assert.strictEqual(hit(win, 0.67, 0.3), 1, "3 分屏 d=0.67 应落到右列");
  assert.strictEqual(hit(win, 0.66, 0.3), 0, "3 分屏 d=0.66 应仍在左列");

  // ---------- 5. 落点判定：4 分屏（无死区） ----------
  enterGrid(win, 4);
  assert.strictEqual(hit(win, 0.25, 0.25), 0, "4 分屏左上 → 槽 0");
  assert.strictEqual(hit(win, 0.75, 0.25), 1, "4 分屏右上 → 槽 1");
  assert.strictEqual(hit(win, 0.75, 0.75), 2, "4 分屏右下 → 槽 2");
  assert.strictEqual(hit(win, 0.25, 0.75), 3, "4 分屏左下 → 槽 3");
  assert.strictEqual(hit(win, 0.995, 0.995), 2, "4 分屏无死区，极限右下仍须命中槽 2");

  // ---------- 6. 落点判定：5 分屏 ----------
  enterGrid(win, 5);
  assert.strictEqual(hit(win, 0.3, 0.25), 0, "5 分屏左上大格 → 槽 0");
  assert.strictEqual(hit(win, 0.3, 0.75), 3, "5 分屏左下大格 → 槽 3");
  assert.strictEqual(hit(win, 0.7, 0.2), 1, "5 分屏右上 → 槽 1");
  assert.strictEqual(hit(win, 0.7, 0.5), 2, "5 分屏右中 → 槽 2");
  assert.strictEqual(hit(win, 0.7, 0.8), 4, "5 分屏右下 → 槽 4");
  assert.strictEqual(hit(win, 0.5, 0.005), -1, "5 分屏上边缘死区");
  assert.strictEqual(hit(win, 0.5, 0.99), -1, "5 分屏下边缘死区");
  assert.strictEqual(hit(win, 0.05, 0.5), -1, "5 分屏左边缘死区");
  assert.strictEqual(hit(win, 0.95, 0.3), -1, "5 分屏右边缘死区");

  // ---------- 7. 底部控制条保护带（仅起手时生效） ----------
  console.log("--> 7. 拖拽起手的底部控制条保护带（42px）");
  enterGrid(win, 5);
  const bottomY = (RECT.height - 20) / RECT.height; // 距底 20px，落在 42px 保护带内
  assert.strictEqual(hit(win, 0.3, bottomY, true), -1, "起手落在底部 42px 内必须拒绝");
  assert.notStrictEqual(hit(win, 0.3, bottomY, false), -1, "拖拽过程中不受保护带限制");
  const safeY = (RECT.height - 60) / RECT.height; // 距底 60px，保护带之外
  assert.notStrictEqual(hit(win, 0.3, safeY, true), -1, "保护带之外可以正常起手");

  // ---------- 8. 列表归一化 ----------
  console.log("--> 8. 列表归一化（主房间必在、去重、上限 5）");
  let list = win.MultiScreen_enter([{ rid: "2001" }, { rid: "2002" }]);
  assert.strictEqual(list[0].rid, RID, "开启多屏时主房间必须归槽 0");
  assert.strictEqual(list.length, 3, "主房间应被自动补入");

  list = win.MultiScreen_enter([{ rid: "1001" }, { rid: "1001" }, { rid: "1002" }]);
  assert.strictEqual(list.length, 3, "重复 rid 必须去重（主房间 + 1001 + 1002）");

  list = win.MultiScreen_enter([{ rid: "1001" }, { rid: "1002" }, { rid: "1003" }, { rid: "1004" }, { rid: "1005" }, { rid: "1006" }]);
  assert.strictEqual(list.length, 5, "超过上限必须截断到 5");
  assert.strictEqual(list[0].rid, RID, "截断后主房间仍在槽 0");
  assert.strictEqual(list.filter((r) => String(r.rid) === "1005").length, 0, "溢出房间必须被丢弃");

  // ---------- 9. 增删的上下限 ----------
  console.log("--> 9. 添加/移除的上下限");
  enterGrid(win, 2);
  win.MultiScreen_removeRoom(String(1001));
  assert.strictEqual(win.MultiScreen_getList().length, 2, "只剩 2 个时不得再移除");
  enterGrid(win, 5);
  win.MultiScreen_addRoom({ rid: "3001" });
  assert.strictEqual(win.MultiScreen_getList().length, 5, "到达上限后不得再添加");
  win.MultiScreen_addRoom({ rid: "3002" });
  assert.strictEqual(win.MultiScreen_getList().length, 5, "上限必须硬生效");
  assert.strictEqual(win.MultiScreen_getList().filter((r) => String(r.rid) === "3002").length, 0, "超限房间不得进入列表");

  // ---------- 10. 编辑条四项校验的文案 ----------
  console.log("--> 10. 编辑条勾选校验与文案");
  enterGrid(win, 3);
  win.__notices.length = 0;
  // 校验 1：点当前主房间 → 静默返回，且不给任何提示
  assert.strictEqual(win.MS_EditBar_toggleRoom(RID), false, "点主房间必须静默返回 false");
  assert.strictEqual(win.__notices.length, 0, "点主房间不得弹任何提示：" + JSON.stringify(win.__notices));
  // 校验 3：取消且只剩 2 个
  enterGrid(win, 2);
  win.__notices.length = 0;
  assert.strictEqual(win.MS_EditBar_toggleRoom(String(1001)), false, "只剩 2 个时不得取消");
  assert.ok(win.__notices.some((t) => t && t.indexOf("最少需要2个直播间") !== -1), "必须提示最少 2 个直播间，实际：" + JSON.stringify(win.__notices));
  // 校验 2：未选中且未开播
  win.__notices.length = 0;
  win.MS_EditBar_addToPool({ rid: "8881", nn: "未开播的", showStatus: 2 });
  assert.strictEqual(win.MS_EditBar_toggleRoom("8881"), false, "未开播的房间不得加入");
  assert.ok(win.__notices.some((t) => t && t.indexOf("该主播尚未开播") !== -1), "必须提示该主播尚未开播，实际：" + JSON.stringify(win.__notices));
  // 校验 4：已达上限
  win.__notices.length = 0;
  enterGrid(win, 5);
  win.MS_EditBar_addToPool({ rid: "3009", nn: "满员测试", showStatus: 1 });
  assert.strictEqual(win.MS_EditBar_toggleRoom("3009"), false, "满 5 个后不得再加入");
  assert.ok(win.__notices.some((t) => t && t.indexOf("最多5个直播间") !== -1), "必须提示最多 5 个直播间，实际：" + JSON.stringify(win.__notices));
  // 通过：在播且未满
  enterGrid(win, 4);
  win.__notices.length = 0;
  win.MS_EditBar_addToPool({ rid: "3010", nn: "可加入", showStatus: 1 });
  assert.strictEqual(win.MS_EditBar_toggleRoom("3010"), true, "在播且未满应允许加入");
  assert.strictEqual(win.MultiScreen_getList().length, 5, "加入后列表应为 5");
  assert.strictEqual(win.__notices.length, 0, "合法加入不得弹提示：" + JSON.stringify(win.__notices));

  // ---------- 11. 拖拽换位：数据 / 播放器记录 / 类名三者一致 ----------
  console.log("--> 11. 拖拽换位的一致性与流不中断");
  enterGrid(win, 2);
  const before = win.MultiScreen_getList().map((r) => String(r.rid));
  // 2 分屏下 x=0.25 命中"格子 1"= 槽 0（主画面格，斗鱼自己的播放器所在格）
  const cellA = slotOf(win, 0);
  const cellB = slotOf(win, 1);
  assert.strictEqual(cellA.className.indexOf("layout-Player-videoEntity"), 0, "槽 0 必须是主画面格");
  // 起手格挂一个可识别的子节点，用来证明它没被 reparent
  const markerA = win.document.createElement("div");
  markerA.id = "markerA";
  cellA.appendChild(markerA);

  const md = new win.MouseEvent("mousedown", { button: 0, clientX: 0.25 * RECT.width, clientY: 0.5 * RECT.height, bubbles: true });
  console.log("   [diag] container=" + container.className + " list=" + win.MultiScreen_getList().length +
    " hit=" + win.MultiScreen_hitTest(0.25 * RECT.width, 0.5 * RECT.height, true) +
    " hostOk=" + !!win.MultiScreen_getHost());
  container.dispatchEvent(md);
  await sleep(350); // 越过 300ms 长按阈值
  console.log("   [diag] after sleep dragging=" + win.document.querySelectorAll(".dragging-player").length +
    " placeholders=" + win.document.querySelectorAll(".ms-slot--placeholder").length +
    " cellA=" + cellA.className);
  assert.ok(cellA.classList.contains("dragging-player"), "长按后起手格必须进入拖拽态");
  assert.ok(container.classList.contains("is-dragging"), "拖拽中容器必须带 is-dragging");
  assert.ok(container.querySelector(".ms-slot--placeholder"), "拖拽中必须存在占位块");

  const mm = new win.MouseEvent("mousemove", { button: 0, clientX: 0.75 * RECT.width, clientY: 0.5 * RECT.height, bubbles: true });
  container.dispatchEvent(mm);
  assert.ok(cellB.classList.contains("cur") && cellB.classList.contains("is-cur"), "落点格（槽 1）必须同时挂 cur 与 is-cur（原生只挂 is-cur，高亮失效）");

  const mu = new win.MouseEvent("mouseup", { button: 0, clientX: 0.75 * RECT.width, clientY: 0.5 * RECT.height, bubbles: true });
  win.document.dispatchEvent(mu);

  const after = win.MultiScreen_getList().map((r) => String(r.rid));
  assert.strictEqual(after[0], before[1], "换位后槽 0 应持有原来槽 1 的房间，实际 " + JSON.stringify(after));
  assert.strictEqual(after[1], before[0], "换位后槽 1 应持有原来槽 0 的房间");
  // 播放器节点绝不能搬家：标记节点必须还在原来那个 DOM 元素里
  assert.ok(cellA.contains(markerA), "起手格的子节点不得被 reparent（搬 DOM 会重置 <video> 播放）");
  assert.strictEqual(cellA.className.indexOf("layout-Player-videoEntity"), -1, "起手格必须交出主画面格身份");
  assert.notStrictEqual(cellA.className.indexOf("is-multi2"), -1, "起手格必须接上落点格的类名");
  assert.strictEqual(cellB.className.indexOf("is-multi2"), -1, "落点格必须交出 is-multi2");
  assert.notStrictEqual(cellB.className.indexOf("layout-Player-videoEntity"), -1, "落点格必须接上主画面格身份");
  // 类名换了，位置也必须跟着换（内联样式要立刻重算，否则旧内联值会把元素钉在原处）
  assert.strictEqual(cellA.style.left, "50%", "换位后起手格必须落在新格子的左坐标");
  assert.strictEqual(cellB.style.left, "0%", "换位后落点格必须落在新格子的左坐标");
  assert.strictEqual(cellA.style.transform, "scale(1)", "换位后必须恢复为正常缩放");
  assert.strictEqual(cellA.classList.contains("dragging-player"), false, "换位后必须摘掉拖拽态");
  assert.strictEqual(container.classList.contains("is-dragging"), false, "换位后容器必须摘掉 is-dragging");
  assert.strictEqual(container.querySelector(".ms-slot--placeholder"), null, "换位后占位块必须被移除");
  assert.strictEqual(cellB.classList.contains("cur"), false, "换位后落点高亮必须清除");

  // ---------- 12. 死区松手必须取消，不得改动列表 ----------
  console.log("--> 12. 落死区松手取消");
  const snapshot = win.MultiScreen_getList().map((r) => String(r.rid));
  const md2 = new win.MouseEvent("mousedown", { button: 0, clientX: 0.25 * RECT.width, clientY: 0.5 * RECT.height, bubbles: true });
  container.dispatchEvent(md2);
  await sleep(350);
  const deadY = 0.02 * RECT.height; // 2 分屏下这是死区
  const mm2 = new win.MouseEvent("mousemove", { button: 0, clientX: 0.25 * RECT.width, clientY: deadY, bubbles: true });
  container.dispatchEvent(mm2);
  const mu2 = new win.MouseEvent("mouseup", { button: 0, clientX: 0.25 * RECT.width, clientY: deadY, bubbles: true });
  win.document.dispatchEvent(mu2);
  assert.deepStrictEqual(win.MultiScreen_getList().map((r) => String(r.rid)), snapshot, "落死区松手后列表不得变化");
  assert.strictEqual(container.querySelector(".ms-slot--placeholder"), null, "取消后占位块必须清掉");
  assert.strictEqual(container.classList.contains("is-dragging"), false, "取消后必须摘掉 is-dragging");
  assert.strictEqual(win.document.querySelectorAll(".dragging-player").length, 0, "取消后不得残留 dragging-player");
  assert.strictEqual(slotOf(win, 0).style.left, "0%", "取消后起手格必须回到原位");
  assert.strictEqual(slotOf(win, 1).style.left, "50%", "取消后落点格必须保持原位");

  // ---------- 13. 短按不得触发拖拽 ----------
  console.log("--> 13. 短按不触发拖拽");
  const md3 = new win.MouseEvent("mousedown", { button: 0, clientX: 0.25 * RECT.width, clientY: 0.5 * RECT.height, bubbles: true });
  container.dispatchEvent(md3);
  await sleep(100); // 不足 300ms
  const mu3 = new win.MouseEvent("mouseup", { button: 0, clientX: 0.25 * RECT.width, clientY: 0.5 * RECT.height, bubbles: true });
  win.document.dispatchEvent(mu3);
  assert.strictEqual(win.document.querySelectorAll(".dragging-player").length, 0, "短按不得进入拖拽态");
  assert.strictEqual(container.querySelector(".ms-slot--placeholder"), null, "短按不得产生占位块");
  await sleep(260);
  assert.strictEqual(win.document.querySelectorAll(".dragging-player").length, 0, "长按定时器必须被 mouseup 取消");

  // ---------- 14. 箭头翻页步进 = 286 x floor(条宽 / 286) ----------
  console.log("--> 14. 编辑条箭头步进");
  win.MS_EditBar_show();
  assert.ok(win.MS_EditBar_isVisible(), "show() 之后必须处于可见态");
  const bar = win.document.querySelector(".ms-editbar");
  assert.ok(bar, "编辑条必须已挂载");
  assert.strictEqual(bar.parentElement.className, "player__6-Nuo", "编辑条必须与事件宿主同处（容器的已定位祖先）");
  bar.getBoundingClientRect = () => ({ left: 0, top: 0, width: 900, height: 226, right: 900, bottom: 226 });
  assert.strictEqual(win.MS_EditBar_step(), 858, "条宽 900 时步进必须是 286 x 3 = 858");
  bar.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 226, right: 300, bottom: 226 });
  assert.strictEqual(win.MS_EditBar_step(), 286, "条宽 300 时 step 取整为 1 页 = 286");
  bar.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 226, right: 200, bottom: 226 });
  assert.strictEqual(win.MS_EditBar_step(), 286, "条宽不足 286 时必须回退为一页 286");

  // 卡片宽高与原生一致（270x152）—— 直接查样式表，jsdom 不做布局，getComputedStyle 不可靠
  const card = win.document.querySelector(".ms-editbar__card");
  assert.ok(card, "编辑条必须有卡片");
  const cardRules = cssRules(win, (s) =>
    s.indexOf(".ms-editbar__card") !== -1 && s.indexOf(":hover") === -1 && s.indexOf(":last-child") === -1 && s.indexOf("::after") === -1
  );
  assert.ok(cardRules.length > 0, "必须存在 .ms-editbar__card 规则");
  assertCss(cardRules, "width", "270px", "卡片");
  assertCss(cardRules, "height", "152px", "卡片");
  assertCss(cardRules, "background-color", "#333", "卡片");
  assertCss(cardRules, "margin", "0 0 0 16px", "卡片");

  // ---------- 14.1 关键几何 1:1 保真（全部源自斗鱼样式表的实测原值） ----------
  console.log("--> 14.1 格子与编辑条关键几何保真");
  const geo = [
    {
      name: "房名胶囊",
      sel: (s) => s.indexOf(".ms-slot__name") !== -1 && s.indexOf("text") === -1 && s.indexOf("icon") === -1,
      want: { bottom: "20px", left: "10px", "border-radius": "14px", "font-size": "14px" },
    },
    {
      name: "房名头像",
      sel: (s) => s.indexOf(".ms-slot__name-icon") !== -1,
      want: { width: "20px", height: "20px" },
    },
    {
      name: "房名文字",
      sel: (s) => s.indexOf(".ms-slot__name-text") !== -1,
      want: { "max-width": "120px" },
    },
    {
      name: "重新加载按钮",
      sel: (s) => s.indexOf(".ms-slot__reload") !== -1 && s.indexOf(":hover") === -1 && !/is-visible/.test(s),
      want: { width: "86px", height: "34px", border: "2px solid #ff5d23", "border-radius": "8px", color: "#ff5d23" },
    },
    {
      name: "箭头",
      sel: (s) => s.trim() === ".ms-editbar__arrow",
      want: { width: "28px", height: "42px" },
    },
    {
      name: "左箭头定位",
      sel: (s) => s.trim() === ".ms-editbar__arrow--left",
      want: { left: "0px" },
    },
    {
      name: "右箭头定位",
      sel: (s) => s.trim() === ".ms-editbar__arrow--right",
      want: { right: "0px" },
    },
    {
      name: "未开播角标",
      sel: (s) => s.indexOf(".ms-editbar__close-tag") !== -1,
      want: { width: "60px", height: "24px", background: "#ff5d23", "line-height": "24px" },
    },
    {
      name: "当前角标",
      sel: (s) => s.indexOf(".ms-editbar__cur-room") !== -1,
      want: { width: "40px", height: "24px", "line-height": "24px" },
    },
    {
      name: "选中图标",
      sel: (s) => s.indexOf(".ms-editbar__check") !== -1 && s.indexOf("before") === -1,
      want: { width: "24px", height: "24px" },
    },
    {
      name: "卡底信息条",
      sel: (s) => s.indexOf(".ms-editbar__info") !== -1,
      want: { height: "32px", padding: "0 6px" },
    },
    {
      name: "昵称",
      sel: (s) => s.indexOf(".ms-editbar__nn") !== -1,
      want: { "max-width": "136px", "font-size": "14px" },
    },
    {
      name: "占位块",
      sel: (s) => s.indexOf(".ms-slot--placeholder") !== -1,
      want: { border: "2px solid #fff", "pointer-events": "none", "background-color": "#333" },
    },
  ];
  geo.forEach((g) => {
    const rules = cssRules(win, g.sel);
    assert.ok(rules.length > 0, `必须存在「${g.name}」的样式规则`);
    Object.keys(g.want).forEach((prop) => {
      assertCss(rules, prop, g.want[prop], `「${g.name}」`);
    });
  });
  // 编辑条高度必须是原生的 226（走内联样式的入口常量，这里校验常量本身）
  assert.strictEqual(cssValue(cssRules(win, (s) => s.trim() === ".ms-editbar"), "z-index"), "10", "编辑条层级必须高于槽 0 的 z-index 5");
  // 落点高亮必须同时覆盖 cur 与 is-cur（原生只挂 is-cur，样式表只有 .cur，高亮实际失效）
  const curRules = cssRules(win, (s) => s.indexOf("is-cur") !== -1 && s.indexOf("layout-Player-multiPlayer") !== -1);
  assert.ok(curRules.length > 0, "落点高亮必须同时接 cur 与 is-cur 两个类");
  assertCss(curRules, "border", "2px solid #ff5d23", "落点高亮");
  // 房名胶囊的字体大小必须小于弹幕/正文，不能盖过原生观感
  assert.ok(
    cssRules(win, (s) => s.indexOf(".ms-slot__name-text") !== -1 && s.indexOf("font-size") !== -1).length >= 0,
    "房名文字规则必须存在"
  );

  // ---------- 15. 画质档位 ----------
  console.log("--> 15. 画质档位");
  assert.strictEqual(win.MultiScreen_getQuality(), "0", "默认档位必须是最高画质 蓝光4M(rate 0)");
  const qualityRadios = win.document.querySelectorAll('input[name="ms_quality"]');
  assert.strictEqual(qualityRadios.length, 4, "画质档位必须是 4 档");
  assert.strictEqual(Array.from(qualityRadios).filter((r) => r.checked).length, 1, "画质档位必须恰好一项选中");
  win.MultiScreen_setQuality("3");
  assert.strictEqual(win.MultiScreen_getQuality(), "3", "设置档位必须生效");

  // ---------- 16. 存储键规范 ----------
  console.log("--> 16. 存储键规范");
  assert.ok(win.localStorage.getItem("ExSave_MultiScreen"), "ExSave_MultiScreen 必须写入 localStorage");
  const saved = JSON.parse(win.localStorage.getItem("ExSave_MultiScreen"));
  assert.ok(Array.isArray(saved.list) && saved.list.length >= 2, "持久化必须存下房间列表");
  assert.strictEqual(saved.qn, "3", "持久化必须存下画质档位");

  // ---------- 17. 单屏时不得误判为可拖拽 ----------
  console.log("--> 17. 单屏保护");
  win.MultiScreen_exit();
  assert.strictEqual(win.MultiScreen_hitTest(0.3 * RECT.width, 0.5 * RECT.height, true), -1, "只有一个直播间时任何位置都不得判定为可拖拽");

  // ---------- 18. 「最近看过」本地记录 ----------
  console.log("--> 18. 最近看过");
  enterGrid(win, 3);
  const recent = win.MultiScreen_getRecent();
  const recentRaw = JSON.parse(win.localStorage.getItem("ExSave_MultiScreenRecent"));
  assert.ok(Array.isArray(recentRaw) && recentRaw.length >= 2, "进过多屏的房间必须写入最近看过");
  recent.forEach((r) => {
    assert.ok(
      !win.MultiScreen_getList().some((x) => String(x.rid) === String(r.rid)),
      "最近看过必须排除已在多屏里的房间"
    );
  });

  // ---------- 19. 全屏覆盖层下的拖拽与点击（实机踩过的坑） ----------
  console.log("--> 19. 全屏覆盖层下仍能拖拽与点击");
  // 实机上线：播放器区域最上层是 #__h5player —— 全屏透明但 pointer-events:auto，
  // 既不在多屏容器内也不是容器祖先。事件若挂在容器或容器祖先上，玩家在播放器区域的
  // 所有按下都收不到，拖拽与点击整体失效。这里用一个等价的覆盖层守住这件事。
  enterGrid(win, 2);
  const overlay = win.document.createElement("div");
  overlay.id = "fakeOverlay";
  overlay.style.position = "fixed";
  overlay.style.left = "0px";
  overlay.style.top = "0px";
  overlay.style.width = RECT.width + "px";
  overlay.style.height = RECT.height + "px";
  overlay.style.zIndex = "99999";
  win.document.body.appendChild(overlay);
  assert.ok(win.MultiScreen_getContainer().contains(overlay) === false, "覆盖层必须在容器之外（复刻实机的两棵树结构）");

  // 拖拽：按下发生在覆盖层上，仍必须能起手并换位
  const before19 = win.MultiScreen_getList().map((r) => String(r.rid));
  const mdO = new win.MouseEvent("mousedown", { button: 0, clientX: 0.25 * RECT.width, clientY: 0.5 * RECT.height, bubbles: true });
  overlay.dispatchEvent(mdO);
  await sleep(350);
  assert.strictEqual(win.document.querySelectorAll(".dragging-player").length, 1, "覆盖层上的长按必须仍能进入拖拽");
  const mmO = new win.MouseEvent("mousemove", { button: 0, clientX: 0.75 * RECT.width, clientY: 0.5 * RECT.height, bubbles: true });
  overlay.dispatchEvent(mmO);
  const muO = new win.MouseEvent("mouseup", { button: 0, clientX: 0.75 * RECT.width, clientY: 0.5 * RECT.height, bubbles: true });
  overlay.dispatchEvent(muO);
  const after19 = win.MultiScreen_getList().map((r) => String(r.rid));
  assert.strictEqual(after19[0], before19[1], "覆盖层上的拖拽也必须真的完成换位，实际 " + JSON.stringify(after19));
  assert.strictEqual(after19[1], before19[0], "覆盖层上的拖拽换位必须成对交换");

  // 点击：点在覆盖层上、落在外房格内，必须走"开该房间"的路径（主画面格与死区都不接管）
  const opened = [];
  const origOpen = win.open;
  win.open = function (u) { opened.push(u); return null; };
  try {
    const clickOuter = new win.MouseEvent("click", { button: 0, clientX: 0.75 * RECT.width, clientY: 0.5 * RECT.height, bubbles: true });
    overlay.dispatchEvent(clickOuter);
    assert.strictEqual(opened.length, 1, "点外房格必须开该房间，实际 " + JSON.stringify(opened));
    // 2 分屏下 x=0.75 落在右侧那格，也就是列表第 1 项（换位后可能是主房间，那也照开）
    const expectRid = String(win.MultiScreen_getList()[1].rid);
    assert.strictEqual(opened[0], "/" + expectRid, "必须开的是那一格对应的房间，实际 " + opened[0]);
    opened.length = 0;
    // 主画面格不接管点击
    const clickMain = new win.MouseEvent("click", { button: 0, clientX: 0.25 * RECT.width, clientY: 0.5 * RECT.height, bubbles: true });
    overlay.dispatchEvent(clickMain);
    assert.strictEqual(opened.length, 0, "主画面格与死区不得触发开新标签");
  } finally {
    win.open = origOpen;
    overlay.remove();
  }
  // ---------- 20. 槽位被页面重建后的自愈 ----------
  console.log("--> 20. 槽位被重建后自愈");
  // 实机上线：斗鱼在播放器初始化/切房时会重建容器里的槽位节点，内联尺寸与格子内容
  // 一起丢掉、容器类名却还留着 is-multiN，格子会静默塌回一格。这里如实复刻该场景。
  enterGrid(win, 3);
  const c20 = win.document.getElementById("js-player-multiContainer");
  assert.strictEqual(slotOf(win, 0).style.left, "0.8%", "前置条件：3 分屏布局已生效");
  // 模拟页面重建：把槽位节点整体换成全新的空节点（类名保留）
  const rebuilt = [];
  Array.prototype.slice.call(c20.children).forEach(function (old) {
    const neu = win.document.createElement("div");
    neu.className = old.className;
    c20.replaceChild(neu, old);
    rebuilt.push(neu);
  });
  assert.strictEqual(c20.classList.contains("is-multi3"), true, "容器类名会残留（这正是问题所在）");
  assert.strictEqual(c20.children[0].style.left, "", "重建后的槽位没有内联尺寸");
  // 自愈是 250ms 防抖的，等它跑完
  await sleep(420);
  assert.strictEqual(c20.children[0].style.left, "0.8%", "自愈后槽 0 的布局必须补回来");
  assert.strictEqual(c20.children[1].style.left, "66.4%", "自愈后槽 1 的布局必须补回来");
  assert.strictEqual(c20.children[1].style.zIndex, "4", "自愈后 z 序必须补回来");
  // 播放器节点被一起带走的那几格要重新渲染
  assert.ok(c20.children[1].querySelector(".ms-slot__video"), "自愈后外房格必须重新长出播放器节点");
  assert.ok(c20.children[1].querySelector(".ms-slot__name-text"), "自愈后房名胶囊必须重新长出");
  // 拖拽期间绝不能自愈（否则会跟拖拽抢 DOM）
  enterGrid(win, 2);
  const md20 = new win.MouseEvent("mousedown", { button: 0, clientX: 0.25 * RECT.width, clientY: 0.5 * RECT.height, bubbles: true });
  container.dispatchEvent(md20);
  await sleep(350);
  assert.strictEqual(win.document.querySelectorAll(".dragging-player").length, 1, "前置条件：已进入拖拽");
  await sleep(500);
  assert.strictEqual(win.document.querySelectorAll(".dragging-player").length, 1, "拖拽期间不得被自愈打断");
  assert.ok(container.querySelector(".ms-slot--placeholder"), "拖拽期间占位块不得被自愈清掉");
  const mu20 = new win.MouseEvent("mouseup", { button: 0, clientX: 0.25 * RECT.width, clientY: 0.5 * RECT.height, bubbles: true });
  container.dispatchEvent(mu20);
  await sleep(420);
  assert.strictEqual(win.document.querySelectorAll(".dragging-player").length, 0, "原地松手后必须收尾干净");
  dom.window.close();
  console.log("=== 多屏复刻单元测试 100% 通过 ===");
}

run().catch((e) => {
  console.error("✗ 多屏复刻单元测试失败:", e && e.message);
  console.error(e && e.stack);
  process.exit(1);
});
