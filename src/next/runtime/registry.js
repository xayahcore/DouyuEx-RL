function* (__imports) {
yield {"createNextDockOwner": { get: () => createNextDockOwner, set: value => { createNextDockOwner = value; } },
"nextDockOwners": { get: () => nextDockOwners },
"nextFeatures": { get: () => nextFeatures },
"teardownNextDock": { get: () => teardownNextDock, set: value => { teardownNextDock = value; } }};
// Feature registry owns Dock dispatch and binding lifetimes in its private module.
// Service actions are explicit live imports; remaining jobs still require reload.
const nextFeatures = (() => {
  const features = new Map();
  return Object.freeze({
    register(id, adapter) {
      if (features.has(id)) throw new Error('Duplicate feature: ' + id);
      features.set(id, Object.freeze(adapter));
    },
    invoke(id, action, ...args) {
      const adapter = features.get(id);
      if (!adapter || typeof adapter[action] !== 'function') throw new Error('Unknown feature action: ' + id + '.' + action);
      return adapter[action](...args);
    },
    list() { return [...features].map(([id, adapter]) => ({ id, panel: adapter.panel || null, actions: Object.keys(adapter).filter(key => typeof adapter[key] === 'function') })); }
  });
})();
const nextDockOwners = new Map();
function createNextDockOwner(wrap) {
  const cleanups = [];
  let disposed = false;
  const owner = {
    property(target, key, value) {
      const descriptor = Object.getOwnPropertyDescriptor(target, key);
      target[key] = value;
      cleanups.push(() => {
        if (target[key] !== value) return; // Do not undo a newer owner's replacement.
        if (descriptor) Object.defineProperty(target, key, descriptor);
        else delete target[key];
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
function teardownNextDock() {
  [...nextDockOwners.values()].forEach(owner => owner.dispose());
  (0, __imports.clearSubPanelTimer)();
}

}
