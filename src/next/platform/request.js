function* (__imports) {
yield {"Ur": { get: () => Ur, set: value => { Ur = value; } },
"Vr": { get: () => Vr, set: value => { Vr = value; } },
"qr": { get: () => qr, set: value => { qr = value; } }};
/**
 * 跨平台直播流请求管理网关 (包含斗鱼/B站/虎牙解析器与中止控制器)
 */

/**
 * 创建具备生命周期所有者绑定与取消管理的直播流请求操作对象
 * @param {Function} callback - 成功回调
 * @param {Array} failureArgs - 失败回调传参
 * @param {object} [owner] - 生命周期管理者
 * @returns {object}
 */
function createStreamRequest(callback, failureArgs, owner) {
  let isStopped = false;
  const pendingHandles = new Set();

  const operation = {
    abort() {
      if (isStopped) return;
      isStopped = true;
      for (const handle of pendingHandles) {
        try { handle.abort?.(); } catch {}
      }
      pendingHandles.clear();
    },
    finish(...args) {
      if (isStopped || owner?.disposed) return;
      isStopped = true;
      pendingHandles.clear();
      callback(...args);
    },
    request(options, parseResponse) {
      if (isStopped || owner?.disposed) return;
      let reqHandle = null;
      let isSettled = false;

      const settle = (action) => (resp) => {
        if (isSettled || isStopped || owner?.disposed) return;
        isSettled = true;
        pendingHandles.delete(reqHandle);
        action(resp);
      };

      const fail = () => operation.finish(...failureArgs);

      try {
        reqHandle = (0, __imports.GM_xmlhttpRequest)({
          ...options,
          timeout: 15000,
          onload: settle((resp) => {
            let continuation;
            try {
              if (resp.status && (resp.status < 200 || resp.status >= 300)) {
                throw new Error(`HTTP Error: ${resp.status}`);
              }
              continuation = parseResponse(resp.response);
            } catch {
              fail();
              return;
            }
            if (typeof continuation === 'function') {
              continuation();
            }
          }),
          onerror: settle(fail),
          ontimeout: settle(fail),
          onabort: settle(fail),
        });

        if (!isSettled && !isStopped && reqHandle) {
          pendingHandles.add(reqHandle);
        }
      } catch {
        fail();
      }
    },
  };

  if (owner) {
    owner.own(() => operation.abort());
  }
  return operation;
}

/**
 * B站直播间推流直链解析 (导出兼容 Vr)
 * @param {string|number} roomId
 * @param {string|number} qualityKey
 * @param {any} unusedParam
 * @param {Function} onFinish
 * @param {object} [owner]
 */
function resolveBilibiliStreamUrl(roomId, qualityKey, unusedParam, onFinish, owner) {
  const qualityMap = { '1': '80', '2': '150', '3': '250', '4': '400', '5': '20000' };
  const qn = qualityMap[qualityKey] || '80';
  const operation = createStreamRequest(onFinish, [''], owner);

  operation.request({
    method: 'GET',
    url: `https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?room_id=${roomId}&platform=web&qn=${qn}&protocol=0,1&format=0,1,2&codec=0,1`,
    responseType: 'json',
  }, (resp) => {
    const data = resp?.data;
    let playUrl = '';

    if (resp?.code && resp.code !== 0) {
      return () => operation.finish('');
    }

    const streamList = data?.playurl_info?.playurl?.stream || [];
    for (const stream of streamList) {
      const codec = stream.format?.[0]?.codec?.[0];
      const info = codec?.url_info?.[0];
      if (String(stream.protocol_name).includes('stream') && info?.host && codec?.base_url) {
        playUrl = info.host + codec.base_url + (info.extra || '');
      }
    }

    if (data?.durl?.[0]?.url) {
      playUrl = data.durl[0].url;
    }

    return () => operation.finish(playUrl);
  });

  return operation;
}
const Vr = resolveBilibiliStreamUrl;

/**
 * 斗鱼官方 H5PlayV1 推流与安全加密解析 (导出兼容 qr)
 * @param {string|number} roomId
 * @param {boolean} isVideoWithAudio
 * @param {any} unusedParam
 * @param {string|number} rate
 * @param {Function} onFinish
 * @param {object} [owner]
 */
function resolveDouyuH5StreamUrl(roomId, isVideoWithAudio, unusedParam, rate, onFinish, owner) {
  const deviceId = (0, __imports.x)('dy_did') || '10000000000000000000000000001501';
  const operation = createStreamRequest(onFinish, ['None'], owner);

  // 1. 获取斗鱼 websec 加密公钥与种子
  operation.request({
    method: 'GET',
    url: `https://www.douyu.com/wgapi/livenc/liveweb/websec/getEncryption?did=${deviceId}`,
    responseType: 'json',
  }, (resp) => {
    if (resp?.error !== 0 || !resp.data) {
      return () => operation.finish('None');
    }

    const encData = resp.data;
    const timestampSec = Math.round(Date.now() / 1000);
    let hash = encData.rand_str;

    for (let count = 0; count < encData.enc_time; count++) {
      hash = (0, __imports.Or)(hash + encData.key);
    }

    const auth = (0, __imports.Or)(hash + encData.key + (encData.is_special === 1 ? '' : `${roomId}${timestampSec}`));
    const rateParam = rate == '1428' ? '-1' : rate;

    // 2. 发起主线获取直播流请求
    return () => operation.request({
      method: 'POST',
      url: `https://www.douyu.com/lapi/live/getH5PlayV1/${roomId}`,
      data: `enc_data=${encData.enc_data}&tt=${timestampSec}&did=${deviceId}&auth=${auth}&cdn=&rate=${rateParam}&hevc=0&fa=0&ive=0`,
      responseType: 'json',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, (result) => {
      const data = result?.data;
      const rawUrl = (result?.error === 0 && data?.rtmp_url && data?.rtmp_live)
        ? `${data.rtmp_url}/${data.rtmp_live}`
        : null;

      let finalUrl = 'None';
      if (rawUrl) {
        finalUrl = isVideoWithAudio ? rawUrl : `${rawUrl}&only-audio=1`;
      }

      return () => operation.finish(finalUrl);
    });
  });

  return operation;
}
const qr = resolveDouyuH5StreamUrl;

/**
 * 虎牙直播间推流直链解析 (导出兼容 Ur)
 * @param {string|number} roomId
 * @param {any} unusedParam
 * @param {Function} onFinish
 * @param {object} [owner]
 */
function resolveHuyaStreamUrl(roomId, unusedParam, onFinish, owner) {
  const operation = createStreamRequest(onFinish, ['', '房间未开播或请求失败'], owner);

  operation.request({
    method: 'GET',
    url: `https://mp.huya.com/cache.php?m=Live&do=profileRoom&roomid=${roomId}`,
    responseType: 'json',
  }, (resp) => {
    const rawUrl = resp?.data?.stream?.flv?.multiLine?.[0]?.url;
    const playUrl = rawUrl ? rawUrl.replace(/^http:/, 'https:') : '';
    const errHint = playUrl ? '' : '房间暂未开播';
    return () => operation.finish(playUrl, errHint);
  });

  return operation;
}
const Ur = resolveHuyaStreamUrl;

}
