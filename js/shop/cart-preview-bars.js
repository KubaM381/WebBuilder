// js/shop/cart-preview-bars.js
// WebBuilder cart-editor preview header/footer.
// Deliberately independent from js/layout/header-footer.js: the cart
// focus editor (js/shop/cart-editor.js) no longer shows or lets you edit
// the REAL site header/footer (window.WebBuilderHeaderFooter) while it is
// open. Instead this module owns a small, separate preview bar pair
// purely so the cart layout can be arranged with a sense of where
// header/footer space would sit — no click actions, no drag/drop of its
// own, nothing shared with the real header/footer state.
//
// Basic on/off + height/background-color/label controls live in the
// sidebar ("Warenkorb"-Tab, #panel-cart, "Vorschau: Kopf-/Fußzeile"). The
// fuller styling added below (background image, text color, font family,
// bold, and an optional icon OR a custom uploaded image shown next to the
// label) is edited only in the cart focus editor's right-hand panel
// (#cart-comp-previewbar-fields, see js/shop/cart-editor.js) — kept out of
// the sidebar on purpose so that section doesn't have to duplicate every
// field twice.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCartPreviewBars: WebBuilderState is not available."); return; }

  function normalizeState() {
    state.cartPreviewHeaderEnabled = !!state.cartPreviewHeaderEnabled;
    state.cartPreviewHeaderHeight = Math.max(20, Number(state.cartPreviewHeaderHeight) || 64);
    state.cartPreviewHeaderColor = String(state.cartPreviewHeaderColor || "#111827");
    state.cartPreviewHeaderLabel = String(state.cartPreviewHeaderLabel || "Header");
    state.cartPreviewHeaderBgType = state.cartPreviewHeaderBgType === "image" ? "image" : "solid";
    state.cartPreviewHeaderBgImage = String(state.cartPreviewHeaderBgImage || "");
    state.cartPreviewHeaderTextColor = String(state.cartPreviewHeaderTextColor || "#ffffff");
    state.cartPreviewHeaderFontFamily = String(state.cartPreviewHeaderFontFamily || "inherit");
    state.cartPreviewHeaderBold = !!state.cartPreviewHeaderBold;
    state.cartPreviewHeaderIcon = state.cartPreviewHeaderIcon || null;
    state.cartPreviewHeaderIconImage = String(state.cartPreviewHeaderIconImage || "");

    state.cartPreviewFooterEnabled = !!state.cartPreviewFooterEnabled;
    state.cartPreviewFooterHeight = Math.max(20, Number(state.cartPreviewFooterHeight) || 70);
    state.cartPreviewFooterColor = String(state.cartPreviewFooterColor || "#111827");
    state.cartPreviewFooterLabel = String(state.cartPreviewFooterLabel || "Footer");
    state.cartPreviewFooterBgType = state.cartPreviewFooterBgType === "image" ? "image" : "solid";
    state.cartPreviewFooterBgImage = String(state.cartPreviewFooterBgImage || "");
    state.cartPreviewFooterTextColor = String(state.cartPreviewFooterTextColor || "#ffffff");
    state.cartPreviewFooterFontFamily = String(state.cartPreviewFooterFontFamily || "inherit");
    state.cartPreviewFooterBold = !!state.cartPreviewFooterBold;
    state.cartPreviewFooterIcon = state.cartPreviewFooterIcon || null;
    state.cartPreviewFooterIconImage = String(state.cartPreviewFooterIconImage || "");
    return state;
  }

  function getConfig() {
    return {
      header: {
        enabled: state.cartPreviewHeaderEnabled, height: state.cartPreviewHeaderHeight,
        color: state.cartPreviewHeaderColor, label: state.cartPreviewHeaderLabel,
        bgType: state.cartPreviewHeaderBgType, bgImage: state.cartPreviewHeaderBgImage,
        textColor: state.cartPreviewHeaderTextColor, fontFamily: state.cartPreviewHeaderFontFamily,
        bold: state.cartPreviewHeaderBold, icon: state.cartPreviewHeaderIcon, iconImage: state.cartPreviewHeaderIconImage
      },
      footer: {
        enabled: state.cartPreviewFooterEnabled, height: state.cartPreviewFooterHeight,
        color: state.cartPreviewFooterColor, label: state.cartPreviewFooterLabel,
        bgType: state.cartPreviewFooterBgType, bgImage: state.cartPreviewFooterBgImage,
        textColor: state.cartPreviewFooterTextColor, fontFamily: state.cartPreviewFooterFontFamily,
        bold: state.cartPreviewFooterBold, icon: state.cartPreviewFooterIcon, iconImage: state.cartPreviewFooterIconImage
      }
    };
  }

  function updateHeader(patch = {}) {
    window.WebBuilderHistory?.arm();
    if (patch.enabled != null) state.cartPreviewHeaderEnabled = !!patch.enabled;
    if (patch.height != null) state.cartPreviewHeaderHeight = Math.max(20, Number(patch.height) || 64);
    if (patch.color != null) state.cartPreviewHeaderColor = String(patch.color);
    if (patch.label != null) state.cartPreviewHeaderLabel = String(patch.label);
    if (patch.bgType != null) state.cartPreviewHeaderBgType = patch.bgType === "image" ? "image" : "solid";
    if (patch.bgImage != null) state.cartPreviewHeaderBgImage = String(patch.bgImage);
    if (patch.textColor != null) state.cartPreviewHeaderTextColor = String(patch.textColor);
    if (patch.fontFamily != null) state.cartPreviewHeaderFontFamily = String(patch.fontFamily);
    if (patch.bold != null) state.cartPreviewHeaderBold = !!patch.bold;
    // icon/iconImage are mutually exclusive — callers pass the one being
    // set and clear the other explicitly (see js/shop/cart-editor.js), so
    // this only ever writes what it's given.
    if (patch.icon !== undefined) state.cartPreviewHeaderIcon = patch.icon || null;
    if (patch.iconImage != null) state.cartPreviewHeaderIconImage = String(patch.iconImage);
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
    if (patch.bgType != null) state.cartPreviewFooterBgType = patch.bgType === "image" ? "image" : "solid";
    if (patch.bgImage != null) state.cartPreviewFooterBgImage = String(patch.bgImage);
    if (patch.textColor != null) state.cartPreviewFooterTextColor = String(patch.textColor);
    if (patch.fontFamily != null) state.cartPreviewFooterFontFamily = String(patch.fontFamily);
    if (patch.bold != null) state.cartPreviewFooterBold = !!patch.bold;
    if (patch.icon !== undefined) state.cartPreviewFooterIcon = patch.icon || null;
    if (patch.iconImage != null) state.cartPreviewFooterIconImage = String(patch.iconImage);
    window.WebBuilderHistory?.commit();
    window.WebBuilderCartFocus?.renderStage?.();
    return getConfig().footer;
  }

  normalizeState();
  window.WebBuilderCartPreviewBars = { normalizeState, getConfig, updateHeader, updateFooter };

  const byId = id => document.getElementById(id);

  // Zeigt/markiert die passende Vorschau-Leiste im Warenkorb-Editor zur
  // Bearbeitung, sobald der Nutzer eines der Sidebar-Felder hier bedient
  // — öffnet den Editor bei Bedarf automatisch (siehe
  // js/shop/cart-editor.js selectPreviewBarFromSidebar()). So bleibt eine
  // Änderung in der Sidebar nicht "unsichtbar" im Hintergrund, sondern
  // wird sofort im Editor hervorgehoben, genau wie ein direkter Klick auf
  // die Leiste in der Bühne.
  function notifyFocusSelection(key) {
    window.WebBuilderCartFocus?.selectPreviewBar?.(key);
  }

  // Sidebar stays basic (enable/height/background color/label) — the
  // fuller styling fields are synced separately by
  // js/shop/cart-editor.js's renderFocusPartPanel() whenever the
  // corresponding bar is selected in the editor.
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
    byId("cart-preview-header-toggle")?.addEventListener("change", e => { updateHeader({ enabled: e.target.checked }); render(); notifyFocusSelection("previewHeader"); }, true);
    byId("cart-preview-header-height")?.addEventListener("change", e => { updateHeader({ height: e.target.value }); render(); notifyFocusSelection("previewHeader"); }, true);
    byId("cart-preview-header-color")?.addEventListener("input", e => { updateHeader({ color: e.target.value }); notifyFocusSelection("previewHeader"); }, true);
    byId("cart-preview-header-label")?.addEventListener("change", e => { updateHeader({ label: e.target.value }); notifyFocusSelection("previewHeader"); }, true);
    byId("cart-preview-footer-toggle")?.addEventListener("change", e => { updateFooter({ enabled: e.target.checked }); render(); notifyFocusSelection("previewFooter"); }, true);
    byId("cart-preview-footer-height")?.addEventListener("change", e => { updateFooter({ height: e.target.value }); render(); notifyFocusSelection("previewFooter"); }, true);
    byId("cart-preview-footer-color")?.addEventListener("input", e => { updateFooter({ color: e.target.value }); notifyFocusSelection("previewFooter"); }, true);
    byId("cart-preview-footer-label")?.addEventListener("change", e => { updateFooter({ label: e.target.value }); notifyFocusSelection("previewFooter"); }, true);
    render();
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(bind, 0));
  window.WebBuilderCartPreviewBars.render = render;
})();
