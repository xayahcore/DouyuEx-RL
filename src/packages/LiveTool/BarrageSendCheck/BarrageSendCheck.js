/* ==================== 弹幕发送成功与系统屏蔽词检测（原作者单槽算法 + 加固） ==================== */
/*
 * 算法来源：原作者 小淳 的 myLastBarrage 单槽比对法（c01f090 版本）。
 *
 * 原理：_Handle 只记录"最近一条属于自己的原始报文"；当聊天区新增自身弹幕节点时，
 *       防抖后把该节点文本与最近回执文本比对，不一致即判定为发送失败/被系统屏蔽。
 *
 * 相比旧版"pending 队列 + 逐条超时确认"的关键优势：
 *   斗鱼在发送弹幕时会先乐观插入节点，服务端回执到达后还可能重渲染产生第二个同文本节点。
 *   单槽算法下两个节点都会与同一份回执文本比对并同时通过，天然免疫该场景导致的误判。
 *
 * 加固项：
 *   1. 自弹幕识别优先用 uid 精确匹配，昵称归一化匹配次之，最后才用原作者宽松包含兜底；
 *   2. 回执文本经 stt_unescape 反转义（@S→/、@A→@）后再比对；
 *   3. 剥离图片弹幕占位符；
 *   4. 只要尚未收到过任何自身回执，一律不做判定（宁可不报，绝不误报）；
 *   5. 熔断保护：连续跟踪到自身弹幕却始终零回执时整体停用检测，杜绝全量误判；
 *   6. 迟到回执自愈：回执到达后自动撤销已误标的删除线与提示标签。
 */

let myLastBarrage = ""; // 最近一条属于自己的原始弹幕报文
let barrageSendCheckTimer = 0;
let selfNodeTrackedCount = 0;
let firstSelfNodeAt = 0;
let barrageCheckDisabled = false;
let barrageCheckNoticeShown = false;

// 判定防抖延时(ms)：需留出服务端回执在网络上的往返时间
const BARRAGE_CHECK_DELAY = 400;
// 熔断阈值：跟踪到自身弹幕达到该数量且始终零回执，则停用检测
const BARRAGE_BREAKER_MIN_NODES = 5;
const BARRAGE_BREAKER_MIN_MS = 5000;

// 锚定字段边界取值，避免 nn@= 误命中 bnn@=（粉丝牌名称）
function getFieldValue(raw, key) {
  if (!raw) return "";
  let m = String(raw).match(new RegExp("(?:^|/)" + key + "@=([^/]*)"));
  return m ? m[1] : "";
}

// 昵称归一化：去除尾部装饰性冒号与多余空白
function normalizeNick(s) {
  return String(s || "").replace(/[：:]+$/g, "").replace(/\s+/g, " ").trim();
}

// 弹幕文本归一化：剥离图片弹幕占位符并压缩空白
function normalizeDanmakuText(s) {
  return String(s || "").replace(/\[DouyuEx图片[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
}

// 判断报文是否属于自己发送
function isSelfChatmsg(text) {
  if (!text) return false;

  let uid = getFieldValue(text, "uid");
  if (my_uid && uid && String(uid) === String(my_uid)) return true;

  let nn = getFieldValue(text, "nn");
  if (myName && nn && normalizeNick(nn) === normalizeNick(myName)) return true;

  // 原作者兜底：原始报文宽松包含（要求昵称足够长，降低被他人弹幕内容误命中的概率）
  if (myName && myName.length >= 3 && text.indexOf(myName) !== -1) return true;

  return false;
}

// 从原始报文中提取回执文本（反转义 + 归一化）
function extractEchoText(rawPacket) {
  if (!rawPacket) return "";

  let txt = "";
  if (typeof stt_deserialize === "function") {
    let data = stt_deserialize(rawPacket);
    if (data && !Array.isArray(data) && typeof data.txt === "string") {
      txt = data.txt;
    }
  }
  if (!txt) {
    txt = getFieldValue(rawPacket, "txt");
    if (typeof stt_unescape === "function") txt = stt_unescape(txt);
  }

  return normalizeDanmakuText(txt);
}

// 迟到回执自愈：撤销此前误标的删除线与提示标签
function healDanmakuFailedMark(echoText) {
  if (!echoText) return;
  let tips = document.querySelectorAll(".ex-danmaku-blocked-tip");
  for (let i = 0; i < tips.length; i++) {
    let tip = tips[i];
    let contentEl = tip.previousSibling;
    if (!contentEl || contentEl.nodeType !== 1) continue;
    if (normalizeDanmakuText(contentEl.innerText || contentEl.textContent) !== echoText) continue;

    contentEl.style.textDecoration = "";
    contentEl.style.textDecorationLine = "";
    contentEl.style.textDecorationColor = "";
    if (tip.parentNode) tip.parentNode.removeChild(tip);
  }
}

// 记录自身弹幕回执
function recordSelfEcho(text) {
  myLastBarrage = text;
  healDanmakuFailedMark(extractEchoText(text));
}

function markDanmakuFailed(node, contentEl) {
  if (!contentEl || !contentEl.parentNode) return;

  contentEl.style.textDecoration = "line-through gray 1px";
  contentEl.style.textDecorationLine = "line-through";
  contentEl.style.textDecorationColor = "gray";

  if (node.querySelector(".ex-danmaku-blocked-tip")) return;

  let tip = document.createElement("span");
  tip.className = "ex-danmaku-blocked-tip";
  tip.textContent = "(可能发送失败)";
  tip.style.marginLeft = "4px";
  tip.style.color = "gray";
  tip.style.fontSize = "9px";
  tip.style.cursor = "pointer";
  tip.title = "该条弹幕发送失败/可能被系统屏蔽，不会被其他人看到（可能会误判）";

  contentEl.parentNode.insertBefore(tip, contentEl.nextSibling);
}

function checkAndTrackSelfDanmu(node) {
  if (barrageCheckDisabled) return;
  if (!node || node.nodeType !== 1) return;

  let hasSelf = node.classList.contains("is-self") || node.querySelector(".is-self");
  if (!hasSelf) return;

  let contentEl = node.classList.contains("Barrage-content") ? node : node.querySelector(".Barrage-content");
  if (!contentEl) return;

  let localText = normalizeDanmakuText(contentEl.innerText || contentEl.textContent);
  if (!localText) return;

  // 从 DOM 兜底补全自身昵称（去除装饰性冒号）
  let nickEl = node.querySelector(".Barrage-nickName.is-self") || node.querySelector(".Barrage-nickName") || node.querySelector(".is-self");
  let domNick = nickEl ? normalizeNick(nickEl.innerText || nickEl.textContent) : "";
  if (domNick && !myName) myName = domNick;

  selfNodeTrackedCount++;
  if (!firstSelfNodeAt) firstSelfNodeAt = Date.now();

  // 熔断保护：持续跟踪到自身弹幕却始终收不到回执，说明检测链路不可用
  if (!myLastBarrage && selfNodeTrackedCount >= BARRAGE_BREAKER_MIN_NODES && (Date.now() - firstSelfNodeAt) > BARRAGE_BREAKER_MIN_MS) {
    barrageCheckDisabled = true;
    if (!barrageCheckNoticeShown) {
      barrageCheckNoticeShown = true;
      if (typeof showMessage === "function") {
        showMessage("【弹幕发送检测】长时间未收到自身弹幕回执，已自动停用检测以避免误判", "error");
      }
    }
    return;
  }

  clearTimeout(barrageSendCheckTimer);
  barrageSendCheckTimer = setTimeout(function () {
    if (barrageCheckDisabled) return;
    // 尚未收到任何自身回执 → 无法判定，宁可不报也绝不误报
    if (!myLastBarrage) return;

    let echoText = extractEchoText(myLastBarrage);
    if (!echoText) return;
    if (echoText === localText) return; // 回执文本一致 = 发送成功

    markDanmakuFailed(node, contentEl);
  }, BARRAGE_CHECK_DELAY);
}

// 主长连接旁路广播通道（rank_engine 在页面主上下文注入）
function handleChatmsgPacket(msg) {
  if (!msg || typeof msg !== "string") return;
  if (msg.indexOf("type@=chatmsg") === -1) return;
  if (!isSelfChatmsg(msg)) return;
  recordSelfEcho(msg);
}

function initPkg_LiveTool_BarrageSendCheck() {
  // 双通道接收：主长连接广播 + 免登录代理连接（LiveTool.js 的 Ex_WebSocket_UnLogin）
  window.__onDouyuExChatmsg = handleChatmsgPacket;
  try {
    if (typeof unsafeWindow !== "undefined" && unsafeWindow) {
      unsafeWindow.__onDouyuExChatmsg = handleChatmsgPacket;
    }
  } catch (e) {}

  // 尽力补全自身昵称：同源请求，规避原 getUserName 使用 no-cors 导致响应不可读的缺陷
  try {
    fetch("https://www.douyu.com/member/cp", { method: "GET", credentials: "include", cache: "no-store" })
      .then(function (res) { return res.text(); })
      .then(function (html) {
        let doc = new DOMParser().parseFromString(html, "text/html");
        let el = doc.getElementsByClassName("uname_con")[0];
        if (el && el.title && !myName) myName = normalizeNick(el.title);
      })
      .catch(function () {});
  } catch (e) {}

  let waitTimer = setInterval(function () {
    let list = document.getElementById("js-barrage-list") || document.querySelector(".Barrage-list");
    if (!list) return;
    clearInterval(waitTimer);

    let observer = new MutationObserver(function (mutations) {
      for (let m = 0; m < mutations.length; m++) {
        let record = mutations[m];
        if (!record.addedNodes || record.addedNodes.length === 0) continue;
        for (let i = 0; i < record.addedNodes.length; i++) {
          checkAndTrackSelfDanmu(record.addedNodes[i]);
        }
      }
    });
    observer.observe(list, { childList: true, subtree: false });
  }, 1000);
}

function initPkg_LiveTool_BarrageSendCheck_Handle(text) {
  handleChatmsgPacket(text);
}
