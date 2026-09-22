/* ==================== 自选直播线路 CDN（原生主上下文请求改写） ==================== */
/*
 * 原理与可行性（实测确认，勿改走“换流地址主机”的路子）：
 *   1. 斗鱼取流接口 getH5Play 的请求体支持 cdn 参数，传入后平台会为该线路单独签发
 *      地址与令牌（实测 cdn=hw-h5 返回 hw1a.douyucdn2.cn，cdn=hs-h5 返回 huos1a.douyucdn2.cn）。
 *   2. 令牌与线路绑定：wsAuth / token / fcdn 三项均随 cdn 变化，把 A 线路的地址直接改成
 *      B 线路的主机请求会 **403**。因此绝不能改写响应里的流地址，只能改写请求参数，
 *      让斗鱼按用户所选线路重新签发。
 *   3. 改写手法与 src/core/quality.js 改写 rate=0 完全一致（同一批接口、同一套 open/send 钩子）。
 *
 * 职责：
 *   A. 请求改写：当用户选定了线路时，把 getH5Play 类请求体里的 cdn= 替换为所选线路。
 *   B. 线路清单采集：从播放器自身的 getH5Play 响应里抓取 cdnsWithName 写入 localStorage，
 *      供面板展示，从而不额外发一次请求、也不需要重复实现加密封包逻辑。
 *
 * 与 UI 的通信约定（跨上下文靠 localStorage，主上下文与用户脚本沙箱同源共享）：
 *   ExSave_CDN     = { cdn: "hs-h5", name: "线路13" }   用户所选线路；cdn 为空串表示跟随平台自动
 *   ExSave_CDNList = { rid: "9999", list: [{name, cdn}] }  当前房间可用线路清单
 */

(function () {
    function runSelfSelectCDN() {
        "use strict";

        var STORE_KEY = "ExSave_CDN";
        var LIST_KEY = "ExSave_CDNList";

        function isStreamRequest(url) {
            return typeof url === "string" &&
                (url.indexOf("getH5Play") !== -1 || url.indexOf("/super/stream/") !== -1);
        }

        function readSelectedCdn() {
            try {
                var raw = localStorage.getItem(STORE_KEY);
                if (!raw) return "";
                var o = JSON.parse(raw);
                return (o && typeof o.cdn === "string") ? o.cdn : "";
            } catch (e) {
                return "";
            }
        }

        // 从播放器自身的响应里采集线路清单，零额外请求
        function captureCdnList(url, text) {
            try {
                if (!text || text.charCodeAt(0) !== 123) return; // 非 JSON 直接跳过
                var d = JSON.parse(text);
                var list = d && d.data && d.data.cdnsWithName;
                if (!Array.isArray(list) || list.length === 0) return;
                var m = String(url).match(/getH5Play\w*\/(\d+)/) || String(url).match(/\/(\d+)(?:[\/?]|$)/);
                localStorage.setItem(LIST_KEY, JSON.stringify({
                    rid: m ? m[1] : "",
                    list: list.map(function (it) {
                        return { name: it && it.name ? String(it.name) : "", cdn: it && it.cdn ? String(it.cdn) : "" };
                    })
                }));
            } catch (e) { }
        }

        function rewriteBody(body) {
            if (typeof body !== "string") return body;
            var cdn = readSelectedCdn();
            if (!cdn) return body; // 未选择线路 → 完全透明放行
            if (/(^|&)cdn=/.test(body)) {
                return body.replace(/(^|&)cdn=[^&]*/, "$1cdn=" + encodeURIComponent(cdn));
            }
            return body + "&cdn=" + encodeURIComponent(cdn);
        }

        // ---- 1. 接管 fetch ----
        var origFetch = window.fetch;
        if (origFetch) {
            window.fetch = function () {
                var args = Array.prototype.slice.call(arguments);
                var url = args[0];
                try {
                    if (isStreamRequest(url) && args[1] && typeof args[1].body === "string") {
                        args[1].body = rewriteBody(args[1].body);
                    }
                } catch (e) { }

                return origFetch.apply(this, args).then(function (resp) {
                    try {
                        if (isStreamRequest(url)) {
                            resp.clone().text().then(function (t) { captureCdnList(url, t); }).catch(function () { });
                        }
                    } catch (e) { }
                    return resp;
                });
            };
        }

        // ---- 2. 接管 XMLHttpRequest ----
        var origOpen = window.XMLHttpRequest.prototype.open;
        var origSend = window.XMLHttpRequest.prototype.send;

        window.XMLHttpRequest.prototype.open = function (method, url) {
            this._ex_cdn_url = url;
            return origOpen.apply(this, arguments);
        };

        window.XMLHttpRequest.prototype.send = function (body) {
            var url = this._ex_cdn_url;

            try {
                if (isStreamRequest(url)) body = rewriteBody(body);
            } catch (e) { }

            // 采集线路清单：只读不修改，故单独 defineProperty 一层 getter
            if (isStreamRequest(url)) {
                try {
                    var origGetter = Object.getOwnPropertyDescriptor(window.XMLHttpRequest.prototype, "responseText");
                    if (origGetter && origGetter.get) {
                        var xhr = this;
                        Object.defineProperty(xhr, "responseText", {
                            get: function () {
                                var realText = origGetter.get.call(this);
                                captureCdnList(url, realText);
                                return realText;
                            },
                            configurable: true
                        });
                    }
                } catch (e) { }
            }

            return origSend.call(this, body);
        };
    }

    try {
        var s = document.createElement("script");
        s.textContent = "(" + runSelfSelectCDN.toString() + ")();\n//# sourceURL=DouyuEx.SelfSelectCDN.js";
        (document.head || document.documentElement).appendChild(s);
        s.remove();
    } catch (e) {
        console.error("[DouyuEx] 自选线路系统注入失败:", e);
    }
})();
