// WebBuilder bootstrap
// The js/ directory is split into core/canvas/editor/layout/shop/ui
// subfolders (see js/README.md for the full layout and the reasoning
// behind the load order below). builder.js stays a pure orchestrator:
// fix the load order, then kick off the initial render once everything
// is loaded.
document.write('<script src="js/core/state.js"><\/script>');
document.write('<script src="js/core/utils.js"><\/script>');
document.write('<script src="js/ui/toast.js"><\/script>');
document.write('<script src="js/core/storage.js"><\/script>');
document.write('<script src="js/canvas/elements.js"><\/script>');
// shop/products.js must load before shop/cart-data.js — cart-data.js
// references products only via window.WebBuilderProducts.
document.write('<script src="js/shop/products.js"><\/script>');
document.write('<script src="js/shop/cart-data.js"><\/script>');
document.write('<script src="js/shop/cart-render.js"><\/script>');
document.write('<script src="js/shop/cart-editor.js"><\/script>');
// canvas/alignment.js must load before canvas/canvas.js and
// layout/header-footer.js: both call window.WebBuilderAlignment at
// runtime for drag/click interaction + alignment-guide snapping.
document.write('<script src="js/canvas/alignment.js"><\/script>');
document.write('<script src="js/canvas/canvas.js"><\/script>');
// ui/shared-markup.js must load before editor/inspector.js and
// layout/header-footer.js: it fills the action-type <select> options and
// the text-format toolbar buttons (shared markup for #prop-*/#bar-prop-*)
// that those two modules read/bind right after DOMContentLoaded.
document.write('<script src="js/ui/shared-markup.js"><\/script>');
document.write('<script src="js/editor/inspector.js"><\/script>');
document.write('<script src="js/toolbar.js"><\/script>');
document.write('<script src="js/layout/header-footer.js"><\/script>');
document.write('<script src="js/export.js"><\/script>');
document.write('<script src="js/ui/modals.js"><\/script>');
document.write('<script src="js/preview.js"><\/script>');
document.write('<script src="js/ui/tabs.js"><\/script>');
// Supabase files live in js/Supabase/ (see its README) as ES modules —
// supabase-ui.js imports directly from supabase-data.js, so the order of
// these three lines is informal only, not functionally required.
// Note: the folder is "Supabase" (capital S) — case-sensitive on some
// servers (e.g. GitHub Pages/Linux).
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
  window.WebBuilderCartPreviewBars?.normalizeState?.();
  window.WebBuilderCartPreviewBars?.render?.();
  window.WebBuilderPreview?.bindToggle?.();

});
