function initPkg_ExpandTool_P2P() {
    ExpandTool_P2P_insertDom();
    ExpandTool_P2P_insertFunc();
    initPkg_ExpandTool_P2P_Set();
}

function ExpandTool_P2P_insertDom() {
    let container = document.querySelector(".extool__playback-perf");
    if (!container) {
        container = document.createElement("div");
        container.className = "extool__playback-perf";
        let b = document.getElementsByClassName("extool")[0];
        if (b) b.insertBefore(container, b.childNodes[0]);
    }
    let label = document.createElement("label");
    label.title = "阻止P2P在后台占用上传带宽，降低延迟";
    label.innerHTML = '<input id="extool__p2p" type="checkbox">阻止P2P上传';
    container.appendChild(label);
}


function getP2P() {
    return document.getElementById("extool__p2p").checked;
}
function ExpandTool_P2P_insertFunc() {
    document.getElementById("extool__p2p").addEventListener("click", function() {
        saveData_P2P();
        if (getP2P()) {
            showMessage("阻止p2p上传成功，刷新页面生效", "success");
        }
    });
}

function saveData_P2P() {
	let data = {
		isKillP2P: getP2P()
	}
	localStorage.setItem("ExSave_P2P", JSON.stringify(data)); // 存储弹幕列表
}
function initPkg_ExpandTool_P2P_Set() {
	// 设置初始化
	let ret = localStorage.getItem("ExSave_P2P");
	if (ret != null) {
		let retJson = JSON.parse(ret);
        if (retJson.isKillP2P) {
            document.getElementById("extool__p2p").checked = retJson.isKillP2P;
        }
	}
}


function initKillP2P() {
	let ret = localStorage.getItem("ExSave_P2P");
	if (ret != null) {
		let retJson = JSON.parse(ret);
        if (retJson.isKillP2P) {
            killP2P();
        }
	}
}

class GracefulP2PBlocker {
  constructor() {
    this.connectionState = "failed";
    this.iceConnectionState = "failed";
    this.signalingState = "closed";
    this.iceGatheringState = "complete";
    this.localDescription = null;
    this.remoteDescription = null;
    this.onicecandidate = null;
    this.ontrack = null;
    this.ondatachannel = null;
  }
  createDataChannel() {
    return {
      send: function () {},
      close: function () {},
      addEventListener: function () {},
      removeEventListener: function () {},
      readyState: "closed"
    };
  }
  createOffer() {
    return Promise.reject(new DOMException("WebRTC P2P disabled by user policy", "NotSupportedError"));
  }
  createAnswer() {
    return Promise.reject(new DOMException("WebRTC P2P disabled by user policy", "NotSupportedError"));
  }
  setLocalDescription() {
    return Promise.resolve();
  }
  setRemoteDescription() {
    return Promise.resolve();
  }
  addIceCandidate() {
    return Promise.resolve();
  }
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return false;
  }
  close() {}
  getStats() {
    return Promise.resolve(new Map());
  }
}

function killP2P() {
  let funNameList = [
    "RTCPeerConnection",
    "webkitRTCPeerConnection",
    "mozRTCPeerConnection",
    "msRTCPeerConnection"
  ];
  funNameList.forEach((name) => {
    if (typeof unsafeWindow.RTCPeerConnection === "undefined") unsafeWindow.RTCPeerConnection = unsafeWindow[name];
    try {
      unsafeWindow[name] = GracefulP2PBlocker;
    } catch (err) {}
    try {
      window[name] = GracefulP2PBlocker;
    } catch (err) {}
  });
}