// WebBuilder bootstrap
// Loads shared state first, then the legacy editor implementation.
// The current DOMContentLoaded lifecycle stays unchanged during the safe migration.
document.write('<script src="js/state.js"><\/script>');
document.write('<script src="js/builder-core.js"><\/script>');
