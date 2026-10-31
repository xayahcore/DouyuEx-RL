const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT = path.join(__dirname, "..");
const GUARD_PATH = path.join(ROOT, "src/require/ExGuard/ExGuard.js");
const SRC = fs.readFileSync(GUARD_PATH, "utf8");
const BUILT_PATH = path.join(ROOT, "DouyuEx_RL.user.js");

/**
 * ExGuard 顶层 TDZ 回归（2026-11-01 真机排查发现）：
 *   构建产物是「所有包拼进同一个作用域」的一份脚本。只要有任何一个包在**自己的声明语句执行之前**
 *   就调到 ExGuard_warn（典型就是某个包顶层的 try{...}catch{ ExGuard_warn(...) }），
 *   原来用 let / const 声明的 ExGuard_warnCounts 会处于 TDZ：
 *     ReferenceError: Cannot access 'ExGuard_warnCounts' before initialization
 *   这条异常没有任何兜底能接，顶层脚本整根掐断 —— 后面的 initPkg() / initRouter() 全不执行，
 *   用户侧只看到「插件整个不见了」，日志里只有一条看不懂的 ReferenceError。
 * 修复口径：计数器与上限改用 var（脚本启动即存在）+ 惰性初始化，谁先用谁建。
 */

/** 把「声明语句之前的一次调用」按产物的真实顺序拼出来 */
function loadWithEarlyCall() {
  const logs = [];
  const consoleStub = {
    warn: function (m) { logs.push(String(m)); },
    error: function () {},
    log: function () {}
  };
  const body =
    "var earlyThrew = null;\n" +
    "try { ExGuard_warn('早跑', '声明语句执行之前就被调到'); } catch (e) { earlyThrew = String((e && e.message) || e); }\n" +
    "var earlyCount = (typeof ExGuard_warnCount === 'function') ? ExGuard_warnCount('早跑') : -1;\n" +
    SRC + "\n" +
    "return {\n" +
    "  earlyThrew: earlyThrew,\n" +
    "  earlyCount: earlyCount,\n" +
    "  warn: ExGuard_warn,\n" +
    "  count: ExGuard_warnCount\n" +
    "};";
  const factory = new Function("console", body);
  const api = factory(consoleStub);
  return { api: api, logs: logs };
}

function testEarlyCallNoThrow() {
  const env = loadWithEarlyCall();
  assert.strictEqual(env.api.earlyThrew, null,
    "声明语句执行之前调用 ExGuard_warn 不得抛错（修复前是 TDZ ReferenceError）");
  assert.strictEqual(env.logs.length, 1, "早跑那一条仍然要真的打出来（不是被静默吞掉）");
  assert.ok(env.logs[0].indexOf("[DouyuEx]") === 0, "告警前缀保持不变");
  console.log("✓ ① 通过: 顶层提前调用 ExGuard_warn 不再抛 TDZ，且告警照常输出");
}

function testEarlyCountSurvives() {
  const env = loadWithEarlyCall();
  assert.strictEqual(env.api.earlyCount, 1,
    "早跑那一次要记进计数器（声明语句走到时不得把计数冲成 0）");
  assert.strictEqual(env.api.count("早跑"), 1, "声明之后再读计数器仍是 1");
  console.log("✓ ② 通过: 提前调用的计数不被后续声明语句冲掉");
}

function testCapStillWorks() {
  const env = loadWithEarlyCall();
  const before = env.logs.length;
  for (let i = 0; i < 40; i++) env.api.warn("限流", "第 " + i + " 条");
  const printed = env.logs.length - before;
  assert.strictEqual(printed, 20, "同一个 tag 仍然最多留 20 条（上限逻辑不能因为改成 var 而丢失）");
  assert.strictEqual(env.api.count("限流"), 20, "计数停在上限值");
  env.api.warn("另一个tag", "别的包");
  assert.strictEqual(env.logs.length - before, 21, "上限按 tag 分别计算，不能串味");
  console.log("✓ ③ 通过: 告警上限与按 tag 计数行为不变");
}

function testSourceGuards() {
  assert.ok(/var EXGUARD_WARN_MAX/.test(SRC) && !/const EXGUARD_WARN_MAX/.test(SRC),
    "上限常量必须用 var（const 在顶层提前调用时会 TDZ）");
  assert.ok(!/^\s*(let|const)\s+ExGuard_warnCounts/m.test(SRC),
    "计数器不得用顶层 let / const 声明（TDZ 会让顶层提前调用炸掉整根脚本）");
  assert.ok(SRC.indexOf("ExGuard_warnCountsSafe.map") !== -1,
    "计数器必须挂在函数属性上惰性创建（不依赖任何顶层变量的执行顺序，压缩也摇不掉）");
  console.log("✓ ④ 通过: 源码级护栏在位（无顶层 let/const 计数器 + 挂在函数属性上惰性创建）");
}

function testBuiltBundleGuards() {
  if (!fs.existsSync(BUILT_PATH)) {
    console.log("· 跳过: 没有构建产物（先跑 node build.js），产物级护栏留给 test_built_bundle.js");
    return;
  }
  const built = fs.readFileSync(BUILT_PATH, "utf8");
  assert.ok(!/\blet\s+ExGuard_warnCounts\b/.test(built) && !/\bconst\s+ExGuard_warnCounts\b/.test(built),
    "构建产物里不得出现顶层 let/const ExGuard_warnCounts（顶层提前调用会 TDZ 掐断整根脚本）");
  assert.ok(built.indexOf("ExGuard_warnCountsSafe") !== -1, "产物里必须带上惰性初始化函数");
  assert.ok(built.indexOf("ExGuard_warnCountsSafe.map") !== -1,
    "产物里的计数器必须挂在函数属性上（压缩器摇不掉）");
  console.log("✓ ⑤ 通过: 构建产物已按 var + 惰性初始化产出");
}

(function main() {
  testEarlyCallNoThrow();
  testEarlyCountSurvives();
  testCapStillWorks();
  testSourceGuards();
  testBuiltBundleGuards();
  console.log("=== ExGuard 顶层 TDZ 回归 5 组场景全部通过 ===");
})();
