function* (__imports) {
yield {"startTaskHeartbeat": { get: () => startTaskHeartbeat, set: value => { startTaskHeartbeat = value; } },
"stopTaskHeartbeat": { get: () => stopTaskHeartbeat, set: value => { stopTaskHeartbeat = value; } }};
/**
 * 全局用户等级任务经验心跳调度器 (60秒幂等定时器)
 * 仅管理经验心跳生命周期，其他房间与功能任务拥有独立生命周期树
 */
let taskHeartbeat = null;

function startTaskHeartbeat() {
  if (taskHeartbeat !== null) return;
  (0, __imports.claimLevelTasks)();
  taskHeartbeat = (0, __imports.setInterval)(__imports.claimLevelTasks, 60000);
}

function stopTaskHeartbeat() {
  if (taskHeartbeat === null) return;
  (0, __imports.clearInterval)(taskHeartbeat);
  taskHeartbeat = null;
}

}
