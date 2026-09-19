function* (__imports) {
yield {"DomMutationSubscription": { get: () => DomMutationSubscription, set: value => { DomMutationSubscription = value; } },
"Dr": { get: () => Dr, set: value => { Dr = value; } },
"Lr": { get: () => Lr, set: value => { Lr = value; } },
"PointerGestureBinding": { get: () => PointerGestureBinding, set: value => { PointerGestureBinding = value; } }};
class Lr {
  constructor(e) {
    var t = {
      width: 1920,
      height: 1080,
      fontSize: 36,
      alpha: this._prefixInteger(Number(0).toString(16), 2),
      stayTime: 10,
      title: "Default",
    };
    ((this.options = {
      ...t,
      ...e,
      ...(e && e.alpha
        ? this._prefixInteger(this.options.alpha.toString(16), 2)
        : {}),
    }),
      (this.lines = 20),
      (this.lineBase = this.options.height / this.lines),
      (this.currentLine = 0),
      (this.diffTime = 1500));
  }
  generate(e) {
    var t = e.sort((e, t) => e.time - t.time);
    let o = this._getScriptInfo() + this._getV4Styles() + this._getEvents();
    for (let e = 0; e < t.length; e++) {
      (0 < e && t[e].time - t[e - 1].time <= this.diffTime
        ? this.currentLine++
        : (this.currentLine = 0),
        this.currentLine >= this.lines && (this.currentLine = 0));
      var n = t[e],
        i = Number(n.time) + 1e3 * Number(this.options.stayTime),
        a = this.lineBase * this.currentLine + this.options.fontSize,
        r = this.options.fontSize * n.txt.length;
      o += `Dialogue: 0,${(0, __imports.J)(Number(n.time) / 1e3)}.00,${(0, __imports.J)(i / 1e3)}.00,Color${n.color},,0,0,0,,{\\move(${this.options.width + r},${a},${-r},${a})}${n.txt}

`;
    }
    return o;
  }
  _prefixInteger(e, t) {
    return ((e = "" + e), Array(t + 1 - e.length).join("0") + e);
  }
  _getScriptInfo() {
    return `[Script Info]

; DouyuEx -By qianjiachun

; https://github.com/qianjiachun/douyuEx

ScriptType: v4.00+

Title: ${this.options.title}

PlayResX: ${this.options.width}

PlayResY: ${this.options.height}

`;
  }
  _getV4Styles() {
    return `

[V4+ Styles]

Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding

Style: Color0,黑体,${this.options.fontSize},&H${this.options.alpha}FFFFFF,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color7,黑体,${this.options.fontSize},&H${this.options.alpha}5456FF,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color8,黑体,${this.options.fontSize},&H${this.options.alpha}2375FF,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color9,黑体,${this.options.fontSize},&H${this.options.alpha}B369FE,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color10,黑体,${this.options.fontSize},&H${this.options.alpha}00BCFF,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color11,黑体,${this.options.fontSize},&H${this.options.alpha}46C978,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color12,黑体,${this.options.fontSize},&H${this.options.alpha}FF7F9E,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color13,黑体,${this.options.fontSize},&H${this.options.alpha}FF9B3D,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

`;
  }
  _getEvents() {
    return `

[Events]

Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text

`;
  }
}
class PointerGestureBinding {
  constructor(e, owner) {
    const previousDown = e.onmousedown, previousUp = e.onmouseup;
    ((this.func_click = null),
      (this.func_dbClick = null),
      (this.func_longClick = null));
    let t = !1,
      o,
      n = 0,
      i;
    ((e.onmousedown = (e) => {
      0 === e.button &&
        ((t = !1),
        (o = (0, __imports.setTimeout)(() => {
          ((t = !0), null !== this.func_longClick && this.func_longClick(e));
        }, 700)));
    }),
      (e.onmouseup = (e) => {
        0 === e.button &&
          0 == t &&
          ((0, __imports.clearTimeout)(o),
          2 <= ++n
            ? ((0, __imports.clearTimeout)(i),
              (n = 0),
              null !== this.func_dbClick && this.func_dbClick(e))
            : (i = (0, __imports.setTimeout)(() => {
                ((n = 0), null !== this.func_click && this.func_click(e));
              }, 0)));
      }));
    const down = e.onmousedown, up = e.onmouseup;
    if (owner) owner.own(() => {
      (0, __imports.clearTimeout)(o); (0, __imports.clearTimeout)(i);
      this.func_click = this.func_dbClick = this.func_longClick = null;
      if (e.onmousedown === down) e.onmousedown = previousDown;
      if (e.onmouseup === up) e.onmouseup = previousUp;
    });
  }
  click(e) {
    this.func_click = e;
  }
  dbClick(e) {
    this.func_dbClick = e;
  }
  longClick(e) {
    this.func_longClick = e;
  }
}
class DomMutationSubscription {
  constructor(e, t, o, owner) {
    if (owner?.disposed) return;
    if (owner) {
      o = owner.guard(o);
      owner.own(() => this.closeHook());
    }
    ((this.selector = e), (this.isSubtree = t));
    e = document.querySelector(this.selector);
    null != e &&
      ((t = new MutationObserver(function (e) {
        o(e);
      })),
      (this.observer = t),
      this.observer.observe(e, {
        attributes: !0,
        childList: !0,
        subtree: this.isSubtree,
      }));
  }
  closeHook() {
    this.observer && (this.observer.disconnect(), (this.observer = null));
  }
}
class Dr {
  constructor(e) {
    ((this.pointId = e), (this.decoder = new TextDecoder()));
  }
  getSign() {
    var e = parseInt(new Date().getTime() / 1e3, 10);
    return __imports.unsafeWindow[this.d539fa2cf7732d2a(256042, "9f4f419501570ad13334")](
      this.pointId,
      "10000000000000000000000000001501",
      e,
    );
  }
  d539fa2cf7732d2a(e, t) {
    for (
      var o = (e = CryptoJS.MM(e.toString()).toString())[0].charCodeAt(0),
        n = e[16].charCodeAt(0),
        i = [],
        a = 0;
      a < 4;
      a++
    )
      ((i[a] = (o << 24) | (o << 16) | (o << 8) | o),
        (i[a + 4] = (n << 24) | (n << 16) | (n << 8) | n));
    for (
      var e = Math.floor(t.length / 16) % 4,
        r = [],
        l = t.length % 8,
        s = Math.floor(t.length / 8),
        a = 0;
      a < s;
      a++
    )
      r[a] =
        (255 & parseInt(t.substr(8 * a, 2), 16)) |
        ((parseInt(t.substr(8 * a + 2, 2), 16) << 8) & 65280) |
        ((parseInt(t.substr(8 * a + 4, 2), 16) << 24) >>> 8) |
        (parseInt(t.substr(8 * a + 6, 2), 16) << 24);
    var d =
        0 == e ? e86500e2(r, i) : 1 == e ? this.c30070a4(r, i) : d831eb20(r, i),
      c = [];
    for (a = 0; a < d.length; a++) {
      var p = 255 & d[a],
        m = (d[a] >>> 8) & 255,
        u = (d[a] >>> 16) & 255,
        g = (d[a] >>> 24) & 255;
      (p && c.push(p), m && c.push(m), u && c.push(u), g && c.push(g));
    }
    var h = Math.floor(l / 2);
    for (a = 0; a < h; a++)
      c.push(255 & parseInt(t.substr(8 * s + 2 * a, 2), 16));
    return this.decoder.decode(new Uint8Array(c));
  }
  c30070a4(e, t) {
    for (var o = Math.floor(e.length / 2), n = e.slice(0), i = 0; i < o; i++) {
      var a = this.f5a40d76(
        e.slice(2 * i, 2 * i + 2),
        32,
        t.slice((4 * i) % 8, ((4 * i) % 8) + 4),
      );
      ((n[2 * i + 0] = a[0]), (n[2 * i + 1] = a[1]));
    }
    return n;
  }
  f5a40d76(e, t, o) {
    for (var n = 0; n < e.length; n += 2) {
      for (var i = e[n], a = e[n + 1], r = 2654435769 * t, l = 0; l < t; l++)
        i -=
          ((((a -= (((i << 4) ^ (i >>> 5)) + i) ^ (r + o[(r >>> 11) & 3])) <<
            4) ^
            (a >>> 5)) +
            a) ^
          ((r -= 2654435769) + o[3 & r]);
      ((e[n] = i), (e[n + 1] = a));
    }
    return e;
  }
}

}
