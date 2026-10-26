function initPkg_Refresh() {
	// 三个子模块互相独立：任一模块的恢复路径抛错，不得带走后面的模块。
	//（旧实现是三条平铺直调，Refresh_Video 排在 Barrage 之前 —— 它一抛，用户就看不到「前缀」按钮了。）
	Refresh_tryInit("拉高", initPkg_Refresh_BarrageFrame);
	Refresh_tryInit("隐藏礼物栏", initPkg_Refresh_Video);
	Refresh_tryInit("前缀", initPkg_Refresh_Barrage);
}

/** 单模块兜底：失败只影响它自己，并报出模块名 */
function Refresh_tryInit(name, fn) {
	try {
		if (typeof fn === "function") fn();
		return true;
	} catch (e) {
		if (typeof ExGuard_warn === "function") {
			ExGuard_warn("简洁模式", name + " 初始化失败（其余功能照常）", e);
		} else {
			console.error("[DouyuEx] 简洁模式初始化失败：" + name + " —— " + ((e && e.message) || e));
		}
		return false;
	}
}

/**
 * 读取并解析 ExSave_Refresh。
 * 旧实现在四个模块里各写一遍裸 JSON.parse：存储里一旦是脏值（手改过 / 旧结构 / 写入中断）
 * 就当场抛，Set 中断 —— 用户看到的是「三个按钮忽然都没了」，而且没有任何提示。
 */
function Refresh_readSave() {
	if (typeof localStorage === "undefined" || !localStorage) return {};
	let raw = null;
	try {
		raw = localStorage.getItem("ExSave_Refresh");
	} catch (e) {
		raw = null;
	}
	if (raw == null) return {};
	let parsed = null;
	try {
		parsed = JSON.parse(raw);
	} catch (e) {
		if (typeof ExGuard_warn === "function") ExGuard_warn("简洁模式", "本地配置已损坏，已按默认值处理", e);
		return {};
	}
	return (parsed && typeof parsed === "object") ? parsed : {};
}

/**
 * 读取「网页全屏」开关 —— 跨包**只读**的存储键。
 *   写入方：src/packages/ExpandTool/ExpandTool_FullScreen.js（ExSave_FullScreen.isFullScreen）
 *   用途：只决定播放器工具条的 z-index；读不到 / 坏值一律按"没全屏"处理。
 * ⚠ 改键名时两处必须同步（Refresh 不负责写这个键）。
 */
function Refresh_readFullScreen() {
	if (typeof localStorage === "undefined" || !localStorage) return false;
	let raw = null;
	try {
		raw = localStorage.getItem("ExSave_FullScreen");
	} catch (e) {
		return false;
	}
	if (raw == null) return false;
	try {
		const parsed = JSON.parse(raw);
		return !!(parsed && parsed.isFullScreen);
	} catch (e) {
		return false;
	}
}

function saveData_Refresh() {
	// 此处为保存简洁模式的数据，请在每次操作后都调用这个函数以保存状态
	// 数据结构
	// {功能1:{子功能1:{}}}
	// 每个子模块需要提供相应的返回数据函数
	let data = {
		barrageFrame: {
			status: refresh_BarrageFrame_getStatus(),
		},
		video: {
			status: refresh_Video_getStatus(),
		},
		barrage: {
			status: refresh_Barrage_getStatus(),
		}
	}

	localStorage.setItem("ExSave_Refresh", JSON.stringify(data)); // 存储弹幕列表
}
