function* (__imports) {
yield {"Fr": { get: () => Fr, set: value => { Fr = value; } },
"g": { get: () => g, set: value => { g = value; } },
"h": { get: () => h, set: value => { h = value; } },
"p": { get: () => p, set: value => { p = value; } },
"u": { get: () => u, set: value => { u = value; } }};
function Rr(e, t, o, n, i, a) {
  return Fr(((t = Fr(Fr(t, e), Fr(n, a))) << i) | (t >>> (32 - i)), o);
}
function p(e, t, o, n, i, a, r) {
  return Rr((t & o) | (~t & n), e, t, i, a, r);
}
function u(e, t, o, n, i, a, r) {
  return Rr((t & n) | (o & ~n), e, t, i, a, r);
}
function g(e, t, o, n, i, a, r) {
  return Rr(t ^ o ^ n, e, t, i, a, r);
}
function h(e, t, o, n, i, a, r) {
  return Rr(o ^ (t | ~n), e, t, i, a, r);
}
function Fr(e, t) {
  var o = (65535 & e) + (65535 & t);
  return ((e = (e >> 16) + (t >> 16) + (o >> 16)) << 16) | (65535 & o);
}
((__imports.n = "undefined" != typeof self ? self : this),
  (__imports.t = function () {
    return (
      (o = [
        function (e, t, o) {
          (Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.noticeJsModalClassName = "noticejs-modal"),
            (t.closeAnimation = "noticejs-fadeOut"),
            (t.Defaults = {
              title: "",
              text: "",
              type: "success",
              position: "topRight",
              timeout: 30,
              progressBar: !0,
              closeWith: ["button"],
              animation: null,
              modal: !1,
              scroll: { maxHeight: 300, showOnHover: !0 },
              rtl: !1,
              callbacks: {
                beforeShow: [],
                onShow: [],
                afterShow: [],
                onClose: [],
                afterClose: [],
                onClick: [],
                onHover: [],
                onTemplate: [],
              },
            }));
        },
        function (e, t, o) {
          (Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.appendNoticeJs =
              t.addListener =
              t.CloseItem =
              t.AddModal =
                void 0),
            (t.getCallback = r));
          var n = ((e) => {
            if (e && e.__esModule) return e;
            var t = {};
            if (null != e)
              for (var o in e)
                Object.prototype.hasOwnProperty.call(e, o) && (t[o] = e[o]);
            return ((t.default = e), t);
          })((o = o(0)));
          var a = n.Defaults;
          function r(t, e) {
            t.callbacks.hasOwnProperty(e) &&
              t.callbacks[e].forEach(function (e) {
                "function" == typeof e && e.apply(t);
              });
          }
          var l = (t.AddModal = function () {
              var e;
              document.getElementsByClassName(n.noticeJsModalClassName)
                .length <= 0 &&
                ((e = document.createElement("div")).classList.add(
                  n.noticeJsModalClassName,
                ),
                e.classList.add("noticejs-modal-open"),
                document.body.appendChild(e),
                (0, __imports.setTimeout)(function () {
                  e.className = n.noticeJsModalClassName;
                }, 200));
            }),
            i = (t.CloseItem = function (e) {
              (r(a, "onClose"),
                null !== a.animation &&
                  null !== a.animation.close &&
                  (e.className += " " + a.animation.close),
                (0, __imports.setTimeout)(function () {
                  e.remove();
                }, 200),
                !0 === a.modal &&
                  1 <=
                    document.querySelectorAll("[noticejs-modal='true']")
                      .length &&
                  ((document.querySelector(".noticejs-modal").className +=
                    " noticejs-modal-close"),
                  (0, __imports.setTimeout)(function () {
                    document.querySelector(".noticejs-modal").remove();
                  }, 500)));
              var t =
                "." +
                e.closest(".noticejs").className.replace("noticejs", "").trim();
              (0, __imports.setTimeout)(function () {
                var e;
                document.querySelectorAll(t + " .item").length <= 0 &&
                  null != (e = document.querySelector(t)) &&
                  e.remove();
              }, 500);
            }),
            s = (t.addListener = function (t) {
              (a.closeWith.includes("button") &&
                t
                  .querySelector(".close")
                  .addEventListener("click", function () {
                    i(t);
                  }),
                a.closeWith.includes("click")
                  ? ((t.style.cursor = "pointer"),
                    t.addEventListener("click", function (e) {
                      "close" !== e.target.className && (r(a, "onClick"), i(t));
                    }))
                  : t.addEventListener("click", function (e) {
                      "close" !== e.target.className && r(a, "onClick");
                    }),
                t.addEventListener("mouseover", function () {
                  r(a, "onHover");
                }));
            });
          t.appendNoticeJs = function (e, t, o) {
            var n = ".noticejs-" + a.position,
              i = document.createElement("div");
            return (
              i.classList.add("item"),
              i.classList.add(a.type),
              !0 === a.rtl && i.classList.add("noticejs-rtl"),
              e && "" !== e && i.appendChild(e),
              i.appendChild(t),
              o && "" !== o && i.appendChild(o),
              ["top", "bottom"].includes(a.position) &&
                (document.querySelector(n).innerHTML = ""),
              null !== a.animation &&
                null !== a.animation.open &&
                (i.className += " " + a.animation.open),
              !0 === a.modal && (i.setAttribute("noticejs-modal", "true"), l()),
              s(i, a.closeWith),
              r(a, "beforeShow"),
              r(a, "onShow"),
              document.querySelector(n).appendChild(i),
              r(a, "afterShow"),
              i
            );
          };
        },
        function (e, t, o) {
          Object.defineProperty(t, "__esModule", { value: !0 });
          var n = function (e, t, o) {
            return (t && i(e.prototype, t), o && i(e, o), e);
          };
          function i(e, t) {
            for (var o = 0; o < t.length; o++) {
              var n = t[o];
              ((n.enumerable = n.enumerable || !1),
                (n.configurable = !0),
                "value" in n && (n.writable = !0),
                Object.defineProperty(e, n.key, n));
            }
          }
          var a = o(3),
            r = ((a = a) && a.__esModule, d(o(0))),
            l = o(4),
            s = d(o(1));
          function d(e) {
            if (e && e.__esModule) return e;
            var t = {};
            if (null != e)
              for (var o in e)
                Object.prototype.hasOwnProperty.call(e, o) && (t[o] = e[o]);
            return ((t.default = e), t);
          }
          function c() {
            var e =
                0 < arguments.length && void 0 !== arguments[0]
                  ? arguments[0]
                  : {},
              t = this,
              o = c;
            if (t instanceof o)
              return (
                (this.options = Object.assign(r.Defaults, e)),
                (this.component = new l.Components()),
                this.on("beforeShow", this.options.callbacks.beforeShow),
                this.on("onShow", this.options.callbacks.onShow),
                this.on("afterShow", this.options.callbacks.afterShow),
                this.on("onClose", this.options.callbacks.onClose),
                this.on("afterClose", this.options.callbacks.afterClose),
                this.on("onClick", this.options.callbacks.onClick),
                this.on("onHover", this.options.callbacks.onHover),
                this
              );
            throw new TypeError("Cannot call a class as a function");
          }
          (n(c, [
            {
              key: "show",
              value: function () {
                var e = this.component.createContainer(),
                  t =
                    (null ===
                      document.querySelector(
                        ".noticejs-" + this.options.position,
                      ) && document.body.appendChild(e),
                    void 0),
                  e = this.component.createHeader(
                    this.options.title,
                    this.options.closeWith,
                  ),
                  o = this.component.createBody(this.options.text);
                return (
                  !0 === this.options.progressBar &&
                    (t = this.component.createProgressBar()),
                  s.appendNoticeJs(e, o, t)
                );
              },
            },
            {
              key: "on",
              value: function (e) {
                var t =
                  1 < arguments.length && void 0 !== arguments[1]
                    ? arguments[1]
                    : function () {};
                return (
                  "function" == typeof t &&
                    this.options.callbacks.hasOwnProperty(e) &&
                    this.options.callbacks[e].push(t),
                  this
                );
              },
            },
          ]),
            (t.default = o = c),
            (e.exports = t.default));
        },
        function (e, t) {},
        function (e, t, o) {
          (Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.Components = void 0));
          var n = function (e, t, o) {
            return (t && i(e.prototype, t), o && i(e, o), e);
          };
          function i(e, t) {
            for (var o = 0; o < t.length; o++) {
              var n = t[o];
              ((n.enumerable = n.enumerable || !1),
                (n.configurable = !0),
                "value" in n && (n.writable = !0),
                Object.defineProperty(e, n.key, n));
            }
          }
          var a = l(o(0)),
            r = l((o = o(1)));
          function l(e) {
            if (e && e.__esModule) return e;
            var t = {};
            if (null != e)
              for (var o in e)
                Object.prototype.hasOwnProperty.call(e, o) && (t[o] = e[o]);
            return ((t.default = e), t);
          }
          var s = a.Defaults;
          function d() {
            if (!(this instanceof d))
              throw new TypeError("Cannot call a class as a function");
          }
          t.Components =
            (n(d, [
              {
                key: "createContainer",
                value: function () {
                  var e = "noticejs-" + s.position,
                    t = document.createElement("div");
                  return (t.classList.add("noticejs"), t.classList.add(e), t);
                },
              },
              {
                key: "createHeader",
                value: function () {
                  var e,
                    t = void 0;
                  return (
                    s.title &&
                      "" !== s.title &&
                      ((t = document.createElement("div")).setAttribute(
                        "class",
                        "noticejs-heading",
                      ),
                      (t.textContent = s.title)),
                    s.closeWith.includes("button") &&
                      ((e = document.createElement("div")).setAttribute(
                        "class",
                        "close",
                      ),
                      (e.innerHTML = "&times;"),
                      t ? t.appendChild(e) : (t = e)),
                    t
                  );
                },
              },
              {
                key: "createBody",
                value: function () {
                  var e = document.createElement("div"),
                    t =
                      (e.setAttribute("class", "noticejs-body"),
                      document.createElement("div"));
                  return (
                    t.setAttribute("class", "noticejs-content"),
                    (t.innerHTML = s.text),
                    e.appendChild(t),
                    null !== s.scroll &&
                      "" !== s.scroll.maxHeight &&
                      ((e.style.overflowY = "auto"),
                      (e.style.maxHeight = s.scroll.maxHeight + "px"),
                      !0 === s.scroll.showOnHover) &&
                      (e.style.visibility = "hidden"),
                    e
                  );
                },
              },
              {
                key: "createProgressBar",
                value: function () {
                  var o,
                    n,
                    i = document.createElement("div"),
                    a =
                      (i.setAttribute("class", "noticejs-progressbar"),
                      document.createElement("div"));
                  return (
                    a.setAttribute("class", "noticejs-bar"),
                    i.appendChild(a),
                    !0 === s.progressBar &&
                      "boolean" != typeof s.timeout &&
                      !1 !== s.timeout &&
                      ((o = 100),
                      (n = (0, __imports.setInterval)(function () {
                        var e, t;
                        o <= 0
                          ? ((0, __imports.clearInterval)(n),
                            (e = i.closest("div.item")),
                            null !== s.animation && null !== s.animation.close
                              ? ((e.className = e.className.replace(
                                  new RegExp(
                                    "(?:^|\\s)" +
                                      s.animation.open +
                                      "(?:\\s|$)",
                                  ),
                                  " ",
                                )),
                                (e.className += " " + s.animation.close),
                                (t = parseInt(s.timeout) + 500),
                                (0, __imports.setTimeout)(function () {
                                  r.CloseItem(e);
                                }, t))
                              : r.CloseItem(e))
                          : (o--, (a.style.width = o + "%"));
                      }, s.timeout))),
                    i
                  );
                },
              },
            ]),
            d);
        },
      ]),
      (i = {}),
      (n.m = o),
      (n.c = i),
      (n.d = function (e, t, o) {
        n.o(e, t) ||
          Object.defineProperty(e, t, {
            configurable: !1,
            enumerable: !0,
            get: o,
          });
      }),
      (n.n = function (e) {
        var t =
          e && e.__esModule
            ? function () {
                return e.default;
              }
            : function () {
                return e;
              };
        return (n.d(t, "a", t), t);
      }),
      (n.o = function (e, t) {
        return Object.prototype.hasOwnProperty.call(e, t);
      }),
      (n.p = "dist/"),
      n((n.s = 2))
    );
    function n(e) {
      var t;
      return (
        i[e] ||
        ((t = i[e] = { i: e, l: !1, exports: {} }),
        o[e].call(t.exports, t, t.exports, n),
        (t.l = !0),
        t)
      ).exports;
    }
    var o, i;
  }),
  "object" == typeof exports && "object" == typeof module
    ? (module.exports = (0, __imports.t)())
    : "function" == typeof define && define.amd
      ? define("NoticeJs", [], __imports.t)
      : "object" == typeof exports
        ? (exports.NoticeJs = (0, __imports.t)())
        : (__imports.n.NoticeJs = (0, __imports.t)()));

}
