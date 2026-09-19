function* (__imports) {
yield {"Li": { get: () => Li, set: value => { Li = value; } },
"Mi": { get: () => Mi, set: value => { Mi = value; } },
"bindCamera": { get: () => bindCamera, set: value => { bindCamera = value; } }};
// Camera resources belong to one captured player and its room/route lifetime.
let Ti = 83;
function Ci(video, canvas, gif, delay) {
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  gif.addFrame(canvas, { copy: true, delay });
}
function Si() { return Ni(); }
function bindCamera(parent, video, anchor, camera, hover, movement, container) {
  const owner = (0, __imports.createRoomLifetime)();
  parent.own(() => owner.dispose());
  owner.own(() => camera.remove());
  const frame = document.createElement("canvas"), image = document.createElement("canvas");
  frame.width = 0.25 * video.videoWidth;
  frame.height = 0.25 * video.videoHeight;
  let gif = null, sampling = null, hiding = null, workerUrl = null, started = null, png;
  const urls = new Set();
  function revoke(url) {
    if (urls.delete(url)) URL.revokeObjectURL(url);
  }
  function cancel() {
    (0, __imports.clearInterval)(sampling);
    sampling = null;
    started = null;
    const previous = gif;
    gif = null; // Invalidate even a synchronous abort/finished callback.
    try { if (typeof previous?.abort === "function") previous.abort(); }
    finally { if (workerUrl) { revoke(workerUrl); workerUrl = null; } }
  }
  owner.own(() => { for (const url of [...urls]) revoke(url); });
  owner.own(cancel);
  function download(href) {
    const link = document.createElement("a");
    link.href = href;
    link.download = `【${anchor}】` + (0, __imports.k)("yyyy-MM-dd hh-mm-ss", new Date());
    document.body.appendChild(link);
    try {
      const event = document.createEvent("MouseEvents");
      event.initEvent("click", false, false);
      link.dispatchEvent(event);
    } finally { link.remove(); }
  }
  owner.listen(camera.querySelector("#ex-camera-close"), "click", event => {
    event.stopPropagation();
    __imports.localStorage.setItem("ExSave_Camera_Hidden", Date.now() + 31536e7);
    owner.dispose();
  });
  if (!Si()) {
    const show = owner.guard(() => {
      if (Si()) return;
      camera.style.display = "flex";
      (0, __imports.clearTimeout)(hiding);
      hiding = owner.timeout(() => { camera.style.display = "none"; }, 2000);
    });
    const hide = () => { camera.style.display = "none"; (0, __imports.clearTimeout)(hiding); };
    owner.listen(hover, "mouseenter", show);
    owner.listen(movement, "mousemove", show);
    owner.listen(camera, "mouseenter", () => {
      if (!Si()) { camera.style.display = "flex"; (0, __imports.clearTimeout)(hiding); }
    });
    owner.listen(hover, "mouseleave", hide);
    owner.listen(container, "mouseleave", hide);
    owner.listen(camera, "mousedown", owner.guard(event => {
      if (event.target.id === "ex-camera-close") return;
      if (typeof GIF === "undefined") return (0, __imports.ExLoadLib)(__imports.EXURL.gif, owner.guard(() =>
        (0, __imports.T)("【录制】GIF引擎已就绪，请再次长按录制", "info")));
      try { cancel(); } catch (_) {}
      started = Date.now();
      image.width = video.videoWidth;
      image.height = video.videoHeight;
      image.getContext("2d").drawImage(video, 0, 0, image.width, image.height);
      png = image.toDataURL("image/png");
      workerUrl = URL.createObjectURL(new Blob(["importScripts('https://fastly.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js');"], { type: "application/javascript" }));
      urls.add(workerUrl);
      gif = new GIF({ workers: 5, quality: 3, width: frame.width, height: frame.height, workerScript: workerUrl });
      const recording = gif;
      Ci(video, frame, recording, Ti);
      sampling = owner.interval(() => { if (gif === recording) Ci(video, frame, recording, Ti); }, Ti);
    }));
    owner.listen(camera, "mouseup", owner.guard(event => {
      if (event.target.id === "ex-camera-close" || started === null || !gif) return;
      (0, __imports.clearInterval)(sampling);
      const elapsed = Date.now() - started;
      started = null;
      if (elapsed < 800) {
        try { cancel(); } catch (_) {}
        download(png);
        return;
      }
      const encoding = gif;
      (0, __imports.T)("【录制】正在生成gif...", "info");
      encoding.on("finished", owner.guard(blob => {
        if (gif !== encoding) return;
        try { cancel(); } catch (_) {}
        const url = URL.createObjectURL(blob);
        urls.add(url);
        download(url);
        owner.timeout(() => revoke(url), 1500);
      }));
      encoding.render();
    }));
  }
  return owner;
}
function Mi(owner = __imports.roomRouteLifetime) {
  const polling = owner.interval(() => {
    const host = document.getElementsByTagName("demand-video")[0];
    const video = host?.shadowRoot?.getElementById("__video");
    const anchor = document.getElementsByTagName("demand-video-anchor")[0]?.shadowRoot?.querySelector(".anchor-name");
    const container = document.getElementsByClassName("Video")[0];
    if (!video?.videoWidth || !anchor || !container) return;
    (0, __imports.clearInterval)(polling);
    const camera = document.createElement("div");
    camera.id = "ex-camera";
    camera.title = "单击截图 长按录制gif";
    camera.innerHTML = `

    <svg t="1620266708389" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2080" width="38" height="38"><path d="M512 337.371136c-119.543808 0-216.800256 97.255424-216.800256 216.798208 0 119.543808 97.256448 216.800256 216.800256 216.800256s216.800256-97.256448 216.800256-216.800256C728.800256 434.625536 631.543808 337.371136 512 337.371136zM680.479744 554.16832c0 92.911616-75.579392 168.501248-168.479744 168.501248-92.900352 0-168.480768-75.589632-168.480768-168.501248 0-92.923904 75.579392-168.521728 168.480768-168.521728C604.899328 385.646592 680.479744 461.24544 680.479744 554.16832z" p-id="2081" fill="#ffffff"></path><path d="M831.209472 337.349632l-47.167488 0c-13.647872 0-24.751104 11.083776-24.751104 24.707072 0 13.635584 11.103232 24.7296 24.751104 24.7296l47.167488 0c13.646848 0 24.75008-11.094016 24.75008-24.7296C855.959552 348.433408 844.85632 337.349632 831.209472 337.349632z" p-id="2082" fill="#ffffff"></path><path d="M700.505088 171.497472c4.235264 0 6.403072 0.405504 7.232512 0.612352 1.47968 1.514496 4.790272 6.218752 11.717632 20.685824 2.83648 5.910528 8.6272 18.86208 15.888384 35.533824l11.788288 27.063296 29.518848 0 96.535552 0c35.122176 0 63.695872 28.535808 63.695872 63.609856l0 469.933056c0 35.05152-28.573696 63.567872-63.695872 63.567872L150.811648 852.503552c-35.121152 0-63.694848-28.516352-63.694848-63.567872L87.1168 319.0016c0-35.062784 28.573696-63.589376 63.694848-63.589376l99.35872 0 29.110272 0 11.964416-26.537984c4.698112-10.421248 8.416256-19.063808 11.058176-25.70752 9.86112-24.829952 15.207424-30.125056 16.239616-30.974976 0.52736-0.161792 2.64192-0.695296 7.673856-0.695296L700.505088 171.496448M700.505088 126.441472 326.216704 126.441472c-32.519168 0-47.275008 13.479936-65.787904 60.096512-3.180544 7.999488-7.689216 18.122752-10.257408 23.819264l-99.35872 0c-59.96544 0-108.750848 48.738304-108.750848 108.645376l0 469.933056c0 59.894784 48.785408 108.623872 108.750848 108.623872l722.37568 0c59.96544 0 108.751872-48.729088 108.751872-108.623872L981.940224 319.0016c0-59.91936-48.786432-108.665856-108.751872-108.665856l-96.535552 0c-4.458496-10.236928-12.420096-28.372992-16.574464-37.031936C744.823808 141.448192 733.973504 126.441472 700.505088 126.441472L700.505088 126.441472z" p-id="2083" fill="#ffffff"></path></svg>

    <div id="ex-camera-close">×</div>

    `;
    container.insertBefore(camera, container.childNodes[0]);
    bindCamera(owner, video, anchor.innerText, camera, host, host, container);
  }, 1000);
}
function Ni() {
  var e = __imports.localStorage.getItem("ExSave_Camera_Hidden");
  if (e) return ((e = parseInt(e)), Date.now() < e);
}
function Li(e) {
  var t = String(parseInt(__imports.V.style.width) / 2.39) + "px",
    e =
      ((0, __imports.U)("Ex_Style_Cinema"),
      `

    .layout-Player-videoEntity video{object-fit:${e} !important;height:${t} !important;}

    `);
  (0, __imports.tl)("Ex_Style_Cinema", e);
}

}
