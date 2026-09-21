function initPkg_FansContinue() {
  initPkg_FansContinue_Dom();
  initPkg_FansContinue_Func();
}

function initPkg_FansContinue_Dom() {
  FansContinue_insertIcon();
}

function FansContinue_insertIcon() {
  let a = document.createElement("div");
  a.className = "fans-continue";
  a.innerHTML =
    '<a class="ex-panel__icon" title="一键续牌"><img style="width: 38px;height: 38px;" src="https://gfs-op.douyucdn.cn/dygift/1705/7db9beee246848252f1c7fe916259f4e.png"/><i id="fans-continue__tip" class="ex-panel__tip"></i></a>';

  let b = document.getElementsByClassName("ex-panel__wrap")[0];
  if (b) b.insertBefore(a, b.childNodes[0]);
}

function initPkg_FansContinue_Func() {
  let btn = document.getElementsByClassName("fans-continue")[0];
  if (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      let panel = document.querySelector(".fans-continue-panel");
      if (!panel) {
        createFansContinuePanel();
        panel = document.querySelector(".fans-continue-panel");
      }
      if (panel) {
        if (panel.style.display === "block" || panel.style.display === "flex") {
          panel.style.setProperty("display", "none", "important");
        } else {
          if (typeof openMiuixPanelCentered === "function") {
            openMiuixPanelCentered(panel, btn);
          } else {
            panel.style.setProperty("display", "flex", "important");
          }
          updateFansContinuePanel();
        }
      }
    });
  }
}

function updateFansContinuePanel() {
  var badgeNameEl = document.getElementById("fans-panel-badge-name");
  var badgeCountEl = document.getElementById("fans-panel-badge-count");
  var stickCountEl = document.getElementById("fans-panel-stick-count");

  try { localStorage.removeItem("ExSave_GoldBadgeName"); } catch (e) {}
  var activeBadge = "";
  try {
    var domBadge = document.querySelector(".FansMedal-name, dy-fan-medal, .FansMedalWrap .FansMedal-name");
    if (domBadge && domBadge.textContent) activeBadge = domBadge.textContent.trim();
  } catch (e) {}
  if (badgeNameEl) badgeNameEl.textContent = activeBadge || "已配粉丝牌";

  if (typeof fetchUserBackpackGifts === "function") {
    fetchUserBackpackGifts(rid, function (list) {
      var stickCount = 0;
      for (var idx = 0; idx < list.length; idx++) {
        if (list[idx].id === "268" || list[idx].id === "2358") {
          stickCount = list[idx].count;
          break;
        }
      }
      if (stickCountEl) stickCountEl.textContent = String(stickCount);
    });
  } else if (typeof getBagGifts === "function") {
    getBagGifts(rid, function (ret) {
      var list = ret.data?.list || [];
      var stickCount = 0;
      for (var idx = 0; idx < list.length; idx++) {
        if (268 == list[idx].id || 2358 == list[idx].id) {
          stickCount = list[idx].count;
          break;
        }
      }
      if (stickCountEl) stickCountEl.textContent = String(stickCount);
    });
  }

  fetch("https://www.douyu.com/member/cp/getFansBadgeList", {
    method: "GET",
    mode: "no-cors",
    cache: "default",
    credentials: "include"
  })
    .then((e) => e.text())
    .then((e) => {
      var badgeList = new DOMParser().parseFromString(e, "text/html").getElementsByClassName("fans-badge-list")[0];
      var o = badgeList ? badgeList.lastElementChild : null;
      var count = o ? o.children.length : 0;
      if (badgeCountEl) badgeCountEl.textContent = String(count);
      if (!activeBadge && badgeList && badgeNameEl) {
        var activeLi = badgeList.querySelector("li.active, li[data-active='1'], .fans-badge-item.active");
        if (activeLi) {
          var nameSpan = activeLi.querySelector(".badge-name, .fans-badge-name, span");
          if (nameSpan && nameSpan.textContent) badgeNameEl.textContent = nameSpan.textContent.trim();
        }
      }
    })
    .catch(() => {});
}

function createFansContinuePanel() {
  if (document.querySelector(".fans-continue-panel")) return;
  var p = document.createElement("div");
  p.className = "fans-continue-panel miuix-modal";
  p.innerHTML = `
    <div class="miuix-modal__body">
      <div class="fans-panel__card">
        <div class="fans-panel__card-header">
          <span class="fans-panel__card-title">徽章与资产</span>
          <span class="fans-panel__badge-tag" id="fans-panel-badge-name">当前佩戴</span>
        </div>
        <div class="fans-panel__asset-grid">
          <div class="fans-panel__asset-item">
            <span class="fans-panel__asset-label">已有粉丝牌</span>
            <span class="fans-panel__asset-value" id="fans-panel-badge-count">-</span>
          </div>
          <div class="fans-panel__asset-item">
            <span class="fans-panel__asset-label">背包荧光棒</span>
            <span class="fans-panel__asset-value" id="fans-panel-stick-count">-</span>
          </div>
          <div class="fans-panel__asset-item">
            <span class="fans-panel__asset-label">牌子状态</span>
            <span class="fans-panel__asset-value fans-panel__status--ok" id="fans-panel-badge-status">健康保活</span>
          </div>
        </div>
      </div>

      <div class="fans-panel__card">
        <div class="fans-panel__card-header">
          <span class="fans-panel__card-title">续牌赠送配置</span>
        </div>
        <div class="fans-panel__input-group">
          <label class="fans-panel__input-label">每个直播间赠送荧光棒数量：</label>
          <div class="fans-panel__input-box">
            <input type="number" id="fans-panel-stick-input" min="0" value="0" placeholder="0 表示全量平均赠送" />
            <span class="fans-panel__input-hint">根 (输入 0 则平均分配背包余量)</span>
          </div>
        </div>
      </div>

      <div class="fans-panel__action-wrap">
        <button type="button" class="ex-btn-primary fans-panel__submit-btn" id="fans-panel-start-btn">
          立即开始续牌
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(p);
  if (typeof ensureMiuixPanelHeader === "function") {
    ensureMiuixPanelHeader(p, "一键续牌");
  }

  let saved = localStorage.getItem("ExSave_FansContinue");
  if (saved) {
    let inp = p.querySelector("#fans-panel-stick-input");
    if (inp) inp.value = saved;
  }

  let startBtn = p.querySelector("#fans-panel-start-btn");
  if (startBtn) {
    startBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var val = document.getElementById("fans-panel-stick-input")?.value || "0";
      var sendNum = Number(val);
      if (Number.isNaN(sendNum) || sendNum < 0) sendNum = 0;
      localStorage.setItem("ExSave_FansContinue", String(sendNum));
      FansContinue_startSend(sendNum);
    });
  }
}

function FansContinue_startSend(sendNum) {
  let giftId = 0;
  let count = 0;

  getBagGifts(rid, (ret) => {
    let chunkNum = ret.data?.list?.length || 0;

    if (chunkNum == 0) {
      showMessage("背包礼物为空", "error");
      return;
    }

    for (let i = 0; i < chunkNum; i++) {
      if (ret.data.list[i].id == 268 || ret.data.list[i].id == 2358) {
        giftId = ret.data.list[i].id;
        count = ret.data.list[i].count;
        break;
      }
    }

    if (giftId == 0) {
      showMessage("没有足够的荧光棒道具", "error");
      return;
    }

    fetch("https://www.douyu.com/member/cp/getFansBadgeList", {
      method: "GET",
      mode: "no-cors",
      cache: "default",
      credentials: "include"
    })
      .then((res) => res.text())
      .then(async (doc) => {
        doc = new DOMParser().parseFromString(doc, "text/html");
        let a = doc.getElementsByClassName("fans-badge-list")[0]?.lastElementChild;
        if (!a) {
          showMessage("未能获取粉丝牌列表", "error");
          return;
        }
        let n = a.children.length;
        if (n === 0) {
          showMessage("当前没有粉丝牌", "info");
          return;
        }
        if (sendNum == 0) sendNum = Math.floor(count / n);
        if (sendNum <= 0) sendNum = 1;

        showMessage(`正在为 ${n} 个房间一键续牌，每间 ${sendNum} 根...`, "info");
        for (let i = 0; i < n; i++) {
          let targetRid = a.children[i].getAttribute("data-fans-room");
          await sleep(250);
          try {
            let data = await sendGift_bag(giftId, sendNum, targetRid);
            if (data && data.msg === "success") {
              showMessage(`【续牌】房间 ${targetRid} 赠送成功`, "success");
            } else {
              showMessage(`【续牌】房间 ${targetRid} 赠送失败: ${data?.msg || '错误'}`, "error");
            }
          } catch (err) {
            console.warn("[DouyuEx] 续牌单间异常:", targetRid, err);
          }
        }
        showMessage("一键续牌执行完毕！", "success");
        updateFansContinuePanel();
      })
      .catch((err) => {
        showMessage("粉丝牌请求失败", "error");
      });
  });
}

async function sendGift_bag(gid, count, targetRid) {
  const res = await fetch("https://www.douyu.com/japi/prop/donate/mainsite/v1", {
    method: "POST",
    mode: "no-cors",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "propId=" + gid + "&propCount=" + count + "&roomId=" + targetRid + "&bizExt=%7B%22yzxq%22%3A%7B%7D%7D"
  });
  return await res.json();
}

window.createFansContinuePanel = createFansContinuePanel;
window.updateFansContinuePanel = updateFansContinuePanel;
