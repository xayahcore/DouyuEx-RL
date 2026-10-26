let autoFishInfo = [];
let baitId = null;
let nextFishEndTime = 0;
let isFishing = false;
let timerAutoFish = 0;

// 活动接口单次请求的上限：超过就按失败处理（不设上限时，黑洞连接会让 await 永远挂着）
const AUTOFISH_REQUEST_TIMEOUT = 15000;
// 连续失败多少次就停手（1.5 秒一轮，失败不能无限重试刷屏）
const AUTOFISH_MAX_FAIL = 3;
let autoFishFailCount = 0;

/**
 * 活动接口的统一请求：**一定会 settle**。
 *
 * 旧实现四个包装器的 .catch 只 console.log 不 resolve —— 请求失败 / 被拦截 / 响应不是 JSON 时
 * await 就永远挂着：勾选框已选中、两种模式单选被 AutoFish_lockMode(true) 锁死、界面零提示，
 * 用户只能刷新页面。现在：成功给解析后的 JSON，失败 / 超时 / 解析异常一律 resolve(null)，
 * 由调用方判空后把界面复位并给出提示。
 */
function AutoFish_requestJson(url, options, tag) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => {
      if (typeof ExGuard_warn === "function") {
        ExGuard_warn("自动钓鱼", (tag || url) + " 超过 " + AUTOFISH_REQUEST_TIMEOUT + "ms 未返回，按失败处理");
      }
      finish(null);
    }, AUTOFISH_REQUEST_TIMEOUT);
    let request;
    try {
      request = fetch(url, options);
    } catch (e) {
      if (typeof ExGuard_warn === "function") ExGuard_warn("自动钓鱼", (tag || url) + " 请求无法发起", e);
      finish(null);
      return;
    }
    Promise.resolve(request)
      .then((res) => res.json())
      .then((ret) => finish(ret))
      .catch((err) => {
        if (typeof ExGuard_warn === "function") ExGuard_warn("自动钓鱼", (tag || url) + " 请求失败", err);
        finish(null);
      });
  });
}

/** 放弃本次自动钓鱼并复位界面：取消勾选 + 解锁模式 + 落盘，保证"界面状态 = 存储状态" */
function AutoFish_abort(message) {
  const checkbox = document.getElementById("extool__autofish_start");
  if (checkbox) checkbox.checked = false;
  AutoFish_lockMode(false);
  saveData_AutoFish();
  if (message) showMessage(message, "error");
  return null;
}

function initPkg_ExpandTool_AutoFish() {
  ExpandTool_AutoFish_insertFunc();
  ExpandTool_AutoFish_Set();
}

function ExpandTool_AutoFish_insertFunc() {
  document.querySelectorAll('input[name="autofish_mode"]').forEach(radio => {
    radio.addEventListener("change", saveData_AutoFish);
  });
  
  document.getElementById("extool__autofish_start").addEventListener("click", async () => {
    saveData_AutoFish();
    const isStart = document.getElementById("extool__autofish_start").checked;
    AutoFish_lockMode(isStart);
    if (!isStart) {
      clearTimeout(timerAutoFish);
      clearInterval(timerAutoFish);
      return;
    }
    showMessage("【自动钓鱼】开始自动钓鱼", "info");
    autoFishInfo = await AutoFish_getFishInfo();
    const homepageRes = await AutoFish_getHomepageData();
    // 两个请求任一失败（断网 / 接口被拦 / 超时）都会拿到 null：
    // 旧实现这里 await 永不返回，界面就停在"勾选着 + 模式被锁死"的状态。
    if (!Array.isArray(autoFishInfo) || !homepageRes) {
      autoFishInfo = [];
      return AutoFish_abort("【自动钓鱼】活动信息获取失败，请稍后重试");
    }
    if (homepageRes.data) {
      let baitData = (homepageRes.data.baits || []).find((item) => item.inUse);
      if (!baitData) {
        return AutoFish_abort("【自动钓鱼】请设置鱼饵");
      }
      baitId = baitData.id;

      const myCh = homepageRes.data.myCh;
      if (!myCh) {
        return AutoFish_abort("【自动钓鱼】请设置形象");
      }
    } else {
      return AutoFish_abort("【自动钓鱼】未能获取活动信息");
    }
    saveData_AutoFish();

    if (homepageRes.data.fishing.stat == 0) {
      // 未开始钓鱼
      isFishing = false;
      nextFishEndTime = 0;
    }

    if (homepageRes.data.fishing.stat == 1) {
      // 还在钓鱼中
      isFishing = true;
      nextFishEndTime = homepageRes.data.fishing.fishEtMs;
    }

    if (homepageRes.data.fishing.stat == 2) {
      // 上一次未收杆
      await endFish();
      await sleep(1000);
    }

    async function fishLoop() {
      const isStart = document.getElementById("extool__autofish_start")?.checked;
      if (!isStart) return;
      try {
        if (isInFishingTime()) {
          if (isFishing) {
            // 正在钓鱼中，检测是否到时间收杆
            const now = new Date().getTime();
            if (now > nextFishEndTime) {
              await endFish();
            }
          } else {
            const fishRes = await AutoFish_startFish();
            if (!fishRes) {
              // 请求层失败（断网 / 超时 / 响应不是 JSON）：既不能拿 null 当响应继续解引用，
              // 也不该每 1.5 秒无脑重试 —— 连续 3 次就停手并复位界面。
              autoFishFailCount++;
              if (typeof ExGuard_warn === "function") {
                ExGuard_warn("自动钓鱼", "下杆请求失败（连续 " + autoFishFailCount + " 次）");
              }
              if (autoFishFailCount >= AUTOFISH_MAX_FAIL) {
                AutoFish_abort("【自动钓鱼】连续 " + AUTOFISH_MAX_FAIL + " 次请求失败，已停止");
                return;
              }
            } else {
              autoFishFailCount = 0;
              if (fishRes.error !== 0) {
                showMessage(`【自动钓鱼】${fishRes.msg}`, "error");
                console.log(fishRes, "钓鱼失败");
                if (fishRes.error == 1001007) {
                  // 操作失败
                  await endFish();
                } else if (fishRes.error == 1005003) {
                  // 鱼饵不足
                  return AutoFish_abort(null);
                }
              } else if (fishRes.data && fishRes.data.fishing) {
                isFishing = true;
                nextFishEndTime = fishRes.data.fishing.fishEtMs;
              }
            }
          }
        }
      } catch (err) {
        console.error("[DouyuEx] 自动钓鱼轮询异常:", err);
      } finally {
        const stillRunning = document.getElementById("extool__autofish_start")?.checked;
        if (stillRunning) {
          timerAutoFish = setTimeout(fishLoop, 1500);
        }
      }
    }
    fishLoop();
  });
}

async function endFish() {
  const fishRes = await AutoFish_endFish();
  if (!fishRes) {
    // 收杆请求失败：旧实现这里直接解引用 null 抛 TypeError（在 fishLoop 里被吞成一条 console.error）
    autoFishFailCount++;
    if (typeof ExGuard_warn === "function") {
      ExGuard_warn("自动钓鱼", "收杆请求失败（连续 " + autoFishFailCount + " 次）");
    }
    if (autoFishFailCount >= AUTOFISH_MAX_FAIL) {
      AutoFish_abort("【自动钓鱼】连续 " + AUTOFISH_MAX_FAIL + " 次请求失败，已停止");
    }
    return;
  }
  autoFishFailCount = 0;
  if (fishRes.error !== 0) {
    console.log(fishRes, "收杆失败");
    const homepageRes = await AutoFish_getHomepageData();
    if (homepageRes && homepageRes.data && homepageRes.data.fishing && homepageRes.data.fishing.stat == 0) {
      // 钓鱼已完成
      isFishing = false;
      nextFishEndTime = 0;
    }
    return;
  }
  let str = `【自动钓鱼】`;
  const fish = fishRes.data && fishRes.data.fish ? fishRes.data.fish : null;
  const fishList = Array.isArray(autoFishInfo) ? autoFishInfo : [];
  let fishData = fish ? fishList.find((item) => item.fishId == fish.id) : null;
  if (fishData && fish) {
    str += `获得${fishData.name}${fish.wei}斤`;
  }
  const awards = fishRes.data && Array.isArray(fishRes.data.awards) ? fishRes.data.awards : [];
  if (awards.length > 0) {
    for (let i = 0; i < awards.length; i++) {
      let award = awards[i];
      str += `${fishData ? "，" : ""}获得${award.awardName}x${award.awardNum}`;
    }
  }
  if (str !== "【自动钓鱼】") showMessage(str, "success");
  isFishing = false;
}

function AutoFish_getSave() {
  let data;
  try {
    data = JSON.parse(localStorage.getItem("ExSave_AutoFish"));
  } catch (e) {
    data = null;
  }
  if (!data || typeof data !== "object") data = {};
  if (!Array.isArray(data.rids)) data.rids = [];
  if (!data.modes || typeof data.modes !== "object") data.modes = {};
  return data;
}

function AutoFish_lockMode(lock) {
  document.querySelectorAll('input[name="autofish_mode"]').forEach((r) => (r.disabled = lock));
}

function saveData_AutoFish() {
  let checkbox = document.getElementById("extool__autofish_start");
  let modeRadio = document.querySelector('input[name="autofish_mode"]:checked');
  if (!checkbox || !modeRadio) return;

  let value = checkbox.checked;
  let mode = modeRadio.value;
  let data = AutoFish_getSave();
  
  if (value) {
    if (!data.rids.includes(rid)) data.rids.push(rid);
    data.modes[rid] = mode;
  } else {
    data.rids = data.rids.filter((item) => item !== rid);
    delete data.modes[rid];
  }
  
  localStorage.setItem("ExSave_AutoFish", JSON.stringify(data));
}

function AutoFish_getRids() {
  return AutoFish_getSave().rids;
}

function ExpandTool_AutoFish_Set() {
  let data = AutoFish_getSave();
  if (!data.rids.includes(rid)) return;

  // 设置模式（兼容旧版本，默认全天）
  // 旧实现在这里裸取 .checked / .click()：存储里的 mode 值一旦不在选项里
  //（改版删过模式 / 手改过 localStorage），整个 initPkg_ExpandTool 就停在 TypeError，
  // 后面所有扩展功能一起消失。
  let mode = data.modes && data.modes[rid] ? data.modes[rid] : "all";
  const modeRadio = document.querySelector(`input[name="autofish_mode"][value="${mode}"]`);
  if (!modeRadio) {
    if (typeof ExGuard_warn === "function") ExGuard_warn("自动钓鱼", "存储里的模式值非法（" + mode + "），本次不自动开启");
    return;
  }
  modeRadio.checked = true;

  const checkbox = document.getElementById("extool__autofish_start");
  if (!checkbox) {
    if (typeof ExGuard_warn === "function") ExGuard_warn("自动钓鱼", "面板里的开关不存在，本次不自动开启");
    return;
  }
  checkbox.click();
}

function AutoFish_getFishInfo() {
  return AutoFish_requestJson(
    `https://www.douyu.com/japi/revenuenc/web/actfans/achieve/accList?rid=${rid}&type=1&period=1`,
    { method: "GET", mode: "no-cors", cache: "default", credentials: "include" },
    "成就列表"
  ).then((ret) => {
    if (!ret) return null; // 请求层失败：调用方必须判空
    return ret.data && Array.isArray(ret.data.accList) ? ret.data.accList : [];
  });
}

function AutoFish_getHomepageData() {
  return AutoFish_requestJson(
    `https://www.douyu.com/japi/revenuenc/web/actfans/fishing/homePage?rid=${rid}&opt=1`,
    { method: "GET", mode: "no-cors", cache: "default", credentials: "include" },
    "活动首页"
  );
}

function AutoFish_startFish() {
  return AutoFish_requestJson("https://www.douyu.com/japi/revenuenc/web/actfans/fishing/fishing", {
    method: "POST",
    mode: "no-cors",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `ctn=${getCCN()}&rid=${rid}&baitId=${baitId}&ver=1.1`
  }, "下杆");
}

function AutoFish_endFish() {
  return AutoFish_requestJson("https://www.douyu.com/japi/revenuenc/web/actfans/fishing/reelIn", {
    method: "POST",
    mode: "no-cors",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `ctn=${getCCN()}&rid=${rid}`
  }, "收杆");
}

function isInFishingTime() {
  let modeRadio = document.querySelector('input[name="autofish_mode"]:checked');
  let mode = modeRadio ? modeRadio.value : "all";
  if (mode === "all") return true;
  
  let now = new Date();
  let hour = now.getHours();
  let minute = now.getMinutes();
  
  // 钓鱼大赛：12:00-24:00，每个整点的前半小时（包括00:00-00:30）
  return (hour >= 12 && minute < 30) || (hour === 0 && minute < 30);
}
