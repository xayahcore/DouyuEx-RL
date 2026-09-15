// src/core/p2p_blocker.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('core.p2p', [], function () {
    var PREFIXES = ['RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection', 'msRTCPeerConnection'];
    var originalConstructors = new WeakMap();

    function createGracefulP2PBlockerClass() {
      return class GracefulP2PBlocker {
        constructor() {
          this.connectionState = 'failed';
          this.iceConnectionState = 'failed';
          this.signalingState = 'closed';
          this.iceGatheringState = 'complete';
          this.localDescription = null;
          this.remoteDescription = null;
          this.onicecandidate = null;
          this.ontrack = null;
          this.ondatachannel = null;
        }
        createDataChannel() {
          return {
            send: function () {},
            close: function () {},
            addEventListener: function () {},
            removeEventListener: function () {},
            readyState: 'closed'
          };
        }
        createOffer() {
          return Promise.reject(new DOMException('WebRTC P2P disabled by user policy', 'NotSupportedError'));
        }
        createAnswer() {
          return Promise.reject(new DOMException('WebRTC P2P disabled by user policy', 'NotSupportedError'));
        }
        setLocalDescription() {
          return Promise.resolve();
        }
        setRemoteDescription() {
          return Promise.resolve();
        }
        addIceCandidate() {
          return Promise.resolve();
        }
        addEventListener() {}
        removeEventListener() {}
        dispatchEvent() {
          return false;
        }
        close() {}
        getStats() {
          return Promise.resolve(new Map());
        }
      };
    }

    var MockClass = createGracefulP2PBlockerClass();

    var blocker = {
      MockClass: MockClass,
      install: function (targetWindow) {
        var win = targetWindow || (typeof window !== 'undefined' ? window : globalThis);
        if (originalConstructors.has(win)) return; // Idempotent

        var originals = {};
        for (var i = 0; i < PREFIXES.length; i++) {
          var name = PREFIXES[i];
          if (typeof win[name] !== 'undefined') {
            originals[name] = win[name];
            try {
              win[name] = MockClass;
            } catch (e) {}
          }
        }
        // Also check unsafeWindow if available
        if (typeof unsafeWindow !== 'undefined' && unsafeWindow !== win) {
          for (var j = 0; j < PREFIXES.length; j++) {
            var uName = PREFIXES[j];
            if (typeof unsafeWindow[uName] !== 'undefined') {
              try {
                unsafeWindow[uName] = MockClass;
              } catch (e) {}
            }
          }
        }
        originalConstructors.set(win, originals);
      },
      uninstall: function (targetWindow) {
        var win = targetWindow || (typeof window !== 'undefined' ? window : globalThis);
        var originals = originalConstructors.get(win);
        if (!originals) return;

        for (var name in originals) {
          try {
            win[name] = originals[name];
          } catch (e) {}
        }
        originalConstructors.delete(win);
      },
      isInstalled: function (targetWindow) {
        var win = targetWindow || (typeof window !== 'undefined' ? window : globalThis);
        return originalConstructors.has(win);
      }
    };

    return blocker;
  });
})();
