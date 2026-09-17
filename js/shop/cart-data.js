// js/shop/cart-data.js
// WebBuilder cart data domain
// Owns cart data only: items, config, recommendations, milestones,
// normalization. No DOM/rendering — that lives in cart-render.js (shared
// drawer/editor HTML + drawer bindings) and cart-editor.js (the focus
// editor stage). Product management lives in products.js; cart-data
// references products only by ID via window.WebBuilderProducts, no
// duplicated product data.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCart: WebBuilderState is not available."); return; }
  const clone = value => JSON.parse(JSON.stringify(value));
  function notify(domain, action, payload) { if (typeof state.notify === "function") state.notify(domain, action, payload); }

  // Fixed palette for the quantity +/- buttons — deliberately a closed
  // set (not a free color picker) so the buttons stay legible against any
  // item background. Used by shop/cart-render.js.
  const QUANTITY_BUTTON_COLORS = { green: "#10b981", red: "#ef4444", black: "#111827", gray: "#6b7280" };
  function quantityColorHex(key) { return QUANTITY_BUTTON_COLORS[key] || QUANTITY_BUTTON_COLORS.black; }

  // T6: closed set of currency presets (symbol + position relative to the
  // amount + decimal separator). "eur" matches the previous hardcoded
  // formatting exactly, so untouched projects render byte-identical.
  // Locale-correct decimal separators beyond this are explicitly out of
  // scope (see docs/CART_EDITOR_TASKS.md T6).
  const CURRENCY_PRESETS = {
    eur: { symbol: "€", position: "after", decimal: "," },
    usd: { symbol: "$", position: "before", decimal: "." },
    gbp: { symbol: "£", position: "before", decimal: "." }
  };
  // Shared formatter — used by cart-render.js instead of its own local
  // eur() helper, and by the shipping/discount amount fields, so every
  // price in the cart uses one consistent currency everywhere.
  function formatCurrency(value) {
    const currency = getConfig()?.currency || CURRENCY_PRESETS.eur;
    const amount = Number(value || 0).toFixed(2).replace(".", currency.decimal || ",");
    const symbol = currency.symbol || "€";
    return currency.position === "before" ? `${symbol}${amount}` : `${amount} ${symbol}`;
  }

  function normalizeCartItem(item = {}) {
    const price = Number(item.price) || 0;
    const discountPrice = item.discountPrice != null && item.discountPrice !== "" ? Number(item.discountPrice) || 0 : null;
    return {
      id: item.id || `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      // Reference back to the source product (reliable "already in cart?"
      // checks for recommendations). Optional — old saved cart items
      // without it just fall back to name-matching, see
      // pickRecommendation() below.
      productId: item.productId || null,
      name: item.name || "Produkt",
      price,
      discountPrice: discountPrice != null && discountPrice > 0 && discountPrice < price ? discountPrice : null,
      qty: Math.max(1, Number(item.qty) || 1),
      icon: item.icon || "📦",
      description: item.description || ""
    };
  }
  function getEffectivePrice(item) { const discount = Number(item?.discountPrice); return Number.isFinite(discount) && discount > 0 && discount < (Number(item?.price) || 0) ? discount : Number(item?.price) || 0; }

  // ------------------------------------------------------------------
  // Recommendations — each entry is a small rule object instead of a
  // bare product ID, so text/alternative/condition can be configured per
  // recommendation. Legacy projects stored plain ID strings; those are
  // migrated transparently by normalizeRecommendation().
  // ------------------------------------------------------------------
  function defaultRecommendationText() { return "Das könnte dir auch gefallen"; }

  function normalizeRecommendation(entry) {
    const rec = typeof entry === "string" ? { productId: entry } : (entry || {});
    const cond = rec.condition && typeof rec.condition === "object" ? rec.condition : {};
    return {
      id: rec.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      productId: rec.productId || null,
      alternativeProductId: rec.alternativeProductId || null,
      text: rec.text || defaultRecommendationText(),
      // type: "none" | "cartCountEquals" | "cartCountAtLeast" | "subtotalBelow" | "subtotalAbove"
      condition: { type: cond.type || "none", value: Number(cond.value) || 0 }
    };
  }
  // Normalizes in place (WebBuilderUtils.normalizeInPlace): a fresh
  // .map(normalizeRecommendation) here would replace every recommendation
  // object on each normalize pass, which runs before every history commit
  // (see armHistory()) — a caller's own patch on the previous object
  // reference would then silently miss the live array. Same reference-
  // stability requirement as normalizeCartItem() above.
  function normalizeRecommendations(list) {
    return window.WebBuilderUtils.normalizeInPlace(Array.isArray(list) ? list : [], normalizeRecommendation);
  }

  // ------------------------------------------------------------------
  // Dividers — freely placeable separator lines. Each entry is just an
  // id; its position lives in cartConfig.componentLayout["divider:<id>"],
  // exactly like every other positionable component (see
  // js/shop/cart-render.js buildCartParts() and js/shop/cart-editor.js).
  // ------------------------------------------------------------------
  function normalizeDivider(entry = {}) {
    return { id: (entry && entry.id) || `div_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  }

  // ------------------------------------------------------------------
  // Product segments — group specific products in the cart under a
  // named header/divider (e.g. "Zubehör"), independent of the freely
  // draggable dividers from cartConfig.dividers above. Each segment
  // references products by id (not cart items directly, same reasoning
  // as recommendations: persistent identity via window.WebBuilderProducts
  // instead of the ephemeral per-session cart item ids).
  // ------------------------------------------------------------------
  function normalizeSegment(entry = {}) {
    return {
      id: entry.id || `seg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: entry.name || "Neues Segment",
      productIds: Array.isArray(entry.productIds) ? entry.productIds.filter(Boolean) : [],
      showDivider: entry.showDivider !== false
    };
  }
  function normalizeSegments(list) {
    return window.WebBuilderUtils.normalizeInPlace(Array.isArray(list) ? list : [], normalizeSegment);
  }

  const CONDITION_LABELS = {
    none: "Immer anzeigen",
    cartCountEquals: "Nur bei genau X Artikeln im Warenkorb",
    cartCountAtLeast: "Ab X Artikeln im Warenkorb",
    subtotalBelow: "Wenn Warenkorbwert unter X €",
    subtotalAbove: "Wenn Warenkorbwert über X €"
  };

  // "count" = Summe aller Mengen im (übergebenen) Warenkorb, nicht die
  // Anzahl unterschiedlicher Produkte.
  function conditionMatches(condition, ctx) {
    const type = condition?.type || "none";
    const value = Number(condition?.value) || 0;
    switch (type) {
      case "cartCountEquals": return ctx.count === value;
      case "cartCountAtLeast": return ctx.count >= value;
      case "subtotalBelow": return ctx.subtotal < value;
      case "subtotalAbove": return ctx.subtotal > value;
      default: return true;
    }
  }

  // Finds the first matching recommendation for the given cart contents.
  // If its primary product is already in the cart, falls back to the
  // configured alternative (if any and if that one isn't also in the cart).
  //
  // opts.isDemo must be set when `items` is the synthetic placeholder cart
  // item built by cart-editor.js renderFocusStage() for an empty real
  // cart — that demo item must not feed the "already in cart" exclusion
  // below, or a recommendation pointing at the same product the demo item
  // happens to show gets silently swallowed. count/subtotal still come
  // from `items` unchanged, so the condition types keep reacting normally
  // in the editor preview — only the in-cart exclusion is skipped.
  function pickRecommendation(items, subtotal, opts = {}) {
    const list = Array.isArray(getConfig()?.recommendations) ? getConfig().recommendations : [];
    if (!list.length) return null;
    const count = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const inCartItems = opts.isDemo ? [] : items;
    const inCartIds = new Set(inCartItems.map(i => i.productId).filter(Boolean));
    const inCartNames = new Set(inCartItems.map(i => i.name));
    for (const rec of list) {
      if (!conditionMatches(rec.condition, { count, subtotal })) continue;
      let product = rec.productId ? window.WebBuilderProducts?.getById?.(rec.productId) : null;
      const primaryInCart = product && (inCartIds.has(product.id) || inCartNames.has(product.name));
      if (primaryInCart) {
        product = rec.alternativeProductId ? window.WebBuilderProducts?.getById?.(rec.alternativeProductId) : null;
        if (!product) continue;
        if (inCartIds.has(product.id) || inCartNames.has(product.name)) continue;
      }
      if (!product) continue;
      return { rec, product };
    }
    return null;
  }

  // Normalizes in place (WebBuilderUtils.normalizeInPlace) so references
  // stay stable during active quantity/price edits.
  function normalizeState() {
    window.WebBuilderProducts?.normalizeState?.();
    state.cartItems = window.WebBuilderUtils.normalizeInPlace(state.cartItems, normalizeCartItem);
    state.cartConfig.recommendations = normalizeRecommendations(state.cartConfig.recommendations);
    if (!Array.isArray(state.cartConfig.milestones)) state.cartConfig.milestones = [];
    // Defensive defaults for projects saved before these fields existed.
    if (!state.cartConfig.itemDisplay || typeof state.cartConfig.itemDisplay !== "object") state.cartConfig.itemDisplay = {};
    if (!state.cartConfig.itemDisplay.layout || typeof state.cartConfig.itemDisplay.layout !== "object") state.cartConfig.itemDisplay.layout = {};
    if (state.cartConfig.discountButtonColor == null) state.cartConfig.discountButtonColor = "#4f46e5";
    if (state.cartConfig.discountButtonShape == null) state.cartConfig.discountButtonShape = "rounded";
    // Fill color of the progress bar track.
    if (state.cartConfig.progressBarColor == null) state.cartConfig.progressBarColor = "#10b981";
    // Editierbarer Fallback-Text, wenn kein weiterer Meilenstein mehr
    // folgt UND der zuletzt erreichte Meilenstein selbst kein eigenes
    // reachedText gesetzt hat (siehe js/shop/cart-render.js
    // buildCartParts() progressMsg-Berechnung).
    if (state.cartConfig.progressCompleteText == null) state.cartConfig.progressCompleteText = "✓ Alle Ziele freigeschaltet";
    // Quantity selector "group" variant shape + the closed +/- color
    // palette. Defaults keep existing projects' look unchanged (stepper
    // style, black buttons) until explicitly edited.
    if (state.cartConfig.itemDisplay.quantityGroupShape == null) state.cartConfig.itemDisplay.quantityGroupShape = "rounded";
    if (state.cartConfig.itemDisplay.quantityButtonColor == null) state.cartConfig.itemDisplay.quantityButtonColor = "black";
    // Divider between items on a transparent item shape — default false,
    // so existing projects look unchanged until explicitly enabled.
    if (state.cartConfig.itemDisplay.showItemDividers == null) state.cartConfig.itemDisplay.showItemDividers = false;
    // Cart editor: per-component position offsets (progress, discount,
    // recommend, checkout, totals, dividers) plus "Artikel-Darstellung"
    // background/size overrides. Empty string / null mean "no override,
    // use the shape's/CSS's own default" so existing projects keep their
    // exact current look until someone explicitly customizes these.
    if (!state.cartConfig.componentLayout || typeof state.cartConfig.componentLayout !== "object") state.cartConfig.componentLayout = {};
    if (state.cartConfig.itemBackgroundColor == null) state.cartConfig.itemBackgroundColor = "";
    if (state.cartConfig.cardBackgroundColor == null) state.cartConfig.cardBackgroundColor = "";
    // Hintergrundfarbe des Fußbereichs (component:footer, enthält den
    // Zur-Kasse-Button) — unabhängig von cardBackgroundColor (der Karte
    // selbst). Leer = Default aus css/modals.css (.drawer-footer,
    // var(--bg-main)), damit unveränderte Projekte unverändert aussehen.
    if (state.cartConfig.footerBackgroundColor == null) state.cartConfig.footerBackgroundColor = "";
    if (state.cartConfig.itemWidth === undefined) state.cartConfig.itemWidth = null;
    if (state.cartConfig.itemMinHeight === undefined) state.cartConfig.itemMinHeight = null;
    // Editable title of the cart drawer/editor header (e.g. "Dein
    // Warenkorb"). Default matches the previously hardcoded string
    // exactly, so existing projects render byte-identical until changed.
    if (state.cartConfig.cartTitleLabel == null) state.cartConfig.cartTitleLabel = "Dein Warenkorb";
    // "Kosten-Übersicht" (component:totals, cart-editor.js): editable
    // labels for the subtotal/discount/shipping/total rows. Versand ist
    // seit T5 wieder Teil dieses Blocks (keine eigene Komponente mehr),
    // die Felder selbst bleiben unverändert erhalten.
    if (state.cartConfig.subtotalLabel == null) state.cartConfig.subtotalLabel = "Zwischensumme";
    if (state.cartConfig.discountLabel == null) state.cartConfig.discountLabel = "Rabatt";
    if (state.cartConfig.shippingLabel == null) state.cartConfig.shippingLabel = "Versand";
    if (state.cartConfig.shippingCost == null) state.cartConfig.shippingCost = 4.95;
    if (state.cartConfig.shippingFreeText == null) state.cartConfig.shippingFreeText = "Kostenlos";
    // Optionales Freibetrag-Ziel (Warenkorbwert, ab dem der Versand
    // automatisch kostenlos wird) — unabhängig von einem "Kostenloser
    // Versand"-Meilenstein, aber mit einem solchen bidirektional
    // synchronisiert, falls er existiert (siehe syncFreeShippingMilestone()
    // unten sowie den ".ms-amount"/".ms-action"-Sync in
    // js/shop/cart-render.js renderMilestoneList()). null = kein
    // automatisches Ziel konfiguriert, unverändertes Verhalten.
    if (state.cartConfig.shippingFreeThreshold === undefined) state.cartConfig.shippingFreeThreshold = null;
    // Meilenstein-getriebener Extra-Rabatt. milestoneDiscountPercent
    // ersetzt den früher in js/shop/cart-render.js hartkodierten Wert 10 —
    // der Default ist deshalb exakt 10, damit bestehende Projekte
    // identisch rechnen. milestoneDiscountThreshold ist wie
    // shippingFreeThreshold nullable ("kein automatisches Ziel") und wird
    // bidirektional mit einem Meilenstein mit action "discount"
    // synchronisiert (siehe syncDiscountMilestone() unten + der
    // ".ms-amount"/".ms-action"-Sync in js/shop/cart-render.js
    // renderMilestoneList()).
    if (state.cartConfig.milestoneDiscountPercent == null) state.cartConfig.milestoneDiscountPercent = 10;
    if (state.cartConfig.milestoneDiscountThreshold === undefined) state.cartConfig.milestoneDiscountThreshold = null;
    if (state.cartConfig.totalLabel == null) state.cartConfig.totalLabel = "Gesamt";
    // "Gratis-Produkt"-Zeile in der Kosten-Übersicht — Label und Wert-Text
    // sind editierbar. Defaults entsprechen exakt dem früheren
    // hartkodierten Text, damit bestehende Projekte unverändert bleiben.
    if (state.cartConfig.freeProductLabel == null) state.cartConfig.freeProductLabel = "🎁 Gratis-Produkt";
    if (state.cartConfig.freeProductValueText == null) state.cartConfig.freeProductValueText = "freigeschaltet";
    // T6: Trennlinien sind jetzt eine beliebig wiederholbare Komponente
    // (gleiches Muster wie recommendations/milestones: eigenständige
    // Einträge mit eigener id) statt der früheren einzelnen, fest in der
    // Kosten-Übersicht sitzenden Linie (totalsDividerEnabled). Jede
    // Trennlinie ist über componentLayout["divider:<id>"] frei
    // positionierbar, genau wie jede andere Komponente.
    state.cartConfig.dividers = window.WebBuilderUtils.normalizeInPlace(
      Array.isArray(state.cartConfig.dividers) ? state.cartConfig.dividers : [],
      normalizeDivider
    );
    // Migration der alten Einzel-Trennlinie inklusive ihres bisherigen
    // Positions-Offsets. Danach werden beide Alt-Felder entfernt, damit
    // sie nicht als Leiche im Snapshot weiterleben.
    if (state.cartConfig.totalsDividerEnabled) {
      const migrated = normalizeDivider({});
      state.cartConfig.dividers.push(migrated);
      const oldLayout = state.cartConfig.componentLayout.totalsDivider;
      if (oldLayout) state.cartConfig.componentLayout[`divider:${migrated.id}`] = oldLayout;
    }
    delete state.cartConfig.totalsDividerEnabled;
    delete state.cartConfig.componentLayout.totalsDivider;
    // Empfehlungskarte — Form + Farbe des "+"-Buttons, sowie eine eigene
    // Positions-Map für ihre Unterteile (Icon/Name/Preis/Plus). Eigene Map
    // statt itemDisplay.layout, da die Empfehlungskarte kein Warenkorb-
    // Artikel ist (anderes Elternelement) — siehe js/shop/cart-render.js
    // buildRecommendCardContentHtml() und js/shop/cart-editor.js
    // resolveLayoutMap().
    if (state.cartConfig.recommendShape == null) state.cartConfig.recommendShape = "rounded";
    if (state.cartConfig.recommendAddButtonColor == null) state.cartConfig.recommendAddButtonColor = "#4f46e5";
    if (!state.cartConfig.recommendDisplay || typeof state.cartConfig.recommendDisplay !== "object") state.cartConfig.recommendDisplay = {};
    if (!state.cartConfig.recommendDisplay.layout || typeof state.cartConfig.recommendDisplay.layout !== "object") state.cartConfig.recommendDisplay.layout = {};
    // Bounded, internally scrollable "products box": when set, the item
    // list gets its own max-height + scrollbar so the discount field,
    // recommendation and Kosten-Übersicht below stay visible without the
    // visitor first having to scroll past a long product list. null = no
    // cap, items just stack as before (unchanged behavior by default).
    if (state.cartConfig.itemsListMaxHeight === undefined) state.cartConfig.itemsListMaxHeight = null;
    // Product segments — see normalizeSegment()/normalizeSegments() above.
    state.cartConfig.segments = normalizeSegments(state.cartConfig.segments);
    // Global currency. Default matches the previously hardcoded
    // "19,99 €"-style formatting exactly, so existing projects render
    // byte-identical until someone explicitly picks a different currency.
    if (!state.cartConfig.currency || typeof state.cartConfig.currency !== "object") {
      state.cartConfig.currency = Object.assign({}, CURRENCY_PRESETS.eur);
    }
    return state;
  }
  function getItems() { return state.cartItems; }
  function getConfig() { return state.cartConfig; }
  function getCount() { return state.cartItems.reduce((s, i) => s + (Number(i.qty) || 0), 0); }
  function getSubtotal() { return state.cartItems.reduce((s, i) => s + getEffectivePrice(i) * (Number(i.qty) || 0), 0); }
  function addItem(productOrItem, price, icon, description, recordHistory = true) {
    const source = typeof productOrItem === "object" ? productOrItem : { name: productOrItem, price, icon, description };
    const normalized = normalizeCartItem(Object.assign({}, source, { productId: source.productId || source.id || null }));
    const existing = state.cartItems.find(i => i.name === normalized.name);
    if (recordHistory) window.WebBuilderHistory?.arm();
    if (existing) existing.qty = (Number(existing.qty) || 0) + 1;
    else state.cartItems.push(normalized);
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", existing ? "increment" : "add", existing || normalized);
    return existing || normalized;
  }
  function updateQty(id, qty, recordHistory = true) { const item = state.cartItems.find(i => i?.id === id); if (!item) return null; if (recordHistory) window.WebBuilderHistory?.arm(); item.qty = Math.max(1, Number(qty) || 1); if (recordHistory) window.WebBuilderHistory?.commit(); notify("cart", "updateQty", item); return item; }
  function changeQty(id, delta, recordHistory = true) { const item = state.cartItems.find(i => i?.id === id); if (!item) return null; const next = (Number(item.qty) || 0) + (Number(delta) || 0); return next <= 0 ? removeItem(id, recordHistory) : updateQty(id, next, recordHistory); }
  function updatePrice(id, price, recordHistory = true) { const item = state.cartItems.find(i => i?.id === id); if (!item) return null; if (recordHistory) window.WebBuilderHistory?.arm(); item.price = Number(price) || 0; if (item.discountPrice != null && item.discountPrice >= item.price) item.discountPrice = null; if (recordHistory) window.WebBuilderHistory?.commit(); notify("cart", "updatePrice", item); return item; }
  function updateDiscountPrice(id, value, recordHistory = true) { const item = state.cartItems.find(i => i?.id === id); if (!item) return null; if (recordHistory) window.WebBuilderHistory?.arm(); const v = Number(value); item.discountPrice = Number.isFinite(v) && v > 0 && v < (Number(item.price) || 0) ? v : null; if (recordHistory) window.WebBuilderHistory?.commit(); notify("cart", "updateDiscountPrice", item); return item; }
  function removeItem(id, recordHistory = true) { const i = state.cartItems.findIndex(x => x?.id === id); if (i < 0) return false; if (recordHistory) window.WebBuilderHistory?.arm(); const removed = state.cartItems.splice(i, 1)[0]; if (recordHistory) window.WebBuilderHistory?.commit(); notify("cart", "remove", removed); return true; }
  function clear(recordHistory = true) { if (!state.cartItems.length) return; if (recordHistory) window.WebBuilderHistory?.arm(); state.cartItems.length = 0; if (recordHistory) window.WebBuilderHistory?.commit(); notify("cart", "clear"); }
  function setConfig(patch = {}, recordHistory = true) { if (recordHistory) window.WebBuilderHistory?.arm(); Object.assign(state.cartConfig, clone(patch)); if (recordHistory) window.WebBuilderHistory?.commit(); notify("cart", "config", state.cartConfig); return state.cartConfig; }
  function setItemDisplay(patch = {}, recordHistory = true) { if (recordHistory) window.WebBuilderHistory?.arm(); state.cartConfig.itemDisplay = Object.assign({}, state.cartConfig.itemDisplay || {}, clone(patch)); if (recordHistory) window.WebBuilderHistory?.commit(); notify("cart", "display", state.cartConfig.itemDisplay); return state.cartConfig.itemDisplay; }
  function setButtonLabel(label, recordHistory = true) { if (recordHistory) window.WebBuilderHistory?.arm(); state.cartButtonLabel = String(label || "Zur Kasse gehen"); if (recordHistory) window.WebBuilderHistory?.commit(); notify("cart", "button-label", state.cartButtonLabel); return state.cartButtonLabel; }

  // Demo discount code: "DEMO10" = -10%. `container` is the `.cart-discount`
  // wrapper the click came from — the drawer and the editor stage can both
  // render a discount field at the same time, so the input can no longer
  // be looked up by a page-wide id (see cart-render.js buildCartHtml()).
  function applyDiscountCode(container) {
    const input = container?.querySelector(".cart-discount-input");
    const code = (input?.value || "").trim().toUpperCase();
    if (code === "DEMO10") {
      state.appliedDiscountPercent = 10;
      state.appliedDiscountLabel = 'Code „DEMO10“ angewendet (−10%).';
    } else {
      state.appliedDiscountPercent = 0;
      state.appliedDiscountLabel = code ? "Ungültiger Code (Demo-Code: DEMO10)." : "";
    }
  }

  // Recommendations store product IDs only, no duplicated product data.
  function addRecommendation(productId) {
    if (!productId || !window.WebBuilderProducts?.getById?.(productId)) return null;
    window.WebBuilderHistory?.arm();
    if (!Array.isArray(state.cartConfig.recommendations)) state.cartConfig.recommendations = [];
    const rec = normalizeRecommendation({ productId });
    state.cartConfig.recommendations.push(rec);
    window.WebBuilderHistory?.commit();
    notify("cart", "recommendations", state.cartConfig.recommendations);
    return rec;
  }
  function removeRecommendation(recId) {
    window.WebBuilderHistory?.arm();
    state.cartConfig.recommendations = (state.cartConfig.recommendations || []).filter(r => r.id !== recId);
    window.WebBuilderHistory?.commit();
    notify("cart", "recommendations", state.cartConfig.recommendations);
  }
  function updateRecommendation(recId, patch = {}, recordHistory = true) {
    const rec = (state.cartConfig.recommendations || []).find(r => r.id === recId);
    if (!rec) return null;
    if (recordHistory) window.WebBuilderHistory?.arm();
    if (patch.text !== undefined) rec.text = patch.text;
    if (patch.alternativeProductId !== undefined) rec.alternativeProductId = patch.alternativeProductId || null;
    if (patch.condition !== undefined) rec.condition = { type: patch.condition.type || "none", value: Number(patch.condition.value) || 0 };
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "recommendations", state.cartConfig.recommendations);
    return rec;
  }

  // T6: Trennlinien. Eine neue Linie startet ohne Offset (also an ihrer
  // natürlichen Flussposition oben im Warenkorb-Körper) und wird danach
  // im Editor an die gewünschte Stelle gezogen. removeDivider() räumt
  // auch den zugehörigen componentLayout-Eintrag mit auf.
  function addDivider() {
    window.WebBuilderHistory?.arm();
    if (!Array.isArray(state.cartConfig.dividers)) state.cartConfig.dividers = [];
    const divider = normalizeDivider({});
    state.cartConfig.dividers.push(divider);
    window.WebBuilderHistory?.commit();
    notify("cart", "dividers", state.cartConfig.dividers);
    return divider;
  }
  function removeDivider(dividerId) {
    window.WebBuilderHistory?.arm();
    state.cartConfig.dividers = (state.cartConfig.dividers || []).filter(d => d.id !== dividerId);
    delete state.cartConfig.componentLayout[`divider:${dividerId}`];
    window.WebBuilderHistory?.commit();
    notify("cart", "dividers", state.cartConfig.dividers);
  }

  // Product segments. addSegment() takes the full patch at once (name/
  // productIds/showDivider) so creating one from the sidebar modal is a
  // single history step instead of an add-then-immediately-update pair.
  function addSegment(patch = {}) {
    window.WebBuilderHistory?.arm();
    if (!Array.isArray(state.cartConfig.segments)) state.cartConfig.segments = [];
    const segment = normalizeSegment(patch);
    state.cartConfig.segments.push(segment);
    window.WebBuilderHistory?.commit();
    notify("cart", "segments", state.cartConfig.segments);
    return segment;
  }
  function updateSegment(segmentId, patch = {}, recordHistory = true) {
    const segment = (state.cartConfig.segments || []).find(s => s.id === segmentId);
    if (!segment) return null;
    if (recordHistory) window.WebBuilderHistory?.arm();
    if (patch.name !== undefined) segment.name = patch.name || "Neues Segment";
    if (patch.productIds !== undefined) segment.productIds = Array.isArray(patch.productIds) ? patch.productIds.filter(Boolean) : [];
    if (patch.showDivider !== undefined) segment.showDivider = !!patch.showDivider;
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "segments", state.cartConfig.segments);
    return segment;
  }
  function removeSegment(segmentId) {
    window.WebBuilderHistory?.arm();
    state.cartConfig.segments = (state.cartConfig.segments || []).filter(s => s.id !== segmentId);
    window.WebBuilderHistory?.commit();
    notify("cart", "segments", state.cartConfig.segments);
  }

  // Progress-bar milestones. `icon` is an optional emoji/short text shown
  // once the milestone is reached, `reachedText` is an optional custom
  // message shown in the progress area once this milestone is the
  // highest one reached and no further milestone follows (see
  // cart-render.js buildCartParts()).
  function addMilestone() {
    window.WebBuilderHistory?.arm();
    if (!Array.isArray(state.cartConfig.milestones)) state.cartConfig.milestones = [];
    state.cartConfig.milestones.push({ id: `ms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, amount: 50, label: "Kostenloser Versand", action: "free-shipping", icon: "🚚", reachedText: "" });
    window.WebBuilderHistory?.commit();
    notify("cart", "milestones", state.cartConfig.milestones);
  }
  function removeMilestone(id) {
    window.WebBuilderHistory?.arm();
    state.cartConfig.milestones = (state.cartConfig.milestones || []).filter(m => m.id !== id);
    window.WebBuilderHistory?.commit();
    notify("cart", "milestones", state.cartConfig.milestones);
  }

  // Keeps a "free-shipping" milestone's amount and
  // cartConfig.shippingFreeThreshold in sync. Called from the shipping
  // fields in the Kosten-Übersicht panel (js/shop/cart-editor.js) whenever
  // it changes; the reverse direction (editing the milestone's own
  // amount/action) is handled directly in js/shop/cart-render.js
  // renderMilestoneList(). Returns false (no-op) when no free-shipping
  // milestone exists yet — the threshold still applies on its own in that
  // case (see js/shop/cart-render.js buildCartParts()'s "free"
  // calculation).
  function syncFreeShippingMilestone(amount, recordHistory = true) {
    const milestone = (state.cartConfig.milestones || []).find(m => m.action === "free-shipping");
    if (!milestone) return false;
    if (recordHistory) window.WebBuilderHistory?.arm();
    milestone.amount = amount;
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "milestones", state.cartConfig.milestones);
    return true;
  }

  // Exaktes Pendant zu syncFreeShippingMilestone() — hält den Meilenstein
  // mit action "discount" und cartConfig.milestoneDiscountThreshold
  // synchron. Aufgerufen aus dem Rabatt-Panel (js/shop/cart-editor.js);
  // die Rückrichtung (Bearbeiten von amount/action direkt in der
  // Meilenstein-Liste) liegt in js/shop/cart-render.js
  // renderMilestoneList(). Rückgabe false = kein passender Meilenstein
  // vorhanden; das Ziel gilt trotzdem eigenständig (siehe
  // "extra"-Berechnung in js/shop/cart-render.js buildCartParts()).
  function syncDiscountMilestone(amount, recordHistory = true) {
    const milestone = (state.cartConfig.milestones || []).find(m => m.action === "discount");
    if (!milestone) return false;
    if (recordHistory) window.WebBuilderHistory?.arm();
    milestone.amount = amount;
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "milestones", state.cartConfig.milestones);
    return true;
  }

  normalizeState();
  window.WebBuilderCart = {
    getItems, getConfig, getCount, getSubtotal, getEffectivePrice,
    addItem, updateQty, changeQty, updatePrice, updateDiscountPrice, removeItem, clear,
    setConfig, setItemDisplay, setButtonLabel,
    normalizeCartItem, normalizeState,
    applyDiscountCode,
    addRecommendation, removeRecommendation, updateRecommendation,
    addDivider, removeDivider,
    addSegment, updateSegment, removeSegment,
    addMilestone, removeMilestone, syncFreeShippingMilestone, syncDiscountMilestone,
    // Internal helpers also used by shop/cart-render.js and
    // shop/cart-editor.js (kept here since they operate on the cart data/
    // config shape owned by this file).
    quantityColorHex, formatCurrency, CURRENCY_PRESETS, pickRecommendation, defaultRecommendationText, CONDITION_LABELS
  };
})();
