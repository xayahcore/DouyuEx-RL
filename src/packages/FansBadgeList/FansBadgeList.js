/* 盯 body 子树的那个 observer：留着引用，便于排查时判断有没有挂上。
 * 用 var 不用 let/const：全包同域，压缩与执行顺序都不该成为新的 TDZ 哑雷。 */
var FansBadgeList_hook = null;

function initPkg_FansBadgeList() {
    // 粉丝牌表格有两种出现形态：
    //   ① member/cp/getFansBadgeList 独立页（router 直接调，表格一开始就在）；
    //   ② 房间内的粉丝牌浮层（异步渲染、点开才出现）。
    // 旧实现只取一次 querySelectorAll，第②种形态永远是 0 行 —— 功能静默不存在。
    // 现在：一次就命中就地处理；没命中就「盯着 body 子树等它出现」。
    // ⚠ 中间那版曾改成 20 次 × 500ms 的定长轮询 —— 真机实测每份文档白等 10 秒，
    //   还会留一条「等待目标节点 10 秒仍未出现」的 warning：房间加载时那个浮层根本没开，
    //   注定等不到。改成 MutationObserver 后，浮层什么时候点开、什么时候渲染，都能接住。
    if (FansBadgeList_annotateRows()) return;
    if (typeof DomHook === "function") {
        let lastRun = 0;
        try {
            FansBadgeList_hook = new DomHook("body", true, function () {
                const now = Date.now();
                if (now - lastRun < 400) return; // 聊天区每秒几十次变更，按 400ms 节流
                lastRun = now;
                FansBadgeList_annotateRows();
            });
            if (!FansBadgeList_hook.failed) return;
        } catch (e) {
            if (typeof ExGuard_warn === "function") ExGuard_warn("粉丝牌页", "浮层监听挂不上，退回有上限轮询", e);
        }
    }
    // 兜底（没有 DomHook / body 挂不上）：仍然是「有上限轮询」，但等不到只留 debug
    if (typeof ExGuard_pollFor !== "function") return;
    ExGuard_pollFor(function () {
        const rows = document.querySelectorAll(".fans-badge-list tr");
        return rows.length > 1 ? document.querySelector(".fans-badge-list") : null;
    }, function () {
        FansBadgeList_annotateRows();
    }, { intervalMs: 500, maxTries: 20, tag: "粉丝牌页", quiet: true });
}



/**
 * 给每一行补「已获取 N 天 / 获取日期」。返回 true = 表格已就位（不必再等）。
 *
 * 历史雷：item.getElementsByTagName("td")[1] 是**裸取** —— 只要有一行没有第二列
 * （占位行 / 表头之外的杂项行 / 页面改版后多出来的行），这里当场 TypeError，
 * 整个循环中断，后面的行全部没有注释，用户看到的就是「这页什么都没加」。
 * 同理 data-fans-gbdgts 缺失时 Number(null)*1000 是 NaN，会渲染出「NaN 天 / NaN-NaN-NaN」。
 * 现在：缺列 / 缺时间都只跳过这一行，并留一条带行数的自证信息。
 *
 * 幂等：处理过的行打 dataset 标记 —— 独立页与房间浮层两个入口可能先后都调到这里，
 * 没有标记的话同一行会被注释两遍。
 */
function FansBadgeList_annotateRows() {
    let nowTime = new Date().getTime();
    let items = document.querySelectorAll(".fans-badge-list tr");
    if (items.length <= 1) {
        return false;
    }
    let annotated = 0;
    let skipped = 0;
    // 跳过表头（items[0]）
    for (let i = 1; i < items.length; i++) {
        let item = items[i];
        if (item.dataset && item.dataset.exFansAnnotated === "1") continue;
        try {
            let td = item.getElementsByTagName("td")[1];
            if (!td) {
                skipped++;
                continue;
            }
            let raw = item.getAttribute("data-fans-gbdgts");
            let tt = Number(raw) * 1000;
            if (!raw || !isFinite(tt) || tt <= 0) {
                skipped++;
                continue;
            }
            let ttStr = dateFormat("yyyy-MM-dd hh:mm:ss",new Date(tt)); // 获取日期
            let days = Math.floor((nowTime - tt) / 86400000); // 距今天数
            let longTerm = days >= 300;   // 超过 300 天属长期牌：用类名表达，不再内联

            td.innerHTML += `
        已获取 <span class="${longTerm ? "is-long-term" : ""}">${days}</span> 天<br/>
        ${ttStr}`;
            if (item.dataset) item.dataset.exFansAnnotated = "1";
            annotated++;
        } catch (e) {
            // 单行异常只丢这一行，不带走整张表
            skipped++;
        }
    }
    if (skipped > 0 && typeof ExGuard_warn === "function") {
        ExGuard_warn("粉丝牌页", "有 " + skipped + " 行结构不符合预期（缺列或缺获取时间），已跳过；成功注释 " + annotated + " 行");
    }
    return true;
}