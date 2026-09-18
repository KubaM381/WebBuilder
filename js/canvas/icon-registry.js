// js/canvas/icon-registry.js
// WebBuilder icon registry — pure data/registry, no DOM access. Split out
// of canvas/elements.js so element CRUD and icon lookup are two separate
// concerns that can change independently. Used by icon elements,
// header/footer icons (layout/header-footer-render.js) and the "Eigene
// Icons" upload feature (canvas/canvas.js).
// No hard load-order requirement of its own: every read of
// window.WebBuilderIconRegistry elsewhere happens at runtime inside a
// function body, never at top-level parse time.
(() => {
  const icons = {
    cart: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1z"/></svg>',
    'arrow-up': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>',
    'arrow-down': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>',
    'arrow-left': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>',
    'arrow-right': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>',
    settings: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>'
  };

  function register(name, markup) {
    if (!name || !markup) return false;
    icons[name] = String(markup);
    return true;
  }

  function getIcon(name) {
    return icons[name] || null;
  }

  function getAllIcons() {
    return Object.assign({}, icons);
  }

  // Merges registered icons with the optional window.WebBuilderIconMap
  // extension. Used by canvas/canvas.js and export.js.
  function getMergedMap() {
    return Object.assign({}, getAllIcons(), window.WebBuilderIconMap || {});
  }

  // Custom icons are intentionally NOT persisted (not part of storage's
  // snapshot) — session-only, matching the original builder's behavior.
  const customIconOrder = [];

  function addCustomIcon(name, source) {
    const cleanName = String(name || "").trim();
    const cleanSource = String(source || "").trim();
    if (!cleanName || !cleanSource) return false;
    const markup = cleanSource.startsWith("<svg")
      ? cleanSource
      : `<img class="icon-svg icon-custom-img" src="${cleanSource}" alt="${cleanName}" />`;
    register(cleanName, markup);
    if (!customIconOrder.includes(cleanName)) customIconOrder.push(cleanName);
    return true;
  }

  function getCustomIconNames() {
    return customIconOrder.slice();
  }

  window.WebBuilderIconRegistry = {
    register,
    get: getIcon,
    getAll: getAllIcons,
    getMergedMap,
    addCustom: addCustomIcon,
    getCustomNames: getCustomIconNames
  };
})();
