function* (__imports) {
yield {"Or": { get: () => Or, set: value => { Or = value; } }};
var Pr = 0,
  zr = 8;
function Or(e) {
  for (
    var t = ((e, t) => {
        ((e[t >> 5] |= 128 << (t % 32)), (e[14 + (((t + 64) >>> 9) << 4)] = t));
        for (
          var o = 1732584193,
            n = -271733879,
            i = -1732584194,
            a = 271733878,
            r = 0;
          r < e.length;
          r += 16
        ) {
          var l = o,
            s = n,
            d = i,
            c = a;
          ((o = (0, __imports.p)(o, n, i, a, e[r + 0], 7, -680876936)),
            (a = (0, __imports.p)(a, o, n, i, e[r + 1], 12, -389564586)),
            (i = (0, __imports.p)(i, a, o, n, e[r + 2], 17, 606105819)),
            (n = (0, __imports.p)(n, i, a, o, e[r + 3], 22, -1044525330)),
            (o = (0, __imports.p)(o, n, i, a, e[r + 4], 7, -176418897)),
            (a = (0, __imports.p)(a, o, n, i, e[r + 5], 12, 1200080426)),
            (i = (0, __imports.p)(i, a, o, n, e[r + 6], 17, -1473231341)),
            (n = (0, __imports.p)(n, i, a, o, e[r + 7], 22, -45705983)),
            (o = (0, __imports.p)(o, n, i, a, e[r + 8], 7, 1770035416)),
            (a = (0, __imports.p)(a, o, n, i, e[r + 9], 12, -1958414417)),
            (i = (0, __imports.p)(i, a, o, n, e[r + 10], 17, -42063)),
            (n = (0, __imports.p)(n, i, a, o, e[r + 11], 22, -1990404162)),
            (o = (0, __imports.p)(o, n, i, a, e[r + 12], 7, 1804603682)),
            (a = (0, __imports.p)(a, o, n, i, e[r + 13], 12, -40341101)),
            (i = (0, __imports.p)(i, a, o, n, e[r + 14], 17, -1502002290)),
            (n = (0, __imports.p)(n, i, a, o, e[r + 15], 22, 1236535329)),
            (o = (0, __imports.u)(o, n, i, a, e[r + 1], 5, -165796510)),
            (a = (0, __imports.u)(a, o, n, i, e[r + 6], 9, -1069501632)),
            (i = (0, __imports.u)(i, a, o, n, e[r + 11], 14, 643717713)),
            (n = (0, __imports.u)(n, i, a, o, e[r + 0], 20, -373897302)),
            (o = (0, __imports.u)(o, n, i, a, e[r + 5], 5, -701558691)),
            (a = (0, __imports.u)(a, o, n, i, e[r + 10], 9, 38016083)),
            (i = (0, __imports.u)(i, a, o, n, e[r + 15], 14, -660478335)),
            (n = (0, __imports.u)(n, i, a, o, e[r + 4], 20, -405537848)),
            (o = (0, __imports.u)(o, n, i, a, e[r + 9], 5, 568446438)),
            (a = (0, __imports.u)(a, o, n, i, e[r + 14], 9, -1019803690)),
            (i = (0, __imports.u)(i, a, o, n, e[r + 3], 14, -187363961)),
            (n = (0, __imports.u)(n, i, a, o, e[r + 8], 20, 1163531501)),
            (o = (0, __imports.u)(o, n, i, a, e[r + 13], 5, -1444681467)),
            (a = (0, __imports.u)(a, o, n, i, e[r + 2], 9, -51403784)),
            (i = (0, __imports.u)(i, a, o, n, e[r + 7], 14, 1735328473)),
            (n = (0, __imports.u)(n, i, a, o, e[r + 12], 20, -1926607734)),
            (o = (0, __imports.g)(o, n, i, a, e[r + 5], 4, -378558)),
            (a = (0, __imports.g)(a, o, n, i, e[r + 8], 11, -2022574463)),
            (i = (0, __imports.g)(i, a, o, n, e[r + 11], 16, 1839030562)),
            (n = (0, __imports.g)(n, i, a, o, e[r + 14], 23, -35309556)),
            (o = (0, __imports.g)(o, n, i, a, e[r + 1], 4, -1530992060)),
            (a = (0, __imports.g)(a, o, n, i, e[r + 4], 11, 1272893353)),
            (i = (0, __imports.g)(i, a, o, n, e[r + 7], 16, -155497632)),
            (n = (0, __imports.g)(n, i, a, o, e[r + 10], 23, -1094730640)),
            (o = (0, __imports.g)(o, n, i, a, e[r + 13], 4, 681279174)),
            (a = (0, __imports.g)(a, o, n, i, e[r + 0], 11, -358537222)),
            (i = (0, __imports.g)(i, a, o, n, e[r + 3], 16, -722521979)),
            (n = (0, __imports.g)(n, i, a, o, e[r + 6], 23, 76029189)),
            (o = (0, __imports.g)(o, n, i, a, e[r + 9], 4, -640364487)),
            (a = (0, __imports.g)(a, o, n, i, e[r + 12], 11, -421815835)),
            (i = (0, __imports.g)(i, a, o, n, e[r + 15], 16, 530742520)),
            (n = (0, __imports.g)(n, i, a, o, e[r + 2], 23, -995338651)),
            (o = (0, __imports.h)(o, n, i, a, e[r + 0], 6, -198630844)),
            (a = (0, __imports.h)(a, o, n, i, e[r + 7], 10, 1126891415)),
            (i = (0, __imports.h)(i, a, o, n, e[r + 14], 15, -1416354905)),
            (n = (0, __imports.h)(n, i, a, o, e[r + 5], 21, -57434055)),
            (o = (0, __imports.h)(o, n, i, a, e[r + 12], 6, 1700485571)),
            (a = (0, __imports.h)(a, o, n, i, e[r + 3], 10, -1894986606)),
            (i = (0, __imports.h)(i, a, o, n, e[r + 10], 15, -1051523)),
            (n = (0, __imports.h)(n, i, a, o, e[r + 1], 21, -2054922799)),
            (o = (0, __imports.h)(o, n, i, a, e[r + 8], 6, 1873313359)),
            (a = (0, __imports.h)(a, o, n, i, e[r + 15], 10, -30611744)),
            (i = (0, __imports.h)(i, a, o, n, e[r + 6], 15, -1560198380)),
            (n = (0, __imports.h)(n, i, a, o, e[r + 13], 21, 1309151649)),
            (o = (0, __imports.h)(o, n, i, a, e[r + 4], 6, -145523070)),
            (a = (0, __imports.h)(a, o, n, i, e[r + 11], 10, -1120210379)),
            (i = (0, __imports.h)(i, a, o, n, e[r + 2], 15, 718787259)),
            (n = (0, __imports.h)(n, i, a, o, e[r + 9], 21, -343485551)),
            (o = (0, __imports.Fr)(o, l)),
            (n = (0, __imports.Fr)(n, s)),
            (i = (0, __imports.Fr)(i, d)),
            (a = (0, __imports.Fr)(a, c)));
        }
        return Array(o, n, i, a);
      })(
        ((e) => {
          for (
            var t = Array(), o = (1 << zr) - 1, n = 0;
            n < e.length * zr;
            n += zr
          )
            t[n >> 5] |= (e.charCodeAt(n / zr) & o) << (n % 32);
          return t;
        })(e),
        e.length * zr,
      ),
      o = Pr ? "0123456789ABCDEF" : "0123456789abcdef",
      n = "",
      i = 0;
    i < 4 * t.length;
    i++
  )
    n +=
      o.charAt((t[i >> 2] >> ((i % 4) * 8 + 4)) & 15) +
      o.charAt((t[i >> 2] >> ((i % 4) * 8)) & 15);
  return n;
}

}
