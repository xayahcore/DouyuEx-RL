const MONTH_COST_CACHE_KEY = "ExSave_MonthCost";
const MONTH_COST_SEE_STATUS_KEY = "ExSave_MonthCost_SeeStatus";

let totalMonthCost = 0;
let typeDetail = [];
// 明细接口返回 error=1000（限流）时的最大重试次数：旧实现是无上限重试，
// 一直限流就一直 2 秒一次地打同一个接口，面板的「加载中」永不结束。
const MONTH_COST_MAX_RETRY = 3;

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
	if (seeStatus === 1) {
		MonthCost_updateCost();
	}
}

function initPkg_MonthCost_Dom() {
	MonthCost_insertIcon();
}

function MonthCost_insertIcon() {
	let a = document.createElement("span");
	a.className = "month-cost";
	a.innerHTML = `
	本月消费 <span id="monthcost__money">***</span> 元
	<span class="monthcost__icon"></span>
	`;
	a.title = "数据每日更新，根据个人中心消费数据统计"
	let b = getValidDom(["#js-backpack-enter"]);
	let parent = b ? b.parentElement : null;
	if (!parent) {
		// 背包入口没渲染：入口图标就插不进去，用户侧表现为「这个功能整个没有」。
		// 旧实现是静默的，现场完全无痕；这里留一条可定位的线索。
		if (typeof ExGuard_warn === "function") ExGuard_warn("本月消费", "没找到背包入口，本月消费入口本次不显示");
		return false;
	}
	parent.insertBefore(a, parent.childNodes[0]);
	return true;
}

function initPkg_MonthCost_Func() {
	const iconDom = MonthCost_getIconDom();
	if (!iconDom) return;
	iconDom.addEventListener("click", () => {
		seeStatus = seeStatus === 1 ? 0 : 1;
		MonthCost_saveSeeStatus();
		MonthCost_renderSeeStatus();
		if (seeStatus === 1) MonthCost_updateCost();
	});
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
