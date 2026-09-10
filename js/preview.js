// WebBuilder preview service
// Centralises editor/preview mode state and DOM class handling.
// The legacy toolbar remains the caller until the final integration step.

(() => {
  const state = window.WebBuilderState;
  if (!state) {
    console.error("WebBuilderPreview: WebBuilderState is not available.");
    return;
  }

  function isPreview() {
    return !!state.isPreviewMode;
  }

  function apply(mode = state.isPreviewMode) {
    state.isPreviewMode = !!mode;
    document.body.classList.toggle("preview-mode", state.isPreviewMode);
    const button = document.getElementById("btn-mode-toggle");
    if (button) button.innerHTML = state.isPreviewMode ? "✏️ Editor-Modus" : "👁️ Vorschau";
    if (window.WebBuilderCanvas) window.WebBuilderCanvas.applyZoom(state.isPreviewMode);
    return state.isPreviewMode;
  }

  function enter() {
    return apply(true);
  }

  function exit() {
    return apply(false);
  }

  function toggle() {
    return apply(!state.isPreviewMode);
  }

  window.WebBuilderPreview = {
    isPreview,
    apply,
    enter,
    exit,
    toggle
  };
})();
