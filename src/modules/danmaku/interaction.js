// src/modules/danmaku/interaction.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.danmaku.interaction', [
    'adapters.chat',
    'modules.danmaku.collect',
    'ui.miuix'
  ], function (chatAdapter, collect, miuix) {

    function handlePlusOne(text) {
      if (!text) return;
      chatAdapter.sendChatText(text);
      miuix.Toast('已 +1 跟风复读', 'info', 1500);
    }

    function showAuthorCard(authorInfo, targetElement) {
      if (!authorInfo) return;
      var uid = authorInfo.uid || '';
      var nickname = authorInfo.nickname || '';

      // MIUIX Dialog for author actions
      miuix.Dialog({
        mode: 'alert',
        title: '弹幕作者: ' + nickname,
        message: 'UID: ' + uid + '\\n可在此快速复制信息或执行房管操作。',
        confirmText: '复制UID'
      }).then(function (res) {
        if (res.confirmed && typeof GM_setClipboard === 'function') {
          GM_setClipboard(uid);
          miuix.Toast('已复制作者 UID 到剪贴板', 'success');
        }
      });
    }

    return {
      handlePlusOne: handlePlusOne,
      showAuthorCard: showAuthorCard
    };
  });
})();
