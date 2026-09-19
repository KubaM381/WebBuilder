// js/shop/cart-item-html.js
// WebBuilder cart HTML building — single cart-item and recommend-card
// rendering. Split out of shop/cart-html.js so that file stays focused
// on the shared positioning primitives and the overall cart-body
// assembly. Pure functions only — no DOM access, no event binding, no
// history/state mutation, same convention as cart-html.js. Used
// identically by the real drawer (shop/cart-drawer.js, interactive=false)
// and the cart focus editor stage (shop/cart-editor-stage.js,
// interactive=true) — both must stay pixel-identical apart from editing
// affordances, so any change here affects both. Reaches
// shop/cart-html.js's wrapLayoutPart()/wrapComponent() only through
// window.WebBuilderCartHtml at runtime, so there is no parse-time
// load-order requirement between the two files. Must load after
// shop/cart-data.js (reads window.WebBuilderCart at top-level parse
// time).
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCartItemHtml: WebBuilderState is not available."); return; }
  const cart = window.WebBuilderCart;
  if (!cart) { console.error("WebBuilderCartItemHtml: WebBuilderCart is not available."); return; }

  const esc = window.WebBuilderUtils.escapeHtml;
  const eur = v => cart.formatCurrency(v);

  // Thin wrapper around cart-html.js's wrapLayoutPart, resolved at call
  // time so load order between the two files' own top-level IIFEs never
  // matters (only the actual buildXxx calls below need it, and those all
  // happen after every cart-*.js file has finished loading).
  function wrapLayoutPart(innerHtml, layoutKey, layoutMap, dataKey, interactive, showFrame) {
    return window.WebBuilderCartHtml.wrapLayoutPart(innerHtml, layoutKey, layoutMap, dataKey, interactive, showFrame);
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
      // The cart editor never renders the price as an editable <input>,
      // only informationally as a <span> — same as the demo item shown
      // on an empty cart.
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
  // Each non-empty segment is wrapped via cart-html.js's wrapComponent()
  // under the key "segment:<id>" so it is selectable/draggable in the
  // cart focus editor exactly like any other top-level component (title,
  // progress bar, ...) — outside the editor (interactive=false) with no
  // stored offset this still renders as plain markup, no extra DOM. The
  // optional divider (segment.showDivider) sits inside that same wrapper
  // so it moves together with its segment. Unrelated to
  // itemDisplay.showItemDividers below. When itemDisplay.showItemDividers
  // is enabled (transparent item shape only), a divider is rendered
  // between every pair of consecutive products within each run (segment
  // group or the trailing unsegmented run) — never after the last
  // product of that run.
  function buildItemsHtml(items, isDemo, interactive, config) {
    if (!items.length) return '<p class="cart-empty-msg">Dein Warenkorb ist leer.</p>';
    const disp = config.itemDisplay || {};
    const dividersEnabled = config.itemShape === "transparent" && !!disp.showItemDividers;

    function renderRun(runItems) {
      return runItems.map((item, idx) => {
        const html = buildCartItemHTML(item, isDemo, interactive);
        const isLastOfRun = idx === runItems.length - 1;
        return (dividersEnabled && !isLastOfRun) ? html + '<div class="cart-item-divider"></div>' : html;
      }).join("");
    }

    const segments = Array.isArray(config.segments) ? config.segments.filter(s => (s.productIds || []).length) : [];
    let html;
    if (!segments.length) {
      html = renderRun(items);
    } else {
      const remaining = items.slice();
      html = "";
      segments.forEach(segment => {
        const ids = new Set(segment.productIds);
        const groupItems = remaining.filter(item => item.productId && ids.has(item.productId));
        if (!groupItems.length) return;
        groupItems.forEach(item => {
          const idx = remaining.indexOf(item);
          if (idx > -1) remaining.splice(idx, 1);
        });
        const segmentInner = `<div class="cart-segment" data-segment-id="${esc(segment.id)}">${renderRun(groupItems)}</div>${segment.showDivider ? '<div class="cart-item-divider"></div>' : ""}`;
        html += window.WebBuilderCartHtml.wrapComponent(segmentInner, `segment:${segment.id}`, interactive);
      });
      html += renderRun(remaining);
    }
    return html;
  }

  window.WebBuilderCartHtml = Object.assign(window.WebBuilderCartHtml || {}, {
    buildRecommendCardContentHtml, buildCartItemHTML, buildItemsHtml
  });
})();
