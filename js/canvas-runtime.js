// WebBuilder Canvas runtime takeover
//
// Transitional migration layer: the legacy editor still contains its old
// canvas implementation, but this module takes ownership of the live DOM
// interactions that can be migrated safely without editing the monolithic
// legacy file. Once the legacy implementation is removed, this layer can be
// folded into canvas.js / canvas-viewport.js.
(() => {
  const state = window.WebBuilderState;
  const canvas = window.WebBuilderCanvas;
  const renderer = window.WebBuilderCanvasRenderer;

  if (!state || !canvas || !renderer) {
    console.error("WebBuilderCanvasRuntime: required canvas services missing.");
    return;
  }

  function isEditorEventTarget(target, id) {
    return target && (target.id === id || target.closest?.(`#${id}`));
  }

  function handleCanvasControls(event) {
    if (state.isPreviewMode) return;

    if (isEditorEventTarget(event.target, "zoom-in")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      canvas.zoomIn(false);
      return;
    }

    if (isEditorEventTarget(event.target, "zoom-out")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      canvas.zoomOut(false);
      return;
    }

    if (isEditorEventTarget(event.target, "zoom-reset")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      canvas.resetZoom(false);
      return;
    }

    if (isEditorEventTarget(event.target, "btn-extend-canvas") ||
        isEditorEventTarget(event.target, "btn-extend-canvas-side")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      canvas.extendCanvas(300);
      return;
    }

    if (isEditorEventTarget(event.target, "btn-shrink-canvas-side")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      canvas.extendCanvas(-300);
    }
  }

  function renderModularCanvas() {
    renderer.renderCanvas();
    canvas.setBackground(state.background);
    canvas.syncDom();
  }

  // Capture phase runs before the legacy editor's bubble-phase handlers.
  // This lets the extracted viewport own the migrated canvas controls.
  document.addEventListener("click", handleCanvasControls, true);

  document.addEventListener("DOMContentLoaded", () => {
    // Let the legacy editor finish its initial DOM setup first. We then
    // replace its placed-element DOM with the modular renderer so the live
    // canvas uses the extracted interaction/rendering services.
    window.setTimeout(() => {
      renderModularCanvas();
    }, 0);
  });

  window.WebBuilderCanvasRuntime = {
    render: renderModularCanvas
  };
})();
