function* (__imports) {
yield {"Ur": { get: () => Ur, set: value => { Ur = value; } },
"Vr": { get: () => Vr, set: value => { Vr = value; } },
"qr": { get: () => qr, set: value => { qr = value; } }};
// Stream lookups are read operations (including Douyu's POST). Never retry them
// implicitly. Ownership is explicit: multi-room user players may outlive a room.
function createStreamRequest(callback, failure, owner) {
  let stopped = false;
  const pending = new Set();
  const operation = {
    abort() {
      if (stopped) return;
      stopped = true;
      for (const handle of pending) {
        try { handle.abort?.(); } catch (_) {}
      }
      pending.clear();
    },
    finish(...args) {
      if (stopped || owner?.disposed) return;
      stopped = true;
      pending.clear();
      callback(...args);
    },
    request(options, parse) {
      if (stopped || owner?.disposed) return;
      let handle, settled = false;
      const settle = action => response => {
        if (settled || stopped || owner?.disposed) return;
        settled = true;
        pending.delete(handle);
        action(response);
      };
      const fail = () => operation.finish(...failure);
      try {
        handle = (0, __imports.GM_xmlhttpRequest)({
          ...options,
          timeout: 15000,
          onload: settle(response => {
            let result;
            try {
              if (response.status && (response.status < 200 || response.status >= 300)) throw new Error('HTTP failure');
              result = parse(response.response);
            } catch (_) { fail(); return; }
            // Parsing returns a continuation so consumer exceptions aren't retried.
            result();
          }),
          onerror: settle(fail), ontimeout: settle(fail), onabort: settle(fail),
        });
        if (!settled && !stopped && handle) pending.add(handle);
      } catch (_) { fail(); }
    },
  };
  if (owner) owner.own(() => operation.abort());
  return operation;
}
function Vr(e, t, o, a, owner) {
  const quality = { '1': '80', '2': '150', '3': '250', '4': '400', '5': '20000' }[t] || '80';
  const operation = createStreamRequest(a, [''], owner);
  operation.request({
    method: 'GET',
    url: `https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?room_id=${e}&platform=web&qn=${quality}&protocol=0,1&format=0,1,2&codec=0,1`,
    responseType: 'json',
  }, response => {
    const data = response?.data;
    let url = '';
    if (response?.code && response.code !== 0) return () => operation.finish('');
    for (const stream of data?.playurl_info?.playurl?.stream || []) {
      const codec = stream.format?.[0]?.codec?.[0], info = codec?.url_info?.[0];
      if (String(stream.protocol_name).includes('stream') && info?.host && codec.base_url)
        url = info.host + codec.base_url + (info.extra || '');
    }
    if (data?.durl) url = data.durl[0]?.url || '';
    return () => operation.finish(url);
  });
  return operation;
}
function qr(i, a, e, r, l, owner) {
  const did = (0, __imports.x)('dy_did') || '10000000000000000000000000001501';
  const operation = createStreamRequest(l, ['None'], owner);
  operation.request({
    method: 'GET',
    url: 'https://www.douyu.com/wgapi/livenc/liveweb/websec/getEncryption?did=' + did,
    responseType: 'json',
  }, response => {
    if (response?.error !== 0 || !response.data) return () => operation.finish('None');
    const data = response.data, tt = Math.round(Date.now() / 1000);
    let hash = data.rand_str;
    for (let count = 0; count < data.enc_time; count++) hash = (0, __imports.Or)(hash + data.key);
    const auth = (0, __imports.Or)(hash + data.key + (data.is_special === 1 ? '' : '' + i + tt));
    return () => operation.request({
      method: 'POST',
      url: 'https://www.douyu.com/lapi/live/getH5PlayV1/' + i,
      data: `enc_data=${data.enc_data}&tt=${tt}&did=${did}&auth=${auth}&cdn=&rate=${r == '1428' ? '-1' : r}&hevc=0&fa=0&ive=0`,
      responseType: 'json',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, result => {
      const data = result?.data;
      const url = result?.error === 0 && data?.rtmp_url && data?.rtmp_live
        ? data.rtmp_url + '/' + data.rtmp_live : null;
      return () => operation.finish(url ? (a ? url : url + '&only-audio=1') : 'None');
    });
  });
  return operation;
}
function Ur(e, t, n, owner) {
  const operation = createStreamRequest(n, ['', '房间未开播或请求失败'], owner);
  operation.request({
    method: 'GET',
    url: 'https://mp.huya.com/cache.php?m=Live&do=profileRoom&roomid=' + e,
    responseType: 'json',
  }, response => {
    const url = response?.data?.stream?.flv?.multiLine?.[0]?.url;
    return () => operation.finish(url ? url.replace(/^http:/, 'https:') : '', url ? '' : '房间暂未开播');
  });
  return operation;
}

}
