function* (__imports) {
yield {"mountRoomShell": { get: () => mountRoomShell, set: value => { mountRoomShell = value; } }};
// Phase-local construction values; only declared outputs cross phase boundaries.
function mountRoomShell(owner) {
let elementOrValue, containerOrValue;
elementOrValue = document.createElement("div");
containerOrValue = ((elementOrValue.className = "ChatToolBar-DanmakuTail"),
      (elementOrValue.innerHTML =
        '<div class="ChatToolBar-DanmakuTail-tip" title="弹幕小尾巴" ></div>'),
      document.getElementsByClassName("ChatToolBar__left")[0]);
(containerOrValue && containerOrValue.appendChild(elementOrValue));
((containerOrValue = document.createElement("div")).className =
      "ChatToolBar-DanmakuTail-Panel");
(elementOrValue =
      document.getElementsByClassName("layout-Player-chat")[0] ||
      document.body);
(elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
(window.location.href.includes("/beta") || (containerOrValue.style.bottom = "140px"));
(containerOrValue.innerHTML = `

        <div class="ChatToolBar-DanmakuTail-title">弹幕小尾巴</div>

        <input type="text" class="DanmakuTail-input" id="DanmakuTail-input" placeholder="请输入小尾巴内容"/>

        <div class="DanmakuTail-option-label">

            <label for="DanmakuTail-option-label1">

                <input type="radio" name="DanmakuTailType" value="1" id="DanmakuTail-option-label1"> 前缀

            </label>

            <label for="DanmakuTail-option-label2">

                <input type="radio" name="DanmakuTailType" value="2" id="DanmakuTail-option-label2" checked> 后缀

            </label>

        </div>

        <label class="DanmakuTail-checkbox-label">

            <input type="checkbox" class="DanmakuTail-checkbox" id="DanmakuTail-checkbox" />

            启用功能

        </label>

    `);
(null != (elementOrValue = __imports.localStorage.getItem("ExSave_DanmakuTail")) &&
      ((elementOrValue = JSON.parse(elementOrValue)),
      ((0, __imports.safeEl)("DanmakuTail-checkbox").checked = elementOrValue.isTailEnabled),
      ((0, __imports.safeEl)("DanmakuTail-input").value = elementOrValue.tailContent || ""),
      ((0, __imports.safeEl)("DanmakuTail-input").disabled = elementOrValue.isTailEnabled),
      (document.querySelectorAll('input[name="DanmakuTailType"]')[0].disabled =
        elementOrValue.isTailEnabled),
      (document.querySelectorAll('input[name="DanmakuTailType"]')[1].disabled =
        elementOrValue.isTailEnabled),
      elementOrValue.type
        ? ((document.querySelector(
            `input[name="DanmakuTailType"][value="${elementOrValue.type}"]`,
          ).checked = !0),
          (0, __imports.Ue)())
        : (document.querySelector(
            'input[name="DanmakuTailType"][value="2"]',
          ).checked = !0),
      elementOrValue.isTailEnabled) &&
      document
        .querySelector(".ChatToolBar-DanmakuTail-tip")
        .classList.add("ChatToolBar-DanmakuTail-tip-active"));
((0, __imports.safeBind)(".ChatToolBar-DanmakuTail", "click", function () {
      (0, __imports.openFeaturePanel)("弹幕小尾巴");
    }, owner));
{
    containerOrValue = ("#DanmakuTail-checkbox", elementOrValue = "#DanmakuTail-input");
    let s = null,
      d = null;
    function a(i, a) {
      let r =
          document.querySelector("textarea.ChatSend-txt") ||
          document.querySelector("div.ChatSend-txt"),
        l = document.querySelector(".ChatSend-button");
      if (r && l) {
        c();
        let t = "div" === r.tagName.toLowerCase(),
          o = () => (t ? r.innerText : r.value),
          n = (e) => {
            t ? (r.innerText = e) : (r.value = e);
          };
        ((s = function (e) {
          !e.isTrusted ||
            "Enter" !== e.key ||
            e.shiftKey ||
            (e.preventDefault(), e.stopPropagation(), l.click());
        }),
          (d = function (e) {
            var t = o();
            if ("" != t.trim()) {
              let e = !1;
              (e = "1" === a ? !t.startsWith(i) : !t.endsWith(i)) &&
                ("1" === a ? n(i + t) : n(t + i),
                r.dispatchEvent(new Event("input", { bubbles: !0 })));
            }
          }),
          owner.listen(r, "keydown", s, !0),
          owner.listen(l, "click", d, !0));
      }
    }
    function c() {
      var e =
          document.querySelector("textarea.ChatSend-txt") ||
          document.querySelector("div.ChatSend-txt"),
        t = document.querySelector(".ChatSend-button");
      (e && s && e.removeEventListener("keydown", s, !0),
        t && d && t.removeEventListener("click", d, !0),
        (s = null),
        (d = null));
    }
    let e = document.querySelector(containerOrValue),
      t = document.querySelector(elementOrValue),
      o = document.querySelectorAll('input[name="DanmakuTailType"]'),
      n = document.querySelector('input[name="DanmakuTailType"]:checked')
        ? document.querySelector('input[name="DanmakuTailType"]:checked').value
        : "2";
    e &&
      (owner.listen(e, "change", function () {
        "" === t.value.trim()
          ? ((e.checked = !1), (0, __imports.T)("【弹幕小尾巴】请输入弹幕小尾巴内容", "error"))
          : ((t.disabled = e.checked),
            (o[0].disabled = e.checked),
            (o[1].disabled = e.checked),
            document
              .querySelector(".ChatToolBar-DanmakuTail-tip")
              .classList.remove("ChatToolBar-DanmakuTail-tip-active"),
            c(),
            e.checked &&
              t &&
              (document
                .querySelector(".ChatToolBar-DanmakuTail-tip")
                .classList.add("ChatToolBar-DanmakuTail-tip-active"),
              a(
                t.value.trim(),
                (n = document.querySelector(
                  'input[name="DanmakuTailType"]:checked',
                ).value),
              )));
      }),
      e.checked) &&
      t &&
      a(t.value.trim(), n);
  }
((0, __imports.safeBind)("#DanmakuTail-checkbox", "change", function () {
    (0, __imports.Ue)();
  }, owner));
(document.querySelectorAll('input[name="DanmakuTailType"]').forEach((e) => {
      owner.listen(e, "change", function () {
        (0, __imports.Ue)();
      });
    }));
((0, __imports.safeBind)("#DanmakuTail-input", "input", function () {
      (0, __imports.Ue)();
    }, owner));
((containerOrValue = !!document.getElementsByClassName("live-next-body")[0]) ||
      (((containerOrValue = document.createElement("div")).style =
        "position: absolute;right: -75px;top: 18px;cursor: pointer;"),
      (containerOrValue.id = "ex-night"),
      (containerOrValue.innerHTML = __imports.Jo),
      (containerOrValue.title = "切换夜间模式"),
      (_hr = document.getElementsByClassName("Header-right")[0]) &&
        _hr.appendChild(containerOrValue),
      (0, __imports.safeBind)("#ex-night", "click", function () {
        var e,
          t = document.getElementById("ex-night");
        0 == __imports.Zo
          ? ((__imports.Zo = 1),
            (t.innerHTML = __imports.Qo),
            (t.title = "切换日间模式"),
            (0, __imports.Ko)(),
            (0, __imports.Xo)(),
            (0, __imports.$o)())
          : ((__imports.Zo = 0),
            (t.innerHTML = __imports.Jo),
            (t.title = "切换夜间模式"),
            (0, __imports.U)("Ex_Style_NightMode"),
            (0, __imports.Xo)(),
            (t = document
              .getElementsByClassName("BottomGroup")[0]
              .getElementsByTagName("iframe")[0].contentWindow.document),
            (e = "Ex_Style_NightModeIframe"),
            null !== t.getElementById(e) && t.getElementById(e).remove());
      }, owner),
      (containerOrValue = __imports.localStorage.getItem("ExSave_Mode")),
      (elementOrValue = document.getElementById("ex-night")),
      null != containerOrValue &&
        ("mode" in (containerOrValue = JSON.parse(containerOrValue)) == 0 && (containerOrValue.mode = 0), 1 == containerOrValue.mode) &&
        ((__imports.Zo = 1), (elementOrValue.innerHTML = __imports.Qo), (elementOrValue.title = "切换日间模式")),
      new __imports.DomMutationSubscription(".BottomGroup", !0, (e) => {
        0 != __imports.Zo && 1 == e.length && (0, __imports.$o)();
      }, owner)));
{
    let e = document.createElement("div"),
      t =
        ((e.className = "ex-icon"),
        (e.innerHTML = `<a title="DouyuEx-RL ver.${__imports.P}">${__imports.et}<i id="ex-icon__tip" class="ex-panel__tip"></i></a>`),
        document.querySelector(
          ".PlayerToolbar-ContentCell .PlayerToolbar-Wealth",
        ));
    t
      ? t.insertBefore(e, t.childNodes[0])
      : ((e.className += " ToolbarGiftArea-backpack"),
        (e.style.width = "52px"),
        (t = document.querySelector(".ToolbarGiftArea-container"))
          ? t.appendChild(e)
          : document.body && document.body.appendChild(e));
  }
(0, __imports.safeBind)(".ex-icon", "click", __imports.qt, owner);
{
    let e = document.createElement("div"),
      t =
        ((e.className = "ex-panel"),
        (e.innerHTML =
          '<button type="button" class="ex-panel__close" title="关闭工具条" aria-label="关闭 DouyuEx 工具条">×</button><div class="ex-panel__wrap"></div>'),
        (0, __imports.At)());
    (t
      ? ((containerOrValue = document.querySelector(".PlayerToolbar")),
        (e.style.bottom = containerOrValue ? containerOrValue.offsetHeight + "px" : "76px"))
      : ((t = (0, __imports.jt)()), e.classList.add("ex-panel--floating")),
      t.insertBefore(e, t.childNodes[0]),
      (0, __imports.Pt)(e),
      (0, __imports.Dt)() && (0, __imports.Ot)(),
      (0, __imports.initDockFull)(e.querySelector(".ex-panel__wrap")));
  }
{
    let _ep = document.querySelector(".ex-panel");
    if (_ep) {
      let _c = _ep.querySelector(".ex-panel__close");
      if (_c)
        owner.listen(_c, "click", (e) => {
          (e.stopPropagation(), (0, __imports.Gt)());
        });
    }
  }
(0, __imports.tl)(
    "Ex_Style_RealAudience",
    `

    .VideoEntry{display:none !important;}

	.layout-Player-rank{top:34px !important;}

    `,
  );
{
    let e = document.getElementsByClassName("VideoEntry")[0];
    (e && (e.style.display = "none"),
      (containerOrValue = ""),
      ((elementOrValue = document.createElement("div")).className = "real-audience"),
      (containerOrValue += "<div style='flex: 1;white-space: nowrap'>"),
      (elementOrValue.innerHTML =
        ("<div style='flex: 1;white-space: nowrap'><div id='real-audience__t' style='display: inline-block;margin-right:3px;' title='今日累计观看人数'><svg style=\"width:16px;height:16px\" t=\"1566119680547\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"3494\" width=\"128\" height=\"128\"><path d=\"M712.820909 595.224609C807.907642 536.686746 870.40537 437.74751 870.40537 325.549212 870.400378 145.753547 709.943392 0 511.997503 0 314.055363 0 153.599626 145.753547 153.599626 325.549212 153.599626 437.74751 216.092361 536.686746 311.179092 595.219615 149.961841 657.72608 31.268214 793.205446 5.334335 955.968198 1.926253 962.195123 0 969.212275 0 976.638899 0 1002.324352 22.919038 1023.151098 51.198627 1023.151098 79.476967 1023.151098 102.396005 1002.324352 102.396005 976.638899L102.396005 1023.151098C102.396005 817.669984 285.787009 651.099674 511.997503 651.099674 738.212992 651.099674 921.602746 817.669984 921.602746 1023.151098L921.602746 976.638899C921.602746 1002.324352 944.523034 1023.151098 972.801376 1023.151098 1001.07472 1023.151098 1024 1002.324352 1024 976.638899 1024 969.212275 1022.073747 962.195123 1018.659424 955.968198 992.731789 793.205446 874.038157 657.72608 712.820909 595.224609ZM511.997503 558.080262C370.618285 558.080262 256.000624 453.967732 256.000624 325.545467 256.000624 197.121954 370.618285 93.009424 511.997503 93.009424 653.386707 93.009424 767.993133 197.121954 767.993133 325.545467 767.993133 453.972726 653.386707 558.080262 511.997503 558.080262L511.997503 558.080262Z\" p-id=\"3495\"></path></svg><span id=\"real-audience__total\" style=\"color:#ed5a65\">****</span></div><div style='display: inline-block;margin-right:3px;' title='弹幕人数'><svg t=\"1587796804183\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www." +
"w3.org/2000/svg\" p-id=\"20780\" width=\"16\" height=\"16\"><path d=\"M811.8272 62.6176H212.1728c-79.9232 0-149.8624 69.9392-149.8624 149.9136v599.6032a150.3232 150.3232 0 0 0 149.8624 149.9136h599.6544a150.3232 150.3232 0 0 0 149.8624-149.9136V212.5312c0-79.9744-69.9392-149.9136-149.8624-149.9136zM263.5264 367.104c30.0032 0 49.9712 19.968 49.9712 49.9712s-19.968 49.92-49.9712 49.92-49.9712-19.968-49.9712-49.92 20.0192-49.9712 49.9712-49.9712z m449.6896 294.8096H263.5264c-24.9856 0-49.9712-24.9856-49.9712-49.9712s24.9856-49.9712 49.9712-49.9712h449.6896c24.9856 0 49.9712 24.9856 49.9712 49.9712s-24.9856 49.9712-49.9712 49.9712z m99.9424-199.68H463.4112c-24.9856 0-49.9712-24.9856-49.9712-49.9712s24.9856-49.9712 49.9712-49.9712h349.7472c24.9856 0 49.9712 24.9856 49.9712 49.9712s-24.9856 49.7664-49.9712 49.7664z\" p-id=\"20781\" fill=\"#1296db\"></path></svg><span id=\"real-audience__barrage\">****</span></div><div id='real-audience__noble-wrap' style='display: inline-block;margin-right:3px;' title='贵宾数'><svg t=\"1779268394045\" class=\"icon\" viewBox=\"0 0 1170 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"5245\" width=\"16\" height=\"16\"><path d=\"M270.579175 30.138897S391.031549-36.125391 427.208548 36.176998c36.125391 18.062695 114.46588 463.798407 132.528575 548.176999 18.062695 90.365084 60.226187 120.452374 84.326983 84.326983s114.46588-126.490475 174.692068-265.057152-18.062695-156.629372-42.163492-150.591271c-24.100796 6.038101-150.591271 12.024594-108.427779-42.163491 48.201593-54.188086 156.629372-150.591271 186.716661-162.615866 54.188086-36.125391 138.566677-84.326983 210.817458-6.038101 42.163492 30.138897 144.55317 150.591271 48.201593 319.245238-96.403185 174.692067-475.874609 614.389678-475.87461 614.389678s-138.566677 90.365084-192.754762 0c-54.188086-84.326983-240" +
".956355-554.163492-246.994456-614.389678 0-60.226187-18.062695-72.302389-48.201593-60.226187-30.138897 18.062695-90.365084 102.389678-96.403185 78.288882-5.986493-24.100796-60.174579-60.277795-24.049189-114.465881 30.138897-48.201593 216.855559-216.855559 240.956355-234.918254z\" fill=\"#CCB88F\" p-id=\"5246\"></path></svg><span id=\"real-audience__noble\">****</span></div><div id='real-audience__money' style='display: inline-block;margin-right:3px;' title='今日累计礼物价值'><svg t=\"1579155265981\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"6949\" width=\"16\" height=\"16\"><path d=\"M136.96 67.413h181.76L512 452.693l193.28-385.28h181.76l-245.76 445.44h163.84v84.48h-211.2l-1.28 1.28v106.24h212.48v84.48H592.64v192H431.36v-192h-211.2v-84.48h211.2v-106.24l-1.28-1.28H220.16v-84.48h162.56z\" fill=\"#F54330\" p-id=\"6950\"></path></svg><span id=\"real-audience__money_yc\">****</span></div></div><span id=\"real-audience__time\" style=\"white-space: nowrap;display: block;\">已播:****</span><span id=\"real-audience__watchtime\" style=\"white-space: nowrap;display: none;\">已观看:****</span>")),
      (containerOrValue = (0, __imports.E)([".layout-Player-announce", ".layout-Player-rankAll"])) &&
        containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]));
  }
(0, __imports.safeBind)(".real-audience", "click", function () {
    (0, __imports._)("https://www.doseeing.com/room/" + __imports.B, !0);
  }, owner);
}

}
