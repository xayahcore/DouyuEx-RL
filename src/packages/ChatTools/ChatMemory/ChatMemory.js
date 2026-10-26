let barrageMemoryArr = [];
/*
 * 游标语义（audit-wave2 P2-8）：
 *   0 .. len-1 指向历史条目；len 表示「停在末尾之后（人已经走出历史）」。
 * 旧实现把 push() 的返回长度直接当索引，靠「按 ↑ 先减一」碰巧对齐：
 *   · 从最后一条继续按 ↓ 时 index 卡在 len-1，永远回不到「清空」，输入框会一直留着那条历史；
 *   · limit 触发 shift 后 index 仍指向旧位置，整体错一格。
 * 现在语义写死，并且有 tests/test_chatmemory_cursor.js 专门钉住。
 */
let barrageMemoryIndex = 0;
let prevTextareaPosition = 0;
const BARRAGE_MEMORY_LIMIT = 200;
function initPkg_ChatMemory() {
    initPkg_ChatMemory_Func();
}

// 绑定状态：记住"绑在哪个输入框上"。斗鱼切房会把整个聊天区节点换掉，
// 旧 .ChatSend-txt 一被丢弃，keydown 就再也不会来 —— 用户按 ↑ 没反应。
// （本文件此前只修了"首次未渲染"，没覆盖"渲染之后被替换"这一种。）
let chatMemoryWaiting = false;
let chatMemoryBoundNode = null;
let chatMemoryBoundButton = null;
let chatMemoryWatching = false;

/** 当前绑定是否仍然有效（节点还在文档里） */
function chatMemory_isBound() {
    return !!(chatMemoryBoundNode && document.contains(chatMemoryBoundNode));
}

function chatMemory_handleKeydown(e) {
    let dom = e.target;
    const isTextarea = dom.tagName === "TEXTAREA";
    if (e.keyCode == 38) {
        // ↑：从「末尾之后」进入历史时落在最后一条，其余情况往前一格；到 0 就停住
        if (getTextareaPosition(dom) == 0 && barrageMemoryArr.length > 0) {
            const next = barrageMemoryIndex >= barrageMemoryArr.length
                ? barrageMemoryArr.length - 1
                : Math.max(0, barrageMemoryIndex - 1);
            ChatMemory_applyCursor(next);
        }
    } else if (e.keyCode == 40) {
        // ↓：往后一格；越过最后一条（回到 len）就清空输入框，交还给用户原本要打的内容
        const length = isTextarea ? dom.value.length : String(dom.innerText || "").length;
        if (getTextareaPosition(dom) == length && barrageMemoryIndex < barrageMemoryArr.length) {
            ChatMemory_applyCursor(barrageMemoryIndex + 1);
        }
    } else if (e.keyCode == 13) {
        // enter
        chatMemory_pushBarrage(getBarrageValue());
    }
}

function chatMemory_handleButtonClick() {
    // 点击弹幕发送按钮
    chatMemory_pushBarrage(getBarrageValue());
}

/** 把事件绑到某个具体输入框上（节点换了就换绑，不会重复绑同一个节点） */
function chatMemory_bindInput(txt) {
    if (!txt) return false;
    if (chatMemoryBoundNode !== txt) {
        txt.addEventListener("keydown", chatMemory_handleKeydown);
        chatMemoryBoundNode = txt;
    }
    const btn = document.getElementsByClassName("ChatSend-button")[0];
    if (btn && chatMemoryBoundButton !== btn) {
        btn.addEventListener("click", chatMemory_handleButtonClick);
        chatMemoryBoundButton = btn;
    }
    return true;
}

/**
 * 容器更换监听：只在**按键进来时**看一眼来源节点，不需要常驻定时器。
 * 捕获阶段挂一次，保证比页面自己的聊天框处理更早看到事件；
 * 目标只要是 .ChatSend-txt 却还不是当前绑定的那个（切房后被替换），就当场补绑 ——
 * 补绑发生在事件到达目标之前，所以这一次按键就已经生效。
 */
function chatMemory_watch() {
    if (chatMemoryWatching) return;
    chatMemoryWatching = true;
    document.addEventListener("keydown", function (e) {
        const target = e.target;
        if (!target || !target.classList || !target.classList.contains("ChatSend-txt")) return;
        if (target === chatMemoryBoundNode) return;
        chatMemory_bindInput(target);
    }, true);
}

function initPkg_ChatMemory_Func() {
    // 兜底监听无条件挂上：无论此刻有没有输入框，切房/晚渲染都能靠它补绑
    chatMemory_watch();
    if (chatMemoryWaiting || chatMemory_isBound()) return;
    if (chatMemory_bindInput(document.getElementsByClassName("ChatSend-txt")[0])) return;
    // 聊天框是异步渲染的：initPkg 跑到这里时它往往还没进 DOM。
    // 用有上限轮询等它，等不到会由 ExGuard 留一条「等了多少秒、已放弃」的自证信息。
    if (typeof ExGuard_pollFor === "function") {
        chatMemoryWaiting = true;
        ExGuard_pollFor(function () {
            return document.getElementsByClassName("ChatSend-txt")[0] || null;
        }, function () {
            chatMemoryWaiting = false;
            chatMemory_bindInput(document.getElementsByClassName("ChatSend-txt")[0]);
        }, { intervalMs: 500, maxTries: 30, tag: "聊天记忆" });
    }
}

function chatMemory_pushBarrage(txt) {
    // 空内容不入记忆：旧实现会把空串/undefined 也压进数组，
    // 之后按 ↑ 回忆到的就是空串 —— 用户看到的是「按上箭头没反应」，
    // 而且真正上一条弹幕被往后挤了一格。
    if (txt == null || String(txt).trim() === "") return;
    if (barrageMemoryArr.length >= BARRAGE_MEMORY_LIMIT) {
        barrageMemoryArr.shift();
        // 丢掉了最旧的一条：游标跟着前移一格，才不会指到邻居身上
        if (barrageMemoryIndex > 0) barrageMemoryIndex--;
    }
    barrageMemoryArr.push(txt);
    barrageMemoryIndex = barrageMemoryArr.length; // 显式：停在末尾之后
}

/** 把游标落到指定位置并同步输入框；越界自动夹紧，len = 清空（人已经走出历史） */
function ChatMemory_applyCursor(next) {
    const len = barrageMemoryArr.length;
    let pos = Number(next);
    if (!Number.isFinite(pos)) pos = len;
    if (pos < 0) pos = 0;
    if (pos > len) pos = len;
    barrageMemoryIndex = pos;
    if (pos >= len) {
        setBarrageValue("");
        return;
    }
    setBarrageValue(barrageMemoryArr[pos] || "");
}

/** 兼容旧调用：按当前游标同步输入框 */
function chatMemory_setBarrage() {
    ChatMemory_applyCursor(barrageMemoryIndex);
}

function getBarrageValue() {
    let dom = document.getElementsByClassName("ChatSend-txt")[0];
    if (dom != undefined && dom != null) {
        if (dom.tagName === "TEXTAREA") {
            return dom.value;
        } else {
            return dom.innerText;
        }
    }
    return "";
}
function setBarrageValue(txt) {
    let dom = document.getElementsByClassName("ChatSend-txt")[0];
    if (dom != undefined && dom != null) {
        if (dom.tagName === "TEXTAREA") {
            dom.value = txt;
        } else {
            dom.innerText = txt;
        }
    }
}