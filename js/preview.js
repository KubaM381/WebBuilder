import { state, renderCanvas } from './builder.js';

export function initPreview() {
  const btnModeToggle = document.getElementById("btn-mode-toggle");
  const closeCartBtn = document.getElementById("close-cart-btn");
  const cartDrawerBackdrop = document.getElementById("cart-drawer-backdrop");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const modalOverlay = document.getElementById("modal-overlay");

  btnModeToggle?.addEventListener("click", () => {
    state.isPreviewMode = !state.isPreviewMode;
    document.body.classList.toggle("preview-mode", state.isPreviewMode);
    btnModeToggle.innerHTML = state.isPreviewMode ? "✏️ Editor-Modus" : "👁️ Vorschau-Modus";

    if (state.isPreviewMode) {
      state.selectedElementId = null;
      renderCanvas();
      showToast("Vorschau-Modus aktiv - Klick-Aktionen sind bereit!", "info");
    } else {
      renderCanvas();
      showToast("Editor-Modus aktiv", "info");
    }
  });

  closeCartBtn?.addEventListener("click", closeCartDrawer);
  cartDrawerBackdrop?.addEventListener("click", closeCartDrawer);

  closeModalBtn?.addEventListener("click", closeModal);
  modalOverlay?.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}

export function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toast-container");
  if (!toastContainer) return;
  toastContainer.className = `toast-${state.toastPosition}`;

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

export function addToCart(product) {
  const existing = state.cartItems.find(item => item.name === product.name);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cartItems.push({
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

export function removeFromCart(id) {
  state.cartItems = state.cartItems.filter(item => item.id !== id);
  updateCartUI();
  showToast("Artikel aus Warenkorb entfernt", "info");
}

export function updateCartItemQty(id, qty) {
  const item = state.cartItems.find(i => i.id === id);
  if (item) {
    item.qty = Math.max(1, parseInt(qty) || 1);
    updateCartUI();
  }
}

export function updateCartItemPrice(id, price) {
  const item = state.cartItems.find(i => i.id === id);
  if (item) {
    item.price = Math.max(0, parseFloat(price) || 0);
    updateCartUI();
  }
}

export function calculateCartTotal() {
  return state.cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

export function updateCartUI() {
  const cartCountBadge = document.getElementById("cart-count-badge");
  const cartItemsList = document.getElementById("cart-items-list");
  const totalCount = state.cartItems.reduce((sum, item) => sum + item.qty, 0);

  if (cartCountBadge) {
    cartCountBadge.innerText = totalCount;
    cartCountBadge.classList.add("cart-badge-hover");
  }

  if (cartItemsList) {
    cartItemsList.innerHTML = "";
    if (state.cartItems.length === 0) {
      cartItemsList.innerHTML = `<p style="text-align:center; color:#94a3b8; padding:20px;">Der Warenkorb ist leer.</p>`;
    } else {
      state.cartItems.forEach(item => {
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

export function openCartDrawer() {
  const cartDrawerBackdrop = document.getElementById("cart-drawer-backdrop");
  const cartDrawer = document.getElementById("cart-drawer");
  if (cartDrawerBackdrop) cartDrawerBackdrop.classList.add("active");
  if (cartDrawer) cartDrawer.classList.add("active");
  updateCartUI();
}

export function closeCartDrawer() {
  const cartDrawerBackdrop = document.getElementById("cart-drawer-backdrop");
  const cartDrawer = document.getElementById("cart-drawer");
  if (cartDrawerBackdrop) cartDrawerBackdrop.classList.remove("active");
  if (cartDrawer) cartDrawer.classList.remove("active");
}

export function openModal(titleText, bodyHTML, footerHTML = "") {
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const modalFooter = document.getElementById("modal-footer");
  const modalOverlay = document.getElementById("modal-overlay");

  if (modalTitle) modalTitle.innerText = titleText;
  if (modalBody) modalBody.innerHTML = bodyHTML;
  if (modalFooter) {
    modalFooter.innerHTML = footerHTML || `<button class="btn btn-primary" onclick="document.getElementById('modal-overlay').classList.remove('active')">Schließen</button>`;
  }
  if (modalOverlay) modalOverlay.classList.add("active");
}

export function closeModal() {
  const modalOverlay = document.getElementById("modal-overlay");
  if (modalOverlay) modalOverlay.classList.remove("active");
}

export function executeAction(item, domEl) {
  const canvas = document.getElementById("canvas");

  switch (item.actionType) {
    case "scroll-top":
      window.scrollTo({ top: 0, behavior: "smooth" });
      canvas?.scrollTo({ top: 0, behavior: "smooth" });
      showToast("Nach oben gescrollt ⬆️", "info");
      break;

    case "scroll-bottom":
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      canvas?.scrollTo({ top: canvas.scrollHeight, behavior: "smooth" });
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
