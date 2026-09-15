// src/platform/transport.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('platform.transport', [], function () {
    var DEFAULT_TIMEOUT_MS = 15000;

    function delay(ms) {
      return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    async function sendRequest(options) {
      var opts = options || {};
      var url = opts.url;
      var method = (opts.method || 'GET').toUpperCase();
      var headers = opts.headers || {};
      var body = opts.body;
      var timeoutMs = opts.timeout || DEFAULT_TIMEOUT_MS;
      var isIdempotent = opts.isIdempotent !== false && method === 'GET';
      var maxRetries = isIdempotent ? (opts.retries ?? 2) : 0; // Non-idempotent write requests never retry!
      var signal = opts.signal;

      var attempt = 0;
      var lastError = null;

      while (attempt <= maxRetries) {
        if (signal && signal.aborted) {
          throw { code: 'ABORTED', message: 'Request aborted by user signal' };
        }

        try {
          var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          var timerId = null;

          var timeoutPromise = new Promise(function (_, reject) {
            timerId = setTimeout(function () {
              if (controller) controller.abort();
              reject({ code: 'TIMEOUT', message: 'Request timed out after ' + timeoutMs + 'ms' });
            }, timeoutMs);
          });

          var effectiveSignal = controller ? controller.signal : signal;

          var fetchPromise = fetch(url, {
            method: method,
            headers: headers,
            body: body,
            credentials: 'include',
            signal: effectiveSignal
          }).then(async function (resp) {
            clearTimeout(timerId);
            if (!resp.ok) {
              throw {
                code: resp.status === 401 || resp.status === 403 ? 'AUTH_REQUIRED' : 'HTTP_ERROR',
                status: resp.status,
                message: 'HTTP ' + resp.status + ' ' + resp.statusText
              };
            }
            var text = await resp.text();
            var json;
            try {
              json = JSON.parse(text);
            } catch (e) {
              return text; // Return raw text if not JSON
            }

            // Check Douyu business error
            if (json && typeof json === 'object') {
              var errVal = json.error ?? json.code;
              if (typeof errVal !== 'undefined' && errVal !== 0 && errVal !== '0') {
                throw {
                  code: 'BUSINESS_ERROR',
                  businessCode: errVal,
                  message: json.msg || json.message || 'Douyu business error ' + errVal,
                  data: json
                };
              }
            }
            return json;
          });

          var result = await Promise.race([fetchPromise, timeoutPromise]);
          return {
            data: result,
            receivedAt: Date.now()
          };
        } catch (err) {
          lastError = err;
          // Never retry non-idempotent or auth errors
          if (!isIdempotent || err.code === 'AUTH_REQUIRED' || err.code === 'ABORTED') {
            throw err;
          }
          attempt += 1;
          if (attempt <= maxRetries) {
            var backoff = Math.min(1000 * Math.pow(2, attempt - 1), 4000) + Math.floor(Math.random() * 250);
            await delay(backoff);
          }
        }
      }

      throw lastError || { code: 'NETWORK', message: 'Network request failed' };
    }

    return {
      sendRequest: sendRequest,
      delay: delay
    };
  });
})();
