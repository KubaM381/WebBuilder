// WebBuilder bootstrap
// The js/ directory intentionally contains only the main builder domains.
// builder.js remains the central bootstrap/core and is not split further.
document.write('<script src="js/state.js"><\/script>');
document.write('<script src="js/storage.js"><\/script>');
document.write('<script src="js/elements.js"><\/script>');
document.write('<script src="js/cart.js"><\/script>');
document.write('<script src="js/canvas.js"><\/script>');
document.write('<script src="js/inspector.js"><\/script>');
document.write('<script src="js/toolbar.js"><\/script>');
document.write('<script src="js/header-footer.js"><\/script>');
document.write('<script src="js/modals.js"><\/script>');
document.write('<script src="js/preview.js"><\/script>');
document.write('<script src="js/supabase-config.js"><\/script>');
document.write('<script src="js/supabase.js"><\/script>');

document.addEventListener('DOMContentLoaded', () => {
  window.WebBuilderCanvas?.render?.();
  window.WebBuilderHeaderFooter?.normalizeState?.();
  window.WebBuilderCart?.normalizeState?.();
  window.WebBuilderPreview?.bindToggle?.();
});
