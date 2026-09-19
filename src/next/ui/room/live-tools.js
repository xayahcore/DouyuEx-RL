function* (__imports) {
yield {"mountLiveToolsPanel": { get: () => mountLiveToolsPanel, set: value => { mountLiveToolsPanel = value; } }};
// Phase-local construction values; only declared outputs cross phase boundaries.
function mountLiveToolsPanel(owner, panelElement) {
let containerOrValue, elementOrValue, voteName, savedVotes, voteOptions, replyName, savedReplies, replyOptions, welcomeName, savedWelcomes, welcomeOptions;
containerOrValue = panelElement;
(containerOrValue.className = "livetool");
(elementOrValue =
      document.getElementsByClassName("layout-Player-chat")[0] ||
      document.body);
(elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "livetool-icon");
(containerOrValue.innerHTML =
      '<a class="ex-panel__icon" title="直播间工具"><svg t="1590294900594" style="display:block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="20028" width="36" height="36"><path d="M352.2 245.3c-5.1 0-10.2-2-14.1-5.9L196.6 98c-7.8-7.8-7.8-20.5 0-28.3s20.5-7.8 28.3 0l141.4 141.4c7.8 7.8 7.8 20.5 0 28.3-3.9 3.9-9 5.9-14.1 5.9zM477.1 245.3c-5.1 0-10.2-2-14.1-5.9-7.8-7.8-7.8-20.5 0-28.3L604.3 69.7c7.8-7.8 20.5-7.8 28.3 0 7.8 7.8 7.8 20.5 0 28.3L491.2 239.4c-3.9 3.9-9 5.9-14.1 5.9z" fill="#0C2B4A" p-id="20029"></path><path d="M703.9 194.8H124.2c-33 0-60 27-60 60v453c0 33 27 60 60 60h418c1.7-122.5 99.6-221.8 221.7-225.5V254.8c0-33-27-60-60-60zM533.4 522.9L356.3 625.2c-24 13.9-54-3.5-54-31.2V389.5c0-27.7 30-45 54-31.2l177.1 102.2c24 13.9 24 48.6 0 62.4zM815.2 776.4c0 21.9-17.8 39.7-39.7 39.7-21.9 0-39.7-17.8-39.7-39.7 0-21.9 17.8-39.7 39.7-39.7 21.9 0 39.7 17.8 39.7 39.7z" fill="#0C2B4A" p-id="20030"></path><path d="M775.5 591C673.6 591 591 673.6 591 775.5S673.6 960 775.5 960 960 877.4 960 775.5 877.4 591 775.5 591zM879 819l-15.6 27c-2.1 3.6-6.8 4.9-10.4 2.8l-15.5-8.9c-2.7-1.6-6.1-1.3-8.5 0.6-7.5 5.9-15.9 10.6-25.1 13.8-3 1.1-5.1 4-5.1 7.2v18.7c0 4.2-3.4 7.6-7.6 7.6H760c-4.2 0-7.6-3.4-7.6-7.6v-18.5c0-3.3-2.1-6.2-5.1-7.2-9.3-3.2-17.9-7.8-25.5-13.7-2.4-1.9-5.8-2.2-8.5-0.6l-15.2 8.8c-3.6 2.1-8.3 0.9-10.4-2.8l-15.6-27c-2.1-3.6-0.8-8.3 2.8-10.4l12.2-7.1c3-1.7 4.5-5.2 3.7-8.5-1.7-6.8-2.6-13.8-2.6-21.1 0-4.1 0.3-8.2 0.9-12.2 0.4-3.1-1-6.1-3.7-7.7l-10.5-6.1c-3.6-2.1-4.9-6.8-2.8-10.4l15.6-27c2.1-3.6 6.8-4.9 10.4-2.8l7.8 4.5c2.9 1.7 6.6 1.3 9-1.1 9.1-8.7 20-15.5 32.2-19.7 3.1-1 5.1-4 5.1-7.2v-7.9c0-4.2 3.4-7.6 7.6-7.6H791c4.2 0 7.6 3.4 7.6 7.6v8.1c0 3.2 2 6.1 5.1 7.2 12.1 4.2 22.9 10.9 31.9 19.6 2.4 2.4 6.1 2.8 9.1 1.1l8.2-4.7c3.6-2.1 8.3-0.8 10.4 2.8l15.6 27c2.1 3.6 0.9 8.3-2.8 10.4l-11 6.3c-2.7 1.6-4.1 4.6-3.7 7.7 0.6 3.9 0.8 8 0.8 12.1 0 7.2-0.9 14.1-2.5 20.8-0.8 3.3 0.7 6.7 3.6 8.3l12.8 7.4c3.7 2.1 5 6.8 2.9 10.4z" fill="#0C2B4A" p-id="20031"></path></svg><i id="LiveTool__tip" class="ex-panel__tip"></i></a>');
(elementOrValue = document.getElementsByClassName("ex-panel__wrap")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "livetool__cell");
(containerOrValue.innerHTML =
      `

        <div class='livetool__cell_title'>

            <span id='vote__title'>弹幕投票</span><span id='vote__show-result'>面板</span>

        </div>

        <div class='livetool__cell_option'>

            <label style="margin-right:10px;"><input id="vote__repeat" type="checkbox">重复投票</label>

            <div class="onoffswitch livetool__cell_switch">

                <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="vote__switch" tabindex="0" checked>

                <label class="onoffswitch-label" for="vote__switch"></label>

            </div>

        </div>

    ` +
      `

        <div class='vote__panel'>

            <select id='vote__select'>

            </select>

            <input style="width:40px;margin-left:10px;" type="button" id="vote__add" value="添加"/>

            <input style="width:40px;margin-left:10px;" type="button" id="vote__del" value="删除"/>

            <label style="margin-left:5px">限时：<input id="vote__time" type="text" placeholder="秒" /></label>

            <div class="vote__option">

                <label>主题：<input id="vote__theme" type="text"/></label>

                <label>选项：<input id="vote__options" type="text" placeholder="用空格隔开每个选项"/></label>

            </div>

        </div>

    `);
(elementOrValue = document.getElementsByClassName("livetool")[0]);
elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]);
{
    let e = document.createElement("div"),
      t =
        ((e.className = "vote__result"),
        (e.innerHTML = `

        <div id="vote__result-theme">投票主题</div>

        <div id="vote__result-close">X</div>

        <div id="vote__result-options"></div>

    `),
        (0, __imports.E)([".layout-Player-main", "main"])),
      a =
        (t && t.insertBefore(e, t.childNodes[0]),
        document.getElementsByClassName("vote__result")[0]);
    if (a) {
      if (typeof __imports.ensureMiuixPanelHeader === "function")
        (0, __imports.ensureMiuixPanelHeader)(a, "弹幕投票结果");
      ((a.onmousedown = function (e) {
        e.stopPropagation();
        let t = e.clientX - a.offsetLeft,
          o = e.clientY - a.offsetTop,
          n,
          i;
        ((document.onmousemove = function (e) {
          (e.stopPropagation(),
            (n = e.clientX - t),
            (i = e.clientY - o),
            (a.style.left = n + "px"),
            (a.style.top = i + "px"));
        }),
          (document.onmouseup = function (e) {
            (e.stopPropagation(),
              (document.onmousemove = null),
              (document.onmouseup = null));
          }));
      }),
        (0, __imports.safeBind)("#vote__result-close", "click", () => {
          document.getElementsByClassName("vote__result")[0].style.display =
            "none";
        }, owner));
    }
  }
((0, __imports.safeBind)("#vote__switch", "click", () => {
    var e = (0, __imports.safeEl)("vote__switch").checked,
      t = document.getElementById("vote__select"),
      t = t.options[t.selectedIndex].text,
      o = __imports.vo[t].options,
      n = __imports.vo[t].time;
    if (1 == e) {
      var i = String(o).split(" ");
      for (let e = 0; e < i.length; e++) __imports.wo[i[e]] = { num: 0, index: e };
      (((0, __imports.safeEl)("vote__repeat").disabled = !0),
        (__imports._o = 0),
        (e = t),
        (t = o),
        ((0, __imports.safeEl)("vote__result-theme").innerText = e),
        ((0, __imports.safeEl)("vote__result-options").innerHTML = ""));
      var a = t.split(" "),
        r = document.getElementById("vote__result-options");
      for (let e = 0; e < a.length; e++) {
        var l = document.createElement("div");
        ((l.className = "vote__option-wrap"),
          (l.innerHTML = `

            <div class="vote__option-choice">${a[e]}</div>

            <div class="vote__option-num"></div>

            <div class="vote__progress">

                <div class="vote__progress-bar"></div>

            </div>

        `),
          r.appendChild(l));
      }
      ((__imports.Eo = document.getElementById("vote__repeat").checked),
        (__imports.bo = !0),
        (__imports.ko = owner.timeout(() => {
          ((__imports.xo = {}),
            (__imports.wo = {}),
            (__imports.bo = !1),
            ((0, __imports.safeEl)("vote__repeat").disabled = !1),
            ((0, __imports.safeEl)("vote__switch").checked = !1));
        }, 1e3 * n)));
      var _vr = document.getElementsByClassName("vote__result")[0];
      if (_vr) {
        _vr.style.display = "block";
        if (typeof __imports.ensureMiuixPanelHeader === "function")
          (0, __imports.ensureMiuixPanelHeader)(_vr, "弹幕投票结果");
      }
    } else
      ((0, __imports.clearTimeout)(__imports.ko),
        (__imports.xo = {}),
        (__imports.wo = {}),
        (__imports.bo = !1),
        ((0, __imports.safeEl)("vote__repeat").disabled = !1));
  }, owner));
((0, __imports.safeBind)("#vote__title", "click", () => {
      var e = document.getElementsByClassName("vote__panel")[0];
      "block" != e.style.display
        ? ((e.style.display = "block") ==
            document.getElementsByClassName("mute__panel")[0].style.display &&
            (document.getElementsByClassName("mute__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("enter__panel")[0].style.display &&
            (document.getElementsByClassName("enter__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("gift__panel")[0].style.display &&
            (document.getElementsByClassName("gift__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("reply__panel")[0].style.display &&
            (document.getElementsByClassName("reply__panel")[0].style.display =
              "none"))
        : (e.style.display = "none");
    }, owner));
((0, __imports.safeEl)("vote__select").onclick = function () {
      var e, t, o;
      0 != this.options.length &&
        ((e = this.options[this.selectedIndex].text),
        (t = __imports.vo[e].options),
        (o = __imports.vo[e].time),
        ((0, __imports.safeEl)("vote__theme").value = e),
        ((0, __imports.safeEl)("vote__options").value = t),
        ((0, __imports.safeEl)("vote__time").value = o));
    });
((0, __imports.safeBind)("#vote__add", "click", () => {
      var e = document.getElementById("vote__select"),
        t = (0, __imports.safeEl)("vote__theme").value,
        o = (0, __imports.safeEl)("vote__options").value,
        n = (0, __imports.safeEl)("vote__time").value;
      "" != t &&
        "" != o &&
        "" != n &&
        ((__imports.vo[t] = { options: o, time: n }),
        e.options.add(new Option(t, "")),
        (0, __imports.Bo)());
    }, owner));
((0, __imports.safeBind)("#vote__del", "click", () => {
      var e = document.getElementById("vote__select"),
        t = e.options[e.selectedIndex].text;
      (delete __imports.vo[t], e.options.remove(e.selectedIndex), (0, __imports.Bo)());
    }, owner));
((0, __imports.safeBind)("#vote__show-result", "click", () => {
      var e = document.getElementsByClassName("vote__result")[0];
      if (e) {
        if ("block" != e.style.display) {
          e.style.display = "block";
          if (typeof __imports.ensureMiuixPanelHeader === "function")
            (0, __imports.ensureMiuixPanelHeader)(e, "弹幕投票结果");
        } else {
          e.style.display = "none";
        }
      }
    }, owner));
((0, __imports.safeEl)("vote__switch").checked = __imports.mo);
containerOrValue = __imports.localStorage.getItem("ExSave_Vote");
if (null != containerOrValue) {
    voteName, savedVotes = JSON.parse(containerOrValue), voteOptions = (__imports.vo = savedVotes), document.getElementById("vote__select");
    for (voteName in savedVotes) savedVotes.hasOwnProperty(voteName) && voteOptions.options.add(new Option(voteName, ""));
  }
(elementOrValue = document.createElement("div"));
(elementOrValue.className = "livetool__cell");
(elementOrValue.innerHTML =
      `

        <div class='livetool__cell_title'>

            <span id='enter__title'>进场欢迎</span>

            <span id='enter__export'>导出</span>

            <span id='enter__import'>导入</span>

        </div>

        <div class='livetool__cell_option'>

            <div class="onoffswitch livetool__cell_switch">

                <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="enter__switch" tabindex="0" checked>

                <label class="onoffswitch-label" for="enter__switch"></label>

            </div>

        </div>

    ` +
      `

        <div class='enter__panel'>

            <select id='enter__select'>

            </select>

            <input style="width:40px;margin-left:10px;" type="button" id="enter__add" value="添加"/>

            <input style="width:40px;margin-left:10px;" type="button" id="enter__del" value="删除"/>

            <div class="enter__option">

                <label>等级≥<input id="enter__level" type="text" value="1"/></label>

                <label>当前欢迎词：<input id="enter__word" type="text" placeholder="欢迎<id>光临直播间"/></label>

            </div>

        </div>

    `);
(containerOrValue = document.getElementsByClassName("livetool")[0]);
(containerOrValue && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]));
((0, __imports.safeBind)("#enter__export", "click", () => {
      ((0, __imports.GM_setClipboard)(JSON.stringify(__imports.S)),
        (0, __imports.T)("【进场欢迎】导出完毕，已复制到剪贴板", "success"));
    }, owner));
((0, __imports.safeBind)("#enter__import", "click", () => {
      __imports.Gr.prompt({
        title: "请输入json文本（会覆盖原来的设置）",
        okBtn: "确定",
        onConfirm: function (e) {
          var t = document.getElementById("enter__select"),
            e = JSON.parse(e || "{}") || {};
          if ("object" == typeof e) {
            for (var o in ((__imports.S = { ...e }), (t.options.length = 0), __imports.S))
              __imports.S.hasOwnProperty(o) && t.options.add(new Option(o, ""));
            (0, __imports.$t)();
          }
          (0, __imports.T)("【进场欢迎】导入完毕", "success");
        },
        onCancel: function (e) {},
      });
    }, owner));
((0, __imports.safeBind)("#enter__switch", "click", () => {
      var o = (0, __imports.safeEl)("enter__switch").checked;
      __imports.Kt = 1 == o;
      {
        let e = [],
          t = __imports.localStorage.getItem("ExSave_isEnter");
        var n = (e =
            null != t && "rooms" in (n = JSON.parse(t)) == 1
              ? n.rooms
              : e).indexOf(__imports.B),
          o = (1 == __imports.Kt ? -1 == n && e.push(__imports.B) : e.splice(n, 1), { rooms: e });
        __imports.localStorage.setItem("ExSave_isEnter", JSON.stringify(o));
      }
    }, owner));
((0, __imports.safeBind)("#enter__title", "click", () => {
      var e = document.getElementsByClassName("enter__panel")[0];
      "block" != e.style.display
        ? ((e.style.display = "block") ==
            document.getElementsByClassName("mute__panel")[0].style.display &&
            (document.getElementsByClassName("mute__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("reply__panel")[0].style.display &&
            (document.getElementsByClassName("reply__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("gift__panel")[0].style.display &&
            (document.getElementsByClassName("gift__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("vote__panel")[0].style.display &&
            (document.getElementsByClassName("vote__panel")[0].style.display =
              "none"))
        : (e.style.display = "none");
    }, owner));
((0, __imports.safeEl)("enter__select").onclick = function () {
      var e, t;
      0 != this.options.length &&
        ((e = this.options[this.selectedIndex].text),
        (t = __imports.S[e].enter),
        ((0, __imports.safeEl)("enter__word").value = e),
        ((0, __imports.safeEl)("enter__level").value = t),
        __imports.localStorage.setItem("ExSave_LastEnterWord", e));
    });
((0, __imports.safeBind)("#enter__add", "click", () => {
      document.getElementById("enter__select");
      var t = (0, __imports.safeEl)("enter__word").value,
        o = (0, __imports.safeEl)("enter__level").value;
      if ("" != t && "" != o) {
        let e = !1;
        for (var n of __imports.S)
          if (Number(o) === Number(n.level)) {
            e = !0;
            break;
          }
        e
          ? (0, __imports.T)("【进场欢迎】等级已存在", "error")
          : (__imports.S.push({ level: o, word: t }),
            __imports.S.sort((e, t) => t.level - e.level),
            (0, __imports.eo)(),
            (0, __imports.$t)());
      }
    }, owner));
((0, __imports.safeBind)("#enter__del", "click", () => {
      var e = document.getElementById("enter__select");
      (e.options[e.selectedIndex].text,
        __imports.S.splice(e.selectedIndex, 1),
        __imports.S.sort((e, t) => t.level - e.level),
        (0, __imports.eo)(),
        (0, __imports.$t)());
    }, owner));
(elementOrValue = __imports.localStorage.getItem("ExSave_Enter"));
if ("" != elementOrValue) {
    if ((document.getElementById("enter__select"), null != elementOrValue)) {
      let e = JSON.parse(elementOrValue);
      (Array.isArray(e) || ((e = []), (0, __imports.$t)()), (__imports.S = e), (0, __imports.eo)());
    }
    if (null != (elementOrValue = __imports.localStorage.getItem("ExSave_isEnter"))) {
      elementOrValue = JSON.parse(elementOrValue);
      let e = [];
      ("rooms" in elementOrValue == 1 && (e = elementOrValue.rooms), (__imports.Kt = -1 != e.indexOf(__imports.B)));
    } else __imports.Kt = !1;
    (0, __imports.safeEl)("enter__switch").checked = __imports.Kt;
  }
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "livetool__cell");
(containerOrValue.innerHTML =
      `

        <div class='livetool__cell_title'>

            <span id='mute__title'>关键词禁言</span>

            <span id='mute__idlist'>名单</span>

            <span id='mute__export'>导出</span>

            <span id='mute__import'>导入</span>

        </div>

        <div class='livetool__cell_option'>

            <div class="onoffswitch livetool__cell_switch">

                <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="mute__switch" tabindex="0" checked>

                <label class="onoffswitch-label" for="mute__switch"></label>

            </div>

        </div>

    ` +
      `

        <div class='mute__panel'>

            <select id='mute__select'>

            </select>

            <input style="width:40px;margin-left:10px;" type="button" id="mute__add" value="添加"/>

            <input style="width:40px;margin-left:10px;" type="button" id="mute__del" value="删除"/>

            <input style="width:65px;margin-left:10px;" type="button" id="mute__delmute" value="一键解禁"/>

            <div class="mute__option">

                <label>词：<input id="mute__word" type="text" placeholder="re(式)=结果"/></label>

                <label>次数：<input id="mute__count" type="number" value="5"/></label>

                <label>时间：

                    <select id='mute__time'>

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

                </label>

            </div>

        </div>

    `);
(elementOrValue = document.getElementsByClassName("livetool")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
((0, __imports.safeBind)("#mute__export", "click", () => {
      ((0, __imports.GM_setClipboard)(JSON.stringify(__imports.L)),
        (0, __imports.T)("【关键词禁言】导出完毕，已复制到剪贴板", "success"));
    }, owner));
((0, __imports.safeBind)("#mute__import", "click", () => {
      __imports.Gr.prompt({
        title: "请输入json文本（会覆盖原来的设置）",
        okBtn: "确定",
        onConfirm: function (e) {
          var t = document.getElementById("mute__select"),
            e = JSON.parse(e || "{}") || {};
          if ("object" == typeof e) {
            for (var o in ((__imports.L = { ...e }), (t.options.length = 0), __imports.L))
              __imports.L.hasOwnProperty(o) && t.options.add(new Option(o, ""));
            (0, __imports.ro)();
          }
          (0, __imports.T)("【关键词禁言】导入完毕", "success");
        },
        onCancel: function (e) {},
      });
    }, owner));
((0, __imports.safeBind)("#mute__idlist", "click", () => {
      if (0 == __imports.ao.length) (0, __imports.T)("暂无禁言名单", "warning");
      else {
        console.log("【禁言名单】");
        for (let e = 0; e < __imports.ao.length; e++) {
          var t = __imports.ao[e];
          console.log(
            "id:【" +
              t.id +
              "】 | uid:" +
              t.uid +
              " | 弹幕:" +
              t.barrage +
              " | 检测次数:" +
              t.count +
              " | 禁言时长:" +
              t.time +
              "分钟 | 禁言时间:" +
              t.ts,
          );
        }
        (0, __imports.T)("禁言名单已经输出在控制台，请按F12查看", "success");
      }
    }, owner));
((0, __imports.safeBind)("#mute__delmute", "click", async () => {
      if (0 == __imports.ao.length) (0, __imports.T)("暂无禁言名单", "warning");
      else if (1 == confirm("是否解禁名单上所有的id？")) {
        for (let e = 0; e < __imports.ao.length; e++) {
          var t = __imports.ao[e];
          await ((e, o) =>
            new Promise((t) => {
              (0, __imports.fetch)("https://www.douyu.com/room/roomSetting/deleteMuteUser", {
                method: "POST",
                mode: "no-cors",
                credentials: "include",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: "room_id=" + e + "&uid=" + o,
              })
                .then(owner.guard((e) => e.json()))
                .then(owner.guard((e) => {
                  t(e);
                }));
            }))(__imports.B, t.uid);
        }
        (0, __imports.T)("解除禁言完毕", "success");
      }
    }, owner));
((0, __imports.safeBind)("#mute__switch", "click", () => {
      var o = (0, __imports.safeEl)("mute__switch").checked;
      __imports.no = 1 == o;
      {
        let e = [],
          t = __imports.localStorage.getItem("ExSave_isMute");
        var n = (e =
            null != t && "rooms" in (n = JSON.parse(t)) == 1
              ? n.rooms
              : e).indexOf(__imports.B),
          o = (1 == __imports.no ? -1 == n && e.push(__imports.B) : e.splice(n, 1), { rooms: e });
        __imports.localStorage.setItem("ExSave_isMute", JSON.stringify(o));
      }
    }, owner));
((0, __imports.safeBind)("#mute__title", "click", () => {
      var e = document.getElementsByClassName("mute__panel")[0];
      "block" != e.style.display
        ? ((e.style.display = "block") ==
            document.getElementsByClassName("reply__panel")[0].style.display &&
            (document.getElementsByClassName("reply__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("enter__panel")[0].style.display &&
            (document.getElementsByClassName("enter__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("gift__panel")[0].style.display &&
            (document.getElementsByClassName("gift__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("vote__panel")[0].style.display &&
            (document.getElementsByClassName("vote__panel")[0].style.display =
              "none"))
        : (e.style.display = "none");
    }, owner));
((0, __imports.safeEl)("mute__select").onclick = function () {
      if (0 != this.options.length) {
        var e = this.options[this.selectedIndex].text,
          t = __imports.L[e].count,
          o = __imports.L[e].time,
          e =
            (((0, __imports.safeEl)("mute__word").value = e),
            ((0, __imports.safeEl)("mute__count").value = t),
            "mute__time"),
          n = o,
          i = document.getElementById(e);
        for (let e = 0; e < i.options.length; e++)
          if (i.options[e].value == n) {
            i.options[e].selected = !0;
            break;
          }
      }
    });
((0, __imports.safeBind)("#mute__add", "click", () => {
      var e = document.getElementById("mute__time"),
        t = document.getElementById("mute__select"),
        o = (0, __imports.safeEl)("mute__word").value,
        n = (0, __imports.safeEl)("mute__count").value,
        e = e.options[e.selectedIndex].value;
      "" != o &&
        ((__imports.L[o] = { count: n, time: e }),
        t.options.add(new Option(o, "")),
        (0, __imports.ro)());
    }, owner));
((0, __imports.safeBind)("#mute__del", "click", () => {
      var e = document.getElementById("mute__select"),
        t = e.options[e.selectedIndex].text;
      (delete __imports.L[t], e.options.remove(e.selectedIndex), (0, __imports.ro)());
    }, owner));
((async () => {
      var t = __imports.localStorage.getItem("ExSave_Mute");
      if (null != t) {
        var e,
          o = JSON.parse(t),
          n = ((__imports.L = o), document.getElementById("mute__select"));
        for (e in o) o.hasOwnProperty(e) && n.options.add(new Option(e, ""));
      }
      if (null != (t = __imports.localStorage.getItem("ExSave_isMute"))) {
        t = JSON.parse(t);
        let e = [];
        ("rooms" in t == 1 && (e = t.rooms), (__imports.no = -1 != e.indexOf(__imports.B)));
      } else __imports.no = !1;
      (0, __imports.safeEl)("mute__switch").checked = __imports.no;
    })());
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "livetool__cell");
(containerOrValue.innerHTML =
      `

        <div class='livetool__cell_title'>

            <span id='gift__title'>自动谢礼物</span>

            <span id='gift__export'>导出</span>

            <span id='gift__import'>导入</span>

        </div>

        <div class='livetool__cell_option'>

            <div class="onoffswitch livetool__cell_switch">

                <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="gift__switch" tabindex="0" checked>

                <label class="onoffswitch-label" for="gift__switch"></label>

            </div>

        </div>

    ` +
      `

        <div class='gift__panel'>

            <select id='gift__select'>

            </select>

            <input style="width:40px;margin-left:10px;" type="button" id="gift__add" value="添加"/>

            <input style="width:40px;margin-left:10px;" type="button" id="gift__del" value="删除"/>

            <input style="width:64px;margin-left:10px;" type="button" id="gift__template" value="生成模板"/>

            <div class="gift__option">

                <label><a id="reply__show_gid" style="color:blue;" href="javascript:void(0);">礼物id：</a><input id="gift__giftId" type="text"/></label>

                <label>回复：<input id="gift__reply" type="text" placeholder="<id>=用户名 <cnt>个数"/></label>

            </div>

        </div>

    `);
(elementOrValue = document.getElementsByClassName("livetool")[0]);
if (
    (elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]),
    (0, __imports.safeBind)("#reply__show_gid", "click", () => {
      (console.log(`

背包礼物：http://webconf.douyucdn.cn/resource/common/prop_gift_list/prop_gift_config.json

鱼翅礼物：http://open.douyucdn.cn/api/RoomApi/room/4042402

`),
        (0, __imports.T)("请按F12到控制台(console)查看礼物id", "success"));
    }, owner),
    (0, __imports.safeBind)("#gift__switch", "click", () => {
      var o = (0, __imports.safeEl)("gift__switch").checked;
      __imports.to = 1 == o;
      {
        let e = [],
          t = __imports.localStorage.getItem("ExSave_isGift");
        var n = (e =
            null != t && "rooms" in (n = JSON.parse(t)) == 1
              ? n.rooms
              : e).indexOf(__imports.B),
          o = (1 == __imports.to ? -1 == n && e.push(__imports.B) : e.splice(n, 1), { rooms: e });
        __imports.localStorage.setItem("ExSave_isGift", JSON.stringify(o));
      }
    }, owner),
    (0, __imports.safeBind)("#gift__title", "click", () => {
      var e = document.getElementsByClassName("gift__panel")[0];
      "block" != e.style.display
        ? ((e.style.display = "block") ==
            document.getElementsByClassName("mute__panel")[0].style.display &&
            (document.getElementsByClassName("mute__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("enter__panel")[0].style.display &&
            (document.getElementsByClassName("enter__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("reply__panel")[0].style.display &&
            (document.getElementsByClassName("reply__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("vote__panel")[0].style.display &&
            (document.getElementsByClassName("vote__panel")[0].style.display =
              "none"))
        : (e.style.display = "none");
    }, owner),
    ((0, __imports.safeEl)("gift__select").onclick = function () {
      var e, t;
      0 != this.options.length &&
        ((e = this.options[this.selectedIndex].text),
        (t = __imports.M[e].reply),
        ((0, __imports.safeEl)("gift__giftId").value = e),
        ((0, __imports.safeEl)("gift__reply").value = t));
    }),
    (0, __imports.safeBind)("#gift__add", "click", () => {
      var e = document.getElementById("gift__select"),
        t = (0, __imports.safeEl)("gift__giftId").value,
        o = (0, __imports.safeEl)("gift__reply").value;
      "" != t &&
        ((__imports.M[t] = { reply: o }), e.options.add(new Option(t, "")), (0, __imports.oo)());
    }, owner),
    (0, __imports.safeBind)("#gift__del", "click", () => {
      var e = document.getElementById("gift__select"),
        t = e.options[e.selectedIndex].text;
      (delete __imports.M[t], e.options.remove(e.selectedIndex), (0, __imports.oo)());
    }, owner),
    (0, __imports.safeBind)("#gift__export", "click", () => {
      ((0, __imports.GM_setClipboard)(JSON.stringify(__imports.M)),
        (0, __imports.T)("【自动谢礼物】导出完毕，已复制到剪贴板", "success"));
    }, owner),
    (0, __imports.safeBind)("#gift__import", "click", () => {
      __imports.Gr.prompt({
        title: "请输入json文本（会覆盖原来的设置）",
        okBtn: "确定",
        onConfirm: function (e) {
          var t = document.getElementById("gift__select"),
            e = JSON.parse(e || "{}") || {};
          if ("object" == typeof e) {
            for (var o in ((__imports.M = { ...e }), (t.options.length = 0), __imports.M))
              __imports.M.hasOwnProperty(o) && t.options.add(new Option(o, ""));
            (0, __imports.oo)();
          }
          (0, __imports.T)("【自动谢礼物】导入完毕", "success");
        },
        onCancel: function (e) {},
      });
    }, owner),
    (0, __imports.safeBind)("#gift__template", "click", () => {
      (async () => {
        var e,
          t = {},
          o = await new Promise((t) => {
            (0, __imports.GM_xmlhttpRequest)({
              method: "GET",
              url: "http://open.douyucdn.cn/api/RoomApi/room/" + __imports.B,
              responseType: "json",
              onload: function (e) {
                e = e.response;
                t(e);
              },
            });
          });
        for (let e = 0; e < o.data.gift.length; e++) {
          var n = o.data.gift[e];
          t[n.id] = { reply: `感谢<id>赠送的${n.name}x<cnt>` };
        }
        let i = await new Promise((t) => {
            (0, __imports.GM_xmlhttpRequest)({
              method: "GET",
              url: "http://webconf.douyucdn.cn/resource/common/prop_gift_list/prop_gift_config.json",
              responseType: "text",
              onload: function (e) {
                e = e.response;
                t(e);
              },
            });
          }),
          a = {};
        for (e in ((i = (i = i.substring(0, i.length - 2)).replace(
          "DYConfigCallback(",
          "",
        )),
        (i = JSON.parse(i || "{}") || {}).data))
          a[e] = { reply: `感谢<id>赠送的${i.data[e].name}x<cnt>` };
        var r = {
          开通钻粉: { reply: "感谢<id>开通钻粉" },
          续费钻粉: { reply: "感谢<id>续费钻粉" },
        };
        ((r = { ...t, ...a, ...r }),
          (0, __imports.GM_setClipboard)(JSON.stringify(r)),
          (0, __imports.T)(
            "【自动谢礼物】礼物模板生成完毕，已复制到剪贴板，可直接导入",
            "success",
          ));
      })();
    }, owner),
    null != (containerOrValue = __imports.localStorage.getItem("ExSave_Gift")))
  ) {
    replyName, savedReplies = JSON.parse(containerOrValue), replyOptions = (__imports.M = savedReplies), document.getElementById("gift__select");
    for (replyName in savedReplies) savedReplies.hasOwnProperty(replyName) && replyOptions.options.add(new Option(replyName, ""));
  }
if (null != (containerOrValue = __imports.localStorage.getItem("ExSave_isGift"))) {
    containerOrValue = JSON.parse(containerOrValue);
    let e = [];
    ("rooms" in containerOrValue == 1 && (e = containerOrValue.rooms), (__imports.to = -1 != e.indexOf(__imports.B)));
  } else __imports.to = !1;
(0, __imports.safeEl)("gift__switch").checked = __imports.to;
(elementOrValue = document.createElement("div"));
(elementOrValue.className = "livetool__cell");
(elementOrValue.innerHTML =
      `

        <div class='livetool__cell_title'>

            <span id='reply__title'>关键词回复</span>

            <span id='reply__export'>导出</span>

            <span id='reply__import'>导入</span>

        </div>

        <div class='livetool__cell_option'>

            <div class="onoffswitch livetool__cell_switch">

                <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="reply__switch" tabindex="0" checked>

                <label class="onoffswitch-label" for="reply__switch"></label>

            </div>

        </div>

    ` +
      `

        <div class='reply__panel'>

            <select id='reply__select'>

            </select>

            <input style="width:40px;margin-left:10px;" type="button" id="reply__add" value="添加"/>

            <input style="width:40px;margin-left:10px;" type="button" id="reply__del" value="删除"/>

            <label style="margin-left:5px">CD：<input id="reply__time" type="text" placeholder="秒" /></label>

            <div class="reply__option">

                <label>词：<input id="reply__word" type="text" placeholder="re(式)=结果"/></label>

                <label>回复：<input id="reply__reply" type="text" placeholder="<id>用户名 <txt>弹幕"/></label>

            </div>

        </div>

    `);
(containerOrValue = document.getElementsByClassName("livetool")[0]);
(containerOrValue && containerOrValue.insertBefore(elementOrValue, containerOrValue.childNodes[0]));
((0, __imports.safeBind)("#reply__export", "click", () => {
      ((0, __imports.GM_setClipboard)(JSON.stringify(__imports.A)),
        (0, __imports.T)("【关键词回复】导出完毕，已复制到剪贴板", "success"));
    }, owner));
((0, __imports.safeBind)("#reply__import", "click", () => {
      __imports.Gr.prompt({
        title: "请输入json文本（会覆盖原来的设置）",
        okBtn: "确定",
        onConfirm: function (e) {
          var t = document.getElementById("reply__select"),
            e = JSON.parse(e || "{}") || {};
          if ("object" == typeof e) {
            for (var o in ((__imports.A = { ...e }), (t.options.length = 0), __imports.A))
              __imports.A.hasOwnProperty(o) && t.options.add(new Option(o, ""));
            (0, __imports.ho)();
          }
          (0, __imports.T)("【关键词回复】导入完毕", "success");
        },
        onCancel: function (e) {},
      });
    }, owner));
((0, __imports.safeBind)("#reply__switch", "click", () => {
      __imports.go = String((0, __imports.safeEl)("reply__time").value) || 0;
      var o = (0, __imports.safeEl)("reply__switch").checked;
      __imports.mo = 1 == o;
      {
        let e = [],
          t = __imports.localStorage.getItem("ExSave_isReply");
        var n = (e =
            null != t && "rooms" in (n = JSON.parse(t)) == 1
              ? n.rooms
              : e).indexOf(__imports.B),
          o = (1 == __imports.mo ? -1 == n && e.push(__imports.B) : e.splice(n, 1), { rooms: e });
        __imports.localStorage.setItem("ExSave_isReply", JSON.stringify(o));
      }
      ((o = (0, __imports.safeEl)("reply__time").value),
        __imports.localStorage.setItem("ExSave_ReplyCd", o));
    }, owner));
((0, __imports.safeBind)("#reply__title", "click", () => {
      var e = document.getElementsByClassName("reply__panel")[0];
      "block" != e.style.display
        ? ((e.style.display = "block") ==
            document.getElementsByClassName("mute__panel")[0].style.display &&
            (document.getElementsByClassName("mute__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("enter__panel")[0].style.display &&
            (document.getElementsByClassName("enter__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("gift__panel")[0].style.display &&
            (document.getElementsByClassName("gift__panel")[0].style.display =
              "none"),
          "block" ==
            document.getElementsByClassName("vote__panel")[0].style.display &&
            (document.getElementsByClassName("vote__panel")[0].style.display =
              "none"))
        : (e.style.display = "none");
    }, owner));
((0, __imports.safeEl)("reply__select").onclick = function () {
      var e, t;
      0 != this.options.length &&
        ((e = this.options[this.selectedIndex].text),
        (t = __imports.A[e].reply),
        ((0, __imports.safeEl)("reply__word").value = e),
        ((0, __imports.safeEl)("reply__reply").value = t));
    });
((0, __imports.safeBind)("#reply__add", "click", () => {
      var e = document.getElementById("reply__select"),
        t = (0, __imports.safeEl)("reply__word").value,
        o = (0, __imports.safeEl)("reply__reply").value;
      "" != t &&
        ((__imports.A[t] = { reply: o }), e.options.add(new Option(t, "")), (0, __imports.ho)());
    }, owner));
((0, __imports.safeBind)("#reply__del", "click", () => {
      var e = document.getElementById("reply__select"),
        t = e.options[e.selectedIndex].text;
      (delete __imports.A[t], e.options.remove(e.selectedIndex), (0, __imports.ho)());
    }, owner));
(elementOrValue = __imports.localStorage.getItem("ExSave_Reply"));
if (null != elementOrValue) {
    welcomeName, savedWelcomes = JSON.parse(elementOrValue), welcomeOptions = (__imports.A = savedWelcomes), document.getElementById("reply__select");
    for (welcomeName in savedWelcomes) savedWelcomes.hasOwnProperty(welcomeName) && welcomeOptions.options.add(new Option(welcomeName, ""));
  }
if (null != (elementOrValue = __imports.localStorage.getItem("ExSave_isReply"))) {
    containerOrValue = JSON.parse(elementOrValue);
    let e = [];
    ("rooms" in containerOrValue == 1 && (e = containerOrValue.rooms), (__imports.mo = -1 != e.indexOf(__imports.B)));
  } else __imports.mo = !1;
((0, __imports.safeEl)("reply__switch").checked = __imports.mo);
(null != (elementOrValue = __imports.localStorage.getItem("ExSave_ReplyCd")) &&
      ((0, __imports.safeEl)("reply__time").value = elementOrValue));
(containerOrValue = document.createElement("div"));
(containerOrValue.className = "livetool__Treasure");
(containerOrValue.id = "Ex_Geetest");
(elementOrValue = document.getElementsByClassName("Barrage-main")[0]);
(elementOrValue && elementOrValue.insertBefore(containerOrValue, elementOrValue.childNodes[0]));
(owner.interval(() => {
      var e = Number((__imports.Xt / 5) * 60).toFixed(0),
        t = ((__imports.Xt = 0), document.getElementsByClassName("ChatSend-txt")[0]),
        e = `弹幕时速：${e}条/分`;
      ((t.placeholder = e + " 按↑↓查看历史弹幕 视频ctrl+滚轮缩放"),
        t.setAttribute("data-placeholder", e));
    }, 5e3));
(new __imports.DomMutationSubscription(".layout-Player-rankAll", !1, (e) => {
      0 < document.getElementsByClassName("RankAllMain-container").length &&
        0 < Object.keys(__imports.so.all).length &&
        (0, __imports.co)(
          "all",
          document.querySelectorAll(
            ".layout-Player-rankAll .ChatRankWeek-listItem--nickname",
          ),
        );
    }, owner));
((0, __imports.initDanmakuBlockedCheck)());
((0, __imports.safeBind)(".livetool-icon", "click", function () {
      (0, __imports.openFeaturePanel)("直播间工具");
    }, owner));
(new __imports.nl(__imports.B, (e) => {
      if ("rss" == (0, __imports.N)((i = e))) {
        let e = (0, __imports.v)(i, "rid@=", "/");
        var t = (0, __imports.v)(i, "ss@=", "/"),
          i = (0, __imports.v)(i, "ivl@=", "/");
        "1" == t &&
          "0" == i &&
          (0, __imports.X)("开播提醒", "直播间：" + e + "开播了，点我签到", () => {
            (0, __imports.$n)(e);
          });
      }
      (async (t) => {
        if (0 != __imports.no && "chatmsg" == (0, __imports.N)(t)) {
          var o = (0, __imports.v)(t, "uid@=", "/");
          if (o != __imports.I) {
            var n,
              i = (0, __imports.v)(t, "nn@=", "/"),
              a = (0, __imports.v)(t, "txt@=", "/");
            let e = !1;
            for (n in __imports.L)
              if ("" != n)
                if (
                  (-1 != n.indexOf("re(")
                    ? ((s = (0, __imports.v)(n, "re(", ")=")),
                      1 < (d = n.split("=")).length &&
                        ((d = d[1]),
                        0 < (s = new RegExp(s, "g").exec(a)).length) &&
                        (e = s[0] == d))
                    : (e = -1 != String(a).indexOf(n)),
                  1 == e)
                ) {
                  var r,
                    l,
                    s = __imports.L[n].count,
                    d = __imports.L[n].time;
                  __imports.io.hasOwnProperty(i)
                    ? ((r = Number(__imports.io[i].count) + 1),
                      s <= r
                        ? (await (0, __imports.lo)(__imports.B, i, d),
                          (0, __imports.X)(
                            "禁言信息",
                            "【" + i + "】已被禁言" + d + "分钟\n弹幕：" + a,
                            () => {},
                          ),
                          (l = {
                            id: i,
                            uid: o,
                            barrage: a,
                            time: d,
                            count: 1,
                            ts: String(
                              (0, __imports.k)("yyyy年MM月dd日hh时mm分ss秒 ", new Date()),
                            ),
                          }),
                          __imports.ao.push(l),
                          (__imports.io[i].count = 0))
                        : (__imports.io[i].count = String(r)))
                    : s <= 1
                      ? (await (0, __imports.lo)(__imports.B, i, d),
                        (0, __imports.X)(
                          "禁言信息",
                          "【" + i + "】已被禁言" + d + "分钟\n弹幕：" + a,
                          () => {},
                        ),
                        (l = {
                          id: i,
                          uid: o,
                          barrage: a,
                          time: d,
                          count: 1,
                          ts: String(
                            (0, __imports.k)("yyyy年MM月dd日hh时mm分ss秒 ", new Date()),
                          ),
                        }),
                        __imports.ao.push(l))
                      : (__imports.io[i] = { uid: o, count: 1 });
                  break;
                }
          }
        }
      })(e);
      var o,
        n,
        a,
        t = e;
      if (0 != __imports.mo && "chatmsg" == (0, __imports.N)(t)) {
        var i = (0, __imports.v)(t, "uid@=", "/");
        if (i != __imports.I) {
          var r,
            l,
            s = (0, __imports.v)(t, "nn@=", "/"),
            d = (0, __imports.v)(t, "txt@=", "/");
          let e = !1;
          for (r in __imports.A)
            if ("" != r)
              if (
                (-1 != r.indexOf("re(")
                  ? ((c = (0, __imports.v)(r, "re(", ")=")),
                    1 < (l = r.split("=")).length &&
                      ((l = l[1]),
                      0 < (c = new RegExp(c, "g").exec(d)).length) &&
                      (e = c[0] == l))
                  : (e = -1 != String(d).indexOf(r)),
                1 == e)
              ) {
                var c = __imports.A[r].reply;
                ((c = String(c).replace(/<id>/g, s)),
                  (c = String(c).replace(/<txt>/g, d)),
                  0 == __imports.uo &&
                    ((0, __imports.we)(c), 0 < __imports.go) &&
                    ((__imports.uo = !0),
                    owner.timeout(() => {
                      __imports.uo = !1;
                    }, 1e3 * __imports.go)));
                break;
              }
        }
      }
      ((i = e),
        0 != __imports.to &&
          ("dgb" === (p = (0, __imports.N)(i))
            ? (0, __imports.v)(i, "uid@=", "/") != __imports.I &&
              ((o = (0, __imports.v)(i, "nn@=", "/")),
              (a = (0, __imports.v)(i, "gfid@=", "/")),
              (n = (0, __imports.v)(i, "gfcnt@=", "/")),
              a in __imports.M) &&
              ((a = __imports.M[a].reply),
              (a = String(a).replace(/<id>/g, o)),
              (0, __imports.we)((a = String(a).replace(/<cnt>/g, n))))
            : ("dfobc" !== p && "dfrbc" !== p) ||
              ((0, __imports.v)(i, "uid@=", "/") != __imports.I &&
                ((o = (0, __imports.v)(i, "nick@=", "/")),
                (n = "dfobc" === p ? "开通钻粉" : "续费钻粉") in __imports.M) &&
                ((a = __imports.M[n].reply),
                (a = String(a).replace(/<id>/g, o)),
                (0, __imports.we)((a = String(a).replace(/<cnt>/g, "1")))))));
      var i = e;
      if (0 != __imports.St && "tsboxb" == (0, __imports.N)(i)) {
        var p = (0, __imports.v)(i, "ot@=", "/");
        let e = (0, __imports.v)(i, "rpid@=", "/"),
          t = (0, __imports.v)(i, "rid@=", "/"),
          o = (0, __imports.x)("dy_did");
        ((i = 1e3 * (Number(p) - Math.floor(Date.now() / 1e3)) + (0, __imports.Mt)()), __imports.fo++);
        p = document.createElement("div");
        let n = "Ex_Geetest_no" + String(__imports.fo);
        ((p.id = n),
          document.getElementById("Ex_Geetest").appendChild(p),
          owner.timeout(() => {
            (0, __imports.yo)(t, e, o, n);
          }, i));
      }
      var i = e;
      if (0 != __imports.Kt && "uenter" == (0, __imports.N)(i)) {
        var m = (0, __imports.v)(i, "uid@=", "/");
        if (m != __imports.I) {
          var u,
            g = (0, __imports.v)(i, "nn@=", "/"),
            h = (0, __imports.v)(i, "level@=", "/");
          for (u of __imports.S)
            if (Number(h) >= Number(u.level)) {
              (0, __imports.we)(String(u.word).replace(/<id>/g, g));
              break;
            }
        }
      }
      ((m = e),
        0 != __imports.bo &&
          "chatmsg" == (0, __imports.N)(m) &&
          ((i = (0, __imports.v)(m, "uid@=", "/")),
          (m = (0, __imports.v)(m, "txt@=", "/")),
          __imports.Eo
            ? Object(__imports.wo).hasOwnProperty(m) && (__imports.wo[m].num++, __imports._o++, (0, __imports.Io)())
            : 0 == Object(__imports.xo).hasOwnProperty(i) &&
              Object(__imports.wo).hasOwnProperty(m) &&
              ((__imports.xo[i] = 0), __imports.wo[m].num++, __imports._o++, (0, __imports.Io)())),
        "chatmsg" == (0, __imports.N)(e) && __imports.Xt++,
        "ranklist" == (0, __imports.N)((i = e)) &&
          ((i = (0, __imports.el)(i)).list_day &&
            ((__imports.so.day = (0, __imports.po)(i.list_day)),
            (0, __imports.co)(
              "day",
              document.querySelectorAll(
                ".layout-Player-rank .ChatDayRank .ChatRankWeek-listItem--nickname",
              ),
            )),
          i.list &&
            ((__imports.so.week = (0, __imports.po)(i.list)),
            (0, __imports.co)(
              "week",
              document.querySelectorAll(
                ".layout-Player-rank .ChatRankWeek .ChatRankWeek-listItem--nickname",
              ),
            )),
          i.list_all && (__imports.so.all = (0, __imports.po)(i.list_all)),
          (0, __imports.co)()),
        "chatmsg" == (0, __imports.N)((i = e)) &&
          (typeof window.__onDouyuExChatmsg === "function" &&
            window.__onDouyuExChatmsg(i),
          i.includes(__imports.W) && (__imports.Jt = i)),
        "oni" == (0, __imports.N)((i = e)) &&
          (i = (0, __imports.v)(i, "vn@=", "/")) &&
          ((__imports.j.noble_count = i),
          (e = document.getElementById("real-audience__noble"))) &&
          (e.innerText = (0, __imports.sn)(i)));
    }));
(0, __imports.mountVideoToolbar)(owner);
}

}
