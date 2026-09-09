document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // DYNAMISCHE DOKUMENT-STYLES INJIZIEREN
  // ==========================================
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

  // ==========================================
  // GLOBAL STATE
  // ==========================================
  let elements = [];
  let selectedElementId = null;
  let isPreviewMode = false;
  let draggedType = null;
  let draggedIcon = null;

  // 1. Warenkorb State
  let cartItems = []; // Array von { id, name, price, qty, imageUrl }

  // 3. Toast State
  let toastPosition = "top-right"; // top-right, top-left, bottom-right, bottom-left

  // 6. Dynamic Canvas State
  let canvasMinHeight = 800;

  // 10. Header & Footer State
  let headerConfig = { active: false, sticky: true, title: "Mein Shop Header", links: "Startseite | Produkte | Kontakt" };
  let footerConfig = { active: false, text: "© 2026 WebBuilder Pro. Alle Rechte vorbehalten." };

  // ==========================================
  // DOM ELEMENTE REFERENZEN
  // ==========================================
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

  // Inspector Elements
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
  const toastContainer = document.getElementById("toast-container");
  if (toastContainer) {
    toastContainer.className = `toast-${toastPosition}`;
  }

  // ==========================================
  // 4. CUSTOM ICONS & SVG MAP
  // ==========================================
  const SVGMAP = {
    cart: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>',
    settings: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z"/></svg>',
    'arrow-up': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>',
    'arrow-down': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>',
    'arrow-left': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>',
    'arrow-right': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>'
  };

  function addCustomIcon(name, svgOrUrl) {
    if (!name) return;
    if (svgOrUrl.trim().startsWith("<svg")) {
      SVGMAP[name] = svgOrUrl;
    } else {
      SVGMAP[name] = `<img src="${svgOrUrl}" style="width:100%; height:100%; object-fit:contain;" />`;
    }
    showToast(`Icon '${name}' erfolgreich zur SVGMap hinzugefügt!`, "success");
  }

  // ==========================================
  // INSPECTOR UI DYNAMISCH ERWEITERN
  // ==========================================
  function injectExtendedInspectorFields() {
    if (!inspectorForm) return;

    // Aktionen im Dropdown aktualisieren (Entfernen von Cookie/AGB, Hinzufügen von Generic Modal)
    if (propActionType) {
      propActionType.innerHTML = `
        <option value="none">Keine Aktion</option>
        <option value="open-url">URL öffnen</option>
        <option value="alert-msg">Meldung / Toast anzeigen</option>
        <option value="cart-add">In den Warenkorb legen</option>
        <option value="open-cart-drawer">Warenkorb öffnen</option>
        <option value="open-modal">Generisches Modal öffnen</option>
        <option value="scroll-top">Nach oben scrollen</option>
        <option value="scroll-bottom">Nach unten scrollen</option>
        <option value="history-back">Browser Zurück</option>
      `;
    }

    // Modal-Felder Gruppe
    const modalGroup = document.createElement("div");
    modalGroup.id = "group-action-modal";
    modalGroup.className = "form-group hidden inspector-section";
    modalGroup.innerHTML = `
      <div class="inspector-section-title">Modal Konfiguration</div>
      <label>Modal Titel</label>
      <input type="text" id="prop-modal-title" class="form-control" placeholder="z. B. Cookie Richtlinien">
      <label style="margin-top:6px;">Modal Inhalt (Fließtext / HTML)</label>
      <textarea id="prop-modal-body" class="form-control" rows="3" placeholder="Inhalt hier eingeben..."></textarea>
    `;
    inspectorForm.insertBefore(modalGroup, btnDelete);

    // 2. Styling & Positionierung
    const stylingGroup = document.createElement("div");
    stylingGroup.id = "group-styling";
    stylingGroup.className = "inspector-section";
    stylingGroup.innerHTML = `
      <div class="inspector-section-title">Styling & Rahmen</div>
      <label>Hintergrundfarbe (Element)</label>
      <input type="color" id="prop-bg-color" value="#ffffff">
      <label><input type="checkbox" id="prop-bg-transparent"> Transparent</label>

      <label style="margin-top:6px;">Rahmen (Border)</label>
      <div style="display:flex; gap:6px;">
        <select id="prop-border-style" class="form-control">
          <option value="none">Kein</option>
          <option value="solid">Durchgezogen</option>
          <option value="dashed">Gestrichelt</option>
          <option value="dotted">Gepunktet</option>
        </select>
        <input type="number" id="prop-border-width" class="form-control" placeholder="1" value="1" min="0" style="width:60px;">
        <input type="color" id="prop-border-color" value="#cbd5e1">
      </div>

      <label style="margin-top:6px;">Eckenabrundung (Radius / Shape)</label>
      <input type="text" id="prop-border-radius" class="form-control" placeholder="z. B. 8px oder 50%">

      <div style="display:flex; gap:6px; margin-top:6px;">
        <div>
          <label>Padding (px)</label>
          <input type="number" id="prop-padding" class="form-control" value="8">
        </div>
        <div>
          <label>Breite (px/% )</label>
          <input type="text" id="prop-width" class="form-control" placeholder="auto">
        </div>
      </div>
    `;
    inspectorForm.insertBefore(stylingGroup, btnDelete);

    // 5. Text-Interaktion & Wort-Hervorhebung
    const textIntGroup = document.createElement("div");
    textIntGroup.id = "group-text-interaction";
    textIntGroup.className = "inspector-section";
    textIntGroup.innerHTML = `
      <div class="inspector-section-title">Text & Link Optionen</div>
      <label>Link-Ziel Umfang</label>
      <select id="prop-link-scope" class="form-control">
        <option value="full">Gesamtes Element</option>
        <option value="word">Nur bestimmtes Wort</option>
      </select>
      
      <div id="subgroup-link-word" class="hidden" style="margin-top:6px;">
        <label>Anklickbares Wort</label>
        <input type="text" id="prop-link-word" class="form-control" placeholder="z. B. Hier">
      </div>

      <label style="margin-top:6px;">Wort-Hervorhebungen (z. B. 'Wort:red:bold')</label>
      <input type="text" id="prop-word-highlights" class="form-control" placeholder="Format: Wort:Farbe:fett">
    `;
    inspectorForm.insertBefore(textIntGroup, btnDelete);

    // 7. Hover Effekte & Hover Tooltips
    const hoverGroup = document.createElement("div");
    hoverGroup.id = "group-hover";
    hoverGroup.className = "inspector-section";
    hoverGroup.innerHTML = `
      <div class="inspector-section-title">Hover-Effekte & Tooltip</div>
      <label>Zweitbild bei Hover (Image-URL)</label>
      <input type="text" id="prop-hover-img" class="form-control" placeholder="https://...">
      
      <div style="display:flex; gap:6px; margin-top:6px;">
        <div>
          <label>Dauer (s)</label>
          <input type="text" id="prop-trans-duration" class="form-control" value="0.3s">
        </div>
        <div>
          <label>Easing</label>
          <select id="prop-trans-easing" class="form-control">
            <option value="ease">ease</option>
            <option value="linear">linear</option>
            <option value="ease-in-out">ease-in-out</option>
          </select>
        </div>
      </div>

      <label style="margin-top:6px;">Hover Tooltip / Beschreibung</label>
      <input type="text" id="prop-hover-tooltip" class="form-control" placeholder="z. B. Produktdetails anzeigen...">
    `;
    inspectorForm.insertBefore(hoverGroup, btnDelete);

    // 8. Kategorien
    const catGroup = document.createElement("div");
    catGroup.id = "group-category";
    catGroup.className = "inspector-section";
    catGroup.innerHTML = `
      <div class="inspector-section-title">Kategorie & Zuordnung</div>
      <label>Kategorie / Tag</label>
      <input type="text" id="prop-category" class="form-control" placeholder="z. B. Pulver, Gas, Zubehör">
      <label><input type="checkbox" id="prop-is-category-trigger"> Ist Kategorie-Text (Hover hebt Produkte hervor)</label>
    `;
    inspectorForm.insertBefore(catGroup, btnDelete);

    // 9. Duplizieren & Gruppieren Actions
    const actionBtnsGroup = document.createElement("div");
    actionBtnsGroup.style.display = "flex";
    actionBtnsGroup.style.gap = "8px";
    actionBtnsGroup.style.marginTop = "12px";
    actionBtnsGroup.innerHTML = `
      <button type="button" id="btn-duplicate-element" class="btn btn-secondary" style="flex:1;">📋 Duplizieren</button>
      <button type="button" id="btn-group-element" class="btn btn-secondary" style="flex:1;">🔗 Gruppieren</button>
    `;
    inspectorForm.insertBefore(actionBtnsGroup, btnDelete);
  }

  injectExtendedInspectorFields();

  // ==========================================
  // TOOLBAR & SEITENLEISTE WORKBENCH DYNAMISCH ERGÄNZEN
  // ==========================================
  function injectToolbarAndMehrMenuControls() {
    // Top Bar Settings Injection (Toast Position, Header/Footer controls)
    const toolbar = document.querySelector(".toolbar") || document.body;
    
    const settingsDiv = document.createElement("div");
    settingsDiv.style.display = "inline-flex";
    settingsDiv.style.gap = "8px";
    settingsDiv.style.alignItems = "center";
    settingsDiv.style.marginLeft = "10px";
    settingsDiv.innerHTML = `
      <select id="toast-pos-select" class="form-control" style="width:auto; font-size:12px;">
        <option value="top-right">Toast: Top-Right</option>
        <option value="top-left">Toast: Top-Left</option>
        <option value="bottom-right">Toast: Bottom-Right</option>
        <option value="bottom-left">Toast: Bottom-Left</option>
      </select>
      <button id="btn-toggle-header" class="btn btn-secondary" style="font-size:12px;">Header: AUS</button>
      <button id="btn-toggle-footer" class="btn btn-secondary" style="font-size:12px;">Footer: AUS</button>
    `;
    toolbar.appendChild(settingsDiv);

    // Custom Icon & Template Palette Controls
    const sidebar = document.querySelector(".sidebar") || document.body;
    const extraPanel = document.createElement("div");
    extraPanel.className = "inspector-section";
    extraPanel.style.padding = "10px";
    extraPanel.innerHTML = `
      <div class="inspector-section-title">Mehr & Filter System</div>
      <div style="margin-bottom:8px;">
        <input type="text" id="filter-search-input" class="form-control" placeholder="Kategorie / Name suchen...">
      </div>
      <button id="btn-template-product-card" class="btn btn-primary" style="width:100%; margin-bottom:8px;">+ Produkt-Karte Template</button>
      
      <details>
        <summary style="cursor:pointer; font-size:12px; font-weight:600;">Custom SVG Icon hinzufügen</summary>
        <div style="margin-top:6px;">
          <input type="text" id="custom-icon-name" class="form-control" placeholder="Icon-Name (z.B. star)" style="margin-bottom:4px;">
          <textarea id="custom-icon-svg" class="form-control" rows="2" placeholder="<svg>...</svg> oder Bild-URL"></textarea>
          <button id="btn-add-custom-icon" class="btn btn-secondary" style="width:100%; margin-top:4px;">Icon Speichern</button>
        </div>
      </details>
    `;
    sidebar.prepend(extraPanel);
  }

  injectToolbarAndMehrMenuControls();

  // ==========================================
  // 1. WARENKORB VERWALTUNG (Cart Management)
  // ==========================================
  function addToCart(product) {
    const existing = cartItems.find(item => item.name === product.name);
    if (existing) {
      existing.qty += 1;
    } else {
      cartItems.push({
        id: "cart_item_" + Date.now(),
        name: product.name || "Unbenanntes Produkt",
        price: parseFloat(product.price) || 29.99,
        qty: 1,
        imageUrl: product.imageUrl || ""
      });
    }
    updateCartUI();
    showToast(`${product.name || 'Artikel'} zum Warenkorb hinzugefügt! 🛒`, "success");
  }

  function removeFromCart(id) {
    cartItems = cartItems.filter(item => item.id !== id);
    updateCartUI();
    showToast("Artikel aus Warenkorb entfernt", "info");
  }

  function updateCartItemQty(id, qty) {
    const item = cartItems.find(i => i.id === id);
    if (item) {
      item.qty = Math.max(1, parseInt(qty) || 1);
      updateCartUI();
    }
  }

  function updateCartItemPrice(id, price) {
    const item = cartItems.find(i => i.id === id);
    if (item) {
      item.price = Math.max(0, parseFloat(price) || 0);
      updateCartUI();
    }
  }

  function calculateCartTotal() {
    return cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }

  function updateCartUI() {
    // Badge Aktualisierung
    const totalCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
    if (cartCountBadge) {
      cartCountBadge.innerText = totalCount;
      cartCountBadge.classList.add("cart-badge-hover");
    }

    // Liste im Cart Drawer Rendern
    if (cartItemsList) {
      cartItemsList.innerHTML = "";
      if (cartItems.length === 0) {
        cartItemsList.innerHTML = `<p style="text-align:center; color:#94a3b8; padding:20px;">Der Warenkorb ist leer.</p>`;
      } else {
        cartItems.forEach(item => {
          const row = document.createElement("div");
          row.className = "cart-item-row";
          row.innerHTML = `
            <div style="flex:1;">
              <strong>${item.name}</strong>
              <div style="font-size:12px; color:#64748b;">
                Preis: <input type="number" step="0.01" value="${item.price.toFixed(2)}" class="edit-cart-price" data-id="${item.id}" style="width:65px;"> €
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
              <input type="number" min="1" value="${item.qty}" class="edit-cart-qty" data-id="${item.id}" style="width:45px;">
              <button class="btn btn-danger btn-delete-cart-item" data-id="${item.id}" style="padding:2px 6px;">✕</button>
            </div>
          `;
          cartItemsList.appendChild(row);
        });

        // Gesamtsumme anhängen
        const totalDiv = document.createElement("div");
        totalDiv.style.marginTop = "15px";
        totalDiv.style.paddingTop = "10px";
        totalDiv.style.borderTop = "2px solid #e2e8f0";
        totalDiv.style.fontWeight = "bold";
        totalDiv.style.fontSize = "16px";
        totalDiv.style.display = "flex";
        totalDiv.style.justifyContent = "space-between";
        totalDiv.innerHTML = `
          <span>Gesamtsumme:</span>
          <span>${calculateCartTotal().toFixed(2)} €</span>
        `;
        cartItemsList.appendChild(totalDiv);

        // Event-Listener für dynamische Inputs im Warenkorb
        cartItemsList.querySelectorAll(".edit-cart-qty").forEach(input => {
          input.addEventListener("change", (e) => updateCartItemQty(e.target.dataset.id, e.target.value));
        });
        cartItemsList.querySelectorAll(".edit-cart-price").forEach(input => {
          input.addEventListener("change", (e) => updateCartItemPrice(e.target.dataset.id, e.target.value));
        });
        cartItemsList.querySelectorAll(".btn-delete-cart-item").forEach(btn => {
          btn.addEventListener("click", (e) => removeFromCart(e.target.dataset.id));
        });
      }
    }
  }

  // ==========================================
  // 1. BACKGROUND CONTROL LOGIC
  // ==========================================
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

  // ==========================================
  // 3. TOAST NOTIFICATION SYSTEM
  // ==========================================
  function showToast(message, type = "info") {
    if (!toastContainer) return;
    toastContainer.className = `toast-${toastPosition}`;

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
    }, 2800);
  }

  // Listener für Toast-Position Dropdown
  document.getElementById("toast-pos-select")?.addEventListener("change", (e) => {
    toastPosition = e.target.value;
    showToast(`Toast-Position geändert zu ${toastPosition}`, "info");
  });

  // ==========================================
  // DRAG & DROP SETUP
  // ==========================================
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

  // ==========================================
  // 4, 8, 9. ELEMENT CREATION & DATA MODEL
  // ==========================================
  function createElement(type, iconName = null, x = 50, y = 50, customProps = {}) {
    const id = "elem_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
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
      // 2. Styling
      bgColor: "#ffffff",
      bgTransparent: true,
      borderStyle: "none",
      borderWidth: 1,
      borderColor: "#cbd5e1",
      borderRadius: "0px",
      padding: 4,
      width: "auto",
      // 4. Modal
      modalTitle: "Information",
      modalBody: "Inhalt des Modals hier eintragen...",
      // 5. Text Interaction
      linkScope: "full",
      linkWord: "",
      wordHighlights: "",
      // 7. Hover & Tooltip
      hoverImageUrl: "",
      transitionDuration: "0.3s",
      transitionEasing: "ease",
      hoverTooltip: "",
      // 8. Kategorie
      category: "",
      isCategoryTrigger: false,
      // 9. Gruppierung
      groupId: null,
      ...customProps
    };

    elements.push(newElement);
    renderCanvas();
    selectElement(id);
    showToast("Neues Element hinzugefügt", "success");
    return newElement;
  }

  // ==========================================
  // 6. DYNAMIC CANVAS & LAYOUT RENDER ENGINE
  // ==========================================
  function renderCanvas() {
    canvas.querySelectorAll(".placed-element, .builder-header, .builder-footer, .canvas-resize-handle").forEach(el => el.remove());
    canvasHint.classList.toggle("hidden", elements.length > 0);

    // Canvas Höhenanpassung
    canvas.style.minHeight = `${canvasMinHeight}px`;

    // 10. Header Rendering
    if (headerConfig.active) {
      const headerEl = document.createElement("header");
      headerEl.className = `builder-header ${headerConfig.sticky ? 'sticky' : ''}`;
      headerEl.innerHTML = `
        <div style="font-weight:bold; font-size:18px;">${headerConfig.title}</div>
        <nav style="font-size:14px;">${headerConfig.links}</nav>
      `;
      canvas.prepend(headerEl);
    }

    // Canvas Elemente Rendering
    elements.forEach(item => {
      const el = document.createElement("div");
      el.className = `placed-element ${item.id === selectedElementId ? 'selected' : ''} ${item.actionType !== 'none' ? 'has-action' : ''}`;
      
      // Inline Positionierung & Styling
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

      // 5. Text-Verarbeitung & Wort-Hervorhebung
      let processedText = item.text || "";
      if (item.wordHighlights) {
        // Format: Wort:Farbe:fett -> e.g. "Super:red:bold"
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

      // Inner HTML Render basierend auf Element-Typ
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

      // 7. Hover-Bildwechsel & Tooltip Integration
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

      // 8. Kategorie Hover Interaktion
      if (item.isCategoryTrigger || item.category) {
        el.addEventListener("mouseenter", () => {
          if (item.category) highlightCategory(item.category);
        });
        el.addEventListener("mouseleave", () => clearCategoryHighlights());
      }

      // Badge Indicator
      if (!isPreviewMode && item.actionType !== "none") {
        const badge = document.createElement("span");
        badge.className = "element-badge";
        badge.innerText = "⚡ Logik";
        el.appendChild(badge);
      }

      // Element Event Handlers
      el.addEventListener("click", (e) => {
        // Prüfung, ob ein spezifisches Wort geklickt wurde
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
        if (isPreviewMode) {
          executeAction(item, el);
        } else {
          selectElement(item.id);
        }
      });

      makeElementDraggableOnCanvas(el, item);
      canvas.appendChild(el);
    });

    // 10. Footer Rendering
    if (footerConfig.active) {
      const footerEl = document.createElement("footer");
      footerEl.className = "builder-footer";
      footerEl.innerText = footerConfig.text;
      canvas.appendChild(footerEl);
    }

    // 6. Dynamic Canvas Resize Handle
    if (!isPreviewMode) {
      const resizeHandle = document.createElement("div");
      resizeHandle.className = "canvas-resize-handle";
      resizeHandle.innerHTML = "⇳ Canvas Höhe vergrößern (Ziehen)";
      makeCanvasResizable(resizeHandle);
      canvas.appendChild(resizeHandle);
    }
  }

  // Canvas Resizing Handle Logic
  function makeCanvasResizable(handle) {
    let startY, startHeight;
    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      startY = e.clientY;
      startHeight = canvasMinHeight;

      const onMouseMove = (moveEvent) => {
        const dy = moveEvent.clientY - startY;
        canvasMinHeight = Math.max(500, startHeight + dy);
        canvas.style.minHeight = `${canvasMinHeight}px`;
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        showToast(`Canvas-Höhe auf ${canvasMinHeight}px angepasst`, "info");
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
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

  // ==========================================
  // INSPECTOR SYNC & BINDINGS
  // ==========================================
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

    // Formularfelder Sichtbarkeit
    const isImage = item.type === "image";
    const isBox = item.type === "box";

    groupText.classList.toggle("hidden", isImage || isBox);
    groupColor.classList.toggle("hidden", isImage);
    groupImage.classList.toggle("hidden", !isImage);

    // Standard Inspector Felder füllen
    propId.value = item.id;
    propText.value = item.text || "";
    propSize.value = item.size || 20;
    propColor.value = item.color || "#1f2937";
    propImageUrl.value = item.imageUrl || "";
    propActionType.value = item.actionType || "none";
    propActionUrl.value = item.actionUrl || "";
    propActionMsg.value = item.actionMsg || "";

    // Erweiterte Felder füllen
    const modalTitleInput = document.getElementById("prop-modal-title");
    const modalBodyInput = document.getElementById("prop-modal-body");
    if (modalTitleInput) modalTitleInput.value = item.modalTitle || "";
    if (modalBodyInput) modalBodyInput.value = item.modalBody || "";

    const bgColorInputEl = document.getElementById("prop-bg-color");
    const bgTransInputEl = document.getElementById("prop-bg-transparent");
    const borderStyleInput = document.getElementById("prop-border-style");
    const borderWidthInput = document.getElementById("prop-border-width");
    const borderColorInput = document.getElementById("prop-border-color");
    const borderRadiusInput = document.getElementById("prop-border-radius");
    const paddingInput = document.getElementById("prop-padding");
    const widthInput = document.getElementById("prop-width");

    if (bgColorInputEl) bgColorInputEl.value = item.bgColor || "#ffffff";
    if (bgTransInputEl) bgTransInputEl.checked = !!item.bgTransparent;
    if (borderStyleInput) borderStyleInput.value = item.borderStyle || "none";
    if (borderWidthInput) borderWidthInput.value = item.borderWidth || 1;
    if (borderColorInput) borderColorInput.value = item.borderColor || "#cbd5e1";
    if (borderRadiusInput) borderRadiusInput.value = item.borderRadius || "0px";
    if (paddingInput) paddingInput.value = item.padding || 4;
    if (widthInput) widthInput.value = item.width || "auto";

    const linkScopeInput = document.getElementById("prop-link-scope");
    const linkWordInput = document.getElementById("prop-link-word");
    const wordHighlightsInput = document.getElementById("prop-word-highlights");
    if (linkScopeInput) linkScopeInput.value = item.linkScope || "full";
    if (linkWordInput) linkWordInput.value = item.linkWord || "";
    if (wordHighlightsInput) wordHighlightsInput.value = item.wordHighlights || "";
    document.getElementById("subgroup-link-word")?.classList.toggle("hidden", item.linkScope !== "word");

    const hoverImgInput = document.getElementById("prop-hover-img");
    const transDurInput = document.getElementById("prop-trans-duration");
    const transEaseInput = document.getElementById("prop-trans-easing");
    const hoverTooltipInput = document.getElementById("prop-hover-tooltip");
    if (hoverImgInput) hoverImgInput.value = item.hoverImageUrl || "";
    if (transDurInput) transDurInput.value = item.transitionDuration || "0.3s";
    if (transEaseInput) transEaseInput.value = item.transitionEasing || "ease";
    if (hoverTooltipInput) hoverTooltipInput.value = item.hoverTooltip || "";

    const categoryInput = document.getElementById("prop-category");
    const isCatTrigInput = document.getElementById("prop-is-category-trigger");
    if (categoryInput) categoryInput.value = item.category || "";
    if (isCatTrigInput) isCatTrigInput.checked = !!item.isCategoryTrigger;

    toggleActionFields(item.actionType);
    renderCanvas();
  }

  canvas.addEventListener("click", () => {
    if (!isPreviewMode) {
      selectedElementId = null;
      selectElement(null);
    }
  });

  function getSelected() {
    return elements.find(el => el.id === selectedElementId);
  }

  function toggleActionFields(actionType) {
    groupActionUrl.classList.toggle("hidden", actionType !== "open-url");
    groupActionMsg.classList.toggle("hidden", actionType !== "alert-msg");
    const modalGroup = document.getElementById("group-action-modal");
    if (modalGroup) modalGroup.classList.toggle("hidden", actionType !== "open-modal");
  }

  // Live Inspector Event Bindings
  propText?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.text = e.target.value; renderCanvas(); } });
  propSize?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.size = parseInt(e.target.value) || 16; renderCanvas(); } });
  propColor?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.color = e.target.value; renderCanvas(); } });
  propImageUrl?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.imageUrl = e.target.value; renderCanvas(); } });

  propActionType?.addEventListener("change", (e) => {
    const item = getSelected();
    if (item) {
      item.actionType = e.target.value;
      toggleActionFields(item.actionType);
      renderCanvas();
    }
  });

  propActionUrl?.addEventListener("input", (e) => { const item = getSelected(); if (item) item.actionUrl = e.target.value; });
  propActionMsg?.addEventListener("input", (e) => { const item = getSelected(); if (item) item.actionMsg = e.target.value; });

  // Erweiterte Inspector Listener Bindings
  document.getElementById("prop-modal-title")?.addEventListener("input", (e) => { const item = getSelected(); if (item) item.modalTitle = e.target.value; });
  document.getElementById("prop-modal-body")?.addEventListener("input", (e) => { const item = getSelected(); if (item) item.modalBody = e.target.value; });

  document.getElementById("prop-bg-color")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.bgColor = e.target.value; renderCanvas(); } });
  document.getElementById("prop-bg-transparent")?.addEventListener("change", (e) => { const item = getSelected(); if (item) { item.bgTransparent = e.target.checked; renderCanvas(); } });
  document.getElementById("prop-border-style")?.addEventListener("change", (e) => { const item = getSelected(); if (item) { item.borderStyle = e.target.value; renderCanvas(); } });
  document.getElementById("prop-border-width")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.borderWidth = parseInt(e.target.value) || 0; renderCanvas(); } });
  document.getElementById("prop-border-color")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.borderColor = e.target.value; renderCanvas(); } });
  document.getElementById("prop-border-radius")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.borderRadius = e.target.value; renderCanvas(); } });
  document.getElementById("prop-padding")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.padding = parseInt(e.target.value) || 0; renderCanvas(); } });
  document.getElementById("prop-width")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.width = e.target.value; renderCanvas(); } });

  document.getElementById("prop-link-scope")?.addEventListener("change", (e) => {
    const item = getSelected();
    if (item) {
      item.linkScope = e.target.value;
      document.getElementById("subgroup-link-word")?.classList.toggle("hidden", item.linkScope !== "word");
      renderCanvas();
    }
  });
  document.getElementById("prop-link-word")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.linkWord = e.target.value; renderCanvas(); } });
  document.getElementById("prop-word-highlights")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.wordHighlights = e.target.value; renderCanvas(); } });

  document.getElementById("prop-hover-img")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.hoverImageUrl = e.target.value; renderCanvas(); } });
  document.getElementById("prop-trans-duration")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.transitionDuration = e.target.value; renderCanvas(); } });
  document.getElementById("prop-trans-easing")?.addEventListener("change", (e) => { const item = getSelected(); if (item) { item.transitionEasing = e.target.value; renderCanvas(); } });
  document.getElementById("prop-hover-tooltip")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.hoverTooltip = e.target.value; renderCanvas(); } });

  document.getElementById("prop-category")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.category = e.target.value; renderCanvas(); } });
  document.getElementById("prop-is-category-trigger")?.addEventListener("change", (e) => { const item = getSelected(); if (item) { item.isCategoryTrigger = e.target.checked; renderCanvas(); } });

  btnDelete?.addEventListener("click", () => {
    if (selectedElementId) {
      elements = elements.filter(el => el.id !== selectedElementId);
      selectedElementId = null;
      selectElement(null);
      renderCanvas();
      showToast("Element gelöscht", "info");
    }
  });

  // ==========================================
  // 9. DUPLIZIEREN, GRUPPIEREN & TEMPLATES
  // ==========================================
  document.getElementById("btn-duplicate-element")?.addEventListener("click", () => {
    const item = getSelected();
    if (item) {
      const cloneProps = { ...item, x: item.x + 25, y: item.y + 25 };
      delete cloneProps.id;
      createElement(item.type, item.iconName, cloneProps.x, cloneProps.y, cloneProps);
      showToast("Element dupliziert", "success");
    }
  });

  document.getElementById("btn-group-element")?.addEventListener("click", () => {
    const item = getSelected();
    if (item) {
      const gId = item.groupId || "group_" + Date.now();
      item.groupId = gId;
      showToast(`Element zu Gruppe '${gId}' zugewiesen`, "info");
    }
  });

  // Produkt-Karte Template Erstellung
  document.getElementById("btn-template-product-card")?.addEventListener("click", () => {
    const gId = "group_product_" + Date.now();
    const startX = 100;
    const startY = 100;

    // 1. Produkt Bild
    createElement("image", null, startX, startY, {
      imageUrl: "https://picsum.photos/260/180",
      size: 260,
      groupId: gId,
      category: "Pulver",
      hoverTooltip: "Premium Pulver - Details anzeigen"
    });

    // 2. Produkt Titel
    createElement("headline", null, startX, startY + 190, {
      text: "Premium Pulver 500g",
      size: 20,
      groupId: gId,
      category: "Pulver"
    });

    // 3. Produkt Preis & Beschreibung
    createElement("text", null, startX, startY + 225, {
      text: "Preis: 49,99 € | Reines Qualitätsprodukt",
      size: 14,
      color: "#475569",
      groupId: gId,
      category: "Pulver"
    });

    // 4. Kauf-Button
    createElement("button", null, startX, startY + 260, {
      text: "In den Warenkorb",
      color: "#2563eb",
      actionType: "cart-add",
      groupId: gId,
      category: "Pulver"
    });

    showToast("Produkt-Karte Template auf Zeichenfläche erstellt!", "success");
  });

  // Custom Icon Hinzufügen Handler
  document.getElementById("btn-add-custom-icon")?.addEventListener("click", () => {
    const nameInput = document.getElementById("custom-icon-name");
    const svgInput = document.getElementById("custom-icon-svg");
    if (nameInput && svgInput && nameInput.value) {
      addCustomIcon(nameInput.value.trim(), svgInput.value.trim());
      nameInput.value = "";
      svgInput.value = "";
    }
  });

  // ==========================================
  // 8. KATEGORIEN & FILTER-SYSTEM
  // ==========================================
  function highlightCategory(category) {
    if (!category) return;
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

  function clearCategoryHighlights() {
    const allPlacements = canvas.querySelectorAll(".placed-element");
    allPlacements.forEach(el => {
      el.classList.remove("category-highlighted", "category-dimmed");
    });
  }

  document.getElementById("filter-search-input")?.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      clearCategoryHighlights();
      return;
    }
    const allPlacements = canvas.querySelectorAll(".placed-element");
    allPlacements.forEach(el => {
      const item = elements.find(i => i.id === el.dataset.id);
      if (item) {
        const match = (item.category && item.category.toLowerCase().includes(query)) ||
                      (item.text && item.text.toLowerCase().includes(query));
        if (match) {
          el.classList.add("category-highlighted");
          el.classList.remove("category-dimmed");
        } else {
          el.classList.add("category-dimmed");
          el.classList.remove("category-highlighted");
        }
      }
    });
  });

  // ==========================================
  // 10. HEADER & FOOTER CONTROLS
  // ==========================================
  document.getElementById("btn-toggle-header")?.addEventListener("click", (e) => {
    headerConfig.active = !headerConfig.active;
    e.target.innerText = headerConfig.active ? "Header: AN" : "Header: AUS";
    renderCanvas();
    showToast(`Header ${headerConfig.active ? 'aktiviert' : 'deaktiviert'}`, "info");
  });

  document.getElementById("btn-toggle-footer")?.addEventListener("click", (e) => {
    footerConfig.active = !footerConfig.active;
    e.target.innerText = footerConfig.active ? "Footer: AN" : "Footer: AUS";
    renderCanvas();
    showToast(`Footer ${footerConfig.active ? 'aktiviert' : 'deaktiviert'}`, "info");
  });

  // ==========================================
  // MODALS & DRAWERS
  // ==========================================
  function openCartDrawer() {
    if (cartDrawerBackdrop) cartDrawerBackdrop.classList.add("active");
    if (cartDrawer) cartDrawer.classList.add("active");
    updateCartUI();
  }

  function closeCartDrawer() {
    if (cartDrawerBackdrop) cartDrawerBackdrop.classList.remove("active");
    if (cartDrawer) cartDrawer.classList.remove("active");
  }

  closeCartBtn?.addEventListener("click", closeCartDrawer);
  cartDrawerBackdrop?.addEventListener("click", closeCartDrawer);

  function openModal(titleText, bodyHTML, footerHTML = "") {
    if (modalTitle) modalTitle.innerText = titleText;
    if (modalBody) modalBody.innerHTML = bodyHTML;
    if (modalFooter) {
      modalFooter.innerHTML = footerHTML || `<button class="btn btn-primary" onclick="document.getElementById('modal-overlay').classList.remove('active')">Schließen</button>`;
    }
    if (modalOverlay) modalOverlay.classList.add("active");
  }

  function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove("active");
  }

  closeModalBtn?.addEventListener("click", closeModal);
  modalOverlay?.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // ==========================================
  // ACTION ENGINE EXECUTION
  // ==========================================
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
        void domEl.offsetWidth; // Reflow Trigger
        domEl.classList.add("cart-pop-anim");

        addToCart({
          name: item.text || "Produkt",
          price: 49.99,
          imageUrl: item.imageUrl
        });
        break;

      case "alert-msg":
        showToast(item.actionMsg || "Eine Benachrichtigung wurde ausgelöst!", "info");
        break;

      case "open-cart-drawer":
        openCartDrawer();
        showToast("Warenkorb geöffnet", "info");
        break;

      case "open-modal":
        openModal(
          item.modalTitle || "Information",
          item.modalBody ? `<p>${item.modalBody.replace(/\n/g, '<br>')}</p>` : "<p>Kein Modal-Inhalt angegeben.</p>"
        );
        break;

      default:
        showToast("Keine Verbindungskonfiguration hinterlegt.", "info");
        break;
    }
  }

  // ==========================================
  // TOOLBAR CONTROLS (Preview, Clear, Export)
  // ==========================================
  btnModeToggle?.addEventListener("click", () => {
    isPreviewMode = !isPreviewMode;
    document.body.classList.toggle("preview-mode", isPreviewMode);
    btnModeToggle.innerHTML = isPreviewMode ? "✏️ Editor-Modus" : "👁️ Vorschau-Modus";

    if (isPreviewMode) {
      selectedElementId = null;
      renderCanvas();
      showToast("Vorschau-Modus aktiv - Klick-Aktionen sind bereit!", "info");
    } else {
      renderCanvas();
      showToast("Editor-Modus aktiv", "info");
    }
  });

  btnClear?.addEventListener("click", () => {
    if (confirm("Möchtest du wirklich alle Elemente von der Zeichenfläche löschen?")) {
      elements = [];
      selectedElementId = null;
      selectElement(null);
      renderCanvas();
      showToast("Zeichenfläche geleert", "info");
    }
  });

  btnExport?.addEventListener("click", () => {
    let exportedHTML = `<!-- WebBuilder Pro Export -->\n<div style="position:relative; width:100%; min-height:${canvasMinHeight}px; background:${canvas.style.background};">\n`;
    
    if (headerConfig.active) {
      exportedHTML += `  <header style="width:100%; padding:14px 24px; background:#fff; display:flex; justify-content:space-between; align-items:center; ${headerConfig.sticky ? 'position:sticky; top:0; z-index:1000;' : ''}"><div><strong>${headerConfig.title}</strong></div><nav>${headerConfig.links}</nav></header>\n`;
    }

    elements.forEach(item => {
      exportedHTML += `  <!-- Element: ${item.id} (${item.type}) -->\n`;
      exportedHTML += `  <div style="position:absolute; left:${item.x}px; top:${item.y}px; color:${item.color}; background-color:${item.bgTransparent ? 'transparent' : item.bgColor}; border:${item.borderWidth}px ${item.borderStyle} ${item.borderColor}; border-radius:${item.borderRadius}; padding:${item.padding}px;">\n`;
      
      if (item.type === "icon" && SVGMAP[item.iconName]) {
        exportedHTML += `    ${SVGMAP[item.iconName]}\n`;
      } else if (item.type === "button") {
        exportedHTML += `    <button style="font-size:${item.size}px; background:${item.color}; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">${item.text}</button>\n`;
      } else if (item.type === "headline") {
        exportedHTML += `    <h2 style="font-size:${item.size}px; color:${item.color}; margin:0;">${item.text}</h2>\n`;
      } else if (item.type === "image") {
        exportedHTML += `    <img src="${item.imageUrl}" style="width:${item.size}px; height:auto; display:block; border-radius:${item.borderRadius};" alt="Exportiertes Bild" />\n`;
      } else if (item.type === "box") {
        exportedHTML += `    <div style="width:${item.size}px; height:${Math.round(item.size*0.65)}px; background:${item.color}; border-radius:${item.borderRadius};"></div>\n`;
      } else {
        exportedHTML += `    <p style="font-size:${item.size}px; color:${item.color}; margin:0;">${item.text}</p>\n`;
      }
      exportedHTML += `  </div>\n`;
    });

    if (footerConfig.active) {
      exportedHTML += `  <footer style="width:100%; padding:18px 24px; background:#1e293b; color:#fff; text-align:center;">${footerConfig.text}</footer>\n`;
    }

    exportedHTML += `</div>`;

    console.log(exportedHTML);
    showToast("Vollständiges HTML wurde in der Konsole (F12) ausgegeben!", "success");
  });
});
