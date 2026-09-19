function* (__imports) {
yield {"nl": { get: () => nl, set: value => { nl = value; } }};
class nl {
  constructor(e, t) {
    "WebSocket" in window &&
      ((this.timer = 0),
      (this.rid = e),
      (this.msgHandler = t),
      (this.reconnectCount = 0),
      (this.maxReconnect = 10),
      (this.closed = !1),
      this.connect());
  }
  connect() {
    if (this.closed) return;
    ((this.ws = new WebSocket(
      "wss://danmuproxy.douyu.com:850" + String((0, __imports.a)(2, 5)),
    )),
      (this.ws.onopen = () => {
        if (this.closed) return;
        ((this.reconnectCount = 0),
          this.ws.send((0, __imports.ol)("type@=loginreq/roomid@=" + this.rid)),
          this.ws.send((0, __imports.ol)("type@=joingroup/rid@=" + this.rid + "/gid@=-9999/")),
          (this.timer = (0, __imports.setInterval)(() => {
            this.ws.send((0, __imports.ol)("type@=mrkl/"));
          }, 4e4)));
      }),
      (this.ws.onerror = () => {
        if (!this.closed && this.ws)
          try {
            this.ws.close();
          } catch (e) {}
      }),
      (this.ws.onmessage = (t) => {
        if (!this.closed) {
          let e = new FileReader();
          ((e.onload = () => {
            if (!this.closed) {
              var t = String(e.result).split("\0");
              e = null;
              for (let e = 0; e < t.length; e++)
                12 < t[e].length && this.msgHandler(t[e]);
            }
          }),
            e.readAsText(t.data));
        }
      }),
      (this.ws.onclose = () => {
        ((0, __imports.clearInterval)(this.timer),
          (this.timer = 0),
          (this.ws = null),
          this.closed || this.reconnect());
      }));
  }
  reconnect() {
    var e;
    this.closed ||
      this.reconnectCount >= this.maxReconnect ||
      (this.reconnectCount++,
      (e = Math.min(3e3 * Math.pow(1.5, this.reconnectCount - 1), 6e4)),
      this.reconnectTimer = (0, __imports.setTimeout)(() => {
        this.closed || this.connect();
      }, e));
  }
  close() {
    (0, __imports.clearTimeout)(this.reconnectTimer);
    this.reconnectTimer = null;
    if (
      !this.closed &&
      ((this.closed = !0), (0, __imports.clearInterval)(this.timer), (this.timer = 0), this.ws)
    ) {
      var e = this.ws;
      ((this.ws = null),
        (e.onclose = null),
        (e.onopen = null),
        (e.onerror = null),
        (e.onmessage = null));
      try {
        (e.readyState !== WebSocket.OPEN &&
          e.readyState !== WebSocket.CONNECTING) ||
          e.close();
      } catch (e) {}
    }
  }
}

/* ==================== DouyuEx-RL 智能版本生命周期与更新推送系统 ==================== */

}
