function* (__imports) {
yield {"initDanmakuBlockedCheck": { get: () => initDanmakuBlockedCheck, set: value => { initDanmakuBlockedCheck = value; } }};
/**
 * 弹幕发送成功与系统屏蔽词检测系统 (DouyuEx SSOT)
 * 800ms 敏捷超时判定、删除线提示与偶发网络抖动回执自愈
 */
function initDanmakuBlockedCheck() {
  let pendingList = [];
  let seqId = 0;

  const extractSegment = (str, startTag, endTag) => {
    const idx = str.indexOf(startTag);
    if (idx === -1) return "";
    const s = idx + startTag.length;
    const e = str.indexOf(endTag, s);
    return e !== -1 ? str.slice(s, e) : str.slice(s);
  };

  /**
   * 旁听 chatmsg 弹幕数据包回执
   */
  const handleChatmsgPacket = (msg) => {
    if (!msg || typeof msg !== "string" || !msg.includes("type@=chatmsg")) return;

    const txt = extractSegment(msg, "txt@=", "/");
    if (!txt) return;

    const senderUid = extractSegment(msg, "uid@=", "/");
    const senderNick = extractSegment(msg, "nn@=", "/");

    const myUid =
      (typeof __imports.I !== "undefined" && __imports.I) ||
      (typeof __imports.x === "function" && (0, __imports.x)("acf_uid")) ||
      (document.cookie.match(/(?:^|;\s*)acf_uid=([^;]+)/) || [])[1] ||
      "";

    let myNick = (typeof __imports.W !== "undefined" && __imports.W) || "";
    if (!myNick && typeof __imports.x === "function") {
      const cookieNick = (0, __imports.x)("acf_nickname");
      if (cookieNick) {
        try {
          myNick = decodeURIComponent(cookieNick);
          __imports.W = myNick;
        } catch {}
      }
    }

    let isSelf = false;
    if (myUid && senderUid && senderUid === myUid) {
      isSelf = true;
    } else if (myNick && senderNick && senderNick === myNick) {
      isSelf = true;
    } else if (senderNick && pendingList.some(p => p.senderNick === senderNick)) {
      isSelf = true;
      if (typeof __imports.W !== "undefined" && !__imports.W) {
        __imports.W = senderNick;
      }
    }

    if (!isSelf) return;

    const cleanTxt = txt
      .replace(/\[DouyuEx图片[^\]]+\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    for (let i = 0; i < pendingList.length; i++) {
      const item = pendingList[i];
      if (item.cleanText === cleanTxt && !item.confirmed) {
        item.confirmed = true;
        item.resolved = true;
        if (item.timer) {
          (0, __imports.clearTimeout)(item.timer);
          item.timer = null;
        }

        // 若网络抖动导致回执迟到，自愈清除删除线与可能失败提示
        if (item.contentEl?.style?.textDecoration?.includes("line-through")) {
          item.contentEl.style.textDecoration = "";
          item.contentEl.style.textDecorationLine = "";
          item.contentEl.style.textDecorationColor = "";
          const tip = item.node.querySelector(".ex-danmaku-blocked-tip");
          if (tip) tip.remove();
        }
        break;
      }
    }

    const now = Date.now();
    pendingList = pendingList.filter(p => !p.resolved || now - p.createdAt < 15000);
  };

  // 挂载全局监听回调
  window.__onDouyuExChatmsg = handleChatmsgPacket;

  const markBlocked = (item) => {
    item.resolved = true;
    item.timer = null;
    if (!item.contentEl || !item.contentEl.parentNode) return;

    // 1. 注入原版删除线样式
    item.contentEl.style.textDecoration = "line-through gray 1px";
    item.contentEl.style.textDecorationLine = "line-through";
    item.contentEl.style.textDecorationColor = "gray";

    if (item.node.querySelector(".ex-danmaku-blocked-tip")) return;

    // 2. 注入 (可能发送失败) 提示标签
    const tip = document.createElement("span");
    tip.className = "ex-danmaku-blocked-tip";
    tip.textContent = "(可能发送失败)";
    tip.style.marginLeft = "4px";
    tip.style.color = "gray";
    tip.style.fontSize = "9px";
    tip.style.cursor = "pointer";
    tip.title = "该条弹幕发送失败/可能被系统屏蔽，不会被其他人看到（可能会误判）";

    item.contentEl.parentNode.insertBefore(tip, item.contentEl.nextSibling);
  };

  const checkAndTrackSelfDanmu = (node) => {
    if (!node || node.nodeType !== 1) return;

    const hasSelf = node.classList.contains("is-self") || node.querySelector(".is-self");
    if (!hasSelf) return;

    const contentEl = node.classList.contains("Barrage-content")
      ? node
      : node.querySelector(".Barrage-content");
    if (!contentEl) return;

    const rawText = (contentEl.innerText || contentEl.textContent || "").trim();
    if (!rawText) return;

    const cleanText = rawText
      .replace(/\[DouyuEx图片[^\]]+\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const nickEl =
      node.querySelector(".Barrage-nickName.is-self") ||
      node.querySelector(".Barrage-nickName") ||
      node.querySelector(".is-self");

    const senderNick = nickEl
      ? (nickEl.innerText || nickEl.textContent || "").trim()
      : ((typeof __imports.W !== "undefined" && __imports.W) || "");

    if (senderNick && typeof __imports.W !== "undefined" && (!__imports.W || __imports.W !== senderNick)) {
      __imports.W = senderNick;
    }

    const item = {
      id: ++seqId,
      node,
      contentEl,
      rawText,
      cleanText,
      senderNick,
      createdAt: Date.now(),
      resolved: false,
      confirmed: false,
      timer: null,
    };

    // 800ms 敏捷超时判定
    item.timer = (0, __imports.setTimeout)(() => {
      if (!item.resolved && !item.confirmed) {
        markBlocked(item);
      }
    }, 800);

    pendingList.push(item);
  };

  // 轮询等待弹幕 DOM 列表就绪并启动 MutationObserver
  const waitTimer = (0, __imports.setInterval)(() => {
    const list = document.getElementById("js-barrage-list") || document.querySelector(".Barrage-list");
    if (list) {
      (0, __imports.clearInterval)(waitTimer);
      const observer = new MutationObserver((mutations) => {
        for (let m = 0; m < mutations.length; m++) {
          const record = mutations[m];
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

}
