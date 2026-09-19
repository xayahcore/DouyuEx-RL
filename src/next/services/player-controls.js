function* (__imports) {
yield {"$e": { get: () => $e, set: value => { $e = value; } },
"Xe": { get: () => Xe, set: value => { Xe = value; } }};
// Each VOD action captures its route and video; failed pages never become partial exports.
function createVodAction(owner = __imports.roomRouteLifetime) {
  const toolbar = document.getElementsByTagName("demand-video-toolbar")[0];
  const share = toolbar?.shadowRoot?.querySelector("share-hover");
  const video = share?.getAttribute("hashid");
  const controller = new AbortController();
  const current = () => !owner?.disposed && toolbar?.isConnected &&
    document.getElementsByTagName("demand-video-toolbar")[0] === toolbar &&
    share?.getAttribute("hashid") === video;
  owner?.own(() => controller.abort());
  return { signal: controller.signal, current, check() {
    if (!current()) { controller.abort(); throw new Error("VOD action expired"); }
  } };
}
function vodAction(callback, label, owner) {
  return async () => {
    const job = createVodAction(owner);
    try { job.check(); await callback(job); }
    catch (error) {
      if (job.current()) {
        if (label) label.innerText = "下载失败";
        (0, __imports.T)(error.message || "请求失败，请重试", "error");
      }
    }
  };
}
let Qe = null,
  Je = !1,
  Ze = "ex-barrageLine";
function Xe(owner = __imports.roomRouteLifetime) {
  owner.own(() => { Je = !1; vodHeatmapGeneration++; });
  let n = owner.interval(() => {
    var e = document
        .getElementsByTagName("demand-video")[0]
        .shadowRoot.getElementById("demandcontroller-bar")
        .shadowRoot.querySelector("demand-video-controller-progress")
        .shadowRoot.querySelector(".ProgressBar-Sign"),
      t = document.getElementsByTagName("demand-video-toolbar")[0]?.shadowRoot,
      o = document.getElementsByTagName("demand-video-toolbar")[0]?.shadowRoot;
    e &&
      t &&
      o &&
      ((0, __imports.clearInterval)(n),
      ((e = document.createElement("style")).innerHTML =
        `.no-hasLR #ex-barrageLine {

        display: none !important;

    }`),
      document
        .getElementsByTagName("demand-video")[0]
        .shadowRoot.getElementById("demandcontroller-bar")
        .shadowRoot.querySelector("demand-video-controller-progress")
        .shadowRoot.append(e),
      Ke(owner),
      (t = o.querySelector("share-hover")),
      (Qe = new MutationObserver(owner.guard(function (e) {
        Ke(owner);
      }))).observe(t, { attributes: !0, childList: !0, subtree: !1 }),
      ((observer) => owner.own(() => observer.disconnect()))(Qe));
  }, 1e3);
}
let vodHeatmapGeneration = 0;
async function Ke(owner = __imports.roomRouteLifetime) {
  if (!Je) {
    const job = createVodAction(owner), generation = ++vodHeatmapGeneration;
    try {
    job.check();
    ((Je = !0),
      owner.timeout(() => {
        Je = !1;
      }, 1e3),
      (0, __imports.T)("弹幕高能进度条加载中，请耐心等待", "info"));
    var o = document
        .getElementsByTagName("demand-video")[0]
        .shadowRoot.getElementById("demandcontroller-bar")
        .shadowRoot.querySelector(
          "demand-video-controller-progress",
        ).shadowRoot,
      n = o.querySelector(".ProgressBar"),
      o = o.querySelector("#" + Ze),
      i =
        (o && o.remove(),
        document
          .getElementsByTagName("demand-video-toolbar")[0]
          .shadowRoot.querySelector("share-hover")
          .getAttribute("hashid")),
      o = document
        .getElementsByTagName("demand-video")[0]
        .shadowRoot.getElementById("demandcontroller-bar")
        .shadowRoot.querySelector("#time-label")
        .innerText.split("/");
    if (!(o.length <= 0)) {
      var a =
          ((e) => {
            let t = 0;
            return (
              1 === (e = e.split(":")).length
                ? (t = Number(e[0]))
                : 2 === e.length
                  ? (t = 60 * Number(e[0]) + Number(e[1]))
                  : 3 === e.length &&
                    (t =
                      3600 * Number(e[0]) + 60 * Number(e[1]) + Number(e[2])),
              1e3 * t
            );
          })(o[1]) / 99,
        r = new Array(100).fill(0, 0, 100);
      const pages = new Set();
      let e = 0;
      do {
        if (pages.has(String(e))) throw new Error("弹幕分页重复");
        pages.add(String(e));
        var l = await (0, __imports.Ye)(i, e, job.signal);
        job.check();
        if (generation !== vodHeatmapGeneration) return;
        if (((e = l.data.pre), l.data.list))
          for (let e = 0; e < l.data.list.length; e++) {
            var s = l.data.list[e];
            r[Math.floor(s.tl / a)]++;
          }
      } while (0 <= e);
      var d = 1e3 / r.length,
        c = Math.max(...r) / 100,
        p = [];
      for (let e = 0; e < r.length; e++) {
        var m = r[e],
          u = e * d;
        p.push([u, m / c]);
      }
      let t = "";
      for (let e = 0; e < p.length - 1; e++) {
        var [g, h] = p[e],
          [f, y] = p[e + 1];
        t =
          t +
          "C " +
          (g +
            ` ${80 - (h + y) / 2}, ${f} ${80 - (h + y) / 2}, ${f} ${80 - y} `);
      }
      var o = "M 0 100 L 0 80 " + (t += "L 1000 100 Z"),
        b = `

    <svg preserveAspectRatio="none" width="100%" height="100%" viewBox="0 0 1000 100" >

        <path fill="rgba(255,255,255,0.3)" d="${o}" />

    </svg>`,
        o =
          (-1 !== o.indexOf("NaN") &&
            (console.log(o), (0, __imports.T)("弹幕高能进度条加载失败", "error")),
          document.createElement("div"));
      ((o.id = Ze),
        (o.style =
          "position:absolute;width:100%;height:30px;bottom:0px;pointer-events:none;cursor: default;"),
        (o.innerHTML = b),
        n.insertBefore(o, n.childNodes[0]));
    }
    } catch (error) {
      if (job.current() && generation === vodHeatmapGeneration) (0, __imports.T)(error.message || "弹幕高能进度条加载失败", "error");
    } finally {
      if (generation === vodHeatmapGeneration) Je = !1;
    }
  }
}
function $e(owner = __imports.roomRouteLifetime) {
  let o = owner.interval(() => {
    var e,
      t = document.getElementsByTagName("demand-video-toolbar")[0]?.shadowRoot;
    if (t) {
      (0, __imports.clearInterval)(o);
      var t = t.querySelector(".ToolBar-positiveUl");
      (((e = document.createElement("style")).innerHTML = `

    #btn-download:hover .download__panel {

        display: block;

    }

    .download__panel {

        width:150px;

        position:absolute;

        text-align: center;

        cursor: default;

        margin-top: 29px;

        margin-left: -38px;

        box-shadow: 0px 3px 10px 0px;

        display: none;

        background: white;

    }

    .download__item {

        height: 30px;

        line-height: 30px;

        width: 100%;

        cursor: pointer;

    }

    .download__item:hover {

        color: rgb(255,119,0)

    }

    `),
        document
          .getElementsByTagName("demand-video-toolbar")[0]
          .shadowRoot.appendChild(e),
        (e = t),
        ((t = document.createElement("li")).title = "下载视频"),
        (t.innerHTML = `

    <div class="download__panel">

        <div class="download__item" id="download__default" title="文件超过2GB时可能会下载失败">

            <span class="ToolBar-iconText">浏览器下载</span>

        </div>

        <div class="download__item" id="download__copy" title="可将链接填至第三方下载器中下载">

            <span class="ToolBar-iconText">复制m3u8链接</span>

        </div>

        <div class="download__item" id="download__barrage" title="下载弹幕(.xlsx)">

            <span class="ToolBar-iconText">下载弹幕(.xlsx)</span>

        </div>

        <div class="download__item" id="download__barrageass" title="下载弹幕(.ass)">

            <span class="ToolBar-iconText">下载弹幕(.ass)</span>

        </div>

    </div>

    <span class="ToolBar-icon ">

        <svg t="1634113402576" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7734" width="28" height="28"><path d="M761.98 413.12c0.25-4.4 0.39-8.82 0.39-13.28 0-127.18-102.84-230.28-229.71-230.28s-229.71 103.1-229.71 230.28c0 0.67 0.02 1.33 0.03 2a213.156 213.156 0 0 0-38.91-3.58c-117.2 0-212.21 95.25-212.21 212.74 0 117.49 95.01 212.74 212.21 212.74 2.94 0 5.86-0.08 8.77-0.2 2.54 0.13 5.09 0.2 7.66 0.2h467.35c2.82 0 5.61-0.09 8.39-0.24 108.96-5.16 195.72-95.13 195.72-205.36 0.01-108.3-83.73-197.04-189.98-205.02zM616.33 584.24l-90.86 93.93c-0.78 1.11-1.66 2.17-2.63 3.17-3.95 4.09-8.9 6.62-14.09 7.61-8.34 1.77-17.38-0.51-23.97-6.89a25.975 25.975 0 0 1-3.16-3.68l-93.5-90.45c-10.53-10.19-10.81-26.99-0.62-37.52 10.19-10.53 26.99-10.81 37.52-0.62l45.09 43.62c0-0.06-0.01-0.12-0.01-0.18l-2.43-146.62c-0.3-17.83 13.92-32.52 31.75-32.82 17.83-0.3 32.52 13.92 32.82 31.75l2.43 146.63v0.17l43.52-44.99c10.19-10.53 26.99-10.81 37.52-0.62 10.53 10.17 10.81 26.97 0.62 37.51z" p-id="7735" fill="#515151"></path></svg>

    </span>

    <span class="ToolBar-iconText" id="download-text">下载</span>

    `),
        (t.id = "btn-download"),
        e.appendChild(t));
      {
        let a = __imports.unsafeWindow.$DATA,
          r = document
            .getElementsByTagName("demand-video-toolbar")[0]
            .shadowRoot.querySelector("#download-text");
        (document
          .getElementsByTagName("demand-video-toolbar")[0]
          .shadowRoot.querySelector(".download__panel"),
          document
            .getElementsByTagName("demand-video-toolbar")[0]
            .shadowRoot.querySelector("#btn-download")
            .addEventListener("click", () => {
              "下载完成" === r.innerText && (0, __imports.T)("请刷新页面后再下载", "warning");
            }),
          document
            .getElementsByTagName("demand-video-toolbar")[0]
            .shadowRoot.querySelector("#download__default")
            .addEventListener("click", vodAction(async (job) => {
              var o = document
                  .getElementsByTagName("demand-video-toolbar")[0]
                  .shadowRoot.querySelector("share-hover")
                  .getAttribute("hashid"),
                n = a.ROOM.vid;
              if (o !== n) (0, __imports.T)("视频内容已改变，请刷新网页后重试", "error");
              else {
                (0, __imports.T)("开始下载视频...当视频超过2GB时可能会下载失败", "info");
                o = new __imports.jr();
                let e = new __imports.Dr(a.ROOM.point_id);
                var i = e.getSign(),
                  n = ((e = null), await (0, __imports.We)(n, i, job.signal));
                job.check();
                let t = "";
                "" !==
                (t =
                  "super" in n.data.thumb_video
                    ? n.data.thumb_video.super.url
                    : "high" in n.data.thumb_video
                      ? n.data.thumb_video.high.url
                      : "normal" in n.data.thumb_video
                        ? n.data.thumb_video.normal.url
                        : 0 < (i = Object.keys(n.data.thumb_video)).length
                          ? n.data.thumb_video[i[0]].url
                          : "")
                  ? ((handle) => {
                      // jr.start() returns the abort handle, not the jr instance.
                      // Its abort only takes effect after the playlist creates a batch.
                      owner.own(() => handle.abort());
                      return handle;
                    })(o.start(t, { filename: a.ROOM.name + ".mp4" }))
                      .on("progress", (e) => {
                        if (!job.current()) return;
                        r.innerText = Number(e.percentage).toFixed(2) + "%";
                      })
                      .on("finished", (e) => {
                        if (!job.current()) return;
                        ((r.innerText = "下载完成"),
                          (0, __imports.T)("视频下载完成", "success"));
                      })
                      .on("error", (e) => {
                        if (!job.current()) return;
                        ((r.innerText = "下载失败"), (0, __imports.T)(e, "error"));
                      })
                      .on("aborted", () => {
                        if (!job.current()) return;
                        r.innerText = "下载中止";
                      })
                  : (0, __imports.T)("获取m3u8链接失败", "error");
              }
            }, r, owner)),
          document
            .getElementsByTagName("demand-video-toolbar")[0]
            .shadowRoot.querySelector("#download__copy")
            .addEventListener("click", vodAction(async (job) => {
              var o = document
                  .getElementsByTagName("demand-video-toolbar")[0]
                  .shadowRoot.querySelector("share-hover")
                  .getAttribute("hashid"),
                n = a.ROOM.vid;
              if (o !== n) (0, __imports.T)("视频内容已改变，请刷新网页后重试", "error");
              else {
                (0, __imports.T)("正在获取m3u8链接...", "info");
                let e = new __imports.Dr(a.ROOM.point_id);
                var o = e.getSign(),
                  n = ((e = null), await (0, __imports.We)(n, o, job.signal));
                job.check();
                let t = "";
                "" !==
                (t =
                  "super" in n.data.thumb_video
                    ? n.data.thumb_video.super.url
                    : "high" in n.data.thumb_video
                      ? n.data.thumb_video.high.url
                      : "normal" in n.data.thumb_video
                        ? n.data.thumb_video.normal.url
                        : 0 < (o = Object.keys(n.data.thumb_video)).length
                          ? n.data.thumb_video[o[0]].url
                          : "")
                  ? ((0, __imports.GM_setClipboard)(t),
                    (0, __imports.T)("复制成功，可将链接复制到第三方下载器中下载", "success"))
                  : (0, __imports.T)("获取m3u8链接失败", "error");
              }
            }, r, owner)),
          document
            .getElementsByTagName("demand-video-toolbar")[0]
            .shadowRoot.querySelector("#download__barrage")
            .addEventListener("click", vodAction(async (job) => {
              var e = document
                  .getElementsByTagName("demand-video-title")[0]
                  .shadowRoot.querySelector(".Title-Main").innerText,
                t = document
                  .getElementsByTagName("demand-video-toolbar")[0]
                  .shadowRoot.querySelector("share-hover")
                  .getAttribute("hashid");
              (0, __imports.T)("正在获取弹幕数据，请勿切换页面...", "info");
              const pages = new Set();
              let o = 0;
              var n = [];
              do {
                if (pages.has(String(o))) throw new Error("弹幕分页重复");
                pages.add(String(o));
                var i = await (0, __imports.Ye)(t, o, job.signal);
                job.check();
                o = i.data.pre;
                for (let e = 0; e < i.data.list.length; e++) {
                  var a = i.data.list[e];
                  n.push([
                    a.vid,
                    t,
                    a.uid,
                    a.nn,
                    a.ctt,
                    (0, __imports.J)(a.tl / 1e3),
                    (0, __imports.k)("yyyy-MM-dd hh:mm:ss", new Date(1e3 * a.sts)),
                  ]);
                }
              } while (0 <= o);
              (0, __imports.l)(
                ["vid", "hashid", "uid", "昵称", "弹幕", "时间", "发送时间"],
                n,
                `【${e}】弹幕数据.xlsx`,
              );
            }, r, owner)),
          document
            .getElementsByTagName("demand-video-toolbar")[0]
            .shadowRoot.querySelector("#download__barrageass")
            .addEventListener("click", vodAction(async (job) => {
              var e = document
                  .getElementsByTagName("demand-video-title")[0]
                  .shadowRoot.querySelector(".Title-Main").innerText,
                t = document
                  .getElementsByTagName("demand-video-toolbar")[0]
                  .shadowRoot.querySelector("share-hover")
                  .getAttribute("hashid");
              (0, __imports.T)("正在获取弹幕数据，请勿切换页面...", "info");
              const pages = new Set();
              let o = 0;
              var n = new __imports.Lr({ title: e }),
                i = [];
              do {
                if (pages.has(String(o))) throw new Error("弹幕分页重复");
                pages.add(String(o));
                var a = await (0, __imports.Ye)(t, o, job.signal);
                job.check();
                o = a.data.pre;
                for (let e = 0; e < a.data.list.length; e++) {
                  var r = a.data.list[e];
                  i.push({ time: Number(r.tl), txt: r.ctt, color: r.col });
                }
              } while (0 <= o);
              var l,
                s,
                d,
                n = n.generate(i);
              ((e = e + ".ass"),
                (l = n),
                (s =
                  __imports.unsafeWindow.URL || __imports.unsafeWindow.webkitURL || __imports.unsafeWindow),
                (l = new Blob([n])),
                ((n = document.createElementNS(
                  "http://www.w3.org/1999/xhtml",
                  "a",
                )).href = s.createObjectURL(l)),
                (n.download = e),
                (s = document.createEvent("MouseEvents")).initMouseEvent(
                  "click",
                  !0,
                  !1,
                  __imports.unsafeWindow,
                  0,
                  0,
                  0,
                  0,
                  0,
                  !1,
                  !1,
                  !1,
                  !1,
                  0,
                  null,
                ),
                n.dispatchEvent(s),
                (d = n.href) &&
                  0 === d.indexOf("blob:") &&
                  (0, __imports.setTimeout)(function () {
                    try {
                      URL.revokeObjectURL(d);
                    } catch (e) {}
                  }, 1500));
            }, r, owner)));
      }
    } else;
  }, 1e3);
}

}
