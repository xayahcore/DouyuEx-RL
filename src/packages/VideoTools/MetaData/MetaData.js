/* ==================== 主播配置信息（直播流 onMetaData 探测） ==================== */
/*
 * 数据来源：斗鱼推流端在 FLV 的 onMetaData 中附带的自定义字段
 *   dy_cpu_model / dy_gpu_model / dy_device_model / dy_os_version / z_canvas_code
 * 注意：只有主播端开启了「主播配置」上报的房间才有这些字段（实测约四成房间有），
 *       因此「无数据」是正常结果之一，必须与「探测失败」区分提示。
 *
 * 【关键实现约束，勿改回 media_info】
 *   flv.js 的 media_info 事件依赖 MediaInfo.isComplete()，而该方法要求 duration 与
 *   keyframesIndex 非空、且视频参数（fps / profile / level / refFrames / chromaFormat /
 *   sarNum / sarDen）全部齐备 —— 直播流永远不满足，故 media_info 永不触发。
 *   必须监听 metadata_arrived：demuxer 侧在解析到 onMetaData 时无条件触发，
 *   且载荷就是原始 onMetaData 对象本身（不是某个 e.metadata 属性）。
 *
 * 【状态复位约束】
 *   探测结束（成功 / 失败 / 超时）都必须复位 isProbingMetaData 并回调，
 *   否则一次失败后该功能将永久失效。
 */

const META_FIELDS = [
  { key: "dy_cpu_model", label: "CPU" },
  { key: "dy_gpu_model", label: "显卡" },
  { key: "dy_device_model", label: "设备" },
  { key: "dy_os_version", label: "系统" },
  { key: "z_canvas_code", label: "场景" }
];

const META_PROBE_TIMEOUT = 6000;

// 按房间号缓存：斗鱼为 SPA 切房不刷新页面，不做房间校验会把上一个主播的配置显示出来
let videoMetaDataCache = { rid: null, data: null };
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

  a.addEventListener("mouseenter", () => MetaData_probeByHover(a));
  a.addEventListener("click", (e) => {
    e.stopPropagation();
    if (MetaData_getCached() !== null) return; // 本房间已有结果，无需重探
    MetaData_probeNow(a);
  });

  menu.insertBefore(a, menu.childNodes[1]);
}

function MetaData_getCurrentRid() {
  return String((typeof rid !== "undefined" && rid) || "");
}

// 仅当缓存属于当前房间时才复用，否则返回 null 触发重探
function MetaData_getCached() {
  return videoMetaDataCache.rid === MetaData_getCurrentRid() ? videoMetaDataCache.data : null;
}

function MetaData_probeByHover(container) {
  let cached = MetaData_getCached();
  if (cached !== null) {
    renderMetaDataContent(container, cached, true);
    return;
  }
  MetaData_probeNow(container);
}

function MetaData_probeNow(container) {
  if (isProbingMetaData) return;
  isProbingMetaData = true;

  let wrap = container.querySelector(".metadata__wrap");
  if (wrap) wrap.innerHTML = `<li>探测中...</li>`;

  let probingRid = MetaData_getCurrentRid();
  MetaData_probe((meta, ok) => {
    isProbingMetaData = false;
    // 探测期间切了房间，本结果作废，下次悬停重探
    if (probingRid !== MetaData_getCurrentRid()) return;
    // 失败不写缓存，保证可重试；有缓存则不会重复请求
    if (!ok) {
      renderMetaDataContent(container, null, false);
      return;
    }
    videoMetaDataCache = { rid: probingRid, data: meta || {} };
    renderMetaDataContent(container, meta || {}, true);
  });
}

function MetaData_hasConfig(meta) {
  return !!meta && META_FIELDS.some((f) => meta[f.key]);
}

function MetaData_escape(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMetaDataContent(container, meta, ok) {
  if (!container) return;
  let wrap = container.querySelector(".metadata__wrap");
  if (!wrap) return;

  // 状态一：探测链路失败（取流失败 / 播放器异常 / 超时）→ 明确提示可重试
  if (!ok) {
    wrap.innerHTML = `<li>探测失败<span class="metadata__retry">点击重试</span></li>`;
    return;
  }

  // 状态二：取到了元数据但主播未上报配置 → 如实说明，避免被误解为功能坏了
  if (!MetaData_hasConfig(meta)) {
    wrap.innerHTML = `<li>该主播未开启配置上报</li>`;
    return;
  }

  // 状态三：正常展示
  wrap.innerHTML = META_FIELDS
    .filter((f) => meta[f.key])
    .map((f) => `<li title="${MetaData_escape(meta[f.key])}">${f.label}<br/>${MetaData_escape(meta[f.key])}</li>`)
    .join("");
}

/**
 * 探测直播流元数据。
 * callback(meta, ok)：ok=false 表示探测链路失败（可重试）；ok=true 表示成功取到 onMetaData。
 */
function MetaData_probe(callback) {
  const finish = (meta, ok) => {
    if (typeof callback === "function") callback(meta || {}, !!ok);
  };

  ExLoadLib(
    EXURL.flv,
    () => {
      getRealLive_Douyu(rid, true, false, "1", (lurl) => {
        if (!lurl || lurl === "None") return finish(null, false);
        if (typeof flvjs === "undefined" || !flvjs.isSupported()) return finish(null, false);

        let id = "Fake_" + Date.now();
        let host = document.createElement("div");
        host.id = "exVideoDiv" + id;
        host.style.display = "none";
        host.innerHTML = `<video class="exVideoPlayer" id="exVideoPlayer${id}"></video>`;
        document.body.appendChild(host);

        let player = flvjs.createPlayer({ type: "flv", url: lurl }, { fixAudioTimestampGap: false });
        let settled = false;
        let timer = 0;

        const cleanup = () => {
          clearTimeout(timer);
          try { player.destroy(); } catch (e) {}
          try { host.remove(); } catch (e) {}
        };
        const settle = (meta, ok) => {
          if (settled) return;
          settled = true;
          cleanup();
          finish(meta, ok);
        };

        const EV = (flvjs.Events || {});

        // 主路径：无条件触发，载荷即原始 onMetaData（含 dy_cpu_model 等自定义字段）
        player.on(EV.METADATA_ARRIVED || "metadata_arrived", (meta) => settle(meta, true));
        // 兜底路径：部分版本 media_info 也会带上 metadata
        player.on("media_info", (e) => {
          if (e && e.metadata) settle(e.metadata, true);
        });
        // 失败路径
        player.on(EV.ERROR || "error", () => settle(null, false));
        // 超时路径：必须回调，否则探测状态将永久卡死
        timer = setTimeout(() => settle(null, false), META_PROBE_TIMEOUT);

        player.attachMediaElement(document.getElementById("exVideoPlayer" + id));
        player.load();
      });
    },
    () => finish(null, false)
  );
}
