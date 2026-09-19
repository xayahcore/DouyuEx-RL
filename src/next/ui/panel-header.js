function* (__imports) {
yield {"ensureMiuixPanelHeader": { get: () => ensureMiuixPanelHeader, set: value => { ensureMiuixPanelHeader = value; } }};
/* ==================== DouyuEx-RL 3级控制台右上角吸顶顶栏 ==================== */
function ensureMiuixPanelHeader(el, title) {
  if (!el) return;
  el.classList.add("miuix-modal");

  // 隐藏可能存在的原生粗糙关闭按钮与旧标题栏/功能栏
  var oldCloses = el.querySelectorAll(
    ".extool__close, .livetool__close, .bloop__close, #vote__result-close, .ChatToolBar-DanmakuTail-title, .lottery__func",
  );
  oldCloses.forEach(function (c) {
    c.style.setProperty("display", "none", "important");
  });

  var header = el.querySelector(".miuix-modal__header");
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
    var titleEl = header.querySelector(".miuix-modal__title");
    if (titleEl) titleEl.textContent = title;
    var badge = header.querySelector(".miuix-modal__badge");
    if (badge) badge.remove();
  }

  // 无论是否新创建，无条件为关闭按钮绑定高优先级关闭事件
  var closeBtn = header.querySelector(".miuix-modal__close");
  if (closeBtn) {
    closeBtn.innerHTML = "×";
    closeBtn.onclick = function (e) {
      e.stopPropagation();
      el.style.removeProperty("display");
      el.style.setProperty("display", "none", "important");
      if (typeof __imports.updateDockActiveIndicator === "function") {
        (0, __imports.updateDockActiveIndicator)();
      }
    };
  }

  // 滚动条起始点统一规定在顶栏下方：将所有非 Header 内容封装进 .miuix-modal__body
  var body = el.querySelector(":scope > .miuix-modal__body");
  if (!body) {
    body = document.createElement("div");
    body.className = "miuix-modal__body";
    el.appendChild(body);
  }
  var nodesToMove = [];
  for (var i = 0; i < el.childNodes.length; i++) {
    var node = el.childNodes[i];
    if (node !== header && node !== body) {
      nodesToMove.push(node);
    }
  }
  nodesToMove.forEach(function (n) {
    body.appendChild(n);
  });

  // 悬浮连桥双向保护
  if (!el.dataset.hoverBridgeBound) {
    el.dataset.hoverBridgeBound = "1";
    el.addEventListener("mouseenter", function () {
      if (typeof __imports.clearSubPanelTimer === "function") (0, __imports.clearSubPanelTimer)();
    });
    el.addEventListener("mouseleave", function () {
      if (typeof __imports.scheduleSubPanelClose === "function") (0, __imports.scheduleSubPanelClose)();
    });
  }
}
window.ensureMiuixPanelHeader = ensureMiuixPanelHeader;

}
