function* (__imports) {
yield {"openEnhancedPip": { get: () => openEnhancedPip, set: value => { openEnhancedPip = value; } },
"pendingPipOwner": { get: () => pendingPipOwner, set: value => { pendingPipOwner = value; } }};
let pendingPipOwner = null;
function openEnhancedPip() {
  if (document.getElementById("__video2"))
    if (window.documentPictureInPicture) {
      (0, __imports.closeEnhancedPip)();
      const owner = pendingPipOwner = (0, __imports.createRoomLifetime)();
      owner.own(() => { if (pendingPipOwner === owner) pendingPipOwner = null; });
      if (__imports.activeRoomMount) __imports.activeRoomMount.own(() => owner.dispose());
      owner.listen(window, 'pagehide', () => owner.dispose());
      (0, __imports.restorePipPreferences)();
      return (async () => {
        let o = document.getElementById("__video2"),
          r = await window.documentPictureInPicture.requestWindow({
            width: 670,
            height: 380,
            disallowReturnToOpener: !0,
            preferInitialWindowPlacement: !0,
          });
        if (owner.disposed || pendingPipOwner !== owner || r.closed) {
          if (r !== window.__pip_window__ && !r.closed) r.close();
          owner.dispose();
          return;
        }
        (0, __imports.resetPipPacketState)();
        (0, __imports.resetPipMergeState)();
        window.__pip_track_state__ = [];
        window.__pip_window__ = r;
        r.__nextPipLifetime = owner;
        owner.own(() => (0, __imports.closeEnhancedPip)(r, r.document.getElementById('pip-video')));
        owner.listen(r, 'pagehide', () => owner.dispose());
        let n =
            ((r.document.body.innerHTML = (0, __imports.renderPipMarkup0)(__imports.$i, __imports.Pi, __imports.zi)),
            ((window.__pip_window__ = r).__pip_source_video__ = o),
            r.document.getElementById("pip-video")),
          t = r.document.getElementById("danmaku"),
          e = r.document.getElementById("main-view"),
          i = r.document.getElementById("input-panel"),
          a = r.document.getElementById("pip-set"),
          l = r.document.getElementById("pip-send"),
          s = r.document.getElementById("pip-danmaku-toggle"),
          d = r.document.getElementById("pip-reload"),
          c = r.document.getElementById("pip-back-opener"),
          p = r.document.getElementById("pip-toast");
        window.__pip_is_active__ = true;
        (0, __imports.ea)(r);
        n.srcObject = o.captureStream();
        await n.play().catch(() => {});
        if (owner.disposed || r.closed || window.__pip_window__ !== r) return;
        var m = r,
          u = m.document,
          g = u.getElementById("pip-input-field"),
          h = u.getElementById("pip-submit-btn"),
          f =
            (g && g.setAttribute("placeholder", "发条弹幕吧..."),
            h && (h.textContent = "发送"),
            (g = u.getElementById("pip-reload")) &&
              (g.title = "刷新画面（恢复卡屏）"),
            (h = u.getElementById("pip-back-opener")) &&
              ((h.textContent = "回到网页"),
              (h.title = "退出画中画并返回直播页")),
            (0, __imports.ta)(m),
            (0, __imports.La)(!1),
            (0, __imports.Na)(!0),
            !0 === __imports.pipPreferences.lowPowerMode && (0, __imports.La)(!0),
            s &&
              owner.listen(s, "click", (e) => {
                (e.stopPropagation(),
                  (__imports.pipPreferences.danmakuVisible = !1 === __imports.pipPreferences.danmakuVisible),
                  (0, __imports.persistPipPreferences)(),
                  (0, __imports.ea)(r),
                  (0, __imports.ta)(r));
              }),
            d &&
              owner.listen(d, "click", async (e) => {
                e.stopPropagation();
                e = await (0, __imports.recapturePipStream)(r, n);
                if (owner.disposed) return;
                ((p.innerText = e ? "画面已刷新" : "刷新失败，请检查主页视频"),
                  p.classList.add("show"),
                  (0, __imports.clearTimeout)(p._timer),
                  (p._timer = owner.timeout(
                    () => p.classList.remove("show"),
                    2e3,
                  )));
              }),
            c &&
              owner.listen(c, "click", (e) => {
                (e.stopPropagation(), (0, __imports.returnToPipSource)(r));
              }),
            owner.listen(a, "click", (u) => {
              (u.stopPropagation(), (0, __imports.returnToPipSource)(r, !1));
              {
                let d = document.getElementById("pip-setting-panel"),
                  c = {
                    fontSize: 18,
                    speed: 2.5,
                    area: "full",
                    trackHeight: 28,
                    mergeMode: "combo",
                    lowPowerMode: !1,
                    filterRobotDanmaku: !0,
                    opacity: 1,
                    danmakuVisible: !0,
                  },
                  p = () => {
                    (0, __imports.persistPipPreferences)();
                  },
                  m = () => {
                    ((document.getElementById("pip-area").value = __imports.pipPreferences.area),
                      (document.getElementById("pip-mergemode").value =
                        __imports.pipPreferences.mergeMode || "combo"),
                      (document.getElementById("pip-lowpowermode").value =
                        !0 === __imports.pipPreferences.lowPowerMode ? "on" : "off"),
                      (document.getElementById("pip-filterrobot").value =
                        !1 !== __imports.pipPreferences.filterRobotDanmaku ? "on" : "off"),
                      (document.getElementById("pip-tabswitch").value = (0, __imports.It)()
                        ? "on"
                        : "off"),
                      (document.getElementById("pip-fontsize").value =
                        __imports.pipPreferences.fontSize),
                      (document.getElementById("pip-fontsize-value").innerText =
                        __imports.pipPreferences.fontSize),
                      (document.getElementById("pip-trackheight").value =
                        __imports.pipPreferences.trackHeight || 28),
                      (document.getElementById(
                        "pip-trackheight-value",
                      ).innerText = __imports.pipPreferences.trackHeight || 28),
                      (document.getElementById("pip-speed").value = __imports.pipPreferences.speed),
                      (document.getElementById("pip-speed-value").innerText =
                        __imports.pipPreferences.speed));
                    var e = Math.round(
                      100 * (null != __imports.pipPreferences.opacity ? __imports.pipPreferences.opacity : 1),
                    );
                    ((document.getElementById("pip-opacity").value = e),
                      (document.getElementById("pip-opacity-value").innerText =
                        e + "%"));
                  };
                if (d) ((d.style.display = "block"), m());
                else {
                  (((d = document.createElement("div")).id =
                    "pip-setting-panel"),
                    (d.innerHTML = (0, __imports.renderPipMarkup1)(__imports.pipPreferences.fontSize, __imports.pipPreferences.fontSize, __imports.pipPreferences.trackHeight || 28, __imports.pipPreferences.trackHeight || 28, __imports.pipPreferences.speed, __imports.pipPreferences.speed, Math.round(100 * (null != __imports.pipPreferences.opacity ? __imports.pipPreferences.opacity : 1)), Math.round(100 * (null != __imports.pipPreferences.opacity ? __imports.pipPreferences.opacity : 1)))),
                    document.getElementById("pip-setting-style") ||
                      (((g = document.createElement("style")).id =
                        "pip-setting-style"),
                      (g.innerHTML = __imports.pipMarkup0),
                      document.head.appendChild(g)),
                    document.body.appendChild(d));
                  owner.own(() => d.remove());
                  var g = Math.max(8, (window.innerWidth - d.offsetWidth) / 2),
                    u = Math.max(8, (window.innerHeight - d.offsetHeight) / 2);
                  ((d.style.left = g + "px"),
                    (d.style.top = u + "px"),
                    ((d) => {
                      var e = d.querySelector(".pip-setting-header");
                      if (e) {
                        let o = !1,
                          n = 0,
                          i = 0,
                          a = 0,
                          r = 0,
                          l = (e) => {
                            var t;
                            o &&
                              ((t = e.clientX - n),
                              (e = e.clientY - i),
                              (d.style.left = Math.max(0, a + t) + "px"),
                              (d.style.top = Math.max(0, r + e) + "px"));
                          },
                          s = () => {
                            ((o = !1),
                              document.removeEventListener("mousemove", l),
                              document.removeEventListener("mouseup", s));
                          };
                        owner.listen(e, "mousedown", (e) => {
                          var t;
                          0 !== e.button ||
                            e.target.closest(
                              ".pip-setting-dismiss, .pip-setting-reset",
                            ) ||
                            ((o = !0),
                            (t = d.getBoundingClientRect()),
                            (d.style.left = t.left + "px"),
                            (d.style.top = t.top + "px"),
                            (n = e.clientX),
                            (i = e.clientY),
                            (a = t.left),
                            (r = t.top),
                            owner.listen(document, "mousemove", l),
                            owner.listen(document, "mouseup", s),
                            e.preventDefault());
                        });
                      }
                    })(d));
                  let e = document.getElementById("pip-fontsize"),
                    t = document.getElementById("pip-trackheight"),
                    o = document.getElementById("pip-speed"),
                    n = document.getElementById("pip-area"),
                    i = document.getElementById("pip-mergemode"),
                    a = document.getElementById("pip-lowpowermode"),
                    r = document.getElementById("pip-filterrobot"),
                    l = document.getElementById("pip-tabswitch"),
                    s = document.getElementById("pip-opacity");
                  ((n.value = __imports.pipPreferences.area),
                    (i.value = __imports.pipPreferences.mergeMode || "combo"),
                    (a.value = !0 === __imports.pipPreferences.lowPowerMode ? "on" : "off"),
                    (r.value = !1 !== __imports.pipPreferences.filterRobotDanmaku ? "on" : "off"),
                    (l.value = (0, __imports.It)() ? "on" : "off"),
                    owner.listen(e, "input", () => {
                      ((__imports.pipPreferences.fontSize = parseInt(e.value)),
                        (document.getElementById(
                          "pip-fontsize-value",
                        ).innerText = __imports.pipPreferences.fontSize),
                        p());
                    }),
                    owner.listen(t, "input", () => {
                      ((__imports.pipPreferences.trackHeight = parseInt(t.value)),
                        (document.getElementById(
                          "pip-trackheight-value",
                        ).innerText = __imports.pipPreferences.trackHeight),
                        p());
                    }),
                    owner.listen(o, "input", () => {
                      ((__imports.pipPreferences.speed = parseFloat(o.value)),
                        (document.getElementById("pip-speed-value").innerText =
                          __imports.pipPreferences.speed),
                        p());
                    }),
                    owner.listen(s, "input", () => {
                      ((__imports.pipPreferences.opacity = parseInt(s.value, 10) / 100),
                        (document.getElementById(
                          "pip-opacity-value",
                        ).innerText = s.value + "%"),
                        p(),
                        window.__pip_is_active__ && (0, __imports.ea)());
                    }),
                    owner.listen(n, "change", () => {
                      ((__imports.pipPreferences.area = n.value), p());
                    }),
                    owner.listen(i, "change", () => {
                      ((__imports.pipPreferences.mergeMode = i.value), p());
                    }),
                    owner.listen(r, "change", () => {
                      ((__imports.pipPreferences.filterRobotDanmaku = "on" === r.value), p());
                    }),
                    owner.listen(a, "change", () => {
                      ((__imports.pipPreferences.lowPowerMode = "on" === a.value),
                        p(),
                        window.__pip_is_active__ && (0, __imports.La)(__imports.pipPreferences.lowPowerMode));
                    }),
                    owner.listen(l, "change", () => {
                      var e,
                        t,
                        o,
                        n = "on" === l.value;
                      ((0, __imports.Tt)(n),
                        n
                          ? (0, __imports.Ct)()
                          : (0, __imports.T)("已关闭页签防冻结，请刷新页面后完全生效", "info"),
                        window.__pip_is_active__ &&
                          ((t = (e =
                            window.__pip_window__)?.document.getElementById(
                            "pip-video",
                          )),
                          (o = e?.__pip_source_video__),
                          n ? (0, __imports.syncPipPlayback)(o, e, t) : (0, __imports.sa)()));
                    }),
                    owner.listen(d
                      .querySelector(".pip-setting-reset"), "click", () => {
                        confirm("确定要将画中画设置恢复为默认配置吗？") &&
                          (Object.assign(__imports.pipPreferences, c),
                          p(),
                          m(),
                          window.__pip_is_active__) &&
                          ((0, __imports.La)(__imports.pipPreferences.lowPowerMode), (0, __imports.ea)(), (0, __imports.ta)());
                      }),
                    owner.listen(d
                      .querySelector(".pip-setting-dismiss"), "click", () => {
                        d.style.display = "none";
                      }));
                }
              }
              ((p.innerText = "已在斗鱼直播页面打开设置面板"),
                p.classList.add("show"),
                (0, __imports.clearTimeout)(p._timer),
                (p._timer = owner.timeout(() => p.classList.remove("show"), 5e3)));
            }),
            owner.listen(l, "click", (e) => {
              (e.stopPropagation(),
                i.classList.contains("active")
                  ? i.classList.remove("active")
                  : (0, __imports.da)(r));
            }),
            (e) => {
              var t;
              "Enter" === e.key &&
                ((t = r.document.getElementById("pip-input-field")),
                r.document.activeElement !== t) &&
                (e.preventDefault(), (0, __imports.da)(r));
            });
        (owner.listen(r.document, "keydown", f),
          (r.__pip_keydown_handler__ = f),
          owner.listen(e, "click", () => {
            i.classList.contains("active") && i.classList.remove("active");
          }));
        {
          var y = r,
            b = t;
          let o = y.document.getElementById("pip-input-field"),
            e = y.document.getElementById("pip-submit-btn"),
            n = y.document.getElementById("input-panel");
          async function v() {
            var t = o.value.trim();
            if (t) {
              ((o.value = ""), n.classList.remove("active"));
              let e = y.document.getElementById("pip-toast");
              ((e.innerText = "发送成功"),
                e.classList.add("show"),
                (0, __imports.clearTimeout)(e._timer),
                (e._timer = owner.timeout(() => e.classList.remove("show"), 2e3)),
                (0, __imports.renderPipDanmaku)({ text: t, color: 0 }, y, b, !0));
              try {
                (async (e) => {
                  let t = document.querySelector("div.ChatSend-txt"),
                    o = document.querySelector(".ChatSend-button");
                  ((t.innerText = e), o.click());
                })(t);
              } catch (e) {
                console.error("弹幕发送接口调用失败:", e);
              }
            }
          }
          (owner.listen(o, "keydown", (e) => {
            "Enter" === e.key && v();
          }),
            owner.listen(e, "click", () => {
              v();
            }));
        }
        var x = o,
          w = n;
        function _() {
          x.paused ? w.pause() : w.play().catch(() => {});
        }
        (owner.listen(x, "play", _),
          owner.listen(x, "pause", _),
          (0, __imports.syncPipPlayback)(o, r, n),
          __imports.ja && (0, __imports.clearInterval)(__imports.ja),
          (__imports.ja = owner.interval(() => {
            let t = Date.now();
            for (var [e, o] of __imports.pipMergeGroups.entries())
              o.timestamps.filter((e) => t - e <= 8e3).length < 2 &&
                __imports.pipMergeGroups.delete(e);
            (0, __imports.refreshPipCombos)();
          }, 1e3)),
          (__imports.Oi = new __imports.nl(__imports.B, owner.guard((packet) => (0, __imports.dispatchPipPacket)(packet, r, t)))));
        const packetClient = __imports.Oi;
        owner.own(() => {
          packetClient.close();
          if (__imports.Oi === packetClient) __imports.Oi = null;
        });
        {
          o;
          var k = r,
            E = n;
          window.__pip_is_active__ = !0;
          let e = () => owner.dispose(),
            t =
              (owner.listen(k, "pagehide", e),
              owner.interval(() => {
                k.closed && ((0, __imports.clearInterval)(t), e());
              }, 2e3));
        }
      })().catch(error => {
        const report = !owner.disposed;
        owner.dispose();
        if (report) {
          console.warn('NEXT PiP open failed', error);
          (0, __imports.T)("【画中画增强】无法打开画中画窗口", "error");
        }
      });
    } else
      (0, __imports.T)(
        "【画中画增强】当前浏览器不支持画中画增强功能，建议使用 Chrome 116+ 或 Edge 116+",
        "error",
      );
  else (0, __imports.T)("【画中画增强】当前直播间不支持画中画增强功能", "error");
}

}
