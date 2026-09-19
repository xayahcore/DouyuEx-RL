function* (__imports) {
yield {"_n": { get: () => _n, set: value => { _n = value; } },
"vn": { get: () => vn, set: value => { vn = value; } },
"wn": { get: () => wn, set: value => { wn = value; } },
"xn": { get: () => xn, set: value => { xn = value; } }};
let vn = 0;
function xn() {
  (0, __imports.tl)(
    "Ex_Style_RemoveMsgNotice",
    ".UserInfo .Badge,.ChatLetter-PopUnread{display:none!important;}",
  );
}
function wn() {
  var t = kn(window.location.href),
    o = new URLSearchParams(window.location.search).get("exRestore");
  if (o && t !== (o = Number(o))) {
    {
      var s = t;
      var d = o;
      let e = ["web/group/head", "/follow/topic", "group/unfollowGroup"];
      function c(t) {
        return "string" == typeof t && e.some((e) => t.includes(e));
      }
      let a = __imports.unsafeWindow.XMLHttpRequest.prototype.open,
        r = __imports.unsafeWindow.XMLHttpRequest.prototype.send,
        l =
          ((__imports.unsafeWindow.XMLHttpRequest.prototype.open = function (
            e,
            t,
            o,
            n,
            i,
          ) {
            return (
              "string" == typeof t &&
                t.includes(s) &&
                !c(t) &&
                (t = t.replace(new RegExp(s, "g"), d)),
              a.call(this, e, t, o, n, i)
            );
          }),
          (__imports.unsafeWindow.XMLHttpRequest.prototype.send = function (e) {
            var t = this.responseURL || this._url || "";
            if (!c(t))
              if (e && "string" == typeof e && e.includes(s))
                e = e.replace(new RegExp(s, "g"), d);
              else if (e && e instanceof FormData) {
                var o,
                  n = new FormData();
                for (o of e.entries()) {
                  var i = o[0];
                  let e = o[1];
                  ("string" == typeof e &&
                    e.includes(s) &&
                    (e = e.replace(new RegExp(s, "g"), d)),
                    n.append(i, e));
                }
                e = n;
              }
            return r.call(this, e);
          }),
          __imports.unsafeWindow.fetch);
      __imports.unsafeWindow.fetch = function (e, t) {
        let o = "";
        if (
          ("string" == typeof e
            ? (o = e).includes(s) &&
              !c(e) &&
              (e = e.replace(new RegExp(s, "g"), d))
            : e instanceof Request &&
              (o = e.url).includes(s) &&
              !c(o) &&
              (e = new Request(o.replace(new RegExp(s, "g"), d), e)),
          !c(o) && t && t.body)
        )
          if ("string" == typeof t.body && t.body.includes(s))
            t.body = t.body.replace(new RegExp(s, "g"), d);
          else if (t.body instanceof FormData) {
            var n,
              i = new FormData();
            for (n of t.body.entries()) {
              var a = n[0];
              let e = n[1];
              ("string" == typeof e &&
                e.includes(s) &&
                (e = e.replace(new RegExp(s, "g"), d)),
                i.append(a, e));
            }
            t.body = i;
          }
        return l.call(__imports.unsafeWindow, e, t);
      };
    }
    (async (o) => {
      if (
        (o = await ((e) =>
          new Promise((t) => {
            (0, __imports.fetch)(
              "https://yuba.douyu.com/wbapi/web/group/managersdetail?group_id=" +
                e,
            )
              .then((e) => e.json())
              .then((e) => {
                t(e);
              })
              .catch(() => {
                t(null);
              });
          }))(o))
      ) {
        o = o.data.generalOP[0];
        let e = o.avatar,
          t = o.nick_name;
        function n() {
          ((document.querySelector(".groupavatar__9mD1S .image__GNnZC").src =
            e),
            (document.getElementsByClassName("groupname__BUzOM")[0].innerText =
              t),
            (document.getElementsByClassName("groupdesc__b8-53")[0].innerText =
              t + "的鱼吧"),
            (document.title = t + "的鱼吧"));
        }
        (n(),
          new __imports.DomMutationSubscription(".groupavatar__9mD1S", !1, () => {
            n();
          }));
      }
    })(o);
  }
}
function _n() {
  let t = kn(window.location.href);
  var e;
  t &&
    ((e = t),
    new Promise((t, o) => {
      (0, __imports.fetch)("https://yuba.douyu.com/wbapi/web/group/head?group_id=" + e)
        .then((e) => e.json())
        .then((e) => {
          t(e);
        })
        .catch((e) => {
          o(e);
        });
    }).then((e) => {
      3002 == e.status_code &&
        ((e = "https://yuba.douyu.com/discussion/4815048/posts?exRestore=" + t),
        (window.location.href = e));
    }));
}
function kn(e) {
  e = e.match(/\/discussion\/(\d+)/);
  return e && e[1] ? e[1] : null;
}

}
