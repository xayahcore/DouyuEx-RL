function* (__imports) {
yield {"safeBind": { get: () => safeBind, set: value => { safeBind = value; } },
"safeEl": { get: () => safeEl, set: value => { safeEl = value; } }};
/**
 * 安全获取 DOM 元素或空对象兜底
 * @param {string} id - 元素 ID
 * @returns {HTMLElement|object}
 */
function safeEl(id) {
  return document.getElementById(id) || {};
}

/**
 * 全局安全事件绑定装甲
 * 支持 Selector 字符串或直接 Element 节点，防止未加载 DOM 报错，
 * 并接入 Dock 挂载器与生命周期所有者 (owner) 托管销毁。
 * @param {string|Element} target
 * @param {string} ev - 事件名
 * @param {Function} fn - 事件处理回调
 * @param {object} [owner] - 生命周期所有者上下文
 * @returns {boolean} 是否成功绑定
 */
function safeBind(target, ev, fn, owner) {
  try {
    const el = typeof target === "string"
      ? document.querySelector(target) || document.getElementById(target)
      : target;

    if (el && typeof el.addEventListener === "function") {
      // 防范后续老逻辑重复绑定 Dock 栏图标事件。
      // 已挂载的 Dock 统一由 Registry 接管分发与释放。
      if (['click', 'mouseenter', 'mouseleave'].includes(ev)) {
        for (const wrap of __imports.nextDockOwners.keys()) {
          if (__imports.DOCK_DEFS.some(def => wrap.querySelector('.' + def.cls) === el)) {
            return true;
          }
        }
      }

      if (owner && typeof owner.listen === 'function') {
        owner.listen(el, ev, fn);
      } else {
        el.addEventListener(ev, fn);
      }
      return true;
    }
  } catch (err) {
    console.debug('[DouyuEx NEXT] safeBind 捕获异常:', err);
  }
  return false;
}

}
