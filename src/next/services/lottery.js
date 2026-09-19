function* (__imports) {
yield {"$t": { get: () => $t, set: value => { $t = value; } },
"A": { get: () => A, set: value => { A = value; } },
"Bo": { get: () => Bo, set: value => { Bo = value; } },
"Eo": { get: () => Eo, set: value => { Eo = value; } },
"Io": { get: () => Io, set: value => { Io = value; } },
"Jt": { get: () => Jt, set: value => { Jt = value; } },
"Kt": { get: () => Kt, set: value => { Kt = value; } },
"L": { get: () => L, set: value => { L = value; } },
"Lo": { get: () => Lo, set: value => { Lo = value; } },
"M": { get: () => M, set: value => { M = value; } },
"Mo": { get: () => Mo, set: value => { Mo = value; } },
"N": { get: () => N, set: value => { N = value; } },
"No": { get: () => No, set: value => { No = value; } },
"S": { get: () => S, set: value => { S = value; } },
"So": { get: () => So, set: value => { So = value; } },
"To": { get: () => To, set: value => { To = value; } },
"Xt": { get: () => Xt, set: value => { Xt = value; } },
"_o": { get: () => _o, set: value => { _o = value; } },
"ao": { get: () => ao, set: value => { ao = value; } },
"bo": { get: () => bo, set: value => { bo = value; } },
"co": { get: () => co, set: value => { co = value; } },
"eo": { get: () => eo, set: value => { eo = value; } },
"fo": { get: () => fo, set: value => { fo = value; } },
"go": { get: () => go, set: value => { go = value; } },
"ho": { get: () => ho, set: value => { ho = value; } },
"io": { get: () => io, set: value => { io = value; } },
"ko": { get: () => ko, set: value => { ko = value; } },
"lo": { get: () => lo, set: value => { lo = value; } },
"mo": { get: () => mo, set: value => { mo = value; } },
"no": { get: () => no, set: value => { no = value; } },
"oo": { get: () => oo, set: value => { oo = value; } },
"po": { get: () => po, set: value => { po = value; } },
"ro": { get: () => ro, set: value => { ro = value; } },
"so": { get: () => so, set: value => { so = value; } },
"to": { get: () => to, set: value => { to = value; } },
"uo": { get: () => uo, set: value => { uo = value; } },
"vo": { get: () => vo, set: value => { vo = value; } },
"wo": { get: () => wo, set: value => { wo = value; } },
"xo": { get: () => xo, set: value => { xo = value; } },
"yo": { get: () => yo, set: value => { yo = value; } }};
/**
 * 全站大奖雷达监听、进场欢迎、自动回复、自动谢礼与关键词禁言数据服务
 */
let Jt = "";
let Zt = 0;
let Xt = 0;
let Kt = false;
let S = []; // 进场欢迎词列表 [{ level, word }]

function persistEnterWelcomeWords() {
  __imports.localStorage.setItem("ExSave_Enter", JSON.stringify(S));
}
const $t = persistEnterWelcomeWords;

function populateEnterSelectOptions() {
  const sel = document.getElementById("enter__select");
  if (!sel) return;
  sel.options.length = 0;
  for (const item of S) {
    sel.options.add(new Option(`【${item.level}级】${item.word}`, ""));
  }
}
const eo = populateEnterSelectOptions;

let to = false;
let M = {}; // 自动谢礼配置

function persistThankGiftConfig() {
  __imports.localStorage.setItem("ExSave_Gift", JSON.stringify(M));
}
const oo = persistThankGiftConfig;

function extractMessageType(str) {
  return (0, __imports.v)(str, "type@=", "/");
}
const N = extractMessageType;

let no = false;
let L = {}; // 禁言关键词配置
let io = {};
let ao = [];

function persistMuteWords() {
  __imports.localStorage.setItem("ExSave_Mute", JSON.stringify(L));
}
const ro = persistMuteWords;

function requestAddMuteUser(roomId, nickname, banTime) {
  return new Promise((resolve) => {
    (0, __imports.fetch)("https://www.douyu.com/room/roomSetting/addMuteUser", {
      method: "POST",
      mode: "no-cors",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `ban_nickname=${nickname}&room_id=${roomId}&ban_time=${banTime}&reason=7`,
    })
      .then(res => res.json())
      .then(data => resolve(data))
      .catch(() => resolve({ error: -1 }));
  });
}
const lo = requestAddMuteUser;

let so = { day: {}, week: {}, all: {} };

function renderRankPoints(type, elements) {
  if (elements) {
    const startIndex = type === "week" ? 10 : 0;
    for (let i = startIndex; i < elements.length; i++) {
      const el = elements[i];
      const nickname = el.innerHTML.split("<span")[0];
      const parent = el.parentElement;
      const point = so[type]?.[nickname] || 0;

      if (parent?.className?.includes("--top")) {
        el.innerHTML = `${nickname}<span class="exRankPoint--top">${point}</span>`;
      } else {
        el.innerHTML = `${nickname}<span class="exRankPoint">${point}</span>`;
      }
    }
  }
}
const co = renderRankPoints;

function parseRankPoints(list) {
  const result = {};
  if (Array.isArray(list)) {
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      result[item.nickname] = Number(item.gold) / 100;
    }
  }
  return result;
}
const po = parseRankPoints;

let mo = false;
let A = {}; // 关键词自动回复配置
let uo = false;
let go = 0;

function persistAutoReplyConfig() {
  __imports.localStorage.setItem("ExSave_Reply", JSON.stringify(A));
}
const ho = persistAutoReplyConfig;

let fo = 0;

function fetchRedPacketWithGeetest(roomId, packerId, deviceId, containerId) {
  (0, __imports.GM_xmlhttpRequest)({
    method: "POST",
    url: `https://pcapi.douyucdn.cn/h5nc/member/getRedPacket?token=${__imports.m}`,
    data: `room_id=${roomId}&package_room_id=${roomId}&device_id=${deviceId}&packerid=${packerId}&version=1`,
    responseType: "json",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    onload: (res) => {
      const resp = res.response;
      if (resp?.data?.code === "-1" && resp?.data?.validate !== "0") {
        try {
          const geetestConf = JSON.parse(resp.data.geetest.validate_str);
          if (__imports.unsafeWindow?.initGeetest) {
            __imports.unsafeWindow.initGeetest(
              {
                gt: geetestConf.gt,
                challenge: geetestConf.challenge,
                offline: !geetestConf.success,
                product: "float",
              },
              (captchaObj) => {
                captchaObj.appendTo(`#${containerId}`);
                captchaObj.onSuccess(() => {
                  const validateRes = captchaObj.getValidate();
                  const postData = `room_id=${roomId}&package_room_id=${roomId}&device_id=${deviceId}&packerid=${packerId}&version=1&geetest_challenge=${validateRes.geetest_challenge}&geetest_validate=${validateRes.geetest_validate}&geetest_seccode=${encodeURIComponent(validateRes.geetest_seccode)}`;

                  (0, __imports.GM_xmlhttpRequest)({
                    method: "POST",
                    url: `https://pcapi.douyucdn.cn/h5nc/member/getRedPacket?token=${__imports.m}`,
                    data: postData,
                    responseType: "json",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    onload: () => {},
                  });
                });
              }
            );
          }
        } catch {}
      }
    },
  });
}
const yo = fetchRedPacketWithGeetest;

let _o = {};
let xo = false;
let vo = 0;
let wo = 0;
let ko = 0;
let bo = 0;

let Mo = false; // 是否开启全站抽奖提醒
let No = null;  // 抽奖定时器
let So = "";    // 抽奖列表 HTML 缓存
let To = [];    // 拥牌房间号列表
let Co = {};

function persistLotteryConfig() {
  const cfg = { isNotice: Mo };
  __imports.localStorage.setItem("ExSave_Lottery", JSON.stringify(cfg));
}
const Bo = persistLotteryConfig;

function initLotteryState() {
  try {
    const saved = JSON.parse(__imports.localStorage.getItem("ExSave_Lottery") || "{}");
    Mo = Boolean(saved.isNotice);
  } catch {}
}
const Io = initLotteryState;

/**
 * 拉取全站大奖活动列表并构建卡片展示 (导出兼容 Lo)
 */
async function refreshLotteryBroadcastList() {
  let listData = null;
  try {
    const res = await (0, __imports.fetch)("https://www.douyu.com/member/lottery/activity_list");
    listData = await res.json();
  } catch {
    listData = null;
  }

  if (listData?.data?.list) {
    let htmlOutput = "";
    const items = listData.data.list;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === 0) {
        let actDetail = null;
        try {
          const detailRes = await (0, __imports.fetch)(
            `https://www.douyu.com/member/lottery/activity_info?room_id=${item.room_id}`,
            {
              method: "GET",
              mode: "no-cors",
              credentials: "include",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
          );
          actDetail = await detailRes.json();
        } catch {}

        const joinCond = actDetail?.data?.join_condition || {};
        const joinText = "command_content" in joinCond
          ? "发送弹幕"
          : `赠送 ${joinCond.gift_name || ''}（${joinCond.gift_price || ''}）x${joinCond.gift_num || 1}`;

        const expireTimeMs = (Number(actDetail?.data?.start_at || 0) + Number(joinCond.expire_time || 0)) * 1000;
        const nowMs = Date.now();
        let remainingStr = "已结束";

        if (expireTimeMs > nowMs) {
          const diffMs = expireTimeMs - nowMs;
          const days = Math.floor(diffMs / 86400000);
          const hours = Math.floor((diffMs % 86400000) / 3600000);
          const mins = Math.floor((diffMs % 3600000) / 60000);
          const secs = Math.round((diffMs % 60000) / 1000);

          let timeDesc = "";
          if (days > 0) timeDesc += `${days}天`;
          if (hours > 0) timeDesc += `${hours}时`;
          if (mins > 0) timeDesc += `${mins}分`;
          if (secs > 0) timeDesc += `${secs}秒`;
          remainingStr = `距结束：${timeDesc}`;
        }

        const isQualified = To.includes(String(item.room_id)) || (joinCond.lottery_range || 0) <= 1;

        const rangeDescMap = {
          0: "所有人可参与",
          1: "关注主播",
          2: "成为粉丝",
          3: "关注主播+成为粉丝",
        };
        const rangeText = rangeDescMap[joinCond.lottery_range] || "所有人可参与";

        htmlOutput += `
          <a class="lottery__a" href="https://www.douyu.com/${item.room_id}" target="_blank">
            <div class="lottery__item">
              <div class="lottery__img">
                <div class="lottery__anchor">${item.anchor_name}</div>
                <img loading="lazy" src="${item.verticalSrc}"/>
                <div class="lottery__expireTime">${remainingStr}</div>
              </div>
              <div class="lottery__info">
                <div class="lottery__prize">${actDetail?.data?.prize_name || ''}x${actDetail?.data?.prize_num || 1}</div>
                <div class="lottery__jointext">${joinText}</div>
                <div style="color:${isQualified ? "#64ce83" : "#e74c3c"}" class="lottery__condition">${rangeText}</div>
              </div>
            </div>
          </a>
        `;
      }
    }

    const noDataEl = document.getElementsByClassName("lottery__nodata")[0];
    if (noDataEl) {
      noDataEl.style.display = htmlOutput.trim() !== "" ? "none" : "block";
    }

    So = htmlOutput;
    const wrapEl = document.getElementsByClassName("lottery__wrap")[0];
    if (wrapEl) {
      wrapEl.innerHTML = So;
    }
  }
}
const Lo = refreshLotteryBroadcastList;

let Eo = 0;

}
