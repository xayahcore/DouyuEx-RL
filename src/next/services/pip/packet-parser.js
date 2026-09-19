function* (__imports) {
yield {"parsePipChatPacket": { get: () => parsePipChatPacket, set: value => { parsePipChatPacket = value; } }};
/**
 * 解析斗鱼原生 STT 弹幕数据包 (type@=chatmsg/...)
 * @param {string} rawPacket - STT 原始报文字符串
 * @returns {object|null} 格式化弹幕对象或 null
 */
function parsePipChatPacket(rawPacket) {
  if (!rawPacket || typeof rawPacket !== 'string' || !rawPacket.startsWith('type@=chatmsg/')) {
    return null;
  }

  // 解码 STT 键值对字典
  const props = {};
  const segments = rawPacket.split('/');
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const eqIdx = seg.indexOf('@=');
    if (eqIdx !== -1) {
      props[seg.substring(0, eqIdx)] = seg.substring(eqIdx + 2);
    }
  }

  // 提取并解码弹幕文本
  let text = '';
  if (props.txt) {
    try {
      text = decodeURIComponent(props.txt);
    } catch {
      text = props.txt;
    }
  }
  if (!text) return null;

  // 机器人水军弹幕过滤检查 (dms: 弹幕等级标识)
  const allowRobot = __imports.pipPreferences.filterRobotDanmaku === false;
  if (!allowRobot && !props.dms) {
    return null;
  }

  const msgId = props.hash || props.cid || props.dmid || '';
  const color = props.col ? parseInt(props.col, 10) : 0;
  const uid = props.uid || '';
  const dedupKey = msgId || `${uid}|${text}`;

  return {
    text,
    color,
    uid,
    msgId,
    dedupKey
  };
}

}
