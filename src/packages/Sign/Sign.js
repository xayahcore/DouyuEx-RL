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
  /* 主按钮「开始签到」常驻面板底部（与同屏面板一致）：签到选项多时内容要滚动，
     按钮必须始终可见可点。只能内联样式 —— 操作区有"只允许一条统一 CSS 规则"的构建护栏。 */
  if (typeof ExUI_stickActionBar === "function") ExUI_stickActionBar(p);

  // room（房间与粉丝牌签到）已整条移除：斗鱼把 /japi/roomuserlevel/apinc/checkIn 下线了，
  // 留着只会给每个关注房间刷一条 error=8，见 2026-10-30 Greasy Fork 反馈 #342901。
  var defCfg = { client: true, yuba: true, fanshome: true, stardiscover: true, points: true, watchpoints: false };
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
        // executeSignEngine 现在会等每个子任务真的结束，并返回 { ok, fail, results }
        var summary = await executeSignEngine(currentCfg, appendLog);
        var failedCount = (summary && summary.fail) ? summary.fail : 0;
        if (statusTag) {
          statusTag.textContent = failedCount > 0 ? "部分失败" : "已完成";
          statusTag.style.color = failedCount > 0 ? "#ef4444" : "#10b981";
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
  var opts = options || { client: true, yuba: true, fanshome: true, stardiscover: true, points: true, watchpoints: false };

  onLog("正在准备签到环境...", true);

  // 每个子任务把真实结果记在这里，末尾按计数汇报（不再无条件宣布「已完成」）
  var results = [];
  // skipped = 今日已签到 / 接口已下线 / 非粉丝 这类「不算失败也不该刷红」的条目
  function pushResult(name, ok, fail, skipped) {
    results.push({ name: name, ok: Number(ok) || 0, fail: Number(fail) || 0, skipped: Number(skipped) || 0 });
  }

  // 1. 鱼吧签到
  if (opts.yuba) {
    try {
      onLog("正在执行【鱼吧签到】...");
      // signYubaList 返回的是**批次结果**（会等到这一批全部落地或放弃）；
      // 极速签到由它内部在拿到鱼吧列表后触发一次，这里不再重复调用。
      var yubaRes = (typeof signYubaList === "function") ? await signYubaList() : null;
      if (!yubaRes) {
        pushResult("鱼吧签到", 0, 1);
        onLog("【鱼吧签到】模块未加载，已跳过", false);
      } else if (yubaRes.listFailed) {
        pushResult("鱼吧签到", 0, 1);
      } else {
        pushResult("鱼吧签到", yubaRes.signed, yubaRes.failed);
        onLog("【鱼吧签到】成功 " + yubaRes.signed + " 个，已签到 " + yubaRes.already + " 个" +
          (yubaRes.failed > 0 ? "，失败 " + yubaRes.failed + " 个" : ""), yubaRes.failed === 0);
      }
    } catch (err) {
      pushResult("鱼吧签到", 0, 1);
      onLog("【鱼吧签到】异常: " + (err.message || "未知错误"), false);
    }
  }

  // 2. 客户端模拟签到
  if (opts.client) {
    try {
      onLog("正在执行【客户端模拟签到】...");
      // 旧实现：手写 Promise + 只有 onload/onerror，没有 timeout。
      // 连接被黑洞（代理断流、网关静默丢包）时 GM 一个回调都不给 → await 永挂 →
      // 下面 finally 里的按钮复位永远执行不到，用户只能刷新页面。
      // 现在：ExGuard_xhr 负责 onerror/ontimeout/同步抛错（并带 GM 自己的 timeout），
      // ExGuard_withTimeout 再补一层本地硬上限，双保险保证一定会走到 finally。
      var signRes = await ExGuard_withTimeout(ExGuard_xhr({
        method: "POST",
        url: "https://apiv2.douyucdn.cn/h5nc/sign/sendSign",
        data: "token=" + (typeof dyToken !== "undefined" ? dyToken : getToken()),
        responseType: "json",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        tag: "客户端签到"
      }, 15000), 16000, "客户端签到");
      if (!signRes) {
        pushResult("客户端签到", 0, 1);
        onLog("【客户端签到】请求失败或超时（已跳过，不影响其它签到项）", false);
      } else if (signRes.data && signRes.data.sign_pl && signRes.data.sign_pl.length > 0) {
        var items = signRes.data.sign_pl.map(function (it) { return it.cnt + "个" + it.name; }).join(", ");
        pushResult("客户端签到", 1, 0);
        onLog("【客户端签到】获得: " + items, true);
      } else if (signRes.data && signRes.data.length === 0) {
        pushResult("客户端签到", 1, 0);
        onLog("【客户端签到】今日已签到", true);
      } else {
        pushResult("客户端签到", 1, 0);
        onLog("【客户端签到】打卡成功", true);
      }
    } catch (err) {
      pushResult("客户端签到", 0, 1);
      onLog("【客户端签到】执行异常", false);
    }
  }

  // 3. 房间与粉丝牌签到：斗鱼已下线该接口（2026-10-30 实测 error=8「功能已下线」，钻粉 userSign 也 404），
  //    整条功能已移除 —— 签到面板不再提供这个勾选项，也不再往关注房间列表发任何请求。

  // 4. 星推日常任务全景自动化
  if (opts.stardiscover) {
    try {
      if (typeof executeStarDiscoverSign === "function") {
        var sdRes = await executeStarDiscoverSign(onLog);
        pushResult("星推任务", sdRes && sdRes.ok, sdRes && sdRes.fail);
      } else {
        pushResult("星推任务", 0, 1);
        onLog("【星推任务】模块未加载，已跳过", false);
      }
    } catch (err) {
      pushResult("星推任务", 0, 1);
      onLog("【星推任务】执行异常: " + (err.message || "未知错误"), false);
    }
  }

  // 5. 粉丝家园打卡
  if (opts.fanshome) {
    try {
      var fansOk = 0;
      var fansFail = 0;
      var fansSkip = 0;
      if (typeof initPkg_Sign_FansTree === "function") {
        var treeRes = await initPkg_Sign_FansTree();
        fansOk += (treeRes && treeRes.ok) || 0;
        fansFail += (treeRes && treeRes.fail) || 0;
        fansSkip += (treeRes && treeRes.skipped) || 0;
      }
      // 钻粉联赛签到已整条移除：/japi/interactnc/web/dfansact/userSign 实测 404，接口没了。
      pushResult("粉丝家园", fansOk, fansFail, fansSkip);
      onLog("【粉丝家园】成功 " + fansOk + " 个" + (fansFail > 0 ? "，失败 " + fansFail + " 个" : ""), fansFail === 0);
    } catch (err) {
      pushResult("粉丝家园", 0, 1);
      onLog("【粉丝家园】执行异常", false);
    }
  }

  // 6. 活动中心签到领积分（签到 + 签到礼包）
  if (opts.points) {
    try {
      if (typeof executeSignPoints === "function") {
        var pointsOk = await executeSignPoints(onLog);
        pushResult("积分签到", pointsOk ? 1 : 0, pointsOk ? 0 : 1);
      } else {
        pushResult("积分签到", 0, 1);
        onLog("【积分签到】模块未加载，已跳过", false);
      }
    } catch (err) {
      pushResult("积分签到", 0, 1);
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

  var totalOk = 0;
  var totalFail = 0;
  var totalSkip = 0;
  for (var ri = 0; ri < results.length; ri++) {
    totalOk += results[ri].ok;
    totalFail += results[ri].fail;
    totalSkip += results[ri].skipped || 0;
  }
  var failedNames = results.filter(function (x) { return x.fail > 0; }).map(function (x) { return x.name; });
  // 「跳过项」= 今日已签到 / 接口已下线 / 非粉丝：不再混进失败数里刷红
  var skipNote = totalSkip > 0 ? "，跳过 " + totalSkip + " 项（已签到/已下线/非粉丝）" : "";
  if (totalFail > 0) {
    onLog("签到结束：成功 " + totalOk + " 项，失败 " + totalFail + " 项（" + failedNames.join("、") + "）" + skipNote, false);
  } else if (totalSkip > 0) {
    onLog("签到结束：成功 " + totalOk + " 项" + skipNote + "，没有失败项", true);
  } else {
    onLog("所有已选签到任务执行完毕！", true);
  }
  return { ok: totalOk, fail: totalFail, skipped: totalSkip, results: results };
}

window.createSignPanel = createSignPanel;
