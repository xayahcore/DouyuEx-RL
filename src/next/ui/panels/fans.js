function* (__imports) {
yield {"createFansContinuePanel": { get: () => createFansContinuePanel, set: value => { createFansContinuePanel = value; } },
"executeFansContinue": { get: () => executeFansContinue, set: value => { executeFansContinue = value; } },
"updateFansContinuePanel": { get: () => updateFansContinuePanel, set: value => { updateFansContinuePanel = value; } }};
function executeFansContinue(inputCount) {
  var val = Number(inputCount);
  var i = !Number.isNaN(val) && val >= 0 ? val : 0;
  __imports.localStorage.setItem("ExSave_FansContinue", String(i));
  let n = 0;
  if (typeof __imports.pt === "function") {
    (0, __imports.pt)(__imports.B, (t) => {
      var o = t.data?.list?.length || 0;
      if (0 == o) (0, __imports.T)("背包礼物为空", "error");
      else {
        for (let e = 0; e < o; e++) {
          if (268 == t.data.list[e].id || 2358 == t.data.list[e].id) {
            n = t.data.list[e].id;
            var count = t.data.list[e].count;
            break;
          }
        }
        0 == n
          ? (0, __imports.T)("没有足够的道具", "error")
          : (0, __imports.fetch)("https://www.douyu.com/member/cp/getFansBadgeList", {
              method: "GET",
              mode: "no-cors",
              cache: "default",
              credentials: "include",
            })
              .then((e) => e.text())
              .then(async (e) => {
                var badgeList = new DOMParser()
                  .parseFromString(e, "text/html")
                  .getElementsByClassName("fans-badge-list")[0];
                var o = badgeList ? badgeList.lastElementChild : null;
                var t = o ? o.children.length : 0;
                0 == i && t > 0 && (i = Math.floor(count / t));
                for (let e = 0; e < t; e++) {
                  let t = o.children[e].getAttribute("data-fans-room");
                  await (0, __imports.b)(250).then(() => {
                    (0, __imports.Ut)(n, i, t)
                      .then((e) => {
                        "success" == e.msg
                          ? (0, __imports.T)("【续牌】" + t + "赠送荧光棒成功", "success")
                          : ((0, __imports.T)("【续牌】" + t + "赠送失败 " + e.msg, "error"),
                            console.log(t, e));
                      })
                      .catch((e) => {
                        (0, __imports.T)("【续牌】" + t + "赠送失败", "error");
                        console.log(t, e);
                      });
                  });
                }
                (0, __imports.T)("【一键续牌】所有关注房间续牌执行完毕！", "success");
                updateFansContinuePanel();
              })
              .catch((e) => {
                console.log("请求失败!", e);
              });
      }
    });
  }
}

function updateFansContinuePanel() {
  var badgeNameEl = document.getElementById("fans-panel-badge-name");
  var badgeCountEl = document.getElementById("fans-panel-badge-count");
  var stickCountEl = document.getElementById("fans-panel-stick-count");

  try {
    __imports.localStorage.removeItem("ExSave_GoldBadgeName");
  } catch (e) {}
  var activeBadge = "";
  try {
    var domBadge = document.querySelector(
      ".FansMedal-name, dy-fan-medal, .FansMedalWrap .FansMedal-name",
    );
    if (domBadge && domBadge.textContent)
      activeBadge = domBadge.textContent.trim();
  } catch (e) {}
  if (badgeNameEl) badgeNameEl.textContent = activeBadge || "已配粉丝牌";

  if (typeof __imports.pt === "function") {
    (0, __imports.pt)(__imports.B, function (t) {
      var list = t.data?.list || [];
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

  (0, __imports.fetch)("https://www.douyu.com/member/cp/getFansBadgeList", {
    method: "GET",
    mode: "no-cors",
    cache: "default",
    credentials: "include",
  })
    .then((e) => e.text())
    .then((e) => {
      var badgeList = new DOMParser()
        .parseFromString(e, "text/html")
        .getElementsByClassName("fans-badge-list")[0];
      var o = badgeList ? badgeList.lastElementChild : null;
      var count = o ? o.children.length : 0;
      if (badgeCountEl) badgeCountEl.textContent = String(count);
      if (!activeBadge && badgeList && badgeNameEl) {
        var activeLi = badgeList.querySelector(
          "li.active, li[data-active='1'], .fans-badge-item.active",
        );
        if (activeLi) {
          var nameSpan = activeLi.querySelector(
            ".badge-name, .fans-badge-name, span",
          );
          if (nameSpan && nameSpan.textContent)
            badgeNameEl.textContent = nameSpan.textContent.trim();
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
  (0, __imports.ensureMiuixPanelHeader)(p, "一键续牌");

  (0, __imports.safeBind)("#fans-panel-start-btn", "click", function (e) {
    e.stopPropagation();
    var val = document.getElementById("fans-panel-stick-input")?.value || "0";
    __imports.nextFeatures.invoke('fans-continue', 'execute', val);
  });
}

}
