function* (__imports) {
yield {"$": { get: () => $, set: value => { $ = value; } },
"E": { get: () => E, set: value => { E = value; } },
"J": { get: () => J, set: value => { J = value; } },
"Q": { get: () => Q, set: value => { Q = value; } },
"T": { get: () => T, set: value => { T = value; } },
"X": { get: () => X, set: value => { X = value; } },
"_": { get: () => _, set: value => { _ = value; } },
"a": { get: () => a, set: value => { a = value; } },
"b": { get: () => b, set: value => { b = value; } },
"k": { get: () => k, set: value => { k = value; } },
"l": { get: () => l, set: value => { l = value; } },
"te": { get: () => te, set: value => { te = value; } },
"v": { get: () => v, set: value => { v = value; } },
"w": { get: () => w, set: value => { w = value; } },
"x": { get: () => x, set: value => { x = value; } }};
function b(t) {
  return new Promise((e) => (0, __imports.setTimeout)(e, t));
}
function Q(e) {
  let t = parseInt(e),
    o = 0,
    n = 0,
    i =
      (60 < t &&
        ((o = parseInt(t / 60)), (t = parseInt(t % 60)), 60 < o) &&
        ((n = parseInt(o / 60)), (o = parseInt(o % 60))),
      parseInt(t) + "秒");
  return (
    0 < o && (i = parseInt(o) + "分" + i),
    (i = 0 < n ? parseInt(n) + "小时" + i : i)
  );
}
function J(e) {
  var t = 0,
    o = 0;
  return (
    60 < (e = parseInt(e)) &&
      ((t = parseInt(e / 60)), (e = parseInt(e % 60)), 60 < t) &&
      ((o = parseInt(t / 60)), (t = parseInt(t % 60))),
    (e = "" + (parseInt(e) < 10 ? "0" + parseInt(e) : parseInt(e))),
    (e = (parseInt(t) < 10 ? "0" + parseInt(t) : parseInt(t)) + ":" + e),
    (e = (parseInt(o) < 10 ? "0" + parseInt(o) : parseInt(o)) + ":" + e)
  );
}
async function Z() {
  return !0;
}
function v(e, t, o) {
  e = e.match(new RegExp(t + "(.*?)" + o));
  return !!e && e[1];
}
function x(e) {
  try {
    var t = new RegExp("(^| )" + e + "=([^;]*)(;|$)"),
      n = document.cookie.match(t);
    return n ? unescape(n[2]) : null;
  } catch (err) {
    return null;
  }
}
function w() {
  let e = x("acf_ccn");
  var t, o, n;
  return (
    null == e &&
      ((t = "acf_ccn"),
      (o = "1"),
      (n = new Date()).setTime(n.getTime() + 108e5),
      (document.cookie =
        t + "=" + escape(o) + "; path=/; expires=" + n.toGMTString()),
      (e = "1")),
    e
  );
}
function T(e, t = "success", o) {
  e = { text: e, type: t, position: "bottomLeft", ...o };
  new NoticeJs(e).show();
}
function _(e, t = !0) {
  (0, __imports.GM_openInTab)(e, { active: t });
}
function r() {
  (-1 != navigator.userAgent.indexOf("Firefox") ||
  -1 != navigator.userAgent.indexOf("Chrome")
    ? (window.location.href = "about:blank")
    : ((window.opener = null), window.open("", "_self")),
    window.close());
}
function k(e, t) {
  var o,
    n = {
      "M+": t.getMonth() + 1,
      "d+": t.getDate(),
      "h+": t.getHours(),
      "m+": t.getMinutes(),
      "s+": t.getSeconds(),
      "q+": Math.floor((t.getMonth() + 3) / 3),
      S: t.getMilliseconds(),
    };
  for (o in (/(y+)/.test(e) &&
    (e = e.replace(
      RegExp.$1,
      (t.getFullYear() + "").substr(4 - RegExp.$1.length),
    )),
  n))
    new RegExp("(" + o + ")").test(e) &&
      (e = e.replace(
        RegExp.$1,
        1 == RegExp.$1.length ? n[o] : ("00" + n[o]).substr(("" + n[o]).length),
      ));
  return e;
}
function a(e, t) {
  return Math.floor(Math.random() * (t - e) + e);
}
function X(t, o, n) {
  window.Notification &&
    "denied" !== Notification.permission &&
    Notification.requestPermission(function (e) {
      new Notification(t, { body: o }).onclick = function () {
        n();
      };
    });
}
function K() {
  return new Promise((t) => {
    var n = x("acf_nickname");
    if (n) return t(decodeURIComponent(n));
    try {
      var e = document.querySelector(
        ".Barrage-nickName.is-self, .Header-login-avatar img, .UserInfo-nickname",
      );
      if (e) {
        var o = e.innerText || e.title || e.alt;
        if (o) return t(o.trim());
      }
    } catch (e) {}
    (0, __imports.fetch)("https://www.douyu.com/member/cp", {
      method: "GET",
      credentials: "include",
    })
      .then((e) => e.text())
      .then((e) => {
        var o = new DOMParser()
          .parseFromString(e, "text/html")
          .getElementsByClassName("uname_con")[0];
        t(o ? o.title : "");
      })
      .catch((e) => {
        t("");
      });
  });
}
function $(e) {
  if ("TEXTAREA" === e.tagName) return e.selectionStart;
  let t = 0;
  var o, n, i;
  return (
    document.selection
      ? ((n = document.selection.createRange()),
        (o = (i = e.createTextRange()).duplicate()).moveToBookmark(
          n.getBookmark(),
        ),
        o.setEndPoint("EndToEnd", i),
        (t = o.text.length))
      : window.getSelection &&
        0 < (n = window.getSelection()).rangeCount &&
        ((i = n.getRangeAt(0).cloneRange()).selectNodeContents(e),
        i.setEnd(
          0 < n.rangeCount ? n.getRangeAt(0).endContainer : e,
          0 < n.rangeCount ? n.getRangeAt(0).endOffset : 0,
        ),
        (t = i.toString().length)),
    t
  );
}
function l(e, t, o = "download.xlsx") {
  if ("undefined" == typeof XLSX)
    return void (0, __imports.ExLoadLib)(
      __imports.EXURL.xl,
      () => l(e, t, o),
      () => T("【下载弹幕】xlsx组件加载失败", "info"),
    );
  var n = [],
    e = (n.push(e, ...t), XLSX.utils.aoa_to_sheet(n)),
    i =
      ((t = e),
      ((n = { SheetNames: [(r = r || "sheet1")], Sheets: {} }).Sheets[r] = t),
      (r = { bookType: "xlsx", bookSST: !1, type: "binary" }),
      (t = XLSX.write(n, r)),
      (n = new Blob(
        [
          ((e) => {
            for (
              var t = new ArrayBuffer(e.length), o = new Uint8Array(t), n = 0;
              n != e.length;
              ++n
            )
              o[n] = 255 & e.charCodeAt(n);
            return t;
          })(t),
        ],
        { type: "application/octet-stream" },
      ))),
    e = o;
  "object" == typeof i && i instanceof Blob && (i = URL.createObjectURL(i));
  var a,
    r = document.createElement("a");
  ((r.href = i),
    (r.download = e || ""),
    window.MouseEvent
      ? (a = new MouseEvent("click"))
      : (a = document.createEvent("MouseEvents")).initMouseEvent(
          "click",
          !0,
          !1,
          window,
          0,
          0,
          0,
          0,
          0,
          !1,
          !1,
          !1,
          !1,
          0,
          null,
        ),
    r.dispatchEvent(a),
    "string" == typeof i &&
      0 === i.indexOf("blob:") &&
      (0, __imports.setTimeout)(function () {
        try {
          URL.revokeObjectURL(i);
        } catch (e) {}
      }, 1500));
}
function te() {
  var e = new Event("resize");
  window.dispatchEvent(e);
}
function E(e) {
  for (var t of e) {
    let e = null;
    if ((e = "string" == typeof t ? document.querySelector(t) : t)) return e;
  }
  return null;
}

}
