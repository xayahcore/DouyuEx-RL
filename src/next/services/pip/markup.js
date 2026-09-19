function* (__imports) {
yield {"pipMarkup0": { get: () => pipMarkup0 },
"renderPipMarkup0": { get: () => renderPipMarkup0, set: value => { renderPipMarkup0 = value; } },
"renderPipMarkup1": { get: () => renderPipMarkup1, set: value => { renderPipMarkup1 = value; } }};
const pipMarkup0 = `

            #pip-setting-panel {

                position: fixed;

                width: 440px;

                background: rgba(255, 255, 255, 0.98);

                border: 1px solid rgba(212, 212, 216, 1);

                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);

                border-radius: 12px;

                padding: 24px;

                z-index: 999999;

                font-family: "Helvetica Neue", Helvetica, Arial, "Microsoft Yahei", sans-serif;

                color: #18181b;

                box-sizing: border-box;

                backdrop-filter: blur(10px);

            }



            .pip-setting-header {

                display: flex;

                align-items: center;

                justify-content: space-between;

                margin: -24px -24px 24px;

                padding: 24px 24px 0;

                cursor: move;

                user-select: none;

            }



            .pip-setting-title {

                flex: 1;

                min-width: 0;

                font-size: 16px;

                font-weight: 600;

                color: #000000;

                letter-spacing: 0.5px;

                margin: 0;

            }



            .pip-setting-header-actions {

                display: flex;

                align-items: center;

                gap: 12px;

                flex-shrink: 0;

            }



            .pip-setting-reset {

                font-size: 13px;

                color: #71717a;

                cursor: pointer;

                transition: color 0.2s;

                text-decoration: underline;

                user-select: none;

                font-weight: 500;

                white-space: nowrap;

            }



            .pip-setting-reset:hover {

                color: #ff5d23;

            }



            .pip-setting-dismiss {

                flex-shrink: 0;

                width: 28px;

                height: 28px;

                margin: 0;

                padding: 0;

                border: none;

                border-radius: 6px;

                background: transparent;

                color: #71717a;

                font-size: 22px;

                line-height: 1;

                cursor: pointer;

                user-select: none;

                transition: background 0.2s, color 0.2s;

            }



            .pip-setting-dismiss:hover {

                background: #f4f4f5;

                color: #18181b;

            }



            .pip-setting-item {

                margin-bottom: 18px;

                display: flex;

                align-items: center;

                font-size: 13px;

            }



            .pip-setting-item.item-vertical {

                margin-bottom: 20px;

                flex-direction: column;

                align-items: flex-start;

            }



            .item-label-row {

                width: 100%;

                display: flex;

                align-items: center;

            }



            .pip-setting-item span:first-child {

                width: 100px;

                color: #3f3f46;

                font-weight: 600;

            }



            .pip-setting-item input[type="range"] {

                flex: 1;

                margin: 0 14px;

                -webkit-appearance: none;

                background: #d4d4d8;

                height: 4px;

                border-radius: 2px;

                outline: none;

            }



            .pip-setting-item input[type="range"]::-webkit-slider-thumb {

                -webkit-appearance: none;

                width: 12px;

                height: 12px;

                border-radius: 50%;

                background: #ff5d23;

                cursor: pointer;

                transition: transform 0.1s;

            }



            .pip-setting-item input[type="range"]::-webkit-slider-thumb:hover {

                transform: scale(1.2);

            }



            .pip-setting-item select {

                flex: 1;

                background: #f4f4f5;

                color: #18181b;

                padding: 6px 10px;

                border-radius: 6px;

                border: 1px solid #cdcdd6;

                outline: none;

                font-size: 13px;

                cursor: pointer;

                transition: border-color 0.2s, background 0.2s;

                font-weight: 500;

            }



            .pip-setting-item select:focus {

                border-color: #ff5d23;

                background: #ffffff;

            }



            .pip-setting-item span:last-child {

                width: 32px;

                text-align: right;

                color: #ff5d23;

                font-weight: bold;

                font-family: monospace;

            }



            .pip-setting-tip {

                font-size: 11px;

                color: #52525b;

                margin-top: 6px;

                margin-left: 100px;

                line-height: 1.4;

            }



        `;

function renderPipMarkup0(value0, value1, value2) { return `

        <style>

            html,body{margin:0;width:100%;height:100%;overflow:hidden;background:black;font-family: sans-serif;}

            #wrap{position:relative;width:100%;height:100%;display:flex;flex-direction:column;}

            #main-view{position:relative;flex:1;width:100%;overflow:hidden;}

            video{width:100%;height:100%;object-fit:contain;}

            #danmaku{position:absolute;inset:0;pointer-events:none;overflow:hidden;}

            

            #pip-back-opener {

                position: absolute;

                top: 10px;

                right: -140px;

                left: auto;

                z-index: 10001;

                padding: 6px 12px;

                font-size: 15px;

                font-weight: 600;

                line-height: 1.25;

                color: #fff;

                background: rgba(0, 0, 0, 0.65);

                border: 1px solid rgba(255, 255, 255, 0.35);

                border-radius: 6px;

                cursor: pointer;

                font-family: "Microsoft YaHei", "SimHei", sans-serif;

                transition: right 0.3s, background 0.2s, border-color 0.2s;

                white-space: nowrap;

                user-select: none;

            }

            #pip-back-opener:hover {

                background: rgba(0, 0, 0, 0.88);

                border-color: rgba(255, 255, 255, 0.55);

            }

            #wrap:hover #pip-back-opener {

                right: 10px;

            }



            #combo-container {

                position: absolute;

                top: 6px;

                left: 6px;

                right: 6px;

                display: flex;

                flex-direction: row;

                flex-wrap: wrap;

                align-items: flex-start;

                align-content: flex-start;

                gap: 4px;

                max-height: 44px;

                overflow: hidden;

                pointer-events: none;

                z-index: 9999;

            }

            .combo-item {

                background: rgba(0, 0, 0, 0.55);

                color: #fff;

                padding: 2px 8px;

                border-radius: 12px;

                font-size: 11px;

                font-weight: 600;

                line-height: 1.3;

                max-width: calc(50% - 4px);

                overflow: hidden;

                text-overflow: ellipsis;

                white-space: nowrap;

                border: 1px solid rgba(255, 193, 7, 0.45);

                text-shadow: 0 1px 2px #000;

                box-sizing: border-box;

            }

            .combo-item--more {

                max-width: none;

                flex-shrink: 0;

                color: #d4d4d8;

                border-color: rgba(255, 255, 255, 0.2);

                background: rgba(0, 0, 0, 0.4);

                font-size: 10px;

                font-weight: 500;

            }

            .combo-count {

                color: #ffeb3b;

                margin-left: 4px;

                font-weight: 700;

            }



            .dm{

                position:absolute;

                white-space:nowrap;

                will-change:transform;

                box-sizing: border-box;

                font-weight: 700;

                line-height: 1.2;

                font-family: "SimHei", "Microsoft YaHei", "Arial Black", "Segoe UI Historic", sans-serif;

                text-shadow:

                    1px 0 1px rgba(0, 0, 0, 0.85),

                    -1px 0 1px rgba(0, 0, 0, 0.85),

                    0 1px 1px rgba(0, 0, 0, 0.85),

                    0 -1px 1px rgba(0, 0, 0, 0.85);

            }

            

            .dm-self {

                background-color: rgba(0, 0, 0, 0.35);

                border: 1px solid #00ff66 !important;

                padding: 2px 8px;

                border-radius: 4px;

                box-shadow: 0 0 4px rgba(0, 255, 102, 0.4), inset 0 0 4px rgba(0, 255, 102, 0.15);

            }



            #pip-btns{

                position: absolute;

                top: 50%;

                transform: translateY(-50%);

                display: flex;

                justify-content: center;

                left: -50px;

                padding: 4px;

                z-index: 1000;

                transition: all 0.3s;

                flex-direction: column;

            }



            .pip-btn {

                width: 36px;

                height: 36px;

                min-width: 36px;

                min-height: 36px;

                padding: 0;

                box-sizing: border-box;

                flex-shrink: 0;

                border: 2px solid #FFF;

                border-radius: 50%;

                display: flex;

                align-items: center;

                justify-content: center;

                background: #00000094;

                cursor: pointer;

                z-index: 1000;

                transition: all 0.3s;

                margin: 5px 0;

            }



            .pip-btn img,

            .pip-btn svg {

                display: block;

                width: 24px;

                height: 24px;

                color: #fff;

            }



            .pip-btn:hover {background:#000000c4;}

            .pip-btn-danmaku {

                position: relative;

                font-size: 15px;

                font-weight: 700;

                color: #fff;

                line-height: 1;

                font-family: "Microsoft YaHei", "SimHei", sans-serif;

            }

            .pip-btn-danmaku.is-off {

                opacity: 0.65;

                border-color: #999;

                color: #ccc;

            }

            .pip-btn-danmaku.is-off::after {

                content: "";

                position: absolute;

                left: 18%;

                top: 50%;

                width: 64%;

                height: 2px;

                background: rgba(255, 255, 255, 0.95);

                transform: translateY(-50%) rotate(-45deg);

                border-radius: 1px;

                pointer-events: none;

            }

            #wrap:hover #pip-btns {left:10px}



            #pip-toast{

                position:absolute;

                left:50%;top:50%;

                transform:translate(-50%,-50%);

                background:rgba(0,0,0,.75);

                color:#fff;

                padding:10px 16px;

                border-radius:10px;

                font-size:14px;

                z-index:99999;

                opacity:0;

                transition:opacity .3s;

                pointer-events:none;

                text-align:center;

            }

            #pip-toast.show{opacity:1;}



            #input-panel {

                display: none;

                background: #18181c;

                padding: 8px 12px;

                box-sizing: border-box;

                border-top: 1px solid #2f2f35;

                align-items: center;

                gap: 10px;

                z-index: 10000;

                position: absolute;

                bottom: 0;

                width: 100%;

            }

            #input-panel.active {

                display: flex;

            }

            #pip-input-field {

                flex: 1;

                background: #2a2a30;

                border: 1px solid #3f3f46;

                border-radius: 6px;

                color: #fff;

                padding: 6px 10px;

                font-size: 14px;

                outline: none;

            }

            #pip-input-field:focus {

                border-color: #ff5d23;

            }

            #pip-submit-btn {

                background: #ff5d23;

                color: #fff;

                border: none;

                padding: 6px 14px;

                border-radius: 6px;

                font-size: 14px;

                cursor: pointer;

                font-weight: bold;

                transition: background 0.2s;

            }

            #pip-submit-btn:hover {

                background: #e04e1b;

            }

        </style>



        <div id="wrap">

            <div id="main-view">

                <div id="pip-back-opener"></div>

                <div id="pip-btns">

                    <div id="pip-reload" class="pip-btn pip-btn-reload">${value0}</div>

                    <div id="pip-danmaku-toggle" class="pip-btn pip-btn-danmaku"></div>

                    <div id="pip-set" class="pip-btn">${value1}</div>

                    <div id="pip-send" class="pip-btn">${value2}</div>

                </div>

                <video id="pip-video" autoplay muted playsinline></video>

                <div id="danmaku"></div>

                <div id="combo-container"></div>

                <div id="pip-toast"></div>

            </div>

            

            <div id="input-panel">

                <input type="text" id="pip-input-field" placeholder="" maxlength="50" autocomplete="off" />

                <button id="pip-submit-btn" type="button"></button>

            </div>

        </div>

    `; }

function renderPipMarkup1(value0, value1, value2, value3, value4, value5, value6, value7) { return `

        <div class="pip-setting-header">

            <div class="pip-setting-title">画中画弹幕设置</div>

            <div class="pip-setting-header-actions">

                <span class="pip-setting-reset">恢复默认</span>

                <button type="button" class="pip-setting-dismiss" aria-label="关闭">×</button>

            </div>

        </div>



        <div class="pip-setting-item">

            <span>弹幕字号</span>

            <input id="pip-fontsize" type="range" min="12" max="48" value="${value0}">

            <span id="pip-fontsize-value">${value1}</span>

        </div>



        <div class="pip-setting-item">

            <span>弹幕上下间距</span>

            <input id="pip-trackheight" type="range" min="14" max="60" value="${value2}">

            <span id="pip-trackheight-value">${value3}</span>

        </div>



        <div class="pip-setting-item">

            <span>弹幕速度</span>

            <input id="pip-speed" type="range" min="1" max="10" step="0.5" value="${value4}">

            <span id="pip-speed-value">${value5}</span>

        </div>



        <div class="pip-setting-item">

            <span>弹幕透明度</span>

            <input id="pip-opacity" type="range" min="30" max="100" value="${value6}">

            <span id="pip-opacity-value">${value7}%</span>

        </div>



        <div class="pip-setting-item">

            <span>弹幕显示区域</span>

            <select id="pip-area">

                <option value="full">全屏</option>

                <option value="half">1/2</option>

                <option value="quarter">1/4</option>

            </select>

        </div>



        <div class="pip-setting-item item-vertical">

            <div class="item-label-row">

                <span>重复弹幕合并</span>

                <select id="pip-mergemode">

                    <option value="all">全部显示</option>

                    <option value="single">只显示一条</option>

                    <option value="combo">合并显示（如X5）</option>

                </select>

            </div>

            <div class="pip-setting-tip">短时间内多条相同弹幕内容时的显示方式</div>

        </div>



        <div class="pip-setting-item item-vertical">

            <div class="item-label-row">

                <span>屏蔽机器人弹幕</span>

                <select id="pip-filterrobot">

                    <option value="on">开启</option>

                    <option value="off">关闭</option>

                </select>

            </div>

            <div class="pip-setting-tip">开启后过滤无用户标识的机器人弹幕</div>

        </div>



        <div class="pip-setting-item item-vertical">

            <div class="item-label-row">

                <span>原网页低功耗</span>

                <select id="pip-lowpowermode">

                    <option value="on">开启</option>

                    <option value="off">关闭</option>

                </select>

            </div>

            <div class="pip-setting-tip">开启后，拉起画中画时将隐藏原网页视频区、飘屏弹幕与礼物动画，保留右侧弹幕列表，以降低 CPU 占用</div>

        </div>



        <div class="pip-setting-item item-vertical">

            <div class="item-label-row">

                <span>页签防冻结</span>

                <select id="pip-tabswitch">

                    <option value="on">开启</option>

                    <option value="off">关闭</option>

                </select>

            </div>

            <div class="pip-setting-tip">与扩展工具「防页签冻结」共用设置；开启后画中画期间保持源页解码并自动缓解卡屏（关闭需刷新页面后完全生效）</div>

        </div>



    `; }

}
