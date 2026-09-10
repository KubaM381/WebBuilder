// WebBuilder bootstrap
// Loads shared services first, then the legacy editor implementation.
// The DOMContentLoaded lifecycle stays unchanged during the safe migration.
document.write('<script src="js/state.js"><\/script>');
document.write('<script src="js/storage.js"><\/script>');
document.write('<script src="js/legacy-bridge.js"><\/script>');
document.write('<script src="js/builder-core.js"><\/script>');
