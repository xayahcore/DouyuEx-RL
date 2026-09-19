function* (__imports) {
yield {"createSignPanel": { get: () => createSignPanel, set: value => { createSignPanel = value; } }};
function createSignPanel() {
  if (document.querySelector(".sign-panel")) return;
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
                        <span class="sign-option-desc">为所有关注/拥牌房间赠送亲密度</span>
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
                        <span class="sign-option-desc">打卡/口令弹幕/关注任务(完成自动安全取关)</span>
                    </div>
                </label>
                <label class="sign-option-item">
                    <input type="checkbox" id="sign_opt_fanshome" class="sign-checkbox" data-key="fanshome">
                    <div class="sign-option-text">
                        <span class="sign-option-title">粉丝家园与钻粉联赛</span>
                        <span class="sign-option-desc">粉丝家园打卡与钻粉日常领奖</span>
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
  (0, __imports.ensureMiuixPanelHeader)(p, "一键签到");

  // 状态与配置持久化
  var defCfg = {
    room: true,
    client: true,
    yuba: true,
    fanshome: true,
    stardiscover: true,
  };
  var currentCfg = defCfg;
  try {
    var saved = JSON.parse(__imports.localStorage.getItem("ExSave_SignConfig"));
    if (saved && typeof saved === "object")
      currentCfg = Object.assign({}, defCfg, saved);
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
        __imports.localStorage.setItem("ExSave_SignConfig", JSON.stringify(currentCfg));
      } catch (e) {}
    });
  });

  (0, __imports.safeBind)("#sign-panel-start-btn", "click", async function (e) {
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
        logBox.innerHTML = logs
          .map(function (l) {
            return "• " + l;
          })
          .join("<br>");
        logBox.scrollTop = logBox.scrollHeight;
      }
      if (typeof __imports.T === "function") (0, __imports.T)(msg, isSuccess ? "success" : "info");
    }

    try {
      if (typeof __imports.executeSignEngine === "function") {
        await __imports.nextFeatures.invoke('ex-sign', 'execute', currentCfg, appendLog);
      } else if (typeof __imports.Wn === "function") {
        await (0, __imports.Wn)(currentCfg);
      }
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
window.createSignPanel = createSignPanel;

}
