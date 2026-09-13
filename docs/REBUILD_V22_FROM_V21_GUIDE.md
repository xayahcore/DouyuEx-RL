# DouyuEx-RL 从 v2026.09.13.21 优雅重构 v2026.09.13.22 核心指南

> 本指南用于指导如何基于 GitHub 仓库线上纯净基准（`v2026.09.13.21`，commit `5dd7505`）进行精准、轻量、高纯度的重构，提取今晚经过数轮真实实测验证通过的**黄金工程资产**，彻底剔除在调试和试错过程中产生的 **1300+ 行重复覆盖与样式屎山**，重构生成一份架构纯粹、零死重的生产级 `v2026.09.13.22`。

---

## 一、 基准对比与架构复盘（为什么要洗掉屎山？）

在今晚解决“2级胶囊条雪崩”、“三级菜单无法唤醒”、“关闭按钮失效”、“卡片右侧超出”、“开关仅剩圆点”等问题的探索过程中，为了以最快速度验证效果，在 `04_styles.js` 底部进行了多轮追加与 `!important` 覆盖，导致样式文件从 `.21` 版本的 **704 行暴涨至 2042 行（膨胀近 200%）**。

| 模块文件 | .21 官方基线状态 | .22 调试现状 | 问题与屎山诊断 | 重构目标 |
| :--- | :--- | :--- | :--- | :--- |
| `src/meta.js` | `@version 2026.09.13.21` | 改为 `.22` | 纯净 | 步进至 `2026.09.13.22` |
| `src/core/quality.js` | 纯上下文原生拦截系统 | 存在反复修改痕迹 | 需保持主线纯血拦截，配合双向注入 | 维持主线原生拦截，杜绝 DOM 模拟点击 |
| `src/modules/01_setup.js` | 包含 `rateRecordTime` 覆写 | 修复覆写并曾误加定时器 | 调试中曾误塞入导致二次切流的定时器 | 彻底保持纯净，移除任何模拟点击，仅保护存储 |
| `src/modules/02_dom_ui.js` | 存在 94 处高危裸露监听 | 注入了大量 DOM 结构与修补 | 有多次重复赋值、局部内联修改 | **标准化封装 4 大黄金 DOM 资产**，结构规整 |
| `src/modules/04_styles.js` | **704 行**（原始紧凑样式） | **2042 行**（膨胀 1338 行） | 存在深色/灰度废弃主题、重复覆盖规则、选择器冲突 | **彻底重写精简**，提炼为统一纯正的 MIUIX 样式，体积压缩 50% |
| `src/modules/05_services.js` | `var P = "2026.09.13.20";` | 已同步为 `.22` | 内部版本号硬编码偏差 | 统一同步锁定为 `2026.09.13.22` |

---

## 二、 黄金核心资产清单（必须保留的核心功能）

在重构 `.22` 时，以下 9 大项是今晚经历真实环境严苛检验、必须 100% 保留的**真正有效资产**：

### 1. Level 2 Dock 声明式装配系统（`DOCK_DEFS` 9+1 绝对保活）
- **位置**：`src/modules/02_dom_ui.js`
- **机制**：在 `ex-panel__wrap` 创建的第一毫秒，纯静态声明式装配全套 **9 大核心功能图标 + 1 个收起按钮**：
  1. 一键签到 (`ex-sign`)
  2. 一键续牌子 (`fans-continue`)
  3. 扩展功能 (`extool-icon`)
  4. 直播间工具 (`livetool-icon`)
  5. 弹幕发送小助手 (`bloop-icon`)
  6. 全站抽奖 (`ex-lottery`)
  7. 同屏播放 (`popup-player`)
  8. **在线弹幕助手 (`ex-monitor`)**（严格排在同屏播放与更新之间）
  9. 检查更新 (`ex-update`)
  10. 收起按钮 (`ex-panel__close`)
- **价值**：切断原版在异步网络与深层业务深处“偷偷 insertBefore”的脆弱混生逻辑，杜绝单线程雪崩。

### 2. 全局安全事件装甲（`safeBind`）
- **位置**：`src/modules/02_dom_ui.js`
- **机制**：拦截并包装所有 DOM 事件监听，目标不存在时静默保护，彻底防御由于抽奖刷新按钮、弹幕尾巴未选单选框等引发的 `TypeError: Cannot read properties of null` 猝死连锁。

### 3. Level 3 模态控制台吸顶 Header（`ensureMiuixPanelHeader`）
- **位置**：`src/modules/02_dom_ui.js`
- **机制**：
  - 顶部吸顶 `position: sticky; top: 0;`；
  - 纯正的 MIUIX 晶透半透明覆盖化（`rgba(255, 255, 255, 0.45)` + `backdrop-filter: blur(28px)`）；
  - 左右严密对称贴合（无负 margin 导致的滚动条挤压不对称）；
  - 物理剔除多余的 `RL Pro` 徽标；
  - 右上角搭载大号清晰 **`×`** 关闭按钮，并注入高优先级关闭逻辑：
    ```javascript
    closeBtn.onclick = function(e) {
        e.stopPropagation();
        el.style.removeProperty("display");
        el.style.setProperty("display", "none", "important");
    };
    ```

### 4. Level 3 控制台面板统一高度（370px 齐平）
- **位置**：`src/modules/04_styles.js`
- **机制**：
  统一对 `.miuix-modal, .extool, .livetool, .bloop, .exlottery` 注入三维铁壁：
  ```css
  height: 370px !important;
  min-height: 370px !important;
  max-height: 370px !important;
  ```
  彻底覆写原版旧 CSS 中写死的 `200px`（弹幕助手）、`250px`（抽奖）、`290px`（直播工具），四大三级菜单展开后高度完全齐平。

### 5. 卡片合理宽度收敛（左右严格留白 12px）
- **位置**：`src/modules/04_styles.js`
- **机制**：
  所有卡片（包括扩展功能的各个项、直播间工具的 `.livetool__cell`、弹幕小助手各个块）统一绑定：
  ```css
  width: auto !important;
  max-width: none !important;
  margin-left: 12px !important;
  margin-right: 12px !important;
  margin-bottom: 10px !important;
  box-sizing: border-box !important;
  ```
  彻底消除 `width: 100%` + `margin-left/right: 14px` 导致的 `100% + 28px` 盒模型向右溢出超范围。

### 6. 弹幕小助手首行单行合并小卡片
- **位置**：`src/modules/02_dom_ui.js` & `src/modules/04_styles.js`
- **机制**：将“弹幕：”标签、下拉框、保存、删除合并收纳在 `.bloop__header_card`，单行不换行，下拉框 `flex: 1 1 auto; min-width: 70px; max-width: 140px;` 弹性自适应缩放。

### 7. 直播间工具开关底色重铸与右对齐
- **位置**：`src/modules/04_styles.js`
- **机制**：
  - 容器右对齐：`.livetool__cell_option { margin-left: auto !important; }`，所有开关死死钉在最右侧同一垂直基准线上；
  - 彻底拔除 `.onoffswitch` 内部 checkbox 伪元素打架产生的鬼影圆点；
  - 跑道底座（`.onoffswitch-label`）参数全面向扩展功能开关看齐：宽 38px，高 22px，关态深冷灰底色 `rgba(0, 0, 0, 0.14)`，开态小米澎湃蓝 `#0066FF`，滑块向右平移 16px，带水滴微拉伸。

### 8. ［播放与性能］大类 2×2 网格卡片
- **位置**：`src/modules/02_dom_ui.js`
- **机制**：聚合“自动最高画质、自动网页全屏、阻止p2p上传、防页签冻结”，无 Emoji，沉稳极简，排布在【送礼】正上方。

### 9. 最高画质主线源头拦截系统
- **位置**：`src/core/quality.js`
- **机制**：严格保留 `xayahcore/DouyuEx-RL` 主线架构，利用主上下文原生发包拦截与 `getLegacyFirstStream` 首流注入，彻底杜绝任何 DOM 延迟模拟点击。

---

## 三、 必须彻底剔除的垃圾与屎山清单（严禁带入 v22）

在重构生产级代码时，必须坚决删掉以下在试错过程中引入的冗余：

1. **废弃的样式探索代码**：
   - 全深色黑透微胶囊 CSS 段落（已被用户否决“太黑”）；
   - Linear 极简明亮纯白高光段落（已被用户否决“太白晃眼”）；
   - 钛空冷灰、磨砂暖玉等过渡调色段落；
   - Bento 格子横向翻页样式碎片。
2. **导致进入直播自动弹开扩展功能的恶性规则**：
   - 严禁出现带有逗号泛化的 `.extool, .extool[style*="display: block"] { display: block !important; }`！必须保持 `.extool` 默认静默为 `display: none;`。
3. **原版残留的 Flex 宽度死重**：
   - 彻底清除原版 `.extool[style*="display: block"] { display: flex !important; }`（会导致卡片被按内容收缩、无法对齐）；
   - 彻底清除 `.extool__sendgift { flex: 1 1 720px; }`、`.extool__autofish { flex: 1 1 520px; }` 等历史死重。
4. **导致开关仅剩圆点的样式打架**：
   - 严禁让全局 `input[type="checkbox"]` 的伪元素影响 `.onoffswitch`。
5. **导致画质二次切流的倒退代码**：
   - 严禁重新引入任何对 `[class^="tipItem-"]:has([value^="画质"])` 进行 `setInterval` 轮询并 `e.click()` 的模拟点击代码。

---

## 四、 模块化执行落地步骤（Step-by-Step 操作指南）

### Step 1: 元数据与版本号步进 (`src/meta.js`)
将版本号统一步进至 `2026.09.13.22`：
```javascript
// @version      2026.09.13.22
```

### Step 2: 业务层版本变量对齐 (`src/modules/05_services.js`)
搜索并确保内部变量 `P` 与元数据严格一致：
```javascript
var P = "2026.09.13.22";
```
同时在 `ee(t)` 函数中，使用带 `important` 优先级的显隐切换：
```javascript
panel.style.removeProperty("display");
panel.style.setProperty("display", isHidden ? "block" : "none", "important");
```

### Step 3: DOM UI 结构纯进化重构 (`src/modules/02_dom_ui.js`)
在纯净的 `.21` 代码基础上，做且仅做以下干净替换：
1. **注入全局安全装甲与安全元素获取器**：
   ```javascript
   function safeBind(target, ev, fn) {
       try {
           var el = (typeof target === "string") ? document.querySelector(target) : target;
           if (el && typeof el.addEventListener === "function") {
               el.addEventListener(ev, fn);
               return true;
           }
       } catch(err){}
       return false;
   }
   function safeEl(id) { return document.getElementById(id) || {}; }
   ```
2. **在 `initDockFull` 中挂载 `DOCK_DEFS` 9+1 静态全家福**（把在线弹幕助手排在同屏播放与检查更新之间），并为每个 DOM 直接绑定内联 `onclick` 与 `wrap` 委托；
3. **注入 `ensureMiuixPanelHeader`**：
   - 生成大号 `×` 关闭按钮；
   - 绑定高优先级关闭事件：
     ```javascript
     closeBtn.onclick = function(e) {
         e.stopPropagation();
         el.style.removeProperty("display");
         el.style.setProperty("display", "none", "important");
     };
     ```
4. **弹幕小助手 HTML 替换为单行紧凑卡片**（`.bloop__header_card`）；
5. **在送礼卡片正上方注入［播放与性能］2×2 网格卡片**。

### Step 4: 样式层大洗牌与重写 (`src/modules/04_styles.js`)
这是本次重构瘦身最核心的战场！
将多余追加的 1300 行覆盖代码全数移除，在原始 `.21` 的尾部只保留一套**精炼、高聚合、无冲突的 MIUIX 终极样式规范块（约 200 行以内）**：
- **设计令牌**：统一使用 `--miuix-blue: #0066FF;`、Apple VisionOS 冰晶质感底色；
- **2 级胶囊 Dock**：高度 `54px`，圆角 `27px`，按钮底座 `42×42px`，SVG `28×28px`，子元素 `flex-shrink: 0`；
- **3 级面板容器**：统一锁定 `height / min-height / max-height: 370px !important;`，顶部 padding 归零，默认静默隐藏；
- **3 级吸顶 Header**：`position: sticky; top: 0; width: 100%; margin: 0 0 12px 0; padding: 10px 16px; background: rgba(255, 255, 255, 0.45);`，左右严密对称；
- **大号 × 关闭按钮**：`width: 26px; height: 26px; border-radius: 8px; font-size: 18px;`，悬停变红底白字带旋转；
- **所有卡片宽度收纳**：`width: auto !important; margin: 0 12px 10px 12px !important;`；
- **弹幕小助手单行卡片**：`.bloop__header_card` 不折行弹性收缩；
- **直播间工具开关与对齐**：右侧 `margin-left: auto !important;`，跑道尺寸 `38×22px`，关态深冷灰底色，开态生机蓝，位移 16px。

---

## 五、 本地参考镜像与全量比对源

为了方便随时比对两代代码，当前工程下已建立完整的官方纯净比对源：
1. **GitHub .21 官方纯净基准目录**：
   - 路径：`D:\DouyuEx-RL\ref_v21\`
   - 包含了从 `origin/main` 检出的全部原始模块文件。
2. **完整差异原始比对包**：
   - 路径：`D:\DouyuEx-RL\diff_v21_vs_v22.txt`
   - 记录了本次所有修改的逐行 diff。
3. **桌面端说明书镜像**：
   - 路径：`C:\Users\10276\Desktop\DouYuEx-RL\DouyuEx_RL_从v21重构v22核心工程指南.md`
