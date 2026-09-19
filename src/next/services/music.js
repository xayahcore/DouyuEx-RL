function* (__imports) {
yield {"advanceRoomMusic": { get: () => advanceRoomMusic, set: value => { advanceRoomMusic = value; } },
"j": { get: () => j, set: value => { j = value; } },
"ln": { get: () => ln, set: value => { ln = value; } },
"pn": { get: () => pn, set: value => { pn = value; } },
"refreshRoomMusic": { get: () => refreshRoomMusic, set: value => { refreshRoomMusic = value; } },
"sn": { get: () => sn, set: value => { sn = value; } }};
/**
 * 真实观众数据统计、开播/观看时长换算与布局持久化服务
 */
let j = {
  view: "",
  showtime: 1428,
  danmu_person_count: "",
  gift_person_count: "",
  paid_person_count: "",
  isShow: 2,
  money_yc: 0,
  money_bag: 0,
  money_total: 0,
  noble_count: "",
};

let ln = false;

/**
 * 格式化大数值为易读中文 (如 12345 -> 1.2万) (导出兼容 sn)
 * @param {number|string} val
 * @returns {string}
 */
function formatAudienceCount(val) {
  const num = Number(val);
  if (isNaN(num)) return String(val);
  if (num >= 10000) {
    const wan = num / 10000;
    return Number.isInteger(wan) ? `${wan}万` : `${parseFloat(wan.toFixed(1))}万`;
  }
  return String(num);
}
const sn = formatAudienceCount;

/**
 * 刷新当前直播间真实观众、礼物流水与开播观看时长 (导出兼容 refreshRoomMusic)
 */
async function refreshRoomAudienceStats() {
  const matchChatEntry = document.querySelector(".MatchSystemChatRoomEntry");
  if (matchChatEntry) matchChatEntry.style.display = "none";

  const roomId = __imports.B;

  // 1. 拉取全景统计聚合数据
  const aggrData = await new Promise((resolve, reject) => {
    (0, __imports.GM_xmlhttpRequest)({
      method: "POST",
      url: "https://www.doseeing.com/xeee/room/aggr",
      headers: {
        Connection: "keep-alive",
        "Content-Type": "application/json;charset=UTF-8",
        Origin: "https://www.doseeing.com",
        Referer: `https://www.doseeing.com/room/${roomId}`,
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/91.0.4472.114",
      },
      data: JSON.stringify({
        m: window.btoa(`rid=${roomId}&dt=0`).split("").reverse().join(""),
      }),
      responseType: "json",
      onload: (res) => resolve(res.response || {}),
      onerror: (err) => reject(err),
    });
  }).catch(() => ({ data: {} }));

  // 2. 拉取今日观看时长
  const taskData = await new Promise((resolve, reject) => {
    (0, __imports.fetch)(`https://www.douyu.com/japi/interactnc/web/fsjk/getCardTaskInfo?rid=${roomId}`, {
      method: "GET",
      mode: "no-cors",
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => resolve(data))
      .catch(err => reject(err));
  }).catch(() => ({ error: -1, data: {} }));

  let liveElapsedSeconds = 0;
  if (j.isShow !== 2 && j.showtime !== 1428) {
    liveElapsedSeconds = Math.floor(Date.now() / 1000) - Number(j.showtime);
  }

  const d = aggrData?.data || {};
  j.view = d["active.uv"] || 0;
  j.danmu_person_count = d["chat.uv"] || 0;
  j.gift_person_count = d["gift.all.uv"] || 0;
  j.paid_person_count = d["gift.paid.uv"] || 0;
  j.money_yc = Number((d["gift.paid.price"] || 0) / 100).toFixed(2);
  j.money_total = Number((d["gift.all.price"] || 0) / 100).toFixed(2);

  // 回显各 DOM 标签
  const elTotal = document.getElementById("real-audience__total");
  const elT = document.getElementById("real-audience__t");
  const elBarrage = document.getElementById("real-audience__barrage");
  const elMoneyYc = document.getElementById("real-audience__money_yc");
  const elMoney = document.getElementById("real-audience__money");
  const elNoble = document.getElementById("real-audience__noble");
  const elTime = document.getElementById("real-audience__time");
  const elWatchTime = document.getElementById("real-audience__watchtime");

  if (elTotal) elTotal.innerText = String(j.view);
  if (elT) {
    elT.title = `今日累计活跃人数:${j.view} 弹幕人数:${j.danmu_person_count} 送礼人数:${j.gift_person_count} 付费人数:${j.paid_person_count}`;
  }
  if (elBarrage) elBarrage.innerText = String(j.danmu_person_count);
  if (elMoneyYc) elMoneyYc.innerText = String(j.money_yc);
  if (elMoney) {
    elMoney.title = `总礼物价值:${j.money_total} 鱼翅礼物:${j.money_yc}`;
  }
  if (j.noble_count !== "" && elNoble) {
    elNoble.innerText = sn(j.noble_count);
  }

  const formattedStartTime = (0, __imports.k)("yyyy年MM月dd日hh时mm分ss秒 ", new Date(Number(j.showtime + "000")));
  const todayWatchStr = (0, __imports.Q)(taskData?.data?.todayWatch || 0);

  if (elTime) {
    elTime.innerText = `已播:${(0, __imports.Q)(liveElapsedSeconds)}`;
    elTime.title = `开播时间:${formattedStartTime}\n已观看:${todayWatchStr}`;
  }

  if (taskData?.error === 0 && elWatchTime) {
    elWatchTime.innerText = `已观看:${todayWatchStr}`;
    elWatchTime.title = `开播时间:${formattedStartTime}\n已观看:${todayWatchStr}`;
  }
}
const refreshRoomMusic = refreshRoomAudienceStats;

/**
 * 切换已播时长与已观看时长的展示 (导出兼容 advanceRoomMusic)
 */
function advanceRoomMusic() {
  const elTime = document.getElementById("real-audience__time");
  const elWatchTime = document.getElementById("real-audience__watchtime");
  if (!elTime || !elWatchTime) return;

  if (elTime.style.display === "none") {
    elTime.style.display = "block";
    elWatchTime.style.display = "none";
  } else {
    elTime.style.display = "none";
    elWatchTime.style.display = "block";
  }
}

/**
 * 持久化刷新布局配置至 ExSave_Refresh (导出兼容 pn)
 */
function persistLayoutRefreshConfig() {
  const rankEl = document.getElementsByClassName("layout-Player-rank")[0];
  const isRankHidden = rankEl?.style?.display === "none";

  const cfg = {
    barrageFrame: { status: isRankHidden },
    video: { status: (0, __imports.fn)() },
    barrage: { status: __imports.mn === 1 },
  };

  __imports.localStorage.setItem("ExSave_Refresh", JSON.stringify(cfg));
}
const pn = persistLayoutRefreshConfig;

}
