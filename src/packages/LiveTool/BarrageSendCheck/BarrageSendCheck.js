let pendingDanmakuList = [];
let danmakuSeqId = 0;

function getPacketVal(str, start, end) {
  let idx = str.indexOf(start);
  if (idx === -1) return "";
  let s = idx + start.length;
  let e = str.indexOf(end, s);
  return e !== -1 ? str.slice(s, e) : str.slice(s);
}

function handleChatmsgPacket(msg) {
  if (!msg || typeof msg !== "string") return;
  if (msg.indexOf("type@=chatmsg") === -1) return;

  let txt = getPacketVal(msg, "txt@=", "/");
  if (!txt) return;

  let senderUid = getPacketVal(msg, "uid@=", "/");
  let senderNick = getPacketVal(msg, "nn@=", "/");

  let currentUid = (typeof my_uid !== "undefined" && my_uid) || getCookieValue("acf_uid") || "";
  let currentNick = (typeof myName !== "undefined" && myName) || "";
  if (!currentNick) {
    let cookieNick = getCookieValue("acf_nickname");
    if (cookieNick) {
      try { currentNick = decodeURIComponent(cookieNick); myName = currentNick; } catch (e) {}
    }
  }

  let isSelf = false;
  if (currentUid && senderUid && senderUid === currentUid) {
    isSelf = true;
  } else if (currentNick && senderNick && senderNick === currentNick) {
    isSelf = true;
  } else if (senderNick && pendingDanmakuList.some((p) => p.senderNick === senderNick)) {
    isSelf = true;
    if (typeof myName !== "undefined" && !myName) myName = senderNick;
  }

  if (!isSelf) return;

  let cleanTxt = txt.replace(/\[DouyuEx图片[^\]]+\]/g, "").replace(/\s+/g, " ").trim();

  for (let i = 0; i < pendingDanmakuList.length; i++) {
    let item = pendingDanmakuList[i];
    if (item.cleanText === cleanTxt && !item.confirmed) {
      item.confirmed = true;
      item.resolved = true;
      if (item.timer) {
        clearTimeout(item.timer);
        item.timer = null;
      }
      // 网络抖动迟到回执，自动自愈消除删除线与提示标签
      if (item.contentEl && item.contentEl.style && item.contentEl.style.textDecoration && item.contentEl.style.textDecoration.indexOf("line-through") !== -1) {
        item.contentEl.style.textDecoration = "";
        item.contentEl.style.textDecorationLine = "";
        item.contentEl.style.textDecorationColor = "";
        let tip = item.node.querySelector(".ex-danmaku-blocked-tip");
        if (tip) tip.remove();
      }
      break;
    }
  }

  let now = Date.now();
  pendingDanmakuList = pendingDanmakuList.filter((p) => !p.resolved || (now - p.createdAt < 15000));
}

// 挂载主长连接旁路广播接收通道
window.__onDouyuExChatmsg = handleChatmsgPacket;

function markDanmakuBlocked(item) {
  item.resolved = true;
  item.timer = null;
  if (!item.contentEl || !item.contentEl.parentNode) return;

  // 1. 添加删除线
  item.contentEl.style.textDecoration = "line-through gray 1px";
  item.contentEl.style.textDecorationLine = "line-through";
  item.contentEl.style.textDecorationColor = "gray";

  // 2. 避免重复添加标签
  if (item.node.querySelector(".ex-danmaku-blocked-tip")) return;

  // 3. 插入原版 (可能发送失败) 提示标签
  let tip = document.createElement("span");
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

  let hasSelf = node.classList.contains("is-self") || node.querySelector(".is-self");
  if (!hasSelf) return;

  let contentEl = node.classList.contains("Barrage-content") ? node : node.querySelector(".Barrage-content");
  if (!contentEl) return;

  let rawText = (contentEl.innerText || contentEl.textContent || "").trim();
  if (!rawText) return;

  let cleanText = rawText.replace(/\[DouyuEx图片[^\]]+\]/g, "").replace(/\s+/g, " ").trim();

  let nickEl = node.querySelector(".Barrage-nickName.is-self") || node.querySelector(".Barrage-nickName") || node.querySelector(".is-self");
  let senderNick = nickEl ? (nickEl.innerText || nickEl.textContent || "").trim() : ((typeof myName !== "undefined" && myName) || "");
  if (senderNick && typeof myName !== "undefined" && (!myName || myName !== senderNick)) {
    myName = senderNick;
  }

  let item = {
    id: ++danmakuSeqId,
    node: node,
    contentEl: contentEl,
    rawText: rawText,
    cleanText: cleanText,
    senderNick: senderNick,
    createdAt: Date.now(),
    resolved: false,
    confirmed: false,
    timer: null
  };

  // 800ms 敏捷超时判定：大幅压缩等待时延，若偶发网络抖动回执迟到，自愈机制将自动解除删除线
  item.timer = setTimeout(() => {
    if (!item.resolved && !item.confirmed) {
      markDanmakuBlocked(item);
    }
  }, 800);

  pendingDanmakuList.push(item);
}

async function initPkg_LiveTool_BarrageSendCheck() {
  if (typeof getUserName === "function") {
    getUserName().then((n) => { if (n) myName = n; }).catch(() => {});
  }
  let waitTimer = setInterval(() => {
    let list = document.getElementById("js-barrage-list") || document.querySelector(".Barrage-list");
    if (list) {
      clearInterval(waitTimer);
      let observer = new MutationObserver((mutations) => {
        for (let m = 0; m < mutations.length; m++) {
          let record = mutations[m];
          if (!record.addedNodes || record.addedNodes.length === 0) continue;
          for (let i = 0; i < record.addedNodes.length; i++) {
            checkAndTrackSelfDanmu(record.addedNodes[i]);
          }
        }
      });
      observer.observe(list, { childList: true, subtree: false });
    }
  }, 1000);
}

function initPkg_LiveTool_BarrageSendCheck_Handle(text) {
  handleChatmsgPacket(text);
}
