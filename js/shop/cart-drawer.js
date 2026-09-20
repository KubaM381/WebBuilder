// js/shop/cart-drawer.js
// WebBuilder cart drawer — owns the real slide-in cart drawer
// (#cart-drawer/#cart-items-list): rendering, open/close, and all click/
// change interactions inside it (discount code, add recommended product,
// quantity/price/remove per item). HTML building lives in
// shop/cart-html.js (window.WebBuilderCartHtml) — this file only mounts
// it into the DOM and wires up interaction. Left-sidebar config UI lives
// in shop/cart-sidebar.js. Cart data/CRUD lives in shop/cart-data.js.
// Must load after shop/cart-data.js and shop/cart-html.js.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCartDrawer: WebBuilderState is not available."); return; }
  const cart = window.WebBuilderCart;
  if (!cart) { console.error("WebBuilderCartDrawer: WebBuilderCart is not available."); return; }

  // Sizes the products list so the whole cart fits inside its visible
  // viewport without the viewport itself needing to scroll — the
  // products area is what grows or shrinks to make room for whatever
  // else is currently shown. It only scrolls internally, once it has
  // already shrunk to a single product's height and there still isn't
  // room for all of them.
  //
  // `scrollHost` is the actual scrollable viewport (the drawer body for
  // the real drawer, `.canvas-container` for the editor stage);
  // `contentRoot` is the element whose full rendered content should fit
  // inside it (the same element as scrollHost for the drawer; the
  // `.cart-focus-card` for the editor).
  function applyFit(scrollHost, contentRoot) {
    const box = contentRoot?.querySelector(".cart-items-box");
    if (!scrollHost || !contentRoot || !box) return;

    // contentRoot can carry its own CSS min-height (`.cart-focus-card` in
    // the editor, so a near-empty cart doesn't look tiny) — combined with
    // its flex-direction:column layout, that min-height stretches the
    // body below it too, which would make "how tall is everything besides
    // the box" measure far more than the content actually needs.
    // Neutralized here for the duration of the measurement only.
    const prevMinHeight = contentRoot.style.minHeight;
    contentRoot.style.minHeight = "0px";

    box.style.height = "auto";
    box.style.overflowY = "hidden";
    const naturalHeight = box.scrollHeight;
    const otherHeight = Math.max(0, contentRoot.scrollHeight - naturalHeight);
    const hostVisible = scrollHost.clientHeight;
    const hostRect = scrollHost.getBoundingClientRect();
    const contentRect = contentRoot.getBoundingClientRect();
    const topOffset = Math.max(0, (contentRect.top - hostRect.top) + scrollHost.scrollTop);

    contentRoot.style.minHeight = prevMinHeight;

    if (!hostVisible) { box.style.height = naturalHeight + "px"; return; }

    const bottomBreathingRoom = 12;
    const available = Math.max(0, hostVisible - topOffset - otherHeight - bottomBreathingRoom);
    const min = cart.ITEMS_BOX_ITEM_HEIGHT;
    const desired = Math.max(min, Math.min(naturalHeight, available));
    box.style.height = desired + "px";
    box.style.overflowY = naturalHeight > desired + 1 ? "auto" : "hidden";
  }

  // Runs the fit twice: immediately (instant feedback) and once more on
  // the next animation frame, to also catch any layout that only settles
  // a frame later (e.g. a web font swapping in and changing text height).
  function fitItemsBox(scrollHost, contentRoot) {
    applyFit(scrollHost, contentRoot);
    requestAnimationFrame(() => applyFit(scrollHost, contentRoot));
  }

  // Re-fits both the real drawer and — if open — the editor stage. Used
  // after a window resize, since either viewport's available height may
  // have changed.
  function refitAll() {
    const list = document.getElementById("cart-items-list");
    if (list) fitItemsBox(list, list);
    const stage = document.getElementById("cart-focus-stage");
    const host = document.querySelector(".canvas-container");
    const card = stage?.querySelector(".cart-focus-card");
    if (host && card) fitItemsBox(host, card);
  }

  // Renders the real slide-in drawer (#cart-items-list, always
  // non-interactive). Title and checkout button are built into
  // buildCartHtml() itself (see shop/cart-html.js) — no separate header/
  // footer bar elements to update by id.
  function renderCart() {
    const list = document.getElementById("cart-items-list");
    if (!list) return;
    const buildCartHtml = window.WebBuilderCartHtml?.buildCartHtml;
    list.innerHTML = buildCartHtml ? buildCartHtml(cart.getItems(), { interactive: false, isDemo: false }) : "";
    fitItemsBox(list, list);
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

  let resizeQueued = false;
  function scheduleRefit() {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; refitAll(); });
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
    window.addEventListener("resize", scheduleRefit);

    state.subscribe?.(e => { if (["cart", "products"].includes(e?.domain)) refreshCartViews(); });
    refreshCartViews();
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(bind, 0));

  window.WebBuilderCartRuntime = Object.assign(window.WebBuilderCartRuntime || {}, {
    render: renderCart, refresh: refreshCartViews, open: openCart, close: closeCart, fitItemsBox, refitAll
  });
})();
