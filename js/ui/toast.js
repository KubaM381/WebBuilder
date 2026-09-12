// WebBuilder shared toast module
// Einziger Ort für Toast-Erzeugung. buildToastNode() baut das eigentliche
// Toast-Markup (Icon + Text) und wird sowohl von show() (fester Stapel
// unten rechts, #toast-container) als auch von modals.js
// openPositionedMessage() (frei positionierte Meldung) genutzt — vorher
// bauten beide unabhängig ein fast identisches .toast-Element.
(() => {
  const esc = window.WebBuilderUtils?.escapeHtml || (v => String(v ?? ""));
  const ICONS = { success: "✅", danger: "⚠️", info: "ℹ️" };

  function buildToastNode(message, type = "info", icon = null) {
    const node = document.createElement("div");
    node.className = `toast toast-${type}`;
    node.innerHTML = `<span>${icon || ICONS[type] || ICONS.info}</span> <span>${esc(message)}</span>`;
    return node;
  }

  function show(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) {
      console[type === "danger" ? "error" : "log"](message);
      return;
    }
    const toast = buildToastNode(message, type);
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  window.WebBuilderToast = { show, buildToastNode };
})();
