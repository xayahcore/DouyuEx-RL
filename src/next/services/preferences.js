function* (__imports) {
yield {"$o": { get: () => $o, set: value => { $o = value; } },
"Jo": { get: () => Jo, set: value => { Jo = value; } },
"Ko": { get: () => Ko, set: value => { Ko = value; } },
"Qo": { get: () => Qo, set: value => { Qo = value; } },
"Xo": { get: () => Xo, set: value => { Xo = value; } },
"Zo": { get: () => Zo, set: value => { Zo = value; } }};
/**
 * 历史夜间模式已完全退役 (斗鱼现代网页已原生自带夜间/日间模式切换)
 * 此处保留空安全接口以确保下游契约 100% 守恒与零破坏
 */
var Qo = ""; // 原夜间月亮图标已退役
var Jo = ""; // 原日间太阳图标已退役
var Zo = 0;  // 默认日间模式 (0)

/**
 * 空操作持久化函数 (避免写入冗余的 ExSave_Mode)
 */
function Xo() {}

/**
 * 空操作样式注入 (官方已有原生夜间模式)
 */
function Ko() {}

/**
 * 空操作鱼吧 iframe 样式注入
 */
function $o() {}

}
