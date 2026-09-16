// src/modules/system/month_cost.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.system.monthCost', [
    'store.index',
    'api.client'
  ], function (store, client) {

    var isHidden = store.get('system.monthCost.hidden') !== false;

    function getMonthCostDisplay(amount) {
      if (isHidden) return '***';
      return (Number(amount) || 0).toFixed(2);
    }

    function togglePrivacy() {
      isHidden = !isHidden;
      store.set('system.monthCost.hidden', isHidden);
      return isHidden;
    }

    function mountMonthCostWidget(containerEl) {
      if (!containerEl || containerEl.querySelector('.miuix-month-cost')) return;

      var wrap = document.createElement('div');
      wrap.className = 'miuix-month-cost';
      wrap.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #64748b; cursor: pointer; user-select: none; margin-right: 8px;';
      wrap.innerHTML = `
        <span>本月消费</span>
        <b id="month-cost-val" style="color: #0f172a;">${getMonthCostDisplay(0)}</b>
        <span>元</span>
        <span id="month-cost-eye" style="font-size: 12px; margin-left: 2px;">${isHidden ? '🙈' : '👁️'}</span>
      `;

      wrap.addEventListener('click', function (e) {
        e.stopPropagation();
        var hidden = togglePrivacy();
        var valEl = wrap.querySelector('#month-cost-val');
        var eyeEl = wrap.querySelector('#month-cost-eye');
        if (valEl) valEl.textContent = getMonthCostDisplay(0);
        if (eyeEl) eyeEl.textContent = hidden ? '🙈' : '👁️';
      });

      containerEl.appendChild(wrap);
    }

    return {
      getMonthCostDisplay: getMonthCostDisplay,
      togglePrivacy: togglePrivacy,
      mountMonthCostWidget: mountMonthCostWidget
    };
  });
})();
