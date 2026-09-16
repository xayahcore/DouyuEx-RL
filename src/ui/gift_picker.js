// src/ui/gift_picker.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.giftPicker', ['ui.tokens', 'ui.icons', 'api.client', 'ui.miuix'], function (tokens, icons, client, miuix) {
    tokens.injectTokens();

    var activePicker = null;

    function openGiftPicker(options) {
      var opts = options || {};
      var initialTab = opts.initialTab || 'room'; // 'room' or 'backpack'
      var rid = String(opts.rid || '9999');
      var onSelect = opts.onSelect || function () {};

      if (activePicker) {
        activePicker.close();
      }

      var overlay = document.createElement('div');
      overlay.className = 'miuix-dialog-overlay';

      var modal = document.createElement('div');
      modal.className = 'miuix-panel';
      modal.style.width = '540px';
      modal.style.height = '410px';
      modal.style.position = 'relative';
      modal.style.opacity = '1';
      modal.style.pointerEvents = 'auto';
      modal.style.transform = 'none';

      // Header
      var header = document.createElement('div');
      header.className = 'miuix-panel__header';

      var titleWrap = document.createElement('div');
      titleWrap.className = 'miuix-panel__title-wrap';

      var title = document.createElement('span');
      title.className = 'miuix-panel__title';
      title.textContent = '礼物选择器';
      titleWrap.appendChild(title);
      header.appendChild(titleWrap);

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'miuix-panel__close';
      closeBtn.innerHTML = '×';
      closeBtn.title = '关闭 (Esc)';
      header.appendChild(closeBtn);
      modal.appendChild(header);

      // Body container
      var body = document.createElement('div');
      body.className = 'miuix-panel__body';
      body.style.padding = '10px 14px';

      // Tab Bar & Search
      var toolbar = document.createElement('div');
      toolbar.style.display = 'flex';
      toolbar.style.alignItems = 'center';
      toolbar.style.justifyContent = 'space-between';
      toolbar.style.gap = '10px';

      var tabsWrap = document.createElement('div');
      tabsWrap.style.display = 'flex';
      tabsWrap.style.gap = '6px';

      var tabRoom = document.createElement('button');
      tabRoom.type = 'button';
      tabRoom.className = 'miuix-btn miuix-btn-primary';
      tabRoom.textContent = '在播礼物';

      var tabBackpack = document.createElement('button');
      tabBackpack.type = 'button';
      tabBackpack.className = 'miuix-btn miuix-btn-secondary';
      tabBackpack.textContent = '背包道具';

      tabsWrap.appendChild(tabRoom);
      tabsWrap.appendChild(tabBackpack);
      toolbar.appendChild(tabsWrap);

      // Search Box
      var searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'miuix-input';
      searchInput.placeholder = '搜索礼物名称...';
      searchInput.style.width = '140px';
      toolbar.appendChild(searchInput);

      body.appendChild(toolbar);

      // Gift Grid Stream
      var grid = document.createElement('div');
      grid.className = 'miuix-scrollable';
      grid.style.flex = '1 1 auto';
      grid.style.overflowY = 'auto';
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(80px, 1fr))';
      grid.style.gap = '8px';
      grid.style.marginTop = '10px';
      body.appendChild(grid);

      modal.appendChild(body);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      var currentTab = initialTab;
      var roomGiftsCache = [];
      var backpackGiftsCache = [];

      function updateTabs() {
        if (currentTab === 'room') {
          tabRoom.className = 'miuix-btn miuix-btn-primary';
          tabBackpack.className = 'miuix-btn miuix-btn-secondary';
        } else {
          tabRoom.className = 'miuix-btn miuix-btn-secondary';
          tabBackpack.className = 'miuix-btn miuix-btn-primary';
        }
        renderGifts();
      }

      tabRoom.addEventListener('click', function () {
        currentTab = 'room';
        updateTabs();
      });

      tabBackpack.addEventListener('click', function () {
        currentTab = 'backpack';
        updateTabs();
      });

      searchInput.addEventListener('input', function () {
        renderGifts();
      });

      function renderGifts() {
        grid.innerHTML = '';
        var list = currentTab === 'room' ? roomGiftsCache : backpackGiftsCache;
        var q = searchInput.value.trim().toLowerCase();

        var filtered = list.filter(function (g) {
          if (!q) return true;
          return (g.name && g.name.toLowerCase().includes(q)) || String(g.id).includes(q);
        });

        if (filtered.length === 0) {
          var empty = document.createElement('div');
          empty.style.gridColumn = '1 / -1';
          empty.style.textAlign = 'center';
          empty.style.padding = '40px 0';
          empty.style.color = '#94a3b8';
          empty.style.fontSize = '12px';
          empty.textContent = currentTab === 'room' ? '未找到匹配在播礼物' : '背包暂无对应道具';
          grid.appendChild(empty);
          return;
        }

        filtered.forEach(function (g) {
          var item = document.createElement('div');
          item.className = 'miuix-card';
          item.style.alignItems = 'center';
          item.style.padding = '6px';
          item.style.cursor = 'pointer';
          item.title = g.name + (g.priceText ? ' (' + g.priceText + ')' : '');

          var img = document.createElement('img');
          img.src = g.icon || '';
          img.style.width = '36px';
          img.style.height = '36px';
          img.style.objectFit = 'contain';
          item.appendChild(img);

          var name = document.createElement('span');
          name.style.fontSize = '10.5px';
          name.style.fontWeight = '600';
          name.style.marginTop = '4px';
          name.style.textAlign = 'center';
          name.style.overflow = 'hidden';
          name.style.textOverflow = 'ellipsis';
          name.style.whiteSpace = 'nowrap';
          name.style.width = '100%';
          name.textContent = g.name;
          item.appendChild(name);

          if (g.countText || g.priceText) {
            var sub = document.createElement('span');
            sub.style.fontSize = '9.5px';
            sub.style.color = '#64748b';
            sub.textContent = g.countText || g.priceText;
            item.appendChild(sub);
          }

          item.addEventListener('click', function () {
            onSelect(g);
            close();
          });

          grid.appendChild(item);
        });
      }

      async function loadData() {
        // Load Room Gifts
        try {
          var res = await client.get('room.roomApi', { rid: rid });
          if (res && res.data && res.data.data && Array.isArray(res.data.data.gift)) {
            roomGiftsCache = res.data.data.gift.map(function (item) {
              return {
                id: item.id,
                name: item.name,
                price: Number(item.pc || 0),
                priceText: item.pc ? item.pc + ' 鱼翅' : '免费',
                icon: item.pic || ''
              };
            });
          }
        } catch (e) {}

        // Load Backpack
        try {
          var bpRes = await client.get('backpack.list', { rid: rid });
          if (bpRes && bpRes.data && bpRes.data.data && Array.isArray(bpRes.data.data.list)) {
            backpackGiftsCache = bpRes.data.data.list.map(function (item) {
              return {
                id: item.id,
                name: item.name,
                count: Number(item.count || 0),
                countText: '数量: ' + item.count,
                icon: item.icon || ''
              };
            });
          }
        } catch (e) {}

        renderGifts();
      }

      function handleKeyDown(e) {
        if (e.key === 'Escape') {
          close();
        }
      }
      window.addEventListener('keydown', handleKeyDown, true);

      function close() {
        window.removeEventListener('keydown', handleKeyDown, true);
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        if (activePicker === instance) {
          activePicker = null;
        }
      }

      closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) close();
      });

      var instance = {
        element: overlay,
        close: close
      };
      activePicker = instance;

      updateTabs();
      loadData();

      return instance;
    }

    return {
      openGiftPicker: openGiftPicker
    };
  });
})();
