function initPkg_VideoTools_VideoSpeed() {
    initPkg_VideoTools_VideoSpeed_Dom();
    initPkg_VideoTools_VideoSpeed_Func();
}

function initPkg_VideoTools_VideoSpeed_Dom() {
    VideoSpeed_insertIcon();
}
function VideoSpeed_insertIcon() {
    let a = document.createElement("li");
    a.id = "ex-videospeed";
    a.innerHTML = `
    倍速播放
    <ul class="videospeed__wrap">
        <li id="videospeed__2.0">2.0x</li>
        <li id="videospeed__1.5">1.5x</li>
        <li id="videospeed__1.25">1.25x</li>
        <li id="videospeed__1.0">1.0x</li>
        <li id="videospeed__0.75">0.75x</li>
        <li id="videospeed__0.5">0.5x</li>
    </ul>
    `;

    let b = document.getElementsByClassName("menu-da2a9e")[0];
    if (b) b.insertBefore(a, b.childNodes[1]);
}

function initPkg_VideoTools_VideoSpeed_Func() {
    const speeds = [
        { id: "videospeed__2.0", rate: 2 },
        { id: "videospeed__1.5", rate: 1.5 },
        { id: "videospeed__1.25", rate: 1.25 },
        { id: "videospeed__1.0", rate: 1 },
        { id: "videospeed__0.75", rate: 0.75 },
        { id: "videospeed__0.5", rate: 0.5 }
    ];
    speeds.forEach(item => {
        let el = document.getElementById(item.id);
        if (el) {
            el.addEventListener("click", () => {
                if (typeof liveVideoNode !== "undefined" && liveVideoNode) {
                    liveVideoNode.playbackRate = item.rate;
                }
            });
        }
    });
}
