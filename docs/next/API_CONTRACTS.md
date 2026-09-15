# 📡 DouyuEx-RL NEXT API 契约台账 (API_CONTRACTS.md)

> 任务包：`P0.2`  
> 审计基线：`v2026.09.15.01`  
> 规范要求：所有接口必须明确方法、端点、认证来源、Payload 字段、响应结构、幂等性与消费者模块。未经确认字段标记阻塞编号，严禁在正式代码中猜测 URL。

---

## 一、 核心基础与播控接口 (A-01 ～ A-02)

### A-01: 房间基础配置与画质档位接口 (`/betard/{rid}`)
- **端点**: `GET https://www.douyu.com/betard/{rid}`
- **认证**: 无需特权凭据，携带同源 Cookie 即可
- **参数**: 路径参数 `{rid}` (纯数字房间号)
- **响应 Schema (核心字段)**:
  ```json
  {
    "room": {
      "room_id": 9999,
      "show_status": 1,
      "rate": 0,
      "multirates": [
        { "name": "原画", "type": 0, "high_bit": 1 },
        { "name": "蓝光8M", "type": 4 },
        { "name": "超清", "type": 3 }
      ]
    },
    "room_gift": { "gift": { ... } }
  }
  ```
- **是否幂等**: 是 (只读)
- **消费者模块**: `src/core/quality.js` (F-01), `src/api/room.js` (F-20 房间在播专属礼物)
- **证据等级**: A (已阅读完整截杀与响应克隆调用链)

### A-02: 播放器推流直链请求 (`/lapi/live/getH5Play/{rid}`)
- **端点**: `POST https://www.douyu.com/lapi/live/getH5Play/{rid}`
- **认证**: Cookie 登录态，Payload 携带 sign / token
- **请求体**: `application/x-www-form-urlencoded`，包含 `rate=0&cdn={cdn}&token={token}`
- **改写逻辑**: `quality.js` 拦截该请求，强制改写 `rate=[^&]*` 为 `rate=0`
- **是否幂等**: 是 (只读获取推流)
- **消费者模块**: `src/core/quality.js` (F-01), `src/modules/media/multi_room.js` (F-05)
- **证据等级**: A

---

## 二、 日常签到与任务流水线接口 (A-03 ～ A-10, B-SIGN)

### A-03: Web 客户端每日签到 (`/japi/carnival/nc/sign/webSign`)
- **端点**: `POST https://www.douyu.com/japi/carnival/nc/sign/webSign`
- **认证**: Cookie 登录态
- **参数**: `uid` (用户 UID)
- **响应 Schema**: `{ "error": 0, "msg": "success", "data": { ... } }` (今日已签到时 error 非 0 或 data 为空)
- **是否幂等**: 否 (写操作，每日单次)
- **消费者模块**: `src/modules/economy/sign_engine.js` (F-23)
- **证据等级**: A

### A-04: 鱼吧打卡与经验领取 (`https://yuba.douyu.com/wb/sign` & `/wbapi/web/group/myFollow`)
- **端点**: 
  1. 获取关注鱼吧: `GET https://yuba.douyu.com/wbapi/web/group/myFollow?page={page}&limit=30` (Header 带 `dy-client: pc`, `dy-token`)
  2. 补签与打卡: `POST https://mapi-yuba.douyu.com/wb/v3/supplement` (Data: `group_id={groupId}&client=android&token={token}`)
- **是否幂等**: 否
- **消费者模块**: `src/modules/economy/sign_engine.js` (F-23)
- **证据等级**: A

### A-05: 房间每日签到打卡 (`/japi/roomuserlevel/apinc/checkIn`)
- **端点**: `POST https://apiv2.douyucdn.cn/japi/roomuserlevel/apinc/checkIn?client_sys=android`
- **参数**: `rid={rid}` (Header: `token`, `aid: android1`)
- **是否幂等**: 否 (每日首签)
- **消费者模块**: `src/modules/economy/sign_engine.js` (F-23)
- **证据等级**: A

### A-06 ~ A-10: 全民星推日常任务链 (`anchorstardiscover`)
- **大盘榜单**: `GET https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/rank/info?rid={rid}&type=5&track=3` (返回前 100 名参赛主播列表 `rankItemList` 与当前房间参赛状态 `memberInfo`)
- **任务清单**: `GET https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/list?rid={rid}` (读取 8 项任务及进度 `curCompleteNum`/`taskLimitNum`)
- **任务上报**: `POST https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/report` (Header 带 `dy-csrf-token`, Body 带 `ctn={ccn}&type={5|6|1}&rid={rid}`)
- **推荐主播**: `GET https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/follow/introduce?rid={rid}` (官方推荐专属“去认识”主播池)
- **关注主播**: `POST /wgapi/livenc/liveweb/follow/add` (Body: `rid={rid}&ctn={ccn}`)
- **安全取关**: `POST /wgapi/livenc/liveweb/follow/rm` (Body: `rid={rid}&ctn={ccn}`)
- **是否幂等**: 任务上报幂等，关注/取关非幂等
- **证据等级**: A (已通过 CDP 逆向与真机 100% 验证)

---

## 三、 自动钓鱼挂机系统接口 (B-FISH)

### B-FISH-01: 钓鱼首页状态与时间戳探测 (`homePage`)
- **端点**: `GET https://www.douyu.com/japi/revenuenc/web/actfans/fishing/homePage?rid={rid}&opt=1`
- **认证**: Cookie 登录态
- **响应 Schema**:
  ```json
  {
    "error": 0,
    "msg": "success",
    "data": {
      "user": { "avatar": "...", "baitNum": 15 },
      "fishing": { "stat": 1, "fishEtMs": 1726481234000 }
    }
  }
  ```
- **状态说明**: `stat === 0` 未抛竿；`stat === 1` 钓鱼中；`fishEtMs` 为预计收杆绝对毫秒时间戳
- **是否幂等**: 是 (只读查询)
- **消费者模块**: `src/modules/economy/autofish.js` (F-24)
- **证据等级**: A (已真机验证接口存在且返回未登录 error: 1002)

### B-FISH-02: 提竿收杆与收益结算 (`reelIn`)
- **端点**: `POST https://www.douyu.com/japi/revenuenc/web/actfans/fishing/reelIn`
- **认证**: Cookie 登录态，Body: `ctn={ccn}&rid={rid}`
- **响应 Schema**:
  ```json
  {
    "error": 0,
    "msg": "success",
    "data": {
      "fish": { "id": 102, "name": "锦鲤", "wei": 3.8 },
      "awards": [{ "awardName": "荧光棒", "awardNum": 2 }]
    }
  }
  ```
- **是否幂等**: 否 (收杆结算，产生实际资产)
- **消费者模块**: `src/modules/economy/autofish.js` (F-24)
- **证据等级**: A

---

## 四、 背包资产与礼物系统接口 (A-11 ～ A-13, B-GIFTS, B-SEND)

### A-12: 用户真实背包资产查询 (`prop/backpack/web/v5`)
- **端点**: `GET https://www.douyu.com/japi/prop/backpack/web/v5?rid={rid}`
- **认证**: Cookie 登录态
- **参数**: `rid` 纯数字房间号
- **响应 Schema**: `data.list` 包含背包道具列表 `[{ id, name, count, exp, icon, batchInfo }]`
- **是否幂等**: 是 (只读)
- **消费者模块**: `src/ui/gift_picker.js` (F-20), `src/modules/economy/backpack.js` (F-21)
- **证据等级**: A

### B-GIFTS: 通用在播大盘礼物池 (`RoomApi/room/{rid}`)
- **端点**: `GET https://open.douyucdn.cn/api/RoomApi/room/{rid}`
- **认证**: 无需凭据 (公网开放接口)
- **响应 Schema**: `data.gift` 包含该房间挂牌可用的全部官方礼物
- **消费者模块**: `src/ui/gift_picker.js` (F-20)
- **证据等级**: A

### A-13 / B-SEND: 背包道具赠送接口 (`donate/mainsite/v1`)
- **端点**: `POST https://www.douyu.com/japi/prop/donate/mainsite/v1` (或送礼接口)
- **认证**: Cookie 登录态，携带 ccn
- **参数**: `propId`, `count`, `roomId`
- **是否幂等**: 否 (扣减背包资产，**严禁自动失败重发**)
- **证据等级**: B (待 P3.A 细化确切参数并挂载防重复锁)

---

## 五、 全站感知、硬件探测与辅助接口

### B-HARDWARE: 主播电脑真实硬件环境探测 (`member/cp`)
- **端点**: `GET https://www.douyu.com/member/cp`
- **认证**: Cookie 登录态
- **解析逻辑**: 从 HTML 中提取 `O.dy_cpu_model`, `O.dy_gpu_model`, `O.dy_device_model`, `O.dy_os_version`
- **是否幂等**: 是
- **消费者模块**: `src/modules/radar/hardware.js` (F-27)
- **证据等级**: A (源码 `02_dom_ui.js:1700` 行确切挂载)

### B-LOTTERY: 全站抽奖与红包广播
- **协议**: WebSocket 长连接广播包与官方房间红包状态监听
- **消费者模块**: `src/modules/radar/lottery.js` (F-25), `treasure.js` (F-26)
- **证据等级**: B

### B-VOD: 录播视频信息与弹幕分页抓取
- **视频信息**: `GET https://v.douyu.com/video/video/getVideoUrl?vid={vid}`
- **弹幕分页**: `GET https://v.douyu.com/wgapi/vod/center/getBarrageListByPage?vid={vid}&page={page}`
- **是否幂等**: 是
- **消费者模块**: `src/modules/vod/` (F-11, F-57, F-58)
- **证据等级**: B
