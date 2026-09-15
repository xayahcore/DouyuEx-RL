// src/core/rank_engine.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('core.rank', [], function () {
    function sttFlat(s) {
      if (typeof s !== 'string' || !s) return s;
      var t = s.charAt(s.length - 1) === '/' ? s : s + '/';
      var n = t.length;
      var obj = /@=/g.test(t) ? {} : [];
      var i = 0, key = '', acc = '';

      while (i < n) {
        var c = t.charAt(i);
        if (c === '/') {
          if (Array.isArray(obj)) obj.push(acc);
          else obj[key] = acc;
          key = '';
          acc = '';
        } else if (c === '@') {
          i += 1;
          switch (t.charAt(i)) {
            case 'A': acc += '@'; break;
            case 'S': acc += '/'; break;
            case '=': key = acc; acc = ''; break;
          }
        } else {
          acc += c;
        }
        i += 1;
      }
      return obj;
    }

    function sttParse(s) {
      if (typeof s !== 'string') return s;
      if (/\/\/\|\//.test(s)) return s.split('/|/').map(sttParse);
      if (!/@[=|A]/.test(s)) return s;

      var v = sttFlat(s);
      if (!v) return undefined;
      if (Array.isArray(v)) return v.map(sttParse);

      var out = {};
      Object.keys(v).forEach(function (k) {
        out[k] = sttParse(v[k]);
      });
      return out;
    }

    function sttType(raw) {
      var m = String(raw).match(/type@=([^/]+)/);
      return m ? m[1] : '';
    }

    function parseList(list) {
      var map = new Map();
      var money = false;
      if (!list) return { map: map, money: money };

      var items = Array.isArray(list) ? list : [list];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (!item || typeof item !== 'object') continue;
        var name = item.nickname || item.nn || '';
        var gold = Number(item.gold || item.score || 0);
        if (item.gold) money = true;
        if (name) {
          map.set(name, {
            gold: gold,
            rank: i + 1,
            uid: item.uid || item.id || ''
          });
        }
      }
      return { map: map, money: money };
    }

    var STT = {
      flat: sttFlat,
      parse: sttParse,
      type: sttType,
      parseList: parseList
    };

    function createRankEngine() {
      var state = {
        data: {
          day: { map: new Map(), money: false },
          week: { map: new Map(), money: false },
          month: { map: new Map(), money: false },
          all: { map: new Map(), money: false }
        }
      };

      function updateRankData(typeKey, rawList) {
        if (state.data[typeKey]) {
          state.data[typeKey] = parseList(rawList);
        }
      }

      function dump() {
        var out = {};
        Object.keys(state.data).forEach(function (k) {
          out[k] = {
            money: state.data[k].money,
            list: Array.from(state.data[k].map.entries())
          };
        });
        return out;
      }

      function reset() {
        Object.keys(state.data).forEach(function (k) {
          state.data[k] = { map: new Map(), money: false };
        });
      }

      return {
        STT: STT,
        state: state,
        updateRankData: updateRankData,
        dump: dump,
        reset: reset
      };
    }

    return {
      STT: STT,
      createRankEngine: createRankEngine
    };
  });
})();
