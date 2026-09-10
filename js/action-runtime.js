// WebBuilder action runtime
// Centralizes click actions for canvas elements so action execution no longer
// needs to live inside the monolithic legacy editor.
(() => {
  const state = window.WebBuilderState;

  function getActionType(item = {}) {
    return item.actionType || item.action || item.action_type || "none";
  }

  function execute(item = {}) {
    const type = getActionType(item);
    const url = item.actionUrl || item.action_url || item.url || "";
    const message = item.actionMsg || item.actionMessage || item.message || "Aktion ausgeführt!";

    switch (type) {
      case "scroll-top":
        window.scrollTo({ top: 0, behavior: "smooth" });
        return true;
      case "scroll-bottom":
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
        return true;
      case "history-back":
        window.history.back();
        return true;
      case "history-forward":
        window.history.forward();
        return true;
      case "open-url":
        if (!url) return false;
        window.open(url, "_blank", "noopener,noreferrer");
        return true;
      case "cart-add": {
        const productId = item.productId || item.product_id || item.product;
        const products = window.WebBuilderProducts;
        const cart = window.WebBuilderCart;
        if (!cart) return false;
        const product = products && typeof products.getById === "function"
          ? products.getById(productId)
          : null;
        if (!product) return false;
        cart.addItem(product);
        return true;
      }
      case "open-cart-drawer":
        return !!(window.WebBuilderCartRuntime && window.WebBuilderCartRuntime.open && window.WebBuilderCartRuntime.open());
      case "open-custom-modal": {
        const modals = window.WebBuilderModals;
        if (!modals) return false;
        return modals.open(item.modalTitle || "Information", item.modalBody || message, item.modalFooter || "");
      }
      case "alert-msg": {
        const modals = window.WebBuilderModals;
        if (modals && typeof modals.openMessage === "function") {
          modals.openMessage(item.modalTitle || "Hinweis", message);
        } else {
          window.alert(message);
        }
        return true;
      }
      case "none":
      default:
        return false;
    }
  }

  window.WebBuilderActionRuntime = { getActionType, execute };
})();
