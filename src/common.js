// 全局变量及公共函数
var EXURL = {
  flv: "https://registry.npmmirror.com/flv.js/1.6.2/files/dist/flv.min.js",
  svga: "https://fastly.jsdelivr.net/npm/svgaplayerweb@2.3.1/build/svga.min.js",
  gif: "https://registry.npmmirror.com/gif.js/0.2.0/files/dist/gif.js",
  three: "https://registry.npmmirror.com/three/0.80.0/files/build/three.min.js",
  xl: "https://registry.npmmirror.com/xlsx/0.16.4/files/dist/xlsx.full.min.js",
  purify: "https://registry.npmmirror.com/dompurify/2.3.6/files/dist/purify.min.js"
};
var EXLIB = {};

function ExLoadLib(url, onSuccess, onError) {
  if (EXLIB[url]) {
    if (typeof onSuccess === "function") onSuccess();
    return;
  }
  EXLIB[url] = 1;
  GM_xmlhttpRequest({
    method: "GET",
    url: url,
    onload: (res) => {
      try {
        (0, eval)(res.response);
        if (typeof onSuccess === "function") onSuccess();
      } catch (err) {
        EXLIB[url] = 0;
        console.error("[DouyuEx] 组件加载失败:", url, err);
        if (typeof onError === "function") onError(err);
      }
    },
    onerror: (err) => {
      EXLIB[url] = 0;
      if (typeof onError === "function") onError(err);
    }
  });
}

function safeBind(target, eventName, handler, options) {
  if (!target || typeof target.addEventListener !== "function") return;
  target.addEventListener(eventName, function(e) {
    try {
      handler.call(this, e);
    } catch(err) {
      console.warn("[DouyuEx] 事件监听执行异常:", eventName, err);
    }
  }, options);
}

function safeEl(id) {
  return typeof id === "string" ? document.getElementById(id) : id;
}

var exTimer = 0; // 总时钟句柄
/**
 * 真实 room_id 运行时解析。
 *
 * 靓号(vipId)直播间的 URL 数字只是展示短号（如 /15000），真实 room_id 是另一个号
 * （如 796449）。脚本是 @run-at document-start，顶层读 HTML 时页面尚未解析，
 * "$ROOM.room_id =" 与 "roomID:" 双双落空后只能兜底到 canonical 上的短号，
 * 而全局 rid 一旦定死便再也不会重算 —— 依赖真实 room_id 的 doseeing 统计接口
 * 于是整场返回 0（实测 rid=15000 四项全 0，rid=796449 有真实数据）。
 *
 * 因此改为可反复调用的解析器：候选按可靠度排序，并排除 pathname 上的短号。
 * 首选顺序与 src/core/rank_engine.js 的 getRid() 保持一致 —— 页面自己使用的真实
 * 房间号（room_id / $ROOM.room_id）与斗鱼同一数据源，最可靠。
 *
 * 注意：本文件运行在油猴沙箱内，页面全局（room_id / $ROOM）必须经 unsafeWindow 读取，
 * 直接读 window 取不到 —— 这正是核心层 rank_engine.js 能读 window、此处却不能的原因。
 */
function exPageWindow() {
	try {
		if (typeof unsafeWindow !== "undefined" && unsafeWindow && unsafeWindow.document) {
			return unsafeWindow;
		}
	} catch (e) {}
	return window;
}

// URL 上的展示短号（靓号）；既作最后的兜底候选，也用于判断是否已拿到真实号
function exPathShortId() {
	try {
		let m = location.pathname.match(/\/(\d+)(?:\/|$)/);
		if (m) return m[1];
	} catch (e) {}
	return "";
}

// 是否已从可信来源（页面全局 / HTML 内联脚本）拿到房间号；拿到了就不必再重算
let exRidConfident = false;

function exParseRealRid() {
	let cands = [];
	let push = function(v) {
		if (v === null || v === undefined) return;
		v = String(v).replace(/['"\s;,]/g, "");
		if (!/^\d{3,12}$/.test(v)) return;
		if (cands.indexOf(v) === -1) cands.push(v);
	};

	// 快路径：页面自己使用的真实房间号。与斗鱼同一数据源，且无需序列化 DOM。
	try {
		let pageWindow = exPageWindow();
		let pageRid = pageWindow.room_id || (pageWindow.$ROOM && pageWindow.$ROOM.room_id);
		if (pageRid !== null && pageRid !== undefined && String(pageRid).trim() !== "") {
			let normalized = String(pageRid).replace(/['"\s;,]/g, "");
			if (/^\d{3,12}$/.test(normalized)) {
				exRidConfident = true;
				return normalized;
			}
		}
	} catch (e) {}

	// 慢路径：解析 HTML 内联脚本。document-start 时通常还没内容，DOMContentLoaded 之后才有效。
	try {
		let htmlEl = document.getElementsByTagName("html")[0];
		let html = htmlEl && htmlEl.innerHTML ? htmlEl.innerHTML : "";
		if (html) {
			let pos = html.indexOf("$ROOM.room_id =");
			if (pos > 0) {
				let rest = html.substring(pos + 15);
				let end = rest.indexOf(";");
				push(end > 0 ? rest.substring(0, end) : rest.substring(0, 24));
			}
			push(getStrMiddle(html, `roomID:`, `,`));
			let roomIdMatch = html.match(/"room_id"\s*:\s*(\d+)/);
			if (roomIdMatch) push(roomIdMatch[1]);
		}
	} catch (e) {}
	// HTML 内联脚本一旦命中即视为可信来源：正常房间此处拿到的就是真实号（恰好等于 URL 数字）
	if (cands.length) exRidConfident = true;

	// 兜底：canonical 链接（部分房间真实 room_id 恰好等于 URL 数字）
	try {
		let canonicalLink = document.querySelector(`link[rel="canonical"]`);
		if (canonicalLink) {
			push(String(canonicalLink.getAttribute("href") || "").split("/").pop());
		}
	} catch (e) {}

	push(exPathShortId());

	// 优先返回与 URL 短号不同的候选；全部相同（真实号本就等于短号）才回退第一个
	let shortId = exPathShortId();
	for (let i = 0; i < cands.length; i++) {
		if (cands[i] !== shortId) return cands[i];
	}
	return cands.length ? cands[0] : "";
}

// 回写全局 rid：只在拿到有效值时覆盖，避免被限流页把已经求出的好值冲成空
function exRefreshRid() {
	try {
		let realRid = exParseRealRid();
		if (realRid && String(realRid) !== String(rid)) {
			rid = String(realRid);
		}
	} catch (e) {}
	return rid;
}

// document-start 首帧尽力而为：HTML 未解析时多半只能落到短号，由下面的生命周期纠偏
var rid = exParseRealRid();

// 真实 room_id 要等页面自己的脚本跑起来才可见，故在生命周期节点上反复纠偏；
// 一旦从可信来源拿到号就立刻停手，之后不再产生任何开销。
(function exRidLifecycle() {
	let recalc = function() {
		if (exRidConfident) return;
		exRefreshRid();
	};
	if (document.readyState === "loading") {
		safeBind(document, "DOMContentLoaded", recalc);
	}
	safeBind(window, "load", recalc);
	setTimeout(recalc, 800);
	setTimeout(recalc, 2500);
	setTimeout(recalc, 6000);
})();

var my_uid = getCookieValue("acf_uid"); // 自己的uid
var myName = "";
var dyToken = getToken();

function sleep(time) {
	return new Promise((resolve) => setTimeout(resolve, time));
}

function formatSeconds(value) {
	let secondTime = parseInt(value);
	let minuteTime = 0;
	let hourTime = 0;
	if (secondTime > 60) {
		minuteTime = parseInt(secondTime / 60);
		secondTime = parseInt(secondTime % 60);
		if (minuteTime > 60) {
			hourTime = parseInt(minuteTime / 60);
			minuteTime = parseInt(minuteTime % 60);
		}
	}
	let result = "" + parseInt(secondTime) + "秒";
	if (minuteTime > 0) {
		result = "" + parseInt(minuteTime) + "分" + result;
	}
	if (hourTime > 0) {
		result = "" + parseInt(hourTime) + "小时" + result;
	}
	return result;
}

function formatSeconds2(value) {
	var secondTime = parseInt(value); // 秒
	var minuteTime = 0; // 分
	var hourTime = 0; // 小时
	if (secondTime > 60) {
		minuteTime = parseInt(secondTime / 60);
		secondTime = parseInt(secondTime % 60);
		if (minuteTime > 60) {
			hourTime = parseInt(minuteTime / 60);
			minuteTime = parseInt(minuteTime % 60);
		}
	}
	var result ="" +(parseInt(secondTime) < 10? "0" + parseInt(secondTime): parseInt(secondTime));

	// if (minuteTime > 0) {
		result ="" + (parseInt(minuteTime) < 10? "0" + parseInt(minuteTime) : parseInt(minuteTime)) + ":" + result;
	// }
	// if (hourTime > 0) {
		result ="" + (parseInt(hourTime) < 10 ? "0" + parseInt(hourTime): parseInt(hourTime)) +":" + result;
	// }
	return result;
}

async function verifyFans(room_id, level) {
	return true; // 2020年12月22日18:28:18
	let ret = false;
	let doc = await fetch('https://www.douyu.com/member/cp/getFansBadgeList',{
		method: 'GET',
		mode: 'no-cors',
		cache: 'default',
		credentials: 'include',
	}).then(res => {
		return res.text();
	}).catch(err => {
		console.log("请求失败!", err);
	})
	doc = (new DOMParser()).parseFromString(doc, 'text/html');
	let a = doc.getElementsByClassName("fans-badge-list")[0].lastElementChild;
	let n = a.children.length;
	for (let i = 0; i < n; i++) {
		let rid = a.children[i].getAttribute("data-fans-room");
		let rlv = a.children[i].getAttribute("data-fans-level");
		if (rid == room_id && rlv >= level) {
			ret = true;
			break;
		} else {
			ret = false;
		}
	}
	return ret;
}

function getStrMiddle(str, before, after) {
	let m = str.match(new RegExp(before + '(.*?)' + after));
	return m ? m[1] : false;
}

function getToken() {
	// let cookie = document.cookie;
	// let ret = getStrMiddle(cookie, "acf_uid=", ";") + "_" + getStrMiddle(cookie, "acf_biz=", ";") + "_" + getStrMiddle(cookie, "acf_stk=", ";") + "_" + getStrMiddle(cookie, "acf_ct=", ";") + "_" + getStrMiddle(cookie, "acf_ltkid=", ";");
	let ret = getCookieValue("acf_uid") + "_" + getCookieValue("acf_biz") + "_" + getCookieValue("acf_stk") + "_" + getCookieValue("acf_ct") + "_" + getCookieValue("acf_ltkid");
	return ret;
}

function getDyDid() {
	// let cookie = document.cookie;
	// let ret = getStrMiddle(cookie, "dy_did=", ";");
	let ret = getCookieValue("dy_did");
	return ret;
}

function setCookie(cookiename, value){
	let exp = new Date();
	exp.setTime(exp.getTime() + 3*60*60*1000);
	document.cookie = cookiename + "="+ escape (value) + "; path=/; expires=" + exp.toGMTString();
}

function getCookieValue(name){
   let arr,reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
    if (arr = document.cookie.match(reg)) {
        return unescape(arr[2]);
    } else {
        return null;
    }
}
function getCCN() {
	// let cookie = document.cookie;
	// let ret = getStrMiddle(cookie, "acf_ccn=", ";");
	let ret = getCookieValue("acf_ccn");
	if (ret == null) {
		setCookie("acf_ccn", "1");
		ret = "1";
	}
	return ret;
}

function getCTN() {
		// let cookie = document.cookie;
		// let ret = getStrMiddle(cookie, "acf_ccn=", ";");
		let ret = getCookieValue("acf_ctn");
		if (ret == null) {
			setCookie("acf_ctn", "1");
			ret = "1";
		}
		return ret;
	}

	async function getDouyuCtn() {
		var m = document.cookie.match(/(?:^|;\s*)ccn=([^;]+)/);
		if (m && m[1]) return decodeURIComponent(m[1]);
		try {
			await fetch("/wgapi/livenc/liveweb/csrfApi/getCsrfCookie", {
				method: "GET",
				credentials: "include",
				cache: "no-store"
			});
			var m2 = document.cookie.match(/(?:^|;\s*)ccn=([^;]+)/);
			if (m2 && m2[1]) return decodeURIComponent(m2[1]);
		} catch(e) {}
		return getCookieValue("acf_ccn") || "1";
	}

function getCSRF() {
	let ret = getCookieValue("cvl_csrf_token");
	if (ret == null) {
		setCookie("cvl_csrf_token", "1");
		ret = "1";
	}
	return ret;
}

function getUID() {
	let ret = getCookieValue("acf_uid");
	return ret;
}

// 通知停留时长：4 秒。
// NoticeJs 的进度条按 timeout 毫秒一跳、共 100 跳递减到底后移除，故时长 = timeout × 100ms，
// 这里由目标时长反推单跳间隔，避免以后改时长还要心算乘 100。
// 注意不能省掉这个显式 timeout：NoticeJs 内部是 Object.assign(Defaults, options)，
// 第一个参数就是要被改写的目标 —— 任何一次 showMessage 传了 options 都会**永久改写全局
// 默认值**，之后所有通知的时长都跟着变。每次显式指定可把该项复位，不必依赖调用方自觉。
const NOTICE_DURATION_MS = 4000;
const NOTICE_TIMEOUT_TICK_MS = NOTICE_DURATION_MS / 100;
function showMessage(msg, type="success", options) {
	// type: success[green] error[red] warning[orange] info[blue]
	let option = {
		text: msg,
		type: type,
		position: 'bottomLeft',
		timeout: NOTICE_TIMEOUT_TICK_MS,
		...options
	}
	new NoticeJs(option).show();
}

function openPage(url, b=true) {
	GM_openInTab(url, {
		active: b
	});
}

// 本机日期 YYYY-MM-DD。绝不能用 toISOString().slice(0,10)：那是 UTC 日期，
// 在国内时区凌晨 8 点前会算成前一天，按"直播日"查询时会整体错位一天。
function getLocalDateStr(date) {
	let d = date ? new Date(date.getTime()) : new Date();
	let pad = (v) => (v < 10 ? "0" + v : "" + v);
	return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function closePage() {
	if (navigator.userAgent.indexOf("Firefox") != -1 || navigator.userAgent.indexOf("Chrome") != -1) {
		window.location.href = "about:blank";
		window.close();
	} else {
		window.opener = null;
		window.open("", "_self");
		window.close();
	}
}

function getQueryString(name) {
	let reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
	if (window.location.hash.indexOf("?") < 0) {
		return null;
	}
	let r = window.location.hash.split("?")[1].match(reg);
	if (r != null) return decodeURIComponent(r[2]);
	return null;
}

function dateFormat(fmt, date) {
	let o = {
		"M+": date.getMonth() + 1,
		"d+": date.getDate(),
		"h+": date.getHours(),
		"m+": date.getMinutes(),
		"s+": date.getSeconds(),
		"q+": Math.floor((date.getMonth() + 3) / 3),
		"S": date.getMilliseconds()
	};
	if (/(y+)/.test(fmt))
		fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
	for (let k in o)
		if (new RegExp("(" + k + ")").test(fmt))
			fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
	return fmt;
}

function timeago(old) {
	let returnText = "";
	const nowDate = new Date().getTime(); //当前时间
	const setDate = new Date(old).getTime();
	const times = Math.floor((nowDate - setDate) / 1000);
	if (times > 60 * 60 * 24 * 365) {
		returnText = Math.floor(times / (60 * 60 * 24 * 365)) + "年前";
	} else if (times > 60 * 60 * 24 * 30) {
		returnText = Math.floor(times / (60 * 60 * 24 * 30)) + "个月前";
	} else if (times > 60 * 60 * 24) {
		returnText = Math.floor(times / (60 * 60 * 24)) + "天前";
	} else if (times > 60 * 60) {
		returnText = Math.floor(times / (60 * 60)) + "小时前";
	} else if (times >= 60) {
		returnText = Math.floor(times / 60) + "分钟前";
	} else {
		returnText = "刚刚";
	}
	return returnText;
}

function getRandom(min, max) {
	return Math.floor(Math.random() * (max - min) + min);
}

function isRid(str) {
	if (/^[0-9]+$/.test(str)) {
		return true;
	} else {
		return false;
	}
}
function getAvailableSheet(index) {
    let ret = -1;
    for (let i = index; i < document.styleSheets.length - index; i++) {
        if (document.styleSheets[i].href == null) {
            ret = i;
            break;
        } else {
            ret = -1;
        }
    }
    return ret;
}

function showMessageWindow(title, content, callback){
    if(window.Notification && Notification.permission !== "denied") {
        Notification.requestPermission(function(status) {
            var notice_ = new Notification(title, { body: content });
            notice_.onclick = function() {
				callback();
            }
        });
    }   
}

function getUserName() {
	return new Promise(resovle => {
		fetch('https://www.douyu.com/member/cp',{
			method: 'GET',
			mode: 'no-cors',
			credentials: 'include',
		}).then(res => {
			return res.text();
		}).then(txt => {
			txt = (new DOMParser()).parseFromString(txt, 'text/html');
			let ret = txt.getElementsByClassName("uname_con")[0].title;
			resovle(ret);
		}).catch(err => {
			console.error('请求失败', err);
		})
	})
}

function getTextareaPosition(element) {
	// 如果元素是textarea，直接使用selectionStart获取位置
	if (element.tagName === 'TEXTAREA') {
			return element.selectionStart;
	}
	// 否则处理为contenteditable元素
	let cursorPos = 0;
	
	// 兼容旧版IE
	if (document.selection) {
			const selectRange = document.selection.createRange();
			const textRange = element.createTextRange();
			const preCaretRange = textRange.duplicate();
			
			preCaretRange.moveToBookmark(selectRange.getBookmark());
			preCaretRange.setEndPoint('EndToEnd', textRange);
			cursorPos = preCaretRange.text.length;
	} 
	// 现代浏览器
	else if (window.getSelection) {
			const selection = window.getSelection();
			
			if (selection.rangeCount > 0) {
					const range = selection.getRangeAt(0).cloneRange();
					range.selectNodeContents(element);
					range.setEnd(selection.rangeCount > 0 ? selection.getRangeAt(0).endContainer : element, 
											selection.rangeCount > 0 ? selection.getRangeAt(0).endOffset : 0);
					
					cursorPos = range.toString().length;
			}
	}
	
	return cursorPos;
}

	function showExRightPanel(name, triggerBtn, forceOpen) {
		let panels = [
			{ name: "弹幕发送小助手", className: "bloop" },
			{ name: "扩展功能", className: "extool" },
			{ name: "直播间工具", className: "livetool" },
			{ name: "全站抽奖信息", className: "exlottery" },
			{ name: "一键签到", className: "sign-panel" },
			{ name: "一键续牌", className: "fans-continue-panel" },
			{ name: "同屏播放", className: "popup-player-panel" },
			{ name: "版本更新", className: "exupdate-panel" }
		];

		let targetItem = panels.find(p => p.name === name);
		if (!targetItem) return;

		let targetDom = document.querySelector("." + targetItem.className);
		if (!targetDom) {
			if (targetItem.className === "sign-panel" && typeof createSignPanel === "function") createSignPanel();
			else if (targetItem.className === "fans-continue-panel" && typeof createFansContinuePanel === "function") createFansContinuePanel();
			else if (targetItem.className === "popup-player-panel" && typeof createPopupPlayerPanel === "function") createPopupPlayerPanel();
			else if (targetItem.className === "exupdate-panel" && typeof createExUpdatePanel === "function") createExUpdatePanel();
			targetDom = document.querySelector("." + targetItem.className);
		}

		if (targetDom) {
			let isShowing = targetDom.style.display === "flex" || targetDom.style.display === "block" || (window.getComputedStyle(targetDom).display !== "none" && targetDom.style.display !== "none");
			if (isShowing) {
				if (!forceOpen) {
					targetDom.style.removeProperty("display");
					targetDom.style.setProperty("display", "none", "important");
					targetDom.classList.remove("miuix-modal-in");
					if (typeof updateDockActiveIndicator === "function") updateDockActiveIndicator();
					return;
				}
				return;
			}
		}

	for (let i = 0; i < panels.length; i++) {
		let item = panels[i];
		let dom = document.querySelector("." + item.className);
		if (dom && item.name !== name) {
			dom.style.removeProperty("display");
			dom.style.setProperty("display", "none", "important");
			dom.classList.remove("miuix-modal-in");
		}
	}

	if (targetDom) {
		if (typeof ensureMiuixPanelHeader === "function") {
			ensureMiuixPanelHeader(targetDom, targetItem.name);
		}
		if (typeof openMiuixPanelCentered === "function") {
			openMiuixPanelCentered(targetDom, triggerBtn);
		} else {
			targetDom.style.removeProperty("display");
			targetDom.style.setProperty("display", "flex", "important");
		}
	}
}

function getTimeDiff(t1, t2) {
	if (t1 < t2) {
		return -1;
	} else{
		let ret = "";
		let date3 = Math.abs(t1 - t2);
		let days = Math.floor(date3/(24*3600*1000));
		ret += days > 0 ? days + "天" : "";
		let leave1 = date3%(24*3600*1000);
		let hours = Math.floor(leave1/(3600*1000));
		ret += hours > 0 ? hours + "时" : "";
		let leave2 = leave1%(3600*1000);
		let minutes = Math.floor(leave2/(60*1000));
		ret += minutes > 0 ? minutes + "分" : "";
		let leave3 = leave2%(60*1000);
		let seconds = Math.round(leave3/1000);
		ret += seconds > 0 ? seconds + "秒" : "";
		return ret;
	}
}

function debounce(func, wait) {
    let timer;
    return function() {
      let context = this;
      let args = arguments;
 
      if (timer) clearTimeout(timer);
 
      let callNow = !timer;
 
      timer = setTimeout(() => {
        timer = null;
      }, wait)
 
      if (callNow) func.apply(context, args);
    }
}

function exportJsonToExcel(header, body, fileName = 'download.xlsx') {
    let aoa = [];
    aoa.push(header, ...body);
    let sheet = XLSX.utils.aoa_to_sheet(aoa);
    openDownloadDialog(sheet2blob(sheet), fileName);
}
 
function openDownloadDialog(url, saveName)
{
	if(typeof url == 'object' && url instanceof Blob)
	{
		url = URL.createObjectURL(url); // 创建blob地址
	}
	var aLink = document.createElement('a');
	aLink.href = url;
	aLink.download = saveName || ''; // HTML5新增的属性，指定保存文件名，可以不要后缀，注意，file:///模式下不会生效
	var event;
	if(window.MouseEvent) event = new MouseEvent('click');
	else
	{
		event = document.createEvent('MouseEvents');
		event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
	}
	aLink.dispatchEvent(event);
	if (typeof url === "string" && url.indexOf("blob:") === 0) {
		setTimeout(function () {
			try {
				URL.revokeObjectURL(url);
			} catch (e) {}
		}, 1500);
	}
}
function sheet2blob(sheet, sheetName) {
	sheetName = sheetName || 'sheet1';
	var workbook = {
		SheetNames: [sheetName],
		Sheets: {}
	};
	workbook.Sheets[sheetName] = sheet;
	// 生成excel的配置项
	var wopts = {
		bookType: 'xlsx', // 要生成的文件类型
		bookSST: false, // 是否生成Shared String Table，官方解释是，如果开启生成速度会下降，但在低版本IOS设备上有更好的兼容性
		type: 'binary'
	};
	var wbout = XLSX.write(workbook, wopts);
	var blob = new Blob([s2ab(wbout)], {type:"application/octet-stream"});
	// 字符串转ArrayBuffer
	function s2ab(s) {
		var buf = new ArrayBuffer(s.length);
		var view = new Uint8Array(buf);
		for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
		return buf;
	}
	return blob;
}

function downloadFile(name, data) {
    var urlObject = unsafeWindow.URL || unsafeWindow.webkitURL || unsafeWindow;
    var export_blob = new Blob([data]);
    var save_link = document.createElementNS("http://www.w3.org/1999/xhtml", "a")
    save_link.href = urlObject.createObjectURL(export_blob);
    save_link.download = name;

	var ev = document.createEvent("MouseEvents");
    ev.initMouseEvent("click", true, false, unsafeWindow, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    save_link.dispatchEvent(ev);
	var blobHref = save_link.href;
	if (blobHref && blobHref.indexOf("blob:") === 0) {
		setTimeout(function () {
			try {
				URL.revokeObjectURL(blobHref);
			} catch (e) {}
		}, 1500);
	}
} 

function timeText2Ms(text) {
	let ret = 0;
	let arr = text.split(":");
	if (arr.length === 1) {
		ret = Number(arr[0]);
	} else if (arr.length === 2) {
		ret = Number(arr[0]) * 60 + Number(arr[1]);
	} else if (arr.length === 3) {
		ret = Number(arr[0]) * 3600 + Number(arr[1]) * 60 + Number(arr[2]);
	}
	return ret * 1000;
}

function resizeWindow() {
  const resizeEvent = new Event("resize");
  window.dispatchEvent(resizeEvent);
}

function isValidImageFile(filename) {
  const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".tiff", ".tif"];
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  return validExtensions.includes(ext);
}

function getCsrfToken() {
  return new Promise((resolve) => {
    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://www.douyu.com/japi/carnival/nc/common/generateCsrf',
      headers: {
        "Content-Type": "application/json",
        "Cookie": document.cookie,
      },
      anonymous: false,
      withCredentials: true,
      onload: function(response) {
        // 获取 Set-Cookie
        const setCookie = response.responseHeaders.match(/set-cookie:[^\n\r]+/gi);
				// 从set-cookie中获取csrfToken
				let csrfToken = "";
				for (const line of setCookie) {
					const match = line.match(/cvl_csrf_token=([^;]+)/);
					if (match) {
						csrfToken = match[1]; // 返回提取到的 token
						break;
					}
				}
				resolve(csrfToken);
      },
      onerror: function(err) {
        resolve("");
      }
    });
  });
}

function getValidDom(queryList) {
	for (const query of queryList) {
		let dom = null;
		if (typeof query === "string") {
			dom = document.querySelector(query);
		} else {
			dom = query;
		}
		if (dom) return dom;
	}
	return null;
}

function getValidDomList(queryList) {
	for (const query of queryList) {
		let dom = [];
		if (typeof query === "string") {
			dom = document.querySelectorAll(query);
		} else {
			dom = query;
		}
		if (dom.length > 0) return dom;
	}
	return [];
}