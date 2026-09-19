function* (__imports) {
yield {"bn": { get: () => bn, set: value => { bn = value; } },
"fn": { get: () => fn, set: value => { fn = value; } },
"gn": { get: () => gn, set: value => { gn = value; } },
"hn": { get: () => hn, set: value => { hn = value; } },
"mn": { get: () => mn, set: value => { mn = value; } },
"un": { get: () => un, set: value => { un = value; } },
"yn": { get: () => yn, set: value => { yn = value; } }};
/**
 * 页面全域广告、商业死重类名拦截与清爽弹幕净化样式库
 */
let mn = 0; // 弹幕精简化状态: 0 = 完整, 1 = 纯文本精简
let gn = 0; // 页面布局清爽开关状态

/**
 * 激活纯净弹幕前缀与图标剥离样式 (导出兼容 un)
 */
function applyCleanBarrageStyle() {
  (0, __imports.tl)(
    "Ex_Style_RefreshBarrage",
    `
      .UserCsgoGameDataMedal, .Barrage-honor, .Barrage-listItem .Barrage-icon,
      .Barrage-listItem .FansMedal.is-made, .Barrage-listItem .RoomLevel,
      .Barrage-listItem .Motor, .Barrage-listItem .ChatAchievement,
      .Barrage-listItem .Barrage-hiIcon, .Barrage-listItem .Medal,
      .Barrage-listItem .MatchSystemTeamMedal, .Barrage-listItem .Baby,
      .FansMedalWrap {
        display: none !important;
      }
    `
  );

  mn = 1;
  const btn = document.getElementById("refresh-barrage");
  if (btn) btn.classList.add("ex-active");

  const text = document.getElementById("refresh-barrage__text");
  if (text) {
    text.style.color = "#fff";
    text.innerText = "前缀";
  }

  const svgPath = document.getElementById("refresh-barrage__svg")?.getElementsByTagName("path")[0];
  if (svgPath) svgPath.setAttribute("fill", "#ffffff");
}
const un = applyCleanBarrageStyle;

/**
 * 更新清爽模式开关滑块视觉状态 (导出兼容 hn)
 * @param {boolean} isChecked
 */
function updateRefreshSwitchState(isChecked) {
  const switchBox = document.getElementById("ex-refresh-switch");
  const switchCircle = document.getElementById("ex-refresh-switch-circle");
  if (switchBox && switchCircle) {
    if (isChecked) {
      switchBox.style.background = "#f60";
      switchCircle.style.left = "14px";
    } else {
      switchBox.style.background = "rgba(255,255,255,0.3)";
      switchCircle.style.left = "2px";
    }
  }
}
const hn = updateRefreshSwitchState;

/**
 * 检查底栏工具行是否已隐藏 (导出兼容 fn)
 * @returns {boolean}
 */
function isToolbarContentRowHidden() {
  const row = document.getElementsByClassName("PlayerToolbar-ContentRow")[0];
  return Boolean(row && row.style.visibility === "hidden");
}
const fn = isToolbarContentRowHidden;

/**
 * 注入视频播放区 PK 与点赞动效屏蔽样式 (导出兼容 yn)
 */
function applyVideoOverlayCleanStyle() {
  (0, __imports.tl)(
    "Ex_Style_VideoRefresh",
    `
      .PELact, .pushTower-wrapper-gf1HG, .PkView-9f6a2c, .MorePk,
      .RandomPKBar, .LiveRoomLoopVideo, .LiveRoomDianzan,
      .maiMaitView-68e80c, .PkView {
        display: none !important;
      }
    `
  );
}
const yn = applyVideoOverlayCleanStyle;

/**
 * 注入全站商业横幅、悬浮弹窗与广告物理拦截样式 (导出兼容 bn)
 */
function applyAdblockAndCleanupStyles() {
  (0, __imports.tl)(
    "Ex_Style_RemoveAD",
    `
      .ScreenBannerAd, .XinghaiAd, .CustomGroupGuide, .FudaiGiftToolBarTips,
      .UserInfo-tryEnterHiddenLead, .BargainingKit, .AnchorPocketTips, .FishShopTip,
      .FollowGuide, #js-bottom-right-cloudGame, .CloudGameLink, .RoomText-icon-horn,
      .RoomText-list, .Search-ad, .RedEnvelopAd, .noHandlerAd-0566b9, .PcDiversion,
      .DropMenuList-ad, .DropPane-ad, .WXTipsBox, .igl_bg-b0724a, .closure-ab91fb,
      .VideoAboveVivoAd, .css-widgetWrapper-EdVVC, .watermark-442a18, .FollowGuide-FadeOut,
      .MatchSystemChatRoomEntry-roomTabs, .FansMedalDialog-normal, .GameLauncher,
      .recommendAD-54569e, .recommendApp-0e23eb, .Title-ad, .Bottom-ad, .SignBarrage,
      .corner-ad-495ade, .SignBaseComponent-sign-ad, .SuperFansBubble, .is-noLogin,
      .PlayerToolbar-signCont, #js-widget, .Frawdroom, .HeaderGif-right, .HeaderGif-left,
      .liveos-workspace, .BattleShipTips, .LastLiveTime, .recommendView-3e8b62,
      .TurntableLottery-actTips, .feedback-e27241, .FansMedalEnter-maxFlag,
      .GuessGameMiniPanelB-wrapper, .ZoomTip, .PlayerToolbar-couponInfo,
      .AroundStarsActTips-actTips, .AroundStarsMoonBoxTips, .AroundStarsPlanetTips,
      .InteractPlayWithEnter-enterTips1, .SharePanel, .CommonShareToolkit,
      .mask1-63237a, .mask2-a8df6e, .panel1-1484c9, .panel2-5ece0e,
      .IconCardAdCard, .IconCardAd, .CloseVideoPlayerAd, .IconCardAdBoundsBox,
      .room-top-banner-box, .LadderNav, #js-bottom-right-recommendAd,
      .aside-top-uspension-box, .bacpCommonKeFu, .ClosingRecommend,
      .ClosingRecommend *, .werbungContainer__2sv7h, #js-player-asideTopSuspension,
      .Search-Panel-Advert {
        display: none !important;
      }

      .Barrage-topFloater { z-index: 999; }
      .danmuAuthor-3d7b4a, .danmuContent-25f266 { overflow: initial; }
      .Header-follow-listBox { max-height: 640px !important; }
      #js-barrage-list-parent { scrollbar-width: none; -ms-overflow-style: none; width: 98%; height: 100%; }
      #js-barrage-list-parent::-webkit-scrollbar { display: none; }
      #js-barrage-extend-container { display: var(--enter-display, none) !important; }
      #js-player-asideMain { top: 0 !important; }
    `
  );
}
const bn = applyAdblockAndCleanupStyles;

}
