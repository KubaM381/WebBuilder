// WebBuilder history service
// Transitional adapter for the legacy editor history system.
//
// This module deliberately does not replace builder-core.js history yet.
// It provides the shared API that the legacy implementation can migrate to
// without creating another state/history container.

(() => {
  const state = window.WebBuilderState;
  const storage = window.WebBuilderStorage;

  if (!state || !storage) {
    console.error("WebBuilderHistory: state/storage service missing.");
    return;
  }

  function snapshot() {
    return storage.createSnapshot(state);
  }

  function push(snapshotValue) {
    return storage.pushHistory(snapshotValue || snapshot());
  }

  function arm() {
    return storage.armHistory();
  }

  function commit() {
    return storage.commitHistory();
  }

  function undoSnapshot() {
    if (!state.historyStack.length) return null;

    state.redoStack.push(snapshot());
    return state.historyStack.pop();
  }

  function redoSnapshot() {
    if (!state.redoStack.length) return null;

    state.historyStack.push(snapshot());
    return state.redoStack.pop();
  }

  function clear() {
    return storage.clearHistory();
  }

  window.WebBuilderHistory = {
    snapshot,
    push,
    arm,
    commit,
    undoSnapshot,
    redoSnapshot,
    clear
  };
})();
