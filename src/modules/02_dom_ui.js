function safeEl(id){ return document.getElementById(id) || {}; }
/* ==================== DouyuEx-RL 全局安全事件绑定装甲 ==================== */
function safeBind(target, ev, fn) {
    try {
        var el = (typeof target === "string") ? (document.querySelector(target) || document.getElementById(target)) : target;
        if (el && typeof el.addEventListener === "function") {
            el.addEventListener(ev, fn);
            return true;
        }
    } catch(e) {}
    return false;
}



/* ==================== DouyuEx-RL 3级控制台右上角吸顶顶栏 ==================== */
function ensureMiuixPanelHeader(el, title) {
    if (!el) return;
    el.classList.add("miuix-modal");
    
    // 隐藏可能存在的原生粗糙关闭按钮与旧标题栏/功能栏
    var oldCloses = el.querySelectorAll(".extool__close, .livetool__close, .bloop__close, #vote__result-close, .ChatToolBar-DanmakuTail-title, .lottery__func");
    oldCloses.forEach(function(c) {
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
        closeBtn.onclick = function(e) {
            e.stopPropagation();
            el.style.removeProperty("display");
            el.style.setProperty("display", "none", "important");
            if (typeof updateDockActiveIndicator === "function") {
                updateDockActiveIndicator();
            }
        };
    }

    

    // 悬浮连桥双向保护
    if (!el.dataset.hoverBridgeBound) {
        el.dataset.hoverBridgeBound = "1";
        el.addEventListener("mouseenter", function() {
            if (typeof clearSubPanelTimer === "function") clearSubPanelTimer();
        });
        el.addEventListener("mouseleave", function() {
            if (typeof scheduleSubPanelClose === "function") scheduleSubPanelClose();
        });
    }
}
window.ensureMiuixPanelHeader = ensureMiuixPanelHeader;

/* ==================== DouyuEx-RL 悬浮防抖连桥与指示器状态管理 ==================== */
var subPanelCloseTimer = null;
function clearSubPanelTimer() {
    if (subPanelCloseTimer) {
        clearTimeout(subPanelCloseTimer);
        subPanelCloseTimer = null;
    }
}
function scheduleSubPanelClose() {
    clearSubPanelTimer();
    subPanelCloseTimer = setTimeout(function() {
        closeAllSubPanels();
    }, 400);
}
function closeAllSubPanels() {
    clearSubPanelTimer();
    var panels = document.querySelectorAll(".miuix-modal, .extool, .livetool, .bloop, .exlottery, .ChatToolBar-DanmakuTail-Panel, .fans-continue-panel, .popup-player-panel");
    panels.forEach(function(p) {
        p.style.removeProperty("display");
        p.style.setProperty("display", "none", "important");
    });
    updateDockActiveIndicator();
}
function updateDockActiveIndicator(activeCls) {
    var wrap = document.querySelector(".ex-panel__wrap");
    if (!wrap) return;
    for (var i = 0; i < DOCK_DEFS.length; i++) {
        var item = wrap.querySelector("." + DOCK_DEFS[i].cls);
        if (item) item.classList.remove("ex-dock-active", "is-active");
    }
    if (activeCls) {
        var target = wrap.querySelector("." + activeCls);
        if (target) target.classList.add("ex-dock-active", "is-active");
    }
}
window.clearSubPanelTimer = clearSubPanelTimer;
window.scheduleSubPanelClose = scheduleSubPanelClose;
window.closeAllSubPanels = closeAllSubPanels;
window.updateDockActiveIndicator = updateDockActiveIndicator;

function anchorPanelToButton(panel, btnEl) {
    if (!panel) return;
    if (!btnEl) {
        if (panel.classList.contains("extool")) btnEl = document.querySelector(".extool-icon");
        else if (panel.classList.contains("livetool")) btnEl = document.querySelector(".livetool-icon");
        else if (panel.classList.contains("bloop")) btnEl = document.querySelector(".bloop-icon");
        else if (panel.classList.contains("ex-lottery") || panel.classList.contains("lottery__wrap") || panel.querySelector(".lottery__wrap")) btnEl = document.querySelector(".ex-lottery");
        else if (panel.classList.contains("fans-continue-panel")) btnEl = document.querySelector(".fans-continue");
        else if (panel.classList.contains("popup-player-panel")) btnEl = document.querySelector(".popup-player");
        else if (panel.classList.contains("exupdate-panel")) btnEl = document.querySelector(".ex-update");
    }
    if (panel.parentElement !== document.body) {
        document.body.appendChild(panel);
    }
    var panelWidth = 380; // 三级面板推荐固定舒适宽度
    panel.style.width = panelWidth + "px";
    var left = (window.innerWidth - panelWidth) / 2;
    var bottom = 90;

    if (btnEl && typeof btnEl.getBoundingClientRect === "function") {
        var rect = btnEl.getBoundingClientRect();
        if (rect.width > 0 || rect.left > 0) {
            left = rect.left + rect.width / 2 - panelWidth / 2;
            left = Math.max(12, Math.min(window.innerWidth - panelWidth - 12, left));
            bottom = Math.max(20, window.innerHeight - rect.top + 12); // 悬浮在按钮上方 12px
        }
    }

    panel.style.setProperty("position", "fixed", "important");
    panel.style.setProperty("width", panelWidth + "px", "important");
    panel.style.setProperty("max-width", panelWidth + "px", "important");
    panel.style.setProperty("left", left + "px", "important");
    panel.style.setProperty("bottom", bottom + "px", "important");
    panel.style.setProperty("right", "auto", "important");
    panel.style.setProperty("top", "auto", "important");
    panel.style.setProperty("z-index", "100000", "important");
    panel.style.setProperty("display", "block", "important");
    panel.classList.add("miuix-modal-in");
}
window.anchorPanelToButton = anchorPanelToButton;


/* ==================== DouyuEx-RL Level 2 Dock 声明式装配系统 ==================== */
var DOCK_DEFS = [
    { cls: "ex-sign", inner: `<a class="ex-panel__icon" title="一键签到(所有关注的直播间/鱼吧/客户端/车队/活动)"><svg style="display: block;" t="1578566545259" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12959" width="32" height="32"><path d="M698.368 80.896v114.688c0 23.552 19.968 43.008 44.032 43.008s44.032-19.456 44.032-43.008V80.896c0-23.552-19.968-43.008-44.032-43.008s-44.032 18.944-44.032 43.008zM227.328 80.896v114.688c0 23.552 19.968 43.008 44.032 43.008 24.576 0 44.032-19.456 44.032-43.008V80.896c0-23.552-19.968-43.008-44.032-43.008-24.576 0-44.032 18.944-44.032 43.008z" fill="#F96C5D" p-id="12960"></path><path d="M977.92 195.584c0-23.552-19.968-43.008-44.032-43.008h-88.576v43.008c0 55.296-46.08 100.352-102.912 100.352s-102.912-45.056-102.912-100.352v-43.008H374.272v43.008c0 55.296-46.08 100.352-102.912 100.352-56.832 0-102.912-45.056-102.912-100.352v-43.008H79.872c-24.576 0-44.032 19.456-44.032 43.008v611.328l252.928-145.92-8.192-8.192c-10.24-9.728-16.384-23.552-16.384-38.4 0-29.696 25.088-54.272 55.808-54.272 15.36 0 29.184 6.144 39.424 15.872l28.16 27.648L977.92 263.168V195.584z" fill="#F96C5D" p-id="12961"></path><path d="M329.216 278.528c-5.632 3.584-11.264 6.656-17.408 9.216 5.632-2.56 11.776-5.632 17.408-9.216zM344.064 266.24c4.608-4.608 8.704-9.728 12.8-14.848-3.584 5.632-8.192 10.24-12.8 14.848zM329.216 278.528c5.632-3.584 10.752-7.68 15.36-12.288-5.12 4.608-10.24 8.704-15.36 12.288zM449.536 664.064l220.16-214.016c10.24-9.728 24.064-15.872 39.424-15.872 30.72 0 55.808 24.064 55.808 54.272 0 14.848-6.144 28.672-16.384 38.4l-259.072 252.416c-10.24 9.728-24.064 15.872-39.424 15.872s-29.184-6.144-39.424-15.872l-121.344-118.272L35.84 806.912v104.96c0 23.552 19.968 43.008 44.032 43.008h854.016c24.576 0 44.032-19.456 44.032-43.008V263.168L387.584 603.648l61.952 60.416zM350.72 569.856c-4.608-3.072-9.216-5.12-14.336-6.656 5.12 1.024 10.24 3.584 14.336 6.656zM271.36 295.936c14.336 0 27.648-2.56 39.936-7.68-12.288 4.608-25.6 7.68-39.936 7.68z" fill="#F15A4A" p-id="12962"></path></svg><i id="ex-sign__tip" class="ex-panel__tip"></i></a>` },
    { cls: "fans-continue", inner: `<a class="ex-panel__icon" title="一键续牌"><img style="width: 32px;height: 32px;" src="https://gfs-op.douyucdn.cn/dygift/1705/7db9beee246848252f1c7fe916259f4e.png"/><i id="fans-continue__tip" class="ex-panel__tip"></i></a>` },
    { cls: "extool-icon", inner: `<a class="ex-panel__icon" title="扩展功能"><svg t="1590294700144" style="display:block;" class="icon" viewBox="0 0 1077 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="11915" width="30" height="30"><path d="M152.770257 11.469971l213.048618 206.378138-37.094375 36.931681 159.440737 158.545917-76.95456 73.782015-159.440737-158.545917-38.47728 36.931681L0.244042 159.115348 152.770257 11.469971z" p-id="11916" fill="#d81e06"></path><path d="M1077.851922 217.848109h-105.751509L929.393073 260.311408l-31.644106 31.400063-33.02701 32.538926L776.866857 300.985065l-23.428026-87.204321 33.027009-32.538926 33.02701-32.538926L862.281538 105.751509V0.569431h-8.134732a244.041945 244.041945 0 0 0-178.964092 68.331745 234.768351 234.768351 0 0 0-68.738481 147.645376 250.712425 250.712425 0 0 0 10.981887 95.664443v2.765808a34.165872 34.165872 0 0 1-9.598983 36.931681c-17.896409 16.269463-525.096918 497.520178-525.096918 497.520178-42.625993 35.548777-38.47728 102.497617 0 142.113759 39.860184 38.233238 105.751509 40.673657 142.927233 0 0 0 478.322212-504.353352 498.984429-524.852875A33.677788 33.677788 0 0 1 754.821735 455.544963c5.531617 1.382904 10.981888 4.067366 16.269463 5.450271a242.170956 242.170956 0 0 0 87.936447 9.598983 237.290118 237.290118 0 0 0 148.45885-68.331745 231.677153 231.677153 0 0 0 68.738481-177.662536 14.805211 14.805211 0 0 0 1.626946-6.751827zM178.964093 943.628853a33.352399 33.352399 0 0 1-48.076263 0 32.538926 32.538926 0 0 1 0-47.832221 33.352399 33.352399 0 0 1 48.076263 0 35.467429 35.467429 0 0 1 0 47.832221z" p-id="11917" fill="#d81e06"></path><path d="M981.618049 785.082936L747.988561 567.804258S617.344773 601.97013 526.642517 753.682873c5.531617 1.382904 241.926915 239.161106 241.926914 239.161105a109.98157 109.98157 0 0 0 152.607563 0l60.441055-58.732761a102.823006 102.823006 0 0 0 0-149.028281zM854.146806 951.763584a29.366381 29.366381 0 0 1-38.477279 0l-195.233556-189.94598-1.382905-1.382904a25.543057 25.543057 0 0 1 1.382905-35.548777 29.366381 29.366381 0 0 1 38.47728 0l196.535113 189.94598A28.796949 28.796949 0 0 1 854.146806 951.763584z m86.634891-83.380997a29.366381 29.366381 0 0 1-38.47728 0L705.362568 678.436606l-1.382905-1.382904a25.543057 25.543057 0 0 1 1.382905-35.548777 29.366381 29.366381 0 0 1 38.477279 0l196.535113 189.945981a24.404194 24.404194 0 0 1 0 37.013028z" p-id="11918" fill="#d81e06"></path></svg><i id="extool__tip" class="ex-panel__tip"></i></a>` },
    { cls: "livetool-icon", inner: `<a class="ex-panel__icon" title="直播间工具"><svg t="1590294900594" style="display:block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="20028" width="36" height="36"><path d="M352.2 245.3c-5.1 0-10.2-2-14.1-5.9L196.6 98c-7.8-7.8-7.8-20.5 0-28.3s20.5-7.8 28.3 0l141.4 141.4c7.8 7.8 7.8 20.5 0 28.3-3.9 3.9-9 5.9-14.1 5.9zM477.1 245.3c-5.1 0-10.2-2-14.1-5.9-7.8-7.8-7.8-20.5 0-28.3L604.3 69.7c7.8-7.8 20.5-7.8 28.3 0 7.8 7.8 7.8 20.5 0 28.3L491.2 239.4c-3.9 3.9-9 5.9-14.1 5.9z" fill="#0C2B4A" p-id="20029"></path><path d="M703.9 194.8H124.2c-33 0-60 27-60 60v453c0 33 27 60 60 60h418c1.7-122.5 99.6-221.8 221.7-225.5V254.8c0-33-27-60-60-60zM533.4 522.9L356.3 625.2c-24 13.9-54-3.5-54-31.2V389.5c0-27.7 30-45 54-31.2l177.1 102.2c24 13.9 24 48.6 0 62.4zM815.2 776.4c0 21.9-17.8 39.7-39.7 39.7-21.9 0-39.7-17.8-39.7-39.7 0-21.9 17.8-39.7 39.7-39.7 21.9 0 39.7 17.8 39.7 39.7z" fill="#0C2B4A" p-id="20030"></path><path d="M775.5 591C673.6 591 591 673.6 591 775.5S673.6 960 775.5 960 960 877.4 960 775.5 877.4 591 775.5 591zM879 819l-15.6 27c-2.1 3.6-6.8 4.9-10.4 2.8l-15.5-8.9c-2.7-1.6-6.1-1.3-8.5 0.6-7.5 5.9-15.9 10.6-25.1 13.8-3 1.1-5.1 4-5.1 7.2v18.7c0 4.2-3.4 7.6-7.6 7.6H760c-4.2 0-7.6-3.4-7.6-7.6v-18.5c0-3.3-2.1-6.2-5.1-7.2-9.3-3.2-17.9-7.8-25.5-13.7-2.4-1.9-5.8-2.2-8.5-0.6l-15.2 8.8c-3.6 2.1-8.3 0.9-10.4-2.8l-15.6-27c-2.1-3.6-0.8-8.3 2.8-10.4l12.2-7.1c3-1.7 4.5-5.2 3.7-8.5-1.7-6.8-2.6-13.8-2.6-21.1 0-4.1 0.3-8.2 0.9-12.2 0.4-3.1-1-6.1-3.7-7.7l-10.5-6.1c-3.6-2.1-4.9-6.8-2.8-10.4l15.6-27c2.1-3.6 6.8-4.9 10.4-2.8l7.8 4.5c2.9 1.7 6.6 1.3 9-1.1 9.1-8.7 20-15.5 32.2-19.7 3.1-1 5.1-4 5.1-7.2v-7.9c0-4.2 3.4-7.6 7.6-7.6H791c4.2 0 7.6 3.4 7.6 7.6v8.1c0 3.2 2 6.1 5.1 7.2 12.1 4.2 22.9 10.9 31.9 19.6 2.4 2.4 6.1 2.8 9.1 1.1l8.2-4.7c3.6-2.1 8.3-0.8 10.4 2.8l15.6 27c2.1 3.6 0.9 8.3-2.8 10.4l-11 6.3c-2.7 1.6-4.1 4.6-3.7 7.7 0.6 3.9 0.8 8 0.8 12.1 0 7.2-0.9 14.1-2.5 20.8-0.8 3.3 0.7 6.7 3.6 8.3l12.8 7.4c3.7 2.1 5 6.8 2.9 10.4z" fill="#0C2B4A" p-id="20031"></path></svg><i id="LiveTool__tip" class="ex-panel__tip"></i></a>` },
    { cls: "bloop-icon", inner: `<a class="ex-panel__icon" title="弹幕发送小助手"><svg t="1578572568198" style="display: block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="55445" width="32" height="32"><path d="M511.99883605 1020.07740302c-68.78771655 0-135.53209458-13.47788003-198.38074083-40.06106453-60.69004402-25.67037725-115.18953131-62.41203655-161.98371328-109.20738247-46.79418197-46.79301803-83.53700523-101.29366926-109.20621853-161.98371328C15.84497778 645.97776043 2.36709774 579.23105337 2.36709774 510.4445019s13.47904398-135.53209458 40.06106453-198.38074083c25.6692133-60.69004402 62.41203655-115.18953131 109.20621853-161.98371328 46.79534706-46.79418197 101.29366926-83.53700523 161.98371328-109.20621853 62.84864739-26.5831845 129.59418937-40.06106453 198.38074083-40.06106453 68.78771655 0 135.53209458 13.47904398 198.38190592 40.06106453 60.69004402 25.6692133 115.18953131 62.41203655 161.98487723 109.20621853 46.79301803 46.79418197 83.53584128 101.29366926 109.20621853 161.98371328 26.5831845 62.84864739 40.06106453 129.59418937 40.06106453 198.38074083s-13.47788003 135.53325853-40.06106453 198.38074084c-25.67037725 60.69004402-62.41203655 115.19069525-109.20621853 161.98371328-46.79534706 46.79418197-101.29483435 83.53817031-161.98487723 109.20738247C647.53092949 1006.59952413 580.78655147 1020.07740302 511.99883605 1020.07740302zM511.99883605 57.86089358c-249.55500203 0-452.58244437 203.02744235-452.58244437 452.58244437s203.02744235 452.58244437 452.58244437 452.58244438c249.55616597 0 452.58360832-203.02744235 452.58360832-452.58244438C964.58244437 260.88949987 761.55500203 57.86089358 511.99883605 57.86089358z" p-id="55446" fill="#1296db" data-spm-anchor-id="a313x.7781069.0.i24"></path><path d="M322.42598685 461.65355293l-8.51099648 74.46598314 97.86947811 0c-2.85950862 76.59314973-4.9866752 127.6556379-6.38266595 153.18746454-1.42975431 51.06132423-27.65899321 75.16339541-78.72148139 72.33881542-18.45058333 1.39598962-35.47024839 2.12716658-51.06248818 2.12716658-2.85950862-17.02082901-6.38266595-34.77283613-10.63816419-53.19081984 18.41681863 0 35.43764878 0 51.06248817 0 25.53066155 2.82574393 38.99456967-7.77981952 40.42432399-31.9133275 1.39598962-9.9069861 2.12833166-25.53182663 2.12833166-46.80698994 1.39598962-21.27632725 2.12716658-36.86740309 2.12716658-46.80698994l-99.9966447 0 14.89366244-172.33546126 89.3584805 0 0-78.72148138-102.12497636 0 0-48.9353216 151.05913287 0 0 176.5909595L322.42598685 461.65355293zM450.08162475 580.79819435l0-242.54594504 74.46598314 0c-17.0219941-24.10090723-31.91449145-43.25006791-44.67982222-57.44515413l46.80698994-21.27632725c4.25433429 4.25549824 10.63699911 12.06675342 19.14799673 23.40349497 15.5910747 18.45058333 24.79948459 30.51733789 27.65899321 36.16882574l-42.5514917 19.14799673 80.84864796 0c25.53066155-38.29715741 41.8203136-64.5263963 48.93415652-78.72031744l53.19081984 14.89366244c-5.68525255 8.50983253-15.62483939 22.70491762-29.78732487 42.55149169-7.11384291 9.93958685-12.06675342 17.02082901-14.89249849 21.27516331l70.20931982 0 0 242.54594503L620.28991829 580.7970304l0 51.06248818 144.67646806 0 0 48.93415651L620.28991829 680.79367509l0 87.23131392-51.06132423 0 0-87.23131392L428.80646144 680.79367509l0-48.93415651 140.42213376 0 0-51.06248818L450.08162475 580.7970304zM501.14411293 385.0604032l0 53.18965475 68.08331718 0 0-53.18965475L501.14411293 385.0604032zM501.14411293 480.80154965l0 55.31682248 68.08331718 0L569.22743011 480.80154965 501.14411293 480.80154965zM688.37323549 385.0604032l-68.0833172 0 0 53.18965475 68.0833172 0L688.37323549 385.0604032zM620.28991829 480.80154965l0 55.31682248 68.0833172 0L688.37323549 480.80154965 620.28991829 480.80154965z" p-id="55447" fill="#1296db"></path></svg><i id="bloop__tip" class="ex-panel__tip"></i></a>` },
    { cls: "ex-lottery", inner: `<a class="ex-panel__icon" title="全站抽奖信息"><svg style="display:block;" t="1636332741708" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="19181" width="32" height="32"><path d="M508.858182 986.042182c-261.748364 0-473.925818-212.177455-473.925818-473.925818S247.109818 38.190545 508.858182 38.190545s473.925818 212.177455 473.925818 473.925819-212.200727 473.925818-473.925818 473.925818m0-981.690182C228.421818 4.352 1.093818 231.703273 1.093818 512.116364s227.351273 507.764364 507.764364 507.764363c280.413091 0 507.787636-227.351273 507.787636-507.764363S789.271273 4.352 508.858182 4.352" fill="#FF4517" p-id="19182"></path><path d="M322.536727 512.302545l0.023273-1.326545-313.064727-1.931636c0 1.093818-0.093091 2.164364-0.093091 3.281454 0 90.88 24.785455 175.918545 67.84 248.925091l270.173091-155.997091a185.274182 185.274182 0 0 1-24.878546-92.951273zM416.791273 350.440727L264.029091 82.013091A492.986182 492.986182 0 0 0 77.498182 262.981818l270.173091 155.997091a186.717091 186.717091 0 0 1 69.12-68.538182zM602.856727 351.697455l151.831273-259.211637A488.261818 488.261818 0 0 0 508.718545 21.690182l0.023273 304.453818c34.350545 0 66.513455 9.355636 94.114909 25.553455zM258.536727 939.450182a488.471273 488.471273 0 0 0 241.710546 63.674182c2.839273 0 5.632-0.139636 8.448-0.186182V698.507636a185.064727 185.064727 0 0 1-94.068364-25.553454l-156.090182 266.496zM927.325091 270.452364l-257.466182 148.666181a185.204364 185.204364 0 0 1 25.041455 93.207273l-0.046546 1.070546 296.168727 1.838545c0.023273-0.977455 0.069818-1.931636 0.069819-2.909091 0-87.994182-23.249455-170.496-63.767273-241.873454zM600.855273 674.094545l148.573091 261.073455a492.776727 492.776727 0 0 0 178.106181-181.387636l-257.466181-148.642909a187.042909 187.042909 0 0 1-69.213091 68.95709z" fill="#FF4517" p-id="19183"></path><path d="M644.142545 512.302545a135.400727 135.400727 0 0 0-135.424-135.400727l-84.619636-160.791273 20.642909 173.824c-42.658909 22.784-71.400727 70.609455-71.400727 122.368a135.447273 135.447273 0 0 0 270.801454 0z m-133.492363 70.097455a68.491636 68.491636 0 1 1 0.023273-136.96 68.491636 68.491636 0 0 1-0.023273 136.96z" fill="#FF4517" p-id="19184"></path></svg><i id="lottery__tip" class="ex-panel__tip"></i></a>` },
    { cls: "popup-player", inner: `<a class="ex-panel__icon" title="同屏播放"><svg style="display:block;" t="1579448049771" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1804" width="30" height="30"><path d="M353.024 900.416H109.952c-57.856 0-109.952-46.336-109.952-98.432V153.6c0-52.096 52.096-98.432 109.952-98.432h810.176c57.856 0 104.192 46.336 104.192 98.496v185.472c0 28.928-23.168 52.096-46.336 52.096s-46.272-23.168-46.272-52.096V159.36H98.368V807.68h248.896c34.688 0 52.032 17.408 52.032 46.336 0 28.928-17.344 46.272-46.272 46.272" fill="#f26b1f" p-id="1805"></path><path d="M619.2 631.488c-5.76 0-5.76 5.76-5.76 11.52v223.04c0 5.76 5.76 11.52 5.76 11.52h289.344c5.76 0 11.584-5.76 11.584-11.52v-222.976c0-5.824-5.76-11.584-11.52-11.584H619.136z m289.344 338.688h-289.28a103.68 103.68 0 0 1-104.192-104.128v-222.976c0-57.92 46.272-109.952 104.128-109.952h289.344c57.856 0 104.128 46.272 104.128 109.952v222.976c5.824 57.856-40.448 104.128-104.128 104.128z" fill="#f26b1f" p-id="1806"></path></svg><i id="popup-player__tip" class="ex-panel__tip"></i></a>` },
    { cls: "ex-monitor", inner: `<a class="ex-panel__icon" title="在线弹幕助手"><svg style="display:block;" t="1638235744961" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="69800" width="32" height="32"><path d="M426.666667 106.666667a21.333333 21.333333 0 0 1 21.333333-21.333334h512a21.333333 21.333333 0 0 1 0 42.666667H448a21.333333 21.333333 0 0 1-21.333333-21.333333z m533.333333 789.333333H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667z m0-554.666667H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667z m0 298.666667H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667zM245.333333 42.666667H96a53.393333 53.393333 0 0 0-53.333333 53.333333v149.333333a53.393333 53.393333 0 0 0 53.333333 53.333334h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333334V96a53.393333 53.393333 0 0 0-53.333334-53.333333z m0 341.333333H96a53.393333 53.393333 0 0 0-53.333333 53.333333v149.333334a53.393333 53.393333 0 0 0 53.333333 53.333333h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333333V437.333333a53.393333 53.393333 0 0 0-53.333334-53.333333z m0 341.333333H96a53.393333 53.393333 0 0 0-53.333333 53.333334v149.333333a53.393333 53.393333 0 0 0 53.333333 53.333333h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333333v-149.333333a53.393333 53.393333 0 0 0-53.333334-53.333334z" fill="#13227a" p-id="69801"></path></svg><i id="Monitor__tip" class="ex-panel__tip"></i></a>` },
    { cls: "ex-update", inner: `<a class="ex-panel__icon" title="版本更新，当前版本'+P+'"><svg t="1578767541873" style="display:block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="23715" width="32" height="32"><path d="M768 810.7H512c-23.6 0-42.7-19.1-42.7-42.7s19.1-42.7 42.7-42.7h256c94.1 0 170.7-76.6 170.7-170.7 0-89.6-70.1-164.3-159.5-170.1L754 383l-10.7-22.7c-42.2-89.3-133-147-231.3-147s-189.1 57.7-231.3 147L270 383l-25.1 1.6c-89.5 5.8-159.5 80.5-159.5 170.1 0 94.1 76.6 170.7 170.7 170.7 23.6 0 42.7 19.1 42.7 42.7s-19.1 42.7-42.7 42.7c-141.2 0-256-114.8-256-256 0-126.1 92.5-232.5 214.7-252.4C274.8 195.7 388.9 128 512 128s237.2 67.7 297.3 174.2C931.5 322.1 1024 428.6 1024 554.7c0 141.1-114.8 256-256 256z" fill="#3688FF" p-id="23716"></path><path d="M554.7 938.7c-10.9 0-21.8-4.2-30.2-12.5l-128-128c-16.7-16.7-16.7-43.7 0-60.3l128-128c16.6-16.7 43.7-16.7 60.3 0 16.7 16.7 16.7 43.7 0 60.3L487 768l97.8 97.8c16.7 16.7 16.7 43.7 0 60.3-8.3 8.4-19.2 12.6-30.1 12.6z" fill="#5F6379" p-id="23717"></path></svg><i id="ex-update__tip" class="ex-panel__tip"></i></a>` }
];

function executeFansContinue(inputCount) {
    var val = Number(inputCount);
    var i = (!Number.isNaN(val) && val >= 0) ? val : 0;
    localStorage.setItem("ExSave_FansContinue", String(i));
    let n = 0;
    if (typeof pt === "function") {
        pt(B, t => {
            var o = t.data?.list?.length || 0;
            if (0 == o) T("背包礼物为空", "error");
            else {
                for (let e = 0; e < o; e++) {
                    if (268 == t.data.list[e].id || 2358 == t.data.list[e].id) {
                        n = t.data.list[e].id;
                        var count = t.data.list[e].count;
                        break;
                    }
                }
                0 == n ? T("没有足够的道具", "error") : fetch("https://www.douyu.com/member/cp/getFansBadgeList", {
                    method: "GET",
                    mode: "no-cors",
                    cache: "default",
                    credentials: "include"
                }).then(e => e.text()).then(async e => {
                    var badgeList = (new DOMParser).parseFromString(e, "text/html").getElementsByClassName("fans-badge-list")[0];
                    var o = badgeList ? badgeList.lastElementChild : null;
                    var t = o ? o.children.length : 0;
                    0 == i && t > 0 && (i = Math.floor(count / t));
                    for (let e = 0; e < t; e++) {
                        let t = o.children[e].getAttribute("data-fans-room");
                        await b(250).then(() => {
                            Ut(n, i, t).then(e => {
                                "success" == e.msg ? T("【续牌】" + t + "赠送荧光棒成功", "success") : (T("【续牌】" + t + "赠送失败 " + e.msg, "error"), console.log(t, e));
                            }).catch(e => {
                                T("【续牌】" + t + "赠送失败", "error");
                                console.log(t, e);
                            });
                        });
                    }
                    T("【一键续牌】所有关注房间续牌执行完毕！", "success");
                    updateFansContinuePanel();
                }).catch(e => {
                    console.log("请求失败!", e);
                });
            }
        });
    }
}

function updateFansContinuePanel() {
    var badgeNameEl = document.getElementById("fans-panel-badge-name");
    var badgeCountEl = document.getElementById("fans-panel-badge-count");
    var stickCountEl = document.getElementById("fans-panel-stick-count");
    
    var badge = localStorage.getItem("ExSave_GoldBadgeName") || "幻神";
    if (badgeNameEl) badgeNameEl.textContent = badge;
    
    if (typeof pt === "function") {
        pt(B, function(t) {
            var list = t.data?.list || [];
            var stickCount = 0;
            for (var idx = 0; idx < list.length; idx++) {
                if (268 == list[idx].id || 2358 == list[idx].id) {
                    stickCount = list[idx].count;
                    break;
                }
            }
            if (stickCountEl) stickCountEl.textContent = String(stickCount);
        });
    }
    
    fetch("https://www.douyu.com/member/cp/getFansBadgeList", {
        method: "GET", mode: "no-cors", cache: "default", credentials: "include"
    }).then(e => e.text()).then(e => {
        var badgeList = (new DOMParser).parseFromString(e, "text/html").getElementsByClassName("fans-badge-list")[0];
        var o = badgeList ? badgeList.lastElementChild : null;
        var count = o ? o.children.length : 0;
        if (badgeCountEl) badgeCountEl.textContent = String(count);
    }).catch(() => {});
}

function createFansContinuePanel() {
    if (document.querySelector(".fans-continue-panel")) return;
    var p = document.createElement("div");
    p.className = "fans-continue-panel miuix-modal";
    p.innerHTML = `
        <div class="fans-panel__card">
                <div class="fans-panel__card-header">
                    <span class="fans-panel__card-title">徽章与资产</span>
                    <span class="fans-panel__badge-tag" id="fans-panel-badge-name">当前佩戴</span>
                </div>
                <div class="fans-panel__asset-grid">
                    <div class="fans-panel__asset-item">
                        <span class="fans-panel__asset-label">已有粉丝牌</span>
                        <span class="fans-panel__asset-value" id="fans-panel-badge-count">-</span>
                    </div>
                    <div class="fans-panel__asset-item">
                        <span class="fans-panel__asset-label">背包荧光棒</span>
                        <span class="fans-panel__asset-value" id="fans-panel-stick-count">-</span>
                    </div>
                    <div class="fans-panel__asset-item">
                        <span class="fans-panel__asset-label">牌子状态</span>
                        <span class="fans-panel__asset-value fans-panel__status--ok" id="fans-panel-badge-status">健康保活</span>
                    </div>
                </div>
            </div>

            <div class="fans-panel__card">
                <div class="fans-panel__card-header">
                    <span class="fans-panel__card-title">续牌赠送配置</span>
                </div>
                <div class="fans-panel__input-group">
                    <label class="fans-panel__input-label">每个直播间赠送荧光棒数量：</label>
                    <div class="fans-panel__input-box">
                        <input type="number" id="fans-panel-stick-input" min="0" value="0" placeholder="0 表示全量平均赠送" />
                        <span class="fans-panel__input-hint">根 (输入 0 则平均分配背包余量)</span>
                    </div>
                </div>
            </div>

            <div class="fans-panel__action-wrap">
                <button type="button" class="ex-btn-primary fans-panel__submit-btn" id="fans-panel-start-btn">
                    立即开始续牌
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(p);
    ensureMiuixPanelHeader(p, "一键续牌");
    
    safeBind("#fans-panel-start-btn", "click", function(e) {
        e.stopPropagation();
        var val = document.getElementById("fans-panel-stick-input")?.value || "0";
        executeFansContinue(val);
    });
}

function executePopupPlayer(url, isNoIframe) {
    var t = url ? url.trim() : "";
    if (!t) {
        T("请输入直播间或直播流地址", "error");
        return;
    }
    if (typeof ExLoadLib === "function" && typeof EXURL !== "undefined") {
        ExLoadLib(EXURL.flv);
    }
    var a;
    let isStream = 150 < t.length && (t.startsWith("http://") || t.startsWith("https://") || t.includes(".flv") || t.includes(".m3u8"));
    if (isStream) {
        rn(D.length, t);
    } else if (isNoIframe) {
        if (-1 != t.indexOf("douyu.com")) {
            a = e => { en(D.length, e, "Douyu"); };
            fetch(t, { method: "GET", mode: "no-cors", cache: "default", credentials: "include" }).then(e => e.text()).then(e => {
                var doc = (new DOMParser).parseFromString(e, "text/html");
                var html = doc.getElementsByTagName("html")[0].innerHTML;
                var o = "$ROOM.room_id =".length, n = html.indexOf("$ROOM.room_id =");
                let rid = "";
                0 < n ? rid = (rid = html.substring(n + o, html.indexOf(";", n + o))).trim() : (rid = v(html, "roomID:", ",")) ? rid = rid.trim() : (n = doc.querySelector('link[rel="canonical"]')) && (o = n.getAttribute("href"), rid = o.split("/").pop().trim());
                /^[0-9]+$/.test(rid) ? a(rid) : T("获取直播间失败，请检查直播间地址是否正确！", "error");
            }).catch(e => { console.log("请求失败!", e); });
        } else if (-1 != t.indexOf("bilibili.com")) {
            var r = t, l = e => { en(D.length, e, "Bilibili"); };
            r = (r = r.split("/"))[r.length - 1];
            GM_xmlhttpRequest({
                method: "GET",
                url: "https://api.live.bilibili.com/room/v1/Room/room_init?id=" + r,
                responseType: "json",
                onload: function(e) {
                    e = e.response;
                    l(e.data.room_id);
                }
            });
        } else if (-1 != t.indexOf("huya.com")) {
            en(D.length, t, "Huya");
        } else {
            rn(D.length, t);
        }
    } else {
        var r = D.length;
        if (-1 == String(t).indexOf("douyu.com")) {
            T("有弹幕模式仅支持斗鱼直播", "error");
        } else {
            var i = String(t).split("/"), rid = i[i.length - 1];
            var o = document.createElement("div"), n = "";
            o.id = "exVideoDiv" + String(r);
            o.rid = rid;
            o.className = "exVideoDiv";
            n = (n = (n = (n += "<div class='exVideoInfo' id='exVideoInfo" + String(r) + "'><span class='exVideoRID' id='exVideoRID" + String(r) + "' style='color:white'>斗鱼 - " + rid + "</span>") + "<a><div class='exVideoClose' id='exVideoClose" + String(r) + "'>X</div></a></div>") + "<iframe class='exVideoPlayer' id='exVideoPlayer" + String(r) + "' src=" + t + "?exid=chun></iframe>") + "<div class='exVideoScale' id='exVideoScale" + String(r) + "'></div>";
            o.innerHTML = n;
            var target = E([".layout-Main", ".playerWrap__8wGvw", ".live-next-body"]);
            if (target) target.insertBefore(o, target.childNodes[0]);
            on(r); tn(r);
            r > D.length - 1 ? D.push("iframe") : D[r] = "iframe";
            let curDiv = document.getElementById("exVideoDiv" + String(r));
            let curClose = document.getElementById("exVideoClose" + String(r));
            if (curClose) {
                curClose.onclick = function() {
                    D[r].destroy();
                    curDiv.remove();
                };
            }
            if (curDiv) {
                curDiv.onclick = function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    for (let idx = 0; idx < D.length; idx++) {
                        var item = document.getElementById("exVideoDiv" + String(idx));
                        if (item) {
                            idx == r ? item.style.zIndex = 1016 : item.style.zIndex = 1428;
                        }
                    }
                };
            }
        }
    }
}

function createPopupPlayerPanel() {
    if (document.querySelector(".popup-player-panel")) return;
    var p = document.createElement("div");
    p.className = "popup-player-panel miuix-modal";
    p.innerHTML = `
        <div class="popup-panel__card">
                <div class="popup-panel__card-header">
                    <span class="popup-panel__card-title">直播流或房间地址</span>
                    <button type="button" class="popup-panel__paste-btn" id="popup-panel-paste">粘贴</button>
                </div>
                <div class="popup-panel__input-box">
                    <input type="text" id="popup-panel-url" value="https://www.douyu.com/4042402" placeholder="支持斗鱼/虎牙/B站房间号或直播流" />
                </div>
            </div>

            <div class="popup-panel__card">
                <div class="popup-panel__card-header">
                    <span class="popup-panel__card-title">同屏播放模式</span>
                </div>
                <div class="popup-panel__seg-switch">
                    <label class="popup-panel__seg-item">
                        <input type="radio" name="popup_player_mode" value="noiframe" checked />
                        <span class="popup-panel__seg-thumb">无弹幕极速流 (推荐)</span>
                    </label>
                    <label class="popup-panel__seg-item">
                        <input type="radio" name="popup_player_mode" value="iframe" />
                        <span class="popup-panel__seg-thumb">全功能有弹幕</span>
                    </label>
                </div>
            </div>

            <div class="popup-panel__action-wrap">
                <button type="button" class="ex-btn-primary popup-panel__submit-btn" id="popup-panel-start-btn">
                    载入同屏流
                </button>
            </div>
        </div>
    `;
    var container = document.getElementsByClassName("layout-Player-chat")[0] || document.body;
    if (container) container.insertBefore(p, container.childNodes[0]);
    ensureMiuixPanelHeader(p, "同屏播放器");

    safeBind("#popup-panel-paste", "click", async function(e) {
        e.stopPropagation();
        try {
            var text = await navigator.clipboard.readText();
            if (text) {
                var inp = document.getElementById("popup-panel-url");
                if (inp) inp.value = text.trim();
                T("已从剪贴板粘贴直播流地址", "success");
            }
        } catch(err) {
            T("请允许读取剪贴板权限或手动粘贴", "info");
        }
    });

    safeBind("#popup-panel-start-btn", "click", function(e) {
        e.stopPropagation();
        var urlInp = document.getElementById("popup-panel-url");
        var val = urlInp ? urlInp.value.trim() : "";
        var isNoIframe = document.querySelector('input[name="popup_player_mode"][value="noiframe"]')?.checked ?? true;
        executePopupPlayer(val, isNoIframe);
        p.style.setProperty("display", "none", "important");
        updateDockActiveIndicator();
    });
}

function createExUpdatePanel() {
    if (document.querySelector(".exupdate-panel")) return;
    var currentVer = (typeof P !== "undefined" && P) ? P : "2026.09.14.04";
    var p = document.createElement("div");
    p.className = "exupdate-panel miuix-modal";
    p.innerHTML = `
        <div class="exupdate-panel__card">
            <div class="exupdate-panel__card-header">
                <span class="exupdate-panel__card-title">新增功能·</span>
            </div>
            <ul class="exupdate-list">
                <li>① 二级 Dock 视觉与交互全面升级：尺寸等比放大 150%（高度 76px、按键 56px），移除 800ms 强制隐藏机制，改为常驻保活与点击锁定</li>
                <li>② 三级控制台物理脱离与零阻碍居中锚定：面板彻底脱离聊天区包含块直接挂载至主视口，实现触发按钮 0px 像素级精准水平居中</li>
                <li>③ 隐形热区连桥 (Hover Bridge)：Dock 按键上方延伸 18px 物理感应区，配合 400ms 黄金防抖，划过即触即开且杜绝误关闭</li>
                <li>④ 版本更新三级模态化与智能生命周期系统：版本更新按钮全面 MIUIX 模态化，集成【我已收到 ➔ 检查更新 ➔ 已是最新 / 前往更新】多态交互状态机</li>
                <li>⑤ 12 小时极轻量远端更新探测雷达 (Scheme B)：开播后极轻量嗅探 Greasy Fork 元数据（0 轮询）；发现新版联动二级 Dock 版本更新图标小红点常亮</li>
            </ul>
        </div>
        <div class="exupdate-panel__card">
            <div class="exupdate-panel__card-header">
                <span class="exupdate-panel__card-title">优化与修复·</span>
            </div>
            <ul class="exupdate-list">
                <li>① UI 界面全面 MIUIX 美学质感重构：全量落地 36px 拟态磨砂毛玻璃与 22px 连续物理圆角，触感高级极简，彻底告别土味与塑料电竞风</li>
                <li>② 击穿 display:none 死锁：重构模态激活管线，彻底消除悬浮面板虚无隐形 Bug，配合 0.18s 物理弹簧上浮动效</li>
                <li>③ 样式作用域强隔离：给所有表单控件追加严格容器命名空间，彻底根除污染斗鱼原生播放器（线路/画质框）的恶性 Bug</li>
                <li>④ 吸顶 Header 左右贴合：消除滚动条出现时顶栏右侧漏缝与下边圆角异化问题，平滑滚动阻断率归零 (0%)</li>
                <li>⑤ 跨域 Cookie 安全沙盒防御：重构 x() 存储读取增加异常隔离降级，杜绝无痕或第三方 Cookie 受限模式下的崩溃死锁</li>
                <li>⑥ 拔除 753 行旧版冲突监听器：消除点击二级图标误触发新开标签页跳转 Greasy Fork 的恶性行为，交互 100% 收敛至面板内部</li>
                <li>⑦ 结构与动效细节深度打磨：版本更新面板全量接入三级模态标准四级卡片包裹；取消开播主动强弹窗口；按钮统一为同款主操作微质感键并沉入更新日志底端流式排列</li>
            </ul>
        </div>
        <div class="exupdate-panel__card">
            <div class="exupdate-panel__card-header">
                <span class="exupdate-panel__card-title">其它·</span>
            </div>
            <ul class="exupdate-list">
                <li>① 核心画质拦截层 100% 守恒：src/core/ 黄金拦截逻辑严格 0 修改，首流极清秒开无二次切流</li>
                <li>② 移除 404 盲轮询定时器，构建编译集成 V8 AST 原生语法核验机制 (耗时 13ms)</li>
            </ul>
        </div>
        <div class="exupdate-panel__action-wrap">
            <button type="button" class="ex-btn-primary exupdate-panel__submit-btn" id="exupdate-action-btn">我已收到</button>
        </div>
    `;
    document.body.appendChild(p);
    ensureMiuixPanelHeader(p, "版本更新");

    var btn = p.querySelector("#exupdate-action-btn");
    if (!btn) return;

    // 多态状态机初始化
    function setBtnState(state, text) {
        btn.className = "ex-btn-primary exupdate-panel__submit-btn";
        btn.dataset.state = state;
        btn.disabled = false;
        if (state === "ack") {
            btn.classList.add("exupdate-state-btn--ack");
            btn.textContent = text || "我已收到";
        } else if (state === "check") {
            btn.classList.add("exupdate-state-btn--check");
            btn.textContent = text || "检查更新";
        } else if (state === "checking") {
            btn.classList.add("exupdate-state-btn--checking");
            btn.textContent = text || "正在检查更新...";
            btn.disabled = true;
        } else if (state === "latest") {
            btn.classList.add("exupdate-state-btn--latest");
            btn.textContent = text || "已是最新";
        } else if (state === "upgrade") {
            btn.classList.add("exupdate-state-btn--upgrade");
            btn.textContent = text || "前往更新";
        }
    }

    var lastNotified = GM_getValue("Ex_LastNotifiedVersion");
    if (lastNotified !== currentVer) {
        setBtnState("ack", "我已收到");
    } else {
        setBtnState("check", "检查更新");
    }

    btn.onclick = function(e) {
        e.stopPropagation();
        var st = btn.dataset.state;
        if (st === "ack") {
            GM_setValue("Ex_LastNotifiedVersion", currentVer);
            var tip = document.getElementById("ex-update__tip");
            if (tip) tip.style.display = "none";
            setBtnState("check", "检查更新");
        } else if (st === "check") {
            setBtnState("checking", "正在检查更新...");
            var handleUpdateData = function(data) {
                if (data && data.version && typeof isNewerVersion === "function" && isNewerVersion(data.version, currentVer)) {
                    setBtnState("upgrade", "前往更新");
                    var tip = document.getElementById("ex-update__tip");
                    if (tip) tip.style.display = "block";
                } else {
                    setBtnState("latest", "已是最新");
                }
            };
            if (typeof GM_xmlhttpRequest === "function") {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: "https://greasyfork.org/scripts/595575.json",
                    responseType: "json",
                    onload: function(res) {
                        var data = res.response;
                        if (typeof data === "string") {
                            try { data = JSON.parse(data); } catch(e) {}
                        }
                        handleUpdateData(data);
                    },
                    onerror: function() { setBtnState("latest", "已是最新"); }
                });
            } else {
                fetch("https://greasyfork.org/scripts/595575.json")
                    .then(function(res) { return res.json(); })
                    .then(handleUpdateData)
                    .catch(function() {
                        setBtnState("latest", "已是最新");
                    });
            }
        } else if (st === "latest") {
            setBtnState("check", "检查更新");
        } else if (st === "upgrade") {
            GM_openInTab("https://greasyfork.org/zh-CN/scripts/595575", { active: true });
        }
    };
}
window.createExUpdatePanel = createExUpdatePanel;

function handleDockHover(cls, btnEl) {
    clearSubPanelTimer();
    var mapping = {
        "extool-icon": "扩展功能",
        "livetool-icon": "直播间工具",
        "bloop-icon": "弹幕发送小助手",
        "ex-lottery": "全站抽奖信息",
        "fans-continue": "一键续牌",
        "popup-player": "同屏播放",
        "ex-update": "版本更新"
    };
    if (mapping[cls]) {
        ee(mapping[cls], true, btnEl);
        if (cls === "ex-lottery") {
            var el = document.getElementsByClassName("lottery__wrap")[0];
            if (el && typeof So !== "undefined") el.innerHTML = So;
        } else if (cls === "fans-continue") {
            updateFansContinuePanel();
        }
    }
}

function handleDockAction(cls, btnEl) {
    clearSubPanelTimer();
    if (!btnEl) {
        btnEl = document.querySelector("." + cls);
    }
    if (cls === "extool-icon") {
        ee("扩展功能", false, btnEl);
    } else if (cls === "livetool-icon") {
        ee("直播间工具", false, btnEl);
    } else if (cls === "bloop-icon") {
        ee("弹幕发送小助手", false, btnEl);
    } else if (cls === "ex-lottery") {
        ee("全站抽奖信息", false, btnEl);
        var el = document.getElementsByClassName("lottery__wrap")[0];
        if (el && typeof So !== "undefined") el.innerHTML = So;
    } else if (cls === "fans-continue") {
        ee("一键续牌", false, btnEl);
        updateFansContinuePanel();
    } else if (cls === "popup-player") {
        ee("同屏播放", false, btnEl);
    } else if (cls === "ex-monitor") {
        _("https://www.douyuex.com/" + String(B), true);
    } else if (cls === "ex-update") {
        ee("版本更新", false, btnEl);
    } else if (cls === "ex-sign") {
        if (typeof Wn === "function") Wn(false);
    }
}

function triggerFansContinue() {
    ee("一键续牌");
    updateFansContinuePanel();
}

function initDockFull(wrap) {
    if (!wrap.dataset.hoverBound) {
        wrap.dataset.hoverBound = "1";
        wrap.addEventListener("mouseenter", function() { clearSubPanelTimer(); });
        wrap.addEventListener("mouseleave", function() { scheduleSubPanelClose(); });
    }
    if (!wrap) return;
    createFansContinuePanel();
    createPopupPlayerPanel();
    createExUpdatePanel();

    for (var i = 0; i < DOCK_DEFS.length; i++) {
        var def = DOCK_DEFS[i];
        var el = wrap.querySelector("." + def.cls);
        if (!el) {
            el = document.createElement("div");
            el.className = def.cls;
            el.innerHTML = def.inner.replace("'+P+'", P);
            wrap.appendChild(el);
        }
        if (!el.querySelector(".ex-panel__indicator")) {
            var ind = document.createElement("div");
            ind.className = "ex-panel__indicator";
            el.appendChild(ind);
        }
        (function(targetCls, targetEl) {
            targetEl.style.cursor = "pointer";
            targetEl.onmouseenter = function() {
                handleDockHover(targetCls, targetEl);
            };
            targetEl.onmouseleave = function() {
                scheduleSubPanelClose();
            };
            targetEl.onclick = function(e) {
                e.stopPropagation();
                handleDockAction(targetCls, targetEl);
            };
            var link = targetEl.querySelector("a");
            if (link) {
                link.onclick = function(e) {
                    e.stopPropagation();
                    handleDockAction(targetCls, targetEl);
                };
            }
        })(def.cls, el);
    }
    
    // 拦截原版后续的重复插入
    var origInsertBefore = wrap.insertBefore;
    wrap.insertBefore = function(newNode, refNode) {
        if (newNode && newNode.className) {
            var existing = wrap.querySelector("." + newNode.className.split(" ")[0]);
            if (existing) return existing;
        }
        return origInsertBefore.call(wrap, newNode, refNode);
    };
    
    // 兼容全局 safeBind 备用兜底
    safeBind(".extool-icon", "click", function(e) { e.stopPropagation(); handleDockAction("extool-icon"); });
    safeBind(".livetool-icon", "click", function(e) { e.stopPropagation(); handleDockAction("livetool-icon"); });
    safeBind(".bloop-icon", "click", function(e) { e.stopPropagation(); handleDockAction("bloop-icon"); });
    safeBind(".ex-lottery", "click", function(e) { e.stopPropagation(); handleDockAction("ex-lottery"); });
    safeBind(".popup-player", "click", function(e) { e.stopPropagation(); handleDockAction("popup-player"); });
    safeBind(".ex-monitor", "click", function(e) { e.stopPropagation(); handleDockAction("ex-monitor"); });
    safeBind(".ex-update", "click", function(e) { e.stopPropagation(); handleDockAction("ex-update"); });
    safeBind(".fans-continue", "click", function(e) { e.stopPropagation(); handleDockAction("fans-continue"); });
    
    if (typeof initVersionLifecycleNotice === "function") {
        initVersionLifecycleNotice();
    }
}



function d(){var i=document.createElement("div"),l=(i.className="ChatToolBar-DanmakuTail",i.innerHTML='<div class="ChatToolBar-DanmakuTail-tip" title="弹幕小尾巴" ></div>',document.getElementsByClassName("ChatToolBar__left")[0]);l&&l.appendChild(i),(l=document.createElement("div")).className="ChatToolBar-DanmakuTail-Panel",(i=(document.getElementsByClassName("layout-Player-chat")[0]||document.body)),i.insertBefore(l,i.childNodes[0]),window.location.href.includes("/beta")||(l.style.bottom="140px"),l.innerHTML=`

        <div class="ChatToolBar-DanmakuTail-title">弹幕小尾巴</div>

        <input type="text" class="DanmakuTail-input" id="DanmakuTail-input" placeholder="请输入小尾巴内容"/>

        <div class="DanmakuTail-option-label">

            <label for="DanmakuTail-option-label1">

                <input type="radio" name="DanmakuTailType" value="1" id="DanmakuTail-option-label1"> 前缀

            </label>

            <label for="DanmakuTail-option-label2">

                <input type="radio" name="DanmakuTailType" value="2" id="DanmakuTail-option-label2" checked> 后缀

            </label>

        </div>

        <label class="DanmakuTail-checkbox-label">

            <input type="checkbox" class="DanmakuTail-checkbox" id="DanmakuTail-checkbox" />

            启用功能

        </label>

    `,null!=(i=localStorage.getItem("ExSave_DanmakuTail"))&&(i=JSON.parse(i),safeEl("DanmakuTail-checkbox").checked=i.isTailEnabled,safeEl("DanmakuTail-input").value=i.tailContent||"",safeEl("DanmakuTail-input").disabled=i.isTailEnabled,document.querySelectorAll('input[name="DanmakuTailType"]')[0].disabled=i.isTailEnabled,document.querySelectorAll('input[name="DanmakuTailType"]')[1].disabled=i.isTailEnabled,i.type?(document.querySelector(`input[name="DanmakuTailType"][value="${i.type}"]`).checked=!0,Ue()):document.querySelector('input[name="DanmakuTailType"][value="2"]').checked=!0,i.isTailEnabled)&&document.querySelector(".ChatToolBar-DanmakuTail-tip").classList.add("ChatToolBar-DanmakuTail-tip-active"),safeBind(".ChatToolBar-DanmakuTail", "click",function(){ee("弹幕小尾巴")});{var l="#DanmakuTail-checkbox",i="#DanmakuTail-input";let s=null,d=null;function a(i,a){let r=document.querySelector("textarea.ChatSend-txt")||document.querySelector("div.ChatSend-txt"),l=document.querySelector(".ChatSend-button");if(r&&l){c();let t="div"===r.tagName.toLowerCase(),o=()=>t?r.innerText:r.value,n=e=>{t?r.innerText=e:r.value=e};s=function(e){!e.isTrusted||"Enter"!==e.key||e.shiftKey||(e.preventDefault(),e.stopPropagation(),l.click())},d=function(e){var t=o();if(""!=t.trim()){let e=!1;(e="1"===a?!t.startsWith(i):!t.endsWith(i))&&("1"===a?n(i+t):n(t+i),r.dispatchEvent(new Event("input",{bubbles:!0})))}},r.addEventListener("keydown",s,!0),l.addEventListener("click",d,!0)}}function c(){var e=document.querySelector("textarea.ChatSend-txt")||document.querySelector("div.ChatSend-txt"),t=document.querySelector(".ChatSend-button");e&&s&&e.removeEventListener("keydown",s,!0),t&&d&&t.removeEventListener("click",d,!0),s=null,d=null}let e=document.querySelector(l),t=document.querySelector(i),o=document.querySelectorAll('input[name="DanmakuTailType"]'),n=(document.querySelector('input[name="DanmakuTailType"]:checked')?document.querySelector('input[name="DanmakuTailType"]:checked').value:"2");e&&(e.addEventListener("change",function(){""===t.value.trim()?(e.checked=!1,T("【弹幕小尾巴】请输入弹幕小尾巴内容","error")):(t.disabled=e.checked,o[0].disabled=e.checked,o[1].disabled=e.checked,document.querySelector(".ChatToolBar-DanmakuTail-tip").classList.remove("ChatToolBar-DanmakuTail-tip-active"),c(),e.checked&&t&&(document.querySelector(".ChatToolBar-DanmakuTail-tip").classList.add("ChatToolBar-DanmakuTail-tip-active"),a(t.value.trim(),n=document.querySelector('input[name="DanmakuTailType"]:checked').value)))}),e.checked)&&t&&a(t.value.trim(),n)}safeBind("#DanmakuTail-checkbox", "change",function(){Ue()}),document.querySelectorAll('input[name="DanmakuTailType"]').forEach(e=>{e.addEventListener("change",function(){Ue()})}),safeBind("#DanmakuTail-input", "input",function(){Ue()}),(l=!!document.getElementsByClassName("live-next-body")[0])||((l=document.createElement("div")).style="position: absolute;right: -75px;top: 18px;cursor: pointer;",l.id="ex-night",l.innerHTML=Jo,l.title="切换夜间模式",((_hr=document.getElementsByClassName("Header-right")[0])&&_hr.appendChild(l)),safeBind("#ex-night", "click",function(){var e,t=document.getElementById("ex-night");0==Zo?(Zo=1,t.innerHTML=Qo,t.title="切换日间模式",Ko(),Xo(),$o()):(Zo=0,t.innerHTML=Jo,t.title="切换夜间模式",U("Ex_Style_NightMode"),Xo(),t=document.getElementsByClassName("BottomGroup")[0].getElementsByTagName("iframe")[0].contentWindow.document,e="Ex_Style_NightModeIframe",null!==t.getElementById(e)&&t.getElementById(e).remove())}),l=localStorage.getItem("ExSave_Mode"),i=document.getElementById("ex-night"),null!=l&&("mode"in(l=JSON.parse(l))==0&&(l.mode=0),1==l.mode)&&(Zo=1,i.innerHTML=Qo,i.title="切换日间模式"),new q(".BottomGroup",!0,e=>{0!=Zo&&1==e.length&&$o()}));{let e=document.createElement("div"),t=(e.className="ex-icon",e.innerHTML=`<a title="DouyuEx-RL ver.${P}">${et}<i id="ex-icon__tip" class="ex-panel__tip"></i></a>`,document.querySelector(".PlayerToolbar-ContentCell .PlayerToolbar-Wealth"));t?t.insertBefore(e,t.childNodes[0]):(e.className+=" ToolbarGiftArea-backpack",e.style.width="52px",((t=document.querySelector(".ToolbarGiftArea-container"))?t.appendChild(e):(document.body&&document.body.appendChild(e))))}safeBind(".ex-icon", "click",qt);{let e=document.createElement("div"),t=(e.className="ex-panel",e.innerHTML='<button type="button" class="ex-panel__close" title="关闭工具条" aria-label="关闭 DouyuEx 工具条">×</button><div class="ex-panel__wrap"></div>',At());t?(l=document.querySelector(".PlayerToolbar"),e.style.bottom=l?l.offsetHeight+"px":"76px"):(t=jt(),e.classList.add("ex-panel--floating")),t.insertBefore(e,t.childNodes[0]),Pt(e),Dt()&&Ot(),initDockFull(e.querySelector(".ex-panel__wrap"))}{let _ep=document.querySelector(".ex-panel");if(_ep){let _c=_ep.querySelector(".ex-panel__close");if(_c)_c.addEventListener("click",e=>{e.stopPropagation(),Gt()})}};tl("Ex_Style_RealAudience",`

    .VideoEntry{display:none !important;}

	.layout-Player-rank{top:34px !important;}

    `);{let e=document.getElementsByClassName("VideoEntry")[0];e&&(e.style.display="none"),l="",(i=document.createElement("div")).className="real-audience",l+="<div style='flex: 1;white-space: nowrap'>",i.innerHTML='<div style=\'flex: 1;white-space: nowrap\'><div id=\'real-audience__t\' style=\'display: inline-block;margin-right:3px;\' title=\'今日累计观看人数\'><svg style="width:16px;height:16px" t="1566119680547" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3494" width="128" height="128"><path d="M712.820909 595.224609C807.907642 536.686746 870.40537 437.74751 870.40537 325.549212 870.400378 145.753547 709.943392 0 511.997503 0 314.055363 0 153.599626 145.753547 153.599626 325.549212 153.599626 437.74751 216.092361 536.686746 311.179092 595.219615 149.961841 657.72608 31.268214 793.205446 5.334335 955.968198 1.926253 962.195123 0 969.212275 0 976.638899 0 1002.324352 22.919038 1023.151098 51.198627 1023.151098 79.476967 1023.151098 102.396005 1002.324352 102.396005 976.638899L102.396005 1023.151098C102.396005 817.669984 285.787009 651.099674 511.997503 651.099674 738.212992 651.099674 921.602746 817.669984 921.602746 1023.151098L921.602746 976.638899C921.602746 1002.324352 944.523034 1023.151098 972.801376 1023.151098 1001.07472 1023.151098 1024 1002.324352 1024 976.638899 1024 969.212275 1022.073747 962.195123 1018.659424 955.968198 992.731789 793.205446 874.038157 657.72608 712.820909 595.224609ZM511.997503 558.080262C370.618285 558.080262 256.000624 453.967732 256.000624 325.545467 256.000624 197.121954 370.618285 93.009424 511.997503 93.009424 653.386707 93.009424 767.993133 197.121954 767.993133 325.545467 767.993133 453.972726 653.386707 558.080262 511.997503 558.080262L511.997503 558.080262Z" p-id="3495"></path></svg><span id="real-audience__total" style="color:#ed5a65">****</span></div><div style=\'display: inline-block;margin-right:3px;\' title=\'弹幕人数\'><svg t="1587796804183" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="20780" width="16" height="16"><path d="M811.8272 62.6176H212.1728c-79.9232 0-149.8624 69.9392-149.8624 149.9136v599.6032a150.3232 150.3232 0 0 0 149.8624 149.9136h599.6544a150.3232 150.3232 0 0 0 149.8624-149.9136V212.5312c0-79.9744-69.9392-149.9136-149.8624-149.9136zM263.5264 367.104c30.0032 0 49.9712 19.968 49.9712 49.9712s-19.968 49.92-49.9712 49.92-49.9712-19.968-49.9712-49.92 20.0192-49.9712 49.9712-49.9712z m449.6896 294.8096H263.5264c-24.9856 0-49.9712-24.9856-49.9712-49.9712s24.9856-49.9712 49.9712-49.9712h449.6896c24.9856 0 49.9712 24.9856 49.9712 49.9712s-24.9856 49.9712-49.9712 49.9712z m99.9424-199.68H463.4112c-24.9856 0-49.9712-24.9856-49.9712-49.9712s24.9856-49.9712 49.9712-49.9712h349.7472c24.9856 0 49.9712 24.9856 49.9712 49.9712s-24.9856 49.7664-49.9712 49.7664z" p-id="20781" fill="#1296db"></path></svg><span id="real-audience__barrage">****</span></div><div id=\'real-audience__noble-wrap\' style=\'display: inline-block;margin-right:3px;\' title=\'贵宾数\'><svg t="1779268394045" class="icon" viewBox="0 0 1170 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5245" width="16" height="16"><path d="M270.579175 30.138897S391.031549-36.125391 427.208548 36.176998c36.125391 18.062695 114.46588 463.798407 132.528575 548.176999 18.062695 90.365084 60.226187 120.452374 84.326983 84.326983s114.46588-126.490475 174.692068-265.057152-18.062695-156.629372-42.163492-150.591271c-24.100796 6.038101-150.591271 12.024594-108.427779-42.163491 48.201593-54.188086 156.629372-150.591271 186.716661-162.615866 54.188086-36.125391 138.566677-84.326983 210.817458-6.038101 42.163492 30.138897 144.55317 150.591271 48.201593 319.245238-96.403185 174.692067-475.874609 614.389678-475.87461 614.389678s-138.566677 90.365084-192.754762 0c-54.188086-84.326983-240.956355-554.163492-246.994456-614.389678 0-60.226187-18.062695-72.302389-48.201593-60.226187-30.138897 18.062695-90.365084 102.389678-96.403185 78.288882-5.986493-24.100796-60.174579-60.277795-24.049189-114.465881 30.138897-48.201593 216.855559-216.855559 240.956355-234.918254z" fill="#CCB88F" p-id="5246"></path></svg><span id="real-audience__noble">****</span></div><div id=\'real-audience__money\' style=\'display: inline-block;margin-right:3px;\' title=\'今日累计礼物价值\'><svg t="1579155265981" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6949" width="16" height="16"><path d="M136.96 67.413h181.76L512 452.693l193.28-385.28h181.76l-245.76 445.44h163.84v84.48h-211.2l-1.28 1.28v106.24h212.48v84.48H592.64v192H431.36v-192h-211.2v-84.48h211.2v-106.24l-1.28-1.28H220.16v-84.48h162.56z" fill="#F54330" p-id="6950"></path></svg><span id="real-audience__money_yc">****</span></div></div><span id="real-audience__time" style="white-space: nowrap;display: block;">已播:****</span><span id="real-audience__watchtime" style="white-space: nowrap;display: none;">已观看:****</span>',(l=E([".layout-Player-announce",".layout-Player-rankAll"]))&&l.insertBefore(i,l.childNodes[0])}safeBind(".real-audience", "click",function(){_("https://www.doseeing.com/room/"+B,!0)});var t,o,i=document.querySelectorAll(".VideoEntry-tabItem>a")[0];null!=i&&(l=i.href+"?type=video",i=i.href+"?type=liveReplay",n=document.createElement("div"),ln=!!document.getElementsByClassName("Title-anchorPic-bottom")[0],n.className=ln?"":"Title-anchorPic-bottom",n.innerHTML=`

	<div id="Ex_VideoReview" class="Title-anchorPic-bottomItem"><span>回看</span></div>

	<i style="top: 28px"></i>

	<div id="Ex_VideoSubmit" class="Title-anchorPic-bottomItem"><span>投稿</span></div>

	`,(r=document.getElementsByClassName("Title-anchorPic-bottom")[0]||document.getElementsByClassName("Title-anchorPicBack")[0]).insertBefore(n,r.childNodes[0]),n=document.createElement("div"),ln=!!document.getElementsByClassName("Title-anchorPic-bottom")[0],n.className=ln?"":"Title-anchorPic-bottom",n.innerHTML=`

	<div id="Ex_EnterYuba" class="Title-anchorPic-bottomItem"><span>打开鱼吧</span></div>

	`,(r=document.getElementsByClassName("Title-anchorPic-bottom")[0]||document.getElementsByClassName("Title-anchorPicBack")[0]).insertBefore(n,r.childNodes[0]),t=l,o=i,safeBind("#Ex_VideoSubmit", "click",()=>{_(t,!0)}),safeBind("#Ex_VideoReview", "click",()=>{_(o,!0)}),safeBind("#Ex_EnterYuba", "click",async()=>{var e;e=B,_((await new Promise((t,o)=>{fetch("https://www.douyu.com/wgapi/yubanc/api/group/getBindGroup?room_id="+e).then(e=>e.json()).then(e=>{t(e)}).catch(e=>{o(e)})})).data.group_url,!0)}),document.getElementsByClassName("Title-anchorPic-bottom")[0].style.display="none",document.getElementsByClassName("Title-anchorPic-bottom")[0].style.height=ln?"66px":"22px",safeBind(".Title-anchorPicBack", "mouseenter",()=>{document.getElementsByClassName("Title-anchorPic-bottom")[0].style.display="block"}),safeBind(".Title-anchorPicBack", "mouseleave",()=>{document.getElementsByClassName("Title-anchorPic-bottom")[0].style.display="none"})),fetch("https://www.douyu.com/swf_api/h5room/"+B,{method:"GET",mode:"no-cors",credentials:"include"}).then(e=>e.json()).then(e=>{j.showtime=e.data.show_time,j.isShow=e.data.show_status,dn(),setInterval(dn,15e4),setInterval(cn,5e3)}).catch(e=>{console.log("请求失败!",e)});{let e=document.createElement("div"),t=(e.className="Title-blockInline",e.id="copy-real-live",e.innerHTML='<div class="TitleShare"><div class="TitleShare-shareBox "><div class="Title-row-span is-right"><span class="Title-row-icon "><svg t="1585641756842" class="icon" viewBox="0 0 1237 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5646" width="16" height="16"><path d="M648.448 946.347l0.256-1.622-0.256 1.622z m84.31 13.354c-0.769 4.608-0.769 4.608-4.182 13.483-8.533 16.768-8.533 16.768-49.835 22.784-24.149-14.293-24.149-14.293-27.605-22.613-2.475-5.718-2.475-5.718-3.541-9.387L476.416 335.36l-103.083 499.2c-1.109 5.12-1.109 5.12-4.821 13.27-6.827 12.117-6.827 12.117-35.285 22.527-30.294-7.253-30.294-7.253-38.742-19.37-4.522-8.15-4.522-8.15-6.058-13.227l-74.582-262.357H0v-85.334h278.272l45.781 161.11 104.022-503.424c1.024-4.694 1.024-4.694 4.394-12.502 6.102-11.989 6.102-11.989 35.968-23.338 31.83 8.533 31.83 8.533 39.254 20.736 4.053 7.808 4.053 7.808 5.376 12.544l165.888 609.237 113.92-716.885c0.896-5.248 0.896-5.248 4.864-14.592 9.088-15.574 9.088-15.574 44.928-22.4C868.48 12.587 868.48 12.587 873.6 22.443c3.285 6.912 3.285 6.912 4.523 11.52l112 446.549h221.738v85.333H923.563l-78.507-312.917-112.299 706.773z" p-id="5647"></path></svg></span><span class="Title-row-text">复制直播流</span></div></div></div>',document.getElementsByClassName("Title-col")[4]);t&&1<t.childNodes.length?t.insertBefore(e,t.childNodes[1]):(t=E([".subTitleContainer__-vzhr"]))&&t.appendChild(e)}safeBind("#copy-real-live", "click",Ge);var n=document.getElementsByClassName("RecommendViewTit-04ebd8");0<n.length&&n[0].innerText;{let e=document.createElement("div"),t=(e.className="Title-blockInline",e.id="ex-audio-line",e.innerHTML='<div class="TitleShare"><div class="TitleShare-shareBox "><div class="Title-row-span  is-right"><span class="Title-row-icon "><svg t="1613808136306" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2829" width="16" height="16"><path d="M496 64A48 48 0 0 1 544 112v800a48 48 0 0 1-96 0v-800A48 48 0 0 1 496 64z m-224 128A48 48 0 0 1 320 240v544a48 48 0 0 1-96 0v-544A48 48 0 0 1 272 192z m448 0A48 48 0 0 1 768 240v544a48 48 0 0 1-96 0v-544A48 48 0 0 1 720 192z m-672 128A48 48 0 0 1 96 368v288a48 48 0 0 1-96 0v-288A48 48 0 0 1 48 320z m896 0a48 48 0 0 1 48 48v288a48 48 0 0 1-96 0v-288a48 48 0 0 1 48-48z" p-id="2830"></path></svg></span><span class="Title-row-text ">切换音频线路</span></div></div></div>',document.getElementsByClassName("Title-col")[4]);t&&1<t.childNodes.length?t.insertBefore(e,t.childNodes[1]):(t=E([".subTitleContainer__-vzhr"]))&&t.appendChild(e)}safeBind("#ex-audio-line", "click",le);{let o=setInterval(()=>{if(null!=E([".PlayerToolbar-ContentCell .PlayerToolbar-Wealth","#js-backpack-enter"])){clearInterval(o),document.getElementById("js-barrage-list").parentNode.id="js-barrage-list-parent";var e=document.createElement("div"),t=(e.style="position: absolute;right: 5px;top: 40px;cursor: pointer;",e.id="ex-removeMsgNotice",e.innerHTML='<label id="msg-removeNotice" style="cursor: pointer;"><input type="checkbox" />关闭角标提醒</label>',e.title="关闭角标提醒",document.getElementsByClassName("PrivateLetter-frame")[0]),t=(t&&t.appendChild(e),document.getElementById("msg-removeNotice"));if(t){let e=t.querySelector("input");t.addEventListener("click",()=>{1==e.checked?(vn=1,xn()):(vn=0,U("Ex_Style_RemoveMsgNotice")),localStorage.setItem("ExSave_isRemoveMsgNotice",vn)})}e=localStorage.getItem("ExSave_isRemoveMsgNotice");e&&"1"==e&&(vn=1,xn(),e=document.getElementById("msg-removeNotice"))&&(e.querySelector("input").checked=!0)}},1e3)}{let e=setInterval(()=>{void 0!==document.getElementsByClassName("BarrageFilter")[0]&&(clearInterval(e),new q(".BarrageFilter",!1,e=>{if(0!==e.length&&(0<e[0].addedNodes.length&&0===e[0].removedNodes.length))if(document.getElementsByClassName("FilterKeywords")[0])qn();else{let e=setInterval(()=>{document.getElementsByClassName("FilterKeywords")[0]&&(clearInterval(e),qn())},50)}}))},1e3)}{let o=E([".BackpackButton","#js-backpack-enter"]);o&&o.addEventListener("click",function(){setTimeout(()=>{de&&(de.closeHook(),de=null);let t=document.querySelectorAll(".ToolbarBackpack-giftItem").length;de=new q(".BackpackExpandPanel-giftListWrap",!0,e=>{t!=document.querySelectorAll(".ToolbarBackpack-giftItem").length&&(o.click(),o.click())})},500),clearTimeout(se),se=setTimeout(()=>{let p=!!document.getElementsByClassName("BackpackExpandPanel")[0];E([".Backpack.JS_Backpack",".BackpackExpandPanel"])&&pt(B,n=>{var i=n.data.list.length;if(0<i){let t=0,o=0;for(let e=0;e<i;e++){var a=(e=>{for(var t of e){let e=[];if(0<(e="string"==typeof t?document.querySelectorAll(t):t).length)return e}return[]})([".Backpack-prop",".ToolbarBackpack-giftItem"])[e],r=n.data.list[e].isValuable,l=n.data.list[e].expiry,s=n.data.list[e].price,d=n.data.list[e].intimate,c=n.data.list[e].count,r=("1"==r&&(t+=Number(s)*Number(c)),o+=Number(d)*Number(c),document.createElement("div"));r.className="bag-info",p&&(r.style.left="8px",r.style.bottom="auto"),r.innerHTML=l-1,a.insertBefore(r,a.childNodes[0])}var e=E([".BackpackHeader-extInfo",".BackpackExpandPanel-backpackHeader"]);p?e.innerHTML=e.innerHTML+`<span style="width: 100%;display: flex;justify-content: space-between;align-items: center;flex: 1;margin-left: 12px;">

                                <span>

                                    <span>总价值:</span>

                                    <span>￥${String(Number(t/100).toFixed(2))}</span>

                                    <span>总亲密度:</span>

                                    <span>${String(o)}</span>

                                </span>

                                <span class="bag-button" id="Backpack__clearbag" style="background: rgb(70, 171, 255) !important;color: white !important;">清空背包</span>

                            </span>`:e.innerHTML='<span style="float: left">总价值：'+String(Number(t/100).toFixed(2))+" 总亲密度："+String(o)+'<span class="bag-button" id="Backpack__clearbag">清空背包</span></span>'+e.innerHTML,safeBind("#Backpack__clearbag", "click",()=>{1==confirm("确认清空？")&&(T("【清空背包】执行中...","info"),pt(B,e=>{(async(n,i)=>{var t=n.data.list.length;if(0<t){for(let e=0;e<t;e++){let t=n.data.list[e].id,o=n.data.list[e].count;if(0<Object.keys(n.data.list[e].batchInfo).length)await b(100).then(()=>{Ut(t,o,i)});else for(let e=0;e<o;e++)await b(100).then(()=>{Ut(t,1,i)})}T("【清空背包】执行完毕！","success")}else T("背包礼物为空","error")})(e,B)}))})}})},500)})}var r=document.createElement("div"),l=(r.className="ex-update",r.innerHTML='<a class="ex-panel__icon" title="版本更新，当前版本'+P+'"><svg t="1578767541873" style="display:block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="23715" width="32" height="32"><path d="M768 810.7H512c-23.6 0-42.7-19.1-42.7-42.7s19.1-42.7 42.7-42.7h256c94.1 0 170.7-76.6 170.7-170.7 0-89.6-70.1-164.3-159.5-170.1L754 383l-10.7-22.7c-42.2-89.3-133-147-231.3-147s-189.1 57.7-231.3 147L270 383l-25.1 1.6c-89.5 5.8-159.5 80.5-159.5 170.1 0 94.1 76.6 170.7 170.7 170.7 23.6 0 42.7 19.1 42.7 42.7s-19.1 42.7-42.7 42.7c-141.2 0-256-114.8-256-256 0-126.1 92.5-232.5 214.7-252.4C274.8 195.7 388.9 128 512 128s237.2 67.7 297.3 174.2C931.5 322.1 1024 428.6 1024 554.7c0 141.1-114.8 256-256 256z" fill="#3688FF" p-id="23716"></path><path d="M554.7 938.7c-10.9 0-21.8-4.2-30.2-12.5l-128-128c-16.7-16.7-16.7-43.7 0-60.3l128-128c16.6-16.7 43.7-16.7 60.3 0 16.7 16.7 16.7 43.7 0 60.3L487 768l97.8 97.8c16.7 16.7 16.7 43.7 0 60.3-8.3 8.4-19.2 12.6-30.1 12.6z" fill="#5F6379" p-id="23717"></path></svg><i id="ex-update__tip" class="ex-panel__tip"></i></a>',document.getElementsByClassName("ex-panel__wrap")[0]);l&&l.insertBefore(r,l.childNodes[0]);var i=document.createElement("div"),l=(i.className="ex-monitor",i.innerHTML='<a class="ex-panel__icon" title="在线弹幕助手"><svg style="display:block;" t="1638235744961" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="69800" width="32" height="32"><path d="M426.666667 106.666667a21.333333 21.333333 0 0 1 21.333333-21.333334h512a21.333333 21.333333 0 0 1 0 42.666667H448a21.333333 21.333333 0 0 1-21.333333-21.333333z m533.333333 789.333333H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667z m0-554.666667H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667z m0 298.666667H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667zM245.333333 42.666667H96a53.393333 53.393333 0 0 0-53.333333 53.333333v149.333333a53.393333 53.393333 0 0 0 53.333333 53.333334h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333334V96a53.393333 53.393333 0 0 0-53.333334-53.333333z m0 341.333333H96a53.393333 53.393333 0 0 0-53.333333 53.333333v149.333334a53.393333 53.393333 0 0 0 53.333333 53.333333h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333333V437.333333a53.393333 53.393333 0 0 0-53.333334-53.333333z m0 341.333333H96a53.393333 53.393333 0 0 0-53.333333 53.333334v149.333333a53.393333 53.393333 0 0 0 53.333333 53.333333h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333333v-149.333333a53.393333 53.393333 0 0 0-53.333334-53.333334z" fill="#13227a" p-id="69801"></path></svg><i id="Monitor__tip" class="ex-panel__tip"></i></a>',document.getElementsByClassName("ex-panel__wrap")[0]),i=((l&&l.insertBefore(i,l.childNodes[0])),safeBind(".ex-monitor", "click",function(){_("https://www.douyuex.com/"+String(B))}),(async()=>{var t=[],e=await fetch("https://www.douyu.com/member/cp/getFansBadgeList",{method:"GET",mode:"no-cors",cache:"default",credentials:"include"}).then(e=>e.text()).catch(e=>{console.log("请求失败!",e)}),o=(e=(new DOMParser).parseFromString(e,"text/html")).getElementsByClassName("fans-badge-list")[0].lastElementChild,n=o.children.length;for(let e=0;e<n;e++){var i=o.children[e].getAttribute("data-fans-room");t.push(i)}To=t})(),document.createElement("div")),l=(i.className="exlottery",i.innerHTML=`

        <div class="lottery__func">

            <div id="lottery-refresh">

                <svg t="1636115506027" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2454" width="16" height="16"><path d="M927.999436 531.028522a31.998984 31.998984 0 0 0-31.998984 31.998984c0 51.852948-10.147341 102.138098-30.163865 149.461048a385.47252 385.47252 0 0 1-204.377345 204.377345c-47.32295 20.016524-97.6081 30.163865-149.461048 30.163865s-102.138098-10.147341-149.461048-30.163865a385.47252 385.47252 0 0 1-204.377345-204.377345c-20.016524-47.32295-30.163865-97.6081-30.163865-149.461048s10.147341-102.138098 30.163865-149.461048a385.47252 385.47252 0 0 1 204.377345-204.377345c47.32295-20.016524 97.6081-30.163865 149.461048-30.163865a387.379888 387.379888 0 0 1 59.193424 4.533611l-56.538282 22.035878A31.998984 31.998984 0 1 0 537.892156 265.232491l137.041483-53.402685a31.998984 31.998984 0 0 0 18.195855-41.434674L639.723197 33.357261a31.998984 31.998984 0 1 0-59.630529 23.23882l26.695923 68.502679a449.969005 449.969005 0 0 0-94.786785-10.060642c-60.465003 0-119.138236 11.8488-174.390489 35.217667a449.214005 449.214005 0 0 0-238.388457 238.388457c-23.361643 55.252253-35.22128 113.925486-35.22128 174.390489s11.8488 119.138236 35.217668 174.390489a449.214005 449.214005 0 0 0 238.388457 238.388457c55.252253 23.368867 113.925486 35.217667 174.390489 35.217667s119.138236-11.8488 174.390489-35.217667A449.210393 449.210393 0 0 0 924.784365 737.42522c23.368867-55.270316 35.217667-113.925486 35.217667-174.390489a31.998984 31.998984 0 0 0-32.002596-32.006209z" fill="" p-id="2455"></path></svg>

            </div>

            <div class="lottery__notice">

                <label class="lottery__notice"><input class="lottery__notice" id="lottery-notice" type="checkbox">开启提醒</label>

            </div>

        </div>

        <div class="lottery__nodata">暂无数据</div>

        <div class="lottery__wrap"></div>

    `,(document.getElementsByClassName("layout-Player-chat")[0]||document.body)),i=((l&&l.insertBefore(i,l.childNodes[0])),document.createElement("div")),l=(i.className="ex-lottery",i.innerHTML='<a class="ex-panel__icon" title="全站抽奖信息"><svg style="display:block;" t="1636332741708" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="19181" width="32" height="32"><path d="M508.858182 986.042182c-261.748364 0-473.925818-212.177455-473.925818-473.925818S247.109818 38.190545 508.858182 38.190545s473.925818 212.177455 473.925818 473.925819-212.200727 473.925818-473.925818 473.925818m0-981.690182C228.421818 4.352 1.093818 231.703273 1.093818 512.116364s227.351273 507.764364 507.764364 507.764363c280.413091 0 507.787636-227.351273 507.787636-507.764363S789.271273 4.352 508.858182 4.352" fill="#FF4517" p-id="19182"></path><path d="M322.536727 512.302545l0.023273-1.326545-313.064727-1.931636c0 1.093818-0.093091 2.164364-0.093091 3.281454 0 90.88 24.785455 175.918545 67.84 248.925091l270.173091-155.997091a185.274182 185.274182 0 0 1-24.878546-92.951273zM416.791273 350.440727L264.029091 82.013091A492.986182 492.986182 0 0 0 77.498182 262.981818l270.173091 155.997091a186.717091 186.717091 0 0 1 69.12-68.538182zM602.856727 351.697455l151.831273-259.211637A488.261818 488.261818 0 0 0 508.718545 21.690182l0.023273 304.453818c34.350545 0 66.513455 9.355636 94.114909 25.553455zM258.536727 939.450182a488.471273 488.471273 0 0 0 241.710546 63.674182c2.839273 0 5.632-0.139636 8.448-0.186182V698.507636a185.064727 185.064727 0 0 1-94.068364-25.553454l-156.090182 266.496zM927.325091 270.452364l-257.466182 148.666181a185.204364 185.204364 0 0 1 25.041455 93.207273l-0.046546 1.070546 296.168727 1.838545c0.023273-0.977455 0.069818-1.931636 0.069819-2.909091 0-87.994182-23.249455-170.496-63.767273-241.873454zM600.855273 674.094545l148.573091 261.073455a492.776727 492.776727 0 0 0 178.106181-181.387636l-257.466181-148.642909a187.042909 187.042909 0 0 1-69.213091 68.95709z" fill="#FF4517" p-id="19183"></path><path d="M644.142545 512.302545a135.400727 135.400727 0 0 0-135.424-135.400727l-84.619636-160.791273 20.642909 173.824c-42.658909 22.784-71.400727 70.609455-71.400727 122.368a135.447273 135.447273 0 0 0 270.801454 0z m-133.492363 70.097455a68.491636 68.491636 0 1 1 0.023273-136.96 68.491636 68.491636 0 0 1-0.023273 136.96z" fill="#FF4517" p-id="19184"></path></svg><i id="lottery__tip" class="ex-panel__tip"></i></a>',document.getElementsByClassName("ex-panel__wrap")[0]);(l&&l.insertBefore(i,l.childNodes[0]));{let t=document.getElementById("lottery-notice");safeBind(".ex-lottery", "click",()=>{ee("全站抽奖信息");var e=document.getElementsByClassName("lottery__wrap")[0];e&&(e.innerHTML=So)}),safeBind("#lottery-refresh", "click",((o,n)=>{let i;return function(){var e=arguments,t=(i&&clearTimeout(i),!i);i=setTimeout(()=>{i=null},n),t&&o.apply(this,e)}})(()=>{Lo()},3e3)),t&&t.addEventListener("click",()=>{var e=t.checked;Mo=1==e,e={isNotice:Mo},localStorage.setItem("ExSave_Lottery",JSON.stringify(e))})}i=localStorage.getItem("ExSave_Lottery"),null!=i&&1==JSON.parse(i).isNotice&&(t=document.getElementById("lottery-notice"))&&t.click(),No=setInterval(()=>{Lo()},6e4),l=document.createElement("div"),l.className="popup-player",l.innerHTML='<a class="ex-panel__icon" title="同屏播放"><svg style="display:block;" t="1579448049771" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1804" width="30" height="30"><path d="M353.024 900.416H109.952c-57.856 0-109.952-46.336-109.952-98.432V153.6c0-52.096 52.096-98.432 109.952-98.432h810.176c57.856 0 104.192 46.336 104.192 98.496v185.472c0 28.928-23.168 52.096-46.336 52.096s-46.272-23.168-46.272-52.096V159.36H98.368V807.68h248.896c34.688 0 52.032 17.408 52.032 46.336 0 28.928-17.344 46.272-46.272 46.272" fill="#f26b1f" p-id="1805"></path><path d="M619.2 631.488c-5.76 0-5.76 5.76-5.76 11.52v223.04c0 5.76 5.76 11.52 5.76 11.52h289.344c5.76 0 11.584-5.76 11.584-11.52v-222.976c0-5.824-5.76-11.584-11.52-11.584H619.136z m289.344 338.688h-289.28a103.68 103.68 0 0 1-104.192-104.128v-222.976c0-57.92 46.272-109.952 104.128-109.952h289.344c57.856 0 104.128 46.272 104.128 109.952v222.976c5.824 57.856-40.448 104.128-104.128 104.128z" fill="#f26b1f" p-id="1806"></path></svg><i id="popup-player__tip" class="ex-panel__tip"></i></a>',i=document.getElementsByClassName("ex-panel__wrap")[0],(i&&i.insertBefore(l,i.childNodes[0])),l=document.createElement("div"),i="",l.className="postbird-box-container",l.id="popup-player__prompt",i+='<div class="postbird-box-dialog">',l.innerHTML='<div class="postbird-box-dialog"><div style="min-height:170px" class="postbird-box-content"><div class="postbird-box-header"><span class="postbird-box-title"><span>请输入直播间/直播流地址：</span></span></div><div class="postbird-box-text"><input id="popup-player__url" value="https://www.douyu.com/4042402" style="height:30px;box-sizing:border-box" type="text" class="postbird-prompt-input" autofocus="true"><label style="margin-right:30px" title="【直播流模式】&#10;1. 速度快&#10;2. 延迟低&#10;3. 占用少&#10;4. 不会进入直播间&#10;5. 支持斗鱼/虎牙/Bilibili"><input id="popup-player__noiframe" type="radio" name="sex" value="无弹幕" checked="checked">无弹幕(推荐)</label><label title="【框架模式】&#10;1. 速度慢&#10;2. 占用高&#10;3. 会进入直播间&#10;4. 仅支持斗鱼&#10;此模式拖动不是很灵活，请尽量在标题栏小幅度拖动&#10;若拖动无反应请点击页面任意处触发移动"><input id="popup-player__iframe" type="radio" name="sex" value="有弹幕">有弹幕</label></div><div class="postbird-box-footer"><button id="popup-player__cancel" class="btn-footer btn-left-footer btn-footer-cancel" style="color:undefined;">取消</button><button id="popup-player__ok" class="btn-footer btn-right-footer btn-footer-ok" style="color:#0e90d2;">确定</button></div></div>',(i=E([".layout-Main",".playerWrap__8wGvw",".live-next-body"]))&&i.insertBefore(l,i.childNodes[0]),safeBind(".popup-player", "click",function(e){if(e&&e.stopPropagation)e.stopPropagation();handleDockAction("popup-player");}),safeBind("#popup-player__cancel", "click",function(){document.getElementById("popup-player__prompt").style.display="none"}),safeBind("#popup-player__ok", "click",function(){var a,t=document.getElementById("popup-player__url").value;if(""!=t){var o,n,i,r=document.getElementById("popup-player__noiframe").checked;let e=!1;if(e=150<t.length&&1==window.confirm("你输入的是直播流吗？")?!0:e)rn(D.length,t);else if(1==r)if(-1!=t.indexOf("douyu.com"))a=e=>{en(D.length,e,"Douyu")},fetch(t,{method:"GET",mode:"no-cors",cache:"default",credentials:"include"}).then(e=>e.text()).then(e=>{var t=(e=(new DOMParser).parseFromString(e,"text/html")).getElementsByTagName("html")[0].innerHTML,o="$ROOM.room_id =".length,n=t.indexOf("$ROOM.room_id =");let i="";0<n?i=(i=t.substring(n+o,t.indexOf(";",n+o))).trim():(i=v(t,"roomID:",","))?i=i.trim():(n=e.querySelector('link[rel="canonical"]'))&&(o=n.getAttribute("href"),i=o.split("/").pop().trim()),1==!!/^[0-9]+$/.test(i)?a(i):T("获取直播间失败，请检查直播间地址是否正确！","error")}).catch(e=>{console.log("请求失败!",e)});else if(-1!=t.indexOf("bilibili.com")){var r=t,l=e=>{en(D.length,e,"Bilibili")};r=(r=r.split("/"))[r.length-1],GM_xmlhttpRequest({method:"GET",url:"https://api.live.bilibili.com/room/v1/Room/room_init?id="+r,responseType:"json",onload:function(e){e=e.response;l(e.data.room_id)}})}else-1!=t.indexOf("huya.com")?en(D.length,t,"Huya"):rn(D.length,t);else{r=D.length;if(-1==String(t).indexOf("douyu.com"))T("有弹幕模式仅支持斗鱼直播","error");else{i=String(t).split("/"),i=i[i.length-1],o=document.createElement("div"),n="",o.id="exVideoDiv"+String(r),o.rid=i,o.className="exVideoDiv",n=(n=(n=(n+="<div class='exVideoInfo' id='exVideoInfo"+String(r)+"'><span class='exVideoRID' id='exVideoRID"+String(r)+"' style='color:white'>斗鱼 - "+i+"</span>")+"<a><div class='exVideoClose' id='exVideoClose"+String(r)+"'>X</div></a></div>")+"<iframe class='exVideoPlayer' id='exVideoPlayer"+String(r)+"' src="+t+"?exid=chun></iframe>")+"<div class='exVideoScale' id='exVideoScale"+String(r)+"'></div>",o.innerHTML=n,(i=E([".layout-Main",".playerWrap__8wGvw",".live-next-body"]))&&i.insertBefore(o,i.childNodes[0]),on(r),tn(r),r>D.length-1?D.push("iframe"):D[r]="iframe";{var s=r;let e=document.getElementById("exVideoDiv"+String(s)),t=document.getElementById("exVideoClose"+String(s));t.onclick=function(){D[s].destroy(),e.remove()},e.onclick=function(e){e.stopPropagation(),e.preventDefault();for(let e=0;e<D.length;e++){var t=document.getElementById("exVideoDiv"+String(e));null!=t&&(e==s?t.style.zIndex=1016:t.style.zIndex=1428)}}}}}}else T("请输入地址","error");document.getElementById("popup-player__prompt").style.display="none"}),safeBind("#popup-player__prompt", "keydown",function(t){var o=window.event||e;13==(o.keyCode||o.which||o.charCode)&&document.getElementById("popup-player__ok").click()}),l=document.createElement("div"),l.className="livetool",i=(document.getElementsByClassName("layout-Player-chat")[0]||document.body),i.insertBefore(l,i.childNodes[0]),l=document.createElement("div"),l.className="livetool-icon",l.innerHTML='<a class="ex-panel__icon" title="直播间工具"><svg t="1590294900594" style="display:block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="20028" width="36" height="36"><path d="M352.2 245.3c-5.1 0-10.2-2-14.1-5.9L196.6 98c-7.8-7.8-7.8-20.5 0-28.3s20.5-7.8 28.3 0l141.4 141.4c7.8 7.8 7.8 20.5 0 28.3-3.9 3.9-9 5.9-14.1 5.9zM477.1 245.3c-5.1 0-10.2-2-14.1-5.9-7.8-7.8-7.8-20.5 0-28.3L604.3 69.7c7.8-7.8 20.5-7.8 28.3 0 7.8 7.8 7.8 20.5 0 28.3L491.2 239.4c-3.9 3.9-9 5.9-14.1 5.9z" fill="#0C2B4A" p-id="20029"></path><path d="M703.9 194.8H124.2c-33 0-60 27-60 60v453c0 33 27 60 60 60h418c1.7-122.5 99.6-221.8 221.7-225.5V254.8c0-33-27-60-60-60zM533.4 522.9L356.3 625.2c-24 13.9-54-3.5-54-31.2V389.5c0-27.7 30-45 54-31.2l177.1 102.2c24 13.9 24 48.6 0 62.4zM815.2 776.4c0 21.9-17.8 39.7-39.7 39.7-21.9 0-39.7-17.8-39.7-39.7 0-21.9 17.8-39.7 39.7-39.7 21.9 0 39.7 17.8 39.7 39.7z" fill="#0C2B4A" p-id="20030"></path><path d="M775.5 591C673.6 591 591 673.6 591 775.5S673.6 960 775.5 960 960 877.4 960 775.5 877.4 591 775.5 591zM879 819l-15.6 27c-2.1 3.6-6.8 4.9-10.4 2.8l-15.5-8.9c-2.7-1.6-6.1-1.3-8.5 0.6-7.5 5.9-15.9 10.6-25.1 13.8-3 1.1-5.1 4-5.1 7.2v18.7c0 4.2-3.4 7.6-7.6 7.6H760c-4.2 0-7.6-3.4-7.6-7.6v-18.5c0-3.3-2.1-6.2-5.1-7.2-9.3-3.2-17.9-7.8-25.5-13.7-2.4-1.9-5.8-2.2-8.5-0.6l-15.2 8.8c-3.6 2.1-8.3 0.9-10.4-2.8l-15.6-27c-2.1-3.6-0.8-8.3 2.8-10.4l12.2-7.1c3-1.7 4.5-5.2 3.7-8.5-1.7-6.8-2.6-13.8-2.6-21.1 0-4.1 0.3-8.2 0.9-12.2 0.4-3.1-1-6.1-3.7-7.7l-10.5-6.1c-3.6-2.1-4.9-6.8-2.8-10.4l15.6-27c2.1-3.6 6.8-4.9 10.4-2.8l7.8 4.5c2.9 1.7 6.6 1.3 9-1.1 9.1-8.7 20-15.5 32.2-19.7 3.1-1 5.1-4 5.1-7.2v-7.9c0-4.2 3.4-7.6 7.6-7.6H791c4.2 0 7.6 3.4 7.6 7.6v8.1c0 3.2 2 6.1 5.1 7.2 12.1 4.2 22.9 10.9 31.9 19.6 2.4 2.4 6.1 2.8 9.1 1.1l8.2-4.7c3.6-2.1 8.3-0.8 10.4 2.8l15.6 27c2.1 3.6 0.9 8.3-2.8 10.4l-11 6.3c-2.7 1.6-4.1 4.6-3.7 7.7 0.6 3.9 0.8 8 0.8 12.1 0 7.2-0.9 14.1-2.5 20.8-0.8 3.3 0.7 6.7 3.6 8.3l12.8 7.4c3.7 2.1 5 6.8 2.9 10.4z" fill="#0C2B4A" p-id="20031"></path></svg><i id="LiveTool__tip" class="ex-panel__tip"></i></a>',i=document.getElementsByClassName("ex-panel__wrap")[0],(i&&i.insertBefore(l,i.childNodes[0])),l=document.createElement("div"),l.className="livetool__cell",l.innerHTML=`

        <div class='livetool__cell_title'>

            <span id='vote__title'>弹幕投票</span><span id='vote__show-result'>面板</span>

        </div>

        <div class='livetool__cell_option'>

            <label style="margin-right:10px;"><input id="vote__repeat" type="checkbox">重复投票</label>

            <div class="onoffswitch livetool__cell_switch">

                <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="vote__switch" tabindex="0" checked>

                <label class="onoffswitch-label" for="vote__switch"></label>

            </div>

        </div>

    `+`

        <div class='vote__panel'>

            <select id='vote__select'>

            </select>

            <input style="width:40px;margin-left:10px;" type="button" id="vote__add" value="添加"/>

            <input style="width:40px;margin-left:10px;" type="button" id="vote__del" value="删除"/>

            <label style="margin-left:5px">限时：<input id="vote__time" type="text" placeholder="秒" /></label>

            <div class="vote__option">

                <label>主题：<input id="vote__theme" type="text"/></label>

                <label>选项：<input id="vote__options" type="text" placeholder="用空格隔开每个选项"/></label>

            </div>

        </div>

    `,i=document.getElementsByClassName("livetool")[0];i&&i.insertBefore(l,i.childNodes[0]);{let e=document.createElement("div"),t=(e.className="vote__result",e.innerHTML=`

        <div id="vote__result-theme">投票主题</div>

        <div id="vote__result-close">X</div>

        <div id="vote__result-options"></div>

    `,E([".layout-Player-main","main"])),a=(t&&t.insertBefore(e,t.childNodes[0]),document.getElementsByClassName("vote__result")[0]);if(a){if(typeof ensureMiuixPanelHeader==="function")ensureMiuixPanelHeader(a,"弹幕投票结果");a.onmousedown=function(e){e.stopPropagation();let t=e.clientX-a.offsetLeft,o=e.clientY-a.offsetTop,n,i;document.onmousemove=function(e){e.stopPropagation(),n=e.clientX-t,i=e.clientY-o,a.style.left=n+"px",a.style.top=i+"px"},document.onmouseup=function(e){e.stopPropagation(),document.onmousemove=null,document.onmouseup=null}},safeBind("#vote__result-close", "click",()=>{document.getElementsByClassName("vote__result")[0].style.display="none"})}}safeBind("#vote__switch", "click",()=>{var e=safeEl("vote__switch").checked,t=document.getElementById("vote__select"),t=t.options[t.selectedIndex].text,o=vo[t].options,n=vo[t].time;if(1==e){var i=String(o).split(" ");for(let e=0;e<i.length;e++)wo[i[e]]={num:0,index:e};safeEl("vote__repeat").disabled=!0,_o=0,e=t,t=o,safeEl("vote__result-theme").innerText=e,safeEl("vote__result-options").innerHTML="";var a=t.split(" "),r=document.getElementById("vote__result-options");for(let e=0;e<a.length;e++){var l=document.createElement("div");l.className="vote__option-wrap",l.innerHTML=`

            <div class="vote__option-choice">${a[e]}</div>

            <div class="vote__option-num"></div>

            <div class="vote__progress">

                <div class="vote__progress-bar"></div>

            </div>

        `,r.appendChild(l)}Eo=document.getElementById("vote__repeat").checked,bo=!0,ko=setTimeout(()=>{xo={},wo={},bo=!1,safeEl("vote__repeat").disabled=!1,safeEl("vote__switch").checked=!1},1e3*n);var _vr=document.getElementsByClassName("vote__result")[0];if(_vr){_vr.style.display="block";if(typeof ensureMiuixPanelHeader==="function")ensureMiuixPanelHeader(_vr,"弹幕投票结果");}}else clearTimeout(ko),xo={},wo={},bo=!1,safeEl("vote__repeat").disabled=!1}),safeBind("#vote__title", "click",()=>{var e=document.getElementsByClassName("vote__panel")[0];"block"!=e.style.display?((e.style.display="block")==document.getElementsByClassName("mute__panel")[0].style.display&&(document.getElementsByClassName("mute__panel")[0].style.display="none"),"block"==document.getElementsByClassName("enter__panel")[0].style.display&&(document.getElementsByClassName("enter__panel")[0].style.display="none"),"block"==document.getElementsByClassName("gift__panel")[0].style.display&&(document.getElementsByClassName("gift__panel")[0].style.display="none"),"block"==document.getElementsByClassName("reply__panel")[0].style.display&&(document.getElementsByClassName("reply__panel")[0].style.display="none")):e.style.display="none"}),safeEl("vote__select").onclick=function(){var e,t,o;0!=this.options.length&&(e=this.options[this.selectedIndex].text,t=vo[e].options,o=vo[e].time,safeEl("vote__theme").value=e,safeEl("vote__options").value=t,safeEl("vote__time").value=o)},safeBind("#vote__add", "click",()=>{var e=document.getElementById("vote__select"),t=safeEl("vote__theme").value,o=safeEl("vote__options").value,n=safeEl("vote__time").value;""!=t&&""!=o&&""!=n&&(vo[t]={options:o,time:n},e.options.add(new Option(t,"")),Bo())}),safeBind("#vote__del", "click",()=>{var e=document.getElementById("vote__select"),t=e.options[e.selectedIndex].text;delete vo[t],e.options.remove(e.selectedIndex),Bo()}),safeBind("#vote__show-result", "click",()=>{var e=document.getElementsByClassName("vote__result")[0];if(e){if("block"!=e.style.display){e.style.display="block";if(typeof ensureMiuixPanelHeader==="function")ensureMiuixPanelHeader(e,"弹幕投票结果");}else{e.style.display="none";}}}),safeEl("vote__switch").checked=mo;l=localStorage.getItem("ExSave_Vote");if(null!=l){var s,d=JSON.parse(l),p=(vo=d,document.getElementById("vote__select"));for(s in d)d.hasOwnProperty(s)&&p.options.add(new Option(s,""))}i=document.createElement("div"),i.className="livetool__cell",i.innerHTML=`

        <div class='livetool__cell_title'>

            <span id='enter__title'>进场欢迎</span>

            <span id='enter__export'>导出</span>

            <span id='enter__import'>导入</span>

        </div>

        <div class='livetool__cell_option'>

            <div class="onoffswitch livetool__cell_switch">

                <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="enter__switch" tabindex="0" checked>

                <label class="onoffswitch-label" for="enter__switch"></label>

            </div>

        </div>

    `+`

        <div class='enter__panel'>

            <select id='enter__select'>

            </select>

            <input style="width:40px;margin-left:10px;" type="button" id="enter__add" value="添加"/>

            <input style="width:40px;margin-left:10px;" type="button" id="enter__del" value="删除"/>

            <div class="enter__option">

                <label>等级≥<input id="enter__level" type="text" value="1"/></label>

                <label>当前欢迎词：<input id="enter__word" type="text" placeholder="欢迎<id>光临直播间"/></label>

            </div>

        </div>

    `,l=document.getElementsByClassName("livetool")[0],l&&l.insertBefore(i,l.childNodes[0]),safeBind("#enter__export", "click",()=>{GM_setClipboard(JSON.stringify(S)),T("【进场欢迎】导出完毕，已复制到剪贴板","success")}),safeBind("#enter__import", "click",()=>{Gr.prompt({title:"请输入json文本（会覆盖原来的设置）",okBtn:"确定",onConfirm:function(e){var t=document.getElementById("enter__select"),e=JSON.parse(e||"{}")||{};if("object"==typeof e){for(var o in S={...e},t.options.length=0,S)S.hasOwnProperty(o)&&t.options.add(new Option(o,""));$t()}T("【进场欢迎】导入完毕","success")},onCancel:function(e){}})}),safeBind("#enter__switch", "click",()=>{var o=safeEl("enter__switch").checked;Kt=1==o;{let e=[],t=localStorage.getItem("ExSave_isEnter");var n=(e=null!=t&&"rooms"in(n=JSON.parse(t))==1?n.rooms:e).indexOf(B),o=(1==Kt?-1==n&&e.push(B):e.splice(n,1),{rooms:e});localStorage.setItem("ExSave_isEnter",JSON.stringify(o))}}),safeBind("#enter__title", "click",()=>{var e=document.getElementsByClassName("enter__panel")[0];"block"!=e.style.display?((e.style.display="block")==document.getElementsByClassName("mute__panel")[0].style.display&&(document.getElementsByClassName("mute__panel")[0].style.display="none"),"block"==document.getElementsByClassName("reply__panel")[0].style.display&&(document.getElementsByClassName("reply__panel")[0].style.display="none"),"block"==document.getElementsByClassName("gift__panel")[0].style.display&&(document.getElementsByClassName("gift__panel")[0].style.display="none"),"block"==document.getElementsByClassName("vote__panel")[0].style.display&&(document.getElementsByClassName("vote__panel")[0].style.display="none")):e.style.display="none"}),safeEl("enter__select").onclick=function(){var e,t;0!=this.options.length&&(e=this.options[this.selectedIndex].text,t=S[e].enter,safeEl("enter__word").value=e,safeEl("enter__level").value=t,localStorage.setItem("ExSave_LastEnterWord",e))},safeBind("#enter__add", "click",()=>{document.getElementById("enter__select");var t=safeEl("enter__word").value,o=safeEl("enter__level").value;if(""!=t&&""!=o){let e=!1;for(var n of S)if(Number(o)===Number(n.level)){e=!0;break}e?T("【进场欢迎】等级已存在","error"):(S.push({level:o,word:t}),S.sort((e,t)=>t.level-e.level),eo(),$t())}}),safeBind("#enter__del", "click",()=>{var e=document.getElementById("enter__select");e.options[e.selectedIndex].text,S.splice(e.selectedIndex,1),S.sort((e,t)=>t.level-e.level),eo(),$t()}),i=localStorage.getItem("ExSave_Enter");if(""!=i){if(document.getElementById("enter__select"),null!=i){let e=JSON.parse(i);Array.isArray(e)||(e=[],$t()),S=e,eo()}if(null!=(i=localStorage.getItem("ExSave_isEnter"))){i=JSON.parse(i);let e=[];"rooms"in i==1&&(e=i.rooms),Kt=-1!=e.indexOf(B)}else Kt=!1;safeEl("enter__switch").checked=Kt}l=document.createElement("div"),l.className="livetool__cell",l.innerHTML=`

        <div class='livetool__cell_title'>

            <span id='mute__title'>关键词禁言</span>

            <span id='mute__idlist'>名单</span>

            <span id='mute__export'>导出</span>

            <span id='mute__import'>导入</span>

        </div>

        <div class='livetool__cell_option'>

            <div class="onoffswitch livetool__cell_switch">

                <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="mute__switch" tabindex="0" checked>

                <label class="onoffswitch-label" for="mute__switch"></label>

            </div>

        </div>

    `+`

        <div class='mute__panel'>

            <select id='mute__select'>

            </select>

            <input style="width:40px;margin-left:10px;" type="button" id="mute__add" value="添加"/>

            <input style="width:40px;margin-left:10px;" type="button" id="mute__del" value="删除"/>

            <input style="width:65px;margin-left:10px;" type="button" id="mute__delmute" value="一键解禁"/>

            <div class="mute__option">

                <label>词：<input id="mute__word" type="text" placeholder="re(式)=结果"/></label>

                <label>次数：<input id="mute__count" type="number" value="5"/></label>

                <label>时间：

                    <select id='mute__time'>

                        <option value="1">1分钟</option>

                        <option value="10">10分钟</option>

                        <option value="30">30分钟</option>

                        <option value="60">1小时</option>

                        <option value="480">8小时</option>

                        <option value="1440">1天</option>

                        <option value="4320">3天</option>

                        <option value="10080">7天</option>

                        <option value="43200">30天</option>

                        <option value="259200">180天</option>

                        <option value="518400">360天</option>

                    </select>

                </label>

            </div>

        </div>

    `,i=document.getElementsByClassName("livetool")[0],i&&i.insertBefore(l,i.childNodes[0]),safeBind("#mute__export", "click",()=>{GM_setClipboard(JSON.stringify(L)),T("【关键词禁言】导出完毕，已复制到剪贴板","success")}),safeBind("#mute__import", "click",()=>{Gr.prompt({title:"请输入json文本（会覆盖原来的设置）",okBtn:"确定",onConfirm:function(e){var t=document.getElementById("mute__select"),e=JSON.parse(e||"{}")||{};if("object"==typeof e){for(var o in L={...e},t.options.length=0,L)L.hasOwnProperty(o)&&t.options.add(new Option(o,""));ro()}T("【关键词禁言】导入完毕","success")},onCancel:function(e){}})}),safeBind("#mute__idlist", "click",()=>{if(0==ao.length)T("暂无禁言名单","warning");else{console.log("【禁言名单】");for(let e=0;e<ao.length;e++){var t=ao[e];console.log("id:【"+t.id+"】 | uid:"+t.uid+" | 弹幕:"+t.barrage+" | 检测次数:"+t.count+" | 禁言时长:"+t.time+"分钟 | 禁言时间:"+t.ts)}T("禁言名单已经输出在控制台，请按F12查看","success")}}),safeBind("#mute__delmute", "click",async()=>{if(0==ao.length)T("暂无禁言名单","warning");else if(1==confirm("是否解禁名单上所有的id？")){for(let e=0;e<ao.length;e++){var t=ao[e];await((e,o)=>new Promise(t=>{fetch("https://www.douyu.com/room/roomSetting/deleteMuteUser",{method:"POST",mode:"no-cors",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"room_id="+e+"&uid="+o}).then(e=>e.json()).then(e=>{t(e)})}))(B,t.uid)}T("解除禁言完毕","success")}}),safeBind("#mute__switch", "click",()=>{var o=safeEl("mute__switch").checked;no=1==o;{let e=[],t=localStorage.getItem("ExSave_isMute");var n=(e=null!=t&&"rooms"in(n=JSON.parse(t))==1?n.rooms:e).indexOf(B),o=(1==no?-1==n&&e.push(B):e.splice(n,1),{rooms:e});localStorage.setItem("ExSave_isMute",JSON.stringify(o))}}),safeBind("#mute__title", "click",()=>{var e=document.getElementsByClassName("mute__panel")[0];"block"!=e.style.display?((e.style.display="block")==document.getElementsByClassName("reply__panel")[0].style.display&&(document.getElementsByClassName("reply__panel")[0].style.display="none"),"block"==document.getElementsByClassName("enter__panel")[0].style.display&&(document.getElementsByClassName("enter__panel")[0].style.display="none"),"block"==document.getElementsByClassName("gift__panel")[0].style.display&&(document.getElementsByClassName("gift__panel")[0].style.display="none"),"block"==document.getElementsByClassName("vote__panel")[0].style.display&&(document.getElementsByClassName("vote__panel")[0].style.display="none")):e.style.display="none"}),safeEl("mute__select").onclick=function(){if(0!=this.options.length){var e=this.options[this.selectedIndex].text,t=L[e].count,o=L[e].time,e=(safeEl("mute__word").value=e,safeEl("mute__count").value=t,"mute__time"),n=o,i=document.getElementById(e);for(let e=0;e<i.options.length;e++)if(i.options[e].value==n){i.options[e].selected=!0;break}}},safeBind("#mute__add", "click",()=>{var e=document.getElementById("mute__time"),t=document.getElementById("mute__select"),o=safeEl("mute__word").value,n=safeEl("mute__count").value,e=e.options[e.selectedIndex].value;""!=o&&(L[o]={count:n,time:e},t.options.add(new Option(o,"")),ro())}),safeBind("#mute__del", "click",()=>{var e=document.getElementById("mute__select"),t=e.options[e.selectedIndex].text;delete L[t],e.options.remove(e.selectedIndex),ro()}),(async()=>{var t=localStorage.getItem("ExSave_Mute");if(null!=t){var e,o=JSON.parse(t),n=(L=o,document.getElementById("mute__select"));for(e in o)o.hasOwnProperty(e)&&n.options.add(new Option(e,""))}if(null!=(t=localStorage.getItem("ExSave_isMute"))){t=JSON.parse(t);let e=[];"rooms"in t==1&&(e=t.rooms),no=-1!=e.indexOf(B)}else no=!1;safeEl("mute__switch").checked=no})(),l=document.createElement("div"),l.className="livetool__cell",l.innerHTML=`

        <div class='livetool__cell_title'>

            <span id='gift__title'>自动谢礼物</span>

            <span id='gift__export'>导出</span>

            <span id='gift__import'>导入</span>

        </div>

        <div class='livetool__cell_option'>

            <div class="onoffswitch livetool__cell_switch">

                <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="gift__switch" tabindex="0" checked>

                <label class="onoffswitch-label" for="gift__switch"></label>

            </div>

        </div>

    `+`

        <div class='gift__panel'>

            <select id='gift__select'>

            </select>

            <input style="width:40px;margin-left:10px;" type="button" id="gift__add" value="添加"/>

            <input style="width:40px;margin-left:10px;" type="button" id="gift__del" value="删除"/>

            <input style="width:64px;margin-left:10px;" type="button" id="gift__template" value="生成模板"/>

            <div class="gift__option">

                <label><a id="reply__show_gid" style="color:blue;" href="javascript:void(0);">礼物id：</a><input id="gift__giftId" type="text"/></label>

                <label>回复：<input id="gift__reply" type="text" placeholder="<id>=用户名 <cnt>个数"/></label>

            </div>

        </div>

    `,i=document.getElementsByClassName("livetool")[0];if(i.insertBefore(l,i.childNodes[0]),safeBind("#reply__show_gid", "click",()=>{console.log(`

背包礼物：http://webconf.douyucdn.cn/resource/common/prop_gift_list/prop_gift_config.json

鱼翅礼物：http://open.douyucdn.cn/api/RoomApi/room/4042402

`),T("请按F12到控制台(console)查看礼物id","success")}),safeBind("#gift__switch", "click",()=>{var o=safeEl("gift__switch").checked;to=1==o;{let e=[],t=localStorage.getItem("ExSave_isGift");var n=(e=null!=t&&"rooms"in(n=JSON.parse(t))==1?n.rooms:e).indexOf(B),o=(1==to?-1==n&&e.push(B):e.splice(n,1),{rooms:e});localStorage.setItem("ExSave_isGift",JSON.stringify(o))}}),safeBind("#gift__title", "click",()=>{var e=document.getElementsByClassName("gift__panel")[0];"block"!=e.style.display?((e.style.display="block")==document.getElementsByClassName("mute__panel")[0].style.display&&(document.getElementsByClassName("mute__panel")[0].style.display="none"),"block"==document.getElementsByClassName("enter__panel")[0].style.display&&(document.getElementsByClassName("enter__panel")[0].style.display="none"),"block"==document.getElementsByClassName("reply__panel")[0].style.display&&(document.getElementsByClassName("reply__panel")[0].style.display="none"),"block"==document.getElementsByClassName("vote__panel")[0].style.display&&(document.getElementsByClassName("vote__panel")[0].style.display="none")):e.style.display="none"}),safeEl("gift__select").onclick=function(){var e,t;0!=this.options.length&&(e=this.options[this.selectedIndex].text,t=M[e].reply,safeEl("gift__giftId").value=e,safeEl("gift__reply").value=t)},safeBind("#gift__add", "click",()=>{var e=document.getElementById("gift__select"),t=safeEl("gift__giftId").value,o=safeEl("gift__reply").value;""!=t&&(M[t]={reply:o},e.options.add(new Option(t,"")),oo())}),safeBind("#gift__del", "click",()=>{var e=document.getElementById("gift__select"),t=e.options[e.selectedIndex].text;delete M[t],e.options.remove(e.selectedIndex),oo()}),safeBind("#gift__export", "click",()=>{GM_setClipboard(JSON.stringify(M)),T("【自动谢礼物】导出完毕，已复制到剪贴板","success")}),safeBind("#gift__import", "click",()=>{Gr.prompt({title:"请输入json文本（会覆盖原来的设置）",okBtn:"确定",onConfirm:function(e){var t=document.getElementById("gift__select"),e=JSON.parse(e||"{}")||{};if("object"==typeof e){for(var o in M={...e},t.options.length=0,M)M.hasOwnProperty(o)&&t.options.add(new Option(o,""));oo()}T("【自动谢礼物】导入完毕","success")},onCancel:function(e){}})}),safeBind("#gift__template", "click",()=>{(async()=>{var e,t={},o=await new Promise(t=>{GM_xmlhttpRequest({method:"GET",url:"http://open.douyucdn.cn/api/RoomApi/room/"+B,responseType:"json",onload:function(e){e=e.response;t(e)}})});for(let e=0;e<o.data.gift.length;e++){var n=o.data.gift[e];t[n.id]={reply:`感谢<id>赠送的${n.name}x<cnt>`}}let i=await new Promise(t=>{GM_xmlhttpRequest({method:"GET",url:"http://webconf.douyucdn.cn/resource/common/prop_gift_list/prop_gift_config.json",responseType:"text",onload:function(e){e=e.response;t(e)}})}),a={};for(e in i=(i=i.substring(0,i.length-2)).replace("DYConfigCallback(",""),(i=JSON.parse(i||"{}")||{}).data)a[e]={reply:`感谢<id>赠送的${i.data[e].name}x<cnt>`};var r={"开通钻粉":{reply:"感谢<id>开通钻粉"},"续费钻粉":{reply:"感谢<id>续费钻粉"}};r={...t,...a,...r},GM_setClipboard(JSON.stringify(r)),T("【自动谢礼物】礼物模板生成完毕，已复制到剪贴板，可直接导入","success")})()}),null!=(l=localStorage.getItem("ExSave_Gift"))){var m,u=JSON.parse(l),g=(M=u,document.getElementById("gift__select"));for(m in u)u.hasOwnProperty(m)&&g.options.add(new Option(m,""))}if(null!=(l=localStorage.getItem("ExSave_isGift"))){l=JSON.parse(l);let e=[];"rooms"in l==1&&(e=l.rooms),to=-1!=e.indexOf(B)}else to=!1;safeEl("gift__switch").checked=to;i=document.createElement("div"),i.className="livetool__cell",i.innerHTML=`

        <div class='livetool__cell_title'>

            <span id='reply__title'>关键词回复</span>

            <span id='reply__export'>导出</span>

            <span id='reply__import'>导入</span>

        </div>

        <div class='livetool__cell_option'>

            <div class="onoffswitch livetool__cell_switch">

                <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="reply__switch" tabindex="0" checked>

                <label class="onoffswitch-label" for="reply__switch"></label>

            </div>

        </div>

    `+`

        <div class='reply__panel'>

            <select id='reply__select'>

            </select>

            <input style="width:40px;margin-left:10px;" type="button" id="reply__add" value="添加"/>

            <input style="width:40px;margin-left:10px;" type="button" id="reply__del" value="删除"/>

            <label style="margin-left:5px">CD：<input id="reply__time" type="text" placeholder="秒" /></label>

            <div class="reply__option">

                <label>词：<input id="reply__word" type="text" placeholder="re(式)=结果"/></label>

                <label>回复：<input id="reply__reply" type="text" placeholder="<id>用户名 <txt>弹幕"/></label>

            </div>

        </div>

    `,l=document.getElementsByClassName("livetool")[0],l&&l.insertBefore(i,l.childNodes[0]),safeBind("#reply__export", "click",()=>{GM_setClipboard(JSON.stringify(A)),T("【关键词回复】导出完毕，已复制到剪贴板","success")}),safeBind("#reply__import", "click",()=>{Gr.prompt({title:"请输入json文本（会覆盖原来的设置）",okBtn:"确定",onConfirm:function(e){var t=document.getElementById("reply__select"),e=JSON.parse(e||"{}")||{};if("object"==typeof e){for(var o in A={...e},t.options.length=0,A)A.hasOwnProperty(o)&&t.options.add(new Option(o,""));ho()}T("【关键词回复】导入完毕","success")},onCancel:function(e){}})}),safeBind("#reply__switch", "click",()=>{go=String(safeEl("reply__time").value)||0;var o=safeEl("reply__switch").checked;mo=1==o;{let e=[],t=localStorage.getItem("ExSave_isReply");var n=(e=null!=t&&"rooms"in(n=JSON.parse(t))==1?n.rooms:e).indexOf(B),o=(1==mo?-1==n&&e.push(B):e.splice(n,1),{rooms:e});localStorage.setItem("ExSave_isReply",JSON.stringify(o))}o=safeEl("reply__time").value,localStorage.setItem("ExSave_ReplyCd",o)}),safeBind("#reply__title", "click",()=>{var e=document.getElementsByClassName("reply__panel")[0];"block"!=e.style.display?((e.style.display="block")==document.getElementsByClassName("mute__panel")[0].style.display&&(document.getElementsByClassName("mute__panel")[0].style.display="none"),"block"==document.getElementsByClassName("enter__panel")[0].style.display&&(document.getElementsByClassName("enter__panel")[0].style.display="none"),"block"==document.getElementsByClassName("gift__panel")[0].style.display&&(document.getElementsByClassName("gift__panel")[0].style.display="none"),"block"==document.getElementsByClassName("vote__panel")[0].style.display&&(document.getElementsByClassName("vote__panel")[0].style.display="none")):e.style.display="none"}),safeEl("reply__select").onclick=function(){var e,t;0!=this.options.length&&(e=this.options[this.selectedIndex].text,t=A[e].reply,safeEl("reply__word").value=e,safeEl("reply__reply").value=t)},safeBind("#reply__add", "click",()=>{var e=document.getElementById("reply__select"),t=safeEl("reply__word").value,o=safeEl("reply__reply").value;""!=t&&(A[t]={reply:o},e.options.add(new Option(t,"")),ho())}),safeBind("#reply__del", "click",()=>{var e=document.getElementById("reply__select"),t=e.options[e.selectedIndex].text;delete A[t],e.options.remove(e.selectedIndex),ho()}),i=localStorage.getItem("ExSave_Reply");if(null!=i){var h,f=JSON.parse(i),y=(A=f,document.getElementById("reply__select"));for(h in f)f.hasOwnProperty(h)&&y.options.add(new Option(h,""))}if(null!=(i=localStorage.getItem("ExSave_isReply"))){l=JSON.parse(i);let e=[];"rooms"in l==1&&(e=l.rooms),mo=-1!=e.indexOf(B)}else mo=!1;safeEl("reply__switch").checked=mo,null!=(i=localStorage.getItem("ExSave_ReplyCd"))&&(safeEl("reply__time").value=i);l=document.createElement("div"),l.className="livetool__Treasure",l.id="Ex_Geetest",i=document.getElementsByClassName("Barrage-main")[0];i&&i.insertBefore(l,i.childNodes[0]),setInterval(()=>{var e=Number(Xt/5*60).toFixed(0),t=(Xt=0,document.getElementsByClassName("ChatSend-txt")[0]),e=`弹幕时速：${e}条/分`;t.placeholder=e+" 按↑↓查看历史弹幕 视频ctrl+滚轮缩放",t.setAttribute("data-placeholder",e)},5e3),new q(".layout-Player-rankAll",!1,e=>{0<document.getElementsByClassName("RankAllMain-container").length&&0<Object.keys(so.all).length&&co("all",document.querySelectorAll(".layout-Player-rankAll .ChatRankWeek-listItem--nickname"))}),(async()=>{W=await K();let e=setInterval(()=>{void 0!==document.getElementById("js-barrage-list")&&(clearInterval(e),new q("#js-barrage-list",!1,e=>{if(!(e.length<=0||e[0].addedNodes.length<=0)){let n=e[0].addedNodes[0];if(0<n.getElementsByClassName("is-self").length){e=n.getElementsByClassName("Barrage-content");if(e&&0!==e.length){let o=e[0].innerText.trim();clearTimeout(Zt),Zt=setTimeout(()=>{var e,t;""!==Jt&&""!==o&&(e=el(Jt)).txt&&(e.txt.includes("[DouyuEx图片")&&(e.txt=e.txt.replace(/\[DouyuEx图片[^\]]+\]/g,"").trim()),e.txt.replace(/\s+/g," ")!==o.replace(/\s+/g," "))&&((e=n.getElementsByClassName("Barrage-content")[0]).style.textDecoration="line-through gray 1px",e)&&e.parentNode&&e.parentNode.insertBefore(((t=document.createElement("span")).textContent="(可能发送失败)",t.style.marginLeft="4px",t.style.color="gray",t.style.fontSize="9px",t.style.cursor="point",t.title="该条弹幕发送失败，不会被其他人看到（可能会误判）",t),e.nextSibling)},300)}}}}))},1e3)})(),safeBind(".livetool-icon", "click",function(){ee("直播间工具")}),new nl(B,e=>{if("rss"==N(i=e)){let e=v(i,"rid@=","/");var t=v(i,"ss@=","/"),i=v(i,"ivl@=","/");"1"==t&&"0"==i&&X("开播提醒","直播间："+e+"开播了，点我签到",()=>{$n(e)})}(async t=>{if(0!=no&&"chatmsg"==N(t)){var o=v(t,"uid@=","/");if(o!=I){var n,i=v(t,"nn@=","/"),a=v(t,"txt@=","/");let e=!1;for(n in L)if(""!=n)if(-1!=n.indexOf("re(")?(s=v(n,"re(",")="),1<(d=n.split("=")).length&&(d=d[1],0<(s=new RegExp(s,"g").exec(a)).length)&&(e=s[0]==d)):e=-1!=String(a).indexOf(n),1==e){var r,l,s=L[n].count,d=L[n].time;io.hasOwnProperty(i)?(r=Number(io[i].count)+1,s<=r?(await lo(B,i,d),X("禁言信息","【"+i+"】已被禁言"+d+"分钟\n弹幕："+a,()=>{}),l={id:i,uid:o,barrage:a,time:d,count:1,ts:String(k("yyyy年MM月dd日hh时mm分ss秒 ",new Date))},ao.push(l),io[i].count=0):io[i].count=String(r)):s<=1?(await lo(B,i,d),X("禁言信息","【"+i+"】已被禁言"+d+"分钟\n弹幕："+a,()=>{}),l={id:i,uid:o,barrage:a,time:d,count:1,ts:String(k("yyyy年MM月dd日hh时mm分ss秒 ",new Date))},ao.push(l)):io[i]={uid:o,count:1};break}}}})(e);var o,n,a,t=e;if(0!=mo&&"chatmsg"==N(t)){var i=v(t,"uid@=","/");if(i!=I){var r,l,s=v(t,"nn@=","/"),d=v(t,"txt@=","/");let e=!1;for(r in A)if(""!=r)if(-1!=r.indexOf("re(")?(c=v(r,"re(",")="),1<(l=r.split("=")).length&&(l=l[1],0<(c=new RegExp(c,"g").exec(d)).length)&&(e=c[0]==l)):e=-1!=String(d).indexOf(r),1==e){var c=A[r].reply;c=String(c).replace(/<id>/g,s),c=String(c).replace(/<txt>/g,d),0==uo&&(we(c),0<go)&&(uo=!0,setTimeout(()=>{uo=!1},1e3*go));break}}}i=e,0!=to&&("dgb"===(p=N(i))?v(i,"uid@=","/")!=I&&(o=v(i,"nn@=","/"),a=v(i,"gfid@=","/"),n=v(i,"gfcnt@=","/"),a in M)&&(a=M[a].reply,a=String(a).replace(/<id>/g,o),we(a=String(a).replace(/<cnt>/g,n))):"dfobc"!==p&&"dfrbc"!==p||v(i,"uid@=","/")!=I&&(o=v(i,"nick@=","/"),(n="dfobc"===p?"开通钻粉":"续费钻粉")in M)&&(a=M[n].reply,a=String(a).replace(/<id>/g,o),we(a=String(a).replace(/<cnt>/g,"1"))));var i=e;if(0!=St&&"tsboxb"==N(i)){var p=v(i,"ot@=","/");let e=v(i,"rpid@=","/"),t=v(i,"rid@=","/"),o=x("dy_did");i=1e3*(Number(p)-Math.floor(Date.now()/1e3))+Mt(),fo++;p=document.createElement("div");let n="Ex_Geetest_no"+String(fo);p.id=n,document.getElementById("Ex_Geetest").appendChild(p),setTimeout(()=>{yo(t,e,o,n)},i)}var i=e;if(0!=Kt&&"uenter"==N(i)){var m=v(i,"uid@=","/");if(m!=I){var u,g=v(i,"nn@=","/"),h=v(i,"level@=","/");for(u of S)if(Number(h)>=Number(u.level)){we(String(u.word).replace(/<id>/g,g));break}}}m=e,0!=bo&&"chatmsg"==N(m)&&(i=v(m,"uid@=","/"),m=v(m,"txt@=","/"),Eo?Object(wo).hasOwnProperty(m)&&(wo[m].num++,_o++,Io()):0==Object(xo).hasOwnProperty(i)&&Object(wo).hasOwnProperty(m)&&(xo[i]=0,wo[m].num++,_o++,Io())),"chatmsg"==N(e)&&Xt++,"ranklist"==N(i=e)&&((i=el(i)).list_day&&(so.day=po(i.list_day),co("day",document.querySelectorAll(".layout-Player-rank .ChatDayRank .ChatRankWeek-listItem--nickname"))),i.list&&(so.week=po(i.list),co("week",document.querySelectorAll(".layout-Player-rank .ChatRankWeek .ChatRankWeek-listItem--nickname"))),i.list_all&&(so.all=po(i.list_all)),co()),"chatmsg"==N(i=e)&&i.includes(W)&&(Jt=i),"oni"==N(i=e)&&(i=v(i,"vn@=","/"))&&(j.noble_count=i,e=document.getElementById("real-audience__noble"))&&(e.innerText=sn(i))});{let s=setInterval(()=>{if(E([".right-e7ea5d",".right-17e251"])){clearInterval(s),V=document.querySelector(".layout-Player-videoEntity video"),document.getElementsByClassName("disable-23f484")[0].innerHTML="DouyuEx-RL_"+P;var e=document.createElement("div"),t=(e.id="ex-vtoolbar-menu",e.className="vtoolbar-menu",e.innerHTML=`

        <button type="button" class="vtoolbar-menu__trigger" title="DouyuEx-RL Ver${P}" aria-expanded="false" aria-haspopup="true">

            ${fr}

        </button>

        <div class="vtoolbar-menu__dropdown" role="menu" aria-label="DouyuEx-RL Ver${P}">

            <button type="button" class="vtoolbar-menu__item" id="vtoolbar-menu-joysound" role="menuitem">

                <span class="vtoolbar-menu__item-icon" id="vtoolbar-joysound-icon"></span>

                <span class="vtoolbar-menu__item-label">Joysound 音效</span>

                <span class="vtoolbar-menu__switch" id="vtoolbar-joysound-switch" aria-hidden="true">

                    <span class="vtoolbar-menu__switch-thumb"></span>

                </span>

            </button>

            <button type="button" class="vtoolbar-menu__item vtoolbar-menu__item--filter" id="vtoolbar-menu-filter" role="menuitem" aria-expanded="false">

                <span class="vtoolbar-menu__item-icon">${yr}</span>

                <span class="vtoolbar-menu__item-label">画面滤镜</span>

                ${br}

            </button>

            <button type="button" class="vtoolbar-menu__item" id="vtoolbar-menu-copy-live" role="menuitem">

                <span class="vtoolbar-menu__item-icon">${vr}</span>

                <span class="vtoolbar-menu__item-label">复制直播流地址</span>

            </button>

            <button type="button" class="vtoolbar-menu__item" id="vtoolbar-menu-audio-line" role="menuitem">

                <span class="vtoolbar-menu__item-icon vtoolbar-menu__item-icon--compact">${xr}</span>

                <span class="vtoolbar-menu__item-label">切换音频线路</span>

            </button>

            <button type="button" class="vtoolbar-menu__item" id="vtoolbar-menu-enhanced-pip" role="menuitem">

                <span class="vtoolbar-menu__item-icon">${wr}</span>

                <span class="vtoolbar-menu__item-label">加强版画中画</span>

            </button>

            <div class="vtoolbar-menu__divider" role="separator"></div>

            <button type="button" class="vtoolbar-menu__item" id="vtoolbar-menu-expanel" role="menuitem">

                <span class="vtoolbar-menu__item-icon">${fr}</span>

                <span class="vtoolbar-menu__item-label">DouyuEx 工具条</span>

            </button>

        </div>

        <div class="vtoolbar-menu__filter-host" id="ex-vtoolbar-filter-host"></div>

    `,E([".right-e7ea5d",".right-17e251"])),t=(t&&t.insertBefore(e,t.childNodes[0]),(e=rr()).querySelector(".vtoolbar-menu__trigger")),e=e.querySelector(".vtoolbar-menu__dropdown"),o=document.getElementById("ex-vtoolbar-filter-host"),n=document.getElementById("vtoolbar-menu-filter"),i=document.getElementById("vtoolbar-menu-copy-live"),a=document.getElementById("vtoolbar-menu-audio-line"),r=document.getElementById("vtoolbar-menu-enhanced-pip"),l=document.getElementById("vtoolbar-menu-expanel"),t=(cr(t,!0),cr(e,!1),cr(o,!1),n.addEventListener("click",e=>{e.stopPropagation(),(ir?gr:()=>{var e=document.getElementById("ex-vtoolbar-filter-host"),t=document.getElementById("vtoolbar-menu-filter");e&&(ir=!0,e.classList.add("is-visible"),t&&(t.classList.add("is-active"),t.setAttribute("aria-expanded","true")),Ka())})()}),i.addEventListener("click",e=>{e.stopPropagation(),Ge()}),a.addEventListener("click",e=>{e.stopPropagation(),le()}),r.addEventListener("click",e=>{e.stopPropagation(),ur(),Ma()}),l.addEventListener("click",e=>{e.stopPropagation(),qt()}),document.addEventListener("keydown",pr),ji(),document.getElementById("vtoolbar-menu-joysound")),e=(t&&t.addEventListener("click",e=>{e.stopPropagation(),unsafeWindow.hasInstalledJoysound?(1==localStorage.getItem("Ex_isJoysound")?unsafeWindow.disableJoysound():unsafeWindow.enableJoysound(),ji()):_("https://src.douyuex.com/src/joysound.user.js")}),document.createElement("li")),o=(e.id="ex-videospeed",e.innerHTML=`

    倍速播放

    <ul class="videospeed__wrap">

        <li id="videospeed__2.0">2.0x</li>

        <li id="videospeed__1.5">1.5x</li>

        <li id="videospeed__1.25">1.25x</li>

        <li id="videospeed__1.0">1.0x</li>

        <li id="videospeed__0.75">0.75x</li>

        <li id="videospeed__0.5">0.5x</li>

    </ul>

    `,document.getElementsByClassName("menu-da2a9e")[0]),n=(o.insertBefore(e,o.childNodes[1]),safeBind("#videospeed__2.0", "click",()=>{V.playbackRate=2}),safeBind("#videospeed__1.5", "click",()=>{V.playbackRate=1.5}),safeBind("#videospeed__1.25", "click",()=>{V.playbackRate=1.25}),safeBind("#videospeed__1.0", "click",()=>{V.playbackRate=1}),safeBind("#videospeed__0.75", "click",()=>{V.playbackRate=.75}),safeBind("#videospeed__0.5", "click",()=>{V.playbackRate=.5}),document.createElement("li")),i=(n.id="ex-cinema",n.innerHTML=`

    影院比例

    <ul class="cinema__wrap">

        <li id="cinema__default">默认</li>

        <li id="cinema__cover">剪裁</li>

        <li id="cinema__fill">拉伸</li>

    </ul>

    `,document.getElementsByClassName("menu-da2a9e")[0]);i.insertBefore(n,i.childNodes[1]),safeBind("#cinema__default", "click",()=>{U("Ex_Style_Cinema")}),safeBind("#cinema__cover", "click",()=>{Li("cover")}),safeBind("#cinema__fill", "click",()=>{Li("fill")});{let e=document.createElement("div"),t=(e.id="ex-videosync",e.title="同步时间",e.innerHTML=`

    <svg t="1595680402158" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7532" width="22" height="22"><path d="M938.1888 534.016h-80.7936c0.4096-7.3728 0.6144-14.6432 0.6144-22.016 0-218.624-176.8448-400.7936-389.12-400.7936C257.024 111.2064 80.6912 293.1712 80.6912 512c0 218.7264 176.4352 400.7936 388.1984 400.7936 74.752 0 149.0944-22.016 208.1792-60.0064l42.7008 68.608c-75.0592 48.9472-161.9968 74.8544-250.7776 74.752C209.8176 996.1472 0 779.264 0 512S209.8176 27.8528 468.8896 27.8528C728.3712 27.8528 938.7008 244.736 938.7008 512c0 7.3728-0.2048 14.6432-0.512 22.016z m-261.12 318.7712z m-26.4192-158.1056L426.7008 556.032V291.9424h64v226.5088L689.5616 635.904l-38.912 58.7776z m245.3504-6.656L768 512h256L896 688.0256z" fill="#ffffff" p-id="7533"></path></svg>

    `,document.getElementsByClassName("left-d3671e")[0]);t?(e.style.marginLeft="20px",t.insertBefore(e,t.childNodes[3])):(e.style.marginLeft="8px",(t=E([".left-bfab3b"])).insertBefore(e,t.childNodes[2]))}safeBind("#ex-videosync", "click",()=>{var e;0!=(e=V.buffered).length&&(V.currentTime=e.end(0))}),or&&document.removeEventListener("keydown",or,!0),or=e=>{_r||e.target&&(e.target.isContentEditable||/^(input|textarea)$/i.test(e.target.tagName))||37!=e.keyCode&&39!=e.keyCode&&"ArrowLeft"!==e.key&&"ArrowRight"!==e.key||(V=V||document.querySelector(".layout-Player-videoEntity video"))&&(e.preventDefault(),V.currentTime=Math.max(0,(V.currentTime||0)+(37==e.keyCode||"ArrowLeft"===e.key?-3:3)))},document.addEventListener("keydown",or,!0),F=V.parentNode.className;a=hr();if(a&&((r=document.createElement("div")).innerHTML=`

    <div class="filter__wrap">

        <div class="filter__panel">

            ${Xa()?`<div class="filter__enhance">

                <span class="filter__title">画质增强（不掉帧）</span>

                <div class="filter__switch" id="switch__enhance">

                    <div class="filter__switch-slider" id="slider__enhance"></div>

                </div>

            </div>`:""}

            <div class="filter__bright">

                <span class="filter__title">明亮度</span>

                <div class="filter__scroll" id="scroll__bright">

                    <div class="filter__scroll-bar" id="bar__bright"></div>

                    <div class="filter__scroll-mask" id="mask__bright"></div>

                </div>

            </div>

            <div class="filter__contrast">

                <span class="filter__title">对比度</span>

                <div class="filter__scroll" id="scroll__contrast">

                    <div class="filter__scroll-bar" id="bar__contrast"></div>

                    <div class="filter__scroll-mask" id="mask__contrast"></div>

                </div>

            </div>

            <div class="filter__saturate">

                <span class="filter__title">饱和度</span>

                <div class="filter__scroll" id="scroll__saturate">

                    <div class="filter__scroll-bar" id="bar__saturate"></div>

                    <div class="filter__scroll-mask" id="mask__saturate"></div>

                </div>

            </div>

            <div class="filter__filter">

                <p style="color:white;float:left;line-height:20px">滤镜</p>

                <select class="c3-4f78e3" id="filter__select">

                    <option class="option-b5745c" value="default">无</option>

                    <option class="option-b5745c" value="1977">1977</option>

                    <option class="option-b5745c" value="Aden">Aden</option>

                    <option class="option-b5745c" value="Amaro">Amaro</option>

                    <option class="option-b5745c" value="Brannan">Brannan</option>

                    <option class="option-b5745c" value="Brooklyn">Brooklyn</option>

                    <option class="option-b5745c" value="Claredon">Claredon</option>

                    <option class="option-b5745c" value="Earlybird">Earlybird</option>

                    <option class="option-b5745c" value="Gingham">Gingham</option>

                    <option class="option-b5745c" value="Hudson">Hudson</option>

                    <option class="option-b5745c" value="Inkwell">Inkwell</option>

                    <option class="option-b5745c" value="Lofi">Lofi</option>

                    <option class="option-b5745c" value="Maven">Maven</option>

                    <option class="option-b5745c" value="Perpetua">Perpetua</option>

                    <option class="option-b5745c" value="Reyes">Reyes</option>

                    <option class="option-b5745c" value="Stinson">Stinson</option>

                    <option class="option-b5745c" value="Toaster">Toaster</option>

                    <option class="option-b5745c" value="Walden">Walden</option>

                    <option class="option-b5745c" value="Valencia">Valencia</option>

                    <option class="option-b5745c" value="Xpro2">Xpro2</option>

                </select>

            </div>

            <ul style="clear:both">

                <li id="filter__reset2">重置</li>

            </ul>

        </div>

    </div>

    `,a.appendChild(r.firstElementChild),a=document.getElementsByClassName("menu-da2a9e")[0])&&((r=document.createElement("li")).id="filter__panorama",r.innerText="全景",a.insertBefore(r,a.childNodes[1]),(r=document.createElement("li")).id="filter__mirror",r.innerText="镜像画面",a.insertBefore(r,a.childNodes[1]),(r=document.createElement("li")).id="filter__rotate",r.innerText="旋转画面",a.insertBefore(r,a.childNodes[1]),(r=document.createElement("li")).id="filter__reset",r.innerText="重置",a.insertBefore(r,a.childNodes[1]),(r=document.createElement("div")).className="divider-f9d33d",a.insertBefore(r,a.childNodes[1])),Xa()){let e=document.createElement("div"),t=(e.className="enhance-modal__panel-wrap",e.innerHTML=`

        <div class="enhance-modal__panel">

            <div class="enhance-modal__close">×</div>

            <div class="enhance-modal__content">

                <img class="enhance-modal__img" src="https://c-yuba.douyucdn.cn/yubavod/b/zEqAvQaXrd5L/c16fdac3db1903db3a39a6557c2b5ab5.gif" alt=""/>

                <div class="enhance-modal__text">

                    开启后，弹幕飘屏会被遮挡，请将鼠标移入到直播画面中并点击<img style="width:32px;" src="https://c-yuba.douyucdn.cn/yubavod/b/zEqAvQaXrd5L/2dd9e0d70e39a532a2675717eb054129.png" alt="">

                    <br />

                    完成后，再<b>刷新</b>以恢复弹幕飘屏，该功能会<b>自动保存</b>

                    <br />

                    <a style="color: #ff7700;" href="https://www.microsoft.com/zh-cn/edge/features/enhance-video?form=MT0160" target="_blank">没有增强图标？</a>

                </div>

            </div>

        </div>

    `,document.querySelector("body"));t.insertBefore(e,t.childNodes[0]),e.getElementsByClassName("enhance-modal__close")[0].addEventListener("click",()=>{e.style.display="none"})}document.onmouseup=function(){document.onmousemove=null},Xa()&&(l=document.getElementById("switch__enhance"))&&l.addEventListener("click",()=>{Ja=!Ja;var e=document.getElementById("switch__enhance"),t=document.getElementById("slider__enhance"),o=document.getElementsByClassName("enhance-modal__panel-wrap")[0],n=document.querySelector("video");Ja?(t.style.left="20px",e.style.background="#369",V.style.imageRendering="crisp-edges",V.style.imageRendering="-webkit-optimize-contrast",V.style.imageRendering="optimize-contrast",o.style.display="none",n.style.zIndex="10",n.style.cursor="auto"):(t.style.left="0px",e.style.background="#ccc",V.style.imageRendering="",o.style.display="none",n.style.zIndex="0")}),tr(document.getElementById("scroll__bright"),document.getElementById("bar__bright"),document.getElementById("mask__bright"),e=>{qa=`brightness(${e}%)`,V.style.filter=`${qa} ${Ua} `+Wa}),tr(document.getElementById("scroll__contrast"),document.getElementById("bar__contrast"),document.getElementById("mask__contrast"),e=>{Ua=`contrast(${e}%)`,V.style.filter=`${qa} ${Ua} `+Wa}),tr(document.getElementById("scroll__saturate"),document.getElementById("bar__saturate"),document.getElementById("mask__saturate"),e=>{Wa=`saturate(${e}%)`,V.style.filter=`${qa} ${Ua} `+Wa}),safeBind("#filter__reset", "click",()=>{er()}),safeBind("#filter__reset2", "click",()=>{er()}),safeBind("#filter__mirror", "click",()=>{Ya?(Ya=!1,H.rotateY="rotateY(0deg)"):(Ya=!0,H.rotateY="rotateY(180deg)"),V.parentNode.style.transition="all .5s",V.parentNode.style.transform=H.rotateY+" "+H.rotate+" "+H.scale}),safeBind("#filter__rotate", "click",()=>{Qa+=90,H.rotate=`rotate(${String(Qa)}deg)`,V.parentNode.style.transition="all .5s",Qa/90%2!=0?window.innerWidth>window.innerHeight?H.scale="scale("+String(V.videoHeight/V.videoWidth)+")":H.scale="scale("+String(V.videoWidth/V.videoHeight)+")":H.scale="",V.parentNode.style.transform=H.rotateY+" "+H.rotate+" "+H.scale}),safeEl("filter__select").onchange=function(){switch(this.options[this.selectedIndex].text){case"default":U("Ex_Style_Filter");break;case"1977":G(`.${F}{position:relative;-webkit-filter:contrast(110%)brightness(110%)saturate(130%);filter:contrast(110%)brightness(110%)saturate(130%)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:screen;background:rgba(243,106,188,0.3);z-index:10}`);break;case"Aden":G(`.${F}{position:relative;-webkit-filter:contrast(90%)brightness(120%)saturate(85%)hue-rotate(20deg);filter:contrast(90%)brightness(120%)saturate(85%)hue-rotate(20deg)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:darken;background:-webkit-linear-gradient(to right,rgba(66,10,14,0.2)1,rgba(66,10,14,0));background:linear-gradient(to right,rgba(66,10,14,0.2)1,rgba(66,10,14,0));z-index:10}`);break;case"Amaro":G(`.${F}{position:relative;-webkit-filter:contrast(90%)brightness(110%)saturate(150%)hue-rotate(-10deg);filter:contrast(90%)brightness(110%)saturate(150%)hue-rotate(-10deg)}`);break;case"Brannan":G(`.${F}{position:relative;-webkit-filter:contrast(140%)sepia(50%);filter:contrast(140%)sepia(50%)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:lighten;background:rgba(161,44,199,0.31);z-index:10}`);break;case"Brooklyn":G(`.${F}{position:relative;-webkit-filter:contrast(90%)brightness(110%);filter:contrast(90%)brightness(110%)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:overlay;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(168,223,193,0.4)1,rgba(183,196,200,0.2));background:radial-gradient(50%50%,circle closest-corner,rgba(168,223,193,0.4)1,rgba(183,196,200,0.2));z-index:10}`);break;case"Claredon":G(`.${F}{position:relative;-webkit-filter:contrast(120%)saturate(125%);filter:contrast(120%)saturate(125%)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:overlay;background:rgba(127,187,227,0.2);z-index:10}`);break;case"Earlybird":G(`.${F}{position:relative;-webkit-filter:contrast(90%)sepia(20%);filter:contrast(90%)sepia(20%)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:overlay;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(208,186,142,1)20,rgba(29,2,16,0.2));background:radial-gradient(50%50%,circle closest-corner,rgba(208,186,142,1)20,rgba(29,2,16,0.2));z-index:10}`);break;case"Gingham":G(`.${F}{position:relative;-webkit-filter:brightness(105%)hue-rotate(350deg);filter:brightness(105%)hue-rotate(350deg)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:darken;background:-webkit-linear-gradient(to right,rgba(66,10,14,0.2)1,rgba(0,0,0,0));background:linear-gradient(to right,rgba(66,10,14,0.2)1,rgba(0,0,0,0));z-index:10}`);break;case"Hudson":G(`.${F}{position:relative;-webkit-filter:contrast(90%)brightness(120%)saturate(110%);filter:contrast(90%)brightness(120%)saturate(110%)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:multiply;opacity:0.5;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(255,177,166,1)50,rgba(52,33,52,1));background:radial-gradient(50%50%,circle closest-corner,rgba(255,177,166,1)50,rgba(52,33,52,1));z-index:10}`);break;case"Inkwell":G(`.${F}{position:relative;-webkit-filter:contrast(110%)brightness(110%)sepia(30%)grayscale(100%);filter:contrast(110%)brightness(110%)sepia(30%)grayscale(100%)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;background:rgba(0,0,0,0);z-index:10}`);break;case"Lofi":G(`.${F}{position:relative;-webkit-filter:contrast(150%)saturate(110%);filter:contrast(150%)saturate(110%)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:multiply;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(0,0,0,0)70,rgba(34,34,34,1));background:radial-gradient(50%50%,circle closest-corner,rgba(0,0,0,0)70,rgba(34,34,34,1));z-index:10}`);break;case"Maven":G(`.${F}{position:relative;-webkit-filter:contrast(95%)brightness(95%)saturate(150%)sepia(25%);filter:contrast(95%)brightness(95%)saturate(150%)sepia(25%)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:hue;background:rgba(3,230,26,0.2);z-index:10}`);break;case"Perpetua":G(`.${F}{position:relative}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:soft-light;opacity:0.5;background:-webkit-linear-gradient(to bottom,rgba(0,91,154,1)1,rgba(61,193,230,0));background:linear-gradient(to bottom,rgba(0,91,154,1)1,rgba(61,193,230,0));z-index:10}`);break;case"Reyes":G(`.${F}{position:relative;-webkit-filter:contrast(85%)brightness(110%)saturate(75%)sepia(22%);filter:contrast(85%)brightness(110%)saturate(75%)sepia(22%)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:soft-light;opacity:0.5;background:rgba(173,205,239,1);z-index:10}`);break;case"Stinson":G(`.${F}{position:relative;-webkit-filter:contrast(75%)brightness(115%)saturate(85%);filter:contrast(75%)brightness(115%)saturate(85%)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:soft-light;background:rgba(240,149,128,0.2);z-index:10}`);break;case"Toaster":G(`.${F}{position:relative;-webkit-filter:contrast(150%)brightness(90%);filter:contrast(150%)brightness(90%)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:screen;opacity:0.5;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(15,78,128,1)1,rgba(59,0,59,1));background:radial-gradient(50%50%,circle closest-corner,rgba(15,78,128,1)1,rgba(59,0,59,1));z-index:10}`);break;case"Walden":G(`.${F}{position:relative;-webkit-filter:brightness(110%)saturate(160%)sepia(30%)hue-rotate(350deg);filter:brightness(110%)saturate(160%)sepia(30%)hue-rotate(350deg)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:screen;opacity:0.3;background:rgba(204,68,0,1);z-index:10}`);break;case"Valencia":G(`.${F}{position:relative;-webkit-filter:contrast(108%)brightness(108%)sepia(8%);filter:contrast(108%)brightness(108%)sepia(8%)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:exclusion;opacity:0.5;background:rgba(58,3,57,1);z-index:10}`);break;case"Xpro2":G(`.${F}{position:relative;-webkit-filter:sepia(30%);filter:sepia(30%)}.${F}::before{content:"";display:block;height:100%;width:100%;top:0;left:0;position:absolute;pointer-events:none;mix-blend-mode:color-burn;background:-webkit-radial-gradient(50%50%,circle closest-corner,rgba(224,231,230,1)40,rgba(43,42,161,0.6));background:radial-gradient(50%50%,circle closest-corner,rgba(224,231,230,1)40,rgba(43,42,161,0.6));z-index:10}`);break;default:U("Ex_Style_Filter")}},safeBind("#filter__panorama", "click",()=>{var e,t=document.getElementById("ex-panorama");t?(t.remove(),Za=null):"undefined"!=typeof THREE?(t=document.getElementById("__h5player"),(e=document.createElement("div")).id="ex-panorama",e.style="width:100%;height:100%;z-index:1;background:black;",t.insertBefore(e,t.childNodes[0]),function e(t){requestAnimationFrame(()=>{e(t)});t.update()}(Za=new Hr(e,V))):ExLoadLib(EXURL.three,()=>{var b=document.getElementById("filter__panorama");b&&b.click()},()=>T("【全景】three.js加载失败","error"))}),Bi=E([".Title-anchorName",".anchorName__6NXv9"]).innerText,ki=.25*V.videoWidth,Ei=.25*V.videoHeight,(_i=document.createElement("canvas")).width=ki,_i.height=Ei,(z=document.createElement("canvas")).width=V.videoWidth,z.height=V.videoHeight;t=document.createElement("div"),e=(t.id="ex-camera",t.title="单击截图 长按录制gif",t.innerHTML=`

    <svg t="1620266708389" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2080" width="38" height="38"><path d="M512 337.371136c-119.543808 0-216.800256 97.255424-216.800256 216.798208 0 119.543808 97.256448 216.800256 216.800256 216.800256s216.800256-97.256448 216.800256-216.800256C728.800256 434.625536 631.543808 337.371136 512 337.371136zM680.479744 554.16832c0 92.911616-75.579392 168.501248-168.479744 168.501248-92.900352 0-168.480768-75.589632-168.480768-168.501248 0-92.923904 75.579392-168.521728 168.480768-168.521728C604.899328 385.646592 680.479744 461.24544 680.479744 554.16832z" p-id="2081" fill="#ffffff"></path><path d="M831.209472 337.349632l-47.167488 0c-13.647872 0-24.751104 11.083776-24.751104 24.707072 0 13.635584 11.103232 24.7296 24.751104 24.7296l47.167488 0c13.646848 0 24.75008-11.094016 24.75008-24.7296C855.959552 348.433408 844.85632 337.349632 831.209472 337.349632z" p-id="2082" fill="#ffffff"></path><path d="M700.505088 171.497472c4.235264 0 6.403072 0.405504 7.232512 0.612352 1.47968 1.514496 4.790272 6.218752 11.717632 20.685824 2.83648 5.910528 8.6272 18.86208 15.888384 35.533824l11.788288 27.063296 29.518848 0 96.535552 0c35.122176 0 63.695872 28.535808 63.695872 63.609856l0 469.933056c0 35.05152-28.573696 63.567872-63.695872 63.567872L150.811648 852.503552c-35.121152 0-63.694848-28.516352-63.694848-63.567872L87.1168 319.0016c0-35.062784 28.573696-63.589376 63.694848-63.589376l99.35872 0 29.110272 0 11.964416-26.537984c4.698112-10.421248 8.416256-19.063808 11.058176-25.70752 9.86112-24.829952 15.207424-30.125056 16.239616-30.974976 0.52736-0.161792 2.64192-0.695296 7.673856-0.695296L700.505088 171.496448M700.505088 126.441472 326.216704 126.441472c-32.519168 0-47.275008 13.479936-65.787904 60.096512-3.180544 7.999488-7.689216 18.122752-10.257408 23.819264l-99.35872 0c-59.96544 0-108.750848 48.738304-108.750848 108.645376l0 469.933056c0 59.894784 48.785408 108.623872 108.750848 108.623872l722.37568 0c59.96544 0 108.751872-48.729088 108.751872-108.623872L981.940224 319.0016c0-59.91936-48.786432-108.665856-108.751872-108.665856l-96.535552 0c-4.458496-10.236928-12.420096-28.372992-16.574464-37.031936C744.823808 141.448192 733.973504 126.441472 700.505088 126.441472L700.505088 126.441472z" p-id="2083" fill="#ffffff"></path></svg>

    <div id="ex-camera-close">×</div>

    `,document.getElementById("js-player-dialog"));e.insertBefore(t,e.childNodes[0]);{let e=E([".layout-Player-video",".layout-Player-videoEntity"]),t=document.getElementsByClassName("room-Player-Box")[0],o=document.getElementById("ex-camera"),n=document.getElementById("ex-camera-close"),i=null,a=0,r=0,l,s=0,d=!1;n.addEventListener("click",e=>{e.stopPropagation(),localStorage.setItem("ExSave_Camera_Hidden",Date.now()+31536e7),d=!0,o.style.display="none"}),Si()||(e.addEventListener("mouseenter",()=>{d||Si()||(o.style.display="flex",s=setTimeout(()=>{o.style.display="none"},2e3))}),t.addEventListener("mousemove",()=>{d||Si()||(o.style.display="flex",clearTimeout(s),s=setTimeout(()=>{o.style.display="none"},2e3))}),o.addEventListener("mouseenter",()=>{d||Si()||(o.style.display="flex",clearTimeout(s))}),e.addEventListener("mouseleave",()=>{o.style.display="none",clearTimeout(s)}),t.addEventListener("mouseleave",()=>{o.style.display="none",clearTimeout(s)}),o.addEventListener("mousedown",e=>{if("ex-camera-close"!==e.target.id){if("undefined"==typeof GIF)return void ExLoadLib(EXURL.gif,()=>T("【录制】GIF引擎已就绪，请再次长按录制","info"));if(clearInterval(a),i&&"function"==typeof i.abort)try{i.abort()}catch(e){}i=null,r=(new Date).getTime(),z.width=V.videoWidth,z.height=V.videoHeight,z.getContext("2d").drawImage(V,0,0,z.width,z.height),l=z.toDataURL("image/png"),i=new GIF({workers:5,quality:3,width:ki,height:Ei,workerScript:Ii}),Ci(V,_i,i,Ti),a=setInterval(()=>{Ci(V,_i,i,Ti)},Ti)}}),o.addEventListener("mouseup",e=>{if("ex-camera-close"!==e.target.id){e=(new Date).getTime();if(clearInterval(a),800<=e-r)T("【录制】正在生成gif...","info"),i.on("finished",e=>{var t=document.createElement("a");let o=URL.createObjectURL(e);t.href=o,t.download=`【${Bi}】`+k("yyyy-MM-dd hh-mm-ss",new Date),document.body.appendChild(t);e=document.createEvent("MouseEvents");e.initEvent("click",!1,!1),t.dispatchEvent(e),document.body.removeChild(t),setTimeout(function(){try{URL.revokeObjectURL(o)}catch(e){}},1500)}),i.render();else{if(i&&"function"==typeof i.abort)try{i.abort()}catch(e){}i=null;var e=document.createElement("a"),t=(e.download=`【${Bi}】`+k("yyyy-MM-dd hh-mm-ss",new Date),e.href=l,document.body.appendChild(e),document.createEvent("MouseEvents"));t.initEvent("click",!1,!1),e.dispatchEvent(t),document.body.removeChild(e)}}}))}{let a=E([".layout-Player-videoEntity",".layout-Player-video"]),r=document.getElementsByClassName("layout-Player-videoEntity")[0],l=0,s=0;a&&r&&(r.style.transformOrigin="0 0",r.style.transition="transform 0.1s",Br&&window.removeEventListener("wheel",Br,!0),Br=t=>{if(t.ctrlKey&&(a=a||E([".layout-Player-videoEntity",".layout-Player-video"]),r=r||document.getElementsByClassName("layout-Player-videoEntity")[0],a)&&r){var o=a.getBoundingClientRect();if(!(t.clientX<o.left||t.clientX>o.right||t.clientY<o.top||t.clientY>o.bottom)){t.preventDefault(),t.stopImmediatePropagation();var n=t.clientX-o.left,o=t.clientY-o.top;let e=Er+(t.deltaY<0?.1:-.1);e<.1&&(e=.1);var t=(n-l)/Er,i=(o-s)/Er;l=n-t*e,s=o-i*e,(Er=e)<.1&&(Er=.1),r.style.transform=`translate(${l}px, ${s}px) scale(${Er})`}}},window.addEventListener("wheel",Br,{capture:!0,passive:!1}),Ir&&window.removeEventListener("mousemove",Ir,!0),Tr&&window.removeEventListener("mouseup",Tr,!0),window.addEventListener("mousedown",e=>{var t;e.ctrlKey&&0===e.button&&(t=a.getBoundingClientRect(),e.clientX<t.left||e.clientX>t.right||e.clientY<t.top||e.clientY>t.bottom||(e.preventDefault(),r.style.transition="none",Cr={x:e.clientX,y:e.clientY,tx:l,ty:s}))},!0),Ir=e=>{Cr&&(l=Cr.tx+(e.clientX-Cr.x),s=Cr.ty+(e.clientY-Cr.y),r.style.transform=`translate(${l}px, ${s}px) scale(${Er})`)},Tr=()=>{Cr&&(Cr=null,r.style.transition="transform 0.1s")},window.addEventListener("mousemove",Ir,!0),window.addEventListener("mouseup",Tr,!0))}(function ExMetaLazy(){var pl=document.createElement("li");pl.id="ex-metadata";pl.innerHTML='<span>主播配置信息</span><ul class="metadata__wrap"><li style="color:#999;white-space:nowrap">悬停获取…</li></ul>';pl.addEventListener("mouseenter",function(){var w=pl.querySelector(".metadata__wrap");w&&(w.innerHTML='<li style="color:#999">加载中…</li>');ExLoadLib(EXURL.flv,()=>{ExMetaProbe()},()=>{w&&(w.innerHTML="<li>flv.js 加载失败</li>")})},{once:!0});var c=0,mu,iv=setInterval(()=>{100<=++c&&clearInterval(iv);(mu=document.getElementsByClassName("menu-da2a9e")[0])&&(clearInterval(iv),mu.insertBefore(pl,mu.childNodes[1]))},500);var ExMetaProbe=function(){qr(B,!0,0,"1",e=>{if(""!=e||null!=e)if("None"==e)T("房间未开播或其他错误","error");else{var t=String(e).split("/live");0<t.length&&t[0];let n="Fake";var t=document.createElement("div"),o="",o=(t.id="exVideoDiv"+n,t.className="exVideoDiv",o+="<video controls='controls' class='exVideoPlayer' id='exVideoPlayer"+String(n)+"'></video><div class='exVideoScale' id='exVideoScale"+String(n)+"'></div>",t.innerHTML=o,E([".layout-Main",".playerWrap__8wGvw",".live-next-body"]));if(o.insertBefore(t,o.childNodes[0]),flvjs.isSupported()){t=document.getElementById("exVideoPlayer"+n);let o=flvjs.createPlayer({type:"flv",url:e},{fixAudioTimestampGap:!1});o.on("media_info",e=>{var t;e&&e.metadata&&(O=e.metadata,e=document.getElementById("exVideoDiv"+String(n)),t=document.getElementById("exVideoPlayer"+String(n)),o.destroy(),t.remove(),e.remove(),O)&&(O.dy_cpu_model||O.dy_gpu_model||O.dy_device_model||O.dy_os_version||O.z_canvas_code)&&((t=pl).innerHTML=`

    主播配置信息

    <ul class="metadata__wrap">

      ${O.dy_cpu_model?`<li title="${O.dy_cpu_model}">🤖CPU<br/>${O.dy_cpu_model}</li>`:""}

      ${O.dy_gpu_model?`<li title="${O.dy_gpu_model}">🎮显卡<br/>${O.dy_gpu_model}</li>`:""}

      ${O.dy_device_model?`<li title="${O.dy_device_model}">📱设备<br/>${O.dy_device_model}</li>`:""}

      ${O.dy_os_version?`<li title="${O.dy_os_version}">🖥️系统<br/>${O.dy_os_version}</li>`:""}

      ${O.z_canvas_code?`<li title="${O.z_canvas_code}">🎥场景<br/>${O.z_canvas_code}</li>`:""}

    </ul>

    `,(e=document.getElementsByClassName("menu-da2a9e")[0]).insertBefore(t,e.childNodes[1]))}),o.attachMediaElement(t),o.load()}}})};})(),wa(),ua(),Zi||(Zi=!0,document.addEventListener("fullscreenchange",ka,!0),document.addEventListener("webkitfullscreenchange",ka,!0),document.addEventListener("mozfullscreenchange",ka,!0),document.addEventListener("MSFullscreenChange",ka,!0)),ca(),va(),o=()=>{gr()},safeBind("#js-player-toolbar", "mouseover",o),safeBind("#js-player-asideMain", "mouseover",o),E([".inputView-2a65aa",".inputView-620ab7"]).addEventListener("focus",()=>{_r=!0}),E([".inputView-2a65aa",".inputView-620ab7"]).addEventListener("blur",()=>{_r=!1}),new q(".app-f0f9c7",!1,e=>{0<e.length&&(0<e[0].addedNodes.length?_r=!0:0<e[0].removedNodes.length&&(_r=!1))})}100<=++kr&&clearInterval(s)},1500)}l=document.createElement("div"),l.className="extool",l.innerHTML='<div class="extool__close" title="关闭">×</div>',i=(document.getElementsByClassName("layout-Player-chat")[0]||document.body),i.insertBefore(l,i.childNodes[0]),l=document.createElement("div"),l.className="extool-icon",l.innerHTML='<a class="ex-panel__icon" title="扩展功能"><svg t="1590294700144" style="display:block;" class="icon" viewBox="0 0 1077 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="11915" width="30" height="30"><path d="M152.770257 11.469971l213.048618 206.378138-37.094375 36.931681 159.440737 158.545917-76.95456 73.782015-159.440737-158.545917-38.47728 36.931681L0.244042 159.115348 152.770257 11.469971z" p-id="11916" fill="#d81e06"></path><path d="M1077.851922 217.848109h-105.751509L929.393073 260.311408l-31.644106 31.400063-33.02701 32.538926L776.866857 300.985065l-23.428026-87.204321 33.027009-32.538926 33.02701-32.538926L862.281538 105.751509V0.569431h-8.134732a244.041945 244.041945 0 0 0-178.964092 68.331745 234.768351 234.768351 0 0 0-68.738481 147.645376 250.712425 250.712425 0 0 0 10.981887 95.664443v2.765808a34.165872 34.165872 0 0 1-9.598983 36.931681c-17.896409 16.269463-525.096918 497.520178-525.096918 497.520178-42.625993 35.548777-38.47728 102.497617 0 142.113759 39.860184 38.233238 105.751509 40.673657 142.927233 0 0 0 478.322212-504.353352 498.984429-524.852875A33.677788 33.677788 0 0 1 754.821735 455.544963c5.531617 1.382904 10.981888 4.067366 16.269463 5.450271a242.170956 242.170956 0 0 0 87.936447 9.598983 237.290118 237.290118 0 0 0 148.45885-68.331745 231.677153 231.677153 0 0 0 68.738481-177.662536 14.805211 14.805211 0 0 0 1.626946-6.751827zM178.964093 943.628853a33.352399 33.352399 0 0 1-48.076263 0 32.538926 32.538926 0 0 1 0-47.832221 33.352399 33.352399 0 0 1 48.076263 0 35.467429 35.467429 0 0 1 0 47.832221z" p-id="11917" fill="#d81e06"></path><path d="M981.618049 785.082936L747.988561 567.804258S617.344773 601.97013 526.642517 753.682873c5.531617 1.382904 241.926915 239.161106 241.926914 239.161105a109.98157 109.98157 0 0 0 152.607563 0l60.441055-58.732761a102.823006 102.823006 0 0 0 0-149.028281zM854.146806 951.763584a29.366381 29.366381 0 0 1-38.477279 0l-195.233556-189.94598-1.382905-1.382904a25.543057 25.543057 0 0 1 1.382905-35.548777 29.366381 29.366381 0 0 1 38.47728 0l196.535113 189.94598A28.796949 28.796949 0 0 1 854.146806 951.763584z m86.634891-83.380997a29.366381 29.366381 0 0 1-38.47728 0L705.362568 678.436606l-1.382905-1.382904a25.543057 25.543057 0 0 1 1.382905-35.548777 29.366381 29.366381 0 0 1 38.477279 0l196.535113 189.945981a24.404194 24.404194 0 0 1 0 37.013028z" p-id="11918" fill="#d81e06"></path></svg><i id="extool__tip" class="ex-panel__tip"></i></a>',i=document.getElementsByClassName("ex-panel__wrap")[0],(i&&i.insertBefore(l,i.childNodes[0])),safeBind(".extool-icon", "click",function(){ee("扩展功能")}),l=document.getElementsByClassName("extool__close")[0],l&&l.addEventListener("click",e=>{e.stopPropagation();e=document.getElementsByClassName("extool")[0];e&&(e.style.display="none")}),i="",i+='<label><input style="margin-top:5px" id="extool__treasure_start" type="checkbox">半自动抢宝箱</label>',(i=document.createElement("div")).className="extool__treasure",i.innerHTML='<label><input style="margin-top:5px" id="extool__treasure_start" type="checkbox">半自动抢宝箱</label><label style="margin-left:10px;">延迟(抢得过快请调高)：</label><input id="extool__treasure_delay" type="text" style="width:50px;text-align:center;" value="3200" />ms<div class="extool__hint">说明：遇到验证码会自动弹出验证框，需要手动完成后才能领取。</div>',l=document.getElementsByClassName("extool")[0];l&&l.insertBefore(i,l.childNodes[0]),safeBind("#extool__treasure_start", "click",function(){(1==document.getElementById("extool__treasure_start").checked?(St=!0,unsafeWindow.socketProxy.socketStream.subscribe("tslist",i=>{if(null!=i)for(let n=0;n<i.list.length-1;n++){var a=i.list[n];let e=a.rpid;a=a.ot;let t=x("dy_did");var a=Number(a)-Math.floor(Date.now()/1e3),r=document.createElement("div");let o="Ex_Geetest_no"+String(fo);r.id=o,document.getElementById("Ex_Geetest").appendChild(r),0<=a?(a=1e3*a+Mt(),fo++,setTimeout(()=>{yo(B,e,t,o)},a)):yo(B,e,t,o)}})):St=!1,St=document.getElementById("extool__treasure_start").checked,e=safeEl("extool__treasure_delay").value,e={isGetTreasure:St,treasureDelay:e},localStorage.setItem("ExSave_Treasure",JSON.stringify(e)))});null!=(i=localStorage.getItem("ExSave_Treasure"))&&("treasureDelay"in(i=JSON.parse(i))==1?safeEl("extool__treasure_delay").value=i.treasureDelay:safeEl("extool__treasure_delay").value="3200",1==i.isGetTreasure)&&document.getElementById("extool__treasure_start").click();l=document.createElement("div"),l.className="extool__gold",l.innerHTML='<label><input id="extool__gold_start" type="checkbox">幻神模式</label><label><input id="extool__goldGift_start" type="checkbox">荧光棒变超火</label>',i=document.getElementsByClassName("extool")[0],i&&i.insertBefore(l,i.childNodes[0]),l=document.createElement("div"),l.className="ex_giftAnimation",i=document.getElementsByClassName("Barrage-main")[0],i&&i.insertBefore(l,i.childNodes[0]),safeBind("#extool__gold_start", "click",async function(){var e;1==document.getElementById("extool__gold_start").checked?(ft=new q(".danmu-e7f029",!0,xt),yt=new q(".Barrage-list",!0,vt),document.getElementsByClassName("FansMedalEnter-enterContent")[0].setAttribute("data-medal-level","50")):(ft.closeHook(),yt.closeHook()),e={isGold:e=document.getElementById("extool__gold_start").checked},localStorage.setItem("ExSave_Gold",JSON.stringify(e))}),safeBind("#extool__goldGift_start", "click",async function(){var e;gt=await K(),1==document.getElementById("extool__goldGift_start").checked?bt=new q(".BarrageBanner",!0,wt):bt.closeHook(),e={isGoldGift:e=document.getElementById("extool__goldGift_start").checked},localStorage.setItem("ExSave_GoldGift",JSON.stringify(e))}),l=localStorage.getItem("ExSave_Gold"),null!=l&&1==JSON.parse(l).isGold&&document.getElementById("extool__gold_start").click(),null!=(l=localStorage.getItem("ExSave_GoldGift"))&&1==JSON.parse(l).isGoldGift&&document.getElementById("extool__goldGift_start").click(),i=document.createElement("div"),i.className="extool__redpacket_room",i.innerHTML='<label><input id="extool__redpacekt_room_start" type="checkbox">自动抢礼物红包</label>',l=document.getElementsByClassName("extool")[0],l&&l.insertBefore(i,l.childNodes[0]),safeBind("#extool__redpacekt_room_start", "click",function(){(1==document.getElementById("extool__redpacekt_room_start").checked?Et=setInterval(()=>{fetch("https://www.douyu.com/japi/interactnc/web/propredpacket/getPrpList?type_id=1&room_id="+B,{method:"GET",mode:"no-cors",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded"}}).then(e=>e.json()).then(o=>{if(0<o.data.list.length)for(let t=0;t<o.data.list.length;t++){let e=o.data.list[t].activityid;var n=kt.indexOf(e),i=o.data.list[t].startTime,i=1e3*(Number(i)-Math.round((new Date).getTime()/1e3))-2e3;-1==n&&(kt.push(o.data.list[t].activityid),0<i?setTimeout(()=>{Bt(e),Bt(e),Bt(e),T("【礼物红包】抢红包执行完毕！","success")},i):(Bt(e),Bt(e),Bt(e),T("【礼物红包】抢红包执行完毕！","success")))}}).catch(e=>{console.log("请求失败!",e)})},6e4):clearInterval(Et),e={isGetRedPacket:e=document.getElementById("extool__redpacekt_room_start").checked},localStorage.setItem("ExSave_RedPacket_Room",JSON.stringify(e)))}),i=localStorage.getItem("ExSave_RedPacket_Room"),null!=i&&1==JSON.parse(i).isGetRedPacket&&document.getElementById("extool__redpacekt_room_start").click(),l="",l+='<label><input id="extool__autofish_start" type="checkbox">自动钓鱼</label><br>',(l=document.createElement("div")).className="extool__autofish",l.innerHTML='<label><input id="extool__autofish_start" type="checkbox">自动钓鱼</label><br><label><input name="autofish_mode" type="radio" value="all" checked>全天</label><label style="margin-left:5px;"><input name="autofish_mode" type="radio" value="contest">钓鱼大赛</label>',i=document.getElementsByClassName("extool")[0],i&&i.insertBefore(l,i.childNodes[0]),document.querySelectorAll('input[name="autofish_mode"]').forEach(e=>{e.addEventListener("change",dt)}),safeBind("#extool__autofish_start", "click",async()=>{dt();var e,t=safeEl("extool__autofish_start").checked;if(st(t),t)return T("【自动钓鱼】开始自动钓鱼","info"),tt=await new Promise(t=>{fetch(`https://www.douyu.com/japi/revenuenc/web/actfans/achieve/accList?rid=${B}&type=1&period=1`,{method:"GET",mode:"no-cors",cache:"default",credentials:"include"}).then(e=>e.json()).then(e=>{e.data?t(e.data.accList):t([])}).catch(e=>{console.log("请求失败!",e)})}),(t=await ct()).data?(e=t.data.baits.find(e=>e.inUse))?(ot=e.id,t.data.myCh?(dt(),0==t.data.fishing.stat&&(it=!1,nt=0),1==t.data.fishing.stat&&(it=!0,nt=t.data.fishing.fishEtMs),2==t.data.fishing.stat&&(await rt(),await b(1e3)),void(at=setInterval(async()=>{var e;(()=>{var e,t=(t=document.querySelector('input[name="autofish_mode"]:checked'))?t.value:"all";return"all"===t||(e=(t=new Date).getHours(),t=t.getMinutes(),12<=e&&t<30)||0===e&&t<30})()&&(it?(new Date).getTime()<=nt||await rt():0!==(e=await new Promise(t=>{fetch("https://www.douyu.com/japi/revenuenc/web/actfans/fishing/fishing",{method:"POST",mode:"no-cors",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:`ctn=${w()}&rid=${B}&baitId=${ot}&ver=1.1`}).then(e=>e.json()).then(e=>{t(e)}).catch(e=>{console.log("请求失败!",e)})})).error?(T("【自动钓鱼】"+e.msg,"error"),console.log(e,"钓鱼失败"),1001007==e.error&&await rt(),1005003==e.error&&clearInterval(at)):(it=!0,nt=e.data.fishing.fishEtMs))},1500))):(st(safeEl("extool__autofish_start").checked=!1),T("【自动钓鱼】请设置形象","error"))):(st(safeEl("extool__autofish_start").checked=!1),T("【自动钓鱼】请设置鱼饵","error")):(st(safeEl("extool__autofish_start").checked=!1),T("【自动钓鱼】未能获取活动信息","error"));clearInterval(at)}),l=lt(),l.rids.includes(B)&&(l=l.modes&&l.modes[B]?l.modes[B]:"all",document.querySelector(`input[name="autofish_mode"][value="${l}"]`).checked=!0,document.getElementById("extool__autofish_start").click()),i=document.createElement("div"),i.className="extool__clearbag",i.innerHTML='<label>背包送礼：[速度并不快,间隔>0.1s]</label><a id="extool__clearbag_showid" style="margin-left:10px;color:blue;" href="javascript:void(0);">礼物id示例</a><br /><label>礼物ID：</label><input id="extool__clearbag_id" type="text" style="width:50px;text-align:center;margin-right:10px;" value="268" /><label>数量：</label><input id="extool__clearbag_cnt" type="text" style="width:30px;text-align:center;" value="1" /><input style="margin-left:10px;" type="button" id="extool__clearbag_sendbtn" value="送出" />',l=document.getElementsByClassName("extool")[0],l&&l.insertBefore(i,l.childNodes[0]),safeBind("#extool__clearbag_sendbtn", "click",async function(){if(1==confirm("确认送出？")){let t=document.getElementById("extool__clearbag_id").value;var o=Number(document.getElementById("extool__clearbag_cnt").value);T("【背包送礼】执行中...","info");for(let e=0;e<o;e++)await b(100).then(()=>{Ut(t,1,B).then(e=>{"success"!=e.msg&&(T("【背包送礼】"+B+"赠送失败 "+e.msg,"error"),console.log(B,e))}).catch(e=>{T("【背包送礼】"+B+"赠送失败","error"),console.log(B,e)})});T("【背包送礼】执行完毕！","success")}}),safeBind("#extool__clearbag_showid", "click",function(){pt(B,t=>{var o=t.data.list.length;if(0<o){for(let e=0;e<o;e++){var n=t.data.list[e].id,i=t.data.list[e].name;console.log("【"+i+"】 id:"+n)}T("请按F12到控制台(console)查看背包礼物id","success")}else T("背包礼物为空","error")})}),i="",i=(i=(i+='<label>送礼：[用于打榜,例如送出999个飞机]</label><a style="margin-left:10px;color:blue;" href="http://open.douyucdn.cn/api/RoomApi/room/'+B+'" target="_blank">礼物id示例</a><br />')+'<label>礼物ID：</label><input id="extool__sendgift_id" type="text" style="width:50px;text-align:center;margin-right:10px;" value="20000" /><label>数量：</label><input id="extool__sendgift_cnt" type="text" style="width:30px;text-align:center;margin-right:10px;" value="1" />')+'<br/><label>间隔ms：</label><input id="extool__sendgift_delay" type="text" style="width:30px;text-align:center;" value="0" /><input style="margin-left:10px;" type="button" id="extool__sendgift_btn" value="送出" />',l=document.createElement("div"),l.className="extool__sendgift",l.innerHTML=i,(i=document.getElementsByClassName("extool")[0]).insertBefore(l,i.childNodes[0]),safeBind("#extool__sendgift_btn", "click",async()=>{if(1==confirm("确认送出？")){let o=document.getElementById("extool__sendgift_id").value,n=document.getElementById("extool__sendgift_cnt").value;var e,r=Number(document.getElementById("extool__sendgift_delay").value);let i=0,a=0;for(let t=0;t<Number(n);t++)e=o,fetch("https://www.douyu.com/japi/gift/donate/mainsite/v1",{method:"POST",mode:"no-cors",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"giftId="+e+"&giftCount="+1+"&roomId="+B+"&bizExt=%7B%22yzxq%22%3A%7B%7D%7D"}).then(e=>e.json()).then(e=>{null!=e.data&&"鱼翅不足"!=e.msg?(i+=1,a+=Number(e.data.priceType)):console.log("【送礼】"+o+e.msg),t==Number(n)-1&&(T("【送礼】赠送完毕！详细信息可以在F12控制台查看","success"),console.log("【送礼】赠送完毕！详细信息可以在F12控制台查看"))}).catch(e=>{console.log("请求失败!",e)}),0<r&&await b(r);T("【送礼】执行中...","info")}}),localStorage.setItem("freetimed","1");
// 构造并在送礼上方插入［播放与性能］2x2网格卡片
(function() {
    var _extool = document.querySelector(".extool");
    var _sendGift = document.querySelector(".extool__sendgift");
    if (!_extool) return;
    
    var perfCard = document.createElement("div");
    perfCard.className = "extool__player_perf";
    perfCard.innerHTML = `
        <div class="extool__perf_header">
            <span class="extool__perf_title">播放与性能</span>
            <span class="extool__perf_badge">原生极清</span>
        </div>
        <div class="extool__perf_grid">
            <label class="extool__perf_item" title="原生劫持锁定最高画质，杜绝二次重载卡顿">
                <input id="extool__highestvideoquality" type="checkbox">
                <span class="extool__perf_text">自动最高画质</span>
            </label>
            <label class="extool__perf_item" title="自动展开网页全屏观播">
                <input id="extool__fullscreen" type="checkbox">
                <span class="extool__perf_text">自动网页全屏</span>
            </label>
            <label class="extool__perf_item" title="屏蔽 WebRTC P2P 后台偷偷上传带宽">
                <input id="extool__p2p" type="checkbox">
                <span class="extool__perf_text">阻止p2p上传</span>
            </label>
            <label class="extool__perf_item" title="后台播放保活，阻止 Chrome 浏览器页签睡眠冻结">
                <input id="extool__tabSwitch" type="checkbox">
                <span class="extool__perf_text">防页签冻结</span>
            </label>
        </div>
    `;
    if (_sendGift) {
        _extool.insertBefore(perfCard, _sendGift);
    } else {
        _extool.appendChild(perfCard);
    }
})();

safeBind("#extool__tabSwitch", "click", function(){
    var e = safeEl("extool__tabSwitch").checked;
    Tt(e);
    e ? Ct() : (T("已关闭页面防挂机，请刷新页面生效", "info"), window.__pip_is_active__ && sa());
});
null != (l = localStorage.getItem("ExSave_TabSwitch")) && (l = JSON.parse(l)).isEnableTabSwitch && (safeEl("extool__tabSwitch").checked = l.isEnableTabSwitch, Ct());

safeBind("#extool__p2p", "click", function(){
    var e = { isKillP2P: _t() };
    localStorage.setItem("ExSave_P2P", JSON.stringify(e));
    _t() && T("阻止p2p上传成功，刷新页面生效", "success");
});
null != (i = localStorage.getItem("ExSave_P2P")) && (i = JSON.parse(i)).isKillP2P && (safeEl("extool__p2p").checked = i.isKillP2P);

safeBind("#extool__fullscreen", "click", function(){
    var e = { isFullScreen: mt() };
    localStorage.setItem("ExSave_FullScreen", JSON.stringify(e));
    mt() && T("刷新页面生效", "success");
});
safeBind("#extool__highestvideoquality", "click", function(){
    var e = { isHighestVideoQuality: ut() };
    localStorage.setItem("ExSave_HighestVideoQuality", JSON.stringify(e));
    ut() && T("刷新页面生效", "success");
});
null != (l = localStorage.getItem("ExSave_FullScreen")) && (l = JSON.parse(l)).isFullScreen && (safeEl("extool__fullscreen").checked = l.isFullScreen);
null != (i = localStorage.getItem("ExSave_HighestVideoQuality")) && (i = JSON.parse(i)).isHighestVideoQuality && (safeEl("extool__highestvideoquality").checked = i.isHighestVideoQuality);
l=document.createElement("a"),l.className="refresh-barrage",l.id="refresh-barrage-frame",l.innerHTML='<svg t="1588051109604" id="refresh-barrage-frame__svg" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3095" width="16" height="16"><path d="M512 128 192 448h192v448h256V448h192L512 128z" fill="#AFAFAF" p-id="3096"></path></svg><i class="Barrage-toolbarIcon"></i><span id="refresh-barrage-frame__text" class="Barrage-toolbarText">拉高</span>',i=document.getElementsByClassName("Barrage-toolbar")[0];i&&i.insertBefore(l,i.childNodes[0]),safeBind("#refresh-barrage-frame", "click",function(){let t=document.getElementsByClassName("layout-Player-rank")[0],o=document.getElementById("js-room-activity"),n=document.getElementsByClassName("Barrage")[0];var e;"none"==t.style.display?(t.style.display="block",o.style.display="block",n.className="Barrage",safeEl("refresh-barrage-frame__text").innerText="拉高",document.getElementById("refresh-barrage-frame").classList.remove("ex-active"),document.getElementById("refresh-barrage-frame__text").style.color="",(e=document.getElementById("refresh-barrage-frame__svg"))&&(e=e.getElementsByTagName("path")[0])&&e.setAttribute("fill","#AFAFAF"),pn()):(t.style.display="none",o.style.display="none",n.className="Barrage top-0-important",safeEl("refresh-barrage-frame__text").innerText="拉高",document.getElementById("refresh-barrage-frame").classList.add("ex-active"),document.getElementById("refresh-barrage-frame__text").style.color="#fff",(e=document.getElementById("refresh-barrage-frame__svg"))&&(e=e.getElementsByTagName("path")[0])&&e.setAttribute("fill","#ffffff"),pn())});l=localStorage.getItem("ExSave_Refresh");null!=l&&("barrageFrame"in(l=JSON.parse(l))==0&&(l.barrageFrame={status:!1}),1==l.barrageFrame.status)&&(l=document.getElementsByClassName("layout-Player-rank")[0],i=document.getElementById("js-room-activity"),l.style.display="none",i.style.display="none",safeEl("refresh-barrage-frame__text").innerText="拉高",document.getElementById("refresh-barrage-frame").classList.add("ex-active"),document.getElementById("refresh-barrage-frame__text").style.color="#fff",l=document.getElementById("refresh-barrage-frame__svg"))&&(i=l.getElementsByTagName("path")[0])&&i.setAttribute("fill","#ffffff");{let d=setInterval(()=>{if(E([".right-e7ea5d",".right-17e251"])){clearInterval(d);{let e=document.createElement("li"),t=(e.id="refresh-video",e.innerText="隐藏礼物栏",document.getElementsByClassName("menu-da2a9e")[0]);t.insertBefore(e,t.childNodes[t.childNodes.length-1]),!document.getElementById("refresh-video3")&&((e=document.createElement("div")).id="refresh-video3",e.title="点击隐藏礼物栏",e.innerHTML=`<div style="display:flex;align-items:center;gap:6px;">

            <div style="font-size:12px;">隐藏礼物栏</div>

            <div id="ex-refresh-switch" style="width:26px;height:14px;background:rgba(255,255,255,0.3);border-radius:7px;position:relative;transition:background 0.3s;">

                <div id="ex-refresh-switch-circle" style="width:10px;height:10px;background:#fff;border-radius:50%;position:absolute;top:2px;left:2px;transition:left 0.3s, background 0.3s;"></div>

            </div>

        </div>`,e.style="position:absolute;left:18px;bottom:58px;padding:0 10px;height:28px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);color:#fff;z-index:9999;cursor:pointer;user-select:none;opacity:0;transform:scale(.9);transition:opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .3s ease;pointer-events:none;",t=document.getElementById("js-player-dialog"))&&t.insertBefore(e,t.childNodes[0])}{function a(){let e=!1;var t=!!(document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.msFullscreenElement);let o=!1;(document.querySelector(".wfs-2a8e83.removed-9d4c42")||document.querySelector(".toggle__P8TKM"))&&(e=!0),document.querySelector(".shrink__Sd0uK")&&(o=!0);var n=document.getElementById("js-player-toolbar"),i=(n.style=e?"z-index:20":"z-index:30",document.getElementsByClassName("case__f4yex")[0]),i=(i&&(i.style=(t||e&&o)&&fn()?"bottom: -84px;":"bottom: 0;"),!!document.getElementsByClassName("live-next-body")[0]);i&&(n.parentElement.style="z-index:20")}new q(".right-e7ea5d",!0,()=>{a()}),new q(".right-17e251",!0,()=>{a()}),new q(".video__VfhVg",!0,e=>{for(var t of e)t.target.className.includes("toggle__P8TKM")&&a()});let e=E([".layout-Player-video",".stream__T55I3"]),t=document.getElementsByClassName("room-Player-Box")[0],o=document.getElementById("refresh-video3"),i=0,n=!1;function r(){!o||n||(o.style.transition="opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .3s ease",o.style.opacity="0",o.style.transform="scale(.9)",o.style.pointerEvents="none",clearTimeout(i))}function l(){o&&(o.style.transition="opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .3s ease",o.style.opacity="1",o.style.transform="scale(1)",o.style.pointerEvents="auto",clearTimeout(i),i=setTimeout(()=>{r()},2e3))}function s(){var e=document.getElementsByClassName("PlayerToolbar-ContentRow")[0],t=E([".layout-Player-video",".stream__T55I3"]),o=document.getElementById("refresh-video");let n=document.getElementById("refresh-video3");e&&t&&o&&("hidden"==e.style.visibility?(e.style.visibility="visible",Ht(),t.style="",n&&(n.style.opacity="0",n.style.transform="scale(.9)",n.style.pointerEvents="none",n.title="点击隐藏礼物栏"),hn(!(o.innerText="隐藏礼物栏")),U("Ex_Style_VideoRefresh")):(e.style.visibility="hidden",Ft(),t.style="bottom:0;z-index:25",o.innerText="✓ 隐藏礼物栏",n&&(n.title="点击显示礼物栏"),hn(!0),n&&(n.style.transition="opacity .3s ease,transform .3s cubic-bezier(0.175, 0.885, 0.32, 1.275),background-color .3s ease,box-shadow .3s ease",n.style.opacity="1",n.style.transform="scale(1.1)",n.style.pointerEvents="auto",n.style.backgroundColor="rgba(0,0,0,.8)",n.style.boxShadow="0 0 15px rgba(255, 102, 0, 0.6)",clearTimeout(i),i=setTimeout(()=>{n.style.transition="opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .15s ease",n.style.transform="scale(1)",n.style.backgroundColor="rgba(0,0,0,.55)",n.style.boxShadow="none",i=setTimeout(()=>{r()},1500)},800)),yn()),a(),pn(),te())}e&&o&&(e.addEventListener("mouseenter",()=>{l()}),e.addEventListener("mouseleave",()=>{r()})),t&&o&&t.addEventListener("mousemove",()=>{l()}),o&&(o.addEventListener("mouseenter",()=>{n=!0,o.style.transition="opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .3s ease",o.style.opacity="1",o.style.transform="scale(1.08)",o.style.pointerEvents="auto",o.style.backgroundColor="rgba(0,0,0,.7)",clearTimeout(i)}),o.addEventListener("mouseleave",()=>{n=!1,o.style.transform="scale(1)",o.style.backgroundColor="rgba(0,0,0,.55)",l()})),safeBind("#refresh-video", "click",e=>{s()}),o&&o.addEventListener("click",e=>{e.stopPropagation(),s()})}var e,t,o,n,i=localStorage.getItem("ExSave_Refresh");null!=i&&("video"in(i=JSON.parse(i))==0&&(i.video={status:!1}),1==i.video.status)&&(i=document.getElementsByClassName("PlayerToolbar-ContentRow")[0],e=E([".layout-Player-video",".stream__T55I3"]),t=document.getElementById("refresh-video"),o=document.getElementById("refresh-video3"),n=document.getElementById("js-player-toolbar"),i.style.visibility="hidden",e.style="bottom:0;z-index:25",n.style="z-index:30",null!=(i=localStorage.getItem("ExSave_FullScreen"))&&JSON.parse(i).isFullScreen&&(n.style="z-index:20"),document.getElementsByClassName("live-next-body")[0]&&(n.parentElement.style="z-index:20"),o&&(o.style.opacity="0",o.style.transform="scale(.9)",o.style.pointerEvents="none",o.title="点击显示礼物栏"),t.innerText="✓ 隐藏礼物栏",yn(),te(),setTimeout(()=>{hn(!0)},500))}100<=++gn&&clearInterval(d)},1500)}l=document.createElement("a"),l.className="refresh-barrage",l.id="refresh-barrage",l.innerHTML='<svg t="1588051109604" id="refresh-barrage__svg" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3095" width="16" height="16"><path d="M588.416 516.096L787.2 317.312a54.016 54.016 0 1 0-76.416-76.416L512 439.68 313.216 241.024A54.016 54.016 0 1 0 236.8 317.376l198.784 198.848-198.016 197.888a54.016 54.016 0 1 0 76.416 76.416L512 592.576l197.888 197.952a54.016 54.016 0 1 0 76.416-76.416L588.416 516.096z" fill="#AFAFAF" p-id="3096"></path></svg><i class="Barrage-toolbarIcon"></i><span id="refresh-barrage__text" class="Barrage-toolbarText">前缀</span>',i=document.getElementsByClassName("Barrage-toolbar")[0],i&&i.insertBefore(l,i.childNodes[0]),safeBind("#refresh-barrage", "click",function(){var e;0==mn?(un(),pn()):(U("Ex_Style_RefreshBarrage"),mn=0,document.getElementById("refresh-barrage").classList.remove("ex-active"),document.getElementById("refresh-barrage__text").style.color="",safeEl("refresh-barrage__text").innerText="前缀",(e=document.getElementById("refresh-barrage__svg"))&&(e=e.getElementsByTagName("path")[0])&&e.setAttribute("fill","#AFAFAF"),pn())}),l=localStorage.getItem("ExSave_Refresh"),null!=l&&("barrage"in(l=JSON.parse(l))==0&&(l.barrage={status:!1}),1==l.barrage.status)&&un(),i="",l=document.createElement("div"),l.className="bloop",i+='<div style="display:inline-block"><label>弹幕：</label></div>',l.innerHTML='<div class="bloop__header_card"><label class="bloop__header_label">弹幕：</label><select id="bloop__select"></select><input type="button" id="bloop__save" value="保存"/><input type="button" id="bloop__delete" value="删除"/></div><div class="bloop__textarea_card"><textarea placeholder="一行一个，开启舔狗模式后此处不需要输入" id="bloop__textarea" rows="4"></textarea></div><div class="bloop__setting_card"><div class="bloop__setting_row"><label>速度(ms)：</label><input id="bloop__text_speed1" type="text" style="width:48px;text-align:center;" value="2000" />~<input id="bloop__text_speed2" type="text" style="width:48px;text-align:center;" value="3000" /></div><div class="bloop__setting_row"><label>限时(min)：</label><input id="bloop__text_stoptime" type="text" style="width:48px;text-align:center;" value="1" /></div></div><div class="bloop__options_card"><label><input id="bloop__checkbox_changeColor" type="checkbox" name="checkbox_changeColor" checked>自动变色</label><label><input id="bloop__checkbox_tiangou" type="checkbox">舔狗模式</label><label><input id="bloop__checkbox_random" type="checkbox">随机发送</label></div><div class="bloop__switch_card"><label class="bloop__switch_label"><input id="bloop__checkbox_startSend" type="checkbox">开始发送</label></div>',(i=(document.getElementsByClassName("layout-Player-chat")[0]||document.body),i.insertBefore(l,i.childNodes[0])),l=document.createElement("div"),l.className="bloop-icon",l.innerHTML='<a class="ex-panel__icon" title="弹幕发送小助手"><svg t="1578572568198" style="display: block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="55445" width="32" height="32"><path d="M511.99883605 1020.07740302c-68.78771655 0-135.53209458-13.47788003-198.38074083-40.06106453-60.69004402-25.67037725-115.18953131-62.41203655-161.98371328-109.20738247-46.79418197-46.79301803-83.53700523-101.29366926-109.20621853-161.98371328C15.84497778 645.97776043 2.36709774 579.23105337 2.36709774 510.4445019s13.47904398-135.53209458 40.06106453-198.38074083c25.6692133-60.69004402 62.41203655-115.18953131 109.20621853-161.98371328 46.79534706-46.79418197 101.29366926-83.53700523 161.98371328-109.20621853 62.84864739-26.5831845 129.59418937-40.06106453 198.38074083-40.06106453 68.78771655 0 135.53209458 13.47904398 198.38190592 40.06106453 60.69004402 25.6692133 115.18953131 62.41203655 161.98487723 109.20621853 46.79301803 46.79418197 83.53584128 101.29366926 109.20621853 161.98371328 26.5831845 62.84864739 40.06106453 129.59418937 40.06106453 198.38074083s-13.47788003 135.53325853-40.06106453 198.38074084c-25.67037725 60.69004402-62.41203655 115.19069525-109.20621853 161.98371328-46.79534706 46.79418197-101.29483435 83.53817031-161.98487723 109.20738247C647.53092949 1006.59952413 580.78655147 1020.07740302 511.99883605 1020.07740302zM511.99883605 57.86089358c-249.55500203 0-452.58244437 203.02744235-452.58244437 452.58244437s203.02744235 452.58244437 452.58244437 452.58244438c249.55616597 0 452.58360832-203.02744235 452.58360832-452.58244438C964.58244437 260.88949987 761.55500203 57.86089358 511.99883605 57.86089358z" p-id="55446" fill="#1296db" data-spm-anchor-id="a313x.7781069.0.i24"></path><path d="M322.42598685 461.65355293l-8.51099648 74.46598314 97.86947811 0c-2.85950862 76.59314973-4.9866752 127.6556379-6.38266595 153.18746454-1.42975431 51.06132423-27.65899321 75.16339541-78.72148139 72.33881542-18.45058333 1.39598962-35.47024839 2.12716658-51.06248818 2.12716658-2.85950862-17.02082901-6.38266595-34.77283613-10.63816419-53.19081984 18.41681863 0 35.43764878 0 51.06248817 0 25.53066155 2.82574393 38.99456967-7.77981952 40.42432399-31.9133275 1.39598962-9.9069861 2.12833166-25.53182663 2.12833166-46.80698994 1.39598962-21.27632725 2.12716658-36.86740309 2.12716658-46.80698994l-99.9966447 0 14.89366244-172.33546126 89.3584805 0 0-78.72148138-102.12497636 0 0-48.9353216 151.05913287 0 0 176.5909595L322.42598685 461.65355293zM450.08162475 580.79819435l0-242.54594504 74.46598314 0c-17.0219941-24.10090723-31.91449145-43.25006791-44.67982222-57.44515413l46.80698994-21.27632725c4.25433429 4.25549824 10.63699911 12.06675342 19.14799673 23.40349497 15.5910747 18.45058333 24.79948459 30.51733789 27.65899321 36.16882574l-42.5514917 19.14799673 80.84864796 0c25.53066155-38.29715741 41.8203136-64.5263963 48.93415652-78.72031744l53.19081984 14.89366244c-5.68525255 8.50983253-15.62483939 22.70491762-29.78732487 42.55149169-7.11384291 9.93958685-12.06675342 17.02082901-14.89249849 21.27516331l70.20931982 0 0 242.54594503L620.28991829 580.7970304l0 51.06248818 144.67646806 0 0 48.93415651L620.28991829 680.79367509l0 87.23131392-51.06132423 0 0-87.23131392L428.80646144 680.79367509l0-48.93415651 140.42213376 0 0-51.06248818L450.08162475 580.7970304zM501.14411293 385.0604032l0 53.18965475 68.08331718 0 0-53.18965475L501.14411293 385.0604032zM501.14411293 480.80154965l0 55.31682248 68.08331718 0L569.22743011 480.80154965 501.14411293 480.80154965zM688.37323549 385.0604032l-68.0833172 0 0 53.18965475 68.0833172 0L688.37323549 385.0604032zM620.28991829 480.80154965l0 55.31682248 68.0833172 0L688.37323549 480.80154965 620.28991829 480.80154965z" p-id="55447" fill="#1296db"></path></svg><i id="bloop__tip" class="ex-panel__tip"></i></a>',i=document.getElementsByClassName("ex-panel__wrap")[0],(i&&i.insertBefore(l,i.childNodes[0])),safeBind(".bloop-icon", "click",function(){ee("弹幕发送小助手")}),safeBind("#bloop__checkbox_changeColor", "click",function(){ye=safeEl("bloop__checkbox_changeColor").checked}),safeBind("#bloop__checkbox_startSend", "click",function(){var n;if(1==safeEl("bloop__checkbox_startSend").checked){pe.length=0,ue=0,n=document.getElementById("bloop__textarea").value,pe=n.split("\n"),ue=pe.length-1;{ce.length=0,me=0;let t=document.getElementsByClassName("FansBarrageSwitcher"),e=document.getElementsByClassName("NobleBarrageSwitcher is-active"),o=!1;0<e.length&&(o=!0),0==t.length?(be=!0,null!=(n=document.getElementsByClassName("MatchSystemFansBarrageSwitcher")[0])?(n.click(),t=document.getElementsByClassName("MatchSystemFansBarrageColor-item")):be=!1):(t[0].click(),t=document.getElementsByClassName("FansBarrageColor-item"),be=!1);for(let e=0;e<t.length;e++)-1==t[e].className.indexOf("is-lock")&&(ce.push(e),me++);--me,1==o&&document.getElementsByClassName("NobleBarrageSwitcher")[0].click()}fe=1==document.getElementById("bloop__checkbox_random").checked?(he=Math.floor(Math.random()*pe.length),Math.floor(Math.random()*ce.length)):he=0,ke(),ge=setTimeout(Ee,_e()),ve=setTimeout(()=>{safeEl("bloop__checkbox_startSend").checked=!1,clearTimeout(ge)},(n=safeEl("bloop__text_stoptime").value,60*Number(n)*1e3))}else clearTimeout(ge),clearTimeout(ve)}),safeBind("#bloop__checkbox_tiangou", "click",function(){var e=safeEl("bloop__checkbox_tiangou").checked;safeEl("bloop__textarea").disabled=1==e,ke()}),safeEl("bloop__select").onclick=function(){var e,t;0!=this.options.length&&(e=document.getElementById("bloop__textarea"),t=this.options[this.selectedIndex].text,e.value=t,e.value=e.value.replace(/\\r/g,"\r"))},safeBind("#bloop__save", "click",()=>{var e=document.getElementById("bloop__select"),t=document.getElementById("bloop__textarea").value;""!=t&&(xe.push(t),e.options.add(new Option(t.replace(/\n/g,"\\r"),!0)),ke())}),safeBind("#bloop__delete", "click",()=>{var e=document.getElementById("bloop__select"),o=e.options[e.selectedIndex];if(o){let t=o.text;xe=xe.filter(e=>e!==t),e.options.remove(e.selectedIndex),ke()}}),l=localStorage.getItem("ExSave_BarrageLoopOptions");if(null!=l){l=JSON.parse(l);"speed1"in l==0&&(l.speed1=2e3),"speed2"in l==0&&(l.speed2=3e3),"stopTime"in l==0&&(l.stopTime=5),"isTiangouMode"in l==0&&(l.isTiangouMode=!1);let t=document.getElementById("bloop__select");l.text.forEach(e=>{t.options.add(new Option(e.replace(/\r/g,"\\r"),""))}),xe=l.text,safeEl("bloop__checkbox_changeColor").checked=l.isChangeColor,ye=Boolean(l.isChangeColor),safeEl("bloop__text_speed1").value=l.speed1,safeEl("bloop__text_speed2").value=l.speed2,safeEl("bloop__text_stoptime").value=l.stopTime,1==l.isTiangouMode&&(safeEl("bloop__checkbox_tiangou").checked=l.isTiangouMode,safeEl("bloop__textarea").disabled=!0)}i=document.createElement("div"),i.className="fans-continue",i.innerHTML='<a class="ex-panel__icon" title="一键续牌"><img style="width: 32px;height: 32px;" src="https://gfs-op.douyucdn.cn/dygift/1705/7db9beee246848252f1c7fe916259f4e.png"/><i id="fans-continue__tip" class="ex-panel__tip"></i></a>',l=document.getElementsByClassName("ex-panel__wrap")[0],(l&&l.insertBefore(i,l.childNodes[0])),safeBind(".fans-continue", "click", function(e){ if (e && typeof e.stopPropagation === "function") e.stopPropagation(); triggerFansContinue(); }),i=document.createElement("div"),i.className="ex-sign",i.innerHTML='<a class="ex-panel__icon" title="一键签到(所有关注的直播间/鱼吧/客户端/车队/活动)"><svg style="display: block;" t="1578566545259" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12959" width="32" height="32"><path d="M698.368 80.896v114.688c0 23.552 19.968 43.008 44.032 43.008s44.032-19.456 44.032-43.008V80.896c0-23.552-19.968-43.008-44.032-43.008s-44.032 18.944-44.032 43.008zM227.328 80.896v114.688c0 23.552 19.968 43.008 44.032 43.008 24.576 0 44.032-19.456 44.032-43.008V80.896c0-23.552-19.968-43.008-44.032-43.008-24.576 0-44.032 18.944-44.032 43.008z" fill="#F96C5D" p-id="12960"></path><path d="M977.92 195.584c0-23.552-19.968-43.008-44.032-43.008h-88.576v43.008c0 55.296-46.08 100.352-102.912 100.352s-102.912-45.056-102.912-100.352v-43.008H374.272v43.008c0 55.296-46.08 100.352-102.912 100.352-56.832 0-102.912-45.056-102.912-100.352v-43.008H79.872c-24.576 0-44.032 19.456-44.032 43.008v611.328l252.928-145.92-8.192-8.192c-10.24-9.728-16.384-23.552-16.384-38.4 0-29.696 25.088-54.272 55.808-54.272 15.36 0 29.184 6.144 39.424 15.872l28.16 27.648L977.92 263.168V195.584z" fill="#F96C5D" p-id="12961"></path><path d="M329.216 278.528c-5.632 3.584-11.264 6.656-17.408 9.216 5.632-2.56 11.776-5.632 17.408-9.216zM344.064 266.24c4.608-4.608 8.704-9.728 12.8-14.848-3.584 5.632-8.192 10.24-12.8 14.848zM329.216 278.528c5.632-3.584 10.752-7.68 15.36-12.288-5.12 4.608-10.24 8.704-15.36 12.288zM449.536 664.064l220.16-214.016c10.24-9.728 24.064-15.872 39.424-15.872 30.72 0 55.808 24.064 55.808 54.272 0 14.848-6.144 28.672-16.384 38.4l-259.072 252.416c-10.24 9.728-24.064 15.872-39.424 15.872s-29.184-6.144-39.424-15.872l-121.344-118.272L35.84 806.912v104.96c0 23.552 19.968 43.008 44.032 43.008h854.016c24.576 0 44.032-19.456 44.032-43.008V263.168L387.584 603.648l61.952 60.416zM350.72 569.856c-4.608-3.072-9.216-5.12-14.336-6.656 5.12 1.024 10.24 3.584 14.336 6.656zM271.36 295.936c14.336 0 27.648-2.56 39.936-7.68-12.288 4.608-25.6 7.68-39.936 7.68z" fill="#F15A4A" p-id="12962"></path></svg><i id="ex-sign__tip" class="ex-panel__tip"></i></a>',l=document.getElementsByClassName("ex-panel__wrap")[0],(l&&l.insertBefore(i,l.childNodes[0])),((_sEl=document.getElementsByClassName("ex-sign")[0])&&(i=new Ar(_sEl),i.click(()=>{Wn(!1)}),i.longClick(()=>{Wn(!0)})));{let e=setInterval(()=>{0<document.getElementsByClassName("danmuTips-1ee820").length&&(clearInterval(e),document.getElementsByClassName("danmuTips-1ee820")[0].parentElement.id="Ex_BarragePanel",new q("#Ex_BarragePanel",!0,i=>{Ie(()=>{let t=!1;if(0<i.length){for(let e=0;e<i.length;e++)if("attributes"==i[e].type){t=!0;break}var e,o,n;0==t?0<(n=i[0].addedNodes).length&&"getElementsByClassName"in(n=n[0])!=0&&(o=n.getElementsByClassName("buttonGroup-de6b66")[0],e="",0<(n=n.getElementsByClassName("danmuAuthor-3d7b4a")).length)&&(e=n[0].innerText,Ce(n[0],e),Le(o),Ne(o),Se(o),Me(o),Ae(0,e)):(0<(n=document.getElementsByClassName("barragePanel__funcPanel")).length&&n[0].remove(),null!=(o=document.getElementsByClassName("danmudiv-32f498")[0])&&(e=o.getElementsByClassName("buttonGroup-de6b66")[0],n="",0<(o=o.getElementsByClassName("danmuAuthor-3d7b4a")).length&&(n=o[0].innerText,Ce(o[0],n),Le(e),Ne(e),Se(e),Me(e),Ae(0,n)),Te()))}})}),new q("#Ex_BarragePanel",!1,e=>{Ie(()=>{Te()})}))},1500);new q("#comment-dzjy-container",!1,t=>{if(!(t.length<=0||t[0].addedNodes.length<=0)){{let e=document.createElement("div");e.style.display="inline-block";t=document.getElementsByClassName("labelfisrt-407af4");0!==t.length&&((t=t[0].parentElement).appendChild(e),(e=document.createElement("p")).className="sugun-e3fbf6",e.innerText="|",t.appendChild(e),(e=document.createElement("div")).className="labelfisrt-407af4 thirdBtn-06cde5 fourBtn-0845d4",e.id="barrage-panel-tip__+1",e.innerText="+1",t.appendChild(e))}safeEl("barrage-panel-tip__+1").onclick=()=>{var e=document.getElementById("comment-higher-container");0<e.getElementsByClassName("ex-image-danmaku").length?we(e.getElementsByClassName("text-879f3e")[0].innerHTML.replace(/<a[^>]*><img\s+(?:.*?\s+)?src="(.*?)"[^>]*?\/?><\/a>/g,(e,t)=>`[DouyuEx图片${(e=>(e=BigInt(e)).toString(36))((t=(t=(t=t.split("/")).pop()).split("."))[0])}.${t[2]}]`)):we(e.innerText)}}})}l=!!document.getElementsByClassName("live-next-body")[0];if(!l){l=document.createElement("div");l.style="position: absolute;right: -14px;top: 32px;cursor: pointer;",l.id="ex-accountList-icon",l.innerHTML=oe+`

        <div id="ex-accountList-wrap" class="public-DropMenu-drop">

            <div class="public-DropMenu-drop-main">

                <div id="ex-accountList-iframe"></div>

                <div id="ex-accountList-iframe2"></div>

                <div id="ex-accountList-content" style="width: 300px;font-size: 14px;padding: 10px;">

                </div>

            </div>

            <i></i>

        </div>

    `,((_hr=document.getElementsByClassName("Header-right")[0])&&_hr.appendChild(l));{let e=JSON.parse(GM_getValue("Ex_accountList")||"{}"),a={},r="";GM_cookie("list",{path:"/"},function(t){var o=[];if(null==t)safeEl("ex-accountList-content").innerHTML="请升级Tampermonkey版本<br/><a href='https://www.crx4chrome.com/crx/1429/'>点我升级，选择Crx4Chrome</a>";else{for(let e=0;e<t.length;e++){var n=t[e].name,i=t[e].value;"acf_nickname"==n&&(a.nickname=i),"acf_uid"==n&&(a.uid=i,r=i),"acf_avatar"==n&&(a.avatar=i),o.push(t[e])}""==r&&(a.uid="null",r="null"),a.data=o,a.update_time=String((new Date).getTime()),e[r]=a,GM_setValue("Ex_accountList",JSON.stringify(e)),ie(e)}})}re("null",I),unsafeWindow.addEventListener("message",e=>{switch(e.data){case"cleanOver":setTimeout(()=>{window.location.reload()},50);break;case"msgCleanOver":case"yubaCleanOver":case"videoCleanOver":case"czCleanOver":case"switchOver":5<=++ne&&(ne=0,setTimeout(()=>{window.location.reload()},50));break;case"deleteOver":ie(),T("【账号管理】删除完毕","success")}})}safeBind(".ChatSend-txt", "keydown",e=>{var t=e.target,o="TEXTAREA"===t.tagName;38==e.keyCode?0==$(t)&&(C=0<C?C-1:C,ze()):40==e.keyCode?(o=(o?t.value:t.innerText).length,$(t)==o&&(C=C<De.length-1?C+1:C,ze())):13==e.keyCode&&Pe(Oe())}),safeBind(".ChatSend-button", "click",()=>{Pe(Oe())});i=document.createElement("span"),i.className="month-cost",i.innerHTML=`

	本月消费 <span id="monthcost__money">***</span> 元

	<span class="monthcost__icon"></span>

	`,i.title="数据每日更新，根据个人中心消费数据统计",l=E(["#js-backpack-enter"]),(l=l&&l.parentElement)&&l.insertBefore(i,l.childNodes[0]),i=Ho();if(i)i.addEventListener("click",()=>{Ro=1===Ro?0:1,localStorage.setItem(Do,String(Ro)),Go(),1===Ro&&Yo()});Ro=(()=>{var e=localStorage.getItem(Do);return null!=e&&1===Number(e)?1:0})();Go();1===Ro&&Yo();fetch("https://www.douyu.com/member/platform_task/effect_list",{method:"GET",mode:"no-cors",cache:"default",credentials:"include"}).then(e=>e.text()).then(async e=>{e=(e=(new DOMParser).parseFromString(e,"text/html")).getElementsByClassName("enter-wraper is-effect");if(e&&0!=e.length){var t,o,n=e[0].getElementsByClassName("show-effect-more");if(n)if(0!=n.length)for(let e=0;e<n.length;e++){var i=JSON.parse(n[e].getAttribute("data-detail"));"1646"===String(i.property_id)&&String(i.show_id_list)===String(B)&&(i=1e3*i.expire_time,(i=Math.floor((i-Date.now())/864e5))<=En)&&(o=t=void 0,(t=document.createElement("span")).className="room-vip",t.innerHTML=`

	距VIP到期 <span id="room-vip-expire-days">**</span> 天

	`,(o=(o=E(["#js-backpack-enter"]))&&o.parentElement)&&o.insertBefore(t,o.childNodes[0]),safeEl("room-vip-expire-days").innerText=i)}}}).catch(e=>{console.log("请求失败!",e)});{{let e=setInterval(()=>{void 0!==document.getElementsByClassName("ChatBarrageCollect")[0]&&(clearInterval(e),new q(".ChatBarrageCollect",!1,e=>{var t,o=document.getElementsByClassName("ChatBarrageCollectPop-title");o?0!==o.length&&((t=document.createElement("input")).id="ex-danmaku-collect-search",t.placeholder="搜索弹幕",t.style.marginLeft="6px",o[0].appendChild(t),t.addEventListener("input",Ve)):document.getElementById("ex-danmaku-collect-search").removeEventListener("input",Ve)}))},1e3)}let t=document.getElementsByClassName("ChatSend-txt")[0],o=document.getElementsByClassName("ChatBarrageCollect")[0];t&&t.addEventListener("keyup",()=>{var e=("string"==typeof t.value?t.value:t.innerText).length;o.style.display=25<e?"none":""}),safeBind(".ChatSend-button", "click",()=>{o.style.display=""}),Qr((e,t)=>{if(e.includes("bulletscreen/query"))return(e=JSON.parse(t)).data.list.unshift(...qe().map(e=>({content:e.content,type:2,id:e.id}))),JSON.stringify(e)}),Qr((e,t,o)=>{if(e.includes("bulletscreen/add"))return 0==(e=JSON.parse(t)).error?t:(t=JSON.parse(o).content,o=t,(t=qe()).unshift({content:o,id:(new Date).getTime()}),localStorage.setItem("ExSave_DanmakuCollect",JSON.stringify(t)),e.msg="收藏成功，云收藏已达上限，将收藏至本地（由DouyuEx插件实现无限收藏）",document.querySelector(".ChatBarrageCollect-tip").click(),document.querySelector(".ChatBarrageCollect-tip").click(),JSON.stringify(e))}),Qr((e,t,o)=>{var n;e.includes("bulletscreen/del")&&(e=JSON.parse(o).id,n=e,o=qe(),localStorage.setItem("ExSave_DanmakuCollect",JSON.stringify(o.filter(e=>e.id!==n))))})}Qr((e,t)=>-1!==e.indexOf("group/getBindGroup")?t.replace('"group_status":4','"group_status":0'):t);{let e=0,t=setInterval(()=>{if(100<++e)clearInterval(t);else if(null!=document.getElementsByClassName("ChatSend-txt")[0]){{let e;null!=(e=document.getElementsByClassName("ChatSend-button")[0])&&(e.className="ChatSend-button"),null!=(e=document.getElementsByClassName("ChatSend-txt")[0])&&(e.maxLength=e.maxLength+20)}clearInterval(t)}},1e3)}(async()=>{await Fe(),new q(".FansMedalPanel-enter",!1,async e=>{var t,o,n=document.querySelector(".FansMedalInfo-head");n&&(t=(new Date).getDate(),new Date(Re.t).getDate()<t&&await Fe(),0!==(t=Re.list).length)&&((o=document.createElement("div")).innerHTML=`

      <div style="display: flex; align-items: center;gap: 8px;margin-top: 4px;">

        ${t.map(e=>`

          <div style="display: flex; align-items: center;">

            <img style="width: 20px; height: 20px;margin-right: 4px;" src="${e.webIcon}" alt="${e.name}">

            <span style="font-size: 12px;">${e.name}</span>

          </div>

        `).join("")}

      </div>

    `,n.appendChild(o))})})();{let r="ex-LastLiveTime-overlay",e=(document.body&&document.body.innerHTML)||"";let llt_status=e.match(/show_status\\":(\d+)/)||e.match(/"show_status":(\d+)/),o=llt_status&&"1"===llt_status[1];if(!o){let llt_match=e.match(/show_time\\":(\d+)/)||e.match(/"show_time":(\d+)/);if(llt_match){let llt_time=1e3*parseInt(llt_match[1],10);let i=k("yyyy-MM-dd hh:mm:ss",new Date(llt_time)),a=(e=>{let t="",o=(new Date).getTime(),n=new Date(e).getTime(),i=Math.floor((o-n)/1e3);return t=31536e3<i?Math.floor(i/31536e3)+"年前":2592e3<i?Math.floor(i/2592e3)+"个月前":86400<i?Math.floor(i/86400)+"天前":3600<i?Math.floor(i/3600)+"小时前":60<=i?Math.floor(i/60)+"分钟前":"刚刚"})(llt_time);let checkCount=0,checkTimer=setInterval(()=>{if(180<++checkCount)clearInterval(checkTimer);else{var e=document.querySelector(".room-Player"),n=0<document.getElementsByClassName("LastLiveTime").length;if(e&&n&&(clearInterval(checkTimer),!document.getElementById(r))){let t=document.createElement("div");t.id=r,t.style.position="absolute",t.style.top="0",t.style.left="0",t.style.width="100%",t.style.height="100%",t.style.display="flex",t.style.justifyContent="center",t.style.alignItems="center",t.style.zIndex="1",t.style.pointerEvents="none";n=document.createElement("style");n.textContent=`

        .ex-llt-card {

            position: relative;

            padding: 32px 64px;

            border-radius: 16px;

            background: rgba(24, 24, 24, 0.65);

            backdrop-filter: blur(16px);

            -webkit-backdrop-filter: blur(16px);

            border: 1px solid rgba(255, 215, 0, 0.15);

            box-shadow: 0 16px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);

            text-align: center;

            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;

            pointer-events: auto;

            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

            animation: ex-llt-fade-in 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;

        }

        .ex-llt-card:hover {

            transform: translateY(-6px) scale(1.02);

            box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2);

            border: 1px solid rgba(255, 215, 0, 0.35);

            background: rgba(30, 30, 30, 0.75);

        }

        @keyframes ex-llt-fade-in {

            0% { opacity: 0; transform: translateY(20px) scale(0.95); }

            100% { opacity: 1; transform: translateY(0) scale(1); }

        }

        .ex-llt-close {

            position: absolute;

            top: 14px;

            right: 14px;

            width: 32px;

            height: 32px;

            display: flex;

            align-items: center;

            justify-content: center;

            border: none;

            border-radius: 50%;

            cursor: pointer;

            font-size: 22px;

            line-height: 1;

            color: rgba(255, 255, 255, 0.6);

            background: rgba(255, 255, 255, 0.05);

            transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);

        }

        .ex-llt-close:hover {

            background: rgba(255, 69, 58, 0.9);

            color: #fff;

            transform: rotate(90deg) scale(1.1);

            box-shadow: 0 4px 12px rgba(255, 69, 58, 0.4);

        }

        .ex-llt-title {

            display: flex;

            align-items: center;

            justify-content: center;

            font-size: 15px;

            color: #e5b855;

            margin-bottom: 12px;

            text-shadow: 0 2px 4px rgba(0,0,0,0.6);

            font-weight: 500;

        }

        .ex-llt-time-ago {

            font-size: 36px;

            color: #eebb4d;

            font-weight: 900;

            letter-spacing: 2px;

            margin-bottom: 10px;

            text-shadow: 0 0 15px rgba(238, 187, 77, 0.35), 0 4px 12px rgba(0,0,0,0.6);

        }

        .ex-llt-time-exact {

            font-size: 15px;

            color: rgba(229, 184, 85, 0.75);

            letter-spacing: 1px;

            font-family: monospace;

            font-weight: 500;

        }

      `,t.appendChild(n);let o=document.createElement("div");o.className="ex-llt-card",o.innerHTML=`

					<div class="ex-llt-title">

						<span style="display: inline-flex; width: 18px; height: 18px; margin-right: 8px;">

							<svg style="width: 100%; height: 100%; fill: currentColor;"><use xlink:href="#time_92d92c7"></use></svg>

						</span>

						上次开播时间

					</div>

					<div class="ex-llt-time-ago">${a}</div>

					<div class="ex-llt-time-exact">${i}</div>

                    <button type="button" class="ex-llt-close" aria-label="关闭">×</button>

				`,o.querySelector(".ex-llt-close").addEventListener("click",e=>{e.stopPropagation(),t.style.opacity="0",t.style.transition="opacity 0.3s ease",o.style.transform="translateY(10px) scale(0.95)",setTimeout(()=>t.remove(),300)}),t.appendChild(o),e.appendChild(t)}}},1e3)}}}{let t=setInterval(()=>{var e=document.querySelector(".volume-07c230");let n=document.getElementById("__video2");e&&n&&(clearInterval(t),e.addEventListener("wheel",function(e){e.preventDefault(),e.stopPropagation();var t=n.volume,o=e.deltaY<0?Math.min(t+.05,1):Math.max(t-.05,0),e=document.getElementById("__video2");if(e){e.muted=0===o,e.volume=o;try{["volume_muted_before_key","player_storage_volume_h5p_room"].forEach(e=>{var t=localStorage.getItem(e);t&&((t=JSON.parse(t)).v=o,localStorage.setItem(e,JSON.stringify(t)))})}catch(e){}}},{passive:!1,capture:!0}),n.addEventListener("volumechange",()=>{Sr(n.volume)}),Sr(n.volume))},500)}}
