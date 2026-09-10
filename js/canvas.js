// WebBuilder canvas service
// Central facade for the canvas domain. Domain-specific work lives in
// canvas-viewport.js, canvas-interaction.js and canvas-renderer.js.
(() => {
  const state = window.WebBuilderState;
  const viewport = window.WebBuilderCanvasViewport;
  const interaction = window.WebBuilderCanvasInteraction;
  const renderer = window.WebBuilderCanvasRenderer;

  if (!state) return;

  function getCanvas() {
    return viewport ? viewport.getCanvas() : document.getElementById("canvas");
  }

  function getCanvasColumn() {
    return viewport ? viewport.getCanvasColumn() : document.getElementById("canvas-column");
  }

  function normalizeState() {
    return viewport ? viewport.normalizeState() : null;
  }

  function applyZoom(isPreviewMode = state.isPreviewMode) {
    return viewport ? viewport.applyZoom(isPreviewMode) : undefined;
  }

  function setZoom(value, isPreviewMode = state.isPreviewMode) {
    return viewport ? viewport.setZoom(value, isPreviewMode) : state.zoomLevel;
  }

  function zoomIn(isPreviewMode = state.isPreviewMode) {
    return viewport ? viewport.zoomIn(isPreviewMode) : state.zoomLevel;
  }

  function zoomOut(isPreviewMode = state.isPreviewMode) {
    return viewport ? viewport.zoomOut(isPreviewMode) : state.zoomLevel;
  }

  function resetZoom(isPreviewMode = state.isPreviewMode) {
    return viewport ? viewport.resetZoom(isPreviewMode) : state.zoomLevel;
  }

  function setCanvasHeight(height) {
    return viewport ? viewport.setCanvasHeight(height) : state.canvasHeight;
  }

  function extendCanvas(delta) {
    return viewport ? viewport.extendCanvas(delta) : state.canvasHeight;
  }

  function syncDom() {
    return viewport ? viewport.syncDom() : null;
  }

  function toLocalCoords(containerEl, clientX, clientY) {
    return interaction ? interaction.toLocalCoords(containerEl, clientX, clientY)
      : (viewport ? viewport.toLocalCoords(containerEl, clientX, clientY) : { x: 0, y: 0 });
  }

  function makeDraggable(domEl, item, containerEl, opts = {}) {
    return interaction ? interaction.makeDraggable(domEl, item, containerEl, opts) : undefined;
  }

  function renderCanvas() {
    return renderer ? renderer.renderCanvas() : false;
  }

  function render() {
    if (!renderer) return false;
    renderer.setBackground(state.background);
    return renderer.renderCanvas();
  }

  function setBackground(background = state.background) {
    return renderer ? renderer.setBackground(background) : false;
  }

  function setRendererCallbacks(callbacks = {}) {
    return renderer && typeof renderer.setCallbacks === "function"
      ? renderer.setCallbacks(callbacks)
      : false;
  }

  const constants = viewport ? viewport.constants : {
    ZOOM_MIN: 0.3,
    ZOOM_MAX: 1.5,
    CANVAS_MIN_HEIGHT: 400,
    DEFAULT_ZOOM: 0.85,
    DEFAULT_CANVAS_HEIGHT: 1100
  };

  window.WebBuilderCanvas = {
    getCanvas,
    getCanvasColumn,
    normalizeState,
    applyZoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setCanvasHeight,
    extendCanvas,
    syncDom,
    toLocalCoords,
    makeDraggable,
    renderCanvas,
    render,
    setBackground,
    setRendererCallbacks,
    constants
  };
})();
