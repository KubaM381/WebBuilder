// WebBuilder canvas service
// Transitional canvas module for the staged editor refactor.
//
// This module owns reusable canvas mechanics that do not need access to the
// legacy editor's private variables. The legacy renderer remains in
// builder-legacy.js until its dependencies can be migrated safely.

(() => {
  const state = window.WebBuilderState;

  if (!state) {
    console.error("WebBuilderCanvas: WebBuilderState is not available.");
    return;
  }

  function getCanvas() {
    return document.getElementById("canvas");
  }

  function getCanvasColumn() {
    return document.getElementById("canvas-column");
  }

  function applyZoom(isPreviewMode = state.isPreviewMode) {
    const canvasColumn = getCanvasColumn();
    if (!canvasColumn) return;

    if (isPreviewMode) {
      canvasColumn.style.transform = "none";
      return;
    }

    canvasColumn.style.transform = `scale(${state.zoomLevel})`;
    canvasColumn.style.transformOrigin = "top center";

    const label = document.getElementById("zoom-level");
    if (label) label.textContent = Math.round(state.zoomLevel * 100) + "%";
  }

  function setZoom(value, isPreviewMode = state.isPreviewMode) {
    state.zoomLevel = Math.min(1.5, Math.max(0.3, Number(value) || 0.85));
    applyZoom(isPreviewMode);
    return state.zoomLevel;
  }

  function zoomIn(isPreviewMode = state.isPreviewMode) {
    return setZoom(Number((state.zoomLevel + 0.1).toFixed(2)), isPreviewMode);
  }

  function zoomOut(isPreviewMode = state.isPreviewMode) {
    return setZoom(Number((state.zoomLevel - 0.1).toFixed(2)), isPreviewMode);
  }

  function resetZoom(isPreviewMode = state.isPreviewMode) {
    return setZoom(1, isPreviewMode);
  }

  function setCanvasHeight(height) {
    const canvas = getCanvas();
    state.canvasHeight = Math.max(400, Number(height) || 1100);
    if (canvas) canvas.style.minHeight = state.canvasHeight + "px";
    return state.canvasHeight;
  }

  function extendCanvas(delta) {
    return setCanvasHeight(state.canvasHeight + Number(delta || 0));
  }

  function toLocalCoords(containerEl, clientX, clientY) {
    if (!containerEl) return { x: 0, y: 0 };

    const rect = containerEl.getBoundingClientRect();
    const zoom = Number(state.zoomLevel) || 1;

    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom
    };
  }

  window.WebBuilderCanvas = {
    getCanvas,
    getCanvasColumn,
    applyZoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setCanvasHeight,
    extendCanvas,
    toLocalCoords
  };
})();
