function* (__imports) {
yield {"mountBloopPanel": { get: () => mountBloopPanel, set: value => { mountBloopPanel = value; } }};
/**
 * 弹幕发送小助手 (Bloop) 380×370px 独立控制台与工具栏装配
 * @param {object} owner - 房间装配生命周期托管者
 */
function mountBloopPanel(owner) {
  let runGeneration = 0;

  const stopSending = () => {
    runGeneration++;
    (0, __imports.clearTimeout)(__imports.ge);
    (0, __imports.clearTimeout)(__imports.ve);
  };
  owner.own(stopSending);

  // 1. 在弹幕工具栏挂载前缀控制按钮
  const refreshBarrageBtn = document.createElement("a");
  refreshBarrageBtn.className = "refresh-barrage";
  refreshBarrageBtn.id = "refresh-barrage";
  refreshBarrageBtn.innerHTML = `
    <svg t="1588051109604" id="refresh-barrage__svg" class="icon" viewBox="0 0 1024 1024" width="16" height="16">
      <path d="M588.416 516.096L787.2 317.312a54.016 54.016 0 1 0-76.416-76.416L512 439.68 313.216 241.024A54.016 54.016 0 1 0 236.8 317.376l198.784 198.848-198.016 197.888a54.016 54.016 0 1 0 76.416 76.416L512 592.576l197.888 197.952a54.016 54.016 0 1 0 76.416-76.416L588.416 516.096z" fill="#AFAFAF"></path>
    </svg>
    <i class="Barrage-toolbarIcon"></i>
    <span id="refresh-barrage__text" class="Barrage-toolbarText">前缀</span>
  `;

  const toolbar = document.getElementsByClassName("Barrage-toolbar")[0];
  if (toolbar) {
    toolbar.insertBefore(refreshBarrageBtn, toolbar.childNodes[0]);
  }

  (0, __imports.safeBind)("#refresh-barrage", "click", () => {
    if (__imports.mn === 0) {
      (0, __imports.un)();
      (0, __imports.pn)();
    } else {
      (0, __imports.U)("Ex_Style_RefreshBarrage");
      __imports.mn = 0;
      document.getElementById("refresh-barrage")?.classList.remove("ex-active");
      const textEl = document.getElementById("refresh-barrage__text");
      if (textEl) {
        textEl.style.color = "";
        textEl.innerText = "前缀";
      }
      const svgPath = document.getElementById("refresh-barrage__svg")?.getElementsByTagName("path")[0];
      if (svgPath) {
        svgPath.setAttribute("fill", "#AFAFAF");
      }
      (0, __imports.pn)();
    }
  }, owner);

  // 恢复前缀激活状态
  try {
    const savedRefresh = JSON.parse(__imports.localStorage.getItem("ExSave_Refresh") || "{}");
    if (savedRefresh?.barrage?.status === true) {
      (0, __imports.un)();
    }
  } catch {}

  // 2. 组装 Bloop 控制台主体 DOM
  const bloopPanel = document.createElement("div");
  bloopPanel.className = "bloop";
  bloopPanel.innerHTML = `
    <div class="bloop__header_card">
      <label class="bloop__header_label">弹幕：</label>
      <select id="bloop__select"></select>
      <input type="button" id="bloop__save" value="保存"/>
      <input type="button" id="bloop__delete" value="删除"/>
    </div>
    <div class="bloop__textarea_card">
      <textarea placeholder="一行一个，开启舔狗模式后此处不需要输入" id="bloop__textarea" rows="4"></textarea>
    </div>
    <div class="bloop__setting_card">
      <div class="bloop__setting_row">
        <label>速度(ms)：</label>
        <input id="bloop__text_speed1" type="text" style="width:48px;text-align:center;" value="2000" />~<input id="bloop__text_speed2" type="text" style="width:48px;text-align:center;" value="3000" />
      </div>
      <div class="bloop__setting_row">
        <label>限时(min)：</label>
        <input id="bloop__text_stoptime" type="text" style="width:48px;text-align:center;" value="1" />
      </div>
    </div>
    <div class="bloop__options_card">
      <label><input id="bloop__checkbox_changeColor" type="checkbox" name="checkbox_changeColor" checked>自动变色</label>
      <label><input id="bloop__checkbox_tiangou" type="checkbox">舔狗模式</label>
      <label><input id="bloop__checkbox_random" type="checkbox">随机发送</label>
    </div>
    <div class="bloop__switch_card">
      <label class="bloop__switch_label"><input id="bloop__checkbox_startSend" type="checkbox">开始发送</label>
    </div>
  `;

  const chatContainer = document.getElementsByClassName("layout-Player-chat")[0] || document.body;
  if (chatContainer) {
    chatContainer.insertBefore(bloopPanel, chatContainer.childNodes[0]);
  }

  // 3. 在 Dock 容器挂载对应图标
  const dockIcon = document.createElement("div");
  dockIcon.className = "bloop-icon";
  dockIcon.innerHTML = `
    <a class="ex-panel__icon" title="弹幕发送小助手">
      <svg style="display: block;" class="icon" viewBox="0 0 1024 1024" width="32" height="32">
        <path d="M511.99883605 1020.07740302c-68.78771655 0-135.53209458-13.47788003-198.38074083-40.06106453-60.69004402-25.67037725-115.18953131-62.41203655-161.98371328-109.20738247-46.79418197-46.79301803-83.53700523-101.29366926-109.20621853-161.98371328C15.84497778 645.97776043 2.36709774 579.23105337 2.36709774 510.4445019s13.47904398-135.53209458 40.06106453-198.38074083c25.6692133-60.69004402 62.41203655-115.18953131 109.20621853-161.98371328 46.79534706-46.79418197 101.29366926-83.53700523 161.98371328-109.20621853 62.84864739-26.5831845 129.59418937-40.06106453 198.38074083-40.06106453 68.78771655 0 135.53209458 13.47904398 198.38190592 40.06106453 60.69004402 25.6692133 115.18953131 62.41203655 161.98487723 109.20621853 46.79301803 46.79418197 83.53584128 101.29366926 109.20621853 161.98371328 26.5831845 62.84864739 40.06106453 129.59418937 40.06106453 198.38074083s-13.47788003 135.53325853-40.06106453 198.38074084c-25.67037725 60.69004402-62.41203655 115.19069525-109.20621853 161.98371328-46.79534706 46.79418197-101.29483435 83.53817031-161.98487723 109.20738247C647.53092949 1006.59952413 580.78655147 1020.07740302 511.99883605 1020.07740302z" fill="#1296db"></path>
      </svg>
      <i id="bloop__tip" class="ex-panel__tip"></i>
    </a>
  `;

  const dockWrap = document.getElementsByClassName("ex-panel__wrap")[0];
  if (dockWrap) {
    dockWrap.insertBefore(dockIcon, dockWrap.childNodes[0]);
  }

  (0, __imports.safeBind)(".bloop-icon", "click", () => {
    (0, __imports.openFeaturePanel)("弹幕发送小助手");
  }, owner);

  (0, __imports.safeBind)("#bloop__checkbox_changeColor", "click", () => {
    __imports.ye = (0, __imports.safeEl)("bloop__checkbox_changeColor").checked;
  }, owner);

  // 4. 开始发送状态机调度
  (0, __imports.safeBind)("#bloop__checkbox_startSend", "click", () => {
    stopSending();
    const generation = runGeneration;

    if ((0, __imports.safeEl)("bloop__checkbox_startSend").checked) {
      __imports.pe.length = 0;
      __imports.ue = 0;
      const textVal = document.getElementById("bloop__textarea")?.value || "";
      __imports.pe = textVal.split("\n");
      __imports.ue = __imports.pe.length - 1;

      // 提取颜色配置
      __imports.ce.length = 0;
      __imports.me = 0;
      const fansSwitcher = document.getElementsByClassName("FansBarrageSwitcher");
      const nobleSwitcherActive = document.getElementsByClassName("NobleBarrageSwitcher is-active");
      const hasActiveNoble = nobleSwitcherActive.length > 0;

      let colorItems = [];
      if (fansSwitcher.length === 0) {
        __imports.be = true;
        const matchSwitcher = document.getElementsByClassName("MatchSystemFansBarrageSwitcher")[0];
        if (matchSwitcher) {
          matchSwitcher.click();
          colorItems = document.getElementsByClassName("MatchSystemFansBarrageColor-item");
        } else {
          __imports.be = false;
        }
      } else {
        fansSwitcher[0].click();
        colorItems = document.getElementsByClassName("FansBarrageColor-item");
        __imports.be = false;
      }

      for (let i = 0; i < colorItems.length; i++) {
        if (!colorItems[i].className.includes("is-lock")) {
          __imports.ce.push(i);
          __imports.me++;
        }
      }
      __imports.me--;
      if (hasActiveNoble) {
        document.getElementsByClassName("NobleBarrageSwitcher")[0]?.click();
      }

      const isRandom = document.getElementById("bloop__checkbox_random")?.checked;
      if (isRandom) {
        __imports.he = Math.floor(Math.random() * __imports.pe.length);
        __imports.fe = Math.floor(Math.random() * __imports.ce.length);
      } else {
        __imports.he = 0;
      }

      (0, __imports.ke)();
      __imports.ge = owner.timeout(() => (0, __imports.Ee)(owner, () => generation === runGeneration), (0, __imports._e)());

      const stopMinutes = Number((0, __imports.safeEl)("bloop__text_stoptime").value) || 1;
      __imports.ve = owner.timeout(() => {
        if (generation !== runGeneration) return;
        (0, __imports.safeEl)("bloop__checkbox_startSend").checked = false;
        stopSending();
      }, stopMinutes * 60 * 1000);
    } else {
      (0, __imports.clearTimeout)(__imports.ge);
      (0, __imports.clearTimeout)(__imports.ve);
    }
  }, owner);

  (0, __imports.safeBind)("#bloop__checkbox_tiangou", "click", () => {
    const isTiangou = (0, __imports.safeEl)("bloop__checkbox_tiangou").checked;
    (0, __imports.safeEl)("bloop__textarea").disabled = isTiangou;
    (0, __imports.ke)();
  }, owner);

  const selectEl = (0, __imports.safeEl)("bloop__select");
  if (selectEl) {
    selectEl.onclick = function () {
      if (this.options.length !== 0) {
        const textarea = document.getElementById("bloop__textarea");
        if (textarea) {
          textarea.value = this.options[this.selectedIndex].text.replace(/\\r/g, "\r");
        }
      }
    };
  }

  (0, __imports.safeBind)("#bloop__save", "click", () => {
    const sel = document.getElementById("bloop__select");
    const val = document.getElementById("bloop__textarea")?.value || "";
    if (val !== "" && sel) {
      __imports.xe.push(val);
      sel.options.add(new Option(val.replace(/\n/g, "\\r"), true));
      (0, __imports.ke)();
    }
  }, owner);

  (0, __imports.safeBind)("#bloop__delete", "click", () => {
    const sel = document.getElementById("bloop__select");
    const opt = sel?.options[sel.selectedIndex];
    if (opt) {
      const text = opt.text;
      __imports.xe = __imports.xe.filter(item => item !== text);
      sel.options.remove(sel.selectedIndex);
      (0, __imports.ke)();
    }
  }, owner);

  // 恢复本地保存配置
  try {
    const savedConf = JSON.parse(__imports.localStorage.getItem("ExSave_BarrageLoopOptions") || "null");
    if (savedConf) {
      savedConf.speed1 = savedConf.speed1 ?? 2000;
      savedConf.speed2 = savedConf.speed2 ?? 3000;
      savedConf.stopTime = savedConf.stopTime ?? 5;
      savedConf.isTiangouMode = savedConf.isTiangouMode ?? false;

      const sel = document.getElementById("bloop__select");
      if (sel && Array.isArray(savedConf.text)) {
        savedConf.text.forEach(item => {
          sel.options.add(new Option(item.replace(/\r/g, "\\r"), ""));
        });
      }

      __imports.xe = savedConf.text || [];
      (0, __imports.safeEl)("bloop__checkbox_changeColor").checked = Boolean(savedConf.isChangeColor);
      __imports.ye = Boolean(savedConf.isChangeColor);
      (0, __imports.safeEl)("bloop__text_speed1").value = savedConf.speed1;
      (0, __imports.safeEl)("bloop__text_speed2").value = savedConf.speed2;
      (0, __imports.safeEl)("bloop__text_stoptime").value = savedConf.stopTime;

      if (savedConf.isTiangouMode) {
        (0, __imports.safeEl)("bloop__checkbox_tiangou").checked = true;
        (0, __imports.safeEl)("bloop__textarea").disabled = true;
      }
    }
  } catch {}
}

}
