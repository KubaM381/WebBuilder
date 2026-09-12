// WebBuilder bootstrap
// The js/ directory intentionally contains only the main builder domains.
// builder.js remains the central bootstrap/core and is not split further.
document.write('<script src="js/state.js"><\/script>');
document.write('<script src="js/toast.js"><\/script>');
document.write('<script src="js/storage.js"><\/script>');
document.write('<script src="js/elements.js"><\/script>');
// products.js must load before cart.js — cart.js references products only
// via window.WebBuilderProducts.
document.write('<script src="js/products.js"><\/script>');
document.write('<script src="js/cart.js"><\/script>');
document.write('<script src="js/canvas.js"><\/script>');
document.write('<script src="js/inspector.js"><\/script>');
document.write('<script src="js/toolbar.js"><\/script>');
document.write('<script src="js/header-footer.js"><\/script>');
document.write('<script src="js/export.js"><\/script>');
document.write('<script src="js/modals.js"><\/script>');
document.write('<script src="js/preview.js"><\/script>');
// Supabase files live in js/Supabase/ (see its README) as ES modules —
// supabase-ui.js imports directly from supabase-data.js, so the order of
// these three lines is informal only, not functionally required.
// Note: the folder is "Supabase" (capital S) — case-sensitive on some
// servers (e.g. GitHub Pages/Linux).
document.write('<script type="module" src="js/Supabase/supabase-config.js"><\/script>');
document.write('<script type="module" src="js/Supabase/supabase-data.js"><\/script>');
document.write('<script type="module" src="js/Supabase/supabase-ui.js"><\/script>');

// Wires up the sidebar tab buttons (Elemente/Kopf-Fuß/Warenkorb/Produkte).
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
