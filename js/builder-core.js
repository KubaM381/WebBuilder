// WebBuilder core orchestration layer
//
// The former monolithic editor implementation is preserved in builder-legacy.js
// during the staged migration. Shared services are loaded by builder.js before
// this file. Keeping this loader stable lets us extract functionality from the
// legacy implementation without changing the page entry point.

document.write('<script src="js/builder-legacy.js"><\/script>');
