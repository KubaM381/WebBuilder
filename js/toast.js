// WebBuilder shared toast module
// Einziger Ort für Toast-Benachrichtigungen. Ersetzt die bisher in
// supabase.js, toolbar.js und export.js jeweils separat definierten
// Mini-Implementierungen (siehe README "Offene Punkte" — wurde bewusst erst
// jetzt vereinheitlicht, im Rahmen der Supabase-UI-Anbindung, da dort
// ohnehin neues Feedback-UI (Login-/Speichern-Status) entsteht).
(() => {
  function show(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) {
      console[type === "danger" ? "error" : "log"](message);
      return;
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${type === "success" ? "✅" : type === "danger" ? "⚠️" : "ℹ️"}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
  window.WebBuilderToast = { show };
})();
