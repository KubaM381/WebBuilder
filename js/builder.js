// WebBuilder bootstrap
// The js/ directory intentionally contains only the main builder domains.
// builder.js remains the central bootstrap/core and is not split further.
document.write('<script src="js/state.js"><\/script>');
document.write('<script src="js/storage.js"><\/script>');
document.write('<script src="js/elements.js"><\/script>');
document.write('<script src="js/cart.js"><\/script>');
document.write('<script src="js/canvas.js"><\/script>');
document.write('<script src="js/inspector.js"><\/script>');
document.write('<script src="js/toolbar.js"><\/script>');
document.write('<script src="js/header-footer.js"><\/script>');
// NEU: export.js hängt von state.js, elements.js, canvas.js (renderShapeInner/
// computeBackgroundCss) und header-footer.js (itemInnerHtml) ab — deshalb
// erst nach diesen geladen.
document.write('<script src="js/export.js"><\/script>');
document.write('<script src="js/modals.js"><\/script>');
document.write('<script src="js/preview.js"><\/script>');
// FIX: supabase-config.js / supabase.js use import/export syntax, which is
// only valid inside an ES module script. Without type="module" the browser
// threw a SyntaxError on both files at parse time and neither ever ran —
// Supabase was completely dead, not just unused from the UI.
document.write('<script type="module" src="js/supabase-config.js"><\/script>');
document.write('<script type="module" src="js/supabase.js"><\/script>');

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
