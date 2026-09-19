function* (__imports) {
yield {"persistPipPreferences": { get: () => persistPipPreferences, set: value => { persistPipPreferences = value; } },
"restorePipPreferences": { get: () => restorePipPreferences, set: value => { restorePipPreferences = value; } }};
function restorePipPreferences() {
  const saved = __imports.localStorage.getItem('ExSave_PipSet');
  if (saved) {
    try { Object.assign(__imports.pipPreferences, JSON.parse(saved)); } catch (error) {}
  }
}
function persistPipPreferences() {
  __imports.localStorage.setItem('ExSave_PipSet', JSON.stringify(__imports.pipPreferences));
}

}
