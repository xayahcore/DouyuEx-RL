const roomVipExpireDayLimit = 5;
function initPkg_RoomVip() {
  setRoomVipExpireDays();
}

/*
 * 插入锚点：背包入口在不同版式里有三种写法；三种都没有时退到工具栏单元格。
 * 旧实现只认 #js-backpack-enter 一个固定锚点 —— 版式一变，「距VIP到期 N 天」整块静默消失。
 */
const ROOM_VIP_ANCHOR_SELECTORS = [
  "#js-backpack-enter",
  ".BackpackButton",
  ".PlayerToolbar-ContentRow .PlayerToolbar-ContentCell"
];
let roomVipAnchorWaiting = false;

function RoomVip_findAnchor() {
  return getValidDom(ROOM_VIP_ANCHOR_SELECTORS);
}

/**
 * 插入「距VIP到期 N 天」节点（幂等）。
 * 返回**真正插进 DOM 的那个元素**（插不进去返回 null）——
 * 旧实现不返回任何东西，调用方只能 document.getElementById 去点名，
 * 而节点没插进去时那就是 null，紧接着 .innerText 直接 TypeError。
 */
function initPkg_RoomVip_Dom() {
  const existing = document.querySelector(".room-vip");
  if (existing) return existing;
  let a = document.createElement("span");
  a.className = "room-vip";
  a.innerHTML = `
	距VIP到期 <span id="room-vip-expire-days">**</span> 天
	`;
  const anchor = RoomVip_findAnchor();
  const parent = anchor ? anchor.parentElement : null;
  if (!parent) return null;
  parent.insertBefore(a, parent.childNodes[0]);
  return a;
}

/** 把天数写进节点（负数是"已过期"，见下） */
function RoomVip_writeDays(badge, days) {
  if (!badge) return false;
  if (days < 0) {
    // 过期了还说「距VIP到期 -12 天」读不通：整句改成「VIP 已过期 N 天」。
    // 外层模板是「距VIP到期 <span id="room-vip-expire-days">**</span> 天」，
    // 只改 span 会剩下「距VIP到期 已过期 天」，所以这里重写容器文本。
    // 拼进去的只有 Math.abs(days) 这个数字，不含任何外部输入。
    badge.innerHTML = "VIP 已过期 " + Math.abs(days) + " 天";
    return true;
  }
  const dayDom = badge.querySelector("#room-vip-expire-days") || document.getElementById("room-vip-expire-days");
  if (dayDom) dayDom.innerText = days;
  return true;
}

/**
 * 展示 VIP 到期天数；锚点还没渲染就**有上限地等**（版式变化 / 工具栏晚渲染），
 * 等不到由 ExGuard 留一条「等了多少秒、已放弃」，不再无声消失。
 */
function RoomVip_showDays(days) {
  const badge = initPkg_RoomVip_Dom();
  if (badge) {
    RoomVip_writeDays(badge, days);
    return true;
  }
  if (roomVipAnchorWaiting) return false;
  if (typeof ExGuard_pollFor !== "function") {
    if (typeof ExGuard_warn === "function") {
      ExGuard_warn("房间VIP", "没找到背包入口（" + ROOM_VIP_ANCHOR_SELECTORS.join(" / ") + "），本次不显示 VIP 到期天数");
    }
    return false;
  }
  roomVipAnchorWaiting = true;
  ExGuard_pollFor(RoomVip_findAnchor, function () {
    roomVipAnchorWaiting = false;
    const late = initPkg_RoomVip_Dom();
    if (late) RoomVip_writeDays(late, days);
  }, { intervalMs: 500, maxTries: 20, tag: "房间VIP" });
  return false;
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
          RoomVip_showDays(days);
        }
      }
    })
    .catch((err) => {
      // 走到这里就真的是请求层失败了
      if (typeof ExGuard_warn === "function") ExGuard_warn("房间VIP", "读取特效列表失败，本次不显示 VIP 到期天数", err);
      else console.log("请求失败!", err);
    });
}
