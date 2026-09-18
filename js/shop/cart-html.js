// js/shop/cart-html.js
// WebBuilder cart HTML building — pure functions only, no DOM access, no
// event binding, no history/state mutation. Builds the shared cart body
// (title, dividers, progress bar, items, product segments, recommendation,
// discount, totals incl. shipping, checkout button) used identically by
// the real drawer (shop/cart-drawer.js, interactive=false) and the cart
// focus editor stage (shop/cart-editor.js, interactive=true) — both must
// stay pixel-identical apart from editing affordances, so any change here
// affects both. Split out of the former shop/cart-render.js (see
// docs/STRUCTURE_PLAN.md Phase 2). Cart data/CRUD lives in
// shop/cart-data.js (window.WebBuilderCart) — this file only reads it.
// Must load after shop/cart-data.js (reads window.WebBuilderCart at
// top-level parse time).
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
  // buildRecommendCardContentHtml() below). `dataKey` is what's written
  // into data-cart-part / compared against state.cartFocusSelectedPart —
  // recommend parts use a "recommend:" prefix so shop/cart-editor.js can
  // tell the two families of parts apart from the key alone (see its
  // resolveLayoutMap()), without inspecting DOM ancestry. `showFrame` only
  // ever applies to item parts on a transparent item shape (see
  // buildCartItemHTML) — recommend parts never show the dashed frame.
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
  // discount field / recommendation card / totals / checkout button) in a
  // positionable, selectable wrapper — same "only wrap when needed" rule
  // as wrapLayoutPart() above: outside the editor (interactive=false), a
  // block without a custom offset renders exactly as before (no extra
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
  // shop/cart-editor.js renderFocusStage()), so it renders identically
  // for both the real drawer and the editor's demo preview.
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

  // Builds the recommend card's inner content (icon/name/price/+ button),
  // each individually positionable via cartConfig.recommendDisplay.layout
  // — same mechanism as buildCartItemHTML's per-part offsets, just
  // against a separate layout map (the recommend card isn't a cart item,
  // so it can't share itemDisplay.layout). The "+" button's color comes
  // from cartConfig.recommendAddButtonColor.
  function buildRecommendCardContentHtml(product, interactive) {
    const config = cart.getConfig() || {};
    const layout = (config.recommendDisplay || {}).layout || {};
    const addColor = config.recommendAddButtonColor || "#4f46e5";
    const iconHtml = wrapLayoutPart(`<span class="cart-recommend-icon">${esc(product.icon || "📦")}</span>`, "icon", layout, "recommend:icon", interactive, false);
    const nameHtml = wrapLayoutPart(`<span class="cart-recommend-name">${esc(product.name)}</span>`, "name", layout, "recommend:name", interactive, false);
    const priceHtml = wrapLayoutPart(`<span class="cart-recommend-price">${eur(product.discountPrice != null ? product.discountPrice : product.price)}</span>`, "price", layout, "recommend:price", interactive, false);
    const addHtml = wrapLayoutPart(`<button type="button" class="cart-recommend-add" data-rec-product-id="${esc(product.id)}" style="background-color:${addColor};">+</button>`, "add", layout, "recommend:add", interactive, false);
    return `${iconHtml}${nameHtml}${priceHtml}${addHtml}`;
  }

  // Builds one cart-row's HTML, based on cartConfig.itemShape/itemDisplay.
  // `interactive` is only true inside the cart editor stage: it adds
  // click/drag affordances and (on a transparent item shape) a dashed
  // frame around each sub-part. The per-part pixel offset
  // (cartConfig.itemDisplay.layout) itself is applied unconditionally, so
  // positioning changes made in the editor also show up in the real
  // drawer/preview, not just on stage. Same for the whole-article
  // background/width/height overrides (cartConfig.itemBackgroundColor/
  // itemWidth/itemMinHeight, "Artikel-Darstellung") below.
  function buildCartItemHTML(item, isDemo, interactive = false) {
    const config = cart.getConfig() || {};
    const disp = config.itemDisplay || {};
    const layout = disp.layout || {};
    const idAttr = isDemo ? "" : ` data-cart-id="${esc(item.id)}"`;
    const transparent = config.itemShape === "transparent";

    function wrapPart(innerHtml, partKey) {
      return wrapLayoutPart(innerHtml, partKey, layout, partKey, interactive, transparent);
    }

    let removeInner = "✕";
    if (disp.removeStyle === "trash") removeInner = "🗑️";
    if (disp.removeStyle === "text") removeInner = "Entfernen";
    const removeShapeClass = disp.removeShape === "circle" ? "remove-shape-circle" : (disp.removeShape === "square" ? "remove-shape-square" : "");
    const removeBtn = wrapPart(`<button type="button" class="cart-item-remove ${removeShapeClass}"${idAttr} title="Entfernen" style="color:${config.removeButtonColor || "#ef4444"};">${removeInner}</button>`, "remove");

    // Quantity selector variants. "stepper" = individual +/- blocks
    // (unchanged default look), "group" = one connected control with a
    // configurable border-radius. Both draw the +/- color from the same
    // closed palette (cart.quantityColorHex()) so switching variants
    // keeps the chosen color.
    const qtyColor = cart.quantityColorHex(disp.quantityButtonColor);
    let qtyHtml;
    if (disp.quantityStyle === "dropdown") {
      const opts = Array.from({ length: 10 }, (_, i) => i + 1).map(n => `<option value="${n}" ${n === Number(item.qty) ? "selected" : ""}>${n}</option>`).join("");
      qtyHtml = `<select class="cart-qty-select"${idAttr}>${opts}</select>`;
    } else if (disp.quantityStyle === "static") {
      qtyHtml = `<span class="cart-qty-static">× ${Number(item.qty) || 1}</span>`;
    } else if (disp.quantityStyle === "group") {
      const groupShapeClass = "cart-qty-group-" + (disp.quantityGroupShape === "square" ? "square" : (disp.quantityGroupShape === "pill" ? "pill" : "rounded"));
      qtyHtml = `<span class="cart-qty-group ${groupShapeClass}" style="border-color:${qtyColor}; color:${qtyColor};"><button type="button" class="cart-qty-minus cart-qty-group-btn"${idAttr}>−</button><span class="cart-qty-group-value">${Number(item.qty) || 1}</span><button type="button" class="cart-qty-plus cart-qty-group-btn"${idAttr}>+</button></span>`;
    } else {
      qtyHtml = `<span class="cart-qty-stepper"><button type="button" class="cart-qty-minus" style="border-color:${qtyColor}; color:${qtyColor};"${idAttr}>−</button><span>${Number(item.qty) || 1}</span><button type="button" class="cart-qty-plus" style="border-color:${qtyColor}; color:${qtyColor};"${idAttr}>+</button></span>`;
    }
    qtyHtml = wrapPart(qtyHtml, "qty");

    const effective = cart.getEffectivePrice(item);
    const hasDiscount = item.discountPrice != null && effective < Number(item.price || 0);
    let priceHtml;
    if (disp.priceStyle === "strikethrough" && hasDiscount) {
      priceHtml = `<span><s class="cart-item-price-strike">${eur(item.price)}</s> ${eur(effective)}</span>`;
    } else if (disp.priceStyle === "perUnit") {
      priceHtml = `<span>${eur(effective)} / Stk · Summe ${eur(effective * (Number(item.qty) || 1))}</span>`;
    } else if (isDemo || interactive) {
      // Im Warenkorb-Editor wird der Preis nie als editierbares <input>
      // gerendert, sondern rein informativ als <span> — analog zum
      // Demo-Artikel bei leerem Warenkorb.
      priceHtml = `<span>${hasDiscount ? `<s class="cart-item-price-strike">${eur(item.price)}</s> ` : ""}${eur(effective)}</span>`;
    } else {
      priceHtml = `<input type="number" class="cart-item-price-input" data-cart-id="${esc(item.id)}" value="${Number(item.price || 0).toFixed(2)}" step="0.01" />`;
    }
    priceHtml = wrapPart(priceHtml, "price");

    const titleHtml = wrapPart(`<span class="cart-item-title">${item.icon ? esc(item.icon) + " " : ""}${esc(item.name)}</span>`, "icon");
    const descHtml = disp.showDescription && item.description ? wrapPart(`<div class="cart-item-desc">${esc(item.description)}</div>`, "description") : "";
    const shapeClass = "cart-item-" + (config.itemShape || "rounded");

    // "Artikel-Darstellung": custom background/size, applied everywhere
    // (drawer + editor). Empty/null (the default) means "use the shape
    // class's own look", so untouched projects render byte-identical to
    // before.
    let itemStyle = "";
    if (config.itemBackgroundColor) itemStyle += `background-color:${config.itemBackgroundColor};`;
    if (config.itemWidth) itemStyle += `width:${Number(config.itemWidth)}px;`;
    if (config.itemMinHeight) itemStyle += `min-height:${Number(config.itemMinHeight)}px;`;
    const styleAttr = itemStyle ? ` style="${itemStyle}"` : "";

    // Selecting "Artikel-Darstellung" (component:itemRepresentation) shows
    // a resize handle directly on the article in the editor stage — same
    // interaction style as header-footer's bar resize handle.
    const itemRepSelected = interactive && state.cartFocusSelectedPart === "component:itemRepresentation";
    const itemRepSelectedClass = itemRepSelected ? " cart-component-selected" : "";
    const resizeHandle = itemRepSelected ? `<span class="cart-item-resize-handle" title="Größe ziehen"></span>` : "";

    return `<div class="cart-item ${shapeClass}${itemRepSelectedClass}"${idAttr}${styleAttr}>
      ${titleHtml}
      ${qtyHtml}
      ${priceHtml}
      ${removeBtn}
      ${descHtml}
      ${resizeHandle}
    </div>`;
  }

  // Groups the cart's item rows by configured segment (cartConfig.segments,
  // see shop/cart-data.js), in segment-config order, then any items that
  // don't belong to a segment follow at the end in their original order.
  // Each non-empty segment is wrapped in a plain <div data-segment-id="...">
  // (no styling of its own) and optionally followed by a static divider
  // line (segment.showDivider). Separate from cartConfig.dividers (the
  // freely draggable, user-placed lines from wrapComponent()) — a segment
  // divider is static and always sits right after its segment's items.
  function buildItemsHtml(items, isDemo, interactive, config) {
    if (!items.length) return '<p class="cart-empty-msg">Dein Warenkorb ist leer.</p>';
    const showItemDividers = config.itemShape === "transparent" && !!(config.itemDisplay || {}).showItemDividers;
    function renderRun(runItems) {
      return runItems.map((item, idx) => (showItemDividers && idx > 0 ? '<div class="cart-item-divider"></div>' : "") + buildCartItemHTML(item, isDemo, interactive)).join("");
    }
    const segments = Array.isArray(config.segments) ? config.segments.filter(s => (s.productIds || []).length) : [];
    if (!segments.length) return renderRun(items);

    const remaining = items.slice();
    let html = "";
    segments.forEach(segment => {
      const ids = new Set(segment.productIds);
      const groupItems = remaining.filter(item => item.productId && ids.has(item.productId));
      if (!groupItems.length) return;
      groupItems.forEach(item => {
        const idx = remaining.indexOf(item);
        if (idx > -1) remaining.splice(idx, 1);
      });
      html += `<div class="cart-segment" data-segment-id="${esc(segment.id)}">${renderRun(groupItems)}</div>`;
      if (segment.showDivider) html += '<div class="cart-item-divider"></div>';
    });
    html += renderRun(remaining);
    return html;
  }

  // Builds the shared cart body split into its logical blocks (title /
  // dividers / progress / items / recommendation / discount / totals —
  // shipping is a plain row inside totals — / checkout button) instead of
  // a single concatenated string. buildCartHtml() below just joins them
  // in order for the real drawer — the split itself exists so the cart
  // focus editor stage (shop/cart-editor.js renderFocusStage()) can place
  // the item block in its own region while the other blocks stay where
  // they are, without duplicating any of this HTML-building logic.
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
      // Solange ein weiterer Meilenstein fehlt: "Noch X bis Label". Ist
      // der höchste Meilenstein erreicht (kein "next" mehr), zeigt sein
      // optionales `reachedText` eine individuelle Erfolgsmeldung statt
      // des generischen Standardtextes.
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

    // Bounded "products box" (cartConfig.itemsListMaxHeight): when set,
    // the item list gets its own max-height + internal scrollbar, so a
    // long product list never pushes the discount field/recommendation/
    // Kosten-Übersicht/checkout button out of view. The box itself carries
    // no visible chrome; the divider right after it is the one visible
    // separation from the rest of the cart, always shown.
    const itemsInner = buildItemsHtml(items, isDemo, interactive, config);
    const maxHeight = Number(config.itemsListMaxHeight);
    const boxStyle = Number.isFinite(maxHeight) && maxHeight > 0 ? ` style="max-height:${maxHeight}px; overflow-y:auto; overflow-x:hidden;"` : "";
    const itemsPart = `<div class="cart-items-box"${boxStyle}>${itemsInner}</div><div class="cart-items-box-divider"></div>`;

    let recommendPart = "";
    if (config.recommendEnabled) {
      const recShapeClass = "cart-recommend-card-" + (config.recommendShape === "square" ? "square" : (config.recommendShape === "pill" ? "pill" : "rounded"));
      // opts.isDemo durchreichen, damit der synthetische Demo-Artikel
      // (leerer Warenkorb, siehe shop/cart-editor.js renderFocusStage())
      // in pickRecommendation() nicht fälschlich als "schon im Warenkorb"
      // gezählt wird — siehe shop/cart-data.js pickRecommendation().
      const picked = cart.pickRecommendation(items, subtotal, { isDemo });
      if (picked) {
        const { rec, product } = picked;
        const recHtml = `<div class="cart-recommend"><p class="cart-recommend-title">${esc(rec.text || cart.defaultRecommendationText())}</p><div class="cart-recommend-card ${recShapeClass}">${buildRecommendCardContentHtml(product, interactive)}</div></div>`;
        recommendPart = wrapComponent(recHtml, "recommend", interactive);
      } else if (interactive) {
        // If recommendations are enabled but nothing is configured / no
        // condition matches, there's otherwise nothing to click in the
        // editor to reach the recommendation panel (component:recommend).
        // This dummy card appears ONLY in the interactive editor mode.
        const dummyHtml = `<div class="cart-recommend"><p class="cart-recommend-title">${esc(cart.defaultRecommendationText())}</p><div class="cart-recommend-card ${recShapeClass}"><span class="cart-recommend-icon">➕</span><span class="cart-recommend-name">Noch keine passende Empfehlung konfiguriert</span></div></div>`;
        recommendPart = wrapComponent(dummyHtml, "recommend", interactive);
      }
    }

    let discountPart = "";
    if (config.discountEnabled) {
      const discColor = config.discountButtonColor || "#4f46e5";
      const discRadius = config.discountButtonShape === "pill" ? "999px" : (config.discountButtonShape === "square" ? "0px" : "6px");
      // Im Warenkorb-Editor (interactive) ist das Feld rein optisch/
      // verschiebbar — readonly, damit man dort nicht versehentlich einen
      // Code eintippt, der ohnehin nirgends ausgewertet wird.
      const discountHtml = `<div class="cart-discount"><input type="text" class="cart-discount-input" placeholder="Rabattcode (Demo: DEMO10)"${interactive ? " readonly" : ""}><button type="button" class="cart-discount-apply-btn" style="background-color:${discColor}; border-radius:${discRadius};">Anwenden</button>${state.appliedDiscountLabel ? `<p class="cart-discount-msg ok">${esc(state.appliedDiscountLabel)}</p>` : ""}</div>`;
      discountPart = wrapComponent(discountHtml, "discount", interactive);
    }

    const reached = milestones.filter(m => subtotal >= Number(m.amount || 0));
    // Shipping is free via a "free-shipping" milestone OR via the
    // standalone shippingFreeThreshold — either applies independently,
    // kept in sync in both directions (cart.syncFreeShippingMilestone() in
    // cart-data.js, plus the reverse sync in shop/cart-sidebar.js
    // renderMilestoneList()), but a threshold works on its own even with
    // no milestone at all.
    const shippingThreshold = config.shippingFreeThreshold;
    const free = reached.some(m => m.action === "free-shipping") || (shippingThreshold != null && subtotal >= Number(shippingThreshold));
    // Spiegelbild davon: der Extra-Rabatt gilt über einen erreichten
    // Meilenstein mit action "discount" ODER über das eigenständige
    // milestoneDiscountThreshold — beides wirkt unabhängig voneinander.
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

    // Shipping is a plain row inside the totals block, not its own
    // draggable component. Still only rendered while progressEnabled.
    const shippingRowHtml = config.progressEnabled
      ? `<div class="cart-total-row"><span>${shippingLabel}</span><span>${shipping === 0 ? shippingFreeText : eur(shipping)}</span></div>`
      : "";

    let totalsHtml = `<div class="cart-totals"><div class="cart-total-row"><span>${subtotalLabel}</span><span>${eur(subtotal)}</span></div>`;
    if (discountAmount > 0) totalsHtml += `<div class="cart-total-row"><span>${discountLabel}</span><span>−${eur(discountAmount)}</span></div>`;
    totalsHtml += shippingRowHtml;
    // "Gratis-Produkt"-Zeile — Label und Wert-Text kommen aus
    // cartConfig.freeProductLabel/-ValueText, sichtbar nur wenn ein
    // Meilenstein mit action "free-product" erreicht ist.
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

  window.WebBuilderCartHtml = {
    wrapLayoutPart, wrapComponent, buildTitleHtml, buildCheckoutHtml,
    buildRecommendCardContentHtml, buildCartItemHTML, buildItemsHtml,
    buildCartParts, buildCartHtml
  };

  // buildCartHtml/buildCartParts are also part of the public
  // window.WebBuilderCartRuntime API (used by shop/cart-editor.js and
  // previously exposed from the former shop/cart-render.js) — kept there
  // via Object.assign so load order relative to shop/cart-drawer.js (which
  // adds render/refresh/open/close to the same object) doesn't matter.
  window.WebBuilderCartRuntime = Object.assign(window.WebBuilderCartRuntime || {}, { buildCartHtml, buildCartParts });
})();
