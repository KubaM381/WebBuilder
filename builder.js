document.addEventListener("DOMContentLoaded", () => {
  // Global State
  let elements = [];
  let selectedElementId = null;
  let isPreviewMode = false;
  let draggedType = null;
  let draggedIcon = null;
  let cartCount = 0;

  // DOM Elements
  const canvas = document.getElementById("canvas");
  const canvasHint = document.getElementById("canvas-hint");
  const btnModeToggle = document.getElementById("btn-mode-toggle");
  const btnClear = document.getElementById("btn-clear");
  const btnExport = document.getElementById("btn-export");

  // Background Control Elements
  const bgType = document.getElementById("bg-type");
  const bgSolidGroup = document.getElementById("bg-solid-group");
  const bgGradientGroup = document.getElementById("bg-gradient-group");
  const bgImageGroup = document.getElementById("bg-image-group");
  const bgColorInput = document.getElementById("bg-color-input");
  const bgGrad1Input = document.getElementById("bg-grad-1");
  const bgGrad2Input = document.getElementById("bg-grad-2");
  const bgGradDirInput = document.getElementById("bg-grad-dir");
  const bgImageUrlInput = document.getElementById("bg-image-url");
  const bgImageFileInput = document.getElementById("bg-image-file");

  // Inspector Fields
  const noSelectionUI = document.getElementById("no-selection");
  const inspectorForm = document.getElementById("inspector-form");
  const propId = document.getElementById("prop-id");
  const propText = document.getElementById("prop-text");
  const propSize = document.getElementById("prop-size");
  const propColor = document.getElementById("prop-color");
  const propImageUrl = document.getElementById("prop-image-url");
  const propImageFile = document.getElementById("prop-image-file");
  const propActionType = document.getElementById("prop-action-type");
  const propActionUrl = document.getElementById("prop-action-url");
  const propActionMsg = document.getElementById("prop-action-msg");

  const groupText = document.getElementById("group-text");
  const groupColor = document.getElementById("group-color");
  const groupImage = document.getElementById("group-image");
  const groupActionUrl = document.getElementById("group-action-url");
  const groupActionMsg = document.getElementById("group-action-msg");
  const btnDelete = document.getElementById("btn-delete-element");

  // Drawer & Modal Elements
  const cartDrawerBackdrop = document.getElementById("cart-drawer-backdrop");
  const cartDrawer = document.getElementById("cart-drawer");
  const closeCartBtn = document.getElementById("close-cart-btn");
  const cartItemsList = document.getElementById("cart-items-list");
  const cartCountBadge = document.getElementById("cart-count-badge");

  const modalOverlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const modalFooter = document.getElementById("modal-footer");
  const closeModalBtn = document.getElementById("close-modal-btn");

  // Toast Container
  const toastContainer = document.getElementById("toast-container");

  // Icon SVG Definitions
  const SVGMAP = {
    cart: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>',
    settings: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z"/></svg>',
    'arrow-up': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>',
    'arrow-down': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>',
    'arrow-left': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>',
    'arrow-right': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>'
  };

  // --- 1. Canvas Background Control Logic ---

  bgType.addEventListener("change", () => {
    const mode = bgType.value;
    bgSolidGroup.classList.toggle("hidden", mode !== "solid");
    bgGradientGroup.classList.toggle("hidden", mode !== "gradient");
    bgImageGroup.classList.toggle("hidden", mode !== "image");
    updateCanvasBackground();
  });

  bgColorInput.addEventListener("input", updateCanvasBackground);
  bgGrad1Input.addEventListener("input", updateCanvasBackground);
  bgGrad2Input.addEventListener("input", updateCanvasBackground);
  bgGradDirInput.addEventListener("change", updateCanvasBackground);
  bgImageUrlInput.addEventListener("input", updateCanvasBackground);

  bgImageFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        bgImageUrlInput.value = event.target.result;
        updateCanvasBackground();
      };
      reader.readAsDataURL(file);
    }
  });

  function updateCanvasBackground() {
    const mode = bgType.value;
    if (mode === "solid") {
      canvas.style.background = bgColorInput.value;
      canvas.style.backgroundImage = "none";
    } else if (mode === "gradient") {
      canvas.style.background = `linear-gradient(${bgGradDirInput.value}, ${bgGrad1Input.value}, ${bgGrad2Input.value})`;
    } else if (mode === "image") {
      const url = bgImageUrlInput.value || 'https://picsum.photos/1000/1200';
      canvas.style.background = `url("${url}") center/cover no-repeat`;
    }
  }

  // --- 2. Toast Notification System ---

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "danger") icon = "⚠️";

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-leaving");
      toast.addEventListener("animationend", () => toast.remove());
    }, 2800);
  }

  // --- 3. Drag & Drop Setup ---

  document.querySelectorAll(".draggable-item").forEach(item => {
    item.addEventListener("dragstart", (e) => {
      draggedType = item.dataset.type;
      draggedIcon = item.dataset.icon || null;
      e.dataTransfer.setData("text/plain", draggedType);
    });
  });

  canvas.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  canvas.addEventListener("drop", (e) => {
    e.preventDefault();
    if (isPreviewMode) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - 40;
    const y = e.clientY - rect.top - 20;

    createElement(draggedType, draggedIcon, Math.max(0, x), Math.max(0, y));
  });

  // --- 4. Element Creation & Management ---

  function createElement(type, iconName = null, x = 50, y = 50) {
    const id = "elem_" + Date.now();
    const newElement = {
      id,
      type,
      iconName,
      x,
      y,
      text: type === "button" ? "Klick mich" : (type === "headline" ? "Neue Überschrift" : "Beispieltext..."),
      color: "#1f2937",
      size: type === "icon" ? 36 : (type === "headline" ? 32 : (type === "image" ? 200 : 18)),
      imageUrl: type === "image" ? "https://picsum.photos/300/200" : "",
      actionType: "none",
      actionUrl: "",
      actionMsg: ""
    };

    elements.push(newElement);
    renderCanvas();
    selectElement(id);
    showToast("Neues Element hinzugefügt", "success");
  }

  function renderCanvas() {
    canvas.querySelectorAll(".placed-element").forEach(el => el.remove());
    canvasHint.classList.toggle("hidden", elements.length > 0);

    elements.forEach(item => {
      const el = document.createElement("div");
      el.className = `placed-element ${item.id === selectedElementId ? 'selected' : ''} ${item.actionType !== 'none' ? 'has-action' : ''}`;
      el.style.left = `${item.x}px`;
      el.style.top = `${item.y}px`;
      el.style.color = item.color;
      el.dataset.id = item.id;

      // Inner HTML Render based on Type
      if (item.type === "icon" && SVGMAP[item.iconName]) {
        el.innerHTML = SVGMAP[item.iconName];
        const svg = el.querySelector("svg");
        if (svg) {
          svg.style.width = `${item.size}px`;
          svg.style.height = `${item.size}px`;
        }
      } else if (item.type === "button") {
        el.innerHTML = `<button class="btn btn-primary" style="font-size:${item.size}px; background-color:${item.color}">${item.text}</button>`;
      } else if (item.type === "headline") {
        el.innerHTML = `<h2 style="font-size:${item.size}px; color:${item.color};">${item.text}</h2>`;
      } else if (item.type === "box") {
        el.innerHTML = `<div style="width:140px; height:90px; background:${item.color}; border-radius:8px; box-shadow: var(--shadow-md);"></div>`;
      } else if (item.type === "image") {
        const src = item.imageUrl || "https://via.placeholder.com/200";
        el.innerHTML = `<img src="${src}" class="canvas-img" style="width:${item.size}px; height:auto;" alt="Bild Element" />`;
      } else {
        el.innerHTML = `<p style="font-size:${item.size}px; color:${item.color};">${item.text}</p>`;
      }

      // Badge indicator for linked action
      const badge = document.createElement("span");
      badge.className = "element-badge";
      badge.innerText = "⚡ Logik";
      el.appendChild(badge);

      // Element Event Handlers
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isPreviewMode) {
          executeAction(item, el);
        } else {
          selectElement(item.id);
        }
      });

      makeElementDraggableOnCanvas(el, item);
      canvas.appendChild(el);
    });
  }

  function makeElementDraggableOnCanvas(domEl, item) {
    let isDragging = false;
    let startX, startY;

    domEl.addEventListener("mousedown", (e) => {
      if (isPreviewMode) return;
      isDragging = true;
      startX = e.clientX - item.x;
      startY = e.clientY - item.y;

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        item.x = Math.max(0, moveEvent.clientX - startX);
        item.y = Math.max(0, moveEvent.clientY - startY);
        domEl.style.left = `${item.x}px`;
        domEl.style.top = `${item.y}px`;
      };

      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  // --- 5. Inspector Sync & Interaction ---

  function selectElement(id) {
    selectedElementId = id;
    const item = elements.find(el => el.id === id);

    if (!item) {
      noSelectionUI.classList.remove("hidden");
      inspectorForm.classList.add("hidden");
      return;
    }

    noSelectionUI.classList.add("hidden");
    inspectorForm.classList.remove("hidden");

    // Form inputs visibility based on item type
    const isImage = item.type === "image";
    const isBox = item.type === "box";

    groupText.classList.toggle("hidden", isImage || isBox);
    groupColor.classList.toggle("hidden", isImage);
    groupImage.classList.toggle("hidden", !isImage);

    // Populate Fields
    propId.value = item.id;
    propText.value = item.text || "";
    propSize.value = item.size || 20;
    propColor.value = item.color || "#1f2937";
    propImageUrl.value = item.imageUrl || "";
    propActionType.value = item.actionType || "none";
    propActionUrl.value = item.actionUrl || "";
    propActionMsg.value = item.actionMsg || "";

    toggleActionFields(item.actionType);
    renderCanvas();
  }

  canvas.addEventListener("click", () => {
    if (!isPreviewMode) {
      selectedElementId = null;
      selectElement(null);
    }
  });

  // Bind Inspector Inputs to State
  propText.addEventListener("input", (e) => {
    const item = getSelected();
    if (item) { item.text = e.target.value; renderCanvas(); }
  });

  propSize.addEventListener("input", (e) => {
    const item = getSelected();
    if (item) { item.size = parseInt(e.target.value) || 16; renderCanvas(); }
  });

  propColor.addEventListener("input", (e) => {
    const item = getSelected();
    if (item) { item.color = e.target.value; renderCanvas(); }
  });

  propImageUrl.addEventListener("input", (e) => {
    const item = getSelected();
    if (item) { item.imageUrl = e.target.value; renderCanvas(); }
  });

  propImageFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    const item = getSelected();
    if (file && item) {
      const reader = new FileReader();
      reader.onload = (event) => {
        item.imageUrl = event.target.result;
        propImageUrl.value = event.target.result;
        renderCanvas();
      };
      reader.readAsDataURL(file);
    }
  });

  propActionType.addEventListener("change", (e) => {
    const item = getSelected();
    if (item) {
      item.actionType = e.target.value;
      toggleActionFields(item.actionType);
      renderCanvas();
    }
  });

  propActionUrl.addEventListener("input", (e) => {
    const item = getSelected();
    if (item) item.actionUrl = e.target.value;
  });

  propActionMsg.addEventListener("input", (e) => {
    const item = getSelected();
    if (item) item.actionMsg = e.target.value;
  });

  btnDelete.addEventListener("click", () => {
    if (selectedElementId) {
      elements = elements.filter(el => el.id !== selectedElementId);
      selectedElementId = null;
      selectElement(null);
      renderCanvas();
      showToast("Element gelöscht", "info");
    }
  });

  function getSelected() {
    return elements.find(el => el.id === selectedElementId);
  }

  function toggleActionFields(actionType) {
    groupActionUrl.classList.toggle("hidden", actionType !== "open-url");
    groupActionMsg.classList.toggle("hidden", actionType !== "alert-msg");
  }

  // --- 6. In-Page Modals & Drawers ---

  function openCartDrawer() {
    cartDrawerBackdrop.classList.add("active");
    cartDrawer.classList.add("active");
  }

  function closeCartDrawer() {
    cartDrawerBackdrop.classList.remove("active");
    cartDrawer.classList.remove("active");
  }

  closeCartBtn.addEventListener("click", closeCartDrawer);
  cartDrawerBackdrop.addEventListener("click", closeCartDrawer);

  function openModal(titleText, bodyHTML, footerHTML = "") {
    modalTitle.innerText = titleText;
    modalBody.innerHTML = bodyHTML;
    modalFooter.innerHTML = footerHTML || `<button class="btn btn-primary" onclick="document.getElementById('modal-overlay').classList.remove('active')">Schließen</button>`;
    modalOverlay.classList.add("active");
  }

  function closeModal() {
    modalOverlay.classList.remove("active");
  }

  closeModalBtn.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // --- 7. Action Engine ---

  function executeAction(item, domEl) {
    switch (item.actionType) {
      case "scroll-top":
        window.scrollTo({ top: 0, behavior: "smooth" });
        canvas.scrollTo({ top: 0, behavior: "smooth" });
        showToast("Nach oben gescrollt ⬆️", "info");
        break;

      case "scroll-bottom":
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        canvas.scrollTo({ top: canvas.scrollHeight, behavior: "smooth" });
        showToast("Nach unten gescrollt ⬇️", "info");
        break;

      case "history-back":
        showToast("Browser Zurück-Funktion ausgelöst ↩️", "info");
        break;

      case "open-url":
        if (item.actionUrl) {
          window.open(item.actionUrl, "_blank");
          showToast(`URL geöffnet: ${item.actionUrl}`, "info");
        } else {
          showToast("Keine Ziel-URL im Inspector hinterlegt!", "danger");
        }
        break;

      case "cart-add":
        // Bounce Animation
        domEl.classList.remove("cart-pop-anim");
        void domEl.offsetWidth; // Trigger reflow
        domEl.classList.add("cart-pop-anim");

        cartCount++;
        cartCountBadge.innerText = cartCount;

        const cartItem = document.createElement("div");
        cartItem.className = "cart-item";
        cartItem.innerHTML = `
          <span class="cart-item-title">${item.text || 'Produkt ' + cartCount}</span>
          <span class="cart-item-price">49,99 €</span>
        `;
        cartItemsList.appendChild(cartItem);

        showToast("Artikel in den Warenkorb gelegt! 🛒", "success");
        break;

      case "alert-msg":
        showToast(item.actionMsg || "Eine Benachrichtigung wurde ausgelöst!", "info");
        break;

      case "open-cart-drawer":
        openCartDrawer();
        showToast("Warenkorb geöffnet", "info");
        break;

      case "open-cookie-modal":
        openModal(
          "🍪 Cookie-Einstellungen",
          `<p>Wir nutzen Cookies, um die Benutzererfahrung zu verbessern. Wählen Sie Ihre Präferenzen:</p>
           <div style="margin-top: 15px;">
             <label><input type="checkbox" checked disabled /> Notwendige Cookies</label><br>
             <label><input type="checkbox" checked /> Analytische Cookies</label><br>
             <label><input type="checkbox" checked /> Marketing Cookies</label>
           </div>`,
          `<button class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')">Ablehnen</button>
           <button class="btn btn-primary" onclick="document.getElementById('modal-overlay').classList.remove('active')">Alle Akzeptieren</button>`
        );
        break;

      case "open-agb-modal":
        openModal(
          "📄 Allgemeine Geschäftsbedingungen (AGB)",
          `<p><strong>1. Geltungsbereich</strong><br>Diese AGB gelten für alle Nutzungen der WebBuilder Pro Plattform.</p>
           <p style="margin-top: 10px;"><strong>2. Leistungsbeschreibung</strong><br>Der Dienst stellt Werkzeuge zum Erstellen von Landingpages und Webelementen bereit.</p>
           <p style="margin-top: 10px;"><strong>3. Datenschutz</strong><br>Ihre Daten werden gemäß DSGVO vertraulich behandelt und nicht ohne Zustimmung weitergegeben.</p>`
        );
        break;

      default:
        showToast("Keine Verbindungskonfiguration hinterlegt.", "info");
        break;
    }
  }

  // --- 8. Toolbar Controls ---

  btnModeToggle.addEventListener("click", () => {
    isPreviewMode = !isPreviewMode;
    document.body.classList.toggle("preview-mode", isPreviewMode);
    btnModeToggle.innerHTML = isPreviewMode ? "✏️ Editor-Modus" : "👁️ Vorschau-Modus";

    if (isPreviewMode) {
      selectedElementId = null;
      renderCanvas();
      showToast("Vorschau-Modus aktiv - Klick-Aktionen sind bereit!", "info");
    } else {
      showToast("Editor-Modus aktiv", "info");
    }
  });

  btnClear.addEventListener("click", () => {
    if (confirm("Möchtest du wirklich alle Elemente von der Zeichenfläche löschen?")) {
      elements = [];
      selectedElementId = null;
      selectElement(null);
      renderCanvas();
      showToast("Zeichenfläche geleert", "info");
    }
  });

  btnExport.addEventListener("click", () => {
    let exportedHTML = `<!-- WebBuilder Pro Export -->\n<div style="position:relative; width:100%; min-height:100vh; background:${canvas.style.background};">\n`;
    elements.forEach(item => {
      exportedHTML += `  <!-- Element: ${item.id} (${item.type}) -->\n`;
      exportedHTML += `  <div style="position:absolute; left:${item.x}px; top:${item.y}px; color:${item.color};">\n`;
      if (item.type === "icon" && SVGMAP[item.iconName]) {
        exportedHTML += `    ${SVGMAP[item.iconName]}\n`;
      } else if (item.type === "button") {
        exportedHTML += `    <button style="font-size:${item.size}px; background:${item.color}; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">${item.text}</button>\n`;
      } else if (item.type === "headline") {
        exportedHTML += `    <h2 style="font-size:${item.size}px; color:${item.color}; margin:0;">${item.text}</h2>\n`;
      } else if (item.type === "image") {
        exportedHTML += `    <img src="${item.imageUrl}" style="width:${item.size}px; height:auto; display:block;" alt="Exportiertes Bild" />\n`;
      } else if (item.type === "box") {
        exportedHTML += `    <div style="width:140px; height:90px; background:${item.color}; border-radius:8px;"></div>\n`;
      } else {
        exportedHTML += `    <p style="font-size:${item.size}px; color:${item.color}; margin:0;">${item.text}</p>\n`;
      }
      exportedHTML += `  </div>\n`;
    });
    exportedHTML += `</div>`;

    console.log(exportedHTML);
    showToast("HTML wurde in der Entwickler-Konsole (F12) ausgegeben!", "success");
  });
});
