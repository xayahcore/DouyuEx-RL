// src/ui/tokens.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.tokens', [], function () {
    var CSS_TOKENS = `
:root {
  --miuix-primary: #0066FF;
  --miuix-primary-hover: #1a75ff;
  --miuix-primary-active: #0052cc;
  --miuix-bg: rgba(255, 255, 255, 0.72);
  --miuix-bg-solid: #ffffff;
  --miuix-bg-card: rgba(255, 255, 255, 0.55);
  --miuix-bg-hover: rgba(255, 255, 255, 0.88);
  --miuix-blur: blur(36px);
  --miuix-blur-header: blur(28px);
  --miuix-saturate: saturate(220%);
  --miuix-border: rgba(0, 0, 0, 0.08);
  --miuix-border-hover: rgba(0, 102, 255, 0.35);
  --miuix-text-primary: #0f172a;
  --miuix-text-secondary: #64748b;
  --miuix-text-muted: #94a3b8;
  --miuix-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
  --miuix-shadow-md: 0 8px 24px rgba(0, 0, 0, 0.08);
  --miuix-shadow-modal: 0 16px 40px rgba(0, 0, 0, 0.16);
  --miuix-radius-sm: 8px;
  --miuix-radius-md: 12px;
  --miuix-radius-lg: 16px;
  --miuix-radius-panel: 22px;
  --miuix-transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 基础面板规范 (380x370px 齐平三维铁壁) */
.miuix-panel {
  position: fixed !important;
  width: 380px !important;
  max-width: calc(100vw - 16px) !important;
  height: 370px !important;
  max-height: calc(100vh - 16px) !important;
  min-height: 370px !important;
  background: var(--miuix-bg) !important;
  backdrop-filter: var(--miuix-blur) var(--miuix-saturate) !important;
  -webkit-backdrop-filter: var(--miuix-blur) var(--miuix-saturate) !important;
  border: 1px solid var(--miuix-border) !important;
  border-radius: var(--miuix-radius-panel) !important;
  box-shadow: var(--miuix-shadow-modal) !important;
  display: flex !important;
  flex-direction: column !important;
  padding: 0 !important;
  overflow: hidden !important;
  z-index: 100000 !important;
  box-sizing: border-box !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif !important;
  opacity: 0;
  pointer-events: none;
  transform: translateY(6px) scale(0.98);
  transition: opacity 0.18s ease, transform 0.18s ease !important;
}

.miuix-panel.is-active {
  opacity: 1 !important;
  pointer-events: auto !important;
  transform: translateY(0) scale(1) !important;
}

/* 粘性吸顶 Header */
.miuix-panel__header {
  position: sticky !important;
  top: 0 !important;
  height: 44px !important;
  min-height: 44px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 0 14px !important;
  background: var(--miuix-bg) !important;
  backdrop-filter: var(--miuix-blur-header) !important;
  -webkit-backdrop-filter: var(--miuix-blur-header) !important;
  border-bottom: 1px solid var(--miuix-border) !important;
  z-index: 10 !important;
  box-sizing: border-box !important;
}

.miuix-panel__title-wrap {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.miuix-panel__title {
  font-size: 13.5px !important;
  font-weight: 700 !important;
  color: var(--miuix-text-primary) !important;
  line-height: 1 !important;
}

.miuix-panel__subtitle {
  font-size: 11px !important;
  color: var(--miuix-text-muted) !important;
  font-weight: 400 !important;
}

.miuix-panel__close {
  width: 26px !important;
  height: 26px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 50% !important;
  background: rgba(0, 0, 0, 0.04) !important;
  color: var(--miuix-text-secondary) !important;
  cursor: pointer !important;
  font-size: 16px !important;
  line-height: 1 !important;
  border: none !important;
  transition: var(--miuix-transition) !important;
}

.miuix-panel__close:hover {
  background: rgba(244, 63, 94, 0.15) !important;
  color: #f43f5e !important;
}

/* 面板内容 Body (内嵌自然滚动) */
.miuix-panel__body {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding: 12px 14px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  box-sizing: border-box !important;
}

/* 极细 4px 滚动条 */
.miuix-panel__body::-webkit-scrollbar,
.miuix-scrollable::-webkit-scrollbar {
  width: 4px !important;
  height: 4px !important;
}
.miuix-panel__body::-webkit-scrollbar-thumb,
.miuix-scrollable::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.18) !important;
  border-radius: 4px !important;
}
.miuix-panel__body::-webkit-scrollbar-track,
.miuix-scrollable::-webkit-scrollbar-track {
  background: transparent !important;
}

/* 四级卡片 Card */
.miuix-card {
  background: var(--miuix-bg-card) !important;
  border: 1px solid var(--miuix-border) !important;
  border-radius: var(--miuix-radius-md) !important;
  padding: 10px 12px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  box-sizing: border-box !important;
  transition: var(--miuix-transition) !important;
}

.miuix-card:hover {
  background: var(--miuix-bg-hover) !important;
  border-color: rgba(0, 102, 255, 0.25) !important;
  box-shadow: var(--miuix-shadow-sm) !important;
}

.miuix-card__header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

.miuix-card__title {
  font-size: 12px !important;
  font-weight: 600 !important;
  color: var(--miuix-text-primary) !important;
}

.miuix-card__desc {
  font-size: 10.5px !important;
  color: var(--miuix-text-secondary) !important;
}

/* 手风琴 Accordion */
.miuix-accordion {
  border: 1px solid var(--miuix-border) !important;
  border-radius: var(--miuix-radius-md) !important;
  background: var(--miuix-bg-card) !important;
  overflow: hidden !important;
  transition: var(--miuix-transition) !important;
}

.miuix-accordion__header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 9px 12px !important;
  cursor: pointer !important;
  user-select: none !important;
}

.miuix-accordion__header:hover {
  background: rgba(0, 102, 255, 0.06) !important;
}

.miuix-accordion__title-group {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.miuix-accordion__title {
  font-size: 12px !important;
  font-weight: 600 !important;
  color: var(--miuix-text-primary) !important;
}

.miuix-accordion__actions {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}

.miuix-accordion__btn {
  font-size: 10.5px !important;
  padding: 2px 7px !important;
  border-radius: 4px !important;
  background: rgba(0, 0, 0, 0.05) !important;
  color: var(--miuix-text-secondary) !important;
  border: none !important;
  cursor: pointer !important;
  transition: var(--miuix-transition) !important;
}

.miuix-accordion__btn:hover {
  background: var(--miuix-primary) !important;
  color: #fff !important;
}

.miuix-accordion__body {
  display: none;
  padding: 8px 12px 10px 12px !important;
  border-top: 1px solid var(--miuix-border) !important;
  background: rgba(255, 255, 255, 0.4) !important;
  font-size: 11px !important;
}

.miuix-accordion.is-expanded .miuix-accordion__body {
  display: block !important;
}

/* 表单控件: Switch, Button, Input */
.miuix-switch {
  position: relative !important;
  display: inline-block !important;
  width: 38px !important;
  height: 20px !important;
  cursor: pointer !important;
  user-select: none !important;
}

.miuix-switch input {
  opacity: 0 !important;
  width: 0 !important;
  height: 0 !important;
}

.miuix-switch__slider {
  position: absolute !important;
  inset: 0 !important;
  background: #cbd5e1 !important;
  border-radius: 20px !important;
  transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.miuix-switch__slider::before {
  position: absolute !important;
  content: "" !important;
  height: 16px !important;
  width: 16px !important;
  left: 2px !important;
  bottom: 2px !important;
  background: #ffffff !important;
  border-radius: 50% !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
  transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.miuix-switch input:checked + .miuix-switch__slider {
  background: var(--miuix-primary) !important;
}

.miuix-switch input:checked + .miuix-switch__slider::before {
  transform: translateX(18px) !important;
}

.miuix-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 6px 14px !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  border-radius: var(--miuix-radius-sm) !important;
  border: 1px solid transparent !important;
  cursor: pointer !important;
  user-select: none !important;
  transition: var(--miuix-transition) !important;
}

.miuix-btn-primary {
  background: var(--miuix-primary) !important;
  color: #ffffff !important;
}

.miuix-btn-primary:hover {
  background: var(--miuix-primary-hover) !important;
  box-shadow: 0 2px 8px rgba(0, 102, 255, 0.3) !important;
}

.miuix-btn-secondary {
  background: rgba(0, 0, 0, 0.05) !important;
  color: var(--miuix-text-primary) !important;
  border: 1px solid var(--miuix-border) !important;
}

.miuix-btn-secondary:hover {
  background: rgba(0, 0, 0, 0.09) !important;
}

.miuix-input {
  background: rgba(255, 255, 255, 0.8) !important;
  border: 1px solid var(--miuix-border) !important;
  border-radius: var(--miuix-radius-sm) !important;
  padding: 5px 9px !important;
  font-size: 11.5px !important;
  color: var(--miuix-text-primary) !important;
  outline: none !important;
  transition: var(--miuix-transition) !important;
}

.miuix-input:focus {
  border-color: var(--miuix-primary) !important;
  background: #ffffff !important;
  box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.18) !important;
}

/* Toast 纯文字滑动通知胶囊 */
.miuix-toast-container {
  position: fixed !important;
  top: 20px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  z-index: 200000 !important;
  pointer-events: none !important;
}

.miuix-toast {
  padding: 7px 16px !important;
  border-radius: 9999px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  color: #ffffff !important;
  backdrop-filter: blur(20px) !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
  animation: miuix-toast-in 0.24s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
  pointer-events: auto !important;
}

.miuix-toast--info { background: rgba(15, 23, 42, 0.88) !important; }
.miuix-toast--success { background: rgba(16, 185, 129, 0.92) !important; }
.miuix-toast--error { background: rgba(239, 68, 68, 0.92) !important; }

@keyframes miuix-toast-in {
  from { opacity: 0; transform: translateY(-8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Dialog 全局模态对话框 (替代旧 alert/prompt/postbird) */
.miuix-dialog-overlay {
  position: fixed !important;
  inset: 0 !important;
  background: rgba(0, 0, 0, 0.35) !important;
  backdrop-filter: blur(8px) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 150000 !important;
}

.miuix-dialog {
  width: 320px !important;
  background: rgba(255, 255, 255, 0.88) !important;
  backdrop-filter: blur(28px) !important;
  border: 1px solid var(--miuix-border) !important;
  border-radius: var(--miuix-radius-lg) !important;
  padding: 16px !important;
  box-shadow: var(--miuix-shadow-modal) !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
}

.miuix-dialog__title {
  font-size: 13.5px !important;
  font-weight: 700 !important;
  color: var(--miuix-text-primary) !important;
}

.miuix-dialog__message {
  font-size: 11.5px !important;
  color: var(--miuix-text-secondary) !important;
  line-height: 1.4 !important;
}

.miuix-dialog__actions {
  display: flex !important;
  justify-content: flex-end !important;
  gap: 8px !important;
}

/* Level 2 Dock 工具栏装配 */
.miuix-dock-wrap {
  position: fixed !important;
  bottom: 24px !important;
  right: 24px !important;
  z-index: 999999 !important;
  background: rgba(255, 255, 255, 0.88) !important;
  backdrop-filter: blur(28px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(28px) saturate(180%) !important;
  border: 1px solid rgba(226, 232, 240, 0.9) !important;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.6) inset !important;
  border-radius: 20px !important;
  padding: 5px 8px !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
  user-select: none !important;
}

.miuix-dock-item {
  position: relative !important;
  width: 32px !important;
  height: 32px !important;
  border-radius: 10px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  transition: var(--miuix-transition) !important;
  user-select: none !important;
  color: #475569 !important;
}

.miuix-dock-item:hover {
  background: rgba(0, 102, 255, 0.1) !important;
  color: var(--miuix-primary) !important;
  transform: translateY(-2px);
}

.miuix-dock-item.is-active {
  background: rgba(0, 102, 255, 0.16) !important;
  color: var(--miuix-primary) !important;
}

/* 弹幕 +1 跟风复读气泡 */
.miuix-danmaku-plusone {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin-left: 6px !important;
  padding: 1px 5px !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  color: #0066FF !important;
  background: rgba(0, 102, 255, 0.08) !important;
  border: 1px solid rgba(0, 102, 255, 0.2) !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  opacity: 0.85 !important;
  transition: all 0.15s ease !important;
  user-select: none !important;
}

.miuix-danmaku-plusone:hover {
  opacity: 1 !important;
  background: #0066FF !important;
  color: #fff !important;
  transform: scale(1.05) !important;
}

/* 聊天栏弹幕小尾巴切换胶囊 */
.miuix-tail-trigger {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  padding: 2px 8px !important;
  border-radius: 12px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #64748b !important;
  background: rgba(0, 0, 0, 0.04) !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  user-select: none !important;
}

.miuix-tail-trigger.is-active {
  color: #0066FF !important;
  background: rgba(0, 102, 255, 0.12) !important;
}

/* 磁吸指示胶囊 (16x3px) */
.miuix-dock-indicator {
  position: absolute !important;
  bottom: -4px !important;
  width: 16px !important;
  height: 3px !important;
  background: var(--miuix-primary) !important;
  border-radius: 3px !important;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease !important;
  pointer-events: none !important;
  opacity: 0;
}

/* 32px 隐形悬浮桥 (Hover Bridge) */
.miuix-hover-bridge {
  position: absolute !important;
  height: 32px !important;
  left: 0 !important;
  right: 0 !important;
  top: -32px !important;
  background: transparent !important;
  pointer-events: auto !important;
}
`;

    var isStyleInjected = false;

    function injectTokens(targetDocument) {
      var doc = targetDocument || (typeof document !== 'undefined' ? document : null);
      if (!doc) return;
      if (typeof doc.getElementById === 'function' && doc.getElementById('miuix-tokens-style')) return; // Idempotent

      var style = doc.createElement('style');
      style.id = 'miuix-tokens-style';
      style.textContent = CSS_TOKENS;
      (doc.head || doc.documentElement).appendChild(style);
      isStyleInjected = true;
    }

    return {
      CSS_TOKENS: CSS_TOKENS,
      injectTokens: injectTokens,
      get isStyleInjected() { return isStyleInjected; }
    };
  });
})();
