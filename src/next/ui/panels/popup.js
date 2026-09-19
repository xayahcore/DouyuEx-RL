function* (__imports) {
yield {"createPopupPlayerPanel": { get: () => createPopupPlayerPanel, set: value => { createPopupPlayerPanel = value; } },
"executePopupPlayer": { get: () => executePopupPlayer, set: value => { executePopupPlayer = value; } }};
function executePopupPlayer(url, isNoIframe) {
  var t = url ? url.trim() : "";
  if (!t) {
    (0, __imports.T)("请输入直播间或直播流地址", "error");
    return;
  }
  if (typeof __imports.ExLoadLib === "function" && typeof __imports.EXURL !== "undefined") {
    (0, __imports.ExLoadLib)(__imports.EXURL.flv);
  }
  var a;
  let isStream =
    150 < t.length &&
    (t.startsWith("http://") ||
      t.startsWith("https://") ||
      t.includes(".flv") ||
      t.includes(".m3u8"));
  if (isStream) {
    (0, __imports.rn)(__imports.D.length, t);
  } else if (isNoIframe) {
    if (-1 != t.indexOf("douyu.com")) {
      a = (e) => {
        (0, __imports.en)(__imports.D.length, e, "Douyu");
      };
      (0, __imports.fetch)(t, {
        method: "GET",
        mode: "no-cors",
        cache: "default",
        credentials: "include",
      })
        .then((e) => e.text())
        .then((e) => {
          var doc = new DOMParser().parseFromString(e, "text/html");
          var html = doc.getElementsByTagName("html")[0].innerHTML;
          var o = "$ROOM.room_id =".length,
            n = html.indexOf("$ROOM.room_id =");
          let rid = "";
          0 < n
            ? (rid = (rid = html.substring(
                n + o,
                html.indexOf(";", n + o),
              )).trim())
            : (rid = (0, __imports.v)(html, "roomID:", ","))
              ? (rid = rid.trim())
              : (n = doc.querySelector('link[rel="canonical"]')) &&
                ((o = n.getAttribute("href")),
                (rid = o.split("/").pop().trim()));
          /^[0-9]+$/.test(rid)
            ? a(rid)
            : (0, __imports.T)("获取直播间失败，请检查直播间地址是否正确！", "error");
        })
        .catch((e) => {
          console.log("请求失败!", e);
        });
    } else if (-1 != t.indexOf("bilibili.com")) {
      var r = t,
        l = (e) => {
          (0, __imports.en)(__imports.D.length, e, "Bilibili");
        };
      r = (r = r.split("/"))[r.length - 1];
      (0, __imports.GM_xmlhttpRequest)({
        method: "GET",
        url: "https://api.live.bilibili.com/room/v1/Room/room_init?id=" + r,
        responseType: "json",
        onload: function (e) {
          e = e.response;
          l(e.data.room_id);
        },
      });
    } else if (-1 != t.indexOf("huya.com")) {
      (0, __imports.en)(__imports.D.length, t, "Huya");
    } else {
      (0, __imports.rn)(__imports.D.length, t);
    }
  } else {
    var r = __imports.D.length;
    if (-1 == String(t).indexOf("douyu.com")) {
      (0, __imports.T)("有弹幕模式仅支持斗鱼直播", "error");
    } else {
      var i = String(t).split("/"),
        rid = i[i.length - 1];
      var o = document.createElement("div"),
        n = "";
      o.id = "exVideoDiv" + String(r);
      o.rid = rid;
      o.className = "exVideoDiv";
      n =
        (n =
          (n =
            (n +=
              "<div class='exVideoInfo' id='exVideoInfo" +
              String(r) +
              "'><span class='exVideoRID' id='exVideoRID" +
              String(r) +
              "' style='color:white'>斗鱼 - " +
              rid +
              "</span>") +
            "<a><div class='exVideoClose' id='exVideoClose" +
            String(r) +
            "'>X</div></a></div>") +
          "<iframe class='exVideoPlayer' id='exVideoPlayer" +
          String(r) +
          "' src=" +
          t +
          "?exid=chun></iframe>") +
        "<div class='exVideoScale' id='exVideoScale" +
        String(r) +
        "'></div>";
      o.innerHTML = n;
      var target = (0, __imports.E)([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"]);
      if (target) target.insertBefore(o, target.childNodes[0]);
      (0, __imports.on)(r);
      (0, __imports.tn)(r);
      r > __imports.D.length - 1 ? __imports.D.push("iframe") : (__imports.D[r] = "iframe");
      let curDiv = document.getElementById("exVideoDiv" + String(r));
      let curClose = document.getElementById("exVideoClose" + String(r));
      if (curClose) {
        curClose.onclick = function () {
          __imports.D[r].destroy();
          curDiv.remove();
        };
      }
      if (curDiv) {
        curDiv.onclick = function (e) {
          e.stopPropagation();
          e.preventDefault();
          for (let idx = 0; idx < __imports.D.length; idx++) {
            var item = document.getElementById("exVideoDiv" + String(idx));
            if (item) {
              idx == r
                ? (item.style.zIndex = 1016)
                : (item.style.zIndex = 1428);
            }
          }
        };
      }
    }
  }
}

function createPopupPlayerPanel() {
  if (document.querySelector(".popup-player-panel")) return;
  var p = document.createElement("div");
  p.className = "popup-player-panel miuix-modal";
  p.innerHTML = `
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
  var container =
    document.getElementsByClassName("layout-Player-chat")[0] || document.body;
  if (container) container.insertBefore(p, container.childNodes[0]);
  (0, __imports.ensureMiuixPanelHeader)(p, "同屏播放器");

  (0, __imports.safeBind)("#popup-panel-paste", "click", async function (e) {
    e.stopPropagation();
    try {
      var text = await navigator.clipboard.readText();
      if (text) {
        var inp = document.getElementById("popup-panel-url");
        if (inp) inp.value = text.trim();
        (0, __imports.T)("已从剪贴板粘贴直播流地址", "success");
      }
    } catch (err) {
      (0, __imports.T)("请允许读取剪贴板权限或手动粘贴", "info");
    }
  });

  (0, __imports.safeBind)("#popup-panel-start-btn", "click", function (e) {
    e.stopPropagation();
    var urlInp = document.getElementById("popup-panel-url");
    var val = urlInp ? urlInp.value.trim() : "";
    var isNoIframe =
      document.querySelector(
        'input[name="popup_player_mode"][value="noiframe"]',
      )?.checked ?? true;
    __imports.nextFeatures.invoke('popup-player', 'execute', val, isNoIframe);
    p.style.setProperty("display", "none", "important");
    (0, __imports.updateDockActiveIndicator)();
  });
}

}
