/*
    ImageDanmaku —— 图片弹幕
    ------------------------------------------------------------
    本轮加固的三处（都属"没有兜底"的同一类问题）：
      1) 上传链：预处理接口只有 onload、XHR 只有 onload —— 失败/超时/结构不对时
         Promise 永远不 settle，聊天框里那行「[DouyuEx图片上传中]」就永久卡着；
      2) 两处 1 秒轮询没有上限：节点始终不出现时定时器永久空转；
      3) 初始化裸取节点：聊天工具栏还没渲染时 initPkg_ImageDanmaku_Dom 直接抛，
         把同一次初始化的后续功能一起带走。

    现在的契约：所有请求失败都收敛成 null/空串并留痕；所有轮询走 ExGuard_pollFor
    （有次数上限，放弃时留一条自证）；DOM 一律先判空再操作。
*/

// 轮询参数：默认 1 秒 × 60 次（1 分钟）；测试会改这份配置来验证上限
let ImageDanmaku_pollOpts = { intervalMs: 1000, maxTries: 60, tag: "图片弹幕" };

function initPkg_ImageDanmaku() {
  try {
    initPkg_ImageDanmaku_Dom();
  } catch (e) {
    ExGuard_warn("图片弹幕", "图标插入失败（不影响弹幕图片渲染）", e);
  }
  try {
    initPkg_ImageDanmaku_Func();
  } catch (e) {
    ExGuard_warn("图片弹幕", "功能初始化失败", e);
  }
}

function initPkg_ImageDanmaku_Dom() {
  const chatTool = document.getElementsByClassName("ChatToolBar__right")[0];
  if (!chatTool) {
    ExGuard_warn("图片弹幕", "聊天工具栏还没渲染，本次不插入上传图标");
    return false;
  }
  const dom = document.createElement("div");
  dom.className = "BarrageFilter";
  dom.title = "添加图片弹幕（仅安装插件的用户可见）";
  dom.innerHTML = `
  <input id="ex-upload-image-input" type="file" style="display: none" accept="image/*">
  <svg id="ex-upload-image-svg" viewBox="0 0 1088 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="21426" width="18" height="18"><path d="M864.896 639.68a37.76 37.76 0 0 1 37.568 37.568v112.832h112.832a37.76 37.76 0 0 1 37.568 37.568 37.76 37.76 0 0 1-37.568 37.632H902.4v112.768a37.76 37.76 0 0 1-37.568 37.632 37.76 37.76 0 0 1-37.632-37.632V865.28h-112.832a37.76 37.76 0 0 1-37.568-37.632 37.76 37.76 0 0 1 37.568-37.568h112.832v-112.832a37.76 37.76 0 0 1 37.632-37.568zM930.688 0.384c46.656 0 84.608 37.952 84.608 84.608v474.688a37.632 37.632 0 0 1-75.2 0V398.208l-377.088 304.64a84.352 84.352 0 0 1-94.4 8.32l-1.28-0.768-209.216-127.616a9.344 9.344 0 0 0-7.552-0.256l-175.36 125.632v147.712c0 5.12 4.288 9.408 9.408 9.408H595.2a37.632 37.632 0 0 1 0 75.2H84.608A84.672 84.672 0 0 1 0 855.872V84.992C0 38.4 37.952 0.384 84.608 0.384z m0 75.2H84.608a9.536 9.536 0 0 0-9.408 9.408V615.68l135.552-97.152 1.792-1.024a84.032 84.032 0 0 1 82.432-0.256l1.344 0.768L505.6 645.632a9.344 9.344 0 0 0 10.048-1.152l0.128-0.128 424.32-342.848V84.992a9.536 9.536 0 0 0-9.344-9.408zM282.048 150.784c72.512 0 131.584 59.072 131.584 131.648a131.776 131.776 0 0 1-131.584 131.584A131.776 131.776 0 0 1 150.4 282.432c0-72.576 59.072-131.648 131.648-131.648z m0 75.264a56.448 56.448 0 0 0 0 112.768 56.448 56.448 0 0 0 0-112.768z" fill="#BBBBBB" p-id="21427"></path></svg>
  `;
  chatTool.insertBefore(dom, chatTool.firstChild);
  return true;
}

function ImageDanmaku_getChatInput() {
  return document.getElementsByClassName("ChatSend-txt")[0] || null;
}

function initPkg_ImageDanmaku_Func() {
  const chatDom = ImageDanmaku_getChatInput();
  if (!chatDom) {
    ExGuard_warn("图片弹幕", "聊天输入框还没渲染，图片弹幕的上传功能本次不启用");
  }

  document.addEventListener("paste", (event) => {
    try {
      // 不能把 init 时抓到的 chatDom 关进闭包：进房瞬间聊天框往往还没渲染，
      // 那样这一整场「粘贴图片」都会失效（audit-wave4 ID1）。每次按键时现取。
      const inputDom = ImageDanmaku_getChatInput();
      if (!inputDom) return;
      if (document.activeElement !== inputDom) return;
      const clipboard = event.clipboardData || (event.originalEvent && event.originalEvent.clipboardData);
      if (!clipboard || !clipboard.items) return;
      const items = clipboard.items;
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        if (!item) continue;
        if (item.kind === "file" && typeof item.type === "string" && item.type.indexOf("image/") === 0) {
          const file = item.getAsFile ? item.getAsFile() : null;
          if (!file) continue;
          ImageDanmaku_uploadAndInsert(file, inputDom);
          break;
        }
      }
    } catch (e) {
      ExGuard_warn("图片弹幕", "粘贴图片时处理失败", e);
    }
  });

  ExGuard_pollFor(
    function () { return document.getElementById("js-barrage-list"); },
    function () {
      new DomHook("#js-barrage-list", false, (m) => {
        if (!m || m.length <= 0) return;
        if (!m[0].addedNodes || m[0].addedNodes.length <= 0) return;
        let dom = m[0].addedNodes[0];
        if (!dom || !dom.getElementsByClassName) return;
        const contentDom = dom.getElementsByClassName("Barrage-content");
        if (!contentDom || contentDom.length === 0) return;
        const text = contentDom[0].innerHTML;
        if (!text || text.indexOf("[DouyuEx图片") === -1) return;
        contentDom[0].innerHTML = text.replace(/\[DouyuEx图片(.*?)\]/g, (match, str) => getImageDanmakuHtml(str));
      });
    },
    Object.assign({ tag: "图片弹幕" }, ImageDanmaku_pollOpts)
  );

  ExGuard_pollFor(
    function () { return document.getElementsByClassName("danmu-fbb2a3")[0]; },
    function () {
      new DomHook(".danmu-fbb2a3", false, (m) => {
        if (!m || m.length <= 0) return;
        if (!m[0].addedNodes || m[0].addedNodes.length <= 0) return;
        let dom = m[0].addedNodes[0];
        if (!dom || !dom.innerHTML) return;
        const text = dom.innerHTML;
        if (text.indexOf("[DouyuEx图片") === -1) return;
        dom.innerHTML = text.replace(/\[DouyuEx图片(.*?)\]/g, (match, str) => getImageDanmakuHtml(str));
      });
    },
    Object.assign({ tag: "图片弹幕" }, ImageDanmaku_pollOpts)
  );

  const svgDom = document.getElementById("ex-upload-image-svg");
  const inputDom = document.getElementById("ex-upload-image-input");
  if (svgDom && inputDom) {
    svgDom.addEventListener("click", () => {
      inputDom.click();
    });
    inputDom.addEventListener("change", (e) => {
      try {
        const file = e && e.target && e.target.files ? e.target.files[0] : null;
        if (!file) return;
        const input = ImageDanmaku_getChatInput();
        if (!input) {
          ExGuard_warn("图片弹幕", "聊天输入框不存在，图片无法插入");
          return;
        }
        ImageDanmaku_uploadAndInsert(file, input);
      } catch (err) {
        ExGuard_warn("图片弹幕", "选择图片后处理失败", err);
      }
    });
  } else {
    ExGuard_warn("图片弹幕", "上传控件不存在（图标插入失败），本次不绑定点击");
  }
}

/** 上传并在聊天框里落成 [DouyuEx图片xxx.png]；失败会清掉占位符并留痕 */
function ImageDanmaku_uploadAndInsert(file, chatDom) {
  return new Promise((resolve) => {
    if (!chatDom) {
      ExGuard_warn("图片弹幕", "聊天输入框不存在，放弃本次上传");
      resolve(false);
      return;
    }
    chatDom.value += "[DouyuEx图片上传中]";
    ExGuard_withTimeout(getUploadImageUrl(file), 20000, "图片弹幕").then((url) => {
      if (!url) {
        ImageDanmaku_removePlaceholder(chatDom);
        ExGuard_warn("图片弹幕", "图片上传失败，已清掉「图片上传中」占位符");
        resolve(false);
        return;
      }
      addImageDanmaku(url, chatDom);
      resolve(true);
    });
  });
}

function ImageDanmaku_removePlaceholder(chatDom) {
  if (!chatDom || typeof chatDom.value !== "string") return;
  chatDom.value = chatDom.value.replace("[DouyuEx图片上传中]", "");
}

function getImageDanmakuHtml(str) {
  try {
    if (!isValidImageFile(str)) return "";
    const split = str.split(".");
    if (!split[1]) return "";
    const url = decompressImageUrl(split[0]);
    const realImageUrl = DOMPurify.sanitize(`https://img.douyucdn.cn/data/yuba/weibo/${url.slice(0, 4) + "/" + url.slice(4, 6) + "/" + url.slice(6, 8) + "/" + url}.200x0.${split[1]}`);
    const imgHtml = `<a href="${realImageUrl.replace("200x0.", "")}" target="_blank"><img class="ex-image-danmaku" src="${realImageUrl}" alt=""></a>`;
    return DOMPurify.sanitize(imgHtml);
  } catch (e) {
    ExGuard_warn("图片弹幕", "解析图片弹幕地址失败，原样保留文本", e);
    return "";
  }
}

function addImageDanmaku(url, chatDom) {
  const input = chatDom || ImageDanmaku_getChatInput();
  if (!input) {
    ExGuard_warn("图片弹幕", "聊天输入框不存在，图片地址无处插入");
    return false;
  }
  if (typeof url !== "string" || url.indexOf(".") === -1) {
    ExGuard_warn("图片弹幕", "上传接口没有返回可用的图片地址，放弃插入");
    ImageDanmaku_removePlaceholder(input);
    return false;
  }
  const split = url.split(".");
  try {
    input.value = input.value.replace("[DouyuEx图片上传中]", `[DouyuEx图片${compressImageUrl(split[0])}.${split[1]}]`);
  } catch (e) {
    ExGuard_warn("图片弹幕", "压缩图片地址失败，放弃插入", e);
    ImageDanmaku_removePlaceholder(input);
    return false;
  }
  return true;
}

function compressImageUrl(text) {
  let number = BigInt(text);
  return number.toString(36);
}

function decompressImageUrl(base36Str) {
  const base36Chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let decimal = 0n;
  let multiplier = 1n;

  for (let i = base36Str.length - 1; i >= 0; i--) {
    const char = base36Str[i].toUpperCase();
    const charIndex = base36Chars.indexOf(char);
    if (charIndex === -1) {
      throw new Error(`Invalid base36 character: ${char}`);
    }
    decimal += BigInt(charIndex) * multiplier;
    multiplier *= 36n;
  }

  return decimal.toString();
}

function getUploadPreRequest() {
  // 以前这里只有 onload：失败/超时没有回调 → Promise 永远不 settle。
  return ExGuard_xhr({
    method: "GET",
    url: `https://yuba.douyu.com/wbapi/web/image/preRequest?source=&timestamp=${new Date().getTime()}`,
    responseType: "json",
    headers: {
      "dy-client": "pc",
      "dy-token": typeof dyToken === "undefined" ? "" : dyToken
    },
    tag: "图片弹幕",
  }, 15000);
}

function dataURLtoBlob(dataurl) {
  var arr = dataurl.split(","),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {
    type: mime
  });
}

function getUploadImageUrl(file) {
  return new Promise(async (resolve, reject) => {
    try {
      const preRequestRet = await getUploadPreRequest();
      const preRequestData = preRequestRet && preRequestRet.data;
      if (!preRequestData) {
        // 旧实现这里是裸 return：Promise 既不 resolve 也不 reject，占位符永远清不掉
        reject(new Error("上传预处理接口没有返回 data"));
        return;
      }
      let formData = new FormData();

      for (let key in preRequestData) {
        formData.append(key, preRequestData[key]);
      }
      formData.append("file", file);

      let request = new XMLHttpRequest();
      request.open("POST", "https://img.douyucdn.cn/upload", true);
      request.timeout = 20000;
      request.onload = function () {
        if (this.status >= 200 && this.status < 400) {
          try {
            let json = JSON.parse(this.response);
            if (!json || typeof json.uri !== "string") {
              reject(new Error("上传接口返回里没有 uri"));
              return;
            }
            const ret = json.uri.split("/").pop().split("?")[0];
            resolve(ret);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error("图片上传失败：" + this.status));
        }
      };
      request.onerror = function () {
        reject(new Error("图片上传网络错误"));
      };
      request.ontimeout = function () {
        reject(new Error("图片上传超时"));
      };
      request.send(formData);
    } catch (e) {
      reject(e);
    }
  });
}

function getImageDanmakuFromImgSrc(src) {
  const split = src.split("/");
  const url = split.pop();
  const split2 = url.split(".");
  return `[DouyuEx图片${compressImageUrl(split2[0])}.${split2[2]}]`;
}
