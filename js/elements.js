import { state, renderCanvas } from './builder.js';
import { selectElement } from './inspector.js';
import { showToast } from './preview.js';

export const SVGMAP = {
  cart: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>',
  settings: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z"/></svg>',
  'arrow-up': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>',
  'arrow-down': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>',
  'arrow-left': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>',
  'arrow-right': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>'
};

export function addCustomIcon(name, svgOrUrl) {
  if (!name) return;
  if (svgOrUrl.trim().startsWith("<svg")) {
    SVGMAP[name] = svgOrUrl;
  } else {
    SVGMAP[name] = `<img src="${svgOrUrl}" style="width:100%; height:100%; object-fit:contain;" />`;
  }
  showToast(`Icon '${name}' erfolgreich zur SVGMap hinzugefügt!`, "success");
}

export function createElement(type, iconName = null, x = 50, y = 50, customProps = {}) {
  const id = "elem_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
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
    actionMsg: "",
    bgColor: "#ffffff",
    bgTransparent: true,
    borderStyle: "none",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: "0px",
    padding: 4,
    width: "auto",
    modalTitle: "Information",
    modalBody: "Inhalt des Modals hier eintragen...",
    linkScope: "full",
    linkWord: "",
    wordHighlights: "",
    hoverImageUrl: "",
    transitionDuration: "0.3s",
    transitionEasing: "ease",
    hoverTooltip: "",
    category: "",
    isCategoryTrigger: false,
    groupId: null,
    ...customProps
  };

  state.elements.push(newElement);
  renderCanvas();
  selectElement(id);
  showToast("Neues Element hinzugefügt", "success");
  return newElement;
}

export function createProductCardTemplate() {
  const gId = "group_product_" + Date.now();
  const startX = 100;
  const startY = 100;

  createElement("image", null, startX, startY, {
    imageUrl: "https://picsum.photos/260/180",
    size: 260,
    groupId: gId,
    category: "Pulver",
    hoverTooltip: "Premium Pulver - Details anzeigen"
  });

  createElement("headline", null, startX, startY + 190, {
    text: "Premium Pulver 500g",
    size: 20,
    groupId: gId,
    category: "Pulver"
  });

  createElement("text", null, startX, startY + 225, {
    text: "Preis: 49,99 € | Reines Qualitätsprodukt",
    size: 14,
    color: "#475569",
    groupId: gId,
    category: "Pulver"
  });

  createElement("button", null, startX, startY + 260, {
    text: "In den Warenkorb",
    color: "#2563eb",
    actionType: "cart-add",
    groupId: gId,
    category: "Pulver"
  });

  showToast("Produkt-Karte Template auf Zeichenfläche erstellt!", "success");
}
