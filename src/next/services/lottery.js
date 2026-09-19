function* (__imports) {
yield {"$t": { get: () => $t, set: value => { $t = value; } },
"A": { get: () => A, set: value => { A = value; } },
"Bo": { get: () => Bo, set: value => { Bo = value; } },
"Eo": { get: () => Eo, set: value => { Eo = value; } },
"Io": { get: () => Io, set: value => { Io = value; } },
"Jt": { get: () => Jt, set: value => { Jt = value; } },
"Kt": { get: () => Kt, set: value => { Kt = value; } },
"L": { get: () => L, set: value => { L = value; } },
"Lo": { get: () => Lo, set: value => { Lo = value; } },
"M": { get: () => M, set: value => { M = value; } },
"Mo": { get: () => Mo, set: value => { Mo = value; } },
"N": { get: () => N, set: value => { N = value; } },
"No": { get: () => No, set: value => { No = value; } },
"S": { get: () => S, set: value => { S = value; } },
"So": { get: () => So, set: value => { So = value; } },
"To": { get: () => To, set: value => { To = value; } },
"Xt": { get: () => Xt, set: value => { Xt = value; } },
"_o": { get: () => _o, set: value => { _o = value; } },
"ao": { get: () => ao, set: value => { ao = value; } },
"bo": { get: () => bo, set: value => { bo = value; } },
"co": { get: () => co, set: value => { co = value; } },
"eo": { get: () => eo, set: value => { eo = value; } },
"fo": { get: () => fo, set: value => { fo = value; } },
"go": { get: () => go, set: value => { go = value; } },
"ho": { get: () => ho, set: value => { ho = value; } },
"io": { get: () => io, set: value => { io = value; } },
"ko": { get: () => ko, set: value => { ko = value; } },
"lo": { get: () => lo, set: value => { lo = value; } },
"mo": { get: () => mo, set: value => { mo = value; } },
"no": { get: () => no, set: value => { no = value; } },
"oo": { get: () => oo, set: value => { oo = value; } },
"po": { get: () => po, set: value => { po = value; } },
"ro": { get: () => ro, set: value => { ro = value; } },
"so": { get: () => so, set: value => { so = value; } },
"to": { get: () => to, set: value => { to = value; } },
"uo": { get: () => uo, set: value => { uo = value; } },
"vo": { get: () => vo, set: value => { vo = value; } },
"wo": { get: () => wo, set: value => { wo = value; } },
"xo": { get: () => xo, set: value => { xo = value; } },
"yo": { get: () => yo, set: value => { yo = value; } }};
let Jt = "",
  Zt = 0;
let Xt = 0;
let Kt = !1,
  S = [];
function $t() {
  var e = S;
  __imports.localStorage.setItem("ExSave_Enter", JSON.stringify(e));
}
function eo() {
  var e,
    t = document.getElementById("enter__select");
  t.options.length = 0;
  for (e of S) t.options.add(new Option(`【${e.level}级】` + e.word, ""));
}
let to = !1,
  M = {};
function oo() {
  var e = M;
  __imports.localStorage.setItem("ExSave_Gift", JSON.stringify(e));
}
function N(e) {
  return (0, __imports.v)(e, "type@=", "/");
}
let no = !1,
  L = {},
  io = {},
  ao = [];
function ro() {
  var e = L;
  __imports.localStorage.setItem("ExSave_Mute", JSON.stringify(e));
}
function lo(e, o, n) {
  return new Promise((t) => {
    (0, __imports.fetch)("https://www.douyu.com/room/roomSetting/addMuteUser", {
      method: "POST",
      mode: "no-cors",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:
        "ban_nickname=" + o + "&room_id=" + e + "&ban_time=" + n + "&reason=7",
    })
      .then((e) => e.json())
      .then((e) => {
        t(e);
      });
  });
}
let so = { day: {}, week: {}, all: {} };
function co(t, o) {
  if (o)
    for (let e = "week" === t ? 10 : 0; e < o.length; e++) {
      var n = o[e],
        i = n.innerHTML.split("<span")[0],
        a = n.parentElement,
        r = so[t][i];
      a.className.includes("--top")
        ? (n.innerHTML = i + `<span class="exRankPoint--top">${r}</span>`)
        : (n.innerHTML = i + `<span class="exRankPoint">${r}</span>`);
    }
}
function po(t) {
  var o = {};
  for (let e = 0; e < t.length; e++) {
    var n = t[e];
    o[n.nickname] = Number(n.gold) / 100;
  }
  return o;
}
let mo = !1,
  A = {},
  uo = !1,
  go = 0;
function ho() {
  var e = A;
  __imports.localStorage.setItem("ExSave_Reply", JSON.stringify(e));
}
var fo = 0;
function yo(i, a, r, l) {
  (0, __imports.GM_xmlhttpRequest)({
    method: "POST",
    url: "https://pcapi.douyucdn.cn/h5nc/member/getRedPacket?token=" + __imports.m,
    data:
      "room_id=" +
      i +
      "&package_room_id=" +
      i +
      "&device_id=" +
      r +
      "&packerid=" +
      a +
      "&version=1",
    responseType: "json",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    onload: function (t) {
      t = t.response;
      if ("-1" == t.data.code && "0" != t.data.validate) {
        var e = JSON.parse(t.data.geetest.validate_str),
          o = e.success;
        null != __imports.unsafeWindow.initGeetest
          ? __imports.unsafeWindow.initGeetest(
              {
                gt: e.gt,
                challenge: e.challenge,
                offline: !o,
                product: "float",
              },
              (o) => {
                let n = document.getElementById(l);
                (o.appendTo("#" + l),
                  o.onSuccess(() => {
                    var e = o.getValidate(),
                      t = e.geetest_challenge,
                      t =
                        "room_id=" +
                        i +
                        "&package_room_id=" +
                        i +
                        "&device_id=" +
                        r +
                        "&packerid=" +
                        a +
                        "&version=1" +
                        "&geetest_challenge=" +
                        t +
                        "&geetest_validate=" +
                        e.geetest_validate +
                        "&geetest_seccode=" +
                        encodeURIComponent(e.geetest_seccode);
                    (0, __imports.GM_xmlhttpRequest)({
                      method: "POST",
                      url:
                        "https://pcapi.douyucdn.cn/h5nc/member/getRedPacket?token=" +
                        __imports.m,
                      data: t,
                      responseType: "json",
                      headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                      },
                      onload: function (e) {
                        e = e.response;
                        let t = "";
                        ("" !=
                          (t =
                            "" == e.data.prop_id
                              ? "鱼丸x" + e.data.silver
                              : e.data.prop_name + "x" + e.data.prop_count) &&
                          (0, __imports.T)("【宝箱】获得" + t, "success"),
                          null != n && n.remove());
                      },
                    });
                  }));
              },
            )
          : (0, __imports.T)("宝箱验证初始化失败", "error");
      } else if ("领取失败" != t.data.msg && "验证码不正确" != t.data.msg) {
        let e = "";
        "" !=
          (e =
            "" == t.data.prop_id
              ? "鱼丸x" + t.data.silver
              : t.data.prop_name + "x" + t.data.prop_count) &&
          (0, __imports.T)("【宝箱】获得" + e, "success");
      } else (0, __imports.T)("【宝箱】领取失败", "error");
    },
  });
}
let bo = !1,
  vo = {},
  xo = {},
  wo = {},
  _o = 0,
  ko,
  Eo = !1;
function Bo() {
  var e = vo;
  __imports.localStorage.setItem("ExSave_Vote", JSON.stringify(e));
}
function Io() {
  for (var e in wo) {
    var e = wo[e],
      t = document.getElementsByClassName("vote__option-num")[e.index],
      o = document.getElementsByClassName("vote__progress-bar")[e.index],
      n = String(Number(100 * Number(e.num / _o)).toFixed(1)) + "%";
    ((t.innerText = e.num + `（${n}）`), (o.style.width = n));
  }
}
let To = [],
  Co = {},
  So = "",
  Mo = !1,
  No = 0;
async function Lo() {
  100 < Object.keys(Co).length && (Co = {});
  let t = "";
  var o = await new Promise((t, o) => {
    (0, __imports.GM_xmlhttpRequest)({
      method: "GET",
      url: "https://www.douyu.com/lapi/interact/lottery/getHallList",
      responseType: "json",
      onload: (e) => {
        e = e.response;
        t(e);
      },
      onerror: (e) => {
        o(e);
      },
    });
  });
  if (o.data.list) {
    for (let e = 0; e < o.data.list.length; e++) {
      var n,
        i,
        a,
        r = o.data.list[e];
      0 === r.status &&
        ((a =
          "command_content" in
          (i = (n = await ((e) =>
            new Promise((t, o) => {
              (0, __imports.fetch)(
                "https://www.douyu.com/member/lottery/activity_info?room_id=" +
                  e,
                {
                  method: "GET",
                  mode: "no-cors",
                  credentials: "include",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                },
              )
                .then((e) => e.json())
                .then((e) => {
                  t(e);
                })
                .catch((e) => {
                  o(e);
                });
            }))(r.room_id)).data.join_condition)
            ? "发送弹幕"
            : `赠送 ${i.gift_name}（${i.gift_price}）x` + i.gift_num),
        (l =
          Number(n.data.start_at) + Number(n.data.join_condition.expire_time)),
        (l = 1e3 * l),
        (s = new Date().getTime()),
        (c = d = void 0),
        (s =
          -1 ==
          (s =
            l < s
              ? -1
              : ((d = ""),
                (c = (s = (l = Math.abs(l - s)) % 864e5) % 36e5),
                (d =
                  (d =
                    (d += 0 < (l = Math.floor(l / 864e5)) ? l + "天" : "") +
                    (0 < (l = Math.floor(s / 36e5)) ? l + "时" : "")) +
                  (0 < (s = Math.floor(c / 6e4)) ? s + "分" : "")) +
                  (0 < (l = Math.round((c % 6e4) / 1e3)) ? l + "秒" : "")))
            ? "已结束"
            : "距结束：" + s),
        (d = -1 !== To.indexOf(String(r.room_id)) || i.lottery_range <= 1) &&
          Mo &&
          ((c = n.data.prize_name + "|" + n.data.start_at) in Co ||
            (Co[c] = 1)),
        (t += `

            <a class="lottery__a" href="https://www.douyu.com/${r.room_id}" target="_blank">

                <div class="lottery__item">

                    <div class="lottery__img">

                        <div class="lottery__anchor">${r.anchor_name}</div>

                        <img loading="lazy" src="${r.verticalSrc}"/>

                        <div class="lottery__expireTime">${s}</div>

                    </div>

                    <div class="lottery__info">

                        <div class="lottery__prize">${n.data.prize_name}x${n.data.prize_num}</div>

                        <div class="lottery__jointext">${a}</div>

                        <div style="color:${d ? "#64ce83" : "#e74c3c"}" class="lottery__condition">${((
                          e,
                        ) => {
                          let t = "";
                          switch (e.lottery_range) {
                            case 0:
                              t = "所有人可参与";
                              break;
                            case 1:
                              t = "关注主播";
                              break;
                            case 2:
                              t = "成为粉丝";
                              break;
                            case 3:
                              t = "关注主播+成为粉丝";
                          }
                          return t;
                        })(i)}</div>

                    </div>

                </div>

            </a>

        `));
    }
    var l,
      s,
      d,
      c,
      e = document.getElementsByClassName("lottery__nodata")[0],
      e =
        ("" !== t.trim()
          ? (e.style.display = "none")
          : (e.style.display = "block"),
        (So = t),
        document.getElementsByClassName("lottery__wrap")[0]);
    e && (e.innerHTML = So);
  }
}

}
