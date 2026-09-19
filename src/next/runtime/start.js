(function () {
  const eventName = 'DYEXRL_NEXT_COMPAT_CLAIM';
  let occupied = false;
  const probe = () => { occupied = true; };
  document.addEventListener(eventName + ':occupied', probe);
  document.dispatchEvent(new Event(eventName));
  document.removeEventListener(eventName + ':occupied', probe);
  if (occupied) return;
  if (globalThis.DYEXRL_NEXT || globalThis.__DYRANK || document.querySelector('.ex-panel, .miuix-ex-icon')) {
    console.warn('[DouyuEx NEXT] Another runtime is present. Disable it and reload.');
    return;
  }
  document.addEventListener(eventName, () => document.dispatchEvent(new Event(eventName + ':occupied')));
  const nextRuntime = { mode: 'working-tree', status: 'starting' };
  globalThis.DYEXRL_NEXT = nextRuntime;
  // GM storage is isolated by the script manager identity; origin storage needs an explicit prefix.
  const backingStorage = window.localStorage;
  const storagePrefix = 'DYEXRL_NEXT:';
  const ownedKey = key => /^(ExSave_|Ex_)/.test(String(key)) || key === 'freetimed';
  const storageKey = key => ownedKey(String(key)) ? storagePrefix + key : String(key);
  const localStorage = {
    getItem: key => backingStorage.getItem(storageKey(key)),
    setItem: (key, value) => backingStorage.setItem(storageKey(key), value),
    removeItem: key => backingStorage.removeItem(storageKey(key)),
    key: index => {
      const key = backingStorage.key(index);
      if (key && key.startsWith(storagePrefix)) return key.slice(storagePrefix.length);
      return key && ownedKey(key) ? null : key;
    },
    get length() { return backingStorage.length; }
  };

