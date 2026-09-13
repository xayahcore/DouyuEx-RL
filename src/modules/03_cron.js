// 周期性任务 (Cron / Scheduled Tasks)
function c() {
    (async () => {
        Qt();
        setInterval(Qt, 6e4); // 用户等级任务自动领取（60秒定时心跳）
    })();
}
