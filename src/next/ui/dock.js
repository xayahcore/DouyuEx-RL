function* (__imports) {
yield {"handleDockAction": { get: () => handleDockAction, set: value => { handleDockAction = value; } },
"initDockFull": { get: () => initDockFull, set: value => { initDockFull = value; } },
"triggerFansContinue": { get: () => triggerFansContinue, set: value => { triggerFansContinue = value; } }};
/**
 * DouyuEx-RL Level 2 Dock 控制器 (76px 晶透微胶囊与 9 大按钮交互装配系统)
 */

/**
 * 处理 Dock 按钮悬停事件
 * @param {string} cls - 按钮类名
 * @param {HTMLElement} btnEl - 按钮 DOM 节点
 */
function handleDockHover(cls, btnEl) {
  (0, __imports.clearSubPanelTimer)();
  return __imports.nextFeatures.invoke(cls, 'open', true, btnEl);
}

/**
 * 处理 Dock 按钮点击事件 (互斥呼出/关闭对应三级控制台)
 * @param {string} cls - 按钮类名
 * @param {HTMLElement} [btnEl] - 按钮 DOM 节点
 */
function handleDockAction(cls, btnEl) {
  (0, __imports.clearSubPanelTimer)();
  const targetBtn = btnEl || document.querySelector(`.${cls}`);
  return __imports.nextFeatures.invoke(cls, 'open', false, targetBtn);
}

/**
 * 外部快捷触发一键续牌
 */
function triggerFansContinue() {
  return handleDockAction('fans-continue');
}

/**
 * 初始化并装配完整 Level 2 Dock 栏
 * @param {HTMLElement} wrap - Dock 外层容器 (.ex-panel__wrap)
 */
function initDockFull(wrap) {
  if (!wrap || __imports.nextDockOwners.has(wrap)) return;

  // SPA 换房重新挂载时，销毁已断开连接的旧 Dock 节点监听与补丁
  for (const [node, owner] of __imports.nextDockOwners) {
    if (!node.isConnected) {
      owner.dispose();
    }
  }

  const owner = (0, __imports.createNextDockOwner)(wrap);

  try {
    // 1. 初始化预备子控制台
    (0, __imports.createFansContinuePanel)();
    (0, __imports.createSignPanel)();
    (0, __imports.createPopupPlayerPanel)();
    (0, __imports.createExUpdatePanel)();

    // 2. 绑定连桥防抖
    owner.listen(wrap, 'mouseenter', __imports.clearSubPanelTimer);
    owner.listen(wrap, 'mouseleave', __imports.scheduleSubPanelClose);

    // 3. 装配 9 大固定顺序按钮单元 (56×56px 晶透微胶囊)
    for (const def of __imports.DOCK_DEFS) {
      let el = wrap.querySelector(`.${def.cls}`);
      if (!el) {
        el = document.createElement('div');
        el.className = def.cls;
        el.innerHTML = def.inner.replace("'+P+'", __imports.P);
        wrap.appendChild(el);
      }

      // 挂载 24×4px 生机蓝磁吸指示器
      if (!el.querySelector('.ex-panel__indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'ex-panel__indicator';
        el.appendChild(indicator);
      }

      el.style.cursor = 'pointer';
      owner.property(el, 'onmouseenter', () => handleDockHover(def.cls, el));
      owner.property(el, 'onmouseleave', __imports.scheduleSubPanelClose);

      const onClickHandler = (event) => {
        event.stopPropagation();
        handleDockAction(def.cls, el);
      };
      owner.property(el, 'onclick', onClickHandler);

      const linkEl = el.querySelector('a');
      if (linkEl) {
        owner.property(linkEl, 'onclick', onClickHandler);
      }
    }

    // 4. 接管 insertBefore 防范老代码重复插入 Dock 单元
    const originalInsertBefore = wrap.insertBefore;
    owner.property(wrap, 'insertBefore', function (node, reference) {
      const def = __imports.DOCK_DEFS.find(item => node?.classList?.contains(item.cls));
      const existing = def && wrap.querySelector(`.${def.cls}`);
      return existing || originalInsertBefore.call(wrap, node, reference);
    });

    // 5. 触发版本更新检查
    if (typeof __imports.initVersionLifecycleNotice === 'function') {
      (0, __imports.initVersionLifecycleNotice)();
    }
  } catch (err) {
    owner.dispose();
    throw err;
  }
}

}
