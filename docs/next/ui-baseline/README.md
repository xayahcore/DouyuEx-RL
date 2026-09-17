# 🎨 DouyuEx-RL NEXT UI 基线与截图取证库 (ui-baseline)

本文档库为运行在当前环境下的 **DouyuEx-RL NEXT 官方 UI 视觉与交互真源**，严格依从《实施计划书》§4（MIUIX 视觉与交互契约）与 §15（Brave UI 基线协议）建立。

---

## 一、 基线资产台账 (16 大核心面板与控件)

| 编号 | 面板/控件标识 | 类别 | 标准尺寸 | 对应功能/面板编号 | 截图资产 | 状态元数据 |
|---|---|---|---|---|---|---|
| **01** | `dock-open` | Dock | 76px 晶透微胶囊 (9按钮，56×56px单元格) | F-48 / Level 2 Dock | [`dock-open.png`](images/dock-open.png) | [`dock-open.json`](metadata/dock-open.json) |
| **02** | `fans-panel` | Panel | 380×370px | F-22 / P-01 一键续牌 | [`fans-panel.png`](images/fans-panel.png) | [`fans-panel.json`](metadata/fans-panel.json) |
| **03** | `sign-panel` | Panel | 380×370px | F-23 / P-02 一键签到 | [`sign-panel.png`](images/sign-panel.png) | [`sign-panel.json`](metadata/sign-panel.json) |
| **04** | `popup-player-panel` | Panel | 380×370px | F-04 / F-05 同屏/画中画 | [`popup-player-panel.png`](images/popup-player-panel.png) | [`popup-player-panel.json`](metadata/popup-player-panel.json) |
| **05** | `update-panel` | Panel | 380×370px | F-34 / 版本更新中心 | [`update-panel.png`](images/update-panel.png) | [`update-panel.json`](metadata/update-panel.json) |
| **06** | `lottery-panel` | Panel | 380×370px | F-25 / 全站抽奖大厅 | [`lottery-panel.png`](images/lottery-panel.png) | [`lottery-panel.json`](metadata/lottery-panel.json) |
| **07** | `gift-picker-room` | Modal | 540×410px | F-20 / P-05 礼物选择器(房间) | [`gift-picker-room.png`](images/gift-picker-room.png) | [`gift-picker-room.json`](metadata/gift-picker-room.json) |
| **08** | `gift-picker-backpack` | Modal | 540×410px | F-21 / P-05 礼物选择器(背包) | [`gift-picker-backpack.png`](images/gift-picker-backpack.png) | [`gift-picker-backpack.json`](metadata/gift-picker-backpack.json) |
| **09** | `extool` | Panel | 380×370px | F-24 / 扩展功能总控 | [`extool.png`](images/extool.png) | [`extool.json`](metadata/extool.json) |
| **10** | `livetool-vote` | Accordion | 380×370px | L3-01 弹幕投票手风琴 | [`livetool-vote.png`](images/livetool-vote.png) | [`livetool-vote.json`](metadata/livetool-vote.json) |
| **11** | `livetool-enter` | Accordion | 380×370px | L3-02 进场欢迎手风琴 | [`livetool-enter.png`](images/livetool-enter.png) | [`livetool-enter.json`](metadata/livetool-enter.json) |
| **12** | `livetool-mute` | Accordion | 380×370px | L3-03 关键词禁言手风琴 | [`livetool-mute.png`](images/livetool-mute.png) | [`livetool-mute.json`](metadata/livetool-mute.json) |
| **13** | `livetool-gift` | Accordion | 380×370px | L3-04 自动答谢手风琴 | [`livetool-gift.png`](images/livetool-gift.png) | [`livetool-gift.json`](metadata/livetool-gift.json) |
| **14** | `livetool-reply` | Accordion | 380×370px | L3-05 关键词回复手风琴 | [`livetool-reply.png`](images/livetool-reply.png) | [`livetool-reply.json`](metadata/livetool-reply.json) |
| **15** | `filter-panel` | Accordion | 380×370px | F-06 / L3-11 滤镜抽屉 | [`filter-panel.png`](images/filter-panel.png) | [`filter-panel.json`](metadata/filter-panel.json) |
| **16** | `enhance-panel` | Accordion | 380×370px | F-06 / L3-12 画质微光调节 | [`enhance-panel.png`](images/enhance-panel.png) | [`enhance-panel.json`](metadata/enhance-panel.json) |
| **17** | `perf-panel` | Panel | 380×370px | F-27 / L3-06 推流性能硬件看板 | [`perf-panel.png`](images/perf-panel.png) | [`perf-panel.json`](metadata/perf-panel.json) |

---

## 二、 核心视觉约束与设计令牌

1. **绝对尺寸锁定**：
   - 普通面板严密锁定为 `380×370px`，禁止被内容撑开抖动；
   - 大礼物选择器锁定为 `540×410px`；
   - 精灵球主按钮为 `24×24px` 经典多色红白球，内嵌于播放器底栏首位；
   - Dock 工具条高度严格为 `76px`（大圆角 38px，晶透微胶囊），按钮单元为 `56×56px`，磁吸光标胶囊为 `24×4px`；
   - 在线弹幕助手为唯一无三级面板按钮，直接直达助手链接；
2. **高斯磨砂微质感**：
   - 面板统一采用 `backdrop-filter: blur(36px) saturate(220%)`；
   - 粘性吸顶 Header 采用 `height: 44px; backdrop-filter: blur(28px)`；
   - 极细滚动条为 `4px`（滑块 `#cbd5e1`，悬停 `#94a3b8`）；
3. **交互手感与退出防抖**：
   - 隐形悬浮桥 `32px`；
   - 鼠标移出关闭定时器严格为 `400ms`（移入面板或按钮即刻清除定时器取消关闭）；
   - 所有对话框与操作提示统一调用 `MIUIX.Dialog` 与 `MIUIX.Toast`。
