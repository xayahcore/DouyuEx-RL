function* (__imports) {
yield {"mountLotteryPanel": { get: () => mountLotteryPanel, set: value => { mountLotteryPanel = value; } }};
// Phase-local construction values; only declared outputs cross phase boundaries.
function mountLotteryPanel(owner) {
let controlParent, containerOrValue, elementOrValue;
controlParent = document.createElement("div");
containerOrValue = ((controlParent.className = "ex-update"),
      (controlParent.innerHTML =
        '<a class="ex-panel__icon" title="版本更新，当前版本：${P}"><svg t="1578767541873" style="display:block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="23715" width="32" height="32"><path d="M768 810.7H512c-23.6 0-42.7-19.1-42.7-42.7s19.1-42.7 42.7-42.7h256c94.1 0 170.7-76.6 170.7-170.7 0-89.6-70.1-164.3-159.5-170.1L754 383l-10.7-22.7c-42.2-89.3-133-147-231.3-147s-189.1 57.7-231.3 147L270 383l-25.1 1.6c-89.5 5.8-159.5 80.5-159.5 170.1 0 94.1 76.6 170.7 170.7 170.7 23.6 0 42.7 19.1 42.7 42.7s-19.1 42.7-42.7 42.7c-141.2 0-256-114.8-256-256 0-126.1 92.5-232.5 214.7-252.4C274.8 195.7 388.9 128 512 128s237.2 67.7 297.3 174.2C931.5 322.1 1024 428.6 1024 554.7c0 141.1-114.8 256-256 256z" fill="#3688FF" p-id="23716"></path><path d="M554.7 938.7c-10.9 0-21.8-4.2-30.2-12.5l-128-128c-16.7-16.7-16.7-43.7 0-60.3l128-128c16.6-16.7 43.7-16.7 60.3 0 16.7 16.7 16.7 43.7 0 60.3L487 768l97.8 97.8c16.7 16.7 16.7 43.7 0 60.3-8.3 8.4-19.2 12.6-30.1 12.6z" fill="#5F6379" p-id="23717"></path></svg><i id="ex-update__tip" class="ex-panel__tip"></i></a>'),
      document.getElementsByClassName("ex-panel__wrap")[0]);
containerOrValue && containerOrValue.insertBefore(controlParent, containerOrValue.childNodes[0]);
elementOrValue = document.createElement("div");
containerOrValue = ((elementOrValue.className = "ex-monitor"),
      (elementOrValue.innerHTML =
        '<a class="ex-panel__icon" title="在线弹幕助手"><svg style="display:block;" t="1638235744961" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="69800" width="32" height="32"><path d="M426.666667 106.666667a21.333333 21.333333 0 0 1 21.333333-21.333334h512a21.333333 21.333333 0 0 1 0 42.666667H448a21.333333 21.333333 0 0 1-21.333333-21.333333z m533.333333 789.333333H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667z m0-554.666667H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667z m0 298.666667H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667zM245.333333 42.666667H96a53.393333 53.393333 0 0 0-53.333333 53.333333v149.333333a53.393333 53.393333 0 0 0 53.333333 53.333334h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333334V96a53.393333 53.393333 0 0 0-53.333334-53.333333z m0 341.333333H96a53.393333 53.393333 0 0 0-53.333333 53.333333v149.333334a53.393333 53.393333 0 0 0 53.333333 53.333333h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333333V437.333333a53.393333 53.393333 0 0 0-53.333334-53.333333z m0 341.333333H96a53.393333 53.393333 0 0 0-53.333333 53.333334v149.333333a53.393333 53.393333 0 0 0 53.333333 53.333333h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333333v-149.333333a53.393333 53.393333 0 0 0-53.333334-53.333334z" fill="#13227a" p-id="69801"></path></svg><i id="Monitor__tip" class="ex-panel__tip"></i></a>'),
      document.getElementsByClassName("ex-panel__wrap")[0]);
elementOrValue = (containerOrValue && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]),
      (0, __imports.safeBind)(".ex-monitor", "click", function () {
        (0, __imports._)("https://www.douyuex.com/" + String(__imports.B));
      }, owner),
      (async () => {
        var t = [],
          e = await (0, __imports.fetch)("https://www.douyu.com/member/cp/getFansBadgeList", {
            method: "GET",
            mode: "no-cors",
            cache: "default",
            credentials: "include",
          })
            .then(owner.guard((e) => e.text()))
            .catch((e) => {
              console.log("请求失败!", e);
            }),
          o = (e = new DOMParser().parseFromString(
            e,
            "text/html",
          )).getElementsByClassName("fans-badge-list")[0].lastElementChild,
          n = o.children.length;
        for (let e = 0; e < n; e++) {
          var i = o.children[e].getAttribute("data-fans-room");
          t.push(i);
        }
        __imports.To = t;
      })(),
      document.createElement("div"));
containerOrValue = ((elementOrValue.className = "exlottery"),
      (elementOrValue.innerHTML = `

        <div class="lottery__func">

            <div id="lottery-refresh">

                <svg t="1636115506027" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2454" width="16" height="16"><path d="M927.999436 531.028522a31.998984 31.998984 0 0 0-31.998984 31.998984c0 51.852948-10.147341 102.138098-30.163865 149.461048a385.47252 385.47252 0 0 1-204.377345 204.377345c-47.32295 20.016524-97.6081 30.163865-149.461048 30.163865s-102.138098-10.147341-149.461048-30.163865a385.47252 385.47252 0 0 1-204.377345-204.377345c-20.016524-47.32295-30.163865-97.6081-30.163865-149.461048s10.147341-102.138098 30.163865-149.461048a385.47252 385.47252 0 0 1 204.377345-204.377345c47.32295-20.016524 97.6081-30.163865 149.461048-30.163865a387.379888 387.379888 0 0 1 59.193424 4.533611l-56.538282 22.035878A31.998984 31.998984 0 1 0 537.892156 265.232491l137.041483-53.402685a31.998984 31.998984 0 0 0 18.195855-41.434674L639.723197 33.357261a31.998984 31.998984 0 1 0-59.630529 23.23882l26.695923 68.502679a449.969005 449.969005 0 0 0-94.786785-10.060642c-60.465003 0-119.138236 11.8488-174.390489 35.217667a449.214005 449.214005 0 0 0-238.388457 238.388457c-23.361643 55.252253-35.22128 113.925486-35.22128 174.390489s11.8488 119.138236 35.217668 174.390489a449.214005 449.214005 0 0 0 238.388457 238.388457c55.252253 23.368867 113.925486 35.217667 174.390489 35.217667s119.138236-11.8488 174.390489-35.217667A449.210393 449.210393 0 0 0 924.784365 737.42522c23.368867-55.270316 35.217667-113.925486 35.217667-174.390489a31.998984 31.998984 0 0 0-32.002596-32.006209z" fill="" p-id="2455"></path></svg>

            </div>

            <div class="lottery__notice">

                <label class="lottery__notice"><input class="lottery__notice" id="lottery-notice" type="checkbox">开启提醒</label>

            </div>

        </div>

        <div class="lottery__nodata">暂无数据</div>

        <div class="lottery__wrap"></div>

    `),
      document.getElementsByClassName("layout-Player-chat")[0] ||
        document.body);
elementOrValue = (containerOrValue && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]), document.createElement("div"));
containerOrValue = ((elementOrValue.className = "ex-lottery"),
      (elementOrValue.innerHTML =
        '<a class="ex-panel__icon" title="全站抽奖信息"><svg style="display:block;" t="1636332741708" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="19181" width="32" height="32"><path d="M508.858182 986.042182c-261.748364 0-473.925818-212.177455-473.925818-473.925818S247.109818 38.190545 508.858182 38.190545s473.925818 212.177455 473.925818 473.925819-212.200727 473.925818-473.925818 473.925818m0-981.690182C228.421818 4.352 1.093818 231.703273 1.093818 512.116364s227.351273 507.764364 507.764364 507.764363c280.413091 0 507.787636-227.351273 507.787636-507.764363S789.271273 4.352 508.858182 4.352" fill="#FF4517" p-id="19182"></path><path d="M322.536727 512.302545l0.023273-1.326545-313.064727-1.931636c0 1.093818-0.093091 2.164364-0.093091 3.281454 0 90.88 24.785455 175.918545 67.84 248.925091l270.173091-155.997091a185.274182 185.274182 0 0 1-24.878546-92.951273zM416.791273 350.440727L264.029091 82.013091A492.986182 492.986182 0 0 0 77.498182 262.981818l270.173091 155.997091a186.717091 186.717091 0 0 1 69.12-68.538182zM602.856727 351.697455l151.831273-259.211637A488.261818 488.261818 0 0 0 508.718545 21.690182l0.023273 304.453818c34.350545 0 66.513455 9.355636 94.114909 25.553455zM258.536727 939.450182a488.471273 488.471273 0 0 0 241.710546 63.674182c2.839273 0 5.632-0.139636 8.448-0.186182V698.507636a185.064727 185.064727 0 0 1-94.068364-25.553454l-156.090182 266.496zM927.325091 270.452364l-257.466182 148.666181a185.204364 185.204364 0 0 1 25.041455 93.207273l-0.046546 1.070546 296.168727 1.838545c0.023273-0.977455 0.069818-1.931636 0.069819-2.909091 0-87.994182-23.249455-170.496-63.767273-241.873454zM600.855273 674.094545l148.573091 261.073455a492.776727 492.776727 0 0 0 178.106181-181.387636l-257.466181-148.642909a187.042909 187.042909 0 0 1-69.213091 68.95709z" fill="#FF4517" p-id="19183"></path><path d="M644.142545 512.302545a135.400727 135.400727 0 0 0-135.424-135.400727l-84.619636-160.791273 20.642909 173.824c-42.658909 22.784-71.400727 70.609455-71.400727 122.368a135.447273 135.447273 0 0 0 270.801454 0z m-133.492363 70.097455a68.491636 68.491636 0 1 1 0.023273-136.96 68.491636 68.491636 0 0 1-0.023273 136.96z" fill="#FF4517" p-id="19184"></path></svg><i id="lottery__tip" class="ex-panel__tip"></i></a>'),
      document.getElementsByClassName("ex-panel__wrap")[0]);
containerOrValue && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]);
{
    let t = document.getElementById("lottery-notice");
    ((0, __imports.safeBind)(".ex-lottery", "click", () => {
      (0, __imports.openFeaturePanel)("全站抽奖信息");
      var e = document.getElementsByClassName("lottery__wrap")[0];
      e && (e.innerHTML = __imports.So);
    }, owner),
      (0, __imports.safeBind)(
        "#lottery-refresh",
        "click",
        ((o, n) => {
          let i;
          return function () {
            var e = arguments,
              t = (i && (0, __imports.clearTimeout)(i), !i);
            ((i = owner.timeout(() => {
              i = null;
            }, n)),
              t && o.apply(this, e));
          };
        })(() => {
          (0, __imports.Lo)();
        }, 3e3), owner),
      t &&
        owner.listen(t, "click", () => {
          var e = t.checked;
          ((__imports.Mo = 1 == e),
            (e = { isNotice: __imports.Mo }),
            __imports.localStorage.setItem("ExSave_Lottery", JSON.stringify(e)));
        }));
  }
(elementOrValue = __imports.localStorage.getItem("ExSave_Lottery"));
(null != elementOrValue &&
      1 == JSON.parse(elementOrValue).isNotice &&
      (owner.navigation.submitTarget = document.getElementById("lottery-notice")) &&
      owner.navigation.submitTarget.click());
(__imports.No = owner.interval(() => {
      (0, __imports.Lo)();
    }, 6e4));
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "popup-player");
(containerOrValue.innerHTML =
      '<a class="ex-panel__icon" title="同屏播放"><svg style="display:block;" t="1579448049771" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1804" width="30" height="30"><path d="M353.024 900.416H109.952c-57.856 0-109.952-46.336-109.952-98.432V153.6c0-52.096 52.096-98.432 109.952-98.432h810.176c57.856 0 104.192 46.336 104.192 98.496v185.472c0 28.928-23.168 52.096-46.336 52.096s-46.272-23.168-46.272-52.096V159.36H98.368V807.68h248.896c34.688 0 52.032 17.408 52.032 46.336 0 28.928-17.344 46.272-46.272 46.272" fill="#f26b1f" p-id="1805"></path><path d="M619.2 631.488c-5.76 0-5.76 5.76-5.76 11.52v223.04c0 5.76 5.76 11.52 5.76 11.52h289.344c5.76 0 11.584-5.76 11.584-11.52v-222.976c0-5.824-5.76-11.584-11.52-11.584H619.136z m289.344 338.688h-289.28a103.68 103.68 0 0 1-104.192-104.128v-222.976c0-57.92 46.272-109.952 104.128-109.952h289.344c57.856 0 104.128 46.272 104.128 109.952v222.976c5.824 57.856-40.448 104.128-104.128 104.128z" fill="#f26b1f" p-id="1806"></path></svg><i id="popup-player__tip" class="ex-panel__tip"></i></a>');
(elementOrValue = document.getElementsByClassName("ex-panel__wrap")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
(containerOrValue = document.createElement("div"));
(elementOrValue = "");
(containerOrValue.className = "postbird-box-container");
(containerOrValue.id = "popup-player__prompt");
(elementOrValue += '<div class="postbird-box-dialog">');
(containerOrValue.innerHTML =
      '<div class="postbird-box-dialog"><div style="min-height:170px" class="postbird-box-content"><div class="postbird-box-header"><span class="postbird-box-title"><span>请输入直播间/直播流地址：</span></span></div><div class="postbird-box-text"><input id="popup-player__url" value="https://www.douyu.com/4042402" style="height:30px;box-sizing:border-box" type="text" class="postbird-prompt-input" autofocus="true"><label style="margin-right:30px" title="【直播流模式】&#10;1. 速度快&#10;2. 延迟低&#10;3. 占用少&#10;4. 不会进入直播间&#10;5. 支持斗鱼/虎牙/Bilibili"><input id="popup-player__noiframe" type="radio" name="sex" value="无弹幕" checked="checked">无弹幕(推荐)</label><label title="【框架模式】&#10;1. 速度慢&#10;2. 占用高&#10;3. 会进入直播间&#10;4. 仅支持斗鱼&#10;此模式拖动不是很灵活，请尽量在标题栏小幅度拖动&#10;若拖动无反应请点击页面任意处触发移动"><input id="popup-player__iframe" type="radio" name="sex" value="有弹幕">有弹幕</label></div><div class="postbird-box-footer"><button id="popup-player__cancel" class="btn-footer btn-left-footer btn-footer-cancel" style="color:undefined;">取消</button><button id="popup-player__ok" class="btn-footer btn-right-footer btn-footer-ok" style="color:#0e90d2;">确定</button></div></div>');
((elementOrValue = (0, __imports.E)([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"])) &&
      elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
((0, __imports.safeBind)(".popup-player", "click", function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      (0, __imports.handleDockAction)("popup-player");
    }, owner));
((0, __imports.safeBind)("#popup-player__cancel", "click", function () {
      document.getElementById("popup-player__prompt").style.display = "none";
    }, owner));
((0, __imports.safeBind)("#popup-player__ok", "click", function () {
      var a,
        t = document.getElementById("popup-player__url").value;
      if ("" != t) {
        var o,
          n,
          i,
          r = document.getElementById("popup-player__noiframe").checked;
        let e = !1;
        if (
          (e =
            150 < t.length && 1 == window.confirm("你输入的是直播流吗？")
              ? !0
              : e)
        )
          (0, __imports.rn)(__imports.D.length, t);
        else if (1 == r)
          if (-1 != t.indexOf("douyu.com"))
            ((a = (e) => {
              (0, __imports.en)(__imports.D.length, e, "Douyu");
            }),
              (0, __imports.fetch)(t, {
                method: "GET",
                mode: "no-cors",
                cache: "default",
                credentials: "include",
              })
                .then(owner.guard((e) => e.text()))
                .then(owner.guard((e) => {
                  var t = (e = new DOMParser().parseFromString(
                      e,
                      "text/html",
                    )).getElementsByTagName("html")[0].innerHTML,
                    o = "$ROOM.room_id =".length,
                    n = t.indexOf("$ROOM.room_id =");
                  let i = "";
                  (0 < n
                    ? (i = (i = t.substring(
                        n + o,
                        t.indexOf(";", n + o),
                      )).trim())
                    : (i = (0, __imports.v)(t, "roomID:", ","))
                      ? (i = i.trim())
                      : (n = e.querySelector('link[rel="canonical"]')) &&
                        ((o = n.getAttribute("href")),
                        (i = o.split("/").pop().trim())),
                    1 == !!/^[0-9]+$/.test(i)
                      ? a(i)
                      : (0, __imports.T)(
                          "获取直播间失败，请检查直播间地址是否正确！",
                          "error",
                        ));
                }))
                .catch((e) => {
                  console.log("请求失败!", e);
                }));
          else if (-1 != t.indexOf("bilibili.com")) {
            var r = t,
              l = (e) => {
                (0, __imports.en)(__imports.D.length, e, "Bilibili");
              };
            ((r = (r = r.split("/"))[r.length - 1]),
              (0, __imports.GM_xmlhttpRequest)({
                method: "GET",
                url:
                  "https://api.live.bilibili.com/room/v1/Room/room_init?id=" +
                  r,
                responseType: "json",
                onload: function (e) {
                  e = e.response;
                  l(e.data.room_id);
                },
              }));
          } else
            -1 != t.indexOf("huya.com")
              ? (0, __imports.en)(__imports.D.length, t, "Huya")
              : (0, __imports.rn)(__imports.D.length, t);
        else {
          r = __imports.D.length;
          if (-1 == String(t).indexOf("douyu.com"))
            (0, __imports.T)("有弹幕模式仅支持斗鱼直播", "error");
          else {
            ((i = String(t).split("/")),
              (i = i[i.length - 1]),
              (o = document.createElement("div")),
              (n = ""),
              (o.id = "exVideoDiv" + String(r)),
              (o.rid = i),
              (o.className = "exVideoDiv"),
              (n =
                (n =
                  (n =
                    (n +=
                      "<div class='exVideoInfo' id='exVideoInfo" +
                      String(r) +
                      "'><span class='exVideoRID' id='exVideoRID" +
                      String(r) +
                      "' style='color:white'>斗鱼 - " +
                      i +
                      "</span>") +
                    "<a><div class='exVideoClose' id='exVideoClose" +
                    String(r) +
                    "'>X</div></a></div>") +
                  "<iframe class='exVideoPlayer' id='exVideoPlayer" +
                  String(r) +
                  "' src=" +
                  t +
                  "?exid=chun></iframe>") +
                "<div class='exVideoScale' id='exVideoScale" +
                String(r) +
                "'></div>"),
              (o.innerHTML = n),
              (i = (0, __imports.E)([
                ".layout-Main",
                ".playerWrap__8wGvw",
                ".live-next-body",
              ])) && i.insertBefore(o, i.childNodes[0]),
              (0, __imports.on)(r),
              (0, __imports.tn)(r),
              r > __imports.D.length - 1 ? __imports.D.push("iframe") : (__imports.D[r] = "iframe"));
            {
              var s = r;
              let e = document.getElementById("exVideoDiv" + String(s)),
                t = document.getElementById("exVideoClose" + String(s));
              ((t.onclick = function () {
                (__imports.D[s].destroy(), e.remove());
              }),
                (e.onclick = function (e) {
                  (e.stopPropagation(), e.preventDefault());
                  for (let e = 0; e < __imports.D.length; e++) {
                    var t = document.getElementById("exVideoDiv" + String(e));
                    null != t &&
                      (e == s
                        ? (t.style.zIndex = 1016)
                        : (t.style.zIndex = 1428));
                  }
                }));
            }
          }
        }
      } else (0, __imports.T)("请输入地址", "error");
      document.getElementById("popup-player__prompt").style.display = "none";
    }, owner));
((0, __imports.safeBind)("#popup-player__prompt", "keydown", function (t) {
      var o = window.event || e;
      13 == (o.keyCode || o.which || o.charCode) &&
        document.getElementById("popup-player__ok").click();
    }, owner));
(containerOrValue = document.createElement("div"));
return containerOrValue;
}

}
