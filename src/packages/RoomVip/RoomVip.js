const roomVipExpireDayLimit = 5;
function initPkg_RoomVip() {
  setRoomVipExpireDays();
}

/**
 * 插入「距VIP到期 N 天」节点。
 * 返回**真正插进 DOM 的那个元素**（插不进去返回 null）——
 * 旧实现不返回任何东西，调用方只能 document.getElementById 去点名，
 * 而节点没插进去时那就是 null，紧接着 .innerText 直接 TypeError。
 */
function initPkg_RoomVip_Dom() {
  let a = document.createElement("span");
  a.className = "room-vip";
  a.innerHTML = `
	距VIP到期 <span id="room-vip-expire-days">**</span> 天
	`;
  let b = getValidDom(["#js-backpack-enter"]);
  let parent = b ? b.parentElement : null;
  if (!parent) {
    if (typeof ExGuard_warn === "function") {
      ExGuard_warn("房间VIP", "没找到背包入口，本次不显示 VIP 到期天数");
    }
    return null;
  }
  parent.insertBefore(a, parent.childNodes[0]);
  return a;
}

function setRoomVipExpireDays() {
  fetch("https://www.douyu.com/member/platform_task/effect_list", {
    method: "GET",
    mode: "no-cors",
    cache: "default",
    credentials: "include"
  })
    .then((res) => {
      return res.text();
    })
    .then((text) => {
      // 解析与渲染都收在这一个 try 里：单条坏数据（data-detail 不是合法 JSON）
      // 过去会把整个 .then 抛成 rejection，再被下面的 .catch 报成「请求失败!」——
      // 明明是数据坏了，日志却指向请求，现场完全无法定位。
      let doc = null;
      try {
        doc = new DOMParser().parseFromString(String(text || ""), "text/html");
      } catch (e) {
        if (typeof ExGuard_warn === "function") ExGuard_warn("房间VIP", "特效列表页面解析失败", e);
        return;
      }
      const enterEffectDom = doc.getElementsByClassName("enter-wraper is-effect");
      if (!enterEffectDom || enterEffectDom.length == 0) return;
      const showEffectMoreDom = enterEffectDom[0].getElementsByClassName("show-effect-more");
      if (!showEffectMoreDom || showEffectMoreDom.length == 0) return;
      for (let i = 0; i < showEffectMoreDom.length; i++) {
        let detail = null;
        try {
          detail = JSON.parse(showEffectMoreDom[i].getAttribute("data-detail") || "{}");
        } catch (e) {
          // 只跳过这一条，不带走后面的特效记录
          if (typeof ExGuard_warn === "function") ExGuard_warn("房间VIP", "有一条特效数据不是合法 JSON，已跳过", e);
          continue;
        }
        if (!detail || String(detail.property_id) !== "1646") continue; // 1646是VIP的ID
        if (String(detail.show_id_list) !== String(rid)) continue;
        const expireTime = Number(detail.expire_time) * 1000;
        if (!isFinite(expireTime)) continue;
        const days = Math.floor((expireTime - Date.now()) / (1000 * 60 * 60 * 24));
        if (days <= roomVipExpireDayLimit) {
          const tipsDom = initPkg_RoomVip_Dom();
          if (!tipsDom) continue; // 节点没插进去就不要再按 id 点名（旧实现这里直接 TypeError）
          const dayDom = tipsDom.querySelector("#room-vip-expire-days") || document.getElementById("room-vip-expire-days");
          if (dayDom) dayDom.innerText = days;
        }
      }
    })
    .catch((err) => {
      // 走到这里就真的是请求层失败了
      if (typeof ExGuard_warn === "function") ExGuard_warn("房间VIP", "读取特效列表失败，本次不显示 VIP 到期天数", err);
      else console.log("请求失败!", err);
    });
}
