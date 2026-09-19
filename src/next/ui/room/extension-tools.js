function* (__imports) {
yield {"mountExtensionToolsPanel": { get: () => mountExtensionToolsPanel, set: value => { mountExtensionToolsPanel = value; } }};
// Phase-local construction values; only declared outputs cross phase boundaries.
function mountExtensionToolsPanel(owner) {
let containerOrValue, elementOrValue;
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "extool");
(containerOrValue.innerHTML = '<div class="extool__close" title="关闭">×</div>');
(elementOrValue =
      document.getElementsByClassName("layout-Player-chat")[0] ||
      document.body);
(elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "extool-icon");
(containerOrValue.innerHTML =
      '<a class="ex-panel__icon" title="扩展功能"><svg t="1590294700144" style="display:block;" class="icon" viewBox="0 0 1077 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="11915" width="30" height="30"><path d="M152.770257 11.469971l213.048618 206.378138-37.094375 36.931681 159.440737 158.545917-76.95456 73.782015-159.440737-158.545917-38.47728 36.931681L0.244042 159.115348 152.770257 11.469971z" p-id="11916" fill="#d81e06"></path><path d="M1077.851922 217.848109h-105.751509L929.393073 260.311408l-31.644106 31.400063-33.02701 32.538926L776.866857 300.985065l-23.428026-87.204321 33.027009-32.538926 33.02701-32.538926L862.281538 105.751509V0.569431h-8.134732a244.041945 244.041945 0 0 0-178.964092 68.331745 234.768351 234.768351 0 0 0-68.738481 147.645376 250.712425 250.712425 0 0 0 10.981887 95.664443v2.765808a34.165872 34.165872 0 0 1-9.598983 36.931681c-17.896409 16.269463-525.096918 497.520178-525.096918 497.520178-42.625993 35.548777-38.47728 102.497617 0 142.113759 39.860184 38.233238 105.751509 40.673657 142.927233 0 0 0 478.322212-504.353352 498.984429-524.852875A33.677788 33.677788 0 0 1 754.821735 455.544963c5.531617 1.382904 10.981888 4.067366 16.269463 5.450271a242.170956 242.170956 0 0 0 87.936447 9.598983 237.290118 237.290118 0 0 0 148.45885-68.331745 231.677153 231.677153 0 0 0 68.738481-177.662536 14.805211 14.805211 0 0 0 1.626946-6.751827zM178.964093 943.628853a33.352399 33.352399 0 0 1-48.076263 0 32.538926 32.538926 0 0 1 0-47.832221 33.352399 33.352399 0 0 1 48.076263 0 35.467429 35.467429 0 0 1 0 47.832221z" p-id="11917" fill="#d81e06"></path><path d="M981.618049 785.082936L747.988561 567.804258S617.344773 601.97013 526.642517 753.682873c5.531617 1.382904 241.926915 239.161106 241.926914 239.161105a109.98157 109.98157 0 0 0 152.607563 0l60.441055-58.732761a102.823006 102.823006 0 0 0 0-149.028281zM854.146806 951.763584a29.366381 29.366381 0 0 1-38.477279 0l-195.233556-189.94598-1.382905-1.382904a25.543057 25.543057 0 0 1 1.382905-35.548777 29.366381 29.366381 0 0 1 38.47728 0l196.535113 189.94598A28.796949 28.796949 0 0 1 854.146806 951.763584z m86.634891-83.380997a29.366381 29.366381 0 0 1-38.47728 0L705.362568 678.436606l-1.382905-1.382904a25.543057 25.543057 0 0 1 1.382905-35.548777 29.366381 29.366381 0 0 1 38.477279 0l196.535113 189.945981a24.404194 24.404194 0 0 1 0 37.013028z" p-id="11918" fill="#d81e06"></path></svg><i id="extool__tip" class="ex-panel__tip"></i></a>');
(elementOrValue = document.getElementsByClassName("ex-panel__wrap")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
((0, __imports.safeBind)(".extool-icon", "click", function () {
      (0, __imports.openFeaturePanel)("扩展功能");
    }, owner));
(containerOrValue = document.getElementsByClassName("extool__close")[0]);
(containerOrValue &&
      owner.listen(containerOrValue, "click", (e) => {
        e.stopPropagation();
        e = document.getElementsByClassName("extool")[0];
        e && (e.style.display = "none");
      }));
(elementOrValue = "");
(elementOrValue +=
      '<label><input style="margin-top:5px" id="extool__treasure_start" type="checkbox">半自动抢宝箱</label>');
((elementOrValue = document.createElement("div")).className = "extool__treasure");
(elementOrValue.innerHTML =
      '<label><input style="margin-top:5px" id="extool__treasure_start" type="checkbox">半自动抢宝箱</label><label style="margin-left:10px;">延迟(抢得过快请调高)：</label><input id="extool__treasure_delay" type="text" style="width:50px;text-align:center;" value="3200" />ms<div class="extool__hint">说明：遇到验证码会自动弹出验证框，需要手动完成后才能领取。</div>');
(containerOrValue = document.getElementsByClassName("extool")[0]);
(containerOrValue && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]));
((0, __imports.safeBind)("#extool__treasure_start", "click", function () {
      (1 == document.getElementById("extool__treasure_start").checked
        ? ((__imports.St = !0),
          __imports.unsafeWindow.socketProxy.socketStream.subscribe("tslist", (i) => {
            if (null != i)
              for (let n = 0; n < i.list.length - 1; n++) {
                var a = i.list[n];
                let e = a.rpid;
                a = a.ot;
                let t = (0, __imports.x)("dy_did");
                var a = Number(a) - Math.floor(Date.now() / 1e3),
                  r = document.createElement("div");
                let o = "Ex_Geetest_no" + String(__imports.fo);
                ((r.id = o),
                  document.getElementById("Ex_Geetest").appendChild(r),
                  0 <= a
                    ? ((a = 1e3 * a + (0, __imports.Mt)()),
                      __imports.fo++,
                      owner.timeout(() => {
                        (0, __imports.yo)(__imports.B, e, t, o);
                      }, a))
                    : (0, __imports.yo)(__imports.B, e, t, o));
              }
          }))
        : (__imports.St = !1),
        (__imports.St = document.getElementById("extool__treasure_start").checked),
        (e = (0, __imports.safeEl)("extool__treasure_delay").value),
        (e = { isGetTreasure: __imports.St, treasureDelay: e }),
        __imports.localStorage.setItem("ExSave_Treasure", JSON.stringify(e)));
    }, owner));
null != (elementOrValue = __imports.localStorage.getItem("ExSave_Treasure")) &&
    ("treasureDelay" in (elementOrValue = JSON.parse(elementOrValue)) == 1
      ? ((0, __imports.safeEl)("extool__treasure_delay").value = elementOrValue.treasureDelay)
      : ((0, __imports.safeEl)("extool__treasure_delay").value = "3200"),
    1 == elementOrValue.isGetTreasure) &&
    document.getElementById("extool__treasure_start").click();
elementOrValue = document.createElement("div");
elementOrValue.className = "extool__redpacket_room";
elementOrValue.innerHTML =
    '<label><input id="extool__redpacekt_room_start" type="checkbox">自动抢礼物红包</label>';
containerOrValue = document.getElementsByClassName("extool")[0];
if (containerOrValue) containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]);
((0, __imports.safeBind)("#extool__redpacekt_room_start", "click", function () {
    (1 == document.getElementById("extool__redpacekt_room_start").checked
      ? (__imports.Et = owner.interval(() => {
          (0, __imports.fetch)(
            "https://www.douyu.com/japi/interactnc/web/propredpacket/getPrpList?type_id=1&room_id=" +
              __imports.B,
            {
              method: "GET",
              mode: "no-cors",
              credentials: "include",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            },
          )
            .then(owner.guard((e) => e.json()))
            .then(owner.guard((o) => {
              if (0 < o.data.list.length)
                for (let t = 0; t < o.data.list.length; t++) {
                  let e = o.data.list[t].activityid;
                  var n = __imports.kt.indexOf(e),
                    i = o.data.list[t].startTime,
                    i =
                      1e3 *
                        (Number(i) - Math.round(new Date().getTime() / 1e3)) -
                      2e3;
                  -1 == n &&
                    (__imports.kt.push(o.data.list[t].activityid),
                    0 < i
                      ? owner.timeout(() => {
                          ((0, __imports.Bt)(e),
                            (0, __imports.Bt)(e),
                            (0, __imports.Bt)(e),
                            (0, __imports.T)("【礼物红包】抢红包执行完毕！", "success"));
                        }, i)
                      : ((0, __imports.Bt)(e),
                        (0, __imports.Bt)(e),
                        (0, __imports.Bt)(e),
                        (0, __imports.T)("【礼物红包】抢红包执行完毕！", "success")));
                }
            }))
            .catch((e) => {
              console.log("请求失败!", e);
            });
        }, 6e4))
      : (0, __imports.clearInterval)(__imports.Et),
      (e = {
        isGetRedPacket: (e = document.getElementById(
          "extool__redpacekt_room_start",
        ).checked),
      }),
      __imports.localStorage.setItem("ExSave_RedPacket_Room", JSON.stringify(e)));
  }, owner));
(elementOrValue = __imports.localStorage.getItem("ExSave_RedPacket_Room"));
(null != elementOrValue &&
      1 == JSON.parse(elementOrValue).isGetRedPacket &&
      document.getElementById("extool__redpacekt_room_start").click());
(containerOrValue = "");
(containerOrValue +=
      '<label><input id="extool__autofish_start" type="checkbox">自动钓鱼</label><br>');
((containerOrValue = document.createElement("div")).className = "extool__autofish");
(containerOrValue.innerHTML =
      '<label><input id="extool__autofish_start" type="checkbox">自动钓鱼</label><br><label><input name="autofish_mode" type="radio" value="all" checked>全天</label><label style="margin-left:5px;"><input name="autofish_mode" type="radio" value="contest">钓鱼大赛</label>');
(elementOrValue = document.getElementsByClassName("extool")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
(document.querySelectorAll('input[name="autofish_mode"]').forEach((e) => {
      owner.listen(e, "change", __imports.dt);
    }));
((0, __imports.safeBind)("#extool__autofish_start", "click", async () => {
      (0, __imports.dt)();
      var e,
        t = (0, __imports.safeEl)("extool__autofish_start").checked;
      if (((0, __imports.st)(t), t))
        return (
          (0, __imports.T)("【自动钓鱼】开始自动钓鱼", "info"),
          (__imports.tt = await new Promise((t) => {
            (0, __imports.fetch)(
              `https://www.douyu.com/japi/revenuenc/web/actfans/achieve/accList?rid=${__imports.B}&type=1&period=1`,
              {
                method: "GET",
                mode: "no-cors",
                cache: "default",
                credentials: "include",
              },
            )
              .then(owner.guard((e) => e.json()))
              .then(owner.guard((e) => {
                e.data ? t(e.data.accList) : t([]);
              }))
              .catch((e) => {
                console.log("请求失败!", e);
              });
          })),
          (t = await (0, __imports.ct)()).data
            ? (e = t.data.baits.find((e) => e.inUse))
              ? ((__imports.ot = e.id),
                t.data.myCh
                  ? ((0, __imports.dt)(),
                    0 == t.data.fishing.stat && ((__imports.it = !1), (__imports.nt = 0)),
                    1 == t.data.fishing.stat &&
                      ((__imports.it = !0), (__imports.nt = t.data.fishing.fishEtMs)),
                    2 == t.data.fishing.stat && (await (0, __imports.rt)(), await (0, __imports.b)(1e3)),
                    void (__imports.at = owner.interval(async () => {
                      var e;
                      (() => {
                        var e,
                          t = (t = document.querySelector(
                            'input[name="autofish_mode"]:checked',
                          ))
                            ? t.value
                            : "all";
                        return (
                          "all" === t ||
                          ((e = (t = new Date()).getHours()),
                          (t = t.getMinutes()),
                          12 <= e && t < 30) ||
                          (0 === e && t < 30)
                        );
                      })() &&
                        (__imports.it
                          ? new Date().getTime() <= __imports.nt || (await (0, __imports.rt)())
                          : 0 !==
                              (e = await new Promise((t) => {
                                (0, __imports.fetch)(
                                  "https://www.douyu.com/japi/revenuenc/web/actfans/fishing/fishing",
                                  {
                                    method: "POST",
                                    mode: "no-cors",
                                    credentials: "include",
                                    headers: {
                                      "Content-Type":
                                        "application/x-www-form-urlencoded",
                                    },
                                    body: `ctn=${(0, __imports.w)()}&rid=${__imports.B}&baitId=${__imports.ot}&ver=1.1`,
                                  },
                                )
                                  .then(owner.guard((e) => e.json()))
                                  .then(owner.guard((e) => {
                                    t(e);
                                  }))
                                  .catch((e) => {
                                    console.log("请求失败!", e);
                                  });
                              })).error
                            ? ((0, __imports.T)("【自动钓鱼】" + e.msg, "error"),
                              console.log(e, "钓鱼失败"),
                              1001007 == e.error && (await (0, __imports.rt)()),
                              1005003 == e.error && (0, __imports.clearInterval)(__imports.at))
                            : ((__imports.it = !0), (__imports.nt = e.data.fishing.fishEtMs)));
                    }, 1500)))
                  : ((0, __imports.st)(((0, __imports.safeEl)("extool__autofish_start").checked = !1)),
                    (0, __imports.T)("【自动钓鱼】请设置形象", "error")))
              : ((0, __imports.st)(((0, __imports.safeEl)("extool__autofish_start").checked = !1)),
                (0, __imports.T)("【自动钓鱼】请设置鱼饵", "error"))
            : ((0, __imports.st)(((0, __imports.safeEl)("extool__autofish_start").checked = !1)),
              (0, __imports.T)("【自动钓鱼】未能获取活动信息", "error"))
        );
      (0, __imports.clearInterval)(__imports.at);
    }, owner));
(containerOrValue = (0, __imports.lt)());
(containerOrValue.rids.includes(__imports.B) &&
      ((containerOrValue = containerOrValue.modes && containerOrValue.modes[__imports.B] ? containerOrValue.modes[__imports.B] : "all"),
      (document.querySelector(
        `input[name="autofish_mode"][value="${containerOrValue}"]`,
      ).checked = !0),
      document.getElementById("extool__autofish_start").click()));
((function () {
      var _extool = document.getElementsByClassName("extool")[0];
      if (!_extool) return;

      var clearbagCard = document.createElement("div");
      clearbagCard.className = "fans-panel__card extool__clearbag";
      clearbagCard.innerHTML = `
        <div class="fans-panel__card-header">
            <span class="fans-panel__card-title">背包送礼</span>
            <span style="font-size: 11px; color: #94a3b8;">[速度适中, 间隔>0.1s]</span>
        </div>
        <div class="ex-gift-pick-trigger" id="extool__clearbag_trigger" title="点击展开5级菜单选择背包礼物">
            <img class="ex-gift-pick-trigger__icon" id="extool__clearbag_icon" src="https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif" />
            <span class="ex-gift-pick-trigger__name" id="extool__clearbag_name">粉丝荧光棒</span>
            <span class="ex-gift-pick-trigger__tag" id="extool__clearbag_tag">点击选择</span>
            <span class="ex-gift-pick-trigger__arrow">▼</span>
            <input id="extool__clearbag_id" type="hidden" value="268" />
        </div>
        <div class="ex-gift-row">
            <label class="ex-gift-label">数量：<input id="extool__clearbag_cnt" type="number" min="1" class="ex-num-input" style="width: 55px;" value="1" /></label>
            <button type="button" id="extool__clearbag_sendbtn" class="ex-btn-primary" style="padding: 4px 16px; font-size: 12px;">送出</button>
        </div>
    `;
      _extool.insertBefore(clearbagCard, _extool.childNodes[0]);

      (0, __imports.safeBind)("#extool__clearbag_trigger", "click", function () {
        (0, __imports.openGiftPicker)("backpack", function (selectedGift) {
          var idEl = document.getElementById("extool__clearbag_id");
          var nameEl = document.getElementById("extool__clearbag_name");
          var tagEl = document.getElementById("extool__clearbag_tag");
          var iconEl = document.getElementById("extool__clearbag_icon");
          if (idEl) idEl.value = selectedGift.id;
          if (nameEl) nameEl.innerText = selectedGift.name;
          if (tagEl) tagEl.innerText = selectedGift.priceText || "已选";
          if (iconEl && selectedGift.icon) iconEl.src = selectedGift.icon;
          (0, __imports.T)("已选择背包礼物：" + selectedGift.name, "success");
        });
      }, owner);

      (0, __imports.safeBind)("#extool__clearbag_sendbtn", "click", async function () {
        var giftId = document.getElementById("extool__clearbag_id").value;
        var cnt =
          Number(document.getElementById("extool__clearbag_cnt").value) || 1;
        if (!giftId) return (0, __imports.T)("请先点击上方选择要送出的礼物", "warning");
        if (confirm("确认送出 " + cnt + " 个背包礼物？")) {
          (0, __imports.T)("【背包送礼】执行中...", "info");
          for (var e = 0; e < cnt; e++) {
            await (0, __imports.b)(100).then(owner.guard(() => {
              (0, __imports.Ut)(giftId, 1, __imports.B)
                .then(owner.guard((res) => {
                  if ("success" != res.msg) {
                    (0, __imports.T)("【背包送礼】" + __imports.B + " 赠送失败 " + res.msg, "error");
                    console.log(__imports.B, res);
                  }
                }))
                .catch((err) => {
                  (0, __imports.T)("【背包送礼】" + __imports.B + " 赠送失败", "error");
                  console.log(__imports.B, err);
                });
            }));
          }
          (0, __imports.T)("【背包送礼】执行完毕！", "success");
        }
      }, owner);

      // 2. 打榜送礼四级卡片
      var sendgiftCard = document.createElement("div");
      sendgiftCard.className = "fans-panel__card extool__sendgift";
      sendgiftCard.innerHTML = `
        <div class="fans-panel__card-header">
            <span class="fans-panel__card-title">打榜送礼</span>
            <span style="font-size: 11px; color: #94a3b8;">[批量打榜, 任意礼物]</span>
        </div>
        <div class="ex-gift-pick-trigger" id="extool__sendgift_trigger" title="点击展开5级菜单选择房间礼物">
            <img class="ex-gift-pick-trigger__icon" id="extool__sendgift_icon" src="https://gfs-op.douyucdn.cn/dygift/2018/11/27/3adbb0c17d9886c1440d55c9711f4c79.gif" />
            <span class="ex-gift-pick-trigger__name" id="extool__sendgift_name">超级火箭</span>
            <span class="ex-gift-pick-trigger__tag" id="extool__sendgift_tag">2000 鱼翅</span>
            <span class="ex-gift-pick-trigger__arrow">▼</span>
            <input id="extool__sendgift_id" type="hidden" value="20005" />
        </div>
        <div class="ex-gift-row">
            <label class="ex-gift-label">数量：<input id="extool__sendgift_cnt" type="number" min="1" class="ex-num-input" style="width: 50px;" value="1" /></label>
            <label class="ex-gift-label">间隔：<input id="extool__sendgift_delay" type="number" min="0" class="ex-num-input" style="width: 50px;" value="0" /> ms</label>
            <button type="button" id="extool__sendgift_btn" class="ex-btn-primary" style="padding: 4px 16px; font-size: 12px;">送出</button>
        </div>
    `;
      _extool.insertBefore(sendgiftCard, _extool.childNodes[0]);

      (0, __imports.safeBind)("#extool__sendgift_trigger", "click", function () {
        (0, __imports.openGiftPicker)("room", function (selectedGift) {
          var idEl = document.getElementById("extool__sendgift_id");
          var nameEl = document.getElementById("extool__sendgift_name");
          var tagEl = document.getElementById("extool__sendgift_tag");
          var iconEl = document.getElementById("extool__sendgift_icon");
          if (idEl) idEl.value = selectedGift.id;
          if (nameEl) nameEl.innerText = selectedGift.name;
          if (tagEl) tagEl.innerText = selectedGift.priceText || "已选";
          if (iconEl && selectedGift.icon) iconEl.src = selectedGift.icon;
          (0, __imports.T)("已选择送礼礼物：" + selectedGift.name, "success");
        });
      }, owner);

      (0, __imports.safeBind)("#extool__sendgift_btn", "click", async () => {
        var giftId = document.getElementById("extool__sendgift_id").value;
        var cnt =
          Number(document.getElementById("extool__sendgift_cnt").value) || 1;
        var delay =
          Number(document.getElementById("extool__sendgift_delay").value) || 0;
        if (!giftId) return (0, __imports.T)("请先点击上方选择要送出的礼物", "warning");
        if (confirm("确认送出 " + cnt + " 个礼物？")) {
          (0, __imports.T)("【送礼】执行中...", "info");
          var sucCount = 0,
            totalCost = 0;
          for (var t = 0; t < cnt; t++) {
            (0, __imports.fetch)("https://www.douyu.com/japi/gift/donate/mainsite/v1", {
              method: "POST",
              mode: "no-cors",
              credentials: "include",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body:
                "giftId=" +
                giftId +
                "&giftCount=1&roomId=" +
                __imports.B +
                "&bizExt=%7B%22yzxq%22%3A%7B%7D%7D",
            })
              .then(owner.guard((e) => e.json()))
              .then(owner.guard((e) => {
                if (null != e.data && "鱼翅不足" != e.msg) {
                  sucCount++;
                  totalCost += Number(e.data.priceType || 0);
                } else {
                  console.log("【送礼】" + giftId + " " + e.msg);
                }
              }))
              .catch((e) => {
                console.log("请求失败!", e);
              });
            if (delay > 0) await (0, __imports.b)(delay);
          }
          (0, __imports.T)("【送礼】已提交赠送请求，详细信息可按F12查看控制台", "success");
        }
      }, owner);

      __imports.localStorage.setItem("freetimed", "1");
    })());
(function () {
    var _extool = document.querySelector(".extool");
    var _sendGift = document.querySelector(".extool__sendgift");
    if (!_extool) return;

    var perfCard = document.createElement("div");
    perfCard.className = "extool__player_perf";
    perfCard.innerHTML = `
        <div class="extool__perf_header">
            <span class="extool__perf_title">播放与性能</span>
            <span class="extool__perf_badge">原生极清</span>
        </div>
        <div class="extool__perf_grid">
            <label class="extool__perf_item" title="原生劫持锁定最高画质，杜绝二次重载卡顿">
                <input id="extool__highestvideoquality" type="checkbox">
                <span class="extool__perf_text">自动最高画质</span>
            </label>
            <label class="extool__perf_item" title="自动展开网页全屏观播">
                <input id="extool__fullscreen" type="checkbox">
                <span class="extool__perf_text">自动网页全屏</span>
            </label>
            <label class="extool__perf_item" title="屏蔽 WebRTC P2P 后台偷偷上传带宽">
                <input id="extool__p2p" type="checkbox">
                <span class="extool__perf_text">阻止p2p上传</span>
            </label>
            <label class="extool__perf_item" title="后台播放保活，阻止 Chrome 浏览器页签睡眠冻结">
                <input id="extool__tabSwitch" type="checkbox">
                <span class="extool__perf_text">防页签冻结</span>
            </label>
        </div>
    `;
    if (_sendGift) {
      _extool.insertBefore(perfCard, _sendGift);
    } else {
      _extool.appendChild(perfCard);
    }
  })();
(0, __imports.safeBind)("#extool__tabSwitch", "click", function () {
    var e = (0, __imports.safeEl)("extool__tabSwitch").checked;
    (0, __imports.Tt)(e);
    e
      ? (0, __imports.Ct)()
      : ((0, __imports.T)("已关闭页面防挂机，请刷新页面生效", "info"),
        window.__pip_is_active__ && (0, __imports.sa)());
  }, owner);
null != (containerOrValue = __imports.localStorage.getItem("ExSave_TabSwitch")) &&
    (containerOrValue = JSON.parse(containerOrValue)).isEnableTabSwitch &&
    (((0, __imports.safeEl)("extool__tabSwitch").checked = containerOrValue.isEnableTabSwitch), (0, __imports.Ct)());
(0, __imports.safeBind)("#extool__p2p", "click", function () {
    var e = { isKillP2P: (0, __imports._t)() };
    __imports.localStorage.setItem("ExSave_P2P", JSON.stringify(e));
    (0, __imports._t)() && (0, __imports.T)("阻止p2p上传成功，刷新页面生效", "success");
  }, owner);
null != (elementOrValue = __imports.localStorage.getItem("ExSave_P2P")) &&
    (elementOrValue = JSON.parse(elementOrValue)).isKillP2P &&
    ((0, __imports.safeEl)("extool__p2p").checked = elementOrValue.isKillP2P);
(0, __imports.safeBind)("#extool__fullscreen", "click", function () {
    var e = { isFullScreen: (0, __imports.mt)() };
    __imports.localStorage.setItem("ExSave_FullScreen", JSON.stringify(e));
    (0, __imports.mt)() && (0, __imports.T)("刷新页面生效", "success");
  }, owner);
(0, __imports.safeBind)("#extool__highestvideoquality", "click", function () {
    var e = { isHighestVideoQuality: (0, __imports.ut)() };
    __imports.localStorage.setItem("ExSave_HighestVideoQuality", JSON.stringify(e));
    (0, __imports.ut)() && (0, __imports.T)("刷新页面生效", "success");
  }, owner);
null != (containerOrValue = __imports.localStorage.getItem("ExSave_FullScreen")) &&
    (containerOrValue = JSON.parse(containerOrValue)).isFullScreen &&
    ((0, __imports.safeEl)("extool__fullscreen").checked = containerOrValue.isFullScreen);
null != (elementOrValue = __imports.localStorage.getItem("ExSave_HighestVideoQuality")) &&
    (elementOrValue = JSON.parse(elementOrValue)).isHighestVideoQuality &&
    ((0, __imports.safeEl)("extool__highestvideoquality").checked = elementOrValue.isHighestVideoQuality);
(containerOrValue = document.createElement("a"));
(containerOrValue.className = "refresh-barrage");
(containerOrValue.id = "refresh-barrage-frame");
(containerOrValue.innerHTML =
      '<svg t="1588051109604" id="refresh-barrage-frame__svg" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3095" width="16" height="16"><path d="M512 128 192 448h192v448h256V448h192L512 128z" fill="#AFAFAF" p-id="3096"></path></svg><i class="Barrage-toolbarIcon"></i><span id="refresh-barrage-frame__text" class="Barrage-toolbarText">拉高</span>');
(elementOrValue = document.getElementsByClassName("Barrage-toolbar")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
((0, __imports.safeBind)("#refresh-barrage-frame", "click", function () {
      let t = document.getElementsByClassName("layout-Player-rank")[0],
        o = document.getElementById("js-room-activity"),
        n = document.getElementsByClassName("Barrage")[0];
      var e;
      "none" == t.style.display
        ? ((t.style.display = "block"),
          (o.style.display = "block"),
          (n.className = "Barrage"),
          ((0, __imports.safeEl)("refresh-barrage-frame__text").innerText = "拉高"),
          document
            .getElementById("refresh-barrage-frame")
            .classList.remove("ex-active"),
          (document.getElementById("refresh-barrage-frame__text").style.color =
            ""),
          (e = document.getElementById("refresh-barrage-frame__svg")) &&
            (e = e.getElementsByTagName("path")[0]) &&
            e.setAttribute("fill", "#AFAFAF"),
          (0, __imports.pn)())
        : ((t.style.display = "none"),
          (o.style.display = "none"),
          (n.className = "Barrage top-0-important"),
          ((0, __imports.safeEl)("refresh-barrage-frame__text").innerText = "拉高"),
          document
            .getElementById("refresh-barrage-frame")
            .classList.add("ex-active"),
          (document.getElementById("refresh-barrage-frame__text").style.color =
            "#fff"),
          (e = document.getElementById("refresh-barrage-frame__svg")) &&
            (e = e.getElementsByTagName("path")[0]) &&
            e.setAttribute("fill", "#ffffff"),
          (0, __imports.pn)());
    }, owner));
containerOrValue = __imports.localStorage.getItem("ExSave_Refresh");
null != containerOrValue &&
    ("barrageFrame" in (containerOrValue = JSON.parse(containerOrValue)) == 0 &&
      (containerOrValue.barrageFrame = { status: !1 }),
    1 == containerOrValue.barrageFrame.status) &&
    ((containerOrValue = document.getElementsByClassName("layout-Player-rank")[0]),
    (elementOrValue = document.getElementById("js-room-activity")),
    (containerOrValue.style.display = "none"),
    (elementOrValue.style.display = "none"),
    ((0, __imports.safeEl)("refresh-barrage-frame__text").innerText = "拉高"),
    document.getElementById("refresh-barrage-frame").classList.add("ex-active"),
    (document.getElementById("refresh-barrage-frame__text").style.color =
      "#fff"),
    (containerOrValue = document.getElementById("refresh-barrage-frame__svg"))) &&
    (elementOrValue = containerOrValue.getElementsByTagName("path")[0]) &&
    elementOrValue.setAttribute("fill", "#ffffff");
(0, __imports.mountPlayerMenu)(owner);
}

}
