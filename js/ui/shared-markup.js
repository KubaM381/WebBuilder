// WebBuilder shared markup builder
// Single source for HTML that web.html/cart-editor-markup.js otherwise
// duplicate verbatim: the click-action select (normal element inspector
// vs. bar-item inspector), the text-format toolbar (same two panels),
// and the "rounded/square/pill" shape select used identically by three
// fields inside #cart-inspector-form.
//
// This module ONLY builds/injects static markup. It does NOT bind any
// click/change events — event binding stays where it was (inspector.js,
// header-footer.js, cart-editor-bindings.js).
//
// Load-order requirement: this file must load AFTER
// js/shop/cart-editor-markup.js (which creates the empty shape <select>s
// this file fills) and BEFORE editor/inspector.js and
// layout/header-footer-inspector.js (see js/README.md "Load order").
(() => {
  const ACTION_TYPE_OPTIONS = [
    ["none", "Keine Aktion"],
    ["scroll-top", "Nach ganz oben scrollen ⬆️"],
    ["scroll-bottom", "Nach ganz unten scrollen ⬇️"],
    ["history-back", "Zurück (Browser-Verlauf) ↩️"],
    ["history-forward", "Vorwärts (Browser-Verlauf) ↪️"],
    ["open-url", "Neue Seite / URL öffnen 🌐"],
    ["cart-add", "Produkt in den Warenkorb legen 🛒"],
    ["open-cart-drawer", "Warenkorb Drawer öffnen 🛍️"],
    ["open-custom-modal", "Eigenes Modal öffnen 🪧"],
    ["alert-msg", "Benutzerdefinierte Meldung anzeigen 💬"]
  ];

  const FONT_FAMILY_OPTIONS = [
    ["inherit", "Standard"],
    ["'Georgia', serif", "Serif"],
    ["'Courier New', monospace", "Monospace"],
    ["'Segoe UI', sans-serif", "Sans-Serif"],
    ["'Comic Sans MS', cursive", "Verspielt"]
  ];

  // Used by cart-comp-checkout-shape/cart-comp-discount-shape/
  // cart-comp-recommend-shape (exact duplicates in #cart-inspector-form).
  // Other shape-like selects (cart-item-shape, cid-quantity-shape,
  // cid-remove-shape) use different option sets/orders and stay inline.
  const SHAPE_OPTIONS = [
    ["rounded", "Abgerundet"],
    ["square", "Eckig"],
    ["pill", "Rund (Pille)"]
  ];

  function optionsHtml(list) {
    return list.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  }

  function buildActionTypeOptionsHtml() {
    return optionsHtml(ACTION_TYPE_OPTIONS);
  }

  function buildFontFamilyOptionsHtml() {
    return optionsHtml(FONT_FAMILY_OPTIONS);
  }

  function buildShapeOptionsHtml() {
    return optionsHtml(SHAPE_OPTIONS);
  }

  // idPrefix distinguishes the two toolbar instances ("" for normal
  // elements -> ttb-bold/ttb-italic/..., "bar-" for bar items ->
  // bar-ttb-bold/bar-ttb-italic/...). colorId/fontFamilyId are passed
  // explicitly since those two never followed the "ttb-" naming scheme.
  function buildTextToolbarHtml({ idPrefix = "", colorId, fontFamilyId, defaultColor = "#000000" }) {
    return `<button type="button" class="ttb-btn" id="${idPrefix}ttb-bold" title="Fett"><b>F</b></button>
      <button type="button" class="ttb-btn" id="${idPrefix}ttb-italic" title="Kursiv"><i>K</i></button>
      <button type="button" class="ttb-btn" id="${idPrefix}ttb-underline" title="Unterstrichen"><u>U</u></button>
      <span class="ttb-sep"></span>
      <button type="button" class="ttb-btn" id="${idPrefix}ttb-align-left" title="Linksbündig">⬅</button>
      <button type="button" class="ttb-btn" id="${idPrefix}ttb-align-center" title="Zentriert">↔</button>
      <button type="button" class="ttb-btn" id="${idPrefix}ttb-align-right" title="Rechtsbündig">➡</button>
      <span class="ttb-sep"></span>
      <input type="color" id="${colorId}" value="${defaultColor}" title="Textfarbe">
      <select id="${fontFamilyId}" title="Schriftart">${buildFontFamilyOptionsHtml()}</select>`;
  }

  function fillSelect(id, html) {
    const el = document.getElementById(id);
    if (el && !el.dataset.webBuilderMarkupBound) {
      el.innerHTML = html;
      el.dataset.webBuilderMarkupBound = "true";
    }
  }

  // Idempotent (dataset flag) so a re-run can't wipe out a panel that was
  // already populated and is mid-edit.
  function populate() {
    fillSelect("prop-action-type", buildActionTypeOptionsHtml());
    fillSelect("bar-prop-action-type", buildActionTypeOptionsHtml());
    ["cart-comp-checkout-shape", "cart-comp-discount-shape", "cart-comp-recommend-shape"].forEach(id => fillSelect(id, buildShapeOptionsHtml()));

    const propToolbar = document.getElementById("prop-text-toolbar");
    if (propToolbar && !propToolbar.dataset.webBuilderMarkupBound) {
      propToolbar.innerHTML = buildTextToolbarHtml({
        idPrefix: "", colorId: "prop-color", fontFamilyId: "prop-font-family", defaultColor: "#000000"
      });
      propToolbar.dataset.webBuilderMarkupBound = "true";
    }

    const barToolbar = document.getElementById("bar-item-text-toolbar");
    if (barToolbar && !barToolbar.dataset.webBuilderMarkupBound) {
      barToolbar.innerHTML = buildTextToolbarHtml({
        idPrefix: "bar-", colorId: "bar-prop-color", fontFamilyId: "bar-prop-font-family", defaultColor: "#ffffff"
      });
      barToolbar.dataset.webBuilderMarkupBound = "true";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", populate, { once: true });
  } else {
    populate();
  }

  window.WebBuilderSharedMarkup = {
    buildActionTypeOptionsHtml,
    buildFontFamilyOptionsHtml,
    buildShapeOptionsHtml,
    buildTextToolbarHtml,
    populate
  };
})();
