// src/modules/system/fans_highlight.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.system.fansHighlight', [
    'store.index'
  ], function (store) {

    function processDanmakuNode(node) {
      if (!node || node.nodeType !== 1) return;
      var enabled = store.get('system.fansHighlight') ?? true;
      if (!enabled) return;

      // Check for fans badge days attribute or tooltip
      var badge = node.querySelector('.FansMedal, [class*="FansMedal"]');
      if (!badge) return;

      var title = badge.getAttribute('title') || badge.getAttribute('data-title') || badge.textContent || '';
      // Look for days e.g. "佩戴320天" or "300天"
      var m = title.match(/(\d{3,4})\s*天/);
      if (m && Number(m[1]) >= 300) {
        // Highlight as 300-day Iron Fan!
        var tag = node.querySelector('.iron-fan-badge');
        if (!tag) {
          tag = document.createElement('span');
          tag.className = 'iron-fan-badge';
          tag.style.color = '#ef4444';
          tag.style.fontWeight = '700';
          tag.style.fontSize = '10px';
          tag.style.marginLeft = '4px';
          tag.textContent = '【' + m[1] + '天铁粉】';
          badge.parentNode?.insertBefore(tag, badge.nextSibling);
        }
      }
    }

    return {
      processDanmakuNode: processDanmakuNode
    };
  });
})();
