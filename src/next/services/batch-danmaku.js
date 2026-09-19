function* (__imports) {
yield {"U": { get: () => U, set: value => { U = value; } },
"el": { get: () => el, set: value => { el = value; } },
"ol": { get: () => ol, set: value => { ol = value; } },
"tl": { get: () => tl, set: value => { tl = value; } }};
function $r(e) {
  if (e) return e.toString().replace(/@S/g, "/").replace(/@A/g, "@");
}
function el(e) {
  if (e)
    return e.includes("//")
      ? e
          .split("//")
          .filter((e) => "" !== e)
          .map((e) => el(e))
      : e.includes("@=")
        ? e
            .split("/")
            .filter((e) => "" !== e)
            .reduce((e, t) => {
              var [t, o] = t.split("@=");
              return ((e[t] = el($r(o))), e);
            }, {})
        : e.includes("@A=")
          ? el($r(e))
          : e.toString();
}
function tl(e, t) {
  var o;
  null == document.getElementById(e) &&
    (((o = document.createElement("style")).id = e),
    (o.innerHTML = t),
    document.body.append(o));
}
function U(e) {
  null !== document.getElementById(e) && document.getElementById(e).remove();
}
function ol(e) {
  var t = ((t) => {
      var o,
        n,
        i = new Array();
      o = t.length;
      for (let e = 0; e < o; e++)
        65536 <= (n = String(t).charCodeAt(e)) && n <= 1114111
          ? (i.push(((n >> 18) & 7) | 240),
            i.push(((n >> 12) & 63) | 128),
            i.push(((n >> 6) & 63) | 128),
            i.push((63 & n) | 128))
          : 2048 <= n && n <= 65535
            ? (i.push(((n >> 12) & 15) | 224),
              i.push(((n >> 6) & 63) | 128),
              i.push((63 & n) | 128))
            : 128 <= n && n <= 2047
              ? (i.push(((n >> 6) & 31) | 192), i.push((63 & n) | 128))
              : i.push(255 & n);
      return i;
    })(e),
    e = new Uint8Array(t.length + 4 + 4 + 2 + 1 + 1 + 1),
    o = new Uint8Array(t.length);
  for (let e = 0; e < o.length; e++) o[e] = t[e];
  var n = new Uint32Array([t.length + 4 + 2 + 1 + 1 + 1]),
    i = new Uint32Array([689]);
  return (
    e.set(new Uint8Array(n.buffer), 0),
    e.set(new Uint8Array(n.buffer), 4),
    e.set(new Uint8Array(i.buffer), 8),
    e.set(o, 12),
    e
  );
}

}
