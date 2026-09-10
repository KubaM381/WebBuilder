// WebBuilder export module
// Owns turning the current live builder state into a static HTML export.
//
// Bewusst ein eigenes Modul statt Teil von preview.js oder toolbar.js:
// preview.js besitzt den Preview-Modus + die interaktive Klick-Action-
// Runtime, toolbar.js besitzt Zoom/History/Speichern. Export erzeugt einen
// statischen Snapshot des aktuellen State — ein eigenständiges Feature mit
// eigenem Wachstumspfad (z.B. später "Als Datei herunterladen" oder
// Netlify-Deploy), siehe README-Zielstruktur & Projektregel 6/24.
(() => {
  const state = window.WebBuilderState;
  const elementsService = window.WebBuilderElements;
  const canvas = window.WebBuilderCanvas;
  const headerFooter = window.WebBuilderHeaderFooter;
  if (!state || !elementsService || !canvas || !headerFooter) {
    console.error("WebBuilderExport: required shared services are missing.");
    return;
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function getIconMap() {
    const registry = window.WebBuilderIconRegistry && typeof window.WebBuilderIconRegistry.getAll === "function"
      ? window.WebBuilderIconRegistry.getAll() : {};
    return Object.assign({}, registry, window.WebBuilderIconMap || {});
  }

  // Nutzt dieselbe Markup-Funktion, die header-footer.js für das Live-
  // Rendering der Bar-Items verwendet (siehe dortiger itemInnerHtml-Export),
  // damit Editor-Ansicht und Export niemals visuell auseinanderlaufen.
  function renderBarItemExport(item) {
    const runtime = window.WebBuilderHeaderFooterRuntime;
    const inner = runtime && typeof runtime.itemInnerHtml === "function"
      ? runtime.itemInnerHtml(item)
      : escapeHtml(item.text || "");
    return `<div style="position:absolute; left:${Number(item.x) || 0}px; top:${Number(item.y) || 0}px;">${inner}</div>`;
  }

  function renderBarBlock(target) {
    const cfg = target === "footer" ? headerFooter.getFooter() : headerFooter.getHeader();
    if (!cfg.enabled) return "";
    const stickyCss = target === "header" && cfg.sticky ? " position:sticky; top:0; z-index:300;" : "";
    const bgCss = cfg.bgType === "image" && cfg.bgImage
      ? `background-color:${cfg.bgColor}; background-image:url("${cfg.bgImage}"); background-size:cover; background-position:center; background-repeat:no-repeat;`
      : `background-color:${cfg.bgColor};`;
    let html = `<div style="position:relative; width:100%; height:${cfg.height}px; ${bgCss}${stickyCss}">\n`;
    cfg.items.forEach(item => { html += `  ${renderBarItemExport(item)}\n`; });
    html += `</div>\n`;
    return html;
  }

  function renderElementExport(item) {
    const iconMap = getIconMap();
    const textDeco = item.underline ? "underline" : "none";
    const fontFam = item.fontFamily || "inherit";
    const align = item.align || "left";
    let inner = "";
    if (item.type === "icon" && iconMap[item.iconName]) {
      inner = item.iconFrame
        ? `<span style="display:inline-flex;align-items:center;justify-content:center;border:1.5px solid rgba(255,255,255,0.55);border-radius:50%;padding:10px;background:rgba(255,255,255,0.12);backdrop-filter:blur(10px) saturate(180%);">${iconMap[item.iconName]}</span>`
        : iconMap[item.iconName];
    } else if (item.type === "button") {
      inner = `<button style="font-size:${item.size}px; background:${item.color}; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:${item.bold ? "bold" : "600"}; font-style:${item.italic ? "italic" : "normal"}; text-decoration:${textDeco}; font-family:${fontFam};">${escapeHtml(item.text)}</button>`;
    } else if (item.type === "headline") {
      inner = `<h2 style="font-size:${item.size}px; color:${item.color}; margin:0; font-weight:${item.bold ? "bold" : "400"}; font-style:${item.italic ? "italic" : "normal"}; text-decoration:${textDeco}; font-family:${fontFam}; text-align:${align};">${escapeHtml(item.text)}</h2>`;
    } else if (item.type === "image") {
      inner = `<img src="${escapeHtml(item.imageUrl)}" style="width:${item.size}px; height:auto; display:block;" alt="Exportiertes Bild" />`;
    } else if (item.type === "box") {
      inner = `<div style="width:140px; height:90px; background:${item.color}; border-radius:8px;"></div>`;
    } else if (item.type === "shape") {
      // Wiederverwendung der Shape-Rendering-Logik aus canvas.js — siehe
      // dortiger renderShapeInner-Export.
      inner = typeof canvas.renderShapeInner === "function" ? canvas.renderShapeInner(item) : "";
    } else {
      inner = `<p style="font-size:${item.size}px; color:${item.color}; margin:0; font-weight:${item.bold ? "bold" : "normal"}; font-style:${item.italic ? "italic" : "normal"}; text-decoration:${textDeco}; font-family:${fontFam}; text-align:${align};">${escapeHtml(item.text)}</p>`;
    }
    return `  <!-- Element: ${item.id} (${item.type}) -->\n  <div style="position:absolute; left:${item.x}px; top:${item.y}px; color:${item.color};">\n    ${inner}\n  </div>\n`;
  }

  function buildExportHtml() {
    const bgCss = typeof canvas.computeBackgroundCss === "function"
      ? canvas.computeBackgroundCss(state.background)
      : `background:${state.background?.color || "#ffffff"};`;

    let html = `<!-- WebBuilder Pro Export -->\n`;
    html += `<!-- Hinweis: Dies ist ein visueller Export. Klick-Aktionen (z.B. Zurück/Vorwärts, In den Warenkorb) sind Platzhalter und müssten für eine echte Website noch mit echtem JavaScript verknüpft werden. Warenkorb-/Produktfunktionalität wird bewusst nicht mitexportiert, da sie ohne den Builder-Laufzeit-Code nicht funktioniert. -->\n`;
    html += renderBarBlock("header");
    html += `<div style="position:relative; width:100%; min-height:${state.canvasHeight}px; ${bgCss}">\n`;
    (elementsService.getAll() || []).forEach(item => { html += renderElementExport(item); });
    html += `</div>\n`;
    html += renderBarBlock("footer");
    return html;
  }

  // Minimal-lokaler Toast-Helper, analog zum bereits bestehenden Muster in
  // supabase.js/toolbar.js (siehe bekannter offener Punkt: kein zentraler
  // Toast-Helper — wird hier bewusst NICHT zusätzlich vereinheitlicht, um
  // den Scope dieser Aufgabe nicht zu sprengen).
  function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return console[type === "danger" ? "error" : "log"](message);
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${type === "success" ? "✅" : type === "danger" ? "⚠️" : "ℹ️"}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function exportProject() {
    const html = buildExportHtml();
    console.log(html);
    showToast("HTML wurde in der Entwickler-Konsole (F12) ausgegeben!", "success");
    return html;
  }

  function bind() {
    const btn = document.getElementById("btn-export");
    if (!btn || btn.dataset.webBuilderExportBound === "true") return;
    btn.dataset.webBuilderExportBound = "true";
    btn.addEventListener("click", e => { e.preventDefault(); exportProject(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();

  window.WebBuilderExport = { buildExportHtml, exportProject };
})();
