/* ==================== 多屏弹幕合并 ==================== */
/*
 * 目标：把外房弹幕喂进主房间的原生弹幕引擎，颜色与特效 100% 走原生（含彩色弹幕、贵族弹幕、
 * 超管/活动/角色弹幕等特殊样式），只在每条前面贴一个"来源横条 + 主播名"标识房间；
 * 同时把同一条弹幕原样补进主房间的聊天区列表。
 *
 * 全部结论都来自实测的 firstqueue 源码（live_player-master/js/firstqueue_*.js），不是推测：
 *
 *   ① 引擎公开入口
 *      Space.prototype.addComment = function(c){ c.space=this, this._renderer.render(c),
 *        this._renderer.add(c), this.configComment(c), this.setY(c) ? (this.startComment(c),
 *        true) : (this.commentComplete(c), false) }
 *      —— addComment 里**先设 c.space=this 再 render**，所以渲染钩子里能直接拿到 space，
 *         不必去猜压缩后的类名。setY 返回 false 表示没有空轨，此时返回 false 并静默清理
 *         → 这就是"限流 + 丢弃计数"必须自己做设计的原因（管理器那层的 _shouldDropByAdaptive
 *         在 addComment 路径上不生效）。
 *
 *   ② 宽度公式（scroll 空间的 configComment）
 *      _safeWidth = max(实测宽 + 贵族额外, 15 * text.length + 50, 80)
 *      实测宽来自 this._renderer.add(c) → display.addToSpace() → calcRect() 的真实测量，
 *      **而 render 在 add 之前**。所以来源横条必须插在 render 之后、add 之前，
 *      否则宽度失真 → 弹幕提前消失、防撞误判叠字。这就是补丁打在 render 末尾的原因。
 *
 *   ③ 原生颜色表（引擎自己的 activity 渲染器里逐条写死，col 索引即此表）
 *      1→#ff2e2e 2→#00ccff 3→#66ff00 4→#ff6600 5→#cc00ff 6→#f6447f，其余为白
 *      —— 直接用这张表，才算"颜色保持原生不做改动"。
 *
 *   ④ 弹幕数据形状（引擎 convertBarrages 的真实产物）
 *      { type:"scroll", stime, text, size, space:"scroll", color, bold, border, cursor,
 *        alpha, userIcon, nobleIcon, nobleColor, extraData:{ uid, sendName, emotData, ... } }
 *      我们只走 type:"scroll" 这条路，把来源信息塞进 extraData 供钩子读取；
 *      noble/activity 等富类型需要各自的 extraData/commData，字段缺失会降级，
 *      所以**不赌代理转发富字段**——外房弹幕统一按普通滚动弹幕上屏，颜色照原生表给。
 *
 *   ⑤ 节点结构：raw = .danmuItem，文本在 class 里含 textWrap 的子节点内，
 *      自定义颜色走 .barrage-gradient（background-clip:text）。
 *      横条必须插在 textWrap 这一层、避开渐变元素，否则横条文字会被裁成透明。
 */

const MS_MERGE_COLORS = {
  0: "#ffffff",
  1: "#ff2e2e",
  2: "#00ccff",
  3: "#66ff00",
  4: "#ff6600",
  5: "#cc00ff",
  6: "#f6447f"
};

const MS_MERGE_BADGE_MAX = 5;      // 来源横条最多显示几个字
const MS_MERGE_RATE_WINDOW_MS = 1000;
const MS_MERGE_RATE_MAX = 12;      // 每秒最多上屏多少条合并弹幕（含所有外房）
const MS_MERGE_CHAT_MAX = 240;     // 聊天区我们插入的条目上限
const MS_MERGE_BADGE_COLOR = "rgba(255,255,255,0.22)"; // 统一中性色横条

let msMergeSpace = null;              // 捕获到的原生 scroll 空间（提供 addComment）
let msMergeCtors = {};               // 弹幕类型 -> 弹幕类（来自 cm.constructor）
let msMergeInstalled = false;
let msMergeConns = [];               // { rid, nn, ws }
let msMergeRate = { at: 0, count: 0 };
let msMergeStats = { pushed: 0, dropped: 0, noTrack: 0 };
let msMergeChatCount = 0;
let msMergePending = [];             // 引擎未就绪时的暂存（极短，通常几秒内就绪）

/* ---------- ① 脚本钩子 ---------- */

/* ---------- ① 运行时自举：拿到原生引擎的 space 与渲染器 ---------- */
/*
 * 早先的做法是脚本钩子改 firstqueue 源码（替换 .display=new X.renderer(X); 那个锚点）。
 * 实测发现有一条**运行时**路径，完全不依赖压缩后的源码锚点，也不需要 document-start：
 *
 *   引擎给弹幕节点挂的悬停处理器里有 `event.target.comment = comment`，
 *   所以对任意一个正在飘的弹幕节点派发一次 mouseover，就能从 node.comment 拿到弹幕实例，
 *   进而拿到：
 *     · comment.space.addComment  —— 喂弹幕的公开入口
 *     · comment.space._renderer   —— 渲染分派器（render 在原型上，可包装）
 *     · comment.constructor       —— 该类型的弹幕类
 *   这些都是实测的（2288 房间：mouseover 一次即命中，拿到 type/color/space/renderer 全部字段）。
 *
 * 因此启动流程改成"等第一个弹幕飘过 → 派发 mouseover → 取实例 → 包装原型 render"。
 * 更稳、更小、并且在我这种"产物后注入"的取证环境里也能跑起来（脚本钩子做不到这一点）。
 */
const MS_BOOTSTRAP_POLL_MS = 1500;
const MS_BOOTSTRAP_MAX_TRIES = 40;   // 最多等 60 秒；弹幕层关着时本来也没有合并的必要

let msBootTimer = 0;
let msBootTries = 0;
let msRendererProto = null;

function MergeDanmaku_bootstrap() {
  // 必须同时拿到 space 与 **scroll 类型**的弹幕类才算就绪：我们喂进去的都是普通滚动弹幕。
  // 若只按 space 判就绪，第一条恰好是 fans/noble 之类的弹幕就会提前收工，
  // 之后永远补不到 scroll 的构造器（实测踩过）。
  if (msMergeSpace && msMergeCtors.scroll) return true;
  const node = MergeDanmaku_findDanmakuNode();
  if (!node) return false;
  // 派发真实悬停事件，让引擎把弹幕实例挂到节点上
  ["mouseover", "mouseout"].forEach(function (t) {
    if (node.comment) return;
    try {
      node.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
    } catch (e) {
      node.dispatchEvent(new Event(t, { bubbles: true }));
    }
  });
  const cm = node.comment;
  if (!cm || !cm.space || typeof cm.space.addComment !== "function") return false;
  msMergeSpace = cm.space;
  // 按类型记录构造器：采样到的每一条都记，直到凑齐 scroll
  if (cm.data && cm.data.type && typeof cm.constructor === "function") msMergeCtors[cm.data.type] = cm.constructor;
  MergeDanmaku_wrapRenderer();
  if (!msMergeCtors.scroll) return false;   // 继续等一条普通滚动弹幕
  MergeDanmaku_flushPending();
  console.log("[DouyuEx] 多屏弹幕合并已接入原生引擎");
  return true;
}

function MergeDanmaku_findDanmakuNode() {
  const nodes = document.querySelectorAll('[class*="danmuItem"]');
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (n.getBoundingClientRect().width > 0) return n;   // 只认真在飘的（宽 0 的是刚要销毁的）
  }
  return null;
}

function MergeDanmaku_wrapRenderer() {
  const rd = msMergeSpace && msMergeSpace._renderer;
  if (!rd || msRendererProto) return;
  const proto = Object.getPrototypeOf(rd);
  if (!proto || typeof proto.render !== "function") return;
  msRendererProto = proto;
  const orig = proto.render;
  proto.render = function (cm) {
    const r = orig.apply(this, arguments);
    try {
      MergeDanmaku_onRendered(cm);
    } catch (e) {
      // 包装在原生渲染主路径上，异常必须吞掉，绝不能影响原生弹幕
    }
    return r;
  };
}

function MergeDanmaku_startBootstrap() {
  if (msBootTimer) return;
  MergeDanmaku_bootstrap();
  msBootTimer = setInterval(function () {
    msBootTries++;
    if (MergeDanmaku_bootstrap() || msBootTries >= MS_BOOTSTRAP_MAX_TRIES) {
      clearInterval(msBootTimer);
      msBootTimer = 0;
    }
  }, MS_BOOTSTRAP_POLL_MS);
}

/* ---------- ② 页面侧钩子（在页面上下文被调用） ---------- */

function initPkg_PopupPlayer_MergeDanmaku() {
  if (msMergeInstalled) return;
  msMergeInstalled = true;
  const W = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  W.__onDouyuExDanmakuRendered = function (cm) {
    try {
      MergeDanmaku_onRendered(cm);
    } catch (e) {
      // 钩子在页面主渲染路径上，任何异常都必须吞掉，绝不能影响原生弹幕
    }
  };
  // 多屏房间变化时同步重建连接
  MultiScreen_onChange(function () {
    MergeDanmaku_syncConnections();
  });
  MergeDanmaku_syncConnections();
  // 起运行时自举：等第一条弹幕飘过，派发悬停事件拿到原生引擎的 space 与渲染器
  MergeDanmaku_startBootstrap();
}

function MergeDanmaku_onRendered(cm) {
  if (!cm || !cm.data) return;
  // 捕获 space：addComment 先赋 cm.space 再 render，这里一定有
  if (!msMergeSpace && cm.space && typeof cm.space.addComment === "function") {
    msMergeSpace = cm.space;
    MergeDanmaku_flushPending();
  }
  // 按类型记录弹幕类，供我们构造实例
  const t = cm.data.type;
  if (t && !msMergeCtors[t] && typeof cm.constructor === "function") msMergeCtors[t] = cm.constructor;
  // 只给带来源标记的（外房）弹幕贴横条；主房弹幕不加任何东西
  const src = cm.data.extraData && cm.data.extraData.exMsSrcName;
  if (src) MergeDanmaku_attachBadge(cm, src);
}

// 幂等：引擎节点池化会清空子节点，所以每次渲染都要检查一次（重复调用不会叠加）
function MergeDanmaku_attachBadge(cm, name) {
  const raw = cm.display && cm.display.raw;
  if (!raw) return;
  if (raw.querySelector(".ex-ms-badge")) return;
  const label = MergeDanmaku_badgeText(name);
  if (!label) return;

  // 插在 textWrap 这一层、且作为第一个子节点：既在文字之前，又不落进
  // .barrage-gradient（background-clip:text）里——落进去横条文字会变透明
  let host = raw.querySelector('[class*="textWrap"]') || raw;
  if (MergeDanmaku_isGradient(host) && host.parentElement) host = host.parentElement;
  const badge = document.createElement("span");
  badge.className = "ex-ms-badge";
  badge.textContent = label;
  badge.title = String(name);
  host.insertBefore(badge, host.firstChild);
}

function MergeDanmaku_isGradient(el) {
  if (!el) return false;
  const cls = String(el.className || "");
  if (cls.indexOf("barrage-gradient") !== -1) return true;
  // 有些变体是内联样式，直接看样式更可靠
  try {
    const st = el.style;
    return !!st && (st.webkitBackgroundClip === "text" || st.backgroundClip === "text");
  } catch (e) {
    return false;
  }
}

function MergeDanmaku_badgeText(name) {
  const s = String(name || "").trim();
  if (!s) return "";
  const chars = Array.from(s); // 按码点截，别把 emoji 或代理对切坏
  return chars.slice(0, MS_MERGE_BADGE_MAX).join("");
}

/* ---------- ③ N 路免登录弹幕连接 ---------- */

function MergeDanmaku_syncConnections() {
  const list = MultiScreen_getList();
  const mainRid = MultiScreen_getMainRid();
  const want = list.filter(function (r) {
    return String(r.rid) !== mainRid;
  });
  const wantMap = {};
  want.forEach(function (r) {
    wantMap[String(r.rid)] = r;
  });

  // 关掉不再需要的
  msMergeConns = msMergeConns.filter(function (c) {
    if (wantMap[c.rid]) return true;
    try {
      c.ws.closed = true;
      if (c.ws.ws) c.ws.ws.close();
    } catch (e) {}
    return false;
  });

  // 新增缺的连接
  const have = {};
  msMergeConns.forEach(function (c) {
    have[c.rid] = 1;
  });
  want.forEach(function (r) {
    const rid = String(r.rid);
    if (have[rid]) return;
    if (typeof Ex_WebSocket_UnLogin !== "function") return;
    const room = r;
    const ws = new Ex_WebSocket_UnLogin(rid, function (ret) {
      MergeDanmaku_handleMsg(room, ret);
    });
    msMergeConns.push({ rid: rid, nn: room.nn || "", ws: ws });
  });
}

/* ---------- ④ 解析与上屏 ---------- */

/* 解析一条免登录报文。收包可能带二进制头残字符，所以**不能用 startsWith 判类型**，
   必须锚定字段边界取值（getFieldValue 用的是 (?:^|/)key@= 的形式，
   否则 nn@= 会误命中 bnn@=（粉丝牌名称））。@S/@A 必须反转义，否则斜杠与 @ 会串味。 */
function MergeDanmaku_parseChatmsg(room, raw) {
  if (typeof raw !== "string") return null;
  let ret = raw;
  const rawText = raw;
  // 收包头可能带二进制残字符（WS 帧头被当文本解出来），会让锚定匹配落空；
  // 此时切到第一个 type@= 再试。仍然不是 startsWith：真正的类型判定依旧靠锚定取值。
  if (!getFieldValue(ret, "type")) {
    const at = ret.indexOf("type@=");
    if (at < 0) return null;
    ret = ret.slice(at);
  }
  if (getFieldValue(ret, "type") !== "chatmsg") return null;
  const txt = stt_unescape(getFieldValue(ret, "txt"));
  if (!txt) return null;
  const nn = stt_unescape(getFieldValue(ret, "nn")) || "观众";
  const uid = getFieldValue(ret, "uid");
  const col = parseInt(getFieldValue(ret, "col"), 10) || 0;
  // 整条报文一并带上：原生构造弹幕数据时要用 ic(头像)/cid(粉丝牌)/pg/pid/mgt/nl 等字段，
  // 只挑几个字段转发的话，头像、粉丝牌、等级这些"资产"在飘屏上就都不会出现。
  let full = null;
  try {
    full = typeof stt_deserialize === "function" ? stt_deserialize(ret) : null;
  } catch (e) {
    full = null;
  }
  return {
    text: txt,
    color: MS_MERGE_COLORS[col] || MS_MERGE_COLORS[0],
    nn: nn,
    uid: uid,
    raw: full || { nn: nn, txt: txt, uid: uid, col: String(col), __raw: rawText },
    srcRid: room.rid,
    srcName: room.nn || ("房间 " + room.rid)
  };
}

function MergeDanmaku_handleMsg(room, ret) {
  const item = MergeDanmaku_parseChatmsg(room, ret);
  if (item) MergeDanmaku_push(item);
}

function MergeDanmaku_push(item) {
  if (!item || !item.text) return false;
  if (!MergeDanmaku_allowRate()) {
    msMergeStats.dropped++;
    return false;
  }
  const ok = MergeDanmaku_feed(item);
  if (ok) msMergeStats.pushed++;
  // 聊天区与原引擎是否可用无关，始终补
  MergeDanmaku_chatAppend(item);
  return ok;
}

// 限流：滑动窗口。超过窗口上限直接丢（并计数），避免把原生轨道池打爆导致整屏弹幕被拖慢
function MergeDanmaku_allowRate() {
  const now = Date.now();
  if (now - msMergeRate.at >= MS_MERGE_RATE_WINDOW_MS) {
    msMergeRate.at = now;
    msMergeRate.count = 0;
  }
  if (msMergeRate.count >= MS_MERGE_RATE_MAX) return false;
  msMergeRate.count++;
  return true;
}

function MergeDanmaku_feed(item) {
  const Ctor = msMergeCtors.scroll;
  if (!msMergeSpace || !Ctor) {
    // 引擎或 scroll 类还没捕获到：暂存（有上限，避免无限堆积）
    if (msMergePending.length < 60) msMergePending.push(item);
    return false;
  }
  try {
    const cm = new Ctor(MergeDanmaku_buildCommentData(item));
    // 返回 false = 原生没有空轨，静默丢弃（原生语义，不算错误）
    const ok = msMergeSpace.addComment(cm);
    if (!ok) msMergeStats.noTrack++;
    return !!ok;
  } catch (e) {
    msMergeStats.dropped++;
    return false;
  }
}

/* 按**原生字段名**构造弹幕数据 —— 这是让引擎自己去解析头像、粉丝牌、等级、贵族色的关键。
   字段名全部来自实测的 firstqueue 源码（dataHandle / 各弹幕构造器）：
     userIcon      = 头像地址，由报文的 ic 拼出（$SYS.avatar_url + "upload/" + ic + "_small.jpg"）
     extraData.dbid= 粉丝牌 id（原生就是 e.cid），引擎据此渲染粉丝牌
     extraData.pg / pid / mgt / nl = 房间等级 / 角色 / 房管 / 贵族等级
   只挑 text/color/uid 转发的话，飘屏上就只有一条"光秃秃"的弹幕，资产全丢。 */
function MergeDanmaku_buildCommentData(item) {
  const raw = item.raw || {};
  const ic = raw.ic || raw.icon || "";
  const avatar = ic ? "https://apic.douyucdn.cn/upload/" + ic + "_small.jpg" : "";
  const data = {
    type: "scroll",
    stime: Date.now(),
    text: item.text,
    size: 24,
    space: "scroll",
    color: item.color,
    bold: true,
    border: false,
    alpha: 1,
    cursor: raw.uid || item.uid ? "pointer" : "auto",
    extraData: {
      uid: String(item.uid || raw.uid || ""),
      sendName: item.nn,
      dbid: String(raw.cid || raw.bid || ""),
      pg: String(raw.pg || ""),
      pid: String(raw.pid || ""),
      mgt: String(raw.mgt || ""),
      nl: String(raw.nl || ""),
      level: String(raw.level || ""),
      brid: String(raw.brid || ""),
      bnn: String(raw.bnn || ""),
      bl: String(raw.bl || ""),
      // 我们自己加的来源标记：只有它能触发"来源横条"，主房弹幕没有它
      exMsSrcRid: String(item.srcRid),
      exMsSrcName: item.srcName
    }
  };
  if (avatar) data.userIcon = avatar;
  return data;
}

function MergeDanmaku_flushPending() {
  if (!msMergeSpace || !msMergeCtors.scroll || !msMergePending.length) return;
  const pending = msMergePending;
  msMergePending = [];
  pending.forEach(function (item) {
    MergeDanmaku_feed(item);
  });
}

/* ---------- ⑤ 主房间聊天区同步展示 ---------- */

/* 聊天区 ul#js-barrage-list 虽是 React 渲染，但条目全部由原生队列命令式写入
   （appendChild + innerHTML），React 不 reconcile 子节点，所以我们的插入不会被冲掉。
   三个必须遵守的副作用约束：
     1. 绝不能加 is-self —— BarrageSendCheck 以 is-self 为门槛比对回执，
        命中外房弹幕会被标删除线 +「(可能发送失败)」+ 污染熔断计数
     2. 插入后若本来就在底部，必须同步滚底 —— 否则 scrollHeight 变大触发原生
        "离底 > 30px" 判定，进锁屏态并开始显示"有 N 条新消息"
     3. 不生成图片弹幕占位文本（会被 ImageDanmaku 变成 img） */
/* 拿一个原生条目当模板。我们自己插的条目带 ex-ms-item，必须排除，
   否则会越克隆越"自己的样子"。 */
let msChatTemplate = null;

function MergeDanmaku_getChatTemplate() {
  if (msChatTemplate && msChatTemplate.isConnected) return msChatTemplate;
  const list = document.getElementById("js-barrage-list");
  if (!list) return null;
  const nodes = list.children;
  for (let i = nodes.length - 1; i >= 0; i--) {
    const li = nodes[i];
    if (!li.classList || li.classList.contains("ex-ms-item")) continue;
    if (!li.classList.contains("Barrage-listItem")) continue;
    if (!li.querySelector(".Barrage-nickName") || !li.querySelector(".Barrage-content")) continue;
    msChatTemplate = li;
    return li;
  }
  return null;
}

function MergeDanmaku_chatAppend(item) {
  const list = document.getElementById("js-barrage-list");
  if (!list) return;
  // 距底 30px 内视为"用户在底部"，与原生判定阈值一致
  const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 30;
  const li = MergeDanmaku_buildChatItem(item);
  if (!li) return;
  list.appendChild(li);

  // 自己维护上限与滚底（原生清屏按它自己的 UUID 精确删除，不会动我们的节点）
  msMergeChatCount++;
  while (msMergeChatCount > MS_MERGE_CHAT_MAX && list.firstChild) {
    const first = list.firstChild;
    if (first.classList && first.classList.contains("ex-ms-item")) {
      first.remove();
      msMergeChatCount--;
    } else {
      break; // 遇到原生条目就停手，绝不动原生的节点
    }
  }
  if (atBottom) list.scrollTop = list.scrollHeight;
}

/* 克隆原生条目再填内容：样式、结构、字号、间距、点击命中全部跟着原生走，
   而不是自己拼一套看起来像的。装饰（等级徽章、粉丝勋章）属于模板原主人，
   照抄会张冠李戴，所以一并摘掉——宁可空着，也不假装是别人的身份。
   点击交互是原生在 #js-barrage-list 上做的**事件委托**，所以克隆件也照样能点开用户卡片。 */
function MergeDanmaku_buildChatItem(item) {
  const tpl = MergeDanmaku_getChatTemplate();
  if (!tpl) return MergeDanmaku_buildChatItemFallback(item);

  const li = tpl.cloneNode(true);
  li.className = String(li.className).indexOf("ex-ms-item") === -1 ? li.className + " ex-ms-item" : li.className;
  // 绝不带 is-self：BarrageSendCheck 以它为门槛比对回执，命中外房弹幕会被标删除线并污染熔断计数
  li.classList.remove("is-self");
  ["id", "data-guid", "data-uid"].forEach(function (a) {
    li.removeAttribute(a);
  });
  // 摘掉模板原主人的身份与装饰
  Array.prototype.forEach.call(
    li.querySelectorAll('[class*="is-self"],[class*="FansMedal"],[class*="Medal"],[class*="UserLevel"],[class*="RoomLevel"],[class*="Noble"]'),
    function (n) {
      n.remove();
    }
  );

  const nicks = li.querySelectorAll(".Barrage-nickName");
  const nick = nicks[0];
  if (nick) {
    nick.textContent = String(item.nn || "观众");
    nick.setAttribute("data-uid", String(item.uid || ""));
    nick.setAttribute("title", String(item.nn || ""));
  }
  if (nicks[1]) nicks[1].textContent = "：";   // 原生把冒号单独放在一个同名 span 里

  const content = li.querySelector(".Barrage-content");
  if (content) {
    content.textContent = String(item.text || "");
    content.style.color = item.color && item.color !== MS_MERGE_COLORS[0] ? item.color : "";
  }

  // 来源横条插在昵称之前，位置与飘屏一致
  const badge = document.createElement("span");
  badge.className = "ex-ms-badge ex-ms-badge--chat";
  badge.textContent = MergeDanmaku_badgeText(item.srcName);
  badge.title = String(item.srcName || "");
  const host = nick && nick.parentNode ? nick.parentNode : li.firstChild;
  if (host) host.insertBefore(badge, nick || host.firstChild);

  return li;
}

// 没有原生条目可克隆时的兜底（原生的清单还没渲染出来，通常是刚进直播间）
function MergeDanmaku_buildChatItemFallback(item) {
  const li = document.createElement("li");
  li.className = "Barrage-listItem ex-ms-item";
  const notice = document.createElement("div");
  notice.className = "Barrage-notice Barrage-notice--normalBarrage";
  const elems = document.createElement("div");
  elems.className = "Barrage-elements";

  const badge = document.createElement("span");
  badge.className = "ex-ms-badge ex-ms-badge--chat";
  badge.textContent = MergeDanmaku_badgeText(item.srcName);
  badge.title = String(item.srcName || "");

  const nick = document.createElement("span");
  nick.className = "Barrage-nickName Barrage-nickName--blue";
  nick.textContent = String(item.nn || "观众") + "：";

  const content = document.createElement("span");
  content.className = "Barrage-content";
  content.textContent = String(item.text || "");
  if (item.color && item.color !== MS_MERGE_COLORS[0]) content.style.color = item.color;

  elems.appendChild(badge);
  elems.appendChild(nick);
  elems.appendChild(content);
  notice.appendChild(elems);
  li.appendChild(notice);
  return li;
}

/* ---------- 调试与统计 ---------- */

window.MergeDanmaku_getStats = function () {
  return {
    pushed: msMergeStats.pushed,
    dropped: msMergeStats.dropped,
    noTrack: msMergeStats.noTrack,
    ready: !!(msMergeSpace && msMergeCtors.scroll),
    conns: msMergeConns.map(function (c) {
      return c.rid;
    })
  };
};
window.MergeDanmaku_push = MergeDanmaku_push;
window.MergeDanmaku_parseChatmsg = MergeDanmaku_parseChatmsg;
window.MergeDanmaku_badgeText = MergeDanmaku_badgeText;
window.MergeDanmaku_attachBadge = MergeDanmaku_attachBadge;
window.MergeDanmaku_bootstrap = MergeDanmaku_bootstrap;
window.MergeDanmaku_buildChatItem = MergeDanmaku_buildChatItem;
window.MergeDanmaku_buildCommentData = MergeDanmaku_buildCommentData;
