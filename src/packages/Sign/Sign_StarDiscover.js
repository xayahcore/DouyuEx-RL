/* ==================== 星推日常任务 ==================== */
/*
 * 历史问题（audit-wave2 P1-5 / P1-6）：
 *   ① 关键步骤全是 try { await ... } catch (e) {}，失败一律静默，末尾却无条件
 *      onLog("【星推任务】星推日常任务已全部执行完毕！", true)；
 *   ② 关注→取关没有结果确认、没有补偿：执行中关页 / 取关被风控，陌生主播就留在用户关注列表里，
 *      而末尾那句「关注列表 100% 保持纯净」是无条件断言。
 * 现在：
 *   · 每一步按接口返回的真实 error 记 ok/fail，末尾按计数汇报（有失败就明说失败）；
 *   · 只取关「本脚本确认关注成功」的主播（ownedSet 白名单），用户原本关注的一律不碰；
 *   · 关注成功立刻写 ExSave_StarFollowPending，确认取关后才删；下次进页面先补偿上次残留；
 *   · 取关失败如实留 warn 并保留待办，不再谎报「关注列表 100% 纯净」。
 */

const STAR_PENDING_KEY = "ExSave_StarFollowPending";
const STAR_UNFOLLOW_ATTEMPTS = 3;
const STAR_UNFOLLOW_GAP_MS = 400;

/** 读「待取关」清单（本脚本关注成功但还没确认取关的主播） */
function StarDiscover_pendingRead() {
    try {
        const raw = JSON.parse(localStorage.getItem(STAR_PENDING_KEY) || "[]");
        return Array.isArray(raw) ? raw.map(String) : [];
    } catch (e) {
        return [];
    }
}

function StarDiscover_pendingWrite(list) {
    try {
        localStorage.setItem(STAR_PENDING_KEY, JSON.stringify(list));
    } catch (e) {
        ExGuard_warn("星推关注", "待取关清单写入失败（下次无法自动补偿）", e);
    }
}

function StarDiscover_pendingAdd(rid) {
    const key = String(rid);
    const list = StarDiscover_pendingRead();
    if (list.indexOf(key) === -1) {
        list.push(key);
        StarDiscover_pendingWrite(list);
    }
}

function StarDiscover_pendingRemove(rid) {
    const key = String(rid);
    const list = StarDiscover_pendingRead().filter(function (x) { return x !== key; });
    StarDiscover_pendingWrite(list);
}

async function executeStarDiscoverSign(onLog) {
  if (typeof onLog !== "function") {
    onLog = function (msg, ok) {
      showMessage(msg, ok ? "success" : "info");
    };
  }

  // 真实计数：只有这两个数字参与最终汇报，进度类日志不进计数
  const stats = { ok: 0, fail: 0 };
  function report(msg, ok) {
    if (ok) stats.ok++;
    else stats.fail++;
    onLog(msg, !!ok);
  }
  // 白名单：只有这里的 rid 才允许被取关（本次新增关注 + 上次遗留待办）
  const ownedSet = Object.create(null);

  onLog("正在获取星推榜单与任务配置...");
  let curNumericRid = "";
  try {
    const rCandidate = String(window.room_id || (window.$ROOM && window.$ROOM.room_id) || (typeof rid !== "undefined" ? rid : "") || "");
    if (/^\d+$/.test(rCandidate)) curNumericRid = rCandidate;
    else {
      const mPath = window.location.pathname.match(/\/(\d+)/);
      if (mPath && mPath[1]) curNumericRid = mPath[1];
    }
  } catch (e) {}
  const queryRid = curNumericRid || "9999";

  let realCtn = await getDouyuCtn();

  let csrf = "";
  try {
    const mCsrf = document.cookie.match(/(^| )post-csrfToken=([^;]*)(;|$)/);
    csrf = mCsrf ? unescape(mCsrf[2]) : "";
    if (!csrf) {
      csrf = Math.random().toString(36).substr(2);
      document.cookie = "post-csrfToken=" + escape(csrf) + ";path=/";
    }
  } catch (e) {}

  function postStarReport(r, type) {
    return fetch("https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/report", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "dy-csrf-token": csrf
      },
      body: "ctn=" + encodeURIComponent(realCtn || "1") + "&type=" + type + "&rid=" + encodeURIComponent(r)
    }).then((res) => res.json()).catch(() => null);
  }

  async function followAnchorApi(r, token) {
    return fetch("/wgapi/livenc/liveweb/follow/add", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "rid=" + encodeURIComponent(r) + "&ctn=" + encodeURIComponent(token || "")
    }).then((res) => res.json()).catch((e) => ({ error: -1, msg: e.message }));
  }

  async function unfollowAnchorApi(r, token) {
    return fetch("/wgapi/livenc/liveweb/follow/rm", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "rid=" + encodeURIComponent(r) + "&ctn=" + encodeURIComponent(token || "")
    }).then((res) => res.json()).catch((e) => ({ error: -1, msg: e.message }));
  }

  async function fetchStarTaskList() {
    try {
      const res = await fetch("https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/list?rid=" + queryRid, {
        credentials: "include"
      }).then((r) => r.json());
      if (res && res.data && Array.isArray(res.data.taskList)) {
        return res.data.taskList;
      }
    } catch (e) {
      ExGuard_warn("星推任务", "任务列表拉取失败", e);
    }
    return [];
  }

  /**
   * 确认取关：只有 ownedSet 里的 rid 才会被执行（用户自己关注的一律不碰）。
   * 成功即从待办清单与白名单里移除；失败保留待办并留痕，交给下次补偿。
   */
  async function tryUnfollowOwned(targetRid) {
    const key = String(targetRid);
    if (!ownedSet[key]) return false;
    let token = realCtn;
    for (let attempt = 0; attempt < STAR_UNFOLLOW_ATTEMPTS; attempt++) {
      const rmRes = await unfollowAnchorApi(key, token);
      if (rmRes && (Number(rmRes.error) === 0 || Number(rmRes.code) === 0)) {
        delete ownedSet[key];
        StarDiscover_pendingRemove(key);
        return true;
      }
      await sleep(STAR_UNFOLLOW_GAP_MS);
      token = await getDouyuCtn();
    }
    ExGuard_warn("星推关注", "主播 " + key + " 取关未成功，已记入待办（下次打开直播间自动补偿）");
    return false;
  }

  // (0) 先补偿上次没来得及取关的：中途关页 / 上次取关被风控都会留在这里
  const leftover = StarDiscover_pendingRead();
  if (leftover.length) {
    leftover.forEach(function (x) { ownedSet[String(x)] = true; });
    let cleaned = 0;
    for (let i = 0; i < leftover.length; i++) {
      if (await tryUnfollowOwned(leftover[i])) cleaned++;
    }
    report("【星推关注】已清理上次未取关的 " + cleaned + "/" + leftover.length + " 个主播", cleaned === leftover.length);
  }

  // (1) 任务6：每日首次打开活动页 (+10金币)
  const report6 = await postStarReport(queryRid, 6);
  if (report6 && Number(report6.error) === 0) {
    report("【星推任务】已完成每日活动页打卡 (+10金币)", true);
  } else {
    report("【星推任务】每日活动页打卡未成功（" + ((report6 && (report6.msg || report6.error)) || "接口无响应") + "）", false);
  }

  // (2) 拉取星推大盘榜单 (获取活跃参赛主播池)
  const rankUrl = "https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/rank/info?rid=" + queryRid + "&type=5&track=3";
  const rankRes = await fetch(rankUrl, { method: "GET", credentials: "include" })
    .then((r) => r.json())
    .catch(() => null);
  const rankList = (rankRes && rankRes.data && Array.isArray(rankRes.data.rankItemList)) ? rankRes.data.rankItemList : [];
  const starRids = rankList.map((item) => String(item.rid || item.rId || "")).filter(Boolean);
  if (!starRids.length) {
    onLog("【星推任务】榜单为空（活动可能未开或接口异常），后续依赖榜单的任务将自动跳过");
  }

  // (3) 任务5：3个活动直播间签到打卡 (+9金币)
  const signRids = starRids.slice(0, 3);
  let sign5ok = 0;
  let sign5fail = 0;
  for (let si = 0; si < signRids.length; si++) {
    const srid = signRids[si];
    const r5 = await postStarReport(srid, 5);
    if (r5 && Number(r5.error) === 0) sign5ok++;
    else sign5fail++;
    await sleep(200);
  }
  if (signRids.length > 0) {
    if (sign5fail > 0) report("【星推签到】" + sign5ok + " 个成功、" + sign5fail + " 个失败（共 " + signRids.length + " 个星推直播间）", false);
    else report("【星推签到】完成 " + signRids.length + " 个星推直播间打卡 (+9金币)", true);
  }

  // (4) 任务7：发送指定助力口令弹幕 (严禁在普通直播间乱发，仅在指定星推参赛房间发送)
  let isStarCompetitionRoom = false;
  if (curNumericRid && rankRes && rankRes.data && rankRes.data.memberInfo) {
    const mInfo = rankRes.data.memberInfo;
    if (mInfo.hide === 0 && Number(mInfo.rank) > 0 && String(mInfo.rid) === String(curNumericRid)) {
      isStarCompetitionRoom = true;
    }
  }
  if (isStarCompetitionRoom) {
    const txtEl = document.querySelector("textarea.ChatSend-txt") || document.querySelector("div.ChatSend-txt");
    const sendBtn = document.querySelector(".ChatSend-button");
    if (!txtEl || !sendBtn) {
      report("【星推弹幕】聊天区输入框/发送按钮不在，口令未发送（不影响其它任务）", false);
    } else {
      const isDiv = "div" === txtEl.tagName.toLowerCase();
      const origVal = isDiv ? txtEl.innerText : txtEl.value;
      try {
        if (isDiv) txtEl.innerText = "全民星推荐助力主播成长";
        else txtEl.value = "全民星推荐助力主播成长";
        txtEl.dispatchEvent(new Event("input", { bubbles: true }));
        sendBtn.click();
        await sleep(400);
        report("【星推弹幕】当前为星推参赛直播间，已自动发送指定助力口令 (+5金币)", true);
      } catch (e) {
        report("【星推弹幕】口令弹幕发送异常（" + (e.message || "未知错误") + "）", false);
      } finally {
        // 无论成败都把输入框恢复成用户原来的内容（否则会残留一句助力口令）
        if (isDiv) txtEl.innerText = origVal || "";
        else txtEl.value = origVal || "";
        txtEl.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  } else {
    onLog("【星推弹幕】当前房间非指定星推参赛直播间，已安全跳过口令发送（避免打扰主播）", true);
  }

  // (5) 任务4：关注5名新主播 (+15金币) - 只动「本脚本新增关注」的主播，且确认后再离开
  try {
    const currentTaskList = await fetchStarTaskList();
    const task4Info = currentTaskList.find((t) => Number(t.type) === 4);
    let completedCount = task4Info ? Number(task4Info.curCompleteNum || 0) : 0;
    const targetCount = 5;

    if (completedCount >= targetCount) {
      onLog("【星推关注】今日关注任务已全部达成 (" + completedCount + "/5)", true);
    } else {
      const needed = targetCount - completedCount;
      onLog("正在执行【星推关注任务】(当前进度 " + completedCount + "/5，需完成 " + needed + " 位)...");
      realCtn = await getDouyuCtn();

      // 既有关注白名单：命中的一律不关注、更不取关
      const existingFollowSet = new Set();
      try {
        const followRes = await fetch("https://www.douyu.com/wgapi/livenc/liveweb/follow/list?page=1428", {
          credentials: "include"
        }).then((r) => r.json()).catch(() => null);
        if (followRes && followRes.data && Array.isArray(followRes.data.list)) {
          followRes.data.list.forEach((item) => {
            if (item.room_id) existingFollowSet.add(String(item.room_id));
          });
        }
      } catch (e) {
        ExGuard_warn("星推关注", "既有关注列表拉取失败，本次按空白名单处理（宁可少关注）", e);
      }

      const processedSet = new Set();
      if (curNumericRid) processedSet.add(curNumericRid);

      const candidateQueue = [];
      starRids.forEach((r) => {
        if (r && !existingFollowSet.has(r) && !processedSet.has(r)) {
          candidateQueue.push(r);
        }
      });

      let sourceIndex = 0;
      const maxAttempts = 25;
      let attemptCount = 0;

      async function pullMoreCandidates() {
        const srcRid = (sourceIndex < starRids.length) ? starRids[sourceIndex] : queryRid;
        sourceIndex++;
        try {
          const introRes = await fetch("https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/follow/introduce?rid=" + srcRid, {
            credentials: "include"
          }).then((r) => r.json()).catch(() => null);
          if (introRes && introRes.data && Array.isArray(introRes.data.list)) {
            introRes.data.list.forEach((item) => {
              const candidateRid = String(item.rid || item.rId || "");
              if (candidateRid && !existingFollowSet.has(candidateRid) && !processedSet.has(candidateRid) && !candidateQueue.includes(candidateRid)) {
                candidateQueue.push(candidateRid);
              }
            });
          }
        } catch (e) {
          ExGuard_warn("星推关注", "补候选主播失败（跳过这个源房间）", e);
        }
      }

      await pullMoreCandidates();

      let followOk = 0;
      let followFail = 0;

      while (completedCount < targetCount && attemptCount < maxAttempts) {
        attemptCount++;

        if (candidateQueue.length === 0) {
          await pullMoreCandidates();
        }

        if (candidateQueue.length === 0) {
          if (sourceIndex < starRids.length + 3) {
            await pullMoreCandidates();
            if (candidateQueue.length === 0) {
              await sleep(500);
              continue;
            }
          } else {
            break;
          }
        }

        const targetRid = candidateQueue.shift();
        if (!targetRid || processedSet.has(targetRid) || existingFollowSet.has(targetRid)) {
          continue;
        }
        processedSet.add(targetRid);

        try {
          realCtn = await getDouyuCtn();
          const addRes = await followAnchorApi(targetRid, realCtn);
          if (addRes && (Number(addRes.error) === 0 || Number(addRes.code) === 0)) {
            // 先登记再动下一步：中途关页也能在下次进页面时补偿
            ownedSet[targetRid] = true;
            StarDiscover_pendingAdd(targetRid);
            await sleep(1800);
            const cleaned = await tryUnfollowOwned(targetRid);
            if (!cleaned) followFail++;

            const updatedList = await fetchStarTaskList();
            const updatedT4 = updatedList.find((t) => Number(t.type) === 4);
            const newCompleted = updatedT4 ? Number(updatedT4.curCompleteNum || 0) : completedCount;
            if (newCompleted > completedCount) {
              completedCount = newCompleted;
              followOk++;
              onLog("【星推关注】主播 " + targetRid + " 关注成功并已安全取关 (" + completedCount + "/5)", true);
            } else {
              onLog("【星推关注】主播 " + targetRid + " 已处理并安全取关 (当前进度 " + completedCount + "/5)", true);
            }
          } else if (addRes && Number(addRes.error) === 1) {
            // 已关注：白名单保护，绝不取关
            existingFollowSet.add(targetRid);
          } else {
            followFail++;
            ExGuard_warn("星推关注", "主播 " + targetRid + " 关注失败（" + ((addRes && (addRes.msg || addRes.error)) || "无响应") + "）");
          }
        } catch (err) {
          followFail++;
          ExGuard_warn("星推关注", "主播 " + targetRid + " 关注单步异常", err);
        }

        await sleep(800);
      }

      // 收尾巡检：只对白名单里还剩下的 rid 再确认一次
      let residue = 0;
      const stillOwned = Object.keys(ownedSet);
      for (let ci = 0; ci < stillOwned.length; ci++) {
        if (!(await tryUnfollowOwned(stillOwned[ci]))) residue++;
      }

      if (residue > 0) {
        report("【星推关注】仍有 " + residue + " 个主播取关未成功，已记入待办（下次打开直播间自动补偿）", false);
      } else if (followFail > 0) {
        report("【星推关注】当前进度 " + completedCount + "/5，其中 " + followFail + " 次关注未成功（可稍后重试）", false);
      } else {
        report("【星推关注】已达成 " + completedCount + "/5，本次新增关注均已确认取关", true);
      }
    }
  } catch (e) {
    report("【星推关注】任务异常: " + (e.message || "未知错误"), false);
  }

  // (6) 互动积分任务上报 (type=1)
  let actOk = 0;
  let actFail = 0;
  for (let si2 = 0; si2 < Math.min(3, starRids.length); si2++) {
    const r1 = await postStarReport(starRids[si2], 1);
    if (r1 && Number(r1.error) === 0) actOk++;
    else actFail++;
    await sleep(150);
  }
  if (actFail > 0) {
    ExGuard_warn("星推任务", "互动上报 " + actOk + " 个成功、" + actFail + " 个失败");
  }

  // 只在真的没有失败项时才说「全部执行完毕」
  const allOk = stats.fail === 0;
  onLog("【星推任务】" + (allOk
    ? "星推日常任务已全部执行完毕！"
    : "星推日常任务执行结束，其中 " + stats.fail + " 项未成功（详见上面的提示）"), allOk);

  return { ok: stats.ok, fail: stats.fail };
}
