let exAutoBarrageColorTimer = null;

function initPkg_ExpandTool_AutoBarrageColor() {
    ExpandTool_AutoBarrageColor_insertDom();
    ExpandTool_AutoBarrageColor_insertFunc();
    initPkg_ExpandTool_AutoBarrageColor_Set();
}

function ExpandTool_AutoBarrageColor_insertDom() {
    if (document.getElementById("extool__autobarragecolor")) return;
    let a = document.createElement("span");
    a.innerHTML = '<label title="进入直播间后自动选择当前已解锁的最高档粉丝弹幕颜色"><input id="extool__autobarragecolor" type="checkbox">自动最高弹幕色</label>';
    let b = document.getElementsByClassName("extool")[0];
    // 插到勾选项末尾（防页签冻结之后），避免落到送礼等模块下面
    let tabInput = document.getElementById("extool__tabSwitch");
    let anchor = tabInput ? tabInput.parentElement : null;
    while (anchor && anchor.parentElement !== b) {
        anchor = anchor.parentElement;
    }
    if (anchor) {
        if (anchor.nextSibling) {
            b.insertBefore(a, anchor.nextSibling);
        } else {
            b.appendChild(a);
        }
    } else {
        b.insertBefore(a, b.childNodes[0]);
    }
}

function getAutoBarrageColor() {
    return document.getElementById("extool__autobarragecolor").checked;
}

function ExpandTool_AutoBarrageColor_insertFunc() {
    document.getElementById("extool__autobarragecolor").addEventListener("click", function () {
        saveData_AutoBarrageColor();
        if (getAutoBarrageColor()) {
            selectHighestUnlockedBarrageColor();
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
            document.getElementById("extool__autobarragecolor").checked = retJson.isAutoBarrageColor;
            selectHighestUnlockedBarrageColor();
        }
    }
}

function selectHighestUnlockedBarrageColor() {
    // 避免重复进房/重复勾选时叠多个定时器
    if (exAutoBarrageColorTimer) {
        clearInterval(exAutoBarrageColorTimer);
        exAutoBarrageColorTimer = null;
    }

    let count = 0;
    let opened = false;
    exAutoBarrageColorTimer = setInterval(() => {
        count++;
        if (count > 100) {
            clearInterval(exAutoBarrageColorTimer);
            exAutoBarrageColorTimer = null;
            return;
        }

        let isMatch = false;
        let switcher = document.getElementsByClassName("FansBarrageSwitcher")[0];
        if (!switcher) {
            switcher = document.getElementsByClassName("MatchSystemFansBarrageSwitcher")[0];
            isMatch = true;
        }
        if (!switcher) {
            return;
        }

        let itemClass = isMatch ? "MatchSystemFansBarrageColor-item" : "FansBarrageColor-item";

        // 与 BarrageLoop 一致：先点开粉丝色板，再等 DOM 渲染后选色
        if (!opened) {
            switcher.click();
            opened = true;
            return;
        }

        let items = document.getElementsByClassName(itemClass);
        if (!items.length) {
            // 面板可能仍在异步渲染，继续轮询
            return;
        }

        let lastUnlocked = null;
        for (let i = 0; i < items.length; i++) {
            if (!items[i].classList.contains("is-lock")) {
                lastUnlocked = items[i];
            }
        }
        if (!lastUnlocked) {
            return;
        }

        clearInterval(exAutoBarrageColorTimer);
        exAutoBarrageColorTimer = null;
        lastUnlocked.click();
    }, 500);
}
