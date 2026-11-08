/*
    Style Hook
    用于替换页面的原样式
    By 小淳
*/
function StyleHook_set(styleName, styleText) {
    // styleName：样式id名，建议以Ex_Style_大驼峰的形式命名
    if (document.getElementById(styleName) != null) return;
    /* 2026-11-08：document-start 阶段 body / head / documentElement 都可能还不存在。
       旧实现直接 document.body.append 会抛错，并把调用方整段中止（去广告、重复弹幕都中过），
       而且没有任何重试。这里按 body → head → documentElement 兜底，全都没有就等一帧 DOM。 */
    let host = document.body || document.head || document.documentElement;
    if (!host) {
        document.addEventListener("DOMContentLoaded", function () {
            StyleHook_set(styleName, styleText);
        }, { once: true });
        return;
    }
    let styleElement = document.createElement("style");
    styleElement.id = styleName;
    styleElement.innerHTML = styleText;
    host.append(styleElement);
}

function StyleHook_remove(styleName) {
    let e = document.getElementById(styleName);
    if (e !== null) {
        document.getElementById(styleName).remove();
    }
}

function StyleHook_setIframe(dom, styleName, styleText) {
    // styleName：样式id名，建议以Ex_Style_大驼峰的形式命名
    // document.getElementsByClassName("BottomGroup")[0].getElementsByTagName("iframe")[0].contentWindow.document
    if (dom.getElementById(styleName) == null) {
        let host = dom.body || dom.head || dom.documentElement;
        if (!host) return;
        let styleElement = dom.createElement("style");
        styleElement.id = styleName;
        styleElement.innerHTML = styleText;
        host.append(styleElement);
    }
}

function StyleHook_removeIframe(dom, styleName) {
    let e = dom.getElementById(styleName);
    if (e !== null) {
        dom.getElementById(styleName).remove();
    }
}