let timeout;
let bagInfoDomHook = null;
function initPkg_BagInfo() {
	initPkg_BagInfo_Func();
}

function initPkg_BagInfo_Func() {
    let backpackDom = getValidDom([".BackpackButton", "#js-backpack-enter"])
    if (!backpackDom) {
        return;
    }
	backpackDom.addEventListener("click", function() {
        setTimeout(() => {
            if (bagInfoDomHook) {
                bagInfoDomHook.closeHook();
                bagInfoDomHook = null;
            }
            let giftItemNum = document.querySelectorAll(".ToolbarBackpack-giftItem").length;
            bagInfoDomHook = new DomHook(".BackpackExpandPanel-giftListWrap", true, (e) => {
                if (giftItemNum != document.querySelectorAll(".ToolbarBackpack-giftItem").length) {
                    backpackDom.click();
                    backpackDom.click();
                }
            });
        }, 500);

        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const isBeta = !!document.getElementsByClassName("BackpackExpandPanel")[0];
            if (getValidDom([".Backpack.JS_Backpack", ".BackpackExpandPanel"])) {
                getBagGifts(rid, (ret) => {
                    // 接口没给 list（未登录 / 网络失败）时不能按索引硬取，否则整块统计直接不出现
                    if (!ret || !ret.data || !Array.isArray(ret.data.list)) return;
                    let chunkNum = ret.data.list.length;
                    if (chunkNum > 0) {
                        let totalPrice = 0;
                        let totalIntimate = 0;
                        let chunkList = getValidDomList([".Backpack-prop", ".ToolbarBackpack-giftItem"]);
                        for (let i = 0; i < chunkNum; i++) {
                            // 接口条目比 DOM 格子多（加载慢 / 版式不同）时跳过，别让 insertBefore 抛掉整块
                            let chunk = chunkList[i];
                            let isValuable = ret.data.list[i].isValuable; // 判断是否是有价值的礼物
                            let expiry = ret.data.list[i].expiry; // 过期时间（秒级时间戳）
                            let price = ret.data.list[i].price; // 注意这个要除100才是真实价格，否则是亲密度
                            let intimate = ret.data.list[i].intimate; // 亲密度
                            let count = ret.data.list[i].count; // 数量
                            if (isValuable == "1") {
                                totalPrice = totalPrice + Number(price) * Number(count);
                            }
                            totalIntimate = totalIntimate + Number(intimate) * Number(count);
                            let expiryText = BagInfo_formatExpiry(expiry);
                            if (!chunk || !expiryText) continue;
                            let expiryDiv = document.createElement("div");
                            expiryDiv.className = "bag-info";
                            if (isBeta) {
                                expiryDiv.style.left = "8px";
                                expiryDiv.style.bottom = "auto";
                            }
                            expiryDiv.textContent = expiryText;
                            chunk.insertBefore(expiryDiv, chunk.childNodes[0]);
                        }
                        const headerDom = getValidDom([".BackpackHeader-extInfo", ".BackpackExpandPanel-backpackHeader"]);
                        // 头部容器没渲染出来时只丢统计条，不能连清空按钮一起崩掉
                        if (!headerDom) return;
                        if (isBeta) {
                            headerDom.innerHTML = headerDom.innerHTML + 
                            `<span style="width: 100%;display: flex;justify-content: space-between;align-items: center;flex: 1;margin-left: 12px;">
                                <span>
                                    <span>总价值:</span>
                                    <span>￥${String(Number(totalPrice / 100).toFixed(2))}</span>
                                    <span>总亲密度:</span>
                                    <span>${String(totalIntimate)}</span>
                                </span>
                                <span class="bag-button" id="Backpack__clearbag" style="background: rgb(70, 171, 255) !important;color: white !important;">清空背包</span>
                            </span>`
                        } else {
                            headerDom.innerHTML = `<span style="float: left">` + "总价值：" + String(Number(totalPrice / 100).toFixed(2)) + " 总亲密度：" + String(totalIntimate) + `<span class="bag-button" id="Backpack__clearbag">清空背包</span></span>` + headerDom.innerHTML;
                        }
                        
                        let clearBtn = document.getElementById("Backpack__clearbag");
                        if (clearBtn) clearBtn.addEventListener("click", () => {
                            if (confirm("确认清空？") != true) {
                                return;
                            }
                            showMessage("【清空背包】执行中...", "info");
                            getBagGifts(rid, (ret) => {
                                clearBagGifts(ret, rid);
                            })
                        })

                    }
                });
            }
        }, 500);
    });
}

/* 到期时间：接口给的是秒级时间戳，原来直接 innerHTML = expiry - 1，
   页面下方就是一行 10 位裸数字（有时还是 NaN）。这里按日期显示，没有到期时间就不占版面。 */
function BagInfo_formatExpiry(expiry) {
    let n = Number(expiry);
    if (!expiry || !isFinite(n) || n <= 0) return "";
    if (n < 1e12) n = n * 1000;          // 正常是秒；已经是毫秒的就别再乘
    let d = new Date(n);
    if (isNaN(d.getTime())) return String(expiry);
    if (typeof dateFormat === "function") return dateFormat("yyyy-MM-dd", d);
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}

async function clearBagGifts(bagGiftsJson, room_id) {
    // 赠送背包内所有的礼物
    let chunkNum = bagGiftsJson.data.list.length;
    if (chunkNum > 0) {
        for (let i = 0; i < chunkNum; i++) {
            let gift_id = bagGiftsJson.data.list[i].id;
            let gift_cnt = bagGiftsJson.data.list[i].count;
            if (Object.keys(bagGiftsJson.data.list[i].batchInfo).length > 0) {
                await sleep(100).then(() => {
                    sendGift_bag(gift_id, gift_cnt, room_id);
                })
            } else {
                for (let j = 0; j < gift_cnt; j++) {
                    await sleep(100).then(() => {
                        sendGift_bag(gift_id, 1, room_id);
                    })
                }
            }
        }
        showMessage("【清空背包】执行完毕！", "success");
    } else {
        showMessage("背包礼物为空", "error");
    }
}