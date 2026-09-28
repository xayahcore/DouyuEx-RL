function initPkg_RemoveAD() {
    optimizePageStyle();
    if (typeof initPkg_RemoveMsgNotice === "function") {
        initPkg_RemoveMsgNotice();
    }
}
// .dy-ModalRadius-mask,dy-ModalRadius-wrap{display:none !important;}
function removeAD() {
    StyleHook_set("Ex_Style_RemoveAD", `
    .ScreenBannerAd,.XinghaiAd,.UserInfo-tryEnterHiddenLead,.AnchorPocketTips,.FishShopTip,.FollowGuide,.RoomText-icon-horn,.RoomText-list,.noHandlerAd-0566b9,.DropMenuList-ad,.DropPane-ad,.igl_bg-b0724a,.closure-ab91fb,.VideoAboveVivoAd,.watermark-442a18,.FollowGuide-FadeOut,.FansMedalDialog-normal,.recommendAD-54569e,.recommendApp-0e23eb,.Bottom-ad,.SignBarrage,.SignBaseComponent-sign-ad,.SuperFansBubble,.Frawdroom,.HeaderGif-right,.HeaderGif-left{display:none !important;}
    .Barrage-topFloater{z-index:999}
    .danmuAuthor-3d7b4a, .danmuContent-25f266{overflow: initial}
    .LastLiveTime,.recommendView-3e8b62{display:none !important;}
    .feedback-e36e9d{display:none !important;}
    .FansMedalEnter-maxFlag{display:none !important;}
    .Header-follow-listBox{max-height:640px !important;}

    .GuessGameMiniPanelB-wrapper{display:none !important;}

    /*优化页面*/
    #js-barrage-list-parent{scrollbar-width: none;-ms-overflow-style: none;width:98%;height:100%}
    #js-barrage-list-parent::-webkit-scrollbar{display: none;}
    /*陪玩*/
    .InteractPlayWithEnter-enterTips1{display:none !important;}

    /*恢复emoji彩色 chrome加粗情况下emoji会变灰，需要找一个fontweight起始值在500的字体库才可以兼容*/

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
    .IconCardAdBoundsBox{
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
    /*弹幕框顶部广告*/
    .aside-top-uspension-box {
        display: none!important;
    }
    #js-player-asideMain {
        top: 0!important;
    }

    #js-player-asideTopSuspension{display:none !important;}
    .Search-Panel-Advert{display:none !important;}

    /*推广位：德语 werbung = 广告。类名带构建哈希会轮换，故用包含匹配*/
    [class*="werbungText"]{display:none !important;}
    /*播放器工具条：任务大厅 / 免费火箭。
      dataid 比类名稳定，且工具条（.ToolBarCardProxyItem）与展开面板（.InteractItem）
      用的是同一套 dataid，所以这里通吃两处，不必分别写选择器。*/
    .PlayerToolbar-Task,
    [dataid="taskPanel"],
    [dataid="webGame"]{display:none !important;}

    /*以下用 :has() 连同外层槽位一起收起，否则只藏内容会留空白。
      单独成条：不支持 :has() 的浏览器会整条丢弃，上面那条仍生效（内容照藏，只是留白）。
      槽位不是只装广告，故必须 :has 精确匹配——
      工具条同排还有选手评分/异域商人/至臻殿堂/全民星推，activeItem 槽还有游戏榜/挑战进度。*/
    .ToolbarCardModule:has(.PlayerToolbar-Task),
    .ToolbarCardModule:has(.ToolBarCardProxyItem[dataid="taskPanel"]),
    .ToolbarCardModule:has(.ToolBarCardProxyItem[dataid="webGame"]),
    [class*="activeItem__"]:has([class*="werbungText"]){display:none !important;}

    /*上面那排是绝对定位 + 写死的 right 偏移（0/78/156…），藏掉一个不会自动补位，会留空白。
      改成正常流并反向排列：既让剩下的贴右对齐，又保持原来「从右往左」的顺序。
      作用域限定在该容器内，避免误伤其它同名类。*/
    [class*="activeContainer__"] [class*="activeBar__"]{width:auto !important;display:flex !important;flex-direction:row-reverse !important;align-items:center !important;}
    [class*="activeContainer__"] [class*="activeItem__"]{position:static !important;left:auto !important;right:auto !important;}
    `);
    // body{transform: translateZ(0)!important;}
    // .RomanticDatePanelModal-middle--small{height:220px !important;}
    // .MainDialog-main--content{height:450px !important;}
    // .RomanticDatePanelModal-middle--rowItemBottom--rowItemBottomBtn{margin-left:0px;margin-top:0px;width:170px !important;height:40px !important;background:orange !important;}
    // }
}

function optimizePageStyle() {
    // 弹幕框滚动条隐藏
    let list = document.getElementById("js-barrage-list");
    if (list && list.parentNode) {
        list.parentNode.id = "js-barrage-list-parent";
    }
}
