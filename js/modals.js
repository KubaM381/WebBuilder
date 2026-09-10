// WebBuilder modal service
// Owns generic modal behaviour so the editor can migrate modal logic out of
// builder-legacy.js without changing the existing DOM contract.

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
    const safeMessage = String(message == null ? "" : message)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
    return open(title, `<div>${safeMessage}</div>`);
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
    close,
    bindDismiss
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindDismiss, { once: true });
  } else {
    bindDismiss();
  }
})();
