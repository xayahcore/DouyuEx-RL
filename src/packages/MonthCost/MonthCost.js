const MONTH_COST_CACHE_KEY = "ExSave_MonthCost";
const MONTH_COST_SEE_STATUS_KEY = "ExSave_MonthCost_SeeStatus";

let totalMonthCost = 0;
let typeDetail = [];
// 明细接口返回 error=1000（限流）时的最大重试次数：旧实现是无上限重试，
// 一直限流就一直 2 秒一次地打同一个接口，面板的「加载中」永不结束。
const MONTH_COST_MAX_RETRY = 3;

/* ==================== 观看时间 / 开播时间（2026-10-27 从右上角横条搬来） ====================
 * 右上角统计条整条撤下（数据站停服后只剩一个贵宾数，用户判定无意义），
 * 但两项本机算得出来的数据没有丢，搬到「本月消费」左侧滚动显示：
 *   观看时间 ← 官方 fsjk/getCardTaskInfo（需登录，只代表本人；字段 todayWatch）
 *   开播时间 ← h5room 的 show_time（斗鱼自有接口，从未停服）
 * 口径与横条时代一致：取不到就写「—」，绝不拿 0 或估算值假装有数字。
 */
const MONTH_COST_TICKER_INTERVAL = 150000; // 与横条时代的刷新节奏一致：150 秒一次
const MONTH_COST_TICKER_SPEED = 40;        // 滚动速度 px/s：慢一点，滚过去也读得清
let monthCostTickerState = {
	showinfo: false,   // h5room 是否成功返回过
	isShow: 2,         // 2 = 未开播
	showtime: 0,       // 开播时间戳（秒）
	watchOk: false,    // 今日观看时长是否取到
	watchSeconds: 0
};
let monthCostTickerBooted = false; // 刷新定时器只允许挂一次
let monthCostTickerBusy = false;   // 防重入：上一轮没回来就不再叠一轮
let monthCostTickerTicks = 0;      // 刷新轮次（决定这一轮要不要复查开播信息）

let svg_see = `<svg t="1619141525444" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4635" width="16" height="16" style="/* display: inline-block; */"><path d="M1009.592 531.212C863.184 730.624 696.96 832 512 832c-184.96 0-351.184-101.376-497.592-300.788C10.384 525.864 8 519.212 8 512s2.384-13.864 6.408-19.212C160.816 293.376 327.04 192 512 192c184.96 0 351.184 101.376 497.592 300.788 4.024 5.348 6.408 12 6.408 19.212s-2.384 13.864-6.408 19.212zM512 768c156.864 0 300.54-84.332 432.012-256C812.54 340.332 668.864 256 512 256c-156.864 0-300.54 84.332-432.012 256C211.46 683.668 355.136 768 512 768z m0-64c-106.04 0-192-85.96-192-192s85.96-192 192-192 192 85.96 192 192-85.96 192-192 192z m0-64c70.692 0 128-57.308 128-128s-57.308-128-128-128-128 57.308-128 128 57.308 128 128 128z" p-id="4636" fill="#707070"></path></svg>`;
let svg_unsee = `<svg t="1619143157694" class="icon" viewBox="0 0 1186 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1733" width="16" height="16"><path d="M591.707784 915.740462A642.870487 642.870487 0 0 1 2.965954 526.459025a39.298888 39.298888 0 0 1 0-28.91805 632.489649 632.489649 0 0 1 584.292899-388.539948h8.897862a630.265183 630.265183 0 0 1 584.292899 388.539948 39.298888 39.298888 0 0 1 0 28.91805 637.680068 637.680068 0 0 1-336.635757 337.377245 646.577929 646.577929 0 0 1-252.106073 51.904192zM77.856287 512.370744a565.755688 565.755688 0 0 0 1026.961505 0 556.116338 556.116338 0 0 0-508.661077-329.220872h-8.897862a556.857827 556.857827 0 0 0-509.402566 329.220872z" p-id="1734" fill="#707070"></path><path d="M590.966296 732.592814a218.739093 218.739093 0 1 1 222.446535-218.739093 218.739093 218.739093 0 0 1-222.446535 218.739093z m0-362.587852a144.590248 144.590248 0 1 0 148.29769 143.848759 148.29769 148.29769 0 0 0-148.29769-143.848759z" p-id="1735" fill="#707070"></path><path d="M1137.443284 1023.997776a37.074423 37.074423 0 0 1-24.469119-8.897862L20.761677 65.253208A37.074423 37.074423 0 0 1 68.958426 8.900086l1092.212489 946.880752a37.074423 37.074423 0 0 1 0 52.64568 35.591446 35.591446 0 0 1-23.727631 15.571258z" p-id="1736" fill="#707070"></path></svg>`;

let seeStatus = 0;

function MonthCost_getContainerDom() {
	return document.getElementsByClassName("month-cost")[0];
}

function MonthCost_getMoneyDom() {
	return document.getElementById("monthcost__money");
}

function MonthCost_getIconDom() {
	return document.getElementsByClassName("monthcost__icon")[0];
}

function MonthCost_getTickerDom() {
	return document.getElementsByClassName("monthcost__ticker")[0];
}

function MonthCost_getTickerTrackDom() {
	return document.getElementsByClassName("monthcost__ticker-track")[0];
}

function MonthCost_renderSeeStatus() {
	const iconDom = MonthCost_getIconDom();
	const moneyDom = MonthCost_getMoneyDom();
	if (!iconDom || !moneyDom) return;
	if (seeStatus === 1) {
		iconDom.innerHTML = svg_see;
	} else {
		moneyDom.innerText = "***";
		iconDom.innerHTML = svg_unsee;
	}
	MonthCost_ContentAttrTitle();
}

function initPkg_MonthCost() {
	initPkg_MonthCost_Dom();
	initPkg_MonthCost_Func();
	seeStatus = MonthCost_getSeeStatus();
	MonthCost_renderSeeStatus();
	MonthCost_bootTicker();
	if (seeStatus === 1) {
		MonthCost_updateCost();
	}
}

/*
 * 插入锚点：背包入口在不同版式里有三种写法；三种都没有时退到工具栏单元格。
 * 旧实现只认 #js-backpack-enter 一个固定锚点 —— 页面版式一变（或者用户装了清理类扩展），
 * 「本月消费」整块静默消失、连一条日志都没有，用户根本无从自证。
 */
const MONTH_COST_ANCHOR_SELECTORS = [
	"#js-backpack-enter",
	".BackpackButton",
	".PlayerToolbar-ContentRow .PlayerToolbar-ContentCell"
];
let monthCostAnchorWaiting = false;

function MonthCost_findAnchor() {
	return getValidDom(MONTH_COST_ANCHOR_SELECTORS);
}

function initPkg_MonthCost_Dom() {
	if (!MonthCost_insertIcon()) MonthCost_waitAnchor();
}

/** 插一次入口图标（幂等）。返回 true = 图标已在位 */
function MonthCost_insertIcon() {
	if (document.querySelector(".month-cost")) {
		MonthCost_bindIconClick();
		MonthCost_renderTicker();
		return true;
	}
	let a = document.createElement("span");
	a.className = "month-cost";
	/* 观看时间 / 开播时间在最左侧滚动（横条撤下后搬过来的）；
	   两份副本由 MonthCost_renderTicker 填，track 里先留空壳。 */
	a.innerHTML = `
	<span class="monthcost__ticker"><span class="monthcost__ticker-track"></span></span>
	本月消费 <span id="monthcost__money">***</span> 元
	<span class="monthcost__icon"></span>
	`;
	a.title = "数据每日更新，根据个人中心消费数据统计"
	const anchor = MonthCost_findAnchor();
	const parent = anchor ? anchor.parentElement : null;
	if (!parent) return false;
	parent.insertBefore(a, parent.childNodes[0]);
	MonthCost_bindIconClick();
	MonthCost_renderTicker();
	return true;
}

/**
 * 锚点还没渲染出来时的有上限等待（版式变化 / 工具栏晚渲染）：
 * 等到了就把图标插上并绑定点击；等不到由 ExGuard 留一条「等了多少秒、已放弃」。
 */
function MonthCost_waitAnchor() {
	if (monthCostAnchorWaiting) return true;
	if (typeof ExGuard_pollFor !== "function") {
		if (typeof ExGuard_warn === "function") {
			ExGuard_warn("本月消费", "没找到背包入口（" + MONTH_COST_ANCHOR_SELECTORS.join(" / ") + "），本月消费入口本次不显示");
		}
		return false;
	}
	monthCostAnchorWaiting = true;
	ExGuard_pollFor(MonthCost_findAnchor, function () {
		monthCostAnchorWaiting = false;
		MonthCost_insertIcon();
	}, { intervalMs: 500, maxTries: 20, tag: "本月消费" });
	return true;
}

/** 点击绑定（幂等）：图标可能晚到，绑定不能只在初始化那一次做 */
function MonthCost_bindIconClick() {
	const iconDom = MonthCost_getIconDom();
	if (!iconDom || iconDom.dataset.exClickBound === "1") return false;
	iconDom.dataset.exClickBound = "1";
	iconDom.addEventListener("click", () => {
		seeStatus = seeStatus === 1 ? 0 : 1;
		MonthCost_saveSeeStatus();
		MonthCost_renderSeeStatus();
		if (seeStatus === 1) MonthCost_updateCost();
	});
	return true;
}

function initPkg_MonthCost_Func() {
	MonthCost_bindIconClick();
}

/* -------------------- 观看时间 / 开播时间：左侧滚动条 -------------------- */

/** 开播时刻：滚动条里只写「月-日 时:分」（再长就只剩噪音），悬停标题里给完整年月日 */
function MonthCost_formatShowTime(showtime, fmt) {
	const ts = Number(showtime);
	if (!ts) return "";
	const date = new Date(ts * 1000);
	if (isNaN(date.getTime())) return "";
	return dateFormat(fmt || "MM-dd hh:mm", date);
}

function MonthCost_tickerText() {
	const state = monthCostTickerState;
	const watchText = state.watchOk ? formatSeconds(state.watchSeconds) : "—";
	let startText = "—";
	if (state.showinfo) {
		startText = state.isShow === 2 ? "未开播" : (MonthCost_formatShowTime(state.showtime) || "—");
	}
	return "已观看:" + watchText + "    开播:" + startText;
}

function MonthCost_tickerTitle() {
	const state = monthCostTickerState;
	const watchText = state.watchOk ? formatSeconds(state.watchSeconds) : "—";
	let startText = "—";
	if (state.showinfo) {
		startText = state.isShow === 2 ? "未开播" : (MonthCost_formatShowTime(state.showtime, "yyyy-MM-dd hh:mm") || "—");
	}
	return "观看时间（今日累计，官方观看任务接口，需登录）:" + watchText +
		"\n开播时间:" + startText;
}

/**
 * 滚动（跑马灯）：真正溢出时才滚，放得下就静态停住 —— 不为「动」而把短文本来回抽。
 * 无缝靠「两份完全相同的副本 + translateX(-50%)」：滚过一整份时画面正好回到起点。
 * jsdom / 隐藏容器里量不到宽度（0）时按「不滚」处理，不除零、不抛错。
 */
function MonthCost_tickerAnimate(wrap, track, copies) {
	const boxWidth = wrap.clientWidth;
	const copyWidth = copies[0].offsetWidth;
	if (!copyWidth || !boxWidth || copyWidth <= boxWidth) {
		copies[1].style.display = "none";
		track.style.animation = "";
		return false;
	}
	copies[1].style.display = "";
	const seconds = Math.max(6, Math.round(copyWidth / MONTH_COST_TICKER_SPEED));
	const animation = "monthcost-ticker " + seconds + "s linear infinite";
	if (track.style.animation !== animation) track.style.animation = animation;
	return true;
}

function MonthCost_renderTicker() {
	const wrap = MonthCost_getTickerDom();
	const track = MonthCost_getTickerTrackDom();
	if (!wrap || !track) return false;
	let copies = track.getElementsByClassName("monthcost__ticker-copy");
	if (copies.length < 2) {
		track.innerHTML = '<span class="monthcost__ticker-copy"></span><span class="monthcost__ticker-copy"></span>';
		copies = track.getElementsByClassName("monthcost__ticker-copy");
	}
	const text = MonthCost_tickerText();
	for (let i = 0; i < copies.length; i++) copies[i].textContent = text;
	wrap.title = MonthCost_tickerTitle();
	return MonthCost_tickerAnimate(wrap, track, copies);
}

/** 开播时间 / 开播状态：h5room（斗鱼自有接口，与已停服的数据站无关）；取不到返回 null */
async function MonthCost_queryShowInfo() {
	const ret = await MonthCost_queryData("https://www.douyu.com/swf_api/h5room/" + rid);
	const data = (ret && ret.data) || null;
	if (!data || data.show_time === undefined || data.show_time === null) return null;
	return data;
}

/** 今日观看时长：官方 fsjk 接口；失败 / 未登录时 error 不为 0，由调用方写「—」 */
function MonthCost_queryTodayWatch() {
	return MonthCost_queryData("https://www.douyu.com/japi/interactnc/web/fsjk/getCardTaskInfo?rid=" + rid);
}

/**
 * 刷新两项数据。两个请求都走 MonthCost_queryData（永不 reject），
 * 任何一项失败只丢该项这一轮，界面继续显示「—」，绝不把异常抛进 150 秒定时器里。
 */
function MonthCost_refreshTicker() {
	if (monthCostTickerBusy) return;
	monthCostTickerBusy = true;
	monthCostTickerTicks++;
	// 开播信息每场直播基本不变：首轮取一次；未开播的房每轮都看（要靠它发现"开播了"）；
	// 开播中的房每 10 轮（约 25 分钟）复查一次 —— 不必每 150 秒都去拉一次房间信息。
	const needShowInfo = !monthCostTickerState.showinfo ||
		monthCostTickerState.isShow === 2 ||
		monthCostTickerTicks % 10 === 1;
	Promise.resolve()
		.then(function () {
			return needShowInfo ? MonthCost_queryShowInfo() : null;
		})
		.then(function (showInfo) {
			if (showInfo) {
				monthCostTickerState.showinfo = true;
				monthCostTickerState.showtime = Number(showInfo.show_time) || 0;
				monthCostTickerState.isShow = showInfo.show_status === undefined ? 2 : Number(showInfo.show_status);
			}
			return MonthCost_queryTodayWatch();
		})
		.then(function (ret) {
			monthCostTickerState.watchOk = !!(ret && ret.error == 0 && ret.data && ret.data.todayWatch !== undefined);
			if (monthCostTickerState.watchOk) {
				monthCostTickerState.watchSeconds = Number(ret.data.todayWatch) || 0;
			}
		})
		.catch(function () {
			// 兜底：两个请求本身不会 reject，这里只防未来改动把异常漏进定时器
		})
		.then(function () {
			monthCostTickerBusy = false;
			MonthCost_renderTicker();
		});
}

/**
 * 启动滚动条：先按现有状态渲染一次（首帧是「已观看:—  开播:—」），
 * 再拉一轮数据，之后每 150 秒刷一次。定时器只挂一次 —— 重复调用只重渲染，不叠表。
 */
function MonthCost_bootTicker() {
	MonthCost_renderTicker();
	if (monthCostTickerBooted) return;
	monthCostTickerBooted = true;
	MonthCost_refreshTicker();
	setInterval(MonthCost_refreshTicker, MONTH_COST_TICKER_INTERVAL);
}


function MonthCost_saveSeeStatus() {
	localStorage.setItem(MONTH_COST_SEE_STATUS_KEY, String(seeStatus));
}

function MonthCost_getSeeStatus() {
	let storage = localStorage.getItem(MONTH_COST_SEE_STATUS_KEY);
	if (storage == null) return 0;
	return Number(storage) === 1 ? 1 : 0;
}

function MonthCost_queryData(url) {
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
			resolve({ error: -1, data: [] });
		});
    })
}


async function getMonthCost_gift() {
	const [start, end] = getMonthTimeRange();
	const [formattedStart, formattedEnd] = getFormattedMonthTimeRange();
	const direction = 1;
	let data = [];
	let hasMoreData = true;
	let id = 0;
	let retry = 0;

	while (hasMoreData) {
		let url = `https://www.douyu.com/wjapi/nc/exchange/consume/giftList?queryType=0&consumeType=0&startDate=${start}&endDate=${end}&tradeStartDate=${formattedStart}&tradeEndDate=${formattedEnd}&direction=${direction}`;
		if (id !== 0) {
			url += `&id=${id}`;
		}
		
			let ret = await MonthCost_queryData(url);
		if (ret.error == 1000) {
			// 旧实现在这里对同一个 url 无限重试：服务端一直限流就一直 2 秒一次地打下去，
			// 面板上的「加载中」永远不结束。现在最多重试 MONTH_COST_MAX_RETRY 次，到点收尾并留痕。
			if (retry >= MONTH_COST_MAX_RETRY) {
				if (typeof ExGuard_warn === "function") {
					ExGuard_warn("本月消费", "消费明细接口连续返回限流（1000），已重试 " + retry + " 次，本次按已取到的数据统计");
				}
				hasMoreData = false;
				break;
			}
			retry++;
			await new Promise(resolve => setTimeout(resolve, 2000));
			continue;
		}
		retry = 0;
		let nextData = (ret && ret.data) || [];
		if (!Array.isArray(nextData)) nextData = [];
		data = data.concat(nextData);
		if (nextData.length < 20) {
			hasMoreData = false;
		} else {
			const lastItem = nextData[nextData.length - 1];
			// 末条是 null / 没有 id 时无法翻页：旧实现 nextData[last].id 直接 TypeError，
			// 抛出点又在 async 函数里 = 未捕获的 rejection，金额永远停在「加载中」。
			if (!lastItem || lastItem.id == null) {
				if (typeof ExGuard_warn === "function") ExGuard_warn("本月消费", "消费明细末条缺少 id，无法继续翻页，本次按已取到的数据统计");
				hasMoreData = false;
			} else {
				id = lastItem.id;
			}
		}
	}

	let categorizedData = {};
	let skipped = 0;
	for (const item of data) {
		// 列表里混进 null / 缺字段时旧实现 item.amount 直接 TypeError，
		// 抛出点仍在 async 链里，界面就永远停在「加载中」。
		if (!item || item.amount == null) {
			skipped++;
			continue;
		}
		let money = Math.abs(Number(item.amount));
		if (!isFinite(money)) {
			skipped++;
			continue;
		}
		totalMonthCost += money;
		let key = item.consumeTypeDesc || "其他";
		if (!categorizedData[key]) categorizedData[key] = 0;
		categorizedData[key] += money;
	}
	if (skipped > 0 && typeof ExGuard_warn === "function") {
		ExGuard_warn("本月消费", "有 " + skipped + " 条消费记录结构不完整，已跳过");
	}

	for (let title in categorizedData) {
		typeDetail.push({ title, money: categorizedData[title] });
	}

}

async function getMonthCost_diamondFans() {
	let type = 0;
	let page = 1;
	let data = [];
	let hasMoreData = true;
	let now = new Date();
	let nowMonth = now.getMonth();
	let nowYear = now.getFullYear();

	while (hasMoreData) {
		let url = `https://www.douyu.com/japi/interactnc/web/dFansbadge/myLogs?type=${type}&page=${page}`;
		let ret = await MonthCost_queryData(url);
		let list = (((ret || {}).data || {}).list) || [];
		if (!Array.isArray(list)) list = [];
		for (const item of list) {
			if (!item || item.consumeTime == null) continue; // 缺时间戳的记录直接跳过，别让整页作废
			let consumeDate = new Date(item.consumeTime * 1000);
			if (isNaN(consumeDate.getTime())) continue;
			if (consumeDate.getMonth() === nowMonth && consumeDate.getFullYear() === nowYear) {
				data.push(item);
			}
		}
		const lastRaw = list[list.length - 1];
		if (!lastRaw || lastRaw.consumeTime == null) break;
		let lastItemDate = new Date(lastRaw.consumeTime * 1000);
		if (isNaN(lastItemDate.getTime())) break;
		if (list.length < 20 || lastItemDate.getMonth() !== nowMonth || lastItemDate.getFullYear() !== nowYear) {
			hasMoreData = false;
		} else {
			page++;
		}
	}

	let diamondFansMoney = 0;
	for (const item of data) {
		if (!item || item.consumeMoney == null) continue;
		const money = Math.abs(Number(item.consumeMoney));
		if (!isFinite(money)) continue;
		diamondFansMoney += money;
	}
	if (diamondFansMoney > 0) {
		typeDetail.push({ title: "钻粉充值/续费", money: diamondFansMoney });
	}
	totalMonthCost += diamondFansMoney;
}

async function getMonthCost() {
	totalMonthCost = 0;
	typeDetail = [];
	await getMonthCost_gift();
	await getMonthCost_diamondFans();
	MonthCost_saveData();
	MonthCost_ContentAttrTitle();
	let moneyDom = MonthCost_getMoneyDom();
	if (moneyDom) moneyDom.innerText = String(totalMonthCost / 100);
}

function MonthCost_ContentAttrTitle(){
	let containerDom = MonthCost_getContainerDom();
	if (!containerDom) return;
	if (seeStatus === 1 && typeDetail.length > 0) {
		let titleContent = "数据每日更新，根据个人中心消费数据统计。\n--- ---\n";
		typeDetail.forEach(detail => {
			titleContent += `${detail.title}: ${String(detail.money / 100)} 元\n`;
		});
		containerDom.title = titleContent;
	} else {
		containerDom.title = "数据每日更新，根据个人中心消费数据统计。";
	}
}

function getFormattedMonthTimeRange() {
	let now = new Date();
	let nowMonth = now.getMonth();
	let nowYear = now.getFullYear();
	let monthStartDate = new Date(nowYear, nowMonth, 1);

	let formatDate = (date) => {
		let year = date.getFullYear();
		let month = (date.getMonth() + 1).toString().padStart(2, '0');
		let day = date.getDate().toString().padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	return [formatDate(monthStartDate), formatDate(now)];
}

function getMonthTimeRange() {
	let now = new Date();
    let nowMonth = now.getMonth();
    let nowYear = now.getFullYear(); 
    let monthStartDate = new Date(nowYear, nowMonth, 1); 
	return [Math.round(new Date(monthStartDate).getTime() / 1000).toString(), Math.round(now.getTime() / 1000).toString()];
}

function MonthCost_saveData() {
	let data = {
		monthCost: totalMonthCost,
		updateTime: new Date().getTime(),
		typeDetail: typeDetail 
	}
	let storage = localStorage.getItem(MONTH_COST_CACHE_KEY);
	if (storage !== null) {
		try {
			storage = JSON.parse(storage);
		} catch (e) {
			storage = {};
		}
	} else {
		storage = {};
	}
	storage[my_uid] = data;
	localStorage.setItem(MONTH_COST_CACHE_KEY, JSON.stringify(storage));
}

function MonthCost_getData() {
	let storage = localStorage.getItem(MONTH_COST_CACHE_KEY);
	if (storage !== null) {
		try {
			storage = JSON.parse(storage);
		} catch (e) {
			storage = {};
		}
	} else {
		storage = {};
	}
	return storage;
}

/**
 * 缓存是否已经过期（跨过自然日边界）。
 *
 * 旧实现用「日期号相减」判断：Math.abs(new Date().getDate() - new Date(updateTime).getDate())，
 * 于是 10-05 → 11-05 差 0（**永不刷新**，月初到现在都不更新），
 * 10-31 → 11-01 差 30（每次进房都重刷一遍）。
 * 现在按年月日三元组比较：只有「就是今天」才算新鲜，其余一律刷新。
 */
function MonthCost_isStale(updateTime, now) {
	const cached = updateTime ? new Date(updateTime) : null;
	if (!cached || isNaN(cached.getTime())) return true; // 没有/坏掉的缓存时间戳 = 必须刷新
	const today = now || new Date();
	return !(cached.getFullYear() === today.getFullYear()
		&& cached.getMonth() === today.getMonth()
		&& cached.getDate() === today.getDate());
}

function MonthCost_updateCost() {
	if (seeStatus !== 1) return;
	let timeDiff = 1;
	let tmpCost = 0;
	let tmpTypeDetail = [];

	let storage = MonthCost_getData();
	if (my_uid in storage) {
		let item = storage[my_uid] || {};
		timeDiff = MonthCost_isStale(item.updateTime) ? 1 : 0;
		tmpCost = Number(item.monthCost) || 0;
		tmpTypeDetail = Array.isArray(item.typeDetail) ? item.typeDetail : [];
		let moneyDom = MonthCost_getMoneyDom();
		if (moneyDom) moneyDom.innerText = String(tmpCost / 100);
		typeDetail = tmpTypeDetail;
		MonthCost_ContentAttrTitle();
	}else{
		let moneyDom = MonthCost_getMoneyDom();
		if (moneyDom) moneyDom.innerHTML = `<span class="PlayerToolbar-dataLoadding"></span>`;
	}

	if (timeDiff >= 1) {
		MonthCost_refreshCost();
	}
}

/**
 * 刷新本月消费（统一出口）。
 * 旧实现在这里直接 getMonthCost()：它是 async，一旦中间抛错就成了未捕获的 rejection，
 * 而「加载中」占位符（PlayerToolbar-dataLoadding）是被替换进 moneyDom 的，
 * 只有 getMonthCost 走到最后才会被写成金额 —— 抛错就等于**永远显示加载中**。
 * 现在无论成败都会把界面收尾：成功写金额，失败写「—」并留一条自证信息。
 */
function MonthCost_refreshCost() {
	Promise.resolve()
		.then(getMonthCost)
		.catch(function (e) {
			if (typeof ExGuard_warn === "function") ExGuard_warn("本月消费", "统计数据加载失败，金额暂时无法显示", e);
			const moneyDom = MonthCost_getMoneyDom();
			if (moneyDom) moneyDom.innerText = "—";
		});
}
