function* (__imports) {
yield {"mountRoomPlayerBindings": { get: () => mountRoomPlayerBindings, set: value => { mountRoomPlayerBindings = value; } }};
// Phase-local construction values; only declared outputs cross phase boundaries.
function mountRoomPlayerBindings(owner) {
let elementOrValue, containerOrValue;
const roomId = __imports.B;
(elementOrValue = document.createElement("div"));
(elementOrValue.className = "fans-continue");
(elementOrValue.innerHTML =
      '<a class="ex-panel__icon" title="一键续牌"><img style="width: 32px;height: 32px;" src="https://gfs-op.douyucdn.cn/dygift/1705/7db9beee246848252f1c7fe916259f4e.png"/><i id="fans-continue__tip" class="ex-panel__tip"></i></a>');
(containerOrValue = document.getElementsByClassName("ex-panel__wrap")[0]);
(containerOrValue && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]));
((0, __imports.safeBind)(".fans-continue", "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      (0, __imports.triggerFansContinue)();
    }, owner));
(elementOrValue = document.createElement("div"));
(elementOrValue.className = "ex-sign");
(elementOrValue.innerHTML =
      '<a class="ex-panel__icon" title="一键签到(房间/鱼吧/客户端/星推日常)"><svg style="display: block;" t="1578566545259" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12959" width="32" height="32"><path d="M698.368 80.896v114.688c0 23.552 19.968 43.008 44.032 43.008s44.032-19.456 44.032-43.008V80.896c0-23.552-19.968-43.008-44.032-43.008s-44.032 18.944-44.032 43.008zM227.328 80.896v114.688c0 23.552 19.968 43.008 44.032 43.008 24.576 0 44.032-19.456 44.032-43.008V80.896c0-23.552-19.968-43.008-44.032-43.008-24.576 0-44.032 18.944-44.032 43.008z" fill="#F96C5D" p-id="12960"></path><path d="M977.92 195.584c0-23.552-19.968-43.008-44.032-43.008h-88.576v43.008c0 55.296-46.08 100.352-102.912 100.352s-102.912-45.056-102.912-100.352v-43.008H374.272v43.008c0 55.296-46.08 100.352-102.912 100.352-56.832 0-102.912-45.056-102.912-100.352v-43.008H79.872c-24.576 0-44.032 19.456-44.032 43.008v611.328l252.928-145.92-8.192-8.192c-10.24-9.728-16.384-23.552-16.384-38.4 0-29.696 25.088-54.272 55.808-54.272 15.36 0 29.184 6.144 39.424 15.872l28.16 27.648L977.92 263.168V195.584z" fill="#F96C5D" p-id="12961"></path><path d="M329.216 278.528c-5.632 3.584-11.264 6.656-17.408 9.216 5.632-2.56 11.776-5.632 17.408-9.216zM344.064 266.24c4.608-4.608 8.704-9.728 12.8-14.848-3.584 5.632-8.192 10.24-12.8 14.848zM329.216 278.528c5.632-3.584 10.752-7.68 15.36-12.288-5.12 4.608-10.24 8.704-15.36 12.288zM449.536 664.064l220.16-214.016c10.24-9.728 24.064-15.872 39.424-15.872 30.72 0 55.808 24.064 55.808 54.272 0 14.848-6.144 28.672-16.384 38.4l-259.072 252.416c-10.24 9.728-24.064 15.872-39.424 15.872s-29.184-6.144-39.424-15.872l-121.344-118.272L35.84 806.912v104.96c0 23.552 19.968 43.008 44.032 43.008h854.016c24.576 0 44.032-19.456 44.032-43.008V263.168L387.584 603.648l61.952 60.416zM350.72 569.856c-4.608-3.072-9.216-5.12-14.336-6.656 5.12 1.024 10.24 3.584 14.336 6.656zM271.36 295.936c14.336 0 27.648-2.56 39.936-7.68-12.288 4.608-25.6 7.68-39.936 7.68z" fill="#F15A4A" p-id="12962"></path></svg><i id="ex-sign__tip" class="ex-panel__tip"></i></a>');
(containerOrValue = document.getElementsByClassName("ex-panel__wrap")[0]);
(containerOrValue && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]));
((_sEl = document.getElementsByClassName("ex-sign")[0]) &&
      ((elementOrValue = new __imports.PointerGestureBinding(_sEl, owner)),
      elementOrValue.click(() => {
        (0, __imports.Wn)(!1);
      }),
      elementOrValue.longClick(() => {
        (0, __imports.Wn)(!0);
      })));
(0, __imports.mountBarrageSettings)(owner);
containerOrValue = !!document.getElementsByClassName("live-next-body")[0];
if (!containerOrValue) {
    containerOrValue = document.createElement("div");
    ((containerOrValue.style = "position: absolute;right: -14px;top: 32px;cursor: pointer;"),
      (containerOrValue.id = "ex-accountList-icon"),
      (containerOrValue.innerHTML =
        __imports.oe +
        `

        <div id="ex-accountList-wrap" class="public-DropMenu-drop">

            <div class="public-DropMenu-drop-main">

                <div id="ex-accountList-iframe"></div>

                <div id="ex-accountList-iframe2"></div>

                <div id="ex-accountList-content" style="width: 300px;font-size: 14px;padding: 10px;">

                </div>

            </div>

            <i></i>

        </div>

    `),
      (_hr = document.getElementsByClassName("Header-right")[0]) &&
        _hr.appendChild(containerOrValue));
    {
      let e = JSON.parse((0, __imports.GM_getValue)("Ex_accountList") || "{}"),
        a = {},
        r = "";
      (0, __imports.GM_cookie)("list", { path: "/" }, function (t) {
        var o = [];
        if (null == t)
          (0, __imports.safeEl)("ex-accountList-content").innerHTML =
            "请升级Tampermonkey版本<br/><a href='https://www.crx4chrome.com/crx/1429/'>点我升级，选择Crx4Chrome</a>";
        else {
          for (let e = 0; e < t.length; e++) {
            var n = t[e].name,
              i = t[e].value;
            ("acf_nickname" == n && (a.nickname = i),
              "acf_uid" == n && ((a.uid = i), (r = i)),
              "acf_avatar" == n && (a.avatar = i),
              o.push(t[e]));
          }
          ("" == r && ((a.uid = "null"), (r = "null")),
            (a.data = o),
            (a.update_time = String(new Date().getTime())),
            (e[r] = a),
            (0, __imports.GM_setValue)("Ex_accountList", JSON.stringify(e)),
            (0, __imports.ie)(e));
        }
      });
    }
    ((0, __imports.re)("null", __imports.I),
      owner.listen(__imports.unsafeWindow, "message", (e) => {
        switch (e.data) {
          case "cleanOver":
            owner.timeout(() => {
              window.location.reload();
            }, 50);
            break;
          case "msgCleanOver":
          case "yubaCleanOver":
          case "videoCleanOver":
          case "czCleanOver":
          case "switchOver":
            5 <= ++__imports.ne &&
              ((__imports.ne = 0),
              owner.timeout(() => {
                window.location.reload();
              }, 50));
            break;
          case "deleteOver":
            ((0, __imports.ie)(), (0, __imports.T)("【账号管理】删除完毕", "success"));
        }
      }));
  }
((0, __imports.safeBind)(".ChatSend-txt", "keydown", (e) => {
    var t = e.target,
      o = "TEXTAREA" === t.tagName;
    38 == e.keyCode
      ? 0 == (0, __imports.$)(t) && ((__imports.C = 0 < __imports.C ? __imports.C - 1 : __imports.C), (0, __imports.ze)())
      : 40 == e.keyCode
        ? ((o = (o ? t.value : t.innerText).length),
          (0, __imports.$)(t) == o && ((__imports.C = __imports.C < __imports.De.length - 1 ? __imports.C + 1 : __imports.C), (0, __imports.ze)()))
        : 13 == e.keyCode && (0, __imports.Pe)((0, __imports.Oe)());
  }, owner));
((0, __imports.safeBind)(".ChatSend-button", "click", () => {
      (0, __imports.Pe)((0, __imports.Oe)());
    }, owner));
(elementOrValue = document.createElement("span"));
(elementOrValue.className = "month-cost");
(elementOrValue.innerHTML = `

	本月消费 <span id="monthcost__money">***</span> 元

	<span class="monthcost__icon"></span>

	`);
(elementOrValue.title = "数据每日更新，根据个人中心消费数据统计");
(containerOrValue = (0, __imports.E)(["#js-backpack-enter"]));
((containerOrValue = containerOrValue && containerOrValue.parentElement) && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]));
(elementOrValue = (0, __imports.findMonthlySpendingControl)());
if (elementOrValue)
    owner.listen(elementOrValue, "click", () => {
      ((__imports.Ro = 1 === __imports.Ro ? 0 : 1),
        __imports.localStorage.setItem(__imports.Do, String(__imports.Ro)),
        (0, __imports.renderMonthlySpending)(),
        1 === __imports.Ro && (0, __imports.loadMonthlySpending)());
    });
__imports.Ro = (() => {
    var e = __imports.localStorage.getItem(__imports.Do);
    return null != e && 1 === Number(e) ? 1 : 0;
  })();
(0, __imports.renderMonthlySpending)();
1 === __imports.Ro && (0, __imports.loadMonthlySpending)();
(0, __imports.fetch)("https://www.douyu.com/member/platform_task/effect_list", {
    method: "GET",
    mode: "no-cors",
    cache: "default",
    credentials: "include",
  })
    .then(owner.guard(async (response) => {
      let e = await response.text();
      if (owner.disposed || __imports.B !== roomId) return;
      e = (e = new DOMParser().parseFromString(
        e,
        "text/html",
      )).getElementsByClassName("enter-wraper is-effect");
      if (e && 0 != e.length) {
        var t,
          o,
          n = e[0].getElementsByClassName("show-effect-more");
        if (n)
          if (0 != n.length)
            for (let e = 0; e < n.length; e++) {
              var i = JSON.parse(n[e].getAttribute("data-detail"));
              "1646" === String(i.property_id) &&
                String(i.show_id_list) === String(__imports.B) &&
                ((i = 1e3 * i.expire_time),
                (i = Math.floor((i - Date.now()) / 864e5)) <= __imports.En) &&
                ((o = t = void 0),
                ((t = document.createElement("span")).className = "room-vip"),
                (t.innerHTML = `

	距VIP到期 <span id="room-vip-expire-days">**</span> 天

	`),
                (o = (o = (0, __imports.E)(["#js-backpack-enter"])) && o.parentElement) &&
                  o.insertBefore(t, o.childNodes[0]),
                ((0, __imports.safeEl)("room-vip-expire-days").innerText = i),
                ((node) => owner.own(() => node.remove()))(t));
            }
      }
    }))
    .catch((e) => {
      console.log("请求失败!", e);
    });
(0, __imports.mountDanmakuSearch)(owner);
(0, __imports.Qr)((e, t) =>
    -1 !== e.indexOf("group/getBindGroup")
      ? t.replace('"group_status":4', '"group_status":0')
      : t,
  );
{
    let e = 0,
      t = owner.interval(() => {
        if (100 < ++e) (0, __imports.clearInterval)(t);
        else if (null != document.getElementsByClassName("ChatSend-txt")[0]) {
          {
            let e;
            (null !=
              (e = document.getElementsByClassName("ChatSend-button")[0]) &&
              (e.className = "ChatSend-button"),
              null !=
                (e = document.getElementsByClassName("ChatSend-txt")[0]) &&
                (e.maxLength = e.maxLength + 20));
          }
          (0, __imports.clearInterval)(t);
        }
      }, 1e3);
  }
(async () => {
    if (await (0, __imports.refreshFansMedalCache)(owner) === false) return;
    if (owner.disposed) return;
    (new __imports.DomMutationSubscription(".FansMedalPanel-enter", !1, async (e) => {
        var t,
          o,
          n = document.querySelector(".FansMedalInfo-head");
        if (!n) return;
        t = new Date().getDate();
        if (new Date(__imports.Re.t).getDate() < t && await (0, __imports.refreshFansMedalCache)(owner) === false) return;
        if (owner.disposed || __imports.B !== roomId || !n.isConnected ||
            document.querySelector(".FansMedalInfo-head") !== n) return;
        (0 !== (t = __imports.Re.list).length) &&
          (((o = document.createElement("div")).innerHTML = `

      <div style="display: flex; align-items: center;gap: 8px;margin-top: 4px;">

        ${t
          .map(
            (e) => `

          <div style="display: flex; align-items: center;">

            <img style="width: 20px; height: 20px;margin-right: 4px;" src="${e.webIcon}" alt="${e.name}">

            <span style="font-size: 12px;">${e.name}</span>

          </div>

        `,
          )
          .join("")}

      </div>

    `),
          n.appendChild(o),
          owner.own(() => o.remove()));
      }, owner));
  })();
(0, __imports.mountLastLiveOverlay)(owner);
{
    let t = owner.interval(() => {
      var e = document.querySelector(".volume-07c230");
      let n = document.getElementById("__video2");
      e &&
        n &&
        ((0, __imports.clearInterval)(t),
        owner.listen(
          e, "wheel",
          function (e) {
            (e.preventDefault(), e.stopPropagation());
            var t = n.volume,
              o = e.deltaY < 0 ? Math.min(t + 0.05, 1) : Math.max(t - 0.05, 0),
              e = document.getElementById("__video2");
            if (e) {
              ((e.muted = 0 === o), (e.volume = o));
              try {
                [
                  "volume_muted_before_key",
                  "player_storage_volume_h5p_room",
                ].forEach((e) => {
                  var t = __imports.localStorage.getItem(e);
                  t &&
                    (((t = JSON.parse(t)).v = o),
                    __imports.localStorage.setItem(e, JSON.stringify(t)));
                });
              } catch (e) {}
            }
          },
          { passive: !1, capture: !0 },
        ),
        owner.listen(n, "volumechange", () => {
          (0, __imports.setDanmakuVolume)(n.volume);
        }),
        (0, __imports.setDanmakuVolume)(n.volume));
    }, 500);
  }
}

}
