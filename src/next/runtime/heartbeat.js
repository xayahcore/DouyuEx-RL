function* (__imports) {
yield {"startTaskHeartbeat": { get: () => startTaskHeartbeat, set: value => { startTaskHeartbeat = value; } },
"stopTaskHeartbeat": { get: () => stopTaskHeartbeat, set: value => { stopTaskHeartbeat = value; } }};
// Own only the level-task heartbeat; other feature jobs have separate lifetimes.
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
