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
