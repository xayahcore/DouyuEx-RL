function initPkg_LiveTool() {
	// 逐步兜底：UI 插桩与「弹幕派发注册」是两件事，不能连坐。
	// 历史上任何一步 DOM 缺失（页面少一个容器类名）都会抛错并中断后面的初始化，
	// 于是 initPkg_LiveTool_HandleFunc 根本没执行 —— 玩家看到的就是「回执 / 投票 / 谢礼物全没了」。
	LiveTool_tryInit("Dom", initPkg_LiveTool_Dom);
	LiveTool_tryInit("Module", initPkg_LiveTool_Module);
	LiveTool_tryInit("Func", initPkg_LiveTool_Func);
	LiveTool_tryInit("DrawerChevron", initPkg_LiveTool_DrawerChevron);
	LiveTool_tryInit("HandleFunc", initPkg_LiveTool_HandleFunc);
}

function LiveTool_tryInit(name, fn) {
	try {
		if (typeof fn === "function") fn();
	} catch (e) {
		console.error("[DouyuEx] 直播间工具初始化失败：" + name + " —— " + ((e && e.message) || e));
	}
}

/**
 * 抽屉折叠指示器同步。
 * 五个抽屉的展开互斥（打开一个会自动收起其它四个），若各自维护箭头状态必然不同步，
 * 因此统一由各抽屉面板的真实 display 状态驱动，用一条委托监听覆盖全部抽屉。
 */
const LiveTool_DRAWER_PAIRS = [
	["enter", "enter__panel"],
	["mute", "mute__panel"],
	["gift", "gift__panel"],
	["reply", "reply__panel"],
	["vote", "vote__panel"]
];

/**
 * 收起除 exceptPanelClass 之外的抽屉面板。
 *
 * 五个标题的点击回调原本各自抄了一份「把另外四个面板设成 none」的裸解引用块
 * （document.getElementsByClassName("xxx__panel")[0].style…），页面里只要少一个面板类名，
 * 整段就抛 TypeError。这里统一按 LiveTool_DRAWER_PAIRS 走一遍：节点不在只是「没渲染」，
 * 跳过即可，不需要也不应该丢异常。
 */
function LiveTool_hideDrawerPanelsExcept(exceptPanelClass) {
	for (let i = 0; i < LiveTool_DRAWER_PAIRS.length; i++) {
		let panelClass = LiveTool_DRAWER_PAIRS[i][1];
		if (panelClass === exceptPanelClass) continue;
		let panel = document.getElementsByClassName(panelClass)[0];
		if (panel) panel.style.display = "none";
	}
}

function LiveTool_syncDrawerChevrons() {
	LiveTool_DRAWER_PAIRS.forEach(function (pair) {
		let title = document.getElementById(pair[0] + "__title");
		if (!title || !title.parentElement) return;
		let panel = document.getElementsByClassName(pair[1])[0];
		let isOpen = !!(panel && panel.style.display === "block");
		title.parentElement.classList.toggle("is-open", isOpen);
	});
}

function initPkg_LiveTool_DrawerChevron() {
	let root = document.querySelector(".livetool");
	if (!root || root.dataset.chevronBound) return;
	root.dataset.chevronBound = "1";
	root.addEventListener("click", function (e) {
		let t = e.target;
		if (!(t instanceof Element)) return;
		if (!t.closest(".livetool__cell_title")) return;
		// 等各抽屉自身的显隐逻辑执行完再读取面板真实状态
		setTimeout(LiveTool_syncDrawerChevrons, 0);
	});
}

function initPkg_LiveTool_Dom() {
	LiveTool_insertModal();
	LiveTool_insertIcon();
}

function initPkg_LiveTool_Module() {
	// 添加模块（逐个兜底：某个模块的容器缺失 / 结构变更只影响它自己，不连坐后面的模块）
	// initPkg_LiveTool_Bojiang_Handle();
	let modules = [
		["Vote", initPkg_LiveTool_Vote],
		["Enter", initPkg_LiveTool_Enter],
		["Mute", initPkg_LiveTool_Mute],
		["Gift", initPkg_LiveTool_Gift],
		["Reply", initPkg_LiveTool_Reply],
		["Treasure", initPkg_LiveTool_Treasure],
		["BarrageSpeed", initPkg_LiveTool_BarrageSpeed],
		["RankList", initPkg_LiveTool_RankList],
		["BarrageSendCheck", initPkg_LiveTool_BarrageSendCheck]
	];
	for (let i = 0; i < modules.length; i++) {
		LiveTool_tryInit(modules[i][0], modules[i][1]);
	}
}
function LiveTool_insertModal() {
  let existing = document.querySelector(".livetool");
  if (existing) return;

  let a = document.createElement("div");
  a.className = "livetool miuix-modal";

  let b = document.getElementsByClassName("layout-Player-chat")[0] || document.querySelector(".Barrage-main") || document.body;
  if (b) b.insertBefore(a, b.childNodes[0]);
  if (typeof ensureMiuixPanelHeader === "function") {
    ensureMiuixPanelHeader(a, "直播间工具");
  }
}
function LiveTool_insertIcon() {
let a = document.createElement("div");
a.className = "livetool-icon";
a.innerHTML = '<a class="ex-panel__icon" title="直播间工具"><svg t="1590294900594" style="display:block;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="20028" width="36" height="36"><path d="M352.2 245.3c-5.1 0-10.2-2-14.1-5.9L196.6 98c-7.8-7.8-7.8-20.5 0-28.3s20.5-7.8 28.3 0l141.4 141.4c7.8 7.8 7.8 20.5 0 28.3-3.9 3.9-9 5.9-14.1 5.9zM477.1 245.3c-5.1 0-10.2-2-14.1-5.9-7.8-7.8-7.8-20.5 0-28.3L604.3 69.7c7.8-7.8 20.5-7.8 28.3 0 7.8 7.8 7.8 20.5 0 28.3L491.2 239.4c-3.9 3.9-9 5.9-14.1 5.9z" fill="#0C2B4A" p-id="20029"></path><path d="M703.9 194.8H124.2c-33 0-60 27-60 60v453c0 33 27 60 60 60h418c1.7-122.5 99.6-221.8 221.7-225.5V254.8c0-33-27-60-60-60zM533.4 522.9L356.3 625.2c-24 13.9-54-3.5-54-31.2V389.5c0-27.7 30-45 54-31.2l177.1 102.2c24 13.9 24 48.6 0 62.4zM815.2 776.4c0 21.9-17.8 39.7-39.7 39.7-21.9 0-39.7-17.8-39.7-39.7 0-21.9 17.8-39.7 39.7-39.7 21.9 0 39.7 17.8 39.7 39.7z" fill="#0C2B4A" p-id="20030"></path><path d="M775.5 591C673.6 591 591 673.6 591 775.5S673.6 960 775.5 960 960 877.4 960 775.5 877.4 591 775.5 591zM879 819l-15.6 27c-2.1 3.6-6.8 4.9-10.4 2.8l-15.5-8.9c-2.7-1.6-6.1-1.3-8.5 0.6-7.5 5.9-15.9 10.6-25.1 13.8-3 1.1-5.1 4-5.1 7.2v18.7c0 4.2-3.4 7.6-7.6 7.6H760c-4.2 0-7.6-3.4-7.6-7.6v-18.5c0-3.3-2.1-6.2-5.1-7.2-9.3-3.2-17.9-7.8-25.5-13.7-2.4-1.9-5.8-2.2-8.5-0.6l-15.2 8.8c-3.6 2.1-8.3 0.9-10.4-2.8l-15.6-27c-2.1-3.6-0.8-8.3 2.8-10.4l12.2-7.1c3-1.7 4.5-5.2 3.7-8.5-1.7-6.8-2.6-13.8-2.6-21.1 0-4.1 0.3-8.2 0.9-12.2 0.4-3.1-1-6.1-3.7-7.7l-10.5-6.1c-3.6-2.1-4.9-6.8-2.8-10.4l15.6-27c2.1-3.6 6.8-4.9 10.4-2.8l7.8 4.5c2.9 1.7 6.6 1.3 9-1.1 9.1-8.7 20-15.5 32.2-19.7 3.1-1 5.1-4 5.1-7.2v-7.9c0-4.2 3.4-7.6 7.6-7.6H791c4.2 0 7.6 3.4 7.6 7.6v8.1c0 3.2 2 6.1 5.1 7.2 12.1 4.2 22.9 10.9 31.9 19.6 2.4 2.4 6.1 2.8 9.1 1.1l8.2-4.7c3.6-2.1 8.3-0.8 10.4 2.8l15.6 27c2.1 3.6 0.9 8.3-2.8 10.4l-11 6.3c-2.7 1.6-4.1 4.6-3.7 7.7 0.6 3.9 0.8 8 0.8 12.1 0 7.2-0.9 14.1-2.5 20.8-0.8 3.3 0.7 6.7 3.6 8.3l12.8 7.4c3.7 2.1 5 6.8 2.9 10.4z" fill="#0C2B4A" p-id="20031"></path></svg><i id="LiveTool__tip" class="ex-panel__tip"></i></a>';

// 容器缺失时静默跳过：这里抛错会让后面的 initPkg_LiveTool_HandleFunc 一并跳过（弹幕派发注册全丢）
let b = document.getElementsByClassName("ex-panel__wrap")[0];
if (b) {
	b.insertBefore(a, b.childNodes[0]);
} else {
	ExGuard_warn("直播间工具", "未找到 .ex-panel__wrap 容器，图标未插入（面板入口不显示）");
}

}

function initPkg_LiveTool_Func() {
let icon = document.getElementsByClassName("livetool-icon")[0];
if (!icon) return;
icon.addEventListener("click", function() {
	showExRightPanel("直播间工具", this);
});
}

function initPkg_LiveTool_HandleFunc() {
	// 开启ws，并且设置处理函数的入口
	// 是否生效由每个处理函数决定，可以设置一个变量保存开启状态，判断是否要执行
	let ws = new Ex_WebSocket_UnLogin(rid, (ret) => {
		// 派发链逐项隔离：任何单个处理器抛错都不再影响排在后面的人（回执 / 投票 / 谢礼物…）
		LiveTool_dispatchBarrage(ret);
	});
}

/**
 * 弹幕处理器派发表（顺序即真实执行顺序，名字只用于日志定位）。
 *
 * 在派发时现取，而不是写成顶层常量数组：处理器都是同作用域的函数声明，
 * 现取既没有「顶层常量先于函数声明求值」的时序问题，也方便单测按名替换。
 */
function LiveTool_barrageHandlers() {
	return [
		["开播提醒", initPkg_LiveTool_LiveNotice_Handle],
		["关键词禁言", initPkg_LiveTool_Mute_Handle],
		["关键词回复", initPkg_LiveTool_Reply_Handle],
		["自动谢礼物", initPkg_LiveTool_Gift_Handle],
		["自动抢宝箱", initPkg_LiveTool_Treasure_Handle],
		["自动欢迎", initPkg_LiveTool_Enter_Handle],
		["投票", initPkg_LiveTool_Vote_Handle],
		["弹幕时速", initPkg_LiveTool_BarrageSpeed_Handle],
		["排行榜", initPkg_LiveTool_RankList_Handle],
		["弹幕回执", initPkg_LiveTool_BarrageSendCheck_Handle]
	];
}

function LiveTool_reportHandlerError(name, err) {
	let e = err || {};
	console.error("[DouyuEx] 弹幕处理器异常：" + name + " —— " + (e.message || e));
}

/**
 * 弹幕派发：逐个处理器隔离执行。
 *
 * 历史问题（P0-2）：处理器是按顺序裸调的，关键词回复里 `regObj.exec(txt).length`
 * 在正则不命中时拿到 null 并抛 TypeError，同一个回调里排在后面的弹幕回执、
 * 投票、谢礼物…全部不会再执行 —— 一条弹幕就能打崩整条链。
 * 现在每个处理器各自 try/catch，async 处理器的 reject 也兜住，只记日志、不中断后续。
 *
 * 返回本次出错的处理器名字数组（给测试和线上自证用，正常为空数组）。
 */
function LiveTool_dispatchBarrage(ret) {
	let handlers = LiveTool_barrageHandlers();
	let failed = [];
	for (let i = 0; i < handlers.length; i++) {
		let name = handlers[i][0];
		let fn = handlers[i][1];
		if (typeof fn !== "function") continue;
		try {
			let out = fn(ret);
			if (out && typeof out.then === "function") {
				out.catch(function (err) {
					LiveTool_reportHandlerError(name + "（async）", err);
				});
			}
		} catch (err) {
			failed.push(name);
			LiveTool_reportHandlerError(name, err);
		}
	}
	return failed;
}

/**
 * 关键词规则解析（关键词回复 / 关键词禁言共用）。
 *
 * 面板写法（placeholder 已按此对齐）：
 *   普通词            —— 弹幕文本包含该子串即命中；
 *   re(正则)=期望匹配 —— 用「正则」匹配弹幕，且正则的首个匹配必须与「期望匹配」完全相等才算命中。
 *   例：re(^\d+$)=666 表示弹幕正好是 666；只写 re(正则) 不写「=期望匹配」的规则视为无效（不命中）。
 */
function LiveTool_parseKeywordRule(key) {
	let text = String(key == null ? "" : key);
	let open = text.indexOf("re(");
	if (open === -1) {
		return { kind: "literal", word: text };
	}
	let close = text.indexOf(")=", open + 3);
	if (close === -1) {
		return { kind: "invalid", source: text, reason: "缺少 )=期望匹配" };
	}
	return {
		kind: "regex",
		source: text.slice(open + 3, close),
		expect: text.slice(close + 2)
	};
}

/**
 * 判断一条弹幕是否命中某条关键词规则。
 * 任何异常（正则写错、exec 不命中返回 null）都只算「不命中」，绝不向外抛。
 */
function LiveTool_keywordRuleHit(key, txt) {
	let rule = LiveTool_parseKeywordRule(key);
	if (rule.kind === "literal") {
		if (rule.word === "") return false;
		return String(txt).indexOf(rule.word) !== -1;
	}
	if (rule.kind === "regex") {
		let regObj;
		try {
			regObj = new RegExp(rule.source, "g");
		} catch (e) {
			console.warn("[DouyuEx] 无效的正则关键词规则（已跳过）：" + key + " —— " + ((e && e.message) || e));
			return false;
		}
		// 正则不命中时 exec 返回 null —— 必须先判空，再取 result[0]
		let result = regObj.exec(String(txt));
		return !!(result && result[0] === rule.expect);
	}
	return false;
}

function getType(str) {
	return getStrMiddle(str, "type@=", "/");
}

function selectOptionByValue(selectId, checkValue) {
// 根据value值选择option 
	let select = document.getElementById(selectId);  
	for(let i=0; i<select.options.length; i++){  
			if(select.options[i].value == checkValue){  
					select.options[i].selected = true;  
					break;
			}  
	}  
}