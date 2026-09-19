function* (__imports) {
yield {"EXURL": { get: () => EXURL, set: value => { EXURL = value; } },
"ExLoadLib": { get: () => ExLoadLib, set: value => { ExLoadLib = value; } },
"P": { get: () => P, set: value => { P = value; } },
"installRoomHooks": { get: () => installRoomHooks, set: value => { installRoomHooks = value; } }};
var P =
  typeof __imports.GM_info !== "undefined" && __imports.GM_info.script && __imports.GM_info.script.version
    ? __imports.GM_info.script.version
    : "2026.09.18.01";
/* ==================== DouyuEx 主程序 ==================== */

var EXURL = {
    flv: "https://fastly.jsdelivr.net/npm/flv.js@1.6.2/dist/flv.min.js",
    svga: "https://fastly.jsdelivr.net/npm/svgaplayerweb@2.3.1/build/svga.min.js",
    gif: "https://fastly.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js",
    three:
      "https://fastly.jsdelivr.net/npm/three@0.80.0/build/three.min.js",
    xl: "https://fastly.jsdelivr.net/npm/xlsx@0.16.4/dist/xlsx.full.min.js",
    purify:
      "https://fastly.jsdelivr.net/npm/dompurify@2.3.6/dist/purify.min.js",
  },
  EXLIB = {};
function ExLoadLib(t, o, n) {
  EXLIB[t] ||
    ((EXLIB[t] = 1),
    (0, __imports.GM_xmlhttpRequest)({
      method: "GET",
      url: t,
      onload: (e) => {
        try {
          ((0, eval)(e.response), "function" == typeof o && o());
        } catch (e) {
          ((EXLIB[t] = 0),
            console.error("[DouyuEx]组件加载失败:", t, e),
            "function" == typeof n && n(e));
        }
      },
      onerror: (e) => {
        ((EXLIB[t] = 0), "function" == typeof n && n(e));
      },
    }));
}
function installRoomHooks() {
  ((0, __imports.Kr)({
    url: "/firstqueue",
    callback: (e) => {
      let t = e;
      return (t = t.replace(
        "e.display=new e.renderer(e);",
        "e.display=new e.renderer(e);e.display.raw.comment=e;",
      ));
    },
  }),
    (0, __imports.Kr)({ inline: !0, callback: __imports.Un }));
  {
    let t = Node.prototype.appendChild,
      o = Node.prototype.insertBefore;
    ((Node.prototype.appendChild = function (e) {
      if ("SCRIPT" === e.tagName) {
        if (e.src && (0, __imports.Xr)(e, t, this)) return e;
        e = (0, __imports.Zr)(e);
      }
      return t.call(this, e);
    }),
      (Node.prototype.insertBefore = function (e, t) {
        if ("SCRIPT" === e.tagName) {
          if (e.src && (0, __imports.Xr)(e, o, this)) return e;
          e = (0, __imports.Zr)(e);
        }
        return o.call(this, e, t);
      }));
  }
  var e;
  null != (o = __imports.localStorage.getItem("ExSave_Mode")) &&
    ("mode" in (o = JSON.parse(o)) == 0 && (o.mode = 0), 1 == o.mode) &&
    (0, __imports.Ko)();
  {
    let t = __imports.unsafeWindow.XMLHttpRequest.prototype.send,
      i =
        ((__imports.unsafeWindow.XMLHttpRequest.prototype.send = function (e) {
          (__imports.Yr.set(this, e), t.call(this, e));
        }),
        Object.getOwnPropertyDescriptor(
          __imports.unsafeWindow.XMLHttpRequest.prototype,
          "responseText",
        ));
    Object.defineProperty(
      __imports.unsafeWindow.XMLHttpRequest.prototype,
      "responseText",
      {
        get: function () {
          let e = i.get.call(this);
          var t,
            o = __imports.Yr.get(this);
          for (t of __imports.Wr) {
            var n = t(this.responseURL, e, o);
            void 0 !== n && (e = n);
          }
          return (__imports.Yr.delete(this), e);
        },
        configurable: !0,
      },
    );
  }
  {
    class GracefulP2PBlocker {
      constructor() {
        this.connectionState = "failed";
        this.iceConnectionState = "failed";
        this.signalingState = "closed";
        this.iceGatheringState = "complete";
        this.localDescription = null;
        this.remoteDescription = null;
        this.onicecandidate = null;
        this.ontrack = null;
        this.ondatachannel = null;
      }
      createDataChannel() {
        return {
          send: function () {},
          close: function () {},
          addEventListener: function () {},
          removeEventListener: function () {},
          readyState: "closed",
        };
      }
      createOffer() {
        return Promise.reject(
          new DOMException(
            "WebRTC P2P disabled by user policy",
            "NotSupportedError",
          ),
        );
      }
      createAnswer() {
        return Promise.reject(
          new DOMException(
            "WebRTC P2P disabled by user policy",
            "NotSupportedError",
          ),
        );
      }
      setLocalDescription() {
        return Promise.resolve();
      }
      setRemoteDescription() {
        return Promise.resolve();
      }
      addIceCandidate() {
        return Promise.resolve();
      }
      addEventListener() {}
      removeEventListener() {}
      dispatchEvent() {
        return !1;
      }
      close() {}
      getStats() {
        return Promise.resolve(new Map());
      }
    }
    var t = GracefulP2PBlocker;
    ((0, __imports.Qr)((e, t) => (-1 !== e.indexOf("/betard") ? (0, __imports.Un)(t) : t)),
      null != (o = __imports.localStorage.getItem("ExSave_P2P")) &&
        JSON.parse(o).isKillP2P &&
        [
          "RTCPeerConnection",
          "webkitRTCPeerConnection",
          "mozRTCPeerConnection",
          "msRTCPeerConnection",
        ].forEach((e) => {
          void 0 === __imports.unsafeWindow.RTCPeerConnection &&
            (__imports.unsafeWindow.RTCPeerConnection = __imports.unsafeWindow[e]);
          try {
            __imports.unsafeWindow[e] = t;
          } catch (err) {}
          try {
            window[e] = t;
          } catch (err) {}
        }));
  }
  if (
    null != (o = __imports.localStorage.getItem("ExSave_FullScreen")) &&
    JSON.parse(o).isFullScreen
  ) {
    let e = 0,
      t = (0, __imports.setInterval)(() => {
        if (
          (100 < ++e && (0, __imports.clearInterval)(t), (0, __imports.E)([".wfs-2a8e83", ".icon-c8be96"]))
        ) {
          (0, __imports.clearInterval)(t);
          let e = document.querySelector("div.wfs-2a8e83");
          e
            ? e.click()
            : 2 <= (e = document.querySelectorAll(".icon-c8be96")).length &&
              e[e.length - 2].click();
        }
      }, 1e3);
  }
  /* [DouyuEx] 旧版延迟DOM模拟点击已被彻底物理移除，杜绝二次断播卡顿 */ var o =
    "rateRecordTime_h5p_room";
  try {
    var n = __imports.localStorage.getItem(o);
    let e = n ? JSON.parse(n) : {};
    "v" !== (e = "object" == typeof e && null !== e ? e : {}).v &&
      ((e.v = "v"), __imports.localStorage.setItem(o, JSON.stringify(e)));
  } catch (e) {}
  ((0, __imports.bn)(),
    console.log(
      `%c

   ______                    _____)

  (, /    )                /

    /    / ___             )__   __/

  _/___ /_(_)(_(_(_/_(_(_/        /(__

(_/___ /        .-/     (_____)  /

               (_/



%cDouyuEx-RL ver ` +
        P +
        ` by xayahcore`,
      "color:rgb(255,121,35);font-size:20px;font-weight:bold;",
      "color:#3688FF;font-size:15px;font-weight:bold;",
    ),
    (0, __imports.GM_registerMenuCommand)("检查更新", () => {
      (0, __imports.T)(`【版本更新】当前版本：${P}，正在打开更新发布页...`, "info");
      (0, __imports._)("https://greasyfork.org/zh-CN/scripts/595575", !0);
    }),
    (0, __imports.GM_registerMenuCommand)("重置所有设置", () => {
      (async () => {
        if (
          confirm(
            "确定要清空 DouyuEx 的所有本地设置吗？\n\n包括：油猴存储(GM)与本站 localStorage 中的插件数据。\n此操作不可恢复。",
          )
        ) {
          await (async () => {
            if ("function" == typeof __imports.GM_deleteValue) {
              let t = [];
              try {
                var e;
                "function" == typeof __imports.GM_listValues
                  ? ((e = (0, __imports.GM_listValues)()),
                    (t = e && "function" == typeof e.then ? await e : e || []))
                  : "undefined" != typeof GM &&
                    GM.listValues &&
                    (t = await GM.listValues());
              } catch (e) {
                return;
              }
              Array.isArray(t) || (t = []);
              for (let e = 0; e < t.length; e++)
                try {
                  (0, __imports.GM_deleteValue)(t[e]);
                } catch (e) {}
            }
          })();
          try {
            var t = [];
            for (let e = 0; e < __imports.localStorage.length; e++) {
              var o = __imports.localStorage.key(e);
              o &&
                ((e) =>
                  e.startsWith("ExSave_") ||
                  e.startsWith("Ex_") ||
                  "Ex_isJoysound" === e ||
                  "freetimed" === e)(o) &&
                t.push(o);
            }
            t.forEach((e) => __imports.localStorage.removeItem(e));
          } catch (e) {}
          alert("已清空。请刷新斗鱼页面以使界面与功能恢复默认状态。");
        }
      })();
    }));
  {
    let e = (0, __imports.setInterval)(() => {
      (0, __imports.E)([".Header-follow-content", "#js-backpack-enter"]) &&
        ((__imports.Wt = new __imports.DomMutationSubscription(".Header-follow-content", !1, __imports.Yt)), (0, __imports.clearInterval)(e));
    }, 1e3);
  }
}

}
