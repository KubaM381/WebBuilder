// WebBuilder cart runtime
// Takes live ownership of the cart drawer UI while the legacy editor remains loaded.
// Cart data is read/written exclusively through WebBuilderCart.
(() => {
  const state = window.WebBuilderState;
  const cart = window.WebBuilderCart;
  if (!state || !cart) {
    console.error("WebBuilderCartRuntime: required services missing.");
    return;
  }

  let list = null;
  let drawer = null;
  let backdrop = null;
  let badge = null;
  let checkout = null;

  const esc = value => String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  const eur = value => `${Number(value || 0).toFixed(2).replace(".", ",")} €`;

  function getMilestones(subtotal) {
    const config = cart.getConfig() || {};
    const sorted = Array.isArray(config.milestones) ? [...config.milestones].sort((a, b) => Number(a.amount) - Number(b.amount)) : [];
    return { sorted, reached: sorted.filter(m => subtotal >= Number(m.amount || 0)), next: sorted.find(m => subtotal < Number(m.amount || 0)) };
  }

  function render() {
    list = list || document.getElementById("cart-items-list");
    if (!list) return;
    const config = cart.getConfig() || {};
    const items = cart.getItems();
    const subtotal = cart.getSubtotal();
    const { sorted, reached, next } = getMilestones(subtotal);
    let html = "";

    if (config.progressEnabled && sorted.length) {
      const max = Number(sorted[sorted.length - 1].amount || 1);
      const pct = Math.min(100, subtotal / max * 100);
      html += `<div class="cart-progress"><div class="cart-progress-track"><div class="cart-progress-fill" style="width:${pct}%"></div>${sorted.map(m => `<div class="cart-progress-mark ${subtotal >= Number(m.amount) ? "reached" : ""}" style="left:${Math.min(100, Number(m.amount) / max * 100)}%"></div>`).join("")}</div><p class="cart-progress-msg">${next ? `Noch ${eur(Number(next.amount) - subtotal)} bis „${esc(next.label)}“` : "✓ Alle Ziele freigeschaltet"}</p></div>`;
    }

    if (!items.length) {
      html += '<p class="cart-empty-msg">Dein Warenkorb ist leer.</p>';
    } else {
      html += items.map(item => {
        const effective = cart.getEffectivePrice(item);
        const discount = item.discountPrice != null && effective < Number(item.price);
        return `<div class="cart-item cart-item-rounded" data-cart-id="${esc(item.id)}">
          <span class="cart-item-title">${esc(item.icon)} ${esc(item.name)}</span>
          <span class="cart-qty-stepper"><button type="button" class="cart-qty-minus" data-cart-id="${esc(item.id)}">−</button><span>${Number(item.qty) || 1}</span><button type="button" class="cart-qty-plus" data-cart-id="${esc(item.id)}">+</button></span>
          <span>${discount ? `<s>${eur(item.price)}</s> ` : ""}${eur(effective)}</span>
          <button type="button" class="cart-item-remove" data-cart-id="${esc(item.id)}" title="Entfernen">✕</button>
        </div>`;
      }).join("");
    }

    if (config.recommendEnabled && Array.isArray(config.recommendations)) {
      const names = new Set(items.map(item => item.name));
      const recommendation = config.recommendations.find(item => !names.has(item.name));
      if (recommendation) html += `<div class="cart-recommend"><p class="cart-recommend-title">Das könnte dir auch gefallen</p><div class="cart-recommend-card"><span class="cart-recommend-icon">${esc(recommendation.icon || "📦")}</span><span class="cart-recommend-name">${esc(recommendation.name)}</span><span class="cart-recommend-price">${eur(recommendation.price)}</span><button type="button" class="cart-recommend-add" data-rec-id="${esc(recommendation.id)}">+</button></div></div>`;
    }

    const freeShipping = reached.some(m => m.action === "free-shipping");
    const extraDiscount = reached.some(m => m.action === "discount") ? 10 : 0;
    const discountPercent = Number(state.appliedDiscountPercent || 0) + extraDiscount;
    const discountAmount = subtotal * discountPercent / 100;
    const shipping = config.progressEnabled ? (freeShipping ? 0 : 4.95) : 0;
    const total = Math.max(0, subtotal - discountAmount) + shipping;
    html += `<div class="cart-totals"><div class="cart-total-row"><span>Zwischensumme</span><span>${eur(subtotal)}</span></div>${discountAmount ? `<div class="cart-total-row"><span>Rabatt</span><span>−${eur(discountAmount)}</span></div>` : ""}${config.progressEnabled ? `<div class="cart-total-row"><span>Versand</span><span>${shipping ? eur(shipping) : "Kostenlos"}</span></div>` : ""}<div class="cart-total-row cart-total-final"><span>Gesamt</span><span>${eur(total)}</span></div></div>`;
    list.innerHTML = html;
    if (badge) badge.textContent = cart.getCount();
    if (checkout) checkout.textContent = state.cartButtonLabel || "Zur Kasse gehen";
  }

  function history(action) {
    if (window.WebBuilderHistory) window.WebBuilderHistory.arm();
    action();
    if (window.WebBuilderHistory) window.WebBuilderHistory.commit();
    render();
  }

  function handleClick(event) {
    const target = event.target.closest?.("[data-cart-id], [data-rec-id]");
    if (!target) return;
    const id = target.dataset.cartId;
    if (target.classList.contains("cart-item-remove")) {
      event.preventDefault(); event.stopImmediatePropagation();
      history(() => cart.removeItem(id, false));
    } else if (target.classList.contains("cart-qty-minus")) {
      event.preventDefault(); event.stopImmediatePropagation();
      history(() => cart.changeQty(id, -1, false));
    } else if (target.classList.contains("cart-qty-plus")) {
      event.preventDefault(); event.stopImmediatePropagation();
      history(() => cart.changeQty(id, 1, false));
    } else if (target.classList.contains("cart-recommend-add")) {
      event.preventDefault(); event.stopImmediatePropagation();
      const rec = (cart.getConfig().recommendations || []).find(item => item.id === target.dataset.recId);
      if (rec) history(() => cart.addItem(rec, undefined, undefined, undefined, undefined, false));
    }
  }

  function handlePriceInput(event) {
    const input = event.target.closest?.(".cart-item-price-input");
    if (!input) return;
    event.preventDefault(); event.stopImmediatePropagation();
    cart.updatePrice(input.dataset.cartId, input.value, false);
    render();
  }

  function open() { drawer?.classList.add("active"); backdrop?.classList.add("active"); render(); }
  function close() { drawer?.classList.remove("active"); backdrop?.classList.remove("active"); }

  function bind() {
    list = document.getElementById("cart-items-list");
    drawer = document.getElementById("cart-drawer");
    backdrop = document.getElementById("cart-drawer-backdrop");
    badge = document.getElementById("cart-count-badge");
    checkout = document.getElementById("cart-checkout-btn");
    if (!list) return;

    list.addEventListener("click", handleClick, true);
    list.addEventListener("input", handlePriceInput, true);

    document.getElementById("close-cart-btn")?.addEventListener("click", event => { event.preventDefault(); event.stopImmediatePropagation(); close(); }, true);
    backdrop?.addEventListener("click", event => { event.preventDefault(); event.stopImmediatePropagation(); close(); }, true);
    document.getElementById("btn-open-cart")?.addEventListener("click", event => { event.preventDefault(); event.stopImmediatePropagation(); open(); }, true);

    state.subscribe?.(event => { if (event?.domain === "cart" || event?.domain === "products") render(); });
    window.addEventListener("webbuilder:state-change", event => { if (["cart", "products"].includes(event.detail?.domain)) render(); });
    render();
  }

  document.addEventListener("DOMContentLoaded", () => window.setTimeout(bind, 0));
  window.WebBuilderCartRuntime = { render, open, close };
})();
