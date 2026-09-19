function* (__imports) {
yield {"ae": { get: () => ae, set: value => { ae = value; } },
"ie": { get: () => ie, set: value => { ie = value; } },
"le": { get: () => le, set: value => { le = value; } },
"ne": { get: () => ne, set: value => { ne = value; } },
"oe": { get: () => oe, set: value => { oe = value; } },
"re": { get: () => re, set: value => { re = value; } }};
let oe =
    '<svg t="1613993967937" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2122" width="16" height="16"><path d="M217.472 311.808l384.64 384.64-90.432 90.56-384.64-384.64z" fill="#8A8A8A" p-id="2123"></path><path d="M896.32 401.984l-384.64 384.64-90.56-90.496 384.64-384.64z" fill="#8A8A8A" p-id="2124"></path></svg>',
  ne = 0;
function ie(e) {
  var _al = document.getElementById("ex-accountList-content");
  if (_al)
    _al.innerHTML = ((e) => {
      let t = null == e ? JSON.parse((0, __imports.GM_getValue)("Ex_accountList") || "{}") : e,
        o = "";
      for (var n in t)
        "null" != n &&
          ((n = t[n]),
          (o += `

        <div class="ex-accountList-item" uid="${n.uid}">

            <div class="ex-accountList-item__imgWrap">

                <img src=${decodeURIComponent(n.avatar) + "middle.jpg"} alt="" class="ex-accountList-item__img">

            </div>

            <div class="ex-accountList-item__name">${decodeURIComponent(n.nickname)}</div>

            <div class="ex-accountList-item__btn">删除</div>

        </div>`));
      return (o += `

    <div id="ex-accountList-item-add">

        <svg t="1613995373702" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2832" width="32" height="32"><path d="M577.088 0H448.96v448.512H0v128h448.96V1024h128.128V576.512H1024v-128H577.088z" p-id="2833" fill="#8A8A8A"></path></svg>

    </div>

    `);
    })(e);
  var t = document.getElementsByClassName("ex-accountList-item");
  for (let e = 0; e < t.length; e++) {
    var o = t[e];
    let a = o.getAttribute("uid");
    (o.addEventListener("click", () => {
      (0, __imports.T)("【账号管理】正在切换账号，请耐心等待...", "info");
      {
        a;
        var i = () => {};
        JSON.parse((0, __imports.GM_getValue)("Ex_accountList"));
        let o = [],
          n = 0;
        (0, __imports.GM_cookie)("list", { path: "/" }, function (t) {
          for (let e = 0; e < t.length; e++)
            (0, __imports.GM_cookie)("delete", { name: t[e].name }, function (e) {
              if (++n >= t.length) {
                let t = 0;
                for (let e = 0; e < o.length; e++)
                  (0, __imports.GM_cookie)(
                    "set",
                    {
                      name: o[e].name,
                      value: o[e].value,
                      domain: o[e].domain,
                      path: o[e].path,
                      secure: o[e].secure,
                      httpOnly: o[e].httpOnly,
                      sameSite: o[e].sameSite,
                      expirationDate: o[e].expirationDate,
                      hostOnly: o[e].hostOnly,
                    },
                    function (e) {
                      ++t >= o.length && i();
                    },
                  );
              }
            });
        });
      }
      (re("switch", a),
        (document.getElementById("ex-accountList-iframe2").innerHTML = `

    <iframe id="ex-yuba-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://yuba.douyu.com/iframe/tab/6416853?exClean&domain=${encodeURIComponent(window.location.href)}&"></iframe>

    <iframe id="ex-msg-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://msg.douyu.com/web/index.html?exClean&domain=${encodeURIComponent(window.location.href)}&"></iframe>

    <iframe id="ex-video-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://v.douyu.com/show/0?exClean&domain=${encodeURIComponent(window.location.href)}&"></iframe>

    <iframe id="ex-cz-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://cz.douyu.com/item/gold?exClean&domain=${encodeURIComponent(window.location.href)}&"></iframe>

    `));
    }),
      o
        .getElementsByClassName("ex-accountList-item__btn")[0]
        .addEventListener("click", (e) => {
          var t, o;
          (e.stopPropagation(),
            (0, __imports.T)("【账号管理】正在删除...", "info"),
            (e = a),
            (t = () => {}),
            delete (o = JSON.parse((0, __imports.GM_getValue)("Ex_accountList") || "{}"))[e],
            (0, __imports.GM_setValue)("Ex_accountList", JSON.stringify(o)),
            t(),
            re("delete", a));
        }));
  }
  var _addBtn = document.getElementById("ex-accountList-item-add");
  _addBtn &&
    _addBtn.addEventListener("click", () => {
      (ae(() => {}), re("clean", "null"));
    });
}
function ae(o) {
  let n = 0;
  (0, __imports.GM_cookie)("list", { path: "/" }, (t) => {
    if (t)
      for (let e = 0; e < t.length; e++)
        (0, __imports.GM_cookie)("delete", { name: t[e].name }, function (e) {
          ++n >= t.length && o();
        });
    else o();
  });
}
function re(e, t) {
  var _iframe = document.getElementById("ex-accountList-iframe");
  if (_iframe)
    _iframe.innerHTML = `

    <iframe id="login-passport-frame" width="100%" height="100%" scrolling="no" frameborder="0" src="https://passport.douyu.com/index/error/show404?&exid=chun&cmd=${e}&uid=${t}&domain=${encodeURIComponent(window.location.href)}&"></iframe>

    `;
}
function le() {
  var e = (0, __imports.E)([".pause-c594e8", ".icon-c8be96"]);
  (e && e.click(),
    (0, __imports.qr)(__imports.B, !0, 0, "1428", (e) => {
      var i, a;
      ((i = __imports.D.length),
        (0, __imports.qr)((a = __imports.B), !1, 0, "1", (t) => {
          if ("" != t || null != t)
            if ("None" == t) (0, __imports.T)("房间未开播或其他错误", "error");
            else {
              var o = String(t).split("/live");
              let e = "";
              0 < o.length && (e = o[0]);
              var o = document.createElement("div"),
                n = "",
                n =
                  ((o.id = "exVideoDiv" + String(i)),
                  (o.rid = a),
                  (o.className = "exVideoDiv"),
                  (n =
                    (n =
                      (n =
                        (n =
                          (n =
                            (n +=
                              "<div class='exVideoInfo' id='exVideoInfo" +
                              String(i) +
                              "'><a title='复制直播流地址'><span class='exVideoRID' id='exVideoRID" +
                              String(i) +
                              "' style='color:white'>斗鱼音频流 - " +
                              a +
                              "</span></a>") +
                            ("<select style='display:none' class='exVideoQn' id='exVideoQn" +
                              String(i) +
                              "'><option value='1'>流畅</option><option value='2'>高清</option><option value='3'>超清</option><option value='0'>蓝光</option></select>")) +
                          ("<select style='display:none' class='exVideoCDN' id='exVideoCDN" +
                            String(i) +
                            "'><option value='1'>主线路</option><option value='2'>备用线路5</option><option value='3'>备用线路6</option></select>")) +
                        ("<a style='margin-left:5px;display:none' href='" +
                          e +
                          "' target='_blank'>无视频？</a>")) +
                      ("<a><div class='exVideoClose' id='exVideoClose" +
                        String(i) +
                        "'>X</div></a>") +
                      "</div>") +
                    ("<video controls='controls' class='exVideoPlayer' id='exVideoPlayer" +
                      String(i) +
                      "'></video><div class='exVideoScale' id='exVideoScale" +
                      String(i) +
                      "'></div>")),
                  (o.innerHTML = n),
                  (0, __imports.E)([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"]));
              (n.insertBefore(o, n.childNodes[0]),
                (0, __imports.on)(i),
                (0, __imports.tn)(i),
                (0, __imports.an)(i, a),
                (0, __imports.f)(i, t));
            }
        }));
    }));
}

}
