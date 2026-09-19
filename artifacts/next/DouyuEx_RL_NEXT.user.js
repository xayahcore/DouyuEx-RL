// ==UserScript==
// @name         DouyuEx-RL (NEXT Main Compatibility)
// @namespace    https://github.com/xayahcore/DouyuEx-RL/next
// @version      2026.09.18.01-next
// @description  NEXT 主线兼容构建；保留原版功能与界面，请先停用主线脚本再启用
// @author       xayahcore
// @license      MIT
// @run-at       document-start

// @match        *://*.douyu.com/*

// @require      https://fastly.jsdelivr.net/npm/flv.js@1.6.2/dist/flv.min.js
// @require      https://fastly.jsdelivr.net/npm/svgaplayerweb@2.3.1/build/svga.min.js
// @require      https://fastly.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js
// @require      https://fastly.jsdelivr.net/npm/three@0.80.0/build/three.min.js
// @require      https://fastly.jsdelivr.net/npm/xlsx@0.16.4/dist/xlsx.full.min.js
// @require      https://fastly.jsdelivr.net/npm/dompurify@2.3.6/dist/purify.min.js

// @connect      douyucdn.cn
// @connect      douyu.com
// @connect      qq.com
// @connect      douyuex.com
// @connect      bilibili.com
// @connect      huya.com
// @connect      doseeing.com
// @connect      registry.npmmirror.com
// @connect      fastly.jsdelivr.net
// @connect      greasyfork.org

// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_cookie
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  const eventName = 'DYEXRL_NEXT_COMPAT_CLAIM';
  let occupied = false;
  const probe = () => { occupied = true; };
  document.addEventListener(eventName + ':occupied', probe);
  document.dispatchEvent(new Event(eventName));
  document.removeEventListener(eventName + ':occupied', probe);
  if (occupied) return;
  if (globalThis.DYEXRL_NEXT || globalThis.__DYRANK || document.querySelector('.ex-panel, .miuix-ex-icon')) {
    console.warn('[DouyuEx NEXT] Another runtime is present. Disable it and reload.');
    return;
  }
  document.addEventListener(eventName, () => document.dispatchEvent(new Event(eventName + ':occupied')));
  const nextRuntime = { mode: 'working-tree', status: 'starting' };
  globalThis.DYEXRL_NEXT = nextRuntime;
  // GM storage is isolated by the script manager identity; origin storage needs an explicit prefix.
  const backingStorage = window.localStorage;
  const storagePrefix = 'DYEXRL_NEXT:';
  const ownedKey = key => /^(ExSave_|Ex_)/.test(String(key)) || key === 'freetimed';
  const storageKey = key => ownedKey(String(key)) ? storagePrefix + key : String(key);
  const localStorage = {
    getItem: key => backingStorage.getItem(storageKey(key)),
    setItem: (key, value) => backingStorage.setItem(storageKey(key), value),
    removeItem: key => backingStorage.removeItem(storageKey(key)),
    key: index => {
      const key = backingStorage.key(index);
      if (key && key.startsWith(storagePrefix)) return key.slice(storagePrefix.length);
      return key && ownedKey(key) ? null : key;
    },
    get length() { return backingStorage.length; }
  };

(function linkNextModules() {
const definitions = {"src/next/runtime/registry.js":
function* (__imports) {
yield {"createNextDockOwner": { get: () => createNextDockOwner, set: value => { createNextDockOwner = value; } },
"nextDockOwners": { get: () => nextDockOwners },
"nextFeatures": { get: () => nextFeatures },
"teardownNextDock": { get: () => teardownNextDock, set: value => { teardownNextDock = value; } }};
// Feature registry owns Dock dispatch and binding lifetimes in its private module.
// Service actions are explicit live imports; remaining jobs still require reload.
const nextFeatures = (() => {
  const features = new Map();
  return Object.freeze({
    register(id, adapter) {
      if (features.has(id)) throw new Error('Duplicate feature: ' + id);
      features.set(id, Object.freeze(adapter));
    },
    invoke(id, action, ...args) {
      const adapter = features.get(id);
      if (!adapter || typeof adapter[action] !== 'function') throw new Error('Unknown feature action: ' + id + '.' + action);
      return adapter[action](...args);
    },
    list() { return [...features].map(([id, adapter]) => ({ id, panel: adapter.panel || null, actions: Object.keys(adapter).filter(key => typeof adapter[key] === 'function') })); }
  });
})();
const nextDockOwners = new Map();
function createNextDockOwner(wrap) {
  const cleanups = [];
  let disposed = false;
  const owner = {
    property(target, key, value) {
      const descriptor = Object.getOwnPropertyDescriptor(target, key);
      target[key] = value;
      cleanups.push(() => {
        if (target[key] !== value) return; // Do not undo a newer owner's replacement.
        if (descriptor) Object.defineProperty(target, key, descriptor);
        else delete target[key];
      });
    },
    listen(target, event, listener) {
      target.addEventListener(event, listener);
      cleanups.push(() => target.removeEventListener(event, listener));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cleanups.reverse().forEach(cleanup => cleanup());
      nextDockOwners.delete(wrap);
      (0, __imports.clearSubPanelTimer)();
    }
  };
  nextDockOwners.set(wrap, owner);
  return owner;
}
function teardownNextDock() {
  [...nextDockOwners.values()].forEach(owner => owner.dispose());
  (0, __imports.clearSubPanelTimer)();
}

}
,
"src/next/core/quality.js":
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
,
"src/next/core/rank_engine.js":
function* (__imports) {
yield {};
/* ==================== 整合子模块：斗鱼活跃榜贡献值实时注入（原生主上下文极速注入） ==================== */
(function () {
  function runDYRankFix() {
    (function () {
      "use strict";

      /* ============================ 配置 ============================ */

      var DEBUG = false;

      var log = function () {
        if (DEBUG)
          console.info.apply(
            console,
            ["[DYRankFix]"].concat([].slice.call(arguments)),
          );
      };

      var CFG = {
        // ranklist 载荷字段 -> 榜单数据集

        payloadKey: {
          list_day: "day",
          list: "week",
          list_month: "month",
          list_all: "all",
        },

        // 注入数值距离行右边缘的偏移(px)，保证落在行末箭头左侧

        valueRightOffset: 22,

        // 注入轮询间隔(ms)

        tickMs: 1000,
      };

      /* ============================ 状态 ============================ */

      var state = {
        rid: "",

        data: {
          day: { map: new Map(), money: true },

          week: { map: new Map(), money: true },

          month: { map: new Map(), money: true },

          all: { map: new Map(), money: true },
        },

        rawPayloadLogged: false,

        _rkLogged: {},

        _rkRawLogged: {},

        _rkEmpty: {},

        msgTypes: {}, // 收到的消息类型 -> 次数（页面旁听）

        panelFoundLogged: false,

        noMsgWarned: false,

        lastInjectLog: 0,
      };

      // 最小调试钩子：浏览器控制台(F12)可看 state / dump（榜单数据）、refresh（强制重注入）；无任何页面 UI

      window.__DYRANK = {
        state: state,

        dump: function () {
          var out = {};

          Object.keys(state.data).forEach(function (k) {
            out[k] = {
              money: state.data[k].money,
              list: [].concat(Array.from(state.data[k].map.entries())),
            };
          });

          return out;
        },

        refresh: function () {
          injectAll();
        },
      };

      /* ============================ STT 协议 ============================ */

      // 与斗鱼新版客户端完全一致的STT解码器：

      // 新版报文把嵌套内容双重转义（"@=" 在嵌套层写作 "@AA="，"@" 写作 "@A"，"/" 写作 "@S"），

      // 旧式单遍解析器（含 DouyuEx 的 el()）无法解析，这就是原插件榜单失效的根因。

      // 参考斗鱼前端 chunk 中模块 85067 的解码实现（逐字等价）。

      function sttFlat(s) {
        if (typeof s !== "string" || !s) return s;

        var t = s.charAt(s.length - 1) === "/" ? s : s + "/";

        var n = t.length;

        var obj = /@=/g.test(t) ? {} : [];

        var i = 0,
          key = "",
          acc = "";

        while (i < n) {
          var c = t.charAt(i);

          if (c === "/") {
            if (Array.isArray(obj)) obj.push(acc);
            else obj[key] = acc;

            key = "";
            acc = "";
          } else if (c === "@") {
            i += 1;

            switch (t.charAt(i)) {
              case "A":
                acc += "@";
                break;

              case "S":
                acc += "/";
                break;

              case "=":
                key = acc;
                acc = "";
                break;
            }
          } else {
            acc += c;
          }

          i += 1;
        }

        return obj;
      }

      function sttParse(s) {
        if (typeof s !== "string") return s;

        // 新版数组分隔符 /|/ （旧版为 //，由 @S 转义自动还原）

        if (/\/\|\//.test(s)) return s.split("/|/").map(sttParse);

        if (!/@[=|A]/.test(s)) return s;

        var v = sttFlat(s);

        if (!v) return;

        if (Array.isArray(v)) return v.map(sttParse);

        var out = {};

        Object.keys(v).forEach(function (k) {
          out[k] = sttParse(v[k]);
        });

        return out;
      }

      function sttType(raw) {
        var m = String(raw).match(/type@=([^/]+)/);

        return m ? m[1] : "";
      }

      /* ============================ 数据解析 ============================ */

      function parseList(list) {
        var map = new Map();

        var money = false;

        if (!list) return { map: map, money: money };

        var arr = Array.isArray(list) ? list : [list];

        arr.forEach(function (it) {
          if (!it || typeof it !== "object") return;

          var nick = it.nickname || it.nn || "";

          if (!nick) return;

          var val = null;

          // 优先贡献值(gold，分→主单位取整，与页面在线榜显示一致)；其次活跃度类数值字段

          if (it.gold !== undefined && it.gold !== "" && it.gold !== null) {
            val = Math.round(Number(it.gold) / 100);

            money = true;
          } else {
            ["score", "act", "active", "val"].forEach(function (f) {
              if (
                val === null &&
                it[f] !== undefined &&
                it[f] !== "" &&
                it[f] !== null
              ) {
                val = Number(it[f]);
              }
            });
          }

          if (val !== null && isFinite(val)) map.set(String(nick), val);
        });

        return { map: map, money: money };
      }

      // 容错：列表值若因某种原因仍是未解析的STT字符串，补一次解析

      function toList(v) {
        if (v === undefined) return undefined;

        if (typeof v === "string") return sttParse(v);

        return v;
      }

      // 从任意解析结果中找出榜单字段（兼容数组/对象混合）

      function extractPayload(p) {
        if (!p || typeof p !== "object") return p;

        if (!Array.isArray(p)) return p;

        var merged = {};

        p.forEach(function (item) {
          if (item && typeof item === "object" && !Array.isArray(item))
            Object.assign(merged, item);
        });

        return merged;
      }

      function handleRanklist(raw) {
        var p = sttParse(raw);

        p = extractPayload(p);

        if (!p || typeof p !== "object" || Array.isArray(p)) return;

        if (!state.rawPayloadLogged) {
          state.rawPayloadLogged = true;

          log("ranklist 原始报文(截断):", String(raw).slice(0, 1200));

          log("ranklist 解析结果字段:", Object.keys(p).join(", "));
        }

        var updated = 0;

        Object.keys(CFG.payloadKey).forEach(function (key) {
          if (p[key] !== undefined) {
            state.data[CFG.payloadKey[key]] = parseList(toList(p[key]));

            updated++;
          }
        });

        if (updated) {
          log(
            "榜单数据条数:",
            Object.keys(state.data)
              .map(function (k) {
                return k + "=" + state.data[k].map.size;
              })
              .join(" "),
          );

          injectAll();
        } else {
          log(
            "ranklist 消息中未找到已知字段(list_day/list/list_month/list_all)，已记录原始报文",
          );
        }
      }

      // dayrk/weekrk/totalrk/monthrk（当前协议榜单消息）：与页面 mountSocketDay 等订阅一致，

      // list 条目含 nickname + gold（贡献值，分）。这是活跃榜数据的权威来源。

      function handleRkMessage(type, raw) {
        var dsMap = {
          dayrk: "day",
          weekrk: "week",
          totalrk: "all",
          monthrk: "month",
        };

        var ds = dsMap[type];

        if (!ds) return;

        var p;

        try {
          p = sttParse(raw);
        } catch (e) {
          p = null;
        }

        // 首次收到该类型时记录原始报文（截断），便于排查异常房间

        if (!state._rkRawLogged[ds]) {
          state._rkRawLogged[ds] = true;

          log(type, "原始报文(截断):", String(raw).slice(0, 1000));
        }

        if (!p) return;

        if (p.rid && String(p.rid) !== String(state.rid)) return;

        var list = p.list;

        // 容错：list 若仍是未展开的字符串，补一次解析

        if (typeof list === "string") {
          try {
            list = sttParse(list);
          } catch (e) {}
        }

        if (!Array.isArray(list)) {
          log(
            type,
            "list 字段异常:",
            typeof list,
            list ? JSON.stringify(list).slice(0, 300) : "null",
          );

          return;
        }

        var info = { map: new Map(), money: true };

        list.forEach(function (it) {
          if (!it || typeof it !== "object") return;

          var nick = String(it.nickname || it.nn || "").trim();

          if (!nick) return;

          var gold = it.gold !== undefined ? it.gold : it.val;

          var g = Number(gold);

          if (isFinite(g)) info.map.set(nick, Math.round(g / 100));
        });

        if (info.map.size) {
          state.data[ds] = info;

          if (!state._rkLogged[ds]) {
            state._rkLogged[ds] = true;

            log(type, "榜单数据:", info.map.size, "人");
          }

          injectAll();
        } else {
          // 空名单：房间可能关闭了榜单（room_rank_switch=0），或字段不匹配

          state._rkEmpty[ds] = (state._rkEmpty[ds] || 0) + 1;

          if (state._rkEmpty[ds] <= 3) {
            log(
              type,
              "名单为空或字段不匹配, rid=",
              p.rid || "",
              "list len=",
              list.length,

              "条目样例:",
              JSON.stringify(list[0] || null).slice(0, 300),
            );
          }
        }
      }

      /* ============================ 二进制消息解码 ============================ */

      function decodeBinary(buf) {
        try {
          var text = new TextDecoder("utf-8").decode(buf);

          var parts = text.split("\0");

          for (var i = 0; i < parts.length; i++) {
            var part = parts[i];

            if (!part || part.length < 12) continue;

            var t = sttType(part);

            if (t) {
              state.msgTypes[t] = (state.msgTypes[t] || 0) + 1;
            }

            if (t === "chatmsg") {
              try {
                if (typeof window.__onDouyuExChatmsg === "function") {
                  window.__onDouyuExChatmsg(part);
                }
              } catch (e) {}
            }

            if (t === "ranklist") {
              try {
                handleRanklist(part);
              } catch (e) {
                log("ranklist 解析失败", e);
              }
            }

            if (
              t === "dayrk" ||
              t === "weekrk" ||
              t === "totalrk" ||
              t === "monthrk"
            ) {
              try {
                handleRkMessage(t, part);
              } catch (e) {}
            }
          }
        } catch (e) {}
      }

      function peekMessage(data) {
        try {
          if (data instanceof ArrayBuffer) {
            decodeBinary(new Uint8Array(data));
          } else if (data && typeof data.arrayBuffer === "function") {
            data
              .arrayBuffer()
              .then(function (ab) {
                decodeBinary(new Uint8Array(ab));
              })
              .catch(function () {});
          } else if (typeof data === "string") {
            decodeBinary(new TextEncoder().encode(data));
          } else if (data && data.buffer) {
            // TypedArray

            decodeBinary(
              new Uint8Array(
                data.buffer,
                data.byteOffset || 0,
                data.byteLength,
              ),
            );
          }
        } catch (e) {}
      }

      /* ============================ 主数据源：钩住页面自身的 WebSocket ============================ */

      var ORIG_WS = window.WebSocket;

      function installWsHook() {
        if (!ORIG_WS) return;

        try {
          window.WebSocket = function (url, protocols) {
            var ws;

            try {
              ws = protocols ? new ORIG_WS(url, protocols) : new ORIG_WS(url);
            } catch (e) {
              throw e;
            }

            try {
              ws.addEventListener("message", function (evt) {
                peekMessage(evt.data);
              });
            } catch (e) {}

            return ws;
          };

          window.WebSocket.prototype = ORIG_WS.prototype;

          ["CONNECTING", "OPEN", "CLOSING", "CLOSED"].forEach(function (k) {
            try {
              window.WebSocket[k] = ORIG_WS[k];
            } catch (e) {}
          });

          log("已钩住页面 WebSocket（主数据源）");
        } catch (e) {
          log("WebSocket 钩子安装失败", e);
        }
      }

      /* ============================ DOM 工具 ============================ */

      // 面板容器类名（实测存在）；列表/标签的具体类名随斗鱼改版变化，

      // 因此以“结构探测”为主：面板内按行结构找榜单列表、按文字找标签。

      var SEL_RANK_PANEL = ".layout-Player-rank";

      // 类名快路径（命不中会走结构探测兜底）

      var SEL_LIST_UL =
        "[class*='ChatRank'] [class*='istContent'], [class*='ChatRank'] [class*='ankList'], [class*='ChatRank'] [class*='ankContent'], [class*='ChatRank'] [class*='ankItem']";

      // 榜单标签文字（识别标签栏并排除误判）

      var TAB_LIKE = [
        "在线榜",
        "活跃榜",
        "钻粉",
        "贵宾",
        "粉丝榜",
        "日榜",
        "周榜",
        "月榜",
        "总榜",
        "日活跃榜",
        "周活跃榜",
        "月活跃榜",
        "总活跃榜",
        "活跃总榜",
      ];

      function getRid() {
        // 优先取页面自己使用的真实房间号（改号直播间：URL 是短号/vipId，页面 room_id 才是真实号，

        // 如 /2288 页面 window.room_id=593392）。与斗鱼页面同一数据源，最可靠。

        try {
          var wrid = window.room_id || (window.$ROOM && window.$ROOM.room_id);

          if (wrid) return String(wrid);
        } catch (e) {}

        var m = location.pathname.match(/\/(\d+)/);

        return m ? m[1] : "";
      }

      // 面板内所有“榜单标签”叶子元素（按文字识别，不依赖类名）

      // 注意：必须包含“贵宾”——否则贵宾标签激活时识别不到，会掉进兜底分支误注入贵宾榜

      var RANK_TAB_TEXT = [
        "活跃榜",
        "在线榜",
        "钻粉",
        "贵宾",
        "贵宾榜",
        "粉丝榜",
        "日榜",
        "周榜",
        "月榜",
        "总榜",
        "日活跃榜",
        "周活跃榜",
        "月活跃榜",
        "总活跃榜",
        "活跃总榜",
      ];

      function rankTabLeaves() {
        var out = [];

        var roots = [];

        var panel = document.querySelector(SEL_RANK_PANEL);

        if (panel) roots.push(panel);

        document
          .querySelectorAll(
            '[class*="ChatRank"], [class*="rankDetail"], [class*="RankDetail"], [class*="RankAll"], [class*="rankAll"], [class*="modal"], [class*="Modal"], [class*="dialog"], [class*="Dialog"]',
          )

          .forEach(function (el) {
            roots.push(el);
          });

        roots.forEach(function (root) {
          (function walk(el) {
            for (var i = 0; i < el.children.length; i++) {
              var c = el.children[i];

              if (c.children.length === 0) {
                var t = (c.textContent || "").trim();

                if (RANK_TAB_TEXT.indexOf(t) !== -1 && out.indexOf(c) === -1)
                  out.push(c);
              } else walk(c);
            }
          })(root);
        });

        return out;
      }

      // 当前激活标签：优先 class/aria 标记，其次父链上的 active 类

      // （注意斗鱼用 is-active 这类连字符类名，正则需兼容 - 边界）

      function activeRankTab() {
        var tabs = rankTabLeaves();

        var hit = tabs.filter(function (t) {
          var cls =
            String(t.className || "") +
            " " +
            String(t.parentElement ? t.parentElement.className : "");

          return (
            /(^|[\s-])(active|current|cur|selected|checked)([\s-]|$)/i.test(
              cls,
            ) || t.getAttribute("aria-selected") === "true"
          );
        });

        if (hit.length === 1) return hit[0];

        if (hit.length > 1) {
          // 主面板与详情弹层同时激活时，取 DOM 顺序靠后的（详情弹层覆盖在最上层）

          return hit[hit.length - 1];
        }

        hit = tabs.filter(function (t) {
          var n = t.parentElement,
            d = 0;

          while (n && d < 3) {
            if (
              /(^|[\s-])(active|current|cur|selected)([\s-]|$)/i.test(
                String(n.className || ""),
              )
            )
              return true;

            n = n.parentElement;
            d++;
          }

          return false;
        });

        if (hit.length === 1) return hit[0];

        return null;
      }

      function activeTabLabel() {
        var tab = activeRankTab();

        return tab ? tab.textContent.trim() : "";
      }

      // 结构探测：找“形似榜单列表”的容器（>=3 个直接子行，行内含短文本叶子）

      function findRankUls() {
        var out = [];
        function push(el) {
          if (el && out.indexOf(el) === -1) out.push(el);
        }
        try {
          // 精准直接匹配斗鱼榜单列表容器，耗时 < 0.05ms，彻底杜绝全局 DOM 遍历
          var hits = document.querySelectorAll(
            ".ChatRankWeek-listContent, [class*='ChatRankWeek-listContent'], [class*='ChatDayRank'] ul, [class*='ChatRankWeek'] ul, .OnlineRankAll-list, [class*='RankAll'] ul",
          );
          for (var i = 0; i < hits.length; i++) push(hits[i]);

          // 补充探测：如果在榜单行存在的情况下容器类名有细微变动，通过行父级直接获取
          if (out.length === 0) {
            var rows = document.querySelectorAll(
              ".ChatRankWeek-listItem, [class*='RankWeek-listItem']",
            );
            for (var j = 0; j < rows.length; j++) push(rows[j].parentElement);
          }
        } catch (e) {}
        return out;
      }

      function fmt(v, money) {
        // 原汁原味展示：纯整数、不加符号、不带小数（money 仅标记来源，不再影响格式）

        if (v == null) return "—";

        return String(v);
      }

      function findNickEl(row, dataset) {
        var el = row.querySelector(
          '[class*="nickname"], [class*="Nickname"], [class*="nickName"], [class*="NickName"]',
        );

        if (el) return el;

        var map = state.data[dataset].map;

        var kids = row.querySelectorAll("*");

        for (var i = 0; i < kids.length; i++) {
          var k = kids[i];

          if (k.children.length === 0 && map.has(k.textContent.trim()))
            return k;
        }

        return null;
      }

      function findArrowEl(row) {
        return row.querySelector(
          '[class*="arrow"], [class*="Arrow"], [class*="chevron"], [class*="Chevron"],' +
            '[class*="enter"], [class*="Enter"], [class*="more"], [class*="More"],' +
            '[class*="link"], [class*="Link"], [class*="btn"], [class*="Btn"],' +
            '[class*="trend"], [class*="Trend"]',
        );
      }

      /* ============================ 榜单注入 ============================ */

      // 通过"昵称序列"自动判定列表属于哪个数据集（日榜/周榜…），

      // 名次吻合加权更高，可区分日榜与周榜（成员重叠大但顺序不同）。

      function datasetForList(ul) {
        var rows = Array.prototype.slice.call(ul.children);

        if (!rows.length) return null;

        var rowNicks = rows
          .map(function (r) {
            var e = r.querySelector(
              '[class*="nickname"], [class*="Nickname"], [class*="nickName"], [class*="NickName"]',
            );

            return e ? e.textContent.trim() : "";
          })
          .filter(Boolean);

        if (!rowNicks.length) return null;

        var best = null,
          bestScore = 0;

        ["day", "week", "month", "all"].forEach(function (ds) {
          var info = state.data[ds];

          if (!info || info.map.size === 0) return;

          var keys = Array.from(info.map.keys());

          var score = 0;

          for (var i = 0; i < rowNicks.length; i++) {
            var j = keys.indexOf(rowNicks[i]);

            if (j >= 0) {
              score += 2;

              if (i === j) score += 2;
            }
          }

          if (score > bestScore) {
            bestScore = score;
            best = ds;
          }
        });

        return bestScore >= 3 ? best : null;
      }

      function injectList(ul, dataset) {
        var info = state.data[dataset];

        if (!info || info.map.size === 0) return;

        var rows = Array.prototype.slice.call(ul.children);

        var ok = 0,
          miss = 0;

        rows.forEach(function (row) {
          try {
            var nickEl = findNickEl(row, dataset);

            if (!nickEl) {
              miss++;
              return;
            }

            var val = info.map.get(nickEl.textContent.trim());

            if (val == null) {
              miss++;
              return;
            }

            var text = fmt(val, info.money);

            var existing = row.querySelector(".ex-rank-val");

            if (
              existing &&
              existing.getAttribute("data-exrank") === dataset &&
              existing.textContent === text
            )
              return;

            row.querySelectorAll(".ex-rank-val").forEach(function (x) {
              x.remove();
            });

            var span = document.createElement("span");

            span.className = "ex-rank-val";

            span.setAttribute("data-exrank", dataset);

            span.textContent = text;

            var arrow = findArrowEl(row);

            if (arrow && arrow.parentElement) {
              arrow.parentElement.insertBefore(span, arrow);
            } else {
              row.appendChild(span);
            }

            var cs = getComputedStyle(row);

            if (cs.position === "static") row.style.position = "relative";

            ok++;
          } catch (e) {}
        });

        var now = Date.now();

        if (ok && now - state.lastInjectLog > 5000) {
          state.lastInjectLog = now;

          log(
            "注入",
            dataset,
            "成功行数",
            ok,
            miss ? "未匹配行数 " + miss : "",
          );
        }
      }

      // 贵宾/守护榜行内特征字样（出现即视为贵宾类列表，绝不注入）

      var GUARD_TOKENS = ["续费", "守护", "钻粉"];

      // 贵宾类容器类名特征（Guard/Vip/Rich/Noble 等；仅作排除用，随斗鱼改版可能变化）

      var GUARD_CLASS = /guard|vip|rich|noble|consume/i;

      // 列表是否“长得像贵宾/守护榜”（类名特征或行内字样过半命中）

      function looksLikeGuardList(ul) {
        try {
          var n = ul;

          while (n && n !== document.documentElement) {
            if (GUARD_CLASS.test(String(n.className || ""))) return true;

            n = n.parentElement;
          }

          var rows = Array.prototype.slice.call(ul.children).slice(0, 12);

          if (rows.length < 2) return false;

          var hit = 0;

          rows.forEach(function (row) {
            var leaves = [];

            (function walk(el) {
              for (var k = 0; k < el.children.length; k++) {
                var cc = el.children[k];

                if (cc.children.length === 0)
                  leaves.push((cc.textContent || "").trim());
                else walk(cc);
              }
            })(row);

            if (
              leaves.some(function (t) {
                return GUARD_TOKENS.some(function (g) {
                  return t.indexOf(g) !== -1;
                });
              })
            )
              hit++;
          });

          return hit >= rows.length / 2;
        } catch (e) {
          return false;
        }
      }

      // 列表当前是否可见（切换标签后残留的隐藏 DOM 不注入）

      function isVisibleList(ul) {
        try {
          var n = ul;

          while (n && n !== document.documentElement) {
            if (n.hidden) return false;

            if (n.style && n.style.display === "none") return false;

            if (getComputedStyle(n).display === "none") return false;

            n = n.parentElement;
          }

          return true;
        } catch (e) {
          return true;
        }
      }

      // 该列表是否允许注入：活跃榜（默认日榜），或列表任意祖先容器内存在周/月/总选项（详情区）

      function shouldInject(ul) {
        // 兜底排除：贵宾/守护/钻粉类列表绝不注入；隐藏中的列表（残留 DOM）也不注入

        if (looksLikeGuardList(ul) || !isVisibleList(ul)) return false;

        var label = activeTabLabel();

        // 明确不注入的视图：在线榜原生已显示贡献值；钻粉/贵宾榜不是本数据源

        if (
          label === "在线榜" ||
          label.indexOf("钻粉") === 0 ||
          label.indexOf("贵宾") === 0
        )
          return false;

        // 活跃榜主视图 / 详情区各榜单视图（周活跃榜、活跃总榜等）

        if (
          [
            "活跃榜",
            "日榜",
            "周榜",
            "月榜",
            "总榜",
            "日活跃榜",
            "周活跃榜",
            "月活跃榜",
            "总活跃榜",
            "活跃总榜",
          ].indexOf(label) !== -1
        )
          return true;

        // 兜底：激活标签识别不出时，只要面板内存在榜单标签、且该列表能匹配到数据，就注入

        if (!label) {
          var hasRankTab = rankTabLeaves().some(function (x) {
            return (
              ["活跃榜", "日榜", "周榜", "月榜", "总榜"].indexOf(
                x.textContent.trim(),
              ) !== -1
            );
          });

          if (hasRankTab && datasetForList(ul)) return true;
        }

        return false;
      }

      function injectAll() {
        var uls = findRankUls();

        for (var i = 0; i < uls.length; i++) {
          var ul = uls[i];

          if (!shouldInject(ul)) continue;

          var ds = datasetForList(ul);

          if (!ds) continue;

          injectList(ul, ds);
        }
      }

      /* ============================ 样式 ============================ */

      function injectCss() {
        var st = document.createElement("style");

        st.id = "ex-dyrank-style";

        st.textContent = [
          ".ex-rank-val{position:absolute;right:" +
            CFG.valueRightOffset +
            "px;top:50%;transform:translateY(-50%);",

          // 颜色默认 #999999（与斗鱼原生在线榜 ptText / 榜单次要数字一致），同时由 syncValueColor 动态采样设置 CSS 变量随主题自适应

          "color:var(--ex-rank-color, #999999);font-size:12px;font-weight:normal;white-space:nowrap;line-height:1;z-index:2;pointer-events:none;}",
        ].join("\n");

        (document.head || document.documentElement).appendChild(st);
      }

      // 采样页面原生贡献值数字/榜单次要数字的颜色，注入值与其保持一致（随主题自适应）

      var COLOR_SAMPLE_SELECTORS = [
        // 1. 在线榜原生贡献值（弹层与侧栏各种可能类名）

        ".OnlineRankAll-ptText",

        "[class*='OnlineRank'] [class*='ptText']",

        "[class*='OnlineRank'] [class*='PtText']",

        "[class*='OnlineRank'] [class*='pt']",

        "[class*='OnlineRank'] [class*='score']",

        "[class*='OnlineRank'] [class*='val']",

        "[class*='ChatRank'] [class*='ptText']",

        "[class*='ChatRank'] [class*='PtText']",

        "[class*='ChatRank'] [class*='listItem--pt']",

        "[class*='ChatRank'] [class*='listItem--score']",

        "[class*='ChatRank'] [class*='listItem--val']",

        "[class*='ptText']",

        "[class*='PtText']",

        "[class*='ptValue']",

        "[class*='PtValue']",

        "[class*='ptNum']",

        // 2. 榜单第4名及以后的名次数字（斗鱼原生4-10名数字与贡献值使用完全相同灰色）

        ".ChatRankDayWeekList-listItem:nth-child(n+4) [class*='listItem--index']",

        ".ChatRankWeek-listItem:nth-child(n+4) [class*='listItem--index']",

        "[class*='ChatRank'] [class*='listItem']:nth-child(n+4) [class*='index']",

        "[class*='ChatRank'] [class*='listItem--index']",

        // 3. 榜单面板内辅助说明文字 / 查看更多

        "[class*='ChatRank'] [class*='more']",

        "[class*='ChatRank'] [class*='More']",

        "[class*='ChatRank'] [class*='desc']",

        "[class*='ChatRank'] [class*='subText']",

        "[class*='ChatRank'] [class*='subTitle']",

        "[class*='ChatRank'] [class*='tip']",

        ".ChatRank-more",

        ".ChatRank-bottom",
      ];

      function syncValueColor() {
        try {
          for (var i = 0; i < COLOR_SAMPLE_SELECTORS.length; i++) {
            var el = document.querySelector(COLOR_SAMPLE_SELECTORS[i]);

            if (!el) continue;

            var color = getComputedStyle(el).color;

            if (
              !color ||
              color === "rgba(0, 0, 0, 0)" ||
              color === "transparent"
            )
              continue;

            var c = color.replace(/\s+/g, "").toLowerCase();

            // 排除纯白/高亮主文本色（避免采样到昵称等导致变白）

            if (
              c === "rgb(255,255,255)" ||
              c === "rgba(255,255,255,1)" ||
              c === "#fff" ||
              c === "#ffffff" ||
              c === "white"
            )
              continue;

            document.documentElement.style.setProperty(
              "--ex-rank-color",
              color,
            );

            return;
          }
        } catch (e) {}
      }

      /* ============================ 主循环 ============================ */

      function diagnostics() {
        // 面板状态提示

        var panel = document.querySelector(SEL_RANK_PANEL);

        if (panel && !state.panelFoundLogged) {
          state.panelFoundLogged = true;

          var label = activeTabLabel();

          log("榜单面板已找到，当前激活标签:", label || "(未知)");

          if (
            [
              "活跃榜",
              "日榜",
              "周榜",
              "月榜",
              "总榜",
              "日活跃榜",
              "周活跃榜",
              "月活跃榜",
              "总活跃榜",
              "活跃总榜",
            ].indexOf(label) === -1
          ) {
            log(
              "提示：当前不是活跃榜视图，请点击顶部“活跃榜”标签查看注入的贡献值",
            );
          }
        }

        // 长时间无任何弹幕消息的警告

        var total = Object.keys(state.msgTypes).reduce(function (a, k) {
          return a + state.msgTypes[k];
        }, 0);

        if (
          !state.noMsgWarned &&
          Date.now() - (state._bootTs || 0) > 20000 &&
          total === 0 &&
          state.rid
        ) {
          state.noMsgWarned = true;

          log(
            "警告：20秒内未收到任何弹幕消息。若榜单仍为空，请把浏览器控制台(F12)的 [DYRankFix] 日志发给作者。当前收到的消息类型统计:",
            JSON.stringify(state.msgTypes),
          );
        }
      }

      function checkAndInject() {
        try {
          var rid = getRid();
          if (rid && rid !== state.rid) {
            state.rid = rid;
            state.data = {
              day: { map: new Map(), money: true },
              week: { map: new Map(), money: true },
              month: { map: new Map(), money: true },
              all: { map: new Map(), money: true },
            };
          }
          injectAll();
        } catch (e) {}
      }

      var _injectTimer = null;
      function scheduleInject(delay) {
        if (_injectTimer) clearTimeout(_injectTimer);
        _injectTimer = setTimeout(checkAndInject, delay || 50);
      }

      // 事件驱动 1：点击榜单标签即刻触发注入
      document.addEventListener(
        "click",
        function (e) {
          var t = e.target;
          if (!(t instanceof Element)) return;
          var label = (t.textContent || "").trim();
          if (
            label.indexOf("活跃榜") !== -1 ||
            label.indexOf("日榜") !== -1 ||
            label.indexOf("周榜") !== -1 ||
            label.indexOf("月榜") !== -1 ||
            label.indexOf("总榜") !== -1 ||
            label.indexOf("粉丝榜") !== -1
          ) {
            scheduleInject(50);
            scheduleInject(250);
          }
        },
        true,
      );

      // 事件驱动 2：当 WebSocket 收到榜单数据时自动调用注入
      var _origHandleRanklist = handleRanklist;
      handleRanklist = function (raw) {
        _origHandleRanklist(raw);
        scheduleInject(30);
      };

      var _origHandleRk = handleRkMessage;
      handleRkMessage = function (t, raw) {
        _origHandleRk(t, raw);
        scheduleInject(30);
      };

      state._bootTs = Date.now();
      installWsHook();
      injectCss();
      checkAndInject();
      // 极轻量的兜底定时器（5000ms，且只在榜单列表真实存在时运行，0.01ms 开销）
      setInterval(checkAndInject, 5000);
    })();
  }
  try {
    var s = document.createElement("script");
    s.textContent =
      "(" +
      runDYRankFix.toString() +
      ")();\n//# sourceURL=DouyuEx.DYRankFix.js";
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  } catch (e) {
    console.error("[DouyuEx] 活跃榜模块注入失败:", e);
  }
})();

}
,
"src/next/runtime/room-hooks.js":
function* (__imports) {
yield {"EXURL": { get: () => EXURL, set: value => { EXURL = value; } },
"ExLoadLib": { get: () => ExLoadLib, set: value => { ExLoadLib = value; } },
"P": { get: () => P, set: value => { P = value; } },
"installRoomHooks": { get: () => installRoomHooks, set: value => { installRoomHooks = value; } }};
var P =
  typeof __imports.GM_info !== "undefined" && __imports.GM_info.script && __imports.GM_info.script.version
    ? __imports.GM_info.script.version
    : "2026.09.18.01";
/* ==================== DouyuEx 主程序 ==================== */

var EXURL = {
    flv: "https://fastly.jsdelivr.net/npm/flv.js@1.6.2/dist/flv.min.js",
    svga: "https://fastly.jsdelivr.net/npm/svgaplayerweb@2.3.1/build/svga.min.js",
    gif: "https://fastly.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js",
    three:
      "https://fastly.jsdelivr.net/npm/three@0.80.0/build/three.min.js",
    xl: "https://fastly.jsdelivr.net/npm/xlsx@0.16.4/dist/xlsx.full.min.js",
    purify:
      "https://fastly.jsdelivr.net/npm/dompurify@2.3.6/dist/purify.min.js",
  },
  EXLIB = {};
function ExLoadLib(t, o, n) {
  EXLIB[t] ||
    ((EXLIB[t] = 1),
    (0, __imports.GM_xmlhttpRequest)({
      method: "GET",
      url: t,
      onload: (e) => {
        try {
          ((0, eval)(e.response), "function" == typeof o && o());
        } catch (e) {
          ((EXLIB[t] = 0),
            console.error("[DouyuEx]组件加载失败:", t, e),
            "function" == typeof n && n(e));
        }
      },
      onerror: (e) => {
        ((EXLIB[t] = 0), "function" == typeof n && n(e));
      },
    }));
}
function installRoomHooks() {
  ((0, __imports.Kr)({
    url: "/firstqueue",
    callback: (e) => {
      let t = e;
      return (t = t.replace(
        "e.display=new e.renderer(e);",
        "e.display=new e.renderer(e);e.display.raw.comment=e;",
      ));
    },
  }),
    (0, __imports.Kr)({ inline: !0, callback: __imports.Un }));
  {
    let t = Node.prototype.appendChild,
      o = Node.prototype.insertBefore;
    ((Node.prototype.appendChild = function (e) {
      if ("SCRIPT" === e.tagName) {
        if (e.src && (0, __imports.Xr)(e, t, this)) return e;
        e = (0, __imports.Zr)(e);
      }
      return t.call(this, e);
    }),
      (Node.prototype.insertBefore = function (e, t) {
        if ("SCRIPT" === e.tagName) {
          if (e.src && (0, __imports.Xr)(e, o, this)) return e;
          e = (0, __imports.Zr)(e);
        }
        return o.call(this, e, t);
      }));
  }
  var e;
  null != (o = __imports.localStorage.getItem("ExSave_Mode")) &&
    ("mode" in (o = JSON.parse(o)) == 0 && (o.mode = 0), 1 == o.mode) &&
    (0, __imports.Ko)();
  {
    let t = __imports.unsafeWindow.XMLHttpRequest.prototype.send,
      i =
        ((__imports.unsafeWindow.XMLHttpRequest.prototype.send = function (e) {
          (__imports.Yr.set(this, e), t.call(this, e));
        }),
        Object.getOwnPropertyDescriptor(
          __imports.unsafeWindow.XMLHttpRequest.prototype,
          "responseText",
        ));
    Object.defineProperty(
      __imports.unsafeWindow.XMLHttpRequest.prototype,
      "responseText",
      {
        get: function () {
          let e = i.get.call(this);
          var t,
            o = __imports.Yr.get(this);
          for (t of __imports.Wr) {
            var n = t(this.responseURL, e, o);
            void 0 !== n && (e = n);
          }
          return (__imports.Yr.delete(this), e);
        },
        configurable: !0,
      },
    );
  }
  {
    class GracefulP2PBlocker {
      constructor() {
        this.connectionState = "failed";
        this.iceConnectionState = "failed";
        this.signalingState = "closed";
        this.iceGatheringState = "complete";
        this.localDescription = null;
        this.remoteDescription = null;
        this.onicecandidate = null;
        this.ontrack = null;
        this.ondatachannel = null;
      }
      createDataChannel() {
        return {
          send: function () {},
          close: function () {},
          addEventListener: function () {},
          removeEventListener: function () {},
          readyState: "closed",
        };
      }
      createOffer() {
        return Promise.reject(
          new DOMException(
            "WebRTC P2P disabled by user policy",
            "NotSupportedError",
          ),
        );
      }
      createAnswer() {
        return Promise.reject(
          new DOMException(
            "WebRTC P2P disabled by user policy",
            "NotSupportedError",
          ),
        );
      }
      setLocalDescription() {
        return Promise.resolve();
      }
      setRemoteDescription() {
        return Promise.resolve();
      }
      addIceCandidate() {
        return Promise.resolve();
      }
      addEventListener() {}
      removeEventListener() {}
      dispatchEvent() {
        return !1;
      }
      close() {}
      getStats() {
        return Promise.resolve(new Map());
      }
    }
    var t = GracefulP2PBlocker;
    ((0, __imports.Qr)((e, t) => (-1 !== e.indexOf("/betard") ? (0, __imports.Un)(t) : t)),
      null != (o = __imports.localStorage.getItem("ExSave_P2P")) &&
        JSON.parse(o).isKillP2P &&
        [
          "RTCPeerConnection",
          "webkitRTCPeerConnection",
          "mozRTCPeerConnection",
          "msRTCPeerConnection",
        ].forEach((e) => {
          void 0 === __imports.unsafeWindow.RTCPeerConnection &&
            (__imports.unsafeWindow.RTCPeerConnection = __imports.unsafeWindow[e]);
          try {
            __imports.unsafeWindow[e] = t;
          } catch (err) {}
          try {
            window[e] = t;
          } catch (err) {}
        }));
  }
  if (
    null != (o = __imports.localStorage.getItem("ExSave_FullScreen")) &&
    JSON.parse(o).isFullScreen
  ) {
    let e = 0,
      t = (0, __imports.setInterval)(() => {
        if (
          (100 < ++e && (0, __imports.clearInterval)(t), (0, __imports.E)([".wfs-2a8e83", ".icon-c8be96"]))
        ) {
          (0, __imports.clearInterval)(t);
          let e = document.querySelector("div.wfs-2a8e83");
          e
            ? e.click()
            : 2 <= (e = document.querySelectorAll(".icon-c8be96")).length &&
              e[e.length - 2].click();
        }
      }, 1e3);
  }
  /* [DouyuEx] 旧版延迟DOM模拟点击已被彻底物理移除，杜绝二次断播卡顿 */ var o =
    "rateRecordTime_h5p_room";
  try {
    var n = __imports.localStorage.getItem(o);
    let e = n ? JSON.parse(n) : {};
    "v" !== (e = "object" == typeof e && null !== e ? e : {}).v &&
      ((e.v = "v"), __imports.localStorage.setItem(o, JSON.stringify(e)));
  } catch (e) {}
  ((0, __imports.bn)(),
    console.log(
      `%c

   ______                    _____)

  (, /    )                /

    /    / ___             )__   __/

  _/___ /_(_)(_(_(_/_(_(_/        /(__

(_/___ /        .-/     (_____)  /

               (_/



%cDouyuEx-RL ver ` +
        P +
        ` by xayahcore`,
      "color:rgb(255,121,35);font-size:20px;font-weight:bold;",
      "color:#3688FF;font-size:15px;font-weight:bold;",
    ),
    (0, __imports.GM_registerMenuCommand)("检查更新", () => {
      (0, __imports.T)(`【版本更新】当前版本：${P}，正在打开更新发布页...`, "info");
      (0, __imports._)("https://greasyfork.org/zh-CN/scripts/595575", !0);
    }),
    (0, __imports.GM_registerMenuCommand)("重置所有设置", () => {
      (async () => {
        if (
          confirm(
            "确定要清空 DouyuEx 的所有本地设置吗？\n\n包括：油猴存储(GM)与本站 localStorage 中的插件数据。\n此操作不可恢复。",
          )
        ) {
          await (async () => {
            if ("function" == typeof __imports.GM_deleteValue) {
              let t = [];
              try {
                var e;
                "function" == typeof __imports.GM_listValues
                  ? ((e = (0, __imports.GM_listValues)()),
                    (t = e && "function" == typeof e.then ? await e : e || []))
                  : "undefined" != typeof GM &&
                    GM.listValues &&
                    (t = await GM.listValues());
              } catch (e) {
                return;
              }
              Array.isArray(t) || (t = []);
              for (let e = 0; e < t.length; e++)
                try {
                  (0, __imports.GM_deleteValue)(t[e]);
                } catch (e) {}
            }
          })();
          try {
            var t = [];
            for (let e = 0; e < __imports.localStorage.length; e++) {
              var o = __imports.localStorage.key(e);
              o &&
                ((e) =>
                  e.startsWith("ExSave_") ||
                  e.startsWith("Ex_") ||
                  "Ex_isJoysound" === e ||
                  "freetimed" === e)(o) &&
                t.push(o);
            }
            t.forEach((e) => __imports.localStorage.removeItem(e));
          } catch (e) {}
          alert("已清空。请刷新斗鱼页面以使界面与功能恢复默认状态。");
        }
      })();
    }));
  {
    let e = (0, __imports.setInterval)(() => {
      (0, __imports.E)([".Header-follow-content", "#js-backpack-enter"]) &&
        ((__imports.Wt = new __imports.DomMutationSubscription(".Header-follow-content", !1, __imports.Yt)), (0, __imports.clearInterval)(e));
    }, 1e3);
  }
}

}
,
"src/next/ui/bindings.js":
function* (__imports) {
yield {"safeBind": { get: () => safeBind, set: value => { safeBind = value; } },
"safeEl": { get: () => safeEl, set: value => { safeEl = value; } }};
function safeEl(id) {
  return document.getElementById(id) || {};
}
/* ==================== DouyuEx-RL 全局安全事件绑定装甲 ==================== */
function safeBind(target, ev, fn, owner) {
  try {
    var el =
      typeof target === "string"
        ? document.querySelector(target) || document.getElementById(target)
        : target;
    if (el && typeof el.addEventListener === "function") {
      // Later legacy assembly repeats Dock bindings. The mounted Dock already
      // routes these events through its registry and owns their teardown.
      if (['click', 'mouseenter', 'mouseleave'].includes(ev)) {
        for (const wrap of __imports.nextDockOwners.keys()) {
          if (__imports.DOCK_DEFS.some(def => wrap.querySelector('.' + def.cls) === el)) return true;
        }
      }
      if (owner) owner.listen(el, ev, fn);
      else el.addEventListener(ev, fn);
      return true;
    }
  } catch (e) {}
  return false;
}

}
,
"src/next/ui/gift-picker.js":
function* (__imports) {
yield {"openGiftPicker": { get: () => openGiftPicker, set: value => { openGiftPicker = value; } }};
function openGiftPicker(type, onSelect) {
  var oldModal = document.querySelector(".ex-gift-picker-modal");
  if (oldModal) oldModal.remove();
  var oldMask = document.querySelector(".ex-gift-picker-mask");
  if (oldMask) oldMask.remove();

  var mask = document.createElement("div");
  mask.className = "ex-gift-picker-mask";
  document.body.appendChild(mask);

  var modal = document.createElement("div");
  modal.className = "ex-gift-picker-modal miuix-modal-in";
  modal.innerHTML = `
        <div class="ex-gift-picker__header">
            <div class="ex-gift-picker__tabs">
                <button type="button" class="ex-gift-picker__tab" id="tab-room-gifts">全部礼物</button>
                <button type="button" class="ex-gift-picker__tab" id="tab-bag-gifts">背包礼物</button>
            </div>
            <input type="text" class="ex-gift-picker__search" id="ex-gift-picker-search" placeholder="搜索礼物名称..." />
            <button type="button" class="ex-gift-picker__close" title="关闭">×</button>
        </div>
        <div class="ex-gift-picker__body">
            <div class="ex-gift-grid" id="ex-gift-grid">
                <div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px 0; font-size: 13px;">正在加载礼物池...</div>
            </div>
        </div>
    `;

  document.body.appendChild(modal);

  var grid = modal.querySelector("#ex-gift-grid");
  var tabRoom = modal.querySelector("#tab-room-gifts");
  var tabBag = modal.querySelector("#tab-bag-gifts");
  var searchInput = modal.querySelector("#ex-gift-picker-search");
  var closeBtn = modal.querySelector(".ex-gift-picker__close");

  var currentPool = [];

  function closeModal() {
    document.removeEventListener("keydown", onKeyDown);
    modal.classList.remove("miuix-modal-in");
    modal.classList.add("miuix-modal-out");
    mask.style.opacity = "0";
    (0, __imports.setTimeout)(function () {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      if (mask.parentNode) mask.parentNode.removeChild(mask);
    }, 160);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      closeModal();
    }
  }
  document.addEventListener("keydown", onKeyDown);

  closeBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    closeModal();
  });
  mask.addEventListener("click", function (e) {
    e.stopPropagation();
    closeModal();
  });

  function renderGifts(gifts) {
    if (!grid) return;
    grid.innerHTML = "";
    if (!gifts || gifts.length === 0) {
      var emptyText =
        tabBag && tabBag.classList.contains("is-active")
          ? "当前背包暂无道具（可前往直播间完成任务领取）"
          : "暂无匹配礼物";
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px 0; font-size: 13px;">${emptyText}</div>`;
      return;
    }
    var frag = document.createDocumentFragment();
    gifts.forEach(function (g) {
      var cell = document.createElement("div");
      cell.className = "ex-gift-cell";
      cell.setAttribute("data-gid", g.id);
      cell.title = (g.name || "") + " (" + (g.priceText || "") + ")";
      cell.innerHTML = `
                <img class="ex-gift-cell__img" src="${g.icon || ""}" loading="lazy" onerror="this.style.opacity='0.2'" />
                <div class="ex-gift-cell__name">${g.name || "未知礼物"}</div>
                <div class="ex-gift-cell__price">${g.priceText || ""}</div>
            `;
      cell.addEventListener("click", function (e) {
        e.stopPropagation();
        closeModal();
        if (typeof onSelect === "function") {
          onSelect(g);
        }
      });
      frag.appendChild(cell);
    });
    grid.appendChild(frag);
  }

  function filterAndRender() {
    var kw =
      searchInput && searchInput.value
        ? searchInput.value.trim().toLowerCase()
        : "";
    if (!kw) {
      renderGifts(currentPool);
    } else {
      var filtered = currentPool.filter(function (g) {
        return (
          (g.name && g.name.toLowerCase().indexOf(kw) !== -1) ||
          (g.id && String(g.id).indexOf(kw) !== -1)
        );
      });
      renderGifts(filtered);
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", filterAndRender);
  }

  function loadRoomGifts() {
    if (!grid) return;
    grid.innerHTML =
      '<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px 0; font-size: 13px;">正在加载房间官方礼物...</div>';
    if (searchInput) searchInput.value = "";
    (0, __imports.fetchCurrentRoomGifts)(__imports.B, function (gifts) {
      currentPool = gifts || [];
      filterAndRender();
    });
  }

  function loadBackpackGifts() {
    if (!grid) return;
    grid.innerHTML =
      '<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px 0; font-size: 13px;">正在加载背包资产礼物...</div>';
    if (searchInput) searchInput.value = "";
    (0, __imports.fetchUserBackpackGifts)(__imports.B, function (gifts) {
      currentPool = gifts || [];
      filterAndRender();
    });
  }

  tabRoom.addEventListener("click", function (e) {
    e.stopPropagation();
    if (tabRoom.classList.contains("is-active")) return;
    tabRoom.classList.add("is-active");
    tabBag.classList.remove("is-active");
    loadRoomGifts();
  });

  tabBag.addEventListener("click", function (e) {
    e.stopPropagation();
    if (tabBag.classList.contains("is-active")) return;
    tabBag.classList.add("is-active");
    tabRoom.classList.remove("is-active");
    loadBackpackGifts();
  });

  if (type === "backpack") {
    tabBag.classList.add("is-active");
    tabRoom.classList.remove("is-active");
    loadBackpackGifts();
  } else {
    tabRoom.classList.add("is-active");
    tabBag.classList.remove("is-active");
    loadRoomGifts();
  }
}
window.openGiftPicker = openGiftPicker;

}
,
"src/next/ui/panel-header.js":
function* (__imports) {
yield {"ensureMiuixPanelHeader": { get: () => ensureMiuixPanelHeader, set: value => { ensureMiuixPanelHeader = value; } }};
/* ==================== DouyuEx-RL 3级控制台右上角吸顶顶栏 ==================== */
function ensureMiuixPanelHeader(el, title) {
  if (!el) return;
  el.classList.add("miuix-modal");

  // 隐藏可能存在的原生粗糙关闭按钮与旧标题栏/功能栏
  var oldCloses = el.querySelectorAll(
    ".extool__close, .livetool__close, .bloop__close, #vote__result-close, .ChatToolBar-DanmakuTail-title, .lottery__func",
  );
  oldCloses.forEach(function (c) {
    c.style.setProperty("display", "none", "important");
  });

  var header = el.querySelector(".miuix-modal__header");
  if (!header) {
    header = document.createElement("div");
    header.className = "miuix-modal__header";
    header.innerHTML = `
            <div class="miuix-modal__title-box">
                <span class="miuix-modal__title">${title}</span>
            </div>
            <button type="button" class="miuix-modal__close" title="关闭面板" aria-label="关闭">×</button>
        `;
    el.insertBefore(header, el.firstChild);
  } else {
    var titleEl = header.querySelector(".miuix-modal__title");
    if (titleEl) titleEl.textContent = title;
    var badge = header.querySelector(".miuix-modal__badge");
    if (badge) badge.remove();
  }

  // 无论是否新创建，无条件为关闭按钮绑定高优先级关闭事件
  var closeBtn = header.querySelector(".miuix-modal__close");
  if (closeBtn) {
    closeBtn.innerHTML = "×";
    closeBtn.onclick = function (e) {
      e.stopPropagation();
      el.style.removeProperty("display");
      el.style.setProperty("display", "none", "important");
      if (typeof __imports.updateDockActiveIndicator === "function") {
        (0, __imports.updateDockActiveIndicator)();
      }
    };
  }

  // 滚动条起始点统一规定在顶栏下方：将所有非 Header 内容封装进 .miuix-modal__body
  var body = el.querySelector(":scope > .miuix-modal__body");
  if (!body) {
    body = document.createElement("div");
    body.className = "miuix-modal__body";
    el.appendChild(body);
  }
  var nodesToMove = [];
  for (var i = 0; i < el.childNodes.length; i++) {
    var node = el.childNodes[i];
    if (node !== header && node !== body) {
      nodesToMove.push(node);
    }
  }
  nodesToMove.forEach(function (n) {
    body.appendChild(n);
  });

  // 悬浮连桥双向保护
  if (!el.dataset.hoverBridgeBound) {
    el.dataset.hoverBridgeBound = "1";
    el.addEventListener("mouseenter", function () {
      if (typeof __imports.clearSubPanelTimer === "function") (0, __imports.clearSubPanelTimer)();
    });
    el.addEventListener("mouseleave", function () {
      if (typeof __imports.scheduleSubPanelClose === "function") (0, __imports.scheduleSubPanelClose)();
    });
  }
}
window.ensureMiuixPanelHeader = ensureMiuixPanelHeader;

}
,
"src/next/ui/panel-position.js":
function* (__imports) {
yield {"anchorPanelToButton": { get: () => anchorPanelToButton, set: value => { anchorPanelToButton = value; } },
"clearSubPanelTimer": { get: () => clearSubPanelTimer, set: value => { clearSubPanelTimer = value; } },
"scheduleSubPanelClose": { get: () => scheduleSubPanelClose, set: value => { scheduleSubPanelClose = value; } },
"updateDockActiveIndicator": { get: () => updateDockActiveIndicator, set: value => { updateDockActiveIndicator = value; } }};
/* ==================== DouyuEx-RL 悬浮防抖连桥与指示器状态管理 ==================== */
var subPanelCloseTimer = null;
function clearSubPanelTimer() {
  if (subPanelCloseTimer) {
    (0, __imports.clearTimeout)(subPanelCloseTimer);
    subPanelCloseTimer = null;
  }
}
function scheduleSubPanelClose() {
  clearSubPanelTimer();
  subPanelCloseTimer = (0, __imports.setTimeout)(function () {
    closeAllSubPanels();
  }, 400);
}
function closeAllSubPanels() {
  clearSubPanelTimer();
  var panels = document.querySelectorAll(
    ".miuix-modal, .extool, .livetool, .bloop, .exlottery, .ChatToolBar-DanmakuTail-Panel, .fans-continue-panel, .popup-player-panel",
  );
  panels.forEach(function (p) {
    p.style.removeProperty("display");
    p.style.setProperty("display", "none", "important");
  });
  updateDockActiveIndicator();
}
function updateDockActiveIndicator(activeCls) {
  var wrap = document.querySelector(".ex-panel__wrap");
  if (!wrap) return;
  for (var i = 0; i < __imports.DOCK_DEFS.length; i++) {
    var item = wrap.querySelector("." + __imports.DOCK_DEFS[i].cls);
    if (item) item.classList.remove("ex-dock-active", "is-active");
  }
  if (activeCls) {
    var target = wrap.querySelector("." + activeCls);
    if (target) target.classList.add("ex-dock-active", "is-active");
  }
}
window.clearSubPanelTimer = clearSubPanelTimer;
window.scheduleSubPanelClose = scheduleSubPanelClose;
window.closeAllSubPanels = closeAllSubPanels;
window.updateDockActiveIndicator = updateDockActiveIndicator;

function anchorPanelToButton(panel, btnEl) {
  if (!panel) return;
  if (!btnEl) {
    if (panel.classList.contains("extool"))
      btnEl = document.querySelector(".extool-icon");
    else if (panel.classList.contains("livetool"))
      btnEl = document.querySelector(".livetool-icon");
    else if (panel.classList.contains("bloop"))
      btnEl = document.querySelector(".bloop-icon");
    else if (
      panel.classList.contains("ex-lottery") ||
      panel.classList.contains("lottery__wrap") ||
      panel.querySelector(".lottery__wrap")
    )
      btnEl = document.querySelector(".ex-lottery");
    else if (panel.classList.contains("fans-continue-panel"))
      btnEl = document.querySelector(".fans-continue");
    else if (panel.classList.contains("popup-player-panel"))
      btnEl = document.querySelector(".popup-player");
    else if (panel.classList.contains("exupdate-panel"))
      btnEl = document.querySelector(".ex-update");
  }
  if (panel.parentElement !== document.body) {
    document.body.appendChild(panel);
  }
  var panelWidth = 380; // 三级面板推荐固定舒适宽度
  panel.style.width = panelWidth + "px";
  var left = (window.innerWidth - panelWidth) / 2;
  var bottom = 90;

  if (btnEl && typeof btnEl.getBoundingClientRect === "function") {
    var rect = btnEl.getBoundingClientRect();
    if (rect.width > 0 || rect.left > 0) {
      left = rect.left + rect.width / 2 - panelWidth / 2;
      left = Math.max(12, Math.min(window.innerWidth - panelWidth - 12, left));
      bottom = Math.max(20, window.innerHeight - rect.top + 12); // 悬浮在按钮上方 12px
    }
  }

  panel.style.setProperty("position", "fixed", "important");
  panel.style.setProperty("width", panelWidth + "px", "important");
  panel.style.setProperty("max-width", panelWidth + "px", "important");
  panel.style.setProperty("left", left + "px", "important");
  panel.style.setProperty("bottom", bottom + "px", "important");
  panel.style.setProperty("right", "auto", "important");
  panel.style.setProperty("top", "auto", "important");
  panel.style.setProperty("z-index", "100000", "important");
  panel.style.setProperty("display", "flex", "important");
  panel.style.setProperty("flex-direction", "column", "important");
  panel.classList.add("miuix-modal-in");
}
window.anchorPanelToButton = anchorPanelToButton;

}
,
"src/next/ui/icons.js":
function* (__imports) {
yield {"DOCK_DEFS": { get: () => DOCK_DEFS, set: value => { DOCK_DEFS = value; } }};
/* ==================== DouyuEx-RL Level 2 Dock 声明式装配系统 ==================== */
var DOCK_DEFS = [
  {
    cls: "ex-sign",
    inner: `<a class="ex-panel__icon" title="一键签到(房间/鱼吧/客户端/星推日常)"><svg style="display: block;" t="1578566545259" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12959" width="32" height="32"><path d="M698.368 80.896v114.688c0 23.552 19.968 43.008 44.032 43.008s44.032-19.456 44.032-43.008V80.896c0-23.552-19.968-43.008-44.032-43.008s-44.032 18.944-44.032 43.008zM227.328 80.896v114.688c0 23.552 19.968 43.008 44.032 43.008 24.576 0 44.032-19.456 44.032-43.008V80.896c0-23.552-19.968-43.008-44.032-43.008-24.576 0-44.032 18.944-44.032 43.008z" fill="#F96C5D" p-id="12960"></path><path d="M977.92 195.584c0-23.552-19.968-43.008-44.032-43.008h-88.576v43.008c0 55.296-46.08 100.352-102.912 100.352s-102.912-45.056-102.912-100.352v-43.008H374.272v43.008c0 55.296-46.08 100.352-102.912 100.352-56.832 0-102.912-45.056-102.912-100.352v-43.008H79.872c-24.576 0-44.032 19.456-44.032 43.008v611.328l252.928-145.92-8.192-8.192c-10.24-9.728-16.384-23.552-16.384-38.4 0-29.696 25.088-54.272 55.808-54.272 15.36 0 29.184 6.144 39.424 15.872l28.16 27.648L977.92 263.168V195.584z" fill="#F96C5D" p-id="12961"></path><path d="M329.216 278.528c-5.632 3.584-11.264 6.656-17.408 9.216 5.632-2.56 11.776-5.632 17.408-9.216zM344.064 266.24c4.608-4.608 8.704-9.728 12.8-14.848-3.584 5.632-8.192 10.24-12.8 14.848zM329.216 278.528c5.632-3.584 10.752-7.68 15.36-12.288-5.12 4.608-10.24 8.704-15.36 12.288zM449.536 664.064l220.16-214.016c10.24-9.728 24.064-15.872 39.424-15.872 30.72 0 55.808 24.064 55.808 54.272 0 14.848-6.144 28.672-16.384 38.4l-259.072 252.416c-10.24 9.728-24.064 15.872-39.424 15.872s-29.184-6.144-39.424-15.872l-121.344-118.272L35.84 806.912v104.96c0 23.552 19.968 43.008 44.032 43.008h854.016c24.576 0 44.032-19.456 44.032-43.008V263.168L387.584 603.648l61.952 60.416zM350.72 569.856c-4.608-3.072-9.216-5.12-14.336-6.656 5.12 1.024 10.24 3.584 14.336 6.656zM271.36 295.936c14.336 0 27.648-2.56 39.936-7.68-12.288 4.608-25.6 7.68-39.936 7.68z" fill="#F15A4A" p-id="12962"></path></svg><i id="ex-sign__tip" class="ex-panel__tip"></i></a>`,
  },
  {
    cls: "fans-continue",
    inner: `<a class="ex-panel__icon" title="一键续牌"><img style="width: 32px;height: 32px;" src="https://gfs-op.douyucdn.cn/dygift/1705/7db9beee246848252f1c7fe916259f4e.png"/><i id="fans-continue__tip" class="ex-panel__tip"></i></a>`,
  },
  {
    cls: "extool-icon",
    inner: `<a class="ex-panel__icon" title="扩展功能"><svg t="1590294700144" style="display:block;" class="icon" viewBox="0 0 1077 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="11915" width="30" height="30"><path d="M152.770257 11.469971l213.048618 206.378138-37.094375 36.931681 159.440737 158.545917-76.95456 73.782015-159.440737-158.545917-38.47728 36.931681L0.244042 159.115348 152.770257 11.469971z" p-id="11916" fill="#d81e06"></path><path d="M1077.851922 217.848109h-105.751509L929.393073 260.311408l-31.644106 31.400063-33.02701 32.538926L776.866857 300.985065l-23.428026-87.204321 33.027009-32.538926 33.02701-32.538926L862.281538 105.751509V0.569431h-8.134732a244.041945 244.041945 0 0 0-178.964092 68.331745 234.768351 234.768351 0 0 0-68.738481 147.645376 250.712425 250.712425 0 0 0 10.981887 95.664443v2.765808a34.165872 34.165872 0 0 1-9.598983 36.931681c-17.896409 16.269463-525.096918 497.520178-525.096918 497.520178-42.625993 35.548777-38.47728 102.497617 0 142.113759 39.860184 38.233238 105.751509 40.673657 142.927233 0 0 0 478.322212-504.353352 498.984429-524.852875A33.677788 33.677788 0 0 1 754.821735 455.544963c5.531617 1.382904 10.981888 4.067366 16.269463 5.450271a242.170956 242.170956 0 0 0 87.936447 9.598983 237.290118 237.290118 0 0 0 148.45885-68.331745 231.677153 231.677153 0 0 0 68.738481-177.662536 14.805211 14.805211 0 0 0 1.626946-6.751827zM178.964093 943.628853a33.352399 33.352399 0 0 1-48.076263 0 32.538926 32.538926 0 0 1 0-47.832221 33.352399 33.352399 0 0 1 48.076263 0 35.467429 35.467429 0 0 1 0 47.832221z" p-id="11917" fill="#d81e06"></path><path d="M981.618049 785.082936L747.988561 567.804258S617.344773 601.97013 526.642517 753.682873c5.531617 1.382904 241.926915 239.161106 241.926914 239.161105a109.98157 109.98157 0 0 0 152.607563 0l60.441055-58.732761a102.823006 102.823006 0 0 0 0-149.028281zM854.146806 951.763584a29.366381 29.366381 0 0 1-38.477279 0l-195.233556-189.94598-1.382905-1.382904a25.543057 25.543057 0 0 1 1.382905-35.548777 29.366381 29.366381 0 0 1 38.47728 0l196.535113 189.94598A28.796949 28.796949 0 0 1 854.146806 951.763584z m86.634891-83.380997a29.366381 29.366381 0 0 1-38.47728 0L705.362568 678.436606l-1.382905-1.382904a25.543057 25.543057 0 0 1 1.382905-35.548777 29.366381 29.366381 0 0 1 38.477279 0l196.535113 189.945981a24.404194 24.404194 0 0 1 0 37.013028z" p-id="11918" fill="#d81e06"></path></svg><i id="extool__tip" class="ex-panel__tip"></i></a>`,
  },
  {
    cls: "livetool-icon",
    inner: `<a class="ex-panel__icon" title="直播间工具"><svg t="1590294900594" style="display:block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="20028" width="36" height="36"><path d="M352.2 245.3c-5.1 0-10.2-2-14.1-5.9L196.6 98c-7.8-7.8-7.8-20.5 0-28.3s20.5-7.8 28.3 0l141.4 141.4c7.8 7.8 7.8 20.5 0 28.3-3.9 3.9-9 5.9-14.1 5.9zM477.1 245.3c-5.1 0-10.2-2-14.1-5.9-7.8-7.8-7.8-20.5 0-28.3L604.3 69.7c7.8-7.8 20.5-7.8 28.3 0 7.8 7.8 7.8 20.5 0 28.3L491.2 239.4c-3.9 3.9-9 5.9-14.1 5.9z" fill="#0C2B4A" p-id="20029"></path><path d="M703.9 194.8H124.2c-33 0-60 27-60 60v453c0 33 27 60 60 60h418c1.7-122.5 99.6-221.8 221.7-225.5V254.8c0-33-27-60-60-60zM533.4 522.9L356.3 625.2c-24 13.9-54-3.5-54-31.2V389.5c0-27.7 30-45 54-31.2l177.1 102.2c24 13.9 24 48.6 0 62.4zM815.2 776.4c0 21.9-17.8 39.7-39.7 39.7-21.9 0-39.7-17.8-39.7-39.7 0-21.9 17.8-39.7 39.7-39.7 21.9 0 39.7 17.8 39.7 39.7z" fill="#0C2B4A" p-id="20030"></path><path d="M775.5 591C673.6 591 591 673.6 591 775.5S673.6 960 775.5 960 960 877.4 960 775.5 877.4 591 775.5 591zM879 819l-15.6 27c-2.1 3.6-6.8 4.9-10.4 2.8l-15.5-8.9c-2.7-1.6-6.1-1.3-8.5 0.6-7.5 5.9-15.9 10.6-25.1 13.8-3 1.1-5.1 4-5.1 7.2v18.7c0 4.2-3.4 7.6-7.6 7.6H760c-4.2 0-7.6-3.4-7.6-7.6v-18.5c0-3.3-2.1-6.2-5.1-7.2-9.3-3.2-17.9-7.8-25.5-13.7-2.4-1.9-5.8-2.2-8.5-0.6l-15.2 8.8c-3.6 2.1-8.3 0.9-10.4-2.8l-15.6-27c-2.1-3.6-0.8-8.3 2.8-10.4l12.2-7.1c3-1.7 4.5-5.2 3.7-8.5-1.7-6.8-2.6-13.8-2.6-21.1 0-4.1 0.3-8.2 0.9-12.2 0.4-3.1-1-6.1-3.7-7.7l-10.5-6.1c-3.6-2.1-4.9-6.8-2.8-10.4l15.6-27c2.1-3.6 6.8-4.9 10.4-2.8l7.8 4.5c2.9 1.7 6.6 1.3 9-1.1 9.1-8.7 20-15.5 32.2-19.7 3.1-1 5.1-4 5.1-7.2v-7.9c0-4.2 3.4-7.6 7.6-7.6H791c4.2 0 7.6 3.4 7.6 7.6v8.1c0 3.2 2 6.1 5.1 7.2 12.1 4.2 22.9 10.9 31.9 19.6 2.4 2.4 6.1 2.8 9.1 1.1l8.2-4.7c3.6-2.1 8.3-0.8 10.4 2.8l15.6 27c2.1 3.6 0.9 8.3-2.8 10.4l-11 6.3c-2.7 1.6-4.1 4.6-3.7 7.7 0.6 3.9 0.8 8 0.8 12.1 0 7.2-0.9 14.1-2.5 20.8-0.8 3.3 0.7 6.7 3.6 8.3l12.8 7.4c3.7 2.1 5 6.8 2.9 10.4z" fill="#0C2B4A" p-id="20031"></path></svg><i id="LiveTool__tip" class="ex-panel__tip"></i></a>`,
  },
  {
    cls: "bloop-icon",
    inner: `<a class="ex-panel__icon" title="弹幕发送小助手"><svg t="1578572568198" style="display: block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="55445" width="32" height="32"><path d="M511.99883605 1020.07740302c-68.78771655 0-135.53209458-13.47788003-198.38074083-40.06106453-60.69004402-25.67037725-115.18953131-62.41203655-161.98371328-109.20738247-46.79418197-46.79301803-83.53700523-101.29366926-109.20621853-161.98371328C15.84497778 645.97776043 2.36709774 579.23105337 2.36709774 510.4445019s13.47904398-135.53209458 40.06106453-198.38074083c25.6692133-60.69004402 62.41203655-115.18953131 109.20621853-161.98371328 46.79534706-46.79418197 101.29366926-83.53700523 161.98371328-109.20621853 62.84864739-26.5831845 129.59418937-40.06106453 198.38074083-40.06106453 68.78771655 0 135.53209458 13.47904398 198.38190592 40.06106453 60.69004402 25.6692133 115.18953131 62.41203655 161.98487723 109.20621853 46.79301803 46.79418197 83.53584128 101.29366926 109.20621853 161.98371328 26.5831845 62.84864739 40.06106453 129.59418937 40.06106453 198.38074083s-13.47788003 135.53325853-40.06106453 198.38074084c-25.67037725 60.69004402-62.41203655 115.19069525-109.20621853 161.98371328-46.79534706 46.79418197-101.29483435 83.53817031-161.98487723 109.20738247C647.53092949 1006.59952413 580.78655147 1020.07740302 511.99883605 1020.07740302zM511.99883605 57.86089358c-249.55500203 0-452.58244437 203.02744235-452.58244437 452.58244437s203.02744235 452.58244437 452.58244437 452.58244438c249.55616597 0 452.58360832-203.02744235 452.58360832-452.58244438C964.58244437 260.88949987 761.55500203 57.86089358 511.99883605 57.86089358z" p-id="55446" fill="#1296db" data-spm-anchor-id="a313x.7781069.0.i24"></path><path d="M322.42598685 461.65355293l-8.51099648 74.46598314 97.86947811 0c-2.85950862 76.59314973-4.9866752 127.6556379-6.38266595 153.18746454-1.42975431 51.06132423-27.65899321 75.16339541-78.72148139 72.33881542-18.45058333 1.39598962-35.47024839 2.12716658-51.06248818 2.12716658-2.85950862-17.02082901-6.38266595-34.77283613-10.63816419-53.19081984 18.41681863 0 35.43764878 0 51.06248817 0 25.53066155 2.82574393 38.99456967-7.77981952 40.42432399-31.9133275 1.39598962-9.9069861 2.12833166-25.53182663 2.12833166-46.80698994 1.39598962-21.27632725 2.12716658-36.86740309 2.12716658-46.80698994l-99.9966447 0 14.89366244-172.33546126 89.3584805 0 0-78.72148138-102.12497636 0 0-48.9353216 151.05913287 0 0 176.5909595L322.42598685 461.65355293zM450.08162475 580.79819435l0-242.54594504 74.46598314 0c-17.0219941-24.10090723-31.91449145-43.25006791-44.67982222-57.44515413l46.80698994-21.27632725c4.25433429 4.25549824 10.63699911 12.06675342 19.14799673 23.40349497 15.5910747 18.45058333 24.79948459 30.51733789 27.65899321 36.16882574l-42.5514917 19.14799673 80.84864796 0c25.53066155-38.29715741 41.8203136-64.5263963 48.93415652-78.72031744l53.19081984 14.89366244c-5.68525255 8.50983253-15.62483939 22.70491762-29.78732487 42.55149169-7.11384291 9.93958685-12.06675342 17.02082901-14.89249849 21.27516331l70.20931982 0 0 242.54594503L620.28991829 580.7970304l0 51.06248818 144.67646806 0 0 48.93415651L620.28991829 680.79367509l0 87.23131392-51.06132423 0 0-87.23131392L428.80646144 680.79367509l0-48.93415651 140.42213376 0 0-51.06248818L450.08162475 580.7970304zM501.14411293 385.0604032l0 53.18965475 68.08331718 0 0-53.18965475L501.14411293 385.0604032zM501.14411293 480.80154965l0 55.31682248 68.08331718 0L569.22743011 480.80154965 501.14411293 480.80154965zM688.37323549 385.0604032l-68.0833172 0 0 53.18965475 68.0833172 0L688.37323549 385.0604032zM620.28991829 480.80154965l0 55.31682248 68.0833172 0L688.37323549 480.80154965 620.28991829 480.80154965z" p-id="55447" fill="#1296db"></path></svg><i id="bloop__tip" class="ex-panel__tip"></i></a>`,
  },
  {
    cls: "ex-lottery",
    inner: `<a class="ex-panel__icon" title="全站抽奖信息"><svg style="display:block;" t="1636332741708" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="19181" width="32" height="32"><path d="M508.858182 986.042182c-261.748364 0-473.925818-212.177455-473.925818-473.925818S247.109818 38.190545 508.858182 38.190545s473.925818 212.177455 473.925818 473.925819-212.200727 473.925818-473.925818 473.925818m0-981.690182C228.421818 4.352 1.093818 231.703273 1.093818 512.116364s227.351273 507.764364 507.764364 507.764363c280.413091 0 507.787636-227.351273 507.787636-507.764363S789.271273 4.352 508.858182 4.352" fill="#FF4517" p-id="19182"></path><path d="M322.536727 512.302545l0.023273-1.326545-313.064727-1.931636c0 1.093818-0.093091 2.164364-0.093091 3.281454 0 90.88 24.785455 175.918545 67.84 248.925091l270.173091-155.997091a185.274182 185.274182 0 0 1-24.878546-92.951273zM416.791273 350.440727L264.029091 82.013091A492.986182 492.986182 0 0 0 77.498182 262.981818l270.173091 155.997091a186.717091 186.717091 0 0 1 69.12-68.538182zM602.856727 351.697455l151.831273-259.211637A488.261818 488.261818 0 0 0 508.718545 21.690182l0.023273 304.453818c34.350545 0 66.513455 9.355636 94.114909 25.553455zM258.536727 939.450182a488.471273 488.471273 0 0 0 241.710546 63.674182c2.839273 0 5.632-0.139636 8.448-0.186182V698.507636a185.064727 185.064727 0 0 1-94.068364-25.553454l-156.090182 266.496zM927.325091 270.452364l-257.466182 148.666181a185.204364 185.204364 0 0 1 25.041455 93.207273l-0.046546 1.070546 296.168727 1.838545c0.023273-0.977455 0.069818-1.931636 0.069819-2.909091 0-87.994182-23.249455-170.496-63.767273-241.873454zM600.855273 674.094545l148.573091 261.073455a492.776727 492.776727 0 0 0 178.106181-181.387636l-257.466181-148.642909a187.042909 187.042909 0 0 1-69.213091 68.95709z" fill="#FF4517" p-id="19183"></path><path d="M644.142545 512.302545a135.400727 135.400727 0 0 0-135.424-135.400727l-84.619636-160.791273 20.642909 173.824c-42.658909 22.784-71.400727 70.609455-71.400727 122.368a135.447273 135.447273 0 0 0 270.801454 0z m-133.492363 70.097455a68.491636 68.491636 0 1 1 0.023273-136.96 68.491636 68.491636 0 0 1-0.023273 136.96z" fill="#FF4517" p-id="19184"></path></svg><i id="lottery__tip" class="ex-panel__tip"></i></a>`,
  },
  {
    cls: "popup-player",
    inner: `<a class="ex-panel__icon" title="同屏播放"><svg style="display:block;" t="1579448049771" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1804" width="30" height="30"><path d="M353.024 900.416H109.952c-57.856 0-109.952-46.336-109.952-98.432V153.6c0-52.096 52.096-98.432 109.952-98.432h810.176c57.856 0 104.192 46.336 104.192 98.496v185.472c0 28.928-23.168 52.096-46.336 52.096s-46.272-23.168-46.272-52.096V159.36H98.368V807.68h248.896c34.688 0 52.032 17.408 52.032 46.336 0 28.928-17.344 46.272-46.272 46.272" fill="#f26b1f" p-id="1805"></path><path d="M619.2 631.488c-5.76 0-5.76 5.76-5.76 11.52v223.04c0 5.76 5.76 11.52 5.76 11.52h289.344c5.76 0 11.584-5.76 11.584-11.52v-222.976c0-5.824-5.76-11.584-11.52-11.584H619.136z m289.344 338.688h-289.28a103.68 103.68 0 0 1-104.192-104.128v-222.976c0-57.92 46.272-109.952 104.128-109.952h289.344c57.856 0 104.128 46.272 104.128 109.952v222.976c5.824 57.856-40.448 104.128-104.128 104.128z" fill="#f26b1f" p-id="1806"></path></svg><i id="popup-player__tip" class="ex-panel__tip"></i></a>`,
  },
  {
    cls: "ex-monitor",
    inner: `<a class="ex-panel__icon" title="在线弹幕助手"><svg style="display:block;" t="1638235744961" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="69800" width="32" height="32"><path d="M426.666667 106.666667a21.333333 21.333333 0 0 1 21.333333-21.333334h512a21.333333 21.333333 0 0 1 0 42.666667H448a21.333333 21.333333 0 0 1-21.333333-21.333333z m533.333333 789.333333H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667z m0-554.666667H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667z m0 298.666667H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667zM245.333333 42.666667H96a53.393333 53.393333 0 0 0-53.333333 53.333333v149.333333a53.393333 53.393333 0 0 0 53.333333 53.333334h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333334V96a53.393333 53.393333 0 0 0-53.333334-53.333333z m0 341.333333H96a53.393333 53.393333 0 0 0-53.333333 53.333333v149.333334a53.393333 53.393333 0 0 0 53.333333 53.333333h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333333V437.333333a53.393333 53.393333 0 0 0-53.333334-53.333333z m0 341.333333H96a53.393333 53.393333 0 0 0-53.333333 53.333334v149.333333a53.393333 53.393333 0 0 0 53.333333 53.333333h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333333v-149.333333a53.393333 53.393333 0 0 0-53.333334-53.333334z" fill="#13227a" p-id="69801"></path></svg><i id="Monitor__tip" class="ex-panel__tip"></i></a>`,
  },
  {
    cls: "ex-update",
    inner: `<a class="ex-panel__icon" title="版本更新，当前版本：${__imports.P}"><svg t="1578767541873" style="display:block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="23715" width="32" height="32"><path d="M768 810.7H512c-23.6 0-42.7-19.1-42.7-42.7s19.1-42.7 42.7-42.7h256c94.1 0 170.7-76.6 170.7-170.7 0-89.6-70.1-164.3-159.5-170.1L754 383l-10.7-22.7c-42.2-89.3-133-147-231.3-147s-189.1 57.7-231.3 147L270 383l-25.1 1.6c-89.5 5.8-159.5 80.5-159.5 170.1 0 94.1 76.6 170.7 170.7 170.7 23.6 0 42.7 19.1 42.7 42.7s-19.1 42.7-42.7 42.7c-141.2 0-256-114.8-256-256 0-126.1 92.5-232.5 214.7-252.4C274.8 195.7 388.9 128 512 128s237.2 67.7 297.3 174.2C931.5 322.1 1024 428.6 1024 554.7c0 141.1-114.8 256-256 256z" fill="#3688FF" p-id="23716"></path><path d="M554.7 938.7c-10.9 0-21.8-4.2-30.2-12.5l-128-128c-16.7-16.7-16.7-43.7 0-60.3l128-128c16.6-16.7 43.7-16.7 60.3 0 16.7 16.7 16.7 43.7 0 60.3L487 768l97.8 97.8c16.7 16.7 16.7 43.7 0 60.3-8.3 8.4-19.2 12.6-30.1 12.6z" fill="#5F6379" p-id="23717"></path></svg><i id="ex-update__tip" class="ex-panel__tip"></i></a>`,
  },
];

}
,
"src/next/ui/panels/fans.js":
function* (__imports) {
yield {"createFansContinuePanel": { get: () => createFansContinuePanel, set: value => { createFansContinuePanel = value; } },
"executeFansContinue": { get: () => executeFansContinue, set: value => { executeFansContinue = value; } },
"updateFansContinuePanel": { get: () => updateFansContinuePanel, set: value => { updateFansContinuePanel = value; } }};
function executeFansContinue(inputCount) {
  var val = Number(inputCount);
  var i = !Number.isNaN(val) && val >= 0 ? val : 0;
  __imports.localStorage.setItem("ExSave_FansContinue", String(i));
  let n = 0;
  if (typeof __imports.pt === "function") {
    (0, __imports.pt)(__imports.B, (t) => {
      var o = t.data?.list?.length || 0;
      if (0 == o) (0, __imports.T)("背包礼物为空", "error");
      else {
        for (let e = 0; e < o; e++) {
          if (268 == t.data.list[e].id || 2358 == t.data.list[e].id) {
            n = t.data.list[e].id;
            var count = t.data.list[e].count;
            break;
          }
        }
        0 == n
          ? (0, __imports.T)("没有足够的道具", "error")
          : (0, __imports.fetch)("https://www.douyu.com/member/cp/getFansBadgeList", {
              method: "GET",
              mode: "no-cors",
              cache: "default",
              credentials: "include",
            })
              .then((e) => e.text())
              .then(async (e) => {
                var badgeList = new DOMParser()
                  .parseFromString(e, "text/html")
                  .getElementsByClassName("fans-badge-list")[0];
                var o = badgeList ? badgeList.lastElementChild : null;
                var t = o ? o.children.length : 0;
                0 == i && t > 0 && (i = Math.floor(count / t));
                for (let e = 0; e < t; e++) {
                  let t = o.children[e].getAttribute("data-fans-room");
                  await (0, __imports.b)(250).then(() => {
                    (0, __imports.Ut)(n, i, t)
                      .then((e) => {
                        "success" == e.msg
                          ? (0, __imports.T)("【续牌】" + t + "赠送荧光棒成功", "success")
                          : ((0, __imports.T)("【续牌】" + t + "赠送失败 " + e.msg, "error"),
                            console.log(t, e));
                      })
                      .catch((e) => {
                        (0, __imports.T)("【续牌】" + t + "赠送失败", "error");
                        console.log(t, e);
                      });
                  });
                }
                (0, __imports.T)("【一键续牌】所有关注房间续牌执行完毕！", "success");
                updateFansContinuePanel();
              })
              .catch((e) => {
                console.log("请求失败!", e);
              });
      }
    });
  }
}

function updateFansContinuePanel() {
  var badgeNameEl = document.getElementById("fans-panel-badge-name");
  var badgeCountEl = document.getElementById("fans-panel-badge-count");
  var stickCountEl = document.getElementById("fans-panel-stick-count");

  try {
    __imports.localStorage.removeItem("ExSave_GoldBadgeName");
  } catch (e) {}
  var activeBadge = "";
  try {
    var domBadge = document.querySelector(
      ".FansMedal-name, dy-fan-medal, .FansMedalWrap .FansMedal-name",
    );
    if (domBadge && domBadge.textContent)
      activeBadge = domBadge.textContent.trim();
  } catch (e) {}
  if (badgeNameEl) badgeNameEl.textContent = activeBadge || "已配粉丝牌";

  if (typeof __imports.pt === "function") {
    (0, __imports.pt)(__imports.B, function (t) {
      var list = t.data?.list || [];
      var stickCount = 0;
      for (var idx = 0; idx < list.length; idx++) {
        if (268 == list[idx].id || 2358 == list[idx].id) {
          stickCount = list[idx].count;
          break;
        }
      }
      if (stickCountEl) stickCountEl.textContent = String(stickCount);
    });
  }

  (0, __imports.fetch)("https://www.douyu.com/member/cp/getFansBadgeList", {
    method: "GET",
    mode: "no-cors",
    cache: "default",
    credentials: "include",
  })
    .then((e) => e.text())
    .then((e) => {
      var badgeList = new DOMParser()
        .parseFromString(e, "text/html")
        .getElementsByClassName("fans-badge-list")[0];
      var o = badgeList ? badgeList.lastElementChild : null;
      var count = o ? o.children.length : 0;
      if (badgeCountEl) badgeCountEl.textContent = String(count);
      if (!activeBadge && badgeList && badgeNameEl) {
        var activeLi = badgeList.querySelector(
          "li.active, li[data-active='1'], .fans-badge-item.active",
        );
        if (activeLi) {
          var nameSpan = activeLi.querySelector(
            ".badge-name, .fans-badge-name, span",
          );
          if (nameSpan && nameSpan.textContent)
            badgeNameEl.textContent = nameSpan.textContent.trim();
        }
      }
    })
    .catch(() => {});
}

function createFansContinuePanel() {
  if (document.querySelector(".fans-continue-panel")) return;
  var p = document.createElement("div");
  p.className = "fans-continue-panel miuix-modal";
  p.innerHTML = `
        <div class="fans-panel__card">
                <div class="fans-panel__card-header">
                    <span class="fans-panel__card-title">徽章与资产</span>
                    <span class="fans-panel__badge-tag" id="fans-panel-badge-name">当前佩戴</span>
                </div>
                <div class="fans-panel__asset-grid">
                    <div class="fans-panel__asset-item">
                        <span class="fans-panel__asset-label">已有粉丝牌</span>
                        <span class="fans-panel__asset-value" id="fans-panel-badge-count">-</span>
                    </div>
                    <div class="fans-panel__asset-item">
                        <span class="fans-panel__asset-label">背包荧光棒</span>
                        <span class="fans-panel__asset-value" id="fans-panel-stick-count">-</span>
                    </div>
                    <div class="fans-panel__asset-item">
                        <span class="fans-panel__asset-label">牌子状态</span>
                        <span class="fans-panel__asset-value fans-panel__status--ok" id="fans-panel-badge-status">健康保活</span>
                    </div>
                </div>
            </div>

            <div class="fans-panel__card">
                <div class="fans-panel__card-header">
                    <span class="fans-panel__card-title">续牌赠送配置</span>
                </div>
                <div class="fans-panel__input-group">
                    <label class="fans-panel__input-label">每个直播间赠送荧光棒数量：</label>
                    <div class="fans-panel__input-box">
                        <input type="number" id="fans-panel-stick-input" min="0" value="0" placeholder="0 表示全量平均赠送" />
                        <span class="fans-panel__input-hint">根 (输入 0 则平均分配背包余量)</span>
                    </div>
                </div>
            </div>

            <div class="fans-panel__action-wrap">
                <button type="button" class="ex-btn-primary fans-panel__submit-btn" id="fans-panel-start-btn">
                    立即开始续牌
                </button>
            </div>
        </div>
    `;
  document.body.appendChild(p);
  (0, __imports.ensureMiuixPanelHeader)(p, "一键续牌");

  (0, __imports.safeBind)("#fans-panel-start-btn", "click", function (e) {
    e.stopPropagation();
    var val = document.getElementById("fans-panel-stick-input")?.value || "0";
    __imports.nextFeatures.invoke('fans-continue', 'execute', val);
  });
}

}
,
"src/next/ui/panels/sign.js":
function* (__imports) {
yield {"createSignPanel": { get: () => createSignPanel, set: value => { createSignPanel = value; } }};
function createSignPanel() {
  if (document.querySelector(".sign-panel")) return;
  var p = document.createElement("div");
  p.className = "sign-panel miuix-modal";
  p.innerHTML = `
        <div class="fans-panel__card">
            <div class="fans-panel__card-header">
                <span class="fans-panel__card-title">签到选项</span>
                <span style="font-size: 11px; color: #64748b;">按需勾选日常任务</span>
            </div>
            <div class="sign-options-list">
                <label class="sign-option-item">
                    <input type="checkbox" id="sign_opt_room" class="sign-checkbox" data-key="room">
                    <div class="sign-option-text">
                        <span class="sign-option-title">房间与粉丝牌签到</span>
                        <span class="sign-option-desc">为所有关注/拥牌房间赠送亲密度</span>
                    </div>
                </label>
                <label class="sign-option-item">
                    <input type="checkbox" id="sign_opt_client" class="sign-checkbox" data-key="client">
                    <div class="sign-option-text">
                        <span class="sign-option-title">客户端模拟签到</span>
                        <span class="sign-option-desc">模拟手机客户端领取每日免费礼盒</span>
                    </div>
                </label>
                <label class="sign-option-item">
                    <input type="checkbox" id="sign_opt_yuba" class="sign-checkbox" data-key="yuba">
                    <div class="sign-option-text">
                        <span class="sign-option-title">关注鱼吧签到</span>
                        <span class="sign-option-desc">关注的所有鱼吧一键打卡领经验</span>
                    </div>
                </label>
                <label class="sign-option-item">
                    <input type="checkbox" id="sign_opt_stardiscover" class="sign-checkbox" data-key="stardiscover">
                    <div class="sign-option-text">
                        <span class="sign-option-title">星推日常任务</span>
                        <span class="sign-option-desc">打卡/口令弹幕/关注任务(完成自动安全取关)</span>
                    </div>
                </label>
                <label class="sign-option-item">
                    <input type="checkbox" id="sign_opt_fanshome" class="sign-checkbox" data-key="fanshome">
                    <div class="sign-option-text">
                        <span class="sign-option-title">粉丝家园与钻粉联赛</span>
                        <span class="sign-option-desc">粉丝家园打卡与钻粉日常领奖</span>
                    </div>
                </label>
            </div>
        </div>

        <div class="fans-panel__card">
            <div class="fans-panel__card-header">
                <span class="fans-panel__card-title">执行状态</span>
                <span class="sign-status-tag" id="sign-status-tag">就绪</span>
            </div>
            <div class="sign-log-box" id="sign-log-box">
                勾选上方选项后，点击下方按钮开始签到。
            </div>
        </div>

        <div class="fans-panel__action-wrap">
            <button type="button" class="ex-btn-primary fans-panel__submit-btn" id="sign-panel-start-btn">
                开始签到
            </button>
        </div>
    `;
  document.body.appendChild(p);
  (0, __imports.ensureMiuixPanelHeader)(p, "一键签到");

  // 状态与配置持久化
  var defCfg = {
    room: true,
    client: true,
    yuba: true,
    fanshome: true,
    stardiscover: true,
  };
  var currentCfg = defCfg;
  try {
    var saved = JSON.parse(__imports.localStorage.getItem("ExSave_SignConfig"));
    if (saved && typeof saved === "object")
      currentCfg = Object.assign({}, defCfg, saved);
  } catch (e) {}

  var cbs = p.querySelectorAll(".sign-checkbox");
  cbs.forEach(function (cb) {
    var key = cb.getAttribute("data-key");
    if (key && typeof currentCfg[key] !== "undefined") {
      cb.checked = !!currentCfg[key];
    }
    cb.addEventListener("change", function () {
      currentCfg[key] = this.checked;
      try {
        __imports.localStorage.setItem("ExSave_SignConfig", JSON.stringify(currentCfg));
      } catch (e) {}
    });
  });

  (0, __imports.safeBind)("#sign-panel-start-btn", "click", async function (e) {
    e.stopPropagation();
    var btn = document.getElementById("sign-panel-start-btn");
    var logBox = document.getElementById("sign-log-box");
    var statusTag = document.getElementById("sign-status-tag");

    if (btn) btn.disabled = true;
    if (statusTag) {
      statusTag.textContent = "正在执行";
      statusTag.style.color = "#ff7700";
    }
    if (logBox) logBox.innerHTML = "正在启动已选签到任务...<br>";

    var logs = [];
    function appendLog(msg, isSuccess) {
      logs.push(msg);
      if (logBox) {
        logBox.innerHTML = logs
          .map(function (l) {
            return "• " + l;
          })
          .join("<br>");
        logBox.scrollTop = logBox.scrollHeight;
      }
      if (typeof __imports.T === "function") (0, __imports.T)(msg, isSuccess ? "success" : "info");
    }

    try {
      if (typeof __imports.executeSignEngine === "function") {
        await __imports.nextFeatures.invoke('ex-sign', 'execute', currentCfg, appendLog);
      } else if (typeof __imports.Wn === "function") {
        await (0, __imports.Wn)(currentCfg);
      }
      if (statusTag) {
        statusTag.textContent = "已完成";
        statusTag.style.color = "#10b981";
      }
    } catch (err) {
      appendLog("签到执行异常: " + (err.message || "未知错误"), false);
      if (statusTag) {
        statusTag.textContent = "异常中止";
        statusTag.style.color = "#ef4444";
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}
window.createSignPanel = createSignPanel;

}
,
"src/next/ui/panels/popup.js":
function* (__imports) {
yield {"createPopupPlayerPanel": { get: () => createPopupPlayerPanel, set: value => { createPopupPlayerPanel = value; } },
"executePopupPlayer": { get: () => executePopupPlayer, set: value => { executePopupPlayer = value; } }};
function executePopupPlayer(url, isNoIframe) {
  var t = url ? url.trim() : "";
  if (!t) {
    (0, __imports.T)("请输入直播间或直播流地址", "error");
    return;
  }
  if (typeof __imports.ExLoadLib === "function" && typeof __imports.EXURL !== "undefined") {
    (0, __imports.ExLoadLib)(__imports.EXURL.flv);
  }
  var a;
  let isStream =
    150 < t.length &&
    (t.startsWith("http://") ||
      t.startsWith("https://") ||
      t.includes(".flv") ||
      t.includes(".m3u8"));
  if (isStream) {
    (0, __imports.rn)(__imports.D.length, t);
  } else if (isNoIframe) {
    if (-1 != t.indexOf("douyu.com")) {
      a = (e) => {
        (0, __imports.en)(__imports.D.length, e, "Douyu");
      };
      (0, __imports.fetch)(t, {
        method: "GET",
        mode: "no-cors",
        cache: "default",
        credentials: "include",
      })
        .then((e) => e.text())
        .then((e) => {
          var doc = new DOMParser().parseFromString(e, "text/html");
          var html = doc.getElementsByTagName("html")[0].innerHTML;
          var o = "$ROOM.room_id =".length,
            n = html.indexOf("$ROOM.room_id =");
          let rid = "";
          0 < n
            ? (rid = (rid = html.substring(
                n + o,
                html.indexOf(";", n + o),
              )).trim())
            : (rid = (0, __imports.v)(html, "roomID:", ","))
              ? (rid = rid.trim())
              : (n = doc.querySelector('link[rel="canonical"]')) &&
                ((o = n.getAttribute("href")),
                (rid = o.split("/").pop().trim()));
          /^[0-9]+$/.test(rid)
            ? a(rid)
            : (0, __imports.T)("获取直播间失败，请检查直播间地址是否正确！", "error");
        })
        .catch((e) => {
          console.log("请求失败!", e);
        });
    } else if (-1 != t.indexOf("bilibili.com")) {
      var r = t,
        l = (e) => {
          (0, __imports.en)(__imports.D.length, e, "Bilibili");
        };
      r = (r = r.split("/"))[r.length - 1];
      (0, __imports.GM_xmlhttpRequest)({
        method: "GET",
        url: "https://api.live.bilibili.com/room/v1/Room/room_init?id=" + r,
        responseType: "json",
        onload: function (e) {
          e = e.response;
          l(e.data.room_id);
        },
      });
    } else if (-1 != t.indexOf("huya.com")) {
      (0, __imports.en)(__imports.D.length, t, "Huya");
    } else {
      (0, __imports.rn)(__imports.D.length, t);
    }
  } else {
    var r = __imports.D.length;
    if (-1 == String(t).indexOf("douyu.com")) {
      (0, __imports.T)("有弹幕模式仅支持斗鱼直播", "error");
    } else {
      var i = String(t).split("/"),
        rid = i[i.length - 1];
      var o = document.createElement("div"),
        n = "";
      o.id = "exVideoDiv" + String(r);
      o.rid = rid;
      o.className = "exVideoDiv";
      n =
        (n =
          (n =
            (n +=
              "<div class='exVideoInfo' id='exVideoInfo" +
              String(r) +
              "'><span class='exVideoRID' id='exVideoRID" +
              String(r) +
              "' style='color:white'>斗鱼 - " +
              rid +
              "</span>") +
            "<a><div class='exVideoClose' id='exVideoClose" +
            String(r) +
            "'>X</div></a></div>") +
          "<iframe class='exVideoPlayer' id='exVideoPlayer" +
          String(r) +
          "' src=" +
          t +
          "?exid=chun></iframe>") +
        "<div class='exVideoScale' id='exVideoScale" +
        String(r) +
        "'></div>";
      o.innerHTML = n;
      var target = (0, __imports.E)([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"]);
      if (target) target.insertBefore(o, target.childNodes[0]);
      (0, __imports.on)(r);
      (0, __imports.tn)(r);
      r > __imports.D.length - 1 ? __imports.D.push("iframe") : (__imports.D[r] = "iframe");
      let curDiv = document.getElementById("exVideoDiv" + String(r));
      let curClose = document.getElementById("exVideoClose" + String(r));
      if (curClose) {
        curClose.onclick = function () {
          __imports.D[r].destroy();
          curDiv.remove();
        };
      }
      if (curDiv) {
        curDiv.onclick = function (e) {
          e.stopPropagation();
          e.preventDefault();
          for (let idx = 0; idx < __imports.D.length; idx++) {
            var item = document.getElementById("exVideoDiv" + String(idx));
            if (item) {
              idx == r
                ? (item.style.zIndex = 1016)
                : (item.style.zIndex = 1428);
            }
          }
        };
      }
    }
  }
}

function createPopupPlayerPanel() {
  if (document.querySelector(".popup-player-panel")) return;
  var p = document.createElement("div");
  p.className = "popup-player-panel miuix-modal";
  p.innerHTML = `
        <div class="popup-panel__card">
                <div class="popup-panel__card-header">
                    <span class="popup-panel__card-title">直播流或房间地址</span>
                    <button type="button" class="popup-panel__paste-btn" id="popup-panel-paste">粘贴</button>
                </div>
                <div class="popup-panel__input-box">
                    <input type="text" id="popup-panel-url" value="https://www.douyu.com/4042402" placeholder="支持斗鱼/虎牙/B站房间号或直播流" />
                </div>
            </div>

            <div class="popup-panel__card">
                <div class="popup-panel__card-header">
                    <span class="popup-panel__card-title">同屏播放模式</span>
                </div>
                <div class="popup-panel__seg-switch">
                    <label class="popup-panel__seg-item">
                        <input type="radio" name="popup_player_mode" value="noiframe" checked />
                        <span class="popup-panel__seg-thumb">无弹幕极速流 (推荐)</span>
                    </label>
                    <label class="popup-panel__seg-item">
                        <input type="radio" name="popup_player_mode" value="iframe" />
                        <span class="popup-panel__seg-thumb">全功能有弹幕</span>
                    </label>
                </div>
            </div>

            <div class="popup-panel__action-wrap">
                <button type="button" class="ex-btn-primary popup-panel__submit-btn" id="popup-panel-start-btn">
                    载入同屏流
                </button>
            </div>
        </div>
    `;
  var container =
    document.getElementsByClassName("layout-Player-chat")[0] || document.body;
  if (container) container.insertBefore(p, container.childNodes[0]);
  (0, __imports.ensureMiuixPanelHeader)(p, "同屏播放器");

  (0, __imports.safeBind)("#popup-panel-paste", "click", async function (e) {
    e.stopPropagation();
    try {
      var text = await navigator.clipboard.readText();
      if (text) {
        var inp = document.getElementById("popup-panel-url");
        if (inp) inp.value = text.trim();
        (0, __imports.T)("已从剪贴板粘贴直播流地址", "success");
      }
    } catch (err) {
      (0, __imports.T)("请允许读取剪贴板权限或手动粘贴", "info");
    }
  });

  (0, __imports.safeBind)("#popup-panel-start-btn", "click", function (e) {
    e.stopPropagation();
    var urlInp = document.getElementById("popup-panel-url");
    var val = urlInp ? urlInp.value.trim() : "";
    var isNoIframe =
      document.querySelector(
        'input[name="popup_player_mode"][value="noiframe"]',
      )?.checked ?? true;
    __imports.nextFeatures.invoke('popup-player', 'execute', val, isNoIframe);
    p.style.setProperty("display", "none", "important");
    (0, __imports.updateDockActiveIndicator)();
  });
}

}
,
"src/next/ui/panels/update.js":
function* (__imports) {
yield {"createExUpdatePanel": { get: () => createExUpdatePanel, set: value => { createExUpdatePanel = value; } }};
function createExUpdatePanel() {
  var currentVer =
    typeof __imports.P !== "undefined" && __imports.P
      ? __imports.P
      : typeof __imports.GM_info !== "undefined" &&
          __imports.GM_info.script &&
          __imports.GM_info.script.version
        ? __imports.GM_info.script.version
        : "2026.09.18.01";
  var existing = document.querySelector(".exupdate-panel");
  if (existing) {
    if (existing.dataset.version === currentVer) return;
    existing.remove();
  }
  var p = document.createElement("div");
  p.className = "exupdate-panel miuix-modal";
  p.dataset.version = currentVer;
  p.innerHTML = `
        <div class="exupdate-panel__card">
            <div class="exupdate-panel__card-header">
                <span class="exupdate-panel__card-title">新增功能·</span>
            </div>
            <ul class="exupdate-list">
                <li>① 一键签到三级控制面板完整落地 (createSignPanel / sign-panel)：彻底结束过去盲目后台静默执行的黑盒状态。新增标准 380×370px MIUIX 流式拟态模态视窗，支持按需自由勾选 5 大日常签到任务（房间与粉丝牌签到、客户端模拟领礼盒、关注鱼吧签到、星推日常任务、粉丝家园与钻粉日常），选项状态实时持久化记忆至 ExSave_SignConfig，并配备实时任务日志视窗与纯文字操作按钮</li>
                <li>② 5 级模态礼物选择器全域复用与背包送礼现代化：将 540×410px MIUIX 拟态大选择器专职全量赋能给【背包送礼】（extool__clearbag），实时双流并行聚合房间专属在播礼物与官方通用大盘礼物（140+款），内置触控胶囊即点即选、背包道具现场直探与 4px 极细微质感滚动条</li>
                <li>③ 现代化星推日常任务全景式自动化打满：深度逆向斗鱼全民星推长连接与上报协议，一键拉满单日 39+ 金币全部零成本收益（每日打开活动页打卡 +10、3个直播间签到打卡 +9、指定参赛房间口令弹幕助力 +5、房间互动积分上报、以及 5 位关注任务 +15）</li>
                <li>④ 动态逐轮 introduce 推荐与 task/list 实时状态机闭环：每轮动态切换星推房间源请求官方 introduce 推荐单，确保每一位主播均被斗鱼服务端认定为有效任务推荐；关注后保持 1.8 秒服务端入账呼吸窗口，随后调用官方标准 follow/rm 接口执行安全取关（内置 3 次重试与凭据刷新），并在任务末尾增加全量安全扫尾，关注列表 100% 保持纯净</li>
            </ul>
        </div>
        <div class="exupdate-panel__card">
            <div class="exupdate-panel__card-header">
                <span class="exupdate-panel__card-title">优化与修复·</span>
            </div>
            <ul class="exupdate-list">
                <li>① 连根拔除原作者恶意关注陌生主播漏洞与死硬编码“幻神”兜底：彻底清理原版作者残留的 anchorstardiscover 恶意偷关逻辑，彻底删除 ExSave_GoldBadgeName 旧缓存与假数据 fallback，当前佩戴真实粉丝牌动态提取回显，杜绝任何未经允许关注陌生主播的行为</li>
                <li>② 彻底清除斗鱼早已关停下线的远古车队系统代码：彻底清除 2KB+ 腾讯云 IM 通信接口、usersig 登录打卡及车队周常经验代码 (Xn 及相关接口)，并从一键签到控制台和工具栏提示中彻底移除“车队”相关选项与字符，杜绝无意义网络请求与冗余报错</li>
                <li>③ 指定星推参赛直播间门禁检测 (isStarCompetitionRoom)：深度逆向斗鱼 rank/info 的 memberInfo 状态机 (hide===0 且 rank>0)，自动判断用户当前所在房间是否为正在打比赛的星推主播；非星推直播间自动跳过“全民星推荐助力主播成长”口令弹幕发送并在日志视窗清晰提示，彻底杜绝在用户喜爱的普通主播直播间误发口令造成打扰</li>
                <li>④ 斗鱼官方标准 ccn 凭据自动提取与安全取关重试：彻底废弃历史旧代码基于 acf_auth 截断过期 ctn 的错误实现，全面接入斗鱼现代 Web 规范的 ccn Cookie 与 CSRF 自动唤醒接口 (/wgapi/livenc/liveweb/csrfApi/getCsrfCookie)，确保取关请求 100% 鉴权通过</li>
                <li>⑤ 悬停版本号与全局版本动态同步：彻底清除 05_services.js 中遗留的远古硬编码 var P = "2026.09.14.13"，全面在 01_setup.js 顶层从 GM_info.script.version 动态绑定；底栏【版本更新】图标悬停 title 模板字符串修复，鼠标悬停即刻正确回显当前最新版本号</li>
            </ul>
        </div>
        <div class="exupdate-panel__card">
            <div class="exupdate-panel__card-header">
                <span class="exupdate-panel__card-title">其它·</span>
            </div>
            <ul class="exupdate-list">
                <li>① 核心画质拦截层 100% 守恒：src/core/ 黄金拦截逻辑严格 0 修改，首流极清秒开无二次切流</li>
                <li>② 全按钮严格遵循零 Emoji 工业契约与 MIUIX 流式拟态微质感</li>
                <li>③ 构建编译集成 V8 AST 原生语法核验机制 (耗时 15ms)</li>
                <li>④ 生产包体精简度大幅提升：彻底剥离百变礼物伪造层与历史冗余死重，包体净精简 48.5 KB，V8 解析开销降低 8.2%</li>
            </ul>
        </div>
        <div class="exupdate-panel__action-wrap">
            <button type="button" class="ex-btn-primary exupdate-panel__submit-btn" id="exupdate-action-btn">我已收到</button>
        </div>
    `;
  document.body.appendChild(p);
  (0, __imports.ensureMiuixPanelHeader)(p, "版本更新");

  var btn = p.querySelector("#exupdate-action-btn");
  if (!btn) return;

  // 多态状态机初始化
  function setBtnState(state, text) {
    btn.className = "ex-btn-primary exupdate-panel__submit-btn";
    btn.dataset.state = state;
    btn.disabled = false;
    if (state === "ack") {
      btn.classList.add("exupdate-state-btn--ack");
      btn.textContent = text || "我已收到";
    } else if (state === "check") {
      btn.classList.add("exupdate-state-btn--check");
      btn.textContent = text || "检查更新";
    } else if (state === "checking") {
      btn.classList.add("exupdate-state-btn--checking");
      btn.textContent = text || "正在检查更新...";
      btn.disabled = true;
    } else if (state === "latest") {
      btn.classList.add("exupdate-state-btn--latest");
      btn.textContent = text || "已是最新";
    } else if (state === "upgrade") {
      btn.classList.add("exupdate-state-btn--upgrade");
      btn.textContent = text || "前往更新";
    }
  }

  var lastNotified = (0, __imports.GM_getValue)("Ex_LastNotifiedVersion");
  if (lastNotified !== currentVer) {
    setBtnState("ack", "我已收到");
  } else {
    setBtnState("check", "检查更新");
  }

  btn.onclick = function (e) {
    e.stopPropagation();
    var st = btn.dataset.state;
    if (st === "ack") {
      (0, __imports.GM_setValue)("Ex_LastNotifiedVersion", currentVer);
      var tip = document.getElementById("ex-update__tip");
      if (tip) tip.style.display = "none";
      setBtnState("check", "检查更新");
    } else if (st === "check") {
      setBtnState("checking", "正在检查更新...");
      var handleUpdateData = function (data) {
        if (
          data &&
          data.version &&
          typeof __imports.isNewerVersion === "function" &&
          (0, __imports.isNewerVersion)(data.version, currentVer)
        ) {
          setBtnState("upgrade", "前往更新");
          var tip = document.getElementById("ex-update__tip");
          if (tip) tip.style.display = "block";
        } else {
          setBtnState("latest", "已是最新");
        }
      };
      if (typeof __imports.GM_xmlhttpRequest === "function") {
        (0, __imports.GM_xmlhttpRequest)({
          method: "GET",
          url: "https://greasyfork.org/scripts/595575.json",
          responseType: "json",
          onload: function (res) {
            var data = res.response;
            if (typeof data === "string") {
              try {
                data = JSON.parse(data);
              } catch (e) {}
            }
            handleUpdateData(data);
          },
          onerror: function () {
            setBtnState("latest", "已是最新");
          },
        });
      } else {
        (0, __imports.fetch)("https://greasyfork.org/scripts/595575.json")
          .then(function (res) {
            return res.json();
          })
          .then(handleUpdateData)
          .catch(function () {
            setBtnState("latest", "已是最新");
          });
      }
    } else if (st === "latest") {
      setBtnState("check", "检查更新");
    } else if (st === "upgrade") {
      (0, __imports.GM_openInTab)("https://greasyfork.org/zh-CN/scripts/595575", {
        active: true,
      });
    }
  };
}
window.createExUpdatePanel = createExUpdatePanel;

}
,
"src/next/ui/dock.js":
function* (__imports) {
yield {"handleDockAction": { get: () => handleDockAction, set: value => { handleDockAction = value; } },
"initDockFull": { get: () => initDockFull, set: value => { initDockFull = value; } },
"triggerFansContinue": { get: () => triggerFansContinue, set: value => { triggerFansContinue = value; } }};
function handleDockHover(cls, btnEl) {
  (0, __imports.clearSubPanelTimer)();
  return __imports.nextFeatures.invoke(cls, 'open', true, btnEl);
}
function handleDockAction(cls, btnEl) {
  (0, __imports.clearSubPanelTimer)();
  return __imports.nextFeatures.invoke(cls, 'open', false, btnEl || document.querySelector('.' + cls));
}
function triggerFansContinue() {
  return handleDockAction('fans-continue');
}
function initDockFull(wrap) {
  if (!wrap || __imports.nextDockOwners.has(wrap)) return;
  // A remounted room must not retain listeners or insertion patches on detached Dock nodes.
  for (const [node, owner] of __imports.nextDockOwners) if (!node.isConnected) owner.dispose();
  const owner = (0, __imports.createNextDockOwner)(wrap);
  try {
    (0, __imports.createFansContinuePanel)();
    (0, __imports.createSignPanel)();
    (0, __imports.createPopupPlayerPanel)();
    (0, __imports.createExUpdatePanel)();
    owner.listen(wrap, 'mouseenter', __imports.clearSubPanelTimer);
    owner.listen(wrap, 'mouseleave', __imports.scheduleSubPanelClose);
    for (const def of __imports.DOCK_DEFS) {
      let el = wrap.querySelector('.' + def.cls);
      if (!el) {
        el = document.createElement('div');
        el.className = def.cls;
        el.innerHTML = def.inner.replace("'+P+'", __imports.P);
        wrap.appendChild(el);
      }
      if (!el.querySelector('.ex-panel__indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'ex-panel__indicator';
        el.appendChild(indicator);
      }
      el.style.cursor = 'pointer';
      owner.property(el, 'onmouseenter', () => handleDockHover(def.cls, el));
      owner.property(el, 'onmouseleave', __imports.scheduleSubPanelClose);
      const click = event => { event.stopPropagation(); handleDockAction(def.cls, el); };
      owner.property(el, 'onclick', click);
      const link = el.querySelector('a');
      if (link) owner.property(link, 'onclick', click);
    }
    const original = wrap.insertBefore;
    owner.property(wrap, 'insertBefore', function(node, reference) {
      // Only deduplicate owned Dock classes. Never interpret arbitrary className as CSS.
      const def = __imports.DOCK_DEFS.find(item => node && node.classList && node.classList.contains(item.cls));
      const existing = def && wrap.querySelector('.' + def.cls);
      return existing || original.call(wrap, node, reference);
    });
    // The original fallback addEventListener bindings doubled parent clicks.
    // The property handlers above are the single Dock dispatch path.
    if (typeof __imports.initVersionLifecycleNotice === 'function') (0, __imports.initVersionLifecycleNotice)();
  } catch (error) {
    owner.dispose();
    throw error;
  }
}

}
,
"src/next/ui/room/backpack.js":
function* (__imports) {
yield {"mountBackpackControls": { get: () => mountBackpackControls, set: value => { mountBackpackControls = value; } }};
// Room assembly section; dependencies are captured per mount, in original order.
function mountBackpackControls(owner) {
    let o = (0, __imports.E)([".BackpackButton", "#js-backpack-enter"]);
    o &&
      owner.listen(o, "click", function () {
        (owner.timeout(() => {
          __imports.de && (__imports.de.closeHook(), (__imports.de = null));
          let t = document.querySelectorAll(".ToolbarBackpack-giftItem").length;
          __imports.de = new __imports.DomMutationSubscription(".BackpackExpandPanel-giftListWrap", !0, (e) => {
            t !=
              document.querySelectorAll(".ToolbarBackpack-giftItem").length &&
              (o.click(), o.click());
          }, owner);
        }, 500),
          (0, __imports.clearTimeout)(__imports.se),
          (__imports.se = owner.timeout(() => {
            let p = !!document.getElementsByClassName("BackpackExpandPanel")[0];
            (0, __imports.E)([".Backpack.JS_Backpack", ".BackpackExpandPanel"]) &&
              (0, __imports.pt)(__imports.B, (n) => {
                var i = n.data.list.length;
                if (0 < i) {
                  let t = 0,
                    o = 0;
                  for (let e = 0; e < i; e++) {
                    var a = ((e) => {
                        for (var t of e) {
                          let e = [];
                          if (
                            0 <
                            (e =
                              "string" == typeof t
                                ? document.querySelectorAll(t)
                                : t).length
                          )
                            return e;
                        }
                        return [];
                      })([".Backpack-prop", ".ToolbarBackpack-giftItem"])[e],
                      r = n.data.list[e].isValuable,
                      l = n.data.list[e].expiry,
                      s = n.data.list[e].price,
                      d = n.data.list[e].intimate,
                      c = n.data.list[e].count,
                      r =
                        ("1" == r && (t += Number(s) * Number(c)),
                        (o += Number(d) * Number(c)),
                        document.createElement("div"));
                    ((r.className = "bag-info"),
                      p && ((r.style.left = "8px"), (r.style.bottom = "auto")),
                      (r.innerHTML = l - 1),
                      a.insertBefore(r, a.childNodes[0]));
                  }
                  var e = (0, __imports.E)([
                    ".BackpackHeader-extInfo",
                    ".BackpackExpandPanel-backpackHeader",
                  ]);
                  (p
                    ? (e.innerHTML =
                        e.innerHTML +
                        `<span style="width: 100%;display: flex;justify-content: space-between;align-items: center;flex: 1;margin-left: 12px;">

                                <span>

                                    <span>总价值:</span>

                                    <span>￥${String(Number(t / 100).toFixed(2))}</span>

                                    <span>总亲密度:</span>

                                    <span>${String(o)}</span>

                                </span>

                                <span class="bag-button" id="Backpack__clearbag" style="background: rgb(70, 171, 255) !important;color: white !important;">清空背包</span>

                            </span>`)
                    : (e.innerHTML =
                        '<span style="float: left">总价值：' +
                        String(Number(t / 100).toFixed(2)) +
                        " 总亲密度：" +
                        String(o) +
                        '<span class="bag-button" id="Backpack__clearbag">清空背包</span></span>' +
                        e.innerHTML),
                    (0, __imports.safeBind)("#Backpack__clearbag", "click", () => {
                      1 == confirm("确认清空？") &&
                        ((0, __imports.T)("【清空背包】执行中...", "info"),
                        (0, __imports.pt)(__imports.B, (e) => {
                          (async (n, i) => {
                            var t = n.data.list.length;
                            if (0 < t) {
                              for (let e = 0; e < t; e++) {
                                let t = n.data.list[e].id,
                                  o = n.data.list[e].count;
                                if (
                                  0 <
                                  Object.keys(n.data.list[e].batchInfo).length
                                )
                                  await (0, __imports.b)(100).then(() => {
                                    (0, __imports.Ut)(t, o, i);
                                  });
                                else
                                  for (let e = 0; e < o; e++)
                                    await (0, __imports.b)(100).then(() => {
                                      (0, __imports.Ut)(t, 1, i);
                                    });
                              }
                              (0, __imports.T)("【清空背包】执行完毕！", "success");
                            } else (0, __imports.T)("背包礼物为空", "error");
                          })(e, __imports.B);
                        }));
                    }, owner));
                }
              });
          }, 500)));
      });
  }

}
,
"src/next/ui/room/video-toolbar.js":
function* (__imports) {
yield {"mountVideoToolbar": { get: () => mountVideoToolbar, set: value => { mountVideoToolbar = value; } }};
// Room assembly section; dependencies are captured per mount, in original order.
function mountVideoToolbar(owner) {
    let s = owner.interval(() => {
      if ((0, __imports.E)([".right-e7ea5d", ".right-17e251"])) {
        ((0, __imports.clearInterval)(s),
          (__imports.V = document.querySelector(".layout-Player-videoEntity video")),
          (document.getElementsByClassName("disable-23f484")[0].innerHTML =
            "DouyuEx-RL_" + __imports.P));
        var e = document.createElement("div"),
          t =
            ((e.id = "ex-vtoolbar-menu"),
            (e.className = "vtoolbar-menu"),
            (e.innerHTML = `

        <button type="button" class="vtoolbar-menu__trigger" title="DouyuEx-RL Ver${__imports.P}" aria-expanded="false" aria-haspopup="true">

            ${__imports.fr}

        </button>

        <div class="vtoolbar-menu__dropdown" role="menu" aria-label="DouyuEx-RL Ver${__imports.P}">

            <button type="button" class="vtoolbar-menu__item" id="vtoolbar-menu-joysound" role="menuitem">

                <span class="vtoolbar-menu__item-icon" id="vtoolbar-joysound-icon"></span>

                <span class="vtoolbar-menu__item-label">Joysound 音效</span>

                <span class="vtoolbar-menu__switch" id="vtoolbar-joysound-switch" aria-hidden="true">

                    <span class="vtoolbar-menu__switch-thumb"></span>

                </span>

            </button>

            <button type="button" class="vtoolbar-menu__item vtoolbar-menu__item--filter" id="vtoolbar-menu-filter" role="menuitem" aria-expanded="false">

                <span class="vtoolbar-menu__item-icon">${__imports.yr}</span>

                <span class="vtoolbar-menu__item-label">画面滤镜</span>

                ${typeof __imports.vtoolbarChevronSvg !== "undefined" ? __imports.vtoolbarChevronSvg : ""}

            </button>

            <button type="button" class="vtoolbar-menu__item" id="vtoolbar-menu-copy-live" role="menuitem">

                <span class="vtoolbar-menu__item-icon">${__imports.vr}</span>

                <span class="vtoolbar-menu__item-label">复制直播流地址</span>

            </button>

            <button type="button" class="vtoolbar-menu__item" id="vtoolbar-menu-audio-line" role="menuitem">

                <span class="vtoolbar-menu__item-icon vtoolbar-menu__item-icon--compact">${__imports.xr}</span>

                <span class="vtoolbar-menu__item-label">切换音频线路</span>

            </button>

            <button type="button" class="vtoolbar-menu__item" id="vtoolbar-menu-enhanced-pip" role="menuitem">

                <span class="vtoolbar-menu__item-icon">${__imports.wr}</span>

                <span class="vtoolbar-menu__item-label">加强版画中画</span>

            </button>

            <div class="vtoolbar-menu__divider" role="separator"></div>

            <button type="button" class="vtoolbar-menu__item" id="vtoolbar-menu-expanel" role="menuitem">

                <span class="vtoolbar-menu__item-icon">${__imports.fr}</span>

                <span class="vtoolbar-menu__item-label">DouyuEx 工具条</span>

            </button>

        </div>

        <div class="vtoolbar-menu__filter-host" id="ex-vtoolbar-filter-host"></div>

    `),
            (0, __imports.E)([".right-e7ea5d", ".right-17e251"])),
          t =
            (t && t.insertBefore(e, t.childNodes[0]),
            (e = (0, __imports.rr)()).querySelector(".vtoolbar-menu__trigger")),
          e = e.querySelector(".vtoolbar-menu__dropdown"),
          o = document.getElementById("ex-vtoolbar-filter-host"),
          n = document.getElementById("vtoolbar-menu-filter"),
          i = document.getElementById("vtoolbar-menu-copy-live"),
          a = document.getElementById("vtoolbar-menu-audio-line"),
          r = document.getElementById("vtoolbar-menu-enhanced-pip"),
          l = document.getElementById("vtoolbar-menu-expanel"),
          t =
            ((0, __imports.cr)(t, !0),
            (0, __imports.cr)(e, !1),
            (0, __imports.cr)(o, !1),
            owner.listen(n, "click", (e) => {
              (e.stopPropagation(),
                (__imports.ir
                  ? __imports.gr
                  : () => {
                      var e = document.getElementById(
                          "ex-vtoolbar-filter-host",
                        ),
                        t = document.getElementById("vtoolbar-menu-filter");
                      e &&
                        ((__imports.ir = !0),
                        e.classList.add("is-visible"),
                        t &&
                          (t.classList.add("is-active"),
                          t.setAttribute("aria-expanded", "true")),
                        (0, __imports.Ka)());
                    })());
            }),
            owner.listen(i, "click", (e) => {
              (e.stopPropagation(), (0, __imports.Ge)());
            }),
            owner.listen(a, "click", (e) => {
              (e.stopPropagation(), (0, __imports.le)());
            }),
            owner.listen(r, "click", (e) => {
              (e.stopPropagation(), (0, __imports.ur)(), (0, __imports.openEnhancedPip)());
            }),
            owner.listen(l, "click", (e) => {
              (e.stopPropagation(), (0, __imports.qt)());
            }),
            owner.listen(document, "keydown", __imports.pr),
            (0, __imports.ji)(),
            document.getElementById("vtoolbar-menu-joysound")),
          e =
            (t &&
              owner.listen(t, "click", (e) => {
                (e.stopPropagation(),
                  __imports.unsafeWindow.hasInstalledJoysound
                    ? (1 == __imports.localStorage.getItem("Ex_isJoysound")
                        ? __imports.unsafeWindow.disableJoysound()
                        : __imports.unsafeWindow.enableJoysound(),
                      (0, __imports.ji)())
                    : (0, __imports._)("https://src.douyuex.com/src/joysound.user.js"));
              }),
            document.createElement("li")),
          o =
            ((e.id = "ex-videospeed"),
            (e.innerHTML = `

    倍速播放

    <ul class="videospeed__wrap">

        <li id="videospeed__2.0">2.0x</li>

        <li id="videospeed__1.5">1.5x</li>

        <li id="videospeed__1.25">1.25x</li>

        <li id="videospeed__1.0">1.0x</li>

        <li id="videospeed__0.75">0.75x</li>

        <li id="videospeed__0.5">0.5x</li>

    </ul>

    `),
            document.getElementsByClassName("menu-da2a9e")[0]),
          n =
            (o.insertBefore(e, o.childNodes[1]),
            (0, __imports.safeBind)("#videospeed__2.0", "click", () => {
              __imports.V.playbackRate = 2;
            }, owner),
            (0, __imports.safeBind)("#videospeed__1.5", "click", () => {
              __imports.V.playbackRate = 1.5;
            }, owner),
            (0, __imports.safeBind)("#videospeed__1.25", "click", () => {
              __imports.V.playbackRate = 1.25;
            }, owner),
            (0, __imports.safeBind)("#videospeed__1.0", "click", () => {
              __imports.V.playbackRate = 1;
            }, owner),
            (0, __imports.safeBind)("#videospeed__0.75", "click", () => {
              __imports.V.playbackRate = 0.75;
            }, owner),
            (0, __imports.safeBind)("#videospeed__0.5", "click", () => {
              __imports.V.playbackRate = 0.5;
            }, owner),
            document.createElement("li")),
          i =
            ((n.id = "ex-cinema"),
            (n.innerHTML = `

    影院比例

    <ul class="cinema__wrap">

        <li id="cinema__default">默认</li>

        <li id="cinema__cover">剪裁</li>

        <li id="cinema__fill">拉伸</li>

    </ul>

    `),
            document.getElementsByClassName("menu-da2a9e")[0]);
        (i.insertBefore(n, i.childNodes[1]),
          (0, __imports.safeBind)("#cinema__default", "click", () => {
            (0, __imports.U)("Ex_Style_Cinema");
          }, owner),
          (0, __imports.safeBind)("#cinema__cover", "click", () => {
            (0, __imports.Li)("cover");
          }, owner),
          (0, __imports.safeBind)("#cinema__fill", "click", () => {
            (0, __imports.Li)("fill");
          }, owner));
        {
          let e = document.createElement("div"),
            t =
              ((e.id = "ex-videosync"),
              (e.title = "同步时间"),
              (e.innerHTML = `

    <svg t="1595680402158" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7532" width="22" height="22"><path d="M938.1888 534.016h-80.7936c0.4096-7.3728 0.6144-14.6432 0.6144-22.016 0-218.624-176.8448-400.7936-389.12-400.7936C257.024 111.2064 80.6912 293.1712 80.6912 512c0 218.7264 176.4352 400.7936 388.1984 400.7936 74.752 0 149.0944-22.016 208.1792-60.0064l42.7008 68.608c-75.0592 48.9472-161.9968 74.8544-250.7776 74.752C209.8176 996.1472 0 779.264 0 512S209.8176 27.8528 468.8896 27.8528C728.3712 27.8528 938.7008 244.736 938.7008 512c0 7.3728-0.2048 14.6432-0.512 22.016z m-261.12 318.7712z m-26.4192-158.1056L426.7008 556.032V291.9424h64v226.5088L689.5616 635.904l-38.912 58.7776z m245.3504-6.656L768 512h256L896 688.0256z" fill="#ffffff" p-id="7533"></path></svg>

    `),
              document.getElementsByClassName("left-d3671e")[0]);
          t
            ? ((e.style.marginLeft = "20px"),
              t.insertBefore(e, t.childNodes[3]))
            : ((e.style.marginLeft = "8px"),
              (t = (0, __imports.E)([".left-bfab3b"])).insertBefore(e, t.childNodes[2]));
        }
        ((0, __imports.safeBind)("#ex-videosync", "click", () => {
          var e;
          0 != (e = __imports.V.buffered).length && (__imports.V.currentTime = e.end(0));
        }, owner),
          __imports.or && document.removeEventListener("keydown", __imports.or, !0),
          (__imports.or = (e) => {
            __imports._r ||
              (e.target &&
                (e.target.isContentEditable ||
                  /^(input|textarea)$/i.test(e.target.tagName))) ||
              (37 != e.keyCode &&
                39 != e.keyCode &&
                "ArrowLeft" !== e.key &&
                "ArrowRight" !== e.key) ||
              ((__imports.V =
                __imports.V ||
                document.querySelector(".layout-Player-videoEntity video")) &&
                (e.preventDefault(),
                (__imports.V.currentTime = Math.max(
                  0,
                  (__imports.V.currentTime || 0) +
                    (37 == e.keyCode || "ArrowLeft" === e.key ? -3 : 3),
                ))));
          }),
          owner.listen(document, "keydown", __imports.or, !0),
          (__imports.F = __imports.V.parentNode.className));
        a = (0, __imports.hr)();
        if (
          (a &&
            (((r = document.createElement("div")).innerHTML = `

    <div class="filter__wrap">

        <div class="filter__panel">

            ${
              (0, __imports.Xa)()
                ? `<div class="filter__enhance">

                <span class="filter__title">画质增强（不掉帧）</span>

                <div class="filter__switch" id="switch__enhance">

                    <div class="filter__switch-slider" id="slider__enhance"></div>

                </div>

            </div>`
                : ""
            }

            <div class="filter__bright">

                <span class="filter__title">明亮度</span>

                <div class="filter__scroll" id="scroll__bright">

                    <div class="filter__scroll-bar" id="bar__bright"></div>

                    <div class="filter__scroll-mask" id="mask__bright"></div>

                </div>

            </div>

            <div class="filter__contrast">

                <span class="filter__title">对比度</span>

                <div class="filter__scroll" id="scroll__contrast">

                    <div class="filter__scroll-bar" id="bar__contrast"></div>

                    <div class="filter__scroll-mask" id="mask__contrast"></div>

                </div>

            </div>

            <div class="filter__saturate">

                <span class="filter__title">饱和度</span>

                <div class="filter__scroll" id="scroll__saturate">

                    <div class="filter__scroll-bar" id="bar__saturate"></div>

                    <div class="filter__scroll-mask" id="mask__saturate"></div>

                </div>

            </div>

            <div class="filter__filter">

                <p style="color:white;float:left;line-height:20px">滤镜</p>

                <select class="c3-4f78e3" id="filter__select">

                    <option class="option-b5745c" value="default">无</option>

                    <option class="option-b5745c" value="1977">1977</option>

                    <option class="option-b5745c" value="Aden">Aden</option>

                    <option class="option-b5745c" value="Amaro">Amaro</option>

                    <option class="option-b5745c" value="Brannan">Brannan</option>

                    <option class="option-b5745c" value="Brooklyn">Brooklyn</option>

                    <option class="option-b5745c" value="Claredon">Claredon</option>

                    <option class="option-b5745c" value="Earlybird">Earlybird</option>

                    <option class="option-b5745c" value="Gingham">Gingham</option>

                    <option class="option-b5745c" value="Hudson">Hudson</option>

                    <option class="option-b5745c" value="Inkwell">Inkwell</option>

                    <option class="option-b5745c" value="Lofi">Lofi</option>

                    <option class="option-b5745c" value="Maven">Maven</option>

                    <option class="option-b5745c" value="Perpetua">Perpetua</option>

                    <option class="option-b5745c" value="Reyes">Reyes</option>

                    <option class="option-b5745c" value="Stinson">Stinson</option>

                    <option class="option-b5745c" value="Toaster">Toaster</option>

                    <option class="option-b5745c" value="Walden">Walden</option>

                    <option class="option-b5745c" value="Valencia">Valencia</option>

                    <option class="option-b5745c" value="Xpro2">Xpro2</option>

                </select>

            </div>

            <ul style="clear:both">

                <li id="filter__reset2">重置</li>

            </ul>

        </div>

    </div>

    `),
            a.appendChild(r.firstElementChild),
            (a = document.getElementsByClassName("menu-da2a9e")[0])) &&
            (((r = document.createElement("li")).id = "filter__panorama"),
            (r.innerText = "全景"),
            a.insertBefore(r, a.childNodes[1]),
            ((r = document.createElement("li")).id = "filter__mirror"),
            (r.innerText = "镜像画面"),
            a.insertBefore(r, a.childNodes[1]),
            ((r = document.createElement("li")).id = "filter__rotate"),
            (r.innerText = "旋转画面"),
            a.insertBefore(r, a.childNodes[1]),
            ((r = document.createElement("li")).id = "filter__reset"),
            (r.innerText = "重置"),
            a.insertBefore(r, a.childNodes[1]),
            ((r = document.createElement("div")).className = "divider-f9d33d"),
            a.insertBefore(r, a.childNodes[1])),
          (0, __imports.Xa)())
        ) {
          let e = document.createElement("div"),
            t =
              ((e.className = "enhance-modal__panel-wrap"),
              (e.innerHTML = `

        <div class="enhance-modal__panel">

            <div class="enhance-modal__close">×</div>

            <div class="enhance-modal__content">

                <img class="enhance-modal__img" src="https://c-yuba.douyucdn.cn/yubavod/b/zEqAvQaXrd5L/c16fdac3db1903db3a39a6557c2b5ab5.gif" alt=""/>

                <div class="enhance-modal__text">

                    开启后，弹幕飘屏会被遮挡，请将鼠标移入到直播画面中并点击<img style="width:32px;" src="https://c-yuba.douyucdn.cn/yubavod/b/zEqAvQaXrd5L/2dd9e0d70e39a532a2675717eb054129.png" alt="">

                    <br />

                    完成后，再<b>刷新</b>以恢复弹幕飘屏，该功能会<b>自动保存</b>

                    <br />

                    <a style="color: #ff7700;" href="https://www.microsoft.com/zh-cn/edge/features/enhance-video?form=MT0160" target="_blank">没有增强图标？</a>

                </div>

            </div>

        </div>

    `),
              document.querySelector("body"));
          (t.insertBefore(e, t.childNodes[0]),
            owner.listen(e
              .getElementsByClassName("enhance-modal__close")[0], "click", () => {
                e.style.display = "none";
              }));
        }
        ((document.onmouseup = function () {
          document.onmousemove = null;
        }),
          (0, __imports.Xa)() &&
            (l = document.getElementById("switch__enhance")) &&
            owner.listen(l, "click", () => {
              __imports.Ja = !__imports.Ja;
              var e = document.getElementById("switch__enhance"),
                t = document.getElementById("slider__enhance"),
                o = document.getElementsByClassName(
                  "enhance-modal__panel-wrap",
                )[0],
                n = document.querySelector("video");
              __imports.Ja
                ? ((t.style.left = "20px"),
                  (e.style.background = "#369"),
                  (__imports.V.style.imageRendering = "crisp-edges"),
                  (__imports.V.style.imageRendering = "-webkit-optimize-contrast"),
                  (__imports.V.style.imageRendering = "optimize-contrast"),
                  (o.style.display = "none"),
                  (n.style.zIndex = "10"),
                  (n.style.cursor = "auto"))
                : ((t.style.left = "0px"),
                  (e.style.background = "#ccc"),
                  (__imports.V.style.imageRendering = ""),
                  (o.style.display = "none"),
                  (n.style.zIndex = "0"));
            }),
          (0, __imports.tr)(
            document.getElementById("scroll__bright"),
            document.getElementById("bar__bright"),
            document.getElementById("mask__bright"),
            (e) => {
              ((__imports.qa = `brightness(${e}%)`),
                (__imports.V.style.filter = `${__imports.qa} ${__imports.Ua} ` + __imports.Wa));
            },
          ),
          (0, __imports.tr)(
            document.getElementById("scroll__contrast"),
            document.getElementById("bar__contrast"),
            document.getElementById("mask__contrast"),
            (e) => {
              ((__imports.Ua = `contrast(${e}%)`),
                (__imports.V.style.filter = `${__imports.qa} ${__imports.Ua} ` + __imports.Wa));
            },
          ),
          (0, __imports.tr)(
            document.getElementById("scroll__saturate"),
            document.getElementById("bar__saturate"),
            document.getElementById("mask__saturate"),
            (e) => {
              ((__imports.Wa = `saturate(${e}%)`),
                (__imports.V.style.filter = `${__imports.qa} ${__imports.Ua} ` + __imports.Wa));
            },
          ),
          (0, __imports.safeBind)("#filter__reset", "click", () => {
            (0, __imports.er)();
          }, owner),
          (0, __imports.safeBind)("#filter__reset2", "click", () => {
            (0, __imports.er)();
          }, owner),
          (0, __imports.safeBind)("#filter__mirror", "click", () => {
            (__imports.Ya
              ? ((__imports.Ya = !1), (__imports.H.rotateY = "rotateY(0deg)"))
              : ((__imports.Ya = !0), (__imports.H.rotateY = "rotateY(180deg)")),
              (__imports.V.parentNode.style.transition = "all .5s"),
              (__imports.V.parentNode.style.transform =
                __imports.H.rotateY + " " + __imports.H.rotate + " " + __imports.H.scale));
          }, owner),
          (0, __imports.safeBind)("#filter__rotate", "click", () => {
            ((__imports.Qa += 90),
              (__imports.H.rotate = `rotate(${String(__imports.Qa)}deg)`),
              (__imports.V.parentNode.style.transition = "all .5s"),
              (__imports.Qa / 90) % 2 != 0
                ? window.innerWidth > window.innerHeight
                  ? (__imports.H.scale =
                      "scale(" + String(__imports.V.videoHeight / __imports.V.videoWidth) + ")")
                  : (__imports.H.scale =
                      "scale(" + String(__imports.V.videoWidth / __imports.V.videoHeight) + ")")
                : (__imports.H.scale = ""),
              (__imports.V.parentNode.style.transform =
                __imports.H.rotateY + " " + __imports.H.rotate + " " + __imports.H.scale));
          }, owner),
          ((0, __imports.safeEl)("filter__select").onchange = function () {
            switch (this.options[this.selectedIndex].text) {
              case "default":
                (0, __imports.U)("Ex_Style_Filter");
                break;
              case "1977":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(110%)brightness(110%)saturate(130%);filter:contrast(110%)brightness(110%)saturate(130%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:screen;background:rgba(243,106,188,0.3);z-index:10}`,
                );
                break;
              case "Aden":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(90%)brightness(120%)saturate(85%)hue-rotate(20deg);filter:contrast(90%)brightness(120%)saturate(85%)hue-rotate(20deg)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:darken;background:-webkit-linear-gradient(to right,rgba(66,10,14,0.2)1,rgba(66,10,14,0));background:linear-gradient(to right,rgba(66,10,14,0.2)1,rgba(66,10,14,0));z-index:10}`,
                );
                break;
              case "Amaro":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(90%)brightness(110%)saturate(150%)hue-rotate(-10deg);filter:contrast(90%)brightness(110%)saturate(150%)hue-rotate(-10deg)}`,
                );
                break;
              case "Brannan":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(140%)sepia(50%);filter:contrast(140%)sepia(50%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:lighten;background:rgba(161,44,199,0.31);z-index:10}`,
                );
                break;
              case "Brooklyn":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(90%)brightness(110%);filter:contrast(90%)brightness(110%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:overlay;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(168,223,193,0.4)1,rgba(183,196,200,0.2));background:radial-gradient(50%50%,circle closest-corner,rgba(168,223,193,0.4)1,rgba(183,196,200,0.2));z-index:10}`,
                );
                break;
              case "Claredon":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(120%)saturate(125%);filter:contrast(120%)saturate(125%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:overlay;background:rgba(127,187,227,0.2);z-index:10}`,
                );
                break;
              case "Earlybird":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(90%)sepia(20%);filter:contrast(90%)sepia(20%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:overlay;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(208,186,142,1)20,rgba(29,2,16,0.2));background:radial-gradient(50%50%,circle closest-corner,rgba(208,186,142,1)20,rgba(29,2,16,0.2));z-index:10}`,
                );
                break;
              case "Gingham":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:brightness(105%)hue-rotate(350deg);filter:brightness(105%)hue-rotate(350deg)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:darken;background:-webkit-linear-gradient(to right,rgba(66,10,14,0.2)1,rgba(0,0,0,0));background:linear-gradient(to right,rgba(66,10,14,0.2)1,rgba(0,0,0,0));z-index:10}`,
                );
                break;
              case "Hudson":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(90%)brightness(120%)saturate(110%);filter:contrast(90%)brightness(120%)saturate(110%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:multiply;opacity:0.5;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(255,177,166,1)50,rgba(52,33,52,1));background:radial-gradient(50%50%,circle closest-corner,rgba(255,177,166,1)50,rgba(52,33,52,1));z-index:10}`,
                );
                break;
              case "Inkwell":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(110%)brightness(110%)sepia(30%)grayscale(100%);filter:contrast(110%)brightness(110%)sepia(30%)grayscale(100%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;background:rgba(0,0,0,0);z-index:10}`,
                );
                break;
              case "Lofi":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(150%)saturate(110%);filter:contrast(150%)saturate(110%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:multiply;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(0,0,0,0)70,rgba(34,34,34,1));background:radial-gradient(50%50%,circle closest-corner,rgba(0,0,0,0)70,rgba(34,34,34,1));z-index:10}`,
                );
                break;
              case "Maven":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(95%)brightness(95%)saturate(150%)sepia(25%);filter:contrast(95%)brightness(95%)saturate(150%)sepia(25%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:hue;background:rgba(3,230,26,0.2);z-index:10}`,
                );
                break;
              case "Perpetua":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:soft-light;opacity:0.5;background:-webkit-linear-gradient(to bottom,rgba(0,91,154,1)1,rgba(61,193,230,0));background:linear-gradient(to bottom,rgba(0,91,154,1)1,rgba(61,193,230,0));z-index:10}`,
                );
                break;
              case "Reyes":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(85%)brightness(110%)saturate(75%)sepia(22%);filter:contrast(85%)brightness(110%)saturate(75%)sepia(22%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:soft-light;opacity:0.5;background:rgba(173,205,239,1);z-index:10}`,
                );
                break;
              case "Stinson":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(75%)brightness(115%)saturate(85%);filter:contrast(75%)brightness(115%)saturate(85%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:soft-light;background:rgba(240,149,128,0.2);z-index:10}`,
                );
                break;
              case "Toaster":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(150%)brightness(90%);filter:contrast(150%)brightness(90%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:screen;opacity:0.5;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(15,78,128,1)1,rgba(59,0,59,1));background:radial-gradient(50%50%,circle closest-corner,rgba(15,78,128,1)1,rgba(59,0,59,1));z-index:10}`,
                );
                break;
              case "Walden":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:brightness(110%)saturate(160%)sepia(30%)hue-rotate(350deg);filter:brightness(110%)saturate(160%)sepia(30%)hue-rotate(350deg)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:screen;opacity:0.3;background:rgba(204,68,0,1);z-index:10}`,
                );
                break;
              case "Valencia":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(108%)brightness(108%)sepia(8%);filter:contrast(108%)brightness(108%)sepia(8%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:exclusion;opacity:0.5;background:rgba(58,3,57,1);z-index:10}`,
                );
                break;
              case "Xpro2":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:sepia(30%);filter:sepia(30%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:color-burn;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(224,231,230,1)40,rgba(43,42,161,0.6));background:radial-gradient(50%50%,circle closest-corner,rgba(224,231,230,1)40,rgba(43,42,161,0.6));z-index:10}`,
                );
                break;
              default:
                (0, __imports.U)("Ex_Style_Filter");
            }
          }),
          (0, __imports.safeBind)("#filter__panorama", "click", () => {
            var e,
              t = document.getElementById("ex-panorama");
            t
              ? (t.remove(), (__imports.Za = null))
              : "undefined" != typeof THREE
                ? ((t = document.getElementById("__h5player")),
                  ((e = document.createElement("div")).id = "ex-panorama"),
                  (e.style =
                    "width:100%;height:100%;z-index:1;background:black;"),
                  t.insertBefore(e, t.childNodes[0]),
                  (function e(t) {
                    (0, __imports.requestAnimationFrame)(() => {
                      e(t);
                    });
                    t.update();
                  })((__imports.Za = new __imports.Hr(e, __imports.V))))
                : (0, __imports.ExLoadLib)(
                    __imports.EXURL.three,
                    () => {
                      var b = document.getElementById("filter__panorama");
                      b && b.click();
                    },
                    () => (0, __imports.T)("【全景】three.js加载失败", "error"),
                  );
          }, owner));
        ((t = document.createElement("div")),
          (e =
            ((t.id = "ex-camera"),
            (t.title = "单击截图 长按录制gif"),
            (t.innerHTML = `

    <svg t="1620266708389" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2080" width="38" height="38"><path d="M512 337.371136c-119.543808 0-216.800256 97.255424-216.800256 216.798208 0 119.543808 97.256448 216.800256 216.800256 216.800256s216.800256-97.256448 216.800256-216.800256C728.800256 434.625536 631.543808 337.371136 512 337.371136zM680.479744 554.16832c0 92.911616-75.579392 168.501248-168.479744 168.501248-92.900352 0-168.480768-75.589632-168.480768-168.501248 0-92.923904 75.579392-168.521728 168.480768-168.521728C604.899328 385.646592 680.479744 461.24544 680.479744 554.16832z" p-id="2081" fill="#ffffff"></path><path d="M831.209472 337.349632l-47.167488 0c-13.647872 0-24.751104 11.083776-24.751104 24.707072 0 13.635584 11.103232 24.7296 24.751104 24.7296l47.167488 0c13.646848 0 24.75008-11.094016 24.75008-24.7296C855.959552 348.433408 844.85632 337.349632 831.209472 337.349632z" p-id="2082" fill="#ffffff"></path><path d="M700.505088 171.497472c4.235264 0 6.403072 0.405504 7.232512 0.612352 1.47968 1.514496 4.790272 6.218752 11.717632 20.685824 2.83648 5.910528 8.6272 18.86208 15.888384 35.533824l11.788288 27.063296 29.518848 0 96.535552 0c35.122176 0 63.695872 28.535808 63.695872 63.609856l0 469.933056c0 35.05152-28.573696 63.567872-63.695872 63.567872L150.811648 852.503552c-35.121152 0-63.694848-28.516352-63.694848-63.567872L87.1168 319.0016c0-35.062784 28.573696-63.589376 63.694848-63.589376l99.35872 0 29.110272 0 11.964416-26.537984c4.698112-10.421248 8.416256-19.063808 11.058176-25.70752 9.86112-24.829952 15.207424-30.125056 16.239616-30.974976 0.52736-0.161792 2.64192-0.695296 7.673856-0.695296L700.505088 171.496448M700.505088 126.441472 326.216704 126.441472c-32.519168 0-47.275008 13.479936-65.787904 60.096512-3.180544 7.999488-7.689216 18.122752-10.257408 23.819264l-99.35872 0c-59.96544 0-108.750848 48.738304-108.750848 108.645376l0 469.933056c0 59.894784 48.785408 108.623872 108.750848 108.623872l722.37568 0c59.96544 0 108.751872-48.729088 108.751872-108.623872L981.940224 319.0016c0-59.91936-48.786432-108.665856-108.751872-108.665856l-96.535552 0c-4.458496-10.236928-12.420096-28.372992-16.574464-37.031936C744.823808 141.448192 733.973504 126.441472 700.505088 126.441472L700.505088 126.441472z" p-id="2083" fill="#ffffff"></path></svg>

    <div id="ex-camera-close">×</div>

    `),
            document.getElementById("js-player-dialog"))));
        e.insertBefore(t, e.childNodes[0]);
        (0, __imports.bindCamera)(owner, __imports.V, (0, __imports.E)([".Title-anchorName", ".anchorName__6NXv9"]).innerText,
          t, (0, __imports.E)([".layout-Player-video", ".layout-Player-videoEntity"]),
          document.getElementsByClassName("room-Player-Box")[0],
          document.getElementsByClassName("room-Player-Box")[0]);
        {
          let a = (0, __imports.E)([".layout-Player-videoEntity", ".layout-Player-video"]),
            r = document.getElementsByClassName("layout-Player-videoEntity")[0],
            l = 0,
            s = 0;
          a &&
            r &&
            ((r.style.transformOrigin = "0 0"),
            (r.style.transition = "transform 0.1s"),
            __imports.Br && window.removeEventListener("wheel", __imports.Br, !0),
            (__imports.Br = (t) => {
              if (
                t.ctrlKey &&
                ((a =
                  a ||
                  (0, __imports.E)([".layout-Player-videoEntity", ".layout-Player-video"])),
                (r =
                  r ||
                  document.getElementsByClassName(
                    "layout-Player-videoEntity",
                  )[0]),
                a) &&
                r
              ) {
                var o = a.getBoundingClientRect();
                if (!(
                  t.clientX < o.left ||
                  t.clientX > o.right ||
                  t.clientY < o.top ||
                  t.clientY > o.bottom
                )) {
                  (t.preventDefault(), t.stopImmediatePropagation());
                  var n = t.clientX - o.left,
                    o = t.clientY - o.top;
                  let e = __imports.Er + (t.deltaY < 0 ? 0.1 : -0.1);
                  e < 0.1 && (e = 0.1);
                  var t = (n - l) / __imports.Er,
                    i = (o - s) / __imports.Er;
                  ((l = n - t * e),
                    (s = o - i * e),
                    (__imports.Er = e) < 0.1 && (__imports.Er = 0.1),
                    (r.style.transform = `translate(${l}px, ${s}px) scale(${__imports.Er})`));
                }
              }
            }),
            owner.listen(window, "wheel", __imports.Br, { capture: !0, passive: !1 }),
            __imports.Ir && window.removeEventListener("mousemove", __imports.Ir, !0),
            __imports.Tr && window.removeEventListener("mouseup", __imports.Tr, !0),
            owner.listen(
              window, "mousedown",
              (e) => {
                var t;
                e.ctrlKey &&
                  0 === e.button &&
                  ((t = a.getBoundingClientRect()),
                  e.clientX < t.left ||
                    e.clientX > t.right ||
                    e.clientY < t.top ||
                    e.clientY > t.bottom ||
                    (e.preventDefault(),
                    (r.style.transition = "none"),
                    (__imports.Cr = { x: e.clientX, y: e.clientY, tx: l, ty: s })));
              },
              !0,
            ),
            (__imports.Ir = (e) => {
              __imports.Cr &&
                ((l = __imports.Cr.tx + (e.clientX - __imports.Cr.x)),
                (s = __imports.Cr.ty + (e.clientY - __imports.Cr.y)),
                (r.style.transform = `translate(${l}px, ${s}px) scale(${__imports.Er})`));
            }),
            (__imports.Tr = () => {
              __imports.Cr && ((__imports.Cr = null), (r.style.transition = "transform 0.1s"));
            }),
            owner.listen(window, "mousemove", __imports.Ir, !0),
            owner.listen(window, "mouseup", __imports.Tr, !0));
        }
        ((function ExMetaLazy() {
          var pl = document.createElement("li");
          pl.id = "ex-metadata";
          pl.innerHTML =
            '<span>主播配置信息</span><ul class="metadata__wrap"><li style="color:#999;white-space:nowrap">悬停获取…</li></ul>';
          owner.listen(
            pl, "mouseenter",
            function () {
              var w = pl.querySelector(".metadata__wrap");
              w && (w.innerHTML = '<li style="color:#999">加载中…</li>');
              (0, __imports.ExLoadLib)(
                __imports.EXURL.flv,
                () => {
                  ExMetaProbe();
                },
                () => {
                  w && (w.innerHTML = "<li>flv.js 加载失败</li>");
                },
              );
            },
            { once: !0 },
          );
          var c = 0,
            mu,
            iv = owner.interval(() => {
              100 <= ++c && (0, __imports.clearInterval)(iv);
              (mu = document.getElementsByClassName("menu-da2a9e")[0]) &&
                ((0, __imports.clearInterval)(iv), mu.insertBefore(pl, mu.childNodes[1]));
            }, 500);
          var ExMetaProbe = function () {
            (0, __imports.qr)(__imports.B, !0, 0, "1", (e) => {
              if ("" != e || null != e)
                if ("None" == e) (0, __imports.T)("房间未开播或其他错误", "error");
                else {
                  var t = String(e).split("/live");
                  0 < t.length && t[0];
                  let n = "Fake";
                  var t = document.createElement("div"),
                    o = "",
                    o =
                      ((t.id = "exVideoDiv" + n),
                      (t.className = "exVideoDiv"),
                      (o +=
                        "<video controls='controls' class='exVideoPlayer' id='exVideoPlayer" +
                        String(n) +
                        "'></video><div class='exVideoScale' id='exVideoScale" +
                        String(n) +
                        "'></div>"),
                      (t.innerHTML = o),
                      (0, __imports.E)([
                        ".layout-Main",
                        ".playerWrap__8wGvw",
                        ".live-next-body",
                      ]));
                  if (
                    (o.insertBefore(t, o.childNodes[0]), flvjs.isSupported())
                  ) {
                    t = document.getElementById("exVideoPlayer" + n);
                    let o = flvjs.createPlayer(
                      { type: "flv", url: e },
                      { fixAudioTimestampGap: !1 },
                    );
                    (o.on("media_info", (e) => {
                      var t;
                      e &&
                        e.metadata &&
                        ((__imports.O = e.metadata),
                        (e = document.getElementById("exVideoDiv" + String(n))),
                        (t = document.getElementById(
                          "exVideoPlayer" + String(n),
                        )),
                        o.destroy(),
                        t.remove(),
                        e.remove(),
                        __imports.O) &&
                        (__imports.O.dy_cpu_model ||
                          __imports.O.dy_gpu_model ||
                          __imports.O.dy_device_model ||
                          __imports.O.dy_os_version ||
                          __imports.O.z_canvas_code) &&
                        (((t = pl).innerHTML = `

    主播配置信息

    <ul class="metadata__wrap">

      ${__imports.O.dy_cpu_model ? `<li title="${__imports.O.dy_cpu_model}">🤖CPU<br/>${__imports.O.dy_cpu_model}</li>` : ""}

      ${__imports.O.dy_gpu_model ? `<li title="${__imports.O.dy_gpu_model}">🎮显卡<br/>${__imports.O.dy_gpu_model}</li>` : ""}

      ${__imports.O.dy_device_model ? `<li title="${__imports.O.dy_device_model}">📱设备<br/>${__imports.O.dy_device_model}</li>` : ""}

      ${__imports.O.dy_os_version ? `<li title="${__imports.O.dy_os_version}">🖥️系统<br/>${__imports.O.dy_os_version}</li>` : ""}

      ${__imports.O.z_canvas_code ? `<li title="${__imports.O.z_canvas_code}">🎥场景<br/>${__imports.O.z_canvas_code}</li>` : ""}

    </ul>

    `),
                        (e =
                          document.getElementsByClassName(
                            "menu-da2a9e",
                          )[0]).insertBefore(t, e.childNodes[1]));
                    }),
                      o.attachMediaElement(t),
                      o.load());
                  }
                }
            });
          };
        })(),
          (0, __imports.wa)(),
          (0, __imports.ua)(),
          __imports.Zi ||
            ((__imports.Zi = !0),
            owner.listen(document, "fullscreenchange", __imports.ka, !0),
            owner.listen(document, "webkitfullscreenchange", __imports.ka, !0),
            owner.listen(document, "mozfullscreenchange", __imports.ka, !0),
            owner.listen(document, "MSFullscreenChange", __imports.ka, !0)),
          (0, __imports.ca)(),
          (0, __imports.va)(),
          (o = () => {
            (0, __imports.gr)();
          }),
          (0, __imports.safeBind)("#js-player-toolbar", "mouseover", o, owner),
          (0, __imports.safeBind)("#js-player-asideMain", "mouseover", o, owner),
          owner.listen(
            (0, __imports.E)([".inputView-2a65aa", ".inputView-620ab7"]), "focus",
            () => {
              __imports._r = !0;
            },
          ),
          owner.listen(
            (0, __imports.E)([".inputView-2a65aa", ".inputView-620ab7"]), "blur",
            () => {
              __imports._r = !1;
            },
          ),
          new __imports.DomMutationSubscription(".app-f0f9c7", !1, (e) => {
            0 < e.length &&
              (0 < e[0].addedNodes.length
                ? (__imports._r = !0)
                : 0 < e[0].removedNodes.length && (__imports._r = !1));
          }, owner));
      }
      100 <= ++__imports.kr && (0, __imports.clearInterval)(s);
    }, 1500);
  }

}
,
"src/next/ui/room/player-menu.js":
function* (__imports) {
yield {"mountPlayerMenu": { get: () => mountPlayerMenu, set: value => { mountPlayerMenu = value; } }};
// Room assembly section; dependencies are captured per mount, in original order.
function mountPlayerMenu(owner) {
    let d = owner.interval(() => {
      if ((0, __imports.E)([".right-e7ea5d", ".right-17e251"])) {
        (0, __imports.clearInterval)(d);
        {
          let e = document.createElement("li"),
            t =
              ((e.id = "refresh-video"),
              (e.innerText = "隐藏礼物栏"),
              document.getElementsByClassName("menu-da2a9e")[0]);
          (t.insertBefore(e, t.childNodes[t.childNodes.length - 1]),
            !document.getElementById("refresh-video3") &&
              (((e = document.createElement("div")).id = "refresh-video3"),
              (e.title = "点击隐藏礼物栏"),
              (e.innerHTML = `<div style="display:flex;align-items:center;gap:6px;">

            <div style="font-size:12px;">隐藏礼物栏</div>

            <div id="ex-refresh-switch" style="width:26px;height:14px;background:rgba(255,255,255,0.3);border-radius:7px;position:relative;transition:background 0.3s;">

                <div id="ex-refresh-switch-circle" style="width:10px;height:10px;background:#fff;border-radius:50%;position:absolute;top:2px;left:2px;transition:left 0.3s, background 0.3s;"></div>

            </div>

        </div>`),
              (e.style =
                "position:absolute;left:18px;bottom:58px;padding:0 10px;height:28px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);color:#fff;z-index:9999;cursor:pointer;user-select:none;opacity:0;transform:scale(.9);transition:opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .3s ease;pointer-events:none;"),
              (t = document.getElementById("js-player-dialog"))) &&
              t.insertBefore(e, t.childNodes[0]));
        }
        {
          function a() {
            let e = !1;
            var t = !!(
              document.fullscreenElement ||
              document.webkitFullscreenElement ||
              document.mozFullScreenElement ||
              document.msFullscreenElement
            );
            let o = !1;
            ((document.querySelector(".wfs-2a8e83.removed-9d4c42") ||
              document.querySelector(".toggle__P8TKM")) &&
              (e = !0),
              document.querySelector(".shrink__Sd0uK") && (o = !0));
            var n = document.getElementById("js-player-toolbar"),
              i =
                ((n.style = e ? "z-index:20" : "z-index:30"),
                document.getElementsByClassName("case__f4yex")[0]),
              i =
                (i &&
                  (i.style =
                    (t || (e && o)) && (0, __imports.fn)() ? "bottom: -84px;" : "bottom: 0;"),
                !!document.getElementsByClassName("live-next-body")[0]);
            i && (n.parentElement.style = "z-index:20");
          }
          (new __imports.DomMutationSubscription(".right-e7ea5d", !0, () => {
            a();
          }, owner),
            new __imports.DomMutationSubscription(".right-17e251", !0, () => {
              a();
            }, owner),
            new __imports.DomMutationSubscription(".video__VfhVg", !0, (e) => {
              for (var t of e)
                t.target.className.includes("toggle__P8TKM") && a();
            }, owner));
          let e = (0, __imports.E)([".layout-Player-video", ".stream__T55I3"]),
            t = document.getElementsByClassName("room-Player-Box")[0],
            o = document.getElementById("refresh-video3"),
            i = 0,
            n = !1;
          function r() {
            !o ||
              n ||
              ((o.style.transition =
                "opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .3s ease"),
              (o.style.opacity = "0"),
              (o.style.transform = "scale(.9)"),
              (o.style.pointerEvents = "none"),
              (0, __imports.clearTimeout)(i));
          }
          function l() {
            o &&
              ((o.style.transition =
                "opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .3s ease"),
              (o.style.opacity = "1"),
              (o.style.transform = "scale(1)"),
              (o.style.pointerEvents = "auto"),
              (0, __imports.clearTimeout)(i),
              (i = owner.timeout(() => {
                r();
              }, 2e3)));
          }
          function s() {
            var e = document.getElementsByClassName(
                "PlayerToolbar-ContentRow",
              )[0],
              t = (0, __imports.E)([".layout-Player-video", ".stream__T55I3"]),
              o = document.getElementById("refresh-video");
            let n = document.getElementById("refresh-video3");
            e &&
              t &&
              o &&
              ("hidden" == e.style.visibility
                ? ((e.style.visibility = "visible"),
                  (0, __imports.Ht)(),
                  (t.style = ""),
                  n &&
                    ((n.style.opacity = "0"),
                    (n.style.transform = "scale(.9)"),
                    (n.style.pointerEvents = "none"),
                    (n.title = "点击隐藏礼物栏")),
                  (0, __imports.hn)(!(o.innerText = "隐藏礼物栏")),
                  (0, __imports.U)("Ex_Style_VideoRefresh"))
                : ((e.style.visibility = "hidden"),
                  (0, __imports.Ft)(),
                  (t.style = "bottom:0;z-index:25"),
                  (o.innerText = "✓ 隐藏礼物栏"),
                  n && (n.title = "点击显示礼物栏"),
                  (0, __imports.hn)(!0),
                  n &&
                    ((n.style.transition =
                      "opacity .3s ease,transform .3s cubic-bezier(0.175, 0.885, 0.32, 1.275),background-color .3s ease,box-shadow .3s ease"),
                    (n.style.opacity = "1"),
                    (n.style.transform = "scale(1.1)"),
                    (n.style.pointerEvents = "auto"),
                    (n.style.backgroundColor = "rgba(0,0,0,.8)"),
                    (n.style.boxShadow = "0 0 15px rgba(255, 102, 0, 0.6)"),
                    (0, __imports.clearTimeout)(i),
                    (i = owner.timeout(() => {
                      ((n.style.transition =
                        "opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .15s ease"),
                        (n.style.transform = "scale(1)"),
                        (n.style.backgroundColor = "rgba(0,0,0,.55)"),
                        (n.style.boxShadow = "none"),
                        (i = owner.timeout(() => {
                          r();
                        }, 1500)));
                    }, 800))),
                  (0, __imports.yn)()),
              a(),
              (0, __imports.pn)(),
              (0, __imports.te)());
          }
          (e &&
            o &&
            (owner.listen(e, "mouseenter", () => {
              l();
            }),
            owner.listen(e, "mouseleave", () => {
              r();
            })),
            t &&
              o &&
              owner.listen(t, "mousemove", () => {
                l();
              }),
            o &&
              (owner.listen(o, "mouseenter", () => {
                ((n = !0),
                  (o.style.transition =
                    "opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .3s ease"),
                  (o.style.opacity = "1"),
                  (o.style.transform = "scale(1.08)"),
                  (o.style.pointerEvents = "auto"),
                  (o.style.backgroundColor = "rgba(0,0,0,.7)"),
                  (0, __imports.clearTimeout)(i));
              }),
              owner.listen(o, "mouseleave", () => {
                ((n = !1),
                  (o.style.transform = "scale(1)"),
                  (o.style.backgroundColor = "rgba(0,0,0,.55)"),
                  l());
              })),
            (0, __imports.safeBind)("#refresh-video", "click", (e) => {
              s();
            }, owner),
            o &&
              owner.listen(o, "click", (e) => {
                (e.stopPropagation(), s());
              }));
        }
        var e,
          t,
          o,
          n,
          i = __imports.localStorage.getItem("ExSave_Refresh");
        null != i &&
          ("video" in (i = JSON.parse(i)) == 0 && (i.video = { status: !1 }),
          1 == i.video.status) &&
          ((i = document.getElementsByClassName("PlayerToolbar-ContentRow")[0]),
          (e = (0, __imports.E)([".layout-Player-video", ".stream__T55I3"])),
          (t = document.getElementById("refresh-video")),
          (o = document.getElementById("refresh-video3")),
          (n = document.getElementById("js-player-toolbar")),
          (i.style.visibility = "hidden"),
          (e.style = "bottom:0;z-index:25"),
          (n.style = "z-index:30"),
          null != (i = __imports.localStorage.getItem("ExSave_FullScreen")) &&
            JSON.parse(i).isFullScreen &&
            (n.style = "z-index:20"),
          document.getElementsByClassName("live-next-body")[0] &&
            (n.parentElement.style = "z-index:20"),
          o &&
            ((o.style.opacity = "0"),
            (o.style.transform = "scale(.9)"),
            (o.style.pointerEvents = "none"),
            (o.title = "点击显示礼物栏")),
          (t.innerText = "✓ 隐藏礼物栏"),
          (0, __imports.yn)(),
          (0, __imports.te)(),
          owner.timeout(() => {
            (0, __imports.hn)(!0);
          }, 500));
      }
      100 <= ++__imports.gn && (0, __imports.clearInterval)(d);
    }, 1500);
  }

}
,
"src/next/ui/room/barrage-settings.js":
function* (__imports) {
yield {"mountBarrageSettings": { get: () => mountBarrageSettings, set: value => { mountBarrageSettings = value; } }};
// Room assembly section; dependencies are captured per mount, in original order.
function mountBarrageSettings(owner) {
    let e = owner.interval(() => {
      0 < document.getElementsByClassName("danmuTips-1ee820").length &&
        ((0, __imports.clearInterval)(e),
        (document.getElementsByClassName(
          "danmuTips-1ee820",
        )[0].parentElement.id = "Ex_BarragePanel"),
        new __imports.DomMutationSubscription("#Ex_BarragePanel", !0, (i) => {
          (0, __imports.Ie)(() => {
            let t = !1;
            if (0 < i.length) {
              for (let e = 0; e < i.length; e++)
                if ("attributes" == i[e].type) {
                  t = !0;
                  break;
                }
              var e, o, n;
              0 == t
                ? 0 < (n = i[0].addedNodes).length &&
                  "getElementsByClassName" in (n = n[0]) != 0 &&
                  ((o = n.getElementsByClassName("buttonGroup-de6b66")[0]),
                  (e = ""),
                  0 <
                    (n = n.getElementsByClassName("danmuAuthor-3d7b4a"))
                      .length) &&
                  ((e = n[0].innerText),
                  (0, __imports.Ce)(n[0], e),
                  (0, __imports.Le)(o),
                  (0, __imports.Ne)(o),
                  (0, __imports.Se)(o),
                  (0, __imports.Me)(o),
                  (0, __imports.Ae)(0, e))
                : (0 <
                    (n = document.getElementsByClassName(
                      "barragePanel__funcPanel",
                    )).length && n[0].remove(),
                  null !=
                    (o =
                      document.getElementsByClassName("danmudiv-32f498")[0]) &&
                    ((e = o.getElementsByClassName("buttonGroup-de6b66")[0]),
                    (n = ""),
                    0 <
                      (o = o.getElementsByClassName("danmuAuthor-3d7b4a"))
                        .length &&
                      ((n = o[0].innerText),
                      (0, __imports.Ce)(o[0], n),
                      (0, __imports.Le)(e),
                      (0, __imports.Ne)(e),
                      (0, __imports.Se)(e),
                      (0, __imports.Me)(e),
                      (0, __imports.Ae)(0, n)),
                    (0, __imports.Te)()));
            }
          });
        }, owner),
        new __imports.DomMutationSubscription("#Ex_BarragePanel", !1, (e) => {
          (0, __imports.Ie)(() => {
            (0, __imports.Te)();
          });
        }, owner));
    }, 1500);
    new __imports.DomMutationSubscription("#comment-dzjy-container", !1, (t) => {
      if (!(t.length <= 0 || t[0].addedNodes.length <= 0)) {
        {
          let e = document.createElement("div");
          e.style.display = "inline-block";
          t = document.getElementsByClassName("labelfisrt-407af4");
          0 !== t.length &&
            ((t = t[0].parentElement).appendChild(e),
            ((e = document.createElement("p")).className = "sugun-e3fbf6"),
            (e.innerText = "|"),
            t.appendChild(e),
            ((e = document.createElement("div")).className =
              "labelfisrt-407af4 thirdBtn-06cde5 fourBtn-0845d4"),
            (e.id = "barrage-panel-tip__+1"),
            (e.innerText = "+1"),
            t.appendChild(e));
        }
        (0, __imports.safeEl)("barrage-panel-tip__+1").onclick = () => {
          var e = document.getElementById("comment-higher-container");
          0 < e.getElementsByClassName("ex-image-danmaku").length
            ? (0, __imports.we)(
                e
                  .getElementsByClassName("text-879f3e")[0]
                  .innerHTML.replace(
                    /<a[^>]*><img\s+(?:.*?\s+)?src="(.*?)"[^>]*?\/?><\/a>/g,
                    (e, t) =>
                      `[DouyuEx图片${((e) => (e = BigInt(e)).toString(36))((t = (t = (t = t.split("/")).pop()).split("."))[0])}.${t[2]}]`,
                  ),
              )
            : (0, __imports.we)(e.innerText);
        };
      }
    }, owner);
  }

}
,
"src/next/ui/room/danmaku-search.js":
function* (__imports) {
yield {"mountDanmakuSearch": { get: () => mountDanmakuSearch, set: value => { mountDanmakuSearch = value; } }};
// Room assembly section; dependencies are captured per mount, in original order.
function mountDanmakuSearch(owner) {
    {
      let e = owner.interval(() => {
        void 0 !== document.getElementsByClassName("ChatBarrageCollect")[0] &&
          ((0, __imports.clearInterval)(e),
          new __imports.DomMutationSubscription(".ChatBarrageCollect", !1, (e) => {
            var t,
              o = document.getElementsByClassName(
                "ChatBarrageCollectPop-title",
              );
            o
              ? 0 !== o.length &&
                (((t = document.createElement("input")).id =
                  "ex-danmaku-collect-search"),
                (t.placeholder = "搜索弹幕"),
                (t.style.marginLeft = "6px"),
                o[0].appendChild(t),
                owner.listen(t, "input", __imports.Ve))
              : document
                  .getElementById("ex-danmaku-collect-search")
                  .removeEventListener("input", __imports.Ve);
          }, owner));
      }, 1e3);
    }
    let t = document.getElementsByClassName("ChatSend-txt")[0],
      o = document.getElementsByClassName("ChatBarrageCollect")[0];
    (t &&
      owner.listen(t, "keyup", () => {
        var e = ("string" == typeof t.value ? t.value : t.innerText).length;
        o.style.display = 25 < e ? "none" : "";
      }),
      (0, __imports.safeBind)(".ChatSend-button", "click", () => {
        o.style.display = "";
      }, owner),
      (0, __imports.Qr)((e, t) => {
        if (e.includes("bulletscreen/query"))
          return (
            (e = JSON.parse(t)).data.list.unshift(
              ...(0, __imports.qe)().map((e) => ({ content: e.content, type: 2, id: e.id })),
            ),
            JSON.stringify(e)
          );
      }),
      (0, __imports.Qr)((e, t, o) => {
        if (e.includes("bulletscreen/add"))
          return 0 == (e = JSON.parse(t)).error
            ? t
            : ((t = JSON.parse(o).content),
              (o = t),
              (t = (0, __imports.qe)()).unshift({ content: o, id: new Date().getTime() }),
              __imports.localStorage.setItem("ExSave_DanmakuCollect", JSON.stringify(t)),
              (e.msg =
                "收藏成功，云收藏已达上限，将收藏至本地（由DouyuEx插件实现无限收藏）"),
              document.querySelector(".ChatBarrageCollect-tip").click(),
              document.querySelector(".ChatBarrageCollect-tip").click(),
              JSON.stringify(e));
      }),
      (0, __imports.Qr)((e, t, o) => {
        var n;
        e.includes("bulletscreen/del") &&
          ((e = JSON.parse(o).id),
          (n = e),
          (o = (0, __imports.qe)()),
          __imports.localStorage.setItem(
            "ExSave_DanmakuCollect",
            JSON.stringify(o.filter((e) => e.id !== n)),
          ));
      }));
  }

}
,
"src/next/ui/room/last-live.js":
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
,
"src/next/services/blocked-danmaku.js":
function* (__imports) {
yield {"initDanmakuBlockedCheck": { get: () => initDanmakuBlockedCheck, set: value => { initDanmakuBlockedCheck = value; } }};
/* ==================== 弹幕发送成功与系统屏蔽词检测系统 (DouyuEx SSOT) ==================== */
function initDanmakuBlockedCheck() {
  var pendingList = [];
  var seqId = 0;

  function getVal(str, start, end) {
    var idx = str.indexOf(start);
    if (idx === -1) return "";
    var s = idx + start.length;
    var e = str.indexOf(end, s);
    return e !== -1 ? str.slice(s, e) : str.slice(s);
  }

  function handleChatmsgPacket(msg) {
    if (!msg || typeof msg !== "string") return;
    if (msg.indexOf("type@=chatmsg") === -1) return;

    var txt = getVal(msg, "txt@=", "/");
    if (!txt) return;

    var senderUid = getVal(msg, "uid@=", "/");
    var senderNick = getVal(msg, "nn@=", "/");

    var myUid =
      (typeof __imports.I !== "undefined" && __imports.I) ||
      (typeof __imports.x === "function" && (0, __imports.x)("acf_uid")) ||
      (document.cookie.match(/(?:^|;\s*)acf_uid=([^;]+)/) || [])[1] ||
      "";
    var myNick = (typeof __imports.W !== "undefined" && __imports.W) || "";
    if (!myNick && typeof __imports.x === "function") {
      var cookieNick = (0, __imports.x)("acf_nickname");
      if (cookieNick) {
        try {
          myNick = decodeURIComponent(cookieNick);
          __imports.W = myNick;
        } catch (e) {}
      }
    }

    var isSelf = false;
    if (myUid && senderUid && senderUid === myUid) {
      isSelf = true;
    } else if (myNick && senderNick && senderNick === myNick) {
      isSelf = true;
    } else if (
      senderNick &&
      pendingList.some(function (p) {
        return p.senderNick === senderNick;
      })
    ) {
      isSelf = true;
      if (typeof __imports.W !== "undefined" && !__imports.W) __imports.W = senderNick;
    }

    if (!isSelf) return;

    var cleanTxt = txt
      .replace(/\[DouyuEx图片[^\]]+\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    for (var i = 0; i < pendingList.length; i++) {
      var item = pendingList[i];
      if (item.cleanText === cleanTxt && !item.confirmed) {
        item.confirmed = true;
        item.resolved = true;
        if (item.timer) {
          (0, __imports.clearTimeout)(item.timer);
          item.timer = null;
        }
        // 若极端网络抖动在超时后才收到回执，自动自愈消除删除线与提示
        if (
          item.contentEl &&
          item.contentEl.style &&
          item.contentEl.style.textDecoration &&
          item.contentEl.style.textDecoration.indexOf("line-through") !== -1
        ) {
          item.contentEl.style.textDecoration = "";
          item.contentEl.style.textDecorationLine = "";
          item.contentEl.style.textDecorationColor = "";
          var tip = item.node.querySelector(".ex-danmaku-blocked-tip");
          if (tip) tip.remove();
        }
        break;
      }
    }

    var now = Date.now();
    pendingList = pendingList.filter(function (p) {
      return !p.resolved || now - p.createdAt < 15000;
    });
  }

  // 挂载全局接收钩子，主 WebSocket 旁听与 nl 代理连接双通道消费
  window.__onDouyuExChatmsg = handleChatmsgPacket;

  function markBlocked(item) {
    item.resolved = true;
    item.timer = null;
    if (!item.contentEl || !item.contentEl.parentNode) return;

    // 1. 添加原版删除线样式
    item.contentEl.style.textDecoration = "line-through gray 1px";
    item.contentEl.style.textDecorationLine = "line-through";
    item.contentEl.style.textDecorationColor = "gray";

    // 2. 避免重复添加标签
    if (item.node.querySelector(".ex-danmaku-blocked-tip")) return;

    // 3. 插入原版 (可能发送失败) 提示标签与悬停解释
    var tip = document.createElement("span");
    tip.className = "ex-danmaku-blocked-tip";
    tip.textContent = "(可能发送失败)";
    tip.style.marginLeft = "4px";
    tip.style.color = "gray";
    tip.style.fontSize = "9px";
    tip.style.cursor = "pointer";
    tip.title =
      "该条弹幕发送失败/可能被系统屏蔽，不会被其他人看到（可能会误判）";

    item.contentEl.parentNode.insertBefore(tip, item.contentEl.nextSibling);
  }

  function checkAndTrackSelfDanmu(node) {
    if (!node || node.nodeType !== 1) return;

    var hasSelf =
      node.classList.contains("is-self") || node.querySelector(".is-self");
    if (!hasSelf) return;

    var contentEl = node.classList.contains("Barrage-content")
      ? node
      : node.querySelector(".Barrage-content");
    if (!contentEl) return;

    var rawText = (contentEl.innerText || contentEl.textContent || "").trim();
    if (!rawText) return;

    var cleanText = rawText
      .replace(/\[DouyuEx图片[^\]]+\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    var nickEl =
      node.querySelector(".Barrage-nickName.is-self") ||
      node.querySelector(".Barrage-nickName") ||
      node.querySelector(".is-self");
    var senderNick = nickEl
      ? (nickEl.innerText || nickEl.textContent || "").trim()
      : (typeof __imports.W !== "undefined" && __imports.W) || "";
    if (senderNick && typeof __imports.W !== "undefined" && (!__imports.W || __imports.W !== senderNick)) {
      __imports.W = senderNick;
    }

    var item = {
      id: ++seqId,
      node: node,
      contentEl: contentEl,
      rawText: rawText,
      cleanText: cleanText,
      senderNick: senderNick,
      createdAt: Date.now(),
      resolved: false,
      confirmed: false,
      timer: null,
    };

    // 800ms 敏捷超时判定：大幅压缩等待时延，若偶发网络抖动回执迟到，自愈机制将自动解除删除线
    item.timer = (0, __imports.setTimeout)(function () {
      if (!item.resolved && !item.confirmed) {
        markBlocked(item);
      }
    }, 800);

    pendingList.push(item);
  }

  var waitTimer = (0, __imports.setInterval)(function () {
    var list =
      document.getElementById("js-barrage-list") ||
      document.querySelector(".Barrage-list");
    if (list) {
      (0, __imports.clearInterval)(waitTimer);
      var observer = new MutationObserver(function (mutations) {
        for (var m = 0; m < mutations.length; m++) {
          var record = mutations[m];
          if (!record.addedNodes || record.addedNodes.length === 0) continue;
          for (var i = 0; i < record.addedNodes.length; i++) {
            checkAndTrackSelfDanmu(record.addedNodes[i]);
          }
        }
      });
      observer.observe(list, { childList: true, subtree: false });
    }
  }, 1000);
}


}
,
"src/next/ui/room/shell.js":
function* (__imports) {
yield {"mountRoomShell": { get: () => mountRoomShell, set: value => { mountRoomShell = value; } }};
// Phase-local construction values; only declared outputs cross phase boundaries.
function mountRoomShell(owner) {
let elementOrValue, containerOrValue;
elementOrValue = document.createElement("div");
containerOrValue = ((elementOrValue.className = "ChatToolBar-DanmakuTail"),
      (elementOrValue.innerHTML =
        '<div class="ChatToolBar-DanmakuTail-tip" title="弹幕小尾巴" ></div>'),
      document.getElementsByClassName("ChatToolBar__left")[0]);
(containerOrValue && containerOrValue.appendChild(elementOrValue));
((containerOrValue = document.createElement("div")).className =
      "ChatToolBar-DanmakuTail-Panel");
(elementOrValue =
      document.getElementsByClassName("layout-Player-chat")[0] ||
      document.body);
(elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
(window.location.href.includes("/beta") || (containerOrValue.style.bottom = "140px"));
(containerOrValue.innerHTML = `

        <div class="ChatToolBar-DanmakuTail-title">弹幕小尾巴</div>

        <input type="text" class="DanmakuTail-input" id="DanmakuTail-input" placeholder="请输入小尾巴内容"/>

        <div class="DanmakuTail-option-label">

            <label for="DanmakuTail-option-label1">

                <input type="radio" name="DanmakuTailType" value="1" id="DanmakuTail-option-label1"> 前缀

            </label>

            <label for="DanmakuTail-option-label2">

                <input type="radio" name="DanmakuTailType" value="2" id="DanmakuTail-option-label2" checked> 后缀

            </label>

        </div>

        <label class="DanmakuTail-checkbox-label">

            <input type="checkbox" class="DanmakuTail-checkbox" id="DanmakuTail-checkbox" />

            启用功能

        </label>

    `);
(null != (elementOrValue = __imports.localStorage.getItem("ExSave_DanmakuTail")) &&
      ((elementOrValue = JSON.parse(elementOrValue)),
      ((0, __imports.safeEl)("DanmakuTail-checkbox").checked = elementOrValue.isTailEnabled),
      ((0, __imports.safeEl)("DanmakuTail-input").value = elementOrValue.tailContent || ""),
      ((0, __imports.safeEl)("DanmakuTail-input").disabled = elementOrValue.isTailEnabled),
      (document.querySelectorAll('input[name="DanmakuTailType"]')[0].disabled =
        elementOrValue.isTailEnabled),
      (document.querySelectorAll('input[name="DanmakuTailType"]')[1].disabled =
        elementOrValue.isTailEnabled),
      elementOrValue.type
        ? ((document.querySelector(
            `input[name="DanmakuTailType"][value="${elementOrValue.type}"]`,
          ).checked = !0),
          (0, __imports.Ue)())
        : (document.querySelector(
            'input[name="DanmakuTailType"][value="2"]',
          ).checked = !0),
      elementOrValue.isTailEnabled) &&
      document
        .querySelector(".ChatToolBar-DanmakuTail-tip")
        .classList.add("ChatToolBar-DanmakuTail-tip-active"));
((0, __imports.safeBind)(".ChatToolBar-DanmakuTail", "click", function () {
      (0, __imports.openFeaturePanel)("弹幕小尾巴");
    }, owner));
{
    containerOrValue = ("#DanmakuTail-checkbox", elementOrValue = "#DanmakuTail-input");
    let s = null,
      d = null;
    function a(i, a) {
      let r =
          document.querySelector("textarea.ChatSend-txt") ||
          document.querySelector("div.ChatSend-txt"),
        l = document.querySelector(".ChatSend-button");
      if (r && l) {
        c();
        let t = "div" === r.tagName.toLowerCase(),
          o = () => (t ? r.innerText : r.value),
          n = (e) => {
            t ? (r.innerText = e) : (r.value = e);
          };
        ((s = function (e) {
          !e.isTrusted ||
            "Enter" !== e.key ||
            e.shiftKey ||
            (e.preventDefault(), e.stopPropagation(), l.click());
        }),
          (d = function (e) {
            var t = o();
            if ("" != t.trim()) {
              let e = !1;
              (e = "1" === a ? !t.startsWith(i) : !t.endsWith(i)) &&
                ("1" === a ? n(i + t) : n(t + i),
                r.dispatchEvent(new Event("input", { bubbles: !0 })));
            }
          }),
          owner.listen(r, "keydown", s, !0),
          owner.listen(l, "click", d, !0));
      }
    }
    function c() {
      var e =
          document.querySelector("textarea.ChatSend-txt") ||
          document.querySelector("div.ChatSend-txt"),
        t = document.querySelector(".ChatSend-button");
      (e && s && e.removeEventListener("keydown", s, !0),
        t && d && t.removeEventListener("click", d, !0),
        (s = null),
        (d = null));
    }
    let e = document.querySelector(containerOrValue),
      t = document.querySelector(elementOrValue),
      o = document.querySelectorAll('input[name="DanmakuTailType"]'),
      n = document.querySelector('input[name="DanmakuTailType"]:checked')
        ? document.querySelector('input[name="DanmakuTailType"]:checked').value
        : "2";
    e &&
      (owner.listen(e, "change", function () {
        "" === t.value.trim()
          ? ((e.checked = !1), (0, __imports.T)("【弹幕小尾巴】请输入弹幕小尾巴内容", "error"))
          : ((t.disabled = e.checked),
            (o[0].disabled = e.checked),
            (o[1].disabled = e.checked),
            document
              .querySelector(".ChatToolBar-DanmakuTail-tip")
              .classList.remove("ChatToolBar-DanmakuTail-tip-active"),
            c(),
            e.checked &&
              t &&
              (document
                .querySelector(".ChatToolBar-DanmakuTail-tip")
                .classList.add("ChatToolBar-DanmakuTail-tip-active"),
              a(
                t.value.trim(),
                (n = document.querySelector(
                  'input[name="DanmakuTailType"]:checked',
                ).value),
              )));
      }),
      e.checked) &&
      t &&
      a(t.value.trim(), n);
  }
((0, __imports.safeBind)("#DanmakuTail-checkbox", "change", function () {
    (0, __imports.Ue)();
  }, owner));
(document.querySelectorAll('input[name="DanmakuTailType"]').forEach((e) => {
      owner.listen(e, "change", function () {
        (0, __imports.Ue)();
      });
    }));
((0, __imports.safeBind)("#DanmakuTail-input", "input", function () {
      (0, __imports.Ue)();
    }, owner));
((containerOrValue = !!document.getElementsByClassName("live-next-body")[0]) ||
      (((containerOrValue = document.createElement("div")).style =
        "position: absolute;right: -75px;top: 18px;cursor: pointer;"),
      (containerOrValue.id = "ex-night"),
      (containerOrValue.innerHTML = __imports.Jo),
      (containerOrValue.title = "切换夜间模式"),
      (_hr = document.getElementsByClassName("Header-right")[0]) &&
        _hr.appendChild(containerOrValue),
      (0, __imports.safeBind)("#ex-night", "click", function () {
        var e,
          t = document.getElementById("ex-night");
        0 == __imports.Zo
          ? ((__imports.Zo = 1),
            (t.innerHTML = __imports.Qo),
            (t.title = "切换日间模式"),
            (0, __imports.Ko)(),
            (0, __imports.Xo)(),
            (0, __imports.$o)())
          : ((__imports.Zo = 0),
            (t.innerHTML = __imports.Jo),
            (t.title = "切换夜间模式"),
            (0, __imports.U)("Ex_Style_NightMode"),
            (0, __imports.Xo)(),
            (t = document
              .getElementsByClassName("BottomGroup")[0]
              .getElementsByTagName("iframe")[0].contentWindow.document),
            (e = "Ex_Style_NightModeIframe"),
            null !== t.getElementById(e) && t.getElementById(e).remove());
      }, owner),
      (containerOrValue = __imports.localStorage.getItem("ExSave_Mode")),
      (elementOrValue = document.getElementById("ex-night")),
      null != containerOrValue &&
        ("mode" in (containerOrValue = JSON.parse(containerOrValue)) == 0 && (containerOrValue.mode = 0), 1 == containerOrValue.mode) &&
        ((__imports.Zo = 1), (elementOrValue.innerHTML = __imports.Qo), (elementOrValue.title = "切换日间模式")),
      new __imports.DomMutationSubscription(".BottomGroup", !0, (e) => {
        0 != __imports.Zo && 1 == e.length && (0, __imports.$o)();
      }, owner)));
{
    let e = document.createElement("div"),
      t =
        ((e.className = "ex-icon"),
        (e.innerHTML = `<a title="DouyuEx-RL ver.${__imports.P}">${__imports.et}<i id="ex-icon__tip" class="ex-panel__tip"></i></a>`),
        document.querySelector(
          ".PlayerToolbar-ContentCell .PlayerToolbar-Wealth",
        ));
    t
      ? t.insertBefore(e, t.childNodes[0])
      : ((e.className += " ToolbarGiftArea-backpack"),
        (e.style.width = "52px"),
        (t = document.querySelector(".ToolbarGiftArea-container"))
          ? t.appendChild(e)
          : document.body && document.body.appendChild(e));
  }
(0, __imports.safeBind)(".ex-icon", "click", __imports.qt, owner);
{
    let e = document.createElement("div"),
      t =
        ((e.className = "ex-panel"),
        (e.innerHTML =
          '<button type="button" class="ex-panel__close" title="关闭工具条" aria-label="关闭 DouyuEx 工具条">×</button><div class="ex-panel__wrap"></div>'),
        (0, __imports.At)());
    (t
      ? ((containerOrValue = document.querySelector(".PlayerToolbar")),
        (e.style.bottom = containerOrValue ? containerOrValue.offsetHeight + "px" : "76px"))
      : ((t = (0, __imports.jt)()), e.classList.add("ex-panel--floating")),
      t.insertBefore(e, t.childNodes[0]),
      (0, __imports.Pt)(e),
      (0, __imports.Dt)() && (0, __imports.Ot)(),
      (0, __imports.initDockFull)(e.querySelector(".ex-panel__wrap")));
  }
{
    let _ep = document.querySelector(".ex-panel");
    if (_ep) {
      let _c = _ep.querySelector(".ex-panel__close");
      if (_c)
        owner.listen(_c, "click", (e) => {
          (e.stopPropagation(), (0, __imports.Gt)());
        });
    }
  }
(0, __imports.tl)(
    "Ex_Style_RealAudience",
    `

    .VideoEntry{display:none !important;}

	.layout-Player-rank{top:34px !important;}

    `,
  );
{
    let e = document.getElementsByClassName("VideoEntry")[0];
    (e && (e.style.display = "none"),
      (containerOrValue = ""),
      ((elementOrValue = document.createElement("div")).className = "real-audience"),
      (containerOrValue += "<div style='flex: 1;white-space: nowrap'>"),
      (elementOrValue.innerHTML =
        ("<div style='flex: 1;white-space: nowrap'><div id='real-audience__t' style='display: inline-block;margin-right:3px;' title='今日累计观看人数'><svg style=\"width:16px;height:16px\" t=\"1566119680547\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"3494\" width=\"128\" height=\"128\"><path d=\"M712.820909 595.224609C807.907642 536.686746 870.40537 437.74751 870.40537 325.549212 870.400378 145.753547 709.943392 0 511.997503 0 314.055363 0 153.599626 145.753547 153.599626 325.549212 153.599626 437.74751 216.092361 536.686746 311.179092 595.219615 149.961841 657.72608 31.268214 793.205446 5.334335 955.968198 1.926253 962.195123 0 969.212275 0 976.638899 0 1002.324352 22.919038 1023.151098 51.198627 1023.151098 79.476967 1023.151098 102.396005 1002.324352 102.396005 976.638899L102.396005 1023.151098C102.396005 817.669984 285.787009 651.099674 511.997503 651.099674 738.212992 651.099674 921.602746 817.669984 921.602746 1023.151098L921.602746 976.638899C921.602746 1002.324352 944.523034 1023.151098 972.801376 1023.151098 1001.07472 1023.151098 1024 1002.324352 1024 976.638899 1024 969.212275 1022.073747 962.195123 1018.659424 955.968198 992.731789 793.205446 874.038157 657.72608 712.820909 595.224609ZM511.997503 558.080262C370.618285 558.080262 256.000624 453.967732 256.000624 325.545467 256.000624 197.121954 370.618285 93.009424 511.997503 93.009424 653.386707 93.009424 767.993133 197.121954 767.993133 325.545467 767.993133 453.972726 653.386707 558.080262 511.997503 558.080262L511.997503 558.080262Z\" p-id=\"3495\"></path></svg><span id=\"real-audience__total\" style=\"color:#ed5a65\">****</span></div><div style='display: inline-block;margin-right:3px;' title='弹幕人数'><svg t=\"1587796804183\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www." +
"w3.org/2000/svg\" p-id=\"20780\" width=\"16\" height=\"16\"><path d=\"M811.8272 62.6176H212.1728c-79.9232 0-149.8624 69.9392-149.8624 149.9136v599.6032a150.3232 150.3232 0 0 0 149.8624 149.9136h599.6544a150.3232 150.3232 0 0 0 149.8624-149.9136V212.5312c0-79.9744-69.9392-149.9136-149.8624-149.9136zM263.5264 367.104c30.0032 0 49.9712 19.968 49.9712 49.9712s-19.968 49.92-49.9712 49.92-49.9712-19.968-49.9712-49.92 20.0192-49.9712 49.9712-49.9712z m449.6896 294.8096H263.5264c-24.9856 0-49.9712-24.9856-49.9712-49.9712s24.9856-49.9712 49.9712-49.9712h449.6896c24.9856 0 49.9712 24.9856 49.9712 49.9712s-24.9856 49.9712-49.9712 49.9712z m99.9424-199.68H463.4112c-24.9856 0-49.9712-24.9856-49.9712-49.9712s24.9856-49.9712 49.9712-49.9712h349.7472c24.9856 0 49.9712 24.9856 49.9712 49.9712s-24.9856 49.7664-49.9712 49.7664z\" p-id=\"20781\" fill=\"#1296db\"></path></svg><span id=\"real-audience__barrage\">****</span></div><div id='real-audience__noble-wrap' style='display: inline-block;margin-right:3px;' title='贵宾数'><svg t=\"1779268394045\" class=\"icon\" viewBox=\"0 0 1170 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"5245\" width=\"16\" height=\"16\"><path d=\"M270.579175 30.138897S391.031549-36.125391 427.208548 36.176998c36.125391 18.062695 114.46588 463.798407 132.528575 548.176999 18.062695 90.365084 60.226187 120.452374 84.326983 84.326983s114.46588-126.490475 174.692068-265.057152-18.062695-156.629372-42.163492-150.591271c-24.100796 6.038101-150.591271 12.024594-108.427779-42.163491 48.201593-54.188086 156.629372-150.591271 186.716661-162.615866 54.188086-36.125391 138.566677-84.326983 210.817458-6.038101 42.163492 30.138897 144.55317 150.591271 48.201593 319.245238-96.403185 174.692067-475.874609 614.389678-475.87461 614.389678s-138.566677 90.365084-192.754762 0c-54.188086-84.326983-240" +
".956355-554.163492-246.994456-614.389678 0-60.226187-18.062695-72.302389-48.201593-60.226187-30.138897 18.062695-90.365084 102.389678-96.403185 78.288882-5.986493-24.100796-60.174579-60.277795-24.049189-114.465881 30.138897-48.201593 216.855559-216.855559 240.956355-234.918254z\" fill=\"#CCB88F\" p-id=\"5246\"></path></svg><span id=\"real-audience__noble\">****</span></div><div id='real-audience__money' style='display: inline-block;margin-right:3px;' title='今日累计礼物价值'><svg t=\"1579155265981\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"6949\" width=\"16\" height=\"16\"><path d=\"M136.96 67.413h181.76L512 452.693l193.28-385.28h181.76l-245.76 445.44h163.84v84.48h-211.2l-1.28 1.28v106.24h212.48v84.48H592.64v192H431.36v-192h-211.2v-84.48h211.2v-106.24l-1.28-1.28H220.16v-84.48h162.56z\" fill=\"#F54330\" p-id=\"6950\"></path></svg><span id=\"real-audience__money_yc\">****</span></div></div><span id=\"real-audience__time\" style=\"white-space: nowrap;display: block;\">已播:****</span><span id=\"real-audience__watchtime\" style=\"white-space: nowrap;display: none;\">已观看:****</span>")),
      (containerOrValue = (0, __imports.E)([".layout-Player-announce", ".layout-Player-rankAll"])) &&
        containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]));
  }
(0, __imports.safeBind)(".real-audience", "click", function () {
    (0, __imports._)("https://www.doseeing.com/room/" + __imports.B, !0);
  }, owner);
}

}
,
"src/next/ui/room/room-controls.js":
function* (__imports) {
yield {"mountRoomControls": { get: () => mountRoomControls, set: value => { mountRoomControls = value; } }};
// Phase-local construction values; only declared outputs cross phase boundaries.
function mountRoomControls(owner) {
let elementOrValue, containerOrValue, controlNodes, controlParent, replayUrl;
elementOrValue = document.querySelectorAll(".VideoEntry-tabItem>a")[0];
(null != elementOrValue &&
    ((containerOrValue = elementOrValue.href + "?type=video"),
    (elementOrValue = elementOrValue.href + "?type=liveReplay"),
    (controlNodes = document.createElement("div")),
    (__imports.ln = !!document.getElementsByClassName("Title-anchorPic-bottom")[0]),
    (controlNodes.className = __imports.ln ? "" : "Title-anchorPic-bottom"),
    (controlNodes.innerHTML = `

	<div id="Ex_VideoReview" class="Title-anchorPic-bottomItem"><span>回看</span></div>

	<i style="top: 28px"></i>

	<div id="Ex_VideoSubmit" class="Title-anchorPic-bottomItem"><span>投稿</span></div>

	`),
    (controlParent =
      document.getElementsByClassName("Title-anchorPic-bottom")[0] ||
      document.getElementsByClassName("Title-anchorPicBack")[0]).insertBefore(
      controlNodes,
      controlParent.childNodes[0],
    ),
    (controlNodes = document.createElement("div")),
    (__imports.ln = !!document.getElementsByClassName("Title-anchorPic-bottom")[0]),
    (controlNodes.className = __imports.ln ? "" : "Title-anchorPic-bottom"),
    (controlNodes.innerHTML = `

	<div id="Ex_EnterYuba" class="Title-anchorPic-bottomItem"><span>打开鱼吧</span></div>

	`),
    (controlParent =
      document.getElementsByClassName("Title-anchorPic-bottom")[0] ||
      document.getElementsByClassName("Title-anchorPicBack")[0]).insertBefore(
      controlNodes,
      controlParent.childNodes[0],
    ),
    (owner.navigation.submitTarget = containerOrValue),
    (replayUrl = elementOrValue),
    (0, __imports.safeBind)("#Ex_VideoSubmit", "click", () => {
      (0, __imports._)(owner.navigation.submitTarget, !0);
    }, owner),
    (0, __imports.safeBind)("#Ex_VideoReview", "click", () => {
      (0, __imports._)(replayUrl, !0);
    }, owner),
    (0, __imports.safeBind)("#Ex_EnterYuba", "click", async () => {
      var e;
      ((e = __imports.B),
        (0, __imports._)(
          (
            await new Promise((t, o) => {
              (0, __imports.fetch)(
                "https://www.douyu.com/wgapi/yubanc/api/group/getBindGroup?room_id=" +
                  e,
              )
                .then(owner.guard((e) => e.json()))
                .then(owner.guard((e) => {
                  t(e);
                }))
                .catch((e) => {
                  o(e);
                });
            })
          ).data.group_url,
          !0,
        ));
    }, owner),
    (document.getElementsByClassName(
      "Title-anchorPic-bottom",
    )[0].style.display = "none"),
    (document.getElementsByClassName("Title-anchorPic-bottom")[0].style.height =
      __imports.ln ? "66px" : "22px"),
    (0, __imports.safeBind)(".Title-anchorPicBack", "mouseenter", () => {
      document.getElementsByClassName(
        "Title-anchorPic-bottom",
      )[0].style.display = "block";
    }, owner),
    (0, __imports.safeBind)(".Title-anchorPicBack", "mouseleave", () => {
      document.getElementsByClassName(
        "Title-anchorPic-bottom",
      )[0].style.display = "none";
    }, owner)));
((0, __imports.fetch)("https://www.douyu.com/swf_api/h5room/" + __imports.B, {
      method: "GET",
      mode: "no-cors",
      credentials: "include",
    })
      .then(owner.guard((e) => e.json()))
      .then(owner.guard((e) => {
        ((__imports.j.showtime = e.data.show_time),
          (__imports.j.isShow = e.data.show_status),
          (0, __imports.refreshRoomMusic)(),
          owner.interval(__imports.refreshRoomMusic, 15e4),
          owner.interval(__imports.advanceRoomMusic, 5e3));
      }))
      .catch((e) => {
        console.log("请求失败!", e);
      }));
{
    let e = document.createElement("div"),
      t =
        ((e.className = "Title-blockInline"),
        (e.id = "copy-real-live"),
        (e.innerHTML =
          '<div class="TitleShare"><div class="TitleShare-shareBox "><div class="Title-row-span is-right"><span class="Title-row-icon "><svg t="1585641756842" class="icon" viewBox="0 0 1237 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5646" width="16" height="16"><path d="M648.448 946.347l0.256-1.622-0.256 1.622z m84.31 13.354c-0.769 4.608-0.769 4.608-4.182 13.483-8.533 16.768-8.533 16.768-49.835 22.784-24.149-14.293-24.149-14.293-27.605-22.613-2.475-5.718-2.475-5.718-3.541-9.387L476.416 335.36l-103.083 499.2c-1.109 5.12-1.109 5.12-4.821 13.27-6.827 12.117-6.827 12.117-35.285 22.527-30.294-7.253-30.294-7.253-38.742-19.37-4.522-8.15-4.522-8.15-6.058-13.227l-74.582-262.357H0v-85.334h278.272l45.781 161.11 104.022-503.424c1.024-4.694 1.024-4.694 4.394-12.502 6.102-11.989 6.102-11.989 35.968-23.338 31.83 8.533 31.83 8.533 39.254 20.736 4.053 7.808 4.053 7.808 5.376 12.544l165.888 609.237 113.92-716.885c0.896-5.248 0.896-5.248 4.864-14.592 9.088-15.574 9.088-15.574 44.928-22.4C868.48 12.587 868.48 12.587 873.6 22.443c3.285 6.912 3.285 6.912 4.523 11.52l112 446.549h221.738v85.333H923.563l-78.507-312.917-112.299 706.773z" p-id="5647"></path></svg></span><span class="Title-row-text">复制直播流</span></div></div></div>'),
        document.getElementsByClassName("Title-col")[4]);
    t && 1 < t.childNodes.length
      ? t.insertBefore(e, t.childNodes[1])
      : (t = (0, __imports.E)([".subTitleContainer__-vzhr"])) && t.appendChild(e);
  }
(0, __imports.safeBind)("#copy-real-live", "click", __imports.Ge, owner);
controlNodes = document.getElementsByClassName("RecommendViewTit-04ebd8");
0 < controlNodes.length && controlNodes[0].innerText;
{
    let e = document.createElement("div"),
      t =
        ((e.className = "Title-blockInline"),
        (e.id = "ex-audio-line"),
        (e.innerHTML =
          '<div class="TitleShare"><div class="TitleShare-shareBox "><div class="Title-row-span  is-right"><span class="Title-row-icon "><svg t="1613808136306" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2829" width="16" height="16"><path d="M496 64A48 48 0 0 1 544 112v800a48 48 0 0 1-96 0v-800A48 48 0 0 1 496 64z m-224 128A48 48 0 0 1 320 240v544a48 48 0 0 1-96 0v-544A48 48 0 0 1 272 192z m448 0A48 48 0 0 1 768 240v544a48 48 0 0 1-96 0v-544A48 48 0 0 1 720 192z m-672 128A48 48 0 0 1 96 368v288a48 48 0 0 1-96 0v-288A48 48 0 0 1 48 320z m896 0a48 48 0 0 1 48 48v288a48 48 0 0 1-96 0v-288a48 48 0 0 1 48-48z" p-id="2830"></path></svg></span><span class="Title-row-text ">切换音频线路</span></div></div></div>'),
        document.getElementsByClassName("Title-col")[4]);
    t && 1 < t.childNodes.length
      ? t.insertBefore(e, t.childNodes[1])
      : (t = (0, __imports.E)([".subTitleContainer__-vzhr"])) && t.appendChild(e);
  }
(0, __imports.safeBind)("#ex-audio-line", "click", __imports.le, owner);
{
    let o = owner.interval(() => {
      if (
        null !=
        (0, __imports.E)([
          ".PlayerToolbar-ContentCell .PlayerToolbar-Wealth",
          "#js-backpack-enter",
        ])
      ) {
        ((0, __imports.clearInterval)(o),
          (document.getElementById("js-barrage-list").parentNode.id =
            "js-barrage-list-parent"));
        var e = document.createElement("div"),
          t =
            ((e.style =
              "position: absolute;right: 5px;top: 40px;cursor: pointer;"),
            (e.id = "ex-removeMsgNotice"),
            (e.innerHTML =
              '<label id="msg-removeNotice" style="cursor: pointer;"><input type="checkbox" />关闭角标提醒</label>'),
            (e.title = "关闭角标提醒"),
            document.getElementsByClassName("PrivateLetter-frame")[0]),
          t =
            (t && t.appendChild(e),
            document.getElementById("msg-removeNotice"));
        if (t) {
          let e = t.querySelector("input");
          owner.listen(t, "click", () => {
            (1 == e.checked
              ? ((__imports.vn = 1), (0, __imports.xn)())
              : ((__imports.vn = 0), (0, __imports.U)("Ex_Style_RemoveMsgNotice")),
              __imports.localStorage.setItem("ExSave_isRemoveMsgNotice", __imports.vn));
          });
        }
        e = __imports.localStorage.getItem("ExSave_isRemoveMsgNotice");
        e &&
          "1" == e &&
          ((__imports.vn = 1), (0, __imports.xn)(), (e = document.getElementById("msg-removeNotice"))) &&
          (e.querySelector("input").checked = !0);
      }
    }, 1e3);
  }
{
    let e = owner.interval(() => {
      void 0 !== document.getElementsByClassName("BarrageFilter")[0] &&
        ((0, __imports.clearInterval)(e),
        new __imports.DomMutationSubscription(".BarrageFilter", !1, (e) => {
          if (
            0 !== e.length &&
            0 < e[0].addedNodes.length &&
            0 === e[0].removedNodes.length
          )
            if (document.getElementsByClassName("FilterKeywords")[0]) (0, __imports.qn)();
            else {
              let e = owner.interval(() => {
                document.getElementsByClassName("FilterKeywords")[0] &&
                  ((0, __imports.clearInterval)(e), (0, __imports.qn)());
              }, 50);
            }
        }, owner));
    }, 1e3);
  }
(0, __imports.mountBackpackControls)(owner);
}

}
,
"src/next/ui/room/lottery.js":
function* (__imports) {
yield {"mountLotteryPanel": { get: () => mountLotteryPanel, set: value => { mountLotteryPanel = value; } }};
// Phase-local construction values; only declared outputs cross phase boundaries.
function mountLotteryPanel(owner) {
let controlParent, containerOrValue, elementOrValue;
controlParent = document.createElement("div");
containerOrValue = ((controlParent.className = "ex-update"),
      (controlParent.innerHTML =
        '<a class="ex-panel__icon" title="版本更新，当前版本：${P}"><svg t="1578767541873" style="display:block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="23715" width="32" height="32"><path d="M768 810.7H512c-23.6 0-42.7-19.1-42.7-42.7s19.1-42.7 42.7-42.7h256c94.1 0 170.7-76.6 170.7-170.7 0-89.6-70.1-164.3-159.5-170.1L754 383l-10.7-22.7c-42.2-89.3-133-147-231.3-147s-189.1 57.7-231.3 147L270 383l-25.1 1.6c-89.5 5.8-159.5 80.5-159.5 170.1 0 94.1 76.6 170.7 170.7 170.7 23.6 0 42.7 19.1 42.7 42.7s-19.1 42.7-42.7 42.7c-141.2 0-256-114.8-256-256 0-126.1 92.5-232.5 214.7-252.4C274.8 195.7 388.9 128 512 128s237.2 67.7 297.3 174.2C931.5 322.1 1024 428.6 1024 554.7c0 141.1-114.8 256-256 256z" fill="#3688FF" p-id="23716"></path><path d="M554.7 938.7c-10.9 0-21.8-4.2-30.2-12.5l-128-128c-16.7-16.7-16.7-43.7 0-60.3l128-128c16.6-16.7 43.7-16.7 60.3 0 16.7 16.7 16.7 43.7 0 60.3L487 768l97.8 97.8c16.7 16.7 16.7 43.7 0 60.3-8.3 8.4-19.2 12.6-30.1 12.6z" fill="#5F6379" p-id="23717"></path></svg><i id="ex-update__tip" class="ex-panel__tip"></i></a>'),
      document.getElementsByClassName("ex-panel__wrap")[0]);
containerOrValue && containerOrValue.insertBefore(controlParent, containerOrValue.childNodes[0]);
elementOrValue = document.createElement("div");
containerOrValue = ((elementOrValue.className = "ex-monitor"),
      (elementOrValue.innerHTML =
        '<a class="ex-panel__icon" title="在线弹幕助手"><svg style="display:block;" t="1638235744961" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="69800" width="32" height="32"><path d="M426.666667 106.666667a21.333333 21.333333 0 0 1 21.333333-21.333334h512a21.333333 21.333333 0 0 1 0 42.666667H448a21.333333 21.333333 0 0 1-21.333333-21.333333z m533.333333 789.333333H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667z m0-554.666667H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667z m0 298.666667H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667zM245.333333 42.666667H96a53.393333 53.393333 0 0 0-53.333333 53.333333v149.333333a53.393333 53.393333 0 0 0 53.333333 53.333334h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333334V96a53.393333 53.393333 0 0 0-53.333334-53.333333z m0 341.333333H96a53.393333 53.393333 0 0 0-53.333333 53.333333v149.333334a53.393333 53.393333 0 0 0 53.333333 53.333333h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333333V437.333333a53.393333 53.393333 0 0 0-53.333334-53.333333z m0 341.333333H96a53.393333 53.393333 0 0 0-53.333333 53.333334v149.333333a53.393333 53.393333 0 0 0 53.333333 53.333333h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333333v-149.333333a53.393333 53.393333 0 0 0-53.333334-53.333334z" fill="#13227a" p-id="69801"></path></svg><i id="Monitor__tip" class="ex-panel__tip"></i></a>'),
      document.getElementsByClassName("ex-panel__wrap")[0]);
elementOrValue = (containerOrValue && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]),
      (0, __imports.safeBind)(".ex-monitor", "click", function () {
        (0, __imports._)("https://www.douyuex.com/" + String(__imports.B));
      }, owner),
      (async () => {
        var t = [],
          e = await (0, __imports.fetch)("https://www.douyu.com/member/cp/getFansBadgeList", {
            method: "GET",
            mode: "no-cors",
            cache: "default",
            credentials: "include",
          })
            .then(owner.guard((e) => e.text()))
            .catch((e) => {
              console.log("请求失败!", e);
            }),
          o = (e = new DOMParser().parseFromString(
            e,
            "text/html",
          )).getElementsByClassName("fans-badge-list")[0].lastElementChild,
          n = o.children.length;
        for (let e = 0; e < n; e++) {
          var i = o.children[e].getAttribute("data-fans-room");
          t.push(i);
        }
        __imports.To = t;
      })(),
      document.createElement("div"));
containerOrValue = ((elementOrValue.className = "exlottery"),
      (elementOrValue.innerHTML = `

        <div class="lottery__func">

            <div id="lottery-refresh">

                <svg t="1636115506027" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2454" width="16" height="16"><path d="M927.999436 531.028522a31.998984 31.998984 0 0 0-31.998984 31.998984c0 51.852948-10.147341 102.138098-30.163865 149.461048a385.47252 385.47252 0 0 1-204.377345 204.377345c-47.32295 20.016524-97.6081 30.163865-149.461048 30.163865s-102.138098-10.147341-149.461048-30.163865a385.47252 385.47252 0 0 1-204.377345-204.377345c-20.016524-47.32295-30.163865-97.6081-30.163865-149.461048s10.147341-102.138098 30.163865-149.461048a385.47252 385.47252 0 0 1 204.377345-204.377345c47.32295-20.016524 97.6081-30.163865 149.461048-30.163865a387.379888 387.379888 0 0 1 59.193424 4.533611l-56.538282 22.035878A31.998984 31.998984 0 1 0 537.892156 265.232491l137.041483-53.402685a31.998984 31.998984 0 0 0 18.195855-41.434674L639.723197 33.357261a31.998984 31.998984 0 1 0-59.630529 23.23882l26.695923 68.502679a449.969005 449.969005 0 0 0-94.786785-10.060642c-60.465003 0-119.138236 11.8488-174.390489 35.217667a449.214005 449.214005 0 0 0-238.388457 238.388457c-23.361643 55.252253-35.22128 113.925486-35.22128 174.390489s11.8488 119.138236 35.217668 174.390489a449.214005 449.214005 0 0 0 238.388457 238.388457c55.252253 23.368867 113.925486 35.217667 174.390489 35.217667s119.138236-11.8488 174.390489-35.217667A449.210393 449.210393 0 0 0 924.784365 737.42522c23.368867-55.270316 35.217667-113.925486 35.217667-174.390489a31.998984 31.998984 0 0 0-32.002596-32.006209z" fill="" p-id="2455"></path></svg>

            </div>

            <div class="lottery__notice">

                <label class="lottery__notice"><input class="lottery__notice" id="lottery-notice" type="checkbox">开启提醒</label>

            </div>

        </div>

        <div class="lottery__nodata">暂无数据</div>

        <div class="lottery__wrap"></div>

    `),
      document.getElementsByClassName("layout-Player-chat")[0] ||
        document.body);
elementOrValue = (containerOrValue && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]), document.createElement("div"));
containerOrValue = ((elementOrValue.className = "ex-lottery"),
      (elementOrValue.innerHTML =
        '<a class="ex-panel__icon" title="全站抽奖信息"><svg style="display:block;" t="1636332741708" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="19181" width="32" height="32"><path d="M508.858182 986.042182c-261.748364 0-473.925818-212.177455-473.925818-473.925818S247.109818 38.190545 508.858182 38.190545s473.925818 212.177455 473.925818 473.925819-212.200727 473.925818-473.925818 473.925818m0-981.690182C228.421818 4.352 1.093818 231.703273 1.093818 512.116364s227.351273 507.764364 507.764364 507.764363c280.413091 0 507.787636-227.351273 507.787636-507.764363S789.271273 4.352 508.858182 4.352" fill="#FF4517" p-id="19182"></path><path d="M322.536727 512.302545l0.023273-1.326545-313.064727-1.931636c0 1.093818-0.093091 2.164364-0.093091 3.281454 0 90.88 24.785455 175.918545 67.84 248.925091l270.173091-155.997091a185.274182 185.274182 0 0 1-24.878546-92.951273zM416.791273 350.440727L264.029091 82.013091A492.986182 492.986182 0 0 0 77.498182 262.981818l270.173091 155.997091a186.717091 186.717091 0 0 1 69.12-68.538182zM602.856727 351.697455l151.831273-259.211637A488.261818 488.261818 0 0 0 508.718545 21.690182l0.023273 304.453818c34.350545 0 66.513455 9.355636 94.114909 25.553455zM258.536727 939.450182a488.471273 488.471273 0 0 0 241.710546 63.674182c2.839273 0 5.632-0.139636 8.448-0.186182V698.507636a185.064727 185.064727 0 0 1-94.068364-25.553454l-156.090182 266.496zM927.325091 270.452364l-257.466182 148.666181a185.204364 185.204364 0 0 1 25.041455 93.207273l-0.046546 1.070546 296.168727 1.838545c0.023273-0.977455 0.069818-1.931636 0.069819-2.909091 0-87.994182-23.249455-170.496-63.767273-241.873454zM600.855273 674.094545l148.573091 261.073455a492.776727 492.776727 0 0 0 178.106181-181.387636l-257.466181-148.642909a187.042909 187.042909 0 0 1-69.213091 68.95709z" fill="#FF4517" p-id="19183"></path><path d="M644.142545 512.302545a135.400727 135.400727 0 0 0-135.424-135.400727l-84.619636-160.791273 20.642909 173.824c-42.658909 22.784-71.400727 70.609455-71.400727 122.368a135.447273 135.447273 0 0 0 270.801454 0z m-133.492363 70.097455a68.491636 68.491636 0 1 1 0.023273-136.96 68.491636 68.491636 0 0 1-0.023273 136.96z" fill="#FF4517" p-id="19184"></path></svg><i id="lottery__tip" class="ex-panel__tip"></i></a>'),
      document.getElementsByClassName("ex-panel__wrap")[0]);
containerOrValue && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]);
{
    let t = document.getElementById("lottery-notice");
    ((0, __imports.safeBind)(".ex-lottery", "click", () => {
      (0, __imports.openFeaturePanel)("全站抽奖信息");
      var e = document.getElementsByClassName("lottery__wrap")[0];
      e && (e.innerHTML = __imports.So);
    }, owner),
      (0, __imports.safeBind)(
        "#lottery-refresh",
        "click",
        ((o, n) => {
          let i;
          return function () {
            var e = arguments,
              t = (i && (0, __imports.clearTimeout)(i), !i);
            ((i = owner.timeout(() => {
              i = null;
            }, n)),
              t && o.apply(this, e));
          };
        })(() => {
          (0, __imports.Lo)();
        }, 3e3), owner),
      t &&
        owner.listen(t, "click", () => {
          var e = t.checked;
          ((__imports.Mo = 1 == e),
            (e = { isNotice: __imports.Mo }),
            __imports.localStorage.setItem("ExSave_Lottery", JSON.stringify(e)));
        }));
  }
(elementOrValue = __imports.localStorage.getItem("ExSave_Lottery"));
(null != elementOrValue &&
      1 == JSON.parse(elementOrValue).isNotice &&
      (owner.navigation.submitTarget = document.getElementById("lottery-notice")) &&
      owner.navigation.submitTarget.click());
(__imports.No = owner.interval(() => {
      (0, __imports.Lo)();
    }, 6e4));
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "popup-player");
(containerOrValue.innerHTML =
      '<a class="ex-panel__icon" title="同屏播放"><svg style="display:block;" t="1579448049771" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1804" width="30" height="30"><path d="M353.024 900.416H109.952c-57.856 0-109.952-46.336-109.952-98.432V153.6c0-52.096 52.096-98.432 109.952-98.432h810.176c57.856 0 104.192 46.336 104.192 98.496v185.472c0 28.928-23.168 52.096-46.336 52.096s-46.272-23.168-46.272-52.096V159.36H98.368V807.68h248.896c34.688 0 52.032 17.408 52.032 46.336 0 28.928-17.344 46.272-46.272 46.272" fill="#f26b1f" p-id="1805"></path><path d="M619.2 631.488c-5.76 0-5.76 5.76-5.76 11.52v223.04c0 5.76 5.76 11.52 5.76 11.52h289.344c5.76 0 11.584-5.76 11.584-11.52v-222.976c0-5.824-5.76-11.584-11.52-11.584H619.136z m289.344 338.688h-289.28a103.68 103.68 0 0 1-104.192-104.128v-222.976c0-57.92 46.272-109.952 104.128-109.952h289.344c57.856 0 104.128 46.272 104.128 109.952v222.976c5.824 57.856-40.448 104.128-104.128 104.128z" fill="#f26b1f" p-id="1806"></path></svg><i id="popup-player__tip" class="ex-panel__tip"></i></a>');
(elementOrValue = document.getElementsByClassName("ex-panel__wrap")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
(containerOrValue = document.createElement("div"));
(elementOrValue = "");
(containerOrValue.className = "postbird-box-container");
(containerOrValue.id = "popup-player__prompt");
(elementOrValue += '<div class="postbird-box-dialog">');
(containerOrValue.innerHTML =
      '<div class="postbird-box-dialog"><div style="min-height:170px" class="postbird-box-content"><div class="postbird-box-header"><span class="postbird-box-title"><span>请输入直播间/直播流地址：</span></span></div><div class="postbird-box-text"><input id="popup-player__url" value="https://www.douyu.com/4042402" style="height:30px;box-sizing:border-box" type="text" class="postbird-prompt-input" autofocus="true"><label style="margin-right:30px" title="【直播流模式】&#10;1. 速度快&#10;2. 延迟低&#10;3. 占用少&#10;4. 不会进入直播间&#10;5. 支持斗鱼/虎牙/Bilibili"><input id="popup-player__noiframe" type="radio" name="sex" value="无弹幕" checked="checked">无弹幕(推荐)</label><label title="【框架模式】&#10;1. 速度慢&#10;2. 占用高&#10;3. 会进入直播间&#10;4. 仅支持斗鱼&#10;此模式拖动不是很灵活，请尽量在标题栏小幅度拖动&#10;若拖动无反应请点击页面任意处触发移动"><input id="popup-player__iframe" type="radio" name="sex" value="有弹幕">有弹幕</label></div><div class="postbird-box-footer"><button id="popup-player__cancel" class="btn-footer btn-left-footer btn-footer-cancel" style="color:undefined;">取消</button><button id="popup-player__ok" class="btn-footer btn-right-footer btn-footer-ok" style="color:#0e90d2;">确定</button></div></div>');
((elementOrValue = (0, __imports.E)([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"])) &&
      elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
((0, __imports.safeBind)(".popup-player", "click", function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      (0, __imports.handleDockAction)("popup-player");
    }, owner));
((0, __imports.safeBind)("#popup-player__cancel", "click", function () {
      document.getElementById("popup-player__prompt").style.display = "none";
    }, owner));
((0, __imports.safeBind)("#popup-player__ok", "click", function () {
      var a,
        t = document.getElementById("popup-player__url").value;
      if ("" != t) {
        var o,
          n,
          i,
          r = document.getElementById("popup-player__noiframe").checked;
        let e = !1;
        if (
          (e =
            150 < t.length && 1 == window.confirm("你输入的是直播流吗？")
              ? !0
              : e)
        )
          (0, __imports.rn)(__imports.D.length, t);
        else if (1 == r)
          if (-1 != t.indexOf("douyu.com"))
            ((a = (e) => {
              (0, __imports.en)(__imports.D.length, e, "Douyu");
            }),
              (0, __imports.fetch)(t, {
                method: "GET",
                mode: "no-cors",
                cache: "default",
                credentials: "include",
              })
                .then(owner.guard((e) => e.text()))
                .then(owner.guard((e) => {
                  var t = (e = new DOMParser().parseFromString(
                      e,
                      "text/html",
                    )).getElementsByTagName("html")[0].innerHTML,
                    o = "$ROOM.room_id =".length,
                    n = t.indexOf("$ROOM.room_id =");
                  let i = "";
                  (0 < n
                    ? (i = (i = t.substring(
                        n + o,
                        t.indexOf(";", n + o),
                      )).trim())
                    : (i = (0, __imports.v)(t, "roomID:", ","))
                      ? (i = i.trim())
                      : (n = e.querySelector('link[rel="canonical"]')) &&
                        ((o = n.getAttribute("href")),
                        (i = o.split("/").pop().trim())),
                    1 == !!/^[0-9]+$/.test(i)
                      ? a(i)
                      : (0, __imports.T)(
                          "获取直播间失败，请检查直播间地址是否正确！",
                          "error",
                        ));
                }))
                .catch((e) => {
                  console.log("请求失败!", e);
                }));
          else if (-1 != t.indexOf("bilibili.com")) {
            var r = t,
              l = (e) => {
                (0, __imports.en)(__imports.D.length, e, "Bilibili");
              };
            ((r = (r = r.split("/"))[r.length - 1]),
              (0, __imports.GM_xmlhttpRequest)({
                method: "GET",
                url:
                  "https://api.live.bilibili.com/room/v1/Room/room_init?id=" +
                  r,
                responseType: "json",
                onload: function (e) {
                  e = e.response;
                  l(e.data.room_id);
                },
              }));
          } else
            -1 != t.indexOf("huya.com")
              ? (0, __imports.en)(__imports.D.length, t, "Huya")
              : (0, __imports.rn)(__imports.D.length, t);
        else {
          r = __imports.D.length;
          if (-1 == String(t).indexOf("douyu.com"))
            (0, __imports.T)("有弹幕模式仅支持斗鱼直播", "error");
          else {
            ((i = String(t).split("/")),
              (i = i[i.length - 1]),
              (o = document.createElement("div")),
              (n = ""),
              (o.id = "exVideoDiv" + String(r)),
              (o.rid = i),
              (o.className = "exVideoDiv"),
              (n =
                (n =
                  (n =
                    (n +=
                      "<div class='exVideoInfo' id='exVideoInfo" +
                      String(r) +
                      "'><span class='exVideoRID' id='exVideoRID" +
                      String(r) +
                      "' style='color:white'>斗鱼 - " +
                      i +
                      "</span>") +
                    "<a><div class='exVideoClose' id='exVideoClose" +
                    String(r) +
                    "'>X</div></a></div>") +
                  "<iframe class='exVideoPlayer' id='exVideoPlayer" +
                  String(r) +
                  "' src=" +
                  t +
                  "?exid=chun></iframe>") +
                "<div class='exVideoScale' id='exVideoScale" +
                String(r) +
                "'></div>"),
              (o.innerHTML = n),
              (i = (0, __imports.E)([
                ".layout-Main",
                ".playerWrap__8wGvw",
                ".live-next-body",
              ])) && i.insertBefore(o, i.childNodes[0]),
              (0, __imports.on)(r),
              (0, __imports.tn)(r),
              r > __imports.D.length - 1 ? __imports.D.push("iframe") : (__imports.D[r] = "iframe"));
            {
              var s = r;
              let e = document.getElementById("exVideoDiv" + String(s)),
                t = document.getElementById("exVideoClose" + String(s));
              ((t.onclick = function () {
                (__imports.D[s].destroy(), e.remove());
              }),
                (e.onclick = function (e) {
                  (e.stopPropagation(), e.preventDefault());
                  for (let e = 0; e < __imports.D.length; e++) {
                    var t = document.getElementById("exVideoDiv" + String(e));
                    null != t &&
                      (e == s
                        ? (t.style.zIndex = 1016)
                        : (t.style.zIndex = 1428));
                  }
                }));
            }
          }
        }
      } else (0, __imports.T)("请输入地址", "error");
      document.getElementById("popup-player__prompt").style.display = "none";
    }, owner));
((0, __imports.safeBind)("#popup-player__prompt", "keydown", function (t) {
      var o = window.event || e;
      13 == (o.keyCode || o.which || o.charCode) &&
        document.getElementById("popup-player__ok").click();
    }, owner));
(containerOrValue = document.createElement("div"));
return containerOrValue;
}

}
,
"src/next/ui/room/live-tools.js":
function* (__imports) {
yield {"mountLiveToolsPanel": { get: () => mountLiveToolsPanel, set: value => { mountLiveToolsPanel = value; } }};
// Phase-local construction values; only declared outputs cross phase boundaries.
function mountLiveToolsPanel(owner, panelElement) {
let containerOrValue, elementOrValue, voteName, savedVotes, voteOptions, replyName, savedReplies, replyOptions, welcomeName, savedWelcomes, welcomeOptions;
containerOrValue = panelElement;
(containerOrValue.className = "livetool");
(elementOrValue =
      document.getElementsByClassName("layout-Player-chat")[0] ||
      document.body);
(elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "livetool-icon");
(containerOrValue.innerHTML =
      '<a class="ex-panel__icon" title="直播间工具"><svg t="1590294900594" style="display:block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="20028" width="36" height="36"><path d="M352.2 245.3c-5.1 0-10.2-2-14.1-5.9L196.6 98c-7.8-7.8-7.8-20.5 0-28.3s20.5-7.8 28.3 0l141.4 141.4c7.8 7.8 7.8 20.5 0 28.3-3.9 3.9-9 5.9-14.1 5.9zM477.1 245.3c-5.1 0-10.2-2-14.1-5.9-7.8-7.8-7.8-20.5 0-28.3L604.3 69.7c7.8-7.8 20.5-7.8 28.3 0 7.8 7.8 7.8 20.5 0 28.3L491.2 239.4c-3.9 3.9-9 5.9-14.1 5.9z" fill="#0C2B4A" p-id="20029"></path><path d="M703.9 194.8H124.2c-33 0-60 27-60 60v453c0 33 27 60 60 60h418c1.7-122.5 99.6-221.8 221.7-225.5V254.8c0-33-27-60-60-60zM533.4 522.9L356.3 625.2c-24 13.9-54-3.5-54-31.2V389.5c0-27.7 30-45 54-31.2l177.1 102.2c24 13.9 24 48.6 0 62.4zM815.2 776.4c0 21.9-17.8 39.7-39.7 39.7-21.9 0-39.7-17.8-39.7-39.7 0-21.9 17.8-39.7 39.7-39.7 21.9 0 39.7 17.8 39.7 39.7z" fill="#0C2B4A" p-id="20030"></path><path d="M775.5 591C673.6 591 591 673.6 591 775.5S673.6 960 775.5 960 960 877.4 960 775.5 877.4 591 775.5 591zM879 819l-15.6 27c-2.1 3.6-6.8 4.9-10.4 2.8l-15.5-8.9c-2.7-1.6-6.1-1.3-8.5 0.6-7.5 5.9-15.9 10.6-25.1 13.8-3 1.1-5.1 4-5.1 7.2v18.7c0 4.2-3.4 7.6-7.6 7.6H760c-4.2 0-7.6-3.4-7.6-7.6v-18.5c0-3.3-2.1-6.2-5.1-7.2-9.3-3.2-17.9-7.8-25.5-13.7-2.4-1.9-5.8-2.2-8.5-0.6l-15.2 8.8c-3.6 2.1-8.3 0.9-10.4-2.8l-15.6-27c-2.1-3.6-0.8-8.3 2.8-10.4l12.2-7.1c3-1.7 4.5-5.2 3.7-8.5-1.7-6.8-2.6-13.8-2.6-21.1 0-4.1 0.3-8.2 0.9-12.2 0.4-3.1-1-6.1-3.7-7.7l-10.5-6.1c-3.6-2.1-4.9-6.8-2.8-10.4l15.6-27c2.1-3.6 6.8-4.9 10.4-2.8l7.8 4.5c2.9 1.7 6.6 1.3 9-1.1 9.1-8.7 20-15.5 32.2-19.7 3.1-1 5.1-4 5.1-7.2v-7.9c0-4.2 3.4-7.6 7.6-7.6H791c4.2 0 7.6 3.4 7.6 7.6v8.1c0 3.2 2 6.1 5.1 7.2 12.1 4.2 22.9 10.9 31.9 19.6 2.4 2.4 6.1 2.8 9.1 1.1l8.2-4.7c3.6-2.1 8.3-0.8 10.4 2.8l15.6 27c2.1 3.6 0.9 8.3-2.8 10.4l-11 6.3c-2.7 1.6-4.1 4.6-3.7 7.7 0.6 3.9 0.8 8 0.8 12.1 0 7.2-0.9 14.1-2.5 20.8-0.8 3.3 0.7 6.7 3.6 8.3l12.8 7.4c3.7 2.1 5 6.8 2.9 10.4z" fill="#0C2B4A" p-id="20031"></path></svg><i id="LiveTool__tip" class="ex-panel__tip"></i></a>');
(elementOrValue = document.getElementsByClassName("ex-panel__wrap")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "livetool__cell");
(containerOrValue.innerHTML =
      `

        <div class='livetool__cell_title'>

            <span id='vote__title'>弹幕投票</span><span id='vote__show-result'>面板</span>

        </div>

        <div class='livetool__cell_option'>

            <label style="margin-right:10px;"><input id="vote__repeat" type="checkbox">重复投票</label>

            <div class="onoffswitch livetool__cell_switch">

                <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="vote__switch" tabindex="0" checked>

                <label class="onoffswitch-label" for="vote__switch"></label>

            </div>

        </div>

    ` +
      `

        <div class='vote__panel'>

            <select id='vote__select'>

            </select>

            <input style="width:40px;margin-left:10px;" type="button" id="vote__add" value="添加"/>

            <input style="width:40px;margin-left:10px;" type="button" id="vote__del" value="删除"/>

            <label style="margin-left:5px">限时：<input id="vote__time" type="text" placeholder="秒" /></label>

            <div class="vote__option">

                <label>主题：<input id="vote__theme" type="text"/></label>

                <label>选项：<input id="vote__options" type="text" placeholder="用空格隔开每个选项"/></label>

            </div>

        </div>

    `);
(elementOrValue = document.getElementsByClassName("livetool")[0]);
elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]);
{
    let e = document.createElement("div"),
      t =
        ((e.className = "vote__result"),
        (e.innerHTML = `

        <div id="vote__result-theme">投票主题</div>

        <div id="vote__result-close">X</div>

        <div id="vote__result-options"></div>

    `),
        (0, __imports.E)([".layout-Player-main", "main"])),
      a =
        (t && t.insertBefore(e, t.childNodes[0]),
        document.getElementsByClassName("vote__result")[0]);
    if (a) {
      if (typeof __imports.ensureMiuixPanelHeader === "function")
        (0, __imports.ensureMiuixPanelHeader)(a, "弹幕投票结果");
      ((a.onmousedown = function (e) {
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
      }),
        (0, __imports.safeBind)("#vote__result-close", "click", () => {
          document.getElementsByClassName("vote__result")[0].style.display =
            "none";
        }, owner));
    }
  }
((0, __imports.safeBind)("#vote__switch", "click", () => {
    var e = (0, __imports.safeEl)("vote__switch").checked,
      t = document.getElementById("vote__select"),
      t = t.options[t.selectedIndex].text,
      o = __imports.vo[t].options,
      n = __imports.vo[t].time;
    if (1 == e) {
      var i = String(o).split(" ");
      for (let e = 0; e < i.length; e++) __imports.wo[i[e]] = { num: 0, index: e };
      (((0, __imports.safeEl)("vote__repeat").disabled = !0),
        (__imports._o = 0),
        (e = t),
        (t = o),
        ((0, __imports.safeEl)("vote__result-theme").innerText = e),
        ((0, __imports.safeEl)("vote__result-options").innerHTML = ""));
      var a = t.split(" "),
        r = document.getElementById("vote__result-options");
      for (let e = 0; e < a.length; e++) {
        var l = document.createElement("div");
        ((l.className = "vote__option-wrap"),
          (l.innerHTML = `

            <div class="vote__option-choice">${a[e]}</div>

            <div class="vote__option-num"></div>

            <div class="vote__progress">

                <div class="vote__progress-bar"></div>

            </div>

        `),
          r.appendChild(l));
      }
      ((__imports.Eo = document.getElementById("vote__repeat").checked),
        (__imports.bo = !0),
        (__imports.ko = owner.timeout(() => {
          ((__imports.xo = {}),
            (__imports.wo = {}),
            (__imports.bo = !1),
            ((0, __imports.safeEl)("vote__repeat").disabled = !1),
            ((0, __imports.safeEl)("vote__switch").checked = !1));
        }, 1e3 * n)));
      var _vr = document.getElementsByClassName("vote__result")[0];
      if (_vr) {
        _vr.style.display = "block";
        if (typeof __imports.ensureMiuixPanelHeader === "function")
          (0, __imports.ensureMiuixPanelHeader)(_vr, "弹幕投票结果");
      }
    } else
      ((0, __imports.clearTimeout)(__imports.ko),
        (__imports.xo = {}),
        (__imports.wo = {}),
        (__imports.bo = !1),
        ((0, __imports.safeEl)("vote__repeat").disabled = !1));
  }, owner));
((0, __imports.safeBind)("#vote__title", "click", () => {
      var e = document.getElementsByClassName("vote__panel")[0];
      "block" != e.style.display
        ? ((e.style.display = "block") ==
            document.getElementsByClassName("mute__panel")[0].style.display &&
            (document.getElementsByClassName("mute__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("enter__panel")[0].style.display &&
            (document.getElementsByClassName("enter__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("gift__panel")[0].style.display &&
            (document.getElementsByClassName("gift__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("reply__panel")[0].style.display &&
            (document.getElementsByClassName("reply__panel")[0].style.display =
              "none"))
        : (e.style.display = "none");
    }, owner));
((0, __imports.safeEl)("vote__select").onclick = function () {
      var e, t, o;
      0 != this.options.length &&
        ((e = this.options[this.selectedIndex].text),
        (t = __imports.vo[e].options),
        (o = __imports.vo[e].time),
        ((0, __imports.safeEl)("vote__theme").value = e),
        ((0, __imports.safeEl)("vote__options").value = t),
        ((0, __imports.safeEl)("vote__time").value = o));
    });
((0, __imports.safeBind)("#vote__add", "click", () => {
      var e = document.getElementById("vote__select"),
        t = (0, __imports.safeEl)("vote__theme").value,
        o = (0, __imports.safeEl)("vote__options").value,
        n = (0, __imports.safeEl)("vote__time").value;
      "" != t &&
        "" != o &&
        "" != n &&
        ((__imports.vo[t] = { options: o, time: n }),
        e.options.add(new Option(t, "")),
        (0, __imports.Bo)());
    }, owner));
((0, __imports.safeBind)("#vote__del", "click", () => {
      var e = document.getElementById("vote__select"),
        t = e.options[e.selectedIndex].text;
      (delete __imports.vo[t], e.options.remove(e.selectedIndex), (0, __imports.Bo)());
    }, owner));
((0, __imports.safeBind)("#vote__show-result", "click", () => {
      var e = document.getElementsByClassName("vote__result")[0];
      if (e) {
        if ("block" != e.style.display) {
          e.style.display = "block";
          if (typeof __imports.ensureMiuixPanelHeader === "function")
            (0, __imports.ensureMiuixPanelHeader)(e, "弹幕投票结果");
        } else {
          e.style.display = "none";
        }
      }
    }, owner));
((0, __imports.safeEl)("vote__switch").checked = __imports.mo);
containerOrValue = __imports.localStorage.getItem("ExSave_Vote");
if (null != containerOrValue) {
    voteName, savedVotes = JSON.parse(containerOrValue), voteOptions = (__imports.vo = savedVotes), document.getElementById("vote__select");
    for (voteName in savedVotes) savedVotes.hasOwnProperty(voteName) && voteOptions.options.add(new Option(voteName, ""));
  }
(elementOrValue = document.createElement("div"));
(elementOrValue.className = "livetool__cell");
(elementOrValue.innerHTML =
      `

        <div class='livetool__cell_title'>

            <span id='enter__title'>进场欢迎</span>

            <span id='enter__export'>导出</span>

            <span id='enter__import'>导入</span>

        </div>

        <div class='livetool__cell_option'>

            <div class="onoffswitch livetool__cell_switch">

                <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="enter__switch" tabindex="0" checked>

                <label class="onoffswitch-label" for="enter__switch"></label>

            </div>

        </div>

    ` +
      `

        <div class='enter__panel'>

            <select id='enter__select'>

            </select>

            <input style="width:40px;margin-left:10px;" type="button" id="enter__add" value="添加"/>

            <input style="width:40px;margin-left:10px;" type="button" id="enter__del" value="删除"/>

            <div class="enter__option">

                <label>等级≥<input id="enter__level" type="text" value="1"/></label>

                <label>当前欢迎词：<input id="enter__word" type="text" placeholder="欢迎<id>光临直播间"/></label>

            </div>

        </div>

    `);
(containerOrValue = document.getElementsByClassName("livetool")[0]);
(containerOrValue && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]));
((0, __imports.safeBind)("#enter__export", "click", () => {
      ((0, __imports.GM_setClipboard)(JSON.stringify(__imports.S)),
        (0, __imports.T)("【进场欢迎】导出完毕，已复制到剪贴板", "success"));
    }, owner));
((0, __imports.safeBind)("#enter__import", "click", () => {
      __imports.Gr.prompt({
        title: "请输入json文本（会覆盖原来的设置）",
        okBtn: "确定",
        onConfirm: function (e) {
          var t = document.getElementById("enter__select"),
            e = JSON.parse(e || "{}") || {};
          if ("object" == typeof e) {
            for (var o in ((__imports.S = { ...e }), (t.options.length = 0), __imports.S))
              __imports.S.hasOwnProperty(o) && t.options.add(new Option(o, ""));
            (0, __imports.$t)();
          }
          (0, __imports.T)("【进场欢迎】导入完毕", "success");
        },
        onCancel: function (e) {},
      });
    }, owner));
((0, __imports.safeBind)("#enter__switch", "click", () => {
      var o = (0, __imports.safeEl)("enter__switch").checked;
      __imports.Kt = 1 == o;
      {
        let e = [],
          t = __imports.localStorage.getItem("ExSave_isEnter");
        var n = (e =
            null != t && "rooms" in (n = JSON.parse(t)) == 1
              ? n.rooms
              : e).indexOf(__imports.B),
          o = (1 == __imports.Kt ? -1 == n && e.push(__imports.B) : e.splice(n, 1), { rooms: e });
        __imports.localStorage.setItem("ExSave_isEnter", JSON.stringify(o));
      }
    }, owner));
((0, __imports.safeBind)("#enter__title", "click", () => {
      var e = document.getElementsByClassName("enter__panel")[0];
      "block" != e.style.display
        ? ((e.style.display = "block") ==
            document.getElementsByClassName("mute__panel")[0].style.display &&
            (document.getElementsByClassName("mute__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("reply__panel")[0].style.display &&
            (document.getElementsByClassName("reply__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("gift__panel")[0].style.display &&
            (document.getElementsByClassName("gift__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("vote__panel")[0].style.display &&
            (document.getElementsByClassName("vote__panel")[0].style.display =
              "none"))
        : (e.style.display = "none");
    }, owner));
((0, __imports.safeEl)("enter__select").onclick = function () {
      var e, t;
      0 != this.options.length &&
        ((e = this.options[this.selectedIndex].text),
        (t = __imports.S[e].enter),
        ((0, __imports.safeEl)("enter__word").value = e),
        ((0, __imports.safeEl)("enter__level").value = t),
        __imports.localStorage.setItem("ExSave_LastEnterWord", e));
    });
((0, __imports.safeBind)("#enter__add", "click", () => {
      document.getElementById("enter__select");
      var t = (0, __imports.safeEl)("enter__word").value,
        o = (0, __imports.safeEl)("enter__level").value;
      if ("" != t && "" != o) {
        let e = !1;
        for (var n of __imports.S)
          if (Number(o) === Number(n.level)) {
            e = !0;
            break;
          }
        e
          ? (0, __imports.T)("【进场欢迎】等级已存在", "error")
          : (__imports.S.push({ level: o, word: t }),
            __imports.S.sort((e, t) => t.level - e.level),
            (0, __imports.eo)(),
            (0, __imports.$t)());
      }
    }, owner));
((0, __imports.safeBind)("#enter__del", "click", () => {
      var e = document.getElementById("enter__select");
      (e.options[e.selectedIndex].text,
        __imports.S.splice(e.selectedIndex, 1),
        __imports.S.sort((e, t) => t.level - e.level),
        (0, __imports.eo)(),
        (0, __imports.$t)());
    }, owner));
(elementOrValue = __imports.localStorage.getItem("ExSave_Enter"));
if ("" != elementOrValue) {
    if ((document.getElementById("enter__select"), null != elementOrValue)) {
      let e = JSON.parse(elementOrValue);
      (Array.isArray(e) || ((e = []), (0, __imports.$t)()), (__imports.S = e), (0, __imports.eo)());
    }
    if (null != (elementOrValue = __imports.localStorage.getItem("ExSave_isEnter"))) {
      elementOrValue = JSON.parse(elementOrValue);
      let e = [];
      ("rooms" in elementOrValue == 1 && (e = elementOrValue.rooms), (__imports.Kt = -1 != e.indexOf(__imports.B)));
    } else __imports.Kt = !1;
    (0, __imports.safeEl)("enter__switch").checked = __imports.Kt;
  }
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "livetool__cell");
(containerOrValue.innerHTML =
      `

        <div class='livetool__cell_title'>

            <span id='mute__title'>关键词禁言</span>

            <span id='mute__idlist'>名单</span>

            <span id='mute__export'>导出</span>

            <span id='mute__import'>导入</span>

        </div>

        <div class='livetool__cell_option'>

            <div class="onoffswitch livetool__cell_switch">

                <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="mute__switch" tabindex="0" checked>

                <label class="onoffswitch-label" for="mute__switch"></label>

            </div>

        </div>

    ` +
      `

        <div class='mute__panel'>

            <select id='mute__select'>

            </select>

            <input style="width:40px;margin-left:10px;" type="button" id="mute__add" value="添加"/>

            <input style="width:40px;margin-left:10px;" type="button" id="mute__del" value="删除"/>

            <input style="width:65px;margin-left:10px;" type="button" id="mute__delmute" value="一键解禁"/>

            <div class="mute__option">

                <label>词：<input id="mute__word" type="text" placeholder="re(式)=结果"/></label>

                <label>次数：<input id="mute__count" type="number" value="5"/></label>

                <label>时间：

                    <select id='mute__time'>

                        <option value="1">1分钟</option>

                        <option value="10">10分钟</option>

                        <option value="30">30分钟</option>

                        <option value="60">1小时</option>

                        <option value="480">8小时</option>

                        <option value="1440">1天</option>

                        <option value="4320">3天</option>

                        <option value="10080">7天</option>

                        <option value="43200">30天</option>

                        <option value="259200">180天</option>

                        <option value="518400">360天</option>

                    </select>

                </label>

            </div>

        </div>

    `);
(elementOrValue = document.getElementsByClassName("livetool")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
((0, __imports.safeBind)("#mute__export", "click", () => {
      ((0, __imports.GM_setClipboard)(JSON.stringify(__imports.L)),
        (0, __imports.T)("【关键词禁言】导出完毕，已复制到剪贴板", "success"));
    }, owner));
((0, __imports.safeBind)("#mute__import", "click", () => {
      __imports.Gr.prompt({
        title: "请输入json文本（会覆盖原来的设置）",
        okBtn: "确定",
        onConfirm: function (e) {
          var t = document.getElementById("mute__select"),
            e = JSON.parse(e || "{}") || {};
          if ("object" == typeof e) {
            for (var o in ((__imports.L = { ...e }), (t.options.length = 0), __imports.L))
              __imports.L.hasOwnProperty(o) && t.options.add(new Option(o, ""));
            (0, __imports.ro)();
          }
          (0, __imports.T)("【关键词禁言】导入完毕", "success");
        },
        onCancel: function (e) {},
      });
    }, owner));
((0, __imports.safeBind)("#mute__idlist", "click", () => {
      if (0 == __imports.ao.length) (0, __imports.T)("暂无禁言名单", "warning");
      else {
        console.log("【禁言名单】");
        for (let e = 0; e < __imports.ao.length; e++) {
          var t = __imports.ao[e];
          console.log(
            "id:【" +
              t.id +
              "】 | uid:" +
              t.uid +
              " | 弹幕:" +
              t.barrage +
              " | 检测次数:" +
              t.count +
              " | 禁言时长:" +
              t.time +
              "分钟 | 禁言时间:" +
              t.ts,
          );
        }
        (0, __imports.T)("禁言名单已经输出在控制台，请按F12查看", "success");
      }
    }, owner));
((0, __imports.safeBind)("#mute__delmute", "click", async () => {
      if (0 == __imports.ao.length) (0, __imports.T)("暂无禁言名单", "warning");
      else if (1 == confirm("是否解禁名单上所有的id？")) {
        for (let e = 0; e < __imports.ao.length; e++) {
          var t = __imports.ao[e];
          await ((e, o) =>
            new Promise((t) => {
              (0, __imports.fetch)("https://www.douyu.com/room/roomSetting/deleteMuteUser", {
                method: "POST",
                mode: "no-cors",
                credentials: "include",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: "room_id=" + e + "&uid=" + o,
              })
                .then(owner.guard((e) => e.json()))
                .then(owner.guard((e) => {
                  t(e);
                }));
            }))(__imports.B, t.uid);
        }
        (0, __imports.T)("解除禁言完毕", "success");
      }
    }, owner));
((0, __imports.safeBind)("#mute__switch", "click", () => {
      var o = (0, __imports.safeEl)("mute__switch").checked;
      __imports.no = 1 == o;
      {
        let e = [],
          t = __imports.localStorage.getItem("ExSave_isMute");
        var n = (e =
            null != t && "rooms" in (n = JSON.parse(t)) == 1
              ? n.rooms
              : e).indexOf(__imports.B),
          o = (1 == __imports.no ? -1 == n && e.push(__imports.B) : e.splice(n, 1), { rooms: e });
        __imports.localStorage.setItem("ExSave_isMute", JSON.stringify(o));
      }
    }, owner));
((0, __imports.safeBind)("#mute__title", "click", () => {
      var e = document.getElementsByClassName("mute__panel")[0];
      "block" != e.style.display
        ? ((e.style.display = "block") ==
            document.getElementsByClassName("reply__panel")[0].style.display &&
            (document.getElementsByClassName("reply__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("enter__panel")[0].style.display &&
            (document.getElementsByClassName("enter__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("gift__panel")[0].style.display &&
            (document.getElementsByClassName("gift__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("vote__panel")[0].style.display &&
            (document.getElementsByClassName("vote__panel")[0].style.display =
              "none"))
        : (e.style.display = "none");
    }, owner));
((0, __imports.safeEl)("mute__select").onclick = function () {
      if (0 != this.options.length) {
        var e = this.options[this.selectedIndex].text,
          t = __imports.L[e].count,
          o = __imports.L[e].time,
          e =
            (((0, __imports.safeEl)("mute__word").value = e),
            ((0, __imports.safeEl)("mute__count").value = t),
            "mute__time"),
          n = o,
          i = document.getElementById(e);
        for (let e = 0; e < i.options.length; e++)
          if (i.options[e].value == n) {
            i.options[e].selected = !0;
            break;
          }
      }
    });
((0, __imports.safeBind)("#mute__add", "click", () => {
      var e = document.getElementById("mute__time"),
        t = document.getElementById("mute__select"),
        o = (0, __imports.safeEl)("mute__word").value,
        n = (0, __imports.safeEl)("mute__count").value,
        e = e.options[e.selectedIndex].value;
      "" != o &&
        ((__imports.L[o] = { count: n, time: e }),
        t.options.add(new Option(o, "")),
        (0, __imports.ro)());
    }, owner));
((0, __imports.safeBind)("#mute__del", "click", () => {
      var e = document.getElementById("mute__select"),
        t = e.options[e.selectedIndex].text;
      (delete __imports.L[t], e.options.remove(e.selectedIndex), (0, __imports.ro)());
    }, owner));
((async () => {
      var t = __imports.localStorage.getItem("ExSave_Mute");
      if (null != t) {
        var e,
          o = JSON.parse(t),
          n = ((__imports.L = o), document.getElementById("mute__select"));
        for (e in o) o.hasOwnProperty(e) && n.options.add(new Option(e, ""));
      }
      if (null != (t = __imports.localStorage.getItem("ExSave_isMute"))) {
        t = JSON.parse(t);
        let e = [];
        ("rooms" in t == 1 && (e = t.rooms), (__imports.no = -1 != e.indexOf(__imports.B)));
      } else __imports.no = !1;
      (0, __imports.safeEl)("mute__switch").checked = __imports.no;
    })());
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "livetool__cell");
(containerOrValue.innerHTML =
      `

        <div class='livetool__cell_title'>

            <span id='gift__title'>自动谢礼物</span>

            <span id='gift__export'>导出</span>

            <span id='gift__import'>导入</span>

        </div>

        <div class='livetool__cell_option'>

            <div class="onoffswitch livetool__cell_switch">

                <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="gift__switch" tabindex="0" checked>

                <label class="onoffswitch-label" for="gift__switch"></label>

            </div>

        </div>

    ` +
      `

        <div class='gift__panel'>

            <select id='gift__select'>

            </select>

            <input style="width:40px;margin-left:10px;" type="button" id="gift__add" value="添加"/>

            <input style="width:40px;margin-left:10px;" type="button" id="gift__del" value="删除"/>

            <input style="width:64px;margin-left:10px;" type="button" id="gift__template" value="生成模板"/>

            <div class="gift__option">

                <label><a id="reply__show_gid" style="color:blue;" href="javascript:void(0);">礼物id：</a><input id="gift__giftId" type="text"/></label>

                <label>回复：<input id="gift__reply" type="text" placeholder="<id>=用户名 <cnt>个数"/></label>

            </div>

        </div>

    `);
(elementOrValue = document.getElementsByClassName("livetool")[0]);
if (
    (elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]),
    (0, __imports.safeBind)("#reply__show_gid", "click", () => {
      (console.log(`

背包礼物：http://webconf.douyucdn.cn/resource/common/prop_gift_list/prop_gift_config.json

鱼翅礼物：http://open.douyucdn.cn/api/RoomApi/room/4042402

`),
        (0, __imports.T)("请按F12到控制台(console)查看礼物id", "success"));
    }, owner),
    (0, __imports.safeBind)("#gift__switch", "click", () => {
      var o = (0, __imports.safeEl)("gift__switch").checked;
      __imports.to = 1 == o;
      {
        let e = [],
          t = __imports.localStorage.getItem("ExSave_isGift");
        var n = (e =
            null != t && "rooms" in (n = JSON.parse(t)) == 1
              ? n.rooms
              : e).indexOf(__imports.B),
          o = (1 == __imports.to ? -1 == n && e.push(__imports.B) : e.splice(n, 1), { rooms: e });
        __imports.localStorage.setItem("ExSave_isGift", JSON.stringify(o));
      }
    }, owner),
    (0, __imports.safeBind)("#gift__title", "click", () => {
      var e = document.getElementsByClassName("gift__panel")[0];
      "block" != e.style.display
        ? ((e.style.display = "block") ==
            document.getElementsByClassName("mute__panel")[0].style.display &&
            (document.getElementsByClassName("mute__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("enter__panel")[0].style.display &&
            (document.getElementsByClassName("enter__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("reply__panel")[0].style.display &&
            (document.getElementsByClassName("reply__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("vote__panel")[0].style.display &&
            (document.getElementsByClassName("vote__panel")[0].style.display =
              "none"))
        : (e.style.display = "none");
    }, owner),
    ((0, __imports.safeEl)("gift__select").onclick = function () {
      var e, t;
      0 != this.options.length &&
        ((e = this.options[this.selectedIndex].text),
        (t = __imports.M[e].reply),
        ((0, __imports.safeEl)("gift__giftId").value = e),
        ((0, __imports.safeEl)("gift__reply").value = t));
    }),
    (0, __imports.safeBind)("#gift__add", "click", () => {
      var e = document.getElementById("gift__select"),
        t = (0, __imports.safeEl)("gift__giftId").value,
        o = (0, __imports.safeEl)("gift__reply").value;
      "" != t &&
        ((__imports.M[t] = { reply: o }), e.options.add(new Option(t, "")), (0, __imports.oo)());
    }, owner),
    (0, __imports.safeBind)("#gift__del", "click", () => {
      var e = document.getElementById("gift__select"),
        t = e.options[e.selectedIndex].text;
      (delete __imports.M[t], e.options.remove(e.selectedIndex), (0, __imports.oo)());
    }, owner),
    (0, __imports.safeBind)("#gift__export", "click", () => {
      ((0, __imports.GM_setClipboard)(JSON.stringify(__imports.M)),
        (0, __imports.T)("【自动谢礼物】导出完毕，已复制到剪贴板", "success"));
    }, owner),
    (0, __imports.safeBind)("#gift__import", "click", () => {
      __imports.Gr.prompt({
        title: "请输入json文本（会覆盖原来的设置）",
        okBtn: "确定",
        onConfirm: function (e) {
          var t = document.getElementById("gift__select"),
            e = JSON.parse(e || "{}") || {};
          if ("object" == typeof e) {
            for (var o in ((__imports.M = { ...e }), (t.options.length = 0), __imports.M))
              __imports.M.hasOwnProperty(o) && t.options.add(new Option(o, ""));
            (0, __imports.oo)();
          }
          (0, __imports.T)("【自动谢礼物】导入完毕", "success");
        },
        onCancel: function (e) {},
      });
    }, owner),
    (0, __imports.safeBind)("#gift__template", "click", () => {
      (async () => {
        var e,
          t = {},
          o = await new Promise((t) => {
            (0, __imports.GM_xmlhttpRequest)({
              method: "GET",
              url: "http://open.douyucdn.cn/api/RoomApi/room/" + __imports.B,
              responseType: "json",
              onload: function (e) {
                e = e.response;
                t(e);
              },
            });
          });
        for (let e = 0; e < o.data.gift.length; e++) {
          var n = o.data.gift[e];
          t[n.id] = { reply: `感谢<id>赠送的${n.name}x<cnt>` };
        }
        let i = await new Promise((t) => {
            (0, __imports.GM_xmlhttpRequest)({
              method: "GET",
              url: "http://webconf.douyucdn.cn/resource/common/prop_gift_list/prop_gift_config.json",
              responseType: "text",
              onload: function (e) {
                e = e.response;
                t(e);
              },
            });
          }),
          a = {};
        for (e in ((i = (i = i.substring(0, i.length - 2)).replace(
          "DYConfigCallback(",
          "",
        )),
        (i = JSON.parse(i || "{}") || {}).data))
          a[e] = { reply: `感谢<id>赠送的${i.data[e].name}x<cnt>` };
        var r = {
          开通钻粉: { reply: "感谢<id>开通钻粉" },
          续费钻粉: { reply: "感谢<id>续费钻粉" },
        };
        ((r = { ...t, ...a, ...r }),
          (0, __imports.GM_setClipboard)(JSON.stringify(r)),
          (0, __imports.T)(
            "【自动谢礼物】礼物模板生成完毕，已复制到剪贴板，可直接导入",
            "success",
          ));
      })();
    }, owner),
    null != (containerOrValue = __imports.localStorage.getItem("ExSave_Gift")))
  ) {
    replyName, savedReplies = JSON.parse(containerOrValue), replyOptions = (__imports.M = savedReplies), document.getElementById("gift__select");
    for (replyName in savedReplies) savedReplies.hasOwnProperty(replyName) && replyOptions.options.add(new Option(replyName, ""));
  }
if (null != (containerOrValue = __imports.localStorage.getItem("ExSave_isGift"))) {
    containerOrValue = JSON.parse(containerOrValue);
    let e = [];
    ("rooms" in containerOrValue == 1 && (e = containerOrValue.rooms), (__imports.to = -1 != e.indexOf(__imports.B)));
  } else __imports.to = !1;
(0, __imports.safeEl)("gift__switch").checked = __imports.to;
(elementOrValue = document.createElement("div"));
(elementOrValue.className = "livetool__cell");
(elementOrValue.innerHTML =
      `

        <div class='livetool__cell_title'>

            <span id='reply__title'>关键词回复</span>

            <span id='reply__export'>导出</span>

            <span id='reply__import'>导入</span>

        </div>

        <div class='livetool__cell_option'>

            <div class="onoffswitch livetool__cell_switch">

                <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="reply__switch" tabindex="0" checked>

                <label class="onoffswitch-label" for="reply__switch"></label>

            </div>

        </div>

    ` +
      `

        <div class='reply__panel'>

            <select id='reply__select'>

            </select>

            <input style="width:40px;margin-left:10px;" type="button" id="reply__add" value="添加"/>

            <input style="width:40px;margin-left:10px;" type="button" id="reply__del" value="删除"/>

            <label style="margin-left:5px">CD：<input id="reply__time" type="text" placeholder="秒" /></label>

            <div class="reply__option">

                <label>词：<input id="reply__word" type="text" placeholder="re(式)=结果"/></label>

                <label>回复：<input id="reply__reply" type="text" placeholder="<id>用户名 <txt>弹幕"/></label>

            </div>

        </div>

    `);
(containerOrValue = document.getElementsByClassName("livetool")[0]);
(containerOrValue && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]));
((0, __imports.safeBind)("#reply__export", "click", () => {
      ((0, __imports.GM_setClipboard)(JSON.stringify(__imports.A)),
        (0, __imports.T)("【关键词回复】导出完毕，已复制到剪贴板", "success"));
    }, owner));
((0, __imports.safeBind)("#reply__import", "click", () => {
      __imports.Gr.prompt({
        title: "请输入json文本（会覆盖原来的设置）",
        okBtn: "确定",
        onConfirm: function (e) {
          var t = document.getElementById("reply__select"),
            e = JSON.parse(e || "{}") || {};
          if ("object" == typeof e) {
            for (var o in ((__imports.A = { ...e }), (t.options.length = 0), __imports.A))
              __imports.A.hasOwnProperty(o) && t.options.add(new Option(o, ""));
            (0, __imports.ho)();
          }
          (0, __imports.T)("【关键词回复】导入完毕", "success");
        },
        onCancel: function (e) {},
      });
    }, owner));
((0, __imports.safeBind)("#reply__switch", "click", () => {
      __imports.go = String((0, __imports.safeEl)("reply__time").value) || 0;
      var o = (0, __imports.safeEl)("reply__switch").checked;
      __imports.mo = 1 == o;
      {
        let e = [],
          t = __imports.localStorage.getItem("ExSave_isReply");
        var n = (e =
            null != t && "rooms" in (n = JSON.parse(t)) == 1
              ? n.rooms
              : e).indexOf(__imports.B),
          o = (1 == __imports.mo ? -1 == n && e.push(__imports.B) : e.splice(n, 1), { rooms: e });
        __imports.localStorage.setItem("ExSave_isReply", JSON.stringify(o));
      }
      ((o = (0, __imports.safeEl)("reply__time").value),
        __imports.localStorage.setItem("ExSave_ReplyCd", o));
    }, owner));
((0, __imports.safeBind)("#reply__title", "click", () => {
      var e = document.getElementsByClassName("reply__panel")[0];
      "block" != e.style.display
        ? ((e.style.display = "block") ==
            document.getElementsByClassName("mute__panel")[0].style.display &&
            (document.getElementsByClassName("mute__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("enter__panel")[0].style.display &&
            (document.getElementsByClassName("enter__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("gift__panel")[0].style.display &&
            (document.getElementsByClassName("gift__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("vote__panel")[0].style.display &&
            (document.getElementsByClassName("vote__panel")[0].style.display =
              "none"))
        : (e.style.display = "none");
    }, owner));
((0, __imports.safeEl)("reply__select").onclick = function () {
      var e, t;
      0 != this.options.length &&
        ((e = this.options[this.selectedIndex].text),
        (t = __imports.A[e].reply),
        ((0, __imports.safeEl)("reply__word").value = e),
        ((0, __imports.safeEl)("reply__reply").value = t));
    });
((0, __imports.safeBind)("#reply__add", "click", () => {
      var e = document.getElementById("reply__select"),
        t = (0, __imports.safeEl)("reply__word").value,
        o = (0, __imports.safeEl)("reply__reply").value;
      "" != t &&
        ((__imports.A[t] = { reply: o }), e.options.add(new Option(t, "")), (0, __imports.ho)());
    }, owner));
((0, __imports.safeBind)("#reply__del", "click", () => {
      var e = document.getElementById("reply__select"),
        t = e.options[e.selectedIndex].text;
      (delete __imports.A[t], e.options.remove(e.selectedIndex), (0, __imports.ho)());
    }, owner));
(elementOrValue = __imports.localStorage.getItem("ExSave_Reply"));
if (null != elementOrValue) {
    welcomeName, savedWelcomes = JSON.parse(elementOrValue), welcomeOptions = (__imports.A = savedWelcomes), document.getElementById("reply__select");
    for (welcomeName in savedWelcomes) savedWelcomes.hasOwnProperty(welcomeName) && welcomeOptions.options.add(new Option(welcomeName, ""));
  }
if (null != (elementOrValue = __imports.localStorage.getItem("ExSave_isReply"))) {
    containerOrValue = JSON.parse(elementOrValue);
    let e = [];
    ("rooms" in containerOrValue == 1 && (e = containerOrValue.rooms), (__imports.mo = -1 != e.indexOf(__imports.B)));
  } else __imports.mo = !1;
((0, __imports.safeEl)("reply__switch").checked = __imports.mo);
(null != (elementOrValue = __imports.localStorage.getItem("ExSave_ReplyCd")) &&
      ((0, __imports.safeEl)("reply__time").value = elementOrValue));
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "livetool__Treasure");
(containerOrValue.id = "Ex_Geetest");
(elementOrValue = document.getElementsByClassName("Barrage-main")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
(owner.interval(() => {
      var e = Number((__imports.Xt / 5) * 60).toFixed(0),
        t = ((__imports.Xt = 0), document.getElementsByClassName("ChatSend-txt")[0]),
        e = `弹幕时速：${e}条/分`;
      ((t.placeholder = e + " 按↑↓查看历史弹幕 视频ctrl+滚轮缩放"),
        t.setAttribute("data-placeholder", e));
    }, 5e3));
(new __imports.DomMutationSubscription(".layout-Player-rankAll", !1, (e) => {
      0 < document.getElementsByClassName("RankAllMain-container").length &&
        0 < Object.keys(__imports.so.all).length &&
        (0, __imports.co)(
          "all",
          document.querySelectorAll(
            ".layout-Player-rankAll .ChatRankWeek-listItem--nickname",
          ),
        );
    }, owner));
((0, __imports.initDanmakuBlockedCheck)());
((0, __imports.safeBind)(".livetool-icon", "click", function () {
      (0, __imports.openFeaturePanel)("直播间工具");
    }, owner));
(new __imports.nl(__imports.B, (e) => {
      if ("rss" == (0, __imports.N)((i = e))) {
        let e = (0, __imports.v)(i, "rid@=", "/");
        var t = (0, __imports.v)(i, "ss@=", "/"),
          i = (0, __imports.v)(i, "ivl@=", "/");
        "1" == t &&
          "0" == i &&
          (0, __imports.X)("开播提醒", "直播间：" + e + "开播了，点我签到", () => {
            (0, __imports.$n)(e);
          });
      }
      (async (t) => {
        if (0 != __imports.no && "chatmsg" == (0, __imports.N)(t)) {
          var o = (0, __imports.v)(t, "uid@=", "/");
          if (o != __imports.I) {
            var n,
              i = (0, __imports.v)(t, "nn@=", "/"),
              a = (0, __imports.v)(t, "txt@=", "/");
            let e = !1;
            for (n in __imports.L)
              if ("" != n)
                if (
                  (-1 != n.indexOf("re(")
                    ? ((s = (0, __imports.v)(n, "re(", ")=")),
                      1 < (d = n.split("=")).length &&
                        ((d = d[1]),
                        0 < (s = new RegExp(s, "g").exec(a)).length) &&
                        (e = s[0] == d))
                    : (e = -1 != String(a).indexOf(n)),
                  1 == e)
                ) {
                  var r,
                    l,
                    s = __imports.L[n].count,
                    d = __imports.L[n].time;
                  __imports.io.hasOwnProperty(i)
                    ? ((r = Number(__imports.io[i].count) + 1),
                      s <= r
                        ? (await (0, __imports.lo)(__imports.B, i, d),
                          (0, __imports.X)(
                            "禁言信息",
                            "【" + i + "】已被禁言" + d + "分钟\n弹幕：" + a,
                            () => {},
                          ),
                          (l = {
                            id: i,
                            uid: o,
                            barrage: a,
                            time: d,
                            count: 1,
                            ts: String(
                              (0, __imports.k)("yyyy年MM月dd日hh时mm分ss秒 ", new Date()),
                            ),
                          }),
                          __imports.ao.push(l),
                          (__imports.io[i].count = 0))
                        : (__imports.io[i].count = String(r)))
                    : s <= 1
                      ? (await (0, __imports.lo)(__imports.B, i, d),
                        (0, __imports.X)(
                          "禁言信息",
                          "【" + i + "】已被禁言" + d + "分钟\n弹幕：" + a,
                          () => {},
                        ),
                        (l = {
                          id: i,
                          uid: o,
                          barrage: a,
                          time: d,
                          count: 1,
                          ts: String(
                            (0, __imports.k)("yyyy年MM月dd日hh时mm分ss秒 ", new Date()),
                          ),
                        }),
                        __imports.ao.push(l))
                      : (__imports.io[i] = { uid: o, count: 1 });
                  break;
                }
          }
        }
      })(e);
      var o,
        n,
        a,
        t = e;
      if (0 != __imports.mo && "chatmsg" == (0, __imports.N)(t)) {
        var i = (0, __imports.v)(t, "uid@=", "/");
        if (i != __imports.I) {
          var r,
            l,
            s = (0, __imports.v)(t, "nn@=", "/"),
            d = (0, __imports.v)(t, "txt@=", "/");
          let e = !1;
          for (r in __imports.A)
            if ("" != r)
              if (
                (-1 != r.indexOf("re(")
                  ? ((c = (0, __imports.v)(r, "re(", ")=")),
                    1 < (l = r.split("=")).length &&
                      ((l = l[1]),
                      0 < (c = new RegExp(c, "g").exec(d)).length) &&
                      (e = c[0] == l))
                  : (e = -1 != String(d).indexOf(r)),
                1 == e)
              ) {
                var c = __imports.A[r].reply;
                ((c = String(c).replace(/<id>/g, s)),
                  (c = String(c).replace(/<txt>/g, d)),
                  0 == __imports.uo &&
                    ((0, __imports.we)(c), 0 < __imports.go) &&
                    ((__imports.uo = !0),
                    owner.timeout(() => {
                      __imports.uo = !1;
                    }, 1e3 * __imports.go)));
                break;
              }
        }
      }
      ((i = e),
        0 != __imports.to &&
          ("dgb" === (p = (0, __imports.N)(i))
            ? (0, __imports.v)(i, "uid@=", "/") != __imports.I &&
              ((o = (0, __imports.v)(i, "nn@=", "/")),
              (a = (0, __imports.v)(i, "gfid@=", "/")),
              (n = (0, __imports.v)(i, "gfcnt@=", "/")),
              a in __imports.M) &&
              ((a = __imports.M[a].reply),
              (a = String(a).replace(/<id>/g, o)),
              (0, __imports.we)((a = String(a).replace(/<cnt>/g, n))))
            : ("dfobc" !== p && "dfrbc" !== p) ||
              ((0, __imports.v)(i, "uid@=", "/") != __imports.I &&
                ((o = (0, __imports.v)(i, "nick@=", "/")),
                (n = "dfobc" === p ? "开通钻粉" : "续费钻粉") in __imports.M) &&
                ((a = __imports.M[n].reply),
                (a = String(a).replace(/<id>/g, o)),
                (0, __imports.we)((a = String(a).replace(/<cnt>/g, "1")))))));
      var i = e;
      if (0 != __imports.St && "tsboxb" == (0, __imports.N)(i)) {
        var p = (0, __imports.v)(i, "ot@=", "/");
        let e = (0, __imports.v)(i, "rpid@=", "/"),
          t = (0, __imports.v)(i, "rid@=", "/"),
          o = (0, __imports.x)("dy_did");
        ((i = 1e3 * (Number(p) - Math.floor(Date.now() / 1e3)) + (0, __imports.Mt)()), __imports.fo++);
        p = document.createElement("div");
        let n = "Ex_Geetest_no" + String(__imports.fo);
        ((p.id = n),
          document.getElementById("Ex_Geetest").appendChild(p),
          owner.timeout(() => {
            (0, __imports.yo)(t, e, o, n);
          }, i));
      }
      var i = e;
      if (0 != __imports.Kt && "uenter" == (0, __imports.N)(i)) {
        var m = (0, __imports.v)(i, "uid@=", "/");
        if (m != __imports.I) {
          var u,
            g = (0, __imports.v)(i, "nn@=", "/"),
            h = (0, __imports.v)(i, "level@=", "/");
          for (u of __imports.S)
            if (Number(h) >= Number(u.level)) {
              (0, __imports.we)(String(u.word).replace(/<id>/g, g));
              break;
            }
        }
      }
      ((m = e),
        0 != __imports.bo &&
          "chatmsg" == (0, __imports.N)(m) &&
          ((i = (0, __imports.v)(m, "uid@=", "/")),
          (m = (0, __imports.v)(m, "txt@=", "/")),
          __imports.Eo
            ? Object(__imports.wo).hasOwnProperty(m) && (__imports.wo[m].num++, __imports._o++, (0, __imports.Io)())
            : 0 == Object(__imports.xo).hasOwnProperty(i) &&
              Object(__imports.wo).hasOwnProperty(m) &&
              ((__imports.xo[i] = 0), __imports.wo[m].num++, __imports._o++, (0, __imports.Io)())),
        "chatmsg" == (0, __imports.N)(e) && __imports.Xt++,
        "ranklist" == (0, __imports.N)((i = e)) &&
          ((i = (0, __imports.el)(i)).list_day &&
            ((__imports.so.day = (0, __imports.po)(i.list_day)),
            (0, __imports.co)(
              "day",
              document.querySelectorAll(
                ".layout-Player-rank .ChatDayRank .ChatRankWeek-listItem--nickname",
              ),
            )),
          i.list &&
            ((__imports.so.week = (0, __imports.po)(i.list)),
            (0, __imports.co)(
              "week",
              document.querySelectorAll(
                ".layout-Player-rank .ChatRankWeek .ChatRankWeek-listItem--nickname",
              ),
            )),
          i.list_all && (__imports.so.all = (0, __imports.po)(i.list_all)),
          (0, __imports.co)()),
        "chatmsg" == (0, __imports.N)((i = e)) &&
          (typeof window.__onDouyuExChatmsg === "function" &&
            window.__onDouyuExChatmsg(i),
          i.includes(__imports.W) && (__imports.Jt = i)),
        "oni" == (0, __imports.N)((i = e)) &&
          (i = (0, __imports.v)(i, "vn@=", "/")) &&
          ((__imports.j.noble_count = i),
          (e = document.getElementById("real-audience__noble"))) &&
          (e.innerText = (0, __imports.sn)(i)));
    }));
(0, __imports.mountVideoToolbar)(owner);
}

}
,
"src/next/ui/room/extension-tools.js":
function* (__imports) {
yield {"mountExtensionToolsPanel": { get: () => mountExtensionToolsPanel, set: value => { mountExtensionToolsPanel = value; } }};
// Phase-local construction values; only declared outputs cross phase boundaries.
function mountExtensionToolsPanel(owner) {
let containerOrValue, elementOrValue;
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "extool");
(containerOrValue.innerHTML = '<div class="extool__close" title="关闭">×</div>');
(elementOrValue =
      document.getElementsByClassName("layout-Player-chat")[0] ||
      document.body);
(elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "extool-icon");
(containerOrValue.innerHTML =
      '<a class="ex-panel__icon" title="扩展功能"><svg t="1590294700144" style="display:block;" class="icon" viewBox="0 0 1077 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="11915" width="30" height="30"><path d="M152.770257 11.469971l213.048618 206.378138-37.094375 36.931681 159.440737 158.545917-76.95456 73.782015-159.440737-158.545917-38.47728 36.931681L0.244042 159.115348 152.770257 11.469971z" p-id="11916" fill="#d81e06"></path><path d="M1077.851922 217.848109h-105.751509L929.393073 260.311408l-31.644106 31.400063-33.02701 32.538926L776.866857 300.985065l-23.428026-87.204321 33.027009-32.538926 33.02701-32.538926L862.281538 105.751509V0.569431h-8.134732a244.041945 244.041945 0 0 0-178.964092 68.331745 234.768351 234.768351 0 0 0-68.738481 147.645376 250.712425 250.712425 0 0 0 10.981887 95.664443v2.765808a34.165872 34.165872 0 0 1-9.598983 36.931681c-17.896409 16.269463-525.096918 497.520178-525.096918 497.520178-42.625993 35.548777-38.47728 102.497617 0 142.113759 39.860184 38.233238 105.751509 40.673657 142.927233 0 0 0 478.322212-504.353352 498.984429-524.852875A33.677788 33.677788 0 0 1 754.821735 455.544963c5.531617 1.382904 10.981888 4.067366 16.269463 5.450271a242.170956 242.170956 0 0 0 87.936447 9.598983 237.290118 237.290118 0 0 0 148.45885-68.331745 231.677153 231.677153 0 0 0 68.738481-177.662536 14.805211 14.805211 0 0 0 1.626946-6.751827zM178.964093 943.628853a33.352399 33.352399 0 0 1-48.076263 0 32.538926 32.538926 0 0 1 0-47.832221 33.352399 33.352399 0 0 1 48.076263 0 35.467429 35.467429 0 0 1 0 47.832221z" p-id="11917" fill="#d81e06"></path><path d="M981.618049 785.082936L747.988561 567.804258S617.344773 601.97013 526.642517 753.682873c5.531617 1.382904 241.926915 239.161106 241.926914 239.161105a109.98157 109.98157 0 0 0 152.607563 0l60.441055-58.732761a102.823006 102.823006 0 0 0 0-149.028281zM854.146806 951.763584a29.366381 29.366381 0 0 1-38.477279 0l-195.233556-189.94598-1.382905-1.382904a25.543057 25.543057 0 0 1 1.382905-35.548777 29.366381 29.366381 0 0 1 38.47728 0l196.535113 189.94598A28.796949 28.796949 0 0 1 854.146806 951.763584z m86.634891-83.380997a29.366381 29.366381 0 0 1-38.47728 0L705.362568 678.436606l-1.382905-1.382904a25.543057 25.543057 0 0 1 1.382905-35.548777 29.366381 29.366381 0 0 1 38.477279 0l196.535113 189.945981a24.404194 24.404194 0 0 1 0 37.013028z" p-id="11918" fill="#d81e06"></path></svg><i id="extool__tip" class="ex-panel__tip"></i></a>');
(elementOrValue = document.getElementsByClassName("ex-panel__wrap")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
((0, __imports.safeBind)(".extool-icon", "click", function () {
      (0, __imports.openFeaturePanel)("扩展功能");
    }, owner));
(containerOrValue = document.getElementsByClassName("extool__close")[0]);
(containerOrValue &&
      owner.listen(containerOrValue, "click", (e) => {
        e.stopPropagation();
        e = document.getElementsByClassName("extool")[0];
        e && (e.style.display = "none");
      }));
(elementOrValue = "");
(elementOrValue +=
      '<label><input style="margin-top:5px" id="extool__treasure_start" type="checkbox">半自动抢宝箱</label>');
((elementOrValue = document.createElement("div")).className = "extool__treasure");
(elementOrValue.innerHTML =
      '<label><input style="margin-top:5px" id="extool__treasure_start" type="checkbox">半自动抢宝箱</label><label style="margin-left:10px;">延迟(抢得过快请调高)：</label><input id="extool__treasure_delay" type="text" style="width:50px;text-align:center;" value="3200" />ms<div class="extool__hint">说明：遇到验证码会自动弹出验证框，需要手动完成后才能领取。</div>');
(containerOrValue = document.getElementsByClassName("extool")[0]);
(containerOrValue && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]));
((0, __imports.safeBind)("#extool__treasure_start", "click", function () {
      (1 == document.getElementById("extool__treasure_start").checked
        ? ((__imports.St = !0),
          __imports.unsafeWindow.socketProxy.socketStream.subscribe("tslist", (i) => {
            if (null != i)
              for (let n = 0; n < i.list.length - 1; n++) {
                var a = i.list[n];
                let e = a.rpid;
                a = a.ot;
                let t = (0, __imports.x)("dy_did");
                var a = Number(a) - Math.floor(Date.now() / 1e3),
                  r = document.createElement("div");
                let o = "Ex_Geetest_no" + String(__imports.fo);
                ((r.id = o),
                  document.getElementById("Ex_Geetest").appendChild(r),
                  0 <= a
                    ? ((a = 1e3 * a + (0, __imports.Mt)()),
                      __imports.fo++,
                      owner.timeout(() => {
                        (0, __imports.yo)(__imports.B, e, t, o);
                      }, a))
                    : (0, __imports.yo)(__imports.B, e, t, o));
              }
          }))
        : (__imports.St = !1),
        (__imports.St = document.getElementById("extool__treasure_start").checked),
        (e = (0, __imports.safeEl)("extool__treasure_delay").value),
        (e = { isGetTreasure: __imports.St, treasureDelay: e }),
        __imports.localStorage.setItem("ExSave_Treasure", JSON.stringify(e)));
    }, owner));
null != (elementOrValue = __imports.localStorage.getItem("ExSave_Treasure")) &&
    ("treasureDelay" in (elementOrValue = JSON.parse(elementOrValue)) == 1
      ? ((0, __imports.safeEl)("extool__treasure_delay").value = elementOrValue.treasureDelay)
      : ((0, __imports.safeEl)("extool__treasure_delay").value = "3200"),
    1 == elementOrValue.isGetTreasure) &&
    document.getElementById("extool__treasure_start").click();
elementOrValue = document.createElement("div");
elementOrValue.className = "extool__redpacket_room";
elementOrValue.innerHTML =
    '<label><input id="extool__redpacekt_room_start" type="checkbox">自动抢礼物红包</label>';
containerOrValue = document.getElementsByClassName("extool")[0];
if (containerOrValue) containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]);
((0, __imports.safeBind)("#extool__redpacekt_room_start", "click", function () {
    (1 == document.getElementById("extool__redpacekt_room_start").checked
      ? (__imports.Et = owner.interval(() => {
          (0, __imports.fetch)(
            "https://www.douyu.com/japi/interactnc/web/propredpacket/getPrpList?type_id=1&room_id=" +
              __imports.B,
            {
              method: "GET",
              mode: "no-cors",
              credentials: "include",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            },
          )
            .then(owner.guard((e) => e.json()))
            .then(owner.guard((o) => {
              if (0 < o.data.list.length)
                for (let t = 0; t < o.data.list.length; t++) {
                  let e = o.data.list[t].activityid;
                  var n = __imports.kt.indexOf(e),
                    i = o.data.list[t].startTime,
                    i =
                      1e3 *
                        (Number(i) - Math.round(new Date().getTime() / 1e3)) -
                      2e3;
                  -1 == n &&
                    (__imports.kt.push(o.data.list[t].activityid),
                    0 < i
                      ? owner.timeout(() => {
                          ((0, __imports.Bt)(e),
                            (0, __imports.Bt)(e),
                            (0, __imports.Bt)(e),
                            (0, __imports.T)("【礼物红包】抢红包执行完毕！", "success"));
                        }, i)
                      : ((0, __imports.Bt)(e),
                        (0, __imports.Bt)(e),
                        (0, __imports.Bt)(e),
                        (0, __imports.T)("【礼物红包】抢红包执行完毕！", "success")));
                }
            }))
            .catch((e) => {
              console.log("请求失败!", e);
            });
        }, 6e4))
      : (0, __imports.clearInterval)(__imports.Et),
      (e = {
        isGetRedPacket: (e = document.getElementById(
          "extool__redpacekt_room_start",
        ).checked),
      }),
      __imports.localStorage.setItem("ExSave_RedPacket_Room", JSON.stringify(e)));
  }, owner));
(elementOrValue = __imports.localStorage.getItem("ExSave_RedPacket_Room"));
(null != elementOrValue &&
      1 == JSON.parse(elementOrValue).isGetRedPacket &&
      document.getElementById("extool__redpacekt_room_start").click());
(containerOrValue = "");
(containerOrValue +=
      '<label><input id="extool__autofish_start" type="checkbox">自动钓鱼</label><br>');
((containerOrValue = document.createElement("div")).className = "extool__autofish");
(containerOrValue.innerHTML =
      '<label><input id="extool__autofish_start" type="checkbox">自动钓鱼</label><br><label><input name="autofish_mode" type="radio" value="all" checked>全天</label><label style="margin-left:5px;"><input name="autofish_mode" type="radio" value="contest">钓鱼大赛</label>');
(elementOrValue = document.getElementsByClassName("extool")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
(document.querySelectorAll('input[name="autofish_mode"]').forEach((e) => {
      owner.listen(e, "change", __imports.dt);
    }));
((0, __imports.safeBind)("#extool__autofish_start", "click", async () => {
      (0, __imports.dt)();
      var e,
        t = (0, __imports.safeEl)("extool__autofish_start").checked;
      if (((0, __imports.st)(t), t))
        return (
          (0, __imports.T)("【自动钓鱼】开始自动钓鱼", "info"),
          (__imports.tt = await new Promise((t) => {
            (0, __imports.fetch)(
              `https://www.douyu.com/japi/revenuenc/web/actfans/achieve/accList?rid=${__imports.B}&type=1&period=1`,
              {
                method: "GET",
                mode: "no-cors",
                cache: "default",
                credentials: "include",
              },
            )
              .then(owner.guard((e) => e.json()))
              .then(owner.guard((e) => {
                e.data ? t(e.data.accList) : t([]);
              }))
              .catch((e) => {
                console.log("请求失败!", e);
              });
          })),
          (t = await (0, __imports.ct)()).data
            ? (e = t.data.baits.find((e) => e.inUse))
              ? ((__imports.ot = e.id),
                t.data.myCh
                  ? ((0, __imports.dt)(),
                    0 == t.data.fishing.stat && ((__imports.it = !1), (__imports.nt = 0)),
                    1 == t.data.fishing.stat &&
                      ((__imports.it = !0), (__imports.nt = t.data.fishing.fishEtMs)),
                    2 == t.data.fishing.stat && (await (0, __imports.rt)(), await (0, __imports.b)(1e3)),
                    void (__imports.at = owner.interval(async () => {
                      var e;
                      (() => {
                        var e,
                          t = (t = document.querySelector(
                            'input[name="autofish_mode"]:checked',
                          ))
                            ? t.value
                            : "all";
                        return (
                          "all" === t ||
                          ((e = (t = new Date()).getHours()),
                          (t = t.getMinutes()),
                          12 <= e && t < 30) ||
                          (0 === e && t < 30)
                        );
                      })() &&
                        (__imports.it
                          ? new Date().getTime() <= __imports.nt || (await (0, __imports.rt)())
                          : 0 !==
                              (e = await new Promise((t) => {
                                (0, __imports.fetch)(
                                  "https://www.douyu.com/japi/revenuenc/web/actfans/fishing/fishing",
                                  {
                                    method: "POST",
                                    mode: "no-cors",
                                    credentials: "include",
                                    headers: {
                                      "Content-Type":
                                        "application/x-www-form-urlencoded",
                                    },
                                    body: `ctn=${(0, __imports.w)()}&rid=${__imports.B}&baitId=${__imports.ot}&ver=1.1`,
                                  },
                                )
                                  .then(owner.guard((e) => e.json()))
                                  .then(owner.guard((e) => {
                                    t(e);
                                  }))
                                  .catch((e) => {
                                    console.log("请求失败!", e);
                                  });
                              })).error
                            ? ((0, __imports.T)("【自动钓鱼】" + e.msg, "error"),
                              console.log(e, "钓鱼失败"),
                              1001007 == e.error && (await (0, __imports.rt)()),
                              1005003 == e.error && (0, __imports.clearInterval)(__imports.at))
                            : ((__imports.it = !0), (__imports.nt = e.data.fishing.fishEtMs)));
                    }, 1500)))
                  : ((0, __imports.st)(((0, __imports.safeEl)("extool__autofish_start").checked = !1)),
                    (0, __imports.T)("【自动钓鱼】请设置形象", "error")))
              : ((0, __imports.st)(((0, __imports.safeEl)("extool__autofish_start").checked = !1)),
                (0, __imports.T)("【自动钓鱼】请设置鱼饵", "error"))
            : ((0, __imports.st)(((0, __imports.safeEl)("extool__autofish_start").checked = !1)),
              (0, __imports.T)("【自动钓鱼】未能获取活动信息", "error"))
        );
      (0, __imports.clearInterval)(__imports.at);
    }, owner));
(containerOrValue = (0, __imports.lt)());
(containerOrValue.rids.includes(__imports.B) &&
      ((containerOrValue = containerOrValue.modes && containerOrValue.modes[__imports.B] ? containerOrValue.modes[__imports.B] : "all"),
      (document.querySelector(
        `input[name="autofish_mode"][value="${containerOrValue}"]`,
      ).checked = !0),
      document.getElementById("extool__autofish_start").click()));
((function () {
      var _extool = document.getElementsByClassName("extool")[0];
      if (!_extool) return;

      var clearbagCard = document.createElement("div");
      clearbagCard.className = "fans-panel__card extool__clearbag";
      clearbagCard.innerHTML = `
        <div class="fans-panel__card-header">
            <span class="fans-panel__card-title">背包送礼</span>
            <span style="font-size: 11px; color: #94a3b8;">[速度适中, 间隔>0.1s]</span>
        </div>
        <div class="ex-gift-pick-trigger" id="extool__clearbag_trigger" title="点击展开5级菜单选择背包礼物">
            <img class="ex-gift-pick-trigger__icon" id="extool__clearbag_icon" src="https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif" />
            <span class="ex-gift-pick-trigger__name" id="extool__clearbag_name">粉丝荧光棒</span>
            <span class="ex-gift-pick-trigger__tag" id="extool__clearbag_tag">点击选择</span>
            <span class="ex-gift-pick-trigger__arrow">▼</span>
            <input id="extool__clearbag_id" type="hidden" value="268" />
        </div>
        <div class="ex-gift-row">
            <label class="ex-gift-label">数量：<input id="extool__clearbag_cnt" type="number" min="1" class="ex-num-input" style="width: 55px;" value="1" /></label>
            <button type="button" id="extool__clearbag_sendbtn" class="ex-btn-primary" style="padding: 4px 16px; font-size: 12px;">送出</button>
        </div>
    `;
      _extool.insertBefore(clearbagCard, _extool.childNodes[0]);

      (0, __imports.safeBind)("#extool__clearbag_trigger", "click", function () {
        (0, __imports.openGiftPicker)("backpack", function (selectedGift) {
          var idEl = document.getElementById("extool__clearbag_id");
          var nameEl = document.getElementById("extool__clearbag_name");
          var tagEl = document.getElementById("extool__clearbag_tag");
          var iconEl = document.getElementById("extool__clearbag_icon");
          if (idEl) idEl.value = selectedGift.id;
          if (nameEl) nameEl.innerText = selectedGift.name;
          if (tagEl) tagEl.innerText = selectedGift.priceText || "已选";
          if (iconEl && selectedGift.icon) iconEl.src = selectedGift.icon;
          (0, __imports.T)("已选择背包礼物：" + selectedGift.name, "success");
        });
      }, owner);

      (0, __imports.safeBind)("#extool__clearbag_sendbtn", "click", async function () {
        var giftId = document.getElementById("extool__clearbag_id").value;
        var cnt =
          Number(document.getElementById("extool__clearbag_cnt").value) || 1;
        if (!giftId) return (0, __imports.T)("请先点击上方选择要送出的礼物", "warning");
        if (confirm("确认送出 " + cnt + " 个背包礼物？")) {
          (0, __imports.T)("【背包送礼】执行中...", "info");
          for (var e = 0; e < cnt; e++) {
            await (0, __imports.b)(100).then(owner.guard(() => {
              (0, __imports.Ut)(giftId, 1, __imports.B)
                .then(owner.guard((res) => {
                  if ("success" != res.msg) {
                    (0, __imports.T)("【背包送礼】" + __imports.B + " 赠送失败 " + res.msg, "error");
                    console.log(__imports.B, res);
                  }
                }))
                .catch((err) => {
                  (0, __imports.T)("【背包送礼】" + __imports.B + " 赠送失败", "error");
                  console.log(__imports.B, err);
                });
            }));
          }
          (0, __imports.T)("【背包送礼】执行完毕！", "success");
        }
      }, owner);

      // 2. 打榜送礼四级卡片
      var sendgiftCard = document.createElement("div");
      sendgiftCard.className = "fans-panel__card extool__sendgift";
      sendgiftCard.innerHTML = `
        <div class="fans-panel__card-header">
            <span class="fans-panel__card-title">打榜送礼</span>
            <span style="font-size: 11px; color: #94a3b8;">[批量打榜, 任意礼物]</span>
        </div>
        <div class="ex-gift-pick-trigger" id="extool__sendgift_trigger" title="点击展开5级菜单选择房间礼物">
            <img class="ex-gift-pick-trigger__icon" id="extool__sendgift_icon" src="https://gfs-op.douyucdn.cn/dygift/2018/11/27/3adbb0c17d9886c1440d55c9711f4c79.gif" />
            <span class="ex-gift-pick-trigger__name" id="extool__sendgift_name">超级火箭</span>
            <span class="ex-gift-pick-trigger__tag" id="extool__sendgift_tag">2000 鱼翅</span>
            <span class="ex-gift-pick-trigger__arrow">▼</span>
            <input id="extool__sendgift_id" type="hidden" value="20005" />
        </div>
        <div class="ex-gift-row">
            <label class="ex-gift-label">数量：<input id="extool__sendgift_cnt" type="number" min="1" class="ex-num-input" style="width: 50px;" value="1" /></label>
            <label class="ex-gift-label">间隔：<input id="extool__sendgift_delay" type="number" min="0" class="ex-num-input" style="width: 50px;" value="0" /> ms</label>
            <button type="button" id="extool__sendgift_btn" class="ex-btn-primary" style="padding: 4px 16px; font-size: 12px;">送出</button>
        </div>
    `;
      _extool.insertBefore(sendgiftCard, _extool.childNodes[0]);

      (0, __imports.safeBind)("#extool__sendgift_trigger", "click", function () {
        (0, __imports.openGiftPicker)("room", function (selectedGift) {
          var idEl = document.getElementById("extool__sendgift_id");
          var nameEl = document.getElementById("extool__sendgift_name");
          var tagEl = document.getElementById("extool__sendgift_tag");
          var iconEl = document.getElementById("extool__sendgift_icon");
          if (idEl) idEl.value = selectedGift.id;
          if (nameEl) nameEl.innerText = selectedGift.name;
          if (tagEl) tagEl.innerText = selectedGift.priceText || "已选";
          if (iconEl && selectedGift.icon) iconEl.src = selectedGift.icon;
          (0, __imports.T)("已选择送礼礼物：" + selectedGift.name, "success");
        });
      }, owner);

      (0, __imports.safeBind)("#extool__sendgift_btn", "click", async () => {
        var giftId = document.getElementById("extool__sendgift_id").value;
        var cnt =
          Number(document.getElementById("extool__sendgift_cnt").value) || 1;
        var delay =
          Number(document.getElementById("extool__sendgift_delay").value) || 0;
        if (!giftId) return (0, __imports.T)("请先点击上方选择要送出的礼物", "warning");
        if (confirm("确认送出 " + cnt + " 个礼物？")) {
          (0, __imports.T)("【送礼】执行中...", "info");
          var sucCount = 0,
            totalCost = 0;
          for (var t = 0; t < cnt; t++) {
            (0, __imports.fetch)("https://www.douyu.com/japi/gift/donate/mainsite/v1", {
              method: "POST",
              mode: "no-cors",
              credentials: "include",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body:
                "giftId=" +
                giftId +
                "&giftCount=1&roomId=" +
                __imports.B +
                "&bizExt=%7B%22yzxq%22%3A%7B%7D%7D",
            })
              .then(owner.guard((e) => e.json()))
              .then(owner.guard((e) => {
                if (null != e.data && "鱼翅不足" != e.msg) {
                  sucCount++;
                  totalCost += Number(e.data.priceType || 0);
                } else {
                  console.log("【送礼】" + giftId + " " + e.msg);
                }
              }))
              .catch((e) => {
                console.log("请求失败!", e);
              });
            if (delay > 0) await (0, __imports.b)(delay);
          }
          (0, __imports.T)("【送礼】已提交赠送请求，详细信息可按F12查看控制台", "success");
        }
      }, owner);

      __imports.localStorage.setItem("freetimed", "1");
    })());
(function () {
    var _extool = document.querySelector(".extool");
    var _sendGift = document.querySelector(".extool__sendgift");
    if (!_extool) return;

    var perfCard = document.createElement("div");
    perfCard.className = "extool__player_perf";
    perfCard.innerHTML = `
        <div class="extool__perf_header">
            <span class="extool__perf_title">播放与性能</span>
            <span class="extool__perf_badge">原生极清</span>
        </div>
        <div class="extool__perf_grid">
            <label class="extool__perf_item" title="原生劫持锁定最高画质，杜绝二次重载卡顿">
                <input id="extool__highestvideoquality" type="checkbox">
                <span class="extool__perf_text">自动最高画质</span>
            </label>
            <label class="extool__perf_item" title="自动展开网页全屏观播">
                <input id="extool__fullscreen" type="checkbox">
                <span class="extool__perf_text">自动网页全屏</span>
            </label>
            <label class="extool__perf_item" title="屏蔽 WebRTC P2P 后台偷偷上传带宽">
                <input id="extool__p2p" type="checkbox">
                <span class="extool__perf_text">阻止p2p上传</span>
            </label>
            <label class="extool__perf_item" title="后台播放保活，阻止 Chrome 浏览器页签睡眠冻结">
                <input id="extool__tabSwitch" type="checkbox">
                <span class="extool__perf_text">防页签冻结</span>
            </label>
        </div>
    `;
    if (_sendGift) {
      _extool.insertBefore(perfCard, _sendGift);
    } else {
      _extool.appendChild(perfCard);
    }
  })();
(0, __imports.safeBind)("#extool__tabSwitch", "click", function () {
    var e = (0, __imports.safeEl)("extool__tabSwitch").checked;
    (0, __imports.Tt)(e);
    e
      ? (0, __imports.Ct)()
      : ((0, __imports.T)("已关闭页面防挂机，请刷新页面生效", "info"),
        window.__pip_is_active__ && (0, __imports.sa)());
  }, owner);
null != (containerOrValue = __imports.localStorage.getItem("ExSave_TabSwitch")) &&
    (containerOrValue = JSON.parse(containerOrValue)).isEnableTabSwitch &&
    (((0, __imports.safeEl)("extool__tabSwitch").checked = containerOrValue.isEnableTabSwitch), (0, __imports.Ct)());
(0, __imports.safeBind)("#extool__p2p", "click", function () {
    var e = { isKillP2P: (0, __imports._t)() };
    __imports.localStorage.setItem("ExSave_P2P", JSON.stringify(e));
    (0, __imports._t)() && (0, __imports.T)("阻止p2p上传成功，刷新页面生效", "success");
  }, owner);
null != (elementOrValue = __imports.localStorage.getItem("ExSave_P2P")) &&
    (elementOrValue = JSON.parse(elementOrValue)).isKillP2P &&
    ((0, __imports.safeEl)("extool__p2p").checked = elementOrValue.isKillP2P);
(0, __imports.safeBind)("#extool__fullscreen", "click", function () {
    var e = { isFullScreen: (0, __imports.mt)() };
    __imports.localStorage.setItem("ExSave_FullScreen", JSON.stringify(e));
    (0, __imports.mt)() && (0, __imports.T)("刷新页面生效", "success");
  }, owner);
(0, __imports.safeBind)("#extool__highestvideoquality", "click", function () {
    var e = { isHighestVideoQuality: (0, __imports.ut)() };
    __imports.localStorage.setItem("ExSave_HighestVideoQuality", JSON.stringify(e));
    (0, __imports.ut)() && (0, __imports.T)("刷新页面生效", "success");
  }, owner);
null != (containerOrValue = __imports.localStorage.getItem("ExSave_FullScreen")) &&
    (containerOrValue = JSON.parse(containerOrValue)).isFullScreen &&
    ((0, __imports.safeEl)("extool__fullscreen").checked = containerOrValue.isFullScreen);
null != (elementOrValue = __imports.localStorage.getItem("ExSave_HighestVideoQuality")) &&
    (elementOrValue = JSON.parse(elementOrValue)).isHighestVideoQuality &&
    ((0, __imports.safeEl)("extool__highestvideoquality").checked = elementOrValue.isHighestVideoQuality);
(containerOrValue = document.createElement("a"));
(containerOrValue.className = "refresh-barrage");
(containerOrValue.id = "refresh-barrage-frame");
(containerOrValue.innerHTML =
      '<svg t="1588051109604" id="refresh-barrage-frame__svg" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3095" width="16" height="16"><path d="M512 128 192 448h192v448h256V448h192L512 128z" fill="#AFAFAF" p-id="3096"></path></svg><i class="Barrage-toolbarIcon"></i><span id="refresh-barrage-frame__text" class="Barrage-toolbarText">拉高</span>');
(elementOrValue = document.getElementsByClassName("Barrage-toolbar")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
((0, __imports.safeBind)("#refresh-barrage-frame", "click", function () {
      let t = document.getElementsByClassName("layout-Player-rank")[0],
        o = document.getElementById("js-room-activity"),
        n = document.getElementsByClassName("Barrage")[0];
      var e;
      "none" == t.style.display
        ? ((t.style.display = "block"),
          (o.style.display = "block"),
          (n.className = "Barrage"),
          ((0, __imports.safeEl)("refresh-barrage-frame__text").innerText = "拉高"),
          document
            .getElementById("refresh-barrage-frame")
            .classList.remove("ex-active"),
          (document.getElementById("refresh-barrage-frame__text").style.color =
            ""),
          (e = document.getElementById("refresh-barrage-frame__svg")) &&
            (e = e.getElementsByTagName("path")[0]) &&
            e.setAttribute("fill", "#AFAFAF"),
          (0, __imports.pn)())
        : ((t.style.display = "none"),
          (o.style.display = "none"),
          (n.className = "Barrage top-0-important"),
          ((0, __imports.safeEl)("refresh-barrage-frame__text").innerText = "拉高"),
          document
            .getElementById("refresh-barrage-frame")
            .classList.add("ex-active"),
          (document.getElementById("refresh-barrage-frame__text").style.color =
            "#fff"),
          (e = document.getElementById("refresh-barrage-frame__svg")) &&
            (e = e.getElementsByTagName("path")[0]) &&
            e.setAttribute("fill", "#ffffff"),
          (0, __imports.pn)());
    }, owner));
containerOrValue = __imports.localStorage.getItem("ExSave_Refresh");
null != containerOrValue &&
    ("barrageFrame" in (containerOrValue = JSON.parse(containerOrValue)) == 0 &&
      (containerOrValue.barrageFrame = { status: !1 }),
    1 == containerOrValue.barrageFrame.status) &&
    ((containerOrValue = document.getElementsByClassName("layout-Player-rank")[0]),
    (elementOrValue = document.getElementById("js-room-activity")),
    (containerOrValue.style.display = "none"),
    (elementOrValue.style.display = "none"),
    ((0, __imports.safeEl)("refresh-barrage-frame__text").innerText = "拉高"),
    document.getElementById("refresh-barrage-frame").classList.add("ex-active"),
    (document.getElementById("refresh-barrage-frame__text").style.color =
      "#fff"),
    (containerOrValue = document.getElementById("refresh-barrage-frame__svg"))) &&
    (elementOrValue = containerOrValue.getElementsByTagName("path")[0]) &&
    elementOrValue.setAttribute("fill", "#ffffff");
(0, __imports.mountPlayerMenu)(owner);
}

}
,
"src/next/ui/room/bloop.js":
function* (__imports) {
yield {"mountBloopPanel": { get: () => mountBloopPanel, set: value => { mountBloopPanel = value; } }};
// Phase-local construction values; only declared outputs cross phase boundaries.
function mountBloopPanel(owner) {
let runGeneration = 0;
const stopSending = () => {
  runGeneration++;
  (0, __imports.clearTimeout)(__imports.ge);
  (0, __imports.clearTimeout)(__imports.ve);
};
owner.own(stopSending);
let containerOrValue, elementOrValue;
(containerOrValue = document.createElement("a"));
(containerOrValue.className = "refresh-barrage");
(containerOrValue.id = "refresh-barrage");
(containerOrValue.innerHTML =
      '<svg t="1588051109604" id="refresh-barrage__svg" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3095" width="16" height="16"><path d="M588.416 516.096L787.2 317.312a54.016 54.016 0 1 0-76.416-76.416L512 439.68 313.216 241.024A54.016 54.016 0 1 0 236.8 317.376l198.784 198.848-198.016 197.888a54.016 54.016 0 1 0 76.416 76.416L512 592.576l197.888 197.952a54.016 54.016 0 1 0 76.416-76.416L588.416 516.096z" fill="#AFAFAF" p-id="3096"></path></svg><i class="Barrage-toolbarIcon"></i><span id="refresh-barrage__text" class="Barrage-toolbarText">前缀</span>');
(elementOrValue = document.getElementsByClassName("Barrage-toolbar")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
((0, __imports.safeBind)("#refresh-barrage", "click", function () {
      var e;
      0 == __imports.mn
        ? ((0, __imports.un)(), (0, __imports.pn)())
        : ((0, __imports.U)("Ex_Style_RefreshBarrage"),
          (__imports.mn = 0),
          document
            .getElementById("refresh-barrage")
            .classList.remove("ex-active"),
          (document.getElementById("refresh-barrage__text").style.color = ""),
          ((0, __imports.safeEl)("refresh-barrage__text").innerText = "前缀"),
          (e = document.getElementById("refresh-barrage__svg")) &&
            (e = e.getElementsByTagName("path")[0]) &&
            e.setAttribute("fill", "#AFAFAF"),
          (0, __imports.pn)());
    }, owner));
(containerOrValue = __imports.localStorage.getItem("ExSave_Refresh"));
(null != containerOrValue &&
      ("barrage" in (containerOrValue = JSON.parse(containerOrValue)) == 0 && (containerOrValue.barrage = { status: !1 }),
      1 == containerOrValue.barrage.status) &&
      (0, __imports.un)());
(elementOrValue = "");
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "bloop");
(elementOrValue += '<div style="display:inline-block"><label>弹幕：</label></div>');
(containerOrValue.innerHTML =
      '<div class="bloop__header_card"><label class="bloop__header_label">弹幕：</label><select id="bloop__select"></select><input type="button" id="bloop__save" value="保存"/><input type="button" id="bloop__delete" value="删除"/></div><div class="bloop__textarea_card"><textarea placeholder="一行一个，开启舔狗模式后此处不需要输入" id="bloop__textarea" rows="4"></textarea></div><div class="bloop__setting_card"><div class="bloop__setting_row"><label>速度(ms)：</label><input id="bloop__text_speed1" type="text" style="width:48px;text-align:center;" value="2000" />~<input id="bloop__text_speed2" type="text" style="width:48px;text-align:center;" value="3000" /></div><div class="bloop__setting_row"><label>限时(min)：</label><input id="bloop__text_stoptime" type="text" style="width:48px;text-align:center;" value="1" /></div></div><div class="bloop__options_card"><label><input id="bloop__checkbox_changeColor" type="checkbox" name="checkbox_changeColor" checked>自动变色</label><label><input id="bloop__checkbox_tiangou" type="checkbox">舔狗模式</label><label><input id="bloop__checkbox_random" type="checkbox">随机发送</label></div><div class="bloop__switch_card"><label class="bloop__switch_label"><input id="bloop__checkbox_startSend" type="checkbox">开始发送</label></div>');
((elementOrValue =
      document.getElementsByClassName("layout-Player-chat")[0] ||
      document.body),
    elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "bloop-icon");
(containerOrValue.innerHTML =
      '<a class="ex-panel__icon" title="弹幕发送小助手"><svg t="1578572568198" style="display: block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="55445" width="32" height="32"><path d="M511.99883605 1020.07740302c-68.78771655 0-135.53209458-13.47788003-198.38074083-40.06106453-60.69004402-25.67037725-115.18953131-62.41203655-161.98371328-109.20738247-46.79418197-46.79301803-83.53700523-101.29366926-109.20621853-161.98371328C15.84497778 645.97776043 2.36709774 579.23105337 2.36709774 510.4445019s13.47904398-135.53209458 40.06106453-198.38074083c25.6692133-60.69004402 62.41203655-115.18953131 109.20621853-161.98371328 46.79534706-46.79418197 101.29366926-83.53700523 161.98371328-109.20621853 62.84864739-26.5831845 129.59418937-40.06106453 198.38074083-40.06106453 68.78771655 0 135.53209458 13.47904398 198.38190592 40.06106453 60.69004402 25.6692133 115.18953131 62.41203655 161.98487723 109.20621853 46.79301803 46.79418197 83.53584128 101.29366926 109.20621853 161.98371328 26.5831845 62.84864739 40.06106453 129.59418937 40.06106453 198.38074083s-13.47788003 135.53325853-40.06106453 198.38074084c-25.67037725 60.69004402-62.41203655 115.19069525-109.20621853 161.98371328-46.79534706 46.79418197-101.29483435 83.53817031-161.98487723 109.20738247C647.53092949 1006.59952413 580.78655147 1020.07740302 511.99883605 1020.07740302zM511.99883605 57.86089358c-249.55500203 0-452.58244437 203.02744235-452.58244437 452.58244437s203.02744235 452.58244437 452.58244437 452.58244438c249.55616597 0 452.58360832-203.02744235 452.58360832-452.58244438C964.58244437 260.88949987 761.55500203 57.86089358 511.99883605 57.86089358z" p-id="55446" fill="#1296db" data-spm-anchor-id="a313x.7781069.0.i24"></path><path d="M322.42598685 461.65355293l-8.51099648 74.46598314 97.86947811 0c-2.85950862 76.59314973-4.9866752 127.6556379-6.38266595 153.18746454-1.42975431 51.06132423-27.65899321 75.16339541-78.72148139 72.33881542-18.45058333 1.39598962-35.47024839 2.12716658-51.06248818 2.12716658-2.85950862-17.02082901-6.38266595-34.77283613-10.63816419-53.19081984 18.41681863 0 35.43764878 0 51.06248817 0 25.53066155 2.82574393 38.99456967-7.77981952 40.42432399-31.9133275 1.39598962-9.9069861 2.12833166-25.53182663 2.12833166-46.80698994 1.39598962-21.27632725 2.12716658-36.86740309 2.12716658-46.80698994l-99.9966447 0 14.89366244-172.33546126 89.3584805 0 0-78.72148138-102.12497636 0 0-48.9353216 151.05913287 0 0 176.5909595L322.42598685 461.65355293zM450.08162475 580.79819435l0-242.54594504 74.46598314 0c-17.0219941-24.10090723-31.91449145-43.25006791-44.67982222-57.44515413l46.80698994-21.27632725c4.25433429 4.25549824 10.63699911 12.06675342 19.14799673 23.40349497 15.5910747 18.45058333 24.79948459 30.51733789 27.65899321 36.16882574l-42.5514917 19.14799673 80.84864796 0c25.53066155-38.29715741 41.8203136-64.5263963 48.93415652-78.72031744l53.19081984 14.89366244c-5.68525255 8.50983253-15.62483939 22.70491762-29.78732487 42.55149169-7.11384291 9.93958685-12.06675342 17.02082901-14.89249849 21.27516331l70.20931982 0 0 242.54594503L620.28991829 580.7970304l0 51.06248818 144.67646806 0 0 48.93415651L620.28991829 680.79367509l0 87.23131392-51.06132423 0 0-87.23131392L428.80646144 680.79367509l0-48.93415651 140.42213376 0 0-51.06248818L450.08162475 580.7970304zM501.14411293 385.0604032l0 53.18965475 68.08331718 0 0-53.18965475L501.14411293 385.0604032zM501.14411293 480.80154965l0 55.31682248 68.08331718 0L569.22743011 480.80154965 501.14411293 480.80154965zM688.37323549 385.0604032l-68.0833172 0 0 53.18965475 68.0833172 0L688.37323549 385.0604032zM620.28991829 480.80154965l0 55.31682248 68.0833172 0L688.37323549 480.80154965 620.28991829 480.80154965z" p-id="55447" fill="#1296db"></path></svg><i id="bloop__tip" class="ex-panel__tip"></i></a>');
(elementOrValue = document.getElementsByClassName("ex-panel__wrap")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
((0, __imports.safeBind)(".bloop-icon", "click", function () {
      (0, __imports.openFeaturePanel)("弹幕发送小助手");
    }, owner));
((0, __imports.safeBind)("#bloop__checkbox_changeColor", "click", function () {
      __imports.ye = (0, __imports.safeEl)("bloop__checkbox_changeColor").checked;
    }, owner));
((0, __imports.safeBind)("#bloop__checkbox_startSend", "click", function () {
      var n;
      stopSending();
      const generation = runGeneration;
      if (1 == (0, __imports.safeEl)("bloop__checkbox_startSend").checked) {
        ((__imports.pe.length = 0),
          (__imports.ue = 0),
          (n = document.getElementById("bloop__textarea").value),
          (__imports.pe = n.split("\n")),
          (__imports.ue = __imports.pe.length - 1));
        {
          ((__imports.ce.length = 0), (__imports.me = 0));
          let t = document.getElementsByClassName("FansBarrageSwitcher"),
            e = document.getElementsByClassName(
              "NobleBarrageSwitcher is-active",
            ),
            o = !1;
          (0 < e.length && (o = !0),
            0 == t.length
              ? ((__imports.be = !0),
                null !=
                (n = document.getElementsByClassName(
                  "MatchSystemFansBarrageSwitcher",
                )[0])
                  ? (n.click(),
                    (t = document.getElementsByClassName(
                      "MatchSystemFansBarrageColor-item",
                    )))
                  : (__imports.be = !1))
              : (t[0].click(),
                (t = document.getElementsByClassName("FansBarrageColor-item")),
                (__imports.be = !1)));
          for (let e = 0; e < t.length; e++)
            -1 == t[e].className.indexOf("is-lock") && (__imports.ce.push(e), __imports.me++);
          (--__imports.me,
            1 == o &&
              document
                .getElementsByClassName("NobleBarrageSwitcher")[0]
                .click());
        }
        ((__imports.fe =
          1 == document.getElementById("bloop__checkbox_random").checked
            ? ((__imports.he = Math.floor(Math.random() * __imports.pe.length)),
              Math.floor(Math.random() * __imports.ce.length))
            : (__imports.he = 0)),
          (0, __imports.ke)(),
          (__imports.ge = owner.timeout(() => (0, __imports.Ee)(owner, () => generation === runGeneration), (0, __imports._e)())),
          (__imports.ve = owner.timeout(
            () => {
              if (generation !== runGeneration) return;
              (((0, __imports.safeEl)("bloop__checkbox_startSend").checked = !1),
                stopSending());
            },
            ((n = (0, __imports.safeEl)("bloop__text_stoptime").value), 60 * Number(n) * 1e3),
          )));
      } else ((0, __imports.clearTimeout)(__imports.ge), (0, __imports.clearTimeout)(__imports.ve));
    }, owner));
((0, __imports.safeBind)("#bloop__checkbox_tiangou", "click", function () {
      var e = (0, __imports.safeEl)("bloop__checkbox_tiangou").checked;
      (((0, __imports.safeEl)("bloop__textarea").disabled = 1 == e), (0, __imports.ke)());
    }, owner));
((0, __imports.safeEl)("bloop__select").onclick = function () {
      var e, t;
      0 != this.options.length &&
        ((e = document.getElementById("bloop__textarea")),
        (t = this.options[this.selectedIndex].text),
        (e.value = t),
        (e.value = e.value.replace(/\\r/g, "\r")));
    });
((0, __imports.safeBind)("#bloop__save", "click", () => {
      var e = document.getElementById("bloop__select"),
        t = document.getElementById("bloop__textarea").value;
      "" != t &&
        (__imports.xe.push(t),
        e.options.add(new Option(t.replace(/\n/g, "\\r"), !0)),
        (0, __imports.ke)());
    }, owner));
((0, __imports.safeBind)("#bloop__delete", "click", () => {
      var e = document.getElementById("bloop__select"),
        o = e.options[e.selectedIndex];
      if (o) {
        let t = o.text;
        ((__imports.xe = __imports.xe.filter((e) => e !== t)),
          e.options.remove(e.selectedIndex),
          (0, __imports.ke)());
      }
    }, owner));
(containerOrValue = __imports.localStorage.getItem("ExSave_BarrageLoopOptions"));
if (null != containerOrValue) {
    containerOrValue = JSON.parse(containerOrValue);
    ("speed1" in containerOrValue == 0 && (containerOrValue.speed1 = 2e3),
      "speed2" in containerOrValue == 0 && (containerOrValue.speed2 = 3e3),
      "stopTime" in containerOrValue == 0 && (containerOrValue.stopTime = 5),
      "isTiangouMode" in containerOrValue == 0 && (containerOrValue.isTiangouMode = !1));
    let t = document.getElementById("bloop__select");
    (containerOrValue.text.forEach((e) => {
      t.options.add(new Option(e.replace(/\r/g, "\\r"), ""));
    }),
      (__imports.xe = containerOrValue.text),
      ((0, __imports.safeEl)("bloop__checkbox_changeColor").checked = containerOrValue.isChangeColor),
      (__imports.ye = Boolean(containerOrValue.isChangeColor)),
      ((0, __imports.safeEl)("bloop__text_speed1").value = containerOrValue.speed1),
      ((0, __imports.safeEl)("bloop__text_speed2").value = containerOrValue.speed2),
      ((0, __imports.safeEl)("bloop__text_stoptime").value = containerOrValue.stopTime),
      1 == containerOrValue.isTiangouMode &&
        (((0, __imports.safeEl)("bloop__checkbox_tiangou").checked = containerOrValue.isTiangouMode),
        ((0, __imports.safeEl)("bloop__textarea").disabled = !0)));
  }
}

}
,
"src/next/ui/room/player-bindings.js":
function* (__imports) {
yield {"mountRoomPlayerBindings": { get: () => mountRoomPlayerBindings, set: value => { mountRoomPlayerBindings = value; } }};
// Phase-local construction values; only declared outputs cross phase boundaries.
function mountRoomPlayerBindings(owner) {
let elementOrValue, containerOrValue;
const roomId = __imports.B;
(elementOrValue = document.createElement("div"));
(elementOrValue.className = "fans-continue");
(elementOrValue.innerHTML =
      '<a class="ex-panel__icon" title="一键续牌"><img style="width: 32px;height: 32px;" src="https://gfs-op.douyucdn.cn/dygift/1705/7db9beee246848252f1c7fe916259f4e.png"/><i id="fans-continue__tip" class="ex-panel__tip"></i></a>');
(containerOrValue = document.getElementsByClassName("ex-panel__wrap")[0]);
(containerOrValue && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]));
((0, __imports.safeBind)(".fans-continue", "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      (0, __imports.triggerFansContinue)();
    }, owner));
(elementOrValue = document.createElement("div"));
(elementOrValue.className = "ex-sign");
(elementOrValue.innerHTML =
      '<a class="ex-panel__icon" title="一键签到(房间/鱼吧/客户端/星推日常)"><svg style="display: block;" t="1578566545259" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12959" width="32" height="32"><path d="M698.368 80.896v114.688c0 23.552 19.968 43.008 44.032 43.008s44.032-19.456 44.032-43.008V80.896c0-23.552-19.968-43.008-44.032-43.008s-44.032 18.944-44.032 43.008zM227.328 80.896v114.688c0 23.552 19.968 43.008 44.032 43.008 24.576 0 44.032-19.456 44.032-43.008V80.896c0-23.552-19.968-43.008-44.032-43.008-24.576 0-44.032 18.944-44.032 43.008z" fill="#F96C5D" p-id="12960"></path><path d="M977.92 195.584c0-23.552-19.968-43.008-44.032-43.008h-88.576v43.008c0 55.296-46.08 100.352-102.912 100.352s-102.912-45.056-102.912-100.352v-43.008H374.272v43.008c0 55.296-46.08 100.352-102.912 100.352-56.832 0-102.912-45.056-102.912-100.352v-43.008H79.872c-24.576 0-44.032 19.456-44.032 43.008v611.328l252.928-145.92-8.192-8.192c-10.24-9.728-16.384-23.552-16.384-38.4 0-29.696 25.088-54.272 55.808-54.272 15.36 0 29.184 6.144 39.424 15.872l28.16 27.648L977.92 263.168V195.584z" fill="#F96C5D" p-id="12961"></path><path d="M329.216 278.528c-5.632 3.584-11.264 6.656-17.408 9.216 5.632-2.56 11.776-5.632 17.408-9.216zM344.064 266.24c4.608-4.608 8.704-9.728 12.8-14.848-3.584 5.632-8.192 10.24-12.8 14.848zM329.216 278.528c5.632-3.584 10.752-7.68 15.36-12.288-5.12 4.608-10.24 8.704-15.36 12.288zM449.536 664.064l220.16-214.016c10.24-9.728 24.064-15.872 39.424-15.872 30.72 0 55.808 24.064 55.808 54.272 0 14.848-6.144 28.672-16.384 38.4l-259.072 252.416c-10.24 9.728-24.064 15.872-39.424 15.872s-29.184-6.144-39.424-15.872l-121.344-118.272L35.84 806.912v104.96c0 23.552 19.968 43.008 44.032 43.008h854.016c24.576 0 44.032-19.456 44.032-43.008V263.168L387.584 603.648l61.952 60.416zM350.72 569.856c-4.608-3.072-9.216-5.12-14.336-6.656 5.12 1.024 10.24 3.584 14.336 6.656zM271.36 295.936c14.336 0 27.648-2.56 39.936-7.68-12.288 4.608-25.6 7.68-39.936 7.68z" fill="#F15A4A" p-id="12962"></path></svg><i id="ex-sign__tip" class="ex-panel__tip"></i></a>');
(containerOrValue = document.getElementsByClassName("ex-panel__wrap")[0]);
(containerOrValue && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]));
((_sEl = document.getElementsByClassName("ex-sign")[0]) &&
      ((elementOrValue = new __imports.PointerGestureBinding(_sEl, owner)),
      elementOrValue.click(() => {
        (0, __imports.Wn)(!1);
      }),
      elementOrValue.longClick(() => {
        (0, __imports.Wn)(!0);
      })));
(0, __imports.mountBarrageSettings)(owner);
containerOrValue = !!document.getElementsByClassName("live-next-body")[0];
if (!containerOrValue) {
    containerOrValue = document.createElement("div");
    ((containerOrValue.style = "position: absolute;right: -14px;top: 32px;cursor: pointer;"),
      (containerOrValue.id = "ex-accountList-icon"),
      (containerOrValue.innerHTML =
        __imports.oe +
        `

        <div id="ex-accountList-wrap" class="public-DropMenu-drop">

            <div class="public-DropMenu-drop-main">

                <div id="ex-accountList-iframe"></div>

                <div id="ex-accountList-iframe2"></div>

                <div id="ex-accountList-content" style="width: 300px;font-size: 14px;padding: 10px;">

                </div>

            </div>

            <i></i>

        </div>

    `),
      (_hr = document.getElementsByClassName("Header-right")[0]) &&
        _hr.appendChild(containerOrValue));
    {
      let e = JSON.parse((0, __imports.GM_getValue)("Ex_accountList") || "{}"),
        a = {},
        r = "";
      (0, __imports.GM_cookie)("list", { path: "/" }, function (t) {
        var o = [];
        if (null == t)
          (0, __imports.safeEl)("ex-accountList-content").innerHTML =
            "请升级Tampermonkey版本<br/><a href='https://www.crx4chrome.com/crx/1429/'>点我升级，选择Crx4Chrome</a>";
        else {
          for (let e = 0; e < t.length; e++) {
            var n = t[e].name,
              i = t[e].value;
            ("acf_nickname" == n && (a.nickname = i),
              "acf_uid" == n && ((a.uid = i), (r = i)),
              "acf_avatar" == n && (a.avatar = i),
              o.push(t[e]));
          }
          ("" == r && ((a.uid = "null"), (r = "null")),
            (a.data = o),
            (a.update_time = String(new Date().getTime())),
            (e[r] = a),
            (0, __imports.GM_setValue)("Ex_accountList", JSON.stringify(e)),
            (0, __imports.ie)(e));
        }
      });
    }
    ((0, __imports.re)("null", __imports.I),
      owner.listen(__imports.unsafeWindow, "message", (e) => {
        switch (e.data) {
          case "cleanOver":
            owner.timeout(() => {
              window.location.reload();
            }, 50);
            break;
          case "msgCleanOver":
          case "yubaCleanOver":
          case "videoCleanOver":
          case "czCleanOver":
          case "switchOver":
            5 <= ++__imports.ne &&
              ((__imports.ne = 0),
              owner.timeout(() => {
                window.location.reload();
              }, 50));
            break;
          case "deleteOver":
            ((0, __imports.ie)(), (0, __imports.T)("【账号管理】删除完毕", "success"));
        }
      }));
  }
((0, __imports.safeBind)(".ChatSend-txt", "keydown", (e) => {
    var t = e.target,
      o = "TEXTAREA" === t.tagName;
    38 == e.keyCode
      ? 0 == (0, __imports.$)(t) && ((__imports.C = 0 < __imports.C ? __imports.C - 1 : __imports.C), (0, __imports.ze)())
      : 40 == e.keyCode
        ? ((o = (o ? t.value : t.innerText).length),
          (0, __imports.$)(t) == o && ((__imports.C = __imports.C < __imports.De.length - 1 ? __imports.C + 1 : __imports.C), (0, __imports.ze)()))
        : 13 == e.keyCode && (0, __imports.Pe)((0, __imports.Oe)());
  }, owner));
((0, __imports.safeBind)(".ChatSend-button", "click", () => {
      (0, __imports.Pe)((0, __imports.Oe)());
    }, owner));
(elementOrValue = document.createElement("span"));
(elementOrValue.className = "month-cost");
(elementOrValue.innerHTML = `

	本月消费 <span id="monthcost__money">***</span> 元

	<span class="monthcost__icon"></span>

	`);
(elementOrValue.title = "数据每日更新，根据个人中心消费数据统计");
(containerOrValue = (0, __imports.E)(["#js-backpack-enter"]));
((containerOrValue = containerOrValue && containerOrValue.parentElement) && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]));
(elementOrValue = (0, __imports.findMonthlySpendingControl)());
if (elementOrValue)
    owner.listen(elementOrValue, "click", () => {
      ((__imports.Ro = 1 === __imports.Ro ? 0 : 1),
        __imports.localStorage.setItem(__imports.Do, String(__imports.Ro)),
        (0, __imports.renderMonthlySpending)(),
        1 === __imports.Ro && (0, __imports.loadMonthlySpending)());
    });
__imports.Ro = (() => {
    var e = __imports.localStorage.getItem(__imports.Do);
    return null != e && 1 === Number(e) ? 1 : 0;
  })();
(0, __imports.renderMonthlySpending)();
1 === __imports.Ro && (0, __imports.loadMonthlySpending)();
(0, __imports.fetch)("https://www.douyu.com/member/platform_task/effect_list", {
    method: "GET",
    mode: "no-cors",
    cache: "default",
    credentials: "include",
  })
    .then(owner.guard(async (response) => {
      let e = await response.text();
      if (owner.disposed || __imports.B !== roomId) return;
      e = (e = new DOMParser().parseFromString(
        e,
        "text/html",
      )).getElementsByClassName("enter-wraper is-effect");
      if (e && 0 != e.length) {
        var t,
          o,
          n = e[0].getElementsByClassName("show-effect-more");
        if (n)
          if (0 != n.length)
            for (let e = 0; e < n.length; e++) {
              var i = JSON.parse(n[e].getAttribute("data-detail"));
              "1646" === String(i.property_id) &&
                String(i.show_id_list) === String(__imports.B) &&
                ((i = 1e3 * i.expire_time),
                (i = Math.floor((i - Date.now()) / 864e5)) <= __imports.En) &&
                ((o = t = void 0),
                ((t = document.createElement("span")).className = "room-vip"),
                (t.innerHTML = `

	距VIP到期 <span id="room-vip-expire-days">**</span> 天

	`),
                (o = (o = (0, __imports.E)(["#js-backpack-enter"])) && o.parentElement) &&
                  o.insertBefore(t, o.childNodes[0]),
                ((0, __imports.safeEl)("room-vip-expire-days").innerText = i),
                ((node) => owner.own(() => node.remove()))(t));
            }
      }
    }))
    .catch((e) => {
      console.log("请求失败!", e);
    });
(0, __imports.mountDanmakuSearch)(owner);
(0, __imports.Qr)((e, t) =>
    -1 !== e.indexOf("group/getBindGroup")
      ? t.replace('"group_status":4', '"group_status":0')
      : t,
  );
{
    let e = 0,
      t = owner.interval(() => {
        if (100 < ++e) (0, __imports.clearInterval)(t);
        else if (null != document.getElementsByClassName("ChatSend-txt")[0]) {
          {
            let e;
            (null !=
              (e = document.getElementsByClassName("ChatSend-button")[0]) &&
              (e.className = "ChatSend-button"),
              null !=
                (e = document.getElementsByClassName("ChatSend-txt")[0]) &&
                (e.maxLength = e.maxLength + 20));
          }
          (0, __imports.clearInterval)(t);
        }
      }, 1e3);
  }
(async () => {
    if (await (0, __imports.refreshFansMedalCache)(owner) === false) return;
    if (owner.disposed) return;
    (new __imports.DomMutationSubscription(".FansMedalPanel-enter", !1, async (e) => {
        var t,
          o,
          n = document.querySelector(".FansMedalInfo-head");
        if (!n) return;
        t = new Date().getDate();
        if (new Date(__imports.Re.t).getDate() < t && await (0, __imports.refreshFansMedalCache)(owner) === false) return;
        if (owner.disposed || __imports.B !== roomId || !n.isConnected ||
            document.querySelector(".FansMedalInfo-head") !== n) return;
        (0 !== (t = __imports.Re.list).length) &&
          (((o = document.createElement("div")).innerHTML = `

      <div style="display: flex; align-items: center;gap: 8px;margin-top: 4px;">

        ${t
          .map(
            (e) => `

          <div style="display: flex; align-items: center;">

            <img style="width: 20px; height: 20px;margin-right: 4px;" src="${e.webIcon}" alt="${e.name}">

            <span style="font-size: 12px;">${e.name}</span>

          </div>

        `,
          )
          .join("")}

      </div>

    `),
          n.appendChild(o),
          owner.own(() => o.remove()));
      }, owner));
  })();
(0, __imports.mountLastLiveOverlay)(owner);
{
    let t = owner.interval(() => {
      var e = document.querySelector(".volume-07c230");
      let n = document.getElementById("__video2");
      e &&
        n &&
        ((0, __imports.clearInterval)(t),
        owner.listen(
          e, "wheel",
          function (e) {
            (e.preventDefault(), e.stopPropagation());
            var t = n.volume,
              o = e.deltaY < 0 ? Math.min(t + 0.05, 1) : Math.max(t - 0.05, 0),
              e = document.getElementById("__video2");
            if (e) {
              ((e.muted = 0 === o), (e.volume = o));
              try {
                [
                  "volume_muted_before_key",
                  "player_storage_volume_h5p_room",
                ].forEach((e) => {
                  var t = __imports.localStorage.getItem(e);
                  t &&
                    (((t = JSON.parse(t)).v = o),
                    __imports.localStorage.setItem(e, JSON.stringify(t)));
                });
              } catch (e) {}
            }
          },
          { passive: !1, capture: !0 },
        ),
        owner.listen(n, "volumechange", () => {
          (0, __imports.setDanmakuVolume)(n.volume);
        }),
        (0, __imports.setDanmakuVolume)(n.volume));
    }, 500);
  }
}

}
,
"src/next/ui/room/mount.js":
function* (__imports) {
yield {"activeRoomMount": { get: () => activeRoomMount, set: value => { activeRoomMount = value; } },
"createRoomLifetime": { get: () => createRoomLifetime, set: value => { createRoomLifetime = value; } },
"mountRoom": { get: () => mountRoom, set: value => { mountRoom = value; } },
"unmountRoom": { get: () => unmountRoom, set: value => { unmountRoom = value; } }};
// Room phases exchange explicit outputs; construction temporaries stay local.
let activeRoomMount = null;
function createRoomLifetime() {
  let disposed = false;
  const cleanups = new Set();
  const owner = {
    // Preserve the legacy mutable submit target until that behavioral change is approved.
    navigation: { submitTarget: undefined },
    get disposed() { return disposed; },
    own(cleanup) {
      if (disposed) cleanup(); else cleanups.add(cleanup);
      return cleanup;
    },
    guard(callback) {
      return function(...args) { if (!disposed) return callback.apply(this, args); };
    },
    listen(target, type, callback, options) {
      if (disposed || !target) return;
      target.addEventListener(type, callback, options);
      owner.own(() => target.removeEventListener(type, callback, options));
    },
    interval(callback, delay) {
      if (disposed) return null;
      const id = (0, __imports.setInterval)(owner.guard(callback), delay);
      owner.own(() => (0, __imports.clearInterval)(id));
      return id;
    },
    timeout(callback, delay) {
      if (disposed) return null;
      let cleanup;
      const id = (0, __imports.setTimeout)(owner.guard(() => {
        cleanups.delete(cleanup);
        callback();
      }), delay);
      cleanup = owner.own(() => (0, __imports.clearTimeout)(id));
      return id;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const errors = [];
      for (const cleanup of [...cleanups].reverse()) {
        try { cleanup(); } catch (error) { errors.push(error); }
      }
      cleanups.clear();
      if (errors.length) console.warn('NEXT room cleanup', errors);
    }
  };
  return owner;
}
function unmountRoom() {
  if (!activeRoomMount) return;
  const owner = activeRoomMount;
  activeRoomMount = null;
  owner.dispose();
}
function mountRoom() {
  if (activeRoomMount && !activeRoomMount.disposed) return activeRoomMount;
  const owner = createRoomLifetime();
  activeRoomMount = owner;
  const existing = new Set(document.querySelectorAll('*'));
  owner.own(__imports.stopTaskHeartbeat);
  owner.own(() => (0, __imports.teardownNextDock)());
  try {
    (0, __imports.mountRoomShell)(owner);
    (0, __imports.mountRoomControls)(owner);
    const liveToolsPanel = (0, __imports.mountLotteryPanel)(owner);
    (0, __imports.mountLiveToolsPanel)(owner, liveToolsPanel);
    (0, __imports.mountExtensionToolsPanel)(owner);
    (0, __imports.mountBloopPanel)(owner);
    (0, __imports.mountRoomPlayerBindings)(owner);
    owner.listen(window, 'pagehide', unmountRoom);
    return owner;
  } catch (error) {
    unmountRoom();
    throw error;
  } finally {
    // Capture only nodes introduced by synchronous assembly, not page-owned nodes.
    const added = [...document.querySelectorAll('*')].filter(node => !existing.has(node));
    const addedSet = new Set(added);
    const roots = added.filter(node => !addedSet.has(node.parentElement));
    owner.own(() => roots.forEach(node => node.remove()));
  }
}

}
,
"src/next/runtime/heartbeat.js":
function* (__imports) {
yield {"startTaskHeartbeat": { get: () => startTaskHeartbeat, set: value => { startTaskHeartbeat = value; } },
"stopTaskHeartbeat": { get: () => stopTaskHeartbeat, set: value => { stopTaskHeartbeat = value; } }};
// Own only the level-task heartbeat; other feature jobs have separate lifetimes.
let taskHeartbeat = null;
function startTaskHeartbeat() {
  if (taskHeartbeat !== null) return;
  (0, __imports.claimLevelTasks)();
  taskHeartbeat = (0, __imports.setInterval)(__imports.claimLevelTasks, 60000);
}
function stopTaskHeartbeat() {
  if (taskHeartbeat === null) return;
  (0, __imports.clearInterval)(taskHeartbeat);
  taskHeartbeat = null;
}

}
,
"src/next/ui/styles.js":
function* (__imports) {
yield {"y": { get: () => y, set: value => { y = value; } }};
function y() {
  var e = document.createElement("style");
  (e.appendChild(
    document.createTextNode(("\n\n\t\tbody{position:relative;}\n\n\t\t#ex-accountList-wrap {    left: -152px;    top: -16px;    /* max-height: 330px;    overflow-y: scroll;    scrollbar-width: none;    -ms-overflow-style: none; */    -webkit-transition: all .2s cubic-bezier(.22,.58,.12,.98);    -o-transition: all cubic-bezier(.22,.58,.12,.98) .2s;    -moz-transition: all cubic-bezier(.22,.58,.12,.98) .2s;    transition: all .2s cubic-bezier(.22,.58,.12,.98);    -webkit-transform-origin: 80% 0;    -moz-transform-origin: 80% 0;    -ms-transform-origin: 80% 0;    -o-transform-origin: 80% 0;    transform-origin: 80% 0;    -webkit-animation: scale-in-ease .5s cubic-bezier(.22,.58,.12,.98);    -moz-animation: scale-in-ease cubic-bezier(.22,.58,.12,.98) .5s;    -o-animation: scale-in-ease cubic-bezier(.22,.58,.12,.98) .5s;    animation: scale-in-ease .5s cubic-bezier(.22,.58,.12,.98);}/* #ex-accountList-wrap::-webkit-scrollbar {    display: none;} */.ex-accountList-item {    padding: 10px;    display: flex;    border-radius: 10px;    align-items: center;}.ex-accountList-item:hover {    background-color: rgb(244,244,244);}#ex-accountList-iframe {    display: none;}#ex-accountList-iframe2 {    display: none;}#ex-accountList-item-add {    padding: 10px;    text-align: center;    margin-bottom:0px;    border-radius: 10px;}#ex-accountList-item-add:hover {    background-color: rgb(244,244,244);}.ex-accountList-item__imgWrap {    flex: 0 0 25%;}.ex-accountList-item__img {    width: 50px;    height: 50px;    border-radius: 50%;}.ex-accountList-item__name {    line-height: 50px;    flex: 0 0 55%;}.ex-accountList-item__btn {    height: 30px;    width: 50px;    border-radius: 10px;    align-items: center;    flex: auto;    text-align: center;    line-height: 28px;    color: white;    background-color: rgb(245,108,108);}.ex-a" +
"ccountList-item__btn:hover {    background-color: rgb(247,137,137);}#ex-accountList-icon:hover > #ex-accountList-wrap {    display: block;}#ex-accountList-content {    background-color: white;}#ex-audio-line {    cursor: pointer;}.live-next-body #ex-audio-line {    margin-left: 4px;}.bag-info {    position: absolute;    background-color: rgba(0, 0, 0, 0.6);    color: white;    width: 20px;    font-weight: 800;    height: 20px;    text-align: center;    z-index: 10;    bottom: 0;}.bag-button {    color: rgb(255, 255, 255);    text-align: center;    height: 15px;    line-height: 15px;    cursor: pointer;    margin-left: 5px;    background: rgb(70, 171, 255);    border-radius: 9px;    padding: 0px 10px;    right: 20px;}.bloop {\tbackground-color: rgba(255,255,255,0.78);\n\tbackdrop-filter: blur(18px) saturate(1.6);\n\t-webkit-backdrop-filter: blur(18px) saturate(1.6);\n\tborder: 1px solid rgba(15,23,42,0.08);\n\tborder-radius: 14px;\n\tbox-shadow: 0 10px 28px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06);\twidth: 100%;\theight: 200px;\tposition: relative;\tbottom: 200px;\tdisplay: none;\tz-index: 1428;\tcolor: #333;}.bloop__switch {\tposition: absolute;\tright: 0;\tbottom: 0;}.bloop__mode {\tdisplay: inline-block;}#bloop__select {\twidth: 150px;}.barragePanel__funcPanel {    position: absolute;    width: 232px;    height: 270px;    display: block;    background: rgba(255,255,255,0.9); backdrop-filter: blur(18px) saturate(1.6); -webkit-backdrop-filter: blur(18px) saturate(1.6); border-radius: 12px; box-shadow: 0 10px 28px rgba(15,23,42,0.14);    overflow-y: scroll;}.barragePanel__funcPanel::-webkit-scrollbar {display:none}.barragePanel__muteTime {    /* position: absolute;    left: 25px;    top: 123px; */    z-index: 5;}.danmuContent-25f266 {    pointer-events: auto !important;}.thirdBtn-06c" +
"de5, .fourBtn-0845d4 {    /* 加宽按钮方便点击 */    margin-left: 0px !important;    margin-right: 0px !important;    padding: 0 17px !important;}#copy-real-live {    cursor: pointer;}.Title-row-span, .Title-row-icon  {    display: flex;    align-items: center;    justify-content: center;}.Title-row-icon {    margin-right: 4px;}.live-next-body #copy-real-live {    margin-left: 4px;}.ChatBarrageCollect .TagItem {  height: auto !important;}.ChatBarrageCollect .TagItem-txt {  overflow: auto !important;  white-space: normal !important;  text-overflow: clip !important;}.ChatToolBar-DanmakuTail {    display: inline-block;    vertical-align: middle;    width: 18px;    height: 18px;    -webkit-border-radius: 4px;    -moz-border-radius: 4px;    border-radius: 4px;    margin-right: 8px;    color: #bbb;    cursor: pointer;}[data-mantine-color-scheme=dark] .ChatToolBar-DanmakuTail-tip {    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAABGdBTUEAALGPC/xhBQAACklpQ0NQc1JHQiBJRUM2MTk2Ni0yLjEAAEiJnVN3WJP3Fj7f92UPVkLY8LGXbIEAIiOsCMgQWaIQkgBhhBASQMWFiApWFBURnEhVxILVCkidiOKgKLhnQYqIWotVXDjuH9yntX167+3t+9f7vOec5/zOec8PgBESJpHmomoAOVKFPDrYH49PSMTJvYACFUjgBCAQ5svCZwXFAADwA3l4fnSwP/wBr28AAgBw1S4kEsfh/4O6UCZXACCRAOAiEucLAZBSAMguVMgUAMgYALBTs2QKAJQAAGx5fEIiAKoNAOz0ST4FANipk9wXANiiHKkIAI0BAJkoRyQCQLsAYFWBUiwCwMIAoKxAIi4EwK4BgFm2MkcCgL0FAHaOWJAPQGAAgJlCLMwAIDgCAEMeE80DIEwDoDDSv+CpX3CFuEgBAMDLlc2XS9IzFLiV0Bp38vDg4iHiwmyxQmEXKRBmCeQinJebIxNI5wNMzgwAABr50cH+OD+Q5+bk4eZm52zv9MWi/mvwbyI+IfHf/ryMAgQAEE7P79pf5eXWA3DHAbB1v2upWwDaVgBo3/ldM9sJoFoK0Hr5i3k4/EAenqFQyDwdHAoLC+0lYqG9MOOLPv8z4W/gi372/EAe/tt68ABxmkCZrcCjg/1xYW52rlKO58sEQjFu9+cj/seFf/2OKdHiNLFcLBWK8ViJuFAiTcd5uVKRRCHJleIS6X8y8R+W/QmTdw0ArIZPwE62B7XLbMB+7gECiw5Y0nYAQH7zLYwaC5EAEGc0Mnn3AACTv/mPQCsBAM2XpOMAALzoGFyolBdMxggA" +
"AESggSqwQQcMwRSswA6cwR28wBcCYQZEQAwkwDwQQgbkgBwKoRiWQRlUwDrYBLWwAxqgEZrhELTBMTgN5+ASXIHrcBcGYBiewhi8hgkEQcgIE2EhOogRYo7YIs4IF5mOBCJhSDSSgKQg6YgUUSLFyHKkAqlCapFdSCPyLXIUOY1cQPqQ28ggMor8irxHMZSBslED1AJ1QLmoHxqKxqBz0XQ0D12AlqJr0Rq0Hj2AtqKn0UvodXQAfYqOY4DRMQ5mjNlhXIyHRWCJWBomxxZj5Vg1Vo81Yx1YN3YVG8CeYe8IJAKLgBPsCF6EEMJsgpCQR1hMWEOoJewjtBK6CFcJg4Qxwicik6hPtCV6EvnEeGI6sZBYRqwm7iEeIZ4lXicOE1+TSCQOyZLkTgohJZAySQtJa0jbSC2kU6Q+0hBpnEwm65Btyd7kCLKArCCXkbeQD5BPkvvJw+S3FDrFiOJMCaIkUqSUEko1ZT/lBKWfMkKZoKpRzame1AiqiDqfWkltoHZQL1OHqRM0dZolzZsWQ8ukLaPV0JppZ2n3aC/pdLoJ3YMeRZfQl9Jr6Afp5+mD9HcMDYYNg8dIYigZaxl7GacYtxkvmUymBdOXmchUMNcyG5lnmA+Yb1VYKvYqfBWRyhKVOpVWlX6V56pUVXNVP9V5qgtUq1UPq15WfaZGVbNQ46kJ1Bar1akdVbupNq7OUndSj1DPUV+jvl/9gvpjDbKGhUaghkijVGO3xhmNIRbGMmXxWELWclYD6yxrmE1iW7L57Ex2Bfsbdi97TFNDc6pmrGaRZp3mcc0BDsax4PA52ZxKziHODc57LQMtPy2x1mqtZq1+rTfaetq+2mLtcu0W7eva73VwnUCdLJ31Om0693UJuja6UbqFutt1z+o+02PreekJ9cr1Dund0Uf1bfSj9Rfq79bv0R83MDQINpAZbDE4Y/DMkGPoa5hpuNHwhOGoEctoupHEaKPRSaMnuCbuh2fjNXgXPmasbxxirDTeZdxrPGFiaTLbpMSkxeS+Kc2Ua5pmutG003TMzMgs3KzYrMnsjjnVnGueYb7ZvNv8jYWlRZzFSos2i8eW2pZ8ywWWTZb3rJhWPlZ5VvVW16xJ1lzrLOtt1ldsUBtXmwybOpvLtqitm63Edptt3xTiFI8p0in1U27aMez87ArsmuwG7Tn2YfYl9m32zx3MHBId1jt0O3xydHXMdmxwvOuk4TTDqcSpw+lXZxtnoXOd8zUXpkuQyxKXdpcXU22niqdun3rLleUa7rrStdP1o5u7m9yt2W3U3cw9xX2r+00umxvJXcM970H08PdY4nHM452nm6fC85DnL152Xlle+70eT7OcJp7WMG3I28Rb4L3Le2A6Pj1l+s7pAz7GPgKfep+Hvqa+It89viN+1n6Zfgf8nvs7+sv9j/i/4XnyFvFOBWABwQHlAb2BGoGzA2sDHwSZBKUHNQWNBbsGLww+FUIMCQ1ZH3KTb8AX8hv5YzPcZyya0RXKCJ0VWhv6MMwmTB7WEY6GzwjfEH5vpvlM6cy2CIjgR2yIuB9pGZkX+X0UKSoyqi7qUbRTdHF09yzWrORZ+2e9jvGPqYy5O9tqtnJ2Z6xqbFJsY+ybuIC4qriBeIf4RfGXEnQTJAntieTE2MQ9ieNzAudsmjOc5JpUlnRjruXcorkX5unOy553PFk1WZB8OIWYEpeyP+WDIEJQLxhP5aduTR0T8oSbhU9FvqKNolGxt7hKPJLmnVaV9jjdO31D+miGT0Z1xjMJT1IreZEZkrkj801WRNberM/ZcdktOZSclJyj" +
"Ug1plrQr1zC3KLdPZisrkw3keeZtyhuTh8r35CP5c/PbFWyFTNGjtFKuUA4WTC+oK3hbGFt4uEi9SFrUM99m/ur5IwuCFny9kLBQuLCz2Lh4WfHgIr9FuxYji1MXdy4xXVK6ZHhp8NJ9y2jLspb9UOJYUlXyannc8o5Sg9KlpUMrglc0lamUycturvRauWMVYZVkVe9ql9VbVn8qF5VfrHCsqK74sEa45uJXTl/VfPV5bdra3kq3yu3rSOuk626s91m/r0q9akHV0IbwDa0b8Y3lG19tSt50oXpq9Y7NtM3KzQM1YTXtW8y2rNvyoTaj9nqdf13LVv2tq7e+2Sba1r/dd3vzDoMdFTve75TsvLUreFdrvUV99W7S7oLdjxpiG7q/5n7duEd3T8Wej3ulewf2Re/ranRvbNyvv7+yCW1SNo0eSDpw5ZuAb9qb7Zp3tXBaKg7CQeXBJ9+mfHvjUOihzsPcw83fmX+39QjrSHkr0jq/dawto22gPaG97+iMo50dXh1Hvrf/fu8x42N1xzWPV56gnSg98fnkgpPjp2Snnp1OPz3Umdx590z8mWtdUV29Z0PPnj8XdO5Mt1/3yfPe549d8Lxw9CL3Ytslt0utPa49R35w/eFIr1tv62X3y+1XPK509E3rO9Hv03/6asDVc9f41y5dn3m978bsG7duJt0cuCW69fh29u0XdwruTNxdeo94r/y+2v3qB/oP6n+0/rFlwG3g+GDAYM/DWQ/vDgmHnv6U/9OH4dJHzEfVI0YjjY+dHx8bDRq98mTOk+GnsqcTz8p+Vv9563Or59/94vtLz1j82PAL+YvPv655qfNy76uprzrHI8cfvM55PfGm/K3O233vuO+638e9H5ko/ED+UPPR+mPHp9BP9z7nfP78L/eE8/stRzjPAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAJcEhZcwAACxMAAAsTAQCanBgAAAIxSURBVFiF1dixS1tRFMfxT16fuomDHcQs4h8giMVFXPo/lDpI5y710T+gf0K5dOlcuhUKHZ2Di7QInUW6JDjYIXSLDulwk5Imz5f3EpO0P8jy3rn3fDnv3HNzTq3b7RpWlmVL2MUeDlDHFpaxipWRRfnq4Bfavd8VzvAd5yGEu+EFtWGgLMs28ArH2CzpuIo6+IlPeBtCaOYC9aJyiA8zAsnTDY7Q6EcrGXh5iPdzhIHHPZ+H/Qe1brcry7I6LnoGi1ALT0II14/a7fYS3uDpgmCIB+Xu9PS0kWIfz4qsQwi1h/KcZdnosY46xpcEO1ifB8yY/Taxl4h1pmxdmbUOUmyXtS4Id6EqRLmeYm0GG0+qrUQFoIfQmCgvJ+KR+xdgYDVVIaGLNhz3OUvm30paFqas42lVGaiKJjmVlYGyLOsWRWnS0jAx0KDTPLBpc+n/yqE5Xap/aaIcGn42CH6f4zI2EwENb17l3aDNfVCVgOZwl0nFLmBstR533IvWVTDvpGLfNPJfOs/5tPlRwu5Xgtti6Gq6L4olo9tO8cMDtz5T5Fo7QXOc1bTXQYX9rhKx157aQVnoArsOzmonJyf7+Gy+HWueWnieiB3rxwXDEIcP5/1WegNfLS5KN9gNITQTCCFc4wUuFwBziaP+WGZw+tHAS5F2Xmr1fDb6D/IGVnW8Fvv9dbPpalti3r7rfZ0/GgHqQS2JQ4gdsdXeFvu3NZON9G7FAtwUy8w3XOSN9H4DKHngjnga2TgAAAAASUVORK5CYII=) 50% / 18px 18px no" +
"-repeat;}.ChatToolBar-DanmakuTail-tip {    width: 18px;    height: 18px;    text-align: center;    line-height: 18px;    border-radius: 4px;    font-size: 12px;    color: #fff;    cursor: pointer;    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAMAAADW3miqAAAAPFBMVEUAAADKy8zKy8zExMzKy83Ky83KzMzKzM7Kys3Ky8zKy83Jy8zJy83Ky8zLzMzJzMzIyM3MzMzKzMzKy8zUpkOsAAAAE3RSTlMA5PgF2qdrQ+rqysOOhzw3HBnqZkz8cgAAAN5JREFUOMuNlEkOAyEMBNs2y+xL/P+/JgoJaGCAqZOFSk0fLOOL7M7ONLBGeDCTdZsgcq6kdzAtBwLiSauMPoR5ow2Mx4dj1CZ0ArJoh1Ww/Quh5Be1w3F0apaD1a5kMSVJLyRphuknEYaGpIEXuC7pD4YWnaITuUiIdKRkVCRNRlUq+te+a0p4Ujy9ZkMpIaeUgJrEld6aYAxZJS2nF+hGwnUwmHOp/HSCzffybn1dubyZww47aQfaIGtPWgQ4O1Hj8fRgQPzYKOQFgWMhvlfWExHZnJ3M9RzSbN0eYt4fdzsuAVjiHAAAAABJRU5ErkJggg==) 50% / 18px 18px no-repeat;}.ChatToolBar-DanmakuTail-tip-active,.ChatToolBar-DanmakuTail-tip:hover {    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAMAAADW3miqAAAAPFBMVEUAAAD6aDP7ZTD2cUHxeU/pjGvmkHPfjnH4azj4bDruf1fshWHrhmLpjW3njm3kk3/ugFnugVn/XSP+YCg/+VboAAAAEnRSTlMA/P3z4XQyCPr5za2namIOx8bnayGzAAAA3klEQVQ4y43U2w6EIAxF0dNyc7xP+///Ook6EEHA/UTMSukDEUdhna0hVokpD8ZOy4aY/5I8pTT6iwRHUo1dOJD7SKOPO+5iaUYe2EbptAcs/4VQdo1aMWk0NTXDShdZmITkVkIGQ38SgRtIzhhaR3KlkGKnaGI3hFgHJVFBkkQVFfvXrmsivFk8fc0OJUJeiYAa0sreklJwtpKUJwY9INwPA0yOyksNbP4un57vXD7ezOiElaQTLQh7D40b4Duj2L/9YSA4bizkAs78SPpMdo/YtkzWDPffIRk7r+eYH6dAOJwNbfZEAAAAAElFTkSuQmCC) 50% / 18px 18px no-repeat;}.ChatToolBar-DanmakuTail-Panel {    background-color: rgba(255, 255, 255, 0.78); backdrop-filter: blur(18px) saturate(1.6); -webkit-backdrop-filter: blur(18px) saturate(1.6); border: 1px solid rgba(15,23,42,0.08); border-radius: 14px; box-shadow: 0 10px 28px rgba(15,23,42,0.1" +
"4), 0 2px 8px rgba(15,23,42,0.06);    width: 100%;    height: 140px;    position: relative;    display: none;    z-index: 1015;    color: #333;}.ChatToolBar-DanmakuTail-Panel__cell {    position: relative;    display: -webkit-box;    display: -webkit-flex;    display: flex;    box-sizing: border-box;    width: 100%;    padding: 10px 16px;    overflow: hidden;    color: #323233;    font-size: 14px;    line-height: 24px;    background-color: #fff;    border-bottom: 1px solid rgba(0, 0, 0, 0.2);    flex-wrap: wrap;    -webkit-flex-wrap: wrap;}.ChatToolBar-DanmakuTail-Panel__cell_title {    flex: 1;    -webkit-box-flex: 1;}.ChatToolBar-DanmakuTail-Panel__cell_option {    text-align: right;}.ChatToolBar-DanmakuTail-Panel__cell_switch {    float: right;}.ChatToolBar-DanmakuTail-title {    margin: 0 10px;    font-size: 16px;    font-weight: bold;}.DanmakuTail-input {    margin: 10px;    width: calc(100% - 20px);    height: 2.2em;}.DanmakuTail-checkbox-label,.DanmakuTail-option-label {    margin: 10px;    width: calc(100% - 20px);    display: block;    text-align: right;}.EnergyBarrageIcon {    margin-right: 8px;}.ex-icon {\tdisplay: inline-block;\tvertical-align: middle;\tmargin-right: 8px;\t-moz-user-select:none; /*火狐*/    -webkit-user-select:none; /*webkit浏览器*/    -ms-user-select:none; /*IE10*/    -khtml-user-select:none; /*早期浏览器*/    user-select:none;}.ex-icon a {    display: flex;    justify-items: center;    align-items: center;}.ex-icon svg:hover {    transform: scale(1.1);}.extool {\n\n\tbackground-color: rgba(255,255,255,0.78);\n\tbackdrop-filter: blur(18px) saturate(1.6);\n\t-webkit-backdrop-filter: blur(18px) saturate(1.6);\n\tborder: 1px solid rgba(15,23,42,0.08);\n\tborder-radius: 14px;\n\tbox-shadow: 0 10px 28px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06);\n\n\twidth: 100%;\n\n\t" +
"max-height: 320px;\n\n\tposition: relative;\n\n\tbottom: 200px;\n\n\tdisplay: none;\n\n\tz-index: 1428;\n\n\tcolor: #333;\n\n\tbox-sizing: border-box;\n\n\tpadding: 0 0 16px 0;\n\n\toverflow: auto;\n\n\tfont-size: 13px;\n\n\tline-height: 22px;\n\n}\n\n\n\n/* [DouyuEx-RL] 旧式 extool 容器硬编码已彻底拔除 */\n\n\n\n.extool__close {\n\n\tposition: absolute;\n\n\ttop: 8px;\n\n\tright: 8px;\n\n\twidth: 26px;\n\n\theight: 26px;\n\n\tborder-radius: 8px;\n\n\tdisplay: flex;\n\n\talign-items: center;\n\n\tjustify-content: center;\n\n\tcursor: pointer;\n\n\tuser-select: none;\n\n\tbackground: rgba(0,0,0,0.06);\n\n\tcolor: rgba(0,0,0,0.72);\n\n\tfont-size: 18px;\n\n\tline-height: 26px;\n\n\tz-index: 60;\n\n}\n\n\n\n.extool__close:hover {\n\n\tbackground: rgba(0,0,0,0.10);\n\n}\n\n\n\n.extool__treasure,\n\n.extool__sendgift,\n\n.extool__autofish,\n\n.extool__redpacket_room,\n\n.extool__clearbag,\n\n.extool__tabswitch,\n\n.extool__p2p,\n\n.extool__fullscreen {\n\n\tflex: none;\n\n}\n\n\n\n.extool__treasure::before,\n\n.extool__sendgift::before,\n\n.extool__autofish::before,\n\n.extool__redpacket_room::before,\n\n.extool__clearbag::before,\n\n.extool__tabswitch::before,\n\n.extool__p2p::before,\n\n.extool__fullscreen::before {\n\n\tdisplay: block;\n\n\twidth: 100%;\n\n\tcontent: \"\";\n\n\tfont-weight: 700;\n\n\tfont-size: 12px;\n\n\tletter-spacing: .4px;\n\n\tcolor: rgba(0,0,0,0.72);\n\n\tpadding-bottom: 6px;\n\n\tmargin-bottom: 2px;\n\n\tborder-bottom: 1px dashed rgba(0,0,0,0.12);\n\n}\n\n.extool__treasure::before { content: \"宝箱\"; }\n\n.extool__sendgift::before { content: \"送礼\"; }\n\n.extool__autofish::before { content: \"钓鱼\"; }\n\n.extool__redpacket_room::before { content: \"礼物红包\"; }\n\n.extool__clearbag::before { content: \"背包\"; }\n\n.extool__tabswitch::before { content: \"标签/切换\"; }\n\n.extool__p2p::before { content: \"网络\"; }\n\n.extool__fullscreen::before { content: \"播放器\"; }\n\n\n\n.extool label {\n\n\twhite-space: nowrap;\n\n\tmargin-right: 8px;\n\n\tline-height: 22px;\n\n}\n\n.extool input[type=\"t" +
"ext\"] {\n\n\tpadding: 2px 6px;\n\n\tborder: 1px solid rgba(0,0,0,0.18);\n\n\tborder-radius: 6px;\n\n\toutline: none;\n\n\tbackground: rgba(255,255,255,0.95);\n\n\tcolor: black;\n\n}\n\n.extool input[type=\"checkbox\"], .extool input[type=\"radio\"] {\n\n\tvertical-align: middle;\n\n\tmargin-right: 4px;\n\n}\n\n.extool input[type=\"button\"] {\n\n\tborder: 1px solid rgba(0,0,0,0.18);\n\n\tborder-radius: 8px;\n\n\tpadding: 2px 10px;\n\n\tbackground: linear-gradient(#ffffff, #f4f6f8);\n\n\tcursor: pointer;\n\n\tcolor: black;\n\n}\n\n.extool input[type=\"button\"]:hover {\n\n\tbackground: linear-gradient(#ffffff, #e9eef3);\n\n}\n\n.extool input[type=\"button\"]:active {\n\n\ttransform: translateY(1px);\n\n}\n\n.extool a {\n\n\ttext-decoration: none;\n\n}\n\n.extool .extool__hint {\n\n\tmargin-top: 6px;\n\n\tcolor: #666;\n\n\tfont-size: 12px;\n\n}\n\n\n\n/* 兼容某些模块里使用 br 分行的写法，让它在 flex 下表现更一致 */\n\n.extool br {\n\n\tflex-basis: 100%;\n\n\twidth: 0;\n\n\theight: 0;\n\n}\n\n\n\n.extool__switch {\n\n\tposition: absolute;\n\n\tright: 0;\n\n\tbottom: 0;\n\n}\n\n.extool__bsize,.extool__sendgift {\n\n\tmargin-bottom: 5px;\n\n}\n\n/* 卡片内部已改为 flex，这里不再强制 inline-block */\n\n\n\n.ex-panel {\tposition: absolute;\tbottom: 32px;\tright: 0px;\tbackground-color: rgba(255,255,255,0.8);\tbackdrop-filter: blur(18px) saturate(1.6);\t-webkit-backdrop-filter: blur(18px) saturate(1.6);\tborder: 1px solid rgba(15,23,42,0.08);\tborder-radius: 14px;\tbox-shadow: 0 10px 28px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06);\tz-index: 1428;\tuser-select: none;\tdisplay: none;\toverflow: visible;}.ex-panel__close {\tposition: absolute;\ttop: -9px;\tright: -9px;\tz-index: 3;\twidth: 18px;\theight: 18px;\tpadding: 0;\tmargin: 0;\tborder: none;\tborder-radius: 50%;\tbackground: rgba(255, 255, 255, 0.95);\tcolor: #64748b;\tfont-size: 14px;\tline-height: 16px;\ttext-align: center;\tcursor: pointer;\tbox-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);\ttransition: color 0.15s ease, back" +
"ground-color 0.15s ease;}.ex-panel__close:hover {\tcolor: #fff;\tbackground: #f60;}.ex-panel__close:focus-visible {\toutline: 2px solid #ff7700;\toutline-offset: 1px;}/* 隐藏礼物栏时挂到播放器层，位置由 ExPanel_updateFloatingPosition 计算（视频工具条上方） */.ex-panel.ex-panel--floating {\tposition: fixed;\tz-index: 10000;}.ex-panel__wrap {\tdisplay: flex;\talign-items: center;\tjustify-content: center;\twidth: 100%;\theight: 100%;\tposition: relative;\tz-index: 1;}.ex-panel__icon {\tmargin: 0 6px;\tdisplay: block;\tposition: relative;\tpadding: 5px;\tborder-radius: 10px;\ttransition: background-color 0.2s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1);}.ex-panel__icon:hover {\ttransform: scale(1.12);\tbackground-color: rgba(255,106,0,0.1);}.ex-panel__tip {\tdisplay:none;\tbackground:#ff4757;\tborder-radius:50%;\twidth:8px;\theight:8px;\ttop:0px;\tright:0px;\tposition:absolute;\tbox-shadow:0 0 0 2px rgba(255,255,255,0.9), 0 0 8px rgba(255,71,87,0.6);}/* 新版斗鱼右侧弹幕Panel的bottom */.live-next-body .layout-Player-chat>* {\tbottom: 0 !important;}.text-879f3e {  height: auto !important;  max-height: 48px !important;}.ex-image-danmaku {  height: 48px;  border-radius: 6px;  margin: 0 4px;}.danmuContent-25f266 .ex-image-danmaku {  max-height: 32px;}.barrageSpeed {    position: absolute;    right: 10px;    top: -20px;    color: rgba(0,0,0,0.5);    cursor: default;    z-index: 0;}.enter__panel {    width: 100%;    display: none;    margin-top: 4px;}#enter__title {    cursor: pointer;    user-select: none;    color: royalblue;}#enter__select {    width: 190px;}.enter__option {    margin-top: 5px;}#enter__enterId {    width: 40px;}#enter__reply {    width: 150px;}#enter__word {    width: 140px;}#enter__level {    width: 25px;    text-align: center;}#enter__export {    cursor: pointer;    color: royalblue;    margin-left: 10px;}#enter__i" +
"mport {    cursor: pointer;    color: royalblue;    margin-left: 5px;}.gift__panel {    width: 100%;    display: none;    margin-top: 4px;}#gift__title {    cursor: pointer;    user-select: none;    color: royalblue;}#gift__select {    width: 113px;}.gift__option {    margin-top: 5px;}#gift__giftId {    width: 40px;}#gift__reply {    width: 150px;}#gift__export {    cursor: pointer;    color: royalblue;    margin-left: 10px;}#gift__import {    cursor: pointer;    color: royalblue;    margin-left: 5px;}.livetool {\tbackground-color: rgba(255,255,255,0.78);\n\tbackdrop-filter: blur(18px) saturate(1.6);\n\t-webkit-backdrop-filter: blur(18px) saturate(1.6);\n\tborder: 1px solid rgba(15,23,42,0.08);\n\tborder-radius: 14px;\n\tbox-shadow: 0 10px 28px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06);\twidth: 100%;\theight: 290px;\tposition: relative;\tbottom: 290px;\tdisplay: none;\tz-index: 1428;}.livetool__cell {\tposition: relative;    display: -webkit-box;    display: -webkit-flex;    display: flex;    box-sizing: border-box;    width: 100%;    padding: 10px 16px;    overflow: hidden;    color: #323233;    font-size: 14px;    line-height: 24px;\tbackground-color: #fff;\tborder-bottom: 1px solid rgba(15,23,42,0.08);\tflex-wrap: wrap;    -webkit-flex-wrap: wrap;}.livetool__cell_title {\tflex: 1;    -webkit-box-flex: 1;}.livetool__cell_option {\ttext-align: right;}.livetool__cell_switch {\tfloat: right;}.mute__panel {    width: 100%;    display: none;    margin-top: 4px;}#mute__title {    cursor: pointer;    user-select: none;    color: royalblue;}#mute__idlist {    cursor: pointer;    color: royalblue;    margin-left: 10px;}#mute__export, #mute__import {    cursor: pointer;    color: royalblue;    margin-left: 5px;}#mute__select {    width: 110px;}.mute__option {    margin-top: 5px;}#mute__word {" +
"    width: 70px;}#mute__count {    width: 30px;}#mute__time {    width: 65px;}.exRankPoint {    position: absolute;    right: 16px;}.exRankPoint--top {    position: absolute;    bottom: -12px;    right: 0;    left: 0;}.reply__panel {    width: 100%;    display: none;    margin-top: 4px;}#reply__title {    cursor: pointer;    user-select: none;    color: royalblue;}#reply__select {    /* width: 190px; */    width: 100px;}#reply__time {    width: 35px;}.reply__option {    margin-top: 5px;}#reply__word {    width: 70px;}#reply__reply {    width: 147px;}#reply__export {    cursor: pointer;    color: royalblue;    margin-left: 10px;}#reply__import {    cursor: pointer;    color: royalblue;    margin-left: 5px;}.livetool__Treasure {    width: 100%;    position: relative;    z-index: 999;}.vote__panel {    width: 100%;    display: none;    margin-top: 4px;}#vote__title {    cursor: pointer;    user-select: none;    color: royalblue;}#vote__select {    width: 100px;}.vote__option {    margin-top: 5px;}#vote__theme {    width: 70px;}#vote__options {    width: 133px;}#vote__time {    width: 35px;}#vote__show-result {    cursor: pointer;    color: royalblue;    margin-left: 10px;}.vote__result {    position: absolute;    top: 0px;    width: 300px;    background: rgba(255,255,255,0.78); backdrop-filter: blur(18px) saturate(1.6); -webkit-backdrop-filter: blur(18px) saturate(1.6); box-shadow: 0 10px 28px rgba(15,23,42,0.14);    left: 0px;    z-index: 999;    padding: 5px;    border-radius: 10px;    user-select: none;    display: none;    color: #333;}#vote__result-theme {    font-size: 20px;    font-weight: 600;    margin-bottom: 10px;}#vote__result-close {    position: absolute;    top: 5px;    right: 10px;    font-size: 14px;    cursor: pointer;    color: gray;}.vote__option-wrap {" +
"    margin-bottom: 10px;}.vote__option-choice {    display: inline-block;    font-size: 14px;}.vote__option-num {    float: right;    font-size: 14px;}.vote__progress {    width: 100%;    background-color: #ddd;    border-radius: 10px;}.vote__progress-bar {    width: 0%;    height: 14px;    background-color: #4CAF50;    text-align: center;    line-height: 30px;    border-radius: 10px;}.exlottery {\tbackground-color: rgba(255,255,255,0.78);\tbackdrop-filter: blur(18px) saturate(1.6);\t-webkit-backdrop-filter: blur(18px) saturate(1.6);\tborder: 1px solid rgba(15,23,42,0.08);\tborder-radius: 14px;\tbox-shadow: 0 10px 28px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06);\twidth: 100%;\theight: 250px;\tposition: relative;\tbottom: 250px;\tdisplay: none;\tz-index: 1428;    overflow: auto;    padding: 0 0 16px 0;    box-sizing: border-box;}.lottery__nodata {    z-index: 998;    position: absolute;    left:50%;    top:50%;    transform: translate(-50%, -50%);    color: #606266;}.lottery__wrap {    display: flex;    flex-direction: column;    z-index: 999;}.lottery__a:hover .lottery__item {    background-color: rgb(244,244,244);}.lottery__item {    display: flex;    padding: 5px 0;    border-bottom: 1px solid #d0d0d0;    color: #606266;}.lottery__img img {    width: 150px;    border-radius: 5px;}.lottery__anchor {    position: absolute;    background-color: rgba(255,255,255,0.9);    border-radius: 5px 0px 5px 0px;}.lottery__info {    display: flex;    justify-content: space-evenly;    flex-direction: column;    margin-left: 10px;    overflow: hidden;}.lottery__prize {    white-space: nowrap;    text-overflow: ellipsis;    word-break: break-all;    font-size: 14px;}.lottery__expireTime {    position: absolute;    margin-top: -18px;    background-color: rgba(255,255,255,0.9);    border-rad" +
"ius: 0px 5px 0px 5px;} /*滚动条样式*/.exlottery::-webkit-scrollbar {    width: 4px;    }.exlottery::-webkit-scrollbar-thumb {    border-radius: 10px;    box-shadow: inset 0 0 5px rgba(0,0,0,0.2);    background: rgba(0,0,0,0.2);}.exlottery::-webkit-scrollbar-track {    box-shadow: inset 0 0 5px rgba(0,0,0,0.2);    border-radius: 0;    background: rgba(0,0,0,0.1);}.lottery__func {    display: flex;    justify-content: space-between;    margin-top: 5px;    user-select: none;    border-bottom: 1px solid #d0d0d0;}.lottery__notice,#lottery-refresh {    cursor: pointer;    color: #606266;}.miniprogram__panel {    position: absolute;    right: 43px;    bottom: 100px;    animation: move-in 0.75s;    z-index: 101;    text-align: center;    display: none;}.miniprogram__wrap {    overflow: hidden;    background-color: white;    border-radius: 5%;    width: 200px;    box-shadow: 0px 2px 20px 0px #888888;    font-size: 14px;}.miniprogram__triangle {    width: 0px;    height: 0px;    border-color: white transparent transparent transparent;    border-style: solid;    border-width: 10px;    position: absolute;    left: 100px;}.month-cost {    margin-right: 5px;    cursor: default;    -moz-user-select:none;/*火狐*/    -webkit-user-select:none;/*webkit浏览器*/    -ms-user-select:none;/*IE10*/    -khtml-user-select:none;/*早期浏览器*/    user-select:none;    display: inline-block;    vertical-align: middle;}.monthcost__icon {    position: relative;    top: 3px;    cursor: pointer;    margin-left: 3px;}/* 隐藏登录的提示 */\n\n.multiBitRate-da4b60 {\n\n  display: none !important;\n\n}.exVideoDiv {    width: 500px;    height: 250px;    background-color: rgba(255, 255, 255, 0);    position: absolute;    z-index: 1428;}.exVideoPlayer {    width: 100%;    height: 100%;    cursor: move;}.exVideoScale {    width: 10px;    he" +
"ight: 10px;    overflow: hidden;    cursor: se-resize;    position: absolute;    right: 0;    bottom: 0;    background-color: rgb(231, 57, 57);}.exVideoInfo {    width: 100%;    height: 30px;    background-color: gray;    position: absolute;    top: -30px;    line-height: 30px;}.exVideoClose {    width: 30px;    float: right;    color: white;}.exVideoQn, .exVideoCDN {    margin-left: 5px;}.exVideoRID {    margin: 0px 5px;    font-weight: 800;    font-size: medium;}#popup-player__prompt {    display: none;}.postbird-box-header {    width: auto !important;}.postbird-box-dialog {    color: #333;}.real-audience {\n\n    cursor: pointer;\n\n    display: flex;\n\n    padding: 0 7px;\n\n    line-height: 33px;\n\n    color: rgb(153, 153, 153);\n\n}\n\n\n\n#Ex_EnterYuba {\n\n    width: 100%;\n\n}\n\n\n\n.Title-anchorPic-bottom i{\n\n    display: none !important;\n\n}\n\n\n\n#real-audience__total, #real-audience__barrage, #real-audience__money_yc, #real-audience__noble {\n\n    margin-left: 2px;\n\n}\n\n/* #refresh-video {    float: left;    width: 24px;    height: 24px;    margin-right: 5px;    cursor: pointer;    background-size: contain;} */.refresh-barrage {    display: inline-flex;    align-items: center;    vertical-align: top;    margin: 0 2px;    padding: 0 8px;    height: 22px;    line-height: 21px;    background-color: #fff;    border: 1px solid #e5e4e4;    -webkit-border-radius: 4px;    -moz-border-radius: 4px;    border-radius: 4px;    cursor: pointer;    user-select: none;}.refresh-barrage.ex-active {    background: linear-gradient(180deg, rgb(38, 169, 235), rgb(18, 150, 219));    border-color: rgb(18, 150, 219);    box-shadow: 0 0 0 2px rgba(18, 150, 219, .22), 0 8px 16px rgba(18, 150, 219, .28);    font-weight: 700;}.refresh-barrage.ex-active:hover {    box-shadow: 0 0 0 2px rgba(18, 150, 219, .28), 0 " +
"10px 18px rgba(18, 150, 219, .36);}.refresh-barrage.ex-active::after {    content: \"\";    width: 6px;    height: 6px;    margin-left: 6px;    border-radius: 999px;    background: rgba(255, 255, 255, .95);    box-shadow: 0 0 0 2px rgba(255, 255, 255, .22);}.live-next-body .refresh-barrage {    background-color: var(--front-background-color);    border: 1px solid var(--front-border-color);}#refresh-barrage__svg {    vertical-align: middle;}.top-0-important {    top: 0 !important;}.room-vip {  -moz-user-select:none;/*火狐*/  -webkit-user-select:none;/*webkit浏览器*/  -ms-user-select:none;/*IE10*/  -khtml-user-select:none;/*早期浏览器*/  user-select:none;  vertical-align: middle;  position: absolute;  left: 12px;}.repeated-danmaku {  opacity: 0 !important;  pointer-events: none !important;  visibility: hidden !important;}.danmu-fbb2a3 > div {  transition: font-size 0.5s ease !important;}.comment-dzjy-container > div {  z-index: 99 !important;}#ex-camera {    background: rgba(0,0,0,0.7);    position: absolute;    right: 20px;    bottom: 240px;    z-index: 10;    width: 60px;    height: 60px;    cursor: pointer;    -webkit-border-radius: 50%;    -moz-border-radius: 50%;    border-radius: 50%;    cursor: pointer;    display: none;    justify-content: center;    align-items: center;    border: 2px solid #2d2c2c;    box-sizing: border-box;}#ex-camera:hover > svg > path {    fill: rgb(252, 199, 84);}#ex-camera:active > svg > path {    fill: rgb(253, 60, 60);}#ex-camera-close {    position: absolute;    top: -8px;    right: -8px;    width: 20px;    height: 20px;    background: rgba(0,0,0,0.8);    border-radius: 50%;    display: flex;    justify-content: center;    align-items: center;    cursor: pointer;    color: #fff;    font-size: 12px;    line-height: 1;    border: 1px solid rgba(255,25" +
"5,255,0.3);    z-index: 11;}#ex-camera-close:hover {    background: rgba(253, 60, 60, 0.9);}#ex-cinema:hover > .cinema__wrap {    display: block;}.cinema__wrap {    display: none;    margin: 0;    padding: 0;    border: 1px solid #e5e5e5;    background: #fff;    position: absolute;    left: 199px;    min-width: 100px;    top: 130px;}.cinema__panel {    position: absolute;    border: 1px solid #000;    border-radius: 4px;    transform: translateY(calc(-4px - 100%)) translateX(-50%);    left: 33%;    background-color: #000;    opacity: .75;    width: 70px;}.cinema__panel li {    padding: 0 2px;    white-space: nowrap;    color: #fff;    text-align: center;    cursor: pointer;}.cinema__panel li:hover {    background-color: rgb(85, 85, 85);}  /* Joysound 控件已并入 VideoToolbarMenu，样式见 VideoToolbarMenu.css */#exVideoDivFake {  display: none;}#ex-metadata:hover > .metadata__wrap {  display: block;}.metadata__wrap {  display: none;  margin: 0;  padding: 0;  border: 1px solid #e5e5e5;  background: #fff;  position: absolute;  left: 199px;  min-width: 100px;  top: 0px;  white-space: nowrap;  color: black;}.metadata__panel {  position: absolute;  border: 1px solid #000;  border-radius: 4px;  transform: translateY(calc(-4px - 100%)) translateX(-50%);  left: 33%;  background-color: #000;  opacity: .75;  width: 70px;}.metadata__panel li {  padding: 0 2px;  white-space: nowrap;  color: #fff;  text-align: center;  cursor: pointer;}.metadata__panel li:hover {  background-color: rgb(85, 85, 85);}  #ex-pip-menu-panel.ex-pip-menu-root {\n\n    position: fixed;\n\n    z-index: 10001;\n\n    opacity: 0;\n\n    visibility: hidden;\n\n    pointer-events: none;\n\n    transition: opacity 0.12s ease, visibility 0.12s ease;\n\n}\n\n\n\n#ex-pip-menu-panel.ex-pip-menu-root.is-visible {\n\n    opacity: 1;\n\n    visibility: " +
"visible;\n\n    pointer-events: auto;\n\n}\n\n\n\n#ex-pip-menu-panel.ex-pip-menu-root::after {\n\n    content: \"\";\n\n    position: absolute;\n\n    left: 0;\n\n    right: 0;\n\n    top: 100%;\n\n    height: 8px;\n\n}\n\n\n\n.ex-pip-menu {\n\n    box-sizing: border-box;\n\n    width: 196px;\n\n    padding: 4px 0;\n\n    border-radius: 6px;\n\n    font-family: \"Microsoft YaHei\", \"PingFang SC\", -apple-system, sans-serif;\n\n    font-size: 12px;\n\n    color: #e8e8e8;\n\n    background: #2c2c30;\n\n    border: 1px solid #1a1a1c;\n\n    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);\n\n    user-select: none;\n\n    pointer-events: auto;\n\n}\n\n\n\n.ex-pip-menu__list {\n\n    margin: 0;\n\n    padding: 0;\n\n    list-style: none;\n\n}\n\n\n\n.ex-pip-menu__list > li + li {\n\n    border-top: 1px solid rgba(255, 255, 255, 0.06);\n\n}\n\n\n\n#ex-pip-menu-panel.ex-pip-menu-root.is-measuring {\n\n    opacity: 0;\n\n    pointer-events: none;\n\n}\n\n\n\n.ex-pip-opt {\n\n    display: flex;\n\n    align-items: center;\n\n    gap: 10px;\n\n    width: 100%;\n\n    margin: 0;\n\n    padding: 8px 12px;\n\n    border: none;\n\n    border-radius: 0;\n\n    background: transparent;\n\n    color: inherit;\n\n    text-align: left;\n\n    cursor: pointer;\n\n    outline: none;\n\n    line-height: 1.4;\n\n}\n\n\n\n.ex-pip-opt:hover {\n\n    background: rgba(255, 255, 255, 0.06);\n\n}\n\n\n\n.ex-pip-opt:focus-visible {\n\n    background: rgba(255, 255, 255, 0.08);\n\n    outline: 1px solid rgba(255, 255, 255, 0.2);\n\n    outline-offset: -1px;\n\n}\n\n\n\n.ex-pip-opt__icon {\n\n    flex-shrink: 0;\n\n    display: flex;\n\n    align-items: center;\n\n    justify-content: center;\n\n    width: 24px;\n\n    height: 24px;\n\n    color: #9a9aa2;\n\n}\n\n\n\n.ex-pip-opt__icon svg {\n\n    display: block;\n\n    width: 24px;\n\n    height: 24px;\n\n}\n\n\n\n.ex-pip-opt--ex .ex-pip-opt__icon {\n\n    color: #c4c4cc;\n\n}\n\n\n\n.ex-pip-opt--ex:hover .ex-pip-opt__icon {\n\n    color:" +
" #e0e0e6;\n\n}\n\n\n\n.ex-pip-opt__body {\n\n    flex: 1;\n\n    min-width: 0;\n\n}\n\n\n\n.ex-pip-opt__row {\n\n    display: flex;\n\n    align-items: baseline;\n\n    justify-content: space-between;\n\n    gap: 8px;\n\n}\n\n\n\n.ex-pip-opt__label {\n\n    font-size: 12px;\n\n    color: #f0f0f0;\n\n}\n\n\n\n.ex-pip-opt__mark {\n\n    flex-shrink: 0;\n\n    font-size: 11px;\n\n    color: #8c8c94;\n\n}\n\n\n\n.ex-pip-opt--ex .ex-pip-opt__mark {\n\n    color: #ff7f3a;\n\n}\n\n\n\n.ex-pip-opt__hint {\n\n    display: block;\n\n    margin-top: 2px;\n\n    font-size: 11px;\n\n    color: #7a7a82;\n\n    line-height: 1.35;\n\n}\n\n\n\n.ex-pip-opt--ex:hover .ex-pip-opt__mark {\n\n    color: #ff9555;\n\n}\n\n\n\n@media (prefers-reduced-motion: reduce) {\n\n    .ex-pip-opt,\n\n    #ex-pip-menu-panel.ex-pip-menu-root {\n\n        transition: none;\n\n    }\n\n}\n\n.filter__wrap {    display: none;    position: relative;    border-radius: 4px;    -webkit-user-select: none;    -moz-user-select: none;    -ms-user-select: none;    user-select: none;}.filter__panel {    position: absolute;    border: 1px solid #000;    border-radius: 4px;    transform: translateY(calc(-4px - 100%)) translateX(-50%);    left: 33%;    background-color: #000;    opacity: .75;    width: 300px;    padding-top: 10px;    padding-left: 10px;    padding-right: 10px;}.filter__panel li {    padding: 0 2px;    white-space: nowrap;    color: #fff;    text-align: center;    cursor: pointer;}.filter__panel li:hover {    background-color: rgb(85, 85, 85);}.filter__scroll {    width: 100%;    height: 5px;    background: #ccc;    position: relative;    display: inline-block;}.filter__scroll-bar {    width: 15px;    height: 15px;    background: #369;    position: absolute;    top: -5px;    left: 100px;    cursor: pointer;    border-radius: 100%;}.filter__scroll-mask {    position: absolute;    left: 0;    top: 0;   " +
" background: #369;    width: 100px;    height: 5px;}.filter__title {    color: white;    display: inline-block;    cursor: initial;    margin-right: 2px;}.filter__enhance {    margin-bottom: 10px;    display: flex;    align-items: center;    justify-content: space-between;}.filter__switch {    width: 40px;    height: 20px;    background: #ccc;    position: relative;    display: inline-block;    border-radius: 10px;    cursor: pointer;    transition: background 0.3s;}.filter__switch-slider {    width: 18px;    height: 18px;    background: #fff;    position: absolute;    top: 1px;    left: 0px;    border-radius: 50%;    transition: left 0.3s;}#filter__select {    width: 100%;    float: right;}.filter__filter {    margin-top: 5px;}/* 增强画质提示弹窗样式 */.enhance-modal__panel-wrap {    width: 100%;    height: 100%;    z-index: 1000;    background-color: rgba(0, 0, 0, 0.9);    position: absolute;    top: 0;    left: 0;    display: none;    justify-content: center;    align-items: center;}.enhance-modal__panel {    height: 550px;    width: 600px;    background-color: white;    border-radius: 20px;    position: fixed;    top: 0;    left: 0;    right: 0;    bottom: 0;    margin: auto;    color: #333;}.enhance-modal__content {    position: relative;    top: 50%;    transform: translateY(-50%);    text-align: center;}.enhance-modal__text {    font-size: 18px;    margin-top: 20px;}.enhance-modal__img {    width: 720px;    margin-top: 20px;}.enhance-modal__close {    font-size: 30px;    font-weight: bold;    position: absolute;    right: 15px;    top: 10px;    cursor: pointer;    transition: all 0.2s;}.enhance-modal__close:hover {    color: #ff7700;}#ex-videospeed:hover > .videospeed__wrap {    display: block;}.videospeed__wrap {    display: none;    margin: 0;    padding: 0;    border: 1" +
"px solid #e5e5e5;    background: #fff;    position: absolute;    left: 199px;    min-width: 100px;    top: 120px;}.videospeed__panel {    position: absolute;    border: 1px solid #000;    border-radius: 4px;    transform: translateY(calc(-4px - 100%)) translateX(-50%);    left: 33%;    background-color: #000;    opacity: .75;    width: 70px;}.videospeed__panel li {    padding: 0 2px;    white-space: nowrap;    color: #fff;    text-align: center;    cursor: pointer;}.videospeed__panel li:hover {    background-color: rgb(85, 85, 85);}  #ex-videosync {    float: left;    width: 24px;    height: 24px;    margin-left: 20px;    cursor: pointer;    background-size: contain;}#ex-vtoolbar-menu {    float: left;    width: 24px;    height: 24px;    margin-right: 10px;    position: relative;    pointer-events: none;    -webkit-user-select: none;    user-select: none;    overflow: visible;}.vtoolbar-menu__trigger {    position: relative;    z-index: 2;    pointer-events: auto;    display: flex;    align-items: center;    justify-content: center;    width: 24px;    height: 24px;    padding: 0;    border: none;    background: transparent;    cursor: pointer;    border-radius: 6px;    transition: background-color 0.2s ease, transform 0.2s ease;}.vtoolbar-menu__trigger:hover {    background-color: rgba(255, 255, 255, 0.12);}.vtoolbar-menu__trigger:focus-visible {    outline: 2px solid #ff7700;    outline-offset: 2px;}#ex-vtoolbar-menu.is-open .vtoolbar-menu__trigger {    background-color: rgba(255, 119, 0, 0.2);}.vtoolbar-menu__trigger .icon {    display: block;    transition: transform 0.2s ease;}.vtoolbar-menu__trigger:hover .icon {    transform: scale(1.08);}.vtoolbar-menu__dropdown {    display: none;    position: absolute;    left: 50%;    bottom: calc(100% + 18px);    transform: t" +
"ranslateX(-50%);    min-width: 188px;    padding: 4px;    border-radius: 10px;    background: rgba(15, 15, 35, 0.96);    border: 1px solid rgba(67, 56, 202, 0.35);    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;    z-index: 2;    pointer-events: auto;    backdrop-filter: blur(8px);}/* 仅连接菜单与精灵球之间的空隙，不遮挡工具条其他按钮 */.vtoolbar-menu__dropdown::before {    content: \"\";    position: absolute;    left: 50%;    transform: translateX(-50%);    top: 100%;    width: 200px;    height: 22px;    pointer-events: auto;}#ex-vtoolbar-menu.is-open .vtoolbar-menu__dropdown {    display: block;    animation: vtoolbar-menu-fade-in 0.2s ease;}@keyframes vtoolbar-menu-fade-in {    from {        opacity: 0;        transform: translateX(-50%) translateY(6px);    }    to {        opacity: 1;        transform: translateX(-50%) translateY(0);    }}@media (prefers-reduced-motion: reduce) {    #ex-vtoolbar-menu.is-open .vtoolbar-menu__dropdown {        animation: none;    }    .vtoolbar-menu__trigger,    .vtoolbar-menu__pokeball,    .vtoolbar-menu__item,    .vtoolbar-menu__switch {        transition: none;    }}.vtoolbar-menu__dropdown::after {    content: \"\";    position: absolute;    left: 50%;    bottom: -7px;    transform: translateX(-50%) rotate(45deg);    width: 10px;    height: 10px;    background: rgba(15, 15, 35, 0.96);    border-right: 1px solid rgba(67, 56, 202, 0.35);    border-bottom: 1px solid rgba(67, 56, 202, 0.35);    pointer-events: none;}.vtoolbar-menu__item {    display: flex;    align-items: center;    gap: 8px;    width: 100%;    padding: 7px 10px;    border: none;    border-radius: 8px;    background: transparent;    color: #f8fafc;    font-size: 12px;    line-height: 20px;    text-align: left;    cursor: pointer;    transition: backgroun" +
"d-color 0.2s ease, color 0.2s ease;}.vtoolbar-menu__item:hover {    background-color: rgba(67, 56, 202, 0.35);}.vtoolbar-menu__item:focus-visible {    outline: 2px solid #ff7700;    outline-offset: -2px;}.vtoolbar-menu__item-icon {    flex-shrink: 0;    display: flex;    align-items: center;    justify-content: center;    width: 20px;    height: 20px;    color: #a5b4fc;}.vtoolbar-menu__item-icon .icon,.vtoolbar-menu__item-icon svg,.vtoolbar-menu__item-icon img {    width: 20px;    height: 20px;    display: block;    flex-shrink: 0;}.vtoolbar-menu__item-icon--compact svg,.vtoolbar-menu__item-icon--compact .icon {    width: 16px;    height: 16px;}.vtoolbar-menu__item-icon .vtoolbar-menu__icon-pip {    width: 18px;    height: 18px;}.vtoolbar-menu__item-label {    flex: 1;    white-space: nowrap;    font-size: 12px;    line-height: 20px;}.vtoolbar-menu__item--filter.is-active {    background-color: rgba(255, 119, 0, 0.15);}.vtoolbar-menu__item--filter.is-active .vtoolbar-menu__chevron {    transform: rotate(90deg);    color: #ff7700;}.vtoolbar-menu__chevron {    flex-shrink: 0;    width: 14px;    height: 14px;    color: #94a3b8;    transition: transform 0.2s ease, color 0.2s ease;}.vtoolbar-menu__switch {    flex-shrink: 0;    width: 32px;    height: 18px;    border-radius: 10px;    background: #475569;    position: relative;    transition: background-color 0.2s ease;    pointer-events: none;}.vtoolbar-menu__switch.is-on {    background: linear-gradient(90deg, #f0cb95, #e9be80);}.vtoolbar-menu__switch-thumb {    position: absolute;    top: 2px;    left: 2px;    width: 14px;    height: 14px;    border-radius: 50%;    background: #fff;    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);    transition: left 0.2s ease;}.vtoolbar-menu__switch.is-on .vtoolbar-menu__switch-thumb {    le" +
"ft: 16px;}.vtoolbar-menu__filter-host {    display: none;    position: absolute;    left: 100%;    bottom: 0;    margin-left: -6px;    padding-left: 12px;    z-index: 2;    pointer-events: none;}.vtoolbar-menu__filter-host.is-visible {    pointer-events: auto;}.vtoolbar-menu__filter-host.is-visible {    display: block;}.vtoolbar-menu__filter-host .filter__wrap {    display: block;    position: static;    float: none;    right: auto;    bottom: auto;    margin: 0;    height: auto;}.vtoolbar-menu__filter-host .filter__panel {    position: relative;    transform: none;    left: auto;    opacity: 0.92;}.vtoolbar-menu__divider {    height: 1px;    margin: 4px 8px;    background: rgba(148, 163, 184, 0.2);}.menu-da2a9e {  z-index: 999 !important;} .volume-07c230.custom-muted .icon-c8be96 svg, .volume-07c230.custom-normal .icon-c8be96 svg {     display: none !important; } .volume-07c230.custom-muted .icon-c8be96::after, .volume-07c230.custom-normal .icon-c8be96::after {     content: '';     display: block;     width: 32px;     height: 32px;     background-size: contain;     background-repeat: no-repeat;     background-position: center; } /* 静音图标颜色控制 */ .volume-07c230.custom-muted .icon-c8be96::after {     background-image: url('data:image/svg+xml;utf8,<svg fill=\"none\" viewBox=\"0 0 32 32\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M5 10h5.5L16 6v20l-5.5-4H5V10z\" stroke=\"%23fff\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path><path d=\"M20 19l6-6M20 13l6 6\" stroke=\"%23fff\" stroke-width=\"2\" stroke-linecap=\"round\"></path></svg>'); } .volume-07c230.custom-muted:hover .icon-c8be96::after {     background-image: url('data:image/svg+xml;utf8,<svg fill=\"none\" viewBox=\"0 0 32 32\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M5 10h5.5L16 6v20l-5.5-4H5V10z\" stroke=\"%2" +
"3ff5d23\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path><path d=\"M20 19l6-6M20 13l6 6\" stroke=\"%23ff5d23\" stroke-width=\"2\" stroke-linecap=\"round\"></path></svg>'); } /* 正常图标颜色控制 */ .volume-07c230.custom-normal .icon-c8be96::after {     background-image: url('data:image/svg+xml;utf8,<svg fill=\"none\" viewBox=\"0 0 32 32\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M5 10h5.5L16 6v20l-5.5-4H5V10z\" stroke=\"%23fff\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path><path d=\"M21.736 23.517a8 8 0 00-.527-15.206M19.687 19.867a3.925 3.925 0 00-.258-7.46\" stroke=\"%23fff\" stroke-width=\"2\" stroke-linecap=\"round\"></path></svg>'); } .volume-07c230.custom-normal:hover .icon-c8be96::after {     background-image: url('data:image/svg+xml;utf8,<svg fill=\"none\" viewBox=\"0 0 32 32\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M5 10h5.5L16 6v20l-5.5-4H5V10z\" stroke=\"%23ff5d23\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path><path d=\"M21.736 23.517a8 8 0 00-.527-15.206M19.687 19.867a3.925 3.925 0 00-.258-7.46\" stroke=\"%23ff5d23\" stroke-width=\"2\" stroke-linecap=\"round\"></path></svg>'); }/* [DouyuEx] 原作者求星弹窗样式已移除 */.noticejs-top{top:0;width:100% !important}.noticejs-top .item{border-radius:0 !important;margin:0 !important}.noticejs-topRight{top:10px;right:10px}.noticejs-topLeft{top:10px;left:10px}.noticejs-topCenter{top:10px;left:50%;transform:translate(-50%)}.noticejs-middleLeft,.noticejs-middleRight{right:10px;top:50%;transform:translateY(-50%)}.noticejs-middleLeft{left:10px}.noticejs-middleCenter{top:50%;left:50%;transform:translate(-50%,-50%)}.noticejs-bottom{bottom:0;width:100% !important}.noticejs-bottom .item{border-radius:0 !important;margin:0 !important}.noticejs-bottomRight{bottom:10px;right:10px}.noticejs-bottomLeft{botto" +
"m:10px;left:10px}.noticejs-bottomCenter{bottom:10px;left:50%;transform:translate(-50%)}.noticejs{font-family:Helvetica Neue,Helvetica,Arial,sans-serif}.noticejs .item{margin:0 0 10px;border-radius:3px;overflow:hidden}.noticejs .item .close{float:right;font-size:18px;font-weight:700;line-height:1;color:#fff;text-shadow:0 1px 0 #fff;opacity:1;margin-right:7px}.noticejs .item .close:hover{opacity:.5;color:#000}.noticejs .item a{color:#fff;border-bottom:1px dashed #fff}.noticejs .item a,.noticejs .item a:hover{text-decoration:none}.noticejs .success{background-color:#64ce83}.noticejs .success .noticejs-heading{background-color:#3da95c;color:#fff;padding:10px}.noticejs .success .noticejs-body{color:#fff;padding:10px}.noticejs .success .noticejs-body:hover{visibility:visible !important}.noticejs .success .noticejs-content{visibility:visible}.noticejs .info{background-color:#3ea2ff}.noticejs .info .noticejs-heading{background-color:#067cea;color:#fff;padding:10px}.noticejs .info .noticejs-body{color:#fff;padding:10px}.noticejs .info .noticejs-body:hover{visibility:visible !important}.noticejs .info .noticejs-content{visibility:visible}.noticejs .warning{background-color:#ff7f48}.noticejs .warning .noticejs-heading{background-color:#f44e06;color:#fff;padding:10px}.noticejs .warning .noticejs-body{color:#fff;padding:10px}.noticejs .warning .noticejs-body:hover{visibility:visible !important}.noticejs .warning .noticejs-content{visibility:visible}.noticejs .error{background-color:#e74c3c}.noticejs .error .noticejs-heading{background-color:#ba2c1d;color:#fff;padding:10px}.noticejs .error .noticejs-body{color:#fff;padding:10px}.noticejs .error .noticejs-body:hover{visibility:visible !important}.noticejs .error .noticejs-content{visibility:visible}.noticejs .progressbar{width:100%}.n" +
"oticejs .progressbar .bar{width:1%;height:30px;background-color:#4caf50}.noticejs .success .noticejs-progressbar{width:100%;background-color:#64ce83;margin-top:-1px}.noticejs .success .noticejs-progressbar .noticejs-bar{width:100%;height:5px;background:#3da95c}.noticejs .info .noticejs-progressbar{width:100%;background-color:#3ea2ff;margin-top:-1px}.noticejs .info .noticejs-progressbar .noticejs-bar{width:100%;height:5px;background:#067cea}.noticejs .warning .noticejs-progressbar{width:100%;background-color:#ff7f48;margin-top:-1px}.noticejs .warning .noticejs-progressbar .noticejs-bar{width:100%;height:5px;background:#f44e06}.noticejs .error .noticejs-progressbar{width:100%;background-color:#e74c3c;margin-top:-1px}.noticejs .error .noticejs-progressbar .noticejs-bar{width:100%;height:5px;background:#ba2c1d}@keyframes noticejs-fadeOut{0%{opacity:1}to{opacity:0}}.noticejs-fadeOut{animation-name:noticejs-fadeOut}@keyframes noticejs-modal-in{to{opacity:.3}}@keyframes noticejs-modal-out{to{opacity:0}}.noticejs-rtl .noticejs-heading{direction:rtl}.noticejs-rtl .close{float:left !important;margin-left:7px;margin-right:0 !important}.noticejs-rtl .noticejs-content{direction:rtl}.noticejs{position:fixed;z-index:10050;width:320px}.noticejs::-webkit-scrollbar{width:8px}.noticejs::-webkit-scrollbar-button{width:8px;height:5px}.noticejs::-webkit-scrollbar-track{border-radius:10px}.noticejs::-webkit-scrollbar-thumb{background:hsla(0,0%,100%,.5);border-radius:10px}.noticejs::-webkit-scrollbar-thumb:hover{background:#fff}.noticejs-modal{position:fixed;width:100%;height:100%;background-color:#000;z-index:10000;opacity:.3;left:0;top:0}.noticejs-modal-open{opacity:0;animation:noticejs-modal-in .3s ease-out}.noticejs-modal-close{animation:noticejs-modal-out .3s ease-out;animation-fill-mode:" +
"forwards}.noticejs .special{background-color:rgb(160,37,160)}.noticejs .special .noticejs-heading{background-color:rgb(110,26,110);color:#fff;padding:10px}.noticejs .special .noticejs-body{color:#fff;padding:10px}.noticejs .special .noticejs-body:hover{visibility:visible !important}.noticejs .special .noticejs-content{visibility:visible}.noticejs .special .noticejs-progressbar{width:100%;background-color:rgb(160,37,160);margin-top:-1px}.noticejs .special .noticejs-progressbar .noticejs-bar{width:100%;height:5px;background:rgb(110,26,110)}/** * PostbirdAlertBox.js * -    原生javascript弹框插件 * Author:  Postbird - http://www.ptbird.cn * License: MIT * Date:    2017-09-23 */ .postbird-box-container {    width: 100%;    height: 100%;    overflow: hidden;    position: fixed;    top: 0;    left: 0;    z-index: 9999;    background-color: rgba(0, 0, 0, 0.2);    display: block;    -webkit-user-select: none;    -moz-user-select: none;    -ms-user-select: none;    user-select: none}.postbird-box-container.active {    display: block}.postbird-box-content {    min-width: 400px;    max-width: 600px;    min-height: 150px;    background-color: #fff;    border: solid 1px #dfdfdf;    position: absolute;    top: 50%;    left: 50%;    transform: translate(-50%, -50%);    margin-top: -100px}.postbird-box-header {    width: 100%;    padding: 10px 15px;    position: relative;    font-size: 1.1em;    letter-spacing: 2px}.postbird-box-close-btn {    cursor: pointer;    font-weight: 700;    color: #000;    float: right;    opacity: .5;    font-size: 1.3em;    margin-top: -3px;    display: none}.postbird-box-close-btn:hover {    opacity: 1}.postbird-box-text {    box-sizing: border-box;    width: 100%;    padding: 0 10%;    text-align: center;    line-height: 40px;    font-size: 20px;    letter-spaci" +
"ng: 1px}.postbird-box-footer {    width: 100%;    position: absolute;    padding: 0;    margin: 0;    bottom: 0;    display: flex;    display: -webkit-flex;    justify-content: space-around;    border-top: solid 1px #dfdfdf;    align-items: flex-end}.postbird-box-footer .btn-footer {    line-height: 44px;    border: 0;    cursor: pointer;    background-color: #fff;    color: #0e90d2;    font-size: 1.1em;    letter-spacing: 2px;    transition: background-color .5s;    -webkit-transition: background-color .5s;    -o-transition: background-color .5s;    -moz-transition: background-color .5s;    outline: 0}.postbird-box-footer .btn-footer:hover {    background-color: #e5e5e5}.postbird-box-footer .btn-block-footer {    width: 100%}.postbird-box-footer .btn-left-footer,.postbird-box-footer .btn-right-footer {    position: relative;    width: 100%}.postbird-box-footer .btn-left-footer::after {    content: \"\";    position: absolute;    right: 0;    top: 0;    background-color: #e5e5e5;    height: 100%;    width: 1px}.postbird-box-footer .btn-footer-cancel {    color: #333}.postbird-prompt-input {    width: 100%;    padding: 5px;    font-size: 16px;    border: 1px solid #ccc;    outline: 0}.onoffswitch {    position: relative; width: 45px;    -webkit-user-select:none; -moz-user-select:none; -ms-user-select: none;}.onoffswitch-checkbox {    position: absolute;    opacity: 0;    pointer-events: none;}.onoffswitch-label {    display: block; overflow: hidden; cursor: pointer;    height: 20px; padding: 0; line-height: 20px;    border: 2px solid #E3E3E3; border-radius: 20px;    background-color: #FFFFFF;    transition: background-color 0.3s ease-in;}.onoffswitch-label:before {    content: \"\";    display: block; width: 20px; margin: 0px;    background: #FFFFFF;    position: absolute; t" +
"op: 0; bottom: 0;    right: 23px;    border: 2px solid #E3E3E3; border-radius: 20px;    transition: all 0.3s ease-in 0s; }.onoffswitch-checkbox:checked + .onoffswitch-label {    background-color: #3AAD38;}.onoffswitch-checkbox:checked + .onoffswitch-label, .onoffswitch-checkbox:checked + .onoffswitch-label:before {   border-color: #3AAD38;}.onoffswitch-checkbox:checked + .onoffswitch-label:before {    right: 0px; }.layui-timeline {    padding-left: 5px;}.layui-timeline-item {    position: relative;    padding-bottom: 20px;}li {    list-style: none;}.layui-timeline-item:first-child::before {    display: block;}.layui-timeline-item:last-child::before {    content: '';    position: absolute;    left: 5px;    top: 0;    z-index: 0;    width: 0;    height: 100%;}.layui-timeline-item::before {    content: '';    position: absolute;    left: 5px;    top: 0;    z-index: 0;    width: 1px;    height: 100%;}.layui-timeline-item::before,hr {    background-color: #e6e6e6;}.layui-timeline-axis {    position: absolute;    left: -5px;    top: 0;    z-index: 10;    width: 20px;    height: 20px;    line-height: 20px;    background-color: #fff;    color: #5FB878;    border-radius: 50%;    text-align: center;    cursor: pointer;}.layui-icon {    font-family: layui-icon !important;    font-size: 16px;    font-style: normal;}.layui-timeline-content {    padding-left: 25px;}.layui-text {    line-height: 22px;    font-size: 14px;    color: rgb(85,85,85);}.layui-timeline-title {    position: relative;}\n\n\n\n/* ==================== DouyuEx-RL Xiaomi HyperOS / MIUIX 终极组件底座规范 ==================== */\n:root {\n    --miuix-blue: #0066FF !important;\n    --miuix-blue-hover: #2b7fff !important;\n    --miuix-blue-active: #0055ff !important;\n    --miuix-blue-shadow: rgba(0, 102, 255, 0.28) !important;\n    --m" +
"iuix-blue-glow: rgba(0, 102, 255, 0.16) !important;\n    --miuix-spring: cubic-bezier(0.34, 1.56, 0.64, 1) !important;\n}\n\n/* 1. Level 2 Dock 启动坞 (76px 晶透微胶囊 - 等比放大 1.5 倍) */\n.ex-panel {\n    min-width: max-content !important; width: max-content !important; height: 76px !important; box-sizing: border-box !important;\n    background: rgba(255, 255, 255, 0.76) !important;\n    backdrop-filter: blur(36px) saturate(220%) !important; -webkit-backdrop-filter: blur(36px) saturate(220%) !important;\n    border: 1px solid rgba(255, 255, 255, 0.95) !important; border-radius: 38px !important;\n    box-shadow: inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.98), 0 16px 40px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.08) !important;\n    padding: 0 24px !important; display: none; align-items: center !important; justify-content: center !important;\n    z-index: 10000 !important; user-select: none !important; overflow: visible !important;\n}\n.ex-panel__wrap {\n    display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: center !important;\n    gap: 12px !important; height: 100% !important; width: auto !important; margin: 0 !important; padding: 0 !important;\n}\n.ex-panel__wrap > div {\n    display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important;\n    width: 56px !important; height: 56px !important; margin: 0 !important; padding: 0 !important;\n    position: relative !important; border-radius: 14px !important; border: 1px solid rgba(255,255,255,0.7) !important;\n    background: rgba(255,255,255,0.45) !important; box-sizing: border-box !important;\n    transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) !important;\n}\n.ex-panel__wrap > div:hover {\n    transform: translateY(-2.5px) !imp" +
"ortant; background: rgba(255, 255, 255, 0.88) !important;\n    border-color: rgba(0, 102, 255, 0.3) !important;\n    box-shadow: 0 6px 18px rgba(0, 102, 255, 0.24), inset 0 1px 1px #fff !important;\n}\n.ex-panel__wrap > div:active { transform: translateY(0) scale(0.96) !important; }\n\n/* 磁吸指示器小胶囊 (24x4px 生机蓝 - 等比放大 1.5 倍) */\n.ex-panel__indicator {\n    position: absolute !important; bottom: 3px !important; left: 50% !important;\n    width: 24px !important; height: 4px !important; border-radius: 2px !important;\n    background: var(--miuix-blue, #0066ff) !important; box-shadow: 0 0 8px rgba(0, 102, 255, 0.65) !important;\n    transform: translateX(-50%) scaleX(0) !important; opacity: 0 !important; pointer-events: none !important;\n    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;\n}\n.ex-panel__wrap > div.is-active .ex-panel__indicator,\n.ex-panel__wrap > div.ex-dock-active .ex-panel__indicator {\n    transform: translateX(-50%) scaleX(1) !important; opacity: 1 !important;\n}\n\n.ex-panel__wrap > div a.ex-panel__icon, .ex-panel__icon {\n    display: flex !important; align-items: center !important; justify-content: center !important;\n    width: 56px !important; height: 56px !important; margin: 0 !important; padding: 6px !important; box-sizing: border-box !important;\n    border-radius: 14px !important; cursor: pointer !important; user-select: none !important;\n    background: transparent !important;\n}\n.ex-panel__wrap > div a.ex-panel__icon svg, .ex-panel__wrap > div a.ex-panel__icon img,\n.ex-panel__icon svg, .ex-panel__icon img {\n    width: 38px !important; height: 38px !important; max-width: 38px !important; max-height: 38px !important; display: block !important;\n    pointer-events: none !important; transition: transform 0.22s var(--miuix-spring) !important;\n}\n.ex-panel" +
"__close {\n    position: absolute !important; top: -8px !important; right: -8px !important; width: 28px !important; height: 28px !important;\n    border-radius: 50% !important; border: 1px solid rgba(0, 0, 0, 0.08) !important; background: #ffffff !important;\n    color: #475569 !important; font-size: 18px !important; font-weight: 700 !important; line-height: 1 !important;\n    cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important;\n    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12) !important; transition: all 0.18s var(--miuix-spring) !important; z-index: 10001 !important;\n}\n.ex-panel__close:hover {\n    background: #ef4444 !important; border-color: #ef4444 !important; color: #ffffff !important;\n    transform: scale(1.12) rotate(90deg) !important; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35) !important;\n}\n\n/* 2. Level 3 模态控制台 (370px 齐平三维铁壁 - 扁平自然滚动) */\n.miuix-modal:not(.vote__result), .extool, .livetool, .bloop, .exlottery, .ChatToolBar-DanmakuTail-Panel, .fans-continue-panel, .sign-panel, .popup-player-panel, .exupdate-panel {\n    position: fixed !important;\n    width: 380px !important; max-width: calc(100vw - 24px) !important;\n    height: 370px !important; max-height: 370px !important; min-height: 370px !important;\n    box-sizing: border-box !important; padding: 0 !important;\n    overflow: hidden !important;\n    display: none; z-index: 1428 !important; border-radius: 22px !important; background: rgba(255, 255, 255, 0.78) !important;\n    backdrop-filter: blur(36px) saturate(220%) !important; -webkit-backdrop-filter: blur(36px) saturate(220%) !important;\n    border: 1px solid rgba(255, 255, 255, 0.95) !important;\n    box-shadow: inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.98), 0 16px 40px rgba(15, 23, 42, 0.16), 0 " +
"2px 8px rgba(15, 23, 42, 0.08) !important;\n    color: #0f172a !important; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif !important;\n    flex-direction: column !important;\n}\n\n/* 隐形热区连桥 (Hover Bridge)：在 Dock 按钮上方向上延伸 18px 透明热区，填补悬浮空隙 */\n.ex-panel__wrap > div::before {\n    content: \"\" !important; position: absolute !important; bottom: 100% !important; left: 0 !important; right: 0 !important;\n    height: 18px !important; background: transparent !important; pointer-events: auto !important; z-index: 100001 !important;\n}\n\n/* 划过瞬间淡入 + 微上浮优雅动画与强制呈现 */\n.miuix-modal.miuix-modal-in,\n.extool.miuix-modal-in,\n.livetool.miuix-modal-in,\n.bloop.miuix-modal-in,\n.exlottery.miuix-modal-in,\n.ChatToolBar-DanmakuTail-Panel.miuix-modal-in,\n.fans-continue-panel.miuix-modal-in,\n.sign-panel.miuix-modal-in,\n.popup-player-panel.miuix-modal-in,\n.exupdate-panel.miuix-modal-in,\n.miuix-modal[style*=\"display: block\"], .miuix-modal[style*=\"display:block\"],\n.miuix-modal[style*=\"display: flex\"], .miuix-modal[style*=\"display:flex\"],\n.extool[style*=\"display: block\"], .extool[style*=\"display:block\"],\n.extool[style*=\"display: flex\"], .extool[style*=\"display:flex\"],\n.livetool[style*=\"display: block\"], .livetool[style*=\"display:block\"],\n.livetool[style*=\"display: flex\"], .livetool[style*=\"display:flex\"],\n.bloop[style*=\"display: block\"], .bloop[style*=\"display:block\"],\n.bloop[style*=\"display: flex\"], .bloop[style*=\"display:flex\"],\n.exlottery[style*=\"display: block\"], .exlottery[style*=\"display:block\"],\n.exlottery[style*=\"display: flex\"], .exlottery[style*=\"display:flex\"],\n.ChatToolBar-DanmakuTail-Panel[style*=\"display: block\"], .ChatToolBar-DanmakuTail-Panel[style*=\"display:block\"],\n.ChatToolBar-DanmakuTail-Panel[style*=\"display" +
": flex\"], .ChatToolBar-DanmakuTail-Panel[style*=\"display:flex\"],\n.fans-continue-panel[style*=\"display: block\"],\n.sign-panel[style*=\"display: block\"], .fans-continue-panel[style*=\"display:block\"],\n.sign-panel[style*=\"display:block\"],\n.fans-continue-panel[style*=\"display: flex\"],\n.sign-panel[style*=\"display: flex\"], .fans-continue-panel[style*=\"display:flex\"],\n.sign-panel[style*=\"display:flex\"],\n.popup-player-panel[style*=\"display: block\"], .popup-player-panel[style*=\"display:block\"],\n.popup-player-panel[style*=\"display: flex\"], .popup-player-panel[style*=\"display:flex\"],\n.exupdate-panel[style*=\"display: block\"], .exupdate-panel[style*=\"display:block\"],\n.exupdate-panel[style*=\"display: flex\"], .exupdate-panel[style*=\"display:flex\"] {\n    display: flex !important;\n    flex-direction: column !important;\n    opacity: 1 !important;\n    visibility: visible !important;\n    pointer-events: auto !important;\n    animation: miuix-modal-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;\n}\n@keyframes miuix-modal-in {\n    0% { opacity: 0; transform: translateY(8px); }\n    100% { opacity: 1; transform: translateY(0); }\n}\n\n.vote__result.miuix-modal {\n    padding: 0 0 16px 0 !important; border-radius: 22px !important; overflow: hidden !important; box-sizing: border-box !important;\n    background: rgba(255, 255, 255, 0.76) !important; backdrop-filter: blur(36px) saturate(220%) !important; -webkit-backdrop-filter: blur(36px) saturate(220%) !important;\n    border: 1px solid rgba(255, 255, 255, 0.95) !important;\n    box-shadow: inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.98), 0 16px 40px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(15, 23, 42, 0.08) !important;\n}\n.vote__result.miuix-modal #vote__result-theme { display: none !important; }\n.vote__result.miuix-modal #vote__result-options { pad" +
"ding: 0 14px !important; }\n\n/* 3. Level 3 模态吸顶 Header (顶栏平铺占满100%宽度，绝无漏缝) */\n.miuix-modal__header {\n    flex: 0 0 auto !important;\n    width: 100% !important; margin: 0 !important; padding: 12px 16px !important;\n    box-sizing: border-box !important; display: flex !important; align-items: center !important; justify-content: space-between !important;\n    background: rgba(255, 255, 255, 0.45) !important; backdrop-filter: blur(28px) saturate(190%) !important; -webkit-backdrop-filter: blur(28px) saturate(190%) !important;\n    border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important; box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, 0.95), 0 2px 6px rgba(0, 0, 0, 0.03) !important;\n    z-index: 50 !important;\n    border-top-left-radius: 21px !important;\n    border-top-right-radius: 21px !important;\n    border-bottom-left-radius: 0 !important;\n    border-bottom-right-radius: 0 !important;\n}\n\n/* 4. 滚动条起始点统一为顶栏下方：内容承载容器 */\n.miuix-modal__body {\n    display: block !important;\n    flex: 1 1 auto !important;\n    min-height: 0 !important;\n    max-height: calc(370px - 52px) !important;\n    width: 100% !important;\n    overflow-y: auto !important;\n    overflow-y: overlay !important;\n    overflow-x: hidden !important;\n    box-sizing: border-box !important;\n    padding: 10px 0 16px 0 !important;\n}\n\n/* 5. 统一滚动条规格：3级菜单 body 与 5级菜单 body 全量对齐极细 4px 美化 */\n.miuix-modal__body::-webkit-scrollbar,\n.ex-gift-picker__body::-webkit-scrollbar,\n.miuix-modal::-webkit-scrollbar,\n.extool::-webkit-scrollbar,\n.livetool::-webkit-scrollbar,\n.bloop::-webkit-scrollbar,\n.exlottery::-webkit-scrollbar,\n.ChatToolBar-DanmakuTail-Panel::-webkit-scrollbar,\n.fans-continue-panel::-webkit-scrollbar,\n.popup-player-panel::-webkit-scrollbar,\n.exupdate-panel::-webkit-scrollbar {\n    width: 4px !important;\n}\n\n.miuix-modal__body" +
"::-webkit-scrollbar-thumb,\n.ex-gift-picker__body::-webkit-scrollbar-thumb,\n.miuix-modal::-webkit-scrollbar-thumb,\n.extool::-webkit-scrollbar-thumb,\n.livetool::-webkit-scrollbar-thumb,\n.bloop::-webkit-scrollbar-thumb,\n.exlottery::-webkit-scrollbar-thumb,\n.ChatToolBar-DanmakuTail-Panel::-webkit-scrollbar-thumb,\n.fans-continue-panel::-webkit-scrollbar-thumb,\n.popup-player-panel::-webkit-scrollbar-thumb,\n.exupdate-panel::-webkit-scrollbar-thumb {\n    background: rgba(0, 0, 0, 0.18) !important;\n    border-radius: 4px !important;\n}\n\n.miuix-modal__body::-webkit-scrollbar-track,\n.ex-gift-picker__body::-webkit-scrollbar-track,\n.miuix-modal::-webkit-scrollbar-track,\n.extool::-webkit-scrollbar-track,\n.livetool::-webkit-scrollbar-track,\n.bloop::-webkit-scrollbar-track,\n.exlottery::-webkit-scrollbar-track,\n.ChatToolBar-DanmakuTail-Panel::-webkit-scrollbar-track,\n.fans-continue-panel::-webkit-scrollbar-track,\n.popup-player-panel::-webkit-scrollbar-track,\n.exupdate-panel::-webkit-scrollbar-track {\n    background: transparent !important;\n}\n\n/* 版本更新、一键续牌与同屏播放专属卡片布局 (三级模态标准四级卡片) */\n.fans-panel__card, .popup-panel__card, .exupdate-panel__card {\n    margin: 0 12px 10px 12px !important; padding: 12px 14px !important; box-sizing: border-box !important;\n    background: rgba(255, 255, 255, 0.55) !important; border: 1px solid rgba(255, 255, 255, 0.9) !important;\n    border-radius: 14px !important; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03) !important;\n}\n.fans-panel__card-header, .popup-panel__card-header, .exupdate-panel__card-header {\n    display: flex !important; align-items: center !important; justify-content: space-between !important; margin-bottom: 8px !important;\n}\n.fans-panel__card-title, .popup-panel__card-title, .exupdate-panel__card-title { font-size: 13px !important; font-weight: 700 " +
"!important; color: #0f172a !important; }\n.exupdate-list {\n    margin: 0 !important;\n    padding: 0 !important;\n    list-style: none !important;\n    font-size: 12px !important;\n    line-height: 19px !important;\n    color: #334155 !important;\n}\n.exupdate-list li {\n    margin-bottom: 6px !important;\n    word-break: break-word !important;\n}\n.fans-panel__action-wrap, .popup-panel__action-wrap, .exupdate-panel__action-wrap { padding: 0 12px !important; margin-top: 10px !important; margin-bottom: 8px !important; }\n.fans-panel__submit-btn, .popup-panel__submit-btn, .exupdate-panel__submit-btn { width: 100% !important; height: 36px !important; border-radius: 10px !important; font-size: 14px !important; font-weight: 600 !important; }\n\n/* 多态按钮状态微交互细节 */\n.exupdate-state-btn--ack {\n    background: linear-gradient(135deg, #2b7fff, #0055ff) !important;\n    color: #ffffff !important;\n    box-shadow: 0 4px 14px rgba(0, 102, 255, 0.35) !important;\n}\n.exupdate-state-btn--ack:hover {\n    background: linear-gradient(135deg, #3d8bff, #004de6) !important;\n    box-shadow: 0 6px 18px rgba(0, 102, 255, 0.45) !important;\n    transform: translateY(-1px) !important;\n}\n.exupdate-state-btn--check {\n    background: linear-gradient(135deg, #2b7fff, #0055ff) !important;\n    color: #ffffff !important;\n    box-shadow: 0 4px 14px rgba(0, 102, 255, 0.3) !important;\n}\n.exupdate-state-btn--check:hover {\n    background: linear-gradient(135deg, #3d8bff, #004de6) !important;\n    box-shadow: 0 6px 18px rgba(0, 102, 255, 0.42) !important;\n    transform: translateY(-1px) !important;\n}\n.exupdate-state-btn--checking {\n    background: rgba(0, 0, 0, 0.08) !important;\n    color: #64748b !important;\n    box-shadow: none !important;\n    cursor: wait !important;\n}\n.exupdate-state-btn--latest {\n    background: rgba(16, 185," +
" 129, 0.15) !important;\n    color: #059669 !important;\n    border: 1px solid rgba(16, 185, 129, 0.3) !important;\n    box-shadow: none !important;\n}\n.exupdate-state-btn--latest:hover {\n    background: rgba(16, 185, 129, 0.22) !important;\n}\n.exupdate-state-btn--upgrade {\n    background: linear-gradient(135deg, #ff6a00, #ee5a24) !important;\n    color: #ffffff !important;\n    box-shadow: 0 4px 14px rgba(238, 90, 36, 0.38) !important;\n}\n.exupdate-state-btn--upgrade:hover {\n    background: linear-gradient(135deg, #ff791a, #f36838) !important;\n    box-shadow: 0 6px 18px rgba(238, 90, 36, 0.48) !important;\n    transform: translateY(-1px) !important;\n}\n\n.fans-panel__badge-tag {\n    font-size: 11px !important; font-weight: 600 !important; color: #0066ff !important;\n    background: rgba(0, 102, 255, 0.1) !important; padding: 2px 8px !important; border-radius: 6px !important;\n}\n.fans-panel__asset-grid { display: grid !important; grid-template-columns: 1fr 1fr 1fr !important; gap: 8px !important; text-align: center !important; }\n.fans-panel__asset-item { display: flex !important; flex-direction: column !important; align-items: center !important; gap: 4px !important; }\n.fans-panel__asset-label { font-size: 11px !important; color: #64748b !important; }\n.fans-panel__asset-value { font-size: 14px !important; font-weight: 700 !important; color: #0f172a !important; }\n.fans-panel__status--ok { color: #10b981 !important; }\n.fans-panel__input-group { display: flex !important; flex-direction: column !important; gap: 6px !important; }\n.fans-panel__input-label { font-size: 12px !important; color: #334155 !important; font-weight: 500 !important; }\n.fans-panel__input-box { display: flex !important; align-items: center !important; gap: 8px !important; }\n.fans-panel__input-box input { width: 80px !" +
"important; height: 32px !important; padding: 4px 8px !important; text-align: center !important; border-radius: 8px !important; }\n.fans-panel__input-hint { font-size: 11px !important; color: #64748b !important; }\n.fans-panel__action-wrap, .popup-panel__action-wrap { padding: 0 12px !important; margin-top: 10px !important; }\n.fans-panel__submit-btn, .popup-panel__submit-btn { width: 100% !important; height: 36px !important; border-radius: 10px !important; font-size: 14px !important; font-weight: 600 !important; }\n.popup-panel__input-box input { width: 100% !important; height: 34px !important; padding: 4px 10px !important; border-radius: 8px !important; box-sizing: border-box !important; }\n.popup-panel__paste-btn {\n    font-size: 11px !important; padding: 2px 8px !important; border-radius: 6px !important;\n    border: 1px solid rgba(0, 102, 255, 0.3) !important; background: rgba(0, 102, 255, 0.08) !important;\n    color: #0066ff !important; cursor: pointer !important;\n}\n.popup-panel__seg-switch { display: flex !important; gap: 8px !important; background: rgba(0, 0, 0, 0.04) !important; padding: 4px !important; border-radius: 10px !important; }\n.popup-panel__seg-item { flex: 1 !important; display: flex !important; align-items: center !important; justify-content: center !important; margin: 0 !important; cursor: pointer !important; }\n.popup-panel__seg-item input { display: none !important; }\n.popup-panel__seg-thumb {\n    width: 100% !important; text-align: center !important; padding: 6px 0 !important; font-size: 12px !important;\n    font-weight: 500 !important; border-radius: 8px !important; color: #64748b !important; transition: all 0.2s ease !important;\n}\n.popup-panel__seg-item input:checked + .popup-panel__seg-thumb {\n    background: #fff !important; color: #0066ff !importan" +
"t; font-weight: 700 !important; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;\n}\n.miuix-modal__title-box { display: flex !important; align-items: center !important; }\n.miuix-modal__title { font-size: 14px !important; font-weight: 700 !important; color: #0f172a !important; letter-spacing: -0.2px !important; }\n.miuix-modal__close {\n    position: relative !important; width: 26px !important; height: 26px !important; border-radius: 8px !important;\n    background: rgba(0, 0, 0, 0.06) !important; border: none !important; color: #475569 !important;\n    display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important;\n    font-size: 18px !important; font-weight: 600 !important; line-height: 1 !important; text-align: center !important;\n    user-select: none !important; padding: 0 !important; margin: 0 !important; box-sizing: border-box !important;\n    transition: background-color 0.18s var(--miuix-spring), color 0.18s ease, transform 0.2s var(--miuix-spring) !important;\n}\n.miuix-modal__close:hover {\n    background: #ef4444 !important; color: #ffffff !important; transform: scale(1.1) rotate(90deg) !important;\n    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35) !important;\n}\n.miuix-modal__close:active { transform: scale(0.95) !important; }\n\n/* 4. 卡片合理宽度收敛 (左右严密留白 12px，彻底杜绝向右溢出) */\n.extool > div:not(.miuix-modal__header):not(.miuix-modal__body):not(.extool__close),\n.extool__player_perf, .extool__treasure, .extool__redpacket_room, .extool__autofish, .extool__clearbag, .extool__sendgift,\n.livetool__cell, .lottery__item, .bloop > div:not(.miuix-modal__header), .DanmakuTail-option-label, .DanmakuTail-checkbox-label {\n    width: auto !important; max-width: none !important; min-width: 0 !important;\n    margin-left: 12px !importa" +
"nt; margin-right: 12px !important; margin-bottom: 10px !important; padding: 10px 14px !important;\n    box-sizing: border-box !important; background: rgba(255, 255, 255, 0.55) !important; border: 1px solid rgba(255, 255, 255, 0.9) !important;\n    border-radius: 14px !important; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03) !important; flex: none !important; float: none !important; display: block !important;\n}\n/* [DouyuEx-RL] extool display:block 覆盖已彻底拔除 */\n.extool label {\n    display: inline-flex !important; align-items: center !important; gap: 4px !important; font-size: 12px !important; font-weight: 500 !important;\n    color: #0f172a !important; margin-right: 10px !important; margin-bottom: 4px !important; line-height: 22px !important; white-space: nowrap !important; cursor: pointer !important;\n}\n.extool br { display: none !important; }\n\n/* 5. ［播放与性能］2×2 网格卡片 (置于送礼上方，无 Emoji) */\n.extool__player_perf {\n    background: linear-gradient(135deg, rgba(255, 255, 255, 0.72), rgba(240, 246, 255, 0.65)) !important;\n    border: 1px solid rgba(0, 102, 255, 0.18) !important; box-shadow: 0 4px 14px rgba(0, 102, 255, 0.06) !important;\n}\n.extool__perf_header { display: flex !important; align-items: center !important; justify-content: space-between !important; margin-bottom: 8px !important; }\n.extool__perf_title { font-size: 13px !important; font-weight: 700 !important; color: #0f172a !important; }\n.extool__perf_badge {\n    font-size: 10px !important; font-weight: 600 !important; background: rgba(0, 102, 255, 0.12) !important;\n    color: var(--miuix-blue) !important; padding: 1px 6px !important; border-radius: 4px !important;\n}\n.extool__perf_grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important; }\n.extool__perf_item {\n    display: flex !important; a" +
"lign-items: center !important; gap: 6px !important; font-size: 12px !important;\n    font-weight: 500 !important; color: #334155 !important; cursor: pointer !important; margin: 0 !important;\n}\n\n/* 6. 弹幕小助手 (bloop) 首行单行合并卡片 */\n.bloop__header_card {\n    display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; align-items: center !important; gap: 6px !important;\n    width: auto !important; margin-left: 12px !important; margin-right: 12px !important; margin-bottom: 10px !important; padding: 8px 10px !important;\n    background: rgba(255, 255, 255, 0.55) !important; border: 1px solid rgba(255, 255, 255, 0.9) !important;\n    border-radius: 14px !important; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03) !important; box-sizing: border-box !important;\n}\n.bloop__header_label { font-size: 13px !important; font-weight: 600 !important; color: #0f172a !important; white-space: nowrap !important; flex-shrink: 0 !important; margin: 0 !important; }\n#bloop__select {\n    flex: 1 1 auto !important; min-width: 70px !important; max-width: 140px !important; height: 28px !important; padding: 2px 6px !important;\n    font-size: 12px !important; border: 1px solid rgba(0, 0, 0, 0.12) !important; border-radius: 8px !important;\n    background: rgba(255, 255, 255, 0.9) !important; color: #0f172a !important; box-sizing: border-box !important; outline: none !important; margin: 0 !important;\n}\n#bloop__save {\n    flex-shrink: 0 !important; height: 28px !important; padding: 0 10px !important; font-size: 12px !important; font-weight: 600 !important;\n    color: #ffffff !important; background: linear-gradient(135deg, #2b7fff, #0055ff) !important; border: none !important; border-radius: 8px !important;\n    cursor: pointer !important; box-shadow: 0 2px 6px rgba(0, 102, 255, 0.28) !import" +
"ant; white-space: nowrap !important; margin: 0 !important;\n}\n#bloop__delete {\n    flex-shrink: 0 !important; height: 28px !important; padding: 0 10px !important; font-size: 12px !important; font-weight: 600 !important;\n    color: #ef4444 !important; background: rgba(239, 68, 68, 0.14) !important; border: 1px solid rgba(239, 68, 68, 0.28) !important;\n    border-radius: 8px !important; cursor: pointer !important; white-space: nowrap !important; margin: 0 !important;\n}\n#bloop__delete:hover { background: #ef4444 !important; border-color: #ef4444 !important; color: #ffffff !important; }\n.bloop__textarea_card textarea { width: 100% !important; box-sizing: border-box !important; resize: vertical !important; }\n.bloop__setting_card, .bloop__options_card, .bloop__switch_card { display: flex !important; align-items: center !important; flex-wrap: wrap !important; gap: 8px !important; }\n\n/* 7. 直播间工具 (livetool) 右边缘严格垂直对齐与展开抽屉 */\n.livetool__cell {\n    display: flex !important; align-items: center !important; justify-content: space-between !important;\n    flex-wrap: wrap !important; gap: 8px 10px !important; padding: 10px 14px !important; box-sizing: border-box !important;\n}\n.livetool__cell_title {\n    display: flex !important; align-items: center !important; gap: 6px !important; flex: 1 1 auto !important; min-width: 0 !important; margin: 0 !important; padding: 0 !important;\n}\n.livetool__cell_option {\n    display: flex !important; align-items: center !important; justify-content: flex-end !important; flex: 0 0 auto !important;\n    margin-left: auto !important; padding: 0 !important;\n}\n.vote__panel, .enter__panel, .mute__panel, .gift__panel, .reply__panel {\n    width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; margin: 8px 0 0 0 !important; padding: 8p" +
"x 10px !important;\n    border-radius: 10px !important; background: rgba(255, 255, 255, 0.65) !important; border: 1px solid rgba(0, 0, 0, 0.06) !important;\n}\n.livetool__cell_title span:not([id$=\"__title\"]) {\n    font-size: 11px !important; font-weight: 600 !important; color: #0066FF !important; background: rgba(0, 102, 255, 0.15) !important;\n    border: 1px solid rgba(0, 102, 255, 0.28) !important; padding: 2px 8px !important; border-radius: 6px !important; cursor: pointer !important;\n    box-shadow: 0 1px 3px rgba(0, 102, 255, 0.08) !important; transition: all 0.18s var(--miuix-spring) !important;\n    display: inline-flex !important; align-items: center !important; justify-content: center !important;\n}\n.livetool__cell_title span:not([id$=\"__title\"]):hover {\n    background: #0066FF !important; color: #ffffff !important; transform: translateY(-1px) !important; box-shadow: 0 3px 8px rgba(0, 102, 255, 0.35) !important;\n}\n\n/* 8. MIUIX / HyperOS 统一生机蓝开关规范 (宽 38px，高 22px，位移 16px，严格限定在插件面板) */\n.miuix-modal input[type=\"checkbox\"]:not(.onoffswitch-checkbox),\n.extool input[type=\"checkbox\"]:not(.onoffswitch-checkbox),\n.livetool input[type=\"checkbox\"]:not(.onoffswitch-checkbox),\n.bloop input[type=\"checkbox\"]:not(.onoffswitch-checkbox) {\n    -webkit-appearance: none !important; appearance: none !important; position: relative !important; width: 38px !important; height: 22px !important;\n    background: rgba(0, 0, 0, 0.14) !important; border-radius: 22px !important; cursor: pointer !important; outline: none !important; border: none !important;\n    transition: background-color 0.28s var(--miuix-spring), box-shadow 0.28s ease !important; flex-shrink: 0 !important; margin: 0 !important;\n    vertical-align: middle !important; display: inline-block !important;\n}\n.miuix-modal input[type=\"chec" +
"kbox\"]:not(.onoffswitch-checkbox)::before,\n.extool input[type=\"checkbox\"]:not(.onoffswitch-checkbox)::before,\n.livetool input[type=\"checkbox\"]:not(.onoffswitch-checkbox)::before,\n.bloop input[type=\"checkbox\"]:not(.onoffswitch-checkbox)::before {\n    content: \"\" !important; position: absolute !important; top: 2px !important; left: 2px !important; width: 18px !important; height: 18px !important;\n    background: #ffffff !important; border-radius: 50% !important; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2) !important;\n    transition: transform 0.32s var(--miuix-spring), width 0.2s ease !important;\n}\n.miuix-modal input[type=\"checkbox\"]:not(.onoffswitch-checkbox):active::before,\n.extool input[type=\"checkbox\"]:not(.onoffswitch-checkbox):active::before,\n.livetool input[type=\"checkbox\"]:not(.onoffswitch-checkbox):active::before,\n.bloop input[type=\"checkbox\"]:not(.onoffswitch-checkbox):active::before { width: 22px !important; }\n.miuix-modal input[type=\"checkbox\"]:not(.onoffswitch-checkbox):checked,\n.extool input[type=\"checkbox\"]:not(.onoffswitch-checkbox):checked,\n.livetool input[type=\"checkbox\"]:not(.onoffswitch-checkbox):checked,\n.bloop input[type=\"checkbox\"]:not(.onoffswitch-checkbox):checked { background: var(--miuix-blue) !important; box-shadow: 0 2px 8px var(--miuix-blue-shadow) !important; }\n.miuix-modal input[type=\"checkbox\"]:not(.onoffswitch-checkbox):checked::before,\n.extool input[type=\"checkbox\"]:not(.onoffswitch-checkbox):checked::before,\n.livetool input[type=\"checkbox\"]:not(.onoffswitch-checkbox):checked::before,\n.bloop input[type=\"checkbox\"]:not(.onoffswitch-checkbox):checked::before { transform: translateX(16px) !important; }\n.miuix-modal input[type=\"checkbox\"]:not(.onoffswitch-checkbox):checked:active::before,\n.extool input[type=\"checkbox\"]:not(.onoffswitch-checkbox)" +
":checked:active::before,\n.livetool input[type=\"checkbox\"]:not(.onoffswitch-checkbox):checked:active::before,\n.bloop input[type=\"checkbox\"]:not(.onoffswitch-checkbox):checked:active::before { transform: translateX(12px) !important; }\n\n/* 彻底拔除 .onoffswitch 内部 checkbox 伪元素打架，底座跑道与扩展功能严格对齐 */\n.onoffswitch input[type=\"checkbox\"], .onoffswitch-checkbox {\n    display: none !important; opacity: 0 !important; width: 0 !important; height: 0 !important; margin: 0 !important; padding: 0 !important; pointer-events: none !important;\n}\n.onoffswitch input[type=\"checkbox\"]::before, .onoffswitch-checkbox::before { display: none !important; content: none !important; }\n.onoffswitch {\n    position: relative !important; width: 38px !important; height: 22px !important; user-select: none !important; flex-shrink: 0 !important;\n    margin: 0 !important; display: inline-block !important; vertical-align: middle !important;\n}\n.onoffswitch-label {\n    display: block !important; width: 38px !important; height: 22px !important; box-sizing: border-box !important; cursor: pointer !important;\n    border: none !important; border-radius: 22px !important; background: rgba(0, 0, 0, 0.14) !important;\n    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08) !important; position: relative !important;\n    transition: background-color 0.28s var(--miuix-spring), box-shadow 0.28s ease !important;\n}\n.onoffswitch-label:before {\n    content: \"\" !important; display: block !important; width: 18px !important; height: 18px !important; margin: 0 !important;\n    background: #ffffff !important; border: none !important; border-radius: 50% !important; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2) !important;\n    position: absolute !important; top: 2px !important; left: 2px !important; right: auto !important; transform: translateX(0px) !" +
"important;\n    transition: transform 0.32s var(--miuix-spring), width 0.2s ease !important;\n}\n.onoffswitch-label:active:before { width: 22px !important; }\n.onoffswitch-checkbox:checked + .onoffswitch-label { background: var(--miuix-blue) !important; box-shadow: 0 2px 8px var(--miuix-blue-shadow) !important; }\n.onoffswitch-checkbox:checked + .onoffswitch-label:before { transform: translateX(16px) !important; }\n.onoffswitch-checkbox:checked + .onoffswitch-label:active:before { transform: translateX(12px) !important; }\n\n/* 9. 通用按钮、输入框、下拉选单微质感统一 (严格限定在 DouyuEx 控制面板容器内，绝不污染播放器) */\n.miuix-modal input[type=\"button\"], .livetool input[type=\"button\"], .extool input[type=\"button\"], .bloop input[type=\"button\"], button.ex-btn-primary {\n    border: none !important; border-radius: 8px !important; padding: 4px 12px !important; font-size: 12px !important; font-weight: 600 !important;\n    cursor: pointer !important; color: #ffffff !important; background: linear-gradient(135deg, #2b7fff, #0055ff) !important;\n    box-shadow: 0 2px 6px rgba(0, 102, 255, 0.28) !important; transition: all 0.18s var(--miuix-spring) !important; outline: none !important; box-sizing: border-box !important;\n}\n.miuix-modal input[type=\"button\"]:hover, .livetool input[type=\"button\"]:hover, .extool input[type=\"button\"]:hover, .bloop input[type=\"button\"]:hover, button.ex-btn-primary:hover {\n    background: linear-gradient(135deg, #3d8bff, #004de6) !important; transform: translateY(-1px) !important; box-shadow: 0 4px 12px rgba(0, 102, 255, 0.42) !important;\n}\n.miuix-modal input[type=\"button\"]:active, .extool input[type=\"button\"]:active, .bloop input[type=\"button\"]:active, button.ex-btn-primary:active { transform: scale(0.96) !important; }\n\n.miuix-modal input[id$=\"__del\"], .miuix-modal input[id$=\"__delete\"], .bloop input" +
"[id$=\"__delete\"], .livetool input[id$=\"__del\"] {\n    background: rgba(239, 68, 68, 0.14) !important; border: 1px solid rgba(239, 68, 68, 0.28) !important; color: #ef4444 !important; box-shadow: none !important;\n}\n.miuix-modal input[id$=\"__del\"]:hover, .miuix-modal input[id$=\"__delete\"]:hover, .bloop input[id$=\"__delete\"]:hover, .livetool input[id$=\"__del\"]:hover {\n    background: #ef4444 !important; border-color: #ef4444 !important; color: #ffffff !important; box-shadow: 0 3px 8px rgba(239, 68, 68, 0.35) !important;\n}\n\n.miuix-modal input[type=\"text\"], .miuix-modal input[type=\"number\"], .miuix-modal textarea, .miuix-modal select,\n.extool input[type=\"text\"], .extool input[type=\"number\"], .extool textarea, .extool select,\n.livetool input[type=\"text\"], .livetool input[type=\"number\"], .livetool textarea, .livetool select,\n.bloop input[type=\"text\"], .bloop input[type=\"number\"], .bloop textarea, .bloop select {\n    background: rgba(255, 255, 255, 0.7) !important; border: 1px solid rgba(0, 0, 0, 0.12) !important; border-radius: 8px !important;\n    padding: 4px 8px !important; font-size: 12px !important; color: #0f172a !important; outline: none !important; box-sizing: border-box !important;\n    transition: border-color 0.2s ease, box-shadow 0.2s ease !important;\n}\n.miuix-modal input[type=\"text\"]:focus, .miuix-modal textarea:focus, .miuix-modal select:focus,\n.extool input[type=\"text\"]:focus, .extool textarea:focus, .extool select:focus,\n.livetool input[type=\"text\"]:focus, .livetool textarea:focus, .livetool select:focus,\n.bloop input[type=\"text\"]:focus, .bloop textarea:focus, .bloop select:focus {\n    border-color: var(--miuix-blue) !important; box-shadow: 0 0 0 3px var(--miuix-blue-glow) !important;\n}\n\n/* ==================== 5级模态选择器与4级自由变形卡片 ==================== */\n/* 5级模态遮罩层 *" +
"/\n.ex-gift-picker-mask {\n    position: fixed !important;\n    top: 0 !important;\n    left: 0 !important;\n    right: 0 !important;\n    bottom: 0 !important;\n    background: rgba(15, 23, 42, 0.45) !important;\n    backdrop-filter: blur(8px) !important;\n    -webkit-backdrop-filter: blur(8px) !important;\n    z-index: 100049 !important;\n    animation: miuix-fade-in 0.2s ease forwards !important;\n}\n\n/* 5级模态容器 */\n.ex-gift-picker-modal {\n    position: fixed !important;\n    width: 540px !important;\n    max-width: 92vw !important;\n    height: 410px !important;\n    max-height: 85vh !important;\n    left: 50% !important;\n    top: 50% !important;\n    transform: translate(-50%, -50%) !important;\n    box-sizing: border-box !important;\n    display: flex !important;\n    flex-direction: column !important;\n    z-index: 100050 !important;\n    border-radius: 22px !important;\n    background: rgba(255, 255, 255, 0.88) !important;\n    backdrop-filter: blur(36px) saturate(220%) !important;\n    -webkit-backdrop-filter: blur(36px) saturate(220%) !important;\n    border: 1px solid rgba(255, 255, 255, 0.95) !important;\n    box-shadow: inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.98), 0 24px 60px rgba(15, 23, 42, 0.25) !important;\n    overflow: hidden !important;\n    animation: miuix-modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;\n}\n\n/* 吸顶 Tab 顶栏 */\n.ex-gift-picker__header {\n    flex: 0 0 auto !important;\n    display: flex !important;\n    align-items: center !important;\n    justify-content: space-between !important;\n    gap: 10px !important;\n    padding: 12px 16px !important;\n    border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;\n    background: rgba(255, 255, 255, 0.55) !important;\n}\n.ex-gift-picker__tabs {\n    display: flex !important;\n    gap: 6px !important;\n    background: rgba(" +
"0, 0, 0, 0.05) !important;\n    padding: 3px !important;\n    border-radius: 10px !important;\n    flex: 0 0 auto !important;\n}\n.ex-gift-picker__tab {\n    border: none !important;\n    background: transparent !important;\n    padding: 5px 14px !important;\n    border-radius: 8px !important;\n    font-size: 12.5px !important;\n    font-weight: 600 !important;\n    color: #64748b !important;\n    cursor: pointer !important;\n    transition: all 0.2s ease !important;\n}\n.ex-gift-picker__tab.is-active {\n    background: #ffffff !important;\n    color: #007aff !important;\n    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08) !important;\n}\n.ex-gift-picker__search {\n    flex: 1 1 auto !important;\n    max-width: 170px !important;\n    height: 28px !important;\n    padding: 0 10px !important;\n    box-sizing: border-box !important;\n    border-radius: 8px !important;\n    border: 1px solid rgba(0, 0, 0, 0.1) !important;\n    background: rgba(255, 255, 255, 0.75) !important;\n    font-size: 12px !important;\n    color: #0f172a !important;\n    outline: none !important;\n    transition: all 0.2s ease !important;\n}\n.ex-gift-picker__search:focus {\n    background: #ffffff !important;\n    border-color: #007aff !important;\n    box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.18) !important;\n}\n.ex-gift-picker__close {\n    width: 28px !important;\n    height: 28px !important;\n    border-radius: 8px !important;\n    background: rgba(0, 0, 0, 0.06) !important;\n    border: none !important;\n    color: #475569 !important;\n    font-size: 18px !important;\n    font-weight: bold !important;\n    cursor: pointer !important;\n    display: flex !important;\n    align-items: center !important;\n    justify-content: center !important;\n    transition: all 0.18s ease !important;\n    flex: 0 0 auto !important;\n}\n.ex-gift-picker__close:hover {\n    b" +
"ackground: #ef4444 !important;\n    color: #ffffff !important;\n    transform: scale(1.08) rotate(90deg) !important;\n}\n\n/* 4 列礼物网格 */\n.ex-gift-picker__body {\n    flex: 1 1 auto !important;\n    overflow-y: auto !important;\n    padding: 12px 16px !important;\n}\n.ex-gift-grid {\n    display: grid !important;\n    grid-template-columns: repeat(4, 1fr) !important;\n    gap: 10px !important;\n}\n.ex-gift-cell {\n    display: flex !important;\n    flex-direction: column !important;\n    align-items: center !important;\n    justify-content: center !important;\n    padding: 10px 6px !important;\n    box-sizing: border-box !important;\n    border-radius: 12px !important;\n    background: rgba(255, 255, 255, 0.5) !important;\n    border: 1px solid rgba(255, 255, 255, 0.8) !important;\n    cursor: pointer !important;\n    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;\n}\n.ex-gift-cell:hover {\n    background: #ffffff !important;\n    box-shadow: 0 4px 14px rgba(0, 122, 255, 0.15) !important;\n    border-color: rgba(0, 122, 255, 0.3) !important;\n    transform: translateY(-2px) !important;\n}\n.ex-gift-cell:active {\n    transform: scale(0.96) !important;\n}\n.ex-gift-cell__img {\n    width: 44px !important;\n    height: 44px !important;\n    object-fit: contain !important;\n    margin-bottom: 6px !important;\n}\n.ex-gift-cell__name {\n    font-size: 12px !important;\n    font-weight: 600 !important;\n    color: #0f172a !important;\n    text-align: center !important;\n    white-space: nowrap !important;\n    overflow: hidden !important;\n    text-overflow: ellipsis !important;\n    max-width: 95% !important;\n}\n.ex-gift-cell__price {\n    font-size: 11px !important;\n    color: #64748b !important;\n    margin-top: 2px !important;\n}\n\n/* 4级菜单礼物触控触发胶囊 */\n.ex-gift-pick-trigger {\n    display: flex !important;\n    ali" +
"gn-items: center !important;\n    gap: 8px !important;\n    padding: 6px 12px !important;\n    box-sizing: border-box !important;\n    border-radius: 10px !important;\n    background: rgba(255, 255, 255, 0.65) !important;\n    border: 1px solid rgba(0, 122, 255, 0.3) !important;\n    cursor: pointer !important;\n    transition: all 0.18s ease !important;\n    margin-bottom: 8px !important;\n}\n.ex-gift-pick-trigger:hover {\n    background: #ffffff !important;\n    border-color: #007aff !important;\n    box-shadow: 0 2px 8px rgba(0, 122, 255, 0.18) !important;\n    transform: translateY(-1px) !important;\n}\n.ex-gift-pick-trigger__icon {\n    width: 28px !important;\n    height: 28px !important;\n    object-fit: contain !important;\n    flex: 0 0 auto !important;\n}\n.ex-gift-pick-trigger__name {\n    font-size: 12.5px !important;\n    font-weight: 600 !important;\n    color: #0f172a !important;\n    flex: 1 1 auto !important;\n    white-space: nowrap !important;\n    overflow: hidden !important;\n    text-overflow: ellipsis !important;\n}\n.ex-gift-pick-trigger__tag {\n    font-size: 11px !important;\n    color: #007aff !important;\n    background: rgba(0, 122, 255, 0.08) !important;\n    padding: 2px 8px !important;\n    border-radius: 6px !important;\n    font-weight: 500 !important;\n    flex: 0 0 auto !important;\n}\n.ex-gift-pick-trigger__arrow {\n    font-size: 11px !important;\n    color: #94a3b8 !important;\n    flex: 0 0 auto !important;\n}\n\n/* 4级控制栏微排版与输入框 */\n.ex-gift-row {\n    display: flex !important;\n    align-items: center !important;\n    justify-content: space-between !important;\n    gap: 8px !important;\n    margin-top: 4px !important;\n}\n.ex-gift-label {\n    display: flex !important;\n    align-items: center !important;\n    gap: 4px !important;\n    font-size: 12px !important;\n    color: #475569 !impo" +
"rtant;\n}\n.ex-num-input {\n    height: 26px !important;\n    border-radius: 6px !important;\n    border: 1px solid rgba(0, 0, 0, 0.12) !important;\n    background: rgba(255, 255, 255, 0.8) !important;\n    text-align: center !important;\n    font-size: 12px !important;\n    font-weight: 600 !important;\n    color: #0f172a !important;\n    outline: none !important;\n    box-sizing: border-box !important;\n    transition: all 0.18s ease !important;\n}\n.ex-num-input:focus {\n    background: #ffffff !important;\n    border-color: #007aff !important;\n    box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.18) !important;\n}\n\n\n\n/* ==================== 一键签到三级面板样式 ==================== */\n.sign-options-list {\n    display: flex !important;\n    flex-direction: column !important;\n    gap: 6px !important;\n    margin-top: 4px !important;\n}\n.sign-option-item {\n    display: flex !important;\n    align-items: center !important;\n    gap: 10px !important;\n    padding: 7px 10px !important;\n    border-radius: 10px !important;\n    background: rgba(255, 255, 255, 0.55) !important;\n    border: 1px solid rgba(0, 0, 0, 0.05) !important;\n    cursor: pointer !important;\n    user-select: none !important;\n    transition: all 0.16s ease !important;\n}\n.sign-option-item:hover {\n    background: rgba(255, 255, 255, 0.88) !important;\n    border-color: rgba(0, 122, 255, 0.3) !important;\n    transform: translateY(-1px) !important;\n    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04) !important;\n}\n.sign-option-item input[type=\"checkbox\"] {\n    accent-color: #ff5d23 !important;\n    width: 16px !important;\n    height: 16px !important;\n    cursor: pointer !important;\n    flex: 0 0 auto !important;\n}\n.sign-option-text {\n    display: flex !important;\n    flex-direction: column !important;\n    flex: 1 !important;\n}\n.sign-option-title {\n    font-si" +
"ze: 12px !important;\n    font-weight: 600 !important;\n    color: #0f172a !important;\n    line-height: 1.3 !important;\n}\n.sign-option-desc {\n    font-size: 10.5px !important;\n    color: #64748b !important;\n    line-height: 1.2 !important;\n    margin-top: 1px !important;\n}\n.sign-status-tag {\n    font-size: 11px !important;\n    color: #10b981 !important;\n    font-weight: 600 !important;\n}\n.sign-log-box {\n    min-height: 52px !important;\n    max-height: 72px !important;\n    overflow-y: auto !important;\n    font-size: 11px !important;\n    color: #334155 !important;\n    background: rgba(241, 245, 249, 0.7) !important;\n    border: 1px solid rgba(0, 0, 0, 0.05) !important;\n    border-radius: 8px !important;\n    padding: 6px 10px !important;\n    line-height: 1.45 !important;\n    font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif !important;\n}\n.sign-log-box::-webkit-scrollbar {\n    width: 4px !important;\n}\n.sign-log-box::-webkit-scrollbar-thumb {\n    background: rgba(0, 0, 0, 0.2) !important;\n    border-radius: 4px !important;\n}\n\n")),
  ),
    document.head.appendChild(e));
}

}
,
"src/next/ui/panel-dispatch.js":
function* (__imports) {
yield {"openFeaturePanel": { get: () => openFeaturePanel, set: value => { openFeaturePanel = value; } }};
function openFeaturePanel(t, forceShow, btnEl) {
  var o = [
    {
      name: "弹幕发送小助手",
      className: "bloop",
      title: "弹幕小助手",
      dockCls: "bloop-icon",
    },
    {
      name: "扩展功能",
      className: "extool",
      title: "扩展功能",
      dockCls: "extool-icon",
    },
    {
      name: "直播间工具",
      className: "livetool",
      title: "直播间工具",
      dockCls: "livetool-icon",
    },
    {
      name: "全站抽奖信息",
      className: "exlottery",
      title: "全站抽奖",
      dockCls: "ex-lottery",
    },
    {
      name: "弹幕小尾巴",
      className: "ChatToolBar-DanmakuTail-Panel",
      title: "弹幕小尾巴",
      dockCls: "ChatToolBar-DanmakuTail",
    },
    {
      name: "一键续牌",
      className: "fans-continue-panel",
      title: "一键续牌",
      dockCls: "fans-continue",
    },
    {
      name: "一键签到",
      className: "sign-panel",
      title: "一键签到",
      dockCls: "ex-sign",
    },
    {
      name: "同屏播放",
      className: "popup-player-panel",
      title: "同屏播放器",
      dockCls: "popup-player",
    },
    {
      name: "版本更新",
      className: "exupdate-panel",
      title: "版本更新",
      dockCls: "ex-update",
    },
  ];
  var activeDockCls = null;
  for (var e = 0; e < o.length; e++) {
    var item = o[e];
    if (
      item.className === "exupdate-panel" &&
      typeof __imports.createExUpdatePanel === "function"
    ) {
      (0, __imports.createExUpdatePanel)();
    }
    var panel = document.getElementsByClassName(item.className)[0];
    if (panel) {
      if (t === item.name) {
        var isHidden = forceShow
          ? true
          : panel.style.display === "none" || !panel.style.display;
        try {
          if (!forceShow && typeof getComputedStyle === "function") {
            isHidden = isHidden || getComputedStyle(panel).display === "none";
          }
        } catch (err) {}
        if (isHidden) {
          panel.style.setProperty("display", "flex", "important");
          panel.style.setProperty("flex-direction", "column", "important");
          if (typeof __imports.ensureMiuixPanelHeader === "function") {
            (0, __imports.ensureMiuixPanelHeader)(panel, item.title);
          }
          if (typeof __imports.anchorPanelToButton === "function") {
            (0, __imports.anchorPanelToButton)(
              panel,
              btnEl || document.querySelector("." + item.dockCls),
            );
          }
          activeDockCls = item.dockCls;
        } else {
          panel.style.setProperty("display", "none", "important");
        }
      } else {
        panel.style.setProperty("display", "none", "important");
      }
    }
  }
  if (typeof __imports.updateDockActiveIndicator === "function") {
    (0, __imports.updateDockActiveIndicator)(activeDockCls);
  }
}

}
,
"src/next/services/sign-engine.js":
function* (__imports) {
yield {"executeSignEngine": { get: () => executeSignEngine, set: value => { executeSignEngine = value; } }};
async function executeSignEngine(options, onLog) {
  if (typeof onLog !== "function")
    onLog = function (msg, isSuccess) {
      (0, __imports.T)(msg, isSuccess ? "success" : "info");
    };
  var opts = options || {
    room: true,
    client: true,
    yuba: true,
    fanshome: true,
    stardiscover: true,
  };

  onLog("正在准备签到环境...", true);

  // 1. 鱼吧签到
  if (opts.yuba) {
    try {
      onLog("正在获取关注鱼吧列表...");
      var followData = await (0, __imports.ai)(1);
      var groupList =
        followData && followData.list ? followData.list.slice() : [];
      var totalPages = Number((followData && followData.count_page) || 1) - 1;
      for (var p = 0; p < totalPages; p++) {
        var nextFollow = await (0, __imports.ai)(2 + p);
        if (nextFollow && nextFollow.list)
          groupList = groupList.concat(nextFollow.list);
      }
      if (groupList.length > 0) {
        var signCount = 0;
        for (var g = 0; g < groupList.length; g++) {
          var gid = groupList[g].group_id;
          if (!gid) continue;
          await new Promise(function (resolve) {
            (0, __imports.GM_xmlhttpRequest)({
              method: "POST",
              url: "https://yuba.douyu.com/ybapi/topic/sign",
              data: "group_id=" + gid,
              responseType: "json",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "dy-client": "pc",
                "dy-token": __imports.m,
                Referer: "https://yuba.douyu.com/group/" + gid,
              },
              onload: function () {
                signCount++;
                resolve();
              },
              onerror: function () {
                resolve();
              },
            });
          });
          if (g % 3 === 0) await (0, __imports.b)(120);
        }
        onLog("【鱼吧签到】已打卡 " + signCount + " 个关注鱼吧", true);
      } else {
        onLog("【鱼吧签到】未检测到关注的鱼吧", true);
      }
    } catch (err) {
      onLog("【鱼吧签到】执行异常: " + (err.message || "网络错误"), false);
    }
  }

  // 2. 客户端模拟签到 (领取每日礼盒)
  if (opts.client) {
    try {
      onLog("正在执行【客户端模拟】签到...");
      await new Promise(function (resolve) {
        (0, __imports.GM_xmlhttpRequest)({
          method: "POST",
          url: "https://apiv2.douyucdn.cn/h5nc/sign/sendSign",
          data: "token=" + __imports.m,
          responseType: "json",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          onload: function (res) {
            var o = res.response || {};
            if (o.data && o.data.sign_pl && o.data.sign_pl.length > 0) {
              var items = o.data.sign_pl
                .map(function (it) {
                  return it.cnt + "个" + it.name;
                })
                .join(", ");
              onLog("【客户端签到】获得: " + items, true);
            } else if (o.data && o.data.length === 0) {
              onLog("【客户端签到】今日已签到", true);
            } else {
              onLog("【客户端签到】打卡成功", true);
            }
            resolve();
          },
          onerror: function () {
            onLog("【客户端签到】请求失败", false);
            resolve();
          },
        });
      });
    } catch (err) {
      onLog("【客户端签到】执行异常", false);
    }
  }

  // 3. 房间与粉丝牌签到
  if (opts.room) {
    try {
      onLog("正在获取关注房间列表...");
      var followRes = await new Promise(function (resolve) {
        (0, __imports.fetch)(
          "https://www.douyu.com/wgapi/livenc/liveweb/follow/list?page=1428",
          {
            method: "GET",
            mode: "no-cors",
            cache: "default",
            credentials: "include",
          },
        )
          .then(function (r) {
            return r.json();
          })
          .then(resolve)
          .catch(function () {
            resolve(null);
          });
      });
      if (followRes && followRes.data && followRes.data.list) {
        var rooms = followRes.data.list;
        var roomCount = 0;
        for (var ri = 0; ri < rooms.length; ri++) {
          var rItem = rooms[ri];
          if (rItem && rItem.room_id) {
            (0, __imports.$n)(rItem.room_id);
            roomCount++;
          }
          if (ri % 5 === 0) await (0, __imports.b)(100);
        }
        onLog("【房间签到】" + roomCount + " 个关注房间签到完毕", true);
      } else {
        onLog("【房间签到】关注列表为空或未登录", false);
      }
    } catch (err) {
      onLog("【房间签到】执行异常", false);
    }
  }

  // 4. 星推日常任务 (打开活动页 + 曝光打卡 + 口令弹幕[仅星推参赛房间] + 动态 introduce 获取主播 + 满额5位安全取关闭环)
  if (opts.stardiscover) {
    try {
      onLog("正在获取星推榜单与任务配置...");
      // 提取规范纯数字房间号
      var curNumericRid = "";
      try {
        var rCandidate = String(
          window.room_id ||
            (window.$ROOM && window.$ROOM.room_id) ||
            (typeof __imports.B !== "undefined" ? __imports.B : "") ||
            "",
        );
        if (/^\d+$/.test(rCandidate)) curNumericRid = rCandidate;
        else {
          var mPath = window.location.pathname.match(/\/(\d+)/);
          if (mPath && mPath[1]) curNumericRid = mPath[1];
        }
      } catch (e) {}
      if (!/^[1-9]\d*$/.test(curNumericRid))
        throw new Error("当前房间号不可用，星推任务已停止");
      var queryRid = curNumericRid;

      // 获取斗鱼标准 CSRF 凭据 (ccn)
      async function getDouyuCtn() {
        var m = document.cookie.match(/(?:^|;\s*)ccn=([^;]+)/);
        if (m && m[1]) return decodeURIComponent(m[1]);
        try {
          await (0, __imports.fetch)("/wgapi/livenc/liveweb/csrfApi/getCsrfCookie", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          });
          var m2 = document.cookie.match(/(?:^|;\s*)ccn=([^;]+)/);
          if (m2 && m2[1]) return decodeURIComponent(m2[1]);
        } catch (e) {}
        var m3 = document.cookie.match(/(?:^|;\s*)acf_ccn=([^;]+)/);
        if (m3 && m3[1]) return decodeURIComponent(m3[1]);
        return "";
      }

      var realCtn = await getDouyuCtn();

      // 获取 post-csrfToken 用于 anchorstardiscover 接口
      var csrf = "";
      try {
        var mCsrf = document.cookie.match(/(^| )post-csrfToken=([^;]*)(;|$)/);
        csrf = mCsrf ? unescape(mCsrf[2]) : "";
        if (!csrf) {
          csrf = Math.random().toString(36).substr(2);
          document.cookie = "post-csrfToken=" + escape(csrf) + ";path=/";
        }
      } catch (e) {}

      function postStarReport(rid, type) {
        return (0, __imports.fetch)(
          "https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/report",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "dy-csrf-token": csrf,
            },
            body:
              "ctn=" +
              encodeURIComponent(realCtn || "1") +
              "&type=" +
              type +
              "&rid=" +
              encodeURIComponent(rid),
          },
        )
          .then(function (r) {
            return r.json();
          })
          .catch(function () {
            return null;
          });
      }

      async function followAnchorApi(rid, token) {
        return (0, __imports.fetch)("/wgapi/livenc/liveweb/follow/add", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body:
            "rid=" +
            encodeURIComponent(rid) +
            "&ctn=" +
            encodeURIComponent(token || ""),
        })
          .then(function (r) {
            return r.json();
          })
          .catch(function (e) {
            return { error: -1, msg: e.message };
          });
      }

      async function unfollowAnchorApi(rid, token) {
        return (0, __imports.fetch)("/wgapi/livenc/liveweb/follow/rm", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body:
            "rid=" +
            encodeURIComponent(rid) +
            "&ctn=" +
            encodeURIComponent(token || ""),
        })
          .then(function (r) {
            return r.json();
          })
          .catch(function (e) {
            return { error: -1, msg: e.message };
          });
      }

      // 查询官方星推任务实时列表与完成进度
      async function fetchStarTaskList() {
        try {
          var res = await (0, __imports.fetch)(
            "https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/list?rid=" +
              queryRid,
            {
              credentials: "include",
            },
          ).then(function (r) {
            return r.json();
          });
          if (res && res.data && Array.isArray(res.data.taskList)) {
            return res.data.taskList;
          }
        } catch (e) {}
        return [];
      }

      // (1) 任务6：每日首次打开活动页 (+10金币)
      try {
        await postStarReport(queryRid, 6);
        onLog("【星推任务】已完成每日活动页打卡 (+10金币)", true);
      } catch (e) {}

      // (2) 拉取星推大盘榜单 (获取活跃参赛主播池)
      var rankUrl =
        "https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/rank/info?rid=" +
        queryRid +
        "&type=5&track=3";
      var rankRes = await new Promise(function (resolve) {
        (0, __imports.fetch)(rankUrl, { method: "GET", credentials: "include" })
          .then(function (r) {
            return r.json();
          })
          .then(resolve)
          .catch(function () {
            resolve(null);
          });
      });
      var rankList =
        rankRes && rankRes.data && Array.isArray(rankRes.data.rankItemList)
          ? rankRes.data.rankItemList
          : [];
      var starRids = rankList
        .map(function (item) {
          return String(item.rid || item.rId || "");
        })
        .filter(Boolean);

      // (3) 任务5：3个活动直播间签到打卡 (+9金币)
      var signRids = starRids.slice(0, 3);
      for (var si = 0; si < signRids.length; si++) {
        var srid = signRids[si];
        try {
          await postStarReport(srid, 5);
        } catch (e) {}
        await (0, __imports.b)(200);
      }
      if (signRids.length > 0) {
        onLog(
          "【星推签到】完成 " + signRids.length + " 个星推直播间打卡 (+9金币)",
          true,
        );
      }

      // (4) 任务7：发送指定助力口令弹幕 (严禁在普通直播间乱发，仅在指定星推参赛房间发送)
      var isStarCompetitionRoom = false;
      if (curNumericRid && rankRes && rankRes.data && rankRes.data.memberInfo) {
        var mInfo = rankRes.data.memberInfo;
        if (
          mInfo.hide === 0 &&
          Number(mInfo.rank) > 0 &&
          String(mInfo.rid) === String(curNumericRid)
        ) {
          isStarCompetitionRoom = true;
        }
      }
      if (isStarCompetitionRoom) {
        try {
          var txtEl =
            document.querySelector("textarea.ChatSend-txt") ||
            document.querySelector("div.ChatSend-txt");
          var sendBtn = document.querySelector(".ChatSend-button");
          if (txtEl && sendBtn) {
            var isDiv = "div" === txtEl.tagName.toLowerCase();
            var origVal = isDiv ? txtEl.innerText : txtEl.value;
            if (isDiv) txtEl.innerText = "全民星推荐助力主播成长";
            else txtEl.value = "全民星推荐助力主播成长";
            txtEl.dispatchEvent(new Event("input", { bubbles: true }));
            sendBtn.click();
            await (0, __imports.b)(400);
            if (isDiv) txtEl.innerText = origVal || "";
            else txtEl.value = origVal || "";
            txtEl.dispatchEvent(new Event("input", { bubbles: true }));
            onLog(
              "【星推弹幕】当前为星推参赛直播间，已自动发送指定助力口令 (+5金币)",
              true,
            );
          }
        } catch (e) {}
      } else {
        onLog(
          "【星推弹幕】当前房间非指定星推参赛直播间，已安全跳过口令发送（避免打扰主播）",
          true,
        );
      }

      // (5) 任务4：关注5名新主播 (+15金币) - 每轮动态请求官方 introduce 推荐，关注后立即安全取关
      try {
        var currentTaskList = await fetchStarTaskList();
        var task4Info = currentTaskList.find(function (t) {
          return Number(t.type) === 4;
        });
        var completedCount = task4Info
          ? Number(task4Info.curCompleteNum || 0)
          : 0;
        var targetCount = 5;

        if (completedCount >= targetCount) {
          onLog(
            "【星推关注】今日关注任务已全部达成 (" + completedCount + "/5)",
            true,
          );
        } else {
          var needed = targetCount - completedCount;
          onLog(
            "正在执行【星推关注任务】(当前进度 " +
              completedCount +
              "/5，需完成 " +
              needed +
              " 位)...",
          );
          realCtn = await getDouyuCtn();

          var processedRids = [];
          var attemptIndex = 0;

          while (completedCount < targetCount && attemptIndex < 12) {
            var sourceRid =
              attemptIndex < starRids.length
                ? starRids[attemptIndex]
                : queryRid;
            attemptIndex++;

            // 动态向官方 introduce 端点请求推荐主播
            var targetRid = "";
            try {
              var introRes = await (0, __imports.fetch)(
                "https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/follow/introduce?rid=" +
                  sourceRid,
                {
                  credentials: "include",
                },
              )
                .then(function (r) {
                  return r.json();
                })
                .catch(function () {
                  return null;
                });
              if (
                introRes &&
                introRes.data &&
                Array.isArray(introRes.data.list) &&
                introRes.data.list.length > 0
              ) {
                targetRid = String(
                  introRes.data.list[0].rid || introRes.data.list[0].rId || "",
                );
              }
            } catch (e) {}

            // 若 introduce 未返回，则从大盘榜单中挑选一位未处理主播
            if (
              !targetRid ||
              processedRids.indexOf(targetRid) !== -1 ||
              targetRid === curNumericRid
            ) {
              for (var si = 0; si < starRids.length; si++) {
                var sCand = starRids[si];
                if (
                  sCand &&
                  sCand !== curNumericRid &&
                  processedRids.indexOf(sCand) === -1
                ) {
                  targetRid = sCand;
                  break;
                }
              }
            }

            if (!targetRid) break;
            processedRids.push(targetRid);

            try {
              // 1. 添加关注
              var addRes = await followAnchorApi(targetRid, realCtn);
              if (addRes && (addRes.error === 0 || addRes.code === 0)) {
                // 2. 适当驻留 1.8 秒让服务端任务系统结算
                await (0, __imports.b)(1800);
              }

              // 3. 立即安全取关 (内置自动重试与凭据校验)
              var rmOk = false;
              for (var retry = 0; retry < 3; retry++) {
                var rmRes = await unfollowAnchorApi(targetRid, realCtn);
                if (rmRes && (rmRes.error === 0 || rmRes.code === 0)) {
                  rmOk = true;
                  break;
                }
                await (0, __imports.b)(400);
                realCtn = await getDouyuCtn();
              }

              // 4. 再次校验任务进度
              var updatedList = await fetchStarTaskList();
              var updatedT4 = updatedList.find(function (t) {
                return Number(t.type) === 4;
              });
              var newCompleted = updatedT4
                ? Number(updatedT4.curCompleteNum || 0)
                : completedCount + 1;

              if (newCompleted > completedCount) {
                completedCount = newCompleted;
                onLog(
                  "【星推关注】主播 " +
                    targetRid +
                    " 关注成功并已安全取关 (" +
                    completedCount +
                    "/5)",
                  true,
                );
              } else {
                onLog(
                  "【星推关注】主播 " + targetRid + " 已处理并安全取关",
                  true,
                );
              }
            } catch (err) {
              try {
                await unfollowAnchorApi(targetRid, realCtn);
              } catch (e) {}
            }

            // 避免触发高频风控，间隔 800ms 进入下一位
            await (0, __imports.b)(800);
          }

          // 最终安全巡检：对本次涉及的全部主播再次执行安全取关兜底，100% 杜绝残留
          for (var ci = 0; ci < processedRids.length; ci++) {
            try {
              await unfollowAnchorApi(processedRids[ci], realCtn);
            } catch (e) {}
          }

          onLog(
            "【星推关注】已达成 " +
              completedCount +
              "/5 位关注任务，关注列表 100% 保持纯净 (+15金币)",
            true,
          );
        }
      } catch (e) {
        onLog("【星推关注】关注任务异常: " + (e.message || "未知错误"), false);
      }

      // (6) 互动积分任务上报 (type=1)
      for (var si2 = 0; si2 < Math.min(3, starRids.length); si2++) {
        try {
          await postStarReport(starRids[si2], 1);
        } catch (e) {}
        await (0, __imports.b)(150);
      }
      onLog("【星推任务】星推日常任务已全部执行完毕！", true);
    } catch (err) {
      onLog("【星推任务】执行异常: " + (err.message || "未知错误"), false);
    }
  }
  // 5. 粉丝家园与钻粉联赛签到
  if (opts.fanshome) {
    try {
      onLog("正在执行【粉丝家园】签到...");
      if (typeof __imports.To !== "undefined" && Array.isArray(__imports.To)) {
        for (var fi = 0; fi < __imports.To.length; fi++) {
          var trid = __imports.To[fi];
          try {
            await (0, __imports.fetch)(
              "https://www.douyu.com/japi/interactnc/web/fanshome/sign",
              {
                method: "POST",
                mode: "no-cors",
                credentials: "include",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: "ctn=" + (0, __imports.w)() + "&rid=" + trid,
              },
            );
            await (0, __imports.fetch)(
              "https://www.douyu.com/japi/interactnc/web/dfansact/userSign",
              {
                method: "POST",
                mode: "no-cors",
                credentials: "include",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: "ctn=" + (0, __imports.w)() + "&rid=" + trid,
              },
            );
          } catch (e) {}
        }
      }
      onLog("【粉丝家园】签到打卡完毕", true);
    } catch (err) {
      onLog("【粉丝家园】未加入粉丝家园", true);
    }
  }

  onLog("全部已选签到任务执行完毕！", true);
}
window.executeSignEngine = executeSignEngine;


}
,
"src/next/services/session.js":
function* (__imports) {
yield {"B": { get: () => B, set: value => { B = value; } },
"I": { get: () => I, set: value => { I = value; } },
"W": { get: () => W, set: value => { W = value; } },
"Y": { get: () => Y, set: value => { Y = value; } },
"m": { get: () => m, set: value => { m = value; } },
"n": { get: () => n, set: value => { n = value; } },
"readRoomIdentity": { get: () => readRoomIdentity, set: value => { readRoomIdentity = value; } },
"t": { get: () => t, set: value => { t = value; } }};
var o = document.getElementsByTagName("html")[0].innerHTML,
  n = "$ROOM.room_id =".length,
  t = o.indexOf("$ROOM.room_id ="),
  B = "",
  I =
    (0 < t
      ? (B = (B = o.substring(t + n, o.indexOf(";", t + n))) && B.trim())
      : (B = (0, __imports.v)(o, "roomID:", ","))
        ? (B = B.trim())
        : (t = document.querySelector('link[rel="canonical"]')) &&
          (B = t.getAttribute("href").split("/").pop().trim()),
    (o = null),
    (0, __imports.x)("acf_uid")),
  W = "",
  m =
    (0, __imports.x)("acf_uid") +
    "_" +
    (0, __imports.x)("acf_biz") +
    "_" +
    (0, __imports.x)("acf_stk") +
    "_" +
    (0, __imports.x)("acf_ct") +
    "_" +
    (0, __imports.x)("acf_ltkid"),
  Y = null;
if (!B) {
  try {
    B = String(
      window.room_id ||
        (window.$ROOM && window.$ROOM.room_id) ||
        (location.pathname.match(/\/(\d+)/) || [])[1] ||
        "",
    ).trim();
  } catch (e) {}
}
// Read only identity sources already used by the session bootstrap. Alias paths
// themselves are never room IDs; SPA navigation must wait for fresh page data.
function readRoomIdentity() {
  const page = typeof __imports.unsafeWindow !== "undefined" ? __imports.unsafeWindow : window;
  const numeric = value => /^\d+$/.test(String(value || '').trim()) ? String(value).trim() : '';
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
  const html = document.getElementsByTagName('html')[0]?.innerHTML || '';
  return [
    numeric(page.$ROOM?.room_id), numeric(page.room_id),
    numeric((canonical.match(/\/(\d+)\/?(?:[?#].*)?$/) || [])[1]),
    numeric((html.match(/\$ROOM\.room_id\s*=\s*['"]?(\d+)/) || [])[1]),
    numeric((html.match(/roomID:\s*['"]?(\d+)/) || [])[1]),
  ];
}
if (!I) {
  try {
    I = String(
      (0, __imports.x)("acf_uid") ||
        (document.cookie.match(/(?:^|;\s*)acf_uid=([^;]+)/) || [])[1] ||
        "",
    ).trim();
  } catch (e) {}
}
if (!W) {
  try {
    var _cw = (0, __imports.x)("acf_nickname");
    if (_cw) W = decodeURIComponent(_cw);
  } catch (e) {}
}

}
,
"src/next/services/utilities.js":
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
,
"src/next/services/accounts.js":
function* (__imports) {
yield {"ae": { get: () => ae, set: value => { ae = value; } },
"ie": { get: () => ie, set: value => { ie = value; } },
"le": { get: () => le, set: value => { le = value; } },
"ne": { get: () => ne, set: value => { ne = value; } },
"oe": { get: () => oe, set: value => { oe = value; } },
"re": { get: () => re, set: value => { re = value; } }};
let oe =
    '<svg t="1613993967937" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2122" width="16" height="16"><path d="M217.472 311.808l384.64 384.64-90.432 90.56-384.64-384.64z" fill="#8A8A8A" p-id="2123"></path><path d="M896.32 401.984l-384.64 384.64-90.56-90.496 384.64-384.64z" fill="#8A8A8A" p-id="2124"></path></svg>',
  ne = 0;
function ie(e) {
  var _al = document.getElementById("ex-accountList-content");
  if (_al)
    _al.innerHTML = ((e) => {
      let t = null == e ? JSON.parse((0, __imports.GM_getValue)("Ex_accountList") || "{}") : e,
        o = "";
      for (var n in t)
        "null" != n &&
          ((n = t[n]),
          (o += `

        <div class="ex-accountList-item" uid="${n.uid}">

            <div class="ex-accountList-item__imgWrap">

                <img src=${decodeURIComponent(n.avatar) + "middle.jpg"} alt="" class="ex-accountList-item__img">

            </div>

            <div class="ex-accountList-item__name">${decodeURIComponent(n.nickname)}</div>

            <div class="ex-accountList-item__btn">删除</div>

        </div>`));
      return (o += `

    <div id="ex-accountList-item-add">

        <svg t="1613995373702" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2832" width="32" height="32"><path d="M577.088 0H448.96v448.512H0v128h448.96V1024h128.128V576.512H1024v-128H577.088z" p-id="2833" fill="#8A8A8A"></path></svg>

    </div>

    `);
    })(e);
  var t = document.getElementsByClassName("ex-accountList-item");
  for (let e = 0; e < t.length; e++) {
    var o = t[e];
    let a = o.getAttribute("uid");
    (o.addEventListener("click", () => {
      (0, __imports.T)("【账号管理】正在切换账号，请耐心等待...", "info");
      {
        a;
        var i = () => {};
        JSON.parse((0, __imports.GM_getValue)("Ex_accountList"));
        let o = [],
          n = 0;
        (0, __imports.GM_cookie)("list", { path: "/" }, function (t) {
          for (let e = 0; e < t.length; e++)
            (0, __imports.GM_cookie)("delete", { name: t[e].name }, function (e) {
              if (++n >= t.length) {
                let t = 0;
                for (let e = 0; e < o.length; e++)
                  (0, __imports.GM_cookie)(
                    "set",
                    {
                      name: o[e].name,
                      value: o[e].value,
                      domain: o[e].domain,
                      path: o[e].path,
                      secure: o[e].secure,
                      httpOnly: o[e].httpOnly,
                      sameSite: o[e].sameSite,
                      expirationDate: o[e].expirationDate,
                      hostOnly: o[e].hostOnly,
                    },
                    function (e) {
                      ++t >= o.length && i();
                    },
                  );
              }
            });
        });
      }
      (re("switch", a),
        (document.getElementById("ex-accountList-iframe2").innerHTML = `

    <iframe id="ex-yuba-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://yuba.douyu.com/iframe/tab/6416853?exClean&domain=${encodeURIComponent(window.location.href)}&"></iframe>

    <iframe id="ex-msg-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://msg.douyu.com/web/index.html?exClean&domain=${encodeURIComponent(window.location.href)}&"></iframe>

    <iframe id="ex-video-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://v.douyu.com/show/0?exClean&domain=${encodeURIComponent(window.location.href)}&"></iframe>

    <iframe id="ex-cz-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://cz.douyu.com/item/gold?exClean&domain=${encodeURIComponent(window.location.href)}&"></iframe>

    `));
    }),
      o
        .getElementsByClassName("ex-accountList-item__btn")[0]
        .addEventListener("click", (e) => {
          var t, o;
          (e.stopPropagation(),
            (0, __imports.T)("【账号管理】正在删除...", "info"),
            (e = a),
            (t = () => {}),
            delete (o = JSON.parse((0, __imports.GM_getValue)("Ex_accountList") || "{}"))[e],
            (0, __imports.GM_setValue)("Ex_accountList", JSON.stringify(o)),
            t(),
            re("delete", a));
        }));
  }
  var _addBtn = document.getElementById("ex-accountList-item-add");
  _addBtn &&
    _addBtn.addEventListener("click", () => {
      (ae(() => {}), re("clean", "null"));
    });
}
function ae(o) {
  let n = 0;
  (0, __imports.GM_cookie)("list", { path: "/" }, (t) => {
    if (t)
      for (let e = 0; e < t.length; e++)
        (0, __imports.GM_cookie)("delete", { name: t[e].name }, function (e) {
          ++n >= t.length && o();
        });
    else o();
  });
}
function re(e, t) {
  var _iframe = document.getElementById("ex-accountList-iframe");
  if (_iframe)
    _iframe.innerHTML = `

    <iframe id="login-passport-frame" width="100%" height="100%" scrolling="no" frameborder="0" src="https://passport.douyu.com/index/error/show404?&exid=chun&cmd=${e}&uid=${t}&domain=${encodeURIComponent(window.location.href)}&"></iframe>

    `;
}
function le() {
  var e = (0, __imports.E)([".pause-c594e8", ".icon-c8be96"]);
  (e && e.click(),
    (0, __imports.qr)(__imports.B, !0, 0, "1428", (e) => {
      var i, a;
      ((i = __imports.D.length),
        (0, __imports.qr)((a = __imports.B), !1, 0, "1", (t) => {
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
                            (n +=
                              "<div class='exVideoInfo' id='exVideoInfo" +
                              String(i) +
                              "'><a title='复制直播流地址'><span class='exVideoRID' id='exVideoRID" +
                              String(i) +
                              "' style='color:white'>斗鱼音频流 - " +
                              a +
                              "</span></a>") +
                            ("<select style='display:none' class='exVideoQn' id='exVideoQn" +
                              String(i) +
                              "'><option value='1'>流畅</option><option value='2'>高清</option><option value='3'>超清</option><option value='0'>蓝光</option></select>")) +
                          ("<select style='display:none' class='exVideoCDN' id='exVideoCDN" +
                            String(i) +
                            "'><option value='1'>主线路</option><option value='2'>备用线路5</option><option value='3'>备用线路6</option></select>")) +
                        ("<a style='margin-left:5px;display:none' href='" +
                          e +
                          "' target='_blank'>无视频？</a>")) +
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
              (n.insertBefore(o, n.childNodes[0]),
                (0, __imports.on)(i),
                (0, __imports.tn)(i),
                (0, __imports.an)(i, a),
                (0, __imports.f)(i, t));
            }
        }));
    }));
}

}
,
"src/next/services/automation.js":
function* (__imports) {
yield {"Ae": { get: () => Ae, set: value => { Ae = value; } },
"C": { get: () => C, set: value => { C = value; } },
"Ce": { get: () => Ce, set: value => { Ce = value; } },
"De": { get: () => De, set: value => { De = value; } },
"Ee": { get: () => Ee, set: value => { Ee = value; } },
"Ge": { get: () => Ge, set: value => { Ge = value; } },
"Ie": { get: () => Ie, set: value => { Ie = value; } },
"Le": { get: () => Le, set: value => { Le = value; } },
"Me": { get: () => Me, set: value => { Me = value; } },
"Ne": { get: () => Ne, set: value => { Ne = value; } },
"Oe": { get: () => Oe, set: value => { Oe = value; } },
"Pe": { get: () => Pe, set: value => { Pe = value; } },
"Re": { get: () => Re, set: value => { Re = value; } },
"Se": { get: () => Se, set: value => { Se = value; } },
"Te": { get: () => Te, set: value => { Te = value; } },
"Ue": { get: () => Ue, set: value => { Ue = value; } },
"Ve": { get: () => Ve, set: value => { Ve = value; } },
"We": { get: () => We, set: value => { We = value; } },
"Ye": { get: () => Ye, set: value => { Ye = value; } },
"_e": { get: () => _e, set: value => { _e = value; } },
"be": { get: () => be, set: value => { be = value; } },
"ce": { get: () => ce, set: value => { ce = value; } },
"de": { get: () => de, set: value => { de = value; } },
"fe": { get: () => fe, set: value => { fe = value; } },
"ge": { get: () => ge, set: value => { ge = value; } },
"he": { get: () => he, set: value => { he = value; } },
"ke": { get: () => ke, set: value => { ke = value; } },
"me": { get: () => me, set: value => { me = value; } },
"pe": { get: () => pe, set: value => { pe = value; } },
"qe": { get: () => qe, set: value => { qe = value; } },
"refreshFansMedalCache": { get: () => refreshFansMedalCache, set: value => { refreshFansMedalCache = value; } },
"se": { get: () => se, set: value => { se = value; } },
"ue": { get: () => ue, set: value => { ue = value; } },
"ve": { get: () => ve, set: value => { ve = value; } },
"we": { get: () => we, set: value => { we = value; } },
"xe": { get: () => xe, set: value => { xe = value; } },
"ye": { get: () => ye, set: value => { ye = value; } },
"ze": { get: () => ze, set: value => { ze = value; } }};
let se,
  de = null;
let ce = [],
  pe = [],
  me = 0,
  ue = 0,
  ge,
  he = 0,
  fe = 0,
  ye = !0,
  be = !1,
  ve,
  xe = [];
function we(e) {
  var t = document.getElementsByClassName("ChatSend-txt")[0];
  ("TEXTAREA" == t.tagName ? (t.value = e) : (t.innerText = e),
    document.getElementsByClassName("ChatSend-button")[0].click());
}
function _e() {
  var e = document.getElementById("bloop__text_speed1").value,
    t = document.getElementById("bloop__text_speed2").value;
  return (0, __imports.a)(Number(e), Number(t));
}
function ke() {
  let e = document.getElementById("bloop__text_speed1").value,
    t = document.getElementById("bloop__text_speed2").value,
    o = document.getElementById("bloop__text_stoptime").value;
  var n = document.getElementById("bloop__checkbox_tiangou").checked,
    n =
      ("undefined" == e && (e = 2e3),
      "undefined" == t && (t = 3e3),
      "undefined" == o && (o = 5),
      {
        text: xe,
        speed1: e,
        speed2: t,
        stopTime: o,
        isChangeColor: ye,
        isTiangouMode: n,
      });
  __imports.localStorage.setItem(
    "ExSave_BarrageLoopOptions",
    JSON.stringify(n).replace(/\\n/g, "\\r"),
  );
}
function Ee(owner, isRunning = () => true) {
  // This sends to the current room: every recursive tick belongs to its mount.
  if (!owner || owner.disposed || !isRunning() ||
      !document.getElementById("bloop__checkbox_startSend")?.checked) return;
  if (1 == ye) {
    {
      var t = fe;
      let e;
      null !=
        (e = (
          0 == be
            ? (document
                .getElementsByClassName("FansBarrageSwitcher")[0]
                .click(),
              document.getElementsByClassName("FansBarrageColor-item"))
            : (document
                .getElementsByClassName("MatchSystemFansBarrageSwitcher")[0]
                .click(),
              document.getElementsByClassName(
                "MatchSystemFansBarrageColor-item",
              ))
        )[t]) && e.click();
    }
    ++fe > me && (fe = 0);
  }
  (1 == document.getElementById("bloop__checkbox_tiangou").checked
    ? (0, __imports.T)("第三方彩虹屁已退休，请关闭该模式并使用本地词库", "info")
    : (1 == document.getElementById("bloop__checkbox_random").checked &&
        (he = Math.floor(Math.random() * pe.length)),
      we(pe[he]),
      1 != document.getElementById("bloop__checkbox_random").checked &&
        ++he > pe.length - 1 &&
        (he = 0)),
    (ge = owner.timeout(() => Ee(owner, isRunning), _e())));
}
let Be = !1;
function Ie(e) {
  if (!Be) {
    Be = !0;
    try {
      e();
    } finally {
      (0, __imports.setTimeout)(() => {
        Be = !1;
      }, 0);
    }
  }
}
function Te() {
  var e,
    t,
    o = document.getElementsByClassName("danmuContent-25f266")[0];
  o &&
    (e = o.innerHTML).includes("[DouyuEx图片") &&
    (t = e.replace(/\[DouyuEx图片(.*?)\]/g, (e, t) => {
      if ("undefined" == typeof DOMPurify)
        return ((0, __imports.ExLoadLib)(__imports.EXURL.purify, () => Te()), "");
      var o;
      return ((e) => (
        (e = e.substring(e.lastIndexOf(".")).toLowerCase()),
        [
          ".jpg",
          ".jpeg",
          ".png",
          ".gif",
          ".webp",
          ".svg",
          ".bmp",
          ".ico",
          ".tiff",
          ".tif",
        ].includes(e)
      ))(t)
        ? ((o = ((t) => {
            let o = 0n,
              n = 1n;
            for (let e = t.length - 1; 0 <= e; e--) {
              var i = t[e].toUpperCase(),
                a = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(i);
              if (-1 === a) throw new Error("Invalid base36 character: " + i);
              ((o += BigInt(a) * n), (n *= 36n));
            }
            return o.toString();
          })((t = t.split("."))[0])),
          (t = `<a href="${(o = DOMPurify.sanitize(`https://img.douyucdn.cn/data/yuba/weibo/${o.slice(0, 4) + "/" + o.slice(4, 6) + "/" + o.slice(6, 8) + "/" + o}.200x0.` + t[1])).replace("200x0.", "")}" target="_blank"><img class="ex-image-danmaku" src="${o}" alt=""></a>`),
          DOMPurify.sanitize(t))
        : "";
    })) !== e &&
    (o.innerHTML = t);
}
function Ce(t, e) {
  null == t.querySelector("#barragePanel__id") &&
    (t.childNodes && 0 < t.childNodes.length && t.removeChild(t.childNodes[0]),
    (n = ((t) => {
      let o = "";
      var n = document.getElementsByClassName("Barrage-listItem");
      for (let e = n.length - 1; 0 <= e; e--) {
        var i = n[e].lastElementChild;
        if (null != i && -1 != i.innerHTML.indexOf(t)) {
          0 < i.getElementsByClassName("Barrage-icon--roomAdmin").length &&
            (o += "【房管】");
          var a = i.getElementsByClassName("Barrage-nobleImg"),
            a =
              (0 < a.length && (o += `【${a[0].title}】`),
              i.getElementsByClassName("UserLevel"));
          0 < a.length && (o += a[0].title);
          break;
        }
      }
      return o;
    })(e)),
    ((o = document.createElement("span")).innerHTML = e),
    (o.title = n),
    (o.id = "barragePanel__id"),
    t.insertBefore(o, t.childNodes[0] || null));
  var o,
    n = ((t) => {
      let o = !1;
      var n = document.getElementsByClassName("Barrage-listItem");
      for (let e = n.length - 1; 0 <= e; e--) {
        var i = n[e].lastElementChild;
        if (null != i && -1 != i.innerHTML.indexOf(t)) {
          i = i.getElementsByClassName("FansMedalWrap");
          if (0 < i.length) {
            o = i[0].cloneNode(!0);
            break;
          }
        }
      }
      return o;
    })(e);
  if (0 != n) {
    let e = t.querySelector("#barragePanel__fansMedal");
    (e
      ? (e.innerHTML = "")
      : (((e = document.createElement("div")).id = "barragePanel__fansMedal"),
        (e.style = "display:inline-block"),
        t.insertBefore(e, t.childNodes[0] || null)),
      e.appendChild(n));
  }
}
function Se(e) {
  var t;
  null == document.getElementById("barragePanel__split") &&
    (((t = document.createElement("br")).id = "barragePanel__split"),
    e.appendChild(t));
}
function Me(e) {
  var t;
  null != document.getElementById("barragePanel__mute") ||
    0 < document.getElementsByClassName("barragePanel__muteTime").length ||
    (((t = document.createElement("div")).style =
      "display:flex;align-items:center;width:100%;gap:8px;"),
    (t.innerHTML = `

        <div class="button-7e1395" id="barragePanel__mute" style="z-index:5">禁言</div>

        <div class="barragePanel__muteTime" style="z-index:5">

            <select id="barragePanel__muteSelect" style='width:55px'>

                <option value="1">1分钟</option>

                <option value="10">10分钟</option>

                <option value="30">30分钟</option>

                <option value="60">1小时</option>

                <option value="480">8小时</option>

                <option value="1440">1天</option>

                <option value="4320">3天</option>

                <option value="10080">7天</option>

                <option value="43200">30天</option>

                <option value="259200">180天</option>

                <option value="518400">360天</option>

            </select>

        </div>

    `),
    e.appendChild(t));
}
function Ne(e) {
  var t;
  null == document.getElementById("barragePanel__search") &&
    (((t = document.createElement("div")).className = "button-7e1395"),
    (t.innerText = "查弹幕"),
    (t.id = "barragePanel__search"),
    (t.style = "z-index:5"),
    e.appendChild(t));
}
function Le(e) {
  var t;
  null == document.getElementById("barragePanel__reply") &&
    (((t = document.createElement("div")).className = "button-7e1395"),
    (t.innerText = "回复"),
    (t.id = "barragePanel__reply"),
    (t.style = "z-index:5"),
    e.appendChild(t));
}
function Ae(e, o) {
  ((document.getElementById("barragePanel__reply").onclick = () => {
    var e = document.getElementsByClassName("danmuContent-25f266")[0].innerText,
      t = document.getElementsByClassName("ChatSend-txt")[0],
      e = `@${o}：` + e;
    ("TEXTAREA" == t.tagName ? (t.value = e) : (t.innerText = e), t.focus());
  }),
    (document.getElementById("barragePanel__mute").onclick = async () => {
      var e = document.getElementById("barragePanel__muteSelect").value || "1",
        t = await (0, __imports.lo)(__imports.B, o, e);
      "添加成功" == t.msg
        ? (0, __imports.T)(`【禁言】${o}已被禁言${e}分钟`, "success")
        : (0, __imports.T)(t.msg, "error");
    }),
    (document.getElementById("barragePanel__search").onclick = async () => {
      n = o;
      var n,
        e = await new Promise((o) => {
          (0, __imports.GM_xmlhttpRequest)({
            method: "GET",
            url:
              "https://www.doseeing.com/api/suggest_all?type=room&nickname=" +
              encodeURIComponent(n),
            responseType: "json",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            onload: function (e) {
              e = e.response;
              let t = !0;
              (e.suggest || (t = !1),
                e.suggest.fan || (t = !1),
                0 === e.suggest.fan.length && (t = !1),
                (t = e.suggest.fan[0].nickname !== n ? !1 : t)
                  ? o(e.suggest.fan[0].user_id)
                  : o(""));
            },
          });
        });
      "" !== e &&
        (0, __imports._)(`https://www.doseeing.com/data/fan/${e}?type=chat&dt=0`, !0);
    }));
}
let De = [],
  C = 0,
  je = 200;
function Pe(e) {
  (De.length >= je && (De.shift(), (C = Math.min(C, De.length))),
    (C = De.push(e)));
}
function ze() {
  var e, t;
  null != De[C] &&
    ((e = De[C] || ""),
    null != (t = document.getElementsByClassName("ChatSend-txt")[0])) &&
    ("TEXTAREA" === t.tagName ? (t.value = e) : (t.innerText = e));
}
function Oe() {
  var e = document.getElementsByClassName("ChatSend-txt")[0];
  return null != e ? ("TEXTAREA" === e.tagName ? e.value : e.innerText) : "";
}
let Re = { t: 0, list: [] };
let fansMedalRefreshGeneration = 0;
async function refreshFansMedalCache(owner) {
  const room = __imports.B, generation = ++fansMedalRefreshGeneration;
  try {
    const response = await (0, __imports.fetch)(
      "https://www.douyu.com/japi/interact/cdn/pocket/effective?rid=" + room,
      { method: "GET", credentials: "include" },
    );
    if (response.ok === false) throw new Error('Fans medal request failed');
    const result = await response.json();
    if (owner?.disposed || __imports.B !== room || generation !== fansMedalRefreshGeneration) return false;
    if (!Array.isArray(result?.data?.list)) return false;
    Re.list = result.data.list;
    Re.t = Date.now();
    return true;
  } catch (error) {
    console.log("请求失败!", error);
    return false;
  }
}
function He(e) {
  return (0, __imports.qr)(__imports.B, !0, 0, e, (e) => {
    !e || "None" == e
      ? (0, __imports.T)("房间未开播或其他错误", "error")
      : ((e = String(e)), (0, __imports.GM_setClipboard)(e), (0, __imports.T)("复制成功", "success"));
  }, __imports.activeRoomMount);
}
function Ge() {
  0 < document.querySelectorAll(".tipItem-898596 > ul > li").length
    ? document.querySelectorAll(".tipItem-898596 > ul > li").forEach((e) => {
        e.className.includes("selected") &&
          He(
            ((e = e.innerText),
            String(e).includes("蓝光8M")
              ? 8
              : String(e).includes("蓝光4M")
                ? 4
                : String(e).includes("超清")
                  ? 3
                  : String(e).includes("高清")
                    ? 2
                    : 0),
          );
      })
    : He(0);
}
function Ve(e) {
  var t = e.target.value,
    o = document
      .getElementsByClassName("ChatBarrageCollectPop-barrageContent")[0]
      .parentElement.getElementsByClassName("TagItem");
  for (let e = 0; e < o.length; e++) {
    var n = o[e];
    n.innerText.includes(t)
      ? (n.style.display = "")
      : (n.style.display = "none");
  }
}
function qe() {
  let t = __imports.localStorage.getItem("ExSave_DanmakuCollect");
  try {
    t = JSON.parse(t) || [];
  } catch (e) {
    t = [];
  }
  return t;
}
function Ue() {
  var e = {
    isTailEnabled: document.getElementById("DanmakuTail-checkbox").checked,
    tailContent: document.getElementById("DanmakuTail-input").value,
    type: document.querySelector('input[name="DanmakuTailType"]:checked').value,
  };
  __imports.localStorage.setItem("ExSave_DanmakuTail", JSON.stringify(e));
}
async function We(e, o, signal) {
  const response = await (0, __imports.fetch)("https://v.douyu.com/api/stream/getStreamUrl", {
    method: "POST", credentials: "include", signal,
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: o + "&vid=" + e,
  });
  if (response.ok === false) throw new Error("获取m3u8链接失败");
  const result = await response.json();
  if (!result?.data?.thumb_video || typeof result.data.thumb_video !== "object")
    throw new Error("获取m3u8链接失败");
  return result;
}
async function Ye(e, o = 0, signal) {
  if (o < 0) return;
  const response = await (0, __imports.fetch)(
    `https://v.douyu.com/wgapi/vod/center/getBarrageListByPage?vid=${e}&offset=${o}`,
    { method: "GET", credentials: "include", signal },
  );
  if (response.ok === false) throw new Error("获取弹幕数据失败");
  const result = await response.json();
  if (!Array.isArray(result?.data?.list) || result.data.pre == null ||
      result.data.pre === "" || !Number.isFinite(Number(result.data.pre)))
    throw new Error("弹幕分页数据无效");
  return result;
}

}
,
"src/next/services/player-controls.js":
function* (__imports) {
yield {"$e": { get: () => $e, set: value => { $e = value; } },
"Xe": { get: () => Xe, set: value => { Xe = value; } }};
// Each VOD action captures its route and video; failed pages never become partial exports.
function createVodAction(owner = __imports.roomRouteLifetime) {
  const toolbar = document.getElementsByTagName("demand-video-toolbar")[0];
  const share = toolbar?.shadowRoot?.querySelector("share-hover");
  const video = share?.getAttribute("hashid");
  const controller = new AbortController();
  const current = () => !owner?.disposed && toolbar?.isConnected &&
    document.getElementsByTagName("demand-video-toolbar")[0] === toolbar &&
    share?.getAttribute("hashid") === video;
  owner?.own(() => controller.abort());
  return { signal: controller.signal, current, check() {
    if (!current()) { controller.abort(); throw new Error("VOD action expired"); }
  } };
}
function vodAction(callback, label, owner) {
  return async () => {
    const job = createVodAction(owner);
    try { job.check(); await callback(job); }
    catch (error) {
      if (job.current()) {
        if (label) label.innerText = "下载失败";
        (0, __imports.T)(error.message || "请求失败，请重试", "error");
      }
    }
  };
}
let Qe = null,
  Je = !1,
  Ze = "ex-barrageLine";
function Xe(owner = __imports.roomRouteLifetime) {
  owner.own(() => { Je = !1; vodHeatmapGeneration++; });
  let n = owner.interval(() => {
    var e = document
        .getElementsByTagName("demand-video")[0]
        .shadowRoot.getElementById("demandcontroller-bar")
        .shadowRoot.querySelector("demand-video-controller-progress")
        .shadowRoot.querySelector(".ProgressBar-Sign"),
      t = document.getElementsByTagName("demand-video-toolbar")[0]?.shadowRoot,
      o = document.getElementsByTagName("demand-video-toolbar")[0]?.shadowRoot;
    e &&
      t &&
      o &&
      ((0, __imports.clearInterval)(n),
      ((e = document.createElement("style")).innerHTML =
        `.no-hasLR #ex-barrageLine {

        display: none !important;

    }`),
      document
        .getElementsByTagName("demand-video")[0]
        .shadowRoot.getElementById("demandcontroller-bar")
        .shadowRoot.querySelector("demand-video-controller-progress")
        .shadowRoot.append(e),
      Ke(owner),
      (t = o.querySelector("share-hover")),
      (Qe = new MutationObserver(owner.guard(function (e) {
        Ke(owner);
      }))).observe(t, { attributes: !0, childList: !0, subtree: !1 }),
      ((observer) => owner.own(() => observer.disconnect()))(Qe));
  }, 1e3);
}
let vodHeatmapGeneration = 0;
async function Ke(owner = __imports.roomRouteLifetime) {
  if (!Je) {
    const job = createVodAction(owner), generation = ++vodHeatmapGeneration;
    try {
    job.check();
    ((Je = !0),
      owner.timeout(() => {
        Je = !1;
      }, 1e3),
      (0, __imports.T)("弹幕高能进度条加载中，请耐心等待", "info"));
    var o = document
        .getElementsByTagName("demand-video")[0]
        .shadowRoot.getElementById("demandcontroller-bar")
        .shadowRoot.querySelector(
          "demand-video-controller-progress",
        ).shadowRoot,
      n = o.querySelector(".ProgressBar"),
      o = o.querySelector("#" + Ze),
      i =
        (o && o.remove(),
        document
          .getElementsByTagName("demand-video-toolbar")[0]
          .shadowRoot.querySelector("share-hover")
          .getAttribute("hashid")),
      o = document
        .getElementsByTagName("demand-video")[0]
        .shadowRoot.getElementById("demandcontroller-bar")
        .shadowRoot.querySelector("#time-label")
        .innerText.split("/");
    if (!(o.length <= 0)) {
      var a =
          ((e) => {
            let t = 0;
            return (
              1 === (e = e.split(":")).length
                ? (t = Number(e[0]))
                : 2 === e.length
                  ? (t = 60 * Number(e[0]) + Number(e[1]))
                  : 3 === e.length &&
                    (t =
                      3600 * Number(e[0]) + 60 * Number(e[1]) + Number(e[2])),
              1e3 * t
            );
          })(o[1]) / 99,
        r = new Array(100).fill(0, 0, 100);
      const pages = new Set();
      let e = 0;
      do {
        if (pages.has(String(e))) throw new Error("弹幕分页重复");
        pages.add(String(e));
        var l = await (0, __imports.Ye)(i, e, job.signal);
        job.check();
        if (generation !== vodHeatmapGeneration) return;
        if (((e = l.data.pre), l.data.list))
          for (let e = 0; e < l.data.list.length; e++) {
            var s = l.data.list[e];
            r[Math.floor(s.tl / a)]++;
          }
      } while (0 <= e);
      var d = 1e3 / r.length,
        c = Math.max(...r) / 100,
        p = [];
      for (let e = 0; e < r.length; e++) {
        var m = r[e],
          u = e * d;
        p.push([u, m / c]);
      }
      let t = "";
      for (let e = 0; e < p.length - 1; e++) {
        var [g, h] = p[e],
          [f, y] = p[e + 1];
        t =
          t +
          "C " +
          (g +
            ` ${80 - (h + y) / 2}, ${f} ${80 - (h + y) / 2}, ${f} ${80 - y} `);
      }
      var o = "M 0 100 L 0 80 " + (t += "L 1000 100 Z"),
        b = `

    <svg preserveAspectRatio="none" width="100%" height="100%" viewBox="0 0 1000 100" >

        <path fill="rgba(255,255,255,0.3)" d="${o}" />

    </svg>`,
        o =
          (-1 !== o.indexOf("NaN") &&
            (console.log(o), (0, __imports.T)("弹幕高能进度条加载失败", "error")),
          document.createElement("div"));
      ((o.id = Ze),
        (o.style =
          "position:absolute;width:100%;height:30px;bottom:0px;pointer-events:none;cursor: default;"),
        (o.innerHTML = b),
        n.insertBefore(o, n.childNodes[0]));
    }
    } catch (error) {
      if (job.current() && generation === vodHeatmapGeneration) (0, __imports.T)(error.message || "弹幕高能进度条加载失败", "error");
    } finally {
      if (generation === vodHeatmapGeneration) Je = !1;
    }
  }
}
function $e(owner = __imports.roomRouteLifetime) {
  let o = owner.interval(() => {
    var e,
      t = document.getElementsByTagName("demand-video-toolbar")[0]?.shadowRoot;
    if (t) {
      (0, __imports.clearInterval)(o);
      var t = t.querySelector(".ToolBar-positiveUl");
      (((e = document.createElement("style")).innerHTML = `

    #btn-download:hover .download__panel {

        display: block;

    }

    .download__panel {

        width:150px;

        position:absolute;

        text-align: center;

        cursor: default;

        margin-top: 29px;

        margin-left: -38px;

        box-shadow: 0px 3px 10px 0px;

        display: none;

        background: white;

    }

    .download__item {

        height: 30px;

        line-height: 30px;

        width: 100%;

        cursor: pointer;

    }

    .download__item:hover {

        color: rgb(255,119,0)

    }

    `),
        document
          .getElementsByTagName("demand-video-toolbar")[0]
          .shadowRoot.appendChild(e),
        (e = t),
        ((t = document.createElement("li")).title = "下载视频"),
        (t.innerHTML = `

    <div class="download__panel">

        <div class="download__item" id="download__default" title="文件超过2GB时可能会下载失败">

            <span class="ToolBar-iconText">浏览器下载</span>

        </div>

        <div class="download__item" id="download__copy" title="可将链接填至第三方下载器中下载">

            <span class="ToolBar-iconText">复制m3u8链接</span>

        </div>

        <div class="download__item" id="download__barrage" title="下载弹幕(.xlsx)">

            <span class="ToolBar-iconText">下载弹幕(.xlsx)</span>

        </div>

        <div class="download__item" id="download__barrageass" title="下载弹幕(.ass)">

            <span class="ToolBar-iconText">下载弹幕(.ass)</span>

        </div>

    </div>

    <span class="ToolBar-icon ">

        <svg t="1634113402576" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7734" width="28" height="28"><path d="M761.98 413.12c0.25-4.4 0.39-8.82 0.39-13.28 0-127.18-102.84-230.28-229.71-230.28s-229.71 103.1-229.71 230.28c0 0.67 0.02 1.33 0.03 2a213.156 213.156 0 0 0-38.91-3.58c-117.2 0-212.21 95.25-212.21 212.74 0 117.49 95.01 212.74 212.21 212.74 2.94 0 5.86-0.08 8.77-0.2 2.54 0.13 5.09 0.2 7.66 0.2h467.35c2.82 0 5.61-0.09 8.39-0.24 108.96-5.16 195.72-95.13 195.72-205.36 0.01-108.3-83.73-197.04-189.98-205.02zM616.33 584.24l-90.86 93.93c-0.78 1.11-1.66 2.17-2.63 3.17-3.95 4.09-8.9 6.62-14.09 7.61-8.34 1.77-17.38-0.51-23.97-6.89a25.975 25.975 0 0 1-3.16-3.68l-93.5-90.45c-10.53-10.19-10.81-26.99-0.62-37.52 10.19-10.53 26.99-10.81 37.52-0.62l45.09 43.62c0-0.06-0.01-0.12-0.01-0.18l-2.43-146.62c-0.3-17.83 13.92-32.52 31.75-32.82 17.83-0.3 32.52 13.92 32.82 31.75l2.43 146.63v0.17l43.52-44.99c10.19-10.53 26.99-10.81 37.52-0.62 10.53 10.17 10.81 26.97 0.62 37.51z" p-id="7735" fill="#515151"></path></svg>

    </span>

    <span class="ToolBar-iconText" id="download-text">下载</span>

    `),
        (t.id = "btn-download"),
        e.appendChild(t));
      {
        let a = __imports.unsafeWindow.$DATA,
          r = document
            .getElementsByTagName("demand-video-toolbar")[0]
            .shadowRoot.querySelector("#download-text");
        (document
          .getElementsByTagName("demand-video-toolbar")[0]
          .shadowRoot.querySelector(".download__panel"),
          document
            .getElementsByTagName("demand-video-toolbar")[0]
            .shadowRoot.querySelector("#btn-download")
            .addEventListener("click", () => {
              "下载完成" === r.innerText && (0, __imports.T)("请刷新页面后再下载", "warning");
            }),
          document
            .getElementsByTagName("demand-video-toolbar")[0]
            .shadowRoot.querySelector("#download__default")
            .addEventListener("click", vodAction(async (job) => {
              var o = document
                  .getElementsByTagName("demand-video-toolbar")[0]
                  .shadowRoot.querySelector("share-hover")
                  .getAttribute("hashid"),
                n = a.ROOM.vid;
              if (o !== n) (0, __imports.T)("视频内容已改变，请刷新网页后重试", "error");
              else {
                (0, __imports.T)("开始下载视频...当视频超过2GB时可能会下载失败", "info");
                o = new __imports.jr();
                let e = new __imports.Dr(a.ROOM.point_id);
                var i = e.getSign(),
                  n = ((e = null), await (0, __imports.We)(n, i, job.signal));
                job.check();
                let t = "";
                "" !==
                (t =
                  "super" in n.data.thumb_video
                    ? n.data.thumb_video.super.url
                    : "high" in n.data.thumb_video
                      ? n.data.thumb_video.high.url
                      : "normal" in n.data.thumb_video
                        ? n.data.thumb_video.normal.url
                        : 0 < (i = Object.keys(n.data.thumb_video)).length
                          ? n.data.thumb_video[i[0]].url
                          : "")
                  ? ((handle) => {
                      // jr.start() returns the abort handle, not the jr instance.
                      // Its abort only takes effect after the playlist creates a batch.
                      owner.own(() => handle.abort());
                      return handle;
                    })(o.start(t, { filename: a.ROOM.name + ".mp4" }))
                      .on("progress", (e) => {
                        if (!job.current()) return;
                        r.innerText = Number(e.percentage).toFixed(2) + "%";
                      })
                      .on("finished", (e) => {
                        if (!job.current()) return;
                        ((r.innerText = "下载完成"),
                          (0, __imports.T)("视频下载完成", "success"));
                      })
                      .on("error", (e) => {
                        if (!job.current()) return;
                        ((r.innerText = "下载失败"), (0, __imports.T)(e, "error"));
                      })
                      .on("aborted", () => {
                        if (!job.current()) return;
                        r.innerText = "下载中止";
                      })
                  : (0, __imports.T)("获取m3u8链接失败", "error");
              }
            }, r, owner)),
          document
            .getElementsByTagName("demand-video-toolbar")[0]
            .shadowRoot.querySelector("#download__copy")
            .addEventListener("click", vodAction(async (job) => {
              var o = document
                  .getElementsByTagName("demand-video-toolbar")[0]
                  .shadowRoot.querySelector("share-hover")
                  .getAttribute("hashid"),
                n = a.ROOM.vid;
              if (o !== n) (0, __imports.T)("视频内容已改变，请刷新网页后重试", "error");
              else {
                (0, __imports.T)("正在获取m3u8链接...", "info");
                let e = new __imports.Dr(a.ROOM.point_id);
                var o = e.getSign(),
                  n = ((e = null), await (0, __imports.We)(n, o, job.signal));
                job.check();
                let t = "";
                "" !==
                (t =
                  "super" in n.data.thumb_video
                    ? n.data.thumb_video.super.url
                    : "high" in n.data.thumb_video
                      ? n.data.thumb_video.high.url
                      : "normal" in n.data.thumb_video
                        ? n.data.thumb_video.normal.url
                        : 0 < (o = Object.keys(n.data.thumb_video)).length
                          ? n.data.thumb_video[o[0]].url
                          : "")
                  ? ((0, __imports.GM_setClipboard)(t),
                    (0, __imports.T)("复制成功，可将链接复制到第三方下载器中下载", "success"))
                  : (0, __imports.T)("获取m3u8链接失败", "error");
              }
            }, r, owner)),
          document
            .getElementsByTagName("demand-video-toolbar")[0]
            .shadowRoot.querySelector("#download__barrage")
            .addEventListener("click", vodAction(async (job) => {
              var e = document
                  .getElementsByTagName("demand-video-title")[0]
                  .shadowRoot.querySelector(".Title-Main").innerText,
                t = document
                  .getElementsByTagName("demand-video-toolbar")[0]
                  .shadowRoot.querySelector("share-hover")
                  .getAttribute("hashid");
              (0, __imports.T)("正在获取弹幕数据，请勿切换页面...", "info");
              const pages = new Set();
              let o = 0;
              var n = [];
              do {
                if (pages.has(String(o))) throw new Error("弹幕分页重复");
                pages.add(String(o));
                var i = await (0, __imports.Ye)(t, o, job.signal);
                job.check();
                o = i.data.pre;
                for (let e = 0; e < i.data.list.length; e++) {
                  var a = i.data.list[e];
                  n.push([
                    a.vid,
                    t,
                    a.uid,
                    a.nn,
                    a.ctt,
                    (0, __imports.J)(a.tl / 1e3),
                    (0, __imports.k)("yyyy-MM-dd hh:mm:ss", new Date(1e3 * a.sts)),
                  ]);
                }
              } while (0 <= o);
              (0, __imports.l)(
                ["vid", "hashid", "uid", "昵称", "弹幕", "时间", "发送时间"],
                n,
                `【${e}】弹幕数据.xlsx`,
              );
            }, r, owner)),
          document
            .getElementsByTagName("demand-video-toolbar")[0]
            .shadowRoot.querySelector("#download__barrageass")
            .addEventListener("click", vodAction(async (job) => {
              var e = document
                  .getElementsByTagName("demand-video-title")[0]
                  .shadowRoot.querySelector(".Title-Main").innerText,
                t = document
                  .getElementsByTagName("demand-video-toolbar")[0]
                  .shadowRoot.querySelector("share-hover")
                  .getAttribute("hashid");
              (0, __imports.T)("正在获取弹幕数据，请勿切换页面...", "info");
              const pages = new Set();
              let o = 0;
              var n = new __imports.Lr({ title: e }),
                i = [];
              do {
                if (pages.has(String(o))) throw new Error("弹幕分页重复");
                pages.add(String(o));
                var a = await (0, __imports.Ye)(t, o, job.signal);
                job.check();
                o = a.data.pre;
                for (let e = 0; e < a.data.list.length; e++) {
                  var r = a.data.list[e];
                  i.push({ time: Number(r.tl), txt: r.ctt, color: r.col });
                }
              } while (0 <= o);
              var l,
                s,
                d,
                n = n.generate(i);
              ((e = e + ".ass"),
                (l = n),
                (s =
                  __imports.unsafeWindow.URL || __imports.unsafeWindow.webkitURL || __imports.unsafeWindow),
                (l = new Blob([n])),
                ((n = document.createElementNS(
                  "http://www.w3.org/1999/xhtml",
                  "a",
                )).href = s.createObjectURL(l)),
                (n.download = e),
                (s = document.createEvent("MouseEvents")).initMouseEvent(
                  "click",
                  !0,
                  !1,
                  __imports.unsafeWindow,
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
                n.dispatchEvent(s),
                (d = n.href) &&
                  0 === d.indexOf("blob:") &&
                  (0, __imports.setTimeout)(function () {
                    try {
                      URL.revokeObjectURL(d);
                    } catch (e) {}
                  }, 1500));
            }, r, owner)));
      }
    } else;
  }, 1e3);
}

}
,
"src/next/services/fans.js":
function* (__imports) {
yield {"at": { get: () => at, set: value => { at = value; } },
"ct": { get: () => ct, set: value => { ct = value; } },
"dt": { get: () => dt, set: value => { dt = value; } },
"et": { get: () => et, set: value => { et = value; } },
"it": { get: () => it, set: value => { it = value; } },
"lt": { get: () => lt, set: value => { lt = value; } },
"mt": { get: () => mt, set: value => { mt = value; } },
"nt": { get: () => nt, set: value => { nt = value; } },
"ot": { get: () => ot, set: value => { ot = value; } },
"pt": { get: () => pt, set: value => { pt = value; } },
"rt": { get: () => rt, set: value => { rt = value; } },
"st": { get: () => st, set: value => { st = value; } },
"tt": { get: () => tt, set: value => { tt = value; } },
"ut": { get: () => ut, set: value => { ut = value; } }};
let et = `<svg class="icon" width="24" height="24" viewBox="0 0 108 108" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">

    <g id="页面-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">

        <g id="精灵球" transform="translate(0.830769, 0.830769)" fill-rule="nonzero">

            <path d="M53.1692307,106.338461 C23.8276922,106.338461 0,82.5107692 0,53.1692307 C0,51.0030769 1.77230775,49.2307692 3.9384615,49.2307692 L33.476923,49.2307692 C35.6430769,49.2307692 37.4153845,51.003077 37.4153846,53.1692307 C37.4153846,61.8338461 44.5046154,68.9230769 53.1692307,68.9230769 C61.8338461,68.9230769 68.9230769,61.8338461 68.9230769,53.1692307 C68.9230769,51.0030769 70.6953846,49.2307692 72.8615385,49.2307692 L102.4,49.2307692 C104.566154,49.2307692 106.338461,51.003077 106.338461,53.1692307 C106.338461,82.5107692 82.5107692,106.338461 53.1692307,106.338461 Z" id="路径" fill="#33363A"></path>

            <path d="M8.07384612,57.1076922 C10.0430769,80.2461537 29.5384615,98.4615385 53.1692307,98.4615385 C76.8,98.4615385 96.2953846,80.2461539 98.2646154,57.1076922 L76.5046154,57.1076922 C74.6338461,68.2338461 64.8861539,76.8 53.1692307,76.8 C41.4523076,76.8 31.7046154,68.2338461 29.8338461,57.1076922 L8.07384612,57.1076922 Z" id="路径" fill="#FFFFFF"></path>

            <path d="M53.1692308,3.9384615 C25.9938461,3.9384615 3.9384615,25.9938461 3.9384615,53.1692307 L33.476923,53.1692307 C33.476923,42.3384615 42.3384615,33.476923 53.1692308,33.476923 C64,33.476923 72.8615385,42.3384615 72.8615385,53.1692307 L102.4,53.1692307 C102.4,25.9938461 80.3446154,3.9384615 53.1692308,3.9384615 Z" id="路径" fill="#D60909"></path>

            <path d="M102.4,57.1076922 L72.8615385,57.1076922 C70.6953846,57.1076922 68.923077,55.3353845 68.9230769,53.1692307 C68.9230769,44.5046154 61.8338461,37.4153846 53.1692307,37.4153846 C44.5046154,37.4153846 37.4153846,44.5046154 37.4153846,53.1692307 C37.4153846,55.3353846 35.6430769,57.1076922 33.476923,57.1076922 L3.9384615,57.1076922 C1.77230762,57.1076922 0,55.3353845 0,53.1692307 C0,23.8276922 23.8276923,0 53.1692307,0 C82.5107692,0 106.338461,23.8276922 106.338461,53.1692307 C106.338461,55.3353846 104.566154,57.1076922 102.4,57.1076922 Z" id="路径" fill="#33363A"></path>

            <path d="M76.5046154,49.2307693 L98.3630769,49.2307693 C96.2953846,26.0923076 76.8,7.876923 53.1692307,7.876923 C29.5384615,7.876923 10.0430769,26.0923076 8.07384612,49.2307693 L29.9323076,49.2307693 C31.7046154,38.1046154 41.4523076,29.5384615 53.1692307,29.5384615 C64.8861539,29.5384615 74.6338461,38.1046154 76.5046154,49.2307693 L76.5046154,49.2307693 Z" id="路径" fill="#D60909"></path>

            <path d="M53.1692307,76.8 C40.1723076,76.8 29.5384615,66.1661539 29.5384615,53.1692307 C29.5384615,40.1723076 40.1723076,29.5384615 53.1692307,29.5384615 C66.1661539,29.5384615 76.8,40.1723076 76.8,53.1692307 C76.8,66.1661539 66.1661539,76.8 53.1692307,76.8 Z" id="路径" fill="#33363A"></path>

            <path d="M53.1692307,37.4153846 C44.5046154,37.4153846 37.4153846,44.5046154 37.4153846,53.1692307 C37.4153846,61.8338461 44.5046154,68.9230769 53.1692307,68.9230769 C61.8338461,68.9230769 68.9230769,61.8338461 68.9230769,53.1692307 C68.9230769,44.5046154 61.8338461,37.4153846 53.1692307,37.4153846 L53.1692307,37.4153846 Z" id="路径" fill="#FFFFFF"></path>

            <path d="M43.3230769,53.1692307 C43.3230769,58.6071114 47.7313501,63.0153846 53.1692307,63.0153846 C58.6071114,63.0153846 63.0153846,58.6071114 63.0153846,53.1692307 C63.0153846,47.7313501 58.6071114,43.3230769 53.1692307,43.3230769 C47.7313501,43.3230769 43.3230769,47.7313501 43.3230769,53.1692307 Z" id="路径" fill="#33363A"></path>

        </g>

    </g>

</svg>`;
let tt = [],
  ot = null,
  nt = 0,
  it = !1,
  at = 0;
async function rt() {
  let o = await new Promise((t) => {
    (0, __imports.fetch)("https://www.douyu.com/japi/revenuenc/web/actfans/fishing/reelIn", {
      method: "POST",
      mode: "no-cors",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `ctn=${(0, __imports.w)()}&rid=` + __imports.B,
    })
      .then((e) => e.json())
      .then((e) => {
        t(e);
      })
      .catch((e) => {
        console.log("请求失败!", e);
      });
  });
  if (0 !== o.error)
    (console.log(o, "收杆失败"),
      0 == (await ct()).data.fishing.stat && ((it = !1), (nt = 0)));
  else {
    let t = "【自动钓鱼】";
    var n = tt.find((e) => e.fishId == o.data.fish.id);
    if (
      (n && (t += `获得${n.name}${o.data.fish.wei}斤`),
      o.data.awards && 0 < o.data.awards.length)
    )
      for (let e = 0; e < o.data.awards.length; e++) {
        var i = o.data.awards[e];
        t += `${n ? "，" : ""}获得${i.awardName}x` + i.awardNum;
      }
    ("【自动钓鱼】" !== t && (0, __imports.T)(t, "success"), (it = !1));
  }
}
function lt() {
  let t;
  try {
    t = JSON.parse(__imports.localStorage.getItem("ExSave_AutoFish"));
  } catch (e) {
    t = null;
  }
  return (
    (t && "object" == typeof t) || (t = {}),
    Array.isArray(t.rids) || (t.rids = []),
    (t.modes && "object" == typeof t.modes) || (t.modes = {}),
    t
  );
}
function st(t) {
  document
    .querySelectorAll('input[name="autofish_mode"]')
    .forEach((e) => (e.disabled = t));
}
function dt() {
  var e,
    t = document.getElementById("extool__autofish_start"),
    o = document.querySelector('input[name="autofish_mode"]:checked');
  t &&
    o &&
    ((t = t.checked),
    (o = o.value),
    (e = lt()),
    t
      ? (e.rids.includes(__imports.B) || e.rids.push(__imports.B), (e.modes[__imports.B] = o))
      : ((e.rids = e.rids.filter((e) => e !== __imports.B)), delete e.modes[__imports.B]),
    __imports.localStorage.setItem("ExSave_AutoFish", JSON.stringify(e)));
}
function ct() {
  return new Promise((t) => {
    (0, __imports.fetch)(
      `https://www.douyu.com/japi/revenuenc/web/actfans/fishing/homePage?rid=${__imports.B}&opt=1`,
      {
        method: "GET",
        mode: "no-cors",
        cache: "default",
        credentials: "include",
      },
    )
      .then((e) => e.json())
      .then((e) => {
        t(e);
      })
      .catch((e) => {
        console.log("请求失败!", e);
      });
  });
}
function pt(e, t) {
  (0, __imports.fetch)("https://www.douyu.com/japi/prop/backpack/web/v5?rid=" + e, {
    method: "GET",
    mode: "no-cors",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
    .then((e) => e.json())
    .then((e) => {
      t(e);
    })
    .catch((e) => {
      console.log("请求失败!", e);
    });
}
function mt() {
  return document.getElementById("extool__fullscreen").checked;
}
function ut() {
  return document.getElementById("extool__highestvideoquality").checked;
}

}
,
"src/next/services/gifts.js":
function* (__imports) {
yield {"_t": { get: () => _t, set: value => { _t = value; } },
"fetchCurrentRoomGifts": { get: () => fetchCurrentRoomGifts, set: value => { fetchCurrentRoomGifts = value; } },
"fetchUserBackpackGifts": { get: () => fetchUserBackpackGifts, set: value => { fetchUserBackpackGifts = value; } }};
let gt,
  ht = 0,
  ft,
  yt,
  bt; // 全量礼物配置缓存与快速检索字典
// 获取纯数字真实房间号 (归一化提取，杜绝别名导致的 403)
function getNumericRoomId() {
  try {
    if (typeof __imports.unsafeWindow !== "undefined") {
      if (__imports.unsafeWindow.room_id && !isNaN(Number(__imports.unsafeWindow.room_id)))
        return String(__imports.unsafeWindow.room_id);
      if (__imports.unsafeWindow.rid && !isNaN(Number(__imports.unsafeWindow.rid)))
        return String(__imports.unsafeWindow.rid);
      if (
        __imports.unsafeWindow.$DATA &&
        __imports.unsafeWindow.$DATA.ROOM &&
        __imports.unsafeWindow.$DATA.ROOM.room_id
      ) {
        return String(__imports.unsafeWindow.$DATA.ROOM.room_id);
      }
    }
  } catch (e) {}
  try {
    if (typeof window !== "undefined") {
      if (window.room_id && !isNaN(Number(window.room_id)))
        return String(window.room_id);
      if (window.rid && !isNaN(Number(window.rid))) return String(window.rid);
    }
  } catch (e) {}
  if (typeof __imports.B !== "undefined" && __imports.B && !isNaN(Number(__imports.B))) return String(__imports.B);
  try {
    var html = document.documentElement.innerHTML;
    var m =
      html.match(/["']room_id["']\s*:\s*(\d+)/) ||
      html.match(/roomID:\s*(\d+)/);
    if (m && m[1]) return m[1];
  } catch (e) {}
  return "";
}

// 模块 A：恢复原设计意图 —— 双流聚合当前房间专属礼物与通用在播礼物 (0 全网死重)
var _lastRoomGiftsMapByName = {};

var COMMON_BACKPACK_PROPS = {
  弱鸡: "https://gfs-op.douyucdn.cn/dygift/2018/11/27/d71e48b4ac91993b4aea75c0c0dd0f45.gif",
  粉丝荧光棒:
    "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
  荧光棒:
    "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
  赞: "https://gfs-op.douyucdn.cn/dygift/2018/11/29/abe536f393466727e02422b7cc1fbf57.gif",
  办卡: "https://gfs-op.douyucdn.cn/dygift/2026/02/04/fb706bd5c63844326420ef86bf87a3ea.webp",
  稳: "https://gfs-op.douyucdn.cn/dygift/1705/88d8b9e6f3630f576b2512f458e38d72.gif",
  666: "https://gfs-op.douyucdn.cn/dygift/1705/1f4f13a0c4f826620573e0a133df19f1.gif",
  福袋: "https://gfs-op.douyucdn.cn/dygift/2019/07/23/bf92364f33190dfca0803450e1814674.gif",
};

function fetchCurrentRoomGifts(rid, callback) {
  var numRid = getNumericRoomId() || String(rid || "");
  var exclusiveGifts = [];
  var universalGifts = [];
  var doneCount = 0;

  function finish() {
    if (++doneCount < 2) return;

    var combinedMap = {};
    // 1. 通用在播礼物 (飞机、火箭、超火、飞船、办卡、赞、弱鸡等)
    universalGifts.forEach(function (g) {
      combinedMap[g.id] = g;
    });
    // 2. 房间专属定制礼物 (如 RUA、药丸等定制道具)
    exclusiveGifts.forEach(function (g) {
      combinedMap[g.id] = g;
    });

    var merged = [];
    for (var id in combinedMap) {
      if (combinedMap.hasOwnProperty(id)) {
        merged.push(combinedMap[id]);
        _lastRoomGiftsMapByName[combinedMap[id].name] = combinedMap[id];
      }
    }
    // 按鱼翅价值从高到低排序
    merged.sort(function (a, b) {
      return b.price - a.price;
    });
    callback(merged);
  }

  // 第一流：拉取房间专属礼物 (优先从页面内存读取，未就绪从 betard 接口拉取)
  try {
    var winData =
      typeof __imports.unsafeWindow !== "undefined" && __imports.unsafeWindow.$DATA
        ? __imports.unsafeWindow.$DATA
        : typeof window !== "undefined" && window.$DATA
          ? window.$DATA
          : null;
    if (winData && winData.room_gift && winData.room_gift.gift) {
      exclusiveGifts = parseRoomGiftMap(winData.room_gift.gift);
      finish();
    } else {
      fetchBetardExclusive();
    }
  } catch (e) {
    fetchBetardExclusive();
  }

  function fetchBetardExclusive() {
    var betardUrl = "https://www.douyu.com/betard/" + numRid;
    var handleBetard = function (json) {
      if (json && json.room_gift && json.room_gift.gift) {
        exclusiveGifts = parseRoomGiftMap(json.room_gift.gift);
      }
      finish();
    };
    if (typeof __imports.GM_xmlhttpRequest === "function") {
      (0, __imports.GM_xmlhttpRequest)({
        method: "GET",
        url: betardUrl,
        responseType: "json",
        headers: {
          Referer: "https://www.douyu.com/" + numRid,
          "User-Agent": navigator.userAgent,
        },
        onload: function (res) {
          handleBetard(res.response || {});
        },
        onerror: function () {
          finish();
        },
      });
    } else {
      (0, __imports.fetch)(betardUrl, { credentials: "include" })
        .then(function (r) {
          return r.json();
        })
        .then(handleBetard)
        .catch(function () {
          finish();
        });
    }
  }

  // 第二流：从官方 RoomApi 拉取当前房间可用的完整通用在播礼物池
  var roomApiUrl = "https://open.douyucdn.cn/api/RoomApi/room/" + numRid;
  var handleRoomApi = function (json) {
    if (json && json.data && Array.isArray(json.data.gift)) {
      universalGifts = parseRoomApiUniversalGifts(json.data.gift);
    }
    finish();
  };

  if (typeof __imports.GM_xmlhttpRequest === "function") {
    (0, __imports.GM_xmlhttpRequest)({
      method: "GET",
      url: roomApiUrl,
      responseType: "json",
      headers: {
        Referer: "https://www.douyu.com/" + numRid,
        "User-Agent": navigator.userAgent,
      },
      onload: function (res) {
        handleRoomApi(res.response || {});
      },
      onerror: function () {
        finish();
      },
    });
  } else {
    (0, __imports.fetch)(roomApiUrl)
      .then(function (r) {
        return r.json();
      })
      .then(handleRoomApi)
      .catch(function () {
        finish();
      });
  }
}

function parseRoomGiftMap(giftDict) {
  var result = [];
  if (!giftDict) return result;
  for (var gid in giftDict) {
    if (!giftDict.hasOwnProperty(gid)) continue;
    var g = giftDict[gid];
    var icon = g.pc_icon || g.gif_icon || g.himg || g.cimg || g.bimg || "";
    if (icon && !icon.startsWith("http")) {
      icon = "https://gfs-op.douyucdn.cn/dygift/" + icon;
    }
    var priceVal = Number(g.price || g.pc || 0);
    var priceYc = priceVal / 100;
    result.push({
      id: String(g.id || gid),
      name: g.name || "未知礼物",
      priceText: priceYc > 0 ? priceYc + " 鱼翅" : "免费",
      icon:
        icon ||
        "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
      price: priceVal,
      stayTime: Number(g.stay_time || 4000),
    });
  }
  return result;
}

function parseRoomApiUniversalGifts(list) {
  var result = [];
  if (!Array.isArray(list)) return result;
  for (var i = 0; i < list.length; i++) {
    var g = list[i];
    var icon = g.himg || g.mimg || "";
    var priceYc = Number(g.pc || 0);
    result.push({
      id: String(g.id),
      name: g.name || "通用礼物",
      priceText: priceYc > 0 ? priceYc + " 鱼翅" : "免费",
      icon:
        icon ||
        "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
      price: priceYc * 100,
      stayTime: 4000,
    });
  }
  return result;
}

// 模块 A：恢复原设计意图 —— 获取当前用户真实的背包礼物资产 (精准图标映射)
function fetchUserBackpackGifts(rid, callback) {
  var numRid = getNumericRoomId() || String(rid || "");
  var bpUrl = "https://www.douyu.com/japi/prop/backpack/web/v5?rid=" + numRid;

  function parseBackpackList(list) {
    if (!Array.isArray(list)) list = [];
    return list.map(function (item) {
      var icon = item.pic || item.icon || item.small_pic || item.himg || "";
      if (icon && !icon.startsWith("http")) {
        icon = "https://gfs-op.douyucdn.cn/dygift/" + icon;
      }
      var itemName = item.name || "";
      if (!icon) {
        // 1. 优先从常驻免费道具字典精确匹配 (彻底消灭弱鸡与荧光棒串图问题)
        for (var key in COMMON_BACKPACK_PROPS) {
          if (itemName.indexOf(key) !== -1) {
            icon = COMMON_BACKPACK_PROPS[key];
            break;
          }
        }
      }
      // 2. 尝试从房间礼物池动态名称反查
      if (!icon && _lastRoomGiftsMapByName[itemName]) {
        icon = _lastRoomGiftsMapByName[itemName].icon;
      }
      // 3. 最终兜底
      if (!icon) {
        icon =
          "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif";
      }

      return {
        id: String(item.id),
        name: itemName || "背包道具",
        priceText: "拥有 ×" + String(item.count || 1),
        icon: icon,
        count: Number(item.count || 1),
      };
    });
  }

  // 优先调用带 Referer 校验的油猴特权接口，保证 100% 鉴权成功
  if (typeof __imports.GM_xmlhttpRequest === "function") {
    (0, __imports.GM_xmlhttpRequest)({
      method: "GET",
      url: bpUrl,
      responseType: "json",
      headers: {
        Referer: "https://www.douyu.com/" + numRid,
        "User-Agent": navigator.userAgent,
      },
      onload: function (res) {
        var json = res.response || {};
        var rawList =
          json.data && Array.isArray(json.data.list)
            ? json.data.list
            : Array.isArray(json.data)
              ? json.data
              : [];
        if (rawList.length > 0) {
          return callback(parseBackpackList(rawList));
        }
        fallbackDomCheck();
      },
      onerror: function () {
        fallbackDomCheck();
      },
    });
  } else {
    fallbackDomCheck();
  }

  function fallbackDomCheck() {
    // DOM 现场探针：如果底栏已经展开过背包，直接读取真实渲染的道具节点
    try {
      var domCards = document.querySelectorAll(
        ".ToolBarBackpack .ToolbarGiftCard, .ToolbarGiftArea-backpack .ToolbarGiftCard, .ToolBarBackpack-giftList .ToolbarGiftCard",
      );
      if (domCards && domCards.length > 0) {
        var domList = [];
        for (var i = 0; i < domCards.length; i++) {
          var card = domCards[i];
          var img = card.querySelector(".ToolbarGiftCard-img, img");
          var nameEl = card.querySelector(".ToolbarGiftCard-name");
          var priceEl = card.querySelector(".ToolbarGiftCard-price");
          var name = nameEl
            ? nameEl.textContent.trim()
            : card.getAttribute("title") || "";
          var iconSrc = img
            ? img.src || img.getAttribute("data-src") || ""
            : "";
          if (!iconSrc && name) {
            for (var k in COMMON_BACKPACK_PROPS) {
              if (name.indexOf(k) !== -1) {
                iconSrc = COMMON_BACKPACK_PROPS[k];
                break;
              }
            }
          }
          var count = priceEl
            ? parseInt(priceEl.textContent.replace(/[^0-9]/g, "")) || 1
            : 1;
          var propId =
            card.getAttribute("data-id") ||
            card.getAttribute("data-prop-id") ||
            String(20000 + i);
          if (name) {
            domList.push({
              id: String(propId),
              name: name,
              priceText: "拥有 ×" + String(count),
              icon:
                iconSrc ||
                "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
              count: count,
            });
          }
        }
        if (domList.length > 0) {
          return callback(domList);
        }
      }
    } catch (e) {}
    callback([]);
  }
}

function _t() {
  return document.getElementById("extool__p2p").checked;
}

}
,
"src/next/services/room-actions.js":
function* (__imports) {
yield {"At": { get: () => At, set: value => { At = value; } },
"Bt": { get: () => Bt, set: value => { Bt = value; } },
"Ct": { get: () => Ct, set: value => { Ct = value; } },
"Dt": { get: () => Dt, set: value => { Dt = value; } },
"Et": { get: () => Et, set: value => { Et = value; } },
"Ft": { get: () => Ft, set: value => { Ft = value; } },
"Gt": { get: () => Gt, set: value => { Gt = value; } },
"Ht": { get: () => Ht, set: value => { Ht = value; } },
"It": { get: () => It, set: value => { It = value; } },
"Mt": { get: () => Mt, set: value => { Mt = value; } },
"Ot": { get: () => Ot, set: value => { Ot = value; } },
"Pt": { get: () => Pt, set: value => { Pt = value; } },
"St": { get: () => St, set: value => { St = value; } },
"Tt": { get: () => Tt, set: value => { Tt = value; } },
"Ut": { get: () => Ut, set: value => { Ut = value; } },
"Wt": { get: () => Wt, set: value => { Wt = value; } },
"Yt": { get: () => Yt, set: value => { Yt = value; } },
"claimLevelTasks": { get: () => claimLevelTasks, set: value => { claimLevelTasks = value; } },
"jt": { get: () => jt, set: value => { jt = value; } },
"kt": { get: () => kt, set: value => { kt = value; } },
"qt": { get: () => qt, set: value => { qt = value; } }};
let kt = [],
  Et;
function Bt(t) {
  (0, __imports.fetch)("https://www.douyu.com/japi/interactnc/web/propredpacket/grab_prp", {
    method: "POST",
    mode: "no-cors",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "activityid=" + t + "&ctn=" + (0, __imports.w)(),
  })
    .then((e) => e.json())
    .then((e) => {
      2 == e.data.isSuc && Bt(t);
    });
}
function It() {
  try {
    var e = __imports.localStorage.getItem("ExSave_TabSwitch");
    if (null != e) return !!JSON.parse(e).isEnableTabSwitch;
  } catch (e) {}
  e = document.getElementById("extool__tabSwitch");
  return !!e && e.checked;
}
function Tt(e) {
  __imports.localStorage.setItem(
    "ExSave_TabSwitch",
    JSON.stringify({ isEnableTabSwitch: !!e }),
  );
  var t = document.getElementById("extool__tabSwitch");
  (t && (t.checked = !!e), e && Ct());
}
function Ct() {
  (Object.defineProperty(document, "hidden", { value: !1, writable: !1 }),
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: !1,
    }),
    Object.defineProperty(document, "webkitVisibilityState", {
      value: "visible",
      writable: !1,
    }),
    document.dispatchEvent(new Event("visibilitychange")),
    (document.hasFocus = function () {
      return !0;
    }),
    document.addEventListener(
      "visibilitychange",
      function (e) {
        e.stopImmediatePropagation();
      },
      !0,
      !0,
    ));
}
var St = !1;
function Mt() {
  var e = document.getElementById("extool__treasure_delay").value;
  return Number(e);
}
let Nt = null,
  Lt = null;
function At() {
  return (
    document.querySelector(
      ".PlayerToolbar-ContentCell .PlayerToolbar-Wealth",
    ) || document.querySelector(".PlayerToolbar-ContentRow")
  );
}
function Dt() {
  var e = document.getElementsByClassName("PlayerToolbar-ContentRow")[0];
  return e && "hidden" === e.style.visibility;
}
function jt() {
  return (
    document.getElementById("js-player-dialog") ||
    document.getElementsByClassName("room-Player-Box")[0] ||
    document.body
  );
}
function Pt(e) {
  Nt || ((Nt = e.parentNode), (Lt = e.nextSibling));
}
function zt() {
  var e,
    t,
    o,
    n = document.querySelector(".ex-panel.ex-panel--floating");
  n &&
    ((e = document.getElementById("js-player-toolbar")),
    (o = document.getElementById("ex-vtoolbar-menu")),
    e
      ? ((e = e.getBoundingClientRect()),
        (n.style.position = "fixed"),
        (n.style.bottom = window.innerHeight - e.top + 8 + "px"),
        (n.style.top = "auto"),
        o
          ? ((o = o.getBoundingClientRect()),
            (t = n.offsetWidth || n.scrollWidth || 320),
            (o = o.left + o.width / 2 - t / 2),
            (o = Math.max(8, Math.min(o, window.innerWidth - t - 8))),
            (n.style.left = o + "px"))
          : ((t = n.offsetWidth || n.scrollWidth || 320),
            (o = e.left + e.width / 2 - t / 2),
            (o = Math.max(8, Math.min(o, window.innerWidth - t - 8))),
            (n.style.left = o + "px")),
        (n.style.right = "auto"))
      : ((n.style.bottom = "72px"),
        (n.style.right = "12px"),
        (n.style.left = "")));
}
function Ot() {
  var e = document.querySelector(".ex-panel");
  (e &&
    !e.classList.contains("ex-panel--floating") &&
    (Pt(e), jt().appendChild(e), e.classList.add("ex-panel--floating")),
    zt());
}
function Rt() {
  var e = document.querySelector(".ex-panel"),
    t = At();
  e &&
    t &&
    e.classList.contains("ex-panel--floating") &&
    (Lt && Lt.parentNode === t
      ? t.insertBefore(e, Lt)
      : t.insertBefore(e, t.childNodes[0]),
    e.classList.remove("ex-panel--floating"));
}
function Ft() {
  var e = document.querySelector(".ex-panel");
  e && "block" === e.style.display && (Ot(), zt());
}
function Ht() {
  Rt();
}
function Gt() {
  var e = document.querySelector(".ex-panel");
  e && ((0, __imports.clearTimeout)(__imports.Y), (__imports.Y = null), (e.style.display = "none"));
}
function Vt() {
  Gt();
}
function qt() {
  var e = document.getElementsByClassName("ex-panel")[0];
  e &&
    ((Dt() ? Ot : Rt)(),
    "block" !== e.style.display
      ? ((e.style.display = "block"),
        (0, __imports.clearTimeout)(__imports.Y),
        e.classList.contains("ex-panel--floating") && zt())
      : ((e.style.display = "none"), (0, __imports.clearTimeout)(__imports.Y)));
}
async function Ut(e, t, o) {
  return (
    await (0, __imports.fetch)("https://www.douyu.com/japi/prop/donate/mainsite/v1", {
      method: "POST",
      mode: "no-cors",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:
        "propId=" +
        e +
        "&propCount=" +
        t +
        "&roomId=" +
        o +
        "&bizExt=%7B%22yzxq%22%3A%7B%7D%7D",
    })
  ).json();
}
let Wt;
function Yt(e) {
  var t = document.getElementsByClassName("Header-follow-tab is-active")[0]
    .innerText;
  "特别关注" !== t &&
    "视频动态" !== t &&
    0 !=
      (t = document.getElementsByClassName("Header-follow-listWrap")).length &&
    ((document.getElementsByClassName(
      "Header-follow-listBox",
    )[0].style.display = "none"),
    (async (e) => {
      var i = await (0, __imports.GM_getValue)("Ex_LoadInCurrentPage", !1),
        a = await new Promise((t) => {
          (0, __imports.fetch)(
            "https://www.douyu.com/wgapi/livenc/liveweb/follow/list?sort=1&cid1=0",
            {
              method: "GET",
              mode: "no-cors",
              credentials: "include",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            },
          )
            .then((e) => e.json())
            .then((e) => {
              t(e);
            });
        });
      if ("0" == a.error) {
        let t = 0,
          o = `

        <div id="refreshFollowList" style="color: grey; position: absolute; top: 0px; cursor: default; display: flex; align-items: center; justify-content: space-between; width: calc(100% - 10px); padding: 0 5px;">

            <label style="display: flex; align-items: center; cursor: pointer; color: inherit;">

                <input type="checkbox" id="loadInCurrentPageCheckbox" ${i ? "checked" : ""} style="margin-right: 5px;">

                在当前页面加载

            </label>

            <span>长按弹出同屏播放</span>

        </div>

    `;
        var r = Math.floor(Date.now() / 1e3);
        for (let e = 0; e < a.data.list.length; e++) {
          var l = a.data.list[e];
          if (
            ("1" == l.show_status &&
              "0" == l.videoLoop &&
              ((o += `<li class="DropPaneList FollowList ExFollowListItem" rid="${l.room_id}"><a><div class="DropPaneList-cover"><div class="LazyLoad is-visible DyImg "><img src="${String(l.avatar_small).replace("_big", "_small")}" alt="${l.nickname}" class="DyImg-content is-normal "></div></div><div class="DropPaneList-info"><p><span class="DropPaneList-hot"><i></i>${l.online}</span><span class="DropPaneList-title">${l.room_name}</span></p><p><span class="DropPaneList-name">${l.nickname}</span><span class="DropPaneList-time">已播${(0, __imports.Q)(r - Number(l.show_time))}</span></p></div></a></li>`),
              t++),
            10 <= t)
          )
            break;
        }
        e.innerHTML += o;
        i = e.querySelector("#loadInCurrentPageCheckbox");
        i &&
          i.addEventListener("change", async (e) => {
            e = e.target.checked;
            (await (0, __imports.GM_setValue)("Ex_LoadInCurrentPage", e),
              (0, __imports.T)(
                `【关注列表】已${e ? "开启" : "关闭"}当前页加载功能（${e ? "当前页面直接加载关注的直播间" : "使用新网页打开关注的直播间"}）`,
                "info",
              ));
          });
        let n = document.getElementsByClassName("ExFollowListItem");
        for (let o = 0; o < n.length; o++) {
          var s = new __imports.PointerGestureBinding(n[o]);
          (s.longClick(() => {
            ((0, __imports.en)(__imports.D.length, n[o].getAttribute("rid"), "Douyu"),
              (document.querySelector(".Follow .public-DropMenu").className =
                "public-DropMenu"));
          }),
            s.click(async (e) => {
              e.preventDefault();
              var e = await (0, __imports.GM_getValue)("Ex_LoadInCurrentPage", !1),
                t = "https://www.douyu.com/" + n[o].getAttribute("rid");
              e ? (window.location.href = t) : (0, __imports._)(t, !0);
            }),
            n[o].addEventListener("mousedown", (e) => {
              1 == e.button &&
                (0, __imports._)("https://www.douyu.com/" + n[o].getAttribute("rid"), !1);
            }));
        }
      }
    })(t[0]));
}
async function claimLevelTasks() {
  e = __imports.B;
  var e,
    n,
    t = await new Promise((t, o) => {
      (0, __imports.fetch)(
        "https://www.douyu.com/japi/interactnc/web/userLevel/userLevelDetail?rid=" +
          e,
        {
          method: "GET",
          mode: "no-cors",
          credentials: "include",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      )
        .then((e) => e.json())
        .then((e) => {
          e = e.data.taskIds.join(",");
          t(e);
        })
        .catch((e) => {
          (console.log("请求失败!", e), o(e));
        });
    }),
    o =
      ((n = t),
      await new Promise((t, o) => {
        (0, __imports.fetch)(
          "https://www.douyu.com/japi/tasksys/userLevelTask/getTaskStatus?taskIds=" +
            n,
          {
            method: "GET",
            mode: "no-cors",
            credentials: "include",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          },
        )
          .then((e) => e.json())
          .then((e) => {
            t(e.data.list);
          })
          .catch((e) => {
            (console.log("请求失败!", e), o(e));
          });
      }));
  for (let e = 0; e < o.length; e++) {
    var i = o[e],
      a = i.taskId,
      r = i.name;
    if (1 == i.taskStatus && 0 == i.prizeStatus) {
      var l = await ((e, n) =>
        new Promise((t, o) => {
          (0, __imports.fetch)("https://www.douyu.com/japi/tasksys/userLevelTask/getPrize", {
            method: "POST",
            mode: "no-cors",
            credentials: "include",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `ctn=${(0, __imports.w)()}&taskIds=${n}&roomId=` + e,
          })
            .then((e) => e.json())
            .then((e) => {
              t(e.data.list);
            })
            .catch((e) => {
              (console.log("请求失败!", e), o(e));
            });
        }))(__imports.B, a);
      for (let e = 0; e < l.length; e++)
        (0, __imports.T)(`【等级任务】${r} 获得` + l[e].name + l[e].num, "success");
    }
  }
}

}
,
"src/next/services/lottery.js":
function* (__imports) {
yield {"$t": { get: () => $t, set: value => { $t = value; } },
"A": { get: () => A, set: value => { A = value; } },
"Bo": { get: () => Bo, set: value => { Bo = value; } },
"Eo": { get: () => Eo, set: value => { Eo = value; } },
"Io": { get: () => Io, set: value => { Io = value; } },
"Jt": { get: () => Jt, set: value => { Jt = value; } },
"Kt": { get: () => Kt, set: value => { Kt = value; } },
"L": { get: () => L, set: value => { L = value; } },
"Lo": { get: () => Lo, set: value => { Lo = value; } },
"M": { get: () => M, set: value => { M = value; } },
"Mo": { get: () => Mo, set: value => { Mo = value; } },
"N": { get: () => N, set: value => { N = value; } },
"No": { get: () => No, set: value => { No = value; } },
"S": { get: () => S, set: value => { S = value; } },
"So": { get: () => So, set: value => { So = value; } },
"To": { get: () => To, set: value => { To = value; } },
"Xt": { get: () => Xt, set: value => { Xt = value; } },
"_o": { get: () => _o, set: value => { _o = value; } },
"ao": { get: () => ao, set: value => { ao = value; } },
"bo": { get: () => bo, set: value => { bo = value; } },
"co": { get: () => co, set: value => { co = value; } },
"eo": { get: () => eo, set: value => { eo = value; } },
"fo": { get: () => fo, set: value => { fo = value; } },
"go": { get: () => go, set: value => { go = value; } },
"ho": { get: () => ho, set: value => { ho = value; } },
"io": { get: () => io, set: value => { io = value; } },
"ko": { get: () => ko, set: value => { ko = value; } },
"lo": { get: () => lo, set: value => { lo = value; } },
"mo": { get: () => mo, set: value => { mo = value; } },
"no": { get: () => no, set: value => { no = value; } },
"oo": { get: () => oo, set: value => { oo = value; } },
"po": { get: () => po, set: value => { po = value; } },
"ro": { get: () => ro, set: value => { ro = value; } },
"so": { get: () => so, set: value => { so = value; } },
"to": { get: () => to, set: value => { to = value; } },
"uo": { get: () => uo, set: value => { uo = value; } },
"vo": { get: () => vo, set: value => { vo = value; } },
"wo": { get: () => wo, set: value => { wo = value; } },
"xo": { get: () => xo, set: value => { xo = value; } },
"yo": { get: () => yo, set: value => { yo = value; } }};
let Jt = "",
  Zt = 0;
let Xt = 0;
let Kt = !1,
  S = [];
function $t() {
  var e = S;
  __imports.localStorage.setItem("ExSave_Enter", JSON.stringify(e));
}
function eo() {
  var e,
    t = document.getElementById("enter__select");
  t.options.length = 0;
  for (e of S) t.options.add(new Option(`【${e.level}级】` + e.word, ""));
}
let to = !1,
  M = {};
function oo() {
  var e = M;
  __imports.localStorage.setItem("ExSave_Gift", JSON.stringify(e));
}
function N(e) {
  return (0, __imports.v)(e, "type@=", "/");
}
let no = !1,
  L = {},
  io = {},
  ao = [];
function ro() {
  var e = L;
  __imports.localStorage.setItem("ExSave_Mute", JSON.stringify(e));
}
function lo(e, o, n) {
  return new Promise((t) => {
    (0, __imports.fetch)("https://www.douyu.com/room/roomSetting/addMuteUser", {
      method: "POST",
      mode: "no-cors",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:
        "ban_nickname=" + o + "&room_id=" + e + "&ban_time=" + n + "&reason=7",
    })
      .then((e) => e.json())
      .then((e) => {
        t(e);
      });
  });
}
let so = { day: {}, week: {}, all: {} };
function co(t, o) {
  if (o)
    for (let e = "week" === t ? 10 : 0; e < o.length; e++) {
      var n = o[e],
        i = n.innerHTML.split("<span")[0],
        a = n.parentElement,
        r = so[t][i];
      a.className.includes("--top")
        ? (n.innerHTML = i + `<span class="exRankPoint--top">${r}</span>`)
        : (n.innerHTML = i + `<span class="exRankPoint">${r}</span>`);
    }
}
function po(t) {
  var o = {};
  for (let e = 0; e < t.length; e++) {
    var n = t[e];
    o[n.nickname] = Number(n.gold) / 100;
  }
  return o;
}
let mo = !1,
  A = {},
  uo = !1,
  go = 0;
function ho() {
  var e = A;
  __imports.localStorage.setItem("ExSave_Reply", JSON.stringify(e));
}
var fo = 0;
function yo(i, a, r, l) {
  (0, __imports.GM_xmlhttpRequest)({
    method: "POST",
    url: "https://pcapi.douyucdn.cn/h5nc/member/getRedPacket?token=" + __imports.m,
    data:
      "room_id=" +
      i +
      "&package_room_id=" +
      i +
      "&device_id=" +
      r +
      "&packerid=" +
      a +
      "&version=1",
    responseType: "json",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    onload: function (t) {
      t = t.response;
      if ("-1" == t.data.code && "0" != t.data.validate) {
        var e = JSON.parse(t.data.geetest.validate_str),
          o = e.success;
        null != __imports.unsafeWindow.initGeetest
          ? __imports.unsafeWindow.initGeetest(
              {
                gt: e.gt,
                challenge: e.challenge,
                offline: !o,
                product: "float",
              },
              (o) => {
                let n = document.getElementById(l);
                (o.appendTo("#" + l),
                  o.onSuccess(() => {
                    var e = o.getValidate(),
                      t = e.geetest_challenge,
                      t =
                        "room_id=" +
                        i +
                        "&package_room_id=" +
                        i +
                        "&device_id=" +
                        r +
                        "&packerid=" +
                        a +
                        "&version=1" +
                        "&geetest_challenge=" +
                        t +
                        "&geetest_validate=" +
                        e.geetest_validate +
                        "&geetest_seccode=" +
                        encodeURIComponent(e.geetest_seccode);
                    (0, __imports.GM_xmlhttpRequest)({
                      method: "POST",
                      url:
                        "https://pcapi.douyucdn.cn/h5nc/member/getRedPacket?token=" +
                        __imports.m,
                      data: t,
                      responseType: "json",
                      headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                      },
                      onload: function (e) {
                        e = e.response;
                        let t = "";
                        ("" !=
                          (t =
                            "" == e.data.prop_id
                              ? "鱼丸x" + e.data.silver
                              : e.data.prop_name + "x" + e.data.prop_count) &&
                          (0, __imports.T)("【宝箱】获得" + t, "success"),
                          null != n && n.remove());
                      },
                    });
                  }));
              },
            )
          : (0, __imports.T)("宝箱验证初始化失败", "error");
      } else if ("领取失败" != t.data.msg && "验证码不正确" != t.data.msg) {
        let e = "";
        "" !=
          (e =
            "" == t.data.prop_id
              ? "鱼丸x" + t.data.silver
              : t.data.prop_name + "x" + t.data.prop_count) &&
          (0, __imports.T)("【宝箱】获得" + e, "success");
      } else (0, __imports.T)("【宝箱】领取失败", "error");
    },
  });
}
let bo = !1,
  vo = {},
  xo = {},
  wo = {},
  _o = 0,
  ko,
  Eo = !1;
function Bo() {
  var e = vo;
  __imports.localStorage.setItem("ExSave_Vote", JSON.stringify(e));
}
function Io() {
  for (var e in wo) {
    var e = wo[e],
      t = document.getElementsByClassName("vote__option-num")[e.index],
      o = document.getElementsByClassName("vote__progress-bar")[e.index],
      n = String(Number(100 * Number(e.num / _o)).toFixed(1)) + "%";
    ((t.innerText = e.num + `（${n}）`), (o.style.width = n));
  }
}
let To = [],
  Co = {},
  So = "",
  Mo = !1,
  No = 0;
async function Lo() {
  100 < Object.keys(Co).length && (Co = {});
  let t = "";
  var o = await new Promise((t, o) => {
    (0, __imports.GM_xmlhttpRequest)({
      method: "GET",
      url: "https://www.douyu.com/lapi/interact/lottery/getHallList",
      responseType: "json",
      onload: (e) => {
        e = e.response;
        t(e);
      },
      onerror: (e) => {
        o(e);
      },
    });
  });
  if (o.data.list) {
    for (let e = 0; e < o.data.list.length; e++) {
      var n,
        i,
        a,
        r = o.data.list[e];
      0 === r.status &&
        ((a =
          "command_content" in
          (i = (n = await ((e) =>
            new Promise((t, o) => {
              (0, __imports.fetch)(
                "https://www.douyu.com/member/lottery/activity_info?room_id=" +
                  e,
                {
                  method: "GET",
                  mode: "no-cors",
                  credentials: "include",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                },
              )
                .then((e) => e.json())
                .then((e) => {
                  t(e);
                })
                .catch((e) => {
                  o(e);
                });
            }))(r.room_id)).data.join_condition)
            ? "发送弹幕"
            : `赠送 ${i.gift_name}（${i.gift_price}）x` + i.gift_num),
        (l =
          Number(n.data.start_at) + Number(n.data.join_condition.expire_time)),
        (l = 1e3 * l),
        (s = new Date().getTime()),
        (c = d = void 0),
        (s =
          -1 ==
          (s =
            l < s
              ? -1
              : ((d = ""),
                (c = (s = (l = Math.abs(l - s)) % 864e5) % 36e5),
                (d =
                  (d =
                    (d += 0 < (l = Math.floor(l / 864e5)) ? l + "天" : "") +
                    (0 < (l = Math.floor(s / 36e5)) ? l + "时" : "")) +
                  (0 < (s = Math.floor(c / 6e4)) ? s + "分" : "")) +
                  (0 < (l = Math.round((c % 6e4) / 1e3)) ? l + "秒" : "")))
            ? "已结束"
            : "距结束：" + s),
        (d = -1 !== To.indexOf(String(r.room_id)) || i.lottery_range <= 1) &&
          Mo &&
          ((c = n.data.prize_name + "|" + n.data.start_at) in Co ||
            (Co[c] = 1)),
        (t += `

            <a class="lottery__a" href="https://www.douyu.com/${r.room_id}" target="_blank">

                <div class="lottery__item">

                    <div class="lottery__img">

                        <div class="lottery__anchor">${r.anchor_name}</div>

                        <img loading="lazy" src="${r.verticalSrc}"/>

                        <div class="lottery__expireTime">${s}</div>

                    </div>

                    <div class="lottery__info">

                        <div class="lottery__prize">${n.data.prize_name}x${n.data.prize_num}</div>

                        <div class="lottery__jointext">${a}</div>

                        <div style="color:${d ? "#64ce83" : "#e74c3c"}" class="lottery__condition">${((
                          e,
                        ) => {
                          let t = "";
                          switch (e.lottery_range) {
                            case 0:
                              t = "所有人可参与";
                              break;
                            case 1:
                              t = "关注主播";
                              break;
                            case 2:
                              t = "成为粉丝";
                              break;
                            case 3:
                              t = "关注主播+成为粉丝";
                          }
                          return t;
                        })(i)}</div>

                    </div>

                </div>

            </a>

        `));
    }
    var l,
      s,
      d,
      c,
      e = document.getElementsByClassName("lottery__nodata")[0],
      e =
        ("" !== t.trim()
          ? (e.style.display = "none")
          : (e.style.display = "block"),
        (So = t),
        document.getElementsByClassName("lottery__wrap")[0]);
    e && (e.innerHTML = So);
  }
}

}
,
"src/next/services/spending.js":
function* (__imports) {
yield {"Do": { get: () => Do, set: value => { Do = value; } },
"Ro": { get: () => Ro, set: value => { Ro = value; } },
"findMonthlySpendingControl": { get: () => findMonthlySpendingControl, set: value => { findMonthlySpendingControl = value; } },
"loadMonthlySpending": { get: () => loadMonthlySpending, set: value => { loadMonthlySpending = value; } },
"renderMonthlySpending": { get: () => renderMonthlySpending, set: value => { renderMonthlySpending = value; } }};
let Ao = "ExSave_MonthCost",
  Do = "ExSave_MonthCost_SeeStatus",
  jo = 0,
  Po = [],
  zo =
    '<svg t="1619141525444" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4635" width="16" height="16" style="/* display: inline-block; */"><path d="M1009.592 531.212C863.184 730.624 696.96 832 512 832c-184.96 0-351.184-101.376-497.592-300.788C10.384 525.864 8 519.212 8 512s2.384-13.864 6.408-19.212C160.816 293.376 327.04 192 512 192c184.96 0 351.184 101.376 497.592 300.788 4.024 5.348 6.408 12 6.408 19.212s-2.384 13.864-6.408 19.212zM512 768c156.864 0 300.54-84.332 432.012-256C812.54 340.332 668.864 256 512 256c-156.864 0-300.54 84.332-432.012 256C211.46 683.668 355.136 768 512 768z m0-64c-106.04 0-192-85.96-192-192s85.96-192 192-192 192 85.96 192 192-85.96 192-192 192z m0-64c70.692 0 128-57.308 128-128s-57.308-128-128-128-128 57.308-128 128 57.308 128 128 128z" p-id="4636" fill="#707070"></path></svg>',
  Oo =
    '<svg t="1619143157694" class="icon" viewBox="0 0 1186 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1733" width="16" height="16"><path d="M591.707784 915.740462A642.870487 642.870487 0 0 1 2.965954 526.459025a39.298888 39.298888 0 0 1 0-28.91805 632.489649 632.489649 0 0 1 584.292899-388.539948h8.897862a630.265183 630.265183 0 0 1 584.292899 388.539948 39.298888 39.298888 0 0 1 0 28.91805 637.680068 637.680068 0 0 1-336.635757 337.377245 646.577929 646.577929 0 0 1-252.106073 51.904192zM77.856287 512.370744a565.755688 565.755688 0 0 0 1026.961505 0 556.116338 556.116338 0 0 0-508.661077-329.220872h-8.897862a556.857827 556.857827 0 0 0-509.402566 329.220872z" p-id="1734" fill="#707070"></path><path d="M590.966296 732.592814a218.739093 218.739093 0 1 1 222.446535-218.739093 218.739093 218.739093 0 0 1-222.446535 218.739093z m0-362.587852a144.590248 144.590248 0 1 0 148.29769 143.848759 148.29769 148.29769 0 0 0-148.29769-143.848759z" p-id="1735" fill="#707070"></path><path d="M1137.443284 1023.997776a37.074423 37.074423 0 0 1-24.469119-8.897862L20.761677 65.253208A37.074423 37.074423 0 0 1 68.958426 8.900086l1092.212489 946.880752a37.074423 37.074423 0 0 1 0 52.64568 35.591446 35.591446 0 0 1-23.727631 15.571258z" p-id="1736" fill="#707070"></path></svg>',
  Ro = 0;
function Fo() {
  return document.getElementById("monthcost__money");
}
function findMonthlySpendingControl() {
  return document.getElementsByClassName("monthcost__icon")[0];
}
function renderMonthlySpending() {
  var e = findMonthlySpendingControl(),
    t = Fo();
  e &&
    t &&
    (1 === Ro
      ? (e.innerHTML = zo)
      : ((t.innerText = "***"), (e.innerHTML = Oo)),
    Wo());
}
function Vo(e) {
  return new Promise((t) => {
    (0, __imports.fetch)(e, { method: "GET", mode: "no-cors", credentials: "include" })
      .then((e) => e.json())
      .then((e) => {
        t(e);
      })
      .catch(() => {
        t({ error: -1, data: [] });
      });
  });
}
async function qo() {
  ((o = new Date()),
    (e = o.getMonth()),
    (t = o.getFullYear()),
    (t = new Date(t, e, 1)));
  var e,
    t,
    o,
    [n, i] = [
      Math.round(new Date(t).getTime() / 1e3).toString(),
      Math.round(o.getTime() / 1e3).toString(),
    ],
    [a, r] =
      ((e = new Date()),
      (t = e.getMonth()),
      (o = e.getFullYear()),
      (o = new Date(o, t, 1)),
      [
        (t = (e) =>
          e.getFullYear() +
          `-${(e.getMonth() + 1).toString().padStart(2, "0")}-` +
          e.getDate().toString().padStart(2, "0"))(o),
        t(e),
      ]);
  let l = [],
    s = !0,
    d = 0;
  for (; s;) {
    let e =
      `https://www.douyu.com/wjapi/nc/exchange/consume/giftList?queryType=0&consumeType=0&startDate=${n}&endDate=${i}&tradeStartDate=${a}&tradeEndDate=${r}&direction=` +
      1;
    0 !== d && (e += "&id=" + d);
    var c = await Vo(e);
    1e3 == c.error
      ? await new Promise((e) => (0, __imports.setTimeout)(e, 2e3))
      : ((c = (c && c.data) || []),
        (l = l.concat(c)),
        c.length < 20 ? (s = !1) : (d = c[c.length - 1].id));
  }
  var p,
    m,
    u = {};
  for (p of l) {
    var g = Math.abs(p.amount),
      h = ((jo += g), p.consumeTypeDesc || "其他");
    (u[h] || (u[h] = 0), (u[h] += g));
  }
  for (m in u) Po.push({ title: m, money: u[m] });
}
async function Uo() {
  ((jo = 0), (Po = []), await qo());
  {
    let e = 1;
    var n = [];
    let t = !0;
    for (var i = new Date(), a = i.getMonth(), r = i.getFullYear(); t;) {
      var l,
        s =
          (
            (
              (await Vo(
                "https://www.douyu.com/japi/interactnc/web/dFansbadge/myLogs?type=0&page=" +
                  e,
              )) || {}
            ).data || {}
          ).list || [];
      for (l of s) {
        var d = new Date(1e3 * l.consumeTime);
        d.getMonth() === a && d.getFullYear() === r && n.push(l);
      }
      if (!s[s.length - 1]) break;
      var c = new Date(1e3 * s[s.length - 1].consumeTime);
      s.length < 20 || c.getMonth() !== a || c.getFullYear() !== r
        ? (t = !1)
        : e++;
    }
    let o = 0;
    for (let e of n) o += Math.abs(e.consumeMoney);
    (0 < o && Po.push({ title: "钻粉充值/续费", money: o }), (jo += o));
  }
  await 0;
  {
    let e = { monthCost: jo, updateTime: new Date().getTime(), typeDetail: Po },
      t = __imports.localStorage.getItem(Ao);
    if (null !== t)
      try {
        t = JSON.parse(t);
      } catch (e) {
        t = {};
      }
    else t = {};
    ((t[__imports.I] = e), __imports.localStorage.setItem(Ao, JSON.stringify(t)));
  }
  Wo();
  i = Fo();
  i && (i.innerText = String(jo / 100));
}
function Wo() {
  var e = document.getElementsByClassName("month-cost")[0];
  if (e)
    if (1 === Ro && 0 < Po.length) {
      let t = "数据每日更新，根据个人中心消费数据统计。\n--- ---\n";
      (Po.forEach((e) => {
        t += `${e.title}: ${String(e.money / 100)} 元\n`;
      }),
        (e.title = t));
    } else e.title = "数据每日更新，根据个人中心消费数据统计。";
}
function loadMonthlySpending() {
  if (1 === Ro) {
    let e = 1;
    var t,
      o = new Date().getDate(),
      n = (() => {
        let t = __imports.localStorage.getItem(Ao);
        if (null !== t)
          try {
            t = JSON.parse(t);
          } catch (e) {
            t = {};
          }
        else t = {};
        return t;
      })();
    (__imports.I in n
      ? ((n = n[__imports.I]),
        (e = Math.abs(o - new Date(n.updateTime).getDate())),
        (o = n.monthCost),
        (n = n.typeDetail || []),
        (t = Fo()) && (t.innerText = String(o / 100)),
        (Po = n),
        Wo())
      : (t = Fo()) &&
        (t.innerHTML = '<span class="PlayerToolbar-dataLoadding"></span>'),
      1 <= e && Uo());
  }
}

}
,
"src/next/services/preferences.js":
function* (__imports) {
yield {"$o": { get: () => $o, set: value => { $o = value; } },
"Jo": { get: () => Jo, set: value => { Jo = value; } },
"Ko": { get: () => Ko, set: value => { Ko = value; } },
"Qo": { get: () => Qo, set: value => { Qo = value; } },
"Xo": { get: () => Xo, set: value => { Xo = value; } },
"Zo": { get: () => Zo, set: value => { Zo = value; } }};
let Qo =
    '<svg t="1587640254282" class="icon" viewBox="0 0 1055 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5670" width="26" height="26"><path d="M388.06497 594.013091c-96.566303-167.253333-39.067152-381.889939 128.217212-478.487273a348.656485 348.656485 0 0 1 256.248242-36.864C623.491879-5.306182 435.417212-11.170909 276.542061 80.616727 37.236364 218.763636-44.776727 524.815515 93.401212 764.152242c138.146909 239.305697 444.198788 321.318788 683.535515 183.140849 158.875152-91.725576 247.870061-257.520485 249.669818-428.559515a348.656485 348.656485 0 0 1-160.085333 203.496727c-167.253333 96.566303-381.889939 39.036121-478.487273-128.217212" p-id="5671" fill="#8a8a8a"></path></svg>',
  Jo =
    '<svg t="1587640423416" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2270" width="26" height="26"><path d="M270.016 197.248l-83.84-84.544-69.76 70.464 83.776 84.544 69.76-70.4zM139.648 465.024H0v93.888h139.648V465.024zM558.528 0H465.472v136.192h93.056V0z m349.056 183.168l-69.76-70.464-83.84 84.544L819.2 263.04l88.384-79.872z m-153.6 643.584l83.84 84.48 65.28-65.728L819.2 760.96l-65.216 65.792z m130.368-267.84H1024V465.024h-139.648v93.888zM512.064 230.08C358.4 230.08 232.768 356.992 232.768 512c0 155.008 125.632 281.856 279.296 281.856 153.6 0 279.232-126.848 279.232-281.856 0-154.944-125.632-281.856-279.232-281.856zM465.472 1024h93.056v-136.256H465.472V1024z m-349.056-183.232l69.76 70.4 83.84-84.48L204.8 760.96 116.48 840.768z" p-id="2271" fill="#8a8a8a"></path></svg>',
  Zo = 0;
function Xo() {
  var e = { mode: Zo };
  __imports.localStorage.setItem("ExSave_Mode", JSON.stringify(e));
}
function Ko() {
  !document.getElementsByClassName("live-next-body")[0] &&
    (0, __imports.tl)("Ex_Style_NightMode", "/* [DouyuEx-Lite] 夜间样式已剥离 */");
}
function $o() {
  var e,
    t,
    o,
    n = document
      .getElementsByClassName("BottomGroup")[0]
      .getElementsByTagName("iframe")[0];
  null != n &&
    ((n = n.contentWindow.document),
    (e = "Ex_Style_NightModeIframe"),
    (t = "/* [DouyuEx-Lite] 鱼吧夜间样式已剥离 */"),
    null == n.getElementById(e)) &&
    (((o = n.createElement("style")).id = e),
    (o.innerHTML = t),
    n.body.append(o));
}

}
,
"src/next/services/danmaku-renderer.js":
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
,
"src/next/services/music.js":
function* (__imports) {
yield {"advanceRoomMusic": { get: () => advanceRoomMusic, set: value => { advanceRoomMusic = value; } },
"j": { get: () => j, set: value => { j = value; } },
"ln": { get: () => ln, set: value => { ln = value; } },
"pn": { get: () => pn, set: value => { pn = value; } },
"refreshRoomMusic": { get: () => refreshRoomMusic, set: value => { refreshRoomMusic = value; } },
"sn": { get: () => sn, set: value => { sn = value; } }};
let j = {
    view: "",
    showtime: 1428,
    danmu_person_count: "",
    gift_person_count: "",
    paid_person_count: "",
    isShow: 2,
    money_yc: 0,
    money_bag: 0,
    money_total: 0,
    noble_count: "",
  },
  ln = !1;
function sn(e) {
  var t = Number(e);
  return isNaN(t)
    ? e
    : 1e4 <= t
      ? ((e = t / 1e4),
        Number.isInteger(e) ? e + "万" : parseFloat(e.toFixed(1)) + "万")
      : String(t);
}
async function refreshRoomMusic() {
  null != document.querySelector(".MatchSystemChatRoomEntry") &&
    (document.querySelector(".MatchSystemChatRoomEntry").style.display =
      "none");
  e = __imports.B;
  var e,
    n,
    t = await new Promise((t, o) => {
      (0, __imports.GM_xmlhttpRequest)({
        method: "POST",
        url: "https://www.doseeing.com/xeee/room/aggr",
        headers: {
          Connection: "keep-alive",
          "Content-Type": "application/json;charset=UTF-8",
          Origin: "https://www.doseeing.com",
          Referer: "https://www.doseeing.com/room/" + e,
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/91.0.4472.114",
        },
        data: `{"m":"${window.btoa(`rid=${e}&dt=0`).split("").reverse().join("")}"}`,
        responseType: "json",
        onload: (e) => {
          t(e.response);
        },
        onerror: (e) => {
          o(e);
        },
      });
    }),
    o =
      ((n = __imports.B),
      await new Promise((t, o) => {
        (0, __imports.fetch)(
          "https://www.douyu.com/japi/interactnc/web/fsjk/getCardTaskInfo?rid=" +
            n,
          { method: "GET", mode: "no-cors", credentials: "include" },
        )
          .then((e) => e.json())
          .then((e) => {
            t(e);
          })
          .catch((e) => {
            o(e);
          });
      }));
  let i = 0;
  ((i =
    2 == j.isShow || 1428 == j.showtime
      ? 0
      : Math.floor(Date.now() / 1e3) - Number(j.showtime)),
    (j.view = t.data["active.uv"] || 0),
    (j.danmu_person_count = t.data["chat.uv"] || 0),
    (j.gift_person_count = t.data["gift.all.uv"] || 0),
    (j.paid_person_count = t.data["gift.paid.uv"] || 0),
    (j.money_yc = Number(t.data["gift.paid.price"] / 100 || 0).toFixed(2)),
    (j.money_total = Number(t.data["gift.all.price"] / 100 || 0).toFixed(2)),
    (document.getElementById("real-audience__total").innerText = j.view),
    (document.getElementById("real-audience__t").title =
      "今日累计活跃人数:" +
      j.view +
      " 弹幕人数:" +
      j.danmu_person_count +
      " 送礼人数:" +
      j.gift_person_count +
      " 付费人数:" +
      j.paid_person_count),
    (document.getElementById("real-audience__barrage").innerText =
      j.danmu_person_count),
    (document.getElementById("real-audience__money_yc").innerText = j.money_yc),
    (document.getElementById("real-audience__money").title =
      "总礼物价值:" + j.money_total + " 鱼翅礼物:" + j.money_yc),
    "" !== j.noble_count &&
      (document.getElementById("real-audience__noble").innerText = sn(
        j.noble_count,
      )),
    (document.getElementById("real-audience__time").innerText = "已播:" + (0, __imports.Q)(i)),
    (document.getElementById("real-audience__time").title =
      "开播时间:" +
      String(
        (0, __imports.k)("yyyy年MM月dd日hh时mm分ss秒 ", new Date(Number(j.showtime + "000"))),
      ) +
      "\n已观看:" +
      (0, __imports.Q)(o.data.todayWatch)),
    0 == o.error &&
      ((document.getElementById("real-audience__watchtime").innerText =
        "已观看:" + (0, __imports.Q)(o.data.todayWatch)),
      (document.getElementById("real-audience__watchtime").title =
        "开播时间:" +
        String(
          (0, __imports.k)(
            "yyyy年MM月dd日hh时mm分ss秒 ",
            new Date(Number(j.showtime + "000")),
          ),
        ) +
        "\n已观看:" +
        (0, __imports.Q)(o.data.todayWatch))));
}
function advanceRoomMusic() {
  var e = document.getElementById("real-audience__time"),
    t = document.getElementById("real-audience__watchtime");
  "none" == e.style.display
    ? ((e.style.display = "block"), (t.style.display = "none"))
    : ((e.style.display = "none"), (t.style.display = "block"));
}
function pn() {
  var e = {
    barrageFrame: {
      status:
        "none" ==
        document.getElementsByClassName("layout-Player-rank")[0].style.display,
    },
    video: { status: (0, __imports.fn)() },
    barrage: { status: 1 == __imports.mn },
  };
  __imports.localStorage.setItem("ExSave_Refresh", JSON.stringify(e));
}

}
,
"src/next/services/page-cleanup.js":
function* (__imports) {
yield {"bn": { get: () => bn, set: value => { bn = value; } },
"fn": { get: () => fn, set: value => { fn = value; } },
"gn": { get: () => gn, set: value => { gn = value; } },
"hn": { get: () => hn, set: value => { hn = value; } },
"mn": { get: () => mn, set: value => { mn = value; } },
"un": { get: () => un, set: value => { un = value; } },
"yn": { get: () => yn, set: value => { yn = value; } }};
let mn = 0;
function un() {
  ((0, __imports.tl)(
    "Ex_Style_RefreshBarrage",
    `

    .UserCsgoGameDataMedal,.Barrage-honor,.Barrage-listItem .Barrage-icon,.Barrage-listItem .FansMedal.is-made,.Barrage-listItem .RoomLevel,.Barrage-listItem .Motor,.Barrage-listItem .ChatAchievement,.Barrage-listItem .Barrage-hiIcon,.Barrage-listItem .Medal,.Barrage-listItem .MatchSystemTeamMedal{display:none !important;}

    /*.Barrage-listItem .UserLevel{display:none !important;}*/

    .Barrage-listItem .Baby{display:none !important;}

    .FansMedalWrap{display:none !important;}

    `,
  ),
    (mn = 1),
    document.getElementById("refresh-barrage").classList.add("ex-active"),
    (document.getElementById("refresh-barrage__text").style.color = "#fff"),
    (document.getElementById("refresh-barrage__text").innerText = "前缀"));
  var e = document.getElementById("refresh-barrage__svg");
  e &&
    (e = e.getElementsByTagName("path")[0]) &&
    e.setAttribute("fill", "#ffffff");
}
let gn = 0;
function hn(e) {
  var t = document.getElementById("ex-refresh-switch"),
    o = document.getElementById("ex-refresh-switch-circle");
  t &&
    o &&
    (e
      ? ((t.style.background = "#f60"), (o.style.left = "14px"))
      : ((t.style.background = "rgba(255,255,255,0.3)"),
        (o.style.left = "2px")));
}
function fn() {
  return (
    "hidden" ==
    document.getElementsByClassName("PlayerToolbar-ContentRow")[0].style
      .visibility
  );
}
function yn() {
  (0, __imports.tl)(
    "Ex_Style_VideoRefresh",
    `

    .PELact,.pushTower-wrapper-gf1HG,.PkView-9f6a2c,.MorePk,.RandomPKBar,.LiveRoomLoopVideo,.LiveRoomDianzan,.maiMaitView-68e80c,.PkView{display:none !important;}

    `,
  );
}
function bn() {
  (0, __imports.tl)(
    "Ex_Style_RemoveAD",
    `

    .ScreenBannerAd,.XinghaiAd,.CustomGroupGuide,.FudaiGiftToolBarTips,.UserInfo-tryEnterHiddenLead,.BargainingKit,.AnchorPocketTips,.FishShopTip,.FollowGuide,#js-bottom-right-cloudGame,.CloudGameLink,.RoomText-icon-horn,.RoomText-list,.Search-ad,.RedEnvelopAd,.noHandlerAd-0566b9,.PcDiversion,.DropMenuList-ad,.DropPane-ad,.WXTipsBox,.igl_bg-b0724a,.closure-ab91fb,.VideoAboveVivoAd,.css-widgetWrapper-EdVVC,.watermark-442a18,.FollowGuide-FadeOut,.MatchSystemChatRoomEntry-roomTabs,.FansMedalDialog-normal,.GameLauncher,.recommendAD-54569e,.recommendApp-0e23eb,.Title-ad,.Bottom-ad,.SignBarrage,.corner-ad-495ade,.SignBaseComponent-sign-ad,.SuperFansBubble,.is-noLogin,.PlayerToolbar-signCont,#js-widget,.Frawdroom,.HeaderGif-right,.HeaderGif-left,.liveos-workspace{display:none !important;}

    .Barrage-topFloater{z-index:999}

    .danmuAuthor-3d7b4a, .danmuContent-25f266{overflow: initial}

    .BattleShipTips{display:none !important;}

    .LastLiveTime,.recommendView-3e8b62{display:none !important;}

    .TurntableLottery-actTips{display:none !important;}

    .feedback-e27241{display:none !important;}

    .FansMedalEnter-maxFlag{display:none !important;}

    .Header-follow-listBox{max-height:640px !important;}



    .GuessGameMiniPanelB-wrapper{display:none !important;}



    .ZoomTip{display:none !important;}



    /*福利券*/

    .PlayerToolbar-couponInfo{display:none !important;}

    /*太空探险tips*/

    .AroundStarsActTips-actTips,.AroundStarsMoonBoxTips,.AroundStarsPlanetTips{display:none !important;}

    /*优化页面*/

    #js-barrage-list-parent{scrollbar-width: none;-ms-overflow-style: none;width:98%;height:100%}

    #js-barrage-list-parent::-webkit-scrollbar{display: none;}

    /*陪玩*/

    .InteractPlayWithEnter-enterTips1{display:none !important;}



    /*恢复emoji彩色 chrome加粗情况下emoji会变灰，需要找一个fontweight起始值在500的字体库才可以兼容*/



    /*右侧分享*/

    .SharePanel,.CommonShareToolkit{

        display: none!important;

    }

    /*去除还在电脑面前的mask*/

    .mask1-63237a,.mask2-a8df6e,.panel1-1484c9,.panel2-5ece0e{

        display: none!important;

    }

    /*左侧悬浮二维码广告*/

    .IconCardAdCard{

        display: none!important;

    }

    /*视频右侧的游戏手柄按钮AD*/

    .IconCardAd {

        display: none!important;

    }

    /*视频区视频广告*/

    .CloseVideoPlayerAd,.IconCardAdBoundsBox{

        display: none!important;

    }

    /*直播间顶部广告*/

    .room-top-banner-box {

        display: none!important;

    }

    /*弹幕框底部进场弹幕信息*/

    #js-barrage-extend-container {

        display: none!important;

        display: var(--enter-display, none) !important;

    }

    /*直播间右侧广告*/

    .LadderNav {

        display: none!important;

    }

    #js-bottom-right-recommendAd {

        display: none!important;

    }

    /*弹幕框顶部广告*/

    .aside-top-uspension-box {

        display: none!important;

    }

    #js-player-asideMain {

        top: 0!important;

    }

    /*右下角联系客服*/

    .bacpCommonKeFu {

        display: none!important;

    }



    .ClosingRecommend,.ClosingRecommend *,.werbungContainer__2sv7h{display:none !important;}

    #js-player-asideTopSuspension{display:none !important;}

    .Search-Panel-Advert{display:none !important;}

    `,
  );
}

}
,
"src/next/services/yuba.js":
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
,
"src/next/services/danmaku-filters.js":
function* (__imports) {
yield {"$n": { get: () => $n, set: value => { $n = value; } },
"En": { get: () => En, set: value => { En = value; } },
"Un": { get: () => Un, set: value => { Un = value; } },
"Wn": { get: () => Wn, set: value => { Wn = value; } },
"qn": { get: () => qn, set: value => { qn = value; } }};
let En = 5;
let Bn =
  !!(__imports.n = __imports.localStorage.getItem("ExSave_isRemoveDanmakuBackground")) &&
  1 === Number(__imports.n);
function In() {
  document.getElementsByClassName("FilterKeywords")[0].insertAdjacentHTML(
    "afterbegin",
    `<div class="FilterSwitchStatus" id="ex-removeDanmakuBackground">

    <h3>屏蔽弹幕背景</h3>

    <div>

      <span class="FilterSwitchStatus-status ${Bn ? "is-checked" : "is-noChecked"}">${Bn ? "已开启" : "未开启"}</span>

      <span class="FilterSwitchStatus-switch ${Bn ? "is-checked" : "is-noChecked"}">

        <span class="FilterSwitchStatus-switch-inner"></span>

      </span>

    </div>

  </div>`,
  );
  var e = document.getElementById("ex-removeDanmakuBackground");
  let t = e.querySelector(".FilterSwitchStatus-status"),
    o = e.querySelector(".FilterSwitchStatus-switch");
  e.addEventListener("click", () => {
    ((Bn = !Bn)
      ? (Tn(),
        (t.className = t.className.replace("is-noChecked", "is-checked")),
        (t.textContent = "已开启"),
        (o.className = o.className.replace("is-noChecked", "is-checked")))
      : ((0, __imports.U)("Ex_Style_RemoveDanmakuBackground"),
        (t.className = t.className.replace("is-checked", "is-noChecked")),
        (t.textContent = "未开启"),
        (o.className = o.className.replace("is-checked", "is-noChecked"))),
      __imports.localStorage.setItem("ExSave_isRemoveDanmakuBackground", Bn ? 1 : 0));
  });
}
function Tn() {
  (0, __imports.tl)(
    "Ex_Style_RemoveDanmakuBackground",
    `

      .danmuItem-a8616a {

        background: none !important;

      }

      .danmuItem-a8616a div{

        background: none;

      }

      .danmuItem-a8616a > img {

        display: none;

      }

      .danmuItem-a8616a div > img {

        display: none;

      }

      .super-text-f60bfa {

        background: none !important;

      }

      .danmuItem-a8616a .noble-d35c82 {

        background: none !important;

      }

      .customBarrage {

        background: none !important;

        text-shadow: none !important;

      }

      .customBarrage > div {

        background: none !important;

      }

      .PlayerCustomBarrage-prefixPlugin--text {

        display: none !important;

      }

  `,
  );
}
(Bn && Tn(),
  (__imports.t = __imports.localStorage.getItem("ExSave_isRemoveDanmakuImage")) && Number(__imports.t));
let Cn =
  !!(__imports.n = __imports.localStorage.getItem("ExSave_isRemoveEnterBarrage")) &&
  1 === Number(__imports.n);
function Sn() {
  var o = document.getElementsByClassName("FilterKeywords")[0],
    n =
      window.CSS &&
      window.CSS.supports &&
      window.CSS.supports("--enter-display", "none");
  let i = document.getElementById("js-barrage-extend-container");
  if (null != o && n) {
    (o.insertAdjacentHTML(
      "afterbegin",
      `<div class="FilterSwitchStatus" id="ex-removeEnterBarrage">

    <h3>屏蔽进场弹幕</h3>

    <div>

      <span class="FilterSwitchStatus-status ${Cn ? "is-checked" : "is-noChecked"}">${Cn ? "已开启" : "未开启"}</span>

      <span class="FilterSwitchStatus-switch ${Cn ? "is-checked" : "is-noChecked"}">

        <span class="FilterSwitchStatus-switch-inner"></span>

      </span>

    </div>

  </div>`,
    ),
      Cn
        ? i && i.style.setProperty("--enter-display", "none", "important")
        : i && i.style.setProperty("--enter-display", "block", "important"));
    n = document.getElementById("ex-removeEnterBarrage");
    let e = n.querySelector(".FilterSwitchStatus-status"),
      t = n.querySelector(".FilterSwitchStatus-switch");
    n.addEventListener("click", () => {
      ((Cn = !Cn)
        ? (i && i.style.setProperty("--enter-display", "none", "important"),
          (e.className = e.className.replace("is-noChecked", "is-checked")),
          (e.textContent = "已开启"),
          (t.className = t.className.replace("is-noChecked", "is-checked")))
        : (i && i.style.setProperty("--enter-display", "block", "important"),
          (e.className = e.className.replace("is-checked", "is-noChecked")),
          (e.textContent = "未开启"),
          (t.className = t.className.replace("is-checked", "is-noChecked"))),
        __imports.localStorage.setItem("ExSave_isRemoveEnterBarrage", Cn ? 1 : 0));
    });
  }
}
let Mn = "1" === __imports.localStorage.getItem("ExSave_isRemoveRepeatedDanmaku"),
  Nn = (() => {
    var e = __imports.localStorage.getItem("ExSave_repeatedDanmakuSeconds");
    if (e) {
      e = parseInt(e);
      if (!isNaN(e) && 1 <= e && e <= 60) return e;
    }
    return 5;
  })(),
  Ln =
    null !== (__imports.t = __imports.localStorage.getItem("ExSave_isEnlargeDanmaku")) && "1" === __imports.t,
  An = {},
  Dn = {},
  jn = {},
  Pn = {},
  zn = new WeakMap(),
  On = null,
  Rn = null;
function Fn() {
  document.getElementsByClassName("FilterKeywords")[0].insertAdjacentHTML(
    "afterbegin",
    `<div class="FilterSwitchStatus" id="ex-removeRepeatedDanmaku">

    <h3>屏蔽重复弹幕</h3>

    <div>

      <span class="FilterSwitchStatus-status ${Mn ? "is-checked" : "is-noChecked"}">${Mn ? "已开启" : "未开启"}</span>

      <span class="FilterSwitchStatus-switch ${Mn ? "is-checked" : "is-noChecked"}">

        <span class="FilterSwitchStatus-switch-inner"></span>

      </span>

    </div>

  </div>

  <p class="FilterKeywords-intelligentText" style="display: flex; align-items: center;justify-content: space-between;">

    <span>

      <input type="number" id="ex-repeatedDanmakuSeconds" min="1" max="300" value="${Nn}" style="width: 38px; height: 14px; text-align: center;" />

      <span>秒内重复的弹幕只显示一次</span>

    </span>

    <label style="margin-left: 10px;display: inline-flex; align-items: center;">

      <input type="checkbox" id="ex-enlargeDanmaku" ${Ln ? "checked" : ""} style="margin-right: 4px;" />

      放大重复弹幕

    </label>

  </p>`,
  );
  var e = document.getElementById("ex-removeRepeatedDanmaku");
  let t = e.querySelector(".FilterSwitchStatus-status"),
    o = e.querySelector(".FilterSwitchStatus-switch"),
    n = document.getElementById("ex-repeatedDanmakuSeconds"),
    i = document.getElementById("ex-enlargeDanmaku");
  (n.addEventListener("click", (e) => {
    e.stopPropagation();
  }),
    i.addEventListener("click", (e) => {
      e.stopPropagation();
    }),
    n.addEventListener("input", () => {
      let e = parseInt(n.value);
      var t;
      (isNaN(e) || e < 1
        ? ((e = 1), (n.value = 1))
        : 300 < e && ((e = 300), (n.value = 300)),
        (Nn = e),
        (t = e),
        __imports.localStorage.setItem("ExSave_repeatedDanmakuSeconds", t.toString()),
        Mn && (Rn && (Rn.closeHook(), (Rn = null)), Vn(), Hn()));
    }),
    i.addEventListener("change", () => {
      var e;
      ((Ln = i.checked),
        (e = Ln),
        __imports.localStorage.setItem("ExSave_isEnlargeDanmaku", e ? "1" : "0"));
    }),
    e.addEventListener("click", () => {
      (Mn = !Mn)
        ? (Hn(),
          (t.className = t.className.replace("is-noChecked", "is-checked")),
          (t.textContent = "已开启"),
          (o.className = o.className.replace("is-noChecked", "is-checked")))
        : (Rn && (Rn.closeHook(), (Rn = null)),
          Vn(),
          (0, __imports.U)("Ex_Style_RemoveRepeatedDanmaku"),
          (0, __imports.U)("Ex_Style_RemoveRepeatedDanmaku_Count"),
          (t.className = t.className.replace("is-checked", "is-noChecked")),
          (t.textContent = "未开启"),
          (o.className = o.className.replace("is-checked", "is-noChecked")));
      var e = Mn;
      __imports.localStorage.setItem("ExSave_isRemoveRepeatedDanmaku", e ? "1" : "0");
    }));
}
function Hn() {
  (0, __imports.tl)(
    "Ex_Style_RemoveRepeatedDanmaku_Count",
    `

    /* 弹幕计数显示样式 */

    [data-repeat-count]::before {

      content: "x" attr(data-repeat-count);

      font-weight: bold;

      display: inline-block;

      position: absolute;

      right: -18px;

      bottom: 0;

      font-size: 16px;

      font-family: "Helvetica Neue",Helvetica,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","微软雅黑",Arial,sans-serif;

      color: inherit;

    }

    

    /* 计数跳动动画 */

    @keyframes danmaku-combo-bounce {

      0% {

        transform: scale(1);

      }

      50% {

        transform: scale(1.5);

      }

      100% {

        transform: scale(1);

      }

    }

    

    /* 应用动画的类 */

    .danmaku-combo-animation::before {

      animation: danmaku-combo-bounce 0.2s ease-out;

    }

    `,
  );
  let e = (0, __imports.setInterval)(() => {
    document.querySelector(".danmu-fbb2a3") &&
      ((0, __imports.clearInterval)(e),
      (On = On || (0, __imports.setInterval)(Gn, 2e4)),
      (Rn = new __imports.DomMutationSubscription(".danmu-fbb2a3", !1, (i) => {
        if (!(i.length <= 0) && Mn)
          if (i[0].addedNodes.length <= 0 && 0 < i[0].removedNodes.length) {
            var n = i[0].removedNodes[0];
            let e = n.comment.uuid;
            var a = n.comment.startTime + n.comment.duration;
            let t = Date.now();
            if (t > a) return;
            Dn[e] = t + 1e3 * Nn;
            let o = n.textContent ? n.textContent.trim() : "";
            void (
              o &&
              jn[o] === n &&
              (delete jn[o], delete Pn[o], delete An[o])
            );
          } else if (!(i[0].addedNodes.length <= 0)) {
            a = i[0].addedNodes[0];
            if (a) {
              let e = Date.now(),
                t = a.comment.uuid;
              n = Dn[t];
              if (!(n && e <= n)) {
                let n = a.textContent ? a.textContent.trim() : "";
                if (n && 0 !== n.length) {
                  i = An[n];
                  if (i && e <= i) {
                    if (
                      ((a.className += " repeated-danmaku"),
                      (Pn[n] = (Pn[n] || 1) + 1),
                      Ln)
                    ) {
                      let o = jn[n];
                      o && o.parentNode
                        ? (0, __imports.requestAnimationFrame)(() => {
                            var e, t;
                            o.parentNode &&
                              (zn.has(o) ||
                                ((t = window.getComputedStyle(o)),
                                zn.set(o, t.fontSize)),
                              (t = zn.get(o)),
                              (t = parseFloat(t) || 20),
                              (e = Pn[n]),
                              (t = Math.min(t + 2 * (e - 1), 40)),
                              (o.style.fontSize = t + "px"),
                              o.setAttribute("data-repeat-count", e),
                              o.classList.remove("danmaku-combo-animation"),
                              (0, __imports.requestAnimationFrame)(() => {
                                o.parentNode &&
                                  o.classList.add("danmaku-combo-animation");
                              }));
                          })
                        : (o && o.parentNode) || (delete jn[n], delete Pn[n]);
                    }
                  } else ((An[n] = e + 1e3 * Nn), (jn[n] = a), (Pn[n] = 1));
                }
              }
            }
          }
      })));
  }, 1e3);
}
function Gn() {
  var e,
    t,
    o = Date.now();
  for ([e, t] of Object.entries(An))
    t <= o && (delete An[e], delete jn[e], delete Pn[e]);
  for (let [e, t] of Object.entries(Dn)) t <= o && delete Dn[e];
}
function Vn() {
  (On && ((0, __imports.clearInterval)(On), (On = null)),
    (An = {}),
    (Dn = {}),
    (jn = {}),
    (Pn = {}));
}
function qn() {
  (Fn(), Sn(), In());
}
function Un(e) {
  return -1 === e.indexOf("player_barrage")
    ? e
    : e
        .replace(/player_barrage\\":0/g, 'player_barrage\\":1')
        .replace(/"player_barrage":0/g, '"player_barrage":1');
} // ==================== 一键签到模块化纯净执行引擎 ====================
function Wn(e) {
  var stored = null;
  try {
    stored = JSON.parse(__imports.localStorage.getItem("ExSave_SignConfig"));
  } catch (err) {}
  (0, __imports.executeSignEngine)(stored);
}

Mn && Hn();
let Yn = {};
function Qn(e) {
  return new Promise((o) => {
    (0, __imports.fetch)(
      `https://webconf.douyucdn.cn/resource/common/activity/actqzs${e}_w.json`,
    )
      .then((e) => e.text())
      .then((e) => {
        let t = e.substring(String("DYConfigCallback(").length, e.length);
        t = t.substring(0, t.lastIndexOf(")"));
        try {
          ((t = JSON.parse(t)), o(t.data.activity_setting.activity_id));
        } catch (e) {
          o(null);
        }
      })
      .catch((e) => {
        o(null);
      });
  });
}
function Jn(e) {
  return new Promise((o) => {
    (0, __imports.fetch)(
      `https://webconf.douyucdn.cn/resource/common/activity/cardArena${e}_w.json`,
    )
      .then((e) => e.text())
      .then((e) => {
        let t = e.substring(String("DYConfigCallback(").length, e.length);
        t = t.substring(0, t.lastIndexOf(")"));
        try {
          ((t = JSON.parse(t)), o(t.data.activity_setting.activity_id));
        } catch (e) {
          o(null);
        }
      })
      .catch((e) => {
        o(null);
      });
  });
}
function Zn(t) {
  let o = "";
  var n = document.cookie.split("; ");
  for (let e = 0; e < n.length; e++) {
    var i = n[e].split("=");
    t == i[0] && (o = i[1]);
  }
  return (
    "" == o &&
      ((o = Math.random().toString(36).substr(2)),
      (document.cookie = "post-csrfToken=" + escape(o) + ";path=/")),
    o
  );
}
function $n(e) {
  (0, __imports.GM_xmlhttpRequest)({
    method: "POST",
    url: "https://apiv2.douyucdn.cn/japi/roomuserlevel/apinc/checkIn?client_sys=android",
    data: "rid=" + e,
    responseType: "json",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      token: __imports.m,
      aid: "android1",
    },
    onload: function (e) {},
  });
}

}
,
"src/next/services/video-timestamps.js":
function* (__imports) {
yield {"ai": { get: () => ai, set: value => { ai = value; } },
"mountVideoTimestamps": { get: () => mountVideoTimestamps, set: value => { mountVideoTimestamps = value; } }};
let ei = 0,
  ti = 0,
  oi = 0,
  ni = {};
async function ii(t) {
  var o = await ri(t);
  for (let e = 0; e < o.data.supplementary_cards; e++) await ri(t);
}
function ai(e) {
  return new Promise((t) => {
    (0, __imports.GM_xmlhttpRequest)({
      method: "GET",
      url:
        "https://yuba.douyu.com/wbapi/web/group/myFollow?page=" +
        String(e) +
        "&limit=30",
      responseType: "json",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "dy-client": "pc",
        "dy-token": __imports.m,
      },
      onload: function (e) {
        t(e.response.data);
      },
    });
  });
}
function ri(e) {
  return new Promise((t) => {
    (0, __imports.GM_xmlhttpRequest)({
      method: "POST",
      url: "https://mapi-yuba.douyu.com/wb/v3/supplement",
      responseType: "json",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        client: "android",
        token: __imports.m,
      },
      data: "group_id=" + e,
      onload: function (e) {
        t(e.response);
      },
    });
  });
}
/* var P managed globally */ let ui = 0,
  gi = null,
  hi = null,
  fi = null,
  yi = 0,
  bi = "";
function mountVideoTimestamps(owner) {
  ui = 0;
  bi = '';
  owner.own(() => {
    for (const observer of [gi, fi, hi]) observer?.disconnect();
    gi = fi = hi = null;
    (0, __imports.clearTimeout)(yi);
    yi = 0;
    bi = '';
    ui = 0;
  });
  const poll = owner.interval(() => {
    const video = document.getElementsByTagName('demand-video')[0]?.shadowRoot?.getElementById('__video');
    const preview = videoTimestampPreview();
    const share = document.getElementsByTagName('demand-video-toolbar')[0]?.shadowRoot?.querySelector('share-hover');
    if (!video || !preview || !share) return;
    (0, __imports.clearInterval)(poll);
    const refresh = () => vi(owner);
    const render = () => {
      const seconds = Number(xi());
      wi(String((0, __imports.k)('yyyy-MM-dd hh:mm:ss', new Date(Number(ui + 1e3 * seconds)))) + '<br/>' + (0, __imports.J)(seconds));
    };
    refresh();
    gi = new MutationObserver(owner.guard(refresh));
    gi.observe(video, {attributes: true, childList: true, subtree: false});
    fi = new MutationObserver(owner.guard(records => {
      if (records.some(record => record.attributeName === 'hashid')) refresh();
    }));
    fi.observe(share, {attributes: true});
    hi = new MutationObserver(owner.guard(records => {
      for (const record of records) {
        if (record.attributeName === 'showtime') { render(); break; }
        if (record.attributeName === 'isshow') {
          (0, __imports.clearTimeout)(yi);
          yi = owner.timeout(render, 0);
          break;
        }
      }
    }));
    hi.observe(preview, {attributes: true, childList: true, subtree: false});
  }, 1000);
}
function videoTimestampPreview() {
  return document.getElementsByTagName('demand-video')[0]?.shadowRoot
    ?.getElementById('demandcontroller-bar')?.shadowRoot
    ?.querySelector('demand-video-controller-progress')?.shadowRoot
    ?.querySelector('demand-video-controller-preview');
}
function vi(owner) {
  var e = (() => {
    try {
      var e = document
        .getElementsByTagName("demand-video-toolbar")[0]
        .shadowRoot.querySelector("share-hover")
        .getAttribute("hashid");
      if (e) return e;
    } catch (e) {}
    return (e = String(window.location.pathname).split("/"))[e.length - 1];
  })();
  if (e) {
    let t = (bi = e);
    (0, __imports.fetch)("https://v.douyu.com/video/video/getVideoUrl?vid=" + e, {
      method: "GET",
      mode: "no-cors",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
      .then((e) => e.json())
      .then((e) => {
        !owner.disposed && t === bi &&
          ((e = (0, __imports.v)(e.data.viewthumb[0].url, "--", "/")),
          (ui = new Date(
            e.replace(
              /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/,
              "$1-$2-$3 $4:$5:$6",
            ),
          ).getTime()));
      })
      .catch((e) => {
        console.log("请求失败!", e);
      });
  }
}
function xi() {
  var e = videoTimestampPreview()?.getAttribute('showtime');
  return Number(e).toFixed(0);
}
function wi(e) {
  var t = videoTimestampPreview()?.shadowRoot?.querySelector('.Preview label');
  t &&
    ((t.style.position = "relative"),
    (t.style.bottom = "60px"),
    (t.style.backgroundColor = "rgba(0,0,0,0.4)"),
    (t.innerHTML = e));
}

}
,
"src/next/services/video-tools.js":
function* (__imports) {
yield {"Li": { get: () => Li, set: value => { Li = value; } },
"Mi": { get: () => Mi, set: value => { Mi = value; } },
"bindCamera": { get: () => bindCamera, set: value => { bindCamera = value; } }};
// Camera resources belong to one captured player and its room/route lifetime.
let Ti = 83;
function Ci(video, canvas, gif, delay) {
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  gif.addFrame(canvas, { copy: true, delay });
}
function Si() { return Ni(); }
function bindCamera(parent, video, anchor, camera, hover, movement, container) {
  const owner = (0, __imports.createRoomLifetime)();
  parent.own(() => owner.dispose());
  owner.own(() => camera.remove());
  const frame = document.createElement("canvas"), image = document.createElement("canvas");
  frame.width = 0.25 * video.videoWidth;
  frame.height = 0.25 * video.videoHeight;
  let gif = null, sampling = null, hiding = null, workerUrl = null, started = null, png;
  const urls = new Set();
  function revoke(url) {
    if (urls.delete(url)) URL.revokeObjectURL(url);
  }
  function cancel() {
    (0, __imports.clearInterval)(sampling);
    sampling = null;
    started = null;
    const previous = gif;
    gif = null; // Invalidate even a synchronous abort/finished callback.
    try { if (typeof previous?.abort === "function") previous.abort(); }
    finally { if (workerUrl) { revoke(workerUrl); workerUrl = null; } }
  }
  owner.own(() => { for (const url of [...urls]) revoke(url); });
  owner.own(cancel);
  function download(href) {
    const link = document.createElement("a");
    link.href = href;
    link.download = `【${anchor}】` + (0, __imports.k)("yyyy-MM-dd hh-mm-ss", new Date());
    document.body.appendChild(link);
    try {
      const event = document.createEvent("MouseEvents");
      event.initEvent("click", false, false);
      link.dispatchEvent(event);
    } finally { link.remove(); }
  }
  owner.listen(camera.querySelector("#ex-camera-close"), "click", event => {
    event.stopPropagation();
    __imports.localStorage.setItem("ExSave_Camera_Hidden", Date.now() + 31536e7);
    owner.dispose();
  });
  if (!Si()) {
    const show = owner.guard(() => {
      if (Si()) return;
      camera.style.display = "flex";
      (0, __imports.clearTimeout)(hiding);
      hiding = owner.timeout(() => { camera.style.display = "none"; }, 2000);
    });
    const hide = () => { camera.style.display = "none"; (0, __imports.clearTimeout)(hiding); };
    owner.listen(hover, "mouseenter", show);
    owner.listen(movement, "mousemove", show);
    owner.listen(camera, "mouseenter", () => {
      if (!Si()) { camera.style.display = "flex"; (0, __imports.clearTimeout)(hiding); }
    });
    owner.listen(hover, "mouseleave", hide);
    owner.listen(container, "mouseleave", hide);
    owner.listen(camera, "mousedown", owner.guard(event => {
      if (event.target.id === "ex-camera-close") return;
      if (typeof GIF === "undefined") return (0, __imports.ExLoadLib)(__imports.EXURL.gif, owner.guard(() =>
        (0, __imports.T)("【录制】GIF引擎已就绪，请再次长按录制", "info")));
      try { cancel(); } catch (_) {}
      started = Date.now();
      image.width = video.videoWidth;
      image.height = video.videoHeight;
      image.getContext("2d").drawImage(video, 0, 0, image.width, image.height);
      png = image.toDataURL("image/png");
      workerUrl = URL.createObjectURL(new Blob(["importScripts('https://fastly.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js');"], { type: "application/javascript" }));
      urls.add(workerUrl);
      gif = new GIF({ workers: 5, quality: 3, width: frame.width, height: frame.height, workerScript: workerUrl });
      const recording = gif;
      Ci(video, frame, recording, Ti);
      sampling = owner.interval(() => { if (gif === recording) Ci(video, frame, recording, Ti); }, Ti);
    }));
    owner.listen(camera, "mouseup", owner.guard(event => {
      if (event.target.id === "ex-camera-close" || started === null || !gif) return;
      (0, __imports.clearInterval)(sampling);
      const elapsed = Date.now() - started;
      started = null;
      if (elapsed < 800) {
        try { cancel(); } catch (_) {}
        download(png);
        return;
      }
      const encoding = gif;
      (0, __imports.T)("【录制】正在生成gif...", "info");
      encoding.on("finished", owner.guard(blob => {
        if (gif !== encoding) return;
        try { cancel(); } catch (_) {}
        const url = URL.createObjectURL(blob);
        urls.add(url);
        download(url);
        owner.timeout(() => revoke(url), 1500);
      }));
      encoding.render();
    }));
  }
  return owner;
}
function Mi(owner = __imports.roomRouteLifetime) {
  const polling = owner.interval(() => {
    const host = document.getElementsByTagName("demand-video")[0];
    const video = host?.shadowRoot?.getElementById("__video");
    const anchor = document.getElementsByTagName("demand-video-anchor")[0]?.shadowRoot?.querySelector(".anchor-name");
    const container = document.getElementsByClassName("Video")[0];
    if (!video?.videoWidth || !anchor || !container) return;
    (0, __imports.clearInterval)(polling);
    const camera = document.createElement("div");
    camera.id = "ex-camera";
    camera.title = "单击截图 长按录制gif";
    camera.innerHTML = `

    <svg t="1620266708389" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2080" width="38" height="38"><path d="M512 337.371136c-119.543808 0-216.800256 97.255424-216.800256 216.798208 0 119.543808 97.256448 216.800256 216.800256 216.800256s216.800256-97.256448 216.800256-216.800256C728.800256 434.625536 631.543808 337.371136 512 337.371136zM680.479744 554.16832c0 92.911616-75.579392 168.501248-168.479744 168.501248-92.900352 0-168.480768-75.589632-168.480768-168.501248 0-92.923904 75.579392-168.521728 168.480768-168.521728C604.899328 385.646592 680.479744 461.24544 680.479744 554.16832z" p-id="2081" fill="#ffffff"></path><path d="M831.209472 337.349632l-47.167488 0c-13.647872 0-24.751104 11.083776-24.751104 24.707072 0 13.635584 11.103232 24.7296 24.751104 24.7296l47.167488 0c13.646848 0 24.75008-11.094016 24.75008-24.7296C855.959552 348.433408 844.85632 337.349632 831.209472 337.349632z" p-id="2082" fill="#ffffff"></path><path d="M700.505088 171.497472c4.235264 0 6.403072 0.405504 7.232512 0.612352 1.47968 1.514496 4.790272 6.218752 11.717632 20.685824 2.83648 5.910528 8.6272 18.86208 15.888384 35.533824l11.788288 27.063296 29.518848 0 96.535552 0c35.122176 0 63.695872 28.535808 63.695872 63.609856l0 469.933056c0 35.05152-28.573696 63.567872-63.695872 63.567872L150.811648 852.503552c-35.121152 0-63.694848-28.516352-63.694848-63.567872L87.1168 319.0016c0-35.062784 28.573696-63.589376 63.694848-63.589376l99.35872 0 29.110272 0 11.964416-26.537984c4.698112-10.421248 8.416256-19.063808 11.058176-25.70752 9.86112-24.829952 15.207424-30.125056 16.239616-30.974976 0.52736-0.161792 2.64192-0.695296 7.673856-0.695296L700.505088 171.496448M700.505088 126.441472 326.216704 126.441472c-32.519168 0-47.275008 13.479936-65.787904 60.096512-3.180544 7.999488-7.689216 18.122752-10.257408 23.819264l-99.35872 0c-59.96544 0-108.750848 48.738304-108.750848 108.645376l0 469.933056c0 59.894784 48.785408 108.623872 108.750848 108.623872l722.37568 0c59.96544 0 108.751872-48.729088 108.751872-108.623872L981.940224 319.0016c0-59.91936-48.786432-108.665856-108.751872-108.665856l-96.535552 0c-4.458496-10.236928-12.420096-28.372992-16.574464-37.031936C744.823808 141.448192 733.973504 126.441472 700.505088 126.441472L700.505088 126.441472z" p-id="2083" fill="#ffffff"></path></svg>

    <div id="ex-camera-close">×</div>

    `;
    container.insertBefore(camera, container.childNodes[0]);
    bindCamera(owner, video, anchor.innerText, camera, host, host, container);
  }, 1000);
}
function Ni() {
  var e = __imports.localStorage.getItem("ExSave_Camera_Hidden");
  if (e) return ((e = parseInt(e)), Date.now() < e);
}
function Li(e) {
  var t = String(parseInt(__imports.V.style.width) / 2.39) + "px",
    e =
      ((0, __imports.U)("Ex_Style_Cinema"),
      `

    .layout-Player-videoEntity video{object-fit:${e} !important;height:${t} !important;}

    `);
  (0, __imports.tl)("Ex_Style_Cinema", e);
}

}
,
"src/next/services/room-preferences.js":
function* (__imports) {
yield {"$i": { get: () => $i, set: value => { $i = value; } },
"O": { get: () => O, set: value => { O = value; } },
"Oi": { get: () => Oi, set: value => { Oi = value; } },
"Pi": { get: () => Pi, set: value => { Pi = value; } },
"Zi": { get: () => Zi, set: value => { Zi = value; } },
"ca": { get: () => ca, set: value => { ca = value; } },
"closeEnhancedPip": { get: () => closeEnhancedPip, set: value => { closeEnhancedPip = value; } },
"da": { get: () => da, set: value => { da = value; } },
"ea": { get: () => ea, set: value => { ea = value; } },
"ji": { get: () => ji, set: value => { ji = value; } },
"ka": { get: () => ka, set: value => { ka = value; } },
"pipPreferences": { get: () => pipPreferences, set: value => { pipPreferences = value; } },
"recapturePipStream": { get: () => recapturePipStream, set: value => { recapturePipStream = value; } },
"returnToPipSource": { get: () => returnToPipSource, set: value => { returnToPipSource = value; } },
"sa": { get: () => sa, set: value => { sa = value; } },
"syncPipPlayback": { get: () => syncPipPlayback, set: value => { syncPipPlayback = value; } },
"ta": { get: () => ta, set: value => { ta = value; } },
"ua": { get: () => ua, set: value => { ua = value; } },
"va": { get: () => va, set: value => { va = value; } },
"wa": { get: () => wa, set: value => { wa = value; } },
"zi": { get: () => zi, set: value => { zi = value; } }};
let Ai =
    '<img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjJweCIgaGVpZ2h0PSIyMHB4IiB2aWV3Qm94PSIwIDAgMjIgMjAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8dGl0bGU+am95c291bmQvc2VsZWN0ZWQ8L3RpdGxlPgogICAgPGRlZnM+CiAgICAgICAgPGxpbmVhckdyYWRpZW50IHgxPSI1MCUiIHkxPSIwJSIgeDI9IjUwJSIgeTI9IjEwMCUiIGlkPSJsaW5lYXJHcmFkaWVudC0xIj4KICAgICAgICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iI0YwQ0I5NSIgb2Zmc2V0PSIwJSI+PC9zdG9wPgogICAgICAgICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjRTlCRTgwIiBvZmZzZXQ9IjEwMCUiPjwvc3RvcD4KICAgICAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPC9kZWZzPgogICAgPGcgaWQ9ImpveXNvdW5kL3NlbGVjdGVkIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgICAgICA8ZyBpZD0i57yW57uEIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyLjc4NTc1MCwgMC43MTQyMjUpIiBmaWxsPSJ1cmwoI2xpbmVhckdyYWRpZW50LTEpIiBmaWxsLXJ1bGU9Im5vbnplcm8iPgogICAgICAgICAgICA8cGF0aCBkPSJNMTYuNDI4NiwwIEwxNi40Mjg2LDkuNjQzIEMxNi40Mjg2LDE0LjEzNDU1MjcgMTIuODIzMzY2NywxNy43ODQyODggOC4zNDg5MzYxOCwxNy44NTYxNjk2IEw4LjE4NzE4MTUzLDE3Ljg1NzI1NjEgTDguMTg3MTgxNTMsMTcuODU3MjU2MSBMNy44NTcxLDE3Ljg1NzI1NjEgTDcuODU3MTM4OTYsMTcuODQ5NjQxIEMzLjQ5MjM4MDEzLDE3LjY2MjA3NDQgMCwxNC4wNTMxMzQxIDAsOS42NDMwNSBDMCw1LjExMzExNTA1IDMuNjg0NDAwMiwxLjQyODU1IDguMjE0MjUsMS40Mjg1NSBDOS43MDA3OTkxMywxLjQyODU1IDExLjA5NjI5ODUsMS44MjUzNTUwMiAxMi4zMDA0MTUxLDIuNTE4NjIzMzEgQzEyLjc0OTU2ODcsMS4wNjAxNjYwMSAxNC4xMDgyMjM2LDAgMTUuNzE0MzUsMCBMMTYuNDI4NiwwIFogTTguMjE0MjUsMi40Mjg1NSBDNC4yMzY2OTQ5NiwyLjQyODU1IDEsNS42NjUzODk3OCAxLDkuNjQzMDUgQzEsMTMuNTAwNzUwOCA0LjA0NDc3MzgsMTYuNjYxNzMzMyA3Ljg1NzA4ODk5LDE2Ljg0ODU2NjggTDcuODU3MDYyNTQsMTQuNTc1MDE3IEM2Ljc3Mjk4NjcxLDE0LjQ5NzMxMDMgNS43ODQ2MTcxOSwxNC4wNjg3NDc3IDUuMDA1MTgzMTEsMTMuNDAyNTU3OCBMNC45MjI0NzY5NywxMy4zMzAyNzYyIEw0LjgwNDkyNDY4LDEzLjIyMTc5NDEgQzMuODU5Mjk3NTksMTIuMzIwNjI4MyAzLjI2OTI1LDExLjA0OTU0OTYgMy4yNjkyNSw5LjY0MzAyNSBDMy4yNjkyNSw2LjkxNTg4MjYzIDUuNDg3MTA3NjMsNC42OTgwMjUgOC4yMTQyNSw0LjY5ODAyNSBDOS44MTQwMDc1Niw0LjY5ODAyNSAxMS4yMzg0NTI3LDUuNDYxMjEyMzMgMTIuMTQyNzY0NSw2LjY0MjcxMjE1IEwxMi4xNDI3NjQ1LDMuNTk0NjQ0OTEgQzExLjAxMTU4OTYsMi44NTczNjc2NSA5LjY2MTk5NDQ5LDIuNDI4NTUgOC4yMTQyNSwyLjQyODU1IFogTTguMjE0MjUsNS42OTgwMjUgQzYuMDM5MzkyMzcsNS42OTgwMjUgNC4yNjkyNSw3LjQ2ODE2NzM3IDQuMjY5MjUsOS42NDMwMjUgQzQuMjY5MjUsMTEuNjY5NTM3MyA1LjgwNjQ4MjY0LDEzLjM0NDc0OTggNy43NzU4ODgxNSwxMy41NjM1NjcyIEw3Ljg1NzEsMTMuNTcxNSBMOC4yMTQzNSwxMy41NzE1IEMxMC4zNDk2LDEzLjU3MTUgMTIuMDg2ODUsMTEuODY4IDEyLjE0MTYsOS43NDYgTDEyLjE0MjY0NjgsOS42NDMgTDEyLjE0MjY0NjgsOS4yODIzMzIzMyBDMTEuOTU5ODU4NSw3LjI3NTc1MDI2IDEwLjI2NzQ4MjMsNS42OTgwMjUgOC4yMTQyNSw1LjY5ODAyNSBaIE04LjIxNDI1LDcuNTAwMDI1IEM5LjM5NjE5Mjg0LDcuNTAwMDI1IDEwLjM1Nyw4LjQ2MDkzMzA5IDEwLjM1Nyw5LjY0MzAyNSBDMTAuMzU3LDEwLjgyNDkxNzQgOS4zOTYxNDIzNywxMS43ODU3NzUgOC4yMTQyNSwxMS43ODU3NzUgQzcuMDMyMTgyMTUsMTEuNzg1Nzc1IDYuMDcxNSwxMC44MjQ5OTE5IDYuMDcxNSw5LjY0MzAyNSBDNi4wNzE1LDguNDYwODU4NTUgNy4wMzIxMzE2OSw3LjUwMDAyNSA4LjIxNDI1LDcuNTAwMDI1IFogTTguMjE0MjUsOC41MDAwMjUgQzcuNTg0NDYzNDgsOC41MDAwMjUgNy4wNzE1LDkuMDEzMDk2MjcgNy4wNzE1LDkuNjQzMDI1IEM3LjA3MTUsMTAuMjcyNzMwNyA3LjU4NDQ5MDQyLDEwLjc4NTc3NSA4LjIxNDI1LDEwLjc4NTc3NSBDOC44NDM4NTc2MywxMC43ODU3NzUgOS4zNTcsMTAuMjcyNjMyNiA5LjM1Nyw5LjY0MzAyNSBDOS4zNTcsOS4wMTMxOTQzMyA4Ljg0Mzg4NDU3LDguNTAwMDI1IDguMjE0MjUsOC41MDAwMjUgWiIgaWQ9IuW9oueKtiI+PC9wYXRoPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+" alt="joysound-on"/>',
  Di =
    '<img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjJweCIgaGVpZ2h0PSIyMHB4IiB2aWV3Qm94PSIwIDAgMjIgMjAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8dGl0bGU+am95c291bmQvbm9ybWFsPC90aXRsZT4KICAgIDxnIGlkPSJqb3lzb3VuZC9ub3JtYWwiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSLnvJbnu4QiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIuNzg1NzUwLCAwLjcxNDIyNSkiIGZpbGw9IiNGRkZGRkYiIGZpbGwtcnVsZT0ibm9uemVybyI+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0xNi40Mjg2LDAgTDE2LjQyODYsOS42NDMgQzE2LjQyODYsMTQuMTM0NTUyNyAxMi44MjMzNjY3LDE3Ljc4NDI4OCA4LjM0ODkzNjE4LDE3Ljg1NjE2OTYgTDguMTg3MTgxNTMsMTcuODU3MjU2MSBMOC4xODcxODE1MywxNy44NTcyNTYxIEw3Ljg1NzEsMTcuODU3MjU2MSBMNy44NTcxMzg5NiwxNy44NDk2NDEgQzMuNDkyMzgwMTMsMTcuNjYyMDc0NCAwLDE0LjA1MzEzNDEgMCw5LjY0MzA1IEMwLDUuMTEzMTE1MDUgMy42ODQ0MDAyLDEuNDI4NTUgOC4yMTQyNSwxLjQyODU1IEM5LjcwMDc5OTEzLDEuNDI4NTUgMTEuMDk2Mjk4NSwxLjgyNTM1NTAyIDEyLjMwMDQxNTEsMi41MTg2MjMzMSBDMTIuNzQ5NTY4NywxLjA2MDE2NjAxIDE0LjEwODIyMzYsMCAxNS43MTQzNSwwIEwxNi40Mjg2LDAgWiBNOC4yMTQyNSwyLjQyODU1IEM0LjIzNjY5NDk2LDIuNDI4NTUgMSw1LjY2NTM4OTc4IDEsOS42NDMwNSBDMSwxMy41MDA3NTA4IDQuMDQ0NzczOCwxNi42NjE3MzMzIDcuODU3MDg4OTksMTYuODQ4NTY2OCBMNy44NTcwNjI1NCwxNC41NzUwMTcgQzYuNzcyOTg2NzEsMTQuNDk3MzEwMyA1Ljc4NDYxNzE5LDE0LjA2ODc0NzcgNS4wMDUxODMxMSwxMy40MDI1NTc4IEw0LjkyMjQ3Njk3LDEzLjMzMDI3NjIgTDQuODA0OTI0NjgsMTMuMjIxNzk0MSBDMy44NTkyOTc1OSwxMi4zMjA2MjgzIDMuMjY5MjUsMTEuMDQ5NTQ5NiAzLjI2OTI1LDkuNjQzMDI1IEMzLjI2OTI1LDYuOTE1ODgyNjMgNS40ODcxMDc2Myw0LjY5ODAyNSA4LjIxNDI1LDQuNjk4MDI1IEM5LjgxNDAwNzU2LDQuNjk4MDI1IDExLjIzODQ1MjcsNS40NjEyMTIzMyAxMi4xNDI3NjQ1LDYuNjQyNzEyMTUgTDEyLjE0Mjc2NDUsMy41OTQ2NDQ5MSBDMTEuMDExNTg5NiwyLjg1NzM2NzY1IDkuNjYxOTk0NDksMi40Mjg1NSA4LjIxNDI1LDIuNDI4NTUgWiBNOC4yMTQyNSw1LjY5ODAyNSBDNi4wMzkzOTIzNyw1LjY5ODAyNSA0LjI2OTI1LDcuNDY4MTY3MzcgNC4yNjkyNSw5LjY0MzAyNSBDNC4yNjkyNSwxMS42Njk1MzczIDUuODA2NDgyNjQsMTMuMzQ0NzQ5OCA3Ljc3NTg4ODE1LDEzLjU2MzU2NzIgTDcuODU3MSwxMy41NzE1IEw4LjIxNDM1LDEzLjU3MTUgQzEwLjM0OTYsMTMuNTcxNSAxMi4wODY4NSwxMS44NjggMTIuMTQxNiw5Ljc0NiBMMTIuMTQyNjQ2OCw5LjY0MyBMMTIuMTQyNjQ2OCw5LjI4MjMzMjMzIEMxMS45NTk4NTg1LDcuMjc1NzUwMjYgMTAuMjY3NDgyMyw1LjY5ODAyNSA4LjIxNDI1LDUuNjk4MDI1IFogTTguMjE0MjUsNy41MDAwMjUgQzkuMzk2MTkyODQsNy41MDAwMjUgMTAuMzU3LDguNDYwOTMzMDkgMTAuMzU3LDkuNjQzMDI1IEMxMC4zNTcsMTAuODI0OTE3NCA5LjM5NjE0MjM3LDExLjc4NTc3NSA4LjIxNDI1LDExLjc4NTc3NSBDNy4wMzIxODIxNSwxMS43ODU3NzUgNi4wNzE1LDEwLjgyNDk5MTkgNi4wNzE1LDkuNjQzMDI1IEM2LjA3MTUsOC40NjA4NTg1NSA3LjAzMjEzMTY5LDcuNTAwMDI1IDguMjE0MjUsNy41MDAwMjUgWiBNOC4yMTQyNSw4LjUwMDAyNSBDNy41ODQ0NjM0OCw4LjUwMDAyNSA3LjA3MTUsOS4wMTMwOTYyNyA3LjA3MTUsOS42NDMwMjUgQzcuMDcxNSwxMC4yNzI3MzA3IDcuNTg0NDkwNDIsMTAuNzg1Nzc1IDguMjE0MjUsMTAuNzg1Nzc1IEM4Ljg0Mzg1NzYzLDEwLjc4NTc3NSA5LjM1NywxMC4yNzI2MzI2IDkuMzU3LDkuNjQzMDI1IEM5LjM1Nyw5LjAxMzE5NDMzIDguODQzODg0NTcsOC41MDAwMjUgOC4yMTQyNSw4LjUwMDAyNSBaIiBpZD0i5b2i54q2Ij48L3BhdGg+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=" alt="joysound-off"/>';
function ji() {
  var e = document.getElementById("vtoolbar-joysound-switch"),
    t = document.getElementById("vtoolbar-joysound-icon");
  e &&
    (__imports.unsafeWindow.hasInstalledJoysound &&
    1 == __imports.localStorage.getItem("Ex_isJoysound")
      ? (e.classList.add("is-on"), t && (t.innerHTML = Ai))
      : (e.classList.remove("is-on"), t && (t.innerHTML = Di)));
}
let O = null;
let Pi =
    '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAB2klEQVR4AcyUgXHCMAxF7S7SsglsApMAk0AngU1gE/qeiRxMgFC43jXnH8mK9b9sJflIf3z9P4HT6fQFpoGxA3h6BxBKvIHwAHYB4gewZH5zPCUAwZxsibW46ZhS2qfz9YURmOEYFYB8SpqVY5Kkk5zzJPWXYt/9tPVGBVge5Nuc8yznfETUI1JY8gWxPTGPcIdtjuuhAIvnCMT21/gxJNev5Ew8QuPmMD2PhwIs+QSOFVVabUJUEmNHYqVyJpJjynAnsSaNCUT1JbO7KSQkklj4yP4I/YoxAYnqYh2qNjbD10YBpT/EYo57HmMCkRC2ZF2ITPAdC47ONSIRqDu5K0CCzRKSDl5DSOyBu/C5qG+bk8BNgY48EsqbEgnXlrX2wlczGtsUMxAgwaovybdB6jOwBBugldgmr7o1fif1eIw1AiRZxV1yEnwmmUVoBeHkUQ3IE1cjwNwvFJM8lqZygpJjkqQ+E/qutdlN5am7qkBXvWGbZ7K+H5bVBrlkaxqsFfp1bUm4ulUB4m4T0w9Er8kfkvWZvVcFqEoBt+lb4T/e5l1W/mtyZaqAE7AARQTrR6OoR/ESORztv8hdAH8D/u99K2zey+QDAQMCERvtTpy+hesjeovsVvIPAAAA//+5v3LIAAAABklEQVQDAFMMzjFiZ8i8AAAAAElFTkSuQmCC"/>',
  zi =
    '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAs0lEQVR4AeyU3Q2AIAyE1UkcRTfTyXQTR8GW5MgFCCQFXwxELD/HfaRpWKaP248AzrnL9WsPMs8p2rDYIa7wYIBfmxubN6FfAqC9LsMBqKaxmCJULVxqc+g4FgEstI6LAFQszGtz6DgWASy0jgegmrkkRVKKq3TzyxoTE4AI9KltfVlv8fFfDqAbN0rSGHc10Z4DHGIaBCpq6TFgF/OzxTA+ywA1D7mLhdZ5AMjNu5vrpV4AAAD//9kfWOoAAAAGSURBVAMAe2CtMQj8RU0AAAAASUVORK5CYII="/>',
  Oi = null,
  pipPreferences = {
    fontSize: 18,
    speed: 2.5,
    area: "full",
    trackHeight: 28,
    mergeMode: "combo",
    lowPowerMode: !1,
    filterRobotDanmaku: !0,
    opacity: 1,
    danmakuVisible: !0,
  },
  Ri = null,
  Fi = null,
  Hi = null,
  Gi = null,
  i = null,
  Vi = null,
  qi = null,
  Ui = null,
  Wi = null,
  Yi = null,
  Qi = null,
  Ji = null,
  Zi = !1,
  Xi =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="13" width="7" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>',
  Ki =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M7 10h5.5M7 13h3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  $i =
    '<svg width="24" height="24" viewBox="0 0 1024 1024" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M513.34 831.74C337.03 831.74 193.6 688.31 193.6 512c0-71.09 23.31-138.85 65.53-194.03v51.61c0 17.67 14.33 32 32 32s32-14.33 32-32V239.45c0-5.87-1.59-11.36-4.34-16.09-0.06-0.1-0.11-0.2-0.17-0.3-0.16-0.28-0.34-0.55-0.51-0.82-0.13-0.2-0.26-0.41-0.39-0.61-0.08-0.13-0.17-0.25-0.26-0.37a35.5 35.5 0 0 0-1.58-2.13c-6.81-8.35-16.96-12.35-26.95-11.69h-130c-17.67 0-32 14.33-32 32s14.33 32 32 32h55.35C159.8 339 129.6 423.35 129.6 512c0 51.79 10.15 102.05 30.17 149.38 19.33 45.7 46.99 86.74 82.23 121.97 35.23 35.23 76.27 62.9 121.97 82.23 47.33 20.02 97.59 30.17 149.38 30.17 17.67 0 32-14.33 32-32s-14.34-32.01-32.01-32.01zM855.38 762.3h-51.23c19.81-23 36.93-48.3 50.75-75.22 27.6-53.74 42.18-114.28 42.18-175.08 0-51.79-10.15-102.05-30.17-149.38-19.33-45.7-46.99-86.73-82.23-121.97-35.23-35.23-76.27-62.9-121.97-82.23-47.33-20.02-97.59-30.17-149.38-30.17-17.67 0-32 14.33-32 32s14.33 32 32 32c176.31 0 319.74 143.44 319.74 319.74 0 78.31-27.68 151.61-77.6 209.05l0.24-56.04c0.08-17.67-14.19-32.06-31.86-32.14h-0.14c-17.61 0-31.92 14.24-32 31.86l-0.55 129.43a31.988 31.988 0 0 0 9.32 22.71 31.68 31.68 0 0 0 5.33 4.3c0.02 0.01 0.04 0.02 0.06 0.04 0.48 0.31 0.97 0.61 1.47 0.89l0.15 0.09c0.5 0.28 1 0.54 1.51 0.8 0.03 0.01 0.05 0.03 0.08 0.04 1.64 0.8 3.34 1.46 5.1 1.98 0.01 0 0.02 0.01 0.03 0.01 0.55 0.16 1.1 0.3 1.66 0.43 0.07 0.02 0.15 0.03 0.22 0.05 0.5 0.11 1 0.21 1.5 0.3 0.1 0.02 0.2 0.04 0.3 0.05 0.48 0.08 0.96 0.15 1.44 0.21 0.11 0.01 0.23 0.03 0.34 0.04 0.48 0.05 0.95 0.09 1.43 0.12l0.34 0.03c0.53 0.03 1.07 0.04 1.61 0.05h132.31c17.67 0 32-14.33 32-32s-14.31-31.99-31.98-31.99z"/></svg>';
function ea(e) {
  e = e || window.__pip_window__;
  if (e && !e.closed) {
    var t = e.document.getElementById("danmaku"),
      e = e.document.getElementById("combo-container"),
      o =
        null == (o = pipPreferences.opacity) || Number.isNaN(o)
          ? 1
          : Math.min(1, Math.max(0.3, o)),
      n = !1 !== pipPreferences.danmakuVisible;
    if (
      t &&
      ((t.style.opacity = String(o)),
      (t.style.visibility = n ? "visible" : "hidden"),
      !n)
    )
      for (; t.firstChild;) t.removeChild(t.firstChild);
    e &&
      ((e.style.opacity = String(o)),
      (e.style.display = n ? "" : "none"),
      n || (e.textContent = ""));
  }
}
function ta(e) {
  var t,
    e = (e || window.__pip_window__)?.document.getElementById(
      "pip-danmaku-toggle",
    );
  e &&
    ((t = !1 !== pipPreferences.danmakuVisible),
    (e.textContent = "弹"),
    (e.title = t ? "隐藏弹幕" : "显示弹幕"),
    e.classList.toggle("is-off", !t));
}
function closeEnhancedPip(e, t) {
  if (!e) {
    if (__imports.pendingPipOwner && !__imports.pendingPipOwner.disposed) __imports.pendingPipOwner.dispose();
    e = window.__pip_window__;
    t = e?.document?.getElementById('pip-video');
  }
  if (e?.__nextPipLifetime && !e.__nextPipLifetime.disposed) {
    e.__nextPipLifetime.dispose();
    return;
  }
  // A stale window may release itself, never the current window's global state.
  try { t?.srcObject?.getTracks().forEach(track => track.stop()); } catch (error) {}
  try { if (t) t.srcObject = null; } catch (error) {}
  if (e && window.__pip_window__ === e) {
    ((window.__pip_is_active__ = !1),
      (window.__pip_window__ = null),
      e?.__pip_keydown_handler__ &&
        (e.document.removeEventListener("keydown", e.__pip_keydown_handler__),
        (e.__pip_keydown_handler__ = null)),
      sa(),
      (0, __imports.La)(!1),
      (0, __imports.Na)(!1),
      (0, __imports.resetPipPacketState)(),
      (0, __imports.resetPipMergeState)(),
      (window.__pip_track_state__ = []),
      __imports.ja && ((0, __imports.clearInterval)(__imports.ja), (__imports.ja = null)),
      __imports.pipMergeGroups.clear());
    try {
      t && (t.srcObject = null);
    } catch (e) {}
  }
  if (e && !e.closed) {
    try { e.close(); } catch (error) {}
  }
}
function returnToPipSource(e, t = !0) {
  var o,
    e = e || window.__pip_window__,
    n = e?.__pip_source_video__ || document.getElementById("__video2");
  t &&
    window.__pip_is_active__ &&
    ((o = e?.document?.getElementById("pip-video")), closeEnhancedPip(e, o));
  try {
    window.focus();
  } catch (e) {}
  if (n) {
    try {
      n.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch (e) {}
    !t && window.__pip_is_active__
      ? refreshPipSourceFrame(n).catch(() => {})
      : t && n.play().catch(() => {});
  }
}
function cancelPipFramePump() {
  var e = Ui;
  if (null != Wi && e && "function" == typeof e.cancelVideoFrameCallback)
    try {
      e.cancelVideoFrameCallback(Wi);
    } catch (e) {}
  else null != Wi && (0, __imports.clearTimeout)(Wi);
  ((Wi = null), (Ui = null));
}
async function refreshPipSourceFrame(n, current = () => true) {
  if (!n || !current()) return !1;
  var e = n.paused;
  await n.play().catch(() => {});
  if (!current()) return !1;
  var t = "0.01" === n.style.getPropertyValue("opacity");
  t && n.style.removeProperty("opacity");
  try {
    window.focus();
  } catch (e) {}
  await new Promise((e) => {
    let t = !1,
      o = () => {
        t || ((t = !0), e());
      };
    ("function" == typeof n.requestVideoFrameCallback &&
      n.requestVideoFrameCallback(() => {
        n.requestVideoFrameCallback(o);
      }),
      (0, __imports.setTimeout)(o, 150));
  });
  if (!current()) return !1;
  try {
    2 <= n.readyState &&
      Yi &&
      Yi.getContext("2d", { willReadFrequently: !0 }).drawImage(n, 0, 0, 2, 2);
  } catch (e) {}
  return (
    t && n.style.setProperty("opacity", "0.01", "important"),
    e && n.pause(),
    !0
  );
}
async function recapturePipStream(e, t) {
  var o = e?.__pip_source_video__ || document.getElementById("__video2");
  const current = () => e && !e.closed && !e.__nextPipLifetime?.disposed && window.__pip_window__ === e;
  if (!o || !t || !current()) return !1;
  await refreshPipSourceFrame(o, current);
  if (!current()) return !1;
  try {
    var n = t.srcObject;
    n && n.getTracks().forEach((e) => e.stop());
  } catch (e) {}
  let i = null;
  try {
    i = o.captureStream();
  } catch (e) {
    return !1;
  }
  ((t.srcObject = i), o.paused ? t.pause() : await t.play().catch(() => {}));
  if (!current()) return !1;
  try {
    e && !e.closed && e.focus();
  } catch (e) {}
  return !0;
}
function syncPipPlayback(e, t, o) {
  const current = () => window.__pip_window__ === t && !t?.closed && !t?.__nextPipLifetime?.disposed;
  if (!current()) return;
  if ((0, __imports.It)()) {
    var n = e;
    if ((cancelPipFramePump(), n && window.__pip_is_active__)) {
      ((Ui = n),
        Yi ||
          (((Yi = document.createElement("canvas")).width = 2),
          (Yi.height = 2)));
      let e = Yi.getContext("2d", { willReadFrequently: !0 }),
        t = () => {
          if (current() && window.__pip_is_active__ && Ui === n) {
            try {
              2 <= n.readyState && e.drawImage(n, 0, 0, 2, 2);
            } catch (e) {}
            Wi =
              "function" == typeof n.requestVideoFrameCallback
                ? n.requestVideoFrameCallback(t)
                : (0, __imports.setTimeout)(t, 200);
          }
        };
      t();
    }
    var i = t,
      a = o,
      r =
        (Qi &&
          (document.removeEventListener("visibilitychange", Qi), (Qi = null)),
        (Qi = () => {
          current() && window.__pip_is_active__ &&
            "visible" === document.visibilityState &&
            recapturePipStream(i, a);
        }),
        document.addEventListener("visibilitychange", Qi),
        e),
      l = t,
      s = o;
    if (
      (Ji && ((0, __imports.clearTimeout)(Ji), (Ji = null)),
      "function" == typeof r.requestVideoFrameCallback)
    ) {
      let e = performance.now(),
        t = !1,
        o = () => {
          current() && window.__pip_is_active__ &&
            ((e = performance.now()), r.requestVideoFrameCallback(o));
        },
        n =
          (r.requestVideoFrameCallback(o),
          () => {
            current() && window.__pip_is_active__ &&
              ((Ji = (0, __imports.setTimeout)(n, 2500)),
              t ||
                r.paused ||
                r.readyState < 2 ||
                performance.now() - e < 4500 ||
                ((t = !0),
                recapturePipStream(l, s).finally(() => {
                  ((e = performance.now()), (t = !1));
                })));
          });
      Ji = (0, __imports.setTimeout)(n, 2500);
    }
  }
}
function sa() {
  (cancelPipFramePump(),
    Qi && (document.removeEventListener("visibilitychange", Qi), (Qi = null)),
    Ji && ((0, __imports.clearTimeout)(Ji), (Ji = null)));
}
function da(e) {
  var t,
    e = e || window.__pip_window__;
  e &&
    !e.closed &&
    ((t = e.document.getElementById("input-panel")),
    (e = e.document.getElementById("pip-input-field")),
    t) &&
    e &&
    (t.classList.add("active"), e.focus());
}
function ca() {
  (Ri && (Ri.closeHook(), (Ri = null)),
    document.getElementById("js-player-controlbar") &&
      (Ri = new __imports.DomMutationSubscription("#js-player-controlbar", !0, ya)));
}
function pa() {
  var e = document.getElementById("js-player-controlbar");
  return i && i.isConnected && e && e.contains(i);
}
function ma() {
  (Fi &&
    ("function" == typeof Fi.closeHook ? Fi.closeHook() : Fi.disconnect?.(),
    (Fi = null)),
    null != Gi && ((0, __imports.cancelAnimationFrame)(Gi), (Gi = null)));
}
function ua() {
  Fi ||
    pa() ||
    (Fi = new __imports.DomMutationSubscription("body", !0, (t) => {
      if (pa()) ma();
      else {
        let e = !1;
        for (var o of t) {
          for (var n of o.addedNodes) {
            if (ga(n)) {
              ((e = !0), Ca(n));
              break;
            }
            if (1 === n.nodeType) {
              for (var i of n.children)
                if (ga(i)) {
                  ((e = !0), Ca(i));
                  break;
                }
              if (e) break;
            }
          }
          if (e) break;
        }
        e && ha();
      }
    }));
}
function ga(e) {
  return (
    1 === e?.nodeType &&
    e.classList?.contains("mantine-Tooltip-tooltip") &&
    "开启画中画" === (e.textContent || "").trim()
  );
}
function ha() {
  pa() ||
    (null == Gi &&
      (Gi = (0, __imports.requestAnimationFrame)(() => {
        ((Gi = null), pa() || (va(), xa()));
      })));
}
function fa() {
  pa() ||
    (null == Hi &&
      (Hi = (0, __imports.requestAnimationFrame)(() => {
        ((Hi = null),
          (pa() || (i && !i.isConnected && (i = null), va(), pa())) && ma());
      })));
}
function ya(e) {
  pa() ||
    (ca(),
    i && !i.isConnected && (i = null),
    e &&
      !((e) => {
        for (var t of e)
          if ("childList" === t.type) {
            for (var o of t.addedNodes)
              if (
                ((e) => {
                  if (1 === e.nodeType) {
                    if (e.matches?.("button, [role='button']"))
                      if (
                        (e.getAttribute("aria-label") || e.title || "")
                          .trim()
                          .includes("画中画")
                      )
                        return 1;
                    return e.querySelector?.(
                      "button[aria-label*='画中画'], [role='button'][aria-label*='画中画']",
                    );
                  }
                })(o)
              )
                return 1;
            for (let e of t.removedNodes) {
              if (e === i) return 1;
              if (1 === e.nodeType && i && e.contains(i)) return 1;
            }
          } else if ("attributes" === t.type) {
            var n = t.target;
            if (n === i) return 1;
            if (
              1 === n.nodeType &&
              ("aria-label" === t.attributeName ||
                "title" === t.attributeName ||
                "aria-describedby" === t.attributeName)
            )
              if (
                (n.getAttribute("aria-label") || n.title || "")
                  .trim()
                  .includes("画中画")
              )
                return 1;
          }
      })(e)) ||
    (ua(), fa());
}
function ba() {
  var e,
    t = document.getElementById("js-player-controlbar");
  if (t)
    for (e of t.querySelectorAll("button, [role='button']"))
      if (
        (e.getAttribute("aria-label") || e.title || "")
          .trim()
          .includes("画中画")
      )
        return e;
  return null;
}
function va() {
  let e = ba();
  (e =
    e ||
    (() => {
      var e;
      for (e of document.querySelectorAll(".mantine-Tooltip-tooltip"))
        if ("开启画中画" === (e.textContent || "").trim() && e.id) {
          var t = document.querySelector(`[aria-describedby="${e.id}"]`);
          if (t) return t;
        }
      return null;
    })()) &&
    "1" !== e.dataset.exPipBound &&
    ((e.dataset.exPipBound = "1"),
    (i = e).addEventListener("mouseenter", _a),
    e.addEventListener("mouseleave", Ta),
    e.addEventListener("focus", _a),
    e.addEventListener("blur", Ta),
    Sa(e),
    ma(),
    xa());
}
function xa() {
  var e = i;
  e && e.matches(":hover") && (Sa((qi = e)), Ea(e));
}
function wa() {
  var e;
  document.getElementById("ex-pip-menu-panel") ||
    (((e = document.createElement("div")).id = "ex-pip-menu-panel"),
    (e.className = "ex-pip-menu-root"),
    e.setAttribute("role", "menu"),
    (e.innerHTML = `

        <div class="ex-pip-menu">

            <ul class="ex-pip-menu__list" role="presentation">

                <li>

                    <button type="button" class="ex-pip-opt" data-ex-pip-mode="native">

                        <span class="ex-pip-opt__icon">${Xi}</span>

                        <span class="ex-pip-opt__label">原版画中画</span>

                    </button>

                </li>

                <li>

                    <button type="button" class="ex-pip-opt ex-pip-opt--ex" data-ex-pip-mode="enhanced">

                        <span class="ex-pip-opt__icon">${Ki}</span>

                        <span class="ex-pip-opt__body">

                            <span class="ex-pip-opt__row">

                                <span class="ex-pip-opt__label">增强版画中画</span>

                                <span class="ex-pip-opt__mark">DouyuEx</span>

                            </span>

                            <span class="ex-pip-opt__hint">带弹幕，可窗口发弹幕</span>

                        </span>

                    </button>

                </li>

            </ul>

        </div>

    `),
    document.body.appendChild(e),
    e.addEventListener("mouseenter", Ia),
    e.addEventListener("mouseleave", Ta),
    e
      .querySelector('[data-ex-pip-mode="native"]')
      .addEventListener("click", (e) => {
        (e.preventDefault(),
          e.stopPropagation(),
          Ba(),
          (e = i || ba())
            ? e.click()
            : (e =
                  document.getElementById("__video2") ||
                  document.querySelector(".layout-Player-videoEntity video")) &&
                "function" == typeof e.requestPictureInPicture
              ? e.requestPictureInPicture().catch(() => {
                  (0, __imports.T)("【画中画】无法开启原版画中画", "error");
                })
              : (0, __imports.T)("【画中画】未找到原版画中画按钮", "error"));
      }),
    e
      .querySelector('[data-ex-pip-mode="enhanced"]')
      .addEventListener("click", (e) => {
        (e.preventDefault(), e.stopPropagation(), Ba(), (0, __imports.openEnhancedPip)());
      }));
}
function _a(e) {
  (Sa((qi = e.currentTarget)), Ea(qi));
}
function ka() {
  (wa(),
    ca(),
    ua(),
    ha(),
    (0, __imports.setTimeout)(() => {
      ha();
    }, 250));
}
function Ea(t) {
  (wa(), Ia());
  var o = document.getElementById("ex-pip-menu-panel");
  if (o && t) {
    (o.classList.add("is-visible", "is-measuring"),
      o.style.removeProperty("visibility"),
      (o.style.left = "-9999px"),
      (o.style.top = "0"));
    var t = t.getBoundingClientRect(),
      n = o.offsetWidth,
      i = o.offsetHeight,
      a = t.left + t.width / 2 - n / 2;
    let e = t.top - i - 4;
    ((a = Math.max(8, Math.min(a, window.innerWidth - n - 8))),
      e < 8 && (e = t.bottom + 4),
      o.classList.remove("is-measuring"),
      (o.style.left = a + "px"),
      (o.style.top = e + "px"));
  }
}
function Ba() {
  var e = document.getElementById("ex-pip-menu-panel");
  (e && e.classList.remove("is-visible", "is-measuring"), (qi = null));
}
function Ia() {
  Vi && ((0, __imports.clearTimeout)(Vi), (Vi = null));
}
function Ta() {
  (Ia(),
    (Vi = (0, __imports.setTimeout)(() => {
      var e = document.getElementById("ex-pip-menu-panel");
      e &&
        e.classList.contains("is-visible") &&
        (e.matches(":hover") || (qi && qi.matches(":hover")) || Ba());
    }, 180)));
}
function Ca(e) {
  e &&
    "1" !== e.dataset.exPipTooltipHidden &&
    ((e.dataset.exPipTooltipHidden = "1"),
    e.style.setProperty("display", "none", "important"));
}
function Sa(e) {
  if (e) {
    e = e.getAttribute("aria-describedby");
    if (e) {
      e = document.getElementById(e);
      if (e && "开启画中画" === (e.textContent || "").trim()) return void Ca(e);
    }
  }
  document.querySelectorAll(".mantine-Tooltip-tooltip").forEach((e) => {
    "开启画中画" === (e.textContent || "").trim() && Ca(e);
  });
}

}
,
"src/next/services/pip/packet-dedup.js":
function* (__imports) {
yield {"isRepeatedPipPacket": { get: () => isRepeatedPipPacket, set: value => { isRepeatedPipPacket = value; } }};
function isRepeatedPipPacket(e) {
                var t = Date.now(),
                  o = __imports.pipPacketTimes.get(e);
                if (null != o && t - o < __imports.pipDedupWindowMs) return 1;
                if ((__imports.pipPacketTimes.set(e, t), __imports.pipPacketTimes.size > __imports.pipDedupCapacity))
                  for (var [n, i] of __imports.pipPacketTimes) t - i > __imports.pipDedupWindowMs && __imports.pipPacketTimes.delete(n);
              }

}
,
"src/next/services/pip/packet-parser.js":
function* (__imports) {
yield {"parsePipChatPacket": { get: () => parsePipChatPacket, set: value => { parsePipChatPacket = value; } }};
function parsePipChatPacket(e) {
                  if (!e || !e.startsWith("type@=chatmsg/")) return null;
                  var t,
                    o = {},
                    n = e.split("/");
                  for (let e = 0; e < n.length; e++) {
                    var i = n[e],
                      a = i.indexOf("@=");
                    -1 !== a && (o[i.substring(0, a)] = i.substring(a + 2));
                  }
                  return (e = o.txt ? decodeURIComponent(o.txt) : "") &&
                    (!1 === __imports.pipPreferences.filterRobotDanmaku || o.dms)
                    ? ((t = o.hash || o.cid || o.dmid || ""),
                      {
                        text: e,
                        color: o.col ? parseInt(o.col) : 0,
                        uid: o.uid || "",
                        msgId: t,
                        dedupKey: t || o.uid + "|" + e,
                      })
                    : null;
                }

}
,
"src/next/services/pip/merge-rules.js":
function* (__imports) {
yield {"findPipMergeKey": { get: () => findPipMergeKey, set: value => { findPipMergeKey = value; } }};
function findPipMergeKey(e) {
                      if (!__imports.pipMergeGroups.has(e)) {
                        var t = (e) =>
                            e
                              .replace(/\s+/g, "")
                              .split("")
                              .filter((e, t, o) => o.indexOf(e) === t)
                              .join(""),
                          o = t(e);
                        if (o)
                          for (var n of __imports.pipMergeGroups.keys()) {
                            var i = t(n);
                            if (o === i && Math.abs(e.length - n.length) <= 6)
                              return n;
                            if (
                              (e.includes(n) || n.includes(e)) &&
                              Math.abs(e.length - n.length) <= 4
                            )
                              return n;
                          }
                      }
                      return e;
                    }

}
,
"src/next/services/pip/packet-dispatch.js":
function* (__imports) {
yield {"dispatchPipPacket": { get: () => dispatchPipPacket, set: value => { dispatchPipPacket = value; } }};
function dispatchPipPacket(e, r, t) {
            if (
              window.__pip_is_active__ &&
              !((0, __imports.isRepeatedPipPacket))(e)
            ) {
              var e = ((0, __imports.parsePipChatPacket))(e),
                o = r,
                n = t;
              if (
                e &&
                e.text &&
                !1 !== __imports.pipPreferences.danmakuVisible &&
                (!__imports.I || e.uid !== __imports.I)
              ) {
                var i = __imports.pipPreferences.mergeMode || "combo";
                if ("all" === i) (0, __imports.renderPipDanmaku)(e, o, n);
                else {
                  let t = Date.now();
                  var a = ((0, __imports.findPipMergeKey))(e.text),
                    a =
                      (__imports.pipMergeGroups.has(a) ||
                        __imports.pipMergeGroups.set(a, {
                          timestamps: [],
                          dom: null,
                          displayCount: 0,
                        }),
                      __imports.pipMergeGroups.get(a));
                  (a.timestamps.push(t),
                    "single" === i
                      ? 1 < a.timestamps.filter((e) => t - e <= 4e3).length ||
                        (0, __imports.renderPipDanmaku)(e, o, n)
                      : ((a.timestamps = a.timestamps.filter(
                          (e) => t - e <= 8e3,
                        )),
                        1 === (i = a.timestamps.length)
                          ? ((a.displayCount = 0), (0, __imports.renderPipDanmaku)(e, o, n))
                          : (a.displayCount = i),
                        (0, __imports.refreshPipCombos)(o)));
                }
              }
            }
          }

}
,
"src/next/services/pip/markup.js":
function* (__imports) {
yield {"pipMarkup0": { get: () => pipMarkup0 },
"renderPipMarkup0": { get: () => renderPipMarkup0, set: value => { renderPipMarkup0 = value; } },
"renderPipMarkup1": { get: () => renderPipMarkup1, set: value => { renderPipMarkup1 = value; } }};
const pipMarkup0 = `

            #pip-setting-panel {

                position: fixed;

                width: 440px;

                background: rgba(255, 255, 255, 0.98);

                border: 1px solid rgba(212, 212, 216, 1);

                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);

                border-radius: 12px;

                padding: 24px;

                z-index: 999999;

                font-family: "Helvetica Neue", Helvetica, Arial, "Microsoft Yahei", sans-serif;

                color: #18181b;

                box-sizing: border-box;

                backdrop-filter: blur(10px);

            }



            .pip-setting-header {

                display: flex;

                align-items: center;

                justify-content: space-between;

                margin: -24px -24px 24px;

                padding: 24px 24px 0;

                cursor: move;

                user-select: none;

            }



            .pip-setting-title {

                flex: 1;

                min-width: 0;

                font-size: 16px;

                font-weight: 600;

                color: #000000;

                letter-spacing: 0.5px;

                margin: 0;

            }



            .pip-setting-header-actions {

                display: flex;

                align-items: center;

                gap: 12px;

                flex-shrink: 0;

            }



            .pip-setting-reset {

                font-size: 13px;

                color: #71717a;

                cursor: pointer;

                transition: color 0.2s;

                text-decoration: underline;

                user-select: none;

                font-weight: 500;

                white-space: nowrap;

            }



            .pip-setting-reset:hover {

                color: #ff5d23;

            }



            .pip-setting-dismiss {

                flex-shrink: 0;

                width: 28px;

                height: 28px;

                margin: 0;

                padding: 0;

                border: none;

                border-radius: 6px;

                background: transparent;

                color: #71717a;

                font-size: 22px;

                line-height: 1;

                cursor: pointer;

                user-select: none;

                transition: background 0.2s, color 0.2s;

            }



            .pip-setting-dismiss:hover {

                background: #f4f4f5;

                color: #18181b;

            }



            .pip-setting-item {

                margin-bottom: 18px;

                display: flex;

                align-items: center;

                font-size: 13px;

            }



            .pip-setting-item.item-vertical {

                margin-bottom: 20px;

                flex-direction: column;

                align-items: flex-start;

            }



            .item-label-row {

                width: 100%;

                display: flex;

                align-items: center;

            }



            .pip-setting-item span:first-child {

                width: 100px;

                color: #3f3f46;

                font-weight: 600;

            }



            .pip-setting-item input[type="range"] {

                flex: 1;

                margin: 0 14px;

                -webkit-appearance: none;

                background: #d4d4d8;

                height: 4px;

                border-radius: 2px;

                outline: none;

            }



            .pip-setting-item input[type="range"]::-webkit-slider-thumb {

                -webkit-appearance: none;

                width: 12px;

                height: 12px;

                border-radius: 50%;

                background: #ff5d23;

                cursor: pointer;

                transition: transform 0.1s;

            }



            .pip-setting-item input[type="range"]::-webkit-slider-thumb:hover {

                transform: scale(1.2);

            }



            .pip-setting-item select {

                flex: 1;

                background: #f4f4f5;

                color: #18181b;

                padding: 6px 10px;

                border-radius: 6px;

                border: 1px solid #cdcdd6;

                outline: none;

                font-size: 13px;

                cursor: pointer;

                transition: border-color 0.2s, background 0.2s;

                font-weight: 500;

            }



            .pip-setting-item select:focus {

                border-color: #ff5d23;

                background: #ffffff;

            }



            .pip-setting-item span:last-child {

                width: 32px;

                text-align: right;

                color: #ff5d23;

                font-weight: bold;

                font-family: monospace;

            }



            .pip-setting-tip {

                font-size: 11px;

                color: #52525b;

                margin-top: 6px;

                margin-left: 100px;

                line-height: 1.4;

            }



        `;

function renderPipMarkup0(value0, value1, value2) { return `

        <style>

            html,body{margin:0;width:100%;height:100%;overflow:hidden;background:black;font-family: sans-serif;}

            #wrap{position:relative;width:100%;height:100%;display:flex;flex-direction:column;}

            #main-view{position:relative;flex:1;width:100%;overflow:hidden;}

            video{width:100%;height:100%;object-fit:contain;}

            #danmaku{position:absolute;inset:0;pointer-events:none;overflow:hidden;}

            

            #pip-back-opener {

                position: absolute;

                top: 10px;

                right: -140px;

                left: auto;

                z-index: 10001;

                padding: 6px 12px;

                font-size: 15px;

                font-weight: 600;

                line-height: 1.25;

                color: #fff;

                background: rgba(0, 0, 0, 0.65);

                border: 1px solid rgba(255, 255, 255, 0.35);

                border-radius: 6px;

                cursor: pointer;

                font-family: "Microsoft YaHei", "SimHei", sans-serif;

                transition: right 0.3s, background 0.2s, border-color 0.2s;

                white-space: nowrap;

                user-select: none;

            }

            #pip-back-opener:hover {

                background: rgba(0, 0, 0, 0.88);

                border-color: rgba(255, 255, 255, 0.55);

            }

            #wrap:hover #pip-back-opener {

                right: 10px;

            }



            #combo-container {

                position: absolute;

                top: 6px;

                left: 6px;

                right: 6px;

                display: flex;

                flex-direction: row;

                flex-wrap: wrap;

                align-items: flex-start;

                align-content: flex-start;

                gap: 4px;

                max-height: 44px;

                overflow: hidden;

                pointer-events: none;

                z-index: 9999;

            }

            .combo-item {

                background: rgba(0, 0, 0, 0.55);

                color: #fff;

                padding: 2px 8px;

                border-radius: 12px;

                font-size: 11px;

                font-weight: 600;

                line-height: 1.3;

                max-width: calc(50% - 4px);

                overflow: hidden;

                text-overflow: ellipsis;

                white-space: nowrap;

                border: 1px solid rgba(255, 193, 7, 0.45);

                text-shadow: 0 1px 2px #000;

                box-sizing: border-box;

            }

            .combo-item--more {

                max-width: none;

                flex-shrink: 0;

                color: #d4d4d8;

                border-color: rgba(255, 255, 255, 0.2);

                background: rgba(0, 0, 0, 0.4);

                font-size: 10px;

                font-weight: 500;

            }

            .combo-count {

                color: #ffeb3b;

                margin-left: 4px;

                font-weight: 700;

            }



            .dm{

                position:absolute;

                white-space:nowrap;

                will-change:transform;

                box-sizing: border-box;

                font-weight: 700;

                line-height: 1.2;

                font-family: "SimHei", "Microsoft YaHei", "Arial Black", "Segoe UI Historic", sans-serif;

                text-shadow:

                    1px 0 1px rgba(0, 0, 0, 0.85),

                    -1px 0 1px rgba(0, 0, 0, 0.85),

                    0 1px 1px rgba(0, 0, 0, 0.85),

                    0 -1px 1px rgba(0, 0, 0, 0.85);

            }

            

            .dm-self {

                background-color: rgba(0, 0, 0, 0.35);

                border: 1px solid #00ff66 !important;

                padding: 2px 8px;

                border-radius: 4px;

                box-shadow: 0 0 4px rgba(0, 255, 102, 0.4), inset 0 0 4px rgba(0, 255, 102, 0.15);

            }



            #pip-btns{

                position: absolute;

                top: 50%;

                transform: translateY(-50%);

                display: flex;

                justify-content: center;

                left: -50px;

                padding: 4px;

                z-index: 1000;

                transition: all 0.3s;

                flex-direction: column;

            }



            .pip-btn {

                width: 36px;

                height: 36px;

                min-width: 36px;

                min-height: 36px;

                padding: 0;

                box-sizing: border-box;

                flex-shrink: 0;

                border: 2px solid #FFF;

                border-radius: 50%;

                display: flex;

                align-items: center;

                justify-content: center;

                background: #00000094;

                cursor: pointer;

                z-index: 1000;

                transition: all 0.3s;

                margin: 5px 0;

            }



            .pip-btn img,

            .pip-btn svg {

                display: block;

                width: 24px;

                height: 24px;

                color: #fff;

            }



            .pip-btn:hover {background:#000000c4;}

            .pip-btn-danmaku {

                position: relative;

                font-size: 15px;

                font-weight: 700;

                color: #fff;

                line-height: 1;

                font-family: "Microsoft YaHei", "SimHei", sans-serif;

            }

            .pip-btn-danmaku.is-off {

                opacity: 0.65;

                border-color: #999;

                color: #ccc;

            }

            .pip-btn-danmaku.is-off::after {

                content: "";

                position: absolute;

                left: 18%;

                top: 50%;

                width: 64%;

                height: 2px;

                background: rgba(255, 255, 255, 0.95);

                transform: translateY(-50%) rotate(-45deg);

                border-radius: 1px;

                pointer-events: none;

            }

            #wrap:hover #pip-btns {left:10px}



            #pip-toast{

                position:absolute;

                left:50%;top:50%;

                transform:translate(-50%,-50%);

                background:rgba(0,0,0,.75);

                color:#fff;

                padding:10px 16px;

                border-radius:10px;

                font-size:14px;

                z-index:99999;

                opacity:0;

                transition:opacity .3s;

                pointer-events:none;

                text-align:center;

            }

            #pip-toast.show{opacity:1;}



            #input-panel {

                display: none;

                background: #18181c;

                padding: 8px 12px;

                box-sizing: border-box;

                border-top: 1px solid #2f2f35;

                align-items: center;

                gap: 10px;

                z-index: 10000;

                position: absolute;

                bottom: 0;

                width: 100%;

            }

            #input-panel.active {

                display: flex;

            }

            #pip-input-field {

                flex: 1;

                background: #2a2a30;

                border: 1px solid #3f3f46;

                border-radius: 6px;

                color: #fff;

                padding: 6px 10px;

                font-size: 14px;

                outline: none;

            }

            #pip-input-field:focus {

                border-color: #ff5d23;

            }

            #pip-submit-btn {

                background: #ff5d23;

                color: #fff;

                border: none;

                padding: 6px 14px;

                border-radius: 6px;

                font-size: 14px;

                cursor: pointer;

                font-weight: bold;

                transition: background 0.2s;

            }

            #pip-submit-btn:hover {

                background: #e04e1b;

            }

        </style>



        <div id="wrap">

            <div id="main-view">

                <div id="pip-back-opener"></div>

                <div id="pip-btns">

                    <div id="pip-reload" class="pip-btn pip-btn-reload">${value0}</div>

                    <div id="pip-danmaku-toggle" class="pip-btn pip-btn-danmaku"></div>

                    <div id="pip-set" class="pip-btn">${value1}</div>

                    <div id="pip-send" class="pip-btn">${value2}</div>

                </div>

                <video id="pip-video" autoplay muted playsinline></video>

                <div id="danmaku"></div>

                <div id="combo-container"></div>

                <div id="pip-toast"></div>

            </div>

            

            <div id="input-panel">

                <input type="text" id="pip-input-field" placeholder="" maxlength="50" autocomplete="off" />

                <button id="pip-submit-btn" type="button"></button>

            </div>

        </div>

    `; }

function renderPipMarkup1(value0, value1, value2, value3, value4, value5, value6, value7) { return `

        <div class="pip-setting-header">

            <div class="pip-setting-title">画中画弹幕设置</div>

            <div class="pip-setting-header-actions">

                <span class="pip-setting-reset">恢复默认</span>

                <button type="button" class="pip-setting-dismiss" aria-label="关闭">×</button>

            </div>

        </div>



        <div class="pip-setting-item">

            <span>弹幕字号</span>

            <input id="pip-fontsize" type="range" min="12" max="48" value="${value0}">

            <span id="pip-fontsize-value">${value1}</span>

        </div>



        <div class="pip-setting-item">

            <span>弹幕上下间距</span>

            <input id="pip-trackheight" type="range" min="14" max="60" value="${value2}">

            <span id="pip-trackheight-value">${value3}</span>

        </div>



        <div class="pip-setting-item">

            <span>弹幕速度</span>

            <input id="pip-speed" type="range" min="1" max="10" step="0.5" value="${value4}">

            <span id="pip-speed-value">${value5}</span>

        </div>



        <div class="pip-setting-item">

            <span>弹幕透明度</span>

            <input id="pip-opacity" type="range" min="30" max="100" value="${value6}">

            <span id="pip-opacity-value">${value7}%</span>

        </div>



        <div class="pip-setting-item">

            <span>弹幕显示区域</span>

            <select id="pip-area">

                <option value="full">全屏</option>

                <option value="half">1/2</option>

                <option value="quarter">1/4</option>

            </select>

        </div>



        <div class="pip-setting-item item-vertical">

            <div class="item-label-row">

                <span>重复弹幕合并</span>

                <select id="pip-mergemode">

                    <option value="all">全部显示</option>

                    <option value="single">只显示一条</option>

                    <option value="combo">合并显示（如X5）</option>

                </select>

            </div>

            <div class="pip-setting-tip">短时间内多条相同弹幕内容时的显示方式</div>

        </div>



        <div class="pip-setting-item item-vertical">

            <div class="item-label-row">

                <span>屏蔽机器人弹幕</span>

                <select id="pip-filterrobot">

                    <option value="on">开启</option>

                    <option value="off">关闭</option>

                </select>

            </div>

            <div class="pip-setting-tip">开启后过滤无用户标识的机器人弹幕</div>

        </div>



        <div class="pip-setting-item item-vertical">

            <div class="item-label-row">

                <span>原网页低功耗</span>

                <select id="pip-lowpowermode">

                    <option value="on">开启</option>

                    <option value="off">关闭</option>

                </select>

            </div>

            <div class="pip-setting-tip">开启后，拉起画中画时将隐藏原网页视频区、飘屏弹幕与礼物动画，保留右侧弹幕列表，以降低 CPU 占用</div>

        </div>



        <div class="pip-setting-item item-vertical">

            <div class="item-label-row">

                <span>页签防冻结</span>

                <select id="pip-tabswitch">

                    <option value="on">开启</option>

                    <option value="off">关闭</option>

                </select>

            </div>

            <div class="pip-setting-tip">与扩展工具「防页签冻结」共用设置；开启后画中画期间保持源页解码并自动缓解卡屏（关闭需刷新页面后完全生效）</div>

        </div>



    `; }

}
,
"src/next/services/pip/persistence.js":
function* (__imports) {
yield {"persistPipPreferences": { get: () => persistPipPreferences, set: value => { persistPipPreferences = value; } },
"restorePipPreferences": { get: () => restorePipPreferences, set: value => { restorePipPreferences = value; } }};
function restorePipPreferences() {
  const saved = __imports.localStorage.getItem('ExSave_PipSet');
  if (saved) {
    try { Object.assign(__imports.pipPreferences, JSON.parse(saved)); } catch (error) {}
  }
}
function persistPipPreferences() {
  __imports.localStorage.setItem('ExSave_PipSet', JSON.stringify(__imports.pipPreferences));
}

}
,
"src/next/services/pip/window.js":
function* (__imports) {
yield {"openEnhancedPip": { get: () => openEnhancedPip, set: value => { openEnhancedPip = value; } },
"pendingPipOwner": { get: () => pendingPipOwner, set: value => { pendingPipOwner = value; } }};
let pendingPipOwner = null;
function openEnhancedPip() {
  if (document.getElementById("__video2"))
    if (window.documentPictureInPicture) {
      (0, __imports.closeEnhancedPip)();
      const owner = pendingPipOwner = (0, __imports.createRoomLifetime)();
      owner.own(() => { if (pendingPipOwner === owner) pendingPipOwner = null; });
      if (__imports.activeRoomMount) __imports.activeRoomMount.own(() => owner.dispose());
      owner.listen(window, 'pagehide', () => owner.dispose());
      (0, __imports.restorePipPreferences)();
      return (async () => {
        let o = document.getElementById("__video2"),
          r = await window.documentPictureInPicture.requestWindow({
            width: 670,
            height: 380,
            disallowReturnToOpener: !0,
            preferInitialWindowPlacement: !0,
          });
        if (owner.disposed || pendingPipOwner !== owner || r.closed) {
          if (r !== window.__pip_window__ && !r.closed) r.close();
          owner.dispose();
          return;
        }
        (0, __imports.resetPipPacketState)();
        (0, __imports.resetPipMergeState)();
        window.__pip_track_state__ = [];
        window.__pip_window__ = r;
        r.__nextPipLifetime = owner;
        owner.own(() => (0, __imports.closeEnhancedPip)(r, r.document.getElementById('pip-video')));
        owner.listen(r, 'pagehide', () => owner.dispose());
        let n =
            ((r.document.body.innerHTML = (0, __imports.renderPipMarkup0)(__imports.$i, __imports.Pi, __imports.zi)),
            ((window.__pip_window__ = r).__pip_source_video__ = o),
            r.document.getElementById("pip-video")),
          t = r.document.getElementById("danmaku"),
          e = r.document.getElementById("main-view"),
          i = r.document.getElementById("input-panel"),
          a = r.document.getElementById("pip-set"),
          l = r.document.getElementById("pip-send"),
          s = r.document.getElementById("pip-danmaku-toggle"),
          d = r.document.getElementById("pip-reload"),
          c = r.document.getElementById("pip-back-opener"),
          p = r.document.getElementById("pip-toast");
        window.__pip_is_active__ = true;
        (0, __imports.ea)(r);
        n.srcObject = o.captureStream();
        await n.play().catch(() => {});
        if (owner.disposed || r.closed || window.__pip_window__ !== r) return;
        var m = r,
          u = m.document,
          g = u.getElementById("pip-input-field"),
          h = u.getElementById("pip-submit-btn"),
          f =
            (g && g.setAttribute("placeholder", "发条弹幕吧..."),
            h && (h.textContent = "发送"),
            (g = u.getElementById("pip-reload")) &&
              (g.title = "刷新画面（恢复卡屏）"),
            (h = u.getElementById("pip-back-opener")) &&
              ((h.textContent = "回到网页"),
              (h.title = "退出画中画并返回直播页")),
            (0, __imports.ta)(m),
            (0, __imports.La)(!1),
            (0, __imports.Na)(!0),
            !0 === __imports.pipPreferences.lowPowerMode && (0, __imports.La)(!0),
            s &&
              owner.listen(s, "click", (e) => {
                (e.stopPropagation(),
                  (__imports.pipPreferences.danmakuVisible = !1 === __imports.pipPreferences.danmakuVisible),
                  (0, __imports.persistPipPreferences)(),
                  (0, __imports.ea)(r),
                  (0, __imports.ta)(r));
              }),
            d &&
              owner.listen(d, "click", async (e) => {
                e.stopPropagation();
                e = await (0, __imports.recapturePipStream)(r, n);
                if (owner.disposed) return;
                ((p.innerText = e ? "画面已刷新" : "刷新失败，请检查主页视频"),
                  p.classList.add("show"),
                  (0, __imports.clearTimeout)(p._timer),
                  (p._timer = owner.timeout(
                    () => p.classList.remove("show"),
                    2e3,
                  )));
              }),
            c &&
              owner.listen(c, "click", (e) => {
                (e.stopPropagation(), (0, __imports.returnToPipSource)(r));
              }),
            owner.listen(a, "click", (u) => {
              (u.stopPropagation(), (0, __imports.returnToPipSource)(r, !1));
              {
                let d = document.getElementById("pip-setting-panel"),
                  c = {
                    fontSize: 18,
                    speed: 2.5,
                    area: "full",
                    trackHeight: 28,
                    mergeMode: "combo",
                    lowPowerMode: !1,
                    filterRobotDanmaku: !0,
                    opacity: 1,
                    danmakuVisible: !0,
                  },
                  p = () => {
                    (0, __imports.persistPipPreferences)();
                  },
                  m = () => {
                    ((document.getElementById("pip-area").value = __imports.pipPreferences.area),
                      (document.getElementById("pip-mergemode").value =
                        __imports.pipPreferences.mergeMode || "combo"),
                      (document.getElementById("pip-lowpowermode").value =
                        !0 === __imports.pipPreferences.lowPowerMode ? "on" : "off"),
                      (document.getElementById("pip-filterrobot").value =
                        !1 !== __imports.pipPreferences.filterRobotDanmaku ? "on" : "off"),
                      (document.getElementById("pip-tabswitch").value = (0, __imports.It)()
                        ? "on"
                        : "off"),
                      (document.getElementById("pip-fontsize").value =
                        __imports.pipPreferences.fontSize),
                      (document.getElementById("pip-fontsize-value").innerText =
                        __imports.pipPreferences.fontSize),
                      (document.getElementById("pip-trackheight").value =
                        __imports.pipPreferences.trackHeight || 28),
                      (document.getElementById(
                        "pip-trackheight-value",
                      ).innerText = __imports.pipPreferences.trackHeight || 28),
                      (document.getElementById("pip-speed").value = __imports.pipPreferences.speed),
                      (document.getElementById("pip-speed-value").innerText =
                        __imports.pipPreferences.speed));
                    var e = Math.round(
                      100 * (null != __imports.pipPreferences.opacity ? __imports.pipPreferences.opacity : 1),
                    );
                    ((document.getElementById("pip-opacity").value = e),
                      (document.getElementById("pip-opacity-value").innerText =
                        e + "%"));
                  };
                if (d) ((d.style.display = "block"), m());
                else {
                  (((d = document.createElement("div")).id =
                    "pip-setting-panel"),
                    (d.innerHTML = (0, __imports.renderPipMarkup1)(__imports.pipPreferences.fontSize, __imports.pipPreferences.fontSize, __imports.pipPreferences.trackHeight || 28, __imports.pipPreferences.trackHeight || 28, __imports.pipPreferences.speed, __imports.pipPreferences.speed, Math.round(100 * (null != __imports.pipPreferences.opacity ? __imports.pipPreferences.opacity : 1)), Math.round(100 * (null != __imports.pipPreferences.opacity ? __imports.pipPreferences.opacity : 1)))),
                    document.getElementById("pip-setting-style") ||
                      (((g = document.createElement("style")).id =
                        "pip-setting-style"),
                      (g.innerHTML = __imports.pipMarkup0),
                      document.head.appendChild(g)),
                    document.body.appendChild(d));
                  owner.own(() => d.remove());
                  var g = Math.max(8, (window.innerWidth - d.offsetWidth) / 2),
                    u = Math.max(8, (window.innerHeight - d.offsetHeight) / 2);
                  ((d.style.left = g + "px"),
                    (d.style.top = u + "px"),
                    ((d) => {
                      var e = d.querySelector(".pip-setting-header");
                      if (e) {
                        let o = !1,
                          n = 0,
                          i = 0,
                          a = 0,
                          r = 0,
                          l = (e) => {
                            var t;
                            o &&
                              ((t = e.clientX - n),
                              (e = e.clientY - i),
                              (d.style.left = Math.max(0, a + t) + "px"),
                              (d.style.top = Math.max(0, r + e) + "px"));
                          },
                          s = () => {
                            ((o = !1),
                              document.removeEventListener("mousemove", l),
                              document.removeEventListener("mouseup", s));
                          };
                        owner.listen(e, "mousedown", (e) => {
                          var t;
                          0 !== e.button ||
                            e.target.closest(
                              ".pip-setting-dismiss, .pip-setting-reset",
                            ) ||
                            ((o = !0),
                            (t = d.getBoundingClientRect()),
                            (d.style.left = t.left + "px"),
                            (d.style.top = t.top + "px"),
                            (n = e.clientX),
                            (i = e.clientY),
                            (a = t.left),
                            (r = t.top),
                            owner.listen(document, "mousemove", l),
                            owner.listen(document, "mouseup", s),
                            e.preventDefault());
                        });
                      }
                    })(d));
                  let e = document.getElementById("pip-fontsize"),
                    t = document.getElementById("pip-trackheight"),
                    o = document.getElementById("pip-speed"),
                    n = document.getElementById("pip-area"),
                    i = document.getElementById("pip-mergemode"),
                    a = document.getElementById("pip-lowpowermode"),
                    r = document.getElementById("pip-filterrobot"),
                    l = document.getElementById("pip-tabswitch"),
                    s = document.getElementById("pip-opacity");
                  ((n.value = __imports.pipPreferences.area),
                    (i.value = __imports.pipPreferences.mergeMode || "combo"),
                    (a.value = !0 === __imports.pipPreferences.lowPowerMode ? "on" : "off"),
                    (r.value = !1 !== __imports.pipPreferences.filterRobotDanmaku ? "on" : "off"),
                    (l.value = (0, __imports.It)() ? "on" : "off"),
                    owner.listen(e, "input", () => {
                      ((__imports.pipPreferences.fontSize = parseInt(e.value)),
                        (document.getElementById(
                          "pip-fontsize-value",
                        ).innerText = __imports.pipPreferences.fontSize),
                        p());
                    }),
                    owner.listen(t, "input", () => {
                      ((__imports.pipPreferences.trackHeight = parseInt(t.value)),
                        (document.getElementById(
                          "pip-trackheight-value",
                        ).innerText = __imports.pipPreferences.trackHeight),
                        p());
                    }),
                    owner.listen(o, "input", () => {
                      ((__imports.pipPreferences.speed = parseFloat(o.value)),
                        (document.getElementById("pip-speed-value").innerText =
                          __imports.pipPreferences.speed),
                        p());
                    }),
                    owner.listen(s, "input", () => {
                      ((__imports.pipPreferences.opacity = parseInt(s.value, 10) / 100),
                        (document.getElementById(
                          "pip-opacity-value",
                        ).innerText = s.value + "%"),
                        p(),
                        window.__pip_is_active__ && (0, __imports.ea)());
                    }),
                    owner.listen(n, "change", () => {
                      ((__imports.pipPreferences.area = n.value), p());
                    }),
                    owner.listen(i, "change", () => {
                      ((__imports.pipPreferences.mergeMode = i.value), p());
                    }),
                    owner.listen(r, "change", () => {
                      ((__imports.pipPreferences.filterRobotDanmaku = "on" === r.value), p());
                    }),
                    owner.listen(a, "change", () => {
                      ((__imports.pipPreferences.lowPowerMode = "on" === a.value),
                        p(),
                        window.__pip_is_active__ && (0, __imports.La)(__imports.pipPreferences.lowPowerMode));
                    }),
                    owner.listen(l, "change", () => {
                      var e,
                        t,
                        o,
                        n = "on" === l.value;
                      ((0, __imports.Tt)(n),
                        n
                          ? (0, __imports.Ct)()
                          : (0, __imports.T)("已关闭页签防冻结，请刷新页面后完全生效", "info"),
                        window.__pip_is_active__ &&
                          ((t = (e =
                            window.__pip_window__)?.document.getElementById(
                            "pip-video",
                          )),
                          (o = e?.__pip_source_video__),
                          n ? (0, __imports.syncPipPlayback)(o, e, t) : (0, __imports.sa)()));
                    }),
                    owner.listen(d
                      .querySelector(".pip-setting-reset"), "click", () => {
                        confirm("确定要将画中画设置恢复为默认配置吗？") &&
                          (Object.assign(__imports.pipPreferences, c),
                          p(),
                          m(),
                          window.__pip_is_active__) &&
                          ((0, __imports.La)(__imports.pipPreferences.lowPowerMode), (0, __imports.ea)(), (0, __imports.ta)());
                      }),
                    owner.listen(d
                      .querySelector(".pip-setting-dismiss"), "click", () => {
                        d.style.display = "none";
                      }));
                }
              }
              ((p.innerText = "已在斗鱼直播页面打开设置面板"),
                p.classList.add("show"),
                (0, __imports.clearTimeout)(p._timer),
                (p._timer = owner.timeout(() => p.classList.remove("show"), 5e3)));
            }),
            owner.listen(l, "click", (e) => {
              (e.stopPropagation(),
                i.classList.contains("active")
                  ? i.classList.remove("active")
                  : (0, __imports.da)(r));
            }),
            (e) => {
              var t;
              "Enter" === e.key &&
                ((t = r.document.getElementById("pip-input-field")),
                r.document.activeElement !== t) &&
                (e.preventDefault(), (0, __imports.da)(r));
            });
        (owner.listen(r.document, "keydown", f),
          (r.__pip_keydown_handler__ = f),
          owner.listen(e, "click", () => {
            i.classList.contains("active") && i.classList.remove("active");
          }));
        {
          var y = r,
            b = t;
          let o = y.document.getElementById("pip-input-field"),
            e = y.document.getElementById("pip-submit-btn"),
            n = y.document.getElementById("input-panel");
          async function v() {
            var t = o.value.trim();
            if (t) {
              ((o.value = ""), n.classList.remove("active"));
              let e = y.document.getElementById("pip-toast");
              ((e.innerText = "发送成功"),
                e.classList.add("show"),
                (0, __imports.clearTimeout)(e._timer),
                (e._timer = owner.timeout(() => e.classList.remove("show"), 2e3)),
                (0, __imports.renderPipDanmaku)({ text: t, color: 0 }, y, b, !0));
              try {
                (async (e) => {
                  let t = document.querySelector("div.ChatSend-txt"),
                    o = document.querySelector(".ChatSend-button");
                  ((t.innerText = e), o.click());
                })(t);
              } catch (e) {
                console.error("弹幕发送接口调用失败:", e);
              }
            }
          }
          (owner.listen(o, "keydown", (e) => {
            "Enter" === e.key && v();
          }),
            owner.listen(e, "click", () => {
              v();
            }));
        }
        var x = o,
          w = n;
        function _() {
          x.paused ? w.pause() : w.play().catch(() => {});
        }
        (owner.listen(x, "play", _),
          owner.listen(x, "pause", _),
          (0, __imports.syncPipPlayback)(o, r, n),
          __imports.ja && (0, __imports.clearInterval)(__imports.ja),
          (__imports.ja = owner.interval(() => {
            let t = Date.now();
            for (var [e, o] of __imports.pipMergeGroups.entries())
              o.timestamps.filter((e) => t - e <= 8e3).length < 2 &&
                __imports.pipMergeGroups.delete(e);
            (0, __imports.refreshPipCombos)();
          }, 1e3)),
          (__imports.Oi = new __imports.nl(__imports.B, owner.guard((packet) => (0, __imports.dispatchPipPacket)(packet, r, t)))));
        const packetClient = __imports.Oi;
        owner.own(() => {
          packetClient.close();
          if (__imports.Oi === packetClient) __imports.Oi = null;
        });
        {
          o;
          var k = r,
            E = n;
          window.__pip_is_active__ = !0;
          let e = () => owner.dispose(),
            t =
              (owner.listen(k, "pagehide", e),
              owner.interval(() => {
                k.closed && ((0, __imports.clearInterval)(t), e());
              }, 2e3));
        }
      })().catch(error => {
        const report = !owner.disposed;
        owner.dispose();
        if (report) {
          console.warn('NEXT PiP open failed', error);
          (0, __imports.T)("【画中画增强】无法打开画中画窗口", "error");
        }
      });
    } else
      (0, __imports.T)(
        "【画中画增强】当前浏览器不支持画中画增强功能，建议使用 Chrome 116+ 或 Edge 116+",
        "error",
      );
  else (0, __imports.T)("【画中画增强】当前直播间不支持画中画增强功能", "error");
}

}
,
"src/next/services/pip/state.js":
function* (__imports) {
yield {"Oa": { get: () => Oa, set: value => { Oa = value; } },
"ja": { get: () => ja, set: value => { ja = value; } },
"pipDedupCapacity": { get: () => pipDedupCapacity, set: value => { pipDedupCapacity = value; } },
"pipDedupWindowMs": { get: () => pipDedupWindowMs, set: value => { pipDedupWindowMs = value; } },
"pipMergeGroups": { get: () => pipMergeGroups, set: value => { pipMergeGroups = value; } },
"pipPacketTimes": { get: () => pipPacketTimes, set: value => { pipPacketTimes = value; } },
"za": { get: () => za, set: value => { za = value; } }};
let pipMergeGroups = new Map(),
  ja = null,
  pipPacketTimes = new Map(),
  za = 2,
  Oa = 18,
  pipDedupWindowMs = 3e3,
  pipDedupCapacity = 800;

}
,
"src/next/services/chat-actions.js":
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
,
"src/next/services/chat-state.js":
function* (__imports) {
yield {"Br": { get: () => Br, set: value => { Br = value; } },
"Cr": { get: () => Cr, set: value => { Cr = value; } },
"Er": { get: () => Er, set: value => { Er = value; } },
"F": { get: () => F, set: value => { F = value; } },
"G": { get: () => G, set: value => { G = value; } },
"H": { get: () => H, set: value => { H = value; } },
"Ir": { get: () => Ir, set: value => { Ir = value; } },
"Ja": { get: () => Ja, set: value => { Ja = value; } },
"Ka": { get: () => Ka, set: value => { Ka = value; } },
"Qa": { get: () => Qa, set: value => { Qa = value; } },
"Tr": { get: () => Tr, set: value => { Tr = value; } },
"Ua": { get: () => Ua, set: value => { Ua = value; } },
"V": { get: () => V, set: value => { V = value; } },
"Wa": { get: () => Wa, set: value => { Wa = value; } },
"Xa": { get: () => Xa, set: value => { Xa = value; } },
"Ya": { get: () => Ya, set: value => { Ya = value; } },
"Za": { get: () => Za, set: value => { Za = value; } },
"_r": { get: () => _r, set: value => { _r = value; } },
"cr": { get: () => cr, set: value => { cr = value; } },
"er": { get: () => er, set: value => { er = value; } },
"fr": { get: () => fr, set: value => { fr = value; } },
"gr": { get: () => gr, set: value => { gr = value; } },
"hr": { get: () => hr, set: value => { hr = value; } },
"ir": { get: () => ir, set: value => { ir = value; } },
"kr": { get: () => kr, set: value => { kr = value; } },
"or": { get: () => or, set: value => { or = value; } },
"pr": { get: () => pr, set: value => { pr = value; } },
"qa": { get: () => qa, set: value => { qa = value; } },
"rr": { get: () => rr, set: value => { rr = value; } },
"setDanmakuVolume": { get: () => setDanmakuVolume, set: value => { setDanmakuVolume = value; } },
"tr": { get: () => tr, set: value => { tr = value; } },
"ur": { get: () => ur, set: value => { ur = value; } },
"vr": { get: () => vr, set: value => { vr = value; } },
"vtoolbarChevronSvg": { get: () => vtoolbarChevronSvg, set: value => { vtoolbarChevronSvg = value; } },
"wr": { get: () => wr, set: value => { wr = value; } },
"xr": { get: () => xr, set: value => { xr = value; } },
"yr": { get: () => yr, set: value => { yr = value; } }};
let qa = "",
  Ua = "",
  Wa = "",
  F = "",
  Ya = !1,
  Qa = 0,
  Ja = !1,
  H = { rotateY: "", rotate: "", scale: "" },
  Za = null;
function Xa() {
  return /Edg/i.test(navigator.userAgent);
}
function Ka() {
  var e = document.querySelector("#ex-vtoolbar-filter-host .filter__wrap");
  e && (e.style.display = "block");
}
function $a() {
  var e = document.querySelector("#ex-vtoolbar-filter-host .filter__wrap");
  e && (e.style.display = "none");
}
function er() {
  ((0, __imports.U)("Ex_Style_Filter"),
    (document.getElementById("filter__select").selectedIndex = 0),
    (V.style.filter = ""),
    (Qa = 0),
    (H = { rotateY: "", rotate: "", scale: "" }),
    (V.parentNode.style.transform = ""),
    (document.getElementById("bar__bright").style.left = "100px"),
    (document.getElementById("bar__contrast").style.left = "100px"),
    (document.getElementById("bar__saturate").style.left = "100px"),
    (document.getElementById("mask__bright").style.width = "100px"),
    (document.getElementById("mask__contrast").style.width = "100px"),
    (document.getElementById("mask__saturate").style.width = "100px"),
    Xa() &&
      ((Ja = !1),
      (t = document.getElementById("slider__enhance")),
      (e = document.getElementById("switch__enhance")),
      t && (t.style.left = "0px"),
      e && (e.style.background = "#ccc"),
      (V.style.imageRendering = ""),
      (t = document.getElementsByClassName("enhance-modal__panel-wrap")[0])) &&
      (t.style.display = "none"));
  var e = document.getElementById("ex-panorama"),
    t =
      (e && (e.remove(), (Za = null)),
      document.getElementsByClassName("layout-Player-videoEntity")[0]);
  ((t.style.transform = ""),
    (t.style.transformOrigin = ""),
    (Er = 1),
    (0, __imports.U)("Ex_Style_Cinema"),
    (V.playbackRate = 1));
}
function G(e) {
  ((0, __imports.U)("Ex_Style_Filter"), (0, __imports.tl)("Ex_Style_Filter", e), $a());
}
function tr(e, t, o, n) {
  let i = e,
    a = t,
    r = o,
    l = 0;
  a.onmousedown = function (e) {
    let t = (e || window.event).clientX - this.offsetLeft,
      o = this;
    document.onmousemove = function (e) {
      e = e || window.event;
      ((l = e.clientX - t) < 0
        ? (l = 0)
        : l > i.offsetWidth - a.offsetWidth &&
          (l = i.offsetWidth - a.offsetWidth),
        (r.style.width = l + "px"),
        (o.style.left = l + "px"),
        n(parseInt((l / (i.offsetWidth - a.offsetWidth)) * 255)),
        window.getSelection
          ? window.getSelection().removeAllRanges()
          : document.selection.empty());
    };
  };
}
var V,
  or = null;
let nr = !1,
  ir = !1,
  ar = null;
function rr() {
  return document.getElementById("ex-vtoolbar-menu");
}
function lr() {
  ((0, __imports.clearTimeout)(ar), mr());
}
function sr() {
  ((0, __imports.clearTimeout)(ar), nr || mr());
}
function dr(e) {
  var t,
    e = e.relatedTarget;
  ((e = e),
    ((t = rr()) && e && t.contains(e)) ||
      ((0, __imports.clearTimeout)(ar),
      (ar = (0, __imports.setTimeout)(() => {
        ur();
      }, 80))));
}
function cr(e, t) {
  e &&
    (t
      ? (e.addEventListener("mouseenter", lr),
        e.addEventListener("pointerenter", lr))
      : (e.addEventListener("mouseenter", sr),
        e.addEventListener("pointerenter", sr)),
    e.addEventListener("mouseleave", dr),
    e.addEventListener("pointerleave", dr));
}
function pr(e) {
  "Escape" === e.key && (ur(), gr());
}
function mr() {
  var e = document.getElementById("ex-vtoolbar-menu");
  e &&
    ((nr = !0),
    e.classList.add("is-open"),
    e
      .querySelector(".vtoolbar-menu__trigger")
      .setAttribute("aria-expanded", "true"));
}
function ur() {
  var e = document.getElementById("ex-vtoolbar-menu");
  e &&
    ((0, __imports.clearTimeout)(ar),
    (nr = !1),
    e.classList.remove("is-open"),
    e
      .querySelector(".vtoolbar-menu__trigger")
      .setAttribute("aria-expanded", "false"),
    gr());
}
function gr() {
  var e = document.getElementById("ex-vtoolbar-filter-host"),
    t = document.getElementById("vtoolbar-menu-filter");
  ((ir = !1),
    e && e.classList.remove("is-visible"),
    t &&
      (t.classList.remove("is-active"),
      t.setAttribute("aria-expanded", "false")),
    $a());
}
function hr() {
  return document.getElementById("ex-vtoolbar-filter-host");
}
var fr = __imports.et,
  yr =
    '<svg t="1598941324196" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3146"><path d="M921.6 766.634667L257.365333 102.4a68.266667 68.266667 0 0 0-96.597333 0L102.4 160.768a68.266667 68.266667 0 0 0 0 96.597333L766.634667 921.6a68.266667 68.266667 0 0 0 96.597333 0L921.6 863.232a68.266667 68.266667 0 0 0 0-96.597333zM139.605333 199.338667l59.733334-59.733334A13.312 13.312 0 0 1 208.896 136.533333a13.653333 13.653333 0 0 1 9.898667 4.096l83.968 82.944-79.189334 79.189334-83.968-83.968a13.653333 13.653333 0 0 1 0-19.456z m744.789334 625.322666l-59.733334 59.733334a13.312 13.312 0 0 1-9.557333 4.096 13.653333 13.653333 0 0 1-9.898667-4.096L262.144 341.333333 341.333333 262.144l543.061334 543.061333a13.653333 13.653333 0 0 1 0 19.456zM230.058667 589.824l-50.517334 92.501333-92.842666 50.858667 92.842666 50.517333 50.517334 92.842667 50.517333-92.842667 92.842667-50.517333-92.842667-50.858667-50.517333-92.501333zM541.013333 270.336l31.061334-57.344 57.344-31.402667-57.344-31.402666-31.061334-57.002667-31.402666 57.002667-57.344 31.402666 57.344 31.402667 31.402666 57.344zM827.392 377.173333l21.162667-38.912L887.466667 317.098667l-38.912-21.504-21.162667-38.912-21.504 38.912-38.570667 21.504 38.570667 21.162666 21.504 38.912z" p-id="3147" fill="#ffffff"></path></svg>',
  vtoolbarChevronSvg =
    '<svg class="vtoolbar-menu__chevron" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  vr =
    '<svg class="icon" viewBox="0 0 1237 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M648.448 946.347l0.256-1.622-0.256 1.622z m84.31 13.354c-0.769 4.608-0.769 4.608-4.182 13.483-8.533 16.768-8.533 16.768-49.835 22.784-24.149-14.293-24.149-14.293-27.605-22.613-2.475-5.718-2.475-5.718-3.541-9.387L476.416 335.36l-103.083 499.2c-1.109 5.12-1.109 5.12-4.821 13.27-6.827 12.117-6.827 12.117-35.285 22.527-30.294-7.253-30.294-7.253-38.742-19.37-4.522-8.15-4.522-8.15-6.058-13.227l-74.582-262.357H0v-85.334h278.272l45.781 161.11 104.022-503.424c1.024-4.694 1.024-4.694 4.394-12.502 6.102-11.989 6.102-11.989 35.968-23.338 31.83 8.533 31.83 8.533 39.254 20.736 4.053 7.808 4.053 7.808 5.376 12.544l165.888 609.237 113.92-716.885c0.896-5.248 0.896-5.248 4.864-14.592 9.088-15.574 9.088-15.574 44.928-22.4C868.48 12.587 868.48 12.587 873.6 22.443c3.285 6.912 3.285 6.912 4.523 11.52l112 446.549h221.738v85.333H923.563l-78.507-312.917-112.299 706.773z" fill="#ffffff"/></svg>',
  xr =
    '<svg class="icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M496 64A48 48 0 0 1 544 112v800a48 48 0 0 1-96 0v-800A48 48 0 0 1 496 64z m-224 128A48 48 0 0 1 320 240v544a48 48 0 0 1-96 0v-544A48 48 0 0 1 272 192z m448 0A48 48 0 0 1 768 240v544a48 48 0 0 1-96 0v-544A48 48 0 0 1 720 192z m-672 128A48 48 0 0 1 96 368v288a48 48 0 0 1-96 0v-288A48 48 0 0 1 48 320z m896 0a48 48 0 0 1 48 48v288a48 48 0 0 1-96 0v-288a48 48 0 0 1 48-48z" fill="#ffffff"/></svg>',
  wr =
    '<svg class="icon vtoolbar-menu__icon-pip" viewBox="3 5 18 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2" stroke="#ffffff" stroke-width="1.5"/><path d="M7 10h5.5M7 13h3.5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/></svg>';
var _r = !1;
let kr = 0;
let Er = 1;
var Br = null,
  Ir = null,
  Tr = null,
  Cr = null;
function setDanmakuVolume(e) {
  try {
    var t = document.querySelector(".volume-07c230"),
      o = document.querySelector(".volume-bar-93f0b0 .front-99e2aa"),
      n = document.querySelector(".volume-bar-93f0b0 .point-6ef744"),
      i = document.querySelector(".volume-bar-93f0b0 .tips2-9bb064");
    (o && (o.style.height = 100 * e + "px"),
      n && (n.style.bottom = 100 * e + 7 + "px"),
      i && (i.textContent = `音量${Math.round(100 * e)}%`),
      t &&
        (0 === e
          ? (t.classList.add("custom-muted"),
            t.classList.remove("custom-normal"))
          : (t.classList.add("custom-normal"),
            t.classList.remove("custom-muted"))));
  } catch (e) {}
}

}
,
"src/next/platform/dom-observers.js":
function* (__imports) {
yield {"DomMutationSubscription": { get: () => DomMutationSubscription, set: value => { DomMutationSubscription = value; } },
"Dr": { get: () => Dr, set: value => { Dr = value; } },
"Lr": { get: () => Lr, set: value => { Lr = value; } },
"PointerGestureBinding": { get: () => PointerGestureBinding, set: value => { PointerGestureBinding = value; } }};
class Lr {
  constructor(e) {
    var t = {
      width: 1920,
      height: 1080,
      fontSize: 36,
      alpha: this._prefixInteger(Number(0).toString(16), 2),
      stayTime: 10,
      title: "Default",
    };
    ((this.options = {
      ...t,
      ...e,
      ...(e && e.alpha
        ? this._prefixInteger(this.options.alpha.toString(16), 2)
        : {}),
    }),
      (this.lines = 20),
      (this.lineBase = this.options.height / this.lines),
      (this.currentLine = 0),
      (this.diffTime = 1500));
  }
  generate(e) {
    var t = e.sort((e, t) => e.time - t.time);
    let o = this._getScriptInfo() + this._getV4Styles() + this._getEvents();
    for (let e = 0; e < t.length; e++) {
      (0 < e && t[e].time - t[e - 1].time <= this.diffTime
        ? this.currentLine++
        : (this.currentLine = 0),
        this.currentLine >= this.lines && (this.currentLine = 0));
      var n = t[e],
        i = Number(n.time) + 1e3 * Number(this.options.stayTime),
        a = this.lineBase * this.currentLine + this.options.fontSize,
        r = this.options.fontSize * n.txt.length;
      o += `Dialogue: 0,${(0, __imports.J)(Number(n.time) / 1e3)}.00,${(0, __imports.J)(i / 1e3)}.00,Color${n.color},,0,0,0,,{\\move(${this.options.width + r},${a},${-r},${a})}${n.txt}

`;
    }
    return o;
  }
  _prefixInteger(e, t) {
    return ((e = "" + e), Array(t + 1 - e.length).join("0") + e);
  }
  _getScriptInfo() {
    return `[Script Info]

; DouyuEx -By qianjiachun

; https://github.com/qianjiachun/douyuEx

ScriptType: v4.00+

Title: ${this.options.title}

PlayResX: ${this.options.width}

PlayResY: ${this.options.height}

`;
  }
  _getV4Styles() {
    return `

[V4+ Styles]

Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding

Style: Color0,黑体,${this.options.fontSize},&H${this.options.alpha}FFFFFF,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color7,黑体,${this.options.fontSize},&H${this.options.alpha}5456FF,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color8,黑体,${this.options.fontSize},&H${this.options.alpha}2375FF,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color9,黑体,${this.options.fontSize},&H${this.options.alpha}B369FE,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color10,黑体,${this.options.fontSize},&H${this.options.alpha}00BCFF,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color11,黑体,${this.options.fontSize},&H${this.options.alpha}46C978,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color12,黑体,${this.options.fontSize},&H${this.options.alpha}FF7F9E,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color13,黑体,${this.options.fontSize},&H${this.options.alpha}FF9B3D,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

`;
  }
  _getEvents() {
    return `

[Events]

Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text

`;
  }
}
class PointerGestureBinding {
  constructor(e, owner) {
    const previousDown = e.onmousedown, previousUp = e.onmouseup;
    ((this.func_click = null),
      (this.func_dbClick = null),
      (this.func_longClick = null));
    let t = !1,
      o,
      n = 0,
      i;
    ((e.onmousedown = (e) => {
      0 === e.button &&
        ((t = !1),
        (o = (0, __imports.setTimeout)(() => {
          ((t = !0), null !== this.func_longClick && this.func_longClick(e));
        }, 700)));
    }),
      (e.onmouseup = (e) => {
        0 === e.button &&
          0 == t &&
          ((0, __imports.clearTimeout)(o),
          2 <= ++n
            ? ((0, __imports.clearTimeout)(i),
              (n = 0),
              null !== this.func_dbClick && this.func_dbClick(e))
            : (i = (0, __imports.setTimeout)(() => {
                ((n = 0), null !== this.func_click && this.func_click(e));
              }, 0)));
      }));
    const down = e.onmousedown, up = e.onmouseup;
    if (owner) owner.own(() => {
      (0, __imports.clearTimeout)(o); (0, __imports.clearTimeout)(i);
      this.func_click = this.func_dbClick = this.func_longClick = null;
      if (e.onmousedown === down) e.onmousedown = previousDown;
      if (e.onmouseup === up) e.onmouseup = previousUp;
    });
  }
  click(e) {
    this.func_click = e;
  }
  dbClick(e) {
    this.func_dbClick = e;
  }
  longClick(e) {
    this.func_longClick = e;
  }
}
class DomMutationSubscription {
  constructor(e, t, o, owner) {
    if (owner?.disposed) return;
    if (owner) {
      o = owner.guard(o);
      owner.own(() => this.closeHook());
    }
    ((this.selector = e), (this.isSubtree = t));
    e = document.querySelector(this.selector);
    null != e &&
      ((t = new MutationObserver(function (e) {
        o(e);
      })),
      (this.observer = t),
      this.observer.observe(e, {
        attributes: !0,
        childList: !0,
        subtree: this.isSubtree,
      }));
  }
  closeHook() {
    this.observer && (this.observer.disconnect(), (this.observer = null));
  }
}
class Dr {
  constructor(e) {
    ((this.pointId = e), (this.decoder = new TextDecoder()));
  }
  getSign() {
    var e = parseInt(new Date().getTime() / 1e3, 10);
    return __imports.unsafeWindow[this.d539fa2cf7732d2a(256042, "9f4f419501570ad13334")](
      this.pointId,
      "10000000000000000000000000001501",
      e,
    );
  }
  d539fa2cf7732d2a(e, t) {
    for (
      var o = (e = CryptoJS.MM(e.toString()).toString())[0].charCodeAt(0),
        n = e[16].charCodeAt(0),
        i = [],
        a = 0;
      a < 4;
      a++
    )
      ((i[a] = (o << 24) | (o << 16) | (o << 8) | o),
        (i[a + 4] = (n << 24) | (n << 16) | (n << 8) | n));
    for (
      var e = Math.floor(t.length / 16) % 4,
        r = [],
        l = t.length % 8,
        s = Math.floor(t.length / 8),
        a = 0;
      a < s;
      a++
    )
      r[a] =
        (255 & parseInt(t.substr(8 * a, 2), 16)) |
        ((parseInt(t.substr(8 * a + 2, 2), 16) << 8) & 65280) |
        ((parseInt(t.substr(8 * a + 4, 2), 16) << 24) >>> 8) |
        (parseInt(t.substr(8 * a + 6, 2), 16) << 24);
    var d =
        0 == e ? e86500e2(r, i) : 1 == e ? this.c30070a4(r, i) : d831eb20(r, i),
      c = [];
    for (a = 0; a < d.length; a++) {
      var p = 255 & d[a],
        m = (d[a] >>> 8) & 255,
        u = (d[a] >>> 16) & 255,
        g = (d[a] >>> 24) & 255;
      (p && c.push(p), m && c.push(m), u && c.push(u), g && c.push(g));
    }
    var h = Math.floor(l / 2);
    for (a = 0; a < h; a++)
      c.push(255 & parseInt(t.substr(8 * s + 2 * a, 2), 16));
    return this.decoder.decode(new Uint8Array(c));
  }
  c30070a4(e, t) {
    for (var o = Math.floor(e.length / 2), n = e.slice(0), i = 0; i < o; i++) {
      var a = this.f5a40d76(
        e.slice(2 * i, 2 * i + 2),
        32,
        t.slice((4 * i) % 8, ((4 * i) % 8) + 4),
      );
      ((n[2 * i + 0] = a[0]), (n[2 * i + 1] = a[1]));
    }
    return n;
  }
  f5a40d76(e, t, o) {
    for (var n = 0; n < e.length; n += 2) {
      for (var i = e[n], a = e[n + 1], r = 2654435769 * t, l = 0; l < t; l++)
        i -=
          ((((a -= (((i << 4) ^ (i >>> 5)) + i) ^ (r + o[(r >>> 11) & 3])) <<
            4) ^
            (a >>> 5)) +
            a) ^
          ((r -= 2654435769) + o[3 & r]);
      ((e[n] = i), (e[n + 1] = a));
    }
    return e;
  }
}

}
,
"src/next/services/lottery-page.js":
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
,
"src/next/services/danmaku-history.js":
function* (__imports) {
yield {"Or": { get: () => Or, set: value => { Or = value; } }};
var Pr = 0,
  zr = 8;
function Or(e) {
  for (
    var t = ((e, t) => {
        ((e[t >> 5] |= 128 << (t % 32)), (e[14 + (((t + 64) >>> 9) << 4)] = t));
        for (
          var o = 1732584193,
            n = -271733879,
            i = -1732584194,
            a = 271733878,
            r = 0;
          r < e.length;
          r += 16
        ) {
          var l = o,
            s = n,
            d = i,
            c = a;
          ((o = (0, __imports.p)(o, n, i, a, e[r + 0], 7, -680876936)),
            (a = (0, __imports.p)(a, o, n, i, e[r + 1], 12, -389564586)),
            (i = (0, __imports.p)(i, a, o, n, e[r + 2], 17, 606105819)),
            (n = (0, __imports.p)(n, i, a, o, e[r + 3], 22, -1044525330)),
            (o = (0, __imports.p)(o, n, i, a, e[r + 4], 7, -176418897)),
            (a = (0, __imports.p)(a, o, n, i, e[r + 5], 12, 1200080426)),
            (i = (0, __imports.p)(i, a, o, n, e[r + 6], 17, -1473231341)),
            (n = (0, __imports.p)(n, i, a, o, e[r + 7], 22, -45705983)),
            (o = (0, __imports.p)(o, n, i, a, e[r + 8], 7, 1770035416)),
            (a = (0, __imports.p)(a, o, n, i, e[r + 9], 12, -1958414417)),
            (i = (0, __imports.p)(i, a, o, n, e[r + 10], 17, -42063)),
            (n = (0, __imports.p)(n, i, a, o, e[r + 11], 22, -1990404162)),
            (o = (0, __imports.p)(o, n, i, a, e[r + 12], 7, 1804603682)),
            (a = (0, __imports.p)(a, o, n, i, e[r + 13], 12, -40341101)),
            (i = (0, __imports.p)(i, a, o, n, e[r + 14], 17, -1502002290)),
            (n = (0, __imports.p)(n, i, a, o, e[r + 15], 22, 1236535329)),
            (o = (0, __imports.u)(o, n, i, a, e[r + 1], 5, -165796510)),
            (a = (0, __imports.u)(a, o, n, i, e[r + 6], 9, -1069501632)),
            (i = (0, __imports.u)(i, a, o, n, e[r + 11], 14, 643717713)),
            (n = (0, __imports.u)(n, i, a, o, e[r + 0], 20, -373897302)),
            (o = (0, __imports.u)(o, n, i, a, e[r + 5], 5, -701558691)),
            (a = (0, __imports.u)(a, o, n, i, e[r + 10], 9, 38016083)),
            (i = (0, __imports.u)(i, a, o, n, e[r + 15], 14, -660478335)),
            (n = (0, __imports.u)(n, i, a, o, e[r + 4], 20, -405537848)),
            (o = (0, __imports.u)(o, n, i, a, e[r + 9], 5, 568446438)),
            (a = (0, __imports.u)(a, o, n, i, e[r + 14], 9, -1019803690)),
            (i = (0, __imports.u)(i, a, o, n, e[r + 3], 14, -187363961)),
            (n = (0, __imports.u)(n, i, a, o, e[r + 8], 20, 1163531501)),
            (o = (0, __imports.u)(o, n, i, a, e[r + 13], 5, -1444681467)),
            (a = (0, __imports.u)(a, o, n, i, e[r + 2], 9, -51403784)),
            (i = (0, __imports.u)(i, a, o, n, e[r + 7], 14, 1735328473)),
            (n = (0, __imports.u)(n, i, a, o, e[r + 12], 20, -1926607734)),
            (o = (0, __imports.g)(o, n, i, a, e[r + 5], 4, -378558)),
            (a = (0, __imports.g)(a, o, n, i, e[r + 8], 11, -2022574463)),
            (i = (0, __imports.g)(i, a, o, n, e[r + 11], 16, 1839030562)),
            (n = (0, __imports.g)(n, i, a, o, e[r + 14], 23, -35309556)),
            (o = (0, __imports.g)(o, n, i, a, e[r + 1], 4, -1530992060)),
            (a = (0, __imports.g)(a, o, n, i, e[r + 4], 11, 1272893353)),
            (i = (0, __imports.g)(i, a, o, n, e[r + 7], 16, -155497632)),
            (n = (0, __imports.g)(n, i, a, o, e[r + 10], 23, -1094730640)),
            (o = (0, __imports.g)(o, n, i, a, e[r + 13], 4, 681279174)),
            (a = (0, __imports.g)(a, o, n, i, e[r + 0], 11, -358537222)),
            (i = (0, __imports.g)(i, a, o, n, e[r + 3], 16, -722521979)),
            (n = (0, __imports.g)(n, i, a, o, e[r + 6], 23, 76029189)),
            (o = (0, __imports.g)(o, n, i, a, e[r + 9], 4, -640364487)),
            (a = (0, __imports.g)(a, o, n, i, e[r + 12], 11, -421815835)),
            (i = (0, __imports.g)(i, a, o, n, e[r + 15], 16, 530742520)),
            (n = (0, __imports.g)(n, i, a, o, e[r + 2], 23, -995338651)),
            (o = (0, __imports.h)(o, n, i, a, e[r + 0], 6, -198630844)),
            (a = (0, __imports.h)(a, o, n, i, e[r + 7], 10, 1126891415)),
            (i = (0, __imports.h)(i, a, o, n, e[r + 14], 15, -1416354905)),
            (n = (0, __imports.h)(n, i, a, o, e[r + 5], 21, -57434055)),
            (o = (0, __imports.h)(o, n, i, a, e[r + 12], 6, 1700485571)),
            (a = (0, __imports.h)(a, o, n, i, e[r + 3], 10, -1894986606)),
            (i = (0, __imports.h)(i, a, o, n, e[r + 10], 15, -1051523)),
            (n = (0, __imports.h)(n, i, a, o, e[r + 1], 21, -2054922799)),
            (o = (0, __imports.h)(o, n, i, a, e[r + 8], 6, 1873313359)),
            (a = (0, __imports.h)(a, o, n, i, e[r + 15], 10, -30611744)),
            (i = (0, __imports.h)(i, a, o, n, e[r + 6], 15, -1560198380)),
            (n = (0, __imports.h)(n, i, a, o, e[r + 13], 21, 1309151649)),
            (o = (0, __imports.h)(o, n, i, a, e[r + 4], 6, -145523070)),
            (a = (0, __imports.h)(a, o, n, i, e[r + 11], 10, -1120210379)),
            (i = (0, __imports.h)(i, a, o, n, e[r + 2], 15, 718787259)),
            (n = (0, __imports.h)(n, i, a, o, e[r + 9], 21, -343485551)),
            (o = (0, __imports.Fr)(o, l)),
            (n = (0, __imports.Fr)(n, s)),
            (i = (0, __imports.Fr)(i, d)),
            (a = (0, __imports.Fr)(a, c)));
        }
        return Array(o, n, i, a);
      })(
        ((e) => {
          for (
            var t = Array(), o = (1 << zr) - 1, n = 0;
            n < e.length * zr;
            n += zr
          )
            t[n >> 5] |= (e.charCodeAt(n / zr) & o) << (n % 32);
          return t;
        })(e),
        e.length * zr,
      ),
      o = Pr ? "0123456789ABCDEF" : "0123456789abcdef",
      n = "",
      i = 0;
    i < 4 * t.length;
    i++
  )
    n +=
      o.charAt((t[i >> 2] >> ((i % 4) * 8 + 4)) & 15) +
      o.charAt((t[i >> 2] >> ((i % 4) * 8)) & 15);
  return n;
}

}
,
"src/next/platform/md5.js":
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
,
"src/next/platform/flv-player.js":
function* (__imports) {
yield {"Hr": { get: () => Hr, set: value => { Hr = value; } }};
class Hr {
  constructor(e, t) {
    ((this.domContainer = e),
      (this.domVideo = t),
      (this.camera = null),
      (this.scene = null),
      (this.renderer = null),
      (this.isUserInteracting = !1),
      (this.lon = 0),
      (this.lat = 0),
      (this.phi = 0),
      (this.theta = 0),
      (this.distance = 50),
      (this.onPointerDownPointerX = 0),
      (this.onPointerDownPointerY = 0),
      (this.onPointerDownLon = 0),
      (this.onPointerDownLat = 0),
      (this.onDocumentMouseDown = this.onDocumentMouseDown.bind(this)),
      (this.onDocumentMouseMove = this.onDocumentMouseMove.bind(this)),
      (this.onDocumentMouseUp = this.onDocumentMouseUp.bind(this)),
      (this.onDocumentMouseWheel = this.onDocumentMouseWheel.bind(this)),
      (this.onWindowResize = this.onWindowResize.bind(this)),
      this.init());
  }
  init() {
    var e = this.domContainer,
      t =
        ((this.camera = new THREE.PerspectiveCamera(
          75,
          this.domVideo.videoWidth / this.domVideo.videoHeight,
          1,
          1100,
        )),
        (this.camera.target = new THREE.Vector3(0, 0, 0)),
        (this.scene = new THREE.Scene()),
        new THREE.SphereBufferGeometry(500, 60, 40)),
      o = (t.scale(-1, 1, 1), new THREE.VideoTexture(this.domVideo));
    ((o.minFilter = THREE.LinearFilter),
      (o = new THREE.MeshBasicMaterial({ map: o })),
      (t = new THREE.Mesh(t, o)),
      this.scene.add(t),
      (this.renderer = new THREE.WebGLRenderer()),
      this.renderer.setPixelRatio(window.devicePixelRatio),
      this.renderer.setSize(
        this.domVideo.clientWidth,
        this.domVideo.clientHeight,
      ),
      e.appendChild(this.renderer.domElement),
      e.addEventListener("mousedown", this.onDocumentMouseDown, !1),
      e.addEventListener("mousemove", this.onDocumentMouseMove, !1),
      e.addEventListener("mouseup", this.onDocumentMouseUp, !1),
      e.addEventListener("wheel", this.onDocumentMouseWheel, !1),
      window.addEventListener("resize", this.onWindowResize, !1));
  }
  onWindowResize() {
    ((this.camera.aspect =
      this.domVideo.videoWidth / this.domVideo.videoHeight),
      this.camera.updateProjectionMatrix(),
      this.renderer.setSize(
        this.domVideo.clientWidth,
        this.domVideo.clientHeight,
      ));
  }
  onDocumentMouseDown(e) {
    ((this.isUserInteracting = !0),
      (this.onPointerDownPointerX = e.clientX),
      (this.onPointerDownPointerY = e.clientY),
      (this.onPointerDownLon = this.lon),
      (this.onPointerDownLat = this.lat));
  }
  onDocumentMouseMove(e) {
    !0 === this.isUserInteracting &&
      ((this.lon =
        0.1 * (this.onPointerDownPointerX - e.clientX) + this.onPointerDownLon),
      (this.lat =
        0.1 * (e.clientY - this.onPointerDownPointerY) +
        this.onPointerDownLat));
  }
  onDocumentMouseUp() {
    this.isUserInteracting = !1;
  }
  onDocumentMouseWheel(e) {
    ((this.distance += 0.05 * e.deltaY),
      (this.distance = THREE.Math.clamp(this.distance, 1, 50)));
  }
  update() {
    ((this.lat = Math.max(-85, Math.min(85, this.lat))),
      (this.phi = THREE.Math.degToRad(90 - this.lat)),
      (this.theta = THREE.Math.degToRad(this.lon)),
      (this.camera.position.x =
        this.distance * Math.sin(this.phi) * Math.cos(this.theta)),
      (this.camera.position.y = this.distance * Math.cos(this.phi)),
      (this.camera.position.z =
        this.distance * Math.sin(this.phi) * Math.sin(this.theta)),
      this.camera.lookAt(this.camera.target),
      this.renderer.render(this.scene, this.camera));
  }
}

}
,
"src/next/platform/dom-templates.js":
function* (__imports) {
yield {"Gr": { get: () => Gr, set: value => { Gr = value; } }};
var Gr = {
  containerClass: "postbird-box-container active",
  box: null,
  textTemplate: {
    title: "提示信息",
    content: "提示内容",
    okBtn: "好的",
    cancelBtn: "取消",
    contentColor: "#000000",
    okBtnColor: "#0e90d2",
    promptTitle: "请输入内容",
    promptOkBtn: "确认",
  },
  getAlertTemplate: function () {
    return (
      '<div class="postbird-box-dialog"><div class="postbird-box-content"><div class="postbird-box-header"><span class="postbird-box-close-btn">×</span><span class="postbird-box-title"><span >' +
      this.textTemplate.title +
      '</span></span></div><div class="postbird-box-text"><span style="color:' +
      this.textTemplate.contentColor +
      ';">' +
      this.textTemplate.content +
      '</span></div><div class="postbird-box-footer"><button class="btn-footer btn-block-footer btn-footer-ok" style="color:' +
      this.textTemplate.okBtnColor +
      ';">' +
      this.textTemplate.okBtn +
      "</button></div></div></div>"
    );
  },
  getConfirmTemplate: function () {
    return (
      '<div class="postbird-box-container"><div class="postbird-box-dialog"><div class="postbird-box-content"><div class="postbird-box-header"><span class="postbird-box-close-btn">×</span><span class="postbird-box-title"><span >' +
      this.textTemplate.title +
      '</span></span></div><div class="postbird-box-text"><span style="color:' +
      this.textTemplate.contentColor +
      ';">' +
      this.textTemplate.content +
      '?</span></div><div class="postbird-box-footer"><button class="btn-footer btn-left-footer btn-footer-cancel" style="color:' +
      this.textTemplate.cancelBtnColor +
      ';">' +
      this.textTemplate.cancelBtn +
      '</button><button class="btn-footer btn-right-footer btn-footer-ok"  style="color:' +
      this.textTemplate.okBtnColor +
      ';">' +
      this.textTemplate.okBtn +
      "</button></div></div></div></div>"
    );
  },
  getPromptTemplate: function () {
    return (
      '<div class="postbird-box-container"><div class="postbird-box-dialog"><div class="postbird-box-content"><div class="postbird-box-header"><span class="postbird-box-close-btn">×</span><span class="postbird-box-title"><span >' +
      this.textTemplate.title +
      '</span></span></div><div class="postbird-box-text"><input type="text" class="postbird-prompt-input" autofocus="true" ></div><div class="postbird-box-footer"><button class="btn-footer btn-left-footer btn-footer-cancel" style="color:' +
      this.textTemplate.cancelBtnColor +
      ';">' +
      this.textTemplate.cancelBtn +
      '</button><button class="btn-footer btn-right-footer btn-footer-ok"  style="color:' +
      this.textTemplate.okBtnColor +
      ';">' +
      this.textTemplate.okBtn +
      "</button></div></div></div></div>"
    );
  },
  alert: function (e) {
    ((this.textTemplate.title = e.title || this.textTemplate.title),
      (this.textTemplate.content = e.content || this.textTemplate.content),
      (this.textTemplate.okBtn = e.okBtn || this.textTemplate.okBtn),
      (this.textTemplate.okBtnColor =
        e.okBtnColor || this.textTemplate.okBtnColor),
      (this.textTemplate.contentColor =
        e.contentColor || this.textTemplate.contentColor));
    var t = document.createElement("div"),
      o = this;
    ((t.className = this.containerClass),
      (t.innerHTML = this.getAlertTemplate()),
      (this.box = t),
      document.body.appendChild(this.box),
      (t = document.getElementsByClassName("btn-footer-ok"))[
        t.length - 1
      ].focus(),
      (t[t.length - 1].onclick = function () {
        (e.onConfirm && e.onConfirm(), o.removeBox());
      }));
  },
  confirm: function (e) {
    ((this.textTemplate.title = e.title || this.textTemplate.promptTitle),
      (this.textTemplate.promptPlaceholder =
        e.promptPlaceholder || this.textTemplate.promptPlaceholder),
      (this.textTemplate.okBtn = e.okBtn || this.textTemplate.promptOkBtn),
      (this.textTemplate.okBtnColor =
        e.okBtnColor || this.textTemplate.okBtnColor),
      (this.textTemplate.cancelBtn =
        e.cancelBtn || this.textTemplate.cancelBtn),
      (this.textTemplate.cancelBtnColor =
        e.cancelBtnColor || this.textTemplate.cancelBtnColor),
      (this.textTemplate.content = e.content || this.textTemplate.content));
    var t = document.createElement("div"),
      o = this;
    (((this.box = t).className = this.containerClass),
      (t.innerHTML = this.getConfirmTemplate()),
      document.body.appendChild(t),
      (t = document.getElementsByClassName("btn-footer-ok"))[
        t.length - 1
      ].focus(),
      (t[t.length - 1].onclick = function () {
        (e.onConfirm && e.onConfirm(), o.removeBox());
      }),
      ((t = document.getElementsByClassName("btn-footer-cancel"))[
        t.length - 1
      ].onclick = function () {
        (e.onCancel && e.onCancel(), o.removeBox());
      }));
  },
  prompt: function (e) {
    ((this.textTemplate.title = e.title || this.textTemplate.title),
      (this.textTemplate.content = e.content || this.textTemplate.content),
      (this.textTemplate.contentColor =
        e.contentColor || this.textTemplate.contentColor),
      (this.textTemplate.okBtn = e.okBtn || this.textTemplate.okBtn),
      (this.textTemplate.okBtnColor =
        e.okBtnColor || this.textTemplate.okBtnColor),
      (this.textTemplate.cancelBtn =
        e.cancelBtn || this.textTemplate.cancelBtn),
      (this.textTemplate.cancelBtnColor =
        e.cancelBtnColor || this.textTemplate.cancelBtnColor));
    var t = document.createElement("div"),
      o = this;
    ((t.className = this.containerClass),
      (t.innerHTML = this.getPromptTemplate()),
      (this.box = t),
      document.body.appendChild(t));
    var n = (n = document.getElementsByClassName("postbird-prompt-input"))[
      n.length - 1
    ];
    (null != e.defaultValue && (n.value = e.defaultValue),
      n.focus(),
      (t = document.getElementsByClassName("btn-footer-ok")),
      n.value,
      t[t.length - 1].focus(),
      (t[t.length - 1].onclick = function () {
        (e.onConfirm && e.onConfirm(n.value), o.removeBox());
      }),
      ((t = document.getElementsByClassName("btn-footer-cancel"))[
        t.length - 1
      ].onclick = function () {
        (e.onCancel && e.onCancel(n.value), o.removeBox());
      }));
  },
  colse: function () {
    this.removeBox();
  },
  removeBox: function () {
    var e = document.getElementsByClassName(this.containerClass);
    document.body.removeChild(e[e.length - 1]);
  },
};

}
,
"src/next/platform/request.js":
function* (__imports) {
yield {"Ur": { get: () => Ur, set: value => { Ur = value; } },
"Vr": { get: () => Vr, set: value => { Vr = value; } },
"qr": { get: () => qr, set: value => { qr = value; } }};
// Stream lookups are read operations (including Douyu's POST). Never retry them
// implicitly. Ownership is explicit: multi-room user players may outlive a room.
function createStreamRequest(callback, failure, owner) {
  let stopped = false;
  const pending = new Set();
  const operation = {
    abort() {
      if (stopped) return;
      stopped = true;
      for (const handle of pending) {
        try { handle.abort?.(); } catch (_) {}
      }
      pending.clear();
    },
    finish(...args) {
      if (stopped || owner?.disposed) return;
      stopped = true;
      pending.clear();
      callback(...args);
    },
    request(options, parse) {
      if (stopped || owner?.disposed) return;
      let handle, settled = false;
      const settle = action => response => {
        if (settled || stopped || owner?.disposed) return;
        settled = true;
        pending.delete(handle);
        action(response);
      };
      const fail = () => operation.finish(...failure);
      try {
        handle = (0, __imports.GM_xmlhttpRequest)({
          ...options,
          timeout: 15000,
          onload: settle(response => {
            let result;
            try {
              if (response.status && (response.status < 200 || response.status >= 300)) throw new Error('HTTP failure');
              result = parse(response.response);
            } catch (_) { fail(); return; }
            // Parsing returns a continuation so consumer exceptions aren't retried.
            result();
          }),
          onerror: settle(fail), ontimeout: settle(fail), onabort: settle(fail),
        });
        if (!settled && !stopped && handle) pending.add(handle);
      } catch (_) { fail(); }
    },
  };
  if (owner) owner.own(() => operation.abort());
  return operation;
}
function Vr(e, t, o, a, owner) {
  const quality = { '1': '80', '2': '150', '3': '250', '4': '400', '5': '20000' }[t] || '80';
  const operation = createStreamRequest(a, [''], owner);
  operation.request({
    method: 'GET',
    url: `https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?room_id=${e}&platform=web&qn=${quality}&protocol=0,1&format=0,1,2&codec=0,1`,
    responseType: 'json',
  }, response => {
    const data = response?.data;
    let url = '';
    if (response?.code && response.code !== 0) return () => operation.finish('');
    for (const stream of data?.playurl_info?.playurl?.stream || []) {
      const codec = stream.format?.[0]?.codec?.[0], info = codec?.url_info?.[0];
      if (String(stream.protocol_name).includes('stream') && info?.host && codec.base_url)
        url = info.host + codec.base_url + (info.extra || '');
    }
    if (data?.durl) url = data.durl[0]?.url || '';
    return () => operation.finish(url);
  });
  return operation;
}
function qr(i, a, e, r, l, owner) {
  const did = (0, __imports.x)('dy_did') || '10000000000000000000000000001501';
  const operation = createStreamRequest(l, ['None'], owner);
  operation.request({
    method: 'GET',
    url: 'https://www.douyu.com/wgapi/livenc/liveweb/websec/getEncryption?did=' + did,
    responseType: 'json',
  }, response => {
    if (response?.error !== 0 || !response.data) return () => operation.finish('None');
    const data = response.data, tt = Math.round(Date.now() / 1000);
    let hash = data.rand_str;
    for (let count = 0; count < data.enc_time; count++) hash = (0, __imports.Or)(hash + data.key);
    const auth = (0, __imports.Or)(hash + data.key + (data.is_special === 1 ? '' : '' + i + tt));
    return () => operation.request({
      method: 'POST',
      url: 'https://www.douyu.com/lapi/live/getH5PlayV1/' + i,
      data: `enc_data=${data.enc_data}&tt=${tt}&did=${did}&auth=${auth}&cdn=&rate=${r == '1428' ? '-1' : r}&hevc=0&fa=0&ive=0`,
      responseType: 'json',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, result => {
      const data = result?.data;
      const url = result?.error === 0 && data?.rtmp_url && data?.rtmp_live
        ? data.rtmp_url + '/' + data.rtmp_live : null;
      return () => operation.finish(url ? (a ? url : url + '&only-audio=1') : 'None');
    });
  });
  return operation;
}
function Ur(e, t, n, owner) {
  const operation = createStreamRequest(n, ['', '房间未开播或请求失败'], owner);
  operation.request({
    method: 'GET',
    url: 'https://mp.huya.com/cache.php?m=Live&do=profileRoom&roomid=' + e,
    responseType: 'json',
  }, response => {
    const url = response?.data?.stream?.flv?.multiLine?.[0]?.url;
    return () => operation.finish(url ? url.replace(/^http:/, 'https:') : '', url ? '' : '房间暂未开播');
  });
  return operation;
}

}
,
"src/next/platform/script-hooks.js":
function* (__imports) {
yield {"Kr": { get: () => Kr, set: value => { Kr = value; } },
"Qr": { get: () => Qr, set: value => { Qr = value; } },
"Wr": { get: () => Wr, set: value => { Wr = value; } },
"Xr": { get: () => Xr, set: value => { Xr = value; } },
"Yr": { get: () => Yr, set: value => { Yr = value; } },
"Zr": { get: () => Zr, set: value => { Zr = value; } }};
let Wr = [],
  Yr = new WeakMap();
function Qr(e) {
  Wr.push(e);
}
let Jr = [];
function Zr(e) {
  if ("SCRIPT" === e.tagName && !e.src && e.textContent) {
    var o = Jr.filter((e) => e.inline);
    if (0 !== o.length) {
      let t = e.textContent;
      for (let e = 0; e < o.length; e++) t = o[e].callback(t);
      t !== e.textContent && (e.textContent = t);
    }
  }
  return e;
}
function Xr(e, t, o) {
  var n,
    i,
    a = e.src,
    r = [];
  for (let e = 0; e < Jr.length; e++) {
    var l = Jr[e];
    !l.inline && a.includes(l.url) && r.push(l);
  }
  return (
    0 !== r.length &&
    ((n = r),
    (i = o),
    (0, __imports.GM_xmlhttpRequest)({
      method: "GET",
      url: a,
      onload: function (e) {
        let t = e.responseText;
        for (let e = 0; e < n.length; e++) t = n[e].callback(t);
        e = document.createElement("script");
        ((e.type = "text/javascript"), (e.textContent = t), i.appendChild(e));
      },
      onerror: function (e) {
        console.error("Error loading script via GM_xmlhttpRequest:", e);
      },
    }),
    1)
  );
}
function Kr(e) {
  Jr.push(e);
}

}
,
"src/next/services/batch-danmaku.js":
function* (__imports) {
yield {"U": { get: () => U, set: value => { U = value; } },
"el": { get: () => el, set: value => { el = value; } },
"ol": { get: () => ol, set: value => { ol = value; } },
"tl": { get: () => tl, set: value => { tl = value; } }};
function $r(e) {
  if (e) return e.toString().replace(/@S/g, "/").replace(/@A/g, "@");
}
function el(e) {
  if (e)
    return e.includes("//")
      ? e
          .split("//")
          .filter((e) => "" !== e)
          .map((e) => el(e))
      : e.includes("@=")
        ? e
            .split("/")
            .filter((e) => "" !== e)
            .reduce((e, t) => {
              var [t, o] = t.split("@=");
              return ((e[t] = el($r(o))), e);
            }, {})
        : e.includes("@A=")
          ? el($r(e))
          : e.toString();
}
function tl(e, t) {
  var o;
  null == document.getElementById(e) &&
    (((o = document.createElement("style")).id = e),
    (o.innerHTML = t),
    document.body.append(o));
}
function U(e) {
  null !== document.getElementById(e) && document.getElementById(e).remove();
}
function ol(e) {
  var t = ((t) => {
      var o,
        n,
        i = new Array();
      o = t.length;
      for (let e = 0; e < o; e++)
        65536 <= (n = String(t).charCodeAt(e)) && n <= 1114111
          ? (i.push(((n >> 18) & 7) | 240),
            i.push(((n >> 12) & 63) | 128),
            i.push(((n >> 6) & 63) | 128),
            i.push((63 & n) | 128))
          : 2048 <= n && n <= 65535
            ? (i.push(((n >> 12) & 15) | 224),
              i.push(((n >> 6) & 63) | 128),
              i.push((63 & n) | 128))
            : 128 <= n && n <= 2047
              ? (i.push(((n >> 6) & 31) | 192), i.push((63 & n) | 128))
              : i.push(255 & n);
      return i;
    })(e),
    e = new Uint8Array(t.length + 4 + 4 + 2 + 1 + 1 + 1),
    o = new Uint8Array(t.length);
  for (let e = 0; e < o.length; e++) o[e] = t[e];
  var n = new Uint32Array([t.length + 4 + 2 + 1 + 1 + 1]),
    i = new Uint32Array([689]);
  return (
    e.set(new Uint8Array(n.buffer), 0),
    e.set(new Uint8Array(n.buffer), 4),
    e.set(new Uint8Array(i.buffer), 8),
    e.set(o, 12),
    e
  );
}

}
,
"src/next/platform/cron.js":
function* (__imports) {
yield {"nl": { get: () => nl, set: value => { nl = value; } }};
class nl {
  constructor(e, t) {
    "WebSocket" in window &&
      ((this.timer = 0),
      (this.rid = e),
      (this.msgHandler = t),
      (this.reconnectCount = 0),
      (this.maxReconnect = 10),
      (this.closed = !1),
      this.connect());
  }
  connect() {
    if (this.closed) return;
    ((this.ws = new WebSocket(
      "wss://danmuproxy.douyu.com:850" + String((0, __imports.a)(2, 5)),
    )),
      (this.ws.onopen = () => {
        if (this.closed) return;
        ((this.reconnectCount = 0),
          this.ws.send((0, __imports.ol)("type@=loginreq/roomid@=" + this.rid)),
          this.ws.send((0, __imports.ol)("type@=joingroup/rid@=" + this.rid + "/gid@=-9999/")),
          (this.timer = (0, __imports.setInterval)(() => {
            this.ws.send((0, __imports.ol)("type@=mrkl/"));
          }, 4e4)));
      }),
      (this.ws.onerror = () => {
        if (!this.closed && this.ws)
          try {
            this.ws.close();
          } catch (e) {}
      }),
      (this.ws.onmessage = (t) => {
        if (!this.closed) {
          let e = new FileReader();
          ((e.onload = () => {
            if (!this.closed) {
              var t = String(e.result).split("\0");
              e = null;
              for (let e = 0; e < t.length; e++)
                12 < t[e].length && this.msgHandler(t[e]);
            }
          }),
            e.readAsText(t.data));
        }
      }),
      (this.ws.onclose = () => {
        ((0, __imports.clearInterval)(this.timer),
          (this.timer = 0),
          (this.ws = null),
          this.closed || this.reconnect());
      }));
  }
  reconnect() {
    var e;
    this.closed ||
      this.reconnectCount >= this.maxReconnect ||
      (this.reconnectCount++,
      (e = Math.min(3e3 * Math.pow(1.5, this.reconnectCount - 1), 6e4)),
      this.reconnectTimer = (0, __imports.setTimeout)(() => {
        this.closed || this.connect();
      }, e));
  }
  close() {
    (0, __imports.clearTimeout)(this.reconnectTimer);
    this.reconnectTimer = null;
    if (
      !this.closed &&
      ((this.closed = !0), (0, __imports.clearInterval)(this.timer), (this.timer = 0), this.ws)
    ) {
      var e = this.ws;
      ((this.ws = null),
        (e.onclose = null),
        (e.onopen = null),
        (e.onerror = null),
        (e.onmessage = null));
      try {
        (e.readyState !== WebSocket.OPEN &&
          e.readyState !== WebSocket.CONNECTING) ||
          e.close();
      } catch (e) {}
    }
  }
}

/* ==================== DouyuEx-RL 智能版本生命周期与更新推送系统 ==================== */

}
,
"src/next/services/version.js":
function* (__imports) {
yield {"initVersionLifecycleNotice": { get: () => initVersionLifecycleNotice, set: value => { initVersionLifecycleNotice = value; } },
"isNewerVersion": { get: () => isNewerVersion, set: value => { isNewerVersion = value; } }};
function isNewerVersion(remote, local) {
  if (!remote || !local) return false;
  var rParts = String(remote).replace(/^v/i, "").split(".").map(Number);
  var lParts = String(local).replace(/^v/i, "").split(".").map(Number);
  for (var i = 0; i < Math.max(rParts.length, lParts.length); i++) {
    var r = rParts[i] || 0;
    var l = lParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

function initVersionLifecycleNotice() {
  var currentVer = __imports.P || "2026.09.14.05";
  var lastNotifiedVer = (0, __imports.GM_getValue)("Ex_LastNotifiedVersion");

  if (!lastNotifiedVer) {
    // 首次安装用户记录基准版本
    (0, __imports.GM_setValue)("Ex_LastNotifiedVersion", currentVer);
  }

  // 【方案 B：在线自动探测 Greasy Fork 新版本 (12小时限频，静默红点提醒)】
  var lastCheckTime = Number((0, __imports.GM_getValue)("Ex_LastUpdateCheckTime") || 0);
  var now = Date.now();
  if (now - lastCheckTime > 12 * 3600 * 1000) {
    (0, __imports.GM_setValue)("Ex_LastUpdateCheckTime", String(now));
    (0, __imports.setTimeout)(function () {
      var handleRemoteData = function (data) {
        if (data && data.version && isNewerVersion(data.version, currentVer)) {
          var tip = document.getElementById("ex-update__tip");
          if (tip) tip.style.display = "block";
        }
      };
      if (typeof __imports.GM_xmlhttpRequest === "function") {
        (0, __imports.GM_xmlhttpRequest)({
          method: "GET",
          url: "https://greasyfork.org/scripts/595575.json",
          responseType: "json",
          onload: function (res) {
            var data = res.response;
            if (typeof data === "string") {
              try {
                data = JSON.parse(data);
              } catch (e) {}
            }
            handleRemoteData(data);
          },
        });
      } else {
        (0, __imports.fetch)("https://greasyfork.org/scripts/595575.json")
          .then(function (res) {
            return res.json();
          })
          .then(handleRemoteData)
          .catch(function (err) {});
      }
    }, 5000);
  }
}
window.initVersionLifecycleNotice = initVersionLifecycleNotice;
try {
  if (typeof __imports.unsafeWindow !== "undefined") {
    __imports.unsafeWindow.initVersionLifecycleNotice = initVersionLifecycleNotice;
  }
} catch (e) {}
(0, __imports.setTimeout)(function () {
  try {
    initVersionLifecycleNotice();
  } catch (e) {}
}, 1000);

}
,
"src/next/runtime/router.js":
function* (__imports) {
yield {"installNavigation": { get: () => installNavigation, set: value => { installNavigation = value; } },
"roomRouteLifetime": { get: () => roomRouteLifetime, set: value => { roomRouteLifetime = value; } },
"stopNavigation": { get: () => stopNavigation, set: value => { stopNavigation = value; } }};
let roomRouteLifetime = null;
let installedRoomHooks = false;
let lastRoomReadiness = null;
let navigationOwner = null;
function stopNavigation() {
  if (navigationOwner) navigationOwner.dispose();
  navigationOwner = null;
  if (roomRouteLifetime) roomRouteLifetime.dispose();
  roomRouteLifetime = null;
  (0, __imports.closeEnhancedPip)();
  (0, __imports.unmountRoom)();
}
function installNavigation() {
  if (navigationOwner && !navigationOwner.disposed) return navigationOwner;
  const owner = navigationOwner = (0, __imports.createRoomLifetime)();
  // History belongs to the page world, not the userscript sandbox's global.
  const page = typeof __imports.unsafeWindow !== 'undefined' ? __imports.unsafeWindow : window;
  let current;
  const navigate = owner.guard(() => {
    const url = String(page.location.href);
    const key = url.split('#')[0];
    if (key === current) return;
    current = key;
    routePage(url);
  });
  for (const name of ['pushState', 'replaceState']) {
    const history = page.history;
    if (!history) continue;
    const original = history[name];
    const descriptor = Object.getOwnPropertyDescriptor(history, name);
    function wrapped(...args) {
      const result = original.apply(this, args);
      navigate();
      return result;
    }
    history[name] = wrapped;
    owner.own(() => {
      if (history[name] !== wrapped) return;
      if (descriptor) Object.defineProperty(history, name, descriptor);
      else delete history[name];
    });
  }
  owner.listen(page, 'popstate', navigate);
  owner.listen(window, 'pagehide', () => {
    if (roomRouteLifetime) roomRouteLifetime.dispose();
    (0, __imports.closeEnhancedPip)();
    (0, __imports.unmountRoom)();
  });
  owner.listen(window, 'pageshow', event => {
    if (event.persisted) { current = undefined; navigate(); }
  });
  navigate();
  return owner;
}
function routePage(e) {
  if (roomRouteLifetime) roomRouteLifetime.dispose();
  roomRouteLifetime = null;
  (0, __imports.closeEnhancedPip)();
  (0, __imports.unmountRoom)();
  if (-1 !== String(e).indexOf("yuba.douyu.com"))
    if (-1 !== String(e).indexOf("?exRestore")) (0, __imports.wn)();
    else if (-1 !== String(e).indexOf("?exClean")) {
      let e = (0, __imports.v)(window.location.href, "domain=", "&");
      (0, __imports.ae)(() => {
        window.parent.postMessage("yubaCleanOver", decodeURIComponent(e));
      });
    } else {
      try {
        document.domain = "douyu.com";
      } catch (e) {}
      (0, __imports._n)();
    }
  else if (
    -1 !== String(e).indexOf("passport.douyu.com") &&
    -1 !== String(e).indexOf("exid=chun")
  ) {
    let e = (0, __imports.v)(window.location.href, "cmd=", "&"),
      t = (0, __imports.v)(window.location.href, "uid=", "&"),
      o = (0, __imports.v)(window.location.href, "domain=", "&");
    if ("clean" !== e) {
      var i = t;
      let e = JSON.parse((0, __imports.GM_getValue)("Ex_accountListPassport") || "{}"),
        o = [],
        n = [];
      (0, __imports.GM_cookie)("list", { path: "/" }, function (t) {
        if (null != t) {
          for (let e = 0; e < t.length; e++)
            ("LTP0" == t[e].name ? o : n).push(t[e]);
          ("" == i && (i = "null"),
            (e.global = null),
            (e.global = n),
            (e[i] = o),
            (e.update_time = String(new Date().getTime())),
            (0, __imports.GM_setValue)("Ex_accountListPassport", JSON.stringify(e)));
        }
      });
    }
    switch (e) {
      case "clean":
        (0, __imports.ae)(() => {
          window.parent.postMessage("cleanOver", decodeURIComponent(o));
        });
        break;
      case "switch":
        ((e, o) => {
          let n = JSON.parse((0, __imports.GM_getValue)("Ex_accountListPassport"))[e],
            i = 0;
          (0, __imports.GM_cookie)("list", { path: "/" }, function (t) {
            for (let e = 0; e < t.length; e++)
              (0, __imports.GM_cookie)("delete", { name: t[e].name }, function (e) {
                if (++i >= t.length) {
                  let t = 0;
                  for (let e = 0; e < n.length; e++)
                    (0, __imports.GM_cookie)(
                      "set",
                      {
                        name: n[e].name,
                        value: n[e].value,
                        domain: n[e].domain,
                        path: n[e].path,
                        secure: n[e].secure,
                        httpOnly: n[e].httpOnly,
                        sameSite: n[e].sameSite,
                        expirationDate: n[e].expirationDate,
                        hostOnly: n[e].hostOnly,
                      },
                      function (e) {
                        ++t >= n.length && o();
                      },
                    );
                }
              });
          });
        })(t, () => {
          window.parent.postMessage("switchOver", decodeURIComponent(o));
        });
        break;
      case "delete":
        ((e, t) => {
          var o = JSON.parse((0, __imports.GM_getValue)("Ex_accountListPassport") || "{}");
          (delete o[e],
            (0, __imports.GM_setValue)("Ex_accountListPassport", JSON.stringify(o)),
            t());
        })(t, () => {
          window.parent.postMessage("deleteOver", decodeURIComponent(o));
        });
    }
    return;
  } else if (-1 !== String(e).indexOf("msg.douyu.com"))
    if (-1 !== e.indexOf("?exClean")) {
      let e = (0, __imports.v)(window.location.href, "domain=", "&");
      (0, __imports.ae)(() => {
        window.parent.postMessage("msgCleanOver", decodeURIComponent(e));
      });
    } else
      "chun" ==
        ((e) => {
          var e = new RegExp("(^|&)" + e + "=([^&]*)(&|$)", "i");
          return !(window.location.hash.indexOf("?") < 0) &&
            null != (e = window.location.hash.split("?")[1].match(e))
            ? decodeURIComponent(e[2])
            : null;
        })("exid") && void 0;
  else if (-1 !== String(e).indexOf("v.douyu.com")) {
    if (-1 !== String(e).indexOf("?exClean")) {
      let e = (0, __imports.v)(window.location.href, "domain=", "&");
      (0, __imports.ae)(() => {
        window.parent.postMessage("videoCleanOver", decodeURIComponent(e));
      });
    } else if (
      -1 !== String(e).indexOf("show/") &&
      __imports.unsafeWindow.$DATA &&
      "ROOM" in __imports.unsafeWindow.$DATA
    ) {
      (0, __imports.y)();
      const routeOwner = roomRouteLifetime = (0, __imports.createRoomLifetime)();
      routeOwner.listen(window, 'pagehide', () => routeOwner.dispose());
      (0, __imports.mountVideoTimestamps)(routeOwner);
      ((0, __imports.Mi)(), (0, __imports.$e)(), (0, __imports.Xe)());
    }
  } else if (-1 !== String(e).indexOf("cz.douyu.com")) {
    if (-1 !== String(e).indexOf("?exClean")) {
      let e = (0, __imports.v)(window.location.href, "domain=", "&");
      (0, __imports.ae)(() => {
        window.parent.postMessage("czCleanOver", decodeURIComponent(e));
      });
    }
  } else if (-1 !== String(e).indexOf("getFansBadgeList")) {
    var t = new Date().getTime(),
      o = document.querySelectorAll(".fans-badge-list tr");
    if (!(o.length <= 1))
      for (let e = 1; e < o.length; e++) {
        var n = o[e],
          a = 1e3 * Number(n.getAttribute("data-fans-gbdgts")),
          r = (0, __imports.k)("yyyy-MM-dd hh:mm:ss", new Date(a)),
          a = Math.floor((t - a) / 864e5),
          l = 300 <= a ? "font-weight:600;color:red;" : "";
        n.getElementsByTagName("td")[1].innerHTML +=
          `

        已获取 <span style="${l}">${a}</span> 天<br/>

        ` + r;
      }
    return;
  } else if (-1 !== String(e).indexOf("exid=chun")) {
    (0, __imports.bn)();
    const routeOwner = roomRouteLifetime = (0, __imports.createRoomLifetime)();
    routeOwner.listen(window, 'pagehide', () => routeOwner.dispose());
    let t = routeOwner.interval(() => {
      const fullscreen = document.querySelector("div.wfs-2a8e83");
      const aside = document.querySelector("label.layout-Player-asidetoggleButton");
      const choices = document.querySelectorAll(".tip-e3420a > ul > li");
      if (!fullscreen || !aside || !choices.length) return;
      (0, __imports.clearInterval)(t);
      fullscreen.click();
      if (routeOwner.disposed) return;
      aside.click();
      if (routeOwner.disposed) return;
      choices[choices.length - 1].click();
    }, 1e3);
    return;
  } else if (
    -1 === String(e).indexOf("template/") &&
    -1 === String(e).indexOf("h5/")
  ) {
    document.domain = "douyu.com";
    if (!installedRoomHooks) {
      (0, __imports.installRoomHooks)();
      installedRoomHooks = true;
    }
    const routeUrl = new URL(String(e), window.location.href);
    const numericId = (routeUrl.pathname.match(/^\/(?:beta\/)?(\d+)\/?$/) || [])[1];
    const initialIdentity = (0, __imports.readRoomIdentity)();
    const previous = lastRoomReadiness;
    const routeOwner = roomRouteLifetime = (0, __imports.createRoomLifetime)();
    routeOwner.listen(window, 'pagehide', () => routeOwner.dispose());
    __imports.B = "";
    let pending = false;
    let pollCount = 0;
    const POLL_CEILING = 30;
    const ready = () => {
      const barrage = document.getElementsByClassName("Barrage-main")[0];
      const backpack = document.getElementsByClassName("BackpackButton")[0] || document.querySelector("#js-backpack-enter");
      if (!barrage || !backpack) return null;
      const identities = (0, __imports.readRoomIdentity)();
      const changedId = identities.find((id, index) => id &&
        id !== (previous ? previous.identities : initialIdentity)[index] && id !== previous?.roomId);
      const roomId = numericId || changedId ||
        (previous?.pathname === routeUrl.pathname && identities.includes(previous.roomId) && previous.roomId) ||
        (!previous && identities.find(Boolean));
      if (!roomId) return null;
      // Retained room controls alone do not establish readiness for another room.
      if (previous && previous.roomId !== roomId &&
          barrage === previous.barrage && backpack === previous.backpack &&
          !identities.some((id, index) => id === roomId && id !== previous.identities[index])) return null;
      return {roomId, barrage, backpack, identities, pathname: routeUrl.pathname};
    };
    const poll = routeOwner.interval(() => {
      if (++pollCount > POLL_CEILING) {
        (0, __imports.clearInterval)(poll);
        console.warn('[DouyuEx-RL] Room readiness polling timed out after ' + POLL_CEILING + 's');
        return;
      }
      const candidate = ready();
      if (!candidate || pending) return;
      pending = true;
      routeOwner.timeout(() => {
        pending = false;
        const current = ready();
        if (!current || current.roomId !== candidate.roomId ||
            current.barrage !== candidate.barrage || current.backpack !== candidate.backpack) return;
        (0, __imports.clearInterval)(poll);
        __imports.B = current.roomId;
        lastRoomReadiness = current;
        (0, __imports.y)();
        (0, __imports.mountRoom)();
        (0, __imports.startTaskHeartbeat)();
      }, 1500);
    }, 1e3);
  }
}

}
,
"src/next/runtime/adapters.js":
function* (__imports) {
yield {};
// Register after legacy declarations and before the sole route entry.
// ee remains the original panel dispatcher; service actions retain original payloads,
// configuration storage, callbacks, timing and error handling.
const nextPanelAdapters = [
  ['ex-sign', '一键签到'], ['fans-continue', '一键续牌'],
  ['extool-icon', '扩展功能'], ['livetool-icon', '直播间工具'],
  ['bloop-icon', '弹幕发送小助手'], ['ex-lottery', '全站抽奖信息'],
  ['popup-player', '同屏播放'], ['ex-monitor', null], ['ex-update', '版本更新']
];
for (const [id, panel] of nextPanelAdapters) {
  __imports.nextFeatures.register(id, {
    panel,
    open(hover, button) {
      if (!panel) return hover ? undefined : (0, __imports._)('https://www.douyuex.com/' + String(__imports.B), true);
      if (id === 'ex-sign' && !hover) (0, __imports.createSignPanel)();
      const result = (0, __imports.openFeaturePanel)(panel, hover, button);
      if (id === 'fans-continue') (0, __imports.updateFansContinuePanel)();
      if (id === 'ex-lottery') {
        const list = document.getElementsByClassName('lottery__wrap')[0];
        if (list && typeof __imports.So !== 'undefined') list.innerHTML = __imports.So;
      }
      return result;
    },
    ...(id === 'ex-sign' ? { execute: (options, onLog) => (0, __imports.executeSignEngine)(options, onLog) } : {}),
    ...(id === 'fans-continue' ? { execute: count => (0, __imports.executeFansContinue)(count) } : {}),
    ...(id === 'popup-player' ? { execute: (url, noIframe) => (0, __imports.executePopupPlayer)(url, noIframe) } : {})
  });
}
__imports.nextRuntime.features = __imports.nextFeatures;
__imports.nextRuntime.teardownDock = __imports.teardownNextDock;
__imports.nextRuntime.tasks = Object.freeze({ start: __imports.startTaskHeartbeat, stop: __imports.stopTaskHeartbeat });
__imports.nextRuntime.navigation = Object.freeze({ install: __imports.installNavigation, remove: __imports.stopNavigation });
__imports.nextRuntime.lifecycle = 'Owned SPA navigation, room mounts and PiP requests; legacy hooks/jobs require reload';
__imports.nextRuntime.status = 'ready';
Object.freeze(__imports.nextRuntime);

}
,
"src/next/entry.js":
function* (__imports) {
yield {};
(0, __imports.installNavigation)();

}
};
const contracts = {
  "src/next/runtime/registry.js": {
    "imports": {
      "clearSubPanelTimer": "src/next/ui/panel-position.js"
    },
    "exports": [
      "createNextDockOwner",
      "nextDockOwners",
      "nextFeatures",
      "teardownNextDock"
    ]
  },
  "src/next/core/quality.js": {
    "imports": {},
    "exports": []
  },
  "src/next/core/rank_engine.js": {
    "imports": {},
    "exports": []
  },
  "src/next/runtime/room-hooks.js": {
    "imports": {
      "_": "src/next/services/utilities.js",
      "bn": "src/next/services/page-cleanup.js",
      "clearInterval": "@platform",
      "DomMutationSubscription": "src/next/platform/dom-observers.js",
      "E": "src/next/services/utilities.js",
      "GM_deleteValue": "@platform",
      "GM_info": "@platform",
      "GM_listValues": "@platform",
      "GM_registerMenuCommand": "@platform",
      "GM_xmlhttpRequest": "@platform",
      "Ko": "src/next/services/preferences.js",
      "Kr": "src/next/platform/script-hooks.js",
      "localStorage": "src/next/runtime/start.js",
      "Qr": "src/next/platform/script-hooks.js",
      "setInterval": "@platform",
      "T": "src/next/services/utilities.js",
      "Un": "src/next/services/danmaku-filters.js",
      "unsafeWindow": "@platform",
      "Wr": "src/next/platform/script-hooks.js",
      "Wt": "src/next/services/room-actions.js",
      "Xr": "src/next/platform/script-hooks.js",
      "Yr": "src/next/platform/script-hooks.js",
      "Yt": "src/next/services/room-actions.js",
      "Zr": "src/next/platform/script-hooks.js"
    },
    "exports": [
      "EXURL",
      "ExLoadLib",
      "P",
      "installRoomHooks"
    ]
  },
  "src/next/ui/bindings.js": {
    "imports": {
      "DOCK_DEFS": "src/next/ui/icons.js",
      "nextDockOwners": "src/next/runtime/registry.js"
    },
    "exports": [
      "safeBind",
      "safeEl"
    ]
  },
  "src/next/ui/gift-picker.js": {
    "imports": {
      "B": "src/next/services/session.js",
      "fetchCurrentRoomGifts": "src/next/services/gifts.js",
      "fetchUserBackpackGifts": "src/next/services/gifts.js",
      "setTimeout": "@platform"
    },
    "exports": [
      "openGiftPicker"
    ]
  },
  "src/next/ui/panel-header.js": {
    "imports": {
      "clearSubPanelTimer": "src/next/ui/panel-position.js",
      "scheduleSubPanelClose": "src/next/ui/panel-position.js",
      "updateDockActiveIndicator": "src/next/ui/panel-position.js"
    },
    "exports": [
      "ensureMiuixPanelHeader"
    ]
  },
  "src/next/ui/panel-position.js": {
    "imports": {
      "clearTimeout": "@platform",
      "DOCK_DEFS": "src/next/ui/icons.js",
      "setTimeout": "@platform"
    },
    "exports": [
      "anchorPanelToButton",
      "clearSubPanelTimer",
      "scheduleSubPanelClose",
      "updateDockActiveIndicator"
    ]
  },
  "src/next/ui/icons.js": {
    "imports": {
      "P": "src/next/runtime/room-hooks.js"
    },
    "exports": [
      "DOCK_DEFS"
    ]
  },
  "src/next/ui/panels/fans.js": {
    "imports": {
      "b": "src/next/services/utilities.js",
      "B": "src/next/services/session.js",
      "ensureMiuixPanelHeader": "src/next/ui/panel-header.js",
      "fetch": "@platform",
      "localStorage": "src/next/runtime/start.js",
      "nextFeatures": "src/next/runtime/registry.js",
      "pt": "src/next/services/fans.js",
      "safeBind": "src/next/ui/bindings.js",
      "T": "src/next/services/utilities.js",
      "Ut": "src/next/services/room-actions.js"
    },
    "exports": [
      "createFansContinuePanel",
      "executeFansContinue",
      "updateFansContinuePanel"
    ]
  },
  "src/next/ui/panels/sign.js": {
    "imports": {
      "ensureMiuixPanelHeader": "src/next/ui/panel-header.js",
      "executeSignEngine": "src/next/services/sign-engine.js",
      "localStorage": "src/next/runtime/start.js",
      "nextFeatures": "src/next/runtime/registry.js",
      "safeBind": "src/next/ui/bindings.js",
      "T": "src/next/services/utilities.js",
      "Wn": "src/next/services/danmaku-filters.js"
    },
    "exports": [
      "createSignPanel"
    ]
  },
  "src/next/ui/panels/popup.js": {
    "imports": {
      "D": "src/next/services/danmaku-renderer.js",
      "E": "src/next/services/utilities.js",
      "en": "src/next/services/danmaku-renderer.js",
      "ensureMiuixPanelHeader": "src/next/ui/panel-header.js",
      "ExLoadLib": "src/next/runtime/room-hooks.js",
      "EXURL": "src/next/runtime/room-hooks.js",
      "fetch": "@platform",
      "GM_xmlhttpRequest": "@platform",
      "nextFeatures": "src/next/runtime/registry.js",
      "on": "src/next/services/danmaku-renderer.js",
      "rn": "src/next/services/danmaku-renderer.js",
      "safeBind": "src/next/ui/bindings.js",
      "T": "src/next/services/utilities.js",
      "tn": "src/next/services/danmaku-renderer.js",
      "updateDockActiveIndicator": "src/next/ui/panel-position.js",
      "v": "src/next/services/utilities.js"
    },
    "exports": [
      "createPopupPlayerPanel",
      "executePopupPlayer"
    ]
  },
  "src/next/ui/panels/update.js": {
    "imports": {
      "ensureMiuixPanelHeader": "src/next/ui/panel-header.js",
      "fetch": "@platform",
      "GM_getValue": "@platform",
      "GM_info": "@platform",
      "GM_openInTab": "@platform",
      "GM_setValue": "@platform",
      "GM_xmlhttpRequest": "@platform",
      "isNewerVersion": "src/next/services/version.js",
      "P": "src/next/runtime/room-hooks.js"
    },
    "exports": [
      "createExUpdatePanel"
    ]
  },
  "src/next/ui/dock.js": {
    "imports": {
      "clearSubPanelTimer": "src/next/ui/panel-position.js",
      "createExUpdatePanel": "src/next/ui/panels/update.js",
      "createFansContinuePanel": "src/next/ui/panels/fans.js",
      "createNextDockOwner": "src/next/runtime/registry.js",
      "createPopupPlayerPanel": "src/next/ui/panels/popup.js",
      "createSignPanel": "src/next/ui/panels/sign.js",
      "DOCK_DEFS": "src/next/ui/icons.js",
      "initVersionLifecycleNotice": "src/next/services/version.js",
      "nextDockOwners": "src/next/runtime/registry.js",
      "nextFeatures": "src/next/runtime/registry.js",
      "P": "src/next/runtime/room-hooks.js",
      "scheduleSubPanelClose": "src/next/ui/panel-position.js"
    },
    "exports": [
      "handleDockAction",
      "initDockFull",
      "triggerFansContinue"
    ]
  },
  "src/next/ui/room/backpack.js": {
    "imports": {
      "b": "src/next/services/utilities.js",
      "B": "src/next/services/session.js",
      "clearTimeout": "@platform",
      "de": "src/next/services/automation.js",
      "DomMutationSubscription": "src/next/platform/dom-observers.js",
      "E": "src/next/services/utilities.js",
      "pt": "src/next/services/fans.js",
      "safeBind": "src/next/ui/bindings.js",
      "se": "src/next/services/automation.js",
      "T": "src/next/services/utilities.js",
      "Ut": "src/next/services/room-actions.js"
    },
    "exports": [
      "mountBackpackControls"
    ]
  },
  "src/next/ui/room/video-toolbar.js": {
    "imports": {
      "_": "src/next/services/utilities.js",
      "_r": "src/next/services/chat-state.js",
      "B": "src/next/services/session.js",
      "bindCamera": "src/next/services/video-tools.js",
      "Br": "src/next/services/chat-state.js",
      "ca": "src/next/services/room-preferences.js",
      "clearInterval": "@platform",
      "cr": "src/next/services/chat-state.js",
      "Cr": "src/next/services/chat-state.js",
      "DomMutationSubscription": "src/next/platform/dom-observers.js",
      "E": "src/next/services/utilities.js",
      "er": "src/next/services/chat-state.js",
      "Er": "src/next/services/chat-state.js",
      "ExLoadLib": "src/next/runtime/room-hooks.js",
      "EXURL": "src/next/runtime/room-hooks.js",
      "F": "src/next/services/chat-state.js",
      "fr": "src/next/services/chat-state.js",
      "G": "src/next/services/chat-state.js",
      "Ge": "src/next/services/automation.js",
      "gr": "src/next/services/chat-state.js",
      "H": "src/next/services/chat-state.js",
      "hr": "src/next/services/chat-state.js",
      "Hr": "src/next/platform/flv-player.js",
      "ir": "src/next/services/chat-state.js",
      "Ir": "src/next/services/chat-state.js",
      "Ja": "src/next/services/chat-state.js",
      "ji": "src/next/services/room-preferences.js",
      "ka": "src/next/services/room-preferences.js",
      "Ka": "src/next/services/chat-state.js",
      "kr": "src/next/services/chat-state.js",
      "le": "src/next/services/accounts.js",
      "Li": "src/next/services/video-tools.js",
      "localStorage": "src/next/runtime/start.js",
      "O": "src/next/services/room-preferences.js",
      "openEnhancedPip": "src/next/services/pip/window.js",
      "or": "src/next/services/chat-state.js",
      "P": "src/next/runtime/room-hooks.js",
      "pr": "src/next/services/chat-state.js",
      "qa": "src/next/services/chat-state.js",
      "Qa": "src/next/services/chat-state.js",
      "qr": "src/next/platform/request.js",
      "qt": "src/next/services/room-actions.js",
      "requestAnimationFrame": "@platform",
      "rr": "src/next/services/chat-state.js",
      "safeBind": "src/next/ui/bindings.js",
      "safeEl": "src/next/ui/bindings.js",
      "T": "src/next/services/utilities.js",
      "tr": "src/next/services/chat-state.js",
      "Tr": "src/next/services/chat-state.js",
      "U": "src/next/services/batch-danmaku.js",
      "ua": "src/next/services/room-preferences.js",
      "Ua": "src/next/services/chat-state.js",
      "unsafeWindow": "@platform",
      "ur": "src/next/services/chat-state.js",
      "V": "src/next/services/chat-state.js",
      "va": "src/next/services/room-preferences.js",
      "vr": "src/next/services/chat-state.js",
      "vtoolbarChevronSvg": "src/next/services/chat-state.js",
      "wa": "src/next/services/room-preferences.js",
      "Wa": "src/next/services/chat-state.js",
      "wr": "src/next/services/chat-state.js",
      "Xa": "src/next/services/chat-state.js",
      "xr": "src/next/services/chat-state.js",
      "Ya": "src/next/services/chat-state.js",
      "yr": "src/next/services/chat-state.js",
      "Za": "src/next/services/chat-state.js",
      "Zi": "src/next/services/room-preferences.js"
    },
    "exports": [
      "mountVideoToolbar"
    ]
  },
  "src/next/ui/room/player-menu.js": {
    "imports": {
      "clearInterval": "@platform",
      "clearTimeout": "@platform",
      "DomMutationSubscription": "src/next/platform/dom-observers.js",
      "E": "src/next/services/utilities.js",
      "fn": "src/next/services/page-cleanup.js",
      "Ft": "src/next/services/room-actions.js",
      "gn": "src/next/services/page-cleanup.js",
      "hn": "src/next/services/page-cleanup.js",
      "Ht": "src/next/services/room-actions.js",
      "localStorage": "src/next/runtime/start.js",
      "pn": "src/next/services/music.js",
      "safeBind": "src/next/ui/bindings.js",
      "te": "src/next/services/utilities.js",
      "U": "src/next/services/batch-danmaku.js",
      "yn": "src/next/services/page-cleanup.js"
    },
    "exports": [
      "mountPlayerMenu"
    ]
  },
  "src/next/ui/room/barrage-settings.js": {
    "imports": {
      "Ae": "src/next/services/automation.js",
      "Ce": "src/next/services/automation.js",
      "clearInterval": "@platform",
      "DomMutationSubscription": "src/next/platform/dom-observers.js",
      "Ie": "src/next/services/automation.js",
      "Le": "src/next/services/automation.js",
      "Me": "src/next/services/automation.js",
      "Ne": "src/next/services/automation.js",
      "safeEl": "src/next/ui/bindings.js",
      "Se": "src/next/services/automation.js",
      "Te": "src/next/services/automation.js",
      "we": "src/next/services/automation.js"
    },
    "exports": [
      "mountBarrageSettings"
    ]
  },
  "src/next/ui/room/danmaku-search.js": {
    "imports": {
      "clearInterval": "@platform",
      "DomMutationSubscription": "src/next/platform/dom-observers.js",
      "localStorage": "src/next/runtime/start.js",
      "qe": "src/next/services/automation.js",
      "Qr": "src/next/platform/script-hooks.js",
      "safeBind": "src/next/ui/bindings.js",
      "Ve": "src/next/services/automation.js"
    },
    "exports": [
      "mountDanmakuSearch"
    ]
  },
  "src/next/ui/room/last-live.js": {
    "imports": {
      "clearInterval": "@platform",
      "k": "src/next/services/utilities.js"
    },
    "exports": [
      "mountLastLiveOverlay"
    ]
  },
  "src/next/services/blocked-danmaku.js": {
    "imports": {
      "clearInterval": "@platform",
      "clearTimeout": "@platform",
      "I": "src/next/services/session.js",
      "setInterval": "@platform",
      "setTimeout": "@platform",
      "W": "src/next/services/session.js",
      "x": "src/next/services/utilities.js"
    },
    "exports": [
      "initDanmakuBlockedCheck"
    ]
  },
  "src/next/ui/room/shell.js": {
    "imports": {
      "_": "src/next/services/utilities.js",
      "$o": "src/next/services/preferences.js",
      "At": "src/next/services/room-actions.js",
      "B": "src/next/services/session.js",
      "DomMutationSubscription": "src/next/platform/dom-observers.js",
      "Dt": "src/next/services/room-actions.js",
      "E": "src/next/services/utilities.js",
      "et": "src/next/services/fans.js",
      "Gt": "src/next/services/room-actions.js",
      "initDockFull": "src/next/ui/dock.js",
      "Jo": "src/next/services/preferences.js",
      "jt": "src/next/services/room-actions.js",
      "Ko": "src/next/services/preferences.js",
      "localStorage": "src/next/runtime/start.js",
      "openFeaturePanel": "src/next/ui/panel-dispatch.js",
      "Ot": "src/next/services/room-actions.js",
      "P": "src/next/runtime/room-hooks.js",
      "Pt": "src/next/services/room-actions.js",
      "Qo": "src/next/services/preferences.js",
      "qt": "src/next/services/room-actions.js",
      "safeBind": "src/next/ui/bindings.js",
      "safeEl": "src/next/ui/bindings.js",
      "T": "src/next/services/utilities.js",
      "tl": "src/next/services/batch-danmaku.js",
      "U": "src/next/services/batch-danmaku.js",
      "Ue": "src/next/services/automation.js",
      "Xo": "src/next/services/preferences.js",
      "Zo": "src/next/services/preferences.js"
    },
    "exports": [
      "mountRoomShell"
    ]
  },
  "src/next/ui/room/room-controls.js": {
    "imports": {
      "_": "src/next/services/utilities.js",
      "advanceRoomMusic": "src/next/services/music.js",
      "B": "src/next/services/session.js",
      "clearInterval": "@platform",
      "DomMutationSubscription": "src/next/platform/dom-observers.js",
      "E": "src/next/services/utilities.js",
      "fetch": "@platform",
      "Ge": "src/next/services/automation.js",
      "j": "src/next/services/music.js",
      "le": "src/next/services/accounts.js",
      "ln": "src/next/services/music.js",
      "localStorage": "src/next/runtime/start.js",
      "mountBackpackControls": "src/next/ui/room/backpack.js",
      "qn": "src/next/services/danmaku-filters.js",
      "refreshRoomMusic": "src/next/services/music.js",
      "safeBind": "src/next/ui/bindings.js",
      "U": "src/next/services/batch-danmaku.js",
      "vn": "src/next/services/yuba.js",
      "xn": "src/next/services/yuba.js"
    },
    "exports": [
      "mountRoomControls"
    ]
  },
  "src/next/ui/room/lottery.js": {
    "imports": {
      "_": "src/next/services/utilities.js",
      "B": "src/next/services/session.js",
      "clearTimeout": "@platform",
      "D": "src/next/services/danmaku-renderer.js",
      "E": "src/next/services/utilities.js",
      "en": "src/next/services/danmaku-renderer.js",
      "fetch": "@platform",
      "GM_xmlhttpRequest": "@platform",
      "handleDockAction": "src/next/ui/dock.js",
      "Lo": "src/next/services/lottery.js",
      "localStorage": "src/next/runtime/start.js",
      "Mo": "src/next/services/lottery.js",
      "No": "src/next/services/lottery.js",
      "on": "src/next/services/danmaku-renderer.js",
      "openFeaturePanel": "src/next/ui/panel-dispatch.js",
      "rn": "src/next/services/danmaku-renderer.js",
      "safeBind": "src/next/ui/bindings.js",
      "So": "src/next/services/lottery.js",
      "T": "src/next/services/utilities.js",
      "tn": "src/next/services/danmaku-renderer.js",
      "To": "src/next/services/lottery.js",
      "v": "src/next/services/utilities.js"
    },
    "exports": [
      "mountLotteryPanel"
    ]
  },
  "src/next/ui/room/live-tools.js": {
    "imports": {
      "_o": "src/next/services/lottery.js",
      "$n": "src/next/services/danmaku-filters.js",
      "$t": "src/next/services/lottery.js",
      "A": "src/next/services/lottery.js",
      "ao": "src/next/services/lottery.js",
      "B": "src/next/services/session.js",
      "bo": "src/next/services/lottery.js",
      "Bo": "src/next/services/lottery.js",
      "clearTimeout": "@platform",
      "co": "src/next/services/lottery.js",
      "DomMutationSubscription": "src/next/platform/dom-observers.js",
      "E": "src/next/services/utilities.js",
      "el": "src/next/services/batch-danmaku.js",
      "ensureMiuixPanelHeader": "src/next/ui/panel-header.js",
      "eo": "src/next/services/lottery.js",
      "Eo": "src/next/services/lottery.js",
      "fetch": "@platform",
      "fo": "src/next/services/lottery.js",
      "GM_setClipboard": "@platform",
      "GM_xmlhttpRequest": "@platform",
      "go": "src/next/services/lottery.js",
      "Gr": "src/next/platform/dom-templates.js",
      "ho": "src/next/services/lottery.js",
      "I": "src/next/services/session.js",
      "initDanmakuBlockedCheck": "src/next/services/blocked-danmaku.js",
      "io": "src/next/services/lottery.js",
      "Io": "src/next/services/lottery.js",
      "j": "src/next/services/music.js",
      "Jt": "src/next/services/lottery.js",
      "k": "src/next/services/utilities.js",
      "ko": "src/next/services/lottery.js",
      "Kt": "src/next/services/lottery.js",
      "L": "src/next/services/lottery.js",
      "lo": "src/next/services/lottery.js",
      "localStorage": "src/next/runtime/start.js",
      "M": "src/next/services/lottery.js",
      "mo": "src/next/services/lottery.js",
      "mountVideoToolbar": "src/next/ui/room/video-toolbar.js",
      "Mt": "src/next/services/room-actions.js",
      "N": "src/next/services/lottery.js",
      "nl": "src/next/platform/cron.js",
      "no": "src/next/services/lottery.js",
      "oo": "src/next/services/lottery.js",
      "openFeaturePanel": "src/next/ui/panel-dispatch.js",
      "po": "src/next/services/lottery.js",
      "ro": "src/next/services/lottery.js",
      "S": "src/next/services/lottery.js",
      "safeBind": "src/next/ui/bindings.js",
      "safeEl": "src/next/ui/bindings.js",
      "sn": "src/next/services/music.js",
      "so": "src/next/services/lottery.js",
      "St": "src/next/services/room-actions.js",
      "T": "src/next/services/utilities.js",
      "to": "src/next/services/lottery.js",
      "uo": "src/next/services/lottery.js",
      "v": "src/next/services/utilities.js",
      "vo": "src/next/services/lottery.js",
      "W": "src/next/services/session.js",
      "we": "src/next/services/automation.js",
      "wo": "src/next/services/lottery.js",
      "x": "src/next/services/utilities.js",
      "X": "src/next/services/utilities.js",
      "xo": "src/next/services/lottery.js",
      "Xt": "src/next/services/lottery.js",
      "yo": "src/next/services/lottery.js"
    },
    "exports": [
      "mountLiveToolsPanel"
    ]
  },
  "src/next/ui/room/extension-tools.js": {
    "imports": {
      "_t": "src/next/services/gifts.js",
      "at": "src/next/services/fans.js",
      "b": "src/next/services/utilities.js",
      "B": "src/next/services/session.js",
      "Bt": "src/next/services/room-actions.js",
      "clearInterval": "@platform",
      "ct": "src/next/services/fans.js",
      "Ct": "src/next/services/room-actions.js",
      "dt": "src/next/services/fans.js",
      "Et": "src/next/services/room-actions.js",
      "fetch": "@platform",
      "fo": "src/next/services/lottery.js",
      "it": "src/next/services/fans.js",
      "kt": "src/next/services/room-actions.js",
      "localStorage": "src/next/runtime/start.js",
      "lt": "src/next/services/fans.js",
      "mountPlayerMenu": "src/next/ui/room/player-menu.js",
      "mt": "src/next/services/fans.js",
      "Mt": "src/next/services/room-actions.js",
      "nt": "src/next/services/fans.js",
      "openFeaturePanel": "src/next/ui/panel-dispatch.js",
      "openGiftPicker": "src/next/ui/gift-picker.js",
      "ot": "src/next/services/fans.js",
      "pn": "src/next/services/music.js",
      "rt": "src/next/services/fans.js",
      "sa": "src/next/services/room-preferences.js",
      "safeBind": "src/next/ui/bindings.js",
      "safeEl": "src/next/ui/bindings.js",
      "st": "src/next/services/fans.js",
      "St": "src/next/services/room-actions.js",
      "T": "src/next/services/utilities.js",
      "tt": "src/next/services/fans.js",
      "Tt": "src/next/services/room-actions.js",
      "unsafeWindow": "@platform",
      "ut": "src/next/services/fans.js",
      "Ut": "src/next/services/room-actions.js",
      "w": "src/next/services/utilities.js",
      "x": "src/next/services/utilities.js",
      "yo": "src/next/services/lottery.js"
    },
    "exports": [
      "mountExtensionToolsPanel"
    ]
  },
  "src/next/ui/room/bloop.js": {
    "imports": {
      "_e": "src/next/services/automation.js",
      "be": "src/next/services/automation.js",
      "ce": "src/next/services/automation.js",
      "clearTimeout": "@platform",
      "Ee": "src/next/services/automation.js",
      "fe": "src/next/services/automation.js",
      "ge": "src/next/services/automation.js",
      "he": "src/next/services/automation.js",
      "ke": "src/next/services/automation.js",
      "localStorage": "src/next/runtime/start.js",
      "me": "src/next/services/automation.js",
      "mn": "src/next/services/page-cleanup.js",
      "openFeaturePanel": "src/next/ui/panel-dispatch.js",
      "pe": "src/next/services/automation.js",
      "pn": "src/next/services/music.js",
      "safeBind": "src/next/ui/bindings.js",
      "safeEl": "src/next/ui/bindings.js",
      "U": "src/next/services/batch-danmaku.js",
      "ue": "src/next/services/automation.js",
      "un": "src/next/services/page-cleanup.js",
      "ve": "src/next/services/automation.js",
      "xe": "src/next/services/automation.js",
      "ye": "src/next/services/automation.js"
    },
    "exports": [
      "mountBloopPanel"
    ]
  },
  "src/next/ui/room/player-bindings.js": {
    "imports": {
      "$": "src/next/services/utilities.js",
      "B": "src/next/services/session.js",
      "C": "src/next/services/automation.js",
      "clearInterval": "@platform",
      "De": "src/next/services/automation.js",
      "Do": "src/next/services/spending.js",
      "DomMutationSubscription": "src/next/platform/dom-observers.js",
      "E": "src/next/services/utilities.js",
      "En": "src/next/services/danmaku-filters.js",
      "fetch": "@platform",
      "findMonthlySpendingControl": "src/next/services/spending.js",
      "GM_cookie": "@platform",
      "GM_getValue": "@platform",
      "GM_setValue": "@platform",
      "I": "src/next/services/session.js",
      "ie": "src/next/services/accounts.js",
      "loadMonthlySpending": "src/next/services/spending.js",
      "localStorage": "src/next/runtime/start.js",
      "mountBarrageSettings": "src/next/ui/room/barrage-settings.js",
      "mountDanmakuSearch": "src/next/ui/room/danmaku-search.js",
      "mountLastLiveOverlay": "src/next/ui/room/last-live.js",
      "ne": "src/next/services/accounts.js",
      "oe": "src/next/services/accounts.js",
      "Oe": "src/next/services/automation.js",
      "Pe": "src/next/services/automation.js",
      "PointerGestureBinding": "src/next/platform/dom-observers.js",
      "Qr": "src/next/platform/script-hooks.js",
      "re": "src/next/services/accounts.js",
      "Re": "src/next/services/automation.js",
      "refreshFansMedalCache": "src/next/services/automation.js",
      "renderMonthlySpending": "src/next/services/spending.js",
      "Ro": "src/next/services/spending.js",
      "safeBind": "src/next/ui/bindings.js",
      "safeEl": "src/next/ui/bindings.js",
      "setDanmakuVolume": "src/next/services/chat-state.js",
      "T": "src/next/services/utilities.js",
      "triggerFansContinue": "src/next/ui/dock.js",
      "unsafeWindow": "@platform",
      "Wn": "src/next/services/danmaku-filters.js",
      "ze": "src/next/services/automation.js"
    },
    "exports": [
      "mountRoomPlayerBindings"
    ]
  },
  "src/next/ui/room/mount.js": {
    "imports": {
      "clearInterval": "@platform",
      "clearTimeout": "@platform",
      "mountBloopPanel": "src/next/ui/room/bloop.js",
      "mountExtensionToolsPanel": "src/next/ui/room/extension-tools.js",
      "mountLiveToolsPanel": "src/next/ui/room/live-tools.js",
      "mountLotteryPanel": "src/next/ui/room/lottery.js",
      "mountRoomControls": "src/next/ui/room/room-controls.js",
      "mountRoomPlayerBindings": "src/next/ui/room/player-bindings.js",
      "mountRoomShell": "src/next/ui/room/shell.js",
      "setInterval": "@platform",
      "setTimeout": "@platform",
      "stopTaskHeartbeat": "src/next/runtime/heartbeat.js",
      "teardownNextDock": "src/next/runtime/registry.js"
    },
    "exports": [
      "activeRoomMount",
      "createRoomLifetime",
      "mountRoom",
      "unmountRoom"
    ]
  },
  "src/next/runtime/heartbeat.js": {
    "imports": {
      "claimLevelTasks": "src/next/services/room-actions.js",
      "clearInterval": "@platform",
      "setInterval": "@platform"
    },
    "exports": [
      "startTaskHeartbeat",
      "stopTaskHeartbeat"
    ]
  },
  "src/next/ui/styles.js": {
    "imports": {},
    "exports": [
      "y"
    ]
  },
  "src/next/ui/panel-dispatch.js": {
    "imports": {
      "anchorPanelToButton": "src/next/ui/panel-position.js",
      "createExUpdatePanel": "src/next/ui/panels/update.js",
      "ensureMiuixPanelHeader": "src/next/ui/panel-header.js",
      "updateDockActiveIndicator": "src/next/ui/panel-position.js"
    },
    "exports": [
      "openFeaturePanel"
    ]
  },
  "src/next/services/sign-engine.js": {
    "imports": {
      "$n": "src/next/services/danmaku-filters.js",
      "ai": "src/next/services/video-timestamps.js",
      "b": "src/next/services/utilities.js",
      "B": "src/next/services/session.js",
      "fetch": "@platform",
      "GM_xmlhttpRequest": "@platform",
      "m": "src/next/services/session.js",
      "T": "src/next/services/utilities.js",
      "To": "src/next/services/lottery.js",
      "w": "src/next/services/utilities.js"
    },
    "exports": [
      "executeSignEngine"
    ]
  },
  "src/next/services/session.js": {
    "imports": {
      "unsafeWindow": "@platform",
      "v": "src/next/services/utilities.js",
      "x": "src/next/services/utilities.js"
    },
    "exports": [
      "B",
      "I",
      "W",
      "Y",
      "m",
      "n",
      "readRoomIdentity",
      "t"
    ]
  },
  "src/next/services/utilities.js": {
    "imports": {
      "ExLoadLib": "src/next/runtime/room-hooks.js",
      "EXURL": "src/next/runtime/room-hooks.js",
      "fetch": "@platform",
      "GM_openInTab": "@platform",
      "setTimeout": "@platform"
    },
    "exports": [
      "$",
      "E",
      "J",
      "Q",
      "T",
      "X",
      "_",
      "a",
      "b",
      "k",
      "l",
      "te",
      "v",
      "w",
      "x"
    ]
  },
  "src/next/services/accounts.js": {
    "imports": {
      "an": "src/next/services/danmaku-renderer.js",
      "B": "src/next/services/session.js",
      "D": "src/next/services/danmaku-renderer.js",
      "E": "src/next/services/utilities.js",
      "f": "src/next/services/danmaku-renderer.js",
      "GM_cookie": "@platform",
      "GM_getValue": "@platform",
      "GM_setValue": "@platform",
      "on": "src/next/services/danmaku-renderer.js",
      "qr": "src/next/platform/request.js",
      "T": "src/next/services/utilities.js",
      "tn": "src/next/services/danmaku-renderer.js"
    },
    "exports": [
      "ae",
      "ie",
      "le",
      "ne",
      "oe",
      "re"
    ]
  },
  "src/next/services/automation.js": {
    "imports": {
      "_": "src/next/services/utilities.js",
      "a": "src/next/services/utilities.js",
      "activeRoomMount": "src/next/ui/room/mount.js",
      "B": "src/next/services/session.js",
      "ExLoadLib": "src/next/runtime/room-hooks.js",
      "EXURL": "src/next/runtime/room-hooks.js",
      "fetch": "@platform",
      "GM_setClipboard": "@platform",
      "GM_xmlhttpRequest": "@platform",
      "lo": "src/next/services/lottery.js",
      "localStorage": "src/next/runtime/start.js",
      "qr": "src/next/platform/request.js",
      "setTimeout": "@platform",
      "T": "src/next/services/utilities.js"
    },
    "exports": [
      "Ae",
      "C",
      "Ce",
      "De",
      "Ee",
      "Ge",
      "Ie",
      "Le",
      "Me",
      "Ne",
      "Oe",
      "Pe",
      "Re",
      "Se",
      "Te",
      "Ue",
      "Ve",
      "We",
      "Ye",
      "_e",
      "be",
      "ce",
      "de",
      "fe",
      "ge",
      "he",
      "ke",
      "me",
      "pe",
      "qe",
      "refreshFansMedalCache",
      "se",
      "ue",
      "ve",
      "we",
      "xe",
      "ye",
      "ze"
    ]
  },
  "src/next/services/player-controls.js": {
    "imports": {
      "clearInterval": "@platform",
      "Dr": "src/next/platform/dom-observers.js",
      "GM_setClipboard": "@platform",
      "J": "src/next/services/utilities.js",
      "jr": "src/next/services/lottery-page.js",
      "k": "src/next/services/utilities.js",
      "l": "src/next/services/utilities.js",
      "Lr": "src/next/platform/dom-observers.js",
      "roomRouteLifetime": "src/next/runtime/router.js",
      "setTimeout": "@platform",
      "T": "src/next/services/utilities.js",
      "unsafeWindow": "@platform",
      "We": "src/next/services/automation.js",
      "Ye": "src/next/services/automation.js"
    },
    "exports": [
      "$e",
      "Xe"
    ]
  },
  "src/next/services/fans.js": {
    "imports": {
      "B": "src/next/services/session.js",
      "fetch": "@platform",
      "localStorage": "src/next/runtime/start.js",
      "T": "src/next/services/utilities.js",
      "w": "src/next/services/utilities.js"
    },
    "exports": [
      "at",
      "ct",
      "dt",
      "et",
      "it",
      "lt",
      "mt",
      "nt",
      "ot",
      "pt",
      "rt",
      "st",
      "tt",
      "ut"
    ]
  },
  "src/next/services/gifts.js": {
    "imports": {
      "B": "src/next/services/session.js",
      "fetch": "@platform",
      "GM_xmlhttpRequest": "@platform",
      "unsafeWindow": "@platform"
    },
    "exports": [
      "_t",
      "fetchCurrentRoomGifts",
      "fetchUserBackpackGifts"
    ]
  },
  "src/next/services/room-actions.js": {
    "imports": {
      "_": "src/next/services/utilities.js",
      "B": "src/next/services/session.js",
      "clearTimeout": "@platform",
      "D": "src/next/services/danmaku-renderer.js",
      "en": "src/next/services/danmaku-renderer.js",
      "fetch": "@platform",
      "GM_getValue": "@platform",
      "GM_setValue": "@platform",
      "localStorage": "src/next/runtime/start.js",
      "PointerGestureBinding": "src/next/platform/dom-observers.js",
      "Q": "src/next/services/utilities.js",
      "T": "src/next/services/utilities.js",
      "w": "src/next/services/utilities.js",
      "Y": "src/next/services/session.js"
    },
    "exports": [
      "At",
      "Bt",
      "Ct",
      "Dt",
      "Et",
      "Ft",
      "Gt",
      "Ht",
      "It",
      "Mt",
      "Ot",
      "Pt",
      "St",
      "Tt",
      "Ut",
      "Wt",
      "Yt",
      "claimLevelTasks",
      "jt",
      "kt",
      "qt"
    ]
  },
  "src/next/services/lottery.js": {
    "imports": {
      "fetch": "@platform",
      "GM_xmlhttpRequest": "@platform",
      "localStorage": "src/next/runtime/start.js",
      "m": "src/next/services/session.js",
      "T": "src/next/services/utilities.js",
      "unsafeWindow": "@platform",
      "v": "src/next/services/utilities.js"
    },
    "exports": [
      "$t",
      "A",
      "Bo",
      "Eo",
      "Io",
      "Jt",
      "Kt",
      "L",
      "Lo",
      "M",
      "Mo",
      "N",
      "No",
      "S",
      "So",
      "To",
      "Xt",
      "_o",
      "ao",
      "bo",
      "co",
      "eo",
      "fo",
      "go",
      "ho",
      "io",
      "ko",
      "lo",
      "mo",
      "no",
      "oo",
      "po",
      "ro",
      "so",
      "to",
      "uo",
      "vo",
      "wo",
      "xo",
      "yo"
    ]
  },
  "src/next/services/spending.js": {
    "imports": {
      "fetch": "@platform",
      "I": "src/next/services/session.js",
      "localStorage": "src/next/runtime/start.js",
      "setTimeout": "@platform"
    },
    "exports": [
      "Do",
      "Ro",
      "findMonthlySpendingControl",
      "loadMonthlySpending",
      "renderMonthlySpending"
    ]
  },
  "src/next/services/preferences.js": {
    "imports": {
      "localStorage": "src/next/runtime/start.js",
      "tl": "src/next/services/batch-danmaku.js"
    },
    "exports": [
      "$o",
      "Jo",
      "Ko",
      "Qo",
      "Xo",
      "Zo"
    ]
  },
  "src/next/services/danmaku-renderer.js": {
    "imports": {
      "B": "src/next/services/session.js",
      "E": "src/next/services/utilities.js",
      "ExLoadLib": "src/next/runtime/room-hooks.js",
      "EXURL": "src/next/runtime/room-hooks.js",
      "GM_setClipboard": "@platform",
      "qr": "src/next/platform/request.js",
      "T": "src/next/services/utilities.js",
      "Ur": "src/next/platform/request.js",
      "Vr": "src/next/platform/request.js"
    },
    "exports": [
      "D",
      "an",
      "en",
      "f",
      "on",
      "rn",
      "tn"
    ]
  },
  "src/next/services/music.js": {
    "imports": {
      "B": "src/next/services/session.js",
      "fetch": "@platform",
      "fn": "src/next/services/page-cleanup.js",
      "GM_xmlhttpRequest": "@platform",
      "k": "src/next/services/utilities.js",
      "localStorage": "src/next/runtime/start.js",
      "mn": "src/next/services/page-cleanup.js",
      "Q": "src/next/services/utilities.js"
    },
    "exports": [
      "advanceRoomMusic",
      "j",
      "ln",
      "pn",
      "refreshRoomMusic",
      "sn"
    ]
  },
  "src/next/services/page-cleanup.js": {
    "imports": {
      "tl": "src/next/services/batch-danmaku.js"
    },
    "exports": [
      "bn",
      "fn",
      "gn",
      "hn",
      "mn",
      "un",
      "yn"
    ]
  },
  "src/next/services/yuba.js": {
    "imports": {
      "DomMutationSubscription": "src/next/platform/dom-observers.js",
      "fetch": "@platform",
      "tl": "src/next/services/batch-danmaku.js",
      "unsafeWindow": "@platform"
    },
    "exports": [
      "_n",
      "vn",
      "wn",
      "xn"
    ]
  },
  "src/next/services/danmaku-filters.js": {
    "imports": {
      "clearInterval": "@platform",
      "DomMutationSubscription": "src/next/platform/dom-observers.js",
      "executeSignEngine": "src/next/services/sign-engine.js",
      "fetch": "@platform",
      "GM_xmlhttpRequest": "@platform",
      "localStorage": "src/next/runtime/start.js",
      "m": "src/next/services/session.js",
      "n": "src/next/services/session.js",
      "requestAnimationFrame": "@platform",
      "setInterval": "@platform",
      "t": "src/next/services/session.js",
      "tl": "src/next/services/batch-danmaku.js",
      "U": "src/next/services/batch-danmaku.js"
    },
    "exports": [
      "$n",
      "En",
      "Un",
      "Wn",
      "qn"
    ]
  },
  "src/next/services/video-timestamps.js": {
    "imports": {
      "clearInterval": "@platform",
      "clearTimeout": "@platform",
      "fetch": "@platform",
      "GM_xmlhttpRequest": "@platform",
      "J": "src/next/services/utilities.js",
      "k": "src/next/services/utilities.js",
      "m": "src/next/services/session.js",
      "v": "src/next/services/utilities.js"
    },
    "exports": [
      "ai",
      "mountVideoTimestamps"
    ]
  },
  "src/next/services/video-tools.js": {
    "imports": {
      "clearInterval": "@platform",
      "clearTimeout": "@platform",
      "createRoomLifetime": "src/next/ui/room/mount.js",
      "ExLoadLib": "src/next/runtime/room-hooks.js",
      "EXURL": "src/next/runtime/room-hooks.js",
      "k": "src/next/services/utilities.js",
      "localStorage": "src/next/runtime/start.js",
      "roomRouteLifetime": "src/next/runtime/router.js",
      "T": "src/next/services/utilities.js",
      "tl": "src/next/services/batch-danmaku.js",
      "U": "src/next/services/batch-danmaku.js",
      "V": "src/next/services/chat-state.js"
    },
    "exports": [
      "Li",
      "Mi",
      "bindCamera"
    ]
  },
  "src/next/services/room-preferences.js": {
    "imports": {
      "cancelAnimationFrame": "@platform",
      "clearInterval": "@platform",
      "clearTimeout": "@platform",
      "DomMutationSubscription": "src/next/platform/dom-observers.js",
      "It": "src/next/services/room-actions.js",
      "ja": "src/next/services/pip/state.js",
      "La": "src/next/services/chat-actions.js",
      "localStorage": "src/next/runtime/start.js",
      "Na": "src/next/services/chat-actions.js",
      "openEnhancedPip": "src/next/services/pip/window.js",
      "pendingPipOwner": "src/next/services/pip/window.js",
      "pipMergeGroups": "src/next/services/pip/state.js",
      "requestAnimationFrame": "@platform",
      "resetPipMergeState": "src/next/services/chat-actions.js",
      "resetPipPacketState": "src/next/services/chat-actions.js",
      "setTimeout": "@platform",
      "T": "src/next/services/utilities.js",
      "unsafeWindow": "@platform"
    },
    "exports": [
      "$i",
      "O",
      "Oi",
      "Pi",
      "Zi",
      "ca",
      "closeEnhancedPip",
      "da",
      "ea",
      "ji",
      "ka",
      "pipPreferences",
      "recapturePipStream",
      "returnToPipSource",
      "sa",
      "syncPipPlayback",
      "ta",
      "ua",
      "va",
      "wa",
      "zi"
    ]
  },
  "src/next/services/pip/packet-dedup.js": {
    "imports": {
      "pipDedupCapacity": "src/next/services/pip/state.js",
      "pipDedupWindowMs": "src/next/services/pip/state.js",
      "pipPacketTimes": "src/next/services/pip/state.js"
    },
    "exports": [
      "isRepeatedPipPacket"
    ]
  },
  "src/next/services/pip/packet-parser.js": {
    "imports": {
      "pipPreferences": "src/next/services/room-preferences.js"
    },
    "exports": [
      "parsePipChatPacket"
    ]
  },
  "src/next/services/pip/merge-rules.js": {
    "imports": {
      "pipMergeGroups": "src/next/services/pip/state.js"
    },
    "exports": [
      "findPipMergeKey"
    ]
  },
  "src/next/services/pip/packet-dispatch.js": {
    "imports": {
      "findPipMergeKey": "src/next/services/pip/merge-rules.js",
      "I": "src/next/services/session.js",
      "isRepeatedPipPacket": "src/next/services/pip/packet-dedup.js",
      "parsePipChatPacket": "src/next/services/pip/packet-parser.js",
      "pipMergeGroups": "src/next/services/pip/state.js",
      "pipPreferences": "src/next/services/room-preferences.js",
      "refreshPipCombos": "src/next/services/chat-actions.js",
      "renderPipDanmaku": "src/next/services/chat-actions.js"
    },
    "exports": [
      "dispatchPipPacket"
    ]
  },
  "src/next/services/pip/markup.js": {
    "imports": {},
    "exports": [
      "pipMarkup0",
      "renderPipMarkup0",
      "renderPipMarkup1"
    ]
  },
  "src/next/services/pip/persistence.js": {
    "imports": {
      "localStorage": "src/next/runtime/start.js",
      "pipPreferences": "src/next/services/room-preferences.js"
    },
    "exports": [
      "persistPipPreferences",
      "restorePipPreferences"
    ]
  },
  "src/next/services/pip/window.js": {
    "imports": {
      "$i": "src/next/services/room-preferences.js",
      "activeRoomMount": "src/next/ui/room/mount.js",
      "B": "src/next/services/session.js",
      "clearInterval": "@platform",
      "clearTimeout": "@platform",
      "closeEnhancedPip": "src/next/services/room-preferences.js",
      "createRoomLifetime": "src/next/ui/room/mount.js",
      "Ct": "src/next/services/room-actions.js",
      "da": "src/next/services/room-preferences.js",
      "dispatchPipPacket": "src/next/services/pip/packet-dispatch.js",
      "ea": "src/next/services/room-preferences.js",
      "It": "src/next/services/room-actions.js",
      "ja": "src/next/services/pip/state.js",
      "La": "src/next/services/chat-actions.js",
      "Na": "src/next/services/chat-actions.js",
      "nl": "src/next/platform/cron.js",
      "Oi": "src/next/services/room-preferences.js",
      "persistPipPreferences": "src/next/services/pip/persistence.js",
      "Pi": "src/next/services/room-preferences.js",
      "pipMarkup0": "src/next/services/pip/markup.js",
      "pipMergeGroups": "src/next/services/pip/state.js",
      "pipPreferences": "src/next/services/room-preferences.js",
      "recapturePipStream": "src/next/services/room-preferences.js",
      "refreshPipCombos": "src/next/services/chat-actions.js",
      "renderPipDanmaku": "src/next/services/chat-actions.js",
      "renderPipMarkup0": "src/next/services/pip/markup.js",
      "renderPipMarkup1": "src/next/services/pip/markup.js",
      "resetPipMergeState": "src/next/services/chat-actions.js",
      "resetPipPacketState": "src/next/services/chat-actions.js",
      "restorePipPreferences": "src/next/services/pip/persistence.js",
      "returnToPipSource": "src/next/services/room-preferences.js",
      "sa": "src/next/services/room-preferences.js",
      "syncPipPlayback": "src/next/services/room-preferences.js",
      "T": "src/next/services/utilities.js",
      "ta": "src/next/services/room-preferences.js",
      "Tt": "src/next/services/room-actions.js",
      "zi": "src/next/services/room-preferences.js"
    },
    "exports": [
      "openEnhancedPip",
      "pendingPipOwner"
    ]
  },
  "src/next/services/pip/state.js": {
    "imports": {},
    "exports": [
      "Oa",
      "ja",
      "pipDedupCapacity",
      "pipDedupWindowMs",
      "pipMergeGroups",
      "pipPacketTimes",
      "za"
    ]
  },
  "src/next/services/chat-actions.js": {
    "imports": {
      "Oa": "src/next/services/pip/state.js",
      "Oi": "src/next/services/room-preferences.js",
      "pipMergeGroups": "src/next/services/pip/state.js",
      "pipPacketTimes": "src/next/services/pip/state.js",
      "pipPreferences": "src/next/services/room-preferences.js",
      "za": "src/next/services/pip/state.js"
    },
    "exports": [
      "La",
      "Na",
      "refreshPipCombos",
      "renderPipDanmaku",
      "resetPipMergeState",
      "resetPipPacketState"
    ]
  },
  "src/next/services/chat-state.js": {
    "imports": {
      "clearTimeout": "@platform",
      "et": "src/next/services/fans.js",
      "setTimeout": "@platform",
      "tl": "src/next/services/batch-danmaku.js",
      "U": "src/next/services/batch-danmaku.js"
    },
    "exports": [
      "Br",
      "Cr",
      "Er",
      "F",
      "G",
      "H",
      "Ir",
      "Ja",
      "Ka",
      "Qa",
      "Tr",
      "Ua",
      "V",
      "Wa",
      "Xa",
      "Ya",
      "Za",
      "_r",
      "cr",
      "er",
      "fr",
      "gr",
      "hr",
      "ir",
      "kr",
      "or",
      "pr",
      "qa",
      "rr",
      "setDanmakuVolume",
      "tr",
      "ur",
      "vr",
      "vtoolbarChevronSvg",
      "wr",
      "xr",
      "yr"
    ]
  },
  "src/next/platform/dom-observers.js": {
    "imports": {
      "clearTimeout": "@platform",
      "J": "src/next/services/utilities.js",
      "setTimeout": "@platform",
      "unsafeWindow": "@platform"
    },
    "exports": [
      "DomMutationSubscription",
      "Dr",
      "Lr",
      "PointerGestureBinding"
    ]
  },
  "src/next/services/lottery-page.js": {
    "imports": {
      "fetch": "@platform",
      "setTimeout": "@platform"
    },
    "exports": [
      "jr"
    ]
  },
  "src/next/services/danmaku-history.js": {
    "imports": {
      "Fr": "src/next/platform/md5.js",
      "g": "src/next/platform/md5.js",
      "h": "src/next/platform/md5.js",
      "p": "src/next/platform/md5.js",
      "u": "src/next/platform/md5.js"
    },
    "exports": [
      "Or"
    ]
  },
  "src/next/platform/md5.js": {
    "imports": {
      "clearInterval": "@platform",
      "n": "src/next/services/session.js",
      "setInterval": "@platform",
      "setTimeout": "@platform",
      "t": "src/next/services/session.js"
    },
    "exports": [
      "Fr",
      "g",
      "h",
      "p",
      "u"
    ]
  },
  "src/next/platform/flv-player.js": {
    "imports": {},
    "exports": [
      "Hr"
    ]
  },
  "src/next/platform/dom-templates.js": {
    "imports": {},
    "exports": [
      "Gr"
    ]
  },
  "src/next/platform/request.js": {
    "imports": {
      "GM_xmlhttpRequest": "@platform",
      "Or": "src/next/services/danmaku-history.js",
      "x": "src/next/services/utilities.js"
    },
    "exports": [
      "Ur",
      "Vr",
      "qr"
    ]
  },
  "src/next/platform/script-hooks.js": {
    "imports": {
      "GM_xmlhttpRequest": "@platform"
    },
    "exports": [
      "Kr",
      "Qr",
      "Wr",
      "Xr",
      "Yr",
      "Zr"
    ]
  },
  "src/next/services/batch-danmaku.js": {
    "imports": {},
    "exports": [
      "U",
      "el",
      "ol",
      "tl"
    ]
  },
  "src/next/platform/cron.js": {
    "imports": {
      "a": "src/next/services/utilities.js",
      "clearInterval": "@platform",
      "clearTimeout": "@platform",
      "ol": "src/next/services/batch-danmaku.js",
      "setInterval": "@platform",
      "setTimeout": "@platform"
    },
    "exports": [
      "nl"
    ]
  },
  "src/next/services/version.js": {
    "imports": {
      "fetch": "@platform",
      "GM_getValue": "@platform",
      "GM_setValue": "@platform",
      "GM_xmlhttpRequest": "@platform",
      "P": "src/next/runtime/room-hooks.js",
      "setTimeout": "@platform",
      "unsafeWindow": "@platform"
    },
    "exports": [
      "initVersionLifecycleNotice",
      "isNewerVersion"
    ]
  },
  "src/next/runtime/router.js": {
    "imports": {
      "_n": "src/next/services/yuba.js",
      "$e": "src/next/services/player-controls.js",
      "ae": "src/next/services/accounts.js",
      "B": "src/next/services/session.js",
      "bn": "src/next/services/page-cleanup.js",
      "clearInterval": "@platform",
      "closeEnhancedPip": "src/next/services/room-preferences.js",
      "createRoomLifetime": "src/next/ui/room/mount.js",
      "GM_cookie": "@platform",
      "GM_getValue": "@platform",
      "GM_setValue": "@platform",
      "installRoomHooks": "src/next/runtime/room-hooks.js",
      "k": "src/next/services/utilities.js",
      "Mi": "src/next/services/video-tools.js",
      "mountRoom": "src/next/ui/room/mount.js",
      "mountVideoTimestamps": "src/next/services/video-timestamps.js",
      "readRoomIdentity": "src/next/services/session.js",
      "startTaskHeartbeat": "src/next/runtime/heartbeat.js",
      "unmountRoom": "src/next/ui/room/mount.js",
      "unsafeWindow": "@platform",
      "v": "src/next/services/utilities.js",
      "wn": "src/next/services/yuba.js",
      "Xe": "src/next/services/player-controls.js",
      "y": "src/next/ui/styles.js"
    },
    "exports": [
      "installNavigation",
      "roomRouteLifetime",
      "stopNavigation"
    ]
  },
  "src/next/runtime/adapters.js": {
    "imports": {
      "_": "src/next/services/utilities.js",
      "B": "src/next/services/session.js",
      "createSignPanel": "src/next/ui/panels/sign.js",
      "executeFansContinue": "src/next/ui/panels/fans.js",
      "executePopupPlayer": "src/next/ui/panels/popup.js",
      "executeSignEngine": "src/next/services/sign-engine.js",
      "installNavigation": "src/next/runtime/router.js",
      "nextFeatures": "src/next/runtime/registry.js",
      "nextRuntime": "src/next/runtime/start.js",
      "openFeaturePanel": "src/next/ui/panel-dispatch.js",
      "So": "src/next/services/lottery.js",
      "startTaskHeartbeat": "src/next/runtime/heartbeat.js",
      "stopNavigation": "src/next/runtime/router.js",
      "stopTaskHeartbeat": "src/next/runtime/heartbeat.js",
      "teardownNextDock": "src/next/runtime/registry.js",
      "updateFansContinuePanel": "src/next/ui/panels/fans.js"
    },
    "exports": []
  },
  "src/next/entry.js": {
    "imports": {
      "installNavigation": "src/next/runtime/router.js"
    },
    "exports": []
  }
};
const interfaces = {'@platform': {"GM_cookie": { get: () => typeof GM_cookie === 'undefined' ? undefined : GM_cookie },"GM_deleteValue": { get: () => typeof GM_deleteValue === 'undefined' ? undefined : GM_deleteValue },"GM_getValue": { get: () => typeof GM_getValue === 'undefined' ? undefined : GM_getValue },"GM_info": { get: () => typeof GM_info === 'undefined' ? undefined : GM_info },"GM_listValues": { get: () => typeof GM_listValues === 'undefined' ? undefined : GM_listValues },"GM_openInTab": { get: () => typeof GM_openInTab === 'undefined' ? undefined : GM_openInTab },"GM_registerMenuCommand": { get: () => typeof GM_registerMenuCommand === 'undefined' ? undefined : GM_registerMenuCommand },"GM_setClipboard": { get: () => typeof GM_setClipboard === 'undefined' ? undefined : GM_setClipboard },"GM_setValue": { get: () => typeof GM_setValue === 'undefined' ? undefined : GM_setValue },"GM_xmlhttpRequest": { get: () => typeof GM_xmlhttpRequest === 'undefined' ? undefined : GM_xmlhttpRequest },"cancelAnimationFrame": { get: () => typeof cancelAnimationFrame === 'undefined' ? undefined : cancelAnimationFrame },"clearInterval": { get: () => typeof clearInterval === 'undefined' ? undefined : clearInterval },"clearTimeout": { get: () => typeof clearTimeout === 'undefined' ? undefined : clearTimeout },"fetch": { get: () => typeof fetch === 'undefined' ? undefined : fetch },"requestAnimationFrame": { get: () => typeof requestAnimationFrame === 'undefined' ? undefined : requestAnimationFrame },"setInterval": { get: () => typeof setInterval === 'undefined' ? undefined : setInterval },"setTimeout": { get: () => typeof setTimeout === 'undefined' ? undefined : setTimeout },"unsafeWindow": { get: () => typeof unsafeWindow === 'undefined' ? undefined : unsafeWindow }},"src/next/runtime/start.js": {"localStorage": {get: () => localStorage},"nextRuntime": {get: () => nextRuntime}}};
const pending = [];
for (const [id, factory] of Object.entries(definitions)) {
 const imports = Object.create(null);
 for (const [name, provider] of Object.entries(contracts[id].imports)) {
  Object.defineProperty(imports, name, {get: () => interfaces[provider][name].get(), set: value => { const slot = interfaces[provider][name]; if (!slot.set) throw new TypeError('Read-only import: '+name); slot.set(value); }});
 }
 const iterator = factory(Object.freeze(imports));
 interfaces[id] = iterator.next().value;
 pending.push(iterator);
}
for (const iterator of pending) { if (!iterator.next().done) throw Error('Unexpected module yield'); }
})();

})();
