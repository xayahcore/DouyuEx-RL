function* (__imports) {
yield {"_t": { get: () => _t, set: value => { _t = value; } },
"fetchCurrentRoomGifts": { get: () => fetchCurrentRoomGifts, set: value => { fetchCurrentRoomGifts = value; } },
"fetchUserBackpackGifts": { get: () => fetchUserBackpackGifts, set: value => { fetchUserBackpackGifts = value; } }};
let gt,
  ht = 0,
  ft,
  yt,
  bt; // 全量礼物配置缓存与快速检索字典
// 获取纯数字真实房间号 (归一化提取，杜绝别名导致的 403)
function getNumericRoomId() {
  try {
    if (typeof __imports.unsafeWindow !== "undefined") {
      if (__imports.unsafeWindow.room_id && !isNaN(Number(__imports.unsafeWindow.room_id)))
        return String(__imports.unsafeWindow.room_id);
      if (__imports.unsafeWindow.rid && !isNaN(Number(__imports.unsafeWindow.rid)))
        return String(__imports.unsafeWindow.rid);
      if (
        __imports.unsafeWindow.$DATA &&
        __imports.unsafeWindow.$DATA.ROOM &&
        __imports.unsafeWindow.$DATA.ROOM.room_id
      ) {
        return String(__imports.unsafeWindow.$DATA.ROOM.room_id);
      }
    }
  } catch (e) {}
  try {
    if (typeof window !== "undefined") {
      if (window.room_id && !isNaN(Number(window.room_id)))
        return String(window.room_id);
      if (window.rid && !isNaN(Number(window.rid))) return String(window.rid);
    }
  } catch (e) {}
  if (typeof __imports.B !== "undefined" && __imports.B && !isNaN(Number(__imports.B))) return String(__imports.B);
  try {
    var html = document.documentElement.innerHTML;
    var m =
      html.match(/["']room_id["']\s*:\s*(\d+)/) ||
      html.match(/roomID:\s*(\d+)/);
    if (m && m[1]) return m[1];
  } catch (e) {}
  return "";
}

// 模块 A：恢复原设计意图 —— 双流聚合当前房间专属礼物与通用在播礼物 (0 全网死重)
var _lastRoomGiftsMapByName = {};

var COMMON_BACKPACK_PROPS = {
  弱鸡: "https://gfs-op.douyucdn.cn/dygift/2018/11/27/d71e48b4ac91993b4aea75c0c0dd0f45.gif",
  粉丝荧光棒:
    "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
  荧光棒:
    "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
  赞: "https://gfs-op.douyucdn.cn/dygift/2018/11/29/abe536f393466727e02422b7cc1fbf57.gif",
  办卡: "https://gfs-op.douyucdn.cn/dygift/2026/02/04/fb706bd5c63844326420ef86bf87a3ea.webp",
  稳: "https://gfs-op.douyucdn.cn/dygift/1705/88d8b9e6f3630f576b2512f458e38d72.gif",
  666: "https://gfs-op.douyucdn.cn/dygift/1705/1f4f13a0c4f826620573e0a133df19f1.gif",
  福袋: "https://gfs-op.douyucdn.cn/dygift/2019/07/23/bf92364f33190dfca0803450e1814674.gif",
};

function fetchCurrentRoomGifts(rid, callback) {
  var numRid = getNumericRoomId() || String(rid || "");
  var exclusiveGifts = [];
  var universalGifts = [];
  var doneCount = 0;

  function finish() {
    if (++doneCount < 2) return;

    var combinedMap = {};
    // 1. 通用在播礼物 (飞机、火箭、超火、飞船、办卡、赞、弱鸡等)
    universalGifts.forEach(function (g) {
      combinedMap[g.id] = g;
    });
    // 2. 房间专属定制礼物 (如 RUA、药丸等定制道具)
    exclusiveGifts.forEach(function (g) {
      combinedMap[g.id] = g;
    });

    var merged = [];
    for (var id in combinedMap) {
      if (combinedMap.hasOwnProperty(id)) {
        merged.push(combinedMap[id]);
        _lastRoomGiftsMapByName[combinedMap[id].name] = combinedMap[id];
      }
    }
    // 按鱼翅价值从高到低排序
    merged.sort(function (a, b) {
      return b.price - a.price;
    });
    callback(merged);
  }

  // 第一流：拉取房间专属礼物 (优先从页面内存读取，未就绪从 betard 接口拉取)
  try {
    var winData =
      typeof __imports.unsafeWindow !== "undefined" && __imports.unsafeWindow.$DATA
        ? __imports.unsafeWindow.$DATA
        : typeof window !== "undefined" && window.$DATA
          ? window.$DATA
          : null;
    if (winData && winData.room_gift && winData.room_gift.gift) {
      exclusiveGifts = parseRoomGiftMap(winData.room_gift.gift);
      finish();
    } else {
      fetchBetardExclusive();
    }
  } catch (e) {
    fetchBetardExclusive();
  }

  function fetchBetardExclusive() {
    var betardUrl = "https://www.douyu.com/betard/" + numRid;
    var handleBetard = function (json) {
      if (json && json.room_gift && json.room_gift.gift) {
        exclusiveGifts = parseRoomGiftMap(json.room_gift.gift);
      }
      finish();
    };
    if (typeof __imports.GM_xmlhttpRequest === "function") {
      (0, __imports.GM_xmlhttpRequest)({
        method: "GET",
        url: betardUrl,
        responseType: "json",
        headers: {
          Referer: "https://www.douyu.com/" + numRid,
          "User-Agent": navigator.userAgent,
        },
        onload: function (res) {
          handleBetard(res.response || {});
        },
        onerror: function () {
          finish();
        },
      });
    } else {
      (0, __imports.fetch)(betardUrl, { credentials: "include" })
        .then(function (r) {
          return r.json();
        })
        .then(handleBetard)
        .catch(function () {
          finish();
        });
    }
  }

  // 第二流：从官方 RoomApi 拉取当前房间可用的完整通用在播礼物池
  var roomApiUrl = "https://open.douyucdn.cn/api/RoomApi/room/" + numRid;
  var handleRoomApi = function (json) {
    if (json && json.data && Array.isArray(json.data.gift)) {
      universalGifts = parseRoomApiUniversalGifts(json.data.gift);
    }
    finish();
  };

  if (typeof __imports.GM_xmlhttpRequest === "function") {
    (0, __imports.GM_xmlhttpRequest)({
      method: "GET",
      url: roomApiUrl,
      responseType: "json",
      headers: {
        Referer: "https://www.douyu.com/" + numRid,
        "User-Agent": navigator.userAgent,
      },
      onload: function (res) {
        handleRoomApi(res.response || {});
      },
      onerror: function () {
        finish();
      },
    });
  } else {
    (0, __imports.fetch)(roomApiUrl)
      .then(function (r) {
        return r.json();
      })
      .then(handleRoomApi)
      .catch(function () {
        finish();
      });
  }
}

function parseRoomGiftMap(giftDict) {
  var result = [];
  if (!giftDict) return result;
  for (var gid in giftDict) {
    if (!giftDict.hasOwnProperty(gid)) continue;
    var g = giftDict[gid];
    var icon = g.pc_icon || g.gif_icon || g.himg || g.cimg || g.bimg || "";
    if (icon && !icon.startsWith("http")) {
      icon = "https://gfs-op.douyucdn.cn/dygift/" + icon;
    }
    var priceVal = Number(g.price || g.pc || 0);
    var priceYc = priceVal / 100;
    result.push({
      id: String(g.id || gid),
      name: g.name || "未知礼物",
      priceText: priceYc > 0 ? priceYc + " 鱼翅" : "免费",
      icon:
        icon ||
        "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
      price: priceVal,
      stayTime: Number(g.stay_time || 4000),
    });
  }
  return result;
}

function parseRoomApiUniversalGifts(list) {
  var result = [];
  if (!Array.isArray(list)) return result;
  for (var i = 0; i < list.length; i++) {
    var g = list[i];
    var icon = g.himg || g.mimg || "";
    var priceYc = Number(g.pc || 0);
    result.push({
      id: String(g.id),
      name: g.name || "通用礼物",
      priceText: priceYc > 0 ? priceYc + " 鱼翅" : "免费",
      icon:
        icon ||
        "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
      price: priceYc * 100,
      stayTime: 4000,
    });
  }
  return result;
}

// 模块 A：恢复原设计意图 —— 获取当前用户真实的背包礼物资产 (精准图标映射)
function fetchUserBackpackGifts(rid, callback) {
  var numRid = getNumericRoomId() || String(rid || "");
  var bpUrl = "https://www.douyu.com/japi/prop/backpack/web/v5?rid=" + numRid;

  function parseBackpackList(list) {
    if (!Array.isArray(list)) list = [];
    return list.map(function (item) {
      var icon = item.pic || item.icon || item.small_pic || item.himg || "";
      if (icon && !icon.startsWith("http")) {
        icon = "https://gfs-op.douyucdn.cn/dygift/" + icon;
      }
      var itemName = item.name || "";
      if (!icon) {
        // 1. 优先从常驻免费道具字典精确匹配 (彻底消灭弱鸡与荧光棒串图问题)
        for (var key in COMMON_BACKPACK_PROPS) {
          if (itemName.indexOf(key) !== -1) {
            icon = COMMON_BACKPACK_PROPS[key];
            break;
          }
        }
      }
      // 2. 尝试从房间礼物池动态名称反查
      if (!icon && _lastRoomGiftsMapByName[itemName]) {
        icon = _lastRoomGiftsMapByName[itemName].icon;
      }
      // 3. 最终兜底
      if (!icon) {
        icon =
          "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif";
      }

      return {
        id: String(item.id),
        name: itemName || "背包道具",
        priceText: "拥有 ×" + String(item.count || 1),
        icon: icon,
        count: Number(item.count || 1),
      };
    });
  }

  // 优先调用带 Referer 校验的油猴特权接口，保证 100% 鉴权成功
  if (typeof __imports.GM_xmlhttpRequest === "function") {
    (0, __imports.GM_xmlhttpRequest)({
      method: "GET",
      url: bpUrl,
      responseType: "json",
      headers: {
        Referer: "https://www.douyu.com/" + numRid,
        "User-Agent": navigator.userAgent,
      },
      onload: function (res) {
        var json = res.response || {};
        var rawList =
          json.data && Array.isArray(json.data.list)
            ? json.data.list
            : Array.isArray(json.data)
              ? json.data
              : [];
        if (rawList.length > 0) {
          return callback(parseBackpackList(rawList));
        }
        fallbackDomCheck();
      },
      onerror: function () {
        fallbackDomCheck();
      },
    });
  } else {
    fallbackDomCheck();
  }

  function fallbackDomCheck() {
    // DOM 现场探针：如果底栏已经展开过背包，直接读取真实渲染的道具节点
    try {
      var domCards = document.querySelectorAll(
        ".ToolBarBackpack .ToolbarGiftCard, .ToolbarGiftArea-backpack .ToolbarGiftCard, .ToolBarBackpack-giftList .ToolbarGiftCard",
      );
      if (domCards && domCards.length > 0) {
        var domList = [];
        for (var i = 0; i < domCards.length; i++) {
          var card = domCards[i];
          var img = card.querySelector(".ToolbarGiftCard-img, img");
          var nameEl = card.querySelector(".ToolbarGiftCard-name");
          var priceEl = card.querySelector(".ToolbarGiftCard-price");
          var name = nameEl
            ? nameEl.textContent.trim()
            : card.getAttribute("title") || "";
          var iconSrc = img
            ? img.src || img.getAttribute("data-src") || ""
            : "";
          if (!iconSrc && name) {
            for (var k in COMMON_BACKPACK_PROPS) {
              if (name.indexOf(k) !== -1) {
                iconSrc = COMMON_BACKPACK_PROPS[k];
                break;
              }
            }
          }
          var count = priceEl
            ? parseInt(priceEl.textContent.replace(/[^0-9]/g, "")) || 1
            : 1;
          var propId =
            card.getAttribute("data-id") ||
            card.getAttribute("data-prop-id") ||
            String(20000 + i);
          if (name) {
            domList.push({
              id: String(propId),
              name: name,
              priceText: "拥有 ×" + String(count),
              icon:
                iconSrc ||
                "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
              count: count,
            });
          }
        }
        if (domList.length > 0) {
          return callback(domList);
        }
      }
    } catch (e) {}
    callback([]);
  }
}

function _t() {
  return document.getElementById("extool__p2p").checked;
}

}
