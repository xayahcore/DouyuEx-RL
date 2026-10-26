function initPkg_DanmakuTail() {
    initPkg_DanmakuTail_insertDom();
    initPkg_DanmakuTail_Set();
    initPkg_DanmakuTail_Func();
}

function initPkg_DanmakuTail_insertDom() {
    let div = document.createElement("div");
    div.className = "ChatToolBar-DanmakuTail";
    div.innerHTML = `<div class="ChatToolBar-DanmakuTail-tip" title="弹幕小尾巴" ></div>`;
    let b = document.getElementsByClassName("ChatToolBar__left")[0] || document.querySelector(".ChatToolBar") || document.body;
    if (b) b.appendChild(div);

    let panel = document.createElement("div");
    panel.className = "ChatToolBar-DanmakuTail-Panel";
    panel.style.display = "none";
    document.body.appendChild(panel);

    panel.innerHTML = `
        <div class="DanmakuTail-header">
            <span class="DanmakuTail-title">弹幕小尾巴</span>
            <span class="DanmakuTail-close" title="关闭">×</span>
        </div>
        <input type="text" class="DanmakuTail-input" id="DanmakuTail-input" placeholder="请输入小尾巴内容"/>
        <div class="miuix-seg">
            <label class="miuix-seg__item">
                <input type="radio" name="DanmakuTailType" value="1" id="DanmakuTail-option-label1"><span class="miuix-seg__label">前缀</span>
            </label>
            <label class="miuix-seg__item">
                <input type="radio" name="DanmakuTailType" value="2" id="DanmakuTail-option-label2" checked><span class="miuix-seg__label">后缀</span>
            </label>
        </div>
        <label class="DanmakuTail-checkbox-label">
            <span>启用小尾巴</span>
            <input type="checkbox" class="DanmakuTail-checkbox sign-checkbox" id="DanmakuTail-checkbox" />
        </label>
    `;
}

function initPkg_DanmakuTail_Set() {
    let ret = localStorage.getItem("ExSave_DanmakuTail");
    if (ret == null) return;
    // 旧实现直接 JSON.parse：本地存了一份坏数据（历史版本写坏 / 用户手动改过），
    // 这里当场抛错 → 整个 initPkg_DanmakuTail 中断 → 小尾巴面板再也点不开。
    let retJson = null;
    try {
        retJson = JSON.parse(ret);
    } catch (e) {
        if (typeof ExGuard_warn === "function") ExGuard_warn("弹幕小尾巴", "本地设置已损坏，按「未启用」处理", e);
        return;
    }
    if (!retJson || typeof retJson !== "object") return;
    const checkbox = document.getElementById("DanmakuTail-checkbox");
    const input = document.getElementById("DanmakuTail-input");
    if (!checkbox || !input) {
        if (typeof ExGuard_warn === "function") ExGuard_warn("弹幕小尾巴", "面板节点不存在，本次不恢复上次的小尾巴设置");
        return;
    }
    const types = document.querySelectorAll('input[name="DanmakuTailType"]');
    checkbox.checked = !!retJson.isTailEnabled;
    input.value = retJson.tailContent || "";
    input.disabled = !!retJson.isTailEnabled;
    if (types.length >= 2) {
        types[0].disabled = !!retJson.isTailEnabled;
        types[1].disabled = !!retJson.isTailEnabled;
    }
    const pickedType = retJson.type ? document.querySelector(`input[name="DanmakuTailType"][value="${retJson.type}"]`) : null;
    if (!retJson.type) {
        const fallbackType = document.querySelector('input[name="DanmakuTailType"][value="2"]');
        if (fallbackType) fallbackType.checked = true;
    } else if (pickedType) {
        pickedType.checked = true;
        saveData_DanmakuTail();
    } else {
        // 存进去的类型值不在选项里（旧版本写坏）：回退到默认「后缀」，别留一个没人选中的单选组
        const fallbackType = document.querySelector('input[name="DanmakuTailType"][value="2"]');
        if (fallbackType) fallbackType.checked = true;
        if (typeof ExGuard_warn === "function") ExGuard_warn("弹幕小尾巴", "本地设置里的类型值非法（" + retJson.type + "），已回退为后缀");
    }
    if (retJson.isTailEnabled) {
        const tip = document.querySelector(".ChatToolBar-DanmakuTail-tip");
        if (tip) tip.classList.add("ChatToolBar-DanmakuTail-tip-active");
    }
}


function saveData_DanmakuTail() {
    const checkbox = document.getElementById("DanmakuTail-checkbox");
    const input = document.getElementById("DanmakuTail-input");
    if (!checkbox || !input) {
        if (typeof ExGuard_warn === "function") ExGuard_warn("弹幕小尾巴", "面板节点不存在，本次不保存设置");
        return;
    }
    // 没有选中项时给默认「后缀」：旧实现这里裸取 .value，单选组被页面脚本重置后
    // 一保存就 TypeError，用户看到的是「改了设置，刷新全没了」。
    const pickedType = document.querySelector('input[name="DanmakuTailType"]:checked');
    let data = {
        isTailEnabled: checkbox.checked,
        tailContent: input.value,
        type: pickedType ? pickedType.value : "2"
    }
    try {
        localStorage.setItem("ExSave_DanmakuTail", JSON.stringify(data));
    } catch (e) {
        if (typeof ExGuard_warn === "function") ExGuard_warn("弹幕小尾巴", "设置写入失败（本地存储不可用）", e);
    }
}


function initPkg_DanmakuTail_Func() {
    let tipBtn = document.getElementsByClassName("ChatToolBar-DanmakuTail")[0];
    let panel = document.querySelector(".ChatToolBar-DanmakuTail-Panel");

    if (tipBtn && panel) {
        tipBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            let isVisible = panel.style.display === "block" || panel.classList.contains("active");
            if (isVisible) {
                panel.style.display = "none";
                panel.classList.remove("active", "miuix-modal-in");
                return;
            }

            let rect = tipBtn.getBoundingClientRect();
            let panelWidth = 270;
            let left = rect.left + rect.width / 2 - panelWidth / 2;
            left = Math.max(12, Math.min(window.innerWidth - panelWidth - 12, left));
            let bottom = Math.max(20, window.innerHeight - rect.top + 8);

            panel.style.position = "fixed";
            panel.style.left = left + "px";
            panel.style.bottom = bottom + "px";
            panel.style.top = "auto";
            panel.style.right = "auto";
            panel.style.width = panelWidth + "px";
            panel.style.display = "block";
            panel.classList.remove("miuix-modal-out");
            panel.classList.add("active", "miuix-modal-in");
        });

        let closeBtn = panel.querySelector(".DanmakuTail-close");
        if (closeBtn) {
            closeBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                panel.style.display = "none";
                panel.classList.remove("active", "miuix-modal-in");
            });
        }

        document.addEventListener("click", function (e) {
            if (panel.style.display === "block" || panel.classList.contains("active")) {
                if (!panel.contains(e.target) && !tipBtn.contains(e.target)) {
                    panel.style.display = "none";
                    panel.classList.remove("active", "miuix-modal-in");
                }
            }
        });
    }

    initPkg_DanmakuTail_HandleFunc("#DanmakuTail-checkbox", "#DanmakuTail-input");

    // 面板节点是 insertDom 现造的：body 还没就绪时可能一个都没进 DOM。
    // 旧实现这里三个 addEventListener 全是裸取，取不到就抛 —— 整个包在初始化阶段炸掉。
    const checkbox = document.getElementById("DanmakuTail-checkbox");
    const input = document.getElementById("DanmakuTail-input");
    if (!checkbox || !input) {
        if (typeof ExGuard_warn === "function") ExGuard_warn("弹幕小尾巴", "面板节点缺失，开关与输入框未绑定（面板可能打不开）");
        return;
    }
    checkbox.addEventListener("change", function () {
        saveData_DanmakuTail();
    });
    document.querySelectorAll('input[name="DanmakuTailType"]').forEach((elem) => {
        elem.addEventListener("change", function () {
            saveData_DanmakuTail();
        });
    });
    input.addEventListener("input", function () {
        saveData_DanmakuTail();
    });

}


function initPkg_DanmakuTail_HandleFunc(checkboxSelector, inputSelector) {
    let keydownHandler = null;
    let clickHandler = null;

    // 开启
    // 返回 true = 已绑定；false = 聊天输入框/发送按钮还没渲染出来（由调用方决定等还是提示）
    function enable(content, type_value) {
        // 优先查找 textarea，如果没有则查找 div
        let textarea = document.querySelector("textarea.ChatSend-txt") || document.querySelector("div.ChatSend-txt");
        const button = document.querySelector(".ChatSend-button");
        if (!textarea || !button) return false;

        disable(); // 防止重复绑定

        // 判断元素类型，div 使用 innerText，textarea 使用 value
        const isDiv = textarea.tagName.toLowerCase() === "div";
        const getText = () => isDiv ? textarea.innerText : textarea.value;
        const setText = (text) => {
            if (isDiv) {
                textarea.innerText = text;
            } else {
                textarea.value = text;
            }
        };

        keydownHandler = function (e) {
            if (!e.isTrusted) return;
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                button.click();
            }
        };

        clickHandler = function (e) {
            const currentText = getText();
            if (currentText.trim() == "") return;
            
            let shouldAdd = false;
            if (type_value === "1") {
                // 前缀模式：检查是否以内容开头
                shouldAdd = !currentText.startsWith(content);
            } else {
                // 后缀模式：检查是否以内容结尾
                shouldAdd = !currentText.endsWith(content);
            }
            
            if (shouldAdd) {
                if (type_value === "1") {
                    setText(content + currentText);
                } else {
                    setText(currentText + content);
                }
                textarea.dispatchEvent(new Event("input", { bubbles: true }));
            }
        };

        textarea.addEventListener("keydown", keydownHandler, true);
        button.addEventListener("click", clickHandler, true);
        return true;
    }

    // 关闭
    function disable() {
        // 优先查找 textarea，如果没有则查找 div
        const textarea = document.querySelector("textarea.ChatSend-txt") || document.querySelector("div.ChatSend-txt");
        const button = document.querySelector(".ChatSend-button");
        if (textarea && keydownHandler) {
            textarea.removeEventListener("keydown", keydownHandler, true);
        }
        if (button && clickHandler) {
            button.removeEventListener("click", clickHandler, true);
        }
        keydownHandler = null;
        clickHandler = null;
    }

    // 监听 checkbox
    const checkbox = document.querySelector(checkboxSelector);
    const input = document.querySelector(inputSelector);
    const type = document.querySelectorAll('input[name="DanmakuTailType"]');
    // 单选组可能一个都没选中（页面脚本重置 / 本地存了非法类型值）：
    // 旧实现裸取 .value，一抛整包就停在初始化阶段。
    const readTypeValue = function () {
        const picked = document.querySelector('input[name="DanmakuTailType"]:checked');
        return picked ? picked.value : "2"; // 没有选中项时按默认「后缀」处理
    };
    let type_value = readTypeValue();

    // 提示小圆点：节点不在就静默跳过（旧实现直接 .classList，勾选开关那一刻抛红字）
    function setTipActive(active) {
        const tip = document.querySelector(".ChatToolBar-DanmakuTail-tip");
        if (!tip) return;
        if (active) tip.classList.add("ChatToolBar-DanmakuTail-tip-active");
        else tip.classList.remove("ChatToolBar-DanmakuTail-tip-active");
    }

    // 聊天输入框是异步渲染的：初始化那一刻常常还没出来。
    // 旧实现 enable() 里直接 return —— 用户看到「小尾巴开关是开的，但没有小尾巴」。
    // 这里用有上限轮询等它，等不到会由 ExGuard 留一条「等了多少秒、已放弃」的自证信息。
    let pendingPoll = null;
    function waitForChatAndEnable(content, type_value) {
        if (typeof ExGuard_pollFor !== "function") return false;
        if (pendingPoll) {
            pendingPoll.cancel();
            pendingPoll = null;
        }
        const findReady = function () {
            const textarea = document.querySelector("textarea.ChatSend-txt") || document.querySelector("div.ChatSend-txt");
            const button = document.querySelector(".ChatSend-button");
            return textarea && button ? textarea : null;
        };
        pendingPoll = ExGuard_pollFor(findReady, function () {
            pendingPoll = null;
            enable(content, type_value);
        }, { intervalMs: 500, maxTries: 20, tag: "弹幕小尾巴" });
        return true;
    }

    if (!checkbox || !input) {
        if (typeof ExGuard_warn === "function") {
            ExGuard_warn("弹幕小尾巴", "开关或输入框不存在（" + checkboxSelector + " / " + inputSelector + "），本次无法绑定交互");
        }
        return { enable, disable };
    }

    if (checkbox) {
        checkbox.addEventListener("change", function () {

            if (input.value.trim() === "") {
                checkbox.checked = false;
                showMessage("【弹幕小尾巴】请输入弹幕小尾巴内容", "error");
                return;
            }

            input.disabled = checkbox.checked;
            if (type.length >= 2) {
                type[0].disabled = checkbox.checked;
                type[1].disabled = checkbox.checked;
            }
            setTipActive(false);

            disable();
            if (checkbox.checked) {
                let content = input.value.trim();
                type_value = readTypeValue();
                if (!enable(content, type_value)) {
                    // 还没渲染好：先挂上有上限的等待，别让开关看起来生效却没功能
                    if (!waitForChatAndEnable(content, type_value) && typeof showMessage === "function") {
                        showMessage("【弹幕小尾巴】还没找到聊天输入框，请刷新页面后再试", "error");
                    }
                } else {
                    setTipActive(true);
                }
            }
        });

        if (checkbox.checked) {
            const content = input.value.trim();
            if (!enable(content, type_value)) {
                // 初始化早于聊天框渲染是常态：静默等它出现再绑，不再「开关开着但没效果」
                waitForChatAndEnable(content, type_value);
            }
        }
    }

    return { enable, disable };
}

