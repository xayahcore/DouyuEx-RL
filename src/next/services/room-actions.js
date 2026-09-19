function* (__imports) {
yield {"At": { get: () => At, set: value => { At = value; } },
"Bt": { get: () => Bt, set: value => { Bt = value; } },
"Ct": { get: () => Ct, set: value => { Ct = value; } },
"Dt": { get: () => Dt, set: value => { Dt = value; } },
"Et": { get: () => Et, set: value => { Et = value; } },
"Ft": { get: () => Ft, set: value => { Ft = value; } },
"Gt": { get: () => Gt, set: value => { Gt = value; } },
"Ht": { get: () => Ht, set: value => { Ht = value; } },
"It": { get: () => It, set: value => { It = value; } },
"Mt": { get: () => Mt, set: value => { Mt = value; } },
"Ot": { get: () => Ot, set: value => { Ot = value; } },
"Pt": { get: () => Pt, set: value => { Pt = value; } },
"St": { get: () => St, set: value => { St = value; } },
"Tt": { get: () => Tt, set: value => { Tt = value; } },
"Ut": { get: () => Ut, set: value => { Ut = value; } },
"Wt": { get: () => Wt, set: value => { Wt = value; } },
"Yt": { get: () => Yt, set: value => { Yt = value; } },
"claimLevelTasks": { get: () => claimLevelTasks, set: value => { claimLevelTasks = value; } },
"jt": { get: () => jt, set: value => { jt = value; } },
"kt": { get: () => kt, set: value => { kt = value; } },
"qt": { get: () => qt, set: value => { qt = value; } }};
let kt = [],
  Et;
function Bt(t) {
  (0, __imports.fetch)("https://www.douyu.com/japi/interactnc/web/propredpacket/grab_prp", {
    method: "POST",
    mode: "no-cors",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "activityid=" + t + "&ctn=" + (0, __imports.w)(),
  })
    .then((e) => e.json())
    .then((e) => {
      2 == e.data.isSuc && Bt(t);
    });
}
function It() {
  try {
    var e = __imports.localStorage.getItem("ExSave_TabSwitch");
    if (null != e) return !!JSON.parse(e).isEnableTabSwitch;
  } catch (e) {}
  e = document.getElementById("extool__tabSwitch");
  return !!e && e.checked;
}
function Tt(e) {
  __imports.localStorage.setItem(
    "ExSave_TabSwitch",
    JSON.stringify({ isEnableTabSwitch: !!e }),
  );
  var t = document.getElementById("extool__tabSwitch");
  (t && (t.checked = !!e), e && Ct());
}
function Ct() {
  (Object.defineProperty(document, "hidden", { value: !1, writable: !1 }),
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: !1,
    }),
    Object.defineProperty(document, "webkitVisibilityState", {
      value: "visible",
      writable: !1,
    }),
    document.dispatchEvent(new Event("visibilitychange")),
    (document.hasFocus = function () {
      return !0;
    }),
    document.addEventListener(
      "visibilitychange",
      function (e) {
        e.stopImmediatePropagation();
      },
      !0,
      !0,
    ));
}
var St = !1;
function Mt() {
  var e = document.getElementById("extool__treasure_delay").value;
  return Number(e);
}
let Nt = null,
  Lt = null;
function At() {
  return (
    document.querySelector(
      ".PlayerToolbar-ContentCell .PlayerToolbar-Wealth",
    ) || document.querySelector(".PlayerToolbar-ContentRow")
  );
}
function Dt() {
  var e = document.getElementsByClassName("PlayerToolbar-ContentRow")[0];
  return e && "hidden" === e.style.visibility;
}
function jt() {
  return (
    document.getElementById("js-player-dialog") ||
    document.getElementsByClassName("room-Player-Box")[0] ||
    document.body
  );
}
function Pt(e) {
  Nt || ((Nt = e.parentNode), (Lt = e.nextSibling));
}
function zt() {
  var e,
    t,
    o,
    n = document.querySelector(".ex-panel.ex-panel--floating");
  n &&
    ((e = document.getElementById("js-player-toolbar")),
    (o = document.getElementById("ex-vtoolbar-menu")),
    e
      ? ((e = e.getBoundingClientRect()),
        (n.style.position = "fixed"),
        (n.style.bottom = window.innerHeight - e.top + 8 + "px"),
        (n.style.top = "auto"),
        o
          ? ((o = o.getBoundingClientRect()),
            (t = n.offsetWidth || n.scrollWidth || 320),
            (o = o.left + o.width / 2 - t / 2),
            (o = Math.max(8, Math.min(o, window.innerWidth - t - 8))),
            (n.style.left = o + "px"))
          : ((t = n.offsetWidth || n.scrollWidth || 320),
            (o = e.left + e.width / 2 - t / 2),
            (o = Math.max(8, Math.min(o, window.innerWidth - t - 8))),
            (n.style.left = o + "px")),
        (n.style.right = "auto"))
      : ((n.style.bottom = "72px"),
        (n.style.right = "12px"),
        (n.style.left = "")));
}
function Ot() {
  var e = document.querySelector(".ex-panel");
  (e &&
    !e.classList.contains("ex-panel--floating") &&
    (Pt(e), jt().appendChild(e), e.classList.add("ex-panel--floating")),
    zt());
}
function Rt() {
  var e = document.querySelector(".ex-panel"),
    t = At();
  e &&
    t &&
    e.classList.contains("ex-panel--floating") &&
    (Lt && Lt.parentNode === t
      ? t.insertBefore(e, Lt)
      : t.insertBefore(e, t.childNodes[0]),
    e.classList.remove("ex-panel--floating"));
}
function Ft() {
  var e = document.querySelector(".ex-panel");
  e && "block" === e.style.display && (Ot(), zt());
}
function Ht() {
  Rt();
}
function Gt() {
  var e = document.querySelector(".ex-panel");
  e && ((0, __imports.clearTimeout)(__imports.Y), (__imports.Y = null), (e.style.display = "none"));
}
function Vt() {
  Gt();
}
function qt() {
  var e = document.getElementsByClassName("ex-panel")[0];
  e &&
    ((Dt() ? Ot : Rt)(),
    "block" !== e.style.display
      ? ((e.style.display = "block"),
        (0, __imports.clearTimeout)(__imports.Y),
        e.classList.contains("ex-panel--floating") && zt())
      : ((e.style.display = "none"), (0, __imports.clearTimeout)(__imports.Y)));
}
async function Ut(e, t, o) {
  return (
    await (0, __imports.fetch)("https://www.douyu.com/japi/prop/donate/mainsite/v1", {
      method: "POST",
      mode: "no-cors",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:
        "propId=" +
        e +
        "&propCount=" +
        t +
        "&roomId=" +
        o +
        "&bizExt=%7B%22yzxq%22%3A%7B%7D%7D",
    })
  ).json();
}
let Wt;
function Yt(e) {
  var t = document.getElementsByClassName("Header-follow-tab is-active")[0]
    .innerText;
  "特别关注" !== t &&
    "视频动态" !== t &&
    0 !=
      (t = document.getElementsByClassName("Header-follow-listWrap")).length &&
    ((document.getElementsByClassName(
      "Header-follow-listBox",
    )[0].style.display = "none"),
    (async (e) => {
      var i = await (0, __imports.GM_getValue)("Ex_LoadInCurrentPage", !1),
        a = await new Promise((t) => {
          (0, __imports.fetch)(
            "https://www.douyu.com/wgapi/livenc/liveweb/follow/list?sort=1&cid1=0",
            {
              method: "GET",
              mode: "no-cors",
              credentials: "include",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            },
          )
            .then((e) => e.json())
            .then((e) => {
              t(e);
            });
        });
      if ("0" == a.error) {
        let t = 0,
          o = `

        <div id="refreshFollowList" style="color: grey; position: absolute; top: 0px; cursor: default; display: flex; align-items: center; justify-content: space-between; width: calc(100% - 10px); padding: 0 5px;">

            <label style="display: flex; align-items: center; cursor: pointer; color: inherit;">

                <input type="checkbox" id="loadInCurrentPageCheckbox" ${i ? "checked" : ""} style="margin-right: 5px;">

                在当前页面加载

            </label>

            <span>长按弹出同屏播放</span>

        </div>

    `;
        var r = Math.floor(Date.now() / 1e3);
        for (let e = 0; e < a.data.list.length; e++) {
          var l = a.data.list[e];
          if (
            ("1" == l.show_status &&
              "0" == l.videoLoop &&
              ((o += `<li class="DropPaneList FollowList ExFollowListItem" rid="${l.room_id}"><a><div class="DropPaneList-cover"><div class="LazyLoad is-visible DyImg "><img src="${String(l.avatar_small).replace("_big", "_small")}" alt="${l.nickname}" class="DyImg-content is-normal "></div></div><div class="DropPaneList-info"><p><span class="DropPaneList-hot"><i></i>${l.online}</span><span class="DropPaneList-title">${l.room_name}</span></p><p><span class="DropPaneList-name">${l.nickname}</span><span class="DropPaneList-time">已播${(0, __imports.Q)(r - Number(l.show_time))}</span></p></div></a></li>`),
              t++),
            10 <= t)
          )
            break;
        }
        e.innerHTML += o;
        i = e.querySelector("#loadInCurrentPageCheckbox");
        i &&
          i.addEventListener("change", async (e) => {
            e = e.target.checked;
            (await (0, __imports.GM_setValue)("Ex_LoadInCurrentPage", e),
              (0, __imports.T)(
                `【关注列表】已${e ? "开启" : "关闭"}当前页加载功能（${e ? "当前页面直接加载关注的直播间" : "使用新网页打开关注的直播间"}）`,
                "info",
              ));
          });
        let n = document.getElementsByClassName("ExFollowListItem");
        for (let o = 0; o < n.length; o++) {
          var s = new __imports.PointerGestureBinding(n[o]);
          (s.longClick(() => {
            ((0, __imports.en)(__imports.D.length, n[o].getAttribute("rid"), "Douyu"),
              (document.querySelector(".Follow .public-DropMenu").className =
                "public-DropMenu"));
          }),
            s.click(async (e) => {
              e.preventDefault();
              var e = await (0, __imports.GM_getValue)("Ex_LoadInCurrentPage", !1),
                t = "https://www.douyu.com/" + n[o].getAttribute("rid");
              e ? (window.location.href = t) : (0, __imports._)(t, !0);
            }),
            n[o].addEventListener("mousedown", (e) => {
              1 == e.button &&
                (0, __imports._)("https://www.douyu.com/" + n[o].getAttribute("rid"), !1);
            }));
        }
      }
    })(t[0]));
}
async function claimLevelTasks() {
  e = __imports.B;
  var e,
    n,
    t = await new Promise((t, o) => {
      (0, __imports.fetch)(
        "https://www.douyu.com/japi/interactnc/web/userLevel/userLevelDetail?rid=" +
          e,
        {
          method: "GET",
          mode: "no-cors",
          credentials: "include",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      )
        .then((e) => e.json())
        .then((e) => {
          e = e.data.taskIds.join(",");
          t(e);
        })
        .catch((e) => {
          (console.log("请求失败!", e), o(e));
        });
    }),
    o =
      ((n = t),
      await new Promise((t, o) => {
        (0, __imports.fetch)(
          "https://www.douyu.com/japi/tasksys/userLevelTask/getTaskStatus?taskIds=" +
            n,
          {
            method: "GET",
            mode: "no-cors",
            credentials: "include",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          },
        )
          .then((e) => e.json())
          .then((e) => {
            t(e.data.list);
          })
          .catch((e) => {
            (console.log("请求失败!", e), o(e));
          });
      }));
  for (let e = 0; e < o.length; e++) {
    var i = o[e],
      a = i.taskId,
      r = i.name;
    if (1 == i.taskStatus && 0 == i.prizeStatus) {
      var l = await ((e, n) =>
        new Promise((t, o) => {
          (0, __imports.fetch)("https://www.douyu.com/japi/tasksys/userLevelTask/getPrize", {
            method: "POST",
            mode: "no-cors",
            credentials: "include",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `ctn=${(0, __imports.w)()}&taskIds=${n}&roomId=` + e,
          })
            .then((e) => e.json())
            .then((e) => {
              t(e.data.list);
            })
            .catch((e) => {
              (console.log("请求失败!", e), o(e));
            });
        }))(__imports.B, a);
      for (let e = 0; e < l.length; e++)
        (0, __imports.T)(`【等级任务】${r} 获得` + l[e].name + l[e].num, "success");
    }
  }
}

}
