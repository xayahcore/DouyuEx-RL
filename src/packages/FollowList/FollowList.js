let followListHook;
let followListBusy = false;          // 取数/渲染进行中：observer 会连续回调，重入没有意义
let followListRetryBound = false;    // 「关注」入口的补渲染监听只绑一份
let followListRetryTimer = null;

const FOLLOWLIST_LIMIT = 10; // 关注列表最多显示个数

function initPkg_FollowList() {
    let tries = 0;
    let intID = setInterval(() => {
        /* ⚠ 关键：DomHook 在目标节点不存在时是**静默 return**（构造出一个没有 observer 的
           "正常对象"）。原来这里只要两个兜底选择器命中就 clearInterval，于是"节点还没渲染出来"
           的那一次会把轮询永久停掉，关注列表增强从此再也不出现 —— "时好时坏"就是这么来的。
           现在必须确认 observer 真的挂上了才收工；挂不上就继续等，最多等 120 秒。 */
        if (getValidDom([".Header-follow-content", "#js-backpack-enter"])) {
            followListHook = new DomHook(".Header-follow-content", false, handleFollowList);
            if (followListHook && followListHook.observer) {
                clearInterval(intID);
                FollowList_bindRetry();
                return;
            }
            followListHook = null;
        }
        if (++tries > 120) {
            clearInterval(intID);
            console.warn("[DouyuEx] 关注列表容器等不到，列表增强本次不启用");
        }
    }, 1000);
}

function handleFollowList(m) {
    let activeDom = document.getElementsByClassName("Header-follow-tab is-active")[0];
    if (!activeDom) return;
    let active = activeDom.innerText;
    /* 站点只有「正在直播 / 视频动态」两个 tab（特别关注已不存在）。
       非「正在直播」时把增强节点收掉、原生列表放出来 —— 否则上一次隐藏的 listBox
       会一直盖住这些 tab 自己的内容。 */
    if (active !== "正在直播") {
        FollowList_resetOwnNodes();
        FollowList_setNativeVisible(true);
        return;
    }
    let panel = document.getElementsByClassName("Header-follow-listWrap");
    if (panel.length == 0) {
        return;
    }
    setNewFollowList(panel[0]);
}

/**
 * 每次鼠标移到「关注」入口时补一次渲染。
 * 页面的下拉容器不会重建、DomHook 也不会因此回调，失败一次后就再也没有重试点；
 * 这里只盯这一个入口，不带轮询，代价是一次鼠标移入。
 */
function FollowList_bindRetry() {
    if (followListRetryBound) return;
    followListRetryBound = true;
    document.addEventListener("mouseover", function (e) {
        let target = e.target;
        if (!target || target.nodeType !== 1 || !target.closest) return;
        let menu = target.closest(".public-DropMenu");
        if (!menu || (menu.textContent || "").indexOf("关注") < 0) return;
        clearTimeout(followListRetryTimer);
        followListRetryTimer = setTimeout(function () {
            let panel = document.getElementsByClassName("Header-follow-listWrap")[0];
            // 下拉没展开（高度 0）就不取数，避免只因为划过头部就发请求
            if (panel && panel.getBoundingClientRect().height > 0) setNewFollowList(panel);
        }, 300);
    }, true);
}

/** 原生列表显隐：null-safe；隐藏只允许发生在增强列表渲染成功之后 */
function FollowList_setNativeVisible(visible) {
    let listBox = document.getElementsByClassName("Header-follow-listBox")[0];
    if (listBox) listBox.style.display = visible ? "" : "none";
}

/** 只删我们自己插的节点，页面原有节点一动不动 */
function FollowList_resetOwnNodes() {
    document.querySelectorAll("#refreshFollowList, .ExFollowListItem, .ExFollowListEmpty").forEach(function (node) {
        node.remove();
    });
}

function FollowList_esc(value) {
    if (typeof ExUI !== "undefined" && ExUI && typeof ExUI.esc === "function") return ExUI.esc(value);
    return String(value == null ? "" : value);
}

/**
 * 只要求「开播」与「非轮播」，但**字段缺失时放行**。
 * 旧实现是 show_status=="1" && videoLoop=="0" 的双白名单：接口一旦不再返回这两个字段，
 * 整批条目会被筛成 0 条，界面看起来就是"什么都没显示"。缺字段不等于没开播。
 */
function FollowList_isVisibleRoom(item) {
    if (!item || typeof item !== "object") return false;
    if (item.show_status !== undefined && item.show_status !== null &&
        item.show_status !== 1 && item.show_status !== "1" && item.show_status !== true) return false;
    if (item.videoLoop !== undefined && item.videoLoop !== null &&
        item.videoLoop !== 0 && item.videoLoop !== "0" && item.videoLoop !== false) return false;
    return true;
}

/** 拼 html（纯字符串，不碰 DOM）；所有接口字段先转义 */
function FollowList_buildHtml(list, loadInCurrentPage) {
    let html = `
        <div class="dx-ink-grey dx-pos-absolute dx-top-0 dx-cur-default dx-d-flex dx-ai-center dx-jc-space-between dx-w-calc100-10 dx-p-05" id="refreshFollowList" >
            <label class="dx-ink-inherit dx-d-flex dx-ai-center dx-cur-pointer" >
                <input class="dx-mr-5" type="checkbox" id="loadInCurrentPageCheckbox" ${loadInCurrentPage ? 'checked' : ''} >
                在当前页面加载
            </label>
            <span>长按弹出同屏播放</span>
        </div>
    `;
    let nowTime = Math.floor(Date.now() / 1000);
    let rendered = 0;
    for (let i = 0; i < list.length; i++) {
        let item = list[i];
        if (!FollowList_isVisibleRoom(item)) continue;
        let rid = FollowList_esc(item.room_id);
        let nickname = FollowList_esc(item.nickname);
        let roomName = FollowList_esc(item.room_name);
        let online = FollowList_esc(item.online);
        let avatar = FollowList_esc(String(item.avatar_small == null ? "" : item.avatar_small).replace("_big", "_small"));
        let showTime = Number(item.show_time);
        // show_time 缺失/不是数字时不再输出「已播NaN秒」
        let played = (isFinite(showTime) && showTime > 0)
            ? `<span class="DropPaneList-time">已播${ formatSeconds(Math.max(0, nowTime - showTime)) }</span>`
            : "";
        html += `<li class="DropPaneList FollowList ExFollowListItem" rid="${ rid }"><a><div class="DropPaneList-cover"><div class="LazyLoad is-visible DyImg "><img src="${ avatar }" alt="${ nickname }" class="DyImg-content is-normal "></div></div><div class="DropPaneList-info"><p><span class="DropPaneList-hot"><i></i>${ online }</span><span class="DropPaneList-title">${ roomName }</span></p><p><span class="DropPaneList-name">${ nickname }</span>${ played }</p></div></a></li>`;
        if (++rendered >= FOLLOWLIST_LIMIT) break;
    }
    if (rendered === 0) {
        html += `<li class="FollowList ExFollowListEmpty">当前没有在播的关注</li>`;
    }
    return { html: html, count: rendered };
}

/** 某个失败分支的统一出口：还原原生列表 + 说一句人话 */
function FollowList_fail(message) {
    FollowList_setNativeVisible(true);
    showMessage("【关注列表】" + message, "error");
}

async function setNewFollowList(panel) {
    if (!panel || followListBusy) return;
    followListBusy = true;
    try {
        let loadInCurrentPage = await GM_getValue("Ex_LoadInCurrentPage", false);
        let request = getFollowList();
        /* 请求挂住（不是失败）时旧实现会永远停在“已经隐藏原生列表”的状态；
           8 秒按失败处理，保证界面一定能往下走。 */
        let followList = (typeof ExGuard_withTimeout === "function")
            ? await ExGuard_withTimeout(request, 8000, "关注列表")
            : await request;
        if (!followList) {
            FollowList_fail("读取失败 · 可能是登录态失效或网络问题，稍后再试");
            return;
        }
        if (String(followList.error) !== "0") {
            FollowList_fail("接口返回异常（error=" + followList.error + "），已保留原生列表");
            return;
        }
        if (!followList.data || !Array.isArray(followList.data.list)) {
            FollowList_fail("返回数据不完整，已保留原生列表");
            return;
        }
        let view = FollowList_buildHtml(followList.data.list, loadInCurrentPage);
        // 成功才动 DOM：先清自己的旧节点，再插入，最后才隐藏原生列表。
        // 任何一步抛错都会走 catch，原生列表不会停在隐藏态。
        FollowList_resetOwnNodes();
        panel.insertAdjacentHTML("beforeend", view.html);
        FollowList_setNativeVisible(false);
        FollowList_bindItems(panel);
    } catch (e) {
        ExGuard_warn("关注列表", "渲染失败，已保留原生列表", e);
        FollowList_fail("渲染失败，已保留原生列表");
    } finally {
        followListBusy = false;
    }
}

function FollowList_bindItems(panel) {
    const loadInCurrentPageCheckbox = panel.querySelector('#loadInCurrentPageCheckbox');
    if (loadInCurrentPageCheckbox) {
        loadInCurrentPageCheckbox.addEventListener("change", async (e) => {
            const isChecked = e.target.checked;
            await GM_setValue("Ex_LoadInCurrentPage", isChecked);
            showMessage(`【关注列表】已${isChecked ? "开启" : "关闭"}当前页加载功能（${isChecked ? "当前页面直接加载关注的直播间" : "使用新网页打开关注的直播间"}）`, "info");
        });
    }

    // 只给本次渲染出来的条目绑事件（旧实现按全文档取，会把别的容器里的旧条目也一起重绑）
    let followListItems = panel.querySelectorAll(".ExFollowListItem");
    for (let i = 0; i < followListItems.length; i++) {
        let cclick = new CClick(followListItems[i]);
        cclick.click(async (event) => {
            event.preventDefault();
            const shouldLoadInCurrentPage = await GM_getValue("Ex_LoadInCurrentPage", false);
            const targetUrl = "https://www.douyu.com/" + followListItems[i].getAttribute("rid");
            if (shouldLoadInCurrentPage) {
                window.location.href = targetUrl; // 在当前页加载
            } else {
                openPage(targetUrl, true); // 在新页面打开
            }
        });
        followListItems[i].addEventListener("mousedown", (event) => {
            if (event.button == 1) {
                // 鼠标中键
                openPage("https://www.douyu.com/" + followListItems[i].getAttribute("rid"), false);
            }
        })
    }
}

function getFollowList() {
    return new Promise(resolve => {
        // 同源请求：不要 no-cors（跨源重定向会让响应变成 opaque，res.json() 必抛），
        // GET 也不需要 Content-Type。
        fetch("https://www.douyu.com/wgapi/livenc/liveweb/follow/list?sort=1&cid1=0", {
            method: 'GET',
            credentials: 'include',
        }).then(res => {
            return res.json();
        }).then(ret => {
            resolve(ret);
        }).catch((e) => {
            // 没有 .catch 时登录态失效（返回 HTML）会让这个 Promise 永远悬着，面板一片空白
            console.warn("[DouyuEx] 关注列表读取失败:", e && e.message);
            resolve(null);
        })
    })
}
