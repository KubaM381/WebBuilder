// WebBuilder canvas service
// Shared canvas/coordinate utilities for the staged editor migration.
(() => {
  const state = window.WebBuilderState;
  if (!state) return;

  const ZOOM_MIN = 0.3;
  const ZOOM_MAX = 1.5;
  const CANVAS_MIN_HEIGHT = 400;
  const DEFAULT_ZOOM = 0.85;
  const DEFAULT_CANVAS_HEIGHT = 1100;

  function getCanvas() { return document.getElementById("canvas"); }
  function getCanvasColumn() { return document.getElementById("canvas-column"); }

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
  function zoomIn(isPreviewMode = state.isPreviewMode) { return setZoom(Number((state.zoomLevel + 0.1).toFixed(2)), isPreviewMode); }
  function zoomOut(isPreviewMode = state.isPreviewMode) { return setZoom(Number((state.zoomLevel - 0.1).toFixed(2)), isPreviewMode); }
  function resetZoom(isPreviewMode = state.isPreviewMode) { return setZoom(1, isPreviewMode); }

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

  function syncDom() {
    normalizeState();
    setCanvasHeight(state.canvasHeight);
    applyZoom(state.isPreviewMode);
    return { zoomLevel: state.zoomLevel, canvasHeight: state.canvasHeight };
  }

  function toLocalCoords(containerEl, clientX, clientY) {
    if (!containerEl) return { x: 0, y: 0 };
    const rect = containerEl.getBoundingClientRect();
    const zoom = Number(state.zoomLevel) || 1;
    return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
  }

  function makeDraggable(domEl, item, containerEl, opts = {}) {
    if (!domEl || !item || !containerEl) return;
    domEl.addEventListener("mousedown", event => {
      if (state.isPreviewMode) return;
      event.stopPropagation();
      const start = toLocalCoords(containerEl, event.clientX, event.clientY);
      const offsetX = start.x - (Number(item.x) || 0);
      const offsetY = start.y - (Number(item.y) || 0);
      const minX = opts.minX != null ? opts.minX : 0;
      const minY = opts.minY != null ? opts.minY : 0;
      const maxX = opts.maxX != null ? opts.maxX : Infinity;
      const maxY = opts.maxY != null ? opts.maxY : Infinity;
      const onMove = moveEvent => {
        const point = toLocalCoords(containerEl, moveEvent.clientX, moveEvent.clientY);
        item.x = Math.min(maxX, Math.max(minX, point.x - offsetX));
        item.y = Math.min(maxY, Math.max(minY, point.y - offsetY));
        domEl.style.left = item.x + "px";
        domEl.style.top = item.y + "px";
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        if (window.WebBuilderHistory) window.WebBuilderHistory.commit();
      };
      if (window.WebBuilderHistory) window.WebBuilderHistory.arm();
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  window.WebBuilderCanvas = {
    getCanvas, getCanvasColumn, normalizeState, applyZoom, setZoom,
    zoomIn, zoomOut, resetZoom, setCanvasHeight, extendCanvas, syncDom,
    toLocalCoords, makeDraggable,
    constants: { ZOOM_MIN, ZOOM_MAX, CANVAS_MIN_HEIGHT, DEFAULT_ZOOM, DEFAULT_CANVAS_HEIGHT }
  };
})();
