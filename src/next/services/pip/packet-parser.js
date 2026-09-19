function* (__imports) {
yield {"parsePipChatPacket": { get: () => parsePipChatPacket, set: value => { parsePipChatPacket = value; } }};
function parsePipChatPacket(e) {
                  if (!e || !e.startsWith("type@=chatmsg/")) return null;
                  var t,
                    o = {},
                    n = e.split("/");
                  for (let e = 0; e < n.length; e++) {
                    var i = n[e],
                      a = i.indexOf("@=");
                    -1 !== a && (o[i.substring(0, a)] = i.substring(a + 2));
                  }
                  return (e = o.txt ? decodeURIComponent(o.txt) : "") &&
                    (!1 === __imports.pipPreferences.filterRobotDanmaku || o.dms)
                    ? ((t = o.hash || o.cid || o.dmid || ""),
                      {
                        text: e,
                        color: o.col ? parseInt(o.col) : 0,
                        uid: o.uid || "",
                        msgId: t,
                        dedupKey: t || o.uid + "|" + e,
                      })
                    : null;
                }

}
