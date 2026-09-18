// js/shop/cart-drawer.js
// WebBuilder cart drawer — owns the real slide-in cart drawer
// (#cart-drawer/#cart-items-list): rendering, open/close, and all click/
// change interactions inside it (discount code, add recommended product,
// quantity/price/remove per item). Split out of the former
// shop/cart-render.js (see docs/STRUCTURE_PLAN.md Phase 2). HTML building
// lives in shop/cart-html.js (window.WebBuilderCartHtml) — this file only
// mounts it into the DOM and wires up interaction. Left-sidebar config UI
// lives in shop/cart-sidebar.js. Cart data/CRUD lives in shop/cart-data.js.
// Must load after shop/cart-data.js and shop/cart-html.js (reads
// window.WebBuilderCart / window.WebBuilderCartHtml at top-level parse
// time / inside renderCart()).
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCartDrawer: WebBuilderState is not available."); return; }
  const cart = window.WebBuilderCart;
  if (!cart) { console.error("WebBuilderCartDrawer: WebBuilderCart is not available."); return; }

  // Renders the real slide-in drawer (#cart-items-list, always
  // non-interactive). Title and checkout button are built into
  // buildCartHtml() itself (see shop/cart-html.js) — no separate header/
  // footer bar elements to update by id.
  function renderCart() {
    const list = document.getElementById("cart-items-list");
    if (!list) return;
    const buildCartHtml = window.WebBuilderCartHtml?.buildCartHtml;
    list.innerHTML = buildCartHtml ? buildCartHtml(cart.getItems(), { interactive: false, isDemo: false }) : "";
    const config = cart.getConfig() || {};
    // "Hintergrund" (component:background) applies to the real drawer too,
    // not just the editor preview.
    const drawer = document.getElementById("cart-drawer");
    if (drawer) drawer.style.backgroundColor = config.cardBackgroundColor || "";
  }

  // Re-renders every place the cart's content is currently visible: the
  // real drawer plus — if the editor is open — the editor stage
  // (shop/cart-editor.js). Other modules re-render via
  // window.WebBuilderCartRuntime.refresh() rather than duplicating this.
  function refreshCartViews() {
    renderCart();
    if (state.cartFocusMode) {
      window.WebBuilderCartFocus?.renderStage?.();
      window.WebBuilderCartFocus?.renderPartPanel?.();
    }
  }

  function openCart() {
    document.getElementById("cart-drawer")?.classList.add("active");
    document.getElementById("cart-drawer-backdrop")?.classList.add("active");
    renderCart();
    return true;
  }
  function closeCart() {
    document.getElementById("cart-drawer")?.classList.remove("active");
    document.getElementById("cart-drawer-backdrop")?.classList.remove("active");
    return true;
  }

  function bind() {
    // Delegated on `document`. Scoped to #cart-items-list (the real
    // drawer) only — NOT to #cart-focus-stage (the editor stage has no
    // working click handlers by design, see shop/cart-editor.js).
    document.addEventListener("click", e => {
      const inStage = !!e.target.closest?.("#cart-focus-stage");

      const discountBtn = e.target.closest?.(".cart-discount-apply-btn");
      if (discountBtn) {
        e.preventDefault(); e.stopImmediatePropagation();
        if (!inStage) { cart.applyDiscountCode(discountBtn.closest(".cart-discount")); refreshCartViews(); }
        return;
      }
      const recBtn = e.target.closest?.(".cart-recommend-add");
      if (recBtn) {
        e.preventDefault(); e.stopImmediatePropagation();
        if (!inStage) { const product = window.WebBuilderProducts?.getById?.(recBtn.dataset.recProductId); if (product) cart.addItem(product); refreshCartViews(); }
        return;
      }
      const t = e.target.closest?.("[data-cart-id]");
      if (!t || !t.closest("#cart-items-list")) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const id = t.dataset.cartId;
      if (t.classList.contains("cart-item-remove")) cart.removeItem(id);
      else if (t.classList.contains("cart-qty-minus")) cart.changeQty(id, -1);
      else if (t.classList.contains("cart-qty-plus")) cart.changeQty(id, 1);
      refreshCartViews();
    }, true);

    document.addEventListener("change", e => {
      const qtySel = e.target.closest?.(".cart-qty-select[data-cart-id]");
      if (qtySel && qtySel.closest("#cart-items-list")) { cart.updateQty(qtySel.dataset.cartId, parseInt(qtySel.value, 10) || 1); refreshCartViews(); return; }
      const priceInput = e.target.closest?.(".cart-item-price-input[data-cart-id]");
      if (priceInput && priceInput.closest("#cart-items-list")) { cart.updatePrice(priceInput.dataset.cartId, priceInput.value); refreshCartViews(); }
    }, true);

    document.getElementById("close-cart-btn")?.addEventListener("click", e => { e.preventDefault(); e.stopImmediatePropagation(); closeCart(); }, true);
    document.getElementById("cart-drawer-backdrop")?.addEventListener("click", e => { e.preventDefault(); e.stopImmediatePropagation(); closeCart(); }, true);
    document.getElementById("btn-open-cart")?.addEventListener("click", e => { e.preventDefault(); e.stopImmediatePropagation(); openCart(); }, true);

    state.subscribe?.(e => { if (["cart", "products"].includes(e?.domain)) refreshCartViews(); });
    refreshCartViews();
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(bind, 0));

  window.WebBuilderCartRuntime = Object.assign(window.WebBuilderCartRuntime || {}, {
    render: renderCart, refresh: refreshCartViews, open: openCart, close: closeCart
  });
})();
