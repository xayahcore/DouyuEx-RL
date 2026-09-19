function* (__imports) {
yield {"mountRoomControls": { get: () => mountRoomControls, set: value => { mountRoomControls = value; } }};
/**
 * 直播间顶栏与控制按钮装配 (回看/投稿/鱼吧直达、流地址复制、音频线路切换与私信角标过滤)
 * @param {object} owner - 房间装配生命周期托管者
 */
function mountRoomControls(owner) {
  // 1. 在主播头像卡片悬浮区挂载【回看】、【投稿】与【打开鱼吧】
  const videoEntryTab = document.querySelectorAll(".VideoEntry-tabItem > a")[0];
  if (videoEntryTab) {
    const submitTargetUrl = `${videoEntryTab.href}?type=video`;
    const replayTargetUrl = `${videoEntryTab.href}?type=liveReplay`;

    __imports.ln = Boolean(document.getElementsByClassName("Title-anchorPic-bottom")[0]);

    const reviewNode = document.createElement("div");
    reviewNode.className = __imports.ln ? "" : "Title-anchorPic-bottom";
    reviewNode.innerHTML = `
      <div id="Ex_VideoReview" class="Title-anchorPic-bottomItem"><span>回看</span></div>
      <i style="top: 28px"></i>
      <div id="Ex_VideoSubmit" class="Title-anchorPic-bottomItem"><span>投稿</span></div>
    `;

    const anchorParent = document.getElementsByClassName("Title-anchorPic-bottom")[0] ||
      document.getElementsByClassName("Title-anchorPicBack")[0];

    if (anchorParent) {
      anchorParent.insertBefore(reviewNode, anchorParent.childNodes[0]);
    }

    const yubaNode = document.createElement("div");
    yubaNode.className = __imports.ln ? "" : "Title-anchorPic-bottom";
    yubaNode.innerHTML = `
      <div id="Ex_EnterYuba" class="Title-anchorPic-bottomItem"><span>打开鱼吧</span></div>
    `;

    if (anchorParent) {
      anchorParent.insertBefore(yubaNode, anchorParent.childNodes[0]);
    }

    owner.navigation.submitTarget = submitTargetUrl;

    (0, __imports.safeBind)("#Ex_VideoSubmit", "click", () => {
      (0, __imports._)(owner.navigation.submitTarget, true);
    }, owner);

    (0, __imports.safeBind)("#Ex_VideoReview", "click", () => {
      (0, __imports._)(replayTargetUrl, true);
    }, owner);

    (0, __imports.safeBind)("#Ex_EnterYuba", "click", async () => {
      const roomId = __imports.B;
      try {
        const res = await (0, __imports.fetch)(`https://www.douyu.com/wgapi/yubanc/api/group/getBindGroup?room_id=${roomId}`);
        const data = await res.json();
        if (data?.data?.group_url) {
          (0, __imports._)(data.data.group_url, true);
        }
      } catch {}
    }, owner);

    const anchorBottomEls = document.getElementsByClassName("Title-anchorPic-bottom");
    if (anchorBottomEls[0]) {
      anchorBottomEls[0].style.display = "none";
      anchorBottomEls[0].style.height = __imports.ln ? "66px" : "22px";
    }

    (0, __imports.safeBind)(".Title-anchorPicBack", "mouseenter", () => {
      const bottomBar = document.getElementsByClassName("Title-anchorPic-bottom")[0];
      if (bottomBar) bottomBar.style.display = "block";
    }, owner);

    (0, __imports.safeBind)(".Title-anchorPicBack", "mouseleave", () => {
      const bottomBar = document.getElementsByClassName("Title-anchorPic-bottom")[0];
      if (bottomBar) bottomBar.style.display = "none";
    }, owner);
  }

  // 2. 拉取房间在播时长与开播状态
  (0, __imports.fetch)(`https://www.douyu.com/swf_api/h5room/${__imports.B}`, {
    method: "GET",
    mode: "no-cors",
    credentials: "include",
  })
    .then(owner.guard(res => res.json()))
    .then(owner.guard(data => {
      if (data?.data) {
        __imports.j.showtime = data.data.show_time;
        __imports.j.isShow = data.data.show_status;
        (0, __imports.refreshRoomMusic)();
        owner.interval(__imports.refreshRoomMusic, 150000);
        owner.interval(__imports.advanceRoomMusic, 5000);
      }
    }))
    .catch(() => {});

  // 3. 顶栏注入【复制直播流】按钮
  const copyStreamBtn = document.createElement("div");
  copyStreamBtn.className = "Title-blockInline";
  copyStreamBtn.id = "copy-real-live";
  copyStreamBtn.innerHTML = `
    <div class="TitleShare">
      <div class="TitleShare-shareBox">
        <div class="Title-row-span is-right">
          <span class="Title-row-icon">
            <svg class="icon" viewBox="0 0 1237 1024" width="16" height="16">
              <path d="M648.448 946.347l0.256-1.622-0.256 1.622z m84.31 13.354c-0.769 4.608-0.769 4.608-4.182 13.483-8.533 16.768-8.533 16.768-49.835 22.784-24.149-14.293-24.149-14.293-27.605-22.613-2.475-5.718-2.475-5.718-3.541-9.387L476.416 335.36l-103.083 499.2c-1.109 5.12-1.109 5.12-4.821 13.27-6.827 12.117-6.827 12.117-35.285 22.527-30.294-7.253-30.294-7.253-38.742-19.37-4.522-8.15-4.522-8.15-6.058-13.227l-74.582-262.357H0v-85.334h278.272l45.781 161.11 104.022-503.424c1.024-4.694 1.024-4.694 4.394-12.502 6.102-11.989 6.102-11.989 35.968-23.338 31.83 8.533 31.83 8.533 39.254 20.736 4.053 7.808 4.053 7.808 5.376 12.544l165.888 609.237 113.92-716.885c0.896-5.248 0.896-5.248 4.864-14.592 9.088-15.574 9.088-15.574 44.928-22.4C868.48 12.587 868.48 12.587 873.6 22.443c3.285 6.912 3.285 6.912 4.523 11.52l112 446.549h221.738v85.333H923.563l-78.507-312.917-112.299 706.773z"></path>
            </svg>
          </span>
          <span class="Title-row-text">复制直播流</span>
        </div>
      </div>
    </div>
  `;

  const titleCol = document.getElementsByClassName("Title-col")[4];
  if (titleCol && titleCol.childNodes.length > 1) {
    titleCol.insertBefore(copyStreamBtn, titleCol.childNodes[1]);
  } else {
    const subtitleWrap = (0, __imports.E)([".subTitleContainer__-vzhr"]);
    if (subtitleWrap) subtitleWrap.appendChild(copyStreamBtn);
  }
  (0, __imports.safeBind)("#copy-real-live", "click", __imports.Ge, owner);

  // 4. 顶栏注入【切换音频线路】按钮
  const audioLineBtn = document.createElement("div");
  audioLineBtn.className = "Title-blockInline";
  audioLineBtn.id = "ex-audio-line";
  audioLineBtn.innerHTML = `
    <div class="TitleShare">
      <div class="TitleShare-shareBox">
        <div class="Title-row-span is-right">
          <span class="Title-row-icon">
            <svg class="icon" viewBox="0 0 1024 1024" width="16" height="16">
              <path d="M496 64A48 48 0 0 1 544 112v800a48 48 0 0 1-96 0v-800A48 48 0 0 1 496 64z m-224 128A48 48 0 0 1 320 240v544a48 48 0 0 1-96 0v-544A48 48 0 0 1 272 192z m448 0A48 48 0 0 1 768 240v544a48 48 0 0 1-96 0v-544A48 48 0 0 1 720 192z m-672 128A48 48 0 0 1 96 368v288a48 48 0 0 1-96 0v-288A48 48 0 0 1 48 320z m896 0a48 48 0 0 1 48 48v288a48 48 0 0 1-96 0v-288a48 48 0 0 1 48-48z"></path>
            </svg>
          </span>
          <span class="Title-row-text">切换音频线路</span>
        </div>
      </div>
    </div>
  `;

  if (titleCol && titleCol.childNodes.length > 1) {
    titleCol.insertBefore(audioLineBtn, titleCol.childNodes[1]);
  } else {
    const subtitleWrap = (0, __imports.E)([".subTitleContainer__-vzhr"]);
    if (subtitleWrap) subtitleWrap.appendChild(audioLineBtn);
  }
  (0, __imports.safeBind)("#ex-audio-line", "click", __imports.le, owner);

  // 5. 私信窗口关闭角标提醒开关
  const noticePollTimer = owner.interval(() => {
    if ((0, __imports.E)([".PlayerToolbar-ContentCell .PlayerToolbar-Wealth", "#js-backpack-enter"])) {
      (0, __imports.clearInterval)(noticePollTimer);

      const barrageList = document.getElementById("js-barrage-list");
      if (barrageList?.parentNode) {
        barrageList.parentNode.id = "js-barrage-list-parent";
      }

      const letterFrame = document.getElementsByClassName("PrivateLetter-frame")[0];
      if (letterFrame && !document.getElementById("ex-removeMsgNotice")) {
        const noticeWrap = document.createElement("div");
        noticeWrap.id = "ex-removeMsgNotice";
        noticeWrap.style.cssText = "position: absolute; right: 5px; top: 40px; cursor: pointer;";
        noticeWrap.title = "关闭角标提醒";
        noticeWrap.innerHTML = '<label id="msg-removeNotice" style="cursor: pointer;"><input type="checkbox" />关闭角标提醒</label>';
        letterFrame.appendChild(noticeWrap);

        const labelEl = document.getElementById("msg-removeNotice");
        if (labelEl) {
          const inputEl = labelEl.querySelector("input");
          owner.listen(labelEl, "click", () => {
            if (inputEl.checked) {
              __imports.vn = 1;
              (0, __imports.xn)();
            } else {
              __imports.vn = 0;
              (0, __imports.U)("Ex_Style_RemoveMsgNotice");
            }
            __imports.localStorage.setItem("ExSave_isRemoveMsgNotice", __imports.vn);
          });
        }

        const savedNotice = __imports.localStorage.getItem("ExSave_isRemoveMsgNotice");
        if (savedNotice === "1") {
          __imports.vn = 1;
          (0, __imports.xn)();
          const inp = document.getElementById("msg-removeNotice")?.querySelector("input");
          if (inp) inp.checked = true;
        }
      }
    }
  }, 1000);

  // 6. 弹幕过滤器变动监听
  const filterPollTimer = owner.interval(() => {
    if (document.getElementsByClassName("BarrageFilter")[0]) {
      (0, __imports.clearInterval)(filterPollTimer);

      new __imports.DomMutationSubscription(".BarrageFilter", false, (mutations) => {
        if (mutations.length > 0 && mutations[0].addedNodes.length > 0 && mutations[0].removedNodes.length === 0) {
          if (document.getElementsByClassName("FilterKeywords")[0]) {
            (0, __imports.qn)();
          } else {
            const innerPoll = owner.interval(() => {
              if (document.getElementsByClassName("FilterKeywords")[0]) {
                (0, __imports.clearInterval)(innerPoll);
                (0, __imports.qn)();
              }
            }, 50);
          }
        }
      }, owner);
    }
  }, 1000);

  // 7. 挂载背包控件
  (0, __imports.mountBackpackControls)(owner);
}

}
