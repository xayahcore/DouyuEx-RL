let exAutoBarrageColorTimer = null;
let exAutoBarrageColorCleanup = null;

function initPkg_ExpandTool_AutoBarrageColor() {
    ExpandTool_AutoBarrageColor_insertFunc();
    initPkg_ExpandTool_AutoBarrageColor_Set();
}

function getAutoBarrageColor() {
    const checkbox = document.getElementById("extool__autobarragecolor");
    return !!(checkbox && checkbox.checked);
}

function ExpandTool_AutoBarrageColor_insertFunc() {
    const checkbox = document.getElementById("extool__autobarragecolor");
    if (!checkbox) return;
    checkbox.addEventListener("click", function () {
        saveData_AutoBarrageColor();
        if (getAutoBarrageColor()) {
            selectHighestUnlockedBarrageColor();
        } else {
            stopAutoBarrageColorSelection();
        }
    });
}

function saveData_AutoBarrageColor() {
    let data = {
        isAutoBarrageColor: getAutoBarrageColor()
    };
    localStorage.setItem("ExSave_AutoBarrageColor", JSON.stringify(data));
}

function initPkg_ExpandTool_AutoBarrageColor_Set() {
    let ret = localStorage.getItem("ExSave_AutoBarrageColor");
    if (ret != null) {
        let retJson = JSON.parse(ret);
        if (retJson.isAutoBarrageColor) {
            const checkbox = document.getElementById("extool__autobarragecolor");
            if (!checkbox) return;
            checkbox.checked = retJson.isAutoBarrageColor;
            selectHighestUnlockedBarrageColor();
        }
    }
}

function stopAutoBarrageColorSelection() {
    if (exAutoBarrageColorTimer !== null) {
        clearInterval(exAutoBarrageColorTimer);
        exAutoBarrageColorTimer = null;
    }
    const cleanup = exAutoBarrageColorCleanup;
    exAutoBarrageColorCleanup = null;
    if (cleanup) {
        try { cleanup(); } catch (error) {
            if (typeof ExGuard_warn === "function") ExGuard_warn("自动弹幕颜色", "关闭粉丝色板失败", error);
        }
    }
}

function AutoBarrageColor_findPanel(container) {
    if (!container) return null;
    const panels = container.querySelectorAll(".AssembleExpressHeader");
    for (const panel of panels) {
        let visible = true;
        for (let element = panel; element; element = element.parentElement) {
            const style = window.getComputedStyle(element);
            if (element.hidden || style.display === "none" || style.visibility === "hidden") {
                visible = false;
                break;
            }
        }
        if (visible) return panel;
    }
    return null;
}

function selectHighestUnlockedBarrageColor() {
    // 重复初始化先结束上一轮，不能遗留自己打开的面板或叠加轮询。
    stopAutoBarrageColorSelection();
    if (!getAutoBarrageColor()) return;

    let count = 0;
    let opened = false;
    let container = null;
    let ownedPanel = null;
    let panelObserver = null;
    let itemClass = "";
    function capturePanel(records) {
        // 保留首次插入的实例，即使用户随后关掉重开，也不能把新面板认领进来。
        for (const record of records) {
            for (const node of record.addedNodes) {
                if (ownedPanel || node.nodeType !== 1) continue;
                ownedPanel = node.matches(".AssembleExpressHeader") ? node : node.querySelector(".AssembleExpressHeader");
            }
        }
        if (!ownedPanel) ownedPanel = AutoBarrageColor_findPanel(container);
        if (ownedPanel && panelObserver) {
            panelObserver.disconnect();
            panelObserver = null;
        }
    }
    exAutoBarrageColorCleanup = () => {
        // 停用可能发生在挂载后、Observer 回调/下一次轮询前，先取出已发生的变更。
        if (panelObserver) {
            const observer = panelObserver;
            try { capturePanel(observer.takeRecords()); } finally {
                observer.disconnect();
                panelObserver = null;
            }
        }
        // 只关闭这次打开的同一个面板实例；用户关掉后重开的面板不属于本轮。
        if (!opened || !ownedPanel || !ownedPanel.isConnected || !container || !container.contains(ownedPanel)) return;
        const close = ownedPanel.querySelector(".AssembleExpressHeader-close");
        if (close) close.click();
    };

    exAutoBarrageColorTimer = setInterval(() => {
        try {
            if (!getAutoBarrageColor() || ++count > 100) {
                stopAutoBarrageColorSelection();
                return;
            }
            if (!opened) {
                const normal = document.getElementsByClassName("FansBarrageSwitcher")[0];
                const switcher = normal || document.getElementsByClassName("MatchSystemFansBarrageSwitcher")[0];
                if (!switcher) return;
                container = switcher.closest(".ChatFansBarrage, .MatchSystemFansBarrage") || switcher.parentElement;
                if (!container) return;
                // is-active 仅表示粉丝弹幕模式，不代表面板打开；以实际可见面板为准。
                if (AutoBarrageColor_findPanel(container)) {
                    stopAutoBarrageColorSelection();
                    return;
                }
                itemClass = normal ? "FansBarrageColor-item" : "MatchSystemFansBarrageColor-item";
                if (typeof window.MutationObserver === "function") {
                    panelObserver = new window.MutationObserver(capturePanel);
                    panelObserver.observe(container, { childList: true, subtree: true });
                }
                opened = true;
                try { switcher.click(); } finally { capturePanel(panelObserver ? panelObserver.takeRecords() : []); }
                return;
            }
            if (!container.isConnected || (ownedPanel && !ownedPanel.isConnected)) {
                stopAutoBarrageColorSelection();
                return;
            }
            if (!ownedPanel) capturePanel(panelObserver ? panelObserver.takeRecords() : []);
            if (!ownedPanel) return; // 面板或颜色列表仍在异步渲染。
            const items = ownedPanel.getElementsByClassName(itemClass);
            let lastUnlocked = null;
            for (const item of items) {
                if (!item.classList.contains("is-lock")) lastUnlocked = item;
            }
            if (!lastUnlocked) return;
            try {
                if (!lastUnlocked.classList.contains("is-selected")) lastUnlocked.click();
            } finally {
                stopAutoBarrageColorSelection();
            }
        } catch (error) {
            stopAutoBarrageColorSelection();
            if (typeof ExGuard_warn === "function") ExGuard_warn("自动弹幕颜色", "自动选色未完成", error);
        }
    }, 500);
}
