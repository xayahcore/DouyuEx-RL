function initPkg_ExpandTool() {
  // 逐步兜底（与 LiveTool_tryInit / main.js 的 initPkg_Safe 同一口径）：
  // 历史上任一步 DOM 缺失（页面少一个容器类名、面板被裁剪）都会抛错并中断后面的初始化，
  // 而外层 initPkg_Safe 只兜一次 —— 用户看到的是"扩展功能整块没了"，日志里只有一行。
  ExpandTool_tryInit("面板", initPkg_ExpandTool_Dom);
  ExpandTool_tryInit("交互", initPkg_ExpandTool_Func);
  ExpandTool_tryInit("模块", initPkg_ExpandTool_Module);
}

/** 单步隔离：失败报出模块名后继续，不影响同一批里的其它模块 */
function ExpandTool_tryInit(name, fn) {
  try {
    if (typeof fn === "function") fn();
    return true;
  } catch (e) {
    if (typeof ExGuard_warn === "function") {
      ExGuard_warn("扩展功能", name + " 初始化失败（其余模块照常）", e);
    } else {
      console.error("[DouyuEx] 扩展功能初始化失败：" + name + " —— " + ((e && e.message) || e));
    }
    return false;
  }
}

function initPkg_ExpandTool_Module() {
  // 逐个兜底：某个模块的开关元素缺失 / 结构变更只影响它自己，不连坐后面的模块
  const modules = [
    ["自动宝箱", initPkg_ExpandTool_Treasure],
    ["礼物红包", initPkg_ExpandTool_RedPacket_Room],
    ["自动钓鱼", initPkg_ExpandTool_AutoFish],
    ["清理背包", initPkg_ExpandTool_ClearBag],
    ["打榜送礼", initPkg_ExpandTool_SendGift],
    ["Tab 切换", initPkg_ExpandTool_TabSwitch],
    ["P2P", initPkg_ExpandTool_P2P],
    ["网页全屏", initPkg_ExpandTool_FullScreen],
    ["弹幕颜色", initPkg_ExpandTool_AutoBarrageColor],
    ["弹幕屏蔽", initPkg_ExpandTool_Shield],
    // 「在线弹幕助手」跳转：胶囊条图标已撤下且不恢复，能力搬到本面板最后一卡（#extool__monitor_open）。
    // 与其它模块一样直接引用函数名 —— 函数声明就在同一文件里，逐项兜底仍由 ExpandTool_tryInit 负责。
    ["在线弹幕助手", initPkg_ExpandTool_MonitorLink]
  ];
  for (let i = 0; i < modules.length; i++) {
    ExpandTool_tryInit(modules[i][0], modules[i][1]);
  }
}

function initPkg_ExpandTool_Dom() {
  ExpandTool_insertModal();
  ExpandTool_insertIcon();
}

function ExpandTool_insertModal() {
  let existing = document.querySelector(".extool");
  if (existing) return;

  let a = document.createElement("div");
  a.className = "extool miuix-modal";
  a.innerHTML = `
    <div class="miuix-modal__body">
      <!-- 卡片 1: 播放与性能 -->
      <div class="fans-panel__card">
        <div class="fans-panel__card-header">
          <span class="fans-panel__card-title">播放与性能</span>
          <span style="font-size: 11px; color: #0066ff; font-weight: 600;">极速秒开</span>
        </div>
        <div class="sign-options-list">
          <label class="sign-option-item" title="自动锁定最高原画画质，开播无缝秒开">
            <div class="sign-option-text">
              <span class="sign-option-title">自动最高画质</span>
              <span class="sign-option-desc">源头锁定原画秒开，杜绝二次切流卡顿</span>
            </div>
            <input id="extool__highestvideoquality" class="sign-checkbox" type="checkbox">
          </label>
          <label class="sign-option-item" title="自动展开网页全屏观播">
            <div class="sign-option-text">
              <span class="sign-option-title">自动网页全屏</span>
              <span class="sign-option-desc">进入直播间自动铺满网页全屏</span>
            </div>
            <input id="extool__fullscreen" class="sign-checkbox" type="checkbox">
          </label>
          <label class="sign-option-item" title="阻断 WebRTC P2P 后台上传带宽占用">
            <div class="sign-option-text">
              <span class="sign-option-title">阻止P2P上传</span>
              <span class="sign-option-desc">阻止后台偷跑上行带宽，显著降低延迟</span>
            </div>
            <input id="extool__p2p" class="sign-checkbox" type="checkbox">
          </label>
          <label class="sign-option-item" title="后台播放保活，阻止浏览器页签睡眠冻结">
            <div class="sign-option-text">
              <span class="sign-option-title">防页签冻结</span>
              <span class="sign-option-desc">阻止浏览器休眠后台挂机页签</span>
            </div>
            <input id="extool__tabSwitch" class="sign-checkbox" type="checkbox">
          </label>
          <label class="sign-option-item" title="进房后自动选择已解锁的最高档粉丝弹幕颜色">
            <div class="sign-option-text">
              <span class="sign-option-title">自动最高弹幕色</span>
              <span class="sign-option-desc">自动匹配当前佩戴粉丝牌最高弹幕色</span>
            </div>
            <input id="extool__autobarragecolor" class="sign-checkbox" type="checkbox">
          </label>
        </div>
      </div>

      <!-- 卡片 1.5: 弹幕屏蔽 -->
      <div class="fans-panel__card">
        <div class="fans-panel__card-header">
          <span class="fans-panel__card-title">弹幕屏蔽</span>
          <span style="font-size: 11px; color: #64748b;">发言框上方那行「XXX 来了」也在这里关</span>
        </div>
        <div class="sign-options-list">
          <label class="sign-option-item" title="隐藏发言框上方那行「XXX 来了」进场提示">
            <div class="sign-option-text">
              <span class="sign-option-title">屏蔽进场弹幕</span>
              <span class="sign-option-desc">发言框上方的「XXX 来了」不再显示</span>
            </div>
            <input id="extool__removeEnter" class="sign-checkbox" type="checkbox">
          </label>
          <div class="sign-option-item" style="flex-direction: column; align-items: stretch; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="sign-option-text">
                <span class="sign-option-title">屏蔽重复弹幕</span>
                <span class="sign-option-desc">同一条弹幕只留一条，并标出重复次数</span>
              </div>
              <input id="extool__removeRepeated" class="sign-checkbox" type="checkbox">
            </div>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #64748b;">
              <span>窗口：</span>
              <input id="extool__repeatedSeconds" type="number" min="1" max="300" style="width: 65px; height: 26px; text-align: center;" value="5" />
              <span>秒（1-300）</span>
              <label style="display:inline-flex;align-items:center;gap:4px;margin-left:6px;">
                <input id="extool__enlargeDanmaku" type="checkbox" /> 放大重复弹幕
              </label>
            </div>
          </div>
          <label class="sign-option-item" title="去掉弹幕黑底与描边背景">
            <div class="sign-option-text">
              <span class="sign-option-title">屏蔽弹幕背景</span>
              <span class="sign-option-desc">去掉弹幕黑底与描边，画面更干净</span>
            </div>
            <input id="extool__removeDanmakuBg" class="sign-checkbox" type="checkbox">
          </label>
        </div>
      </div>

      <!-- 卡片 2: 挂机与福利 -->
      <div class="fans-panel__card">
        <div class="fans-panel__card-header">
          <span class="fans-panel__card-title">挂机与福利</span>
          <span style="font-size: 11px; color: #64748b;">自动化活动</span>
        </div>
        <div class="sign-options-list">
          <div class="sign-option-item" style="flex-direction: column; align-items: stretch; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="sign-option-text">
                <span class="sign-option-title">自动钓鱼</span>
                <span class="sign-option-desc">自动抛竿收杆，智能避免风控重入</span>
              </div>
              <input id="extool__autofish_start" class="sign-checkbox" type="checkbox">
            </div>
            <div class="miuix-seg">
              <label class="miuix-seg__item"><input name="autofish_mode" type="radio" value="all" checked><span class="miuix-seg__label">全天挂机</span></label>
              <label class="miuix-seg__item"><input name="autofish_mode" type="radio" value="contest"><span class="miuix-seg__label">仅钓鱼大赛</span></label>
            </div>
          </div>

          <div class="sign-option-item" style="flex-direction: column; align-items: stretch; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="sign-option-text">
                <span class="sign-option-title">半自动抢宝箱</span>
                <span class="sign-option-desc">遇验证码自动弹出，手动完成后领取</span>
              </div>
              <input id="extool__treasure_start" class="sign-checkbox" type="checkbox">
            </div>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #64748b;">
              <span>延迟补偿：</span>
              <input id="extool__treasure_delay" type="number" style="width: 65px; height: 26px; text-align: center;" value="3200" />
              <span>ms</span>
            </div>
          </div>

          <label class="sign-option-item">
            <div class="sign-option-text">
              <span class="sign-option-title">自动抢礼物红包</span>
              <span class="sign-option-desc">实时监听房间红包广播并自动领取</span>
            </div>
            <input id="extool__redpacekt_room_start" class="sign-checkbox" type="checkbox">
          </label>
        </div>
      </div>

      <!-- 卡片 3: 送礼与背包 -->
      <div class="fans-panel__card">
        <div class="fans-panel__card-header">
          <span class="fans-panel__card-title">送礼与背包</span>
          <span style="font-size: 11px; color: #64748b;">点击图标更换</span>
        </div>
        <div class="sign-options-list">
          <!-- 背包送礼 -->
          <div class="sign-option-item" style="flex-direction: column; align-items: stretch; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="sign-option-title">背包道具赠送</span>
              <span style="font-size: 10.5px; color: #64748b;">支持道具一键拉取</span>
            </div>
            <div class="miuix-gift-row">
              <div class="miuix-gift-badge" id="extool__clearbag_badge" title="点击选择背包道具">
                <input type="hidden" id="extool__clearbag_id" value="268" />
                <img class="miuix-gift-badge__icon" id="extool__clearbag_icon" src="https://gfs-op.douyucdn.cn/dygift/1806/08/01/2fa7f551b9e54d310cae7992cb59ff0b.png" alt="荧光棒" />
                <span class="miuix-gift-badge__name" id="extool__clearbag_name">荧光棒</span>
                <span class="miuix-gift-badge__arrow">›</span>
              </div>
              <div class="miuix-gift-action-wrap">
                <span style="font-size: 11.5px; color: #475569;">数量:</span>
                <input id="extool__clearbag_cnt" type="number" min="1" style="width: 44px; text-align: center;" value="1" />
                <button type="button" class="ex-send-btn" id="extool__clearbag_sendbtn">送出</button>
              </div>
            </div>
          </div>

          <!-- 打榜送礼 -->
          <div class="sign-option-item" style="flex-direction: column; align-items: stretch; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="sign-option-title">打榜批量送礼</span>
              <span style="font-size: 10.5px; color: #64748b;">全站大盘礼物池</span>
            </div>
            <div class="miuix-gift-row">
              <div class="miuix-gift-badge" id="extool__sendgift_badge" title="点击选择打榜礼物">
                <input type="hidden" id="extool__sendgift_id" value="20000" />
                <img class="miuix-gift-badge__icon" id="extool__sendgift_icon" src="https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif" alt="弱鸡" />
                <span class="miuix-gift-badge__name" id="extool__sendgift_name">弱鸡</span>
                <span class="miuix-gift-badge__arrow">›</span>
              </div>
              <div class="miuix-gift-action-wrap">
                <span style="font-size: 11.5px; color: #475569;">数量:</span>
                <input id="extool__sendgift_cnt" type="number" min="1" style="width: 38px; text-align: center;" value="1" />
                <span style="font-size: 11.5px; color: #475569;">间隔:</span>
                <input id="extool__sendgift_delay" type="number" min="0" style="width: 38px; text-align: center;" value="0" title="间隔毫秒数" />
                <button type="button" class="ex-send-btn" id="extool__sendgift_btn">送出</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 卡片 4: 在线工具（第三方站点）
           胶囊条上的「在线弹幕助手」图标已按用户决定撤下且不恢复（见 src/packages/Monitor/Monitor.js），
           "打开第三方数据站"这个能力搬到这里：用户主动点按钮才跳，不再让一个可能打不开的站点常驻在胶囊条上 -->
      <div class="fans-panel__card" id="extool__monitor_card">
        <div class="fans-panel__card-header">
          <span class="fans-panel__card-title">在线工具</span>
          <span style="font-size: 11px; color: #64748b;">第三方站点</span>
        </div>
        <div class="sign-options-list">
          <div class="sign-option-item">
            <div class="sign-option-text">
              <span class="sign-option-title">在线弹幕助手</span>
              <span style="font-size: 10.5px; color: #64748b; line-height: 1.35;">在单独网页查看本房间的弹幕数据（第三方数据站 douyuex.com）</span>
            </div>
            <button type="button" class="ex-picker-btn" id="extool__monitor_open" title="在新标签页打开在线弹幕助手">打开</button>
          </div>
        </div>
      </div>
    </div>
  `;

  let b = document.getElementsByClassName("layout-Player-chat")[0] || document.querySelector(".Barrage-main") || document.body;
  if (b) b.insertBefore(a, b.childNodes[0]);
  if (typeof ensureMiuixPanelHeader === "function") {
    ensureMiuixPanelHeader(a, "扩展功能");
  }
}

function ExpandTool_insertIcon() {
  let a = document.createElement("div");
  a.className = "extool-icon";
  a.innerHTML =
    '<a class="ex-panel__icon" title="扩展功能"><svg t="1590294700144" style="display:block;" class="icon" viewBox="0 0 1077 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="11915" width="30" height="30"><path d="M152.770257 11.469971l213.048618 206.378138-37.094375 36.931681 159.440737 158.545917-76.95456 73.782015-159.440737-158.545917-38.47728 36.931681L0.244042 159.115348 152.770257 11.469971z" p-id="11916" fill="#d81e06"></path><path d="M1077.851922 217.848109h-105.751509L929.393073 260.311408l-31.644106 31.400063-33.02701 32.538926L776.866857 300.985065l-23.428026-87.204321 33.027009-32.538926 33.02701-32.538926L862.281538 105.751509V0.569431h-8.134732a244.041945 244.041945 0 0 0-178.964092 68.331745 234.768351 234.768351 0 0 0-68.738481 147.645376 250.712425 250.712425 0 0 0 10.981887 95.664443v2.765808a34.165872 34.165872 0 0 1-9.598983 36.931681c-17.896409 16.269463-525.096918 497.520178-525.096918 497.520178-42.625993 35.548777-38.47728 102.497617 0 142.113759 39.860184 38.233238 105.751509 40.673657 142.927233 0 0 0 478.322212-504.353352 498.984429-524.852875A33.677788 33.677788 0 0 1 754.821735 455.544963c5.531617 1.382904 10.981888 4.067366 16.269463 5.450271a242.170956 242.170956 0 0 0 87.936447 9.598983 237.290118 237.290118 0 0 0 148.45885-68.331745 231.677153 231.677153 0 0 0 68.738481-177.662536 14.805211 14.805211 0 0 0 1.626946-6.751827zM178.964093 943.628853a33.352399 33.352399 0 0 1-48.076263 0 32.538926 32.538926 0 0 1 0-47.832221 33.352399 33.352399 0 0 1 48.076263 0 35.467429 35.467429 0 0 1 0 47.832221z" p-id="11917" fill="#d81e06"></path><path d="M981.618049 785.082936L747.988561 567.804258S617.344773 601.97013 526.642517 753.682873c5.531617 1.382904 241.926915 239.161106 241.926914 239.161105a109.98157 109.98157 0 0 0 152.607563 0l60.441055-58.732761a102.823006 102.823006 0 0 0 0-149.028281zM854.146806 951.763584a29.366381 29.366381 0 0 1-38.477279 0l-195.233556-189.94598-1.382905-1.382904a25.543057 25.543057 0 0 1 1.382905-35.548777 29.366381 29.366381 0 0 1 38.47728 0l196.535113 189.94598A28.796949 28.796949 0 0 1 854.146806 951.763584z m86.634891-83.380997a29.366381 29.366381 0 0 1-38.47728 0L705.362568 678.436606l-1.382905-1.382904a25.543057 25.543057 0 0 1 1.382905-35.548777 29.366381 29.366381 0 0 1 38.477279 0l196.535113 189.945981a24.404194 24.404194 0 0 1 0 37.013028z" p-id="11918" fill="#d81e06"></path></svg><i id="extool__tip" class="ex-panel__tip"></i></a>';

  let b = document.getElementsByClassName("ex-panel__wrap")[0];
  if (b) b.insertBefore(a, b.childNodes[0]);
}

function initPkg_ExpandTool_Func() {
  let icon = document.getElementsByClassName("extool-icon")[0];
  if (icon) {
    icon.addEventListener("click", function () {
      showExRightPanel("扩展功能", this);
    });
  }
}

/* ==================== 在线弹幕助手（第三方数据站） ====================
 * 口径变更（2026-10-27，用户明确决定）：胶囊条上的 .ex-monitor 图标撤下且**不恢复**，
 * 见 src/packages/Monitor/Monitor.js 的 MONITOR_ENTRY_ENABLED = false。
 * "打开在线弹幕助手"这个能力本身没删，搬进本面板最后一张卡片 —— 由用户主动点按钮才跳，
 * 不再让一个可用性不由我们掌握的第三方站点常驻在胶囊条上。
 *
 * 本函数只负责"绑定 + 跳转"，不对 douyuex.com 的可用性做任何判断：
 * 站点由第三方维护，打不打得开不在本插件的控制范围内。
 */
function initPkg_ExpandTool_MonitorLink() {
  const btn = document.getElementById("extool__monitor_open");
  // 面板没插进来（站点结构变更 / 被裁剪 / 别的脚本抢先清空）就没有可绑的按钮：
  // 留一条自证信息后安全返回，绝不抛错去连坐后面（或前面）的模块。
  if (!btn) {
    if (typeof ExGuard_warn === "function") {
      ExGuard_warn("扩展功能", "未找到在线弹幕助手按钮（#extool__monitor_open），本次不绑定");
    }
    return false;
  }
  // 幂等：面板节点可能被反复初始化（ExPanel 重绘 / 手动重跑 initPkg），
  // 而 insertModal 的"已存在就 return"只护住面板、护不住这里的事件绑定，
  // 绑定两次的结果就是一次点击开两个标签页。
  if (btn.getAttribute("data-extool-monitor-bound") === "1") return true;
  btn.setAttribute("data-extool-monitor-bound", "1");

  btn.addEventListener("click", function (e) {
    // 卡片与条目本身带点击/悬停语义，先把冒泡掐掉，避免顺带触发外层节点
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();

    const roomId = ExpandTool_monitorRoomId();
    if (!roomId) {
      // 非直播间页面 / 限流页 / 真实房间号还没纠偏出来：不拼半截地址给用户
      ExpandTool_monitorHint("没拿到有效的房间号，暂时打不开在线弹幕助手", "warning", "rid 为空或不合法，在线弹幕助手无法拼出地址");
      return;
    }
    if (typeof openPage !== "function") {
      ExpandTool_monitorHint("当前环境不支持打开新标签页，在线弹幕助手打不开", "error", "openPage 不可用，在线弹幕助手打不开");
      return;
    }
    try {
      openPage("https://www.douyuex.com/" + roomId);
    } catch (err) {
      // 权限被拒 / 隐私模式拦弹窗只提示，不把异常甩给点击事件（否则面板交互会断在半路）
      ExpandTool_monitorHint("打开在线弹幕助手失败，可稍后重试", "error", "打开在线弹幕助手失败", err);
    }
  });
  return true;
}

/**
 * 当前房间号（统一出口）：rid 由 common.js 在生命周期节点上反复纠偏，
 * 非直播间页面或限流页可能还是空串，取不到就返回空串交给调用方提示，不抛错。
 */
function ExpandTool_monitorRoomId() {
  if (typeof rid === "undefined" || rid === null || rid === undefined) return "";
  const text = String(rid).trim();
  // 房间号只会是数字；带空白/斜杠/问号的脏值直接当"没拿到"，免得拼出一个错地址
  if (!/^[0-9]+$/.test(text)) return "";
  return text;
}

/** 提示出口：优先用户可见的 showMessage，环境里没有就退到 ExGuard_warn，两者都没有则静默 */
function ExpandTool_monitorHint(message, type, warnText, err) {
  if (typeof showMessage === "function") {
    try {
      showMessage(message, type || "info");
      return;
    } catch (e) {}
  }
  if (typeof ExGuard_warn === "function") {
    ExGuard_warn("扩展功能", warnText || message, err);
  }
}
