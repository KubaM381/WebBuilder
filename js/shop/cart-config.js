// js/shop/cart-config.js
// Cart config core: getConfig/setConfig, currency, discount code, and
// normalizeState() — the single orchestrator that also calls into
// cart-items.js/cart-recommendations.js/cart-milestones.js via
// window.WebBuilderCart. Loads last of the four cart-*.js data files so
// every normalize function it depends on is already attached before the
// initial normalizeState() call below runs.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCart: WebBuilderState is not available."); return; }
  const clone = value => JSON.parse(JSON.stringify(value));
  function notify(domain, action, payload) { state.notify?.(domain, action, payload); }

  const QUANTITY_BUTTON_COLORS = { green: "#10b981", red: "#ef4444", black: "#111827", gray: "#6b7280" };
  function quantityColorHex(key) { return QUANTITY_BUTTON_COLORS[key] || QUANTITY_BUTTON_COLORS.black; }

  const CURRENCY_PRESETS = {
    eur: { symbol: "€", position: "after", decimal: "," },
    usd: { symbol: "$", position: "before", decimal: "." },
    gbp: { symbol: "£", position: "before", decimal: "." }
  };
  function formatCurrency(value) {
    const currency = getConfig()?.currency || CURRENCY_PRESETS.eur;
    const amount = Number(value || 0).toFixed(2).replace(".", currency.decimal || ",");
    const symbol = currency.symbol || "€";
    return currency.position === "before" ? `${symbol}${amount}` : `${amount} ${symbol}`;
  }

  // Products-list ("Produkte" component) is a fixed minimum height, not
  // user-resizable — the actual box height is computed dynamically at
  // render time (see cart-drawer.js fitItemsBox()) to fill whatever room
  // the rest of the cart leaves over. ITEMS_BOX_ITEM_HEIGHT is only used
  // as that computation's absolute floor.
  const ITEMS_BOX_ITEM_HEIGHT = 64;
  const ITEMS_BOX_DEFAULT_HEIGHT = ITEMS_BOX_ITEM_HEIGHT * 5;

  // Placeholder token for the live item count inside cartConfig.cartTitleLabel.
  const TITLE_COUNT_PLACEHOLDER = "{anzahl}";

  function getConfig() { return state.cartConfig; }

  function setConfig(patch = {}, recordHistory = true) {
    if (recordHistory) window.WebBuilderHistory?.arm();
    Object.assign(state.cartConfig, clone(patch));
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "config", state.cartConfig);
    return state.cartConfig;
  }

  function setItemDisplay(patch = {}, recordHistory = true) {
    if (recordHistory) window.WebBuilderHistory?.arm();
    state.cartConfig.itemDisplay = Object.assign({}, state.cartConfig.itemDisplay || {}, clone(patch));
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "display", state.cartConfig.itemDisplay);
    return state.cartConfig.itemDisplay;
  }

  // Parallel to setItemDisplay(), but for the recommendation card's own
  // display settings (currently just its price style — position offsets
  // for its sub-parts live under recommendDisplay.layout instead, see
  // cart-editor-stage.js resolveLayoutMap()).
  function setRecommendDisplay(patch = {}, recordHistory = true) {
    if (recordHistory) window.WebBuilderHistory?.arm();
    state.cartConfig.recommendDisplay = Object.assign({}, state.cartConfig.recommendDisplay || {}, clone(patch));
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "recommend-display", state.cartConfig.recommendDisplay);
    return state.cartConfig.recommendDisplay;
  }

  function setButtonLabel(label, recordHistory = true) {
    if (recordHistory) window.WebBuilderHistory?.arm();
    state.cartButtonLabel = String(label || "Zur Kasse gehen");
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "button-label", state.cartButtonLabel);
    return state.cartButtonLabel;
  }

  // Demo discount code: "DEMO10" = -10%. `container` is the `.cart-discount`
  // wrapper the click came from, since the drawer and the editor stage can
  // both render a discount field at once (no page-wide id lookup).
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

  // Simple scalar defaults applied to a saved (or brand-new) cartConfig
  // whenever the field is still unset. Dotted paths reach one level into
  // an already-guaranteed-to-exist nested object.
  const CONFIG_DEFAULTS = {
    "itemDisplay.quantityGroupShape": "rounded",
    "itemDisplay.quantityButtonColor": "black",
    "recommendDisplay.priceStyle": "simple",
    itemShape: "rounded",
    itemBackgroundColor: "",
    itemWidth: null,
    itemMinHeight: null,
    discountButtonColor: "#4f46e5",
    discountButtonShape: "rounded",
    cardBackgroundColor: "",
    subtotalLabel: "Zwischensumme",
    discountLabel: "Rabatt",
    shippingLabel: "Versand",
    shippingCost: 4.95,
    shippingFreeText: "Kostenlos",
    totalLabel: "Gesamt",
    freeProductLabel: "🎁 Gratis-Produkt",
    freeProductValueText: "freigeschaltet",
    recommendShape: "rounded",
    recommendAddButtonColor: "#4f46e5"
  };

  function applyConfigDefaults(config, defaults) {
    Object.entries(defaults).forEach(([path, value]) => {
      const keys = path.split(".");
      const lastKey = keys.pop();
      let target = config;
      keys.forEach(key => { target = target[key]; });
      if (target[lastKey] == null) target[lastKey] = value;
    });
  }

  function normalizeState() {
    const wc = window.WebBuilderCart;
    window.WebBuilderProducts?.normalizeState?.();
    state.cartItems = window.WebBuilderUtils.normalizeInPlace(state.cartItems, wc.normalizeCartItem);

    const config = state.cartConfig;
    config.recommendations = wc.normalizeRecommendations(config.recommendations);
    wc.normalizeMilestonesConfig(config);

    if (!config.itemDisplay || typeof config.itemDisplay !== "object") config.itemDisplay = {};
    if (!config.itemDisplay.layout || typeof config.itemDisplay.layout !== "object") config.itemDisplay.layout = {};
    if (!config.componentLayout || typeof config.componentLayout !== "object") config.componentLayout = {};
    delete config.itemDisplay.itemDividerMode;
    delete config.footerBackgroundColor;
    delete config.itemsBoxHeight;

    if (!config.recommendDisplay || typeof config.recommendDisplay !== "object") config.recommendDisplay = {};
    if (!config.recommendDisplay.layout || typeof config.recommendDisplay.layout !== "object") config.recommendDisplay.layout = {};

    applyConfigDefaults(config, CONFIG_DEFAULTS);

    // Independent on/off switch for shipping in the cost overview. A
    // project saved before this switch existed inherits whatever the
    // progress bar's enabled state was (that used to gate shipping), so
    // nothing visually changes on load — from here on the two are
    // unrelated and each has its own toggle.
    if (config.shippingEnabled == null) config.shippingEnabled = !!config.progressEnabled;

    // {anzahl} can sit anywhere in the title text (see cart-html.js
    // buildTitleHtml()). A title saved before this placeholder existed is
    // migrated once by appending it, so old projects render unchanged.
    if (config.cartTitleLabel == null) {
      config.cartTitleLabel = `Dein Warenkorb (${TITLE_COUNT_PLACEHOLDER})`;
    } else if (!config.cartTitleLabel.includes(TITLE_COUNT_PLACEHOLDER)) {
      config.cartTitleLabel = `${config.cartTitleLabel} (${TITLE_COUNT_PLACEHOLDER})`;
    }

    wc.normalizeDividerAfterConfig(config);

    if (!config.currency || typeof config.currency !== "object") {
      config.currency = Object.assign({}, CURRENCY_PRESETS.eur);
    }

    return state;
  }

  window.WebBuilderCart = Object.assign(window.WebBuilderCart || {}, {
    getConfig, setConfig, setItemDisplay, setRecommendDisplay, setButtonLabel, applyDiscountCode,
    quantityColorHex, formatCurrency, CURRENCY_PRESETS, TITLE_COUNT_PLACEHOLDER,
    ITEMS_BOX_ITEM_HEIGHT, ITEMS_BOX_DEFAULT_HEIGHT,
    normalizeState
  });

  // All four cart-*.js files have loaded by this point (document.write
  // runs them synchronously in order), so every normalize function this
  // orchestrator calls is already attached.
  window.WebBuilderCart.normalizeState();

  console.log("WebBuilder: Cart-Datenschicht bereit ⚡");
})();
