let followListHook;
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
    if (active === "特别关注" || active === "视频动态") {
        return;
    }
    let panel = document.getElementsByClassName("Header-follow-listWrap");
    if (panel.length == 0) {
        return;
    }
    // panel[0].style.marginTop = "12px";
    let listBox = document.getElementsByClassName("Header-follow-listBox")[0];
    if (listBox) listBox.style.display = "none";
    setNewFollowList(panel[0]);
}
async function setNewFollowList(panel) {
    if (!panel) return;
    let loadInCurrentPage = await GM_getValue("Ex_LoadInCurrentPage", false);
    let followList = await getFollowList();
    /* getFollowList 现在失败会 resolve(null)（此前 Promise 永挂，面板就一直是空白）。
       这里如实说一句，别让人以为"关注列表里就是没人开播"。 */
    if (!followList) {
        showMessage("【关注列表】读取失败 · 可能是登录态失效或网络问题，刷新页面再试", "error");
        return;
    }
    if (followList.error != "0") {
        return;
    }
    if (!followList.data || !Array.isArray(followList.data.list)) {
        showMessage("【关注列表】返回数据不完整，稍后再试", "error");
        return;
    }
    const FOLLOWLIST_LIMIT = 10; // 关注列表最多显示个数
    let limit = 0;
    let html = `
        <div id="refreshFollowList" style="color: grey; position: absolute; top: 0px; cursor: default; display: flex; align-items: center; justify-content: space-between; width: calc(100% - 10px); padding: 0 5px;">
            <label style="display: flex; align-items: center; cursor: pointer; color: inherit;">
                <input type="checkbox" id="loadInCurrentPageCheckbox" ${loadInCurrentPage ? 'checked' : ''} style="margin-right: 5px;">
                在当前页面加载
            </label>
            <span>长按弹出同屏播放</span>
        </div>
    `;
    let nowTime = Math.floor(Date.now()/1000);
    for (let i = 0; i < followList.data.list.length; i++) {
        let item = followList.data.list[i];
        if (item.show_status == "1" && item.videoLoop == "0") {
            // 开播且非录播
            html += `<li class="DropPaneList FollowList ExFollowListItem" rid="${ item.room_id }"><a><div class="DropPaneList-cover"><div class="LazyLoad is-visible DyImg "><img src="${ String(item.avatar_small).replace("_big","_small") }" alt="${ item.nickname }" class="DyImg-content is-normal "></div></div><div class="DropPaneList-info"><p><span class="DropPaneList-hot"><i></i>${ item.online }</span><span class="DropPaneList-title">${ item.room_name }</span></p><p><span class="DropPaneList-name">${ item.nickname }</span><span class="DropPaneList-time">已播${ formatSeconds(nowTime - Number(item.show_time)) }</span></p></div></a></li>`
            // html += `<li class="DropPaneList FollowList ExFollowListItem" rid="${ item.room_id }"><a><div class="DropPaneList-cover"><div class="DyImg "><img src="${ String(item.avatar_small).replace("_big","_small") }" alt="${ item.nickname }" class="DyImg-content is-normal "></div></div><div class="DropPaneList-info"><p><span class="DropPaneList-hot"><i></i>${ item.online }</span><span class="DropPaneList-title">${ item.room_name }</span></p><p><span class="DropPaneList-name">${ item.nickname }</span><span class="DropPaneList-time">已播${ formatSeconds(nowTime - Number(item.show_time)) }</span></p></div></a></li>`
            limit++;
        }
        if (limit >= FOLLOWLIST_LIMIT) {
            break;
        }
    }
    panel.innerHTML += html;

    const loadInCurrentPageCheckbox = panel.querySelector('#loadInCurrentPageCheckbox');
    if (loadInCurrentPageCheckbox) {
        loadInCurrentPageCheckbox.addEventListener("change", async (e) => {
            const isChecked = e.target.checked;
            await GM_setValue("Ex_LoadInCurrentPage", isChecked);
            showMessage(`【关注列表】已${isChecked ? "开启" : "关闭"}当前页加载功能（${isChecked ? "当前页面直接加载关注的直播间" : "使用新网页打开关注的直播间"}）`, "info");
        });
    }

    let followListItems = document.getElementsByClassName("ExFollowListItem");
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
        fetch("https://www.douyu.com/wgapi/livenc/liveweb/follow/list?sort=1&cid1=0", {
            method: 'GET',
            mode: 'no-cors',
            credentials: 'include',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
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