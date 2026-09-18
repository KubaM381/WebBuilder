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
// canvas/icon-registry.js has no hard load-order requirement of its own
// (every read of window.WebBuilderIconRegistry happens at runtime, inside
// a function body, never at top-level parse time) — kept right after
// elements.js since both hold canvas-element-related data.
document.write('<script src="js/canvas/icon-registry.js"><\/script>');
// shop/products.js must load before shop/cart-data.js — cart-data.js
// references products only via window.WebBuilderProducts.
document.write('<script src="js/shop/products.js"><\/script>');
document.write('<script src="js/shop/cart-data.js"><\/script>');
// shop/cart-render.js was split into three files (docs/STRUCTURE_PLAN.md
// Phase 2): cart-html.js (pure HTML building, no DOM/events), cart-drawer.js
// (the real slide-in drawer) and cart-sidebar.js (left sidebar config UI).
// All three read window.WebBuilderCart at top-level parse time, so all
// three must load after shop/cart-data.js. cart-drawer.js and
// cart-sidebar.js only reach into window.WebBuilderCartHtml inside
// function bodies (at runtime), so their order relative to cart-html.js
// doesn't strictly matter — cart-html.js is listed first by convention
// (data → html → drawer/sidebar → editor).
document.write('<script src="js/shop/cart-html.js"><\/script>');
document.write('<script src="js/shop/cart-drawer.js"><\/script>');
document.write('<script src="js/shop/cart-sidebar.js"><\/script>');
document.write('<script src="js/shop/cart-editor.js"><\/script>');
// canvas/alignment.js must load before canvas/canvas.js and
// layout/header-footer-render.js: both call window.WebBuilderAlignment at
// runtime for drag/click interaction + alignment-guide snapping.
document.write('<script src="js/canvas/alignment.js"><\/script>');
document.write('<script src="js/canvas/canvas.js"><\/script>');
// editor/background.js calls window.WebBuilderCanvas.setBackground() at
// runtime (inside its commit() handler) — must load after canvas/canvas.js.
document.write('<script src="js/editor/background.js"><\/script>');
// ui/shared-markup.js must load before editor/inspector.js and
// layout/header-footer-inspector.js: it fills the action-type <select>
// options and the text-format toolbar buttons (shared markup for
// #prop-*/#bar-prop-*) that those two modules read/bind right after
// DOMContentLoaded.
document.write('<script src="js/ui/shared-markup.js"><\/script>');
document.write('<script src="js/editor/inspector.js"><\/script>');
document.write('<script src="js/toolbar.js"><\/script>');
// layout/header-footer-data.js must load before -render.js and
// -inspector.js: both read window.WebBuilderHeaderFooter at top-level
// parse time. -render.js is listed before -inspector.js by convention
// (rendering is the more "foundational" half of this domain), though
// neither actually requires the other at parse time — both reach into
// window.WebBuilderHeaderFooterRuntime only inside function bodies.
document.write('<script src="js/layout/header-footer-data.js"><\/script>');
document.write('<script src="js/layout/header-footer-render.js"><\/script>');
document.write('<script src="js/layout/header-footer-inspector.js"><\/script>');
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
