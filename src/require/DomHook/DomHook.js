/*
    DomHook —— 目标节点的 MutationObserver 包装
    ------------------------------------------------------------
    历史坑：目标节点不存在时这里是**静默 return** —— 构造出来的对象看起来一切正常，
    调用方（FollowList 等）无法区分"已经挂上"和"根本没挂上"，于是"时好时坏"的功能
    永远查不出原因（详见 FollowList.js 顶部注释里那段绕开逻辑）。

    现在的契约：
      1) 构造时就说话：目标不存在 / observe 抛错 → failed = true + failReason，
         并用 console.warn 留痕（FollowList 正是靠这个标记决定"继续等"）；
      2) 回调抛错不再变成"未捕获异常"：既然一次回调失败不代表 observer 该死，
         这里兜住并留痕（有上限），observer 继续工作；
      3) closeHook 幂等；isActive() 供调用方判断"observer 还在盯、节点还挂在文档上"。
*/
class DomHook {
    constructor(selector, isSubtree, callback) {
        this.selector = selector;
        this.isSubtree = isSubtree;
        this.callback = callback;
        this.observer = null;
        this.targetNode = null;
        this.failed = false;
        this.failReason = "";
        this.callbackErrors = 0;
        this.closed = false;

        let targetNode = null;
        try {
            targetNode = document.querySelector(this.selector);
        } catch (e) {
            targetNode = null;
            ExGuard_warn("DomHook", "选择器 " + this.selector + " 查询失败", e);
        }
        if (targetNode == null) {
            this.failed = true;
            this.failReason = "target-not-found";
            ExGuard_warn("DomHook", "目标 " + this.selector + " 不存在，本次没有挂上（等下次初始化或刷新后重试）");
            return;
        }

        try {
            const self = this;
            this.observer = new MutationObserver(function (mutations) {
                try {
                    callback(mutations);
                } catch (e) {
                    self.callbackErrors++;
                    // 同一个 hook 只留前几条，避免一条坏回调把控制台刷爆
                    if (self.callbackErrors <= 3) {
                        ExGuard_warn("DomHook", "回调 " + self.selector + " 抛错（第 " + self.callbackErrors + " 次，observer 继续工作）", e);
                    }
                }
            });
            this.observer.observe(targetNode, { attributes: true, childList: true, subtree: this.isSubtree });
            this.targetNode = targetNode;
        } catch (e) {
            this.observer = null;
            this.failed = true;
            this.failReason = "observe-failed";
            ExGuard_warn("DomHook", "目标 " + this.selector + " 挂载 observer 失败", e);
        }
    }

    /** observer 还在工作、且目标节点仍挂在文档上 */
    isActive() {
        if (!this.observer || this.closed) return false;
        const node = this.targetNode;
        if (!node) return false;
        // 老浏览器没有 isConnected 时退化为"有 parentNode"，不把结论反过来
        if (typeof node.isConnected === "boolean") return node.isConnected;
        return !!node.parentNode;
    }

    closeHook() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.targetNode = null;
        this.closed = true;
    }
}
