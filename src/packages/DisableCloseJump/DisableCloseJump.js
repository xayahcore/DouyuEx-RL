function initPkg_DisableCloseJump_Timer() {
  const observer = new MutationObserver(() => {
    const x = document.querySelector(".ClosingRecommend .dy-ModalRadius-close-x");
    if (x) {
      x.click();
    }
  });
  const container = document.querySelector(".layout-Player") || document.body;
  observer.observe(container, { childList: true, subtree: true });
}