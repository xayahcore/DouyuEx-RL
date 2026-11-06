let anchorPocketData = {
  t: 0,
  list: []
};

async function initPkg_CheckAnchorPocket() {
  await updateAnchorPocketData();
  new DomHook(".FansMedalPanel-enter", false, async (m) => {
    const targetDom = document.querySelector(".FansMedalInfo-head");
    if (!targetDom) return;

    const currentDate = new Date();
    const currentDay = currentDate.getDate();

    const anchorDate = new Date(anchorPocketData.t);
    const anchorDay = anchorDate.getDate();

    if (currentDay > anchorDay) {
      await updateAnchorPocketData();
    }

    const list = anchorPocketData.list;
    if (list.length === 0) return;
    const dom = document.createElement("div");
    dom.innerHTML = `
      <div class="dx-d-flex dx-ai-center dx-gap-8 dx-mt-4" >
        ${list
          .map(
            (item) => `
          <div class="dx-d-flex dx-ai-center" >
            <img class="dx-w-20 dx-h-20 dx-mr-4" src="${item.webIcon}" alt="${item.name}" >
            <span class="dx-fs-12"  >${item.name}</span>
          </div>
        `
          )
          .join("")}
      </div>
    `;
    targetDom.appendChild(dom);
  });
}

async function updateAnchorPocketData() {
  const newList = await getAnchorPocketList(rid);
  anchorPocketData.list = newList;
  anchorPocketData.t = new Date().getTime();
}

async function getAnchorPocketList(rid) {
  return new Promise((resolve, reject) => {
    fetch(`https://www.douyu.com/japi/interact/cdn/pocket/effective?rid=${rid}`, {
      method: "GET",
      mode: "no-cors",
      credentials: "include"
    })
      .then((result) => {
        return result.json();
      })
      .then((res) => {
        if (!res.data) return resolve([]);
        resolve(res.data.list);
      })
      .catch((err) => {
        console.log("请求失败!", err);
      });
  });
}
