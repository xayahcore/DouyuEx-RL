function* (__imports) {
yield {"createFansContinuePanel": { get: () => createFansContinuePanel, set: value => { createFansContinuePanel = value; } },
"executeFansContinue": { get: () => executeFansContinue, set: value => { executeFansContinue = value; } },
"updateFansContinuePanel": { get: () => updateFansContinuePanel, set: value => { updateFansContinuePanel = value; } }};
/**
 * 一键续牌执行流与 380×370px 独立控制台
 */

/**
 * 驱动一键续牌流水线：计算可用荧光棒、拉取已关注粉丝牌列表并按额定/均摊赠送
 * @param {string|number} inputCount - 设定的每个房间赠送数量 (0 表示平均分配)
 */
function executeFansContinue(inputCount) {
  const parsedVal = Number(inputCount);
  const targetPerRoom = (!Number.isNaN(parsedVal) && parsedVal >= 0) ? parsedVal : 0;
  __imports.localStorage.setItem("ExSave_FansContinue", String(targetPerRoom));

  if (typeof __imports.pt !== "function") return;

  // 1. 获取背包余量，优先定位荧光棒 (道具 ID 268 或 2358)
  (0, __imports.pt)(__imports.B, (res) => {
    const list = res.data?.list || [];
    if (list.length === 0) {
      (0, __imports.T)("背包礼物为空", "error");
      return;
    }

    let propId = 0;
    let totalAvailableSticks = 0;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (item.id === 268 || item.id === 2358) {
        propId = item.id;
        totalAvailableSticks = item.count;
        break;
      }
    }

    if (propId === 0 || totalAvailableSticks <= 0) {
      (0, __imports.T)("没有足够的道具", "error");
      return;
    }

    // 2. 拉取用户关注的全部有效粉丝牌列表
    (0, __imports.fetch)("https://www.douyu.com/member/cp/getFansBadgeList", {
      method: "GET",
      mode: "no-cors",
      cache: "default",
      credentials: "include",
    })
      .then(res => res.text())
      .then(async (html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const badgeListContainer = doc.getElementsByClassName("fans-badge-list")[0];
        const ul = badgeListContainer?.lastElementChild;
        const totalRooms = ul ? ul.children.length : 0;

        if (totalRooms === 0) {
          (0, __imports.T)("暂未获取到有效的粉丝牌列表", "error");
          return;
        }

        // 若输入 0，则按徽章总数平均分配
        const countToSend = targetPerRoom === 0 ? Math.floor(totalAvailableSticks / totalRooms) : targetPerRoom;
        if (countToSend <= 0) {
          (0, __imports.T)("荧光棒数量不足以分配给所有牌子", "error");
          return;
        }

        // 3. 逐房间安全延时赠送 (250ms 防频控)
        for (let i = 0; i < totalRooms; i++) {
          const roomEl = ul.children[i];
          const targetRoomId = roomEl.getAttribute("data-fans-room");
          if (!targetRoomId) continue;

          await (0, __imports.b)(250);
          try {
            const donateRes = await (0, __imports.Ut)(propId, countToSend, targetRoomId);
            if (donateRes && donateRes.msg === "success") {
              (0, __imports.T)(`【续牌】${targetRoomId} 赠送荧光棒成功`, "success");
            } else {
              (0, __imports.T)(`【续牌】${targetRoomId} 赠送失败 ${donateRes?.msg || ''}`, "error");
            }
          } catch (err) {
            (0, __imports.T)(`【续牌】${targetRoomId} 赠送异常`, "error");
          }
        }

        (0, __imports.T)("【一键续牌】所有关注房间续牌执行完毕！", "success");
        updateFansContinuePanel();
      })
      .catch((err) => {
        console.debug("[DouyuEx NEXT] 粉丝牌列表请求异常:", err);
      });
  });
}

/**
 * 刷新一键续牌面板中的资产与勋章回显
 */
function updateFansContinuePanel() {
  const badgeNameEl = document.getElementById("fans-panel-badge-name");
  const badgeCountEl = document.getElementById("fans-panel-badge-count");
  const stickCountEl = document.getElementById("fans-panel-stick-count");

  try {
    __imports.localStorage.removeItem("ExSave_GoldBadgeName");
  } catch {}

  let activeBadgeText = "";
  try {
    const domBadge = document.querySelector(".FansMedal-name, dy-fan-medal, .FansMedalWrap .FansMedal-name");
    if (domBadge?.textContent) {
      activeBadgeText = domBadge.textContent.trim();
    }
  } catch {}

  if (badgeNameEl) {
    badgeNameEl.textContent = activeBadgeText || "已配粉丝牌";
  }

  // 获取当前背包荧光棒数量
  if (typeof __imports.pt === "function") {
    (0, __imports.pt)(__imports.B, (res) => {
      const list = res?.data?.list || [];
      let stickCount = 0;
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === 268 || list[i].id === 2358) {
          stickCount = list[i].count;
          break;
        }
      }
      if (stickCountEl) {
        stickCountEl.textContent = String(stickCount);
      }
    });
  }

  // 刷新已有粉丝牌数量
  (0, __imports.fetch)("https://www.douyu.com/member/cp/getFansBadgeList", {
    method: "GET",
    mode: "no-cors",
    cache: "default",
    credentials: "include",
  })
    .then(res => res.text())
    .then(html => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const badgeListContainer = doc.getElementsByClassName("fans-badge-list")[0];
      const ul = badgeListContainer?.lastElementChild;
      const count = ul ? ul.children.length : 0;

      if (badgeCountEl) {
        badgeCountEl.textContent = String(count);
      }
      if (!activeBadgeText && badgeListContainer && badgeNameEl) {
        const activeLi = badgeListContainer.querySelector("li.active, li[data-active='1'], .fans-badge-item.active");
        const nameSpan = activeLi?.querySelector(".badge-name, .fans-badge-name, span");
        if (nameSpan?.textContent) {
          badgeNameEl.textContent = nameSpan.textContent.trim();
        }
      }
    })
    .catch(() => {});
}

/**
 * 组装并展示一键续牌三级控制面板 (380×370px 独立模态)
 */
function createFansContinuePanel() {
  if (document.querySelector(".fans-continue-panel")) return;

  const panel = document.createElement("div");
  panel.className = "fans-continue-panel miuix-modal";
  panel.innerHTML = `
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
  `;

  document.body.appendChild(panel);
  (0, __imports.ensureMiuixPanelHeader)(panel, "一键续牌");

  (0, __imports.safeBind)("#fans-panel-start-btn", "click", (e) => {
    e.stopPropagation();
    const countVal = document.getElementById("fans-panel-stick-input")?.value || "0";
    __imports.nextFeatures.invoke('fans-continue', 'execute', countVal);
  });
}

}
