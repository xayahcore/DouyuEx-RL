var videoPlayerArr = [];

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
      <div class="miuix-seg popup-panel__tabs">
        <label class="miuix-seg__item">
          <input type="radio" name="popup_player_tab" value="single" checked /><span class="miuix-seg__label">单窗播放</span>
        </label>
        <label class="miuix-seg__item">
          <input type="radio" name="popup_player_tab" value="multi" /><span class="miuix-seg__label">多屏观看</span>
        </label>
      </div>

      <div class="popup-panel__page" data-page="single">
        <div class="popup-panel__card">
          <div class="popup-panel__card-header">
            <span class="popup-panel__card-title">直播流或房间地址</span>
            <button type="button" class="popup-panel__paste-btn" id="popup-panel-paste">粘贴</button>
          </div>
          <div class="popup-panel__input-box">
            <input type="text" id="popup-panel-url" value="https://www.douyu.com/4042402" placeholder="支持斗鱼/虎牙/B站房间号或直播流" />
          </div>
        </div>

        <div class="popup-panel__card">
          <div class="popup-panel__card-header">
            <span class="popup-panel__card-title">同屏播放模式</span>
          </div>
          <div class="miuix-seg">
            <label class="miuix-seg__item">
              <input type="radio" name="popup_player_mode" value="noiframe" checked /><span class="miuix-seg__label">无弹幕极速流 (推荐)</span>
            </label>
            <label class="miuix-seg__item">
              <input type="radio" name="popup_player_mode" value="iframe" /><span class="miuix-seg__label">全功能有弹幕</span>
            </label>
          </div>
        </div>

        <div class="popup-panel__action-wrap">
          <button type="button" class="ex-btn-primary popup-panel__submit-btn" id="popup-panel-start-btn">
            载入同屏流
          </button>
        </div>
      </div>

      <div class="popup-panel__page" data-page="multi" hidden>
        <div class="popup-panel__card">
          <div class="popup-panel__card-header">
            <span class="popup-panel__card-title">已加入多屏 <em class="popup-ms__count" id="popup-ms-count">1 / 5</em></span>
            <button type="button" class="popup-panel__paste-btn" id="popup-ms-edit">编辑位置顺序</button>
          </div>
          <div class="popup-ms__rooms" id="popup-ms-rooms"></div>
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

  let pasteBtn = p.querySelector("#popup-panel-paste");
  if (pasteBtn) {
    pasteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        var text = await navigator.clipboard.readText();
        if (text) {
          var inp = document.getElementById("popup-panel-url");
          if (inp) inp.value = text.trim();
          showMessage("已从剪贴板粘贴直播流地址", "success");
        }
      } catch (err) {
        showMessage("请允许读取剪贴板权限或手动粘贴", "info");
      }
    });
  }

  let startBtn = p.querySelector("#popup-panel-start-btn");
  if (startBtn) {
    startBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var urlInp = document.getElementById("popup-panel-url");
      var val = urlInp ? urlInp.value.trim() : "";
      var isNoIframe = document.querySelector('input[name="popup_player_mode"][value="noiframe"]')?.checked ?? true;
      executePopupPlayer(val, isNoIframe);
      p.style.setProperty("display", "none", "important");
    });
  }

  PopupPlayer_initTabs(p);
  PopupPlayer_initMultiPage(p);
}

/* ---------- 面板页签：单窗播放 / 多屏观看 ---------- */

function PopupPlayer_initTabs(p) {
  Array.prototype.forEach.call(p.querySelectorAll('input[name="popup_player_tab"]'), function (radio) {
    radio.addEventListener("change", function () {
      if (!radio.checked) return;
      PopupPlayer_switchPage(radio.value);
    });
  });
}

function PopupPlayer_switchPage(name) {
  let panel = document.querySelector(".popup-player-panel");
  if (!panel) return;
  Array.prototype.forEach.call(panel.querySelectorAll(".popup-panel__page"), function (page) {
    page.hidden = page.getAttribute("data-page") !== name;
  });
  if (name === "multi") PopupPlayer_renderMultiPage();
}

/* ---------- 多屏页 ---------- */

function PopupPlayer_initMultiPage(p) {
  let editBtn = p.querySelector("#popup-ms-edit");
  if (editBtn) {
    editBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (MultiScreen_getList().length < MS_MIN_ROOMS) {
        showMessage("多屏模式下，最少需要" + MS_MIN_ROOMS + "个直播间", "warning");
        return;
      }
      // 编辑条是 1:1 复刻的原生编辑面板，开它就收起本面板，避免两层盖住播放器
      p.style.setProperty("display", "none", "important");
      MS_EditBar_show();
    });
  }

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

  let mainRid = MultiScreen_getMainRid();
  roomsEl.innerHTML = list.map(function (r) {
    let isMain = String(r.rid) === String(mainRid);
    return (
      '<div class="popup-ms__room" data-rid="' + PopupPlayer_msEsc(r.rid) + '">' +
        '<span class="popup-ms__room-name">' + PopupPlayer_msEsc(r.nn || ("房间 " + r.rid)) + "</span>" +
        '<span class="popup-ms__room-rid">' + (isMain ? "主画面" : PopupPlayer_msEsc(r.rid)) + "</span>" +
        (isMain ? "" : '<button type="button" class="popup-ms__room-del" title="移除">×</button>') +
      "</div>"
    );
  }).join("");

  Array.prototype.forEach.call(roomsEl.querySelectorAll(".popup-ms__room-del"), function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      let row = btn.parentElement;
      MultiScreen_removeRoom(row.getAttribute("data-rid"));
      PopupPlayer_renderMultiPage();
    });
  });

  if (toggleBtn) toggleBtn.textContent = list.length > 1 ? "退出多屏" : "开启多屏";
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
      // 借道编辑条的勾选逻辑，四项校验与文案一处实现、两处复用
      MS_EditBar_addToPool(room);
      if (MS_EditBar_toggleRoom(rid)) {
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
    MS_EditBar_addToPool({ rid: bare, nn: "", avatar: "", showStatus: undefined });
    if (MS_EditBar_toggleRoom(bare)) {
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

function executePopupPlayer(url, isNoIframe) {
  var t = url ? url.trim() : "";
  if (!t) {
    showMessage("请输入直播间或直播流地址", "error");
    return;
  }
  if (typeof ExLoadLib === "function" && typeof EXURL !== "undefined") {
    ExLoadLib(EXURL.flv);
  }
  let isStream = 150 < t.length && (t.startsWith("http://") || t.startsWith("https://") || t.includes(".flv") || t.includes(".m3u8"));
  if (isStream) {
    createNewVideo_Stream(videoPlayerArr.length, t);
  } else if (isNoIframe) {
    if (t.indexOf("douyu.com") !== -1) {
      getRealRid_Douyu(t, (realRid) => {
        createNewVideo(videoPlayerArr.length, realRid, "Douyu");
      });
    } else if (t.indexOf("bilibili.com") !== -1) {
      getRealRid_Bilibili(t, (realRid) => {
        createNewVideo(videoPlayerArr.length, realRid, "Bilibili");
      });
    } else if (t.indexOf("huya.com") !== -1) {
      createNewVideo(videoPlayerArr.length, t, "Huya");
    } else {
      createNewVideo_Stream(videoPlayerArr.length, t);
    }
  } else {
    createNewVideo_iframe(videoPlayerArr.length, t);
  }
}

window.createPopupPlayerPanel = createPopupPlayerPanel;
window.executePopupPlayer = executePopupPlayer;

function createNewVideo(id, rid, platform) {
  switch (platform) {
    case "Douyu":
      createNewVideo_Douyu(id, rid);
      break;
    case "Bilibili":
      createNewVideo_Bilibili(id, rid);
      break;
    case "Huya":
      let a = String(rid).split("/");
      createNewVideo_Huya(id, a[a.length - 1], a[a.length - 1]);
      break;
    default:
      createNewVideo_Douyu(id, rid);
      break;
  }
}

function setElementVideo(id, l) {
  if (typeof flvjs !== "undefined" && flvjs.isSupported()) {
    var videoElement = document.getElementById("exVideoPlayer" + String(id));
    if (!videoElement) return;
    var flvPlayer = flvjs.createPlayer(
      {
        type: "flv",
        url: l
      },
      { fixAudioTimestampGap: false }
    );
    if (id > videoPlayerArr.length - 1) {
      videoPlayerArr.push(flvPlayer);
    } else {
      videoPlayerArr[id] = flvPlayer;
    }

    flvPlayer.attachMediaElement(videoElement);
    flvPlayer.load();
    flvPlayer.play();
  }
}

function setElementResize(id) {
  let box = document.getElementById("exVideoDiv" + String(id));
  if (!box) return;
  let scale = document.getElementById("exVideoScale" + String(id));
  if (!scale) return;
  scale.onmousedown = function (e) {
    e.stopPropagation();
    e.preventDefault();
    let pos = {
      w: box.offsetWidth,
      h: box.offsetHeight,
      x: e.clientX,
      y: e.clientY
    };
    let w;
    let h;
    function onMouseMove(ev) {
      ev.stopPropagation();
      ev.preventDefault();
      w = Math.max(400, ev.clientX - pos.x + pos.w);
      h = Math.max(0, ev.clientY - pos.y + pos.h);
      w = w >= document.offsetWidth - box.offsetLeft ? document.offsetWidth - box.offsetLeft : w;
      h = h >= document.offsetHeight - box.offsetTop ? document.offsetHeight - box.offsetTop : h;
      box.style.width = w + "px";
      box.style.height = h + "px";
    }
    function onMouseUp(e) {
      e.stopPropagation();
      e.preventDefault();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };
}

function setElementDrag(id) {
  let box = document.getElementById("exVideoDiv" + String(id));
  if (!box) return;
  box.onmousedown = function (event) {
    event.stopPropagation();
    let xx = event.clientX - box.offsetLeft;
    let yy = event.clientY - box.offsetTop;
    let mouseX;
    let mouseY;
    function onMouseMove(event) {
      event.stopPropagation();
      mouseX = event.clientX - xx;
      mouseY = event.clientY - yy;
      box.style.left = mouseX + "px";
      box.style.top = mouseY + "px";
    }
    function onMouseUp(event) {
      event.stopPropagation();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };
}

function createNewVideo_Douyu(id, rid) {
  getRealLive_Douyu(rid, true, false, "1", (lurl) => {
    if (lurl && lurl !== "None") {
      let a = document.createElement("div");
      let html = "";
      a.id = "exVideoDiv" + String(id);
      a.rid = rid;
      a.className = "exVideoDiv";
      html += `<div class='exVideoInfo' id='exVideoInfo${id}'><span class='exVideoRID' id='exVideoRID${id}' style='color:white'>斗鱼 - ${rid}</span>`;
      html += "<a><div class='exVideoClose' id='exVideoClose" + String(id) + "'>X</div></a>";
      html += "</div>";
      html += "<video controls='controls' class='exVideoPlayer' id='exVideoPlayer" + String(id) + "'></video><div class='exVideoScale' id='exVideoScale" + String(id) + "'></div>";
      a.innerHTML = html;
      let b = getValidDom([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"]) || document.body;
      b.insertBefore(a, b.childNodes[0]);
      setElementDrag(id);
      setElementResize(id);
      setElementVideo(id, lurl);
      setElementFunc(id);
    } else {
      showMessage("房间未开播或其他错误", "error");
    }
  });
}

function createNewAudio_Douyu(id, rid) {
  getRealLive_Douyu(rid, true, false, "1428", (lurl) => {
    if (lurl && lurl !== "None") {
      let a = document.createElement("div");
      a.id = "exVideoDiv" + String(id);
      a.rid = rid;
      a.className = "exVideoDiv";
      let html = `<div class='exVideoInfo' id='exVideoInfo${id}'><span class='exVideoRID' id='exVideoRID${id}' style='color:white'>音频 - ${rid}</span>`;
      html += "<a><div class='exVideoClose' id='exVideoClose" + String(id) + "'>X</div></a></div>";
      html += "<video controls='controls' class='exVideoPlayer' id='exVideoPlayer" + String(id) + "'></video><div class='exVideoScale' id='exVideoScale" + String(id) + "'></div>";
      a.innerHTML = html;
      let b = getValidDom([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"]) || document.body;
      b.insertBefore(a, b.childNodes[0]);
      setElementDrag(id);
      setElementResize(id);
      setElementVideo(id, lurl);
      setElementFunc(id);
    } else {
      showMessage("房间未开播或其他错误", "error");
    }
  });
}

function createNewVideo_Bilibili(id, rid) {
  getRealLive_Bilibili(rid, (lurl) => {
    if (lurl && lurl !== "None") {
      let a = document.createElement("div");
      a.id = "exVideoDiv" + String(id);
      a.rid = rid;
      a.className = "exVideoDiv";
      let html = `<div class='exVideoInfo' id='exVideoInfo${id}'><span class='exVideoRID' id='exVideoRID${id}' style='color:white'>B站 - ${rid}</span>`;
      html += "<a><div class='exVideoClose' id='exVideoClose" + String(id) + "'>X</div></a></div>";
      html += "<video controls='controls' class='exVideoPlayer' id='exVideoPlayer" + String(id) + "'></video><div class='exVideoScale' id='exVideoScale" + String(id) + "'></div>";
      a.innerHTML = html;
      let b = getValidDom([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"]) || document.body;
      b.insertBefore(a, b.childNodes[0]);
      setElementDrag(id);
      setElementResize(id);
      setElementVideo(id, lurl);
      setElementFunc(id);
    } else {
      showMessage("房间未开播或其他错误", "error");
    }
  });
}

function createNewVideo_Huya(id, url, rid) {
  getRealLive_Huya(url, (lurl) => {
    if (lurl && lurl !== "None") {
      let a = document.createElement("div");
      a.id = "exVideoDiv" + String(id);
      a.rid = rid;
      a.className = "exVideoDiv";
      let html = `<div class='exVideoInfo' id='exVideoInfo${id}'><span class='exVideoRID' id='exVideoRID${id}' style='color:white'>虎牙 - ${rid}</span>`;
      html += "<a><div class='exVideoClose' id='exVideoClose" + String(id) + "'>X</div></a></div>";
      html += "<video controls='controls' class='exVideoPlayer' id='exVideoPlayer" + String(id) + "'></video><div class='exVideoScale' id='exVideoScale" + String(id) + "'></div>";
      a.innerHTML = html;
      let b = getValidDom([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"]) || document.body;
      b.insertBefore(a, b.childNodes[0]);
      setElementDrag(id);
      setElementResize(id);
      setElementVideo(id, lurl);
      setElementFunc(id);
    } else {
      showMessage("房间未开播或其他错误", "error");
    }
  });
}

function createNewVideo_Stream(id, lurl) {
  if (!lurl) return;
  let a = document.createElement("div");
  a.id = "exVideoDiv" + String(id);
  a.rid = rid;
  a.className = "exVideoDiv";
  let html = `<div class='exVideoInfo' id='exVideoInfo${id}'><span class='exVideoRID' id='exVideoRID${id}' style='color:white'>直播流${id}</span>`;
  html += `<input id='exVideoEmbed${String(id)}' type='button' value='嵌入视频' style='height:30px;'>`;
  html += `<input id='exVideoUnEmbed${String(id)}' type='button' value='恢复视频' style='height:30px;display:none;'>`;
  html += `<input id='exVideoCopy${String(id)}' type='button' value='复制直播流' style='height:30px;'>`;
  html += "<a><div class='exVideoClose' id='exVideoClose" + String(id) + "'>X</div></a></div>";
  html += "<video controls='controls' class='exVideoPlayer' id='exVideoPlayer" + String(id) + "'></video><div class='exVideoScale' id='exVideoScale" + String(id) + "'></div>";
  a.innerHTML = html;
  let b = getValidDom([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"]) || document.body;
  b.insertBefore(a, b.childNodes[0]);
  setElementDrag(id);
  setElementResize(id);
  setElementVideo(id, lurl);
  setElementFunc_Stream(id);
}

function setElementFunc(id) {
  let box = document.getElementById("exVideoDiv" + String(id));
  let exVideoClose = document.getElementById("exVideoClose" + String(id));
  if (!box || !exVideoClose) return;
  exVideoClose.onclick = function () {
    if (videoPlayerArr[id] && typeof videoPlayerArr[id].destroy === "function") {
      videoPlayerArr[id].destroy();
    }
    box.remove();
  };
  box.onclick = function (e) {
    e.stopPropagation();
    for (let i = 0; i < videoPlayerArr.length; i++) {
      let b = document.getElementById("exVideoDiv" + String(i));
      if (b) {
        b.style.zIndex = i === id ? 1016 : 1428;
      }
    }
  };
}

function setElementFunc_Stream(id) {
  let box = document.getElementById("exVideoDiv" + String(id));
  let exVideoPlayer = document.getElementById("exVideoPlayer" + String(id));
  let exVideoClose = document.getElementById("exVideoClose" + String(id));
  let exVideoCopy = document.getElementById("exVideoCopy" + String(id));
  let exVideoEmbed = document.getElementById("exVideoEmbed" + String(id));
  let exVideoUnEmbed = document.getElementById("exVideoUnEmbed" + String(id));
  let originVideo = document.querySelector("#__h5player video");

  if (!box || !exVideoClose) return;

  exVideoClose.onclick = function () {
    if (videoPlayerArr[id] && typeof videoPlayerArr[id].destroy === "function") {
      videoPlayerArr[id].destroy();
    }
    box.remove();
  };

  if (exVideoCopy) {
    exVideoCopy.onclick = function () {
      let lurl = videoPlayerArr[id]?.options_?.url;
      if (lurl) {
        GM_setClipboard(lurl);
        showMessage("复制成功", "success");
      }
    };
  }

  if (exVideoEmbed && exVideoUnEmbed && originVideo) {
    exVideoEmbed.onclick = function () {
      originVideo.style.display = "none";
      exVideoEmbed.style.display = "none";
      exVideoUnEmbed.style.display = "inline";
      box.style.height = "0px";
      originVideo.parentElement.insertBefore(exVideoPlayer, originVideo);
    };

    exVideoUnEmbed.onclick = function () {
      originVideo.style.display = "block";
      exVideoUnEmbed.style.display = "none";
      exVideoEmbed.style.display = "inline";
      box.style.height = "250px";
      box.insertBefore(exVideoPlayer, box.childNodes[box.childNodes.length - 1]);
    };
  }
}

function createNewVideo_iframe(id, url) {
  if (String(url).indexOf("douyu.com") === -1) {
    showMessage("有弹幕模式仅支持斗鱼直播", "error");
    return;
  }
  let rid_arr = String(url).split("/");
  let targetRid = rid_arr[rid_arr.length - 1];
  let a = document.createElement("div");
  a.id = "exVideoDiv" + String(id);
  a.rid = targetRid;
  a.className = "exVideoDiv";
  let html = `<div class='exVideoInfo' id='exVideoInfo${id}'><span class='exVideoRID' id='exVideoRID${id}' style='color:white'>斗鱼 - ${targetRid}</span>`;
  html += "<a><div class='exVideoClose' id='exVideoClose" + String(id) + "'>X</div></a></div>";
  html += "<iframe class='exVideoPlayer' id='exVideoPlayer" + String(id) + "' src='" + url + "?exid=chun'></iframe>";
  html += "<div class='exVideoScale' id='exVideoScale" + String(id) + "'></div>";
  a.innerHTML = html;
  let b = getValidDom([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"]) || document.body;
  b.insertBefore(a, b.childNodes[0]);
  setElementDrag(id);
  setElementResize(id);
  if (id > videoPlayerArr.length - 1) {
    videoPlayerArr.push("iframe");
  } else {
    videoPlayerArr[id] = "iframe";
  }
  setElementFunc_iframe(id);
}

function setElementFunc_iframe(id) {
  let box = document.getElementById("exVideoDiv" + String(id));
  let exVideoClose = document.getElementById("exVideoClose" + String(id));
  if (!box || !exVideoClose) return;
  exVideoClose.onclick = function () {
    box.remove();
  };
}
