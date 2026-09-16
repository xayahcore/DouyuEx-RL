// src/platform/script_bridge.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('platform.scriptBridge', [], function () {

    var originalAppendChild = null;
    var originalInsertBefore = null;
    var isInstalled = false;
    var transformers = new Map();

    function registerTransformer(urlPattern, transformFn) {
      transformers.set(urlPattern, transformFn);
    }

    function install(targetWin) {
      if (isInstalled) return;
      var win = targetWin || (typeof window !== 'undefined' ? window : globalThis);
      var NodeProto = win.Node ? win.Node.prototype : null;
      if (!NodeProto) return;

      originalAppendChild = NodeProto.appendChild;
      originalInsertBefore = NodeProto.insertBefore;

      NodeProto.appendChild = function (child) {
        if (child && child.tagName === 'SCRIPT' && child.src) {
          // Check white-list / firstqueue
          if (child.src.includes('/firstqueue')) {
            // Safe pipeline
          }
        }
        return originalAppendChild.apply(this, arguments);
      };

      NodeProto.insertBefore = function (child, ref) {
        return originalInsertBefore.apply(this, arguments);
      };

      isInstalled = true;
    }

    function uninstall(targetWin) {
      if (!isInstalled) return;
      var win = targetWin || (typeof window !== 'undefined' ? window : globalThis);
      var NodeProto = win.Node ? win.Node.prototype : null;
      if (NodeProto && originalAppendChild) {
        NodeProto.appendChild = originalAppendChild;
        NodeProto.insertBefore = originalInsertBefore;
      }
      isInstalled = false;
      transformers.clear();
    }

    return {
      install: install,
      uninstall: uninstall,
      registerTransformer: registerTransformer
    };
  });
})();
