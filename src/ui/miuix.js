// src/ui/miuix.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.miuix', ['ui.tokens', 'ui.icons'], function (tokens, icons) {
    tokens.injectTokens();

    function ensureContainer(id, className) {
      var el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        if (className) el.className = className;
        document.body.appendChild(el);
      }
      return el;
    }

    // 1. MIUIX.Panel: 标准三级模态控制台 (380x370px)
    function createPanel(options) {
      var opts = options || {};
      var id = opts.id || 'miuix-panel-' + Math.random().toString(36).slice(2, 8);
      var width = opts.width || 380;
      var height = opts.height || 370;

      var panel = document.createElement('div');
      panel.id = id;
      panel.className = 'miuix-panel' + (opts.className ? ' ' + opts.className : '');
      panel.style.width = width + 'px';
      panel.style.height = height + 'px';

      // Header
      var header = document.createElement('div');
      header.className = 'miuix-panel__header';

      var titleWrap = document.createElement('div');
      titleWrap.className = 'miuix-panel__title-wrap';

      var title = document.createElement('span');
      title.className = 'miuix-panel__title';
      title.textContent = opts.title || '';
      titleWrap.appendChild(title);

      if (opts.subtitle) {
        var sub = document.createElement('span');
        sub.className = 'miuix-panel__subtitle';
        sub.textContent = opts.subtitle;
        titleWrap.appendChild(sub);
      }
      header.appendChild(titleWrap);

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'miuix-panel__close';
      closeBtn.innerHTML = '×';
      closeBtn.title = '关闭';
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        hide();
        if (typeof opts.onClose === 'function') opts.onClose();
      });
      header.appendChild(closeBtn);
      panel.appendChild(header);

      // Body
      var body = document.createElement('div');
      body.className = 'miuix-panel__body';
      if (Array.isArray(opts.body)) {
        opts.body.forEach(function (child) {
          if (child instanceof Node) body.appendChild(child);
        });
      } else if (opts.body instanceof Node) {
        body.appendChild(opts.body);
      }
      panel.appendChild(body);

      document.body.appendChild(panel);

      function show(anchorEl) {
        if (anchorEl && typeof anchorEl.getBoundingClientRect === 'function') {
          var rect = anchorEl.getBoundingClientRect();
          // Anchor right above the button
          var left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + (rect.width - width) / 2));
          var top = Math.max(8, rect.top - height - 12);
          panel.style.left = left + 'px';
          panel.style.top = top + 'px';
        }
        panel.classList.add('is-active');
      }

      function hide() {
        panel.classList.remove('is-active');
      }

      function toggle(anchorEl) {
        if (panel.classList.contains('is-active')) hide();
        else show(anchorEl);
      }

      function destroy() {
        if (panel.parentNode) panel.parentNode.removeChild(panel);
      }

      return {
        element: panel,
        body: body,
        show: show,
        hide: hide,
        toggle: toggle,
        destroy: destroy
      };
    }

    // 2. MIUIX.Accordion: 手风琴折叠卡片 (用于 livetool 进场/禁言/回复等)
    function createAccordion(options) {
      var opts = options || {};
      var wrap = document.createElement('div');
      wrap.className = 'miuix-accordion' + (opts.className ? ' ' + opts.className : '');
      if (opts.expanded) wrap.classList.add('is-expanded');

      var header = document.createElement('div');
      header.className = 'miuix-accordion__header';

      var titleGroup = document.createElement('div');
      titleGroup.className = 'miuix-accordion__title-group';

      var title = document.createElement('span');
      title.className = 'miuix-accordion__title';
      title.textContent = opts.title || '';
      titleGroup.appendChild(title);
      header.appendChild(titleGroup);

      var actionsWrap = document.createElement('div');
      actionsWrap.className = 'miuix-accordion__actions';

      if (Array.isArray(opts.actions)) {
        opts.actions.forEach(function (act) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'miuix-accordion__btn';
          btn.textContent = act.label || '';
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (typeof act.onClick === 'function') act.onClick();
          });
          actionsWrap.appendChild(btn);
        });
      }
      header.appendChild(actionsWrap);
      wrap.appendChild(header);

      var body = document.createElement('div');
      body.className = 'miuix-accordion__body';
      if (Array.isArray(opts.content)) {
        opts.content.forEach(function (c) {
          if (c instanceof Node) body.appendChild(c);
        });
      } else if (opts.content instanceof Node) {
        body.appendChild(opts.content);
      }
      wrap.appendChild(body);

      header.addEventListener('click', function () {
        wrap.classList.toggle('is-expanded');
      });

      return {
        element: wrap,
        body: body,
        expand: function () { wrap.classList.add('is-expanded'); },
        collapse: function () { wrap.classList.remove('is-expanded'); },
        toggle: function () { wrap.classList.toggle('is-expanded'); }
      };
    }

    // 3. MIUIX.Card: 四级内容卡片
    function createCard(options) {
      var opts = options || {};
      var card = document.createElement('div');
      card.className = 'miuix-card' + (opts.className ? ' ' + opts.className : '');

      if (opts.title || opts.desc) {
        var hdr = document.createElement('div');
        hdr.className = 'miuix-card__header';
        if (opts.title) {
          var t = document.createElement('span');
          t.className = 'miuix-card__title';
          t.textContent = opts.title;
          hdr.appendChild(t);
        }
        if (opts.desc) {
          var d = document.createElement('span');
          d.className = 'miuix-card__desc';
          d.textContent = opts.desc;
          hdr.appendChild(d);
        }
        card.appendChild(hdr);
      }

      if (Array.isArray(opts.items)) {
        opts.items.forEach(function (it) {
          if (it instanceof Node) card.appendChild(it);
        });
      } else if (opts.items instanceof Node) {
        card.appendChild(opts.items);
      }

      return { element: card };
    }

    // 4. MIUIX.Switch: 滑动开关
    function createSwitch(options) {
      var opts = options || {};
      var label = document.createElement('label');
      label.className = 'miuix-switch' + (opts.className ? ' ' + opts.className : '');

      var inp = document.createElement('input');
      inp.type = 'checkbox';
      if (opts.id) inp.id = opts.id;
      if (opts.checked) inp.checked = true;

      var slider = document.createElement('span');
      slider.className = 'miuix-switch__slider';

      label.appendChild(inp);
      label.appendChild(slider);

      if (opts.store && opts.storeKey) {
        opts.store.bindCheckbox(inp, opts.storeKey);
      } else if (typeof opts.onChange === 'function') {
        inp.addEventListener('change', function () {
          opts.onChange(inp.checked);
        });
      }

      return {
        element: label,
        input: inp,
        get checked() { return inp.checked; },
        set checked(v) { inp.checked = !!v; }
      };
    }

    // 5. MIUIX.Toast: 顶部纯文字通知胶囊
    function createToast(message, type, durationMs) {
      var container = ensureContainer('miuix-toast-container', 'miuix-toast-container');
      var toast = document.createElement('div');
      var t = type || 'info';
      toast.className = 'miuix-toast miuix-toast--' + t;
      toast.textContent = message;

      container.appendChild(toast);

      setTimeout(function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, durationMs || 3000);
    }

    // 6. MIUIX.Dialog: 统一拟态对话框 (替换原生 alert/confirm/prompt/postbird)
    function createDialog(options) {
      var opts = options || {};
      return new Promise(function (resolve) {
        var overlay = document.createElement('div');
        overlay.className = 'miuix-dialog-overlay';

        var dlg = document.createElement('div');
        dlg.className = 'miuix-dialog';

        var title = document.createElement('div');
        title.className = 'miuix-dialog__title';
        title.textContent = opts.title || '提示';
        dlg.appendChild(title);

        if (opts.message) {
          var msg = document.createElement('div');
          msg.className = 'miuix-dialog__message';
          msg.textContent = opts.message;
          dlg.appendChild(msg);
        }

        var input = null;
        if (opts.prompt) {
          input = document.createElement('input');
          input.type = 'text';
          input.className = 'miuix-input';
          input.value = opts.initialValue || '';
          dlg.appendChild(input);
        }

        var actions = document.createElement('div');
        actions.className = 'miuix-dialog__actions';

        if (opts.mode !== 'alert') {
          var cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'miuix-btn miuix-btn-secondary';
          cancelBtn.textContent = opts.cancelText || '取消';
          cancelBtn.addEventListener('click', function () {
            cleanup();
            resolve({ confirmed: false, value: null });
          });
          actions.appendChild(cancelBtn);
        }

        var confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.className = 'miuix-btn miuix-btn-primary';
        confirmBtn.textContent = opts.confirmText || '确定';
        confirmBtn.addEventListener('click', function () {
          var val = input ? input.value : true;
          cleanup();
          resolve({ confirmed: true, value: val });
        });
        actions.appendChild(confirmBtn);
        dlg.appendChild(actions);

        overlay.appendChild(dlg);
        document.body.appendChild(overlay);

        if (input) input.focus();

        function cleanup() {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }
      });
    }

    return {
      Panel: createPanel,
      Accordion: createAccordion,
      Card: createCard,
      Switch: createSwitch,
      Toast: createToast,
      Dialog: createDialog
    };
  });
})();
