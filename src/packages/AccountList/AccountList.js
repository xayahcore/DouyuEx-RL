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
        // 条目模板里已经带了删除按钮；万一渲染结构变了（缺 .ex-accountList-item__btn），
        // 这里只跳过删除绑定，不能让整张列表因为一个 [0] 空引用渲染不出来
        let delBtn = item.getElementsByClassName("ex-accountList-item__btn")[0];
        if (delBtn) {
            delBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                showMessage("【账号管理】正在删除...", "info");
                deleteAccount(uid, () => {});
                setPassportCmd("delete", uid);
            })
        } else {
            ExGuard_warn("账号管理", "账号条目缺少删除按钮（ex-accountList-item__btn），该项未绑定删除");
        }
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

/* ==================== passport 侧（passport.douyu.com 的 iframe） ====================
 * ⚠ TODO（真机拆包前不动的两件事，本轮只修"静态能确定会破坏数据"的那一半）：
 *   ① 调用顺序：src/routers/router.js:116-118 在 switch 之前先调 addAccountPassport(uid)。
 *      两种读法都讲得通：
 *        a) 抓的是"当前会话快照" —— 那此刻罐子里多半还是旧账号，记到目标 uid 名下就是写坏；
 *        b) 父页已经先把目标账号的 cookie 写回来了，这里只是"重新同步一遍"。
 *      静态无法判定（取决于父页 restore 与 iframe 加载谁先到），所以**不改顺序**，
 *      只在 addAccountPassport 里加"有证据表明不是这个账号就不写"的守卫（保守方向：
 *      宁可少刷新一次，也不把别人存好的那份冲掉）。
 *      真机要验：A → B → 再切回 A，A 的号还在不在？期间 GM_cookie("list") 在
 *      passport iframe 里能不能看到 .douyu.com 作用域的 acf_uid / acf_nickname / LTP0（含
 *      domain、path、hostOnly 三个字段的原始值）。
 *   ② 全局 cookie 合并：原注释 `Array(list.global).concat(list[uid])` 想复原"全局 + 私有"，
 *      但 `Array(数组)` 会套成一层嵌套数组。要不要合并，取决于 global 里到底有没有身份类
 *      cookie —— 同样等上面那份拆包结果。本轮只保证"写进去的一定是 cookie 形状"。
 */
/* 只有 name 非空的普通对象才算 cookie：账本被写坏 / 别处塞了嵌套数组进来时，
   直接 set 会写出一条 undefined 名字的外来 cookie。 */
function AccountList_cookieList(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(function (c) {
        return c && typeof c === "object" && c["name"];
    });
}

/* 两份 cookie 列表是否等价（忽略顺序与 update_time 这类时间戳）：
   用于"内容没变就别再写一遍存储"的幂等判断。 */
function AccountList_sameCookies(a, b) {
    let x = AccountList_cookieList(a);
    let y = AccountList_cookieList(b);
    if (x.length !== y.length) return false;
    let key = function (c) {
        return [c.name, c.domain || "", c.path || "", c.value].join("|");
    };
    let sx = x.map(key).sort();
    let sy = y.map(key).sort();
    for (let i = 0; i < sx.length; i++) {
        if (sx[i] !== sy[i]) return false;
    }
    return true;
}

function switchAccountPassport(uid, callback) {
    let done = typeof callback === "function" ? callback : function () {};
    let key = String(uid == "" || uid == null ? "null" : uid);
    let list = AccountList_readStore("Ex_accountListPassport");
    let l = AccountList_cookieList(list[key]);
    /* 没有可恢复的私有 cookie 时**不要先删**：删完就只剩"未登录"，切号等于把人踢下线。
       和 parent 侧 switchAccount 同一口径（宁可这次切换不生效，也不毁现场），
       但仍要回调 —— 父页在等 switchOver，不回就永远干等。 */
    if (!l.length) {
        console.warn("[DouyuEx] passport 侧没有该账号的 cookie 记录，本次不清理、直接收尾:", key);
        done();
        return;
    }
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
    // 与两处 switch 同一口径：账本被写坏时按空账本继续，不要让整个列表渲染不出来
    let accountListData = AccountList_readStore("Ex_accountList");
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


/* 采集当前 passport 会话的快照（拆成"该账号私有 LTP0" + "其余全局"）。
   三道guard，都是"能静态确定会破坏数据"的情况，其余一律照旧写：
   ① 证据优先：抓到的 cookie 里若带着 acf_uid，且它不等于本次的 uid，说明罐子里是**别人**
      的会话（router.js:116-118 在 switch 之前调这里，正是这种情形）—— 一条都不写。
   ② 不许清空：已有非空记录时，若这次没抓到 LTP0（说明此刻根本没登录在目标账号上），
      不拿空的去覆盖好数据。
   ③ 幂等：私有与全局两侧内容都没变就不写（每次进直播间这个 iframe 都会跑一次，
      没必要每次都刷一遍 localStorage/GM 存储）。 */
function addAccountPassport(uid) {
    let store = AccountList_readStore("Ex_accountListPassport");
    let key = String(uid == "" || uid == null ? "null" : uid);
    GM_cookie("list", { path: "/" }, function(cookies) {
        if (cookies == undefined) {
            return;
        }
        let private_arr = [];
        let global_arr = [];
        let sessionUid = "";
        for (let i = 0; i < cookies.length; i++) {
            let name = cookies[i]["name"];
            if (name == "LTP0") {
                private_arr.push(cookies[i]);
            } else {
                global_arr.push(cookies[i]);
            }
            if (name == "acf_uid") {
                sessionUid = String(cookies[i]["value"] == null ? "" : cookies[i]["value"]);
            }
        }
        if (key !== "null" && sessionUid !== "" && sessionUid !== key) {
            console.warn("[DouyuEx] 当前 passport 会话属于 " + sessionUid + "，与目标账号 " + key + " 不符，保留已有记录不覆盖");
            return;
        }
        let exists = AccountList_cookieList(store[key]).length > 0;
        if (exists && private_arr.length === 0) {
            console.warn("[DouyuEx] 目标账号 " + key + " 的记录非空，但本次没抓到登录态（LTP0），保留原记录");
            return;
        }
        if (exists
            && AccountList_sameCookies(store[key], private_arr)
            && AccountList_sameCookies(store.global, global_arr)) {
            return;
        }
        store[key] = private_arr;
        store.global = global_arr;
        store.update_time = String(new Date().getTime());
        GM_setValue("Ex_accountListPassport", JSON.stringify(store));
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