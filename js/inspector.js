// WebBuilder inspector service
// Owns selection/field updates during the staged migration.
// DOM-specific rendering remains in builder-legacy.js until the legacy
// element editor is switched to this service.

(() => {
  const state = window.WebBuilderState;
  const elements = window.WebBuilderElements;
  if (!state || !elements) {
    console.error("WebBuilderInspector: shared state/elements service missing.");
    return;
  }

  function getSelected() {
    return elements.getSelected();
  }

  function select(id) {
    return elements.setSelected(id);
  }

  function update(id, patch, recordHistory = true) {
    const targetId = id == null ? state.selectedElementId : id;
    if (!targetId || !elements.getById(targetId)) return null;

    if (recordHistory && window.WebBuilderHistory) {
      window.WebBuilderHistory.arm();
    }

    const updated = elements.update(targetId, patch);

    if (recordHistory && window.WebBuilderHistory) {
      window.WebBuilderHistory.commit();
    }

    return updated;
  }

  function updateField(id, field, value, recordHistory = true) {
    if (!field) return null;
    return update(id, { [field]: value }, recordHistory);
  }

  function remove(id, recordHistory = true) {
    const targetId = id == null ? state.selectedElementId : id;
    if (!targetId || !elements.getById(targetId)) return false;

    if (recordHistory && window.WebBuilderHistory) {
      window.WebBuilderHistory.arm();
    }

    const removed = elements.remove(targetId);

    if (recordHistory && window.WebBuilderHistory) {
      window.WebBuilderHistory.commit();
    }

    return removed;
  }

  function duplicate(id, recordHistory = true) {
    const targetId = id == null ? state.selectedElementId : id;
    if (!targetId || !elements.getById(targetId)) return null;

    if (recordHistory && window.WebBuilderHistory) {
      window.WebBuilderHistory.arm();
    }

    const copy = elements.duplicate(targetId);
    if (copy) elements.setSelected(copy.id);

    if (recordHistory && window.WebBuilderHistory) {
      window.WebBuilderHistory.commit();
    }

    return copy;
  }

  window.WebBuilderInspector = {
    getSelected,
    select,
    update,
    updateField,
    remove,
    duplicate
  };
})();
