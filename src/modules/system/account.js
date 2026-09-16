// src/modules/system/account.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.system.account', [
    'store.index',
    'ui.miuix'
  ], function (store, miuix) {

    function getAccounts() {
      return store.get('system.accounts') || [];
    }

    function addAccount(name, cookieSnippet) {
      if (!name) return;
      var list = getAccounts();
      list.push({
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name: name,
        cookie: cookieSnippet || ''
      });
      store.set('system.accounts', list);
      miuix.Toast('账号 ' + name + ' 已保存', 'success');
    }

    function removeAccount(id) {
      var list = getAccounts().filter(it => it.id !== id);
      store.set('system.accounts', list);
    }

    async function switchAccount(acc) {
      if (!acc) return;
      var confirmed = await miuix.Dialog({
        mode: 'confirm',
        title: '切换账号',
        message: '确认切换至账号【' + acc.name + '】吗？切换后页面将自动刷新生效。'
      });

      if (confirmed.confirmed) {
        miuix.Toast('正在应用账号凭据...', 'info');
        // Apply cookie if snippet provided
        if (acc.cookie) {
          document.cookie = acc.cookie;
        }
        setTimeout(function () {
          location.reload();
        }, 800);
      }
    }

    return {
      getAccounts: getAccounts,
      addAccount: addAccount,
      removeAccount: removeAccount,
      switchAccount: switchAccount
    };
  });
})();
