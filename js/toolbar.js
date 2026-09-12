// WebBuilder toolbar service
// Shared toolbar actions for zoom, canvas sizing and history. Button
// wiring (save/undo/redo) lives here too since these are the DOM controls
// this module conceptually owns.
(() => {
  const state = window.WebBuilderState;
  const canvas = window.WebBuilderCanvas;
  const history = window.WebBuilderHistory;
  const storage = window.WebBuilderStorage;
  if (!state || !canvas || !history || !storage) {
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

  // canvas.extendCanvas() already owns the history transaction.
  function extendCanvas(delta = 300) {
    return canvas.extendCanvas(delta);
  }

  // Re-renders every UI area derived from state (canvas, header/footer,
  // cart, products). Used after undo/redo and by Supabase after a cloud
  // load, so both paths stay in sync via one function.
  function refreshAllDomains() {
    window.WebBuilderCanvas?.render?.();
    window.WebBuilderHeaderFooter?.normalizeState?.();
    window.WebBuilderHeaderFooterRuntime?.render?.();
    window.WebBuilderCart?.normalizeState?.();
    window.WebBuilderCartRuntime?.render?.();
    window.WebBuilderProductsRuntime?.render?.();
    window.WebBuilderCartConfigRuntime?.render?.();
  }

  function undo() {
    const snapshot = history.undoSnapshot();
    if (!snapshot) return false;
    storage.applySnapshot(snapshot, state);
    refreshAllDomains();
    return true;
  }

  function redo() {
    const snapshot = history.redoSnapshot();
    if (!snapshot) return false;
    storage.applySnapshot(snapshot, state);
    refreshAllDomains();
    return true;
  }

  function clearHistory() {
    history.clear();
  }

  function updateUndoRedoButtons() {
    const undoBtn = document.getElementById("btn-undo");
    const redoBtn = document.getElementById("btn-redo");
    if (undoBtn) undoBtn.disabled = state.historyStack.length === 0;
    if (redoBtn) redoBtn.disabled = state.redoStack.length === 0;
  }

  function bindButtons() {
    const saveBtn = document.getElementById("btn-save");
    const undoBtn = document.getElementById("btn-undo");
    const redoBtn = document.getElementById("btn-redo");

    if (saveBtn && saveBtn.dataset.webBuilderToolbarBound !== "true") {
      saveBtn.dataset.webBuilderToolbarBound = "true";
      saveBtn.addEventListener("click", e => {
        e.preventDefault();
        const ok = storage.save();
        window.WebBuilderToast?.show?.(ok ? "Projekt gespeichert 💾" : "Speichern fehlgeschlagen", ok ? "success" : "danger");
      });
    }
    if (undoBtn && undoBtn.dataset.webBuilderToolbarBound !== "true") {
      undoBtn.dataset.webBuilderToolbarBound = "true";
      undoBtn.addEventListener("click", e => {
        e.preventDefault();
        const ok = undo();
        window.WebBuilderToast?.show?.(ok ? "Rückgängig gemacht" : "Nichts zum Rückgängigmachen", "info");
        updateUndoRedoButtons();
      });
    }
    if (redoBtn && redoBtn.dataset.webBuilderToolbarBound !== "true") {
      redoBtn.dataset.webBuilderToolbarBound = "true";
      redoBtn.addEventListener("click", e => {
        e.preventDefault();
        const ok = redo();
        window.WebBuilderToast?.show?.(ok ? "Wiederholt" : "Nichts zum Wiederholen", "info");
        updateUndoRedoButtons();
      });
    }

    updateUndoRedoButtons();
    state.subscribe?.(() => updateUndoRedoButtons());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindButtons, { once: true });
  } else {
    bindButtons();
  }

  window.WebBuilderToolbar = {
    zoomIn,
    zoomOut,
    resetZoom,
    extendCanvas,
    undo,
    redo,
    clearHistory,
    updateUndoRedoButtons,
    // Also called by js/Supabase/supabase-data.js after a cloud load.
    refreshAllDomains
  };
})();
