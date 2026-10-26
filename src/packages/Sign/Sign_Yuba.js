/* ==================== 鱼吧签到 ==================== */
/*
 * 历史问题（audit-wave2 P0-1 / P0-2 / P1-2）：
 *   ① 「签到失败」分支在 sleep(2000) 后递归自己，而计次 signCountMap 只在**成功分支**自增，
 *      上限判断读的是一个永远不涨的数 → 同一鱼吧每 2 秒重试一次，直到关页面；
 *   ② getYubaPage / getSupplementaryNums / signSupplementary 三个 Promise 只有 onload，
 *      接口失败或超时 → await 永挂 → signYubaList 卡死、补充签到卡死、汇总消息永不出现；
 *   ③ 汇总用 totalYuba / doneYuba / signedYuba 三个模块级变量，收尾时置 null 当「已结束」标志：
 *      null == null 恒成立，任何迟到回调都会再弹一次汇总，signedYuba++ 还会把 null 变成 1。
 * 现在：请求统一走 ExGuard_xhr（失败也 settle 成 null）、重试前先计次并封顶、
 * 每次批量签到开一个 run 对象（回调闭包持有），结束后 run.finished 让迟到回调无事可做。
 */

const SIGN_YUBA_MAX_RETRIES = 10;    // 单个鱼吧最多重试次数（2 秒一次，10 次约 20 秒）
const SIGN_YUBA_XHR_TIMEOUT = 15000; // 单次请求上限：超时同样 settle，绝不让 await 永挂
const SIGN_YUBA_PAGE_LIMIT = 30;     // 关注鱼吧列表分页大小

let signYubaRun = null; // 当前批次（调试用；结束后置 null）

function Sign_Yuba_createRun(total) {
    const run = { total: total, done: 0, signed: 0, already: 0, failed: 0, finished: false, countMap: {} };
    // 批次完成信号：executeSignEngine 要能真的 await 到「这一批鱼吧签完」，
    // 而不是发完请求就宣布「已完成」（audit-wave2 P1-1）
    run.finishedPromise = new Promise(function (resolve) { run.resolve = resolve; });
    return run;
}

/** 批次结果（给 executeSignEngine 汇总用） */
function Sign_Yuba_summary(run, listFailed) {
    return {
        total: run ? run.total : 0,
        signed: run ? run.signed : 0,
        already: run ? run.already : 0,
        failed: listFailed ? 1 : (run ? run.failed : 0),
        listFailed: !!listFailed
    };
}

/**
 * 批次收尾：全部回调都回来（或放弃）时输出一条汇总，且只输出一次。
 * 数字口径：signed = 本次签成功，already = 服务端说今天已签过，failed = 连续失败已放弃。
 */
function Sign_Yuba_finishRun(run) {
    if (!run || run.finished || run.done < run.total) return;
    run.finished = true;
    if (signYubaRun === run) signYubaRun = null;
    let rest = run.total - run.signed;
    if (run.signed > 0) {
        let text = "【鱼吧】" + run.signed + "个鱼吧签到完成";
        if (rest > 0) text += "，" + rest + "个未签成功";
        if (run.failed > 0) text += "（其中 " + run.failed + " 个连续失败已放弃）";
        showMessage(text, "success");
    } else if (run.failed > 0) {
        showMessage("【鱼吧】" + run.total + "个鱼吧均未签成功（" + run.failed + " 个连续失败已放弃）", "error");
    } else {
        showMessage("【鱼吧】" + run.total + "个鱼吧今日均已签到", "warning");
    }
    if (typeof run.resolve === "function") run.resolve(Sign_Yuba_summary(run, false));
}

/** 网络层失败（onerror / ontimeout）：本批次记为失败并推进收尾，绝不静默悬挂 */
function Sign_Yuba_markFailed(run, group_id, why, err) {
    if (!run || run.finished) return;
    run.failed++;
    run.done++;
    ExGuard_warn("鱼吧签到", "(" + group_id + ") " + why + "，本批次记为失败", err);
    Sign_Yuba_finishRun(run);
}

function signYubaFast() {
    GM_xmlhttpRequest({
        method: "POST",
        url: "https://mapi-yuba.douyu.com/wb/v3/fastSign",
        responseType: "json",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "client": "android",
            "token": dyToken,
        },
        onload: function (response) {
            if (response.response.message == "" && response.response.data != 0) {
                // showMessage("【鱼吧】一键签到成功! 获得经验" + response.response.data, "success");
            } else if (response.response.data == 0) {
                // showMessage("【鱼吧】没有7级以上的鱼吧或极速签到已完成", "warning");
            } else {
                // showMessage("【鱼吧】" + response.response.message, "warning");
            }
        },
        onerror: function (err) {
            ExGuard_warn("鱼吧签到", "极速签到请求失败", err);
        },
        timeout: SIGN_YUBA_XHR_TIMEOUT
    });
}

async function signYuba(group_id, t, run) {
    const state = run || signYubaRun;
    if (!state || state.finished) return; // 批次已结束：迟到回调不再记账
    GM_xmlhttpRequest({
        method: "POST",
        url: "https://yuba.douyu.com/ybapi/topic/sign",
        data: 'group_id=' + group_id,
        responseType: "json",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "dy-client": "pc",
            "dy-token": t,
            'Referer': 'https://yuba.douyu.com/group/' + group_id
        },
        timeout: SIGN_YUBA_XHR_TIMEOUT,
        onload: async function (response) {
            if (state.finished) return;
            const body = (response && response.response) || {};
            const message = body.message == null ? "" : String(body.message);
            const tries = state.countMap[group_id] || 0;
            if (message == "签到失败") {
                // 关键：重试前先计次，否则 countMap 永远不涨、上限判断形同虚设
                state.countMap[group_id] = tries + 1;
                if (tries + 1 >= SIGN_YUBA_MAX_RETRIES) {
                    state.failed++;
                    state.done++;
                    ExGuard_warn("鱼吧签到", "(" + group_id + ") 连续 " + SIGN_YUBA_MAX_RETRIES + " 次签到失败，已放弃");
                    Sign_Yuba_finishRun(state);
                    return;
                }
                await sleep(2000);
                signYuba(group_id, t, state);
                return;
            }
            state.countMap[group_id] = tries + 1;
            state.done++;
            if (message == "") {
                state.signed++;
            } else {
                state.already++;
            }
            try {
                await signYubaSupplementary(group_id);
            } catch (e) {
                ExGuard_warn("鱼吧签到", "(" + group_id + ") 补充签到异常", e);
            }
            Sign_Yuba_finishRun(state);
        },
        onerror: function (err) { Sign_Yuba_markFailed(state, group_id, "请求失败", err); },
        ontimeout: function () { Sign_Yuba_markFailed(state, group_id, "请求超时"); }
    });
}

async function signYubaSupplementary(group_id) {
    const result = await signSupplementary(group_id);
    // result 可能为 null（请求失败/超时）：拿不到就当作没有补签卡，不要抛
    const extra = (result && result.data) ? (Number(result.data.supplementary_cards) || 0) : 0;
    for (let i = 0; i < extra; i++) {
        await signSupplementary(group_id);
    }
    return extra;
}

async function signYubaList() {
    let yubaList = [];
    const first = await getYubaPage(1);
    if (!first) {
        showMessage("【鱼吧】获取关注鱼吧列表失败（登录态失效或网络异常），本次跳过", "error");
        return Sign_Yuba_summary(null, true);
    }
    yubaList = yubaList.concat(Array.isArray(first.list) ? first.list : []);
    const pageNum = Number(first.count_page) - 1;
    if (pageNum >= 1) {
        for (let i = 0; i < pageNum; i++) {
            const curPage = 2 + i;
            const ret = await getYubaPage(curPage);
            if (!ret) {
                ExGuard_warn("鱼吧签到", "第 " + curPage + " 页鱼吧列表获取失败，已跳过该页");
                continue;
            }
            yubaList = yubaList.concat(Array.isArray(ret.list) ? ret.list : []);
        }
    }
    if (!yubaList.length) {
        showMessage("【鱼吧】没有可签到的鱼吧（需 7 级以上鱼吧关注）", "warning");
        return Sign_Yuba_summary(null, false);
    }
    // 每次批量都开一个新批次：收尾不会再靠「把计数置 null」来表达结束
    const run = Sign_Yuba_createRun(yubaList.length);
    signYubaRun = run;
    signYubaFast();
    for (let i = 0; i < yubaList.length; i++) {
        const item = yubaList[i] || {};
        signYuba(item.group_id, dyToken, run);
    }
    // 等这一批全部落地（或放弃）再返回：调用方拿到的才是真实结果，而不是「请求已发出」
    return run.finishedPromise;
}

/** 关注鱼吧列表分页。失败/超时一律 resolve(null)，调用处判空 —— 不再有永远挂着的 await */
function getYubaPage(page) {
    return ExGuard_xhr({
        method: "GET",
        url: "https://yuba.douyu.com/wbapi/web/group/myFollow?page=" + String(page) + "&limit=" + SIGN_YUBA_PAGE_LIMIT,
        responseType: "json",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "dy-client": "pc",
            "dy-token": dyToken
        },
        tag: "鱼吧签到"
    }, SIGN_YUBA_XHR_TIMEOUT).then(function (ret) {
        return (ret && ret.data) ? ret.data : null;
    });
}

function getSupplementaryNums(group_id) {
    return ExGuard_xhr({
        method: "GET",
        url: "https://yuba.douyu.com/wbapi/web/signDetail?group_id=" + group_id,
        responseType: "json",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "dy-client": "pc",
            "dy-token": dyToken
        },
        tag: "鱼吧签到"
    }, SIGN_YUBA_XHR_TIMEOUT);
}

function signSupplementary(group_id) {
    return ExGuard_xhr({
        method: "POST",
        url: "https://mapi-yuba.douyu.com/wb/v3/supplement",
        responseType: "json",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "client": "android",
            "token": dyToken
        },
        data: "group_id=" + group_id,
        tag: "鱼吧签到"
    }, SIGN_YUBA_XHR_TIMEOUT);
}
