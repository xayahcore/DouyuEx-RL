/* ==================== 签到领积分（斗鱼活动中心签到） ==================== */
/*
 * 与「房间/鱼吧/星推」那几项不同：这一项是斗鱼**活动中心**的签到，奖励发的是积分。
 * 下面每个端点、动词、参数名都是实机调出来的（未登录实测，见行末标注），不是猜的：
 *
 *   GET  /wgapi/activity/gametask/config
 *        → { actAlias, signAlias, signPrize, viewTask[], startTime, endTime, taskAliasList }
 *          viewTask 每项 { id, time, status, num, bagAlias }，time = 秒数、num = 积分
 *          **免登录可读**（实测匿名返回 error:0），所以活动下线/换别名能被安全识别
 *   以下全部为登录态接口，未登录时如实报错、绝不谎报成功：
 *   GET  /japi/carnivalApi/nc/sign/getStatus?signAlias=<别名>
 *        → { signDays, totalSignDays, todaySigned, todayOffset, status[] }（未登录 error:300 请登录）
 *        ⚠ 只接受 GET：POST 实测返回 405 "Request method 'POST' not supported"
 *   GET  /japi/carnivalApi/sign/bagList?signAlias=<别名>       → 可领的签到礼包
 *   POST /japi/carnivalApi/sign/doSign            body: signAlias=<别名>
 *        ⚠ 只接受 POST：GET 实测返回 405 "Request method 'GET' not supported"
 *   POST /japi/carnivalApi/sign/takeBag           body: signAlias=<别名>&giftAlias=<礼包别名>
 *   POST /japi/carnivalApi/sign/takeFullSignBag   body: signAlias=<别名>（连签满的整包奖励）
 *
 * ⚠ 别名（actAlias / signAlias）与奖励档位**随活动而变**，绝不能写死在代码里 ——
 *   活动一换名，写死的实现就整体失效。所以每次执行都先拉一次 config 现取，
 *   并用 startTime / endTime 判断活动是否在有效期内（不在期内就如实说明并跳过）。
 */

// 活动配置带内存缓存：同一次会话内多次执行（例如用户连点两次）不必重复拉
let signPointsConfigCache = { at: 0, data: null };
const SIGN_POINTS_CONFIG_TTL = 5 * 60 * 1000;

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
  return /登录/.test(String(r.msg || ""));
}

function Sign_Points_apiError(r, fallback) {
  if (!r) return fallback || "请求失败";
  if (Sign_Points_isLoginError(r)) return "未登录（请先在斗鱼登录后再试）";
  if (r.msg) return r.msg;
  return fallback || ("错误码 " + r.error);
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
  // 实测只认 POST（GET → 405）。保留 GET 兜底，万一哪天服务端改回 GET 也不至于整项静默失效。
  const body = "signAlias=" + encodeURIComponent(signAlias);
  return fetch("https://www.douyu.com/japi/carnivalApi/sign/doSign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body,
  })
    .then(function (res) {
      if (res.status === 405) {
        return fetch(
          "https://www.douyu.com/japi/carnivalApi/sign/doSign?signAlias=" + encodeURIComponent(signAlias),
          { method: "GET", credentials: "include" }
        ).then(function (r2) { return r2.json(); });
      }
      return res.json();
    })
    .catch(function () { return null; });
}

function Sign_Points_bagList(signAlias) {
  return fetch(
    "https://www.douyu.com/japi/carnivalApi/sign/bagList?signAlias=" + encodeURIComponent(signAlias),
    { method: "GET", credentials: "include" }
  )
    .then(function (res) { return res.json(); })
    .catch(function () { return null; });
}

function Sign_Points_takeBag(signAlias, giftAlias, full) {
  const path = full ? "/sign/takeFullSignBag" : "/sign/takeBag";
  let body = "signAlias=" + encodeURIComponent(signAlias);
  if (giftAlias) body += "&giftAlias=" + encodeURIComponent(giftAlias);
  return fetch("https://www.douyu.com/japi/carnivalApi" + path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body,
  })
    .then(function (res) { return res.json(); })
    .catch(function () { return null; });
}

/* 礼包列表的取值。登录态下的真实结构没能在本机复现（未登录时这个接口只回"请登录"），
   所以不赌它一定是数组：顶层数组直接用，否则取对象里第一个数组字段，
   都不成立就返回空并在控制台留下原始载荷 —— 结构万一不对，日志能直接定位，而不是静默漏领。 */
function Sign_Points_unboxList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const keys = Object.keys(data);
    for (let i = 0; i < keys.length; i++) {
      if (Array.isArray(data[keys[i]])) return data[keys[i]];
    }
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[DouyuEx] 礼包列表结构未识别，已跳过领取:", data);
    }
  }
  return [];
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
  let d = null;
  const st = await Sign_Points_getStatus(signAlias);
  if (!st || Number(st.error) !== 0) {
    log("【积分签到】状态查询失败：" + Sign_Points_apiError(st, "接口无响应"), false);
    return false;
  }
  d = st.data || {};

  if (Number(d.todaySigned) !== 0) {
    log("【积分签到】今日已签到（已连签 " + (d.signDays || "?") + " 天）", true);
  } else {
    const r = await Sign_Points_doSign(signAlias);
    if (!r || Number(r.error) !== 0) {
      log("【积分签到】签到失败：" + Sign_Points_apiError(r, "接口无响应"), false);
      return false;
    }
    const prize = Sign_Points_prizeText(cfg, d.todayOffset);
    log("【积分签到】签到成功" + (prize ? "，获得 " + prize : ""), true);
  }

  // 签到礼包：签到之后才会出现，逐个数领掉
  const bags = await Sign_Points_bagList(signAlias);
  if (!bags || Number(bags.error) !== 0) {
    log("【积分签到】礼包列表获取失败：" + Sign_Points_apiError(bags, "接口无响应"), false);
    return true;
  }
  const list = Sign_Points_unboxList(bags.data);
  if (list.length === 0) {
    log("【积分签到】没有可领的签到礼包", true);
    return true;
  }
  let taken = 0, failed = 0;
  for (let i = 0; i < list.length; i++) {
    const alias = list[i] && (list[i].giftAlias || list[i].bagAlias || list[i].alias);
    if (!alias) continue;
    const full = !!(list[i].full || list[i].isFull);
    const r = await Sign_Points_takeBag(signAlias, alias, full);
    if (r && Number(r.error) === 0) taken++;
    else failed++;
  }
  log("【积分签到】礼包领取完成：成功 " + taken + " 个" + (failed ? "，失败 " + failed + " 个" : ""), failed === 0);
  return true;
}

window.executeSignPoints = executeSignPoints;
