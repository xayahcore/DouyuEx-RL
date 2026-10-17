/**
 * IndexedDB 归档层专项测试（src/packages/DanmakuArchive/DanmakuArchive_DB.js）
 *
 * 不连网、不碰浏览器：用 devDependency fake-indexeddb 提供标准 IDB 实现，
 * 直接 eval 被测源码顶层 var 拿到每次全新的 ArchiveDB 实例（模块内部状态互不干扰）。
 *
 * 覆盖：
 *   ① open 幂等（重复调用只开一次库 + 三次并发 open 合流）
 *   ② 批量写 1 万条后 stats().events === 10000，统计口径（chat/bytes/日期窗）全对
 *   ③ 同 dedupKey 重复写只入一条，skipped 计数在同批内 / 跨批两处都正确
 *   ④ upsertRoomDay 两次累加不丢（含 observedMin 累加、patch 覆盖语义）
 *   ⑤ queryUserDay 翻页无重复无遗漏，hasMore 在三处边界正确
 *   ⑥ queryRoomDayEvents 按 ts 升序成时间线、limit 生效；listRoomDays 按日取回
 *   ⑦ topUsers 双口径（chat 条数 / gift gfcnt 份数）降序与 limit，昵称统一回查 users 表
 *   ⑧ setMeta/getMeta 往返，stats 的 lastFlush/clockSkew/roomDetail 来源正确
 *   ⑨ prune 删 31 天前明细、room_day 一条不少、prunedDays 累计
 *   ⑩ clearAll 清空所有 store 但保留结构，清空后可继续写
 *   ⑪ putRooms + getRoom 往返、重复写合并（新值覆盖 / 旧字段保留 / 空值不覆盖 / 缺失 ok:false）
 *   ⑫ putUsers 合并语义（cnt 跨批累加、nn 非空覆盖、空串与 null 不覆盖、未传字段保留）
 *   ⑬ countUsers 与写入条数一致、stats().users 跟随、stats().rooms 走 room_day 口径
 *   ⑭ observedMin 进累加字段表：三次 deltas 累加出 3
 *   ⑮ sumRoomDays 闭区间只汇总窗内 3 天，9 个 sum 字段与手算一致，区间外那天被排除
 *   ⑯ sumRoomDays 的 latest 只剩 {lastTs}（nobleCnt 已删），sum 仍是九字段，塞进来的 nobleCnt 被丢弃
 *   ⑰ sumRoomDays 空区间 / 反向区间 / 7 组非法参数：days:0 或 bad-arg，零异常
 *   ⑱ room_day 里没有 minutes / nobleCnt / observedMinSession / sessionStart 四个键（写进去也会被丢弃）
 *   ⑲ prune 保留 7 天：10 天数据只删最旧 3 天，10 行 room_day 一条不少
 *   ⑳ 1 GB 硬上限：usage 超线时按 1000 条/轮从旧到新删，达标即停，最新那条保留
 *   ㉑ counters 与独立全表扫逐项相等（events / chat / gift / enter）
 *   ㉒ prune 扣减后 counters 仍与全表扫相等
 *   ㉓ counters 缺失 → stats() 自动重算并写回
 *   ㉔ seen 分块：1200 个 uid 分布在多块且 getSeen 全取回、重复写 added=0、501 个同分片 uid 溢出到 64 号块
 *   ㉕ putSeen 并发不丢：3 个并发批次各 500 个不同 uid → getSeen 返回 1500 个一个不少
 *   ㉖ putSeen 串行可观测：并发峰值 max=1、added 合计 1500、clearSeenBefore 同链不打架
 *   ㉗ commitBatch 原子性：中途 abort → events / seen / room_day / counters 全部回滚
 *   ㉘ commitBatch 正常路径：200 事件 + 50 seen + 2 roomDay 一次事务全落地，counters 与全表扫一致
 *   ㉙ commitBatch 同 ridDay 多条按数组顺序合并（+5/+5=10，第二轮叠加到 20）
 *   ㉚ 性能微基准：200 事件 + 50 seen + 1 roomDay × 200 轮，3 次事务 vs 1 次事务
 *   ㉛ v1 / v2 → v3 整体重置：7 个 store 全部清空、migrated=full-reset、meta 留 migration 标记、events 4 索引
 *   ㉜ 删除 global.indexedDB 后 20 个入口全部优雅降级、零异常
 *
 * 注：users 表没有 getter API（契约只给 putUsers / countUsers），⑫ 的合并结果靠 readRawStore()
 * 另开一条只读连接从库里直接读回，确保断言看的是真正落盘的记录。
 */

var fs = require("fs");
var path = require("path");
var assert = require("assert");

var SOURCE_PATH = path.join(__dirname, "../src/packages/DanmakuArchive/DanmakuArchive_DB.js");

var fakeIndexedDb = null;
try {
    fakeIndexedDb = require("fake-indexeddb");
} catch (requireError) {
    console.error("✗ 缺少 devDependency fake-indexeddb，请先 npm install");
    process.exit(1);
}

var ROOM_A = "9263298"; /* 实测样本房间：若若跑的贼快 */
var ROOM_B = "71415";   /* 另一间房，用来验证 rid 维度隔离 */
var ROOM_C = "3141592"; /* sumRoomDays 的 latest 语义专用房 */
var ROOM_D = "2718281"; /* sumRoomDays 的区间求和专用房 */
var ROOM_E = "1618033"; /* observedMin 累加专用房 */

/* ---------------- 全局环境：装一套可计数的 indexedDB ---------------- */

var mainFactory = new fakeIndexedDb.IDBFactory();
var openTracker = { calls: 0 };

global.IDBKeyRange = fakeIndexedDb.IDBKeyRange;

function installIndexedDb(factory, tracker) {
    global.indexedDB = {
        open: function (databaseName, version) {
            if (tracker) tracker.calls += 1;
            return factory.open(databaseName, version);
        },
        deleteDatabase: function (databaseName) {
            return factory.deleteDatabase(databaseName);
        }
    };
}

installIndexedDb(mainFactory, openTracker);

/* ---------------- 载入被测源码 ---------------- */

function loadArchiveModule() {
    var source = fs.readFileSync(SOURCE_PATH, "utf8");
    /* function 体里 eval 顶层 var，返回模块对外对象；每次调用都是全新内部状态。 */
    var factory = new Function(source + "\n;return ArchiveDB;");
    return factory();
}

/* ---------------- 极简测试骨架（ES5 + Promise 链） ---------------- */

var passedCount = 0;
var chain = Promise.resolve();
var archiveApi = null;

function ok(message) {
    passedCount += 1;
    console.log("  ✓ " + message);
}

function step(title, runner) {
    chain = chain.then(function () {
        console.log("· " + title);
        return runner();
    });
}

/* ---------------- 测试数据工具 ---------------- */

function pad2(value) {
    return value < 10 ? "0" + value : String(value);
}

function dayKeyOfTimestamp(timestamp) {
    var moment = new Date(timestamp);
    return moment.getFullYear() + "-" + pad2(moment.getMonth() + 1) + "-" + pad2(moment.getDate());
}

function dayKeyDaysAgo(daysAgo) {
    var moment = new Date();
    moment.setHours(0, 0, 0, 0);
    moment.setDate(moment.getDate() - daysAgo);
    return dayKeyOfTimestamp(moment.getTime());
}

var TODAY_KEY = dayKeyOfTimestamp(Date.now());
var NOW_TIMESTAMP = Date.now();

function makeChatEvent(uid, dayKey, sequence, nickName) {
    return {
        dedupKey: "c:" + uid + ":" + dayKey + ":" + sequence,
        kind: "chat",
        uid: String(uid),
        nn: nickName || "昵称" + uid,
        rid: ROOM_A,
        ts: NOW_TIMESTAMP - 600000 + sequence,
        dayKey: dayKey,
        txt: "第 " + sequence + " 条弹幕",
        level: "45",
        nl: "0",
        bl: "26",
        bnn: "小僵尸",
        brid: "71415",
        ic: "",
        sahf: "0",
        pg: "1",
        rg: "0"
    };
}

function makeGiftEvent(uid, dayKey, giftId, batchCount, giftCount, nickName) {
    return {
        dedupKey: "g:" + uid + ":" + giftId + ":" + batchCount,
        kind: "gift",
        uid: String(uid),
        nn: nickName || "昵称" + uid,
        rid: ROOM_A,
        ts: NOW_TIMESTAMP - 600000 + batchCount,
        dayKey: dayKey,
        txt: "送出 " + giftCount + " 个礼物",
        gfid: String(giftId),
        gfn: "办卡",
        gfcnt: giftCount,
        hits: giftCount,
        bcnt: batchCount,
        bg: 0,
        bf: 1,
        receiveUid: "9999"
    };
}

function makeEnterEvent(uid, dayKey, sequence) {
    return {
        dedupKey: "e:" + uid + ":" + (NOW_TIMESTAMP + sequence),
        kind: "enter",
        uid: String(uid),
        nn: "进场" + uid,
        rid: ROOM_A,
        ts: NOW_TIMESTAMP + sequence,
        dayKey: dayKey,
        level: "12",
        nl: "0"
    };
}

function hasNavigatorStorage() {
    if (typeof navigator === "undefined" || !navigator) return false;
    if (!navigator.storage) return false;
    return typeof navigator.storage.estimate === "function";
}

/**
 * 绕过模块直接读一条记录：users 表没有 getter API（契约只给了 putUsers / countUsers），
 * 合并语义必须从库里眼见为实，所以测试另开一条只读连接把落盘结果捞出来看。
 */
function readRawStore(storeName, key) {
    return new Promise(function (resolve, reject) {
        var openRequest = global.indexedDB.open("DouyuExArchive");
        openRequest.onupgradeneeded = function () {
            /* 结构已由模块建好，正常不会走到这里；走到就说明建表口径变了 */
        };
        openRequest.onerror = function () { reject(openRequest.error); };
        openRequest.onsuccess = function () {
            var database = openRequest.result;
            var transaction = database.transaction([storeName], "readonly");
            var getRequest = transaction.objectStore(storeName).get(key);
            getRequest.onsuccess = function () { resolve(getRequest.result || null); };
            getRequest.onerror = function () { reject(getRequest.error); };
            transaction.oncomplete = function () { database.close(); };
            transaction.onabort = function () { database.close(); };
        };
    });
}

/* 直接往 store 里塞一条手工记录（用来伪造「老版本数据」） */
function writeRawRecord(storeName, record) {
    return new Promise(function (resolve, reject) {
        var openRequest = global.indexedDB.open("DouyuExArchive");
        openRequest.onerror = function () { reject(openRequest.error); };
        openRequest.onsuccess = function () {
            var database = openRequest.result;
            var transaction = database.transaction([storeName], "readwrite");
            transaction.objectStore(storeName).put(record);
            transaction.oncomplete = function () { database.close(); resolve(true); };
            transaction.onabort = function () { database.close(); reject(transaction.error); };
        };
    });
}

/* 直接删掉 meta 里的一条键（伪造「counters 缺失的老库」） */
function deleteRawMetaKey(metaKey) {
    return new Promise(function (resolve, reject) {
        var openRequest = global.indexedDB.open("DouyuExArchive");
        openRequest.onerror = function () { reject(openRequest.error); };
        openRequest.onsuccess = function () {
            var database = openRequest.result;
            var transaction = database.transaction(["meta"], "readwrite");
            transaction.objectStore("meta").delete(metaKey);
            transaction.oncomplete = function () { database.close(); resolve(true); };
            transaction.onabort = function () { database.close(); reject(transaction.error); };
        };
    });
}

/**
 * 独立 oracle：自己开一条只读连接把 events 全表扫一遍，数出 events/chat/gift/enter。
 * 模块的 stats() 走 meta 计数器，这里用「真扫一遍」当对照，两边必须完全相等。
 */
function scanEventCounters() {
    return new Promise(function (resolve, reject) {
        var openRequest = global.indexedDB.open("DouyuExArchive");
        openRequest.onerror = function () { reject(openRequest.error); };
        openRequest.onsuccess = function () {
            var database = openRequest.result;
            var transaction = database.transaction(["events"], "readonly");
            var counts = { events: 0, chat: 0, gift: 0, enter: 0 };
            var cursorRequest = transaction.objectStore("events").openCursor();
            cursorRequest.onsuccess = function () {
                var cursor = cursorRequest.result;
                if (!cursor) return;
                var record = cursor.value || {};
                counts.events += 1;
                if (record.kind === "gift") counts.gift += 1;
                else if (record.kind === "enter") counts.enter += 1;
                else counts.chat += 1;
                cursor.continue();
            };
            transaction.oncomplete = function () { database.close(); resolve(counts); };
            transaction.onabort = function () { database.close(); reject(transaction.error); };
        };
    });
}

/* 直接读 seen 表里某 scope+dayKey 的所有块记录（验证分块结构，不看模块的合并结果） */
function readRawSeenChunks(scopeText, dayKeyText) {
    return new Promise(function (resolve, reject) {
        var openRequest = global.indexedDB.open("DouyuExArchive");
        openRequest.onerror = function () { reject(openRequest.error); };
        openRequest.onsuccess = function () {
            var database = openRequest.result;
            var transaction = database.transaction(["seen"], "readonly");
            var chunks = [];
            var index = transaction.objectStore("seen").index("scope_dayKey");
            var cursorRequest = index.openCursor(IDBKeyRange.only([scopeText, dayKeyText]));
            cursorRequest.onsuccess = function () {
                var cursor = cursorRequest.result;
                if (!cursor) return;
                chunks.push(cursor.value);
                cursor.continue();
            };
            transaction.oncomplete = function () { database.close(); resolve(chunks); };
            transaction.onabort = function () { database.close(); reject(transaction.error); };
        };
    });
}

/* 数一下所有 store 的记录数（升级前后对比用） */
var ALL_STORE_NAMES = ["events", "room_day", "rooms", "users", "gifts", "seen", "meta"];

function countAllStores(factory) {
    return new Promise(function (resolve, reject) {
        var openRequest = factory.open("DouyuExArchive");
        openRequest.onerror = function () { reject(openRequest.error); };
        openRequest.onsuccess = function () {
            var database = openRequest.result;
            var counts = {};
            var transaction = database.transaction(ALL_STORE_NAMES, "readonly");
            ALL_STORE_NAMES.forEach(function (storeName) {
                var request = transaction.objectStore(storeName).count();
                request.onsuccess = function () { counts[storeName] = request.result; };
            });
            transaction.oncomplete = function () { database.close(); resolve(counts); };
            transaction.onabort = function () { database.close(); reject(transaction.error); };
        };
    });
}

function formatStoreCounts(counts) {
    return ALL_STORE_NAMES.map(function (storeName) {
        return storeName + "=" + (counts[storeName] === undefined ? "?" : counts[storeName]);
    }).join(" ");
}

/* 假的 navigator.storage：让 stats()/prune() 走 estimate().usage 这条路径 */
var savedNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");

function installFakeStorage(getUsageBytes) {
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: {
            storage: {
                estimate: function () {
                    return Promise.resolve({
                        usage: getUsageBytes(),
                        quota: 8 * 1024 * 1024 * 1024
                    });
                }
            }
        }
    });
}

function restoreNavigator() {
    if (savedNavigatorDescriptor) {
        Object.defineProperty(globalThis, "navigator", savedNavigatorDescriptor);
    } else {
        delete globalThis.navigator;
    }
}

/* ==================== 用例 ==================== */

step("① open 幂等：重复调用只开一次库，三次并发 open 合流", function () {
    archiveApi = loadArchiveModule();
    return archiveApi.open().then(function (first) {
        assert.deepStrictEqual(first, { ok: true }, "首次 open 必须 resolve {ok:true}");
        return archiveApi.open();
    }).then(function (second) {
        assert.deepStrictEqual(second, { ok: true }, "再次 open 仍然 {ok:true}");
        assert.strictEqual(openTracker.calls, 1, "重复 open 不能重新调 indexedDB.open");

        /* 并发合流：换一套独立存储 + 独立计数工厂，三次并发 open 只能开一次库 */
        var concurrentFactory = new fakeIndexedDb.IDBFactory();
        var concurrentTracker = { calls: 0 };
        installIndexedDb(concurrentFactory, concurrentTracker);
        var concurrentModule = loadArchiveModule();
        return Promise.all([
            concurrentModule.open(),
            concurrentModule.open(),
            concurrentModule.open()
        ]).then(function (results) {
            results.forEach(function (result) {
                assert.deepStrictEqual(result, { ok: true }, "并发 open 每次都要 {ok:true}");
            });
            assert.strictEqual(concurrentTracker.calls, 1, "并发 open 必须合流到同一次 indexedDB.open");
            installIndexedDb(mainFactory, openTracker);
            ok("重复 open 复用连接（open 调用次数 1），三次并发 open 也只落一次 indexedDB.open");
        });
    });
});

step("② 批量写 1 万条后 stats().events 精确等于 10000", function () {
    var bulk = [];
    var index;
    for (index = 0; index < 10000; index += 1) {
        bulk.push(makeChatEvent("9" + index % 500, TODAY_KEY, index));
    }
    return archiveApi.putEvents(bulk).then(function (result) {
        assert.strictEqual(result.ok, true, "putEvents 必须 ok");
        assert.strictEqual(result.added, 10000, "1 万条必须全部入库");
        assert.strictEqual(result.skipped, 0, "全新 dedupKey 不该有跳过");
        return archiveApi.stats();
    }).then(function (stats) {
        assert.strictEqual(stats.ok, true);
        assert.strictEqual(stats.events, 10000, "stats().events 必须等于 10000");
        assert.strictEqual(stats.chatEvents, 10000);
        assert.strictEqual(stats.giftEvents, 0);
        assert.strictEqual(stats.enterEvents, 0);
        assert.strictEqual(stats.windowDays, 7, "明细保留期已改为 7 天");
        assert.strictEqual(stats.oldestDay, TODAY_KEY);
        assert.strictEqual(stats.newestDay, TODAY_KEY);
        assert.ok(stats.bytes > 0, "bytes 必须给出一个正数");
        if (!hasNavigatorStorage()) {
            assert.strictEqual(stats.bytes, 10000 * 120, "没有 navigator.storage 时必须退化成 events×120");
        }
        ok("1 万条分 10 个事务写入 added=10000，stats().events/chatEvents/windowDays/日期窗全部对上");
    });
});

step("③ 同 dedupKey 重复写只入一条，skipped 计数正确", function () {
    var duplicateDay = dayKeyDaysAgo(1);
    var sharedKey = "c:dup-" + NOW_TIMESTAMP;
    var firstEvent = makeChatEvent("1001", duplicateDay, 1);
    var secondEvent = makeChatEvent("1001", duplicateDay, 2);
    var thirdEvent = makeChatEvent("1002", duplicateDay, 3);
    firstEvent.dedupKey = sharedKey;
    secondEvent.dedupKey = sharedKey; /* 同批内重复 */

    return archiveApi.putEvents([firstEvent, secondEvent, thirdEvent]).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.added, 2, "同批内撞 dedupKey 只能入一条");
        assert.strictEqual(result.skipped, 1, "同批内的重复要计入 skipped");
        return archiveApi.putEvents([firstEvent, secondEvent, thirdEvent]);
    }).then(function (result) {
        assert.strictEqual(result.ok, true, "整批重复不能让事务失败");
        assert.strictEqual(result.added, 0, "都已在库：一条都不该新增");
        assert.strictEqual(result.skipped, 3, "跨批重复三条全部计入 skipped");
        return archiveApi.queryUserDay("1001", duplicateDay, { offset: 0, limit: 10 });
    }).then(function (page) {
        assert.strictEqual(page.list.length, 1, "同 dedupKey 在库里只能有一条");
        assert.strictEqual(page.list[0].dedupKey, sharedKey);
        return archiveApi.stats();
    }).then(function (stats) {
        assert.strictEqual(stats.events, 10002, "1 万 + 2 条（重复一条都没进）");
        ok("dedupKey 冲突跳过：同批内 skipped=1、跨批 skipped=3，库里只留一条");
    });
});

step("④ upsertRoomDay 两次累加不丢，patch 覆盖普通字段", function () {
    var ridDay = ROOM_A + "|" + TODAY_KEY;
    return archiveApi.upsertRoomDay(ridDay, { rid: ROOM_A, dayKey: TODAY_KEY, bagCnt: 12 }, {
        danmakuCnt: 12,
        incomeCents: 1000,
        giftCnt: 3,
        activeUv: 5,
        observedMin: 4
    }).then(function (first) {
        assert.strictEqual(first.ok, true);
        assert.strictEqual(first.roomDay.danmakuCnt, 12);
        return archiveApi.upsertRoomDay(ridDay, { rid: ROOM_A, dayKey: TODAY_KEY, bagCnt: 13 }, {
            danmakuCnt: 8,
            incomeCents: 500,
            giftCnt: 2,
            activeUv: 2,
            observedMin: 3
        });
    }).then(function (second) {
        assert.strictEqual(second.ok, true);
        var roomDay = second.roomDay;
        assert.strictEqual(roomDay.danmakuCnt, 20, "两次 danmakuCnt 必须累加而不是覆盖");
        assert.strictEqual(roomDay.incomeCents, 1500);
        assert.strictEqual(roomDay.giftCnt, 5);
        assert.strictEqual(roomDay.activeUv, 7);
        assert.strictEqual(roomDay.observedMin, 7, "observedMin 同样走累加语义");
        assert.strictEqual(roomDay.bagCnt, 13, "patch 里的 bagCnt 是覆盖语义");
        assert.strictEqual(roomDay.paidUv, 0, "没传过的数值字段按 0 起步");
        assert.strictEqual(roomDay.ridDay, ridDay);
        assert.strictEqual(roomDay.rid, ROOM_A);
        assert.strictEqual(roomDay.dayKey, TODAY_KEY);
        assert.ok(roomDay.updatedAt > 0, "updatedAt 必须刷新");
        return archiveApi.getRoomDay(ROOM_A, TODAY_KEY);
    }).then(function (roomDay) {
        assert.ok(roomDay, "getRoomDay 必须读回刚才那行");
        assert.strictEqual(roomDay.danmakuCnt, 20);
        ok("upsertRoomDay 单事务读改写：deltas 累加（含 observedMin）、patch 覆盖、getRoomDay 可读回");
    });
});

step("⑤ queryUserDay 翻页与 hasMore 边界", function () {
    var uid = "5551234";
    var pagingDay = dayKeyDaysAgo(2);
    var batch = [];
    var index;
    for (index = 0; index < 7; index += 1) batch.push(makeChatEvent(uid, pagingDay, index));

    return archiveApi.putEvents(batch).then(function () {
        return archiveApi.queryUserDay(uid, pagingDay, { offset: 0, limit: 3 });
    }).then(function (pageOne) {
        assert.strictEqual(pageOne.ok, true);
        assert.strictEqual(pageOne.list.length, 3);
        assert.strictEqual(pageOne.hasMore, true, "后面还有第 4 条 → hasMore 必须 true");
        return archiveApi.queryUserDay(uid, pagingDay, { offset: 3, limit: 3 }).then(function (pageTwo) {
            assert.strictEqual(pageTwo.list.length, 3);
            assert.strictEqual(pageTwo.hasMore, true);
            var seenKeys = {};
            pageOne.list.concat(pageTwo.list).forEach(function (event) {
                seenKeys[event.dedupKey] = true;
            });
            assert.strictEqual(Object.keys(seenKeys).length, 6, "两页之间不能有重复");
            return archiveApi.queryUserDay(uid, pagingDay, { offset: 6, limit: 3 });
        });
    }).then(function (pageThree) {
        assert.strictEqual(pageThree.list.length, 1, "第 7 条");
        assert.strictEqual(pageThree.hasMore, false, "刚好吃到最后一条 → hasMore 必须 false");
        return archiveApi.queryUserDay(uid, pagingDay, { offset: 7, limit: 3 });
    }).then(function (overflow) {
        assert.strictEqual(overflow.list.length, 0);
        assert.strictEqual(overflow.hasMore, false, "offset 越界 → 空列表且 hasMore false");
        return archiveApi.queryUserDay(uid, pagingDay, {});
    }).then(function (defaults) {
        assert.strictEqual(defaults.list.length, 7, "默认 limit=50 应该一次取全");
        assert.strictEqual(defaults.hasMore, false);
        assert.strictEqual(defaults.list[0].uid, uid, "只能取到目标 uid 的弹幕");
        ok("翻页 3+3+1 无重复无遗漏，hasMore 在「还有 / 刚好取完 / 越界」三处都正确，默认 limit=50");
    });
});

step("⑥ queryRoomDayEvents 时间线 + listRoomDays 按日取回", function () {
    var eventsDay = dayKeyDaysAgo(3);
    var baseTimestamp = NOW_TIMESTAMP - 3600000;
    var batch = [];
    var index;
    for (index = 0; index < 5; index += 1) {
        var event = makeChatEvent(String(8000 + index), eventsDay, index);
        event.rid = ROOM_B;
        /* 故意倒序写：验证读出来是按 ts 升序的时间线 */
        event.ts = baseTimestamp + (4 - index) * 1000;
        batch.push(event);
    }

    return archiveApi.putEvents(batch).then(function () {
        return archiveApi.queryRoomDayEvents(ROOM_B, eventsDay, { limit: 500 });
    }).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.list.length, 5);
        var cursorIndex;
        for (cursorIndex = 1; cursorIndex < result.list.length; cursorIndex += 1) {
            assert.ok(result.list[cursorIndex - 1].ts <= result.list[cursorIndex].ts, "序列必须按 ts 升序");
        }
        assert.strictEqual(result.list[0].rid, ROOM_B, "只能取到本房间的事件");
        return archiveApi.queryRoomDayEvents(ROOM_B, eventsDay, { limit: 2 });
    }).then(function (capped) {
        assert.strictEqual(capped.list.length, 2, "limit 必须生效");
        return archiveApi.upsertRoomDay(ROOM_B + "|" + eventsDay, { rid: ROOM_B, dayKey: eventsDay }, { danmakuCnt: 5 });
    }).then(function () {
        return archiveApi.listRoomDays(eventsDay);
    }).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.list.length, 1, "这一天只有 ROOM_B 有汇总行");
        assert.strictEqual(result.list[0].rid, ROOM_B);
        assert.strictEqual(result.list[0].danmakuCnt, 5);
        ok("queryRoomDayEvents 倒序写入后按 ts 升序成时间线且 limit 生效，listRoomDays 走 dayKey 索引取回汇总");
    });
});

step("⑦ topUsers：chat 计条数、gift 计 gfcnt 份数，昵称回查 users 表", function () {
    var rankingDay = dayKeyDaysAgo(4);
    var batch = [];
    var chatCounts = { "2001": 3, "2002": 5, "2003": 1 };
    Object.keys(chatCounts).forEach(function (uid) {
        var index;
        for (index = 0; index < chatCounts[uid]; index += 1) {
            batch.push(makeChatEvent(uid, rankingDay, index, "观众" + uid));
        }
    });
    batch.push(makeGiftEvent("2001", rankingDay, "268", 3, 6, "观众2001"));
    batch.push(makeGiftEvent("2001", rankingDay, "268", 4, 4, "观众2001"));
    batch.push(makeGiftEvent("2002", rankingDay, "268", 5, 2, "观众2002"));

    return archiveApi.putEvents(batch).then(function (result) {
        assert.strictEqual(result.added, 12, "9 条弹幕 + 3 条礼物（2001 的两批 bcnt 不同 → dedupKey 不同）");
        /* 事件里已经不带 nn 了：昵称必须靠 users 表回查补上 */
        return archiveApi.putUsers([
            { uid: "2001", nn: "榜一老哥", cnt: 1 },
            { uid: "2002", nn: "榜二大哥", cnt: 1 }
        ]);
    }).then(function () {
        return archiveApi.topUsers(ROOM_A, rankingDay, "chat", 10);
    }).then(function (chatRanking) {
        assert.strictEqual(chatRanking.ok, true);
        assert.deepStrictEqual(
            chatRanking.list.map(function (item) { return item.uid; }),
            ["2002", "2001", "2003"],
            "chat 榜按条数降序"
        );
        assert.strictEqual(chatRanking.list[0].value, 5);
        assert.strictEqual(chatRanking.list[0].nn, "榜二大哥", "昵称从 users 表回查补上（事件里没有 nn）");
        assert.strictEqual(chatRanking.list[1].nn, "榜一老哥");
        assert.strictEqual(chatRanking.list[2].nn, "", "users 表里没有的 uid → 空串，不是 undefined");
        return archiveApi.topUsers(ROOM_A, rankingDay, "gift", 10);
    }).then(function (giftRanking) {
        assert.strictEqual(giftRanking.ok, true);
        assert.strictEqual(giftRanking.list.length, 2, "只有两个人送过礼物");
        assert.deepStrictEqual(
            giftRanking.list.map(function (item) { return item.uid; }),
            ["2001", "2002"],
            "gift 榜按份数降序"
        );
        assert.strictEqual(giftRanking.list[0].value, 10, "gift 计 gfcnt 份数：6+4=10（不是 2 条记录）");
        assert.strictEqual(giftRanking.list[1].value, 2);
        return archiveApi.topUsers(ROOM_A, rankingDay, "chat", 2);
    }).then(function (capped) {
        assert.strictEqual(capped.list.length, 2, "limit 必须截断榜单");
        ok("topUsers 双口径（chat 条数 5>3>1 / gift 份数 10>2）降序正确、limit 生效、昵称统一回查 users 表");
    });
});

step("⑧ setMeta/getMeta 往返，stats 的 lastFlush/clockSkew/roomDetail 来源正确", function () {
    return archiveApi.setMeta("lastFlush", 1792202447034).then(function (result) {
        assert.strictEqual(result.ok, true);
        return archiveApi.setMeta("clockSkew", -1200);
    }).then(function () {
        return archiveApi.getMeta("lastFlush");
    }).then(function (value) {
        assert.strictEqual(value, 1792202447034, "getMeta 要读回写入的数字");
        return archiveApi.getMeta("从来没有写过的键");
    }).then(function (value) {
        assert.strictEqual(value, null, "没写过的键 resolve null（不抛）");
        return archiveApi.stats();
    }).then(function (stats) {
        assert.strictEqual(stats.lastFlush, 1792202447034, "stats().lastFlush 来自 meta");
        assert.strictEqual(stats.clockSkew, -1200, "stats().clockSkew 来自 meta");
        assert.ok(stats.roomDetail.length >= 2, "roomDetail 至少两间房");
        var roomIds = stats.roomDetail.map(function (item) { return item.rid; });
        assert.ok(roomIds.indexOf(ROOM_A) >= 0 && roomIds.indexOf(ROOM_B) >= 0, "roomDetail 要覆盖两间房");
        stats.roomDetail.forEach(function (item) {
            assert.strictEqual(typeof item.days, "number");
            assert.ok(item.days >= 1, "每个房间至少 1 天");
        });
        ok("meta 往返正确、stats 的 lastFlush/clockSkew 取自 meta、roomDetail 按 rid 汇总天数");
    });
});

step("⑨ prune 删 31 天前明细，room_day 一条不少", function () {
    var oldDayKey = dayKeyDaysAgo(31);
    var freshDayKey = dayKeyDaysAgo(1);
    /* 过期样本走 ROOM_A、窗口内样本走 ROOM_B，各自那天都只有这两三条，断言才精确。 */
    var freshEventA = makeChatEvent("3201", freshDayKey, 4);
    var freshEventB = makeChatEvent("3202", freshDayKey, 5);
    freshEventA.rid = ROOM_B;
    freshEventB.rid = ROOM_B;
    var batch = [
        makeChatEvent("3101", oldDayKey, 1),
        makeChatEvent("3102", oldDayKey, 2),
        makeEnterEvent("3103", oldDayKey, 3),
        freshEventA,
        freshEventB
    ];

    return archiveApi.putEvents(batch).then(function (result) {
        assert.strictEqual(result.added, 5, "5 条明细全部入库");
        return archiveApi.upsertRoomDay(
            ROOM_A + "|" + oldDayKey,
            { rid: ROOM_A, dayKey: oldDayKey },
            { danmakuCnt: 3, enterUv: 1 }
        );
    }).then(function (roomDayResult) {
        assert.strictEqual(roomDayResult.ok, true);
        return archiveApi.stats();
    }).then(function (before) {
        return archiveApi.prune().then(function (pruneResult) {
            assert.strictEqual(pruneResult.ok, true);
            assert.strictEqual(pruneResult.removedEvents, 3, "31 天前的 3 条明细必须删掉");
            assert.strictEqual(pruneResult.removedDays, 1, "只有 1 个过期 dayKey");
            return archiveApi.stats().then(function (after) {
                assert.strictEqual(after.events, before.events - 3, "只少了 3 条");
                assert.strictEqual(after.prunedDays, 1, "prunedDays 要累计到 meta");
            });
        });
    }).then(function () {
        return archiveApi.queryRoomDayEvents(ROOM_A, oldDayKey, { limit: 100 });
    }).then(function (oldEvents) {
        assert.strictEqual(oldEvents.list.length, 0, "过期明细一条不留");
        return archiveApi.listRoomDays(oldDayKey);
    }).then(function (oldRoomDays) {
        assert.strictEqual(oldRoomDays.list.length, 1, "room_day 不参与裁剪，必须还在");
        assert.strictEqual(oldRoomDays.list[0].danmakuCnt, 3, "room_day 的内容也不能被动过");
        return archiveApi.queryRoomDayEvents(ROOM_B, dayKeyDaysAgo(1), { limit: 100 });
    }).then(function (freshEvents) {
        assert.strictEqual(freshEvents.list.length, 2, "窗口内的明细必须原样保留");
        ok("prune 删 31 天前明细（removedEvents=3 / removedDays=1）、窗口内明细与 room_day 全保留、prunedDays 累计");
    });
});

step("⑩ clearAll 清空所有 store（结构保留、可继续写）", function () {
    return archiveApi.clearAll().then(function (result) {
        assert.strictEqual(result.ok, true);
        return archiveApi.stats();
    }).then(function (stats) {
        assert.strictEqual(stats.events, 0, "events 必须清空");
        assert.strictEqual(stats.chatEvents, 0);
        assert.strictEqual(stats.roomDetail.length, 0, "room_day 必须清空");
        assert.strictEqual(stats.lastFlush, 0, "meta 也必须清空");
        return archiveApi.getRoomDay(ROOM_A, TODAY_KEY);
    }).then(function (roomDay) {
        assert.strictEqual(roomDay, null, "清空后读不到任何 room_day");
        return archiveApi.putEvents([makeChatEvent("777", TODAY_KEY, 1)]);
    }).then(function (result) {
        assert.strictEqual(result.added, 1, "clearAll 之后必须还能写（store 结构没被删）");
        return archiveApi.stats();
    }).then(function (stats) {
        assert.strictEqual(stats.events, 1);
        ok("clearAll 后各 store 归零、meta 清空，结构保留且可以继续写入");
    });
});

step("⑪ putRooms 批量写入 + getRoom 往返，重复写合并不丢旧字段", function () {
    var firstRoom = {
        rid: ROOM_A,
        roomName: "若若跑的贼快",
        cate: "绝地求生",
        showStatus: "1",
        fans: 12000,
        upId: "up-id-1",
        updatedAt: 1000
    };
    /* 第二间房只写 rooms 表、不写 room_day：用来区分 stats().rooms 的口径来源 */
    var secondRoom = { rid: "8888001", roomName: "第三间房", fans: 1, updatedAt: 1000 };

    return archiveApi.putRooms([firstRoom, secondRoom]).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.added, 2, "两间新房都是新增");
        assert.strictEqual(result.updated, 0);
        return archiveApi.getRoom(ROOM_A);
    }).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.room.roomName, "若若跑的贼快");
        assert.strictEqual(result.room.fans, 12000);
        /* 第二次只给部分字段：没传的旧字段必须留着 */
        return archiveApi.putRooms([{ rid: ROOM_A, roomName: "若若跑了但很快", fans: 13000, updatedAt: 2000 }]);
    }).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.added, 0, "已存在的 rid 不算新增");
        assert.strictEqual(result.updated, 1, "已存在的 rid 记为 updated");
        return archiveApi.getRoom(ROOM_A);
    }).then(function (result) {
        var room = result.room;
        assert.strictEqual(room.roomName, "若若跑了但很快", "新值覆盖旧值");
        assert.strictEqual(room.fans, 13000);
        assert.strictEqual(room.cate, "绝地求生", "没传的旧字段不能丢");
        assert.strictEqual(room.upId, "up-id-1", "没传的旧字段不能丢");
        assert.strictEqual(room.updatedAt, 2000);
        /* 空值不覆盖：空串 / null 都不该抹掉已有内容 */
        return archiveApi.putRooms([{ rid: ROOM_A, roomName: "", cate: null, fans: 0 }]);
    }).then(function () {
        return archiveApi.getRoom(ROOM_A);
    }).then(function (result) {
        var room = result.room;
        assert.strictEqual(room.roomName, "若若跑了但很快", "空字符串不覆盖已有值");
        assert.strictEqual(room.cate, "绝地求生", "null 不覆盖已有值");
        assert.strictEqual(room.fans, 0, "0 是有效值，要覆盖（空值判定只认 undefined/null/空串）");
        return archiveApi.getRoom("根本不存在的房间");
    }).then(function (missing) {
        assert.strictEqual(missing.ok, false, "查不到的房间要 ok:false");
        assert.strictEqual(missing.room, null);
        ok("putRooms/getRoom：批量 upsert、add/update 计数正确、合并不丢旧字段、空值不覆盖、缺失 ok:false");
    });
});

step("⑫ putUsers 合并语义：cnt 累加、nn 被新值覆盖、空值不覆盖", function () {
    return archiveApi.putUsers([{
        uid: "9001",
        nn: "老昵称",
        level: 45,
        bl: 26,
        bnn: "小僵尸",
        brid: "71415",
        ic: "头像-a",
        lastSeen: 1000,
        cnt: 3
    }]).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.added, 1, "首次写入是新增");
        assert.strictEqual(result.updated, 0);
        /* 同批里同 uid 两条：先内存合并再落库，cnt 必须 4+2=6 */
        return archiveApi.putUsers([
            { uid: "9001", nn: "新昵称", cnt: 4, lastSeen: 2000 },
            { uid: "9001", nn: "", cnt: 2, ic: null }
        ]);
    }).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.added, 0);
        assert.strictEqual(result.updated, 1, "同批重复的 uid 合并成一条，只算一次 update");
        return readRawStore("users", "9001");
    }).then(function (record) {
        assert.ok(record, "users/9001 必须真的落库");
        assert.strictEqual(record.cnt, 9, "cnt 累加：3 + 4 + 2 = 9");
        assert.strictEqual(record.nn, "新昵称", "非空新昵称覆盖旧昵称，空串不覆盖");
        assert.strictEqual(record.lastSeen, 2000, "lastSeen 按非空字段覆盖");
        assert.strictEqual(record.level, 45, "没传的旧字段不能丢");
        assert.strictEqual(record.bnn, "小僵尸", "没传的旧字段不能丢");
        assert.strictEqual(record.ic, "头像-a", "null 不覆盖已有值");
        assert.strictEqual(record.uid, "9001", "主键要保持字符串形态");
        ok("putUsers 合并：cnt 跨批累加 3+4+2=9、nn 非空覆盖、空串/null 不覆盖、未传字段保留");
    });
});

step("⑬ countUsers 与写入条数一致，stats().users / stats().rooms 跟随口径", function () {
    return archiveApi.putUsers([
        { uid: "9002", nn: "甲", cnt: 1 },
        { uid: "9003", nn: "乙", cnt: 1 }
    ]).then(function (result) {
        assert.strictEqual(result.added, 2);
        return archiveApi.countUsers();
    }).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.count, 3, "9001/9002/9003 共 3 个不同 uid");
        /* stats().rooms 的口径是 room_day 的 distinct rid，这里只造 1 间房的 room_day，
         * 而 rooms 表里有 2 条记录 —— 两者不同才能证明取的是 room_day 口径。 */
        return archiveApi.upsertRoomDay(ROOM_B + "|" + TODAY_KEY, { rid: ROOM_B, dayKey: TODAY_KEY }, { danmakuCnt: 1 });
    }).then(function () {
        return archiveApi.stats();
    }).then(function (stats) {
        assert.strictEqual(stats.users, 3, "stats().users 必须等于 countUsers()");
        assert.strictEqual(stats.rooms, 1, "stats().rooms = room_day 的 distinct rid 数（不是 rooms 表记录数 2）");
        assert.strictEqual(stats.rooms, stats.roomDetail.length, "rooms 与 roomDetail 同口径");
        return archiveApi.putUsers([{ uid: "9004", nn: "丙", cnt: 1 }]);
    }).then(function () {
        return archiveApi.countUsers();
    }).then(function (result) {
        assert.strictEqual(result.count, 4, "新用户后 count 变 4");
        return archiveApi.stats();
    }).then(function (stats) {
        assert.strictEqual(stats.users, 4, "stats().users 立刻跟随新写入");
        ok("countUsers 数得准（3 → 4）且不扫事件表；stats().users 跟随、stats().rooms 走 room_day 口径");
    });
});

step("⑭ observedMin 走 deltas 累加：三次 +1 → 3", function () {
    var observedRidDay = ROOM_E + "|" + TODAY_KEY;
    return archiveApi.upsertRoomDay(observedRidDay, { rid: ROOM_E, dayKey: TODAY_KEY }, {
        danmakuCnt: 4,
        observedMin: 1
    }).then(function (first) {
        assert.strictEqual(first.ok, true);
        assert.strictEqual(first.roomDay.observedMin, 1, "首次 deltas.observedMin=1");
        return archiveApi.upsertRoomDay(observedRidDay, { rid: ROOM_E, dayKey: TODAY_KEY }, { observedMin: 1 });
    }).then(function (second) {
        assert.strictEqual(second.roomDay.observedMin, 2, "第二次累加到 2");
        return archiveApi.upsertRoomDay(observedRidDay, { rid: ROOM_E, dayKey: TODAY_KEY }, { observedMin: 1 });
    }).then(function () {
        return archiveApi.getRoomDay(ROOM_E, TODAY_KEY);
    }).then(function (roomDay) {
        assert.ok(roomDay, "room_day 必须读得回来");
        assert.strictEqual(roomDay.observedMin, 3, "三次 deltas.observedMin=1 必须累加出 3");
        assert.strictEqual(roomDay.danmakuCnt, 4, "同事务里的其它 deltas 不受影响");
        assert.strictEqual(roomDay.paidUv, 0, "没传过的字段仍然是 0 起步");
        ok("observedMin 进累加字段表：三次 deltas 累加 = 3，与 danmakuCnt 同一语义");
    });
});

step("⑮ sumRoomDays 只汇总区间内的天：3 天在窗内、10 天前那天被排除", function () {
    var dayToday = TODAY_KEY;
    var dayYesterday = dayKeyDaysAgo(1);
    var dayBefore = dayKeyDaysAgo(2);
    var dayOutside = dayKeyDaysAgo(10);

    /* 手算基准：三天的各字段值 */
    var daySamples = [
        { dayKey: dayYesterday, danmakuCnt: 100, incomeCents: 1000, giftCnt: 10, activeUv: 5, chatUv: 4, giftUv: 3, paidUv: 2, enterUv: 7, observedMin: 4, lastTs: 4000 },
        { dayKey: dayBefore, danmakuCnt: 200, incomeCents: 2000, giftCnt: 20, activeUv: 6, chatUv: 5, giftUv: 4, paidUv: 3, enterUv: 8, observedMin: 5, lastTs: 5000 },
        { dayKey: dayToday, danmakuCnt: 300, incomeCents: 3000, giftCnt: 30, activeUv: 7, chatUv: 6, giftUv: 5, paidUv: 4, enterUv: 9, observedMin: 6, lastTs: 3000 },
        { dayKey: dayOutside, danmakuCnt: 999, incomeCents: 9999, giftCnt: 99, activeUv: 9, chatUv: 9, giftUv: 9, paidUv: 9, enterUv: 9, observedMin: 9, lastTs: 9999 }
    ];

    var seedChain = Promise.resolve();
    daySamples.forEach(function (sample) {
        seedChain = seedChain.then(function () {
            var deltas = {
                danmakuCnt: sample.danmakuCnt,
                incomeCents: sample.incomeCents,
                giftCnt: sample.giftCnt,
                activeUv: sample.activeUv,
                chatUv: sample.chatUv,
                giftUv: sample.giftUv,
                paidUv: sample.paidUv,
                enterUv: sample.enterUv,
                observedMin: sample.observedMin
            };
            return archiveApi.upsertRoomDay(ROOM_D + "|" + sample.dayKey, {
                rid: ROOM_D,
                dayKey: sample.dayKey,
                lastTs: sample.lastTs
            }, deltas);
        });
    });

    return seedChain.then(function () {
        return archiveApi.sumRoomDays(ROOM_D, dayBefore, dayToday);
    }).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.rid, ROOM_D);
        assert.strictEqual(result.fromDayKey, dayBefore);
        assert.strictEqual(result.toDayKey, dayToday);
        assert.strictEqual(result.days, 3, "闭区间含今天/昨天/前天，共 3 天");
        /* 手算：100+200+300、1000+2000+3000、……、4+5+6 */
        assert.deepStrictEqual(result.sum, {
            danmakuCnt: 600,
            incomeCents: 6000,
            giftCnt: 60,
            activeUv: 18,
            chatUv: 15,
            giftUv: 12,
            paidUv: 9,
            enterUv: 24,
            observedMin: 15
        }, "sum 必须逐字段相加，且不含 10 天前那天的 999/9");
        assert.strictEqual(result.latest.lastTs, 5000, "lastTs 取区间内最大值（5000，不是今天的 3000）");
        ok("sumRoomDays 闭区间 3 天：9 个字段逐项与手算一致、observedMin 也正确、区间外那天 999 被排除");
    });
});

step("⑯ sumRoomDays 的 latest 只剩 lastTs（不再有 nobleCnt），sum 仍是九字段", function () {
    var dayToday = TODAY_KEY;
    var dayYesterday = dayKeyDaysAgo(1);
    var dayBefore = dayKeyDaysAgo(2);
    var samples = [
        { dayKey: dayBefore, lastTs: 100, danmakuCnt: 1 },
        { dayKey: dayYesterday, lastTs: 800, danmakuCnt: 2 },
        { dayKey: dayToday, lastTs: 300, danmakuCnt: 4 }
    ];

    var seedChain = Promise.resolve();
    samples.forEach(function (sample) {
        seedChain = seedChain.then(function () {
            /* 故意把已废弃的 nobleCnt 塞进 patch：它必须被丢掉，绝不能落库 */
            return archiveApi.upsertRoomDay(ROOM_C + "|" + sample.dayKey, {
                rid: ROOM_C,
                dayKey: sample.dayKey,
                lastTs: sample.lastTs,
                nobleCnt: 999
            }, { danmakuCnt: sample.danmakuCnt });
        });
    });

    return seedChain.then(function () {
        return archiveApi.sumRoomDays(ROOM_C, dayBefore, dayToday);
    }).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.days, 3);
        assert.deepStrictEqual(result.latest, { lastTs: 800 }, "latest 只有 lastTs（区间最大值），nobleCnt 已删除");
        assert.strictEqual(Object.keys(result.latest).length, 1, "latest 只有一个键");
        assert.strictEqual(result.latest.nobleCnt, undefined, "latest.nobleCnt 必须不存在");
        assert.deepStrictEqual(Object.keys(result.sum).sort(), [
            "activeUv", "chatUv", "danmakuCnt", "enterUv", "giftCnt", "giftUv", "incomeCents", "observedMin", "paidUv"
        ], "sum 仍是那 9 个跨天有意义的字段");
        assert.strictEqual(result.sum.danmakuCnt, 7, "1+2+4");
        assert.strictEqual(result.sum.nobleCnt, undefined, "sum 里也不该出现 nobleCnt");
        return archiveApi.getRoomDay(ROOM_C, dayBefore);
    }).then(function (roomDay) {
        assert.strictEqual(roomDay.nobleCnt, undefined, "patch 里塞的 nobleCnt 被丢弃，没有落库");
        assert.strictEqual(roomDay.lastTs, 100);
        ok("sumRoomDays.latest 只剩 {lastTs}、sum 九字段不变、patch 里塞进来的 nobleCnt 被丢弃");
    });
});

step("⑰ sumRoomDays 空区间 / 反向区间 / 缺参数都不抛", function () {
    var dayToday = TODAY_KEY;
    var dayBefore = dayKeyDaysAgo(2);
    var emptySum = {
        danmakuCnt: 0,
        incomeCents: 0,
        giftCnt: 0,
        activeUv: 0,
        chatUv: 0,
        giftUv: 0,
        paidUv: 0,
        enterUv: 0,
        observedMin: 0
    };

    return archiveApi.sumRoomDays("没有档案的房间", dayBefore, dayToday).then(function (result) {
        assert.strictEqual(result.ok, true, "没有数据也是 ok:true");
        assert.strictEqual(result.days, 0);
        assert.deepStrictEqual(result.sum, emptySum, "空区间 sum 全 0（9 个字段都在）");
        assert.deepStrictEqual(result.latest, { lastTs: 0 }, "空区间 latest 只有 lastTs，且为 0");
        /* 反向区间：from > to → 按空区间处理 */
        return archiveApi.sumRoomDays(ROOM_D, dayToday, dayBefore);
    }).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.days, 0, "反向区间没有一天落进来");
        assert.deepStrictEqual(result.sum, emptySum);
        /* 缺参数 / 类型不对 → bad-arg */
        return Promise.all([
            archiveApi.sumRoomDays(),
            archiveApi.sumRoomDays(ROOM_D),
            archiveApi.sumRoomDays(ROOM_D, dayBefore),
            archiveApi.sumRoomDays(ROOM_D, dayBefore, null),
            archiveApi.sumRoomDays("", dayBefore, dayToday),
            archiveApi.sumRoomDays(ROOM_D, 20261017, dayToday),
            archiveApi.sumRoomDays(null, dayBefore, {})
        ]);
    }).then(function (results) {
        results.forEach(function (result, position) {
            assert.strictEqual(result.ok, false, "第 " + (position + 1) + " 组非法参数必须 ok:false");
            assert.strictEqual(result.reason, "bad-arg", "第 " + (position + 1) + " 组非法参数 reason 必须是 bad-arg");
        });
        assert.ok(results.every(function (result) {
            return result.sum === undefined && result.days === undefined;
        }), "bad-arg 时不需要带 sum/days");
        ok("空区间 days:0 + sum/latest 全 0、反向区间按空处理、7 组非法参数全部 ok:false+bad-arg，零异常");
    });
});

step("⑱ room_day 读出来没有 minutes / nobleCnt / observedMinSession / sessionStart 四个键", function () {
    var deadFieldRid = "1234567";
    var deadFieldRidDay = deadFieldRid + "|" + TODAY_KEY;

    return archiveApi.upsertRoomDay(deadFieldRidDay, { rid: deadFieldRid, dayKey: TODAY_KEY }, {
        danmakuCnt: 88,
        observedMin: 9,
        /* 故意把四个已废弃的字段塞进 deltas：它们必须被丢弃 */
        minutes: { "1792199040": [4, 2] },
        nobleCnt: 371,
        observedMinSession: 5,
        sessionStart: 1792202447034
    }).then(function (written) {
        assert.strictEqual(written.ok, true);
        assert.strictEqual(written.roomDay.danmakuCnt, 88);
        assert.strictEqual(written.roomDay.observedMin, 9, "observedMin 保留（覆盖率要用）");
        var fieldNames = ["minutes", "nobleCnt", "observedMinSession", "sessionStart"];
        fieldNames.forEach(function (fieldName) {
            assert.strictEqual(
                Object.prototype.hasOwnProperty.call(written.roomDay, fieldName),
                false,
                "upsertRoomDay 返回值里不该有 " + fieldName
            );
        });
        return archiveApi.getRoomDay(deadFieldRid, TODAY_KEY);
    }).then(function (roomDay) {
        assert.ok(roomDay, "记录必须读得回来");
        var fieldNames = ["minutes", "nobleCnt", "observedMinSession", "sessionStart"];
        fieldNames.forEach(function (fieldName) {
            assert.strictEqual(
                Object.prototype.hasOwnProperty.call(roomDay, fieldName),
                false,
                "落库后的 room_day 里不该有 " + fieldName
            );
            assert.strictEqual(roomDay[fieldName], undefined, fieldName + " 不能是 undefined 键");
        });
        assert.strictEqual(roomDay.danmakuCnt, 88, "正常字段原样保留");
        assert.strictEqual(roomDay.observedMin, 9);
        return archiveApi.listRoomDays(TODAY_KEY);
    }).then(function (result) {
        var found = null;
        result.list.forEach(function (item) {
            if (item.rid === deadFieldRid) found = item;
        });
        assert.ok(found, "listRoomDays 里也要能捞到这条");
        assert.strictEqual(Object.prototype.hasOwnProperty.call(found, "minutes"), false);
        assert.strictEqual(Object.prototype.hasOwnProperty.call(found, "nobleCnt"), false);
        assert.strictEqual(found.observedMin, 9);
        ok("room_day 已无 minutes / nobleCnt / observedMinSession / sessionStart 四个键（写进去也会被丢弃）");
    });
});

step("⑲ prune 保留 7 天：10 天数据只删最旧 3 天，room_day 一条不少", function () {
    var retainRid = "4242424";
    var dayKeys = [];
    var dayIndex;
    for (dayIndex = 0; dayIndex <= 9; dayIndex += 1) dayKeys.push(dayKeyDaysAgo(dayIndex));

    /* 每天 2 条事件（chat + gift）+ 1 行 room_day */
    var seedChain = Promise.resolve();
    dayKeys.forEach(function (dayKey, position) {
        seedChain = seedChain.then(function () {
            var chatEvent = makeChatEvent("6600" + position, dayKey, position);
            chatEvent.rid = retainRid;
            var giftEvent = makeGiftEvent("6600" + position, dayKey, "268", position, 2);
            giftEvent.rid = retainRid;
            return archiveApi.putEvents([chatEvent, giftEvent]).then(function () {
                return archiveApi.upsertRoomDay(retainRid + "|" + dayKey, {
                    rid: retainRid,
                    dayKey: dayKey
                }, { danmakuCnt: 10, observedMin: 2 });
            });
        });
    });

    return seedChain.then(function () {
        return archiveApi.prune();
    }).then(function (pruneResult) {
        assert.strictEqual(pruneResult.ok, true);
        assert.strictEqual(pruneResult.removedDays, 3, "today-9 / today-8 / today-7 三天过期");
        assert.strictEqual(pruneResult.removedEvents, 6, "3 天 × 2 条明细");
        /* 窗口内（今天 + 前 6 天）一天不少 */
        var checks = [];
        var keptIndex;
        for (keptIndex = 0; keptIndex <= 6; keptIndex += 1) {
            checks.push(archiveApi.queryRoomDayEvents(retainRid, dayKeyDaysAgo(keptIndex), { limit: 100 }).then(function (result) {
                assert.strictEqual(result.list.length, 2, "窗口内那天的明细必须保留");
            }));
        }
        var removedIndex;
        for (removedIndex = 7; removedIndex <= 9; removedIndex += 1) {
            checks.push(archiveApi.queryRoomDayEvents(retainRid, dayKeyDaysAgo(removedIndex), { limit: 100 }).then(function (result) {
                assert.strictEqual(result.list.length, 0, "过期那天的明细必须清空");
            }));
        }
        /* room_day 全 10 天都在 */
        var roomDayChecks = [];
        dayKeys.forEach(function (dayKey) {
            roomDayChecks.push(archiveApi.getRoomDay(retainRid, dayKey).then(function (roomDay) {
                assert.ok(roomDay, "room_day 不参与裁剪，一天都不能少：" + dayKey);
                assert.strictEqual(roomDay.danmakuCnt, 10);
            }));
        });
        return Promise.all(checks.concat(roomDayChecks));
    }).then(function () {
        return archiveApi.stats();
    }).then(function (stats) {
        assert.strictEqual(stats.windowDays, 7, "stats().windowDays 跟着变成 7");
        ok("prune 只删 today-9/-8/-7 三天明细（6 条），今天+前 6 天全留，10 行 room_day 一条不少");
    });
});

step("⑳ 硬上限 1 GB：usage 超线时从旧到新删 events，最新的留着", function () {
    var capRid = ROOM_A;
    var capDayKey = TODAY_KEY;
    var seed = [];
    var index;
    for (index = 0; index < 3000; index += 1) {
        seed.push(makeChatEvent("8800" + index % 7, capDayKey, 100000 + index));
    }
    var marker = {
        dedupKey: "c:size-cap-marker",
        kind: "chat",
        uid: "888888",
        nn: "最后一条",
        rid: capRid,
        ts: NOW_TIMESTAMP + 999999,
        dayKey: capDayKey,
        txt: "我是最新写入的一条，必须活下来"
    };
    var beforeCount = 0;

    return archiveApi.putEvents(seed).then(function (result) {
        assert.strictEqual(result.added, 3000);
        return archiveApi.putEvents([marker]);
    }).then(function () {
        return archiveApi.stats();
    }).then(function (stats) {
        beforeCount = stats.events;
        /* 三段用量：超线 → 仍超线 → 回到线内，模拟真实测量随删除逐步下降 */
        var usageSequence = [1500 * 1024 * 1024, 1100 * 1024 * 1024, 700 * 1024 * 1024];
        var usageCursor = 0;
        installFakeStorage(function () {
            var value = usageSequence[Math.min(usageCursor, usageSequence.length - 1)];
            usageCursor += 1;
            return value;
        });
        return archiveApi.prune();
    }).then(function (pruneResult) {
        assert.strictEqual(pruneResult.ok, true);
        assert.strictEqual(pruneResult.removedEvents, 2000, "每轮删 1000 条，两轮后回到 1 GB 以内就停手");
        return archiveApi.stats();
    }).then(function (afterStats) {
        assert.strictEqual(afterStats.events, beforeCount - 2000, "只删了 2000 条，不是清空");
        assert.strictEqual(afterStats.bytes, 700 * 1024 * 1024, "bytes 仍然优先走 navigator.storage.estimate().usage");
        /* 删除方向是从旧到新（主键升序）：最后写进去的标记必须还在 */
        return archiveApi.queryUserDay("888888", TODAY_KEY, { offset: 0, limit: 10 });
    }).then(function (markerPage) {
        assert.strictEqual(markerPage.list.length, 1, "最新写入的那条必须活下来（删的是最旧的 2000 条）");
        assert.strictEqual(markerPage.list[0].dedupKey, "c:size-cap-marker");
        restoreNavigator();
        ok("1 GB 上限生效：usage 超线时按 1000 条/轮从旧到新删，两轮共 2000 条后停手，最新那条保留");
    }).catch(function (error) {
        restoreNavigator();
        throw error;
    });
});

step("㉑ counters 与真实全表扫完全一致（events / chat / gift / enter）", function () {
    var mixDay = dayKeyDaysAgo(2);
    var batch = [];
    var index;
    for (index = 0; index < 1000; index += 1) {
        var slot = index % 10;
        var uid = "9900" + index % 40;
        if (slot === 0 || slot === 1) {
            var gift = makeGiftEvent(uid, mixDay, "268", index, 1);
            gift.rid = ROOM_B;
            batch.push(gift);
        } else if (slot === 2) {
            var enter = makeEnterEvent(uid, mixDay, index);
            enter.rid = ROOM_B;
            batch.push(enter);
        } else {
            var chat = makeChatEvent(uid, mixDay, index);
            chat.rid = ROOM_B;
            batch.push(chat);
        }
    }

    return archiveApi.putEvents(batch).then(function (result) {
        assert.strictEqual(result.added, 1000);
        return Promise.all([archiveApi.stats(), scanEventCounters()]);
    }).then(function (results) {
        var stats = results[0];
        var oracle = results[1];
        assert.strictEqual(stats.events, oracle.events, "stats().events 必须等于真扫一遍");
        assert.strictEqual(stats.chatEvents, oracle.chat, "chatEvents 必须等于真扫一遍");
        assert.strictEqual(stats.giftEvents, oracle.gift, "giftEvents 必须等于真扫一遍");
        assert.strictEqual(stats.enterEvents, oracle.enter, "enterEvents 必须等于真扫一遍");
        assert.strictEqual(stats.events, stats.chatEvents + stats.giftEvents + stats.enterEvents, "三类之和 = 总数");
        assert.ok(stats.events >= 1000, "至少包含刚写的 1000 条");
        ok("写 1000 条混合事件后 counters 与独立全表扫逐项相等（events=" + stats.events + " chat=" + oracle.chat + " gift=" + oracle.gift + " enter=" + oracle.enter + "）");
    });
});

step("㉒ prune 之后 counters 仍然和全表扫一致（扣减生效）", function () {
    var expiredDay = dayKeyDaysAgo(9);
    var expiredEvents = [];
    var index;
    for (index = 0; index < 9; index += 1) {
        if (index % 3 === 0) {
            expiredEvents.push(makeGiftEvent("7700" + index, expiredDay, "268", 5000 + index, 1));
        } else if (index % 3 === 1) {
            expiredEvents.push(makeEnterEvent("7700" + index, expiredDay, 5000 + index));
        } else {
            expiredEvents.push(makeChatEvent("7700" + index, expiredDay, 5000 + index));
        }
    }

    return archiveApi.putEvents(expiredEvents).then(function (result) {
        assert.strictEqual(result.added, 9);
        return archiveApi.stats();
    }).then(function (before) {
        return archiveApi.prune().then(function (pruneResult) {
            assert.strictEqual(pruneResult.removedDays, 1, "只有 today-9 这一天过期");
            assert.strictEqual(pruneResult.removedEvents, 9);
            return Promise.all([archiveApi.stats(), scanEventCounters()]);
        }).then(function (results) {
            var stats = results[0];
            var oracle = results[1];
            assert.strictEqual(stats.events, before.events - 9, "总数正好少了 9 条");
            assert.strictEqual(stats.events, oracle.events, "扣减后仍与全表扫一致");
            assert.strictEqual(stats.chatEvents, oracle.chat);
            assert.strictEqual(stats.giftEvents, oracle.gift);
            assert.strictEqual(stats.enterEvents, oracle.enter);
            assert.ok(stats.oldestDay !== expiredDay, "被删掉的那天不该再出现在 oldestDay 里");
        });
    }).then(function () {
        ok("prune 删 9 条过期明细后 counters 精确扣减，events/chat/gift/enter 与全表扫仍然逐项相等");
    });
});

step("㉓ counters 缺失的老库：stats() 自动重算并写回", function () {
    return deleteRawMetaKey("counters").then(function () {
        assert.strictEqual(true, true, "counters 已抹掉");
        return archiveApi.getMeta("counters");
    }).then(function (value) {
        assert.strictEqual(value, null, "确认 counters 真的不在了");
        return Promise.all([archiveApi.stats(), scanEventCounters()]);
    }).then(function (results) {
        var stats = results[0];
        var oracle = results[1];
        assert.strictEqual(stats.ok, true);
        assert.strictEqual(stats.events, oracle.events, "重算出来的 events 必须等于全表扫");
        assert.strictEqual(stats.chatEvents, oracle.chat);
        assert.strictEqual(stats.giftEvents, oracle.gift);
        assert.strictEqual(stats.enterEvents, oracle.enter);
        return archiveApi.getMeta("counters");
    }).then(function (counters) {
        assert.ok(counters, "重算结果必须写回 meta.counters");
        assert.strictEqual(counters.events, counters.chat + counters.gift + counters.enter);
        ok("counters 缺失时 stats() 全表重算一次并写回 meta（结果与全表扫一致，三类之和=总数）");
    });
});

step("㉔ seen 分块：1200 个 uid 全取回、重复写 added=0、clearSeenBefore 只删过期", function () {
    var scope = "active";
    var recentDay = TODAY_KEY;
    var oldDay = dayKeyDaysAgo(9);
    var CHUNK_LIMIT = 500;
    var CHUNK_COUNT = 64; /* 与模块里的 hash(uid) % 64 一致 */
    var totalUids = 1200;

    /* 复刻模块内部的首选分片算法，用来构造「同一个块被写满」的溢出场景 */
    function preferredChunkOf(uidText) {
        var hashCode = 0;
        var index;
        for (index = 0; index < uidText.length; index += 1) {
            hashCode = (hashCode * 31 + uidText.charCodeAt(index)) % 2147483647;
        }
        return hashCode % CHUNK_COUNT;
    }

    var bigList = [];
    var index;
    for (index = 0; index < totalUids; index += 1) {
        bigList.push({ scope: scope, dayKey: recentDay, uid: "600" + index });
    }
    /* 老日期也写一点，供 clearSeenBefore 验证 */
    bigList.push({ scope: scope, dayKey: oldDay, uid: "700001" });
    bigList.push({ scope: scope, dayKey: oldDay, uid: "700002" });

    return archiveApi.putSeen(bigList).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.added, totalUids + 2, "1200 个新 uid + 老日期 2 个");
        return archiveApi.getSeen(scope, recentDay);
    }).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.uids.length, totalUids, "getSeen 必须把 1200 个 uid 全取回来（跨所有块合并）");
        var unique = Object.create(null);
        result.uids.forEach(function (uid) { unique[uid] = true; });
        assert.strictEqual(Object.keys(unique).length, totalUids, "取回的 uid 不能有重复");
        assert.strictEqual(unique["6000"], true);
        assert.strictEqual(unique["6001199"], true);
        /* 重复写一遍（含重复项）：added 必须是 0 */
        return archiveApi.putSeen(bigList);
    }).then(function (result) {
        assert.strictEqual(result.added, 0, "同一批 uid 再写一次：一个都不算新增");
        return readRawSeenChunks(scope, recentDay);
    }).then(function (chunks) {
        assert.ok(chunks.length > 1, "1200 个 uid 必须落在多个块里（实际 " + chunks.length + " 块）");
        chunks.forEach(function (chunk) {
            assert.ok(chunk.uids.length <= CHUNK_LIMIT, "每块最多 500 个 uid（实际 " + chunk.uids.length + "）");
            assert.strictEqual(chunk.scope, scope);
            assert.strictEqual(chunk.dayKey, recentDay);
            assert.strictEqual(chunk.key, scope + "|" + recentDay + "|" + chunk.chunk, "主键必须是 scope|dayKey|chunk");
        });
        /* 溢出验证：找 501 个同分片的 uid，强制把某个块写到 500 后溢出到 64 号块 */
        var targetChunk = preferredChunkOf("6000");
        var collisionUids = [];
        var candidateIndex = 0;
        while (collisionUids.length < CHUNK_LIMIT + 1 && candidateIndex < 400000) {
            var candidate = "ov" + candidateIndex;
            if (preferredChunkOf(candidate) === targetChunk) collisionUids.push(candidate);
            candidateIndex += 1;
        }
        assert.strictEqual(collisionUids.length, CHUNK_LIMIT + 1, "要凑够 501 个同分片 uid");
        var overflowDay = dayKeyDaysAgo(1);
        return archiveApi.putSeen(collisionUids.map(function (uidText) {
            return { scope: "overflow", dayKey: overflowDay, uid: uidText };
        })).then(function (overflowResult) {
            assert.strictEqual(overflowResult.added, CHUNK_LIMIT + 1);
            return archiveApi.getSeen("overflow", overflowDay);
        }).then(function (overflowSeen) {
            assert.strictEqual(overflowSeen.uids.length, CHUNK_LIMIT + 1, "溢出后 getSeen 依然能取全 501 个");
            return readRawSeenChunks("overflow", overflowDay);
        }).then(function (overflowChunks) {
            assert.ok(overflowChunks.length >= 2, "501 个同分片 uid 必须溢出到第二个块");
            var maxChunkIndex = 0;
            overflowChunks.forEach(function (chunk) {
                if (chunk.chunk > maxChunkIndex) maxChunkIndex = chunk.chunk;
                assert.ok(chunk.uids.length <= CHUNK_LIMIT, "溢出块也不能超过 500");
            });
            assert.ok(maxChunkIndex >= CHUNK_COUNT, "溢出块号从 64 起（实际最大块号 " + maxChunkIndex + "）");
            return archiveApi.clearSeenBefore(dayKeyDaysAgo(7));
        });
    }).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.ok(result.removed >= 1, "至少删掉老日期那个块");
        return Promise.all([archiveApi.getSeen(scope, oldDay), archiveApi.getSeen(scope, recentDay)]);
    }).then(function (results) {
        assert.deepStrictEqual(results[0].uids, [], "过期日（today-9）的块被清空");
        assert.strictEqual(results[1].uids.length, totalUids, "当天的 1200 个一个不少");
        ok("seen 分块：1200 个 uid 分布在多块且 getSeen 全取回、重复写 added=0、501 个同分片 uid 溢出到 64 号块、clearSeenBefore 只删过期");
    });
});

step("㉕ putSeen 并发不丢：3 个并发批次各 500 个不同 uid → 1500 个一个不少", function () {
    var scope = "burst";
    var burstDay = dayKeyDaysAgo(2);
    var perBatch = 500;
    var batchCount = 3;
    var expectedTotal = perBatch * batchCount;

    function buildBatch(batchIndex) {
        var list = [];
        var index;
        for (index = 0; index < perBatch; index += 1) {
            /* 三批 uid 互不重叠 */
            list.push({ scope: scope, dayKey: burstDay, uid: "b" + batchIndex + "-" + index });
        }
        return list;
    }

    archiveApi.__debug.resetSeenQueueStats();

    /* 同一 tick 里发三个 putSeen（不加 await）：没有串行链时三者会同时读同一批块 */
    var pending = [];
    var batchIndex;
    for (batchIndex = 0; batchIndex < batchCount; batchIndex += 1) {
        pending.push(archiveApi.putSeen(buildBatch(batchIndex)));
    }

    return Promise.all(pending).then(function (results) {
        results.forEach(function (result) {
            assert.strictEqual(result.ok, true, "每个批次都要 ok:true");
            assert.strictEqual(result.added, perBatch, "每个批次 500 个全是新 uid");
        });
        return archiveApi.getSeen(scope, burstDay);
    }).then(function (seen) {
        assert.strictEqual(seen.ok, true);
        assert.strictEqual(
            seen.uids.length,
            expectedTotal,
            "3 个并发批次共 1500 个不同 uid，一个都不许丢（实际 " + seen.uids.length + " 个）"
        );
        var unique = Object.create(null);
        seen.uids.forEach(function (uid) { unique[uid] = true; });
        assert.strictEqual(Object.keys(unique).length, expectedTotal, "取回的 uid 必须两两不同");
        var expectedIndex;
        for (expectedIndex = 0; expectedIndex < perBatch; expectedIndex += 1) {
            assert.strictEqual(unique["b0-" + expectedIndex], true, "第一批的 uid 必须在");
            assert.strictEqual(unique["b1-" + expectedIndex], true, "第二批的 uid 必须在");
            assert.strictEqual(unique["b2-" + expectedIndex], true, "第三批的 uid 必须在");
        }
        ok("3 个并发 putSeen（各 500 个不同 uid）全部落库：getSeen 返回 1500 个、两两不同、一个都没被覆盖");
    });
});

step("㉖ putSeen 串行可观测：并发上限恒为 1，三个批次 added 合计 1500", function () {
    var scope = "serial";
    var serialDay = dayKeyDaysAgo(3);
    var perBatch = 500;
    var batchCount = 3;

    function buildBatch(batchIndex) {
        var list = [];
        var index;
        for (index = 0; index < perBatch; index += 1) {
            list.push({ scope: scope, dayKey: serialDay, uid: "s" + batchIndex + "-" + index });
        }
        return list;
    }

    var resetStats = archiveApi.__debug.resetSeenQueueStats();
    assert.strictEqual(resetStats.max <= 1, true, "重置后历史峰值不会高于当前活跃数");

    var pending = [];
    var batchIndex;
    for (batchIndex = 0; batchIndex < batchCount; batchIndex += 1) {
        pending.push(archiveApi.putSeen(buildBatch(batchIndex)));
    }
    /* 立刻采样：此刻三个 putSeen 都在排队，同时真正在跑的事务最多一个 */
    var midFlight = archiveApi.__debug.seenQueue();
    assert.strictEqual(midFlight.active <= 1, true, "同时在跑的 putSeen 事务数必须 ≤ 1（此刻 " + midFlight.active + "）");

    return Promise.all(pending).then(function (results) {
        var addedSum = 0;
        results.forEach(function (result) {
            assert.strictEqual(result.ok, true);
            addedSum += result.added;
        });
        assert.strictEqual(addedSum, perBatch * batchCount, "三个批次 added 合计必须等于 1500（实际 " + addedSum + "）");
        var stats = archiveApi.__debug.seenQueue();
        assert.strictEqual(stats.max, 1, "串行链的并发峰值必须恰好是 1（否则说明两个事务同时读改写同一批块）");
        assert.strictEqual(stats.active, 0, "全部 settle 后没有在跑的任务");
        assert.ok(stats.completed >= batchCount, "完成的批次要计数（实际 " + stats.completed + "）");
        return archiveApi.getSeen(scope, serialDay);
    }).then(function (seen) {
        assert.strictEqual(seen.uids.length, perBatch * batchCount, "串行执行后 1500 个 uid 同样一个不少");
        /* clearSeenBefore 也走同一条链：它与 putSeen 不会互相踩，删的是过期块而不是当天块 */
        var oldDay = dayKeyDaysAgo(9);
        return archiveApi.putSeen([{ scope: scope, dayKey: oldDay, uid: "old-1" }]).then(function () {
            return archiveApi.clearSeenBefore(dayKeyDaysAgo(7));
        }).then(function (clearResult) {
            assert.strictEqual(clearResult.ok, true);
            assert.strictEqual(clearResult.removed, 1, "只删掉 today-9 那个过期块");
            return Promise.all([
                archiveApi.getSeen(scope, oldDay),
                archiveApi.getSeen(scope, serialDay)
            ]);
        });
    }).then(function (results) {
        assert.deepStrictEqual(results[0].uids, [], "过期块已清");
        assert.strictEqual(results[1].uids.length, perBatch * batchCount, "当天的 1500 个不受影响");
        ok("串行链生效：并发峰值 max=1、active 归零、added 合计 1500、clearSeenBefore 与 putSeen 同链互不干扰");
    });
});

step("㉗ commitBatch 原子性：中途 abort → events / seen / room_day 全部不落地", function () {
    var atomicRid = "5150515";
    var atomicScope = "atomic";
    var atomicDay = TODAY_KEY;
    var atomicRidDay = atomicRid + "|" + atomicDay;

    var events = [];
    var index;
    for (index = 0; index < 30; index += 1) {
        var event = makeChatEvent("a" + index, atomicDay, 900 + index);
        event.rid = atomicRid;
        events.push(event);
    }
    var seen = [];
    for (index = 0; index < 20; index += 1) {
        seen.push({ scope: atomicScope, dayKey: atomicDay, uid: "atomic-" + index });
    }
    var roomDays = [{ ridDay: atomicRidDay, patch: { rid: atomicRid, dayKey: atomicDay }, deltas: { danmakuCnt: 30, observedMin: 3 } }];
    var before = null;

    return Promise.all([
        archiveApi.stats(),
        archiveApi.getSeen(atomicScope, atomicDay),
        archiveApi.getRoomDay(atomicRid, atomicDay),
        scanEventCounters()
    ]).then(function (snapshot) {
        before = snapshot;
        assert.strictEqual(before[1].uids.length, 0, "前置：这个 scope 当天还没有 uid");
        assert.strictEqual(before[2], null, "前置：这个房间当天还没有 room_day");
        /* 注入故障：所有写入都发完之后再 abort（哨兵请求保证「已写完才回滚」） */
        archiveApi.__debug.setCommitBatchAbortFault(true);
        return archiveApi.commitBatch({ events: events, seen: seen, roomDays: roomDays });
    }).then(function (result) {
        assert.strictEqual(result.ok, false, "被 abort 的 commitBatch 必须 ok:false");
        assert.ok(result.reason, "失败要带 reason（实际 " + result.reason + "）");
        assert.strictEqual(result.added, 0, "失败时 added 为 0");
        assert.strictEqual(result.seenAdded, 0, "失败时 seenAdded 为 0");
        assert.strictEqual(result.roomDays, 0, "失败时 roomDays 为 0");
        return Promise.all([
            archiveApi.stats(),
            archiveApi.getSeen(atomicScope, atomicDay),
            archiveApi.getRoomDay(atomicRid, atomicDay),
            scanEventCounters(),
            archiveApi.getMeta("counters")
        ]);
    }).then(function (after) {
        assert.strictEqual(after[0].events, before[0].events, "events 一条都没落地（stats 不变）");
        assert.strictEqual(after[3].events, before[3].events, "全表扫也确认 events 没变");
        assert.strictEqual(after[1].uids.length, 0, "seen 一个 uid 都没落地");
        assert.strictEqual(after[2], null, "room_day 没落地");
        assert.strictEqual(after[4].events, after[0].events, "counters 跟着事务一起回滚");
        return archiveApi.queryUserDay("a0", atomicDay, { limit: 10 });
    }).then(function (page) {
        assert.strictEqual(page.list.length, 0, "明细确实查不到（同一事务整体回滚）");
        /* 故障只影响那一次：下一笔必须正常成功 */
        return archiveApi.commitBatch({
            events: [makeChatEvent("a0", atomicDay, 999)],
            seen: [{ scope: atomicScope, dayKey: atomicDay, uid: "atomic-after" }],
            roomDays: [{ ridDay: atomicRidDay, patch: { rid: atomicRid, dayKey: atomicDay }, deltas: { danmakuCnt: 1 } }]
        });
    }).then(function (result) {
        assert.strictEqual(result.ok, true, "故障注入是一次性的，下一笔必须正常成功");
        assert.strictEqual(result.added, 1);
        ok("原子性：abort 后 events / seen / room_day / counters 全部回滚（读回 0 / null），故障只影响那一笔");
    });
});

step("㉘ commitBatch 正常路径：200 事件 + 50 seen + 2 roomDay 一次提交，counters 与全表扫一致", function () {
    var normalRid = "6160616";
    var normalRidTwo = "6260626";
    var normalScope = "batch";
    var normalDay = TODAY_KEY;
    var events = [];
    var index;
    for (index = 0; index < 200; index += 1) {
        var slot = index % 10;
        var event;
        if (slot === 0) {
            event = makeGiftEvent("n" + (index % 40), normalDay, "268", 4000 + index, 1);
        } else if (slot === 1) {
            event = makeEnterEvent("n" + (index % 40), normalDay, 4000 + index);
        } else {
            event = makeChatEvent("n" + (index % 40), normalDay, 4000 + index);
        }
        event.rid = normalRid;
        events.push(event);
    }
    var seen = [];
    for (index = 0; index < 50; index += 1) {
        seen.push({ scope: normalScope, dayKey: normalDay, uid: "batch-" + index });
    }
    var roomDays = [
        { ridDay: normalRid + "|" + normalDay, patch: { rid: normalRid, dayKey: normalDay }, deltas: { danmakuCnt: 200, observedMin: 20 } },
        { ridDay: normalRidTwo + "|" + normalDay, patch: { rid: normalRidTwo, dayKey: normalDay }, deltas: { danmakuCnt: 1 } }
    ];
    var beforeStats = null;

    return archiveApi.stats().then(function (stats) {
        beforeStats = stats;
        return archiveApi.commitBatch({ events: events, seen: seen, roomDays: roomDays });
    }).then(function (result) {
        assert.strictEqual(result.ok, true, "正常路径必须 ok:true（" + result.reason + "）");
        assert.strictEqual(result.added, 200, "200 条事件全部新增");
        assert.strictEqual(result.seenAdded, 50, "50 个 uid 全部新增");
        assert.strictEqual(result.roomDays, 2, "2 个 ridDay 各写一行");
        assert.ok(result.counters, "要带回提交后的 counters");
        assert.strictEqual(result.counters.events, beforeStats.events + 200, "counters.events 加上了这批");
        assert.strictEqual(result.counters.events, result.counters.chat + result.counters.gift + result.counters.enter);
        return Promise.all([
            archiveApi.stats(),
            scanEventCounters(),
            archiveApi.getSeen(normalScope, normalDay),
            archiveApi.getRoomDay(normalRid, normalDay),
            archiveApi.getRoomDay(normalRidTwo, normalDay)
        ]);
    }).then(function (results) {
        var stats = results[0];
        var oracle = results[1];
        assert.strictEqual(results[2].uids.length, 50, "seen 50 个 uid 落地");
        assert.strictEqual(results[3].danmakuCnt, 200, "room_day A 落地");
        assert.strictEqual(results[3].observedMin, 20);
        assert.strictEqual(results[4].danmakuCnt, 1, "room_day B 落地");
        assert.strictEqual(stats.events, beforeStats.events + 200);
        assert.strictEqual(stats.events, oracle.events, "stats 与全表扫一致");
        assert.strictEqual(stats.chatEvents, oracle.chat);
        assert.strictEqual(stats.giftEvents, oracle.gift);
        assert.strictEqual(stats.enterEvents, oracle.enter);
        ok("正常路径：200 事件 / 50 seen / 2 roomDay 一次事务全落地，counters 与独立全表扫逐项相等");
    });
});

step("㉙ commitBatch 里同一 ridDay 多条按数组顺序合并（+5 再 +5 = +10）", function () {
    var mergeRid = "7170717";
    var mergeDay = TODAY_KEY;
    var mergeRidDay = mergeRid + "|" + mergeDay;

    function entry() {
        return {
            ridDay: mergeRidDay,
            patch: { rid: mergeRid, dayKey: mergeDay },
            deltas: { danmakuCnt: 5, observedMin: 1, incomeCents: 100 }
        };
    }

    return archiveApi.commitBatch({ roomDays: [entry(), entry()] }).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.roomDays, 1, "同一 ridDay 的两条合并成一行，只写一次");
        return archiveApi.getRoomDay(mergeRid, mergeDay);
    }).then(function (roomDay) {
        assert.ok(roomDay, "room_day 必须落地");
        assert.strictEqual(roomDay.danmakuCnt, 10, "两条各 +5 → 10（顺序合并，不丢更新）");
        assert.strictEqual(roomDay.observedMin, 2);
        assert.strictEqual(roomDay.incomeCents, 200);
        /* 在已有值上再来一轮两条：10 + 10 = 20 */
        return archiveApi.commitBatch({ roomDays: [entry(), entry()] });
    }).then(function (result) {
        assert.strictEqual(result.ok, true);
        return archiveApi.getRoomDay(mergeRid, mergeDay);
    }).then(function (roomDay) {
        assert.strictEqual(roomDay.danmakuCnt, 20, "第二轮在库里的 10 上继续叠加 → 20");
        assert.strictEqual(roomDay.observedMin, 4);
        /* 兼容写法：Ingest 的 patchList 用的是 roomDay 而不是 patch，别名必须同样生效 */
        return archiveApi.commitBatch({
            roomDays: [{
                ridDay: mergeRidDay,
                roomDay: { rid: mergeRid, dayKey: mergeDay, bagCnt: 7 },
                deltas: { danmakuCnt: 1 }
            }]
        });
    }).then(function (result) {
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.roomDays, 1);
        return archiveApi.getRoomDay(mergeRid, mergeDay);
    }).then(function (roomDay) {
        assert.strictEqual(roomDay.bagCnt, 7, "roomDay 别名里的 patch 字段要生效");
        assert.strictEqual(roomDay.danmakuCnt, 21, "别名写法下 deltas 也照常累加");
        ok("同 ridDay 多条按数组顺序合并：单轮 +5/+5=10、第二轮叠加到 20，只写一行；patch / roomDay 两种入参写法都生效");
    });
});

step("㉚ 性能微基准：200 事件 + 50 seen + 1 roomDay × 200 轮（3 次事务 vs 1 次事务，各自独立库）", function () {
    var rounds = 200;
    var warmupRounds = 5;
    var perRoundEvents = 200;
    var perRoundSeen = 50;
    var benchDay = dayKeyDaysAgo(4);

    function buildPayload(roundIndex, ridText, scopeText) {
        var events = [];
        var index;
        for (index = 0; index < perRoundEvents; index += 1) {
            var event = makeChatEvent("bench" + roundIndex + "-" + index, benchDay, roundIndex * 10000 + index);
            event.rid = ridText;
            events.push(event);
        }
        var seen = [];
        for (index = 0; index < perRoundSeen; index += 1) {
            seen.push({ scope: scopeText, dayKey: benchDay, uid: scopeText + "-" + roundIndex + "-" + index });
        }
        return {
            events: events,
            seen: seen,
            roomDay: { ridDay: ridText + "|" + benchDay, patch: { rid: ridText, dayKey: benchDay }, deltas: { danmakuCnt: perRoundEvents, observedMin: 1 } }
        };
    }

    /* 两条路径各自一个独立库（避免对方的数据影响写放大），同样的入参、同样的轮数。 */
    function measurePath(mode) {
        var factory = new fakeIndexedDb.IDBFactory();
        installIndexedDb(factory, { calls: 0 });
        var benchApi = loadArchiveModule();
        var totalMs = 0;
        var round = 0;
        var ridText = mode === "old" ? "8180818" : "8280828";
        var scopeText = mode === "old" ? "bench-old" : "bench-new";

        function oneRound(roundIndex, timed) {
            var payload = buildPayload(roundIndex, ridText, scopeText);
            var startedAt = Date.now();
            if (mode === "old") {
                /* A) 旧路径：三次独立事务 */
                return benchApi.putEvents(payload.events)
                    .then(function () { return benchApi.putSeen(payload.seen); })
                    .then(function () {
                        return benchApi.upsertRoomDay(payload.roomDay.ridDay, payload.roomDay.patch, payload.roomDay.deltas);
                    })
                    .then(function () {
                        if (timed) totalMs += Date.now() - startedAt;
                    });
            }
            /* B) 新路径：一次事务 */
            return benchApi.commitBatch({
                events: payload.events,
                seen: payload.seen,
                roomDays: [payload.roomDay]
            }).then(function (result) {
                if (!result.ok) throw new Error("基准里的 commitBatch 失败：" + result.reason);
                if (timed) totalMs += Date.now() - startedAt;
            });
        }

        function next() {
            if (round >= warmupRounds + rounds) {
                return Promise.resolve({ totalMs: totalMs, meanMs: totalMs / rounds });
            }
            var roundIndex = round;
            round += 1;
            return oneRound(roundIndex, roundIndex >= warmupRounds).then(next);
        }

        return next();
    }

    return measurePath("old").then(function (oldPath) {
        return measurePath("new").then(function (newPath) {
            installIndexedDb(mainFactory, openTracker);
            var savedMs = oldPath.totalMs - newPath.totalMs;
            var savedPercent = oldPath.totalMs > 0 ? (savedMs / oldPath.totalMs) * 100 : 0;
            console.log("      每轮 " + perRoundEvents + " 事件 + " + perRoundSeen + " seen + 1 roomDay，各 " + rounds + " 轮（另 " + warmupRounds + " 轮预热不计）");
            console.log("      A) 旧路径 putEvents+putSeen+upsertRoomDay（3 次事务）：总 " + oldPath.totalMs + " ms / 单轮 " + oldPath.meanMs.toFixed(2) + " ms");
            console.log("      B) 新路径 commitBatch（1 次事务）：                     总 " + newPath.totalMs + " ms / 单轮 " + newPath.meanMs.toFixed(2) + " ms");
            console.log("      差值：" + savedMs + " ms（" + (savedPercent >= 0 ? "省 " : "多花 ") + Math.abs(savedPercent).toFixed(1) + "%）");
            assert.ok(oldPath.totalMs > 0, "旧路径必须有真实耗时");
            assert.ok(newPath.totalMs > 0, "新路径必须有真实耗时");
            /* 真实结论：fake-indexeddb 是纯 JS 实现，省掉两次事务并不带来吞吐收益（甚至略慢）；
             * commitBatch 的价值是原子性，不是快。这里只守住「不能出现数量级退化」。 */
            assert.ok(newPath.totalMs < oldPath.totalMs * 3, "新路径不能比旧路径慢 3 倍以上（实际 " + newPath.totalMs + " vs " + oldPath.totalMs + " ms）");
            ok("A/B 基准（各 200 轮实测）：旧路径 " + oldPath.totalMs + " ms（单轮 " + oldPath.meanMs.toFixed(2) + " ms） vs 新路径 " + newPath.totalMs + " ms（单轮 " + newPath.meanMs.toFixed(2) + " ms）");
        });
    }).catch(function (error) {
        installIndexedDb(mainFactory, openTracker);
        throw error;
    });
});

step("㉛ v1 / v2 库升级到 v3：整体重置，所有 store 清空 + migrated=full-reset", function () {
    var legacyRoomRid = "9990001";
    var v1Factory = new fakeIndexedDb.IDBFactory();
    var v2Factory = new fakeIndexedDb.IDBFactory();
    var countsBeforeV2 = null;

    /* v2 结构（4 个索引 + counters 等） */
    function createVersionTwoSchema(database) {
        var events = database.createObjectStore("events", { keyPath: "id", autoIncrement: true });
        events.createIndex("dedupKey", "dedupKey", { unique: true });
        events.createIndex("dayKey", "dayKey", { unique: false });
        events.createIndex("uid_dayKey", ["uid", "dayKey"], { unique: false });
        events.createIndex("rid_dayKey", ["rid", "dayKey"], { unique: false });
        var roomDay = database.createObjectStore("room_day", { keyPath: "ridDay" });
        roomDay.createIndex("dayKey", "dayKey", { unique: false });
        database.createObjectStore("rooms", { keyPath: "rid" });
        var users = database.createObjectStore("users", { keyPath: "uid" });
        users.createIndex("lastSeen", "lastSeen", { unique: false });
        database.createObjectStore("gifts", { keyPath: "gfid" });
        var seen = database.createObjectStore("seen", { keyPath: "key" });
        seen.createIndex("scope_dayKey", ["scope", "dayKey"], { unique: false });
        database.createObjectStore("meta", { keyPath: "k" });
    }

    /* v1 结构（6 个索引，多出单列 uid / rid） */

    function buildLegacyDatabase(factory, version) {
        return new Promise(function (resolve, reject) {
            var openRequest = factory.open("DouyuExArchive", version);
            openRequest.onupgradeneeded = function () {
                var database = openRequest.result;
                if (version === 1) {
                    var events = database.createObjectStore("events", { keyPath: "id", autoIncrement: true });
                    events.createIndex("dedupKey", "dedupKey", { unique: true });
                    events.createIndex("uid", "uid", { unique: false });
                    events.createIndex("dayKey", "dayKey", { unique: false });
                    events.createIndex("rid", "rid", { unique: false });
                    events.createIndex("uid_dayKey", ["uid", "dayKey"], { unique: false });
                    events.createIndex("rid_dayKey", ["rid", "dayKey"], { unique: false });
                    var roomDayV1 = database.createObjectStore("room_day", { keyPath: "ridDay" });
                    roomDayV1.createIndex("dayKey", "dayKey", { unique: false });
                    database.createObjectStore("rooms", { keyPath: "rid" });
                    var usersV1 = database.createObjectStore("users", { keyPath: "uid" });
                    usersV1.createIndex("lastSeen", "lastSeen", { unique: false });
                    database.createObjectStore("gifts", { keyPath: "gfid" });
                    var seenV1 = database.createObjectStore("seen", { keyPath: "key" });
                    seenV1.createIndex("scope_dayKey", ["scope", "dayKey"], { unique: false });
                    database.createObjectStore("meta", { keyPath: "k" });
                } else {
                    createVersionTwoSchema(database);
                }
            };
            openRequest.onerror = function () { reject(openRequest.error); };
            openRequest.onsuccess = function () {
                var database = openRequest.result;
                var transaction = database.transaction(["events", "room_day", "rooms", "users", "seen", "meta"], "readwrite");
                transaction.objectStore("events").put({
                    dedupKey: "c:legacy-1", kind: "chat", uid: "1", rid: legacyRoomRid,
                    ts: NOW_TIMESTAMP, dayKey: TODAY_KEY, txt: "老明细"
                });
                transaction.objectStore("events").put({
                    dedupKey: "g:1:268:1", kind: "gift", uid: "1", rid: legacyRoomRid, gfid: "268",
                    gfcnt: 3, bcnt: 1, ts: NOW_TIMESTAMP, dayKey: TODAY_KEY
                });
                transaction.objectStore("room_day").put({
                    ridDay: legacyRoomRid + "|" + TODAY_KEY, rid: legacyRoomRid, dayKey: TODAY_KEY,
                    danmakuCnt: 777, minutes: { "1792199040": [4, 2] }, nobleCnt: 371
                });
                transaction.objectStore("rooms").put({ rid: legacyRoomRid, roomName: "老房间" });
                transaction.objectStore("users").put({ uid: "1", nn: "老用户", cnt: 4, lastSeen: 1000 });
                transaction.objectStore("seen").put({ key: "chat|" + TODAY_KEY + "|1", scope: "chat", dayKey: TODAY_KEY, uid: "1" });
                transaction.objectStore("meta").put({ k: "counters", v: { events: 2, chat: 1, gift: 1, enter: 0, days: {} } });
                transaction.objectStore("meta").put({ k: "lastFlush", v: 12345 });
                transaction.oncomplete = function () { database.close(); resolve(true); };
                transaction.onabort = function () { database.close(); reject(transaction.error); };
            };
        });
    }

    function inspectEventsIndexes(factory) {
        return new Promise(function (resolve, reject) {
            var openRequest = factory.open("DouyuExArchive");
            openRequest.onerror = function () { reject(openRequest.error); };
            openRequest.onsuccess = function () {
                var database = openRequest.result;
                var transaction = database.transaction(["events"], "readonly");
                var store = transaction.objectStore("events");
                var names = [];
                var index;
                for (index = 0; index < store.indexNames.length; index += 1) names.push(store.indexNames[index]);
                transaction.oncomplete = function () { database.close(); resolve(names.sort()); };
            };
        });
    }

    /* ---- case A：v2 → v3 ---- */
    return buildLegacyDatabase(v2Factory, 2).then(function () {
        return countAllStores(v2Factory);
    }).then(function (countsBefore) {
        countsBeforeV2 = countsBefore;
        installIndexedDb(v2Factory, { calls: 0 });
        var upgradedModule = loadArchiveModule();
        return upgradedModule.open().then(function (openResult) {
            assert.strictEqual(openResult.ok, true);
            assert.strictEqual(openResult.migrated, "full-reset", "v2→v3 升级必须回报 migrated=full-reset");
            return countAllStores(v2Factory);
        }).then(function (countsAfter) {
            console.log("      v2→v3 升级前后 store 计数：" + formatStoreCounts(countsBeforeV2) + "  →  " + formatStoreCounts(countsAfter));
            ["events", "room_day", "rooms", "users", "gifts", "seen"].forEach(function (storeName) {
                assert.ok(countsBeforeV2[storeName] > 0 || storeName === "gifts", "升级前 " + storeName + " 应该有数据（gifts 没写过）");
                assert.strictEqual(countsAfter[storeName], 0, "升级后 " + storeName + " 必须被清空");
            });
            assert.strictEqual(countsBeforeV2.meta, 2, "升级前 meta 有 counters + lastFlush 两条");
            assert.strictEqual(countsAfter.meta, 1, "升级后 meta 只剩重建时写入的那一条 migration 标记");
            return Promise.all([
                upgradedModule.stats(),
                upgradedModule.getRoomDay(legacyRoomRid, TODAY_KEY),
                upgradedModule.countUsers(),
                upgradedModule.getMeta("migration"),
                upgradedModule.getMeta("lastFlush"),
                upgradedModule.getMeta("counters")
            ]);
        }).then(function (results) {
            assert.strictEqual(results[0].events, 0, "stats().events 归零");
            assert.strictEqual(results[1], null, "旧的 room_day 已经没了（虚高历史值清掉）");
            assert.strictEqual(results[2].count, 0, "users 也清空");
            var migration = results[3];
            assert.ok(migration, "重建后的 meta 里要有 migration 标记");
            assert.strictEqual(migration.kind, "full-reset");
            assert.strictEqual(migration.toVersion, 3);
            assert.ok(migration.at > 0);
            assert.strictEqual(results[4], null, "老的 lastFlush 随 meta 一起没了");
            assert.strictEqual(results[5], null, "老的 counters 也作废");
            return inspectEventsIndexes(v2Factory);
        }).then(function (indexNames) {
            assert.deepStrictEqual(indexNames, ["dayKey", "dedupKey", "rid_dayKey", "uid_dayKey"], "v3 的 events 只有 4 个索引");
            installIndexedDb(mainFactory, openTracker);
        });
    }).then(function () {
        /* ---- case B：v1 → v3（跳版本来也要整体重置） ---- */
        return buildLegacyDatabase(v1Factory, 1).then(function () {
            return countAllStores(v1Factory);
        }).then(function (countsBefore) {
            installIndexedDb(v1Factory, { calls: 0 });
            var upgradedModule = loadArchiveModule();
            return upgradedModule.open().then(function (openResult) {
                assert.strictEqual(openResult.migrated, "full-reset", "v1→v3 同样回报 full-reset");
                return countAllStores(v1Factory).then(function (countsAfter) {
                    console.log("      v1→v3 升级前后 store 计数：" + formatStoreCounts(countsBefore) + "  →  " + formatStoreCounts(countsAfter));
                    ["events", "room_day", "rooms", "users", "gifts", "seen"].forEach(function (storeName) {
                        assert.strictEqual(countsAfter[storeName], 0, "升级后 " + storeName + " 必须被清空");
                    });
                    assert.strictEqual(countsAfter.meta, 1, "meta 只剩 migration 标记那一条");
                });
            });
        });
    }).then(function () {
        installIndexedDb(mainFactory, openTracker);
        ok("v1/v2 → v3 都是整体重置：7 个 store 全部清空、migrated=full-reset、meta 里留 migration 标记、events 只剩 4 索引");
    }).catch(function (error) {
        installIndexedDb(mainFactory, openTracker);
        throw error;
    });
});


step("㉜ 没有 indexedDB 时全部优雅降级（零异常）", function () {
    delete global.indexedDB;

    var probes = [];
    function recordProbe(name, promise) {
        probes.push(promise.then(function (result) {
            assert.strictEqual(result.ok, false, name + " 必须 resolve ok:false");
            assert.strictEqual(result.reason, "unsupported", name + " 的 reason 必须是 unsupported");
        }, function (error) {
            throw new Error(name + " 抛异常了：" + (error && error.message));
        }));
    }

    recordProbe("open", archiveApi.open());
    recordProbe("putEvents", archiveApi.putEvents([makeChatEvent("1", TODAY_KEY, 1)]));
    recordProbe("commitBatch", archiveApi.commitBatch({ events: [makeChatEvent("2", TODAY_KEY, 2)] }));
    recordProbe("putRooms", archiveApi.putRooms([{ rid: "1", roomName: "x" }]));
    recordProbe("putUsers", archiveApi.putUsers([{ uid: "1", nn: "x", cnt: 1 }]));
    recordProbe("countUsers", archiveApi.countUsers());
    recordProbe("getRoom", archiveApi.getRoom(ROOM_A));
    recordProbe("upsertRoomDay", archiveApi.upsertRoomDay(
        ROOM_A + "|" + TODAY_KEY,
        { rid: ROOM_A, dayKey: TODAY_KEY },
        { danmakuCnt: 1 }
    ));
    recordProbe("queryUserDay", archiveApi.queryUserDay("1", TODAY_KEY, {}));
    recordProbe("queryRoomDayEvents", archiveApi.queryRoomDayEvents(ROOM_A, TODAY_KEY, {}));
    recordProbe("topUsers", archiveApi.topUsers(ROOM_A, TODAY_KEY, "chat", 5));
    recordProbe("listRoomDays", archiveApi.listRoomDays(TODAY_KEY));
    recordProbe("sumRoomDays", archiveApi.sumRoomDays(ROOM_A, TODAY_KEY, TODAY_KEY));
    recordProbe("putSeen", archiveApi.putSeen([{ scope: "chat", dayKey: TODAY_KEY, uid: "1" }]));
    recordProbe("getSeen", archiveApi.getSeen("chat", TODAY_KEY));
    recordProbe("clearSeenBefore", archiveApi.clearSeenBefore(TODAY_KEY));
    recordProbe("stats", archiveApi.stats());
    recordProbe("prune", archiveApi.prune());
    recordProbe("clearAll", archiveApi.clearAll());
    recordProbe("setMeta", archiveApi.setMeta("lastFlush", 1));

    return Promise.all(probes).then(function () {
        return Promise.all([
            archiveApi.getRoomDay(ROOM_A, TODAY_KEY),
            archiveApi.getMeta("lastFlush")
        ]);
    }).then(function (reads) {
        assert.strictEqual(reads[0], null, "无 indexedDB 时 getRoomDay 降级成 null");
        assert.strictEqual(reads[1], null, "无 indexedDB 时 getMeta 降级成 null");
        ok("indexedDB 缺失：20 个写/查询入口全部 resolve 兜底值（reason=unsupported）、读操作 null，零异常");
    });
});

/* ---------------- 收尾 ---------------- */

chain.then(function () {
    console.log("\n=== IndexedDB 归档层专项测试全部通过（" + passedCount + " 项） ===");
    process.exit(0);
}).catch(function (error) {
    console.error("\n✗ 测试失败:", error && error.message);
    if (error && error.stack) console.error(error.stack.split("\n").slice(1, 5).join("\n"));
    process.exit(1);
});
