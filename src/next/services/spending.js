function* (__imports) {
yield {"Do": { get: () => Do, set: value => { Do = value; } },
"Ro": { get: () => Ro, set: value => { Ro = value; } },
"findMonthlySpendingControl": { get: () => findMonthlySpendingControl, set: value => { findMonthlySpendingControl = value; } },
"loadMonthlySpending": { get: () => loadMonthlySpending, set: value => { loadMonthlySpending = value; } },
"renderMonthlySpending": { get: () => renderMonthlySpending, set: value => { renderMonthlySpending = value; } }};
/**
 * 当月消费统计与鱼翅明细感知服务
 */
const KEY_MONTH_COST = "ExSave_MonthCost";
let Do = "ExSave_MonthCost_SeeStatus"; // 导出兼容键名: 消费金额可见性开关
let Ro = 0;                             // 导出兼容状态: 0 = 隐藏掩码 (***), 1 = 正常显示

let totalMonthlyCostCents = 0;          // 当月消费累计 (单位: 分)
let spendingCategoriesList = [];        // 消费分类明细列表 [{ title: string, money: number }]

// 眼睛图标 SVG (明文与密文状态)
const EYE_OPEN_SVG = `<svg class="icon" viewBox="0 0 1024 1024" width="16" height="16"><path d="M1009.592 531.212C863.184 730.624 696.96 832 512 832c-184.96 0-351.184-101.376-497.592-300.788C10.384 525.864 8 519.212 8 512s2.384-13.864 6.408-19.212C160.816 293.376 327.04 192 512 192c184.96 0 351.184 101.376 497.592 300.788 4.024 5.348 6.408 12 6.408 19.212s-2.384 13.864-6.408 19.212zM512 768c156.864 0 300.54-84.332 432.012-256C812.54 340.332 668.864 256 512 256c-156.864 0-300.54 84.332-432.012 256C211.46 683.668 355.136 768 512 768z m0-64c-106.04 0-192-85.96-192-192s85.96-192 192-192 192 85.96 192 192-85.96 192-192 192z m0-64c70.692 0 128-57.308 128-128s-57.308-128-128-128-128 57.308-128 128 57.308 128 128 128z" fill="#707070"></path></svg>`;
const EYE_CLOSED_SVG = `<svg class="icon" viewBox="0 0 1186 1024" width="16" height="16"><path d="M591.707784 915.740462A642.870487 642.870487 0 0 1 2.965954 526.459025a39.298888 39.298888 0 0 1 0-28.91805 632.489649 632.489649 0 0 1 584.292899-388.539948h8.897862a630.265183 630.265183 0 0 1 584.292899 388.539948 39.298888 39.298888 0 0 1 0 28.91805 637.680068 637.680068 0 0 1-336.635757 337.377245 646.577929 646.577929 0 0 1-252.106073 51.904192zM77.856287 512.370744a565.755688 565.755688 0 0 0 1026.961505 0 556.116338 556.116338 0 0 0-508.661077-329.220872h-8.897862a556.857827 556.857827 0 0 0-509.402566 329.220872z" fill="#707070"></path><path d="M590.966296 732.592814a218.739093 218.739093 0 1 1 222.446535-218.739093 218.739093 218.739093 0 0 1-222.446535 218.739093z m0-362.587852a144.590248 144.590248 0 1 0 148.29769 143.848759 148.29769 148.29769 0 0 0-148.29769-143.848759z" fill="#707070"></path><path d="M1137.443284 1023.997776a37.074423 37.074423 0 0 1-24.469119-8.897862L20.761677 65.253208A37.074423 37.074423 0 0 1 68.958426 8.900086l1092.212489 946.880752a37.074423 37.074423 0 0 1 0 52.64568 35.591446 35.591446 0 0 1-23.727631 15.571258z" fill="#707070"></path></svg>`;

function getMonthCostMoneyElement() {
  return document.getElementById("monthcost__money");
}

function findMonthlySpendingControl() {
  return document.getElementsByClassName("monthcost__icon")[0];
}

/**
 * 渲染当月消费开关与金额状态
 */
function renderMonthlySpending() {
  const iconEl = findMonthlySpendingControl();
  const moneyEl = getMonthCostMoneyElement();
  if (!iconEl || !moneyEl) return;

  if (Ro === 1) {
    iconEl.innerHTML = EYE_OPEN_SVG;
    // 正常显示
  } else {
    moneyEl.innerText = "***";
    iconEl.innerHTML = EYE_CLOSED_SVG;
  }
  updateSpendingTooltip();
}

/**
 * 安全网络请求包装器
 * @param {string} url
 * @returns {Promise<object>}
 */
async function safeFetchJson(url) {
  try {
    const res = await (0, __imports.fetch)(url, {
      method: "GET",
      mode: "no-cors",
      credentials: "include"
    });
    return await res.json();
  } catch {
    return { error: -1, data: [] };
  }
}

/**
 * 分页拉取官方当月礼物消费明细
 */
async function fetchGiftConsumeHistory() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const startSec = Math.round(firstDayOfMonth.getTime() / 1000).toString();
  const endSec = Math.round(now.getTime() / 1000).toString();

  const formatDateStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const tradeStartDate = formatDateStr(firstDayOfMonth);
  const tradeEndDate = formatDateStr(now);

  const allRecords = [];
  let hasMore = true;
  let lastId = 0;

  while (hasMore) {
    let url = `https://www.douyu.com/wjapi/nc/exchange/consume/giftList?queryType=0&consumeType=0&startDate=${startSec}&endDate=${endSec}&tradeStartDate=${tradeStartDate}&tradeEndDate=${tradeEndDate}&direction=1`;
    if (lastId !== 0) {
      url += `&id=${lastId}`;
    }

    const res = await safeFetchJson(url);
    if (res.error === 1000) {
      // 频率限制，退避等待 2 秒
      await new Promise(resolve => (0, __imports.setTimeout)(resolve, 2000));
      continue;
    }

    const dataList = res?.data || [];
    allRecords.push(...dataList);

    if (dataList.length < 20) {
      hasMore = false;
    } else {
      lastId = dataList[dataList.length - 1].id;
    }
  }

  // 分类归集金额
  const categoryMap = {};
  for (const item of allRecords) {
    const amount = Math.abs(item.amount || 0);
    totalMonthlyCostCents += amount;
    const desc = item.consumeTypeDesc || "其他";
    categoryMap[desc] = (categoryMap[desc] || 0) + amount;
  }

  for (const [title, money] of Object.entries(categoryMap)) {
    spendingCategoriesList.push({ title, money });
  }
}

/**
 * 完整拉取当月礼物消费 + 钻粉充值并更新本地缓存
 */
async function calculateAndPersistMonthlySpending() {
  totalMonthlyCostCents = 0;
  spendingCategoriesList = [];
  await fetchGiftConsumeHistory();

  // 拉取钻粉消费记录
  let page = 1;
  const diamondLogs = [];
  let hasMoreDiamonds = true;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  while (hasMoreDiamonds) {
    const res = await safeFetchJson(
      `https://www.douyu.com/japi/interactnc/web/dFansbadge/myLogs?type=0&page=${page}`
    );
    const list = res?.data?.list || [];

    for (const item of list) {
      const date = new Date(item.consumeTime * 1000);
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        diamondLogs.push(item);
      }
    }

    if (!list[list.length - 1]) break;
    const lastDate = new Date(list[list.length - 1].consumeTime * 1000);

    if (list.length < 20 || lastDate.getMonth() !== currentMonth || lastDate.getFullYear() !== currentYear) {
      hasMoreDiamonds = false;
    } else {
      page++;
    }
  }

  let diamondTotal = 0;
  for (const item of diamondLogs) {
    diamondTotal += Math.abs(item.consumeMoney || 0);
  }
  if (diamondTotal > 0) {
    spendingCategoriesList.push({ title: "钻粉充值/续费", money: diamondTotal });
    totalMonthlyCostCents += diamondTotal;
  }

  // 写入本地持久化存储
  const record = {
    monthCost: totalMonthlyCostCents,
    updateTime: Date.now(),
    typeDetail: spendingCategoriesList
  };

  let storeObj = {};
  const saved = __imports.localStorage.getItem(KEY_MONTH_COST);
  if (saved) {
    try { storeObj = JSON.parse(saved); } catch {}
  }
  if (__imports.I) {
    storeObj[__imports.I] = record;
    __imports.localStorage.setItem(KEY_MONTH_COST, JSON.stringify(storeObj));
  }

  updateSpendingTooltip();

  const moneyEl = getMonthCostMoneyElement();
  if (moneyEl) {
    moneyEl.innerText = String(totalMonthlyCostCents / 100);
  }
}

/**
 * 更新悬停 Tooltip 明细
 */
function updateSpendingTooltip() {
  const container = document.getElementsByClassName("month-cost")[0];
  if (!container) return;

  if (Ro === 1 && spendingCategoriesList.length > 0) {
    let tip = "数据每日更新，根据个人中心消费数据统计。\n--- ---\n";
    spendingCategoriesList.forEach(item => {
      tip += `${item.title}: ${String(item.money / 100)} 元\n`;
    });
    container.title = tip;
  } else {
    container.title = "数据每日更新，根据个人中心消费数据统计。";
  }
}

/**
 * 页面加载或切换可见性时初始化当月消费展示
 */
function loadMonthlySpending() {
  if (Ro !== 1) return;

  let daysDiff = 1;
  const todayDate = new Date().getDate();

  let storeObj = {};
  const saved = __imports.localStorage.getItem(KEY_MONTH_COST);
  if (saved) {
    try { storeObj = JSON.parse(saved); } catch {}
  }

  const moneyEl = getMonthCostMoneyElement();

  if (__imports.I && __imports.I in storeObj) {
    const userRecord = storeObj[__imports.I];
    daysDiff = Math.abs(todayDate - new Date(userRecord.updateTime).getDate());
    totalMonthlyCostCents = userRecord.monthCost || 0;
    spendingCategoriesList = userRecord.typeDetail || [];

    if (moneyEl) {
      moneyEl.innerText = String(totalMonthlyCostCents / 100);
    }
    updateSpendingTooltip();
  } else {
    if (moneyEl) {
      moneyEl.innerHTML = '<span class="PlayerToolbar-dataLoadding"></span>';
    }
  }

  // 跨天则自动异步刷新一次最新数据
  if (daysDiff >= 1) {
    calculateAndPersistMonthlySpending();
  }
}

}
