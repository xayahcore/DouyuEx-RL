/* ==================== 看直播领积分（活动中心看播任务） ==================== */
/*
 * 机制（全部来自任务中心自己的线上代码 ord-task-center-master/assets/index-*.js，非猜测）：
 *
 *   观看时长由**服务端**统计（斗鱼播放页自己会上报），脚本不需要也不可能靠本地计时去"攒时间"。
 *   服务端把每个档位的状态放在 viewStatus 里返回，官方枚举原文：
 *       var L = (t => (t[t.未观看=1]="未观看", t[t.已观看=2]="已观看", t[t.已领取奖励=3]="已领取奖励", t))(L||{});
 *   即  1 = 未观看（没达标）  2 = 已观看（达标，可领取）  3 = 已领取奖励（领过了）
 *
 *   POST /wgapi/activitync/gametask/viewStatus   body: actAlias=<活动别名>
 *        → { curTime, startTime, endTime, taskList: { "<档位id>": { status, eventTime } } }
 *          startTime = **当日窗口起点**，领取时必须原样带回
 *   POST /wgapi/activitync/gametask/takeGift     body: ctn=<ccn>&id=<档位id>&actAlias=<活动别名>&startTime=<当日起点>
 *        → { error: 0 }  这就是「领取」按钮真正发的请求（实机拦截确认：ctn 由官方 http 客户端自动附带）
 *
 * ⚠ 早先的实现把 2 当成"已领取"、把 viewReport 当成领取接口，两处都错：
 *   viewReport 是**上报观看**（官方传 id+startTime+actAlias），跟领取无关，
 *   裸调用会得到「今日观看活动已结束请刷新页面」。领取只有 takeGift 一条路。
 *
 * 因此实现就是"低频轮询 + 达标即领"，不搞本地计时：
 *   · 只在页面可见时轮询，间隔 3 分钟（一次 POST，量级可忽略；播放页本身的请求比这密集得多）
 *   · 发现 status=2 就 takeGift 领掉，领完回读一次状态确认，不用服务端返回码猜结果
 *   · 全部档位都变成 3 就彻底停手，只留一个不发请求的跨天自检
 *   · 默认关闭；勾选即启动，取消即零定时器
 */

const WATCH_POINTS_POLL_MS = 3 * 60 * 1000;        // 页面可见时的轮询周期
const WATCH_POINTS_REARM_MS = 5 * 60 * 1000;       // 全部领完后仅做跨天自检（不发请求）
const WATCH_POINTS_BOOT_DELAY_MS = 5000;           // 启动后先查一次，刷新页面就能立刻领掉可领的
const WATCH_POINTS_MAX_CLAIMS = 10;                // 单日领取次数上限（活动一共 5 档，留足余量）
const WATCH_POINTS_CLAIM_COOLDOWN_MS = 20 * 1000;  // 两次领取之间的最小间隔，防连点
const WATCH_POINTS_STATUS = { UNWATCHED: 1, WATCHED: 2, CLAIMED: 3 };

let watchPointsState = {
  date: "",
  enabled: false,
  actAlias: "",
  tiers: [],          // [{ id, time, num }]
  statusById: {},     // id -> status（服务端原始值）
  startTime: 0,       // 当日窗口起点，领取时必须带上
  claims: 0,          // 本日已发出的领取请求数
  lastClaimAt: 0,
  loginBlocked: false,
  allDone: false,
  warned: false,      // 配置/活动异常只提示一次
  timer: 0,
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
  watchPointsState.statusById = {};
  watchPointsState.claims = 0;
  watchPointsState.lastClaimAt = 0;
  watchPointsState.loginBlocked = false;
  watchPointsState.allDone = false;
  watchPointsState.date = WatchPoints_today();
}

function WatchPoints_visible() {
  try {
    return typeof document.visibilityState !== "string" || document.visibilityState === "visible";
  } catch (e) {
    return true;
  }
}

function WatchPoints_allClaimed() {
  const tiers = watchPointsState.tiers;
  if (!tiers.length) return false;
  return tiers.every(function (t) {
    return Number(watchPointsState.statusById[t.id]) === WATCH_POINTS_STATUS.CLAIMED;
  });
}

/* 全部领完就停手：连轮询都不再发，只留跨天自检，避免页面挂一整天白刷请求 */
function WatchPoints_goIdle() {
  watchPointsState.allDone = true;
  if (watchPointsState.timer) {
    clearInterval(watchPointsState.timer);
    watchPointsState.timer = 0;
  }
  if (!watchPointsState.rearm) {
    watchPointsState.rearm = setInterval(WatchPoints_rearmTick, WATCH_POINTS_REARM_MS);
  }
}

function WatchPoints_rearmTick() {
  if (!watchPointsState.enabled) return;
  if (watchPointsState.date === WatchPoints_today()) return;
  WatchPoints_resetDay();
  if (watchPointsState.rearm) {
    clearInterval(watchPointsState.rearm);
    watchPointsState.rearm = 0;
  }
  WatchPoints_loadConfig();
  if (!watchPointsState.timer) {
    watchPointsState.timer = setInterval(WatchPoints_poll, WATCH_POINTS_POLL_MS);
  }
  WatchPoints_poll();
}

function WatchPoints_loadConfig() {
  // 复用签到那边的配置拉取（同一个活动配置接口），避免两处各写一份
  const fetcher = typeof Sign_Points_fetchConfig === "function" ? Sign_Points_fetchConfig : null;
  if (!fetcher) return Promise.resolve(null);
  return fetcher(false).then(function (cfg) {
    if (!cfg) return null;
    const period = typeof Sign_Points_inPeriod === "function" ? Sign_Points_inPeriod(cfg) : { ok: true };
    if (!period.ok) {
      if (!watchPointsState.warned) {
        watchPointsState.warned = true;
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
    // ⚠ 注意：config 里的 viewTask[].status 是**模板默认值**（实测恒为 0），
    // 不代表当前用户的状态；用户状态只能从 viewStatus 的 taskList 读。
    return tiers;
  });
}

function WatchPoints_viewStatus() {
  if (!watchPointsState.actAlias) return Promise.resolve(null);
  if (typeof Sign_Points_postForm === "function") {
    return Sign_Points_postForm("https://www.douyu.com/wgapi/activitync/gametask/viewStatus", {
      actAlias: watchPointsState.actAlias,
    });
  }
  return Promise.resolve(null);
}

// 领取某一档。官方请求体：ctn + id + actAlias + startTime
function WatchPoints_takeGift(id) {
  if (typeof Sign_Points_postForm === "function") {
    return Sign_Points_postForm("https://www.douyu.com/wgapi/activitync/gametask/takeGift", {
      id: String(id),
      actAlias: watchPointsState.actAlias,
      startTime: String(watchPointsState.startTime),
    });
  }
  return Promise.resolve(null);
}

/* 轮询一次：读状态 → 把 status=2 的档位领掉。可见性、登录墙、跨天都在这里把住。 */
async function WatchPoints_poll() {
  if (!watchPointsState.enabled || !watchPointsState.running) return;
  if (watchPointsState.date !== WatchPoints_today()) {
    WatchPoints_rearmTick();
    return;
  }
  if (watchPointsState.allDone || watchPointsState.loginBlocked) return;
  if (!WatchPoints_visible()) return;   // 后台标签页一个请求都不发
  if (!watchPointsState.tiers.length) {
    await WatchPoints_loadConfig();
    if (!watchPointsState.tiers.length) return;
  }

  const st = await WatchPoints_viewStatus();
  if (typeof Sign_Points_isLoginError === "function" && Sign_Points_isLoginError(st)) {
    watchPointsState.loginBlocked = true;
    WatchPoints_log("【看播积分】未登录，已停止自动领取（登录后刷新页面即可恢复）", false);
    return;
  }
  const data = (st && st.data) || null;
  const list = (data && data.taskList) || null;
  if (!list) return;
  if (data.startTime) watchPointsState.startTime = data.startTime;

  let claimable = [];
  Object.keys(list).forEach(function (id) {
    watchPointsState.statusById[id] = Number(list[id].status);
    if (Number(list[id].status) === WATCH_POINTS_STATUS.WATCHED) claimable.push(id);
  });

  if (!claimable.length) {
    if (WatchPoints_allClaimed()) WatchPoints_goIdle();
    return;
  }

  let got = 0, failed = 0;
  for (let i = 0; i < claimable.length; i++) {
    if (watchPointsState.claims >= WATCH_POINTS_MAX_CLAIMS) {
      failed++;
      continue;
    }
    const wait = WATCH_POINTS_CLAIM_COOLDOWN_MS - (Date.now() - watchPointsState.lastClaimAt);
    if (wait > 0) { failed++; continue; }
    watchPointsState.claims++;
    watchPointsState.lastClaimAt = Date.now();
    const r = await WatchPoints_takeGift(claimable[i]);
    if (r && Number(r.error) === 0) got++;
    else {
      failed++;
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[DouyuEx] 看播积分领取失败:", claimable[i], r && (r.msg || r.error));
      }
    }
  }
  if (got) {
    // 领完回读一次，用服务端状态确认，而不是拿返回码猜
    const st2 = await WatchPoints_viewStatus();
    const list2 = (st2 && st2.data && st2.data.taskList) || null;
    if (list2) {
      Object.keys(list2).forEach(function (id) {
        watchPointsState.statusById[id] = Number(list2[id].status);
      });
    }
    WatchPoints_log("【看播积分】已领取 " + got + " 档积分", true);
  }
  if (WatchPoints_allClaimed()) WatchPoints_goIdle();
  if (failed && !got && typeof console !== "undefined" && console.warn) {
    console.warn("[DouyuEx] 看播积分本次没有领取成功，下一轮再试");
  }
}

function WatchPoints_start() {
  if (watchPointsState.running) return;
  watchPointsState.running = true;
  WatchPoints_resetDay();
  WatchPoints_loadConfig();
  watchPointsState.timer = setInterval(WatchPoints_poll, WATCH_POINTS_POLL_MS);
  // 启动后先查一次：刷新页面就能把已经可领的档位领掉（用户反馈的"更新后没自动领"就是这里该补上的）
  setTimeout(function () {
    if (watchPointsState.enabled && watchPointsState.running) WatchPoints_poll();
  }, WATCH_POINTS_BOOT_DELAY_MS);
}

function WatchPoints_stop() {
  if (!watchPointsState.running) return;
  watchPointsState.running = false;
  clearInterval(watchPointsState.timer);
  clearInterval(watchPointsState.rearm);
  watchPointsState.timer = 0;
  watchPointsState.rearm = 0;
}

function Sign_WatchPoints_setEnabled(on) {
  watchPointsState.enabled = !!on;
  if (watchPointsState.enabled) WatchPoints_start();
  else WatchPoints_stop();
}

/* 立即查一次（点「开始签到」时调用：那是明确的用户意向，顺手把能领的领掉）。
   写成函数声明而不是只挂 window：Sign.js 里是当裸标识符引用的，声明式才有词法绑定。 */
function Sign_WatchPoints_checkNow() {
  return WatchPoints_poll();
}

/* 入口：随签到面板的开关状态决定是否常驻。
   面板勾选后写入 ExSave_SignConfig，这里是读它 —— 用户没开这一项就一丁点开销都没有。 */
function Sign_WatchPoints_boot() {
  try {
    const saved = JSON.parse(localStorage.getItem("ExSave_SignConfig") || "{}") || {};
    if (saved.watchpoints) Sign_WatchPoints_setEnabled(true);
  } catch (e) {}
}

window.Sign_WatchPoints_setEnabled = Sign_WatchPoints_setEnabled;
window.Sign_WatchPoints_boot = Sign_WatchPoints_boot;
window.Sign_WatchPoints_checkNow = Sign_WatchPoints_checkNow;
window.Sign_WatchPoints_state = function () { return watchPointsState; };
