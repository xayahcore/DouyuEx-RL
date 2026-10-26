function initPkg_DanmakuCollect() {
  initPkg_DanmakuCollect_Dom();
  const textarea = document.getElementsByClassName("ChatSend-txt")[0];
  const collectButton = document.getElementsByClassName("ChatBarrageCollect")[0];
  if (textarea && collectButton) {
    textarea.addEventListener("keyup", () => {
      const length = typeof textarea.value === "string" ? textarea.value.length : textarea.innerText.length;
      if (length > 25) {
        collectButton.style.display = "none";
      } else {
        collectButton.style.display = "";
      }
    });
  }
  const sendBtn = document.getElementsByClassName("ChatSend-button")[0];
  if (sendBtn && collectButton) {
    sendBtn.addEventListener("click", () => {
      collectButton.style.display = "";
    });
  }
  /* ⚠ 三个 hook 都在改写别人的响应：任何一步抛出（报文不是 JSON、字段缺了、DOM 没渲染）
     都会把异常冒回 ResponseHook，等于这条请求的响应直接坏掉。解析失败一律 return undefined
     放行原响应，绝不因为"附加功能"把主流程弄挂。 */
  responseHook((url, text) => {
    if (url.includes(`bulletscreen/query`)) {
      try {
        let obj = JSON.parse(text);
        if (!obj || !obj.data || !Array.isArray(obj.data.list)) return;
        obj.data.list.unshift(...getLocalDanmakuCollect().map(item => {
          return {
            content: item.content,
            type: 2,
            id: item.id
          }
        }));
        return JSON.stringify(obj);
      } catch (e) {
        return;
      }
    }
  });

  responseHook((url, text, body) => {
    if (url.includes(`bulletscreen/add`)) {
      let obj;
      let content;
      try {
        obj = JSON.parse(text);
        if (obj.error == 0) return text;
        content = JSON.parse(body).content;
      } catch (e) {
        return;   // 云收藏接口回的不是预期 JSON：原样放行，别动响应
      }
      addLocalDanmakuCollect(content);
      obj.msg = "收藏成功，云收藏已达上限，将收藏至本地（由DouyuEx插件实现无限收藏）";

      /* 关闭并重新打开弹幕收藏以更新新添加的弹幕。
         面板没渲染（未登录 / 没有云收藏入口）时这里是 null —— 原来直接 .click() 会抛，
         结果就是"提示说收藏到本地了，条目却没出现"。 */
      let tip = document.querySelector(".ChatBarrageCollect-tip");
      if (tip) {
        tip.click();
        tip.click();
      }
      return JSON.stringify(obj);
    }
  });

  responseHook((url, text, body) => {
    if (url.includes(`bulletscreen/del`)) {
      try {
        let { id } = JSON.parse(body);
        delLocalDanmakuCollect(id);
      } catch (e) {}
    }
  });
}

function initPkg_DanmakuCollect_Dom() {
  /* 上游 1 秒一拍、没有上限：未登录 / 没有云收藏入口时这个定时器会一直空转到页面关掉。
     给 120 拍（2 分钟）的耐心，到点就收工并留一条日志，避免长期白跑。 */
  let tries = 0;
  let timer = setInterval(() => {
    if (typeof document.getElementsByClassName("ChatBarrageCollect")[0] != "undefined") {
      clearInterval(timer);
      new DomHook(".ChatBarrageCollect", false, (m) => {
        const titleDom = document.getElementsByClassName("ChatBarrageCollectPop-title");
        if (titleDom.length === 0) return;
        // 已经插过就别重复插（弹窗每次重开都会回调一次）
        if (document.getElementById("ex-danmaku-collect-search")) return;
        let inputDom = document.createElement("input");
        inputDom.id = "ex-danmaku-collect-search";
        inputDom.placeholder = "搜索弹幕";
        inputDom.style.marginLeft = "6px";
        titleDom[0].appendChild(inputDom);

        inputDom.addEventListener("input", searchCollectDanmaku);
      });
      return;
    }
    if (++tries > 120) {
      clearInterval(timer);
      console.warn("[DouyuEx] 等不到弹幕收藏按钮（可能未登录或页面改版），搜索框增强已停止等待");
    }
  }, 1000);
}

function searchCollectDanmaku(e) {
  const searchText = e.target.value;
  // 面板可能已被关掉重开（搜索框还在、列表节点已换掉）：任一环取不到就直接返回
  let contentDom = document.getElementsByClassName("ChatBarrageCollectPop-barrageContent")[0];
  if (!contentDom) return;
  let parentDom = contentDom.parentElement;
  if (!parentDom) return;
  let danmakuDoms = parentDom.getElementsByClassName("TagItem");
  // 找出所有doms里面包含searchText的dom，其他全部display为none，如果searchText为空，则全部显示
  for (let i = 0; i < danmakuDoms.length; i++) {
    let danmakuDom = danmakuDoms[i];
    if (danmakuDom.innerText.includes(searchText)) {
      danmakuDom.style.display = "";
    } else {
      danmakuDom.style.display = "none";
    }
  }
}

/* 本地收藏的条数上限（audit-wave4 A3）：
 * 这段写盘发生在 responseHook 的回调里 —— localStorage 满额时 setItem 抛 QuotaExceededError，
 * 异常会顺着 hook 冒回去，把这条"收藏"请求的响应直接弄坏。
 * 所以：①滚动淘汰只留最近 N 条；②写盘自身兜底，失败只留痕不抛。 */
const DANMAKU_COLLECT_LIMIT = 500;

function saveLocalDanmakuCollect(list) {
  try {
    localStorage.setItem("ExSave_DanmakuCollect", JSON.stringify(list));
    return true;
  } catch (e) {
    if (typeof ExGuard_warn === "function") {
      ExGuard_warn("弹幕收藏", "本地收藏写入失败（可能已超出 localStorage 配额），本条未保存", e);
    }
    return false;
  }
}

function getLocalDanmakuCollect() {
  let ret = localStorage.getItem("ExSave_DanmakuCollect");
  try {
    ret = JSON.parse(ret) || [];
  } catch (error) {
    ret = [];
  }
  return ret;
}

function addLocalDanmakuCollect(content) {
  let ret = getLocalDanmakuCollect();
  // id 必须唯一：同一毫秒里连收两条会撞 id，随后删除会把两条一起删掉（audit-wave4 顺带修的 P3）
  let id = new Date().getTime();
  while (ret.some(function (item) { return Number(item.id) === id; })) id++;
  ret.unshift({
    content,
    id: id
  });
  // 滚动淘汰：只保留最近 DANMAKU_COLLECT_LIMIT 条，永不让本地存储无限长
  if (ret.length > DANMAKU_COLLECT_LIMIT) ret = ret.slice(0, DANMAKU_COLLECT_LIMIT);
  return saveLocalDanmakuCollect(ret);
}

function delLocalDanmakuCollect(id) {
  let ret = getLocalDanmakuCollect();
  // id 来自响应体（可能是字符串），本地存的是时间戳数字：严格不等会让删除永远不生效
  // （audit-wave4 DC2：云收藏删掉了、本地那条还留在列表里）。统一按字符串比。
  let key = String(id);
  return saveLocalDanmakuCollect(ret.filter(item => String(item.id) !== key));
}