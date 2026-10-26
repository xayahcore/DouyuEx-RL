function initPkg_Menu() {
    // 「检查更新」：Update_checkVersion() 现在是个**空函数**（见 Update.js 末尾的说明：
    // 彻底去掉每次进房弹窗打扰）。于是这个右键菜单项点下去完全没有反应 ——
    // 用户以为检查更新坏了，其实是入口被架空。
    // 这里改成打开「版本更新」面板：面板里的按钮才是真正的检查更新入口，
    // 既不恢复进房弹窗，也不会再有「点了没反应」的菜单项。
    if (typeof GM_registerMenuCommand !== "function") {
        if (typeof ExGuard_warn === "function") {
            ExGuard_warn("菜单", "当前脚本管理器不支持 GM_registerMenuCommand，右键菜单项不可用（其它功能不受影响）");
        }
        return;
    }
    GM_registerMenuCommand("检查更新", function () {
        try {
            if (typeof showExRightPanel === "function") {
                showExRightPanel("版本更新", null, true);
                return;
            }
            if (typeof createExUpdatePanel === "function") {
                createExUpdatePanel();
                return;
            }
        } catch (e) {
            if (typeof ExGuard_warn === "function") ExGuard_warn("菜单", "打开版本更新面板失败", e);
        }
        if (typeof showMessage === "function") {
            showMessage("【版本更新】面板暂不可用，请刷新页面后从胶囊条进入", "error");
        }
    });
}
