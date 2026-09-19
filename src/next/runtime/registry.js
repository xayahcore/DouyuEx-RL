function* (__imports) {
yield {"createNextDockOwner": { get: () => createNextDockOwner, set: value => { createNextDockOwner = value; } },
"nextDockOwners": { get: () => nextDockOwners },
"nextFeatures": { get: () => nextFeatures },
"teardownNextDock": { get: () => teardownNextDock, set: value => { teardownNextDock = value; } }};
/**
 * NEXT 特性注册表与 Dock 生命周期管理中枢
 */

/**
 * 单例特性调度注册表 (导出兼容 nextFeatures)
 */
var nextFeatures = (() => {
  const features = new Map();
  return Object.freeze({
    register(id, adapter) {
      if (features.has(id)) throw new Error(`[DouyuEx NEXT] 重复注册功能特性: ${id}`);
      features.set(id, Object.freeze(adapter));
    },
    invoke(id, action, ...args) {
      const adapter = features.get(id);
      if (!adapter || typeof adapter[action] !== 'function') {
        throw new Error(`[DouyuEx NEXT] 未知功能动作: ${id}.${action}`);
      }
      return adapter[action](...args);
    },
    list() {
      return [...features].map(([id, adapter]) => ({
        id,
        panel: adapter.panel || null,
        actions: Object.keys(adapter).filter(k => typeof adapter[k] === 'function')
      }));
    }
  });
})();

/**
 * 记录活跃 Dock 容器与其生命周期托管者 (导出兼容 nextDockOwners)
 */
var nextDockOwners = new Map();

/**
 * 为 Dock 容器创建生命周期托管者 (支持属性还原与事件解绑)
 * @param {HTMLElement} wrap - Dock 外层容器
 * @returns {object}
 */
function createNextDockOwner(wrap) {
  const cleanups = [];
  let disposed = false;

  const owner = {
    property(target, key, value) {
      const descriptor = Object.getOwnPropertyDescriptor(target, key);
      target[key] = value;
      cleanups.push(() => {
        if (target[key] !== value) return; // 避免撤销更新的属性赋值
        if (descriptor) {
          Object.defineProperty(target, key, descriptor);
        } else {
          delete target[key];
        }
      });
    },
    listen(target, event, listener) {
      target.addEventListener(event, listener);
      cleanups.push(() => target.removeEventListener(event, listener));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cleanups.reverse().forEach(cleanup => cleanup());
      nextDockOwners.delete(wrap);
      (0, __imports.clearSubPanelTimer)();
    }
  };

  nextDockOwners.set(wrap, owner);
  return owner;
}

/**
 * 逆向安全卸载所有已挂载的 Dock 容器
 */
function teardownNextDock() {
  [...nextDockOwners.values()].forEach(owner => owner.dispose());
  (0, __imports.clearSubPanelTimer)();
}

}
