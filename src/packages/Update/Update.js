var curVersion = (typeof GM_info !== "undefined" && GM_info.script && GM_info.script.version) ? GM_info.script.version : "2026.09.21.01";
var isNeedUpdate = false;
var lastestVersion = "";

function isNewerVersion(remote, local) {
  if (!remote || !local) return false;
  var rParts = String(remote).split(".").map(Number);
  var lParts = String(local).split(".").map(Number);
  for (var i = 0; i < Math.max(rParts.length, lParts.length); i++) {
    var r = rParts[i] || 0;
    var l = lParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

function initPkg_Update() {
  initPkg_Update_Dom();
  initPkg_Update_Func();
  initVersionLifecycleNotice();

  // 若存在新版本发布，点亮底栏【版本更新】小红点
  var lastNotifiedVer = GM_getValue("Ex_LastNotifiedVersion");
  if (lastNotifiedVer !== curVersion) {
    var tip = document.getElementById("ex-update__tip");
    if (tip) tip.style.display = "block";
  }
}

function initPkg_Update_Dom() {
  Update_insertIcon();
}

function Update_insertIcon() {
  let a = document.createElement("div");
  a.className = "ex-update";
  a.innerHTML =
    '<a class="ex-panel__icon" title="版本更新，当前版本' +
    curVersion +
    '"><svg t="1578767541873" style="display:block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="23715" width="32" height="32"><path d="M768 810.7H512c-23.6 0-42.7-19.1-42.7-42.7s19.1-42.7 42.7-42.7h256c94.1 0 170.7-76.6 170.7-170.7 0-89.6-70.1-164.3-159.5-170.1L754 383l-10.7-22.7c-42.2-89.3-133-147-231.3-147s-189.1 57.7-231.3 147L270 383l-25.1 1.6c-89.5 5.8-159.5 80.5-159.5 170.1 0 94.1 76.6 170.7 170.7 170.7 23.6 0 42.7 19.1 42.7 42.7s-19.1 42.7-42.7 42.7c-141.2 0-256-114.8-256-256 0-126.1 92.5-232.5 214.7-252.4C274.8 195.7 388.9 128 512 128s237.2 67.7 297.3 174.2C931.5 322.1 1024 428.6 1024 554.7c0 141.1-114.8 256-256 256z" fill="#3688FF" p-id="23716"></path><path d="M554.7 938.7c-10.9 0-21.8-4.2-30.2-12.5l-128-128c-16.7-16.7-16.7-43.7 0-60.3l128-128c16.6-16.7 43.7-16.7 60.3 0 16.7 16.7 16.7 43.7 0 60.3L487 768l97.8 97.8c16.7 16.7 16.7 43.7 0 60.3-8.3 8.4-19.2 12.6-30.1 12.6z" fill="#5F6379" p-id="23717"></path></svg><i id="ex-update__tip" class="ex-panel__tip"></i></a>';

  let b = document.getElementsByClassName("ex-panel__wrap")[0];
  if (b) b.insertBefore(a, b.childNodes[0]);
}

function initPkg_Update_Func() {
  let btn = document.getElementsByClassName("ex-update")[0];
  if (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      let panel = document.querySelector(".exupdate-panel");
      if (!panel) {
        createExUpdatePanel();
        panel = document.querySelector(".exupdate-panel");
      }
      if (panel) {
        if (panel.style.display === "block") {
          panel.style.display = "none";
        } else {
          if (typeof openMiuixPanelCentered === "function") {
            openMiuixPanelCentered(panel, btn);
          } else {
            panel.style.display = "block";
          }
        }
      }
    });
  }
}

function fetchLatestVersion(callback) {
  const sources = [
    "https://cdn.jsdelivr.net/gh/xayahcore/DouyuEx-RL@main/package.json",
    "https://fastly.jsdelivr.net/gh/xayahcore/DouyuEx-RL@main/package.json",
    "https://raw.githubusercontent.com/xayahcore/DouyuEx-RL/main/package.json",
    "https://greasyfork.org/scripts/595575.json"
  ];

  function trySource(index) {
    if (index >= sources.length) {
      return callback(null);
    }
    const url = sources[index] + (sources[index].includes("?") ? "&" : "?") + "_t=" + Date.now();

    function handleResponse(content) {
      if (!content) return trySource(index + 1);
      try {
        const json = typeof content === "string" ? JSON.parse(content) : content;
        const ver = json && json.version;
        if (ver && /^\d{4}\.\d{2}\.\d{2}\.\d{2}$/.test(String(ver).trim())) {
          return callback(String(ver).trim());
        }
      } catch (e) {}
      trySource(index + 1);
    }

    if (typeof GM_xmlhttpRequest === "function") {
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        timeout: 6000,
        onload: function (res) {
          if (res.status === 200 && (res.response || res.responseText)) {
            handleResponse(res.response || res.responseText);
          } else {
            trySource(index + 1);
          }
        },
        onerror: function () {
          trySource(index + 1);
        },
        ontimeout: function () {
          trySource(index + 1);
        }
      });
    } else {
      fetch(url, { cache: "no-store" })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("HTTP " + res.status);
        })
        .then((json) => handleResponse(json))
        .catch(() => trySource(index + 1));
    }
  }

  trySource(0);
}

function createExUpdatePanel() {
  var existing = document.querySelector(".exupdate-panel");
  if (existing) {
    if (existing.dataset.version === curVersion) return;
    existing.remove();
  }

  var p = document.createElement("div");
  p.className = "exupdate-panel miuix-modal";
  p.dataset.version = curVersion;
  p.innerHTML = `
    <div class="miuix-modal__body">
      <!-- 卡片 1: 功能升级 -->
      <div class="exupdate-panel__card">
        <div class="exupdate-panel__card-header">
          <span class="exupdate-panel__card-title">功能升级·</span>
        </div>
        <ul class="exupdate-list">
          <li>• <b>【扩展功能】</b>送礼交互升级：彻底淘汰手动 ID 输入框，合二为一升级为可点击礼物徽章，接入 5 级大模态双流礼物池即点即选，全面恢复参数与道具本地记忆。</li>
          <li>• <b>【一键签到】</b>签到控制台落地：380×370px 独立视窗，自由勾选 5 大日常任务并持久化记忆，集成星推 39+ 金币打满与安全取关闭环。</li>
          <li>• <b>【直播间工具】</b>五大功能抽屉重塑：进场/禁言/谢礼/回复/投票全面升维为轻薄磨砂折叠卡片，开关统一为右对齐澎湃蓝弹簧 Switch。</li>
          <li>• <b>【弹幕助手】</b>三大卡片规范化：预设词库、发送参数、发送策略全量换装，挂钩 WebSocket 广播实现 SSOT 发送回执与敏捷屏蔽词判定。</li>
          <li>• <b>【弹幕小尾巴】</b>精准视口锚定：修复错位至左下角缺陷，严格贴合在聊天栏【尾】按钮正上方，增设右上角关闭按钮与失焦收起。</li>
        </ul>
      </div>

      <!-- 卡片 2: 交互与体验 -->
      <div class="exupdate-panel__card">
        <div class="exupdate-panel__card-header">
          <span class="exupdate-panel__card-title">交互与体验·</span>
        </div>
        <ul class="exupdate-list">
          <li>• <b>【三级菜单悬停即开】</b>鼠标滑过 Dock 图标三级菜单立即展开，移开鼠标绝不自动关闭，支持从容交互。</li>
          <li>• <b>【二级 Dock 联动收拢】</b>未展开三级菜单时鼠标移出 Dock 自动收拢；已展开三级菜单时 Dock 保持坚挺打开。</li>
          <li>• <b>【全链路过渡动效】</b>接入 0.28s 弹性上浮与 0.16s 退出动画，彻底清除历史遗留的 18px 隐形热区连桥干扰。</li>
        </ul>
      </div>

      <!-- 卡片 3: 其它 -->
      <div class="exupdate-panel__card">
        <div class="exupdate-panel__card-header">
          <span class="exupdate-panel__card-title">其它·</span>
        </div>
        <ul class="exupdate-list">
          <li>• <b>【核心画质拦截】</b>12s 起播保护窗口与最高原画拦截层 100% 稳定运行，开播无缝极速秒开。</li>
          <li>• <b>【通用弹窗修复】</b>根治 PostbirdAlertBox 双层嵌套 Bug，导入黑名单/欢迎词弹框居中通透展示，无遮罩卡死。</li>
          <li>• <b>【统一 UI 引擎】</b>所有弹层、选择器与开关样式 100% 收拢至 ExPanel.css 单一真实信源，通过 3 阶段原生 V8 语法编译与全量 E2E 自动化测试。</li>
        </ul>
      </div>

      <div class="exupdate-panel__action-wrap">
        <button type="button" class="ex-btn-primary exupdate-panel__submit-btn" id="exupdate-action-btn">我已收到</button>
      </div>
    </div>
  `;
  document.body.appendChild(p);
  if (typeof ensureMiuixPanelHeader === "function") {
    ensureMiuixPanelHeader(p, "版本更新");
  }

  var btn = p.querySelector("#exupdate-action-btn");
  if (!btn) return;

  function setBtnState(state, text) {
    btn.className = "ex-btn-primary exupdate-panel__submit-btn";
    btn.dataset.state = state;
    btn.disabled = false;
    if (state === "ack") {
      btn.classList.add("exupdate-state-btn--ack");
      btn.textContent = text || "我已收到";
    } else if (state === "check") {
      btn.classList.add("exupdate-state-btn--check");
      btn.textContent = text || "检查更新";
    } else if (state === "checking") {
      btn.classList.add("exupdate-state-btn--checking");
      btn.textContent = text || "正在检查更新...";
      btn.disabled = true;
    } else if (state === "latest") {
      btn.classList.add("exupdate-state-btn--latest");
      btn.textContent = text || "已是最新";
    } else if (state === "upgrade") {
      btn.classList.add("exupdate-state-btn--upgrade");
      btn.textContent = text || "前往更新";
    } else if (state === "error") {
      btn.classList.add("exupdate-state-btn--error");
      btn.textContent = text || "检查失败，点击重试";
    }
  }

  var lastNotified = GM_getValue("Ex_LastNotifiedVersion");
  if (lastNotified !== curVersion) {
    setBtnState("ack", "我已收到");
  } else {
    setBtnState("check", "检查更新");
  }

  btn.onclick = function (e) {
    e.stopPropagation();
    var st = btn.dataset.state;
    if (st === "ack") {
      GM_setValue("Ex_LastNotifiedVersion", curVersion);
      var tip = document.getElementById("ex-update__tip");
      if (tip) tip.style.display = "none";
      setBtnState("check", "检查更新");
    } else if (st === "check" || st === "latest" || st === "error") {
      setBtnState("checking", "正在检查更新...");
      fetchLatestVersion(function (remoteVer) {
        if (!remoteVer) {
          setBtnState("error", "检查失败，点击重试");
          if (typeof showMessage === "function") {
            showMessage("【版本更新】检查更新失败，无法连接到更新服务器", "error");
          }
          return;
        }
        if (isNewerVersion(remoteVer, curVersion)) {
          setBtnState("upgrade", "前往更新 (v" + remoteVer + ")");
          var tip = document.getElementById("ex-update__tip");
          if (tip) tip.style.display = "block";
          if (typeof showMessage === "function") {
            showMessage("【版本更新】检测到新版本 v" + remoteVer + "，点击前往更新", "info");
          }
        } else {
          setBtnState("latest", "已是最新 (v" + curVersion + ")");
          if (typeof showMessage === "function") {
            showMessage("【版本更新】当前版本 v" + curVersion + " 已是最新版本", "success");
          }
        }
      });
    } else if (st === "upgrade") {
      if (typeof GM_openInTab === "function") {
        GM_openInTab("https://greasyfork.org/zh-CN/scripts/595575-douyuex-rl-%E6%96%97%E9%B1%BC%E7%9B%B4%E6%92%AD%E9%97%B4%E5%A2%9E%E5%BC%BA%E6%8F%92%E4%BB%B6-reborn-lite", { active: true });
      } else {
        window.open("https://greasyfork.org/zh-CN/scripts/595575-douyuex-rl-%E6%96%97%E9%B1%BC%E7%9B%B4%E6%92%AD%E9%97%B4%E5%A2%9E%E5%BC%BA%E6%8F%92%E4%BB%B6-reborn-lite", "_blank");
      }
    }
  };
}

function initVersionLifecycleNotice() {
  var lastNotifiedVer = GM_getValue("Ex_LastNotifiedVersion");
  if (!lastNotifiedVer) {
    GM_setValue("Ex_LastNotifiedVersion", curVersion);
  }

  // 12小时限频在线探测
  var lastCheckTime = Number(GM_getValue("Ex_LastUpdateCheckTime") || 0);
  var now = Date.now();
  if (now - lastCheckTime > 12 * 3600 * 1000) {
    GM_setValue("Ex_LastUpdateCheckTime", String(now));
    setTimeout(() => {
      fetchLatestVersion(function (remoteVer) {
        if (remoteVer && isNewerVersion(remoteVer, curVersion)) {
          var tip = document.getElementById("ex-update__tip");
          if (tip) tip.style.display = "block";
        }
      });
    }, 5000);
  }
}

function Update_checkVersion() {
  // 保持空函数或兼容调用，彻底消除原版每次进房弹窗打扰
}
