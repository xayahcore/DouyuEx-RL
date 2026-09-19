function* (__imports) {
yield {"openEnhancedPip": { get: () => openEnhancedPip, set: value => { openEnhancedPip = value; } },
"pendingPipOwner": { get: () => pendingPipOwner, set: value => { pendingPipOwner = value; } }};
/**
 * Chromium 原生 DocumentPictureInPicture 增强画中画主视窗控制器
 * 支持独立弹幕渲染、画中画打字发弹幕、参数微调面板与原网页低功耗运行
 */
let pendingPipOwner = null;

function openEnhancedPip() {
  const sourceVideo = document.getElementById("__video2");
  if (!sourceVideo) {
    (0, __imports.T)("【画中画增强】当前直播间不支持画中画增强功能", "error");
    return;
  }

  if (!window.documentPictureInPicture) {
    (0, __imports.T)("【画中画增强】当前浏览器不支持画中画增强功能，建议使用 Chrome 116+ 或 Edge 116+", "error");
    return;
  }

  // 关闭旧有画中画并重置生命周期所有者
  (0, __imports.closeEnhancedPip)();
  const owner = pendingPipOwner = (0, __imports.createRoomLifetime)();
  owner.own(() => {
    if (pendingPipOwner === owner) pendingPipOwner = null;
  });

  if (__imports.activeRoomMount) {
    __imports.activeRoomMount.own(() => owner.dispose());
  }
  owner.listen(window, 'pagehide', () => owner.dispose());

  // 恢复本地用户配置偏好
  (0, __imports.restorePipPreferences)();

  return (async () => {
    // 1. 请求 Chromium 原生独立画中画窗口
    const pipWin = await window.documentPictureInPicture.requestWindow({
      width: 670,
      height: 380,
      disallowReturnToOpener: true,
      preferInitialWindowPlacement: true,
    });

    if (owner.disposed || pendingPipOwner !== owner || pipWin.closed) {
      if (pipWin !== window.__pip_window__ && !pipWin.closed) pipWin.close();
      owner.dispose();
      return;
    }

    // 2. 初始化弹幕状态机与生命周期挂钩
    (0, __imports.resetPipPacketState)();
    (0, __imports.resetPipMergeState)();
    window.__pip_track_state__ = [];
    window.__pip_window__ = pipWin;
    pipWin.__nextPipLifetime = owner;

    owner.own(() => (0, __imports.closeEnhancedPip)(pipWin, pipWin.document.getElementById('pip-video')));
    owner.listen(pipWin, 'pagehide', () => owner.dispose());

    // 3. 注入微窗骨架与 DOM 节点引用
    pipWin.document.body.innerHTML = (0, __imports.renderPipMarkup0)(__imports.$i, __imports.Pi, __imports.zi);
    pipWin.__pip_source_video__ = sourceVideo;

    const pipVideo = pipWin.document.getElementById("pip-video");
    const danmakuContainer = pipWin.document.getElementById("danmaku");
    const mainView = pipWin.document.getElementById("main-view");
    const inputPanel = pipWin.document.getElementById("input-panel");
    const setBtn = pipWin.document.getElementById("pip-set");
    const sendBtn = pipWin.document.getElementById("pip-send");
    const danmakuToggleBtn = pipWin.document.getElementById("pip-danmaku-toggle");
    const reloadBtn = pipWin.document.getElementById("pip-reload");
    const backOpenerBtn = pipWin.document.getElementById("pip-back-opener");
    const toastEl = pipWin.document.getElementById("pip-toast");

    window.__pip_is_active__ = true;
    (0, __imports.ea)(pipWin);

    // 4. 接管媒体流并开始播放
    pipVideo.srcObject = sourceVideo.captureStream();
    await pipVideo.play().catch(() => {});

    if (owner.disposed || pipWin.closed || window.__pip_window__ !== pipWin) return;

    const inputField = pipWin.document.getElementById("pip-input-field");
    const submitBtn = pipWin.document.getElementById("pip-submit-btn");

    if (inputField) inputField.setAttribute("placeholder", "发条弹幕吧...");
    if (submitBtn) submitBtn.textContent = "发送";
    if (reloadBtn) reloadBtn.title = "刷新画面（恢复卡屏）";
    if (backOpenerBtn) {
      backOpenerBtn.textContent = "回到网页";
      backOpenerBtn.title = "退出画中画并返回直播页";
    }

    (0, __imports.ta)(pipWin);
    (0, __imports.La)(false);
    (0, __imports.Na)(true);

    if (__imports.pipPreferences.lowPowerMode === true) {
      (0, __imports.La)(true);
    }

    // 5. 绑定控制器微交互
    if (danmakuToggleBtn) {
      owner.listen(danmakuToggleBtn, "click", (e) => {
        e.stopPropagation();
        __imports.pipPreferences.danmakuVisible = !(__imports.pipPreferences.danmakuVisible !== false);
        (0, __imports.persistPipPreferences)();
        (0, __imports.ea)(pipWin);
        (0, __imports.ta)(pipWin);
      });
    }

    if (reloadBtn) {
      owner.listen(reloadBtn, "click", async (e) => {
        e.stopPropagation();
        const success = await (0, __imports.recapturePipStream)(pipWin, pipVideo);
        if (owner.disposed) return;
        toastEl.innerText = success ? "画面已刷新" : "刷新失败，请检查主页视频";
        toastEl.classList.add("show");
        (0, __imports.clearTimeout)(toastEl._timer);
        toastEl._timer = owner.timeout(() => toastEl.classList.remove("show"), 2000);
      });
    }

    if (backOpenerBtn) {
      owner.listen(backOpenerBtn, "click", (e) => {
        e.stopPropagation();
        (0, __imports.returnToPipSource)(pipWin);
      });
    }

    // 6. 画中画设置面板挂载
    owner.listen(setBtn, "click", (e) => {
      e.stopPropagation();
      (0, __imports.returnToPipSource)(pipWin, false);

      const defaultPrefs = {
        fontSize: 18,
        speed: 2.5,
        area: "full",
        trackHeight: 28,
        mergeMode: "combo",
        lowPowerMode: false,
        filterRobotDanmaku: true,
        opacity: 1,
        danmakuVisible: true,
      };

      const persistFn = () => (0, __imports.persistPipPreferences)();

      const syncPanelValues = () => {
        document.getElementById("pip-area").value = __imports.pipPreferences.area;
        document.getElementById("pip-mergemode").value = __imports.pipPreferences.mergeMode || "combo";
        document.getElementById("pip-lowpowermode").value = __imports.pipPreferences.lowPowerMode === true ? "on" : "off";
        document.getElementById("pip-filterrobot").value = __imports.pipPreferences.filterRobotDanmaku !== false ? "on" : "off";
        document.getElementById("pip-tabswitch").value = (0, __imports.It)() ? "on" : "off";
        document.getElementById("pip-fontsize").value = __imports.pipPreferences.fontSize;
        document.getElementById("pip-fontsize-value").innerText = __imports.pipPreferences.fontSize;
        document.getElementById("pip-trackheight").value = __imports.pipPreferences.trackHeight || 28;
        document.getElementById("pip-trackheight-value").innerText = __imports.pipPreferences.trackHeight || 28;
        document.getElementById("pip-speed").value = __imports.pipPreferences.speed;
        document.getElementById("pip-speed-value").innerText = __imports.pipPreferences.speed;

        const opacityPercent = Math.round(100 * (__imports.pipPreferences.opacity != null ? __imports.pipPreferences.opacity : 1));
        document.getElementById("pip-opacity").value = opacityPercent;
        document.getElementById("pip-opacity-value").innerText = opacityPercent + "%";
      };

      let panel = document.getElementById("pip-setting-panel");
      if (panel) {
        panel.style.display = "block";
        syncPanelValues();
      } else {
        panel = document.createElement("div");
        panel.id = "pip-setting-panel";
        const opacityPercent = Math.round(100 * (__imports.pipPreferences.opacity != null ? __imports.pipPreferences.opacity : 1));
        panel.innerHTML = (0, __imports.renderPipMarkup1)(
          __imports.pipPreferences.fontSize,
          __imports.pipPreferences.fontSize,
          __imports.pipPreferences.trackHeight || 28,
          __imports.pipPreferences.trackHeight || 28,
          __imports.pipPreferences.speed,
          __imports.pipPreferences.speed,
          opacityPercent,
          opacityPercent
        );

        if (!document.getElementById("pip-setting-style")) {
          const style = document.createElement("style");
          style.id = "pip-setting-style";
          style.innerHTML = __imports.pipMarkup0;
          document.head.appendChild(style);
        }
        document.body.appendChild(panel);
        owner.own(() => panel.remove());

        const leftPos = Math.max(8, (window.innerWidth - panel.offsetWidth) / 2);
        const topPos = Math.max(8, (window.innerHeight - panel.offsetHeight) / 2);
        panel.style.left = leftPos + "px";
        panel.style.top = topPos + "px";

        // 面板拖拽能力
        const header = panel.querySelector(".pip-setting-header");
        if (header) {
          let isDragging = false;
          let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

          const onMouseMove = (ev) => {
            if (isDragging) {
              const dx = ev.clientX - startX;
              const dy = ev.clientY - startY;
              panel.style.left = Math.max(0, initialLeft + dx) + "px";
              panel.style.top = Math.max(0, initialTop + dy) + "px";
            }
          };
          const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
          };

          owner.listen(header, "mousedown", (ev) => {
            if (ev.button !== 0 || ev.target.closest(".pip-setting-dismiss, .pip-setting-reset")) return;
            isDragging = true;
            const rect = panel.getBoundingClientRect();
            panel.style.left = rect.left + "px";
            panel.style.top = rect.top + "px";
            startX = ev.clientX;
            startY = ev.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;
            owner.listen(document, "mousemove", onMouseMove);
            owner.listen(document, "mouseup", onMouseUp);
            ev.preventDefault();
          });
        }

        const fontSizeInput = document.getElementById("pip-fontsize");
        const trackHeightInput = document.getElementById("pip-trackheight");
        const speedInput = document.getElementById("pip-speed");
        const areaSelect = document.getElementById("pip-area");
        const mergeModeSelect = document.getElementById("pip-mergemode");
        const lowPowerSelect = document.getElementById("pip-lowpowermode");
        const filterRobotSelect = document.getElementById("pip-filterrobot");
        const tabSwitchSelect = document.getElementById("pip-tabswitch");
        const opacityInput = document.getElementById("pip-opacity");

        areaSelect.value = __imports.pipPreferences.area;
        mergeModeSelect.value = __imports.pipPreferences.mergeMode || "combo";
        lowPowerSelect.value = __imports.pipPreferences.lowPowerMode === true ? "on" : "off";
        filterRobotSelect.value = __imports.pipPreferences.filterRobotDanmaku !== false ? "on" : "off";
        tabSwitchSelect.value = (0, __imports.It)() ? "on" : "off";

        owner.listen(fontSizeInput, "input", () => {
          __imports.pipPreferences.fontSize = parseInt(fontSizeInput.value, 10);
          document.getElementById("pip-fontsize-value").innerText = __imports.pipPreferences.fontSize;
          persistFn();
        });

        owner.listen(trackHeightInput, "input", () => {
          __imports.pipPreferences.trackHeight = parseInt(trackHeightInput.value, 10);
          document.getElementById("pip-trackheight-value").innerText = __imports.pipPreferences.trackHeight;
          persistFn();
        });

        owner.listen(speedInput, "input", () => {
          __imports.pipPreferences.speed = parseFloat(speedInput.value);
          document.getElementById("pip-speed-value").innerText = __imports.pipPreferences.speed;
          persistFn();
        });

        owner.listen(opacityInput, "input", () => {
          __imports.pipPreferences.opacity = parseInt(opacityInput.value, 10) / 100;
          document.getElementById("pip-opacity-value").innerText = opacityInput.value + "%";
          persistFn();
          if (window.__pip_is_active__) (0, __imports.ea)();
        });

        owner.listen(areaSelect, "change", () => {
          __imports.pipPreferences.area = areaSelect.value;
          persistFn();
        });

        owner.listen(mergeModeSelect, "change", () => {
          __imports.pipPreferences.mergeMode = mergeModeSelect.value;
          persistFn();
        });

        owner.listen(filterRobotSelect, "change", () => {
          __imports.pipPreferences.filterRobotDanmaku = filterRobotSelect.value === "on";
          persistFn();
        });

        owner.listen(lowPowerSelect, "change", () => {
          __imports.pipPreferences.lowPowerMode = lowPowerSelect.value === "on";
          persistFn();
          if (window.__pip_is_active__) (0, __imports.La)(__imports.pipPreferences.lowPowerMode);
        });

        owner.listen(tabSwitchSelect, "change", () => {
          const enabled = tabSwitchSelect.value === "on";
          (0, __imports.Tt)(enabled);
          if (enabled) {
            (0, __imports.Ct)();
          } else {
            (0, __imports.T)("已关闭页签防冻结，请刷新页面后完全生效", "info");
          }

          if (window.__pip_is_active__) {
            const pipVideoEl = window.__pip_window__?.document.getElementById("pip-video");
            const srcVideoEl = window.__pip_window__?.__pip_source_video__;
            if (enabled) {
              (0, __imports.syncPipPlayback)(srcVideoEl, window.__pip_window__, pipVideoEl);
            } else {
              (0, __imports.sa)();
            }
          }
        });

        owner.listen(panel.querySelector(".pip-setting-reset"), "click", () => {
          if (confirm("确定要将画中画设置恢复为默认配置吗？")) {
            Object.assign(__imports.pipPreferences, defaultPrefs);
            persistFn();
            syncPanelValues();
            if (window.__pip_is_active__) {
              (0, __imports.La)(__imports.pipPreferences.lowPowerMode);
              (0, __imports.ea)();
              (0, __imports.ta)();
            }
          }
        });

        owner.listen(panel.querySelector(".pip-setting-dismiss"), "click", () => {
          panel.style.display = "none";
        });
      }

      toastEl.innerText = "已在斗鱼直播页面打开设置面板";
      toastEl.classList.add("show");
      (0, __imports.clearTimeout)(toastEl._timer);
      toastEl._timer = owner.timeout(() => toastEl.classList.remove("show"), 5000);
    });

    // 7. 发送弹幕输入框展开与快捷键
    owner.listen(sendBtn, "click", (e) => {
      e.stopPropagation();
      if (inputPanel.classList.contains("active")) {
        inputPanel.classList.remove("active");
      } else {
        (0, __imports.da)(pipWin);
      }
    });

    const onKeyDownGlobal = (ev) => {
      if (ev.key === "Enter") {
        const field = pipWin.document.getElementById("pip-input-field");
        if (pipWin.document.activeElement !== field) {
          ev.preventDefault();
          (0, __imports.da)(pipWin);
        }
      }
    };
    owner.listen(pipWin.document, "keydown", onKeyDownGlobal);
    pipWin.__pip_keydown_handler__ = onKeyDownGlobal;

    owner.listen(mainView, "click", () => {
      if (inputPanel.classList.contains("active")) {
        inputPanel.classList.remove("active");
      }
    });

    // 8. 弹幕提交执行器
    const sendDanmakuMessage = async () => {
      const text = inputField.value.trim();
      if (text) {
        inputField.value = "";
        inputPanel.classList.remove("active");
        toastEl.innerText = "发送成功";
        toastEl.classList.add("show");
        (0, __imports.clearTimeout)(toastEl._timer);
        toastEl._timer = owner.timeout(() => toastEl.classList.remove("show"), 2000);

        // 本地立即飘屏展示 (带绿色边框)
        (0, __imports.renderPipDanmaku)({ text, color: 0 }, pipWin, danmakuContainer, true);

        // 同步驱动主页原生输入框与发送按钮
        try {
          const chatInput = document.querySelector("div.ChatSend-txt");
          const chatSendBtn = document.querySelector(".ChatSend-button");
          if (chatInput && chatSendBtn) {
            chatInput.innerText = text;
            chatSendBtn.click();
          }
        } catch (err) {
          console.error("画中画发送弹幕驱动原生组件异常:", err);
        }
      }
    };

    owner.listen(inputField, "keydown", (e) => {
      if (e.key === "Enter") sendDanmakuMessage();
    });
    owner.listen(submitBtn, "click", () => sendDanmakuMessage());

    // 9. 播放状态同步与 WebSocket 连麦挂钩
    const syncPlayback = () => {
      if (sourceVideo.paused) {
        pipVideo.pause();
      } else {
        pipVideo.play().catch(() => {});
      }
    };
    owner.listen(sourceVideo, "play", syncPlayback);
    owner.listen(sourceVideo, "pause", syncPlayback);
    (0, __imports.syncPipPlayback)(sourceVideo, pipWin, pipVideo);

    if (__imports.ja) (0, __imports.clearInterval)(__imports.ja);
    __imports.ja = owner.interval(() => {
      const now = Date.now();
      for (const [key, group] of __imports.pipMergeGroups.entries()) {
        if (group.timestamps.filter(t => now - t <= 8000).length < 2) {
          __imports.pipMergeGroups.delete(key);
        }
      }
      (0, __imports.refreshPipCombos)();
    }, 1000);

    // 挂载 WebSocket 实时弹幕客户端
    __imports.Oi = new __imports.nl(__imports.B, owner.guard((packet) => {
      (0, __imports.dispatchPipPacket)(packet, pipWin, danmakuContainer);
    }));

    const clientRef = __imports.Oi;
    owner.own(() => {
      clientRef.close();
      if (__imports.Oi === clientRef) __imports.Oi = null;
    });

    // 窗口关闭与销毁监听
    const disposePipLifetime = () => owner.dispose();
    owner.listen(pipWin, "pagehide", disposePipLifetime);
    const closeCheckInterval = owner.interval(() => {
      if (pipWin.closed) {
        (0, __imports.clearInterval)(closeCheckInterval);
        disposePipLifetime();
      }
    }, 2000);

  })().catch(err => {
    const shouldReport = !owner.disposed;
    owner.dispose();
    if (shouldReport) {
      console.warn('[DouyuEx NEXT] 画中画启动异常:', err);
      (0, __imports.T)("【画中画增强】无法打开画中画窗口", "error");
    }
  });
}

}
