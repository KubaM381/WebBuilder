// js/shop/cart-html.js
// WebBuilder cart HTML building — pure functions only, no DOM access, no
// event binding, no history/state mutation. Owns the shared positioning
// primitives (wrapLayoutPart/wrapComponent) and the cart-body assembly
// (title, dividers, progress bar, items, recommendation, discount,
// totals incl. shipping, checkout) used identically by the real drawer
// (shop/cart-drawer.js, interactive=false) and the cart focus editor
// stage (shop/cart-editor-stage.js, interactive=true) — both must stay
// pixel-identical apart from editing affordances, so any change here
// affects both. Rendering of a single cart item / recommend card lives
// in shop/cart-item-html.js — no parse-time load-order requirement
// between the two files, each reaches the other only through
// window.WebBuilderCartHtml at runtime (buildCartParts() below calls
// buildItemsHtml()/buildRecommendCardContentHtml() this way). Cart
// data/CRUD lives in shop/cart-data.js (window.WebBuilderCart) — this
// file only reads it. Must load after shop/cart-data.js (reads
// window.WebBuilderCart at top-level parse time).
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCartHtml: WebBuilderState is not available."); return; }
  const cart = window.WebBuilderCart;
  if (!cart) { console.error("WebBuilderCartHtml: WebBuilderCart is not available."); return; }

  const esc = window.WebBuilderUtils.escapeHtml;
  const eur = v => cart.formatCurrency(v);

  // Generic "positioned sub-part" wrapper, shared by cart-item parts
  // (icon/qty/price/remove/description, keyed in
  // cartConfig.itemDisplay.layout) and recommend-card parts (icon/name/
  // price/add, keyed in cartConfig.recommendDisplay.layout — see
  // shop/cart-item-html.js buildRecommendCardContentHtml()). `dataKey` is
  // what's written into data-cart-part / compared against
  // state.cartFocusSelectedPart — recommend parts use a "recommend:"
  // prefix so shop/cart-editor-stage.js can tell the two families of
  // parts apart from the key alone (see its resolveLayoutMap()), without
  // inspecting DOM ancestry.
  function wrapLayoutPart(innerHtml, layoutKey, layoutMap, dataKey, interactive, showFrame) {
    const off = layoutMap[layoutKey] || { x: 0, y: 0 };
    const hasOffset = !!(off.x || off.y);
    if (!interactive && !hasOffset) return innerHtml;
    const frameClass = interactive && showFrame ? " cart-item-part-frame" : "";
    const selectedClass = interactive && state.cartFocusSelectedPart === dataKey ? " cart-item-part-selected" : "";
    const partAttr = interactive ? ` data-cart-part="${dataKey}"` : "";
    return `<span class="cart-item-part${frameClass}${selectedClass}"${partAttr} style="transform:translate(${off.x || 0}px, ${off.y || 0}px);">${innerHtml}</span>`;
  }

  // Wraps a top-level cart block (title / divider / progress bar /
  // discount field / recommendation card / totals / checkout button) in
  // a positionable, selectable wrapper — same "only wrap when needed"
  // rule as wrapLayoutPart() above: outside the editor (interactive=false),
  // a block without a custom offset renders exactly as before (no extra
  // DOM), so projects that never touch the cart editor see zero markup
  // change.
  function wrapComponent(innerHtml, componentKey, interactive) {
    const layout = (cart.getConfig().componentLayout || {})[componentKey] || { x: 0, y: 0 };
    const hasOffset = !!(layout.x || layout.y);
    if (!interactive && !hasOffset) return innerHtml;
    const selectedClass = interactive && state.cartFocusSelectedPart === `component:${componentKey}` ? " cart-component-selected" : "";
    const compAttr = interactive ? ` data-cart-component="${componentKey}"` : "";
    return `<div class="cart-component-wrap${selectedClass}"${compAttr} style="transform:translate(${layout.x || 0}px, ${layout.y || 0}px);">${innerHtml}</div>`;
  }

  // Warenkorb-Titel — a normal, freely positionable component
  // (cartConfig.componentLayout.title), not a fixed header bar. `count`
  // is the summed quantity of the items actually being shown (the real
  // cart's items, or the single synthetic demo item while empty — see
  // shop/cart-editor-stage.js renderFocusStage()), so it renders
  // identically for both the real drawer and the editor's demo preview.
  //
  // cartTitleLabel is free-form text with an optional {anzahl} placeholder
  // (cart-data.js TITLE_COUNT_PLACEHOLDER) for the live count.
  function buildTitleHtml(count, interactive) {
    const config = cart.getConfig() || {};
    const template = config.cartTitleLabel || `Dein Warenkorb (${cart.TITLE_COUNT_PLACEHOLDER})`;
    const cartTitle = template.split(cart.TITLE_COUNT_PLACEHOLDER).join(count);
    const titleHtml = `<h3 class="cart-title-text">${esc(cartTitle)}</h3>`;
    return wrapComponent(titleHtml, "title", interactive);
  }

  // Zur-Kasse-Button — a normal, freely positionable component
  // (cartConfig.componentLayout.checkout), not a fixed footer bar.
  function buildCheckoutHtml(interactive) {
    const config = cart.getConfig() || {};
    const checkoutColor = config.buttonColor || "#4f46e5";
    const checkoutRadius = config.buttonShape === "pill" ? "999px" : (config.buttonShape === "square" ? "0px" : "6px");
    const checkoutHtml = `<button type="button" class="btn btn-primary cart-checkout-button" style="width:100%; background-color:${checkoutColor}; border-radius:${checkoutRadius};">${esc(state.cartButtonLabel || "Zur Kasse gehen")}</button>`;
    return wrapComponent(checkoutHtml, "checkout", interactive);
  }

  // Builds the shared cart body split into its logical blocks (title /
  // dividers / progress / items / recommendation / discount / totals —
  // shipping is a plain row inside totals — / checkout button) instead of
  // a single concatenated string. buildCartHtml() below just joins them
  // in order for the real drawer — the split itself exists so the cart
  // focus editor stage (shop/cart-editor-stage.js renderFocusStage())
  // can place the item block in its own region while the other blocks
  // stay where they are, without duplicating any of this HTML-building
  // logic.
  function buildCartParts(items, opts = {}) {
    const interactive = !!opts.interactive;
    const isDemo = !!opts.isDemo;
    const config = cart.getConfig() || {};
    const milestones = Array.isArray(config.milestones) ? [...config.milestones].sort((a, b) => Number(a.amount) - Number(b.amount)) : [];
    const subtotal = items.reduce((s, i) => s + cart.getEffectivePrice(i) * (Number(i.qty) || 0), 0);
    // Summed quantity of the items actually being shown — works
    // identically for the real cart (matches cart.getCount()) and for the
    // synthetic demo item used in the editor while the real cart is empty.
    const count = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);

    const titlePart = buildTitleHtml(count, interactive);

    // Freely placeable divider lines (cartConfig.dividers). Each one is
    // its own component ("divider:<id>") with its own componentLayout
    // offset, so it can be dragged anywhere inside the cart body. Their
    // natural flow position is the top of the body; the stored offset
    // moves them from there.
    const dividersPart = (Array.isArray(config.dividers) ? config.dividers : [])
      .map(divider => wrapComponent(`<div class="cart-divider"><span class="cart-divider-line"></span></div>`, `divider:${divider.id}`, interactive))
      .join("");

    let progressPart = "";
    if (config.progressEnabled && milestones.length) {
      const max = Number(milestones[milestones.length - 1].amount || 1);
      const pct = Math.min(100, subtotal / max * 100);
      const next = milestones.find(m => subtotal < Number(m.amount));
      const reachedNow = milestones.filter(m => subtotal >= Number(m.amount || 0));
      const rewardsHtml = reachedNow.length ? `<div class="cart-milestone-rewards">${reachedNow.map(m => `<span class="cart-milestone-reward" title="${esc(m.label)}">${esc(m.icon || "🎉")}</span>`).join("")}</div>` : "";
      const barColor = config.progressBarColor || "#10b981";
      const highestReached = reachedNow[reachedNow.length - 1];
      let progressMsg;
      if (next) {
        progressMsg = `Noch ${eur(Number(next.amount) - subtotal)} bis „${esc(next.label)}“`;
      } else if (highestReached && highestReached.reachedText) {
        progressMsg = esc(highestReached.reachedText);
      } else {
        progressMsg = esc(config.progressCompleteText || "✓ Alle Ziele freigeschaltet");
      }
      const marksHtml = milestones.map(m => {
        const isReached = subtotal >= Number(m.amount);
        const colorStyle = isReached ? ` background-color:${barColor}; border-color:${barColor};` : "";
        return `<div class="cart-progress-mark ${isReached ? "reached" : ""}" style="left:${Math.min(100, (Number(m.amount) / max) * 100)}%;${colorStyle}" title="${esc(m.label)}"></div>`;
      }).join("");
      const progressHtml = `<div class="cart-progress"><div class="cart-progress-track"><div class="cart-progress-fill" style="width:${pct}%; background-color:${barColor};"></div>${marksHtml}</div>${rewardsHtml}<p class="cart-progress-msg">${progressMsg}</p></div>`;
      progressPart = wrapComponent(progressHtml, "progress", interactive);
    }

    // The item list sits in a fixed-height, internally scrolling box
    // (.cart-items-box, height set in css/modals.css) so that
    // adding/removing items never changes the box's own flow height —
    // otherwise every component positioned below it (progress bar,
    // recommendation, discount field, totals, checkout button) would
    // visibly shift up/down each time the cart's item count changes.
    const itemsInner = window.WebBuilderCartHtml.buildItemsHtml(items, isDemo, interactive);
    const itemsPart = `<div class="cart-items-box">${itemsInner}</div><div class="cart-items-box-divider"></div>`;

    let recommendPart = "";
    if (config.recommendEnabled) {
      const recShapeClass = "cart-recommend-card-" + (config.recommendShape === "square" ? "square" : (config.recommendShape === "pill" ? "pill" : "rounded"));
      const picked = cart.pickRecommendation(items, subtotal, { isDemo });
      if (picked) {
        const { rec, product } = picked;
        const recHtml = `<div class="cart-recommend"><p class="cart-recommend-title">${esc(rec.text || cart.defaultRecommendationText())}</p><div class="cart-recommend-card ${recShapeClass}">${window.WebBuilderCartHtml.buildRecommendCardContentHtml(product, interactive)}</div></div>`;
        recommendPart = wrapComponent(recHtml, "recommend", interactive);
      } else if (interactive) {
        const dummyHtml = `<div class="cart-recommend"><p class="cart-recommend-title">${esc(cart.defaultRecommendationText())}</p><div class="cart-recommend-card ${recShapeClass}"><span class="cart-recommend-icon">➕</span><span class="cart-recommend-name">Noch keine passende Empfehlung konfiguriert</span></div></div>`;
        recommendPart = wrapComponent(dummyHtml, "recommend", interactive);
      }
    }

    let discountPart = "";
    if (config.discountEnabled) {
      const discColor = config.discountButtonColor || "#4f46e5";
      const discRadius = config.discountButtonShape === "pill" ? "999px" : (config.discountButtonShape === "square" ? "0px" : "6px");
      const discountHtml = `<div class="cart-discount"><input type="text" class="cart-discount-input" placeholder="Rabattcode (Demo: DEMO10)"${interactive ? " readonly" : ""}><button type="button" class="cart-discount-apply-btn" style="background-color:${discColor}; border-radius:${discRadius};">Anwenden</button>${state.appliedDiscountLabel ? `<p class="cart-discount-msg ok">${esc(state.appliedDiscountLabel)}</p>` : ""}</div>`;
      discountPart = wrapComponent(discountHtml, "discount", interactive);
    }

    const reached = milestones.filter(m => subtotal >= Number(m.amount || 0));
    const shippingThreshold = config.shippingFreeThreshold;
    const free = reached.some(m => m.action === "free-shipping") || (shippingThreshold != null && subtotal >= Number(shippingThreshold));
    const discountThreshold = config.milestoneDiscountThreshold;
    const milestoneDiscountActive = reached.some(m => m.action === "discount") || (discountThreshold != null && subtotal >= Number(discountThreshold));
    const configuredDiscountPercent = Number(config.milestoneDiscountPercent);
    const extra = milestoneDiscountActive ? (Number.isFinite(configuredDiscountPercent) ? configuredDiscountPercent : 10) : 0;
    const discountPercent = Number(state.appliedDiscountPercent || 0) + extra;
    const discountAmount = subtotal * discountPercent / 100;
    const shippingCost = Number(config.shippingCost);
    const shipping = config.progressEnabled ? (free ? 0 : (Number.isFinite(shippingCost) ? shippingCost : 4.95)) : 0;
    const total = Math.max(0, subtotal - discountAmount) + shipping;

    const subtotalLabel = esc(config.subtotalLabel || "Zwischensumme");
    const discountLabel = esc(config.discountLabel || "Rabatt");
    const shippingLabel = esc(config.shippingLabel || "Versand");
    const shippingFreeText = esc(config.shippingFreeText || "Kostenlos");
    const totalLabel = esc(config.totalLabel || "Gesamt");

    const shippingRowHtml = config.progressEnabled
      ? `<div class="cart-total-row"><span>${shippingLabel}</span><span>${shipping === 0 ? shippingFreeText : eur(shipping)}</span></div>`
      : "";

    let totalsHtml = `<div class="cart-totals"><div class="cart-total-row"><span>${subtotalLabel}</span><span>${eur(subtotal)}</span></div>`;
    if (discountAmount > 0) totalsHtml += `<div class="cart-total-row"><span>${discountLabel}</span><span>−${eur(discountAmount)}</span></div>`;
    totalsHtml += shippingRowHtml;
    if (reached.some(m => m.action === "free-product")) totalsHtml += `<div class="cart-total-row"><span>${esc(config.freeProductLabel || "🎁 Gratis-Produkt")}</span><span>${esc(config.freeProductValueText || "freigeschaltet")}</span></div>`;
    totalsHtml += `<div class="cart-total-row cart-total-final"><span>${totalLabel}</span><span>${eur(total)}</span></div></div>`;
    const totalsPart = wrapComponent(totalsHtml, "totals", interactive);

    const checkoutPart = buildCheckoutHtml(interactive);

    return { title: titlePart, dividers: dividersPart, progress: progressPart, items: itemsPart, recommend: recommendPart, discount: discountPart, totals: totalsPart, checkout: checkoutPart };
  }

  // Builds the shared cart body as one concatenated string, in the same
  // order the editor stage shows it. Used by the real drawer
  // (shop/cart-drawer.js, interactive: false). The cart focus editor
  // stage uses buildCartParts() directly instead (see above).
  function buildCartHtml(items, opts = {}) {
    const parts = buildCartParts(items, opts);
    return parts.title + parts.dividers + parts.progress + parts.items + parts.recommend + parts.discount + parts.totals + parts.checkout;
  }

  window.WebBuilderCartHtml = Object.assign(window.WebBuilderCartHtml || {}, {
    wrapLayoutPart, wrapComponent, buildTitleHtml, buildCheckoutHtml,
    buildCartParts, buildCartHtml
  });

  // buildCartHtml/buildCartParts are also part of the public
  // window.WebBuilderCartRuntime API (used by shop/cart-editor-stage.js)
  // — kept there via Object.assign so load order relative to
  // shop/cart-drawer.js (which adds render/refresh/open/close to the
  // same object) doesn't matter.
  window.WebBuilderCartRuntime = Object.assign(window.WebBuilderCartRuntime || {}, { buildCartHtml, buildCartParts });
})();
