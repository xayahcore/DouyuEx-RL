function initPkg_BarragePanel() {
	let timer = setInterval(() => {
        if (document.getElementsByClassName("danmuTips-1ee820").length > 0) {
            clearInterval(timer);
            document.getElementsByClassName("danmuTips-1ee820")[0].parentElement.id = "Ex_BarragePanel";
            setBarragePanelCallBack();
        }
    }, 1500);

    initPkg_BarragePanel_Tip();
}

let barragePanel__isUpdating = false;

function barragePanel__withGuard(fn) {
    if (barragePanel__isUpdating) return;
    barragePanel__isUpdating = true;
    try {
        fn();
    } finally {
        setTimeout(() => {
            barragePanel__isUpdating = false;
        }, 0);
    }
}

function barragePanel__replaceImageDanmakuInPanel() {
    const contentDom = document.getElementsByClassName("danmuContent-25f266")[0];
    if (!contentDom) return;
    const oldText = contentDom.innerHTML;
    if (!oldText.includes(`[DouyuEx图片`)) return;
    const newText = oldText.replace(/\[DouyuEx图片(.*?)\]/g, (match, str) => getImageDanmakuHtml(str));
    if (newText !== oldText) contentDom.innerHTML = newText;
}

function setBarragePanelCallBack() {
    let a = new DomHook("#Ex_BarragePanel", true, (m) => {
        barragePanel__withGuard(() => {
            let isAttributes = false;
            if (m.length > 0) {
                for (let i = 0; i < m.length; i++) {
                    if (m[i].type == "attributes") {
                        isAttributes = true;
                        break;
                    }
                }
                if (isAttributes == false) {
                    let addedNodes = m[0].addedNodes;
                    if (addedNodes.length > 0) {
                        let barragePanel = addedNodes[0];
                        if ("getElementsByClassName" in barragePanel == false) {
                            return;
                        }
                        const barragePanelButton = barragePanel.getElementsByClassName("buttonGroup-de6b66")[0];
                        let userNameDom = barragePanel.getElementsByClassName("danmuAuthor-3d7b4a");
                        let id = "";
                        if (userNameDom.length > 0) {
                            id = userNameDom[0].innerText;
                            setUserFansMedal(userNameDom[0], id);
                            setReplyBarrageButton(barragePanelButton);
                            setSearchBarrageButton(barragePanelButton);
                            setBarragePanelButtonSplit(barragePanelButton);
                            setMuteButton(barragePanelButton);
                            setBarrgePanelFunc(barragePanelButton, id);
                        }
                    }
                } else {
                    let tmp = document.getElementsByClassName("barragePanel__funcPanel");
                    if (tmp.length > 0) {
                        tmp[0].remove();
                    }
                    let barragePanel = document.getElementsByClassName("danmudiv-32f498")[0];
                    if (barragePanel == undefined) {
                        return;
                    }
                    const barragePanelButton = barragePanel.getElementsByClassName("buttonGroup-de6b66")[0];
                    let userNameDom = barragePanel.getElementsByClassName("danmuAuthor-3d7b4a");

                    let id = "";
                    if (userNameDom.length > 0) {
                        id = userNameDom[0].innerText;
                        setUserFansMedal(userNameDom[0], id);
                        setReplyBarrageButton(barragePanelButton);
                        setSearchBarrageButton(barragePanelButton);
                        setBarragePanelButtonSplit(barragePanelButton);
                        setMuteButton(barragePanelButton);
                        setBarrgePanelFunc(barragePanelButton, id);
                    }
                    barragePanel__replaceImageDanmakuInPanel();
                }
            }
        });
    });

    new DomHook("#Ex_BarragePanel", false, (m) => {
        barragePanel__withGuard(() => {
            barragePanel__replaceImageDanmakuInPanel();
        });
    })
    
}

function getUserFansMedal(userName) {
    let ret = false;
    let barrageList = document.getElementsByClassName("Barrage-listItem");
    for (let i = barrageList.length - 1; i >= 0; i--) {
        let barragePanel = barrageList[i].lastElementChild;
        if (barragePanel != null && barragePanel != undefined && barragePanel.innerHTML.indexOf(userName) != -1) {
            let fansElement = barragePanel.getElementsByClassName("FansMedalWrap");
            if (fansElement.length > 0) {
                ret = fansElement[0].cloneNode(true);
                break;
            }
        }
    }
    return ret;
}
function getUserLevelText(userName) {
    let ret = "";
    let barrageList = document.getElementsByClassName("Barrage-listItem");
    for (let i = barrageList.length - 1; i >= 0; i--) {
        let barragePanel = barrageList[i].lastElementChild;
        if (barragePanel != null && barragePanel != undefined && barragePanel.innerHTML.indexOf(userName) != -1) {
            let roomAdmin = barragePanel.getElementsByClassName("Barrage-icon--roomAdmin");
            if (roomAdmin.length > 0) {
                ret += "【房管】";
            }
            let noble = barragePanel.getElementsByClassName("Barrage-nobleImg");
            if (noble.length > 0) {
                ret += `【${ noble[0].title }】`;
            }
            let level = barragePanel.getElementsByClassName("UserLevel");
            if (level.length > 0) {
                ret += level[0].title;
            }
            break;
        }
    }
    return ret;
}

function setUserFansMedal(dom, userName) {
    if (dom.querySelector("#barragePanel__id") == undefined) {
        if (dom.childNodes && dom.childNodes.length > 0) dom.removeChild(dom.childNodes[0]);
        let userLevel = getUserLevelText(userName);
        let a = document.createElement("span");
        a.innerHTML = userName;
        a.title = userLevel;
        a.id = "barragePanel__id";
        dom.insertBefore(a, dom.childNodes[0] || null);
    }
    

    let fansMedal = getUserFansMedal(userName);
    if (fansMedal != false) {
        let medalWrap = dom.querySelector("#barragePanel__fansMedal");
        if (!medalWrap) {
            medalWrap = document.createElement("div");
            medalWrap.id = "barragePanel__fansMedal";
            medalWrap.style = "display:inline-block";
            dom.insertBefore(medalWrap, dom.childNodes[0] || null);
        } else {
            medalWrap.innerHTML = "";
        }
        medalWrap.appendChild(fansMedal);
    }
}

function setBarragePanelButtonSplit(dom) {
    if (document.getElementById("barragePanel__split") != null) {
        return;
    }
    let a = document.createElement("br");
    a.id = "barragePanel__split";
    dom.appendChild(a);
}

function setMuteButton(dom) {
    if (document.getElementById("barragePanel__mute") != null) {
        return;
    }
    if (document.getElementsByClassName("barragePanel__muteTime").length > 0) {
        return;
    }
    let a = document.createElement("div");
    a.style = "display:flex;align-items:center;width:100%;gap:8px;";
    a.innerHTML = `
        <div class="button-7e1395" id="barragePanel__mute" style="z-index:5">禁言</div>
        <div class="barragePanel__muteTime" style="z-index:5">
            <select id="barragePanel__muteSelect" style='width:55px'>
                <option value="1">1分钟</option>
                <option value="10">10分钟</option>
                <option value="30">30分钟</option>
                <option value="60">1小时</option>
                <option value="480">8小时</option>
                <option value="1440">1天</option>
                <option value="4320">3天</option>
                <option value="10080">7天</option>
                <option value="43200">30天</option>
                <option value="259200">180天</option>
                <option value="518400">360天</option>
            </select>
        </div>
    `
    dom.appendChild(a);
}

function setSearchBarrageButton(dom) {
    if (document.getElementById("barragePanel__search") != null) {
        return;
    }
    let a = document.createElement("div");
    a.className = "button-7e1395";
    a.innerText = "查弹幕";
    a.id = "barragePanel__search";
    a.style = "z-index:5";
    dom.appendChild(a);
}

function setReplyBarrageButton(dom) {
    if (document.getElementById("barragePanel__reply") != null) {
        return;
    }
    let a = document.createElement("div");
    a.className = "button-7e1395";
    a.innerText = "回复";
    a.id = "barragePanel__reply";
    a.style = "z-index:5";
    dom.appendChild(a);
}

function setBarrgePanelFunc(parentDom, id) {
    document.getElementById("barragePanel__reply").onclick = () => {
        let txt = document.getElementsByClassName("danmuContent-25f266")[0].innerText;
        const chatDom = document.getElementsByClassName("ChatSend-txt")[0];
        const value = `@${ id }：${ txt }`;
        if (chatDom.tagName == "TEXTAREA") {
            chatDom.value = value;
        } else {
            chatDom.innerText = value;
        }
        chatDom.focus();
    };

    document.getElementById("barragePanel__mute").onclick = async () => {
        let value = document.getElementById("barragePanel__muteSelect").value || "1";
        let ret = await addMuteUser(rid, id, value);
        if (ret.msg == "添加成功") {
            showMessage(`【禁言】${id}已被禁言${value}分钟`, "success");
        } else {
            showMessage(ret.msg, "error");
        }
    };
    
    document.getElementById("barragePanel__search").onclick = async () => {
        // 接口失败时 getUserUid 会给出空串：必须显式提示，不能点了没反应
        let uid = await getUserUid(id);
        if (uid !== "") {
            // dt=0（“全部日期”模式）在数据源端已返回 502 Bad Gateway，必须传具体直播日
            openPage(`https://www.doseeing.com/data/fan/${uid}?type=chat&dt=${getLocalDateStr()}`, true);
        } else {
            showMessage("【查弹幕】未能解析该用户的 UID（接口异常或查无此人）", "warning");
        }
    };
}

function insertBarragePanel_SearchBarrage_Dom(parentDom) {
    let pMarginLeft = parseInt(parentDom.style.marginLeft);
    let newMarginLeft = "-237px";
    if (pMarginLeft > 237) {
        newMarginLeft = "-237px";
    } else {
        newMarginLeft = "237px";
    }
    
    let a = document.createElement("div");
    a.className = "barragePanel__funcPanel";
    a.style = `margin-left:${newMarginLeft}`;
    a.innerHTML = `
    <ul class="layui-timeline" id="barragePanel__searchPanel">
        
    </ul>
    `;

    parentDom.insertBefore(a, parentDom.childNodes[0]);
}


function getUserRecentBarrage(name) {
    return new Promise(resolve => {
        GM_xmlhttpRequest({
            method: "GET",
            url: "http://dyapi.fz996.com/api/Wx/GetDataBarrage?keyword=" + name,
            responseType: "json",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            onload: function(response) {
                let ret = response.response;
                resolve(ret);
            }
        });
    });
}

/**
 * 按昵称反查 doseeing 的 user_id（查弹幕用）。
 *
 * 历史问题：只有 onload 且没有异常兜底 ——
 *  ① GM_xmlhttpRequest 失败/超时没有被监听的回调，Promise 永不 settle，按钮点了没反应；
 *  ② onload 里 `if (!ret.suggest) success = false;` 之后又直接 `ret.suggest.fan`，
 *     接口返回 null 或没有 suggest 字段时在 onload 里抛 TypeError，同样让 Promise 悬着。
 * 现在任何异常路径都 resolve 成空串，调用方据此给出提示。
 */
function getUserUid(name) {
    return new Promise(resolve => {
        let settled = false;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            resolve(value === undefined || value === null ? "" : value);
        };
        try {
            GM_xmlhttpRequest({
                method: "GET",
                url: "https://www.doseeing.com/api/suggest_all?type=room&nickname=" + encodeURIComponent(name),
                responseType: "json",
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                onload: function(response) {
                    // 数据源可能返回 null / 缺 suggest / 缺 fan：逐层判空，取不到一律当未找到
                    let ret = (response && response.response) || {};
                    let suggest = ret.suggest || {};
                    let fan = suggest.fan;
                    if (!fan || fan.length === 0 || !fan[0] || fan[0].nickname !== name) {
                        finish("");
                        return;
                    }
                    finish(fan[0].user_id);
                },
                onerror: function(err) {
                    console.warn("[DouyuEx] 查弹幕接口请求失败：" + ((err && err.message) || err));
                    finish("");
                },
                ontimeout: function() {
                    console.warn("[DouyuEx] 查弹幕接口超时");
                    finish("");
                }
            });
        } catch (e) {
            console.warn("[DouyuEx] 查弹幕请求无法发起：" + ((e && e.message) || e));
            finish("");
        }
    });
}


