function initPkg_Reset() {
  GM_registerMenuCommand("重置所有设置", () => {
    void Reset_run();
  });
}

function Reset_isPluginLocalStorageKey(key) {
  return (
    key.startsWith("ExSave_") ||
    key.startsWith("Ex_") ||
    key === "Ex_isJoysound" ||
    key === "freetimed"
  );
}

function Reset_clearPluginLocalStorage() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && Reset_isPluginLocalStorageKey(k)) {
        keys.push(k);
      }
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch (e) {}
}

async function Reset_clearGMStorage() {
  if (typeof GM_deleteValue !== "function") return;
  let keys = [];
  try {
    if (typeof GM_listValues === "function") {
      const ret = GM_listValues();
      keys = ret && typeof ret.then === "function" ? await ret : ret || [];
    } else if (typeof GM !== "undefined" && GM.listValues) {
      keys = await GM.listValues();
    }
  } catch (e) {
    return;
  }
  if (!Array.isArray(keys)) {
    keys = [];
  }
  for (let i = 0; i < keys.length; i++) {
    try {
      GM_deleteValue(keys[i]);
    } catch (e2) {}
  }
}

async function Reset_clearArchive() {
  // 本地弹幕档案存在 IndexedDB 里，不在 localStorage / GM 存储的清理范围内，必须单独清。
  try {
    if (typeof ArchiveDB === "undefined" || !ArchiveDB || typeof ArchiveDB.clearAll !== "function") {
      return false;
    }
    var ret = ArchiveDB.clearAll();
    if (ret && typeof ret.then === "function") await ret;
    return true;
  } catch (e) {
    return false;
  }
}

async function Reset_run() {
  if (
    !confirm(
      "确定要清空 DouyuEx 的所有本地设置吗？\n\n包括：油猴存储(GM)与本站 localStorage 中的插件数据。\n此操作不可恢复。"
    )
  ) {
    return;
  }
  // 本地弹幕档案（IndexedDB）体积可能很大且是独立数据，单独问一次，避免"清设置顺手把档案也清了"。
  var archiveCleared = false;
  var hasArchive = false;
  try {
    hasArchive = typeof ArchiveDB !== "undefined" && !!ArchiveDB;
  } catch (e) {
    hasArchive = false;
  }
  if (hasArchive) {
    if (confirm("是否同时清空「本地弹幕档案」（IndexedDB）？\n\n包含本机记录的房间统计与弹幕历史，清空后不可恢复。\n选择「取消」将保留档案。")) {
      archiveCleared = await Reset_clearArchive();
    }
  }
  await Reset_clearGMStorage();
  Reset_clearPluginLocalStorage();
  alert(
    "已清空。请刷新斗鱼页面以使界面与功能恢复默认状态。" +
    (archiveCleared ? "\n本地弹幕档案已一并清空。" : (hasArchive ? "\n本地弹幕档案已保留。" : ""))
  );
}
