var curVersion = (typeof GM_info !== "undefined" && GM_info.script && GM_info.script.version) ? GM_info.script.version : "2026.09.18.01";
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

function createExUpdatePanel() {
  var existing = document.querySelector(".exupdate-panel");
  if (existing) return;

  var p = document.createElement("div");
  p.className = "exupdate-panel miuix-modal";
  p.innerHTML = `
    <div class="miuix-modal__body">
      <div class="exupdate-panel__card">
        <div class="exupdate-panel__card-header">
          <span class="exupdate-panel__card-title">新增功能·</span>
        </div>
        <ul class="exupdate-list">
          <li>① 一键签到三级控制面板完整落地 (createSignPanel / sign-panel)：新增标准 380×370px MIUIX 流式拟态视窗，支持自由勾选 5 大日常签到任务，状态持久化至 ExSave_SignConfig，内嵌实时任务日志视窗</li>
          <li>② 5 级模态礼物选择器与背包送礼现代化：实时双流并行聚合房间专属礼物与官方通用大盘礼物（140+款），内置触控胶囊即点即选、背包道具现场 0ms 直探与弱鸡独立动图映射</li>
          <li>③ 现代化星推日常任务全景式自动化打满：深度逆向斗鱼全民星推协议，一键拉满单日 39+ 金币全部零成本收益（活动页打卡 +10、3 房间签到 +9、口令弹幕 +5、互动上报、5 位关注任务 +15）</li>
          <li>④ 动态逐轮 introduce 推荐与安全取关闭环：每轮动态请求官方推荐单，关注后保持 1.8 秒服务端入账呼吸窗口，随后调用官方标准 follow/rm 执行安全取关，严格保护既有关注，杜绝陌生人残留</li>
        </ul>
      </div>
      <div class="exupdate-panel__card">
        <div class="exupdate-panel__card-header">
          <span class="exupdate-panel__card-title">优化与修复·</span>
        </div>
        <ul class="exupdate-list">
          <li>① 连根拔除原作者恶意关注陌生主播后门与死硬编码“幻神”兜底：彻底清理 anchorstardiscover 偷关逻辑与假数据 fallback，动态提取当前真实粉丝牌</li>
          <li>② 彻底清除斗鱼早已关停下线的远古车队系统代码：彻底清除腾讯云 IM 通信接口、usersig 打卡及车队周常代码，杜绝无意义网络请求与冗余报错</li>
          <li>③ 指定星推参赛直播间门禁检测 (isStarCompetitionRoom)：深度逆向 memberInfo 状态机 (hide===0 且 rank>0)，非星推直播间自动跳过助力口令，避免打扰正常看播</li>
          <li>④ 弹幕发送成功与系统屏蔽词检测系统 (SSOT)：FIFO 队列匹配原生 WebSocket 广播包，2500ms 超时删除线标记与延迟回执自愈恢复</li>
          <li>⑤ 优雅 WebRTC P2P 阻断器 (GracefulP2PBlocker)：合规 W3C Proxy 阻断 P2P 上传，彻底杜绝官方播放器由于获取空原型而抛出 TypeError 崩溃</li>
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
    } else if (st === "check") {
      setBtnState("checking", "正在检查更新...");
      var handleUpdateData = function (data) {
        if (data && data.version && isNewerVersion(data.version, curVersion)) {
          setBtnState("upgrade", "前往更新");
          var tip = document.getElementById("ex-update__tip");
          if (tip) tip.style.display = "block";
        } else {
          setBtnState("latest", "已是最新");
        }
      };
      if (typeof GM_xmlhttpRequest === "function") {
        GM_xmlhttpRequest({
          method: "GET",
          url: "https://greasyfork.org/scripts/595575.json",
          responseType: "json",
          onload: function (res) {
            var data = res.response;
            if (typeof data === "string") {
              try { data = JSON.parse(data); } catch (e) {}
            }
            handleUpdateData(data);
          },
          onerror: function () {
            setBtnState("latest", "已是最新");
          }
        });
      } else {
        fetch("https://greasyfork.org/scripts/595575.json")
          .then((res) => res.json())
          .then(handleUpdateData)
          .catch(() => {
            setBtnState("latest", "已是最新");
          });
      }
    } else if (st === "latest") {
      setBtnState("check", "检查更新");
    } else if (st === "upgrade") {
      GM_openInTab("https://greasyfork.org/zh-CN/scripts/595575", { active: true });
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
      var handleRemoteData = function (data) {
        if (data && data.version && isNewerVersion(data.version, curVersion)) {
          var tip = document.getElementById("ex-update__tip");
          if (tip) tip.style.display = "block";
        }
      };
      if (typeof GM_xmlhttpRequest === "function") {
        GM_xmlhttpRequest({
          method: "GET",
          url: "https://greasyfork.org/scripts/595575.json",
          responseType: "json",
          onload: function (res) {
            var data = res.response;
            if (typeof data === "string") {
              try { data = JSON.parse(data); } catch (e) {}
            }
            handleRemoteData(data);
          }
        });
      }
    }, 5000);
  }
}

function Update_checkVersion() {
  // 保持空函数或兼容调用，彻底消除原版每次进房弹窗打扰
}
