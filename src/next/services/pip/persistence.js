function* (__imports) {
yield {"persistPipPreferences": { get: () => persistPipPreferences, set: value => { persistPipPreferences = value; } },
"restorePipPreferences": { get: () => restorePipPreferences, set: value => { restorePipPreferences = value; } }};
/**
 * 从本地存储加载画中画偏好设置并安全合并至内存单例
 */
function restorePipPreferences() {
  const savedRaw = __imports.localStorage.getItem('ExSave_PipSet');
  if (!savedRaw) return;

  try {
    const parsed = JSON.parse(savedRaw);
    if (parsed && typeof parsed === 'object') {
      Object.assign(__imports.pipPreferences, parsed);
    }
  } catch (error) {
    console.warn('[DouyuEx NEXT] 解析画中画本地偏好失败:', error);
  }
}

/**
 * 将画中画偏好设置安全持久化至本地存储
 */
function persistPipPreferences() {
  try {
    __imports.localStorage.setItem('ExSave_PipSet', JSON.stringify(__imports.pipPreferences || {}));
  } catch (error) {
    console.warn('[DouyuEx NEXT] 存储画中画偏好失败:', error);
  }
}

}
