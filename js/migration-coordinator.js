// WebBuilder migration coordinator
// Keeps the staged migration explicit and prevents multiple modules from
// becoming competing sources of truth while builder-legacy.js is still live.
(() => {
  const state = window.WebBuilderState;
  const bridge = window.WebBuilderLegacyBridge;

  if (!state || !bridge) {
    console.error("WebBuilderMigration: state/bridge missing.");
    return;
  }

  const domains = {};

  function register(name, adapter) {
    if (!name || !adapter || typeof adapter.read !== "function" || typeof adapter.write !== "function") {
      console.warn("WebBuilderMigration: invalid adapter", name);
      return false;
    }
    domains[name] = adapter;
    return true;
  }

  function get(name) {
    return domains[name] || null;
  }

  function status() {
    return Object.keys(domains).reduce((result, name) => {
      result[name] = {
        registered: true,
        connected: !!domains[name].connected
      };
      return result;
    }, {});
  }

  function read(name) {
    const adapter = get(name);
    return adapter ? adapter.read() : null;
  }

  function write(name, value) {
    const adapter = get(name);
    return adapter ? adapter.write(value) : false;
  }

  // Domain contracts. These are intentionally not connected to legacy locals
  // yet; that connection is made only after the corresponding legacy domain
  // has been patched safely.
  register("cart", {
    connected: false,
    read: () => window.WebBuilderCart ? window.WebBuilderCart.getItems() : [],
    write: value => {
      if (!window.WebBuilderCart || !Array.isArray(value)) return false;
      window.WebBuilderState.cartItems = value;
      return true;
    }
  });

  register("products", {
    connected: false,
    read: () => window.WebBuilderCart ? window.WebBuilderCart.getProducts() : [],
    write: value => {
      if (!Array.isArray(value)) return false;
      window.WebBuilderState.products = value;
      return true;
    }
  });

  register("headerFooter", {
    connected: false,
    read: () => window.WebBuilderHeaderFooter ? {
      header: window.WebBuilderHeaderFooter.getHeader(),
      footer: window.WebBuilderHeaderFooter.getFooter()
    } : null,
    write: value => {
      if (!value || !window.WebBuilderHeaderFooter) return false;
      window.WebBuilderHeaderFooter.updateHeader(value.header || {}, false);
      window.WebBuilderHeaderFooter.updateFooter(value.footer || {}, false);
      return true;
    }
  });

  window.WebBuilderMigration = {
    register,
    get,
    status,
    read,
    write,
    domains
  };
})();
