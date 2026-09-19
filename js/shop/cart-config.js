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
  // an already-guaranteed-to-exist nested object (itemDisplay). Anything
  // that isn't a plain "still missing -> default" scalar — object/array
  // existence guards, the cartTitleLabel placeholder migration, delegated
  // normalizeXxx() calls — is NOT in this table and is applied separately
  // in normalizeState() below.
  const CONFIG_DEFAULTS = {
    "itemDisplay.quantityGroupShape": "rounded",
    "itemDisplay.quantityButtonColor": "black",
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
    // No longer its own component — title/checkout flow like any other
    // component in the cart body (see cart-html.js). Drop a value loaded
    // from an older project instead of keeping it as a dead field.
    delete config.footerBackgroundColor;

    applyConfigDefaults(config, CONFIG_DEFAULTS);

    // {anzahl} can sit anywhere in the title text (see cart-html.js
    // buildTitleHtml()). A title saved before this placeholder existed is
    // migrated once by appending it, so old projects render unchanged.
    if (config.cartTitleLabel == null) {
      config.cartTitleLabel = `Dein Warenkorb (${TITLE_COUNT_PLACEHOLDER})`;
    } else if (!config.cartTitleLabel.includes(TITLE_COUNT_PLACEHOLDER)) {
      config.cartTitleLabel = `${config.cartTitleLabel} (${TITLE_COUNT_PLACEHOLDER})`;
    }

    wc.normalizeDividersState(config);

    if (!config.recommendDisplay || typeof config.recommendDisplay !== "object") config.recommendDisplay = {};
    if (!config.recommendDisplay.layout || typeof config.recommendDisplay.layout !== "object") config.recommendDisplay.layout = {};

    if (!config.currency || typeof config.currency !== "object") {
      config.currency = Object.assign({}, CURRENCY_PRESETS.eur);
    }

    return state;
  }

  window.WebBuilderCart = Object.assign(window.WebBuilderCart || {}, {
    getConfig, setConfig, setItemDisplay, setButtonLabel, applyDiscountCode,
    quantityColorHex, formatCurrency, CURRENCY_PRESETS, TITLE_COUNT_PLACEHOLDER,
    normalizeState
  });

  // All four cart-*.js files have loaded by this point (document.write
  // runs them synchronously in order), so every normalize function this
  // orchestrator calls is already attached.
  window.WebBuilderCart.normalizeState();

  console.log("WebBuilder: Cart-Datenschicht bereit ⚡");
})();
