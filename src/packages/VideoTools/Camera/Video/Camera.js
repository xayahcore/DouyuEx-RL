function initPkg_VideoTools_Camera_Video() {
  let attempts = 0;
  let pollTimer = setInterval(() => {
    attempts++;
    const embeddedFrame = document.getElementsByTagName("demand-video")[0];
    // ⚠ shadowRoot 可能还没挂上：旧代码直接 .shadowRoot.getElementById 会抛 TypeError，
    // 而 interval 又不停，等于每秒报错一次。
    const shadowRoot = embeddedFrame && embeddedFrame.shadowRoot ? embeddedFrame.shadowRoot : null;
    liveVideoNode = shadowRoot ? shadowRoot.getElementById("__video") : null;
    if (liveVideoNode && liveVideoNode.videoWidth) {
      clearInterval(pollTimer);
      const anchorNode = shadowRoot.querySelector(".anchor-name");
      camera_anchorName = anchorNode ? String(anchorNode.innerText || anchorNode.textContent || "").trim() : camera_anchorName;
      initPkg_VideoTools_Camera_Video_Dom();
      initPkg_VideoTools_Camera_Video_Func();
      return;
    }
    if (attempts >= 60) clearInterval(pollTimer);
  }, 1000);
}

function initPkg_VideoTools_Camera_Video_Dom() {
  Camera_Video_insertIcon();
}

function Camera_Video_insertIcon() {
  if (document.getElementById("ex-camera")) return; // 幂等：重复初始化只保留一份
  let a = document.createElement("div");
  a.id = "ex-camera";
  a.title = "单击截图 长按录制gif";
  a.innerHTML = `
    <svg t="1620266708389" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2080" width="38" height="38"><path d="M512 337.371136c-119.543808 0-216.800256 97.255424-216.800256 216.798208 0 119.543808 97.256448 216.800256 216.800256 216.800256s216.800256-97.256448 216.800256-216.800256C728.800256 434.625536 631.543808 337.371136 512 337.371136zM680.479744 554.16832c0 92.911616-75.579392 168.501248-168.479744 168.501248-92.900352 0-168.480768-75.589632-168.480768-168.501248 0-92.923904 75.579392-168.521728 168.480768-168.521728C604.899328 385.646592 680.479744 461.24544 680.479744 554.16832z" p-id="2081" fill="#ffffff"></path><path d="M831.209472 337.349632l-47.167488 0c-13.647872 0-24.751104 11.083776-24.751104 24.707072 0 13.635584 11.103232 24.7296 24.751104 24.7296l47.167488 0c13.646848 0 24.75008-11.094016 24.75008-24.7296C855.959552 348.433408 844.85632 337.349632 831.209472 337.349632z" p-id="2082" fill="#ffffff"></path><path d="M700.505088 171.497472c4.235264 0 6.403072 0.405504 7.232512 0.612352 1.47968 1.514496 4.790272 6.218752 11.717632 20.685824 2.83648 5.910528 8.6272 18.86208 15.888384 35.533824l11.788288 27.063296 29.518848 0 96.535552 0c35.122176 0 63.695872 28.535808 63.695872 63.609856l0 469.933056c0 35.05152-28.573696 63.567872-63.695872 63.567872L150.811648 852.503552c-35.121152 0-63.694848-28.516352-63.694848-63.567872L87.1168 319.0016c0-35.062784 28.573696-63.589376 63.694848-63.589376l99.35872 0 29.110272 0 11.964416-26.537984c4.698112-10.421248 8.416256-19.063808 11.058176-25.70752 9.86112-24.829952 15.207424-30.125056 16.239616-30.974976 0.52736-0.161792 2.64192-0.695296 7.673856-0.695296L700.505088 171.496448M700.505088 126.441472 326.216704 126.441472c-32.519168 0-47.275008 13.479936-65.787904 60.096512-3.180544 7.999488-7.689216 18.122752-10.257408 23.819264l-99.35872 0c-59.96544 0-108.750848 48.738304-108.750848 108.645376l0 469.933056c0 59.894784 48.785408 108.623872 108.750848 108.623872l722.37568 0c59.96544 0 108.751872-48.729088 108.751872-108.623872L981.940224 319.0016c0-59.91936-48.786432-108.665856-108.751872-108.665856l-96.535552 0c-4.458496-10.236928-12.420096-28.372992-16.574464-37.031936C744.823808 141.448192 733.973504 126.441472 700.505088 126.441472L700.505088 126.441472z" p-id="2083" fill="#ffffff"></path></svg>
    <div id="ex-camera-close">×</div>
    `;
  let host = getValidDom([".Video", "#js-player-dialog", "#js-player-main"]) || document.body;
  if (!host) return;
  if (host.firstChild) host.insertBefore(a, host.firstChild);
  else host.appendChild(a);
}

function Camera_Video_isHidden() {
  let saved = localStorage.getItem("ExSave_Camera_Hidden");
  if (!saved) return false;
  let time = parseInt(saved);
  return Date.now() < time;
}

function initPkg_VideoTools_Camera_Video_Func() {
  let camera = document.getElementById("ex-camera");
  let closeBtn = document.getElementById("ex-camera-close");
  // ⚠ 只校验按钮本身，宿主找不到也要照常绑事件（见 issue #6：旧版把宿主当硬前置，
  // 宿主类名一改，整段事件绑定被跳过，按钮永远不显示）。
  if (!camera || !closeBtn) return;

  let isClosed = false;
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm("是否7天内不再显示？")) {
      localStorage.setItem("ExSave_Camera_Hidden", Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else {
      isClosed = true;
    }
    camera.style.display = "none";
  });

  if (Camera_Video_isHidden()) {
    camera.style.display = "none";
    return;
  }

  if (camera_controller) {
    camera_controller.detach();
    camera_controller = null;
  }

  camera_controller = CameraControl_create({
    cameraId: "ex-camera",
    resolveVideo: Camera_Video_resolveVideoNode,
    getAnchorName: function () { return camera_anchorName; },
    isHidden: function () { return isClosed || Camera_Video_isHidden(); },
    getScreenshotCanvas: Camera_getScreenshotCanvas,
    prepareRecording: Camera_prepareRecordingCanvas,
    addFrame: function (video, canvas, gif) { cameraAddFrame(video, canvas, gif, camera_fps); },
    workerScript: gifworkerBlob,
    fps: camera_fps
  });

  if (camera_controller.attach()) camera_controller.hide();
}

/**
 * 视频页（v.douyu.com）的 video 节点：可能挂在 demand-video 的 shadowRoot 里，
 * 也可能直接就在播放器容器里，两种都试。
 */
function Camera_Video_resolveVideoNode() {
  if (typeof liveVideoNode !== "undefined" && liveVideoNode && liveVideoNode.videoWidth) return liveVideoNode;

  const embeddedFrame = document.getElementsByTagName("demand-video")[0];
  if (embeddedFrame && embeddedFrame.shadowRoot) {
    const shadowVideo = embeddedFrame.shadowRoot.getElementById("__video");
    if (shadowVideo) return shadowVideo;
  }

  const selectors = [".Video video", "#js-player-dialog video", "#js-player-main video", "video#__video2"];
  for (let i = 0; i < selectors.length; i++) {
    const node = document.querySelector(selectors[i]);
    if (node) return node;
  }
  return null;
}
