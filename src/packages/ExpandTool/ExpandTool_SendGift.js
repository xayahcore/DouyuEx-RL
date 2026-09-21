function initPkg_ExpandTool_SendGift() {
    ExpandTool_SendGift_insertDom();
    initPkg_ExpandTool_SendGift_Set();
    ExpandTool_SendGift_insertFunc();
}

function initPkg_ExpandTool_SendGift_Set() {
    let ret = localStorage.getItem("ExSave_SendGift");
    if (ret != null) {
        try {
            let data = JSON.parse(ret);
            if (data.id) {
                let idEl = document.getElementById("extool__sendgift_id");
                if (idEl) idEl.value = data.id;
            }
            if (data.name) {
                let nameEl = document.getElementById("extool__sendgift_name") || document.getElementById("extool__sendgift_selected_name");
                if (nameEl) nameEl.textContent = data.name;
            }
            if (data.icon) {
                let iconEl = document.getElementById("extool__sendgift_icon");
                if (iconEl) iconEl.src = data.icon;
            }
            if (data.count) {
                let cntEl = document.getElementById("extool__sendgift_cnt");
                if (cntEl) cntEl.value = data.count;
            }
            if (typeof data.delay !== "undefined") {
                let delayEl = document.getElementById("extool__sendgift_delay");
                if (delayEl) delayEl.value = data.delay;
            }
        } catch(e) {}
    }
}

function saveData_ExpandTool_SendGift() {
    let id = document.getElementById("extool__sendgift_id")?.value || "20000";
    let name = document.getElementById("extool__sendgift_name")?.textContent || document.getElementById("extool__sendgift_selected_name")?.textContent || "弱鸡";
    let icon = document.getElementById("extool__sendgift_icon")?.src || "";
    let count = document.getElementById("extool__sendgift_cnt")?.value || "1";
    let delay = document.getElementById("extool__sendgift_delay")?.value || "0";
    let data = { id, name, icon, count, delay };
    localStorage.setItem("ExSave_SendGift", JSON.stringify(data));
}

function ExpandTool_SendGift_insertDom() {
    if (document.getElementById("extool__sendgift_id")) return;
    let html = "";
    html += '<label>打榜送礼：</label><button type="button" id="extool__sendgift_picker_btn" style="border:1px solid #007aff;color:#007aff;background:#fff;border-radius:6px;padding:2px 8px;font-size:12px;cursor:pointer;margin-left:4px;">选择礼物</button><br />';
    html += '<label>礼物ID：</label><input id="extool__sendgift_id" type="text" style="width:55px;text-align:center;margin-right:6px;" value="20000" />';
    html += '<span id="extool__sendgift_selected_name" style="color:#007aff;font-size:12px;margin-right:8px;">(弱鸡)</span>';
    html += '<label>数量：</label><input id="extool__sendgift_cnt" type="text" style="width:36px;text-align:center;margin-right:8px;" value="1" />';
    html += '<label>间隔ms：</label><input id="extool__sendgift_delay" type="text" style="width:36px;text-align:center;" value="0" />';
    html += '<input style="margin-left:10px;" type="button" id="extool__sendgift_btn" value="送出" />';
    let a = document.createElement("div");
    a.className = "extool__sendgift";
    a.innerHTML = html;
    let b = document.getElementsByClassName("extool")[0];
    b.insertBefore(a, b.childNodes[0]);
}

function ExpandTool_SendGift_insertFunc() {
    let pickerTrigger = document.getElementById("extool__sendgift_badge") || document.getElementById("extool__sendgift_picker_btn");
    if (pickerTrigger) {
        pickerTrigger.addEventListener("click", () => {
            if (typeof openGiftPicker === "function") {
                openGiftPicker("room", (gift) => {
                    let idEl = document.getElementById("extool__sendgift_id");
                    if (idEl) idEl.value = gift.id;
                    let nameEl = document.getElementById("extool__sendgift_name") || document.getElementById("extool__sendgift_selected_name");
                    if (nameEl) nameEl.textContent = gift.name;
                    let iconEl = document.getElementById("extool__sendgift_icon");
                    if (iconEl && gift.icon) iconEl.src = gift.icon;
                    saveData_ExpandTool_SendGift();
                });
            }
        });
    }

    let cntInput = document.getElementById("extool__sendgift_cnt");
    if (cntInput) {
        cntInput.addEventListener("input", saveData_ExpandTool_SendGift);
        cntInput.addEventListener("change", saveData_ExpandTool_SendGift);
    }
    let delayInput = document.getElementById("extool__sendgift_delay");
    if (delayInput) {
        delayInput.addEventListener("input", saveData_ExpandTool_SendGift);
        delayInput.addEventListener("change", saveData_ExpandTool_SendGift);
    }

    let sendBtn = document.getElementById("extool__sendgift_btn");
    if (sendBtn) {
        sendBtn.addEventListener("click", async () => {
        if (confirm("确认送出？") != true) {
            return;
        }
        let gid = document.getElementById("extool__sendgift_id").value;
        let gcnt = document.getElementById("extool__sendgift_cnt").value;
        let delay = Number(document.getElementById("extool__sendgift_delay").value);
        let t_num = 0;
        let t_price = 0;
        for (let i = 0; i < Number(gcnt); i++) {
            sendGift_any(gid, 1, rid).then(ret => {
                if (ret.data != null) {
                    if (ret.msg != "鱼翅不足") {
                        t_num = t_num + 1;
                        t_price = t_price + Number(ret.data.priceType);
                    } else {
                        console.log("【送礼】" + gid + ret.msg);
                    }
                } else {
                    console.log("【送礼】" + gid + ret.msg);
                }
                if (i == Number(gcnt) - 1) {
                    showMessage("【送礼】赠送完毕！详细信息可以在F12控制台查看", "success");
                    console.log("【送礼】赠送完毕！详细信息可以在F12控制台查看");
                }
            }).catch(err => {
                console.log("请求失败!", err);
            })
            if (delay > 0) {
                await sleep(delay);
            }
        }
        showMessage("【送礼】执行中...", "info");
        });
    }
}

function sendGift_any(gid, count, rid) {
	// 送任意东西
	// gid: 268是荧光棒
	// count: 数量
	// rid: 房间号
	return fetch("https://www.douyu.com/japi/gift/donate/mainsite/v1", {
		method: 'POST',
		mode: 'no-cors',
		credentials: 'include',
		headers: {'Content-Type': 'application/x-www-form-urlencoded'},
		body: 'giftId=' + gid + '&giftCount=' + count + '&roomId=' + rid + '&bizExt=%7B%22yzxq%22%3A%7B%7D%7D'
	}).then(res => {
		return res.json();
	})
}