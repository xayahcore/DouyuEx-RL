function* (__imports) {
yield {"Gr": { get: () => Gr, set: value => { Gr = value; } }};
var Gr = {
  containerClass: "postbird-box-container active",
  box: null,
  textTemplate: {
    title: "提示信息",
    content: "提示内容",
    okBtn: "好的",
    cancelBtn: "取消",
    contentColor: "#000000",
    okBtnColor: "#0e90d2",
    promptTitle: "请输入内容",
    promptOkBtn: "确认",
  },
  getAlertTemplate: function () {
    return (
      '<div class="postbird-box-dialog"><div class="postbird-box-content"><div class="postbird-box-header"><span class="postbird-box-close-btn">×</span><span class="postbird-box-title"><span >' +
      this.textTemplate.title +
      '</span></span></div><div class="postbird-box-text"><span style="color:' +
      this.textTemplate.contentColor +
      ';">' +
      this.textTemplate.content +
      '</span></div><div class="postbird-box-footer"><button class="btn-footer btn-block-footer btn-footer-ok" style="color:' +
      this.textTemplate.okBtnColor +
      ';">' +
      this.textTemplate.okBtn +
      "</button></div></div></div>"
    );
  },
  getConfirmTemplate: function () {
    return (
      '<div class="postbird-box-container"><div class="postbird-box-dialog"><div class="postbird-box-content"><div class="postbird-box-header"><span class="postbird-box-close-btn">×</span><span class="postbird-box-title"><span >' +
      this.textTemplate.title +
      '</span></span></div><div class="postbird-box-text"><span style="color:' +
      this.textTemplate.contentColor +
      ';">' +
      this.textTemplate.content +
      '?</span></div><div class="postbird-box-footer"><button class="btn-footer btn-left-footer btn-footer-cancel" style="color:' +
      this.textTemplate.cancelBtnColor +
      ';">' +
      this.textTemplate.cancelBtn +
      '</button><button class="btn-footer btn-right-footer btn-footer-ok"  style="color:' +
      this.textTemplate.okBtnColor +
      ';">' +
      this.textTemplate.okBtn +
      "</button></div></div></div></div>"
    );
  },
  getPromptTemplate: function () {
    return (
      '<div class="postbird-box-container"><div class="postbird-box-dialog"><div class="postbird-box-content"><div class="postbird-box-header"><span class="postbird-box-close-btn">×</span><span class="postbird-box-title"><span >' +
      this.textTemplate.title +
      '</span></span></div><div class="postbird-box-text"><input type="text" class="postbird-prompt-input" autofocus="true" ></div><div class="postbird-box-footer"><button class="btn-footer btn-left-footer btn-footer-cancel" style="color:' +
      this.textTemplate.cancelBtnColor +
      ';">' +
      this.textTemplate.cancelBtn +
      '</button><button class="btn-footer btn-right-footer btn-footer-ok"  style="color:' +
      this.textTemplate.okBtnColor +
      ';">' +
      this.textTemplate.okBtn +
      "</button></div></div></div></div>"
    );
  },
  alert: function (e) {
    ((this.textTemplate.title = e.title || this.textTemplate.title),
      (this.textTemplate.content = e.content || this.textTemplate.content),
      (this.textTemplate.okBtn = e.okBtn || this.textTemplate.okBtn),
      (this.textTemplate.okBtnColor =
        e.okBtnColor || this.textTemplate.okBtnColor),
      (this.textTemplate.contentColor =
        e.contentColor || this.textTemplate.contentColor));
    var t = document.createElement("div"),
      o = this;
    ((t.className = this.containerClass),
      (t.innerHTML = this.getAlertTemplate()),
      (this.box = t),
      document.body.appendChild(this.box),
      (t = document.getElementsByClassName("btn-footer-ok"))[
        t.length - 1
      ].focus(),
      (t[t.length - 1].onclick = function () {
        (e.onConfirm && e.onConfirm(), o.removeBox());
      }));
  },
  confirm: function (e) {
    ((this.textTemplate.title = e.title || this.textTemplate.promptTitle),
      (this.textTemplate.promptPlaceholder =
        e.promptPlaceholder || this.textTemplate.promptPlaceholder),
      (this.textTemplate.okBtn = e.okBtn || this.textTemplate.promptOkBtn),
      (this.textTemplate.okBtnColor =
        e.okBtnColor || this.textTemplate.okBtnColor),
      (this.textTemplate.cancelBtn =
        e.cancelBtn || this.textTemplate.cancelBtn),
      (this.textTemplate.cancelBtnColor =
        e.cancelBtnColor || this.textTemplate.cancelBtnColor),
      (this.textTemplate.content = e.content || this.textTemplate.content));
    var t = document.createElement("div"),
      o = this;
    (((this.box = t).className = this.containerClass),
      (t.innerHTML = this.getConfirmTemplate()),
      document.body.appendChild(t),
      (t = document.getElementsByClassName("btn-footer-ok"))[
        t.length - 1
      ].focus(),
      (t[t.length - 1].onclick = function () {
        (e.onConfirm && e.onConfirm(), o.removeBox());
      }),
      ((t = document.getElementsByClassName("btn-footer-cancel"))[
        t.length - 1
      ].onclick = function () {
        (e.onCancel && e.onCancel(), o.removeBox());
      }));
  },
  prompt: function (e) {
    ((this.textTemplate.title = e.title || this.textTemplate.title),
      (this.textTemplate.content = e.content || this.textTemplate.content),
      (this.textTemplate.contentColor =
        e.contentColor || this.textTemplate.contentColor),
      (this.textTemplate.okBtn = e.okBtn || this.textTemplate.okBtn),
      (this.textTemplate.okBtnColor =
        e.okBtnColor || this.textTemplate.okBtnColor),
      (this.textTemplate.cancelBtn =
        e.cancelBtn || this.textTemplate.cancelBtn),
      (this.textTemplate.cancelBtnColor =
        e.cancelBtnColor || this.textTemplate.cancelBtnColor));
    var t = document.createElement("div"),
      o = this;
    ((t.className = this.containerClass),
      (t.innerHTML = this.getPromptTemplate()),
      (this.box = t),
      document.body.appendChild(t));
    var n = (n = document.getElementsByClassName("postbird-prompt-input"))[
      n.length - 1
    ];
    (null != e.defaultValue && (n.value = e.defaultValue),
      n.focus(),
      (t = document.getElementsByClassName("btn-footer-ok")),
      n.value,
      t[t.length - 1].focus(),
      (t[t.length - 1].onclick = function () {
        (e.onConfirm && e.onConfirm(n.value), o.removeBox());
      }),
      ((t = document.getElementsByClassName("btn-footer-cancel"))[
        t.length - 1
      ].onclick = function () {
        (e.onCancel && e.onCancel(n.value), o.removeBox());
      }));
  },
  colse: function () {
    this.removeBox();
  },
  removeBox: function () {
    var e = document.getElementsByClassName(this.containerClass);
    document.body.removeChild(e[e.length - 1]);
  },
};

}
