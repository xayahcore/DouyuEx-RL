function* (__imports) {
yield {"advanceRoomMusic": { get: () => advanceRoomMusic, set: value => { advanceRoomMusic = value; } },
"j": { get: () => j, set: value => { j = value; } },
"ln": { get: () => ln, set: value => { ln = value; } },
"pn": { get: () => pn, set: value => { pn = value; } },
"refreshRoomMusic": { get: () => refreshRoomMusic, set: value => { refreshRoomMusic = value; } },
"sn": { get: () => sn, set: value => { sn = value; } }};
let j = {
    view: "",
    showtime: 1428,
    danmu_person_count: "",
    gift_person_count: "",
    paid_person_count: "",
    isShow: 2,
    money_yc: 0,
    money_bag: 0,
    money_total: 0,
    noble_count: "",
  },
  ln = !1;
function sn(e) {
  var t = Number(e);
  return isNaN(t)
    ? e
    : 1e4 <= t
      ? ((e = t / 1e4),
        Number.isInteger(e) ? e + "万" : parseFloat(e.toFixed(1)) + "万")
      : String(t);
}
async function refreshRoomMusic() {
  null != document.querySelector(".MatchSystemChatRoomEntry") &&
    (document.querySelector(".MatchSystemChatRoomEntry").style.display =
      "none");
  e = __imports.B;
  var e,
    n,
    t = await new Promise((t, o) => {
      (0, __imports.GM_xmlhttpRequest)({
        method: "POST",
        url: "https://www.doseeing.com/xeee/room/aggr",
        headers: {
          Connection: "keep-alive",
          "Content-Type": "application/json;charset=UTF-8",
          Origin: "https://www.doseeing.com",
          Referer: "https://www.doseeing.com/room/" + e,
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/91.0.4472.114",
        },
        data: `{"m":"${window.btoa(`rid=${e}&dt=0`).split("").reverse().join("")}"}`,
        responseType: "json",
        onload: (e) => {
          t(e.response);
        },
        onerror: (e) => {
          o(e);
        },
      });
    }),
    o =
      ((n = __imports.B),
      await new Promise((t, o) => {
        (0, __imports.fetch)(
          "https://www.douyu.com/japi/interactnc/web/fsjk/getCardTaskInfo?rid=" +
            n,
          { method: "GET", mode: "no-cors", credentials: "include" },
        )
          .then((e) => e.json())
          .then((e) => {
            t(e);
          })
          .catch((e) => {
            o(e);
          });
      }));
  let i = 0;
  ((i =
    2 == j.isShow || 1428 == j.showtime
      ? 0
      : Math.floor(Date.now() / 1e3) - Number(j.showtime)),
    (j.view = t.data["active.uv"] || 0),
    (j.danmu_person_count = t.data["chat.uv"] || 0),
    (j.gift_person_count = t.data["gift.all.uv"] || 0),
    (j.paid_person_count = t.data["gift.paid.uv"] || 0),
    (j.money_yc = Number(t.data["gift.paid.price"] / 100 || 0).toFixed(2)),
    (j.money_total = Number(t.data["gift.all.price"] / 100 || 0).toFixed(2)),
    (document.getElementById("real-audience__total").innerText = j.view),
    (document.getElementById("real-audience__t").title =
      "今日累计活跃人数:" +
      j.view +
      " 弹幕人数:" +
      j.danmu_person_count +
      " 送礼人数:" +
      j.gift_person_count +
      " 付费人数:" +
      j.paid_person_count),
    (document.getElementById("real-audience__barrage").innerText =
      j.danmu_person_count),
    (document.getElementById("real-audience__money_yc").innerText = j.money_yc),
    (document.getElementById("real-audience__money").title =
      "总礼物价值:" + j.money_total + " 鱼翅礼物:" + j.money_yc),
    "" !== j.noble_count &&
      (document.getElementById("real-audience__noble").innerText = sn(
        j.noble_count,
      )),
    (document.getElementById("real-audience__time").innerText = "已播:" + (0, __imports.Q)(i)),
    (document.getElementById("real-audience__time").title =
      "开播时间:" +
      String(
        (0, __imports.k)("yyyy年MM月dd日hh时mm分ss秒 ", new Date(Number(j.showtime + "000"))),
      ) +
      "\n已观看:" +
      (0, __imports.Q)(o.data.todayWatch)),
    0 == o.error &&
      ((document.getElementById("real-audience__watchtime").innerText =
        "已观看:" + (0, __imports.Q)(o.data.todayWatch)),
      (document.getElementById("real-audience__watchtime").title =
        "开播时间:" +
        String(
          (0, __imports.k)(
            "yyyy年MM月dd日hh时mm分ss秒 ",
            new Date(Number(j.showtime + "000")),
          ),
        ) +
        "\n已观看:" +
        (0, __imports.Q)(o.data.todayWatch))));
}
function advanceRoomMusic() {
  var e = document.getElementById("real-audience__time"),
    t = document.getElementById("real-audience__watchtime");
  "none" == e.style.display
    ? ((e.style.display = "block"), (t.style.display = "none"))
    : ((e.style.display = "none"), (t.style.display = "block"));
}
function pn() {
  var e = {
    barrageFrame: {
      status:
        "none" ==
        document.getElementsByClassName("layout-Player-rank")[0].style.display,
    },
    video: { status: (0, __imports.fn)() },
    barrage: { status: 1 == __imports.mn },
  };
  __imports.localStorage.setItem("ExSave_Refresh", JSON.stringify(e));
}

}
