function* (__imports) {
yield {"$n": { get: () => $n, set: value => { $n = value; } },
"En": { get: () => En, set: value => { En = value; } },
"Un": { get: () => Un, set: value => { Un = value; } },
"Wn": { get: () => Wn, set: value => { Wn = value; } },
"qn": { get: () => qn, set: value => { qn = value; } }};
let En = 5;
let Bn =
  !!(__imports.n = __imports.localStorage.getItem("ExSave_isRemoveDanmakuBackground")) &&
  1 === Number(__imports.n);
function In() {
  document.getElementsByClassName("FilterKeywords")[0].insertAdjacentHTML(
    "afterbegin",
    `<div class="FilterSwitchStatus" id="ex-removeDanmakuBackground">

    <h3>屏蔽弹幕背景</h3>

    <div>

      <span class="FilterSwitchStatus-status ${Bn ? "is-checked" : "is-noChecked"}">${Bn ? "已开启" : "未开启"}</span>

      <span class="FilterSwitchStatus-switch ${Bn ? "is-checked" : "is-noChecked"}">

        <span class="FilterSwitchStatus-switch-inner"></span>

      </span>

    </div>

  </div>`,
  );
  var e = document.getElementById("ex-removeDanmakuBackground");
  let t = e.querySelector(".FilterSwitchStatus-status"),
    o = e.querySelector(".FilterSwitchStatus-switch");
  e.addEventListener("click", () => {
    ((Bn = !Bn)
      ? (Tn(),
        (t.className = t.className.replace("is-noChecked", "is-checked")),
        (t.textContent = "已开启"),
        (o.className = o.className.replace("is-noChecked", "is-checked")))
      : ((0, __imports.U)("Ex_Style_RemoveDanmakuBackground"),
        (t.className = t.className.replace("is-checked", "is-noChecked")),
        (t.textContent = "未开启"),
        (o.className = o.className.replace("is-checked", "is-noChecked"))),
      __imports.localStorage.setItem("ExSave_isRemoveDanmakuBackground", Bn ? 1 : 0));
  });
}
function Tn() {
  (0, __imports.tl)(
    "Ex_Style_RemoveDanmakuBackground",
    `

      .danmuItem-a8616a {

        background: none !important;

      }

      .danmuItem-a8616a div{

        background: none;

      }

      .danmuItem-a8616a > img {

        display: none;

      }

      .danmuItem-a8616a div > img {

        display: none;

      }

      .super-text-f60bfa {

        background: none !important;

      }

      .danmuItem-a8616a .noble-d35c82 {

        background: none !important;

      }

      .customBarrage {

        background: none !important;

        text-shadow: none !important;

      }

      .customBarrage > div {

        background: none !important;

      }

      .PlayerCustomBarrage-prefixPlugin--text {

        display: none !important;

      }

  `,
  );
}
(Bn && Tn(),
  (__imports.t = __imports.localStorage.getItem("ExSave_isRemoveDanmakuImage")) && Number(__imports.t));
let Cn =
  !!(__imports.n = __imports.localStorage.getItem("ExSave_isRemoveEnterBarrage")) &&
  1 === Number(__imports.n);
function Sn() {
  var o = document.getElementsByClassName("FilterKeywords")[0],
    n =
      window.CSS &&
      window.CSS.supports &&
      window.CSS.supports("--enter-display", "none");
  let i = document.getElementById("js-barrage-extend-container");
  if (null != o && n) {
    (o.insertAdjacentHTML(
      "afterbegin",
      `<div class="FilterSwitchStatus" id="ex-removeEnterBarrage">

    <h3>屏蔽进场弹幕</h3>

    <div>

      <span class="FilterSwitchStatus-status ${Cn ? "is-checked" : "is-noChecked"}">${Cn ? "已开启" : "未开启"}</span>

      <span class="FilterSwitchStatus-switch ${Cn ? "is-checked" : "is-noChecked"}">

        <span class="FilterSwitchStatus-switch-inner"></span>

      </span>

    </div>

  </div>`,
    ),
      Cn
        ? i && i.style.setProperty("--enter-display", "none", "important")
        : i && i.style.setProperty("--enter-display", "block", "important"));
    n = document.getElementById("ex-removeEnterBarrage");
    let e = n.querySelector(".FilterSwitchStatus-status"),
      t = n.querySelector(".FilterSwitchStatus-switch");
    n.addEventListener("click", () => {
      ((Cn = !Cn)
        ? (i && i.style.setProperty("--enter-display", "none", "important"),
          (e.className = e.className.replace("is-noChecked", "is-checked")),
          (e.textContent = "已开启"),
          (t.className = t.className.replace("is-noChecked", "is-checked")))
        : (i && i.style.setProperty("--enter-display", "block", "important"),
          (e.className = e.className.replace("is-checked", "is-noChecked")),
          (e.textContent = "未开启"),
          (t.className = t.className.replace("is-checked", "is-noChecked"))),
        __imports.localStorage.setItem("ExSave_isRemoveEnterBarrage", Cn ? 1 : 0));
    });
  }
}
let Mn = "1" === __imports.localStorage.getItem("ExSave_isRemoveRepeatedDanmaku"),
  Nn = (() => {
    var e = __imports.localStorage.getItem("ExSave_repeatedDanmakuSeconds");
    if (e) {
      e = parseInt(e);
      if (!isNaN(e) && 1 <= e && e <= 60) return e;
    }
    return 5;
  })(),
  Ln =
    null !== (__imports.t = __imports.localStorage.getItem("ExSave_isEnlargeDanmaku")) && "1" === __imports.t,
  An = {},
  Dn = {},
  jn = {},
  Pn = {},
  zn = new WeakMap(),
  On = null,
  Rn = null;
function Fn() {
  document.getElementsByClassName("FilterKeywords")[0].insertAdjacentHTML(
    "afterbegin",
    `<div class="FilterSwitchStatus" id="ex-removeRepeatedDanmaku">

    <h3>屏蔽重复弹幕</h3>

    <div>

      <span class="FilterSwitchStatus-status ${Mn ? "is-checked" : "is-noChecked"}">${Mn ? "已开启" : "未开启"}</span>

      <span class="FilterSwitchStatus-switch ${Mn ? "is-checked" : "is-noChecked"}">

        <span class="FilterSwitchStatus-switch-inner"></span>

      </span>

    </div>

  </div>

  <p class="FilterKeywords-intelligentText" style="display: flex; align-items: center;justify-content: space-between;">

    <span>

      <input type="number" id="ex-repeatedDanmakuSeconds" min="1" max="300" value="${Nn}" style="width: 38px; height: 14px; text-align: center;" />

      <span>秒内重复的弹幕只显示一次</span>

    </span>

    <label style="margin-left: 10px;display: inline-flex; align-items: center;">

      <input type="checkbox" id="ex-enlargeDanmaku" ${Ln ? "checked" : ""} style="margin-right: 4px;" />

      放大重复弹幕

    </label>

  </p>`,
  );
  var e = document.getElementById("ex-removeRepeatedDanmaku");
  let t = e.querySelector(".FilterSwitchStatus-status"),
    o = e.querySelector(".FilterSwitchStatus-switch"),
    n = document.getElementById("ex-repeatedDanmakuSeconds"),
    i = document.getElementById("ex-enlargeDanmaku");
  (n.addEventListener("click", (e) => {
    e.stopPropagation();
  }),
    i.addEventListener("click", (e) => {
      e.stopPropagation();
    }),
    n.addEventListener("input", () => {
      let e = parseInt(n.value);
      var t;
      (isNaN(e) || e < 1
        ? ((e = 1), (n.value = 1))
        : 300 < e && ((e = 300), (n.value = 300)),
        (Nn = e),
        (t = e),
        __imports.localStorage.setItem("ExSave_repeatedDanmakuSeconds", t.toString()),
        Mn && (Rn && (Rn.closeHook(), (Rn = null)), Vn(), Hn()));
    }),
    i.addEventListener("change", () => {
      var e;
      ((Ln = i.checked),
        (e = Ln),
        __imports.localStorage.setItem("ExSave_isEnlargeDanmaku", e ? "1" : "0"));
    }),
    e.addEventListener("click", () => {
      (Mn = !Mn)
        ? (Hn(),
          (t.className = t.className.replace("is-noChecked", "is-checked")),
          (t.textContent = "已开启"),
          (o.className = o.className.replace("is-noChecked", "is-checked")))
        : (Rn && (Rn.closeHook(), (Rn = null)),
          Vn(),
          (0, __imports.U)("Ex_Style_RemoveRepeatedDanmaku"),
          (0, __imports.U)("Ex_Style_RemoveRepeatedDanmaku_Count"),
          (t.className = t.className.replace("is-checked", "is-noChecked")),
          (t.textContent = "未开启"),
          (o.className = o.className.replace("is-checked", "is-noChecked")));
      var e = Mn;
      __imports.localStorage.setItem("ExSave_isRemoveRepeatedDanmaku", e ? "1" : "0");
    }));
}
function Hn() {
  (0, __imports.tl)(
    "Ex_Style_RemoveRepeatedDanmaku_Count",
    `

    /* 弹幕计数显示样式 */

    [data-repeat-count]::before {

      content: "x" attr(data-repeat-count);

      font-weight: bold;

      display: inline-block;

      position: absolute;

      right: -18px;

      bottom: 0;

      font-size: 16px;

      font-family: "Helvetica Neue",Helvetica,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","微软雅黑",Arial,sans-serif;

      color: inherit;

    }

    

    /* 计数跳动动画 */

    @keyframes danmaku-combo-bounce {

      0% {

        transform: scale(1);

      }

      50% {

        transform: scale(1.5);

      }

      100% {

        transform: scale(1);

      }

    }

    

    /* 应用动画的类 */

    .danmaku-combo-animation::before {

      animation: danmaku-combo-bounce 0.2s ease-out;

    }

    `,
  );
  let e = (0, __imports.setInterval)(() => {
    document.querySelector(".danmu-fbb2a3") &&
      ((0, __imports.clearInterval)(e),
      (On = On || (0, __imports.setInterval)(Gn, 2e4)),
      (Rn = new __imports.DomMutationSubscription(".danmu-fbb2a3", !1, (i) => {
        if (!(i.length <= 0) && Mn)
          if (i[0].addedNodes.length <= 0 && 0 < i[0].removedNodes.length) {
            var n = i[0].removedNodes[0];
            let e = n.comment.uuid;
            var a = n.comment.startTime + n.comment.duration;
            let t = Date.now();
            if (t > a) return;
            Dn[e] = t + 1e3 * Nn;
            let o = n.textContent ? n.textContent.trim() : "";
            void (
              o &&
              jn[o] === n &&
              (delete jn[o], delete Pn[o], delete An[o])
            );
          } else if (!(i[0].addedNodes.length <= 0)) {
            a = i[0].addedNodes[0];
            if (a) {
              let e = Date.now(),
                t = a.comment.uuid;
              n = Dn[t];
              if (!(n && e <= n)) {
                let n = a.textContent ? a.textContent.trim() : "";
                if (n && 0 !== n.length) {
                  i = An[n];
                  if (i && e <= i) {
                    if (
                      ((a.className += " repeated-danmaku"),
                      (Pn[n] = (Pn[n] || 1) + 1),
                      Ln)
                    ) {
                      let o = jn[n];
                      o && o.parentNode
                        ? (0, __imports.requestAnimationFrame)(() => {
                            var e, t;
                            o.parentNode &&
                              (zn.has(o) ||
                                ((t = window.getComputedStyle(o)),
                                zn.set(o, t.fontSize)),
                              (t = zn.get(o)),
                              (t = parseFloat(t) || 20),
                              (e = Pn[n]),
                              (t = Math.min(t + 2 * (e - 1), 40)),
                              (o.style.fontSize = t + "px"),
                              o.setAttribute("data-repeat-count", e),
                              o.classList.remove("danmaku-combo-animation"),
                              (0, __imports.requestAnimationFrame)(() => {
                                o.parentNode &&
                                  o.classList.add("danmaku-combo-animation");
                              }));
                          })
                        : (o && o.parentNode) || (delete jn[n], delete Pn[n]);
                    }
                  } else ((An[n] = e + 1e3 * Nn), (jn[n] = a), (Pn[n] = 1));
                }
              }
            }
          }
      })));
  }, 1e3);
}
function Gn() {
  var e,
    t,
    o = Date.now();
  for ([e, t] of Object.entries(An))
    t <= o && (delete An[e], delete jn[e], delete Pn[e]);
  for (let [e, t] of Object.entries(Dn)) t <= o && delete Dn[e];
}
function Vn() {
  (On && ((0, __imports.clearInterval)(On), (On = null)),
    (An = {}),
    (Dn = {}),
    (jn = {}),
    (Pn = {}));
}
function qn() {
  (Fn(), Sn(), In());
}
function Un(e) {
  return -1 === e.indexOf("player_barrage")
    ? e
    : e
        .replace(/player_barrage\\":0/g, 'player_barrage\\":1')
        .replace(/"player_barrage":0/g, '"player_barrage":1');
} // ==================== 一键签到模块化纯净执行引擎 ====================
function Wn(e) {
  var stored = null;
  try {
    stored = JSON.parse(__imports.localStorage.getItem("ExSave_SignConfig"));
  } catch (err) {}
  (0, __imports.executeSignEngine)(stored);
}

Mn && Hn();
let Yn = {};
function Qn(e) {
  return new Promise((o) => {
    (0, __imports.fetch)(
      `https://webconf.douyucdn.cn/resource/common/activity/actqzs${e}_w.json`,
    )
      .then((e) => e.text())
      .then((e) => {
        let t = e.substring(String("DYConfigCallback(").length, e.length);
        t = t.substring(0, t.lastIndexOf(")"));
        try {
          ((t = JSON.parse(t)), o(t.data.activity_setting.activity_id));
        } catch (e) {
          o(null);
        }
      })
      .catch((e) => {
        o(null);
      });
  });
}
function Jn(e) {
  return new Promise((o) => {
    (0, __imports.fetch)(
      `https://webconf.douyucdn.cn/resource/common/activity/cardArena${e}_w.json`,
    )
      .then((e) => e.text())
      .then((e) => {
        let t = e.substring(String("DYConfigCallback(").length, e.length);
        t = t.substring(0, t.lastIndexOf(")"));
        try {
          ((t = JSON.parse(t)), o(t.data.activity_setting.activity_id));
        } catch (e) {
          o(null);
        }
      })
      .catch((e) => {
        o(null);
      });
  });
}
function Zn(t) {
  let o = "";
  var n = document.cookie.split("; ");
  for (let e = 0; e < n.length; e++) {
    var i = n[e].split("=");
    t == i[0] && (o = i[1]);
  }
  return (
    "" == o &&
      ((o = Math.random().toString(36).substr(2)),
      (document.cookie = "post-csrfToken=" + escape(o) + ";path=/")),
    o
  );
}
function $n(e) {
  (0, __imports.GM_xmlhttpRequest)({
    method: "POST",
    url: "https://apiv2.douyucdn.cn/japi/roomuserlevel/apinc/checkIn?client_sys=android",
    data: "rid=" + e,
    responseType: "json",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      token: __imports.m,
      aid: "android1",
    },
    onload: function (e) {},
  });
}

}
