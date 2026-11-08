/* 
    CClick
    单双击/长按不冲突的解决方案 
    By: 小淳

    调用方法:
    let a = new CClick(document.getElementById(""));
    a.click((e) => {// TODO});
    a.dbClick((e) => {// TODO});
    a.longClick((e) => {// TODO});

    2026-11-08：
    - 改用 addEventListener，不再覆盖 element.onmousedown / onmouseup（旧实现会把
      页面或其它包挂在上面的处理器顶掉）；
    - 没注册 dbClick 时，click 回调**同步**执行 —— 旧实现放在 setTimeout(0) 里，
      FollowList 回调里的 preventDefault() 对已经派发完的事件无效；
    - 只有真的注册了 dbClick 才等第二击（250ms），语义与原来一致；
    - 不管有没有 handler，onUp 都会清掉长按定时器，避免长按后单击漏执行。
*/
class CClick {
    constructor(element) {
        const CONST_LONG_TIME = 700;      // 长按多少ms执行
        const CONST_DOUBLE_TIME = 250;    // 注册了双击时，等待第二击的间隔
        this.func_click = null;
        this.func_dbClick = null;
        this.func_longClick = null;
        let isLong = false;
        let timer_long = null;
        let clickTimes = 0;
        let timer_db = null;

        element.addEventListener("mousedown", (event) => {
            if (event.button !== 0) {
                return;
            }
            isLong = false;
            timer_long = setTimeout(() => {
                isLong = true;
                if (this.func_longClick !== null) {
                    this.func_longClick(event);
                }
            }, CONST_LONG_TIME);
        });
        element.addEventListener("mouseup", (event) => {
            if (event.button !== 0) {
                return;
            }
            clearTimeout(timer_long);
            if (isLong) {
                isLong = false;
                return;
            }
            // 没有双击回调：同步执行，调用方才能 preventDefault
            if (this.func_dbClick === null) {
                if (this.func_click !== null) {
                    this.func_click(event);
                }
                return;
            }
            clickTimes++;
            if (clickTimes >= 2) {
                clearTimeout(timer_db);
                clickTimes = 0;
                this.func_dbClick(event);
                return;
            }
            timer_db = setTimeout(() => {
                clickTimes = 0;
                if (this.func_click !== null) {
                    this.func_click(event);
                }
            }, CONST_DOUBLE_TIME);
        });
    }
    click(callback) {
        this.func_click = callback;
    }
    dbClick(callback) {
        this.func_dbClick = callback;
    }
    longClick(callback) {
        this.func_longClick = callback;
    }
}
