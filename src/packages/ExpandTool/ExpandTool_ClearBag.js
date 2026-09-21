function initPkg_ExpandTool_ClearBag() {
    ExpandTool_ClearBag_insertDom();
    ExpandTool_ClearBag_insertFunc();
}

function ExpandTool_ClearBag_insertDom() {
    let html = "";
    html += '<label>背包送礼：</label><button type="button" id="extool__clearbag_picker_btn" style="border:1px solid #007aff;color:#007aff;background:#fff;border-radius:6px;padding:2px 8px;font-size:12px;cursor:pointer;margin-left:4px;">选择道具</button><br />';
    html += '<label>礼物ID：</label><input id="extool__clearbag_id" type="text" style="width:55px;text-align:center;margin-right:6px;" value="268" />';
    html += '<span id="extool__clearbag_selected_name" style="color:#007aff;font-size:12px;margin-right:8px;">(荧光棒)</span>';
    html += '<label>数量：</label><input id="extool__clearbag_cnt" type="text" style="width:36px;text-align:center;" value="1" />';
    html += '<input style="margin-left:10px;" type="button" id="extool__clearbag_sendbtn" value="送出" />';
    let a = document.createElement("div");
    a.className = "extool__clearbag";
    a.innerHTML = html;
    let b = document.getElementsByClassName("extool")[0];
    b.insertBefore(a, b.childNodes[0]);
}

function ExpandTool_ClearBag_insertFunc() {
    let pickerBtn = document.getElementById("extool__clearbag_picker_btn");
    if (pickerBtn) {
        pickerBtn.addEventListener("click", () => {
            if (typeof openGiftPicker === "function") {
                openGiftPicker("backpack", (gift) => {
                    document.getElementById("extool__clearbag_id").value = gift.id;
                    let nameEl = document.getElementById("extool__clearbag_selected_name");
                    if (nameEl) nameEl.textContent = `(${gift.name})`;
                    if (gift.count) {
                        document.getElementById("extool__clearbag_cnt").value = gift.count;
                    }
                });
            }
        });
    }

    document.getElementById("extool__clearbag_sendbtn").addEventListener("click", async function() {
        if (confirm("确认送出？") != true) {
            return;
        }
        let id = document.getElementById("extool__clearbag_id").value;
        let n = Number(document.getElementById("extool__clearbag_cnt").value);
        showMessage("【背包送礼】执行中...", "info");
        for (let i = 0; i < n; i++) {
            await sleep(100).then(() => {
                sendGift_bag(id, 1, rid).then(data => {
                    if (data.msg != "success") {
                        showMessage("【背包送礼】" + rid + "赠送失败 " + data.msg, "error");
                        console.log(rid, data);
                    }
                }).catch(err => {
                    showMessage("【背包送礼】" + rid + "赠送失败", "error");
                    console.log(rid, err);
                })
            })

        }
        showMessage("【背包送礼】执行完毕！", "success");
    });
}

function getBagGifts(room_id, callback) {
    // 获取背包内所有礼物信息(json)，传给回调函数
    fetch('https://www.douyu.com/japi/prop/backpack/web/v5?rid=' + room_id, {
        method: 'GET',
        mode: 'no-cors',
        credentials: 'include',
        headers: {'Content-Type':'application/x-www-form-urlencoded'},
    }).then(result => {
        return result.json();
    }).then(ret => {
        callback(ret);
    }).catch(err => {
        console.log("请求失败!", err)
    })
}