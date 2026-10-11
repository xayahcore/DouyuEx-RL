function initPkg_PopupPlayer() {
  initPkg_PopupPlayer_Dom();
  initPkg_PopupPlayer_Func();
}

function initPkg_PopupPlayer_Dom() {
  PopupPlayer_insertIcon();
}

function PopupPlayer_insertIcon() {
  let a = document.createElement("div");
  a.className = "popup-player";
  a.innerHTML =
    '<a class="ex-panel__icon" title="同屏播放"><svg style="display:block;" t="1579448049771" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1804" width="30" height="30"><path d="M353.024 900.416H109.952c-57.856 0-109.952-46.336-109.952-98.432V153.6c0-52.096 52.096-98.432 109.952-98.432h810.176c57.856 0 104.192 46.336 104.192 98.496v185.472c0 28.928-23.168 52.096-46.336 52.096s-46.272-23.168-46.272-52.096V159.36H98.368V807.68h248.896c34.688 0 52.032 17.408 52.032 46.336 0 28.928-17.344 46.272-46.272 46.272" fill="#f26b1f" p-id="1805"></path><path d="M619.2 631.488c-5.76 0-5.76 5.76-5.76 11.52v223.04c0 5.76 5.76 11.52 5.76 11.52h289.344c5.76 0 11.584-5.76 11.584-11.52v-222.976c0-5.824-5.76-11.584-11.52-11.584H619.136z m289.344 338.688h-289.28a103.68 103.68 0 0 1-104.192-104.128v-222.976c0-57.92 46.272-109.952 104.128-109.952h289.344c57.856 0 104.128 46.272 104.128 109.952v222.976c5.824 57.856-40.448 104.128-104.128 104.128z" fill="#f26b1f" p-id="1806"></path></svg><i id="popup-player__tip" class="ex-panel__tip"></i></a>';

  let b = document.getElementsByClassName("ex-panel__wrap")[0];
  if (b) b.insertBefore(a, b.childNodes[0]);
}

function initPkg_PopupPlayer_Func() {
  let btn = document.getElementsByClassName("popup-player")[0];
  if (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      let panel = document.querySelector(".popup-player-panel");
      if (!panel) {
        createPopupPlayerPanel();
        panel = document.querySelector(".popup-player-panel");
      }
      if (panel) {
        if (panel.style.display === "block" || panel.style.display === "flex") {
          panel.style.setProperty("display", "none", "important");
        } else {
          // 每次打开都重画一遍：多屏状态可能在这期间被别处改过（编辑条选了档位、
          // 缩窗口触发了自动换档、拖拽换了位），面板上的档位角标与勾选态必须是当下的
          PopupPlayer_renderMultiPage();
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

function createPopupPlayerPanel() {
  if (document.querySelector(".popup-player-panel")) return;
  var p = document.createElement("div");
  p.className = "popup-player-panel miuix-modal";
  p.innerHTML = `
    <div class="miuix-modal__body">
      <div class="popup-panel__page" data-page="multi">
        <div class="popup-panel__card">
          <div class="popup-panel__card-header">
            <span class="popup-panel__card-title">已加入多屏 <em class="popup-ms__count" id="popup-ms-count">1 / 5</em></span>
          </div>
          <div class="popup-ms__restore" id="popup-ms-restore" hidden></div>
          <div class="popup-ms__rooms" id="popup-ms-rooms"></div>
          <div class="popup-ms__qrow">
            <span class="popup-ms__qlabel">外房清晰度</span>
            <div class="popup-ms__quality miuix-seg" id="popup-ms-quality"></div>
          </div>
        </div>

        <div class="popup-panel__card">
          <div class="popup-panel__card-header">
            <span class="popup-panel__card-title">添加房间</span>
            <button type="button" class="popup-panel__paste-btn" id="popup-ms-search-btn">搜索</button>
          </div>
          <div class="popup-panel__input-box">
            <input type="text" id="popup-ms-search" placeholder="房间号 / 直播间链接 / 主播名" />
          </div>
          <div class="popup-ms__src">
            <button type="button" class="popup-panel__paste-btn popup-ms__src-btn" data-src="follow">关注在播</button>
            <button type="button" class="popup-panel__paste-btn popup-ms__src-btn" data-src="recent">最近看过</button>
          </div>
          <div class="popup-ms__results" id="popup-ms-results"></div>
        </div>

        <div class="popup-panel__action-wrap">
          <button type="button" class="ex-btn-primary popup-panel__submit-btn" id="popup-ms-toggle-btn">开启多屏</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(p);
  if (typeof ensureMiuixPanelHeader === "function") {
    ensureMiuixPanelHeader(p, "同屏播放器");
  }

  /* 主操作（开启/退出多屏）常驻面板底部：房间多时页面会滚动，按钮必须一直点得到。
     刻意用内联样式 —— 操作区容器在构建期有"只允许一条统一规则"的护栏（见测试场景 11），
     面板专属的粘底不能写进共享 CSS。 */
  let actWrap = p.querySelector(".popup-panel__action-wrap");
  if (actWrap) {
    actWrap.style.position = "sticky";
    actWrap.style.bottom = "0";
    actWrap.style.zIndex = "3";
    actWrap.style.paddingTop = "8px";
    actWrap.style.background = "linear-gradient(to top, rgba(255,255,255,0.78) 62%, rgba(255,255,255,0)) ";
  }
  PopupPlayer_renderMultiPage();
  PopupPlayer_initMultiPage(p);
  /* 面板开着时，多屏状态一变（增删房间、合入开关、自动换档）就重画一遍 ——
     否则行里的档位角标/胶囊会停在打开那一刻的旧值上。面板关着（编辑条顶替）时不重画。 */
  if (typeof MultiScreen_onChange === "function") {
    MultiScreen_onChange(function () {
      let el = document.querySelector(".popup-player-panel");
      if (!el || el.style.display === "none") return;
      PopupPlayer_renderMultiPage();
      /* 再收一次口：刚进多屏/刚恢复配置时，格子尺寸与取流都还在路上，
         档位角标会按"还没套稳的几何"算出来（实测踩过：4 房 50% 的大格先被算成流畅）。
         延迟一拍重画即可 —— 用户正在拖音量条时跳过，别把人家手里的滑块换掉。 */
      clearTimeout(msPanelSettleTimer);
      msPanelSettleTimer = setTimeout(function () {
        msPanelSettleTimer = 0;
        let e2 = document.querySelector(".popup-player-panel");
        if (!e2 || e2.style.display === "none") return;
        let ae = document.activeElement;
        if (ae && ae.tagName === "INPUT" && ae.type === "range" && e2.contains(ae)) return;
        PopupPlayer_renderMultiPage();
      }, 700);
    });
  }
}

/* ---------- 多屏页 ---------- */

function PopupPlayer_initMultiPage(p) {
  let toggleBtn = p.querySelector("#popup-ms-toggle-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (MultiScreen_getList().length > 1) {
        MultiScreen_exit();
        showMessage("已退出多屏", "info");
      } else {
        showMessage("先添加至少 1 个直播间再开启", "warning");
        return;
      }
      PopupPlayer_renderMultiPage();
    });
  }

  let searchBtn = p.querySelector("#popup-ms-search-btn");
  let searchInp = p.querySelector("#popup-ms-search");
  if (searchBtn && searchInp) {
    searchBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      PopupPlayer_msSearch(searchInp.value.trim());
    });
    searchInp.addEventListener("keydown", function (e) {
      e.stopPropagation();
      if (e.key === "Enter") PopupPlayer_msSearch(searchInp.value.trim());
    });
  }

  Array.prototype.forEach.call(p.querySelectorAll(".popup-ms__src-btn"), function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (btn.getAttribute("data-src") === "follow") PopupPlayer_msLoadFollow();
      else PopupPlayer_msLoadRecent();
    });
  });
}

function PopupPlayer_msEsc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function PopupPlayer_renderMultiPage() {
  let countEl = document.getElementById("popup-ms-count");
  let roomsEl = document.getElementById("popup-ms-rooms");
  let toggleBtn = document.getElementById("popup-ms-toggle-btn");
  if (!countEl || !roomsEl) return;

  let list = MultiScreen_getList();
  countEl.textContent = list.length + " / " + MS_MAX_ROOMS;
  PopupPlayer_ensureNames(list);

  let mainRid = MultiScreen_getMainRid();
  roomsEl.innerHTML = list.map(function (r) {
    let rid = PopupPlayer_msEsc(r.rid);
    let isMain = String(r.rid) === String(mainRid);
    let vol = Math.round(MultiScreen_getVolume(r.rid, isMain) * 100);
    let volTitle = isMain
      ? "主房间音量（斗鱼自己的音量条可能把它盖回来）"
      : "这个房间的音量（0 = 静音）";
    let volHtml =
      '<input type="range" class="popup-ms__room-vol" data-rid="' + rid + '"' +
        ' min="0" max="100" step="5" value="' + vol + '" style="--vol:' + vol + '%"' +
        ' title="' + PopupPlayer_msEsc(volTitle) + '" aria-label="音量" />' +
      '<span class="popup-ms__room-volnum">' + vol + "</span>";
    // 第一行：房名 + 房号（主画面）/ 移除
    let head =
      '<div class="popup-ms__room-main">' +
        '<span class="popup-ms__room-name">' + PopupPlayer_msEsc(r.nn || ("房间 " + r.rid)) + "</span>" +
        '<span class="popup-ms__room-rid">' + (isMain ? "主画面" : rid) + "</span>" +
        (isMain ? volHtml : "") +
        (isMain ? "" : '<button type="button" class="popup-ms__room-del" title="移除">×</button>') +
      "</div>";
    // 主房间是这一页的原生本体（画面与弹幕都归斗鱼自己管），没有"合入"一说
    if (isMain) return '<div class="popup-ms__room" data-rid="' + rid + '">' + head + "</div>";

    /* 第二行 = 这个房间"怎么合进来"：合弹幕、合画面、音量。
       两枚胶囊缺省都是开的（aria-pressed=true），点一下即切换并立刻生效。 */
    let dmOn = MultiScreen_isRoomOn(r.rid, "danmaku");
    let vdOn = MultiScreen_isRoomOn(r.rid, "video");
    let qnName = MultiScreen_roomQnName(r.rid);
    let qnTitle = MultiScreen_getQuality() === "auto"
      ? "当前档位（自动档按格子大小选出来的，缩放窗口会跟着变）"
      : "当前档位（手动选择）";
    let sub =
      '<div class="popup-ms__room-sub">' +
        PopupPlayer_chip(r.rid, "danmaku", dmOn, "弹幕", "合入这个房间的弹幕（关掉就不再连它的弹幕）") +
        PopupPlayer_chip(r.rid, "video", vdOn, "画面", "合入这个房间的画面（关掉后这个房间不占格子，只把它的弹幕合进来，省一份带宽）") +
        (qnName ? '<span class="popup-ms__room-qn" title="' + PopupPlayer_msEsc(qnTitle) + '">' + PopupPlayer_msEsc(qnName) + "</span>" : "") +
        '<span class="popup-ms__room-grow"></span>' +
        volHtml +
      "</div>";
    return '<div class="popup-ms__room" data-rid="' + rid + '">' + head + sub + "</div>";
  }).join("");

  Array.prototype.forEach.call(roomsEl.querySelectorAll(".popup-ms__room-vol"), function (inp) {
    let sync = function () {
      let v = Math.max(0, Math.min(100, Number(inp.value) || 0));
      inp.style.setProperty("--vol", v + "%");
      let num = inp.parentElement ? inp.parentElement.querySelector(".popup-ms__room-volnum") : null;
      if (num) num.textContent = String(v);
      MultiScreen_setVolume(inp.getAttribute("data-rid"), v / 100);
    };
    inp.addEventListener("input", sync);
    // 拖音量不该被当成"点了面板"（面板/二级菜单有自己的点击与悬停逻辑）
    ["mousedown", "click", "pointerdown"].forEach(function (t) {
      inp.addEventListener(t, function (e) { e.stopPropagation(); });
    });
  });

  Array.prototype.forEach.call(roomsEl.querySelectorAll(".popup-ms__chip"), function (btn) {
    let stop = function (e) { e.stopPropagation(); };
    ["mousedown", "click", "pointerdown"].forEach(function (t) { btn.addEventListener(t, stop); });
    btn.addEventListener("click", function () {
      let rid = btn.getAttribute("data-rid");
      let key = btn.getAttribute("data-key");
      let wasOn = btn.getAttribute("aria-pressed") === "true";
      if (!MultiScreen_setRoomFlag(rid, key, !wasOn)) return;
      PopupPlayer_renderMultiPage();
      if (key === "danmaku") {
        showMessage(wasOn ? "已停止合入这个房间的弹幕" : "已开始合入这个房间的弹幕", "info");
      } else {
        showMessage(wasOn ? "已关闭这个房间的画面（只合入弹幕）" : "已开始加载这个房间的画面", "info");
      }
    });
  });

  Array.prototype.forEach.call(roomsEl.querySelectorAll(".popup-ms__room-del"), function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      let row = btn.closest(".popup-ms__room");
      MultiScreen_removeRoom(row.getAttribute("data-rid"));
      PopupPlayer_renderMultiPage();
    });
  });

  PopupPlayer_renderQualityRow();

  // 上次的多屏配置（按主房记忆）：有就显示一行，一键恢复
  let restoreEl = document.getElementById("popup-ms-restore");
  if (restoreEl) {
    let saved = MultiScreen_savedConfigForMainRoom();
    if (!saved || !saved.length) {
      restoreEl.hidden = true;
      restoreEl.innerHTML = "";
    } else {
      let names = saved.map(function (r) { return r.nn || ("房间 " + r.rid); }).join("、");
      restoreEl.hidden = false;
      restoreEl.innerHTML =
        "<span class=\"popup-ms__restore-text\" title=\"" + PopupPlayer_msEsc(names) + "\">上次配置：" +
          saved.length + " 个房间 · " + PopupPlayer_msEsc(names) + "</span>" +
        "<button type=\"button\" class=\"popup-panel__paste-btn\" id=\"popup-ms-restore-btn\">一键恢复</button>";
      let rb = restoreEl.querySelector("#popup-ms-restore-btn");
      if (rb) rb.addEventListener("click", function (e) {
        e.stopPropagation();
        MultiScreen_enter(saved);
        PopupPlayer_renderMultiPage();
        showMessage("已恢复上次的多屏配置", "success");
      });
    }
  }

  if (toggleBtn) toggleBtn.textContent = list.length > 1 ? "退出多屏" : "开启多屏";
}

/* 补房名：一键恢复回来的配置里只有外房，主房间那一行没有名字（列表项 nn 为空）。
   房名从 betard 补一次（MultiScreen_resolveRoom 自带缓存，同房只请求一次），补到就重画。
   问过一次就不再问 —— 失败时也不能让"重画 → 再问"转成死循环。 */
let msPanelNameAsked = {};
let msPanelSettleTimer = 0;

function PopupPlayer_ensureNames(list) {
  if (typeof MultiScreen_resolveRoom !== "function") return;
  list.forEach(function (r) {
    let k = String(r.rid);
    if (r.nn || msPanelNameAsked[k]) return;
    let cached = typeof MultiScreen_getMetaName === "function" ? MultiScreen_getMetaName(k) : "";
    if (cached) { r.nn = cached; return; }
    msPanelNameAsked[k] = 1;
    MultiScreen_resolveRoom(r, function (meta) {
      if (!meta || !meta.nn || r.nn) return;
      r.nn = meta.nn;   // 补在列表项上：既修显示，也会随下一次保存一起落盘
      PopupPlayer_renderMultiPage();
    });
  });
}

/* 每房间那两枚"合入"胶囊：aria-pressed 既是语义也是样式钩子（按下的样子见 CSS） */
function PopupPlayer_chip(rid, key, on, label, title) {
  return '<button type="button" class="popup-ms__chip" data-rid="' + PopupPlayer_msEsc(rid) + '"' +
    ' data-key="' + key + '" aria-pressed="' + (on ? "true" : "false") + '"' +
    ' title="' + PopupPlayer_msEsc(title) + '">' + label + "</button>";
}

/* 外房清晰度：与编辑条顶栏那颗胶囊同一处状态（MultiScreen_setQuality）。
   放这里是为了"不用先开编辑条也能看见/能改"—— 自动档的当前档位就显示在每个房间行里。 */
function PopupPlayer_renderQualityRow() {
  let box = document.getElementById("popup-ms-quality");
  if (!box || typeof MultiScreen_getQuality !== "function") return;
  let cur = String(MultiScreen_getQuality());
  box.innerHTML = MS_QUALITY_LIST.map(function (q) {
    let tip = q.v === "auto"
      ? "按每个格子的实际大小选档：大格给最高档，小格自动降档（每个房间行的角标就是它选出来的档位）"
      : "外房固定用「" + q.name + "」";
    return '<label class="miuix-seg__item" title="' + PopupPlayer_msEsc(tip) + '">' +
      '<input type="radio" name="ms_quality_panel" value="' + q.v + '"' + (cur === q.v ? " checked" : "") + " />" +
      '<span class="miuix-seg__label">' + PopupPlayer_msEsc(q.short || q.name) + "</span>" +
    "</label>";
  }).join("");
  Array.prototype.forEach.call(box.querySelectorAll('input[name="ms_quality_panel"]'), function (radio) {
    radio.addEventListener("change", function () {
      if (radio.checked) MultiScreen_setQuality(radio.value);
    });
  });
}

/* 搜索结果行点击 = 加入 / 移出多屏。
   这套规则原先寄生在编辑条（MS_EditBar_toggleRoom）里，编辑条整体删掉后搬到这里：
   主房间本来就在（静默返回）、未开播不加、满员不加、已加入的再点一次即移出。
   ⚠ 移出不设"最少 2 个"的门槛：关到只剩主房间就自然退回单屏（用户 2026-10-06 定）。
   ⚠ 必须写成"单出口、最后 return ok"：用 `if (… ) return false;` 的早退写法时，
     压缩器会把早退折进主体（`if (a && b) { … }`），返回值退化成 undefined，
     更糟的是"主房间/空 rid"这两条会掉进未开播分支去弹提示（实测：点自己的房间弹"该主播尚未开播喔"）。 */
function PopupPlayer_toggleRoom(room) {
  const rid = String((room && room.rid) || "");
  const mainRid = String(MultiScreen_getMainRid());
  const list = MultiScreen_getList();
  const selected = !!rid && list.some(function (r) { return String(r.rid) === rid; });
  let ok = false;
  if (!rid || rid === mainRid) {
    // 主房间本来就在多屏里（它就是当前直播间），什么都不做、也不提示
  } else if (!selected && room && +room.showStatus === 2) {
    // 未开播的房间：进不了多屏（真取流也只会失败）。原生在此时会退出全屏再提示，这里照做。
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        const pr = document.exitFullscreen();
        if (pr && pr.catch) pr.catch(function () {});
      }
    } catch (e) {}
    showMessage("该主播尚未开播喔", "warning");
  } else if (!selected && list.length >= MS_MAX_ROOMS) {
    showMessage("多屏模式下，最多" + MS_MAX_ROOMS + "个直播间", "warning");
  } else {
    if (selected) MultiScreen_removeRoom(rid);
    else MultiScreen_addRoom(room);
    ok = true;
  }
  return ok;
}

// 统一的结果列表渲染：rows = [{ rid, nn, avatar, showStatus, hot }]
function PopupPlayer_msRenderResults(rows, emptyTip) {
  let box = document.getElementById("popup-ms-results");
  if (!box) return;
  if (!rows.length) {
    box.innerHTML = '<div class="popup-ms__empty">' + PopupPlayer_msEsc(emptyTip || "没有找到房间") + "</div>";
    return;
  }
  let selected = {};
  MultiScreen_getList().forEach(function (r) { selected[String(r.rid)] = 1; });
  box.innerHTML = rows.map(function (r) {
    let rid = String(r.rid);
    let on = selected[rid];
    // 已加入的、以及未开播的，都标记出来（未开播的点了会被编辑条四项校验拦下并提示）
    let flag = on ? '<span class="popup-ms__flag is-on">已加入</span>'
      : (+r.showStatus === 2 ? '<span class="popup-ms__flag">未开播</span>' : "");
    return (
      '<div class="popup-ms__result' + (on ? " is-on" : "") + '" data-rid="' + PopupPlayer_msEsc(rid) + '">' +
        '<span class="popup-ms__result-name">' + PopupPlayer_msEsc(r.nn || ("房间 " + rid)) + "</span>" +
        '<span class="popup-ms__result-meta">' + PopupPlayer_msEsc(rid) + (r.sub ? " · " + PopupPlayer_msEsc(r.sub) : "") + "</span>" +
        flag +
      "</div>"
    );
  }).join("");

  Array.prototype.forEach.call(box.querySelectorAll(".popup-ms__result"), function (row) {
    row.addEventListener("click", function () {
      let rid = row.getAttribute("data-rid");
      let room = rows.filter(function (x) { return String(x.rid) === rid; })[0];
      if (!room) return;
      if (PopupPlayer_toggleRoom(room)) {
        PopupPlayer_renderMultiPage();
        PopupPlayer_msRenderResults(rows, "");
      }
    });
  });
}

/* 搜索走斗鱼自己的搜索接口，与站内搜索同源，不用额外 @connect */
function PopupPlayer_msSearch(kw) {
  if (!kw) {
    showMessage("请输入房间号、链接或主播名", "info");
    return;
  }
  // 纯数字 / 直播间链接直接当房间号处理，省一次搜索
  let bare = String(kw).replace(/^https?:\/\/[^/]*douyu\.com\//i, "").replace(/[^\d]/g, "");
  if (/^\d+$/.test(bare) && String(kw).indexOf("douyu.com") !== -1) {
    if (PopupPlayer_toggleRoom({ rid: bare, nn: "", avatar: "", showStatus: undefined })) {
      PopupPlayer_renderMultiPage();
      PopupPlayer_msRenderResults([], "");
    }
    return;
  }

  fetch("https://www.douyu.com/japi/search/api/getSearchRec?kw=" + encodeURIComponent(kw) + "&type=all", {
    method: "GET",
    mode: "no-cors",
    credentials: "include"
  }).then(function (r) { return r.json(); }).then(function (ret) {
    let d = (ret && ret.data) || ret || {};
    let arr = d.roomResult || (d.room && d.room.list) || [];
    let rows = arr.map(function (it) {
      return {
        rid: String(it.rid || it.room_id || ""),
        nn: it.nickName || it.nickname || it.room_name || "",
        avatar: it.avatar || it.avatar_small || "",
        // isLive 为真即在播；接口若没给，留 undefined 不做判定
        showStatus: it.isLive === undefined ? undefined : (it.isLive ? 1 : 2),
        sub: it.cateName || "",
        hot: it.hot || ""
      };
    }).filter(function (r) { return r.rid; });
    PopupPlayer_msRenderResults(rows, "没有搜到相关直播间");
  }).catch(function () {
    showMessage("搜索失败，请稍后重试", "error");
  });
}

/* 关注在播：复用关注列表接口，取「正在直播且非录播」的前若干 */
function PopupPlayer_msLoadFollow() {
  if (typeof getFollowList !== "function") return;
  getFollowList().then(function (ret) {
    if (!ret || String(ret.error) !== "0") {
      showMessage("关注列表获取失败，可能未登录", "error");
      return;
    }
    let arr = (ret.data && ret.data.list) || [];
    let rows = arr.filter(function (it) {
      return it.show_status == "1" && it.videoLoop == "0";
    }).map(function (it) {
      return {
        rid: String(it.room_id),
        nn: it.nickname || it.room_name || "",
        avatar: String(it.avatar_small || "").replace("_big", "_small"),
        showStatus: 1,
        hot: it.online || ""
      };
    }).slice(0, 50);
    PopupPlayer_msRenderResults(rows, "关注的直播间当前都没有开播");
  });
}

/* 最近看过：斗鱼没有可用的公开"最近观看"接口，这份列表是本插件自己维护的本地记录
   （凡进过多屏的房间都会记一笔），存 ExSave_MultiScreenRecent */
function PopupPlayer_msLoadRecent() {
  let rows = MultiScreen_getRecent();
  PopupPlayer_msRenderResults(rows, "还没有多屏观看记录");
}
