// WebBuilder — browser bootstrap
// web.html currently loads this file as a classic script, so we start the real ES modules here.
// The actual builder implementation lives in ../builder.js.

(() => {
  if (window.__WEBBUILDER_MODULES_STARTED__) return;
  window.__WEBBUILDER_MODULES_STARTED__ = true;

  const loadModule = (src) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = src;
    document.head.appendChild(script);
  };

  loadModule("../builder.js");
  loadModule("./supabase.js");
})();
