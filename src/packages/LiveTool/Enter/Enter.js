let isEnterOn = false;
let enterWordList = [];
function initPkg_LiveTool_Enter() {
    LiveTool_Enter_insertDom();
    LiveTool_Enter_insertFunc();
    initPkg_Enter_Set();
}

function LiveTool_Enter_insertDom() {
    // S1-E：抽屉单元格 DOM 改由 ExUI 产出；旧类名只以 legacy 影子挂在对应节点上，观感零差异
    let cellTitle = ExUI.stack({
        html: `
            <span id='enter__title'>进场欢迎</span>
            <span class='ui-cell__desc'>有人进直播间时自动发欢迎语</span>
        `,
        cls: "ui-cell__title"
    });
    let cellOption = ExUI.stack({
        html: ExUI.stack({
            html: `
                <input type="checkbox" class="sign-checkbox" id="enter__switch" tabindex="0" checked>
            `,
            cls: "ui-cell__switch"
        }),
        cls: "ui-cell__option"
    });
    let panel = ExUI.stack({
        html: `
            <select id='enter__select'>
            </select>
            <div class="enter__option">
                <label>等级≥<input id="enter__level" type="text" value="1"/></label>
                <label>当前欢迎词：<input id="enter__word" type="text" placeholder="欢迎<id>光临直播间"/></label>
            </div>
            <div class='ui-cell__actions'><input type='button' id='enter__add' value='添加' /><input type='button' id='enter__del' value='删除' /><button type='button' class='ui-btn ui-btn--quiet' id='enter__export'>导出</button><button type='button' class='ui-btn ui-btn--quiet' id='enter__import'>导入</button></div>
        `,
        legacy: "enter__panel"
    });
    /* 抽屉只是面板，不该继承 .ui-stack 的 display:flex —— 去掉该类，默认收起回到单类选择器 */
    panel = panel.replace('class="ui-stack ', 'class="');
    // 标题 + 开关槽与抽屉面板是兄弟节点：三者同挂到单元格 div 下（不是父子嵌套）
    let a = ExUI.node(ExUI.stack({ html: cellTitle + cellOption + panel, cls: "ui-cell" }));
    
    let b = document.getElementsByClassName("livetool")[0];
    if (b) {
        b.insertBefore(a, b.childNodes[0]);
    } else {
        ExGuard_warn("自动欢迎", "未找到 .livetool 容器，面板未插入（该模块不启用）");
    }
}


function LiveTool_Enter_insertFunc() {
    document.getElementById("enter__export").addEventListener("click", () => {
        GM_setClipboard(JSON.stringify(enterWordList));
        showMessage("【进场欢迎】导出完毕，已复制到剪贴板", "success");
    });

    document.getElementById("enter__import").addEventListener("click", () => {
        PostbirdAlertBox.prompt({
            'title': "请输入json文本（会覆盖原来的设置）",
            'okBtn': '确定',
            onConfirm: function (data) {
                try {
                    let parsed = JSON.parse(data || "[]");
                    let list = [];
                    if (Array.isArray(parsed)) {
                        list = parsed.filter(item => item && typeof item.word === "string");
                    } else if (typeof parsed === "object" && parsed !== null) {
                        for (let k in parsed) {
                            list.push({ level: Number(parsed[k]?.level || parsed[k]) || 1, word: k });
                        }
                    }
                    enterWordList = list;
                    enterWordList.sort((a, b) => b.level - a.level);
                    refreshEnterSelectOptions();
                    saveData_Enter();
                    showMessage("【进场欢迎】导入完毕", "success");
                } catch (e) {
                    showMessage("【进场欢迎】JSON格式错误", "error");
                }
            },
            onCancel: function (data) {
            },
        });
    });

    document.getElementById("enter__switch").addEventListener("click", () => {
        let ischecked = document.getElementById("enter__switch").checked;
		if (ischecked == true) {
            // 开启关键词禁言
            isEnterOn = true;
		} else{
            // 关闭关键词禁言
            isEnterOn = false;
        }
        saveData_isEnter();

    });
    document.getElementById("enter__title").addEventListener("click", () => {
        let a = document.getElementsByClassName("enter__panel")[0];
        if (!a) {
            ExGuard_warn("自动欢迎", "面板节点缺失，忽略本次展开");
            return;
        }
        if (a.style.display !== "block" && a.style.display !== "flex") {
            a.style.display = "flex";
            // 其余抽屉统一收起：节点不在就跳过，不再逐个裸解引用
            LiveTool_hideDrawerPanelsExcept("enter__panel");
        } else {
            a.style.display = "none";
        }
    });
    
    document.getElementById("enter__select").onclick = function() {
        if (this.options.length == 0 || this.selectedIndex < 0) {
            return;
        }
        let item = enterWordList[this.selectedIndex];
        if (!item) return;
        document.getElementById("enter__word").value = item.word || "";
        document.getElementById("enter__level").value = item.level || 1;
        localStorage.setItem("ExSave_LastEnterWord", item.word || "");
    };

    document.getElementById("enter__add").addEventListener("click", () => {
        let select_wordList = document.getElementById("enter__select");
        let word = document.getElementById("enter__word").value;
        let level = document.getElementById("enter__level").value;

        if (word == "") return;
        if (level == "") return;

        let isExist = false;

        for (const item of enterWordList) {
            if (Number(level) === Number(item.level)) {
                isExist = true;
                break;
            }
        }
        if (isExist) {
            showMessage("【进场欢迎】等级已存在", "error");
            return;
        }
        
        enterWordList.push({
            level,
            word
        });
        
        enterWordList.sort((a, b) => b.level - a.level);
        refreshEnterSelectOptions();
        saveData_Enter();
    });

    document.getElementById("enter__del").addEventListener("click", () => {
        let select_wordList = document.getElementById("enter__select");
        let word = select_wordList.options[select_wordList.selectedIndex].text;
        enterWordList.splice(select_wordList.selectedIndex, 1);
        enterWordList.sort((a, b) => b.level - a.level);
        refreshEnterSelectOptions();
        saveData_Enter();
    });

}


function saveData_Enter() {
	let data = enterWordList;
    localStorage.setItem("ExSave_Enter", JSON.stringify(data)); // 存储弹幕列表
}

function saveData_isEnter() {
    let ridArr = [];
    let ret = localStorage.getItem("ExSave_isEnter");
    if (ret != null) {
        let retJson = JSON.parse(ret);
        if ("rooms" in retJson == true) {
            ridArr = retJson.rooms;
        }
    }
    let index = ridArr.indexOf(rid);
    if (isEnterOn == true) {
        if (index == -1) {
            ridArr.push(rid);
        }
    } else {
        // index === -1 时 splice(-1,1) 会删掉数组最后一项 —— 把别的房间记录顶掉（S1-C / A-1）
        if (index > -1) ridArr.splice(index, 1);
    }
	let data = {
        rooms: ridArr,
    };
	localStorage.setItem("ExSave_isEnter", JSON.stringify(data)); // 存储弹幕列表
}

function refreshEnterSelectOptions() {
    let select_wordList = document.getElementById("enter__select");
    select_wordList.options.length = 0;
    for (const item of enterWordList) {
        select_wordList.options.add(new Option(`【${item.level}级】${item.word}`, ""));
    }
}

function initPkg_Enter_Set() {
	// 设置初始化
    let ret = localStorage.getItem("ExSave_Enter");
    if (ret == "") {
        return;
    }
	let select_wordList = document.getElementById("enter__select");
	if (ret != null) {
        let retJson = JSON.parse(ret);
        if (!Array.isArray(retJson)) {
            retJson = [];
            saveData_Enter();
        }
        enterWordList = retJson;
		refreshEnterSelectOptions();
    }
    
    // ret = localStorage.getItem("ExSave_LastEnterWord");
    // if (ret != null) {
    //     let i = 0;
    //     for (const key in enterWordList) {
    //         if (key == ret) {
    //             select_wordList.selectedIndex = i;
    //             let level = enterWordList[ret].enter;
    //             document.getElementById("enter__word").value = ret;
    //             document.getElementById("enter__level").value = level;
    //             break;
    //         }
    //         i++;
    //     }
    // } 

    ret = localStorage.getItem("ExSave_isEnter");
	
	if (ret != null) {
        let retJson = JSON.parse(ret);
        let ridArr = [];
        if ("rooms" in retJson == true) {
            ridArr = retJson.rooms;
        }
        if (ridArr.indexOf(rid) == -1) {
            isEnterOn = false;
        } else {
            isEnterOn = true;
        }
        document.getElementById("enter__switch").checked = isEnterOn;
	} else {
        isEnterOn = false;
        document.getElementById("enter__switch").checked = isEnterOn;
    }
}

function initPkg_LiveTool_Enter_Handle(text) {
    if (isEnterOn == false) {
        return;
    }
    if (getType(text) == "uenter") {
        let uid = getStrMiddle(text, "uid@=", "/");
        if (uid == my_uid) { // 不算自己
            return;
        }
        let nn = getStrMiddle(text, "nn@=", "/");
        let level = getStrMiddle(text, "level@=", "/");
        for (const item of enterWordList) {
            if (Number(level) >= Number(item.level)) {
                let reply = String(item.word).replace(/<id>/g, nn);
                sendBarrage(reply);
                break;
            }
        }
    }
}

