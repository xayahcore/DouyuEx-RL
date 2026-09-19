function* (__imports) {
yield {"Do": { get: () => Do, set: value => { Do = value; } },
"Ro": { get: () => Ro, set: value => { Ro = value; } },
"findMonthlySpendingControl": { get: () => findMonthlySpendingControl, set: value => { findMonthlySpendingControl = value; } },
"loadMonthlySpending": { get: () => loadMonthlySpending, set: value => { loadMonthlySpending = value; } },
"renderMonthlySpending": { get: () => renderMonthlySpending, set: value => { renderMonthlySpending = value; } }};
let Ao = "ExSave_MonthCost",
  Do = "ExSave_MonthCost_SeeStatus",
  jo = 0,
  Po = [],
  zo =
    '<svg t="1619141525444" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4635" width="16" height="16" style="/* display: inline-block; */"><path d="M1009.592 531.212C863.184 730.624 696.96 832 512 832c-184.96 0-351.184-101.376-497.592-300.788C10.384 525.864 8 519.212 8 512s2.384-13.864 6.408-19.212C160.816 293.376 327.04 192 512 192c184.96 0 351.184 101.376 497.592 300.788 4.024 5.348 6.408 12 6.408 19.212s-2.384 13.864-6.408 19.212zM512 768c156.864 0 300.54-84.332 432.012-256C812.54 340.332 668.864 256 512 256c-156.864 0-300.54 84.332-432.012 256C211.46 683.668 355.136 768 512 768z m0-64c-106.04 0-192-85.96-192-192s85.96-192 192-192 192 85.96 192 192-85.96 192-192 192z m0-64c70.692 0 128-57.308 128-128s-57.308-128-128-128-128 57.308-128 128 57.308 128 128 128z" p-id="4636" fill="#707070"></path></svg>',
  Oo =
    '<svg t="1619143157694" class="icon" viewBox="0 0 1186 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1733" width="16" height="16"><path d="M591.707784 915.740462A642.870487 642.870487 0 0 1 2.965954 526.459025a39.298888 39.298888 0 0 1 0-28.91805 632.489649 632.489649 0 0 1 584.292899-388.539948h8.897862a630.265183 630.265183 0 0 1 584.292899 388.539948 39.298888 39.298888 0 0 1 0 28.91805 637.680068 637.680068 0 0 1-336.635757 337.377245 646.577929 646.577929 0 0 1-252.106073 51.904192zM77.856287 512.370744a565.755688 565.755688 0 0 0 1026.961505 0 556.116338 556.116338 0 0 0-508.661077-329.220872h-8.897862a556.857827 556.857827 0 0 0-509.402566 329.220872z" p-id="1734" fill="#707070"></path><path d="M590.966296 732.592814a218.739093 218.739093 0 1 1 222.446535-218.739093 218.739093 218.739093 0 0 1-222.446535 218.739093z m0-362.587852a144.590248 144.590248 0 1 0 148.29769 143.848759 148.29769 148.29769 0 0 0-148.29769-143.848759z" p-id="1735" fill="#707070"></path><path d="M1137.443284 1023.997776a37.074423 37.074423 0 0 1-24.469119-8.897862L20.761677 65.253208A37.074423 37.074423 0 0 1 68.958426 8.900086l1092.212489 946.880752a37.074423 37.074423 0 0 1 0 52.64568 35.591446 35.591446 0 0 1-23.727631 15.571258z" p-id="1736" fill="#707070"></path></svg>',
  Ro = 0;
function Fo() {
  return document.getElementById("monthcost__money");
}
function findMonthlySpendingControl() {
  return document.getElementsByClassName("monthcost__icon")[0];
}
function renderMonthlySpending() {
  var e = findMonthlySpendingControl(),
    t = Fo();
  e &&
    t &&
    (1 === Ro
      ? (e.innerHTML = zo)
      : ((t.innerText = "***"), (e.innerHTML = Oo)),
    Wo());
}
function Vo(e) {
  return new Promise((t) => {
    (0, __imports.fetch)(e, { method: "GET", mode: "no-cors", credentials: "include" })
      .then((e) => e.json())
      .then((e) => {
        t(e);
      })
      .catch(() => {
        t({ error: -1, data: [] });
      });
  });
}
async function qo() {
  ((o = new Date()),
    (e = o.getMonth()),
    (t = o.getFullYear()),
    (t = new Date(t, e, 1)));
  var e,
    t,
    o,
    [n, i] = [
      Math.round(new Date(t).getTime() / 1e3).toString(),
      Math.round(o.getTime() / 1e3).toString(),
    ],
    [a, r] =
      ((e = new Date()),
      (t = e.getMonth()),
      (o = e.getFullYear()),
      (o = new Date(o, t, 1)),
      [
        (t = (e) =>
          e.getFullYear() +
          `-${(e.getMonth() + 1).toString().padStart(2, "0")}-` +
          e.getDate().toString().padStart(2, "0"))(o),
        t(e),
      ]);
  let l = [],
    s = !0,
    d = 0;
  for (; s;) {
    let e =
      `https://www.douyu.com/wjapi/nc/exchange/consume/giftList?queryType=0&consumeType=0&startDate=${n}&endDate=${i}&tradeStartDate=${a}&tradeEndDate=${r}&direction=` +
      1;
    0 !== d && (e += "&id=" + d);
    var c = await Vo(e);
    1e3 == c.error
      ? await new Promise((e) => (0, __imports.setTimeout)(e, 2e3))
      : ((c = (c && c.data) || []),
        (l = l.concat(c)),
        c.length < 20 ? (s = !1) : (d = c[c.length - 1].id));
  }
  var p,
    m,
    u = {};
  for (p of l) {
    var g = Math.abs(p.amount),
      h = ((jo += g), p.consumeTypeDesc || "其他");
    (u[h] || (u[h] = 0), (u[h] += g));
  }
  for (m in u) Po.push({ title: m, money: u[m] });
}
async function Uo() {
  ((jo = 0), (Po = []), await qo());
  {
    let e = 1;
    var n = [];
    let t = !0;
    for (var i = new Date(), a = i.getMonth(), r = i.getFullYear(); t;) {
      var l,
        s =
          (
            (
              (await Vo(
                "https://www.douyu.com/japi/interactnc/web/dFansbadge/myLogs?type=0&page=" +
                  e,
              )) || {}
            ).data || {}
          ).list || [];
      for (l of s) {
        var d = new Date(1e3 * l.consumeTime);
        d.getMonth() === a && d.getFullYear() === r && n.push(l);
      }
      if (!s[s.length - 1]) break;
      var c = new Date(1e3 * s[s.length - 1].consumeTime);
      s.length < 20 || c.getMonth() !== a || c.getFullYear() !== r
        ? (t = !1)
        : e++;
    }
    let o = 0;
    for (let e of n) o += Math.abs(e.consumeMoney);
    (0 < o && Po.push({ title: "钻粉充值/续费", money: o }), (jo += o));
  }
  await 0;
  {
    let e = { monthCost: jo, updateTime: new Date().getTime(), typeDetail: Po },
      t = __imports.localStorage.getItem(Ao);
    if (null !== t)
      try {
        t = JSON.parse(t);
      } catch (e) {
        t = {};
      }
    else t = {};
    ((t[__imports.I] = e), __imports.localStorage.setItem(Ao, JSON.stringify(t)));
  }
  Wo();
  i = Fo();
  i && (i.innerText = String(jo / 100));
}
function Wo() {
  var e = document.getElementsByClassName("month-cost")[0];
  if (e)
    if (1 === Ro && 0 < Po.length) {
      let t = "数据每日更新，根据个人中心消费数据统计。\n--- ---\n";
      (Po.forEach((e) => {
        t += `${e.title}: ${String(e.money / 100)} 元\n`;
      }),
        (e.title = t));
    } else e.title = "数据每日更新，根据个人中心消费数据统计。";
}
function loadMonthlySpending() {
  if (1 === Ro) {
    let e = 1;
    var t,
      o = new Date().getDate(),
      n = (() => {
        let t = __imports.localStorage.getItem(Ao);
        if (null !== t)
          try {
            t = JSON.parse(t);
          } catch (e) {
            t = {};
          }
        else t = {};
        return t;
      })();
    (__imports.I in n
      ? ((n = n[__imports.I]),
        (e = Math.abs(o - new Date(n.updateTime).getDate())),
        (o = n.monthCost),
        (n = n.typeDetail || []),
        (t = Fo()) && (t.innerText = String(o / 100)),
        (Po = n),
        Wo())
      : (t = Fo()) &&
        (t.innerHTML = '<span class="PlayerToolbar-dataLoadding"></span>'),
      1 <= e && Uo());
  }
}

}
