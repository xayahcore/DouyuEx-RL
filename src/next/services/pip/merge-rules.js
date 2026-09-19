function* (__imports) {
yield {"findPipMergeKey": { get: () => findPipMergeKey, set: value => { findPipMergeKey = value; } }};
function findPipMergeKey(e) {
                      if (!__imports.pipMergeGroups.has(e)) {
                        var t = (e) =>
                            e
                              .replace(/\s+/g, "")
                              .split("")
                              .filter((e, t, o) => o.indexOf(e) === t)
                              .join(""),
                          o = t(e);
                        if (o)
                          for (var n of __imports.pipMergeGroups.keys()) {
                            var i = t(n);
                            if (o === i && Math.abs(e.length - n.length) <= 6)
                              return n;
                            if (
                              (e.includes(n) || n.includes(e)) &&
                              Math.abs(e.length - n.length) <= 4
                            )
                              return n;
                          }
                      }
                      return e;
                    }

}
