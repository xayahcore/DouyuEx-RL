function* (__imports) {
yield {"initDanmakuBlockedCheck": { get: () => initDanmakuBlockedCheck, set: value => { initDanmakuBlockedCheck = value; } }};
/* ==================== 弹幕发送成功与系统屏蔽词检测系统 (DouyuEx SSOT) ==================== */
function initDanmakuBlockedCheck() {
  var pendingList = [];
  var seqId = 0;

  function getVal(str, start, end) {
    var idx = str.indexOf(start);
    if (idx === -1) return "";
    var s = idx + start.length;
    var e = str.indexOf(end, s);
    return e !== -1 ? str.slice(s, e) : str.slice(s);
  }

  function handleChatmsgPacket(msg) {
    if (!msg || typeof msg !== "string") return;
    if (msg.indexOf("type@=chatmsg") === -1) return;

    var txt = getVal(msg, "txt@=", "/");
    if (!txt) return;

    var senderUid = getVal(msg, "uid@=", "/");
    var senderNick = getVal(msg, "nn@=", "/");

    var myUid =
      (typeof __imports.I !== "undefined" && __imports.I) ||
      (typeof __imports.x === "function" && (0, __imports.x)("acf_uid")) ||
      (document.cookie.match(/(?:^|;\s*)acf_uid=([^;]+)/) || [])[1] ||
      "";
    var myNick = (typeof __imports.W !== "undefined" && __imports.W) || "";
    if (!myNick && typeof __imports.x === "function") {
      var cookieNick = (0, __imports.x)("acf_nickname");
      if (cookieNick) {
        try {
          myNick = decodeURIComponent(cookieNick);
          __imports.W = myNick;
        } catch (e) {}
      }
    }

    var isSelf = false;
    if (myUid && senderUid && senderUid === myUid) {
      isSelf = true;
    } else if (myNick && senderNick && senderNick === myNick) {
      isSelf = true;
    } else if (
      senderNick &&
      pendingList.some(function (p) {
        return p.senderNick === senderNick;
      })
    ) {
      isSelf = true;
      if (typeof __imports.W !== "undefined" && !__imports.W) __imports.W = senderNick;
    }

    if (!isSelf) return;

    var cleanTxt = txt
      .replace(/\[DouyuEx图片[^\]]+\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    for (var i = 0; i < pendingList.length; i++) {
      var item = pendingList[i];
      if (item.cleanText === cleanTxt && !item.confirmed) {
        item.confirmed = true;
        item.resolved = true;
        if (item.timer) {
          (0, __imports.clearTimeout)(item.timer);
          item.timer = null;
        }
        // 若极端网络抖动在超时后才收到回执，自动自愈消除删除线与提示
        if (
          item.contentEl &&
          item.contentEl.style &&
          item.contentEl.style.textDecoration &&
          item.contentEl.style.textDecoration.indexOf("line-through") !== -1
        ) {
          item.contentEl.style.textDecoration = "";
          item.contentEl.style.textDecorationLine = "";
          item.contentEl.style.textDecorationColor = "";
          var tip = item.node.querySelector(".ex-danmaku-blocked-tip");
          if (tip) tip.remove();
        }
        break;
      }
    }

    var now = Date.now();
    pendingList = pendingList.filter(function (p) {
      return !p.resolved || now - p.createdAt < 15000;
    });
  }

  // 挂载全局接收钩子，主 WebSocket 旁听与 nl 代理连接双通道消费
  window.__onDouyuExChatmsg = handleChatmsgPacket;

  function markBlocked(item) {
    item.resolved = true;
    item.timer = null;
    if (!item.contentEl || !item.contentEl.parentNode) return;

    // 1. 添加原版删除线样式
    item.contentEl.style.textDecoration = "line-through gray 1px";
    item.contentEl.style.textDecorationLine = "line-through";
    item.contentEl.style.textDecorationColor = "gray";

    // 2. 避免重复添加标签
    if (item.node.querySelector(".ex-danmaku-blocked-tip")) return;

    // 3. 插入原版 (可能发送失败) 提示标签与悬停解释
    var tip = document.createElement("span");
    tip.className = "ex-danmaku-blocked-tip";
    tip.textContent = "(可能发送失败)";
    tip.style.marginLeft = "4px";
    tip.style.color = "gray";
    tip.style.fontSize = "9px";
    tip.style.cursor = "pointer";
    tip.title =
      "该条弹幕发送失败/可能被系统屏蔽，不会被其他人看到（可能会误判）";

    item.contentEl.parentNode.insertBefore(tip, item.contentEl.nextSibling);
  }

  function checkAndTrackSelfDanmu(node) {
    if (!node || node.nodeType !== 1) return;

    var hasSelf =
      node.classList.contains("is-self") || node.querySelector(".is-self");
    if (!hasSelf) return;

    var contentEl = node.classList.contains("Barrage-content")
      ? node
      : node.querySelector(".Barrage-content");
    if (!contentEl) return;

    var rawText = (contentEl.innerText || contentEl.textContent || "").trim();
    if (!rawText) return;

    var cleanText = rawText
      .replace(/\[DouyuEx图片[^\]]+\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    var nickEl =
      node.querySelector(".Barrage-nickName.is-self") ||
      node.querySelector(".Barrage-nickName") ||
      node.querySelector(".is-self");
    var senderNick = nickEl
      ? (nickEl.innerText || nickEl.textContent || "").trim()
      : (typeof __imports.W !== "undefined" && __imports.W) || "";
    if (senderNick && typeof __imports.W !== "undefined" && (!__imports.W || __imports.W !== senderNick)) {
      __imports.W = senderNick;
    }

    var item = {
      id: ++seqId,
      node: node,
      contentEl: contentEl,
      rawText: rawText,
      cleanText: cleanText,
      senderNick: senderNick,
      createdAt: Date.now(),
      resolved: false,
      confirmed: false,
      timer: null,
    };

    // 800ms 敏捷超时判定：大幅压缩等待时延，若偶发网络抖动回执迟到，自愈机制将自动解除删除线
    item.timer = (0, __imports.setTimeout)(function () {
      if (!item.resolved && !item.confirmed) {
        markBlocked(item);
      }
    }, 800);

    pendingList.push(item);
  }

  var waitTimer = (0, __imports.setInterval)(function () {
    var list =
      document.getElementById("js-barrage-list") ||
      document.querySelector(".Barrage-list");
    if (list) {
      (0, __imports.clearInterval)(waitTimer);
      var observer = new MutationObserver(function (mutations) {
        for (var m = 0; m < mutations.length; m++) {
          var record = mutations[m];
          if (!record.addedNodes || record.addedNodes.length === 0) continue;
          for (var i = 0; i < record.addedNodes.length; i++) {
            checkAndTrackSelfDanmu(record.addedNodes[i]);
          }
        }
      });
      observer.observe(list, { childList: true, subtree: false });
    }
  }, 1000);
}


}
