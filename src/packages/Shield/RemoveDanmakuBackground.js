let isRemoveDanmakuBackground = getLocalIsRemoveDanmakuBackground();
try {
  if (isRemoveDanmakuBackground) removeDanmakuBackground();
} catch (e) {
  ExGuard_warn("屏蔽弹幕背景", "启动时应用样式失败，稍后随面板重绘再试", e);
}

function getLocalIsRemoveDanmakuBackground() {
  const ret = localStorage.getItem("ExSave_isRemoveDanmakuBackground");
  return ret ? Number(ret) === 1 : false;
}

function saveRemoveDanmakuBackground() {
  localStorage.setItem("ExSave_isRemoveDanmakuBackground", isRemoveDanmakuBackground ? 1 : 0);
}

function removeDanmakuBackground() {
  StyleHook_set(
    "Ex_Style_RemoveDanmakuBackground",
    `
      .danmuItem-a8616a {
        background: none !important;
      }
      .danmuItem-a8616a div{
        background: none;
      }
      .danmuItem-a8616a > img {
        display: none;
      }
      .danmuItem-a8616a div > img {
        display: none;
      }
      .super-text-f60bfa {
        background: none !important;
      }
      .danmuItem-a8616a .noble-d35c82 {
        background: none !important;
      }
      .customBarrage {
        background: none !important;
        text-shadow: none !important;
      }
      .customBarrage > div {
        background: none !important;
      }
      .PlayerCustomBarrage-prefixPlugin--text {
        display: none !important;
      }
  `
  );
}
