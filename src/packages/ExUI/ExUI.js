/* ==========================================================================
   ExUI —— 三级面板统一组件构造器（S1-A · 2026-11-01 重做版）
   --------------------------------------------------------------------------
   作用：八个面板的 DOM 不再各写各的模板字符串，统一从这里产出。
   契约（S1 阶段硬约束）：
   1) **只产 DOM，不含任何颜色/尺寸字面量**；本阶段也不新增任何 .ui-* CSS 规则
      —— 样式一律由「类名影子」交给旧类名（fans-panel__card / sign-option-item …），
      所以迁移后的观感必须与原结构逐像素一致（C1 铁律）。
   2) 所有入参判空 + 兜底（AGENTS.md：DOM 必须安全判空）。
   3) 需要保留原有控件（input/checkbox/按钮）时，用 lead/trail 原样传入。
   4) legacy（类名影子）：把旧类名挂到对应节点上，让旧 CSS 继续命中；
      旧类名**只在本文件出现**，其它包源码里不再出现 → ui-legacy-guard 计数可归零。

   注意：本组件与既有的 ExUI_stickActionBar 无任何关系（名字相近纯属历史）。
   ========================================================================== */

var ExUI = (function () {
    /* ===== 旧类名清单（S3 收口：仓库里只有这一处出现旧类名字面量） =====
       面板通过 ExUI.lg("名字", {覆盖项}) 取用；新增面板只在这里加一行。 */
    var LEGACY_SETS = {};   /* 2026-11-01：组件层重写完成，影子类名退场 */
    var LEGACY_SINGLE = {
        /* 2026-11-01：卡片/行已统一到 .ui-card/.ui-row；这里只保留「尚未有对应组件」的单值类名 */
        actionWrap: "fans-panel__action-wrap",
    };

    /** 取一组旧类名（可覆盖个别字段）：ExUI.lg("card", { body: "…" }) */
    function lg(name, extra) {
        var base = LEGACY_SETS[name];
        if (!base) return extra || {};
        var out = {};
        for (var k in base) out[k] = base[k];
        if (extra) for (var j in extra) out[j] = extra[j];
        return out;
    }

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    /** 把影子类名拼到基础类名后面；legacy 可为字符串（空格分隔）或空 */
    function withLegacy(base, legacy) {
        var l = legacy == null ? "" : String(legacy).trim();
        return l ? base + " " + l : base;
    }

    /**
     * 卡片：一个分组。
     * @param {object} o {title, aside, asideHtml, body, bodyId, cls,
     *                    legacy:{card, head, title, aside, body}}
     * aside 走转义；需要放控件（状态标签等）用 asideHtml 原样注入。
     */
    function card(o) {
        o = o || {};
        var lg = o.legacy || {};
        var head = "";
        if (o.title || o.aside || o.asideHtml) {
            head =
                '<div class="' + withLegacy("ui-card__head", lg.head) + '">' +
                    '<span class="' + withLegacy("ui-card__title", lg.title) + '">' + esc(o.title) + "</span>" +
                    (lg.aside
                        ? '<span class="' + withLegacy("ui-card__aside", lg.aside) + '">' + (o.asideHtml || esc(o.aside)) + "</span>"
                        : (o.asideHtml ? o.asideHtml : (o.aside ? '<span class="' + withLegacy("ui-card__aside", "") + '">' + esc(o.aside) + "</span>" : ""))) +
                "</div>";
        }
        return (
            '<section class="' + withLegacy("ui-card", lg.card) + (o.cls ? " " + o.cls : "") + '">' +
                head +
                ((lg.body || o.bodyId)
                    ? '<div class="' + withLegacy("ui-card__body", lg.body) + '"' +
                        (o.bodyId ? ' id="' + esc(o.bodyId) + '"' : "") + ">" + (o.body || "") + "</div>"
                    : (o.body || "")) +
            "</section>"
        );
    }

    /**
     * 行：一条设置项 = 一块白片。
     * @param {object} o {title, desc, lead, trail, cls,
     *                    legacy:{row, text, title, desc}}
     * lead 放行首控件（签到那种左侧 checkbox），trail 放行尾控件（开关）。
     */
    function row(o) {
        o = o || {};
        var lg = o.legacy || {};
        return (
            '<label class="' + withLegacy("ui-row", lg.row) + (o.lead ? " ui-row--lead" : "") + (o.cls ? " " + o.cls : "") + '">' +
                (o.lead || "") +
                '<div class="' + withLegacy("ui-row__text", lg.text) + '">' +
                    '<span class="' + withLegacy("ui-row__title", lg.title) + '">' + esc(o.title) + "</span>" +
                    (o.desc ? '<span class="' + withLegacy("ui-row__desc", lg.desc) + '">' + esc(o.desc) + "</span>" : "") +
                "</div>" +
                (o.trail || "") +
            "</label>"
        );
    }

    /** 正文块（长文本） */
    function prose(html, cls) {
        return '<div class="ui-prose' + (cls ? " " + cls : "") + '">' + (html || "") + "</div>";
    }

    /** 空状态 */
    function empty(text, cls) {
        return '<div class="ui-empty' + (cls ? " " + cls : "") + '">' + esc(text || "暂无数据") + "</div>";
    }

    /** 按钮四档（accent = 蓝底白字药丸，对应 D3「蓝只能自带底」） */
    function btn(text, o) {
        o = o || {};
        var v = (o.variant === "primary" || o.variant === "danger" || o.variant === "accent") ? o.variant : "quiet";
        var cls = withLegacy("ui-btn ui-btn--" + v, o.legacy) + (o.cls ? " " + o.cls : "");
        return '<button type="button" class="' + cls + '"' +
            (o.id ? ' id="' + esc(o.id) + '"' : "") +
            (o.disabled ? " disabled" : "") +
            ">" + esc(text) + "</button>";
    }

    /**
     * 字段行：一行输入。control 原样传入（保住 id / 绑定）。
     * @param {object} o {label, hint, control, cls, legacy:{wrap, label, control, hint}}
     */
    function field(o) {
        o = o || {};
        var lg = o.legacy || {};
        return (
            '<label class="' + withLegacy("ui-field", lg.wrap) + (o.cls ? " " + o.cls : "") + '">' +
                (o.label ? '<span class="' + withLegacy("ui-field__label", lg.label) + '">' + esc(o.label) + "</span>" : "") +
                '<span class="' + withLegacy("ui-field__control", lg.control) + '">' + (o.control || "") + "</span>" +
                (o.hint ? '<span class="' + withLegacy("ui-field__hint", lg.hint) + '">' + esc(o.hint) + "</span>" : "") +
            "</label>"
        );
    }

    /**
     * 分段胶囊（互斥单选）。items: [{value, label, id, checked, disabled}]
     * 结构与 .miuix-seg 一致：label > input + span（相邻兄弟选择器判选中）。
     */
    function seg(o) {
        o = o || {};
        var lg = o.legacy || {};
        var items = Array.isArray(o.items) ? o.items : [];
        var name = o.name ? esc(o.name) : "";
        var html = items.map(function (it, i) {
            it = it || {};
            var id = it.id ? esc(it.id) : (name ? name + "_" + i : "");
            return (
                '<label class="' + withLegacy("ui-seg__item", lg.item) + '">' +
                    '<input type="radio"' +
                        (name ? ' name="' + name + '"' : "") +
                        (id ? ' id="' + id + '"' : "") +
                        ' value="' + esc(it.value == null ? "" : it.value) + '"' +
                        (it.checked ? " checked" : "") +
                        (it.disabled ? " disabled" : "") +
                    ">" +
                    '<span class="' + withLegacy("ui-seg__label", lg.label) + '">' + esc(it.label) + "</span>" +
                "</label>"
            );
        }).join("");
        return '<div class="' + withLegacy("ui-seg", lg.wrap) + (o.cls ? " " + o.cls : "") + '">' + html + "</div>";
    }

    /** 统计格：value 在上、label 在下（续牌资产那种） */
    function stat(o) {
        o = o || {};
        var lg = o.legacy || {};
        return (
            '<div class="' + withLegacy("ui-stat", lg.wrap) + (o.cls ? " " + o.cls : "") + '">' +
                '<span class="' + withLegacy("ui-stat__value", lg.value) + '">' + esc(o.value == null ? "--" : o.value) + "</span>" +
                '<span class="' + withLegacy("ui-stat__label", lg.label) + '">' + esc(o.label) + "</span>" +
            "</div>"
        );
    }

    /**
     * 操作条 / 通用堆叠容器：把一段 html 包进一个容器（保持原有的 padding/margin 归属）。
     * @param {object} o {html, cls, legacy}
     */
    function stack(o) {
        o = o || {};
        return '<div class="' + withLegacy("ui-stack", o.legacy) + (o.cls ? " " + o.cls : "") + '">' + (o.html || "") + "</div>";
    }

    /** 字符串 → 节点（要挂进已有容器时用） */
    function node(html) {
        var tpl = document.createElement("template");
        tpl.innerHTML = String(html || "").trim();
        return tpl.content.firstElementChild;
    }

    /** 把一段 html 里的多个顶层节点全部取出（表格/列表用） */
    function nodes(html) {
        var tpl = document.createElement("template");
        tpl.innerHTML = String(html || "").trim();
        return Array.prototype.slice.call(tpl.content.children);
    }

    return {
        card: card,
        row: row,
        prose: prose,
        empty: empty,
        btn: btn,
        field: field,
        seg: seg,
        stat: stat,
        stack: stack,
        node: node,
        nodes: nodes,
        lg: lg,
        LG: LEGACY_SINGLE,
        esc: esc
    };
})();

// 沙箱/服务端渲染里没有 window（单测会直接拼源码），判空后再挂
if (typeof window !== "undefined") window.ExUI = ExUI;
