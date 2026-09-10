// WebBuilder runtime / migration health check
// Keeps the staged migration observable without touching legacy lexical state.
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
    "WebBuilderLegacyBridge"
  ];

  function check() {
    const missing = required.filter(name => !window[name]);
    const bridge = window.WebBuilderLegacyBridge;
    const migration = window.WebBuilderMigration;
    const canvasRuntime = window.WebBuilderCanvasRuntime;
    const headerFooterRuntime = window.WebBuilderHeaderFooterRuntime;
    const result = {
      ok: missing.length === 0,
      missing,
      legacyAdapterRegistered: !!(bridge && bridge.hasLegacyAdapter && bridge.hasLegacyAdapter()),
      sharedState: !!window.WebBuilderState,
      canvasRuntime: !!canvasRuntime,
      actionRuntime: !!window.WebBuilderActionRuntime,
      inspectorActionsRuntime: !!window.WebBuilderInspectorActionsRuntime,
      inspectorPropertiesRuntime: !!window.WebBuilderInspectorPropertiesRuntime,
      inspectorSpecialRuntime: !!window.WebBuilderInspectorSpecialRuntime,
      headerFooterRuntime: !!headerFooterRuntime,
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
      console.info("WebBuilder runtime ready. Legacy adapter:", result.legacyAdapterRegistered ? "connected" : "not connected (migration pending)");
    } else {
      console.error("WebBuilder runtime incomplete. Missing services:", missing);
    }
    return result;
  }

  window.WebBuilderRuntimeCheck = check;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", check, { once: true });
  else check();
})();
