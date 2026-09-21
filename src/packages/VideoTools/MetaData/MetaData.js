let videoMetaData = null;
let isProbingMetaData = false;

function initPkg_VideoTools_MetaData() {
  initPkg_VideoTools_MetaData_Placeholder();
}

function initPkg_VideoTools_MetaData_Placeholder() {
  if (document.getElementById("ex-metadata")) return;
  let menu = document.getElementsByClassName("menu-da2a9e")[0];
  if (!menu) return;

  let a = document.createElement("li");
  a.id = "ex-metadata";
  a.innerHTML = `主播配置信息<ul class="metadata__wrap"><li>悬停探测配置</li></ul>`;
  
  a.addEventListener("mouseenter", () => {
    if (videoMetaData) {
      renderMetaDataContent(a);
      return;
    }
    if (isProbingMetaData) return;
    isProbingMetaData = true;
    let wrap = a.querySelector(".metadata__wrap");
    if (wrap) wrap.innerHTML = `<li>探测中...</li>`;
    MetaData_probe((meta) => {
      videoMetaData = meta;
      isProbingMetaData = false;
      renderMetaDataContent(a);
    });
  });

  menu.insertBefore(a, menu.childNodes[1]);
}

function renderMetaDataContent(container) {
  if (!container || !videoMetaData) return;
  let wrap = container.querySelector(".metadata__wrap");
  if (!wrap) return;
  if (!videoMetaData.dy_cpu_model && !videoMetaData.dy_gpu_model && !videoMetaData.dy_device_model && !videoMetaData.dy_os_version && !videoMetaData.z_canvas_code) {
    wrap.innerHTML = `<li>未获取到推流配置</li>`;
    return;
  }
  wrap.innerHTML = `
    ${videoMetaData.dy_cpu_model ? `<li title="${videoMetaData.dy_cpu_model}">🤖CPU<br/>${videoMetaData.dy_cpu_model}</li>` : ``}
    ${videoMetaData.dy_gpu_model ? `<li title="${videoMetaData.dy_gpu_model}">🎮显卡<br/>${videoMetaData.dy_gpu_model}</li>` : ``}
    ${videoMetaData.dy_device_model ? `<li title="${videoMetaData.dy_device_model}">📱设备<br/>${videoMetaData.dy_device_model}</li>` : ``}
    ${videoMetaData.dy_os_version ? `<li title="${videoMetaData.dy_os_version}">🖥️系统<br/>${videoMetaData.dy_os_version}</li>` : ``}
    ${videoMetaData.z_canvas_code ? `<li title="${videoMetaData.z_canvas_code}">🎥场景<br/>${videoMetaData.z_canvas_code}</li>` : ``}
  `;
}

function MetaData_probe(callback) {
  ExLoadLib(EXURL.flv, () => {
    getRealLive_Douyu(rid, true, false, "1", (lurl) => {
      if (!lurl || lurl === "None") {
        if (typeof callback === "function") callback({});
        return;
      }
      let id = "Fake_" + Date.now();
      let a = document.createElement("div");
      a.id = "exVideoDiv" + id;
      a.style.display = "none";
      a.innerHTML = `<video class='exVideoPlayer' id='exVideoPlayer${id}'></video>`;
      document.body.appendChild(a);

      if (typeof flvjs !== "undefined" && flvjs.isSupported()) {
        let videoElement = document.getElementById("exVideoPlayer" + id);
        let flvPlayer = flvjs.createPlayer(
          { type: "flv", url: lurl },
          { fixAudioTimestampGap: false }
        );
        let cleaned = false;
        const cleanup = () => {
          if (cleaned) return;
          cleaned = true;
          try {
            flvPlayer.destroy();
            a.remove();
          } catch(e) {}
        };
        flvPlayer.on("media_info", (e) => {
          if (e && e.metadata) {
            cleanup();
            if (typeof callback === "function") callback(e.metadata);
          }
        });
        flvPlayer.attachMediaElement(videoElement);
        flvPlayer.load();
        setTimeout(cleanup, 8000);
      } else {
        a.remove();
        if (typeof callback === "function") callback({});
      }
    });
  }, () => {
    isProbingMetaData = false;
    if (typeof callback === "function") callback({});
  });
}