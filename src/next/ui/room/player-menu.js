function* (__imports) {
yield {"mountPlayerMenu": { get: () => mountPlayerMenu, set: value => { mountPlayerMenu = value; } }};
/**
 * 播放器右下角控制菜单扩展与悬浮“隐藏礼物栏”胶囊按钮控制器
 * @param {object} owner - 房间装配生命周期托管者
 */
function mountPlayerMenu(owner) {
  const pollTimer = owner.interval(() => {
    if ((0, __imports.E)([".right-e7ea5d", ".right-17e251"])) {
      (0, __imports.clearInterval)(pollTimer);

      // 1. 在右键菜单中插入“隐藏礼物栏”选项
      const menuParent = document.getElementsByClassName("menu-da2a9e")[0];
      if (menuParent) {
        const menuItem = document.createElement("li");
        menuItem.id = "refresh-video";
        menuItem.innerText = "隐藏礼物栏";
        menuParent.insertBefore(menuItem, menuParent.childNodes[menuParent.childNodes.length - 1]);
      }

      // 2. 在播放器浮层注入悬浮胶囊按钮 (#refresh-video3)
      if (!document.getElementById("refresh-video3")) {
        const floatPill = document.createElement("div");
        floatPill.id = "refresh-video3";
        floatPill.title = "点击隐藏礼物栏";
        floatPill.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="font-size:12px;">隐藏礼物栏</div>
            <div id="ex-refresh-switch" style="width:26px;height:14px;background:rgba(255,255,255,0.3);border-radius:7px;position:relative;transition:background 0.3s;">
              <div id="ex-refresh-switch-circle" style="width:10px;height:10px;background:#fff;border-radius:50%;position:absolute;top:2px;left:2px;transition:left 0.3s, background 0.3s;"></div>
            </div>
          </div>
        `;
        floatPill.style.cssText = "position:absolute;left:18px;bottom:58px;padding:0 10px;height:28px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);color:#fff;z-index:9999;cursor:pointer;user-select:none;opacity:0;transform:scale(.9);transition:opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .3s ease;pointer-events:none;";

        const playerDialog = document.getElementById("js-player-dialog");
        if (playerDialog) {
          playerDialog.insertBefore(floatPill, playerDialog.childNodes[0]);
        }
      }

      // 3. 全屏与窗口形态检测调整
      const adjustPlayerZIndex = () => {
        let isWebFullscreen = false;
        const isNativeFullscreen = Boolean(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        );

        let isShrink = false;
        if (document.querySelector(".wfs-2a8e83.removed-9d4c42") || document.querySelector(".toggle__P8TKM")) {
          isWebFullscreen = true;
        }
        if (document.querySelector(".shrink__Sd0uK")) {
          isShrink = true;
        }

        const playerToolbar = document.getElementById("js-player-toolbar");
        if (playerToolbar) {
          playerToolbar.style.zIndex = isWebFullscreen ? "20" : "30";
          const caseEl = document.getElementsByClassName("case__f4yex")[0];
          if (caseEl) {
            caseEl.style.bottom = ((isNativeFullscreen || (isWebFullscreen && isShrink)) && (0, __imports.fn)()) ? "-84px" : "0";
          }
          if (document.getElementsByClassName("live-next-body")[0] && playerToolbar.parentElement) {
            playerToolbar.parentElement.style.zIndex = "20";
          }
        }
      };

      new __imports.DomMutationSubscription(".right-e7ea5d", true, adjustPlayerZIndex, owner);
      new __imports.DomMutationSubscription(".right-17e251", true, adjustPlayerZIndex, owner);
      new __imports.DomMutationSubscription(".video__VfhVg", true, (mutations) => {
        for (const m of mutations) {
          if (m.target?.className?.includes("toggle__P8TKM")) adjustPlayerZIndex();
        }
      }, owner);

      // 4. 浮动胶囊渐入淡出与点击切换逻辑
      const videoArea = (0, __imports.E)([".layout-Player-video", ".stream__T55I3"]);
      const playerBox = document.getElementsByClassName("room-Player-Box")[0];
      const floatPill = document.getElementById("refresh-video3");
      let fadeTimer = 0;
      let isHoveringPill = false;

      const fadeOutPill = () => {
        if (!floatPill || isHoveringPill) return;
        floatPill.style.transition = "opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .3s ease";
        floatPill.style.opacity = "0";
        floatPill.style.transform = "scale(.9)";
        floatPill.style.pointerEvents = "none";
        (0, __imports.clearTimeout)(fadeTimer);
      };

      const fadeInPill = () => {
        if (!floatPill) return;
        floatPill.style.transition = "opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .3s ease";
        floatPill.style.opacity = "1";
        floatPill.style.transform = "scale(1)";
        floatPill.style.pointerEvents = "auto";
        (0, __imports.clearTimeout)(fadeTimer);
        fadeTimer = owner.timeout(fadeOutPill, 2000);
      };

      const toggleGiftBarVisibility = () => {
        const toolbarRow = document.getElementsByClassName("PlayerToolbar-ContentRow")[0];
        const videoEl = (0, __imports.E)([".layout-Player-video", ".stream__T55I3"]);
        const menuOption = document.getElementById("refresh-video");
        const pill = document.getElementById("refresh-video3");

        if (!toolbarRow || !videoEl || !menuOption) return;

        if (toolbarRow.style.visibility === "hidden") {
          // 恢复显示礼物栏
          toolbarRow.style.visibility = "visible";
          (0, __imports.Ht)();
          videoEl.style.cssText = "";
          if (pill) {
            pill.style.opacity = "0";
            pill.style.transform = "scale(.9)";
            pill.style.pointerEvents = "none";
            pill.title = "点击隐藏礼物栏";
          }
          (0, __imports.hn)(false);
          menuOption.innerText = "隐藏礼物栏";
          (0, __imports.U)("Ex_Style_VideoRefresh");
        } else {
          // 隐藏礼物栏
          toolbarRow.style.visibility = "hidden";
          (0, __imports.Ft)();
          videoEl.style.cssText = "bottom:0;z-index:25";
          menuOption.innerText = "✓ 隐藏礼物栏";
          if (pill) {
            pill.title = "点击显示礼物栏";
            pill.style.transition = "opacity .3s ease,transform .3s cubic-bezier(0.175, 0.885, 0.32, 1.275),background-color .3s ease,box-shadow .3s ease";
            pill.style.opacity = "1";
            pill.style.transform = "scale(1.1)";
            pill.style.pointerEvents = "auto";
            pill.style.backgroundColor = "rgba(0,0,0,.8)";
            pill.style.boxShadow = "0 0 15px rgba(255, 102, 0, 0.6)";

            (0, __imports.clearTimeout)(fadeTimer);
            fadeTimer = owner.timeout(() => {
              pill.style.transition = "opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .15s ease";
              pill.style.transform = "scale(1)";
              pill.style.backgroundColor = "rgba(0,0,0,.55)";
              pill.style.boxShadow = "none";
              fadeTimer = owner.timeout(fadeOutPill, 1500);
            }, 800);
          }
          (0, __imports.hn)(true);
          (0, __imports.yn)();
        }

        adjustPlayerZIndex();
        (0, __imports.pn)();
        (0, __imports.te)();
      };

      if (videoArea && floatPill) {
        owner.listen(videoArea, "mouseenter", fadeInPill);
        owner.listen(videoArea, "mouseleave", fadeOutPill);
      }
      if (playerBox && floatPill) {
        owner.listen(playerBox, "mousemove", fadeInPill);
      }
      if (floatPill) {
        owner.listen(floatPill, "mouseenter", () => {
          isHoveringPill = true;
          floatPill.style.transition = "opacity .15s ease,transform .15s ease,background-color .15s ease,box-shadow .3s ease";
          floatPill.style.opacity = "1";
          floatPill.style.transform = "scale(1.08)";
          floatPill.style.pointerEvents = "auto";
          floatPill.style.backgroundColor = "rgba(0,0,0,.7)";
          (0, __imports.clearTimeout)(fadeTimer);
        });
        owner.listen(floatPill, "mouseleave", () => {
          isHoveringPill = false;
          floatPill.style.transform = "scale(1)";
          floatPill.style.backgroundColor = "rgba(0,0,0,.55)";
          fadeInPill();
        });
        owner.listen(floatPill, "click", (e) => {
          e.stopPropagation();
          toggleGiftBarVisibility();
        });
      }

      (0, __imports.safeBind)("#refresh-video", "click", () => {
        toggleGiftBarVisibility();
      }, owner);

      // 5. 读取持久化配置恢复隐藏状态
      try {
        const saved = JSON.parse(__imports.localStorage.getItem("ExSave_Refresh") || "{}");
        if (saved?.video?.status === true) {
          const rowEl = document.getElementsByClassName("PlayerToolbar-ContentRow")[0];
          const streamEl = (0, __imports.E)([".layout-Player-video", ".stream__T55I3"]);
          const menuOpt = document.getElementById("refresh-video");
          const toolbarEl = document.getElementById("js-player-toolbar");

          if (rowEl) rowEl.style.visibility = "hidden";
          if (streamEl) streamEl.style.cssText = "bottom:0;z-index:25";
          if (toolbarEl) toolbarEl.style.zIndex = "30";

          const isFs = JSON.parse(__imports.localStorage.getItem("ExSave_FullScreen") || "{}")?.isFullScreen;
          if (isFs && toolbarEl) toolbarEl.style.zIndex = "20";
          if (document.getElementsByClassName("live-next-body")[0] && toolbarEl?.parentElement) {
            toolbarEl.parentElement.style.zIndex = "20";
          }

          if (floatPill) {
            floatPill.style.opacity = "0";
            floatPill.style.transform = "scale(.9)";
            floatPill.style.pointerEvents = "none";
            floatPill.title = "点击显示礼物栏";
          }
          if (menuOpt) menuOpt.innerText = "✓ 隐藏礼物栏";

          (0, __imports.yn)();
          (0, __imports.te)();
          owner.timeout(() => (0, __imports.hn)(true), 500);
        }
      } catch {}
    }

    if (++__imports.gn >= 100) {
      (0, __imports.clearInterval)(pollTimer);
    }
  }, 1500);
}

}
