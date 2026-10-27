/* ==================== 入口收敛（2026-10-26 撤下 / 2026-10-27 定案） ====================
 * 这个图标指向 https://www.douyuex.com/<rid> —— 第三方数据站。
 * 同类数据源 doseeing.com 已于 2026-09-30 全线停服（右上角那三项数字就是这么没的），
 * douyuex.com 的可用性同样不由我们掌握：点过去可能只是一张空壳/公告页。
 * 所以胶囊条上的这个入口默认撤下，避免"点了没内容"。
 *
 * 2026-10-27 用户定案：这个二级菜单图标**不恢复**（不要把它加回胶囊条）。
 * "打开在线弹幕助手"的能力没有丢，已搬到「扩展功能」面板最后一张卡片：
 *   src/packages/ExpandTool/ExpandTool.js → initPkg_ExpandTool_MonitorLink()
 *   按钮 id：extool__monitor_open（点击仍是 openPage("https://www.douyuex.com/" + rid)）
 * 也就是说：需要这个跳转的用户主动去面板里点，而不是让它常驻在胶囊条上。
 *
 * 包体本身一行没删（插入逻辑与点击逻辑都在），改下面这个开关即可整体回滚：
 *   const MONITOR_ENTRY_ENABLED = true;   // 恢复胶囊条图标与跳转（与面板里的按钮并存，互不依赖）
 * 注意：这里只是"能不能回滚"的技术兜底，不代表要恢复 —— 用户要求保持 false。
 */
const MONITOR_ENTRY_ENABLED = false;

function initPkg_Monitor() {
	// 入口已撤：不建 DOM、不绑点击。保留空初始化是为了 main.js 的接线契约不变。
	if (!MONITOR_ENTRY_ENABLED) {
		console.info("[DouyuEx] 「在线弹幕助手」入口已撤下：第三方数据站可用性无保证");
		return;
	}
	initPkg_Monitor_Dom();
	initPkg_Monitor_Func();
}

function initPkg_Monitor_Dom() {
	Monitor_insertIcon();
}
function Monitor_insertIcon() {
	let a = document.createElement("div");
	a.className = "ex-monitor";
	a.innerHTML = '<a class="ex-panel__icon" title="在线弹幕助手"><svg style="display:block;" t="1638235744961" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="69800" width="32" height="32"><path d="M426.666667 106.666667a21.333333 21.333333 0 0 1 21.333333-21.333334h512a21.333333 21.333333 0 0 1 0 42.666667H448a21.333333 21.333333 0 0 1-21.333333-21.333333z m533.333333 789.333333H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667z m0-554.666667H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667z m0 298.666667H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667zM245.333333 42.666667H96a53.393333 53.393333 0 0 0-53.333333 53.333333v149.333333a53.393333 53.393333 0 0 0 53.333333 53.333334h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333334V96a53.393333 53.393333 0 0 0-53.333334-53.333333z m0 341.333333H96a53.393333 53.393333 0 0 0-53.333333 53.333333v149.333334a53.393333 53.393333 0 0 0 53.333333 53.333333h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333333V437.333333a53.393333 53.393333 0 0 0-53.333334-53.333333z m0 341.333333H96a53.393333 53.393333 0 0 0-53.333333 53.333334v149.333333a53.393333 53.393333 0 0 0 53.333333 53.333333h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333333v-149.333333a53.393333 53.393333 0 0 0-53.333334-53.333334z" fill="#13227a" p-id="69801"></path></svg><i id="Monitor__tip" class="ex-panel__tip"></i></a>';

	// Dock 未就绪时不要抛异常：initPkg_Safe 会吞掉异常但整包就再也不会补插
	let b = document.getElementsByClassName("ex-panel__wrap")[0];
	if (!b) return false;
	b.insertBefore(a, b.childNodes[0]);
	return true;
}

function initPkg_Monitor_Func() {
	let icon = document.getElementsByClassName("ex-monitor")[0];
	if (!icon) return; // 图标没插进去就没有可绑的点击
	icon.addEventListener("click", function() {
		openPage("https://www.douyuex.com/" + String(rid));
	});
}
