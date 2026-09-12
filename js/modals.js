// WebBuilder modal service
// Owns the generic modal (open/close) plus freely positioned messages.

(() => {
  function getElements() {
    return {
      overlay: document.getElementById("modal-overlay"),
      title: document.getElementById("modal-title"),
      body: document.getElementById("modal-body"),
      footer: document.getElementById("modal-footer")
    };
  }

  function isOpen() {
    const { overlay } = getElements();
    return !!overlay && overlay.classList.contains("active");
  }

  function close() {
    const { overlay } = getElements();
    if (overlay) overlay.classList.remove("active");
  }

  function open(title, bodyHTML, footerHTML = "") {
    const { overlay, title: titleEl, body, footer } = getElements();
    if (!overlay || !titleEl || !body || !footer) return false;

    titleEl.innerText = title || "Information";
    body.innerHTML = bodyHTML || "";
    footer.innerHTML = footerHTML || '<button class="btn btn-primary" id="modal-generic-close">Schließen</button>';
    overlay.classList.add("active");

    const closeButton = footer.querySelector("#modal-generic-close");
    if (closeButton) closeButton.addEventListener("click", close, { once: true });
    return true;
  }

  function openMessage(title, message) {
    const esc = window.WebBuilderUtils.escapeHtml;
    const safeMessage = esc(message).replace(/\n/g, "<br>");
    return open(title, `<div>${safeMessage}</div>`);
  }

  // Freely positioned message (any screen corner or centered), set via
  // the inspector's "Meldungsposition" field — unlike the stacked toasts
  // in toast.js. Reuses WebBuilderToast.buildToastNode() for the markup.
  const POSITION_STYLES = {
    "top-right": { top: "24px", right: "24px" },
    "top-left": { top: "24px", left: "24px" },
    "bottom-left": { bottom: "24px", left: "24px" },
    "bottom-right": { bottom: "24px", right: "24px" },
    "center": { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
  };

  function openPositionedMessage(message, position = "bottom-right") {
    const toastHelper = window.WebBuilderToast;
    if (!toastHelper?.buildToastNode) { console.error("WebBuilderModals: WebBuilderToast.buildToastNode fehlt."); return false; }

    const msgEl = toastHelper.buildToastNode(message, "info", "💬");
    msgEl.style.position = "fixed";
    msgEl.style.zIndex = "9999";

    const coords = POSITION_STYLES[position] || POSITION_STYLES["bottom-right"];
    Object.entries(coords).forEach(([prop, value]) => { msgEl.style[prop] = value; });

    document.body.appendChild(msgEl);
    setTimeout(() => {
      msgEl.classList.add("toast-leaving");
      const remove = () => msgEl.remove();
      msgEl.addEventListener("animationend", remove, { once: true });
      // Fallback in case the animation never fires (e.g. reduced motion).
      setTimeout(remove, 600);
    }, 2800);

    return true;
  }

  function bindDismiss() {
    const { overlay } = getElements();
    const closeButton = document.getElementById("close-modal-btn");
    if (closeButton && !closeButton.dataset.webBuilderModalBound) {
      closeButton.dataset.webBuilderModalBound = "true";
      closeButton.addEventListener("click", close);
    }
    if (overlay && !overlay.dataset.webBuilderModalBound) {
      overlay.dataset.webBuilderModalBound = "true";
      overlay.addEventListener("click", event => {
        if (event.target === overlay) close();
      });
    }
  }

  window.WebBuilderModals = {
    getElements,
    isOpen,
    open,
    openMessage,
    openPositionedMessage,
    close,
    bindDismiss
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindDismiss, { once: true });
  } else {
    bindDismiss();
  }
})();
