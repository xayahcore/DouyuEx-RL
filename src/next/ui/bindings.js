function* (__imports) {
yield {"safeBind": { get: () => safeBind, set: value => { safeBind = value; } },
"safeEl": { get: () => safeEl, set: value => { safeEl = value; } }};
function safeEl(id) {
  return document.getElementById(id) || {};
}
/* ==================== DouyuEx-RL 全局安全事件绑定装甲 ==================== */
function safeBind(target, ev, fn, owner) {
  try {
    var el =
      typeof target === "string"
        ? document.querySelector(target) || document.getElementById(target)
        : target;
    if (el && typeof el.addEventListener === "function") {
      // Later legacy assembly repeats Dock bindings. The mounted Dock already
      // routes these events through its registry and owns their teardown.
      if (['click', 'mouseenter', 'mouseleave'].includes(ev)) {
        for (const wrap of __imports.nextDockOwners.keys()) {
          if (__imports.DOCK_DEFS.some(def => wrap.querySelector('.' + def.cls) === el)) return true;
        }
      }
      if (owner) owner.listen(el, ev, fn);
      else el.addEventListener(ev, fn);
      return true;
    }
  } catch (e) {}
  return false;
}

}
