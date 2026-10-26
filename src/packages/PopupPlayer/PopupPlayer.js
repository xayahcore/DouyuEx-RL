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
      if (!panel) return;
      /* 点击 = **只开不关**（与签到 / 一键续牌 / 版本更新一致）。
         Dock 图标是"划过即打开"的（ExPanel 的 ensureDockIndicators 给 showExRightPanel 传 forceOpen），
         所以指针移到图标上时面板其实已经开了；这里若还做 toggle，"移过去 → 点一下"的必然结果
         就是"刚弹出来又被自己关掉"，看起来像图标坏了。关闭只留两个出口：右上角 × 与 ESC。 */
      // 每次打开都重画一遍：多屏状态可能在这期间被别处改过（面板选了档位、
      // 缩窗口触发了自动换档、拖拽换了位），面板上的档位角标与勾选态必须是当下的
      PopupPlayer_renderMultiPage();
      if (typeof openMiuixPanelCentered === "function") {
        openMiuixPanelCentered(panel, btn);
      } else {
        panel.style.setProperty("display", "flex", "important");
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
            <span class="popup-panel__card-title">同屏里的房间 <em class="popup-ms__count" id="popup-ms-count">1 / 5</em></span>
          </div>
          <div class="popup-ms__restore" id="popup-ms-restore" hidden></div>
          <div class="popup-ms__rooms" id="popup-ms-rooms"></div>
          <div class="popup-ms__qrow">
            <span class="popup-ms__qlabel">其它房间清晰度</span>
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
          <button type="button" class="ex-btn-primary popup-panel__submit-btn" id="popup-ms-toggle-btn">先加一个房间</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(p);
  if (typeof ensureMiuixPanelHeader === "function") {
    ensureMiuixPanelHeader(p, "同屏播放");
  }
  PopupPlayer_bindEscClose();

  /* 主操作（退出同屏 / 先加一个房间）常驻面板底部：房间多时页面会滚动，按钮必须一直点得到。
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
        showMessage("已退出同屏 · 房间都记着，下次点「一键恢复」", "info");
      } else {
        // 按钮在这种状态下是 disabled，这里只是兜底（其余入口仍可能走到）
        showMessage("先在下面加一个房间，加上就自动开始", "warning");
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
      /* ESC 必须放行（P1-1）：面板的关闭监听挂在 document 的冒泡阶段，
         这里无差别 stopPropagation 会把它吃掉 —— 用户在搜索框里按 ESC 时面板关不掉。
         其余按键继续拦住，免得边搜边把斗鱼自己的快捷键（空格暂停之类）一起触发。 */
      if (e.key === "Escape" || e.keyCode === 27) return;
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
  let mainRid = MultiScreen_getMainRid();
  /* 还没进同屏时 msActiveList 是空的：当前这一间本来就在，补一条**只用于显示**的虚拟行。
     否则面板写着 0 / 5、一间房都看不到，主房音量条也没处可点（静态模板默认写的就是 1 / 5）。 */
  if (!list.length && mainRid) list = [{ rid: mainRid, nn: "", avatar: "" }];
  countEl.textContent = list.length + " / " + MS_MAX_ROOMS;
  PopupPlayer_ensureNames(list);

  // 5 间房时这个列表一直在内部滚动中：重画前后要保住位置，别把人弹回顶部
  let roomsScroll = roomsEl.scrollTop;
  roomsEl.innerHTML = list.map(function (r) {
    let rid = PopupPlayer_msEsc(r.rid);
    let isMain = String(r.rid) === String(mainRid);
    let vol = Math.round(MultiScreen_getVolume(r.rid, isMain) * 100);
    let volTitle = isMain
      ? "当前直播间音量（斗鱼自己的音量条可能把它改回来）"
      : "这间房的音量（拖到 0 = 静音）";
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
      ? "当前清晰度（自动：按每块画面的大小选，缩放窗口会跟着变）"
      : "当前清晰度（手动选择）";
    let sub =
      '<div class="popup-ms__room-sub">' +
        PopupPlayer_chip(r.rid, "danmaku", dmOn, "弹幕", "把这个房间的弹幕也显示在这里（关掉就不再接收它的弹幕）") +
        PopupPlayer_chip(r.rid, "video", vdOn, "画面", "把这个房间的画面也放进来（关掉后只留它的弹幕，省一份网速）") +
        (qnName ? '<span class="popup-ms__room-qn" title="' + PopupPlayer_msEsc(qnTitle) + '">' + PopupPlayer_msEsc(qnName) + "</span>" : "") +
        '<span class="popup-ms__room-grow"></span>' +
        volHtml +
      "</div>";
    return '<div class="popup-ms__room" data-rid="' + rid + '">' + head + sub + "</div>";
  }).join("");
  roomsEl.scrollTop = roomsScroll;

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
        showMessage(wasOn ? "已停止接收这间房的弹幕" : "已开始接收这间房的弹幕", "info");
      } else {
        showMessage(wasOn ? "已关掉这间房的画面（只留弹幕）" : "已开始显示这间房的画面", "info");
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
      let totalRooms = saved.length + 1;   // saved 里只有其它房间，当前这一间也算在一套里
      restoreEl.hidden = false;
      restoreEl.innerHTML =
        "<span class=\"popup-ms__restore-text\" title=\"" + PopupPlayer_msEsc(names) + "\">上次同屏：" +
          totalRooms + " 个房间 · " + PopupPlayer_msEsc(names) + "</span>" +
        "<button type=\"button\" class=\"popup-panel__paste-btn\" id=\"popup-ms-restore-btn\">一键恢复</button>";
      let rb = restoreEl.querySelector("#popup-ms-restore-btn");
      if (rb) rb.addEventListener("click", function (e) {
        e.stopPropagation();
        let before = MultiScreen_getList().length;
        MultiScreen_enter(saved);
        PopupPlayer_renderMultiPage();
        showMessage(before > 1
          ? "已恢复上次的同屏配置 · " + totalRooms + " 个房间（替换了原来的 " + before + " 间）"
          : "已恢复上次的同屏配置 · " + totalRooms + " 个房间",
          "success");
      });
    }
  }

  if (toggleBtn) {
    let inMulti = list.length > 1;
    toggleBtn.textContent = inMulti ? "退出同屏" : "先加一个房间";
    toggleBtn.disabled = !inMulti;
    toggleBtn.title = inMulti
      ? "退出同屏（房间都记着，下次可一键恢复）"
      : "在下面搜房间号，加进来就自动开始";
  }
}

/* 补房名：一键恢复回来的配置里只有外房，主房间那一行没有名字（列表项 nn 为空）。
   房名从 betard 补一次（MultiScreen_resolveRoom 自带缓存，同房只请求一次），补到就重画。
   问过一次就不再问 —— 失败时也不能让"重画 → 再问"转成死循环。 */
let msPanelNameAsked = {};
let msPanelSettleTimer = 0;
let msPanelEscBound = false;

/* 面板是 fixed 的三级弹窗，用户第一反应是按 ESC 收起。
   监听走 document 的冒泡阶段（与 ExpandTool_GiftPicker / VideoToolbarMenu 同一种写法），
   不占 capture，免得把礼包选择器的 ESC 抢掉；全屏看直播时 ESC 归浏览器（退出全屏），不拦。 */
function PopupPlayer_bindEscClose() {
  if (msPanelEscBound) return;
  msPanelEscBound = true;
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" && e.keyCode !== 27) return;
    if (document.fullscreenElement) return;
    let panel = document.querySelector(".popup-player-panel");
    if (!panel) return;
    if (panel.style.display !== "flex" && panel.style.display !== "block") return;
    panel.style.removeProperty("display");
    panel.style.setProperty("display", "none", "important");
    panel.classList.remove("miuix-modal-in");
    if (typeof updateDockActiveIndicator === "function") updateDockActiveIndicator();
  });
}

/* 本页主播名：主房间就是当前这个直播间，标题栏里本来就有名字，没必要为它再打一次接口。
   斗鱼两种版式（.Title-anchorName / .anchorName__6NXv9）都取不到才退回页面标题。 */
function PopupPlayer_readPageAnchorName() {
  let name = "";
  try {
    let el = document.querySelector(".Title-anchorName")
      || document.querySelector(".anchorName__6NXv9")
      || document.querySelector('[class*="Title-anchorName"]');
    if (el) name = String(el.textContent || "").trim();
  } catch (e) { name = ""; }
  if (name) return name.slice(0, 40);

  // 页面标题形如「主播名 - 斗鱼」「主播名的直播间 - 斗鱼」；站点名本身（含「斗鱼」）一律不认
  let t = "";
  try { t = String(document.title || "").trim(); } catch (e) { t = ""; }
  if (!t) return "";
  t = t.replace(/[-_|–—]\s*斗鱼.*$/, "").trim();
  t = t.replace(/^直播[·:：\s]*/, "").trim();
  t = t.replace(/的直播间$/, "").trim();
  if (!t || t.length > 30 || t.indexOf("斗鱼") !== -1) return "";
  return t;
}

function PopupPlayer_ensureNames(list) {
  if (typeof MultiScreen_resolveRoom !== "function") return;
  let mainRid = typeof MultiScreen_getMainRid === "function" ? String(MultiScreen_getMainRid()) : "";
  list.forEach(function (r) {
    let k = String(r.rid);
    if (r.nn) return;
    /* ① 缓存优先于「问过没」的标志（P0-2）。主房间在每次归一化里都会新建一个 nn 为空的对象
       （MultiScreen_normalize 补的那一条），若先看标志就直接返回，于是面板第一行永远停在
       「房间 7523467」。缓存里有名字就先补上，一个请求都不用发。 */
    let cached = typeof MultiScreen_getMetaName === "function" ? MultiScreen_getMetaName(k) : "";
    if (cached) { r.nn = cached; return; }
    /* ② 主房间的名字就在本页标题栏：先读页面，读不到才去问接口（问过就不再重复问） */
    if (mainRid && k === mainRid) {
      let pageName = PopupPlayer_readPageAnchorName();
      if (pageName) { r.nn = pageName; return; }
    }
    if (msPanelNameAsked[k]) return;
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

/* 其它房间的清晰度：与多屏状态同一处来源（MultiScreen_setQuality）。
   编辑条删除后这里是唯一入口 —— 自动档的当前清晰度就显示在每个房间行里。 */
function PopupPlayer_renderQualityRow() {
  let box = document.getElementById("popup-ms-quality");
  if (!box || typeof MultiScreen_getQuality !== "function") return;
  let cur = String(MultiScreen_getQuality());
  box.innerHTML = MS_QUALITY_LIST.map(function (q) {
    let tip = q.v === "auto"
      ? "自动：按每块画面的实际大小选清晰度，大的给最高、小的自动降（每行右边那枚小标签就是它选出来的）"
      : "其它房间固定用「" + q.name + "」";
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
    showMessage("主播还没开播 · 等他上线再加", "warning");
  } else if (!selected && list.length >= MS_MAX_ROOMS) {
    showMessage("同屏最多 " + MS_MAX_ROOMS + " 个房间 · 先去掉一间再加", "warning");
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
  let keepScroll = box.scrollTop;   // 结果区同样是内部滚动，重画别把人弹回顶部
  if (!rows.length) {
    // 显式传空串 = 清空结果区：链接/房间号直接加入成功时，不该再说一句「没找到」
    box.innerHTML = emptyTip === ""
      ? ""
      : '<div class="popup-ms__empty">' + PopupPlayer_msEsc(emptyTip || "没有找到房间") + "</div>";
    return;
  }
  let selected = {};
  MultiScreen_getList().forEach(function (r) { selected[String(r.rid)] = 1; });
  box.innerHTML = rows.map(function (r) {
    let rid = String(r.rid);
    let on = selected[rid];
    // 已在同屏里的、以及没开播的，都先标出来（没开播的点了会被校验拦下并提示）
    let flag = on ? '<span class="popup-ms__flag is-on">同屏里</span>'
      : (+r.showStatus === 2 ? '<span class="popup-ms__flag">没开播</span>' : "");
    /* 行是真正的 <button>：Tab 能选中、Enter / Space 即加入（此前是 div，键盘用户根本加不了房） */
    return (
      '<button type="button" class="popup-ms__result' + (on ? " is-on" : "") + '" data-rid="' + PopupPlayer_msEsc(rid) + '">' +
        '<span class="popup-ms__result-name">' + PopupPlayer_msEsc(r.nn || ("房间 " + rid)) + "</span>" +
        '<span class="popup-ms__result-meta">' + PopupPlayer_msEsc(rid) + (r.sub ? " · " + PopupPlayer_msEsc(r.sub) : "") + "</span>" +
        flag +
      "</button>"
    );
  }).join("");
  box.scrollTop = keepScroll;

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
  if (!String(kw == null ? "" : kw).trim()) {
    showMessage("请输入房间号、链接或主播名", "info");
    return;
  }
  /* 直播间链接只取 douyu.com/<数字> 这一段。早先用 replace(/[^\d]/g,"") 把握手串与
     分享参数里的数字也拼进房号（.../2288?dyshid=1 → 22881），会加进一个不存在的房间。 */
  let q = String(kw).trim();
  let linkMatch = q.match(/douyu\.com\/(\d+)/i);
  if (linkMatch) {
    PopupPlayer_msQuickAdd(linkMatch[1]);
    return;
  }
  // 纯数字：直接当房间号加进来，省一次搜索
  if (/^\d+$/.test(q)) {
    PopupPlayer_msQuickAdd(q);
    return;
  }

  let box = document.getElementById("popup-ms-results");
  if (box) box.innerHTML = '<div class="popup-ms__empty">搜索中…</div>';
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
    PopupPlayer_msRenderResults(rows, "没找到相关直播间");
  }).catch(function () {
    showMessage("没搜成 · 网络有点慢，检查一下网络再点一次「搜索」", "error");
  });
}

/* 直接按房间号加入（链接 / 纯数字走这里）。
   这里刻意不做"再点一次就移除"：手输的房号被悄悄删掉会莫名其妙 —— 移除只留房间行上的 ×。 */
function PopupPlayer_msQuickAdd(rid) {
  let id = String(rid);
  if (!id) return;
  if (id === String(MultiScreen_getMainRid())) {
    showMessage("这就是当前直播间，已经在同屏里了", "info");
    return;
  }
  let exists = MultiScreen_getList().some(function (r) { return String(r.rid) === id; });
  if (exists) {
    showMessage("这间房已经在同屏里了", "info");
    return;
  }
  if (PopupPlayer_toggleRoom({ rid: id, nn: "", avatar: "", showStatus: undefined })) {
    PopupPlayer_renderMultiPage();
    PopupPlayer_msRenderResults([], "");
  }
}

/* 关注在播：复用关注列表接口，取「正在直播且非录播」的前若干 */
function PopupPlayer_msLoadFollow() {
  if (typeof getFollowList !== "function") {
    showMessage("读不到关注列表 · 这个功能没装上，刷新页面再试", "error");
    PopupPlayer_msRenderResults([], "读不到关注列表 · 这个功能没装上，刷新页面再试");
    return;
  }
  PopupPlayer_msRenderResults([], "正在加载关注列表…");
  getFollowList().then(function (ret) {
    if (!ret || String(ret.error) !== "0") {
      /* 失败必须把结果区从「正在加载…」换掉（P1-2）：只弹一条 toast 的话，卡片里那句加载文案
         会一直停在那里，看起来像永远在转、又没有任何可点的东西。 */
      PopupPlayer_msRenderResults([], "读不到关注列表 · 可能还没登录，也可能网络慢；点一次「关注在播」重试");
      showMessage("读不到关注列表 · 可能是还没登录，也可能是网络有点慢", "error");
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
    PopupPlayer_msRenderResults(rows, "关注的主播现在都没开播");
  }).catch(function () {
    PopupPlayer_msRenderResults([], "读不到关注列表 · 网络有点慢，稍后再点一次");
  });
}

/* 最近看过：斗鱼没有可用的公开"最近观看"接口，这份列表是本插件自己维护的本地记录
   （凡进过多屏的房间都会记一笔），存 ExSave_MultiScreenRecent */
function PopupPlayer_msLoadRecent() {
  let rows = MultiScreen_getRecent();
  PopupPlayer_msRenderResults(rows, "还没有同屏观看记录");
}
