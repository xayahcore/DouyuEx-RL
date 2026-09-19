function* (__imports) {
yield {"Kr": { get: () => Kr, set: value => { Kr = value; } },
"Qr": { get: () => Qr, set: value => { Qr = value; } },
"Wr": { get: () => Wr, set: value => { Wr = value; } },
"Xr": { get: () => Xr, set: value => { Xr = value; } },
"Yr": { get: () => Yr, set: value => { Yr = value; } },
"Zr": { get: () => Zr, set: value => { Zr = value; } }};
let Wr = [],
  Yr = new WeakMap();
function Qr(e) {
  Wr.push(e);
}
let Jr = [];
function Zr(e) {
  if ("SCRIPT" === e.tagName && !e.src && e.textContent) {
    var o = Jr.filter((e) => e.inline);
    if (0 !== o.length) {
      let t = e.textContent;
      for (let e = 0; e < o.length; e++) t = o[e].callback(t);
      t !== e.textContent && (e.textContent = t);
    }
  }
  return e;
}
function Xr(e, t, o) {
  var n,
    i,
    a = e.src,
    r = [];
  for (let e = 0; e < Jr.length; e++) {
    var l = Jr[e];
    !l.inline && a.includes(l.url) && r.push(l);
  }
  return (
    0 !== r.length &&
    ((n = r),
    (i = o),
    (0, __imports.GM_xmlhttpRequest)({
      method: "GET",
      url: a,
      onload: function (e) {
        let t = e.responseText;
        for (let e = 0; e < n.length; e++) t = n[e].callback(t);
        e = document.createElement("script");
        ((e.type = "text/javascript"), (e.textContent = t), i.appendChild(e));
      },
      onerror: function (e) {
        console.error("Error loading script via GM_xmlhttpRequest:", e);
      },
    }),
    1)
  );
}
function Kr(e) {
  Jr.push(e);
}

}
