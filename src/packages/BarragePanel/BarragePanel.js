function initPkg_BarragePanel() {
    // 旧实现是 1.5 秒一次的裸 setInterval：提示节点始终不出现就永久空转，且没有线索。
    ExGuard_pollFor(
        function () {
            return document.getElementsByClassName("danmuTips-1ee820")[0];
        },
        function (tipsDom) {
            try {
                const parent = tipsDom.parentElement;
                if (!parent) {
                    ExGuard_warn("弹幕面板", "提示节点没有父节点，无法挂面板钩子");
                    return;
                }
                parent.id = "Ex_BarragePanel";
                setBarragePanelCallBack();
            } catch (e) {
                ExGuard_warn("弹幕面板", "挂载面板钩子失败", e);
            }
        },
        Object.assign({ intervalMs: 1500, maxTries: 40, tag: "弹幕面板" }, barragePanel_pollOpts)
    );

    initPkg_BarragePanel_Tip();
}

let barragePanel__isUpdating = false;
// 轮询参数：默认 1.5 秒 × 40 次（1 分钟）；测试会改这份配置来验证上限
let barragePanel_pollOpts = { intervalMs: 1500, maxTries: 40, tag: "弹幕面板" };

function barragePanel__withGuard(fn) {
    if (barragePanel__isUpdating) return;
    barragePanel__isUpdating = true;
    try {
        fn();
    } catch (e) {
        ExGuard_warn("弹幕面板", "面板状态更新失败（本次跳过，observer 继续工作）", e);
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
    if (!dom) {
        ExGuard_warn("弹幕面板", "按钮容器不存在，本次跳过 setBarragePanelButtonSplit");
        return;
    }
    if (document.getElementById("barragePanel__split") != null) {
        return;
    }
    let a = document.createElement("br");
    a.id = "barragePanel__split";
    dom.appendChild(a);
}

function setMuteButton(dom) {
    if (!dom) {
        ExGuard_warn("弹幕面板", "按钮容器不存在，本次跳过 setMuteButton");
        return;
    }
    if (document.getElementById("barragePanel__mute") != null) {
        return;
    }
    if (document.getElementsByClassName("barragePanel__muteTime").length > 0) {
        return;
    }
    let a = document.createElement("div");
    a.style = "display:flex;align-items:center;width:100%;gap:8px;";
    a.innerHTML = `
        <div class="button-7e1395 dx-z-5" id="barragePanel__mute" >禁言</div>
        <div class="barragePanel__muteTime dx-z-5" >
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

function setReplyBarrageButton(dom) {
    if (!dom) {
        ExGuard_warn("弹幕面板", "按钮容器不存在，本次跳过 setReplyBarrageButton");
        return;
    }
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
    const replyBtn = document.getElementById("barragePanel__reply");
    const muteBtn = document.getElementById("barragePanel__mute");
    if (!replyBtn || !muteBtn) {
        ExGuard_warn("弹幕面板", "回复/禁言按钮没有全部注入成功，本次跳过绑定");
        return;
    }

    replyBtn.onclick = () => {
        try {
            const contentDom = document.getElementsByClassName("danmuContent-25f266")[0];
            const chatDom = document.getElementsByClassName("ChatSend-txt")[0];
            if (!contentDom || !chatDom) {
                ExGuard_warn("弹幕面板", "回复失败：弹幕内容或聊天输入框不存在");
                return;
            }
            let txt = contentDom.innerText;
            const value = `@${ id }：${ txt }`;
            if (chatDom.tagName == "TEXTAREA") {
                chatDom.value = value;
            } else {
                chatDom.innerText = value;
            }
            chatDom.focus();
        } catch (e) {
            ExGuard_warn("弹幕面板", "回复操作失败", e);
        }
    };

    muteBtn.onclick = async () => {
        try {
            const selectDom = document.getElementById("barragePanel__muteSelect");
            let value = (selectDom && selectDom.value) || "1";
            let ret = await addMuteUser(rid, id, value);
            if (!ret) {
                showMessage("【禁言】操作失败：接口没有返回结果", "error");
                return;
            }
            if (ret.msg == "添加成功") {
                showMessage(`【禁言】${id}已被禁言${value}分钟`, "success");
            } else {
                showMessage(ret.msg || "【禁言】操作失败", "error");
            }
        } catch (e) {
            ExGuard_warn("弹幕面板", "禁言操作失败", e);
            showMessage("【禁言】操作失败：" + ((e && e.message) || e), "error");
        }
    };
}

/* 查弹幕（doseeing / fz996 两个第三方数据源）已于 2026-11-08 整体移除：
   两个接口都停服，按钮点开只会得到一个空白页。 */

