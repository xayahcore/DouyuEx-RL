function* (__imports) {
yield {"dispatchPipPacket": { get: () => dispatchPipPacket, set: value => { dispatchPipPacket = value; } }};
/**
 * 画中画实时弹幕数据包分发管道 (淘汰混淆单字母 e, r, t, o, n, i, a)
 * @param {string} rawPacket - STT 原始弹幕报文
 * @param {Document} pipDoc - 画中画子窗口 Document
 * @param {Window} pipWin - 画中画子窗口 Window
 */
function dispatchPipPacket(rawPacket, pipDoc, pipWin) {
  if (!window.__pip_is_active__) return;
  if ((0, __imports.isRepeatedPipPacket)(rawPacket)) return;

  const packet = (0, __imports.parsePipChatPacket)(rawPacket);
  if (!packet || !packet.text) return;

  // 弹幕关闭开关或自身已发送弹幕过滤 (自身弹幕有独立绿色边框通道)
  if (__imports.pipPreferences.danmakuVisible === false) return;
  if (__imports.I && packet.uid === __imports.I) return;

  const mergeMode = __imports.pipPreferences.mergeMode || 'combo';

  // 1. 全部显示模式：直接挂载飘屏渲染
  if (mergeMode === 'all') {
    (0, __imports.renderPipDanmaku)(packet, pipDoc, pipWin);
    return;
  }

  // 2. 合并模式 (combo) 或 单条模式 (single)
  const nowMs = Date.now();
  const mergeKey = (0, __imports.findPipMergeKey)(packet.text);

  if (!__imports.pipMergeGroups.has(mergeKey)) {
    __imports.pipMergeGroups.set(mergeKey, {
      timestamps: [],
      dom: null,
      displayCount: 0
    });
  }
  const group = __imports.pipMergeGroups.get(mergeKey);
  group.timestamps.push(nowMs);

  if (mergeMode === 'single') {
    // 4 秒内有多条只显示首条
    const recentCount = group.timestamps.filter(t => nowMs - t <= 4000).length;
    if (recentCount <= 1) {
      (0, __imports.renderPipDanmaku)(packet, pipDoc, pipWin);
    }
  } else {
    // combo 模式：8 秒滑窗合并连击
    group.timestamps = group.timestamps.filter(t => nowMs - t <= 8000);
    const count = group.timestamps.length;
    if (count === 1) {
      group.displayCount = 0;
      (0, __imports.renderPipDanmaku)(packet, pipDoc, pipWin);
    } else {
      group.displayCount = count;
    }
    (0, __imports.refreshPipCombos)(pipDoc);
  }
}

}
