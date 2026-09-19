function* (__imports) {
yield {"ensureMiuixPanelHeader": { get: () => ensureMiuixPanelHeader, set: value => { ensureMiuixPanelHeader = value; } }};
/**
 * DouyuEx-RL 3级控制台吸顶 Header 规范与 Flex 结构塑形
 * 严格对齐: Flex 上下硬解构除缝、Hover Bridge 隐形连桥与右上角关闭动作
 */
function ensureMiuixPanelHeader(el, title) {
  if (!el) return;
  el.classList.add("miuix-modal");

  // 隐藏可能存在的原生粗糙关闭按钮与旧标题栏/功能栏
  const oldCloses = el.querySelectorAll(
    ".extool__close, .livetool__close, .bloop__close, #vote__result-close, .ChatToolBar-DanmakuTail-title, .lottery__func"
  );
  oldCloses.forEach((c) => {
    c.style.setProperty("display", "none", "important");
  });

  // 1. 确保标准吸顶 Header
  let header = el.querySelector(".miuix-modal__header");
  if (!header) {
    header = document.createElement("div");
    header.className = "miuix-modal__header";
    header.innerHTML = `
      <div class="miuix-modal__title-box">
        <span class="miuix-modal__title">${title}</span>
      </div>
      <button type="button" class="miuix-modal__close" title="关闭面板" aria-label="关闭">×</button>
    `;
    el.insertBefore(header, el.firstChild);
  } else {
    const titleEl = header.querySelector(".miuix-modal__title");
    if (titleEl) titleEl.textContent = title;
    const badge = header.querySelector(".miuix-modal__badge");
    if (badge) badge.remove();
  }

  // 2. 绑定关闭按钮动作 (关闭面板并重置 Dock 指示灯)
  const closeBtn = header.querySelector(".miuix-modal__close");
  if (closeBtn) {
    closeBtn.innerHTML = "×";
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      el.style.removeProperty("display");
      el.style.setProperty("display", "none", "important");
      if (typeof __imports.updateDockActiveIndicator === "function") {
        (0, __imports.updateDockActiveIndicator)();
      }
    };
  }

  // 3. 滚动条起始点统一规约在 Header 正下方：所有非 Header 节点封装进 .miuix-modal__body
  let body = el.querySelector(":scope > .miuix-modal__body");
  if (!body) {
    body = document.createElement("div");
    body.className = "miuix-modal__body";
    el.appendChild(body);
  }

  const nodesToMove = [];
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node !== header && node !== body) {
      nodesToMove.push(node);
    }
  }
  nodesToMove.forEach(n => body.appendChild(n));

  // 4. 悬浮连桥双向保护
  if (!el.dataset.hoverBridgeBound) {
    el.dataset.hoverBridgeBound = "1";
    el.addEventListener("mouseenter", () => {
      if (typeof __imports.clearSubPanelTimer === "function") {
        (0, __imports.clearSubPanelTimer)();
      }
    });
    el.addEventListener("mouseleave", () => {
      if (typeof __imports.scheduleSubPanelClose === "function") {
        (0, __imports.scheduleSubPanelClose)();
      }
    });
  }
}

window.ensureMiuixPanelHeader = ensureMiuixPanelHeader;

}
