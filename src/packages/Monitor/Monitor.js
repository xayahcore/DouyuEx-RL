/* ==================== 在线弹幕助手（外部数据站入口） ==================== */
/*
 * 胶囊条上的图标已撤出：入口并进「数据档案」面板，做成一行链接。
 * 本文件只保留一个纯函数负责拼地址，面板通过 typeof 判空调用它，
 * 模块缺失时面板会自己按同一套规则兜底。
 */

/**
 * 在线弹幕助手地址。
 * @param roomId 真实房间号（靓号请先用 exParseRealRid 换算）
 * @returns 合法房间号 → https://www.douyuex.com/<roomId>；空 / 非法 → ""
 */
function Monitor_onlineAssistantUrl(roomId) {
	var text = roomId === undefined || roomId === null ? "" : String(roomId).trim();
	if (!/^\d{2,12}$/.test(text)) return "";
	return "https://www.douyuex.com/" + text;
}

function initPkg_Monitor() {
	/* 不再自建 DOM（图标已撤）。保留空初始化是为了 main.js 的接线契约不变。 */
}