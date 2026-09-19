function* (__imports) {
yield {"mountLastLiveOverlay": { get: () => mountLastLiveOverlay, set: value => { mountLastLiveOverlay = value; } }};
// Room assembly section; dependencies are captured per mount, in original order.
function mountLastLiveOverlay(owner) {
    let r = "ex-LastLiveTime-overlay",
      e = (document.body && document.body.innerHTML) || "";
    let llt_status =
        e.match(/show_status\\":(\d+)/) || e.match(/"show_status":(\d+)/),
      o = llt_status && "1" === llt_status[1];
    if (!o) {
      let llt_match =
        e.match(/show_time\\":(\d+)/) || e.match(/"show_time":(\d+)/);
      if (llt_match) {
        let llt_time = 1e3 * parseInt(llt_match[1], 10);
        let i = (0, __imports.k)("yyyy-MM-dd hh:mm:ss", new Date(llt_time)),
          a = ((e) => {
            let t = "",
              o = new Date().getTime(),
              n = new Date(e).getTime(),
              i = Math.floor((o - n) / 1e3);
            return (t =
              31536e3 < i
                ? Math.floor(i / 31536e3) + "年前"
                : 2592e3 < i
                  ? Math.floor(i / 2592e3) + "个月前"
                  : 86400 < i
                    ? Math.floor(i / 86400) + "天前"
                    : 3600 < i
                      ? Math.floor(i / 3600) + "小时前"
                      : 60 <= i
                        ? Math.floor(i / 60) + "分钟前"
                        : "刚刚");
          })(llt_time);
        let checkCount = 0,
          checkTimer = owner.interval(() => {
            if (180 < ++checkCount) (0, __imports.clearInterval)(checkTimer);
            else {
              var e = document.querySelector(".room-Player"),
                n = 0 < document.getElementsByClassName("LastLiveTime").length;
              if (
                e &&
                n &&
                ((0, __imports.clearInterval)(checkTimer), !document.getElementById(r))
              ) {
                let t = document.createElement("div");
                ((t.id = r),
                  (t.style.position = "absolute"),
                  (t.style.top = "0"),
                  (t.style.left = "0"),
                  (t.style.width = "100%"),
                  (t.style.height = "100%"),
                  (t.style.display = "flex"),
                  (t.style.justifyContent = "center"),
                  (t.style.alignItems = "center"),
                  (t.style.zIndex = "1"),
                  (t.style.pointerEvents = "none"));
                n = document.createElement("style");
                ((n.textContent = `

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

      `),
                  t.appendChild(n));
                let o = document.createElement("div");
                ((o.className = "ex-llt-card"),
                  (o.innerHTML = `

					<div class="ex-llt-title">

						<span style="display: inline-flex; width: 18px; height: 18px; margin-right: 8px;">

							<svg style="width: 100%; height: 100%; fill: currentColor;"><use xlink:href="#time_92d92c7"></use></svg>

						</span>

						上次开播时间

					</div>

					<div class="ex-llt-time-ago">${a}</div>

					<div class="ex-llt-time-exact">${i}</div>

                    <button type="button" class="ex-llt-close" aria-label="关闭">×</button>

				`),
                  owner.listen(o
                    .querySelector(".ex-llt-close"), "click", (e) => {
                      (e.stopPropagation(),
                        (t.style.opacity = "0"),
                        (t.style.transition = "opacity 0.3s ease"),
                        (o.style.transform = "translateY(10px) scale(0.95)"),
                        owner.timeout(() => t.remove(), 300));
                    }),
                  t.appendChild(o),
                  e.appendChild(t));
              }
            }
          }, 1e3);
      }
    }
  }

}
