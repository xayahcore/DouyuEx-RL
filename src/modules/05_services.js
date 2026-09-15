var o=document.getElementsByTagName("html")[0].innerHTML,n="$ROOM.room_id =".length,t=o.indexOf("$ROOM.room_id ="),B="",I=(0<t?B=(B=o.substring(t+n,o.indexOf(";",t+n)))&&B.trim():(B=v(o,"roomID:",","))?B=B.trim():(t=document.querySelector('link[rel="canonical"]'))&&(B=t.getAttribute("href").split("/").pop().trim()),o=null,x("acf_uid")),W="",m=x("acf_uid")+"_"+x("acf_biz")+"_"+x("acf_stk")+"_"+x("acf_ct")+"_"+x("acf_ltkid"),Y=null;function b(t){return new Promise(e=>setTimeout(e,t))}function Q(e){let t=parseInt(e),o=0,n=0,i=(60<t&&(o=parseInt(t/60),t=parseInt(t%60),60<o)&&(n=parseInt(o/60),o=parseInt(o%60)),parseInt(t)+"秒");return 0<o&&(i=parseInt(o)+"分"+i),i=0<n?parseInt(n)+"小时"+i:i}function J(e){var t=0,o=0;return 60<(e=parseInt(e))&&(t=parseInt(e/60),e=parseInt(e%60),60<t)&&(o=parseInt(t/60),t=parseInt(t%60)),e=""+(parseInt(e)<10?"0"+parseInt(e):parseInt(e)),e=(parseInt(t)<10?"0"+parseInt(t):parseInt(t))+":"+e,e=(parseInt(o)<10?"0"+parseInt(o):parseInt(o))+":"+e}async function Z(){return!0}function v(e,t,o){e=e.match(new RegExp(t+"(.*?)"+o));return!!e&&e[1]}function x(e){try{var t=new RegExp("(^| )"+e+"=([^;]*)(;|$)"),n=document.cookie.match(t);return n?unescape(n[2]):null}catch(err){return null}}function w(){let e=x("acf_ccn");var t,o,n;return null==e&&(t="acf_ccn",o="1",(n=new Date).setTime(n.getTime()+108e5),document.cookie=t+"="+escape(o)+"; path=/; expires="+n.toGMTString(),e="1"),e}function T(e,t="success",o){e={text:e,type:t,position:"bottomLeft",...o};new NoticeJs(e).show()}function _(e,t=!0){GM_openInTab(e,{active:t})}function r(){-1!=navigator.userAgent.indexOf("Firefox")||-1!=navigator.userAgent.indexOf("Chrome")?window.location.href="about:blank":(window.opener=null,window.open("","_self")),window.close()}function k(e,t){var o,n={"M+":t.getMonth()+1,"d+":t.getDate(),"h+":t.getHours(),"m+":t.getMinutes(),"s+":t.getSeconds(),"q+":Math.floor((t.getMonth()+3)/3),S:t.getMilliseconds()};for(o in/(y+)/.test(e)&&(e=e.replace(RegExp.$1,(t.getFullYear()+"").substr(4-RegExp.$1.length))),n)new RegExp("("+o+")").test(e)&&(e=e.replace(RegExp.$1,1==RegExp.$1.length?n[o]:("00"+n[o]).substr((""+n[o]).length)));return e}function a(e,t){return Math.floor(Math.random()*(t-e)+e)}function X(t,o,n){window.Notification&&"denied"!==Notification.permission&&Notification.requestPermission(function(e){new Notification(t,{body:o}).onclick=function(){n()}})}function K(){return new Promise(t=>{var n=x("acf_nickname");if(n)return t(decodeURIComponent(n));try{var e=document.querySelector(".Barrage-nickName.is-self, .Header-login-avatar img, .UserInfo-nickname");if(e){var o=e.innerText||e.title||e.alt;if(o)return t(o.trim())}}catch(e){}fetch("https://www.douyu.com/member/cp",{method:"GET",credentials:"include"}).then(e=>e.text()).then(e=>{var o=(new DOMParser).parseFromString(e,"text/html").getElementsByClassName("uname_con")[0];t(o?o.title:"")}).catch(e=>{t("")})})}function $(e){if("TEXTAREA"===e.tagName)return e.selectionStart;let t=0;var o,n,i;return document.selection?(n=document.selection.createRange(),(o=(i=e.createTextRange()).duplicate()).moveToBookmark(n.getBookmark()),o.setEndPoint("EndToEnd",i),t=o.text.length):window.getSelection&&0<(n=window.getSelection()).rangeCount&&((i=n.getRangeAt(0).cloneRange()).selectNodeContents(e),i.setEnd(0<n.rangeCount?n.getRangeAt(0).endContainer:e,0<n.rangeCount?n.getRangeAt(0).endOffset:0),t=i.toString().length),t}function ee(t, forceShow, btnEl) {
    var o = [
        { name: "弹幕发送小助手", className: "bloop", title: "弹幕小助手", dockCls: "bloop-icon" },
        { name: "扩展功能", className: "extool", title: "扩展功能", dockCls: "extool-icon" },
        { name: "直播间工具", className: "livetool", title: "直播间工具", dockCls: "livetool-icon" },
        { name: "全站抽奖信息", className: "exlottery", title: "全站抽奖", dockCls: "ex-lottery" },
        { name: "弹幕小尾巴", className: "ChatToolBar-DanmakuTail-Panel", title: "弹幕小尾巴", dockCls: "ChatToolBar-DanmakuTail" },
        { name: "一键续牌", className: "fans-continue-panel", title: "一键续牌", dockCls: "fans-continue" },
        { name: "一键签到", className: "sign-panel", title: "一键签到", dockCls: "ex-sign" },
        { name: "同屏播放", className: "popup-player-panel", title: "同屏播放器", dockCls: "popup-player" },
        { name: "版本更新", className: "exupdate-panel", title: "版本更新", dockCls: "ex-update" }
    ];
    var activeDockCls = null;
    for (var e = 0; e < o.length; e++) {
        var item = o[e];
        if (item.className === "exupdate-panel" && typeof createExUpdatePanel === "function") {
            createExUpdatePanel();
        }
        var panel = document.getElementsByClassName(item.className)[0];
        if (panel) {
            if (t === item.name) {
                var isHidden = forceShow ? true : (panel.style.display === "none" || !panel.style.display);
                try {
                    if (!forceShow && typeof getComputedStyle === "function") {
                        isHidden = isHidden || (getComputedStyle(panel).display === "none");
                    }
                } catch(err) {}
                if (isHidden) {
                    panel.style.setProperty("display", "flex", "important");
                    panel.style.setProperty("flex-direction", "column", "important");
                    if (typeof ensureMiuixPanelHeader === "function") {
                        ensureMiuixPanelHeader(panel, item.title);
                    }
                    if (typeof anchorPanelToButton === "function") {
                        anchorPanelToButton(panel, btnEl || document.querySelector("." + item.dockCls));
                    }
                    activeDockCls = item.dockCls;
                } else {
                    panel.style.setProperty("display", "none", "important");
                }
            } else {
                panel.style.setProperty("display", "none", "important");
            }
        }
    }
    if (typeof updateDockActiveIndicator === "function") {
        updateDockActiveIndicator(activeDockCls);
    }
}
function l(e,t,o="download.xlsx"){if("undefined"==typeof XLSX)return void ExLoadLib(EXURL.xl,()=>l(e,t,o),()=>T("【下载弹幕】xlsx组件加载失败","info"));var n=[],e=(n.push(e,...t),XLSX.utils.aoa_to_sheet(n)),i=(t=e,(n={SheetNames:[r=r||"sheet1"],Sheets:{}}).Sheets[r]=t,r={bookType:"xlsx",bookSST:!1,type:"binary"},t=XLSX.write(n,r),n=new Blob([(e=>{for(var t=new ArrayBuffer(e.length),o=new Uint8Array(t),n=0;n!=e.length;++n)o[n]=255&e.charCodeAt(n);return t})(t)],{type:"application/octet-stream"})),e=o;"object"==typeof i&&i instanceof Blob&&(i=URL.createObjectURL(i));var a,r=document.createElement("a");r.href=i,r.download=e||"",window.MouseEvent?a=new MouseEvent("click"):(a=document.createEvent("MouseEvents")).initMouseEvent("click",!0,!1,window,0,0,0,0,0,!1,!1,!1,!1,0,null),r.dispatchEvent(a),"string"==typeof i&&0===i.indexOf("blob:")&&setTimeout(function(){try{URL.revokeObjectURL(i)}catch(e){}},1500)}function te(){var e=new Event("resize");window.dispatchEvent(e)}function E(e){for(var t of e){let e=null;if(e="string"==typeof t?document.querySelector(t):t)return e}return null}let oe='<svg t="1613993967937" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2122" width="16" height="16"><path d="M217.472 311.808l384.64 384.64-90.432 90.56-384.64-384.64z" fill="#8A8A8A" p-id="2123"></path><path d="M896.32 401.984l-384.64 384.64-90.56-90.496 384.64-384.64z" fill="#8A8A8A" p-id="2124"></path></svg>',ne=0;function ie(e){var _al=document.getElementById("ex-accountList-content");if(_al)_al.innerHTML=(e=>{let t=null==e?JSON.parse(GM_getValue("Ex_accountList")||"{}"):e,o="";for(var n in t)"null"!=n&&(n=t[n],o+=`

        <div class="ex-accountList-item" uid="${n.uid}">

            <div class="ex-accountList-item__imgWrap">

                <img src=${decodeURIComponent(n.avatar)+"middle.jpg"} alt="" class="ex-accountList-item__img">

            </div>

            <div class="ex-accountList-item__name">${decodeURIComponent(n.nickname)}</div>

            <div class="ex-accountList-item__btn">删除</div>

        </div>`);return o+=`

    <div id="ex-accountList-item-add">

        <svg t="1613995373702" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2832" width="32" height="32"><path d="M577.088 0H448.96v448.512H0v128h448.96V1024h128.128V576.512H1024v-128H577.088z" p-id="2833" fill="#8A8A8A"></path></svg>

    </div>

    `})(e);var t=document.getElementsByClassName("ex-accountList-item");for(let e=0;e<t.length;e++){var o=t[e];let a=o.getAttribute("uid");o.addEventListener("click",()=>{T("【账号管理】正在切换账号，请耐心等待...","info");{a;var i=()=>{};JSON.parse(GM_getValue("Ex_accountList"));let o=[],n=0;GM_cookie("list",{path:"/"},function(t){for(let e=0;e<t.length;e++)GM_cookie("delete",{name:t[e].name},function(e){if(++n>=t.length){let t=0;for(let e=0;e<o.length;e++)GM_cookie("set",{name:o[e].name,value:o[e].value,domain:o[e].domain,path:o[e].path,secure:o[e].secure,httpOnly:o[e].httpOnly,sameSite:o[e].sameSite,expirationDate:o[e].expirationDate,hostOnly:o[e].hostOnly},function(e){++t>=o.length&&i()})}})})}re("switch",a),document.getElementById("ex-accountList-iframe2").innerHTML=`

    <iframe id="ex-yuba-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://yuba.douyu.com/iframe/tab/6416853?exClean&domain=${encodeURIComponent(window.location.href)}&"></iframe>

    <iframe id="ex-msg-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://msg.douyu.com/web/index.html?exClean&domain=${encodeURIComponent(window.location.href)}&"></iframe>

    <iframe id="ex-video-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://v.douyu.com/show/0?exClean&domain=${encodeURIComponent(window.location.href)}&"></iframe>

    <iframe id="ex-cz-iframe" width="100%" height="100%" scrolling="no" frameborder="0" src="https://cz.douyu.com/item/gold?exClean&domain=${encodeURIComponent(window.location.href)}&"></iframe>

    `}),o.getElementsByClassName("ex-accountList-item__btn")[0].addEventListener("click",e=>{var t,o;e.stopPropagation(),T("【账号管理】正在删除...","info"),e=a,t=()=>{},delete(o=JSON.parse(GM_getValue("Ex_accountList")||"{}"))[e],GM_setValue("Ex_accountList",JSON.stringify(o)),t(),re("delete",a)})}var _addBtn=document.getElementById("ex-accountList-item-add");_addBtn&&_addBtn.addEventListener("click",()=>{ae(()=>{}),re("clean","null")})}function ae(o){let n=0;GM_cookie("list",{path:"/"},t=>{if(t)for(let e=0;e<t.length;e++)GM_cookie("delete",{name:t[e].name},function(e){++n>=t.length&&o()});else o()})}function re(e,t){var _iframe=document.getElementById("ex-accountList-iframe");if(_iframe)_iframe.innerHTML=`

    <iframe id="login-passport-frame" width="100%" height="100%" scrolling="no" frameborder="0" src="https://passport.douyu.com/index/error/show404?&exid=chun&cmd=${e}&uid=${t}&domain=${encodeURIComponent(window.location.href)}&"></iframe>

    `}function le(){var e=E([".pause-c594e8",".icon-c8be96"]);e&&e.click(),qr(B,!0,0,"1428",e=>{var i,a;i=D.length,qr(a=B,!1,0,"1",t=>{if(""!=t||null!=t)if("None"==t)T("房间未开播或其他错误","error");else{var o=String(t).split("/live");let e="";0<o.length&&(e=o[0]);var o=document.createElement("div"),n="",n=(o.id="exVideoDiv"+String(i),o.rid=a,o.className="exVideoDiv",n=(n=(n=(n=(n=(n+="<div class='exVideoInfo' id='exVideoInfo"+String(i)+"'><a title='复制直播流地址'><span class='exVideoRID' id='exVideoRID"+String(i)+"' style='color:white'>斗鱼音频流 - "+a+"</span></a>")+("<select style='display:none' class='exVideoQn' id='exVideoQn"+String(i)+"'><option value='1'>流畅</option><option value='2'>高清</option><option value='3'>超清</option><option value='0'>蓝光</option></select>"))+("<select style='display:none' class='exVideoCDN' id='exVideoCDN"+String(i)+"'><option value='1'>主线路</option><option value='2'>备用线路5</option><option value='3'>备用线路6</option></select>"))+("<a style='margin-left:5px;display:none' href='"+e+"' target='_blank'>无视频？</a>"))+("<a><div class='exVideoClose' id='exVideoClose"+String(i)+"'>X</div></a>")+"</div>")+("<video controls='controls' class='exVideoPlayer' id='exVideoPlayer"+String(i)+"'></video><div class='exVideoScale' id='exVideoScale"+String(i)+"'></div>"),o.innerHTML=n,E([".layout-Main",".playerWrap__8wGvw",".live-next-body"]));n.insertBefore(o,n.childNodes[0]),on(i),tn(i),an(i,a),f(i,t)}})})}let se,de=null;let ce=[],pe=[],me=0,ue=0,ge,he=0,fe=0,ye=!0,be=!1,ve,xe=[];function we(e){var t=document.getElementsByClassName("ChatSend-txt")[0];"TEXTAREA"==t.tagName?t.value=e:t.innerText=e,document.getElementsByClassName("ChatSend-button")[0].click()}function _e(){var e=document.getElementById("bloop__text_speed1").value,t=document.getElementById("bloop__text_speed2").value;return a(Number(e),Number(t))}function ke(){let e=document.getElementById("bloop__text_speed1").value,t=document.getElementById("bloop__text_speed2").value,o=document.getElementById("bloop__text_stoptime").value;var n=document.getElementById("bloop__checkbox_tiangou").checked,n=("undefined"==e&&(e=2e3),"undefined"==t&&(t=3e3),"undefined"==o&&(o=5),{text:xe,speed1:e,speed2:t,stopTime:o,isChangeColor:ye,isTiangouMode:n});localStorage.setItem("ExSave_BarrageLoopOptions",JSON.stringify(n).replace(/\\n/g,"\\r"))}async function Ee(){if(1==ye){{var t=fe;let e;null!=(e=(0==be?(document.getElementsByClassName("FansBarrageSwitcher")[0].click(),document.getElementsByClassName("FansBarrageColor-item")):(document.getElementsByClassName("MatchSystemFansBarrageSwitcher")[0].click(),document.getElementsByClassName("MatchSystemFansBarrageColor-item")))[t])&&e.click()}++fe>me&&(fe=0)}1==document.getElementById("bloop__checkbox_tiangou").checked?(t=await new Promise(t=>{GM_xmlhttpRequest({method:"GET",url:"https://api.shadiao.app/chp",responseType:"json",onload:function(e){e=e.response;t(e.data.text)}})}),we(t=String(t).replace(/他/g,"她"))):(1==document.getElementById("bloop__checkbox_random").checked&&(he=Math.floor(Math.random()*pe.length)),we(pe[he]),1!=document.getElementById("bloop__checkbox_random").checked&&++he>pe.length-1&&(he=0)),ge=setTimeout(Ee,_e())}let Be=!1;function Ie(e){if(!Be){Be=!0;try{e()}finally{setTimeout(()=>{Be=!1},0)}}}function Te(){var e,t,o=document.getElementsByClassName("danmuContent-25f266")[0];o&&(e=o.innerHTML).includes("[DouyuEx图片")&&(t=e.replace(/\[DouyuEx图片(.*?)\]/g,(e,t)=>{if("undefined"==typeof DOMPurify)return ExLoadLib(EXURL.purify,()=>Te()),"";var o;return(e=>(e=e.substring(e.lastIndexOf(".")).toLowerCase(),[".jpg",".jpeg",".png",".gif",".webp",".svg",".bmp",".ico",".tiff",".tif"].includes(e)))(t)?(o=(t=>{let o=0n,n=1n;for(let e=t.length-1;0<=e;e--){var i=t[e].toUpperCase(),a="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(i);if(-1===a)throw new Error("Invalid base36 character: "+i);o+=BigInt(a)*n,n*=36n}return o.toString()})((t=t.split("."))[0]),t=`<a href="${(o=DOMPurify.sanitize(`https://img.douyucdn.cn/data/yuba/weibo/${o.slice(0,4)+"/"+o.slice(4,6)+"/"+o.slice(6,8)+"/"+o}.200x0.`+t[1])).replace("200x0.","")}" target="_blank"><img class="ex-image-danmaku" src="${o}" alt=""></a>`,DOMPurify.sanitize(t)):""}))!==e&&(o.innerHTML=t)}function Ce(t,e){null==t.querySelector("#barragePanel__id")&&(t.childNodes&&0<t.childNodes.length&&t.removeChild(t.childNodes[0]),n=(t=>{let o="";var n=document.getElementsByClassName("Barrage-listItem");for(let e=n.length-1;0<=e;e--){var i=n[e].lastElementChild;if(null!=i&&-1!=i.innerHTML.indexOf(t)){0<i.getElementsByClassName("Barrage-icon--roomAdmin").length&&(o+="【房管】");var a=i.getElementsByClassName("Barrage-nobleImg"),a=(0<a.length&&(o+=`【${a[0].title}】`),i.getElementsByClassName("UserLevel"));0<a.length&&(o+=a[0].title);break}}return o})(e),(o=document.createElement("span")).innerHTML=e,o.title=n,o.id="barragePanel__id",t.insertBefore(o,t.childNodes[0]||null));var o,n=(t=>{let o=!1;var n=document.getElementsByClassName("Barrage-listItem");for(let e=n.length-1;0<=e;e--){var i=n[e].lastElementChild;if(null!=i&&-1!=i.innerHTML.indexOf(t)){i=i.getElementsByClassName("FansMedalWrap");if(0<i.length){o=i[0].cloneNode(!0);break}}}return o})(e);if(0!=n){let e=t.querySelector("#barragePanel__fansMedal");e?e.innerHTML="":((e=document.createElement("div")).id="barragePanel__fansMedal",e.style="display:inline-block",t.insertBefore(e,t.childNodes[0]||null)),e.appendChild(n)}}function Se(e){var t;null==document.getElementById("barragePanel__split")&&((t=document.createElement("br")).id="barragePanel__split",e.appendChild(t))}function Me(e){var t;null!=document.getElementById("barragePanel__mute")||0<document.getElementsByClassName("barragePanel__muteTime").length||((t=document.createElement("div")).style="display:flex;align-items:center;width:100%;gap:8px;",t.innerHTML=`

        <div class="button-7e1395" id="barragePanel__mute" style="z-index:5">禁言</div>

        <div class="barragePanel__muteTime" style="z-index:5">

            <select id="barragePanel__muteSelect" style='width:55px'>

                <option value="1">1分钟</option>

                <option value="10">10分钟</option>

                <option value="30">30分钟</option>

                <option value="60">1小时</option>

                <option value="480">8小时</option>

                <option value="1440">1天</option>

                <option value="4320">3天</option>

                <option value="10080">7天</option>

                <option value="43200">30天</option>

                <option value="259200">180天</option>

                <option value="518400">360天</option>

            </select>

        </div>

    `,e.appendChild(t))}function Ne(e){var t;null==document.getElementById("barragePanel__search")&&((t=document.createElement("div")).className="button-7e1395",t.innerText="查弹幕",t.id="barragePanel__search",t.style="z-index:5",e.appendChild(t))}function Le(e){var t;null==document.getElementById("barragePanel__reply")&&((t=document.createElement("div")).className="button-7e1395",t.innerText="回复",t.id="barragePanel__reply",t.style="z-index:5",e.appendChild(t))}function Ae(e,o){document.getElementById("barragePanel__reply").onclick=()=>{var e=document.getElementsByClassName("danmuContent-25f266")[0].innerText,t=document.getElementsByClassName("ChatSend-txt")[0],e=`@${o}：`+e;"TEXTAREA"==t.tagName?t.value=e:t.innerText=e,t.focus()},document.getElementById("barragePanel__mute").onclick=async()=>{var e=document.getElementById("barragePanel__muteSelect").value||"1",t=await lo(B,o,e);"添加成功"==t.msg?T(`【禁言】${o}已被禁言${e}分钟`,"success"):T(t.msg,"error")},document.getElementById("barragePanel__search").onclick=async()=>{n=o;var n,e=await new Promise(o=>{GM_xmlhttpRequest({method:"GET",url:"https://www.doseeing.com/api/suggest_all?type=room&nickname="+encodeURIComponent(n),responseType:"json",headers:{"Content-Type":"application/x-www-form-urlencoded"},onload:function(e){e=e.response;let t=!0;e.suggest||(t=!1),e.suggest.fan||(t=!1),0===e.suggest.fan.length&&(t=!1),(t=e.suggest.fan[0].nickname!==n?!1:t)?o(e.suggest.fan[0].user_id):o("")}})});""!==e&&_(`https://www.doseeing.com/data/fan/${e}?type=chat&dt=0`,!0)}}let De=[],C=0,je=200;function Pe(e){De.length>=je&&(De.shift(),C=Math.min(C,De.length)),C=De.push(e)}function ze(){var e,t;null!=De[C]&&(e=De[C]||"",null!=(t=document.getElementsByClassName("ChatSend-txt")[0]))&&("TEXTAREA"===t.tagName?t.value=e:t.innerText=e)}function Oe(){var e=document.getElementsByClassName("ChatSend-txt")[0];return null!=e?"TEXTAREA"===e.tagName?e.value:e.innerText:""}let Re={t:0,list:[]};async function Fe(){o=B;var o,e=await new Promise((t,e)=>{fetch("https://www.douyu.com/japi/interact/cdn/pocket/effective?rid="+o,{method:"GET",mode:"no-cors",credentials:"include"}).then(e=>e.json()).then(e=>{if(!e.data)return t([]);t(e.data.list)}).catch(e=>{console.log("请求失败!",e)})});Re.list=e,Re.t=(new Date).getTime()}function He(e){qr(B,!0,0,e,e=>{"None"==e?T("房间未开播或其他错误","error"):(e=String(e),GM_setClipboard(e),T("复制成功","success"))})}function Ge(){0<document.querySelectorAll(".tipItem-898596 > ul > li").length?document.querySelectorAll(".tipItem-898596 > ul > li").forEach(e=>{e.className.includes("selected")&&He((e=e.innerText,String(e).includes("蓝光8M")?8:String(e).includes("蓝光4M")?4:String(e).includes("超清")?3:String(e).includes("高清")?2:0))}):He(0)}function Ve(e){var t=e.target.value,o=document.getElementsByClassName("ChatBarrageCollectPop-barrageContent")[0].parentElement.getElementsByClassName("TagItem");for(let e=0;e<o.length;e++){var n=o[e];n.innerText.includes(t)?n.style.display="":n.style.display="none"}}function qe(){let t=localStorage.getItem("ExSave_DanmakuCollect");try{t=JSON.parse(t)||[]}catch(e){t=[]}return t}function Ue(){var e={isTailEnabled:document.getElementById("DanmakuTail-checkbox").checked,tailContent:document.getElementById("DanmakuTail-input").value,type:document.querySelector('input[name="DanmakuTailType"]:checked').value};localStorage.setItem("ExSave_DanmakuTail",JSON.stringify(e))}function We(e,o){return new Promise(t=>{fetch("https://v.douyu.com/api/stream/getStreamUrl",{method:"POST",mode:"no-cors",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8"},body:o+"&vid="+e}).then(e=>e.json()).then(e=>{t(e)}).catch(e=>{console.log("请求失败!",e)})})}function Ye(e,o=0){if(!(o<0))return new Promise(t=>{fetch(`https://v.douyu.com/wgapi/vod/center/getBarrageListByPage?vid=${e}&offset=`+o,{method:"GET",mode:"no-cors",credentials:"include"}).then(e=>e.json()).then(e=>{t(e)}).catch(e=>{console.log("请求失败!",e)})})}let Qe=null,Je=!1,Ze="ex-barrageLine";function Xe(){let n=setInterval(()=>{var e=document.getElementsByTagName("demand-video")[0].shadowRoot.getElementById("demandcontroller-bar").shadowRoot.querySelector("demand-video-controller-progress").shadowRoot.querySelector(".ProgressBar-Sign"),t=document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot,o=document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot;e&&t&&o&&(clearInterval(n),(e=document.createElement("style")).innerHTML=`.no-hasLR #ex-barrageLine {

        display: none !important;

    }`,document.getElementsByTagName("demand-video")[0].shadowRoot.getElementById("demandcontroller-bar").shadowRoot.querySelector("demand-video-controller-progress").shadowRoot.append(e),Ke(),t=o.querySelector("share-hover"),(Qe=new MutationObserver(function(e){Ke()})).observe(t,{attributes:!0,childList:!0,subtree:!1}))},1e3)}async function Ke(){if(!Je){Je=!0,setTimeout(()=>{Je=!1},1e3),T("弹幕高能进度条加载中，请耐心等待","info");var o=document.getElementsByTagName("demand-video")[0].shadowRoot.getElementById("demandcontroller-bar").shadowRoot.querySelector("demand-video-controller-progress").shadowRoot,n=o.querySelector(".ProgressBar"),o=o.querySelector("#"+Ze),i=(o&&o.remove(),document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot.querySelector("share-hover").getAttribute("hashid")),o=document.getElementsByTagName("demand-video")[0].shadowRoot.getElementById("demandcontroller-bar").shadowRoot.querySelector("#time-label").innerText.split("/");if(!(o.length<=0)){var a=(e=>{let t=0;return 1===(e=e.split(":")).length?t=Number(e[0]):2===e.length?t=60*Number(e[0])+Number(e[1]):3===e.length&&(t=3600*Number(e[0])+60*Number(e[1])+Number(e[2])),1e3*t})(o[1])/99,r=new Array(100).fill(0,0,100);let e=0;do{var l=await Ye(i,e);if(e=l.data.pre,l.data.list)for(let e=0;e<l.data.list.length;e++){var s=l.data.list[e];r[Math.floor(s.tl/a)]++}}while(0<=e);var d=1e3/r.length,c=Math.max(...r)/100,p=[];for(let e=0;e<r.length;e++){var m=r[e],u=e*d;p.push([u,m/c])}let t="";for(let e=0;e<p.length-1;e++){var[g,h]=p[e],[f,y]=p[e+1];t=t+"C "+(g+` ${80-(h+y)/2}, ${f} ${80-(h+y)/2}, ${f} ${80-y} `)}var o="M 0 100 L 0 80 "+(t+="L 1000 100 Z"),b=`

    <svg preserveAspectRatio="none" width="100%" height="100%" viewBox="0 0 1000 100" >

        <path fill="rgba(255,255,255,0.3)" d="${o}" />

    </svg>`,o=(-1!==o.indexOf("NaN")&&(console.log(o),T("弹幕高能进度条加载失败","error")),document.createElement("div"));o.id=Ze,o.style="position:absolute;width:100%;height:30px;bottom:0px;pointer-events:none;cursor: default;",o.innerHTML=b,n.insertBefore(o,n.childNodes[0])}}}function $e(){let o=setInterval(()=>{var e,t=document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot;if(t){clearInterval(o);var t=t.querySelector(".ToolBar-positiveUl");(e=document.createElement("style")).innerHTML=`

    #btn-download:hover .download__panel {

        display: block;

    }

    .download__panel {

        width:150px;

        position:absolute;

        text-align: center;

        cursor: default;

        margin-top: 29px;

        margin-left: -38px;

        box-shadow: 0px 3px 10px 0px;

        display: none;

        background: white;

    }

    .download__item {

        height: 30px;

        line-height: 30px;

        width: 100%;

        cursor: pointer;

    }

    .download__item:hover {

        color: rgb(255,119,0)

    }

    `,document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot.appendChild(e),e=t,(t=document.createElement("li")).title="下载视频",t.innerHTML=`

    <div class="download__panel">

        <div class="download__item" id="download__default" title="文件超过2GB时可能会下载失败">

            <span class="ToolBar-iconText">浏览器下载</span>

        </div>

        <div class="download__item" id="download__copy" title="可将链接填至第三方下载器中下载">

            <span class="ToolBar-iconText">复制m3u8链接</span>

        </div>

        <div class="download__item" id="download__barrage" title="下载弹幕(.xlsx)">

            <span class="ToolBar-iconText">下载弹幕(.xlsx)</span>

        </div>

        <div class="download__item" id="download__barrageass" title="下载弹幕(.ass)">

            <span class="ToolBar-iconText">下载弹幕(.ass)</span>

        </div>

    </div>

    <span class="ToolBar-icon ">

        <svg t="1634113402576" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7734" width="28" height="28"><path d="M761.98 413.12c0.25-4.4 0.39-8.82 0.39-13.28 0-127.18-102.84-230.28-229.71-230.28s-229.71 103.1-229.71 230.28c0 0.67 0.02 1.33 0.03 2a213.156 213.156 0 0 0-38.91-3.58c-117.2 0-212.21 95.25-212.21 212.74 0 117.49 95.01 212.74 212.21 212.74 2.94 0 5.86-0.08 8.77-0.2 2.54 0.13 5.09 0.2 7.66 0.2h467.35c2.82 0 5.61-0.09 8.39-0.24 108.96-5.16 195.72-95.13 195.72-205.36 0.01-108.3-83.73-197.04-189.98-205.02zM616.33 584.24l-90.86 93.93c-0.78 1.11-1.66 2.17-2.63 3.17-3.95 4.09-8.9 6.62-14.09 7.61-8.34 1.77-17.38-0.51-23.97-6.89a25.975 25.975 0 0 1-3.16-3.68l-93.5-90.45c-10.53-10.19-10.81-26.99-0.62-37.52 10.19-10.53 26.99-10.81 37.52-0.62l45.09 43.62c0-0.06-0.01-0.12-0.01-0.18l-2.43-146.62c-0.3-17.83 13.92-32.52 31.75-32.82 17.83-0.3 32.52 13.92 32.82 31.75l2.43 146.63v0.17l43.52-44.99c10.19-10.53 26.99-10.81 37.52-0.62 10.53 10.17 10.81 26.97 0.62 37.51z" p-id="7735" fill="#515151"></path></svg>

    </span>

    <span class="ToolBar-iconText" id="download-text">下载</span>

    `,t.id="btn-download",e.appendChild(t);{let a=unsafeWindow.$DATA,r=document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot.querySelector("#download-text");document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot.querySelector(".download__panel"),document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot.querySelector("#btn-download").addEventListener("click",()=>{"下载完成"===r.innerText&&T("请刷新页面后再下载","warning")}),document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot.querySelector("#download__default").addEventListener("click",async()=>{var o=document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot.querySelector("share-hover").getAttribute("hashid"),n=a.ROOM.vid;if(o!==n)T("视频内容已改变，请刷新网页后重试","error");else{T("开始下载视频...当视频超过2GB时可能会下载失败","info");o=new jr;let e=new Dr(a.ROOM.point_id);var i=e.getSign(),n=(e=null,await We(n,i));let t="";""!==(t="super"in n.data.thumb_video?n.data.thumb_video.super.url:"high"in n.data.thumb_video?n.data.thumb_video.high.url:"normal"in n.data.thumb_video?n.data.thumb_video.normal.url:0<(i=Object.keys(n.data.thumb_video)).length?n.data.thumb_video[i[0]].url:"")?o.start(t,{filename:a.ROOM.name+".mp4"}).on("progress",e=>{r.innerText=Number(e.percentage).toFixed(2)+"%"}).on("finished",e=>{r.innerText="下载完成",T("视频下载完成","success")}).on("error",e=>{r.innerText="下载失败",T(e,"success")}).on("aborted",()=>{r.innerText="下载中止"}):T("获取m3u8链接失败","error")}}),document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot.querySelector("#download__copy").addEventListener("click",async()=>{var o=document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot.querySelector("share-hover").getAttribute("hashid"),n=a.ROOM.vid;if(o!==n)T("视频内容已改变，请刷新网页后重试","error");else{T("正在获取m3u8链接...","info");let e=new Dr(a.ROOM.point_id);var o=e.getSign(),n=(e=null,await We(n,o));let t="";""!==(t="super"in n.data.thumb_video?n.data.thumb_video.super.url:"high"in n.data.thumb_video?n.data.thumb_video.high.url:"normal"in n.data.thumb_video?n.data.thumb_video.normal.url:0<(o=Object.keys(n.data.thumb_video)).length?n.data.thumb_video[o[0]].url:"")?(GM_setClipboard(t),T("复制成功，可将链接复制到第三方下载器中下载","success")):T("获取m3u8链接失败","error")}}),document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot.querySelector("#download__barrage").addEventListener("click",async()=>{var e=document.getElementsByTagName("demand-video-title")[0].shadowRoot.querySelector(".Title-Main").innerText,t=document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot.querySelector("share-hover").getAttribute("hashid");T("正在获取弹幕数据，请勿切换页面...","info");let o=0;var n=[];do{var i=await Ye(t,o);o=i.data.pre;for(let e=0;e<i.data.list.length;e++){var a=i.data.list[e];n.push([a.vid,t,a.uid,a.nn,a.ctt,J(a.tl/1e3),k("yyyy-MM-dd hh:mm:ss",new Date(1e3*a.sts))])}}while(0<=o);l(["vid","hashid","uid","昵称","弹幕","时间","发送时间"],n,`【${e}】弹幕数据.xlsx`)}),document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot.querySelector("#download__barrageass").addEventListener("click",async()=>{var e=document.getElementsByTagName("demand-video-title")[0].shadowRoot.querySelector(".Title-Main").innerText,t=document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot.querySelector("share-hover").getAttribute("hashid");T("正在获取弹幕数据，请勿切换页面...","info");let o=0;var n=new Lr({title:e}),i=[];do{var a=await Ye(t,o);o=a.data.pre;for(let e=0;e<a.data.list.length;e++){var r=a.data.list[e];i.push({time:Number(r.tl),txt:r.ctt,color:r.col})}}while(0<=o);var l,s,d,n=n.generate(i);e=e+".ass",l=n,s=unsafeWindow.URL||unsafeWindow.webkitURL||unsafeWindow,l=new Blob([n]),(n=document.createElementNS("http://www.w3.org/1999/xhtml","a")).href=s.createObjectURL(l),n.download=e,(s=document.createEvent("MouseEvents")).initMouseEvent("click",!0,!1,unsafeWindow,0,0,0,0,0,!1,!1,!1,!1,0,null),n.dispatchEvent(s),(d=n.href)&&0===d.indexOf("blob:")&&setTimeout(function(){try{URL.revokeObjectURL(d)}catch(e){}},1500)})}}else;},1e3)}let et=`<svg class="icon" width="24" height="24" viewBox="0 0 108 108" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">

    <g id="页面-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">

        <g id="精灵球" transform="translate(0.830769, 0.830769)" fill-rule="nonzero">

            <path d="M53.1692307,106.338461 C23.8276922,106.338461 0,82.5107692 0,53.1692307 C0,51.0030769 1.77230775,49.2307692 3.9384615,49.2307692 L33.476923,49.2307692 C35.6430769,49.2307692 37.4153845,51.003077 37.4153846,53.1692307 C37.4153846,61.8338461 44.5046154,68.9230769 53.1692307,68.9230769 C61.8338461,68.9230769 68.9230769,61.8338461 68.9230769,53.1692307 C68.9230769,51.0030769 70.6953846,49.2307692 72.8615385,49.2307692 L102.4,49.2307692 C104.566154,49.2307692 106.338461,51.003077 106.338461,53.1692307 C106.338461,82.5107692 82.5107692,106.338461 53.1692307,106.338461 Z" id="路径" fill="#33363A"></path>

            <path d="M8.07384612,57.1076922 C10.0430769,80.2461537 29.5384615,98.4615385 53.1692307,98.4615385 C76.8,98.4615385 96.2953846,80.2461539 98.2646154,57.1076922 L76.5046154,57.1076922 C74.6338461,68.2338461 64.8861539,76.8 53.1692307,76.8 C41.4523076,76.8 31.7046154,68.2338461 29.8338461,57.1076922 L8.07384612,57.1076922 Z" id="路径" fill="#FFFFFF"></path>

            <path d="M53.1692308,3.9384615 C25.9938461,3.9384615 3.9384615,25.9938461 3.9384615,53.1692307 L33.476923,53.1692307 C33.476923,42.3384615 42.3384615,33.476923 53.1692308,33.476923 C64,33.476923 72.8615385,42.3384615 72.8615385,53.1692307 L102.4,53.1692307 C102.4,25.9938461 80.3446154,3.9384615 53.1692308,3.9384615 Z" id="路径" fill="#D60909"></path>

            <path d="M102.4,57.1076922 L72.8615385,57.1076922 C70.6953846,57.1076922 68.923077,55.3353845 68.9230769,53.1692307 C68.9230769,44.5046154 61.8338461,37.4153846 53.1692307,37.4153846 C44.5046154,37.4153846 37.4153846,44.5046154 37.4153846,53.1692307 C37.4153846,55.3353846 35.6430769,57.1076922 33.476923,57.1076922 L3.9384615,57.1076922 C1.77230762,57.1076922 0,55.3353845 0,53.1692307 C0,23.8276922 23.8276923,0 53.1692307,0 C82.5107692,0 106.338461,23.8276922 106.338461,53.1692307 C106.338461,55.3353846 104.566154,57.1076922 102.4,57.1076922 Z" id="路径" fill="#33363A"></path>

            <path d="M76.5046154,49.2307693 L98.3630769,49.2307693 C96.2953846,26.0923076 76.8,7.876923 53.1692307,7.876923 C29.5384615,7.876923 10.0430769,26.0923076 8.07384612,49.2307693 L29.9323076,49.2307693 C31.7046154,38.1046154 41.4523076,29.5384615 53.1692307,29.5384615 C64.8861539,29.5384615 74.6338461,38.1046154 76.5046154,49.2307693 L76.5046154,49.2307693 Z" id="路径" fill="#D60909"></path>

            <path d="M53.1692307,76.8 C40.1723076,76.8 29.5384615,66.1661539 29.5384615,53.1692307 C29.5384615,40.1723076 40.1723076,29.5384615 53.1692307,29.5384615 C66.1661539,29.5384615 76.8,40.1723076 76.8,53.1692307 C76.8,66.1661539 66.1661539,76.8 53.1692307,76.8 Z" id="路径" fill="#33363A"></path>

            <path d="M53.1692307,37.4153846 C44.5046154,37.4153846 37.4153846,44.5046154 37.4153846,53.1692307 C37.4153846,61.8338461 44.5046154,68.9230769 53.1692307,68.9230769 C61.8338461,68.9230769 68.9230769,61.8338461 68.9230769,53.1692307 C68.9230769,44.5046154 61.8338461,37.4153846 53.1692307,37.4153846 L53.1692307,37.4153846 Z" id="路径" fill="#FFFFFF"></path>

            <path d="M43.3230769,53.1692307 C43.3230769,58.6071114 47.7313501,63.0153846 53.1692307,63.0153846 C58.6071114,63.0153846 63.0153846,58.6071114 63.0153846,53.1692307 C63.0153846,47.7313501 58.6071114,43.3230769 53.1692307,43.3230769 C47.7313501,43.3230769 43.3230769,47.7313501 43.3230769,53.1692307 Z" id="路径" fill="#33363A"></path>

        </g>

    </g>

</svg>`;let tt=[],ot=null,nt=0,it=!1,at=0;async function rt(){let o=await new Promise(t=>{fetch("https://www.douyu.com/japi/revenuenc/web/actfans/fishing/reelIn",{method:"POST",mode:"no-cors",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:`ctn=${w()}&rid=`+B}).then(e=>e.json()).then(e=>{t(e)}).catch(e=>{console.log("请求失败!",e)})});if(0!==o.error)console.log(o,"收杆失败"),0==(await ct()).data.fishing.stat&&(it=!1,nt=0);else{let t="【自动钓鱼】";var n=tt.find(e=>e.fishId==o.data.fish.id);if(n&&(t+=`获得${n.name}${o.data.fish.wei}斤`),o.data.awards&&0<o.data.awards.length)for(let e=0;e<o.data.awards.length;e++){var i=o.data.awards[e];t+=`${n?"，":""}获得${i.awardName}x`+i.awardNum}"【自动钓鱼】"!==t&&T(t,"success"),it=!1}}function lt(){let t;try{t=JSON.parse(localStorage.getItem("ExSave_AutoFish"))}catch(e){t=null}return t&&"object"==typeof t||(t={}),Array.isArray(t.rids)||(t.rids=[]),t.modes&&"object"==typeof t.modes||(t.modes={}),t}function st(t){document.querySelectorAll('input[name="autofish_mode"]').forEach(e=>e.disabled=t)}function dt(){var e,t=document.getElementById("extool__autofish_start"),o=document.querySelector('input[name="autofish_mode"]:checked');t&&o&&(t=t.checked,o=o.value,e=lt(),t?(e.rids.includes(B)||e.rids.push(B),e.modes[B]=o):(e.rids=e.rids.filter(e=>e!==B),delete e.modes[B]),localStorage.setItem("ExSave_AutoFish",JSON.stringify(e)))}function ct(){return new Promise(t=>{fetch(`https://www.douyu.com/japi/revenuenc/web/actfans/fishing/homePage?rid=${B}&opt=1`,{method:"GET",mode:"no-cors",cache:"default",credentials:"include"}).then(e=>e.json()).then(e=>{t(e)}).catch(e=>{console.log("请求失败!",e)})})}function pt(e,t){fetch("https://www.douyu.com/japi/prop/backpack/web/v5?rid="+e,{method:"GET",mode:"no-cors",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded"}}).then(e=>e.json()).then(e=>{t(e)}).catch(e=>{console.log("请求失败!",e)})}function mt(){return document.getElementById("extool__fullscreen").checked}function ut(){return document.getElementById("extool__highestvideoquality").checked}let gt,ht=0,ft,yt,bt;// 全量礼物配置缓存与快速检索字典
// 获取纯数字真实房间号 (归一化提取，杜绝别名导致的 403)
function getNumericRoomId() {
    try {
        if (typeof unsafeWindow !== "undefined") {
            if (unsafeWindow.room_id && !isNaN(Number(unsafeWindow.room_id))) return String(unsafeWindow.room_id);
            if (unsafeWindow.rid && !isNaN(Number(unsafeWindow.rid))) return String(unsafeWindow.rid);
            if (unsafeWindow.$DATA && unsafeWindow.$DATA.ROOM && unsafeWindow.$DATA.ROOM.room_id) {
                return String(unsafeWindow.$DATA.ROOM.room_id);
            }
        }
    } catch(e) {}
    try {
        if (typeof window !== "undefined") {
            if (window.room_id && !isNaN(Number(window.room_id))) return String(window.room_id);
            if (window.rid && !isNaN(Number(window.rid))) return String(window.rid);
        }
    } catch(e) {}
    if (typeof B !== "undefined" && B && !isNaN(Number(B))) return String(B);
    try {
        var html = document.documentElement.innerHTML;
        var m = html.match(/["']room_id["']\s*:\s*(\d+)/) || html.match(/roomID:\s*(\d+)/);
        if (m && m[1]) return m[1];
    } catch(e) {}
    return "";
}

// 模块 A：恢复原设计意图 —— 双流聚合当前房间专属礼物与通用在播礼物 (0 全网死重)
var _lastRoomGiftsMapByName = {};

var COMMON_BACKPACK_PROPS = {
    "弱鸡": "https://gfs-op.douyucdn.cn/dygift/2018/11/27/d71e48b4ac91993b4aea75c0c0dd0f45.gif",
    "粉丝荧光棒": "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
    "荧光棒": "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
    "赞": "https://gfs-op.douyucdn.cn/dygift/2018/11/29/abe536f393466727e02422b7cc1fbf57.gif",
    "办卡": "https://gfs-op.douyucdn.cn/dygift/2026/02/04/fb706bd5c63844326420ef86bf87a3ea.webp",
    "稳": "https://gfs-op.douyucdn.cn/dygift/1705/88d8b9e6f3630f576b2512f458e38d72.gif",
    "666": "https://gfs-op.douyucdn.cn/dygift/1705/1f4f13a0c4f826620573e0a133df19f1.gif",
    "福袋": "https://gfs-op.douyucdn.cn/dygift/2019/07/23/bf92364f33190dfca0803450e1814674.gif"
};

function fetchCurrentRoomGifts(rid, callback) {
    var numRid = getNumericRoomId() || String(rid || "");
    var exclusiveGifts = [];
    var universalGifts = [];
    var doneCount = 0;

    function finish() {
        if (++doneCount < 2) return;
        
        var combinedMap = {};
        // 1. 通用在播礼物 (飞机、火箭、超火、飞船、办卡、赞、弱鸡等)
        universalGifts.forEach(function(g) {
            combinedMap[g.id] = g;
        });
        // 2. 房间专属定制礼物 (如 RUA、药丸等定制道具)
        exclusiveGifts.forEach(function(g) {
            combinedMap[g.id] = g;
        });

        var merged = [];
        for (var id in combinedMap) {
            if (combinedMap.hasOwnProperty(id)) {
                merged.push(combinedMap[id]);
                _lastRoomGiftsMapByName[combinedMap[id].name] = combinedMap[id];
            }
        }
        // 按鱼翅价值从高到低排序
        merged.sort(function(a, b) { return b.price - a.price; });
        callback(merged);
    }

    // 第一流：拉取房间专属礼物 (优先从页面内存读取，未就绪从 betard 接口拉取)
    try {
        var winData = (typeof unsafeWindow !== "undefined" && unsafeWindow.$DATA) ? unsafeWindow.$DATA : (typeof window !== "undefined" && window.$DATA ? window.$DATA : null);
        if (winData && winData.room_gift && winData.room_gift.gift) {
            exclusiveGifts = parseRoomGiftMap(winData.room_gift.gift);
            finish();
        } else {
            fetchBetardExclusive();
        }
    } catch(e) {
        fetchBetardExclusive();
    }

    function fetchBetardExclusive() {
        var betardUrl = "https://www.douyu.com/betard/" + numRid;
        var handleBetard = function(json) {
            if (json && json.room_gift && json.room_gift.gift) {
                exclusiveGifts = parseRoomGiftMap(json.room_gift.gift);
            }
            finish();
        };
        if (typeof GM_xmlhttpRequest === "function") {
            GM_xmlhttpRequest({
                method: "GET",
                url: betardUrl,
                responseType: "json",
                headers: { "Referer": "https://www.douyu.com/" + numRid, "User-Agent": navigator.userAgent },
                onload: function(res) { handleBetard(res.response || {}); },
                onerror: function() { finish(); }
            });
        } else {
            fetch(betardUrl, { credentials: "include" })
                .then(function(r) { return r.json(); })
                .then(handleBetard)
                .catch(function() { finish(); });
        }
    }

    // 第二流：从官方 RoomApi 拉取当前房间可用的完整通用在播礼物池
    var roomApiUrl = "https://open.douyucdn.cn/api/RoomApi/room/" + numRid;
    var handleRoomApi = function(json) {
        if (json && json.data && Array.isArray(json.data.gift)) {
            universalGifts = parseRoomApiUniversalGifts(json.data.gift);
        }
        finish();
    };

    if (typeof GM_xmlhttpRequest === "function") {
        GM_xmlhttpRequest({
            method: "GET",
            url: roomApiUrl,
            responseType: "json",
            headers: { "Referer": "https://www.douyu.com/" + numRid, "User-Agent": navigator.userAgent },
            onload: function(res) { handleRoomApi(res.response || {}); },
            onerror: function() { finish(); }
        });
    } else {
        fetch(roomApiUrl)
            .then(function(r) { return r.json(); })
            .then(handleRoomApi)
            .catch(function() { finish(); });
    }
}

function parseRoomGiftMap(giftDict) {
    var result = [];
    if (!giftDict) return result;
    for (var gid in giftDict) {
        if (!giftDict.hasOwnProperty(gid)) continue;
        var g = giftDict[gid];
        var icon = g.pc_icon || g.gif_icon || g.himg || g.cimg || g.bimg || "";
        if (icon && !icon.startsWith("http")) {
            icon = "https://gfs-op.douyucdn.cn/dygift/" + icon;
        }
        var priceVal = Number(g.price || g.pc || 0);
        var priceYc = priceVal / 100;
        result.push({
            id: String(g.id || gid),
            name: g.name || "未知礼物",
            priceText: priceYc > 0 ? (priceYc + " 鱼翅") : "免费",
            icon: icon || "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
            price: priceVal,
            stayTime: Number(g.stay_time || 4000)
        });
    }
    return result;
}

function parseRoomApiUniversalGifts(list) {
    var result = [];
    if (!Array.isArray(list)) return result;
    for (var i = 0; i < list.length; i++) {
        var g = list[i];
        var icon = g.himg || g.mimg || "";
        var priceYc = Number(g.pc || 0);
        result.push({
            id: String(g.id),
            name: g.name || "通用礼物",
            priceText: priceYc > 0 ? (priceYc + " 鱼翅") : "免费",
            icon: icon || "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
            price: priceYc * 100,
            stayTime: 4000
        });
    }
    return result;
}

// 模块 A：恢复原设计意图 —— 获取当前用户真实的背包礼物资产 (精准图标映射)
function fetchUserBackpackGifts(rid, callback) {
    var numRid = getNumericRoomId() || String(rid || "");
    var bpUrl = "https://www.douyu.com/japi/prop/backpack/web/v5?rid=" + numRid;

    function parseBackpackList(list) {
        if (!Array.isArray(list)) list = [];
        return list.map(function(item) {
            var icon = item.pic || item.icon || item.small_pic || item.himg || "";
            if (icon && !icon.startsWith("http")) {
                icon = "https://gfs-op.douyucdn.cn/dygift/" + icon;
            }
            var itemName = item.name || "";
            if (!icon) {
                // 1. 优先从常驻免费道具字典精确匹配 (彻底消灭弱鸡与荧光棒串图问题)
                for (var key in COMMON_BACKPACK_PROPS) {
                    if (itemName.indexOf(key) !== -1) {
                        icon = COMMON_BACKPACK_PROPS[key];
                        break;
                    }
                }
            }
            // 2. 尝试从房间礼物池动态名称反查
            if (!icon && _lastRoomGiftsMapByName[itemName]) {
                icon = _lastRoomGiftsMapByName[itemName].icon;
            }
            // 3. 最终兜底
            if (!icon) {
                icon = "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif";
            }

            return {
                id: String(item.id),
                name: itemName || "背包道具",
                priceText: "拥有 ×" + String(item.count || 1),
                icon: icon,
                count: Number(item.count || 1)
            };
        });
    }

    // 优先调用带 Referer 校验的油猴特权接口，保证 100% 鉴权成功
    if (typeof GM_xmlhttpRequest === "function") {
        GM_xmlhttpRequest({
            method: "GET",
            url: bpUrl,
            responseType: "json",
            headers: {
                "Referer": "https://www.douyu.com/" + numRid,
                "User-Agent": navigator.userAgent
            },
            onload: function(res) {
                var json = res.response || {};
                var rawList = (json.data && Array.isArray(json.data.list)) ? json.data.list : (Array.isArray(json.data) ? json.data : []);
                if (rawList.length > 0) {
                    return callback(parseBackpackList(rawList));
                }
                fallbackDomCheck();
            },
            onerror: function() {
                fallbackDomCheck();
            }
        });
    } else {
        fallbackDomCheck();
    }

    function fallbackDomCheck() {
        // DOM 现场探针：如果底栏已经展开过背包，直接读取真实渲染的道具节点
        try {
            var domCards = document.querySelectorAll(".ToolBarBackpack .ToolbarGiftCard, .ToolbarGiftArea-backpack .ToolbarGiftCard, .ToolBarBackpack-giftList .ToolbarGiftCard");
            if (domCards && domCards.length > 0) {
                var domList = [];
                for (var i = 0; i < domCards.length; i++) {
                    var card = domCards[i];
                    var img = card.querySelector(".ToolbarGiftCard-img, img");
                    var nameEl = card.querySelector(".ToolbarGiftCard-name");
                    var priceEl = card.querySelector(".ToolbarGiftCard-price");
                    var name = nameEl ? nameEl.textContent.trim() : (card.getAttribute("title") || "");
                    var iconSrc = img ? (img.src || img.getAttribute("data-src") || "") : "";
                    if (!iconSrc && name) {
                        for (var k in COMMON_BACKPACK_PROPS) {
                            if (name.indexOf(k) !== -1) {
                                iconSrc = COMMON_BACKPACK_PROPS[k];
                                break;
                            }
                        }
                    }
                    var count = priceEl ? parseInt(priceEl.textContent.replace(/[^0-9]/g, "")) || 1 : 1;
                    var propId = card.getAttribute("data-id") || card.getAttribute("data-prop-id") || String(20000 + i);
                    if (name) {
                        domList.push({
                            id: String(propId),
                            name: name,
                            priceText: "拥有 ×" + String(count),
                            icon: iconSrc || "https://gfs-op.douyucdn.cn/dygift/2019/05/30/ed7b5926f169266173584bbd11139815.gif",
                            count: count
                        });
                    }
                }
                if (domList.length > 0) {
                    return callback(domList);
                }
            }
        } catch(e) {}
        callback([]);
    }
}

function _t(){return document.getElementById("extool__p2p").checked}let kt=[],Et;function Bt(t){fetch("https://www.douyu.com/japi/interactnc/web/propredpacket/grab_prp",{method:"POST",mode:"no-cors",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"activityid="+t+"&ctn="+w()}).then(e=>e.json()).then(e=>{2==e.data.isSuc&&Bt(t)})}function It(){try{var e=localStorage.getItem("ExSave_TabSwitch");if(null!=e)return!!JSON.parse(e).isEnableTabSwitch}catch(e){}e=document.getElementById("extool__tabSwitch");return!!e&&e.checked}function Tt(e){localStorage.setItem("ExSave_TabSwitch",JSON.stringify({isEnableTabSwitch:!!e}));var t=document.getElementById("extool__tabSwitch");t&&(t.checked=!!e),e&&Ct()}function Ct(){Object.defineProperty(document,"hidden",{value:!1,writable:!1}),Object.defineProperty(document,"visibilityState",{value:"visible",writable:!1}),Object.defineProperty(document,"webkitVisibilityState",{value:"visible",writable:!1}),document.dispatchEvent(new Event("visibilitychange")),document.hasFocus=function(){return!0},document.addEventListener("visibilitychange",function(e){e.stopImmediatePropagation()},!0,!0)}var St=!1;function Mt(){var e=document.getElementById("extool__treasure_delay").value;return Number(e)}let Nt=null,Lt=null;function At(){return document.querySelector(".PlayerToolbar-ContentCell .PlayerToolbar-Wealth")||document.querySelector(".PlayerToolbar-ContentRow")}function Dt(){var e=document.getElementsByClassName("PlayerToolbar-ContentRow")[0];return e&&"hidden"===e.style.visibility}function jt(){return document.getElementById("js-player-dialog")||document.getElementsByClassName("room-Player-Box")[0]||document.body}function Pt(e){Nt||(Nt=e.parentNode,Lt=e.nextSibling)}function zt(){var e,t,o,n=document.querySelector(".ex-panel.ex-panel--floating");n&&(e=document.getElementById("js-player-toolbar"),o=document.getElementById("ex-vtoolbar-menu"),e?(e=e.getBoundingClientRect(),n.style.position="fixed",n.style.bottom=window.innerHeight-e.top+8+"px",n.style.top="auto",o?(o=o.getBoundingClientRect(),t=n.offsetWidth||n.scrollWidth||320,o=o.left+o.width/2-t/2,o=Math.max(8,Math.min(o,window.innerWidth-t-8)),n.style.left=o+"px"):(t=n.offsetWidth||n.scrollWidth||320,o=e.left+e.width/2-t/2,o=Math.max(8,Math.min(o,window.innerWidth-t-8)),n.style.left=o+"px"),n.style.right="auto"):(n.style.bottom="72px",n.style.right="12px",n.style.left=""))}function Ot(){var e=document.querySelector(".ex-panel");e&&!e.classList.contains("ex-panel--floating")&&(Pt(e),jt().appendChild(e),e.classList.add("ex-panel--floating")),zt()}function Rt(){var e=document.querySelector(".ex-panel"),t=At();e&&t&&e.classList.contains("ex-panel--floating")&&(Lt&&Lt.parentNode===t?t.insertBefore(e,Lt):t.insertBefore(e,t.childNodes[0]),e.classList.remove("ex-panel--floating"))}function Ft(){var e=document.querySelector(".ex-panel");e&&"block"===e.style.display&&(Ot(),zt())}function Ht(){Rt()}function Gt(){var e=document.querySelector(".ex-panel");e&&(clearTimeout(Y),Y=null,e.style.display="none")}function Vt(){Gt()}function qt(){var e=document.getElementsByClassName("ex-panel")[0];e&&((Dt()?Ot:Rt)(),"block"!==e.style.display?(e.style.display="block",clearTimeout(Y),e.classList.contains("ex-panel--floating")&&zt()):(e.style.display="none",clearTimeout(Y)))}async function Ut(e,t,o){return(await fetch("https://www.douyu.com/japi/prop/donate/mainsite/v1",{method:"POST",mode:"no-cors",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"propId="+e+"&propCount="+t+"&roomId="+o+"&bizExt=%7B%22yzxq%22%3A%7B%7D%7D"})).json()}let Wt;function Yt(e){var t=document.getElementsByClassName("Header-follow-tab is-active")[0].innerText;"特别关注"!==t&&"视频动态"!==t&&0!=(t=document.getElementsByClassName("Header-follow-listWrap")).length&&(document.getElementsByClassName("Header-follow-listBox")[0].style.display="none",(async e=>{var i=await GM_getValue("Ex_LoadInCurrentPage",!1),a=await new Promise(t=>{fetch("https://www.douyu.com/wgapi/livenc/liveweb/follow/list?sort=1&cid1=0",{method:"GET",mode:"no-cors",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded"}}).then(e=>e.json()).then(e=>{t(e)})});if("0"==a.error){let t=0,o=`

        <div id="refreshFollowList" style="color: grey; position: absolute; top: 0px; cursor: default; display: flex; align-items: center; justify-content: space-between; width: calc(100% - 10px); padding: 0 5px;">

            <label style="display: flex; align-items: center; cursor: pointer; color: inherit;">

                <input type="checkbox" id="loadInCurrentPageCheckbox" ${i?"checked":""} style="margin-right: 5px;">

                在当前页面加载

            </label>

            <span>长按弹出同屏播放</span>

        </div>

    `;var r=Math.floor(Date.now()/1e3);for(let e=0;e<a.data.list.length;e++){var l=a.data.list[e];if("1"==l.show_status&&"0"==l.videoLoop&&(o+=`<li class="DropPaneList FollowList ExFollowListItem" rid="${l.room_id}"><a><div class="DropPaneList-cover"><div class="LazyLoad is-visible DyImg "><img src="${String(l.avatar_small).replace("_big","_small")}" alt="${l.nickname}" class="DyImg-content is-normal "></div></div><div class="DropPaneList-info"><p><span class="DropPaneList-hot"><i></i>${l.online}</span><span class="DropPaneList-title">${l.room_name}</span></p><p><span class="DropPaneList-name">${l.nickname}</span><span class="DropPaneList-time">已播${Q(r-Number(l.show_time))}</span></p></div></a></li>`,t++),10<=t)break}e.innerHTML+=o;i=e.querySelector("#loadInCurrentPageCheckbox");i&&i.addEventListener("change",async e=>{e=e.target.checked;await GM_setValue("Ex_LoadInCurrentPage",e),T(`【关注列表】已${e?"开启":"关闭"}当前页加载功能（${e?"当前页面直接加载关注的直播间":"使用新网页打开关注的直播间"}）`,"info")});let n=document.getElementsByClassName("ExFollowListItem");for(let o=0;o<n.length;o++){var s=new Ar(n[o]);s.longClick(()=>{en(D.length,n[o].getAttribute("rid"),"Douyu"),document.querySelector(".Follow .public-DropMenu").className="public-DropMenu"}),s.click(async e=>{e.preventDefault();var e=await GM_getValue("Ex_LoadInCurrentPage",!1),t="https://www.douyu.com/"+n[o].getAttribute("rid");e?window.location.href=t:_(t,!0)}),n[o].addEventListener("mousedown",e=>{1==e.button&&_("https://www.douyu.com/"+n[o].getAttribute("rid"),!1)})}}})(t[0]))}async function Qt(){e=B;var e,n,t=await new Promise((t,o)=>{fetch("https://www.douyu.com/japi/interactnc/web/userLevel/userLevelDetail?rid="+e,{method:"GET",mode:"no-cors",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded"}}).then(e=>e.json()).then(e=>{e=e.data.taskIds.join(",");t(e)}).catch(e=>{console.log("请求失败!",e),o(e)})}),o=(n=t,await new Promise((t,o)=>{fetch("https://www.douyu.com/japi/tasksys/userLevelTask/getTaskStatus?taskIds="+n,{method:"GET",mode:"no-cors",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded"}}).then(e=>e.json()).then(e=>{t(e.data.list)}).catch(e=>{console.log("请求失败!",e),o(e)})}));for(let e=0;e<o.length;e++){var i=o[e],a=i.taskId,r=i.name;if(1==i.taskStatus&&0==i.prizeStatus){var l=await((e,n)=>new Promise((t,o)=>{fetch("https://www.douyu.com/japi/tasksys/userLevelTask/getPrize",{method:"POST",mode:"no-cors",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:`ctn=${w()}&taskIds=${n}&roomId=`+e}).then(e=>e.json()).then(e=>{t(e.data.list)}).catch(e=>{console.log("请求失败!",e),o(e)})}))(B,a);for(let e=0;e<l.length;e++)T(`【等级任务】${r} 获得`+l[e].name+l[e].num,"success")}}}let Jt="",Zt=0;let Xt=0;let Kt=!1,S=[];function $t(){var e=S;localStorage.setItem("ExSave_Enter",JSON.stringify(e))}function eo(){var e,t=document.getElementById("enter__select");t.options.length=0;for(e of S)t.options.add(new Option(`【${e.level}级】`+e.word,""))}let to=!1,M={};function oo(){var e=M;localStorage.setItem("ExSave_Gift",JSON.stringify(e))}function N(e){return v(e,"type@=","/")}let no=!1,L={},io={},ao=[];function ro(){var e=L;localStorage.setItem("ExSave_Mute",JSON.stringify(e))}function lo(e,o,n){return new Promise(t=>{fetch("https://www.douyu.com/room/roomSetting/addMuteUser",{method:"POST",mode:"no-cors",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"ban_nickname="+o+"&room_id="+e+"&ban_time="+n+"&reason=7"}).then(e=>e.json()).then(e=>{t(e)})})}let so={day:{},week:{},all:{}};function co(t,o){if(o)for(let e="week"===t?10:0;e<o.length;e++){var n=o[e],i=n.innerHTML.split("<span")[0],a=n.parentElement,r=so[t][i];a.className.includes("--top")?n.innerHTML=i+`<span class="exRankPoint--top">${r}</span>`:n.innerHTML=i+`<span class="exRankPoint">${r}</span>`}}function po(t){var o={};for(let e=0;e<t.length;e++){var n=t[e];o[n.nickname]=Number(n.gold)/100}return o}let mo=!1,A={},uo=!1,go=0;function ho(){var e=A;localStorage.setItem("ExSave_Reply",JSON.stringify(e))}var fo=0;function yo(i,a,r,l){GM_xmlhttpRequest({method:"POST",url:"https://pcapi.douyucdn.cn/h5nc/member/getRedPacket?token="+m,data:"room_id="+i+"&package_room_id="+i+"&device_id="+r+"&packerid="+a+"&version=1",responseType:"json",headers:{"Content-Type":"application/x-www-form-urlencoded"},onload:function(t){t=t.response;if("-1"==t.data.code&&"0"!=t.data.validate){var e=JSON.parse(t.data.geetest.validate_str),o=e.success;null!=unsafeWindow.initGeetest?unsafeWindow.initGeetest({gt:e.gt,challenge:e.challenge,offline:!o,product:"float"},o=>{let n=document.getElementById(l);o.appendTo("#"+l),o.onSuccess(()=>{var e=o.getValidate(),t=e.geetest_challenge,t="room_id="+i+"&package_room_id="+i+"&device_id="+r+"&packerid="+a+"&version=1"+"&geetest_challenge="+t+"&geetest_validate="+e.geetest_validate+"&geetest_seccode="+encodeURIComponent(e.geetest_seccode);GM_xmlhttpRequest({method:"POST",url:"https://pcapi.douyucdn.cn/h5nc/member/getRedPacket?token="+m,data:t,responseType:"json",headers:{"Content-Type":"application/x-www-form-urlencoded"},onload:function(e){e=e.response;let t="";""!=(t=""==e.data.prop_id?"鱼丸x"+e.data.silver:e.data.prop_name+"x"+e.data.prop_count)&&T("【宝箱】获得"+t,"success"),null!=n&&n.remove()}})})}):T("宝箱验证初始化失败","error")}else if("领取失败"!=t.data.msg&&"验证码不正确"!=t.data.msg){let e="";""!=(e=""==t.data.prop_id?"鱼丸x"+t.data.silver:t.data.prop_name+"x"+t.data.prop_count)&&T("【宝箱】获得"+e,"success")}else T("【宝箱】领取失败","error")}})}let bo=!1,vo={},xo={},wo={},_o=0,ko,Eo=!1;function Bo(){var e=vo;localStorage.setItem("ExSave_Vote",JSON.stringify(e))}function Io(){for(var e in wo){var e=wo[e],t=document.getElementsByClassName("vote__option-num")[e.index],o=document.getElementsByClassName("vote__progress-bar")[e.index],n=String(Number(100*Number(e.num/_o)).toFixed(1))+"%";t.innerText=e.num+`（${n}）`,o.style.width=n}}let To=[],Co={},So="",Mo=!1,No=0;async function Lo(){100<Object.keys(Co).length&&(Co={});let t="";var o=await new Promise((t,o)=>{GM_xmlhttpRequest({method:"GET",url:"https://www.douyu.com/lapi/interact/lottery/getHallList",responseType:"json",onload:e=>{e=e.response;t(e)},onerror:e=>{o(e)}})});if(o.data.list){for(let e=0;e<o.data.list.length;e++){var n,i,a,r=o.data.list[e];0===r.status&&(a="command_content"in(i=(n=await(e=>new Promise((t,o)=>{fetch("https://www.douyu.com/member/lottery/activity_info?room_id="+e,{method:"GET",mode:"no-cors",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded"}}).then(e=>e.json()).then(e=>{t(e)}).catch(e=>{o(e)})}))(r.room_id)).data.join_condition)?"发送弹幕":`赠送 ${i.gift_name}（${i.gift_price}）x`+i.gift_num,l=Number(n.data.start_at)+Number(n.data.join_condition.expire_time),l=1e3*l,s=(new Date).getTime(),c=d=void 0,s=-1==(s=l<s?-1:(d="",c=(s=(l=Math.abs(l-s))%864e5)%36e5,(d=(d=(d+=0<(l=Math.floor(l/864e5))?l+"天":"")+(0<(l=Math.floor(s/36e5))?l+"时":""))+(0<(s=Math.floor(c/6e4))?s+"分":""))+(0<(l=Math.round(c%6e4/1e3))?l+"秒":"")))?"已结束":"距结束："+s,(d=-1!==To.indexOf(String(r.room_id))||i.lottery_range<=1)&&Mo&&((c=n.data.prize_name+"|"+n.data.start_at)in Co||(Co[c]=1)),t+=`

            <a class="lottery__a" href="https://www.douyu.com/${r.room_id}" target="_blank">

                <div class="lottery__item">

                    <div class="lottery__img">

                        <div class="lottery__anchor">${r.anchor_name}</div>

                        <img loading="lazy" src="${r.verticalSrc}"/>

                        <div class="lottery__expireTime">${s}</div>

                    </div>

                    <div class="lottery__info">

                        <div class="lottery__prize">${n.data.prize_name}x${n.data.prize_num}</div>

                        <div class="lottery__jointext">${a}</div>

                        <div style="color:${d?"#64ce83":"#e74c3c"}" class="lottery__condition">${(e=>{let t="";switch(e.lottery_range){case 0:t="所有人可参与";break;case 1:t="关注主播";break;case 2:t="成为粉丝";break;case 3:t="关注主播+成为粉丝"}return t})(i)}</div>

                    </div>

                </div>

            </a>

        `)}var l,s,d,c,e=document.getElementsByClassName("lottery__nodata")[0],e=(""!==t.trim()?e.style.display="none":e.style.display="block",So=t,document.getElementsByClassName("lottery__wrap")[0]);e&&(e.innerHTML=So)}}let Ao="ExSave_MonthCost",Do="ExSave_MonthCost_SeeStatus",jo=0,Po=[],zo='<svg t="1619141525444" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4635" width="16" height="16" style="/* display: inline-block; */"><path d="M1009.592 531.212C863.184 730.624 696.96 832 512 832c-184.96 0-351.184-101.376-497.592-300.788C10.384 525.864 8 519.212 8 512s2.384-13.864 6.408-19.212C160.816 293.376 327.04 192 512 192c184.96 0 351.184 101.376 497.592 300.788 4.024 5.348 6.408 12 6.408 19.212s-2.384 13.864-6.408 19.212zM512 768c156.864 0 300.54-84.332 432.012-256C812.54 340.332 668.864 256 512 256c-156.864 0-300.54 84.332-432.012 256C211.46 683.668 355.136 768 512 768z m0-64c-106.04 0-192-85.96-192-192s85.96-192 192-192 192 85.96 192 192-85.96 192-192 192z m0-64c70.692 0 128-57.308 128-128s-57.308-128-128-128-128 57.308-128 128 57.308 128 128 128z" p-id="4636" fill="#707070"></path></svg>',Oo='<svg t="1619143157694" class="icon" viewBox="0 0 1186 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1733" width="16" height="16"><path d="M591.707784 915.740462A642.870487 642.870487 0 0 1 2.965954 526.459025a39.298888 39.298888 0 0 1 0-28.91805 632.489649 632.489649 0 0 1 584.292899-388.539948h8.897862a630.265183 630.265183 0 0 1 584.292899 388.539948 39.298888 39.298888 0 0 1 0 28.91805 637.680068 637.680068 0 0 1-336.635757 337.377245 646.577929 646.577929 0 0 1-252.106073 51.904192zM77.856287 512.370744a565.755688 565.755688 0 0 0 1026.961505 0 556.116338 556.116338 0 0 0-508.661077-329.220872h-8.897862a556.857827 556.857827 0 0 0-509.402566 329.220872z" p-id="1734" fill="#707070"></path><path d="M590.966296 732.592814a218.739093 218.739093 0 1 1 222.446535-218.739093 218.739093 218.739093 0 0 1-222.446535 218.739093z m0-362.587852a144.590248 144.590248 0 1 0 148.29769 143.848759 148.29769 148.29769 0 0 0-148.29769-143.848759z" p-id="1735" fill="#707070"></path><path d="M1137.443284 1023.997776a37.074423 37.074423 0 0 1-24.469119-8.897862L20.761677 65.253208A37.074423 37.074423 0 0 1 68.958426 8.900086l1092.212489 946.880752a37.074423 37.074423 0 0 1 0 52.64568 35.591446 35.591446 0 0 1-23.727631 15.571258z" p-id="1736" fill="#707070"></path></svg>',Ro=0;function Fo(){return document.getElementById("monthcost__money")}function Ho(){return document.getElementsByClassName("monthcost__icon")[0]}function Go(){var e=Ho(),t=Fo();e&&t&&(1===Ro?e.innerHTML=zo:(t.innerText="***",e.innerHTML=Oo),Wo())}function Vo(e){return new Promise(t=>{fetch(e,{method:"GET",mode:"no-cors",credentials:"include"}).then(e=>e.json()).then(e=>{t(e)}).catch(()=>{t({error:-1,data:[]})})})}async function qo(){o=new Date,e=o.getMonth(),t=o.getFullYear(),t=new Date(t,e,1);var e,t,o,[n,i]=[Math.round(new Date(t).getTime()/1e3).toString(),Math.round(o.getTime()/1e3).toString()],[a,r]=(e=new Date,t=e.getMonth(),o=e.getFullYear(),o=new Date(o,t,1),[(t=e=>e.getFullYear()+`-${(e.getMonth()+1).toString().padStart(2,"0")}-`+e.getDate().toString().padStart(2,"0"))(o),t(e)]);let l=[],s=!0,d=0;for(;s;){let e=`https://www.douyu.com/wjapi/nc/exchange/consume/giftList?queryType=0&consumeType=0&startDate=${n}&endDate=${i}&tradeStartDate=${a}&tradeEndDate=${r}&direction=`+1;0!==d&&(e+="&id="+d);var c=await Vo(e);1e3==c.error?await new Promise(e=>setTimeout(e,2e3)):(c=c&&c.data||[],l=l.concat(c),c.length<20?s=!1:d=c[c.length-1].id)}var p,m,u={};for(p of l){var g=Math.abs(p.amount),h=(jo+=g,p.consumeTypeDesc||"其他");u[h]||(u[h]=0),u[h]+=g}for(m in u)Po.push({title:m,money:u[m]})}async function Uo(){jo=0,Po=[],await qo();{let e=1;var n=[];let t=!0;for(var i=new Date,a=i.getMonth(),r=i.getFullYear();t;){var l,s=((await Vo("https://www.douyu.com/japi/interactnc/web/dFansbadge/myLogs?type=0&page="+e)||{}).data||{}).list||[];for(l of s){var d=new Date(1e3*l.consumeTime);d.getMonth()===a&&d.getFullYear()===r&&n.push(l)}if(!s[s.length-1])break;var c=new Date(1e3*s[s.length-1].consumeTime);s.length<20||c.getMonth()!==a||c.getFullYear()!==r?t=!1:e++}let o=0;for(let e of n)o+=Math.abs(e.consumeMoney);0<o&&Po.push({title:"钻粉充值/续费",money:o}),jo+=o}await 0;{let e={monthCost:jo,updateTime:(new Date).getTime(),typeDetail:Po},t=localStorage.getItem(Ao);if(null!==t)try{t=JSON.parse(t)}catch(e){t={}}else t={};t[I]=e,localStorage.setItem(Ao,JSON.stringify(t))}Wo();i=Fo();i&&(i.innerText=String(jo/100))}function Wo(){var e=document.getElementsByClassName("month-cost")[0];if(e)if(1===Ro&&0<Po.length){let t="数据每日更新，根据个人中心消费数据统计。\n--- ---\n";Po.forEach(e=>{t+=`${e.title}: ${String(e.money/100)} 元\n`}),e.title=t}else e.title="数据每日更新，根据个人中心消费数据统计。"}function Yo(){if(1===Ro){let e=1;var t,o=(new Date).getDate(),n=(()=>{let t=localStorage.getItem(Ao);if(null!==t)try{t=JSON.parse(t)}catch(e){t={}}else t={};return t})();I in n?(n=n[I],e=Math.abs(o-new Date(n.updateTime).getDate()),o=n.monthCost,n=n.typeDetail||[],(t=Fo())&&(t.innerText=String(o/100)),Po=n,Wo()):(t=Fo())&&(t.innerHTML='<span class="PlayerToolbar-dataLoadding"></span>'),1<=e&&Uo()}}let Qo='<svg t="1587640254282" class="icon" viewBox="0 0 1055 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5670" width="26" height="26"><path d="M388.06497 594.013091c-96.566303-167.253333-39.067152-381.889939 128.217212-478.487273a348.656485 348.656485 0 0 1 256.248242-36.864C623.491879-5.306182 435.417212-11.170909 276.542061 80.616727 37.236364 218.763636-44.776727 524.815515 93.401212 764.152242c138.146909 239.305697 444.198788 321.318788 683.535515 183.140849 158.875152-91.725576 247.870061-257.520485 249.669818-428.559515a348.656485 348.656485 0 0 1-160.085333 203.496727c-167.253333 96.566303-381.889939 39.036121-478.487273-128.217212" p-id="5671" fill="#8a8a8a"></path></svg>',Jo='<svg t="1587640423416" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2270" width="26" height="26"><path d="M270.016 197.248l-83.84-84.544-69.76 70.464 83.776 84.544 69.76-70.4zM139.648 465.024H0v93.888h139.648V465.024zM558.528 0H465.472v136.192h93.056V0z m349.056 183.168l-69.76-70.464-83.84 84.544L819.2 263.04l88.384-79.872z m-153.6 643.584l83.84 84.48 65.28-65.728L819.2 760.96l-65.216 65.792z m130.368-267.84H1024V465.024h-139.648v93.888zM512.064 230.08C358.4 230.08 232.768 356.992 232.768 512c0 155.008 125.632 281.856 279.296 281.856 153.6 0 279.232-126.848 279.232-281.856 0-154.944-125.632-281.856-279.232-281.856zM465.472 1024h93.056v-136.256H465.472V1024z m-349.056-183.232l69.76 70.4 83.84-84.48L204.8 760.96 116.48 840.768z" p-id="2271" fill="#8a8a8a"></path></svg>',Zo=0;function Xo(){var e={mode:Zo};localStorage.setItem("ExSave_Mode",JSON.stringify(e))}function Ko(){!document.getElementsByClassName("live-next-body")[0]&&tl("Ex_Style_NightMode","/* [DouyuEx-Lite] 夜间样式已剥离 */")}function $o(){var e,t,o,n=document.getElementsByClassName("BottomGroup")[0].getElementsByTagName("iframe")[0];null!=n&&(n=n.contentWindow.document,e="Ex_Style_NightModeIframe",t="/* [DouyuEx-Lite] 鱼吧夜间样式已剥离 */",null==n.getElementById(e))&&((o=n.createElement("style")).id=e,o.innerHTML=t,n.body.append(o))}var D=[];function en(e,t,o){switch(o){case"Douyu":nn(e,t);break;case"Bilibili":g=e,Vr(h=t,"1",0,e=>{if(""!=e||null!=e){var t=document.createElement("div"),o="",o=(t.id="exVideoDiv"+String(g),t.rid=h,t.className="exVideoDiv",o=(o=(o=(o=(o=(o=(o=(o+="<div class='exVideoInfo' id='exVideoInfo"+String(g)+"'><a title='进入直播间' target='_blank' href='https://live.bilibili.com/"+h+"'><span class='exVideoRID' id='exVideoRID"+String(g)+"' style='color:white'>Bilibili - "+h+"</span></a>")+("<select class='exVideoQn' id='exVideoQn"+String(g)+"'><option value='1'>流畅</option><option value='2'>高清</option><option value='3'>超清</option><option value='4'>蓝光</option><option value='5'>原画</option></select>"))+("<select class='exVideoCDN' id='exVideoCDN"+String(g)+"'><option value='1'>主线路</option><option value='2'>备用线路1</option><option value='3'>备用线路2</option><option value='4'>备用线路3</option></select>"))+`<input id='exVideoEmbed${String(g)}' type='button' value='    ' style='height:30px;'>`)+`<input id='exVideoUnEmbed${String(g)}' type='button' value='恢复视频' style='height:30px;display:none;'>`)+`<input id='exVideoCopy${String(g)}' type='button' value='复制直播流' style='height:30px;'>`)+("<a><div class='exVideoClose' id='exVideoClose"+String(g)+"'>X</div></a>")+"</div>")+("<video controls='controls' class='exVideoPlayer' id='exVideoPlayer"+String(g)+"'></video><div class='exVideoScale' id='exVideoScale"+String(g)+"'></div>"),t.innerHTML=o,E([".layout-Main",".playerWrap__8wGvw",".live-next-body"]));o.insertBefore(t,o.childNodes[0]),on(g),tn(g);{var p=g;var m=h;let e=document.getElementById("exVideoDiv"+String(p)),t=document.getElementById("exVideoPlayer"+String(p)),o=document.getElementById("exVideoInfo"+String(p)),n=document.getElementById("exVideoScale"+String(p)),i=(t.onclick=function(e){e.stopPropagation(),e.preventDefault(),"block"!=n.style.display?(n.style.display="block",o.style.display="block"):(n.style.display="none",o.style.display="none");for(let e=0;e<D.length;e++){var t=document.getElementById("exVideoDiv"+String(e));null!=t&&(e==p?t.style.zIndex=1016:t.style.zIndex=1428)}},document.getElementById("exVideoQn"+String(p))),a=document.getElementById("exVideoCDN"+String(p)),r=document.getElementById("exVideoClose"+String(p)),l=document.getElementById("exVideoEmbed"+String(p)),s=document.getElementById("exVideoUnEmbed"+String(p)),d=document.getElementById("__video2"),c=(i.onchange=function(){Vr(m,i.value,a.value,e=>{D[p].destroy(),f(p,e)})},a.onchange=function(){Vr(m,i.value,a.value,e=>{D[p].destroy(),f(p,e)})},r.onclick=function(){d.style.display="block",D[p].destroy(),t.remove(),e.remove()},l.onclick=function(){d.style.display="none",l.style.display="none",s.style.display="inline",e.style.height="0px",d.parentElement.insertBefore(t,d)},s.onclick=function(){d.style.display="block",s.style.display="none",l.style.display="inline",e.style.height="250px",e.insertBefore(t,e.childNodes[e.childNodes.length-1])},document.getElementById("exVideoCopy"+String(p)));c.onclick=function(){Vr(m,i.value,a.value,e=>{GM_setClipboard(e),T("复制成功","success")})}}f(g,e)}});break;case"Huya":var n=String(t).split("/");m=e,u=n[n.length-1],i=n[n.length-1],Ur(u,"1",(e,t)=>{if(""!=e||null!=e)if(""!=t)T(t,"error");else{var t=document.createElement("div"),o="",o=(t.id="exVideoDiv"+String(m),t.rid=u,t.className="exVideoDiv",o=(o=(o=(o=(o=(o=(o+="<div class='exVideoInfo' id='exVideoInfo"+String(m)+"'><a title='进入直播间' target='_blank' href='"+u+"'><span class='exVideoRID' id='exVideoRID"+String(m)+"' style='color:white'>Huya - "+i+"</span></a>")+("<select class='exVideoQn' id='exVideoQn"+String(m)+"'><option value='1'>流畅</option><option value='2'>超清</option><option value='3'>蓝光4M</option><option value='4'>原画</option></select>"))+`<input id='exVideoEmbed${String(m)}' type='button' value='嵌入视频' style='height:30px;'>`)+`<input id='exVideoUnEmbed${String(m)}' type='button' value='恢复视频' style='height:30px;display:none;'>`)+`<input id='exVideoCopy${String(m)}' type='button' value='复制直播流' style='height:30px;'>`)+("<a><div class='exVideoClose' id='exVideoClose"+String(m)+"'>X</div></a>")+"</div>")+("<video controls='controls' class='exVideoPlayer' id='exVideoPlayer"+String(m)+"'></video><div class='exVideoScale' id='exVideoScale"+String(m)+"'></div>"),t.innerHTML=o,E([".layout-Main",".playerWrap__8wGvw",".live-next-body"]));o.insertBefore(t,o.childNodes[0]),on(m),tn(m);{var c=m;var p=u;let e=document.getElementById("exVideoDiv"+String(c)),t=document.getElementById("exVideoPlayer"+String(c)),o=document.getElementById("exVideoInfo"+String(c)),n=document.getElementById("exVideoScale"+String(c)),i=document.getElementById("exVideoEmbed"+String(c)),a=document.getElementById("exVideoUnEmbed"+String(c)),r=(t.onclick=function(e){e.stopPropagation(),e.preventDefault(),"block"!=n.style.display?(n.style.display="block",o.style.display="block"):(n.style.display="none",o.style.display="none");for(let e=0;e<D.length;e++){var t=document.getElementById("exVideoDiv"+String(e));null!=t&&(e==c?t.style.zIndex=1016:t.style.zIndex=1428)}},document.getElementById("exVideoQn"+String(c))),l=document.getElementById("exVideoClose"+String(c)),s=document.getElementById("__video2"),d=(r.onchange=function(){Ur(p,r.value,(e,t)=>{""!=t?T(t,"error"):(D[c].destroy(),f(c,e))})},l.onclick=function(){s.style.display="block",D[c].destroy(),t.remove(),e.remove()},document.getElementById("exVideoCopy"+String(c)));d.onclick=function(){Ur(p,r.value,(e,t)=>{""!=t?T(t,"error"):(GM_setClipboard(e),T("复制成功","success"))})},i.onclick=function(){s.style.display="none",i.style.display="none",a.style.display="inline",e.style.height="0px",s.parentElement.insertBefore(t,s)},a.onclick=function(){s.style.display="block",a.style.display="none",i.style.display="inline",e.style.height="250px",e.insertBefore(t,e.childNodes[e.childNodes.length-1])}}f(m,e)}});break;default:nn(e,t)}var m,u,i,g,h}function f(e,t){if("undefined"==typeof flvjs)return void ExLoadLib(EXURL.flv,()=>f(e,t));var o;flvjs.isSupported()&&(o=document.getElementById("exVideoPlayer"+String(e)),t=flvjs.createPlayer({type:"flv",url:t},{fixAudioTimestampGap:!1}),e>D.length-1?D.push(t):D[e]=t,t.attachMediaElement(o),t.load(),t.play())}function tn(e){let i=document.getElementById("exVideoDiv"+String(e));document.getElementById("exVideoScale"+String(e)).onmousedown=function(e){e.stopPropagation(),e.preventDefault();let t={w:i.offsetWidth,h:i.offsetHeight,x:e.clientX,y:e.clientY},o,n;document.onmousemove=function(e){e.stopPropagation(),e.preventDefault(),o=Math.max(400,e.clientX-t.x+t.w),n=Math.max(0,e.clientY-t.y+t.h),o=o>=document.offsetWidth-i.offsetLeft?document.offsetWidth-i.offsetLeft:o,n=n>=document.offsetHeight-i.offsetTop?document.offsetHeight-i.offsetTop:n,i.style.width=o+"px",i.style.height=n+"px"},document.onmouseup=function(e){e.stopPropagation(),e.preventDefault(),document.onmousemove=null,document.onmouseup=null}}}function on(e){let a=document.getElementById("exVideoDiv"+String(e));a.onmousedown=function(e){e.stopPropagation();let t=e.clientX-a.offsetLeft,o=e.clientY-a.offsetTop,n,i;document.onmousemove=function(e){e.stopPropagation(),n=e.clientX-t,i=e.clientY-o,a.style.left=n+"px",a.style.top=i+"px"},document.onmouseup=function(e){e.stopPropagation(),document.onmousemove=null,document.onmouseup=null}}}function nn(i,a){qr(a,!0,0,"1",t=>{if(""!=t||null!=t)if("None"==t)T("房间未开播或其他错误","error");else{var o=String(t).split("/live");let e="";0<o.length&&(e=o[0]);var o=document.createElement("div"),n="",n=(o.id="exVideoDiv"+String(i),o.rid=a,o.className="exVideoDiv",n=(n=(n=(n=(n=(n=(n=(n=(n+="<div class='exVideoInfo' id='exVideoInfo"+String(i)+"'><a title='进入直播间' target='_blank' href='https://www.douyu.com/"+a+"'><span class='exVideoRID' id='exVideoRID"+String(i)+"' style='color:white'>斗鱼 - "+a+"</span></a>")+("<select class='exVideoQn' id='exVideoQn"+String(i)+"'><option value='2'>高清</option><option value='3'>超清</option><option value='4'>蓝光4M</option><option value='8'>蓝光8M</option></option><option value='0'>原画</option></select>"))+("<select style='display:none' class='exVideoCDN' id='exVideoCDN"+String(i)+"'><option value='1'>主线路</option><option value='2'>备用线路5</option><option value='3'>备用线路6</option></select>"))+("<a style='margin-left:5px' href='"+e+"' target='_blank'>无视频？</a>"))+`<input id='exVideoEmbed${String(i)}' type='button' value='嵌入视频' style='height:30px;'>`)+`<input id='exVideoUnEmbed${String(i)}' type='button' value='恢复视频' style='height:30px;display:none;'>`)+`<input id='exVideoCopy${String(i)}' type='button' value='复制直播流' style='height:30px;'>`)+("<a><div class='exVideoClose' id='exVideoClose"+String(i)+"'>X</div></a>")+"</div>")+("<video controls='controls' class='exVideoPlayer' id='exVideoPlayer"+String(i)+"'></video><div class='exVideoScale' id='exVideoScale"+String(i)+"'></div>"),o.innerHTML=n,E([".layout-Main",".playerWrap__8wGvw",".live-next-body"]));n.insertBefore(o,n.childNodes[0]),on(i),tn(i),an(i,a),f(i,t)}})}function an(o,e){let t=document.getElementById("exVideoDiv"+String(o)),n=document.getElementById("exVideoPlayer"+String(o)),i=document.getElementById("exVideoInfo"+String(o)),a=document.getElementById("exVideoScale"+String(o)),r=document.getElementById("exVideoEmbed"+String(o)),l=document.getElementById("exVideoUnEmbed"+String(o)),s=document.getElementById("__video2"),d=(n.onclick=function(e){e.stopPropagation(),e.preventDefault(),"block"!=a.style.display?(a.style.display="block",i.style.display="block"):(a.style.display="none",i.style.display="none");for(let e=0;e<D.length;e++){var t=document.getElementById("exVideoDiv"+String(e));null!=t&&(e==o?t.style.zIndex=1016:t.style.zIndex=1428)}},document.getElementById("exVideoQn"+String(o)));var c=document.getElementById("exVideoCDN"+String(o)),p=document.getElementById("exVideoClose"+String(o));d.onchange=function(){qr(e,!0,0,d.value,e=>{D[o].destroy(),f(o,e)})},c.onchange=function(){qr(e,!0,0,d.value,e=>{D[o].destroy(),f(o,e)})},p.onclick=function(){s.style.display="block",D[o].destroy(),n.remove(),t.remove()};let m=document.getElementById("exVideoCopy"+String(o))||document.getElementById("exVideoRID"+String(o));m&&(m.onclick=function(){qr(e,!m.innerHTML.includes("斗鱼音频流"),0,d.value,e=>{GM_setClipboard(String(e).replace("https","http")),T("复制成功","success")})}),r&&(r.onclick=function(){s.style.display="none",r.style.display="none",l.style.display="inline",t.style.height="0px",s.parentElement.insertBefore(n,s)}),l&&(l.onclick=function(){s.style.display="block",l.style.display="none",r.style.display="inline",t.style.height="250px",t.insertBefore(n,t.childNodes[t.childNodes.length-1])})}function rn(s,e){if(""!=e&&null!=e){var t=document.createElement("div"),o="",o=(t.id="exVideoDiv"+String(s),t.rid=B,t.className="exVideoDiv",o=(o=(o=(o=(o=(o+="<div class='exVideoInfo' id='exVideoInfo"+String(s)+"'><span class='exVideoRID' id='exVideoRID"+String(s)+"' style='color:white'>直播流"+String(s)+"</span>")+`<input id='exVideoEmbed${String(s)}' type='button' value='嵌入视频' style='height:30px;'>`)+`<input id='exVideoUnEmbed${String(s)}' type='button' value='恢复视频' style='height:30px;display:none;'>`)+`<input id='exVideoCopy${String(s)}' type='button' value='复制直播流' style='height:30px;'>`)+("<a><div class='exVideoClose' id='exVideoClose"+String(s)+"'>X</div></a>")+"</div>")+("<video controls='controls' class='exVideoPlayer' id='exVideoPlayer"+String(s)+"'></video><div class='exVideoScale' id='exVideoScale"+String(s)+"'></div>"),t.innerHTML=o,E([".layout-Main",".playerWrap__8wGvw",".live-next-body"]));o.insertBefore(t,o.childNodes[0]),on(s),tn(s),f(s,e);{var d=s;let e=document.getElementById("exVideoDiv"+String(d)),t=document.getElementById("exVideoPlayer"+String(d)),o=document.getElementById("exVideoInfo"+String(d)),n=document.getElementById("exVideoScale"+String(d)),i=document.getElementById("exVideoEmbed"+String(d)),a=document.getElementById("exVideoUnEmbed"+String(d)),r=(t.onclick=function(e){e.stopPropagation(),e.preventDefault(),"block"!=n.style.display?(n.style.display="block",o.style.display="block"):(n.style.display="none",o.style.display="none");for(let e=0;e<D.length;e++){var t=document.getElementById("exVideoDiv"+String(e));null!=t&&(e==d?t.style.zIndex=1016:t.style.zIndex=1428)}},document.getElementById("exVideoClose"+String(d))),l=document.getElementById("__video2");r.onclick=function(){l.style.display="block",D[d].destroy(),t.remove(),e.remove()},i.onclick=function(){l.style.display="none",i.style.display="none",a.style.display="inline",e.style.height="0px",l.parentElement.insertBefore(t,l)},a.onclick=function(){l.style.display="block",a.style.display="none",i.style.display="inline",e.style.height="250px",e.insertBefore(t,e.childNodes[e.childNodes.length-1])}}}}let j={view:"",showtime:1428,danmu_person_count:"",gift_person_count:"",paid_person_count:"",isShow:2,money_yc:0,money_bag:0,money_total:0,noble_count:""},ln=!1;function sn(e){var t=Number(e);return isNaN(t)?e:1e4<=t?(e=t/1e4,Number.isInteger(e)?e+"万":parseFloat(e.toFixed(1))+"万"):String(t)}async function dn(){null!=document.querySelector(".MatchSystemChatRoomEntry")&&(document.querySelector(".MatchSystemChatRoomEntry").style.display="none");e=B;var e,n,t=await new Promise((t,o)=>{GM_xmlhttpRequest({method:"POST",url:"https://www.doseeing.com/xeee/room/aggr",headers:{Connection:"keep-alive","Content-Type":"application/json;charset=UTF-8",Origin:"https://www.doseeing.com",Referer:"https://www.doseeing.com/room/"+e,"User-Agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/91.0.4472.114"},data:`{"m":"${window.btoa(`rid=${e}&dt=0`).split("").reverse().join("")}"}`,responseType:"json",onload:e=>{t(e.response)},onerror:e=>{o(e)}})}),o=(n=B,await new Promise((t,o)=>{fetch("https://www.douyu.com/japi/interactnc/web/fsjk/getCardTaskInfo?rid="+n,{method:"GET",mode:"no-cors",credentials:"include"}).then(e=>e.json()).then(e=>{t(e)}).catch(e=>{o(e)})}));let i=0;i=2==j.isShow||1428==j.showtime?0:Math.floor(Date.now()/1e3)-Number(j.showtime),j.view=t.data["active.uv"]||0,j.danmu_person_count=t.data["chat.uv"]||0,j.gift_person_count=t.data["gift.all.uv"]||0,j.paid_person_count=t.data["gift.paid.uv"]||0,j.money_yc=Number(t.data["gift.paid.price"]/100||0).toFixed(2),j.money_total=Number(t.data["gift.all.price"]/100||0).toFixed(2),document.getElementById("real-audience__total").innerText=j.view,document.getElementById("real-audience__t").title="今日累计活跃人数:"+j.view+" 弹幕人数:"+j.danmu_person_count+" 送礼人数:"+j.gift_person_count+" 付费人数:"+j.paid_person_count,document.getElementById("real-audience__barrage").innerText=j.danmu_person_count,document.getElementById("real-audience__money_yc").innerText=j.money_yc,document.getElementById("real-audience__money").title="总礼物价值:"+j.money_total+" 鱼翅礼物:"+j.money_yc,""!==j.noble_count&&(document.getElementById("real-audience__noble").innerText=sn(j.noble_count)),document.getElementById("real-audience__time").innerText="已播:"+Q(i),document.getElementById("real-audience__time").title="开播时间:"+String(k("yyyy年MM月dd日hh时mm分ss秒 ",new Date(Number(j.showtime+"000"))))+"\n已观看:"+Q(o.data.todayWatch),0==o.error&&(document.getElementById("real-audience__watchtime").innerText="已观看:"+Q(o.data.todayWatch),document.getElementById("real-audience__watchtime").title="开播时间:"+String(k("yyyy年MM月dd日hh时mm分ss秒 ",new Date(Number(j.showtime+"000"))))+"\n已观看:"+Q(o.data.todayWatch))}function cn(){var e=document.getElementById("real-audience__time"),t=document.getElementById("real-audience__watchtime");"none"==e.style.display?(e.style.display="block",t.style.display="none"):(e.style.display="none",t.style.display="block")}function pn(){var e={barrageFrame:{status:"none"==document.getElementsByClassName("layout-Player-rank")[0].style.display},video:{status:fn()},barrage:{status:1==mn}};localStorage.setItem("ExSave_Refresh",JSON.stringify(e))}let mn=0;function un(){tl("Ex_Style_RefreshBarrage",`

    .UserCsgoGameDataMedal,.Barrage-honor,.Barrage-listItem .Barrage-icon,.Barrage-listItem .FansMedal.is-made,.Barrage-listItem .RoomLevel,.Barrage-listItem .Motor,.Barrage-listItem .ChatAchievement,.Barrage-listItem .Barrage-hiIcon,.Barrage-listItem .Medal,.Barrage-listItem .MatchSystemTeamMedal{display:none !important;}

    /*.Barrage-listItem .UserLevel{display:none !important;}*/

    .Barrage-listItem .Baby{display:none !important;}

    .FansMedalWrap{display:none !important;}

    `),mn=1,document.getElementById("refresh-barrage").classList.add("ex-active"),document.getElementById("refresh-barrage__text").style.color="#fff",document.getElementById("refresh-barrage__text").innerText="前缀";var e=document.getElementById("refresh-barrage__svg");e&&(e=e.getElementsByTagName("path")[0])&&e.setAttribute("fill","#ffffff")}let gn=0;function hn(e){var t=document.getElementById("ex-refresh-switch"),o=document.getElementById("ex-refresh-switch-circle");t&&o&&(e?(t.style.background="#f60",o.style.left="14px"):(t.style.background="rgba(255,255,255,0.3)",o.style.left="2px"))}function fn(){return"hidden"==document.getElementsByClassName("PlayerToolbar-ContentRow")[0].style.visibility}function yn(){tl("Ex_Style_VideoRefresh",`

    .PELact,.pushTower-wrapper-gf1HG,.PkView-9f6a2c,.MorePk,.RandomPKBar,.LiveRoomLoopVideo,.LiveRoomDianzan,.maiMaitView-68e80c,.PkView{display:none !important;}

    `)}function bn(){tl("Ex_Style_RemoveAD",`

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

    `)}let vn=0;function xn(){tl("Ex_Style_RemoveMsgNotice",".UserInfo .Badge,.ChatLetter-PopUnread{display:none!important;}")}function wn(){var t=kn(window.location.href),o=new URLSearchParams(window.location.search).get("exRestore");if(o&&t!==(o=Number(o))){{var s=t;var d=o;let e=["web/group/head","/follow/topic","group/unfollowGroup"];function c(t){return"string"==typeof t&&e.some(e=>t.includes(e))}let a=unsafeWindow.XMLHttpRequest.prototype.open,r=unsafeWindow.XMLHttpRequest.prototype.send,l=(unsafeWindow.XMLHttpRequest.prototype.open=function(e,t,o,n,i){return"string"==typeof t&&t.includes(s)&&!c(t)&&(t=t.replace(new RegExp(s,"g"),d)),a.call(this,e,t,o,n,i)},unsafeWindow.XMLHttpRequest.prototype.send=function(e){var t=this.responseURL||this._url||"";if(!c(t))if(e&&"string"==typeof e&&e.includes(s))e=e.replace(new RegExp(s,"g"),d);else if(e&&e instanceof FormData){var o,n=new FormData;for(o of e.entries()){var i=o[0];let e=o[1];"string"==typeof e&&e.includes(s)&&(e=e.replace(new RegExp(s,"g"),d)),n.append(i,e)}e=n}return r.call(this,e)},unsafeWindow.fetch);unsafeWindow.fetch=function(e,t){let o="";if("string"==typeof e?(o=e).includes(s)&&!c(e)&&(e=e.replace(new RegExp(s,"g"),d)):e instanceof Request&&(o=e.url).includes(s)&&!c(o)&&(e=new Request(o.replace(new RegExp(s,"g"),d),e)),!c(o)&&t&&t.body)if("string"==typeof t.body&&t.body.includes(s))t.body=t.body.replace(new RegExp(s,"g"),d);else if(t.body instanceof FormData){var n,i=new FormData;for(n of t.body.entries()){var a=n[0];let e=n[1];"string"==typeof e&&e.includes(s)&&(e=e.replace(new RegExp(s,"g"),d)),i.append(a,e)}t.body=i}return l.call(unsafeWindow,e,t)}}(async o=>{if(o=await(e=>new Promise(t=>{fetch("https://yuba.douyu.com/wbapi/web/group/managersdetail?group_id="+e).then(e=>e.json()).then(e=>{t(e)}).catch(()=>{t(null)})}))(o)){o=o.data.generalOP[0];let e=o.avatar,t=o.nick_name;function n(){document.querySelector(".groupavatar__9mD1S .image__GNnZC").src=e,document.getElementsByClassName("groupname__BUzOM")[0].innerText=t,document.getElementsByClassName("groupdesc__b8-53")[0].innerText=t+"的鱼吧",document.title=t+"的鱼吧"}n(),new q(".groupavatar__9mD1S",!1,()=>{n()})}})(o)}}function _n(){let t=kn(window.location.href);var e;t&&(e=t,new Promise((t,o)=>{fetch("https://yuba.douyu.com/wbapi/web/group/head?group_id="+e).then(e=>e.json()).then(e=>{t(e)}).catch(e=>{o(e)})}).then(e=>{3002==e.status_code&&(e="https://yuba.douyu.com/discussion/4815048/posts?exRestore="+t,window.location.href=e)}))}function kn(e){e=e.match(/\/discussion\/(\d+)/);return e&&e[1]?e[1]:null}let En=5;let Bn=!!(n=localStorage.getItem("ExSave_isRemoveDanmakuBackground"))&&1===Number(n);function In(){document.getElementsByClassName("FilterKeywords")[0].insertAdjacentHTML("afterbegin",`<div class="FilterSwitchStatus" id="ex-removeDanmakuBackground">

    <h3>屏蔽弹幕背景</h3>

    <div>

      <span class="FilterSwitchStatus-status ${Bn?"is-checked":"is-noChecked"}">${Bn?"已开启":"未开启"}</span>

      <span class="FilterSwitchStatus-switch ${Bn?"is-checked":"is-noChecked"}">

        <span class="FilterSwitchStatus-switch-inner"></span>

      </span>

    </div>

  </div>`);var e=document.getElementById("ex-removeDanmakuBackground");let t=e.querySelector(".FilterSwitchStatus-status"),o=e.querySelector(".FilterSwitchStatus-switch");e.addEventListener("click",()=>{(Bn=!Bn)?(Tn(),t.className=t.className.replace("is-noChecked","is-checked"),t.textContent="已开启",o.className=o.className.replace("is-noChecked","is-checked")):(U("Ex_Style_RemoveDanmakuBackground"),t.className=t.className.replace("is-checked","is-noChecked"),t.textContent="未开启",o.className=o.className.replace("is-checked","is-noChecked")),localStorage.setItem("ExSave_isRemoveDanmakuBackground",Bn?1:0)})}function Tn(){tl("Ex_Style_RemoveDanmakuBackground",`

      .danmuItem-a8616a {

        background: none !important;

      }

      .danmuItem-a8616a div{

        background: none;

      }

      .danmuItem-a8616a > img {

        display: none;

      }

      .danmuItem-a8616a div > img {

        display: none;

      }

      .super-text-f60bfa {

        background: none !important;

      }

      .danmuItem-a8616a .noble-d35c82 {

        background: none !important;

      }

      .customBarrage {

        background: none !important;

        text-shadow: none !important;

      }

      .customBarrage > div {

        background: none !important;

      }

      .PlayerCustomBarrage-prefixPlugin--text {

        display: none !important;

      }

  `)}Bn&&Tn(),(t=localStorage.getItem("ExSave_isRemoveDanmakuImage"))&&Number(t);let Cn=!!(n=localStorage.getItem("ExSave_isRemoveEnterBarrage"))&&1===Number(n);function Sn(){var o=document.getElementsByClassName("FilterKeywords")[0],n=window.CSS&&window.CSS.supports&&window.CSS.supports("--enter-display","none");let i=document.getElementById("js-barrage-extend-container");if(null!=o&&n){o.insertAdjacentHTML("afterbegin",`<div class="FilterSwitchStatus" id="ex-removeEnterBarrage">

    <h3>屏蔽进场弹幕</h3>

    <div>

      <span class="FilterSwitchStatus-status ${Cn?"is-checked":"is-noChecked"}">${Cn?"已开启":"未开启"}</span>

      <span class="FilterSwitchStatus-switch ${Cn?"is-checked":"is-noChecked"}">

        <span class="FilterSwitchStatus-switch-inner"></span>

      </span>

    </div>

  </div>`),Cn?i&&i.style.setProperty("--enter-display","none","important"):i&&i.style.setProperty("--enter-display","block","important");n=document.getElementById("ex-removeEnterBarrage");let e=n.querySelector(".FilterSwitchStatus-status"),t=n.querySelector(".FilterSwitchStatus-switch");n.addEventListener("click",()=>{(Cn=!Cn)?(i&&i.style.setProperty("--enter-display","none","important"),e.className=e.className.replace("is-noChecked","is-checked"),e.textContent="已开启",t.className=t.className.replace("is-noChecked","is-checked")):(i&&i.style.setProperty("--enter-display","block","important"),e.className=e.className.replace("is-checked","is-noChecked"),e.textContent="未开启",t.className=t.className.replace("is-checked","is-noChecked")),localStorage.setItem("ExSave_isRemoveEnterBarrage",Cn?1:0)})}}let Mn="1"===localStorage.getItem("ExSave_isRemoveRepeatedDanmaku"),Nn=(()=>{var e=localStorage.getItem("ExSave_repeatedDanmakuSeconds");if(e){e=parseInt(e);if(!isNaN(e)&&1<=e&&e<=60)return e}return 5})(),Ln=null!==(t=localStorage.getItem("ExSave_isEnlargeDanmaku"))&&"1"===t,An={},Dn={},jn={},Pn={},zn=new WeakMap,On=null,Rn=null;function Fn(){document.getElementsByClassName("FilterKeywords")[0].insertAdjacentHTML("afterbegin",`<div class="FilterSwitchStatus" id="ex-removeRepeatedDanmaku">

    <h3>屏蔽重复弹幕</h3>

    <div>

      <span class="FilterSwitchStatus-status ${Mn?"is-checked":"is-noChecked"}">${Mn?"已开启":"未开启"}</span>

      <span class="FilterSwitchStatus-switch ${Mn?"is-checked":"is-noChecked"}">

        <span class="FilterSwitchStatus-switch-inner"></span>

      </span>

    </div>

  </div>

  <p class="FilterKeywords-intelligentText" style="display: flex; align-items: center;justify-content: space-between;">

    <span>

      <input type="number" id="ex-repeatedDanmakuSeconds" min="1" max="300" value="${Nn}" style="width: 38px; height: 14px; text-align: center;" />

      <span>秒内重复的弹幕只显示一次</span>

    </span>

    <label style="margin-left: 10px;display: inline-flex; align-items: center;">

      <input type="checkbox" id="ex-enlargeDanmaku" ${Ln?"checked":""} style="margin-right: 4px;" />

      放大重复弹幕

    </label>

  </p>`);var e=document.getElementById("ex-removeRepeatedDanmaku");let t=e.querySelector(".FilterSwitchStatus-status"),o=e.querySelector(".FilterSwitchStatus-switch"),n=document.getElementById("ex-repeatedDanmakuSeconds"),i=document.getElementById("ex-enlargeDanmaku");n.addEventListener("click",e=>{e.stopPropagation()}),i.addEventListener("click",e=>{e.stopPropagation()}),n.addEventListener("input",()=>{let e=parseInt(n.value);var t;isNaN(e)||e<1?(e=1,n.value=1):300<e&&(e=300,n.value=300),Nn=e,t=e,localStorage.setItem("ExSave_repeatedDanmakuSeconds",t.toString()),Mn&&(Rn&&(Rn.closeHook(),Rn=null),Vn(),Hn())}),i.addEventListener("change",()=>{var e;Ln=i.checked,e=Ln,localStorage.setItem("ExSave_isEnlargeDanmaku",e?"1":"0")}),e.addEventListener("click",()=>{(Mn=!Mn)?(Hn(),t.className=t.className.replace("is-noChecked","is-checked"),t.textContent="已开启",o.className=o.className.replace("is-noChecked","is-checked")):(Rn&&(Rn.closeHook(),Rn=null),Vn(),U("Ex_Style_RemoveRepeatedDanmaku"),U("Ex_Style_RemoveRepeatedDanmaku_Count"),t.className=t.className.replace("is-checked","is-noChecked"),t.textContent="未开启",o.className=o.className.replace("is-checked","is-noChecked"));var e=Mn;localStorage.setItem("ExSave_isRemoveRepeatedDanmaku",e?"1":"0")})}function Hn(){tl("Ex_Style_RemoveRepeatedDanmaku_Count",`

    /* 弹幕计数显示样式 */

    [data-repeat-count]::before {

      content: "x" attr(data-repeat-count);

      font-weight: bold;

      display: inline-block;

      position: absolute;

      right: -18px;

      bottom: 0;

      font-size: 16px;

      font-family: "Helvetica Neue",Helvetica,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","微软雅黑",Arial,sans-serif;

      color: inherit;

    }

    

    /* 计数跳动动画 */

    @keyframes danmaku-combo-bounce {

      0% {

        transform: scale(1);

      }

      50% {

        transform: scale(1.5);

      }

      100% {

        transform: scale(1);

      }

    }

    

    /* 应用动画的类 */

    .danmaku-combo-animation::before {

      animation: danmaku-combo-bounce 0.2s ease-out;

    }

    `);let e=setInterval(()=>{document.querySelector(".danmu-fbb2a3")&&(clearInterval(e),On=On||setInterval(Gn,2e4),Rn=new q(".danmu-fbb2a3",!1,i=>{if(!(i.length<=0)&&Mn)if(i[0].addedNodes.length<=0&&0<i[0].removedNodes.length){var n=i[0].removedNodes[0];let e=n.comment.uuid;var a=n.comment.startTime+n.comment.duration;let t=Date.now();if(t>a)return;Dn[e]=t+1e3*Nn;let o=n.textContent?n.textContent.trim():"";void(o&&jn[o]===n&&(delete jn[o],delete Pn[o],delete An[o]))}else if(!(i[0].addedNodes.length<=0)){a=i[0].addedNodes[0];if(a){let e=Date.now(),t=a.comment.uuid;n=Dn[t];if(!(n&&e<=n)){let n=a.textContent?a.textContent.trim():"";if(n&&0!==n.length){i=An[n];if(i&&e<=i){if(a.className+=" repeated-danmaku",Pn[n]=(Pn[n]||1)+1,Ln){let o=jn[n];o&&o.parentNode?requestAnimationFrame(()=>{var e,t;o.parentNode&&(zn.has(o)||(t=window.getComputedStyle(o),zn.set(o,t.fontSize)),t=zn.get(o),t=parseFloat(t)||20,e=Pn[n],t=Math.min(t+2*(e-1),40),o.style.fontSize=t+"px",o.setAttribute("data-repeat-count",e),o.classList.remove("danmaku-combo-animation"),requestAnimationFrame(()=>{o.parentNode&&o.classList.add("danmaku-combo-animation")}))}):o&&o.parentNode||(delete jn[n],delete Pn[n])}}else An[n]=e+1e3*Nn,jn[n]=a,Pn[n]=1}}}}}))},1e3)}function Gn(){var e,t,o=Date.now();for([e,t]of Object.entries(An))t<=o&&(delete An[e],delete jn[e],delete Pn[e]);for(let[e,t]of Object.entries(Dn))t<=o&&delete Dn[e]}function Vn(){On&&(clearInterval(On),On=null),An={},Dn={},jn={},Pn={}}function qn(){Fn(),Sn(),In()}function Un(e){return-1===e.indexOf("player_barrage")?e:e.replace(/player_barrage\\":0/g,'player_barrage\\":1').replace(/"player_barrage":0/g,'"player_barrage":1')}// ==================== 一键签到模块化纯净执行引擎 ====================
async function executeSignEngine(options, onLog) {
    if (typeof onLog !== "function") onLog = function(msg, isSuccess) { T(msg, isSuccess ? "success" : "info"); };
    var opts = options || { room: true, client: true, yuba: true, fanshome: true, stardiscover: true };

    onLog("正在准备签到环境...", true);

    // 1. 鱼吧签到
    if (opts.yuba) {
        try {
            onLog("正在获取关注鱼吧列表...");
            var followData = await ai(1);
            var groupList = (followData && followData.list) ? followData.list.slice() : [];
            var totalPages = Number((followData && followData.count_page) || 1) - 1;
            for (var p = 0; p < totalPages; p++) {
                var nextFollow = await ai(2 + p);
                if (nextFollow && nextFollow.list) groupList = groupList.concat(nextFollow.list);
            }
            if (groupList.length > 0) {
                var signCount = 0;
                for (var g = 0; g < groupList.length; g++) {
                    var gid = groupList[g].group_id;
                    if (!gid) continue;
                    await new Promise(function(resolve) {
                        GM_xmlhttpRequest({
                            method: "POST",
                            url: "https://yuba.douyu.com/ybapi/topic/sign",
                            data: "group_id=" + gid,
                            responseType: "json",
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded",
                                "dy-client": "pc",
                                "dy-token": m,
                                "Referer": "https://yuba.douyu.com/group/" + gid
                            },
                            onload: function() {
                                signCount++;
                                resolve();
                            },
                            onerror: function() { resolve(); }
                        });
                    });
                    if (g % 3 === 0) await b(120);
                }
                onLog("【鱼吧签到】已打卡 " + signCount + " 个关注鱼吧", true);
            } else {
                onLog("【鱼吧签到】未检测到关注的鱼吧", true);
            }
        } catch(err) {
            onLog("【鱼吧签到】执行异常: " + (err.message || "网络错误"), false);
        }
    }

    // 2. 客户端模拟签到 (领取每日礼盒)
    if (opts.client) {
        try {
            onLog("正在执行【客户端模拟】签到...");
            await new Promise(function(resolve) {
                GM_xmlhttpRequest({
                    method: "POST",
                    url: "https://apiv2.douyucdn.cn/h5nc/sign/sendSign",
                    data: "token=" + m,
                    responseType: "json",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    onload: function(res) {
                        var o = res.response || {};
                        if (o.data && o.data.sign_pl && o.data.sign_pl.length > 0) {
                            var items = o.data.sign_pl.map(function(it) { return it.cnt + "个" + it.name; }).join(", ");
                            onLog("【客户端签到】获得: " + items, true);
                        } else if (o.data && o.data.length === 0) {
                            onLog("【客户端签到】今日已签到", true);
                        } else {
                            onLog("【客户端签到】打卡成功", true);
                        }
                        resolve();
                    },
                    onerror: function() {
                        onLog("【客户端签到】请求失败", false);
                        resolve();
                    }
                });
            });
        } catch(err) {
            onLog("【客户端签到】执行异常", false);
        }
    }

    // 3. 房间与粉丝牌签到
    if (opts.room) {
        try {
            onLog("正在获取关注房间列表...");
            var followRes = await new Promise(function(resolve) {
                fetch("https://www.douyu.com/wgapi/livenc/liveweb/follow/list?page=1428", {
                    method: "GET", mode: "no-cors", cache: "default", credentials: "include"
                }).then(function(r) { return r.json(); }).then(resolve).catch(function() { resolve(null); });
            });
            if (followRes && followRes.data && followRes.data.list) {
                var rooms = followRes.data.list;
                var roomCount = 0;
                for (var ri = 0; ri < rooms.length; ri++) {
                    var rItem = rooms[ri];
                    if (rItem && rItem.room_id) {
                        $n(rItem.room_id);
                        roomCount++;
                    }
                    if (ri % 5 === 0) await b(100);
                }
                onLog("【房间签到】" + roomCount + " 个关注房间签到完毕", true);
            } else {
                onLog("【房间签到】关注列表为空或未登录", false);
            }
        } catch(err) {
            onLog("【房间签到】执行异常", false);
        }
    }

    // 4. 星推日常任务 (榜单曝光打卡与互动积分上报，绝不残留陌生主播关注)
    if (opts.stardiscover) {
        try {
            onLog("正在获取星推榜单与任务...");
            var curRid = String(window.room_id || (window.$ROOM && window.$ROOM.room_id) || (typeof B !== "undefined" ? B : "") || "9999");
            var rankUrl = "https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/rank/info?rid=" + curRid + "&type=5&track=3";
            var rankRes = await new Promise(function(resolve) {
                fetch(rankUrl, { method: "GET", credentials: "include" })
                    .then(function(r) { return r.json(); })
                    .then(resolve)
                    .catch(function() { resolve(null); });
            });
            var rankList = (rankRes && rankRes.data && Array.isArray(rankRes.data.rankItemList)) ? rankRes.data.rankItemList : [];
            if (rankList.length > 0) {
                var ctn = (typeof w === "function" ? w() : "") || "1";
                var csrf = "";
                try {
                    var mCsrf = document.cookie.match(/(^| )post-csrfToken=([^;]*)(;|$)/);
                    csrf = mCsrf ? unescape(mCsrf[2]) : "";
                    if (!csrf) {
                        csrf = Math.random().toString(36).substr(2);
                        document.cookie = "post-csrfToken=" + escape(csrf) + ";path=/";
                    }
                } catch(e) {}

                // (1) 星推签到曝光任务：依次上报前 5 名星推主播
                var reportSuccess = 0;
                for (var si = 0; si < Math.min(5, rankList.length); si++) {
                    var sItem = rankList[si];
                    if (!sItem || !sItem.rid) continue;
                    try {
                        var reportRes = await fetch("https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/report", {
                            method: "POST",
                            credentials: "include",
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded",
                                "dy-csrf-token": csrf
                            },
                            body: "ctn=" + ctn + "&type=5&rid=" + sItem.rid
                        }).then(function(r) { return r.json(); }).catch(function() { return null; });
                        if (reportRes && (reportRes.error === 0 || reportRes.error === "0")) {
                            reportSuccess++;
                        }
                    } catch(e) {}
                    await b(200);
                }
                onLog("【星推签到】完成 " + reportSuccess + " 位星推主播曝光打卡", true);

                // (2) 星推房间互动积分任务：上报进房与停留 (type=1)
                for (var si2 = 0; si2 < Math.min(3, rankList.length); si2++) {
                    var sItem2 = rankList[si2];
                    if (!sItem2 || !sItem2.rid) continue;
                    try {
                        await fetch("https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/report", {
                            method: "POST",
                            credentials: "include",
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded",
                                "dy-csrf-token": csrf
                            },
                            body: "ctn=" + ctn + "&type=1&rid=" + sItem2.rid
                        }).then(function(r) { return r.json(); }).catch(function() { return null; });
                    } catch(e) {}
                    await b(150);
                }
                onLog("【星推任务】星推互动与任务积分上报完毕", true);
            } else {
                onLog("【星推任务】当前无进行中的星推榜单", true);
            }
        } catch(err) {
            onLog("【星推任务】执行异常: " + (err.message || "未知错误"), false);
        }
    }

    // 5. 粉丝家园与钻粉联赛签到
    if (opts.fanshome) {
        try {
            onLog("正在执行【粉丝家园】签到...");
            if (typeof To !== "undefined" && Array.isArray(To)) {
                for (var fi = 0; fi < To.length; fi++) {
                    var trid = To[fi];
                    try {
                        await fetch("https://www.douyu.com/japi/interactnc/web/fanshome/sign", {
                            method: "POST", mode: "no-cors", credentials: "include",
                            headers: { "Content-Type": "application/x-www-form-urlencoded" },
                            body: "ctn=" + w() + "&rid=" + trid
                        });
                        await fetch("https://www.douyu.com/japi/interactnc/web/dfansact/userSign", {
                            method: "POST", mode: "no-cors", credentials: "include",
                            headers: { "Content-Type": "application/x-www-form-urlencoded" },
                            body: "ctn=" + w() + "&rid=" + trid
                        });
                    } catch(e) {}
                }
            }
            onLog("【粉丝家园】签到打卡完毕", true);
        } catch(err) {
            onLog("【粉丝家园】未加入粉丝家园", true);
        }
    }

    onLog("全部已选签到任务执行完毕！", true);
}
window.executeSignEngine = executeSignEngine;

function Wn(e) {
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem("ExSave_SignConfig")); } catch(err) {}
    executeSignEngine(stored);
}

Mn&&Hn();let Yn={};function Qn(e){return new Promise(o=>{fetch(`https://webconf.douyucdn.cn/resource/common/activity/actqzs${e}_w.json`).then(e=>e.text()).then(e=>{let t=e.substring(String("DYConfigCallback(").length,e.length);t=t.substring(0,t.lastIndexOf(")"));try{t=JSON.parse(t),o(t.data.activity_setting.activity_id)}catch(e){o(null)}}).catch(e=>{o(null)})})}function Jn(e){return new Promise(o=>{fetch(`https://webconf.douyucdn.cn/resource/common/activity/cardArena${e}_w.json`).then(e=>e.text()).then(e=>{let t=e.substring(String("DYConfigCallback(").length,e.length);t=t.substring(0,t.lastIndexOf(")"));try{t=JSON.parse(t),o(t.data.activity_setting.activity_id)}catch(e){o(null)}}).catch(e=>{o(null)})})}function Zn(t){let o="";var n=document.cookie.split("; ");for(let e=0;e<n.length;e++){var i=n[e].split("=");t==i[0]&&(o=i[1])}return""==o&&(o=Math.random().toString(36).substr(2),document.cookie="post-csrfToken="+escape(o)+";path=/"),o}function $n(e){GM_xmlhttpRequest({method:"POST",url:"https://apiv2.douyucdn.cn/japi/roomuserlevel/apinc/checkIn?client_sys=android",data:"rid="+e,responseType:"json",headers:{"Content-Type":"application/x-www-form-urlencoded",token:m,aid:"android1"},onload:function(e){}})}let ei=0,ti=0,oi=0,ni={};async function ii(t){var o=await ri(t);for(let e=0;e<o.data.supplementary_cards;e++)await ri(t)}function ai(e){return new Promise(t=>{GM_xmlhttpRequest({method:"GET",url:"https://yuba.douyu.com/wbapi/web/group/myFollow?page="+String(e)+"&limit=30",responseType:"json",headers:{"Content-Type":"application/x-www-form-urlencoded","dy-client":"pc","dy-token":m},onload:function(e){t(e.response.data)}})})}function ri(e){return new Promise(t=>{GM_xmlhttpRequest({method:"POST",url:"https://mapi-yuba.douyu.com/wb/v3/supplement",responseType:"json",headers:{"Content-Type":"application/x-www-form-urlencoded",client:"android",token:m},data:"group_id="+e,onload:function(e){t(e.response)}})})}var P = "2026.09.14.13";let ui=0,gi=null,hi=null,fi=null,yi=0,bi="";function vi(){var e=(()=>{try{var e=document.getElementsByTagName("demand-video-toolbar")[0].shadowRoot.querySelector("share-hover").getAttribute("hashid");if(e)return e}catch(e){}return(e=String(window.location.pathname).split("/"))[e.length-1]})();if(e){let t=bi=e;fetch("https://v.douyu.com/video/video/getVideoUrl?vid="+e,{method:"GET",mode:"no-cors",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded"}}).then(e=>e.json()).then(e=>{t===bi&&(e=v(e.data.viewthumb[0].url,"--","/"),ui=new Date(e.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/,"$1-$2-$3 $4:$5:$6")).getTime())}).catch(e=>{console.log("请求失败!",e)})}}function xi(){var e=document.getElementsByTagName("demand-video")[0].shadowRoot.getElementById("demandcontroller-bar").shadowRoot.querySelector("demand-video-controller-progress").shadowRoot.querySelector("demand-video-controller-preview").getAttribute("showtime");return Number(e).toFixed(0)}function wi(e){var t=document.getElementsByTagName("demand-video")[0].shadowRoot.getElementById("demandcontroller-bar").shadowRoot.querySelector("demand-video-controller-progress").shadowRoot.querySelector("demand-video-controller-preview").shadowRoot.querySelector(".Preview label");t&&(t.style.position="relative",t.style.bottom="60px",t.style.backgroundColor="rgba(0,0,0,0.4)",t.innerHTML=e)}var _i,z,ki,Ei,Bi,o="/* [DouyuEx-Lite] GIF Worker已剥离 */",Ii=URL.createObjectURL(new Blob([o],{type:"application/javascript"}));let Ti=83;function Ci(e,t,o,n){t.getContext("2d").drawImage(e,0,0,t.width,t.height),o.addFrame(t,{copy:!0,delay:n})}function Si(){var e=localStorage.getItem("ExSave_Camera_Hidden");if(e)return e=parseInt(e),Date.now()<e}function Mi(){let o=setInterval(()=>{if(null!=(V=document.getElementsByTagName("demand-video")[0].shadowRoot.getElementById("__video"))&&V.videoWidth){clearInterval(o),Bi=document.getElementsByTagName("demand-video-anchor")[0].shadowRoot.querySelector(".anchor-name").innerText,ki=.25*V.videoWidth,Ei=.25*V.videoHeight,(_i=document.createElement("canvas")).width=ki,_i.height=Ei,(z=document.createElement("canvas")).width=V.videoWidth,z.height=V.videoHeight;var e=document.createElement("div"),t=(e.id="ex-camera",e.title="单击截图 长按录制gif",e.innerHTML=`

    <svg t="1620266708389" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2080" width="38" height="38"><path d="M512 337.371136c-119.543808 0-216.800256 97.255424-216.800256 216.798208 0 119.543808 97.256448 216.800256 216.800256 216.800256s216.800256-97.256448 216.800256-216.800256C728.800256 434.625536 631.543808 337.371136 512 337.371136zM680.479744 554.16832c0 92.911616-75.579392 168.501248-168.479744 168.501248-92.900352 0-168.480768-75.589632-168.480768-168.501248 0-92.923904 75.579392-168.521728 168.480768-168.521728C604.899328 385.646592 680.479744 461.24544 680.479744 554.16832z" p-id="2081" fill="#ffffff"></path><path d="M831.209472 337.349632l-47.167488 0c-13.647872 0-24.751104 11.083776-24.751104 24.707072 0 13.635584 11.103232 24.7296 24.751104 24.7296l47.167488 0c13.646848 0 24.75008-11.094016 24.75008-24.7296C855.959552 348.433408 844.85632 337.349632 831.209472 337.349632z" p-id="2082" fill="#ffffff"></path><path d="M700.505088 171.497472c4.235264 0 6.403072 0.405504 7.232512 0.612352 1.47968 1.514496 4.790272 6.218752 11.717632 20.685824 2.83648 5.910528 8.6272 18.86208 15.888384 35.533824l11.788288 27.063296 29.518848 0 96.535552 0c35.122176 0 63.695872 28.535808 63.695872 63.609856l0 469.933056c0 35.05152-28.573696 63.567872-63.695872 63.567872L150.811648 852.503552c-35.121152 0-63.694848-28.516352-63.694848-63.567872L87.1168 319.0016c0-35.062784 28.573696-63.589376 63.694848-63.589376l99.35872 0 29.110272 0 11.964416-26.537984c4.698112-10.421248 8.416256-19.063808 11.058176-25.70752 9.86112-24.829952 15.207424-30.125056 16.239616-30.974976 0.52736-0.161792 2.64192-0.695296 7.673856-0.695296L700.505088 171.496448M700.505088 126.441472 326.216704 126.441472c-32.519168 0-47.275008 13.479936-65.787904 60.096512-3.180544 7.999488-7.689216 18.122752-10.257408 23.819264l-99.35872 0c-59.96544 0-108.750848 48.738304-108.750848 108.645376l0 469.933056c0 59.894784 48.785408 108.623872 108.750848 108.623872l722.37568 0c59.96544 0 108.751872-48.729088 108.751872-108.623872L981.940224 319.0016c0-59.91936-48.786432-108.665856-108.751872-108.665856l-96.535552 0c-4.458496-10.236928-12.420096-28.372992-16.574464-37.031936C744.823808 141.448192 733.973504 126.441472 700.505088 126.441472L700.505088 126.441472z" p-id="2083" fill="#ffffff"></path></svg>

    <div id="ex-camera-close">×</div>

    `,document.getElementsByClassName("Video")[0]);t.insertBefore(e,t.childNodes[0]);{let e=document.getElementsByTagName("demand-video")[0],t=document.getElementsByClassName("Video")[0],o=document.getElementById("ex-camera"),n=document.getElementById("ex-camera-close"),i=null,a=0,r=0,l,s=0,d=!1;n.addEventListener("click",e=>{e.stopPropagation(),localStorage.setItem("ExSave_Camera_Hidden",Date.now()+31536e7),d=!0,o.style.display="none"}),Ni()||(e.addEventListener("mouseenter",()=>{d||Ni()||(o.style.display="flex",s=setTimeout(()=>{o.style.display="none"},2e3))}),e.addEventListener("mousemove",()=>{d||Ni()||(o.style.display="flex",clearTimeout(s),s=setTimeout(()=>{o.style.display="none"},2e3))}),o.addEventListener("mouseenter",()=>{d||Ni()||(o.style.display="flex",clearTimeout(s))}),e.addEventListener("mouseleave",()=>{o.style.display="none",clearTimeout(s)}),t&&t.addEventListener("mouseleave",()=>{o.style.display="none",clearTimeout(s)}),o.addEventListener("mousedown",e=>{if("ex-camera-close"!==e.target.id){if("undefined"==typeof GIF)return void ExLoadLib(EXURL.gif,()=>T("【录制】GIF引擎已就绪，请再次长按录制","info"));if(clearInterval(a),i&&"function"==typeof i.abort)try{i.abort()}catch(e){}i=null,r=(new Date).getTime(),z.width=V.videoWidth,z.height=V.videoHeight,z.getContext("2d").drawImage(V,0,0,z.width,z.height),l=z.toDataURL("image/png"),i=new GIF({workers:5,quality:3,width:ki,height:Ei,workerScript:Ii}),Ci(V,_i,i,Ti),a=setInterval(()=>{Ci(V,_i,i,Ti)},Ti)}}),o.addEventListener("mouseup",e=>{if("ex-camera-close"!==e.target.id){e=(new Date).getTime();if(clearInterval(a),800<=e-r)T("【录制】正在生成gif...","info"),i.on("finished",e=>{var t=document.createElement("a");let o=URL.createObjectURL(e);t.href=o,t.download=`【${Bi}】`+k("yyyy-MM-dd hh-mm-ss",new Date),document.body.appendChild(t);e=document.createEvent("MouseEvents");e.initEvent("click",!1,!1),t.dispatchEvent(e),document.body.removeChild(t),setTimeout(function(){try{URL.revokeObjectURL(o)}catch(e){}},1500)}),i.render();else{if(i&&"function"==typeof i.abort)try{i.abort()}catch(e){}i=null;var e=document.createElement("a"),t=(e.download=`【${Bi}】`+k("yyyy-MM-dd hh-mm-ss",new Date),e.href=l,document.body.appendChild(e),document.createEvent("MouseEvents"));t.initEvent("click",!1,!1),e.dispatchEvent(t),document.body.removeChild(e)}}}))}}},1e3)}function Ni(){var e=localStorage.getItem("ExSave_Camera_Hidden");if(e)return e=parseInt(e),Date.now()<e}function Li(e){var t=String(parseInt(V.style.width)/2.39)+"px",e=(U("Ex_Style_Cinema"),`

    .layout-Player-videoEntity video{object-fit:${e} !important;height:${t} !important;}

    `);tl("Ex_Style_Cinema",e)}let Ai='<img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjJweCIgaGVpZ2h0PSIyMHB4IiB2aWV3Qm94PSIwIDAgMjIgMjAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8dGl0bGU+am95c291bmQvc2VsZWN0ZWQ8L3RpdGxlPgogICAgPGRlZnM+CiAgICAgICAgPGxpbmVhckdyYWRpZW50IHgxPSI1MCUiIHkxPSIwJSIgeDI9IjUwJSIgeTI9IjEwMCUiIGlkPSJsaW5lYXJHcmFkaWVudC0xIj4KICAgICAgICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iI0YwQ0I5NSIgb2Zmc2V0PSIwJSI+PC9zdG9wPgogICAgICAgICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjRTlCRTgwIiBvZmZzZXQ9IjEwMCUiPjwvc3RvcD4KICAgICAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPC9kZWZzPgogICAgPGcgaWQ9ImpveXNvdW5kL3NlbGVjdGVkIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgICAgICA8ZyBpZD0i57yW57uEIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyLjc4NTc1MCwgMC43MTQyMjUpIiBmaWxsPSJ1cmwoI2xpbmVhckdyYWRpZW50LTEpIiBmaWxsLXJ1bGU9Im5vbnplcm8iPgogICAgICAgICAgICA8cGF0aCBkPSJNMTYuNDI4NiwwIEwxNi40Mjg2LDkuNjQzIEMxNi40Mjg2LDE0LjEzNDU1MjcgMTIuODIzMzY2NywxNy43ODQyODggOC4zNDg5MzYxOCwxNy44NTYxNjk2IEw4LjE4NzE4MTUzLDE3Ljg1NzI1NjEgTDguMTg3MTgxNTMsMTcuODU3MjU2MSBMNy44NTcxLDE3Ljg1NzI1NjEgTDcuODU3MTM4OTYsMTcuODQ5NjQxIEMzLjQ5MjM4MDEzLDE3LjY2MjA3NDQgMCwxNC4wNTMxMzQxIDAsOS42NDMwNSBDMCw1LjExMzExNTA1IDMuNjg0NDAwMiwxLjQyODU1IDguMjE0MjUsMS40Mjg1NSBDOS43MDA3OTkxMywxLjQyODU1IDExLjA5NjI5ODUsMS44MjUzNTUwMiAxMi4zMDA0MTUxLDIuNTE4NjIzMzEgQzEyLjc0OTU2ODcsMS4wNjAxNjYwMSAxNC4xMDgyMjM2LDAgMTUuNzE0MzUsMCBMMTYuNDI4NiwwIFogTTguMjE0MjUsMi40Mjg1NSBDNC4yMzY2OTQ5NiwyLjQyODU1IDEsNS42NjUzODk3OCAxLDkuNjQzMDUgQzEsMTMuNTAwNzUwOCA0LjA0NDc3MzgsMTYuNjYxNzMzMyA3Ljg1NzA4ODk5LDE2Ljg0ODU2NjggTDcuODU3MDYyNTQsMTQuNTc1MDE3IEM2Ljc3Mjk4NjcxLDE0LjQ5NzMxMDMgNS43ODQ2MTcxOSwxNC4wNjg3NDc3IDUuMDA1MTgzMTEsMTMuNDAyNTU3OCBMNC45MjI0NzY5NywxMy4zMzAyNzYyIEw0LjgwNDkyNDY4LDEzLjIyMTc5NDEgQzMuODU5Mjk3NTksMTIuMzIwNjI4MyAzLjI2OTI1LDExLjA0OTU0OTYgMy4yNjkyNSw5LjY0MzAyNSBDMy4yNjkyNSw2LjkxNTg4MjYzIDUuNDg3MTA3NjMsNC42OTgwMjUgOC4yMTQyNSw0LjY5ODAyNSBDOS44MTQwMDc1Niw0LjY5ODAyNSAxMS4yMzg0NTI3LDUuNDYxMjEyMzMgMTIuMTQyNzY0NSw2LjY0MjcxMjE1IEwxMi4xNDI3NjQ1LDMuNTk0NjQ0OTEgQzExLjAxMTU4OTYsMi44NTczNjc2NSA5LjY2MTk5NDQ5LDIuNDI4NTUgOC4yMTQyNSwyLjQyODU1IFogTTguMjE0MjUsNS42OTgwMjUgQzYuMDM5MzkyMzcsNS42OTgwMjUgNC4yNjkyNSw3LjQ2ODE2NzM3IDQuMjY5MjUsOS42NDMwMjUgQzQuMjY5MjUsMTEuNjY5NTM3MyA1LjgwNjQ4MjY0LDEzLjM0NDc0OTggNy43NzU4ODgxNSwxMy41NjM1NjcyIEw3Ljg1NzEsMTMuNTcxNSBMOC4yMTQzNSwxMy41NzE1IEMxMC4zNDk2LDEzLjU3MTUgMTIuMDg2ODUsMTEuODY4IDEyLjE0MTYsOS43NDYgTDEyLjE0MjY0NjgsOS42NDMgTDEyLjE0MjY0NjgsOS4yODIzMzIzMyBDMTEuOTU5ODU4NSw3LjI3NTc1MDI2IDEwLjI2NzQ4MjMsNS42OTgwMjUgOC4yMTQyNSw1LjY5ODAyNSBaIE04LjIxNDI1LDcuNTAwMDI1IEM5LjM5NjE5Mjg0LDcuNTAwMDI1IDEwLjM1Nyw4LjQ2MDkzMzA5IDEwLjM1Nyw5LjY0MzAyNSBDMTAuMzU3LDEwLjgyNDkxNzQgOS4zOTYxNDIzNywxMS43ODU3NzUgOC4yMTQyNSwxMS43ODU3NzUgQzcuMDMyMTgyMTUsMTEuNzg1Nzc1IDYuMDcxNSwxMC44MjQ5OTE5IDYuMDcxNSw5LjY0MzAyNSBDNi4wNzE1LDguNDYwODU4NTUgNy4wMzIxMzE2OSw3LjUwMDAyNSA4LjIxNDI1LDcuNTAwMDI1IFogTTguMjE0MjUsOC41MDAwMjUgQzcuNTg0NDYzNDgsOC41MDAwMjUgNy4wNzE1LDkuMDEzMDk2MjcgNy4wNzE1LDkuNjQzMDI1IEM3LjA3MTUsMTAuMjcyNzMwNyA3LjU4NDQ5MDQyLDEwLjc4NTc3NSA4LjIxNDI1LDEwLjc4NTc3NSBDOC44NDM4NTc2MywxMC43ODU3NzUgOS4zNTcsMTAuMjcyNjMyNiA5LjM1Nyw5LjY0MzAyNSBDOS4zNTcsOS4wMTMxOTQzMyA4Ljg0Mzg4NDU3LDguNTAwMDI1IDguMjE0MjUsOC41MDAwMjUgWiIgaWQ9IuW9oueKtiI+PC9wYXRoPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+" alt="joysound-on"/>',Di='<img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjJweCIgaGVpZ2h0PSIyMHB4IiB2aWV3Qm94PSIwIDAgMjIgMjAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8dGl0bGU+am95c291bmQvbm9ybWFsPC90aXRsZT4KICAgIDxnIGlkPSJqb3lzb3VuZC9ub3JtYWwiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSLnvJbnu4QiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIuNzg1NzUwLCAwLjcxNDIyNSkiIGZpbGw9IiNGRkZGRkYiIGZpbGwtcnVsZT0ibm9uemVybyI+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0xNi40Mjg2LDAgTDE2LjQyODYsOS42NDMgQzE2LjQyODYsMTQuMTM0NTUyNyAxMi44MjMzNjY3LDE3Ljc4NDI4OCA4LjM0ODkzNjE4LDE3Ljg1NjE2OTYgTDguMTg3MTgxNTMsMTcuODU3MjU2MSBMOC4xODcxODE1MywxNy44NTcyNTYxIEw3Ljg1NzEsMTcuODU3MjU2MSBMNy44NTcxMzg5NiwxNy44NDk2NDEgQzMuNDkyMzgwMTMsMTcuNjYyMDc0NCAwLDE0LjA1MzEzNDEgMCw5LjY0MzA1IEMwLDUuMTEzMTE1MDUgMy42ODQ0MDAyLDEuNDI4NTUgOC4yMTQyNSwxLjQyODU1IEM5LjcwMDc5OTEzLDEuNDI4NTUgMTEuMDk2Mjk4NSwxLjgyNTM1NTAyIDEyLjMwMDQxNTEsMi41MTg2MjMzMSBDMTIuNzQ5NTY4NywxLjA2MDE2NjAxIDE0LjEwODIyMzYsMCAxNS43MTQzNSwwIEwxNi40Mjg2LDAgWiBNOC4yMTQyNSwyLjQyODU1IEM0LjIzNjY5NDk2LDIuNDI4NTUgMSw1LjY2NTM4OTc4IDEsOS42NDMwNSBDMSwxMy41MDA3NTA4IDQuMDQ0NzczOCwxNi42NjE3MzMzIDcuODU3MDg4OTksMTYuODQ4NTY2OCBMNy44NTcwNjI1NCwxNC41NzUwMTcgQzYuNzcyOTg2NzEsMTQuNDk3MzEwMyA1Ljc4NDYxNzE5LDE0LjA2ODc0NzcgNS4wMDUxODMxMSwxMy40MDI1NTc4IEw0LjkyMjQ3Njk3LDEzLjMzMDI3NjIgTDQuODA0OTI0NjgsMTMuMjIxNzk0MSBDMy44NTkyOTc1OSwxMi4zMjA2MjgzIDMuMjY5MjUsMTEuMDQ5NTQ5NiAzLjI2OTI1LDkuNjQzMDI1IEMzLjI2OTI1LDYuOTE1ODgyNjMgNS40ODcxMDc2Myw0LjY5ODAyNSA4LjIxNDI1LDQuNjk4MDI1IEM5LjgxNDAwNzU2LDQuNjk4MDI1IDExLjIzODQ1MjcsNS40NjEyMTIzMyAxMi4xNDI3NjQ1LDYuNjQyNzEyMTUgTDEyLjE0Mjc2NDUsMy41OTQ2NDQ5MSBDMTEuMDExNTg5NiwyLjg1NzM2NzY1IDkuNjYxOTk0NDksMi40Mjg1NSA4LjIxNDI1LDIuNDI4NTUgWiBNOC4yMTQyNSw1LjY5ODAyNSBDNi4wMzkzOTIzNyw1LjY5ODAyNSA0LjI2OTI1LDcuNDY4MTY3MzcgNC4yNjkyNSw5LjY0MzAyNSBDNC4yNjkyNSwxMS42Njk1MzczIDUuODA2NDgyNjQsMTMuMzQ0NzQ5OCA3Ljc3NTg4ODE1LDEzLjU2MzU2NzIgTDcuODU3MSwxMy41NzE1IEw4LjIxNDM1LDEzLjU3MTUgQzEwLjM0OTYsMTMuNTcxNSAxMi4wODY4NSwxMS44NjggMTIuMTQxNiw5Ljc0NiBMMTIuMTQyNjQ2OCw5LjY0MyBMMTIuMTQyNjQ2OCw5LjI4MjMzMjMzIEMxMS45NTk4NTg1LDcuMjc1NzUwMjYgMTAuMjY3NDgyMyw1LjY5ODAyNSA4LjIxNDI1LDUuNjk4MDI1IFogTTguMjE0MjUsNy41MDAwMjUgQzkuMzk2MTkyODQsNy41MDAwMjUgMTAuMzU3LDguNDYwOTMzMDkgMTAuMzU3LDkuNjQzMDI1IEMxMC4zNTcsMTAuODI0OTE3NCA5LjM5NjE0MjM3LDExLjc4NTc3NSA4LjIxNDI1LDExLjc4NTc3NSBDNy4wMzIxODIxNSwxMS43ODU3NzUgNi4wNzE1LDEwLjgyNDk5MTkgNi4wNzE1LDkuNjQzMDI1IEM2LjA3MTUsOC40NjA4NTg1NSA3LjAzMjEzMTY5LDcuNTAwMDI1IDguMjE0MjUsNy41MDAwMjUgWiBNOC4yMTQyNSw4LjUwMDAyNSBDNy41ODQ0NjM0OCw4LjUwMDAyNSA3LjA3MTUsOS4wMTMwOTYyNyA3LjA3MTUsOS42NDMwMjUgQzcuMDcxNSwxMC4yNzI3MzA3IDcuNTg0NDkwNDIsMTAuNzg1Nzc1IDguMjE0MjUsMTAuNzg1Nzc1IEM4Ljg0Mzg1NzYzLDEwLjc4NTc3NSA5LjM1NywxMC4yNzI2MzI2IDkuMzU3LDkuNjQzMDI1IEM5LjM1Nyw5LjAxMzE5NDMzIDguODQzODg0NTcsOC41MDAwMjUgOC4yMTQyNSw4LjUwMDAyNSBaIiBpZD0i5b2i54q2Ij48L3BhdGg+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=" alt="joysound-off"/>';function ji(){var e=document.getElementById("vtoolbar-joysound-switch"),t=document.getElementById("vtoolbar-joysound-icon");e&&(unsafeWindow.hasInstalledJoysound&&1==localStorage.getItem("Ex_isJoysound")?(e.classList.add("is-on"),t&&(t.innerHTML=Ai)):(e.classList.remove("is-on"),t&&(t.innerHTML=Di)))}let O=null;let Pi='<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAB2klEQVR4AcyUgXHCMAxF7S7SsglsApMAk0AngU1gE/qeiRxMgFC43jXnH8mK9b9sJflIf3z9P4HT6fQFpoGxA3h6BxBKvIHwAHYB4gewZH5zPCUAwZxsibW46ZhS2qfz9YURmOEYFYB8SpqVY5Kkk5zzJPWXYt/9tPVGBVge5Nuc8yznfETUI1JY8gWxPTGPcIdtjuuhAIvnCMT21/gxJNev5Ew8QuPmMD2PhwIs+QSOFVVabUJUEmNHYqVyJpJjynAnsSaNCUT1JbO7KSQkklj4yP4I/YoxAYnqYh2qNjbD10YBpT/EYo57HmMCkRC2ZF2ITPAdC47ONSIRqDu5K0CCzRKSDl5DSOyBu/C5qG+bk8BNgY48EsqbEgnXlrX2wlczGtsUMxAgwaovybdB6jOwBBugldgmr7o1fif1eIw1AiRZxV1yEnwmmUVoBeHkUQ3IE1cjwNwvFJM8lqZygpJjkqQ+E/qutdlN5am7qkBXvWGbZ7K+H5bVBrlkaxqsFfp1bUm4ulUB4m4T0w9Er8kfkvWZvVcFqEoBt+lb4T/e5l1W/mtyZaqAE7AARQTrR6OoR/ESORztv8hdAH8D/u99K2zey+QDAQMCERvtTpy+hesjeovsVvIPAAAA//+5v3LIAAAABklEQVQDAFMMzjFiZ8i8AAAAAElFTkSuQmCC"/>',zi='<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAs0lEQVR4AeyU3Q2AIAyE1UkcRTfTyXQTR8GW5MgFCCQFXwxELD/HfaRpWKaP248AzrnL9WsPMs8p2rDYIa7wYIBfmxubN6FfAqC9LsMBqKaxmCJULVxqc+g4FgEstI6LAFQszGtz6DgWASy0jgegmrkkRVKKq3TzyxoTE4AI9KltfVlv8fFfDqAbN0rSGHc10Z4DHGIaBCpq6TFgF/OzxTA+ywA1D7mLhdZ5AMjNu5vrpV4AAAD//9kfWOoAAAAGSURBVAMAe2CtMQj8RU0AAAAASUVORK5CYII="/>',Oi=null,R={fontSize:18,speed:2.5,area:"full",trackHeight:28,mergeMode:"combo",lowPowerMode:!1,filterRobotDanmaku:!0,opacity:1,danmakuVisible:!0},Ri=null,Fi=null,Hi=null,Gi=null,i=null,Vi=null,qi=null,Ui=null,Wi=null,Yi=null,Qi=null,Ji=null,Zi=!1,Xi='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="13" width="7" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>',Ki='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M7 10h5.5M7 13h3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',$i='<svg width="24" height="24" viewBox="0 0 1024 1024" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M513.34 831.74C337.03 831.74 193.6 688.31 193.6 512c0-71.09 23.31-138.85 65.53-194.03v51.61c0 17.67 14.33 32 32 32s32-14.33 32-32V239.45c0-5.87-1.59-11.36-4.34-16.09-0.06-0.1-0.11-0.2-0.17-0.3-0.16-0.28-0.34-0.55-0.51-0.82-0.13-0.2-0.26-0.41-0.39-0.61-0.08-0.13-0.17-0.25-0.26-0.37a35.5 35.5 0 0 0-1.58-2.13c-6.81-8.35-16.96-12.35-26.95-11.69h-130c-17.67 0-32 14.33-32 32s14.33 32 32 32h55.35C159.8 339 129.6 423.35 129.6 512c0 51.79 10.15 102.05 30.17 149.38 19.33 45.7 46.99 86.74 82.23 121.97 35.23 35.23 76.27 62.9 121.97 82.23 47.33 20.02 97.59 30.17 149.38 30.17 17.67 0 32-14.33 32-32s-14.34-32.01-32.01-32.01zM855.38 762.3h-51.23c19.81-23 36.93-48.3 50.75-75.22 27.6-53.74 42.18-114.28 42.18-175.08 0-51.79-10.15-102.05-30.17-149.38-19.33-45.7-46.99-86.73-82.23-121.97-35.23-35.23-76.27-62.9-121.97-82.23-47.33-20.02-97.59-30.17-149.38-30.17-17.67 0-32 14.33-32 32s14.33 32 32 32c176.31 0 319.74 143.44 319.74 319.74 0 78.31-27.68 151.61-77.6 209.05l0.24-56.04c0.08-17.67-14.19-32.06-31.86-32.14h-0.14c-17.61 0-31.92 14.24-32 31.86l-0.55 129.43a31.988 31.988 0 0 0 9.32 22.71 31.68 31.68 0 0 0 5.33 4.3c0.02 0.01 0.04 0.02 0.06 0.04 0.48 0.31 0.97 0.61 1.47 0.89l0.15 0.09c0.5 0.28 1 0.54 1.51 0.8 0.03 0.01 0.05 0.03 0.08 0.04 1.64 0.8 3.34 1.46 5.1 1.98 0.01 0 0.02 0.01 0.03 0.01 0.55 0.16 1.1 0.3 1.66 0.43 0.07 0.02 0.15 0.03 0.22 0.05 0.5 0.11 1 0.21 1.5 0.3 0.1 0.02 0.2 0.04 0.3 0.05 0.48 0.08 0.96 0.15 1.44 0.21 0.11 0.01 0.23 0.03 0.34 0.04 0.48 0.05 0.95 0.09 1.43 0.12l0.34 0.03c0.53 0.03 1.07 0.04 1.61 0.05h132.31c17.67 0 32-14.33 32-32s-14.31-31.99-31.98-31.99z"/></svg>';function ea(e){e=e||window.__pip_window__;if(e&&!e.closed){var t=e.document.getElementById("danmaku"),e=e.document.getElementById("combo-container"),o=null==(o=R.opacity)||Number.isNaN(o)?1:Math.min(1,Math.max(.3,o)),n=!1!==R.danmakuVisible;if(t&&(t.style.opacity=String(o),t.style.visibility=n?"visible":"hidden",!n))for(;t.firstChild;)t.removeChild(t.firstChild);e&&(e.style.opacity=String(o),e.style.display=n?"":"none",n||(e.textContent=""))}}function ta(e){var t,e=(e||window.__pip_window__)?.document.getElementById("pip-danmaku-toggle");e&&(t=!1!==R.danmakuVisible,e.textContent="弹",e.title=t?"隐藏弹幕":"显示弹幕",e.classList.toggle("is-off",!t))}function oa(e,t){if(window.__pip_is_active__){window.__pip_is_active__=!1,window.__pip_window__=null,e?.__pip_keydown_handler__&&(e.document.removeEventListener("keydown",e.__pip_keydown_handler__),e.__pip_keydown_handler__=null),sa(),La(!1),Na(!1),Aa(),Ha(),window.__pip_track_state__=[],ja&&(clearInterval(ja),ja=null),Da.clear();try{t&&(t.srcObject=null)}catch(e){}if(e&&!e.closed)try{e.close()}catch(e){}}}function na(e,t=!0){var o,e=e||window.__pip_window__,n=e?.__pip_source_video__||document.getElementById("__video2");t&&window.__pip_is_active__&&(o=e?.document?.getElementById("pip-video"),oa(e,o));try{window.focus()}catch(e){}if(n){try{n.scrollIntoView({block:"nearest",behavior:"smooth"})}catch(e){}!t&&window.__pip_is_active__?aa(n).catch(()=>{}):t&&n.play().catch(()=>{})}}function ia(){var e=Ui;if(null!=Wi&&e&&"function"==typeof e.cancelVideoFrameCallback)try{e.cancelVideoFrameCallback(Wi)}catch(e){}else null!=Wi&&clearTimeout(Wi);Wi=null,Ui=null}async function aa(n){if(!n)return!1;var e=n.paused,t=(await n.play().catch(()=>{}),"0.01"===n.style.getPropertyValue("opacity"));t&&n.style.removeProperty("opacity");try{window.focus()}catch(e){}await new Promise(e=>{let t=!1,o=()=>{t||(t=!0,e())};"function"==typeof n.requestVideoFrameCallback&&n.requestVideoFrameCallback(()=>{n.requestVideoFrameCallback(o)}),setTimeout(o,150)});try{2<=n.readyState&&Yi&&Yi.getContext("2d",{willReadFrequently:!0}).drawImage(n,0,0,2,2)}catch(e){}return t&&n.style.setProperty("opacity","0.01","important"),e&&n.pause(),!0}async function ra(e,t){var o=e?.__pip_source_video__||document.getElementById("__video2");if(!o||!t)return!1;await aa(o);try{var n=t.srcObject;n&&n.getTracks().forEach(e=>e.stop())}catch(e){}let i=null;try{i=o.captureStream()}catch(e){return!1}t.srcObject=i,o.paused?t.pause():await t.play().catch(()=>{});try{e&&!e.closed&&e.focus()}catch(e){}return!0}function la(e,t,o){if(It()){var n=e;if(ia(),n&&window.__pip_is_active__){Ui=n,Yi||((Yi=document.createElement("canvas")).width=2,Yi.height=2);let e=Yi.getContext("2d",{willReadFrequently:!0}),t=()=>{if(window.__pip_is_active__&&Ui===n){try{2<=n.readyState&&e.drawImage(n,0,0,2,2)}catch(e){}Wi="function"==typeof n.requestVideoFrameCallback?n.requestVideoFrameCallback(t):setTimeout(t,200)}};t()}var i=t,a=o,r=(Qi&&(document.removeEventListener("visibilitychange",Qi),Qi=null),Qi=()=>{window.__pip_is_active__&&"visible"===document.visibilityState&&ra(i,a)},document.addEventListener("visibilitychange",Qi),e),l=t,s=o;if(Ji&&(clearTimeout(Ji),Ji=null),"function"==typeof r.requestVideoFrameCallback){let e=performance.now(),t=!1,o=()=>{window.__pip_is_active__&&(e=performance.now(),r.requestVideoFrameCallback(o))},n=(r.requestVideoFrameCallback(o),()=>{window.__pip_is_active__&&(Ji=setTimeout(n,2500),t||r.paused||r.readyState<2||performance.now()-e<4500||(t=!0,ra(l,s).finally(()=>{e=performance.now(),t=!1})))});Ji=setTimeout(n,2500)}}}function sa(){ia(),Qi&&(document.removeEventListener("visibilitychange",Qi),Qi=null),Ji&&(clearTimeout(Ji),Ji=null)}function da(e){var t,e=e||window.__pip_window__;e&&!e.closed&&(t=e.document.getElementById("input-panel"),e=e.document.getElementById("pip-input-field"),t)&&e&&(t.classList.add("active"),e.focus())}function ca(){Ri&&(Ri.closeHook(),Ri=null),document.getElementById("js-player-controlbar")&&(Ri=new q("#js-player-controlbar",!0,ya))}function pa(){var e=document.getElementById("js-player-controlbar");return i&&i.isConnected&&e&&e.contains(i)}function ma(){Fi&&("function"==typeof Fi.closeHook?Fi.closeHook():Fi.disconnect?.(),Fi=null),null!=Gi&&(cancelAnimationFrame(Gi),Gi=null)}function ua(){Fi||pa()||(Fi=new q("body",!0,t=>{if(pa())ma();else{let e=!1;for(var o of t){for(var n of o.addedNodes){if(ga(n)){e=!0,Ca(n);break}if(1===n.nodeType){for(var i of n.children)if(ga(i)){e=!0,Ca(i);break}if(e)break}}if(e)break}e&&ha()}}))}function ga(e){return 1===e?.nodeType&&e.classList?.contains("mantine-Tooltip-tooltip")&&"开启画中画"===(e.textContent||"").trim()}function ha(){pa()||null==Gi&&(Gi=requestAnimationFrame(()=>{Gi=null,pa()||(va(),xa())}))}function fa(){pa()||null==Hi&&(Hi=requestAnimationFrame(()=>{Hi=null,(pa()||(i&&!i.isConnected&&(i=null),va(),pa()))&&ma()}))}function ya(e){pa()||(ca(),i&&!i.isConnected&&(i=null),e&&!(e=>{for(var t of e)if("childList"===t.type){for(var o of t.addedNodes)if((e=>{if(1===e.nodeType){if(e.matches?.("button, [role='button']"))if((e.getAttribute("aria-label")||e.title||"").trim().includes("画中画"))return 1;return e.querySelector?.("button[aria-label*='画中画'], [role='button'][aria-label*='画中画']")}})(o))return 1;for(let e of t.removedNodes){if(e===i)return 1;if(1===e.nodeType&&i&&e.contains(i))return 1}}else if("attributes"===t.type){var n=t.target;if(n===i)return 1;if(1===n.nodeType&&("aria-label"===t.attributeName||"title"===t.attributeName||"aria-describedby"===t.attributeName))if((n.getAttribute("aria-label")||n.title||"").trim().includes("画中画"))return 1}})(e))||(ua(),fa())}function ba(){var e,t=document.getElementById("js-player-controlbar");if(t)for(e of t.querySelectorAll("button, [role='button']"))if((e.getAttribute("aria-label")||e.title||"").trim().includes("画中画"))return e;return null}function va(){let e=ba();(e=e||(()=>{var e;for(e of document.querySelectorAll(".mantine-Tooltip-tooltip"))if("开启画中画"===(e.textContent||"").trim()&&e.id){var t=document.querySelector(`[aria-describedby="${e.id}"]`);if(t)return t}return null})())&&"1"!==e.dataset.exPipBound&&(e.dataset.exPipBound="1",(i=e).addEventListener("mouseenter",_a),e.addEventListener("mouseleave",Ta),e.addEventListener("focus",_a),e.addEventListener("blur",Ta),Sa(e),ma(),xa())}function xa(){var e=i;e&&e.matches(":hover")&&(Sa(qi=e),Ea(e))}function wa(){var e;document.getElementById("ex-pip-menu-panel")||((e=document.createElement("div")).id="ex-pip-menu-panel",e.className="ex-pip-menu-root",e.setAttribute("role","menu"),e.innerHTML=`

        <div class="ex-pip-menu">

            <ul class="ex-pip-menu__list" role="presentation">

                <li>

                    <button type="button" class="ex-pip-opt" data-ex-pip-mode="native">

                        <span class="ex-pip-opt__icon">${Xi}</span>

                        <span class="ex-pip-opt__label">原版画中画</span>

                    </button>

                </li>

                <li>

                    <button type="button" class="ex-pip-opt ex-pip-opt--ex" data-ex-pip-mode="enhanced">

                        <span class="ex-pip-opt__icon">${Ki}</span>

                        <span class="ex-pip-opt__body">

                            <span class="ex-pip-opt__row">

                                <span class="ex-pip-opt__label">增强版画中画</span>

                                <span class="ex-pip-opt__mark">DouyuEx</span>

                            </span>

                            <span class="ex-pip-opt__hint">带弹幕，可窗口发弹幕</span>

                        </span>

                    </button>

                </li>

            </ul>

        </div>

    `,document.body.appendChild(e),e.addEventListener("mouseenter",Ia),e.addEventListener("mouseleave",Ta),e.querySelector('[data-ex-pip-mode="native"]').addEventListener("click",e=>{e.preventDefault(),e.stopPropagation(),Ba(),(e=i||ba())?e.click():(e=document.getElementById("__video2")||document.querySelector(".layout-Player-videoEntity video"))&&"function"==typeof e.requestPictureInPicture?e.requestPictureInPicture().catch(()=>{T("【画中画】无法开启原版画中画","error")}):T("【画中画】未找到原版画中画按钮","error")}),e.querySelector('[data-ex-pip-mode="enhanced"]').addEventListener("click",e=>{e.preventDefault(),e.stopPropagation(),Ba(),Ma()}))}function _a(e){Sa(qi=e.currentTarget),Ea(qi)}function ka(){wa(),ca(),ua(),ha(),setTimeout(()=>{ha()},250)}function Ea(t){wa(),Ia();var o=document.getElementById("ex-pip-menu-panel");if(o&&t){o.classList.add("is-visible","is-measuring"),o.style.removeProperty("visibility"),o.style.left="-9999px",o.style.top="0";var t=t.getBoundingClientRect(),n=o.offsetWidth,i=o.offsetHeight,a=t.left+t.width/2-n/2;let e=t.top-i-4;a=Math.max(8,Math.min(a,window.innerWidth-n-8)),e<8&&(e=t.bottom+4),o.classList.remove("is-measuring"),o.style.left=a+"px",o.style.top=e+"px"}}function Ba(){var e=document.getElementById("ex-pip-menu-panel");e&&e.classList.remove("is-visible","is-measuring"),qi=null}function Ia(){Vi&&(clearTimeout(Vi),Vi=null)}function Ta(){Ia(),Vi=setTimeout(()=>{var e=document.getElementById("ex-pip-menu-panel");e&&e.classList.contains("is-visible")&&(e.matches(":hover")||qi&&qi.matches(":hover")||Ba())},180)}function Ca(e){e&&"1"!==e.dataset.exPipTooltipHidden&&(e.dataset.exPipTooltipHidden="1",e.style.setProperty("display","none","important"))}function Sa(e){if(e){e=e.getAttribute("aria-describedby");if(e){e=document.getElementById(e);if(e&&"开启画中画"===(e.textContent||"").trim())return void Ca(e)}}document.querySelectorAll(".mantine-Tooltip-tooltip").forEach(e=>{"开启画中画"===(e.textContent||"").trim()&&Ca(e)})}function Ma(){if(document.getElementById("__video2"))if(window.documentPictureInPicture){var e=localStorage.getItem("ExSave_PipSet");if(e)try{var t=JSON.parse(e);Object.assign(R,t)}catch(e){}(async()=>{let o=document.getElementById("__video2"),r=(Aa(),Ha(),window.__pip_track_state__=[],await documentPictureInPicture.requestWindow({width:670,height:380,disallowReturnToOpener:!0,preferInitialWindowPlacement:!0})),n=(r.document.body.innerHTML=`

        <style>

            html,body{margin:0;width:100%;height:100%;overflow:hidden;background:black;font-family: sans-serif;}

            #wrap{position:relative;width:100%;height:100%;display:flex;flex-direction:column;}

            #main-view{position:relative;flex:1;width:100%;overflow:hidden;}

            video{width:100%;height:100%;object-fit:contain;}

            #danmaku{position:absolute;inset:0;pointer-events:none;overflow:hidden;}

            

            #pip-back-opener {

                position: absolute;

                top: 10px;

                right: -140px;

                left: auto;

                z-index: 10001;

                padding: 6px 12px;

                font-size: 15px;

                font-weight: 600;

                line-height: 1.25;

                color: #fff;

                background: rgba(0, 0, 0, 0.65);

                border: 1px solid rgba(255, 255, 255, 0.35);

                border-radius: 6px;

                cursor: pointer;

                font-family: "Microsoft YaHei", "SimHei", sans-serif;

                transition: right 0.3s, background 0.2s, border-color 0.2s;

                white-space: nowrap;

                user-select: none;

            }

            #pip-back-opener:hover {

                background: rgba(0, 0, 0, 0.88);

                border-color: rgba(255, 255, 255, 0.55);

            }

            #wrap:hover #pip-back-opener {

                right: 10px;

            }



            #combo-container {

                position: absolute;

                top: 6px;

                left: 6px;

                right: 6px;

                display: flex;

                flex-direction: row;

                flex-wrap: wrap;

                align-items: flex-start;

                align-content: flex-start;

                gap: 4px;

                max-height: 44px;

                overflow: hidden;

                pointer-events: none;

                z-index: 9999;

            }

            .combo-item {

                background: rgba(0, 0, 0, 0.55);

                color: #fff;

                padding: 2px 8px;

                border-radius: 12px;

                font-size: 11px;

                font-weight: 600;

                line-height: 1.3;

                max-width: calc(50% - 4px);

                overflow: hidden;

                text-overflow: ellipsis;

                white-space: nowrap;

                border: 1px solid rgba(255, 193, 7, 0.45);

                text-shadow: 0 1px 2px #000;

                box-sizing: border-box;

            }

            .combo-item--more {

                max-width: none;

                flex-shrink: 0;

                color: #d4d4d8;

                border-color: rgba(255, 255, 255, 0.2);

                background: rgba(0, 0, 0, 0.4);

                font-size: 10px;

                font-weight: 500;

            }

            .combo-count {

                color: #ffeb3b;

                margin-left: 4px;

                font-weight: 700;

            }



            .dm{

                position:absolute;

                white-space:nowrap;

                will-change:transform;

                box-sizing: border-box;

                font-weight: 700;

                line-height: 1.2;

                font-family: "SimHei", "Microsoft YaHei", "Arial Black", "Segoe UI Historic", sans-serif;

                text-shadow:

                    1px 0 1px rgba(0, 0, 0, 0.85),

                    -1px 0 1px rgba(0, 0, 0, 0.85),

                    0 1px 1px rgba(0, 0, 0, 0.85),

                    0 -1px 1px rgba(0, 0, 0, 0.85);

            }

            

            .dm-self {

                background-color: rgba(0, 0, 0, 0.35);

                border: 1px solid #00ff66 !important;

                padding: 2px 8px;

                border-radius: 4px;

                box-shadow: 0 0 4px rgba(0, 255, 102, 0.4), inset 0 0 4px rgba(0, 255, 102, 0.15);

            }



            #pip-btns{

                position: absolute;

                top: 50%;

                transform: translateY(-50%);

                display: flex;

                justify-content: center;

                left: -50px;

                padding: 4px;

                z-index: 1000;

                transition: all 0.3s;

                flex-direction: column;

            }



            .pip-btn {

                width: 36px;

                height: 36px;

                min-width: 36px;

                min-height: 36px;

                padding: 0;

                box-sizing: border-box;

                flex-shrink: 0;

                border: 2px solid #FFF;

                border-radius: 50%;

                display: flex;

                align-items: center;

                justify-content: center;

                background: #00000094;

                cursor: pointer;

                z-index: 1000;

                transition: all 0.3s;

                margin: 5px 0;

            }



            .pip-btn img,

            .pip-btn svg {

                display: block;

                width: 24px;

                height: 24px;

                color: #fff;

            }



            .pip-btn:hover {background:#000000c4;}

            .pip-btn-danmaku {

                position: relative;

                font-size: 15px;

                font-weight: 700;

                color: #fff;

                line-height: 1;

                font-family: "Microsoft YaHei", "SimHei", sans-serif;

            }

            .pip-btn-danmaku.is-off {

                opacity: 0.65;

                border-color: #999;

                color: #ccc;

            }

            .pip-btn-danmaku.is-off::after {

                content: "";

                position: absolute;

                left: 18%;

                top: 50%;

                width: 64%;

                height: 2px;

                background: rgba(255, 255, 255, 0.95);

                transform: translateY(-50%) rotate(-45deg);

                border-radius: 1px;

                pointer-events: none;

            }

            #wrap:hover #pip-btns {left:10px}



            #pip-toast{

                position:absolute;

                left:50%;top:50%;

                transform:translate(-50%,-50%);

                background:rgba(0,0,0,.75);

                color:#fff;

                padding:10px 16px;

                border-radius:10px;

                font-size:14px;

                z-index:99999;

                opacity:0;

                transition:opacity .3s;

                pointer-events:none;

                text-align:center;

            }

            #pip-toast.show{opacity:1;}



            #input-panel {

                display: none;

                background: #18181c;

                padding: 8px 12px;

                box-sizing: border-box;

                border-top: 1px solid #2f2f35;

                align-items: center;

                gap: 10px;

                z-index: 10000;

                position: absolute;

                bottom: 0;

                width: 100%;

            }

            #input-panel.active {

                display: flex;

            }

            #pip-input-field {

                flex: 1;

                background: #2a2a30;

                border: 1px solid #3f3f46;

                border-radius: 6px;

                color: #fff;

                padding: 6px 10px;

                font-size: 14px;

                outline: none;

            }

            #pip-input-field:focus {

                border-color: #ff5d23;

            }

            #pip-submit-btn {

                background: #ff5d23;

                color: #fff;

                border: none;

                padding: 6px 14px;

                border-radius: 6px;

                font-size: 14px;

                cursor: pointer;

                font-weight: bold;

                transition: background 0.2s;

            }

            #pip-submit-btn:hover {

                background: #e04e1b;

            }

        </style>



        <div id="wrap">

            <div id="main-view">

                <div id="pip-back-opener"></div>

                <div id="pip-btns">

                    <div id="pip-reload" class="pip-btn pip-btn-reload">${$i}</div>

                    <div id="pip-danmaku-toggle" class="pip-btn pip-btn-danmaku"></div>

                    <div id="pip-set" class="pip-btn">${Pi}</div>

                    <div id="pip-send" class="pip-btn">${zi}</div>

                </div>

                <video id="pip-video" autoplay muted playsinline></video>

                <div id="danmaku"></div>

                <div id="combo-container"></div>

                <div id="pip-toast"></div>

            </div>

            

            <div id="input-panel">

                <input type="text" id="pip-input-field" placeholder="" maxlength="50" autocomplete="off" />

                <button id="pip-submit-btn" type="button"></button>

            </div>

        </div>

    `,(window.__pip_window__=r).__pip_source_video__=o,r.document.getElementById("pip-video")),t=r.document.getElementById("danmaku"),e=r.document.getElementById("main-view"),i=r.document.getElementById("input-panel"),a=r.document.getElementById("pip-set"),l=r.document.getElementById("pip-send"),s=r.document.getElementById("pip-danmaku-toggle"),d=r.document.getElementById("pip-reload"),c=r.document.getElementById("pip-back-opener"),p=r.document.getElementById("pip-toast");ea(r);var m=r,u=m.document,g=u.getElementById("pip-input-field"),h=u.getElementById("pip-submit-btn"),f=(g&&g.setAttribute("placeholder","发条弹幕吧..."),h&&(h.textContent="发送"),(g=u.getElementById("pip-reload"))&&(g.title="刷新画面（恢复卡屏）"),(h=u.getElementById("pip-back-opener"))&&(h.textContent="回到网页",h.title="退出画中画并返回直播页"),ta(m),La(!1),Na(!0),!0===R.lowPowerMode&&La(!0),n.srcObject=o.captureStream(),await n.play().catch(()=>{}),s&&s.addEventListener("click",e=>{e.stopPropagation(),R.danmakuVisible=!1===R.danmakuVisible,localStorage.setItem("ExSave_PipSet",JSON.stringify(R)),ea(r),ta(r)}),d&&d.addEventListener("click",async e=>{e.stopPropagation();e=await ra(r,n);p.innerText=e?"画面已刷新":"刷新失败，请检查主页视频",p.classList.add("show"),clearTimeout(p._timer),p._timer=setTimeout(()=>p.classList.remove("show"),2e3)}),c&&c.addEventListener("click",e=>{e.stopPropagation(),na(r)}),a.addEventListener("click",u=>{u.stopPropagation(),na(r,!1);{let d=document.getElementById("pip-setting-panel"),c={fontSize:18,speed:2.5,area:"full",trackHeight:28,mergeMode:"combo",lowPowerMode:!1,filterRobotDanmaku:!0,opacity:1,danmakuVisible:!0},p=()=>{localStorage.setItem("ExSave_PipSet",JSON.stringify(R))},m=()=>{document.getElementById("pip-area").value=R.area,document.getElementById("pip-mergemode").value=R.mergeMode||"combo",document.getElementById("pip-lowpowermode").value=!0===R.lowPowerMode?"on":"off",document.getElementById("pip-filterrobot").value=!1!==R.filterRobotDanmaku?"on":"off",document.getElementById("pip-tabswitch").value=It()?"on":"off",document.getElementById("pip-fontsize").value=R.fontSize,document.getElementById("pip-fontsize-value").innerText=R.fontSize,document.getElementById("pip-trackheight").value=R.trackHeight||28,document.getElementById("pip-trackheight-value").innerText=R.trackHeight||28,document.getElementById("pip-speed").value=R.speed,document.getElementById("pip-speed-value").innerText=R.speed;var e=Math.round(100*(null!=R.opacity?R.opacity:1));document.getElementById("pip-opacity").value=e,document.getElementById("pip-opacity-value").innerText=e+"%"};if(d)d.style.display="block",m();else{(d=document.createElement("div")).id="pip-setting-panel",d.innerHTML=`

        <div class="pip-setting-header">

            <div class="pip-setting-title">画中画弹幕设置</div>

            <div class="pip-setting-header-actions">

                <span class="pip-setting-reset">恢复默认</span>

                <button type="button" class="pip-setting-dismiss" aria-label="关闭">×</button>

            </div>

        </div>



        <div class="pip-setting-item">

            <span>弹幕字号</span>

            <input id="pip-fontsize" type="range" min="12" max="48" value="${R.fontSize}">

            <span id="pip-fontsize-value">${R.fontSize}</span>

        </div>



        <div class="pip-setting-item">

            <span>弹幕上下间距</span>

            <input id="pip-trackheight" type="range" min="14" max="60" value="${R.trackHeight||28}">

            <span id="pip-trackheight-value">${R.trackHeight||28}</span>

        </div>



        <div class="pip-setting-item">

            <span>弹幕速度</span>

            <input id="pip-speed" type="range" min="1" max="10" step="0.5" value="${R.speed}">

            <span id="pip-speed-value">${R.speed}</span>

        </div>



        <div class="pip-setting-item">

            <span>弹幕透明度</span>

            <input id="pip-opacity" type="range" min="30" max="100" value="${Math.round(100*(null!=R.opacity?R.opacity:1))}">

            <span id="pip-opacity-value">${Math.round(100*(null!=R.opacity?R.opacity:1))}%</span>

        </div>



        <div class="pip-setting-item">

            <span>弹幕显示区域</span>

            <select id="pip-area">

                <option value="full">全屏</option>

                <option value="half">1/2</option>

                <option value="quarter">1/4</option>

            </select>

        </div>



        <div class="pip-setting-item item-vertical">

            <div class="item-label-row">

                <span>重复弹幕合并</span>

                <select id="pip-mergemode">

                    <option value="all">全部显示</option>

                    <option value="single">只显示一条</option>

                    <option value="combo">合并显示（如X5）</option>

                </select>

            </div>

            <div class="pip-setting-tip">短时间内多条相同弹幕内容时的显示方式</div>

        </div>



        <div class="pip-setting-item item-vertical">

            <div class="item-label-row">

                <span>屏蔽机器人弹幕</span>

                <select id="pip-filterrobot">

                    <option value="on">开启</option>

                    <option value="off">关闭</option>

                </select>

            </div>

            <div class="pip-setting-tip">开启后过滤无用户标识的机器人弹幕</div>

        </div>



        <div class="pip-setting-item item-vertical">

            <div class="item-label-row">

                <span>原网页低功耗</span>

                <select id="pip-lowpowermode">

                    <option value="on">开启</option>

                    <option value="off">关闭</option>

                </select>

            </div>

            <div class="pip-setting-tip">开启后，拉起画中画时将隐藏原网页视频区、飘屏弹幕与礼物动画，保留右侧弹幕列表，以降低 CPU 占用</div>

        </div>



        <div class="pip-setting-item item-vertical">

            <div class="item-label-row">

                <span>页签防冻结</span>

                <select id="pip-tabswitch">

                    <option value="on">开启</option>

                    <option value="off">关闭</option>

                </select>

            </div>

            <div class="pip-setting-tip">与扩展工具「防页签冻结」共用设置；开启后画中画期间保持源页解码并自动缓解卡屏（关闭需刷新页面后完全生效）</div>

        </div>



    `,document.getElementById("pip-setting-style")||((g=document.createElement("style")).id="pip-setting-style",g.innerHTML=`

            #pip-setting-panel {

                position: fixed;

                width: 440px;

                background: rgba(255, 255, 255, 0.98);

                border: 1px solid rgba(212, 212, 216, 1);

                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);

                border-radius: 12px;

                padding: 24px;

                z-index: 999999;

                font-family: "Helvetica Neue", Helvetica, Arial, "Microsoft Yahei", sans-serif;

                color: #18181b;

                box-sizing: border-box;

                backdrop-filter: blur(10px);

            }



            .pip-setting-header {

                display: flex;

                align-items: center;

                justify-content: space-between;

                margin: -24px -24px 24px;

                padding: 24px 24px 0;

                cursor: move;

                user-select: none;

            }



            .pip-setting-title {

                flex: 1;

                min-width: 0;

                font-size: 16px;

                font-weight: 600;

                color: #000000;

                letter-spacing: 0.5px;

                margin: 0;

            }



            .pip-setting-header-actions {

                display: flex;

                align-items: center;

                gap: 12px;

                flex-shrink: 0;

            }



            .pip-setting-reset {

                font-size: 13px;

                color: #71717a;

                cursor: pointer;

                transition: color 0.2s;

                text-decoration: underline;

                user-select: none;

                font-weight: 500;

                white-space: nowrap;

            }



            .pip-setting-reset:hover {

                color: #ff5d23;

            }



            .pip-setting-dismiss {

                flex-shrink: 0;

                width: 28px;

                height: 28px;

                margin: 0;

                padding: 0;

                border: none;

                border-radius: 6px;

                background: transparent;

                color: #71717a;

                font-size: 22px;

                line-height: 1;

                cursor: pointer;

                user-select: none;

                transition: background 0.2s, color 0.2s;

            }



            .pip-setting-dismiss:hover {

                background: #f4f4f5;

                color: #18181b;

            }



            .pip-setting-item {

                margin-bottom: 18px;

                display: flex;

                align-items: center;

                font-size: 13px;

            }



            .pip-setting-item.item-vertical {

                margin-bottom: 20px;

                flex-direction: column;

                align-items: flex-start;

            }



            .item-label-row {

                width: 100%;

                display: flex;

                align-items: center;

            }



            .pip-setting-item span:first-child {

                width: 100px;

                color: #3f3f46;

                font-weight: 600;

            }



            .pip-setting-item input[type="range"] {

                flex: 1;

                margin: 0 14px;

                -webkit-appearance: none;

                background: #d4d4d8;

                height: 4px;

                border-radius: 2px;

                outline: none;

            }



            .pip-setting-item input[type="range"]::-webkit-slider-thumb {

                -webkit-appearance: none;

                width: 12px;

                height: 12px;

                border-radius: 50%;

                background: #ff5d23;

                cursor: pointer;

                transition: transform 0.1s;

            }



            .pip-setting-item input[type="range"]::-webkit-slider-thumb:hover {

                transform: scale(1.2);

            }



            .pip-setting-item select {

                flex: 1;

                background: #f4f4f5;

                color: #18181b;

                padding: 6px 10px;

                border-radius: 6px;

                border: 1px solid #cdcdd6;

                outline: none;

                font-size: 13px;

                cursor: pointer;

                transition: border-color 0.2s, background 0.2s;

                font-weight: 500;

            }



            .pip-setting-item select:focus {

                border-color: #ff5d23;

                background: #ffffff;

            }



            .pip-setting-item span:last-child {

                width: 32px;

                text-align: right;

                color: #ff5d23;

                font-weight: bold;

                font-family: monospace;

            }



            .pip-setting-tip {

                font-size: 11px;

                color: #52525b;

                margin-top: 6px;

                margin-left: 100px;

                line-height: 1.4;

            }



        `,document.head.appendChild(g)),document.body.appendChild(d);var g=Math.max(8,(window.innerWidth-d.offsetWidth)/2),u=Math.max(8,(window.innerHeight-d.offsetHeight)/2);d.style.left=g+"px",d.style.top=u+"px",(d=>{var e=d.querySelector(".pip-setting-header");if(e){let o=!1,n=0,i=0,a=0,r=0,l=e=>{var t;o&&(t=e.clientX-n,e=e.clientY-i,d.style.left=Math.max(0,a+t)+"px",d.style.top=Math.max(0,r+e)+"px")},s=()=>{o=!1,document.removeEventListener("mousemove",l),document.removeEventListener("mouseup",s)};e.addEventListener("mousedown",e=>{var t;0!==e.button||e.target.closest(".pip-setting-dismiss, .pip-setting-reset")||(o=!0,t=d.getBoundingClientRect(),d.style.left=t.left+"px",d.style.top=t.top+"px",n=e.clientX,i=e.clientY,a=t.left,r=t.top,document.addEventListener("mousemove",l),document.addEventListener("mouseup",s),e.preventDefault())})}})(d);let e=document.getElementById("pip-fontsize"),t=document.getElementById("pip-trackheight"),o=document.getElementById("pip-speed"),n=document.getElementById("pip-area"),i=document.getElementById("pip-mergemode"),a=document.getElementById("pip-lowpowermode"),r=document.getElementById("pip-filterrobot"),l=document.getElementById("pip-tabswitch"),s=document.getElementById("pip-opacity");n.value=R.area,i.value=R.mergeMode||"combo",a.value=!0===R.lowPowerMode?"on":"off",r.value=!1!==R.filterRobotDanmaku?"on":"off",l.value=It()?"on":"off",e.addEventListener("input",()=>{R.fontSize=parseInt(e.value),document.getElementById("pip-fontsize-value").innerText=R.fontSize,p()}),t.addEventListener("input",()=>{R.trackHeight=parseInt(t.value),document.getElementById("pip-trackheight-value").innerText=R.trackHeight,p()}),o.addEventListener("input",()=>{R.speed=parseFloat(o.value),document.getElementById("pip-speed-value").innerText=R.speed,p()}),s.addEventListener("input",()=>{R.opacity=parseInt(s.value,10)/100,document.getElementById("pip-opacity-value").innerText=s.value+"%",p(),window.__pip_is_active__&&ea()}),n.addEventListener("change",()=>{R.area=n.value,p()}),i.addEventListener("change",()=>{R.mergeMode=i.value,p()}),r.addEventListener("change",()=>{R.filterRobotDanmaku="on"===r.value,p()}),a.addEventListener("change",()=>{R.lowPowerMode="on"===a.value,p(),window.__pip_is_active__&&La(R.lowPowerMode)}),l.addEventListener("change",()=>{var e,t,o,n="on"===l.value;Tt(n),n?Ct():T("已关闭页签防冻结，请刷新页面后完全生效","info"),window.__pip_is_active__&&(t=(e=window.__pip_window__)?.document.getElementById("pip-video"),o=e?.__pip_source_video__,n?la(o,e,t):sa())}),d.querySelector(".pip-setting-reset").addEventListener("click",()=>{confirm("确定要将画中画设置恢复为默认配置吗？")&&(Object.assign(R,c),p(),m(),window.__pip_is_active__)&&(La(R.lowPowerMode),ea(),ta())}),d.querySelector(".pip-setting-dismiss").addEventListener("click",()=>{d.style.display="none"})}}p.innerText="已在斗鱼直播页面打开设置面板",p.classList.add("show"),clearTimeout(p._timer),p._timer=setTimeout(()=>p.classList.remove("show"),5e3)}),l.addEventListener("click",e=>{e.stopPropagation(),i.classList.contains("active")?i.classList.remove("active"):da(r)}),e=>{var t;"Enter"===e.key&&(t=r.document.getElementById("pip-input-field"),r.document.activeElement!==t)&&(e.preventDefault(),da(r))});r.document.addEventListener("keydown",f),r.__pip_keydown_handler__=f,e.addEventListener("click",()=>{i.classList.contains("active")&&i.classList.remove("active")});{var y=r,b=t;let o=y.document.getElementById("pip-input-field"),e=y.document.getElementById("pip-submit-btn"),n=y.document.getElementById("input-panel");async function v(){var t=o.value.trim();if(t){o.value="",n.classList.remove("active");let e=y.document.getElementById("pip-toast");e.innerText="发送成功",e.classList.add("show"),clearTimeout(e._timer),e._timer=setTimeout(()=>e.classList.remove("show"),2e3),Va({text:t,color:0},y,b,!0);try{(async e=>{let t=document.querySelector("div.ChatSend-txt"),o=document.querySelector(".ChatSend-button");t.innerText=e,o.click()})(t)}catch(e){console.error("弹幕发送接口调用失败:",e)}}}o.addEventListener("keydown",e=>{"Enter"===e.key&&v()}),e.addEventListener("click",()=>{v()})}var x=o,w=n;function _(){x.paused?w.pause():w.play().catch(()=>{})}x.addEventListener("play",_),x.addEventListener("pause",_),la(o,r,n),ja&&clearInterval(ja),ja=setInterval(()=>{let t=Date.now();for(var[e,o]of Da.entries())o.timestamps.filter(e=>t-e<=8e3).length<2&&Da.delete(e);Ga()},1e3),Oi=new nl(B,e=>{if(window.__pip_is_active__&&!(e=>{var t=Date.now(),o=Pa.get(e);if(null!=o&&t-o<Ra)return 1;if(Pa.set(e,t),Pa.size>Fa)for(var[n,i]of Pa)t-i>Ra&&Pa.delete(n)})(e)){var e=(e=>{if(!e||!e.startsWith("type@=chatmsg/"))return null;var t,o={},n=e.split("/");for(let e=0;e<n.length;e++){var i=n[e],a=i.indexOf("@=");-1!==a&&(o[i.substring(0,a)]=i.substring(a+2))}return(e=o.txt?decodeURIComponent(o.txt):"")&&(!1===R.filterRobotDanmaku||o.dms)?(t=o.hash||o.cid||o.dmid||"",{text:e,color:o.col?parseInt(o.col):0,uid:o.uid||"",msgId:t,dedupKey:t||o.uid+"|"+e}):null})(e),o=r,n=t;if(e&&e.text&&!1!==R.danmakuVisible&&(!I||e.uid!==I)){var i=R.mergeMode||"combo";if("all"===i)Va(e,o,n);else{let t=Date.now();var a=(e=>{if(!Da.has(e)){var t=e=>e.replace(/\s+/g,"").split("").filter((e,t,o)=>o.indexOf(e)===t).join(""),o=t(e);if(o)for(var n of Da.keys()){var i=t(n);if(o===i&&Math.abs(e.length-n.length)<=6)return n;if((e.includes(n)||n.includes(e))&&Math.abs(e.length-n.length)<=4)return n}}return e})(e.text),a=(Da.has(a)||Da.set(a,{timestamps:[],dom:null,displayCount:0}),Da.get(a));a.timestamps.push(t),"single"===i?1<a.timestamps.filter(e=>t-e<=4e3).length||Va(e,o,n):(a.timestamps=a.timestamps.filter(e=>t-e<=8e3),1===(i=a.timestamps.length)?(a.displayCount=0,Va(e,o,n)):a.displayCount=i,Ga(o))}}}});{o;var k=r,E=n;window.__pip_is_active__=!0;let e=()=>oa(k,E),t=(k.addEventListener("pagehide",e),setInterval(()=>{k.closed&&(clearInterval(t),e())},2e3))}})()}else T("【画中画增强】当前浏览器不支持画中画增强功能，建议使用 Chrome 116+ 或 Edge 116+","error");else T("【画中画增强】当前直播间不支持画中画增强功能","error")}function Na(e){var t=document.getElementById("__video2");t&&(e?(t.style.setProperty("opacity","0.01","important"),t.style.setProperty("pointer-events","none","important")):(t.style.removeProperty("opacity"),t.style.removeProperty("pointer-events")))}function La(t){[".layout-Player-video",".layout-Player-videoEntity",".room-html5-player",".DiamondsFansRankList",".wm-view",".wm-tabv2",".comment-37342a",".DanmuEffectDom",".layout-Player-asideMainTop"].forEach(e=>{e=document.querySelector(e);e&&(t?e.style.setProperty("display","none","important"):e.style.removeProperty("display"))}),[".ChatSend-txt",".ChatSend-button"].forEach(e=>{e=document.querySelector(e);e&&(t?(e.style.setProperty("opacity","0.01","important"),e.style.setProperty("pointer-events","none","important")):(e.style.removeProperty("opacity"),e.style.removeProperty("pointer-events")))}),t||[".layout-Player",".Barrage-list"].forEach(e=>{e=document.querySelector(e);e&&e.style.removeProperty("display")})}function Aa(){if(Oi){var e=Oi;Oi=null,e.msgHandler=()=>{};try{e.close()}catch(e){}}}let Da=new Map,ja=null,Pa=new Map,za=2,Oa=18,Ra=3e3,Fa=800;function Ha(){Pa.clear()}function Ga(n){var i=n||((n=window.__pip_window__)&&!n.closed?n:null),a=i?.document.getElementById("combo-container");if(a){let t=Date.now();var e,o,r=[];for([e,o]of Da.entries()){var l,s=o.timestamps.filter(e=>t-e<=8e3).length;s<2?o.dom=null:(o.displayCount=s,l=o.timestamps[o.timestamps.length-1]||0,r.push({key:e,info:o,count:s,lastTs:l}))}r.sort((e,t)=>t.count-e.count||t.lastTs-e.lastTs),a.innerHTML="";for(let[,e]of Da)e.dom=null;var d,c,n=r.slice(0,za),p=r.length-n.length;for(let{key:e,info:t,count:o}of n){var m=i.document.createElement("div");m.className="combo-item",m.title=e,m.innerHTML=`${d=e,c=Oa,!d||d.length<=c?d||"":d.slice(0,c)+"…"}<span class="combo-count">×${o}</span>`,a.appendChild(m),t.dom=m}0<p&&((n=i.document.createElement("div")).className="combo-item combo-item--more",n.textContent=`+${p} 组重复`,a.appendChild(n))}}function Va(t,i,a,r=!1){if(t&&t.text){let e=i.document.createElement("div");e.className="dm"+(r?" dm-self":""),e.innerText=t.text,e.style.fontSize=R.fontSize+"px",e.style.color=r?"#00ff66":(e=>{switch(e){case 1:return"#ff3b30";case 2:return"#0a84ff";case 3:return"#34c759";case 4:return"#ff9500";case 5:return"#af52de";case 6:return"#ff2d55";default:return"#ffffff"}})(t.color),e.style.visibility="hidden",a.appendChild(e);var r=e.offsetWidth,t=i.innerWidth,a=((e,t)=>{let o=Math.floor(e.innerHeight/R.trackHeight);"half"===R.area?o=Math.floor(o/2):"quarter"===R.area&&(o=Math.floor(o/4)),o=Math.max(1,o),window.__pip_track_state__||(window.__pip_track_state__=[]);var n=window.__pip_track_state__,i=e.innerWidth,e=15/R.speed,a=Math.max(.7*e,Math.min(1.4*e,e+t/120/R.speed)),r=(i+t)/a;let l=-1;for(let e=0;e<o;e++){var s=n[e];if(!s)return n[e]={textWidth:t,speed:r,startTime:Date.now(),duration:1e3*a},e;var d=Date.now()-s.startTime;if(d>=s.duration)return n[e]={textWidth:t,speed:r,startTime:Date.now(),duration:1e3*a},e;var c=i-s.speed*(d/1e3),p=c+s.textWidth;if(!(i-16<p)){if(r>s.speed){p=s.duration-d;if(1e3*(c/(r-s.speed))<p)continue}l=e;break}}if(-1===l){let t=1/0;for(let e=0;e<o;e++){var m=n[e];if(!m){l=e;break}var u=Date.now()-m.startTime,u=i-m.speed*(u/1e3)+m.textWidth;u<t&&(t=u,l=e)}}return n[l]={textWidth:t,speed:r,startTime:Date.now(),duration:1e3*a},l})(i,r),l=a*R.trackHeight,a=window.__pip_track_state__[a].duration/1e3;e.style.top=l+"px",e.style.left=t+"px",e.style.visibility="visible";let o="exPipMove_"+Math.random().toString(36).substring(2,9);l=i.document;let n=l.getElementById("ex-danmaku-styles");n||((n=l.createElement("style")).id="ex-danmaku-styles",l.head.appendChild(n)),n.sheet.insertRule(`

        @keyframes ${o} {

            from { transform: translateX(0); }

            to { transform: translateX(-${t+r+30}px); }

        }

    `,0),e.style.animation=o+` ${a}s linear forwards`,e.addEventListener("animationend",()=>{e.remove();try{var t=n.sheet;for(let e=0;e<t.cssRules.length;e++)if(t.cssRules[e].name===o){t.deleteRule(e);break}}catch(e){}})}}let qa="",Ua="",Wa="",F="",Ya=!1,Qa=0,Ja=!1,H={rotateY:"",rotate:"",scale:""},Za=null;function Xa(){return/Edg/i.test(navigator.userAgent)}function Ka(){var e=document.querySelector("#ex-vtoolbar-filter-host .filter__wrap");e&&(e.style.display="block")}function $a(){var e=document.querySelector("#ex-vtoolbar-filter-host .filter__wrap");e&&(e.style.display="none")}function er(){U("Ex_Style_Filter"),document.getElementById("filter__select").selectedIndex=0,V.style.filter="",Qa=0,H={rotateY:"",rotate:"",scale:""},V.parentNode.style.transform="",document.getElementById("bar__bright").style.left="100px",document.getElementById("bar__contrast").style.left="100px",document.getElementById("bar__saturate").style.left="100px",document.getElementById("mask__bright").style.width="100px",document.getElementById("mask__contrast").style.width="100px",document.getElementById("mask__saturate").style.width="100px",Xa()&&(Ja=!1,t=document.getElementById("slider__enhance"),e=document.getElementById("switch__enhance"),t&&(t.style.left="0px"),e&&(e.style.background="#ccc"),V.style.imageRendering="",t=document.getElementsByClassName("enhance-modal__panel-wrap")[0])&&(t.style.display="none");var e=document.getElementById("ex-panorama"),t=(e&&(e.remove(),Za=null),document.getElementsByClassName("layout-Player-videoEntity")[0]);t.style.transform="",t.style.transformOrigin="",Er=1,U("Ex_Style_Cinema"),V.playbackRate=1}function G(e){U("Ex_Style_Filter"),tl("Ex_Style_Filter",e),$a()}function tr(e,t,o,n){let i=e,a=t,r=o,l=0;a.onmousedown=function(e){let t=(e||window.event).clientX-this.offsetLeft,o=this;document.onmousemove=function(e){e=e||window.event;(l=e.clientX-t)<0?l=0:l>i.offsetWidth-a.offsetWidth&&(l=i.offsetWidth-a.offsetWidth),r.style.width=l+"px",o.style.left=l+"px",n(parseInt(l/(i.offsetWidth-a.offsetWidth)*255)),window.getSelection?window.getSelection().removeAllRanges():document.selection.empty()}}}var V,or=null;let nr=!1,ir=!1,ar=null;function rr(){return document.getElementById("ex-vtoolbar-menu")}function lr(){clearTimeout(ar),mr()}function sr(){clearTimeout(ar),nr||mr()}function dr(e){var t,e=e.relatedTarget;e=e,(t=rr())&&e&&t.contains(e)||(clearTimeout(ar),ar=setTimeout(()=>{ur()},80))}function cr(e,t){e&&(t?(e.addEventListener("mouseenter",lr),e.addEventListener("pointerenter",lr)):(e.addEventListener("mouseenter",sr),e.addEventListener("pointerenter",sr)),e.addEventListener("mouseleave",dr),e.addEventListener("pointerleave",dr))}function pr(e){"Escape"===e.key&&(ur(),gr())}function mr(){var e=document.getElementById("ex-vtoolbar-menu");e&&(nr=!0,e.classList.add("is-open"),e.querySelector(".vtoolbar-menu__trigger").setAttribute("aria-expanded","true"))}function ur(){var e=document.getElementById("ex-vtoolbar-menu");e&&(clearTimeout(ar),nr=!1,e.classList.remove("is-open"),e.querySelector(".vtoolbar-menu__trigger").setAttribute("aria-expanded","false"),gr())}function gr(){var e=document.getElementById("ex-vtoolbar-filter-host"),t=document.getElementById("vtoolbar-menu-filter");ir=!1,e&&e.classList.remove("is-visible"),t&&(t.classList.remove("is-active"),t.setAttribute("aria-expanded","false")),$a()}function hr(){return document.getElementById("ex-vtoolbar-filter-host")}var fr=et,yr='<svg t="1598941324196" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3146"><path d="M921.6 766.634667L257.365333 102.4a68.266667 68.266667 0 0 0-96.597333 0L102.4 160.768a68.266667 68.266667 0 0 0 0 96.597333L766.634667 921.6a68.266667 68.266667 0 0 0 96.597333 0L921.6 863.232a68.266667 68.266667 0 0 0 0-96.597333zM139.605333 199.338667l59.733334-59.733334A13.312 13.312 0 0 1 208.896 136.533333a13.653333 13.653333 0 0 1 9.898667 4.096l83.968 82.944-79.189334 79.189334-83.968-83.968a13.653333 13.653333 0 0 1 0-19.456z m744.789334 625.322666l-59.733334 59.733334a13.312 13.312 0 0 1-9.557333 4.096 13.653333 13.653333 0 0 1-9.898667-4.096L262.144 341.333333 341.333333 262.144l543.061334 543.061333a13.653333 13.653333 0 0 1 0 19.456zM230.058667 589.824l-50.517334 92.501333-92.842666 50.858667 92.842666 50.517333 50.517334 92.842667 50.517333-92.842667 92.842667-50.517333-92.842667-50.858667-50.517333-92.501333zM541.013333 270.336l31.061334-57.344 57.344-31.402667-57.344-31.402666-31.061334-57.002667-31.402666 57.002667-57.344 31.402666 57.344 31.402667 31.402666 57.344zM827.392 377.173333l21.162667-38.912L887.466667 317.098667l-38.912-21.504-21.162667-38.912-21.504 38.912-38.570667 21.504 38.570667 21.162666 21.504 38.912z" p-id="3147" fill="#ffffff"></path></svg>',vtoolbarChevronSvg='<svg class="vtoolbar-menu__chevron" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',vr='<svg class="icon" viewBox="0 0 1237 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M648.448 946.347l0.256-1.622-0.256 1.622z m84.31 13.354c-0.769 4.608-0.769 4.608-4.182 13.483-8.533 16.768-8.533 16.768-49.835 22.784-24.149-14.293-24.149-14.293-27.605-22.613-2.475-5.718-2.475-5.718-3.541-9.387L476.416 335.36l-103.083 499.2c-1.109 5.12-1.109 5.12-4.821 13.27-6.827 12.117-6.827 12.117-35.285 22.527-30.294-7.253-30.294-7.253-38.742-19.37-4.522-8.15-4.522-8.15-6.058-13.227l-74.582-262.357H0v-85.334h278.272l45.781 161.11 104.022-503.424c1.024-4.694 1.024-4.694 4.394-12.502 6.102-11.989 6.102-11.989 35.968-23.338 31.83 8.533 31.83 8.533 39.254 20.736 4.053 7.808 4.053 7.808 5.376 12.544l165.888 609.237 113.92-716.885c0.896-5.248 0.896-5.248 4.864-14.592 9.088-15.574 9.088-15.574 44.928-22.4C868.48 12.587 868.48 12.587 873.6 22.443c3.285 6.912 3.285 6.912 4.523 11.52l112 446.549h221.738v85.333H923.563l-78.507-312.917-112.299 706.773z" fill="#ffffff"/></svg>',xr='<svg class="icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M496 64A48 48 0 0 1 544 112v800a48 48 0 0 1-96 0v-800A48 48 0 0 1 496 64z m-224 128A48 48 0 0 1 320 240v544a48 48 0 0 1-96 0v-544A48 48 0 0 1 272 192z m448 0A48 48 0 0 1 768 240v544a48 48 0 0 1-96 0v-544A48 48 0 0 1 720 192z m-672 128A48 48 0 0 1 96 368v288a48 48 0 0 1-96 0v-288A48 48 0 0 1 48 320z m896 0a48 48 0 0 1 48 48v288a48 48 0 0 1-96 0v-288a48 48 0 0 1 48-48z" fill="#ffffff"/></svg>',wr='<svg class="icon vtoolbar-menu__icon-pip" viewBox="3 5 18 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2" stroke="#ffffff" stroke-width="1.5"/><path d="M7 10h5.5M7 13h3.5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/></svg>';var _r=!1;let kr=0;let Er=1;var Br=null,Ir=null,Tr=null,Cr=null;function Sr(e){try{var t=document.querySelector(".volume-07c230"),o=document.querySelector(".volume-bar-93f0b0 .front-99e2aa"),n=document.querySelector(".volume-bar-93f0b0 .point-6ef744"),i=document.querySelector(".volume-bar-93f0b0 .tips2-9bb064");o&&(o.style.height=100*e+"px"),n&&(n.style.bottom=100*e+7+"px"),i&&(i.textContent=`音量${Math.round(100*e)}%`),t&&(0===e?(t.classList.add("custom-muted"),t.classList.remove("custom-normal")):(t.classList.add("custom-normal"),t.classList.remove("custom-muted")))}catch(e){}}class Lr{constructor(e){var t={width:1920,height:1080,fontSize:36,alpha:this._prefixInteger(Number(0).toString(16),2),stayTime:10,title:"Default"};this.options={...t,...e,...e&&e.alpha?this._prefixInteger(this.options.alpha.toString(16),2):{}},this.lines=20,this.lineBase=this.options.height/this.lines,this.currentLine=0,this.diffTime=1500}generate(e){var t=e.sort((e,t)=>e.time-t.time);let o=this._getScriptInfo()+this._getV4Styles()+this._getEvents();for(let e=0;e<t.length;e++){0<e&&t[e].time-t[e-1].time<=this.diffTime?this.currentLine++:this.currentLine=0,this.currentLine>=this.lines&&(this.currentLine=0);var n=t[e],i=Number(n.time)+1e3*Number(this.options.stayTime),a=this.lineBase*this.currentLine+this.options.fontSize,r=this.options.fontSize*n.txt.length;o+=`Dialogue: 0,${J(Number(n.time)/1e3)}.00,${J(i/1e3)}.00,Color${n.color},,0,0,0,,{\\move(${this.options.width+r},${a},${-r},${a})}${n.txt}

`}return o}_prefixInteger(e,t){return e=""+e,Array(t+1-e.length).join("0")+e}_getScriptInfo(){return`[Script Info]

; DouyuEx -By qianjiachun

; https://github.com/qianjiachun/douyuEx

ScriptType: v4.00+

Title: ${this.options.title}

PlayResX: ${this.options.width}

PlayResY: ${this.options.height}

`}_getV4Styles(){return`

[V4+ Styles]

Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding

Style: Color0,黑体,${this.options.fontSize},&H${this.options.alpha}FFFFFF,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color7,黑体,${this.options.fontSize},&H${this.options.alpha}5456FF,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color8,黑体,${this.options.fontSize},&H${this.options.alpha}2375FF,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color9,黑体,${this.options.fontSize},&H${this.options.alpha}B369FE,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color10,黑体,${this.options.fontSize},&H${this.options.alpha}00BCFF,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color11,黑体,${this.options.fontSize},&H${this.options.alpha}46C978,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color12,黑体,${this.options.fontSize},&H${this.options.alpha}FF7F9E,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

Style: Color13,黑体,${this.options.fontSize},&H${this.options.alpha}FF9B3D,&H80000000,&H80000000,&H80000000,0,0,0,0,100,100,0,0,0,0,0,0,0,0,0,134

`}_getEvents(){return`

[Events]

Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text

`}}class Ar{constructor(e){this.func_click=null,this.func_dbClick=null,this.func_longClick=null;let t=!1,o,n=0,i;e.onmousedown=e=>{0===e.button&&(t=!1,o=setTimeout(()=>{t=!0,null!==this.func_longClick&&this.func_longClick(e)},700))},e.onmouseup=e=>{0===e.button&&0==t&&(clearTimeout(o),2<=++n?(clearTimeout(i),n=0,null!==this.func_dbClick&&this.func_dbClick(e)):i=setTimeout(()=>{n=0,null!==this.func_click&&this.func_click(e)},0))}}click(e){this.func_click=e}dbClick(e){this.func_dbClick=e}longClick(e){this.func_longClick=e}}class q{constructor(e,t,o){this.selector=e,this.isSubtree=t;e=document.querySelector(this.selector);null!=e&&(t=new MutationObserver(function(e){o(e)}),this.observer=t,this.observer.observe(e,{attributes:!0,childList:!0,subtree:this.isSubtree}))}closeHook(){this.observer&&(this.observer.disconnect(),this.observer=null)}}class Dr{constructor(e){this.pointId=e,this.decoder=new TextDecoder}getSign(){var e=parseInt((new Date).getTime()/1e3,10);return unsafeWindow[this.d539fa2cf7732d2a(256042,"9f4f419501570ad13334")](this.pointId,"10000000000000000000000000001501",e)}d539fa2cf7732d2a(e,t){for(var o=(e=CryptoJS.MM(e.toString()).toString())[0].charCodeAt(0),n=e[16].charCodeAt(0),i=[],a=0;a<4;a++)i[a]=o<<24|o<<16|o<<8|o,i[a+4]=n<<24|n<<16|n<<8|n;for(var e=Math.floor(t.length/16)%4,r=[],l=t.length%8,s=Math.floor(t.length/8),a=0;a<s;a++)r[a]=255&parseInt(t.substr(8*a,2),16)|parseInt(t.substr(8*a+2,2),16)<<8&65280|parseInt(t.substr(8*a+4,2),16)<<24>>>8|parseInt(t.substr(8*a+6,2),16)<<24;var d=0==e?e86500e2(r,i):1==e?this.c30070a4(r,i):d831eb20(r,i),c=[];for(a=0;a<d.length;a++){var p=255&d[a],m=d[a]>>>8&255,u=d[a]>>>16&255,g=d[a]>>>24&255;p&&c.push(p),m&&c.push(m),u&&c.push(u),g&&c.push(g)}var h=Math.floor(l/2);for(a=0;a<h;a++)c.push(255&parseInt(t.substr(8*s+2*a,2),16));return this.decoder.decode(new Uint8Array(c))}c30070a4(e,t){for(var o=Math.floor(e.length/2),n=e.slice(0),i=0;i<o;i++){var a=this.f5a40d76(e.slice(2*i,2*i+2),32,t.slice(4*i%8,4*i%8+4));n[2*i+0]=a[0],n[2*i+1]=a[1]}return n}f5a40d76(e,t,o){for(var n=0;n<e.length;n+=2){for(var i=e[n],a=e[n+1],r=2654435769*t,l=0;l<t;l++)i-=((a-=(i<<4^i>>>5)+i^r+o[r>>>11&3])<<4^a>>>5)+a^(r-=2654435769)+o[3&r];e[n]=i,e[n+1]=a}return e}}function jr(){var l=this;function s(e,t,o,n){var s=this;this.aborted=!1,this.threadNum=10,this.step=0,function n(a,i,r,l){let e=[];for(let t=0;t<s.threadNum;t++){if(!a[r+t]){e.push(Promise.resolve());break}e.push(fetch(a[r+t]).catch(e=>{fetch(a[r+t]).catch(e=>{fetch(a[r+t])})}))}s.step=e.length;Promise.all(e).then(function(e){return c(d(e,function(e){return e&&e.blob}),function(e){return e.blob()})}).then(function(e){return Promise.all(e)}).then(function(e){e=c(e,function(n,i){return new Promise(function(t,e){var o=new FileReader;o.readAsArrayBuffer(new Blob([n],{type:"octet/stream"})),o.addEventListener("loadend",function(e){t(o.result),s.onprogress&&s.onprogress({segment:r+i+1,total:a.length,percentage:((r+i+1)/a.length*100).toFixed(3),downloaded:m(+p(c(l,function(e){return e.byteLength}),function(e,t){return e+t},0)),status:"Downloading..."})})})}),Promise.all(e).then(function(e){for(var t=0;t<e.length;t++)l.push(e[t]);let o=s.step;a[r+2],s.aborted?(l=null,s.aborted()):a[r+o]?s.ie?setTimeout(function(){n(a,i,r+o,l)},500):n(a,i,r+o,l):i(l)})}).catch(function(e){s.onerror&&s.onerror("Something went wrong when downloading ts file, nr. "+r+": "+e)})}(e,t,o,n)}function d(e,t){for(var o=[],n=0;n<e.length;n++)t(e[n],n)&&o.push(e[n]);return o}function c(e,t){for(var o=e.slice(0),n=0;n<e.length;n++)o[n]=t(e[n],n);return o}function p(e,o,t){var n=t;return e.forEach(function(e,t){e=+o(n,e,t),n=e}),n}function m(e){for(var t=[{divider:1e18,suffix:"EB"},{divider:1e15,suffix:"PB"},{divider:1e12,suffix:"TB"},{divider:1e9,suffix:"GB"},{divider:1e6,suffix:"MB"},{divider:1e3,suffix:"kB"}],o=0;o<t.length;o++)if(e>=t[o].divider)return(e/t[o].divider).toString().toString().split(".")[0]+t[o].suffix;return e.toString()}this.ie=0<navigator.appVersion.toString().indexOf(".NET"),this.ios=navigator.platform&&/iPad|iPhone|iPod/.test(navigator.platform),this.start=function(e,i){i=i||{};var a,o,n={progress:null,finished:null,error:null,aborted:null};function r(e,t){e&&n[e]&&n[e](t)}return l.ios?r("error","Downloading on IOS is not supported."):(o={on:function(e,t){switch(e){case"progress":n.progress=t;break;case"finished":n.finished=t;break;case"error":n.error=t;break;case"aborted":n.aborted=t}return o},abort:function(){a&&(a.aborted=function(){r("aborted")})}},new Promise(function(o,t){var n=new URL(e);fetch(e).then(function(e){return e.text()}).then(function(e){if(!(e=c(e=d(e.split(/(\r\n|\r|\n)/gi),function(e){return-1<e.indexOf(".ts")}),function(e,t){return 0===e.indexOf("http")||0===e.indexOf("ftp")?e:n.protocol+"//"+n.host+n.pathname+"/./../"+e})).length)return t("Invalid m3u8 playlist"),r("error","Invalid m3u8 playlist");(a=new s(e,function(e){var t;e=new Blob(e,{type:"octet/stream"}),r("progress",{status:"Processing..."}),i.returnBlob?(r("finished",{status:"Successfully downloaded video",data:e}),o(e)):l.ios||(l.ie?(r("progress",{status:"Sending video to Internet Explorer... this may take a while depending on your device's performance."}),window.navigator.msSaveBlob(e,i&&i.filename||"video.mp4")):(r("progress",{status:"Sending video to browser..."}),(t=document.createElementNS("http://www.w3.org/1999/xhtml","a")).href=URL.createObjectURL(e),t.download=i&&i.filename||"video.mp4",t.style.display="none",document.body.appendChild(t),t.click(),r("finished",{status:"Successfully downloaded video",data:e}),o(e)))},0,[])).onprogress=function(e){r("progress",e)}}).catch(function(e){r("error","Something went wrong when downloading m3u8 playlist: "+e)})}),o)}}var Pr=0,zr=8;function Or(e){for(var t=((e,t)=>{e[t>>5]|=128<<t%32,e[14+(t+64>>>9<<4)]=t;for(var o=1732584193,n=-271733879,i=-1732584194,a=271733878,r=0;r<e.length;r+=16){var l=o,s=n,d=i,c=a;o=p(o,n,i,a,e[r+0],7,-680876936),a=p(a,o,n,i,e[r+1],12,-389564586),i=p(i,a,o,n,e[r+2],17,606105819),n=p(n,i,a,o,e[r+3],22,-1044525330),o=p(o,n,i,a,e[r+4],7,-176418897),a=p(a,o,n,i,e[r+5],12,1200080426),i=p(i,a,o,n,e[r+6],17,-1473231341),n=p(n,i,a,o,e[r+7],22,-45705983),o=p(o,n,i,a,e[r+8],7,1770035416),a=p(a,o,n,i,e[r+9],12,-1958414417),i=p(i,a,o,n,e[r+10],17,-42063),n=p(n,i,a,o,e[r+11],22,-1990404162),o=p(o,n,i,a,e[r+12],7,1804603682),a=p(a,o,n,i,e[r+13],12,-40341101),i=p(i,a,o,n,e[r+14],17,-1502002290),n=p(n,i,a,o,e[r+15],22,1236535329),o=u(o,n,i,a,e[r+1],5,-165796510),a=u(a,o,n,i,e[r+6],9,-1069501632),i=u(i,a,o,n,e[r+11],14,643717713),n=u(n,i,a,o,e[r+0],20,-373897302),o=u(o,n,i,a,e[r+5],5,-701558691),a=u(a,o,n,i,e[r+10],9,38016083),i=u(i,a,o,n,e[r+15],14,-660478335),n=u(n,i,a,o,e[r+4],20,-405537848),o=u(o,n,i,a,e[r+9],5,568446438),a=u(a,o,n,i,e[r+14],9,-1019803690),i=u(i,a,o,n,e[r+3],14,-187363961),n=u(n,i,a,o,e[r+8],20,1163531501),o=u(o,n,i,a,e[r+13],5,-1444681467),a=u(a,o,n,i,e[r+2],9,-51403784),i=u(i,a,o,n,e[r+7],14,1735328473),n=u(n,i,a,o,e[r+12],20,-1926607734),o=g(o,n,i,a,e[r+5],4,-378558),a=g(a,o,n,i,e[r+8],11,-2022574463),i=g(i,a,o,n,e[r+11],16,1839030562),n=g(n,i,a,o,e[r+14],23,-35309556),o=g(o,n,i,a,e[r+1],4,-1530992060),a=g(a,o,n,i,e[r+4],11,1272893353),i=g(i,a,o,n,e[r+7],16,-155497632),n=g(n,i,a,o,e[r+10],23,-1094730640),o=g(o,n,i,a,e[r+13],4,681279174),a=g(a,o,n,i,e[r+0],11,-358537222),i=g(i,a,o,n,e[r+3],16,-722521979),n=g(n,i,a,o,e[r+6],23,76029189),o=g(o,n,i,a,e[r+9],4,-640364487),a=g(a,o,n,i,e[r+12],11,-421815835),i=g(i,a,o,n,e[r+15],16,530742520),n=g(n,i,a,o,e[r+2],23,-995338651),o=h(o,n,i,a,e[r+0],6,-198630844),a=h(a,o,n,i,e[r+7],10,1126891415),i=h(i,a,o,n,e[r+14],15,-1416354905),n=h(n,i,a,o,e[r+5],21,-57434055),o=h(o,n,i,a,e[r+12],6,1700485571),a=h(a,o,n,i,e[r+3],10,-1894986606),i=h(i,a,o,n,e[r+10],15,-1051523),n=h(n,i,a,o,e[r+1],21,-2054922799),o=h(o,n,i,a,e[r+8],6,1873313359),a=h(a,o,n,i,e[r+15],10,-30611744),i=h(i,a,o,n,e[r+6],15,-1560198380),n=h(n,i,a,o,e[r+13],21,1309151649),o=h(o,n,i,a,e[r+4],6,-145523070),a=h(a,o,n,i,e[r+11],10,-1120210379),i=h(i,a,o,n,e[r+2],15,718787259),n=h(n,i,a,o,e[r+9],21,-343485551),o=Fr(o,l),n=Fr(n,s),i=Fr(i,d),a=Fr(a,c)}return Array(o,n,i,a)})((e=>{for(var t=Array(),o=(1<<zr)-1,n=0;n<e.length*zr;n+=zr)t[n>>5]|=(e.charCodeAt(n/zr)&o)<<n%32;return t})(e),e.length*zr),o=Pr?"0123456789ABCDEF":"0123456789abcdef",n="",i=0;i<4*t.length;i++)n+=o.charAt(t[i>>2]>>i%4*8+4&15)+o.charAt(t[i>>2]>>i%4*8&15);return n}function Rr(e,t,o,n,i,a){return Fr((t=Fr(Fr(t,e),Fr(n,a)))<<i|t>>>32-i,o)}function p(e,t,o,n,i,a,r){return Rr(t&o|~t&n,e,t,i,a,r)}function u(e,t,o,n,i,a,r){return Rr(t&n|o&~n,e,t,i,a,r)}function g(e,t,o,n,i,a,r){return Rr(t^o^n,e,t,i,a,r)}function h(e,t,o,n,i,a,r){return Rr(o^(t|~n),e,t,i,a,r)}function Fr(e,t){var o=(65535&e)+(65535&t);return(e=(e>>16)+(t>>16)+(o>>16))<<16|65535&o}n="undefined"!=typeof self?self:this,t=function(){return o=[function(e,t,o){Object.defineProperty(t,"__esModule",{value:!0}),t.noticeJsModalClassName="noticejs-modal",t.closeAnimation="noticejs-fadeOut",t.Defaults={title:"",text:"",type:"success",position:"topRight",timeout:30,progressBar:!0,closeWith:["button"],animation:null,modal:!1,scroll:{maxHeight:300,showOnHover:!0},rtl:!1,callbacks:{beforeShow:[],onShow:[],afterShow:[],onClose:[],afterClose:[],onClick:[],onHover:[],onTemplate:[]}}},function(e,t,o){Object.defineProperty(t,"__esModule",{value:!0}),t.appendNoticeJs=t.addListener=t.CloseItem=t.AddModal=void 0,t.getCallback=r;var n=(e=>{if(e&&e.__esModule)return e;var t={};if(null!=e)for(var o in e)Object.prototype.hasOwnProperty.call(e,o)&&(t[o]=e[o]);return t.default=e,t})(o=o(0));var a=n.Defaults;function r(t,e){t.callbacks.hasOwnProperty(e)&&t.callbacks[e].forEach(function(e){"function"==typeof e&&e.apply(t)})}var l=t.AddModal=function(){var e;document.getElementsByClassName(n.noticeJsModalClassName).length<=0&&((e=document.createElement("div")).classList.add(n.noticeJsModalClassName),e.classList.add("noticejs-modal-open"),document.body.appendChild(e),setTimeout(function(){e.className=n.noticeJsModalClassName},200))},i=t.CloseItem=function(e){r(a,"onClose"),null!==a.animation&&null!==a.animation.close&&(e.className+=" "+a.animation.close),setTimeout(function(){e.remove()},200),!0===a.modal&&1<=document.querySelectorAll("[noticejs-modal='true']").length&&(document.querySelector(".noticejs-modal").className+=" noticejs-modal-close",setTimeout(function(){document.querySelector(".noticejs-modal").remove()},500));var t="."+e.closest(".noticejs").className.replace("noticejs","").trim();setTimeout(function(){var e;document.querySelectorAll(t+" .item").length<=0&&null!=(e=document.querySelector(t))&&e.remove()},500)},s=t.addListener=function(t){a.closeWith.includes("button")&&t.querySelector(".close").addEventListener("click",function(){i(t)}),a.closeWith.includes("click")?(t.style.cursor="pointer",t.addEventListener("click",function(e){"close"!==e.target.className&&(r(a,"onClick"),i(t))})):t.addEventListener("click",function(e){"close"!==e.target.className&&r(a,"onClick")}),t.addEventListener("mouseover",function(){r(a,"onHover")})};t.appendNoticeJs=function(e,t,o){var n=".noticejs-"+a.position,i=document.createElement("div");return i.classList.add("item"),i.classList.add(a.type),!0===a.rtl&&i.classList.add("noticejs-rtl"),e&&""!==e&&i.appendChild(e),i.appendChild(t),o&&""!==o&&i.appendChild(o),["top","bottom"].includes(a.position)&&(document.querySelector(n).innerHTML=""),null!==a.animation&&null!==a.animation.open&&(i.className+=" "+a.animation.open),!0===a.modal&&(i.setAttribute("noticejs-modal","true"),l()),s(i,a.closeWith),r(a,"beforeShow"),r(a,"onShow"),document.querySelector(n).appendChild(i),r(a,"afterShow"),i}},function(e,t,o){Object.defineProperty(t,"__esModule",{value:!0});var n=function(e,t,o){return t&&i(e.prototype,t),o&&i(e,o),e};function i(e,t){for(var o=0;o<t.length;o++){var n=t[o];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}var a=o(3),r=((a=a)&&a.__esModule,d(o(0))),l=o(4),s=d(o(1));function d(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var o in e)Object.prototype.hasOwnProperty.call(e,o)&&(t[o]=e[o]);return t.default=e,t}function c(){var e=0<arguments.length&&void 0!==arguments[0]?arguments[0]:{},t=this,o=c;if(t instanceof o)return this.options=Object.assign(r.Defaults,e),this.component=new l.Components,this.on("beforeShow",this.options.callbacks.beforeShow),this.on("onShow",this.options.callbacks.onShow),this.on("afterShow",this.options.callbacks.afterShow),this.on("onClose",this.options.callbacks.onClose),this.on("afterClose",this.options.callbacks.afterClose),this.on("onClick",this.options.callbacks.onClick),this.on("onHover",this.options.callbacks.onHover),this;throw new TypeError("Cannot call a class as a function")}n(c,[{key:"show",value:function(){var e=this.component.createContainer(),t=(null===document.querySelector(".noticejs-"+this.options.position)&&document.body.appendChild(e),void 0),e=this.component.createHeader(this.options.title,this.options.closeWith),o=this.component.createBody(this.options.text);return!0===this.options.progressBar&&(t=this.component.createProgressBar()),s.appendNoticeJs(e,o,t)}},{key:"on",value:function(e){var t=1<arguments.length&&void 0!==arguments[1]?arguments[1]:function(){};return"function"==typeof t&&this.options.callbacks.hasOwnProperty(e)&&this.options.callbacks[e].push(t),this}}]),t.default=o=c,e.exports=t.default},function(e,t){},function(e,t,o){Object.defineProperty(t,"__esModule",{value:!0}),t.Components=void 0;var n=function(e,t,o){return t&&i(e.prototype,t),o&&i(e,o),e};function i(e,t){for(var o=0;o<t.length;o++){var n=t[o];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}var a=l(o(0)),r=l(o=o(1));function l(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var o in e)Object.prototype.hasOwnProperty.call(e,o)&&(t[o]=e[o]);return t.default=e,t}var s=a.Defaults;function d(){if(!(this instanceof d))throw new TypeError("Cannot call a class as a function")}t.Components=(n(d,[{key:"createContainer",value:function(){var e="noticejs-"+s.position,t=document.createElement("div");return t.classList.add("noticejs"),t.classList.add(e),t}},{key:"createHeader",value:function(){var e,t=void 0;return s.title&&""!==s.title&&((t=document.createElement("div")).setAttribute("class","noticejs-heading"),t.textContent=s.title),s.closeWith.includes("button")&&((e=document.createElement("div")).setAttribute("class","close"),e.innerHTML="&times;",t?t.appendChild(e):t=e),t}},{key:"createBody",value:function(){var e=document.createElement("div"),t=(e.setAttribute("class","noticejs-body"),document.createElement("div"));return t.setAttribute("class","noticejs-content"),t.innerHTML=s.text,e.appendChild(t),null!==s.scroll&&""!==s.scroll.maxHeight&&(e.style.overflowY="auto",e.style.maxHeight=s.scroll.maxHeight+"px",!0===s.scroll.showOnHover)&&(e.style.visibility="hidden"),e}},{key:"createProgressBar",value:function(){var o,n,i=document.createElement("div"),a=(i.setAttribute("class","noticejs-progressbar"),document.createElement("div"));return a.setAttribute("class","noticejs-bar"),i.appendChild(a),!0===s.progressBar&&"boolean"!=typeof s.timeout&&!1!==s.timeout&&(o=100,n=setInterval(function(){var e,t;o<=0?(clearInterval(n),e=i.closest("div.item"),null!==s.animation&&null!==s.animation.close?(e.className=e.className.replace(new RegExp("(?:^|\\s)"+s.animation.open+"(?:\\s|$)")," "),e.className+=" "+s.animation.close,t=parseInt(s.timeout)+500,setTimeout(function(){r.CloseItem(e)},t)):r.CloseItem(e)):(o--,a.style.width=o+"%")},s.timeout)),i}}]),d)}],i={},n.m=o,n.c=i,n.d=function(e,t,o){n.o(e,t)||Object.defineProperty(e,t,{configurable:!1,enumerable:!0,get:o})},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="dist/",n(n.s=2);function n(e){var t;return(i[e]||(t=i[e]={i:e,l:!1,exports:{}},o[e].call(t.exports,t,t.exports,n),t.l=!0,t)).exports}var o,i},"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define("NoticeJs",[],t):"object"==typeof exports?exports.NoticeJs=t():n.NoticeJs=t();class Hr{constructor(e,t){this.domContainer=e,this.domVideo=t,this.camera=null,this.scene=null,this.renderer=null,this.isUserInteracting=!1,this.lon=0,this.lat=0,this.phi=0,this.theta=0,this.distance=50,this.onPointerDownPointerX=0,this.onPointerDownPointerY=0,this.onPointerDownLon=0,this.onPointerDownLat=0,this.onDocumentMouseDown=this.onDocumentMouseDown.bind(this),this.onDocumentMouseMove=this.onDocumentMouseMove.bind(this),this.onDocumentMouseUp=this.onDocumentMouseUp.bind(this),this.onDocumentMouseWheel=this.onDocumentMouseWheel.bind(this),this.onWindowResize=this.onWindowResize.bind(this),this.init()}init(){var e=this.domContainer,t=(this.camera=new THREE.PerspectiveCamera(75,this.domVideo.videoWidth/this.domVideo.videoHeight,1,1100),this.camera.target=new THREE.Vector3(0,0,0),this.scene=new THREE.Scene,new THREE.SphereBufferGeometry(500,60,40)),o=(t.scale(-1,1,1),new THREE.VideoTexture(this.domVideo));o.minFilter=THREE.LinearFilter,o=new THREE.MeshBasicMaterial({map:o}),t=new THREE.Mesh(t,o),this.scene.add(t),this.renderer=new THREE.WebGLRenderer,this.renderer.setPixelRatio(window.devicePixelRatio),this.renderer.setSize(this.domVideo.clientWidth,this.domVideo.clientHeight),e.appendChild(this.renderer.domElement),e.addEventListener("mousedown",this.onDocumentMouseDown,!1),e.addEventListener("mousemove",this.onDocumentMouseMove,!1),e.addEventListener("mouseup",this.onDocumentMouseUp,!1),e.addEventListener("wheel",this.onDocumentMouseWheel,!1),window.addEventListener("resize",this.onWindowResize,!1)}onWindowResize(){this.camera.aspect=this.domVideo.videoWidth/this.domVideo.videoHeight,this.camera.updateProjectionMatrix(),this.renderer.setSize(this.domVideo.clientWidth,this.domVideo.clientHeight)}onDocumentMouseDown(e){this.isUserInteracting=!0,this.onPointerDownPointerX=e.clientX,this.onPointerDownPointerY=e.clientY,this.onPointerDownLon=this.lon,this.onPointerDownLat=this.lat}onDocumentMouseMove(e){!0===this.isUserInteracting&&(this.lon=.1*(this.onPointerDownPointerX-e.clientX)+this.onPointerDownLon,this.lat=.1*(e.clientY-this.onPointerDownPointerY)+this.onPointerDownLat)}onDocumentMouseUp(){this.isUserInteracting=!1}onDocumentMouseWheel(e){this.distance+=.05*e.deltaY,this.distance=THREE.Math.clamp(this.distance,1,50)}update(){this.lat=Math.max(-85,Math.min(85,this.lat)),this.phi=THREE.Math.degToRad(90-this.lat),this.theta=THREE.Math.degToRad(this.lon),this.camera.position.x=this.distance*Math.sin(this.phi)*Math.cos(this.theta),this.camera.position.y=this.distance*Math.cos(this.phi),this.camera.position.z=this.distance*Math.sin(this.phi)*Math.sin(this.theta),this.camera.lookAt(this.camera.target),this.renderer.render(this.scene,this.camera)}}var Gr={containerClass:"postbird-box-container active",box:null,textTemplate:{title:"提示信息",content:"提示内容",okBtn:"好的",cancelBtn:"取消",contentColor:"#000000",okBtnColor:"#0e90d2",promptTitle:"请输入内容",promptOkBtn:"确认"},getAlertTemplate:function(){return'<div class="postbird-box-dialog"><div class="postbird-box-content"><div class="postbird-box-header"><span class="postbird-box-close-btn">×</span><span class="postbird-box-title"><span >'+this.textTemplate.title+'</span></span></div><div class="postbird-box-text"><span style="color:'+this.textTemplate.contentColor+';">'+this.textTemplate.content+'</span></div><div class="postbird-box-footer"><button class="btn-footer btn-block-footer btn-footer-ok" style="color:'+this.textTemplate.okBtnColor+';">'+this.textTemplate.okBtn+"</button></div></div></div>"},getConfirmTemplate:function(){return'<div class="postbird-box-container"><div class="postbird-box-dialog"><div class="postbird-box-content"><div class="postbird-box-header"><span class="postbird-box-close-btn">×</span><span class="postbird-box-title"><span >'+this.textTemplate.title+'</span></span></div><div class="postbird-box-text"><span style="color:'+this.textTemplate.contentColor+';">'+this.textTemplate.content+'?</span></div><div class="postbird-box-footer"><button class="btn-footer btn-left-footer btn-footer-cancel" style="color:'+this.textTemplate.cancelBtnColor+';">'+this.textTemplate.cancelBtn+'</button><button class="btn-footer btn-right-footer btn-footer-ok"  style="color:'+this.textTemplate.okBtnColor+';">'+this.textTemplate.okBtn+"</button></div></div></div></div>"},getPromptTemplate:function(){return'<div class="postbird-box-container"><div class="postbird-box-dialog"><div class="postbird-box-content"><div class="postbird-box-header"><span class="postbird-box-close-btn">×</span><span class="postbird-box-title"><span >'+this.textTemplate.title+'</span></span></div><div class="postbird-box-text"><input type="text" class="postbird-prompt-input" autofocus="true" ></div><div class="postbird-box-footer"><button class="btn-footer btn-left-footer btn-footer-cancel" style="color:'+this.textTemplate.cancelBtnColor+';">'+this.textTemplate.cancelBtn+'</button><button class="btn-footer btn-right-footer btn-footer-ok"  style="color:'+this.textTemplate.okBtnColor+';">'+this.textTemplate.okBtn+"</button></div></div></div></div>"},alert:function(e){this.textTemplate.title=e.title||this.textTemplate.title,this.textTemplate.content=e.content||this.textTemplate.content,this.textTemplate.okBtn=e.okBtn||this.textTemplate.okBtn,this.textTemplate.okBtnColor=e.okBtnColor||this.textTemplate.okBtnColor,this.textTemplate.contentColor=e.contentColor||this.textTemplate.contentColor;var t=document.createElement("div"),o=this;t.className=this.containerClass,t.innerHTML=this.getAlertTemplate(),this.box=t,document.body.appendChild(this.box),(t=document.getElementsByClassName("btn-footer-ok"))[t.length-1].focus(),t[t.length-1].onclick=function(){e.onConfirm&&e.onConfirm(),o.removeBox()}},confirm:function(e){this.textTemplate.title=e.title||this.textTemplate.promptTitle,this.textTemplate.promptPlaceholder=e.promptPlaceholder||this.textTemplate.promptPlaceholder,this.textTemplate.okBtn=e.okBtn||this.textTemplate.promptOkBtn,this.textTemplate.okBtnColor=e.okBtnColor||this.textTemplate.okBtnColor,this.textTemplate.cancelBtn=e.cancelBtn||this.textTemplate.cancelBtn,this.textTemplate.cancelBtnColor=e.cancelBtnColor||this.textTemplate.cancelBtnColor,this.textTemplate.content=e.content||this.textTemplate.content;var t=document.createElement("div"),o=this;(this.box=t).className=this.containerClass,t.innerHTML=this.getConfirmTemplate(),document.body.appendChild(t),(t=document.getElementsByClassName("btn-footer-ok"))[t.length-1].focus(),t[t.length-1].onclick=function(){e.onConfirm&&e.onConfirm(),o.removeBox()},(t=document.getElementsByClassName("btn-footer-cancel"))[t.length-1].onclick=function(){e.onCancel&&e.onCancel(),o.removeBox()}},prompt:function(e){this.textTemplate.title=e.title||this.textTemplate.title,this.textTemplate.content=e.content||this.textTemplate.content,this.textTemplate.contentColor=e.contentColor||this.textTemplate.contentColor,this.textTemplate.okBtn=e.okBtn||this.textTemplate.okBtn,this.textTemplate.okBtnColor=e.okBtnColor||this.textTemplate.okBtnColor,this.textTemplate.cancelBtn=e.cancelBtn||this.textTemplate.cancelBtn,this.textTemplate.cancelBtnColor=e.cancelBtnColor||this.textTemplate.cancelBtnColor;var t=document.createElement("div"),o=this;t.className=this.containerClass,t.innerHTML=this.getPromptTemplate(),this.box=t,document.body.appendChild(t);var n=(n=document.getElementsByClassName("postbird-prompt-input"))[n.length-1];null!=e.defaultValue&&(n.value=e.defaultValue),n.focus(),t=document.getElementsByClassName("btn-footer-ok"),n.value,t[t.length-1].focus(),t[t.length-1].onclick=function(){e.onConfirm&&e.onConfirm(n.value),o.removeBox()},(t=document.getElementsByClassName("btn-footer-cancel"))[t.length-1].onclick=function(){e.onCancel&&e.onCancel(n.value),o.removeBox()}},colse:function(){this.removeBox()},removeBox:function(){var e=document.getElementsByClassName(this.containerClass);document.body.removeChild(e[e.length-1])}};function Vr(e,t,o,a){let n="80";switch(t){case"1":n="80";break;case"2":n="150";break;case"3":n="250";break;case"4":n="400";break;case"5":n="20000";break;default:n="80"}GM_xmlhttpRequest({method:"GET",url:`https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?room_id=${e}&platform=web&qn=${n}&protocol=0,1&format=0,1,2&codec=0,1`,responseType:"json",onload:function(e){var t=e.response;let o="";for(let e=0;e<t.data.playurl_info.playurl.stream.length;e++){var n,i=t.data.playurl_info.playurl.stream[e];String(i.protocol_name).includes("stream")&&0<i.format.length&&(n=i.format[0].codec[0].url_info[0],i=i.format[0].codec[0].base_url,o=""+n.host+i+n.extra)}e=t.data.durl;e&&(o=0<e.length?e[0].url:""),a(o)}})}function qr(i,a,e,r,l){let s=x("dy_did")||"10000000000000000000000000001501";GM_xmlhttpRequest({method:"GET",url:"https://www.douyu.com/wgapi/livenc/liveweb/websec/getEncryption?did="+s,responseType:"json",onload:function(e){if(0!==e.response.error)return l("None");var e=e.response.data,t=Math.round(Date.now()/1e3),o=((e,t,o,n,i,a)=>{let r=1===a?"":""+e+t,l=n;for(let e=0;e<i;e++)l=Or(l+o);return Or(l+o+r)})(i,(s,t),e.key,e.rand_str,e.enc_time,e.is_special),n="1428"==r?"-1":r,e=`enc_data=${e.enc_data}&tt=${t}&did=${s}&auth=${o}&cdn=&rate=${n}&hevc=0&fa=0&ive=0`;GM_xmlhttpRequest({method:"POST",url:"https://www.douyu.com/lapi/live/getH5PlayV1/"+i,data:e,responseType:"json",headers:{"Content-Type":"application/x-www-form-urlencoded"},onload:function(e){var e=e.response;0===e.error?(e=e.data.rtmp_url+"/"+e.data.rtmp_live,l(a?e:e+"&only-audio=1")):l("None")}})}})}function Ur(e,t,n){let o="500";switch(t){case"1":o="500";break;case"2":o="2500";break;case"3":o="4500";break;case"4":o="0";break;default:o="500"}GM_xmlhttpRequest({method:"GET",url:"https://mp.huya.com/cache.php?m=Live&do=profileRoom&roomid="+e,responseType:"json",onload:e=>{let t="",o="";e=e.response.data.stream.flv.multiLine;null!=(o=e.length&&0<e.length?e[0].url.replace("http","https"):o)&&""!=o||(t="房间暂未开播"),n(o,t)}})}let Wr=[],Yr=new WeakMap();function Qr(e){Wr.push(e)}let Jr=[];function Zr(e){if("SCRIPT"===e.tagName&&!e.src&&e.textContent){var o=Jr.filter(e=>e.inline);if(0!==o.length){let t=e.textContent;for(let e=0;e<o.length;e++)t=o[e].callback(t);t!==e.textContent&&(e.textContent=t)}}return e}function Xr(e,t,o){var n,i,a=e.src,r=[];for(let e=0;e<Jr.length;e++){var l=Jr[e];!l.inline&&a.includes(l.url)&&r.push(l)}return 0!==r.length&&(n=r,i=o,GM_xmlhttpRequest({method:"GET",url:a,onload:function(e){let t=e.responseText;for(let e=0;e<n.length;e++)t=n[e].callback(t);e=document.createElement("script");e.type="text/javascript",e.textContent=t,i.appendChild(e)},onerror:function(e){console.error("Error loading script via GM_xmlhttpRequest:",e)}}),1)}function Kr(e){Jr.push(e)}function $r(e){if(e)return e.toString().replace(/@S/g,"/").replace(/@A/g,"@")}function el(e){if(e)return e.includes("//")?e.split("//").filter(e=>""!==e).map(e=>el(e)):e.includes("@=")?e.split("/").filter(e=>""!==e).reduce((e,t)=>{var[t,o]=t.split("@=");return e[t]=el($r(o)),e},{}):e.includes("@A=")?el($r(e)):e.toString()}function tl(e,t){var o;null==document.getElementById(e)&&((o=document.createElement("style")).id=e,o.innerHTML=t,document.body.append(o))}function U(e){null!==document.getElementById(e)&&document.getElementById(e).remove()}function ol(e){var t=(t=>{var o,n,i=new Array;o=t.length;for(let e=0;e<o;e++)65536<=(n=String(t).charCodeAt(e))&&n<=1114111?(i.push(n>>18&7|240),i.push(n>>12&63|128),i.push(n>>6&63|128),i.push(63&n|128)):2048<=n&&n<=65535?(i.push(n>>12&15|224),i.push(n>>6&63|128),i.push(63&n|128)):128<=n&&n<=2047?(i.push(n>>6&31|192),i.push(63&n|128)):i.push(255&n);return i})(e),e=new Uint8Array(t.length+4+4+2+1+1+1),o=new Uint8Array(t.length);for(let e=0;e<o.length;e++)o[e]=t[e];var n=new Uint32Array([t.length+4+2+1+1+1]),i=new Uint32Array([689]);return e.set(new Uint8Array(n.buffer),0),e.set(new Uint8Array(n.buffer),4),e.set(new Uint8Array(i.buffer),8),e.set(o,12),e}class nl{constructor(e,t){"WebSocket"in window&&(this.timer=0,this.rid=e,this.msgHandler=t,this.reconnectCount=0,this.maxReconnect=10,this.closed=!1,this.connect())}connect(){this.ws=new WebSocket("wss://danmuproxy.douyu.com:850"+String(a(2,5))),this.ws.onopen=()=>{this.reconnectCount=0,this.ws.send(ol("type@=loginreq/roomid@="+this.rid)),this.ws.send(ol("type@=joingroup/rid@="+this.rid+"/gid@=-9999/")),this.timer=setInterval(()=>{this.ws.send(ol("type@=mrkl/"))},4e4)},this.ws.onerror=()=>{if(!this.closed&&this.ws)try{this.ws.close()}catch(e){}},this.ws.onmessage=t=>{if(!this.closed){let e=new FileReader;e.onload=()=>{if(!this.closed){var t=String(e.result).split("\0");e=null;for(let e=0;e<t.length;e++)12<t[e].length&&this.msgHandler(t[e])}},e.readAsText(t.data)}},this.ws.onclose=()=>{clearInterval(this.timer),this.timer=0,this.ws=null,this.closed||this.reconnect()}}reconnect(){var e;this.closed||this.reconnectCount>=this.maxReconnect||(this.reconnectCount++,e=Math.min(3e3*Math.pow(1.5,this.reconnectCount-1),6e4),setTimeout(()=>{this.closed||this.connect()},e))}close(){if(!this.closed&&(this.closed=!0,clearInterval(this.timer),this.timer=0,this.ws)){var e=this.ws;this.ws=null,e.onclose=null,e.onerror=null,e.onmessage=null;try{e.readyState!==WebSocket.OPEN&&e.readyState!==WebSocket.CONNECTING||e.close()}catch(e){}}}}

/* ==================== DouyuEx-RL 智能版本生命周期与更新推送系统 ==================== */
function isNewerVersion(remote, local) {
    if (!remote || !local) return false;
    var rParts = String(remote).replace(/^v/i, "").split(".").map(Number);
    var lParts = String(local).replace(/^v/i, "").split(".").map(Number);
    for (var i = 0; i < Math.max(rParts.length, lParts.length); i++) {
        var r = rParts[i] || 0;
        var l = lParts[i] || 0;
        if (r > l) return true;
        if (r < l) return false;
    }
    return false;
}

function initVersionLifecycleNotice() {
    var currentVer = P || "2026.09.14.05";
    var lastNotifiedVer = GM_getValue("Ex_LastNotifiedVersion");

    if (!lastNotifiedVer) {
        // 首次安装用户记录基准版本
        GM_setValue("Ex_LastNotifiedVersion", currentVer);
    }

    // 【方案 B：在线自动探测 Greasy Fork 新版本 (12小时限频，静默红点提醒)】
    var lastCheckTime = Number(GM_getValue("Ex_LastUpdateCheckTime") || 0);
    var now = Date.now();
    if (now - lastCheckTime > 12 * 3600 * 1000) {
        GM_setValue("Ex_LastUpdateCheckTime", String(now));
        setTimeout(function() {
            var handleRemoteData = function(data) {
                if (data && data.version && isNewerVersion(data.version, currentVer)) {
                    var tip = document.getElementById("ex-update__tip");
                    if (tip) tip.style.display = "block";
                }
            };
            if (typeof GM_xmlhttpRequest === "function") {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: "https://greasyfork.org/scripts/595575.json",
                    responseType: "json",
                    onload: function(res) {
                        var data = res.response;
                        if (typeof data === "string") {
                            try { data = JSON.parse(data); } catch(e) {}
                        }
                        handleRemoteData(data);
                    }
                });
            } else {
                fetch("https://greasyfork.org/scripts/595575.json")
                    .then(function(res) { return res.json(); })
                    .then(handleRemoteData)
                    .catch(function(err) {});
            }
        }, 5000);
    }
}
window.initVersionLifecycleNotice = initVersionLifecycleNotice;
try {
    if (typeof unsafeWindow !== "undefined") {
        unsafeWindow.initVersionLifecycleNotice = initVersionLifecycleNotice;
    }
} catch(e) {}
setTimeout(function() {
    try {
        initVersionLifecycleNotice();
    } catch(e) {}
}, 1000);
