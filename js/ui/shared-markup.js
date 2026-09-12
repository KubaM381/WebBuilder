// WebBuilder shared markup builder
// Single source for HTML that web.html otherwise duplicated verbatim
// between the normal element inspector (#prop-*) and the header/footer
// bar-item inspector (#bar-prop-*) — see root README.md "Known technical
// debt" (now resolved by this module).
//
// This module ONLY builds/injects static markup. It intentionally does
// NOT bind any click/change events — event binding stays exactly where it
// was (inspector.js for #prop-*, header-footer.js for #bar-prop-*), still
// referencing the very same element ids as before. That keeps this change
// purely a markup de-duplication with no behavioral risk to either panel.
//
// Load-order requirement: this file must load BEFORE inspector.js and
// header-footer.js (see js/README.md "Load order") so the options/toolbar
// buttons already exist in the DOM by the time those modules read
// `.value` or attach id-based listeners to them.
(() => {
  // Identical in both panels (verified against web.html before extracting).
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

  function optionsHtml(list) {
    return list.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  }

  function buildActionTypeOptionsHtml() {
    return optionsHtml(ACTION_TYPE_OPTIONS);
  }

  function buildFontFamilyOptionsHtml() {
    return optionsHtml(FONT_FAMILY_OPTIONS);
  }

  // idPrefix distinguishes the two toolbar instances ("" for normal
  // elements -> ttb-bold/ttb-italic/..., "bar-" for bar items ->
  // bar-ttb-bold/bar-ttb-italic/...). colorId/fontFamilyId are passed
  // explicitly since those two never followed the "ttb-" naming scheme
  // (prop-color / bar-prop-color, prop-font-family / bar-prop-font-family).
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

  // Idempotent (dataset flag) so a re-run (e.g. accidental double include)
  // can't wipe out a panel that was already populated and is mid-edit.
  function populate() {
    const propActionType = document.getElementById("prop-action-type");
    if (propActionType && !propActionType.dataset.webBuilderMarkupBound) {
      propActionType.innerHTML = buildActionTypeOptionsHtml();
      propActionType.dataset.webBuilderMarkupBound = "true";
    }

    const barActionType = document.getElementById("bar-prop-action-type");
    if (barActionType && !barActionType.dataset.webBuilderMarkupBound) {
      barActionType.innerHTML = buildActionTypeOptionsHtml();
      barActionType.dataset.webBuilderMarkupBound = "true";
    }

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

  // Same readyState-guard pattern as modals.js/preview.js: at the time
  // builder.js's document.write'd scripts run, the document is still
  // "loading" (parser hasn't reached </html> yet), so this normally waits
  // for DOMContentLoaded — but works either way.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", populate, { once: true });
  } else {
    populate();
  }

  window.WebBuilderSharedMarkup = {
    buildActionTypeOptionsHtml,
    buildFontFamilyOptionsHtml,
    buildTextToolbarHtml,
    populate
  };
})();
