function* (__imports) {
yield {"at": { get: () => at, set: value => { at = value; } },
"ct": { get: () => ct, set: value => { ct = value; } },
"dt": { get: () => dt, set: value => { dt = value; } },
"et": { get: () => et, set: value => { et = value; } },
"it": { get: () => it, set: value => { it = value; } },
"lt": { get: () => lt, set: value => { lt = value; } },
"mt": { get: () => mt, set: value => { mt = value; } },
"nt": { get: () => nt, set: value => { nt = value; } },
"ot": { get: () => ot, set: value => { ot = value; } },
"pt": { get: () => pt, set: value => { pt = value; } },
"rt": { get: () => rt, set: value => { rt = value; } },
"st": { get: () => st, set: value => { st = value; } },
"tt": { get: () => tt, set: value => { tt = value; } },
"ut": { get: () => ut, set: value => { ut = value; } }};
/**
 * 粉丝牌资产查询、背包道具获取与自动钓鱼基础服务
 */

// 官方 108×108 红白经典精灵球 SVG (兼容导出 et)
const et = `<svg class="icon" width="24" height="24" viewBox="0 0 108 108" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g id="页面-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="精灵球" transform="translate(0.830769, 0.830769)" fill-rule="nonzero">
            <path d="M53.1692307,106.338461 C23.8276922,106.338461 0,82.5107692 0,53.1692307 C0,51.0030769 1.77230775,49.2307692 3.9384615,49.2307692 L33.476923,49.2307692 C35.6430769,49.2307692 37.4153845,51.003077 37.4153846,53.1692307 C37.4153846,61.8338461 44.5046154,68.9230769 53.1692307,68.9230769 C61.8338461,68.9230769 68.9230769,61.8338461 68.9230769,53.1692307 C68.9230769,51.0030769 70.6953846,49.2307692 72.8615385,49.2307692 L102.4,49.2307692 C104.566154,49.2307692 106.338461,51.003077 106.338461,53.1692307 C106.338461,82.5107692 82.5107692,106.338461 53.1692307,106.338461 Z" id="路径" fill="#33363A"></path>
            <path d="M8.07384612,57.1076922 C10.0430769,80.2461537 29.5384615,98.4615385 53.1692307,98.4615385 C76.8,98.4615385 96.2953846,80.2461539 98.2646154,57.1076922 L76.5046154,57.1076922 C74.6338461,68.2338461 64.8861539,76.8 53.1692307,76.8 C41.4523076,76.8 31.7046154,68.2338461 29.8338461,57.1076922 L8.07384612,57.1076922 Z" id="路径" fill="#FFFFFF"></path>
            <path d="M53.1692308,3.9384615 C25.9938461,3.9384615 3.9384615,25.9938461 3.9384615,53.1692307 L33.476923,53.1692307 C33.476923,42.3384615 42.3384615,33.476923 53.1692308,33.476923 C64,33.476923 72.8615385,42.3384615 72.8615385,53.1692307 L102.4,53.1692307 C102.4,25.9938461 80.3446154,3.9384615 53.1692308,3.9384615 Z" id="路径" fill="#D60909"></path>
            <path d="M102.4,57.1076922 L72.8615385,57.1076922 C70.6953846,57.1076922 68.923077,55.3353845 68.9230769,53.1692307 C68.9230769,44.5046154 61.8338461,37.4153846 53.1692307,37.4153846 C44.5046154,37.4153846 37.4153846,44.5046154 37.4153846,53.1692307 C37.4153846,55.3353846 35.6430769,57.1076922 33.476923,57.1076922 L3.9384615,57.1076922 C1.77230762,57.1076922 0,55.3353845 0,53.1692307 C0,23.8276922 23.8276923,0 53.1692307,0 C82.5107692,0 106.338461,23.8276922 106.338461,53.1692307 C106.338461,55.3353846 104.566154,57.1076922 102.4,57.1076922 Z" id="路径" fill="#33363A"></path>
            <path d="M76.5046154,49.2307693 L98.3630769,49.2307693 C96.2953846,26.0923076 76.8,7.876923 53.1692307,7.876923 C29.5384615,7.876923 10.0430769,26.0923076 8.07384612,49.2307693 L29.9323076,49.2307693 C31.7046154,38.1046154 41.4523076,29.5384615 53.1692307,29.5384615 C64.8861539,29.5384615 74.6338461,38.1046154 76.5046154,49.2307693 L76.5046154,49.2307693 Z" id="路径" fill="#D60909"></path>
            <path d="M53.1692307,76.8 C40.1723076,76.8 29.5384615,66.1661539 29.5384615,53.1692307 C29.5384615,40.1723076 40.1723076,29.5384615 53.1692307,29.5384615 C66.1661539,29.5384615 76.8,40.1723076 76.8,53.1692307 C76.8,66.1661539 66.1661539,76.8 53.1692307,76.8 Z" id="路径" fill="#33363A"></path>
            <path d="M53.1692307,37.4153846 C44.5046154,37.4153846 37.4153846,44.5046154 37.4153846,53.1692307 C37.4153846,61.8338461 44.5046154,68.9230769 53.1692307,68.9230769 C61.8338461,68.9230769 68.9230769,61.8338461 68.9230769,53.1692307 C68.9230769,44.5046154 61.8338461,37.4153846 53.1692307,37.4153846 L53.1692307,37.4153846 Z" id="路径" fill="#FFFFFF"></path>
            <path d="M43.3230769,53.1692307 C43.3230769,58.6071114 47.7313501,63.0153846 53.1692307,63.0153846 C58.6071114,63.0153846 63.0153846,58.6071114 63.0153846,53.1692307 C63.0153846,47.7313501 58.6071114,43.3230769 53.1692307,43.3230769 C47.7313501,43.3230769 43.3230769,47.7313501 43.3230769,53.1692307 Z" id="路径" fill="#33363A"></path>
        </g>
    </g>
</svg>`;

// 钓鱼状态机内部变量 (兼容导出 tt, ot, nt, it, at)
let tt = [];       // 鱼类品种字典列表
let ot = null;     // 钓鱼轮询定时器
let nt = 0;        // 钓鱼剩余秒数
let it = false;    // 自动钓鱼运行中标志
let at = 0;        // 钓鱼比赛模式 (0: 全天, 1: 大赛)

/**
 * 自动钓鱼提竿动作 (兼容导出 rt)
 */
async function rt() {
  const result = await new Promise((resolve) => {
    (0, __imports.fetch)("https://www.douyu.com/japi/revenuenc/web/actfans/fishing/reelIn", {
      method: "POST",
      mode: "no-cors",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `ctn=${(0, __imports.w)()}&rid=${__imports.B}`,
    })
      .then((res) => res.json())
      .then((data) => resolve(data))
      .catch((err) => {
        console.debug("[DouyuEx NEXT] 提竿请求异常:", err);
        resolve({ error: -1 });
      });
  });

  if (result.error !== 0) {
    console.debug("[DouyuEx NEXT] 提竿失败:", result);
    const home = await ct();
    if (home?.data?.fishing?.stat === 0) {
      it = false;
      nt = 0;
    }
  } else {
    let msg = "【自动钓鱼】";
    const fishInfo = tt.find((item) => item.fishId === result.data?.fish?.id);
    if (fishInfo && result.data?.fish) {
      msg += `获得${fishInfo.name}${result.data.fish.wei}斤`;
    }
    if (result.data?.awards && result.data.awards.length > 0) {
      for (let i = 0; i < result.data.awards.length; i++) {
        const award = result.data.awards[i];
        msg += `${fishInfo ? "，" : ""}获得${award.awardName}x${award.awardNum}`;
      }
    }
    if (msg !== "【自动钓鱼】") {
      (0, __imports.T)(msg, "success");
    }
    it = false;
  }
}

/**
 * 获取自动钓鱼本地配置 (兼容导出 lt)
 * @returns {object}
 */
function lt() {
  let cfg;
  try {
    cfg = JSON.parse(__imports.localStorage.getItem("ExSave_AutoFish"));
  } catch {
    cfg = null;
  }
  if (!cfg || typeof cfg !== "object") cfg = {};
  if (!Array.isArray(cfg.rids)) cfg.rids = [];
  if (!cfg.modes || typeof cfg.modes !== "object") cfg.modes = {};
  return cfg;
}

/**
 * 禁用/启用钓鱼模式单选框 (兼容导出 st)
 * @param {boolean} disabled
 */
function st(disabled) {
  document.querySelectorAll('input[name="autofish_mode"]').forEach((el) => {
    el.disabled = disabled;
  });
}

/**
 * 保存当前房间自动钓鱼开关与模式 (兼容导出 dt)
 */
function dt() {
  const startCheckbox = document.getElementById("extool__autofish_start");
  const modeRadio = document.querySelector('input[name="autofish_mode"]:checked');
  if (!startCheckbox || !modeRadio) return;

  const isStarted = startCheckbox.checked;
  const modeVal = modeRadio.value;
  const config = lt();

  if (isStarted) {
    if (!config.rids.includes(__imports.B)) {
      config.rids.push(__imports.B);
    }
    config.modes[__imports.B] = modeVal;
  } else {
    config.rids = config.rids.filter((id) => id !== __imports.B);
    delete config.modes[__imports.B];
  }

  __imports.localStorage.setItem("ExSave_AutoFish", JSON.stringify(config));
}

/**
 * 获取当前房间钓鱼主页状态 (兼容导出 ct)
 * @returns {Promise<object>}
 */
function ct() {
  return new Promise((resolve) => {
    (0, __imports.fetch)(
      `https://www.douyu.com/japi/revenuenc/web/actfans/fishing/homePage?rid=${__imports.B}&opt=1`,
      {
        method: "GET",
        mode: "no-cors",
        cache: "default",
        credentials: "include",
      }
    )
      .then((res) => res.json())
      .then((data) => resolve(data))
      .catch((err) => {
        console.debug("[DouyuEx NEXT] 钓鱼主页获取异常:", err);
        resolve({ error: -1, data: {} });
      });
  });
}

/**
 * 查询用户当前房间背包资产 (兼容导出 pt)
 * @param {string|number} roomId - 目标房间号
 * @param {Function} callback - 回调 (data: object) => void
 */
function pt(roomId, callback) {
  (0, __imports.fetch)(`https://www.douyu.com/japi/prop/backpack/web/v5?rid=${roomId}`, {
    method: "GET",
    mode: "no-cors",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
    .then((res) => res.json())
    .then((data) => {
      if (typeof callback === 'function') callback(data);
    })
    .catch((err) => {
      console.debug("[DouyuEx NEXT] 背包资产请求异常:", err);
      if (typeof callback === 'function') callback({ error: -1, data: { list: [] } });
    });
}

/**
 * 网页全屏是否勾选 (兼容导出 mt)
 * @returns {boolean}
 */
function mt() {
  const el = document.getElementById("extool__fullscreen");
  return Boolean(el && el.checked);
}

/**
 * 最高画质秒开是否勾选 (兼容导出 ut)
 * @returns {boolean}
 */
function ut() {
  const el = document.getElementById("extool__highestvideoquality");
  return Boolean(el && el.checked);
}

}
