let isRemoveRepeatedDanmaku = getLocalIsRemoveRepeatedDanmaku();
let repeatedDanmakuSeconds = getLocalRepeatedDanmakuSeconds();
let isEnlargeDanmaku = getLocalIsEnlargeDanmaku();
// 对象存储弹幕文本和过期时间戳
let repeatedDanmakuMap = {};
let repeatedDanmakuUuidMap = {};
// 存储弹幕文本到首次出现的DOM元素的映射
let repeatedDanmakuDomMap = {};
// 存储弹幕文本的重复次数
let repeatedDanmakuCountMap = {};
// 存储弹幕DOM元素的原始fontSize
let repeatedDanmakuOriginalFontSizeMap = new WeakMap();
// 清理定时器
let repeatedDanmakuCleanupTimer = null;
let repeatedDanmakuDomHook = null;

// 轮询参数：默认 1 秒 × 60 次（1 分钟）；测试会改这份配置来验证上限
let RemoveRepeatedDanmaku_pollOpts = { intervalMs: 1000, maxTries: 60, tag: "屏蔽重复弹幕" };

try {
  if (isRemoveRepeatedDanmaku) removeRepeatedDanmaku();
} catch (e) {
  ExGuard_warn("屏蔽重复弹幕", "启动时挂载失败，稍后随面板重绘再试", e);
}

function initPkg_Shield_RemoveRepeatedDanmaku_ScriptHook() {
  scriptHook({
    url: "/firstqueue",
    callback: (content) => {
      let newContent = content;
      // 给弹幕飘屏添加属性
      newContent = newContent.replace(`e.display=new e.renderer(e);`, `e.display=new e.renderer(e);e.display.raw.comment=e;`);
      return newContent;
    }
  });
}

/* 去重键。
   不用 dom.textContent：它会把勋章、右侧附加文本、以及多屏合并弹幕的「来源横条」统统算进去，
   于是出现两个问题——跨房同文本弹幕无法去重，且 key 随附加内容变化导致 map 膨胀。
   优先取引擎给的原始文本（comment.data.text），并带上来源房间前缀：
   不同房间的相同内容必须各自计数，同房间的重复才归并。 */
function RemoveRepeatedDanmaku_getKey(dom) {
  const c = dom && dom.comment;
  const d = c && c.data;
  let text = (d && typeof d.text === "string") ? d.text.trim() : "";
  if (!text) text = dom && dom.textContent ? dom.textContent.trim() : "";
  if (!text) return "";
  const src = d && d.extraData && d.extraData.exMsSrcRid;
  return src ? "r" + src + "|" + text : text;
}

function removeRepeatedDanmaku() {
  // 添加计数显示和动画的样式
  StyleHook_set(
    "Ex_Style_RemoveRepeatedDanmaku_Count",
    `
    /* 弹幕计数显示样式 */
    [data-repeat-count]::before {
      content: "x" attr(data-repeat-count);
      font-weight: bold;
      display: inline-block;
      position: absolute;
      right: -18px;
      bottom: 0;
      font-size: 16px;
      font-family: "Helvetica Neue",Helvetica,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","微软雅黑",Arial,sans-serif;
      color: inherit;
    }
    
    /* 计数跳动动画 */
    @keyframes danmaku-combo-bounce {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.5);
      }
      100% {
        transform: scale(1);
      }
    }
    
    /* 应用动画的类 */
    .danmaku-combo-animation::before {
      animation: danmaku-combo-bounce 0.2s ease-out;
    }
    `
  );

  ExGuard_pollFor(
    ".danmu-fbb2a3",
    function () {
      // 开启定期清理定时器
      startRepeatedDanmakuCleanupTimer();

      repeatedDanmakuDomHook = new DomHook(".danmu-fbb2a3", false, (m) => {
        try {
        if (!m || m.length <= 0) return;
        if (!isRemoveRepeatedDanmaku) return;
        if (m[0].addedNodes.length <= 0 && m[0].removedNodes.length > 0) {
          const removedDom = m[0].removedNodes[0];
          const removedComment = removedDom && removedDom.comment;
          if (!removedComment) return;
          const uuid = removedComment.uuid;
          const endTime = removedComment.startTime + removedComment.duration;
          const now = Date.now();
          if (now > endTime) return;
          // 存储过期时间戳
          repeatedDanmakuUuidMap[uuid] = now + repeatedDanmakuSeconds * 1000;

          // 清理与该弹幕相关的DOM映射，防止内存泄露
          const danmakuText = RemoveRepeatedDanmaku_getKey(removedDom);
          if (danmakuText && repeatedDanmakuDomMap[danmakuText] === removedDom) {
            // 移除DOM引用，避免内存泄露
            delete repeatedDanmakuDomMap[danmakuText];
            delete repeatedDanmakuCountMap[danmakuText];
            // 同时清理过期时间，因为首条弹幕已经被移除了
            delete repeatedDanmakuMap[danmakuText];
          }
          return;
        }

        if (m[0].addedNodes.length <= 0) return;
        const dom = m[0].addedNodes[0];
        if (!dom || !dom.comment) return;
        const now = Date.now();
        const uuid = dom.comment.uuid;
        // 检查 UUID 是否存在且未过期
        const uuidExpireTime = repeatedDanmakuUuidMap[uuid];
        if (uuidExpireTime && now <= uuidExpireTime) return;

        const danmakuText = RemoveRepeatedDanmaku_getKey(dom);
        if (!danmakuText || danmakuText.length === 0) return;

        // 检查弹幕是否在指定秒数内出现过
        const expireTime = repeatedDanmakuMap[danmakuText];

        if (expireTime && now <= expireTime) {
          // 这是重复弹幕，隐藏它
          dom.className += " repeated-danmaku";

          // 增加重复次数
          repeatedDanmakuCountMap[danmakuText] = (repeatedDanmakuCountMap[danmakuText] || 1) + 1;

          // 如果开启了放大重复弹幕功能，找到首次出现的弹幕DOM并增加fontSize
          if (isEnlargeDanmaku) {
            const firstDom = repeatedDanmakuDomMap[danmakuText];
            if (firstDom && firstDom.parentNode) {
              requestAnimationFrame(() => {
                if (!firstDom.parentNode) return;
                if (!repeatedDanmakuOriginalFontSizeMap.has(firstDom)) {
                  const computedStyle = window.getComputedStyle(firstDom);
                  repeatedDanmakuOriginalFontSizeMap.set(firstDom, computedStyle.fontSize);
                }
                const originalFontSize = repeatedDanmakuOriginalFontSizeMap.get(firstDom);
                const baseFontSize = parseFloat(originalFontSize) || 20;
                const repeatCount = repeatedDanmakuCountMap[danmakuText];
                const newFontSize = Math.min(baseFontSize + (repeatCount - 1) * 2, 40);
                firstDom.style.fontSize = newFontSize + "px";
                firstDom.setAttribute("data-repeat-count", repeatCount);
                firstDom.classList.remove("danmaku-combo-animation");
                requestAnimationFrame(() => {
                  if (!firstDom.parentNode) return;
                  firstDom.classList.add("danmaku-combo-animation");
                });
              });
            } else if (!firstDom || !firstDom.parentNode) {
              // 如果首条弹幕的DOM已经不存在了，清理相关数据，防止内存泄露
              delete repeatedDanmakuDomMap[danmakuText];
              delete repeatedDanmakuCountMap[danmakuText];
            }
          }
        } else {
          // 首次出现的弹幕
          repeatedDanmakuMap[danmakuText] = now + repeatedDanmakuSeconds * 1000;
          repeatedDanmakuDomMap[danmakuText] = dom;
          repeatedDanmakuCountMap[danmakuText] = 1;
        }
        } catch (e) {
          ExGuard_warn("屏蔽重复弹幕", "处理弹幕节点失败（多半是页面结构变化），跳过这一条", e);
        }
      });
    },
    Object.assign({ tag: "屏蔽重复弹幕" }, RemoveRepeatedDanmaku_pollOpts)
  );
}

// 定期清理过期的弹幕记录
function cleanupExpiredRepeatedDanmaku() {
  const now = Date.now();
  // 删除过期的条目，清理Map防止内存泄露
  for (const [key, expireTime] of Object.entries(repeatedDanmakuMap)) {
    if (expireTime <= now) {
      delete repeatedDanmakuMap[key];
      // 同时清理相关的DOM映射和计数，防止内存泄露
      // 不恢复fontSize，让弹幕保持放大的效果
      delete repeatedDanmakuDomMap[key];
      delete repeatedDanmakuCountMap[key];
    }
  }
  // 清理过期的 UUID 记录
  for (const [uuid, expireTime] of Object.entries(repeatedDanmakuUuidMap)) {
    if (expireTime <= now) {
      delete repeatedDanmakuUuidMap[uuid];
    }
  }
}

// 启动清理定时器
function startRepeatedDanmakuCleanupTimer() {
  if (repeatedDanmakuCleanupTimer) return; // 避免重复启动
  repeatedDanmakuCleanupTimer = setInterval(cleanupExpiredRepeatedDanmaku, 20000);
}

// 停止清理定时器
function stopRepeatedDanmakuCleanupTimer() {
  if (repeatedDanmakuCleanupTimer) {
    clearInterval(repeatedDanmakuCleanupTimer);
    repeatedDanmakuCleanupTimer = null;
  }
  // 清空对象释放内存
  repeatedDanmakuMap = {};
  repeatedDanmakuUuidMap = {};
  repeatedDanmakuDomMap = {};
  repeatedDanmakuCountMap = {};
}

function saveRemoveRepeatedDanmaku() {
  setLocalIsRemoveRepeatedDanmaku(isRemoveRepeatedDanmaku);
}

function getLocalIsRemoveRepeatedDanmaku() {
  return localStorage.getItem("ExSave_isRemoveRepeatedDanmaku") === "1";
}

function setLocalIsRemoveRepeatedDanmaku(value) {
  localStorage.setItem("ExSave_isRemoveRepeatedDanmaku", value ? "1" : "0");
}

function getLocalRepeatedDanmakuSeconds() {
  const saved = localStorage.getItem("ExSave_repeatedDanmakuSeconds");
  if (saved) {
    const value = parseInt(saved);
    // 面板允许 1-300 秒；这里也按同一区间读回，避免设置 60 秒以上被悄悄回到 5
    if (!isNaN(value) && value >= 1 && value <= 300) {
      return value;
    }
  }
  return 5; // 默认5秒
}

function setLocalRepeatedDanmakuSeconds(value) {
  localStorage.setItem("ExSave_repeatedDanmakuSeconds", value.toString());
}

function getLocalIsEnlargeDanmaku() {
  const saved = localStorage.getItem("ExSave_isEnlargeDanmaku");
  if (saved === null) {
    return false; // 默认不开启放大功能
  }
  return saved === "1";
}

function setLocalIsEnlargeDanmaku(value) {
  localStorage.setItem("ExSave_isEnlargeDanmaku", value ? "1" : "0");
}
