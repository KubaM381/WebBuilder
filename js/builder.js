document.addEventListener("DOMContentLoaded", () => {
  // ============================================================
  // GLOBAL STATE
  // ============================================================
  let elements = [];
  let groups = []; // { id, elementIds: [] }
  let categories = []; // { id, name }
  let selectedElementId = null;
  let selectedElementIds = []; // multi-select for grouping
  let isPreviewMode = false;
  let draggedType = null;
  let draggedIcon = null;

  let cartItems = []; // { id, elementId, name, price, qty }
  let toastPosition = "top-right"; // top-right | top-left | bottom-right | bottom-left

  let headerEnabled = false;
  let headerSticky = false;
  let headerText = "Meine Website";
  let footerEnabled = false;
  let footerText = "© 2026 WebBuilder Pro";

  // ============================================================
  // DOM ELEMENTS (original)
  // ============================================================
  const canvas = document.getElementById("canvas");
  const canvasHint = document.getElementById("canvas-hint");
  const btnModeToggle = document.getElementById("btn-mode-toggle");
  const btnClear = document.getElementById("btn-clear");
  const btnExport = document.getElementById("btn-export");

  // Background Control Elements
  const bgType = document.getElementById("bg-type");
  const bgSolidGroup = document.getElementById("bg-solid-group");
  const bgGradientGroup = document.getElementById("bg-gradient-group");
  const bgImageGroup = document.getElementById("bg-image-group");
  const bgColorInput = document.getElementById("bg-color-input");
  const bgGrad1Input = document.getElementById("bg-grad-1");
  const bgGrad2Input = document.getElementById("bg-grad-2");
  const bgGradDirInput = document.getElementById("bg-grad-dir");
  const bgImageUrlInput = document.getElementById("bg-image-url");
  const bgImageFileInput = document.getElementById("bg-image-file");

  // Inspector Fields
  const noSelectionUI = document.getElementById("no-selection");
  const inspectorForm = document.getElementById("inspector-form");
  const propId = document.getElementById("prop-id");
  const propText = document.getElementById("prop-text");
  const propSize = document.getElementById("prop-size");
  const propColor = document.getElementById("prop-color");
  const propImageUrl = document.getElementById("prop-image-url");
  const propImageFile = document.getElementById("prop-image-file");
  const propActionType = document.getElementById("prop-action-type");
  const propActionUrl = document.getElementById("prop-action-url");
  const propActionMsg = document.getElementById("prop-action-msg");

  const groupText = document.getElementById("group-text");
  const groupColor = document.getElementById("group-color");
  const groupImage = document.getElementById("group-image");
  const groupActionUrl = document.getElementById("group-action-url");
  const groupActionMsg = document.getElementById("group-action-msg");
  const btnDelete = document.getElementById("btn-delete-element");

  // Drawer & Modal Elements
  const cartDrawerBackdrop = document.getElementById("cart-drawer-backdrop");
  const cartDrawer = document.getElementById("cart-drawer");
  const closeCartBtn = document.getElementById("close-cart-btn");
  const cartItemsList = document.getElementById("cart-items-list");
  const cartCountBadge = document.getElementById("cart-count-badge");

  const modalOverlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const modalFooter = document.getElementById("modal-footer");
  const closeModalBtn = document.getElementById("close-modal-btn");

  // Toast Container
  let toastContainer = document.getElementById("toast-container");

  // ============================================================
  // ICON DEFINITIONS (nun erweiterbar über addCustomIcon)
  // ============================================================
  const SVGMAP = {
    cart: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>',
    settings: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z"/></svg>',
    'arrow-up': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>',
    'arrow-down': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>',
    'arrow-left': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>',
    'arrow-right': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>'
  };

  /**
   * Fügt ein eigenes Icon (SVG-Markup oder Bild-URL) zur SVGMAP hinzu.
   * Bei einer URL wird automatisch ein <img> gewrappt, damit das Rendering
   * identisch zu den bestehenden SVG-Icons funktioniert.
   */
  function addCustomIcon(name, svgOrUrl) {
    if (!name || !svgOrUrl) return;
    const trimmed = svgOrUrl.trim();
    if (trimmed.startsWith("<svg")) {
      SVGMAP[name] = trimmed;
    } else {
      SVGMAP[name] = `<img class="icon-svg icon-custom-img" src="${trimmed}" alt="${name}" />`;
    }
    showToast(`Icon "${name}" hinzugefügt`, "success");
    renderIconPalette();
  }

  // ============================================================
  // UTILITY: Container dynamisch erstellen, falls im HTML fehlend
  // ============================================================
  function ensureEl(id, parentEl, tag = "div", className = "") {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement(tag);
      el.id = id;
      if (className) el.className = className;
      (parentEl || document.body).appendChild(el);
    }
    return el;
  }

  if (!toastContainer) {
    toastContainer = ensureEl("toast-container", document.body, "div", "toast-container toast-top-right");
  }

  // ============================================================
  // DYNAMISCH INJIZIERTES CSS FÜR ALLE NEUEN FEATURES
  // (falls die zugehörigen Klassen im bestehenden Stylesheet fehlen)
  // ============================================================
  function injectDynamicStyles() {
    const style = document.createElement("style");
    style.id = "builder-dynamic-styles";
    style.textContent = `
      /* --- Warenkorb Badge Hover --- */
      #cart-count-badge, .cart-badge {
        display: inline-block;
        transition: transform 0.25s ease;
        transform-origin: center;
      }
      #cart-count-badge:hover, .cart-badge:hover {
        transform: scale(1.35);
      }

      /* --- Toast Positionierung --- */
      .toast-container { position: fixed; z-index: 9999; display: flex; flex-direction: column; gap: 8px; padding: 16px; pointer-events: none; }
      .toast-container.toast-top-right { top: 0; right: 0; align-items: flex-end; }
      .toast-container.toast-top-left { top: 0; left: 0; align-items: flex-start; }
      .toast-container.toast-bottom-right { bottom: 0; right: 0; align-items: flex-end; }
      .toast-container.toast-bottom-left { bottom: 0; left: 0; align-items: flex-start; }
      .toast-container .toast { pointer-events: auto; }

      /* --- Element Styling (Background/Border/Radius/Padding) --- */
      .placed-element .styled-wrapper {
        display: inline-block;
        box-sizing: border-box;
      }

      /* --- Wort-Hervorhebung & Links --- */
      .text-word-link { color: blue; text-decoration: underline; cursor: pointer; }
      .text-word-highlight { font-weight: bold; }

      /* --- Canvas Resize Handle --- */
      #canvas { position: relative; overflow: auto; }
      #canvas-resize-handle {
        position: absolute; left: 0; right: 0; bottom: 0; height: 14px;
        cursor: ns-resize; display: flex; align-items: center; justify-content: center;
        background: repeating-linear-gradient(45deg, rgba(0,0,0,0.05), rgba(0,0,0,0.05) 4px, transparent 4px, transparent 8px);
        z-index: 50; user-select: none;
      }
      #canvas-resize-handle:after { content: "⋯"; font-size: 14px; color: #888; }
      #btn-grow-canvas {
        position: absolute; right: 8px; bottom: 18px; z-index: 51;
        padding: 4px 10px; font-size: 12px; border-radius: 6px; cursor: pointer;
        background: #fff; border: 1px solid #ccc;
      }

      /* --- Vorschau-Modus: rechten Bereich nicht abschneiden, zentrieren --- */
      body.preview-mode .builder-layout,
      body.preview-mode #canvas-wrapper {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        overflow-x: hidden !important;
      }
      body.preview-mode #canvas {
        margin: 0 auto !important;
        float: none !important;
        left: 0 !important;
        transform: none !important;
      }
      body.preview-mode #sidebar-left,
      body.preview-mode #sidebar-right,
      body.preview-mode .inspector-panel,
      body.preview-mode .palette-panel {
        display: none !important;
      }

      /* --- Hover Tooltip / Hover-Description --- */
      .hover-tooltip {
        position: absolute; z-index: 200; background: #1f2937; color: #fff;
        padding: 6px 10px; border-radius: 6px; font-size: 12px; max-width: 220px;
        pointer-events: none; opacity: 0; transition: opacity 0.2s ease;
        transform: translate(-50%, -110%);
      }
      .hover-tooltip.visible { opacity: 1; }

      /* --- Kategorie Highlight --- */
      .placed-element.category-dimmed { opacity: 0.25; transition: opacity 0.25s ease; }
      .placed-element.category-highlighted { opacity: 1; outline: 2px dashed #6366f1; transition: opacity 0.25s ease; }

      /* --- Gruppierte / Duplizierte / Auswahl-Mehrfachmarkierung --- */
      .placed-element.multi-selected { outline: 2px dotted #2563eb; }
      .placed-element.grouped-element { outline: 1px solid #a855f7; }

      /* --- Filter Widget --- */
      #filter-widget-panel {
        position: fixed; top: 60px; right: 16px; width: 260px; background: #fff;
        border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.15));
        padding: 14px; z-index: 500; display: none;
      }
      #filter-widget-panel.active { display: block; }
      #filter-widget-panel h3 { margin: 0 0 8px; font-size: 14px; }
      #filter-widget-panel input[type="text"] { width: 100%; box-sizing: border-box; margin-bottom: 8px; padding: 6px 8px; }
      #filter-widget-panel .filter-cat-item { display: block; font-size: 13px; margin-bottom: 4px; }

      /* --- Header / Footer --- */
      #builder-header {
        width: 100%; padding: 14px 20px; background: #111827; color: #fff;
        display: flex; align-items: center; justify-content: space-between; box-sizing: border-box;
      }
      #builder-header.sticky-header { position: sticky; top: 0; z-index: 300; }
      #builder-footer {
        width: 100%; padding: 18px 20px; background: #111827; color: #cbd5e1;
        text-align: center; box-sizing: border-box; font-size: 13px;
      }

      /* --- Inspector: neue Styling-Controls --- */
      .inspector-subsection { margin-top: 14px; padding-top: 10px; border-top: 1px dashed #e5e7eb; }
      .inspector-subsection h4 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
      .inspector-row { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; flex-wrap: wrap; }
      .inspector-row label { font-size: 12px; min-width: 90px; color: #374151; }
    `;
    document.head.appendChild(style);
  }
  injectDynamicStyles();

  // ============================================================
  // 1. WARENKORB-VERWALTUNG (Cart Management)
  // ============================================================
  function addCartItem(name, price) {
    const existing = cartItems.find(ci => ci.name === name);
    if (existing) {
      existing.qty += 1;
    } else {
      cartItems.push({ id: "cart_" + Date.now(), name: name || "Produkt", price: parseFloat(price) || 0, qty: 1 });
    }
    renderCart();
  }

  function updateCartItemPrice(cartId, newPrice) {
    const item = cartItems.find(ci => ci.id === cartId);
    if (item) {
      item.price = parseFloat(newPrice) || 0;
      renderCart();
    }
  }

  function removeCartItem(cartId) {
    cartItems = cartItems.filter(ci => ci.id !== cartId);
    renderCart();
  }

  function getCartTotal() {
    return cartItems.reduce((sum, ci) => sum + ci.price * ci.qty, 0);
  }

  function getCartCount() {
    return cartItems.reduce((sum, ci) => sum + ci.qty, 0);
  }

  function renderCart() {
    if (!cartItemsList) return;
    cartItemsList.innerHTML = "";

    cartItems.forEach(ci => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <span class="cart-item-title">${ci.name} × ${ci.qty}</span>
        <input type="number" class="cart-item-price-input" data-cart-id="${ci.id}" value="${ci.price.toFixed(2)}" step="0.01" style="width:70px;" />
        <button class="cart-item-remove" data-cart-id="${ci.id}" title="Entfernen">✕</button>
      `;
      cartItemsList.appendChild(row);
    });

    cartItemsList.querySelectorAll(".cart-item-price-input").forEach(input => {
      input.addEventListener("input", (e) => {
        updateCartItemPrice(e.target.dataset.cartId, e.target.value);
      });
    });
    cartItemsList.querySelectorAll(".cart-item-remove").forEach(btn => {
      btn.addEventListener("click", (e) => {
        removeCartItem(e.target.dataset.cartId);
        showToast("Artikel entfernt", "info");
      });
    });

    // Summenzeile
    let totalRow = document.getElementById("cart-total-row");
    if (!totalRow) {
      totalRow = document.createElement("div");
      totalRow.id = "cart-total-row";
      totalRow.className = "cart-total-row";
      totalRow.style.cssText = "margin-top:12px; padding-top:10px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; font-weight:600;";
      cartItemsList.parentElement.appendChild(totalRow);
    }
    totalRow.innerHTML = `<span>Gesamtsumme</span><span>${getCartTotal().toFixed(2)} €</span>`;

    if (cartCountBadge) cartCountBadge.innerText = getCartCount();
  }

  // ============================================================
  // 2. STYLING & POSITIONIERUNG VON ELEMENTEN/ICONS
  //    Erweiterte Default-Attribute werden in createElement gesetzt.
  // ============================================================
  function applyElementStyleAttributes(item, wrapperEl) {
    wrapperEl.classList.add("styled-wrapper");
    wrapperEl.style.background = item.bgColor || "transparent";
    wrapperEl.style.border = `${item.borderWidth || 0}px ${item.borderStyle || "solid"} ${item.borderColor || "transparent"}`;
    wrapperEl.style.borderRadius = item.shape === "circle" ? "50%" : `${item.radius || 0}px`;
    wrapperEl.style.padding = `${item.padding || 0}px`;
  }

  // ============================================================
  // 3. TOAST-/MELDUNGS-POSITIONIERUNG
  // ============================================================
  function setToastPosition(position) {
    toastPosition = position;
    toastContainer.classList.remove("toast-top-right", "toast-top-left", "toast-bottom-right", "toast-bottom-left");
    toastContainer.classList.add(`toast-${position}`);
  }

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "danger") icon = "⚠️";

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-leaving");
      toast.addEventListener("animationend", () => toast.remove());
      // Fallback falls keine CSS-Animation definiert ist
      setTimeout(() => toast.remove(), 600);
    }, 2800);
  }

  // ============================================================
  // 4. CUSTOM ICONS & GENERISCHES MODAL-SYSTEM
  // ============================================================
  function renderIconPalette() {
    let palette = document.getElementById("icon-palette-custom");
    if (!palette) {
      const host = document.querySelector(".palette-panel") || document.body;
      palette = ensureEl("icon-palette-custom", host, "div", "icon-palette-custom");
      palette.innerHTML = `<h4 style="font-size:12px; margin:10px 0 6px; color:#6b7280;">Eigene Icons</h4><div id="icon-palette-list" style="display:flex; gap:6px; flex-wrap:wrap;"></div>`;
    }
    const list = document.getElementById("icon-palette-list");
    list.innerHTML = "";
    Object.keys(SVGMAP).forEach(name => {
      const item = document.createElement("div");
      item.className = "draggable-item";
      item.draggable = true;
      item.dataset.type = "icon";
      item.dataset.icon = name;
      item.style.cssText = "width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;border-radius:6px;cursor:grab;";
      item.innerHTML = SVGMAP[name];
      item.addEventListener("dragstart", (e) => {
        draggedType = "icon";
        draggedIcon = name;
        e.dataTransfer.setData("text/plain", "icon");
      });
      list.appendChild(item);
    });
  }
  renderIconPalette();

  function openModal(titleText, bodyHTML, footerHTML = "") {
    modalTitle.innerText = titleText;
    modalBody.innerHTML = bodyHTML;
    modalFooter.innerHTML = footerHTML || `<button class="btn btn-primary" id="modal-generic-close">Schließen</button>`;
    modalOverlay.classList.add("active");
    const genericClose = document.getElementById("modal-generic-close");
    if (genericClose) genericClose.addEventListener("click", closeModal);
  }

  function closeModal() {
    modalOverlay.classList.remove("active");
  }

  closeModalBtn.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  /** Generische Modal-Aktion: nutzt item.modalTitle / item.modalBody (frei editierbar im Inspector) */
  function openCustomModal(item) {
    openModal(
      item.modalTitle || "Information",
      `<div>${(item.modalBody || "").replace(/\n/g, "<br>")}</div>`
    );
  }

  // ============================================================
  // 5. TEXT-INTERAKTION & WORT-HERVORHEBUNG
  // ============================================================
  /**
   * Rendert Text-Content und berücksichtigt:
   * - linkScope: "all" (gesamtes Element klickbar) | "word" (nur item.linkWord anklickbar)
   * - highlightedWords: Array von { word, bold, color }
   */
  function renderTextContent(item) {
    const words = (item.text || "").split(/(\s+)/); // Whitespace erhalten
    return words.map(w => {
      const cleanWord = w.trim();
      if (!cleanWord) return w;

      let html = w;
      const highlight = (item.highlightedWords || []).find(hw => hw.word === cleanWord);
      const isLinkWord = item.linkScope === "word" && item.linkWord && cleanWord === item.linkWord;

      let styleParts = [];
      if (highlight) {
        if (highlight.bold) styleParts.push("font-weight:bold");
        if (highlight.color) styleParts.push(`color:${highlight.color}`);
      }
      if (isLinkWord) {
        styleParts.push("color:blue", "text-decoration:underline", "cursor:pointer");
      }

      if (styleParts.length) {
        const cls = isLinkWord ? "text-word-link" : (highlight ? "text-word-highlight" : "");
        html = `<span class="${cls}" data-word-link="${isLinkWord ? '1' : '0'}" style="${styleParts.join(';')}">${w}</span>`;
      }
      return html;
    }).join("");
  }

  // ============================================================
  // 6. DYNAMIC CANVAS & LAYOUT FIXES
  // ============================================================
  function setupCanvasResize() {
    let handle = document.getElementById("canvas-resize-handle");
    if (!handle) {
      handle = document.createElement("div");
      handle.id = "canvas-resize-handle";
      canvas.appendChild(handle);
    }
    let growBtn = document.getElementById("btn-grow-canvas");
    if (!growBtn) {
      growBtn = document.createElement("button");
      growBtn.id = "btn-grow-canvas";
      growBtn.type = "button";
      growBtn.innerText = "+ Höhe";
      canvas.appendChild(growBtn);
    }

    growBtn.addEventListener("click", () => {
      const current = canvas.offsetHeight;
      canvas.style.minHeight = `${current + 200}px`;
      showToast("Canvas-Höhe vergrößert", "info");
    });

    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    handle.addEventListener("mousedown", (e) => {
      isResizing = true;
      startY = e.clientY;
      startHeight = canvas.offsetHeight;
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;
      const delta = e.clientY - startY;
      const newHeight = Math.max(300, startHeight + delta);
      canvas.style.minHeight = `${newHeight}px`;
    });

    document.addEventListener("mouseup", () => {
      isResizing = false;
    });
  }
  setupCanvasResize();

  // Layout-Fix: verhindert Verschiebung/"Verfälschung" nach links und
  // stellt sicher, dass der Canvas-Wrapper im Vorschau-Modus zentriert bleibt.
  function fixCanvasLayout() {
    canvas.style.marginLeft = "auto";
    canvas.style.marginRight = "auto";
    canvas.style.boxSizing = "border-box";
    const wrapper = document.getElementById("canvas-wrapper");
    if (wrapper) {
      wrapper.style.overflowX = "hidden";
      wrapper.style.width = "100%";
    }
  }
  fixCanvasLayout();

  // ============================================================
  // 8. KATEGORIEN, EIGENSCHAFTEN & FILTER-SYSTEM
  // ============================================================
  function addCategory(name) {
    if (!name) return null;
    const existing = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const cat = { id: "cat_" + Date.now(), name };
    categories.push(cat);
    renderFilterWidget();
    return cat;
  }

  function assignCategoryToElement(elementId, categoryName) {
    const item = elements.find(el => el.id === elementId);
    if (!item) return;
    if (!item.categories) item.categories = [];
    const cat = addCategory(categoryName);
    if (cat && !item.categories.includes(cat.id)) {
      item.categories.push(cat.id);
    }
    renderCanvas();
  }

  function highlightCategoryOnCanvas(categoryId, active) {
    canvas.querySelectorAll(".placed-element").forEach(domEl => {
      const item = elements.find(el => el.id === domEl.dataset.id);
      if (!item) return;
      const matches = (item.categories || []).includes(categoryId);
      if (active) {
        domEl.classList.toggle("category-highlighted", matches);
        domEl.classList.toggle("category-dimmed", !matches);
      } else {
        domEl.classList.remove("category-highlighted", "category-dimmed");
      }
    });
  }

  function ensureFilterMenuEntry() {
    // Sucht den Menüpunkt "Mehr" (falls vorhanden) und hängt den Filter-Toggle an.
    let moreMenuItem = Array.from(document.querySelectorAll("button, a, li")).find(
      el => el.textContent && el.textContent.trim().toLowerCase() === "mehr"
    );
    let toggleBtn = document.getElementById("btn-toggle-filter-widget");
    if (!toggleBtn) {
      toggleBtn = document.createElement("button");
      toggleBtn.id = "btn-toggle-filter-widget";
      toggleBtn.type = "button";
      toggleBtn.className = "btn btn-secondary";
      toggleBtn.innerText = "🔍 Filter";
      (moreMenuItem ? moreMenuItem.parentElement : document.body).appendChild(toggleBtn);
    }
    toggleBtn.addEventListener("click", () => {
      const panel = document.getElementById("filter-widget-panel");
      if (panel) panel.classList.toggle("active");
    });
  }

  function renderFilterWidget() {
    let panel = document.getElementById("filter-widget-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "filter-widget-panel";
      document.body.appendChild(panel);
    }
    panel.innerHTML = `
      <h3>Kategorien filtern</h3>
      <input type="text" id="filter-search-input" placeholder="Suche nach Name..." />
      <div id="filter-cat-list"></div>
    `;
    const list = panel.querySelector("#filter-cat-list");
    categories.forEach(cat => {
      const label = document.createElement("label");
      label.className = "filter-cat-item";
      label.innerHTML = `<input type="checkbox" class="filter-cat-checkbox" data-cat-id="${cat.id}" /> ${cat.name}`;
      list.appendChild(label);
    });

    panel.querySelectorAll(".filter-cat-checkbox").forEach(cb => {
      cb.addEventListener("change", applyActiveFilters);
    });
    const searchInput = panel.querySelector("#filter-search-input");
    searchInput.addEventListener("input", applyActiveFilters);
  }

  function applyActiveFilters() {
    const panel = document.getElementById("filter-widget-panel");
    if (!panel) return;
    const searchTerm = (panel.querySelector("#filter-search-input").value || "").toLowerCase();
    const activeCatIds = Array.from(panel.querySelectorAll(".filter-cat-checkbox:checked")).map(cb => cb.dataset.catId);

    canvas.querySelectorAll(".placed-element").forEach(domEl => {
      const item = elements.find(el => el.id === domEl.dataset.id);
      if (!item) return;
      const matchesSearch = !searchTerm || (item.text || "").toLowerCase().includes(searchTerm);
      const matchesCategory = activeCatIds.length === 0 || (item.categories || []).some(cid => activeCatIds.includes(cid));
      const visible = matchesSearch && matchesCategory;
      domEl.classList.toggle("category-dimmed", !visible);
      domEl.classList.toggle("category-highlighted", visible && (searchTerm || activeCatIds.length));
    });
  }

  ensureFilterMenuEntry();
  renderFilterWidget();

  // ============================================================
  // 9. GRUPPIERUNG, DUPLIZIEREN & PRODUKT-VORLAGEN
  // ============================================================
  function duplicateElement(id) {
    const original = elements.find(el => el.id === id);
    if (!original) return;
    const copy = JSON.parse(JSON.stringify(original));
    copy.id = "elem_" + Date.now();
    copy.x = original.x + 24;
    copy.y = original.y + 24;
    elements.push(copy);
    renderCanvas();
    selectElement(copy.id);
    showToast("Element dupliziert", "success");
  }

  function groupSelectedElements(ids) {
    if (!ids || ids.length < 2) {
      showToast("Bitte mindestens 2 Elemente für eine Gruppe auswählen", "danger");
      return;
    }
    const groupId = "group_" + Date.now();
    groups.push({ id: groupId, elementIds: [...ids] });
    ids.forEach(id => {
      const item = elements.find(el => el.id === id);
      if (item) item.groupId = groupId;
    });
    renderCanvas();
    showToast("Elemente gruppiert", "success");
  }

  function createProductCardTemplate(x = 60, y = 60) {
    const baseId = "elem_" + Date.now();
    const image = {
      id: baseId + "_img", type: "image", x, y, text: "",
      color: "#1f2937", size: 200, imageUrl: "https://picsum.photos/300/200",
      actionType: "none", actionUrl: "", actionMsg: "",
      bgColor: "transparent", borderWidth: 0, borderStyle: "solid", borderColor: "transparent",
      shape: "rounded", radius: 8, padding: 0, categories: []
    };
    const headline = {
      id: baseId + "_headline", type: "headline", x, y: y + 210, text: "Produktname",
      color: "#1f2937", size: 22, imageUrl: "", actionType: "none", actionUrl: "", actionMsg: "",
      bgColor: "transparent", borderWidth: 0, borderStyle: "solid", borderColor: "transparent",
      shape: "rounded", radius: 0, padding: 0, categories: []
    };
    const price = {
      id: baseId + "_price", type: "text", x, y: y + 250, text: "49,99 €",
      color: "#16a34a", size: 18, imageUrl: "", actionType: "none", actionUrl: "", actionMsg: "",
      bgColor: "transparent", borderWidth: 0, borderStyle: "solid", borderColor: "transparent",
      shape: "rounded", radius: 0, padding: 0, categories: []
    };
    const button = {
      id: baseId + "_btn", type: "button", x, y: y + 290, text: "In den Warenkorb",
      color: "#2563eb", size: 16, imageUrl: "", actionType: "cart-add", actionUrl: "", actionMsg: "",
      bgColor: "transparent", borderWidth: 0, borderStyle: "solid", borderColor: "transparent",
      shape: "rounded", radius: 6, padding: 4, categories: []
    };

    const templateGroupId = "group_" + Date.now();
    [image, headline, price, button].forEach(el => { el.groupId = templateGroupId; });
    groups.push({ id: templateGroupId, elementIds: [image.id, headline.id, price.id, button.id] });

    elements.push(image, headline, price, button);
    renderCanvas();
    showToast("Produkt-Vorlage eingefügt", "success");
  }

  // ============================================================
  // 10. KOPF- & FUSSZEILE (Header & Footer)
  // ============================================================
  function renderHeaderFooter() {
    let header = document.getElementById("builder-header");
    let footer = document.getElementById("builder-footer");
    const canvasWrapper = canvas.parentElement || document.body;

    if (headerEnabled) {
      if (!header) {
        header = document.createElement("div");
        header.id = "builder-header";
        canvasWrapper.insertBefore(header, canvas);
      }
      header.classList.toggle("sticky-header", headerSticky);
      header.innerHTML = `<strong contenteditable="true" id="builder-header-text">${headerText}</strong>`;
      const headerTextEl = document.getElementById("builder-header-text");
      headerTextEl.addEventListener("input", () => { headerText = headerTextEl.innerText; });
    } else if (header) {
      header.remove();
    }

    if (footerEnabled) {
      if (!footer) {
        footer = document.createElement("div");
        footer.id = "builder-footer";
        canvasWrapper.appendChild(footer);
      }
      footer.innerHTML = `<span contenteditable="true" id="builder-footer-text">${footerText}</span>`;
      const footerTextEl = document.getElementById("builder-footer-text");
      footerTextEl.addEventListener("input", () => { footerText = footerTextEl.innerText; });
    } else if (footer) {
      footer.remove();
    }
  }

  function ensureHeaderFooterControls() {
    let panel = document.getElementById("header-footer-controls");
    if (!panel) {
      const host = document.querySelector(".toolbar") || document.body;
      panel = document.createElement("div");
      panel.id = "header-footer-controls";
      panel.style.cssText = "display:flex; gap:8px; align-items:center;";
      panel.innerHTML = `
        <button id="btn-toggle-header" class="btn btn-secondary" type="button">Header</button>
        <button id="btn-toggle-header-sticky" class="btn btn-secondary" type="button">Sticky</button>
        <button id="btn-toggle-footer" class="btn btn-secondary" type="button">Footer</button>
      `;
      host.appendChild(panel);
    }
    document.getElementById("btn-toggle-header").addEventListener("click", () => {
      headerEnabled = !headerEnabled;
      renderHeaderFooter();
      showToast(headerEnabled ? "Header aktiviert" : "Header deaktiviert", "info");
    });
    document.getElementById("btn-toggle-header-sticky").addEventListener("click", () => {
      headerSticky = !headerSticky;
      renderHeaderFooter();
      showToast(headerSticky ? "Sticky Header aktiv" : "Sticky Header deaktiviert", "info");
    });
    document.getElementById("btn-toggle-footer").addEventListener("click", () => {
      footerEnabled = !footerEnabled;
      renderHeaderFooter();
      showToast(footerEnabled ? "Footer aktiviert" : "Footer deaktiviert", "info");
    });
  }
  ensureHeaderFooterControls();

  // ============================================================
  // INSPECTOR ERWEITERUNGEN (Styling, Hover, Kategorien, Text/Link,
  // generisches Modal, Duplizieren/Gruppieren)
  // ============================================================
  function ensureExtendedInspector() {
    let extPanel = document.getElementById("inspector-extended");
    if (!extPanel) {
      extPanel = document.createElement("div");
      extPanel.id = "inspector-extended";
      inspectorForm.appendChild(extPanel);
    }
    extPanel.innerHTML = `
      <div class="inspector-subsection">
        <h4>Styling</h4>
        <div class="inspector-row"><label>Hintergrund</label><input type="color" id="ext-bg-color" /></div>
        <div class="inspector-row"><label>Rahmenfarbe</label><input type="color" id="ext-border-color" /></div>
        <div class="inspector-row"><label>Rahmendicke</label><input type="number" id="ext-border-width" min="0" max="20" /></div>
        <div class="inspector-row"><label>Rahmenart</label>
          <select id="ext-border-style">
            <option value="solid">solid</option>
            <option value="dashed">dashed</option>
            <option value="dotted">dotted</option>
          </select>
        </div>
        <div class="inspector-row"><label>Form</label>
          <select id="ext-shape">
            <option value="square">eckig</option>
            <option value="rounded">abgerundet</option>
            <option value="circle">rund</option>
          </select>
        </div>
        <div class="inspector-row"><label>Radius</label><input type="number" id="ext-radius" min="0" max="200" /></div>
        <div class="inspector-row"><label>Padding</label><input type="number" id="ext-padding" min="0" max="100" /></div>
      </div>

      <div class="inspector-subsection">
        <h4>Toast-Position</h4>
        <div class="inspector-row">
          <select id="ext-toast-position">
            <option value="top-right">Oben rechts</option>
            <option value="top-left">Oben links</option>
            <option value="bottom-right">Unten rechts</option>
            <option value="bottom-left">Unten links</option>
          </select>
        </div>
      </div>

      <div class="inspector-subsection" id="ext-modal-section" style="display:none;">
        <h4>Modal-Inhalt</h4>
        <div class="inspector-row"><label>Titel</label><input type="text" id="ext-modal-title" /></div>
        <div class="inspector-row"><label>Text</label><textarea id="ext-modal-body" rows="4" style="width:100%;"></textarea></div>
      </div>

      <div class="inspector-subsection" id="ext-text-section" style="display:none;">
        <h4>Text-Link & Hervorhebung</h4>
        <div class="inspector-row"><label>Link-Umfang</label>
          <select id="ext-link-scope">
            <option value="all">Gesamter Text</option>
            <option value="word">Nur ein Wort</option>
          </select>
        </div>
        <div class="inspector-row"><label>Link-Wort</label><input type="text" id="ext-link-word" placeholder="z. B. hier" /></div>
        <div class="inspector-row"><label>Wort markieren</label><input type="text" id="ext-highlight-word" placeholder="Wort" /></div>
        <div class="inspector-row"><label>Fett</label><input type="checkbox" id="ext-highlight-bold" /></div>
        <div class="inspector-row"><label>Farbe</label><input type="color" id="ext-highlight-color" value="#f59e0b" /></div>
        <div class="inspector-row"><button type="button" class="btn btn-secondary" id="ext-highlight-add">Hervorhebung hinzufügen</button></div>
      </div>

      <div class="inspector-subsection">
        <h4>Hover-Effekte</h4>
        <div class="inspector-row"><label>Hover-Bild-URL</label><input type="text" id="ext-hover-image" placeholder="https://..." /></div>
        <div class="inspector-row"><label>Transition (s)</label><input type="number" id="ext-hover-duration" step="0.1" min="0" value="0.3" /></div>
        <div class="inspector-row"><label>Easing</label>
          <select id="ext-hover-easing">
            <option value="ease">ease</option>
            <option value="linear">linear</option>
            <option value="ease-in-out">ease-in-out</option>
          </select>
        </div>
        <div class="inspector-row"><label>Tooltip-Text</label><input type="text" id="ext-hover-desc" placeholder="Zusätzliche Beschreibung" /></div>
      </div>

      <div class="inspector-subsection">
        <h4>Kategorien</h4>
        <div class="inspector-row"><input type="text" id="ext-category-input" placeholder="Kategorie hinzufügen (z. B. Pulver)" />
          <button type="button" class="btn btn-secondary" id="ext-category-add">+</button>
        </div>
        <div id="ext-category-list" style="font-size:12px; color:#374151;"></div>
      </div>

      <div class="inspector-subsection">
        <h4>Gruppierung & Vorlagen</h4>
        <div class="inspector-row">
          <button type="button" class="btn btn-secondary" id="ext-btn-duplicate">Duplizieren</button>
          <button type="button" class="btn btn-secondary" id="ext-btn-select-group">Zur Gruppen-Auswahl</button>
          <button type="button" class="btn btn-secondary" id="ext-btn-group-now">Auswahl gruppieren</button>
        </div>
        <div class="inspector-row">
          <button type="button" class="btn btn-primary" id="ext-btn-insert-template">+ Produkt-Vorlage einfügen</button>
        </div>
      </div>
    `;

    // Toast Position (global, nicht elementgebunden)
    document.getElementById("ext-toast-position").addEventListener("change", (e) => {
      setToastPosition(e.target.value);
    });

    document.getElementById("ext-btn-insert-template").addEventListener("click", () => {
      createProductCardTemplate(80, 80);
    });

    document.getElementById("ext-btn-select-group").addEventListener("click", () => {
      const item = getSelected();
      if (!item) return;
      if (!selectedElementIds.includes(item.id)) {
        selectedElementIds.push(item.id);
        showToast(`${item.id} zur Gruppen-Auswahl hinzugefügt (${selectedElementIds.length} ausgewählt)`, "info");
        renderCanvas();
      }
    });

    document.getElementById("ext-btn-group-now").addEventListener("click", () => {
      groupSelectedElements(selectedElementIds);
      selectedElementIds = [];
    });

    document.getElementById("ext-btn-duplicate").addEventListener("click", () => {
      if (selectedElementId) duplicateElement(selectedElementId);
    });

    document.getElementById("ext-category-add").addEventListener("click", () => {
      const input = document.getElementById("ext-category-input");
      const item = getSelected();
      if (item && input.value.trim()) {
        assignCategoryToElement(item.id, input.value.trim());
        input.value = "";
        populateExtendedInspector(item);
      }
    });

    document.getElementById("ext-highlight-add").addEventListener("click", () => {
      const item = getSelected();
      const word = document.getElementById("ext-highlight-word").value.trim();
      const bold = document.getElementById("ext-highlight-bold").checked;
      const color = document.getElementById("ext-highlight-color").value;
      if (item && word) {
        if (!item.highlightedWords) item.highlightedWords = [];
        item.highlightedWords = item.highlightedWords.filter(hw => hw.word !== word);
        item.highlightedWords.push({ word, bold, color });
        renderCanvas();
        showToast(`Wort "${word}" hervorgehoben`, "success");
      }
    });

    // Live-Bindings für Styling-Felder
    const bindStyleField = (fieldId, prop, parser = (v) => v) => {
      document.getElementById(fieldId).addEventListener("input", (e) => {
        const item = getSelected();
        if (item) { item[prop] = parser(e.target.value); renderCanvas(); }
      });
    };
    bindStyleField("ext-bg-color", "bgColor");
    bindStyleField("ext-border-color", "borderColor");
    bindStyleField("ext-border-width", "borderWidth", parseFloat);
    bindStyleField("ext-border-style", "borderStyle");
    bindStyleField("ext-shape", "shape");
    bindStyleField("ext-radius", "radius", parseFloat);
    bindStyleField("ext-padding", "padding", parseFloat);
    bindStyleField("ext-modal-title", "modalTitle");
    bindStyleField("ext-modal-body", "modalBody");
    bindStyleField("ext-link-scope", "linkScope");
    bindStyleField("ext-link-word", "linkWord");
    bindStyleField("ext-hover-image", "hoverImage");
    bindStyleField("ext-hover-duration", "hoverTransitionDuration", parseFloat);
    bindStyleField("ext-hover-easing", "hoverEasing");
    bindStyleField("ext-hover-desc", "hoverDescription");
  }
  ensureExtendedInspector();

  function populateExtendedInspector(item) {
    document.getElementById("ext-bg-color").value = item.bgColor && item.bgColor !== "transparent" ? item.bgColor : "#ffffff";
    document.getElementById("ext-border-color").value = item.borderColor && item.borderColor !== "transparent" ? item.borderColor : "#000000";
    document.getElementById("ext-border-width").value = item.borderWidth || 0;
    document.getElementById("ext-border-style").value = item.borderStyle || "solid";
    document.getElementById("ext-shape").value = item.shape || "square";
    document.getElementById("ext-radius").value = item.radius || 0;
    document.getElementById("ext-padding").value = item.padding || 0;
    document.getElementById("ext-toast-position").value = toastPosition;

    const isCustomModal = item.actionType === "open-custom-modal";
    document.getElementById("ext-modal-section").style.display = isCustomModal ? "block" : "none";
    document.getElementById("ext-modal-title").value = item.modalTitle || "";
    document.getElementById("ext-modal-body").value = item.modalBody || "";

    const isTextLike = ["text", "headline", "button"].includes(item.type);
    document.getElementById("ext-text-section").style.display = isTextLike ? "block" : "none";
    document.getElementById("ext-link-scope").value = item.linkScope || "all";
    document.getElementById("ext-link-word").value = item.linkWord || "";

    document.getElementById("ext-hover-image").value = item.hoverImage || "";
    document.getElementById("ext-hover-duration").value = item.hoverTransitionDuration != null ? item.hoverTransitionDuration : 0.3;
    document.getElementById("ext-hover-easing").value = item.hoverEasing || "ease";
    document.getElementById("ext-hover-desc").value = item.hoverDescription || "";

    const catList = document.getElementById("ext-category-list");
    const names = (item.categories || []).map(cid => {
      const cat = categories.find(c => c.id === cid);
      return cat ? cat.name : null;
    }).filter(Boolean);
    catList.innerText = names.length ? `Zugewiesen: ${names.join(", ")}` : "Keine Kategorien zugewiesen";
  }

  // ============================================================
  // AKTIONSTYPEN: "open-cookie-modal" / "open-agb-modal" entfernt,
  // ersetzt durch generische Aktion "open-custom-modal"
  // ============================================================
  function ensureGenericModalActionOption() {
    if (!propActionType) return;
    Array.from(propActionType.options).forEach(opt => {
      if (opt.value === "open-cookie-modal" || opt.value === "open-agb-modal") {
        opt.remove();
      }
    });
    if (!Array.from(propActionType.options).some(o => o.value === "open-custom-modal")) {
      const opt = document.createElement("option");
      opt.value = "open-custom-modal";
      opt.innerText = "Eigenes Modal öffnen";
      propActionType.appendChild(opt);
    }
  }
  ensureGenericModalActionOption();

  // ============================================================
  // CANVAS BACKGROUND CONTROL LOGIC (unverändert aus Original)
  // ============================================================
  bgType.addEventListener("change", () => {
    const mode = bgType.value;
    bgSolidGroup.classList.toggle("hidden", mode !== "solid");
    bgGradientGroup.classList.toggle("hidden", mode !== "gradient");
    bgImageGroup.classList.toggle("hidden", mode !== "image");
    updateCanvasBackground();
  });

  bgColorInput.addEventListener("input", updateCanvasBackground);
  bgGrad1Input.addEventListener("input", updateCanvasBackground);
  bgGrad2Input.addEventListener("input", updateCanvasBackground);
  bgGradDirInput.addEventListener("change", updateCanvasBackground);
  bgImageUrlInput.addEventListener("input", updateCanvasBackground);

  bgImageFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        bgImageUrlInput.value = event.target.result;
        updateCanvasBackground();
      };
      reader.readAsDataURL(file);
    }
  });

  function updateCanvasBackground() {
    const mode = bgType.value;
    if (mode === "solid") {
      canvas.style.background = bgColorInput.value;
      canvas.style.backgroundImage = "none";
    } else if (mode === "gradient") {
      canvas.style.background = `linear-gradient(${bgGradDirInput.value}, ${bgGrad1Input.value}, ${bgGrad2Input.value})`;
    } else if (mode === "image") {
      const url = bgImageUrlInput.value || 'https://picsum.photos/1000/1200';
      canvas.style.background = `url("${url}") center/cover no-repeat`;
    }
  }

  // ============================================================
  // DRAG & DROP SETUP
  // ============================================================
  document.querySelectorAll(".draggable-item").forEach(item => {
    item.addEventListener("dragstart", (e) => {
      draggedType = item.dataset.type;
      draggedIcon = item.dataset.icon || null;
      e.dataTransfer.setData("text/plain", draggedType);
    });
  });

  canvas.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  canvas.addEventListener("drop", (e) => {
    e.preventDefault();
    if (isPreviewMode) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - 40;
    const y = e.clientY - rect.top - 20;

    createElement(draggedType, draggedIcon, Math.max(0, x), Math.max(0, y));
  });

  // ============================================================
  // ELEMENT CREATION & MANAGEMENT (erweitert um neue Attribute)
  // ============================================================
  function createElement(type, iconName = null, x = 50, y = 50) {
    const id = "elem_" + Date.now();
    const newElement = {
      id,
      type,
      iconName,
      x,
      y,
      text: type === "button" ? "Klick mich" : (type === "headline" ? "Neue Überschrift" : "Beispieltext..."),
      color: "#1f2937",
      size: type === "icon" ? 36 : (type === "headline" ? 32 : (type === "image" ? 200 : 18)),
      imageUrl: type === "image" ? "https://picsum.photos/300/200" : "",
      actionType: "none",
      actionUrl: "",
      actionMsg: "",

      // --- Neue Attribute: Styling ---
      bgColor: "transparent",
      borderWidth: 0,
      borderStyle: "solid",
      borderColor: "transparent",
      shape: "square",
      radius: 0,
      padding: 0,

      // --- Neue Attribute: Warenkorb / generisches Modal ---
      price: 9.99,
      modalTitle: "",
      modalBody: "",

      // --- Neue Attribute: Text-Interaktion ---
      linkScope: "all",
      linkWord: "",
      highlightedWords: [],

      // --- Neue Attribute: Hover ---
      hoverImage: "",
      hoverTransitionDuration: 0.3,
      hoverEasing: "ease",
      hoverDescription: "",

      // --- Neue Attribute: Kategorien / Gruppierung ---
      categories: [],
      groupId: null
    };

    elements.push(newElement);
    renderCanvas();
    selectElement(id);
    showToast("Neues Element hinzugefügt", "success");
  }

  function renderCanvas() {
    canvas.querySelectorAll(".placed-element").forEach(el => el.remove());
    canvasHint.classList.toggle("hidden", elements.length > 0);

    elements.forEach(item => {
      const el = document.createElement("div");
      el.className = [
        "placed-element",
        item.id === selectedElementId ? "selected" : "",
        item.actionType !== "none" ? "has-action" : "",
        selectedElementIds.includes(item.id) ? "multi-selected" : "",
        item.groupId ? "grouped-element" : ""
      ].filter(Boolean).join(" ");
      el.style.left = `${item.x}px`;
      el.style.top = `${item.y}px`;
      el.style.color = item.color;
      el.dataset.id = item.id;

      // Styling-Wrapper (Background/Border/Radius/Padding)
      applyElementStyleAttributes(item, el);

      // Hover-Transition konfigurieren
      el.style.transition = `all ${item.hoverTransitionDuration != null ? item.hoverTransitionDuration : 0.3}s ${item.hoverEasing || "ease"}`;

      // Inner HTML Render based on Type
      if (item.type === "icon" && SVGMAP[item.iconName]) {
        el.innerHTML = SVGMAP[item.iconName];
        const svg = el.querySelector("svg, img");
        if (svg) {
          svg.style.width = `${item.size}px`;
          svg.style.height = `${item.size}px`;
        }
      } else if (item.type === "button") {
        el.innerHTML = `<button class="btn btn-primary" style="font-size:${item.size}px; background-color:${item.color}">${renderTextContent(item)}</button>`;
      } else if (item.type === "headline") {
        el.innerHTML = `<h2 style="font-size:${item.size}px; color:${item.color};">${renderTextContent(item)}</h2>`;
      } else if (item.type === "box") {
        el.innerHTML = `<div style="width:140px; height:90px; background:${item.color}; border-radius:8px; box-shadow: var(--shadow-md);"></div>`;
      } else if (item.type === "image") {
        const src = item.imageUrl || "https://via.placeholder.com/200";
        el.innerHTML = `<img src="${src}" class="canvas-img" style="width:${item.size}px; height:auto;" alt="Bild Element" data-default-src="${src}" data-hover-src="${item.hoverImage || ''}" />`;
      } else {
        el.innerHTML = `<p style="font-size:${item.size}px; color:${item.color};">${renderTextContent(item)}</p>`;
      }

      // Badge indicator for linked action
      const badge = document.createElement("span");
      badge.className = "element-badge";
      badge.innerText = "⚡ Logik";
      el.appendChild(badge);

      // --- Hover: Bildwechsel ---
      if (item.type === "image" && item.hoverImage) {
        const imgTag = el.querySelector("img");
        el.addEventListener("mouseenter", () => { if (imgTag) imgTag.src = item.hoverImage; });
        el.addEventListener("mouseleave", () => { if (imgTag) imgTag.src = item.imageUrl; });
      }

      // --- Hover: Tooltip/Description ---
      if (item.hoverDescription) {
        el.addEventListener("mouseenter", (e) => {
          const tip = ensureEl("hover-tooltip-active", document.body, "div", "hover-tooltip");
          tip.innerText = item.hoverDescription;
          const rect = el.getBoundingClientRect();
          tip.style.left = `${rect.left + rect.width / 2}px`;
          tip.style.top = `${rect.top}px`;
          tip.classList.add("visible");
        });
        el.addEventListener("mouseleave", () => {
          const tip = document.getElementById("hover-tooltip-active");
          if (tip) tip.classList.remove("visible");
        });
      }

      // --- Kategorie-Text-Element: Hover hebt zugehörige Produkte hervor ---
      if (item.type !== "icon" && (item.categories || []).length && item.text) {
        el.addEventListener("mouseenter", () => {
          item.categories.forEach(catId => highlightCategoryOnCanvas(catId, true));
        });
        el.addEventListener("mouseleave", () => {
          item.categories.forEach(catId => highlightCategoryOnCanvas(catId, false));
        });
      }

      // --- Wort-Link Klick-Handler (nur im Vorschau-Modus relevant, aber Listener ist harmlos) ---
      el.querySelectorAll('[data-word-link="1"]').forEach(wordEl => {
        wordEl.addEventListener("click", (evt) => {
          if (!isPreviewMode) return;
          evt.stopPropagation();
          if (item.actionType === "open-url" && item.actionUrl) {
            window.open(item.actionUrl, "_blank");
          }
        });
      });

      // Element Event Handlers
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isPreviewMode) {
          if (item.linkScope === "word") return; // Klick wird vom Wort-Handler übernommen
          executeAction(item, el);
        } else {
          selectElement(item.id);
        }
      });

      makeElementDraggableOnCanvas(el, item);
      canvas.appendChild(el);
    });

    renderHeaderFooter();
  }

  function makeElementDraggableOnCanvas(domEl, item) {
    let isDragging = false;
    let startX, startY;

    domEl.addEventListener("mousedown", (e) => {
      if (isPreviewMode) return;
      isDragging = true;
      startX = e.clientX - item.x;
      startY = e.clientY - item.y;

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        item.x = Math.max(0, moveEvent.clientX - startX);
        item.y = Math.max(0, moveEvent.clientY - startY);
        domEl.style.left = `${item.x}px`;
        domEl.style.top = `${item.y}px`;
      };

      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  // ============================================================
  // INSPECTOR SYNC & INTERACTION
  // ============================================================
  function selectElement(id) {
    selectedElementId = id;
    const item = elements.find(el => el.id === id);

    if (!item) {
      noSelectionUI.classList.remove("hidden");
      inspectorForm.classList.add("hidden");
      return;
    }

    noSelectionUI.classList.add("hidden");
    inspectorForm.classList.remove("hidden");

    // Form inputs visibility based on item type
    const isImage = item.type === "image";
    const isBox = item.type === "box";

    groupText.classList.toggle("hidden", isImage || isBox);
    groupColor.classList.toggle("hidden", isImage);
    groupImage.classList.toggle("hidden", !isImage);

    // Populate Fields
    propId.value = item.id;
    propText.value = item.text || "";
    propSize.value = item.size || 20;
    propColor.value = item.color || "#1f2937";
    propImageUrl.value = item.imageUrl || "";
    propActionType.value = item.actionType || "none";
    propActionUrl.value = item.actionUrl || "";
    propActionMsg.value = item.actionMsg || "";

    toggleActionFields(item.actionType);
    populateExtendedInspector(item);
    renderCanvas();
  }

  canvas.addEventListener("click", () => {
    if (!isPreviewMode) {
      selectedElementId = null;
      selectElement(null);
    }
  });

  // Bind Inspector Inputs to State
  propText.addEventListener("input", (e) => {
    const item = getSelected();
    if (item) { item.text = e.target.value; renderCanvas(); }
  });

  propSize.addEventListener("input", (e) => {
    const item = getSelected();
    if (item) { item.size = parseInt(e.target.value) || 16; renderCanvas(); }
  });

  propColor.addEventListener("input", (e) => {
    const item = getSelected();
    if (item) { item.color = e.target.value; renderCanvas(); }
  });

  propImageUrl.addEventListener("input", (e) => {
    const item = getSelected();
    if (item) { item.imageUrl = e.target.value; renderCanvas(); }
  });

  propImageFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    const item = getSelected();
    if (file && item) {
      const reader = new FileReader();
      reader.onload = (event) => {
        item.imageUrl = event.target.result;
        propImageUrl.value = event.target.result;
        renderCanvas();
      };
      reader.readAsDataURL(file);
    }
  });

  propActionType.addEventListener("change", (e) => {
    const item = getSelected();
    if (item) {
      item.actionType = e.target.value;
      toggleActionFields(item.actionType);
      populateExtendedInspector(item);
      renderCanvas();
    }
  });

  propActionUrl.addEventListener("input", (e) => {
    const item = getSelected();
    if (item) item.actionUrl = e.target.value;
  });

  propActionMsg.addEventListener("input", (e) => {
    const item = getSelected();
    if (item) item.actionMsg = e.target.value;
  });

  btnDelete.addEventListener("click", () => {
    if (selectedElementId) {
      elements = elements.filter(el => el.id !== selectedElementId);
      selectedElementIds = selectedElementIds.filter(id => id !== selectedElementId);
      selectedElementId = null;
      selectElement(null);
      renderCanvas();
      showToast("Element gelöscht", "info");
    }
  });

  function getSelected() {
    return elements.find(el => el.id === selectedElementId);
  }

  function toggleActionFields(actionType) {
    groupActionUrl.classList.toggle("hidden", actionType !== "open-url");
    groupActionMsg.classList.toggle("hidden", actionType !== "alert-msg");
  }

  // ============================================================
  // IN-PAGE MODALS & DRAWERS
  // ============================================================
  function openCartDrawer() {
    cartDrawerBackdrop.classList.add("active");
    cartDrawer.classList.add("active");
    renderCart();
  }

  function closeCartDrawer() {
    cartDrawerBackdrop.classList.remove("active");
    cartDrawer.classList.remove("active");
  }

  closeCartBtn.addEventListener("click", closeCartDrawer);
  cartDrawerBackdrop.addEventListener("click", closeCartDrawer);

  // ============================================================
  // ACTION ENGINE
  // ============================================================
  function executeAction(item, domEl) {
    switch (item.actionType) {
      case "scroll-top":
        window.scrollTo({ top: 0, behavior: "smooth" });
        canvas.scrollTo({ top: 0, behavior: "smooth" });
        showToast("Nach oben gescrollt ⬆️", "info");
        break;

      case "scroll-bottom":
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        canvas.scrollTo({ top: canvas.scrollHeight, behavior: "smooth" });
        showToast("Nach unten gescrollt ⬇️", "info");
        break;

      case "history-back":
        showToast("Browser Zurück-Funktion ausgelöst ↩️", "info");
        break;

      case "open-url":
        if (item.actionUrl) {
          window.open(item.actionUrl, "_blank");
          showToast(`URL geöffnet: ${item.actionUrl}`, "info");
        } else {
          showToast("Keine Ziel-URL im Inspector hinterlegt!", "danger");
        }
        break;

      case "cart-add":
        // Bounce Animation
        domEl.classList.remove("cart-pop-anim");
        void domEl.offsetWidth; // Trigger reflow
        domEl.classList.add("cart-pop-anim");

        addCartItem(item.text || "Produkt", item.price != null ? item.price : 9.99);
        showToast("Artikel in den Warenkorb gelegt! 🛒", "success");
        break;

      case "alert-msg":
        showToast(item.actionMsg || "Eine Benachrichtigung wurde ausgelöst!", "info");
        break;

      case "open-cart-drawer":
        openCartDrawer();
        showToast("Warenkorb geöffnet", "info");
        break;

      case "open-custom-modal":
        openCustomModal(item);
        break;

      default:
        showToast("Keine Verbindungskonfiguration hinterlegt.", "info");
        break;
    }
  }

  // ============================================================
  // TOOLBAR CONTROLS
  // ============================================================
  btnModeToggle.addEventListener("click", () => {
    isPreviewMode = !isPreviewMode;
    document.body.classList.toggle("preview-mode", isPreviewMode);
    btnModeToggle.innerHTML = isPreviewMode ? "✏️ Editor-Modus" : "👁️ Vorschau-Modus";
    fixCanvasLayout();

    if (isPreviewMode) {
      selectedElementId = null;
      renderCanvas();
      showToast("Vorschau-Modus aktiv - Klick-Aktionen sind bereit!", "info");
    } else {
      showToast("Editor-Modus aktiv", "info");
    }
  });

  btnClear.addEventListener("click", () => {
    if (confirm("Möchtest du wirklich alle Elemente von der Zeichenfläche löschen?")) {
      elements = [];
      groups = [];
      selectedElementIds = [];
      selectedElementId = null;
      selectElement(null);
      renderCanvas();
      showToast("Zeichenfläche geleert", "info");
    }
  });

  btnExport.addEventListener("click", () => {
    let exportedHTML = `<!-- WebBuilder Pro Export -->\n`;
    if (headerEnabled) {
      exportedHTML += `<div style="width:100%; padding:14px 20px; background:#111827; color:#fff;${headerSticky ? ' position:sticky; top:0; z-index:300;' : ''}"><strong>${headerText}</strong></div>\n`;
    }
    exportedHTML += `<div style="position:relative; width:100%; min-height:100vh; background:${canvas.style.background};">\n`;
    elements.forEach(item => {
      exportedHTML += `  <!-- Element: ${item.id} (${item.type}) -->\n`;
      const styleWrapper = `background:${item.bgColor || 'transparent'}; border:${item.borderWidth || 0}px ${item.borderStyle || 'solid'} ${item.borderColor || 'transparent'}; border-radius:${item.shape === 'circle' ? '50%' : (item.radius || 0) + 'px'}; padding:${item.padding || 0}px;`;
      exportedHTML += `  <div style="position:absolute; left:${item.x}px; top:${item.y}px; color:${item.color}; ${styleWrapper}">\n`;
      if (item.type === "icon" && SVGMAP[item.iconName]) {
        exportedHTML += `    ${SVGMAP[item.iconName]}\n`;
      } else if (item.type === "button") {
        exportedHTML += `    <button style="font-size:${item.size}px; background:${item.color}; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">${item.text}</button>\n`;
      } else if (item.type === "headline") {
        exportedHTML += `    <h2 style="font-size:${item.size}px; color:${item.color}; margin:0;">${item.text}</h2>\n`;
      } else if (item.type === "image") {
        exportedHTML += `    <img src="${item.imageUrl}" style="width:${item.size}px; height:auto; display:block;" alt="Exportiertes Bild" />\n`;
      } else if (item.type === "box") {
        exportedHTML += `    <div style="width:140px; height:90px; background:${item.color}; border-radius:8px;"></div>\n`;
      } else {
        exportedHTML += `    <p style="font-size:${item.size}px; color:${item.color}; margin:0;">${item.text}</p>\n`;
      }
      exportedHTML += `  </div>\n`;
    });
    exportedHTML += `</div>\n`;
    if (footerEnabled) {
      exportedHTML += `<div style="width:100%; padding:18px 20px; background:#111827; color:#cbd5e1; text-align:center;">${footerText}</div>\n`;
    }

    console.log(exportedHTML);
    showToast("HTML wurde in der Entwickler-Konsole (F12) ausgegeben!", "success");
  });

  // Initiales Rendering
  setToastPosition(toastPosition);
  renderCart();
  renderCanvas();
});
