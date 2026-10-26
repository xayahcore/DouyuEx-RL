function initPkg_LastLiveTime() {
  initPkg_LastLiveTime_Dom();
}

/*
 * 房间状态判据（便宜优先，语义与旧实现一致）：
 *   ① 页面全局 $ROOM.show_status / show_time —— 斗鱼自己的房间数据，零序列化；
 *   ② 兜底只扫 <script> 标签的文本：旧的 document.body.innerHTML 会把整棵 DOM 串成
 *      一个字符串（大页面一次性开销很大），而需要找的从来只是那几段内联脚本；
 *   ③ 都没有 → 直接返回（外层 1 秒一次的轮询本来就有上限）。
 */
const LASTLIVE_STATUS_RES = [/show_status\\":(\d+)/, /"show_status":(\d+)/];
const LASTLIVE_TIME_RES = [/show_time\\":(\d+)/, /"show_time":(\d+)/];

function LastLiveTime_pickNumber(resList, text) {
  if (!text) return null;
  for (let i = 0; i < resList.length; i++) {
    const m = String(text).match(resList[i]);
    if (m) return m[1];
  }
  return null;
}

function LastLiveTime_readPageRoom() {
  // ① 页面全局（最便宜）
  try {
    const pageWin = (typeof unsafeWindow !== "undefined" && unsafeWindow) ? unsafeWindow : window;
    const room = pageWin && pageWin.$ROOM;
    if (room && typeof room === "object" && room.show_status !== undefined && room.show_status !== null) {
      let showTimeNum = null;
      if (room.show_time !== undefined && room.show_time !== null) {
        const n = Number(room.show_time);
        if (isFinite(n) && n > 0) showTimeNum = n;
      }
      return { isLive: String(room.show_status) === "1", showTime: showTimeNum, from: "页面全局 $ROOM" };
    }
  } catch (e) {}

  // ② 内联脚本兜底（不再序列化整棵 DOM）
  const scripts = (document && document.scripts) ? document.scripts : [];
  let status = null;
  let showTime = null;
  for (let i = 0; i < scripts.length; i++) {
    let text = "";
    try { text = scripts[i].textContent || ""; } catch (e) { continue; }
    if (!text) continue;
    if (status === null && text.indexOf("show_status") !== -1) status = LastLiveTime_pickNumber(LASTLIVE_STATUS_RES, text);
    if (showTime === null && text.indexOf("show_time") !== -1) showTime = LastLiveTime_pickNumber(LASTLIVE_TIME_RES, text);
    if (status !== null && showTime !== null) break;
  }
  const parsedTime = showTime === null ? null : parseInt(showTime, 10);
  return {
    isLive: status === "1",
    showTime: isFinite(parsedTime) && parsedTime > 0 ? parsedTime : null,
    from: "内联脚本"
  };
}

function initPkg_LastLiveTime_Dom() {
  const OVERLAY_ID = "ex-LastLiveTime-overlay";
  const roomState = LastLiveTime_readPageRoom();
  if (roomState.isLive) {
    return;
  }
  if (roomState.showTime === null) {
    return;
  }

  const showTime = roomState.showTime * 1000;
  const formattedTime = dateFormat("yyyy-MM-dd hh:mm:ss", new Date(showTime));
  const agoText = timeago(showTime);

  let pollCount = 0;
  const maxPolls = 180;

  const timer = setInterval(() => {
    pollCount++;
    if (pollCount > maxPolls) {
      clearInterval(timer);
      // 放弃时要留痕：否则用户看到的是"下播页什么提示都没有"，而现场一片空白
      if (typeof ExGuard_warn === "function") {
        ExGuard_warn("上次开播时间", "等待 .room-Player / .LastLiveTime 超过 " + maxPolls + " 秒，本次不显示");
      }
      return;
    }

    const player = document.querySelector(".room-Player");
    const hasLastLiveTime = document.getElementsByClassName("LastLiveTime").length > 0;

    if (player && hasLastLiveTime) {
      clearInterval(timer);

      if (document.getElementById(OVERLAY_ID)) {
        return;
      }

      const overlay = document.createElement("div");
      overlay.id = OVERLAY_ID;
      overlay.style.position = "absolute";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.display = "flex";
      overlay.style.justifyContent = "center";
      overlay.style.alignItems = "center";
      overlay.style.zIndex = "1";
      overlay.style.pointerEvents = "none";

      const styleBlock = document.createElement("style");
      styleBlock.textContent = `
        .ex-llt-card {
            position: relative;
            padding: 32px 64px;
            border-radius: 16px;
            background: rgba(24, 24, 24, 0.65);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 215, 0, 0.15);
            box-shadow: 0 16px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            text-align: center;
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            pointer-events: auto;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            animation: ex-llt-fade-in 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
        }
        .ex-llt-card:hover {
            transform: translateY(-6px) scale(1.02);
            box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 215, 0, 0.35);
            background: rgba(30, 30, 30, 0.75);
        }
        @keyframes ex-llt-fade-in {
            0% { opacity: 0; transform: translateY(20px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .ex-llt-close {
            position: absolute;
            top: 14px;
            right: 14px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 22px;
            line-height: 1;
            color: rgba(255, 255, 255, 0.6);
            background: rgba(255, 255, 255, 0.05);
            transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .ex-llt-close:hover {
            background: rgba(255, 69, 58, 0.9);
            color: #fff;
            transform: rotate(90deg) scale(1.1);
            box-shadow: 0 4px 12px rgba(255, 69, 58, 0.4);
        }
        .ex-llt-title {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            color: #e5b855;
            margin-bottom: 12px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.6);
            font-weight: 500;
        }
        .ex-llt-time-ago {
            font-size: 36px;
            color: #eebb4d;
            font-weight: 900;
            letter-spacing: 2px;
            margin-bottom: 10px;
            text-shadow: 0 0 15px rgba(238, 187, 77, 0.35), 0 4px 12px rgba(0,0,0,0.6);
        }
        .ex-llt-time-exact {
            font-size: 15px;
            color: rgba(229, 184, 85, 0.75);
            letter-spacing: 1px;
            font-family: monospace;
            font-weight: 500;
        }
      `;

      overlay.appendChild(styleBlock);

      const timeCard = document.createElement("div");
      timeCard.className = "ex-llt-card";

      timeCard.innerHTML = `
					<div class="ex-llt-title">
						<span style="display: inline-flex; width: 18px; height: 18px; margin-right: 8px;">
							<svg style="width: 100%; height: 100%; fill: currentColor;"><use xlink:href="#time_92d92c7"></use></svg>
						</span>
						上次开播时间
					</div>
					<div class="ex-llt-time-ago">${agoText}</div>
					<div class="ex-llt-time-exact">${formattedTime}</div>
                    <button type="button" class="ex-llt-close" aria-label="关闭">×</button>
				`;

      const closeBtn = timeCard.querySelector(".ex-llt-close");
      if (closeBtn) closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        overlay.style.opacity = "0";
        overlay.style.transition = "opacity 0.3s ease";
        timeCard.style.transform = "translateY(10px) scale(0.95)";
        setTimeout(() => overlay.remove(), 300);
      });

      overlay.appendChild(timeCard);
      player.appendChild(overlay);
    }
  }, 1000);
}
