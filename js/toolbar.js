// WebBuilder toolbar service
// Shared toolbar actions for zoom, canvas sizing and history.
// Button wiring lives here too (save/undo/redo) since these are the DOM
// controls this module conceptually owns.
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

  // FIX: previously called `window.WebBuilderCanvasRuntime?.render?.()`,
  // which no module ever exports (canvas.js exports `WebBuilderCanvas`).
  // Undo/redo silently restored state but never refreshed the canvas,
  // header/footer bars, cart drawer or product list on screen.
  //
  // Additiv jetzt auch über window.WebBuilderToolbar exponiert (siehe unten),
  // damit js/supabase.js nach einem Cloud-Laden exakt dieselbe Refresh-Logik
  // wiederverwenden kann statt sie ein zweites Mal zu implementieren
  // (Projektregel 12).
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

  // FIX: btn-save / btn-undo / btn-redo existed in web.html and toolbar.js
  // exported working functions, but nothing ever connected the two.
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
    // NEU: additiv exponiert für js/supabase.js (Cloud-Laden soll denselben
    // Refresh wie Undo/Redo auslösen, ohne die Logik zu duplizieren).
    refreshAllDomains
  };
})();
