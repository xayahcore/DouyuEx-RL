function* (__imports) {
yield {"Oa": { get: () => Oa, set: value => { Oa = value; } },
"ja": { get: () => ja, set: value => { ja = value; } },
"pipDedupCapacity": { get: () => pipDedupCapacity, set: value => { pipDedupCapacity = value; } },
"pipDedupWindowMs": { get: () => pipDedupWindowMs, set: value => { pipDedupWindowMs = value; } },
"pipMergeGroups": { get: () => pipMergeGroups, set: value => { pipMergeGroups = value; } },
"pipPacketTimes": { get: () => pipPacketTimes, set: value => { pipPacketTimes = value; } },
"za": { get: () => za, set: value => { za = value; } }};
/**
 * 画中画 (PiP) 运行时共享状态容器
 */
// 相似弹幕归并活跃字典 (Key -> { timestamps: number[], dom: HTMLElement|null, displayCount: number })
let pipMergeGroups = new Map();

// 当前活跃的画中画浮窗顶层容器引用 (DOM 容器)
let ja = null;

// 弹幕报文时间戳去重滑窗 (Key -> timestampMs)
let pipPacketTimes = new Map();

// 连击弹幕聚合最小阈值 (>=2 时显示连击气泡)
let za = 2;

// 历史弹幕最大缓存条数 (默认 18 条)
let Oa = 18;

// 去重时间滑窗大小 (3000ms)
let pipDedupWindowMs = 3000;

// 去重缓存最大容量 (800 条)
let pipDedupCapacity = 800;

}
