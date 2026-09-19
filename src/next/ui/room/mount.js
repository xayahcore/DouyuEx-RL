function* (__imports) {
yield {"activeRoomMount": { get: () => activeRoomMount, set: value => { activeRoomMount = value; } },
"createRoomLifetime": { get: () => createRoomLifetime, set: value => { createRoomLifetime = value; } },
"mountRoom": { get: () => mountRoom, set: value => { mountRoom = value; } },
"unmountRoom": { get: () => unmountRoom, set: value => { unmountRoom = value; } }};
// Room phases exchange explicit outputs; construction temporaries stay local.
let activeRoomMount = null;
function createRoomLifetime() {
  let disposed = false;
  const cleanups = new Set();
  const owner = {
    // Preserve the legacy mutable submit target until that behavioral change is approved.
    navigation: { submitTarget: undefined },
    get disposed() { return disposed; },
    own(cleanup) {
      if (disposed) cleanup(); else cleanups.add(cleanup);
      return cleanup;
    },
    guard(callback) {
      return function(...args) { if (!disposed) return callback.apply(this, args); };
    },
    listen(target, type, callback, options) {
      if (disposed || !target) return;
      target.addEventListener(type, callback, options);
      owner.own(() => target.removeEventListener(type, callback, options));
    },
    interval(callback, delay) {
      if (disposed) return null;
      const id = (0, __imports.setInterval)(owner.guard(callback), delay);
      owner.own(() => (0, __imports.clearInterval)(id));
      return id;
    },
    timeout(callback, delay) {
      if (disposed) return null;
      let cleanup;
      const id = (0, __imports.setTimeout)(owner.guard(() => {
        cleanups.delete(cleanup);
        callback();
      }), delay);
      cleanup = owner.own(() => (0, __imports.clearTimeout)(id));
      return id;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const errors = [];
      for (const cleanup of [...cleanups].reverse()) {
        try { cleanup(); } catch (error) { errors.push(error); }
      }
      cleanups.clear();
      if (errors.length) console.warn('NEXT room cleanup', errors);
    }
  };
  return owner;
}
function unmountRoom() {
  if (!activeRoomMount) return;
  const owner = activeRoomMount;
  activeRoomMount = null;
  owner.dispose();
}
function mountRoom() {
  if (activeRoomMount && !activeRoomMount.disposed) return activeRoomMount;
  const owner = createRoomLifetime();
  activeRoomMount = owner;
  const existing = new Set(document.querySelectorAll('*'));
  owner.own(__imports.stopTaskHeartbeat);
  owner.own(() => (0, __imports.teardownNextDock)());
  try {
    (0, __imports.mountRoomShell)(owner);
    (0, __imports.mountRoomControls)(owner);
    const liveToolsPanel = (0, __imports.mountLotteryPanel)(owner);
    (0, __imports.mountLiveToolsPanel)(owner, liveToolsPanel);
    (0, __imports.mountExtensionToolsPanel)(owner);
    (0, __imports.mountBloopPanel)(owner);
    (0, __imports.mountRoomPlayerBindings)(owner);
    owner.listen(window, 'pagehide', unmountRoom);
    return owner;
  } catch (error) {
    unmountRoom();
    throw error;
  } finally {
    // Capture only nodes introduced by synchronous assembly, not page-owned nodes.
    const added = [...document.querySelectorAll('*')].filter(node => !existing.has(node));
    const addedSet = new Set(added);
    const roots = added.filter(node => !addedSet.has(node.parentElement));
    owner.own(() => roots.forEach(node => node.remove()));
  }
}

}
