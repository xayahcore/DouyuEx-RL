function initPkg_ExpandTool_P2P() {
    ExpandTool_P2P_insertFunc();
    initPkg_ExpandTool_P2P_Set();
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
		// 本地档位被写坏时不能让整个 KillP2P 初始化失败（那等于拦截静默失效）：
		// 弹幕小尾巴那处同类问题早就修过，这里补上同一口径。
		let retJson = null;
		try {
			retJson = JSON.parse(ret);
		} catch (e) {
			if (typeof ExGuard_warn === "function") ExGuard_warn("阻止P2P上传", "本地设置已损坏，按「不拦截」处理", e);
			return;
		}
		if (!retJson || typeof retJson !== "object") return;
        if (retJson.isKillP2P) {
            killP2P();
        }
	}
}

/**
 * 造一个「已经挂好 catch 的失败 Promise」。
 * 调用方照样拿到 NotSupportedError（fail-fast 语义不变，P2P 起不来），
 * 但这个 Promise 实例已经有处理器了 —— 浏览器不会再把它当成「未处理的拒绝」报出来。
 * 真机上它原来会以 Runtime.exceptionThrown（NotSupportedError: WebRTC P2P disabled
 * by user policy）的身份冒到控制台，栈顶就是我们这个文件，看着像插件自己崩了。
 */
function GracefulP2PBlocker_fail(message) {
  const rejected = Promise.reject(new DOMException(message, "NotSupportedError"));
  try {
    rejected.catch(function () {});
  } catch (e) {}
  return rejected;
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
    return GracefulP2PBlocker_fail("WebRTC P2P disabled by user policy");
  }
  createAnswer() {
    return GracefulP2PBlocker_fail("WebRTC P2P disabled by user policy");
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