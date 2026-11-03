/* 起播画质：档位 ID 不是清晰度，先读取房间实际提供的 multirates。 */
(function() {
    function runSeamlessQuality() {
        "use strict";
        try {
            var config = JSON.parse(localStorage.getItem("ExSave_HighestVideoQuality") || "null");
            if (!config || !config.isHighestVideoQuality) return;
        } catch (error) { return; }

        var initialPath = location.pathname;
        var enteredAt = Date.now();
        var generation = 0;
        var selected = null;
        var streamRoom = "";
        var retried = false;
        var selectionFailed = false;
        var menuTimer = null;
        var cacheKey = "ExSave_HighestQualityRate";
        var preferenceKeys = ["realRateModel2_h5p_room", "player_storage_quality_h5p_room", "player_storage_rate_h5p_room", "realRateModel2", "player_storage_quality"];

        function isInitialLoad() {
            if (initialPath !== location.pathname) {
                initialPath = location.pathname;
                enteredAt = Date.now();
                generation++;
                selected = null;
                streamRoom = "";
                retried = false;
                selectionFailed = false;
                if (menuTimer !== null) clearTimeout(menuTimer);
                menuTimer = null;
            }
            return Date.now() - enteredAt < 12000;
        }

        function endpoint(input) {
            try {
                var address = new URL(typeof input === "string" ? input : input.url || String(input), location.href);
                if (!/(^|\.)douyu\.com$/.test(address.hostname)) return null;
                var match = address.pathname.match(/\/(betard|getH5Play\w*|super\/stream)\/(\d+)/);
                return match ? { room: match[2], stream: match[1] !== "betard" } : null;
            } catch (error) { return null; }
        }

        function validRate(value) {
            if (typeof value !== "number" && !(typeof value === "string" && /^\d+$/.test(value.trim()))) return false;
            return Number.isInteger(Number(value)) && Number(value) >= 0;
        }

        function highest(rates) {
            if (!Array.isArray(rates)) return null;
            // 斗鱼返回的档位顺序就是播放器菜单顺序：最上方有效项为最高档。
            // name、bit、rate 都不用于重排；只跳过缺少有效 ID 的记录。
            for (var index = 0; index < rates.length; index++) {
                var entry = rates[index];
                if (!entry || typeof entry !== "object") continue;
                var rate = validRate(entry.rate) ? entry.rate : entry.type;
                // diamondFan 是档位属性，不代表当前账号无权限；最终由取流接口校验。
                if (validRate(rate)) return { rate: Number(rate), name: String(entry.name || "") };
            }
            return null;
        }

        function savePreference() {
            if (!selected) return;
            try {
                var now = Date.now();
                var packed = JSON.stringify({ c: now, e: now + 86400000 * 365, v: JSON.stringify(selected.rate), r: 1 });
                preferenceKeys.forEach(function(key) { localStorage.setItem(key, packed); });
                // rateRecordTime 属于未登录限流标记，不是档位，交给 NoLogin 管理。
                localStorage.setItem(cacheKey, JSON.stringify({ path: initialPath, at: now, rate: selected.rate, name: selected.name }));
            } catch (error) {}
        }

        try {
            var cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
            if (cached && cached.path === initialPath && Date.now() - cached.at >= 0 && Date.now() - cached.at < 300000 && validRate(cached.rate)) {
                selected = { rate: Number(cached.rate), name: String(cached.name || "") };
                savePreference();
            }
        } catch (error) {}

        function observe(data, request, requestGeneration) {
            if (!isInitialLoad() || selectionFailed || requestGeneration !== generation || !data || (data.error !== undefined && Number(data.error) !== 0)) return false;
            if (streamRoom && streamRoom !== request.room) return false;
            if (!request.stream) {
                var pathRoom = (initialPath.match(/\/(\d+)(?:\/|$)/) || [])[1];
                var pageRoom = window.$ROOM && String(window.$ROOM.room_id || "");
                if (request.room !== pathRoom && request.room !== pageRoom && request.room !== streamRoom) return false;
            }
            var room = request.stream ? data.data : data.room;
            var choice = room && highest(room.multirates);
            if (!choice) return false;
            if (request.stream) streamRoom = request.room; // 转播房间的流 RID 允许不同于网址 RID。
            selected = choice;
            savePreference();
            if (!request.stream) room.rate = selected.rate;
            return true;
        }

        function keepPlayable(data, requestGeneration) {
            isInitialLoad();
            if (generation !== requestGeneration) return;
            if (data && data.data && validRate(data.data.rate)) {
                selected = { rate: Number(data.data.rate), name: "" };
                savePreference();
            }
            selected = null;
            selectionFailed = true;
            try { localStorage.removeItem(cacheKey); } catch (error) {}
        }

        function rewriteBody(body, rate) {
            if (typeof body === "string" || body instanceof URLSearchParams) {
                if (typeof body === "string" && /^\s*[\[{]/.test(body)) return body;
                var params = new URLSearchParams(body);
                params.set("rate", String(rate));
                return typeof body === "string" ? params.toString() : params;
            }
            if (typeof FormData !== "undefined" && body instanceof FormData) {
                var form = new FormData();
                body.forEach(function(value, key) { form.append(key, value); });
                form.set("rate", String(rate));
                return form;
            }
            return body;
        }

        async function fetchArgs(input, init, rate) {
            var options = Object.assign({}, init);
            if (typeof Request !== "undefined" && input instanceof Request) {
                var request = new Request(input.clone(), options);
                if (request.method === "GET" || request.method === "HEAD") return null;
                var contentType = request.headers.get("content-type") || "";
                if (!contentType.includes("application/x-www-form-urlencoded")) return null;
                options = { body: rewriteBody(await request.clone().text(), rate) };
                return [new Request(request, options)];
            }
            if (!(typeof options.body === "string" || options.body instanceof URLSearchParams || (typeof FormData !== "undefined" && options.body instanceof FormData))) return null;
            if (typeof options.body === "string" && /^\s*[\[{]/.test(options.body)) return null;
            options.body = rewriteBody(options.body, rate);
            return [input, options];
        }

        function requestSignal(input, init) {
            return init && "signal" in init ? init.signal : input && input.signal;
        }

        // 仅补取受此预算限制；首个正常请求沿用浏览器原有超时和取消行为。
        // 把读 JSON 也计入预算，服务端卡住响应体时同样返回原来的可播放流。
        async function boundedReplay(context, args) {
            var budget = Math.min(2500, 12000 - (Date.now() - enteredAt));
            if (budget <= 0 || typeof AbortController !== "function") return null;
            var controller = new AbortController();
            var callerSignal = requestSignal(args[0], args[1]);
            var timer;
            var onAbort;
            try {
                var abortPromise = new Promise(function(resolve, reject) {
                    onAbort = function() {
                        var error = callerSignal.reason || new DOMException("The request was aborted", "AbortError");
                        reject(error);
                        controller.abort(error);
                    };
                    if (callerSignal) {
                        if (callerSignal.aborted) onAbort();
                        else callerSignal.addEventListener("abort", onAbort, { once: true });
                    }
                });
                var timeoutPromise = new Promise(function(resolve) {
                    timer = setTimeout(function() { resolve(null); controller.abort(); }, budget);
                });
                var replayPromise = Promise.resolve().then(function() {
                    if (controller.signal.aborted) return null;
                    var options = Object.assign({}, args[1], { signal: controller.signal });
                    return originalFetch.call(context, args[0], options).then(async function(response) {
                        return { response: response, data: await response.clone().json() };
                    });
                });
                return await Promise.race([replayPromise, timeoutPromise, abortPromise]);
            } finally {
                clearTimeout(timer);
                if (callerSignal && onAbort) callerSignal.removeEventListener("abort", onAbort);
            }
        }

        // fetch 首次拿到档位后最多补取一次真实的最高档流，避免把低档 URL 配上伪造 rate。
        // 重试失败时保留原来的可播放响应，12 秒保护期结束后手动切换完全放行。
        var originalFetch = window.fetch;
        if (originalFetch) window.fetch = async function(input, init) {
            var request = endpoint(input);
            var active = isInitialLoad();
            var requestGeneration = generation;
            // Request 的流式 body 在原生 fetch 后会消耗，补取必须使用事先保存的副本。
            var replayInput = input;
            if (active && request && typeof Request !== "undefined" && input instanceof Request) {
                try { replayInput = input.clone(); } catch (error) {}
            }
            var args = [input, init];
            var usedPreference = false;
            if (active && request && request.stream && selected && (!streamRoom || streamRoom === request.room)) {
                try {
                    var preferredArgs = await fetchArgs(input, init, selected.rate);
                    if (preferredArgs) { args = preferredArgs; usedPreference = true; }
                } catch (error) {}
            }
            var response = await originalFetch.apply(this, args);
            if (!request || !active) return response;
            var didReplay = false;
            try {
                var data = await response.clone().json();
                // 缓存只是短期提示。档位撤销或当前账号无权访问时，原请求仍必须能起播。
                if (request.stream && usedPreference && (!response.ok || (data && data.error !== undefined && Number(data.error) !== 0)) && !retried && isInitialLoad() && generation === requestGeneration) {
                    retried = true;
                    selected = null;
                    try { localStorage.removeItem(cacheKey); } catch (error) {}
                    didReplay = true;
                    var fallback = await boundedReplay(this, [replayInput, init]);
                    if (fallback && fallback.response.ok && fallback.data && Number(fallback.data.error) === 0) {
                        keepPlayable(fallback.data, requestGeneration);
                        return fallback.response;
                    }
                    keepPlayable(null, requestGeneration);
                    return response;
                }
                if (!observe(data, request, requestGeneration)) return response;
                if (!request.stream) return new Response(JSON.stringify(data), { status: response.status, statusText: response.statusText, headers: response.headers });
                if (Number(data.data.rate) !== selected.rate && !retried) {
                    var retryRate = selected.rate;
                    var retryArgs = await fetchArgs(replayInput, init, retryRate);
                    if (!retryArgs || !isInitialLoad() || generation !== requestGeneration || retried) return response;
                    retried = true;
                    console.info("[DouyuEx] 起播画质补选", { room: request.room, from: data.data.rate, to: retryRate, name: selected.name });
                    didReplay = true;
                    var retry = await boundedReplay(this, retryArgs);
                    var retryData = retry && retry.data;
                    if (isInitialLoad() && generation === requestGeneration && retry && retry.response.ok && retryData && Number(retryData.error) === 0 && retryData.data && Number(retryData.data.rate) === retryRate) return retry.response;
                    keepPlayable(data, requestGeneration);
                }
            } catch (error) {
                var signal = requestSignal(input, init);
                if (signal && signal.aborted) throw error;
                if (didReplay) keepPlayable(data, requestGeneration);
            }
            return response;
        };

        // XHR 仍使用原生传输，response / responseText 共用一次解析，不伪造流的 rate。
        var xhrPrototype = window.XMLHttpRequest.prototype;
        var originalOpen = xhrPrototype.open;
        var originalSend = xhrPrototype.send;
        xhrPrototype.open = function(method, url) {
            // 同一 XHR 可 open/send 多次，不能把上一请求的 getter 带到无关接口。
            if (this.__exQualityGetters) {
                ["responseText", "response"].forEach(function(key) {
                    var descriptor = Object.getOwnPropertyDescriptor(this, key);
                    if (descriptor && descriptor.get === this.__exQualityGetters[key]) delete this[key];
                }, this);
                this.__exQualityGetters = null;
            }
            this.__exQualityRequest = endpoint(url);
            isInitialLoad();
            this.__exQualityGeneration = generation;
            return originalOpen.apply(this, arguments);
        };
        xhrPrototype.send = function(body) {
            var xhr = this;
            var request = xhr.__exQualityRequest;
            if (!request || !isInitialLoad()) return originalSend.call(xhr, body);
            // XHR 无法在同步 getter 内安全替换异步失败响应，保留原请求，让原生播放器
            // 处理权限/错误；拿到档位后仅做一次有界菜单补选。
            var textAccessor = Object.getOwnPropertyDescriptor(xhrPrototype, "responseText");
            var responseAccessor = Object.getOwnPropertyDescriptor(xhrPrototype, "response");
            var requestGeneration = xhr.__exQualityGeneration;
            var lastText;
            var lastData;
            function inspect(value) {
                if (xhr.__exQualityRequest !== request || xhr.__exQualityGeneration !== requestGeneration || !isInitialLoad()) return value;
                if (value === lastText) return lastData;
                lastText = value;
                try {
                    var data = typeof value === "string" ? JSON.parse(value) : value;
                    if (observe(data, request, requestGeneration) && request.stream && Number(data.data.rate) !== selected.rate) scheduleMenuSelection();
                    lastData = typeof value === "string" ? JSON.stringify(data) : data;
                } catch (error) { lastData = value; }
                return lastData;
            }
            try {
                xhr.__exQualityGetters = {};
                if (textAccessor && textAccessor.get) {
                    xhr.__exQualityGetters.responseText = function() { return inspect(textAccessor.get.call(xhr)); };
                    Object.defineProperty(xhr, "responseText", { configurable: true, get: xhr.__exQualityGetters.responseText });
                }
                if (responseAccessor && responseAccessor.get) {
                    xhr.__exQualityGetters.response = function() { return inspect(responseAccessor.get.call(xhr)); };
                    Object.defineProperty(xhr, "response", { configurable: true, get: xhr.__exQualityGetters.response });
                }
                xhr.addEventListener("load", function() {
                    try { if (xhr.responseType === "json") void xhr.response; else void xhr.responseText; } catch (error) {}
                }, { once: true });
            } catch (error) {}
            return originalSend.call(xhr, body);
        };

        function scheduleMenuSelection() {
            if (retried || menuTimer !== null || !selected || !selected.name) return;
            var requestGeneration = generation;
            var openedMenu = false;
            function trySelect() {
                menuTimer = null;
                if (!isInitialLoad() || requestGeneration !== generation || retried) return;
                var label = document.querySelector('[class^="tipItem-"] input[value^="画质"]');
                var group = label && label.parentElement;
                var items = group ? group.querySelectorAll("ul > li") : [];
                for (var index = 0; index < items.length; index++) {
                    if (items[index].textContent.trim() === selected.name) {
                        retried = true;
                        var alreadySelected = String(items[index].className || "").split(/\s+/).some(function(name) { return name.indexOf("selected-") === 0; });
                        if (!alreadySelected) items[index].click();
                        return;
                    }
                }
                // 斗鱼在首次悬停时才创建档位列表。只展开一次，不持续抢用户焦点。
                var control = document.querySelector(".rate-ec9440");
                if (!openedMenu && control && typeof MouseEvent === "function") {
                    openedMenu = true;
                    control.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, view: window }));
                }
                menuTimer = setTimeout(trySelect, 200);
            }
            menuTimer = setTimeout(trySelect, 0);
        }

        try {
            var firstStream = window.getLegacyFirstStream;
            function wrapFirstStream(fn) {
                if (typeof fn !== "function") return fn;
                return function(options) {
                    var args = Array.prototype.slice.call(arguments);
                    if (options && typeof options === "object" && isInitialLoad() && selected) args[0] = Object.assign({}, options, { rate: selected.rate });
                    return fn.apply(this, args);
                };
            }
            firstStream = wrapFirstStream(firstStream);
            Object.defineProperty(window, "getLegacyFirstStream", { configurable: true, get: function() { return firstStream; }, set: function(fn) { firstStream = wrapFirstStream(fn); } });
            var preload = window.preloadStreamUrlPromise;
            Object.defineProperty(window, "preloadStreamUrlPromise", { configurable: true, get: function() { return isInitialLoad() ? undefined : preload; }, set: function(value) { preload = value; } });
        } catch (error) {}
    }

    try {
        var script = document.createElement("script");
        script.textContent = "(" + runSeamlessQuality.toString() + ")();\n//# sourceURL=DouyuEx.SeamlessQuality.js";
        var parent = document.head || document.documentElement;
        if (parent) { parent.appendChild(script); script.remove(); }
    } catch (error) {
        console.error("[DouyuEx] 画质系统注入失败:", error);
    }
})();
