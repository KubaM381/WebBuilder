// js/ui/tabs.js
// WebBuilder sidebar tab switching (Elemente/Kopf-Fuß/Warenkorb/Produkte).
// Extracted from builder.js so the bootstrap file stays a pure
// orchestrator (load order + initial render calls only). Self-initializes
// like the other ui/ modules (toast.js, modals.js) — no load-order
// requirement of its own.
(() => {
  function initSidebarTabs() {
    const tabs = document.querySelectorAll(".sidebar-tab");
    const panels = document.querySelectorAll(".sidebar-panel");
    if (!tabs.length) return;
    tabs.forEach(tab => {
      if (tab.dataset.webBuilderTabBound === "true") return;
      tab.dataset.webBuilderTabBound = "true";
      tab.addEventListener("click", () => {
        // A switch to any tab other than "cart" is a normal editor main
        // action and ends an open cart focus editor automatically —
        // except clicking the cart tab itself again (where the "open
        // editor" button lives), which shouldn't instantly close an
        // editor that's already open.
        if (tab.dataset.tab !== "cart" && window.WebBuilderCartFocus?.isActive?.()) {
          window.WebBuilderCartFocus.exit();
        }
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        panels.forEach(p => p.classList.add("hidden"));
        const target = document.getElementById("panel-" + tab.dataset.tab);
        if (target) target.classList.remove("hidden");
      });
    });
  }

  window.WebBuilderTabs = { init: initSidebarTabs };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSidebarTabs, { once: true });
  } else {
    initSidebarTabs();
  }
})();
