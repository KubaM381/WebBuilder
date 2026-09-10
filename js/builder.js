// WebBuilder bootstrap
// Loads shared services first, then the legacy editor implementation.
// The DOMContentLoaded lifecycle stays unchanged during the safe migration.
document.write('<script src="js/state.js"><\/script>');
document.write('<script src="js/storage.js"><\/script>');
document.write('<script src="js/history.js"><\/script>');
document.write('<script src="js/canvas.js"><\/script>');
document.write('<script src="js/elements.js"><\/script>');
document.write('<script src="js/inspector.js"><\/script>');
document.write('<script src="js/toolbar.js"><\/script>');
document.write('<script src="js/header-footer.js"><\/script>');
document.write('<script src="js/cart.js"><\/script>');
document.write('<script src="js/modals.js"><\/script>');
document.write('<script src="js/preview.js"><\/script>');
document.write('<script src="js/legacy-bridge.js"><\/script>');
document.write('<script src="js/runtime-check.js"><\/script>');
document.write('<script src="js/builder-core.js"><\/script>');