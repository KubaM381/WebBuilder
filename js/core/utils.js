// js/core/utils.js
// WebBuilder shared, project-wide helper functions. Split out from
// state.js so pure helpers (no dependency on WebBuilderState itself) live
// separately from the state/event registry. Must load before any module
// that reads window.WebBuilderUtils at parse time (top-level `const esc =
// window.WebBuilderUtils.escapeHtml`) — see js/README.md "Load order".
window.WebBuilderUtils = window.WebBuilderUtils || {
  // Normalizes a list in place instead of rebuilding it, so existing
  // objects keep their reference (important while something else holds a
  // reference to a list item, e.g. during a drag or an active input).
  // Used by shop/cart-data.js, shop/products.js, layout/header-footer.js.
  normalizeInPlace(list, normalizeFn) {
    if (!Array.isArray(list)) return [];
    return list.map(item => {
      if (item && typeof item === "object" && item.id) {
        Object.assign(item, normalizeFn(item));
        return item;
      }
      return normalizeFn(item);
    });
  },
  escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  },
  // Shared text-style CSS (font-weight/font-style/text-decoration/
  // font-family) for canvas/canvas.js and export.js. normalWeight covers
  // the differing non-bold default per element type (button "600",
  // headline "400", plain text "normal").
  buildTextStyleCss(item = {}, normalWeight = "normal") {
    return `font-weight:${item.bold ? "bold" : normalWeight};font-style:${item.italic ? "italic" : "normal"};text-decoration:${item.underline ? "underline" : "none"};font-family:${item.fontFamily || "inherit"};`;
  }
};
