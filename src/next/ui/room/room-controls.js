function* (__imports) {
yield {"mountRoomControls": { get: () => mountRoomControls, set: value => { mountRoomControls = value; } }};
// Phase-local construction values; only declared outputs cross phase boundaries.
function mountRoomControls(owner) {
let elementOrValue, containerOrValue, controlNodes, controlParent, replayUrl;
elementOrValue = document.querySelectorAll(".VideoEntry-tabItem>a")[0];
(null != elementOrValue &&
    ((containerOrValue = elementOrValue.href + "?type=video"),
    (elementOrValue = elementOrValue.href + "?type=liveReplay"),
    (controlNodes = document.createElement("div")),
    (__imports.ln = !!document.getElementsByClassName("Title-anchorPic-bottom")[0]),
    (controlNodes.className = __imports.ln ? "" : "Title-anchorPic-bottom"),
    (controlNodes.innerHTML = `

	<div id="Ex_VideoReview" class="Title-anchorPic-bottomItem"><span>回看</span></div>

	<i style="top: 28px"></i>

	<div id="Ex_VideoSubmit" class="Title-anchorPic-bottomItem"><span>投稿</span></div>

	`),
    (controlParent =
      document.getElementsByClassName("Title-anchorPic-bottom")[0] ||
      document.getElementsByClassName("Title-anchorPicBack")[0]).insertBefore(
      controlNodes,
      controlParent.childNodes[0],
    ),
    (controlNodes = document.createElement("div")),
    (__imports.ln = !!document.getElementsByClassName("Title-anchorPic-bottom")[0]),
    (controlNodes.className = __imports.ln ? "" : "Title-anchorPic-bottom"),
    (controlNodes.innerHTML = `

	<div id="Ex_EnterYuba" class="Title-anchorPic-bottomItem"><span>打开鱼吧</span></div>

	`),
    (controlParent =
      document.getElementsByClassName("Title-anchorPic-bottom")[0] ||
      document.getElementsByClassName("Title-anchorPicBack")[0]).insertBefore(
      controlNodes,
      controlParent.childNodes[0],
    ),
    (owner.navigation.submitTarget = containerOrValue),
    (replayUrl = elementOrValue),
    (0, __imports.safeBind)("#Ex_VideoSubmit", "click", () => {
      (0, __imports._)(owner.navigation.submitTarget, !0);
    }, owner),
    (0, __imports.safeBind)("#Ex_VideoReview", "click", () => {
      (0, __imports._)(replayUrl, !0);
    }, owner),
    (0, __imports.safeBind)("#Ex_EnterYuba", "click", async () => {
      var e;
      ((e = __imports.B),
        (0, __imports._)(
          (
            await new Promise((t, o) => {
              (0, __imports.fetch)(
                "https://www.douyu.com/wgapi/yubanc/api/group/getBindGroup?room_id=" +
                  e,
              )
                .then(owner.guard((e) => e.json()))
                .then(owner.guard((e) => {
                  t(e);
                }))
                .catch((e) => {
                  o(e);
                });
            })
          ).data.group_url,
          !0,
        ));
    }, owner),
    (document.getElementsByClassName(
      "Title-anchorPic-bottom",
    )[0].style.display = "none"),
    (document.getElementsByClassName("Title-anchorPic-bottom")[0].style.height =
      __imports.ln ? "66px" : "22px"),
    (0, __imports.safeBind)(".Title-anchorPicBack", "mouseenter", () => {
      document.getElementsByClassName(
        "Title-anchorPic-bottom",
      )[0].style.display = "block";
    }, owner),
    (0, __imports.safeBind)(".Title-anchorPicBack", "mouseleave", () => {
      document.getElementsByClassName(
        "Title-anchorPic-bottom",
      )[0].style.display = "none";
    }, owner)));
((0, __imports.fetch)("https://www.douyu.com/swf_api/h5room/" + __imports.B, {
      method: "GET",
      mode: "no-cors",
      credentials: "include",
    })
      .then(owner.guard((e) => e.json()))
      .then(owner.guard((e) => {
        ((__imports.j.showtime = e.data.show_time),
          (__imports.j.isShow = e.data.show_status),
          (0, __imports.refreshRoomMusic)(),
          owner.interval(__imports.refreshRoomMusic, 15e4),
          owner.interval(__imports.advanceRoomMusic, 5e3));
      }))
      .catch((e) => {
        console.log("请求失败!", e);
      }));
{
    let e = document.createElement("div"),
      t =
        ((e.className = "Title-blockInline"),
        (e.id = "copy-real-live"),
        (e.innerHTML =
          '<div class="TitleShare"><div class="TitleShare-shareBox "><div class="Title-row-span is-right"><span class="Title-row-icon "><svg t="1585641756842" class="icon" viewBox="0 0 1237 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5646" width="16" height="16"><path d="M648.448 946.347l0.256-1.622-0.256 1.622z m84.31 13.354c-0.769 4.608-0.769 4.608-4.182 13.483-8.533 16.768-8.533 16.768-49.835 22.784-24.149-14.293-24.149-14.293-27.605-22.613-2.475-5.718-2.475-5.718-3.541-9.387L476.416 335.36l-103.083 499.2c-1.109 5.12-1.109 5.12-4.821 13.27-6.827 12.117-6.827 12.117-35.285 22.527-30.294-7.253-30.294-7.253-38.742-19.37-4.522-8.15-4.522-8.15-6.058-13.227l-74.582-262.357H0v-85.334h278.272l45.781 161.11 104.022-503.424c1.024-4.694 1.024-4.694 4.394-12.502 6.102-11.989 6.102-11.989 35.968-23.338 31.83 8.533 31.83 8.533 39.254 20.736 4.053 7.808 4.053 7.808 5.376 12.544l165.888 609.237 113.92-716.885c0.896-5.248 0.896-5.248 4.864-14.592 9.088-15.574 9.088-15.574 44.928-22.4C868.48 12.587 868.48 12.587 873.6 22.443c3.285 6.912 3.285 6.912 4.523 11.52l112 446.549h221.738v85.333H923.563l-78.507-312.917-112.299 706.773z" p-id="5647"></path></svg></span><span class="Title-row-text">复制直播流</span></div></div></div>'),
        document.getElementsByClassName("Title-col")[4]);
    t && 1 < t.childNodes.length
      ? t.insertBefore(e, t.childNodes[1])
      : (t = (0, __imports.E)([".subTitleContainer__-vzhr"])) && t.appendChild(e);
  }
(0, __imports.safeBind)("#copy-real-live", "click", __imports.Ge, owner);
controlNodes = document.getElementsByClassName("RecommendViewTit-04ebd8");
0 < controlNodes.length && controlNodes[0].innerText;
{
    let e = document.createElement("div"),
      t =
        ((e.className = "Title-blockInline"),
        (e.id = "ex-audio-line"),
        (e.innerHTML =
          '<div class="TitleShare"><div class="TitleShare-shareBox "><div class="Title-row-span  is-right"><span class="Title-row-icon "><svg t="1613808136306" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2829" width="16" height="16"><path d="M496 64A48 48 0 0 1 544 112v800a48 48 0 0 1-96 0v-800A48 48 0 0 1 496 64z m-224 128A48 48 0 0 1 320 240v544a48 48 0 0 1-96 0v-544A48 48 0 0 1 272 192z m448 0A48 48 0 0 1 768 240v544a48 48 0 0 1-96 0v-544A48 48 0 0 1 720 192z m-672 128A48 48 0 0 1 96 368v288a48 48 0 0 1-96 0v-288A48 48 0 0 1 48 320z m896 0a48 48 0 0 1 48 48v288a48 48 0 0 1-96 0v-288a48 48 0 0 1 48-48z" p-id="2830"></path></svg></span><span class="Title-row-text ">切换音频线路</span></div></div></div>'),
        document.getElementsByClassName("Title-col")[4]);
    t && 1 < t.childNodes.length
      ? t.insertBefore(e, t.childNodes[1])
      : (t = (0, __imports.E)([".subTitleContainer__-vzhr"])) && t.appendChild(e);
  }
(0, __imports.safeBind)("#ex-audio-line", "click", __imports.le, owner);
{
    let o = owner.interval(() => {
      if (
        null !=
        (0, __imports.E)([
          ".PlayerToolbar-ContentCell .PlayerToolbar-Wealth",
          "#js-backpack-enter",
        ])
      ) {
        ((0, __imports.clearInterval)(o),
          (document.getElementById("js-barrage-list").parentNode.id =
            "js-barrage-list-parent"));
        var e = document.createElement("div"),
          t =
            ((e.style =
              "position: absolute;right: 5px;top: 40px;cursor: pointer;"),
            (e.id = "ex-removeMsgNotice"),
            (e.innerHTML =
              '<label id="msg-removeNotice" style="cursor: pointer;"><input type="checkbox" />关闭角标提醒</label>'),
            (e.title = "关闭角标提醒"),
            document.getElementsByClassName("PrivateLetter-frame")[0]),
          t =
            (t && t.appendChild(e),
            document.getElementById("msg-removeNotice"));
        if (t) {
          let e = t.querySelector("input");
          owner.listen(t, "click", () => {
            (1 == e.checked
              ? ((__imports.vn = 1), (0, __imports.xn)())
              : ((__imports.vn = 0), (0, __imports.U)("Ex_Style_RemoveMsgNotice")),
              __imports.localStorage.setItem("ExSave_isRemoveMsgNotice", __imports.vn));
          });
        }
        e = __imports.localStorage.getItem("ExSave_isRemoveMsgNotice");
        e &&
          "1" == e &&
          ((__imports.vn = 1), (0, __imports.xn)(), (e = document.getElementById("msg-removeNotice"))) &&
          (e.querySelector("input").checked = !0);
      }
    }, 1e3);
  }
{
    let e = owner.interval(() => {
      void 0 !== document.getElementsByClassName("BarrageFilter")[0] &&
        ((0, __imports.clearInterval)(e),
        new __imports.DomMutationSubscription(".BarrageFilter", !1, (e) => {
          if (
            0 !== e.length &&
            0 < e[0].addedNodes.length &&
            0 === e[0].removedNodes.length
          )
            if (document.getElementsByClassName("FilterKeywords")[0]) (0, __imports.qn)();
            else {
              let e = owner.interval(() => {
                document.getElementsByClassName("FilterKeywords")[0] &&
                  ((0, __imports.clearInterval)(e), (0, __imports.qn)());
              }, 50);
            }
        }, owner));
    }, 1e3);
  }
(0, __imports.mountBackpackControls)(owner);
}

}
