// WebBuilder toolbar service
// Shared toolbar actions for zoom, canvas sizing and history.
// Button wiring remains in builder-legacy.js during the staged migration.

(() => {
  const state = window.WebBuilderState;
  const canvas = window.WebBuilderCanvas;
  const history = window.WebBuilderHistory;
  if (!state || !canvas || !history) {
    console.error("WebBuilderToolbar: shared services missing.");
    return;
  }

  function zoomIn() {
    return canvas.zoomIn(state.isPreviewMode);
  }

  function zoomOut() {
    return canvas.zoomOut(state.isPreviewMode);
  }

  function resetZoom() {
    return canvas.resetZoom(state.isPreviewMode);
  }

  function extendCanvas(delta = 300) {
    history.push();
    return canvas.extendCanvas(delta);
  }

  function undo() {
    const snapshot = history.undoSnapshot();
    if (!snapshot) return false;
    window.WebBuilderStorage.applySnapshot(snapshot, state);
    return true;
  }

  function redo() {
    const snapshot = history.redoSnapshot();
    if (!snapshot) return false;
    window.WebBuilderStorage.applySnapshot(snapshot, state);
    return true;
  }

  function clearHistory() {
    history.clear();
  }

  window.WebBuilderToolbar = {
    zoomIn,
    zoomOut,
    resetZoom,
    extendCanvas,
    undo,
    redo,
    clearHistory
  };
})();
