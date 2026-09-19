function* (__imports) {
yield {"$": { get: () => $, set: value => { $ = value; } },
"E": { get: () => E, set: value => { E = value; } },
"J": { get: () => J, set: value => { J = value; } },
"Q": { get: () => Q, set: value => { Q = value; } },
"T": { get: () => T, set: value => { T = value; } },
"X": { get: () => X, set: value => { X = value; } },
"_": { get: () => _, set: value => { _ = value; } },
"a": { get: () => a, set: value => { a = value; } },
"b": { get: () => b, set: value => { b = value; } },
"k": { get: () => k, set: value => { k = value; } },
"l": { get: () => l, set: value => { l = value; } },
"te": { get: () => te, set: value => { te = value; } },
"v": { get: () => v, set: value => { v = value; } },
"w": { get: () => w, set: value => { w = value; } },
"x": { get: () => x, set: value => { x = value; } }};
/**
 * DouyuEx-RL 核心通用基础工具库
 */

/**
 * 异步延时等待
 * @param {number} ms - 延时毫秒数
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => (0, __imports.setTimeout)(resolve, ms));
}
const b = sleep;

/**
 * 将秒数格式化为中文时长描述 (如: 1小时23分45秒)
 * @param {number|string} seconds
 * @returns {string}
 */
function formatDurationChinese(seconds) {
  let sec = parseInt(seconds, 10) || 0;
  let min = 0;
  let hour = 0;

  if (sec > 60) {
    min = Math.floor(sec / 60);
    sec = sec % 60;
    if (min > 60) {
      hour = Math.floor(min / 60);
      min = min % 60;
    }
  }

  let result = `${sec}秒`;
  if (min > 0) result = `${min}分` + result;
  if (hour > 0) result = `${hour}小时` + result;
  return result;
}
const Q = formatDurationChinese;

/**
 * 将秒数格式化为标准时间码 (hh:mm:ss)
 * @param {number|string} seconds
 * @returns {string}
 */
function formatDurationClock(seconds) {
  let sec = parseInt(seconds, 10) || 0;
  let min = 0;
  let hour = 0;

  if (sec > 60) {
    min = Math.floor(sec / 60);
    sec = sec % 60;
    if (min > 60) {
      hour = Math.floor(min / 60);
      min = min % 60;
    }
  }

  const sStr = String(sec).padStart(2, "0");
  const mStr = String(min).padStart(2, "0");
  const hStr = String(hour).padStart(2, "0");
  return `${hStr}:${mStr}:${sStr}`;
}
const J = formatDurationClock;

/**
 * 正则提取字符串中两个标记之间的内容
 * @param {string} str - 源文本
 * @param {string} prefix - 前缀
 * @param {string} suffix - 后缀
 * @returns {string|false} 提取的内容或 false
 */
function extractBetween(str, prefix, suffix) {
  if (!str || typeof str !== 'string') return false;
  const match = str.match(new RegExp(prefix + "(.*?)" + suffix));
  return Boolean(match) && match[1];
}
const v = extractBetween;

/**
 * 安全读取指定 Cookie 键的值
 * @param {string} name - Cookie 键名
 * @returns {string|null}
 */
function getCookie(name) {
  try {
    const reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
    const match = document.cookie.match(reg);
    return match ? unescape(match[2]) : null;
  } catch {
    return null;
  }
}
const x = getCookie;

/**
 * 获取或生成 3 小时有效期的 acf_ccn 安全凭据
 * @returns {string}
 */
function generateCcnToken() {
  let ccn = getCookie("acf_ccn");
  if (ccn == null) {
    const expireDate = new Date();
    expireDate.setTime(expireDate.getTime() + 10800000); // +3 hours
    document.cookie = `acf_ccn=1; path=/; expires=${expireDate.toGMTString()}`;
    ccn = "1";
  }
  return ccn;
}
const w = generateCcnToken;

/**
 * 弹出顶部浮动毛玻璃 NoticeJs 提示胶囊
 * @param {string} message - 提示消息文本
 * @param {string} [type='success'] - 类型: success | info | error | warning
 * @param {object} [options] - 附加配置项
 */
function showToast(message, type = "success", options = {}) {
  const config = { text: message, type, position: "bottomLeft", ...options };
  try {
    new NoticeJs(config).show();
  } catch {
    console.log(`[Toast ${type}] ${message}`);
  }
}
const T = showToast;

/**
 * 新标签页打开指定 URL
 * @param {string} url - 目标地址
 * @param {boolean} [active=true] - 是否激活焦点
 */
function openInNewTab(url, active = true) {
  (0, __imports.GM_openInTab)(url, { active });
}
const _ = openInNewTab;

/**
 * 跨浏览器安全关闭当前窗口
 */
function closeCurrentWindow() {
  if (navigator.userAgent.includes("Firefox") || navigator.userAgent.includes("Chrome")) {
    window.location.href = "about:blank";
  } else {
    window.opener = null;
    window.open("", "_self");
  }
  window.close();
}

/**
 * 标准日期时间格式化 (对齐 yyyy-MM-dd hh:mm:ss)
 * @param {string} fmt - 格式模板
 * @param {Date} dateObj - 日期对象
 * @returns {string}
 */
function formatDate(fmt, dateObj) {
  const date = dateObj || new Date();
  let res = fmt;
  const o = {
    "M+": date.getMonth() + 1,
    "d+": date.getDate(),
    "h+": date.getHours(),
    "m+": date.getMinutes(),
    "s+": date.getSeconds(),
    "q+": Math.floor((date.getMonth() + 3) / 3),
    S: date.getMilliseconds(),
  };

  if (/(y+)/.test(res)) {
    res = res.replace(RegExp.$1, String(date.getFullYear()).substr(4 - RegExp.$1.length));
  }

  for (const k in o) {
    if (new RegExp("(" + k + ")").test(res)) {
      res = res.replace(
        RegExp.$1,
        RegExp.$1.length === 1 ? o[k] : String("00" + o[k]).substr(String(o[k]).length)
      );
    }
  }
  return res;
}
const k = formatDate;

/**
 * 获取范围内的随机整数 [min, max)
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}
const a = getRandomInt;

/**
 * 发送系统级桌面通知 (HTML5 Notification)
 * @param {string} title
 * @param {string} body
 * @param {Function} onClick
 */
function showDesktopNotification(title, body, onClick) {
  if (window.Notification && Notification.permission !== "denied") {
    Notification.requestPermission((perm) => {
      if (perm === "granted") {
        const notif = new Notification(title, { body });
        notif.onclick = () => {
          if (typeof onClick === 'function') onClick();
        };
      }
    });
  }
}
const X = showDesktopNotification;

/**
 * 获取输入框的光标字符位置
 * @param {HTMLElement} el
 * @returns {number}
 */
function getTextareaCursorPosition(el) {
  if (!el) return 0;
  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    return el.selectionStart || 0;
  }
  let pos = 0;
  if (window.getSelection) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0).cloneRange();
      range.selectNodeContents(el);
      range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
      pos = range.toString().length;
    }
  }
  return pos;
}
const $ = getTextareaCursorPosition;

/**
 * 导出数据为 Excel 文件并自动触发下载
 * @param {Array<string>} headers - 表头
 * @param {Array<Array<any>>} rows - 数据行二维数组
 * @param {string} [filename='download.xlsx'] - 下载文件名
 */
function exportToExcel(headers, rows, filename = "download.xlsx") {
  if (typeof XLSX === "undefined") {
    if (typeof __imports.ExLoadLib === "function" && __imports.EXURL) {
      (0, __imports.ExLoadLib)(
        __imports.EXURL.xl,
        () => exportToExcel(headers, rows, filename),
        () => showToast("【下载弹幕】xlsx组件加载失败", "info")
      );
    }
    return;
  }

  const tableData = [headers, ...rows];
  const sheet = XLSX.utils.aoa_to_sheet(tableData);
  const workbook = { SheetNames: ["sheet1"], Sheets: { sheet1: sheet } };
  const binaryOutput = XLSX.write(workbook, { bookType: "xlsx", bookSST: false, type: "binary" });

  const buffer = new ArrayBuffer(binaryOutput.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binaryOutput.length; i++) {
    view[i] = binaryOutput.charCodeAt(i) & 0xff;
  }

  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();

  (0, __imports.setTimeout)(() => {
    try {
      URL.revokeObjectURL(objectUrl);
    } catch {}
  }, 1500);
}
const l = exportToExcel;

/**
 * 触发全局窗口 Resize 布局重排事件
 */
function triggerWindowResize() {
  window.dispatchEvent(new Event("resize"));
}
const te = triggerWindowResize;

/**
 * 多候选选择器匹配首个存在的 DOM 元素
 * @param {Array<string|Element>} selectors
 * @returns {Element|null}
 */
function queryFirstMatch(selectors) {
  if (!Array.isArray(selectors)) return null;
  for (const s of selectors) {
    const el = typeof s === "string" ? document.querySelector(s) : s;
    if (el) return el;
  }
  return null;
}
const E = queryFirstMatch;

}
