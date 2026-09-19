function* (__imports) {
yield {"Li": { get: () => Li, set: value => { Li = value; } },
"Mi": { get: () => Mi, set: value => { Mi = value; } },
"bindCamera": { get: () => bindCamera, set: value => { bindCamera = value; } }};
/**
 * 录播/点播视频截屏、高清 GIF 录制与影院模式宽屏适配服务
 */
const GIF_SAMPLE_INTERVAL_MS = 83;

function captureCanvasFrame(video, canvas, gifInstance, delay) {
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    gifInstance.addFrame(canvas, { copy: true, delay });
  }
}

function isCameraHiddenByPreference() {
  const expiry = __imports.localStorage.getItem("ExSave_Camera_Hidden");
  if (expiry) {
    return Date.now() < parseInt(expiry, 10);
  }
  return false;
}

/**
 * 绑定视频截屏与 GIF 录制相机控制器 (导出兼容 bindCamera)
 */
function bindCamera(parentLifetime, videoEl, anchorName, cameraEl, hoverTarget, movementTarget, containerEl) {
  const owner = (0, __imports.createRoomLifetime)();
  parentLifetime.own(() => owner.dispose());
  owner.own(() => cameraEl.remove());

  const frameCanvas = document.createElement("canvas");
  const fullImageCanvas = document.createElement("canvas");
  frameCanvas.width = 0.25 * videoEl.videoWidth;
  frameCanvas.height = 0.25 * videoEl.videoHeight;

  let gif = null;
  let samplingTimer = null;
  let hideTimer = null;
  let workerBlobUrl = null;
  let recordStartTime = null;
  let capturedPngDataUrl = "";

  const activeBlobUrls = new Set();
  const revokeBlobUrl = (url) => {
    if (activeBlobUrls.delete(url)) {
      URL.revokeObjectURL(url);
    }
  };

  const cancelRecording = () => {
    (0, __imports.clearInterval)(samplingTimer);
    samplingTimer = null;
    recordStartTime = null;
    const prevGif = gif;
    gif = null;
    try {
      if (typeof prevGif?.abort === "function") prevGif.abort();
    } finally {
      if (workerBlobUrl) {
        revokeBlobUrl(workerBlobUrl);
        workerBlobUrl = null;
      }
    }
  };

  owner.own(() => {
    for (const url of [...activeBlobUrls]) revokeBlobUrl(url);
  });
  owner.own(cancelRecording);

  const downloadFile = (href) => {
    const link = document.createElement("a");
    link.href = href;
    const timeStr = (0, __imports.k)("yyyy-MM-dd hh-mm-ss", new Date());
    link.download = `【${anchorName}】${timeStr}`;
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
    }
  };

  // 关闭相机按钮
  const closeBtn = cameraEl.querySelector("#ex-camera-close");
  if (closeBtn) {
    owner.listen(closeBtn, "click", (ev) => {
      ev.stopPropagation();
      __imports.localStorage.setItem("ExSave_Camera_Hidden", String(Date.now() + 315360000000));
      owner.dispose();
    });
  }

  if (!isCameraHiddenByPreference()) {
    const showCamera = owner.guard(() => {
      if (isCameraHiddenByPreference()) return;
      cameraEl.style.display = "flex";
      (0, __imports.clearTimeout)(hideTimer);
      hideTimer = owner.timeout(() => {
        cameraEl.style.display = "none";
      }, 2000);
    });

    const hideCamera = () => {
      cameraEl.style.display = "none";
      (0, __imports.clearTimeout)(hideTimer);
    };

    owner.listen(hoverTarget, "mouseenter", showCamera);
    owner.listen(movementTarget, "mousemove", showCamera);
    owner.listen(cameraEl, "mouseenter", () => {
      if (!isCameraHiddenByPreference()) {
        cameraEl.style.display = "flex";
        (0, __imports.clearTimeout)(hideTimer);
      }
    });

    owner.listen(hoverTarget, "mouseleave", hideCamera);
    owner.listen(containerEl, "mouseleave", hideCamera);

    // 鼠标按下：单击截图或长按录制 GIF
    owner.listen(cameraEl, "mousedown", owner.guard((ev) => {
      if (ev.target.id === "ex-camera-close") return;
      if (typeof GIF === "undefined") {
        return (0, __imports.ExLoadLib)(__imports.EXURL.gif, owner.guard(() =>
          (0, __imports.T)("【录制】GIF引擎已就绪，请再次长按录制", "info")));
      }

      try { cancelRecording(); } catch {}
      recordStartTime = Date.now();
      fullImageCanvas.width = videoEl.videoWidth;
      fullImageCanvas.height = videoEl.videoHeight;
      fullImageCanvas.getContext("2d").drawImage(videoEl, 0, 0, fullImageCanvas.width, fullImageCanvas.height);
      capturedPngDataUrl = fullImageCanvas.toDataURL("image/png");

      workerBlobUrl = URL.createObjectURL(new Blob(
        ["importScripts('https://fastly.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js');"],
        { type: "application/javascript" }
      ));
      activeBlobUrls.add(workerBlobUrl);

      gif = new GIF({
        workers: 5,
        quality: 3,
        width: frameCanvas.width,
        height: frameCanvas.height,
        workerScript: workerBlobUrl
      });

      const currentGif = gif;
      captureCanvasFrame(videoEl, frameCanvas, currentGif, GIF_SAMPLE_INTERVAL_MS);
      samplingTimer = owner.interval(() => {
        if (gif === currentGif) {
          captureCanvasFrame(videoEl, frameCanvas, currentGif, GIF_SAMPLE_INTERVAL_MS);
        }
      }, GIF_SAMPLE_INTERVAL_MS);
    }));

    owner.listen(cameraEl, "mouseup", owner.guard((ev) => {
      if (ev.target.id === "ex-camera-close" || recordStartTime === null || !gif) return;
      (0, __imports.clearInterval)(samplingTimer);
      const elapsed = Date.now() - recordStartTime;
      recordStartTime = null;

      // 短按 < 800ms：保存为无水印高清 PNG 截图
      if (elapsed < 800) {
        try { cancelRecording(); } catch {}
        downloadFile(capturedPngDataUrl);
        return;
      }

      // 长按 >= 800ms：合成并下载 GIF 动图
      const currentGif = gif;
      (0, __imports.T)("【录制】正在生成gif...", "info");
      currentGif.on("finished", owner.guard((blob) => {
        if (gif !== currentGif) return;
        try { cancelRecording(); } catch {}
        const objectUrl = URL.createObjectURL(blob);
        activeBlobUrls.add(objectUrl);
        downloadFile(objectUrl);
        owner.timeout(() => revokeBlobUrl(objectUrl), 1500);
      }));
      currentGif.render();
    }));
  }

  return owner;
}

/**
 * 录播回放播放器相机图标挂载 (导出兼容 Mi)
 * @param {object} [lifetimeOwner]
 */
function mountDemandVideoCamera(lifetimeOwner = __imports.roomRouteLifetime) {
  const pollTimer = lifetimeOwner.interval(() => {
    const demandHost = document.getElementsByTagName("demand-video")[0];
    const video = demandHost?.shadowRoot?.getElementById("__video");
    const anchor = document.getElementsByTagName("demand-video-anchor")[0]?.shadowRoot?.querySelector(".anchor-name");
    const container = document.getElementsByClassName("Video")[0];

    if (!video?.videoWidth || !anchor || !container) return;
    (0, __imports.clearInterval)(pollTimer);

    const camera = document.createElement("div");
    camera.id = "ex-camera";
    camera.title = "单击截图 长按录制gif";
    camera.innerHTML = `
      <svg viewBox="0 0 1024 1024" width="38" height="38">
        <path d="M512 337.371136c-119.543808 0-216.800256 97.255424-216.800256 216.798208 0 119.543808 97.256448 216.800256 216.800256 216.800256s216.800256-97.256448 216.800256-216.800256C728.800256 434.625536 631.543808 337.371136 512 337.371136zM680.479744 554.16832c0 92.911616-75.579392 168.501248-168.479744 168.501248-92.900352 0-168.480768-75.589632-168.480768-168.501248 0-92.923904 75.579392-168.521728 168.480768-168.521728C604.899328 385.646592 680.479744 461.24544 680.479744 554.16832z" fill="#ffffff"></path>
        <path d="M831.209472 337.349632l-47.167488 0c-13.647872 0-24.751104 11.083776-24.751104 24.707072 0 13.635584 11.103232 24.7296 24.751104 24.7296l47.167488 0c13.646848 0 24.75008-11.094016 24.75008-24.7296C855.959552 348.433408 844.85632 337.349632 831.209472 337.349632z" fill="#ffffff"></path>
        <path d="M700.505088 171.497472c4.235264 0 6.403072 0.405504 7.232512 0.612352 1.47968 1.514496 4.790272 6.218752 11.717632 20.685824 2.83648 5.910528 8.6272 18.86208 15.888384 35.533824l11.788288 27.063296 29.518848 0 96.535552 0c35.122176 0 63.695872 28.535808 63.695872 63.609856l0 469.933056c0 35.05152-28.573696 63.567872-63.695872 63.567872L150.811648 852.503552c-35.121152 0-63.694848-28.516352-63.694848-63.567872L87.1168 319.0016c0-35.062784 28.573696-63.589376 63.694848-63.589376l99.35872 0 29.110272 0 11.964416-26.537984c4.698112-10.421248 8.416256-19.063808 11.058176-25.70752 9.86112-24.829952 15.207424-30.125056 16.239616-30.974976 0.52736-0.161792 2.64192-0.695296 7.673856-0.695296L700.505088 171.496448M700.505088 126.441472 326.216704 126.441472c-32.519168 0-47.275008 13.479936-65.787904 60.096512-3.180544 7.999488-7.689216 18.122752-10.257408 23.819264l-99.35872 0c-59.96544 0-108.750848 48.738304-108.750848 108.645376l0 469.933056c0 59.894784 48.785408 108.623872 108.750848 108.623872l722.37568 0c59.96544 0 108.751872-48.729088 108.751872-108.623872L981.940224 319.0016c0-59.91936-48.786432-108.665856-108.751872-108.665856l-96.535552 0c-4.458496-10.236928-12.420096-28.372992-16.574464-37.031936C744.823808 141.448192 733.973504 126.441472 700.505088 126.441472L700.505088 126.441472z" fill="#ffffff"></path>
      </svg>
      <div id="ex-camera-close">×</div>
    `;
    container.insertBefore(camera, container.childNodes[0]);
    bindCamera(lifetimeOwner, video, anchor.innerText, camera, demandHost, demandHost, container);
  }, 1000);
}
const Mi = mountDemandVideoCamera;

/**
 * 影院模式 2.39:1 宽屏比例样式注入 (导出兼容 Li)
 * @param {string} fitMode - object-fit 模式
 */
function applyCinemaModeStyle(fitMode) {
  const calculatedHeight = `${parseInt(__imports.V?.style?.width || "0", 10) / 2.39}px`;
  (0, __imports.U)("Ex_Style_Cinema");
  const css = `
    .layout-Player-videoEntity video {
      object-fit: ${fitMode} !important;
      height: ${calculatedHeight} !important;
    }
  `;
  (0, __imports.tl)("Ex_Style_Cinema", css);
}
const Li = applyCinemaModeStyle;

}
