/* ==========================================================================
   after.js —— 提案里唯一需要 JS 的片段（其余全部在 after.css 内）
   只作用于 .pane--after 这一列，src/** 一行未动。
   --------------------------------------------------------------------------
   解决的现状问题（ExPanel.css / ExPanel.js 侧）：
     1) 三级面板的关闭出口只有两个：头部的 ×、以及「点菜单外面」。
        全项目没有任何 Escape 绑定（grep keydown/Escape 在 ExPanel.js 里 0 处），
        键盘用户打开面板后必须去摸鼠标才能退出。
     2) 关闭按钮只有 title="关闭面板" / aria-label="关闭"，没有把 Esc 这件事告诉辅助技术。
     3) 预览台是静态页，面板本来不会关；这里补最小行为，好让人当场验证 1、2 是通的。
   ========================================================================== */

export function initAfterProposal() {
  const panes = document.querySelectorAll(".pane--after");
  if (!panes.length) return 0;

  const closeButtons = document.querySelectorAll(".pane--after .miuix-modal__close");
  for (const button of closeButtons) {
    button.setAttribute("aria-keyshortcuts", "Escape");
    button.setAttribute("title", "关闭面板（Esc）");
    button.addEventListener("click", () => closePanel(button.closest(".miuix-modal")));
  }

  /* ESC：一次收掉所有开着的三级面板（真机上应同时调 updateDockActiveIndicator） */
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    let closed = 0;
    for (const panel of document.querySelectorAll(".pane--after .miuix-modal")) {
      if (panel.style.display === "none") continue;
      closePanel(panel);
      closed++;
    }
    if (!closed) return;
    document.body.dataset.escClosed = String(closed);
    event.preventDefault();
  }, true);

  return closeButtons.length;
}

function closePanel(panel) {
  if (!panel || !panel.style) return false;
  panel.style.setProperty("display", "none", "important");
  panel.classList.remove("miuix-modal-in");
  return true;
}