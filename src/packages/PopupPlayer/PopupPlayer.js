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
        <div class="popup-panel__seg-switch">
          <label class="popup-panel__seg-item">
            <input type="radio" name="popup_player_mode" value="noiframe" checked />
            <span class="popup-panel__seg-thumb">无弹幕极速流 (推荐)</span>
          </label>
          <label class="popup-panel__seg-item">
            <input type="radio" name="popup_player_mode" value="iframe" />
            <span class="popup-panel__seg-thumb">全功能有弹幕</span>
          </label>
        </div>
      </div>

      <div class="popup-panel__action-wrap">
        <button type="button" class="ex-btn-primary popup-panel__submit-btn" id="popup-panel-start-btn">
          载入同屏流
        </button>
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
