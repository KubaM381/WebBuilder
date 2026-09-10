// WebBuilder core orchestration layer
//
// The staged legacy editor has been removed. All live builder behavior is now
// provided by the modular services loaded by builder.js.

(() => {
  const required = [
    "WebBuilderState",
    "WebBuilderCanvasRuntime",
    "WebBuilderElements",
    "WebBuilderInspector",
    "WebBuilderProducts",
    "WebBuilderCart",
    "WebBuilderHeaderFooter",
    "WebBuilderPreview"
  ];

  const missing = required.filter(name => !window[name]);
  if (missing.length) {
    console.error("WebBuilder core incomplete. Missing services:", missing);
    return;
  }

  // Final modular initialization pass.
  window.WebBuilderCanvasRuntime.render();
  window.WebBuilderHeaderFooterRuntime?.render();
  window.WebBuilderProductsRuntime?.render?.();
  window.WebBuilderCartRuntime?.render?.();
  window.WebBuilderCartConfigRuntime?.render?.();
  window.WebBuilderInspectorPropertiesRuntime?.render?.();
  window.WebBuilderInspectorSpecialRuntime?.render?.();

  console.info("WebBuilder core ready: modular runtime active.");
})();
