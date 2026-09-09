import { state, injectDynamicStyles } from './builder-core.js';
import { renderCanvas, makeCanvasResizable, highlightCategory, clearCategoryHighlights } from './builder-core.js';
import { initDragAndDrop } from './dragdrop.js';
import { initInspector, selectElement } from './inspector.js';
import { initToolbar } from './toolbar.js';
import { initPreview } from './preview.js';
import { initExport } from './export.js';
import { showToast } from './preview.js';

// Globaler App-State
export const state = {
  elements: [],
  selectedElementId: null,
  isPreviewMode: false,
  draggedType: null,
  draggedIcon: null,
  cartItems: [],
  toastPosition: "top-right",
  canvasMinHeight: 800,
  headerConfig: { active: false, sticky: true, title: "Mein Shop Header", links: "Startseite | Produkte | Kontakt" },
  footerConfig: { active: false, text: "© 2026 WebBuilder Pro. Alle Rechte vorbehalten." }
};

document.addEventListener("DOMContentLoaded", () => {
  injectDynamicStyles();

  // DOM Elemente Referenzen
  const canvas = document.getElementById("canvas");
  const canvasHint = document.getElementById("canvas-hint");

  // Initialisierungen
  initToolbar();
  initInspector();
  initDragAndDrop();
  initPreview();
  initExport();

  // Header & Footer Event-Listener
  document.getElementById("btn-toggle-header")?.addEventListener("click", (e) => {
    state.headerConfig.active = !state.headerConfig.active;
    e.target.innerText = state.headerConfig.active ? "Header: AN" : "Header: AUS";
    renderCanvas();
    showToast(`Header ${state.headerConfig.active ? 'aktiviert' : 'deaktiviert'}`, "info");
  });

  document.getElementById("btn-toggle-footer")?.addEventListener("click", (e) => {
    state.footerConfig.active = !state.footerConfig.active;
    e.target.innerText = state.footerConfig.active ? "Footer: AN" : "Footer: AUS";
    renderCanvas();
    showToast(`Footer ${state.footerConfig.active ? 'aktiviert' : 'deaktiviert'}`, "info");
  });

  // Canvas Abwahl-Klick
  canvas?.addEventListener("click", () => {
    if (!state.isPreviewMode) {
      state.selectedElementId = null;
      selectElement(null);
    }
  });

  renderCanvas();
});

export function injectDynamicStyles() {
  const dynamicStyles = document.createElement("style");
  dynamicStyles.id = "builder-dynamic-styles";
  dynamicStyles.textContent = `
    /* Toast Positionen */
    #toast-container {
      position: fixed;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      transition: all 0.3s ease;
    }
    #toast-container.top-right { top: 20px; right: 20px; bottom: auto; left: auto; }
    #toast-container.top-left { top: 20px; left: 20px; bottom: auto; right: auto; }
    #toast-container.bottom-right { bottom: 20px; right: 20px; top: auto; left: auto; }
    #toast-container.bottom-left { bottom: 20px; left: 20px; top: auto; right: auto; }

    /* Canvas Centering & Layout Fixes */
    #canvas {
      position: relative !important;
      margin: 0 auto !important;
      min-height: 800px;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      transition: min-height 0.2s ease, width 0.3s ease;
      overflow-x: visible !important;
    }
    .preview-mode #canvas {
      margin: 0 auto !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }

    /* Warenkorb-Badge Scalable */
    #cart-count-badge {
      transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      display: inline-block;
      cursor: pointer;
    }
    #cart-count-badge:hover, .cart-badge-hover:hover {
      transform: scale(1.4) !important;
    }

    /* Tooltip styling */
    .builder-tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%) translateY(-8px);
      background: #1e293b;
      color: #ffffff;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease, transform 0.2s ease;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .placed-element:hover .builder-tooltip {
      opacity: 1;
      transform: translateX(-50%) translateY(-4px);
    }

    /* Text Interaction & Highlight */
    .word-link {
      color: blue !important;
      text-decoration: underline !important;
      cursor: pointer;
    }
    .word-highlight {
      padding: 2px 4px;
      border-radius: 3px;
    }

    /* Dynamic Canvas Drag Handle */
    .canvas-resize-handle {
      width: 100%;
      height: 28px;
      background: #f1f5f9;
      border-top: 2px dashed #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: ns-resize;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      user-select: none;
      margin-top: auto;
      z-index: 100;
    }
    .canvas-resize-handle:hover {
      background: #e2e8f0;
      color: #1e293b;
    }

    /* Kategorie Highlight Filter Effekte */
    .category-dimmed {
      opacity: 0.2 !important;
      filter: grayscale(80%);
      transition: opacity 0.3s ease, filter 0.3s ease;
    }
    .category-highlighted {
      opacity: 1 !important;
      outline: 3px solid #3b82f6 !important;
      box-shadow: 0 0 15px rgba(59, 130, 246, 0.6) !important;
      transition: all 0.3s ease;
    }

    /* Header & Footer */
    .builder-header {
      width: 100%;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 900;
      box-sizing: border-box;
    }
    .builder-header.sticky {
      position: sticky;
      top: 0;
    }
    .builder-footer {
      width: 100%;
      background: #1e293b;
      color: #f8fafc;
      padding: 18px 24px;
      text-align: center;
      font-size: 14px;
      margin-top: auto;
      box-sizing: border-box;
      z-index: 900;
    }

    /* Inspector & Panel Ergänzungen */
    .inspector-section {
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      margin-top: 12px;
    }
    .inspector-section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 8px;
    }
    .cart-item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .cart-item-row input {
      width: 60px;
      padding: 4px;
    }
  `;
  document.head.appendChild(dynamicStyles);
}

export function renderCanvas() {
  const canvas = document.getElementById("canvas");
  const canvasHint = document.getElementById("canvas-hint");
  if (!canvas) return;

  canvas.querySelectorAll(".placed-element, .builder-header, .builder-footer, .canvas-resize-handle").forEach(el => el.remove());
  if (canvasHint) {
    canvasHint.classList.toggle("hidden", state.elements.length > 0);
  }

  canvas.style.minHeight = `${state.canvasMinHeight}px`;

  // Header Rendering
  if (state.headerConfig.active) {
    const headerEl = document.createElement("header");
    headerEl.className = `builder-header ${state.headerConfig.sticky ? 'sticky' : ''}`;
    headerEl.innerHTML = `
      <div style="font-weight:bold; font-size:18px;">${state.headerConfig.title}</div>
      <nav style="font-size:14px;">${state.headerConfig.links}</nav>
    `;
    canvas.prepend(headerEl);
  }

  // Canvas Elemente Rendering
  state.elements.forEach(item => {
    const el = document.createElement("div");
    el.className = `placed-element ${item.id === state.selectedElementId ? 'selected' : ''} ${item.actionType !== 'none' ? 'has-action' : ''}`;
    
    el.style.position = "absolute";
    el.style.left = `${item.x}px`;
    el.style.top = `${item.y}px`;
    el.style.color = item.color;
    el.style.backgroundColor = item.bgTransparent ? "transparent" : item.bgColor;
    el.style.borderStyle = item.borderStyle;
    el.style.borderWidth = `${item.borderWidth}px`;
    el.style.borderColor = item.borderColor;
    el.style.borderRadius = item.borderRadius;
    el.style.padding = `${item.padding}px`;
    el.style.width = item.width !== "auto" && item.width ? `${item.width}px` : "auto";
    el.style.transition = `all ${item.transitionDuration || '0.3s'} ${item.transitionEasing || 'ease'}`;
    el.dataset.id = item.id;
    if (item.category) el.dataset.category = item.category;

    let processedText = item.text || "";
    if (item.wordHighlights) {
      const highlights = item.wordHighlights.split(",");
      highlights.forEach(hl => {
        const parts = hl.split(":");
        const w = parts[0]?.trim();
        const color = parts[1]?.trim() || "blue";
        const isBold = parts[2]?.trim() === "fett" || parts[2]?.trim() === "bold";
        if (w && processedText.includes(w)) {
          const span = `<span class="word-highlight" style="color:${color}; font-weight:${isBold ? 'bold' : 'normal'};">${w}</span>`;
          processedText = processedText.replaceAll(w, span);
        }
      });
    }

    if (item.linkScope === "word" && item.linkWord) {
      const linkSpan = `<span class="word-link" data-url="${item.actionUrl || '#'}">${item.linkWord}</span>`;
      processedText = processedText.replaceAll(item.linkWord, linkSpan);
    }

    if (item.type === "icon" && SVGMAP[item.iconName]) {
      el.innerHTML = SVGMAP[item.iconName];
      const svg = el.querySelector("svg");
      if (svg) {
        svg.style.width = `${item.size}px`;
        svg.style.height = `${item.size}px`;
      }
    } else if (item.type === "button") {
      el.innerHTML = `<button class="btn btn-primary" style="font-size:${item.size}px; background-color:${item.color}">${processedText}</button>`;
    } else if (item.type === "headline") {
      el.innerHTML = `<h2 style="font-size:${item.size}px; color:${item.color}; margin:0;">${processedText}</h2>`;
    } else if (item.type === "box") {
      el.innerHTML = `<div style="width:${item.size}px; height:${Math.round(item.size*0.65)}px; background:${item.color}; border-radius:${item.borderRadius}; box-shadow: var(--shadow-md);"></div>`;
    } else if (item.type === "image") {
      const src = item.imageUrl || "https://via.placeholder.com/200";
      el.innerHTML = `<img src="${src}" class="canvas-img" style="width:${item.size}px; height:auto; display:block; border-radius:${item.borderRadius};" alt="Bild Element" />`;
    } else {
      el.innerHTML = `<p style="font-size:${item.size}px; color:${item.color}; margin:0;">${processedText}</p>`;
    }

    if (item.type === "image" && item.hoverImageUrl) {
      const imgEl = el.querySelector("img");
      if (imgEl) {
        el.addEventListener("mouseenter", () => imgEl.src = item.hoverImageUrl);
        el.addEventListener("mouseleave", () => imgEl.src = item.imageUrl);
      }
    }

    if (item.hoverTooltip) {
      const tooltipEl = document.createElement("div");
      tooltipEl.className = "builder-tooltip";
      tooltipEl.innerText = item.hoverTooltip;
      el.appendChild(tooltipEl);
    }

    if (item.isCategoryTrigger || item.category) {
      el.addEventListener("mouseenter", () => {
        if (item.category) highlightCategory(item.category);
      });
      el.addEventListener("mouseleave", () => clearCategoryHighlights());
    }

    if (!state.isPreviewMode && item.actionType !== "none") {
      const badge = document.createElement("span");
      badge.className = "element-badge";
      badge.innerText = "⚡ Logik";
      el.appendChild(badge);
    }

    el.addEventListener("click", (e) => {
      if (e.target.classList.contains("word-link")) {
        e.stopPropagation();
        const targetUrl = e.target.dataset.url;
        if (targetUrl && targetUrl !== "#") {
          window.open(targetUrl, "_blank");
          showToast(`Wort-Link geöffnet: ${targetUrl}`, "info");
        }
        return;
      }

      e.stopPropagation();
      if (state.isPreviewMode) {
        executeAction(item, el);
      } else {
        selectElement(item.id);
      }
    });

    makeElementDraggableOnCanvas(el, item);
    canvas.appendChild(el);
  });

  // Footer Rendering
  if (state.footerConfig.active) {
    const footerEl = document.createElement("footer");
    footerEl.className = "builder-footer";
    footerEl.innerText = state.footerConfig.text;
    canvas.appendChild(footerEl);
  }

  // Canvas Resize Handle
  if (!state.isPreviewMode) {
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "canvas-resize-handle";
    resizeHandle.innerHTML = "⇳ Canvas Höhe vergrößern (Ziehen)";
    makeCanvasResizable(resizeHandle);
    canvas.appendChild(resizeHandle);
  }
}

export function makeCanvasResizable(handle) {
  let startY, startHeight;
  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    startY = e.clientY;
    startHeight = state.canvasMinHeight;

    const onMouseMove = (moveEvent) => {
      const dy = moveEvent.clientY - startY;
      state.canvasMinHeight = Math.max(500, startHeight + dy);
      const canvas = document.getElementById("canvas");
      if (canvas) canvas.style.minHeight = `${state.canvasMinHeight}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      showToast(`Canvas-Höhe auf ${state.canvasMinHeight}px angepasst`, "info");
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

export function highlightCategory(category) {
  if (!category) return;
  const canvas = document.getElementById("canvas");
  if (!canvas) return;
  const allPlacements = canvas.querySelectorAll(".placed-element");
  allPlacements.forEach(el => {
    if (el.dataset.category === category) {
      el.classList.add("category-highlighted");
      el.classList.remove("category-dimmed");
    } else {
      el.classList.add("category-dimmed");
      el.classList.remove("category-highlighted");
    }
  });
}

export function clearCategoryHighlights() {
  const canvas = document.getElementById("canvas");
  if (!canvas) return;
  const allPlacements = canvas.querySelectorAll(".placed-element");
  allPlacements.forEach(el => {
    el.classList.remove("category-highlighted", "category-dimmed");
  });
}
