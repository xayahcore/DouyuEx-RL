function* (__imports) {
yield {"findPipMergeKey": { get: () => findPipMergeKey, set: value => { findPipMergeKey = value; } }};
/**
 * 提取文本的唯一字符指纹 (去除空白后字符去重)
 * 例如 "666666" -> "6", "哈哈哈" -> "哈"
 * @param {string} text
 * @returns {string} 字符指纹
 */
function getUniqueCharFingerprint(text) {
  if (!text || typeof text !== 'string') return '';
  const cleaned = text.replace(/\s+/g, '');
  return Array.from(new Set(cleaned)).join('');
}

/**
 * 寻找画中画相似弹幕的归并聚合键
 * @param {string} text - 待判定的弹幕文本
 * @returns {string} 归并分组 Key
 */
function findPipMergeKey(text) {
  if (!text || typeof text !== 'string') return text;

  // 已有完全相同的分组键，直接复用
  if (__imports.pipMergeGroups.has(text)) {
    return text;
  }

  const fingerprint = getUniqueCharFingerprint(text);
  if (!fingerprint) return text;

  // 在现有活跃分组中模糊匹配相似连击
  for (const existingKey of __imports.pipMergeGroups.keys()) {
    const existingFingerprint = getUniqueCharFingerprint(existingKey);

    // 指纹一致且长度相近 (如 "666" 与 "66666")
    if (fingerprint === existingFingerprint && Math.abs(text.length - existingKey.length) <= 6) {
      return existingKey;
    }

    // 互为包含关系且长度差距极小 (如 "主播下饭" 与 "主播好下饭")
    if ((text.includes(existingKey) || existingKey.includes(text)) && Math.abs(text.length - existingKey.length) <= 4) {
      return existingKey;
    }
  }

  return text;
}

}
