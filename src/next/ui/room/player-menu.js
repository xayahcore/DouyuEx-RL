function* (__imports) {
yield {"mountPlayerMenu": { get: () => mountPlayerMenu, set: value => { mountPlayerMenu = value; } }};
// Room assembly section; dependencies are captured per mount, in original order.
function mountPlayerMenu(owner) {
    let d = owner.interval(() => {
      if ((0, __imports.E)([".right-e7ea5d", ".right-17e251"])) {
        (0, __imports.clearInterval)(d);
        {
          let e = document.createElement("li"),
            t =
              ((e.id = "refresh-video"),
              (e.innerText = "隐藏礼物栏"),
              document.getElementsByClassName("menu-da2a9e")[0]);
          (t.insertBefore(e, t.childNodes[t.childNodes.length - 1]),
            !document.getElementById("refresh-video3") &&
              (((e = document.createElement("div")).id = "refresh-video3"),
              (e.title = "点击隐藏礼物栏"),
              (e.innerHTML = `<div style="display:flex;align-items:center;gap:6px;">

            <div style="font-size:12px;">隐藏礼物栏</div>

            <div id="ex-refresh-switch" style="width:26px;height:14px;background:rgba(255,255,255,0.3);border-radius:7px;position:relative;transition:background 0.3s;">

                <div id="ex-refresh-switch-circle" style="width:10px;height:10px;background:#fff;border-radius:50%;position:absolute;top:2px;left:2px;transition:left 0.3s, background 0.3s;"></div>

            </div>

        </div>`),
              (e.style =
                "position:absolute;left:18px;bottom:58px;padding:0 10px;height:28px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);color:#fff;z-index:9999;cursor:pointer;user-select:none;opacity:0;transform:scale(.9);transition:opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .3s ease;pointer-events:none;"),
              (t = document.getElementById("js-player-dialog"))) &&
              t.insertBefore(e, t.childNodes[0]));
        }
        {
          function a() {
            let e = !1;
            var t = !!(
              document.fullscreenElement ||
              document.webkitFullscreenElement ||
              document.mozFullScreenElement ||
              document.msFullscreenElement
            );
            let o = !1;
            ((document.querySelector(".wfs-2a8e83.removed-9d4c42") ||
              document.querySelector(".toggle__P8TKM")) &&
              (e = !0),
              document.querySelector(".shrink__Sd0uK") && (o = !0));
            var n = document.getElementById("js-player-toolbar"),
              i =
                ((n.style = e ? "z-index:20" : "z-index:30"),
                document.getElementsByClassName("case__f4yex")[0]),
              i =
                (i &&
                  (i.style =
                    (t || (e && o)) && (0, __imports.fn)() ? "bottom: -84px;" : "bottom: 0;"),
                !!document.getElementsByClassName("live-next-body")[0]);
            i && (n.parentElement.style = "z-index:20");
          }
          (new __imports.DomMutationSubscription(".right-e7ea5d", !0, () => {
            a();
          }, owner),
            new __imports.DomMutationSubscription(".right-17e251", !0, () => {
              a();
            }, owner),
            new __imports.DomMutationSubscription(".video__VfhVg", !0, (e) => {
              for (var t of e)
                t.target.className.includes("toggle__P8TKM") && a();
            }, owner));
          let e = (0, __imports.E)([".layout-Player-video", ".stream__T55I3"]),
            t = document.getElementsByClassName("room-Player-Box")[0],
            o = document.getElementById("refresh-video3"),
            i = 0,
            n = !1;
          function r() {
            !o ||
              n ||
              ((o.style.transition =
                "opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .3s ease"),
              (o.style.opacity = "0"),
              (o.style.transform = "scale(.9)"),
              (o.style.pointerEvents = "none"),
              (0, __imports.clearTimeout)(i));
          }
          function l() {
            o &&
              ((o.style.transition =
                "opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .3s ease"),
              (o.style.opacity = "1"),
              (o.style.transform = "scale(1)"),
              (o.style.pointerEvents = "auto"),
              (0, __imports.clearTimeout)(i),
              (i = owner.timeout(() => {
                r();
              }, 2e3)));
          }
          function s() {
            var e = document.getElementsByClassName(
                "PlayerToolbar-ContentRow",
              )[0],
              t = (0, __imports.E)([".layout-Player-video", ".stream__T55I3"]),
              o = document.getElementById("refresh-video");
            let n = document.getElementById("refresh-video3");
            e &&
              t &&
              o &&
              ("hidden" == e.style.visibility
                ? ((e.style.visibility = "visible"),
                  (0, __imports.Ht)(),
                  (t.style = ""),
                  n &&
                    ((n.style.opacity = "0"),
                    (n.style.transform = "scale(.9)"),
                    (n.style.pointerEvents = "none"),
                    (n.title = "点击隐藏礼物栏")),
                  (0, __imports.hn)(!(o.innerText = "隐藏礼物栏")),
                  (0, __imports.U)("Ex_Style_VideoRefresh"))
                : ((e.style.visibility = "hidden"),
                  (0, __imports.Ft)(),
                  (t.style = "bottom:0;z-index:25"),
                  (o.innerText = "✓ 隐藏礼物栏"),
                  n && (n.title = "点击显示礼物栏"),
                  (0, __imports.hn)(!0),
                  n &&
                    ((n.style.transition =
                      "opacity .3s ease,transform .3s cubic-bezier(0.175, 0.885, 0.32, 1.275),background-color .3s ease,box-shadow .3s ease"),
                    (n.style.opacity = "1"),
                    (n.style.transform = "scale(1.1)"),
                    (n.style.pointerEvents = "auto"),
                    (n.style.backgroundColor = "rgba(0,0,0,.8)"),
                    (n.style.boxShadow = "0 0 15px rgba(255, 102, 0, 0.6)"),
                    (0, __imports.clearTimeout)(i),
                    (i = owner.timeout(() => {
                      ((n.style.transition =
                        "opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .15s ease"),
                        (n.style.transform = "scale(1)"),
                        (n.style.backgroundColor = "rgba(0,0,0,.55)"),
                        (n.style.boxShadow = "none"),
                        (i = owner.timeout(() => {
                          r();
                        }, 1500)));
                    }, 800))),
                  (0, __imports.yn)()),
              a(),
              (0, __imports.pn)(),
              (0, __imports.te)());
          }
          (e &&
            o &&
            (owner.listen(e, "mouseenter", () => {
              l();
            }),
            owner.listen(e, "mouseleave", () => {
              r();
            })),
            t &&
              o &&
              owner.listen(t, "mousemove", () => {
                l();
              }),
            o &&
              (owner.listen(o, "mouseenter", () => {
                ((n = !0),
                  (o.style.transition =
                    "opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .3s ease"),
                  (o.style.opacity = "1"),
                  (o.style.transform = "scale(1.08)"),
                  (o.style.pointerEvents = "auto"),
                  (o.style.backgroundColor = "rgba(0,0,0,.7)"),
                  (0, __imports.clearTimeout)(i));
              }),
              owner.listen(o, "mouseleave", () => {
                ((n = !1),
                  (o.style.transform = "scale(1)"),
                  (o.style.backgroundColor = "rgba(0,0,0,.55)"),
                  l());
              })),
            (0, __imports.safeBind)("#refresh-video", "click", (e) => {
              s();
            }, owner),
            o &&
              owner.listen(o, "click", (e) => {
                (e.stopPropagation(), s());
              }));
        }
        var e,
          t,
          o,
          n,
          i = __imports.localStorage.getItem("ExSave_Refresh");
        null != i &&
          ("video" in (i = JSON.parse(i)) == 0 && (i.video = { status: !1 }),
          1 == i.video.status) &&
          ((i = document.getElementsByClassName("PlayerToolbar-ContentRow")[0]),
          (e = (0, __imports.E)([".layout-Player-video", ".stream__T55I3"])),
          (t = document.getElementById("refresh-video")),
          (o = document.getElementById("refresh-video3")),
          (n = document.getElementById("js-player-toolbar")),
          (i.style.visibility = "hidden"),
          (e.style = "bottom:0;z-index:25"),
          (n.style = "z-index:30"),
          null != (i = __imports.localStorage.getItem("ExSave_FullScreen")) &&
            JSON.parse(i).isFullScreen &&
            (n.style = "z-index:20"),
          document.getElementsByClassName("live-next-body")[0] &&
            (n.parentElement.style = "z-index:20"),
          o &&
            ((o.style.opacity = "0"),
            (o.style.transform = "scale(.9)"),
            (o.style.pointerEvents = "none"),
            (o.title = "点击显示礼物栏")),
          (t.innerText = "✓ 隐藏礼物栏"),
          (0, __imports.yn)(),
          (0, __imports.te)(),
          owner.timeout(() => {
            (0, __imports.hn)(!0);
          }, 500));
      }
      100 <= ++__imports.gn && (0, __imports.clearInterval)(d);
    }, 1500);
  }

}
