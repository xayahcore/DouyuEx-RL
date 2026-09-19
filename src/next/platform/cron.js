function* (__imports) {
yield {"nl": { get: () => nl, set: value => { nl = value; } }};
/**
 * 斗鱼弹幕代理长连接客户端 (DanmakuProxy WebSocket Client)
 * 接入 wss://danmuproxy.douyu.com:8502~8505，处理认证心跳与消息反序列化。
 * 契约导出兼容名称: nl
 */
class DanmakuProxyWebSocketClient {
  /**
   * @param {string|number} roomId - 目标直播间房间号
   * @param {Function} messageHandler - 弹幕消息回调 (payload: string) => void
   */
  constructor(roomId, messageHandler) {
    if (!("WebSocket" in window)) return;

    this.timer = 0;
    this.reconnectTimer = null;
    this.rid = String(roomId);
    this.msgHandler = messageHandler;
    this.reconnectCount = 0;
    this.maxReconnect = 10;
    this.closed = false;
    this.ws = null;

    this.connect();
  }

  /**
   * 建立 WebSocket 连接并订阅弹幕分组
   */
  connect() {
    if (this.closed) return;

    // 随机轮询 8502 ~ 8505 端口节点
    const proxyPort = (0, __imports.a)(2, 5);
    this.ws = new WebSocket(`wss://danmuproxy.douyu.com:850${proxyPort}`);

    this.ws.onopen = () => {
      if (this.closed) return;

      this.reconnectCount = 0;
      // 1. 发送入组认证包
      this.ws.send((0, __imports.ol)(`type@=loginreq/roomid@=${this.rid}`));
      this.ws.send((0, __imports.ol)(`type@=joingroup/rid@=${this.rid}/gid@=-9999/`));

      // 2. 启动 40 秒周期心跳维持保活 (mrkl/)
      this.timer = (0, __imports.setInterval)(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send((0, __imports.ol)("type@=mrkl/"));
        }
      }, 40000);
    };

    this.ws.onerror = () => {
      if (!this.closed && this.ws) {
        try { this.ws.close(); } catch {}
      }
    };

    this.ws.onmessage = (event) => {
      if (this.closed) return;

      // 斗鱼报文为二进制，需要通过 FileReader 转译文本
      const reader = new FileReader();
      reader.onload = () => {
        if (this.closed) return;
        const messages = String(reader.result).split("\0");
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          if (msg.length > 12 && typeof this.msgHandler === 'function') {
            this.msgHandler(msg);
          }
        }
      };
      reader.readAsText(event.data);
    };

    this.ws.onclose = () => {
      (0, __imports.clearInterval)(this.timer);
      this.timer = 0;
      this.ws = null;
      if (!this.closed) {
        this.reconnect();
      }
    };
  }

  /**
   * 指数退避重连机制
   */
  reconnect() {
    if (this.closed || this.reconnectCount >= this.maxReconnect) return;

    this.reconnectCount++;
    const delayMs = Math.min(3000 * Math.pow(1.5, this.reconnectCount - 1), 60000);

    this.reconnectTimer = (0, __imports.setTimeout)(() => {
      if (!this.closed) {
        this.connect();
      }
    }, delayMs);
  }

  /**
   * 安全彻底关闭连接与释放所有定时器
   */
  close() {
    (0, __imports.clearTimeout)(this.reconnectTimer);
    this.reconnectTimer = null;

    if (!this.closed) {
      this.closed = true;
      (0, __imports.clearInterval)(this.timer);
      this.timer = 0;

      if (this.ws) {
        const socket = this.ws;
        this.ws = null;
        socket.onclose = null;
        socket.onopen = null;
        socket.onerror = null;
        socket.onmessage = null;

        try {
          if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
            socket.close();
          }
        } catch {}
      }
    }
  }
}

// 兼容导出类
const nl = DanmakuProxyWebSocketClient;

}
