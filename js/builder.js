// WebBuilder bootstrap
// The js/ directory intentionally contains only the main builder domains.
// builder.js remains the central bootstrap/core and is not split further.
document.write('<script src="js/state.js"><\/script>');
document.write('<script src="js/toast.js"><\/script>');
document.write('<script src="js/storage.js"><\/script>');
document.write('<script src="js/elements.js"><\/script>');
// FIX: products.js muss vor cart.js geladen werden (Abhängigkeitsreihenfolge,
// Projektregel 8) — cart.js referenziert Produkte ausschließlich über
// window.WebBuilderProducts, das erst durch products.js entsteht.
document.write('<script src="js/products.js"><\/script>');
document.write('<script src="js/cart.js"><\/script>');
document.write('<script src="js/canvas.js"><\/script>');
document.write('<script src="js/inspector.js"><\/script>');
document.write('<script src="js/toolbar.js"><\/script>');
document.write('<script src="js/header-footer.js"><\/script>');
document.write('<script src="js/export.js"><\/script>');
document.write('<script src="js/modals.js"><\/script>');
document.write('<script src="js/preview.js"><\/script>');
// Supabase-Dateien liegen gebündelt in js/Supabase/ (siehe dortiges
// README). Alle drei nutzen import/export-Syntax, daher type="module".
// supabase-ui.js importiert per ES import direkt aus supabase-data.js
// (siehe Kommentar dort) — die Reihenfolge dieser drei Zeilen ist daher
// nur informell, nicht funktional entscheidend.
// ACHTUNG Groß-/Kleinschreibung: der Ordner heißt "Supabase" (großes S) —
// auf manchen Servern (z.B. GitHub Pages/Linux) wird das case-sensitive
// geprüft.
document.write('<script type="module" src="js/Supabase/supabase-config.js"><\/script>');
document.write('<script type="module" src="js/Supabase/supabase-data.js"><\/script>');
document.write('<script type="module" src="js/Supabase/supabase-ui.js"><\/script>');

// FIX: nothing wired up the sidebar tab buttons — clicking "Kopf/Fuß",
// "Warenkorb" or "Produkte" did nothing at all.
function initSidebarTabs() {
  const tabs = document.querySelectorAll(".sidebar-tab");
  const panels = document.querySelectorAll(".sidebar-panel");
  if (!tabs.length) return;
  tabs.forEach(tab => {
    if (tab.dataset.webBuilderTabBound === "true") return;
    tab.dataset.webBuilderTabBound = "true";
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      panels.forEach(p => p.classList.add("hidden"));
      const target = document.getElementById("panel-" + tab.dataset.tab);
      if (target) target.classList.remove("hidden");
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // FIX: storage.js exposed save/load from the start, but loadIntoState()
  // was never called — a saved project silently never came back on reload.
  window.WebBuilderStorage?.loadIntoState?.();

  window.WebBuilderCanvas?.render?.();
  window.WebBuilderCanvas?.refreshBackgroundEditor?.();
  window.WebBuilderHeaderFooter?.normalizeState?.();
  window.WebBuilderHeaderFooterRuntime?.render?.();
  window.WebBuilderCart?.normalizeState?.();
  window.WebBuilderCartRuntime?.render?.();
  window.WebBuilderProductsRuntime?.render?.();
  window.WebBuilderCartConfigRuntime?.render?.();
  window.WebBuilderPreview?.bindToggle?.();

  initSidebarTabs();
});
