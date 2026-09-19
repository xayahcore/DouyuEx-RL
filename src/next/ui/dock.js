function* (__imports) {
yield {"handleDockAction": { get: () => handleDockAction, set: value => { handleDockAction = value; } },
"initDockFull": { get: () => initDockFull, set: value => { initDockFull = value; } },
"triggerFansContinue": { get: () => triggerFansContinue, set: value => { triggerFansContinue = value; } }};
function handleDockHover(cls, btnEl) {
  (0, __imports.clearSubPanelTimer)();
  return __imports.nextFeatures.invoke(cls, 'open', true, btnEl);
}
function handleDockAction(cls, btnEl) {
  (0, __imports.clearSubPanelTimer)();
  return __imports.nextFeatures.invoke(cls, 'open', false, btnEl || document.querySelector('.' + cls));
}
function triggerFansContinue() {
  return handleDockAction('fans-continue');
}
function initDockFull(wrap) {
  if (!wrap || __imports.nextDockOwners.has(wrap)) return;
  // A remounted room must not retain listeners or insertion patches on detached Dock nodes.
  for (const [node, owner] of __imports.nextDockOwners) if (!node.isConnected) owner.dispose();
  const owner = (0, __imports.createNextDockOwner)(wrap);
  try {
    (0, __imports.createFansContinuePanel)();
    (0, __imports.createSignPanel)();
    (0, __imports.createPopupPlayerPanel)();
    (0, __imports.createExUpdatePanel)();
    owner.listen(wrap, 'mouseenter', __imports.clearSubPanelTimer);
    owner.listen(wrap, 'mouseleave', __imports.scheduleSubPanelClose);
    for (const def of __imports.DOCK_DEFS) {
      let el = wrap.querySelector('.' + def.cls);
      if (!el) {
        el = document.createElement('div');
        el.className = def.cls;
        el.innerHTML = def.inner.replace("'+P+'", __imports.P);
        wrap.appendChild(el);
      }
      if (!el.querySelector('.ex-panel__indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'ex-panel__indicator';
        el.appendChild(indicator);
      }
      el.style.cursor = 'pointer';
      owner.property(el, 'onmouseenter', () => handleDockHover(def.cls, el));
      owner.property(el, 'onmouseleave', __imports.scheduleSubPanelClose);
      const click = event => { event.stopPropagation(); handleDockAction(def.cls, el); };
      owner.property(el, 'onclick', click);
      const link = el.querySelector('a');
      if (link) owner.property(link, 'onclick', click);
    }
    const original = wrap.insertBefore;
    owner.property(wrap, 'insertBefore', function(node, reference) {
      // Only deduplicate owned Dock classes. Never interpret arbitrary className as CSS.
      const def = __imports.DOCK_DEFS.find(item => node && node.classList && node.classList.contains(item.cls));
      const existing = def && wrap.querySelector('.' + def.cls);
      return existing || original.call(wrap, node, reference);
    });
    // The original fallback addEventListener bindings doubled parent clicks.
    // The property handlers above are the single Dock dispatch path.
    if (typeof __imports.initVersionLifecycleNotice === 'function') (0, __imports.initVersionLifecycleNotice)();
  } catch (error) {
    owner.dispose();
    throw error;
  }
}

}
