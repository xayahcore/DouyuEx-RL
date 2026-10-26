function NoLogin_applyDouyuRateRecord() {
  const NO_LOGIN_RATE_KEY = "rateRecordTime_h5p_room";
    try {
        if (typeof localStorage === "undefined" || !localStorage) return;
        const raw = localStorage.getItem(NO_LOGIN_RATE_KEY);
        let data = raw ? JSON.parse(raw) : {};
        // 数组也当坏数据：往数组上挂的 v 字段不会被 JSON.stringify 序列化，
        // 于是"标记"永远写不进去 —— 表现就是这份未登录限流优化静默无效。
        if (typeof data !== "object" || data === null || Array.isArray(data)) {
            data = {};
        }
        if (data.v === "v") {
            return;
        }
        data.v = "v";
        localStorage.setItem(NO_LOGIN_RATE_KEY, JSON.stringify(data));
    } catch (e) {
        // 隐私模式 / 存储被禁用时这里会抛。旧实现是空 catch，什么都不留；
        // 现在留一条自证信息，方便用户报"限流还是弹"时定位。
        if (typeof ExGuard_warn === "function") {
            ExGuard_warn("未登录优化", "无法写入 " + NO_LOGIN_RATE_KEY + "（本地存储不可用）", e);
        }
    }
}

function initPkg_NoLogin() {
    NoLogin_applyDouyuRateRecord();
}
