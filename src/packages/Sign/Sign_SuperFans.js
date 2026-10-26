async function initPkg_Sign_SuperFans() {
  // 与粉丝家园同样口径：逐个 try/catch，单个钻粉房间失败不拖垮整批。
  if (!Array.isArray(myFansBadgeList) || !myFansBadgeList.length) {
    ExGuard_warn("钻粉联赛", "没有可签到的粉丝牌房间，本次跳过");
    return { ok: 0, fail: 0 };
  }
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < myFansBadgeList.length; i++) {
    const roomId = myFansBadgeList[i];
    try {
      const ret = await signSuperFans(roomId);
      if (!ret || ret.error !== 0) {
        fail++;
        // 原来这句提示被注释掉了，失败完全静默；这里恢复，但用 warn 级避免刷屏
        ExGuard_warn("钻粉联赛", `${roomId}${(ret && ret.msg) || "签到失败"}`);
      } else {
        ok++;
        showMessage(`【钻粉联赛签到】${roomId}签到成功！`, "success");
      }
    } catch (err) {
      fail++;
      ExGuard_warn("钻粉联赛", `${roomId} 签到异常，继续下一个`, err);
    }
  }
  if (fail > 0) {
    showMessage(`【钻粉联赛】完成 ${ok} 个，失败 ${fail} 个`, "warning");
  }
  return { ok, fail };
}

function signSuperFans(rid) {
  return new Promise((resolve, reject) => {
    fetch("https://www.douyu.com/japi/interactnc/web/dfansact/userSign", {
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
