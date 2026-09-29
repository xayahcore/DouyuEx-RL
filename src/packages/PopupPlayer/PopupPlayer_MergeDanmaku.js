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
let msMergeHost = null;              // 播放器自己的弹幕组件实例（convertComment → cm.send 全管线）
let msMergeHostVia = null;           // 拿到它的方式："hook"（脚本钩子）/ "fiber"（运行时爬 React fiber）
let msMergeInstalled = false;
let msMergeConns = [];               // { rid, nn, ws }
let msMergeRate = { at: 0, count: 0 };
let msMergeStats = { pushed: 0, dropped: 0, noTrack: 0, viaBus: 0 };
let msMergeChatCount = 0;
let msMergePending = [];             // 引擎未就绪时的暂存（极短，通常几秒内就绪）

/* ---------- ① 脚本钩子 ---------- */

/* ---------- ① 脚本钩子：捕获播放器自己的构造入口与聊天总线 ---------- */
/*
 * 这一层是为"真正原生"准备的：贵族弹幕的渐变底、粉丝牌、等级图标这些**资产引用**
 * （extraData.leftPic / rightDynamicPic / jhsPic / dcallPic、nobleIcon、nobleColor…）
 * 都是由播放器组件读它自己的 props/state 与房间配置拼出来的，外部复刻不出来。
 *
 * 实测源码（firstqueue）里的原生发送序列就是：
 *     if (this.cm && this.props.isshow) { var r = this.convertComment(e); if (r) return !this.cm.send(r); }
 * 也就是说：**报文 → convertComment() → cm.send()** 就是全管线。
 * 于是只要捕获到那个组件实例（this），外房报文就能原样走同一条管线，
 * 类型选择、资产、颜色、贵族样式全部原生 —— 我们只额外塞两个来源标记进 extraData。
 *
 * 聊天区同理：aside 分块里 eb.subscribe("chatmsg", …) 的那个 eb 就是事件总线，
 * 把外房报文 publish 上去，聊天条目就由斗鱼自己的管线渲染（含勋章/等级/可点）。
 *
 * 两者都能在 document-start 装（脚本钩子的机制决定了），所以在 TM 里正常生效；
 * 在"产物后注入"的取证环境里装不上。
 * ⚠ 但**弹幕组件不必依赖脚本钩子**：它是 React 类组件，而弹幕层容器是 React 渲染的，
 * 于是运行时沿 React fiber 从容器往上爬就能拿到实例（实测 2 跳命中，见 MergeDanmaku_findHostByFiber）。
 * 脚本钩子只是更快、更早；两条路都拿不到时退回"自建数据喂引擎"那条。
 */
function initPkg_PopupPlayer_MergeDanmaku_ScriptHook() {
  scriptHook({
    url: "/firstqueue",
    callback: MergeDanmaku_patchFirstqueue
  });
  /* ⚠ 实测结论：**不要**拦截 /BarrageGroup。
     脚本钩子的机制是【拦下原 script 元素 → 异步取回内容 → 插入 inline 脚本代替】，
     而原始 script 元素的 onload 永远不会触发；aside 微前端的加载器在等它，于是
     **整个聊天区不初始化**（实测：聊天列表节点都不存在、聊天 0 条）。
     相比之下 /firstqueue 那条是项目长期在用的、播放器能容忍，所以只保留它。
     聊天区因此走【克隆原生条目 + 填真实资产】那条安全路径。 */
}

// 捕获弹幕组件实例：convertComment 是报文进管线的必经之处，this 就是那个组件
function MergeDanmaku_patchFirstqueue(content) {
  const anchor = /\.prototype\.convertComment\s*=\s*function\s*\(\s*(\w+)\s*\)\s*\{/;
  if (!anchor.test(content)) return content;
  if (content.indexOf("__ExDanmuHost") !== -1) return content;   // 幂等
  return content.replace(anchor, function (m, arg) {
    return m + "window.__ExDanmuHost=this;";
  });
}

// 捕获聊天事件总线：把 subscribe("chatmsg") 的持有者暴露出来。
// ⚠ 仅留档：实测拦截 /BarrageGroup 会让聊天区整个不初始化，因此**不注册**这条钩子。
// 运行时那条 chatViaBus 路径保留着：万一将来有安全的捕获方式，它就能直接生效。
function MergeDanmaku_patchBarrageGroup(content) {
  const anchor = /(\w+)\.subscribe\(\s*"chatmsg"/;
  if (!anchor.test(content)) return content;
  if (content.indexOf("__ExChatBus") !== -1) return content;     // 幂等
  return content.replace(anchor, function (m, holder) {
    // 用**独立语句**插入，不要包括号：原始上下文里 E.subscribe(...) 的右括号只闭合 subscribe 自己，
    // 包一层左括号就会缺一个右括号（离线校验直接报 Unexpected token）。
    return "window.__ExChatBus=" + holder + ";" + m;
  });
}

/* ---------- ② 运行时自举：拿到原生引擎的 space 与渲染器 ---------- */
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
  // ① 引擎本体：必须同时拿到 space 与 **scroll 类型**的弹幕类。
  // 若只按 space 判就绪，第一条恰好是 fans/noble 之类的弹幕就会提前收工，
  // 之后永远补不到 scroll 的构造器（实测踩过）。
  if (!msMergeSpace || !msMergeCtors.scroll) {
    // 一次采样**尽量把屏幕上所有飘屏节点都悬停一遍**：只挑最后一个的话，
    // 若那一条恰好不是普通滚动弹幕（fans/贵族等），就永远补不齐 scroll 类型
    // 的构造器 —— 实测在弹幕稀疏时会一直 ready 不了。
    const nodes = MergeDanmaku_findDanmakuNodes();
    if (!nodes.length) return false;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node.comment) {
        // 引擎的悬停处理器里有 event.target.comment = comment，派发一次就能拿到实例
        ["mouseover", "mouseout"].forEach(function (t) {
          if (node.comment) return;
          try {
            node.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
          } catch (e) {
            try { node.dispatchEvent(new Event(t, { bubbles: true })); } catch (e2) {}
          }
        });
      }
      const cm = node.comment;
      if (!cm || !cm.space || typeof cm.space.addComment !== "function") continue;
      msMergeSpace = cm.space;
      if (cm.data && cm.data.type && typeof cm.constructor === "function") msMergeCtors[cm.data.type] = cm.constructor;
      MergeDanmaku_wrapRenderer();
      if (msMergeCtors.scroll) break;
    }
    if (!msMergeSpace) return false;
    if (!msMergeCtors.scroll) return false;   // 还差一条普通滚动弹幕，下一轮继续
    MergeDanmaku_flushPending();
    console.log("[DouyuEx] 多屏弹幕合并已接入原生引擎");
  }
  return true;
}

function MergeDanmaku_findDanmakuNodes() {
  const out = [];
  const nodes = document.querySelectorAll('[class*="danmuItem"]');
  for (let i = 0; i < nodes.length; i++) {
    // 只认真在飘的（宽 0 的是刚要销毁的）
    try {
      if (nodes[i].getBoundingClientRect().width > 0) out.push(nodes[i]);
    } catch (e) {}
  }
  return out;
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
  // 两件事各自重试：① 原生引擎本体（space + scroll 类）② 播放器自己的弹幕组件。
  // ②拿不到不算失败 —— 外房弹幕退回自建数据上屏（颜色与来源横条照旧），
  // 所以轮询只在"两件都拿到"或"等够了"时停。
  const tick = function () {
    const engineReady = MergeDanmaku_bootstrap();
    const hostReady = !!MergeDanmaku_getHost();
    msBootTries++;
    if ((engineReady && hostReady) || msBootTries >= MS_BOOTSTRAP_MAX_TRIES) {
      clearInterval(msBootTimer);
      msBootTimer = 0;
      // 引擎接上了、播放器自己的管线没接上：留一条线索，别让它静默降级
      if (engineReady && !hostReady) {
        console.warn("[DouyuEx] 未能接入播放器自己的弹幕管线（React fiber 上溯失败），" +
          "外房弹幕暂按自建数据上屏：颜色与来源横条正常，粉丝牌/等级/贵族底不显示。");
      }
    }
  };
  tick();
  msBootTimer = setInterval(tick, MS_BOOTSTRAP_POLL_MS);
}

/* ---------- ②b 运行时抓取"播放器自己的弹幕组件" ---------- */
/*
 * 为什么能抓到：那个组件（原型上有 convertComment / dataHandle）是 **React 类组件**，
 * 而弹幕层容器是 React 渲染出来的 —— 容器节点上挂着 __reactFiber$… / __reactInternalInstance$…，
 * 沿 fiber 的 return 链往上走，stateNode 上带 convertComment 的那个就是它。
 * 实测（2288 房间）：从容器出发 **2 跳**命中，实例上 cm / cmdiv 都在。
 *
 * 锚点用**引擎自己持有的容器**（space._renderer.dom）而不是类名：
 * 类名是构建期哈希（danmu-fbb2a3 这种），斗鱼一发版就变；容器是引擎传进渲染器的，永远指对。
 * 引擎容器还没拿到时，退回"拿一个正在飘的弹幕节点，从它的 React 宿主祖先往上爬"。
 */
const MS_HOST_FIBER_MAX_HOPS = 120;   // 实测 2 跳命中，留足余量防将来层级变深

function MergeDanmaku_walkFiberForHost(el) {
  if (!el || el.nodeType !== 1) return null;
  // ① 先沿 DOM 往上找最近的 React 宿主节点：引擎自己造的弹幕节点没有 fiber 键
  let cur = el;
  let key = null;
  let anchor = null;
  while (cur && cur !== document.documentElement) {
    const keys = Object.keys(cur);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (k.indexOf("__reactFiber$") === 0 || k.indexOf("__reactInternalInstance$") === 0) {
        key = k;
        anchor = cur;
        break;
      }
    }
    if (key) break;
    cur = cur.parentElement;
  }
  if (!key) return null;
  // ② 再沿 fiber 上溯找组件实例。cm 必须一并就位 —— 只有 convertComment 没有 cm 的
  //    不是我们要的那个组件（投递时要用它的 cm.send）
  let fiber = anchor[key];
  let hops = 0;
  while (fiber && hops < MS_HOST_FIBER_MAX_HOPS) {
    const sn = fiber.stateNode;
    if (sn && typeof sn === "object" && typeof sn.convertComment === "function" && sn.cm) return sn;
    fiber = fiber.return;
    hops++;
  }
  return null;
}

function MergeDanmaku_findHostByFiber() {
  const seeds = [];
  const rd = msMergeSpace && msMergeSpace._renderer;
  if (rd && rd.dom) seeds.push(rd.dom);
  MergeDanmaku_findDanmakuNodes().forEach(function (n) {
    seeds.push(n);
  });
  for (let i = 0; i < seeds.length; i++) {
    const host = MergeDanmaku_walkFiberForHost(seeds[i]);
    if (host) return host;
  }
  return null;
}

/* 取"播放器自己的管线"。优先级：
 *   ① 脚本钩子捕获的 __ExDanmuHost（TM document-start 时最早、最稳）
 *   ② 运行时爬 React fiber 拿到的实例（不依赖 document-start，取证环境也能用）
 *   ③ 都没有 → null，调用方退回自建数据那条路
 */
function MergeDanmaku_getHost() {
  const W = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  const hooked = W.__ExDanmuHost;
  if (hooked && typeof hooked.convertComment === "function" && hooked.cm) {
    msMergeHost = hooked;
    msMergeHostVia = "hook";
    return msMergeHost;
  }
  if (msMergeHost && typeof msMergeHost.convertComment === "function" && msMergeHost.cm) return msMergeHost;
  msMergeHost = MergeDanmaku_findHostByFiber();
  msMergeHostVia = msMergeHost ? "fiber" : null;
  if (msMergeHost) console.log("[DouyuEx] 已接入播放器自己的弹幕管线（粉丝牌/等级/贵族样式走原生）");
  return msMergeHost;
}

/* ---------- ② 页面侧钩子（在页面上下文被调用） ---------- */

function initPkg_PopupPlayer_MergeDanmaku() {
  if (msMergeInstalled) return;
  msMergeInstalled = true;
  const W = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  /* 诊断入口必须挂到**页面 window**：TM 沙箱里 window.* 只在脚本自己的作用域里可见，
    用户在页面控制台里读不到（实测：沙箱里是 function、页面控制台是 undefined），
    而排障话术是"控制台执行 MergeDanmaku_getStats()"。
    ⚠ 必须挂在这里而不是模块顶层：同一句放在顶层实测**不生效**（页面 window 上连属性都没有），
    放到 init 阶段就生效 —— 与本文件里 __onDouyuExDanmakuRendered 的做法一致。 */
  W.MergeDanmaku_getStats = window.MergeDanmaku_getStats;
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
  // 聊天区：原生渲染出来的条目要补来源横条，挂 childList 观察（列表可能还没渲染出来）
  MergeDanmaku_startChatWatch();
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
  if (src) { MergeDanmaku_attachBadge(cm, src); return; }
  /* 走原生总线注入的弹幕身上没有我们的标记（它和真报文同路），
     所以按 (uid + 文本) 认领；表情码/转义导致文本对不上时，退化成"同 uid 且 3 秒内"。 */
  const uid = cm.data.extraData && cm.data.extraData.uid;
  const text = String(cm.data.text || "");
  if (!uid) return;
  let hit = MergeDanmaku_claimInjected("danmaku", function (x) { return x.uid === String(uid) && x.text === text; });
  if (!hit) {
    const now = Date.now();
    hit = MergeDanmaku_claimInjected("danmaku", function (x) { return x.uid === String(uid) && now - x.at < 3000; });
  }
  if (hit && hit.srcName) MergeDanmaku_attachBadge(cm, hit.srcName);
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

/* ---------- ③b 把外房报文推回斗鱼自己的 socket 数据总线（首选路径） ---------- */
/*
 * ★ 2026-09-29 实机打通：聊天区与飘屏都能 100% 走原生渲染，不再需要"克隆条目 + 自己拼 DOM"。
 *
 * 抓手是页面自己的 `socketProxy.socketStream`（斗鱼房间侧的公开全局，项目里
 * ExpandTool_Treasure 已经在用 `socketProxy.socketStream.subscribe(...)` 拿宝藏列表）。
 * 它是 SocketData：
 *     push(报文) → decoder(报文) → 按 type 取 channel → channel.next(解析后的对象)
 *                → 同时扇出到 globalStreamKey 那条全局通道
 * 也就是说 **push 就是"一条报文进入原生管线"的入口**，所有订阅者（聊天区、飘屏引擎、
 * 以及其它任何订阅者）都会收到，和真的从服务器收到一条报文**完全同路**。
 *
 * 实测（2288 房间）：
 *   · 传原始 STT 字符串即可（decoder 里 "string"===typeof e ? 解析 : 原样），无需自己造二进制帧；
 *   · 外房 rid 不会被过滤，聊天区照常渲染（含原生颜色类 Barrage-content--colorN、
 *     原生等级图标、原生 dy-fan-medal、data-uid / data-chatid 齐全 → 点用户能开原生面板）；
 *   · 连续 200ms 一条、同 uid 连发都能正常上屏（原生自己会合并同用户的连续条目）。
 *
 * ⚠ 早先试过"往页面自己的 WebSocket 上 dispatch 合成 message 事件"：能成，但必须自己造
 * 二进制分帧（[L][L][690][0][payload][NUL]，L = 载荷字节数 + 9），长度算错就会让原生解析器
 * 错位、**只有第一条能渲染**。push 这条没有分帧问题，所以首选它。
 */
function MergeDanmaku_getStream() {
  const W = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  const sp = W.socketProxy;
  const ss = sp && sp.socketStream;
  return (ss && typeof ss.push === "function") ? ss : null;
}

/* 注入队列：报文是从原生总线进去的，出来的弹幕/聊天条目上**没有我们的标记**，
   所以用 (cid) 或 (uid + 文本) 去认领，认领即消费，避免二次匹配。 */
let msInjectQueue = [];
const MS_INJECT_TTL_MS = 20000;

function MergeDanmaku_rememberInjected(item) {
  const now = Date.now();
  msInjectQueue.push({
    uid: String(item.uid || ""),
    text: String(item.text || ""),
    cid: String(item.cid || ""),
    srcName: item.srcName || "",
    at: now
  });
  msInjectQueue = msInjectQueue.filter(function (x) {
    return now - x.at < MS_INJECT_TTL_MS;
  });
  if (msInjectQueue.length > 120) msInjectQueue = msInjectQueue.slice(-120);
}

/* 一条注入消息会同时产出**两条原生结果**：聊天区一条 + 飘屏一条。
   所以认领按"用途"分开记：chat 与 danmaku 各自只认一次，互不吃掉名额；
   同一用途不会被二次匹配（避免把同 uid 同文本的别的消息误贴成外房来源）。 */
function MergeDanmaku_claimInjected(kind, match) {
  const now = Date.now();
  for (let i = 0; i < msInjectQueue.length; i++) {
    const x = msInjectQueue[i];
    if (now - x.at > MS_INJECT_TTL_MS) continue;
    if (x[kind]) continue;
    if (!match(x)) continue;
    x[kind] = true;
    return x;
  }
  return null;
}

/* 把外房报文推回原生总线。返回 true = 已由原生管线接管（飘屏 + 聊天区都不需要我们再动手）。 */
function MergeDanmaku_injectNative(item) {
  const ss = MergeDanmaku_getStream();
  if (!ss || !item || !item.packet) {
    MergeDanmaku_warnNoStream();
    return false;
  }
  /* ⚠ 顺序必须是"先记账再 push"：push 是**同步扇出**（decoder → channel.next → 订阅者立刻渲染），
     记账放在后面的话，飘屏渲染时队列还是空的 → 认领不到来源（实测踩过：只有 3/13 条贴上横条）。 */
  MergeDanmaku_rememberInjected(item);
  try {
    ss.push(item.packet);
    msMergeStats.viaBus++;
    return true;
  } catch (e) {
    // push 抛错（报文畸形等）→ 撤回刚记的账，退回自建那条路，别让队列留下会误贴的条目
    if (msInjectQueue.length) msInjectQueue.pop();
    return false;
  }
}

/* 拿不到总线时只告警一次：这条退回路径外观接近原生但不是原生（资产/颜色/点击会有差距），
   静默降级会让人误判成"功能就是这样"。排障入口：MergeDanmaku_getStats().stream / viaBus。 */
let msWarnedNoStream = false;
function MergeDanmaku_warnNoStream() {
  if (msWarnedNoStream) return;
  msWarnedNoStream = true;
  console.warn("[DouyuEx] 未拿到 socketProxy.socketStream，外房弹幕暂按「自建数据 + 克隆条目」上屏（不是原生渲染）。" +
    "常见原因是此刻页面还没初始化完（实测该全局比播放器容器晚约 4 秒出现）—— 之后会自动切回原生，无需干预。");
}

/* ---------- ③c 给"原生渲染出来的"聊天条目补来源横条 ---------- */
/*
 * 条目本身是斗鱼自己渲染的（资产/颜色/点击全原生），我们只往昵称前面插一个小横条。
 * 认领靠 data-chatid（= 报文的 cid）精确匹配，退化用 (uid + 文本)。
 */
let msChatObserver = null;
let msChatWatchTimer = 0;

/* 聊天列表不一定在脚本初始化时就存在（它是 aside 微前端渲染出来的），按项目惯例轮询等待。 */
function MergeDanmaku_startChatWatch() {
  if (msChatObserver || msChatWatchTimer) return;
  if (MergeDanmaku_watchChatList()) return;
  let tries = 0;
  msChatWatchTimer = setInterval(function () {
    tries++;
    if (MergeDanmaku_watchChatList() || tries >= 60) {
      clearInterval(msChatWatchTimer);
      msChatWatchTimer = 0;
    }
  }, 1000);
}

function MergeDanmaku_watchChatList() {
  if (msChatObserver) return true;
  const list = document.getElementById("js-barrage-list");
  if (!list) return false;   // 聊天区还没渲染出来，由自举轮询继续等
  msChatObserver = new MutationObserver(function (muts) {
    for (let i = 0; i < muts.length; i++) {
      const added = muts[i].addedNodes;
      for (let j = 0; j < added.length; j++) {
        const n = added[j];
        if (n && n.nodeType === 1 && n.tagName === "LI") {
          try { MergeDanmaku_badgeNativeChatItem(n); } catch (e) {}
        }
      }
    }
  });
  msChatObserver.observe(list, { childList: true });
  return true;
}

function MergeDanmaku_badgeNativeChatItem(li) {
  if (!li || li.querySelector(".ex-ms-badge--chat")) return;
  const content = li.querySelector("[data-chatid]") || li.querySelector('[class*="Barrage-content"]');
  const cid = content ? content.getAttribute("data-chatid") : null;
  const nick = li.querySelector('[class*="Barrage-nickName"]');
  const uid = nick ? nick.getAttribute("data-uid") : null;
  const text = content ? String(content.textContent || "").trim() : "";
  let hit = cid ? MergeDanmaku_claimInjected("chat", function (x) { return x.cid && x.cid === cid; }) : null;
  if (!hit && uid) {
    hit = MergeDanmaku_claimInjected("chat", function (x) { return x.uid === String(uid) && x.text === text; });
  }
  if (!hit || !hit.srcName) return;
  const badge = document.createElement("span");
  badge.className = "ex-ms-badge ex-ms-badge--chat";
  badge.textContent = MergeDanmaku_badgeText(hit.srcName);
  badge.title = String(hit.srcName);
  const host = nick && nick.parentNode ? nick.parentNode : li.firstChild;
  if (host) host.insertBefore(badge, nick || host.firstChild);
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
    cid: getFieldValue(ret, "cid"),
    // 清洗过的原始报文：走原生总线时原样推回去（字段顺序、转义都由斗鱼自己处理）
    packet: ret,
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
  /* 首选：把原始报文推回斗鱼自己的 socket 总线 —— 飘屏与聊天区都由原生管线渲染
     （原生资产、原生颜色、原生点击都在；我们只补一条来源横条）。 */
  if (MergeDanmaku_injectNative(item)) {
    msMergeStats.pushed++;
    return true;
  }
  /* 退回（拿不到 socketProxy.socketStream 时）：自建数据喂引擎 + 克隆原生条目。 */
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
  // 首选：播放器自己的管线（convertComment → cm.send）。类型选择与全部资产都由它自己算，
  // 贵族渐变底、粉丝牌、等级图标这些外部复刻不出来的东西全靠这条。
  const native = MergeDanmaku_feedViaHost(item);
  if (native !== null) return native;
  // 退回：我们自己按原生字段名构造后喂引擎（资产会少一些，但颜色与来源标记是对的）
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

/* 走播放器自己的管线。返回 true/false 表示"已由原生管线处理"，
   返回 null 表示原生组件还没捕获到（此时退回自建数据那条路）。 */
function MergeDanmaku_feedViaHost(item) {
  const host = MergeDanmaku_getHost();
  if (!host) return null;
  const raw = item.raw;
  if (!raw) return null;
  try {
    const data = host.convertComment(raw);
    if (!data) return false;                       // 原生自己也判定这条不该显示
    if (!data.extraData) data.extraData = {};
    // 只加来源标记：渲染钩子靠它贴来源横条；主房弹幕没有这两个字段，所以不会被贴
    data.extraData.exMsSrcRid = String(item.srcRid);
    data.extraData.exMsSrcName = item.srcName;
    /* ⚠ 返回值语义（实测源码 + 实机双向确认）：cm.send → sendSync → **返回 space.addComment 的结果**，
       也就是 **true = 真的上屏了**，false = 没上去（无空轨 / 自适应丢弃 / 类型不支持）。
       这里早先写成 `!send`，把成功记成失败 —— 表现为 pushed 恒为 0（实机验证时抓出来的）。 */
    const ok = host.cm.send(data);
    if (!ok) msMergeStats.noTrack++;
    return !!ok;
  } catch (e) {
    return null;                                    // 原生管线出错就退回自建那条，别把弹幕弄丢
  }
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

/* ★ 首选路径已换成"把报文推回斗鱼自己的 socket 总线"（见 ③b）：条目由斗鱼自己渲染，
   资产/颜色/点击全原生，我们只在昵称前补一条来源横条（见 ③c）。
   下面这一整段（克隆原生条目 + 填资产 + 滚底）是**拿不到 socketProxy.socketStream 时的退回路径**，
   仍然保留：它保证"最差情况下外房弹幕也能进聊天区"。

   聊天区 ul#js-barrage-list 虽是 React 渲染，但条目全部由原生队列命令式写入
   （appendChild + innerHTML），React 不 reconcile 子节点，所以我们的插入不会被冲掉。
   三个必须遵守的副作用约束：
     1. 绝不能加 is-self —— BarrageSendCheck 以 is-self 为门槛比对回执，
        命中外房弹幕会被标删除线 +「(可能发送失败)」+ 污染熔断计数
     2. 插入后若本来就在底部，必须同步滚底 —— 否则 scrollHeight 变大触发原生
        "离底 > 30px" 判定，进锁屏态并开始显示"有 N 条新消息"
     3. 不生成图片弹幕占位文本（会被 ImageDanmaku 变成 img） */
/* 走聊天总线：aside 的聊天管理器订阅的是 chatmsg，把外房报文原样 publish 上去，
   条目就由斗鱼自己渲染 —— 粉丝牌、等级、昵称配色、点击全部原生，我们一行 DOM 都不用拼。
   总线实例由脚本钩子在 document-start 捕获（__ExChatBus）；发布方法名各版本可能不同，
   这里按常见命名依次尝试，都不存在就返回 false 退回克隆那条路。
   ⚠ 这条（拦 /BarrageGroup 抓总线）实测会让聊天区整个不初始化，所以钩子**不注册**，
   这段只在万一将来 __ExChatBus 存在时才动作。 */
const MS_BUS_PUBLISH_METHODS = ["publish", "trigger", "emit", "dispatch", "next", "fire"];

function MergeDanmaku_chatViaBus(item) {
  const W = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  const bus = W.__ExChatBus;
  if (!bus || !item.raw) return false;
  let fn = null;
  for (let i = 0; i < MS_BUS_PUBLISH_METHODS.length; i++) {
    const m = MS_BUS_PUBLISH_METHODS[i];
    if (typeof bus[m] === "function") { fn = bus[m]; break; }
  }
  if (!fn) return false;
  try {
    const payload = item.raw;
    if (!payload.type) payload.type = "chatmsg";
    // 来源标记塞进报文本身，克隆兜底那条路读的就是它
    payload.__exMsSrcRid = String(item.srcRid);
    payload.__exMsSrcName = item.srcName;
    fn.call(bus, "chatmsg", payload);
    msMergeStats.viaBus = (msMergeStats.viaBus || 0) + 1;
    return true;
  } catch (e) {
    return false;
  }
}

/* 拿一个原生条目当模板。我们自己插的条目带 ex-ms-item，必须排除，
   否则会越克隆越"自己的样子"。 */
let msChatTemplate = null;
let msChatSeq = 0;

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
  // 首选：把报文 publish 到斗鱼自己的事件总线，由它自己的管线渲染条目（含勋章/等级/可点）
  if (MergeDanmaku_chatViaBus(item)) return;
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
  // 身份标识必须**给新的**而不是删掉：原生在 #js-barrage-list 上的事件委托要靠
  // 条目的 id / data-guid 与昵称上的 data-uid 去组装用户卡片上下文，
  // 早先我把它们一并删掉，结果就是"聊天区点用户没反应"。
  const guid = "exms-" + String(item.srcRid) + "-" + String(item.uid || "0") + "-" + (++msChatSeq);
  li.setAttribute("id", guid);
  li.setAttribute("data-guid", guid);
  // 先摘掉模板原主人的身份与装饰（下面按外房用户的真实数据重建）
  Array.prototype.forEach.call(li.querySelectorAll('[class*="is-self"]'), function (n) {
    n.remove();
  });
  MergeDanmaku_fillChatAssets(li, item);

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

/* 把等级徽章与粉丝牌按**外房用户自己的真实数据**填进克隆件。
   两处结构都是实机摸出来的原生结构，所以直接用原生写法构造，而不是自己画一个像的：
     等级：<span class="js-user-level UserLevel" title="用户等级：N"
             style="background-image:url(.../userLevelIconV6/web-light/newm3_lvN.png?v=1.2)">
     粉丝牌：<a class="FansMedalWrap js-fans-dysclick" data-rid=主播房号>
               <dy-fan-medal medal-name=勋章名 medal-level=勋章等级 medal-id=主播房号 …></a>
   dy-fan-medal 是斗鱼自己注册的自定义元素（页面里已定义），只要属性给对，它会自己渲染成原生样式。
   外房用户没有该项时就把对应节点删掉 —— 绝不能留着模板原主人的，那会张冠李戴。 */
function MergeDanmaku_fillChatAssets(li, item) {
  const raw = item.raw || {};
  const level = parseInt(raw.level, 10) || 0;
  const lvlEl = li.querySelector('[class*="UserLevel"]');
  if (lvlEl) {
    if (level > 0) {
      lvlEl.setAttribute("title", "用户等级：" + level);
      lvlEl.style.backgroundImage =
        'url("https://shark2.douyucdn.cn/front-publish/static-file-master/userLevelIconV6/web-light/newm3_lv' +
        level + '.png?v=1.2")';
      lvlEl.style.display = "";
    } else {
      lvlEl.remove();
    }
  }

  // 粉丝牌：字段名取自斗鱼 chatmsg（bnn=勋章名 bl=勋章等级 brid=主播房号）
  const medalName = String(raw.bnn || "");
  const medalLevel = parseInt(raw.bl, 10) || 0;
  const medalRid = String(raw.brid || raw.brid2 || "");
  const wrap = li.querySelector('[class*="FansMedalWrap"]') || li.querySelector('[class*="Medal"]');
  const oldMedal = li.querySelector("dy-fan-medal");
  const hasMedal = !!(medalName && medalLevel > 0 && medalRid);
  if (hasMedal) {
    let host = wrap;
    if (!host) {
      host = document.createElement("a");
      host.className = "FansMedalWrap js-fans-dysclick";
      host.setAttribute("href", "javascript:void(0);");
      const first = lvlEl && lvlEl.parentNode ? lvlEl.nextSibling : li.firstChild;
      if (first && first.parentNode) first.parentNode.insertBefore(host, first);
      else if (li.firstChild) li.insertBefore(host, li.firstChild);
    }
    host.setAttribute("data-rid", medalRid);
    if (oldMedal) oldMedal.remove();
    const med = document.createElement("dy-fan-medal");
    med.setAttribute("medal-name", medalName);
    med.setAttribute("medal-level", String(medalLevel));
    med.setAttribute("medal-id", medalRid);
    if (raw.bnnSuffix) med.setAttribute("medal-suffix", String(raw.bnnSuffix));
    host.appendChild(med);
  } else {
    // 没有粉丝牌就整块摘掉，不留别人的
    if (oldMedal) oldMedal.remove();
    if (wrap && wrap.querySelectorAll("dy-fan-medal").length === 0) wrap.remove();
  }
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
    // viaBus = 走斗鱼自己的 socket 总线（原生渲染）的条数；剩余的是退回自建数据那条路的
    viaBus: msMergeStats.viaBus,
    // stream = 此刻是否拿得到原生总线（false 时新消息会退回克隆路径；页面初始化完会自动变 true）
    stream: !!MergeDanmaku_getStream(),
    ready: !!(msMergeSpace && msMergeCtors.scroll),
    // host = 是否接上了播放器自己的管线（原生资产）；via 是接上的方式：
    //   "hook" 脚本钩子（document-start）/ "fiber" 运行时爬 React fiber / null 没接上
    host: !!msMergeHost,
    hostVia: msMergeHostVia,
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
window.MergeDanmaku_patchFirstqueue = MergeDanmaku_patchFirstqueue;
window.MergeDanmaku_patchBarrageGroup = MergeDanmaku_patchBarrageGroup;
window.MergeDanmaku_feedViaHost = MergeDanmaku_feedViaHost;
window.MergeDanmaku_getHost = MergeDanmaku_getHost;
window.MergeDanmaku_findHostByFiber = MergeDanmaku_findHostByFiber;
window.MergeDanmaku_walkFiberForHost = MergeDanmaku_walkFiberForHost;
window.MergeDanmaku_getStream = MergeDanmaku_getStream;
window.MergeDanmaku_injectNative = MergeDanmaku_injectNative;
window.MergeDanmaku_badgeNativeChatItem = MergeDanmaku_badgeNativeChatItem;
window.MergeDanmaku_watchChatList = MergeDanmaku_watchChatList;
