/* ==================== 房间与粉丝牌签到 ==================== */
/*
 * 历史问题（audit-wave2 P1-4）：
 *   ① 探测页返回不含 data（未登录 / 风控 / 接口改版）时 `Number(ret.data.pageCount)` 直接抛，
 *      被外层 .catch 吞成一条 console.log —— 用户点了签到零反馈；
 *   ② signRoom 的 onload 是空的，那句「X 个房间签到已完成」实际是「发出了 X 个请求」，
 *      成功与否完全不知道；rest = total - signedCount 还把「未开播」也算进「未签到」。
 * 现在：探测页判空并给出明确提示；signRoom 回报真实 error 码；汇总按
 * 「已请求 / 成功 / 失败 / 未开播跳过」四态输出，并等所有响应回来才说话。
 */

const SIGN_ROOM_XHR_TIMEOUT = 15000;

function initPkg_Sign_Room(isAll) {
	signAllRoom(isAll);
}

function signAllRoom(isAll) {
    // 1. 探测总页数（官方用超大页码拿 pageCount）
    // 2. 逐页拉关注列表
    // 3. 逐个房间签到，统计真实成败后再汇总
    // pendingPages / pendingSigns 分开计：页面拉完不代表签到请求回来了，
    // 只用一个计数会在「请求刚发出、响应还没到」时就误判成收尾（汇总永远是 成功 0 失败 0）。
    let stats = { requested: 0, ok: 0, fail: 0, skipped: 0, pendingPages: 0, pendingSigns: 0, reported: false };

    function finishIfDone() {
        if (stats.reported || stats.pendingPages > 0 || stats.pendingSigns > 0) return;
        stats.reported = true;
        let text = "【房间签到】已请求 " + stats.requested + " 个房间：成功 " + stats.ok + " 个，失败 " + stats.fail + " 个";
        if (stats.skipped > 0) text += "，未开播跳过 " + stats.skipped + " 个";
        showMessage(text, stats.fail > 0 ? "warning" : "success");
    }

    fetch('https://www.douyu.com/wgapi/livenc/liveweb/follow/list?page=1428', {
        method: 'GET',
        mode: 'no-cors',
        cache: 'default',
        credentials: 'include',
    }).then(res => {
        return res.json();
    }).then(ret => {
        let data = ret && ret.data;
        if (!data || !Number(data.pageCount)) {
            showMessage("【房间签到】获取关注房间列表失败（登录态失效或接口异常），本次跳过", "error");
            return;
        }
        let pageCount = Number(data.pageCount);
        showMessage("【房间签到】" + (Number(data.total) || 0) + " 个房间正在签到中...", "info");
        for (let nowPage = 1; nowPage <= pageCount; nowPage++) {
            stats.pendingPages++;
            fetch('https://www.douyu.com/wgapi/livenc/liveweb/follow/list?page=' + String(nowPage), {
                method: 'GET',
                mode: 'no-cors',
                cache: 'default',
                credentials: 'include',
            }).then(res => {
                return res.json();
            }).then(ret1 => {
                let list = (ret1 && ret1.data && Array.isArray(ret1.data.list)) ? ret1.data.list : [];
                if (!list.length) {
                    ExGuard_warn("房间签到", "第 " + nowPage + " 页没有房间数据");
                    return;
                }
                for (let i = 0; i < list.length; i++) {
                    let item = list[i] || {};
                    if (isAll == false && item.show_status != "1") {
                        stats.skipped++;
                        continue;
                    }
                    stats.requested++;
                    stats.pendingSigns++;
                    signRoom(item.room_id, function (ok) {
                        stats.pendingSigns--;
                        if (ok) stats.ok++;
                        else stats.fail++;
                        finishIfDone();
                    });
                }
            }).catch(err => {
                ExGuard_warn("房间签到", "第 " + nowPage + " 页获取失败", err);
            }).finally(function () {
                stats.pendingPages--;
                finishIfDone();
            });
        }
    }).catch(err => {
        ExGuard_warn("房间签到", "关注列表探测失败", err);
        showMessage("【房间签到】获取关注房间列表失败（登录态失效或接口异常），本次跳过", "error");
    })
}

/**
 * 单个房间签到。callback(ok) 回报**真实结果**（旧实现 onload 是空的，汇总只能拿请求数当成果）。
 * 失败/超时同样回调，保证汇总一定能凑齐。
 */
function signRoom(r, callback) {
    let done = (typeof callback === "function") ? callback : function () {};
	GM_xmlhttpRequest({
		method: 'POST',
		url: 'https://apiv2.douyucdn.cn/japi/roomuserlevel/apinc/checkIn?client_sys=android',
		data: 'rid=' + r,
		responseType: 'json',
		timeout: SIGN_ROOM_XHR_TIMEOUT,
		headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'token': dyToken,
            'aid': 'android1'
		},
		onload: function(response) {
            let ret = response && response.response;
            let ok = !!(ret && Number(ret.error) === 0);
            if (!ok) ExGuard_warn("房间签到", "房间 " + r + " 签到未成功（error=" + ((ret && ret.error) || "无响应") + "）");
            done(ok);
        },
        onerror: function (err) {
            ExGuard_warn("房间签到", "房间 " + r + " 请求失败", err);
            done(false);
        },
        ontimeout: function () {
            ExGuard_warn("房间签到", "房间 " + r + " 请求超时");
            done(false);
        }
	});
}
