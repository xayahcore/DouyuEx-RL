function* (__imports) {
yield {"_n": { get: () => _n, set: value => { _n = value; } },
"vn": { get: () => vn, set: value => { vn = value; } },
"wn": { get: () => wn, set: value => { wn = value; } },
"xn": { get: () => xn, set: value => { xn = value; } }};
/**
 * 鱼吧已关闭板块重定向恢复、未读私信红点净化与板块 ID 代理服务
 */
let vn = 0;

/**
 * 移除未读私信与红点徽章样式 (导出兼容 xn)
 */
function hideMessageNoticeBadges() {
  (0, __imports.tl)(
    "Ex_Style_RemoveMsgNotice",
    ".UserInfo .Badge, .ChatLetter-PopUnread { display: none !important; }"
  );
}
const xn = hideMessageNoticeBadges;

/**
 * 从当前 URL 提取鱼吧 discussion 板块 ID
 * @param {string} url
 * @returns {string|null}
 */
function extractYubaDiscussionId(url) {
  const match = url.match(/\/discussion\/(\d+)/);
  return (match && match[1]) ? match[1] : null;
}

/**
 * 劫持 XHR 与 Fetch 请求，恢复已关闭鱼吧板块的数据读取 (导出兼容 wn)
 */
function restoreClosedYubaGroup() {
  const currentGroupId = extractYubaDiscussionId(window.location.href);
  const restoreParam = new URLSearchParams(window.location.search).get("exRestore");

  if (restoreParam && currentGroupId !== restoreParam) {
    const originalGid = String(currentGroupId);
    const targetGid = String(restoreParam);
    const whitelistEndpoints = ["web/group/head", "/follow/topic", "group/unfollowGroup"];

    const isWhitelisted = (endpoint) => {
      return typeof endpoint === "string" && whitelistEndpoints.some(item => endpoint.includes(item));
    };

    // 劫持 XMLHttpRequest
    const rawXhrOpen = __imports.unsafeWindow.XMLHttpRequest.prototype.open;
    const rawXhrSend = __imports.unsafeWindow.XMLHttpRequest.prototype.send;

    __imports.unsafeWindow.XMLHttpRequest.prototype.open = function (method, url, ...args) {
      let reqUrl = url;
      if (typeof reqUrl === "string" && reqUrl.includes(originalGid) && !isWhitelisted(reqUrl)) {
        reqUrl = reqUrl.replace(new RegExp(originalGid, "g"), targetGid);
      }
      return rawXhrOpen.call(this, method, reqUrl, ...args);
    };

    __imports.unsafeWindow.XMLHttpRequest.prototype.send = function (body) {
      const activeUrl = this.responseURL || this._url || "";
      let reqBody = body;
      if (!isWhitelisted(activeUrl)) {
        if (reqBody && typeof reqBody === "string" && reqBody.includes(originalGid)) {
          reqBody = reqBody.replace(new RegExp(originalGid, "g"), targetGid);
        } else if (reqBody && reqBody instanceof FormData) {
          const newFormData = new FormData();
          for (const [key, val] of reqBody.entries()) {
            let newVal = val;
            if (typeof newVal === "string" && newVal.includes(originalGid)) {
              newVal = newVal.replace(new RegExp(originalGid, "g"), targetGid);
            }
            newFormData.append(key, newVal);
          }
          reqBody = newFormData;
        }
      }
      return rawXhrSend.call(this, reqBody);
    };

    // 劫持 Fetch
    const rawFetch = __imports.unsafeWindow.fetch;
    __imports.unsafeWindow.fetch = function (resource, init) {
      let finalResource = resource;
      let urlStr = "";

      if (typeof resource === "string") {
        urlStr = resource;
        if (urlStr.includes(originalGid) && !isWhitelisted(urlStr)) {
          finalResource = urlStr.replace(new RegExp(originalGid, "g"), targetGid);
        }
      } else if (resource instanceof Request) {
        urlStr = resource.url;
        if (urlStr.includes(originalGid) && !isWhitelisted(urlStr)) {
          finalResource = new Request(urlStr.replace(new RegExp(originalGid, "g"), targetGid), resource);
        }
      }

      let finalInit = init;
      if (!isWhitelisted(urlStr) && init?.body) {
        if (typeof init.body === "string" && init.body.includes(originalGid)) {
          finalInit = { ...init, body: init.body.replace(new RegExp(originalGid, "g"), targetGid) };
        } else if (init.body instanceof FormData) {
          const newFormData = new FormData();
          for (const [k, v] of init.body.entries()) {
            let newVal = v;
            if (typeof newVal === "string" && newVal.includes(originalGid)) {
              newVal = newVal.replace(new RegExp(originalGid, "g"), targetGid);
            }
            newFormData.append(k, newVal);
          }
          finalInit = { ...init, body: newFormData };
        }
      }

      return rawFetch.call(__imports.unsafeWindow, finalResource, finalInit);
    };

    // 拉取原吧务详情并回填页面标题与头像
    (async (targetId) => {
      try {
        const res = await (0, __imports.fetch)(`https://yuba.douyu.com/wbapi/web/group/managersdetail?group_id=${targetId}`);
        const data = await res.json();
        const opInfo = data?.data?.generalOP?.[0];
        if (opInfo) {
          const avatarUrl = opInfo.avatar;
          const nickName = opInfo.nick_name;

          const syncYubaHeader = () => {
            const avatarImg = document.querySelector(".groupavatar__9mD1S .image__GNnZC");
            if (avatarImg && avatarUrl) avatarImg.src = avatarUrl;

            const nameEl = document.getElementsByClassName("groupname__BUzOM")[0];
            if (nameEl) nameEl.innerText = nickName;

            const descEl = document.getElementsByClassName("groupdesc__b8-53")[0];
            if (descEl) descEl.innerText = `${nickName}的鱼吧`;

            document.title = `${nickName}的鱼吧`;
          };

          syncYubaHeader();
          new __imports.DomMutationSubscription(".groupavatar__9mD1S", false, syncYubaHeader);
        }
      } catch {}
    })(targetGid);
  }
}
const wn = restoreClosedYubaGroup;

/**
 * 探测鱼吧状态，遇 3002 关闭状态自动无感跳转至恢复通道 (导出兼容 _n)
 */
function checkAndRedirectClosedYuba() {
  const currentGid = extractYubaDiscussionId(window.location.href);
  if (!currentGid) return;

  (0, __imports.fetch)(`https://yuba.douyu.com/wbapi/web/group/head?group_id=${currentGid}`)
    .then(res => res.json())
    .then(data => {
      // 3002 表示板块已下线或关闭，重定向到通用 discussion 桥接管道
      if (data?.status_code === 3002) {
        window.location.href = `https://yuba.douyu.com/discussion/4815048/posts?exRestore=${currentGid}`;
      }
    })
    .catch(() => {});
}
const _n = checkAndRedirectClosedYuba;

}
