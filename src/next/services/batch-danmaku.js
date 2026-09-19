function* (__imports) {
yield {"U": { get: () => U, set: value => { U = value; } },
"el": { get: () => el, set: value => { el = value; } },
"ol": { get: () => ol, set: value => { ol = value; } },
"tl": { get: () => tl, set: value => { tl = value; } }};
/**
 * 斗鱼 STT 序列化协议反序列化、TCP/WS 二进制封包与样式注入工具库
 */

/**
 * 还原 STT 报文转义字符 (@S -> /, @A -> @)
 * @param {string} str
 * @returns {string}
 */
function unescapeSttString(str) {
  if (!str) return "";
  return str.toString().replace(/@S/g, "/").replace(/@A/g, "@");
}

/**
 * 递归反序列化斗鱼 STT 协议报文为结构化对象或数组 (导出兼容 el)
 * @param {string} raw
 * @returns {any}
 */
function el(raw) {
  if (!raw) return "";

  // 1. 数组列表 (// 分割)
  if (raw.includes("//")) {
    return raw
      .split("//")
      .filter(item => item !== "")
      .map(item => el(item));
  }

  // 2. 键值对字典 (@= 分割)
  if (raw.includes("@=")) {
    return raw
      .split("/")
      .filter(item => item !== "")
      .reduce((acc, pair) => {
        const [k, v] = pair.split("@=");
        acc[k] = el(unescapeSttString(v));
        return acc;
      }, {});
  }

  // 3. 单项转义 (@A=)
  if (raw.includes("@A=")) {
    return el(unescapeSttString(raw));
  }

  return raw.toString();
}

/**
 * 动态注入全局 Style 样式表 (导出兼容 tl)
 * @param {string} id - 样式表 DOM ID
 * @param {string} cssText - CSS 样式文本
 */
function tl(id, cssText) {
  if (document.getElementById(id) == null) {
    const styleEl = document.createElement("style");
    styleEl.id = id;
    styleEl.innerHTML = cssText;
    document.body.append(styleEl);
  }
}

/**
 * 安全移除指定 ID 的 DOM 元素 (导出兼容 U)
 * @param {string} id - 待移除元素的 ID
 */
function U(id) {
  const node = document.getElementById(id);
  if (node !== null) {
    node.remove();
  }
}

/**
 * 将字符串编码为斗鱼官方客户端 TCP/WebSocket 二进制协议封包 (导出兼容 ol)
 * 协议包格式: [4字节总长] + [4字节总长] + [2字节协议代码689] + [2字节保留0] + [Payload] + [\0]
 * @param {string} text - 待发送的 STT 报文字符串
 * @returns {Uint8Array} 二进制包
 */
function ol(text) {
  const str = String(text);
  const bytes = [];

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 65536 && code <= 1114111) {
      bytes.push(((code >> 18) & 7) | 240);
      bytes.push(((code >> 12) & 63) | 128);
      bytes.push(((code >> 6) & 63) | 128);
      bytes.push((code & 63) | 128);
    } else if (code >= 2048 && code <= 65535) {
      bytes.push(((code >> 12) & 15) | 224);
      bytes.push(((code >> 6) & 63) | 128);
      bytes.push((code & 63) | 128);
    } else if (code >= 128 && code <= 2047) {
      bytes.push(((code >> 6) & 31) | 192);
      bytes.push((code & 63) | 128);
    } else {
      bytes.push(code & 255);
    }
  }

  const packetLength = bytes.length + 4 + 2 + 1 + 1;
  const fullPacket = new Uint8Array(packetLength + 4);
  const lengthBuffer = new Uint32Array([packetLength]);
  const magicCodeBuffer = new Uint32Array([689]); // 斗鱼客户端消息类型代码: 689

  fullPacket.set(new Uint8Array(lengthBuffer.buffer), 0); // 长度 1
  fullPacket.set(new Uint8Array(lengthBuffer.buffer), 4); // 长度 2 (校验对齐)
  fullPacket.set(new Uint8Array(magicCodeBuffer.buffer), 8); // 协议代码 689

  const payloadArray = new Uint8Array(bytes);
  fullPacket.set(payloadArray, 12); // 正文载荷

  return fullPacket;
}

}
