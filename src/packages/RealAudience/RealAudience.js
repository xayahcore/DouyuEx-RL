/* ==================== 数据源状态（2026-10-26） ====================
 * 第三方数据站「在看直播（doseeing.com）」自 2026-09-30 起全线停止服务：
 * /xeee/room/aggr、/data/api/user_feed、/login 等所有路径现在只返回同一张
 * 「停止服务公告」页（HTTP 200，内容不是 JSON）。它供的三项口径
 * ——今日累计活跃人数 / 弹幕人数 / 今日累计礼物价值——都是**跨用户**统计，
 * 本机算不出来。因此这三项不再渲染、也不再向该站发任何请求：
 * 绝不用 0 或 **** 假装"有数字"，也绝不按在线人数乘系数编一个近似值。
 *
 * 留下来的三项本机就算得出来，照旧显示：
 *   已播   ← h5room 的 show_time（斗鱼自有接口，未停服）
 *   贵宾数 ← 长连接 oni.vn（LiveTool 的 WS 分发）
 *   已观看 ← 官方 fsjk/getCardTaskInfo（需登录，仅本人）
 */
const REAL_AUDIENCE_DEAD_SOURCE_NOTE = "第三方数据站（在看直播）已于 2026-09-30 停止服务：活跃人数/弹幕人数/礼物价值不再提供";

let real_info = {
	showtime: 1428,
	isShow: 2,
	noble_count: "",
}
let hasAvatarBottom = false;
// 统计模块定时器只允许启动一次（与 h5room 请求解耦后，任何重试都不重复挂表）
let real_audience_booted = false;

function formatNobleCount(vn) {
	const n = Number(vn);
	if (isNaN(n)) return vn;
	if (n >= 10000) {
		const wan = n / 10000;
		if (Number.isInteger(wan)) return wan + "万";
		return parseFloat(wan.toFixed(1)) + "万";
	}
	return String(n);
}

function initPkg_RealAudience() {
	initPkg_RealAudience_StyleHook();
	initPkg_RealAudience_Dom();
	initPkg_RealAudience_Func();
	setAvatarVideo();

	// 定时器与 h5room 请求解耦：该请求失败或超时也必须让统计条继续工作，
	// 不能把 setInterval 挂在 .then() 里（请求一挂，整场统计再也不会启动）。
	if (!real_audience_booted) {
		real_audience_booted = true;
		setRealViewer();
		setInterval(setRealViewer, 150000);
		setInterval(switchRealAndTodayWatch, 5000);
	}

	fetch("https://www.douyu.com/swf_api/h5room/" + rid, {
		method: 'GET',
		mode: 'no-cors',
		credentials: 'include'
	}).then(res => {
		return res.json();
	}).then(retData => {
		real_info.showtime = retData.data.show_time;
		real_info.isShow = retData.data.show_status;
		setRealViewer();
	}).catch(err => {
		console.log("请求失败!", err);
	})
}

function initPkg_RealAudience_StyleHook() {
	StyleHook_set("Ex_Style_RealAudience", `
    .VideoEntry{display:none !important;}
	.layout-Player-rank{top:34px !important;}
    `);
}

function initPkg_RealAudience_Dom() {
	// let real_giftIcon = '<svg t="1576950815993" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3618" width="16" height="16"><path d="M554.957 829.848l-85.905 0 0-463.89c0-18.978 15.384-34.363 34.362-34.363l17.182 0c18.978 0 34.362 15.38499999 34.362 34.363l0 463.89z" fill="#d4237a" p-id="3619"></path><path d="M889.985 494.814l-755.97 0c-37.902 0-68.724-30.82999999-68.724-68.725L65.291 323.003c0-56.846 46.241-103.087 103.087-103.087l687.245 0c56.846 0 103.087 46.24 103.087 103.087l0 103.086c-0.001 37.894-30.823 68.725-68.725 68.725z m0-68.725l0 34.363 0.016-34.363-0.016 0zM168.377 288.64c-18.94300001 0-34.363 15.412-34.363 34.364l0 103.086 755.87 0 0.1-103.086c0-18.952-15.42-34.363-34.363-34.363L168.377 288.641z" fill="#d4237a" p-id="3620"></path><path d="M821.26 958.712L202.74 958.712c-37.903 0-68.725-30.838-68.725-68.732L134.015 494.814c0-37.89400001 30.822-68.725 68.724-68.725l618.522 0c37.902 0 68.724 30.82999999 68.724 68.725L889.985 889.98c0 37.89400001-30.822 68.73199999-68.724 68.732z m0-68.732l0 34.362 0.017-34.362-0.016 0zM202.74 494.814L202.74 889.98l618.42 0 0.1-395.166L202.74 494.814z m281.358-240.537c-9.93399999 0-19.78200001-4.278-26.578-12.55L358.728 121.46c-12.03-14.664-9.916-36.317 4.748-48.363 14.648-12.038 36.326-9.924 48.373 4.74l98.79199999 120.268c12.03 14.664 9.916 36.317-4.74799999 48.363a34.213 34.213 0 0 1-21.795 7.81z" fill="#d4237a" p-id="3621"></path><path d="M539.902 254.277a34.212 34.212 0 0 1-21.795-7.81c-14.664-12.047-16.778-33.7-4.748-48.363L612.15 77.836c12.047-14.664 33.708-16.101599999 48.373-4.74 14.664 12.047 16.778 33.7 4.748 48.363l-98.792 120.268c-6.795 8.272-16.644 12.55-26.577 12.55z" fill="#d4237a" p-id="3622"></path></svg>'
	let real_nobleIcon = '<svg t="1779268394045" class="icon" viewBox="0 0 1170 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5245" width="16" height="16"><path d="M270.579175 30.138897S391.031549-36.125391 427.208548 36.176998c36.125391 18.062695 114.46588 463.798407 132.528575 548.176999 18.062695 90.365084 60.226187 120.452374 84.326983 84.326983s114.46588-126.490475 174.692068-265.057152-18.062695-156.629372-42.163492-150.591271c-24.100796 6.038101-150.591271 12.024594-108.427779-42.163491 48.201593-54.188086 156.629372-150.591271 186.716661-162.615866 54.188086-36.125391 138.566677-84.326983 210.817458-6.038101 42.163492 30.138897 144.55317 150.591271 48.201593 319.245238-96.403185 174.692067-475.874609 614.389678-475.87461 614.389678s-138.566677 90.365084-192.754762 0c-54.188086-84.326983-240.956355-554.163492-246.994456-614.389678 0-60.226187-18.062695-72.302389-48.201593-60.226187-30.138897 18.062695-90.365084 102.389678-96.403185 78.288882-5.986493-24.100796-60.174579-60.277795-24.049189-114.465881 30.138897-48.201593 216.855559-216.855559 240.956355-234.918254z" fill="#CCB88F" p-id="5246"></path></svg>';
	const videoEntry = document.getElementsByClassName("VideoEntry")[0];
	if (videoEntry) videoEntry.style.display = "none";
	// document.querySelector(".AnchorAnnounce > h3").style.display = "none";
	/* 统计条只剩本机算得出来的三项：贵宾数 / 已播 / 已观看。
	   死源那三项（今日累计活跃人数、弹幕人数、今日累计礼物价值）连节点都不建 ——
	   留着只会永远显示 **** 或 0，等于骗人。悬停整条给出停服说明。 */
	let html = "";
	let a = document.createElement("div");
	a.className = "real-audience";
	a.title = REAL_AUDIENCE_DEAD_SOURCE_NOTE;
	html += "<div style='flex: 1;white-space: nowrap'>";
	html += "<div id='real-audience__noble-wrap' style='display: inline-block;margin-right:3px;' title='贵宾数（来自直播间长连接）'>" + real_nobleIcon + '<span id="real-audience__noble">****</span></div>';
	html += "</div>";
	html += '<span id="real-audience__time" style="white-space: nowrap;display: block;">' + "已播:" + "****" + "</span>";
	html += '<span id="real-audience__watchtime" style="white-space: nowrap;display: none;">' + "已观看:" + "****" + "</span>";
	a.innerHTML = html;
	
	if (realAudienceInsert(a)) {
		initPkg_RealAudience_Func();
		return true;
	}
	// 播放器区块尚未渲染：500ms × 60 ≈ 30 秒内轮询补插；仍未等到则留一条线索，不再静默失败
	let retry = 0;
	let retryTimer = setInterval(function() {
		if (retry++ >= 60) {
			clearInterval(retryTimer);
			console.warn("[DouyuEx] 真实人数统计条插入失败：30 秒内未等到播放器区块");
			return;
		}
		if (document.getElementById("real-audience__time")) {
			// 已被 realAudienceEnsure 的定时器补上，收工
			clearInterval(retryTimer);
			return;
		}
		if (realAudienceInsert(a)) {
			clearInterval(retryTimer);
			initPkg_RealAudience_Func();
			// 首插失败时启动的那次 setRealViewer 会因无节点提前返回，这里补一次
			setRealViewer();
		}
	}, 500);
	return false;
}

/**
 * 插入统计条节点。候选里绝不包含 .Barrage-main：
 * 弹幕区会被页面持续重绘，插进去的节点很快被冲掉；而启动门槛
 * （initRouter_DouyuRoom_Main）只等 .Barrage-main + 背包按钮、并不等
 * .layout-Player-announce，所以冷启动时它必然过早命中 —— 统计条当场消失且再无自愈。
 */
function realAudienceInsert(node) {
	let container = getValidDom([".layout-Player-announce", ".layout-Player-rankAll", ".layout-Player-rank"]);
	if (!container) return false;
	container.insertBefore(node, container.childNodes[0]);
	return true;
}

// 自愈重建后的补数据节流时间戳
let realAudienceRefillAt = 0;

/**
 * 统计条自愈：页面重绘把节点冲掉后，清掉残留并就地重建。
 * 容器尚未渲染时直接返回 false —— 冷启动的轮询补插由 initPkg_RealAudience_Dom 负责，
 * 此处不再另起定时器，避免被 5 秒级调用叠成一堆。
 *
 * fromRefresh：由 setRealViewer 自己调用时为 true。那条路径接下来马上就会写值，
 * 不需要再补一次；只有"别的调用方发现节点没了"时才需要触发补数据 ——
 * 否则重建出来的节点会带着 **** 占位符一直等下一次 setRealViewer（150 秒）。
 */
function realAudienceEnsure(fromRefresh) {
	if (document.getElementById("real-audience__time")) return true;
	if (!getValidDom([".layout-Player-announce", ".layout-Player-rankAll", ".layout-Player-rank"])) return false;
	let stale = document.querySelectorAll(".real-audience");
	for (let i = 0; i < stale.length; i++) {
		if (stale[i].parentNode) stale[i].parentNode.removeChild(stale[i]);
	}
	try {
		// 插入成功后 Dom 内部会自行调用 initPkg_RealAudience_Func 绑定点击事件
		initPkg_RealAudience_Dom();
	} catch (e) {
		console.warn("[DouyuEx] 统计条重建异常:", e);
		return false;
	}
	const ok = !!document.getElementById("real-audience__time");
	// 重建出来的只是空壳（**** 占位符），必须立刻补一次数据；
	// 5 秒节流：页面反复重绘时不至于把刷新叠成一堆
	if (ok && !fromRefresh && Date.now() - realAudienceRefillAt > 5000) {
		realAudienceRefillAt = Date.now();
		Promise.resolve()
			.then(() => setRealViewer())
			.catch(() => {});
	}
	return ok;
}

// 统计条节点随时可能被页面重绘移除，写值统一走判空，避免定时器反复抛 TypeError
function realAudienceSet(id, prop, value) {
	let el = document.getElementById(id);
	if (!el) return false;
	el[prop] = value;
	return true;
}
	
	/* 统计条不再有跳转入口。
	   原先点它会开 https://www.doseeing.com/room/<rid>（第三方数据站），
	   该站自 2026-09-30 全线停服，点过去只会看到一张公告页 —— 那比"点了没反应"更糟。
	   本函数保留（Dom 插入成功时与 initPkg_RealAudience 各调一次），现在是幂等空实现。 */
	function initPkg_RealAudience_Func() {
		let audience = document.getElementsByClassName("real-audience")[0];
		if (!audience) return;
		if (audience.onclick) audience.onclick = null;
		audience.style.cursor = "default";
	}

async function setRealViewer() {
	// 统计条可能已被页面重绘冲掉：先自愈，拿不到节点就不再往下走（绝不抛异常）。
	// 传 true 表示"本函数马上就会写值"，不需要 self-heal 再补一次刷新
	if (!realAudienceEnsure(true)) return;
	if(document.querySelector(".MatchSystemChatRoomEntry") != null){
		document.querySelector(".MatchSystemChatRoomEntry").style.display = "none";
	}
	// 已观看：官方 fsjk 接口（本机自己的数据，与任何第三方数据站无关）；失败只跳过这一项
	let todayWatchData = null;
	try {
		todayWatchData = await getTodayWatch(rid);
	} catch (e) {
		console.warn("[DouyuEx] 今日观看请求失败（本轮跳过已观看项）:", e);
	}
	let todayWatchSeconds = (todayWatchData && todayWatchData.data && todayWatchData.data.todayWatch !== undefined) ? todayWatchData.data.todayWatch : 0;
	let todayWatchOk = !!(todayWatchData && todayWatchData.error == 0);
	let showedTime = 0;
	if (real_info.isShow == 2) {
		showedTime = 0;
	} else {
		if (real_info.showtime == 1428) {
			showedTime = 0;
		} else {
			showedTime = Math.floor(Date.now()/1000) - Number(real_info.showtime);
		}
	}
	// 贵宾数来自长连接消息（oni.vn），不依赖任何第三方数据站，任何时候都可以写
	if (real_info.noble_count !== "") {
		realAudienceSet("real-audience__noble", "innerText", formatNobleCount(real_info.noble_count));
	}
	
	// 下面两项本机就算得出来（已播用 showtime、已观看用 todayWatch），
	// 与任何远程数据站无关：即便所有第三方接口都不可用，这两项也必须有值。
	realAudienceSet("real-audience__time", "innerText", "已播:" + formatSeconds(showedTime));
	realAudienceSet("real-audience__time", "title", "开播时间:" + String(dateFormat("yyyy年MM月dd日hh时mm分ss秒 ",new Date(Number(real_info.showtime + "000")))) + "\n已观看:" + formatSeconds(todayWatchSeconds));
	
	if (todayWatchOk) {
		realAudienceSet("real-audience__watchtime", "innerText", "已观看:" + formatSeconds(todayWatchSeconds));
		realAudienceSet("real-audience__watchtime", "title", "开播时间:" + String(dateFormat("yyyy年MM月dd日hh时mm分ss秒 ",new Date(Number(real_info.showtime + "000")))) + "\n已观看:" + formatSeconds(todayWatchSeconds));
	}
}

function setAvatarVideo() {
	// 1. 插入对应的dom
	// 2. 绑定相应的函数
	// 3. 拉高黑框
	// 4. 对头像框鼠标移入移出事件绑定
	let homeDom = document.querySelectorAll(".VideoEntry-tabItem>a")[0];
	if (homeDom == undefined) {
		return;
	}
	let videoUrl = homeDom.href + "?type=video";
	let videoReplayUrl = homeDom.href + "?type=liveReplay";
	
	setAvatarVideo_Dom();
	setAvatarYuba_Dom();
	setAvatarVideo_Func(videoUrl, videoReplayUrl);
		let bottomPic = document.getElementsByClassName("Title-anchorPic-bottom")[0];
		if (bottomPic) {
			bottomPic.style.display = "none";
			bottomPic.style.height = hasAvatarBottom ? "66px" : "22px";
		}

		let picBack = document.getElementsByClassName("Title-anchorPicBack")[0];
		if (picBack && bottomPic) {
			picBack.addEventListener("mouseenter", () => {
				bottomPic.style.display = "block";
			});
			picBack.addEventListener("mouseleave", () => {
				bottomPic.style.display = "none";
			});
		}
}

function setAvatarVideo_Dom() {
	let a = document.createElement("div");
	hasAvatarBottom = !!document.getElementsByClassName("Title-anchorPic-bottom")[0];

	a.className = hasAvatarBottom ? "" : "Title-anchorPic-bottom";
	a.innerHTML = `
	<div id="Ex_VideoReview" class="Title-anchorPic-bottomItem"><span>回看</span></div>
	<i style="top: 28px"></i>
	<div id="Ex_VideoSubmit" class="Title-anchorPic-bottomItem"><span>投稿</span></div>
	`
	let b = document.getElementsByClassName("Title-anchorPic-bottom")[0] || document.getElementsByClassName("Title-anchorPicBack")[0];
	b.insertBefore(a, b.childNodes[0]);
}

function setAvatarYuba_Dom() {
	let a = document.createElement("div");
	hasAvatarBottom = !!document.getElementsByClassName("Title-anchorPic-bottom")[0];

	a.className = hasAvatarBottom ? "" : "Title-anchorPic-bottom";
	a.innerHTML = `
	<div id="Ex_EnterYuba" class="Title-anchorPic-bottomItem"><span>打开鱼吧</span></div>
	`
	let b = document.getElementsByClassName("Title-anchorPic-bottom")[0] || document.getElementsByClassName("Title-anchorPicBack")[0];
	b.insertBefore(a, b.childNodes[0]);
}

function setAvatarVideo_Func(videoUrl, videoReplayUrl) {
	document.getElementById("Ex_VideoSubmit").addEventListener("click", () => {
		openPage(videoUrl, true);
	})

	document.getElementById("Ex_VideoReview").addEventListener("click", () => {
		openPage(videoReplayUrl, true);
	})

	document.getElementById("Ex_EnterYuba").addEventListener("click", async () => {
		const data = await getBindYuba(rid);
		const url = data.data.group_url;
		openPage(url, true);
	})
}

function getBindYuba(rid) {
  return new Promise((resolve, reject) => {
    fetch("https://www.douyu.com/wgapi/yubanc/api/group/getBindGroup?room_id=" + rid)
      .then((response) => response.json())
      .then((data) => {
        resolve(data);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function getTodayWatch(rid) {
	return new Promise((resolve, reject) => {
		fetch('https://www.douyu.com/japi/interactnc/web/fsjk/getCardTaskInfo?rid=' + rid,{
			method: 'GET',
			mode: 'no-cors',
			credentials: 'include'
		}).then(res => {
			return res.json();
		}).then(ret => {
			resolve(ret);
		}).catch(err => {
			reject(err);
		})
	})
}

/* getRealViewer 已整体删除（2026-10-26）。
   它 POST https://www.doseeing.com/xeee/room/aggr 取「活跃/弹幕/礼物/付费」四项，
   而该站自 2026-09-30 起对所有路径只返回同一张「停止服务公告」页（HTTP 200，非 JSON）。
   留着它等于每次进房都打一发必然失败的请求，还把 console 刷满。
   要恢复这条路，必须同时改回三处：本函数、initPkg_RealAudience_Dom 里那三项 DOM、
   以及 main.js 头部被删掉的 @connect doseeing.com。 */

function initPkg_RealAudience_Handle(ret) {
	if (getType(ret) != "oni") return;
	let vn = getStrMiddle(ret, "vn@=", "/");
	if (!vn) return;
	real_info.noble_count = vn;
	let el = document.getElementById("real-audience__noble");
	if (el) el.innerText = formatNobleCount(vn);
}

function switchRealAndTodayWatch() {
	// 节点可能已被页面重绘冲掉：先自愈，拿不到就跳过本轮，绝不抛异常
	if (!realAudienceEnsure()) return;
	let realDom = document.getElementById("real-audience__time");
	let watchDom = document.getElementById("real-audience__watchtime");
	if (!realDom || !watchDom) return;
	if (realDom.style.display == "none") {
		realDom.style.display = "block";
		watchDom.style.display = "none";
	} else {
		realDom.style.display = "none";
		watchDom.style.display = "block";
	}
}