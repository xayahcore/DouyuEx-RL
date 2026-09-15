// src/api/client.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('api.client', ['platform.credentials', 'platform.transport'], function (credentials, transport) {
    var ENDPOINTS = {
      // 1. Room & Stream
      'room.betard': { method: 'GET', url: 'https://www.douyu.com/betard/{rid}', idempotent: true },
      'room.h5play': { method: 'POST', url: 'https://www.douyu.com/lapi/live/getH5Play/{rid}', idempotent: true },
      'room.roomApi': { method: 'GET', url: 'https://open.douyucdn.cn/api/RoomApi/room/{rid}', idempotent: true },

      // 2. Backpack & Economy
      'backpack.list': { method: 'GET', url: 'https://www.douyu.com/japi/prop/backpack/web/v5', idempotent: true },
      'backpack.donate': { method: 'POST', url: 'https://www.douyu.com/japi/prop/donate/mainsite/v1', idempotent: false },

      // 3. Routine: Sign, Star Push & Fishing
      'routine.webSign': { method: 'POST', url: 'https://www.douyu.com/japi/carnival/nc/sign/webSign', idempotent: false },
      'routine.starList': { method: 'GET', url: 'https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/list', idempotent: true },
      'routine.starReport': { method: 'POST', url: 'https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/report', idempotent: true },
      'routine.starIntroduce': { method: 'GET', url: 'https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/follow/introduce', idempotent: true },
      'routine.starRank': { method: 'GET', url: 'https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/rank/info', idempotent: true },
      'routine.followAdd': { method: 'POST', url: '/wgapi/livenc/liveweb/follow/add', idempotent: false },
      'routine.followRm': { method: 'POST', url: '/wgapi/livenc/liveweb/follow/rm', idempotent: false },
      'routine.fishHome': { method: 'GET', url: 'https://www.douyu.com/japi/revenuenc/web/actfans/fishing/homePage', idempotent: true },
      'routine.fishReel': { method: 'POST', url: 'https://www.douyu.com/japi/revenuenc/web/actfans/fishing/reelIn', idempotent: false },

      // 4. Radar & Perception
      'radar.hardware': { method: 'GET', url: 'https://www.douyu.com/member/cp', idempotent: true }
    };

    function resolveUrl(urlTemplate, params) {
      var p = params || {};
      var resolved = urlTemplate;
      for (var k in p) {
        if (p.hasOwnProperty(k)) {
          resolved = resolved.replace(new RegExp('\\{' + k + '\\}', 'g'), encodeURIComponent(p[k]));
        }
      }
      return resolved;
    }

    function serializeQuery(params) {
      if (!params || typeof params !== 'object') return '';
      var pairs = [];
      for (var k in params) {
        if (params.hasOwnProperty(k) && params[k] !== undefined && params[k] !== null) {
          pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
        }
      }
      return pairs.join('&');
    }

    async function request(endpointId, options) {
      var ep = ENDPOINTS[endpointId];
      if (!ep) {
        throw new Error('[NEXT Client] Unregistered endpoint: ' + endpointId);
      }

      var opts = options || {};
      var creds = await credentials.getCredentials();

      var finalUrl = resolveUrl(ep.url, opts.params);
      var headers = Object.assign({}, opts.headers || {});
      var body = opts.body;

      if (ep.method === 'GET') {
        var qs = serializeQuery(opts.query);
        if (qs) {
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
        }
      } else if (ep.method === 'POST') {
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
        // Auto-inject ccn / dy-csrf-token if needed by routine
        if (endpointId.startsWith('routine.')) {
          headers['dy-csrf-token'] = creds.csrfToken;
          if (typeof body === 'object' && body !== null) {
            if (!body.ctn) body.ctn = creds.ccn;
            body = serializeQuery(body);
          } else if (typeof body === 'string' && !body.includes('ctn=')) {
            body += (body.length > 0 ? '&' : '') + 'ctn=' + encodeURIComponent(creds.ccn);
          }
        }
      }

      return transport.sendRequest({
        url: finalUrl,
        method: ep.method,
        headers: headers,
        body: body,
        isIdempotent: ep.idempotent,
        timeout: opts.timeout,
        signal: opts.signal
      });
    }

    return {
      ENDPOINTS: ENDPOINTS,
      request: request,
      get: function (endpointId, queryOrParams, options) {
        var opts = Object.assign({}, options);
        opts.query = queryOrParams;
        opts.params = queryOrParams;
        return request(endpointId, opts);
      },
      post: function (endpointId, body, options) {
        var opts = Object.assign({}, options);
        opts.body = body;
        return request(endpointId, opts);
      }
    };
  });
})();
