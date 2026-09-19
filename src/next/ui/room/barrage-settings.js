function* (__imports) {
yield {"mountBarrageSettings": { get: () => mountBarrageSettings, set: value => { mountBarrageSettings = value; } }};
// Room assembly section; dependencies are captured per mount, in original order.
function mountBarrageSettings(owner) {
    let e = owner.interval(() => {
      0 < document.getElementsByClassName("danmuTips-1ee820").length &&
        ((0, __imports.clearInterval)(e),
        (document.getElementsByClassName(
          "danmuTips-1ee820",
        )[0].parentElement.id = "Ex_BarragePanel"),
        new __imports.DomMutationSubscription("#Ex_BarragePanel", !0, (i) => {
          (0, __imports.Ie)(() => {
            let t = !1;
            if (0 < i.length) {
              for (let e = 0; e < i.length; e++)
                if ("attributes" == i[e].type) {
                  t = !0;
                  break;
                }
              var e, o, n;
              0 == t
                ? 0 < (n = i[0].addedNodes).length &&
                  "getElementsByClassName" in (n = n[0]) != 0 &&
                  ((o = n.getElementsByClassName("buttonGroup-de6b66")[0]),
                  (e = ""),
                  0 <
                    (n = n.getElementsByClassName("danmuAuthor-3d7b4a"))
                      .length) &&
                  ((e = n[0].innerText),
                  (0, __imports.Ce)(n[0], e),
                  (0, __imports.Le)(o),
                  (0, __imports.Ne)(o),
                  (0, __imports.Se)(o),
                  (0, __imports.Me)(o),
                  (0, __imports.Ae)(0, e))
                : (0 <
                    (n = document.getElementsByClassName(
                      "barragePanel__funcPanel",
                    )).length && n[0].remove(),
                  null !=
                    (o =
                      document.getElementsByClassName("danmudiv-32f498")[0]) &&
                    ((e = o.getElementsByClassName("buttonGroup-de6b66")[0]),
                    (n = ""),
                    0 <
                      (o = o.getElementsByClassName("danmuAuthor-3d7b4a"))
                        .length &&
                      ((n = o[0].innerText),
                      (0, __imports.Ce)(o[0], n),
                      (0, __imports.Le)(e),
                      (0, __imports.Ne)(e),
                      (0, __imports.Se)(e),
                      (0, __imports.Me)(e),
                      (0, __imports.Ae)(0, n)),
                    (0, __imports.Te)()));
            }
          });
        }, owner),
        new __imports.DomMutationSubscription("#Ex_BarragePanel", !1, (e) => {
          (0, __imports.Ie)(() => {
            (0, __imports.Te)();
          });
        }, owner));
    }, 1500);
    new __imports.DomMutationSubscription("#comment-dzjy-container", !1, (t) => {
      if (!(t.length <= 0 || t[0].addedNodes.length <= 0)) {
        {
          let e = document.createElement("div");
          e.style.display = "inline-block";
          t = document.getElementsByClassName("labelfisrt-407af4");
          0 !== t.length &&
            ((t = t[0].parentElement).appendChild(e),
            ((e = document.createElement("p")).className = "sugun-e3fbf6"),
            (e.innerText = "|"),
            t.appendChild(e),
            ((e = document.createElement("div")).className =
              "labelfisrt-407af4 thirdBtn-06cde5 fourBtn-0845d4"),
            (e.id = "barrage-panel-tip__+1"),
            (e.innerText = "+1"),
            t.appendChild(e));
        }
        (0, __imports.safeEl)("barrage-panel-tip__+1").onclick = () => {
          var e = document.getElementById("comment-higher-container");
          0 < e.getElementsByClassName("ex-image-danmaku").length
            ? (0, __imports.we)(
                e
                  .getElementsByClassName("text-879f3e")[0]
                  .innerHTML.replace(
                    /<a[^>]*><img\s+(?:.*?\s+)?src="(.*?)"[^>]*?\/?><\/a>/g,
                    (e, t) =>
                      `[DouyuEx图片${((e) => (e = BigInt(e)).toString(36))((t = (t = (t = t.split("/")).pop()).split("."))[0])}.${t[2]}]`,
                  ),
              )
            : (0, __imports.we)(e.innerText);
        };
      }
    }, owner);
  }

}
