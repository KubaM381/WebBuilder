// WebBuilder Canvas runtime takeover
// Owns migrated canvas controls and routes preview clicks through the
// extracted action runtime. The legacy editor remains as a transition layer.
(() => {
  const state = window.WebBuilderState;
  const canvas = window.WebBuilderCanvas;
  const renderer = window.WebBuilderCanvasRenderer;
  const actions = window.WebBuilderActionRuntime;

  if (!state || !canvas || !renderer) {
    console.error("WebBuilderCanvasRuntime: required canvas services missing.");
    return;
  }

  let renderQueued = false;

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

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    window.requestAnimationFrame?.(() => {
      renderQueued = false;
      renderModularCanvas();
    }) || window.setTimeout(() => {
      renderQueued = false;
      renderModularCanvas();
    }, 0);
  }

  state.subscribe?.(event => {
    const domain = event?.domain;
    if (["elements", "selection", "preview", "canvas", "background"].includes(domain)) {
      scheduleRender();
    }
  });

  window.addEventListener("webbuilder:state-change", event => {
    const domain = event.detail?.domain;
    if (["elements", "selection", "preview", "canvas", "background"].includes(domain)) {
      scheduleRender();
    }
  });

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
