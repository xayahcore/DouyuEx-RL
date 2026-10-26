function initPkg_FansBadgeList() {
    // 粉丝牌页（member/cp/getFansBadgeList）：给每一行补一行「已获取 N 天 / 获取日期」。
    // 历史雷：item.getElementsByTagName("td")[1] 是**裸取** —— 只要有一行没有第二列
    // （占位行 / 表头之外的杂项行 / 页面改版后多出来的行），这里当场 TypeError，
    // 整个循环中断，后面的行全部没有注释，用户看到的就是「这页什么都没加」。
    // 同理 data-fans-gbdgts 缺失时 Number(null)*1000 是 NaN，会渲染出「NaN 天 / NaN-NaN-NaN」。
    // 现在：缺列 / 缺时间都只跳过这一行，并留一条带行数的自证信息。
    let nowTime = new Date().getTime();
    let items = document.querySelectorAll(".fans-badge-list tr");
    if (items.length <= 1) {
        return;
    }
    let annotated = 0;
    let skipped = 0;
    // 跳过表头（items[0]）
    for (let i = 1; i < items.length; i++) {
        let item = items[i];
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
            let style = days >= 300 ? "font-weight:600;color:red;" : "";

            td.innerHTML += `
        已获取 <span style="${style}">${days}</span> 天<br/>
        ${ttStr}`;
            annotated++;
        } catch (e) {
            // 单行异常只丢这一行，不带走整张表
            skipped++;
        }
    }
    if (skipped > 0 && typeof ExGuard_warn === "function") {
        ExGuard_warn("粉丝牌页", "有 " + skipped + " 行结构不符合预期（缺列或缺获取时间），已跳过；成功注释 " + annotated + " 行");
    }
}