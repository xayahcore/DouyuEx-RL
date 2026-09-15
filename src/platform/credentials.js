// src/platform/credentials.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('platform.credentials', [], function () {
    var win = typeof window !== 'undefined' ? window : globalThis;

    function getCookie(name) {
      if (typeof document === 'undefined' || !document.cookie) return '';
      var pattern = new RegExp('(?:^|;\\s*)' + name + '=([^;]+)');
      var match = document.cookie.match(pattern);
      return match ? decodeURIComponent(match[1]) : '';
    }

    function setCookie(name, value, path, days) {
      if (typeof document === 'undefined') return;
      var expires = '';
      if (days) {
        var d = new Date();
        d.setTime(d.getTime() + days * 86400000);
        expires = '; expires=' + d.toUTCString();
      }
      document.cookie = name + '=' + encodeURIComponent(value) + (path ? '; path=' + path : '; path=/') + expires;
    }

    async function getCcn() {
      var ccn = getCookie('ccn');
      if (ccn) return ccn;

      // Try waking up ccn via official endpoint
      try {
        if (typeof fetch === 'function') {
          await fetch('/wgapi/livenc/liveweb/csrfApi/getCsrfCookie', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store'
          });
          ccn = getCookie('ccn');
          if (ccn) return ccn;
        }
      } catch (e) {}

      // Fallback to acf_ccn
      var acfCcn = getCookie('acf_ccn');
      if (acfCcn) return acfCcn;

      return '';
    }

    function getCsrfToken() {
      var token = getCookie('post-csrfToken');
      if (!token) {
        token = Math.random().toString(36).substring(2);
        setCookie('post-csrfToken', token, '/', 7);
      }
      return token;
    }

    async function getCredentials() {
      var ccn = await getCcn();
      var csrfToken = getCsrfToken();
      return {
        ccn: ccn,
        csrfToken: csrfToken,
        deviceId: '-'
      };
    }

    return {
      getCookie: getCookie,
      setCookie: setCookie,
      getCcn: getCcn,
      getCsrfToken: getCsrfToken,
      getCredentials: getCredentials
    };
  });
})();
