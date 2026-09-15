// ==UserScript==
// @name         DouyuEx-RL (NEXT Clean Architecture)
// @namespace    https://github.com/xayahcore/DouyuEx-RL/next
// @version      2026.09.16.01-next
// @description  DouyuEx-RL NEXT 纯净重构版 (试验性独立施工包)
// @author       xayahcore
// @license      MIT
// @run-at       document-start

// @match			*://*.douyu.com/0*
// @match			*://*.douyu.com/1*
// @match			*://*.douyu.com/2*
// @match			*://*.douyu.com/3*
// @match			*://*.douyu.com/4*
// @match			*://*.douyu.com/5*
// @match			*://*.douyu.com/6*
// @match			*://*.douyu.com/7*
// @match			*://*.douyu.com/8*
// @match			*://*.douyu.com/9*
// @match			*://*.douyu.com/beta/*
// @match			*://*.douyu.com/topic/*
// @match        *://www.douyu.com/member/cp/getFansBadgeList
// @match        *://passport.douyu.com/*
// @match        *://msg.douyu.com/*
// @match        *://yuba.douyu.com/*
// @match        *://v.douyu.com/*
// @match        *://cz.douyu.com/*

// @require      https://registry.npmmirror.com/flv.js/1.6.2/files/dist/flv.min.js
// @require      https://fastly.jsdelivr.net/npm/svgaplayerweb@2.3.1/build/svga.min.js
// @require      https://registry.npmmirror.com/gif.js/0.2.0/files/dist/gif.js
// @require      https://registry.npmmirror.com/three/0.80.0/files/build/three.min.js
// @require      https://registry.npmmirror.com/xlsx/0.16.4/files/dist/xlsx.full.min.js
// @require      https://registry.npmmirror.com/dompurify/2.3.6/files/dist/purify.min.js

// @connect      douyucdn.cn
// @connect      douyu.com
// @connect      qq.com
// @connect      douyuex.com
// @connect      bilibili.com
// @connect      huya.com
// @connect      shadiao.app
// @connect      doseeing.com
// @connect      registry.npmmirror.com
// @connect      fastly.jsdelivr.net
// @connect      greasyfork.org

// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_cookie
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// ==/UserScript==

/* --- NEXT module: src/runtime/namespace.js --- */
(function () {
  'use strict';
  var modules = {};
  var instances = {};
  var resolving = {};

  var registry = {
    register: function (id, dependencies, factory) {
      if (typeof id !== 'string' || !id) {
        throw new Error('[NEXT Registry] Invalid module id: ' + id);
      }
      if (modules[id]) {
        throw new Error('[NEXT Registry] Duplicate module registration: ' + id);
      }
      if (typeof factory !== 'function') {
        throw new Error('[NEXT Registry] Module factory must be a function: ' + id);
      }
      modules[id] = {
        id: id,
        dependencies: Array.isArray(dependencies) ? dependencies : [],
        factory: factory
      };
    },
    resolve: function (id) {
      if (instances.hasOwnProperty(id)) {
        return instances[id];
      }
      var mod = modules[id];
      if (!mod) {
        throw new Error('[NEXT Registry] Missing module: ' + id);
      }
      if (resolving[id]) {
        throw new Error('[NEXT Registry] Circular dependency detected: ' + id);
      }
      resolving[id] = true;
      try {
        var resolvedDeps = [];
        for (var i = 0; i < mod.dependencies.length; i++) {
          resolvedDeps.push(registry.resolve(mod.dependencies[i]));
        }
        var instance = mod.factory.apply(null, resolvedDeps);
        instances[id] = instance;
        return instance;
      } finally {
        delete resolving[id];
      }
    },
    has: function (id) {
      return modules.hasOwnProperty(id);
    },
    list: function () {
      return Object.keys(modules);
    },
    reset: function () {
      modules = {};
      instances = {};
      resolving = {};
    }
  };

  globalThis.DYEXRL_NEXT = {
    version: '2026.09.16.01-next',
    registry: registry
  };
})();

