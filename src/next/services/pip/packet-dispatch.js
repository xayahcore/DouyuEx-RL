function* (__imports) {
yield {"dispatchPipPacket": { get: () => dispatchPipPacket, set: value => { dispatchPipPacket = value; } }};
function dispatchPipPacket(e, r, t) {
            if (
              window.__pip_is_active__ &&
              !((0, __imports.isRepeatedPipPacket))(e)
            ) {
              var e = ((0, __imports.parsePipChatPacket))(e),
                o = r,
                n = t;
              if (
                e &&
                e.text &&
                !1 !== __imports.pipPreferences.danmakuVisible &&
                (!__imports.I || e.uid !== __imports.I)
              ) {
                var i = __imports.pipPreferences.mergeMode || "combo";
                if ("all" === i) (0, __imports.renderPipDanmaku)(e, o, n);
                else {
                  let t = Date.now();
                  var a = ((0, __imports.findPipMergeKey))(e.text),
                    a =
                      (__imports.pipMergeGroups.has(a) ||
                        __imports.pipMergeGroups.set(a, {
                          timestamps: [],
                          dom: null,
                          displayCount: 0,
                        }),
                      __imports.pipMergeGroups.get(a));
                  (a.timestamps.push(t),
                    "single" === i
                      ? 1 < a.timestamps.filter((e) => t - e <= 4e3).length ||
                        (0, __imports.renderPipDanmaku)(e, o, n)
                      : ((a.timestamps = a.timestamps.filter(
                          (e) => t - e <= 8e3,
                        )),
                        1 === (i = a.timestamps.length)
                          ? ((a.displayCount = 0), (0, __imports.renderPipDanmaku)(e, o, n))
                          : (a.displayCount = i),
                        (0, __imports.refreshPipCombos)(o)));
                }
              }
            }
          }

}
