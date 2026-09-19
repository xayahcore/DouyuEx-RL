function* (__imports) {
yield {"mountBarrageSettings": { get: () => mountBarrageSettings, set: value => { mountBarrageSettings = value; } }};
/**
 * 播放器内部弹幕悬停操作卡片与上下文右键菜单微交互装配 (+1 复读 / 作者快捷卡片)
 * @param {object} owner - 房间装配生命周期托管者
 */
function mountBarrageSettings(owner) {
  // 1. 轮询并监听弹幕悬浮信息面板 (danmuTips)
  const pollTimer = owner.interval(() => {
    const tipsList = document.getElementsByClassName("danmuTips-1ee820");
    if (tipsList.length > 0) {
      (0, __imports.clearInterval)(pollTimer);
      const panelParent = tipsList[0].parentElement;
      panelParent.id = "Ex_BarragePanel";

      // 监听弹幕悬停提示卡片创建与变动
      new __imports.DomMutationSubscription("#Ex_BarragePanel", true, (mutations) => {
        (0, __imports.Ie)(() => {
          let hasAttrChange = false;
          if (mutations.length > 0) {
            for (let i = 0; i < mutations.length; i++) {
              if (mutations[i].type === "attributes") {
                hasAttrChange = true;
                break;
              }
            }

            if (!hasAttrChange) {
              const node = mutations[0].addedNodes?.[0];
              if (node && typeof node.getElementsByClassName === "function") {
                const btnGroup = node.getElementsByClassName("buttonGroup-de6b66")[0];
                const authorEls = node.getElementsByClassName("danmuAuthor-3d7b4a");
                if (authorEls.length > 0 && btnGroup) {
                  const authorNick = authorEls[0].innerText;
                  (0, __imports.Ce)(authorEls[0], authorNick);
                  (0, __imports.Le)(btnGroup);
                  (0, __imports.Ne)(btnGroup);
                  (0, __imports.Se)(btnGroup);
                  (0, __imports.Me)(btnGroup);
                  (0, __imports.Ae)(0, authorNick);
                }
              }
            } else {
              const funcPanels = document.getElementsByClassName("barragePanel__funcPanel");
              if (funcPanels.length > 0) funcPanels[0].remove();

              const danmuDiv = document.getElementsByClassName("danmudiv-32f498")[0];
              if (danmuDiv) {
                const btnGroup = danmuDiv.getElementsByClassName("buttonGroup-de6b66")[0];
                const authorEls = danmuDiv.getElementsByClassName("danmuAuthor-3d7b4a");
                if (authorEls.length > 0 && btnGroup) {
                  const authorNick = authorEls[0].innerText;
                  (0, __imports.Ce)(authorEls[0], authorNick);
                  (0, __imports.Le)(btnGroup);
                  (0, __imports.Ne)(btnGroup);
                  (0, __imports.Se)(btnGroup);
                  (0, __imports.Me)(btnGroup);
                  (0, __imports.Ae)(0, authorNick);
                }
                (0, __imports.Te)();
              }
            }
          }
        });
      }, owner);

      new __imports.DomMutationSubscription("#Ex_BarragePanel", false, () => {
        (0, __imports.Ie)(() => {
          (0, __imports.Te)();
        });
      }, owner);
    }
  }, 1500);

  // 2. 聊天区点赞/禁言容器中追加 +1 悬浮复读气泡
  new __imports.DomMutationSubscription("#comment-dzjy-container", false, (mutations) => {
    if (mutations.length === 0 || mutations[0].addedNodes.length === 0) return;

    const labelElements = document.getElementsByClassName("labelfisrt-407af4");
    if (labelElements.length > 0) {
      const parent = labelElements[0].parentElement;
      const spacer = document.createElement("div");
      spacer.style.display = "inline-block";
      parent.appendChild(spacer);

      const divider = document.createElement("p");
      divider.className = "sugun-e3fbf6";
      divider.innerText = "|";
      parent.appendChild(divider);

      const plusOneBtn = document.createElement("div");
      plusOneBtn.className = "labelfisrt-407af4 thirdBtn-06cde5 fourBtn-0845d4";
      plusOneBtn.id = "barrage-panel-tip__+1";
      plusOneBtn.innerText = "+1";
      parent.appendChild(plusOneBtn);
    }

    const btn = (0, __imports.safeEl)("barrage-panel-tip__+1");
    if (btn) {
      btn.onclick = () => {
        const higherContainer = document.getElementById("comment-higher-container");
        if (!higherContainer) return;

        if (higherContainer.getElementsByClassName("ex-image-danmaku").length > 0) {
          const rawHtml = higherContainer.getElementsByClassName("text-879f3e")[0]?.innerHTML || "";
          const parsedDanmu = rawHtml.replace(
            /<a[^>]*><img\s+(?:.*?\s+)?src="(.*?)"[^>]*?\/?><\/a>/g,
            (_match, src) => {
              const fileParts = src.split("/").pop().split(".");
              const base36Id = BigInt(fileParts[0]).toString(36);
              return `[DouyuEx图片${base36Id}.${fileParts[1] || 'png'}]`;
            }
          );
          (0, __imports.we)(parsedDanmu);
        } else {
          (0, __imports.we)(higherContainer.innerText);
        }
      };
    }
  }, owner);
}

}
