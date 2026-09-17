// js/shop/cart-render.js
// WebBuilder cart rendering domain
// Builds the shared cart HTML (title, dividers, progress bar, items,
// product segments, recommendation, discount, totals incl. shipping,
// checkout button) and owns the real slide-in drawer plus the sidebar
// config toggles (including the items-list max height and product-segment
// management, both configured from the LEFT sidebar rather than the
// right-hand cart editor panel, since neither ties to selecting a
// specific on-canvas part). Used by both the drawer (interactive=false)
// and the cart editor stage in cart-editor.js (interactive=true), so both
// stay pixel-identical apart from editing affordances. Cart data/CRUD
// lives in cart-data.js (window.WebBuilderCart) — this file only reads it.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCartRender: WebBuilderState is not available."); return; }
  const cart = window.WebBuilderCart;
  if (!cart) { console.error("WebBuilderCartRender: WebBuilderCart is not available."); return; }

  // esc for HTML-escaping. eur() delegates to the shared, configurable
  // formatter (cart-data.js WebBuilderCart.formatCurrency, cartConfig.currency)
  // instead of hardcoding "€" — every call site below is unchanged.
  const esc = window.WebBuilderUtils.escapeHtml;
  const eur = v => cart.formatCurrency(v);

  // Generic "positioned sub-part" wrapper, shared by cart-item parts
  // (icon/qty/price/remove/description, keyed in
  // cartConfig.itemDisplay.layout) and recommend-card parts (icon/name/
  // price/add, keyed in cartConfig.recommendDisplay.layout — see
  // buildRecommendCardContentHtml() below). `dataKey` is what's written
  // into data-cart-part / compared against state.cartFocusSelectedPart —
  // recommend parts use a "recommend:" prefix so cart-editor.js can tell
  // the two families of parts apart from the key alone (see
  // js/shop/cart-editor.js resolveLayoutMap()), without inspecting DOM
  // ancestry. `showFrame` only ever applies to item parts on a
  // transparent item shape (see buildCartItemHTML) — recommend parts
  // never show the dashed frame.
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
  // as wrapPart() inside buildCartItemHTML(): outside the editor
  // (interactive=false), a block without a custom offset renders exactly
  // as before (no extra DOM), so projects that never touch the cart
  // editor see zero markup change.
  function wrapComponent(innerHtml, componentKey, interactive) {
    const layout = (cart.getConfig().componentLayout || {})[componentKey] || { x: 0, y: 0 };
    const hasOffset = !!(layout.x || layout.y);
    if (!interactive && !hasOffset) return innerHtml;
    const selectedClass = interactive && state.cartFocusSelectedPart === `component:${componentKey}` ? " cart-component-selected" : "";
    const compAttr = interactive ? ` data-cart-component="${componentKey}"` : "";
    return `<div class="cart-component-wrap${selectedClass}"${compAttr} style="transform:translate(${layout.x || 0}px, ${layout.y || 0}px);">${innerHtml}</div>`;
  }

  // Warenkorb-Titel. Used to live in a fixed, non-positionable header bar
  // (component:header) with its own close icon — now it's just another
  // top-level component like progress/discount/etc., positioned via
  // cartConfig.componentLayout.title through the shared wrapComponent()
  // helper above. `count` is the summed quantity of the items actually
  // being shown (the real cart's items, or the single synthetic demo
  // item's own qty while the cart is empty — see cart-editor.js
  // renderFocusStage()), so it renders identically for both the real
  // drawer and the editor's demo preview.
  function buildTitleHtml(count, interactive) {
    const config = cart.getConfig() || {};
    const cartTitle = config.cartTitleLabel || "Dein Warenkorb";
    const titleHtml = `<h3 class="cart-title-text">${esc(cartTitle)} (${count})</h3>`;
    return wrapComponent(titleHtml, "title", interactive);
  }

  // Zur-Kasse-Button. Used to live in a fixed, non-positionable footer bar
  // (component:footer) with its own background-color setting — now it's
  // just another top-level component like totals/discount/etc., flowing
  // and positionable via cartConfig.componentLayout.checkout (T4), just
  // without the surrounding bar.
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
  // from cartConfig.recommendAddButtonColor (default matches the previous
  // hardcoded CSS color, see css/modals.css .cart-recommend-add).
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

    // Delegates to the shared wrapLayoutPart() helper, keyed against this
    // item's own layout map (cartConfig.itemDisplay.layout) — call sites
    // below (wrapPart(x, "remove")/("qty")/("price")/("icon")/
    // ("description")) are unchanged.
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
      // interactive (Warenkorb-Editor): der Preis wird dort NIE als
      // editierbares <input> gerendert, sondern rein informativ als
      // <span> — analog zum Demo-Artikel bei leerem Warenkorb.
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
    // interaction style as header-footer.js's bar resize handle.
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

  // Groups the cart's item rows by configured segment
  // (cartConfig.segments, see cart-data.js), in segment-config order,
  // then any items that don't belong to a segment follow at the end
  // in their original order. Each non-empty segment is wrapped in a
  // plain <div data-segment-id="..."> (no styling of its own — the
  // grouping itself is invisible) and optionally followed by a static
  // divider line (segment.showDivider), reusing the same look as the
  // existing per-item divider on a transparent item shape. This is
  // deliberately separate from cartConfig.dividers (the freely
  // draggable, user-placed lines from wrapComponent()) — a segment
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
  // focus editor stage (js/shop/cart-editor.js renderFocusStage()) can
  // place the item block in its own region while the other blocks stay
  // where they are, without duplicating any of this HTML-building logic.
  // Title and checkout used to live in their own fixed, non-positionable
  // header/footer bars; they are now just two more freely positionable
  // top-level components like the rest, wrapped via wrapComponent() the
  // same way (see buildTitleHtml()/buildCheckoutHtml() above).
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

    // T6: freely placeable divider lines (cartConfig.dividers). Each one
    // is its own component ("divider:<id>") with its own componentLayout
    // offset, so it can be dragged anywhere inside the cart body instead
    // of being locked to the totals block like the previous single
    // "totalsDivider". Their natural flow position is the top of the
    // body; the stored offset moves them from there.
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
      // Text im Fortschritts-Bereich: solange ein weiterer Meilenstein
      // fehlt, unverändert "Noch X bis Label". Ist der höchste Meilenstein
      // erreicht (kein "next" mehr), zeigt sein optionales `reachedText`
      // eine individuelle Erfolgsmeldung statt des generischen Standard-
      // textes.
      const highestReached = reachedNow[reachedNow.length - 1];
      let progressMsg;
      if (next) {
        progressMsg = `Noch ${eur(Number(next.amount) - subtotal)} bis „${esc(next.label)}“`;
      } else if (highestReached && highestReached.reachedText) {
        progressMsg = esc(highestReached.reachedText);
      } else {
        // Globaler, editierbarer Fallback-Text statt hartkodiertem String
        // — siehe cartConfig.progressCompleteText in cart-data.js
        // normalizeState().
        progressMsg = esc(config.progressCompleteText || "✓ Alle Ziele freigeschaltet");
      }
      // Erreichte Meilenstein-Marker bekommen dieselbe Farbe wie der
      // Balken (barColor) als Inline-Style.
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
    // Kosten-Übersicht/checkout button out of view — the visitor scrolls
    // only within the product list itself, not the whole cart body. The
    // box itself carries no visible chrome ("unsichtbar"); the divider
    // right after it is the one visible separation from the rest of the
    // cart, always shown regardless of whether a max-height is set.
    const itemsInner = buildItemsHtml(items, isDemo, interactive, config);
    const maxHeight = Number(config.itemsListMaxHeight);
    const boxStyle = Number.isFinite(maxHeight) && maxHeight > 0 ? ` style="max-height:${maxHeight}px; overflow-y:auto; overflow-x:hidden;"` : "";
    const itemsPart = `<div class="cart-items-box"${boxStyle}>${itemsInner}</div><div class="cart-items-box-divider"></div>`;

    let recommendPart = "";
    if (config.recommendEnabled) {
      // Form der Empfehlungskarte (unabhängig von der Artikel-Form).
      const recShapeClass = "cart-recommend-card-" + (config.recommendShape === "square" ? "square" : (config.recommendShape === "pill" ? "pill" : "rounded"));
      // opts.isDemo durchreichen, damit der synthetische Demo-Artikel
      // (leerer Warenkorb, siehe cart-editor.js renderFocusStage()) in
      // pickRecommendation() nicht fälschlich als "schon im Warenkorb"
      // gezählt wird — siehe cart-data.js pickRecommendation().
      const picked = cart.pickRecommendation(items, subtotal, { isDemo });
      if (picked) {
        const { rec, product } = picked;
        const recHtml = `<div class="cart-recommend"><p class="cart-recommend-title">${esc(rec.text || cart.defaultRecommendationText())}</p><div class="cart-recommend-card ${recShapeClass}">${buildRecommendCardContentHtml(product, interactive)}</div></div>`;
        recommendPart = wrapComponent(recHtml, "recommend", interactive);
      } else if (interactive) {
        // If recommendations are enabled but nothing is configured / no
        // condition matches, there's otherwise nothing to click in the
        // editor to reach the recommendation panel (component:recommend).
        // This dummy card appears ONLY in the interactive editor mode —
        // in the real preview/drawer, unchanged behavior (show nothing).
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
    // standalone shippingFreeThreshold — either applies independently.
    // The two are kept in sync in both directions
    // (cart.syncFreeShippingMilestone() in cart-data.js, plus the reverse
    // sync in renderMilestoneList() below), but a threshold works on its
    // own even with no milestone at all.
    const shippingThreshold = config.shippingFreeThreshold;
    const free = reached.some(m => m.action === "free-shipping") || (shippingThreshold != null && subtotal >= Number(shippingThreshold));
    // Spiegelbild davon: der Extra-Rabatt gilt über einen erreichten
    // Meilenstein mit action "discount" ODER über das eigenständige
    // milestoneDiscountThreshold — beides wirkt unabhängig voneinander.
    // Der Prozentsatz kommt aus cartConfig.milestoneDiscountPercent
    // (Default 10 = früherer hartkodierter Wert).
    const discountThreshold = config.milestoneDiscountThreshold;
    const milestoneDiscountActive = reached.some(m => m.action === "discount") || (discountThreshold != null && subtotal >= Number(discountThreshold));
    const configuredDiscountPercent = Number(config.milestoneDiscountPercent);
    const extra = milestoneDiscountActive ? (Number.isFinite(configuredDiscountPercent) ? configuredDiscountPercent : 10) : 0;
    const discountPercent = Number(state.appliedDiscountPercent || 0) + extra;
    const discountAmount = subtotal * discountPercent / 100;
    // Versandkosten-Betrag und "Kostenlos"-Text sind im Warenkorb-Editor
    // konfigurierbar (Kosten-Übersicht, siehe cart-editor.js) — Defaults
    // (4,95 €, "Kostenlos") kommen aus cartConfig.shippingCost /
    // cartConfig.shippingFreeText (Default-Werte in cart-data.js
    // normalizeState()), damit unveränderte Projekte exakt wie zuvor
    // aussehen.
    const shippingCost = Number(config.shippingCost);
    const shipping = config.progressEnabled ? (free ? 0 : (Number.isFinite(shippingCost) ? shippingCost : 4.95)) : 0;
    const total = Math.max(0, subtotal - discountAmount) + shipping;

    const subtotalLabel = esc(config.subtotalLabel || "Zwischensumme");
    const discountLabel = esc(config.discountLabel || "Rabatt");
    const shippingLabel = esc(config.shippingLabel || "Versand");
    const shippingFreeText = esc(config.shippingFreeText || "Kostenlos");
    const totalLabel = esc(config.totalLabel || "Gesamt");

    // T5: shipping is a plain row inside the totals block again (it used
    // to be its own draggable component:shipping). Its settings live in
    // the Kosten-Übersicht panel. Still only rendered while
    // progressEnabled, exactly as before.
    const shippingRowHtml = config.progressEnabled
      ? `<div class="cart-total-row"><span>${shippingLabel}</span><span>${shipping === 0 ? shippingFreeText : eur(shipping)}</span></div>`
      : "";

    let totalsHtml = `<div class="cart-totals"><div class="cart-total-row"><span>${subtotalLabel}</span><span>${eur(subtotal)}</span></div>`;
    if (discountAmount > 0) totalsHtml += `<div class="cart-total-row"><span>${discountLabel}</span><span>−${eur(discountAmount)}</span></div>`;
    totalsHtml += shippingRowHtml;
    // "Gratis-Produkt"-Zeile — Label und Wert-Text kommen aus
    // cartConfig.freeProductLabel/-ValueText. Sichtbarkeit: nur wenn ein
    // Meilenstein mit action "free-product" erreicht ist (siehe `reached`
    // oben).
    if (reached.some(m => m.action === "free-product")) totalsHtml += `<div class="cart-total-row"><span>${esc(config.freeProductLabel || "🎁 Gratis-Produkt")}</span><span>${esc(config.freeProductValueText || "freigeschaltet")}</span></div>`;
    totalsHtml += `<div class="cart-total-row cart-total-final"><span>${totalLabel}</span><span>${eur(total)}</span></div></div>`;
    const totalsPart = wrapComponent(totalsHtml, "totals", interactive);

    const checkoutPart = buildCheckoutHtml(interactive);

    return { title: titlePart, dividers: dividersPart, progress: progressPart, items: itemsPart, recommend: recommendPart, discount: discountPart, totals: totalsPart, checkout: checkoutPart };
  }

  // Builds the shared cart body as one concatenated string, in the same
  // order the editor stage shows it. Used by the real drawer
  // (interactive: false). The cart focus editor stage uses
  // buildCartParts() directly instead (see above).
  function buildCartHtml(items, opts = {}) {
    const parts = buildCartParts(items, opts);
    return parts.title + parts.dividers + parts.progress + parts.items + parts.recommend + parts.discount + parts.totals + parts.checkout;
  }

  // Delegierte Bindings für den Empfehlungs-Editor, EINMALIG auf den nie
  // ersetzten Container gelegt statt auf jede wegwerfbare Zeile.
  function bindRecommendListDelegated() {
    const listEl = document.getElementById("cart-recommend-list");
    if (!listEl || listEl.dataset.webBuilderRecBound === "true") return;
    listEl.dataset.webBuilderRecBound = "true";

    listEl.addEventListener("click", e => {
      const btn = e.target.closest?.(".item-delete[data-rec-id]");
      if (!btn) return;
      e.preventDefault(); e.stopImmediatePropagation();
      cart.removeRecommendation(btn.dataset.recId);
    }, true);

    listEl.addEventListener("change", e => {
      const textInput = e.target.closest?.(".rec-text[data-rec-id]");
      if (textInput) { cart.updateRecommendation(textInput.dataset.recId, { text: textInput.value }); return; }

      const altSelect = e.target.closest?.(".rec-alternative[data-rec-id]");
      if (altSelect) { cart.updateRecommendation(altSelect.dataset.recId, { alternativeProductId: altSelect.value || null }); return; }

      const condType = e.target.closest?.(".rec-condition-type[data-rec-id]");
      if (condType) {
        const recId = condType.dataset.recId;
        const rec = (cart.getConfig().recommendations || []).find(r => r.id === recId);
        cart.updateRecommendation(recId, { condition: { type: condType.value, value: rec?.condition?.value || 0 } });
        return;
      }

      const condValue = e.target.closest?.(".rec-condition-value[data-rec-id]");
      if (condValue) {
        const recId = condValue.dataset.recId;
        const rec = (cart.getConfig().recommendations || []).find(r => r.id === recId);
        cart.updateRecommendation(recId, { condition: { type: rec?.condition?.type || "none", value: Number(condValue.value) || 0 } });
      }
    }, true);
  }

  function renderRecommendList() {
    const listEl = document.getElementById("cart-recommend-list");
    if (!listEl) return;
    bindRecommendListDelegated();
    let list = Array.isArray(cart.getConfig()?.recommendations) ? cart.getConfig().recommendations : [];
    // Drop recommendations whose product was deleted in the meantime.
    const valid = list.filter(rec => window.WebBuilderProducts?.getById?.(rec.productId));
    if (valid.length !== list.length) { state.cartConfig.recommendations = valid; list = valid; }
    const products = window.WebBuilderProducts?.getAll?.() || [];
    listEl.innerHTML = list.length ? "" : '<p class="help-text">Noch keine Empfehlungen.</p>';
    list.forEach(rec => {
      const product = window.WebBuilderProducts?.getById?.(rec.productId);
      if (!product) return;
      const altOptions = ['<option value="">— Keine Alternative —</option>']
        .concat(products.filter(p => p.id !== rec.productId).map(p => `<option value="${esc(p.id)}" ${rec.alternativeProductId === p.id ? "selected" : ""}>${esc(p.icon || "📦")} ${esc(p.name)}</option>`))
        .join("");
      const conditionOptions = Object.entries(cart.CONDITION_LABELS).map(([v, l]) => `<option value="${v}" ${rec.condition?.type === v ? "selected" : ""}>${esc(l)}</option>`).join("");
      const row = document.createElement("div");
      row.className = "item-row cart-recommend-row";
      row.innerHTML = `
        <div class="cart-recommend-row-header">
          <span class="product-icon-preview">${esc(product.icon || "📦")}</span>
          <span class="item-row-text">${esc(product.name)} — ${eur(product.discountPrice != null ? product.discountPrice : product.price)}</span>
          <button type="button" class="item-delete" data-rec-id="${esc(rec.id)}">✕</button>
        </div>
        <input type="text" class="rec-text" data-rec-id="${esc(rec.id)}" value="${esc(rec.text)}" placeholder="Empfehlungstext">
        <span class="rec-field-label">Alternative, falls Produkt bereits im Warenkorb ist</span>
        <select class="rec-alternative" data-rec-id="${esc(rec.id)}">${altOptions}</select>
        <span class="rec-field-label">Anzeigen wenn</span>
        <div class="rec-condition-row">
          <select class="rec-condition-type" data-rec-id="${esc(rec.id)}">${conditionOptions}</select>
          <input type="number" class="rec-condition-value" data-rec-id="${esc(rec.id)}" min="0" step="1" value="${Number(rec.condition?.value) || 0}" ${rec.condition?.type === "none" ? "disabled" : ""}>
        </div>
      `;
      listEl.appendChild(row);
    });
  }

  function bindAddRecommendation() {
    const btn = document.getElementById("btn-add-recommendation");
    if (!btn || btn.dataset.webBuilderCartBound === "true") return;
    btn.dataset.webBuilderCartBound = "true";
    btn.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      const list = window.WebBuilderProducts?.getAll?.() || [];
      if (!list.length) {
        window.WebBuilderModals?.openMessage?.("Keine Produkte", "Lege zuerst im Tab „📦 Produkte“ ein Produkt an.");
        return;
      }
      const bodyHtml = `<div class="pick-list">${list.map(p => `<button type="button" class="btn btn-secondary product-pick-btn" data-id="${esc(p.id)}">${esc(p.icon || "📦")} ${esc(p.name)} — ${eur(p.discountPrice != null ? p.discountPrice : p.price)}</button>`).join("")}</div>`;
      window.WebBuilderModals?.open?.("Produkt als Empfehlung wählen", bodyHtml);
      document.querySelectorAll(".product-pick-btn").forEach(pickBtn => pickBtn.addEventListener("click", pe => {
        cart.addRecommendation(pe.currentTarget.dataset.id);
        renderRecommendList();
        refreshCartViews();
        window.WebBuilderModals?.close?.();
      }, true));
    }, true);
  }

  function renderMilestoneList() {
    const listEl = document.getElementById("cart-milestone-list");
    if (!listEl) return;
    const milestones = Array.isArray(cart.getConfig()?.milestones) ? cart.getConfig().milestones : [];
    // Der Extra-Rabatt ist konfigurierbar
    // (cartConfig.milestoneDiscountPercent), deshalb zeigt die Option den
    // aktuellen Wert statt einer fest verdrahteten "(10%)".
    const milestoneDiscountPercent = Number(cart.getConfig()?.milestoneDiscountPercent);
    const discountOptionLabel = `Extra-Rabatt (${Number.isFinite(milestoneDiscountPercent) ? milestoneDiscountPercent : 10}%)`;
    listEl.innerHTML = milestones.length ? "" : '<p class="help-text">Noch keine Meilensteine.</p>';
    milestones.forEach(m => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `<input type="text" class="ms-icon" data-id="${esc(m.id)}" value="${esc(m.icon || "")}" placeholder="Icon" title="Icon/Emoji, wird angezeigt sobald der Meilenstein erreicht ist">
        <input type="number" class="ms-amount" data-id="${esc(m.id)}" value="${Number(m.amount) || 0}" step="1" placeholder="Betrag (€)">
        <input type="text" class="ms-label" data-id="${esc(m.id)}" value="${esc(m.label)}" placeholder="Label">
        <input type="text" class="ms-reached-text" data-id="${esc(m.id)}" value="${esc(m.reachedText || "")}" placeholder="Text bei Erreichen (optional)" title="Wird anstelle der Standardmeldung gezeigt, sobald dies der zuletzt erreichte Meilenstein ist">
        <select class="ms-action" data-id="${esc(m.id)}">
          <option value="free-shipping" ${m.action === "free-shipping" ? "selected" : ""}>Kostenloser Versand</option>
          <option value="discount" ${m.action === "discount" ? "selected" : ""}>${esc(discountOptionLabel)}</option>
          <option value="free-product" ${m.action === "free-product" ? "selected" : ""}>Gratis-Produkt Hinweis</option>
          <option value="message" ${m.action === "message" ? "selected" : ""}>Nur Hinweistext</option>
        </select>
        <button type="button" class="item-delete" data-id="${esc(m.id)}">✕</button>`;
      listEl.appendChild(row);
    });
    listEl.querySelectorAll(".ms-icon").forEach(inp => inp.addEventListener("input", e => {
      const m = (cart.getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) { window.WebBuilderHistory?.arm(); m.icon = e.target.value; window.WebBuilderHistory?.commit(); refreshCartViews(); }
    }, true));
    listEl.querySelectorAll(".ms-amount").forEach(inp => inp.addEventListener("input", e => {
      const m = (cart.getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) {
        window.WebBuilderHistory?.arm();
        m.amount = parseFloat(e.target.value) || 0;
        // Gegenrichtung von cart.syncFreeShippingMilestone(): wird der
        // Betrag eines "free-shipping"-Meilensteins hier bearbeitet, zieht
        // das Freibetrag-Feld in der Kosten-Übersicht mit. Analog für
        // einen "discount"-Meilenstein und
        // cartConfig.milestoneDiscountThreshold.
        if (m.action === "free-shipping") state.cartConfig.shippingFreeThreshold = m.amount;
        else if (m.action === "discount") state.cartConfig.milestoneDiscountThreshold = m.amount;
        window.WebBuilderHistory?.commit();
        refreshCartViews();
      }
    }, true));
    listEl.querySelectorAll(".ms-label").forEach(inp => inp.addEventListener("input", e => {
      const m = (cart.getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) { window.WebBuilderHistory?.arm(); m.label = e.target.value; window.WebBuilderHistory?.commit(); refreshCartViews(); }
    }, true));
    listEl.querySelectorAll(".ms-reached-text").forEach(inp => inp.addEventListener("input", e => {
      const m = (cart.getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) { window.WebBuilderHistory?.arm(); m.reachedText = e.target.value; window.WebBuilderHistory?.commit(); refreshCartViews(); }
    }, true));
    listEl.querySelectorAll(".ms-action").forEach(sel => sel.addEventListener("change", e => {
      const m = (cart.getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) {
        window.WebBuilderHistory?.arm();
        m.action = e.target.value;
        // Wird dieser Meilenstein gerade zum free-shipping-/discount-
        // Meilenstein, übernimmt das passende Ziel-Feld sofort seinen
        // aktuellen Betrag (passend zum Betrags-Sync oben).
        if (m.action === "free-shipping") state.cartConfig.shippingFreeThreshold = m.amount;
        else if (m.action === "discount") state.cartConfig.milestoneDiscountThreshold = m.amount;
        window.WebBuilderHistory?.commit();
        // Ein neu zugewiesenes "free-product"-Milestone kann dazu führen,
        // dass das Gratis-Produkt-Eingabefeld im Kosten-Übersicht-Panel
        // jetzt sichtbar werden muss (bzw. ein entferntes Milestone es
        // wieder verstecken muss) — siehe js/shop/cart-editor.js
        // renderFocusPartPanel().
        window.WebBuilderCartFocus?.renderPartPanel?.();
        refreshCartViews();
      }
    }, true));
    listEl.querySelectorAll(".item-delete").forEach(btn => btn.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      cart.removeMilestone(e.currentTarget.dataset.id);
      renderMilestoneList();
      // Siehe Kommentar bei ".ms-action" oben — auch das Entfernen eines
      // "free-product"-Milestones kann die Sichtbarkeit des Gratis-
      // Produkt-Feldes ändern.
      window.WebBuilderCartFocus?.renderPartPanel?.();
      refreshCartViews();
    }, true));
  }

  function bindAddMilestone() {
    const btn = document.getElementById("btn-add-milestone");
    if (!btn || btn.dataset.webBuilderCartBound === "true") return;
    btn.dataset.webBuilderCartBound = "true";
    btn.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      cart.addMilestone();
      renderMilestoneList();
      refreshCartViews();
    }, true);
  }

  // Renders the real slide-in drawer (#cart-items-list, always non-interactive).
  // Title and checkout button are now built into buildCartHtml() itself
  // (see buildTitleHtml()/buildCheckoutHtml() above) — no separate
  // header/footer bar elements to update by id anymore.
  function renderCart() {
    const list = document.getElementById("cart-items-list");
    if (!list) return;
    list.innerHTML = buildCartHtml(cart.getItems(), { interactive: false, isDemo: false });
    const config = cart.getConfig() || {};
    // "Hintergrund" (component:background) applies to the real drawer too,
    // not just the editor preview.
    const drawer = document.getElementById("cart-drawer");
    if (drawer) drawer.style.backgroundColor = config.cardBackgroundColor || "";
  }

  // Re-renders every place the cart's content is currently visible: the
  // real drawer plus — if the editor is open — the editor stage
  // (cart-editor.js).
  function refreshCartViews() {
    renderCart();
    if (state.cartFocusMode) {
      window.WebBuilderCartFocus?.renderStage?.();
      window.WebBuilderCartFocus?.renderPartPanel?.();
    }
  }

  function bind() {
    // Delegated on `document`. Scoped to #cart-items-list (the real
    // drawer) only — NOT to #cart-focus-stage.
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
    bindAddRecommendation();
    bindAddMilestone();
    state.subscribe?.(e => {
      if (["cart", "products"].includes(e?.domain)) {
        refreshCartViews();
        renderRecommendList();
        renderMilestoneList();
      }
    });
    refreshCartViews();
    renderRecommendList();
    renderMilestoneList();
  }
  function openCart() { document.getElementById("cart-drawer")?.classList.add("active"); document.getElementById("cart-drawer-backdrop")?.classList.add("active"); renderCart(); return true; }
  function closeCart() { document.getElementById("cart-drawer")?.classList.remove("active"); document.getElementById("cart-drawer-backdrop")?.classList.remove("active"); return true; }
  document.addEventListener("DOMContentLoaded", () => setTimeout(bind, 0));

  // ------------------------------------------------------------------
  // Product segments — sidebar UI (left column, #panel-cart). Lives here
  // rather than in cart-editor.js's right-hand panel since creating/
  // editing a segment isn't tied to selecting a specific on-canvas part;
  // it's a general cart setting, same category as the discount/recommend/
  // progress toggles this file already manages.
  // ------------------------------------------------------------------
  function renderSegmentList() {
    const listEl = document.getElementById("cart-segment-list");
    if (!listEl) return;
    const segments = Array.isArray(cart.getConfig()?.segments) ? cart.getConfig().segments : [];
    listEl.innerHTML = segments.length ? "" : '<p class="help-text">Noch keine Segmente.</p>';
    segments.forEach(segment => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `<span class="item-row-text">${esc(segment.name)} (${(segment.productIds || []).length})</span><button type="button" class="btn btn-secondary btn-sm segment-edit-btn" data-seg-id="${esc(segment.id)}">✏️ Bearbeiten</button><button type="button" class="item-delete segment-delete-btn" data-seg-id="${esc(segment.id)}">✕</button>`;
      listEl.appendChild(row);
    });
  }

  // The "Markierungswerkzeug": a checklist of every product, pre-checked
  // for whichever ones already belong to this segment, plus name and
  // divider toggle. Reuses window.WebBuilderModals (same generic modal
  // every other picker in this file uses) instead of a bespoke dialog.
  function openSegmentModal(segmentId = null) {
    const config = cart.getConfig() || {};
    const existing = segmentId ? (config.segments || []).find(s => s.id === segmentId) : null;
    const products = window.WebBuilderProducts?.getAll?.() || [];
    const checkedIds = new Set(existing?.productIds || []);
    const rowsHtml = products.length
      ? products.map(p => `<label class="checkbox-row"><input type="checkbox" class="segment-product-check" value="${esc(p.id)}" ${checkedIds.has(p.id) ? "checked" : ""}> ${esc(p.icon || "📦")} ${esc(p.name)}</label>`).join("")
      : '<p class="help-text">Noch keine Produkte vorhanden — lege zuerst im Tab „📦 Produkte“ ein Produkt an.</p>';
    const bodyHtml = `
      <div class="modal-stack">
        <div class="form-group"><label for="segment-name-input">Name</label><input type="text" id="segment-name-input" value="${esc(existing?.name || "")}" placeholder="z. B. Zubehör"></div>
        <label class="checkbox-row"><input type="checkbox" id="segment-divider-toggle" ${!existing || existing.showDivider ? "checked" : ""}> Trennlinie unterhalb anzeigen</label>
        <hr class="divider modal-divider-tight">
        <p class="help-text" style="margin:0 0 4px;">Produkte für dieses Segment auswählen:</p>
        ${rowsHtml}
      </div>
    `;
    const footerHtml = `<button type="button" class="btn btn-primary" id="segment-save-btn">Speichern</button>`;
    window.WebBuilderModals?.open?.(existing ? "Segment bearbeiten" : "Segment erstellen", bodyHtml, footerHtml);
    document.getElementById("segment-save-btn")?.addEventListener("click", () => {
      const name = document.getElementById("segment-name-input")?.value.trim() || "Neues Segment";
      const showDivider = !!document.getElementById("segment-divider-toggle")?.checked;
      const productIds = Array.from(document.querySelectorAll(".segment-product-check:checked")).map(cb => cb.value);
      if (existing) cart.updateSegment(existing.id, { name, productIds, showDivider });
      else cart.addSegment({ name, productIds, showDivider });
      renderSegmentList();
      refreshCartViews();
      window.WebBuilderModals?.close?.();
    }, { once: true });
  }

  function bindSegmentControls() {
    const addBtn = document.getElementById("btn-add-segment");
    if (addBtn && addBtn.dataset.webBuilderSegBound !== "true") {
      addBtn.dataset.webBuilderSegBound = "true";
      addBtn.addEventListener("click", e => { e.preventDefault(); e.stopImmediatePropagation(); openSegmentModal(null); }, true);
    }
    const listEl = document.getElementById("cart-segment-list");
    if (listEl && listEl.dataset.webBuilderSegBound !== "true") {
      listEl.dataset.webBuilderSegBound = "true";
      listEl.addEventListener("click", e => {
        const editBtn = e.target.closest?.(".segment-edit-btn");
        if (editBtn) { e.preventDefault(); e.stopImmediatePropagation(); openSegmentModal(editBtn.dataset.segId); return; }
        const delBtn = e.target.closest?.(".segment-delete-btn");
        if (delBtn) {
          e.preventDefault(); e.stopImmediatePropagation();
          cart.removeSegment(delBtn.dataset.segId);
          renderSegmentList();
          refreshCartViews();
        }
      }, true);
    }
    const heightInput = document.getElementById("cart-items-max-height");
    if (heightInput && heightInput.dataset.webBuilderSegBound !== "true") {
      heightInput.dataset.webBuilderSegBound = "true";
      heightInput.addEventListener("change", e => {
        const raw = e.target.value;
        const v = raw === "" ? null : Math.max(80, Number(raw) || 0);
        window.WebBuilderHistory?.arm(); cart.setConfig({ itemsListMaxHeight: v }, false); window.WebBuilderHistory?.commit();
        refreshCartViews();
      }, true);
    }
    renderSegmentList();
  }

  function renderConfig() {
    const c = cart.getConfig() || {};
    const ids = [["cart-discount-toggle", c.discountEnabled], ["cart-recommend-toggle", c.recommendEnabled], ["cart-progress-toggle", c.progressEnabled]];
    ids.forEach(([id, v]) => { const e = document.getElementById(id); if (e) e.checked = !!v; });
    const heightInput = document.getElementById("cart-items-max-height");
    if (heightInput && document.activeElement !== heightInput) heightInput.value = c.itemsListMaxHeight != null ? c.itemsListMaxHeight : "";
    renderSegmentList();
    if (state.cartFocusMode) {
      window.WebBuilderCartFocus?.renderStage?.();
      window.WebBuilderCartFocus?.renderPartPanel?.();
    }
  }
  function bindConfig() {
    const map = { "cart-discount-toggle": "discountEnabled", "cart-recommend-toggle": "recommendEnabled", "cart-progress-toggle": "progressEnabled" };
    Object.entries(map).forEach(([id, p]) => document.getElementById(id)?.addEventListener("change", e => { window.WebBuilderHistory?.arm(); cart.setConfig({ [p]: e.target.checked }, false); window.WebBuilderHistory?.commit(); renderConfig(); refreshCartViews(); }, true));
    bindAddRecommendation();
    bindAddMilestone();
    bindSegmentControls();
    renderConfig();
  }
  document.addEventListener("DOMContentLoaded", () => setTimeout(bindConfig, 0));

  window.WebBuilderCartRuntime = { render: renderCart, refresh: refreshCartViews, open: openCart, close: closeCart, buildCartHtml, buildCartParts };
  window.WebBuilderCartConfigRuntime = { render: renderConfig, renderRecommendList, renderMilestoneList, renderSegmentList };
})();
