function* (__imports) {
yield {"mountDanmakuSearch": { get: () => mountDanmakuSearch, set: value => { mountDanmakuSearch = value; } }};
/**
 * 弹幕收藏检索过滤栏与本地无限收藏扩展拦截器
 * @param {object} owner - 房间装配上下文拥有者
 */
function mountDanmakuSearch(owner) {
  // 1. 轮询等待官方弹幕收藏弹窗出现，注入搜索框
  const pollTimer = owner.interval(() => {
    if (document.getElementsByClassName("ChatBarrageCollect")[0]) {
      (0, __imports.clearInterval)(pollTimer);

      new __imports.DomMutationSubscription(".ChatBarrageCollect", false, () => {
        const titleElements = document.getElementsByClassName("ChatBarrageCollectPop-title");
        if (titleElements && titleElements.length > 0) {
          if (!document.getElementById("ex-danmaku-collect-search")) {
            const inputEl = document.createElement("input");
            inputEl.id = "ex-danmaku-collect-search";
            inputEl.placeholder = "搜索弹幕";
            inputEl.style.marginLeft = "6px";
            titleElements[0].appendChild(inputEl);
            owner.listen(inputEl, "input", __imports.Ve);
          }
        } else {
          const searchInput = document.getElementById("ex-danmaku-collect-search");
          if (searchInput) {
            searchInput.removeEventListener("input", __imports.Ve);
          }
        }
      }, owner);
    }
  }, 1000);

  // 2. 聊天输入框字符数较多时自动避让隐藏收藏按钮
  const chatInput = document.getElementsByClassName("ChatSend-txt")[0];
  const collectBtn = document.getElementsByClassName("ChatBarrageCollect")[0];

  if (chatInput && collectBtn) {
    owner.listen(chatInput, "keyup", () => {
      const textLen = (typeof chatInput.value === "string" ? chatInput.value : chatInput.innerText).length;
      collectBtn.style.display = textLen > 25 ? "none" : "";
    });

    (0, __imports.safeBind)(".ChatSend-button", "click", () => {
      collectBtn.style.display = "";
    }, owner);
  }

  // 3. 拦截官方弹幕查询请求，混入本地无限收藏项
  (0, __imports.Qr)((url, responseText) => {
    if (url.includes("bulletscreen/query")) {
      try {
        const dataObj = JSON.parse(responseText);
        const localList = (0, __imports.qe)().map(item => ({ content: item.content, type: 2, id: item.id }));
        dataObj.data.list.unshift(...localList);
        return JSON.stringify(dataObj);
      } catch {
        return responseText;
      }
    }
  });

  // 4. 拦截添加收藏请求，云端满额时自动存入本地无限收藏
  (0, __imports.Qr)((url, responseText, requestBody) => {
    if (url.includes("bulletscreen/add")) {
      try {
        const resp = JSON.parse(responseText);
        if (resp.error === 0) return responseText;

        const content = JSON.parse(requestBody).content;
        const localList = (0, __imports.qe)();
        localList.unshift({ content, id: Date.now() });
        __imports.localStorage.setItem("ExSave_DanmakuCollect", JSON.stringify(localList));

        resp.msg = "收藏成功，云收藏已达上限，将收藏至本地（由DouyuEx插件实现无限收藏）";
        document.querySelector(".ChatBarrageCollect-tip")?.click();
        document.querySelector(".ChatBarrageCollect-tip")?.click();
        return JSON.stringify(resp);
      } catch {
        return responseText;
      }
    }
  });

  // 5. 拦截删除收藏请求，同步从本地存储中清除
  (0, __imports.Qr)((url, responseText, requestBody) => {
    if (url.includes("bulletscreen/del")) {
      try {
        const targetId = JSON.parse(requestBody).id;
        const localList = (0, __imports.qe)();
        const updated = localList.filter(item => item.id !== targetId);
        __imports.localStorage.setItem("ExSave_DanmakuCollect", JSON.stringify(updated));
      } catch {}
    }
  });
}

}
