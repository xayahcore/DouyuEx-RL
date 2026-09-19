function* (__imports) {
yield {"U": { get: () => U, set: value => { U = value; } },
"el": { get: () => el, set: value => { el = value; } },
"ol": { get: () => ol, set: value => { ol = value; } },
"tl": { get: () => tl, set: value => { tl = value; } }};
/**
 * 斗鱼 STT 序列化解码、二进制封包与全局样式注入辅助工具
 */

/**
 * 还原 STT 报文转义字符 (@S -> /, @A -> @)
 * @param {string} str
 * @returns {string}
 */
function unescapeStt(str) {
  if (!str) return "";
  return str.toString().replace(/@S/g, "/").replace(/@A/g, "@");
}

/**
 * 递归反序列化斗鱼 STT 报文为结构化对象或数组 (导出兼容 el)
 * @param {string} raw
 * @returns {any}
 */
function parseSttString(raw) {
  if (!raw) return "";

  // 1. 数组列表 (// 分割)
  if (raw.includes("//")) {
    return raw
      .split("//")
      .filter(item => item !== "")
      .map(item => parseSttString(item));
  }

  // 2. 键值对字典 (@= 分割)
  if (raw.includes("@=")) {
    return raw
      .split("/")
      .filter(item => item !== "")
      .reduce((acc, pair) => {
        const [k, v] = pair.split("@=");
        acc[k] = parseSttString(unescapeStt(v));
        return acc;
      }, {});
  }

  // 3. 单项转义
  if (raw.includes("@A=")) {
    return parseSttString(unescapeStt(raw));
  }

  return raw.toString();
}
const el = parseSttString;

/**
 * 动态注入全局 Style 样式表 (导出兼容 tl)
 * @param {string} id - 样式表 DOM ID
 * @param {string} cssText - CSS 内容
 */
function injectStyleSheet(id, cssText) {
  if (document.getElementById(id) == null) {
    const styleEl = document.createElement("style");
    styleEl.id = id;
    styleEl.innerHTML = cssText;
    document.body.append(styleEl);
  }
}
const tl = injectStyleSheet;

/**
 * 安全移除指定 ID 的 DOM 元素 (导出兼容 U)
 * @param {string} id - 元素 ID
 */
function removeElementById(id) {
  const elNode = document.getElementById(id);
  if (elNode !== null) {
    elNode.remove();
  }
}
const U = removeElementById;

/**
 * 将字符串编码为斗鱼官方 TCP/WebSocket 二进制协议封包 (导出兼容 ol)
 * 格式: [4字节总长] + [4字节总长] + [2字节协议码689] + [2字节保留0] + [Payload] + [\0]
 * @param {string} text - 待发送的 STT 报文字符串
 * @returns {Uint8Array} 二进制包
 */
function encodeDouyuPacket(text) {
  // UTF-8 编码为字节数组
  const str = String(text);
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 65536 && code <= 1114111) {
      bytes.push(((code >> 18) & 7) | 240);
      bytes.push(((code >> 12) & 63) | 128);
      bytes.push(((code >> 6) & 63) | 128);
      bytes.push((63 & code) | 128);
    } else if (code >= 2048 && code <= 65535) {
      bytes.push(((code >> 12) & 15) | 224);
      bytes.push(((code >> 6) & 63) | 128);
      bytes.push((63 & code) | 128);
    } else if (code >= 128 && code <= 2047) {
      bytes.push(((code >> 6) & 31) | 192);
      bytes.push((63 & code) | 128);
    } else {
      bytes.push(code & 255);
    }
  }

  // 计算头部与总长 (长度包含: 头部 4 字节类型 + 2 字节代码 + 2 字节保留 + 内容 + 尾部 \0)
  const packetLength = bytes.length + 4 + 2 + 1 + 1;
  const fullPacket = new Uint8Array(packetLength + 4); // +4 字节总长自身
  const lengthBuffer = new Uint32Array([packetLength]);
  const magicCodeBuffer = new Uint32Array([689]); // 斗鱼客户端消息类型代码: 689

  fullPacket.set(new Uint8Array(lengthBuffer.buffer), 0); // 长度 1
  fullPacket.set(new Uint8Array(lengthBuffer.buffer), 4); // 长度 2 (校验对齐)
  fullPacket.set(new Uint8Array(magicCodeBuffer.buffer), 8); // 协议代码 689

  const payloadArray = new Uint8Array(bytes);
  fullPacket.set(payloadArray, 12); // 正文载荷

  return fullPacket;
}
const ol = encodeDouyuPacket;

}
