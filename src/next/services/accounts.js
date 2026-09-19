function* (__imports) {
yield {"ae": { get: () => ae, set: value => { ae = value; } },
"ie": { get: () => ie, set: value => { ie = value; } },
"le": { get: () => le, set: value => { le = value; } },
"ne": { get: () => ne, set: value => { ne = value; } },
"oe": { get: () => oe, set: value => { oe = value; } },
"re": { get: () => re, set: value => { re = value; } }};
/**
 * 多账号跨域免密热切换与纯音频独立播放流控制器
 */
const DOUBLE_CHEVRON_SVG = `<svg class="icon" viewBox="0 0 1024 1024" width="16" height="16"><path d="M217.472 311.808l384.64 384.64-90.432 90.56-384.64-384.64z" fill="#8A8A8A"></path><path d="M896.32 401.984l-384.64 384.64-90.56-90.496 384.64-384.64z" fill="#8A8A8A"></path></svg>`;

let oe = DOUBLE_CHEVRON_SVG;
let ne = 0;

/**
 * 渲染多账号管理下拉列表 (导出兼容 ie)
 * @param {object} [customAccountMap]
 */
function renderAccountList(customAccountMap) {
  const container = document.getElementById("ex-accountList-content");
  if (!container) return;

  const getAccountListHtml = (accountData) => {
    let accountsObj = {};
    if (accountData == null) {
      try {
        accountsObj = JSON.parse((0, __imports.GM_getValue)("Ex_accountList") || "{}");
      } catch {}
    } else {
      accountsObj = accountData;
    }

    let itemsHtml = "";
    for (const uidKey in accountsObj) {
      if (uidKey !== "null" && accountsObj[uidKey]) {
        const item = accountsObj[uidKey];
        const avatarUrl = decodeURIComponent(item.avatar) + "middle.jpg";
        const nickName = decodeURIComponent(item.nickname);
        itemsHtml += `
          <div class="ex-accountList-item" uid="${item.uid}">
            <div class="ex-accountList-item__imgWrap">
              <img src="${avatarUrl}" alt="" class="ex-accountList-item__img">
            </div>
            <div class="ex-accountList-item__name">${nickName}</div>
            <div class="ex-accountList-item__btn">删除</div>
          </div>
        `;
      }
    }

    itemsHtml += `
      <div id="ex-accountList-item-add">
        <svg class="icon" viewBox="0 0 1024 1024" width="32" height="32"><path d="M577.088 0H448.96v448.512H0v128h448.96V1024h128.128V576.512H1024v-128H577.088z" fill="#8A8A8A"></path></svg>
      </div>
    `;
    return itemsHtml;
  };

  container.innerHTML = getAccountListHtml(customAccountMap);

  const accountItems = document.getElementsByClassName("ex-accountList-item");
  for (let i = 0; i < accountItems.length; i++) {
    const itemEl = accountItems[i];
    const targetUid = itemEl.getAttribute("uid");

    // 切换账号
    itemEl.addEventListener("click", () => {
      (0, __imports.T)("【账号管理】正在切换账号，请耐心等待...", "info");

      clearAllCookies(() => {
        executePassportCommand("switch", targetUid);
        const iframeBox = document.getElementById("ex-accountList-iframe2");
        if (iframeBox) {
          const currentHref = encodeURIComponent(window.location.href);
          iframeBox.innerHTML = `
            <iframe id="ex-yuba-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://yuba.douyu.com/iframe/tab/6416853?exClean&domain=${currentHref}&"></iframe>
            <iframe id="ex-msg-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://msg.douyu.com/web/index.html?exClean&domain=${currentHref}&"></iframe>
            <iframe id="ex-video-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://v.douyu.com/show/0?exClean&domain=${currentHref}&"></iframe>
            <iframe id="ex-cz-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://cz.douyu.com/item/gold?exClean&domain=${currentHref}&"></iframe>
          `;
        }
      });
    });

    // 删除账号
    const deleteBtn = itemEl.getElementsByClassName("ex-accountList-item__btn")[0];
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        (0, __imports.T)("【账号管理】正在删除...", "info");
        try {
          const accounts = JSON.parse((0, __imports.GM_getValue)("Ex_accountList") || "{}");
          delete accounts[targetUid];
          (0, __imports.GM_setValue)("Ex_accountList", JSON.stringify(accounts));
        } catch {}
        executePassportCommand("delete", targetUid);
      });
    }
  }

  const addBtn = document.getElementById("ex-accountList-item-add");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      clearAllCookies(() => {});
      executePassportCommand("clean", "null");
    });
  }
}
const ie = renderAccountList;

/**
 * 清除全站 Cookie 凭据 (导出兼容 ae)
 * @param {Function} onDone
 */
function clearAllCookies(onDone) {
  let finishedCount = 0;
  (0, __imports.GM_cookie)("list", { path: "/" }, (cookieList) => {
    if (cookieList && cookieList.length > 0) {
      for (let i = 0; i < cookieList.length; i++) {
        (0, __imports.GM_cookie)("delete", { name: cookieList[i].name }, () => {
          if (++finishedCount >= cookieList.length && typeof onDone === "function") {
            onDone();
          }
        });
      }
    } else if (typeof onDone === "function") {
      onDone();
    }
  });
}
const ae = clearAllCookies;

/**
 * 挂载 passport 通信隐藏管道执行命令 (导出兼容 re)
 * @param {'switch'|'delete'|'clean'} cmd
 * @param {string} uid
 */
function executePassportCommand(cmd, uid) {
  const iframeContainer = document.getElementById("ex-accountList-iframe");
  if (iframeContainer) {
    const currentHref = encodeURIComponent(window.location.href);
    iframeContainer.innerHTML = `
      <iframe id="login-passport-frame" width="100%" height="100%" scrolling="no" frameborder="0" src="https://passport.douyu.com/index/error/show404?&exid=chun&cmd=${cmd}&uid=${uid}&domain=${currentHref}&"></iframe>
    `;
  }
}
const re = executePassportCommand;

/**
 * 切换为纯音频独立播放器 (导出兼容 le)
 */
function launchAudioOnlyPlayer() {
  const pauseBtn = (0, __imports.E)([".pause-c594e8", ".icon-c8be96"]);
  if (pauseBtn) pauseBtn.click();

  (0, __imports.qr)(__imports.B, true, 0, "1428", () => {
    const slotIdx = __imports.D.length;
    const currentRoom = __imports.B;

    (0, __imports.qr)(currentRoom, false, 0, "1", (audioStreamUrl) => {
      if (!audioStreamUrl || audioStreamUrl === "None") {
        (0, __imports.T)("房间未开播或其他错误", "error");
        return;
      }

      const parts = String(audioStreamUrl).split("/live");
      const streamBaseUrl = parts.length > 0 ? parts[0] : "";

      const div = document.createElement("div");
      div.id = `exVideoDiv${slotIdx}`;
      div.rid = currentRoom;
      div.className = "exVideoDiv";
      div.innerHTML = `
        <div class='exVideoInfo' id='exVideoInfo${slotIdx}'>
          <a title='复制直播流地址'>
            <span class='exVideoRID' id='exVideoRID${slotIdx}' style='color:white'>斗鱼音频流 - ${currentRoom}</span>
          </a>
          <select style='display:none' class='exVideoQn' id='exVideoQn${slotIdx}'>
            <option value='1'>流畅</option><option value='2'>高清</option><option value='3'>超清</option><option value='0'>蓝光</option>
          </select>
          <select style='display:none' class='exVideoCDN' id='exVideoCDN${slotIdx}'>
            <option value='1'>主线路</option><option value='2'>备用线路5</option><option value='3'>备用线路6</option>
          </select>
          <a style='margin-left:5px;display:none' href='${streamBaseUrl}' target='_blank'>无视频？</a>
          <a><div class='exVideoClose' id='exVideoClose${slotIdx}'>X</div></a>
        </div>
        <video controls='controls' class='exVideoPlayer' id='exVideoPlayer${slotIdx}'></video>
        <div class='exVideoScale' id='exVideoScale${slotIdx}'></div>
      `;

      const targetContainer = (0, __imports.E)([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"]);
      if (targetContainer) {
        targetContainer.insertBefore(div, targetContainer.childNodes[0]);
        (0, __imports.on)(slotIdx);
        (0, __imports.tn)(slotIdx);
        (0, __imports.an)(slotIdx, currentRoom);
        (0, __imports.f)(slotIdx, audioStreamUrl);
      }
    });
  });
}
const le = launchAudioOnlyPlayer;

}
