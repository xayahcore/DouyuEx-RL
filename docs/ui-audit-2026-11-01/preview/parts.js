/* ==========================================================================
   parts.js —— 六个对照行的 DOM 来源
   --------------------------------------------------------------------------
   前 5 行**直接读取队友从真机导出的 outerHTML**（docs/ui-audit-2026-11-01/live/dom/），
   不做任何重写；before / after 两列注入的是同一份字符串，
   差别只有父节点的 .after 类与 after.css —— 这样「改了什么」不可能被手抄误差污染。
     01-dock.html      → 二级 Dock 胶囊（9 个磁贴 + 精灵球外的那层 .ex-panel）
     04-extool.html    → 扩展功能（标题 + 副标题双行密度最高）
     10-exupdate.html  → 版本更新（长文本流；粘底按钮是用户刻意设计，本提案不动）
     05-livetool.html  → 直播间工具（单行 + 双药丸按钮）
     07-sign.html      → 一键签到（选项列表 + 状态卡 + 粘底按钮，同上）
   第 6 行「控件台」真机上没有对应产物（开关/按钮散在各面板里），
   所以只有这一行是照源码结构拼的，逐条注明出处。
   ========================================================================== */

const REAL_BASE = "../live/dom/";

export const ROWS = [
  {
    id: "dock",
    file: "01-dock.html",
    title: "二级 Dock 胶囊",
    note: "真机 outerHTML 原样注入；第 3 位「扩展功能」标为选中态、第 7 位「同屏播放」标为悬停态（悬停值逐条镜像 ExPanel.css:140-145）"
  },
  {
    id: "extool",
    file: "04-extool.html",
    title: "三级面板 · 扩展功能",
    note: "标题 14px + 副标题 10.5px 双行密度最高的一块；内容超出 317px 即滚动"
  },
  {
    id: "update",
    file: "10-exupdate.html",
    title: "三级面板 · 版本更新",
    note: "长文本流：粘底「检查更新」常驻面板底部、日志从其后面滚过 —— 设计如此（用户 2026-11-01 确认），本提案不动"
  },
  {
    id: "livetool",
    file: "05-livetool.html",
    title: "三级面板 · 直播间工具",
    note: "单行标题 + 双药丸按钮 + 右侧开关；开关关闭态是本轮对比的重点"
  },
  {
    id: "sign",
    file: "07-sign.html",
    title: "三级面板 · 一键签到",
    note: "选项行 checkbox 在左、文案在右，与扩展功能（文案左 / 开关右）结构不同，同一套 CSS 要同时成立"
  },
  {
    id: "controls",
    file: null,
    title: "全局控件台",
    note: "真机无对应产物：结构照 ExPanel.css 第 7 / 7.5 / 8 / 3 节拼装，用于演示开关两态、分段胶囊、主按钮、焦点环与命中区"
  }
];

export async function loadPanels() {
  const files = ROWS.map((row) => row.file).filter(Boolean);
  const result = new Map();
  await Promise.all(files.map(async (file) => {
    const response = await fetch(REAL_BASE + file, { cache: "no-store" });
    if (!response.ok) throw new Error("读取真机 DOM 失败: " + file + " HTTP " + response.status);
    result.set(file, (await response.text()).trim());
  }));
  return result;
}

/* ==========================================================================
   第 6 行：控件台（唯一手写的一行）
   出处：
     开关      ExPanel.css:719-781  .sign-checkbox
     分段      ExPanel.css:789-867  .miuix-seg / .miuix-seg__label
     主按钮    ExPanel.css:883-926  .ex-btn-primary（height:38px）
     关闭按钮  ExPanel.css:314-346  .miuix-modal__close（26×26）
     卡片/行    ExPanel.css:405-421 / 668-714
   ========================================================================== */
export function controlsHTML() {
  const icon = (name) =>
    typeof globalThis.ExIcoSvg === "function" ? '<span class="ex-card-ico">' + globalThis.ExIcoSvg(name) + "</span>" : "";

  return (
    '<div class="fans-panel__card" style="margin-top: 4px;">' +
      '<div class="fans-panel__card-header">' +
        '<span class="fans-panel__card-title">' + icon("sliders") + "控件台</span>" +
        '<span style="font-size: 11px; color: #64748b;">开关 / 分段 / 按钮 / 焦点 / 命中区</span>' +
      "</div>" +
      '<div class="sign-options-list">' +

        '<div class="sign-option-item">' +
          '<div class="sign-option-text">' +
            '<span class="sign-option-title">开关 · 关闭态</span>' +
            '<span class="sign-option-desc">轨道 rgba(0,0,0,.14) → 填充 #828d9f + 1px #475569 描边</span>' +
          "</div>" +
          '<input class="sign-checkbox" type="checkbox">' +
        "</div>" +

        '<div class="sign-option-item">' +
          '<div class="sign-option-text">' +
            '<span class="sign-option-title">开关 · 开启态</span>' +
            '<span class="sign-option-desc">保持 #0066ff，本轮不动</span>' +
          "</div>" +
          '<input class="sign-checkbox" type="checkbox" checked>' +
        "</div>" +

        '<div class="sign-option-item" style="flex-direction: column; align-items: stretch; gap: 8px;">' +
          '<span class="sign-option-title">分段胶囊 · 选中态</span>' +
          '<div class="miuix-seg">' +
            '<label class="miuix-seg__item"><input name="demo_seg" type="radio" value="a" checked><span class="miuix-seg__label">全天挂机</span></label>' +
            '<label class="miuix-seg__item"><input name="demo_seg" type="radio" value="b"><span class="miuix-seg__label">仅钓鱼大赛</span></label>' +
          "</div>" +
        "</div>" +

        '<div class="sign-option-item" style="align-items: center; gap: 8px;">' +
          '<span class="sign-option-title" style="flex: 1 1 auto;">主按钮 · 38px</span>' +
          '<button type="button" class="ex-btn-primary" style="width: 104px;">开始签到</button>' +
        "</div>" +

        '<div class="sign-option-item" style="align-items: center; gap: 8px;">' +
          '<span class="sign-option-title" style="flex: 1 1 auto;">关闭按钮 · 视觉 26px / 命中区 44px</span>' +
          '<button type="button" class="miuix-modal__close" title="关闭面板" aria-label="关闭">×</button>' +
        "</div>" +

        /* 焦点环演示放在真正被 outline:none 抹掉环的两种控件上（ExPanel.css:731 / :898） */
        '<div class="sign-option-item" style="align-items: center; gap: 8px;">' +
          '<span class="sign-option-title" style="flex: 1 1 auto;">键盘焦点环（Tab 到）</span>' +
          '<input class="sign-checkbox is-demo-focus" type="checkbox" checked>' +
          '<button type="button" class="ex-btn-primary is-demo-focus" style="width: 84px;">签到</button>' +
        "</div>" +

      "</div>" +
    "</div>"
  );
}
