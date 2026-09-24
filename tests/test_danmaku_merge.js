/*
 * 多屏弹幕合并的测试。
 * 三块最容易出事、又完全可测的逻辑：
 *   1. firstqueue 的脚本补丁必须与 RemoveRepeatedDanmaku 的同锚点补丁**顺序无关**
 *      （两者改的是同一句，先后顺序决定 raw.comment 是否在钩子之前就位）
 *   2. 来源横条的插入位置：要避开放 background-clip:text 的元素，否则横条文字会变透明
 *   3. 聊天区条目：绝不允许出现 is-self（会被弹幕发送检测当成自身回弹幕），且插入要自己滚底
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");
let JSDOM;
try {
  JSDOM = require("jsdom").JSDOM;
} catch (e) {
  JSDOM = require("D:/harness/_cdp/node_modules/jsdom").JSDOM;
}

const RID = "9999";

function bundlePath() {
  const p = path.join(__dirname, "../dist/douyuex.user.js");
  if (fs.existsSync(p)) return p;
  return path.join(__dirname, "../DouyuEx_RL.user.js");
}

// RemoveRepeatedDanmaku 的补丁（真实实现，复制过来当对照）
function patchRemoveRepeated(content) {
  return content.replace("e.display=new e.renderer(e);", "e.display=new e.renderer(e);e.display.raw.comment=e;");
}

// 容器结构如实复刻实机（2288 房间）：#__h5player 并不包含多屏容器，两者是平行的两棵树
function makeDom() {
  return new JSDOM(
    `<!DOCTYPE html><html><head><!-- $ROOM.room_id = ${RID}; --></head><body>
      <div id="js-player-video-case">
        <div id="js-player-video">
          <div class="player__6-Nuo" style="position:relative">
            <div id="js-player-multiContainer" class="layout-Player-multiContainer">
              <div class="layout-Player-videoEntity"></div>
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
  win.__notices = [];
  win.fetch = async () => ({ json: async () => ({}) });
  win.GM_xmlhttpRequest = () => {};
  win.GM_getValue = () => null;
  win.GM_setValue = () => {};
  win.GM_setClipboard = () => {};
  win.GM_registerMenuCommand = () => {};
  // 记录被创建的弹幕连接，供"N 路连接"断言使用
  win.__wsCreated = [];
  win.WebSocket = function (url) {
    this.url = url;
    this.send = () => {};
    this.close = () => {};
    win.__wsCreated.push(url);
  };
  const script = win.document.createElement("script");
  script.textContent = fs.readFileSync(bundlePath(), "utf8");
  win.document.body.appendChild(script);
  win.NoticeJs = function () {
    return { show() {} };
  };
  win.initStyles();
  win.initPkg_PopupPlayer_MultiScreen();
  win.initPkg_PopupPlayer_MergeDanmaku();
  return win;
}

// 造一个假的弹幕实例：形状严格对齐实测的 firstqueue（data / display.raw / space / constructor）
// sharedSpace 用来模拟"同一个原生引擎空间"——真实环境里所有弹幕共用同一个 space
function fakeComment(win, opts, sharedSpace) {
  const o = opts || {};
  const raw = win.document.createElement("div");
  raw.className = "danmuItem";
  const holder = win.document.createElement("div");
  holder.className = "textWrap-abc123";
  if (o.gradient) {
    const g = win.document.createElement("span");
    g.className = "barrage-gradient";
    g.textContent = o.text || "测试弹幕";
    holder.appendChild(g);
  } else {
    holder.appendChild(win.document.createTextNode(o.text || "测试弹幕"));
  }
  raw.appendChild(holder);
  const cm = {
    data: {
      type: o.type || "scroll",
      text: o.text || "测试弹幕",
      size: 24,
      color: "#ffffff",
      extraData: o.srcName ? { exMsSrcName: o.srcName, exMsSrcRid: o.srcRid || "1234" } : {}
    },
    display: { raw: raw },
    space:
      sharedSpace ||
      {
        added: [],
        addComment(c) {
          this.added.push(c);
          return o.noTrack ? false : true;
        }
      }
  };
  if (o.noCtor) delete cm.constructor;
  return cm;
}

function makeSpace(noTrack) {
  return {
    added: [],
    addComment(c) {
      this.added.push(c);
      return !noTrack;
    }
  };
}

async function run() {
  console.log("=== 多屏弹幕合并测试 ===");

  // ---------- 1. 运行时自举：靠一次悬停事件拿到原生引擎 ----------
  console.log("--> 1. 运行时自举（不改源码、不需要 document-start）");
  const win0 = load(makeDom());
  // 造一个正在飘的原生弹幕节点 + 一个假引擎：引擎在悬停时会把实例挂到节点上
  const liveNode = win0.document.createElement("div");
  liveNode.className = "danmuItem-abc";
  liveNode.getBoundingClientRect = () => ({ left: 0, top: 0, width: 120, height: 24, right: 120, bottom: 24 });
  win0.document.body.appendChild(liveNode);
  const fakeSpace = makeSpace();
  const RendererBase = function () {};
  RendererBase.prototype.render = function (cm) {
    // 真实引擎在这里做 cm.display = new cm.renderer(cm)，并把展示节点建出来
    const raw = win0.document.createElement("div");
    raw.className = "danmuItem";
    const wrap = win0.document.createElement("div");
    wrap.className = "textWrap-x";
    wrap.appendChild(win0.document.createTextNode(cm.data.text || ""));
    raw.appendChild(wrap);
    cm.display = { raw: raw };
    return undefined;
  };
  const renderer = new RendererBase();
  fakeSpace._renderer = renderer;
  const ScrollComment = function (data) { this.data = data; };
  const bootComment = { data: { type: "scroll", text: "原生弹幕" }, space: fakeSpace, constructor: ScrollComment };
  // 引擎的悬停处理器会执行 event.target.comment = comment，这里如实复刻
  liveNode.addEventListener("mouseover", function (e) { e.target.comment = bootComment; });
  const booted = win0.MergeDanmaku_bootstrap();
  assert.strictEqual(booted, true, "派发悬停后必须能自举成功");
  assert.strictEqual(win0.MergeDanmaku_getStats().ready, true, "自举后引擎必须就绪");
  // 自举必须把渲染分派器的 render 包起来（这是贴横条的唯一插入点）
  const foreign2 = new ScrollComment({ type: "scroll", text: "外房弹幕", extraData: { exMsSrcName: "老王", exMsSrcRid: "1234" } });
  renderer.render(foreign2);
  const wrappedBadge = foreign2.display.raw.querySelector(".ex-ms-badge");
  assert.ok(wrappedBadge, "包装后的 render 必须给带来源标记的弹幕贴横条");
  assert.strictEqual(wrappedBadge.textContent, "老王", "横条文字必须是来源主播名");
  // 主房弹幕（无来源标记）不得贴
  const mainCm = new ScrollComment({ type: "scroll", text: "主房弹幕", extraData: {} });
  renderer.render(mainCm);
  assert.strictEqual(mainCm.display.raw.querySelector(".ex-ms-badge"), null, "主房弹幕绝不能贴横条");
  // 包装必须幂等：重复自举不得把 render 套娃
  win0.MergeDanmaku_bootstrap();
  const cm3 = new ScrollComment({ type: "scroll", text: "再来一条", extraData: { exMsSrcName: "老王" } });
  renderer.render(cm3);
  assert.strictEqual(cm3.display.raw.querySelectorAll(".ex-ms-badge").length, 1, "重复自举不得套娃出多个横条");
  // 没有弹幕在飘时自举必须安全返回 false（不抛错）
  const winEmpty = load(makeDom());
  assert.strictEqual(winEmpty.MergeDanmaku_bootstrap(), false, "没有弹幕节点时自举必须返回 false 而不是抛错");
  // ---------- 1.1 脚本钩子：捕获播放器自己的构造入口与聊天总线 ----------
  console.log("--> 1.1 原生管线脚本钩子（需 document-start，这里验补丁本身）");
  const vm = require("vm");
  // 形状照真实分块写：convertComment 在原型上；subscribe 处在语句位置（右括号只闭合它自己）
  const fqSrc = "t.prototype.convertComment=function(e){var y=this.dataHandle(e);return y},t.prototype.other=function(){}";
  const fqOut = win0.MergeDanmaku_patchFirstqueue(fqSrc);
  assert.ok(fqOut.indexOf("window.__ExDanmuHost=this;") !== -1, "必须捕获弹幕组件实例");
  assert.ok(fqOut.indexOf("__ExDanmuHost") > fqOut.indexOf("convertComment"), "捕获必须发生在 convertComment 里");
  assert.doesNotThrow(() => new vm.Script(fqOut), "补丁后必须仍是合法 JS");
  assert.strictEqual(win0.MergeDanmaku_patchFirstqueue(fqOut), fqOut, "重复打补丁必须幂等");
  assert.strictEqual(win0.MergeDanmaku_patchFirstqueue("var a=1;"), "var a=1;", "锚点缺失必须原样返回");
  const bgSrc = 't.prototype.init=function(e){var t=this;E.subscribe("chatmsg",function(r){r.kid&&t.f(r,e)})},t.prototype.f=function(){}';
  const bgOut = win0.MergeDanmaku_patchBarrageGroup(bgSrc);
  const wantFrag = 'window.__ExChatBus=E;E.subscribe("chatmsg"';
  assert.ok(bgOut.indexOf(wantFrag) !== -1, "必须捕获总线且不破坏持有者引用，实际 " + bgOut.slice(0, 80));
  assert.doesNotThrow(() => new vm.Script(bgOut), "补丁后必须仍是合法 JS（不能靠加括号：原上下文没有多余右括号）");
  assert.strictEqual(win0.MergeDanmaku_patchBarrageGroup(bgOut), bgOut, "重复打补丁必须幂等");
  // ---------- 2. 引擎实例捕获与上屏 ----------
  console.log("--> 2. 捕获引擎并喂弹幕");
  const dom = makeDom();
  const win = load(dom);
  const W = win;
  assert.strictEqual(typeof W.__onDouyuExDanmakuRendered, "function", "页面侧渲染钩子必须已安装");

  const engineSpace = makeSpace();
  const first = fakeComment(win, { text: "主房第一条" }, engineSpace); // 无来源标记 = 主房自己的弹幕
  W.__onDouyuExDanmakuRendered(first);
  assert.strictEqual(W.MergeDanmaku_getStats().ready, true, "喂过一条后引擎必须就绪");
  // 主房弹幕（无来源标记）不得贴横条
  assert.strictEqual(first.display.raw.querySelector(".ex-ms-badge"), null, "主房弹幕绝不能贴来源横条");

  // 外房弹幕要贴横条
  const foreign = fakeComment(win, { srcName: "很长的主播昵称", srcRid: "1234", text: "外房来了" }, engineSpace);
  W.__onDouyuExDanmakuRendered(foreign);
  const badge = foreign.display.raw.querySelector(".ex-ms-badge");
  assert.ok(badge, "外房弹幕必须贴来源横条");
  assert.strictEqual(Array.from(badge.textContent).length <= 5, true, "横条必须最多 5 个字，实际 " + badge.textContent);
  assert.strictEqual(badge.title, "很长的主播昵称", "横条 title 保留完整昵称");
  // 横条必须排在文字之前
  const holder = foreign.display.raw.querySelector('[class*="textWrap"]');
  assert.strictEqual(holder.firstChild, badge, "横条必须是文本容器的第一个子节点");
  // 幂等：再渲染一次不会叠加
  W.__onDouyuExDanmakuRendered(foreign);
  assert.strictEqual(foreign.display.raw.querySelectorAll(".ex-ms-badge").length, 1, "横条必须幂等，不得叠加");

  // 渐变弹幕：横条不能落在 background-clip:text 的元素里
  const grad = fakeComment(win, { srcName: "彩色房", gradient: true, text: "彩色弹幕" }, engineSpace);
  W.__onDouyuExDanmakuRendered(grad);
  const gBadge = grad.display.raw.querySelector(".ex-ms-badge");
  assert.ok(gBadge, "彩色弹幕也必须贴横条");
  assert.strictEqual(gBadge.closest(".barrage-gradient"), null, "横条绝不能落进 .barrage-gradient，否则文字会被裁成透明");

  // 上屏：调用原生 space.addComment，且数据形状符合引擎要求
  W.MultiScreen_enter([{ rid: "1234", nn: "老王", avatar: "" }]);
  const beforeAdded = 0;
  const space = engineSpace;
  W.MergeDanmaku_push({ text: "合并测试", color: "#ff2e2e", nn: "观众A", uid: "1", srcRid: "1234", srcName: "老王" });
  const pushed = space.added.filter((c) => (c.data || c).text === "合并测试");
  assert.strictEqual(pushed.length, 1, "合并弹幕必须通过原生 addComment 上屏（实际 " + space.added.length + " 条）");
  const payload = pushed[0].data || pushed[0];
  assert.strictEqual(payload.type, "scroll", "上屏类型必须是 scroll");
  assert.strictEqual(payload.space, "scroll", "space 必须是 scroll");
  assert.strictEqual(payload.color, "#ff2e2e", "颜色必须原样传给引擎（原生颜色表）");
  assert.strictEqual(payload.extraData.exMsSrcRid, "1234", "必须把来源房间塞进 extraData");
  assert.strictEqual(payload.extraData.exMsSrcName, "老王", "必须把来源主播塞进 extraData");
  assert.strictEqual(payload.alpha, 1, "alpha 必须显式给 1，否则原生会写出 opacity:undefined");
  assert.ok(payload.stime > 0, "必须带 stime");
  void beforeAdded;

  // 没有空轨时返回 false，且计入 noTrack（原生语义，不算错误）
  const statsBefore = W.MergeDanmaku_getStats();
  const noTrackWin = makeDom();
  const win2 = load(noTrackWin);
  const nt = fakeComment(win2, { srcName: "满轨道" }, makeSpace(true));
  win2.__onDouyuExDanmakuRendered(nt);
  win2.MergeDanmaku_push({ text: "无空轨", color: "#ffffff", nn: "A", uid: "2", srcRid: "5", srcName: "满轨道" });
  assert.strictEqual(win2.MergeDanmaku_getStats().noTrack, 1, "无空轨必须计入 noTrack");
  assert.ok(statsBefore.pushed >= 1, "正常上屏必须计入 pushed");

  // ---------- 3. 限流 ----------
  console.log("--> 3. 限流");
  const win3 = load(makeDom());
  const c3 = fakeComment(win3, { srcName: "限流房" }, makeSpace());
  win3.__onDouyuExDanmakuRendered(c3);
  let ok = 0;
  for (let i = 0; i < 40; i++) {
    if (win3.MergeDanmaku_push({ text: "t" + i, color: "#ffffff", nn: "A", uid: "1", srcRid: "6", srcName: "限流房" })) ok++;
  }
  assert.ok(ok <= 12, "同一秒内上屏数必须被限流压住（实际 " + ok + "）");
  assert.ok(win3.MergeDanmaku_getStats().dropped > 0, "被限流丢弃的必须计数");

  // ---------- 4. 聊天区条目 ----------
  console.log("--> 4. 聊天区同步");
  const win4 = load(makeDom());
  const c4 = fakeComment(win4, { srcName: "聊天房" }, makeSpace());
  win4.__onDouyuExDanmakuRendered(c4);
  win4.MergeDanmaku_push({ text: "聊天区也要有", color: "#00ccff", nn: "观众B", uid: "9", srcRid: "77", srcName: "聊天房" });
  const list = win4.document.getElementById("js-barrage-list");
  const item = list.querySelector(".ex-ms-item");
  assert.ok(item, "聊天区必须插入条目");
  assert.strictEqual(item.tagName, "LI", "条目必须是 li（原生结构）");
  assert.ok(item.className.includes("Barrage-listItem"), "条目必须带原生 Barrage-listItem 类");
  assert.ok(item.querySelector(".Barrage-content"), "条目必须有 .Barrage-content");
  assert.ok(item.querySelector(".Barrage-nickName"), "条目必须有 .Barrage-nickName");
  assert.strictEqual(item.querySelector(".Barrage-content").textContent, "聊天区也要有", "正文必须原样");
  assert.strictEqual(item.querySelector(".ex-ms-badge--chat").textContent, "聊天房", "聊天区条目必须带来源横条");
  // 最关键的一条：绝不能出现 is-self
  assert.strictEqual(item.className.includes("is-self"), false, "条目自身绝不允许带 is-self");
  assert.strictEqual(item.querySelectorAll(".is-self").length, 0, "条目内部绝不允许有 .is-self（会被发送检测误判）");
  // 彩色弹幕必须带颜色
  assert.strictEqual(item.querySelector(".Barrage-content").style.color, "rgb(0, 204, 255)", "彩色弹幕要带原生色值");
  // 白色弹幕不加内联色（保持原生默认）
  win4.MergeDanmaku_push({ text: "白色", color: "#ffffff", nn: "观众C", uid: "10", srcRid: "77", srcName: "聊天房" });
  const items = list.querySelectorAll(".ex-ms-item");
  assert.strictEqual(items[items.length - 1].querySelector(".Barrage-content").style.color, "", "白色弹幕不得加内联色");

  // 上限：只回收我们自己插入的节点，绝不碰原生条目
  const nativeLi = win4.document.createElement("li");
  nativeLi.className = "Barrage-listItem";
  list.insertBefore(nativeLi, list.firstChild);
  for (let i = 0; i < 260; i++) {
    win4.MergeDanmaku_push({ text: "刷屏" + i, color: "#ffffff", nn: "刷", uid: "1", srcRid: "77", srcName: "聊天房" });
  }
  assert.ok(list.querySelectorAll(".ex-ms-item").length <= 240, "我们插入的条目必须自收口到上限内");
  assert.ok(nativeLi.isConnected, "绝不能删掉原生条目");

  // ---------- 5. N 路连接 ----------
  console.log("--> 5. 多屏连接管理");
  const win5 = load(makeDom());
  win5.__wsCreated.length = 0;
  win5.MultiScreen_enter([{ rid: "2001", nn: "房一", avatar: "" }, { rid: "2002", nn: "房二", avatar: "" }]);
  const conns = win5.MergeDanmaku_getStats().conns;
  assert.strictEqual(conns.length, 2, "2 个外房必须有 2 路连接，实际 " + JSON.stringify(conns));
  assert.ok(conns.indexOf(String(RID)) === -1, "主房间不得额外开连接");
  assert.strictEqual(win5.__wsCreated.length, 2, "必须真的建了 2 个 WebSocket");
  // 移除一个房间后对应连接必须关闭
  win5.MultiScreen_removeRoom("2001");
  assert.strictEqual(win5.MergeDanmaku_getStats().conns.length, 1, "房间移除后必须关掉对应连接");
  win5.MultiScreen_exit();
  assert.strictEqual(win5.MergeDanmaku_getStats().conns.length, 0, "退出多屏后必须全部关闭");
  win5.__wsCreated.length = 0;
  win5.MultiScreen_enter([{ rid: "3001", nn: "房三", avatar: "" }]);
  assert.strictEqual(win5.__wsCreated.length, 1, "重新开启后必须重新建连接");

  // ---------- 6. 报文解析与原生颜色表 ----------
  console.log("--> 6. 报文解析与原生色表");
  const win6 = load(makeDom());
  const room = { rid: "3001", nn: "老王" };
  // 真实 chatmsg 报文：故意带上 bnn（粉丝牌名称）与 bl，验证 nn 不会被 bnn 误命中
  const pkt = "type@=chatmsg/rid@=3001/uid@=12345/nn@=某观众/txt@=hello@Sworld/bnn@=粉丝牌名称/bl@=5/col@=1/level@=12/";
  const parsedItem = win6.MergeDanmaku_parseChatmsg(room, pkt);
  assert.ok(parsedItem, "合法 chatmsg 必须能解析");
  assert.strictEqual(parsedItem.text, "hello/world", "@S 必须反转义成斜杠");
  assert.strictEqual(parsedItem.nn, "某观众", "昵称必须取 nn 而不是 bnn");
  assert.strictEqual(parsedItem.color, "#ff2e2e", "col=1 必须是原生红 #ff2e2e");
  assert.strictEqual(parsedItem.srcRid, "3001", "必须带上来源房间");
  assert.strictEqual(parsedItem.srcName, "老王", "必须带上来源主播");

  // 原生色表逐档核对（这张表抄自引擎自己的 activity 渲染器）
  const colorCases = [["0", "#ffffff"], ["1", "#ff2e2e"], ["2", "#00ccff"], ["3", "#66ff00"], ["4", "#ff6600"], ["5", "#cc00ff"], ["6", "#f6447f"], ["99", "#ffffff"]];
  colorCases.forEach(([col, want]) => {
    const got = win6.MergeDanmaku_parseChatmsg(room, "type@=chatmsg/nn@=A/txt@=t/col@=" + col + "/");
    assert.strictEqual(got.color, want, "col=" + col + " 必须映射到 " + want + "，实际 " + got.color);
  });

  // 非弹幕报文必须返回 null
  assert.strictEqual(win6.MergeDanmaku_parseChatmsg(room, "type@=uenter/nn@=A/uid@=1/"), null, "进场消息不得当弹幕处理");
  assert.strictEqual(win6.MergeDanmaku_parseChatmsg(room, "type@=mrkl/"), null, "心跳包不得当弹幕处理");
  // 带二进制头残字符时也必须能解析（这正是不能用 startsWith 的原因）
  const dirty = "   " + pkt;
  assert.ok(win6.MergeDanmaku_parseChatmsg(room, dirty), "收包带残字符时仍必须能解析");
  // 空文本不生成弹幕
  assert.strictEqual(win6.MergeDanmaku_parseChatmsg(room, "type@=chatmsg/nn@=A/txt@=/"), null, "空文本不得上屏");

  // 截断规则（纯函数）
  assert.strictEqual(win6.MergeDanmaku_badgeText(""), "", "空昵称不得生成横条文字");
  assert.strictEqual(win6.MergeDanmaku_badgeText("abcdefg"), "abcde", "横条必须截到 5 字");
  assert.strictEqual(Array.from(win6.MergeDanmaku_badgeText("🔥🔥🔥🔥🔥🔥")).join(""), "🔥🔥🔥🔥🔥", "emoji 必须按码点截断，不能截坏代理对");
  assert.strictEqual(win6.MergeDanmaku_badgeText("  老王  "), "老王", "昵称必须去空白");

  // ---------- 7. 去重键：横条不得污染它 ----------
  console.log("--> 7. 去重键与横条污染");
  const win7 = load(makeDom());
  // 主房弹幕：键就是正文
  const mainDom = win7.document.createElement("div");
  mainDom.className = "danmuItem";
  mainDom.textContent = "666";
  mainDom.comment = { data: { text: "666", extraData: {} } };
  assert.strictEqual(win7.RemoveRepeatedDanmaku_getKey(mainDom), "666", "主房弹幕的键必须是纯正文");
  // 外房弹幕：即使 DOM 里已经贴了来源横条，键也不得受影响
  const foreignDom = win7.document.createElement("div");
  foreignDom.className = "danmuItem";
  const b = win7.document.createElement("span");
  b.className = "ex-ms-badge";
  b.textContent = "老王";
  foreignDom.appendChild(b);
  foreignDom.appendChild(win7.document.createTextNode("666"));
  foreignDom.comment = { data: { text: "666", extraData: { exMsSrcRid: "1234" } } };
  const k1 = win7.RemoveRepeatedDanmaku_getKey(foreignDom);
  assert.strictEqual(k1, "r1234|666", "外房弹幕的键必须带来源前缀且不含横条文字，实际 " + k1);
  assert.ok(k1.indexOf("老王") === -1, "横条文字绝不能进键（否则跨房同文本不去重、map 膨胀）");
  // 不同房间的同文本必须产生不同的键
  const foreignDom2 = win7.document.createElement("div");
  foreignDom2.className = "danmuItem";
  foreignDom2.textContent = "老王666";
  foreignDom2.comment = { data: { text: "666", extraData: { exMsSrcRid: "5678" } } };
  assert.notStrictEqual(win7.RemoveRepeatedDanmaku_getKey(foreignDom2), k1, "不同房间的相同文本必须是不同的键");
  // 引擎没给 comment 时退回 textContent（老路径不能坏）
  const noComment = win7.document.createElement("div");
  noComment.textContent = "  abc  ";
  assert.strictEqual(win7.RemoveRepeatedDanmaku_getKey(noComment), "abc", "无 comment 时必须退回 textContent");
  win7.close();

  dom.window.close();
  win2.close();
  win3.close();
  win4.close();
  win5.close();
  win6.close();
  win0.close();
  winEmpty.close();
  console.log("=== 多屏弹幕合并测试 100% 通过 ===");
  // 自举轮询是 setInterval，收尾显式退出，避免定时器把进程吊住
  process.exit(0);
}

run().catch((e) => {
  console.error("✗ 多屏弹幕合并测试失败:", e && e.message);
  console.error(e && e.stack);
  process.exit(1);
});
