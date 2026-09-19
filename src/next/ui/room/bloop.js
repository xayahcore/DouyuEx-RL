function* (__imports) {
yield {"mountBloopPanel": { get: () => mountBloopPanel, set: value => { mountBloopPanel = value; } }};
// Phase-local construction values; only declared outputs cross phase boundaries.
function mountBloopPanel(owner) {
let runGeneration = 0;
const stopSending = () => {
  runGeneration++;
  (0, __imports.clearTimeout)(__imports.ge);
  (0, __imports.clearTimeout)(__imports.ve);
};
owner.own(stopSending);
let containerOrValue, elementOrValue;
(containerOrValue = document.createElement("a"));
(containerOrValue.className = "refresh-barrage");
(containerOrValue.id = "refresh-barrage");
(containerOrValue.innerHTML =
      '<svg t="1588051109604" id="refresh-barrage__svg" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3095" width="16" height="16"><path d="M588.416 516.096L787.2 317.312a54.016 54.016 0 1 0-76.416-76.416L512 439.68 313.216 241.024A54.016 54.016 0 1 0 236.8 317.376l198.784 198.848-198.016 197.888a54.016 54.016 0 1 0 76.416 76.416L512 592.576l197.888 197.952a54.016 54.016 0 1 0 76.416-76.416L588.416 516.096z" fill="#AFAFAF" p-id="3096"></path></svg><i class="Barrage-toolbarIcon"></i><span id="refresh-barrage__text" class="Barrage-toolbarText">前缀</span>');
(elementOrValue = document.getElementsByClassName("Barrage-toolbar")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
((0, __imports.safeBind)("#refresh-barrage", "click", function () {
      var e;
      0 == __imports.mn
        ? ((0, __imports.un)(), (0, __imports.pn)())
        : ((0, __imports.U)("Ex_Style_RefreshBarrage"),
          (__imports.mn = 0),
          document
            .getElementById("refresh-barrage")
            .classList.remove("ex-active"),
          (document.getElementById("refresh-barrage__text").style.color = ""),
          ((0, __imports.safeEl)("refresh-barrage__text").innerText = "前缀"),
          (e = document.getElementById("refresh-barrage__svg")) &&
            (e = e.getElementsByTagName("path")[0]) &&
            e.setAttribute("fill", "#AFAFAF"),
          (0, __imports.pn)());
    }, owner));
(containerOrValue = __imports.localStorage.getItem("ExSave_Refresh"));
(null != containerOrValue &&
      ("barrage" in (containerOrValue = JSON.parse(containerOrValue)) == 0 && (containerOrValue.barrage = { status: !1 }),
      1 == containerOrValue.barrage.status) &&
      (0, __imports.un)());
(elementOrValue = "");
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "bloop");
(elementOrValue += '<div style="display:inline-block"><label>弹幕：</label></div>');
(containerOrValue.innerHTML =
      '<div class="bloop__header_card"><label class="bloop__header_label">弹幕：</label><select id="bloop__select"></select><input type="button" id="bloop__save" value="保存"/><input type="button" id="bloop__delete" value="删除"/></div><div class="bloop__textarea_card"><textarea placeholder="一行一个，开启舔狗模式后此处不需要输入" id="bloop__textarea" rows="4"></textarea></div><div class="bloop__setting_card"><div class="bloop__setting_row"><label>速度(ms)：</label><input id="bloop__text_speed1" type="text" style="width:48px;text-align:center;" value="2000" />~<input id="bloop__text_speed2" type="text" style="width:48px;text-align:center;" value="3000" /></div><div class="bloop__setting_row"><label>限时(min)：</label><input id="bloop__text_stoptime" type="text" style="width:48px;text-align:center;" value="1" /></div></div><div class="bloop__options_card"><label><input id="bloop__checkbox_changeColor" type="checkbox" name="checkbox_changeColor" checked>自动变色</label><label><input id="bloop__checkbox_tiangou" type="checkbox">舔狗模式</label><label><input id="bloop__checkbox_random" type="checkbox">随机发送</label></div><div class="bloop__switch_card"><label class="bloop__switch_label"><input id="bloop__checkbox_startSend" type="checkbox">开始发送</label></div>');
((elementOrValue =
      document.getElementsByClassName("layout-Player-chat")[0] ||
      document.body),
    elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "bloop-icon");
(containerOrValue.innerHTML =
      '<a class="ex-panel__icon" title="弹幕发送小助手"><svg t="1578572568198" style="display: block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="55445" width="32" height="32"><path d="M511.99883605 1020.07740302c-68.78771655 0-135.53209458-13.47788003-198.38074083-40.06106453-60.69004402-25.67037725-115.18953131-62.41203655-161.98371328-109.20738247-46.79418197-46.79301803-83.53700523-101.29366926-109.20621853-161.98371328C15.84497778 645.97776043 2.36709774 579.23105337 2.36709774 510.4445019s13.47904398-135.53209458 40.06106453-198.38074083c25.6692133-60.69004402 62.41203655-115.18953131 109.20621853-161.98371328 46.79534706-46.79418197 101.29366926-83.53700523 161.98371328-109.20621853 62.84864739-26.5831845 129.59418937-40.06106453 198.38074083-40.06106453 68.78771655 0 135.53209458 13.47904398 198.38190592 40.06106453 60.69004402 25.6692133 115.18953131 62.41203655 161.98487723 109.20621853 46.79301803 46.79418197 83.53584128 101.29366926 109.20621853 161.98371328 26.5831845 62.84864739 40.06106453 129.59418937 40.06106453 198.38074083s-13.47788003 135.53325853-40.06106453 198.38074084c-25.67037725 60.69004402-62.41203655 115.19069525-109.20621853 161.98371328-46.79534706 46.79418197-101.29483435 83.53817031-161.98487723 109.20738247C647.53092949 1006.59952413 580.78655147 1020.07740302 511.99883605 1020.07740302zM511.99883605 57.86089358c-249.55500203 0-452.58244437 203.02744235-452.58244437 452.58244437s203.02744235 452.58244437 452.58244437 452.58244438c249.55616597 0 452.58360832-203.02744235 452.58360832-452.58244438C964.58244437 260.88949987 761.55500203 57.86089358 511.99883605 57.86089358z" p-id="55446" fill="#1296db" data-spm-anchor-id="a313x.7781069.0.i24"></path><path d="M322.42598685 461.65355293l-8.51099648 74.46598314 97.86947811 0c-2.85950862 76.59314973-4.9866752 127.6556379-6.38266595 153.18746454-1.42975431 51.06132423-27.65899321 75.16339541-78.72148139 72.33881542-18.45058333 1.39598962-35.47024839 2.12716658-51.06248818 2.12716658-2.85950862-17.02082901-6.38266595-34.77283613-10.63816419-53.19081984 18.41681863 0 35.43764878 0 51.06248817 0 25.53066155 2.82574393 38.99456967-7.77981952 40.42432399-31.9133275 1.39598962-9.9069861 2.12833166-25.53182663 2.12833166-46.80698994 1.39598962-21.27632725 2.12716658-36.86740309 2.12716658-46.80698994l-99.9966447 0 14.89366244-172.33546126 89.3584805 0 0-78.72148138-102.12497636 0 0-48.9353216 151.05913287 0 0 176.5909595L322.42598685 461.65355293zM450.08162475 580.79819435l0-242.54594504 74.46598314 0c-17.0219941-24.10090723-31.91449145-43.25006791-44.67982222-57.44515413l46.80698994-21.27632725c4.25433429 4.25549824 10.63699911 12.06675342 19.14799673 23.40349497 15.5910747 18.45058333 24.79948459 30.51733789 27.65899321 36.16882574l-42.5514917 19.14799673 80.84864796 0c25.53066155-38.29715741 41.8203136-64.5263963 48.93415652-78.72031744l53.19081984 14.89366244c-5.68525255 8.50983253-15.62483939 22.70491762-29.78732487 42.55149169-7.11384291 9.93958685-12.06675342 17.02082901-14.89249849 21.27516331l70.20931982 0 0 242.54594503L620.28991829 580.7970304l0 51.06248818 144.67646806 0 0 48.93415651L620.28991829 680.79367509l0 87.23131392-51.06132423 0 0-87.23131392L428.80646144 680.79367509l0-48.93415651 140.42213376 0 0-51.06248818L450.08162475 580.7970304zM501.14411293 385.0604032l0 53.18965475 68.08331718 0 0-53.18965475L501.14411293 385.0604032zM501.14411293 480.80154965l0 55.31682248 68.08331718 0L569.22743011 480.80154965 501.14411293 480.80154965zM688.37323549 385.0604032l-68.0833172 0 0 53.18965475 68.0833172 0L688.37323549 385.0604032zM620.28991829 480.80154965l0 55.31682248 68.0833172 0L688.37323549 480.80154965 620.28991829 480.80154965z" p-id="55447" fill="#1296db"></path></svg><i id="bloop__tip" class="ex-panel__tip"></i></a>');
(elementOrValue = document.getElementsByClassName("ex-panel__wrap")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
((0, __imports.safeBind)(".bloop-icon", "click", function () {
      (0, __imports.openFeaturePanel)("弹幕发送小助手");
    }, owner));
((0, __imports.safeBind)("#bloop__checkbox_changeColor", "click", function () {
      __imports.ye = (0, __imports.safeEl)("bloop__checkbox_changeColor").checked;
    }, owner));
((0, __imports.safeBind)("#bloop__checkbox_startSend", "click", function () {
      var n;
      stopSending();
      const generation = runGeneration;
      if (1 == (0, __imports.safeEl)("bloop__checkbox_startSend").checked) {
        ((__imports.pe.length = 0),
          (__imports.ue = 0),
          (n = document.getElementById("bloop__textarea").value),
          (__imports.pe = n.split("\n")),
          (__imports.ue = __imports.pe.length - 1));
        {
          ((__imports.ce.length = 0), (__imports.me = 0));
          let t = document.getElementsByClassName("FansBarrageSwitcher"),
            e = document.getElementsByClassName(
              "NobleBarrageSwitcher is-active",
            ),
            o = !1;
          (0 < e.length && (o = !0),
            0 == t.length
              ? ((__imports.be = !0),
                null !=
                (n = document.getElementsByClassName(
                  "MatchSystemFansBarrageSwitcher",
                )[0])
                  ? (n.click(),
                    (t = document.getElementsByClassName(
                      "MatchSystemFansBarrageColor-item",
                    )))
                  : (__imports.be = !1))
              : (t[0].click(),
                (t = document.getElementsByClassName("FansBarrageColor-item")),
                (__imports.be = !1)));
          for (let e = 0; e < t.length; e++)
            -1 == t[e].className.indexOf("is-lock") && (__imports.ce.push(e), __imports.me++);
          (--__imports.me,
            1 == o &&
              document
                .getElementsByClassName("NobleBarrageSwitcher")[0]
                .click());
        }
        ((__imports.fe =
          1 == document.getElementById("bloop__checkbox_random").checked
            ? ((__imports.he = Math.floor(Math.random() * __imports.pe.length)),
              Math.floor(Math.random() * __imports.ce.length))
            : (__imports.he = 0)),
          (0, __imports.ke)(),
          (__imports.ge = owner.timeout(() => (0, __imports.Ee)(owner, () => generation === runGeneration), (0, __imports._e)())),
          (__imports.ve = owner.timeout(
            () => {
              if (generation !== runGeneration) return;
              (((0, __imports.safeEl)("bloop__checkbox_startSend").checked = !1),
                stopSending());
            },
            ((n = (0, __imports.safeEl)("bloop__text_stoptime").value), 60 * Number(n) * 1e3),
          )));
      } else ((0, __imports.clearTimeout)(__imports.ge), (0, __imports.clearTimeout)(__imports.ve));
    }, owner));
((0, __imports.safeBind)("#bloop__checkbox_tiangou", "click", function () {
      var e = (0, __imports.safeEl)("bloop__checkbox_tiangou").checked;
      (((0, __imports.safeEl)("bloop__textarea").disabled = 1 == e), (0, __imports.ke)());
    }, owner));
((0, __imports.safeEl)("bloop__select").onclick = function () {
      var e, t;
      0 != this.options.length &&
        ((e = document.getElementById("bloop__textarea")),
        (t = this.options[this.selectedIndex].text),
        (e.value = t),
        (e.value = e.value.replace(/\\r/g, "\r")));
    });
((0, __imports.safeBind)("#bloop__save", "click", () => {
      var e = document.getElementById("bloop__select"),
        t = document.getElementById("bloop__textarea").value;
      "" != t &&
        (__imports.xe.push(t),
        e.options.add(new Option(t.replace(/\n/g, "\\r"), !0)),
        (0, __imports.ke)());
    }, owner));
((0, __imports.safeBind)("#bloop__delete", "click", () => {
      var e = document.getElementById("bloop__select"),
        o = e.options[e.selectedIndex];
      if (o) {
        let t = o.text;
        ((__imports.xe = __imports.xe.filter((e) => e !== t)),
          e.options.remove(e.selectedIndex),
          (0, __imports.ke)());
      }
    }, owner));
(containerOrValue = __imports.localStorage.getItem("ExSave_BarrageLoopOptions"));
if (null != containerOrValue) {
    containerOrValue = JSON.parse(containerOrValue);
    ("speed1" in containerOrValue == 0 && (containerOrValue.speed1 = 2e3),
      "speed2" in containerOrValue == 0 && (containerOrValue.speed2 = 3e3),
      "stopTime" in containerOrValue == 0 && (containerOrValue.stopTime = 5),
      "isTiangouMode" in containerOrValue == 0 && (containerOrValue.isTiangouMode = !1));
    let t = document.getElementById("bloop__select");
    (containerOrValue.text.forEach((e) => {
      t.options.add(new Option(e.replace(/\r/g, "\\r"), ""));
    }),
      (__imports.xe = containerOrValue.text),
      ((0, __imports.safeEl)("bloop__checkbox_changeColor").checked = containerOrValue.isChangeColor),
      (__imports.ye = Boolean(containerOrValue.isChangeColor)),
      ((0, __imports.safeEl)("bloop__text_speed1").value = containerOrValue.speed1),
      ((0, __imports.safeEl)("bloop__text_speed2").value = containerOrValue.speed2),
      ((0, __imports.safeEl)("bloop__text_stoptime").value = containerOrValue.stopTime),
      1 == containerOrValue.isTiangouMode &&
        (((0, __imports.safeEl)("bloop__checkbox_tiangou").checked = containerOrValue.isTiangouMode),
        ((0, __imports.safeEl)("bloop__textarea").disabled = !0)));
  }
}

}
