// WebBuilder runtime health check
// Verifies the modular runtime after the legacy editor removal.
(() => {
  const required = [
    "WebBuilderState",
    "WebBuilderStorage",
    "WebBuilderHistory",
    "WebBuilderCanvas",
    "WebBuilderCanvasRuntime",
    "WebBuilderActionRuntime",
    "WebBuilderElements",
    "WebBuilderInspector",
    "WebBuilderInspectorActionsRuntime",
    "WebBuilderInspectorPropertiesRuntime",
    "WebBuilderInspectorSpecialRuntime",
    "WebBuilderHeaderFooter",
    "WebBuilderHeaderFooterRuntime",
    "WebBuilderProducts",
    "WebBuilderProductsRuntime",
    "WebBuilderCart",
    "WebBuilderCartRuntime",
    "WebBuilderCartConfigRuntime",
    "WebBuilderModals",
    "WebBuilderPreview",
    "WebBuilderMigration"
  ];

  function check() {
    const missing = required.filter(name => !window[name]);
    const migration = window.WebBuilderMigration;
    const result = {
      ok: missing.length === 0,
      missing,
      legacyEditor: false,
      sharedState: !!window.WebBuilderState,
      canvasRuntime: !!window.WebBuilderCanvasRuntime,
      actionRuntime: !!window.WebBuilderActionRuntime,
      inspectorActionsRuntime: !!window.WebBuilderInspectorActionsRuntime,
      inspectorPropertiesRuntime: !!window.WebBuilderInspectorPropertiesRuntime,
      inspectorSpecialRuntime: !!window.WebBuilderInspectorSpecialRuntime,
      headerFooterRuntime: !!window.WebBuilderHeaderFooterRuntime,
      productsService: !!window.WebBuilderProducts,
      productsRuntime: !!window.WebBuilderProductsRuntime,
      cartService: !!window.WebBuilderCart,
      cartRuntime: !!window.WebBuilderCartRuntime,
      cartConfigRuntime: !!window.WebBuilderCartConfigRuntime,
      migrationCoordinator: !!migration,
      migrationStatus: migration && typeof migration.status === "function" ? migration.status() : null,
      hydration: migration ? migration.hydration || null : null
    };

    window.WebBuilderRuntime = result;
    if (result.ok) {
      console.info("WebBuilder runtime ready. Modular-only architecture active.");
    } else {
      console.error("WebBuilder runtime incomplete. Missing services:", missing);
    }
    return result;
  }

  window.WebBuilderRuntimeCheck = check;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", check, { once: true });
  else check();
})();
