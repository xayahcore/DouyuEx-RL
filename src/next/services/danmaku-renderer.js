function* (__imports) {
yield {"D": { get: () => D, set: value => { D = value; } },
"an": { get: () => an, set: value => { an = value; } },
"en": { get: () => en, set: value => { en = value; } },
"f": { get: () => f, set: value => { f = value; } },
"on": { get: () => on, set: value => { on = value; } },
"rn": { get: () => rn, set: value => { rn = value; } },
"tn": { get: () => tn, set: value => { tn = value; } }};
var D = [];
function en(e, t, o) {
  switch (o) {
    case "Douyu":
      nn(e, t);
      break;
    case "Bilibili":
      ((g = e),
        (0, __imports.Vr)((h = t), "1", 0, (e) => {
          if ("" != e || null != e) {
            var t = document.createElement("div"),
              o = "",
              o =
                ((t.id = "exVideoDiv" + String(g)),
                (t.rid = h),
                (t.className = "exVideoDiv"),
                (o =
                  (o =
                    (o =
                      (o =
                        (o =
                          (o =
                            (o =
                              (o +=
                                "<div class='exVideoInfo' id='exVideoInfo" +
                                String(g) +
                                "'><a title='进入直播间' target='_blank' href='https://live.bilibili.com/" +
                                h +
                                "'><span class='exVideoRID' id='exVideoRID" +
                                String(g) +
                                "' style='color:white'>Bilibili - " +
                                h +
                                "</span></a>") +
                              ("<select class='exVideoQn' id='exVideoQn" +
                                String(g) +
                                "'><option value='1'>流畅</option><option value='2'>高清</option><option value='3'>超清</option><option value='4'>蓝光</option><option value='5'>原画</option></select>")) +
                            ("<select class='exVideoCDN' id='exVideoCDN" +
                              String(g) +
                              "'><option value='1'>主线路</option><option value='2'>备用线路1</option><option value='3'>备用线路2</option><option value='4'>备用线路3</option></select>")) +
                          `<input id='exVideoEmbed${String(g)}' type='button' value='    ' style='height:30px;'>`) +
                        `<input id='exVideoUnEmbed${String(g)}' type='button' value='恢复视频' style='height:30px;display:none;'>`) +
                      `<input id='exVideoCopy${String(g)}' type='button' value='复制直播流' style='height:30px;'>`) +
                    ("<a><div class='exVideoClose' id='exVideoClose" +
                      String(g) +
                      "'>X</div></a>") +
                    "</div>") +
                  ("<video controls='controls' class='exVideoPlayer' id='exVideoPlayer" +
                    String(g) +
                    "'></video><div class='exVideoScale' id='exVideoScale" +
                    String(g) +
                    "'></div>")),
                (t.innerHTML = o),
                (0, __imports.E)([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"]));
            (o.insertBefore(t, o.childNodes[0]), on(g), tn(g));
            {
              var p = g;
              var m = h;
              let e = document.getElementById("exVideoDiv" + String(p)),
                t = document.getElementById("exVideoPlayer" + String(p)),
                o = document.getElementById("exVideoInfo" + String(p)),
                n = document.getElementById("exVideoScale" + String(p)),
                i =
                  ((t.onclick = function (e) {
                    (e.stopPropagation(),
                      e.preventDefault(),
                      "block" != n.style.display
                        ? ((n.style.display = "block"),
                          (o.style.display = "block"))
                        : ((n.style.display = "none"),
                          (o.style.display = "none")));
                    for (let e = 0; e < D.length; e++) {
                      var t = document.getElementById("exVideoDiv" + String(e));
                      null != t &&
                        (e == p
                          ? (t.style.zIndex = 1016)
                          : (t.style.zIndex = 1428));
                    }
                  }),
                  document.getElementById("exVideoQn" + String(p))),
                a = document.getElementById("exVideoCDN" + String(p)),
                r = document.getElementById("exVideoClose" + String(p)),
                l = document.getElementById("exVideoEmbed" + String(p)),
                s = document.getElementById("exVideoUnEmbed" + String(p)),
                d = document.getElementById("__video2"),
                c =
                  ((i.onchange = function () {
                    (0, __imports.Vr)(m, i.value, a.value, (e) => {
                      (D[p].destroy(), f(p, e));
                    });
                  }),
                  (a.onchange = function () {
                    (0, __imports.Vr)(m, i.value, a.value, (e) => {
                      (D[p].destroy(), f(p, e));
                    });
                  }),
                  (r.onclick = function () {
                    ((d.style.display = "block"),
                      D[p].destroy(),
                      t.remove(),
                      e.remove());
                  }),
                  (l.onclick = function () {
                    ((d.style.display = "none"),
                      (l.style.display = "none"),
                      (s.style.display = "inline"),
                      (e.style.height = "0px"),
                      d.parentElement.insertBefore(t, d));
                  }),
                  (s.onclick = function () {
                    ((d.style.display = "block"),
                      (s.style.display = "none"),
                      (l.style.display = "inline"),
                      (e.style.height = "250px"),
                      e.insertBefore(t, e.childNodes[e.childNodes.length - 1]));
                  }),
                  document.getElementById("exVideoCopy" + String(p)));
              c.onclick = function () {
                (0, __imports.Vr)(m, i.value, a.value, (e) => {
                  ((0, __imports.GM_setClipboard)(e), (0, __imports.T)("复制成功", "success"));
                });
              };
            }
            f(g, e);
          }
        }));
      break;
    case "Huya":
      var n = String(t).split("/");
      ((m = e),
        (u = n[n.length - 1]),
        (i = n[n.length - 1]),
        (0, __imports.Ur)(u, "1", (e, t) => {
          if ("" != e || null != e)
            if ("" != t) (0, __imports.T)(t, "error");
            else {
              var t = document.createElement("div"),
                o = "",
                o =
                  ((t.id = "exVideoDiv" + String(m)),
                  (t.rid = u),
                  (t.className = "exVideoDiv"),
                  (o =
                    (o =
                      (o =
                        (o =
                          (o =
                            (o =
                              (o +=
                                "<div class='exVideoInfo' id='exVideoInfo" +
                                String(m) +
                                "'><a title='进入直播间' target='_blank' href='" +
                                u +
                                "'><span class='exVideoRID' id='exVideoRID" +
                                String(m) +
                                "' style='color:white'>Huya - " +
                                i +
                                "</span></a>") +
                              ("<select class='exVideoQn' id='exVideoQn" +
                                String(m) +
                                "'><option value='1'>流畅</option><option value='2'>超清</option><option value='3'>蓝光4M</option><option value='4'>原画</option></select>")) +
                            `<input id='exVideoEmbed${String(m)}' type='button' value='嵌入视频' style='height:30px;'>`) +
                          `<input id='exVideoUnEmbed${String(m)}' type='button' value='恢复视频' style='height:30px;display:none;'>`) +
                        `<input id='exVideoCopy${String(m)}' type='button' value='复制直播流' style='height:30px;'>`) +
                      ("<a><div class='exVideoClose' id='exVideoClose" +
                        String(m) +
                        "'>X</div></a>") +
                      "</div>") +
                    ("<video controls='controls' class='exVideoPlayer' id='exVideoPlayer" +
                      String(m) +
                      "'></video><div class='exVideoScale' id='exVideoScale" +
                      String(m) +
                      "'></div>")),
                  (t.innerHTML = o),
                  (0, __imports.E)([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"]));
              (o.insertBefore(t, o.childNodes[0]), on(m), tn(m));
              {
                var c = m;
                var p = u;
                let e = document.getElementById("exVideoDiv" + String(c)),
                  t = document.getElementById("exVideoPlayer" + String(c)),
                  o = document.getElementById("exVideoInfo" + String(c)),
                  n = document.getElementById("exVideoScale" + String(c)),
                  i = document.getElementById("exVideoEmbed" + String(c)),
                  a = document.getElementById("exVideoUnEmbed" + String(c)),
                  r =
                    ((t.onclick = function (e) {
                      (e.stopPropagation(),
                        e.preventDefault(),
                        "block" != n.style.display
                          ? ((n.style.display = "block"),
                            (o.style.display = "block"))
                          : ((n.style.display = "none"),
                            (o.style.display = "none")));
                      for (let e = 0; e < D.length; e++) {
                        var t = document.getElementById(
                          "exVideoDiv" + String(e),
                        );
                        null != t &&
                          (e == c
                            ? (t.style.zIndex = 1016)
                            : (t.style.zIndex = 1428));
                      }
                    }),
                    document.getElementById("exVideoQn" + String(c))),
                  l = document.getElementById("exVideoClose" + String(c)),
                  s = document.getElementById("__video2"),
                  d =
                    ((r.onchange = function () {
                      (0, __imports.Ur)(p, r.value, (e, t) => {
                        "" != t ? (0, __imports.T)(t, "error") : (D[c].destroy(), f(c, e));
                      });
                    }),
                    (l.onclick = function () {
                      ((s.style.display = "block"),
                        D[c].destroy(),
                        t.remove(),
                        e.remove());
                    }),
                    document.getElementById("exVideoCopy" + String(c)));
                ((d.onclick = function () {
                  (0, __imports.Ur)(p, r.value, (e, t) => {
                    "" != t
                      ? (0, __imports.T)(t, "error")
                      : ((0, __imports.GM_setClipboard)(e), (0, __imports.T)("复制成功", "success"));
                  });
                }),
                  (i.onclick = function () {
                    ((s.style.display = "none"),
                      (i.style.display = "none"),
                      (a.style.display = "inline"),
                      (e.style.height = "0px"),
                      s.parentElement.insertBefore(t, s));
                  }),
                  (a.onclick = function () {
                    ((s.style.display = "block"),
                      (a.style.display = "none"),
                      (i.style.display = "inline"),
                      (e.style.height = "250px"),
                      e.insertBefore(t, e.childNodes[e.childNodes.length - 1]));
                  }));
              }
              f(m, e);
            }
        }));
      break;
    default:
      nn(e, t);
  }
  var m, u, i, g, h;
}
function f(e, t) {
  if ("undefined" == typeof flvjs)
    return void (0, __imports.ExLoadLib)(__imports.EXURL.flv, () => f(e, t));
  var o;
  flvjs.isSupported() &&
    ((o = document.getElementById("exVideoPlayer" + String(e))),
    (t = flvjs.createPlayer(
      { type: "flv", url: t },
      { fixAudioTimestampGap: !1 },
    )),
    e > D.length - 1 ? D.push(t) : (D[e] = t),
    t.attachMediaElement(o),
    t.load(),
    t.play());
}
function tn(e) {
  let i = document.getElementById("exVideoDiv" + String(e));
  document.getElementById("exVideoScale" + String(e)).onmousedown = function (
    e,
  ) {
    (e.stopPropagation(), e.preventDefault());
    let t = { w: i.offsetWidth, h: i.offsetHeight, x: e.clientX, y: e.clientY },
      o,
      n;
    ((document.onmousemove = function (e) {
      (e.stopPropagation(),
        e.preventDefault(),
        (o = Math.max(400, e.clientX - t.x + t.w)),
        (n = Math.max(0, e.clientY - t.y + t.h)),
        (o =
          o >= document.offsetWidth - i.offsetLeft
            ? document.offsetWidth - i.offsetLeft
            : o),
        (n =
          n >= document.offsetHeight - i.offsetTop
            ? document.offsetHeight - i.offsetTop
            : n),
        (i.style.width = o + "px"),
        (i.style.height = n + "px"));
    }),
      (document.onmouseup = function (e) {
        (e.stopPropagation(),
          e.preventDefault(),
          (document.onmousemove = null),
          (document.onmouseup = null));
      }));
  };
}
function on(e) {
  let a = document.getElementById("exVideoDiv" + String(e));
  a.onmousedown = function (e) {
    e.stopPropagation();
    let t = e.clientX - a.offsetLeft,
      o = e.clientY - a.offsetTop,
      n,
      i;
    ((document.onmousemove = function (e) {
      (e.stopPropagation(),
        (n = e.clientX - t),
        (i = e.clientY - o),
        (a.style.left = n + "px"),
        (a.style.top = i + "px"));
    }),
      (document.onmouseup = function (e) {
        (e.stopPropagation(),
          (document.onmousemove = null),
          (document.onmouseup = null));
      }));
  };
}
function nn(i, a) {
  (0, __imports.qr)(a, !0, 0, "1", (t) => {
    if ("" != t || null != t)
      if ("None" == t) (0, __imports.T)("房间未开播或其他错误", "error");
      else {
        var o = String(t).split("/live");
        let e = "";
        0 < o.length && (e = o[0]);
        var o = document.createElement("div"),
          n = "",
          n =
            ((o.id = "exVideoDiv" + String(i)),
            (o.rid = a),
            (o.className = "exVideoDiv"),
            (n =
              (n =
                (n =
                  (n =
                    (n =
                      (n =
                        (n =
                          (n =
                            (n +=
                              "<div class='exVideoInfo' id='exVideoInfo" +
                              String(i) +
                              "'><a title='进入直播间' target='_blank' href='https://www.douyu.com/" +
                              a +
                              "'><span class='exVideoRID' id='exVideoRID" +
                              String(i) +
                              "' style='color:white'>斗鱼 - " +
                              a +
                              "</span></a>") +
                            ("<select class='exVideoQn' id='exVideoQn" +
                              String(i) +
                              "'><option value='2'>高清</option><option value='3'>超清</option><option value='4'>蓝光4M</option><option value='8'>蓝光8M</option></option><option value='0'>原画</option></select>")) +
                          ("<select style='display:none' class='exVideoCDN' id='exVideoCDN" +
                            String(i) +
                            "'><option value='1'>主线路</option><option value='2'>备用线路5</option><option value='3'>备用线路6</option></select>")) +
                        ("<a style='margin-left:5px' href='" +
                          e +
                          "' target='_blank'>无视频？</a>")) +
                      `<input id='exVideoEmbed${String(i)}' type='button' value='嵌入视频' style='height:30px;'>`) +
                    `<input id='exVideoUnEmbed${String(i)}' type='button' value='恢复视频' style='height:30px;display:none;'>`) +
                  `<input id='exVideoCopy${String(i)}' type='button' value='复制直播流' style='height:30px;'>`) +
                ("<a><div class='exVideoClose' id='exVideoClose" +
                  String(i) +
                  "'>X</div></a>") +
                "</div>") +
              ("<video controls='controls' class='exVideoPlayer' id='exVideoPlayer" +
                String(i) +
                "'></video><div class='exVideoScale' id='exVideoScale" +
                String(i) +
                "'></div>")),
            (o.innerHTML = n),
            (0, __imports.E)([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"]));
        (n.insertBefore(o, n.childNodes[0]), on(i), tn(i), an(i, a), f(i, t));
      }
  });
}
function an(o, e) {
  let t = document.getElementById("exVideoDiv" + String(o)),
    n = document.getElementById("exVideoPlayer" + String(o)),
    i = document.getElementById("exVideoInfo" + String(o)),
    a = document.getElementById("exVideoScale" + String(o)),
    r = document.getElementById("exVideoEmbed" + String(o)),
    l = document.getElementById("exVideoUnEmbed" + String(o)),
    s = document.getElementById("__video2"),
    d =
      ((n.onclick = function (e) {
        (e.stopPropagation(),
          e.preventDefault(),
          "block" != a.style.display
            ? ((a.style.display = "block"), (i.style.display = "block"))
            : ((a.style.display = "none"), (i.style.display = "none")));
        for (let e = 0; e < D.length; e++) {
          var t = document.getElementById("exVideoDiv" + String(e));
          null != t &&
            (e == o ? (t.style.zIndex = 1016) : (t.style.zIndex = 1428));
        }
      }),
      document.getElementById("exVideoQn" + String(o)));
  var c = document.getElementById("exVideoCDN" + String(o)),
    p = document.getElementById("exVideoClose" + String(o));
  ((d.onchange = function () {
    (0, __imports.qr)(e, !0, 0, d.value, (e) => {
      (D[o].destroy(), f(o, e));
    });
  }),
    (c.onchange = function () {
      (0, __imports.qr)(e, !0, 0, d.value, (e) => {
        (D[o].destroy(), f(o, e));
      });
    }),
    (p.onclick = function () {
      ((s.style.display = "block"), D[o].destroy(), n.remove(), t.remove());
    }));
  let m =
    document.getElementById("exVideoCopy" + String(o)) ||
    document.getElementById("exVideoRID" + String(o));
  (m &&
    (m.onclick = function () {
      (0, __imports.qr)(e, !m.innerHTML.includes("斗鱼音频流"), 0, d.value, (e) => {
        ((0, __imports.GM_setClipboard)(String(e).replace("https", "http")),
          (0, __imports.T)("复制成功", "success"));
      });
    }),
    r &&
      (r.onclick = function () {
        ((s.style.display = "none"),
          (r.style.display = "none"),
          (l.style.display = "inline"),
          (t.style.height = "0px"),
          s.parentElement.insertBefore(n, s));
      }),
    l &&
      (l.onclick = function () {
        ((s.style.display = "block"),
          (l.style.display = "none"),
          (r.style.display = "inline"),
          (t.style.height = "250px"),
          t.insertBefore(n, t.childNodes[t.childNodes.length - 1]));
      }));
}
function rn(s, e) {
  if ("" != e && null != e) {
    var t = document.createElement("div"),
      o = "",
      o =
        ((t.id = "exVideoDiv" + String(s)),
        (t.rid = __imports.B),
        (t.className = "exVideoDiv"),
        (o =
          (o =
            (o =
              (o =
                (o =
                  (o +=
                    "<div class='exVideoInfo' id='exVideoInfo" +
                    String(s) +
                    "'><span class='exVideoRID' id='exVideoRID" +
                    String(s) +
                    "' style='color:white'>直播流" +
                    String(s) +
                    "</span>") +
                  `<input id='exVideoEmbed${String(s)}' type='button' value='嵌入视频' style='height:30px;'>`) +
                `<input id='exVideoUnEmbed${String(s)}' type='button' value='恢复视频' style='height:30px;display:none;'>`) +
              `<input id='exVideoCopy${String(s)}' type='button' value='复制直播流' style='height:30px;'>`) +
            ("<a><div class='exVideoClose' id='exVideoClose" +
              String(s) +
              "'>X</div></a>") +
            "</div>") +
          ("<video controls='controls' class='exVideoPlayer' id='exVideoPlayer" +
            String(s) +
            "'></video><div class='exVideoScale' id='exVideoScale" +
            String(s) +
            "'></div>")),
        (t.innerHTML = o),
        (0, __imports.E)([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"]));
    (o.insertBefore(t, o.childNodes[0]), on(s), tn(s), f(s, e));
    {
      var d = s;
      let e = document.getElementById("exVideoDiv" + String(d)),
        t = document.getElementById("exVideoPlayer" + String(d)),
        o = document.getElementById("exVideoInfo" + String(d)),
        n = document.getElementById("exVideoScale" + String(d)),
        i = document.getElementById("exVideoEmbed" + String(d)),
        a = document.getElementById("exVideoUnEmbed" + String(d)),
        r =
          ((t.onclick = function (e) {
            (e.stopPropagation(),
              e.preventDefault(),
              "block" != n.style.display
                ? ((n.style.display = "block"), (o.style.display = "block"))
                : ((n.style.display = "none"), (o.style.display = "none")));
            for (let e = 0; e < D.length; e++) {
              var t = document.getElementById("exVideoDiv" + String(e));
              null != t &&
                (e == d ? (t.style.zIndex = 1016) : (t.style.zIndex = 1428));
            }
          }),
          document.getElementById("exVideoClose" + String(d))),
        l = document.getElementById("__video2");
      ((r.onclick = function () {
        ((l.style.display = "block"), D[d].destroy(), t.remove(), e.remove());
      }),
        (i.onclick = function () {
          ((l.style.display = "none"),
            (i.style.display = "none"),
            (a.style.display = "inline"),
            (e.style.height = "0px"),
            l.parentElement.insertBefore(t, l));
        }),
        (a.onclick = function () {
          ((l.style.display = "block"),
            (a.style.display = "none"),
            (i.style.display = "inline"),
            (e.style.height = "250px"),
            e.insertBefore(t, e.childNodes[e.childNodes.length - 1]));
        }));
    }
  }
}

}
