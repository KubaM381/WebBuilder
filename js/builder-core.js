// WebBuilder core orchestration layer
//
// The former monolithic editor implementation is preserved in builder-legacy.js
// during the staged migration. Shared services are loaded by builder.js before
// this file. The legacy canvas is followed by a modular takeover guard so the
// extracted renderer remains the visual source of truth during the transition.

document.write('<script src="js/builder-legacy.js"><\/script>');
document.write('<script src="js/legacy-canvas-takeover.js"><\/script>');
