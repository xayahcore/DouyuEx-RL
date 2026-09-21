var COMMON_BACKPACK_PROPS = {
  "弱鸡": "https://gfs-op.douyucdn.cn/dygift/2018/11/27/d71e48b4ac91993b4aea75c0c0dd0f45.gif",
  "粉丝荧光棒": "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
  "荧光棒": "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
  "赞": "https://gfs-op.douyucdn.cn/dygift/2018/11/29/abe536f393466727e02422b7cc1fbf57.gif",
  "办卡": "https://gfs-op.douyucdn.cn/dygift/2026/02/04/fb706bd5c63844326420ef86bf87a3ea.webp",
  "稳": "https://gfs-op.douyucdn.cn/dygift/1705/88d8b9e6f3630f576b2512f458e38d72.gif",
  "666": "https://gfs-op.douyucdn.cn/dygift/1705/1f4f13a0c4f826620573e0a133df19f1.gif",
  "福袋": "https://gfs-op.douyucdn.cn/dygift/2019/07/23/bf92364f33190dfca0803450e1814674.gif"
};

var _lastRoomGiftsMapByName = {};

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
      priceText: priceYc > 0 ? (priceYc + " 鱼翅") : "免费",
      icon: icon || "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
      price: priceVal,
      stayTime: Number(g.stay_time || 4000)
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
      priceText: priceYc > 0 ? (priceYc + " 鱼翅") : "免费",
      icon: icon || "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
      price: priceYc * 100,
      stayTime: 4000
    });
  }
  return result;
}

function fetchCurrentRoomGifts(room_id, callback) {
  var numRid = String(room_id || rid || "");
  var exclusiveGifts = [];
  var universalGifts = [];
  var doneCount = 0;

  function finish() {
    if (++doneCount < 2) return;
    var combinedMap = {};
    universalGifts.forEach((g) => { combinedMap[g.id] = g; });
    exclusiveGifts.forEach((g) => { combinedMap[g.id] = g; });
    var merged = [];
    for (var id in combinedMap) {
      if (combinedMap.hasOwnProperty(id)) {
        merged.push(combinedMap[id]);
        _lastRoomGiftsMapByName[combinedMap[id].name] = combinedMap[id];
      }
    }
    merged.sort((a, b) => b.price - a.price);
    if (typeof callback === "function") callback(merged);
  }

  // 第一流：专属礼物（优先从主上下文内存读取）
  try {
    var winData = (typeof unsafeWindow !== "undefined" && unsafeWindow.$DATA) ? unsafeWindow.$DATA : (typeof window !== "undefined" && window.$DATA ? window.$DATA : null);
    if (winData && winData.room_gift && winData.room_gift.gift) {
      exclusiveGifts = parseRoomGiftMap(winData.room_gift.gift);
      finish();
    } else {
      fetchBetardExclusive();
    }
  } catch(e) {
    fetchBetardExclusive();
  }

  function fetchBetardExclusive() {
    var betardUrl = "https://www.douyu.com/betard/" + numRid;
    var handleBetard = (json) => {
      if (json && json.room_gift && json.room_gift.gift) {
        exclusiveGifts = parseRoomGiftMap(json.room_gift.gift);
      }
      finish();
    };
    if (typeof GM_xmlhttpRequest === "function") {
      GM_xmlhttpRequest({
        method: "GET",
        url: betardUrl,
        responseType: "json",
        headers: { "Referer": "https://www.douyu.com/" + numRid },
        onload: (res) => { handleBetard(res.response || {}); },
        onerror: () => { finish(); }
      });
    } else {
      fetch(betardUrl, { credentials: "include" })
        .then((r) => r.json())
        .then(handleBetard)
        .catch(() => { finish(); });
    }
  }

  // 第二流：官方 RoomApi 通用在播大盘礼物
  var roomApiUrl = "https://open.douyucdn.cn/api/RoomApi/room/" + numRid;
  var handleRoomApi = (json) => {
    if (json && json.data && Array.isArray(json.data.gift)) {
      universalGifts = parseRoomApiUniversalGifts(json.data.gift);
    }
    finish();
  };
  if (typeof GM_xmlhttpRequest === "function") {
    GM_xmlhttpRequest({
      method: "GET",
      url: roomApiUrl,
      responseType: "json",
      onload: (res) => { handleRoomApi(res.response || {}); },
      onerror: () => { finish(); }
    });
  } else {
    fetch(roomApiUrl)
      .then((r) => r.json())
      .then(handleRoomApi)
      .catch(() => { finish(); });
  }
}

function fetchUserBackpackGifts(room_id, callback) {
  var numRid = String(room_id || rid || "");
  var bpUrl = "https://www.douyu.com/japi/prop/backpack/web/v5?rid=" + numRid;

  function parseBackpackList(list) {
    if (!Array.isArray(list)) list = [];
    return list.map((item) => {
      var icon = item.pic || item.icon || item.small_pic || item.himg || "";
      if (icon && !icon.startsWith("http")) {
        icon = "https://gfs-op.douyucdn.cn/dygift/" + icon;
      }
      var itemName = item.name || "";
      if (!icon) {
        for (var key in COMMON_BACKPACK_PROPS) {
          if (itemName.indexOf(key) !== -1) {
            icon = COMMON_BACKPACK_PROPS[key];
            break;
          }
        }
      }
      if (!icon && _lastRoomGiftsMapByName[itemName]) {
        icon = _lastRoomGiftsMapByName[itemName].icon;
      }
      if (!icon) {
        icon = "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif";
      }
      return {
        id: String(item.id),
        name: itemName || "背包道具",
        priceText: "拥有 ×" + String(item.count || 1),
        icon: icon,
        count: Number(item.count || 1)
      };
    });
  }

  function fallbackDomCheck() {
    try {
      var domCards = document.querySelectorAll(".ToolBarBackpack .ToolbarGiftCard, .ToolbarGiftArea-backpack .ToolbarGiftCard, .ToolBarBackpack-giftList .ToolbarGiftCard");
      if (domCards && domCards.length > 0) {
        var domList = [];
        for (var i = 0; i < domCards.length; i++) {
          var card = domCards[i];
          var img = card.querySelector(".ToolbarGiftCard-img, img");
          var nameEl = card.querySelector(".ToolbarGiftCard-name");
          var priceEl = card.querySelector(".ToolbarGiftCard-price");
          var name = nameEl ? nameEl.textContent.trim() : (card.getAttribute("title") || "");
          var iconSrc = img ? (img.src || img.getAttribute("data-src") || "") : "";
          if (!iconSrc && name) {
            for (var k in COMMON_BACKPACK_PROPS) {
              if (name.indexOf(k) !== -1) {
                iconSrc = COMMON_BACKPACK_PROPS[k];
                break;
              }
            }
          }
          var count = priceEl ? parseInt(priceEl.textContent.replace(/[^0-9]/g, "")) || 1 : 1;
          var propId = card.getAttribute("data-id") || card.getAttribute("data-prop-id") || String(20000 + i);
          if (name) {
            domList.push({
              id: String(propId),
              name: name,
              priceText: "拥有 ×" + String(count),
              icon: iconSrc || "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
              count: count
            });
          }
        }
        if (domList.length > 0) {
          return callback(domList);
        }
      }
    } catch(e) {}
    callback([]);
  }

  if (typeof GM_xmlhttpRequest === "function") {
    GM_xmlhttpRequest({
      method: "GET",
      url: bpUrl,
      responseType: "json",
      headers: { "Referer": "https://www.douyu.com/" + numRid },
      onload: (res) => {
        var json = res.response || {};
        var rawList = (json.data && Array.isArray(json.data.list)) ? json.data.list : (Array.isArray(json.data) ? json.data : []);
        if (rawList.length > 0) {
          return callback(parseBackpackList(rawList));
        }
        fallbackDomCheck();
      },
      onerror: () => {
        fallbackDomCheck();
      }
    });
  } else {
    fetch(bpUrl, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        var rawList = (json.data && Array.isArray(json.data.list)) ? json.data.list : (Array.isArray(json.data) ? json.data : []);
        if (rawList.length > 0) {
          return callback(parseBackpackList(rawList));
        }
        fallbackDomCheck();
      })
      .catch(() => {
        fallbackDomCheck();
      });
  }
}

function openGiftPicker(type, onSelect) {
  var oldModal = document.querySelector(".ex-gift-picker-modal");
  if (oldModal) oldModal.remove();
  var oldMask = document.querySelector(".ex-gift-picker-mask");
  if (oldMask) oldMask.remove();

  var mask = document.createElement("div");
  mask.className = "ex-gift-picker-mask";
  document.body.appendChild(mask);

  var modal = document.createElement("div");
  modal.className = "ex-gift-picker-modal miuix-modal-in";
  modal.innerHTML = `
    <div class="ex-gift-picker__header">
      <div class="ex-gift-picker__tabs">
        <button type="button" class="ex-gift-picker__tab" id="tab-room-gifts">全部礼物</button>
        <button type="button" class="ex-gift-picker__tab" id="tab-bag-gifts">背包礼物</button>
      </div>
      <input type="text" class="ex-gift-picker__search" id="ex-gift-picker-search" placeholder="搜索礼物名称..." />
      <button type="button" class="ex-gift-picker__close" title="关闭">×</button>
    </div>
    <div class="ex-gift-picker__body">
      <div class="ex-gift-grid" id="ex-gift-grid">
        <div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px 0; font-size: 13px;">正在加载礼物池...</div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  var grid = modal.querySelector("#ex-gift-grid");
  var tabRoom = modal.querySelector("#tab-room-gifts");
  var tabBag = modal.querySelector("#tab-bag-gifts");
  var searchInput = modal.querySelector("#ex-gift-picker-search");
  var closeBtn = modal.querySelector(".ex-gift-picker__close");

  var currentPool = [];

  function closeModal() {
    document.removeEventListener("keydown", onKeyDown);
    modal.classList.remove("miuix-modal-in");
    modal.classList.add("miuix-modal-out");
    mask.style.opacity = "0";
    setTimeout(() => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      if (mask.parentNode) mask.parentNode.removeChild(mask);
    }, 160);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      closeModal();
    }
  }
  document.addEventListener("keydown", onKeyDown);

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeModal();
  });
  mask.addEventListener("click", (e) => {
    e.stopPropagation();
    closeModal();
  });

  function renderGifts(gifts) {
    if (!grid) return;
    grid.innerHTML = "";
    if (!gifts || gifts.length === 0) {
      var emptyText = (tabBag && tabBag.classList.contains("is-active")) ? "当前背包暂无道具（可前往直播间完成任务领取）" : "暂无匹配礼物";
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px 0; font-size: 13px;">${emptyText}</div>`;
      return;
    }
    var frag = document.createDocumentFragment();
    gifts.forEach((g) => {
      var cell = document.createElement("div");
      cell.className = "ex-gift-cell";
      cell.setAttribute("data-gid", g.id);
      cell.title = (g.name || "") + " (" + (g.priceText || "") + ")";
      cell.innerHTML = `
        <img class="ex-gift-cell__img" src="${g.icon || ''}" loading="lazy" onerror="this.style.opacity='0.2'" />
        <div class="ex-gift-cell__name">${g.name || '未知礼物'}</div>
        <div class="ex-gift-cell__price">${g.priceText || ''}</div>
      `;
      cell.addEventListener("click", (e) => {
        e.stopPropagation();
        closeModal();
        if (typeof onSelect === "function") {
          onSelect(g);
        }
      });
      frag.appendChild(cell);
    });
    grid.appendChild(frag);
  }

  function filterAndRender() {
    var kw = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : "";
    if (!kw) {
      renderGifts(currentPool);
    } else {
      var filtered = currentPool.filter((g) => {
        return (g.name && g.name.toLowerCase().indexOf(kw) !== -1) ||
               (g.id && String(g.id).indexOf(kw) !== -1);
      });
      renderGifts(filtered);
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", filterAndRender);
  }

  function loadRoomGifts() {
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px 0; font-size: 13px;">正在加载房间官方礼物...</div>';
    if (searchInput) searchInput.value = "";
    fetchCurrentRoomGifts(rid, (gifts) => {
      currentPool = gifts || [];
      filterAndRender();
    });
  }

  function loadBackpackGifts() {
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px 0; font-size: 13px;">正在加载背包资产礼物...</div>';
    if (searchInput) searchInput.value = "";
    fetchUserBackpackGifts(rid, (gifts) => {
      currentPool = gifts || [];
      filterAndRender();
    });
  }

  tabRoom.addEventListener("click", (e) => {
    e.stopPropagation();
    if (tabRoom.classList.contains("is-active")) return;
    tabRoom.classList.add("is-active");
    tabBag.classList.remove("is-active");
    loadRoomGifts();
  });

  tabBag.addEventListener("click", (e) => {
    e.stopPropagation();
    if (tabBag.classList.contains("is-active")) return;
    tabBag.classList.add("is-active");
    tabRoom.classList.remove("is-active");
    loadBackpackGifts();
  });

  if (type === "backpack") {
    tabBag.classList.add("is-active");
    tabRoom.classList.remove("is-active");
    loadBackpackGifts();
  } else {
    tabRoom.classList.add("is-active");
    tabBag.classList.remove("is-active");
    loadRoomGifts();
  }
}

window.openGiftPicker = openGiftPicker;
