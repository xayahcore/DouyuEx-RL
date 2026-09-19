function* (__imports) {
yield {"mountDanmakuSearch": { get: () => mountDanmakuSearch, set: value => { mountDanmakuSearch = value; } }};
// Room assembly section; dependencies are captured per mount, in original order.
function mountDanmakuSearch(owner) {
    {
      let e = owner.interval(() => {
        void 0 !== document.getElementsByClassName("ChatBarrageCollect")[0] &&
          ((0, __imports.clearInterval)(e),
          new __imports.DomMutationSubscription(".ChatBarrageCollect", !1, (e) => {
            var t,
              o = document.getElementsByClassName(
                "ChatBarrageCollectPop-title",
              );
            o
              ? 0 !== o.length &&
                (((t = document.createElement("input")).id =
                  "ex-danmaku-collect-search"),
                (t.placeholder = "搜索弹幕"),
                (t.style.marginLeft = "6px"),
                o[0].appendChild(t),
                owner.listen(t, "input", __imports.Ve))
              : document
                  .getElementById("ex-danmaku-collect-search")
                  .removeEventListener("input", __imports.Ve);
          }, owner));
      }, 1e3);
    }
    let t = document.getElementsByClassName("ChatSend-txt")[0],
      o = document.getElementsByClassName("ChatBarrageCollect")[0];
    (t &&
      owner.listen(t, "keyup", () => {
        var e = ("string" == typeof t.value ? t.value : t.innerText).length;
        o.style.display = 25 < e ? "none" : "";
      }),
      (0, __imports.safeBind)(".ChatSend-button", "click", () => {
        o.style.display = "";
      }, owner),
      (0, __imports.Qr)((e, t) => {
        if (e.includes("bulletscreen/query"))
          return (
            (e = JSON.parse(t)).data.list.unshift(
              ...(0, __imports.qe)().map((e) => ({ content: e.content, type: 2, id: e.id })),
            ),
            JSON.stringify(e)
          );
      }),
      (0, __imports.Qr)((e, t, o) => {
        if (e.includes("bulletscreen/add"))
          return 0 == (e = JSON.parse(t)).error
            ? t
            : ((t = JSON.parse(o).content),
              (o = t),
              (t = (0, __imports.qe)()).unshift({ content: o, id: new Date().getTime() }),
              __imports.localStorage.setItem("ExSave_DanmakuCollect", JSON.stringify(t)),
              (e.msg =
                "收藏成功，云收藏已达上限，将收藏至本地（由DouyuEx插件实现无限收藏）"),
              document.querySelector(".ChatBarrageCollect-tip").click(),
              document.querySelector(".ChatBarrageCollect-tip").click(),
              JSON.stringify(e));
      }),
      (0, __imports.Qr)((e, t, o) => {
        var n;
        e.includes("bulletscreen/del") &&
          ((e = JSON.parse(o).id),
          (n = e),
          (o = (0, __imports.qe)()),
          __imports.localStorage.setItem(
            "ExSave_DanmakuCollect",
            JSON.stringify(o.filter((e) => e.id !== n)),
          ));
      }));
  }

}
