let barrageMemoryArr = [];
let barrageMemoryIndex = 0; // 当前 指向索引
let prevTextareaPosition = 0;
const BARRAGE_MEMORY_LIMIT = 200;
function initPkg_ChatMemory() {
    initPkg_ChatMemory_Func();
}

// 绑定只做一次：轮询等待聊天框时可能命中多次，重绑会让一次按 ↑ 回忆两次
let chatMemoryBound = false;
let chatMemoryWaiting = false;

function initPkg_ChatMemory_Func() {
    if (chatMemoryBound || chatMemoryWaiting) return;
    const bind = function () {
        let txt = document.getElementsByClassName("ChatSend-txt")[0];
        if (!txt) return null;
        chatMemoryBound = true;
        txt.addEventListener("keydown", (e) => {
            let dom = e.target;
            const isTextarea = dom.tagName === "TEXTAREA";
            if (e.keyCode == 38) {
                // ↑
                if (getTextareaPosition(dom) == 0) {
                    barrageMemoryIndex = barrageMemoryIndex > 0 ? barrageMemoryIndex - 1 : barrageMemoryIndex;
                    chatMemory_setBarrage();
                }
            } else if (e.keyCode == 40) {
                // ↓
                const length = isTextarea ? dom.value.length : String(dom.innerText || "").length;
                if (getTextareaPosition(dom) == length) {
                    barrageMemoryIndex = barrageMemoryIndex < barrageMemoryArr.length - 1 ? barrageMemoryIndex + 1 : barrageMemoryIndex;
                    chatMemory_setBarrage();
                }
            } else if (e.keyCode == 13) {
                // enter
                chatMemory_pushBarrage(getBarrageValue());
            }
        });
        let btn = document.getElementsByClassName("ChatSend-button")[0];
        if (btn) {
            btn.addEventListener("click", () => {
                // 点击弹幕发送按钮
                chatMemory_pushBarrage(getBarrageValue());
            });
        }
        return txt;
    };
    if (bind()) return;
    // 聊天框是异步渲染的：initPkg 跑到这里时它往往还没进 DOM。
    // 旧实现只取一次 [0]，取不到就什么都不做 —— 功能静默失效（换个房间按 ↑ 就没反应）。
    // 现在用有上限轮询等它，等不到会由 ExGuard 留一条「等了多少秒、已放弃」的自证信息。
    if (typeof ExGuard_pollFor === "function") {
        chatMemoryWaiting = true;
        ExGuard_pollFor(function () {
            return document.getElementsByClassName("ChatSend-txt")[0] || null;
        }, function () {
            chatMemoryWaiting = false;
            bind();
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
        barrageMemoryIndex = Math.min(barrageMemoryIndex, barrageMemoryArr.length);
    }
    barrageMemoryIndex = barrageMemoryArr.push(txt);
}

function chatMemory_setBarrage() {
    if (barrageMemoryArr[barrageMemoryIndex] == undefined) {
        return;
    }
    setBarrageValue(barrageMemoryArr[barrageMemoryIndex] || "");
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