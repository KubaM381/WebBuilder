// WebBuilder canvas viewport service
// Owns zoom, coordinate conversion, and canvas sizing.
(() => {
  const state = window.WebBuilderState;
  if (!state) return;

  const ZOOM_MIN = 0.3;
  const ZOOM_MAX = 1.5;
  const CANVAS_MIN_HEIGHT = 400;
  const DEFAULT_ZOOM = 0.85;
  const DEFAULT_CANVAS_HEIGHT = 1100;

  const getCanvas = () => document.getElementById("canvas");
  const getCanvasColumn = () => document.getElementById("canvas-column");

  function normalizeState() {
    const zoom = Number(state.zoomLevel);
    const height = Number(state.canvasHeight);
    state.zoomLevel = Number.isFinite(zoom) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) : DEFAULT_ZOOM;
    state.canvasHeight = Number.isFinite(height) ? Math.max(CANVAS_MIN_HEIGHT, height) : DEFAULT_CANVAS_HEIGHT;
    return { zoomLevel: state.zoomLevel, canvasHeight: state.canvasHeight };
  }

  function applyZoom(isPreviewMode = state.isPreviewMode) {
    normalizeState();
    const column = getCanvasColumn();
    if (!column) return;
    column.style.transform = isPreviewMode ? "none" : `scale(${state.zoomLevel})`;
    if (!isPreviewMode) column.style.transformOrigin = "top center";
    const label = document.getElementById("zoom-level");
    if (label && !isPreviewMode) label.textContent = Math.round(state.zoomLevel * 100) + "%";
  }

  function setZoom(value, isPreviewMode = state.isPreviewMode) {
    const next = Number(value);
    state.zoomLevel = Number.isFinite(next) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next)) : DEFAULT_ZOOM;
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
    const next = Number(height);
    state.canvasHeight = Number.isFinite(next) ? Math.max(CANVAS_MIN_HEIGHT, next) : DEFAULT_CANVAS_HEIGHT;
    if (canvas) canvas.style.minHeight = state.canvasHeight + "px";
    return state.canvasHeight;
  }

  function extendCanvas(delta) {
    const amount = Number(delta);
    return setCanvasHeight(state.canvasHeight + (Number.isFinite(amount) ? amount : 0));
  }

  function toLocalCoords(containerEl, clientX, clientY) {
    if (!containerEl) return { x: 0, y: 0 };
    const rect = containerEl.getBoundingClientRect();
    const zoom = Number(state.zoomLevel) || 1;
    return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
  }

  function syncDom() {
    normalizeState();
    setCanvasHeight(state.canvasHeight);
    applyZoom(state.isPreviewMode);
    return { zoomLevel: state.zoomLevel, canvasHeight: state.canvasHeight };
  }

  window.WebBuilderCanvasViewport = {
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
    toLocalCoords,
    syncDom,
    constants: { ZOOM_MIN, ZOOM_MAX, CANVAS_MIN_HEIGHT, DEFAULT_ZOOM, DEFAULT_CANVAS_HEIGHT }
  };
})();
