function* (__imports) {
yield {"La": { get: () => La, set: value => { La = value; } },
"Na": { get: () => Na, set: value => { Na = value; } },
"refreshPipCombos": { get: () => refreshPipCombos, set: value => { refreshPipCombos = value; } },
"renderPipDanmaku": { get: () => renderPipDanmaku, set: value => { renderPipDanmaku = value; } },
"resetPipMergeState": { get: () => resetPipMergeState, set: value => { resetPipMergeState = value; } },
"resetPipPacketState": { get: () => resetPipPacketState, set: value => { resetPipPacketState = value; } }};
function Na(e) {
  var t = document.getElementById("__video2");
  t &&
    (e
      ? (t.style.setProperty("opacity", "0.01", "important"),
        t.style.setProperty("pointer-events", "none", "important"))
      : (t.style.removeProperty("opacity"),
        t.style.removeProperty("pointer-events")));
}
function La(t) {
  ([
    ".layout-Player-video",
    ".layout-Player-videoEntity",
    ".room-html5-player",
    ".DiamondsFansRankList",
    ".wm-view",
    ".wm-tabv2",
    ".comment-37342a",
    ".DanmuEffectDom",
    ".layout-Player-asideMainTop",
  ].forEach((e) => {
    e = document.querySelector(e);
    e &&
      (t
        ? e.style.setProperty("display", "none", "important")
        : e.style.removeProperty("display"));
  }),
    [".ChatSend-txt", ".ChatSend-button"].forEach((e) => {
      e = document.querySelector(e);
      e &&
        (t
          ? (e.style.setProperty("opacity", "0.01", "important"),
            e.style.setProperty("pointer-events", "none", "important"))
          : (e.style.removeProperty("opacity"),
            e.style.removeProperty("pointer-events")));
    }),
    t ||
      [".layout-Player", ".Barrage-list"].forEach((e) => {
        e = document.querySelector(e);
        e && e.style.removeProperty("display");
      }));
}
function resetPipPacketState() {
  if (__imports.Oi) {
    var e = __imports.Oi;
    ((__imports.Oi = null), (e.msgHandler = () => {}));
    try {
      e.close();
    } catch (e) {}
  }
}

function resetPipMergeState() {
  __imports.pipPacketTimes.clear();
}
function refreshPipCombos(n) {
  var i = n || ((n = window.__pip_window__) && !n.closed ? n : null),
    a = i?.document.getElementById("combo-container");
  if (a) {
    let t = Date.now();
    var e,
      o,
      r = [];
    for ([e, o] of __imports.pipMergeGroups.entries()) {
      var l,
        s = o.timestamps.filter((e) => t - e <= 8e3).length;
      s < 2
        ? (o.dom = null)
        : ((o.displayCount = s),
          (l = o.timestamps[o.timestamps.length - 1] || 0),
          r.push({ key: e, info: o, count: s, lastTs: l }));
    }
    (r.sort((e, t) => t.count - e.count || t.lastTs - e.lastTs),
      (a.innerHTML = ""));
    for (let [, e] of __imports.pipMergeGroups) e.dom = null;
    var d,
      c,
      n = r.slice(0, __imports.za),
      p = r.length - n.length;
    for (let { key: e, info: t, count: o } of n) {
      var m = i.document.createElement("div");
      ((m.className = "combo-item"),
        (m.title = e),
        (m.innerHTML = `${((d = e), (c = __imports.Oa), !d || d.length <= c ? d || "" : d.slice(0, c) + "…")}<span class="combo-count">×${o}</span>`),
        a.appendChild(m),
        (t.dom = m));
    }
    0 < p &&
      (((n = i.document.createElement("div")).className =
        "combo-item combo-item--more"),
      (n.textContent = `+${p} 组重复`),
      a.appendChild(n));
  }
}
function renderPipDanmaku(t, i, a, r = !1) {
  if (t && t.text) {
    let e = i.document.createElement("div");
    ((e.className = "dm" + (r ? " dm-self" : "")),
      (e.innerText = t.text),
      (e.style.fontSize = __imports.pipPreferences.fontSize + "px"),
      (e.style.color = r
        ? "#00ff66"
        : ((e) => {
            switch (e) {
              case 1:
                return "#ff3b30";
              case 2:
                return "#0a84ff";
              case 3:
                return "#34c759";
              case 4:
                return "#ff9500";
              case 5:
                return "#af52de";
              case 6:
                return "#ff2d55";
              default:
                return "#ffffff";
            }
          })(t.color)),
      (e.style.visibility = "hidden"),
      a.appendChild(e));
    var r = e.offsetWidth,
      t = i.innerWidth,
      a = ((e, t) => {
        let o = Math.floor(e.innerHeight / __imports.pipPreferences.trackHeight);
        ("half" === __imports.pipPreferences.area
          ? (o = Math.floor(o / 2))
          : "quarter" === __imports.pipPreferences.area && (o = Math.floor(o / 4)),
          (o = Math.max(1, o)),
          window.__pip_track_state__ || (window.__pip_track_state__ = []));
        var n = window.__pip_track_state__,
          i = e.innerWidth,
          e = 15 / __imports.pipPreferences.speed,
          a = Math.max(0.7 * e, Math.min(1.4 * e, e + t / 120 / __imports.pipPreferences.speed)),
          r = (i + t) / a;
        let l = -1;
        for (let e = 0; e < o; e++) {
          var s = n[e];
          if (!s)
            return (
              (n[e] = {
                textWidth: t,
                speed: r,
                startTime: Date.now(),
                duration: 1e3 * a,
              }),
              e
            );
          var d = Date.now() - s.startTime;
          if (d >= s.duration)
            return (
              (n[e] = {
                textWidth: t,
                speed: r,
                startTime: Date.now(),
                duration: 1e3 * a,
              }),
              e
            );
          var c = i - s.speed * (d / 1e3),
            p = c + s.textWidth;
          if (!(i - 16 < p)) {
            if (r > s.speed) {
              p = s.duration - d;
              if (1e3 * (c / (r - s.speed)) < p) continue;
            }
            l = e;
            break;
          }
        }
        if (-1 === l) {
          let t = 1 / 0;
          for (let e = 0; e < o; e++) {
            var m = n[e];
            if (!m) {
              l = e;
              break;
            }
            var u = Date.now() - m.startTime,
              u = i - m.speed * (u / 1e3) + m.textWidth;
            u < t && ((t = u), (l = e));
          }
        }
        return (
          (n[l] = {
            textWidth: t,
            speed: r,
            startTime: Date.now(),
            duration: 1e3 * a,
          }),
          l
        );
      })(i, r),
      l = a * __imports.pipPreferences.trackHeight,
      a = window.__pip_track_state__[a].duration / 1e3;
    ((e.style.top = l + "px"),
      (e.style.left = t + "px"),
      (e.style.visibility = "visible"));
    let o = "exPipMove_" + Math.random().toString(36).substring(2, 9);
    l = i.document;
    let n = l.getElementById("ex-danmaku-styles");
    (n ||
      (((n = l.createElement("style")).id = "ex-danmaku-styles"),
      l.head.appendChild(n)),
      n.sheet.insertRule(
        `

        @keyframes ${o} {

            from { transform: translateX(0); }

            to { transform: translateX(-${t + r + 30}px); }

        }

    `,
        0,
      ),
      (e.style.animation = o + ` ${a}s linear forwards`),
      e.addEventListener("animationend", () => {
        e.remove();
        try {
          var t = n.sheet;
          for (let e = 0; e < t.cssRules.length; e++)
            if (t.cssRules[e].name === o) {
              t.deleteRule(e);
              break;
            }
        } catch (e) {}
      }));
  }
}

}
