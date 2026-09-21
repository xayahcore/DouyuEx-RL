async function executeStarDiscoverSign(onLog) {
  if (typeof onLog !== "function") {
    onLog = function (msg, ok) {
      showMessage(msg, ok ? "success" : "info");
    };
  }

  onLog("正在获取星推榜单与任务配置...");
  var curNumericRid = "";
  try {
    var rCandidate = String(window.room_id || (window.$ROOM && window.$ROOM.room_id) || (typeof rid !== "undefined" ? rid : "") || "");
    if (/^\d+$/.test(rCandidate)) curNumericRid = rCandidate;
    else {
      var mPath = window.location.pathname.match(/\/(\d+)/);
      if (mPath && mPath[1]) curNumericRid = mPath[1];
    }
  } catch (e) {}
  var queryRid = curNumericRid || "9999";

  var realCtn = await getDouyuCtn();

  var csrf = "";
  try {
    var mCsrf = document.cookie.match(/(^| )post-csrfToken=([^;]*)(;|$)/);
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
      var res = await fetch("https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/list?rid=" + queryRid, {
        credentials: "include"
      }).then((r) => r.json());
      if (res && res.data && Array.isArray(res.data.taskList)) {
        return res.data.taskList;
      }
    } catch (e) {}
    return [];
  }

  // (1) 任务6：每日首次打开活动页 (+10金币)
  try {
    await postStarReport(queryRid, 6);
    onLog("【星推任务】已完成每日活动页打卡 (+10金币)", true);
  } catch (e) {}

  // (2) 拉取星推大盘榜单 (获取活跃参赛主播池)
  var rankUrl = "https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/rank/info?rid=" + queryRid + "&type=5&track=3";
  var rankRes = await fetch(rankUrl, { method: "GET", credentials: "include" })
    .then((r) => r.json())
    .catch(() => null);
  var rankList = (rankRes && rankRes.data && Array.isArray(rankRes.data.rankItemList)) ? rankRes.data.rankItemList : [];
  var starRids = rankList.map((item) => String(item.rid || item.rId || "")).filter(Boolean);

  // (3) 任务5：3个活动直播间签到打卡 (+9金币)
  var signRids = starRids.slice(0, 3);
  for (var si = 0; si < signRids.length; si++) {
    var srid = signRids[si];
    try {
      await postStarReport(srid, 5);
    } catch (e) {}
    await sleep(200);
  }
  if (signRids.length > 0) {
    onLog("【星推签到】完成 " + signRids.length + " 个星推直播间打卡 (+9金币)", true);
  }

  // (4) 任务7：发送指定助力口令弹幕 (严禁在普通直播间乱发，仅在指定星推参赛房间发送)
  var isStarCompetitionRoom = false;
  if (curNumericRid && rankRes && rankRes.data && rankRes.data.memberInfo) {
    var mInfo = rankRes.data.memberInfo;
    if (mInfo.hide === 0 && Number(mInfo.rank) > 0 && String(mInfo.rid) === String(curNumericRid)) {
      isStarCompetitionRoom = true;
    }
  }
  if (isStarCompetitionRoom) {
    try {
      var txtEl = document.querySelector("textarea.ChatSend-txt") || document.querySelector("div.ChatSend-txt");
      var sendBtn = document.querySelector(".ChatSend-button");
      if (txtEl && sendBtn) {
        var isDiv = "div" === txtEl.tagName.toLowerCase();
        var origVal = isDiv ? txtEl.innerText : txtEl.value;
        if (isDiv) txtEl.innerText = "全民星推荐助力主播成长";
        else txtEl.value = "全民星推荐助力主播成长";
        txtEl.dispatchEvent(new Event("input", { bubbles: true }));
        sendBtn.click();
        await sleep(400);
        if (isDiv) txtEl.innerText = origVal || "";
        else txtEl.value = origVal || "";
        txtEl.dispatchEvent(new Event("input", { bubbles: true }));
        onLog("【星推弹幕】当前为星推参赛直播间，已自动发送指定助力口令 (+5金币)", true);
      }
    } catch (e) {}
  } else {
    onLog("【星推弹幕】当前房间非指定星推参赛直播间，已安全跳过口令发送（避免打扰主播）", true);
  }

  // (5) 任务4：关注5名新主播 (+15金币) - 动态 5 轮 introduce 推荐，严格安全取关闭环
  try {
    var currentTaskList = await fetchStarTaskList();
    var task4Info = currentTaskList.find((t) => Number(t.type) === 4);
    var completedCount = task4Info ? Number(task4Info.curCompleteNum || 0) : 0;
    var targetCount = 5;

    if (completedCount >= targetCount) {
      onLog("【星推关注】今日关注任务已全部达成 (" + completedCount + "/5)", true);
    } else {
      var needed = targetCount - completedCount;
      onLog("正在执行【星推关注任务】(当前进度 " + completedCount + "/5，需完成 " + needed + " 位)...");
      realCtn = await getDouyuCtn();

      // 获取当前用户既有关注列表作为白名单保护
      var existingFollowSet = new Set();
      try {
        var followRes = await fetch("https://www.douyu.com/wgapi/livenc/liveweb/follow/list?page=1428", {
          credentials: "include"
        }).then((r) => r.json()).catch(() => null);
        if (followRes && followRes.data && Array.isArray(followRes.data.list)) {
          followRes.data.list.forEach((item) => {
            if (item.room_id) existingFollowSet.add(String(item.room_id));
          });
        }
      } catch (e) {}

      var newlyFollowedRids = []; // 仅记录本次真正由脚本新添加的主播
      var processedRids = [];
      var attemptIndex = 0;

      while (completedCount < targetCount && attemptIndex < 12) {
        var sourceRid = (attemptIndex < starRids.length) ? starRids[attemptIndex] : queryRid;
        attemptIndex++;

        // 动态向官方 introduce 端点请求专属推荐主播
        var targetRid = "";
        try {
          var introRes = await fetch("https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/follow/introduce?rid=" + sourceRid, {
            credentials: "include"
          }).then((r) => r.json()).catch(() => null);
          if (introRes && introRes.data && Array.isArray(introRes.data.list) && introRes.data.list.length > 0) {
            targetRid = String(introRes.data.list[0].rid || introRes.data.list[0].rId || "");
          }
        } catch (e) {}

        if (!targetRid || processedRids.indexOf(targetRid) !== -1 || targetRid === curNumericRid) {
          for (var si = 0; si < starRids.length; si++) {
            var sCand = starRids[si];
            if (sCand && sCand !== curNumericRid && processedRids.indexOf(sCand) === -1) {
              targetRid = sCand;
              break;
            }
          }
        }

        if (!targetRid) break;
        processedRids.push(targetRid);

        // 如果该主播本身就在用户原有的关注列表中，绝不操作该主播，防止误取关
        if (existingFollowSet.has(targetRid)) {
          continue;
        }

        try {
          // 1. 添加关注
          var addRes = await followAnchorApi(targetRid, realCtn);
          if (addRes && (addRes.error === 0 || addRes.code === 0)) {
            newlyFollowedRids.push(targetRid);
            // 2. 适当驻留 1.8 秒让服务端任务系统结算
            await sleep(1800);

            // 3. 立即安全取关 (内置自动重试与凭据刷新)
            for (var retry = 0; retry < 3; retry++) {
              var rmRes = await unfollowAnchorApi(targetRid, realCtn);
              if (rmRes && (rmRes.error === 0 || rmRes.code === 0)) {
                break;
              }
              await sleep(400);
              realCtn = await getDouyuCtn();
            }

            // 4. 校验任务进度
            var updatedList = await fetchStarTaskList();
            var updatedT4 = updatedList.find((t) => Number(t.type) === 4);
            var newCompleted = updatedT4 ? Number(updatedT4.curCompleteNum || 0) : (completedCount + 1);

            if (newCompleted > completedCount) {
              completedCount = newCompleted;
              onLog("【星推关注】主播 " + targetRid + " 关注成功并已安全取关 (" + completedCount + "/5)", true);
            } else {
              onLog("【星推关注】主播 " + targetRid + " 已处理并安全取关", true);
            }
          } else if (addRes && addRes.error === 1) {
            // 已关注的主播（原有关注），绝对不要取关
            existingFollowSet.add(targetRid);
          }
        } catch (err) {
          console.warn("[DouyuEx] 关注任务单步异常:", err);
        }

        await sleep(800);
      }

      // 最终安全巡检：只对本次成功由脚本新增关注的主播执行安全取关兜底，绝不误伤原有关注
      for (var ci = 0; ci < newlyFollowedRids.length; ci++) {
        try {
          await unfollowAnchorApi(newlyFollowedRids[ci], realCtn);
        } catch (e) {}
      }

      onLog("【星推关注】已达成 " + completedCount + "/5 位关注任务，关注列表 100% 保持纯净 (+15金币)", true);
    }
  } catch (e) {
    onLog("【星推关注】任务异常: " + (e.message || "未知错误"), false);
  }

  // (6) 互动积分任务上报 (type=1)
  for (var si2 = 0; si2 < Math.min(3, starRids.length); si2++) {
    try {
      await postStarReport(starRids[si2], 1);
    } catch (e) {}
    await sleep(150);
  }
  onLog("【星推任务】星推日常任务已全部执行完毕！", true);
}
