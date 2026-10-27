/* ==================== 统计条已整体撤下（2026-10-27） ====================
 * 右上角横条的数据源「在看直播（doseeing.com）」自 2026-09-30 起全线停止服务，
 * 此后整条只剩「贵宾数」一个数字 —— 没有参照、没有对比，用户判定为无意义，决定整条取消。
 * 随之撤下的还有：贵宾数解析（LiveTool 派发表的「贵宾数」项）、已播/已观看的 5 秒切换、
 * 150 秒写值定时器、自愈重建与停服说明；.layout-Player-rank 也不再需要为横条让出 34px。
 *
 * 两项本机算得出来的数据没有跟着丢，搬到了标题栏「复制直播流」右边
 * （src/packages/TitleTime/TitleTime.js 的 ex-title-time）：
 *   观看时间 ← 官方 fsjk/getCardTaskInfo（需登录，只代表本人）
 *   开播时间 ← h5room 的 show_time（斗鱼自有接口，从未停服）
 * 要恢复整条横条，必须同时改回三处：本包的统计条 DOM 与定时器、LiveTool 的「贵宾数」注册、
 * 以及 TitleTime 里搬到标题栏的那块显示（否则同两份数据会有两个出口）。
 */

// 头像框下方是否有原生条目容器（决定回看/投稿插件的类名与高度）
let hasAvatarBottom = false;

function initPkg_RealAudience() {
	initPkg_RealAudience_StyleHook();
	setAvatarVideo();
	hideMatchSystemChatEntry();
}

function initPkg_RealAudience_StyleHook() {
	// 视频投稿入口（.VideoEntry）照旧隐藏。
	// 横条撤下后不必再把 .layout-Player-rank 往下顶 34px —— 排行榜回到页面原生位置。
	StyleHook_set("Ex_Style_RealAudience", `
    .VideoEntry{display:none !important;}
    `);
}

/**
 * 赛事系统聊天室入口（.MatchSystemChatRoomEntry）：历史上涨这样的小入口由统计条那边顺手藏掉。
 * 它跟数据源无关，撤统计条时不能顺手把「隐藏」也一起删掉 —— 那等于把一条推广入口放回来。
 * 初始化试一次，晚渲染的用有上限轮询补一次（20 × 500ms），等不到就算了，不刷屏。
 */
function hideMatchSystemChatEntry() {
	const hide = function (el) {
		if (el && el.style) el.style.display = "none";
		return el;
	};
	if (hide(document.querySelector(".MatchSystemChatRoomEntry"))) return true;
	if (typeof ExGuard_pollFor !== "function") return false;
	ExGuard_pollFor(".MatchSystemChatRoomEntry", hide, { intervalMs: 500, maxTries: 20, tag: "赛事聊天室入口" });
	return false;
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
	if (!b) return;
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
	if (!b) return;
	b.insertBefore(a, b.childNodes[0]);
}

function setAvatarVideo_Func(videoUrl, videoReplayUrl) {
	const submitDom = document.getElementById("Ex_VideoSubmit");
	if (submitDom) {
		submitDom.addEventListener("click", () => {
			openPage(videoUrl, true);
		});
	}

	const reviewDom = document.getElementById("Ex_VideoReview");
	if (reviewDom) {
		reviewDom.addEventListener("click", () => {
			openPage(videoReplayUrl, true);
		});
	}

	const yubaDom = document.getElementById("Ex_EnterYuba");
	if (yubaDom) {
		yubaDom.addEventListener("click", async () => {
			const data = await getBindYuba(rid);
			const url = data.data.group_url;
			openPage(url, true);
		});
	}
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
