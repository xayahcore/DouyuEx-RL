function* (__imports) {
yield {"B": { get: () => B, set: value => { B = value; } },
"I": { get: () => I, set: value => { I = value; } },
"W": { get: () => W, set: value => { W = value; } },
"Y": { get: () => Y, set: value => { Y = value; } },
"m": { get: () => m, set: value => { m = value; } },
"n": { get: () => n, set: value => { n = value; } },
"readRoomIdentity": { get: () => readRoomIdentity, set: value => { readRoomIdentity = value; } },
"t": { get: () => t, set: value => { t = value; } }};
var o = document.getElementsByTagName("html")[0].innerHTML,
  n = "$ROOM.room_id =".length,
  t = o.indexOf("$ROOM.room_id ="),
  B = "",
  I =
    (0 < t
      ? (B = (B = o.substring(t + n, o.indexOf(";", t + n))) && B.trim())
      : (B = (0, __imports.v)(o, "roomID:", ","))
        ? (B = B.trim())
        : (t = document.querySelector('link[rel="canonical"]')) &&
          (B = t.getAttribute("href").split("/").pop().trim()),
    (o = null),
    (0, __imports.x)("acf_uid")),
  W = "",
  m =
    (0, __imports.x)("acf_uid") +
    "_" +
    (0, __imports.x)("acf_biz") +
    "_" +
    (0, __imports.x)("acf_stk") +
    "_" +
    (0, __imports.x)("acf_ct") +
    "_" +
    (0, __imports.x)("acf_ltkid"),
  Y = null;
if (!B) {
  try {
    B = String(
      window.room_id ||
        (window.$ROOM && window.$ROOM.room_id) ||
        (location.pathname.match(/\/(\d+)/) || [])[1] ||
        "",
    ).trim();
  } catch (e) {}
}
// Read only identity sources already used by the session bootstrap. Alias paths
// themselves are never room IDs; SPA navigation must wait for fresh page data.
function readRoomIdentity() {
  const page = typeof __imports.unsafeWindow !== "undefined" ? __imports.unsafeWindow : window;
  const numeric = value => /^\d+$/.test(String(value || '').trim()) ? String(value).trim() : '';
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
  const html = document.getElementsByTagName('html')[0]?.innerHTML || '';
  return [
    numeric(page.$ROOM?.room_id), numeric(page.room_id),
    numeric((canonical.match(/\/(\d+)\/?(?:[?#].*)?$/) || [])[1]),
    numeric((html.match(/\$ROOM\.room_id\s*=\s*['"]?(\d+)/) || [])[1]),
    numeric((html.match(/roomID:\s*['"]?(\d+)/) || [])[1]),
  ];
}
if (!I) {
  try {
    I = String(
      (0, __imports.x)("acf_uid") ||
        (document.cookie.match(/(?:^|;\s*)acf_uid=([^;]+)/) || [])[1] ||
        "",
    ).trim();
  } catch (e) {}
}
if (!W) {
  try {
    var _cw = (0, __imports.x)("acf_nickname");
    if (_cw) W = decodeURIComponent(_cw);
  } catch (e) {}
}

}
