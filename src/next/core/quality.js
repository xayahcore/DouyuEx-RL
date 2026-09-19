function* (__imports) {
yield {};
/* ==================== 极速无缝最高画质拦截系统（原生主上下文全链路接管） ==================== */
(function () {
  function runSeamlessQuality() {
    "use strict";
    var isMax = false;
    try {
      var conf = localStorage.getItem("DYEXRL_NEXT:ExSave_HighestVideoQuality");
      if (conf && JSON.parse(conf).isHighestVideoQuality) isMax = true;
    } catch (e) {}
    if (!isMax) return;

    // 0. 路由生命周期状态机：黄金 12 秒起播保护窗口 + SPA 换房自感知重置
    var _lastPath = location.pathname;
    var _roomEnterTime = Date.now();
    function isInitialLoad() {
      if (_lastPath !== location.pathname) {
        _lastPath = location.pathname;
        _roomEnterTime = Date.now();
      }
      return Date.now() - _roomEnterTime < 12000;
    }

    // 1. 严格对齐斗鱼底层 x.setCommon / f.A.set 格式，提前锁定最高画质偏好（原画 rate: 0）
    try {
      var now = Date.now();
      var forever = now + 86400000 * 365;
      var pack = function (val) {
        return JSON.stringify({
          c: now,
          e: forever,
          v: JSON.stringify(val),
          r: 1,
        });
      };

      localStorage.setItem("rateRecordTime_h5p_room", pack(0));
      localStorage.setItem("realRateModel2_h5p_room", pack(0));
      localStorage.setItem("player_storage_quality_h5p_room", pack(0));
      localStorage.setItem("player_storage_rate_h5p_room", pack(0));
      localStorage.setItem("realRateModel2", pack(0));
      localStorage.setItem("player_storage_quality", pack(0));
    } catch (e) {}

    // 2. 斩断斗鱼 HTML 内联低码率预载流（仅在起播保护期生效）
    try {
      var _preloadVal = undefined;
      Object.defineProperty(window, "preloadStreamUrlPromise", {
        configurable: true,
        enumerable: true,
        get: function () {
          return isInitialLoad() ? undefined : _preloadVal;
        },
        set: function (v) {
          _preloadVal = v;
        },
      });
    } catch (e) {}

    // 3. 拦截第一流函数 getLegacyFirstStream，确保首流也是最高画质请求
    try {
      var _origFirstStream = undefined;
      Object.defineProperty(window, "getLegacyFirstStream", {
        configurable: true,
        enumerable: true,
        get: function () {
          return _origFirstStream;
        },
        set: function (fn) {
          if (typeof fn === "function") {
            _origFirstStream = function (opts) {
              try {
                if (opts && typeof opts === "object" && isInitialLoad()) {
                  opts.rate = 0; // 强制起播第一条流索取原画最高画质
                }
              } catch (err) {}
              return fn.call(this, opts);
            };
          } else {
            _origFirstStream = fn;
          }
        },
      });
    } catch (e) {}

    // 4. 接管 Fetch：起播保护期内改发包 rate=0 + 拦截 /betard/ 响应，12秒后透明放行手动降级
    var origFetch = window.fetch;
    if (origFetch) {
      window.fetch = async function () {
        var args = Array.prototype.slice.call(arguments);
        try {
          var url = args[0];
          if (isInitialLoad() && typeof url === "string") {
            if (url.includes("getH5Play") || url.includes("/super/stream/")) {
              if (args[1] && typeof args[1].body === "string") {
                args[1].body = args[1].body.replace(
                  /(^|&)rate=[^&]*/,
                  "$1rate=0",
                );
                if (!args[1].body.includes("rate=")) {
                  args[1].body += "&rate=0";
                }
              }
            }
          }
        } catch (e) {}

        var resp = await origFetch.apply(this, args);

        try {
          var reqUrl = args[0];
          if (
            isInitialLoad() &&
            typeof reqUrl === "string" &&
            reqUrl.includes("/betard/")
          ) {
            var clone = resp.clone();
            var text = await clone.text();
            var data = JSON.parse(text);
            if (
              data &&
              data.room &&
              Array.isArray(data.room.multirates) &&
              data.room.multirates.length > 0
            ) {
              var topRate = data.room.multirates[0].type;
              if (typeof topRate !== "undefined") {
                data.room.rate = topRate;
                var modifiedBlob = new Blob([JSON.stringify(data)], {
                  type: resp.headers.get("content-type") || "application/json",
                });
                return new Response(modifiedBlob, {
                  status: resp.status,
                  statusText: resp.statusText,
                  headers: resp.headers,
                });
              }
            }
          }
        } catch (e) {}

        return resp;
      };
    }

    // 5. 接管 XMLHttpRequest：起播保护期内改发包 rate=0 + 拦截 /betard/ 响应，12秒后透明放行
    var origOpen = window.XMLHttpRequest.prototype.open;
    var origSend = window.XMLHttpRequest.prototype.send;
    window.XMLHttpRequest.prototype.open = function (method, url) {
      this._ex_h5_url = url;
      return origOpen.apply(this, arguments);
    };
    window.XMLHttpRequest.prototype.send = function (body) {
      try {
        if (
          isInitialLoad() &&
          this._ex_h5_url &&
          typeof this._ex_h5_url === "string" &&
          (this._ex_h5_url.includes("getH5Play") ||
            this._ex_h5_url.includes("/super/stream/"))
        ) {
          if (typeof body === "string") {
            body = body.replace(/(^|&)rate=[^&]*/, "$1rate=0");
            if (!body.includes("rate=")) {
              body += "&rate=0";
            }
          }
        }
      } catch (e) {}

      if (
        isInitialLoad() &&
        this._ex_h5_url &&
        typeof this._ex_h5_url === "string" &&
        this._ex_h5_url.includes("/betard/")
      ) {
        var xhr = this;
        var origGetter = Object.getOwnPropertyDescriptor(
          window.XMLHttpRequest.prototype,
          "responseText",
        );
        if (origGetter && origGetter.get) {
          Object.defineProperty(xhr, "responseText", {
            get: function () {
              var realText = origGetter.get.call(this);
              try {
                var d = JSON.parse(realText);
                if (
                  d &&
                  d.room &&
                  Array.isArray(d.room.multirates) &&
                  d.room.multirates.length > 0
                ) {
                  d.room.rate = d.room.multirates[0].type || 0;
                  return JSON.stringify(d);
                }
              } catch (e) {}
              return realText;
            },
            configurable: true,
          });
        }
      }
      return origSend.call(this, body);
    };
  }

  try {
    var s = document.createElement("script");
    s.textContent =
      "(" +
      runSeamlessQuality.toString() +
      ")();\n//# sourceURL=DouyuEx.SeamlessQuality.js";
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  } catch (e) {
    console.error("[DouyuEx] 画质系统注入失败:", e);
  }
})();

}
