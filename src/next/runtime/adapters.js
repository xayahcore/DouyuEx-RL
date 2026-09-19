function* (__imports) {
yield {};
/**
 * NEXT 特性适配器与面板调度注册器
 * 承接 9 大 Dock 按钮的 open / execute 动作
 */
const nextPanelAdapters = [
  ['ex-sign', '一键签到'],
  ['fans-continue', '一键续牌'],
  ['extool-icon', '扩展功能'],
  ['livetool-icon', '直播间工具'],
  ['bloop-icon', '弹幕发送小助手'],
  ['ex-lottery', '全站抽奖信息'],
  ['popup-player', '同屏播放'],
  ['ex-monitor', null],
  ['ex-update', '版本更新']
];

for (const [id, panel] of nextPanelAdapters) {
  __imports.nextFeatures.register(id, {
    panel,
    open(hover, button) {
      if (!panel) {
        return hover ? undefined : (0, __imports._)(`https://www.douyuex.com/${String(__imports.B)}`, true);
      }
      if (id === 'ex-sign' && !hover) {
        (0, __imports.createSignPanel)();
      }
      const result = (0, __imports.openFeaturePanel)(panel, hover, button);
      if (id === 'fans-continue') {
        (0, __imports.updateFansContinuePanel)();
      }
      if (id === 'ex-lottery') {
        const list = document.getElementsByClassName('lottery__wrap')[0];
        if (list && typeof __imports.So !== 'undefined') {
          list.innerHTML = __imports.So;
        }
      }
      return result;
    },
    ...(id === 'ex-sign' ? { execute: (options, onLog) => (0, __imports.executeSignEngine)(options, onLog) } : {}),
    ...(id === 'fans-continue' ? { execute: count => (0, __imports.executeFansContinue)(count) } : {}),
    ...(id === 'popup-player' ? { execute: (url, noIframe) => (0, __imports.executePopupPlayer)(url, noIframe) } : {})
  });
}

__imports.nextRuntime.features = __imports.nextFeatures;
__imports.nextRuntime.teardownDock = __imports.teardownNextDock;
__imports.nextRuntime.tasks = Object.freeze({
  start: __imports.startTaskHeartbeat,
  stop: __imports.stopTaskHeartbeat
});
__imports.nextRuntime.navigation = Object.freeze({
  install: __imports.installNavigation,
  remove: __imports.stopNavigation
});
__imports.nextRuntime.lifecycle = 'Owned SPA navigation, room mounts and PiP requests; legacy hooks/jobs require reload';
__imports.nextRuntime.status = 'ready';
Object.freeze(__imports.nextRuntime);

}
