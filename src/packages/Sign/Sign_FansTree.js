async function initPkg_Sign_FansTree() {
  // 单个房间失败/异常都不能把后面的房间一起带走：旧实现 for 里裸 await 一个会 reject 的 Promise，
  // 第一个房间一挂整批就停，而且调用方没 await → 变成一条无人接的 unhandled rejection。
  if (!Array.isArray(myFansBadgeList) || !myFansBadgeList.length) {
    ExGuard_warn("粉丝家园", "没有可签到的粉丝牌房间，本次跳过");
    return { ok: 0, fail: 0 };
  }
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < myFansBadgeList.length; i++) {
    const roomId = myFansBadgeList[i];
    try {
      const ret = await signRoomTree(roomId);
      if (!ret || ret.error !== 0) {
        fail++;
        showMessage(`【粉丝家园】${roomId}${(ret && ret.msg) || "签到失败"}`, "error");
      } else {
        ok++;
        showMessage(`【粉丝家园】${roomId}签到成功！`, "success");
      }
    } catch (err) {
      fail++;
      ExGuard_warn("粉丝家园", `${roomId} 签到异常，继续下一个`, err);
    }
  }
  if (fail > 0) {
    showMessage(`【粉丝家园】完成 ${ok} 个，失败 ${fail} 个`, "warning");
  }
  return { ok, fail };
}

function signRoomTree(rid) {
  return new Promise((resolve, reject) => {
    fetch("https://www.douyu.com/japi/interactnc/web/fanshome/sign", {
        method: 'POST',
        mode: 'no-cors',
        credentials: 'include',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `ctn=${getCCN()}&rid=${rid}`
    }).then(res => {
        return res.json();
    }).then(ret => {
        resolve(ret);
    }).catch(err => {
        console.log("请求失败!", err);
        reject(err);
    })
  })
}
