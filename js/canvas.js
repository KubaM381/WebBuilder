// WebBuilder canvas service
// Shared canvas/coordinate utilities used by the staged editor migration.
// DOM rendering remains in builder-legacy.js for now.

(() => {
  const state = window.WebBuilderState;
  if (!state) {
    console.error("WebBuilderCanvas: WebBuilderState is not available.");
    return;
  }

  function getCanvas() { return document.getElementById("canvas"); }
  function getCanvasColumn() { return document.getElementById("canvas-column"); }

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
  function zoomIn(isPreviewMode = state.isPreviewMode) { return setZoom(Number((state.zoomLevel + 0.1).toFixed(2)), isPreviewMode); }
  function zoomOut(isPreviewMode = state.isPreviewMode) { return setZoom(Number((state.zoomLevel - 0.1).toFixed(2)), isPreviewMode); }
  function resetZoom(isPreviewMode = state.isPreviewMode) { return setZoom(1, isPreviewMode); }

  function setCanvasHeight(height) {
    const canvas = getCanvas();
    state.canvasHeight = Math.max(400, Number(height) || 1100);
    if (canvas) canvas.style.minHeight = state.canvasHeight + "px";
    return state.canvasHeight;
  }
  function extendCanvas(delta) { return setCanvasHeight(state.canvasHeight + Number(delta || 0)); }

  function toLocalCoords(containerEl, clientX, clientY) {
    if (!containerEl) return { x: 0, y: 0 };
    const rect = containerEl.getBoundingClientRect();
    const zoom = Number(state.zoomLevel) || 1;
    return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
  }

  function makeDraggable(domEl, item, containerEl, opts = {}) {
    if (!domEl || !item || !containerEl) return;
    domEl.addEventListener("mousedown", (event) => {
      if (state.isPreviewMode) return;
      event.stopPropagation();
      const start = toLocalCoords(containerEl, event.clientX, event.clientY);
      const offsetX = start.x - (Number(item.x) || 0);
      const offsetY = start.y - (Number(item.y) || 0);
      const minX = opts.minX != null ? opts.minX : 0;
      const minY = opts.minY != null ? opts.minY : 0;
      const maxX = opts.maxX != null ? opts.maxX : Infinity;
      const maxY = opts.maxY != null ? opts.maxY : Infinity;
      const onMove = (moveEvent) => {
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
    getCanvas,
    getCanvasColumn,
    applyZoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setCanvasHeight,
    extendCanvas,
    toLocalCoords,
    makeDraggable
  };
})();
