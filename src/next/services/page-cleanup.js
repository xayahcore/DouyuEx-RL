function* (__imports) {
yield {"bn": { get: () => bn, set: value => { bn = value; } },
"fn": { get: () => fn, set: value => { fn = value; } },
"gn": { get: () => gn, set: value => { gn = value; } },
"hn": { get: () => hn, set: value => { hn = value; } },
"mn": { get: () => mn, set: value => { mn = value; } },
"un": { get: () => un, set: value => { un = value; } },
"yn": { get: () => yn, set: value => { yn = value; } }};
let mn = 0;
function un() {
  ((0, __imports.tl)(
    "Ex_Style_RefreshBarrage",
    `

    .UserCsgoGameDataMedal,.Barrage-honor,.Barrage-listItem .Barrage-icon,.Barrage-listItem .FansMedal.is-made,.Barrage-listItem .RoomLevel,.Barrage-listItem .Motor,.Barrage-listItem .ChatAchievement,.Barrage-listItem .Barrage-hiIcon,.Barrage-listItem .Medal,.Barrage-listItem .MatchSystemTeamMedal{display:none !important;}

    /*.Barrage-listItem .UserLevel{display:none !important;}*/

    .Barrage-listItem .Baby{display:none !important;}

    .FansMedalWrap{display:none !important;}

    `,
  ),
    (mn = 1),
    document.getElementById("refresh-barrage").classList.add("ex-active"),
    (document.getElementById("refresh-barrage__text").style.color = "#fff"),
    (document.getElementById("refresh-barrage__text").innerText = "前缀"));
  var e = document.getElementById("refresh-barrage__svg");
  e &&
    (e = e.getElementsByTagName("path")[0]) &&
    e.setAttribute("fill", "#ffffff");
}
let gn = 0;
function hn(e) {
  var t = document.getElementById("ex-refresh-switch"),
    o = document.getElementById("ex-refresh-switch-circle");
  t &&
    o &&
    (e
      ? ((t.style.background = "#f60"), (o.style.left = "14px"))
      : ((t.style.background = "rgba(255,255,255,0.3)"),
        (o.style.left = "2px")));
}
function fn() {
  return (
    "hidden" ==
    document.getElementsByClassName("PlayerToolbar-ContentRow")[0].style
      .visibility
  );
}
function yn() {
  (0, __imports.tl)(
    "Ex_Style_VideoRefresh",
    `

    .PELact,.pushTower-wrapper-gf1HG,.PkView-9f6a2c,.MorePk,.RandomPKBar,.LiveRoomLoopVideo,.LiveRoomDianzan,.maiMaitView-68e80c,.PkView{display:none !important;}

    `,
  );
}
function bn() {
  (0, __imports.tl)(
    "Ex_Style_RemoveAD",
    `

    .ScreenBannerAd,.XinghaiAd,.CustomGroupGuide,.FudaiGiftToolBarTips,.UserInfo-tryEnterHiddenLead,.BargainingKit,.AnchorPocketTips,.FishShopTip,.FollowGuide,#js-bottom-right-cloudGame,.CloudGameLink,.RoomText-icon-horn,.RoomText-list,.Search-ad,.RedEnvelopAd,.noHandlerAd-0566b9,.PcDiversion,.DropMenuList-ad,.DropPane-ad,.WXTipsBox,.igl_bg-b0724a,.closure-ab91fb,.VideoAboveVivoAd,.css-widgetWrapper-EdVVC,.watermark-442a18,.FollowGuide-FadeOut,.MatchSystemChatRoomEntry-roomTabs,.FansMedalDialog-normal,.GameLauncher,.recommendAD-54569e,.recommendApp-0e23eb,.Title-ad,.Bottom-ad,.SignBarrage,.corner-ad-495ade,.SignBaseComponent-sign-ad,.SuperFansBubble,.is-noLogin,.PlayerToolbar-signCont,#js-widget,.Frawdroom,.HeaderGif-right,.HeaderGif-left,.liveos-workspace{display:none !important;}

    .Barrage-topFloater{z-index:999}

    .danmuAuthor-3d7b4a, .danmuContent-25f266{overflow: initial}

    .BattleShipTips{display:none !important;}

    .LastLiveTime,.recommendView-3e8b62{display:none !important;}

    .TurntableLottery-actTips{display:none !important;}

    .feedback-e27241{display:none !important;}

    .FansMedalEnter-maxFlag{display:none !important;}

    .Header-follow-listBox{max-height:640px !important;}



    .GuessGameMiniPanelB-wrapper{display:none !important;}



    .ZoomTip{display:none !important;}



    /*福利券*/

    .PlayerToolbar-couponInfo{display:none !important;}

    /*太空探险tips*/

    .AroundStarsActTips-actTips,.AroundStarsMoonBoxTips,.AroundStarsPlanetTips{display:none !important;}

    /*优化页面*/

    #js-barrage-list-parent{scrollbar-width: none;-ms-overflow-style: none;width:98%;height:100%}

    #js-barrage-list-parent::-webkit-scrollbar{display: none;}

    /*陪玩*/

    .InteractPlayWithEnter-enterTips1{display:none !important;}



    /*恢复emoji彩色 chrome加粗情况下emoji会变灰，需要找一个fontweight起始值在500的字体库才可以兼容*/



    /*右侧分享*/

    .SharePanel,.CommonShareToolkit{

        display: none!important;

    }

    /*去除还在电脑面前的mask*/

    .mask1-63237a,.mask2-a8df6e,.panel1-1484c9,.panel2-5ece0e{

        display: none!important;

    }

    /*左侧悬浮二维码广告*/

    .IconCardAdCard{

        display: none!important;

    }

    /*视频右侧的游戏手柄按钮AD*/

    .IconCardAd {

        display: none!important;

    }

    /*视频区视频广告*/

    .CloseVideoPlayerAd,.IconCardAdBoundsBox{

        display: none!important;

    }

    /*直播间顶部广告*/

    .room-top-banner-box {

        display: none!important;

    }

    /*弹幕框底部进场弹幕信息*/

    #js-barrage-extend-container {

        display: none!important;

        display: var(--enter-display, none) !important;

    }

    /*直播间右侧广告*/

    .LadderNav {

        display: none!important;

    }

    #js-bottom-right-recommendAd {

        display: none!important;

    }

    /*弹幕框顶部广告*/

    .aside-top-uspension-box {

        display: none!important;

    }

    #js-player-asideMain {

        top: 0!important;

    }

    /*右下角联系客服*/

    .bacpCommonKeFu {

        display: none!important;

    }



    .ClosingRecommend,.ClosingRecommend *,.werbungContainer__2sv7h{display:none !important;}

    #js-player-asideTopSuspension{display:none !important;}

    .Search-Panel-Advert{display:none !important;}

    `,
  );
}

}
