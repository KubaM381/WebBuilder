// js/shop/cart-render.js
// WebBuilder cart rendering domain
// Builds the shared cart HTML (progress bar, items, recommendation,
// discount, shipping, totals) and owns the real slide-in drawer plus the
// sidebar config toggles. Used by both the drawer (interactive=false) and
// the cart editor stage in cart-editor.js (interactive=true), so both stay
// pixel-identical apart from editing affordances. Cart data/CRUD lives in
// cart-data.js (window.WebBuilderCart) — this file only reads it.
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

  // T4: generic "positioned sub-part" wrapper, shared by cart-item parts
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

  // Wraps a top-level cart block (progress bar / discount field /
  // recommendation card / shipping row / totals) in a positionable,
  // selectable wrapper — same "only wrap when needed" rule as wrapPart()
  // inside buildCartItemHTML(): outside the editor (interactive=false), a
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

  // T4: builds the recommend card's inner content (icon/name/price/+
  // button), each individually positionable via
  // cartConfig.recommendDisplay.layout — same mechanism as
  // buildCartItemHTML's per-part offsets, just against a separate layout
  // map (the recommend card isn't a cart item, so it can't share
  // itemDisplay.layout). The "+" button's color comes from
  // cartConfig.recommendAddButtonColor (default matches the previous
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

    // T4: delegates to the shared wrapLayoutPart() helper, keyed against
    // this item's own layout map (cartConfig.itemDisplay.layout) — call
    // sites below (wrapPart(x, "remove")/("qty")/("price")/("icon")/
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

  // Builds the shared cart body split into its five logical blocks
  // (progress / items / recommendation / discount / totals — shipping is
  // nested inside totals, see below) instead of a single concatenated
  // string. buildCartHtml() below just joins them in the original order
  // for the real drawer — the split itself exists so the cart focus
  // editor stage (js/shop/cart-editor.js renderFocusStage(), see
  // docs/CART_EDITOR_TASKS.md T3) can place the item block in its own
  // scrollable region while progress/recommend/discount/totals stay fixed
  // on screen, without duplicating any of this HTML-building logic.
  function buildCartParts(items, opts = {}) {
    const interactive = !!opts.interactive;
    const isDemo = !!opts.isDemo;
    const config = cart.getConfig() || {};
    const milestones = Array.isArray(config.milestones) ? [...config.milestones].sort((a, b) => Number(a.amount) - Number(b.amount)) : [];
    const subtotal = items.reduce((s, i) => s + cart.getEffectivePrice(i) * (Number(i.qty) || 0), 0);

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
        progressMsg = "✓ Alle Ziele freigeschaltet";
      }
      const progressHtml = `<div class="cart-progress"><div class="cart-progress-track"><div class="cart-progress-fill" style="width:${pct}%; background-color:${barColor};"></div>${milestones.map(m => `<div class="cart-progress-mark ${subtotal >= Number(m.amount) ? "reached" : ""}" style="left:${Math.min(100, (Number(m.amount) / max) * 100)}%" title="${esc(m.label)}"></div>`).join("")}</div>${rewardsHtml}<p class="cart-progress-msg">${progressMsg}</p></div>`;
      progressPart = wrapComponent(progressHtml, "progress", interactive);
    }

    // Divider between items on a transparent item shape, only if enabled
    // — between each item, not before the first / after the last.
    const showDividers = config.itemShape === "transparent" && !!(config.itemDisplay || {}).showItemDividers;
    const itemsPart = items.length
      ? items.map((i, idx) => (showDividers && idx > 0 ? '<div class="cart-item-divider"></div>' : "") + buildCartItemHTML(i, isDemo, interactive)).join("")
      : '<p class="cart-empty-msg">Dein Warenkorb ist leer.</p>';

    let recommendPart = "";
    if (config.recommendEnabled) {
      // T4: Form der Empfehlungskarte (unabhängig von der Artikel-Form).
      const recShapeClass = "cart-recommend-card-" + (config.recommendShape === "square" ? "square" : (config.recommendShape === "pill" ? "pill" : "rounded"));
      // T5 fix: opts.isDemo durchreichen, damit der synthetische
      // Demo-Artikel (leerer Warenkorb, siehe cart-editor.js
      // renderFocusStage()) in pickRecommendation() nicht fälschlich als
      // "schon im Warenkorb" gezählt wird — siehe cart-data.js
      // pickRecommendation() Kommentar für die volle Erklärung.
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
        // Same data-cart-component="recommend" as the real card, so the
        // existing selection logic in cart-editor.js keeps working
        // unchanged. No individually-positionable sub-parts here (no real
        // product behind it), but it does reflect the configured shape.
        const dummyHtml = `<div class="cart-recommend"><p class="cart-recommend-title">${esc(cart.defaultRecommendationText())}</p><div class="cart-recommend-card ${recShapeClass}"><span class="cart-recommend-icon">➕</span><span class="cart-recommend-name">Noch keine passende Empfehlung konfiguriert</span></div></div>`;
        recommendPart = wrapComponent(dummyHtml, "recommend", interactive);
      }
    }

    let discountPart = "";
    if (config.discountEnabled) {
      const discColor = config.discountButtonColor || "#4f46e5";
      const discRadius = config.discountButtonShape === "pill" ? "999px" : (config.discountButtonShape === "square" ? "0px" : "6px");
      // BUGFIX: im Warenkorb-Editor (interactive) ist das Feld rein
      // optisch/verschiebbar — readonly, damit man dort nicht versehentlich
      // einen Code eintippt, der ohnehin nirgends ausgewertet wird (siehe
      // cart-editor.js bindFocusStageInteractions(), das Klicks hier nur
      // zum Verschieben des ganzen Rabatt-Blocks nutzt statt zu tippen).
      const discountHtml = `<div class="cart-discount"><input type="text" class="cart-discount-input" placeholder="Rabattcode (Demo: DEMO10)"${interactive ? " readonly" : ""}><button type="button" class="cart-discount-apply-btn" style="background-color:${discColor}; border-radius:${discRadius};">Anwenden</button>${state.appliedDiscountLabel ? `<p class="cart-discount-msg ok">${esc(state.appliedDiscountLabel)}</p>` : ""}</div>`;
      discountPart = wrapComponent(discountHtml, "discount", interactive);
    }

    const reached = milestones.filter(m => subtotal >= Number(m.amount || 0));
    // T7: shipping is free via a "free-shipping" milestone OR via the
    // standalone shippingFreeThreshold configured in component:shipping —
    // either applies independently. The two are kept in sync in both
    // directions (cart.syncFreeShippingMilestone() in cart-data.js, plus
    // the reverse sync in renderMilestoneList() below), but a threshold
    // works on its own even with no milestone at all.
    const shippingThreshold = config.shippingFreeThreshold;
    const free = reached.some(m => m.action === "free-shipping") || (shippingThreshold != null && subtotal >= Number(shippingThreshold));
    // T8 (Spiegelbild von T7): der Extra-Rabatt gilt über einen erreichten
    // Meilenstein mit action "discount" ODER über das eigenständige
    // milestoneDiscountThreshold — beides wirkt unabhängig voneinander
    // (Standardentscheidung (a) der T8-Spec, identisch zu "free" oben).
    // Der Prozentsatz kommt aus cartConfig.milestoneDiscountPercent
    // (Default 10 = bisheriger hartkodierter Wert).
    const discountThreshold = config.milestoneDiscountThreshold;
    const milestoneDiscountActive = reached.some(m => m.action === "discount") || (discountThreshold != null && subtotal >= Number(discountThreshold));
    const configuredDiscountPercent = Number(config.milestoneDiscountPercent);
    const extra = milestoneDiscountActive ? (Number.isFinite(configuredDiscountPercent) ? configuredDiscountPercent : 10) : 0;
    const discountPercent = Number(state.appliedDiscountPercent || 0) + extra;
    const discountAmount = subtotal * discountPercent / 100;
    // Versandkosten-Betrag und "Kostenlos"-Text sind im Warenkorb-Editor
    // konfigurierbar (component:shipping, siehe cart-editor.js) — Defaults
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

    // T7: shipping is now its own positionable component
    // (component:shipping) instead of a fixed row baked directly into
    // totalsHtml — same wrapComponent() mechanism as progress/discount/
    // recommend/checkout/totals, just nested inside the totals block so it
    // still visually sits where the "Versand"-row always sat. Still only
    // rendered while progressEnabled, exactly as before.
    const shippingRowHtml = config.progressEnabled
      ? `<div class="cart-total-row"><span>${shippingLabel}</span><span>${shipping === 0 ? shippingFreeText : eur(shipping)}</span></div>`
      : "";
    const shippingPart = wrapComponent(shippingRowHtml, "shipping", interactive);

    let totalsHtml = `<div class="cart-totals"><div class="cart-total-row"><span>${subtotalLabel}</span><span>${eur(subtotal)}</span></div>`;
    if (discountAmount > 0) totalsHtml += `<div class="cart-total-row"><span>${discountLabel}</span><span>−${eur(discountAmount)}</span></div>`;
    totalsHtml += shippingPart;
    if (reached.some(m => m.action === "free-product")) totalsHtml += `<div class="cart-total-row"><span>🎁 Gratis-Produkt</span><span>freigeschaltet</span></div>`;
    totalsHtml += `<div class="cart-total-row cart-total-final"><span>${totalLabel}</span><span>${eur(total)}</span></div></div>`;
    const totalsPart = wrapComponent(totalsHtml, "totals", interactive);

    return { progress: progressPart, items: itemsPart, recommend: recommendPart, discount: discountPart, totals: totalsPart };
  }

  // Builds the shared cart body (progress bar, items, recommendation,
  // discount, totals) as one concatenated string, in the original order.
  // Used by the real drawer (interactive: false) — output is byte-
  // identical to before the T3 split. The cart focus editor stage uses
  // buildCartParts() directly instead (see above).
  function buildCartHtml(items, opts = {}) {
    const parts = buildCartParts(items, opts);
    return parts.progress + parts.items + parts.recommend + parts.discount + parts.totals;
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
    // T8: der Extra-Rabatt ist jetzt konfigurierbar
    // (cartConfig.milestoneDiscountPercent), deshalb zeigt die Option den
    // aktuellen Wert statt der früher fest verdrahteten "(10%)".
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
        // T7: reverse direction of cart.syncFreeShippingMilestone() —
        // editing a "free-shipping" milestone's own amount here keeps the
        // shipping panel's threshold field (component:shipping) in sync
        // too. T8 does the same for a "discount" milestone and the
        // discount panel's threshold (cartConfig.milestoneDiscountThreshold).
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
        // T7/T8: if this milestone just became the free-shipping /
        // discount milestone, sync the matching panel's threshold to its
        // current amount right away (matches the amount-edit sync above).
        if (m.action === "free-shipping") state.cartConfig.shippingFreeThreshold = m.amount;
        else if (m.action === "discount") state.cartConfig.milestoneDiscountThreshold = m.amount;
        window.WebBuilderHistory?.commit();
        refreshCartViews();
      }
    }, true));
    listEl.querySelectorAll(".item-delete").forEach(btn => btn.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      cart.removeMilestone(e.currentTarget.dataset.id);
      renderMilestoneList();
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

  function applyCheckoutButtonStyle() {
    const btn = document.getElementById("cart-checkout-btn");
    if (!btn) return;
    const config = cart.getConfig() || {};
    btn.style.backgroundColor = config.buttonColor || "#4f46e5";
    btn.style.borderRadius = config.buttonShape === "pill" ? "999px" : (config.buttonShape === "square" ? "0px" : "6px");
  }

  // Renders the real slide-in drawer (#cart-items-list, always non-interactive).
  function renderCart() {
    const list = document.getElementById("cart-items-list");
    if (!list) return;
    list.innerHTML = buildCartHtml(cart.getItems(), { interactive: false, isDemo: false });
    document.getElementById("cart-count-badge")?.replaceChildren(document.createTextNode(String(cart.getCount())));
    const config = cart.getConfig() || {};
    // T1: real drawer title now follows cartConfig.cartTitleLabel instead
    // of the hardcoded "Dein Warenkorb" in web.html — kept in sync with
    // the cart-editor stage's header preview (see cart-editor.js
    // renderFocusStage()).
    document.getElementById("cart-title-label")?.replaceChildren(document.createTextNode(config.cartTitleLabel || "Dein Warenkorb"));
    const checkout = document.getElementById("cart-checkout-btn");
    if (checkout) {
      checkout.textContent = state.cartButtonLabel || "Zur Kasse gehen";
      // Position offset set for the checkout button in the cart editor
      // (component:checkout) applies everywhere, same as the other
      // per-component/per-part offsets — see wrapComponent()/wrapPart().
      const layout = (config.componentLayout || {}).checkout || { x: 0, y: 0 };
      checkout.style.transform = (layout.x || layout.y) ? `translate(${layout.x}px, ${layout.y}px)` : "";
    }
    // "Hintergrund" (component:background) applies to the real drawer too,
    // not just the editor preview.
    const drawer = document.getElementById("cart-drawer");
    if (drawer) drawer.style.backgroundColor = config.cardBackgroundColor || "";
    // "Fußbereich" (component:footer) — Hintergrundfarbe des
    // Footer-Balkens (in dem der Zur-Kasse-Button sitzt), gilt genauso im
    // echten Drawer wie in der Editor-Vorschau (siehe cart-editor.js
    // renderFocusStage()).
    const footerEl = document.querySelector("#cart-drawer .drawer-footer");
    if (footerEl) footerEl.style.backgroundColor = config.footerBackgroundColor || "";
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

  function renderConfig() {
    const c = cart.getConfig() || {};
    const ids = [["cart-discount-toggle", c.discountEnabled], ["cart-recommend-toggle", c.recommendEnabled], ["cart-progress-toggle", c.progressEnabled]];
    ids.forEach(([id, v]) => { const e = document.getElementById(id); if (e) e.checked = !!v; });
    applyCheckoutButtonStyle();
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
    renderConfig();
  }
  document.addEventListener("DOMContentLoaded", () => setTimeout(bindConfig, 0));

  window.WebBuilderCartRuntime = { render: renderCart, refresh: refreshCartViews, open: openCart, close: closeCart, buildCartHtml, buildCartParts };
  window.WebBuilderCartConfigRuntime = { render: renderConfig, renderRecommendList, renderMilestoneList };
})();
