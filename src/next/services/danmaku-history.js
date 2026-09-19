function* (__imports) {
yield {"Or": { get: () => Or, set: value => { Or = value; } }};
/**
 * 标准 MD5 16 轮消息摘要计算引擎 (导出兼容 Or)
 */
const hexCaseUpper = 0;
const charBits = 8;

/**
 * 计算输入字符串的 32 位 MD5 十六进制哈希值
 * @param {string} inputStr - 待签名文本
 * @returns {string} 32位十六进制小写哈希
 */
function computeMd5Hex(inputStr) {
  const str = String(inputStr);

  const coreMd5 = (x, len) => {
    x[len >> 5] |= 128 << (len % 32);
    x[14 + (((len + 64) >>> 9) << 4)] = len;

    let a = 1732584193;
    let b = -271733879;
    let c = -1732584194;
    let d = 271733878;

    for (let i = 0; i < x.length; i += 16) {
      const olda = a;
      const oldb = b;
      const oldc = c;
      const oldd = d;

      // Round 1
      a = (0, __imports.p)(a, b, c, d, x[i + 0], 7, -680876936);
      d = (0, __imports.p)(d, a, b, c, x[i + 1], 12, -389564586);
      c = (0, __imports.p)(c, d, a, b, x[i + 2], 17, 606105819);
      b = (0, __imports.p)(b, c, d, a, x[i + 3], 22, -1044525330);
      a = (0, __imports.p)(a, b, c, d, x[i + 4], 7, -176418897);
      d = (0, __imports.p)(d, a, b, c, x[i + 5], 12, 1200080426);
      c = (0, __imports.p)(c, d, a, b, x[i + 6], 17, -1473231341);
      b = (0, __imports.p)(b, c, d, a, x[i + 7], 22, -45705983);
      a = (0, __imports.p)(a, b, c, d, x[i + 8], 7, 1770035416);
      d = (0, __imports.p)(d, a, b, c, x[i + 9], 12, -1958414417);
      c = (0, __imports.p)(c, d, a, b, x[i + 10], 17, -42063);
      b = (0, __imports.p)(b, c, d, a, x[i + 11], 22, -1990404162);
      a = (0, __imports.p)(a, b, c, d, x[i + 12], 7, 1804603682);
      d = (0, __imports.p)(d, a, b, c, x[i + 13], 12, -40341101);
      c = (0, __imports.p)(c, d, a, b, x[i + 14], 17, -1502002290);
      b = (0, __imports.p)(b, c, d, a, x[i + 15], 22, 1236535329);

      // Round 2
      a = (0, __imports.u)(a, b, c, d, x[i + 1], 5, -165796510);
      d = (0, __imports.u)(d, a, b, c, x[i + 6], 9, -1069501632);
      c = (0, __imports.u)(c, d, a, b, x[i + 11], 14, 643717713);
      b = (0, __imports.u)(b, c, d, a, x[i + 0], 20, -373897302);
      a = (0, __imports.u)(a, b, c, d, x[i + 5], 5, -701558691);
      d = (0, __imports.u)(d, a, b, c, x[i + 10], 9, 38016083);
      c = (0, __imports.u)(c, d, a, b, x[i + 15], 14, -660478335);
      b = (0, __imports.u)(b, c, d, a, x[i + 4], 20, -405537848);
      a = (0, __imports.u)(a, b, c, d, x[i + 9], 5, 568446438);
      d = (0, __imports.u)(d, a, b, c, x[i + 14], 9, -1019803690);
      c = (0, __imports.u)(c, d, a, b, x[i + 3], 14, -187363961);
      b = (0, __imports.u)(b, c, d, a, x[i + 8], 20, 1163531501);
      a = (0, __imports.u)(a, b, c, d, x[i + 13], 5, -1444681467);
      d = (0, __imports.u)(d, a, b, c, x[i + 2], 9, -51403784);
      c = (0, __imports.u)(c, d, a, b, x[i + 7], 14, 1735328473);
      b = (0, __imports.u)(b, c, d, a, x[i + 12], 20, -1926607734);

      // Round 3
      a = (0, __imports.g)(a, b, c, d, x[i + 5], 4, -378558);
      d = (0, __imports.g)(d, a, b, c, x[i + 8], 11, -2022574463);
      c = (0, __imports.g)(c, d, a, b, x[i + 11], 16, 1839030562);
      b = (0, __imports.g)(b, c, d, a, x[i + 14], 23, -35309556);
      a = (0, __imports.g)(a, b, c, d, x[i + 1], 4, -1530992060);
      d = (0, __imports.g)(d, a, b, c, x[i + 4], 11, 1272893353);
      c = (0, __imports.g)(c, d, a, b, x[i + 7], 16, -155497632);
      b = (0, __imports.g)(b, c, d, a, x[i + 10], 23, -1094730640);
      a = (0, __imports.g)(a, b, c, d, x[i + 13], 4, 681279174);
      d = (0, __imports.g)(d, a, b, c, x[i + 0], 11, -358537222);
      c = (0, __imports.g)(c, d, a, b, x[i + 3], 16, -722521979);
      b = (0, __imports.g)(b, c, d, a, x[i + 6], 23, 76029189);
      a = (0, __imports.g)(a, b, c, d, x[i + 9], 4, -640364487);
      d = (0, __imports.g)(d, a, b, c, x[i + 12], 11, -421815835);
      c = (0, __imports.g)(c, d, a, b, x[i + 15], 16, 530742520);
      b = (0, __imports.g)(b, c, d, a, x[i + 2], 23, -995338651);

      // Round 4
      a = (0, __imports.h)(a, b, c, d, x[i + 0], 6, -198630844);
      d = (0, __imports.h)(d, a, b, c, x[i + 7], 10, 1126891415);
      c = (0, __imports.h)(c, d, a, b, x[i + 14], 15, -1416354905);
      b = (0, __imports.h)(b, c, d, a, x[i + 5], 21, -57434055);
      a = (0, __imports.h)(a, b, c, d, x[i + 12], 6, 1700485571);
      d = (0, __imports.h)(d, a, b, c, x[i + 3], 10, -1894986606);
      c = (0, __imports.h)(c, d, a, b, x[i + 10], 15, -1051523);
      b = (0, __imports.h)(b, c, d, a, x[i + 1], 21, -2054922799);
      a = (0, __imports.h)(a, b, c, d, x[i + 8], 6, 1873313359);
      d = (0, __imports.h)(d, a, b, c, x[i + 15], 10, -30611744);
      c = (0, __imports.h)(c, d, a, b, x[i + 6], 15, -1560198380);
      b = (0, __imports.h)(b, c, d, a, x[i + 13], 21, 1309151649);
      a = (0, __imports.h)(a, b, c, d, x[i + 4], 6, -145523070);
      d = (0, __imports.h)(d, a, b, c, x[i + 11], 10, -1120210379);
      c = (0, __imports.h)(c, d, a, b, x[i + 2], 15, 718787259);
      b = (0, __imports.h)(b, c, d, a, x[i + 9], 21, -343485551);

      a = (0, __imports.Fr)(a, olda);
      b = (0, __imports.Fr)(b, oldb);
      c = (0, __imports.Fr)(c, oldc);
      d = (0, __imports.Fr)(d, oldd);
    }
    return [a, b, c, d];
  };

  const strToWords = (s) => {
    const bin = [];
    const mask = (1 << charBits) - 1;
    for (let i = 0; i < s.length * charBits; i += charBits) {
      bin[i >> 5] |= (s.charCodeAt(i / charBits) & mask) << (i % 32);
    }
    return bin;
  };

  const words = strToWords(str);
  const hashArray = coreMd5(words, str.length * charBits);
  const hexChars = hexCaseUpper ? "0123456789ABCDEF" : "0123456789abcdef";
  let output = "";

  for (let i = 0; i < hashArray.length * 4; i++) {
    output +=
      hexChars.charAt((hashArray[i >> 2] >> ((i % 4) * 8 + 4)) & 15) +
      hexChars.charAt((hashArray[i >> 2] >> ((i % 4) * 8)) & 15);
  }

  return output;
}
const Or = computeMd5Hex;

}
