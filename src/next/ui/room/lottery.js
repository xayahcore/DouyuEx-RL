function* (__imports) {
yield {"mountLotteryPanel": { get: () => mountLotteryPanel, set: value => { mountLotteryPanel = value; } }};
/**
 * 全站大奖雷达控制台、版本更新与同屏播放外层按钮挂载控制器
 * @param {object} owner - 房间装配生命周期托管者
 */
function mountLotteryPanel(owner) {
  const dockWrap = document.getElementsByClassName("ex-panel__wrap")[0];

  // 1. 挂载 Dock【版本更新】入口
  const updateIconEl = document.createElement("div");
  updateIconEl.className = "ex-update";
  updateIconEl.innerHTML = `
    <a class="ex-panel__icon" title="版本更新，当前版本：${__imports.P}">
      <svg style="display:block;" class="icon" viewBox="0 0 1024 1024" width="32" height="32">
        <path d="M768 810.7H512c-23.6 0-42.7-19.1-42.7-42.7s19.1-42.7 42.7-42.7h256c94.1 0 170.7-76.6 170.7-170.7 0-89.6-70.1-164.3-159.5-170.1L754 383l-10.7-22.7c-42.2-89.3-133-147-231.3-147s-189.1 57.7-231.3 147L270 383l-25.1 1.6c-89.5 5.8-159.5 80.5-159.5 170.1 0 94.1 76.6 170.7 170.7 170.7 23.6 0 42.7 19.1 42.7 42.7s-19.1 42.7-42.7 42.7c-141.2 0-256-114.8-256-256 0-126.1 92.5-232.5 214.7-252.4C274.8 195.7 388.9 128 512 128s237.2 67.7 297.3 174.2C931.5 322.1 1024 428.6 1024 554.7c0 141.1-114.8 256-256 256z" fill="#3688FF"></path>
        <path d="M554.7 938.7c-10.9 0-21.8-4.2-30.2-12.5l-128-128c-16.7-16.7-16.7-43.7 0-60.3l128-128c16.6-16.7 43.7-16.7 60.3 0 16.7 16.7 16.7 43.7 0 60.3L487 768l97.8 97.8c16.7 16.7 16.7 43.7 0 60.3-8.3 8.4-19.2 12.6-30.1 12.6z" fill="#5F6379"></path>
      </svg>
      <i id="ex-update__tip" class="ex-panel__tip"></i>
    </a>
  `;
  if (dockWrap) dockWrap.insertBefore(updateIconEl, dockWrap.childNodes[0]);

  // 2. 挂载 Dock【在线弹幕助手】入口
  const monitorIconEl = document.createElement("div");
  monitorIconEl.className = "ex-monitor";
  monitorIconEl.innerHTML = `
    <a class="ex-panel__icon" title="在线弹幕助手">
      <svg style="display:block;" class="icon" viewBox="0 0 1024 1024" width="32" height="32">
        <path d="M426.666667 106.666667a21.333333 21.333333 0 0 1 21.333333-21.333334h512a21.333333 21.333333 0 0 1 0 42.666667H448a21.333333 21.333333 0 0 1-21.333333-21.333333z m533.333333 789.333333H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667z m0-554.666667H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667z m0 298.666667H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667zM245.333333 42.666667H96a53.393333 53.393333 0 0 0-53.333333 53.333333v149.333333a53.393333 53.393333 0 0 0 53.333333 53.333334h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333334V96a53.393333 53.393333 0 0 0-53.333334-53.333333z m0 341.333333H96a53.393333 53.393333 0 0 0-53.333333 53.333333v149.333334a53.393333 53.393333 0 0 0 53.333333 53.333333h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333333V437.333333a53.393333 53.393333 0 0 0-53.333334-53.333333z m0 341.333333H96a53.393333 53.393333 0 0 0-53.333333 53.333334v149.333333a53.393333 53.393333 0 0 0 53.333333 53.333333h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333333v-149.333333a53.393333 53.393333 0 0 0-53.333334-53.333334z" fill="#13227a"></path>
      </svg>
      <i id="Monitor__tip" class="ex-panel__tip"></i>
    </a>
  `;
  if (dockWrap) dockWrap.insertBefore(monitorIconEl, dockWrap.childNodes[0]);

  (0, __imports.safeBind)(".ex-monitor", "click", () => {
    (0, __imports._)(`https://www.douyuex.com/${String(__imports.B)}`);
  }, owner);

  // 异步预加载粉丝牌列表至 To
  (async () => {
    try {
      const res = await (0, __imports.fetch)("https://www.douyu.com/member/cp/getFansBadgeList", {
        method: "GET",
        mode: "no-cors",
        cache: "default",
        credentials: "include",
      });
      const htmlText = await res.text();
      const doc = new DOMParser().parseFromString(htmlText, "text/html");
      const listEl = doc.getElementsByClassName("fans-badge-list")[0]?.lastElementChild;
      if (listEl) {
        const rooms = [];
        for (let i = 0; i < listEl.children.length; i++) {
          const rId = listEl.children[i].getAttribute("data-fans-room");
          if (rId) rooms.push(rId);
        }
        __imports.To = rooms;
      }
    } catch {}
  })();

  // 3. 组装全站抽奖控制台 (.exlottery)
  const lotteryModal = document.createElement("div");
  lotteryModal.className = "exlottery";
  lotteryModal.innerHTML = `
    <div class="lottery__func">
      <div id="lottery-refresh">
        <svg class="icon" viewBox="0 0 1024 1024" width="16" height="16">
          <path d="M927.999436 531.028522a31.998984 31.998984 0 0 0-31.998984 31.998984c0 51.852948-10.147341 102.138098-30.163865 149.461048a385.47252 385.47252 0 0 1-204.377345 204.377345c-47.32295 20.016524-97.6081 30.163865-149.461048 30.163865s-102.138098-10.147341-149.461048-30.163865a385.47252 385.47252 0 0 1-204.377345-204.377345c-20.016524-47.32295-30.163865-97.6081-30.163865-149.461048s10.147341-102.138098 30.163865-149.461048a385.47252 385.47252 0 0 1 204.377345-204.377345c47.32295-20.016524 97.6081-30.163865 149.461048-30.163865a387.379888 387.379888 0 0 1 59.193424 4.533611l-56.538282 22.035878A31.998984 31.998984 0 1 0 537.892156 265.232491l137.041483-53.402685a31.998984 31.998984 0 0 0 18.195855-41.434674L639.723197 33.357261a31.998984 31.998984 0 1 0-59.630529 23.23882l26.695923 68.502679a449.969005 449.969005 0 0 0-94.786785-10.060642c-60.465003 0-119.138236 11.8488-174.390489 35.217667a449.214005 449.214005 0 0 0-238.388457 238.388457c-23.361643 55.252253-35.22128 113.925486-35.22128 174.390489s11.8488 119.138236 35.217668 174.390489a449.214005 449.214005 0 0 0 238.388457 238.388457c55.252253 23.368867 113.925486 35.217667 174.390489 35.217667s119.138236-11.8488 174.390489-35.217667A449.210393 449.210393 0 0 0 924.784365 737.42522c23.368867-55.270316 35.217667-113.925486 35.217667-174.390489a31.998984 31.998984 0 0 0-32.002596-32.006209z"></path>
        </svg>
      </div>
      <div class="lottery__notice">
        <label class="lottery__notice"><input class="lottery__notice" id="lottery-notice" type="checkbox">开启提醒</label>
      </div>
    </div>
    <div class="lottery__nodata">暂无数据</div>
    <div class="lottery__wrap"></div>
  `;

  const chatLayout = document.getElementsByClassName("layout-Player-chat")[0] || document.body;
  if (chatLayout) {
    chatLayout.insertBefore(lotteryModal, chatLayout.childNodes[0]);
  }

  // 4. 挂载 Dock【全站抽奖】入口
  const lotteryIconEl = document.createElement("div");
  lotteryIconEl.className = "ex-lottery";
  lotteryIconEl.innerHTML = `
    <a class="ex-panel__icon" title="全站抽奖信息">
      <svg style="display:block;" class="icon" viewBox="0 0 1024 1024" width="32" height="32">
        <path d="M508.858182 986.042182c-261.748364 0-473.925818-212.177455-473.925818-473.925818S247.109818 38.190545 508.858182 38.190545s473.925818 212.177455 473.925818 473.925819-212.200727 473.925818-473.925818 473.925818m0-981.690182C228.421818 4.352 1.093818 231.703273 1.093818 512.116364s227.351273 507.764364 507.764364 507.764363c280.413091 0 507.787636-227.351273 507.787636-507.764363S789.271273 4.352 508.858182 4.352" fill="#FF4517"></path>
        <path d="M322.536727 512.302545l0.023273-1.326545-313.064727-1.931636c0 1.093818-0.093091 2.164364-0.093091 3.281454 0 90.88 24.785455 175.918545 67.84 248.925091l270.173091-155.997091a185.274182 185.274182 0 0 1-24.878546-92.951273zM416.791273 350.440727L264.029091 82.013091A492.986182 492.986182 0 0 0 77.498182 262.981818l270.173091 155.997091a186.717091 186.717091 0 0 1 69.12-68.538182zM602.856727 351.697455l151.831273-259.211637A488.261818 488.261818 0 0 0 508.718545 21.690182l0.023273 304.453818c34.350545 0 66.513455 9.355636 94.114909 25.553455zM258.536727 939.450182a488.471273 488.471273 0 0 0 241.710546 63.674182c2.839273 0 5.632-0.139636 8.448-0.186182V698.507636a185.064727 185.064727 0 0 1-94.068364-25.553454l-156.090182 266.496zM927.325091 270.452364l-257.466182 148.666181a185.204364 185.204364 0 0 1 25.041455 93.207273l-0.046546 1.070546 296.168727 1.838545c0.023273-0.977455 0.069818-1.931636 0.069819-2.909091 0-87.994182-23.249455-170.496-63.767273-241.873454zM600.855273 674.094545l148.573091 261.073455a492.776727 492.776727 0 0 0 178.106181-181.387636l-257.466181-148.642909a187.042909 187.042909 0 0 1-69.213091 68.95709z" fill="#FF4517"></path>
        <path d="M644.142545 512.302545a135.400727 135.400727 0 0 0-135.424-135.400727l-84.619636-160.791273 20.642909 173.824c-42.658909 22.784-71.400727 70.609455-71.400727 122.368a135.447273 135.447273 0 0 0 270.801454 0z m-133.492363 70.097455a68.491636 68.491636 0 1 1 0.023273-136.96 68.491636 68.491636 0 0 1-0.023273 136.96z" fill="#FF4517"></path>
      </svg>
      <i id="lottery__tip" class="ex-panel__tip"></i>
    </a>
  `;
  if (dockWrap) dockWrap.insertBefore(lotteryIconEl, dockWrap.childNodes[0]);

  (0, __imports.safeBind)(".ex-lottery", "click", () => {
    (0, __imports.openFeaturePanel)("全站抽奖信息");
    const list = document.getElementsByClassName("lottery__wrap")[0];
    if (list) list.innerHTML = __imports.So;
  }, owner);

  // 节流刷新抽奖列表
  const throttleRefresh = ((fn, delay) => {
    let timer = null;
    return () => {
      if (!timer) {
        timer = owner.timeout(() => { timer = null; }, delay);
        fn();
      }
    };
  })(() => {
    (0, __imports.Lo)();
  }, 3000);

  (0, __imports.safeBind)("#lottery-refresh", "click", throttleRefresh, owner);

  const noticeCheckbox = document.getElementById("lottery-notice");
  if (noticeCheckbox) {
    owner.listen(noticeCheckbox, "click", () => {
      __imports.Mo = noticeCheckbox.checked;
      const cfg = { isNotice: __imports.Mo };
      __imports.localStorage.setItem("ExSave_Lottery", JSON.stringify(cfg));
    });
  }

  // 读取持久化抽奖配置
  try {
    const saved = JSON.parse(__imports.localStorage.getItem("ExSave_Lottery") || "{}");
    if (saved.isNotice === true) {
      const cb = document.getElementById("lottery-notice");
      if (cb) cb.click();
    }
  } catch {}

  // 启动 60 秒轮询抽奖
  __imports.No = owner.interval(() => {
    (0, __imports.Lo)();
  }, 60000);

  // 5. 挂载 Dock【同屏播放】入口
  const popupIconEl = document.createElement("div");
  popupIconEl.className = "popup-player";
  popupIconEl.innerHTML = `
    <a class="ex-panel__icon" title="同屏播放">
      <svg style="display:block;" class="icon" viewBox="0 0 1024 1024" width="30" height="30">
        <path d="M353.024 900.416H109.952c-57.856 0-109.952-46.336-109.952-98.432V153.6c0-52.096 52.096-98.432 109.952-98.432h810.176c57.856 0 104.192 46.336 104.192 98.496v185.472c0 28.928-23.168 52.096-46.336 52.096s-46.272-23.168-46.272-52.096V159.36H98.368V807.68h248.896c34.688 0 52.032 17.408 52.032 46.336 0 28.928-17.344 46.272-46.272 46.272" fill="#f26b1f"></path>
        <path d="M619.2 631.488c-5.76 0-5.76 5.76-5.76 11.52v223.04c0 5.76 5.76 11.52 5.76 11.52h289.344c5.76 0 11.584-5.76 11.584-11.52v-222.976c0-5.824-5.76-11.584-11.52-11.584H619.136z m289.344 338.688h-289.28a103.68 103.68 0 0 1-104.192-104.128v-222.976c0-57.92 46.272-109.952 104.128-109.952h289.344c57.856 0 104.128 46.272 104.128 109.952v222.976c5.824 57.856-40.448 104.128-104.128 104.128z" fill="#f26b1f"></path>
      </svg>
      <i id="popup-player__tip" class="ex-panel__tip"></i>
    </a>
  `;
  if (dockWrap) dockWrap.insertBefore(popupIconEl, dockWrap.childNodes[0]);

  (0, __imports.safeBind)(".popup-player", "click", (e) => {
    e?.stopPropagation?.();
    (0, __imports.handleDockAction)("popup-player");
  }, owner);
}

}
