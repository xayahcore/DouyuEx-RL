let svg_accountList = `<svg t="1613993967937" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2122" width="16" height="16"><path d="M217.472 311.808l384.64 384.64-90.432 90.56-384.64-384.64z" fill="#8A8A8A" p-id="2123"></path><path d="M896.32 401.984l-384.64 384.64-90.56-90.496 384.64-384.64z" fill="#8A8A8A" p-id="2124"></path></svg>`
let cleanOverTimes = 0; // 用于判断是否全部清空并跳转
function initPkg_AccountList() {
    // GM_deleteValue("Ex_accountList");
    // GM_deleteValue("Ex_accountListPassport");
    // return;
    const isBeta = !!document.getElementsByClassName("live-next-body")[0];
    if (isBeta) return;
    initPkg_AccountList_Dom();
    initPkg_AccountList_Func();
}

function initPkg_AccountList_Dom() {
    AccountList_insertIcon();
}

function AccountList_insertIcon() {
    let a = document.createElement("div");
    a.style = "position: absolute;right: -14px;top: 32px;cursor: pointer;"
    a.id = "ex-accountList-icon";
    let html = `
        <div id="ex-accountList-wrap" class="public-DropMenu-drop">
            <div class="public-DropMenu-drop-main">
                <div id="ex-accountList-iframe"></div>
                <div id="ex-accountList-iframe2"></div>
                <div id="ex-accountList-content" style="width: 300px;font-size: 14px;padding: 10px;">
                </div>
            </div>
            <i></i>
        </div>
    `;
    a.innerHTML = svg_accountList + html;
    // a.innerHTML = svg_accountList + `<div id="ex-accountList-wrap" class="public-DropMenu-drop"><div class="public-DropMenu-drop-main"><div style="width: 300px;font-size: 14px;"></div></div><i></i></div>`;
    // a.title = "账号列表";
    let b = document.getElementsByClassName("Header-right")[0] || document.querySelector("header") || document.body;
    if (b) b.appendChild(a);

    addAccount();
}


function initPkg_AccountList_Func() {
    setPassportCmd("null", my_uid);
    unsafeWindow.addEventListener("message", (event) => {
        switch (event.data) {
            case "cleanOver":
                setTimeout(() => {
                    window.location.reload();
                }, 50);
                break;
            case "msgCleanOver":
                cleanOverTimes++;
                if (cleanOverTimes >= 5) {
                    cleanOverTimes = 0;
                    setTimeout(() => {
                        window.location.reload();
                    }, 50);
                }
                break;
            case "yubaCleanOver":
                cleanOverTimes++;
                if (cleanOverTimes >= 5) {
                    cleanOverTimes = 0;
                    setTimeout(() => {
                        window.location.reload();
                    }, 50);
                }
                break;
            case "videoCleanOver":
                cleanOverTimes++;
                if (cleanOverTimes >= 5) {
                    cleanOverTimes = 0;
                    setTimeout(() => {
                        window.location.reload();
                    }, 50);
                }
                break;
            case "czCleanOver":
                cleanOverTimes++;
                if (cleanOverTimes >= 5) {
                    cleanOverTimes = 0;
                    setTimeout(() => {
                        window.location.reload();
                    }, 50);
                }
                break;
            case "switchOver":
                cleanOverTimes++;
                if (cleanOverTimes >= 5) {
                    cleanOverTimes = 0;
                    setTimeout(() => {
                        window.location.reload();
                    }, 50);
                }
                break;
            case "deleteOver":
                renderAccountList();
                showMessage("【账号管理】删除完毕", "success");
                break;
            default:
                break;
        }
    })
}

function renderAccountList(obj) {
    document.getElementById("ex-accountList-content").innerHTML = getAccountListHtml(obj);
    let items = document.getElementsByClassName("ex-accountList-item");
    for (let i = 0; i < items.length; i++) {
        let item = items[i];
        let uid = item.getAttribute("uid");
        item.addEventListener("click", () => {
            showMessage("【账号管理】正在切换账号，请耐心等待...", "info");
            switchAccount(uid, () => {});
            setPassportCmd("switch", uid);
            setYubaAndMsgAndVideoClean();
        })
        item.getElementsByClassName("ex-accountList-item__btn")[0].addEventListener("click", (e) => {
            e.stopPropagation();
            showMessage("【账号管理】正在删除...", "info");
            deleteAccount(uid, () => {});
            setPassportCmd("delete", uid);
        })
    }

    document.getElementById("ex-accountList-item-add").addEventListener("click", () => {
        // 重新登录
        cleanCookie(() => {})
        setPassportCmd("clean", "null");
    });
}


function getAccountListHtml(object) {
    let obj = object == undefined ? JSON.parse(GM_getValue("Ex_accountList") || "{}") : object;
    let ret = "";
    for (const key in obj) {
        if (key == "null") {
            continue;
        }
        let item = obj[key];
        ret += `
        <div class="ex-accountList-item" uid="${item.uid}">
            <div class="ex-accountList-item__imgWrap">
                <img src=${decodeURIComponent(item.avatar) + "middle.jpg"} alt="" class="ex-accountList-item__img">
            </div>
            <div class="ex-accountList-item__name">${decodeURIComponent(item.nickname)}</div>
            <div class="ex-accountList-item__btn">删除</div>
        </div>`
    }

    ret += `
    <div id="ex-accountList-item-add">
        <svg t="1613995373702" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2832" width="32" height="32"><path d="M577.088 0H448.96v448.512H0v128h448.96V1024h128.128V576.512H1024v-128H577.088z" p-id="2833" fill="#8A8A8A"></path></svg>
    </div>
    `;
    return ret;
}

/* 读账号存储：被写坏（历史格式 / 半截 JSON / 截断）时不能让整个面板连带挂掉。
   与文件里其它几处 `|| "{}"` 的写法保持同一口径。 */
function AccountList_readStore(key) {
    try {
        let raw = GM_getValue(key);
        if (!raw) return {};
        let obj = JSON.parse(raw);
        return (obj && typeof obj === "object") ? obj : {};
    } catch (e) {
        console.warn("[DouyuEx] 账号存储解析失败，本次按空账本处理:", key, e && e.message);
        return {};
    }
}

/* 把一批 cookie 写回本域。空列表也必须收尾 —— 原实现在 l.length === 0 时
   进不了 addlock >= l.length 那一支，callback 永远不执行：passport iframe 就一直不回
   switchOver，父页只能干等（表现就是「点了切换账号，页面不动」）。 */
function AccountList_restoreCookies(cookies, callback) {
    let done = typeof callback === "function" ? callback : function () {};
    let l = Array.isArray(cookies) ? cookies : [];
    if (!l.length) {
        done();
        return;
    }
    let addlock = 0;
    let finished = false;
    let finish = function () {
        if (finished) return;   // 防重复收尾（某个回调重复触发时不要回两次）
        finished = true;
        done();
    };
    for (let i = 0; i < l.length; i++) {
        GM_cookie("set", {
            name: l[i]['name'],
            value: l[i]['value'],
            domain: l[i]['domain'],
            path: l[i]['path'],
            secure: l[i]['secure'],
            httpOnly: l[i]['httpOnly'],
            sameSite: l[i]['sameSite'],
            expirationDate: l[i]['expirationDate'],
            hostOnly: l[i]['hostOnly']
        }, function (error) {
            addlock++;
            if (addlock >= l.length) finish();
        });
    }
}

function switchAccount(uid, callback) {
    let done = typeof callback === "function" ? callback : function () {};
    let list = AccountList_readStore("Ex_accountList");
    /* 这一行原来被注释成 `let l = [];` —— 于是「先删光本域 cookie」之后什么都不写回，
       切号等于把人踢成未登录（真机表现：刷新后是登录框，不是新账号）。
       按原作者那行注释的意图写回：addAccount 存下来的就是 list[uid].data
       （当前域 path=/ 的全部 cookie）。 */
    let account = list[uid];
    let l = (account && Array.isArray(account["data"])) ? account["data"] : [];
    /* 没有可恢复的数据时**不要先删**：删完就再也回不来了（这条路径会把人号彻底切废）。
       这种账本多半是早期版本存的空壳，直接收尾、交给 passport 走正常登录。 */
    if (!l.length) {
        done();
        return;
    }
    cleanCookie(function () {
        AccountList_restoreCookies(l, done);
    });
};

function switchAccountPassport(uid, callback) {
    let done = typeof callback === "function" ? callback : function () {};
    let list = AccountList_readStore("Ex_accountListPassport");
    /* ⚠ 这行注释（`Array(list.global).concat(list[uid])`）是原作者"全局 cookie + 该账号私有
       cookie 一起写回"的意图，但 `Array(数组)` 会套成嵌套数组，照抄会写进 undefined 名字的
       cookie。本轮的 P0 只做「空列表也要走完回调」，列表口径保持现状（只写回该账号那一份），
       全局 cookie 的归属需要真机核对后再定，已记在汇报里。 */
    let l = Array.isArray(list[uid]) ? list[uid] : [];
    cleanCookie(function () {
        AccountList_restoreCookies(l, done);
    });
};
// function switchAccountPassport( callback) {
//     let l = JSON.parse(GM_getValue("Ex_accountListPassport"));
//     let delock = 0;
//     GM_cookie("list", { path: "/" }, function(cookies) {
//         for(let i = 0; i < cookies.length; i++){
//             GM_cookie("delete", {name: cookies[i]["name"]}, function(error) {
//                 delock++;
//                 if (delock >= cookies.length) {
//                     let addlock = 0;
//                     for(let i = 0; i < l.length; i++){
//                         GM_cookie("set", {
//                             name: l[i]['name'], 
//                             value: l[i]['value'], 
//                             domain: l[i]['domain'], 
//                             path: l[i]['path'], 
//                             secure: l[i]['secure'], 
//                             httpOnly: l[i]['httpOnly'], 
//                             sameSite: l[i]['sameSite'], 
//                             expirationDate: l[i]['expirationDate'], 
//                             hostOnly: l[i]['hostOnly']
//                         }, function(error) {
//                             addlock++;
//                             if (addlock >= l.length) {
//                                 callback();
//                             };
//                         });
//                     }
//                 };
//             });
//         }
//     });
// };

function addAccount() {
    let accountListData = JSON.parse(GM_getValue("Ex_accountList") || "{}");
    let item = {};
    let uid = "";
    GM_cookie("list", { path: "/" }, function(cookies) {
        let c = [];
        if (cookies == undefined) {
            document.getElementById("ex-accountList-content").innerHTML = "请升级Tampermonkey版本<br/><a href='https://www.crx4chrome.com/crx/1429/'>点我升级，选择Crx4Chrome</a>";
            return;
        }
        for(let i = 0; i < cookies.length; i++) {
            let name = cookies[i]["name"];
            let value = cookies[i]["value"];
            if (name == "acf_nickname") {
                item.nickname = value;
            }
            if (name == "acf_uid") {
                item.uid = value;
                uid = value;
            }
            if (name == "acf_avatar") {
                item.avatar = value;
            }
            c.push(cookies[i]);
        }
        if (uid == "") {
            item.uid = "null";
            uid = "null";
        }
        item.data = c;
        item.update_time = String(new Date().getTime());
        accountListData[uid] = item;
        GM_setValue("Ex_accountList", JSON.stringify(accountListData));
        renderAccountList(accountListData);
    });
};


function addAccountPassport(uid) {
    let accountListData = JSON.parse(GM_getValue("Ex_accountListPassport") || "{}");
    let private_arr = [];
    let global_arr = [];
    GM_cookie("list", { path: "/" }, function(cookies) {
        if (cookies == undefined) {
            return;
        }
        for(let i = 0; i < cookies.length; i++) {
            if (cookies[i]["name"] == "LTP0") {
                private_arr.push(cookies[i]);
            } else {
                global_arr.push(cookies[i]);
            }
        }
        if (uid == "") {
            uid = "null";
        }
        accountListData.global = null;
        accountListData.global = global_arr;
        accountListData[uid] = private_arr;
        accountListData.update_time = String(new Date().getTime());
        GM_setValue("Ex_accountListPassport", JSON.stringify(accountListData));
    });
};

// function addAccountPassport() {
//     GM_cookie("list", { path: "/" }, function(cookies) {
//         let c = [];
//         for(let i = 0; i < cookies.length; i++) {
//             c.push(cookies[i]);
//         }
//         GM_setValue("Ex_accountListPassport", JSON.stringify(c));
//     });
// };



function cleanCookie(callback) {
    let done = typeof callback === "function" ? callback : function () {};
    let lock = 0;
    GM_cookie("list", {
        path: "/"
    }, (cookies) => {
        /* 0 个 cookie 也必须收尾：原来只在 delete 回调里判 lock >= cookies.length，
           而一条 cookie 都没有时那个回调永远不会来 —— 于是 callback 永远不执行。
           passport iframe 里的「+ 重新登录」正是靠这个回调回 cleanOver，父页才会刷新：
           未登录（0 cookie）时点「+」毫无反应，根因就在这一行。 */
        if (!cookies || cookies.length === 0) {
            done();
            return;
        }
        for (let i = 0; i < cookies.length; i++) {
            GM_cookie("delete", {
                name: cookies[i]["name"]
            }, function (error) {
                lock++;
                if (lock >= cookies.length) {
                    done();
                }
            });
        }
    });
}

function setPassportCmd(cmd, uid) {
    document.getElementById("ex-accountList-iframe").innerHTML = `
    <iframe id="login-passport-frame" width="100%" height="100%" scrolling="no" frameborder="0" src="https://passport.douyu.com/index/error/show404?&exid=chun&cmd=${cmd}&uid=${uid}&domain=${encodeURIComponent(window.location.href)}&"></iframe>
    `;
}

function setYubaAndMsgAndVideoClean() {
    document.getElementById("ex-accountList-iframe2").innerHTML = `
    <iframe id="ex-yuba-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://yuba.douyu.com/iframe/tab/6416853?exClean&domain=${encodeURIComponent(window.location.href)}&"></iframe>
    <iframe id="ex-msg-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://msg.douyu.com/web/index.html?exClean&domain=${encodeURIComponent(window.location.href)}&"></iframe>
    <iframe id="ex-video-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://v.douyu.com/show/0?exClean&domain=${encodeURIComponent(window.location.href)}&"></iframe>
    <iframe id="ex-cz-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://cz.douyu.com/item/gold?exClean&domain=${encodeURIComponent(window.location.href)}&"></iframe>
    `
}
function deleteAccount(uid, callback) {
    let obj = JSON.parse(GM_getValue("Ex_accountList") || "{}");
    delete obj[uid];
    GM_setValue("Ex_accountList", JSON.stringify(obj));
    callback();
}

function deleteAccountPassport(uid, callback) {
    let obj = JSON.parse(GM_getValue("Ex_accountListPassport") || "{}");
    delete obj[uid];
    GM_setValue("Ex_accountListPassport", JSON.stringify(obj));
    callback();
}