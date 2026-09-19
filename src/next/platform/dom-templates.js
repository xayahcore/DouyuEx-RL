function* (__imports) {
yield {"Gr": { get: () => Gr, set: value => { Gr = value; } }};
/**
 * Postbird 轻量模态对话框与输入弹窗生成系统 (Alert / Confirm / Prompt)
 * 导出兼容接口: Gr
 */
const PostbirdBox = {
  containerClass: "postbird-box-container active",
  box: null,
  textTemplate: {
    title: "提示信息",
    content: "提示内容",
    okBtn: "好的",
    cancelBtn: "取消",
    contentColor: "#000000",
    okBtnColor: "#0e90d2",
    cancelBtnColor: "#666666",
    promptTitle: "请输入内容",
    promptOkBtn: "确认",
  },

  getAlertTemplate() {
    return `
      <div class="postbird-box-dialog">
        <div class="postbird-box-content">
          <div class="postbird-box-header">
            <span class="postbird-box-close-btn">×</span>
            <span class="postbird-box-title"><span>${this.textTemplate.title}</span></span>
          </div>
          <div class="postbird-box-text">
            <span style="color:${this.textTemplate.contentColor};">${this.textTemplate.content}</span>
          </div>
          <div class="postbird-box-footer">
            <button class="btn-footer btn-block-footer btn-footer-ok" style="color:${this.textTemplate.okBtnColor};">${this.textTemplate.okBtn}</button>
          </div>
        </div>
      </div>
    `;
  },

  getConfirmTemplate() {
    return `
      <div class="postbird-box-container">
        <div class="postbird-box-dialog">
          <div class="postbird-box-content">
            <div class="postbird-box-header">
              <span class="postbird-box-close-btn">×</span>
              <span class="postbird-box-title"><span>${this.textTemplate.title}</span></span>
            </div>
            <div class="postbird-box-text">
              <span style="color:${this.textTemplate.contentColor};">${this.textTemplate.content}?</span>
            </div>
            <div class="postbird-box-footer">
              <button class="btn-footer btn-left-footer btn-footer-cancel" style="color:${this.textTemplate.cancelBtnColor};">${this.textTemplate.cancelBtn}</button>
              <button class="btn-footer btn-right-footer btn-footer-ok" style="color:${this.textTemplate.okBtnColor};">${this.textTemplate.okBtn}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  getPromptTemplate() {
    return `
      <div class="postbird-box-container">
        <div class="postbird-box-dialog">
          <div class="postbird-box-content">
            <div class="postbird-box-header">
              <span class="postbird-box-close-btn">×</span>
              <span class="postbird-box-title"><span>${this.textTemplate.title}</span></span>
            </div>
            <div class="postbird-box-text">
              <input type="text" class="postbird-prompt-input" autofocus="true">
            </div>
            <div class="postbird-box-footer">
              <button class="btn-footer btn-left-footer btn-footer-cancel" style="color:${this.textTemplate.cancelBtnColor};">${this.textTemplate.cancelBtn}</button>
              <button class="btn-footer btn-right-footer btn-footer-ok" style="color:${this.textTemplate.okBtnColor};">${this.textTemplate.okBtn}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  alert(opts = {}) {
    this.textTemplate.title = opts.title || this.textTemplate.title;
    this.textTemplate.content = opts.content || this.textTemplate.content;
    this.textTemplate.okBtn = opts.okBtn || this.textTemplate.okBtn;
    this.textTemplate.okBtnColor = opts.okBtnColor || this.textTemplate.okBtnColor;
    this.textTemplate.contentColor = opts.contentColor || this.textTemplate.contentColor;

    const wrap = document.createElement("div");
    wrap.className = this.containerClass;
    wrap.innerHTML = this.getAlertTemplate();
    this.box = wrap;
    document.body.appendChild(this.box);

    const okBtns = document.getElementsByClassName("btn-footer-ok");
    const lastOk = okBtns[okBtns.length - 1];
    if (lastOk) {
      lastOk.focus();
      lastOk.onclick = () => {
        if (typeof opts.onConfirm === 'function') opts.onConfirm();
        this.removeBox();
      };
    }
  },

  confirm(opts = {}) {
    this.textTemplate.title = opts.title || this.textTemplate.promptTitle;
    this.textTemplate.okBtn = opts.okBtn || this.textTemplate.promptOkBtn;
    this.textTemplate.okBtnColor = opts.okBtnColor || this.textTemplate.okBtnColor;
    this.textTemplate.cancelBtn = opts.cancelBtn || this.textTemplate.cancelBtn;
    this.textTemplate.cancelBtnColor = opts.cancelBtnColor || this.textTemplate.cancelBtnColor;
    this.textTemplate.content = opts.content || this.textTemplate.content;

    const wrap = document.createElement("div");
    wrap.className = this.containerClass;
    wrap.innerHTML = this.getConfirmTemplate();
    this.box = wrap;
    document.body.appendChild(this.box);

    const okBtns = document.getElementsByClassName("btn-footer-ok");
    const lastOk = okBtns[okBtns.length - 1];
    if (lastOk) {
      lastOk.focus();
      lastOk.onclick = () => {
        if (typeof opts.onConfirm === 'function') opts.onConfirm();
        this.removeBox();
      };
    }

    const cancelBtns = document.getElementsByClassName("btn-footer-cancel");
    const lastCancel = cancelBtns[cancelBtns.length - 1];
    if (lastCancel) {
      lastCancel.onclick = () => {
        if (typeof opts.onCancel === 'function') opts.onCancel();
        this.removeBox();
      };
    }
  },

  prompt(opts = {}) {
    this.textTemplate.title = opts.title || this.textTemplate.title;
    this.textTemplate.content = opts.content || this.textTemplate.content;
    this.textTemplate.contentColor = opts.contentColor || this.textTemplate.contentColor;
    this.textTemplate.okBtn = opts.okBtn || this.textTemplate.okBtn;
    this.textTemplate.okBtnColor = opts.okBtnColor || this.textTemplate.okBtnColor;
    this.textTemplate.cancelBtn = opts.cancelBtn || this.textTemplate.cancelBtn;
    this.textTemplate.cancelBtnColor = opts.cancelBtnColor || this.textTemplate.cancelBtnColor;

    const wrap = document.createElement("div");
    wrap.className = this.containerClass;
    wrap.innerHTML = this.getPromptTemplate();
    this.box = wrap;
    document.body.appendChild(this.box);

    const inputElements = document.getElementsByClassName("postbird-prompt-input");
    const lastInput = inputElements[inputElements.length - 1];
    if (lastInput) {
      if (opts.defaultValue != null) {
        lastInput.value = opts.defaultValue;
      }
      lastInput.focus();

      const okBtns = document.getElementsByClassName("btn-footer-ok");
      const lastOk = okBtns[okBtns.length - 1];
      if (lastOk) {
        lastOk.onclick = () => {
          if (typeof opts.onConfirm === 'function') opts.onConfirm(lastInput.value);
          this.removeBox();
        };
      }

      const cancelBtns = document.getElementsByClassName("btn-footer-cancel");
      const lastCancel = cancelBtns[cancelBtns.length - 1];
      if (lastCancel) {
        lastCancel.onclick = () => {
          if (typeof opts.onCancel === 'function') opts.onCancel(lastInput.value);
          this.removeBox();
        };
      }
    }
  },

  colse() {
    this.removeBox();
  },

  removeBox() {
    const list = document.getElementsByClassName(this.containerClass);
    if (list.length > 0) {
      const lastEl = list[list.length - 1];
      if (lastEl.parentNode) {
        lastEl.parentNode.removeChild(lastEl);
      }
    }
  },
};

const Gr = PostbirdBox;

}
