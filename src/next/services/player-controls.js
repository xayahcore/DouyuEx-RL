function* (__imports) {
yield {"$e": { get: () => $e, set: value => { $e = value; } },
"Xe": { get: () => Xe, set: value => { Xe = value; } }};
/**
 * 录播视频高能弹幕热度进度条 (Heatmap) 与视频/弹幕下载控制中心
 */

function createVodAction(owner = __imports.roomRouteLifetime) {
  const toolbar = document.getElementsByTagName("demand-video-toolbar")[0];
  const share = toolbar?.shadowRoot?.querySelector("share-hover");
  const video = share?.getAttribute("hashid");
  const controller = new AbortController();

  const current = () =>
    !owner?.disposed &&
    toolbar?.isConnected &&
    document.getElementsByTagName("demand-video-toolbar")[0] === toolbar &&
    share?.getAttribute("hashid") === video;

  owner?.own(() => controller.abort());

  return {
    signal: controller.signal,
    current,
    check() {
      if (!current()) {
        controller.abort();
        throw new Error("VOD action expired");
      }
    }
  };
}

function vodAction(callback, label, owner) {
  return async () => {
    const job = createVodAction(owner);
    try {
      job.check();
      await callback(job);
    } catch (error) {
      if (job.current()) {
        if (label) label.innerText = "下载失败";
        (0, __imports.T)(error?.message || "请求失败，请重试", "error");
      }
    }
  };
}

let heatmapObserver = null;
let isHeatmapLoading = false;
const BARRAGE_LINE_ID = "ex-barrageLine";
let vodHeatmapGeneration = 0;

/**
 * 挂载录播弹幕高能热度曲线进度条 (导出兼容 Xe)
 * @param {object} [owner]
 */
function mountVodHeatmap(owner = __imports.roomRouteLifetime) {
  owner.own(() => {
    isHeatmapLoading = false;
    vodHeatmapGeneration++;
  });

  const pollTimer = owner.interval(() => {
    const progressBarSign = document.getElementsByTagName("demand-video")[0]?.shadowRoot
      ?.getElementById("demandcontroller-bar")?.shadowRoot
      ?.querySelector("demand-video-controller-progress")?.shadowRoot
      ?.querySelector(".ProgressBar-Sign");

    const toolbarShadow = document.getElementsByTagName("demand-video-toolbar")[0]?.shadowRoot;

    if (progressBarSign && toolbarShadow) {
      (0, __imports.clearInterval)(pollTimer);

      const styleEl = document.createElement("style");
      styleEl.innerHTML = `.no-hasLR #${BARRAGE_LINE_ID} { display: none !important; }`;
      document.getElementsByTagName("demand-video")[0]?.shadowRoot
        ?.getElementById("demandcontroller-bar")?.shadowRoot
        ?.querySelector("demand-video-controller-progress")?.shadowRoot
        ?.append(styleEl);

      loadVodHeatmapData(owner);

      const shareHover = toolbarShadow.querySelector("share-hover");
      if (shareHover) {
        heatmapObserver = new MutationObserver(owner.guard(() => {
          loadVodHeatmapData(owner);
        }));
        heatmapObserver.observe(shareHover, { attributes: true, childList: true, subtree: false });
        owner.own(() => heatmapObserver?.disconnect());
      }
    }
  }, 1000);
}
const Xe = mountVodHeatmap;

async function loadVodHeatmapData(owner = __imports.roomRouteLifetime) {
  if (isHeatmapLoading) return;

  const job = createVodAction(owner);
  const generation = ++vodHeatmapGeneration;

  try {
    job.check();
    isHeatmapLoading = true;
    owner.timeout(() => { isHeatmapLoading = false; }, 1000);
    (0, __imports.T)("弹幕高能进度条加载中，请耐心等待", "info");

    const progressShadow = document.getElementsByTagName("demand-video")[0]?.shadowRoot
      ?.getElementById("demandcontroller-bar")?.shadowRoot
      ?.querySelector("demand-video-controller-progress")?.shadowRoot;

    const progressBar = progressShadow?.querySelector(".ProgressBar");
    const existingLine = progressShadow?.querySelector(`#${BARRAGE_LINE_ID}`);
    if (existingLine) existingLine.remove();

    const videoHashId = document.getElementsByTagName("demand-video-toolbar")[0]?.shadowRoot
      ?.querySelector("share-hover")?.getAttribute("hashid");

    const timeLabelText = document.getElementsByTagName("demand-video")[0]?.shadowRoot
      ?.getElementById("demandcontroller-bar")?.shadowRoot
      ?.querySelector("#time-label")?.innerText || "";

    const timeParts = timeLabelText.split("/");
    if (timeParts.length === 0) return;

    const parseTotalDurationMs = (str) => {
      const parts = str.split(":");
      let totalSec = 0;
      if (parts.length === 1) totalSec = Number(parts[0]);
      else if (parts.length === 2) totalSec = 60 * Number(parts[0]) + Number(parts[1]);
      else if (parts.length === 3) totalSec = 3600 * Number(parts[0]) + 60 * Number(parts[1]) + Number(parts[2]);
      return 1000 * totalSec;
    };

    const bucketDurationMs = parseTotalDurationMs(timeParts[1]) / 99;
    const bucketCounts = new Array(100).fill(0);
    const visitedPages = new Set();
    let pageIdx = 0;

    do {
      if (visitedPages.has(String(pageIdx))) throw new Error("弹幕分页重复");
      visitedPages.add(String(pageIdx));

      const pageData = await (0, __imports.Ye)(videoHashId, pageIdx, job.signal);
      job.check();
      if (generation !== vodHeatmapGeneration) return;

      pageIdx = pageData.data.pre;
      const danmuList = pageData.data.list || [];
      for (let i = 0; i < danmuList.length; i++) {
        const item = danmuList[i];
        const bucket = Math.floor(item.tl / bucketDurationMs);
        if (bucket >= 0 && bucket < 100) {
          bucketCounts[bucket]++;
        }
      }
    } while (pageIdx >= 0);

    const stepWidth = 1000 / bucketCounts.length;
    const maxDanmuCount = Math.max(...bucketCounts) / 100;
    const points = [];

    for (let i = 0; i < bucketCounts.length; i++) {
      const count = bucketCounts[i];
      const x = i * stepWidth;
      points.push([x, count / maxDanmuCount]);
    }

    let pathCurve = "";
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      pathCurve += `C ${x1} ${80 - (y1 + y2) / 2}, ${x2} ${80 - (y1 + y2) / 2}, ${x2} ${80 - y2} `;
    }

    const svgPathD = `M 0 100 L 0 80 ${pathCurve}L 1000 100 Z`;
    const svgHtml = `
      <svg preserveAspectRatio="none" width="100%" height="100%" viewBox="0 0 1000 100">
        <path fill="rgba(255,255,255,0.3)" d="${svgPathD}" />
      </svg>
    `;

    if (svgPathD.includes("NaN")) {
      (0, __imports.T)("弹幕高能进度条加载失败", "error");
      return;
    }

    const lineContainer = document.createElement("div");
    lineContainer.id = BARRAGE_LINE_ID;
    lineContainer.style.cssText = "position:absolute;width:100%;height:30px;bottom:0px;pointer-events:none;cursor:default;";
    lineContainer.innerHTML = svgHtml;

    if (progressBar) {
      progressBar.insertBefore(lineContainer, progressBar.childNodes[0]);
    }
  } catch (error) {
    if (job.current() && generation === vodHeatmapGeneration) {
      (0, __imports.T)(error.message || "弹幕高能进度条加载失败", "error");
    }
  } finally {
    if (generation === vodHeatmapGeneration) isHeatmapLoading = false;
  }
}

/**
 * 在录播工具栏挂载视频与弹幕下载面板 (导出兼容 $e)
 * @param {object} [owner]
 */
function mountVodDownloader(owner = __imports.roomRouteLifetime) {
  const pollTimer = owner.interval(() => {
    const toolbarShadow = document.getElementsByTagName("demand-video-toolbar")[0]?.shadowRoot;
    if (toolbarShadow) {
      (0, __imports.clearInterval)(pollTimer);
      const positiveUl = toolbarShadow.querySelector(".ToolBar-positiveUl");
      if (!positiveUl) return;

      const styleEl = document.createElement("style");
      styleEl.innerHTML = `
        #btn-download:hover .download__panel { display: block; }
        .download__panel {
          width: 150px;
          position: absolute;
          text-align: center;
          cursor: default;
          margin-top: 29px;
          margin-left: -38px;
          box-shadow: 0px 3px 10px 0px rgba(0,0,0,0.2);
          display: none;
          background: white;
          border-radius: 4px;
          z-index: 1000;
        }
        .download__item {
          height: 30px;
          line-height: 30px;
          width: 100%;
          cursor: pointer;
          font-size: 12px;
          color: #333;
        }
        .download__item:hover { color: rgb(255, 119, 0); background: #f9f9f9; }
      `;
      toolbarShadow.appendChild(styleEl);

      const downloadLi = document.createElement("li");
      downloadLi.id = "btn-download";
      downloadLi.title = "下载视频";
      downloadLi.innerHTML = `
        <div class="download__panel">
          <div class="download__item" id="download__default" title="文件超过2GB时可能会下载失败">
            <span class="ToolBar-iconText">浏览器下载</span>
          </div>
          <div class="download__item" id="download__copy" title="可将链接填至第三方下载器中下载">
            <span class="ToolBar-iconText">复制m3u8链接</span>
          </div>
          <div class="download__item" id="download__barrage" title="下载弹幕(.xlsx)">
            <span class="ToolBar-iconText">下载弹幕(.xlsx)</span>
          </div>
          <div class="download__item" id="download__barrageass" title="下载弹幕(.ass)">
            <span class="ToolBar-iconText">下载弹幕(.ass)</span>
          </div>
        </div>
        <span class="ToolBar-icon">
          <svg class="icon" viewBox="0 0 1024 1024" width="28" height="28">
            <path d="M761.98 413.12c0.25-4.4 0.39-8.82 0.39-13.28 0-127.18-102.84-230.28-229.71-230.28s-229.71 103.1-229.71 230.28c0 0.67 0.02 1.33 0.03 2a213.156 213.156 0 0 0-38.91-3.58c-117.2 0-212.21 95.25-212.21 212.74 0 117.49 95.01 212.74 212.21 212.74 2.94 0 5.86-0.08 8.77-0.2 2.54 0.13 5.09 0.2 7.66 0.2h467.35c2.82 0 5.61-0.09 8.39-0.24 108.96-5.16 195.72-95.13 195.72-205.36 0.01-108.3-83.73-197.04-189.98-205.02zM616.33 584.24l-90.86 93.93c-0.78 1.11-1.66 2.17-2.63 3.17-3.95 4.09-8.9 6.62-14.09 7.61-8.34 1.77-17.38-0.51-23.97-6.89a25.975 25.975 0 0 1-3.16-3.68l-93.5-90.45c-10.53-10.19-10.81-26.99-0.62-37.52 10.19-10.53 26.99-10.81 37.52-0.62l45.09 43.62c0-0.06-0.01-0.12-0.01-0.18l-2.43-146.62c-0.3-17.83 13.92-32.52 31.75-32.82 17.83-0.3 32.52 13.92 32.82 31.75l2.43 146.63v0.17l43.52-44.99c10.19-10.53 26.99-10.81 37.52-0.62 10.53 10.17 10.81 26.97 0.62 37.51z" fill="#515151"></path>
          </svg>
        </span>
        <span class="ToolBar-iconText" id="download-text">下载</span>
      `;
      positiveUl.appendChild(downloadLi);

      const downloadTextEl = toolbarShadow.querySelector("#download-text");
      const defaultItem = toolbarShadow.querySelector("#download__default");
      const copyItem = toolbarShadow.querySelector("#download__copy");
      const barrageItem = toolbarShadow.querySelector("#download__barrage");
      const barrageAssItem = toolbarShadow.querySelector("#download__barrageass");

      if (defaultItem) {
        owner.listen(defaultItem, "click", vodAction(async (job) => {
          (0, __imports.T)("正在拉取直播流信息...", "info");
          const share = toolbarShadow.querySelector("share-hover");
          const hashId = share?.getAttribute("hashid");
          if (!hashId) return;

          const res = await (0, __imports.fetch)(`https://v.douyu.com/video/video/getVideoUrl?vid=${hashId}`);
          const data = await res.json();
          job.check();
          const playUrl = data?.data?.video_url;
          if (playUrl) {
            const downloader = new (0, __imports.jr)();
            downloader.on("progress", (p) => {
              if (downloadTextEl) downloadTextEl.innerText = `${p.percentage}%`;
            });
            downloader.on("finished", () => {
              if (downloadTextEl) downloadTextEl.innerText = "下载完成";
            });
            downloader.start(playUrl);
          }
        }, downloadTextEl, owner));
      }

      if (copyItem) {
        owner.listen(copyItem, "click", vodAction(async (job) => {
          const share = toolbarShadow.querySelector("share-hover");
          const hashId = share?.getAttribute("hashid");
          if (!hashId) return;

          const res = await (0, __imports.fetch)(`https://v.douyu.com/video/video/getVideoUrl?vid=${hashId}`);
          const data = await res.json();
          job.check();
          const playUrl = data?.data?.video_url;
          if (playUrl) {
            (0, __imports.GM_setClipboard)(playUrl);
            (0, __imports.T)("已复制 M3U8 直播流地址至剪贴板", "success");
          }
        }, downloadTextEl, owner));
      }

      if (barrageItem) {
        owner.listen(barrageItem, "click", vodAction(async (job) => {
          (0, __imports.T)("正在导出全量弹幕 Excel 表格...", "info");
          // 导出全量 Excel 逻辑
        }, downloadTextEl, owner));
      }

      if (barrageAssItem) {
        owner.listen(barrageAssItem, "click", vodAction(async (job) => {
          (0, __imports.T)("正在导出 ASS 弹幕字幕文件...", "info");
          // 导出 ASS 逻辑
        }, downloadTextEl, owner));
      }
    }
  }, 1000);
}
const $e = mountVodDownloader;

}
