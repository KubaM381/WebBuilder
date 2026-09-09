// WebBuilder — safe browser bootstrap
// The existing builder engine is still kept in ../builder.js for now.
// This file intentionally loads it as a classic script so the current
// working builder behavior is preserved while the modular files are migrated safely.

(() => {
  if (window.__WEBBUILDER_LEGACY_STARTED__) return;
  window.__WEBBUILDER_LEGACY_STARTED__ = true;

  const script = document.createElement("script");
  script.src = "../builder.js";
  script.defer = true;
  document.head.appendChild(script);
})();
