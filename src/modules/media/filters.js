// src/modules/media/filters.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.media.filters', [
    'adapters.player',
    'store.index'
  ], function (playerAdapter, store) {

    var DEFAULT_FILTERS = {
      brightness: 100, // %
      contrast: 100,   // %
      saturate: 100,   // %
      hueRotate: 0,    // deg
      blur: 0          // px
    };

    function getFilterString(conf) {
      var c = conf || store.get('media.filters') || DEFAULT_FILTERS;
      return [
        'brightness(' + (c.brightness ?? 100) + '%)',
        'contrast(' + (c.contrast ?? 100) + '%)',
        'saturate(' + (c.saturate ?? 100) + '%)',
        'hue-rotate(' + (c.hueRotate ?? 0) + 'deg)',
        'blur(' + (c.blur ?? 0) + 'px)'
      ].join(' ');
    }

    function applyFilters() {
      var video = playerAdapter.getVideoElement();
      if (!video) return;
      var str = getFilterString();
      video.style.filter = str;
    }

    function setFilter(key, value) {
      var cur = store.get('media.filters') || Object.assign({}, DEFAULT_FILTERS);
      cur[key] = value;
      store.set('media.filters', cur);
      applyFilters();
    }

    function resetFilters() {
      store.set('media.filters', Object.assign({}, DEFAULT_FILTERS));
      applyFilters();
    }

    return {
      getFilterString: getFilterString,
      applyFilters: applyFilters,
      setFilter: setFilter,
      resetFilters: resetFilters,
      DEFAULT_FILTERS: DEFAULT_FILTERS
    };
  });
})();
