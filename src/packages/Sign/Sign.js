function initPkg_Sign() {
  initPkg_Sign_Dom();
  initPkg_Sign_Func();
  // 「看直播领积分」不是点一次的活儿，而是常驻计时：勾选后即使不打开签到面板也要跑，
  // 所以在这里按已存配置引导一次（没勾选则完全不启动，零开销）
  if (typeof Sign_WatchPoints_boot === "function") Sign_WatchPoints_boot();
}

function initPkg_Sign_Dom() {
  Sign_insertIcon();
}

function Sign_insertIcon() {
  let a = document.createElement("div");
  a.className = "ex-sign";
  a.innerHTML = '<a class="ex-panel__icon" title="一键签到"><svg style="display: block;" t="1578566545259" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12959" width="32" height="32"><path d="M698.368 80.896v114.688c0 23.552 19.968 43.008 44.032 43.008s44.032-19.456 44.032-43.008V80.896c0-23.552-19.968-43.008-44.032-43.008s-44.032 18.944-44.032 43.008zM227.328 80.896v114.688c0 23.552 19.968 43.008 44.032 43.008 24.576 0 44.032-19.456 44.032-43.008V80.896c0-23.552-19.968-43.008-44.032-43.008-24.576 0-44.032 18.944-44.032 43.008z" fill="#F96C5D" p-id="12960"></path><path d="M977.92 195.584c0-23.552-19.968-43.008-44.032-43.008h-88.576v43.008c0 55.296-46.08 100.352-102.912 100.352s-102.912-45.056-102.912-100.352v-43.008H374.272v43.008c0 55.296-46.08 100.352-102.912 100.352-56.832 0-102.912-45.056-102.912-100.352v-43.008H79.872c-24.576 0-44.032 19.456-44.032 43.008v611.328l252.928-145.92-8.192-8.192c-10.24-9.728-16.384-23.552-16.384-38.4 0-29.696 25.088-54.272 55.808-54.272 15.36 0 29.184 6.144 39.424 15.872l28.16 27.648L977.92 263.168V195.584z" fill="#F96C5D" p-id="12961"></path><path d="M329.216 278.528c-5.632 3.584-11.264 6.656-17.408 9.216 5.632-2.56 11.776-5.632 17.408-9.216zM344.064 266.24c4.608-4.608 8.704-9.728 12.8-14.848-3.584 5.632-8.192 10.24-12.8 14.848zM329.216 278.528c5.632-3.584 10.752-7.68 15.36-12.288-5.12 4.608-10.24 8.704-15.36 12.288zM449.536 664.064l220.16-214.016c10.24-9.728 24.064-15.872 39.424-15.872 30.72 0 55.808 24.064 55.808 54.272 0 14.848-6.144 28.672-16.384 38.4l-259.072 252.416c-10.24 9.728-24.064 15.872-39.424 15.872s-29.184-6.144-39.424-15.872l-121.344-118.272L35.84 806.912v104.96c0 23.552 19.968 43.008 44.032 43.008h854.016c24.576 0 44.032-19.456 44.032-43.008V263.168L387.584 603.648l61.952 60.416zM350.72 569.856c-4.608-3.072-9.216-5.12-14.336-6.656 5.12 1.024 10.24 3.584 14.336 6.656zM271.36 295.936c14.336 0 27.648-2.56 39.936-7.68-12.288 4.608-25.6 7.68-39.936 7.68z" fill="#F15A4A" p-id="12962"></path></svg><i id="ex-sign__tip" class="ex-panel__tip"></i></a>';
  let b = document.getElementsByClassName("ex-panel__wrap")[0];
  if (b) b.insertBefore(a, b.childNodes[0]);
}

function initPkg_Sign_Func() {
  let btn = document.getElementsByClassName("ex-sign")[0];
  if (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      let panel = document.querySelector(".sign-panel");
      if (!panel) {
        createSignPanel();
        panel = document.querySelector(".sign-panel");
      }
      if (panel) {
        let isShowing = panel.style.display === "flex" || panel.style.display === "block";
        if (isShowing) {
          panel.style.removeProperty("display");
          panel.style.setProperty("display", "none", "important");
          panel.classList.remove("miuix-modal-in");
          if (typeof updateDockActiveIndicator === "function") updateDockActiveIndicator();
        } else {
          if (typeof openMiuixPanelCentered === "function") {
            openMiuixPanelCentered(panel, btn);
          } else {
            panel.style.setProperty("display", "flex", "important");
          }
        }
      }
    });
  }
}

function createSignPanel() {
  var oldPanel = document.querySelector(".sign-panel");
  if (oldPanel) return;

  var p = document.createElement("div");
  p.className = "sign-panel miuix-modal";
  p.innerHTML = `
      <div class="fans-panel__card">
        <div class="fans-panel__card-header">
          <span class="fans-panel__card-title">签到选项</span>
          <span style="font-size: 11px; color: #64748b;">按需勾选日常任务</span>
        </div>
        <div class="sign-options-list">
          <label class="sign-option-item">
            <input type="checkbox" id="sign_opt_room" class="sign-checkbox" data-key="room">
            <div class="sign-option-text">
              <span class="sign-option-title">房间与粉丝牌签到</span>
              <span class="sign-option-desc">为所有关注与拥牌房间赠送亲密度</span>
            </div>
          </label>
          <label class="sign-option-item">
            <input type="checkbox" id="sign_opt_client" class="sign-checkbox" data-key="client">
            <div class="sign-option-text">
              <span class="sign-option-title">客户端模拟签到</span>
              <span class="sign-option-desc">模拟手机客户端领取每日免费礼盒</span>
            </div>
          </label>
          <label class="sign-option-item">
            <input type="checkbox" id="sign_opt_yuba" class="sign-checkbox" data-key="yuba">
            <div class="sign-option-text">
              <span class="sign-option-title">关注鱼吧签到</span>
              <span class="sign-option-desc">关注的所有鱼吧一键打卡领经验</span>
            </div>
          </label>
          <label class="sign-option-item">
            <input type="checkbox" id="sign_opt_stardiscover" class="sign-checkbox" data-key="stardiscover">
            <div class="sign-option-text">
              <span class="sign-option-title">星推日常任务</span>
              <span class="sign-option-desc">打卡/口令弹幕/关注任务(自动安全取关)</span>
            </div>
          </label>
          <label class="sign-option-item">
            <input type="checkbox" id="sign_opt_fanshome" class="sign-checkbox" data-key="fanshome">
            <div class="sign-option-text">
              <span class="sign-option-title">粉丝家园与日常</span>
              <span class="sign-option-desc">粉丝家园打卡与钻粉日常领奖</span>
            </div>
          </label>
          <label class="sign-option-item">
            <input type="checkbox" id="sign_opt_points" class="sign-checkbox" data-key="points">
            <div class="sign-option-text">
              <span class="sign-option-title">活动中心签到领积分</span>
              <span class="sign-option-desc">每日签到并领取签到礼包（需登录）</span>
            </div>
          </label>
          <label class="sign-option-item">
            <input type="checkbox" id="sign_opt_watchpoints" class="sign-checkbox" data-key="watchpoints">
            <div class="sign-option-text">
              <span class="sign-option-title">看直播领积分（自动）</span>
              <span class="sign-option-desc">本页观看时长达标后自动领取，仅页面可见时计时</span>
            </div>
          </label>
        </div>
      </div>

      <div class="fans-panel__card">
        <div class="fans-panel__card-header">
          <span class="fans-panel__card-title">执行状态</span>
          <span class="sign-status-tag" id="sign-status-tag">就绪</span>
        </div>
        <div class="sign-log-box" id="sign-log-box">
          勾选上方选项后，点击下方按钮开始签到。
        </div>
      </div>

      <div class="fans-panel__action-wrap">
        <button type="button" class="ex-btn-primary fans-panel__submit-btn" id="sign-panel-start-btn">
          开始签到
        </button>
      </div>
  `;
  document.body.appendChild(p);
  if (typeof ensureMiuixPanelHeader === "function") {
    ensureMiuixPanelHeader(p, "一键签到");
  }

  var defCfg = { room: true, client: true, yuba: true, fanshome: true, stardiscover: true, points: true, watchpoints: false };
  var currentCfg = defCfg;
  try {
    var saved = JSON.parse(localStorage.getItem("ExSave_SignConfig"));
    if (saved && typeof saved === "object") currentCfg = Object.assign({}, defCfg, saved);
  } catch (e) {}

  var cbs = p.querySelectorAll(".sign-checkbox");
  cbs.forEach(function (cb) {
    var key = cb.getAttribute("data-key");
    if (key && typeof currentCfg[key] !== "undefined") {
      cb.checked = !!currentCfg[key];
    }
    cb.addEventListener("change", function () {
      currentCfg[key] = this.checked;
      try {
        localStorage.setItem("ExSave_SignConfig", JSON.stringify(currentCfg));
      } catch (e) {}
      // 看播积分是常驻项：勾上就立刻开始计时，取消就立刻停，不必等重开页面
      if (key === "watchpoints" && typeof Sign_WatchPoints_setEnabled === "function") {
        Sign_WatchPoints_setEnabled(this.checked);
      }
    });
  });

  var startBtn = p.querySelector("#sign-panel-start-btn");
  if (startBtn) {
    startBtn.addEventListener("click", async function (e) {
      e.stopPropagation();
      var btn = document.getElementById("sign-panel-start-btn");
      var logBox = document.getElementById("sign-log-box");
      var statusTag = document.getElementById("sign-status-tag");

      if (btn) btn.disabled = true;
      if (statusTag) {
        statusTag.textContent = "正在执行";
        statusTag.style.color = "#ff7700";
      }
      if (logBox) logBox.innerHTML = "正在启动已选签到任务...<br>";

      var logs = [];
      function appendLog(msg, isSuccess) {
        logs.push(msg);
        if (logBox) {
          logBox.innerHTML = logs.map(function (l) { return "• " + l; }).join("<br>");
          logBox.scrollTop = logBox.scrollHeight;
        }
        if (typeof showMessage === "function") {
          showMessage(msg, isSuccess ? "success" : "info");
        }
      }

      try {
        await executeSignEngine(currentCfg, appendLog);
        if (statusTag) {
          statusTag.textContent = "已完成";
          statusTag.style.color = "#10b981";
        }
      } catch (err) {
        appendLog("签到执行异常: " + (err.message || "未知错误"), false);
        if (statusTag) {
          statusTag.textContent = "异常中止";
          statusTag.style.color = "#ef4444";
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }
}

async function executeSignEngine(options, onLog) {
  if (typeof onLog !== "function") {
    onLog = function (msg, isSuccess) {
      showMessage(msg, isSuccess ? "success" : "info");
    };
  }
  var opts = options || { room: true, client: true, yuba: true, fanshome: true, stardiscover: true, points: true, watchpoints: false };

  onLog("正在准备签到环境...", true);

  // 1. 鱼吧签到
  if (opts.yuba) {
    try {
      onLog("正在执行【鱼吧签到】...");
      if (typeof signYubaFast === "function") {
        signYubaFast();
      }
      if (typeof signYubaList === "function") {
        signYubaList();
      }
      onLog("【鱼吧签到】已发送打卡请求", true);
    } catch (err) {
      onLog("【鱼吧签到】异常: " + (err.message || "未知错误"), false);
    }
  }

  // 2. 客户端模拟签到
  if (opts.client) {
    try {
      onLog("正在执行【客户端模拟签到】...");
      await new Promise(function (resolve) {
        GM_xmlhttpRequest({
          method: "POST",
          url: "https://apiv2.douyucdn.cn/h5nc/sign/sendSign",
          data: "token=" + (typeof dyToken !== "undefined" ? dyToken : getToken()),
          responseType: "json",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          onload: function (res) {
            var o = res.response || {};
            if (o.data && o.data.sign_pl && o.data.sign_pl.length > 0) {
              var items = o.data.sign_pl.map(function (it) { return it.cnt + "个" + it.name; }).join(", ");
              onLog("【客户端签到】获得: " + items, true);
            } else if (o.data && o.data.length === 0) {
              onLog("【客户端签到】今日已签到", true);
            } else {
              onLog("【客户端签到】打卡成功", true);
            }
            resolve();
          },
          onerror: function () {
            onLog("【客户端签到】请求失败", false);
            resolve();
          }
        });
      });
    } catch (err) {
      onLog("【客户端签到】执行异常", false);
    }
  }

  // 3. 房间与粉丝牌签到
  if (opts.room) {
    try {
      onLog("正在获取关注房间列表执行签到...");
      if (typeof signAllRoom === "function") {
        signAllRoom(true);
        onLog("【房间签到】已分发房间签到任务", true);
      }
    } catch (err) {
      onLog("【房间签到】执行异常: " + (err.message || "未知错误"), false);
    }
  }

  // 4. 星推日常任务全景自动化
  if (opts.stardiscover) {
    try {
      if (typeof executeStarDiscoverSign === "function") {
        await executeStarDiscoverSign(onLog);
      }
    } catch (err) {
      onLog("【星推任务】执行异常: " + (err.message || "未知错误"), false);
    }
  }

  // 5. 粉丝家园打卡
  if (opts.fanshome) {
    try {
      if (typeof initPkg_Sign_FansTree === "function") {
        initPkg_Sign_FansTree();
      }
      if (typeof initPkg_Sign_SuperFans === "function") {
        initPkg_Sign_SuperFans();
      }
      onLog("【粉丝家园】打卡流程已触发", true);
    } catch (err) {
      onLog("【粉丝家园】执行异常", false);
    }
  }

  // 6. 活动中心签到领积分（签到 + 签到礼包）
  if (opts.points) {
    try {
      if (typeof executeSignPoints === "function") {
        await executeSignPoints(onLog);
      } else {
        onLog("【积分签到】模块未加载，已跳过", false);
      }
    } catch (err) {
      onLog("【积分签到】执行异常: " + (err.message || "未知错误"), false);
    }
  }

  // 7. 看直播领积分：本身是常驻轮询（观看时长由服务端统计，脚本只负责达标即领），
  //    这里负责"开关对齐 + 立刻查一次"。点「开始签到」是明确的用户意向，
  //    此时顺手把已经达标、还没领的档位领掉。
  try {
    if (typeof Sign_WatchPoints_setEnabled === "function") {
      Sign_WatchPoints_setEnabled(!!opts.watchpoints);
      if (opts.watchpoints) {
        onLog("【看播积分】自动领取已启动（仅页面可见时轮询）", true);
        if (typeof Sign_WatchPoints_checkNow === "function") Sign_WatchPoints_checkNow();
      } else {
        onLog("【看播积分】未勾选，本次不启用", false);
      }
    }
  } catch (err) {
    onLog("【看播积分】启动异常: " + (err.message || "未知错误"), false);
  }

  onLog("所有已选签到任务执行完毕！", true);
}

window.createSignPanel = createSignPanel;
