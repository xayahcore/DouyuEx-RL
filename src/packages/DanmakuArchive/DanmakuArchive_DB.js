/* ==================== 弹幕归档：IndexedDB 存储层（库名 DouyuExArchive） ==================== */
/*
 * 职责边界：只做「建库 / 写入 / 查询 / 统计 / 裁剪」，不认识 DOM、不发网络请求、不碰 GM_* API。
 * 采集侧（实时弹幕/礼物/进场 + 房间汇总的计算）负责把数据整理成契约里的记录形状再喂进来。
 *
 * 全局依赖：indexedDB、IDBKeyRange（浏览器标准 API），navigator.storage.estimate 可选。
 * 降级契约：indexedDB（或 IDBKeyRange）不存在时，写操作 resolve {ok:false, reason:"unsupported"}，
 *           读操作 resolve 空值（null / {ok:false, list:[]}），任何路径都不抛异常出去。
 *
 * 库结构（版本 3，onupgradeneeded 按 oldVersion 建表）：
 *   events   keyPath:id（自增）  index: dedupKey(unique) / dayKey / uid_dayKey / rid_dayKey
 *   room_day keyPath:ridDay      index: dayKey
 *   rooms    keyPath:rid         ← putRooms / getRoom
 *   users    keyPath:uid         index: lastSeen   ← putUsers / countUsers
 *   gifts    keyPath:gfid        ← 目前无写入方（P1 预留，礼物价目表走 meta 不走这里）
 *   seen     keyPath:key         index: scope_dayKey   ← putSeen / getSeen / clearSeenBefore
 *            分块存：key = "scope|dayKey|chunk"，记录 { key, scope, dayKey, chunk, uids:[…] }，
 *            每块最多 500 个 uid，写满溢出到 64 / 65 / … 号块（首选块 = hash(uid) % 64）
 *   meta     keyPath:k           ← getMeta / setMeta（价目表 gifts:v1、lastFlush、clockSkew、prunedDays、
 *            counters 增量计数器、migration 升级标记）
 *
 * ⚠ 版本 3 是**整体重置**：任何 oldVersion < 3 的库升级时，onupgradeneeded 会把所有 object store
 *   全删掉再按当前 schema 重建 —— **本地档案（明细 events + 聚合 room_day / rooms / users /
 *   gifts / seen / meta）全部清空**。理由是旧 room_day 里带着修复前那批 +17% 虚高的历史值，纠不
 *   回来，一次性重来最干净。升级那次 open() 返回 { ok:true, migrated:"full-reset" }，并在重建
 *   出来的 meta 里写一条 migration = { kind:"full-reset", toVersion:3, at } 供 UI / 日志追溯。
 *
 * 存储策略：明细保留 7 天（今天 + 前 6 天，dayKey 字典序比较，删 < cutoff 的），room_day 永不参与
 *   裁剪；另有 1 GB 硬上限，超了就从旧到新（主键升序 = 写入顺序）删 events。
 *
 * 实现约定（写清楚，避免上游踩坑）：
 *   · 风格：纯 ES5 函数声明 + Promise 链，无 async/await、无箭头函数，语义化全名。
 *   · 去重：events 的 dedupKey 唯一索引冲突（ConstraintError）在请求级 preventDefault 吞掉，
 *     并计入 skipped，绝不让一条重复数据拖垮整批事务。同一批内重复也走同一条路径。
 *   · dedupKey 由写入方给；万一缺失，这里按契约公式兜底派生：
 *     gift -> "g:<uid>:<gfid>:<bcnt>"、enter -> "e:<uid>:<ts>"、其余 -> "c:<cid|ts:uid>"。
 *   · dayKey 由写入方给；缺失时按 ts 的本地日期兜底派生（prune 靠它做字典序比较）。
 *   · 事务：写操作按 1000 条/事务分批，成功的批次已提交、不因后续批次失败回滚（契约要求）。
 *   · 排序：queryUserDay 按「索引键 + 主键(id)」升序（落库顺序，翻页稳定）；
 *     queryRoomDayEvents 先按 id 升序取 limit 条，再按 ts 升序整理成时间线。
 *   · observedMin 是 room_day 的普通数值计数（当日实际观测到的分钟数，同一分钟只算一次，去重由
 *     Ingest 侧保证）：和 danmakuCnt 一样落在 ARCHIVE_DB_ROOM_DAY_NUMBER_FIELDS 里 → 默认 0、
 *     走 deltas 累加；Ingest 不会把它放进 patch。
 *   · room_day 已瘦身：minutes（分钟直方图）、nobleCnt、observedMinSession、sessionStart 四个
 *     预留字段全部删除，记录里不会再出现这些键。
 *   · sumRoomDays 是闭区间聚合：sum 是 9 个跨天有意义的字段逐项相加，latest 只留 { lastTs }
 *     （区间内最大值）；反向区间按空区间返回 days:0。
 *   · topUsers 扫事件只聚合 uid / value（事件已瘦身、不再带 nn），扫完统一回查 users 表
 *     （uid -> nn）把昵称补上；users 表里没有的 uid 昵称返回空串（不是 undefined）。
 *   · seen 分块存（见库结构），putSeen 的 added 按新 uid 数算，getSeen 会把该 scope+dayKey 的
 *     所有块合并成完整 uid 列表后再返回。
 *   · seen 写入串行化：putSeen 与 clearSeenBefore 共用一条模块级 promise 链（写法同 Ingest 的
 *     upsertRoomDay 串行链），保证同一个块不会被两个事务同时读改写。并发读改写会丢 uid ——
 *     实测「70s 采集 → 刷新 → 再采 70s」时真实 97 人、库里 106 人，多出的 9 个就是被覆盖掉的
 *     uid 又变回了「当日首次」。注意：这只解决**同页**并发；多标签页同时开会话仍需 Web Locks
 *     （navigator.locks）才能跨页互斥，本层暂不处理。
 *   · __debug 仅供诊断/测试观察上述队列的并发上限，Ingest / UI 不要依赖。
 *   · commitBatch 是「原子批量提交」：events / seen / room_day / counters 四件事放进**同一个**
 *     readwrite 事务，任何一步出错整笔 abort，三者都不落地（根治「明细写进去了、seen 名单没落地」
 *     导致下次会话把同一批 uid 重算成当日首次的虚高）。事务里绝不 await 外部 Promise；外部数据
 *     （归一化事件、seen 分组、roomDays 分组）全部在进事务前算好。它和 putSeen 共用同一条串行链。
 *   · rooms / users 走「读改写合并」：空值（undefined / null / ""）不覆盖已有值，
 *     users.cnt 累加、其余非空字段覆盖；同一批里重复的 rid/uid 先在内存合并成一条再落库，
 *     避免两次 get 读到同一份旧值而丢掉累加。→ {ok, added, updated, skipped}
 *   · 统计口径：stats().rooms = room_day 里 distinct rid 数（与 roomDetail 同口径）；
 *     stats().users = users store 的 count()（与 countUsers() 同一实现，不扫事件表）。
 *   · stats() 是 O(1)（相对事件条数）：events / chatEvents / giftEvents / enterEvents /
 *     oldestDay / newestDay 全部来自 meta.counters 增量计数器，不再全表扫 events。计数器由
 *     putEvents 在写入事务里累加、prune 的两种删法在各自事务里同步扣减；缺失（老库 / 被清过）
 *     时 stats() 会重算一次并写回。128k 条实测：全表扫版 1330 ms → 计数器版 3 ms 量级。
 */

var ArchiveDB = (function () {
    "use strict";

    /* ---------------- 常量 ---------------- */

    var ARCHIVE_DB_NAME = "DouyuExArchive";
    var ARCHIVE_DB_VERSION_NUMBER = 3;

    var ARCHIVE_DB_STORE_EVENTS = "events";
    var ARCHIVE_DB_STORE_ROOM_DAY = "room_day";
    var ARCHIVE_DB_STORE_ROOMS = "rooms";
    var ARCHIVE_DB_STORE_USERS = "users";
    var ARCHIVE_DB_STORE_GIFTS = "gifts";
    var ARCHIVE_DB_STORE_SEEN = "seen";
    var ARCHIVE_DB_STORE_META = "meta";

    var ARCHIVE_DB_ALL_STORES = [
        ARCHIVE_DB_STORE_EVENTS,
        ARCHIVE_DB_STORE_ROOM_DAY,
        ARCHIVE_DB_STORE_ROOMS,
        ARCHIVE_DB_STORE_USERS,
        ARCHIVE_DB_STORE_GIFTS,
        ARCHIVE_DB_STORE_SEEN,
        ARCHIVE_DB_STORE_META
    ];

    var ARCHIVE_DB_INDEX_DEDUP_KEY = "dedupKey";
    var ARCHIVE_DB_INDEX_DAY_KEY = "dayKey";
    var ARCHIVE_DB_INDEX_UID_DAY = "uid_dayKey";
    var ARCHIVE_DB_INDEX_RID_DAY = "rid_dayKey";
    var ARCHIVE_DB_INDEX_LAST_SEEN = "lastSeen";
    var ARCHIVE_DB_INDEX_SCOPE_DAY = "scope_dayKey";

    var ARCHIVE_DB_EVENT_BATCH_SIZE = 1000;
    /* 明细保留 7 天（今天 + 前 6 天）；room_day 不参与裁剪。 */
    var ARCHIVE_DB_RETENTION_DAYS = 7;
    /* 硬上限 1 GB：超了就从旧到新删 events。 */
    var ARCHIVE_DB_BYTES_LIMIT = 1024 * 1024 * 1024;
    var ARCHIVE_DB_EVENT_BYTES_ESTIMATE = 120;
    var ARCHIVE_DB_USER_DAY_LIMIT_DEFAULT = 50;
    var ARCHIVE_DB_ROOM_DAY_LIMIT_DEFAULT = 500;
    var ARCHIVE_DB_TOP_USERS_LIMIT_DEFAULT = 20;
    var ARCHIVE_DB_ROOM_DAY_LIST_MAX = 10000;
    var ARCHIVE_DB_SIZE_PRUNE_CHUNK = 1000;
    var ARCHIVE_DB_SIZE_PRUNE_ROUNDS = 50;

    var ARCHIVE_DB_META_LAST_FLUSH = "lastFlush";
    var ARCHIVE_DB_META_CLOCK_SKEW = "clockSkew";
    var ARCHIVE_DB_META_PRUNED_DAYS = "prunedDays";
    /* meta.counters：events 的增量计数器（O(1) 出 stats，不再全表扫）。 */
    var ARCHIVE_DB_META_COUNTERS = "counters";
    /* meta.migration：版本 3 那次「整体重置」留下的标记，供 UI / 日志追溯。 */
    var ARCHIVE_DB_META_MIGRATION = "migration";
    var ARCHIVE_DB_MIGRATION_FULL_RESET = "full-reset";

    /* 建表描述：当前版本（3）的唯一真相，open 的 onupgradeneeded 直接照它建。
     * 与 v1 的差别：events 去掉单列 uid / rid 索引（复合索引 [uid+dayKey] / [rid+dayKey] 已够用），
     * 少两个索引能省下可观体积。 */
    var ARCHIVE_DB_SCHEMA = [
        {
            name: ARCHIVE_DB_STORE_EVENTS,
            keyPath: "id",
            autoIncrement: true,
            indexes: [
                { name: ARCHIVE_DB_INDEX_DEDUP_KEY, keyPath: "dedupKey", unique: true },
                { name: ARCHIVE_DB_INDEX_DAY_KEY, keyPath: "dayKey", unique: false },
                { name: ARCHIVE_DB_INDEX_UID_DAY, keyPath: ["uid", "dayKey"], unique: false },
                { name: ARCHIVE_DB_INDEX_RID_DAY, keyPath: ["rid", "dayKey"], unique: false }
            ]
        },
        {
            name: ARCHIVE_DB_STORE_ROOM_DAY,
            keyPath: "ridDay",
            autoIncrement: false,
            indexes: [{ name: ARCHIVE_DB_INDEX_DAY_KEY, keyPath: "dayKey", unique: false }]
        },
        { name: ARCHIVE_DB_STORE_ROOMS, keyPath: "rid", autoIncrement: false, indexes: [] },
        {
            name: ARCHIVE_DB_STORE_USERS,
            keyPath: "uid",
            autoIncrement: false,
            indexes: [{ name: ARCHIVE_DB_INDEX_LAST_SEEN, keyPath: "lastSeen", unique: false }]
        },
        { name: ARCHIVE_DB_STORE_GIFTS, keyPath: "gfid", autoIncrement: false, indexes: [] },
        {
            name: ARCHIVE_DB_STORE_SEEN,
            keyPath: "key",
            autoIncrement: false,
            indexes: [{ name: ARCHIVE_DB_INDEX_SCOPE_DAY, keyPath: ["scope", "dayKey"], unique: false }]
        },
        { name: ARCHIVE_DB_STORE_META, keyPath: "k", autoIncrement: false, indexes: [] }
    ];

    /* room_day 的数值字段基线：缺字段时按 0 起算，保证累加不出 NaN。
     * observedMin：当日在该房间「实际观测到的分钟数」（去重，同一分钟只算一次），
     * 和在线的 danmakuCnt 一样走 deltas 累加（Ingest 每观测到新的一分钟就 +1）。
     * 注意：minutes（分钟直方图）、nobleCnt（贵宾数）、observedMinSession / sessionStart
     * 这些预留字段已经全部清掉，room_day 不再保存它们。 */
    var ARCHIVE_DB_ROOM_DAY_NUMBER_FIELDS = [
        "danmakuCnt",
        "incomeCents",
        "giftCnt",
        "activeUv",
        "chatUv",
        "giftUv",
        "paidUv",
        "enterUv",
        "observedMin",
        "bagCnt",
        "freeCnt",
        "unknownGiftCnt",
        "firstTs",
        "lastTs"
    ];

    /* ---------------- 模块内部状态 ---------------- */

    var archiveDbHandle = null;
    var archiveDbOpenPromise = null;

    /* ---------------- 通用小工具 ---------------- */

    function archiveDbHasOwn(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    function archiveDbKeyText(value) {
        if (value === null || value === undefined) return "";
        return String(value);
    }

    function archiveDbNumericValue(value) {
        var numeric = typeof value === "number" ? value : parseFloat(value);
        if (typeof numeric !== "number" || !isFinite(numeric)) return 0;
        return numeric;
    }

    function archiveDbLimitOption(value, fallbackLimit) {
        var numeric = typeof value === "number" ? value : parseInt(value, 10);
        if (typeof numeric !== "number" || !isFinite(numeric) || numeric < 0) return fallbackLimit;
        return Math.floor(numeric);
    }

    function archiveDbPad2(value) {
        return value < 10 ? "0" + value : String(value);
    }

    function archiveDbDayKeyFromTs(timestamp) {
        var moment = new Date(archiveDbNumericValue(timestamp));
        if (isNaN(moment.getTime())) moment = new Date();
        return moment.getFullYear() + "-" + archiveDbPad2(moment.getMonth() + 1) + "-" + archiveDbPad2(moment.getDate());
    }

    function archiveDbErrorMessage(error) {
        if (!error) return "";
        if (error.name && error.message) return String(error.name) + ": " + String(error.message);
        if (error.message) return String(error.message);
        return String(error);
    }

    function archiveDbIsSupported() {
        if (typeof indexedDB === "undefined" || !indexedDB || typeof indexedDB.open !== "function") return false;
        if (typeof IDBKeyRange === "undefined" || !IDBKeyRange || typeof IDBKeyRange.only !== "function") return false;
        return true;
    }

    function archiveDbFailure(reason, extraFields) {
        var failure = { ok: false, reason: reason };
        var fieldName;
        if (extraFields) {
            for (fieldName in extraFields) {
                if (archiveDbHasOwn(extraFields, fieldName)) failure[fieldName] = extraFields[fieldName];
            }
        }
        return failure;
    }

    /* ---------------- 建表 ---------------- */

    /* 建表 / 升级。migrationFlags 由 open() 传进来，用于把「库被整体重置」这件事
     * 回传给调用方（UI / 日志能看出来本地档案被清过一次）。 */
    function archiveDbApplySchema(database, upgradeTransaction, upgradeEvent, migrationFlags) {
        var oldVersion = archiveDbNumericValue(upgradeEvent && upgradeEvent.oldVersion);
        if (oldVersion < 1) {
            /* 全新库：直接按当前版本建全套 store。 */
            archiveDbCreateSchemaStores(database, upgradeTransaction);
            return;
        }
        if (oldVersion < 3) {
            /* v1 / v2 → v3：**整体重置**。旧的 room_day 里是修复前那批虚高的历史值，纠不回来，
             * 干脆一次性重来：所有 store（含 room_day / rooms / users / gifts / seen / meta）全删重建。
             * 这是有意的地基重置，不是 bug。 */
            archiveDbDropAllStores(database);
            archiveDbCreateSchemaStores(database, upgradeTransaction);
            /* meta 也是新建的，标记在重建之后写进 upgrade 事务即可。 */
            archiveDbWriteMigrationMarkerInUpgrade(upgradeTransaction);
            if (migrationFlags) migrationFlags.fullReset = true;
        }
    }

    function archiveDbDropAllStores(database) {
        if (!database || !database.objectStoreNames) return;
        var existingNames = [];
        var nameIndex;
        for (nameIndex = 0; nameIndex < database.objectStoreNames.length; nameIndex += 1) {
            existingNames.push(database.objectStoreNames[nameIndex]);
        }
        for (nameIndex = 0; nameIndex < existingNames.length; nameIndex += 1) {
            try {
                database.deleteObjectStore(existingNames[nameIndex]);
            } catch (error) {
                /* 删不掉就继续删下一个：升级事务里能删的都会删掉 */
            }
        }
    }

    function archiveDbWriteMigrationMarkerInUpgrade(upgradeTransaction) {
        if (!upgradeTransaction || typeof upgradeTransaction.objectStore !== "function") return;
        var store = null;
        try {
            store = upgradeTransaction.objectStore(ARCHIVE_DB_STORE_META);
        } catch (error) {
            store = null;
        }
        if (!store) return;
        store.put({
            k: ARCHIVE_DB_META_MIGRATION,
            v: {
                kind: ARCHIVE_DB_MIGRATION_FULL_RESET,
                toVersion: ARCHIVE_DB_VERSION_NUMBER,
                at: Date.now()
            }
        });
    }

    function archiveDbCreateSchemaStores(database, upgradeTransaction) {
        var storeIndex;
        for (storeIndex = 0; storeIndex < ARCHIVE_DB_SCHEMA.length; storeIndex += 1) {
            archiveDbCreateOneStore(database, upgradeTransaction, ARCHIVE_DB_SCHEMA[storeIndex]);
        }
    }

    function archiveDbCreateOneStore(database, upgradeTransaction, description) {
        var store = null;
        if (database.objectStoreNames && database.objectStoreNames.contains(description.name)) {
            store = upgradeTransaction && upgradeTransaction.objectStore ? upgradeTransaction.objectStore(description.name) : null;
        } else {
            store = database.createObjectStore(description.name, {
                keyPath: description.keyPath,
                autoIncrement: description.autoIncrement === true
            });
        }
        if (!store || !description.indexes) return;
        var indexIndex;
        for (indexIndex = 0; indexIndex < description.indexes.length; indexIndex += 1) {
            var indexDescription = description.indexes[indexIndex];
            if (store.indexNames && store.indexNames.contains(indexDescription.name)) continue;
            store.createIndex(indexDescription.name, indexDescription.indexPath || indexDescription.keyPath, { unique: indexDescription.unique === true });
        }
    }


    /* ---------------- open（幂等 + 并发合流） ---------------- */

    function archiveDbOpenInternal() {
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbFailure("unsupported"));
        if (archiveDbHandle) return Promise.resolve({ ok: true });
        if (archiveDbOpenPromise) return archiveDbOpenPromise;

        var pending = new Promise(function (resolve) {
            var request;
            try {
                request = indexedDB.open(ARCHIVE_DB_NAME, ARCHIVE_DB_VERSION_NUMBER);
            } catch (error) {
                resolve(archiveDbFailure("open-failed"));
                return;
            }
            var settled = false;
            var migrationFlags = { fullReset: false };
            function settle(payload) {
                if (settled) return;
                settled = true;
                resolve(payload);
            }
            request.onupgradeneeded = function (upgradeEvent) {
                try {
                    archiveDbApplySchema(request.result, request.transaction, upgradeEvent, migrationFlags);
                } catch (error) {
                    settle(archiveDbFailure("upgrade-failed"));
                }
            };
            request.onsuccess = function () {
                var database = request.result;
                if (!database) {
                    settle(archiveDbFailure("open-failed"));
                    return;
                }
                database.onversionchange = function () {
                    try { database.close(); } catch (closeError) { /* 忽略：连接已失效 */ }
                    archiveDbHandle = null;
                    archiveDbOpenPromise = null;
                };
                database.onclose = function () {
                    archiveDbHandle = null;
                    archiveDbOpenPromise = null;
                };
                archiveDbHandle = database;
                if (migrationFlags.fullReset) {
                    /* 升到 v3 时全部 store 都是删了重建的：本地档案被整体清空。
                     * 结果里带标记让 UI/日志看得出来（meta.migration 已在 upgrade 事务里写好）。 */
                    settle({ ok: true, migrated: ARCHIVE_DB_MIGRATION_FULL_RESET });
                    return;
                }
                settle({ ok: true });
            };
            request.onerror = function () { settle(archiveDbFailure("open-failed")); };
            request.onblocked = function () { settle(archiveDbFailure("blocked")); };
        });

        archiveDbOpenPromise = pending.then(function (result) {
            /* 失败不缓存：下次调用重新尝试开库。 */
            if (!result || result.ok !== true) archiveDbOpenPromise = null;
            return result;
        });
        return archiveDbOpenPromise;
    }

    /* ---------------- 事务外壳 ----------------
     * worker(transaction) 同步发出请求，返回一个「结果容器」；容器里被各请求回调
     * 就地累加/填值，事务 oncomplete 时整体交给调用方（读到的是最终值）。
     */
    function archiveDbRunTransaction(storeNames, mode, worker) {
        return archiveDbOpenInternal().then(function (openResult) {
            if (!openResult || openResult.ok !== true) {
                return archiveDbFailure((openResult && openResult.reason) || "open-failed");
            }
            var database = archiveDbHandle;
            if (!database) return archiveDbFailure("unsupported");

            return new Promise(function (resolve) {
                var transaction;
                try {
                    transaction = database.transaction(storeNames, mode);
                } catch (error) {
                    resolve(archiveDbFailure("transaction-failed", { message: archiveDbErrorMessage(error) }));
                    return;
                }

                var payload = null;
                var workerFailure = null;
                var settled = false;
                function settle(result) {
                    if (settled) return;
                    settled = true;
                    resolve(result);
                }

                transaction.oncomplete = function () { settle({ ok: true, value: payload }); };
                transaction.onerror = function () { settle(archiveDbFailure("transaction-error")); };
                transaction.onabort = function () {
                    if (workerFailure) {
                        settle(archiveDbFailure("worker-failed", { message: archiveDbErrorMessage(workerFailure) }));
                        return;
                    }
                    settle(archiveDbFailure("aborted"));
                };

                try {
                    payload = worker(transaction);
                } catch (error) {
                    workerFailure = error;
                    var aborted = false;
                    try { transaction.abort(); } catch (abortError) { aborted = false; }
                    if (!aborted) {
                        settle(archiveDbFailure("worker-failed", { message: archiveDbErrorMessage(error) }));
                    }
                }
            });
        });
    }

    /* ---------------- meta.counters 增量计数器 ----------------
     * 形状：{ events, chat, gift, enter, days: { "YYYY-MM-DD": 该日事件数 } }
     * events 恒等于 chat+gift+enter（按 kind 汇总时同步维护），保证 stats() 与「真扫一遍」一致。
     * 所有增删 events 的路径（putEvents / prune 的两种删法）都在各自事务里同步维护它。
     */

    function archiveDbEmptyCounters() {
        return { events: 0, chat: 0, gift: 0, enter: 0, days: {} };
    }

    function archiveDbNormalizeCounters(rawValue) {
        if (!rawValue || typeof rawValue !== "object") return null;
        var counters = archiveDbEmptyCounters();
        counters.chat = archiveDbNumericValue(rawValue.chat);
        counters.gift = archiveDbNumericValue(rawValue.gift);
        counters.enter = archiveDbNumericValue(rawValue.enter);
        var dayKey;
        if (rawValue.days && typeof rawValue.days === "object") {
            for (dayKey in rawValue.days) {
                if (!archiveDbHasOwn(rawValue.days, dayKey)) continue;
                if (!dayKey) continue;
                counters.days[dayKey] = archiveDbNumericValue(rawValue.days[dayKey]);
            }
        }
        /* events 以三类之和为准（历史数据里 events 字段可能缺失或漂移）。 */
        counters.events = counters.chat + counters.gift + counters.enter;
        return counters;
    }

    function archiveDbClassifyEventKind(kind) {
        if (kind === "gift") return "gift";
        if (kind === "enter") return "enter";
        return "chat";
    }

    /* sign = +1（写入）/ -1（删除）：按 kind 与按天同步增减，删到 0 的天从 days 里摘掉。 */
    function archiveDbApplyCounterDelta(counters, byKind, byDay, sign) {
        counters.chat = Math.max(0, counters.chat + sign * archiveDbNumericValue(byKind.chat));
        counters.gift = Math.max(0, counters.gift + sign * archiveDbNumericValue(byKind.gift));
        counters.enter = Math.max(0, counters.enter + sign * archiveDbNumericValue(byKind.enter));
        counters.events = counters.chat + counters.gift + counters.enter;
        var dayKey;
        if (!byDay) return counters;
        for (dayKey in byDay) {
            if (!archiveDbHasOwn(byDay, dayKey)) continue;
            if (!dayKey) continue;
            var nextValue = archiveDbNumericValue(counters.days[dayKey]) + sign * archiveDbNumericValue(byDay[dayKey]);
            if (nextValue > 0) {
                counters.days[dayKey] = nextValue;
            } else {
                delete counters.days[dayKey];
            }
        }
        return counters;
    }

    function archiveDbReadCounters() {
        return archiveDbRunTransaction([ARCHIVE_DB_STORE_META], "readonly", function (transaction) {
            var outcome = { counters: null };
            var request = transaction.objectStore(ARCHIVE_DB_STORE_META).get(ARCHIVE_DB_META_COUNTERS);
            request.onsuccess = function () {
                var record = request.result;
                outcome.counters = record ? archiveDbNormalizeCounters(record.v) : null;
            };
            return outcome;
        }).then(function (result) {
            if (!result || result.ok !== true) return { ok: false, counters: null };
            return { ok: true, counters: result.value.counters };
        });
    }

    function archiveDbWriteCounters(counters) {
        return archiveDbRunTransaction([ARCHIVE_DB_STORE_META], "readwrite", function (transaction) {
            transaction.objectStore(ARCHIVE_DB_STORE_META).put({ k: ARCHIVE_DB_META_COUNTERS, v: counters });
            return { written: true };
        }).then(function (result) {
            return !!(result && result.ok === true);
        });
    }

    /* 全表扫一遍把计数重算出来并写回（只在 counters 缺失/无效时走这条路）。 */
    function archiveDbRecomputeCounters() {
        return archiveDbRunTransaction([ARCHIVE_DB_STORE_EVENTS], "readonly", function (transaction) {
            var outcome = { counters: archiveDbEmptyCounters() };
            var cursorRequest = transaction.objectStore(ARCHIVE_DB_STORE_EVENTS).openCursor();
            cursorRequest.onsuccess = function () {
                var cursor = cursorRequest.result;
                if (!cursor) return;
                var record = cursor.value || {};
                var counters = outcome.counters;
                counters[archiveDbClassifyEventKind(record.kind)] += 1;
                counters.events += 1;
                var dayKeyText = archiveDbKeyText(record.dayKey);
                if (dayKeyText) counters.days[dayKeyText] = archiveDbNumericValue(counters.days[dayKeyText]) + 1;
                cursor.continue();
            };
            return outcome;
        }).then(function (result) {
            var counters = result && result.ok === true && result.value ? result.value.counters : archiveDbEmptyCounters();
            return archiveDbWriteCounters(counters).then(function () {
                return counters;
            });
        });
    }

    /* 拿到一份可用的计数器：没有就重算一次并写回（老库升级后的第一条 stats/putEvents 会走这里）。 */
    function archiveDbEnsureCounters() {
        return archiveDbReadCounters().then(function (detail) {
            if (detail && detail.counters) return detail.counters;
            return archiveDbRecomputeCounters();
        });
    }

    /* ---------------- 事件记录整理 ---------------- */

    function archiveDbDeriveDedupKey(record) {
        var uidText = archiveDbKeyText(record.uid);
        var timestamp = archiveDbNumericValue(record.ts);
        if (record.kind === "gift") {
            return "g:" + uidText + ":" + archiveDbKeyText(record.gfid) + ":" + archiveDbKeyText(record.bcnt);
        }
        if (record.kind === "enter") return "e:" + uidText + ":" + timestamp;
        if (record.cid !== undefined && record.cid !== null && record.cid !== "") return "c:" + archiveDbKeyText(record.cid);
        return "c:" + timestamp + ":" + uidText;
    }

    function archiveDbNormalizeEvent(record) {
        if (!record || typeof record !== "object") return null;
        var normalized = {};
        var fieldName;
        for (fieldName in record) {
            if (archiveDbHasOwn(record, fieldName)) normalized[fieldName] = record[fieldName];
        }
        var rawTimestamp = normalized.ts;
        var numericTimestamp = archiveDbNumericValue(rawTimestamp);
        if (rawTimestamp === undefined || rawTimestamp === null || rawTimestamp === "" || numericTimestamp <= 0) {
            /* ts 缺失或非法：以当前时间兜底，避免 dayKey 派生到 1970 被立刻裁掉。 */
            normalized.ts = Date.now();
        } else {
            normalized.ts = numericTimestamp;
        }
        normalized.kind = normalized.kind ? String(normalized.kind) : "chat";
        normalized.uid = archiveDbKeyText(normalized.uid);
        normalized.rid = archiveDbKeyText(normalized.rid);
        normalized.dayKey = normalized.dayKey ? String(normalized.dayKey) : archiveDbDayKeyFromTs(normalized.ts);
        if (normalized.gfcnt !== undefined) normalized.gfcnt = archiveDbNumericValue(normalized.gfcnt);
        normalized.dedupKey = normalized.dedupKey ? String(normalized.dedupKey) : archiveDbDeriveDedupKey(normalized);
        return normalized;
    }

    /* 写入结果既累进 outcome，也同步累进 counters 的 byKind / byDay（只算真正写进去的）。 */
    function archiveDbAttachDedupHandlers(request, outcome, record, counterState, onSettled) {
        function settlePending() {
            if (counterState) counterState.pendingAdds -= 1;
            if (typeof onSettled === "function") onSettled();
        }
        request.onsuccess = function () {
            outcome.added += 1;
            if (record) {
                var kindKey = archiveDbClassifyEventKind(record.kind);
                if (outcome.byKind) outcome.byKind[kindKey] += 1;
                if (outcome.byDay) {
                    var dayKeyText = archiveDbKeyText(record.dayKey);
                    if (dayKeyText) outcome.byDay[dayKeyText] = archiveDbNumericValue(outcome.byDay[dayKeyText]) + 1;
                }
            }
            settlePending();
        };
        request.onerror = function (requestEvent) {
            /* dedupKey 唯一索引冲突：吞掉这条，不中止事务。 */
            if (requestEvent && typeof requestEvent.preventDefault === "function") requestEvent.preventDefault();
            if (requestEvent && typeof requestEvent.stopPropagation === "function") requestEvent.stopPropagation();
            outcome.skipped += 1;
            settlePending();
        };
    }

    /* ---------------- 批量写入事件 ---------------- */

    function archiveDbPutEvents(events) {
        if (!archiveDbIsSupported()) {
            return Promise.resolve(archiveDbFailure("unsupported", { added: 0, skipped: 0 }));
        }
        if (!events || typeof events.length !== "number" || typeof events === "string") {
            return Promise.resolve(archiveDbFailure("bad-arg", { added: 0, skipped: 0 }));
        }

        var prepared = [];
        var invalidCount = 0;
        var inputIndex;
        for (inputIndex = 0; inputIndex < events.length; inputIndex += 1) {
            var normalized = archiveDbNormalizeEvent(events[inputIndex]);
            if (normalized) {
                prepared.push(normalized);
            } else {
                invalidCount += 1;
            }
        }

        var summary = { added: 0, skipped: invalidCount };
        if (prepared.length === 0) {
            return Promise.resolve({ ok: true, added: summary.added, skipped: summary.skipped });
        }

        function runBatch(startIndex) {
            if (startIndex >= prepared.length) {
                return Promise.resolve({ ok: true, added: summary.added, skipped: summary.skipped });
            }
            var batch = prepared.slice(startIndex, startIndex + ARCHIVE_DB_EVENT_BATCH_SIZE);
            return archiveDbRunTransaction([ARCHIVE_DB_STORE_EVENTS, ARCHIVE_DB_STORE_META], "readwrite", function (transaction) {
                /* byKind / byDay 只统计「真正写入成功」的那些（dedupKey 冲突跳过的不算）。 */
                var context = archiveDbNewEventWriteContext();
                archiveDbWriteEventsInTransaction(transaction, batch, context);
                return context;
            }).then(function (batchResult) {
                if (!batchResult || batchResult.ok !== true) {
                    return archiveDbFailure((batchResult && batchResult.reason) || "write-failed", {
                        added: summary.added,
                        skipped: summary.skipped
                    });
                }
                summary.added += archiveDbNumericValue(batchResult.value.added);
                summary.skipped += archiveDbNumericValue(batchResult.value.skipped);
                return runBatch(startIndex + batch.length);
            });
        }

        /* 先保证 counters 存在（老库缺 counters 时重算一次），再开始写批次。 */
        return archiveDbEnsureCounters().then(function () {
            return runBatch(0);
        });
    }

    /* ---------------- 事务内写入原语（putEvents / commitBatch 共用） ----------------
     * 这几个函数都只接收「已经打开的 transaction」：请求全部在调用时/回调里同步发出，
     * 绝不 promise 化，这样事务不会因为 await 外部 Promise 而提前自动提交。
     */

    function archiveDbNewEventWriteContext() {
        return {
            added: 0,
            skipped: 0,
            byKind: { chat: 0, gift: 0, enter: 0 },
            byDay: {},
            counters: null
        };
    }

    /* 写 events（dedupKey 冲突跳过）+ 在同一事务里维护 meta.counters。 */
    function archiveDbWriteEventsInTransaction(transaction, records, context) {
        var eventStore = transaction.objectStore(ARCHIVE_DB_STORE_EVENTS);
        var metaStore = transaction.objectStore(ARCHIVE_DB_STORE_META);
        var state = { pendingAdds: records.length, baseLoaded: false, base: archiveDbEmptyCounters(), written: false };

        function tryWriteCounters() {
            if (state.written) return;
            if (state.pendingAdds > 0 || !state.baseLoaded) return;
            state.written = true;
            var nextCounters = state.base;
            archiveDbApplyCounterDelta(nextCounters, context.byKind, context.byDay, 1);
            context.counters = nextCounters;
            metaStore.put({ k: ARCHIVE_DB_META_COUNTERS, v: nextCounters });
        }

        var counterRequest = metaStore.get(ARCHIVE_DB_META_COUNTERS);
        counterRequest.onsuccess = function () {
            var normalized = archiveDbNormalizeCounters(counterRequest.result && counterRequest.result.v);
            state.base = normalized || archiveDbEmptyCounters();
            state.baseLoaded = true;
            tryWriteCounters();
        };

        var eventIndex;
        for (eventIndex = 0; eventIndex < records.length; eventIndex += 1) {
            var request = null;
            try {
                request = eventStore.add(records[eventIndex]);
            } catch (addError) {
                /* 数据本身不可克隆（含函数等）：算作跳过，不拖垮整批。 */
                context.skipped += 1;
                state.pendingAdds -= 1;
                tryWriteCounters();
                continue;
            }
            archiveDbAttachDedupHandlers(request, context, records[eventIndex], state, tryWriteCounters);
        }
    }

    /* ---------------- 原子批量提交：events + seen + room_day + counters 同一事务 ----------------
     * 为什么要它：刷新页面后「活跃值」虚高的根因是一批明细写进了 events、对应的 seen 名单却没
     * 落地 → 下次会话把同一批 uid 重算成「当日首次」。三者同进同退才能根治。
     * 铁律：事务里不 await 任何外部 Promise（否则 IDB 会自动提交）；所有外部数据在调用前算好。
     */

    var ARCHIVE_DB_COMMIT_STORES = [
        ARCHIVE_DB_STORE_EVENTS,
        ARCHIVE_DB_STORE_SEEN,
        ARCHIVE_DB_STORE_ROOM_DAY,
        ARCHIVE_DB_STORE_META
    ];

    /* 仅 __debug 用于测试原子性：置 true 后下一次 commitBatch 会在所有写入完成后主动 abort。 */
    var archiveDbCommitAbortFault = false;

    function archiveDbPrepareCommitSeen(seenList) {
        var groups = [];
        var positionByGroupKey = Object.create(null);
        var skippedCount = 0;
        var itemIndex;
        for (itemIndex = 0; itemIndex < seenList.length; itemIndex += 1) {
            var item = seenList[itemIndex];
            if (!item || typeof item !== "object") {
                skippedCount += 1;
                continue;
            }
            var scopeText = archiveDbKeyText(item.scope);
            var dayKeyText = archiveDbKeyText(item.dayKey);
            var uidText = archiveDbKeyText(item.uid);
            if (!scopeText || !dayKeyText || !uidText) {
                skippedCount += 1;
                continue;
            }
            var groupKey = scopeText + "|" + dayKeyText;
            var position = positionByGroupKey[groupKey];
            if (position === undefined) {
                positionByGroupKey[groupKey] = groups.length;
                groups.push({ scope: scopeText, dayKey: dayKeyText, uids: [uidText] });
                continue;
            }
            groups[position].uids.push(uidText);
        }
        return { groups: groups, skipped: skippedCount };
    }

    /* roomDays 按 ridDay 分组、组内保持数组原序（同 ridDay 多条要按顺序叠加）。 */
    function archiveDbPrepareCommitRoomDays(roomDayList) {
        var groups = [];
        var positionByRidDay = Object.create(null);
        var skippedCount = 0;
        var itemIndex;
        for (itemIndex = 0; itemIndex < roomDayList.length; itemIndex += 1) {
            var item = roomDayList[itemIndex];
            if (!item || typeof item !== "object") {
                skippedCount += 1;
                continue;
            }
            var ridDayText = archiveDbKeyText(item.ridDay);
            if (!ridDayText) {
                skippedCount += 1;
                continue;
            }
            // 兼容两种调用方写法：`patch`（契约名）与 `roomDay`（Ingest 的既有 patchList 结构）。
            // 只认一个键会在调用方用另一个名字时**静默丢掉聚合**（deltas 还在、patch 变 null），
            // 这类静默失效最难查，所以两个都收。
            var patchSource = null;
            if (item.patch && typeof item.patch === "object") patchSource = item.patch;
            else if (item.roomDay && typeof item.roomDay === "object") patchSource = item.roomDay;
            var entry = {
                patch: patchSource,
                deltas: item.deltas && typeof item.deltas === "object" ? item.deltas : null
            };
            var position = positionByRidDay[ridDayText];
            if (position === undefined) {
                positionByRidDay[ridDayText] = groups.length;
                groups.push({ ridDay: ridDayText, entries: [entry] });
                continue;
            }
            groups[position].entries.push(entry);
        }
        return { groups: groups, skipped: skippedCount };
    }

    /* 在事务里按 ridDay 逐个读改写：组内多条按数组顺序依次合并，最后一次 put。 */
    function archiveDbWriteRoomDaysInTransaction(transaction, roomDayGroups, context) {
        var store = transaction.objectStore(ARCHIVE_DB_STORE_ROOM_DAY);
        var groupIndex;

        function writeOneGroup(group) {
            var getRequest = store.get(group.ridDay);
            getRequest.onsuccess = function () {
                try {
                    var merged = getRequest.result || null;
                    var entryIndex;
                    for (entryIndex = 0; entryIndex < group.entries.length; entryIndex += 1) {
                        merged = archiveDbBuildRoomDay(merged, group.ridDay, group.entries[entryIndex].patch, group.entries[entryIndex].deltas);
                    }
                    store.put(merged);
                    context.roomDays += 1;
                    context.records.push(merged);
                } catch (error) {
                    try { transaction.abort(); } catch (abortError) { /* 已经结束 */ }
                }
            };
        }

        for (groupIndex = 0; groupIndex < roomDayGroups.length; groupIndex += 1) {
            writeOneGroup(roomDayGroups[groupIndex]);
        }
    }

    /* 所有写入发完之后挂一个哨兵请求：等它回调说明前面的写都已完成，此时再 abort 就能证明
     * 「已写完但整体回滚」。只在测试注入故障时使用。 */
    function archiveDbArmCommitAbortSentinel(transaction) {
        var metaStore = transaction.objectStore(ARCHIVE_DB_STORE_META);
        var sentinel = metaStore.count();
        sentinel.onsuccess = function () {
            try { transaction.abort(); } catch (abortError) { /* 已经结束 */ }
        };
    }

    function archiveDbCommitBatchNow(prepared) {
        return archiveDbEnsureCounters().then(function () {
            return archiveDbRunTransaction(ARCHIVE_DB_COMMIT_STORES, "readwrite", function (transaction) {
                var context = {
                    events: archiveDbNewEventWriteContext(),
                    seen: { added: 0 },
                    roomDays: 0,
                    records: []
                };

                /* 1) events（含 counters 累加） */
                if (prepared.events.length > 0) {
                    archiveDbWriteEventsInTransaction(transaction, prepared.events, context.events);
                }
                /* 2) seen 分块读改写 */
                var groupIndex;
                for (groupIndex = 0; groupIndex < prepared.seenGroups.length; groupIndex += 1) {
                    var group = prepared.seenGroups[groupIndex];
                    archiveDbMergeSeenInTransaction(transaction, group.scope, group.dayKey, group.uids, context.seen);
                }
                /* 3) room_day 逐个读改写（同 ridDay 按顺序合并） */
                archiveDbWriteRoomDaysInTransaction(transaction, prepared.roomDayGroups, context);

                if (archiveDbCommitAbortFault) {
                    archiveDbCommitAbortFault = false;
                    archiveDbArmCommitAbortSentinel(transaction);
                }
                return context;
            });
        });
    }

    function archiveDbCommitBatch(payload) {
        var emptyCounts = { added: 0, skipped: 0, seenAdded: 0, roomDays: 0, counters: null };
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbFailure("unsupported", emptyCounts));
        if (!payload || typeof payload !== "object") return Promise.resolve(archiveDbFailure("bad-arg", emptyCounts));

        var eventSource = Object.prototype.toString.call(payload.events) === "[object Array]" ? payload.events : [];
        var seenSource = Object.prototype.toString.call(payload.seen) === "[object Array]" ? payload.seen : [];
        var roomDaySource = Object.prototype.toString.call(payload.roomDays) === "[object Array]" ? payload.roomDays : [];
        if (eventSource.length === 0 && seenSource.length === 0 && roomDaySource.length === 0) {
            return Promise.resolve(archiveDbFailure("bad-arg", emptyCounts));
        }

        /* 外部数据在进事务前全部算好：归一化事件、分组 seen、分组 roomDays。 */
        var preparedEvents = [];
        var invalidEventCount = 0;
        var eventIndex;
        for (eventIndex = 0; eventIndex < eventSource.length; eventIndex += 1) {
            var normalizedEvent = archiveDbNormalizeEvent(eventSource[eventIndex]);
            if (normalizedEvent) {
                preparedEvents.push(normalizedEvent);
            } else {
                invalidEventCount += 1;
            }
        }
        var preparedSeen = archiveDbPrepareCommitSeen(seenSource);
        var preparedRoomDays = archiveDbPrepareCommitRoomDays(roomDaySource);

        var prepared = {
            events: preparedEvents,
            seenGroups: preparedSeen.groups,
            roomDayGroups: preparedRoomDays.groups,
            invalidEvents: invalidEventCount,
            invalidSeen: preparedSeen.skipped,
            invalidRoomDays: preparedRoomDays.skipped
        };

        /* 与 putSeen 共用同一条串行链：seen 块的读改写永远只可能有一个事务。 */
        return archiveDbEnqueueSeenTask(function () {
            return archiveDbCommitBatchNow(prepared);
        }).then(function (result) {
            if (!result || result.ok !== true) {
                return archiveDbFailure((result && result.reason) || "commit-failed", emptyCounts);
            }
            var context = result.value;
            return {
                ok: true,
                added: archiveDbNumericValue(context.events.added),
                /* skipped = events 跳过（非法 + dedupKey 冲突）+ seen 非法 + roomDays 非法 */
                skipped: archiveDbNumericValue(context.events.skipped) + prepared.invalidEvents + prepared.invalidSeen + prepared.invalidRoomDays,
                seenAdded: archiveDbNumericValue(context.seen.added),
                roomDays: archiveDbNumericValue(context.roomDays),
                counters: context.events.counters || null
            };
        });
    }

    /* ---------------- rooms / users 批量 upsert（读改写合并） ---------------- */

    function archiveDbIsEmptyValue(value) {
        if (value === undefined) return true;
        if (value === null) return true;
        if (value === "") return true;
        return false;
    }

    function archiveDbIsAccumulateField(accumulateFields, fieldName) {
        if (!accumulateFields || typeof accumulateFields.length !== "number") return false;
        var fieldIndex;
        for (fieldIndex = 0; fieldIndex < accumulateFields.length; fieldIndex += 1) {
            if (accumulateFields[fieldIndex] === fieldName) return true;
        }
        return false;
    }

    /* 合并成新对象：空值（undefined / null / ""）不覆盖已有值；累加字段做数值相加。 */
    function archiveDbMergeRecord(existing, incoming, accumulateFields) {
        var merged = {};
        var fieldName;
        if (existing && typeof existing === "object") {
            for (fieldName in existing) {
                if (archiveDbHasOwn(existing, fieldName)) merged[fieldName] = existing[fieldName];
            }
        }
        if (!incoming || typeof incoming !== "object") return merged;
        for (fieldName in incoming) {
            if (!archiveDbHasOwn(incoming, fieldName)) continue;
            var value = incoming[fieldName];
            if (archiveDbIsEmptyValue(value)) continue;
            if (archiveDbIsAccumulateField(accumulateFields, fieldName)) {
                merged[fieldName] = archiveDbNumericValue(merged[fieldName]) + archiveDbNumericValue(value);
                continue;
            }
            merged[fieldName] = value;
        }
        return merged;
    }

    /* 同一批里重复的 rid/uid 先在内存合并成一条，避免两次 get 读到同一份旧值而丢掉累加。 */
    function archiveDbGroupRecords(list, keyField, accumulateFields) {
        var grouped = [];
        var positionByKey = Object.create(null);
        var skippedCount = 0;
        var itemIndex;
        for (itemIndex = 0; itemIndex < list.length; itemIndex += 1) {
            var item = list[itemIndex];
            if (!item || typeof item !== "object") {
                skippedCount += 1;
                continue;
            }
            var copy = {};
            var fieldName;
            for (fieldName in item) {
                if (archiveDbHasOwn(item, fieldName)) copy[fieldName] = item[fieldName];
            }
            var keyText = archiveDbKeyText(copy[keyField]);
            if (!keyText) {
                skippedCount += 1;
                continue;
            }
            copy[keyField] = keyText;
            var position = positionByKey[keyText];
            if (position === undefined) {
                positionByKey[keyText] = grouped.length;
                grouped.push(copy);
                continue;
            }
            grouped[position] = archiveDbMergeRecord(grouped[position], copy, accumulateFields);
        }
        return { records: grouped, skipped: skippedCount };
    }

    /* 单条 upsert：get 后在同一事务里 put 合并结果（请求都在回调里发出，事务不会提前提交）。 */
    function archiveDbUpsertOneRecord(store, keyField, record, accumulateFields, outcome) {
        var keyText = archiveDbKeyText(record[keyField]);
        var getRequest = store.get(keyText);
        getRequest.onsuccess = function () {
            var existing = getRequest.result || null;
            var merged = archiveDbMergeRecord(existing, record, accumulateFields);
            merged[keyField] = keyText;
            /* added/updated 在 put 之前定稿：put 失败会让事务 abort，整体结果被兜底成 ok:false。 */
            if (existing) {
                outcome.updated += 1;
            } else {
                outcome.added += 1;
            }
            store.put(merged);
        };
    }

    function archiveDbPutRecords(storeName, keyField, list, accumulateFields) {
        var emptyCounts = { added: 0, updated: 0, skipped: 0 };
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbFailure("unsupported", emptyCounts));
        if (!list || typeof list.length !== "number" || typeof list === "string") {
            return Promise.resolve(archiveDbFailure("bad-arg", emptyCounts));
        }

        var grouped = archiveDbGroupRecords(list, keyField, accumulateFields);
        var summary = { added: 0, updated: 0, skipped: grouped.skipped };
        if (grouped.records.length === 0) {
            return Promise.resolve({ ok: true, added: 0, updated: 0, skipped: summary.skipped });
        }

        function runBatch(startIndex) {
            if (startIndex >= grouped.records.length) {
                return Promise.resolve({
                    ok: true,
                    added: summary.added,
                    updated: summary.updated,
                    skipped: summary.skipped
                });
            }
            var batch = grouped.records.slice(startIndex, startIndex + ARCHIVE_DB_EVENT_BATCH_SIZE);
            return archiveDbRunTransaction([storeName], "readwrite", function (transaction) {
                var outcome = { added: 0, updated: 0 };
                var store = transaction.objectStore(storeName);
                var recordIndex;
                for (recordIndex = 0; recordIndex < batch.length; recordIndex += 1) {
                    archiveDbUpsertOneRecord(store, keyField, batch[recordIndex], accumulateFields, outcome);
                }
                return outcome;
            }).then(function (batchResult) {
                if (!batchResult || batchResult.ok !== true) {
                    return archiveDbFailure((batchResult && batchResult.reason) || "write-failed", {
                        added: summary.added,
                        updated: summary.updated,
                        skipped: summary.skipped
                    });
                }
                summary.added += archiveDbNumericValue(batchResult.value.added);
                summary.updated += archiveDbNumericValue(batchResult.value.updated);
                return runBatch(startIndex + batch.length);
            });
        }

        return runBatch(0);
    }

    /* 房间档案：{rid, roomName, cate, showTime, showStatus, fans, fansBn, upId, updatedAt} */
    function archiveDbPutRooms(list) {
        return archiveDbPutRecords(ARCHIVE_DB_STORE_ROOMS, "rid", list, null);
    }

    /* 用户档案：{uid, nn, level, bl, bnn, brid, ic, lastSeen, cnt}；cnt 累加、其余非空字段覆盖。 */
    var ARCHIVE_DB_USER_ACCUMULATE_FIELDS = ["cnt"];

    function archiveDbPutUsers(list) {
        return archiveDbPutRecords(ARCHIVE_DB_STORE_USERS, "uid", list, ARCHIVE_DB_USER_ACCUMULATE_FIELDS);
    }

    function archiveDbGetRoom(rid) {
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbFailure("unsupported", { room: null }));
        var ridText = archiveDbKeyText(rid);
        if (!ridText) return Promise.resolve(archiveDbFailure("bad-arg", { room: null }));

        return archiveDbRunTransaction([ARCHIVE_DB_STORE_ROOMS], "readonly", function (transaction) {
            var outcome = { room: null };
            var request = transaction.objectStore(ARCHIVE_DB_STORE_ROOMS).get(ridText);
            request.onsuccess = function () {
                outcome.room = request.result || null;
            };
            return outcome;
        }).then(function (result) {
            if (!result || result.ok !== true) {
                return archiveDbFailure((result && result.reason) || "query-failed", { room: null });
            }
            if (!result.value.room) return { ok: false, reason: "not-found", room: null };
            return { ok: true, room: result.value.room };
        });
    }

    function archiveDbCountUsers() {
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbFailure("unsupported", { count: 0 }));
        /* 只走 users store 的 count()，绝不游标扫事件表。 */
        return archiveDbCountStoreDetailed(ARCHIVE_DB_STORE_USERS).then(function (detail) {
            if (!detail || detail.ok !== true) {
                return archiveDbFailure((detail && detail.reason) || "query-failed", { count: 0 });
            }
            return { ok: true, count: archiveDbNumericValue(detail.count) };
        });
    }

    /* ---------------- room_day 读改写 ---------------- */

    /* 已经废弃、绝不允许再落库的 room_day 键（就算调用方从老代码里传进来也一律丢弃）。 */
    var ARCHIVE_DB_ROOM_DAY_DROPPED_FIELDS = ["minutes", "nobleCnt", "observedMinSession", "sessionStart"];

    function archiveDbDropRoomDayDeadFields(record) {
        var dropIndex;
        for (dropIndex = 0; dropIndex < ARCHIVE_DB_ROOM_DAY_DROPPED_FIELDS.length; dropIndex += 1) {
            var fieldName = ARCHIVE_DB_ROOM_DAY_DROPPED_FIELDS[dropIndex];
            if (archiveDbHasOwn(record, fieldName)) delete record[fieldName];
        }
        return record;
    }

    function archiveDbBuildRoomDay(existing, ridDay, patch, deltas) {
        var ridDayText = archiveDbKeyText(ridDay);
        var ridText = archiveDbKeyText(patch && patch.rid);
        var dayKeyText = archiveDbKeyText(patch && patch.dayKey);
        var separatorIndex = ridDayText.indexOf("|");
        if (separatorIndex > 0) {
            if (!ridText) ridText = ridDayText.slice(0, separatorIndex);
            if (!dayKeyText) dayKeyText = ridDayText.slice(separatorIndex + 1);
        }

        var merged = {
            ridDay: ridDayText,
            rid: ridText,
            dayKey: dayKeyText,
            updatedAt: 0
        };
        var fieldIndex;
        for (fieldIndex = 0; fieldIndex < ARCHIVE_DB_ROOM_DAY_NUMBER_FIELDS.length; fieldIndex += 1) {
            merged[ARCHIVE_DB_ROOM_DAY_NUMBER_FIELDS[fieldIndex]] = 0;
        }

        var fieldName;
        if (existing && typeof existing === "object") {
            for (fieldName in existing) {
                if (archiveDbHasOwn(existing, fieldName)) merged[fieldName] = existing[fieldName];
            }
        }

        /* patch：普通字段覆盖（含 rid / dayKey） */
        if (patch && typeof patch === "object") {
            for (fieldName in patch) {
                if (!archiveDbHasOwn(patch, fieldName)) continue;
                if (fieldName === "ridDay") continue;
                merged[fieldName] = patch[fieldName];
            }
        }

        /* deltas：数值字段累加 */
        if (deltas && typeof deltas === "object") {
            for (fieldName in deltas) {
                if (!archiveDbHasOwn(deltas, fieldName)) continue;
                merged[fieldName] = archiveDbNumericValue(merged[fieldName]) + archiveDbNumericValue(deltas[fieldName]);
            }
        }

        merged.ridDay = ridDayText;
        if (!merged.rid && ridText) merged.rid = ridText;
        if (!merged.dayKey && dayKeyText) merged.dayKey = dayKeyText;
        merged.updatedAt = patch && archiveDbNumericValue(patch.updatedAt) > 0 ? archiveDbNumericValue(patch.updatedAt) : Date.now();

        /*
         * 时间轴两端是「min / max」语义，不是覆盖、也不是累加：
         *   firstTs 取历史最小值、lastTs 取历史最大值。
         * 否则跨批次/跨刷新时，patch 会把 firstTs 覆盖成本次会话的首条时间，
         * 「本机自 HH:mm 起观测」就会显示成刚刚才开始。
         */
        var previousFirst = archiveDbNumericValue(existing && existing.firstTs);
        var previousLast = archiveDbNumericValue(existing && existing.lastTs);
        var incomingFirst = archiveDbNumericValue(merged.firstTs);
        var incomingLast = archiveDbNumericValue(merged.lastTs);
        if (previousFirst > 0 && incomingFirst > 0) {
            merged.firstTs = Math.min(previousFirst, incomingFirst);
        } else {
            merged.firstTs = previousFirst > 0 ? previousFirst : incomingFirst;
        }
        merged.lastTs = Math.max(previousLast, incomingLast);
        /* 废弃字段一律不落库（哪怕调用方从旧代码里带进来） */
        return archiveDbDropRoomDayDeadFields(merged);
    }

    /* 读侧归一化：老版本写下的 room_day 可能缺字段，读出来补 0；已废弃的字段直接丢掉。
     * 既不能让 undefined 漏到 UI，也不能因为缺/多字段报错。返回新对象。 */
    function archiveDbNormalizeRoomDayRecord(record) {
        if (!record || typeof record !== "object") return null;
        var normalized = {};
        var fieldName;
        for (fieldName in record) {
            if (archiveDbHasOwn(record, fieldName)) normalized[fieldName] = record[fieldName];
        }
        var fieldIndex;
        for (fieldIndex = 0; fieldIndex < ARCHIVE_DB_ROOM_DAY_NUMBER_FIELDS.length; fieldIndex += 1) {
            var numberField = ARCHIVE_DB_ROOM_DAY_NUMBER_FIELDS[fieldIndex];
            normalized[numberField] = archiveDbNumericValue(normalized[numberField]);
        }
        return archiveDbDropRoomDayDeadFields(normalized);
    }

    function archiveDbUpsertRoomDay(ridDay, patch, deltas) {
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbFailure("unsupported", { roomDay: null }));
        var ridDayText = archiveDbKeyText(ridDay);
        if (!ridDayText) return Promise.resolve(archiveDbFailure("bad-arg", { roomDay: null }));

        return archiveDbRunTransaction([ARCHIVE_DB_STORE_ROOM_DAY], "readwrite", function (transaction) {
            var outcome = { roomDay: null };
            var store = transaction.objectStore(ARCHIVE_DB_STORE_ROOM_DAY);
            var getRequest = store.get(ridDayText);
            getRequest.onsuccess = function () {
                var merged = archiveDbBuildRoomDay(getRequest.result, ridDayText, patch, deltas);
                outcome.roomDay = merged;
                store.put(merged);
            };
            return outcome;
        }).then(function (result) {
            if (!result || result.ok !== true) {
                return archiveDbFailure((result && result.reason) || "write-failed", { roomDay: null });
            }
            return { ok: true, roomDay: result.value.roomDay };
        });
    }

    function archiveDbGetRoomDay(rid, dayKey) {
        if (!archiveDbIsSupported()) return Promise.resolve(null);
        var ridText = archiveDbKeyText(rid);
        var dayKeyText = archiveDbKeyText(dayKey);
        if (!ridText || !dayKeyText) return Promise.resolve(null);
        var ridDayText = ridText + "|" + dayKeyText;

        return archiveDbRunTransaction([ARCHIVE_DB_STORE_ROOM_DAY], "readonly", function (transaction) {
            var outcome = { roomDay: null };
            var request = transaction.objectStore(ARCHIVE_DB_STORE_ROOM_DAY).get(ridDayText);
            request.onsuccess = function () {
                /* 老数据缺新字段 → 归一化补 0，绝不把 undefined 交给 UI */
                outcome.roomDay = archiveDbNormalizeRoomDayRecord(request.result);
            };
            return outcome;
        }).then(function (result) {
            if (!result || result.ok !== true) return null;
            return result.value.roomDay || null;
        });
    }

    /* ---------------- 游标区间读取（通用） ----------------
     * options: { offset, limit, direction, filter(record), mapper(record) }
     * 返回容器 { list, hasMore }，事务提交后读取最终值。
     */
    function archiveDbReadRange(store, indexName, range, options) {
        var settings = options || {};
        var outcome = { list: [], hasMore: false };
        var source = indexName ? store.index(indexName) : store;
        var cursorRequest = source.openCursor(range, settings.direction || "next");
        var offset = archiveDbLimitOption(settings.offset, 0);
        var limit = archiveDbLimitOption(settings.limit, ARCHIVE_DB_USER_DAY_LIMIT_DEFAULT);
        var skipped = 0;
        var taken = 0;

        cursorRequest.onsuccess = function () {
            var cursor = cursorRequest.result;
            if (!cursor) return;
            var record = cursor.value;
            if (typeof settings.filter === "function" && settings.filter(record) === false) {
                cursor.continue();
                return;
            }
            if (skipped < offset) {
                skipped += 1;
                cursor.continue();
                return;
            }
            if (taken >= limit) {
                outcome.hasMore = true;
                return;
            }
            outcome.list.push(typeof settings.mapper === "function" ? settings.mapper(record) : record);
            taken += 1;
            cursor.continue();
        };
        return outcome;
    }

    function archiveDbQueryUserDay(uid, dayKey, options) {
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbFailure("unsupported", { list: [], hasMore: false }));
        var settings = options || {};
        var uidText = archiveDbKeyText(uid);
        var dayKeyText = archiveDbKeyText(dayKey);
        if (!uidText || !dayKeyText) return Promise.resolve(archiveDbFailure("bad-arg", { list: [], hasMore: false }));

        return archiveDbRunTransaction([ARCHIVE_DB_STORE_EVENTS], "readonly", function (transaction) {
            return archiveDbReadRange(
                transaction.objectStore(ARCHIVE_DB_STORE_EVENTS),
                ARCHIVE_DB_INDEX_UID_DAY,
                IDBKeyRange.only([uidText, dayKeyText]),
                {
                    offset: archiveDbLimitOption(settings.offset, 0),
                    limit: archiveDbLimitOption(settings.limit, ARCHIVE_DB_USER_DAY_LIMIT_DEFAULT)
                }
            );
        }).then(function (result) {
            if (!result || result.ok !== true) {
                return archiveDbFailure((result && result.reason) || "query-failed", { list: [], hasMore: false });
            }
            return { ok: true, list: result.value.list, hasMore: result.value.hasMore };
        });
    }

    function archiveDbQueryRoomDayEvents(rid, dayKey, options) {
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbFailure("unsupported", { list: [] }));
        var settings = options || {};
        var ridText = archiveDbKeyText(rid);
        var dayKeyText = archiveDbKeyText(dayKey);
        if (!ridText || !dayKeyText) return Promise.resolve(archiveDbFailure("bad-arg", { list: [] }));

        return archiveDbRunTransaction([ARCHIVE_DB_STORE_EVENTS], "readonly", function (transaction) {
            return archiveDbReadRange(
                transaction.objectStore(ARCHIVE_DB_STORE_EVENTS),
                ARCHIVE_DB_INDEX_RID_DAY,
                IDBKeyRange.only([ridText, dayKeyText]),
                {
                    offset: 0,
                    limit: archiveDbLimitOption(settings.limit, ARCHIVE_DB_ROOM_DAY_LIMIT_DEFAULT)
                }
            );
        }).then(function (result) {
            if (!result || result.ok !== true) {
                return archiveDbFailure((result && result.reason) || "query-failed", { list: [] });
            }
            /* 取到的这批按 ts 升序摆成时间线（同 ts 用 id 兜底，保证顺序稳定）。 */
            var list = result.value.list;
            list.sort(function (left, right) {
                var leftTs = archiveDbNumericValue(left && left.ts);
                var rightTs = archiveDbNumericValue(right && right.ts);
                if (leftTs !== rightTs) return leftTs - rightTs;
                return archiveDbNumericValue(left && left.id) - archiveDbNumericValue(right && right.id);
            });
            return { ok: true, list: list };
        });
    }

    function archiveDbRankBuckets(buckets, limit) {
        var list = [];
        var bucketKey;
        for (bucketKey in buckets) {
            if (!archiveDbHasOwn(buckets, bucketKey)) continue;
            list.push(buckets[bucketKey]);
        }
        list.sort(function (left, right) {
            if (right.value !== left.value) return right.value - left.value;
            var leftUid = archiveDbKeyText(left.uid);
            var rightUid = archiveDbKeyText(right.uid);
            if (leftUid === rightUid) return 0;
            return leftUid < rightUid ? -1 : 1;
        });
        if (list.length > limit) list = list.slice(0, limit);
        return list;
    }

    /* 榜单里的昵称不能从 events 拿（事件已瘦身，nn 不在事件里了）：
     * 扫事件只聚合 uid/value，最后统一回查 users 表（uid -> nn）补名。 */
    function archiveDbFillUserNicknames(list) {
        if (!list || list.length === 0) return Promise.resolve(list);
        return archiveDbRunTransaction([ARCHIVE_DB_STORE_USERS], "readonly", function (transaction) {
            var store = transaction.objectStore(ARCHIVE_DB_STORE_USERS);
            var entryIndex;
            for (entryIndex = 0; entryIndex < list.length; entryIndex += 1) {
                (function (entry) {
                    var getRequest = store.get(archiveDbKeyText(entry.uid));
                    getRequest.onsuccess = function () {
                        var record = getRequest.result;
                        if (record && record.nn) entry.nn = String(record.nn);
                    };
                })(list[entryIndex]);
            }
            return { list: list };
        }).then(function (result) {
            if (!result || result.ok !== true) return list;
            return result.value.list;
        });
    }

    function archiveDbTopUsers(rid, dayKey, kind, limit) {
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbFailure("unsupported", { list: [] }));
        var ridText = archiveDbKeyText(rid);
        var dayKeyText = archiveDbKeyText(dayKey);
        if (!ridText || !dayKeyText) return Promise.resolve(archiveDbFailure("bad-arg", { list: [] }));
        var wantedKind = kind === "gift" ? "gift" : "chat";
        var cappedLimit = archiveDbLimitOption(limit, ARCHIVE_DB_TOP_USERS_LIMIT_DEFAULT);

        return archiveDbRunTransaction([ARCHIVE_DB_STORE_EVENTS], "readonly", function (transaction) {
            var outcome = { buckets: Object.create(null), list: [] };
            var cursorRequest = transaction
                .objectStore(ARCHIVE_DB_STORE_EVENTS)
                .index(ARCHIVE_DB_INDEX_RID_DAY)
                .openCursor(IDBKeyRange.only([ridText, dayKeyText]));
            cursorRequest.onsuccess = function () {
                var cursor = cursorRequest.result;
                if (!cursor) {
                    outcome.list = archiveDbRankBuckets(outcome.buckets, cappedLimit);
                    return;
                }
                var record = cursor.value;
                if (record && record.kind === wantedKind) {
                    var uidText = archiveDbKeyText(record.uid);
                    if (uidText) {
                        var bucket = outcome.buckets[uidText];
                        if (!bucket) {
                            bucket = { uid: uidText, nn: "", value: 0 };
                            outcome.buckets[uidText] = bucket;
                        }
                        /* 只聚合 uid / value：昵称在 users 表里，扫完再统一补。 */
                        bucket.value += wantedKind === "gift" ? archiveDbNumericValue(record.gfcnt) : 1;
                    }
                }
                cursor.continue();
            };
            return outcome;
        }).then(function (result) {
            if (!result || result.ok !== true) {
                return archiveDbFailure((result && result.reason) || "query-failed", { list: [] });
            }
            return archiveDbFillUserNicknames(result.value.list).then(function (filledList) {
                return { ok: true, list: filledList };
            });
        });
    }

    function archiveDbListRoomDays(dayKey) {
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbFailure("unsupported", { list: [] }));
        var dayKeyText = archiveDbKeyText(dayKey);
        if (!dayKeyText) return Promise.resolve(archiveDbFailure("bad-arg", { list: [] }));

        return archiveDbRunTransaction([ARCHIVE_DB_STORE_ROOM_DAY], "readonly", function (transaction) {
            return archiveDbReadRange(
                transaction.objectStore(ARCHIVE_DB_STORE_ROOM_DAY),
                ARCHIVE_DB_INDEX_DAY_KEY,
                IDBKeyRange.only(dayKeyText),
                { offset: 0, limit: ARCHIVE_DB_ROOM_DAY_LIST_MAX }
            );
        }).then(function (result) {
            if (!result || result.ok !== true) {
                return archiveDbFailure((result && result.reason) || "query-failed", { list: [] });
            }
            var list = result.value.list;
            var listIndex;
            /* 与 getRoomDay 同口径：老数据缺新字段补 0，避免 undefined 漏到面板 */
            for (listIndex = 0; listIndex < list.length; listIndex += 1) {
                list[listIndex] = archiveDbNormalizeRoomDayRecord(list[listIndex]);
            }
            list.sort(function (left, right) {
                var leftRid = archiveDbKeyText(left && left.rid);
                var rightRid = archiveDbKeyText(right && right.rid);
                if (leftRid !== rightRid) return leftRid < rightRid ? -1 : 1;
                var leftKey = archiveDbKeyText(left && left.ridDay);
                var rightKey = archiveDbKeyText(right && right.ridDay);
                if (leftKey === rightKey) return 0;
                return leftKey < rightKey ? -1 : 1;
            });
            return { ok: true, list: list };
        });
    }

    /* ---------------- 区间汇总（room_day 的 sum / latest） ----------------
     * 定位方式：走 room_day 的 dayKey 索引取闭区间 [fromDayKey, toDayKey]，再按 rid 过滤
     * （房间数 × 天数是小量级，成本可忽略）。dayKey 是 YYYY-MM-DD，直接字典序比较。
     * sum：9 个跨天有意义的字段逐项相加；latest 只留 lastTs（区间内最大值）。
     */

    var ARCHIVE_DB_ROOM_DAY_SUM_FIELDS = [
        "danmakuCnt",
        "incomeCents",
        "giftCnt",
        "activeUv",
        "chatUv",
        "giftUv",
        "paidUv",
        "enterUv",
        "observedMin"
    ];

    function archiveDbEmptyRoomDaySum() {
        var sum = {};
        var fieldIndex;
        for (fieldIndex = 0; fieldIndex < ARCHIVE_DB_ROOM_DAY_SUM_FIELDS.length; fieldIndex += 1) {
            sum[ARCHIVE_DB_ROOM_DAY_SUM_FIELDS[fieldIndex]] = 0;
        }
        return sum;
    }

    function archiveDbBuildRoomDaySumResult(ridText, fromText, toText, days, sum, latestLastTs) {
        return {
            ok: true,
            rid: ridText,
            fromDayKey: fromText,
            toDayKey: toText,
            days: days,
            sum: sum,
            latest: { lastTs: latestLastTs }
        };
    }

    function archiveDbSumRoomDays(rid, fromDayKey, toDayKey) {
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbFailure("unsupported"));
        var ridText = archiveDbKeyText(rid);
        if (!ridText) return Promise.resolve(archiveDbFailure("bad-arg"));
        if (typeof fromDayKey !== "string" || typeof toDayKey !== "string") {
            return Promise.resolve(archiveDbFailure("bad-arg"));
        }
        var fromText = fromDayKey;
        var toText = toDayKey;
        if (!fromText || !toText) return Promise.resolve(archiveDbFailure("bad-arg"));

        /* 反向区间（from > to）按空区间处理：不是参数错误，就是没有任何一天落进来。 */
        if (fromText > toText) {
            return Promise.resolve(archiveDbBuildRoomDaySumResult(ridText, fromText, toText, 0, archiveDbEmptyRoomDaySum(), 0));
        }

        return archiveDbRunTransaction([ARCHIVE_DB_STORE_ROOM_DAY], "readonly", function (transaction) {
            var outcome = {
                days: 0,
                sum: archiveDbEmptyRoomDaySum(),
                latestLastTs: 0
            };
            var dayKeyIndex = transaction.objectStore(ARCHIVE_DB_STORE_ROOM_DAY).index(ARCHIVE_DB_INDEX_DAY_KEY);
            var cursorRequest = dayKeyIndex.openCursor(IDBKeyRange.bound(fromText, toText));
            cursorRequest.onsuccess = function () {
                var cursor = cursorRequest.result;
                if (!cursor) return;
                var record = cursor.value || {};
                if (archiveDbKeyText(record.rid) === ridText) {
                    var dayKeyText = archiveDbKeyText(record.dayKey);
                    if (dayKeyText && dayKeyText >= fromText && dayKeyText <= toText) {
                        outcome.days += 1;
                        var fieldIndex;
                        for (fieldIndex = 0; fieldIndex < ARCHIVE_DB_ROOM_DAY_SUM_FIELDS.length; fieldIndex += 1) {
                            var fieldName = ARCHIVE_DB_ROOM_DAY_SUM_FIELDS[fieldIndex];
                            outcome.sum[fieldName] += archiveDbNumericValue(record[fieldName]);
                        }
                        var lastTs = archiveDbNumericValue(record.lastTs);
                        if (lastTs > outcome.latestLastTs) outcome.latestLastTs = lastTs;
                    }
                }
                cursor.continue();
            };
            return outcome;
        }).then(function (result) {
            if (!result || result.ok !== true) {
                return archiveDbFailure((result && result.reason) || "query-failed");
            }
            var outcome = result.value;
            return archiveDbBuildRoomDaySumResult(
                ridText,
                fromText,
                toText,
                outcome.days,
                outcome.sum,
                outcome.latestLastTs
            );
        });
    }

    /* ---------------- 体积测算 ---------------- */

    function archiveDbMeasureBytes(eventCount) {
        var fallbackBytes = Math.max(0, archiveDbNumericValue(eventCount)) * ARCHIVE_DB_EVENT_BYTES_ESTIMATE;
        return new Promise(function (resolve) {
            var storage = null;
            try {
                storage = typeof navigator !== "undefined" && navigator ? navigator.storage : null;
            } catch (error) {
                storage = null;
            }
            if (!storage || typeof storage.estimate !== "function") {
                resolve(fallbackBytes);
                return;
            }
            var estimation = null;
            try {
                estimation = storage.estimate();
            } catch (error) {
                resolve(fallbackBytes);
                return;
            }
            Promise.resolve(estimation).then(function (report) {
                var usage = report && typeof report.usage === "number" && isFinite(report.usage) ? report.usage : null;
                resolve(usage === null ? fallbackBytes : usage);
            }, function () {
                resolve(fallbackBytes);
            });
        });
    }

    function archiveDbCountStoreDetailed(storeName) {
        return archiveDbRunTransaction([storeName], "readonly", function (transaction) {
            var outcome = { count: 0 };
            var request = transaction.objectStore(storeName).count();
            request.onsuccess = function () {
                outcome.count = archiveDbNumericValue(request.result);
            };
            return outcome;
        }).then(function (result) {
            if (!result || result.ok !== true) {
                return { ok: false, reason: (result && result.reason) || "query-failed", count: 0 };
            }
            return { ok: true, count: archiveDbNumericValue(result.value.count) };
        });
    }

    function archiveDbCountStore(storeName) {
        return archiveDbCountStoreDetailed(storeName).then(function (detail) {
            return archiveDbNumericValue(detail.count);
        });
    }

    /* ---------------- 统计 ---------------- */

    function archiveDbEmptyStats(reason) {
        return {
            ok: false,
            reason: reason || "query-failed",
            windowDays: ARCHIVE_DB_RETENTION_DAYS,
            bytes: 0,
            rooms: 0,
            events: 0,
            chatEvents: 0,
            giftEvents: 0,
            enterEvents: 0,
            users: 0,
            oldestDay: "",
            newestDay: "",
            lastFlush: 0,
            clockSkew: 0,
            prunedDays: 0,
            roomDetail: []
        };
    }

    /* stats()：O(1) 出结果 —— events 的三类计数走 meta.counters，不再全表扫。
     * 仍然扫的只有 room_day（天 × 房间，量级极小）用来算 roomDetail / rooms。 */
    function archiveDbStats() {
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbEmptyStats("unsupported"));

        var storeNames = [
            ARCHIVE_DB_STORE_ROOM_DAY,
            ARCHIVE_DB_STORE_USERS,
            ARCHIVE_DB_STORE_META
        ];

        return archiveDbRunTransaction(storeNames, "readonly", function (transaction) {
            var outcome = {
                counters: null,
                users: 0,
                lastFlush: 0,
                clockSkew: 0,
                prunedDays: 0
            };
            var roomDayBuckets = Object.create(null);

            var roomDayCursorRequest = transaction.objectStore(ARCHIVE_DB_STORE_ROOM_DAY).openCursor();
            roomDayCursorRequest.onsuccess = function () {
                var cursor = roomDayCursorRequest.result;
                if (!cursor) return;
                var record = cursor.value || {};
                var ridText = archiveDbKeyText(record.rid);
                if (ridText) {
                    if (!roomDayBuckets[ridText]) roomDayBuckets[ridText] = { rid: ridText, days: 0 };
                    roomDayBuckets[ridText].days += 1;
                }
                cursor.continue();
            };

            /* users 走 users 的 count()（与 countUsers() 同一实现），不扫事件表。 */
            var userCountRequest = transaction.objectStore(ARCHIVE_DB_STORE_USERS).count();
            userCountRequest.onsuccess = function () {
                outcome.users = archiveDbNumericValue(userCountRequest.result);
            };

            /* events / chat / gift / enter / days 全部来自 meta.counters。 */
            var countersRequest = transaction.objectStore(ARCHIVE_DB_STORE_META).get(ARCHIVE_DB_META_COUNTERS);
            countersRequest.onsuccess = function () {
                var record = countersRequest.result;
                outcome.counters = record ? archiveDbNormalizeCounters(record.v) : null;
            };

            function readMetaNumber(metaKey, targetField) {
                var request = transaction.objectStore(ARCHIVE_DB_STORE_META).get(metaKey);
                request.onsuccess = function () {
                    var record = request.result;
                    outcome[targetField] = record ? archiveDbNumericValue(record.v) : 0;
                };
            }
            readMetaNumber(ARCHIVE_DB_META_LAST_FLUSH, "lastFlush");
            readMetaNumber(ARCHIVE_DB_META_CLOCK_SKEW, "clockSkew");
            readMetaNumber(ARCHIVE_DB_META_PRUNED_DAYS, "prunedDays");

            /* 事务完成前把 rid 分组结算成数组（oncomplete 时读到的是最终值）。 */
            outcome.finishRoomDetail = function () {
                var list = [];
                var ridText;
                for (ridText in roomDayBuckets) {
                    if (!archiveDbHasOwn(roomDayBuckets, ridText)) continue;
                    list.push(roomDayBuckets[ridText]);
                }
                list.sort(function (left, right) {
                    if (right.days !== left.days) return right.days - left.days;
                    var leftRid = archiveDbKeyText(left.rid);
                    var rightRid = archiveDbKeyText(right.rid);
                    if (leftRid === rightRid) return 0;
                    return leftRid < rightRid ? -1 : 1;
                });
                return list;
            };
            return outcome;
        }).then(function (result) {
            if (!result || result.ok !== true) {
                return archiveDbEmptyStats((result && result.reason) || "query-failed");
            }
            var outcome = result.value;
            var roomDetail = typeof outcome.finishRoomDetail === "function" ? outcome.finishRoomDetail() : [];

            /* counters 缺失（老库 / 被清过）→ 重算一次并写回，然后照常返回。 */
            var countersPromise = outcome.counters
                ? Promise.resolve(outcome.counters)
                : archiveDbRecomputeCounters();

            return countersPromise.then(function (counters) {
                var safeCounters = counters || archiveDbEmptyCounters();
                var dayKeys = [];
                var dayKey;
                for (dayKey in safeCounters.days) {
                    if (archiveDbHasOwn(safeCounters.days, dayKey)) {
                        if (archiveDbNumericValue(safeCounters.days[dayKey]) > 0) dayKeys.push(dayKey);
                    }
                }
                dayKeys.sort();
                var oldestDay = dayKeys.length > 0 ? dayKeys[0] : "";
                var newestDay = dayKeys.length > 0 ? dayKeys[dayKeys.length - 1] : "";

                return archiveDbMeasureBytes(safeCounters.events).then(function (bytes) {
                    return {
                        ok: true,
                        windowDays: ARCHIVE_DB_RETENTION_DAYS,
                        bytes: bytes,
                        /* rooms = room_day 里的 distinct rid 数，和 roomDetail.length 完全同口径。 */
                        rooms: roomDetail.length,
                        events: archiveDbNumericValue(safeCounters.events),
                        chatEvents: archiveDbNumericValue(safeCounters.chat),
                        giftEvents: archiveDbNumericValue(safeCounters.gift),
                        enterEvents: archiveDbNumericValue(safeCounters.enter),
                        users: archiveDbNumericValue(outcome.users),
                        oldestDay: oldestDay,
                        newestDay: newestDay,
                        lastFlush: archiveDbNumericValue(outcome.lastFlush),
                        clockSkew: archiveDbNumericValue(outcome.clockSkew),
                        prunedDays: archiveDbNumericValue(outcome.prunedDays),
                        roomDetail: roomDetail
                    };
                });
            });
        });
    }

    /* ---------------- 裁剪 ---------------- */

    function archiveDbRetentionCutoffDayKey(retentionDays) {
        var windowDays = archiveDbLimitOption(retentionDays, ARCHIVE_DB_RETENTION_DAYS);
        if (windowDays < 1) windowDays = 1;
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        today.setDate(today.getDate() - (windowDays - 1));
        return archiveDbDayKeyFromTs(today.getTime());
    }

    function archiveDbPruneEventsByDayKey(cutoffDayKey) {
        return archiveDbRunTransaction([ARCHIVE_DB_STORE_EVENTS, ARCHIVE_DB_STORE_META], "readwrite", function (transaction) {
            /* byKind / byDay 记下「删掉了什么」，事务内同步扣减 meta.counters。 */
            var outcome = { removedDays: 0, removedEvents: 0, byKind: { chat: 0, gift: 0, enter: 0 }, byDay: {} };
            var seenDays = Object.create(null);
            var eventStore = transaction.objectStore(ARCHIVE_DB_STORE_EVENTS);
            var metaStore = transaction.objectStore(ARCHIVE_DB_STORE_META);
            var cursorRequest = eventStore.openCursor();

            function finishMeta() {
                if (outcome.removedDays > 0) {
                    var daysRequest = metaStore.get(ARCHIVE_DB_META_PRUNED_DAYS);
                    daysRequest.onsuccess = function () {
                        var record = daysRequest.result;
                        var current = record ? archiveDbNumericValue(record.v) : 0;
                        metaStore.put({ k: ARCHIVE_DB_META_PRUNED_DAYS, v: current + outcome.removedDays });
                    };
                }
                if (outcome.removedEvents > 0) {
                    var countersRequest = metaStore.get(ARCHIVE_DB_META_COUNTERS);
                    countersRequest.onsuccess = function () {
                        var normalized = archiveDbNormalizeCounters(countersRequest.result && countersRequest.result.v);
                        /* 极端情况（counters 被外部清掉）：扣减无从谈起，交给下一次 stats() 重算。 */
                        if (!normalized) return;
                        archiveDbApplyCounterDelta(normalized, outcome.byKind, outcome.byDay, -1);
                        metaStore.put({ k: ARCHIVE_DB_META_COUNTERS, v: normalized });
                    };
                }
            }

            cursorRequest.onsuccess = function () {
                var cursor = cursorRequest.result;
                if (!cursor) {
                    /* 游标走空才算结算：此时 removedDays / byKind 已是最终值。 */
                    finishMeta();
                    return;
                }
                var record = cursor.value || {};
                var dayKeyText = archiveDbKeyText(record.dayKey);
                /* 按 dayKey 字典序比较（YYYY-MM-DD 可直接比大小），room_day 一律不动。 */
                if (dayKeyText && dayKeyText < cutoffDayKey) {
                    if (!seenDays[dayKeyText]) {
                        seenDays[dayKeyText] = true;
                        outcome.removedDays += 1;
                    }
                    outcome.removedEvents += 1;
                    outcome.byKind[archiveDbClassifyEventKind(record.kind)] += 1;
                    outcome.byDay[dayKeyText] = archiveDbNumericValue(outcome.byDay[dayKeyText]) + 1;
                    cursor.delete();
                }
                cursor.continue();
            };
            return outcome;
        }).then(function (result) {
            if (!result || result.ok !== true) {
                return { ok: false, removedDays: 0, removedEvents: 0, reason: (result && result.reason) || "prune-failed" };
            }
            return { ok: true, removedDays: result.value.removedDays, removedEvents: result.value.removedEvents };
        });
    }

    function archiveDbDeleteOldestEvents(maxRemovals) {
        return archiveDbRunTransaction([ARCHIVE_DB_STORE_EVENTS, ARCHIVE_DB_STORE_META], "readwrite", function (transaction) {
            var outcome = { removed: 0, byKind: { chat: 0, gift: 0, enter: 0 }, byDay: {} };
            var metaStore = transaction.objectStore(ARCHIVE_DB_STORE_META);
            var cursorRequest = transaction.objectStore(ARCHIVE_DB_STORE_EVENTS).openCursor();
            var countersWritten = false;

            function writeCounters() {
                if (countersWritten) return;
                countersWritten = true;
                if (outcome.removed <= 0) return;
                var countersRequest = metaStore.get(ARCHIVE_DB_META_COUNTERS);
                countersRequest.onsuccess = function () {
                    var normalized = archiveDbNormalizeCounters(countersRequest.result && countersRequest.result.v);
                    if (!normalized) return;
                    archiveDbApplyCounterDelta(normalized, outcome.byKind, outcome.byDay, -1);
                    metaStore.put({ k: ARCHIVE_DB_META_COUNTERS, v: normalized });
                };
            }

            cursorRequest.onsuccess = function () {
                var cursor = cursorRequest.result;
                if (!cursor) {
                    writeCounters();
                    return;
                }
                if (outcome.removed >= maxRemovals) {
                    /* 配额够了：提前收工也要把 counters 结掉（游标不会再回调了）。 */
                    writeCounters();
                    return;
                }
                var record = cursor.value || {};
                var dayKeyText = archiveDbKeyText(record.dayKey);
                outcome.byKind[archiveDbClassifyEventKind(record.kind)] += 1;
                if (dayKeyText) outcome.byDay[dayKeyText] = archiveDbNumericValue(outcome.byDay[dayKeyText]) + 1;
                /* 主键升序 = 写入顺序 = 由旧到新 */
                cursor.delete();
                outcome.removed += 1;
                cursor.continue();
            };
            return outcome;
        }).then(function (result) {
            if (!result || result.ok !== true) return 0;
            return archiveDbNumericValue(result.value.removed);
        });
    }

    function archiveDbPruneBySize(summary) {
        var round = 0;

        function finish() {
            return { ok: true, removedDays: summary.removedDays, removedEvents: summary.removedEvents };
        }

        function nextRound() {
            round += 1;
            if (round > ARCHIVE_DB_SIZE_PRUNE_ROUNDS) return Promise.resolve(finish());
            return archiveDbCountStore(ARCHIVE_DB_STORE_EVENTS).then(function (eventCount) {
                return archiveDbMeasureBytes(eventCount).then(function (bytes) {
                    if (bytes <= ARCHIVE_DB_BYTES_LIMIT || eventCount === 0) return finish();
                    var excessBytes = bytes - ARCHIVE_DB_BYTES_LIMIT;
                    var targetRemovals = Math.ceil(excessBytes / ARCHIVE_DB_EVENT_BYTES_ESTIMATE);
                    if (targetRemovals < 1) targetRemovals = 1;
                    if (targetRemovals > ARCHIVE_DB_SIZE_PRUNE_CHUNK) targetRemovals = ARCHIVE_DB_SIZE_PRUNE_CHUNK;
                    return archiveDbDeleteOldestEvents(targetRemovals).then(function (removedCount) {
                        summary.removedEvents += removedCount;
                        if (removedCount === 0) return finish();
                        return nextRound();
                    });
                });
            });
        }

        return nextRound();
    }

    function archiveDbPrune() {
        if (!archiveDbIsSupported()) {
            return Promise.resolve(archiveDbFailure("unsupported", { removedDays: 0, removedEvents: 0 }));
        }
        var cutoffDayKey = archiveDbRetentionCutoffDayKey(ARCHIVE_DB_RETENTION_DAYS);
        var summary = { removedDays: 0, removedEvents: 0, removedSeen: 0 };

        /* 先确保计数器可用，删明细时才能在同一事务里准确扣减。 */
        return archiveDbEnsureCounters().then(function () {
            return archiveDbPruneEventsByDayKey(cutoffDayKey);
        }).then(function (dayResult) {
            summary.removedDays = archiveDbNumericValue(dayResult.removedDays);
            summary.removedEvents = archiveDbNumericValue(dayResult.removedEvents);
            if (!dayResult || dayResult.ok !== true) {
                return archiveDbFailure(dayResult && dayResult.reason ? dayResult.reason : "prune-failed", {
                    removedDays: summary.removedDays,
                    removedEvents: summary.removedEvents,
                    removedSeen: 0
                });
            }
            /* 过期明细清完，再按 1 GB 上限从旧到新删 events。 */
            return archiveDbPruneBySize(summary);
        }).then(function (result) {
            if (!result || result.ok !== true) return result;
            /* 顺手清掉过期的 seen 行（UV 去重表跟明细同一保留期）。 */
            return archiveDbClearSeenBefore(cutoffDayKey).then(function (seenResult) {
                result.removedSeen = seenResult && seenResult.ok ? archiveDbNumericValue(seenResult.removed) : 0;
                return result;
            });
        });
    }

    /* ---------------- seen（UV 去重：某 scope 在某天见过哪些 uid，分块存） ----------------
     * 一个 uid 一条记录太贵（每条 30+ B 键开销 + 索引），改成「每块装一批 uid」：
     *   主键 "scope|dayKey|chunk"，记录 { key, scope, dayKey, chunk, uids: ["…"] }
     *   chunk 由 hash(uid) % 64 决定（并发合并时打到相对固定的块）；
     *   每块最多 500 个 uid，写满就溢出到 64、65、66… 这些额外块号。
     * 索引 [scope+dayKey] 用来整批取回；清理按记录里的 dayKey 字段比对。
     */

    var ARCHIVE_DB_SEEN_CHUNK_COUNT = 64;
    var ARCHIVE_DB_SEEN_CHUNK_LIMIT = 500;
    var ARCHIVE_DB_SEEN_OVERFLOW_START = 64;
    var ARCHIVE_DB_SEEN_OVERFLOW_MAX = 1024;

    /* seen 写入串行链：putSeen / clearSeenBefore 共用一条，保证同一个块永远只有
     * 一个事务在 read-modify-write。并发读改写会丢 uid（实测刷新后多算 9 人：
     * 两个 putSeen 读到同一份旧块、后写覆盖前写，丢掉的 uid 下次会话又变回「当日首次」）。
     * 写法与 Ingest 里 upsertRoomDay 的 ridDay 串行链一致：前一个 settle 才发下一个，
     * 失败只让当次返回 ok:false，不阻塞后续任务。 */
    var archiveDbSeenChain = Promise.resolve();

    /* 仅供诊断/测试：观察串行队列的并发上限（active 应当恒 ≤ 1）。 */
    var archiveDbSeenProbe = { active: 0, max: 0, completed: 0 };

    function archiveDbEnqueueSeenTask(runner) {
        function runTask() {
            archiveDbSeenProbe.active += 1;
            if (archiveDbSeenProbe.active > archiveDbSeenProbe.max) {
                archiveDbSeenProbe.max = archiveDbSeenProbe.active;
            }
            var task;
            try {
                task = runner();
            } catch (error) {
                task = Promise.resolve(archiveDbFailure("task-failed", { added: 0, removed: 0 }));
            }
            return Promise.resolve(task).then(function (value) {
                archiveDbSeenProbe.active -= 1;
                archiveDbSeenProbe.completed += 1;
                return value;
            }, function (error) {
                archiveDbSeenProbe.active -= 1;
                archiveDbSeenProbe.completed += 1;
                return archiveDbFailure("task-failed", { message: archiveDbErrorMessage(error) });
            });
        }

        var previous = archiveDbSeenChain;
        var result = previous.then(runTask, runTask);
        /* 链本身吞掉结果/异常：一个任务失败绝不能把后面的任务卡死。 */
        archiveDbSeenChain = result.then(function () { return null; }, function () { return null; });
        return result;
    }

    function archiveDbSeenChunkKey(scopeText, dayKeyText, chunkIndex) {
        return scopeText + "|" + dayKeyText + "|" + chunkIndex;
    }

    /* 稳定字符串哈希（ES5，无位运算溢出风险）：同一个 uid 永远落到同一个首选块。 */
    function archiveDbHashUid(uidText) {
        var hashCode = 0;
        var index;
        for (index = 0; index < uidText.length; index += 1) {
            hashCode = (hashCode * 31 + uidText.charCodeAt(index)) % 2147483647;
        }
        return hashCode < 0 ? hashCode + 2147483647 : hashCode;
    }

    function archiveDbSeenChunkArray(record) {
        return Object.prototype.toString.call(record && record.uids) === "[object Array]" ? record.uids : [];
    }

    /* 在「已经打开的事务」里把一批 uid 合并进某个 scope+dayKey 的块（读改写）。
     * context.added 累加真正的新 uid 数。putSeen 与 commitBatch 共用这一份实现。 */
    function archiveDbMergeSeenInTransaction(transaction, scopeText, dayKeyText, incomingUids, context) {
        var store = transaction.objectStore(ARCHIVE_DB_STORE_SEEN);
        var chunksByIndex = Object.create(null);   /* chunkIndex -> uids[] （可原地追加） */
        var chunkIndexByUid = Object.create(null); /* uid -> chunkIndex */
        var dirtyIndexes = Object.create(null);

        function registerLoadedChunk(record) {
            var rawIndex = archiveDbNumericValue(record && record.chunk);
            var chunkIndex = rawIndex >= 0 ? Math.floor(rawIndex) : 0;
            var uids = archiveDbSeenChunkArray(record).slice(0);
            chunksByIndex[chunkIndex] = uids;
            var uidIndex;
            for (uidIndex = 0; uidIndex < uids.length; uidIndex += 1) {
                var uidText = archiveDbKeyText(uids[uidIndex]);
                if (!uidText) continue;
                if (chunkIndexByUid[uidText] === undefined) chunkIndexByUid[uidText] = chunkIndex;
            }
        }

        function chunkHasRoom(chunkIndex) {
            var chunk = chunksByIndex[chunkIndex];
            if (!chunk) return true; /* 还没建块 = 有空间 */
            return chunk.length < ARCHIVE_DB_SEEN_CHUNK_LIMIT;
        }

        function pickChunkIndex(preferredIndex) {
            if (chunkHasRoom(preferredIndex)) return preferredIndex;
            var overflowIndex = ARCHIVE_DB_SEEN_OVERFLOW_START;
            while (overflowIndex < ARCHIVE_DB_SEEN_OVERFLOW_START + ARCHIVE_DB_SEEN_OVERFLOW_MAX) {
                if (chunkHasRoom(overflowIndex)) return overflowIndex;
                overflowIndex += 1;
            }
            /* 理论上到不了：64 主块 + 1024 溢出块远超单日人数上限 */
            return preferredIndex;
        }

        function assignUid(uidText) {
            if (chunkIndexByUid[uidText] !== undefined) return false;
            var preferredIndex = archiveDbHashUid(uidText) % ARCHIVE_DB_SEEN_CHUNK_COUNT;
            var targetIndex = pickChunkIndex(preferredIndex);
            if (!chunksByIndex[targetIndex]) chunksByIndex[targetIndex] = [];
            chunksByIndex[targetIndex].push(uidText);
            chunkIndexByUid[uidText] = targetIndex;
            dirtyIndexes[targetIndex] = true;
            context.added += 1;
            return true;
        }

        function writeChunks() {
            var indexKey;
            for (indexKey in dirtyIndexes) {
                if (!archiveDbHasOwn(dirtyIndexes, indexKey)) continue;
                var chunkIndex = archiveDbNumericValue(indexKey);
                store.put({
                    key: archiveDbSeenChunkKey(scopeText, dayKeyText, chunkIndex),
                    scope: scopeText,
                    dayKey: dayKeyText,
                    chunk: chunkIndex,
                    uids: chunksByIndex[chunkIndex]
                });
            }
        }

        var index = store.index(ARCHIVE_DB_INDEX_SCOPE_DAY);
        var cursorRequest = index.openCursor(IDBKeyRange.only([scopeText, dayKeyText]));
        cursorRequest.onsuccess = function () {
            var cursor = cursorRequest.result;
            if (!cursor) {
                /* 先把整组 uid 合并完再统一 put，保证同批内的重复也只算一次「新增」。 */
                var uidIndex;
                for (uidIndex = 0; uidIndex < incomingUids.length; uidIndex += 1) {
                    assignUid(incomingUids[uidIndex]);
                }
                writeChunks();
                return;
            }
            try {
                registerLoadedChunk(cursor.value);
            } catch (error) {
                try { transaction.abort(); } catch (abortError) { /* 已经结束 */ }
                return;
            }
            cursor.continue();
        };
    }

    /* 把一批 uid 合并进某个 scope+dayKey 的块里（单事务读改写）。 */
    function archiveDbPutSeenGroup(scopeText, dayKeyText, incomingUids) {
        return archiveDbRunTransaction([ARCHIVE_DB_STORE_SEEN], "readwrite", function (transaction) {
            var outcome = { added: 0 };
            archiveDbMergeSeenInTransaction(transaction, scopeText, dayKeyText, incomingUids, outcome);
            return outcome;
        }).then(function (result) {
            if (!result || result.ok !== true) {
                return { ok: false, added: 0, reason: (result && result.reason) || "write-failed" };
            }
            return { ok: true, added: archiveDbNumericValue(result.value.added) };
        });
    }

    function archiveDbPutSeenNow(list) {
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbFailure("unsupported", { added: 0, skipped: 0 }));
        if (!list || typeof list.length !== "number" || typeof list === "string") {
            return Promise.resolve(archiveDbFailure("bad-arg", { added: 0, skipped: 0 }));
        }

        /* 先按 scope+dayKey 分组（同组一次事务），非法项记 skipped。 */
        var groups = [];
        var positionByGroupKey = Object.create(null);
        var skippedCount = 0;
        var itemIndex;
        for (itemIndex = 0; itemIndex < list.length; itemIndex += 1) {
            var item = list[itemIndex];
            if (!item || typeof item !== "object") {
                skippedCount += 1;
                continue;
            }
            var scopeText = archiveDbKeyText(item.scope);
            var dayKeyText = archiveDbKeyText(item.dayKey);
            var uidText = archiveDbKeyText(item.uid);
            if (!scopeText || !dayKeyText || !uidText) {
                skippedCount += 1;
                continue;
            }
            var groupKey = scopeText + "|" + dayKeyText;
            var position = positionByGroupKey[groupKey];
            if (position === undefined) {
                positionByGroupKey[groupKey] = groups.length;
                groups.push({ scope: scopeText, dayKey: dayKeyText, uids: [uidText] });
                continue;
            }
            groups[position].uids.push(uidText);
        }

        var summary = { added: 0, skipped: skippedCount };

        function runGroup(groupIndex) {
            if (groupIndex >= groups.length) {
                return Promise.resolve({ ok: true, added: summary.added, skipped: summary.skipped });
            }
            var group = groups[groupIndex];
            return archiveDbPutSeenGroup(group.scope, group.dayKey, group.uids).then(function (groupResult) {
                if (!groupResult || groupResult.ok !== true) {
                    return archiveDbFailure((groupResult && groupResult.reason) || "write-failed", {
                        added: summary.added,
                        skipped: summary.skipped
                    });
                }
                summary.added += archiveDbNumericValue(groupResult.added);
                return runGroup(groupIndex + 1);
            });
        }

        return runGroup(0);
    }

    function archiveDbGetSeen(scope, dayKey) {
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbFailure("unsupported", { uids: [] }));
        var scopeText = archiveDbKeyText(scope);
        var dayKeyText = archiveDbKeyText(dayKey);
        if (!scopeText || !dayKeyText) return Promise.resolve(archiveDbFailure("bad-arg", { uids: [] }));

        return archiveDbRunTransaction([ARCHIVE_DB_STORE_SEEN], "readonly", function (transaction) {
            var outcome = { uids: [], seen: Object.create(null) };
            var index = transaction.objectStore(ARCHIVE_DB_STORE_SEEN).index(ARCHIVE_DB_INDEX_SCOPE_DAY);
            var request = index.openCursor(IDBKeyRange.only([scopeText, dayKeyText]));
            request.onsuccess = function () {
                var cursor = request.result;
                if (!cursor) return;
                var uids = archiveDbSeenChunkArray(cursor.value);
                var uidIndex;
                for (uidIndex = 0; uidIndex < uids.length; uidIndex += 1) {
                    var uidText = archiveDbKeyText(uids[uidIndex]);
                    if (!uidText) continue;
                    if (outcome.seen[uidText]) continue;
                    outcome.seen[uidText] = true;
                    outcome.uids.push(uidText);
                }
                cursor.continue();
            };
            return outcome;
        }).then(function (result) {
            if (!result || result.ok !== true) {
                return archiveDbFailure((result && result.reason) || "query-failed", { uids: [] });
            }
            return { ok: true, uids: result.value.uids };
        });
    }

    /* 删掉 dayKey 早于 cutoffDayKey 的 seen 块（prune 里顺手调）。removed = 删掉的块数。 */
    function archiveDbClearSeenBeforeNow(cutoffDayKey) {
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbFailure("unsupported", { removed: 0 }));
        var cutoffText = archiveDbKeyText(cutoffDayKey);
        if (!cutoffText) return Promise.resolve(archiveDbFailure("bad-arg", { removed: 0 }));

        return archiveDbRunTransaction([ARCHIVE_DB_STORE_SEEN], "readwrite", function (transaction) {
            var outcome = { removed: 0 };
            var cursorRequest = transaction.objectStore(ARCHIVE_DB_STORE_SEEN).openCursor();
            cursorRequest.onsuccess = function () {
                var cursor = cursorRequest.result;
                if (!cursor) return;
                var dayKeyText = archiveDbKeyText((cursor.value || {}).dayKey);
                if (dayKeyText && dayKeyText < cutoffText) {
                    cursor.delete();
                    outcome.removed += 1;
                }
                cursor.continue();
            };
            return outcome;
        }).then(function (result) {
            if (!result || result.ok !== true) {
                return archiveDbFailure((result && result.reason) || "clear-failed", { removed: 0 });
            }
            return { ok: true, removed: archiveDbNumericValue(result.value.removed) };
        });
    }

    /* 对外入口：putSeen / clearSeenBefore 都走同一条串行链，杜绝同块并发读改写。 */
    function archiveDbPutSeen(list) {
        return archiveDbEnqueueSeenTask(function () {
            return archiveDbPutSeenNow(list);
        });
    }

    function archiveDbClearSeenBefore(cutoffDayKey) {
        return archiveDbEnqueueSeenTask(function () {
            return archiveDbClearSeenBeforeNow(cutoffDayKey);
        });
    }

    /* ---------------- 清空 / meta ---------------- */

    function archiveDbClearAll() {
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbFailure("unsupported"));
        return archiveDbRunTransaction(ARCHIVE_DB_ALL_STORES, "readwrite", function (transaction) {
            var storeIndex;
            for (storeIndex = 0; storeIndex < ARCHIVE_DB_ALL_STORES.length; storeIndex += 1) {
                transaction.objectStore(ARCHIVE_DB_ALL_STORES[storeIndex]).clear();
            }
            return { cleared: true };
        }).then(function (result) {
            if (!result || result.ok !== true) return archiveDbFailure((result && result.reason) || "clear-failed");
            return { ok: true };
        });
    }

    function archiveDbGetMeta(metaKey) {
        if (!archiveDbIsSupported()) return Promise.resolve(null);
        var keyText = archiveDbKeyText(metaKey);
        if (!keyText) return Promise.resolve(null);
        return archiveDbRunTransaction([ARCHIVE_DB_STORE_META], "readonly", function (transaction) {
            var outcome = { value: null };
            var request = transaction.objectStore(ARCHIVE_DB_STORE_META).get(keyText);
            request.onsuccess = function () {
                var record = request.result;
                outcome.value = record && archiveDbHasOwn(record, "v") ? record.v : null;
            };
            return outcome;
        }).then(function (result) {
            if (!result || result.ok !== true) return null;
            return result.value.value === undefined ? null : result.value.value;
        });
    }

    function archiveDbSetMeta(metaKey, metaValue) {
        if (!archiveDbIsSupported()) return Promise.resolve(archiveDbFailure("unsupported"));
        var keyText = archiveDbKeyText(metaKey);
        if (!keyText) return Promise.resolve(archiveDbFailure("bad-arg"));
        return archiveDbRunTransaction([ARCHIVE_DB_STORE_META], "readwrite", function (transaction) {
            transaction.objectStore(ARCHIVE_DB_STORE_META).put({
                k: keyText,
                v: metaValue === undefined ? null : metaValue
            });
            return { written: true };
        }).then(function (result) {
            if (!result || result.ok !== true) return archiveDbFailure((result && result.reason) || "write-failed");
            return { ok: true };
        });
    }

    /* ---------------- 对外 API ---------------- */

    return {
        /** 打开（建）库；幂等，并发调用合流到同一次 indexedDB.open。 */
        open: function () {
            return archiveDbOpenInternal();
        },

        /** 批量写事件（1000 条/事务）；dedupKey 冲突跳过。→ {ok, added, skipped} */
        putEvents: function (events) {
            return archiveDbPutEvents(events);
        },

        /**
         * 原子批量提交：events + seen + room_day + counters 全在**一个** readwrite 事务里，
         * 任何一步失败整体 abort（三者都不落地）。入参同 putEvents / putSeen / upsertRoomDay：
         *   { events:[…], seen:[{scope,dayKey,uid}…], roomDays:[{ridDay,patch,deltas}…] }
         * 同一 ridDay 的多条按数组顺序合并。→ {ok, added, skipped, seenAdded, roomDays, counters}
         * 其中 roomDays = 实际写入的 room_day 行数，counters = 写后 meta.counters。
         */
        commitBatch: function (payload) {
            return archiveDbCommitBatch(payload);
        },

        /** 批量 upsert 房间档案（主键 rid，非空字段覆盖、空值不覆盖）。→ {ok, added, updated, skipped} */
        putRooms: function (list) {
            return archiveDbPutRooms(list);
        },

        /** → {ok, room} | {ok:false, reason:"not-found", room:null} */
        getRoom: function (rid) {
            return archiveDbGetRoom(rid);
        },

        /** 批量 upsert 用户档案（主键 uid，cnt 累加、其余非空字段覆盖）。→ {ok, added, updated, skipped} */
        putUsers: function (list) {
            return archiveDbPutUsers(list);
        },

        /** users store 的 count()。→ {ok, count} */
        countUsers: function () {
            return archiveDbCountUsers();
        },

        /** seen（UV 去重）批量写入，主键 scope|dayKey|uid 天然去重。→ {ok, added, skipped}（skipped = 非法项 + 重复命中） */
        putSeen: function (list) {
            return archiveDbPutSeen(list);
        },

        /** 取某 scope 某天见过的全部 uid。→ {ok, uids:[…]} */
        getSeen: function (scope, dayKey) {
            return archiveDbGetSeen(scope, dayKey);
        },

        /** 删掉 dayKey 早于 cutoffDayKey 的 seen 行。→ {ok, removed} */
        clearSeenBefore: function (cutoffDayKey) {
            return archiveDbClearSeenBefore(cutoffDayKey);
        },

        /** 单事务读改写房间日汇总：deltas 累加、patch 覆盖。→ {ok, roomDay} */
        upsertRoomDay: function (ridDay, patch, deltas) {
            return archiveDbUpsertRoomDay(ridDay, patch, deltas);
        },

        /** → room_day 对象或 null */
        getRoomDay: function (rid, dayKey) {
            return archiveDbGetRoomDay(rid, dayKey);
        },

        /** → {ok, list, hasMore} */
        queryUserDay: function (uid, dayKey, options) {
            return archiveDbQueryUserDay(uid, dayKey, options);
        },

        /** → {ok, list}（按 ts 升序） */
        queryRoomDayEvents: function (rid, dayKey, options) {
            return archiveDbQueryRoomDayEvents(rid, dayKey, options);
        },

        /** kind "chat" 计条数 / "gift" 计 gfcnt 份数。→ {ok, list:[{uid,nn,value}]} 降序 */
        topUsers: function (rid, dayKey, kind, limit) {
            return archiveDbTopUsers(rid, dayKey, kind, limit);
        },

        /** → {ok, list:[room_day…]} */
        listRoomDays: function (dayKey) {
            return archiveDbListRoomDays(dayKey);
        },

        /**
         * 区间汇总（闭区间 [fromDayKey, toDayKey]，字典序比较）。
         * → {ok, rid, fromDayKey, toDayKey, days, sum:{…9 个累加字段}, latest:{lastTs}}
         */
        sumRoomDays: function (rid, fromDayKey, toDayKey) {
            return archiveDbSumRoomDays(rid, fromDayKey, toDayKey);
        },

        /** → 统计对象（见契约） */
        stats: function () {
            return archiveDbStats();
        },

        /** 明细保留 7 天（room_day 不删）+ 1 GB 上限；顺带清过期 seen 块。→ {ok, removedDays, removedEvents, removedSeen} */
        prune: function () {
            return archiveDbPrune();
        },

        /** 清空所有 store（保留结构）。→ {ok} */
        clearAll: function () {
            return archiveDbClearAll();
        },

        /** → 值 或 null */
        getMeta: function (metaKey) {
            return archiveDbGetMeta(metaKey);
        },

        /** → {ok} */
        setMeta: function (metaKey, metaValue) {
            return archiveDbSetMeta(metaKey, metaValue);
        },

        /**
         * 仅供诊断 / 测试观察内部队列，不属于对外契约（Ingest / UI 不要依赖）：
         * seenQueue() → { active, max, completed }，active 恒 ≤ 1 说明串行链在生效。
         */
        __debug: {
            seenQueue: function () {
                return {
                    active: archiveDbSeenProbe.active,
                    max: archiveDbSeenProbe.max,
                    completed: archiveDbSeenProbe.completed
                };
            },
            resetSeenQueueStats: function () {
                archiveDbSeenProbe.max = archiveDbSeenProbe.active;
                archiveDbSeenProbe.completed = 0;
                return { active: archiveDbSeenProbe.active, max: archiveDbSeenProbe.max, completed: 0 };
            },
            /** 原子性测试用：置 true 后，下一次 commitBatch 会在所有写入完成后主动 abort。 */
            setCommitBatchAbortFault: function (enabled) {
                archiveDbCommitAbortFault = enabled === true;
                return archiveDbCommitAbortFault;
            }
        }
    };
})();
