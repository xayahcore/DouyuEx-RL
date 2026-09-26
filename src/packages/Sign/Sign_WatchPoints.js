/* ==================== 看直播领积分（活动中心看播任务） ==================== */
/*
 * 机制（实机确认）：
 *   活动配置 /wgapi/activity/gametask/config 里的 viewTask 是**一组按累计观看时长的档位**，
 *   当前活动实测：300 / 900 / 1200 / 1800 秒各 10 积分，3000 秒 20 积分（每档每天一次）。
 *   配置项形如 { id, time, status, num, bagAlias }，且**免登录可读**。
 *   查询：POST /wgapi/activitync/gametask/viewStatus  参数 actAlias=<活动别名>
 *        → { curTime, startTime, endTime, taskList: { "1": { status, eventTime } } }
 *   领取：POST /wgapi/activitync/gametask/viewReport  参数 actAlias=<活动别名>
 *        ⚠ 这个命名空间没有 takeBag/bagList（实测 404）—— viewReport 本身就是领取动作。
 *        ⚠ 两个端点只认 POST：GET 实测 404。
 *        ⚠ **接口不返回"已累计多少秒"**，只有 status，所以"什么时候能领"只能本地计时判断。
 *
 * 为什么**不轮询**：
 *   ① 已累计时长只能本地算，高频轮询读不到任何新信息；
 *   ② 后台标签页照样发请求，浏览器的定时器节流还会让时间点漂移；
 *   ③ 其余时间一个请求都不用发才是最省的。
 * 因此：**本地计时到点触发 + 10 分钟低频兜底**。
 *   本地计时只在「页面可见 + 视频在播」时走 —— 不可见时不算观看，计时是诚实的。
 *   兜底只为覆盖两种情况：本次会话之前已经看过一部分、以及刷新后本地计时清零。
 *   请求量上界：每天最多 12 次领取 + 每 10 分钟 1 次状态查询（全部领完后连状态查询也停）。
 */

const WATCH_POINTS_TICK_MS = 1000;                  // 本地计时节拍
const WATCH_POINTS_CHECK_MS = 10 * 60 * 1000;       // 低频兜底周期
const WATCH_POINTS_REARM_MS = 5 * 60 * 1000;        // 全部领完后仅做跨天自检（不发请求）
const WATCH_POINTS_MAX_ATTEMPTS = 12;               // 单日领取请求上限，异常时也不会无限发
const WATCH_POINTS_TIER_MAX_ATTEMPTS = 3;           // 同一档位失败重试上限
const WATCH_POINTS_RETRY_COOLDOWN_MS = 60 * 1000;   // 失败后的重试冷却，防止每秒重发

let watchPointsState = {
  date: "",            // 本地日期，跨天即重置
  enabled: false,
  seconds: 0,          // 本地累计观看秒数（仅可见且在播时累加）
  tiers: [],           // [{ id, time, num }]
  actAlias: "",
  claimed: {},         // id -> true（已领）
  tierAttempts: {},    // id -> 尝试次数
  attempts: 0,         // 本日领取请求总数
  lastClaimAt: 0,
  loginBlocked: false, // 撞到登录墙后就别再试了
  allDone: false,      // 所有档位已领完
  limitWarned: false,  // 达到每日请求上限时只提示一次
  periodWarned: false, // 活动不在有效期内时只提示一次
  timer: 0,
  checker: 0,
  rearm: 0,
  running: false,
};

function WatchPoints_today() {
  return typeof getLocalDateStr === "function" ? getLocalDateStr() : new Date().toDateString();
}

function WatchPoints_log(msg, ok) {
  if (typeof showMessage === "function") showMessage(msg, ok ? "success" : "info");
}

function WatchPoints_resetDay() {
  watchPointsState.seconds = 0;
  watchPointsState.claimed = {};
  watchPointsState.tierAttempts = {};
  watchPointsState.attempts = 0;
  watchPointsState.lastClaimAt = 0;
  watchPointsState.loginBlocked = false;
  watchPointsState.allDone = false;
  watchPointsState.limitWarned = false;
  watchPointsState.date = WatchPoints_today();
}

// 只在页面可见、且主播放器真的在播时才计入观看时长
function WatchPoints_isWatching() {
  try {
    if (typeof document.visibilityState === "string" && document.visibilityState !== "visible") return false;
    let video = (typeof liveVideoNode !== "undefined" && liveVideoNode) ? liveVideoNode : null;
    if (!video) video = document.querySelector(".layout-Player-videoEntity video");
    if (!video) return false;
    return !video.paused && !video.ended && video.readyState >= 2;
  } catch (e) {
    return false;
  }
}

function WatchPoints_allClaimed() {
  const tiers = watchPointsState.tiers;
  if (!tiers.length) return false;
  return tiers.every(function (t) { return watchPointsState.claimed[t.id]; });
}

/* 全部领完就彻底停手：连 10 分钟一次的状态查询也不再发。
   只留一个不发请求的跨天自检，避免页面长挂到第二天后彻底不工作。 */
function WatchPoints_goIdle() {
  watchPointsState.allDone = true;
  if (watchPointsState.checker) {
    clearInterval(watchPointsState.checker);
    watchPointsState.checker = 0;
  }
  if (!watchPointsState.rearm) {
    watchPointsState.rearm = setInterval(WatchPoints_rearmTick, WATCH_POINTS_REARM_MS);
  }
}

function WatchPoints_rearmTick() {
  if (!watchPointsState.enabled) return;
  if (watchPointsState.date === WatchPoints_today()) return;
  // 跨天：本日额度清零，重新开始计时与兜底
  WatchPoints_resetDay();
  if (watchPointsState.rearm) {
    clearInterval(watchPointsState.rearm);
    watchPointsState.rearm = 0;
  }
  WatchPoints_loadConfig();
  if (!watchPointsState.checker) {
    watchPointsState.checker = setInterval(WatchPoints_check, WATCH_POINTS_CHECK_MS);
  }
  WatchPoints_check();
}

function WatchPoints_loadConfig() {
  // 复用签到那边的配置拉取（同一个活动配置接口），避免两处各写一份
  const fetcher = typeof Sign_Points_fetchConfig === "function" ? Sign_Points_fetchConfig : null;
  if (!fetcher) return Promise.resolve(null);
  return fetcher(false).then(function (cfg) {
    if (!cfg) return null;
    const period = typeof Sign_Points_inPeriod === "function" ? Sign_Points_inPeriod(cfg) : { ok: true };
    if (!period.ok) {
      if (!watchPointsState.periodWarned) {
        watchPointsState.periodWarned = true;
        WatchPoints_log("【看播积分】" + period.why + "，看播任务已停用", false);
      }
      return null;
    }
    const tiers = (cfg.viewTask || []).map(function (v) {
      return { id: String(v.id), time: Number(v.time) || 0, num: Number(v.num) || 0 };
    }).filter(function (t) { return t.time > 0; });
    if (!tiers.length) return null;
    watchPointsState.tiers = tiers;
    watchPointsState.actAlias = cfg.actAlias || "";
    // 配置里每档自带 status（2 = 今日已领），先按它落一次初始快照，
    // 这样"今天已经领完"的页面在本地一遍就能判定为收工，不必再多发状态查询
    (cfg.viewTask || []).forEach(function (v) {
      if (Number(v.status) === 2) watchPointsState.claimed[String(v.id)] = true;
    });
    if (WatchPoints_allClaimed()) WatchPoints_goIdle();
    return tiers;
  });
}

function WatchPoints_viewStatus() {
  if (!watchPointsState.actAlias) return Promise.resolve(null);
  return fetch("https://www.douyu.com/wgapi/activitync/gametask/viewStatus", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "actAlias=" + encodeURIComponent(watchPointsState.actAlias),
  })
    .then(function (res) { return res.json(); })
    .catch(function () { return null; });
}

function WatchPoints_viewReport() {
  if (!watchPointsState.actAlias) return Promise.resolve(null);
  return fetch("https://www.douyu.com/wgapi/activitync/gametask/viewReport", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "actAlias=" + encodeURIComponent(watchPointsState.actAlias),
  })
    .then(function (res) { return res.json(); })
    .catch(function () { return null; });
}

/* 领取尝试。成功后立刻回读一次状态，把已领的档位标记掉，避免重复请求。
   接口语义是"上报观看并领取当前可领的档位"（已按时回「今日观看活动已结束请刷新页面」），
   所以一次调用就可能同时领掉多档，不是一档一发。 */
async function WatchPoints_tryClaim(reason) {
  if (!watchPointsState.enabled || watchPointsState.loginBlocked) return false;
  const now = Date.now();
  if (now - watchPointsState.lastClaimAt < WATCH_POINTS_RETRY_COOLDOWN_MS) return false;
  if (watchPointsState.attempts >= WATCH_POINTS_MAX_ATTEMPTS) {
    if (!watchPointsState.limitWarned) {
      watchPointsState.limitWarned = true;
      WatchPoints_log("【看播积分】今日自动领取次数已达上限，已停止尝试", false);
    }
    return false;
  }
  watchPointsState.attempts++;
  watchPointsState.lastClaimAt = now;

  const r = await WatchPoints_viewReport();
  if (r && Number(r.error) === 0) {
    const st = await WatchPoints_viewStatus();
    let got = 0;
    const list = (st && st.data && st.data.taskList) || null;
    if (list) {
      Object.keys(list).forEach(function (id) {
        if (Number(list[id].status) === 2 && !watchPointsState.claimed[id]) {
          watchPointsState.claimed[id] = true;
          got++;
        }
      });
    }
    WatchPoints_log("【看播积分】已领取" + (got ? " " + got + " 档" : "") + "（" + reason + "）", true);
    if (WatchPoints_allClaimed()) WatchPoints_goIdle();
    return true;
  }

  if (typeof Sign_Points_isLoginError === "function" && Sign_Points_isLoginError(r)) {
    watchPointsState.loginBlocked = true;
    WatchPoints_log("【看播积分】未登录，已停止自动领取（登录后刷新页面即可恢复）", false);
    return false;
  }

  // 没到点 / 今天已领完 / 活动已结束都算正常结果：给"已到点却领不到"的档位各记一次尝试，
  // 到达上限后这一档不再由本地计时触发（10 分钟兜底仍会按服务端状态判断）
  watchPointsState.tiers.forEach(function (t) {
    if (!watchPointsState.claimed[t.id] && watchPointsState.seconds >= t.time) {
      watchPointsState.tierAttempts[t.id] = (watchPointsState.tierAttempts[t.id] || 0) + 1;
    }
  });
  if (reason.indexOf("到点") === 0 && r && r.msg) {
    console.warn("[DouyuEx] 看播积分领取未成功:", r.msg);
  }
  return false;
}

// 本地计时：跨过某个还没领的门槛就尝试一次
function WatchPoints_tick() {
  if (!watchPointsState.enabled || !watchPointsState.running) return;
  if (watchPointsState.date !== WatchPoints_today()) {
    WatchPoints_rearmTick();
    return;
  }
  if (!WatchPoints_isWatching()) return;
  watchPointsState.seconds++;
  if (watchPointsState.allDone || watchPointsState.loginBlocked) return;

  const s = watchPointsState.seconds;
  const tier = watchPointsState.tiers.filter(function (t) {
    return !watchPointsState.claimed[t.id] &&
      s >= t.time &&
      (watchPointsState.tierAttempts[t.id] || 0) < WATCH_POINTS_TIER_MAX_ATTEMPTS;
  })[0];
  if (!tier) return;
  WatchPoints_tryClaim("到点领取 " + tier.time + " 秒档");
}

/* 低频兜底：覆盖"本次会话之前已经看过一部分""刷新后本地计时清零"。
   status 语义：2 = 已领；1 = 可领（据实测只有 0/2 出现过，1 为推定值，所以这里**只认 1**——
   判错的最坏结果只是兜底不触发，本地计时那条主路径不受影响；若写成"非 2 即可领"，
   一旦 0 的含义不同就会变成请求风暴）。 */
async function WatchPoints_check() {
  if (!watchPointsState.enabled || watchPointsState.allDone || watchPointsState.loginBlocked) return;
  if (watchPointsState.date !== WatchPoints_today()) {
    WatchPoints_rearmTick();
    return;
  }
  if (!watchPointsState.tiers.length) {
    // 启动时配置没拉到（离线/接口抖动），兜底轮次里补一次
    await WatchPoints_loadConfig();
    if (!watchPointsState.tiers.length) return;
  }
  const st = await WatchPoints_viewStatus();
  if (typeof Sign_Points_isLoginError === "function" && Sign_Points_isLoginError(st)) {
    watchPointsState.loginBlocked = true;
    WatchPoints_log("【看播积分】未登录，已停止自动领取（登录后刷新页面即可恢复）", false);
    return;
  }
  const list = (st && st.data && st.data.taskList) || null;
  if (!list) return;
  let claimable = 0;
  Object.keys(list).forEach(function (id) {
    if (Number(list[id].status) === 2) watchPointsState.claimed[id] = true;
    else if (Number(list[id].status) === 1) claimable++;
  });
  if (WatchPoints_allClaimed()) {
    WatchPoints_goIdle();
    return;
  }
  // 全是"未达成"(status 0) 时什么都不做：本地计时会负责把该跨过的门槛跨过去
  if (claimable > 0) WatchPoints_tryClaim("后台兜底");
}

function WatchPoints_start() {
  if (watchPointsState.running) return;
  watchPointsState.running = true;
  WatchPoints_resetDay();
  WatchPoints_loadConfig();
  watchPointsState.timer = setInterval(WatchPoints_tick, WATCH_POINTS_TICK_MS);
  watchPointsState.checker = setInterval(WatchPoints_check, WATCH_POINTS_CHECK_MS);
  // 启动时立刻兜底查一次（把"之前已看过"的情况补上）
  setTimeout(WatchPoints_check, 8000);
}

function WatchPoints_stop() {
  if (!watchPointsState.running) return;
  watchPointsState.running = false;
  clearInterval(watchPointsState.timer);
  clearInterval(watchPointsState.checker);
  clearInterval(watchPointsState.rearm);
  watchPointsState.timer = 0;
  watchPointsState.checker = 0;
  watchPointsState.rearm = 0;
}

function Sign_WatchPoints_setEnabled(on) {
  watchPointsState.enabled = !!on;
  if (watchPointsState.enabled) WatchPoints_start();
  else WatchPoints_stop();
}

/* 入口：随签到面板的开关状态决定是否常驻。
   面板勾选后写入 ExSave_SignConfig，这里是读它 —— 用户没开这一项就一丁点开销都没有。 */
function Sign_WatchPoints_boot() {
  try {
    const saved = JSON.parse(localStorage.getItem("ExSave_SignConfig") || "{}") || {};
    if (saved.watchpoints) Sign_WatchPoints_setEnabled(true);
  } catch (e) {}
}

/* 立即做一次兜底检查（点「开始签到」时调用：那是明确的用户意向，顺手把能领的领掉）。
   写成函数声明而不是只挂 window：Sign.js 里是当裸标识符引用的，声明式才有词法绑定。 */
function Sign_WatchPoints_checkNow() {
  return WatchPoints_check();
}

window.Sign_WatchPoints_setEnabled = Sign_WatchPoints_setEnabled;
window.Sign_WatchPoints_boot = Sign_WatchPoints_boot;
window.Sign_WatchPoints_checkNow = Sign_WatchPoints_checkNow;
window.Sign_WatchPoints_state = function () { return watchPointsState; };
