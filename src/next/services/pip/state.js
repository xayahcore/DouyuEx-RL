function* (__imports) {
yield {"Oa": { get: () => Oa, set: value => { Oa = value; } },
"ja": { get: () => ja, set: value => { ja = value; } },
"pipDedupCapacity": { get: () => pipDedupCapacity, set: value => { pipDedupCapacity = value; } },
"pipDedupWindowMs": { get: () => pipDedupWindowMs, set: value => { pipDedupWindowMs = value; } },
"pipMergeGroups": { get: () => pipMergeGroups, set: value => { pipMergeGroups = value; } },
"pipPacketTimes": { get: () => pipPacketTimes, set: value => { pipPacketTimes = value; } },
"za": { get: () => za, set: value => { za = value; } }};
let pipMergeGroups = new Map(),
  ja = null,
  pipPacketTimes = new Map(),
  za = 2,
  Oa = 18,
  pipDedupWindowMs = 3e3,
  pipDedupCapacity = 800;

}
