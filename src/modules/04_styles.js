function y(){var e=document.createElement("style");e.appendChild(document.createTextNode(`

		body{position:relative;}

		#ex-accountList-wrap {    left: -152px;    top: -16px;    /* max-height: 330px;    overflow-y: scroll;    scrollbar-width: none;    -ms-overflow-style: none; */    -webkit-transition: all .2s cubic-bezier(.22,.58,.12,.98);    -o-transition: all cubic-bezier(.22,.58,.12,.98) .2s;    -moz-transition: all cubic-bezier(.22,.58,.12,.98) .2s;    transition: all .2s cubic-bezier(.22,.58,.12,.98);    -webkit-transform-origin: 80% 0;    -moz-transform-origin: 80% 0;    -ms-transform-origin: 80% 0;    -o-transform-origin: 80% 0;    transform-origin: 80% 0;    -webkit-animation: scale-in-ease .5s cubic-bezier(.22,.58,.12,.98);    -moz-animation: scale-in-ease cubic-bezier(.22,.58,.12,.98) .5s;    -o-animation: scale-in-ease cubic-bezier(.22,.58,.12,.98) .5s;    animation: scale-in-ease .5s cubic-bezier(.22,.58,.12,.98);}/* #ex-accountList-wrap::-webkit-scrollbar {    display: none;} */.ex-accountList-item {    padding: 10px;    display: flex;    border-radius: 10px;    align-items: center;}.ex-accountList-item:hover {    background-color: rgb(244,244,244);}#ex-accountList-iframe {    display: none;}#ex-accountList-iframe2 {    display: none;}#ex-accountList-item-add {    padding: 10px;    text-align: center;    margin-bottom:0px;    border-radius: 10px;}#ex-accountList-item-add:hover {    background-color: rgb(244,244,244);}.ex-accountList-item__imgWrap {    flex: 0 0 25%;}.ex-accountList-item__img {    width: 50px;    height: 50px;    border-radius: 50%;}.ex-accountList-item__name {    line-height: 50px;    flex: 0 0 55%;}.ex-accountList-item__btn {    height: 30px;    width: 50px;    border-radius: 10px;    align-items: center;    flex: auto;    text-align: center;    line-height: 28px;    color: white;    background-color: rgb(245,108,108);}.ex-accountList-item__btn:hover {    background-color: rgb(247,137,137);}#ex-accountList-icon:hover > #ex-accountList-wrap {    display: block;}#ex-accountList-content {    background-color: white;}#ex-audio-line {    cursor: pointer;}.live-next-body #ex-audio-line {    margin-left: 4px;}.bag-info {    position: absolute;    background-color: rgba(0, 0, 0, 0.6);    color: white;    width: 20px;    font-weight: 800;    height: 20px;    text-align: center;    z-index: 10;    bottom: 0;}.bag-button {    color: rgb(255, 255, 255);    text-align: center;    height: 15px;    line-height: 15px;    cursor: pointer;    margin-left: 5px;    background: rgb(70, 171, 255);    border-radius: 9px;    padding: 0px 10px;    right: 20px;}.bloop {	background-color: rgba(255,255,255,0.78);
	backdrop-filter: blur(18px) saturate(1.6);
	-webkit-backdrop-filter: blur(18px) saturate(1.6);
	border: 1px solid rgba(15,23,42,0.08);
	border-radius: 14px;
	box-shadow: 0 10px 28px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06);	width: 100%;	height: 200px;	position: relative;	bottom: 200px;	display: none;	z-index: 1428;	color: #333;}.bloop__switch {	position: absolute;	right: 0;	bottom: 0;}.bloop__mode {	display: inline-block;}#bloop__select {	width: 150px;}.barragePanel__funcPanel {    position: absolute;    width: 232px;    height: 270px;    display: block;    background: rgba(255,255,255,0.9); backdrop-filter: blur(18px) saturate(1.6); -webkit-backdrop-filter: blur(18px) saturate(1.6); border-radius: 12px; box-shadow: 0 10px 28px rgba(15,23,42,0.14);    overflow-y: scroll;}.barragePanel__funcPanel::-webkit-scrollbar {display:none}.barragePanel__muteTime {    /* position: absolute;    left: 25px;    top: 123px; */    z-index: 5;}.danmuContent-25f266 {    pointer-events: auto !important;}.thirdBtn-06cde5, .fourBtn-0845d4 {    /* 加宽按钮方便点击 */    margin-left: 0px !important;    margin-right: 0px !important;    padding: 0 17px !important;}#copy-real-live {    cursor: pointer;}.Title-row-span, .Title-row-icon  {    display: flex;    align-items: center;    justify-content: center;}.Title-row-icon {    margin-right: 4px;}.live-next-body #copy-real-live {    margin-left: 4px;}.ChatBarrageCollect .TagItem {  height: auto !important;}.ChatBarrageCollect .TagItem-txt {  overflow: auto !important;  white-space: normal !important;  text-overflow: clip !important;}.ChatToolBar-DanmakuTail {    display: inline-block;    vertical-align: middle;    width: 18px;    height: 18px;    -webkit-border-radius: 4px;    -moz-border-radius: 4px;    border-radius: 4px;    margin-right: 8px;    color: #bbb;    cursor: pointer;}[data-mantine-color-scheme=dark] .ChatToolBar-DanmakuTail-tip {    background: url(data:image/png;base64,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) 50% / 18px 18px no-repeat;}.ChatToolBar-DanmakuTail-tip {    width: 18px;    height: 18px;    text-align: center;    line-height: 18px;    border-radius: 4px;    font-size: 12px;    color: #fff;    cursor: pointer;    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAMAAADW3miqAAAAPFBMVEUAAADKy8zKy8zExMzKy83Ky83KzMzKzM7Kys3Ky8zKy83Jy8zJy83Ky8zLzMzJzMzIyM3MzMzKzMzKy8zUpkOsAAAAE3RSTlMA5PgF2qdrQ+rqysOOhzw3HBnqZkz8cgAAAN5JREFUOMuNlEkOAyEMBNs2y+xL/P+/JgoJaGCAqZOFSk0fLOOL7M7ONLBGeDCTdZsgcq6kdzAtBwLiSauMPoR5ow2Mx4dj1CZ0ArJoh1Ww/Quh5Be1w3F0apaD1a5kMSVJLyRphuknEYaGpIEXuC7pD4YWnaITuUiIdKRkVCRNRlUq+te+a0p4Ujy9ZkMpIaeUgJrEld6aYAxZJS2nF+hGwnUwmHOp/HSCzffybn1dubyZww47aQfaIGtPWgQ4O1Hj8fRgQPzYKOQFgWMhvlfWExHZnJ3M9RzSbN0eYt4fdzsuAVjiHAAAAABJRU5ErkJggg==) 50% / 18px 18px no-repeat;}.ChatToolBar-DanmakuTail-tip-active,.ChatToolBar-DanmakuTail-tip:hover {    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAMAAADW3miqAAAAPFBMVEUAAAD6aDP7ZTD2cUHxeU/pjGvmkHPfjnH4azj4bDruf1fshWHrhmLpjW3njm3kk3/ugFnugVn/XSP+YCg/+VboAAAAEnRSTlMA/P3z4XQyCPr5za2namIOx8bnayGzAAAA3klEQVQ4y43U2w6EIAxF0dNyc7xP+///Ook6EEHA/UTMSukDEUdhna0hVokpD8ZOy4aY/5I8pTT6iwRHUo1dOJD7SKOPO+5iaUYe2EbptAcs/4VQdo1aMWk0NTXDShdZmITkVkIGQ38SgRtIzhhaR3KlkGKnaGI3hFgHJVFBkkQVFfvXrmsivFk8fc0OJUJeiYAa0sreklJwtpKUJwY9INwPA0yOyksNbP4un57vXD7ezOiElaQTLQh7D40b4Duj2L/9YSA4bizkAs78SPpMdo/YtkzWDPffIRk7r+eYH6dAOJwNbfZEAAAAAElFTkSuQmCC) 50% / 18px 18px no-repeat;}.ChatToolBar-DanmakuTail-Panel {    background-color: rgba(255, 255, 255, 0.78); backdrop-filter: blur(18px) saturate(1.6); -webkit-backdrop-filter: blur(18px) saturate(1.6); border: 1px solid rgba(15,23,42,0.08); border-radius: 14px; box-shadow: 0 10px 28px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06);    width: 100%;    height: 140px;    position: relative;    display: none;    z-index: 1015;    color: #333;}.ChatToolBar-DanmakuTail-Panel__cell {    position: relative;    display: -webkit-box;    display: -webkit-flex;    display: flex;    box-sizing: border-box;    width: 100%;    padding: 10px 16px;    overflow: hidden;    color: #323233;    font-size: 14px;    line-height: 24px;    background-color: #fff;    border-bottom: 1px solid rgba(0, 0, 0, 0.2);    flex-wrap: wrap;    -webkit-flex-wrap: wrap;}.ChatToolBar-DanmakuTail-Panel__cell_title {    flex: 1;    -webkit-box-flex: 1;}.ChatToolBar-DanmakuTail-Panel__cell_option {    text-align: right;}.ChatToolBar-DanmakuTail-Panel__cell_switch {    float: right;}.ChatToolBar-DanmakuTail-title {    margin: 0 10px;    font-size: 16px;    font-weight: bold;}.DanmakuTail-input {    margin: 10px;    width: calc(100% - 20px);    height: 2.2em;}.DanmakuTail-checkbox-label,.DanmakuTail-option-label {    margin: 10px;    width: calc(100% - 20px);    display: block;    text-align: right;}.EnergyBarrageIcon {    margin-right: 8px;}.ex-icon {	display: inline-block;	vertical-align: middle;	margin-right: 8px;	-moz-user-select:none; /*火狐*/    -webkit-user-select:none; /*webkit浏览器*/    -ms-user-select:none; /*IE10*/    -khtml-user-select:none; /*早期浏览器*/    user-select:none;}.ex-icon a {    display: flex;    justify-items: center;    align-items: center;}.ex-icon svg:hover {    transform: scale(1.1);}.extool {

	background-color: rgba(255,255,255,0.78);
	backdrop-filter: blur(18px) saturate(1.6);
	-webkit-backdrop-filter: blur(18px) saturate(1.6);
	border: 1px solid rgba(15,23,42,0.08);
	border-radius: 14px;
	box-shadow: 0 10px 28px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06);

	width: 100%;

	max-height: 320px;

	position: relative;

	bottom: 200px;

	display: none;

	z-index: 1428;

	color: #333;

	box-sizing: border-box;

	padding: 8px 10px;

	overflow: auto;

	font-size: 13px;

	line-height: 22px;

}



.extool[style*="display: block"] {

	display: flex !important;

	flex-wrap: wrap;

	gap: 8px 10px;

	align-items: flex-start;

}



.extool > div:not(.ex_giftAnimation):not(.extool__close) {

	background: rgba(255,255,255,0.82);

	border: 1px solid rgba(0,0,0,0.10);

	border-radius: 10px;

	padding: 10px 12px 12px;

	box-sizing: border-box;

	box-shadow: 0 2px 10px rgba(0,0,0,0.06);

	display: flex;

	flex-wrap: wrap;

	gap: 6px 10px;

	align-items: center;

	min-width: 220px;

}



.extool__close {

	position: absolute;

	top: 8px;

	right: 8px;

	width: 26px;

	height: 26px;

	border-radius: 8px;

	display: flex;

	align-items: center;

	justify-content: center;

	cursor: pointer;

	user-select: none;

	background: rgba(0,0,0,0.06);

	color: rgba(0,0,0,0.72);

	font-size: 18px;

	line-height: 26px;

	z-index: 60;

}



.extool__close:hover {

	background: rgba(0,0,0,0.10);

}



.extool__treasure,

.extool__sendgift {

	flex: 1 1 720px;

}

.extool__autofish {

	flex: 1 1 520px;

}

.extool__redpacket_room,

.extool__gold,

.extool__clearbag,

.extool__tabswitch,

.extool__p2p,

.extool__fullscreen {

	flex: 1 1 260px;

}



.extool__treasure::before,

.extool__sendgift::before,

.extool__autofish::before,

.extool__redpacket_room::before,

.extool__gold::before,

.extool__clearbag::before,

.extool__tabswitch::before,

.extool__p2p::before,

.extool__fullscreen::before {

	display: block;

	width: 100%;

	content: "";

	font-weight: 700;

	font-size: 12px;

	letter-spacing: .4px;

	color: rgba(0,0,0,0.72);

	padding-bottom: 6px;

	margin-bottom: 2px;

	border-bottom: 1px dashed rgba(0,0,0,0.12);

}

.extool__treasure::before { content: "宝箱"; }

.extool__sendgift::before { content: "送礼"; }

.extool__autofish::before { content: "钓鱼"; }

.extool__redpacket_room::before { content: "礼物红包"; }

.extool__gold::before { content: "幻神/礼物"; }

.extool__clearbag::before { content: "背包"; }

.extool__tabswitch::before { content: "标签/切换"; }

.extool__p2p::before { content: "网络"; }

.extool__fullscreen::before { content: "播放器"; }



.extool label {

	white-space: nowrap;

	margin-right: 8px;

	line-height: 22px;

}

.extool input[type="text"] {

	padding: 2px 6px;

	border: 1px solid rgba(0,0,0,0.18);

	border-radius: 6px;

	outline: none;

	background: rgba(255,255,255,0.95);

	color: black;

}

.extool input[type="checkbox"], .extool input[type="radio"] {

	vertical-align: middle;

	margin-right: 4px;

}

.extool input[type="button"] {

	border: 1px solid rgba(0,0,0,0.18);

	border-radius: 8px;

	padding: 2px 10px;

	background: linear-gradient(#ffffff, #f4f6f8);

	cursor: pointer;

	color: black;

}

.extool input[type="button"]:hover {

	background: linear-gradient(#ffffff, #e9eef3);

}

.extool input[type="button"]:active {

	transform: translateY(1px);

}

.extool a {

	text-decoration: none;

}

.extool .extool__hint {

	margin-top: 6px;

	color: #666;

	font-size: 12px;

}



/* 兼容某些模块里使用 br 分行的写法，让它在 flex 下表现更一致 */

.extool br {

	flex-basis: 100%;

	width: 0;

	height: 0;

}



.extool__switch {

	position: absolute;

	right: 0;

	bottom: 0;

}

.extool__bsize,.extool__sendgift {

	margin-bottom: 5px;

}

/* 卡片内部已改为 flex，这里不再强制 inline-block */

.ex_giftAnimation {

	width: 100%;

	height: 100%;

	position: absolute;

	z-index: 50;

	pointer-events: none;

}

.ex-panel {	position: absolute;	bottom: 32px;	right: 0px;	background-color: rgba(255,255,255,0.8);	backdrop-filter: blur(18px) saturate(1.6);	-webkit-backdrop-filter: blur(18px) saturate(1.6);	border: 1px solid rgba(15,23,42,0.08);	border-radius: 14px;	box-shadow: 0 10px 28px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06);	z-index: 1428;	user-select: none;	display: none;	overflow: visible;}.ex-panel__close {	position: absolute;	top: -9px;	right: -9px;	z-index: 3;	width: 18px;	height: 18px;	padding: 0;	margin: 0;	border: none;	border-radius: 50%;	background: rgba(255, 255, 255, 0.95);	color: #64748b;	font-size: 14px;	line-height: 16px;	text-align: center;	cursor: pointer;	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);	transition: color 0.15s ease, background-color 0.15s ease;}.ex-panel__close:hover {	color: #fff;	background: #f60;}.ex-panel__close:focus-visible {	outline: 2px solid #ff7700;	outline-offset: 1px;}/* 隐藏礼物栏时挂到播放器层，位置由 ExPanel_updateFloatingPosition 计算（视频工具条上方） */.ex-panel.ex-panel--floating {	position: fixed;	z-index: 10000;}.ex-panel__wrap {	display: flex;	align-items: center;	justify-content: center;	width: 100%;	height: 100%;	position: relative;	z-index: 1;}.ex-panel__icon {	margin: 0 6px;	display: block;	position: relative;	padding: 5px;	border-radius: 10px;	transition: background-color 0.2s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1);}.ex-panel__icon:hover {	transform: scale(1.12);	background-color: rgba(255,106,0,0.1);}.ex-panel__tip {	display:none;	background:#ff4757;	border-radius:50%;	width:8px;	height:8px;	top:0px;	right:0px;	position:absolute;	box-shadow:0 0 0 2px rgba(255,255,255,0.9), 0 0 8px rgba(255,71,87,0.6);}/* 新版斗鱼右侧弹幕Panel的bottom */.live-next-body .layout-Player-chat>* {	bottom: 0 !important;}.text-879f3e {  height: auto !important;  max-height: 48px !important;}.ex-image-danmaku {  height: 48px;  border-radius: 6px;  margin: 0 4px;}.danmuContent-25f266 .ex-image-danmaku {  max-height: 32px;}.barrageSpeed {    position: absolute;    right: 10px;    top: -20px;    color: rgba(0,0,0,0.5);    cursor: default;    z-index: 0;}.enter__panel {    width: 100%;    display: none;    margin-top: 4px;}#enter__title {    cursor: pointer;    user-select: none;    color: royalblue;}#enter__select {    width: 190px;}.enter__option {    margin-top: 5px;}#enter__enterId {    width: 40px;}#enter__reply {    width: 150px;}#enter__word {    width: 140px;}#enter__level {    width: 25px;    text-align: center;}#enter__export {    cursor: pointer;    color: royalblue;    margin-left: 10px;}#enter__import {    cursor: pointer;    color: royalblue;    margin-left: 5px;}.gift__panel {    width: 100%;    display: none;    margin-top: 4px;}#gift__title {    cursor: pointer;    user-select: none;    color: royalblue;}#gift__select {    width: 113px;}.gift__option {    margin-top: 5px;}#gift__giftId {    width: 40px;}#gift__reply {    width: 150px;}#gift__export {    cursor: pointer;    color: royalblue;    margin-left: 10px;}#gift__import {    cursor: pointer;    color: royalblue;    margin-left: 5px;}.livetool {	background-color: rgba(255,255,255,0.78);
	backdrop-filter: blur(18px) saturate(1.6);
	-webkit-backdrop-filter: blur(18px) saturate(1.6);
	border: 1px solid rgba(15,23,42,0.08);
	border-radius: 14px;
	box-shadow: 0 10px 28px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06);	width: 100%;	height: 290px;	position: relative;	bottom: 290px;	display: none;	z-index: 1428;}.livetool__cell {	position: relative;    display: -webkit-box;    display: -webkit-flex;    display: flex;    box-sizing: border-box;    width: 100%;    padding: 10px 16px;    overflow: hidden;    color: #323233;    font-size: 14px;    line-height: 24px;	background-color: #fff;	border-bottom: 1px solid rgba(15,23,42,0.08);	flex-wrap: wrap;    -webkit-flex-wrap: wrap;}.livetool__cell_title {	flex: 1;    -webkit-box-flex: 1;}.livetool__cell_option {	text-align: right;}.livetool__cell_switch {	float: right;}.mute__panel {    width: 100%;    display: none;    margin-top: 4px;}#mute__title {    cursor: pointer;    user-select: none;    color: royalblue;}#mute__idlist {    cursor: pointer;    color: royalblue;    margin-left: 10px;}#mute__export, #mute__import {    cursor: pointer;    color: royalblue;    margin-left: 5px;}#mute__select {    width: 110px;}.mute__option {    margin-top: 5px;}#mute__word {    width: 70px;}#mute__count {    width: 30px;}#mute__time {    width: 65px;}.exRankPoint {    position: absolute;    right: 16px;}.exRankPoint--top {    position: absolute;    bottom: -12px;    right: 0;    left: 0;}.reply__panel {    width: 100%;    display: none;    margin-top: 4px;}#reply__title {    cursor: pointer;    user-select: none;    color: royalblue;}#reply__select {    /* width: 190px; */    width: 100px;}#reply__time {    width: 35px;}.reply__option {    margin-top: 5px;}#reply__word {    width: 70px;}#reply__reply {    width: 147px;}#reply__export {    cursor: pointer;    color: royalblue;    margin-left: 10px;}#reply__import {    cursor: pointer;    color: royalblue;    margin-left: 5px;}.livetool__Treasure {    width: 100%;    position: relative;    z-index: 999;}.vote__panel {    width: 100%;    display: none;    margin-top: 4px;}#vote__title {    cursor: pointer;    user-select: none;    color: royalblue;}#vote__select {    width: 100px;}.vote__option {    margin-top: 5px;}#vote__theme {    width: 70px;}#vote__options {    width: 133px;}#vote__time {    width: 35px;}#vote__show-result {    cursor: pointer;    color: royalblue;    margin-left: 10px;}.vote__result {    position: absolute;    top: 0px;    width: 300px;    background: rgba(255,255,255,0.78); backdrop-filter: blur(18px) saturate(1.6); -webkit-backdrop-filter: blur(18px) saturate(1.6); box-shadow: 0 10px 28px rgba(15,23,42,0.14);    left: 0px;    z-index: 999;    padding: 5px;    border-radius: 10px;    user-select: none;    display: none;    color: #333;}#vote__result-theme {    font-size: 20px;    font-weight: 600;    margin-bottom: 10px;}#vote__result-close {    position: absolute;    top: 5px;    right: 10px;    font-size: 14px;    cursor: pointer;    color: gray;}.vote__option-wrap {    margin-bottom: 10px;}.vote__option-choice {    display: inline-block;    font-size: 14px;}.vote__option-num {    float: right;    font-size: 14px;}.vote__progress {    width: 100%;    background-color: #ddd;    border-radius: 10px;}.vote__progress-bar {    width: 0%;    height: 14px;    background-color: #4CAF50;    text-align: center;    line-height: 30px;    border-radius: 10px;}.exlottery {	background-color: rgba(255,255,255,0.78);	backdrop-filter: blur(18px) saturate(1.6);	-webkit-backdrop-filter: blur(18px) saturate(1.6);	border: 1px solid rgba(15,23,42,0.08);	border-radius: 14px;	box-shadow: 0 10px 28px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06);	width: 100%;	height: 250px;	position: relative;	bottom: 250px;	display: none;	z-index: 1428;    overflow: auto;    padding: 0 10px;    box-sizing: border-box;}.lottery__nodata {    z-index: 998;    position: absolute;    left:50%;    top:50%;    transform: translate(-50%, -50%);    color: #606266;}.lottery__wrap {    display: flex;    flex-direction: column;    z-index: 999;}.lottery__a:hover .lottery__item {    background-color: rgb(244,244,244);}.lottery__item {    display: flex;    padding: 5px 0;    border-bottom: 1px solid #d0d0d0;    color: #606266;}.lottery__img img {    width: 150px;    border-radius: 5px;}.lottery__anchor {    position: absolute;    background-color: rgba(255,255,255,0.9);    border-radius: 5px 0px 5px 0px;}.lottery__info {    display: flex;    justify-content: space-evenly;    flex-direction: column;    margin-left: 10px;    overflow: hidden;}.lottery__prize {    white-space: nowrap;    text-overflow: ellipsis;    word-break: break-all;    font-size: 14px;}.lottery__expireTime {    position: absolute;    margin-top: -18px;    background-color: rgba(255,255,255,0.9);    border-radius: 0px 5px 0px 5px;} /*滚动条样式*/.exlottery::-webkit-scrollbar {    width: 4px;    }.exlottery::-webkit-scrollbar-thumb {    border-radius: 10px;    box-shadow: inset 0 0 5px rgba(0,0,0,0.2);    background: rgba(0,0,0,0.2);}.exlottery::-webkit-scrollbar-track {    box-shadow: inset 0 0 5px rgba(0,0,0,0.2);    border-radius: 0;    background: rgba(0,0,0,0.1);}.lottery__func {    display: flex;    justify-content: space-between;    margin-top: 5px;    user-select: none;    border-bottom: 1px solid #d0d0d0;}.lottery__notice,#lottery-refresh {    cursor: pointer;    color: #606266;}.miniprogram__panel {    position: absolute;    right: 43px;    bottom: 100px;    animation: move-in 0.75s;    z-index: 101;    text-align: center;    display: none;}.miniprogram__wrap {    overflow: hidden;    background-color: white;    border-radius: 5%;    width: 200px;    box-shadow: 0px 2px 20px 0px #888888;    font-size: 14px;}.miniprogram__triangle {    width: 0px;    height: 0px;    border-color: white transparent transparent transparent;    border-style: solid;    border-width: 10px;    position: absolute;    left: 100px;}.month-cost {    margin-right: 5px;    cursor: default;    -moz-user-select:none;/*火狐*/    -webkit-user-select:none;/*webkit浏览器*/    -ms-user-select:none;/*IE10*/    -khtml-user-select:none;/*早期浏览器*/    user-select:none;    display: inline-block;    vertical-align: middle;}.monthcost__icon {    position: relative;    top: 3px;    cursor: pointer;    margin-left: 3px;}/* 隐藏登录的提示 */

.multiBitRate-da4b60 {

  display: none !important;

}.exVideoDiv {    width: 500px;    height: 250px;    background-color: rgba(255, 255, 255, 0);    position: absolute;    z-index: 1428;}.exVideoPlayer {    width: 100%;    height: 100%;    cursor: move;}.exVideoScale {    width: 10px;    height: 10px;    overflow: hidden;    cursor: se-resize;    position: absolute;    right: 0;    bottom: 0;    background-color: rgb(231, 57, 57);}.exVideoInfo {    width: 100%;    height: 30px;    background-color: gray;    position: absolute;    top: -30px;    line-height: 30px;}.exVideoClose {    width: 30px;    float: right;    color: white;}.exVideoQn, .exVideoCDN {    margin-left: 5px;}.exVideoRID {    margin: 0px 5px;    font-weight: 800;    font-size: medium;}#popup-player__prompt {    display: none;}.postbird-box-header {    width: auto !important;}.postbird-box-dialog {    color: #333;}.real-audience {

    cursor: pointer;

    display: flex;

    padding: 0 7px;

    line-height: 33px;

    color: rgb(153, 153, 153);

}



#Ex_EnterYuba {

    width: 100%;

}



.Title-anchorPic-bottom i{

    display: none !important;

}



#real-audience__total, #real-audience__barrage, #real-audience__money_yc, #real-audience__noble {

    margin-left: 2px;

}

/* #refresh-video {    float: left;    width: 24px;    height: 24px;    margin-right: 5px;    cursor: pointer;    background-size: contain;} */.refresh-barrage {    display: inline-flex;    align-items: center;    vertical-align: top;    margin: 0 2px;    padding: 0 8px;    height: 22px;    line-height: 21px;    background-color: #fff;    border: 1px solid #e5e4e4;    -webkit-border-radius: 4px;    -moz-border-radius: 4px;    border-radius: 4px;    cursor: pointer;    user-select: none;}.refresh-barrage.ex-active {    background: linear-gradient(180deg, rgb(38, 169, 235), rgb(18, 150, 219));    border-color: rgb(18, 150, 219);    box-shadow: 0 0 0 2px rgba(18, 150, 219, .22), 0 8px 16px rgba(18, 150, 219, .28);    font-weight: 700;}.refresh-barrage.ex-active:hover {    box-shadow: 0 0 0 2px rgba(18, 150, 219, .28), 0 10px 18px rgba(18, 150, 219, .36);}.refresh-barrage.ex-active::after {    content: "";    width: 6px;    height: 6px;    margin-left: 6px;    border-radius: 999px;    background: rgba(255, 255, 255, .95);    box-shadow: 0 0 0 2px rgba(255, 255, 255, .22);}.live-next-body .refresh-barrage {    background-color: var(--front-background-color);    border: 1px solid var(--front-border-color);}#refresh-barrage__svg {    vertical-align: middle;}.top-0-important {    top: 0 !important;}.room-vip {  -moz-user-select:none;/*火狐*/  -webkit-user-select:none;/*webkit浏览器*/  -ms-user-select:none;/*IE10*/  -khtml-user-select:none;/*早期浏览器*/  user-select:none;  vertical-align: middle;  position: absolute;  left: 12px;}.repeated-danmaku {  opacity: 0 !important;  pointer-events: none !important;  visibility: hidden !important;}.danmu-fbb2a3 > div {  transition: font-size 0.5s ease !important;}.comment-dzjy-container > div {  z-index: 99 !important;}#ex-camera {    background: rgba(0,0,0,0.7);    position: absolute;    right: 20px;    bottom: 240px;    z-index: 10;    width: 60px;    height: 60px;    cursor: pointer;    -webkit-border-radius: 50%;    -moz-border-radius: 50%;    border-radius: 50%;    cursor: pointer;    display: none;    justify-content: center;    align-items: center;    border: 2px solid #2d2c2c;    box-sizing: border-box;}#ex-camera:hover > svg > path {    fill: rgb(252, 199, 84);}#ex-camera:active > svg > path {    fill: rgb(253, 60, 60);}#ex-camera-close {    position: absolute;    top: -8px;    right: -8px;    width: 20px;    height: 20px;    background: rgba(0,0,0,0.8);    border-radius: 50%;    display: flex;    justify-content: center;    align-items: center;    cursor: pointer;    color: #fff;    font-size: 12px;    line-height: 1;    border: 1px solid rgba(255,255,255,0.3);    z-index: 11;}#ex-camera-close:hover {    background: rgba(253, 60, 60, 0.9);}#ex-cinema:hover > .cinema__wrap {    display: block;}.cinema__wrap {    display: none;    margin: 0;    padding: 0;    border: 1px solid #e5e5e5;    background: #fff;    position: absolute;    left: 199px;    min-width: 100px;    top: 130px;}.cinema__panel {    position: absolute;    border: 1px solid #000;    border-radius: 4px;    transform: translateY(calc(-4px - 100%)) translateX(-50%);    left: 33%;    background-color: #000;    opacity: .75;    width: 70px;}.cinema__panel li {    padding: 0 2px;    white-space: nowrap;    color: #fff;    text-align: center;    cursor: pointer;}.cinema__panel li:hover {    background-color: rgb(85, 85, 85);}  /* Joysound 控件已并入 VideoToolbarMenu，样式见 VideoToolbarMenu.css */#exVideoDivFake {  display: none;}#ex-metadata:hover > .metadata__wrap {  display: block;}.metadata__wrap {  display: none;  margin: 0;  padding: 0;  border: 1px solid #e5e5e5;  background: #fff;  position: absolute;  left: 199px;  min-width: 100px;  top: 0px;  white-space: nowrap;  color: black;}.metadata__panel {  position: absolute;  border: 1px solid #000;  border-radius: 4px;  transform: translateY(calc(-4px - 100%)) translateX(-50%);  left: 33%;  background-color: #000;  opacity: .75;  width: 70px;}.metadata__panel li {  padding: 0 2px;  white-space: nowrap;  color: #fff;  text-align: center;  cursor: pointer;}.metadata__panel li:hover {  background-color: rgb(85, 85, 85);}  #ex-pip-menu-panel.ex-pip-menu-root {

    position: fixed;

    z-index: 10001;

    opacity: 0;

    visibility: hidden;

    pointer-events: none;

    transition: opacity 0.12s ease, visibility 0.12s ease;

}



#ex-pip-menu-panel.ex-pip-menu-root.is-visible {

    opacity: 1;

    visibility: visible;

    pointer-events: auto;

}



#ex-pip-menu-panel.ex-pip-menu-root::after {

    content: "";

    position: absolute;

    left: 0;

    right: 0;

    top: 100%;

    height: 8px;

}



.ex-pip-menu {

    box-sizing: border-box;

    width: 196px;

    padding: 4px 0;

    border-radius: 6px;

    font-family: "Microsoft YaHei", "PingFang SC", -apple-system, sans-serif;

    font-size: 12px;

    color: #e8e8e8;

    background: #2c2c30;

    border: 1px solid #1a1a1c;

    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);

    user-select: none;

    pointer-events: auto;

}



.ex-pip-menu__list {

    margin: 0;

    padding: 0;

    list-style: none;

}



.ex-pip-menu__list > li + li {

    border-top: 1px solid rgba(255, 255, 255, 0.06);

}



#ex-pip-menu-panel.ex-pip-menu-root.is-measuring {

    opacity: 0;

    pointer-events: none;

}



.ex-pip-opt {

    display: flex;

    align-items: center;

    gap: 10px;

    width: 100%;

    margin: 0;

    padding: 8px 12px;

    border: none;

    border-radius: 0;

    background: transparent;

    color: inherit;

    text-align: left;

    cursor: pointer;

    outline: none;

    line-height: 1.4;

}



.ex-pip-opt:hover {

    background: rgba(255, 255, 255, 0.06);

}



.ex-pip-opt:focus-visible {

    background: rgba(255, 255, 255, 0.08);

    outline: 1px solid rgba(255, 255, 255, 0.2);

    outline-offset: -1px;

}



.ex-pip-opt__icon {

    flex-shrink: 0;

    display: flex;

    align-items: center;

    justify-content: center;

    width: 24px;

    height: 24px;

    color: #9a9aa2;

}



.ex-pip-opt__icon svg {

    display: block;

    width: 24px;

    height: 24px;

}



.ex-pip-opt--ex .ex-pip-opt__icon {

    color: #c4c4cc;

}



.ex-pip-opt--ex:hover .ex-pip-opt__icon {

    color: #e0e0e6;

}



.ex-pip-opt__body {

    flex: 1;

    min-width: 0;

}



.ex-pip-opt__row {

    display: flex;

    align-items: baseline;

    justify-content: space-between;

    gap: 8px;

}



.ex-pip-opt__label {

    font-size: 12px;

    color: #f0f0f0;

}



.ex-pip-opt__mark {

    flex-shrink: 0;

    font-size: 11px;

    color: #8c8c94;

}



.ex-pip-opt--ex .ex-pip-opt__mark {

    color: #ff7f3a;

}



.ex-pip-opt__hint {

    display: block;

    margin-top: 2px;

    font-size: 11px;

    color: #7a7a82;

    line-height: 1.35;

}



.ex-pip-opt--ex:hover .ex-pip-opt__mark {

    color: #ff9555;

}



@media (prefers-reduced-motion: reduce) {

    .ex-pip-opt,

    #ex-pip-menu-panel.ex-pip-menu-root {

        transition: none;

    }

}

.filter__wrap {    display: none;    position: relative;    border-radius: 4px;    -webkit-user-select: none;    -moz-user-select: none;    -ms-user-select: none;    user-select: none;}.filter__panel {    position: absolute;    border: 1px solid #000;    border-radius: 4px;    transform: translateY(calc(-4px - 100%)) translateX(-50%);    left: 33%;    background-color: #000;    opacity: .75;    width: 300px;    padding-top: 10px;    padding-left: 10px;    padding-right: 10px;}.filter__panel li {    padding: 0 2px;    white-space: nowrap;    color: #fff;    text-align: center;    cursor: pointer;}.filter__panel li:hover {    background-color: rgb(85, 85, 85);}.filter__scroll {    width: 100%;    height: 5px;    background: #ccc;    position: relative;    display: inline-block;}.filter__scroll-bar {    width: 15px;    height: 15px;    background: #369;    position: absolute;    top: -5px;    left: 100px;    cursor: pointer;    border-radius: 100%;}.filter__scroll-mask {    position: absolute;    left: 0;    top: 0;    background: #369;    width: 100px;    height: 5px;}.filter__title {    color: white;    display: inline-block;    cursor: initial;    margin-right: 2px;}.filter__enhance {    margin-bottom: 10px;    display: flex;    align-items: center;    justify-content: space-between;}.filter__switch {    width: 40px;    height: 20px;    background: #ccc;    position: relative;    display: inline-block;    border-radius: 10px;    cursor: pointer;    transition: background 0.3s;}.filter__switch-slider {    width: 18px;    height: 18px;    background: #fff;    position: absolute;    top: 1px;    left: 0px;    border-radius: 50%;    transition: left 0.3s;}#filter__select {    width: 100%;    float: right;}.filter__filter {    margin-top: 5px;}/* 增强画质提示弹窗样式 */.enhance-modal__panel-wrap {    width: 100%;    height: 100%;    z-index: 1000;    background-color: rgba(0, 0, 0, 0.9);    position: absolute;    top: 0;    left: 0;    display: none;    justify-content: center;    align-items: center;}.enhance-modal__panel {    height: 550px;    width: 600px;    background-color: white;    border-radius: 20px;    position: fixed;    top: 0;    left: 0;    right: 0;    bottom: 0;    margin: auto;    color: #333;}.enhance-modal__content {    position: relative;    top: 50%;    transform: translateY(-50%);    text-align: center;}.enhance-modal__text {    font-size: 18px;    margin-top: 20px;}.enhance-modal__img {    width: 720px;    margin-top: 20px;}.enhance-modal__close {    font-size: 30px;    font-weight: bold;    position: absolute;    right: 15px;    top: 10px;    cursor: pointer;    transition: all 0.2s;}.enhance-modal__close:hover {    color: #ff7700;}#ex-videospeed:hover > .videospeed__wrap {    display: block;}.videospeed__wrap {    display: none;    margin: 0;    padding: 0;    border: 1px solid #e5e5e5;    background: #fff;    position: absolute;    left: 199px;    min-width: 100px;    top: 120px;}.videospeed__panel {    position: absolute;    border: 1px solid #000;    border-radius: 4px;    transform: translateY(calc(-4px - 100%)) translateX(-50%);    left: 33%;    background-color: #000;    opacity: .75;    width: 70px;}.videospeed__panel li {    padding: 0 2px;    white-space: nowrap;    color: #fff;    text-align: center;    cursor: pointer;}.videospeed__panel li:hover {    background-color: rgb(85, 85, 85);}  #ex-videosync {    float: left;    width: 24px;    height: 24px;    margin-left: 20px;    cursor: pointer;    background-size: contain;}#ex-vtoolbar-menu {    float: left;    width: 24px;    height: 24px;    margin-right: 10px;    position: relative;    pointer-events: none;    -webkit-user-select: none;    user-select: none;    overflow: visible;}.vtoolbar-menu__trigger {    position: relative;    z-index: 2;    pointer-events: auto;    display: flex;    align-items: center;    justify-content: center;    width: 24px;    height: 24px;    padding: 0;    border: none;    background: transparent;    cursor: pointer;    border-radius: 6px;    transition: background-color 0.2s ease, transform 0.2s ease;}.vtoolbar-menu__trigger:hover {    background-color: rgba(255, 255, 255, 0.12);}.vtoolbar-menu__trigger:focus-visible {    outline: 2px solid #ff7700;    outline-offset: 2px;}#ex-vtoolbar-menu.is-open .vtoolbar-menu__trigger {    background-color: rgba(255, 119, 0, 0.2);}.vtoolbar-menu__trigger .icon {    display: block;    transition: transform 0.2s ease;}.vtoolbar-menu__trigger:hover .icon {    transform: scale(1.08);}.vtoolbar-menu__dropdown {    display: none;    position: absolute;    left: 50%;    bottom: calc(100% + 18px);    transform: translateX(-50%);    min-width: 188px;    padding: 4px;    border-radius: 10px;    background: rgba(15, 15, 35, 0.96);    border: 1px solid rgba(67, 56, 202, 0.35);    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;    z-index: 2;    pointer-events: auto;    backdrop-filter: blur(8px);}/* 仅连接菜单与精灵球之间的空隙，不遮挡工具条其他按钮 */.vtoolbar-menu__dropdown::before {    content: "";    position: absolute;    left: 50%;    transform: translateX(-50%);    top: 100%;    width: 200px;    height: 22px;    pointer-events: auto;}#ex-vtoolbar-menu.is-open .vtoolbar-menu__dropdown {    display: block;    animation: vtoolbar-menu-fade-in 0.2s ease;}@keyframes vtoolbar-menu-fade-in {    from {        opacity: 0;        transform: translateX(-50%) translateY(6px);    }    to {        opacity: 1;        transform: translateX(-50%) translateY(0);    }}@media (prefers-reduced-motion: reduce) {    #ex-vtoolbar-menu.is-open .vtoolbar-menu__dropdown {        animation: none;    }    .vtoolbar-menu__trigger,    .vtoolbar-menu__pokeball,    .vtoolbar-menu__item,    .vtoolbar-menu__switch {        transition: none;    }}.vtoolbar-menu__dropdown::after {    content: "";    position: absolute;    left: 50%;    bottom: -7px;    transform: translateX(-50%) rotate(45deg);    width: 10px;    height: 10px;    background: rgba(15, 15, 35, 0.96);    border-right: 1px solid rgba(67, 56, 202, 0.35);    border-bottom: 1px solid rgba(67, 56, 202, 0.35);    pointer-events: none;}.vtoolbar-menu__item {    display: flex;    align-items: center;    gap: 8px;    width: 100%;    padding: 7px 10px;    border: none;    border-radius: 8px;    background: transparent;    color: #f8fafc;    font-size: 12px;    line-height: 20px;    text-align: left;    cursor: pointer;    transition: background-color 0.2s ease, color 0.2s ease;}.vtoolbar-menu__item:hover {    background-color: rgba(67, 56, 202, 0.35);}.vtoolbar-menu__item:focus-visible {    outline: 2px solid #ff7700;    outline-offset: -2px;}.vtoolbar-menu__item-icon {    flex-shrink: 0;    display: flex;    align-items: center;    justify-content: center;    width: 20px;    height: 20px;    color: #a5b4fc;}.vtoolbar-menu__item-icon .icon,.vtoolbar-menu__item-icon svg,.vtoolbar-menu__item-icon img {    width: 20px;    height: 20px;    display: block;    flex-shrink: 0;}.vtoolbar-menu__item-icon--compact svg,.vtoolbar-menu__item-icon--compact .icon {    width: 16px;    height: 16px;}.vtoolbar-menu__item-icon .vtoolbar-menu__icon-pip {    width: 18px;    height: 18px;}.vtoolbar-menu__item-label {    flex: 1;    white-space: nowrap;    font-size: 12px;    line-height: 20px;}.vtoolbar-menu__item--filter.is-active {    background-color: rgba(255, 119, 0, 0.15);}.vtoolbar-menu__item--filter.is-active .vtoolbar-menu__chevron {    transform: rotate(90deg);    color: #ff7700;}.vtoolbar-menu__chevron {    flex-shrink: 0;    width: 14px;    height: 14px;    color: #94a3b8;    transition: transform 0.2s ease, color 0.2s ease;}.vtoolbar-menu__switch {    flex-shrink: 0;    width: 32px;    height: 18px;    border-radius: 10px;    background: #475569;    position: relative;    transition: background-color 0.2s ease;    pointer-events: none;}.vtoolbar-menu__switch.is-on {    background: linear-gradient(90deg, #f0cb95, #e9be80);}.vtoolbar-menu__switch-thumb {    position: absolute;    top: 2px;    left: 2px;    width: 14px;    height: 14px;    border-radius: 50%;    background: #fff;    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);    transition: left 0.2s ease;}.vtoolbar-menu__switch.is-on .vtoolbar-menu__switch-thumb {    left: 16px;}.vtoolbar-menu__filter-host {    display: none;    position: absolute;    left: 100%;    bottom: 0;    margin-left: -6px;    padding-left: 12px;    z-index: 2;    pointer-events: none;}.vtoolbar-menu__filter-host.is-visible {    pointer-events: auto;}.vtoolbar-menu__filter-host.is-visible {    display: block;}.vtoolbar-menu__filter-host .filter__wrap {    display: block;    position: static;    float: none;    right: auto;    bottom: auto;    margin: 0;    height: auto;}.vtoolbar-menu__filter-host .filter__panel {    position: relative;    transform: none;    left: auto;    opacity: 0.92;}.vtoolbar-menu__divider {    height: 1px;    margin: 4px 8px;    background: rgba(148, 163, 184, 0.2);}.menu-da2a9e {  z-index: 999 !important;} .volume-07c230.custom-muted .icon-c8be96 svg, .volume-07c230.custom-normal .icon-c8be96 svg {     display: none !important; } .volume-07c230.custom-muted .icon-c8be96::after, .volume-07c230.custom-normal .icon-c8be96::after {     content: '';     display: block;     width: 32px;     height: 32px;     background-size: contain;     background-repeat: no-repeat;     background-position: center; } /* 静音图标颜色控制 */ .volume-07c230.custom-muted .icon-c8be96::after {     background-image: url('data:image/svg+xml;utf8,<svg fill="none" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M5 10h5.5L16 6v20l-5.5-4H5V10z" stroke="%23fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M20 19l6-6M20 13l6 6" stroke="%23fff" stroke-width="2" stroke-linecap="round"></path></svg>'); } .volume-07c230.custom-muted:hover .icon-c8be96::after {     background-image: url('data:image/svg+xml;utf8,<svg fill="none" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M5 10h5.5L16 6v20l-5.5-4H5V10z" stroke="%23ff5d23" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M20 19l6-6M20 13l6 6" stroke="%23ff5d23" stroke-width="2" stroke-linecap="round"></path></svg>'); } /* 正常图标颜色控制 */ .volume-07c230.custom-normal .icon-c8be96::after {     background-image: url('data:image/svg+xml;utf8,<svg fill="none" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M5 10h5.5L16 6v20l-5.5-4H5V10z" stroke="%23fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M21.736 23.517a8 8 0 00-.527-15.206M19.687 19.867a3.925 3.925 0 00-.258-7.46" stroke="%23fff" stroke-width="2" stroke-linecap="round"></path></svg>'); } .volume-07c230.custom-normal:hover .icon-c8be96::after {     background-image: url('data:image/svg+xml;utf8,<svg fill="none" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M5 10h5.5L16 6v20l-5.5-4H5V10z" stroke="%23ff5d23" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M21.736 23.517a8 8 0 00-.527-15.206M19.687 19.867a3.925 3.925 0 00-.258-7.46" stroke="%23ff5d23" stroke-width="2" stroke-linecap="round"></path></svg>'); }/* [DouyuEx] 原作者求星弹窗样式已移除 */.noticejs-top{top:0;width:100% !important}.noticejs-top .item{border-radius:0 !important;margin:0 !important}.noticejs-topRight{top:10px;right:10px}.noticejs-topLeft{top:10px;left:10px}.noticejs-topCenter{top:10px;left:50%;transform:translate(-50%)}.noticejs-middleLeft,.noticejs-middleRight{right:10px;top:50%;transform:translateY(-50%)}.noticejs-middleLeft{left:10px}.noticejs-middleCenter{top:50%;left:50%;transform:translate(-50%,-50%)}.noticejs-bottom{bottom:0;width:100% !important}.noticejs-bottom .item{border-radius:0 !important;margin:0 !important}.noticejs-bottomRight{bottom:10px;right:10px}.noticejs-bottomLeft{bottom:10px;left:10px}.noticejs-bottomCenter{bottom:10px;left:50%;transform:translate(-50%)}.noticejs{font-family:Helvetica Neue,Helvetica,Arial,sans-serif}.noticejs .item{margin:0 0 10px;border-radius:3px;overflow:hidden}.noticejs .item .close{float:right;font-size:18px;font-weight:700;line-height:1;color:#fff;text-shadow:0 1px 0 #fff;opacity:1;margin-right:7px}.noticejs .item .close:hover{opacity:.5;color:#000}.noticejs .item a{color:#fff;border-bottom:1px dashed #fff}.noticejs .item a,.noticejs .item a:hover{text-decoration:none}.noticejs .success{background-color:#64ce83}.noticejs .success .noticejs-heading{background-color:#3da95c;color:#fff;padding:10px}.noticejs .success .noticejs-body{color:#fff;padding:10px}.noticejs .success .noticejs-body:hover{visibility:visible !important}.noticejs .success .noticejs-content{visibility:visible}.noticejs .info{background-color:#3ea2ff}.noticejs .info .noticejs-heading{background-color:#067cea;color:#fff;padding:10px}.noticejs .info .noticejs-body{color:#fff;padding:10px}.noticejs .info .noticejs-body:hover{visibility:visible !important}.noticejs .info .noticejs-content{visibility:visible}.noticejs .warning{background-color:#ff7f48}.noticejs .warning .noticejs-heading{background-color:#f44e06;color:#fff;padding:10px}.noticejs .warning .noticejs-body{color:#fff;padding:10px}.noticejs .warning .noticejs-body:hover{visibility:visible !important}.noticejs .warning .noticejs-content{visibility:visible}.noticejs .error{background-color:#e74c3c}.noticejs .error .noticejs-heading{background-color:#ba2c1d;color:#fff;padding:10px}.noticejs .error .noticejs-body{color:#fff;padding:10px}.noticejs .error .noticejs-body:hover{visibility:visible !important}.noticejs .error .noticejs-content{visibility:visible}.noticejs .progressbar{width:100%}.noticejs .progressbar .bar{width:1%;height:30px;background-color:#4caf50}.noticejs .success .noticejs-progressbar{width:100%;background-color:#64ce83;margin-top:-1px}.noticejs .success .noticejs-progressbar .noticejs-bar{width:100%;height:5px;background:#3da95c}.noticejs .info .noticejs-progressbar{width:100%;background-color:#3ea2ff;margin-top:-1px}.noticejs .info .noticejs-progressbar .noticejs-bar{width:100%;height:5px;background:#067cea}.noticejs .warning .noticejs-progressbar{width:100%;background-color:#ff7f48;margin-top:-1px}.noticejs .warning .noticejs-progressbar .noticejs-bar{width:100%;height:5px;background:#f44e06}.noticejs .error .noticejs-progressbar{width:100%;background-color:#e74c3c;margin-top:-1px}.noticejs .error .noticejs-progressbar .noticejs-bar{width:100%;height:5px;background:#ba2c1d}@keyframes noticejs-fadeOut{0%{opacity:1}to{opacity:0}}.noticejs-fadeOut{animation-name:noticejs-fadeOut}@keyframes noticejs-modal-in{to{opacity:.3}}@keyframes noticejs-modal-out{to{opacity:0}}.noticejs-rtl .noticejs-heading{direction:rtl}.noticejs-rtl .close{float:left !important;margin-left:7px;margin-right:0 !important}.noticejs-rtl .noticejs-content{direction:rtl}.noticejs{position:fixed;z-index:10050;width:320px}.noticejs::-webkit-scrollbar{width:8px}.noticejs::-webkit-scrollbar-button{width:8px;height:5px}.noticejs::-webkit-scrollbar-track{border-radius:10px}.noticejs::-webkit-scrollbar-thumb{background:hsla(0,0%,100%,.5);border-radius:10px}.noticejs::-webkit-scrollbar-thumb:hover{background:#fff}.noticejs-modal{position:fixed;width:100%;height:100%;background-color:#000;z-index:10000;opacity:.3;left:0;top:0}.noticejs-modal-open{opacity:0;animation:noticejs-modal-in .3s ease-out}.noticejs-modal-close{animation:noticejs-modal-out .3s ease-out;animation-fill-mode:forwards}.noticejs .special{background-color:rgb(160,37,160)}.noticejs .special .noticejs-heading{background-color:rgb(110,26,110);color:#fff;padding:10px}.noticejs .special .noticejs-body{color:#fff;padding:10px}.noticejs .special .noticejs-body:hover{visibility:visible !important}.noticejs .special .noticejs-content{visibility:visible}.noticejs .special .noticejs-progressbar{width:100%;background-color:rgb(160,37,160);margin-top:-1px}.noticejs .special .noticejs-progressbar .noticejs-bar{width:100%;height:5px;background:rgb(110,26,110)}/** * PostbirdAlertBox.js * -    原生javascript弹框插件 * Author:  Postbird - http://www.ptbird.cn * License: MIT * Date:    2017-09-23 */ .postbird-box-container {    width: 100%;    height: 100%;    overflow: hidden;    position: fixed;    top: 0;    left: 0;    z-index: 9999;    background-color: rgba(0, 0, 0, 0.2);    display: block;    -webkit-user-select: none;    -moz-user-select: none;    -ms-user-select: none;    user-select: none}.postbird-box-container.active {    display: block}.postbird-box-content {    min-width: 400px;    max-width: 600px;    min-height: 150px;    background-color: #fff;    border: solid 1px #dfdfdf;    position: absolute;    top: 50%;    left: 50%;    transform: translate(-50%, -50%);    margin-top: -100px}.postbird-box-header {    width: 100%;    padding: 10px 15px;    position: relative;    font-size: 1.1em;    letter-spacing: 2px}.postbird-box-close-btn {    cursor: pointer;    font-weight: 700;    color: #000;    float: right;    opacity: .5;    font-size: 1.3em;    margin-top: -3px;    display: none}.postbird-box-close-btn:hover {    opacity: 1}.postbird-box-text {    box-sizing: border-box;    width: 100%;    padding: 0 10%;    text-align: center;    line-height: 40px;    font-size: 20px;    letter-spacing: 1px}.postbird-box-footer {    width: 100%;    position: absolute;    padding: 0;    margin: 0;    bottom: 0;    display: flex;    display: -webkit-flex;    justify-content: space-around;    border-top: solid 1px #dfdfdf;    align-items: flex-end}.postbird-box-footer .btn-footer {    line-height: 44px;    border: 0;    cursor: pointer;    background-color: #fff;    color: #0e90d2;    font-size: 1.1em;    letter-spacing: 2px;    transition: background-color .5s;    -webkit-transition: background-color .5s;    -o-transition: background-color .5s;    -moz-transition: background-color .5s;    outline: 0}.postbird-box-footer .btn-footer:hover {    background-color: #e5e5e5}.postbird-box-footer .btn-block-footer {    width: 100%}.postbird-box-footer .btn-left-footer,.postbird-box-footer .btn-right-footer {    position: relative;    width: 100%}.postbird-box-footer .btn-left-footer::after {    content: "";    position: absolute;    right: 0;    top: 0;    background-color: #e5e5e5;    height: 100%;    width: 1px}.postbird-box-footer .btn-footer-cancel {    color: #333}.postbird-prompt-input {    width: 100%;    padding: 5px;    font-size: 16px;    border: 1px solid #ccc;    outline: 0}.onoffswitch {    position: relative; width: 45px;    -webkit-user-select:none; -moz-user-select:none; -ms-user-select: none;}.onoffswitch-checkbox {    position: absolute;    opacity: 0;    pointer-events: none;}.onoffswitch-label {    display: block; overflow: hidden; cursor: pointer;    height: 20px; padding: 0; line-height: 20px;    border: 2px solid #E3E3E3; border-radius: 20px;    background-color: #FFFFFF;    transition: background-color 0.3s ease-in;}.onoffswitch-label:before {    content: "";    display: block; width: 20px; margin: 0px;    background: #FFFFFF;    position: absolute; top: 0; bottom: 0;    right: 23px;    border: 2px solid #E3E3E3; border-radius: 20px;    transition: all 0.3s ease-in 0s; }.onoffswitch-checkbox:checked + .onoffswitch-label {    background-color: #3AAD38;}.onoffswitch-checkbox:checked + .onoffswitch-label, .onoffswitch-checkbox:checked + .onoffswitch-label:before {   border-color: #3AAD38;}.onoffswitch-checkbox:checked + .onoffswitch-label:before {    right: 0px; }.layui-timeline {    padding-left: 5px;}.layui-timeline-item {    position: relative;    padding-bottom: 20px;}li {    list-style: none;}.layui-timeline-item:first-child::before {    display: block;}.layui-timeline-item:last-child::before {    content: '';    position: absolute;    left: 5px;    top: 0;    z-index: 0;    width: 0;    height: 100%;}.layui-timeline-item::before {    content: '';    position: absolute;    left: 5px;    top: 0;    z-index: 0;    width: 1px;    height: 100%;}.layui-timeline-item::before,hr {    background-color: #e6e6e6;}.layui-timeline-axis {    position: absolute;    left: -5px;    top: 0;    z-index: 10;    width: 20px;    height: 20px;    line-height: 20px;    background-color: #fff;    color: #5FB878;    border-radius: 50%;    text-align: center;    cursor: pointer;}.layui-icon {    font-family: layui-icon !important;    font-size: 16px;    font-style: normal;}.layui-timeline-content {    padding-left: 25px;}.layui-text {    line-height: 22px;    font-size: 14px;    color: rgb(85,85,85);}.layui-timeline-title {    position: relative;}

		`)),document.head.appendChild(e)}
