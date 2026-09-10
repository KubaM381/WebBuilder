// WebBuilder preview service
// Owns editor/preview mode state, DOM class handling and the mode-toggle UI.

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
    if (window.WebBuilderCanvasRuntime?.render) window.WebBuilderCanvasRuntime.render();

    state.notify?.({
      domain: "preview",
      type: state.isPreviewMode ? "enter" : "exit"
    });

    return state.isPreviewMode;
  }

  function enter() { return apply(true); }
  function exit() { return apply(false); }
  function toggle() { return apply(!state.isPreviewMode); }

  function bindToggle() {
    const button = document.getElementById("btn-mode-toggle");
    if (!button || button.dataset.webBuilderPreviewBound === "true") return;
    button.dataset.webBuilderPreviewBound = "true";
    button.addEventListener("click", event => {
      event.preventDefault();
      toggle();
    });
  }

  window.WebBuilderPreview = { isPreview, apply, enter, exit, toggle, bindToggle };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindToggle, { once: true });
  } else {
    bindToggle();
  }
})();
