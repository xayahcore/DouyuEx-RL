function* (__imports) {
yield {"Ae": { get: () => Ae, set: value => { Ae = value; } },
"C": { get: () => C, set: value => { C = value; } },
"Ce": { get: () => Ce, set: value => { Ce = value; } },
"De": { get: () => De, set: value => { De = value; } },
"Ee": { get: () => Ee, set: value => { Ee = value; } },
"Ge": { get: () => Ge, set: value => { Ge = value; } },
"Ie": { get: () => Ie, set: value => { Ie = value; } },
"Le": { get: () => Le, set: value => { Le = value; } },
"Me": { get: () => Me, set: value => { Me = value; } },
"Ne": { get: () => Ne, set: value => { Ne = value; } },
"Oe": { get: () => Oe, set: value => { Oe = value; } },
"Pe": { get: () => Pe, set: value => { Pe = value; } },
"Re": { get: () => Re, set: value => { Re = value; } },
"Se": { get: () => Se, set: value => { Se = value; } },
"Te": { get: () => Te, set: value => { Te = value; } },
"Ue": { get: () => Ue, set: value => { Ue = value; } },
"Ve": { get: () => Ve, set: value => { Ve = value; } },
"We": { get: () => We, set: value => { We = value; } },
"Ye": { get: () => Ye, set: value => { Ye = value; } },
"_e": { get: () => _e, set: value => { _e = value; } },
"be": { get: () => be, set: value => { be = value; } },
"ce": { get: () => ce, set: value => { ce = value; } },
"de": { get: () => de, set: value => { de = value; } },
"fe": { get: () => fe, set: value => { fe = value; } },
"ge": { get: () => ge, set: value => { ge = value; } },
"he": { get: () => he, set: value => { he = value; } },
"ke": { get: () => ke, set: value => { ke = value; } },
"me": { get: () => me, set: value => { me = value; } },
"pe": { get: () => pe, set: value => { pe = value; } },
"qe": { get: () => qe, set: value => { qe = value; } },
"refreshFansMedalCache": { get: () => refreshFansMedalCache, set: value => { refreshFansMedalCache = value; } },
"se": { get: () => se, set: value => { se = value; } },
"ue": { get: () => ue, set: value => { ue = value; } },
"ve": { get: () => ve, set: value => { ve = value; } },
"we": { get: () => we, set: value => { we = value; } },
"xe": { get: () => xe, set: value => { xe = value; } },
"ye": { get: () => ye, set: value => { ye = value; } },
"ze": { get: () => ze, set: value => { ze = value; } }};
let se,
  de = null;
let ce = [],
  pe = [],
  me = 0,
  ue = 0,
  ge,
  he = 0,
  fe = 0,
  ye = !0,
  be = !1,
  ve,
  xe = [];
function we(e) {
  var t = document.getElementsByClassName("ChatSend-txt")[0];
  ("TEXTAREA" == t.tagName ? (t.value = e) : (t.innerText = e),
    document.getElementsByClassName("ChatSend-button")[0].click());
}
function _e() {
  var e = document.getElementById("bloop__text_speed1").value,
    t = document.getElementById("bloop__text_speed2").value;
  return (0, __imports.a)(Number(e), Number(t));
}
function ke() {
  let e = document.getElementById("bloop__text_speed1").value,
    t = document.getElementById("bloop__text_speed2").value,
    o = document.getElementById("bloop__text_stoptime").value;
  var n = document.getElementById("bloop__checkbox_tiangou").checked,
    n =
      ("undefined" == e && (e = 2e3),
      "undefined" == t && (t = 3e3),
      "undefined" == o && (o = 5),
      {
        text: xe,
        speed1: e,
        speed2: t,
        stopTime: o,
        isChangeColor: ye,
        isTiangouMode: n,
      });
  __imports.localStorage.setItem(
    "ExSave_BarrageLoopOptions",
    JSON.stringify(n).replace(/\\n/g, "\\r"),
  );
}
function Ee(owner, isRunning = () => true) {
  // This sends to the current room: every recursive tick belongs to its mount.
  if (!owner || owner.disposed || !isRunning() ||
      !document.getElementById("bloop__checkbox_startSend")?.checked) return;
  if (1 == ye) {
    {
      var t = fe;
      let e;
      null !=
        (e = (
          0 == be
            ? (document
                .getElementsByClassName("FansBarrageSwitcher")[0]
                .click(),
              document.getElementsByClassName("FansBarrageColor-item"))
            : (document
                .getElementsByClassName("MatchSystemFansBarrageSwitcher")[0]
                .click(),
              document.getElementsByClassName(
                "MatchSystemFansBarrageColor-item",
              ))
        )[t]) && e.click();
    }
    ++fe > me && (fe = 0);
  }
  (1 == document.getElementById("bloop__checkbox_tiangou").checked
    ? (0, __imports.T)("第三方彩虹屁已退休，请关闭该模式并使用本地词库", "info")
    : (1 == document.getElementById("bloop__checkbox_random").checked &&
        (he = Math.floor(Math.random() * pe.length)),
      we(pe[he]),
      1 != document.getElementById("bloop__checkbox_random").checked &&
        ++he > pe.length - 1 &&
        (he = 0)),
    (ge = owner.timeout(() => Ee(owner, isRunning), _e())));
}
let Be = !1;
function Ie(e) {
  if (!Be) {
    Be = !0;
    try {
      e();
    } finally {
      (0, __imports.setTimeout)(() => {
        Be = !1;
      }, 0);
    }
  }
}
function Te() {
  var e,
    t,
    o = document.getElementsByClassName("danmuContent-25f266")[0];
  o &&
    (e = o.innerHTML).includes("[DouyuEx图片") &&
    (t = e.replace(/\[DouyuEx图片(.*?)\]/g, (e, t) => {
      if ("undefined" == typeof DOMPurify)
        return ((0, __imports.ExLoadLib)(__imports.EXURL.purify, () => Te()), "");
      var o;
      return ((e) => (
        (e = e.substring(e.lastIndexOf(".")).toLowerCase()),
        [
          ".jpg",
          ".jpeg",
          ".png",
          ".gif",
          ".webp",
          ".svg",
          ".bmp",
          ".ico",
          ".tiff",
          ".tif",
        ].includes(e)
      ))(t)
        ? ((o = ((t) => {
            let o = 0n,
              n = 1n;
            for (let e = t.length - 1; 0 <= e; e--) {
              var i = t[e].toUpperCase(),
                a = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(i);
              if (-1 === a) throw new Error("Invalid base36 character: " + i);
              ((o += BigInt(a) * n), (n *= 36n));
            }
            return o.toString();
          })((t = t.split("."))[0])),
          (t = `<a href="${(o = DOMPurify.sanitize(`https://img.douyucdn.cn/data/yuba/weibo/${o.slice(0, 4) + "/" + o.slice(4, 6) + "/" + o.slice(6, 8) + "/" + o}.200x0.` + t[1])).replace("200x0.", "")}" target="_blank"><img class="ex-image-danmaku" src="${o}" alt=""></a>`),
          DOMPurify.sanitize(t))
        : "";
    })) !== e &&
    (o.innerHTML = t);
}
function Ce(t, e) {
  null == t.querySelector("#barragePanel__id") &&
    (t.childNodes && 0 < t.childNodes.length && t.removeChild(t.childNodes[0]),
    (n = ((t) => {
      let o = "";
      var n = document.getElementsByClassName("Barrage-listItem");
      for (let e = n.length - 1; 0 <= e; e--) {
        var i = n[e].lastElementChild;
        if (null != i && -1 != i.innerHTML.indexOf(t)) {
          0 < i.getElementsByClassName("Barrage-icon--roomAdmin").length &&
            (o += "【房管】");
          var a = i.getElementsByClassName("Barrage-nobleImg"),
            a =
              (0 < a.length && (o += `【${a[0].title}】`),
              i.getElementsByClassName("UserLevel"));
          0 < a.length && (o += a[0].title);
          break;
        }
      }
      return o;
    })(e)),
    ((o = document.createElement("span")).innerHTML = e),
    (o.title = n),
    (o.id = "barragePanel__id"),
    t.insertBefore(o, t.childNodes[0] || null));
  var o,
    n = ((t) => {
      let o = !1;
      var n = document.getElementsByClassName("Barrage-listItem");
      for (let e = n.length - 1; 0 <= e; e--) {
        var i = n[e].lastElementChild;
        if (null != i && -1 != i.innerHTML.indexOf(t)) {
          i = i.getElementsByClassName("FansMedalWrap");
          if (0 < i.length) {
            o = i[0].cloneNode(!0);
            break;
          }
        }
      }
      return o;
    })(e);
  if (0 != n) {
    let e = t.querySelector("#barragePanel__fansMedal");
    (e
      ? (e.innerHTML = "")
      : (((e = document.createElement("div")).id = "barragePanel__fansMedal"),
        (e.style = "display:inline-block"),
        t.insertBefore(e, t.childNodes[0] || null)),
      e.appendChild(n));
  }
}
function Se(e) {
  var t;
  null == document.getElementById("barragePanel__split") &&
    (((t = document.createElement("br")).id = "barragePanel__split"),
    e.appendChild(t));
}
function Me(e) {
  var t;
  null != document.getElementById("barragePanel__mute") ||
    0 < document.getElementsByClassName("barragePanel__muteTime").length ||
    (((t = document.createElement("div")).style =
      "display:flex;align-items:center;width:100%;gap:8px;"),
    (t.innerHTML = `

        <div class="button-7e1395" id="barragePanel__mute" style="z-index:5">禁言</div>

        <div class="barragePanel__muteTime" style="z-index:5">

            <select id="barragePanel__muteSelect" style='width:55px'>

                <option value="1">1分钟</option>

                <option value="10">10分钟</option>

                <option value="30">30分钟</option>

                <option value="60">1小时</option>

                <option value="480">8小时</option>

                <option value="1440">1天</option>

                <option value="4320">3天</option>

                <option value="10080">7天</option>

                <option value="43200">30天</option>

                <option value="259200">180天</option>

                <option value="518400">360天</option>

            </select>

        </div>

    `),
    e.appendChild(t));
}
function Ne(e) {
  var t;
  null == document.getElementById("barragePanel__search") &&
    (((t = document.createElement("div")).className = "button-7e1395"),
    (t.innerText = "查弹幕"),
    (t.id = "barragePanel__search"),
    (t.style = "z-index:5"),
    e.appendChild(t));
}
function Le(e) {
  var t;
  null == document.getElementById("barragePanel__reply") &&
    (((t = document.createElement("div")).className = "button-7e1395"),
    (t.innerText = "回复"),
    (t.id = "barragePanel__reply"),
    (t.style = "z-index:5"),
    e.appendChild(t));
}
function Ae(e, o) {
  ((document.getElementById("barragePanel__reply").onclick = () => {
    var e = document.getElementsByClassName("danmuContent-25f266")[0].innerText,
      t = document.getElementsByClassName("ChatSend-txt")[0],
      e = `@${o}：` + e;
    ("TEXTAREA" == t.tagName ? (t.value = e) : (t.innerText = e), t.focus());
  }),
    (document.getElementById("barragePanel__mute").onclick = async () => {
      var e = document.getElementById("barragePanel__muteSelect").value || "1",
        t = await (0, __imports.lo)(__imports.B, o, e);
      "添加成功" == t.msg
        ? (0, __imports.T)(`【禁言】${o}已被禁言${e}分钟`, "success")
        : (0, __imports.T)(t.msg, "error");
    }),
    (document.getElementById("barragePanel__search").onclick = async () => {
      n = o;
      var n,
        e = await new Promise((o) => {
          (0, __imports.GM_xmlhttpRequest)({
            method: "GET",
            url:
              "https://www.doseeing.com/api/suggest_all?type=room&nickname=" +
              encodeURIComponent(n),
            responseType: "json",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            onload: function (e) {
              e = e.response;
              let t = !0;
              (e.suggest || (t = !1),
                e.suggest.fan || (t = !1),
                0 === e.suggest.fan.length && (t = !1),
                (t = e.suggest.fan[0].nickname !== n ? !1 : t)
                  ? o(e.suggest.fan[0].user_id)
                  : o(""));
            },
          });
        });
      "" !== e &&
        (0, __imports._)(`https://www.doseeing.com/data/fan/${e}?type=chat&dt=0`, !0);
    }));
}
let De = [],
  C = 0,
  je = 200;
function Pe(e) {
  (De.length >= je && (De.shift(), (C = Math.min(C, De.length))),
    (C = De.push(e)));
}
function ze() {
  var e, t;
  null != De[C] &&
    ((e = De[C] || ""),
    null != (t = document.getElementsByClassName("ChatSend-txt")[0])) &&
    ("TEXTAREA" === t.tagName ? (t.value = e) : (t.innerText = e));
}
function Oe() {
  var e = document.getElementsByClassName("ChatSend-txt")[0];
  return null != e ? ("TEXTAREA" === e.tagName ? e.value : e.innerText) : "";
}
let Re = { t: 0, list: [] };
let fansMedalRefreshGeneration = 0;
async function refreshFansMedalCache(owner) {
  const room = __imports.B, generation = ++fansMedalRefreshGeneration;
  try {
    const response = await (0, __imports.fetch)(
      "https://www.douyu.com/japi/interact/cdn/pocket/effective?rid=" + room,
      { method: "GET", credentials: "include" },
    );
    if (response.ok === false) throw new Error('Fans medal request failed');
    const result = await response.json();
    if (owner?.disposed || __imports.B !== room || generation !== fansMedalRefreshGeneration) return false;
    if (!Array.isArray(result?.data?.list)) return false;
    Re.list = result.data.list;
    Re.t = Date.now();
    return true;
  } catch (error) {
    console.log("请求失败!", error);
    return false;
  }
}
function He(e) {
  return (0, __imports.qr)(__imports.B, !0, 0, e, (e) => {
    !e || "None" == e
      ? (0, __imports.T)("房间未开播或其他错误", "error")
      : ((e = String(e)), (0, __imports.GM_setClipboard)(e), (0, __imports.T)("复制成功", "success"));
  }, __imports.activeRoomMount);
}
function Ge() {
  0 < document.querySelectorAll(".tipItem-898596 > ul > li").length
    ? document.querySelectorAll(".tipItem-898596 > ul > li").forEach((e) => {
        e.className.includes("selected") &&
          He(
            ((e = e.innerText),
            String(e).includes("蓝光8M")
              ? 8
              : String(e).includes("蓝光4M")
                ? 4
                : String(e).includes("超清")
                  ? 3
                  : String(e).includes("高清")
                    ? 2
                    : 0),
          );
      })
    : He(0);
}
function Ve(e) {
  var t = e.target.value,
    o = document
      .getElementsByClassName("ChatBarrageCollectPop-barrageContent")[0]
      .parentElement.getElementsByClassName("TagItem");
  for (let e = 0; e < o.length; e++) {
    var n = o[e];
    n.innerText.includes(t)
      ? (n.style.display = "")
      : (n.style.display = "none");
  }
}
function qe() {
  let t = __imports.localStorage.getItem("ExSave_DanmakuCollect");
  try {
    t = JSON.parse(t) || [];
  } catch (e) {
    t = [];
  }
  return t;
}
function Ue() {
  var e = {
    isTailEnabled: document.getElementById("DanmakuTail-checkbox").checked,
    tailContent: document.getElementById("DanmakuTail-input").value,
    type: document.querySelector('input[name="DanmakuTailType"]:checked').value,
  };
  __imports.localStorage.setItem("ExSave_DanmakuTail", JSON.stringify(e));
}
async function We(e, o, signal) {
  const response = await (0, __imports.fetch)("https://v.douyu.com/api/stream/getStreamUrl", {
    method: "POST", credentials: "include", signal,
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: o + "&vid=" + e,
  });
  if (response.ok === false) throw new Error("获取m3u8链接失败");
  const result = await response.json();
  if (!result?.data?.thumb_video || typeof result.data.thumb_video !== "object")
    throw new Error("获取m3u8链接失败");
  return result;
}
async function Ye(e, o = 0, signal) {
  if (o < 0) return;
  const response = await (0, __imports.fetch)(
    `https://v.douyu.com/wgapi/vod/center/getBarrageListByPage?vid=${e}&offset=${o}`,
    { method: "GET", credentials: "include", signal },
  );
  if (response.ok === false) throw new Error("获取弹幕数据失败");
  const result = await response.json();
  if (!Array.isArray(result?.data?.list) || result.data.pre == null ||
      result.data.pre === "" || !Number.isFinite(Number(result.data.pre)))
    throw new Error("弹幕分页数据无效");
  return result;
}

}
