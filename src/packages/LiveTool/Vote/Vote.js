let isVoteOn = false;
let voteList = {};
let voteNameList = {};
let voteWordList = {};
let voteTotalNum = 0;
let timer_Vote;
let isRepeat = false;
function initPkg_LiveTool_Vote() {
    LiveTool_Vote_insertDom();
    LiveTool_Vote_insertDom_VotePanel();
    LiveTool_Vote_insertFunc();
    initPkg_Vote_Set();
}

function LiveTool_Vote_insertDom() {
    // S1-E：抽屉单元格 DOM 改由 ExUI 产出；旧类名只以 legacy 影子挂在对应节点上，观感零差异
    let cellTitle = ExUI.stack({
        html: `
            <span id='vote__title'>弹幕投票</span>
            <span class='ui-cell__desc'>在直播间发起或参与弹幕投票</span>
        `,
        cls: "ui-cell__title"
    });
    let cellOption = ExUI.stack({
        html: `
            ` +
        ExUI.stack({
            html: `
                <input type="checkbox" class="sign-checkbox" id="vote__switch" tabindex="0" checked>
            `,
            cls: "ui-cell__switch"
        }) + `
        `,
        cls: "ui-cell__option"
    });
    let panel = ExUI.stack({
        html: `
            <select id='vote__select'>
            </select>
            <label class="dx-ml-5" >限时：<input id="vote__time" type="text" placeholder="秒" /></label>
            <div class="vote__option">
                <label>主题：<input id="vote__theme" type="text"/></label>
                <label>选项：<input id="vote__options" type="text" placeholder="用空格隔开每个选项"/></label>
            </div>
        `,
        legacy: "vote__panel"
    });
    /* 抽屉只是面板，不该继承 .ui-stack 的 display:flex —— 去掉该类，默认收起回到单类选择器 */
    panel = panel.replace('class="ui-stack ', 'class="');
    /* 抽屉底部：导入/导出等次级动作集中在这里，行内只保留标题+开关 */
    panel = panel.replace(/<\/div>$/, "<label class='ui-cell__row-option'><span>允许重复投票</span><input id='vote__repeat' type='checkbox' class='sign-checkbox'></label><div class='ui-cell__actions'><input type='button' id='vote__add' value='添加' /><input type='button' id='vote__del' value='删除' /><button type='button' class='ui-btn ui-btn--quiet' id='vote__show-result'>面板</button></div><\/div>");
    // 标题 + 开关槽与抽屉面板是兄弟节点：三者同挂到单元格 div 下（不是父子嵌套）
    let a = ExUI.node(ExUI.stack({ html: cellTitle + cellOption + panel, cls: "ui-cell" }));
    
    let b = document.getElementsByClassName("livetool")[0];
    if (b) {
        b.insertBefore(a, b.childNodes[0]);
        Vote_syncEmpty();
    } else {
        ExGuard_warn("弹幕投票", "未找到 .livetool 容器，面板未插入（该模块不启用）");
    }
}


function LiveTool_Vote_insertFunc() {
    document.getElementById("vote__switch").addEventListener("click", () => {
        let ischecked = document.getElementById("vote__switch").checked;
        let selectDom = document.getElementById("vote__select");
        let title = selectDom.options[selectDom.selectedIndex].text;
        let options = voteList[title].options;
        let time = voteList[title].time;
		if (ischecked == true) {
            // 开启关键词禁言
            let arr = String(options).split(" ");
            for (let i = 0; i < arr.length; i++) {
                voteWordList[arr[i]] = {
                    num: 0,
                    index: i
                };
            }
            document.getElementById("vote__repeat").disabled = true;
            voteTotalNum = 0;
            initVoteOptionsPanel(title, options);


            isRepeat = document.getElementById("vote__repeat").checked;
            isVoteOn = true;
            timer_Vote = setTimeout(() => {
                voteNameList = {};
                voteWordList = {};
                isVoteOn = false;
                document.getElementById("vote__repeat").disabled = false;
                document.getElementById("vote__switch").checked = false;
            }, time * 1000);

            let resultPanel = document.getElementsByClassName("vote__result")[0];
            if (resultPanel) {
                resultPanel.style.display = "block";
            } else {
                ExGuard_warn("弹幕投票", "投票结果面板缺失，本轮的展开已跳过");
            }
		} else{
            // 关闭关键词禁言
            clearTimeout(timer_Vote);
            voteNameList = {};
            voteWordList = {};
            isVoteOn = false;
            document.getElementById("vote__repeat").disabled = false;
        }
    });
    document.getElementById("vote__title").addEventListener("click", () => {
        let a = document.getElementsByClassName("vote__panel")[0];
        if (!a) {
            ExGuard_warn("弹幕投票", "面板节点缺失，忽略本次展开");
            return;
        }
        if (a.style.display !== "block" && a.style.display !== "flex") {
            a.style.display = "flex";
            // 其余抽屉统一收起：节点不在就跳过，不再逐个裸解引用
            LiveTool_hideDrawerPanelsExcept("vote__panel");
        } else {
            a.style.display = "none";
        }
    });
    
    document.getElementById("vote__select").onclick = function() {
        if (this.options.length == 0) {
            return;
        }
        let title = this.options[this.selectedIndex].text;
        let options = voteList[title].options;
        let time = voteList[title].time;
        document.getElementById("vote__theme").value = title;
        document.getElementById("vote__options").value = options;
        document.getElementById("vote__time").value = time;
    };

    document.getElementById("vote__add").addEventListener("click", () => {
        let select_wordList = document.getElementById("vote__select");
        let title = document.getElementById("vote__theme").value;
        let options = document.getElementById("vote__options").value;
        let time = document.getElementById("vote__time").value;

        if (title == "" || options == "" || time == "") {
            if (typeof showMessage === "function") showMessage("主题 / 选项 / 限时都要填", "warning");
            return;
        }

        // 构造json并添加json
        voteList[title] = {
            options: options,
            time: time
        }

        // 添加到select中去
        if (select_wordList.dataset.empty === "1") { select_wordList.remove(0); delete select_wordList.dataset.empty; }
        var opt = document.createElement("option");
        opt.textContent = title;
        opt.value = "";
        select_wordList.options.add(opt);
        Vote_syncEmpty();

        saveDate_Vote();
    });

    document.getElementById("vote__del").addEventListener("click", () => {
        let select_wordList = document.getElementById("vote__select");
        if (!select_wordList.options.length || select_wordList.selectedIndex < 0 || select_wordList.dataset.empty === "1") return;
        let title = select_wordList.options[select_wordList.selectedIndex].text;

        // 删除json内的对象
        delete voteList[title];

        // 删除select里的option
        select_wordList.options.remove(select_wordList.selectedIndex);
        saveDate_Vote();
    });

    document.getElementById("vote__show-result").addEventListener("click", () => {
        let a = document.getElementsByClassName("vote__result")[0];
		if (a.style.display !== "block" && a.style.display !== "flex") {
			a.style.display = "flex";
		} else {
			a.style.display = "none";
		}
    })
}

function initPkg_Vote_Set() {
    document.getElementById("vote__switch").checked = isReplyOn;
	// 设置初始化
	let ret = localStorage.getItem("ExSave_Vote");
	
	if (ret != null) {
        let retJson = JSON.parse(ret);
        voteList = retJson;
        let select_wordList = document.getElementById("vote__select");
		for (let key in retJson) {
            if (retJson.hasOwnProperty(key)) {
                select_wordList.options.add(new Option(key, ""));
            }
        }
    }
}

function initPkg_LiveTool_Vote_Handle(text) {
    if (isVoteOn == false) {
        return;
    }
    if (getType(text) == "chatmsg") {
        let uid = getStrMiddle(text, "uid@=", "/");
        let txt = getStrMiddle(text, "txt@=", "/");
        if (isRepeat) {
            if (Object(voteWordList).hasOwnProperty(txt)) {
                voteWordList[txt].num++;
                voteTotalNum++;
                changeOptionsData();
            }
        } else {
            if (Object(voteNameList).hasOwnProperty(uid) == false) {
                if (Object(voteWordList).hasOwnProperty(txt)) {
                    voteNameList[uid] = 0;
                    voteWordList[txt].num++;
                    voteTotalNum++;
                    changeOptionsData();
                }
            }
        }
    }
    
}

function saveDate_Vote() {
    let data = voteList;
	localStorage.setItem("ExSave_Vote", JSON.stringify(data)); // 存储弹幕列表
}


function LiveTool_Vote_insertDom_VotePanel() {
    let a = document.createElement("div");
    a.className = "vote__result";
    let panel = `
        <div id="vote__result-theme">投票主题</div>
        <div id="vote__result-close">X</div>
        <div id="vote__result-options"></div>
    `;
    a.innerHTML = panel;
    
    let b = getValidDom([".layout-Player-main", "main", ".Barrage-main"]) || document.body;
    if (b) b.insertBefore(a, b.childNodes[0]);

    let box = document.getElementsByClassName("vote__result")[0];
    box.onmousedown = function (event) {
        event.stopPropagation();
        let xx = event.clientX - box.offsetLeft;
        let yy = event.clientY - box.offsetTop;
        let mouseX;
        let mouseY;
        function onMouseMove(event) {
            event.stopPropagation();
            mouseX = event.clientX - xx;
            mouseY = event.clientY - yy;
            box.style.left = mouseX + "px";
            box.style.top = mouseY + "px";
        }
        function onMouseUp(event) {
            event.stopPropagation();
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        }
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }

    document.getElementById("vote__result-close").addEventListener("click", () => {
        let resultPanel = document.getElementsByClassName("vote__result")[0];
        if (resultPanel) resultPanel.style.display = "none";
    })
}


function initVoteOptionsPanel(theme, options) {
    // 设置标题
    document.getElementById("vote__result-theme").innerText = theme;

    // 设置结果面板
    document.getElementById("vote__result-options").innerHTML = ""; // 清空信息面板
    setVoteOptionsDom(options);
}

function setVoteOptionsDom(options) {
    let arr = options.split(" ");
    let b = document.getElementById("vote__result-options");
    for (let i = 0; i < arr.length; i++) {
        let a = document.createElement("div");
        a.className = "vote__option-wrap";
        a.innerHTML = `
            <div class="vote__option-choice">${ arr[i] }</div>
            <div class="vote__option-num"></div>
            <div class="vote__progress">
                <div class="vote__progress-bar"></div>
            </div>
        `;
        b.appendChild(a);
    }
}

function changeOptionsData() {
    for (const key in voteWordList) {
        let item = voteWordList[key];
        
        let domNum = document.getElementsByClassName("vote__option-num")[item.index];
        let domBar = document.getElementsByClassName("vote__progress-bar")[item.index];

        let percent = String(Number(Number(item.num / voteTotalNum) * 100).toFixed(1)) + "%";
        domNum.innerText = `${ item.num }（${ percent }）`;
        domBar.style.width = percent;
    }
}
/** 没有预设规则时给下拉一个占位项，并禁用「删除」（避免读 options[-1] 抛错） */
function Vote_syncEmpty() {
  var sel = document.getElementById("vote__select");
  var del = document.getElementById("vote__del");
  if (!sel) return;
  var real = Array.prototype.filter.call(sel.options, function (o) { return o.value !== "" || !o.disabled; });
  if (sel.options.length === 0) {
    var o = document.createElement("option");
    o.textContent = "暂无预设 · 填好后点添加";
    o.value = "";
    o.disabled = true;
    sel.add(o);
    sel.selectedIndex = 0;
    sel.dataset.empty = "1";
  }
  if (del) del.disabled = sel.dataset.empty === "1";
}
