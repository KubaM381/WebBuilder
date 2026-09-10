// WebBuilder runtime / migration health check
// Keeps the staged migration observable without touching legacy lexical state.
(() => {
  const required = [
    "WebBuilderState",
    "WebBuilderStorage",
    "WebBuilderHistory",
    "WebBuilderCanvas",
    "WebBuilderElements",
    "WebBuilderInspector",
    "WebBuilderHeaderFooter",
    "WebBuilderCart",
    "WebBuilderModals",
    "WebBuilderPreview",
    "WebBuilderLegacyBridge"
  ];

  function check() {
    const missing = required.filter(name => !window[name]);
    const bridge = window.WebBuilderLegacyBridge;
    const result = {
      ok: missing.length === 0,
      missing,
      legacyAdapterRegistered: !!(bridge && bridge.hasLegacyAdapter && bridge.hasLegacyAdapter()),
      sharedState: !!window.WebBuilderState
    };

    window.WebBuilderRuntime = result;

    if (result.ok) {
      console.info(
        "WebBuilder runtime ready. Legacy adapter:",
        result.legacyAdapterRegistered ? "connected" : "not connected (migration pending)"
      );
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
