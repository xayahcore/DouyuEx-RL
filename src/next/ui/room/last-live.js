function* (__imports) {
yield {"mountLastLiveOverlay": { get: () => mountLastLiveOverlay, set: value => { mountLastLiveOverlay = value; } }};
/**
 * 房间未开播状态下挂载“上次开播时间”卡片
 * @param {object} owner - 房间装配上下文拥有者 (提供 interval, listen, timeout 统一托管)
 */
function mountLastLiveOverlay(owner) {
  const overlayId = "ex-LastLiveTime-overlay";
  const bodyHtml = (document.body && document.body.innerHTML) || "";

  // 1. 探测开播状态 (show_status === 1 表示正在直播)
  const statusMatch = bodyHtml.match(/show_status\\":(\d+)/) || bodyHtml.match(/"show_status":(\d+)/);
  const isLiving = statusMatch && statusMatch[1] === "1";
  if (isLiving) return;

  // 2. 提取上次开播时间戳
  const timeMatch = bodyHtml.match(/show_time\\":(\d+)/) || bodyHtml.match(/"show_time":(\d+)/);
  if (!timeMatch) return;

  const lastLiveTimestampMs = parseInt(timeMatch[1], 10) * 1000;
  const formattedExactTime = (0, __imports.k)("yyyy-MM-dd hh:mm:ss", new Date(lastLiveTimestampMs));

  // 计算相对时间
  const formatTimeAgo = (timeMs) => {
    const diffSec = Math.floor((Date.now() - new Date(timeMs).getTime()) / 1000);
    if (diffSec > 31536000) return Math.floor(diffSec / 31536000) + "年前";
    if (diffSec > 2592000) return Math.floor(diffSec / 2592000) + "个月前";
    if (diffSec > 86400) return Math.floor(diffSec / 86400) + "天前";
    if (diffSec > 3600) return Math.floor(diffSec / 3600) + "小时前";
    if (diffSec >= 60) return Math.floor(diffSec / 60) + "分钟前";
    return "刚刚";
  };
  const relativeTimeAgo = formatTimeAgo(lastLiveTimestampMs);

  // 3. 轮询等待播放器容器加载完成
  let checkCount = 0;
  const checkTimer = owner.interval(() => {
    if (++checkCount > 180) {
      (0, __imports.clearInterval)(checkTimer);
      return;
    }

    const playerContainer = document.querySelector(".room-Player");
    const hasOfficialBadge = document.getElementsByClassName("LastLiveTime").length > 0;

    if (playerContainer && hasOfficialBadge) {
      (0, __imports.clearInterval)(checkTimer);
      if (document.getElementById(overlayId)) return;

      // 创建半透明遮罩与卡片
      const overlayWrap = document.createElement("div");
      overlayWrap.id = overlayId;
      Object.assign(overlayWrap.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: "1",
        pointerEvents: "none"
      });

      const styleEl = document.createElement("style");
      styleEl.textContent = `
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
      overlayWrap.appendChild(styleEl);

      const cardEl = document.createElement("div");
      cardEl.className = "ex-llt-card";
      cardEl.innerHTML = `
        <div class="ex-llt-title">
          <span style="display: inline-flex; width: 18px; height: 18px; margin-right: 8px;">
            <svg style="width: 100%; height: 100%; fill: currentColor;"><use xlink:href="#time_92d92c7"></use></svg>
          </span>
          上次开播时间
        </div>
        <div class="ex-llt-time-ago">${relativeTimeAgo}</div>
        <div class="ex-llt-time-exact">${formattedExactTime}</div>
        <button type="button" class="ex-llt-close" aria-label="关闭">×</button>
      `;

      owner.listen(cardEl.querySelector(".ex-llt-close"), "click", (e) => {
        e.stopPropagation();
        overlayWrap.style.opacity = "0";
        overlayWrap.style.transition = "opacity 0.3s ease";
        cardEl.style.transform = "translateY(10px) scale(0.95)";
        owner.timeout(() => overlayWrap.remove(), 300);
      });

      overlayWrap.appendChild(cardEl);
      playerContainer.appendChild(overlayWrap);
    }
  }, 1000);
}

}
