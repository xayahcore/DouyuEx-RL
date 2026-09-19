function* (__imports) {
yield {"mountBackpackControls": { get: () => mountBackpackControls, set: value => { mountBackpackControls = value; } }};
/**
 * 播放器底栏背包控件装配 (资产价值统计、到期倒计时与一键清空背包)
 * @param {object} owner - 房间装配生命周期托管者
 */
function mountBackpackControls(owner) {
  const enterBtn = (0, __imports.E)([".BackpackButton", "#js-backpack-enter"]);
  if (!enterBtn) return;

  owner.listen(enterBtn, "click", () => {
    owner.timeout(() => {
      if (__imports.de) {
        __imports.de.closeHook?.();
        __imports.de = null;
      }
      const initialItemsCount = document.querySelectorAll(".ToolbarBackpack-giftItem").length;
      __imports.de = new __imports.DomMutationSubscription(".BackpackExpandPanel-giftListWrap", true, () => {
        if (initialItemsCount !== document.querySelectorAll(".ToolbarBackpack-giftItem").length) {
          enterBtn.click();
          enterBtn.click();
        }
      }, owner);
    }, 500);

    (0, __imports.clearTimeout)(__imports.se);
    __imports.se = owner.timeout(() => {
      const isExpand = Boolean(document.getElementsByClassName("BackpackExpandPanel")[0]);
      const backpackRoot = (0, __imports.E)([".Backpack.JS_Backpack", ".BackpackExpandPanel"]);
      if (!backpackRoot) return;

      (0, __imports.pt)(__imports.B, (res) => {
        const list = res?.data?.list || [];
        if (list.length === 0) return;

        let totalValuableCents = 0;
        let totalIntimate = 0;

        const findItems = (selectors) => {
          for (const sel of selectors) {
            const matches = typeof sel === "string" ? document.querySelectorAll(sel) : sel;
            if (matches && matches.length > 0) return matches;
          }
          return [];
        };

        const domPropItems = findItems([".Backpack-prop", ".ToolbarBackpack-giftItem"]);

        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          const domEl = domPropItems[i];
          const isValuable = item.isValuable;
          const expiry = item.expiry;
          const price = item.price;
          const intimate = item.intimate;
          const count = item.count;

          if (isValuable === "1") {
            totalValuableCents += Number(price) * Number(count);
          }
          totalIntimate += Number(intimate) * Number(count);

          if (domEl) {
            const badge = document.createElement("div");
            badge.className = "bag-info";
            if (isExpand) {
              badge.style.left = "8px";
              badge.style.bottom = "auto";
            }
            badge.innerHTML = String(expiry - 1);
            domEl.insertBefore(badge, domEl.childNodes[0]);
          }
        }

        const headerEl = (0, __imports.E)([
          ".BackpackHeader-extInfo",
          ".BackpackExpandPanel-backpackHeader",
        ]);

        if (headerEl) {
          const totalValYuan = (totalValuableCents / 100).toFixed(2);
          if (isExpand) {
            headerEl.innerHTML += `
              <span style="width: 100%; display: flex; justify-content: space-between; align-items: center; flex: 1; margin-left: 12px;">
                <span>
                  <span>总价值:</span>
                  <span>￥${totalValYuan}</span>
                  <span>总亲密度:</span>
                  <span>${totalIntimate}</span>
                </span>
                <span class="bag-button" id="Backpack__clearbag" style="background: rgb(70, 171, 255) !important; color: white !important;">清空背包</span>
              </span>
            `;
          } else {
            headerEl.innerHTML = `
              <span style="float: left">总价值：${totalValYuan} 总亲密度：${totalIntimate}<span class="bag-button" id="Backpack__clearbag">清空背包</span></span>
            ` + headerEl.innerHTML;
          }

          (0, __imports.safeBind)("#Backpack__clearbag", "click", () => {
            if (confirm("确认清空？")) {
              (0, __imports.T)("【清空背包】执行中...", "info");
              (0, __imports.pt)(__imports.B, (backpackData) => {
                (async (dataObj, currentRoom) => {
                  const giftList = dataObj?.data?.list || [];
                  if (giftList.length > 0) {
                    for (let i = 0; i < giftList.length; i++) {
                      const propId = giftList[i].id;
                      const propCount = giftList[i].count;
                      const hasBatch = Object.keys(giftList[i].batchInfo || {}).length > 0;

                      if (hasBatch) {
                        await (0, __imports.b)(100);
                        (0, __imports.Ut)(propId, propCount, currentRoom);
                      } else {
                        for (let c = 0; c < propCount; c++) {
                          await (0, __imports.b)(100);
                          (0, __imports.Ut)(propId, 1, currentRoom);
                        }
                      }
                    }
                    (0, __imports.T)("【清空背包】执行完毕！", "success");
                  } else {
                    (0, __imports.T)("背包礼物为空", "error");
                  }
                })(backpackData, __imports.B);
              });
            }
          }, owner);
        }
      });
    }, 500);
  });
}

}
