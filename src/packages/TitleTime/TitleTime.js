/* ==================== 标题栏「观看时间 / 开播时间」（2026-10-27 从「本月消费」左侧滚动条搬来） ====================
 * 用户反馈：两项数据挤在「本月消费」左边滚动显示，和金额混在一起既难读又容易被忽略，
 * 要求搬到标题栏「复制直播流」右边 —— 那一行本来就是直播间的元信息区。
 *
 * 数据口径与横条时代逐字一致（只是换了位置，不许改口径）：
 *   观看时间 ← 官方 fsjk/getCardTaskInfo 的 data.todayWatch（需登录，只代表本人）
 *   开播时间 ← h5room 的 show_time / show_status（斗鱼自有接口，从未停服）
 * 取不到写「—」、未开播写「未开播」：绝不拿 0 或估算值假装有数字。
 */
const TITLE_TIME_REFRESH_MS = 150000;       // 与横条 / 滚动条时代一致：150 秒刷一次
const TITLE_TIME_POLL_INTERVAL_MS = 500;    // 标题栏晚渲染时每 500ms 看一次
const TITLE_TIME_POLL_MAX_TRIES = 20;       // 最多 20 次（约 10 秒）就放弃，不做无限轮询
const TITLE_TIME_WAIT_TAG = "标题栏观看时间";

// h5room 取到过什么 / fsjk 取到过什么。watchOk 为 false 时界面写「—」（未登录或接口失败）
let titleTimeState = {
	showinfo: false,   // h5room 是否成功返回过
	isShow: 2,         // 2 = 未开播
	showtime: 0,       // 开播时间戳（秒）
	watchOk: false,    // 今日观看时长是否取到
	watchSeconds: 0
};
let titleTimeBooted = false;       // 刷新表只允许挂一份（重复 init 不叠表）
let titleTimeBusy = false;         // 防重入：上一轮没回来就不再叠一轮
let titleTimeTicks = 0;            // 刷新轮次（决定这一轮要不要复查开播信息）
let titleTimePoll = null;          // 正在进行的等待（有上限）：只留一条，且它结束后可以重新等

/** 包入口：能插就插，插不上交给有上限的等待（标题栏是异步渲染的） */
function initPkg_TitleTime() {
	if (TitleTime_insert()) return;
	TitleTime_waitAnchor();
}

/** 锚点 =「复制直播流」那个节点（CopyRealLive 插进 .Title-col 的 #copy-real-live） */
function TitleTime_findAnchor() {
	return document.getElementById("copy-real-live");
}

/** 建节点：整块带 Title-blockInline，沿用标题栏自己的排版（行内、垂直居中） */
function TitleTime_buildNode() {
	const node = document.createElement("div");
	node.className = "ex-title-time Title-blockInline";
	// 两个子元素各带前缀「观看时间」「开播时间」；宽度不够时由 CSS 对每一项出省略号
	node.innerHTML =
		'<span class="ex-title-time__item" data-title-time="watch">观看时间 <span class="ex-title-time__value">—</span></span>' +
		'<span class="ex-title-time__item" data-title-time="start">开播时间 <span class="ex-title-time__value">—</span></span>';
	return node;
}

/**
 * 插到「复制直播流」紧邻的下一兄弟位（同一父节点）。返回 true = 已经在位。
 * 幂等：全文只留一份（先找已有节点并搬到位），重复 init 不会插出两份。
 */
function TitleTime_insert() {
	const anchor = TitleTime_findAnchor();
	const parent = anchor ? anchor.parentNode : null;
	if (!parent) return false;
	let node = document.querySelector(".ex-title-time");
	if (!node) node = TitleTime_buildNode();
	// 位置不对（首次插入 / 换版式后节点落在别处）就搬过去；已经在位则不重复搬动
	if (node.parentNode !== parent || anchor.nextElementSibling !== node) {
		parent.insertBefore(node, anchor.nextSibling);
	}
	TitleTime_render();
	// 只有真的插到位才挂刷新表，否则节点还没有，表挂上也只是空转
	TitleTime_boot();
	return true;
}

/**
 * 锚点还没渲染出来时的有上限等待：ExGuard_pollFor 在就用它（自带放弃留痕），
 * 不在就退回等价的 setTimeout 版本 —— 两条路都是 20 次 × 500ms，绝不死循环。
 */
function TitleTime_waitAnchor() {
	// 上一次等待还没结束就不再叠一条；已经结束（命中或放弃）则允许重新等 ——
	// 斗鱼是单页应用，换房间/换版式会再走一次初始化，卡死在第一轮的等待会让功能永久缺席。
	if (titleTimePoll && !titleTimePoll.done) return true;
	const onFound = function () {
		titleTimePoll = null;
		TitleTime_insert();
	};
	if (typeof ExGuard_pollFor === "function") {
		titleTimePoll = ExGuard_pollFor(TitleTime_findAnchor, onFound, {
			intervalMs: TITLE_TIME_POLL_INTERVAL_MS,
			maxTries: TITLE_TIME_POLL_MAX_TRIES,
			tag: TITLE_TIME_WAIT_TAG
		});
		return true;
	}
	titleTimePoll = TitleTime_pollByTimer(onFound);
	return true;
}

/** ExGuard 不可用时的等价兜底：同样有次数上限，等不到留一条自证信息 */
function TitleTime_pollByTimer(onFound) {
	// 返回与 ExGuard_pollFor 同形的状态对象（done / cancel），调用方按同一个口径判断要不要重新等
	const state = { done: false, cancelled: false, tries: 0, timer: 0 };
	state.cancel = function () {
		state.cancelled = true;
		state.timer = 0;
	};
	const tick = function () {
		if (state.cancelled || state.done) return;
		if (TitleTime_findAnchor()) {
			state.done = true;
			onFound();
			return;
		}
		state.tries++;
		if (state.tries >= TITLE_TIME_POLL_MAX_TRIES) {
			state.done = true;
			if (typeof ExGuard_warn === "function") {
				ExGuard_warn(TITLE_TIME_WAIT_TAG,
					"等待「复制直播流」入口 " + Math.round((TITLE_TIME_POLL_INTERVAL_MS * TITLE_TIME_POLL_MAX_TRIES) / 1000) +
					" 秒仍未出现，已放弃（不影响其它功能）");
			}
			return;
		}
		state.timer = setTimeout(tick, TITLE_TIME_POLL_INTERVAL_MS);
	};
	tick();
	return state;
}

/** 开播时刻：栏里只写「月-日 时:分」（再长就只剩噪音），悬停标题里给完整年月日 */
function TitleTime_formatShowTime(showtime, fmt) {
	const ts = Number(showtime);
	if (!ts) return "";
	const date = new Date(ts * 1000);
	if (isNaN(date.getTime())) return "";
	return dateFormat(fmt || "MM-dd hh:mm", date);
}

/** 刷新界面。节点可能被站点重渲染掉，这里每次重新取，取不到就安静返回 */
function TitleTime_render() {
	const node = document.querySelector(".ex-title-time");
	if (!node) return false;
	const state = titleTimeState;
	const watchText = state.watchOk ? formatSeconds(state.watchSeconds) : "—";
	let startText = "—";      // 栏里的短格式（月-日 时:分）
	let startFull = "—";      // 悬停用的完整年月日
	if (state.showinfo) {
		if (state.isShow === 2) {
			startText = "未开播";
			startFull = "未开播";
		} else {
			startText = TitleTime_formatShowTime(state.showtime) || "—";
			startFull = TitleTime_formatShowTime(state.showtime, "yyyy-MM-dd hh:mm") || "—";
		}
	}
	const watchItem = node.querySelector('[data-title-time="watch"]');
	const startItem = node.querySelector('[data-title-time="start"]');
	if (watchItem) {
		const value = watchItem.querySelector(".ex-title-time__value");
		if (value) value.textContent = watchText;
		watchItem.title = "观看时间（今日累计，官方观看任务接口，需登录）：" + watchText;
	}
	if (startItem) {
		const value = startItem.querySelector(".ex-title-time__value");
		if (value) value.textContent = startText;
		startItem.title = "开播时间：" + startFull;
	}
	// 整块也给一份完整说明：悬停落在两块之间的空隙时同样能看懂
	node.title = "观看时间（今日累计，官方观看任务接口，需登录）：" + watchText +
		"\n开播时间：" + startFull;
	return true;
}

/**
 * GET + JSON，永不 reject：失败收敛成 { error: -1 } 由调用方写「—」。
 * 与「本月消费」里的同名实现保持同一口径（mode / credentials / 失败兜底都一致）。
 */
function TitleTime_queryData(url) {
	return new Promise(resolve => {
		fetch(url, {
			method: 'GET',
			mode: 'no-cors',
			credentials: 'include',
		}).then(res => {
			return res.json();
		}).then(ret => {
			resolve(ret);
		}).catch(() => {
			resolve({ error: -1, data: null });
		});
	})
}

/** 开播时间 / 开播状态：h5room（斗鱼自有接口，与已停服的数据站无关）；取不到返回 null */
async function TitleTime_queryShowInfo() {
	const ret = await TitleTime_queryData("https://www.douyu.com/swf_api/h5room/" + rid);
	const data = (ret && ret.data) || null;
	if (!data || data.show_time === undefined || data.show_time === null) return null;
	return data;
}

/** 今日观看时长：官方 fsjk 接口；失败 / 未登录时 error 不为 0，由调用方写「—」 */
function TitleTime_queryTodayWatch() {
	return TitleTime_queryData("https://www.douyu.com/japi/interactnc/web/fsjk/getCardTaskInfo?rid=" + rid);
}

/**
 * 刷新两项数据。两个请求都走 TitleTime_queryData（永不 reject），
 * 任何一项失败只丢该项这一轮，界面继续显示「—」，绝不把异常抛进 150 秒定时器里。
 */
function TitleTime_refresh() {
	if (titleTimeBusy) return;
	titleTimeBusy = true;
	titleTimeTicks++;
	// 开播信息每场直播基本不变：首轮取一次；未开播的房每轮都看（要靠它发现「开播了」）；
	// 开播中的房每 10 轮（约 25 分钟）复查一次 —— 不必每 150 秒都去拉一次房间信息。
	const needShowInfo = !titleTimeState.showinfo ||
		titleTimeState.isShow === 2 ||
		titleTimeTicks % 10 === 1;
	Promise.resolve()
		.then(function () {
			return needShowInfo ? TitleTime_queryShowInfo() : null;
		})
		.then(function (showInfo) {
			if (showInfo) {
				titleTimeState.showinfo = true;
				titleTimeState.showtime = Number(showInfo.show_time) || 0;
				titleTimeState.isShow = showInfo.show_status === undefined ? 2 : Number(showInfo.show_status);
			}
			return TitleTime_queryTodayWatch();
		})
		.then(function (ret) {
			titleTimeState.watchOk = !!(ret && ret.error == 0 && ret.data && ret.data.todayWatch !== undefined);
			if (titleTimeState.watchOk) {
				titleTimeState.watchSeconds = Number(ret.data.todayWatch) || 0;
			}
		})
		.catch(function () {
			// 兜底：两个请求本身不会 reject，这里只防未来改动把异常漏进定时器
		})
		.then(function () {
			titleTimeBusy = false;
			TitleTime_render();
		});
}

/** 启动刷新：先拉一轮（首帧仍显示占位符），之后每 150 秒一次；定时器只挂一份 */
function TitleTime_boot() {
	if (titleTimeBooted) return false;
	titleTimeBooted = true;
	TitleTime_refresh();
	setInterval(TitleTime_refresh, TITLE_TIME_REFRESH_MS);
	return true;
}
