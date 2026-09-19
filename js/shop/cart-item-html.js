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
  // matters.
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

  // Builds one cart-row's HTML, based on cartConfig.itemDisplay. The
  // per-part pixel offset (cartConfig.itemDisplay.layout) is applied
  // unconditionally, so positioning changes made in the editor also show
  // up in the real drawer/preview, not just on stage.
  function buildCartItemHTML(item, isDemo, interactive = false) {
    const config = cart.getConfig() || {};
    const disp = config.itemDisplay || {};
    const layout = disp.layout || {};
    const idAttr = isDemo ? "" : ` data-cart-id="${esc(item.id)}"`;

    function wrapPart(innerHtml, partKey) {
      return wrapLayoutPart(innerHtml, partKey, layout, partKey, interactive, false);
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
      priceHtml = `<span>${hasDiscount ? `<s class="cart-item-price-strike">${eur(item.price)}</s> ` : ""}${eur(effective)}</span>`;
    } else {
      priceHtml = `<input type="number" class="cart-item-price-input" data-cart-id="${esc(item.id)}" value="${Number(item.price || 0).toFixed(2)}" step="0.01" />`;
    }
    priceHtml = wrapPart(priceHtml, "price");

    const titleHtml = wrapPart(`<span class="cart-item-title">${item.icon ? esc(item.icon) + " " : ""}${esc(item.name)}</span>`, "icon");
    const descHtml = disp.showDescription && item.description ? wrapPart(`<div class="cart-item-desc">${esc(item.description)}</div>`, "description") : "";

    // Individual item look, set via the cart editor's "component:items"
    // panel (see cart-editor-panel.js) — applies to every row identically,
    // same "empty/null = use the shape class's own default" convention as
    // cartConfig.cardBackgroundColor.
    const itemShapeClass = "cart-item-" + (config.itemShape === "square" ? "square" : (config.itemShape === "pill" ? "pill" : (config.itemShape === "transparent" ? "transparent" : "rounded")));
    const itemStyleParts = [];
    if (config.itemBackgroundColor) itemStyleParts.push(`background-color:${config.itemBackgroundColor};`);
    if (config.itemWidth != null) itemStyleParts.push(`width:${Number(config.itemWidth) || 0}px; max-width:100%;`);
    if (config.itemMinHeight != null) itemStyleParts.push(`min-height:${Number(config.itemMinHeight) || 0}px;`);
    const itemStyleAttr = itemStyleParts.length ? ` style="${itemStyleParts.join(" ")}"` : "";

    return `<div class="cart-item ${itemShapeClass}"${idAttr}${itemStyleAttr}>
      ${titleHtml}
      ${qtyHtml}
      ${priceHtml}
      ${removeBtn}
      ${descHtml}
    </div>`;
  }

  // Alle Artikel werden ohne Gruppierung nacheinander gerendert — sie
  // sitzen gemeinsam in einer einzigen, fest hohen Box mit eigenem
  // Scrollbalken (siehe shop/cart-html.js buildCartParts()).
  function buildItemsHtml(items, isDemo, interactive) {
    if (!items.length) return '<p class="cart-empty-msg">Dein Warenkorb ist leer.</p>';
    return items.map(item => buildCartItemHTML(item, isDemo, interactive)).join("");
  }

  window.WebBuilderCartHtml = Object.assign(window.WebBuilderCartHtml || {}, {
    buildRecommendCardContentHtml, buildCartItemHTML, buildItemsHtml
  });
})();
