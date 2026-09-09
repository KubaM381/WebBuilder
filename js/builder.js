// WebBuilder — Builder entry point
// Temporary compatibility loader while the existing core is split into modules.
(() => {
  if (window.__WEBBUILDER_CORE_LOADED__) return;
  window.__WEBBUILDER_CORE_LOADED__ = true;
  const script = document.createElement("script");
  script.src = "../builder.js";
  document.head.appendChild(script);
})();
