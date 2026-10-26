/*
    ExGuard —— 杂项包的统一防护层（失败兜底 / 上限 / 有痕）
    ------------------------------------------------------------
    这一层只做三件事，避免每个包各写一套半成品：
      1) ExGuard_warn：带 tag 的 console.warn，且**有上限**——同一个 tag 最多留
         EXGUARD_WARN_MAX 条，防止 MutationObserver / 轮询把控制台刷爆；
      2) ExGuard_pollFor：有次数上限的元素轮询，命中即停，等不到也会留下一条
         「等了多少秒、已放弃」的自证信息，不再无声无息地转下去；
      3) ExGuard_xhr / ExGuard_withTimeout：GM 请求与异步调用的兜底包装，
         失败 / 超时都只 settle 一次，调用方永远拿得到结果（null = 失败）。

    设计约束（与项目约定一致）：
      - 不新增初始化入口：本文件只有函数声明，也不要求写进 initPkg()；
      - 全部函数名带 ExGuard_ 前缀，避免和既有全局撞名；
      - 不在这里碰 DOM 结构，也不做任何业务判断。
*/

let ExGuard_warnCounts = {};
const EXGUARD_WARN_MAX = 20;

/**
 * 有上限的告警输出。同一个 tag 超过上限后静默，避免一条坏路径刷满控制台。
 * @param {string} tag 包名 / 场景名，例如 "等级任务"
 * @param {string} message 人话描述
 * @param {*} [err] 异常或附加信息
 */
function ExGuard_warn(tag, message, err) {
  const key = String(tag || "杂项");
  const used = ExGuard_warnCounts[key] || 0;
  if (used >= EXGUARD_WARN_MAX) return;
  ExGuard_warnCounts[key] = used + 1;
  let detail = "";
  if (err) {
    const text = err && err.message ? err.message : String(err);
    if (text) detail = " —— " + text;
  }
  try {
    console.warn("[DouyuEx] " + key + "：" + message + detail);
  } catch (e) {
    // console 都不可用时无处可写，只能放弃
  }
}

/** 已输出过多少条告警（测试用，也方便真机排查时确认没有刷屏） */
function ExGuard_warnCount(tag) {
  return ExGuard_warnCounts[String(tag || "杂项")] || 0;
}

/** 把接口返回里"应该是数组、但可能是 undefined / 对象"的字段收敛成数组 */
function ExGuard_asList(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * 有上限的元素轮询。
 * @param {Function|string} findFn 返回目标节点（或 null）的函数；传字符串则按选择器查
 * @param {Function} onFound 命中后的回调（抛错只告警，不影响轮询收尾）
 * @param {{intervalMs?:number,maxTries?:number,tag?:string,immediate?:boolean}} [opts]
 * @returns {{cancel:Function,done:boolean,tries:number}}
 */
function ExGuard_pollFor(findFn, onFound, opts) {
  const config = opts || {};
  const intervalMs = config.intervalMs > 0 ? config.intervalMs : 500;
  const maxTries = config.maxTries > 0 ? config.maxTries : 60;
  const tag = config.tag || "轮询";
  const state = { timer: 0, tries: 0, done: false, cancelled: false };

  const stopTimer = function () {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = 0;
    }
  };

  state.cancel = function () {
    state.cancelled = true;
    stopTimer();
  };

  const tick = function () {
    if (state.cancelled || state.done) return;
    state.tries++;
    let found = null;
    try {
      if (typeof findFn === "function") found = findFn();
      else if (typeof findFn === "string") found = document.querySelector(findFn);
    } catch (e) {
      ExGuard_warn(tag, "查询目标节点时抛错，继续等待", e);
    }
    if (found) {
      state.done = true;
      stopTimer();
      try {
        if (typeof onFound === "function") onFound(found);
      } catch (e) {
        ExGuard_warn(tag, "命中后的回调抛错（本次放弃，不影响其它功能）", e);
      }
      return;
    }
    if (state.tries >= maxTries) {
      state.done = true;
      stopTimer();
      const seconds = Math.round((intervalMs * maxTries) / 1000);
      ExGuard_warn(tag, "等待目标节点 " + seconds + " 秒仍未出现，已放弃（不影响其它功能）");
    }
  };

  // 页面已经把节点渲染好了就不必再等一个周期
  if (config.immediate === false) {
    state.timer = setInterval(tick, intervalMs);
  } else {
    tick();
    if (!state.done && !state.cancelled) state.timer = setInterval(tick, intervalMs);
  }
  return state;
}

/**
 * GM_xmlhttpRequest 兜底包装：onerror / ontimeout / 同步抛错都只 settle 一次。
 * @param {Object} options GM 请求配置；额外支持 options.tag
 * @param {number} [timeoutMs]
 * @returns {Promise<*>} 成功为 response.response，失败为 null（绝不悬挂）
 */
function ExGuard_xhr(options, timeoutMs) {
  return new Promise(function (resolve) {
    let settled = false;
    const finish = function (value) {
      if (settled) return;
      settled = true;
      resolve(value === undefined ? null : value);
    };
    const config = Object.assign({}, options || {});
    const tag = config.tag || "请求";
    const innerOnload = config.onload;
    config.onload = function (response) {
      let value = null;
      try {
        if (typeof innerOnload === "function") {
          const handled = innerOnload(response);
          if (handled !== undefined) value = handled;
        }
        if (value === null && response) value = response.response;
      } catch (e) {
        ExGuard_warn(tag, "响应处理抛错，按失败处理", e);
        value = null;
      }
      finish(value);
    };
    config.onerror = function (err) {
      ExGuard_warn(tag, "请求失败：" + (config.url || "(无地址)"), err);
      finish(null);
    };
    config.ontimeout = function () {
      ExGuard_warn(tag, "请求超时：" + (config.url || "(无地址)"));
      finish(null);
    };
    if (!config.timeout) config.timeout = timeoutMs > 0 ? timeoutMs : 15000;
    try {
      GM_xmlhttpRequest(config);
    } catch (e) {
      ExGuard_warn(tag, "请求无法发起：" + (config.url || "(无地址)"), e);
      finish(null);
    }
  });
}

/**
 * 给一个可能永远不 settle 的 Promise 加上限时。
 * @param {Promise} promise
 * @param {number} timeoutMs
 * @param {string} tag
 * @returns {Promise<*>} 超时 / 失败都 resolve(null)
 */
function ExGuard_withTimeout(promise, timeoutMs, tag) {
  return new Promise(function (resolve) {
    let settled = false;
    const limit = timeoutMs > 0 ? timeoutMs : 15000;
    const timer = setTimeout(function () {
      if (settled) return;
      settled = true;
      ExGuard_warn(tag || "异步", "超过 " + limit + "ms 仍未返回，按失败处理");
      resolve(null);
    }, limit);

    Promise.resolve(promise).then(
      function (value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value === undefined ? null : value);
      },
      function (err) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        ExGuard_warn(tag || "异步", "异步失败", err);
        resolve(null);
      }
    );
  });
}
