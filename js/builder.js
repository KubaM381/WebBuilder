document.addEventListener("DOMContentLoaded", () => {
  // ============================================================
  // GLOBAL STATE
  // ============================================================
  let elements = [];
  let categories = []; // { id, name, color }
  let selectedElementId = null;
  let isPreviewMode = false;
  let draggedType = null;
  let draggedIcon = null;

  let cartItems = []; // { id, name, price, qty }

  let headerEnabled = false;
  let headerSticky = false;
  let headerText = "Meine Website";
  let footerEnabled = false;
  let footerText = "© 2026 WebBuilder Pro";

  const CATEGORY_COLOR_PALETTE = ["#6366f1", "#16a34a", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7"];

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

  // Toast Container (immer an fester Standardposition, siehe styles.css)
  let toastContainer = document.getElementById("toast-container");

  // ============================================================
  // ICON DEFINITIONS (erweiterbar über addCustomIcon)
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
  // UTILITY
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

  /** Wandelt Hex-Farbe + Alpha (0-1) in ein rgba()-CSS um */
  function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    let c = hex.replace("#", "");
    if (c.length === 3) c = c.split("").map(ch => ch + ch).join("");
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  if (!toastContainer) {
    toastContainer = ensureEl("toast-container", document.body, "div", "toast-container");
  }

  // ============================================================
  // DYNAMISCH INJIZIERTES CSS (nur was builder.js wirklich braucht)
  // ============================================================
  function injectDynamicStyles() {
    const style = document.createElement("style");
    style.id = "builder-dynamic-styles";
    style.textContent = `
      /* --- Warenkorb Badge Hover --- */
      #cart-count-badge { display: inline-block; transition: transform 0.25s ease; transform-origin: center; }
      #cart-count-badge:hover { transform: scale(1.35); }

      /* --- Element Styling Wrapper (Hintergrund/Transparenz/Rahmenfarbe) --- */
      .placed-element .styled-wrapper { display: inline-block; box-sizing: border-box; }

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
      body.preview-mode .canvas-container { justify-content: center; width: 100%; overflow-x: hidden; }
      body.preview-mode .canvas-area { margin-left: auto; margin-right: auto; }

      /* --- Hover Tooltip / Hover-Description (Position wird per JS gesetzt) --- */
      .hover-tooltip {
        position: absolute; z-index: 200; background: #1f2937; color: #fff;
        padding: 6px 10px; border-radius: 6px; font-size: 12px; max-width: 220px;
        pointer-events: none; opacity: 0; transition: opacity 0.2s ease;
      }
      .hover-tooltip.visible { opacity: 1; }

      /* --- Kategorie Highlight auf dem Canvas --- */
      .placed-element.category-dimmed { opacity: 0.25; transition: opacity 0.25s ease; }
      .placed-element.category-highlighted { opacity: 1; transition: opacity 0.25s ease; }

      /* --- Eigenständiges Kategorien-Verwaltungsmenü --- */
      #category-manager-panel {
        position: fixed; top: 76px; right: 16px; width: 280px; background: #fff;
        border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.15));
        padding: 14px; z-index: 500; display: none;
      }
      #category-manager-panel.active { display: block; }
      #category-manager-panel h3 { margin: 0 0 10px; font-size: 14px; }
      #category-add-row { display: flex; gap: 6px; margin-bottom: 12px; }
      #category-add-row input { flex: 1; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.85rem; }
      .category-manager-item { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
      .category-manager-item input[type="text"] { flex: 1; padding: 5px 7px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.85rem; }
      .category-manager-item input[type="color"] { width: 28px; height: 28px; border: none; cursor: pointer; background: transparent; }
      .category-manager-item .category-delete-btn { background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 0.95rem; }

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
      .inspector-row input[type="range"] { flex: 1; }
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

  /** Separater Knopf in der Toolbar, um den Warenkorb jederzeit einzusehen/zu bearbeiten
      (unabhängig von einer "In den Warenkorb"-Aktion auf einem Element). */
  function ensureCartEditButton() {
    let btn = document.getElementById("btn-edit-cart");
    if (!btn) {
      const host = document.querySelector(".toolbar") || document.body;
      btn = document.createElement("button");
      btn.id = "btn-edit-cart";
      btn.type = "button";
      btn.className = "btn btn-secondary";
      btn.innerText = "🛒 Warenkorb bearbeiten";
      host.appendChild(btn);
    }
    btn.addEventListener("click", openCartDrawer);
    // TODO: Styling der einzelnen Warenkorb-Positionen (Formen etc.) folgt in einem späteren Schritt.
  }
  ensureCartEditButton();

  // ============================================================
  // 2. ELEMENT-STYLING: Hintergrund, Transparenz, Rahmenfarbe
  //    (bewusst reduziert – keine Rahmendicke/Radius/Padding mehr)
  // ============================================================
  function applyElementStyleAttributes(item, wrapperEl) {
    wrapperEl.classList.add("styled-wrapper");

    if (item.bgColor && item.bgColor !== "transparent") {
      const alpha = 1 - (item.transparency || 0) / 100;
      wrapperEl.style.background = hexToRgba(item.bgColor, alpha);
    } else {
      wrapperEl.style.background = "transparent";
    }

    wrapperEl.style.border = (item.borderColor && item.borderColor !== "transparent")
      ? `1px solid ${item.borderColor}`
      : "none";
  }

  // ============================================================
  // 3. MELDUNGEN (Toast & positionierbare benutzerdefinierte Meldung)
  // ============================================================

  /** Standard-Systemmeldungen (fest positioniert unten rechts, siehe styles.css) */
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
      setTimeout(() => toast.remove(), 600);
    }, 2800);
  }

  /** Benutzerdefinierte Meldung: Position frei wählbar, unabhängig vom Standard-Toast. */
  function showPositionedMessage(message, position = "bottom-right") {
    const msgEl = document.createElement("div");
    msgEl.className = "toast toast-info";
    msgEl.innerHTML = `<span>💬</span> <span>${message}</span>`;
    msgEl.style.position = "fixed";
    msgEl.style.zIndex = "9999";

    const offset = "24px";
    if (position === "top-right") { msgEl.style.top = offset; msgEl.style.right = offset; }
    else if (position === "top-left") { msgEl.style.top = offset; msgEl.style.left = offset; }
    else if (position === "bottom-left") { msgEl.style.bottom = offset; msgEl.style.left = offset; }
    else { msgEl.style.bottom = offset; msgEl.style.right = offset; } // bottom-right (Default)

    document.body.appendChild(msgEl);

    setTimeout(() => {
      msgEl.classList.add("toast-leaving");
      msgEl.addEventListener("animationend", () => msgEl.remove());
      setTimeout(() => msgEl.remove(), 600);
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

  function openCustomModal(item) {
    openModal(
      item.modalTitle || "Information",
      `<div>${(item.modalBody || "").replace(/\n/g, "<br>")}</div>`
    );
  }

  // ============================================================
  // 5. TEXT-INTERAKTION & WORT-HERVORHEBUNG
  // ============================================================
  function renderTextContent(item) {
    const words = (item.text || "").split(/(\s+)/);
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

  function fixCanvasLayout() {
    canvas.style.marginLeft = "auto";
    canvas.style.marginRight = "auto";
    canvas.style.boxSizing = "border-box";
  }
  fixCanvasLayout();

  // ============================================================
  // 7. KATEGORIEN: eigenständiges Verwaltungsmenü
  // ============================================================
  function addCategory(name) {
    if (!name) return null;
    const existing = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const color = CATEGORY_COLOR_PALETTE[categories.length % CATEGORY_COLOR_PALETTE.length];
    const cat = { id: "cat_" + Date.now(), name, color };
    categories.push(cat);
    return cat;
  }

  function renameCategory(id, newName) {
    const cat = categories.find(c => c.id === id);
    if (cat && newName.trim()) cat.name = newName.trim();
  }

  function updateCategoryColor(id, color) {
    const cat = categories.find(c => c.id === id);
    if (cat) cat.color = color;
  }

  function deleteCategory(id) {
    categories = categories.filter(c => c.id !== id);
    elements.forEach(el => { if (el.categoryId === id) el.categoryId = null; });
    renderCanvas();
  }

  function highlightCategoryOnCanvas(categoryId, active) {
    const cat = categories.find(c => c.id === categoryId);
    canvas.querySelectorAll(".placed-element").forEach(domEl => {
      const item = elements.find(el => el.id === domEl.dataset.id);
      if (!item) return;
      const matches = item.categoryId === categoryId;
      if (active) {
        domEl.classList.toggle("category-highlighted", matches);
        domEl.classList.toggle("category-dimmed", !matches);
        domEl.style.outline = matches && cat ? `2px dashed ${cat.color}` : "";
      } else {
        domEl.classList.remove("category-highlighted", "category-dimmed");
        domEl.style.outline = "";
      }
    });
  }

  function ensureCategoryManagerButton() {
    let btn = document.getElementById("btn-toggle-category-manager");
    if (!btn) {
      const host = document.querySelector(".toolbar") || document.body;
      btn = document.createElement("button");
      btn.id = "btn-toggle-category-manager";
      btn.type = "button";
      btn.className = "btn btn-secondary";
      btn.innerText = "🏷️ Kategorien";
      host.appendChild(btn);
    }
    btn.addEventListener("click", () => {
      const panel = document.getElementById("category-manager-panel");
      if (panel) panel.classList.toggle("active");
    });
  }

  function renderCategoryManagerPanel() {
    let panel = document.getElementById("category-manager-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "category-manager-panel";
      document.body.appendChild(panel);
    }
    panel.innerHTML = `
      <h3>Kategorien verwalten</h3>
      <div id="category-add-row">
        <input type="text" id="category-new-name" placeholder="z. B. Pulver" />
        <button type="button" class="btn btn-primary" id="category-add-btn">+</button>
      </div>
      <div id="category-manager-list"></div>
    `;

    const list = panel.querySelector("#category-manager-list");
    categories.forEach(cat => {
      const row = document.createElement("div");
      row.className = "category-manager-item";
      row.innerHTML = `
        <input type="color" class="category-color-input" data-cat-id="${cat.id}" value="${cat.color}" />
        <input type="text" class="category-name-input" data-cat-id="${cat.id}" value="${cat.name}" />
        <button type="button" class="category-delete-btn" data-cat-id="${cat.id}" title="Löschen">✕</button>
      `;
      list.appendChild(row);
    });

    panel.querySelector("#category-add-btn").addEventListener("click", () => {
      const input = panel.querySelector("#category-new-name");
      if (input.value.trim()) {
        addCategory(input.value.trim());
        input.value = "";
        renderCategoryManagerPanel();
        refreshCategorySelectOptions();
      }
    });

    panel.querySelectorAll(".category-name-input").forEach(input => {
      input.addEventListener("change", (e) => {
        renameCategory(e.target.dataset.catId, e.target.value);
        renderCanvas();
        refreshCategorySelectOptions();
      });
    });
    panel.querySelectorAll(".category-color-input").forEach(input => {
      input.addEventListener("input", (e) => {
        updateCategoryColor(e.target.dataset.catId, e.target.value);
      });
    });
    panel.querySelectorAll(".category-delete-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        deleteCategory(e.target.dataset.catId);
        renderCategoryManagerPanel();
        refreshCategorySelectOptions();
      });
    });
  }

  ensureCategoryManagerButton();
  renderCategoryManagerPanel();

  /** Aktualisiert die Kategorie-Auswahl im Inspector, falls gerade sichtbar. */
  function refreshCategorySelectOptions() {
    const select = document.getElementById("ext-category-select");
    if (!select) return;
    const item = getSelected();
    const current = item ? item.categoryId : null;
    select.innerHTML = `<option value="">Keine</option>` + categories.map(c =>
      `<option value="${c.id}">${c.name}</option>`
    ).join("");
    select.value = current || "";
  }

  // ============================================================
  // 8. DUPLIZIEREN
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

  // ============================================================
  // 9. KOPF- & FUSSZEILE (Header & Footer)
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
  // INSPECTOR ERWEITERUNGEN
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
        <div class="inspector-row"><label>Transparenz</label><input type="range" id="ext-transparency" min="0" max="100" value="0" /></div>
        <div class="inspector-row"><label>Rahmenfarbe</label><input type="color" id="ext-border-color" /></div>
      </div>

      <div class="inspector-subsection" id="ext-modal-section" style="display:none;">
        <h4>Modal-Inhalt</h4>
        <div class="inspector-row"><label>Titel</label><input type="text" id="ext-modal-title" /></div>
        <div class="inspector-row"><label>Text</label><textarea id="ext-modal-body" rows="4" style="width:100%;"></textarea></div>
      </div>

      <div class="inspector-subsection" id="ext-message-section" style="display:none;">
        <h4>Meldung-Position</h4>
        <div class="inspector-row"><label>Position</label>
          <select id="ext-message-position">
            <option value="top-right">Oben rechts</option>
            <option value="top-left">Oben links</option>
            <option value="bottom-right">Unten rechts</option>
            <option value="bottom-left">Unten links</option>
          </select>
        </div>
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
        <div class="inspector-row"><label>Tooltip-Text</label><input type="text" id="ext-hover-desc" placeholder="Zusätzliche Beschreibung" /></div>
        <div class="inspector-row"><label>Tooltip-Position</label>
          <select id="ext-hover-position">
            <option value="above">Über dem Text</option>
            <option value="below">Unter dem Text</option>
          </select>
        </div>
        <!-- TODO: Vorgefertigte Hover-Effekte (Presets) folgen in einem späteren Schritt -->
      </div>

      <div class="inspector-subsection">
        <h4>Kategorie</h4>
        <div class="inspector-row"><label>Zuweisen</label>
          <select id="ext-category-select"><option value="">Keine</option></select>
        </div>
      </div>

      <div class="inspector-subsection">
        <h4>Aktionen</h4>
        <div class="inspector-row">
          <button type="button" class="btn btn-secondary" id="ext-btn-duplicate">Duplizieren</button>
        </div>
      </div>
    `;

    document.getElementById("ext-btn-duplicate").addEventListener("click", () => {
      if (selectedElementId) duplicateElement(selectedElementId);
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

    document.getElementById("ext-category-select").addEventListener("change", (e) => {
      const item = getSelected();
      if (item) { item.categoryId = e.target.value || null; renderCanvas(); }
    });

    const bindStyleField = (fieldId, prop, parser = (v) => v) => {
      document.getElementById(fieldId).addEventListener("input", (e) => {
        const item = getSelected();
        if (item) { item[prop] = parser(e.target.value); renderCanvas(); }
      });
    };
    bindStyleField("ext-bg-color", "bgColor");
    bindStyleField("ext-transparency", "transparency", parseFloat);
    bindStyleField("ext-border-color", "borderColor");
    bindStyleField("ext-modal-title", "modalTitle");
    bindStyleField("ext-modal-body", "modalBody");
    bindStyleField("ext-message-position", "messagePosition");
    bindStyleField("ext-link-scope", "linkScope");
    bindStyleField("ext-link-word", "linkWord");
    bindStyleField("ext-hover-image", "hoverImage");
    bindStyleField("ext-hover-desc", "hoverDescription");
    bindStyleField("ext-hover-position", "hoverPosition");
  }
  ensureExtendedInspector();

  function populateExtendedInspector(item) {
    document.getElementById("ext-bg-color").value = item.bgColor && item.bgColor !== "transparent" ? item.bgColor : "#ffffff";
    document.getElementById("ext-transparency").value = item.transparency || 0;
    document.getElementById("ext-border-color").value = item.borderColor && item.borderColor !== "transparent" ? item.borderColor : "#000000";

    const isCustomModal = item.actionType === "open-custom-modal";
    document.getElementById("ext-modal-section").style.display = isCustomModal ? "block" : "none";
    document.getElementById("ext-modal-title").value = item.modalTitle || "";
    document.getElementById("ext-modal-body").value = item.modalBody || "";

    const isAlertMsg = item.actionType === "alert-msg";
    document.getElementById("ext-message-section").style.display = isAlertMsg ? "block" : "none";
    document.getElementById("ext-message-position").value = item.messagePosition || "bottom-right";

    const isTextLike = ["text", "headline", "button"].includes(item.type);
    document.getElementById("ext-text-section").style.display = isTextLike ? "block" : "none";
    document.getElementById("ext-link-scope").value = item.linkScope || "all";
    document.getElementById("ext-link-word").value = item.linkWord || "";

    document.getElementById("ext-hover-image").value = item.hoverImage || "";
    document.getElementById("ext-hover-desc").value = item.hoverDescription || "";
    document.getElementById("ext-hover-position").value = item.hoverPosition || "above";

    refreshCategorySelectOptions();
  }

  // ============================================================
  // AKTIONSTYPEN: Bereinigung veralteter Optionen (Cookie-/AGB-Modal),
  // falls in einer älteren HTML-Version noch vorhanden.
  // ============================================================
  function ensureGenericModalActionOption() {
    if (!propActionType) return;
    Array.from(propActionType.options).forEach(opt => {
      if (opt.value === "open-cookie-modal" || opt.value === "open-agb-modal" || opt.value === "open-modal") {
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
  // CANVAS BACKGROUND CONTROL LOGIC (unverändert)
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
  // ELEMENT CREATION & MANAGEMENT
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

      // --- Styling (reduziert) ---
      bgColor: "transparent",
      transparency: 0,
      borderColor: "transparent",

      // --- Warenkorb / generisches Modal ---
      price: 9.99,
      modalTitle: "",
      modalBody: "",

      // --- Benutzerdefinierte Meldung ---
      messagePosition: "bottom-right",

      // --- Text-Interaktion ---
      linkScope: "all",
      linkWord: "",
      highlightedWords: [],

      // --- Hover ---
      hoverImage: "",
      hoverDescription: "",
      hoverPosition: "above",

      // --- Kategorie ---
      categoryId: null
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
        item.actionType !== "none" ? "has-action" : ""
      ].filter(Boolean).join(" ");
      el.style.left = `${item.x}px`;
      el.style.top = `${item.y}px`;
      el.style.color = item.color;
      el.dataset.id = item.id;

      applyElementStyleAttributes(item, el);

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
        el.innerHTML = `<img src="${src}" class="canvas-img" style="width:${item.size}px; height:auto;" alt="Bild Element" />`;
      } else {
        el.innerHTML = `<p style="font-size:${item.size}px; color:${item.color};">${renderTextContent(item)}</p>`;
      }

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

      // --- Hover: Tooltip/Description (Position: über/unter) ---
      if (item.hoverDescription) {
        el.addEventListener("mouseenter", () => {
          const tip = ensureEl("hover-tooltip-active", document.body, "div", "hover-tooltip");
          tip.innerText = item.hoverDescription;
          const rect = el.getBoundingClientRect();
          tip.style.left = `${rect.left + rect.width / 2}px`;
          if (item.hoverPosition === "below") {
            tip.style.top = `${rect.bottom}px`;
            tip.style.transform = "translate(-50%, 10px)";
          } else {
            tip.style.top = `${rect.top}px`;
            tip.style.transform = "translate(-50%, -110%)";
          }
          tip.classList.add("visible");
        });
        el.addEventListener("mouseleave", () => {
          const tip = document.getElementById("hover-tooltip-active");
          if (tip) tip.classList.remove("visible");
        });
      }

      // --- Kategorie-Hover: hebt alle Elemente derselben Kategorie hervor ---
      if (item.categoryId) {
        el.addEventListener("mouseenter", () => highlightCategoryOnCanvas(item.categoryId, true));
        el.addEventListener("mouseleave", () => highlightCategoryOnCanvas(item.categoryId, false));
      }

      // --- Wort-Link Klick-Handler ---
      el.querySelectorAll('[data-word-link="1"]').forEach(wordEl => {
        wordEl.addEventListener("click", (evt) => {
          if (!isPreviewMode) return;
          evt.stopPropagation();
          if (item.actionType === "open-url" && item.actionUrl) {
            window.open(item.actionUrl, "_blank");
          }
        });
      });

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isPreviewMode) {
          if (item.linkScope === "word") return;
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

    const isImage = item.type === "image";
    const isBox = item.type === "box";

    groupText.classList.toggle("hidden", isImage || isBox);
    groupColor.classList.toggle("hidden", isImage);
    groupImage.classList.toggle("hidden", !isImage);

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
        domEl.classList.remove("cart-pop-anim");
        void domEl.offsetWidth;
        domEl.classList.add("cart-pop-anim");

        addCartItem(item.text || "Produkt", item.price != null ? item.price : 9.99);
        showToast("Artikel in den Warenkorb gelegt! 🛒", "success");
        break;

      case "alert-msg":
        showPositionedMessage(item.actionMsg || "Eine Benachrichtigung wurde ausgelöst!", item.messagePosition || "bottom-right");
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
      const alpha = 1 - (item.transparency || 0) / 100;
      const bg = item.bgColor && item.bgColor !== "transparent" ? hexToRgba(item.bgColor, alpha) : "transparent";
      const border = item.borderColor && item.borderColor !== "transparent" ? `1px solid ${item.borderColor}` : "none";
      exportedHTML += `  <div style="position:absolute; left:${item.x}px; top:${item.y}px; color:${item.color}; background:${bg}; border:${border};">\n`;
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
  renderCart();
  renderCanvas();
});
