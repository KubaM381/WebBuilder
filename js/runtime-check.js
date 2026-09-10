// WebBuilder runtime / migration health check
// Keeps the staged migration observable without touching legacy lexical state.
(() => {
  const required = [
    "WebBuilderState",
    "WebBuilderStorage",
    "WebBuilderHistory",
    "WebBuilderCanvas",
    "WebBuilderCanvasRuntime",
    "WebBuilderElements",
    "WebBuilderInspector",
    "WebBuilderHeaderFooter",
    "WebBuilderProducts",
    "WebBuilderCart",
    "WebBuilderModals",
    "WebBuilderPreview",
    "WebBuilderLegacyBridge"
  ];

  function check() {
    const missing = required.filter(name => !window[name]);
    const bridge = window.WebBuilderLegacyBridge;
    const migration = window.WebBuilderMigration;
    const canvasRuntime = window.WebBuilderCanvasRuntime;
    const products = window.WebBuilderProducts;
    const cart = window.WebBuilderCart;
    const result = {
      ok: missing.length === 0,
      missing,
      legacyAdapterRegistered: !!(bridge && bridge.hasLegacyAdapter && bridge.hasLegacyAdapter()),
      sharedState: !!window.WebBuilderState,
      canvasRuntime: !!canvasRuntime,
      productsService: !!products,
      cartService: !!cart,
      migrationCoordinator: !!migration,
      migrationStatus: migration && typeof migration.status === "function" ? migration.status() : null,
      hydration: migration ? migration.hydration || null : null
    };

    window.WebBuilderRuntime = result;

    if (result.ok) {
      console.info(
        "WebBuilder runtime ready. Legacy adapter:",
        result.legacyAdapterRegistered ? "connected" : "not connected (migration pending)"
      );
      if (result.hydration && result.hydration.ok) {
        console.info(
          "WebBuilder migration hydration ready:",
          result.hydration.cartItems,
          "cart items /",
          result.hydration.products,
          "products"
        );
      }
    } else {
      console.error("WebBuilder runtime incomplete. Missing services:", missing);
    }

    return result;
  }

  window.WebBuilderRuntimeCheck = check;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", check, { once: true });
  } else {
    check();
  }
})();
