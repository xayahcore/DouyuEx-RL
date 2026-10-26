function initPkg_RestoreYuba() {
  responseHook((url, text) => {
    if (url.indexOf("group/getBindGroup") !== -1) {
      return text.replace('"group_status":4', '"group_status":0');
    }
    return text;
  });
}

function initPkg_RestoreYuba_restore() {
  // 恢复被关闭的鱼吧
  let oldId = null;
  let newId = null;
  oldId = RestoreYuba_getYubaId(window.location.href);
  const urlParams = new URLSearchParams(window.location.search);
  const exRestore = urlParams.get("exRestore");
  if (!exRestore) return;
  newId = Number(exRestore);

  if (oldId === newId) return;

  RestoreYuba_initHook(oldId, newId);
  RestoreYuba_changeDom(oldId, newId);
}

function RestoreYuba_checkRedirect() {
  const oldId = RestoreYuba_getYubaId(window.location.href);
  if (!oldId) return;
  getYubaStatus(oldId).then((data) => {
    if (data.status_code == 3002) {
      const url = "https://yuba.douyu.com/discussion/4815048/posts?exRestore=" + oldId;
      window.location.href = url;
    }
  });
}

function RestoreYuba_getYubaId(url) {
  const match = url.match(/\/discussion\/(\d+)/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

function RestoreYuba_initHook(oldId, newId) {
  // 排除的url的关键字
  const excludeUrl = ["web/group/head", "/follow/topic", "group/unfollowGroup"];

  // 检查URL是否应该被排除
  function shouldExcludeUrl(url) {
    if (typeof url !== "string") return false;
    return excludeUrl.some((keyword) => url.includes(keyword));
  }

  // 拦截XMLHttpRequest请求
  const originalOpen = unsafeWindow.XMLHttpRequest.prototype.open;
  const originalSend = unsafeWindow.XMLHttpRequest.prototype.send;

  // 修改open方法，拦截并修改URL
  unsafeWindow.XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
    if (typeof url === "string" && url.includes(oldId) && !shouldExcludeUrl(url)) {
      url = url.replace(new RegExp(oldId, "g"), newId);
    }
    return originalOpen.call(this, method, url, async, user, password);
  };

  // 修改send方法，拦截并修改请求体
  unsafeWindow.XMLHttpRequest.prototype.send = function (body) {
    // 获取当前请求的URL
    const url = this.responseURL || this._url || "";

    // 如果URL应该被排除，则不处理请求体
    if (shouldExcludeUrl(url)) {
      return originalSend.call(this, body);
    }

    if (body && typeof body === "string" && body.includes(oldId)) {
      body = body.replace(new RegExp(oldId, "g"), newId);
    } else if (body && body instanceof FormData) {
      // 对FormData的处理比较复杂，需要遍历每个键值对
      const newFormData = new FormData();
      for (let pair of body.entries()) {
        const key = pair[0];
        let value = pair[1];

        if (typeof value === "string" && value.includes(oldId)) {
          value = value.replace(new RegExp(oldId, "g"), newId);
        }

        newFormData.append(key, value);
      }
      body = newFormData;
    }

    return originalSend.call(this, body);
  };

  // 拦截fetch请求
  const originalFetch = unsafeWindow.fetch;
  unsafeWindow.fetch = function (input, init) {
    // 处理URL
    let url = "";
    if (typeof input === "string") {
      url = input;
      if (input.includes(oldId) && !shouldExcludeUrl(input)) {
        input = input.replace(new RegExp(oldId, "g"), newId);
      }
    } else if (input instanceof Request) {
      url = input.url;
      if (url.includes(oldId) && !shouldExcludeUrl(url)) {
        // 创建新的Request对象
        input = new Request(url.replace(new RegExp(oldId, "g"), newId), input);
      }
    }

    // 如果URL应该被排除，则不处理请求体
    if (shouldExcludeUrl(url)) {
      return originalFetch.call(unsafeWindow, input, init);
    }

    // 处理请求体
    if (init && init.body) {
      if (typeof init.body === "string" && init.body.includes(oldId)) {
        init.body = init.body.replace(new RegExp(oldId, "g"), newId);
      } else if (init.body instanceof FormData) {
        // 对FormData的处理与上面相同
        const newFormData = new FormData();
        for (let pair of init.body.entries()) {
          const key = pair[0];
          let value = pair[1];

          if (typeof value === "string" && value.includes(oldId)) {
            value = value.replace(new RegExp(oldId, "g"), newId);
          }

          newFormData.append(key, value);
        }
        init.body = newFormData;
      }
    }

    return originalFetch.call(unsafeWindow, input, init);
  };
}

async function RestoreYuba_changeDom(oldId, newId) {
  const anchorInfo = await getYubaAnchorInfo(newId);
  if (anchorInfo) {
    const info = anchorInfo.data.generalOP[0];
    const avatar = info.avatar;
    const nickname = info.nick_name;

    // 鱼吧是页面自己的 SPA：头像/群名/群简介随时可能被重绘掉，
    // 原来的 [0].src / [0].innerText 一旦取不到就把整个恢复流程抛断（DomHook 每次重绘还会再抛一遍）。
    // 现在逐个判空：缺哪个就少改哪块，document.title 仍然能落地。
    function changeTitle() {
      const avatarNode = document.querySelector(".groupavatar__9mD1S .image__GNnZC");
      if (avatarNode) {
        avatarNode.src = avatar;
      }
      const nameNode = document.getElementsByClassName("groupname__BUzOM")[0];
      if (nameNode) {
        nameNode.innerText = nickname;
      }
      const descNode = document.getElementsByClassName("groupdesc__b8-53")[0];
      if (descNode) {
        descNode.innerText = `${nickname}的鱼吧`;
      }
      if (!avatarNode && !nameNode && !descNode) {
        ExGuard_warn("鱼吧恢复", "群头像/群名/群简介节点都不在，本次只改标题");
      }
      document.title = `${nickname}的鱼吧`;
    }

    changeTitle();
    new DomHook(".groupavatar__9mD1S", false, () => {
      changeTitle();
    });
  }
}

function getYubaAnchorInfo(groupId) {
  return new Promise((resolve) => {
    fetch("https://yuba.douyu.com/wbapi/web/group/managersdetail?group_id=" + groupId)
      .then((response) => response.json())
      .then((data) => {
        resolve(data);
      })
      .catch(() => {
        resolve(null);
      });
  });
}

function getYubaStatus(groupId) {
  return new Promise((resolve, reject) => {
    fetch("https://yuba.douyu.com/wbapi/web/group/head?group_id=" + groupId)
      .then((response) => response.json())
      .then((data) => {
        resolve(data);
      })
      .catch((error) => {
        reject(error);
      });
  });
}
