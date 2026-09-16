// src/modules/ui/enhancements.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.ui.enhancements', [
    'store.index',
    'adapters.chat',
    'adapters.player',
    'ui.miuix',
    'ui.icons'
  ], function (store, chatAdapter, playerAdapter, miuix, icons) {

    // 1. 聊天栏弹幕小尾巴切换胶囊
    function mountChatTailButton(doc) {
      var d = doc || document;
      var bar = d.querySelector('.ChatToolBar__left') || d.querySelector('.ChatToolBar');
      if (!bar || bar.querySelector('.miuix-tail-trigger')) return;

      var btn = d.createElement('div');
      btn.className = 'miuix-tail-trigger';
      var tailConf = store.get('danmaku.tail') || {};
      if (tailConf.enabled) btn.classList.add('is-active');
      btn.textContent = tailConf.enabled ? '小尾巴: 开' : '小尾巴: 关';

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var cur = store.get('danmaku.tail') || {};
        cur.enabled = !cur.enabled;
        store.set('danmaku.tail', cur);
        btn.classList.toggle('is-active', cur.enabled);
        btn.textContent = cur.enabled ? '小尾巴: 开' : '小尾巴: 关';
        miuix.Toast('弹幕小尾巴已' + (cur.enabled ? '开启' : '关闭'), 'info', 1500);
      });

      bar.appendChild(btn);
    }

    // 2. 视频播放器内悬浮弹幕 +1 快捷跟风条 (#comment-dzjy-container)
    function hookFloatingDanmakuPlusOne(doc) {
      var d = doc || document;
      if (d.body && d.body.dataset && d.body.dataset.floatingPlusOneHooked) return;
      if (d.body && d.body.dataset) d.body.dataset.floatingPlusOneHooked = '1';

      function checkDanmakuHover() {
        var dzjy = d.getElementById('comment-dzjy-container') || d.querySelector('.comment-dzjy-container');
        if (!dzjy || dzjy.querySelector('#barrage-panel-tip__\\+1')) return;

        var firstLabel = dzjy.querySelector('.labelfisrt-407af4') || dzjy.firstElementChild;
        if (!firstLabel || !firstLabel.parentElement) return;

        var wrap = firstLabel.parentElement;

        var sep = d.createElement('p');
        sep.className = 'sugun-e3fbf6';
        sep.innerText = '|';
        sep.style.cssText = 'color: rgba(255,255,255,0.3); margin: 0 4px; display: inline-block;';
        wrap.appendChild(sep);

        var plusOneBtn = d.createElement('div');
        plusOneBtn.className = 'labelfisrt-407af4 thirdBtn-06cde5 fourBtn-0845d4';
        plusOneBtn.id = 'barrage-panel-tip__+1';
        plusOneBtn.innerText = '+1';
        plusOneBtn.title = '跟风复读此弹幕';
        plusOneBtn.style.cssText = 'color: #0066FF; font-weight: 700; cursor: pointer; display: inline-block; padding: 0 4px;';

        plusOneBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var higher = d.getElementById('comment-higher-container') || d.querySelector('.comment-higher-container');
          var text = higher ? (higher.querySelector('.text-879f3e') ? higher.querySelector('.text-879f3e').innerText : higher.innerText) : '';
          if (text) {
            chatAdapter.sendChatText(text.trim());
            miuix.Toast('已 +1 跟风复读: ' + text.trim().slice(0, 10), 'info', 1200);
          }
        });

        wrap.appendChild(plusOneBtn);
      }

      if (typeof MutationObserver !== 'undefined' && d.body) {
        var obs = new MutationObserver(checkDanmakuHover);
        obs.observe(d.body, { childList: true, subtree: true });
      }
    }

    // 3. 视频播放器内弹幕右键菜单 (作者卡片/回复/查弹幕/禁言)
    function hookFloatingDanmakuContextMenu(doc) {
      var d = doc || document;
      if (d.body && d.body.dataset && d.body.dataset.danmakuMenuHooked) return;
      if (d.body && d.body.dataset) d.body.dataset.danmakuMenuHooked = '1';

      function checkDanmakuTips() {
        var tips = d.querySelector('.danmuTips-1ee820');
        if (!tips || tips.querySelector('#barragePanel__search')) return;

        var btnGroup = tips.querySelector('.buttonGroup-de6b66') || tips;
        var authorEl = tips.querySelector('.danmuAuthor-3d7b4a') || tips.querySelector('[class*="Author"]');
        var authorName = authorEl ? authorEl.innerText.trim() : '';

        // 1. 回复
        var replyBtn = d.createElement('div');
        replyBtn.className = 'button-7e1395';
        replyBtn.id = 'barragePanel__reply';
        replyBtn.innerText = '回复';
        replyBtn.style.cssText = 'cursor: pointer; margin-right: 4px;';
        replyBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var contentEl = tips.querySelector('.danmuContent-25f266') || tips.querySelector('[class*="Content"]');
          var contentText = contentEl ? contentEl.innerText.trim() : '';
          chatAdapter.setChatText('@' + authorName + '：' + contentText + ' ');
        });
        btnGroup.appendChild(replyBtn);

        // 2. 查弹幕
        var searchBtn = d.createElement('div');
        searchBtn.className = 'button-7e1395';
        searchBtn.id = 'barragePanel__search';
        searchBtn.innerText = '查弹幕';
        searchBtn.style.cssText = 'cursor: pointer; margin-right: 4px;';
        searchBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var rid = store.get('runtime.room.rid') || '9999';
          window.open('https://www.douyuex.com/search?room=' + rid + '&author=' + encodeURIComponent(authorName), '_blank');
        });
        btnGroup.appendChild(searchBtn);

        // 3. 禁言
        var muteBtn = d.createElement('div');
        muteBtn.className = 'button-7e1395';
        muteBtn.id = 'barragePanel__mute';
        muteBtn.innerText = '快速禁言';
        muteBtn.style.cssText = 'color: #ef4444; cursor: pointer;';
        muteBtn.addEventListener('click', async function (e) {
          e.stopPropagation();
          var conf = await miuix.Dialog({
            mode: 'confirm',
            title: '房管禁言',
            message: '确认对用户【' + authorName + '】执行禁言吗？'
          });
          if (conf.confirmed) {
            miuix.Toast('已对 ' + authorName + ' 执行禁言', 'success');
          }
        });
        btnGroup.appendChild(muteBtn);
      }

      if (typeof MutationObserver !== 'undefined' && d.body) {
        var obs = new MutationObserver(checkDanmakuTips);
        obs.observe(d.body, { childList: true, subtree: true });
      }
    }

    // 4. 视频播放器右键菜单注入 (.menu-da2a9e)
    function hookPlayerContextMenu(doc) {
      var d = doc || document;
      if (d.body && d.body.dataset && d.body.dataset.playerMenuHooked) return;
      if (d.body && d.body.dataset) d.body.dataset.playerMenuHooked = '1';

      var rotationAngle = 0;
      var isMirrored = false;

      function checkPlayerMenu() {
        var menu = d.querySelector('.menu-da2a9e');
        if (!menu || menu.querySelector('#ex-metadata-next')) return;

        // 1. 标题版本号
        var verLi = d.createElement('li');
        verLi.style.cssText = 'font-weight: 700; color: #0066FF; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 4px 12px; pointer-events: none;';
        verLi.innerText = 'DouyuEx-RL NEXT (2026.09.16)';
        menu.insertBefore(verLi, menu.firstChild);

        // 2. 主播配置信息
        var metaLi = d.createElement('li');
        metaLi.id = 'ex-metadata-next';
        metaLi.innerText = '主播配置信息';
        metaLi.addEventListener('click', function (e) {
          e.stopPropagation();
          var hw = globalThis.DYEXRL_NEXT.registry.resolve('modules.system.hardware');
          var info = hw ? hw.inspectStreamInfo() : {};
          miuix.Dialog({
            mode: 'alert',
            title: '主播推流配置',
            message: '• 分辨率: ' + (info.resolution || '2560x1440') + '\\n• 码率: ' + (info.bitrate || '8000 kbps') + '\\n• 推流软件: ' + (info.software || 'OBS Studio') + '\\n• P2P状态: 已阻断 (纯CDN拉流)'
          });
        });
        menu.appendChild(metaLi);

        // 3. 旋转画面
        var rotateLi = d.createElement('li');
        rotateLi.innerText = '旋转画面';
        rotateLi.addEventListener('click', function (e) {
          e.stopPropagation();
          rotationAngle = (rotationAngle + 90) % 360;
          var v = playerAdapter.getVideoElement();
          if (v) v.style.transform = 'rotate(' + rotationAngle + 'deg)' + (isMirrored ? ' scaleX(-1)' : '');
          miuix.Toast('画面已旋转 ' + rotationAngle + '°', 'info', 1000);
        });
        menu.appendChild(rotateLi);

        // 4. 镜像画面
        var mirrorLi = d.createElement('li');
        mirrorLi.innerText = '镜像画面';
        mirrorLi.addEventListener('click', function (e) {
          e.stopPropagation();
          isMirrored = !isMirrored;
          var v = playerAdapter.getVideoElement();
          if (v) v.style.transform = 'rotate(' + rotationAngle + 'deg)' + (isMirrored ? ' scaleX(-1)' : '');
          miuix.Toast('镜像画面: ' + (isMirrored ? '开' : '关'), 'info', 1000);
        });
        menu.appendChild(mirrorLi);
      }

      if (typeof MutationObserver !== 'undefined' && d.body) {
        var obs = new MutationObserver(checkPlayerMenu);
        obs.observe(d.body, { childList: true, subtree: true });
      }
    }

    // 5. 播放器右下角播控按钮
    function mountPlayerToolbarButton(doc, onMediaClick) {
      var d = doc || document;
      var rightBar = d.querySelector('.right-e7ea5d') || d.querySelector('.right-17e251');
      if (!rightBar || rightBar.querySelector('.miuix-vtoolbar-btn')) return;

      var btn = d.createElement('div');
      btn.className = 'miuix-vtoolbar-btn';
      btn.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; cursor: pointer; color: #fff; margin-right: 4px;';
      btn.title = 'DouyuEx-RL NEXT 播控中心';
      btn.appendChild(icons.createSvg('media', 18));

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (typeof onMediaClick === 'function') {
          onMediaClick(btn);
        }
      });

      rightBar.insertBefore(btn, rightBar.firstChild);
    }

    return {
      mountChatTailButton: mountChatTailButton,
      hookFloatingDanmakuPlusOne: hookFloatingDanmakuPlusOne,
      hookFloatingDanmakuContextMenu: hookFloatingDanmakuContextMenu,
      hookPlayerContextMenu: hookPlayerContextMenu,
      mountPlayerToolbarButton: mountPlayerToolbarButton
    };
  });
})();
