let FansContinue_refreshBound = false;

function initPkg_FansContinue() {
  initPkg_FansContinue_Dom();
  initPkg_FansContinue_Func();
  FansContinue_bindRefresh();
}

/* 面板可能由「图标点击」之外的路打开（二级菜单悬停、快捷键），旧实现只在点击那条路
 * 调 update → 悬停打开时徽章与资产一直停在占位符。现在统一监听「三级面板打开」事件。 */
function FansContinue_bindRefresh() {
  if (FansContinue_refreshBound) return;
  FansContinue_refreshBound = true;
  document.addEventListener("DouyuEx:thirdLevelOpened", function (ev) {
    var panel = ev && ev.detail && ev.detail.panel;
    if (!panel || !panel.classList) return;
    if (panel.classList.contains("fans-continue-panel")) {
      updateFansContinuePanel();
    }
  });
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
  var statusEl = document.getElementById("fans-panel-badge-status");
  var listEl = document.getElementById("fans-panel-badge-list");

  if (badgeNameEl) badgeNameEl.textContent = "读取中…";
  if (listEl) listEl.innerHTML = '<div class="fans-panel__badge-empty">正在读取粉丝牌…</div>';

  // 背包荧光棒（亲密度道具）：268 / 2358 都是荧光棒
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
      var list = (ret && ret.data && ret.data.list) || [];
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
    .then((res) => res.text())
    .then((html) => {
      var badges = FansContinue_parseBadges(html);
      if (badgeCountEl) badgeCountEl.textContent = String(badges.length);

      if (!badges.length) {
        if (badgeNameEl) badgeNameEl.textContent = "无粉丝牌";
        if (statusEl) statusEl.textContent = "无需续牌";
        if (listEl) listEl.innerHTML = '<div class="fans-panel__badge-empty">当前没有粉丝牌</div>';
        return;
      }

      // 佩戴中的那块（列表里显示「取消佩戴」的就是当前佩戴）
      var worn = badges.filter(function (b) { return b.worn; })[0] || null;


      if (badgeNameEl) {
        badgeNameEl.textContent = worn ? (worn.name + " · Lv." + worn.level) : "未佩戴（按最高亲密度展示）";
      }
      if (statusEl) {
        // 接口里**没有**每块牌的"剩余天数"：data-fans-delwaittime 对所有牌子都是同一个常量，
        // 当倒计时显示就是假数据（2026-10-30 用户当场发现两块牌都写「剩 10 天」）。
        // 这一格改放真实拿得到的「今日亲密度合计」。
        var todaySum = 0;
        for (var ti = 0; ti < badges.length; ti++) todaySum += badges[ti].today || 0;
        statusEl.textContent = "+" + (Math.round(todaySum * 10) / 10);
        statusEl.title = "今天在这些牌子上的亲密度合计";
      }

      if (listEl) {
        var html2 = "";
        for (var i = 0; i < badges.length; i++) {
          var b = badges[i];
          var meta = "Lv." + b.level;
          if (isFinite(b.intimacy)) meta += " · 亲密 " + b.intimacy;
          meta += " · 今日 +" + (b.today || 0);
          if (isFinite(b.rank)) meta += " · 排名 " + b.rank;
          html2 += '<div class="fans-panel__badge-row">' +
            '<div class="fans-panel__badge-main">' +
              '<span class="fans-panel__badge-name">' + FansContinue_escape(b.name) +
                (b.worn ? '<em class="fans-panel__badge-worn">佩戴中</em>' : "") +
              '</span>' +
              '<span class="fans-panel__badge-meta">' + FansContinue_escape(meta) + '</span>' +
            '</div>' +
            '<button type="button" class="fans-panel__badge-wear" data-rid="' + FansContinue_escape(b.rid) +
              '" data-worn="' + (b.worn ? "1" : "0") + '">' + (b.worn ? "卸下" : "佩戴") + '</button>' +
          '</div>';
        }
        listEl.innerHTML = html2;
      }
    })
    .catch(function () {
      if (badgeNameEl) badgeNameEl.textContent = "读取失败";
      if (listEl) listEl.innerHTML = '<div class="fans-panel__badge-empty">粉丝牌列表请求失败</div>';
    });
}

/**
 * 佩戴 / 取消佩戴粉丝牌。
 * 接口与参数是从斗鱼「我的头衔」页面抓包得到的：POST /member/cp/operBadge
 *   rid=房间号 & type=1(佩戴)/2(取消佩戴)/3(删除，不提供) & ctn=acf_ccn
 * 成功后重新拉一次列表（服务端会把原来那块牌的佩戴状态一并改掉）。
 */
async function FansContinue_setWear(rid, type, btn) {
  if (!rid) return;
  if (btn) { btn.disabled = true; btn.textContent = type === 1 ? "佩戴中…" : "卸下中…"; }
  try {
    const ctn = (typeof getCCN === "function") ? getCCN() : "";
    const res = await fetch("https://www.douyu.com/member/cp/operBadge", {
      method: "POST",
      mode: "no-cors",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "rid=" + encodeURIComponent(rid) + "&type=" + type + "&ctn=" + encodeURIComponent(ctn == null ? "" : ctn)
    });
    const data = await res.json();
    // 实测返回是 {"result":0,"msg":"ok"}（不是别的接口那种 error 字段）——
    // 两种都认，避免又把成功当失败。
    const okFlag = data && (Number(data.result) === 0 || Number(data.error) === 0);
    if (okFlag) {
      showMessage(type === 1 ? "已佩戴该粉丝牌" : "已取消佩戴", "success");
      updateFansContinuePanel();
    } else {
      showMessage("操作失败：" + ((data && (data.msg || data.result || data.error)) || "接口无响应"), "error");
      if (btn) { btn.disabled = false; btn.textContent = type === 1 ? "佩戴" : "卸下"; }
    }
  } catch (e) {
    if (typeof ExGuard_warn === "function") ExGuard_warn("续牌", "佩戴操作失败", e);
    showMessage("操作失败：请求异常", "error");
    if (btn) { btn.disabled = false; btn.textContent = type === 1 ? "佩戴" : "卸下"; }
  }
}

/** 解析 getFansBadgeList 返回的表格：每行一块牌子（徽章名/等级/亲密度/剩余天数/是否佩戴） */
function FansContinue_parseBadges(html) {
  var out = [];
  try {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var wrap = doc.getElementsByClassName("fans-badge-list")[0];
    var last = wrap ? wrap.lastElementChild : null;
    if (!last || !last.children) return out;
    var rows = last.children;
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      if (!tr || tr.tagName !== "TR") continue;
      var name = "";
      var link = tr.querySelector("a[title]");
      if (link) name = (link.getAttribute("title") || "").trim();
      if (!name) {
        var txt = (tr.textContent || "").replace(/\s+/g, " ").trim();
        name = txt.split(" ")[0] || "未知徽章";
      }
      var level = parseInt(tr.getAttribute("data-fans-level"), 10);
      var intimacy = parseFloat(tr.getAttribute("data-fans-intimacy"));
      var rank = parseInt(tr.getAttribute("data-fans-rank"), 10);
      // 今日亲密度在表格第 4 列（表头：徽章 / 主播 / 亲密值 / 今日亲密度 / 排名 / 操作）
      var tds = tr.children;
      var todayText = tds && tds.length > 3 ? (tds[3].textContent || "").trim() : "";
      var today = parseFloat(todayText);
      var rowText = (tr.textContent || "").replace(/\s+/g, " ");
      out.push({
        rid: tr.getAttribute("data-fans-room") || "",
        name: name,
        level: isNaN(level) ? 0 : level,
        intimacy: isNaN(intimacy) ? NaN : intimacy,
        today: isNaN(today) ? 0 : today,
        rank: isNaN(rank) ? NaN : rank,
        worn: rowText.indexOf("取消佩戴") !== -1
      });
    }
  } catch (e) {
    if (typeof ExGuard_warn === "function") ExGuard_warn("续牌", "粉丝牌列表解析失败", e);
  }
  return out;
}

function FansContinue_escape(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
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
          <span class="fans-panel__card-title">粉丝牌明细</span>
          <span class="fans-panel__badge-tag" id="fans-panel-badge-tip">亲密值 · 今日</span>
        </div>
        <div class="fans-panel__badge-list" id="fans-panel-badge-list">
          <div class="fans-panel__badge-empty">打开面板时读取…</div>
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
  /* 主按钮「立即开始续牌」常驻面板底部（与同屏面板一致）：按钮必须始终可见可点。
     只能内联样式 —— 操作区有"只允许一条统一 CSS 规则"的构建护栏（见测试场景 11）。 */
  if (typeof ExUI_stickActionBar === "function") ExUI_stickActionBar(p);

  // 建好就把数据拉起来：此时面板还没显示，读到结果再显示也就不闪占位符
  try { updateFansContinuePanel(); } catch (e) { console.warn("[DouyuEx] 续牌面板初次读取失败", e); }

  let saved = localStorage.getItem("ExSave_FansContinue");
  if (saved) {
    let inp = p.querySelector("#fans-panel-stick-input");
    if (inp) inp.value = saved;
  }

  // 佩戴 / 卸下：事件委托到列表容器，每次重绘不用重新绑定
  const badgeListEl = p.querySelector("#fans-panel-badge-list");
  if (badgeListEl) {
    badgeListEl.addEventListener("click", function (ev) {
      const btn = ev && ev.target && ev.target.closest ? ev.target.closest(".fans-panel__badge-wear") : null;
      if (!btn) return;
      ev.stopPropagation();
      const rid = btn.getAttribute("data-rid");
      const worn = btn.getAttribute("data-worn") === "1";
      FansContinue_setWear(rid, worn ? 2 : 1, btn);
    });
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
