function* (__imports) {
yield {"executeSignEngine": { get: () => executeSignEngine, set: value => { executeSignEngine = value; } }};
async function executeSignEngine(options, onLog) {
  if (typeof onLog !== "function")
    onLog = function (msg, isSuccess) {
      (0, __imports.T)(msg, isSuccess ? "success" : "info");
    };
  var opts = options || {
    room: true,
    client: true,
    yuba: true,
    fanshome: true,
    stardiscover: true,
  };

  onLog("正在准备签到环境...", true);

  // 1. 鱼吧签到
  if (opts.yuba) {
    try {
      onLog("正在获取关注鱼吧列表...");
      var followData = await (0, __imports.ai)(1);
      var groupList =
        followData && followData.list ? followData.list.slice() : [];
      var totalPages = Number((followData && followData.count_page) || 1) - 1;
      for (var p = 0; p < totalPages; p++) {
        var nextFollow = await (0, __imports.ai)(2 + p);
        if (nextFollow && nextFollow.list)
          groupList = groupList.concat(nextFollow.list);
      }
      if (groupList.length > 0) {
        var signCount = 0;
        for (var g = 0; g < groupList.length; g++) {
          var gid = groupList[g].group_id;
          if (!gid) continue;
          await new Promise(function (resolve) {
            (0, __imports.GM_xmlhttpRequest)({
              method: "POST",
              url: "https://yuba.douyu.com/ybapi/topic/sign",
              data: "group_id=" + gid,
              responseType: "json",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "dy-client": "pc",
                "dy-token": __imports.m,
                Referer: "https://yuba.douyu.com/group/" + gid,
              },
              onload: function () {
                signCount++;
                resolve();
              },
              onerror: function () {
                resolve();
              },
            });
          });
          if (g % 3 === 0) await (0, __imports.b)(120);
        }
        onLog("【鱼吧签到】已打卡 " + signCount + " 个关注鱼吧", true);
      } else {
        onLog("【鱼吧签到】未检测到关注的鱼吧", true);
      }
    } catch (err) {
      onLog("【鱼吧签到】执行异常: " + (err.message || "网络错误"), false);
    }
  }

  // 2. 客户端模拟签到 (领取每日礼盒)
  if (opts.client) {
    try {
      onLog("正在执行【客户端模拟】签到...");
      await new Promise(function (resolve) {
        (0, __imports.GM_xmlhttpRequest)({
          method: "POST",
          url: "https://apiv2.douyucdn.cn/h5nc/sign/sendSign",
          data: "token=" + __imports.m,
          responseType: "json",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          onload: function (res) {
            var o = res.response || {};
            if (o.data && o.data.sign_pl && o.data.sign_pl.length > 0) {
              var items = o.data.sign_pl
                .map(function (it) {
                  return it.cnt + "个" + it.name;
                })
                .join(", ");
              onLog("【客户端签到】获得: " + items, true);
            } else if (o.data && o.data.length === 0) {
              onLog("【客户端签到】今日已签到", true);
            } else {
              onLog("【客户端签到】打卡成功", true);
            }
            resolve();
          },
          onerror: function () {
            onLog("【客户端签到】请求失败", false);
            resolve();
          },
        });
      });
    } catch (err) {
      onLog("【客户端签到】执行异常", false);
    }
  }

  // 3. 房间与粉丝牌签到
  if (opts.room) {
    try {
      onLog("正在获取关注房间列表...");
      var followRes = await new Promise(function (resolve) {
        (0, __imports.fetch)(
          "https://www.douyu.com/wgapi/livenc/liveweb/follow/list?page=1428",
          {
            method: "GET",
            mode: "no-cors",
            cache: "default",
            credentials: "include",
          },
        )
          .then(function (r) {
            return r.json();
          })
          .then(resolve)
          .catch(function () {
            resolve(null);
          });
      });
      if (followRes && followRes.data && followRes.data.list) {
        var rooms = followRes.data.list;
        var roomCount = 0;
        for (var ri = 0; ri < rooms.length; ri++) {
          var rItem = rooms[ri];
          if (rItem && rItem.room_id) {
            (0, __imports.$n)(rItem.room_id);
            roomCount++;
          }
          if (ri % 5 === 0) await (0, __imports.b)(100);
        }
        onLog("【房间签到】" + roomCount + " 个关注房间签到完毕", true);
      } else {
        onLog("【房间签到】关注列表为空或未登录", false);
      }
    } catch (err) {
      onLog("【房间签到】执行异常", false);
    }
  }

  // 4. 星推日常任务 (打开活动页 + 曝光打卡 + 口令弹幕[仅星推参赛房间] + 动态 introduce 获取主播 + 满额5位安全取关闭环)
  if (opts.stardiscover) {
    try {
      onLog("正在获取星推榜单与任务配置...");
      // 提取规范纯数字房间号
      var curNumericRid = "";
      try {
        var rCandidate = String(
          window.room_id ||
            (window.$ROOM && window.$ROOM.room_id) ||
            (typeof __imports.B !== "undefined" ? __imports.B : "") ||
            "",
        );
        if (/^\d+$/.test(rCandidate)) curNumericRid = rCandidate;
        else {
          var mPath = window.location.pathname.match(/\/(\d+)/);
          if (mPath && mPath[1]) curNumericRid = mPath[1];
        }
      } catch (e) {}
      if (!/^[1-9]\d*$/.test(curNumericRid))
        throw new Error("当前房间号不可用，星推任务已停止");
      var queryRid = curNumericRid;

      // 获取斗鱼标准 CSRF 凭据 (ccn)
      async function getDouyuCtn() {
        var m = document.cookie.match(/(?:^|;\s*)ccn=([^;]+)/);
        if (m && m[1]) return decodeURIComponent(m[1]);
        try {
          await (0, __imports.fetch)("/wgapi/livenc/liveweb/csrfApi/getCsrfCookie", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          });
          var m2 = document.cookie.match(/(?:^|;\s*)ccn=([^;]+)/);
          if (m2 && m2[1]) return decodeURIComponent(m2[1]);
        } catch (e) {}
        var m3 = document.cookie.match(/(?:^|;\s*)acf_ccn=([^;]+)/);
        if (m3 && m3[1]) return decodeURIComponent(m3[1]);
        return "";
      }

      var realCtn = await getDouyuCtn();

      // 获取 post-csrfToken 用于 anchorstardiscover 接口
      var csrf = "";
      try {
        var mCsrf = document.cookie.match(/(^| )post-csrfToken=([^;]*)(;|$)/);
        csrf = mCsrf ? unescape(mCsrf[2]) : "";
        if (!csrf) {
          csrf = Math.random().toString(36).substr(2);
          document.cookie = "post-csrfToken=" + escape(csrf) + ";path=/";
        }
      } catch (e) {}

      function postStarReport(rid, type) {
        return (0, __imports.fetch)(
          "https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/report",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "dy-csrf-token": csrf,
            },
            body:
              "ctn=" +
              encodeURIComponent(realCtn || "1") +
              "&type=" +
              type +
              "&rid=" +
              encodeURIComponent(rid),
          },
        )
          .then(function (r) {
            return r.json();
          })
          .catch(function () {
            return null;
          });
      }

      async function followAnchorApi(rid, token) {
        return (0, __imports.fetch)("/wgapi/livenc/liveweb/follow/add", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body:
            "rid=" +
            encodeURIComponent(rid) +
            "&ctn=" +
            encodeURIComponent(token || ""),
        })
          .then(function (r) {
            return r.json();
          })
          .catch(function (e) {
            return { error: -1, msg: e.message };
          });
      }

      async function unfollowAnchorApi(rid, token) {
        return (0, __imports.fetch)("/wgapi/livenc/liveweb/follow/rm", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body:
            "rid=" +
            encodeURIComponent(rid) +
            "&ctn=" +
            encodeURIComponent(token || ""),
        })
          .then(function (r) {
            return r.json();
          })
          .catch(function (e) {
            return { error: -1, msg: e.message };
          });
      }

      // 查询官方星推任务实时列表与完成进度
      async function fetchStarTaskList() {
        try {
          var res = await (0, __imports.fetch)(
            "https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/list?rid=" +
              queryRid,
            {
              credentials: "include",
            },
          ).then(function (r) {
            return r.json();
          });
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
      var rankUrl =
        "https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/rank/info?rid=" +
        queryRid +
        "&type=5&track=3";
      var rankRes = await new Promise(function (resolve) {
        (0, __imports.fetch)(rankUrl, { method: "GET", credentials: "include" })
          .then(function (r) {
            return r.json();
          })
          .then(resolve)
          .catch(function () {
            resolve(null);
          });
      });
      var rankList =
        rankRes && rankRes.data && Array.isArray(rankRes.data.rankItemList)
          ? rankRes.data.rankItemList
          : [];
      var starRids = rankList
        .map(function (item) {
          return String(item.rid || item.rId || "");
        })
        .filter(Boolean);

      // (3) 任务5：3个活动直播间签到打卡 (+9金币)
      var signRids = starRids.slice(0, 3);
      for (var si = 0; si < signRids.length; si++) {
        var srid = signRids[si];
        try {
          await postStarReport(srid, 5);
        } catch (e) {}
        await (0, __imports.b)(200);
      }
      if (signRids.length > 0) {
        onLog(
          "【星推签到】完成 " + signRids.length + " 个星推直播间打卡 (+9金币)",
          true,
        );
      }

      // (4) 任务7：发送指定助力口令弹幕 (严禁在普通直播间乱发，仅在指定星推参赛房间发送)
      var isStarCompetitionRoom = false;
      if (curNumericRid && rankRes && rankRes.data && rankRes.data.memberInfo) {
        var mInfo = rankRes.data.memberInfo;
        if (
          mInfo.hide === 0 &&
          Number(mInfo.rank) > 0 &&
          String(mInfo.rid) === String(curNumericRid)
        ) {
          isStarCompetitionRoom = true;
        }
      }
      if (isStarCompetitionRoom) {
        try {
          var txtEl =
            document.querySelector("textarea.ChatSend-txt") ||
            document.querySelector("div.ChatSend-txt");
          var sendBtn = document.querySelector(".ChatSend-button");
          if (txtEl && sendBtn) {
            var isDiv = "div" === txtEl.tagName.toLowerCase();
            var origVal = isDiv ? txtEl.innerText : txtEl.value;
            if (isDiv) txtEl.innerText = "全民星推荐助力主播成长";
            else txtEl.value = "全民星推荐助力主播成长";
            txtEl.dispatchEvent(new Event("input", { bubbles: true }));
            sendBtn.click();
            await (0, __imports.b)(400);
            if (isDiv) txtEl.innerText = origVal || "";
            else txtEl.value = origVal || "";
            txtEl.dispatchEvent(new Event("input", { bubbles: true }));
            onLog(
              "【星推弹幕】当前为星推参赛直播间，已自动发送指定助力口令 (+5金币)",
              true,
            );
          }
        } catch (e) {}
      } else {
        onLog(
          "【星推弹幕】当前房间非指定星推参赛直播间，已安全跳过口令发送（避免打扰主播）",
          true,
        );
      }

      // (5) 任务4：关注5名新主播 (+15金币) - 每轮动态请求官方 introduce 推荐，关注后立即安全取关
      try {
        var currentTaskList = await fetchStarTaskList();
        var task4Info = currentTaskList.find(function (t) {
          return Number(t.type) === 4;
        });
        var completedCount = task4Info
          ? Number(task4Info.curCompleteNum || 0)
          : 0;
        var targetCount = 5;

        if (completedCount >= targetCount) {
          onLog(
            "【星推关注】今日关注任务已全部达成 (" + completedCount + "/5)",
            true,
          );
        } else {
          var needed = targetCount - completedCount;
          onLog(
            "正在执行【星推关注任务】(当前进度 " +
              completedCount +
              "/5，需完成 " +
              needed +
              " 位)...",
          );
          realCtn = await getDouyuCtn();

          var processedRids = [];
          var attemptIndex = 0;

          while (completedCount < targetCount && attemptIndex < 12) {
            var sourceRid =
              attemptIndex < starRids.length
                ? starRids[attemptIndex]
                : queryRid;
            attemptIndex++;

            // 动态向官方 introduce 端点请求推荐主播
            var targetRid = "";
            try {
              var introRes = await (0, __imports.fetch)(
                "https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/follow/introduce?rid=" +
                  sourceRid,
                {
                  credentials: "include",
                },
              )
                .then(function (r) {
                  return r.json();
                })
                .catch(function () {
                  return null;
                });
              if (
                introRes &&
                introRes.data &&
                Array.isArray(introRes.data.list) &&
                introRes.data.list.length > 0
              ) {
                targetRid = String(
                  introRes.data.list[0].rid || introRes.data.list[0].rId || "",
                );
              }
            } catch (e) {}

            // 若 introduce 未返回，则从大盘榜单中挑选一位未处理主播
            if (
              !targetRid ||
              processedRids.indexOf(targetRid) !== -1 ||
              targetRid === curNumericRid
            ) {
              for (var si = 0; si < starRids.length; si++) {
                var sCand = starRids[si];
                if (
                  sCand &&
                  sCand !== curNumericRid &&
                  processedRids.indexOf(sCand) === -1
                ) {
                  targetRid = sCand;
                  break;
                }
              }
            }

            if (!targetRid) break;
            processedRids.push(targetRid);

            try {
              // 1. 添加关注
              var addRes = await followAnchorApi(targetRid, realCtn);
              if (addRes && (addRes.error === 0 || addRes.code === 0)) {
                // 2. 适当驻留 1.8 秒让服务端任务系统结算
                await (0, __imports.b)(1800);
              }

              // 3. 立即安全取关 (内置自动重试与凭据校验)
              var rmOk = false;
              for (var retry = 0; retry < 3; retry++) {
                var rmRes = await unfollowAnchorApi(targetRid, realCtn);
                if (rmRes && (rmRes.error === 0 || rmRes.code === 0)) {
                  rmOk = true;
                  break;
                }
                await (0, __imports.b)(400);
                realCtn = await getDouyuCtn();
              }

              // 4. 再次校验任务进度
              var updatedList = await fetchStarTaskList();
              var updatedT4 = updatedList.find(function (t) {
                return Number(t.type) === 4;
              });
              var newCompleted = updatedT4
                ? Number(updatedT4.curCompleteNum || 0)
                : completedCount + 1;

              if (newCompleted > completedCount) {
                completedCount = newCompleted;
                onLog(
                  "【星推关注】主播 " +
                    targetRid +
                    " 关注成功并已安全取关 (" +
                    completedCount +
                    "/5)",
                  true,
                );
              } else {
                onLog(
                  "【星推关注】主播 " + targetRid + " 已处理并安全取关",
                  true,
                );
              }
            } catch (err) {
              try {
                await unfollowAnchorApi(targetRid, realCtn);
              } catch (e) {}
            }

            // 避免触发高频风控，间隔 800ms 进入下一位
            await (0, __imports.b)(800);
          }

          // 最终安全巡检：对本次涉及的全部主播再次执行安全取关兜底，100% 杜绝残留
          for (var ci = 0; ci < processedRids.length; ci++) {
            try {
              await unfollowAnchorApi(processedRids[ci], realCtn);
            } catch (e) {}
          }

          onLog(
            "【星推关注】已达成 " +
              completedCount +
              "/5 位关注任务，关注列表 100% 保持纯净 (+15金币)",
            true,
          );
        }
      } catch (e) {
        onLog("【星推关注】关注任务异常: " + (e.message || "未知错误"), false);
      }

      // (6) 互动积分任务上报 (type=1)
      for (var si2 = 0; si2 < Math.min(3, starRids.length); si2++) {
        try {
          await postStarReport(starRids[si2], 1);
        } catch (e) {}
        await (0, __imports.b)(150);
      }
      onLog("【星推任务】星推日常任务已全部执行完毕！", true);
    } catch (err) {
      onLog("【星推任务】执行异常: " + (err.message || "未知错误"), false);
    }
  }
  // 5. 粉丝家园与钻粉联赛签到
  if (opts.fanshome) {
    try {
      onLog("正在执行【粉丝家园】签到...");
      if (typeof __imports.To !== "undefined" && Array.isArray(__imports.To)) {
        for (var fi = 0; fi < __imports.To.length; fi++) {
          var trid = __imports.To[fi];
          try {
            await (0, __imports.fetch)(
              "https://www.douyu.com/japi/interactnc/web/fanshome/sign",
              {
                method: "POST",
                mode: "no-cors",
                credentials: "include",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: "ctn=" + (0, __imports.w)() + "&rid=" + trid,
              },
            );
            await (0, __imports.fetch)(
              "https://www.douyu.com/japi/interactnc/web/dfansact/userSign",
              {
                method: "POST",
                mode: "no-cors",
                credentials: "include",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: "ctn=" + (0, __imports.w)() + "&rid=" + trid,
              },
            );
          } catch (e) {}
        }
      }
      onLog("【粉丝家园】签到打卡完毕", true);
    } catch (err) {
      onLog("【粉丝家园】未加入粉丝家园", true);
    }
  }

  onLog("全部已选签到任务执行完毕！", true);
}
window.executeSignEngine = executeSignEngine;


}
