function* (__imports) {
yield {"$o": { get: () => $o, set: value => { $o = value; } },
"Jo": { get: () => Jo, set: value => { Jo = value; } },
"Ko": { get: () => Ko, set: value => { Ko = value; } },
"Qo": { get: () => Qo, set: value => { Qo = value; } },
"Xo": { get: () => Xo, set: value => { Xo = value; } },
"Zo": { get: () => Zo, set: value => { Zo = value; } }};
/**
 * 夜间模式与外观偏好设置管理服务
 */
var Qo = `<svg class="icon" viewBox="0 0 1055 1024" width="26" height="26"><path d="M388.06497 594.013091c-96.566303-167.253333-39.067152-381.889939 128.217212-478.487273a348.656485 348.656485 0 0 1 256.248242-36.864C623.491879-5.306182 435.417212-11.170909 276.542061 80.616727 37.236364 218.763636-44.776727 524.815515 93.401212 764.152242c138.146909 239.305697 444.198788 321.318788 683.535515 183.140849 158.875152-91.725576 247.870061-257.520485 249.669818-428.559515a348.656485 348.656485 0 0 1-160.085333 203.496727c-167.253333 96.566303-381.889939 39.036121-478.487273-128.217212" fill="#8a8a8a"></path></svg>`;
var Jo = `<svg class="icon" viewBox="0 0 1024 1024" width="26" height="26"><path d="M270.016 197.248l-83.84-84.544-69.76 70.464 83.776 84.544 69.76-70.4zM139.648 465.024H0v93.888h139.648V465.024zM558.528 0H465.472v136.192h93.056V0z m349.056 183.168l-69.76-70.464-83.84 84.544L819.2 263.04l88.384-79.872z m-153.6 643.584l83.84 84.48 65.28-65.728L819.2 760.96l-65.216 65.792z m130.368-267.84H1024V465.024h-139.648v93.888zM512.064 230.08C358.4 230.08 232.768 356.992 232.768 512c0 155.008 125.632 281.856 279.296 281.856 153.6 0 279.232-126.848 279.232-281.856 0-154.944-125.632-281.856-279.232-281.856zM465.472 1024h93.056v-136.256H465.472V1024z m-349.056-183.232l69.76 70.4 83.84-84.48L204.8 760.96 116.48 840.768z" fill="#8a8a8a"></path></svg>`;
var Zo = 0; // 0 = 日间模式, 1 = 夜间模式

/**
 * 持久化夜间模式开关状态 (导出兼容 Xo)
 */
function Xo() {
  const cfg = { mode: Zo };
  __imports.localStorage.setItem("ExSave_Mode", JSON.stringify(cfg));
}

/**
 * 注入夜间模式样式 (导出兼容 Ko)
 */
function Ko() {
  if (!document.getElementsByClassName("live-next-body")[0]) {
    (0, __imports.tl)("Ex_Style_NightMode", "/* [DouyuEx] 夜间模式已启用 */");
  }
}

/**
 * 注入鱼吧嵌入 iframe 夜间样式 (导出兼容 $o)
 */
function $o() {
  try {
    const iframe = document.getElementsByClassName("BottomGroup")[0]?.getElementsByTagName("iframe")[0];
    if (iframe?.contentWindow?.document) {
      const doc = iframe.contentWindow.document;
      const styleId = "Ex_Style_NightModeIframe";
      if (!doc.getElementById(styleId)) {
        const styleEl = doc.createElement("style");
        styleEl.id = styleId;
        styleEl.innerHTML = "/* [DouyuEx] 鱼吧夜间样式适配 */";
        doc.body.append(styleEl);
      }
    }
  } catch {}
}

}
