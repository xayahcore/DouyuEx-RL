# 💾 DouyuEx-RL NEXT 存储字典与配置迁移映射契约 (STORAGE_MAPPING.md)

> 任务包：`P0.2`  
> 目标：对老版本 38 个字面量 `ExSave_*` 键、动态拼接键、GM 跨域键与宿主播放器键建立端到端迁移映射，保证老用户升级配置零丢失。

---

## 一、 新架构统一存储体系

1. **主配置字典 (GM 跨域持久化)**：
   - 键名：`DYEXRL_NEXT_CONFIG`
   - 结构：`{ "schemaVersion": 1, "revision": 1, "updatedAt": 1726485000000, "settings": { ... } }`
2. **多账号凭据镜像 (GM 隔离)**：
   - 键名：`DYEXRL_NEXT_ACCOUNTS` (与普通配置物理隔离，严禁包含在配置导出中)
3. **Core 底层同步开关镜像 (当前 Origin LocalStorage)**：
   - 键名：`DYEXRL_NEXT_CORE` (仅包含 `quality: boolean, p2pBlock: boolean`，供 `document-start` 同步读取)

---

## 二、 44 个老版本键名到 NEXT Store 映射矩阵

| 老版本存储键名 (Legacy Key) | 作用域 | 对应业务能力 | NEXT 语义化存储路径 (`settings.*`) | 默认值 | 迁移转换器逻辑 | 重置清理白名单 |
|:---|:---:|:---:|:---|:---:|:---|:---:|
| `ExSave_HighestVideoQuality` | LS | F-01 | `core.highestQuality` | `true` | `val?.isHighestVideoQuality ?? true` | ✅ 允许清理 |
| `ExSave_P2P` | LS | F-03 | `core.p2pBlock` | `true` | `val?.isKillP2P ?? true` | ✅ 允许清理 |
| `ExSave_FullScreen` | LS | F-34 | `player.autoFullScreen` | `false` | `val?.isFullScreen ?? false` | ✅ 允许清理 |
| `ExSave_Mode` | LS | F-34 | `ui.cleanMode` | `false` | `val?.mode === 1` | ✅ 允许清理 |
| `ExSave_TabSwitch` | LS | F-08 | `player.tabSwitchEconomy` | `false` | `val?.isEnableTabSwitch ?? false` | ✅ 允许清理 |
| `ExSave_Refresh` | LS | F-34 | `player.refreshSettings` | `{}` | `JSON.parse(val)` | ✅ 允许清理 |
| `ExSave_Camera_Hidden` | LS | F-10 | `vod.cameraHidden` | `false` | `Date.now() < parseInt(val)` | ✅ 允许清理 |
| `ExSave_PipSet` | LS | F-04 | `media.pipSettings` | `{}` | `JSON.parse(val)` | ✅ 允许清理 |
| `ExSave_DanmakuTail` | LS | F-12 | `danmaku.tail` | `{ enabled: false, text: "", type: "2" }` | 提取 `isTailEnabled`, `tailContent`, `type` | ✅ 允许清理 |
| `ExSave_DanmakuCollect` | LS | F-13 | `danmaku.collections` | `[]` | 数组保持，去除 20 条人为限制 | ✅ 允许清理 |
| `ExSave_BarrageLoopOptions` | LS | F-32 | `danmaku.bloopOptions` | `{}` | 提取多行词库、时间间隔 | ✅ 允许清理 |
| `ExSave_Vote` | LS | F-32 | `danmaku.voteSettings` | `{}` | 提取主题、选项、限时、重复开关 | ✅ 允许清理 |
| `ExSave_Enter` | LS | F-17 | `danmaku.enterWords` | `[]` | 欢迎语列表 | ✅ 允许清理 |
| `ExSave_isEnter` | LS | F-17 | `danmaku.enterEnabled` | `false` | 布尔化 | ✅ 允许清理 |
| `ExSave_LastEnterWord` | LS | F-17 | `danmaku.lastEnterWord` | `""` | 字符串保持 | ✅ 允许清理 |
| `ExSave_Gift` | LS | F-17 | `danmaku.thankGifts` | `[]` | 感谢礼物模板列表 | ✅ 允许清理 |
| `ExSave_isGift` | LS | F-17 | `danmaku.thankGiftEnabled` | `false` | 布尔化 | ✅ 允许清理 |
| `ExSave_Mute` | LS | F-18 | `danmaku.muteRules` | `[]` | 违规词与禁言时长 | ✅ 允许清理 |
| `ExSave_isMute` | LS | F-18 | `danmaku.muteEnabled` | `false` | 布尔化 | ✅ 允许清理 |
| `ExSave_Reply` | LS | F-14 | `danmaku.autoReplyRules` | `[]` | 关键词与回复内容字典 | ✅ 允许清理 |
| `ExSave_ReplyCd` | LS | F-14 | `danmaku.autoReplyCd` | `5` | `parseInt(val) || 5` | ✅ 允许清理 |
| `ExSave_isReply` | LS | F-14 | `danmaku.autoReplyEnabled` | `false` | 布尔化 | ✅ 允许清理 |
| `ExSave_isRemoveRepeatedDanmaku` | LS | F-16 | `danmaku.filter.removeRepeated` | `false` | 布尔化 | ✅ 允许清理 |
| `ExSave_repeatedDanmakuSeconds` | LS | F-16 | `danmaku.filter.repeatWindowSeconds` | `5` | `parseInt(val) || 5` | ✅ 允许清理 |
| `ExSave_isRemoveEnterBarrage` | LS | F-16 | `danmaku.filter.removeEnter` | `false` | 布尔化 | ✅ 允许清理 |
| `ExSave_isRemoveDanmakuImage` | LS | F-16 | `danmaku.filter.removeStickers` | `false` | 布尔化 | ✅ 允许清理 |
| `ExSave_isRemoveDanmakuBackground` | LS | F-16 | `danmaku.filter.removeBackground` | `false` | 布尔化 | ✅ 允许清理 |
| `ExSave_isEnlargeDanmaku` | LS | F-16 | `danmaku.filter.enlargeFont` | `false` | 布尔化 | ✅ 允许清理 |
| `ExSave_isRemoveMsgNotice` | LS | F-34 | `ui.removeMsgNotice` | `false` | 布尔化 | ✅ 允许清理 |
| `ExSave_FansContinue` | LS | F-22 | `economy.fansContinueCount` | `0` | `parseInt(val) || 0` | ✅ 允许清理 |
| `ExSave_SignConfig` | LS | F-23 | `economy.signConfig` | `{ room: true, client: true, yuba: true, stardiscover: true, fanshome: true }` | 合并默认值 | ✅ 允许清理 |
| `ExSave_AutoFish` | LS | F-24 | `economy.autoFish` | `{ rids: [], modes: {} }` | 保持配置 | ✅ 允许清理 |
| `ExSave_Lottery` | LS | F-25 | `radar.lotterySettings` | `{ isNotice: true }` | 提取通知开关 | ✅ 允许清理 |
| `ExSave_Treasure` | LS | F-26 | `radar.treasure` | `{ enabled: false, delay: 0 }` | 提取开关与延迟 | ✅ 允许清理 |
| `ExSave_RedPacket_Room` | LS | F-26 | `radar.redpacket` | `{ enabled: false }` | 提取开关 | ✅ 允许清理 |
| `ExSave_MonthCost` | LS | F-51 | `system.monthCost` | `{}` | 月度消费明细 | ✅ 允许清理 |
| `ExSave_MonthCost_SeeStatus` | LS | F-51 | `system.monthCostHidden` | `true` | 是否遮挡金额 | ✅ 允许清理 |
| `ExSave_GoldBadgeName` | LS | F-22 | *已退休 (废弃)* | 忽略 | 彻底废除假名字，直接动态提取真实粉丝牌 | ❌ 自动清除 |
| `Ex_accountList` | GM | F-29 | `passport.accounts` | `{}` | 账号昵称/UID映射 | ❌ **严禁误删** (需专用账户清空) |
| `Ex_accountListPassport` | GM | F-29 | `passport.credentials` | `{}` | 跨域 Cookie LTP0 备份 | ❌ **严禁误删** |
| `Ex_LastNotifiedVersion` | GM | F-30 | `system.lastNotifiedVersion` | `""` | 字符串保持 | ✅ 允许清理 |
| `Ex_LastUpdateCheckTime` | GM | F-30 | `system.lastUpdateCheckTime` | `0` | 时间戳保持 | ✅ 允许清理 |

---

## 三、 斗鱼官方播放器偏好键 (Host Native Keys - 严禁纳入插件重置白名单)
以下 6 项为斗鱼宿主播放器内核的配置键，NEXT 的 `core/quality.js` 会在开播时将其镜像同步为原画，但**在执行“重置所有设置”时必须严格排除，严禁越权删除宿主偏好**：
- `rateRecordTime_h5p_room`
- `realRateModel2_h5p_room`
- `player_storage_quality_h5p_room`
- `player_storage_rate_h5p_room`
- `realRateModel2`
- `player_storage_quality`
