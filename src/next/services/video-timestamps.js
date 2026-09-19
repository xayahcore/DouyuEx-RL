function* (__imports) {
yield {"ai": { get: () => ai, set: value => { ai = value; } },
"mountVideoTimestamps": { get: () => mountVideoTimestamps, set: value => { mountVideoTimestamps = value; } }};
let ei = 0,
  ti = 0,
  oi = 0,
  ni = {};
async function ii(t) {
  var o = await ri(t);
  for (let e = 0; e < o.data.supplementary_cards; e++) await ri(t);
}
function ai(e) {
  return new Promise((t) => {
    (0, __imports.GM_xmlhttpRequest)({
      method: "GET",
      url:
        "https://yuba.douyu.com/wbapi/web/group/myFollow?page=" +
        String(e) +
        "&limit=30",
      responseType: "json",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "dy-client": "pc",
        "dy-token": __imports.m,
      },
      onload: function (e) {
        t(e.response.data);
      },
    });
  });
}
function ri(e) {
  return new Promise((t) => {
    (0, __imports.GM_xmlhttpRequest)({
      method: "POST",
      url: "https://mapi-yuba.douyu.com/wb/v3/supplement",
      responseType: "json",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        client: "android",
        token: __imports.m,
      },
      data: "group_id=" + e,
      onload: function (e) {
        t(e.response);
      },
    });
  });
}
/* var P managed globally */ let ui = 0,
  gi = null,
  hi = null,
  fi = null,
  yi = 0,
  bi = "";
function mountVideoTimestamps(owner) {
  ui = 0;
  bi = '';
  owner.own(() => {
    for (const observer of [gi, fi, hi]) observer?.disconnect();
    gi = fi = hi = null;
    (0, __imports.clearTimeout)(yi);
    yi = 0;
    bi = '';
    ui = 0;
  });
  const poll = owner.interval(() => {
    const video = document.getElementsByTagName('demand-video')[0]?.shadowRoot?.getElementById('__video');
    const preview = videoTimestampPreview();
    const share = document.getElementsByTagName('demand-video-toolbar')[0]?.shadowRoot?.querySelector('share-hover');
    if (!video || !preview || !share) return;
    (0, __imports.clearInterval)(poll);
    const refresh = () => vi(owner);
    const render = () => {
      const seconds = Number(xi());
      wi(String((0, __imports.k)('yyyy-MM-dd hh:mm:ss', new Date(Number(ui + 1e3 * seconds)))) + '<br/>' + (0, __imports.J)(seconds));
    };
    refresh();
    gi = new MutationObserver(owner.guard(refresh));
    gi.observe(video, {attributes: true, childList: true, subtree: false});
    fi = new MutationObserver(owner.guard(records => {
      if (records.some(record => record.attributeName === 'hashid')) refresh();
    }));
    fi.observe(share, {attributes: true});
    hi = new MutationObserver(owner.guard(records => {
      for (const record of records) {
        if (record.attributeName === 'showtime') { render(); break; }
        if (record.attributeName === 'isshow') {
          (0, __imports.clearTimeout)(yi);
          yi = owner.timeout(render, 0);
          break;
        }
      }
    }));
    hi.observe(preview, {attributes: true, childList: true, subtree: false});
  }, 1000);
}
function videoTimestampPreview() {
  return document.getElementsByTagName('demand-video')[0]?.shadowRoot
    ?.getElementById('demandcontroller-bar')?.shadowRoot
    ?.querySelector('demand-video-controller-progress')?.shadowRoot
    ?.querySelector('demand-video-controller-preview');
}
function vi(owner) {
  var e = (() => {
    try {
      var e = document
        .getElementsByTagName("demand-video-toolbar")[0]
        .shadowRoot.querySelector("share-hover")
        .getAttribute("hashid");
      if (e) return e;
    } catch (e) {}
    return (e = String(window.location.pathname).split("/"))[e.length - 1];
  })();
  if (e) {
    let t = (bi = e);
    (0, __imports.fetch)("https://v.douyu.com/video/video/getVideoUrl?vid=" + e, {
      method: "GET",
      mode: "no-cors",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
      .then((e) => e.json())
      .then((e) => {
        !owner.disposed && t === bi &&
          ((e = (0, __imports.v)(e.data.viewthumb[0].url, "--", "/")),
          (ui = new Date(
            e.replace(
              /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/,
              "$1-$2-$3 $4:$5:$6",
            ),
          ).getTime()));
      })
      .catch((e) => {
        console.log("请求失败!", e);
      });
  }
}
function xi() {
  var e = videoTimestampPreview()?.getAttribute('showtime');
  return Number(e).toFixed(0);
}
function wi(e) {
  var t = videoTimestampPreview()?.shadowRoot?.querySelector('.Preview label');
  t &&
    ((t.style.position = "relative"),
    (t.style.bottom = "60px"),
    (t.style.backgroundColor = "rgba(0,0,0,0.4)"),
    (t.innerHTML = e));
}

}
