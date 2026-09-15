# 🎨 DouyuEx-RL NEXT UI 基线与截图取证库 (ui-baseline)

本文档库用于保存 Brave 浏览器在斗鱼生产环境中的真实 UI 截图与微交互状态元数据，作为 NEXT 版本 MIUIX 组件库重构时的视觉基准。

---

## 目录结构

```text
docs/next/ui-baseline/
  README.md                     # 本规范说明
  metadata/                     # 截图元数据 JSON (包含视口尺寸、状态、脱敏说明等)
    dock-open.json
    fans-panel.json
    sign-panel.json
    popup-player-panel.json
    update-panel.json
    gift-picker-room.json
    gift-picker-backpack.json
    extool.json
    livetool-vote.json
    livetool-enter.json
    livetool-mute.json
    livetool-gift.json
    livetool-reply.json
    filter-panel.json
    enhance-panel.json
    perf-panel.json
  images/                       # 真实环境只读截图 (PNG 格式)
  states/                       # 各状态分类测试 (loading, empty, error, disabled, destroying, narrow-viewport)
```

---

## 截图取证硬性规约

1. **只读安全原则**：截取面板与控件时，仅执行点击展开、悬停、滚动、Tab 切换等无害只读交互。严禁在真实账号上触发送礼、发弹幕、批量关注/取关、禁言等操作。
2. **隐私脱敏原则**：截图不得包含用户 Cookie、Token、完整个人敏感 UID、私密聊天内容；必要时使用脱敏夹具或裁剪。
3. **状态完整性原则**：每个面板需分别记录默认、loading、empty、error、disabled、destroying 等状态或标明 N/A 理由。
