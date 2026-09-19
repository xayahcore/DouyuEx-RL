function* (__imports) {
yield {"openGiftPicker": { get: () => openGiftPicker, set: value => { openGiftPicker = value; } }};
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
    (0, __imports.setTimeout)(function () {
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

  closeBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    closeModal();
  });
  mask.addEventListener("click", function (e) {
    e.stopPropagation();
    closeModal();
  });

  function renderGifts(gifts) {
    if (!grid) return;
    grid.innerHTML = "";
    if (!gifts || gifts.length === 0) {
      var emptyText =
        tabBag && tabBag.classList.contains("is-active")
          ? "当前背包暂无道具（可前往直播间完成任务领取）"
          : "暂无匹配礼物";
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px 0; font-size: 13px;">${emptyText}</div>`;
      return;
    }
    var frag = document.createDocumentFragment();
    gifts.forEach(function (g) {
      var cell = document.createElement("div");
      cell.className = "ex-gift-cell";
      cell.setAttribute("data-gid", g.id);
      cell.title = (g.name || "") + " (" + (g.priceText || "") + ")";
      cell.innerHTML = `
                <img class="ex-gift-cell__img" src="${g.icon || ""}" loading="lazy" onerror="this.style.opacity='0.2'" />
                <div class="ex-gift-cell__name">${g.name || "未知礼物"}</div>
                <div class="ex-gift-cell__price">${g.priceText || ""}</div>
            `;
      cell.addEventListener("click", function (e) {
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
    var kw =
      searchInput && searchInput.value
        ? searchInput.value.trim().toLowerCase()
        : "";
    if (!kw) {
      renderGifts(currentPool);
    } else {
      var filtered = currentPool.filter(function (g) {
        return (
          (g.name && g.name.toLowerCase().indexOf(kw) !== -1) ||
          (g.id && String(g.id).indexOf(kw) !== -1)
        );
      });
      renderGifts(filtered);
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", filterAndRender);
  }

  function loadRoomGifts() {
    if (!grid) return;
    grid.innerHTML =
      '<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px 0; font-size: 13px;">正在加载房间官方礼物...</div>';
    if (searchInput) searchInput.value = "";
    (0, __imports.fetchCurrentRoomGifts)(__imports.B, function (gifts) {
      currentPool = gifts || [];
      filterAndRender();
    });
  }

  function loadBackpackGifts() {
    if (!grid) return;
    grid.innerHTML =
      '<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px 0; font-size: 13px;">正在加载背包资产礼物...</div>';
    if (searchInput) searchInput.value = "";
    (0, __imports.fetchUserBackpackGifts)(__imports.B, function (gifts) {
      currentPool = gifts || [];
      filterAndRender();
    });
  }

  tabRoom.addEventListener("click", function (e) {
    e.stopPropagation();
    if (tabRoom.classList.contains("is-active")) return;
    tabRoom.classList.add("is-active");
    tabBag.classList.remove("is-active");
    loadRoomGifts();
  });

  tabBag.addEventListener("click", function (e) {
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

}
