function* (__imports) {
yield {"initVersionLifecycleNotice": { get: () => initVersionLifecycleNotice, set: value => { initVersionLifecycleNotice = value; } },
"isNewerVersion": { get: () => isNewerVersion, set: value => { isNewerVersion = value; } }};
/**
 * 语义化版本号比较器 (Semver Comparator)
 * @param {string} remote - 远端版本号 (如 "2026.09.18.01")
 * @param {string} local - 本地版本号
 * @returns {boolean} remote 是否严格大于 local
 */
function isNewerVersion(remote, local) {
  if (!remote || !local) return false;
  const remoteParts = String(remote).replace(/^v/i, "").split(".").map(Number);
  const localParts = String(local).replace(/^v/i, "").split(".").map(Number);
  const maxLength = Math.max(remoteParts.length, localParts.length);

  for (let i = 0; i < maxLength; i++) {
    const r = remoteParts[i] || 0;
    const l = localParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

/**
 * 异步拉取 Greasy Fork 官方最新元数据
 */
async function fetchRemoteVersionMetadata() {
  const url = "https://greasyfork.org/scripts/595575.json";
  try {
    if (typeof __imports.GM_xmlhttpRequest === "function") {
      return await new Promise((resolve) => {
        (0, __imports.GM_xmlhttpRequest)({
          method: "GET",
          url,
          responseType: "json",
          timeout: 10000,
          onload: (res) => {
            let data = res.response;
            if (typeof data === "string") {
              try { data = JSON.parse(data); } catch { data = null; }
            }
            resolve(data);
          },
          onerror: () => resolve(null),
          ontimeout: () => resolve(null)
        });
      });
    }

    if (typeof __imports.fetch === "function") {
      const response = await (0, __imports.fetch)(url);
      if (response.ok) {
        return await response.json();
      }
    }
  } catch (err) {
    console.debug('[DouyuEx NEXT] 远端版本探测异常:', err);
  }
  return null;
}

/**
 * 版本生命周期感知与 12 小时限频静默更新提醒
 */
function initVersionLifecycleNotice() {
  const currentVersion = __imports.P || "2026.09.18.01";
  const lastNotifiedVersion = (0, __imports.GM_getValue)("Ex_LastNotifiedVersion");

  if (!lastNotifiedVersion) {
    (0, __imports.GM_setValue)("Ex_LastNotifiedVersion", currentVersion);
  }

  // 12 小时限频探测在线新版本
  const lastCheckTime = Number((0, __imports.GM_getValue)("Ex_LastUpdateCheckTime") || 0);
  const now = Date.now();
  const CHECK_INTERVAL_MS = 12 * 3600 * 1000;

  if (now - lastCheckTime > CHECK_INTERVAL_MS) {
    (0, __imports.GM_setValue)("Ex_LastUpdateCheckTime", String(now));
    (0, __imports.setTimeout)(async () => {
      const data = await fetchRemoteVersionMetadata();
      if (data?.version && isNewerVersion(data.version, currentVersion)) {
        const tipEl = document.getElementById("ex-update__tip");
        if (tipEl) {
          tipEl.style.display = "block";
        }
      }
    }, 5000);
  }
}

// 导出至主上下文与沙盒全局
window.initVersionLifecycleNotice = initVersionLifecycleNotice;
try {
  if (typeof __imports.unsafeWindow !== "undefined") {
    __imports.unsafeWindow.initVersionLifecycleNotice = initVersionLifecycleNotice;
  }
} catch {}

(0, __imports.setTimeout)(() => {
  try {
    initVersionLifecycleNotice();
  } catch {}
}, 1000);

}
