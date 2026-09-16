// src/ui/modals/media_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.mediaPanel', [
    'ui.miuix',
    'modules.media.filters',
    'modules.media.pip',
    'modules.media.capture'
  ], function (miuix, filters, pip, capture) {

    function createMediaPanel() {
      var panel = miuix.Panel({
        id: 'media-panel',
        title: '画质与播控中心',
        subtitle: '滤镜调色、画中画与音视频创作'
      });

      // 1. 快捷播控工具行 (Card 1)
      var actionCard = document.createElement('div');
      actionCard.className = 'miuix-card';
      actionCard.innerHTML = `
        <div class="miuix-card__header">
          <span class="miuix-card__title">播放控制</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" id="media-btn-pip" class="miuix-btn" style="flex: 1;">画中画小窗</button>
          <button type="button" id="media-btn-shot" class="miuix-btn" style="flex: 1;">高清截图</button>
          <button type="button" id="media-btn-record" class="miuix-btn" style="flex: 1;">视频录制</button>
        </div>
      `;
      panel.body.appendChild(actionCard);

      actionCard.querySelector('#media-btn-pip')?.addEventListener('click', () => pip.toggleNativePip());
      actionCard.querySelector('#media-btn-shot')?.addEventListener('click', () => capture.takeScreenshot());
      actionCard.querySelector('#media-btn-record')?.addEventListener('click', () => capture.toggleRecording());

      // 2. 色彩滤镜抽屉 (L3-11)
      var filterAccordion = miuix.Accordion({
        id: 'filter__panel',
        title: '色彩滤镜抽屉',
        actions: [
          { label: '重置', onClick: () => filters.resetFilters() }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.style.display = 'flex';
            box.style.flexDirection = 'column';
            box.style.gap = '8px';

            var SLIDERS = [
              { key: 'brightness', label: '亮度', min: 50, max: 200, def: 100 },
              { key: 'contrast', label: '对比度', min: 50, max: 200, def: 100 },
              { key: 'saturate', label: '饱和度', min: 0, max: 250, def: 100 },
              { key: 'hueRotate', label: '色相', min: 0, max: 360, def: 0 }
            ];

            SLIDERS.forEach(s => {
              var row = document.createElement('div');
              row.style.display = 'flex';
              row.style.alignItems = 'center';
              row.style.gap = '8px';
              row.innerHTML = `
                <span style="font-size: 11px; width: 45px; color: #475569;">${s.label}</span>
                <input type="range" class="miuix-slider" min="${s.min}" max="${s.max}" value="${s.def}" style="flex: 1;" />
                <span class="val-txt" style="font-size: 10px; width: 30px; text-align: right; color: #94a3b8;">${s.def}</span>
              `;
              var slider = row.querySelector('input');
              var txt = row.querySelector('.val-txt');
              slider.addEventListener('input', () => {
                txt.textContent = slider.value;
                filters.setFilter(s.key, Number(slider.value));
              });
              box.appendChild(row);
            });

            return box;
          })()
        ]
      });
      panel.body.appendChild(filterAccordion.element);

      // 3. 画质微光调节 (L3-12)
      var glowAccordion = miuix.Accordion({
        id: 'glow__panel',
        title: '画质微光弹窗',
        content: [
          (function () {
            var box = document.createElement('div');
            box.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 11px; width: 45px; color: #475569;">微光模糊</span>
                <input type="range" min="0" max="10" value="0" style="flex: 1;" />
                <span style="font-size: 10px; color: #94a3b8;">0px</span>
              </div>
            `;
            var slider = box.querySelector('input');
            slider.addEventListener('input', () => filters.setFilter('blur', Number(slider.value)));
            return box;
          })()
        ]
      });
      panel.body.appendChild(glowAccordion.element);

      return panel;
    }

    return {
      createMediaPanel: createMediaPanel
    };
  });
})();
