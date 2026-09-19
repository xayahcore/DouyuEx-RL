function* (__imports) {
yield {"isRepeatedPipPacket": { get: () => isRepeatedPipPacket, set: value => { isRepeatedPipPacket = value; } }};
function isRepeatedPipPacket(e) {
                var t = Date.now(),
                  o = __imports.pipPacketTimes.get(e);
                if (null != o && t - o < __imports.pipDedupWindowMs) return 1;
                if ((__imports.pipPacketTimes.set(e, t), __imports.pipPacketTimes.size > __imports.pipDedupCapacity))
                  for (var [n, i] of __imports.pipPacketTimes) t - i > __imports.pipDedupWindowMs && __imports.pipPacketTimes.delete(n);
              }

}
