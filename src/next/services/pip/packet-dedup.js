function* (__imports) {
yield {"isRepeatedPipPacket": { get: () => isRepeatedPipPacket, set: value => { isRepeatedPipPacket = value; } }};
/**
 * 画中画弹幕去重滑窗探测器 (淘汰历史单字母混淆 e, t, o, n, i)
 * @param {string} packetKey - 弹幕消息唯一特征签名
 * @returns {boolean} true 表示属于时间窗口内的重复弹幕
 */
function isRepeatedPipPacket(packetKey) {
  const currentTimeMs = Date.now();
  const lastSeenTimeMs = __imports.pipPacketTimes.get(packetKey);

  // 处于去重时间窗口内的重复弹幕，直接命中拦截
  if (lastSeenTimeMs != null && currentTimeMs - lastSeenTimeMs < __imports.pipDedupWindowMs) {
    return true;
  }

  // 记录最新时间戳
  __imports.pipPacketTimes.set(packetKey, currentTimeMs);

  // 容量超标时惰性驱逐过期记录
  if (__imports.pipPacketTimes.size > __imports.pipDedupCapacity) {
    for (const [key, timestamp] of __imports.pipPacketTimes) {
      if (currentTimeMs - timestamp > __imports.pipDedupWindowMs) {
        __imports.pipPacketTimes.delete(key);
      }
    }
  }
  return false;
}

}
