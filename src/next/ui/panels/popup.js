function* (__imports) {
yield {"createPopupPlayerPanel": { get: () => createPopupPlayerPanel, set: value => { createPopupPlayerPanel = value; } },
"executePopupPlayer": { get: () => executePopupPlayer, set: value => { executePopupPlayer = value; } }};
/**
 * 同屏联播控制器与 380×370px 独立控制面板
 * 支持无弹幕极速流 (FLV.js 直播流直连) 与全功能有弹幕 (iframe 嵌入) 双模式
 */

/**
 * 启动同屏播放视窗
 * @param {string} url - 目标直播流或房间地址
 * @param {boolean} isNoIframe - 是否为无 iframe 纯流模式
 */
function executePopupPlayer(url, isNoIframe) {
  const targetUrl = url ? url.trim() : "";
  if (!targetUrl) {
    (0, __imports.T)("请输入直播间或直播流地址", "error");
    return;
  }

  if (typeof __imports.ExLoadLib === "function" && typeof __imports.EXURL !== "undefined") {
    (0, __imports.ExLoadLib)(__imports.EXURL.flv);
  }

  const isDirectStream = targetUrl.length > 150 && (
    targetUrl.startsWith("http://") ||
    targetUrl.startsWith("https://") ||
    targetUrl.includes(".flv") ||
    targetUrl.includes(".m3u8")
  );

  if (isDirectStream) {
    (0, __imports.rn)(__imports.D.length, targetUrl);
  } else if (isNoIframe) {
    // 纯流模式：按平台解析真实房间号与流地址
    if (targetUrl.includes("douyu.com")) {
      const mountDouyu = (roomId) => {
        (0, __imports.en)(__imports.D.length, roomId, "Douyu");
      };

      (0, __imports.fetch)(targetUrl, {
        method: "GET",
        mode: "no-cors",
        cache: "default",
        credentials: "include",
      })
        .then(res => res.text())
        .then(htmlText => {
          const doc = new DOMParser().parseFromString(htmlText, "text/html");
          const htmlContent = doc.getElementsByTagName("html")[0]?.innerHTML || "";
          const roomIdMarker = "$ROOM.room_id =";
          const markerIdx = htmlContent.indexOf(roomIdMarker);
          let extractedRid = "";

          if (markerIdx > 0) {
            const start = markerIdx + roomIdMarker.length;
            const end = htmlContent.indexOf(";", start);
            extractedRid = htmlContent.substring(start, end).trim();
          } else {
            extractedRid = (0, __imports.v)(htmlContent, "roomID:", ",") || "";
            if (!extractedRid) {
              const canonicalLink = doc.querySelector('link[rel="canonical"]');
              if (canonicalLink) {
                const href = canonicalLink.getAttribute("href") || "";
                extractedRid = href.split("/").pop().trim();
              }
            }
          }

          if (/^[0-9]+$/.test(extractedRid)) {
            mountDouyu(extractedRid);
          } else {
            (0, __imports.T)("获取直播间失败，请检查直播间地址是否正确！", "error");
          }
        })
        .catch(err => {
          console.debug("[DouyuEx NEXT] 解析斗鱼同屏房间号异常:", err);
        });
    } else if (targetUrl.includes("bilibili.com")) {
      const parts = targetUrl.split("/");
      const rawId = parts[parts.length - 1];
      const mountBilibili = (realRoomId) => {
        (0, __imports.en)(__imports.D.length, realRoomId, "Bilibili");
      };

      (0, __imports.GM_xmlhttpRequest)({
        method: "GET",
        url: `https://api.live.bilibili.com/room/v1/Room/room_init?id=${rawId}`,
        responseType: "json",
        onload: (res) => {
          const realId = res.response?.data?.room_id;
          if (realId) {
            mountBilibili(realId);
          }
        },
      });
    } else if (targetUrl.includes("huya.com")) {
      (0, __imports.en)(__imports.D.length, targetUrl, "Huya");
    } else {
      (0, __imports.rn)(__imports.D.length, targetUrl);
    }
  } else {
    // iframe 有弹幕全功能模式 (仅支持斗鱼)
    const slotIdx = __imports.D.length;
    if (!String(targetUrl).includes("douyu.com")) {
      (0, __imports.T)("有弹幕模式仅支持斗鱼直播", "error");
      return;
    }

    const segments = String(targetUrl).split("/");
    const roomId = segments[segments.length - 1];

    const container = document.createElement("div");
    container.id = `exVideoDiv${slotIdx}`;
    container.rid = roomId;
    container.className = "exVideoDiv";
    container.innerHTML = `
      <div class='exVideoInfo' id='exVideoInfo${slotIdx}'>
        <span class='exVideoRID' id='exVideoRID${slotIdx}' style='color:white'>斗鱼 - ${roomId}</span>
        <a><div class='exVideoClose' id='exVideoClose${slotIdx}'>X</div></a>
      </div>
      <iframe class='exVideoPlayer' id='exVideoPlayer${slotIdx}' src="${targetUrl}?exid=chun"></iframe>
      <div class='exVideoScale' id='exVideoScale${slotIdx}'></div>
    `;

    const mainLayout = (0, __imports.E)([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"]);
    if (mainLayout) {
      mainLayout.insertBefore(container, mainLayout.childNodes[0]);
    }

    (0, __imports.on)(slotIdx);
    (0, __imports.tn)(slotIdx);

    if (slotIdx > __imports.D.length - 1) {
      __imports.D.push("iframe");
    } else {
      __imports.D[slotIdx] = "iframe";
    }

    const curDiv = document.getElementById(`exVideoDiv${slotIdx}`);
    const curClose = document.getElementById(`exVideoClose${slotIdx}`);

    if (curClose) {
      curClose.onclick = () => {
        __imports.D[slotIdx]?.destroy?.();
        curDiv?.remove();
      };
    }

    if (curDiv) {
      curDiv.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        for (let i = 0; i < __imports.D.length; i++) {
          const item = document.getElementById(`exVideoDiv${i}`);
          if (item) {
            item.style.zIndex = i === slotIdx ? 1016 : 1428;
          }
        }
      };
    }
  }
}

/**
 * 组装并挂载同屏播放器三级控制台 (380×370px)
 */
function createPopupPlayerPanel() {
  if (document.querySelector(".popup-player-panel")) return;

  const panel = document.createElement("div");
  panel.className = "popup-player-panel miuix-modal";
  panel.innerHTML = `
    <div class="popup-panel__card">
      <div class="popup-panel__card-header">
        <span class="popup-panel__card-title">直播流或房间地址</span>
        <button type="button" class="popup-panel__paste-btn" id="popup-panel-paste">粘贴</button>
      </div>
      <div class="popup-panel__input-box">
        <input type="text" id="popup-panel-url" value="https://www.douyu.com/4042402" placeholder="支持斗鱼/虎牙/B站房间号或直播流" />
      </div>
    </div>

    <div class="popup-panel__card">
      <div class="popup-panel__card-header">
        <span class="popup-panel__card-title">同屏播放模式</span>
      </div>
      <div class="popup-panel__seg-switch">
        <label class="popup-panel__seg-item">
          <input type="radio" name="popup_player_mode" value="noiframe" checked />
          <span class="popup-panel__seg-thumb">无弹幕极速流 (推荐)</span>
        </label>
        <label class="popup-panel__seg-item">
          <input type="radio" name="popup_player_mode" value="iframe" />
          <span class="popup-panel__seg-thumb">全功能有弹幕</span>
        </label>
      </div>
    </div>

    <div class="popup-panel__action-wrap">
      <button type="button" class="ex-btn-primary popup-panel__submit-btn" id="popup-panel-start-btn">
        载入同屏流
      </button>
    </div>
  `;

  const mountParent = document.getElementsByClassName("layout-Player-chat")[0] || document.body;
  if (mountParent) {
    mountParent.insertBefore(panel, mountParent.childNodes[0]);
  }
  (0, __imports.ensureMiuixPanelHeader)(panel, "同屏播放器");

  // 绑定剪贴板快速粘贴
  (0, __imports.safeBind)("#popup-panel-paste", "click", async (e) => {
    e.stopPropagation();
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        const urlInput = document.getElementById("popup-panel-url");
        if (urlInput) urlInput.value = clipText.trim();
        (0, __imports.T)("已从剪贴板粘贴直播流地址", "success");
      }
    } catch {
      (0, __imports.T)("请允许读取剪贴板权限或手动粘贴", "info");
    }
  });

  // 绑定启动按钮动作
  (0, __imports.safeBind)("#popup-panel-start-btn", "click", (e) => {
    e.stopPropagation();
    const urlInput = document.getElementById("popup-panel-url");
    const streamUrl = urlInput ? urlInput.value.trim() : "";
    const isNoIframe = document.querySelector('input[name="popup_player_mode"][value="noiframe"]')?.checked ?? true;

    __imports.nextFeatures.invoke('popup-player', 'execute', streamUrl, isNoIframe);
    panel.style.setProperty("display", "none", "important");
    (0, __imports.updateDockActiveIndicator)();
  });
}

}
