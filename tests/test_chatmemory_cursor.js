const fs = require("fs");
const path = require("path");
const assert = require("assert");
let JSDOM;
try {
    JSDOM = require("jsdom").JSDOM;
} catch (e) {
    console.error("[测试] 缺少依赖 jsdom，请先执行：npm install");
    throw e;
}

/**
 * 聊天记忆游标（audit-wave2 P2-8）。
 *
 * 语义：0..len-1 指向历史条目；len 表示「停在末尾之后（人已经走出历史）」。
 * 旧实现把 push() 的返回长度当索引，靠「按 ↑ 先减一」碰巧对齐：
 *   · 从最后一条继续按 ↓ 时游标卡在 len-1，永远回不到「清空」，输入框一直留着那条历史；
 *   · limit 触发 shift 后游标没有前移，整体错一格。
 */
const SRC_DIR = process.env.CHATMEM_SRC_DIR || path.join(__dirname, "..");
function readSrc(rel) {
    const text = fs.readFileSync(path.join(SRC_DIR, rel), "utf8");
    assert.ok(text.length > 0, "源码读取为空: " + rel);
    return text;
}

const EXGUARD_SRC = readSrc("src/require/ExGuard/ExGuard.js");
const MEM_SRC = readSrc("src/packages/ChatTools/ChatMemory/ChatMemory.js");

function makeEnv() {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div class="ChatSend-txt" id="box"></div><div class="ChatSend-button"></div></body></html>',
        { url: "https://www.douyu.com/9999" });
    const win = dom.window;
    const expose = [
        "return {",
        "  push: chatMemory_pushBarrage,",
        "  key: chatMemory_handleKeydown,",
        "  apply: (typeof ChatMemory_applyCursor === \"function\") ? ChatMemory_applyCursor : null,",
        "  cursor: function () { return barrageMemoryIndex; },",
        "  arr: function () { return barrageMemoryArr; },",
        "  limit: function () { return BARRAGE_MEMORY_LIMIT; }",
        "};"
    ].join("\n");
    const factory = new Function(
        "window", "document", "setBarrageValue", "getTextareaPosition",
        EXGUARD_SRC + "\n" + MEM_SRC + "\n" + expose
    );
    // 光标位置由 press() 按方向设定：↑ 视为停在行首（0），↓ 视为停在末尾（-1 = 取文本长度）
    let caretPos = 0;
    const api = factory(win, win.document, null, function (el) {
        if (caretPos === -1) return String(el.innerText || "").length;
        return caretPos;
    });
    const box = win.document.getElementById("box");
    function press(code) {
        caretPos = (code === 38) ? 0 : -1;
        api.key({ keyCode: code, target: box });
    }
    return { dom, win, api, box, press };
}

const UP = 38;
const DOWN = 40;

async function testCursor() {
    console.log("=== ① 游标语义：末尾之后 = len，走出历史要清空 ===");
    const env = makeEnv();
    const { api, box, press } = env;

    api.push("a");
    api.push("b");
    api.push("c");
    assert.deepStrictEqual(api.arr(), ["a", "b", "c"]);
    assert.strictEqual(api.cursor(), 3, "push 之后游标必须停在末尾之后（len）");

    press(UP);
    assert.strictEqual(box.innerText, "c", "第一次 ↑ 应该是最后一条");
    assert.strictEqual(api.cursor(), 2);
    press(UP);
    assert.strictEqual(box.innerText, "b");
    press(UP);
    assert.strictEqual(box.innerText, "a");
    assert.strictEqual(api.cursor(), 0, "到最旧一条后游标为 0");
    press(UP);
    assert.strictEqual(box.innerText, "a", "已在最旧一条，再按 ↑ 不能越界");
    assert.strictEqual(api.cursor(), 0, "越界后游标仍为 0");

    press(DOWN);
    assert.strictEqual(box.innerText, "b");
    press(DOWN);
    assert.strictEqual(box.innerText, "c");
    press(DOWN);
    assert.strictEqual(api.cursor(), 3, "越过最后一条后游标回到 len");
    assert.strictEqual(box.innerText, "", "走出历史必须清空输入框（旧实现会停在最后一条上）");

    console.log("✓ ① 通过: 上/下走位与清空都符合语义");
    env.dom.window.close();
}

async function testPushAndLimit() {
    console.log("=== ② 浏览中 push 重置游标；达到上限 shift 后不错格 ===");
    const env = makeEnv();
    const { api, box, press } = env;

    api.push("x");
    api.push("y");
    press(UP);
    press(UP);
    assert.strictEqual(box.innerText, "x");
    api.push("z");
    assert.strictEqual(api.cursor(), 3, "push 之后游标回到末尾之后");
    press(UP);
    assert.strictEqual(box.innerText, "z", "下次 ↑ 取最新一条");
    env.dom.window.close();

    // 上限：塞满后继续 push，最旧的一条被挤掉，游标仍等于 len
    const env2 = makeEnv();
    const limit = env2.api.limit();
    for (let i = 0; i < limit; i++) env2.api.push(String(i));
    assert.strictEqual(env2.api.arr().length, limit);
    assert.strictEqual(env2.api.cursor(), limit);
    env2.api.push("overflow");
    assert.strictEqual(env2.api.arr().length, limit, "超过上限要挤掉最旧的");
    assert.strictEqual(env2.api.arr()[0], "1", "最旧的 0 应被挤掉");
    assert.strictEqual(env2.api.cursor(), limit, "挤掉一条后游标仍等于 len（不错格）");
    env2.dom.window.close();

    console.log("✓ ② 通过: 游标复位与上限处理正确");
}

async function testEmpty() {
    console.log("=== ③ 空历史：按 ↑ 不抛错、不动输入框 ===");
    const env = makeEnv();
    env.box.innerText = "用户正在打的字";
    assert.doesNotThrow(function () { env.press(UP); }, "空历史按 ↑ 不得抛错");
    assert.strictEqual(env.box.innerText, "用户正在打的字", "空历史时不能清掉用户输入");
    assert.strictEqual(env.api.cursor(), 0);
    env.dom.window.close();
    console.log("✓ ③ 通过: 空历史安全");
}

// 只在复现红灯时用：CHATMEM_ONLY=走位 / 上限 / 空
const ONLY = process.env.CHATMEM_ONLY || "";
const SCENARIOS = [
    ["走位", testCursor],
    ["上限", testPushAndLimit],
    ["空", testEmpty]
];

(async function main() {
    let ran = 0;
    for (let i = 0; i < SCENARIOS.length; i++) {
        if (ONLY && SCENARIOS[i][0].indexOf(ONLY) === -1) continue;
        await SCENARIOS[i][1]();
        ran++;
    }
    assert.ok(ran > 0, "CHATMEM_ONLY 没有匹配到任何场景: " + ONLY);
    console.log("=== 聊天记忆游标回归测试" + (ONLY ? "（仅 " + ONLY + "）" : "") + " 100% 通过 ===");
})().catch(function (e) {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
