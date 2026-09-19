function* (__imports) {
yield {"mountVideoToolbar": { get: () => mountVideoToolbar, set: value => { mountVideoToolbar = value; } }};
// Room assembly section; dependencies are captured per mount, in original order.
function mountVideoToolbar(owner) {
    let s = owner.interval(() => {
      if ((0, __imports.E)([".right-e7ea5d", ".right-17e251"])) {
        ((0, __imports.clearInterval)(s),
          (__imports.V = document.querySelector(".layout-Player-videoEntity video")),
          (document.getElementsByClassName("disable-23f484")[0].innerHTML =
            "DouyuEx-RL_" + __imports.P));
        var e = document.createElement("div"),
          t =
            ((e.id = "ex-vtoolbar-menu"),
            (e.className = "vtoolbar-menu"),
            (e.innerHTML = `

        <button type="button" class="vtoolbar-menu__trigger" title="DouyuEx-RL Ver${__imports.P}" aria-expanded="false" aria-haspopup="true">

            ${__imports.fr}

        </button>

        <div class="vtoolbar-menu__dropdown" role="menu" aria-label="DouyuEx-RL Ver${__imports.P}">

            <button type="button" class="vtoolbar-menu__item" id="vtoolbar-menu-joysound" role="menuitem">

                <span class="vtoolbar-menu__item-icon" id="vtoolbar-joysound-icon"></span>

                <span class="vtoolbar-menu__item-label">Joysound 音效</span>

                <span class="vtoolbar-menu__switch" id="vtoolbar-joysound-switch" aria-hidden="true">

                    <span class="vtoolbar-menu__switch-thumb"></span>

                </span>

            </button>

            <button type="button" class="vtoolbar-menu__item vtoolbar-menu__item--filter" id="vtoolbar-menu-filter" role="menuitem" aria-expanded="false">

                <span class="vtoolbar-menu__item-icon">${__imports.yr}</span>

                <span class="vtoolbar-menu__item-label">画面滤镜</span>

                ${typeof __imports.vtoolbarChevronSvg !== "undefined" ? __imports.vtoolbarChevronSvg : ""}

            </button>

            <button type="button" class="vtoolbar-menu__item" id="vtoolbar-menu-copy-live" role="menuitem">

                <span class="vtoolbar-menu__item-icon">${__imports.vr}</span>

                <span class="vtoolbar-menu__item-label">复制直播流地址</span>

            </button>

            <button type="button" class="vtoolbar-menu__item" id="vtoolbar-menu-audio-line" role="menuitem">

                <span class="vtoolbar-menu__item-icon vtoolbar-menu__item-icon--compact">${__imports.xr}</span>

                <span class="vtoolbar-menu__item-label">切换音频线路</span>

            </button>

            <button type="button" class="vtoolbar-menu__item" id="vtoolbar-menu-enhanced-pip" role="menuitem">

                <span class="vtoolbar-menu__item-icon">${__imports.wr}</span>

                <span class="vtoolbar-menu__item-label">加强版画中画</span>

            </button>

            <div class="vtoolbar-menu__divider" role="separator"></div>

            <button type="button" class="vtoolbar-menu__item" id="vtoolbar-menu-expanel" role="menuitem">

                <span class="vtoolbar-menu__item-icon">${__imports.fr}</span>

                <span class="vtoolbar-menu__item-label">DouyuEx 工具条</span>

            </button>

        </div>

        <div class="vtoolbar-menu__filter-host" id="ex-vtoolbar-filter-host"></div>

    `),
            (0, __imports.E)([".right-e7ea5d", ".right-17e251"])),
          t =
            (t && t.insertBefore(e, t.childNodes[0]),
            (e = (0, __imports.rr)()).querySelector(".vtoolbar-menu__trigger")),
          e = e.querySelector(".vtoolbar-menu__dropdown"),
          o = document.getElementById("ex-vtoolbar-filter-host"),
          n = document.getElementById("vtoolbar-menu-filter"),
          i = document.getElementById("vtoolbar-menu-copy-live"),
          a = document.getElementById("vtoolbar-menu-audio-line"),
          r = document.getElementById("vtoolbar-menu-enhanced-pip"),
          l = document.getElementById("vtoolbar-menu-expanel"),
          t =
            ((0, __imports.cr)(t, !0),
            (0, __imports.cr)(e, !1),
            (0, __imports.cr)(o, !1),
            owner.listen(n, "click", (e) => {
              (e.stopPropagation(),
                (__imports.ir
                  ? __imports.gr
                  : () => {
                      var e = document.getElementById(
                          "ex-vtoolbar-filter-host",
                        ),
                        t = document.getElementById("vtoolbar-menu-filter");
                      e &&
                        ((__imports.ir = !0),
                        e.classList.add("is-visible"),
                        t &&
                          (t.classList.add("is-active"),
                          t.setAttribute("aria-expanded", "true")),
                        (0, __imports.Ka)());
                    })());
            }),
            owner.listen(i, "click", (e) => {
              (e.stopPropagation(), (0, __imports.Ge)());
            }),
            owner.listen(a, "click", (e) => {
              (e.stopPropagation(), (0, __imports.le)());
            }),
            owner.listen(r, "click", (e) => {
              (e.stopPropagation(), (0, __imports.ur)(), (0, __imports.openEnhancedPip)());
            }),
            owner.listen(l, "click", (e) => {
              (e.stopPropagation(), (0, __imports.qt)());
            }),
            owner.listen(document, "keydown", __imports.pr),
            (0, __imports.ji)(),
            document.getElementById("vtoolbar-menu-joysound")),
          e =
            (t &&
              owner.listen(t, "click", (e) => {
                (e.stopPropagation(),
                  __imports.unsafeWindow.hasInstalledJoysound
                    ? (1 == __imports.localStorage.getItem("Ex_isJoysound")
                        ? __imports.unsafeWindow.disableJoysound()
                        : __imports.unsafeWindow.enableJoysound(),
                      (0, __imports.ji)())
                    : (0, __imports._)("https://src.douyuex.com/src/joysound.user.js"));
              }),
            document.createElement("li")),
          o =
            ((e.id = "ex-videospeed"),
            (e.innerHTML = `

    倍速播放

    <ul class="videospeed__wrap">

        <li id="videospeed__2.0">2.0x</li>

        <li id="videospeed__1.5">1.5x</li>

        <li id="videospeed__1.25">1.25x</li>

        <li id="videospeed__1.0">1.0x</li>

        <li id="videospeed__0.75">0.75x</li>

        <li id="videospeed__0.5">0.5x</li>

    </ul>

    `),
            document.getElementsByClassName("menu-da2a9e")[0]),
          n =
            (o.insertBefore(e, o.childNodes[1]),
            (0, __imports.safeBind)("#videospeed__2.0", "click", () => {
              __imports.V.playbackRate = 2;
            }, owner),
            (0, __imports.safeBind)("#videospeed__1.5", "click", () => {
              __imports.V.playbackRate = 1.5;
            }, owner),
            (0, __imports.safeBind)("#videospeed__1.25", "click", () => {
              __imports.V.playbackRate = 1.25;
            }, owner),
            (0, __imports.safeBind)("#videospeed__1.0", "click", () => {
              __imports.V.playbackRate = 1;
            }, owner),
            (0, __imports.safeBind)("#videospeed__0.75", "click", () => {
              __imports.V.playbackRate = 0.75;
            }, owner),
            (0, __imports.safeBind)("#videospeed__0.5", "click", () => {
              __imports.V.playbackRate = 0.5;
            }, owner),
            document.createElement("li")),
          i =
            ((n.id = "ex-cinema"),
            (n.innerHTML = `

    影院比例

    <ul class="cinema__wrap">

        <li id="cinema__default">默认</li>

        <li id="cinema__cover">剪裁</li>

        <li id="cinema__fill">拉伸</li>

    </ul>

    `),
            document.getElementsByClassName("menu-da2a9e")[0]);
        (i.insertBefore(n, i.childNodes[1]),
          (0, __imports.safeBind)("#cinema__default", "click", () => {
            (0, __imports.U)("Ex_Style_Cinema");
          }, owner),
          (0, __imports.safeBind)("#cinema__cover", "click", () => {
            (0, __imports.Li)("cover");
          }, owner),
          (0, __imports.safeBind)("#cinema__fill", "click", () => {
            (0, __imports.Li)("fill");
          }, owner));
        {
          let e = document.createElement("div"),
            t =
              ((e.id = "ex-videosync"),
              (e.title = "同步时间"),
              (e.innerHTML = `

    <svg t="1595680402158" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7532" width="22" height="22"><path d="M938.1888 534.016h-80.7936c0.4096-7.3728 0.6144-14.6432 0.6144-22.016 0-218.624-176.8448-400.7936-389.12-400.7936C257.024 111.2064 80.6912 293.1712 80.6912 512c0 218.7264 176.4352 400.7936 388.1984 400.7936 74.752 0 149.0944-22.016 208.1792-60.0064l42.7008 68.608c-75.0592 48.9472-161.9968 74.8544-250.7776 74.752C209.8176 996.1472 0 779.264 0 512S209.8176 27.8528 468.8896 27.8528C728.3712 27.8528 938.7008 244.736 938.7008 512c0 7.3728-0.2048 14.6432-0.512 22.016z m-261.12 318.7712z m-26.4192-158.1056L426.7008 556.032V291.9424h64v226.5088L689.5616 635.904l-38.912 58.7776z m245.3504-6.656L768 512h256L896 688.0256z" fill="#ffffff" p-id="7533"></path></svg>

    `),
              document.getElementsByClassName("left-d3671e")[0]);
          t
            ? ((e.style.marginLeft = "20px"),
              t.insertBefore(e, t.childNodes[3]))
            : ((e.style.marginLeft = "8px"),
              (t = (0, __imports.E)([".left-bfab3b"])).insertBefore(e, t.childNodes[2]));
        }
        ((0, __imports.safeBind)("#ex-videosync", "click", () => {
          var e;
          0 != (e = __imports.V.buffered).length && (__imports.V.currentTime = e.end(0));
        }, owner),
          __imports.or && document.removeEventListener("keydown", __imports.or, !0),
          (__imports.or = (e) => {
            __imports._r ||
              (e.target &&
                (e.target.isContentEditable ||
                  /^(input|textarea)$/i.test(e.target.tagName))) ||
              (37 != e.keyCode &&
                39 != e.keyCode &&
                "ArrowLeft" !== e.key &&
                "ArrowRight" !== e.key) ||
              ((__imports.V =
                __imports.V ||
                document.querySelector(".layout-Player-videoEntity video")) &&
                (e.preventDefault(),
                (__imports.V.currentTime = Math.max(
                  0,
                  (__imports.V.currentTime || 0) +
                    (37 == e.keyCode || "ArrowLeft" === e.key ? -3 : 3),
                ))));
          }),
          owner.listen(document, "keydown", __imports.or, !0),
          (__imports.F = __imports.V.parentNode.className));
        a = (0, __imports.hr)();
        if (
          (a &&
            (((r = document.createElement("div")).innerHTML = `

    <div class="filter__wrap">

        <div class="filter__panel">

            ${
              (0, __imports.Xa)()
                ? `<div class="filter__enhance">

                <span class="filter__title">画质增强（不掉帧）</span>

                <div class="filter__switch" id="switch__enhance">

                    <div class="filter__switch-slider" id="slider__enhance"></div>

                </div>

            </div>`
                : ""
            }

            <div class="filter__bright">

                <span class="filter__title">明亮度</span>

                <div class="filter__scroll" id="scroll__bright">

                    <div class="filter__scroll-bar" id="bar__bright"></div>

                    <div class="filter__scroll-mask" id="mask__bright"></div>

                </div>

            </div>

            <div class="filter__contrast">

                <span class="filter__title">对比度</span>

                <div class="filter__scroll" id="scroll__contrast">

                    <div class="filter__scroll-bar" id="bar__contrast"></div>

                    <div class="filter__scroll-mask" id="mask__contrast"></div>

                </div>

            </div>

            <div class="filter__saturate">

                <span class="filter__title">饱和度</span>

                <div class="filter__scroll" id="scroll__saturate">

                    <div class="filter__scroll-bar" id="bar__saturate"></div>

                    <div class="filter__scroll-mask" id="mask__saturate"></div>

                </div>

            </div>

            <div class="filter__filter">

                <p style="color:white;float:left;line-height:20px">滤镜</p>

                <select class="c3-4f78e3" id="filter__select">

                    <option class="option-b5745c" value="default">无</option>

                    <option class="option-b5745c" value="1977">1977</option>

                    <option class="option-b5745c" value="Aden">Aden</option>

                    <option class="option-b5745c" value="Amaro">Amaro</option>

                    <option class="option-b5745c" value="Brannan">Brannan</option>

                    <option class="option-b5745c" value="Brooklyn">Brooklyn</option>

                    <option class="option-b5745c" value="Claredon">Claredon</option>

                    <option class="option-b5745c" value="Earlybird">Earlybird</option>

                    <option class="option-b5745c" value="Gingham">Gingham</option>

                    <option class="option-b5745c" value="Hudson">Hudson</option>

                    <option class="option-b5745c" value="Inkwell">Inkwell</option>

                    <option class="option-b5745c" value="Lofi">Lofi</option>

                    <option class="option-b5745c" value="Maven">Maven</option>

                    <option class="option-b5745c" value="Perpetua">Perpetua</option>

                    <option class="option-b5745c" value="Reyes">Reyes</option>

                    <option class="option-b5745c" value="Stinson">Stinson</option>

                    <option class="option-b5745c" value="Toaster">Toaster</option>

                    <option class="option-b5745c" value="Walden">Walden</option>

                    <option class="option-b5745c" value="Valencia">Valencia</option>

                    <option class="option-b5745c" value="Xpro2">Xpro2</option>

                </select>

            </div>

            <ul style="clear:both">

                <li id="filter__reset2">重置</li>

            </ul>

        </div>

    </div>

    `),
            a.appendChild(r.firstElementChild),
            (a = document.getElementsByClassName("menu-da2a9e")[0])) &&
            (((r = document.createElement("li")).id = "filter__panorama"),
            (r.innerText = "全景"),
            a.insertBefore(r, a.childNodes[1]),
            ((r = document.createElement("li")).id = "filter__mirror"),
            (r.innerText = "镜像画面"),
            a.insertBefore(r, a.childNodes[1]),
            ((r = document.createElement("li")).id = "filter__rotate"),
            (r.innerText = "旋转画面"),
            a.insertBefore(r, a.childNodes[1]),
            ((r = document.createElement("li")).id = "filter__reset"),
            (r.innerText = "重置"),
            a.insertBefore(r, a.childNodes[1]),
            ((r = document.createElement("div")).className = "divider-f9d33d"),
            a.insertBefore(r, a.childNodes[1])),
          (0, __imports.Xa)())
        ) {
          let e = document.createElement("div"),
            t =
              ((e.className = "enhance-modal__panel-wrap"),
              (e.innerHTML = `

        <div class="enhance-modal__panel">

            <div class="enhance-modal__close">×</div>

            <div class="enhance-modal__content">

                <img class="enhance-modal__img" src="https://c-yuba.douyucdn.cn/yubavod/b/zEqAvQaXrd5L/c16fdac3db1903db3a39a6557c2b5ab5.gif" alt=""/>

                <div class="enhance-modal__text">

                    开启后，弹幕飘屏会被遮挡，请将鼠标移入到直播画面中并点击<img style="width:32px;" src="https://c-yuba.douyucdn.cn/yubavod/b/zEqAvQaXrd5L/2dd9e0d70e39a532a2675717eb054129.png" alt="">

                    <br />

                    完成后，再<b>刷新</b>以恢复弹幕飘屏，该功能会<b>自动保存</b>

                    <br />

                    <a style="color: #ff7700;" href="https://www.microsoft.com/zh-cn/edge/features/enhance-video?form=MT0160" target="_blank">没有增强图标？</a>

                </div>

            </div>

        </div>

    `),
              document.querySelector("body"));
          (t.insertBefore(e, t.childNodes[0]),
            owner.listen(e
              .getElementsByClassName("enhance-modal__close")[0], "click", () => {
                e.style.display = "none";
              }));
        }
        ((document.onmouseup = function () {
          document.onmousemove = null;
        }),
          (0, __imports.Xa)() &&
            (l = document.getElementById("switch__enhance")) &&
            owner.listen(l, "click", () => {
              __imports.Ja = !__imports.Ja;
              var e = document.getElementById("switch__enhance"),
                t = document.getElementById("slider__enhance"),
                o = document.getElementsByClassName(
                  "enhance-modal__panel-wrap",
                )[0],
                n = document.querySelector("video");
              __imports.Ja
                ? ((t.style.left = "20px"),
                  (e.style.background = "#369"),
                  (__imports.V.style.imageRendering = "crisp-edges"),
                  (__imports.V.style.imageRendering = "-webkit-optimize-contrast"),
                  (__imports.V.style.imageRendering = "optimize-contrast"),
                  (o.style.display = "none"),
                  (n.style.zIndex = "10"),
                  (n.style.cursor = "auto"))
                : ((t.style.left = "0px"),
                  (e.style.background = "#ccc"),
                  (__imports.V.style.imageRendering = ""),
                  (o.style.display = "none"),
                  (n.style.zIndex = "0"));
            }),
          (0, __imports.tr)(
            document.getElementById("scroll__bright"),
            document.getElementById("bar__bright"),
            document.getElementById("mask__bright"),
            (e) => {
              ((__imports.qa = `brightness(${e}%)`),
                (__imports.V.style.filter = `${__imports.qa} ${__imports.Ua} ` + __imports.Wa));
            },
          ),
          (0, __imports.tr)(
            document.getElementById("scroll__contrast"),
            document.getElementById("bar__contrast"),
            document.getElementById("mask__contrast"),
            (e) => {
              ((__imports.Ua = `contrast(${e}%)`),
                (__imports.V.style.filter = `${__imports.qa} ${__imports.Ua} ` + __imports.Wa));
            },
          ),
          (0, __imports.tr)(
            document.getElementById("scroll__saturate"),
            document.getElementById("bar__saturate"),
            document.getElementById("mask__saturate"),
            (e) => {
              ((__imports.Wa = `saturate(${e}%)`),
                (__imports.V.style.filter = `${__imports.qa} ${__imports.Ua} ` + __imports.Wa));
            },
          ),
          (0, __imports.safeBind)("#filter__reset", "click", () => {
            (0, __imports.er)();
          }, owner),
          (0, __imports.safeBind)("#filter__reset2", "click", () => {
            (0, __imports.er)();
          }, owner),
          (0, __imports.safeBind)("#filter__mirror", "click", () => {
            (__imports.Ya
              ? ((__imports.Ya = !1), (__imports.H.rotateY = "rotateY(0deg)"))
              : ((__imports.Ya = !0), (__imports.H.rotateY = "rotateY(180deg)")),
              (__imports.V.parentNode.style.transition = "all .5s"),
              (__imports.V.parentNode.style.transform =
                __imports.H.rotateY + " " + __imports.H.rotate + " " + __imports.H.scale));
          }, owner),
          (0, __imports.safeBind)("#filter__rotate", "click", () => {
            ((__imports.Qa += 90),
              (__imports.H.rotate = `rotate(${String(__imports.Qa)}deg)`),
              (__imports.V.parentNode.style.transition = "all .5s"),
              (__imports.Qa / 90) % 2 != 0
                ? window.innerWidth > window.innerHeight
                  ? (__imports.H.scale =
                      "scale(" + String(__imports.V.videoHeight / __imports.V.videoWidth) + ")")
                  : (__imports.H.scale =
                      "scale(" + String(__imports.V.videoWidth / __imports.V.videoHeight) + ")")
                : (__imports.H.scale = ""),
              (__imports.V.parentNode.style.transform =
                __imports.H.rotateY + " " + __imports.H.rotate + " " + __imports.H.scale));
          }, owner),
          ((0, __imports.safeEl)("filter__select").onchange = function () {
            switch (this.options[this.selectedIndex].text) {
              case "default":
                (0, __imports.U)("Ex_Style_Filter");
                break;
              case "1977":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(110%)brightness(110%)saturate(130%);filter:contrast(110%)brightness(110%)saturate(130%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:screen;background:rgba(243,106,188,0.3);z-index:10}`,
                );
                break;
              case "Aden":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(90%)brightness(120%)saturate(85%)hue-rotate(20deg);filter:contrast(90%)brightness(120%)saturate(85%)hue-rotate(20deg)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:darken;background:-webkit-linear-gradient(to right,rgba(66,10,14,0.2)1,rgba(66,10,14,0));background:linear-gradient(to right,rgba(66,10,14,0.2)1,rgba(66,10,14,0));z-index:10}`,
                );
                break;
              case "Amaro":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(90%)brightness(110%)saturate(150%)hue-rotate(-10deg);filter:contrast(90%)brightness(110%)saturate(150%)hue-rotate(-10deg)}`,
                );
                break;
              case "Brannan":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(140%)sepia(50%);filter:contrast(140%)sepia(50%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:lighten;background:rgba(161,44,199,0.31);z-index:10}`,
                );
                break;
              case "Brooklyn":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(90%)brightness(110%);filter:contrast(90%)brightness(110%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:overlay;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(168,223,193,0.4)1,rgba(183,196,200,0.2));background:radial-gradient(50%50%,circle closest-corner,rgba(168,223,193,0.4)1,rgba(183,196,200,0.2));z-index:10}`,
                );
                break;
              case "Claredon":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(120%)saturate(125%);filter:contrast(120%)saturate(125%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:overlay;background:rgba(127,187,227,0.2);z-index:10}`,
                );
                break;
              case "Earlybird":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(90%)sepia(20%);filter:contrast(90%)sepia(20%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:overlay;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(208,186,142,1)20,rgba(29,2,16,0.2));background:radial-gradient(50%50%,circle closest-corner,rgba(208,186,142,1)20,rgba(29,2,16,0.2));z-index:10}`,
                );
                break;
              case "Gingham":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:brightness(105%)hue-rotate(350deg);filter:brightness(105%)hue-rotate(350deg)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:darken;background:-webkit-linear-gradient(to right,rgba(66,10,14,0.2)1,rgba(0,0,0,0));background:linear-gradient(to right,rgba(66,10,14,0.2)1,rgba(0,0,0,0));z-index:10}`,
                );
                break;
              case "Hudson":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(90%)brightness(120%)saturate(110%);filter:contrast(90%)brightness(120%)saturate(110%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:multiply;opacity:0.5;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(255,177,166,1)50,rgba(52,33,52,1));background:radial-gradient(50%50%,circle closest-corner,rgba(255,177,166,1)50,rgba(52,33,52,1));z-index:10}`,
                );
                break;
              case "Inkwell":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(110%)brightness(110%)sepia(30%)grayscale(100%);filter:contrast(110%)brightness(110%)sepia(30%)grayscale(100%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;background:rgba(0,0,0,0);z-index:10}`,
                );
                break;
              case "Lofi":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(150%)saturate(110%);filter:contrast(150%)saturate(110%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:multiply;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(0,0,0,0)70,rgba(34,34,34,1));background:radial-gradient(50%50%,circle closest-corner,rgba(0,0,0,0)70,rgba(34,34,34,1));z-index:10}`,
                );
                break;
              case "Maven":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(95%)brightness(95%)saturate(150%)sepia(25%);filter:contrast(95%)brightness(95%)saturate(150%)sepia(25%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:hue;background:rgba(3,230,26,0.2);z-index:10}`,
                );
                break;
              case "Perpetua":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:soft-light;opacity:0.5;background:-webkit-linear-gradient(to bottom,rgba(0,91,154,1)1,rgba(61,193,230,0));background:linear-gradient(to bottom,rgba(0,91,154,1)1,rgba(61,193,230,0));z-index:10}`,
                );
                break;
              case "Reyes":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(85%)brightness(110%)saturate(75%)sepia(22%);filter:contrast(85%)brightness(110%)saturate(75%)sepia(22%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:soft-light;opacity:0.5;background:rgba(173,205,239,1);z-index:10}`,
                );
                break;
              case "Stinson":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(75%)brightness(115%)saturate(85%);filter:contrast(75%)brightness(115%)saturate(85%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:soft-light;background:rgba(240,149,128,0.2);z-index:10}`,
                );
                break;
              case "Toaster":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(150%)brightness(90%);filter:contrast(150%)brightness(90%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:screen;opacity:0.5;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(15,78,128,1)1,rgba(59,0,59,1));background:radial-gradient(50%50%,circle closest-corner,rgba(15,78,128,1)1,rgba(59,0,59,1));z-index:10}`,
                );
                break;
              case "Walden":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:brightness(110%)saturate(160%)sepia(30%)hue-rotate(350deg);filter:brightness(110%)saturate(160%)sepia(30%)hue-rotate(350deg)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:screen;opacity:0.3;background:rgba(204,68,0,1);z-index:10}`,
                );
                break;
              case "Valencia":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:contrast(108%)brightness(108%)sepia(8%);filter:contrast(108%)brightness(108%)sepia(8%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:exclusion;opacity:0.5;background:rgba(58,3,57,1);z-index:10}`,
                );
                break;
              case "Xpro2":
                (0, __imports.G)(
                  `.${__imports.F}{position:relative;-webkit-filter:sepia(30%);filter:sepia(30%)}.${__imports.F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:color-burn;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(224,231,230,1)40,rgba(43,42,161,0.6));background:radial-gradient(50%50%,circle closest-corner,rgba(224,231,230,1)40,rgba(43,42,161,0.6));z-index:10}`,
                );
                break;
              default:
                (0, __imports.U)("Ex_Style_Filter");
            }
          }),
          (0, __imports.safeBind)("#filter__panorama", "click", () => {
            var e,
              t = document.getElementById("ex-panorama");
            t
              ? (t.remove(), (__imports.Za = null))
              : "undefined" != typeof THREE
                ? ((t = document.getElementById("__h5player")),
                  ((e = document.createElement("div")).id = "ex-panorama"),
                  (e.style =
                    "width:100%;height:100%;z-index:1;background:black;"),
                  t.insertBefore(e, t.childNodes[0]),
                  (function e(t) {
                    (0, __imports.requestAnimationFrame)(() => {
                      e(t);
                    });
                    t.update();
                  })((__imports.Za = new __imports.Hr(e, __imports.V))))
                : (0, __imports.ExLoadLib)(
                    __imports.EXURL.three,
                    () => {
                      var b = document.getElementById("filter__panorama");
                      b && b.click();
                    },
                    () => (0, __imports.T)("【全景】three.js加载失败", "error"),
                  );
          }, owner));
        ((t = document.createElement("div")),
          (e =
            ((t.id = "ex-camera"),
            (t.title = "单击截图 长按录制gif"),
            (t.innerHTML = `

    <svg t="1620266708389" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2080" width="38" height="38"><path d="M512 337.371136c-119.543808 0-216.800256 97.255424-216.800256 216.798208 0 119.543808 97.256448 216.800256 216.800256 216.800256s216.800256-97.256448 216.800256-216.800256C728.800256 434.625536 631.543808 337.371136 512 337.371136zM680.479744 554.16832c0 92.911616-75.579392 168.501248-168.479744 168.501248-92.900352 0-168.480768-75.589632-168.480768-168.501248 0-92.923904 75.579392-168.521728 168.480768-168.521728C604.899328 385.646592 680.479744 461.24544 680.479744 554.16832z" p-id="2081" fill="#ffffff"></path><path d="M831.209472 337.349632l-47.167488 0c-13.647872 0-24.751104 11.083776-24.751104 24.707072 0 13.635584 11.103232 24.7296 24.751104 24.7296l47.167488 0c13.646848 0 24.75008-11.094016 24.75008-24.7296C855.959552 348.433408 844.85632 337.349632 831.209472 337.349632z" p-id="2082" fill="#ffffff"></path><path d="M700.505088 171.497472c4.235264 0 6.403072 0.405504 7.232512 0.612352 1.47968 1.514496 4.790272 6.218752 11.717632 20.685824 2.83648 5.910528 8.6272 18.86208 15.888384 35.533824l11.788288 27.063296 29.518848 0 96.535552 0c35.122176 0 63.695872 28.535808 63.695872 63.609856l0 469.933056c0 35.05152-28.573696 63.567872-63.695872 63.567872L150.811648 852.503552c-35.121152 0-63.694848-28.516352-63.694848-63.567872L87.1168 319.0016c0-35.062784 28.573696-63.589376 63.694848-63.589376l99.35872 0 29.110272 0 11.964416-26.537984c4.698112-10.421248 8.416256-19.063808 11.058176-25.70752 9.86112-24.829952 15.207424-30.125056 16.239616-30.974976 0.52736-0.161792 2.64192-0.695296 7.673856-0.695296L700.505088 171.496448M700.505088 126.441472 326.216704 126.441472c-32.519168 0-47.275008 13.479936-65.787904 60.096512-3.180544 7.999488-7.689216 18.122752-10.257408 23.819264l-99.35872 0c-59.96544 0-108.750848 48.738304-108.750848 108.645376l0 469.933056c0 59.894784 48.785408 108.623872 108.750848 108.623872l722.37568 0c59.96544 0 108.751872-48.729088 108.751872-108.623872L981.940224 319.0016c0-59.91936-48.786432-108.665856-108.751872-108.665856l-96.535552 0c-4.458496-10.236928-12.420096-28.372992-16.574464-37.031936C744.823808 141.448192 733.973504 126.441472 700.505088 126.441472L700.505088 126.441472z" p-id="2083" fill="#ffffff"></path></svg>

    <div id="ex-camera-close">×</div>

    `),
            document.getElementById("js-player-dialog"))));
        e.insertBefore(t, e.childNodes[0]);
        (0, __imports.bindCamera)(owner, __imports.V, (0, __imports.E)([".Title-anchorName", ".anchorName__6NXv9"]).innerText,
          t, (0, __imports.E)([".layout-Player-video", ".layout-Player-videoEntity"]),
          document.getElementsByClassName("room-Player-Box")[0],
          document.getElementsByClassName("room-Player-Box")[0]);
        {
          let a = (0, __imports.E)([".layout-Player-videoEntity", ".layout-Player-video"]),
            r = document.getElementsByClassName("layout-Player-videoEntity")[0],
            l = 0,
            s = 0;
          a &&
            r &&
            ((r.style.transformOrigin = "0 0"),
            (r.style.transition = "transform 0.1s"),
            __imports.Br && window.removeEventListener("wheel", __imports.Br, !0),
            (__imports.Br = (t) => {
              if (
                t.ctrlKey &&
                ((a =
                  a ||
                  (0, __imports.E)([".layout-Player-videoEntity", ".layout-Player-video"])),
                (r =
                  r ||
                  document.getElementsByClassName(
                    "layout-Player-videoEntity",
                  )[0]),
                a) &&
                r
              ) {
                var o = a.getBoundingClientRect();
                if (!(
                  t.clientX < o.left ||
                  t.clientX > o.right ||
                  t.clientY < o.top ||
                  t.clientY > o.bottom
                )) {
                  (t.preventDefault(), t.stopImmediatePropagation());
                  var n = t.clientX - o.left,
                    o = t.clientY - o.top;
                  let e = __imports.Er + (t.deltaY < 0 ? 0.1 : -0.1);
                  e < 0.1 && (e = 0.1);
                  var t = (n - l) / __imports.Er,
                    i = (o - s) / __imports.Er;
                  ((l = n - t * e),
                    (s = o - i * e),
                    (__imports.Er = e) < 0.1 && (__imports.Er = 0.1),
                    (r.style.transform = `translate(${l}px, ${s}px) scale(${__imports.Er})`));
                }
              }
            }),
            owner.listen(window, "wheel", __imports.Br, { capture: !0, passive: !1 }),
            __imports.Ir && window.removeEventListener("mousemove", __imports.Ir, !0),
            __imports.Tr && window.removeEventListener("mouseup", __imports.Tr, !0),
            owner.listen(
              window, "mousedown",
              (e) => {
                var t;
                e.ctrlKey &&
                  0 === e.button &&
                  ((t = a.getBoundingClientRect()),
                  e.clientX < t.left ||
                    e.clientX > t.right ||
                    e.clientY < t.top ||
                    e.clientY > t.bottom ||
                    (e.preventDefault(),
                    (r.style.transition = "none"),
                    (__imports.Cr = { x: e.clientX, y: e.clientY, tx: l, ty: s })));
              },
              !0,
            ),
            (__imports.Ir = (e) => {
              __imports.Cr &&
                ((l = __imports.Cr.tx + (e.clientX - __imports.Cr.x)),
                (s = __imports.Cr.ty + (e.clientY - __imports.Cr.y)),
                (r.style.transform = `translate(${l}px, ${s}px) scale(${__imports.Er})`));
            }),
            (__imports.Tr = () => {
              __imports.Cr && ((__imports.Cr = null), (r.style.transition = "transform 0.1s"));
            }),
            owner.listen(window, "mousemove", __imports.Ir, !0),
            owner.listen(window, "mouseup", __imports.Tr, !0));
        }
        ((function ExMetaLazy() {
          var pl = document.createElement("li");
          pl.id = "ex-metadata";
          pl.innerHTML =
            '<span>主播配置信息</span><ul class="metadata__wrap"><li style="color:#999;white-space:nowrap">悬停获取…</li></ul>';
          owner.listen(
            pl, "mouseenter",
            function () {
              var w = pl.querySelector(".metadata__wrap");
              w && (w.innerHTML = '<li style="color:#999">加载中…</li>');
              (0, __imports.ExLoadLib)(
                __imports.EXURL.flv,
                () => {
                  ExMetaProbe();
                },
                () => {
                  w && (w.innerHTML = "<li>flv.js 加载失败</li>");
                },
              );
            },
            { once: !0 },
          );
          var c = 0,
            mu,
            iv = owner.interval(() => {
              100 <= ++c && (0, __imports.clearInterval)(iv);
              (mu = document.getElementsByClassName("menu-da2a9e")[0]) &&
                ((0, __imports.clearInterval)(iv), mu.insertBefore(pl, mu.childNodes[1]));
            }, 500);
          var ExMetaProbe = function () {
            (0, __imports.qr)(__imports.B, !0, 0, "1", (e) => {
              if ("" != e || null != e)
                if ("None" == e) (0, __imports.T)("房间未开播或其他错误", "error");
                else {
                  var t = String(e).split("/live");
                  0 < t.length && t[0];
                  let n = "Fake";
                  var t = document.createElement("div"),
                    o = "",
                    o =
                      ((t.id = "exVideoDiv" + n),
                      (t.className = "exVideoDiv"),
                      (o +=
                        "<video controls='controls' class='exVideoPlayer' id='exVideoPlayer" +
                        String(n) +
                        "'></video><div class='exVideoScale' id='exVideoScale" +
                        String(n) +
                        "'></div>"),
                      (t.innerHTML = o),
                      (0, __imports.E)([
                        ".layout-Main",
                        ".playerWrap__8wGvw",
                        ".live-next-body",
                      ]));
                  if (
                    (o.insertBefore(t, o.childNodes[0]), flvjs.isSupported())
                  ) {
                    t = document.getElementById("exVideoPlayer" + n);
                    let o = flvjs.createPlayer(
                      { type: "flv", url: e },
                      { fixAudioTimestampGap: !1 },
                    );
                    (o.on("media_info", (e) => {
                      var t;
                      e &&
                        e.metadata &&
                        ((__imports.O = e.metadata),
                        (e = document.getElementById("exVideoDiv" + String(n))),
                        (t = document.getElementById(
                          "exVideoPlayer" + String(n),
                        )),
                        o.destroy(),
                        t.remove(),
                        e.remove(),
                        __imports.O) &&
                        (__imports.O.dy_cpu_model ||
                          __imports.O.dy_gpu_model ||
                          __imports.O.dy_device_model ||
                          __imports.O.dy_os_version ||
                          __imports.O.z_canvas_code) &&
                        (((t = pl).innerHTML = `

    主播配置信息

    <ul class="metadata__wrap">

      ${__imports.O.dy_cpu_model ? `<li title="${__imports.O.dy_cpu_model}">🤖CPU<br/>${__imports.O.dy_cpu_model}</li>` : ""}

      ${__imports.O.dy_gpu_model ? `<li title="${__imports.O.dy_gpu_model}">🎮显卡<br/>${__imports.O.dy_gpu_model}</li>` : ""}

      ${__imports.O.dy_device_model ? `<li title="${__imports.O.dy_device_model}">📱设备<br/>${__imports.O.dy_device_model}</li>` : ""}

      ${__imports.O.dy_os_version ? `<li title="${__imports.O.dy_os_version}">🖥️系统<br/>${__imports.O.dy_os_version}</li>` : ""}

      ${__imports.O.z_canvas_code ? `<li title="${__imports.O.z_canvas_code}">🎥场景<br/>${__imports.O.z_canvas_code}</li>` : ""}

    </ul>

    `),
                        (e =
                          document.getElementsByClassName(
                            "menu-da2a9e",
                          )[0]).insertBefore(t, e.childNodes[1]));
                    }),
                      o.attachMediaElement(t),
                      o.load());
                  }
                }
            });
          };
        })(),
          (0, __imports.wa)(),
          (0, __imports.ua)(),
          __imports.Zi ||
            ((__imports.Zi = !0),
            owner.listen(document, "fullscreenchange", __imports.ka, !0),
            owner.listen(document, "webkitfullscreenchange", __imports.ka, !0),
            owner.listen(document, "mozfullscreenchange", __imports.ka, !0),
            owner.listen(document, "MSFullscreenChange", __imports.ka, !0)),
          (0, __imports.ca)(),
          (0, __imports.va)(),
          (o = () => {
            (0, __imports.gr)();
          }),
          (0, __imports.safeBind)("#js-player-toolbar", "mouseover", o, owner),
          (0, __imports.safeBind)("#js-player-asideMain", "mouseover", o, owner),
          owner.listen(
            (0, __imports.E)([".inputView-2a65aa", ".inputView-620ab7"]), "focus",
            () => {
              __imports._r = !0;
            },
          ),
          owner.listen(
            (0, __imports.E)([".inputView-2a65aa", ".inputView-620ab7"]), "blur",
            () => {
              __imports._r = !1;
            },
          ),
          new __imports.DomMutationSubscription(".app-f0f9c7", !1, (e) => {
            0 < e.length &&
              (0 < e[0].addedNodes.length
                ? (__imports._r = !0)
                : 0 < e[0].removedNodes.length && (__imports._r = !1));
          }, owner));
      }
      100 <= ++__imports.kr && (0, __imports.clearInterval)(s);
    }, 1500);
  }

}
