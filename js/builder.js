document.addEventListener("DOMContentLoaded", () => {
  // ============================================================
  // GLOBAL STATE
  // ============================================================
  let elements = []; // Canvas-Elemente
  let selectedElementId = null;
  let isPreviewMode = false;
  let draggedType = null;
  let draggedIcon = null;
  let draggedShape = null;

  let zoomLevel = 0.85;

  let cartItems = []; // { id, name, price, qty }
  let cartButtonLabel = "Zur Kasse gehen";
  let cartConfig = {
    itemShape: "rounded", // 'rounded' | 'square'
    removeButtonColor: "#ef4444",
    discountEnabled: false,
    recommendEnabled: false,
    recommendations: [], // { id, name, price, icon }
    progressEnabled: false,
    milestones: [] // { id, amount, label, action }
  };
  let appliedDiscountPercent = 0;
  let appliedDiscountLabel = "";

  let headerEnabled = false;
  let headerSticky = false;
  let headerHeight = 64;
  let headerBgColor = "#111827";
  let headerItems = []; // { id, type:'text'|'icon', text, iconName, x, y, color, size, bold, italic }

  let footerEnabled = false;
  let footerHeight = 70;
  let footerBgColor = "#111827";
  let footerItems = [];

  const STORAGE_KEY = "webbuilder_pro_state";
  const HISTORY_LIMIT = 30;
  let historyStack = [];
  let pendingSnapshot = null;

  // ============================================================
  // DOM ELEMENTS
  // ============================================================
  const canvasColumn = document.getElementById("canvas-column");
  const canvas = document.getElementById("canvas");
  const canvasHint = document.getElementById("canvas-hint");
  const btnModeToggle = document.getElementById("btn-mode-toggle");
  const btnClear = document.getElementById("btn-clear");
  const btnExport = document.getElementById("btn-export");
  const btnSave = document.getElementById("btn-save");
  const btnUndo = document.getElementById("btn-undo");

  // Zoom
  const zoomInBtn = document.getElementById("zoom-in");
  const zoomOutBtn = document.getElementById("zoom-out");
  const zoomResetBtn = document.getElementById("zoom-reset");
  const zoomLevelLabel = document.getElementById("zoom-level");

  // Hintergrund
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

  // Kopfzeile
  const headerToggle = document.getElementById("header-toggle");
  const headerStickyToggle = document.getElementById("header-sticky-toggle");
  const headerHeightInput = document.getElementById("header-height-input");
  const headerBgInput = document.getElementById("header-bg-input");
  const headerItemsListEl = document.getElementById("header-items-list");
  const btnAddHeaderText = document.getElementById("btn-add-header-text");
  const btnAddHeaderIcon = document.getElementById("btn-add-header-icon");

  // Fußzeile
  const footerToggle = document.getElementById("footer-toggle");
  const footerHeightInput = document.getElementById("footer-height-input");
  const footerBgInput = document.getElementById("footer-bg-input");
  const footerItemsListEl = document.getElementById("footer-items-list");
  const btnAddFooterText = document.getElementById("btn-add-footer-text");
  const btnAddFooterIcon = document.getElementById("btn-add-footer-icon");

  // Warenkorb Sidebar
  const btnOpenCart = document.getElementById("btn-open-cart");
  const cartButtonLabelInput = document.getElementById("cart-button-label");
  const cartItemShapeSelect = document.getElementById("cart-item-shape");
  const cartRemoveColorInput = document.getElementById("cart-remove-color");
  const cartDiscountToggle = document.getElementById("cart-discount-toggle");
  const cartRecommendToggle = document.getElementById("cart-recommend-toggle");
  const cartRecommendConfig = document.getElementById("cart-recommend-config");
  const cartRecommendList = document.getElementById("cart-recommend-list");
  const btnAddRecommendation = document.getElementById("btn-add-recommendation");
  const cartProgressToggle = document.getElementById("cart-progress-toggle");
  const cartProgressConfig = document.getElementById("cart-progress-config");
  const cartMilestoneList = document.getElementById("cart-milestone-list");
  const btnAddMilestone = document.getElementById("btn-add-milestone");

  // Inspector
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

  // Drawer & Modal
  const cartDrawerBackdrop = document.getElementById("cart-drawer-backdrop");
  const cartDrawer = document.getElementById("cart-drawer");
  const closeCartBtn = document.getElementById("close-cart-btn");
  const cartItemsList = document.getElementById("cart-items-list");
  const cartCountBadge = document.getElementById("cart-count-badge");
  const cartCheckoutBtn = document.querySelector("#cart-drawer .drawer-footer button");

  const modalOverlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const modalFooter = document.getElementById("modal-footer");
  const closeModalBtn = document.getElementById("close-modal-btn");

  let toastContainer = document.getElementById("toast-container");

  // ============================================================
  // ICON DEFINITIONS
  // ============================================================
  const SVGMAP = {
    cart: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>',
    settings: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z"/></svg>',
    'arrow-up': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>',
    'arrow-down': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>',
    'arrow-left': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>',
    'arrow-right': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>'
  };

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

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  const escapeAttr = escapeHtml;

  function eur(n) {
    return (parseFloat(n) || 0).toFixed(2).replace(".", ",") + " €";
  }

  if (!toastContainer) {
    toastContainer = ensureEl("toast-container", document.body, "div", "toast-container");
  }

  // ============================================================
  // HISTORY / UNDO
  // ============================================================
  function snapshotState() {
    return JSON.parse(JSON.stringify({
      elements, cartItems, cartConfig, cartButtonLabel,
      headerEnabled, headerSticky, headerHeight, headerBgColor, headerItems,
      footerEnabled, footerHeight, footerBgColor, footerItems
    }));
  }

  function pushHistory(snap) {
    historyStack.push(snap || snapshotState());
    if (historyStack.length > HISTORY_LIMIT) historyStack.shift();
  }

  function armHistory() { pendingSnapshot = snapshotState(); }
  function commitHistory() {
    if (pendingSnapshot) { pushHistory(pendingSnapshot); pendingSnapshot = null; }
  }
  function wireHistory(el) {
    if (!el) return;
    el.addEventListener("focus", armHistory);
    el.addEventListener("mousedown", armHistory);
    el.addEventListener("change", commitHistory);
  }

  function undo() {
    if (!historyStack.length) { showToast("Nichts zum Rückgängigmachen", "info"); return; }
    const prev = historyStack.pop();
    elements = prev.elements;
    cartItems = prev.cartItems;
    cartConfig = prev.cartConfig;
    cartButtonLabel = prev.cartButtonLabel;
    headerEnabled = prev.headerEnabled;
    headerSticky = prev.headerSticky;
    headerHeight = prev.headerHeight;
    headerBgColor = prev.headerBgColor;
    headerItems = prev.headerItems;
    footerEnabled = prev.footerEnabled;
    footerHeight = prev.footerHeight;
    footerBgColor = prev.footerBgColor;
    footerItems = prev.footerItems;

    selectedElementId = null;
    selectElement(null);
    syncCartConfigUI();
    renderRecommendList();
    renderMilestoneList();
    if (headerToggle) headerToggle.checked = headerEnabled;
    if (headerStickyToggle) headerStickyToggle.checked = headerSticky;
    if (headerHeightInput) headerHeightInput.value = headerHeight;
    if (headerBgInput) headerBgInput.value = headerBgColor;
    if (footerToggle) footerToggle.checked = footerEnabled;
    if (footerHeightInput) footerHeightInput.value = footerHeight;
    if (footerBgInput) footerBgInput.value = footerBgColor;
    if (cartButtonLabelInput) cartButtonLabelInput.value = cartButtonLabel;
    if (cartCheckoutBtn) cartCheckoutBtn.innerText = cartButtonLabel;
    renderBarItemsList(headerItems, headerItemsListEl);
    renderBarItemsList(footerItems, footerItemsListEl);
    renderCanvas();
    renderHeaderFooter();
    renderCart();
    showToast("Rückgängig gemacht", "info");
  }
  if (btnUndo) btnUndo.addEventListener("click", undo);

  // ============================================================
  // ZOOM
  // ============================================================
  function applyZoom() {
    if (isPreviewMode) {
      canvasColumn.style.transform = "none";
      return;
    }
    canvasColumn.style.transform = `scale(${zoomLevel})`;
    canvasColumn.style.transformOrigin = "top center";
    if (zoomLevelLabel) zoomLevelLabel.textContent = Math.round(zoomLevel * 100) + "%";
  }
  if (zoomInBtn) zoomInBtn.addEventListener("click", () => {
    zoomLevel = Math.min(1.5, +(zoomLevel + 0.1).toFixed(2));
    applyZoom();
  });
  if (zoomOutBtn) zoomOutBtn.addEventListener("click", () => {
    zoomLevel = Math.max(0.3, +(zoomLevel - 0.1).toFixed(2));
    applyZoom();
  });
  if (zoomResetBtn) zoomResetBtn.addEventListener("click", () => {
    zoomLevel = 1;
    applyZoom();
  });

  /** Wandelt Bildschirm-Koordinaten in lokale (unskalierte) Koordinaten
      innerhalb von containerEl um - berücksichtigt den Zoom-Faktor. */
  function toLocalCoords(containerEl, clientX, clientY) {
    const rect = containerEl.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoomLevel,
      y: (clientY - rect.top) / zoomLevel
    };
  }

  /** Generisches Drag-Handling für Canvas-Elemente & Kopf-/Fußzeilen-Items. */
  function makeDraggable(domEl, item, containerEl, opts = {}) {
    domEl.addEventListener("mousedown", (e) => {
      if (isPreviewMode) return;
      e.stopPropagation();
      armHistory();
      const start = toLocalCoords(containerEl, e.clientX, e.clientY);
      const offsetX = start.x - item.x;
      const offsetY = start.y - item.y;
      const minX = opts.minX != null ? opts.minX : 0;
      const minY = opts.minY != null ? opts.minY : 0;
      const maxX = opts.maxX != null ? opts.maxX : Infinity;
      const maxY = opts.maxY != null ? opts.maxY : Infinity;

      const onMove = (moveEvent) => {
        const p = toLocalCoords(containerEl, moveEvent.clientX, moveEvent.clientY);
        item.x = Math.min(maxX, Math.max(minX, p.x - offsetX));
        item.y = Math.min(maxY, Math.max(minY, p.y - offsetY));
        domEl.style.left = item.x + "px";
        domEl.style.top = item.y + "px";
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        commitHistory();
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  // ============================================================
  // WARENKORB
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

  function getCartCount() {
    return cartItems.reduce((sum, ci) => sum + ci.qty, 0);
  }
  function getCartSubtotal() {
    return cartItems.reduce((sum, ci) => sum + ci.price * ci.qty, 0);
  }
  function getMilestoneStatus(subtotal) {
    const sorted = [...cartConfig.milestones].sort((a, b) => a.amount - b.amount);
    const reached = sorted.filter(m => subtotal >= m.amount);
    const next = sorted.find(m => subtotal < m.amount);
    return { sorted, reached, next };
  }

  function renderCart() {
    if (!cartItemsList) return;
    const subtotalRaw = getCartSubtotal();
    let html = "";

    // Fortschrittsbalken
    if (cartConfig.progressEnabled && cartConfig.milestones.length) {
      const { sorted, reached, next } = getMilestoneStatus(subtotalRaw);
      const maxAmount = sorted[sorted.length - 1].amount || 1;
      const pct = Math.min(100, (subtotalRaw / maxAmount) * 100);
      html += `<div class="cart-progress">
        <div class="cart-progress-track">
          <div class="cart-progress-fill" style="width:${pct}%"></div>
          ${sorted.map(m => `<div class="cart-progress-mark ${subtotalRaw >= m.amount ? "reached" : ""}" style="left:${Math.min(100, (m.amount / maxAmount) * 100)}%" title="${escapeAttr(m.label)} ab ${m.amount.toFixed(2)} €"></div>`).join("")}
        </div>
        <p class="cart-progress-msg">${next ? `Noch ${eur(next.amount - subtotalRaw)} bis „${escapeHtml(next.label)}“` : (reached.length ? `✓ Freigeschaltet: ${reached.map(m => escapeHtml(m.label)).join(", ")}` : "")}</p>
      </div>`;
    }

    // Artikel
    if (!cartItems.length) {
      html += `<p class="cart-empty-msg">Dein Warenkorb ist leer.</p>`;
    } else {
      html += cartItems.map(ci => `
        <div class="cart-item ${cartConfig.itemShape === "square" ? "cart-item-square" : ""}">
          <span class="cart-item-title">${escapeHtml(ci.name)} × ${ci.qty}</span>
          <input type="number" class="cart-item-price-input" data-cart-id="${ci.id}" value="${ci.price.toFixed(2)}" step="0.01" style="width:70px;" />
          <button class="cart-item-remove" data-cart-id="${ci.id}" title="Entfernen" style="color:${cartConfig.removeButtonColor};">✕</button>
        </div>`).join("");
    }

    // Empfehlung
    if (cartConfig.recommendEnabled && cartConfig.recommendations.length) {
      const cartNames = new Set(cartItems.map(ci => ci.name));
      const options = cartConfig.recommendations.filter(r => !cartNames.has(r.name));
      if (options.length) {
        const pick = options[0];
        html += `<div class="cart-recommend">
          <p class="cart-recommend-title">Das könnte dir auch gefallen</p>
          <div class="cart-recommend-card">
            <span class="cart-recommend-icon">${pick.icon || "📦"}</span>
            <span class="cart-recommend-name">${escapeHtml(pick.name)}</span>
            <span class="cart-recommend-price">${eur(pick.price)}</span>
            <button class="cart-recommend-add" data-rec-id="${pick.id}">+</button>
          </div>
        </div>`;
      }
    }

    // Rabattcode
    if (cartConfig.discountEnabled) {
      html += `<div class="cart-discount">
        <input type="text" id="cart-discount-input" placeholder="Rabattcode (Demo: DEMO10)">
        <button type="button" id="cart-discount-apply">Anwenden</button>
        ${appliedDiscountLabel ? `<p class="cart-discount-msg ok">${escapeHtml(appliedDiscountLabel)}</p>` : ""}
      </div>`;
    }

    cartItemsList.innerHTML = html;

    // Summen
    const { reached } = cartConfig.progressEnabled ? getMilestoneStatus(subtotalRaw) : { reached: [] };
    const freeShippingFromMilestone = reached.some(m => m.action === "free-shipping");
    const extraDiscountFromMilestone = reached.some(m => m.action === "discount") ? 10 : 0;
    const totalDiscountPercent = appliedDiscountPercent + extraDiscountFromMilestone;
    const discountAmount = subtotalRaw * (totalDiscountPercent / 100);
    const shipping = cartConfig.progressEnabled ? (freeShippingFromMilestone ? 0 : 4.95) : 0;
    const total = Math.max(0, subtotalRaw - discountAmount) + shipping;

    let totalsHtml = `<div class="cart-totals"><div class="cart-total-row"><span>Zwischensumme</span><span>${eur(subtotalRaw)}</span></div>`;
    if (discountAmount > 0) totalsHtml += `<div class="cart-total-row"><span>Rabatt</span><span>−${eur(discountAmount)}</span></div>`;
    if (cartConfig.progressEnabled) totalsHtml += `<div class="cart-total-row"><span>Versand</span><span>${shipping === 0 ? "Kostenlos" : eur(shipping)}</span></div>`;
    if (reached.some(m => m.action === "free-product")) totalsHtml += `<div class="cart-total-row"><span>🎁 Gratis-Produkt</span><span>freigeschaltet</span></div>`;
    totalsHtml += `<div class="cart-total-row cart-total-final"><span>Gesamt</span><span>${eur(total)}</span></div></div>`;
    cartItemsList.insertAdjacentHTML("beforeend", totalsHtml);

    // Events
    cartItemsList.querySelectorAll(".cart-item-price-input").forEach(input => {
      wireHistory(input);
      input.addEventListener("input", (e) => updateCartItemPrice(e.target.dataset.cartId, e.target.value));
    });
    cartItemsList.querySelectorAll(".cart-item-remove").forEach(btn => {
      btn.addEventListener("click", (e) => {
        pushHistory();
        removeCartItem(e.target.dataset.cartId);
        showToast("Artikel entfernt", "info");
      });
    });
    const recAddBtn = cartItemsList.querySelector(".cart-recommend-add");
    if (recAddBtn) recAddBtn.addEventListener("click", (e) => {
      pushHistory();
      const rec = cartConfig.recommendations.find(r => r.id === e.target.dataset.recId);
      if (rec) { addCartItem(rec.name, rec.price); showToast("Empfehlung hinzugefügt", "success"); }
    });
    const discountApplyBtn = cartItemsList.querySelector("#cart-discount-apply");
    if (discountApplyBtn) discountApplyBtn.addEventListener("click", () => {
      const val = (cartItemsList.querySelector("#cart-discount-input").value || "").trim().toUpperCase();
      if (val === "DEMO10") {
        appliedDiscountPercent = 10;
        appliedDiscountLabel = 'Code „DEMO10“ angewendet (−10%).';
        showToast("Rabattcode angewendet", "success");
      } else {
        appliedDiscountPercent = 0;
        appliedDiscountLabel = "";
        showToast("Ungültiger Code (Demo-Code: DEMO10)", "danger");
      }
      renderCart();
    });

    if (cartCountBadge) cartCountBadge.innerText = getCartCount();
  }

  function openCartDrawer() { cartDrawerBackdrop.classList.add("active"); cartDrawer.classList.add("active"); renderCart(); }
  function closeCartDrawer() { cartDrawerBackdrop.classList.remove("active"); cartDrawer.classList.remove("active"); }
  closeCartBtn.addEventListener("click", closeCartDrawer);
  cartDrawerBackdrop.addEventListener("click", closeCartDrawer);
  if (btnOpenCart) btnOpenCart.addEventListener("click", openCartDrawer);

  if (cartButtonLabelInput) {
    wireHistory(cartButtonLabelInput);
    cartButtonLabelInput.addEventListener("input", (e) => {
      cartButtonLabel = e.target.value || "Zur Kasse gehen";
      if (cartCheckoutBtn) cartCheckoutBtn.innerText = cartButtonLabel;
    });
  }

  function syncCartConfigUI() {
    if (cartItemShapeSelect) cartItemShapeSelect.value = cartConfig.itemShape;
    if (cartRemoveColorInput) cartRemoveColorInput.value = cartConfig.removeButtonColor;
    if (cartDiscountToggle) cartDiscountToggle.checked = cartConfig.discountEnabled;
    if (cartRecommendToggle) {
      cartRecommendToggle.checked = cartConfig.recommendEnabled;
      cartRecommendConfig.classList.toggle("hidden", !cartConfig.recommendEnabled);
    }
    if (cartProgressToggle) {
      cartProgressToggle.checked = cartConfig.progressEnabled;
      cartProgressConfig.classList.toggle("hidden", !cartConfig.progressEnabled);
    }
  }

  if (cartItemShapeSelect) cartItemShapeSelect.addEventListener("change", () => { pushHistory(); cartConfig.itemShape = cartItemShapeSelect.value; renderCart(); });
  if (cartRemoveColorInput) {
    wireHistory(cartRemoveColorInput);
    cartRemoveColorInput.addEventListener("input", () => { cartConfig.removeButtonColor = cartRemoveColorInput.value; renderCart(); });
  }
  if (cartDiscountToggle) cartDiscountToggle.addEventListener("change", () => { pushHistory(); cartConfig.discountEnabled = cartDiscountToggle.checked; renderCart(); });
  if (cartRecommendToggle) cartRecommendToggle.addEventListener("change", () => {
    pushHistory();
    cartConfig.recommendEnabled = cartRecommendToggle.checked;
    cartRecommendConfig.classList.toggle("hidden", !cartConfig.recommendEnabled);
    renderCart();
  });
  if (btnAddRecommendation) btnAddRecommendation.addEventListener("click", () => {
    pushHistory();
    cartConfig.recommendations.push({ id: "rec_" + Date.now(), name: "Neues Produkt", price: 9.99, icon: "📦" });
    renderRecommendList();
    renderCart();
  });
  if (cartProgressToggle) cartProgressToggle.addEventListener("change", () => {
    pushHistory();
    cartConfig.progressEnabled = cartProgressToggle.checked;
    cartProgressConfig.classList.toggle("hidden", !cartConfig.progressEnabled);
    renderCart();
  });
  if (btnAddMilestone) btnAddMilestone.addEventListener("click", () => {
    pushHistory();
    cartConfig.milestones.push({ id: "ms_" + Date.now(), amount: 50, label: "Kostenloser Versand", action: "free-shipping" });
    renderMilestoneList();
    renderCart();
  });

  function renderRecommendList() {
    if (!cartRecommendList) return;
    cartRecommendList.innerHTML = "";
    cartConfig.recommendations.forEach(rec => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `
        <input type="text" class="rec-name" data-id="${rec.id}" value="${escapeAttr(rec.name)}" placeholder="Name" style="width:90px;">
        <input type="number" class="rec-price" data-id="${rec.id}" value="${rec.price}" step="0.01" style="width:60px;">
        <input type="text" class="rec-icon" data-id="${rec.id}" value="${escapeAttr(rec.icon || "📦")}" style="width:40px;" title="Emoji-Icon">
        <button type="button" class="item-delete" data-id="${rec.id}">✕</button>`;
      cartRecommendList.appendChild(row);
    });
    cartRecommendList.querySelectorAll(".rec-name").forEach(inp => { wireHistory(inp); inp.addEventListener("input", e => { const r = cartConfig.recommendations.find(x => x.id === e.target.dataset.id); if (r) { r.name = e.target.value; renderCart(); } }); });
    cartRecommendList.querySelectorAll(".rec-price").forEach(inp => { wireHistory(inp); inp.addEventListener("input", e => { const r = cartConfig.recommendations.find(x => x.id === e.target.dataset.id); if (r) { r.price = parseFloat(e.target.value) || 0; renderCart(); } }); });
    cartRecommendList.querySelectorAll(".rec-icon").forEach(inp => { wireHistory(inp); inp.addEventListener("input", e => { const r = cartConfig.recommendations.find(x => x.id === e.target.dataset.id); if (r) { r.icon = e.target.value; renderCart(); } }); });
    cartRecommendList.querySelectorAll(".item-delete").forEach(btn => btn.addEventListener("click", e => {
      pushHistory();
      cartConfig.recommendations = cartConfig.recommendations.filter(x => x.id !== e.target.dataset.id);
      renderRecommendList();
      renderCart();
    }));
  }

  function renderMilestoneList() {
    if (!cartMilestoneList) return;
    cartMilestoneList.innerHTML = "";
    cartConfig.milestones.forEach(m => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `
        <input type="number" class="ms-amount" data-id="${m.id}" value="${m.amount}" step="1" style="width:55px;" title="Betrag in €">
        <input type="text" class="ms-label" data-id="${m.id}" value="${escapeAttr(m.label)}" style="width:100px;" placeholder="Label">
        <select class="ms-action" data-id="${m.id}">
          <option value="free-shipping" ${m.action === "free-shipping" ? "selected" : ""}>Kostenloser Versand</option>
          <option value="discount" ${m.action === "discount" ? "selected" : ""}>Extra-Rabatt (10%)</option>
          <option value="free-product" ${m.action === "free-product" ? "selected" : ""}>Gratis-Produkt Hinweis</option>
          <option value="message" ${m.action === "message" ? "selected" : ""}>Nur Hinweistext</option>
        </select>
        <button type="button" class="item-delete" data-id="${m.id}">✕</button>`;
      cartMilestoneList.appendChild(row);
    });
    cartMilestoneList.querySelectorAll(".ms-amount").forEach(inp => { wireHistory(inp); inp.addEventListener("input", e => { const m = cartConfig.milestones.find(x => x.id === e.target.dataset.id); if (m) { m.amount = parseFloat(e.target.value) || 0; renderCart(); } }); });
    cartMilestoneList.querySelectorAll(".ms-label").forEach(inp => { wireHistory(inp); inp.addEventListener("input", e => { const m = cartConfig.milestones.find(x => x.id === e.target.dataset.id); if (m) { m.label = e.target.value; renderCart(); } }); });
    cartMilestoneList.querySelectorAll(".ms-action").forEach(sel => sel.addEventListener("change", e => { pushHistory(); const m = cartConfig.milestones.find(x => x.id === e.target.dataset.id); if (m) { m.action = e.target.value; renderCart(); } }));
    cartMilestoneList.querySelectorAll(".item-delete").forEach(btn => btn.addEventListener("click", e => {
      pushHistory();
      cartConfig.milestones = cartConfig.milestones.filter(x => x.id !== e.target.dataset.id);
      renderMilestoneList();
      renderCart();
    }));
  }

  // ============================================================
  // MELDUNGEN (Toast & positionierbare Meldung)
  // ============================================================
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "danger") icon = "⚠️";
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("toast-leaving");
      toast.addEventListener("animationend", () => toast.remove());
      setTimeout(() => toast.remove(), 600);
    }, 2800);
  }

  function showPositionedMessage(message, position = "bottom-right") {
    const msgEl = document.createElement("div");
    msgEl.className = "toast toast-info";
    msgEl.innerHTML = `<span>💬</span> <span>${escapeHtml(message)}</span>`;
    msgEl.style.position = "fixed";
    msgEl.style.zIndex = "9999";
    const offset = "24px";
    if (position === "top-right") { msgEl.style.top = offset; msgEl.style.right = offset; }
    else if (position === "top-left") { msgEl.style.top = offset; msgEl.style.left = offset; }
    else if (position === "bottom-left") { msgEl.style.bottom = offset; msgEl.style.left = offset; }
    else { msgEl.style.bottom = offset; msgEl.style.right = offset; }
    document.body.appendChild(msgEl);
    setTimeout(() => {
      msgEl.classList.add("toast-leaving");
      msgEl.addEventListener("animationend", () => msgEl.remove());
      setTimeout(() => msgEl.remove(), 600);
    }, 2800);
  }

  // ============================================================
  // CUSTOM ICONS & MODAL
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
        draggedShape = null;
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
  function closeModal() { modalOverlay.classList.remove("active"); }
  closeModalBtn.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeModal(); });
  function openCustomModal(item) {
    openModal(item.modalTitle || "Information", `<div>${escapeHtml(item.modalBody || "").replace(/\n/g, "<br>")}</div>`);
  }

  // ============================================================
  // KOPF- & FUSSZEILE
  // ============================================================
  function setupBarResize(handleEl, getHeight, setHeight, dir) {
    handleEl.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      armHistory();
      const startY = e.clientY;
      const startHeight = getHeight();
      const onMove = (moveEvent) => {
        const rawDelta = (moveEvent.clientY - startY) / zoomLevel;
        const delta = dir === "up" ? -rawDelta : rawDelta;
        const newHeight = Math.min(200, Math.max(40, Math.round(startHeight + delta)));
        setHeight(newHeight);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        commitHistory();
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  function renderBarItem(it, containerEl, barHeight) {
    const el = document.createElement("div");
    el.className = "bar-item";
    el.style.left = (it.x != null ? it.x : 10) + "px";
    el.style.top = (it.y != null ? it.y : Math.max(0, (barHeight - 24) / 2)) + "px";
    el.style.color = it.color || "#ffffff";
    if (it.type === "icon" && SVGMAP[it.iconName]) {
      el.innerHTML = SVGMAP[it.iconName];
      const svg = el.querySelector("svg, img");
      if (svg) { svg.style.width = (it.size || 28) + "px"; svg.style.height = (it.size || 28) + "px"; }
    } else {
      el.innerHTML = `<span style="font-size:${it.size || 18}px; font-weight:${it.bold ? "bold" : "normal"}; font-style:${it.italic ? "italic" : "normal"};">${escapeHtml(it.text || "")}</span>`;
    }
    makeDraggable(el, it, containerEl, { minY: 0, maxY: Math.max(0, barHeight - 20) });
    return el;
  }

  function renderHeaderFooter() {
    let header = document.getElementById("builder-header");
    let footer = document.getElementById("builder-footer");

    if (headerEnabled) {
      if (!header) {
        header = document.createElement("div");
        header.id = "builder-header";
        header.className = "builder-bar";
        canvasColumn.insertBefore(header, canvas);
      }
      header.classList.toggle("sticky-header", headerSticky);
      header.style.height = headerHeight + "px";
      header.style.background = headerBgColor;
      header.innerHTML = "";
      headerItems.forEach(it => header.appendChild(renderBarItem(it, header, headerHeight)));
      const handle = document.createElement("div");
      handle.className = "bar-resize-handle bottom";
      header.appendChild(handle);
      setupBarResize(handle, () => headerHeight, (h) => {
        headerHeight = h;
        header.style.height = h + "px";
        if (headerHeightInput) headerHeightInput.value = h;
      }, "down");
    } else if (header) {
      header.remove();
    }

    if (footerEnabled) {
      if (!footer) {
        footer = document.createElement("div");
        footer.id = "builder-footer";
        footer.className = "builder-bar";
        canvasColumn.appendChild(footer);
      }
      footer.style.height = footerHeight + "px";
      footer.style.background = footerBgColor;
      footer.innerHTML = "";
      const handle = document.createElement("div");
      handle.className = "bar-resize-handle top";
      footer.appendChild(handle);
      footerItems.forEach(it => footer.appendChild(renderBarItem(it, footer, footerHeight)));
      setupBarResize(handle, () => footerHeight, (h) => {
        footerHeight = h;
        footer.style.height = h + "px";
        if (footerHeightInput) footerHeightInput.value = h;
      }, "up");
    } else if (footer) {
      footer.remove();
    }
  }

  function renderBarItemsList(items, listEl) {
    if (!listEl) return;
    listEl.innerHTML = "";
    items.forEach(it => {
      const row = document.createElement("div");
      row.className = "item-row";
      if (it.type === "text") {
        row.innerHTML = `
          <input type="text" class="bar-item-text" data-id="${it.id}" value="${escapeAttr(it.text || "")}" placeholder="Text">
          <input type="color" class="bar-item-color" data-id="${it.id}" value="${it.color || "#ffffff"}">
          <label class="mini-check"><input type="checkbox" class="bar-item-bold" data-id="${it.id}" ${it.bold ? "checked" : ""}>F</label>
          <label class="mini-check"><input type="checkbox" class="bar-item-italic" data-id="${it.id}" ${it.italic ? "checked" : ""}>K</label>
          <button type="button" class="item-delete" data-id="${it.id}">✕</button>`;
      } else {
        const iconOptions = Object.keys(SVGMAP).map(name => `<option value="${name}" ${it.iconName === name ? "selected" : ""}>${name}</option>`).join("");
        row.innerHTML = `
          <select class="bar-item-icon" data-id="${it.id}">${iconOptions}</select>
          <input type="color" class="bar-item-color" data-id="${it.id}" value="${it.color || "#ffffff"}">
          <button type="button" class="item-delete" data-id="${it.id}">✕</button>`;
      }
      listEl.appendChild(row);
    });

    listEl.querySelectorAll(".bar-item-text").forEach(inp => {
      wireHistory(inp);
      inp.addEventListener("input", (e) => { const it = items.find(x => x.id === e.target.dataset.id); if (it) { it.text = e.target.value; renderHeaderFooter(); } });
    });
    listEl.querySelectorAll(".bar-item-color").forEach(inp => {
      wireHistory(inp);
      inp.addEventListener("input", (e) => { const it = items.find(x => x.id === e.target.dataset.id); if (it) { it.color = e.target.value; renderHeaderFooter(); } });
    });
    listEl.querySelectorAll(".bar-item-bold").forEach(inp => {
      inp.addEventListener("change", (e) => { pushHistory(); const it = items.find(x => x.id === e.target.dataset.id); if (it) { it.bold = e.target.checked; renderHeaderFooter(); } });
    });
    listEl.querySelectorAll(".bar-item-italic").forEach(inp => {
      inp.addEventListener("change", (e) => { pushHistory(); const it = items.find(x => x.id === e.target.dataset.id); if (it) { it.italic = e.target.checked; renderHeaderFooter(); } });
    });
    listEl.querySelectorAll(".bar-item-icon").forEach(sel => {
      sel.addEventListener("change", (e) => { pushHistory(); const it = items.find(x => x.id === e.target.dataset.id); if (it) { it.iconName = e.target.value; renderHeaderFooter(); } });
    });
    listEl.querySelectorAll(".item-delete").forEach(btn => {
      btn.addEventListener("click", (e) => {
        pushHistory();
        const id = e.target.dataset.id;
        const idx = items.findIndex(x => x.id === id);
        if (idx > -1) items.splice(idx, 1);
        renderBarItemsList(items, listEl);
        renderHeaderFooter();
      });
    });
  }

  if (headerToggle) headerToggle.addEventListener("change", () => {
    pushHistory();
    headerEnabled = headerToggle.checked;
    if (headerEnabled && headerItems.length === 0) {
      headerItems.push({ id: "hitem_" + Date.now(), type: "text", text: "Meine Website", x: 20, y: Math.max(0, (headerHeight - 24) / 2), color: "#ffffff", size: 20, bold: true, italic: false });
      renderBarItemsList(headerItems, headerItemsListEl);
    }
    renderHeaderFooter();
    showToast(headerEnabled ? "Header aktiviert" : "Header deaktiviert", "info");
  });
  if (headerStickyToggle) headerStickyToggle.addEventListener("change", () => { pushHistory(); headerSticky = headerStickyToggle.checked; renderHeaderFooter(); });
  if (headerHeightInput) {
    wireHistory(headerHeightInput);
    headerHeightInput.addEventListener("input", () => { headerHeight = parseInt(headerHeightInput.value) || 64; renderHeaderFooter(); });
  }
  if (headerBgInput) {
    wireHistory(headerBgInput);
    headerBgInput.addEventListener("input", () => { headerBgColor = headerBgInput.value; renderHeaderFooter(); });
  }
  if (btnAddHeaderText) btnAddHeaderText.addEventListener("click", () => {
    pushHistory();
    headerItems.push({ id: "hitem_" + Date.now(), type: "text", text: "Text", x: 20, y: Math.max(0, (headerHeight - 24) / 2), color: "#ffffff", size: 16, bold: false, italic: false });
    renderBarItemsList(headerItems, headerItemsListEl);
    renderHeaderFooter();
  });
  if (btnAddHeaderIcon) btnAddHeaderIcon.addEventListener("click", () => {
    pushHistory();
    headerItems.push({ id: "hitem_" + Date.now(), type: "icon", iconName: "settings", x: 20, y: Math.max(0, (headerHeight - 28) / 2), color: "#ffffff", size: 24 });
    renderBarItemsList(headerItems, headerItemsListEl);
    renderHeaderFooter();
  });

  if (footerToggle) footerToggle.addEventListener("change", () => {
    pushHistory();
    footerEnabled = footerToggle.checked;
    if (footerEnabled && footerItems.length === 0) {
      footerItems.push({ id: "fitem_" + Date.now(), type: "text", text: "© 2026 WebBuilder Pro", x: 20, y: Math.max(0, (footerHeight - 20) / 2), color: "#cbd5e1", size: 14, bold: false, italic: false });
      renderBarItemsList(footerItems, footerItemsListEl);
    }
    renderHeaderFooter();
    showToast(footerEnabled ? "Footer aktiviert" : "Footer deaktiviert", "info");
  });
  if (footerHeightInput) {
    wireHistory(footerHeightInput);
    footerHeightInput.addEventListener("input", () => { footerHeight = parseInt(footerHeightInput.value) || 70; renderHeaderFooter(); });
  }
  if (footerBgInput) {
    wireHistory(footerBgInput);
    footerBgInput.addEventListener("input", () => { footerBgColor = footerBgInput.value; renderHeaderFooter(); });
  }
  if (btnAddFooterText) btnAddFooterText.addEventListener("click", () => {
    pushHistory();
    footerItems.push({ id: "fitem_" + Date.now(), type: "text", text: "Text", x: 20, y: Math.max(0, (footerHeight - 20) / 2), color: "#cbd5e1", size: 14, bold: false, italic: false });
    renderBarItemsList(footerItems, footerItemsListEl);
    renderHeaderFooter();
  });
  if (btnAddFooterIcon) btnAddFooterIcon.addEventListener("click", () => {
    pushHistory();
    footerItems.push({ id: "fitem_" + Date.now(), type: "icon", iconName: "arrow-up", x: 20, y: Math.max(0, (footerHeight - 24) / 2), color: "#cbd5e1", size: 20 });
    renderBarItemsList(footerItems, footerItemsListEl);
    renderHeaderFooter();
  });

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
      <div class="inspector-subsection" id="ext-shape-section" style="display:none;">
        <h4>Form-Optionen (Test-Objekt)</h4>
        <div class="inspector-row"><label>Form</label>
          <select id="ext-shape-type">
            <option value="rectangle">Rechteck</option>
            <option value="circle">Kreis</option>
            <option value="triangle">Dreieck</option>
          </select>
        </div>
        <div class="inspector-row"><label>Stil</label>
          <select id="ext-shape-style">
            <option value="solid">Ausgefüllt</option>
            <option value="outline">Nur Rahmen</option>
          </select>
        </div>
      </div>

      <div class="inspector-subsection" id="ext-icon-frame-section" style="display:none;">
        <h4>Icon-Rahmen</h4>
        <div class="inspector-row"><label>Rahmen (rund)</label><input type="checkbox" id="ext-icon-frame" /></div>
        <div class="inspector-row"><label>Rahmenfarbe</label><input type="color" id="ext-icon-frame-color" value="#111827" /></div>
      </div>

      <div class="inspector-subsection" id="ext-format-section" style="display:none;">
        <h4>Textformat</h4>
        <div class="inspector-row"><label>Fett</label><input type="checkbox" id="ext-bold" /></div>
        <div class="inspector-row"><label>Kursiv</label><input type="checkbox" id="ext-italic" /></div>
        <p class="help-text" style="margin:6px 0 0;">Für Verlinkungen nutze oben die Aktion „Neue Seite / URL öffnen“.</p>
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

    document.getElementById("ext-shape-type").addEventListener("change", (e) => { pushHistory(); const item = getSelected(); if (item) { item.shapeType = e.target.value; renderCanvas(); } });
    document.getElementById("ext-shape-style").addEventListener("change", (e) => { pushHistory(); const item = getSelected(); if (item) { item.shapeStyle = e.target.value; renderCanvas(); } });

    document.getElementById("ext-icon-frame").addEventListener("change", (e) => { pushHistory(); const item = getSelected(); if (item) { item.iconFrame = e.target.checked; renderCanvas(); } });
    wireHistory(document.getElementById("ext-icon-frame-color"));
    document.getElementById("ext-icon-frame-color").addEventListener("input", (e) => { const item = getSelected(); if (item) { item.iconFrameColor = e.target.value; renderCanvas(); } });

    document.getElementById("ext-bold").addEventListener("change", (e) => { pushHistory(); const item = getSelected(); if (item) { item.bold = e.target.checked; renderCanvas(); } });
    document.getElementById("ext-italic").addEventListener("change", (e) => { pushHistory(); const item = getSelected(); if (item) { item.italic = e.target.checked; renderCanvas(); } });

    const bindStyleField = (fieldId, prop, parser = (v) => v) => {
      const el = document.getElementById(fieldId);
      wireHistory(el);
      el.addEventListener("input", (e) => { const item = getSelected(); if (item) { item[prop] = parser(e.target.value); renderCanvas(); } });
    };
    bindStyleField("ext-modal-title", "modalTitle");
    bindStyleField("ext-modal-body", "modalBody");
    bindStyleField("ext-message-position", "messagePosition");
  }
  ensureExtendedInspector();

  function populateExtendedInspector(item) {
    const isShape = item.type === "shape";
    document.getElementById("ext-shape-section").style.display = isShape ? "block" : "none";
    if (isShape) {
      document.getElementById("ext-shape-type").value = item.shapeType || "rectangle";
      document.getElementById("ext-shape-style").value = item.shapeStyle || "solid";
    }

    const isIcon = item.type === "icon";
    document.getElementById("ext-icon-frame-section").style.display = isIcon ? "block" : "none";
    if (isIcon) {
      document.getElementById("ext-icon-frame").checked = !!item.iconFrame;
      document.getElementById("ext-icon-frame-color").value = item.iconFrameColor || "#111827";
    }

    const isTextLike = ["text", "headline", "button"].includes(item.type);
    document.getElementById("ext-format-section").style.display = isTextLike ? "block" : "none";
    if (isTextLike) {
      document.getElementById("ext-bold").checked = !!item.bold;
      document.getElementById("ext-italic").checked = !!item.italic;
    }

    const isCustomModal = item.actionType === "open-custom-modal";
    document.getElementById("ext-modal-section").style.display = isCustomModal ? "block" : "none";
    document.getElementById("ext-modal-title").value = item.modalTitle || "";
    document.getElementById("ext-modal-body").value = item.modalBody || "";

    const isAlertMsg = item.actionType === "alert-msg";
    document.getElementById("ext-message-section").style.display = isAlertMsg ? "block" : "none";
    document.getElementById("ext-message-position").value = item.messagePosition || "bottom-right";
  }

  function ensureGenericModalActionOption() {
    if (!propActionType) return;
    Array.from(propActionType.options).forEach(opt => {
      if (opt.value === "open-cookie-modal" || opt.value === "open-agb-modal" || opt.value === "open-modal") opt.remove();
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
  // CANVAS BACKGROUND
  // ============================================================
  bgType.addEventListener("change", () => {
    pushHistory();
    const mode = bgType.value;
    bgSolidGroup.classList.toggle("hidden", mode !== "solid");
    bgGradientGroup.classList.toggle("hidden", mode !== "gradient");
    bgImageGroup.classList.toggle("hidden", mode !== "image");
    updateCanvasBackground();
  });
  wireHistory(bgColorInput); bgColorInput.addEventListener("input", updateCanvasBackground);
  wireHistory(bgGrad1Input); bgGrad1Input.addEventListener("input", updateCanvasBackground);
  wireHistory(bgGrad2Input); bgGrad2Input.addEventListener("input", updateCanvasBackground);
  bgGradDirInput.addEventListener("change", () => { pushHistory(); updateCanvasBackground(); });
  wireHistory(bgImageUrlInput); bgImageUrlInput.addEventListener("input", updateCanvasBackground);

  bgImageFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      pushHistory();
      const reader = new FileReader();
      reader.onload = (event) => { bgImageUrlInput.value = event.target.result; updateCanvasBackground(); };
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
      const url = bgImageUrlInput.value || "https://picsum.photos/1000/1200";
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
      draggedShape = item.dataset.shape || null;
      e.dataTransfer.setData("text/plain", draggedType);
    });
  });

  canvas.addEventListener("dragover", (e) => e.preventDefault());

  canvas.addEventListener("drop", (e) => {
    e.preventDefault();
    if (isPreviewMode) return;
    const local = toLocalCoords(canvas, e.clientX, e.clientY);
    createElement(draggedType, draggedIcon, Math.max(0, local.x - 40), Math.max(0, local.y - 20), draggedShape);
  });

  // ============================================================
  // ELEMENT CREATION & MANAGEMENT
  // ============================================================
  function createElement(type, iconName = null, x = 50, y = 50, shapeType = null) {
    pushHistory();
    const id = "elem_" + Date.now();
    const newElement = {
      id, type, iconName, x, y,
      text: type === "button" ? "Klick mich" : (type === "headline" ? "Neue Überschrift" : "Beispieltext..."),
      color: type === "shape" ? "#4f46e5" : "#1f2937",
      size: type === "icon" ? 36 : (type === "headline" ? 32 : (type === "image" ? 200 : (type === "shape" ? 100 : 18))),
      imageUrl: type === "image" ? "https://picsum.photos/300/200" : "",
      actionType: "none",
      actionUrl: "",
      actionMsg: "",
      shapeType: type === "shape" ? (shapeType || "rectangle") : null,
      shapeStyle: type === "shape" ? "solid" : null,
      bold: type === "headline",
      italic: false,
      iconFrame: false,
      iconFrameColor: "#111827",
      price: 9.99,
      modalTitle: "",
      modalBody: "",
      messagePosition: "bottom-right"
    };
    elements.push(newElement);
    renderCanvas();
    selectElement(id);
    showToast("Neues Element hinzugefügt", "success");
  }

  function renderShapeInner(item) {
    const s = item.size || 100;
    const outline = item.shapeStyle === "outline";
    if (item.shapeType === "circle") {
      return `<div style="width:${s}px; height:${s}px; border-radius:50%; ${outline ? `background:transparent; border:3px solid ${item.color};` : `background:${item.color}; border:none;`}"></div>`;
    }
    if (item.shapeType === "triangle") {
      const half = s / 2;
      if (outline) {
        return `<div style="position:relative; width:${s}px; height:${s}px;">
          <div style="position:absolute; inset:0; width:0; height:0; margin:auto; border-left:${half}px solid transparent; border-right:${half}px solid transparent; border-bottom:${s}px solid ${item.color};"></div>
          <div style="position:absolute; top:3px; left:3px; width:0; height:0; border-left:${half - 3}px solid transparent; border-right:${half - 3}px solid transparent; border-bottom:${s - 6}px solid #ffffff;"></div>
        </div>`;
      }
      return `<div style="width:0; height:0; border-left:${half}px solid transparent; border-right:${half}px solid transparent; border-bottom:${s}px solid ${item.color};"></div>`;
    }
    const h = Math.round(s * 0.65);
    return `<div style="width:${s}px; height:${h}px; border-radius:6px; ${outline ? `background:transparent; border:3px solid ${item.color};` : `background:${item.color}; border:none;`}"></div>`;
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

      if (item.type === "icon" && SVGMAP[item.iconName]) {
        el.innerHTML = item.iconFrame
          ? `<span class="icon-frame-wrap" style="border-color:${item.iconFrameColor || "#111827"};">${SVGMAP[item.iconName]}</span>`
          : SVGMAP[item.iconName];
        const svg = el.querySelector("svg, img");
        if (svg) { svg.style.width = `${item.size}px`; svg.style.height = `${item.size}px`; }
      } else if (item.type === "button") {
        el.innerHTML = `<button class="btn btn-primary" style="font-size:${item.size}px; background-color:${item.color}; font-weight:${item.bold ? "bold" : "600"}; font-style:${item.italic ? "italic" : "normal"};">${escapeHtml(item.text)}</button>`;
      } else if (item.type === "headline") {
        el.innerHTML = `<h2 style="font-size:${item.size}px; color:${item.color}; font-weight:${item.bold ? "bold" : "400"}; font-style:${item.italic ? "italic" : "normal"};">${escapeHtml(item.text)}</h2>`;
      } else if (item.type === "box") {
        el.innerHTML = `<div style="width:140px; height:90px; background:${item.color}; border-radius:8px; box-shadow: var(--shadow-md);"></div>`;
      } else if (item.type === "shape") {
        el.innerHTML = renderShapeInner(item);
      } else if (item.type === "image") {
        const src = item.imageUrl || "https://via.placeholder.com/200";
        el.innerHTML = `<img src="${src}" class="canvas-img" style="width:${item.size}px; height:auto;" alt="Bild Element" />`;
      } else {
        el.innerHTML = `<p style="font-size:${item.size}px; color:${item.color}; font-weight:${item.bold ? "bold" : "normal"}; font-style:${item.italic ? "italic" : "normal"};">${escapeHtml(item.text)}</p>`;
      }

      const badge = document.createElement("span");
      badge.className = "element-badge";
      badge.innerText = "⚡ Logik";
      el.appendChild(badge);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isPreviewMode) {
          executeAction(item, el);
        } else {
          selectElement(item.id);
        }
      });

      makeDraggable(el, item, canvas, {});
      canvas.appendChild(el);
    });
  }

  // ============================================================
  // INSPECTOR SYNC & INTERACTION
  // ============================================================
  function duplicateElement(id) {
    pushHistory();
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
    const isBoxLike = item.type === "box" || item.type === "shape";

    groupText.classList.toggle("hidden", isImage || isBoxLike);
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
    if (!isPreviewMode) { selectedElementId = null; selectElement(null); }
  });

  wireHistory(propText);
  propText.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.text = e.target.value; renderCanvas(); } });

  wireHistory(propSize);
  propSize.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.size = parseInt(e.target.value) || 16; renderCanvas(); } });

  wireHistory(propColor);
  propColor.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.color = e.target.value; renderCanvas(); } });

  wireHistory(propImageUrl);
  propImageUrl.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.imageUrl = e.target.value; renderCanvas(); } });

  propImageFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    const item = getSelected();
    if (file && item) {
      pushHistory();
      const reader = new FileReader();
      reader.onload = (event) => { item.imageUrl = event.target.result; propImageUrl.value = event.target.result; renderCanvas(); };
      reader.readAsDataURL(file);
    }
  });

  propActionType.addEventListener("change", (e) => {
    pushHistory();
    const item = getSelected();
    if (item) {
      item.actionType = e.target.value;
      toggleActionFields(item.actionType);
      populateExtendedInspector(item);
      renderCanvas();
    }
  });

  wireHistory(propActionUrl);
  propActionUrl.addEventListener("input", (e) => { const item = getSelected(); if (item) item.actionUrl = e.target.value; });

  wireHistory(propActionMsg);
  propActionMsg.addEventListener("input", (e) => { const item = getSelected(); if (item) item.actionMsg = e.target.value; });

  btnDelete.addEventListener("click", () => {
    if (selectedElementId) {
      pushHistory();
      elements = elements.filter(el => el.id !== selectedElementId);
      selectedElementId = null;
      selectElement(null);
      renderCanvas();
      showToast("Element gelöscht", "info");
    }
  });

  function getSelected() { return elements.find(el => el.id === selectedElementId); }

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
    btnModeToggle.innerHTML = isPreviewMode ? "✏️ Editor-Modus" : "👁️ Vorschau";
    applyZoom();

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
      pushHistory();
      elements = [];
      selectedElementId = null;
      selectElement(null);
      renderCanvas();
      showToast("Zeichenfläche geleert", "info");
    }
  });

  function renderBarItemExport(it) {
    const style = `position:absolute; left:${it.x || 0}px; top:${it.y || 0}px; color:${it.color || "#fff"};`;
    if (it.type === "icon" && SVGMAP[it.iconName]) return `<span style="${style}">${SVGMAP[it.iconName]}</span>`;
    return `<span style="${style} font-size:${it.size || 18}px; font-weight:${it.bold ? "bold" : "normal"}; font-style:${it.italic ? "italic" : "normal"};">${escapeHtml(it.text || "")}</span>`;
  }

  btnExport.addEventListener("click", () => {
    let exportedHTML = `<!-- WebBuilder Pro Export -->\n`;
    if (headerEnabled) {
      exportedHTML += `<div style="position:relative; width:100%; height:${headerHeight}px; background:${headerBgColor};${headerSticky ? " position:sticky; top:0; z-index:300;" : ""}">\n`;
      headerItems.forEach(it => { exportedHTML += `  ${renderBarItemExport(it)}\n`; });
      exportedHTML += `</div>\n`;
    }
    exportedHTML += `<div style="position:relative; width:100%; min-height:100vh; background:${canvas.style.background};">\n`;
    elements.forEach(item => {
      exportedHTML += `  <!-- Element: ${item.id} (${item.type}) -->\n`;
      exportedHTML += `  <div style="position:absolute; left:${item.x}px; top:${item.y}px; color:${item.color};">\n`;
      if (item.type === "icon" && SVGMAP[item.iconName]) {
        exportedHTML += item.iconFrame
          ? `    <span style="display:inline-flex;align-items:center;justify-content:center;border:2px solid ${item.iconFrameColor};border-radius:50%;padding:8px;background:#fff;">${SVGMAP[item.iconName]}</span>\n`
          : `    ${SVGMAP[item.iconName]}\n`;
      } else if (item.type === "button") {
        exportedHTML += `    <button style="font-size:${item.size}px; background:${item.color}; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:${item.bold ? "bold" : "600"}; font-style:${item.italic ? "italic" : "normal"};">${item.text}</button>\n`;
      } else if (item.type === "headline") {
        exportedHTML += `    <h2 style="font-size:${item.size}px; color:${item.color}; margin:0; font-weight:${item.bold ? "bold" : "400"}; font-style:${item.italic ? "italic" : "normal"};">${item.text}</h2>\n`;
      } else if (item.type === "image") {
        exportedHTML += `    <img src="${item.imageUrl}" style="width:${item.size}px; height:auto; display:block;" alt="Exportiertes Bild" />\n`;
      } else if (item.type === "box") {
        exportedHTML += `    <div style="width:140px; height:90px; background:${item.color}; border-radius:8px;"></div>\n`;
      } else if (item.type === "shape") {
        exportedHTML += `    ${renderShapeInner(item)}\n`;
      } else {
        exportedHTML += `    <p style="font-size:${item.size}px; color:${item.color}; margin:0; font-weight:${item.bold ? "bold" : "normal"}; font-style:${item.italic ? "italic" : "normal"};">${item.text}</p>\n`;
      }
      exportedHTML += `  </div>\n`;
    });
    exportedHTML += `</div>\n`;
    if (footerEnabled) {
      exportedHTML += `<div style="position:relative; width:100%; height:${footerHeight}px; background:${footerBgColor};">\n`;
      footerItems.forEach(it => { exportedHTML += `  ${renderBarItemExport(it)}\n`; });
      exportedHTML += `</div>\n`;
    }
    console.log(exportedHTML);
    showToast("HTML wurde in der Entwickler-Konsole (F12) ausgegeben!", "success");
  });

  // ============================================================
  // SPEICHERN / LADEN (localStorage)
  // ============================================================
  function saveProjectState() {
    const state = {
      elements, cartItems, cartButtonLabel, cartConfig,
      headerEnabled, headerSticky, headerHeight, headerBgColor, headerItems,
      footerEnabled, footerHeight, footerBgColor, footerItems,
      background: {
        type: bgType.value, color: bgColorInput.value, grad1: bgGrad1Input.value,
        grad2: bgGrad2Input.value, gradDir: bgGradDirInput.value, imageUrl: bgImageUrlInput.value
      }
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      showToast("Projekt gespeichert 💾", "success");
    } catch (err) {
      showToast("Speichern fehlgeschlagen", "danger");
    }
  }

  function loadProjectState() {
    let raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (err) { return; }
    if (!raw) return;
    try {
      const state = JSON.parse(raw);
      elements = state.elements || [];
      cartItems = state.cartItems || [];
      cartButtonLabel = state.cartButtonLabel || "Zur Kasse gehen";
      cartConfig = Object.assign({
        itemShape: "rounded", removeButtonColor: "#ef4444", discountEnabled: false,
        recommendEnabled: false, recommendations: [], progressEnabled: false, milestones: []
      }, state.cartConfig || {});

      headerEnabled = !!state.headerEnabled;
      headerSticky = !!state.headerSticky;
      headerHeight = state.headerHeight || 64;
      headerBgColor = state.headerBgColor || "#111827";
      headerItems = state.headerItems || [];

      footerEnabled = !!state.footerEnabled;
      footerHeight = state.footerHeight || 70;
      footerBgColor = state.footerBgColor || "#111827";
      footerItems = state.footerItems || [];

      if (headerToggle) headerToggle.checked = headerEnabled;
      if (headerStickyToggle) headerStickyToggle.checked = headerSticky;
      if (headerHeightInput) headerHeightInput.value = headerHeight;
      if (headerBgInput) headerBgInput.value = headerBgColor;
      if (footerToggle) footerToggle.checked = footerEnabled;
      if (footerHeightInput) footerHeightInput.value = footerHeight;
      if (footerBgInput) footerBgInput.value = footerBgColor;
      if (cartButtonLabelInput) cartButtonLabelInput.value = cartButtonLabel;
      if (cartCheckoutBtn) cartCheckoutBtn.innerText = cartButtonLabel;

      if (state.background) {
        bgType.value = state.background.type || "solid";
        bgColorInput.value = state.background.color || "#ffffff";
        bgGrad1Input.value = state.background.grad1 || "#4f46e5";
        bgGrad2Input.value = state.background.grad2 || "#06b6d4";
        bgGradDirInput.value = state.background.gradDir || "to right";
        bgImageUrlInput.value = state.background.imageUrl || "";
        bgSolidGroup.classList.toggle("hidden", bgType.value !== "solid");
        bgGradientGroup.classList.toggle("hidden", bgType.value !== "gradient");
        bgImageGroup.classList.toggle("hidden", bgType.value !== "image");
        updateCanvasBackground();
      }
    } catch (err) {
      // Ungültiger Speicherstand wird ignoriert.
    }
  }

  if (btnSave) btnSave.addEventListener("click", saveProjectState);

  // ============================================================
  // INITIALISIERUNG
  // ============================================================
  loadProjectState();
  syncCartConfigUI();
  renderRecommendList();
  renderMilestoneList();
  renderBarItemsList(headerItems, headerItemsListEl);
  renderBarItemsList(footerItems, footerItemsListEl);
  renderCart();
  renderCanvas();
  renderHeaderFooter();
  applyZoom();
});
