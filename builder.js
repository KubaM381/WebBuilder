document.addEventListener("DOMContentLoaded", () => {
  // Global State
  let elements = [];
  let selectedElementId = null;
  let isPreviewMode = false;
  let draggedType = null;
  let draggedIcon = null;

  // DOM Elements
  const canvas = document.getElementById("canvas");
  const canvasHint = document.getElementById("canvas-hint");
  const btnModeToggle = document.getElementById("btn-mode-toggle");
  const btnClear = document.getElementById("btn-clear");
  const btnExport = document.getElementById("btn-export");

  // Inspector Fields
  const noSelectionUI = document.getElementById("no-selection");
  const inspectorForm = document.getElementById("inspector-form");
  const propId = document.getElementById("prop-id");
  const propText = document.getElementById("prop-text");
  const propSize = document.getElementById("prop-size");
  const propColor = document.getElementById("prop-color");
  const propActionType = document.getElementById("prop-action-type");
  const propActionUrl = document.getElementById("prop-action-url");
  const propActionMsg = document.getElementById("prop-action-msg");
  
  const groupActionUrl = document.getElementById("group-action-url");
  const groupActionMsg = document.getElementById("group-action-msg");
  const btnDelete = document.getElementById("btn-delete-element");

  // Icon SVG Definitions
  const SVGMAP = {
    cart: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>',
    settings: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
    'arrow-up': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>',
    'arrow-down': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>',
    'arrow-left': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>',
    'arrow-right': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>'
  };

  // --- 1. Drag & Drop Setup ---

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
    const x = e.clientX - rect.left - 40; // Position adjust
    const y = e.clientY - rect.top - 20;

    createElement(draggedType, draggedIcon, Math.max(0, x), Math.max(0, y));
  });

  // --- 2. Element Creation & Management ---

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
      size: type === "icon" ? 36 : (type === "headline" ? 32 : 18),
      actionType: "none",
      actionUrl: "",
      actionMsg: ""
    };

    elements.push(newElement);
    renderCanvas();
    selectElement(id);
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
        el.innerHTML = `<h2 style="font-size:${item.size}px">${item.text}</h2>`;
      } else if (item.type === "box") {
        el.innerHTML = `<div style="width:120px; height:80px; background:${item.color}; border-radius:6px;"></div>`;
      } else {
        el.innerHTML = `<p style="font-size:${item.size}px">${item.text}</p>`;
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
          executeAction(item);
        } else {
          selectElement(item.id);
        }
      });

      // Canvas internal drag positioning
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
        const rect = canvas.getBoundingClientRect();
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

  // --- 3. Inspector Sync & Interaction ---

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

    // Populate Fields
    propId.value = item.id;
    propText.value = item.text;
    propSize.value = item.size;
    propColor.value = item.color;
    propActionType.value = item.actionType;
    propActionUrl.value = item.actionUrl;
    propActionMsg.value = item.actionMsg;

    // Toggle Action inputs dependent on type
    toggleActionFields(item.actionType);

    renderCanvas();
  }

  canvas.addEventListener("click", () => {
    if (!isPreviewMode) {
      selectedElementId = null;
      selectElement(null);
    }
  });

  // Bind Inspector Input Events to Live State
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
    }
  });

  function getSelected() {
    return elements.find(el => el.id === selectedElementId);
  }

  function toggleActionFields(actionType) {
    groupActionUrl.classList.toggle("hidden", actionType !== "open-url");
    groupActionMsg.classList.toggle("hidden", actionType !== "alert-msg");
  }

  // --- 4. Action Engine (Verbindungslogik-Ausführung) ---

  function executeAction(item) {
    switch (item.actionType) {
      case "scroll-top":
        window.scrollTo({ top: 0, behavior: "smooth" });
        canvas.scrollTo({ top: 0, behavior: "smooth" });
        break;

      case "scroll-bottom":
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        canvas.scrollTo({ top: canvas.scrollHeight, behavior: "smooth" });
        break;

      case "history-back":
        alert("🔄 Aktion ausgelöst: Zurück-Funktion im Browser!");
        break;

      case "open-url":
        if (item.actionUrl) {
          window.open(item.actionUrl, "_blank");
        } else {
          alert("Bitte hinterlege eine Ziel-URL im Inspector!");
        }
        break;

      case "cart-add":
        alert("🛒 Artikel wurde dem Warenkorb hinzugefügt!");
        break;

      case "alert-msg":
        alert(item.actionMsg || "Eine Benachrichtigung wurde ausgelöst!");
        break;

      default:
        console.log("Keine Aktion konfiguriert.");
        break;
    }
  }

  // --- 5. Toolbar Actions (Vorschau, Export, Leeren) ---

  btnModeToggle.addEventListener("click", () => {
    isPreviewMode = !isPreviewMode;
    document.body.classList.toggle("preview-mode", isPreviewMode);
    btnModeToggle.innerHTML = isPreviewMode ? "✏️ Editor-Modus" : "👁️ Vorschau-Modus";
    
    if (isPreviewMode) {
      selectedElementId = null;
      renderCanvas();
    }
  });

  btnClear.addEventListener("click", () => {
    if (confirm("Möchtest du wirklich alle Elemente löschen?")) {
      elements = [];
      selectedElementId = null;
      selectElement(null);
      renderCanvas();
    }
  });

  btnExport.addEventListener("click", () => {
    let exportedHTML = `<div style="position:relative; width:100%; min-height:100vh;">\n`;
    elements.forEach(item => {
      exportedHTML += `  <!-- Element ${item.id} -->\n`;
      exportedHTML += `  <div style="position:absolute; left:${item.x}px; top:${item.y}px; color:${item.color};">\n`;
      if (item.type === "icon" && SVGMAP[item.iconName]) {
        exportedHTML += `    ${SVGMAP[item.iconName]}\n`;
      } else if (item.type === "button") {
        exportedHTML += `    <button style="font-size:${item.size}px; background:${item.color}; color:#fff; border:none; padding:8px 16px; border-radius:6px;">${item.text}</button>\n`;
      } else if (item.type === "headline") {
        exportedHTML += `    <h2 style="font-size:${item.size}px;">${item.text}</h2>\n`;
      } else {
        exportedHTML += `    <p style="font-size:${item.size}px;">${item.text}</p>\n`;
      }
      exportedHTML += `  </div>\n`;
    });
    exportedHTML += `</div>`;

    console.log(exportedHTML);
    alert("HTML Code wurde in der Entwickler-Konsole (F12) ausgegeben!");
  });
});
