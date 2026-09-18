// WebBuilder bootstrap
// Fixes the load order for every module, then kicks off the initial
// render once everything is loaded. See js/README.md for the full
// module layout and why each order constraint exists.
document.write('<script src="js/core/state.js"><\/script>');
document.write('<script src="js/core/utils.js"><\/script>');
document.write('<script src="js/ui/toast.js"><\/script>');
document.write('<script src="js/core/storage.js"><\/script>');
document.write('<script src="js/canvas/elements.js"><\/script>');
document.write('<script src="js/canvas/icon-registry.js"><\/script>');
// Must load before the cart-*.js files below — they read
// window.WebBuilderProducts.
document.write('<script src="js/shop/products.js"><\/script>');
// Cart data layer, four files. cart-config.js must load last: it calls
// window.WebBuilderCart.normalizeState() once, after the other three
// have attached their normalize functions to the same object.
document.write('<script src="js/shop/cart-items.js"><\/script>');
document.write('<script src="js/shop/cart-recommendations.js"><\/script>');
document.write('<script src="js/shop/cart-milestones.js"><\/script>');
document.write('<script src="js/shop/cart-config.js"><\/script>');
document.write('<script src="js/shop/cart-html.js"><\/script>');
document.write('<script src="js/shop/cart-drawer.js"><\/script>');
document.write('<script src="js/shop/cart-sidebar.js"><\/script>');
document.write('<script src="js/shop/cart-editor-stage.js"><\/script>');
document.write('<script src="js/shop/cart-editor-drag.js"><\/script>');
document.write('<script src="js/shop/cart-editor-panel.js"><\/script>');
document.write('<script src="js/shop/cart-editor-bindings.js"><\/script>');
// Must load before canvas/canvas.js and layout/header-footer-render.js —
// both use window.WebBuilderAlignment for drag/click + snapping.
document.write('<script src="js/canvas/alignment.js"><\/script>');
document.write('<script src="js/canvas/canvas.js"><\/script>');
// Calls window.WebBuilderCanvas.setBackground() at runtime.
document.write('<script src="js/editor/background.js"><\/script>');
// Injects the #prop-*/#bar-prop-* markup that inspector.js and
// header-footer-inspector.js read right after DOMContentLoaded.
document.write('<script src="js/ui/shared-markup.js"><\/script>');
document.write('<script src="js/editor/inspector.js"><\/script>');
document.write('<script src="js/editor/inspector-special.js"><\/script>');
document.write('<script src="js/toolbar.js"><\/script>');
document.write('<script src="js/layout/header-footer-data.js"><\/script>');
document.write('<script src="js/layout/header-footer-render.js"><\/script>');
document.write('<script src="js/layout/header-footer-inspector.js"><\/script>');
document.write('<script src="js/export.js"><\/script>');
document.write('<script src="js/ui/modals.js"><\/script>');
document.write('<script src="js/preview.js"><\/script>');
document.write('<script src="js/ui/tabs.js"><\/script>');
// ES modules — actual load order resolved by the browser via import, not
// by document.write order. Folder name is case-sensitive on some hosts.
document.write('<script type="module" src="js/Supabase/supabase-config.js"><\/script>');
document.write('<script type="module" src="js/Supabase/supabase-data.js"><\/script>');
document.write('<script type="module" src="js/Supabase/supabase-ui.js"><\/script>');

document.addEventListener('DOMContentLoaded', () => {
  window.WebBuilderStorage?.loadIntoState?.();

  window.WebBuilderCanvas?.render?.();
  window.WebBuilderCanvas?.refreshBackgroundEditor?.();
  window.WebBuilderHeaderFooter?.normalizeState?.();
  window.WebBuilderHeaderFooterRuntime?.render?.();
  window.WebBuilderCart?.normalizeState?.();
  window.WebBuilderCartRuntime?.render?.();
  window.WebBuilderProductsRuntime?.render?.();
  window.WebBuilderCartConfigRuntime?.render?.();
  window.WebBuilderPreview?.bindToggle?.();
});
