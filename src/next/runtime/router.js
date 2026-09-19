function* (__imports) {
yield {"installNavigation": { get: () => installNavigation, set: value => { installNavigation = value; } },
"roomRouteLifetime": { get: () => roomRouteLifetime, set: value => { roomRouteLifetime = value; } },
"stopNavigation": { get: () => stopNavigation, set: value => { stopNavigation = value; } }};
let roomRouteLifetime = null;
let installedRoomHooks = false;
let lastRoomReadiness = null;
let navigationOwner = null;
function stopNavigation() {
  if (navigationOwner) navigationOwner.dispose();
  navigationOwner = null;
  if (roomRouteLifetime) roomRouteLifetime.dispose();
  roomRouteLifetime = null;
  (0, __imports.closeEnhancedPip)();
  (0, __imports.unmountRoom)();
}
function installNavigation() {
  if (navigationOwner && !navigationOwner.disposed) return navigationOwner;
  const owner = navigationOwner = (0, __imports.createRoomLifetime)();
  // History belongs to the page world, not the userscript sandbox's global.
  const page = typeof __imports.unsafeWindow !== 'undefined' ? __imports.unsafeWindow : window;
  let current;
  const navigate = owner.guard(() => {
    const url = String(page.location.href);
    const key = url.split('#')[0];
    if (key === current) return;
    current = key;
    routePage(url);
  });
  for (const name of ['pushState', 'replaceState']) {
    const history = page.history;
    if (!history) continue;
    const original = history[name];
    const descriptor = Object.getOwnPropertyDescriptor(history, name);
    function wrapped(...args) {
      const result = original.apply(this, args);
      navigate();
      return result;
    }
    history[name] = wrapped;
    owner.own(() => {
      if (history[name] !== wrapped) return;
      if (descriptor) Object.defineProperty(history, name, descriptor);
      else delete history[name];
    });
  }
  owner.listen(page, 'popstate', navigate);
  owner.listen(window, 'pagehide', () => {
    if (roomRouteLifetime) roomRouteLifetime.dispose();
    (0, __imports.closeEnhancedPip)();
    (0, __imports.unmountRoom)();
  });
  owner.listen(window, 'pageshow', event => {
    if (event.persisted) { current = undefined; navigate(); }
  });
  navigate();
  return owner;
}
function routePage(e) {
  if (roomRouteLifetime) roomRouteLifetime.dispose();
  roomRouteLifetime = null;
  (0, __imports.closeEnhancedPip)();
  (0, __imports.unmountRoom)();
  if (-1 !== String(e).indexOf("yuba.douyu.com"))
    if (-1 !== String(e).indexOf("?exRestore")) (0, __imports.wn)();
    else if (-1 !== String(e).indexOf("?exClean")) {
      let e = (0, __imports.v)(window.location.href, "domain=", "&");
      (0, __imports.ae)(() => {
        window.parent.postMessage("yubaCleanOver", decodeURIComponent(e));
      });
    } else {
      try {
        document.domain = "douyu.com";
      } catch (e) {}
      (0, __imports._n)();
    }
  else if (
    -1 !== String(e).indexOf("passport.douyu.com") &&
    -1 !== String(e).indexOf("exid=chun")
  ) {
    let e = (0, __imports.v)(window.location.href, "cmd=", "&"),
      t = (0, __imports.v)(window.location.href, "uid=", "&"),
      o = (0, __imports.v)(window.location.href, "domain=", "&");
    if ("clean" !== e) {
      var i = t;
      let e = JSON.parse((0, __imports.GM_getValue)("Ex_accountListPassport") || "{}"),
        o = [],
        n = [];
      (0, __imports.GM_cookie)("list", { path: "/" }, function (t) {
        if (null != t) {
          for (let e = 0; e < t.length; e++)
            ("LTP0" == t[e].name ? o : n).push(t[e]);
          ("" == i && (i = "null"),
            (e.global = null),
            (e.global = n),
            (e[i] = o),
            (e.update_time = String(new Date().getTime())),
            (0, __imports.GM_setValue)("Ex_accountListPassport", JSON.stringify(e)));
        }
      });
    }
    switch (e) {
      case "clean":
        (0, __imports.ae)(() => {
          window.parent.postMessage("cleanOver", decodeURIComponent(o));
        });
        break;
      case "switch":
        ((e, o) => {
          let n = JSON.parse((0, __imports.GM_getValue)("Ex_accountListPassport"))[e],
            i = 0;
          (0, __imports.GM_cookie)("list", { path: "/" }, function (t) {
            for (let e = 0; e < t.length; e++)
              (0, __imports.GM_cookie)("delete", { name: t[e].name }, function (e) {
                if (++i >= t.length) {
                  let t = 0;
                  for (let e = 0; e < n.length; e++)
                    (0, __imports.GM_cookie)(
                      "set",
                      {
                        name: n[e].name,
                        value: n[e].value,
                        domain: n[e].domain,
                        path: n[e].path,
                        secure: n[e].secure,
                        httpOnly: n[e].httpOnly,
                        sameSite: n[e].sameSite,
                        expirationDate: n[e].expirationDate,
                        hostOnly: n[e].hostOnly,
                      },
                      function (e) {
                        ++t >= n.length && o();
                      },
                    );
                }
              });
          });
        })(t, () => {
          window.parent.postMessage("switchOver", decodeURIComponent(o));
        });
        break;
      case "delete":
        ((e, t) => {
          var o = JSON.parse((0, __imports.GM_getValue)("Ex_accountListPassport") || "{}");
          (delete o[e],
            (0, __imports.GM_setValue)("Ex_accountListPassport", JSON.stringify(o)),
            t());
        })(t, () => {
          window.parent.postMessage("deleteOver", decodeURIComponent(o));
        });
    }
    return;
  } else if (-1 !== String(e).indexOf("msg.douyu.com"))
    if (-1 !== e.indexOf("?exClean")) {
      let e = (0, __imports.v)(window.location.href, "domain=", "&");
      (0, __imports.ae)(() => {
        window.parent.postMessage("msgCleanOver", decodeURIComponent(e));
      });
    } else
      "chun" ==
        ((e) => {
          var e = new RegExp("(^|&)" + e + "=([^&]*)(&|$)", "i");
          return !(window.location.hash.indexOf("?") < 0) &&
            null != (e = window.location.hash.split("?")[1].match(e))
            ? decodeURIComponent(e[2])
            : null;
        })("exid") && void 0;
  else if (-1 !== String(e).indexOf("v.douyu.com")) {
    if (-1 !== String(e).indexOf("?exClean")) {
      let e = (0, __imports.v)(window.location.href, "domain=", "&");
      (0, __imports.ae)(() => {
        window.parent.postMessage("videoCleanOver", decodeURIComponent(e));
      });
    } else if (
      -1 !== String(e).indexOf("show/") &&
      __imports.unsafeWindow.$DATA &&
      "ROOM" in __imports.unsafeWindow.$DATA
    ) {
      (0, __imports.y)();
      const routeOwner = roomRouteLifetime = (0, __imports.createRoomLifetime)();
      routeOwner.listen(window, 'pagehide', () => routeOwner.dispose());
      (0, __imports.mountVideoTimestamps)(routeOwner);
      ((0, __imports.Mi)(), (0, __imports.$e)(), (0, __imports.Xe)());
    }
  } else if (-1 !== String(e).indexOf("cz.douyu.com")) {
    if (-1 !== String(e).indexOf("?exClean")) {
      let e = (0, __imports.v)(window.location.href, "domain=", "&");
      (0, __imports.ae)(() => {
        window.parent.postMessage("czCleanOver", decodeURIComponent(e));
      });
    }
  } else if (-1 !== String(e).indexOf("getFansBadgeList")) {
    var t = new Date().getTime(),
      o = document.querySelectorAll(".fans-badge-list tr");
    if (!(o.length <= 1))
      for (let e = 1; e < o.length; e++) {
        var n = o[e],
          a = 1e3 * Number(n.getAttribute("data-fans-gbdgts")),
          r = (0, __imports.k)("yyyy-MM-dd hh:mm:ss", new Date(a)),
          a = Math.floor((t - a) / 864e5),
          l = 300 <= a ? "font-weight:600;color:red;" : "";
        n.getElementsByTagName("td")[1].innerHTML +=
          `

        已获取 <span style="${l}">${a}</span> 天<br/>

        ` + r;
      }
    return;
  } else if (-1 !== String(e).indexOf("exid=chun")) {
    (0, __imports.bn)();
    const routeOwner = roomRouteLifetime = (0, __imports.createRoomLifetime)();
    routeOwner.listen(window, 'pagehide', () => routeOwner.dispose());
    let t = routeOwner.interval(() => {
      const fullscreen = document.querySelector("div.wfs-2a8e83");
      const aside = document.querySelector("label.layout-Player-asidetoggleButton");
      const choices = document.querySelectorAll(".tip-e3420a > ul > li");
      if (!fullscreen || !aside || !choices.length) return;
      (0, __imports.clearInterval)(t);
      fullscreen.click();
      if (routeOwner.disposed) return;
      aside.click();
      if (routeOwner.disposed) return;
      choices[choices.length - 1].click();
    }, 1e3);
    return;
  } else if (
    -1 === String(e).indexOf("template/") &&
    -1 === String(e).indexOf("h5/")
  ) {
    document.domain = "douyu.com";
    if (!installedRoomHooks) {
      (0, __imports.installRoomHooks)();
      installedRoomHooks = true;
    }
    const routeUrl = new URL(String(e), window.location.href);
    const numericId = (routeUrl.pathname.match(/^\/(?:beta\/)?(\d+)\/?$/) || [])[1];
    const initialIdentity = (0, __imports.readRoomIdentity)();
    const previous = lastRoomReadiness;
    const routeOwner = roomRouteLifetime = (0, __imports.createRoomLifetime)();
    routeOwner.listen(window, 'pagehide', () => routeOwner.dispose());
    __imports.B = "";
    let pending = false;
    let pollCount = 0;
    const POLL_CEILING = 30;
    const ready = () => {
      const barrage = document.getElementsByClassName("Barrage-main")[0];
      const backpack = document.getElementsByClassName("BackpackButton")[0] || document.querySelector("#js-backpack-enter");
      if (!barrage || !backpack) return null;
      const identities = (0, __imports.readRoomIdentity)();
      const changedId = identities.find((id, index) => id &&
        id !== (previous ? previous.identities : initialIdentity)[index] && id !== previous?.roomId);
      const roomId = numericId || changedId ||
        (previous?.pathname === routeUrl.pathname && identities.includes(previous.roomId) && previous.roomId) ||
        (!previous && identities.find(Boolean));
      if (!roomId) return null;
      // Retained room controls alone do not establish readiness for another room.
      if (previous && previous.roomId !== roomId &&
          barrage === previous.barrage && backpack === previous.backpack &&
          !identities.some((id, index) => id === roomId && id !== previous.identities[index])) return null;
      return {roomId, barrage, backpack, identities, pathname: routeUrl.pathname};
    };
    const poll = routeOwner.interval(() => {
      if (++pollCount > POLL_CEILING) {
        (0, __imports.clearInterval)(poll);
        console.warn('[DouyuEx-RL] Room readiness polling timed out after ' + POLL_CEILING + 's');
        return;
      }
      const candidate = ready();
      if (!candidate || pending) return;
      pending = true;
      routeOwner.timeout(() => {
        pending = false;
        const current = ready();
        if (!current || current.roomId !== candidate.roomId ||
            current.barrage !== candidate.barrage || current.backpack !== candidate.backpack) return;
        (0, __imports.clearInterval)(poll);
        __imports.B = current.roomId;
        lastRoomReadiness = current;
        (0, __imports.y)();
        (0, __imports.mountRoom)();
        (0, __imports.startTaskHeartbeat)();
      }, 1500);
    }, 1e3);
  }
}

}
