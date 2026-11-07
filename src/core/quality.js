/* ==================== 极速无缝最高画质拦截系统（原生主上下文全链路接管） ====================
 * 基线方案（2026-11-06）：进房先按「基线」起播，基线 = 该房间上次实测到的最高档，没有就是 0。
 *   · 基线对得上 → 首流就是最高档，零切流。
 *   · 基线对不上（房间新加 2K / 取消了 2K）→ 拿到响应后用正确档位补取一次并替换响应，画面直接是新档；
 *     补取失败或超时保留原响应，绝不把能播的流弄没。
 * 全程走请求层，不做任何 DOM 点击。
 */
(function() {
    function runSeamlessQuality() {
        "use strict";
        if (window.__exQualityInstalled) return;
        window.__exQualityInstalled = true;
        var isMax = false;
        try {
            var conf = localStorage.getItem("ExSave_HighestVideoQuality");
            if (conf && JSON.parse(conf).isHighestVideoQuality) isMax = true;
        } catch(e){}
        if (!isMax) return;

        var BASELINE_KEY = "ExSave_QualityBaseline";
        var BASELINE_TTL = 7 * 86400000;
        var BASELINE_MAX_ROOMS = 30;
        var REPLAY_BUDGET = 2200;

        var _lastPath = location.pathname;
        var _roomEnterTime = Date.now();
        var _replayed = false;

        function roomKey() {
            var m = String(location.pathname).match(/^\/(?:beta\/)?(\d+)/);
            return m ? m[1] : "";
        }

        function readBaseline() {
            var room = roomKey();
            if (!room) return 0;
            try {
                var all = JSON.parse(localStorage.getItem(BASELINE_KEY) || "{}");
                var rec = all[room];
                if (!rec) return 0;
                if (!rec.at || Date.now() - rec.at > BASELINE_TTL) return 0;
                var rate = Number(rec.rate);
                return isFinite(rate) && rate >= 0 ? rate : 0;
            } catch (e) { return 0; }
        }

        function writeBaseline(rate, fingerprint) {
            var room = roomKey();
            if (!room) return;
            try {
                var all = JSON.parse(localStorage.getItem(BASELINE_KEY) || "{}");
                all[room] = { rate: Number(rate) || 0, fp: String(fingerprint || ""), at: Date.now() };
                var keys = Object.keys(all);
                if (keys.length > BASELINE_MAX_ROOMS) {
                    keys.sort(function (a, b) { return (all[a].at || 0) - (all[b].at || 0); });
                    for (var i = 0; i < keys.length - BASELINE_MAX_ROOMS; i++) delete all[keys[i]];
                }
                localStorage.setItem(BASELINE_KEY, JSON.stringify(all));
            } catch (e) {}
        }

        function ladderFingerprint(list) {
            var parts = [];
            for (var i = 0; i < list.length; i++) parts.push(list[i].rate + ":" + list[i].name);
            return parts.join("|");
        }

        var currentBaseline = readBaseline();

        function dbg(msg) {
            try { (window.__exQualityDebug = window.__exQualityDebug || []).push(Math.round(performance.now()) + " " + msg); } catch (e) {}
        }
        dbg("boot path=" + location.pathname + " base=" + currentBaseline);

        function isInitialLoad() {
            if (_lastPath !== location.pathname) {
                _lastPath = location.pathname;
                _roomEnterTime = Date.now();
                _replayed = false;
                currentBaseline = readBaseline();
            }
            return (Date.now() - _roomEnterTime) < 12000;
        }

        /* ---------- 1. 按基线提前锁定播放器偏好（附带，不是主路径） ---------- */
        function applyPreference(rate) {
            try {
                var now = Date.now();
                var forever = now + 86400000 * 365;
                var val = Number(rate) || 0;
                var pack = function (v) { return JSON.stringify({ c: now, e: forever, v: JSON.stringify(v), r: 1 }); };
                localStorage.setItem("rateRecordTime_h5p_room", pack(val));
                localStorage.setItem("realRateModel2_h5p_room", pack(val));
                localStorage.setItem("player_storage_quality_h5p_room", pack(val));
                localStorage.setItem("player_storage_rate_h5p_room", pack(val));
                localStorage.setItem("realRateModel2", pack(val));
                localStorage.setItem("player_storage_quality", pack(val));
            } catch (e) {}
        }
        applyPreference(currentBaseline);

        /* ---------- 2. 斩断低码率预载流 ---------- */
        try {
            var _preloadVal = undefined;
            Object.defineProperty(window, 'preloadStreamUrlPromise', {
                configurable: true,
                enumerable: true,
                get: function() { return isInitialLoad() ? undefined : _preloadVal; },
                set: function(v) { _preloadVal = v; }
            });
        } catch(e){}

        /* ---------- 3. 拦截首流函数 ---------- */
        try {
            var _origFirstStream = undefined;
            Object.defineProperty(window, 'getLegacyFirstStream', {
                configurable: true,
                enumerable: true,
                get: function() { return _origFirstStream; },
                set: function(fn) {
                    if (typeof fn === 'function') {
                        _origFirstStream = function(opts) {
                            try {
                                if (opts && typeof opts === 'object' && isInitialLoad()) opts.rate = currentBaseline;
                            } catch(err){}
                            return fn.call(this, opts);
                        };
                    } else {
                        _origFirstStream = fn;
                    }
                }
            });
        } catch(e){}

        function urlOf(input) {
            if (typeof input === "string") return input;
            if (input && typeof input.url === "string") return input.url;
            try { return String(input || ""); } catch (e) { return ""; }
        }

        function rewriteRate(body, rate) {
            if (typeof body !== "string" || !body) return body;
            if (body.indexOf("rate=") >= 0) return body.replace(/(^|&)rate=[^&]*/, "$1rate=" + rate);
            return body + "&rate=" + rate;
        }

        function readLadder(data) {
            if (!data || typeof data !== "object") return null;
            var bucket = data.data || data.room || null;
            if (!bucket || !Array.isArray(bucket.multirates)) return null;
            return bucket.multirates;
        }

        /* 基线 → 该给的档位。只有两个场景要补取一次：
         *   A 基线 0 起播、档位表首档更高（房间新开了 2K）→ 用首档；
         *   B 基线在档位表里已不存在（主播降档 / 权限变化，请求被系统回落）→ 回 0。
         * 除此之外一律不切流：读到的是基线档就直接用，读到别的档也不补取，
         * 只把基线刷新成这次看到的最高档（下次进房自然按它起播）。
         * 改基线时必须同步改内存里的 currentBaseline：切档后同一 12 秒窗口里还会再来取流，
         * 那边是按 currentBaseline 改写发包的，不同步就会把画面打回旧档。
         * 返回 null 表示不用补取。 */
        function targetRate(list) {
            var topRate = Number(list[0].rate);
            if (!isFinite(topRate)) return null;
            var fp = ladderFingerprint(list);
            var exists = false;
            for (var i = 0; i < list.length; i++) {
                if (Number(list[i].rate) === Number(currentBaseline)) { exists = true; break; }
            }
            if (!exists) {
                writeBaseline(0, fp);
                currentBaseline = 0;
                dbg("baseline gone -> 0");
                return 0;
            }
            writeBaseline(topRate, fp);
            if (topRate !== Number(currentBaseline)) {
                currentBaseline = topRate;
                dbg("new top " + topRate + " -> switch");
                return topRate;
            }
            return null;
        }

        /* ---------- 4. 接管 Fetch：改 rate + 补取替换响应（#11 的路子） ---------- */
        var origFetch = window.fetch;
        if (origFetch) {
            window.fetch = async function(input, init) {
                var args = [input, init];
                var url = "";
                try {
                    url = urlOf(input);
                    if (isInitialLoad() && url && (url.indexOf('getH5Play') >= 0 || url.indexOf('/super/stream/') >= 0)) {
                        if (init && typeof init.body === 'string') {
                            args[1] = Object.assign({}, init);
                            args[1].body = rewriteRate(init.body, currentBaseline);
                        } else if (typeof Request !== 'undefined' && input instanceof Request) {
                            var text = await input.clone().text();
                            var next = rewriteRate(text, currentBaseline);
                            if (next !== text) { args[0] = new Request(input, { body: next }); dbg("rewrote request -> " + currentBaseline); }
                        }
                    }
                } catch(e){}

                var resp = await origFetch.apply(this, args);

                try {
                    var reqUrl = urlOf(args[0]);
                    if (isInitialLoad() && reqUrl && (reqUrl.indexOf('getH5Play') >= 0 || reqUrl.indexOf('/betard/') >= 0)) {
                        var text2 = await resp.clone().text();
                        var data = JSON.parse(text2);
                        var ladder = readLadder(data);
                        if (ladder) {
                            var want = targetRate(ladder);
                            if (want !== null && !_replayed) {
                                _replayed = true;
                                var replayArgs = await buildReplay(input, init, args, want);
                                if (replayArgs) {
                                    var replay = await replayWithBudget(this, replayArgs);
                                    if (replay && replay.ok && replay.data && Number((replay.data.data || {}).rate) === Number(want)) {
                                        dbg("replay ok rate=" + want);
                                        return new Response(replay.text, { status: replay.status, statusText: replay.statusText, headers: replay.headers });
                                    }
                                    dbg("replay failed, keep original");
                                }
                            }
                        }
                    }
                } catch(e){}
                return resp;
            };
        }

        async function buildReplay(input, init, usedArgs, want) {
            try {
                if (init && typeof init.body === 'string') {
                    var copy = Object.assign({}, init);
                    copy.body = rewriteRate(init.body, want);
                    return [input, copy];
                }
                if (typeof Request !== 'undefined' && input instanceof Request) {
                    var text = await input.clone().text();
                    return [new Request(input, { body: rewriteRate(text, want), signal: undefined })];
                }
            } catch (e) {}
            return null;
        }

        function replayWithBudget(ctx, args) {
            return new Promise(function (resolve) {
                var done = false;
                var timer = setTimeout(function () {
                    if (done) return;
                    done = true;
                    resolve(null);
                }, REPLAY_BUDGET);
                var ctrl = typeof AbortController === "function" ? new AbortController() : null;
                var callArgs = args.slice();
                try {
                    if (callArgs[1] && typeof callArgs[1] === "object") {
                        callArgs[1] = Object.assign({}, callArgs[1], ctrl ? { signal: ctrl.signal } : {});
                    }
                } catch (e) {}
                Promise.resolve().then(function () {
                    return origFetch.apply(ctx, callArgs);
                }).then(async function (r) {
                    var t = await r.clone().text();
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    var parsed = null;
                    try { parsed = JSON.parse(t); } catch (e) {}
                    resolve({ ok: r.ok, status: r.status, statusText: r.statusText, headers: r.headers, text: t, data: parsed });
                }).catch(function () {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    if (ctrl) { try { ctrl.abort(); } catch (e) {} }
                    resolve(null);
                });
            });
        }

        /* ---------- 5. 接管 XHR：只改 rate，响应只用来刷新基线（XHR 无法替换响应体） ---------- */
        var origOpen = window.XMLHttpRequest.prototype.open;
        var origSend = window.XMLHttpRequest.prototype.send;
        window.XMLHttpRequest.prototype.open = function(method, url) {
            this._ex_h5_url = url;
            return origOpen.apply(this, arguments);
        };
        window.XMLHttpRequest.prototype.send = function(body) {
            try {
                if (isInitialLoad() && this._ex_h5_url && typeof this._ex_h5_url === 'string' && (this._ex_h5_url.indexOf('getH5Play') >= 0 || this._ex_h5_url.indexOf('/super/stream/') >= 0)) {
                    if (typeof body === 'string') body = rewriteRate(body, currentBaseline);
                }
            } catch(e){}

            var xhr = this;
            try {
                if (this._ex_h5_url && typeof this._ex_h5_url === 'string' && (this._ex_h5_url.indexOf('getH5Play') >= 0 || this._ex_h5_url.indexOf('/betard/') >= 0)) {
                    xhr.addEventListener("load", function () {
                        try {
                            var realText = xhr.responseType === "json" ? JSON.stringify(xhr.response) : xhr.responseText;
                            var d = JSON.parse(realText);
                            var ladder = readLadder(d);
                            if (ladder) {
                                dbg("xhr ladder top=" + ladder[0].rate);
                                targetRate(ladder);
                            }
                        } catch (e) {}
                    });
                }
            } catch(e){}
            return origSend.call(this, body);
        };
    }

    /* 跳进页面主世界执行：篡改猴沙箱里必须靠 <script> 标签跳出去。
     * Chrome 的 document-start 早期 document.head / documentElement 都还是 null（实测），
     * 这一刻没有节点可挂，直接 appendChild 会抛错、整个画质系统静默失效；
     * 所以拿不到宿主就轮询等到 DOM 出现再挂（最多 5 秒），而不是一次失败就放弃。 */
    function hopToPageWorld() {
        var host = document.head || document.documentElement;
        if (!host) return false;
        try {
            var s = document.createElement("script");
            s.textContent = "(" + runSeamlessQuality.toString() + ")();\n//# sourceURL=DouyuEx.SeamlessQuality.js";
            host.appendChild(s);
            s.remove();
            return true;
        } catch (e) {
            return false;
        }
    }

    try {
        if (!hopToPageWorld()) {
            var tries = 0;
            var timer = setInterval(function() {
                if (hopToPageWorld()) {
                    clearInterval(timer);
                } else if (++tries > 5000) {
                    clearInterval(timer);
                    console.error("[DouyuEx] 画质系统注入失败：DOM 迟迟未就绪");
                }
            }, 1);
        }
    } catch(e) {
        console.error("[DouyuEx] 画质系统注入失败:", e);
    }
})();
