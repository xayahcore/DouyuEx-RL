const fs = require("fs");
const path = require("path");
const assert = require("assert");

/**
 * 账号管理（多账号切换）回归。
 * 真机报障：点「切换账号」之后页面刷新变成登录框（号被切废）；未登录时点「+」重新登录毫无反应。
 * 两个根因：
 *   ① switchAccount 里恢复 cookie 的那行被注释成 `let l = []` —— 先删光本域 cookie 却不写回；
 *   ② cleanCookie 只在 delete 回调里判 lock >= cookies.length，0 个 cookie 时回调永远不来
 *      （passport iframe 因此永远不回 cleanOver，父页就不刷新）。
 * 这里用假的 GM_cookie / GM_getValue 直接跑源码里的这几个函数，不依赖构建产物。
 */
const ACC_SRC = fs.readFileSync(path.join(__dirname, "../src/packages/AccountList/AccountList.js"), "utf8");
const DC_SRC = fs.readFileSync(path.join(__dirname, "../src/packages/DanmakuCollect/DanmakuCollect.js"), "utf8");
const FL_SRC = fs.readFileSync(path.join(__dirname, "../src/packages/FollowList/FollowList.js"), "utf8");
const BAG_SRC = fs.readFileSync(path.join(__dirname, "../src/packages/BagInfo/BagInfo.js"), "utf8");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* 源码级护栏要忽略注释 —— 本轮修复的注释里会引用"原来那行代码"的原文，
   不剥注释的话 /let l = \[\]/ 会命中注释本身。 */
function stripComments(src) {
  return String(src)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/* 用源码拼一个只暴露被测函数的小环境；GM_cookie 走异步回调（与真实宿主一致） */
function loadAccountModule(opts) {
  const options = opts || {};
  const calls = { list: 0, del: [], set: [] };
  let store = (options.cookies || []).map((c) => Object.assign({}, c));
  const values = Object.assign({}, options.values || {});
  const warnings = [];

  const GM_cookie = function (action, detail, cb) {
    if (action === "list") {
      calls.list++;
      setTimeout(() => cb(store.map((c) => Object.assign({}, c))), 0);
      return;
    }
    if (action === "delete") {
      calls.del.push(detail && detail.name);
      const name = detail && detail.name;
      setTimeout(() => {
        const idx = store.findIndex((c) => c.name === name);
        if (idx >= 0) store.splice(idx, 1);
        if (cb) cb(null);
      }, 0);
      return;
    }
    if (action === "set") {
      calls.set.push(Object.assign({}, detail));
      setTimeout(() => {
        store.push(Object.assign({}, detail));
        if (cb) cb(null);
      }, 0);
      return;
    }
    if (cb) cb(null);
  };
  const GM_getValue = function (key) { return values[key]; };
  const GM_setValue = function (key, val) { values[key] = val; };

  const factory = new Function(
    "GM_cookie", "GM_getValue", "GM_setValue", "console", "document", "window",
    ACC_SRC + "\nreturn { cleanCookie, switchAccount, switchAccountPassport, addAccountPassport, AccountList_readStore, AccountList_cookieList, AccountList_sameCookies };"
  );
  const api = factory(
    GM_cookie, GM_getValue, GM_setValue,
    { log: () => {}, warn: (...a) => warnings.push(a.join(" ")), error: () => {} },
    { getElementById: () => null, querySelector: () => null, getElementsByClassName: () => [] },
    { location: { href: "https://www.douyu.com/9999" } }
  );
  return { api, calls, values, warnings, cookies: () => store };
}

const NAMES = ["acf_uid", "acf_nickname", "acf_avatar"];
function cookie(name, value) {
  return {
    name: name, value: value, domain: ".douyu.com", path: "/",
    secure: false, httpOnly: false, sameSite: "unspecified",
    expirationDate: 1900000000.5, hostOnly: false
  };
}

async function run() {
  console.log("=== 账号管理（多账号切换）回归测试 ===");

  // ---------- 1. cleanCookie：0 个 cookie 也必须回调（未登录点「+」没反应的根因） ----------
  console.log("--> 1. cleanCookie：0 cookie 时回调必须执行");
  {
    const m = loadAccountModule({ cookies: [] });
    let called = 0;
    m.api.cleanCookie(() => { called++; });
    await sleep(20);
    assert.strictEqual(called, 1, "0 个 cookie 时 cleanCookie 必须照样回调（否则 passport iframe 不回 cleanOver）");
    assert.strictEqual(m.calls.del.length, 0, "0 个 cookie 时不该有 delete 调用");
  }

  // ---------- 2. cleanCookie：有 cookie 时删完再回调一次 ----------
  console.log("--> 2. cleanCookie：全部删完后只回调一次");
  {
    const m = loadAccountModule({ cookies: NAMES.map((n) => cookie(n, "v_" + n)) });
    let called = 0;
    m.api.cleanCookie(() => { called++; });
    await sleep(40);
    assert.strictEqual(called, 1, "cleanCookie 必须且只能回调一次，实际 " + called);
    assert.deepStrictEqual(m.calls.del.sort(), NAMES.slice().sort(), "三个本域 cookie 都要删，实际 " + JSON.stringify(m.calls.del));
    assert.strictEqual(m.cookies().length, 0, "删完之后 cookie 罐里不该有残留");
  }

  // ---------- 3. switchAccount：删完必须把 list[uid].data 真正写回 ----------
  console.log("--> 3. switchAccount：恢复成该账号存下来的 cookie（P0）");
  {
    const saved = [cookie("acf_uid", "2001"), cookie("acf_nickname", "二号"), cookie("acf_avatar", "a2")];
    const m = loadAccountModule({
      cookies: NAMES.map((n) => cookie(n, "old_" + n)),
      values: { Ex_accountList: JSON.stringify({ "2001": { uid: "2001", nickname: "二号", data: saved } }) }
    });
    let called = 0;
    m.api.switchAccount("2001", () => { called++; });
    await sleep(60);
    assert.strictEqual(called, 1, "切换完成后回调必须执行一次");
    assert.deepStrictEqual(m.calls.del.sort(), NAMES.slice().sort(), "先把旧账号的三个 cookie 删干净");
    assert.strictEqual(m.calls.set.length, 3, "必须把该账号的 3 条 cookie 写回，实际 " + m.calls.set.length);
    const uidCookie = m.calls.set.filter((c) => c.name === "acf_uid")[0];
    assert.ok(uidCookie, "acf_uid 必须写回");
    assert.strictEqual(uidCookie.value, "2001", "写回的必须是新账号的值，实际 " + uidCookie.value);
    assert.strictEqual(uidCookie.domain, ".douyu.com", "domain 必须原样带上");
    assert.strictEqual(uidCookie.path, "/", "path 必须原样带上");
    assert.strictEqual(uidCookie.httpOnly, false, "httpOnly 必须原样带上");
    assert.strictEqual(String(uidCookie.expirationDate), "1900000000.5", "expirationDate 必须原样带上");
    assert.strictEqual(m.cookies().length, 3, "最终 cookie 罐里应该只有新账号那三条");
  }

  // ---------- 4. switchAccount：账本里没有这个 uid 时不得先删（删了就再也回不来） ----------
  console.log("--> 4. switchAccount：没有可恢复数据时不许先清空");
  {
    const m = loadAccountModule({ cookies: NAMES.map((n) => cookie(n, "keep_" + n)) });
    let called = 0;
    m.api.switchAccount("9999", () => { called++; });
    await sleep(40);
    assert.strictEqual(called, 1, "没有数据也要收尾（否则调用方永远等）");
    assert.strictEqual(m.calls.del.length, 0, "没有可恢复的数据时一条 cookie 都不许删（否则账号彻底切废）");
    assert.strictEqual(m.calls.set.length, 0, "没有数据时不写任何 cookie");
    assert.strictEqual(m.cookies().length, 3, "原 cookie 必须原样保留");
  }

  // ---------- 5. switchAccount：账本被写坏时不能抛 ----------
  console.log("--> 5. switchAccount：存储被写坏时按空账本处理");
  {
    const m = loadAccountModule({ cookies: [cookie("acf_uid", "1")], values: { Ex_accountList: "{" } });
    let called = 0;
    assert.doesNotThrow(() => m.api.switchAccount("1", () => { called++; }), "坏 JSON 不得把整个切换流程抛断");
    await sleep(30);
    assert.strictEqual(called, 1, "坏账本也要走完回调");
    assert.ok(m.warnings.length >= 1, "坏账本必须留一条 console.warn 便于排障");
    assert.strictEqual(m.calls.del.length, 0, "读不出数据时同样一条 cookie 都不许删");
  }

  // ---------- 6. switchAccountPassport：空列表也要回 switchOver ----------
  console.log("--> 6. switchAccountPassport：空列表 / 缺 uid 也必须回调");
  {
    const m = loadAccountModule({
      cookies: [cookie("LTP0", "old")],
      values: { Ex_accountListPassport: JSON.stringify({ global: [], "2001": [] }) }
    });
    let called = 0;
    m.api.switchAccountPassport("2001", () => { called++; });
    await sleep(40);
    assert.strictEqual(called, 1, "该账号没有存 cookie 时也必须回调（父页在等 switchOver）");
    assert.strictEqual(m.calls.set.length, 0, "没有私有 cookie 时不写任何东西");
    assert.strictEqual(m.calls.del.length, 0, "没有可恢复的数据时不许先清空（清完就只剩未登录）");
    assert.ok(m.warnings.some((w) => w.indexOf("没有该账号的 cookie 记录") !== -1), "必须留一条 warn 便于排障");

    const m2 = loadAccountModule({ cookies: [], values: { Ex_accountListPassport: "{}" } });
    let called2 = 0;
    m2.api.switchAccountPassport("nobody", () => { called2++; });
    await sleep(30);
    assert.strictEqual(called2, 1, "账本里没有该 uid 时也必须回调");
  }

  // ---------- 6.1 addAccountPassport：会话不是这个账号时不许写（router 先调 add 再 switch 的坑） ----------
  console.log("--> 6.1 addAccountPassport：acf_uid 与目标不符时一条都不写");
  {
    const storeBefore = JSON.stringify({
      global: [cookie("dy_auth", "old-global")],
      "B2": [cookie("LTP0", "ltp-B")]
    });
    const m = loadAccountModule({
      cookies: [cookie("acf_uid", "A1"), cookie("LTP0", "ltp-A"), cookie("dy_auth", "ga")],
      values: { Ex_accountListPassport: storeBefore }
    });
    m.api.addAccountPassport("B2");
    await sleep(40);
    assert.strictEqual(m.values.Ex_accountListPassport, storeBefore,
      "会话属于 A1 时，不得把 A1 的快照写进 B2（也不得顺手刷新 global）");
    assert.ok(m.warnings.some((w) => w.indexOf("与目标账号") !== -1), "必须留一条 warn 说明为何没写");
    const storeAfter = JSON.parse(m.values.Ex_accountListPassport);
    assert.strictEqual(storeAfter.B2[0].value, "ltp-B", "B2 原来那份必须原样留着");
  }

  // ---------- 6.2 addAccountPassport：已有非空记录时，抓不到登录态不许覆盖 ----------
  console.log("--> 6.2 addAccountPassport：本次没抓到 LTP0 时保留原记录");
  {
    const storeBefore = JSON.stringify({ global: [cookie("dy_auth", "g")], "A1": [cookie("LTP0", "ltp-A")] });
    const m = loadAccountModule({
      cookies: [cookie("dy_auth", "g")],          // 只有全局，没有 LTP0（此刻没登录在目标账号上）
      values: { Ex_accountListPassport: storeBefore }
    });
    m.api.addAccountPassport("A1");
    await sleep(40);
    assert.strictEqual(m.values.Ex_accountListPassport, storeBefore, "空快照不得把已有记录抹成空");
    assert.ok(m.warnings.some((w) => w.indexOf("没抓到登录态") !== -1), "必须留一条 warn");
  }

  // ---------- 6.3 addAccountPassport：内容没变就不写（幂等） ----------
  console.log("--> 6.3 addAccountPassport：内容未变时幂等，不重写存储");
  {
    const ltp = cookie("LTP0", "ltp-A");
    const ga = cookie("dy_auth", "g");
    const uidCookie = cookie("acf_uid", "A1");
    const storeBefore = JSON.stringify({ global: [ga, uidCookie], "A1": [ltp] });
    const m = loadAccountModule({
      cookies: [ltp, uidCookie, ga],              // 与存储内容一致（顺序不同也算一致）
      values: { Ex_accountListPassport: storeBefore }
    });
    m.api.addAccountPassport("A1");
    await sleep(40);
    assert.strictEqual(m.values.Ex_accountListPassport, storeBefore, "内容一致时不该再写一遍（update_time 也不该被刷新）");
  }

  // ---------- 6.4 addAccountPassport：首次采集 / 本人会话允许改写 ----------
  console.log("--> 6.4 addAccountPassport：首次采集与本账号刷新必须照常写入");
  {
    const m = loadAccountModule({
      cookies: [cookie("LTP0", "ltp-first"), cookie("dy_auth", "g1")],
      values: {}
    });
    m.api.addAccountPassport("A1");
    await sleep(40);
    const store = JSON.parse(m.values.Ex_accountListPassport || "{}");
    assert.ok(Array.isArray(store["A1"]) && store["A1"][0].value === "ltp-first", "首次采集必须写进该 uid");
    assert.ok(Array.isArray(store.global) && store.global.length === 1, "全局侧必须一起存");
    assert.ok(store.update_time, "写入时必须带 update_time");

    const m2 = loadAccountModule({
      cookies: [cookie("acf_uid", "A1"), cookie("LTP0", "ltp-new")],
      values: { Ex_accountListPassport: JSON.stringify({ global: [], "A1": [cookie("LTP0", "ltp-old")] }) }
    });
    m2.api.addAccountPassport("A1");
    await sleep(40);
    const store2 = JSON.parse(m2.values.Ex_accountListPassport);
    assert.strictEqual(store2["A1"][0].value, "ltp-new", "acf_uid 证明是本人会话时必须刷新为最新快照");
  }

  // ---------- 6.5 switchAccountPassport：只写 cookie 形状的数据 ----------
  console.log("--> 6.5 switchAccountPassport：账本里的垃圾条目不得变成 cookie");
  {
    const m = loadAccountModule({
      cookies: [cookie("LTP0", "old")],
      values: {
        Ex_accountListPassport: JSON.stringify({
          "2001": [{ name: "LTP0", value: "x" }, null, { value: "no-name" }]
        })
      }
    });
    let called = 0;
    m.api.switchAccountPassport("2001", () => { called++; });
    await sleep(50);
    assert.strictEqual(called, 1, "必须回调");
    assert.deepStrictEqual(m.calls.del, ["LTP0"], "当前那条 LTP0 先删掉");
    assert.strictEqual(m.calls.set.length, 1, "只有一条合法 cookie 会被写回，实际 " + m.calls.set.length);
    assert.strictEqual(m.calls.set[0].name, "LTP0", "写回的名字必须是 LTP0，不能是 undefined");
  }

  // ---------- 7. 源码级护栏：四个包的关键守卫不许被改回去 ----------
  console.log("--> 7. 源码级护栏（账号 / 弹幕收藏 / 关注列表 / 背包）");
  const ACC_CODE = stripComments(ACC_SRC);
  const DC_CODE = stripComments(DC_SRC);
  const FL_CODE = stripComments(FL_SRC);
  const BAG_CODE = stripComments(BAG_SRC);
  assert.ok(!/let l = \[\]/.test(ACC_CODE), "switchAccount 不得再把恢复列表写成空数组");
  assert.ok(/account\["data"\]/.test(ACC_CODE), "必须真的读 list[uid].data 写回");
  assert.ok(/cookies\.length === 0/.test(ACC_CODE), "cleanCookie 必须有 0 cookie 的早退兜底");
  assert.ok(/Array\.isArray\(cookies\)/.test(ACC_CODE), "恢复逻辑必须对非数组入参兜底");
  assert.ok(/sessionUid !== "" && sessionUid !== key/.test(ACC_CODE), "addAccountPassport 必须有「会话不是这个账号就不写」的守卫");
  assert.ok(/private_arr\.length === 0/.test(ACC_CODE), "addAccountPassport 必须挡住空快照覆盖");
  assert.ok(/AccountList_sameCookies\(store\[key\]/.test(ACC_CODE), "addAccountPassport 必须有幂等判断");
  assert.ok(/AccountList_cookieList/.test(ACC_CODE), "写回前必须过滤成 cookie 形状");
  assert.ok(/TODO（真机拆包/.test(ACC_SRC), "不确定的 passport 顺序/合并意图必须留 TODO");
  assert.ok(/routers\/router\.js:116-118/.test(ACC_SRC), "TODO 必须指名调用顺序那处 file:line");

  assert.ok(!/querySelector\("\.ChatBarrageCollect-tip"\)\.click\(\)/.test(DC_CODE), "收藏提示的 .click() 必须判空后再点");
  assert.ok(/tries > 120/.test(DC_CODE), "1 秒轮询必须有上限");
  assert.ok(/\} catch \(e\) \{/.test(DC_CODE), "三个 responseHook 的 JSON.parse 必须包 try");

  assert.ok(/\.catch\(/.test(FL_CODE), "getFollowList 必须有 .catch（否则 Promise 永挂、面板空白）");
  assert.ok(/followListHook\.observer/.test(FL_CODE), "DomHook 挂不上时必须继续轮询，不能 clearInterval");
  assert.ok(/读取失败/.test(FL_CODE), "关注列表读不到时必须给用户一句人话");

  assert.ok(/BagInfo_formatExpiry/.test(BAG_CODE), "到期时间必须走格式化函数");
  assert.ok(!/innerHTML = expiry - 1/.test(BAG_CODE), "不得再直接渲染裸时间戳");
  assert.ok(/if \(!chunk \|\| !expiryText\) continue/.test(BAG_CODE), "DOM 格子缺失时必须跳过而不是 insertBefore 抛错");

  console.log("=== 账号管理回归测试 11 个场景全部通过（含 passport 守卫） ===");
}

run().catch((e) => {
  console.error("✗ 账号管理回归测试失败:", e && e.message);
  console.error(e && e.stack);
  process.exit(1);
});
