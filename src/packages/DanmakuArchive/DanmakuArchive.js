/* ==================== P0 本地弹幕档案：接线与生命周期 ==================== */
/*
 * 这一层只做"装配"，不碰具体实现：
 *   ArchiveDB      —— IndexedDB 归档层（DanmakuArchive_DB.js）
 *   ArchiveIngest  —— 报文解析与批量落库（DanmakuArchive_Ingest.js）
 *   ArchiveMetrics —— 口径计算纯函数（DanmakuArchive_Metrics.js）
 *   ArchiveMeta    —— 房间元数据与礼物价目（DanmakuArchive_Meta.js）
 *   ArchiveReplay  —— 回放弹幕反查（DanmakuArchive_Replay.js）
 *   ArchiveUI      —— 第 10 个 Dock 面板（DanmakuArchive_UI.js）
 *
 * 依赖全部按 typeof 判空：任何一个模块缺失/抛异常，其余照常工作，
 * 面板上以"本地档案不可用"如实提示，绝不静默假装有数据。
 *
 * 注意：本仓库产物是把所有包拼成一个大脚本、在油猴沙箱里执行，
 * 顶层 var 落在沙箱作用域而**不一定**挂在 window 上，所以判空一律用
 * `typeof X !== "undefined"`（typeof 对未声明标识符是安全的），不要用 window["X"]。
 */

var ARCHIVE_RUNTIME = {
  installed: false,
  dbReady: false,
  lastError: "",
  pruneAt: 0,
  metaAt: 0
};

function ArchiveRuntime_note(err, where) {
  var text = "";
  try {
    text = String((err && err.message) || err || "");
  } catch (e) {
    text = "";
  }
  ARCHIVE_RUNTIME.lastError = (where || "?") + ":" + text.slice(0, 120);
  try {
    console.error("[DouyuEx][Archive] " + where + " 失败：", err);
  } catch (e) { }
}

/* ---------- 模块判空（逐个写死，避免动态取 window 属性在沙箱里失效） ---------- */
function ArchiveRuntime_hasDB() {
  try { return typeof ArchiveDB !== "undefined" && !!ArchiveDB; } catch (e) { return false; }
}
function ArchiveRuntime_hasIngest() {
  try { return typeof ArchiveIngest !== "undefined" && !!ArchiveIngest; } catch (e) { return false; }
}
function ArchiveRuntime_hasMeta() {
  try { return typeof ArchiveMeta !== "undefined" && !!ArchiveMeta; } catch (e) { return false; }
}
function ArchiveRuntime_hasUI() {
  try { return typeof ArchiveUI !== "undefined" && !!ArchiveUI; } catch (e) { return false; }
}
function ArchiveRuntime_hasReplay() {
  try { return typeof ArchiveReplay !== "undefined" && !!ArchiveReplay; } catch (e) { return false; }
}

/* ---------- 清理：明细保留 7 天 + 1 GB 容量上限，启动后延迟执行，不抢页面资源 ---------- */
function ArchiveRuntime_schedulePrune(delayMs) {
  var wait = typeof delayMs === "number" ? delayMs : 30000;
  setTimeout(function () {
    if (!ArchiveRuntime_hasDB() || typeof ArchiveDB.prune !== "function") return;
    try {
      var task = ArchiveDB.prune();
      if (task && typeof task.then === "function") {
        task.then(function (result) {
          if (result && result.ok) ARCHIVE_RUNTIME.pruneAt = Date.now();
        })["catch"](function (err) {
          ArchiveRuntime_note(err, "prune");
        });
      }
    } catch (err) {
      ArchiveRuntime_note(err, "prune");
    }
  }, wait);
}

/* ---------- 元数据预热：房间信息 + 礼物价目（算收入值要用） ---------- */
function ArchiveRuntime_primeMeta(delayMs) {
  var wait = typeof delayMs === "number" ? delayMs : 3000;
  setTimeout(function () {
    if (!ArchiveRuntime_hasMeta()) return;
    var currentRid = "";
    try {
      currentRid = typeof rid !== "undefined" && rid ? String(rid) : "";
    } catch (e) {
      currentRid = "";
    }
    if (!currentRid) return;
    try {
      if (typeof ArchiveMeta.room === "function") {
        var roomTask = ArchiveMeta.room(currentRid);
        if (roomTask && typeof roomTask.then === "function") {
          roomTask.then(function () {
            ARCHIVE_RUNTIME.metaAt = Date.now();
          })["catch"](function (err) {
            ArchiveRuntime_note(err, "meta.room");
          });
        }
      }
      if (typeof ArchiveMeta.primeGifts === "function") {
        var giftTask = ArchiveMeta.primeGifts(currentRid);
        if (giftTask && typeof giftTask.then === "function") {
          giftTask["catch"](function (err) {
            ArchiveRuntime_note(err, "meta.gifts");
          });
        }
      }
    } catch (err) {
      ArchiveRuntime_note(err, "meta");
    }
  }, wait);
}

/* ---------- 采集器启停 ---------- */
function ArchiveRuntime_startIngest() {
  if (!ArchiveRuntime_hasIngest() || typeof ArchiveIngest.start !== "function") {
    ARCHIVE_RUNTIME.lastError = "ingest-missing";
    return false;
  }
  try {
    ArchiveIngest.start();
    return true;
  } catch (err) {
    ArchiveRuntime_note(err, "ingest.start");
    return false;
  }
}

function ArchiveRuntime_stopIngest() {
  if (!ArchiveRuntime_hasIngest() || typeof ArchiveIngest.stop !== "function") return;
  try {
    ArchiveIngest.stop();
  } catch (err) {
    ArchiveRuntime_note(err, "ingest.stop");
  }
}

/* ---------- 对外只读快照：面板与调试都用它，避免各处直连内部状态 ---------- */
function ArchiveRuntime_snapshot() {
  var snapshot = {
    installed: ARCHIVE_RUNTIME.installed,
    dbReady: ARCHIVE_RUNTIME.dbReady,
    lastError: ARCHIVE_RUNTIME.lastError,
    pruneAt: ARCHIVE_RUNTIME.pruneAt,
    metaAt: ARCHIVE_RUNTIME.metaAt,
    counters: null,
    supported: false,
    replayReady: false
  };
  try {
    snapshot.supported = typeof indexedDB !== "undefined" && !!indexedDB;
  } catch (e) {
    snapshot.supported = false;
  }
  if (ArchiveRuntime_hasIngest() && typeof ArchiveIngest.getCounters === "function") {
    try {
      snapshot.counters = ArchiveIngest.getCounters();
    } catch (err) {
      snapshot.counters = null;
    }
  }
  snapshot.replayReady = ArchiveRuntime_hasReplay();
  return snapshot;
}

/* ---------- 入口 ---------- */
function initPkg_DanmakuArchive() {
  if (ARCHIVE_RUNTIME.installed) return;
  ARCHIVE_RUNTIME.installed = true;

  // 1) 开库。IDB 不可用（隐私模式/配额）时后续全部走各自降级路径，不阻塞页面。
  if (ArchiveRuntime_hasDB() && typeof ArchiveDB.open === "function") {
    try {
      var openTask = ArchiveDB.open();
      if (openTask && typeof openTask.then === "function") {
        openTask.then(function (result) {
          ARCHIVE_RUNTIME.dbReady = !!(result && result.ok);
          if (ARCHIVE_RUNTIME.dbReady) {
            ArchiveRuntime_schedulePrune(30000);
          } else {
            ARCHIVE_RUNTIME.lastError = "db:" + String((result && result.reason) || "unknown");
          }
        })["catch"](function (err) {
          ArchiveRuntime_note(err, "db.open");
        });
      }
    } catch (err) {
      ArchiveRuntime_note(err, "db.open");
    }
  } else {
    ARCHIVE_RUNTIME.lastError = "db-missing";
  }

  // 2) 起采集：只订阅页面主连接旁路（rank_engine 的 __douyuExTap），不新开任何连接。
  ArchiveRuntime_startIngest();

  // 3) 元数据与价目预热（延后 3 秒，别和首屏抢带宽）。
  ArchiveRuntime_primeMeta(3000);

  // 4) 第 10 个 Dock 面板（图标插在「检查更新」之前）。
  if (ArchiveRuntime_hasUI() && typeof ArchiveUI.init === "function") {
    try {
      ArchiveUI.init();
    } catch (err) {
      ArchiveRuntime_note(err, "ui.init");
    }
  }

  // 5) 页面隐藏/卸载时把队列里的事件落盘，防止丢数据。
  try {
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) return;
      if (!ArchiveRuntime_hasIngest() || typeof ArchiveIngest.flush !== "function") return;
      try {
        ArchiveIngest.flush();
      } catch (err) {
        ArchiveRuntime_note(err, "ingest.flush");
      }
    });
    window.addEventListener("pagehide", function () {
      ArchiveRuntime_stopIngest();
    });
  } catch (err) {
    ArchiveRuntime_note(err, "lifecycle-bind");
  }
}
