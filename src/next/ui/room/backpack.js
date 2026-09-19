function* (__imports) {
yield {"mountBackpackControls": { get: () => mountBackpackControls, set: value => { mountBackpackControls = value; } }};
// Room assembly section; dependencies are captured per mount, in original order.
function mountBackpackControls(owner) {
    let o = (0, __imports.E)([".BackpackButton", "#js-backpack-enter"]);
    o &&
      owner.listen(o, "click", function () {
        (owner.timeout(() => {
          __imports.de && (__imports.de.closeHook(), (__imports.de = null));
          let t = document.querySelectorAll(".ToolbarBackpack-giftItem").length;
          __imports.de = new __imports.DomMutationSubscription(".BackpackExpandPanel-giftListWrap", !0, (e) => {
            t !=
              document.querySelectorAll(".ToolbarBackpack-giftItem").length &&
              (o.click(), o.click());
          }, owner);
        }, 500),
          (0, __imports.clearTimeout)(__imports.se),
          (__imports.se = owner.timeout(() => {
            let p = !!document.getElementsByClassName("BackpackExpandPanel")[0];
            (0, __imports.E)([".Backpack.JS_Backpack", ".BackpackExpandPanel"]) &&
              (0, __imports.pt)(__imports.B, (n) => {
                var i = n.data.list.length;
                if (0 < i) {
                  let t = 0,
                    o = 0;
                  for (let e = 0; e < i; e++) {
                    var a = ((e) => {
                        for (var t of e) {
                          let e = [];
                          if (
                            0 <
                            (e =
                              "string" == typeof t
                                ? document.querySelectorAll(t)
                                : t).length
                          )
                            return e;
                        }
                        return [];
                      })([".Backpack-prop", ".ToolbarBackpack-giftItem"])[e],
                      r = n.data.list[e].isValuable,
                      l = n.data.list[e].expiry,
                      s = n.data.list[e].price,
                      d = n.data.list[e].intimate,
                      c = n.data.list[e].count,
                      r =
                        ("1" == r && (t += Number(s) * Number(c)),
                        (o += Number(d) * Number(c)),
                        document.createElement("div"));
                    ((r.className = "bag-info"),
                      p && ((r.style.left = "8px"), (r.style.bottom = "auto")),
                      (r.innerHTML = l - 1),
                      a.insertBefore(r, a.childNodes[0]));
                  }
                  var e = (0, __imports.E)([
                    ".BackpackHeader-extInfo",
                    ".BackpackExpandPanel-backpackHeader",
                  ]);
                  (p
                    ? (e.innerHTML =
                        e.innerHTML +
                        `<span style="width: 100%;display: flex;justify-content: space-between;align-items: center;flex: 1;margin-left: 12px;">

                                <span>

                                    <span>总价值:</span>

                                    <span>￥${String(Number(t / 100).toFixed(2))}</span>

                                    <span>总亲密度:</span>

                                    <span>${String(o)}</span>

                                </span>

                                <span class="bag-button" id="Backpack__clearbag" style="background: rgb(70, 171, 255) !important;color: white !important;">清空背包</span>

                            </span>`)
                    : (e.innerHTML =
                        '<span style="float: left">总价值：' +
                        String(Number(t / 100).toFixed(2)) +
                        " 总亲密度：" +
                        String(o) +
                        '<span class="bag-button" id="Backpack__clearbag">清空背包</span></span>' +
                        e.innerHTML),
                    (0, __imports.safeBind)("#Backpack__clearbag", "click", () => {
                      1 == confirm("确认清空？") &&
                        ((0, __imports.T)("【清空背包】执行中...", "info"),
                        (0, __imports.pt)(__imports.B, (e) => {
                          (async (n, i) => {
                            var t = n.data.list.length;
                            if (0 < t) {
                              for (let e = 0; e < t; e++) {
                                let t = n.data.list[e].id,
                                  o = n.data.list[e].count;
                                if (
                                  0 <
                                  Object.keys(n.data.list[e].batchInfo).length
                                )
                                  await (0, __imports.b)(100).then(() => {
                                    (0, __imports.Ut)(t, o, i);
                                  });
                                else
                                  for (let e = 0; e < o; e++)
                                    await (0, __imports.b)(100).then(() => {
                                      (0, __imports.Ut)(t, 1, i);
                                    });
                              }
                              (0, __imports.T)("【清空背包】执行完毕！", "success");
                            } else (0, __imports.T)("背包礼物为空", "error");
                          })(e, __imports.B);
                        }));
                    }, owner));
                }
              });
          }, 500)));
      });
  }

}
