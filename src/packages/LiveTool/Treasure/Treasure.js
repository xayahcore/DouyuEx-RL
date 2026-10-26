var treasureNum = 0;
function initPkg_LiveTool_Treasure() {
    LiveTool_Treasure_insertModal();
}

function LiveTool_Treasure_insertModal() {
	let a = document.createElement("div");
	a.className = "livetool__Treasure";
	a.id = "Ex_Geetest";
	let b = document.getElementsByClassName("Barrage-main")[0];
	if (b) {
		b.insertBefore(a, b.childNodes[0]);
	} else {
		ExGuard_warn("自动抢宝箱", "未找到 .Barrage-main 容器，宝箱挂载点未插入（自动抢宝箱不启用）");
	}
}

function initPkg_LiveTool_Treasure_Handle(text) {
    if (isGetTreasure == false) {
        return;
    }
    if (getType(text) == "tsboxb") {
        let ot = getStrMiddle(text, "ot@=", "/");
        let rpid = getStrMiddle(text, "rpid@=", "/");
        let rid = getStrMiddle(text, "rid@=", "/");
        let did = getCookieValue("dy_did");
        let timeout = Number(ot) - Math.floor(Date.now()/1000);
        timeout = timeout * 1000 + getTreasureDelay();

        // 挂载点没插进来（页面缺 .Barrage-main）时直接跳过本轮，别在 b.appendChild 上抛
        let b = document.getElementById("Ex_Geetest");
        if (!b) {
            ExGuard_warn("自动抢宝箱", "宝箱挂载点不存在，跳过本次抢宝箱（不影响其它功能）");
            return;
        }
        treasureNum++;
        let a = document.createElement("div");
        let idName = "Ex_Geetest_no" + String(treasureNum);
        a.id = idName;
        b.appendChild(a);

        setTimeout(() => {
            getTreasure(rid, rpid, did, idName);
        }, timeout);
    }
}

/** 清掉这次抢宝箱用的空容器（成功、失败、被风控都要清，否则页面上会一直挂着一个空 div） */
function Treasure_cleanupNode(idName) {
    let el = document.getElementById(idName);
    if (el) el.remove();
}

function getTreasure(roomid, rpid, deviceid, idName) {
    GM_xmlhttpRequest({
        method: "POST",
        url: "https://pcapi.douyucdn.cn/h5nc/member/getRedPacket?token=" + dyToken,
        data: "room_id=" + roomid + "&package_room_id=" + roomid + "&device_id=" + deviceid + "&packerid=" + rpid + "&version=1",
        responseType: "json",
        timeout: 15000,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        onerror: function (err) {
            // 旧实现只有 onload：网络失败时宝箱流程静默死掉，页面还留着空容器（audit-wave4 TR1）
            ExGuard_warn("自动抢宝箱", "领宝箱请求失败，本次跳过", err);
            Treasure_cleanupNode(idName);
        },
        ontimeout: function () {
            ExGuard_warn("自动抢宝箱", "领宝箱请求超时，本次跳过");
            Treasure_cleanupNode(idName);
        },
        onload: function(response) {
            let ret = response && response.response;
            let data = ret && ret.data;
            if (!data) {
                ExGuard_warn("自动抢宝箱", "宝箱接口返回异常，本次跳过");
                Treasure_cleanupNode(idName);
                return;
            }
            if (data.code == "-1" && data.validate != "0") {
                let v = null;
                try {
                    v = JSON.parse(data.geetest.validate_str);
                } catch (e) {
                    ExGuard_warn("自动抢宝箱", "验证串解析失败，本次跳过", e);
                    Treasure_cleanupNode(idName);
                    return;
                }
                if (!v) { Treasure_cleanupNode(idName); return; }
                let success = v.success;
                let challenge = v.challenge;
                let gt = v.gt;

                let handler = (e) => {
                    // 2021-3-18 09:51:47 免打扰
                    // showMessageWindow(rid, "【宝箱】请手动验证领取宝箱", () => {
                    //     window.focus();
                    // });
                    let idDiv = document.getElementById(idName);
                    e.appendTo("#" + idName);
                    e.onSuccess(() => {
                        let result = e.getValidate();
                        let geetest_challenge = result.geetest_challenge;
                        let geetest_seccode = result.geetest_seccode;
                        let geetest_validate = result.geetest_validate;
                        let reqData = "room_id=" + roomid + "&package_room_id=" + roomid + "&device_id=" + deviceid + "&packerid=" + rpid + "&version=1";
                        reqData = reqData + "&geetest_challenge=" + geetest_challenge + "&geetest_validate=" + geetest_validate + "&geetest_seccode=" + encodeURIComponent(geetest_seccode);
                        GM_xmlhttpRequest({
                            method: "POST",
                            url: "https://pcapi.douyucdn.cn/h5nc/member/getRedPacket?token=" + dyToken,
                            data: reqData,
                            responseType: "json",
                            timeout: 15000,
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            onerror: function (err) {
                                ExGuard_warn("自动抢宝箱", "验证后的领奖请求失败", err);
                                Treasure_cleanupNode(idName);
                            },
                            ontimeout: function () {
                                ExGuard_warn("自动抢宝箱", "验证后的领奖请求超时");
                                Treasure_cleanupNode(idName);
                            },
                            onload: function (response) {
                                let ret = response && response.response;
                                let rdata = ret && ret.data;
                                if (!rdata) {
                                    ExGuard_warn("自动抢宝箱", "领奖返回异常，本次跳过");
                                    Treasure_cleanupNode(idName);
                                    return;
                                }
                                let msg = "";
                                if (rdata.prop_id == "") {
                                    msg = "鱼丸x" + rdata.silver;
                                } else {
                                    msg = rdata.prop_name + "x" + rdata.prop_count;
                                }
                                if (msg != "") {
                                    showMessage("【宝箱】获得" + msg, "success");
                                }
                                Treasure_cleanupNode(idName);
                            }
                        });
                    });
                };
                if (unsafeWindow.initGeetest != undefined) {
                    unsafeWindow.initGeetest({
                        gt: gt,
                        challenge: challenge,
                        offline: !success,
                        product: "float",
                    }, handler);
                } else {
                    showMessage("宝箱验证初始化失败", "error");
                }
            } else {
                // 走到这里的都表示"这次没有需要验证的宝箱"（已领过 / 领取失败 / 验证码错）：
                // 统一收掉空容器，别让 Ex_Geetest_noN 留在页面上（audit-wave4 TR2）
                if (data.msg != "领取失败" && data.msg != "验证码不正确") {
                    let msg = "";
                    if (data.prop_id == "") {
                        msg = "鱼丸x" + data.silver;
                    } else {
                        msg = data.prop_name + "x" + data.prop_count;
                    }
                    if (msg != "") {
                        showMessage("【宝箱】获得" + msg, "success");
                    }
                } else {
                    showMessage("【宝箱】领取失败", "error");
                }
                Treasure_cleanupNode(idName);
            }
        }
    });
}


function getTreasure_Verify(challenge, validate, seccode, divId) {
    let data = "room_id=" + roomid + "&package_room_id=" + roomid + "&device_id=" + deviceid + "&packerid=" + rpid + "&version=1";
    data += "&geetest_challenge=" + challenge + "&geetest_validate=" + validate + "&geetest_seccode=" + encodeURIComponent(seccode);
    GM_xmlhttpRequest({
        method: "POST",
        url: "https://pcapi.douyucdn.cn/h5nc/member/getRedPacket?token=" + dyToken,
        data: data,
        responseType: "json",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        onload: function(response) {
            let ret = response.response;
            if (document.getElementById(divId) != null) {
                document.getElementById(divId).remove();
            }
        }
    });
}
