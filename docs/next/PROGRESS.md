# 📊 DouyuEx-RL NEXT 工程实施进度档案 (PROGRESS.md)

## 1. 交付产物与核心指标
- **分支定位**: `DYEXRL-NEXT`（绝不合并至 `main`，严格分支隔离）
- **核心交付产物**: `artifacts/next/DouyuEx_RL_NEXT.user.js`
- **精确文件体积**: `900,636 字节` (`879.53 KB`)
- **官方 SHA-256 哈希**: `f77a561ffed156cb47810fc84a0fe24c588ae380d6ffa8b9e5e91abb52e4a4f0`
- **根目录主线产物**: `DouyuEx_RL.user.js`（严格保持零污染，构建互不干涉）

---

## 2. 冗余功能彻底清退 (历史夜间模式优雅退役)
响应用户反馈的“日间夜间模式斗鱼网页已经自带了，完全是冗余功能”，对历史死重进行了彻底清算与安全退役：
- **历史成因**：该功能系 2020 年斗鱼尚无官方暗黑模式时的历史产物。如今斗鱼全站已原生集成现代夜间模式，原插件内部的 CSS 样式早在此前就已被剥离为注释占位（`/* [DouyuEx-Lite] 夜间样式已剥离 */`），但原代码仍残留着 2.6 KB 的大 SVG 矢量图标、无效 LocalStorage 写入 (`ExSave_Mode`) 与无意义的 DOM 监听；
- **安全退役方案**：彻底移除 `services/preferences.js` 中无意义的大型 SVG 字符串与空样式注入，保留空安全函数（`Xo`, `Ko`, `$o`）与基础常量，既消除了历史死重，又保持下游契约 100% 守恒，完全避免了控制台报错；
- **体积瘦身**：单此一项即净削减约 2KB 源码死重。

---

## 3. 稳健渐进式重构实施台账 (已稳妥洗白 24 个核心模块，稳步推进)
依据 [docs/next/MIGRATION_TIERS_EVALUATION.md](docs/next/MIGRATION_TIERS_EVALUATION.md) 确立的工程体系，坚持“小步快跑、契约守恒、单改单测”，现已稳健完成 **24 个现代 ES6+ 强语义模块**（第一梯队 18 个 + 第二梯队 6 个）：
1. `src/next/services/version.js`：规范 Semver 比较算法与 `async/await fetch` 异步超时控制；
2. `src/next/services/pip/packet-dedup.js`：消灭单字母混淆参数，规范滑窗去重状态机；
3. `src/next/services/pip/persistence.js`：规范化 LocalStorage JSON 安全反序列化与双向落盘容错；
4. `src/next/services/pip/merge-rules.js`：提取字符集指纹纯函数 `getUniqueCharFingerprint`，规范相似弹幕连击归并键识别；
5. `src/next/services/pip/packet-parser.js`：规范化 STT `chatmsg` 原始协议反序列化器，结构化提取 `text`, `color`, `uid`, `msgId`；
6. `src/next/services/pip/packet-dispatch.js`：消灭单字母参数，清晰分流全量飘屏、单条模式与连击合并；
7. `src/next/services/pip/state.js`：结构化状态容器，添加字段注释与生命周期说明；
8. `src/next/services/pip/markup.js`：规范化画中画样式与骨架 HTML 模板生成；
9. `src/next/services/pip/window.js`：彻底消灭混淆单字母，规范 Chromium PiP 窗口生命周期；
10. `src/next/runtime/heartbeat.js`：规范 60 秒全局经验心跳调度，确保幂等启停；
11. `src/next/ui/room/last-live.js`：重写未开播卡片与人类友好相对时间计算器，规范 DOM 装配与淡出动画；
12. `src/next/ui/bindings.js`：规范化 `safeBind` / `safeEl` 全局安全事件绑定装甲；
13. `src/next/entry.js`：规范化总业务入口调度；
14. `src/next/services/video-timestamps.js`：重构录播视频时间戳换算与悬停预览标签；
15. `src/next/ui/panels/update.js`：现代重构版本更新三级控制台多态状态机；
16. `src/next/services/spending.js`：现代重构当月消费与鱼翅明细感知服务，结构化分页与账单归集；
17. `src/next/platform/cron.js`：现代 ES6+ 重塑 `DanmakuProxyWebSocketClient` 长连接客户端；
18. `src/next/platform/md5.js`：规范 RFC 1321 MD5 4-Round 变换与 NoticeJs 模态包装；
19. `src/next/services/fans.js`：现代重构粉丝牌与背包资产底层服务；
20. `src/next/ui/panels/fans.js`：现代重构 380×370px 一键续牌三级控制面板与执行流水线；
21. `src/next/services/preferences.js`：现代重构夜间模式与外观偏好设置，消除 TDZ 风险；
22. `src/next/services/batch-danmaku.js`：现代重构 STT 解包与封包纯工具函数（`el`, `ol`, `tl`, `U`）；
23. `src/next/ui/panel-header.js`：现代重构 3 级控制台吸顶 Header 与 Flex 布局；
24. `src/next/runtime/registry.js`：现代重构单例特性注册表与 Dock 逆向安全卸载器。

---

## 3. 架构拓扑与现代化改造清算
本项目彻底清算了早期 280KB 碎片化伪重构的失效代码，确立了基于 AST 模块化与 Generator 闭包访问器的稳定规范体系：

1. **AST 模块化解耦架构 (`src/next/`)**:
   - 全域业务拆分为 **76 个独立源码模块**，覆盖 `core`, `platform`, `runtime`, `services`, `ui` 五大垂直分层；
   - 依赖关系与导入导出由 `build/module-contracts.json` 强类型契约字典显式规范；
   - 通过 Generator 函数 (`function* (__imports)`) 实现两阶段延迟求值，完美保活跨模块动态绑定与变量提升特性。

2. **单例执行守卫与冲突防护**:
   - 注入自定义 DOM 事件驱动的单例声明协议 (`DYEXRL_NEXT_COMPAT_CLAIM`)；
   - 页面冷启动即刻探测，发现已有运行时或主线版本时自动优雅阻断，杜绝多实例争夺 DOM 与网络通道。

3. **存储命名空间物理隔离**:
   - 动态代理全局 `localStorage`，对所有插件私有键（`ExSave_*`, `Ex_*`, `freetimed`）统一自动添加 `DYEXRL_NEXT:` 前缀；
   - 对斗鱼官方播放器核心参数（`rateRecordTime_h5p_room`, `realRateModel2_h5p_room`, `player_storage_quality` 等）开放共享透传，确保原画秒开与画质记忆互通。

4. **房间就绪状态机与轮询熔断**:
   - 修复老旧代码在未开播或非直播房间中无限 `setInterval(1000)` 轮询导致 CPU 空转的问题；
   - 引入 `POLL_CEILING = 30` 阈值，30 秒未就绪自动熔断释放定时器。

5. **全站字母别名房间冷启动支持**:
   - Userscript 匹配规则升级为 `*://*.douyu.com/*`，全面解决老版只匹配数字房间号导致字母别名房间（如 `douyu.com/pigff`）无法注入的顽疾。

6. **Greasy Fork 官方发布合规性闭环**:
   - 彻底剥离被 Greasy Fork 封禁的 `npmmirror` CDN 源，全量替换为 `fastly.jsdelivr.net` 官方纯净源；
   - 单行字符严格控制在 5,000 字符安全限制之内，规避审查阻断；
   - 自动化审查工具 `tools/audit_release_compliance.js`（`npm run verify`）全量通过 7 大门禁。

---

## 3. UI 与功能真机核验结论 (Microsoft Edge)
在 Edge 浏览器实测验证环境下，本 890KB NEXT 产物表现如下：
- **精灵球主入口**: 100% 还原 108×108 经典多色红白精灵球 SVG，底栏财富栏首位物理对齐，悬停放大动画平滑；
- **二级 Dock 工具条**: 76px 晶透微胶囊形态、56×56px 单元格、24×4px 生机蓝磁吸指示器，9 大按钮顺序与间距完全复刻；
- **三级控制面板**: 8 大核心模态子面板（签到、续牌、扩展工具、直播间工具、弹幕小助手、全站抽奖、同屏播放器、版本更新）交互互斥与浮动定位正常；
- **业务功能全量保活**: 原画秒开锁定、STT 报文转义解析、背包资产读取、自动钓鱼、弹幕小尾巴、画中画均可正常运行。

---

## 4. 自动化测试与工程命令
- `npm run build:next`: 独立构建 NEXT 产物，自动进行 V8 语法与 SHA-256 校验；
- `npm test`: 自动化单元测试套件，全面覆盖构建确定性、零修改保护、产物哈希、V8 语法、元数据与 76 模块完整性；
- `npm run verify`: 7 大 Greasy Fork 发布合规性门禁审计；
- `npm run build`: 原版 legacy 独立构建。
