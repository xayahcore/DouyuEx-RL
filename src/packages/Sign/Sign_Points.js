/* ==================== 签到领积分（斗鱼活动中心签到） ==================== */
/*
 * 与「房间/鱼吧/星推」那几项不同：这一项是斗鱼**活动中心**（任务中心 /pages/ord-task-center）的签到，
 * 奖励发的是积分。下面每个端点、动词、参数名都是从任务中心自己的线上代码里抄出来的
 * （ord-task-center-master/assets/index-*.js 的端点表与 Service 实现），不是猜的：
 *
 *   GET  /wgapi/activity/gametask/config
 *        → { actAlias, signAlias, signPrize, viewTask[], startTime, endTime, taskAliasList }
 *          **免登录可读**，所以活动下线/换别名能被安全识别
 *   GET  /japi/carnivalApi/nc/sign/getStatus?signAlias=<别名>       （官方就是 get + params）
 *        → { signDays, totalSignDays, todaySigned, todayOffset, status[] }
 *   POST /japi/carnivalApi/sign/doSign       body: signAlias=<别名>&useJiYan=true
 *   POST /japi/carnivalApi/sign/takeBag      body: signAlias=<别名>&offset=<todayOffset>&useJiYan=true
 *        ⚠ 礼包按**天数偏移**领，不是按 giftAlias；官方也只有这一条路径，
 *          端点表里那个 bagList 从没被前端调用过，所以这里不碰它
 *   POST /japi/carnivalApi/sign/remedy       body: signAlias=<别名>&offset=<补签偏移>&useJiYan=true（补签，本项不做）
 *
 * ⚠ 令牌规则（官方的 dy() 包装器就是按 URL 命名空间二选一，实机都验证过）：
 *   url 含 carnivalApi（就是下面的 doSign / takeBag）→ 带 csrfToken = cookie cvl_csrf_token
 *   其余（gametask 命名空间）                        → 带 ctn       = cookie acf_ccn
 *   给 takeBag 只带 ctn 会回「CSRF校验不通过！(1006)」，带错令牌同样过不去。
 * ⚠ 极验：官方在 doSign/takeBag 上都会捕获「极验」错误并弹出滑块验证。滑块无法自动完成，
 *   所以这里遇到验证类错误一律如实提示用户手动去任务中心点一下，绝不谎报成功。
 * ⚠ 别名（actAlias / signAlias）与奖励档位**随活动而变**，绝不能写死在代码里 ——
 *   活动一换名，写死的实现就整体失效。所以每次执行都先拉一次 config 现取，
 *   并用 startTime / endTime 判断活动是否在有效期内（不在期内就如实说明并跳过）。
 */

// 活动配置带内存缓存：同一次会话内多次执行（例如用户连点两次）不必重复拉
let signPointsConfigCache = { at: 0, data: null };
const SIGN_POINTS_CONFIG_TTL = 5 * 60 * 1000;

// takeBag / remedy 的"其实没毛病"错误码（官方源码里就是这么列的）：
// 已领过、今天没有新礼包之类，都不该弹失败提示
const SIGN_POINTS_BENIGN_CODES = [31202, 31200, 31000, 31203, 31204];

function Sign_Points_fetchConfig(force) {
  const now = Date.now();
  if (!force && signPointsConfigCache.data && now - signPointsConfigCache.at < SIGN_POINTS_CONFIG_TTL) {
    return Promise.resolve(signPointsConfigCache.data);
  }
  return fetch("https://www.douyu.com/wgapi/activity/gametask/config", {
    method: "GET",
    credentials: "include",
  })
    .then(function (res) { return res.json(); })
    .then(function (json) {
      const data = (json && json.data) || null;
      if (data && data.signAlias) signPointsConfigCache = { at: Date.now(), data: data };
      return data;
    })
    .catch(function () { return null; });
}

// 活动是否在有效期内。startTime/endTime 缺省时按"不限时间"处理，不要因此拦住签到
function Sign_Points_inPeriod(cfg) {
  if (!cfg) return { ok: false, why: "拿不到活动配置" };
  const now = Math.floor(Date.now() / 1000);
  if (cfg.startTime && now < Number(cfg.startTime)) return { ok: false, why: "活动尚未开始" };
  if (cfg.endTime && now > Number(cfg.endTime)) return { ok: false, why: "活动已结束" };
  return { ok: true };
}

/* 登录墙的两套错误码：gametask 命名空间是 1006900016，carnivalApi 是 300，
   都归一到"未登录"一句话 —— 否则日志会把没登录说成"签到失败"甚至"成功"。 */
function Sign_Points_isLoginError(r) {
  if (!r) return false;
  if (Number(r.error) === 300 || Number(r.error) === 1006900016) return true;
  return /登录/.test(String(r.msg || r.message || ""));
}

// 极验滑块：官方源码里专门有 ee.极验 分支去弹验证，这里只能如实转告用户
function Sign_Points_isVerifyError(r) {
  if (!r) return false;
  return /验证|极验|滑块/.test(String(r.msg || r.message || r.data || ""));
}

function Sign_Points_apiError(r, fallback) {
  if (!r) return fallback || "请求失败";
  if (Sign_Points_isLoginError(r)) return "未登录（请先在斗鱼登录后再试）";
  if (Sign_Points_isVerifyError(r)) return "需要滑块验证，请到「任务中心」手动签到一次";
  if (r.msg) return r.msg;
  if (r.message) return r.message;
  return fallback || ("错误码 " + r.error);
}

/* 官方 http 客户端（ord-task-center 里的 dy()）给 POST 附加的令牌是**二选一**的：
 *   url 含 "carnivalApi"  → 附加 csrfToken = cookie cvl_csrf_token（缺失时先 POST generateCsrf 种下）
 *   其余（gametask 等）    → 附加 ctn       = cookie acf_ccn
 * 实机教训：给 takeBag 只带 ctn 会回「CSRF校验不通过！(1006)」，带对 csrfToken 才通过；
 * 而 takeGift 带 ctn 就能过。两者不可混用，也不能都带上。 */
function Sign_Points_cookie(name) {
  try {
    const m = String(document.cookie || "").match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  } catch (e) {
    return null;
  }
}

function Sign_Points_ctn() {
  try {
    if (typeof getCCN === "function") return getCCN();
  } catch (e) {}
  return Sign_Points_cookie("acf_ccn") || "1";
}

// csrfToken 不在时先种一颗：POST /japi/carnival/nc/common/generateCsrf 会写 cookie cvl_csrf_token
function Sign_Points_ensureCsrf() {
  const got = Sign_Points_cookie("cvl_csrf_token");
  if (got) return Promise.resolve(got);
  return fetch("https://www.douyu.com/japi/carnival/nc/common/generateCsrf", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "",
  })
    .then(function () { return Sign_Points_cookie("cvl_csrf_token"); })
    .catch(function () { return null; });
}

function Sign_Points_rawPost(url, parts) {
  return fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: parts.join("&"),
  })
    .then(function (res) { return res.json(); })
    .catch(function () { return null; });
}

function Sign_Points_postForm(url, pairs) {
  const keys = Object.keys(pairs);
  const build = function (tokenName, tokenValue) {
    const parts = [];
    if (tokenName && tokenValue) {
      parts.push(encodeURIComponent(tokenName) + "=" + encodeURIComponent(tokenValue));
    }
    for (let i = 0; i < keys.length; i++) {
      parts.push(encodeURIComponent(keys[i]) + "=" + encodeURIComponent(pairs[keys[i]]));
    }
    return parts;
  };
  // 与官方 dy() 同一判据：按 URL 里的命名空间决定带哪个令牌
  if (String(url).indexOf("carnivalApi") >= 0) {
    return Sign_Points_ensureCsrf().then(function (token) {
      return Sign_Points_rawPost(url, build("csrfToken", token));
    });
  }
  return Sign_Points_rawPost(url, build("ctn", Sign_Points_ctn()));
}

function Sign_Points_getStatus(signAlias) {
  return fetch(
    "https://www.douyu.com/japi/carnivalApi/nc/sign/getStatus?signAlias=" + encodeURIComponent(signAlias),
    { method: "GET", credentials: "include" }
  )
    .then(function (res) { return res.json(); })
    .catch(function () { return null; });
}

function Sign_Points_doSign(signAlias) {
  // useJiYan=true 是官方前端固定带的（允许服务端下发滑块验证），少这个参数服务端行为会不一致
  return Sign_Points_postForm("https://www.douyu.com/japi/carnivalApi/sign/doSign", {
    signAlias: signAlias,
    useJiYan: "true",
  });
}

function Sign_Points_takeBag(signAlias, offset) {
  return Sign_Points_postForm("https://www.douyu.com/japi/carnivalApi/sign/takeBag", {
    signAlias: signAlias,
    offset: String(offset),
    useJiYan: "true",
  });
}

// 从签到奖励表里拼一句人话，例："积分x20"；拿不到就返回空串（不编造）
function Sign_Points_prizeText(cfg, offset) {
  try {
    const table = cfg && cfg.signPrize;
    if (!table) return "";
    const day = table[String((Number(offset) || 0) + 1)] || null;
    if (!day || !day.length) return "";
    return day.map(function (it) { return (it.name || "奖励") + "x" + (it.num || 1); }).join("、");
  } catch (e) {
    return "";
  }
}

/* 执行本项。返回 true 表示"确实签上了或今天已经签过"，false 表示失败（会在日志里说明原因） */
async function executeSignPoints(onLog) {
  // 与 executeSignEngine 一致：没有外部日志通道时，结果直接进左下角通知。
  // 否则 window.executeSignPoints 被单独调用（例如控制台手动触发）会一声不吭。
  const log = function (m, ok) {
    if (typeof onLog === "function") onLog(m, !!ok);
    else if (typeof showMessage === "function") showMessage(m, ok ? "success" : "info");
  };

  const cfg = await Sign_Points_fetchConfig(true);
  if (!cfg || !cfg.signAlias) {
    log("【积分签到】拿不到活动配置（可能活动已下线），已跳过", false);
    return false;
  }
  const period = Sign_Points_inPeriod(cfg);
  if (!period.ok) {
    log("【积分签到】" + period.why + "，已跳过", false);
    return false;
  }

  const signAlias = cfg.signAlias;
  const st0 = await Sign_Points_getStatus(signAlias);
  if (!st0 || Number(st0.error) !== 0) {
    log("【积分签到】状态查询失败：" + Sign_Points_apiError(st0, "接口无响应"), false);
    return false;
  }
  let d = st0.data || {};

  if (Number(d.todaySigned) !== 0) {
    log("【积分签到】今日已签到（已连签 " + (d.signDays || "?") + " 天）", true);
  } else {
    const r = await Sign_Points_doSign(signAlias);
    // 不以 doSign 的返回值为准，而是**回读状态**：签到到底成没成，只有服务端状态说了算。
    // （官方把「签到成功无礼包」也当作成功，靠错误码列表判断容易漏，回读最稳。）
    const st1 = await Sign_Points_getStatus(signAlias);
    const d1 = (st1 && Number(st1.error) === 0 && st1.data) ? st1.data : null;
    if (d1 && Number(d1.todaySigned) !== 0) {
      d = d1;
      const prize = Sign_Points_prizeText(cfg, d1.todayOffset);
      log("【积分签到】签到成功（已连签 " + (d1.signDays || "?") + " 天）" + (prize ? "，获得 " + prize : ""), true);
    } else {
      log("【积分签到】签到失败：" + Sign_Points_apiError(r, "状态回读仍显示今日未签到"), false);
      return false;
    }
  }

  // 签到礼包：官方前端的做法是签到后直接按今天的偏移领（不是按礼包别名）
  if (d.todayOffset === undefined || d.todayOffset === null) {
    log("【积分签到】未取到今日偏移，跳过礼包领取", false);
    return true;
  }
  const bag = await Sign_Points_takeBag(signAlias, d.todayOffset);
  if (bag && Number(bag.error) === 0) {
    log("【积分签到】签到礼包已领取", true);
  } else if (bag && SIGN_POINTS_BENIGN_CODES.indexOf(Number(bag.error)) >= 0) {
    log("【积分签到】今日没有新的签到礼包", true);
  } else {
    log("【积分签到】礼包领取失败：" + Sign_Points_apiError(bag, "接口无响应"), false);
  }
  return true;
}

window.executeSignPoints = executeSignPoints;
