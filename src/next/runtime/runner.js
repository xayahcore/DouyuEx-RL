const interfaces = {'@platform': {"GM_cookie": { get: () => typeof GM_cookie === 'undefined' ? undefined : GM_cookie },"GM_deleteValue": { get: () => typeof GM_deleteValue === 'undefined' ? undefined : GM_deleteValue },"GM_getValue": { get: () => typeof GM_getValue === 'undefined' ? undefined : GM_getValue },"GM_info": { get: () => typeof GM_info === 'undefined' ? undefined : GM_info },"GM_listValues": { get: () => typeof GM_listValues === 'undefined' ? undefined : GM_listValues },"GM_openInTab": { get: () => typeof GM_openInTab === 'undefined' ? undefined : GM_openInTab },"GM_registerMenuCommand": { get: () => typeof GM_registerMenuCommand === 'undefined' ? undefined : GM_registerMenuCommand },"GM_setClipboard": { get: () => typeof GM_setClipboard === 'undefined' ? undefined : GM_setClipboard },"GM_setValue": { get: () => typeof GM_setValue === 'undefined' ? undefined : GM_setValue },"GM_xmlhttpRequest": { get: () => typeof GM_xmlhttpRequest === 'undefined' ? undefined : GM_xmlhttpRequest },"cancelAnimationFrame": { get: () => typeof cancelAnimationFrame === 'undefined' ? undefined : cancelAnimationFrame },"clearInterval": { get: () => typeof clearInterval === 'undefined' ? undefined : clearInterval },"clearTimeout": { get: () => typeof clearTimeout === 'undefined' ? undefined : clearTimeout },"fetch": { get: () => typeof fetch === 'undefined' ? undefined : fetch },"requestAnimationFrame": { get: () => typeof requestAnimationFrame === 'undefined' ? undefined : requestAnimationFrame },"setInterval": { get: () => typeof setInterval === 'undefined' ? undefined : setInterval },"setTimeout": { get: () => typeof setTimeout === 'undefined' ? undefined : setTimeout },"unsafeWindow": { get: () => typeof unsafeWindow === 'undefined' ? undefined : unsafeWindow }},"src/next/runtime/start.js": {"localStorage": {get: () => localStorage},"nextRuntime": {get: () => nextRuntime}}};
const pending = [];
for (const [id, factory] of Object.entries(definitions)) {
 const imports = Object.create(null);
 for (const [name, provider] of Object.entries(contracts[id].imports)) {
  Object.defineProperty(imports, name, {get: () => interfaces[provider][name].get(), set: value => { const slot = interfaces[provider][name]; if (!slot.set) throw new TypeError('Read-only import: '+name); slot.set(value); }});
 }
 const iterator = factory(Object.freeze(imports));
 interfaces[id] = iterator.next().value;
 pending.push(iterator);
}
for (const iterator of pending) { if (!iterator.next().done) throw Error('Unexpected module yield'); }
})();

})();
