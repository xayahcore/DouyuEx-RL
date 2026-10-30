var curVersion = (typeof GM_info !== "undefined" && GM_info.script && GM_info.script.version) ? GM_info.script.version : "2026.09.29.01";
var isNeedUpdate = false;
var lastestVersion = "";

/*
 * 红点语义（audit-wave2 P2-5）：
 *   旧实现的条件是 Ex_LastNotifiedVersion !== curVersion —— 那是「有没有点过『我已收到』」，
 *   于是升级后只要没点面板红点就恒亮，而真正探测到新版本时也只是亮同一个点。
 * 现在：红点 = 「确实有新版本（remote > cur）且这个版本还没被看过」。
 *   Ex_LastKnownRemoteVersion —— 上次探测到的最新版本（用来在本 tab 刷新后立刻恢复红点）
 *   Ex_LastSeenRemoteVersion  —— 用户已经看过/处理过的远端版本（看过即熄灭）
 */
const UPDATE_SEEN_KEY = "Ex_LastSeenRemoteVersion";
const UPDATE_KNOWN_KEY = "Ex_LastKnownRemoteVersion";
const UPDATE_CHECK_TIME_KEY = "Ex_LastUpdateCheckTime";
const UPDATE_CHECK_INTERVAL_MS = 12 * 3600 * 1000;

/** 记录一次探测结果，并据此刷新红点（只有真的更新才亮） */
function Update_noteRemoteVersion(remoteVer) {
  var remote = String(remoteVer || "");
  var newer = isNewerVersion(remote, curVersion);
  isNeedUpdate = newer;
  lastestVersion = newer ? remote : "";
  if (newer) {
    GM_setValue(UPDATE_KNOWN_KEY, remote);
  }
  Update_refreshTip();
  return newer;
}

/** 按「有新版本 + 该版本还没看过」刷新底栏红点 */
function Update_refreshTip() {
  var tip = document.getElementById("ex-update__tip");
  if (!tip) return;
  var seen = String(GM_getValue(UPDATE_SEEN_KEY) || "");
  var show = !!(isNeedUpdate && lastestVersion && lastestVersion !== seen);
  tip.style.display = show ? "block" : "none";
}

/** 用户已经看过这个远端版本：熄灭红点，且之后同一版本不再亮 */
let Update_seenBound = false;
/* 红点熄灭原来只在「点图标」那条路上做；悬停/快捷键打开面板时红点不灭，
 * 用户会以为"看过了还亮着"。统一监听三级面板打开事件。 */
function Update_bindSeenOnOpen() {
  if (Update_seenBound) return;
  Update_seenBound = true;
  document.addEventListener("DouyuEx:thirdLevelOpened", function (ev) {
    var panel = ev && ev.detail && ev.detail.panel;
    if (panel && panel.classList && panel.classList.contains("exupdate-panel") && isNeedUpdate) {
      Update_markRemoteSeen();
    }
  });
}

function Update_markRemoteSeen() {
  if (lastestVersion) {
    GM_setValue(UPDATE_SEEN_KEY, lastestVersion);
  }
  Update_refreshTip();
}

/** 探测成功才推进 12 小时窗口（P2-6）：失败不占用窗口，下次启动会重试 */
function Update_stampCheckTime() {
  try {
    GM_setValue(UPDATE_CHECK_TIME_KEY, String(Date.now()));
  } catch (e) {}
}

function isNewerVersion(remote, local) {
  if (!remote || !local) return false;
  var rParts = String(remote).split(".").map(Number);
  var lParts = String(local).split(".").map(Number);
  for (var i = 0; i < Math.max(rParts.length, lParts.length); i++) {
    var r = rParts[i] || 0;
    var l = lParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

function initPkg_Update() {
  initPkg_Update_Dom();
  initPkg_Update_Func();
  Update_bindSeenOnOpen();
  initVersionLifecycleNotice();

  // 上次页面里已经探到过新版本：刷新后直接把红点恢复出来，不必等 12 小时窗口
  var knownRemote = String(GM_getValue(UPDATE_KNOWN_KEY) || "");
  if (knownRemote && isNewerVersion(knownRemote, curVersion)) {
    Update_noteRemoteVersion(knownRemote);
  }
}

function initPkg_Update_Dom() {
  Update_insertIcon();
}

function Update_insertIcon() {
  let a = document.createElement("div");
  a.className = "ex-update";
  a.innerHTML =
    '<a class="ex-panel__icon" title="版本更新，当前版本' +
    curVersion +
    '"><svg t="1578767541873" style="display:block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="23715" width="32" height="32"><path d="M768 810.7H512c-23.6 0-42.7-19.1-42.7-42.7s19.1-42.7 42.7-42.7h256c94.1 0 170.7-76.6 170.7-170.7 0-89.6-70.1-164.3-159.5-170.1L754 383l-10.7-22.7c-42.2-89.3-133-147-231.3-147s-189.1 57.7-231.3 147L270 383l-25.1 1.6c-89.5 5.8-159.5 80.5-159.5 170.1 0 94.1 76.6 170.7 170.7 170.7 23.6 0 42.7 19.1 42.7 42.7s-19.1 42.7-42.7 42.7c-141.2 0-256-114.8-256-256 0-126.1 92.5-232.5 214.7-252.4C274.8 195.7 388.9 128 512 128s237.2 67.7 297.3 174.2C931.5 322.1 1024 428.6 1024 554.7c0 141.1-114.8 256-256 256z" fill="#3688FF" p-id="23716"></path><path d="M554.7 938.7c-10.9 0-21.8-4.2-30.2-12.5l-128-128c-16.7-16.7-16.7-43.7 0-60.3l128-128c16.6-16.7 43.7-16.7 60.3 0 16.7 16.7 16.7 43.7 0 60.3L487 768l97.8 97.8c16.7 16.7 16.7 43.7 0 60.3-8.3 8.4-19.2 12.6-30.1 12.6z" fill="#5F6379" p-id="23717"></path></svg><i id="ex-update__tip" class="ex-panel__tip"></i></a>';

  let b = document.getElementsByClassName("ex-panel__wrap")[0];
  if (b) b.insertBefore(a, b.childNodes[0]);
}

function initPkg_Update_Func() {
  let btn = document.getElementsByClassName("ex-update")[0];
  if (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      let panel = document.querySelector(".exupdate-panel");
      if (!panel) {
        createExUpdatePanel();
        panel = document.querySelector(".exupdate-panel");
      }
      if (panel) {
        if (panel.style.display === "block") {
          panel.style.display = "none";
        } else {
          if (typeof openMiuixPanelCentered === "function") {
            openMiuixPanelCentered(panel, btn);
          } else {
            panel.style.display = "block";
          }
          // 「已读后熄灭」：用户已经打开面板看到这条更新，红点就该灭（面板里的「前往更新」仍在）
          if (isNeedUpdate) Update_markRemoteSeen();
        }
      }
    });
  }
}

/* ==================== 版本探测引擎 ==================== */
/*
 * 设计要点（修正历史漏检缺陷）：
 *   1. 判据源首选 GreasyFork 官方更新分发端点 meta.js —— 它是用户实际安装渠道的权威版本，
 *      体积仅约 2.4KB、响应头 access-control-allow-origin: * 且无 CDN 缓存。
 *   2. 并发探测全部源，取版本号「最大值」而非「第一个成功值」。
 *      历史缺陷：jsDelivr 分支引用有 12 小时 CDN 硬缓存(s-maxage=43200)，一旦返回陈旧版本号
 *      就被当作成功结果立即返回、不再回退，导致新版本已发布却提示“已是最新”。
 *   3. 不再附加 _t 时间戳参数 —— 它只影响浏览器缓存，对 CDN 服务端缓存完全无效，
 *      徒增“已防缓存”的错觉。
 */

const UPDATE_VERSION_SOURCES = [
  // 权威源：GreasyFork 官方更新分发端点（Tampermonkey 自身检查更新所用）
  "https://update.greasyfork.org/scripts/595575.meta.js",
  // 备选源：GitHub Raw（约 5 分钟缓存）
  "https://raw.githubusercontent.com/xayahcore/DouyuEx-RL/main/package.json",
  // 备选源：jsDelivr 双节点（分支引用约 12 小时缓存，仅作兜底）
  "https://fastly.jsdelivr.net/gh/xayahcore/DouyuEx-RL@main/package.json",
  "https://cdn.jsdelivr.net/gh/xayahcore/DouyuEx-RL@main/package.json"
];

const UPDATE_VERSION_TIMEOUT = 4000;
const UPDATE_VERSION_TOTAL_TIMEOUT = 6000;

function isVersionLike(v) {
  return /^\d{4}\.\d{2}\.\d{2}\.\d{2}$/.test(String(v == null ? "" : v).trim());
}

// 兼容两种载荷：package.json 的 "version" 字段 与 userscript 元数据块的 @version
function extractVersionFromText(text) {
  if (!text) return null;
  const raw = String(text);

  if (raw.indexOf("{") !== -1) {
    try {
      const json = JSON.parse(raw);
      if (json && isVersionLike(json.version)) return String(json.version).trim();
    } catch (e) {}
  }

  const m = raw.match(/@version\s+([0-9][0-9.]*)/);
  if (m && isVersionLike(m[1])) return m[1].trim();

  return null;
}

function requestVersionSource(url, onDone) {
  let settled = false;
  const done = (text) => {
    if (settled) return;
    settled = true;
    onDone(text);
  };

  if (typeof GM_xmlhttpRequest === "function") {
    GM_xmlhttpRequest({
      method: "GET",
      url: url,
      timeout: UPDATE_VERSION_TIMEOUT,
      onload: function (res) {
        if (res && res.status === 200) {
          done(res.responseText || res.response || "");
        } else {
          done(null);
        }
      },
      onerror: function () { done(null); },
      ontimeout: function () { done(null); },
      onabort: function () { done(null); }
    });
  } else {
    fetch(url, { cache: "no-store" })
      .then(function (res) { return res && res.ok ? res.text() : null; })
      .then(function (text) { done(text); })
      .catch(function () { done(null); });
  }
}

function fetchLatestVersion(callback) {
  const versions = [];
  let pending = UPDATE_VERSION_SOURCES.length;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(totalTimer);
    if (versions.length === 0) return callback(null);

    let best = versions[0];
    for (let i = 1; i < versions.length; i++) {
      if (isNewerVersion(versions[i], best)) best = versions[i];
    }
    callback(best);
  };

  const totalTimer = setTimeout(finish, UPDATE_VERSION_TOTAL_TIMEOUT);

  UPDATE_VERSION_SOURCES.forEach((url) => {
    requestVersionSource(url, (text) => {
      const ver = extractVersionFromText(text);
      if (ver && versions.indexOf(ver) === -1) versions.push(ver);
      pending--;
      if (pending <= 0) finish();
    });
  });
}

/* ==================== 版本更新日志渲染层（数据源：UpdateLog.js） ==================== */

// 取指定版本的更新日志；缺失时回退到最新一条，保证面板永不空白
function getExUpdateLogFor(version) {
  var log = (typeof EX_UPDATE_LOG !== "undefined" && EX_UPDATE_LOG) ? EX_UPDATE_LOG : null;
  if (!log) return null;
  if (log[version]) return log[version];

  var keys = Object.keys(log);
  if (keys.length === 0) return null;
  keys.sort(function (a, b) {
    var pa = String(a).split(".").map(Number);
    var pb = String(b).split(".").map(Number);
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var x = pa[i] || 0;
      var y = pb[i] || 0;
      if (x !== y) return x - y;
    }
    return 0;
  });
  return log[keys[keys.length - 1]];
}

function getExUpdateLogSections() {
  return (typeof EX_UPDATE_LOG_SECTIONS !== "undefined" && Array.isArray(EX_UPDATE_LOG_SECTIONS))
    ? EX_UPDATE_LOG_SECTIONS
    : ["新增功能", "改进与修复", "其它"];
}

function escapeUpdateLogText(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// 依据数据源渲染三大板块卡片，条目统一为 "• 【分类】说明" 格式
function buildExUpdateCardsHtml() {
  var entry = getExUpdateLogFor(curVersion);
  var sections = getExUpdateLogSections();
  if (!entry) return "";

  // 当前版本没有独立条目时会回退到「最新一条」：必须如实标注，不能冒充本版本日志（audit-wave3 W11）
  var log = (typeof EX_UPDATE_LOG !== "undefined" && EX_UPDATE_LOG) ? EX_UPDATE_LOG : null;
  var isFallback = !(log && log[curVersion]);
  var note = isFallback
    ? '<div class="exupdate-panel__note">当前版本 ' + escapeUpdateLogText(curVersion) + ' 暂无独立日志条目，以下为最近一条更新日志。</div>'
    : "";

  return note + sections.map(function (name) {
    var items = Array.isArray(entry[name]) ? entry[name] : [];
    var lis = items.map(function (text) {
      return "<li>• " + escapeUpdateLogText(text) + "</li>";
    }).join("");
    return (
      '<div class="exupdate-panel__card">' +
        '<div class="exupdate-panel__card-header">' +
          '<span class="exupdate-panel__card-title">' + escapeUpdateLogText(name) + '</span>' +
        '</div>' +
        '<ul class="exupdate-list">' + lis + '</ul>' +
      '</div>'
    );
  }).join("");
}

function createExUpdatePanel() {
  var existing = document.querySelector(".exupdate-panel");
  if (existing) {
    if (existing.dataset.version === curVersion) return;
    existing.remove();
  }

  var p = document.createElement("div");
  p.className = "exupdate-panel miuix-modal";
  p.dataset.version = curVersion;
  p.innerHTML = `
    <div class="miuix-modal__body">
      ${buildExUpdateCardsHtml()}
      <div class="exupdate-panel__action-wrap">
        <button type="button" class="ex-btn-primary exupdate-panel__submit-btn" id="exupdate-action-btn">我已收到</button>
      </div>
    </div>
  `;
  document.body.appendChild(p);
  if (typeof ensureMiuixPanelHeader === "function") {
    ensureMiuixPanelHeader(p, "版本更新");
  }
  /* 主按钮（检查更新 / 我已收到 / 前往更新）常驻面板底部（与同屏面板一致）：更新日志很长，
     按钮必须始终可见可点。只能内联样式 —— 操作区有"只允许一条统一 CSS 规则"的构建护栏。 */
  if (typeof ExUI_stickActionBar === "function") ExUI_stickActionBar(p);

  var btn = p.querySelector("#exupdate-action-btn");
  if (!btn) return;

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
    } else if (state === "error") {
      btn.classList.add("exupdate-state-btn--error");
      btn.textContent = text || "检查失败，点击重试";
    }
  }

  // 面板打开时的初始态跟着真实探测结果走：有更新就直接给「前往更新」
  if (isNeedUpdate && lastestVersion) {
    setBtnState("upgrade", "前往更新 (v" + lastestVersion + ")");
  } else {
    setBtnState("check", "检查更新");
  }

  btn.onclick = function (e) {
    e.stopPropagation();
    var st = btn.dataset.state;
    if (st === "check" || st === "latest" || st === "error") {
      setBtnState("checking", "正在检查更新...");
      fetchLatestVersion(function (remoteVer) {
        if (!remoteVer) {
          setBtnState("error", "检查失败，点击重试");
          if (typeof showMessage === "function") {
            showMessage("【版本更新】检查更新失败，无法连接到更新服务器", "error");
          }
          return;
        }
        if (isNewerVersion(remoteVer, curVersion)) {
          setBtnState("upgrade", "前往更新 (v" + remoteVer + ")");
          Update_noteRemoteVersion(remoteVer);
          if (typeof showMessage === "function") {
            showMessage("【版本更新】检测到新版本 v" + remoteVer + "，点击前往更新", "info");
          }
        } else {
          setBtnState("latest", "已是最新 (v" + curVersion + ")");
          if (typeof showMessage === "function") {
            showMessage("【版本更新】当前版本 v" + curVersion + " 已是最新版本", "success");
          }
        }
      });
    } else if (st === "upgrade") {
      // 已经走到「前往更新」= 这条通知被处理过，熄灭红点
      Update_markRemoteSeen();
      if (typeof GM_openInTab === "function") {
        GM_openInTab("https://greasyfork.org/zh-CN/scripts/595575-douyuex-rl-%E6%96%97%E9%B1%BC%E7%9B%B4%E6%92%AD%E9%97%B4%E5%A2%9E%E5%BC%BA%E6%8F%92%E4%BB%B6-reborn-lite", { active: true });
      } else {
        window.open("https://greasyfork.org/zh-CN/scripts/595575-douyuex-rl-%E6%96%97%E9%B1%BC%E7%9B%B4%E6%92%AD%E9%97%B4%E5%A2%9E%E5%BC%BA%E6%8F%92%E4%BB%B6-reborn-lite", "_blank");
      }
    }
  };
}

function initVersionLifecycleNotice() {
  // Ex_LastNotifiedVersion 是旧红点语义留下的键（「有没有点过我已收到」），现在没有任何读取方。
  // 老用户存储里会残留一条无用记录，这里顺手清掉（audit-wave3 W14）；GM 不支持时静默跳过。
  try {
    if (typeof GM_deleteValue === "function" && GM_getValue("Ex_LastNotifiedVersion") !== undefined) {
      GM_deleteValue("Ex_LastNotifiedVersion");
    }
  } catch (e) {}

  // 12 小时限频在线探测
  var lastCheckTime = Number(GM_getValue(UPDATE_CHECK_TIME_KEY) || 0);
  var now = Date.now();
  if (now - lastCheckTime > UPDATE_CHECK_INTERVAL_MS) {
    // 注意：时间戳**成功后才写**（P2-6）。旧实现在探测之前就写，
    // 一次离线/被墙就把 12 小时窗口占掉，期间既不再试、也不提示失败。
    setTimeout(() => {
      fetchLatestVersion(function (remoteVer) {
        if (!remoteVer) {
          ExGuard_warn("版本更新", "例行探测失败（可能是网络或更新源不可达），下次启动会重试");
          return;
        }
        Update_stampCheckTime();
        Update_noteRemoteVersion(remoteVer);
      });
    }, 5000);
  }
}

function Update_checkVersion() {
  // 保持空函数或兼容调用，彻底消除原版每次进房弹窗打扰
}
