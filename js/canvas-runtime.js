// WebBuilder Canvas runtime takeover
// Owns migrated canvas controls and routes preview clicks through the
// extracted action runtime. The legacy editor remains only as a transition
// layer until its duplicated canvas implementation is removed.
(() => {
  const state = window.WebBuilderState;
  const canvas = window.WebBuilderCanvas;
  const renderer = window.WebBuilderCanvasRenderer;
  const actions = window.WebBuilderActionRuntime;

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

  function handlePreviewAction(item) {
    if (!state.isPreviewMode || !actions || !item) return false;
    return actions.execute(item);
  }

  function renderModularCanvas() {
    renderer.setCallbacks({ onAction: handlePreviewAction });
    renderer.renderCanvas();
    canvas.setBackground(state.background);
    canvas.syncDom();
  }

  document.addEventListener("click", handleCanvasControls, true);

  document.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(renderModularCanvas, 0);
  });

  window.WebBuilderCanvasRuntime = {
    render: renderModularCanvas,
    resize: delta => canvas.extendCanvas(delta),
    executeAction: handlePreviewAction
  };
})();
