function* (__imports) {
yield {"ai": { get: () => ai, set: value => { ai = value; } },
"mountVideoTimestamps": { get: () => mountVideoTimestamps, set: value => { mountVideoTimestamps = value; } }};
/**
 * 鱼吧关注板块列表与录播视频录制时间戳映射服务
 */
let currentVideoStartTimeMs = 0;
let videoObserver = null;
let shareObserver = null;
let previewObserver = null;
let renderTimer = 0;
let currentVideoHashId = "";

/**
 * 鱼吧关注群组分页拉取 (契约兼容导出 ai)
 * @param {number|string} page - 页码
 * @returns {Promise<object>}
 */
function ai(page) {
  return new Promise((resolve) => {
    (0, __imports.GM_xmlhttpRequest)({
      method: "GET",
      url: `https://yuba.douyu.com/wbapi/web/group/myFollow?page=${String(page)}&limit=30`,
      responseType: "json",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "dy-client": "pc",
        "dy-token": __imports.m,
      },
      onload: (res) => resolve(res.response?.data),
      onerror: () => resolve(null),
      ontimeout: () => resolve(null)
    });
  });
}

/**
 * 录播播放器悬停进度条时间戳挂载与监听
 * @param {object} owner - 房间/播放器生命周期管理者
 */
function mountVideoTimestamps(owner) {
  currentVideoStartTimeMs = 0;
  currentVideoHashId = "";

  owner.own(() => {
    for (const observer of [videoObserver, shareObserver, previewObserver]) {
      observer?.disconnect();
    }
    videoObserver = shareObserver = previewObserver = null;
    (0, __imports.clearTimeout)(renderTimer);
    renderTimer = 0;
    currentVideoHashId = "";
    currentVideoStartTimeMs = 0;
  });

  const pollTimer = owner.interval(() => {
    const video = document.getElementsByTagName('demand-video')[0]?.shadowRoot?.getElementById('__video');
    const preview = getVideoTimestampPreviewEl();
    const share = document.getElementsByTagName('demand-video-toolbar')[0]?.shadowRoot?.querySelector('share-hover');

    if (!video || !preview || !share) return;
    (0, __imports.clearInterval)(pollTimer);

    const refresh = () => fetchVideoOriginTime(owner);
    const render = () => {
      const seconds = Number(getHoverShowTimeSeconds());
      renderHoverTimestampLabel(
        String((0, __imports.k)('yyyy-MM-dd hh:mm:ss', new Date(Number(currentVideoStartTimeMs + 1000 * seconds)))) +
        '<br/>' +
        (0, __imports.J)(seconds)
      );
    };

    refresh();
    videoObserver = new MutationObserver(owner.guard(refresh));
    videoObserver.observe(video, { attributes: true, childList: true, subtree: false });

    shareObserver = new MutationObserver(owner.guard(records => {
      if (records.some(record => record.attributeName === 'hashid')) refresh();
    }));
    shareObserver.observe(share, { attributes: true });

    previewObserver = new MutationObserver(owner.guard(records => {
      for (const record of records) {
        if (record.attributeName === 'showtime') { render(); break; }
        if (record.attributeName === 'isshow') {
          (0, __imports.clearTimeout)(renderTimer);
          renderTimer = owner.timeout(render, 0);
          break;
        }
      }
    }));
    previewObserver.observe(preview, { attributes: true, childList: true, subtree: false });
  }, 1000);
}

function getVideoTimestampPreviewEl() {
  return document.getElementsByTagName('demand-video')[0]?.shadowRoot
    ?.getElementById('demandcontroller-bar')?.shadowRoot
    ?.querySelector('demand-video-controller-progress')?.shadowRoot
    ?.querySelector('demand-video-controller-preview');
}

function fetchVideoOriginTime(owner) {
  let hashId = (() => {
    try {
      const shareHover = document.getElementsByTagName("demand-video-toolbar")[0]?.shadowRoot?.querySelector("share-hover");
      const id = shareHover?.getAttribute("hashid");
      if (id) return id;
    } catch {}
    const pathParts = String(window.location.pathname).split("/");
    return pathParts[pathParts.length - 1];
  })();

  if (!hashId) return;

  currentVideoHashId = hashId;
  const lockedId = hashId;

  (0, __imports.fetch)(`https://v.douyu.com/video/video/getVideoUrl?vid=${hashId}`, {
    method: "GET",
    mode: "no-cors",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
    .then(res => res.json())
    .then(res => {
      if (!owner.disposed && lockedId === currentVideoHashId && res?.data?.viewthumb?.[0]?.url) {
        const dateStr = (0, __imports.v)(res.data.viewthumb[0].url, "--", "/");
        if (dateStr) {
          const isoStr = dateStr.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3 $4:$5:$6");
          currentVideoStartTimeMs = new Date(isoStr).getTime();
        }
      }
    })
    .catch(err => {
      console.debug("[DouyuEx NEXT] 录播起播时间戳获取异常:", err);
    });
}

function getHoverShowTimeSeconds() {
  const preview = getVideoTimestampPreviewEl();
  const showTime = preview?.getAttribute('showtime');
  return Number(showTime || 0).toFixed(0);
}

function renderHoverTimestampLabel(htmlContent) {
  const label = getVideoTimestampPreviewEl()?.shadowRoot?.querySelector('.Preview label');
  if (label) {
    label.style.position = "relative";
    label.style.bottom = "60px";
    label.style.backgroundColor = "rgba(0,0,0,0.4)";
    label.innerHTML = htmlContent;
  }
}

}
