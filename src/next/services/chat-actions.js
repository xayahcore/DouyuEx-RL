function* (__imports) {
yield {"La": { get: () => La, set: value => { La = value; } },
"Na": { get: () => Na, set: value => { Na = value; } },
"refreshPipCombos": { get: () => refreshPipCombos, set: value => { refreshPipCombos = value; } },
"renderPipDanmaku": { get: () => renderPipDanmaku, set: value => { renderPipDanmaku = value; } },
"resetPipMergeState": { get: () => resetPipMergeState, set: value => { resetPipMergeState = value; } },
"resetPipPacketState": { get: () => resetPipPacketState, set: value => { resetPipPacketState = value; } }};
/**
 * 画中画 (PiP) 渲染管道、低功耗视窗隐藏与连击浮层控制器
 */

/**
 * 隐藏/恢复主直播间视频层以防重绘冲突 (导出兼容 Na)
 * @param {boolean} shouldHide
 */
function setSourceVideoHidden(shouldHide) {
  const videoEl = document.getElementById("__video2");
  if (!videoEl) return;

  if (shouldHide) {
    videoEl.style.setProperty("opacity", "0.01", "important");
    videoEl.style.setProperty("pointer-events", "none", "important");
  } else {
    videoEl.style.removeProperty("opacity");
    videoEl.style.removeProperty("pointer-events");
  }
}
const Na = setSourceVideoHidden;

/**
 * 画中画开启期间原网页低功耗模式切换 (导出兼容 La)
 * @param {boolean} enableLowPower
 */
function setSourcePageLowPowerMode(enableLowPower) {
  const elementsToHide = [
    ".layout-Player-video",
    ".layout-Player-videoEntity",
    ".room-html5-player",
    ".DiamondsFansRankList",
    ".wm-view",
    ".wm-tabv2",
    ".comment-37342a",
    ".DanmuEffectDom",
    ".layout-Player-asideMainTop",
  ];

  elementsToHide.forEach((sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    if (enableLowPower) {
      el.style.setProperty("display", "none", "important");
    } else {
      el.style.removeProperty("display");
    }
  });

  const chatInputSelectors = [".ChatSend-txt", ".ChatSend-button"];
  chatInputSelectors.forEach((sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    if (enableLowPower) {
      el.style.setProperty("opacity", "0.01", "important");
      el.style.setProperty("pointer-events", "none", "important");
    } else {
      el.style.removeProperty("opacity");
      el.style.removeProperty("pointer-events");
    }
  });

  if (!enableLowPower) {
    [".layout-Player", ".Barrage-list"].forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) el.style.removeProperty("display");
    });
  }
}
const La = setSourcePageLowPowerMode;

/**
 * 重置画中画 WebSocket 数据流客户端 (导出兼容 resetPipPacketState)
 */
function resetPipPacketState() {
  if (__imports.Oi) {
    const client = __imports.Oi;
    __imports.Oi = null;
    client.msgHandler = () => {};
    try {
      client.close();
    } catch {}
  }
}

/**
 * 清空画中画时间戳去重缓存 (导出兼容 resetPipMergeState)
 */
function resetPipMergeState() {
  __imports.pipPacketTimes.clear();
}

/**
 * 刷新画中画右上角连击弹幕气泡 (导出兼容 refreshPipCombos)
 * @param {Window} [pipWin]
 */
function refreshPipCombos(pipWin) {
  const win = pipWin || (window.__pip_window__ && !window.__pip_window__.closed ? window.__pip_window__ : null);
  const container = win?.document.getElementById("combo-container");
  if (!container) return;

  const nowMs = Date.now();
  const activeList = [];

  for (const [key, group] of __imports.pipMergeGroups.entries()) {
    const recentCount = group.timestamps.filter(t => nowMs - t <= 8000).length;
    if (recentCount < 2) {
      group.dom = null;
    } else {
      group.displayCount = recentCount;
      const lastTs = group.timestamps[group.timestamps.length - 1] || 0;
      activeList.push({ key, info: group, count: recentCount, lastTs });
    }
  }

  // 按出现频次与时间降序排序
  activeList.sort((a, b) => b.count - a.count || b.lastTs - a.lastTs);
  container.innerHTML = "";

  for (const [, group] of __imports.pipMergeGroups) {
    group.dom = null;
  }

  const topGroups = activeList.slice(0, __imports.za);
  const overflowCount = activeList.length - topGroups.length;

  for (const { key, info, count } of topGroups) {
    const itemEl = win.document.createElement("div");
    itemEl.className = "combo-item";
    itemEl.title = key;

    const maxLen = __imports.Oa;
    const truncatedKey = (!key || key.length <= maxLen) ? (key || "") : (key.slice(0, maxLen) + "…");
    itemEl.innerHTML = `${truncatedKey}<span class="combo-count">×${count}</span>`;
    container.appendChild(itemEl);
    info.dom = itemEl;
  }

  if (overflowCount > 0) {
    const moreEl = win.document.createElement("div");
    moreEl.className = "combo-item combo-item--more";
    moreEl.textContent = `+${overflowCount} 组重复`;
    container.appendChild(moreEl);
  }
}

/**
 * 在画中画视窗内渲染一条飘屏弹幕 (计算轨道、碰撞规避与 CSS 关键帧)
 * @param {object} packet - 弹幕对象
 * @param {Window} pipWin - 画中画子窗口
 * @param {HTMLElement} danmakuContainer - 弹幕容器
 * @param {boolean} [isSelf=false] - 是否为自身弹幕
 */
function renderPipDanmaku(packet, pipWin, danmakuContainer, isSelf = false) {
  if (!packet || !packet.text) return;

  const colorMap = {
    1: "#ff3b30",
    2: "#0a84ff",
    3: "#34c759",
    4: "#ff9500",
    5: "#af52de",
    6: "#ff2d55",
  };

  const dmEl = pipWin.document.createElement("div");
  dmEl.className = `dm${isSelf ? " dm-self" : ""}`;
  dmEl.innerText = packet.text;
  dmEl.style.fontSize = `${__imports.pipPreferences.fontSize}px`;
  dmEl.style.color = isSelf ? "#00ff66" : (colorMap[packet.color] || "#ffffff");
  dmEl.style.visibility = "hidden";
  danmakuContainer.appendChild(dmEl);

  const textWidth = dmEl.offsetWidth;
  const winWidth = pipWin.innerWidth;

  // 轨道分配算法
  const assignTrackIndex = (winW, textW) => {
    let totalTracks = Math.floor(pipWin.innerHeight / __imports.pipPreferences.trackHeight);
    if (__imports.pipPreferences.area === "half") {
      totalTracks = Math.floor(totalTracks / 2);
    } else if (__imports.pipPreferences.area === "quarter") {
      totalTracks = Math.floor(totalTracks / 4);
    }
    totalTracks = Math.max(1, totalTracks);

    if (!window.__pip_track_state__) {
      window.__pip_track_state__ = [];
    }
    const trackState = window.__pip_track_state__;
    const baseDuration = 15 / __imports.pipPreferences.speed;
    const duration = Math.max(0.7 * baseDuration, Math.min(1.4 * baseDuration, baseDuration + textW / 120 / __imports.pipPreferences.speed));
    const speedPxPerSec = (winW + textW) / duration;

    let chosenTrack = -1;
    for (let track = 0; track < totalTracks; track++) {
      const prev = trackState[track];
      if (!prev) {
        trackState[track] = { textWidth: textW, speed: speedPxPerSec, startTime: Date.now(), duration: duration * 1000 };
        return track;
      }
      const elapsed = Date.now() - prev.startTime;
      if (elapsed >= prev.duration) {
        trackState[track] = { textWidth: textW, speed: speedPxPerSec, startTime: Date.now(), duration: duration * 1000 };
        return track;
      }
      const prevHeadX = winW - prev.speed * (elapsed / 1000);
      const prevTailX = prevHeadX + prev.textWidth;
      if (prevTailX <= winW - 16) {
        if (speedPxPerSec > prev.speed) {
          const remainingTime = prev.duration - elapsed;
          if ((prevHeadX / (speedPxPerSec - prev.speed)) * 1000 < remainingTime) {
            continue;
          }
        }
        chosenTrack = track;
        break;
      }
    }

    if (chosenTrack === -1) {
      let minOverlap = Infinity;
      for (let track = 0; track < totalTracks; track++) {
        const item = trackState[track];
        if (!item) {
          chosenTrack = track;
          break;
        }
        const elapsed = Date.now() - item.startTime;
        const tailPos = winW - item.speed * (elapsed / 1000) + item.textWidth;
        if (tailPos < minOverlap) {
          minOverlap = tailPos;
          chosenTrack = track;
        }
      }
    }

    trackState[chosenTrack] = { textWidth: textW, speed: speedPxPerSec, startTime: Date.now(), duration: duration * 1000 };
    return chosenTrack;
  };

  const trackIdx = assignTrackIndex(winWidth, textWidth);
  const topOffset = trackIdx * __imports.pipPreferences.trackHeight;
  const animDurationSec = window.__pip_track_state__[trackIdx].duration / 1000;

  dmEl.style.top = `${topOffset}px`;
  dmEl.style.left = `${winWidth}px`;
  dmEl.style.visibility = "visible";

  const animName = `exPipMove_${Math.random().toString(36).substring(2, 9)}`;
  const pipDoc = pipWin.document;
  let animStyle = pipDoc.getElementById("ex-danmaku-styles");
  if (!animStyle) {
    animStyle = pipDoc.createElement("style");
    animStyle.id = "ex-danmaku-styles";
    pipDoc.head.appendChild(animStyle);
  }

  animStyle.sheet.insertRule(`
    @keyframes ${animName} {
      from { transform: translateX(0); }
      to { transform: translateX(-${winWidth + textWidth + 30}px); }
    }
  `, 0);

  dmEl.style.animation = `${animName} ${animDurationSec}s linear forwards`;
  dmEl.addEventListener("animationend", () => {
    dmEl.remove();
    try {
      const sheet = animStyle.sheet;
      for (let idx = 0; idx < sheet.cssRules.length; idx++) {
        if (sheet.cssRules[idx].name === animName) {
          sheet.deleteRule(idx);
          break;
        }
      }
    } catch {}
  });
}

}
