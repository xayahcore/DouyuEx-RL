// src/modules/ui/enhancements.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.ui.enhancements', [
    'store.index',
    'adapters.chat',
    'ui.miuix',
    'ui.icons'
  ], function (store, chatAdapter, miuix, icons) {

    function mountChatTailButton(doc) {
      var d = doc || document;
      var bar = d.querySelector('.ChatToolBar__left') || d.querySelector('.ChatToolBar');
      if (!bar || bar.querySelector('.miuix-tail-trigger')) return;

      var btn = d.createElement('div');
      btn.className = 'miuix-tail-trigger';
      var tailConf = store.get('danmaku.tail') || {};
      if (tailConf.enabled) btn.classList.add('is-active');
      btn.textContent = tailConf.enabled ? '小尾巴: 开' : '小尾巴: 关';

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var cur = store.get('danmaku.tail') || {};
        cur.enabled = !cur.enabled;
        store.set('danmaku.tail', cur);
        btn.classList.toggle('is-active', cur.enabled);
        btn.textContent = cur.enabled ? '小尾巴: 开' : '小尾巴: 关';
        miuix.Toast('弹幕小尾巴已' + (cur.enabled ? '开启' : '关闭'), 'info', 1500);
      });

      bar.appendChild(btn);
    }

    function hookBarragePlusOne(doc) {
      var d = doc || document;
      var list = d.querySelector('#js-barrage-list') || d.querySelector('.Barrage-list');
      if (!list || list.dataset.plusOneHooked) return;
      list.dataset.plusOneHooked = '1';

      function checkItems(container) {
        var items = container.querySelectorAll('.Barrage-listItem:not([data-plus-one])');
        items.forEach(function (item) {
          item.setAttribute('data-plus-one', '1');
          var textEl = item.querySelector('.Barrage-content');
          if (!textEl) return;
          var text = textEl.textContent.trim();
          if (!text) return;

          var btn = d.createElement('span');
          btn.className = 'miuix-danmaku-plusone';
          btn.textContent = '+1';
          btn.title = '跟风复读';
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            chatAdapter.sendChatText(text);
            miuix.Toast('已 +1 跟风复读: ' + text.slice(0, 10), 'info', 1200);
          });
          item.appendChild(btn);
        });
      }

      if (typeof MutationObserver !== 'undefined') {
        var obs = new MutationObserver(function () {
          checkItems(list);
        });
        obs.observe(list, { childList: true, subtree: true });
      }
      checkItems(list);
    }

    function mountPlayerToolbarButton(doc, onMediaClick) {
      var d = doc || document;
      var rightBar = d.querySelector('.right-e7ea5d') || d.querySelector('.right-17e251');
      if (!rightBar || rightBar.querySelector('.miuix-vtoolbar-btn')) return;

      var btn = d.createElement('div');
      btn.className = 'miuix-vtoolbar-btn';
      btn.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; cursor: pointer; color: #fff; margin-right: 4px;';
      btn.title = 'DouyuEx-RL NEXT 播控中心';
      btn.appendChild(icons.createSvg('media', 18));

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (typeof onMediaClick === 'function') {
          onMediaClick(btn);
        }
      });

      rightBar.insertBefore(btn, rightBar.firstChild);
    }

    return {
      mountChatTailButton: mountChatTailButton,
      hookBarragePlusOne: hookBarragePlusOne,
      mountPlayerToolbarButton: mountPlayerToolbarButton
    };
  });
})();
