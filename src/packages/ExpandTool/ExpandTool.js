function initPkg_ExpandTool() {
  initPkg_ExpandTool_Dom();
  initPkg_ExpandTool_Func();
  initPkg_ExpandTool_Module();
}

function initPkg_ExpandTool_Module() {
  initPkg_ExpandTool_Treasure();
  initPkg_ExpandTool_RedPacket_Room();
  initPkg_ExpandTool_AutoFish();
  initPkg_ExpandTool_ClearBag();
  initPkg_ExpandTool_SendGift();
  initPkg_ExpandTool_TabSwitch();
  initPkg_ExpandTool_P2P();
  initPkg_ExpandTool_FullScreen();
  initPkg_ExpandTool_AutoBarrageColor();
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
            <div class="autofish__modes" style="display: flex; gap: 14px; font-size: 11.5px; padding-left: 2px;">
              <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;"><input name="autofish_mode" type="radio" value="all" checked> 全天挂机</label>
              <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;"><input name="autofish_mode" type="radio" value="contest"> 仅钓鱼大赛</label>
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
