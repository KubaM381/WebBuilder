// js/shop/cart-preview-bars.js
// WebBuilder cart-editor preview header/footer.
// Deliberately independent from js/layout/header-footer.js: the cart
// focus editor (js/shop/cart-editor.js) no longer shows or lets you edit
// the REAL site header/footer (window.WebBuilderHeaderFooter) while it is
// open. Instead this module owns a small, separate, non-interactive
// preview bar pair (enabled/height/color/label) purely so the cart layout
// can be arranged with a sense of where header/footer space would sit —
// no items, no click actions, no drag/drop, nothing shared with the real
// header/footer state. Own sidebar controls live in the "Warenkorb"-Tab
// (web.html, #panel-cart, "Vorschau: Kopf-/Fußzeile").
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCartPreviewBars: WebBuilderState is not available."); return; }

  function normalizeState() {
    state.cartPreviewHeaderEnabled = !!state.cartPreviewHeaderEnabled;
    state.cartPreviewHeaderHeight = Math.max(20, Number(state.cartPreviewHeaderHeight) || 64);
    state.cartPreviewHeaderColor = String(state.cartPreviewHeaderColor || "#111827");
    state.cartPreviewHeaderLabel = String(state.cartPreviewHeaderLabel || "Header");
    state.cartPreviewFooterEnabled = !!state.cartPreviewFooterEnabled;
    state.cartPreviewFooterHeight = Math.max(20, Number(state.cartPreviewFooterHeight) || 70);
    state.cartPreviewFooterColor = String(state.cartPreviewFooterColor || "#111827");
    state.cartPreviewFooterLabel = String(state.cartPreviewFooterLabel || "Footer");
    return state;
  }

  function getConfig() {
    return {
      header: { enabled: state.cartPreviewHeaderEnabled, height: state.cartPreviewHeaderHeight, color: state.cartPreviewHeaderColor, label: state.cartPreviewHeaderLabel },
      footer: { enabled: state.cartPreviewFooterEnabled, height: state.cartPreviewFooterHeight, color: state.cartPreviewFooterColor, label: state.cartPreviewFooterLabel }
    };
  }

  function updateHeader(patch = {}) {
    window.WebBuilderHistory?.arm();
    if (patch.enabled != null) state.cartPreviewHeaderEnabled = !!patch.enabled;
    if (patch.height != null) state.cartPreviewHeaderHeight = Math.max(20, Number(patch.height) || 64);
    if (patch.color != null) state.cartPreviewHeaderColor = String(patch.color);
    if (patch.label != null) state.cartPreviewHeaderLabel = String(patch.label);
    window.WebBuilderHistory?.commit();
    window.WebBuilderCartFocus?.renderStage?.();
    return getConfig().header;
  }

  function updateFooter(patch = {}) {
    window.WebBuilderHistory?.arm();
    if (patch.enabled != null) state.cartPreviewFooterEnabled = !!patch.enabled;
    if (patch.height != null) state.cartPreviewFooterHeight = Math.max(20, Number(patch.height) || 70);
    if (patch.color != null) state.cartPreviewFooterColor = String(patch.color);
    if (patch.label != null) state.cartPreviewFooterLabel = String(patch.label);
    window.WebBuilderHistory?.commit();
    window.WebBuilderCartFocus?.renderStage?.();
    return getConfig().footer;
  }

  normalizeState();
  window.WebBuilderCartPreviewBars = { normalizeState, getConfig, updateHeader, updateFooter };

  const byId = id => document.getElementById(id);

  function render() {
    const cfg = getConfig();
    if (byId("cart-preview-header-toggle")) byId("cart-preview-header-toggle").checked = cfg.header.enabled;
    if (byId("cart-preview-header-height")) byId("cart-preview-header-height").value = cfg.header.height;
    if (byId("cart-preview-header-color")) byId("cart-preview-header-color").value = cfg.header.color;
    if (byId("cart-preview-header-label") && document.activeElement !== byId("cart-preview-header-label")) byId("cart-preview-header-label").value = cfg.header.label;
    if (byId("cart-preview-footer-toggle")) byId("cart-preview-footer-toggle").checked = cfg.footer.enabled;
    if (byId("cart-preview-footer-height")) byId("cart-preview-footer-height").value = cfg.footer.height;
    if (byId("cart-preview-footer-color")) byId("cart-preview-footer-color").value = cfg.footer.color;
    if (byId("cart-preview-footer-label") && document.activeElement !== byId("cart-preview-footer-label")) byId("cart-preview-footer-label").value = cfg.footer.label;
  }

  function bind() {
    byId("cart-preview-header-toggle")?.addEventListener("change", e => { updateHeader({ enabled: e.target.checked }); render(); }, true);
    byId("cart-preview-header-height")?.addEventListener("change", e => { updateHeader({ height: e.target.value }); render(); }, true);
    byId("cart-preview-header-color")?.addEventListener("input", e => updateHeader({ color: e.target.value }), true);
    byId("cart-preview-header-label")?.addEventListener("change", e => updateHeader({ label: e.target.value }), true);
    byId("cart-preview-footer-toggle")?.addEventListener("change", e => { updateFooter({ enabled: e.target.checked }); render(); }, true);
    byId("cart-preview-footer-height")?.addEventListener("change", e => { updateFooter({ height: e.target.value }); render(); }, true);
    byId("cart-preview-footer-color")?.addEventListener("input", e => updateFooter({ color: e.target.value }), true);
    byId("cart-preview-footer-label")?.addEventListener("change", e => updateFooter({ label: e.target.value }), true);
    render();
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(bind, 0));
  window.WebBuilderCartPreviewBars.render = render;
})();
