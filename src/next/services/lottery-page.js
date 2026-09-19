function* (__imports) {
yield {"jr": { get: () => jr, set: value => { jr = value; } }};
function jr() {
  var l = this;
  function s(e, t, o, n) {
    var s = this;
    ((this.aborted = !1),
      (this.threadNum = 10),
      (this.step = 0),
      (function n(a, i, r, l) {
        let e = [];
        for (let t = 0; t < s.threadNum; t++) {
          if (!a[r + t]) {
            e.push(Promise.resolve());
            break;
          }
          e.push(
            (0, __imports.fetch)(a[r + t]).catch((e) => {
              (0, __imports.fetch)(a[r + t]).catch((e) => {
                (0, __imports.fetch)(a[r + t]);
              });
            }),
          );
        }
        s.step = e.length;
        Promise.all(e)
          .then(function (e) {
            return c(
              d(e, function (e) {
                return e && e.blob;
              }),
              function (e) {
                return e.blob();
              },
            );
          })
          .then(function (e) {
            return Promise.all(e);
          })
          .then(function (e) {
            ((e = c(e, function (n, i) {
              return new Promise(function (t, e) {
                var o = new FileReader();
                (o.readAsArrayBuffer(new Blob([n], { type: "octet/stream" })),
                  o.addEventListener("loadend", function (e) {
                    (t(o.result),
                      s.onprogress &&
                        s.onprogress({
                          segment: r + i + 1,
                          total: a.length,
                          percentage: (((r + i + 1) / a.length) * 100).toFixed(
                            3,
                          ),
                          downloaded: m(
                            +p(
                              c(l, function (e) {
                                return e.byteLength;
                              }),
                              function (e, t) {
                                return e + t;
                              },
                              0,
                            ),
                          ),
                          status: "Downloading...",
                        }));
                  }));
              });
            })),
              Promise.all(e).then(function (e) {
                for (var t = 0; t < e.length; t++) l.push(e[t]);
                let o = s.step;
                (a[r + 2],
                  s.aborted
                    ? ((l = null), s.aborted())
                    : a[r + o]
                      ? s.ie
                        ? (0, __imports.setTimeout)(function () {
                            n(a, i, r + o, l);
                          }, 500)
                        : n(a, i, r + o, l)
                      : i(l));
              }));
          })
          .catch(function (e) {
            s.onerror &&
              s.onerror(
                "Something went wrong when downloading ts file, nr. " +
                  r +
                  ": " +
                  e,
              );
          });
      })(e, t, o, n));
  }
  function d(e, t) {
    for (var o = [], n = 0; n < e.length; n++) t(e[n], n) && o.push(e[n]);
    return o;
  }
  function c(e, t) {
    for (var o = e.slice(0), n = 0; n < e.length; n++) o[n] = t(e[n], n);
    return o;
  }
  function p(e, o, t) {
    var n = t;
    return (
      e.forEach(function (e, t) {
        ((e = +o(n, e, t)), (n = e));
      }),
      n
    );
  }
  function m(e) {
    for (
      var t = [
          { divider: 1e18, suffix: "EB" },
          { divider: 1e15, suffix: "PB" },
          { divider: 1e12, suffix: "TB" },
          { divider: 1e9, suffix: "GB" },
          { divider: 1e6, suffix: "MB" },
          { divider: 1e3, suffix: "kB" },
        ],
        o = 0;
      o < t.length;
      o++
    )
      if (e >= t[o].divider)
        return (
          (e / t[o].divider).toString().toString().split(".")[0] + t[o].suffix
        );
    return e.toString();
  }
  ((this.ie = 0 < navigator.appVersion.toString().indexOf(".NET")),
    (this.ios =
      navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform)),
    (this.start = function (e, i) {
      i = i || {};
      var a,
        o,
        n = { progress: null, finished: null, error: null, aborted: null };
      function r(e, t) {
        e && n[e] && n[e](t);
      }
      return l.ios
        ? r("error", "Downloading on IOS is not supported.")
        : ((o = {
            on: function (e, t) {
              switch (e) {
                case "progress":
                  n.progress = t;
                  break;
                case "finished":
                  n.finished = t;
                  break;
                case "error":
                  n.error = t;
                  break;
                case "aborted":
                  n.aborted = t;
              }
              return o;
            },
            abort: function () {
              a &&
                (a.aborted = function () {
                  r("aborted");
                });
            },
          }),
          new Promise(function (o, t) {
            var n = new URL(e);
            (0, __imports.fetch)(e)
              .then(function (e) {
                return e.text();
              })
              .then(function (e) {
                if (
                  !(e = c(
                    (e = d(e.split(/(\r\n|\r|\n)/gi), function (e) {
                      return -1 < e.indexOf(".ts");
                    })),
                    function (e, t) {
                      return 0 === e.indexOf("http") || 0 === e.indexOf("ftp")
                        ? e
                        : n.protocol +
                            "//" +
                            n.host +
                            n.pathname +
                            "/./../" +
                            e;
                    },
                  )).length
                )
                  return (
                    t("Invalid m3u8 playlist"),
                    r("error", "Invalid m3u8 playlist")
                  );
                (a = new s(
                  e,
                  function (e) {
                    var t;
                    ((e = new Blob(e, { type: "octet/stream" })),
                      r("progress", { status: "Processing..." }),
                      i.returnBlob
                        ? (r("finished", {
                            status: "Successfully downloaded video",
                            data: e,
                          }),
                          o(e))
                        : l.ios ||
                          (l.ie
                            ? (r("progress", {
                                status:
                                  "Sending video to Internet Explorer... this may take a while depending on your device's performance.",
                              }),
                              window.navigator.msSaveBlob(
                                e,
                                (i && i.filename) || "video.mp4",
                              ))
                            : (r("progress", {
                                status: "Sending video to browser...",
                              }),
                              ((t = document.createElementNS(
                                "http://www.w3.org/1999/xhtml",
                                "a",
                              )).href = URL.createObjectURL(e)),
                              (t.download = (i && i.filename) || "video.mp4"),
                              (t.style.display = "none"),
                              document.body.appendChild(t),
                              t.click(),
                              r("finished", {
                                status: "Successfully downloaded video",
                                data: e,
                              }),
                              o(e))));
                  },
                  0,
                  [],
                )).onprogress = function (e) {
                  r("progress", e);
                };
              })
              .catch(function (e) {
                r(
                  "error",
                  "Something went wrong when downloading m3u8 playlist: " + e,
                );
              });
          }),
          o);
    }));
}

}
