const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const source = fs.readFileSync(path.join(__dirname, "../src/packages/ExpandTool/ExpandTool_AutoBarrageColor.js"), "utf8");

function environment(options = {}) {
    const prefix = options.match ? "MatchSystemFansBarrage" : "FansBarrage";
    const dom = new JSDOM(`<!doctype html><body><input type="checkbox" id="extool__autobarragecolor" checked>
        <div class="ChatFansBarrage"><button class="${prefix}Switcher is-active"></button></div>
        <div id="unrelated" class="AssembleExpressHeader"><button class="AssembleExpressHeader-close"></button></div></body>`, { url: "https://www.douyu.com/1001" });
    const { document } = dom.window;
    const activeObservers = new Set();
    const NativeObserver = dom.window.MutationObserver;
    dom.window.MutationObserver = class extends NativeObserver {
        observe(...args) { activeObservers.add(this); return super.observe(...args); }
        disconnect() { activeObservers.delete(this); return super.disconnect(); }
    };
    const container = document.querySelector(".ChatFansBarrage");
    const switcher = container.querySelector("button");
    const intervals = new Map();
    const counts = { opened: 0, closed: 0, selected: 0 };
    let sequence = 0;
    function panel() { return container.querySelector(".AssembleExpressHeader"); }
    function addItems(target = panel()) {
        target.querySelector("ul").innerHTML = `<li class="${prefix}Color-item ${options.allLocked ? "is-lock" : ""}" data-level="low"></li>
            <li class="${prefix}Color-item ${options.allLocked ? "is-lock" : ""} ${options.alreadySelected ? "is-selected" : ""}" data-level="high"></li>
            <li class="${prefix}Color-item is-lock" data-level="locked"></li>`;
        for (const item of target.querySelectorAll("li")) item.addEventListener("click", () => { counts.selected++; item.classList.add("is-selected"); });
    }
    function open() {
        if (panel()) return panel();
        const element = document.createElement("div");
        element.className = "AssembleExpressHeader";
        element.innerHTML = `<div class="AssembleExpressHeader-head">粉丝专属弹幕<button class="AssembleExpressHeader-close"></button></div>
            <div class="ChatFansBarragePop"><ul class="${prefix}Color"></ul></div>`;
        container.appendChild(element);
        counts.opened++;
        element.querySelector(".AssembleExpressHeader-close").addEventListener("click", () => { counts.closed++; element.remove(); });
        if (!options.delayedItems) addItems(element);
        return element;
    }
    switcher.addEventListener("click", () => { if (panel()) { panel().remove(); counts.closed++; } else open(); });
    if (options.preopened) open();
    const api = new Function("window", "document", "localStorage", "setInterval", "clearInterval", "ExGuard_warn", source + `
        return { run: selectHighestUnlockedBarrageColor, bind: ExpandTool_AutoBarrageColor_insertFunc,
            init: initPkg_ExpandTool_AutoBarrageColor, timer: () => exAutoBarrageColorTimer };`)(
        dom.window, document, dom.window.localStorage,
        fn => { intervals.set(++sequence, fn); return sequence; }, id => intervals.delete(id), () => {}
    );
    return { dom, document, container, switcher, panel, open, addItems, api, intervals, counts, activeObservers,
        tick(times = 1) { for (let index = 0; index < times; index++) [...intervals.values()].forEach(fn => fn()); },
        close() { dom.window.close(); } };
}

function testSelectionClosesOwnPanel() {
    for (const match of [false, true]) {
        const env = environment({ match });
        env.api.run();
        env.tick(2);
        assert.equal(env.counts.selected, 1);
        assert.equal(env.panel(), null, "choosing the highest unlocked color must close the panel opened by the script");
        assert.equal(env.counts.closed, 1);
        assert.equal(env.intervals.size, 0);
        assert.equal(env.activeObservers.size, 0);
        assert.ok(env.document.getElementById("unrelated"), "do not close unrelated panels");
        env.close();
    }
    console.log("✓ normal/match color selection closes only the script-owned panel");
}

function testPreopenedAndSelected() {
    const manual = environment({ preopened: true });
    const originalPanel = manual.panel();
    manual.api.run();
    manual.tick(3);
    assert.equal(manual.panel(), originalPanel, "leave a user's preopened panel intact");
    assert.equal(manual.counts.closed, 0);
    assert.equal(manual.counts.selected, 0);
    assert.equal(manual.intervals.size, 0);
    manual.close();
    const selected = environment({ alreadySelected: true });
    selected.api.run();
    selected.tick(2);
    assert.equal(selected.counts.selected, 0, "an already selected color must not be clicked again");
    assert.equal(selected.panel(), null);
    assert.equal(selected.intervals.size, 0);
    selected.close();
    console.log("✓ manual panels are preserved and an already-selected color is not toggled");
}

function testCancelAndTimeout() {
    const cancelled = environment({ delayedItems: true });
    cancelled.api.bind();
    cancelled.api.run();
    cancelled.tick();
    assert.ok(cancelled.panel());
    cancelled.document.getElementById("extool__autobarragecolor").click();
    assert.equal(cancelled.panel(), null, "disabling the feature closes its pending panel");
    assert.equal(cancelled.intervals.size, 0);
    assert.equal(cancelled.activeObservers.size, 0);
    cancelled.tick(110);
    assert.equal(cancelled.counts.selected, 0);
    cancelled.close();
    for (const options of [{ delayedItems: true }, { allLocked: true }]) {
        const env = environment(options);
        env.api.run();
        env.tick(101);
        assert.equal(env.panel(), null, "render/locked-color timeout cleans the panel");
        assert.equal(env.intervals.size, 0);
        assert.equal(env.activeObservers.size, 0);
        assert.equal(env.counts.selected, 0);
        env.close();
    }
    console.log("✓ disabling or timing out clears pending work and its panel");
}

function testDelayedRenderAndRestart() {
    const delayed = environment({ delayedItems: true });
    delayed.api.run();
    delayed.tick(3);
    assert.equal(delayed.counts.opened, 1, "pending rendering must not repeatedly toggle the panel");
    delayed.addItems();
    delayed.tick();
    assert.equal(delayed.counts.selected, 1);
    assert.equal(delayed.panel(), null);
    delayed.close();
    const restarted = environment();
    restarted.api.run();
    restarted.tick();
    restarted.api.run();
    assert.equal(restarted.intervals.size, 1, "restarting replaces the pending operation");
    restarted.tick(2);
    assert.equal(restarted.counts.opened, 2);
    assert.equal(restarted.counts.closed, 2);
    assert.equal(restarted.intervals.size, 0);
    restarted.close();
    console.log("✓ delayed items and restarted selection retain one bounded operation");
}

function testFailuresAndUserReplacement() {
    const failed = environment();
    failed.api.run();
    failed.tick();
    failed.panel().querySelector('[data-level="high"]').click = () => { throw new Error("selection failed"); };
    assert.doesNotThrow(() => failed.tick());
    assert.equal(failed.panel(), null);
    assert.equal(failed.intervals.size, 0);
    failed.close();
    const replaced = environment();
    replaced.api.run();
    replaced.tick();
    replaced.panel().remove();
    const userPanel = replaced.open();
    replaced.tick();
    assert.equal(replaced.panel(), userPanel, "never close a replacement panel the user opened");
    assert.equal(replaced.counts.selected, 0);
    assert.equal(replaced.intervals.size, 0);
    replaced.close();
    console.log("✓ failures clean up while user replacement panels remain untouched");
}

function testAsynchronousPanelCancellation() {
    for (const replaced of [false, true]) {
        const env = environment();
        let render;
        env.switcher.click = () => { render = () => env.open(); };
        env.api.bind();
        env.api.run();
        env.tick();
        assert.equal(env.panel(), null);
        render(); // React can mount between the opening click and the next 500 ms poll.
        let manualPanel = null;
        if (replaced) {
            env.panel().remove();
            manualPanel = env.open();
        }
        env.document.getElementById("extool__autobarragecolor").click();
        assert.equal(env.intervals.size, 0);
        assert.equal(env.activeObservers.size, 0);
        assert.equal(env.panel(), manualPanel, "capture the first asynchronous panel, never its user's replacement");
        assert.equal(env.counts.closed, replaced ? 0 : 1);
        env.close();
    }
    console.log("✓ cancelling before the next poll closes asynchronously mounted panels without claiming replacements");
}

testSelectionClosesOwnPanel();
testPreopenedAndSelected();
testCancelAndTimeout();
testDelayedRenderAndRestart();
testFailuresAndUserReplacement();
testAsynchronousPanelCancellation();
