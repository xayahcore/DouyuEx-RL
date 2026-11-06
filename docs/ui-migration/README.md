# UI 迁移 · 基线（S0）

> 用途：ExUI 全量 DOM 迁移的**比对基准**。迁移后必须用同一套命令重采，再 `node tools/ui-diff.mjs` 逐元素比对（§4.5）。
> 生成工具：[tools/ui-snap.mjs](../../tools/ui-snap.mjs)（ego-browser） · 比对工具：[tools/ui-diff.mjs](../../tools/ui-diff.mjs)
> 采集时间：2026-11-01 · 注入包：`DouyuEx_RL.user.js` 797,412 字节 / 版本 2026.11.01.01 · 房间 `douyu.com/9999`

## 怎么复跑

```bash
# 1) 采基线（或采迁移后的对照）：参数写在 docs/ui-migration/_run.json
#    { "out": "baseline", "viewports": "1625x763,1280x720,1024x576" }
#    （ego-cli 不透传环境变量，实测确认）
ego-browser nodejs < tools/ui-snap.mjs

# 2) 逐元素比对（退出码 0=通过 / 1=超阈值 / 2=输入缺失）
node tools/ui-diff.mjs docs/ui-migration/baseline docs/ui-migration/after --vp 1625

# 3) 像素比对（Pillow；极差 <=1 且差异 <0.5% 才 PASS）
python tools/ui-pixel.py docs/ui-migration/baseline docs/ui-migration/after --vp 1625
```

## 已采内容（三档视口：1625×763 / 1280×720 / 1024×576）

| 面板 | 元素数 | 面板 rect |
|---|---|---|
| 一键签到 sign | 56 | 380×370 |
| 一键续牌 fans-continue | 57 | 380×370 |
| 扩展功能 extool | 154 | 380×370 |
| 直播间工具 livetool | 94 | 380×370 |
| 弹幕小助手 bloop | 63 | 380×370 |
| 全站抽奖 exlottery | 31 | 380×370 |
| 同屏播放 popup | 44 | 380×370 |
| 版本更新 exupdate | 35 | 380×370 |

## 第一份基线顺手验到的现场数字

| 观察 | 实测 | 意义 |
|---|---|---|
| Dock 胶囊 | **556 × 76**，8 枚磁贴 **56×56**，间距 **66px**，首枚 x=708 | 三枚主题图标要挤进右端弧形时的宽度预算基准 |
| 磁贴可访问性 | 8 枚 `role` / `tabindex` / `aria-label` **全部为 null** | B-1（唯一 P0）现场证据，不再靠静态推断 |
| 面板本体 | 8 个全部 **380×370** | 仓库红线的两个数值，现场确认 |
| 面板头高 | **51px**（`.miuix-modal__header` 378×51） | F-17「52 与 51 差 1px」现场证据 |
| 卡片 | `fans-panel__card` 350×**355.6**，body 只有 317 高 → 溢出走滚动 | 迁移时"卡片高度由内容决定"这条必须保留 |
| 标题与图标 | `.miuix-modal__title` 14px/21px/700；`.ex-title-ico` 19×19；`.ex-card-ico` 15×15 | 图标层从 9871bfa 起生效 |
| **第二份 wrap** | `.ex-panel__wrap > div` 命中 **16** 个 = 8 个真实（有尺寸）+ 8 个**全零尺寸** | **新发现**：DOM 里存在第二份 Dock 容器（浮动宿主那份）。之前的审计没写，S0.5 要一并体检 |

## 阈值（写在 `tools/ui-diff.mjs` 里，改阈值 = 改验收标准，必须评审）

| 类别 | 阈值 |
|---|---|
| 几何 | x/y/w/h 差 **≤1px** |
| 颜色 | 背景/文字每通道 **≤2/255**；alpha 差 >0.01 直接判失败（透明层 = 白底层数） |
| 字体 | `font-size/line-height/weight` **必须完全相等** |
| 顺序 | 兄弟元素路径序列必须一致（专治直播间工具那种 insertBefore 首子的写法） |

## 自我校验

`node tools/ui-diff.mjs baseline baseline` → 8 面板全 PASS、退出码 0（比对器自身没有假阳性）。

## 未入库说明

`.json`（326KB）与本文入库；**`.png`（15MB）不入库** —— 一条命令可复现，放进 git 只会撑大仓库（见 PLAN §7 R7）。
