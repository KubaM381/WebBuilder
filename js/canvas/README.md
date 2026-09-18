# js/canvas/ — Canvas rendering, elements, icons, drag/alignment

| File | Purpose | API |
|---|---|---|
| `elements.js` | Canvas-element data only: CRUD (`add`/`update`/`remove`/`duplicate`), selection. `normalizeState()` migrates legacy click-action field names. Must load before `canvas.js` and `editor/inspector.js` — both read `window.WebBuilderElements` at parse time. | `window.WebBuilderElements` |
| `icon-registry.js` | Icon registry — pure data, no DOM. Used by icon canvas elements, header/footer icons, and the "custom icons" upload UI. No load-order requirement of its own. | `window.WebBuilderIconRegistry` |
| `alignment.js` | Shared click+drag controller (Pointer Events, `state.dragLock`) plus Canva-style center/edge alignment-guide snapping. Used by `canvas.js` for canvas elements and `layout/header-footer-render.js` for bar items. Must load before both. The cart focus editor (`shop/cart-editor-drag.js`) reuses only its exported snapping primitives, not `attachInteraction()` itself. | `window.WebBuilderAlignment` |
| `canvas.js` | Viewport, zoom, rendering of placed elements, palette drag & drop, "custom icons" palette UI. Must load after `alignment.js` and `elements.js`. | `window.WebBuilderCanvas` |

The background editor (solid/gradient/image form) lives in
`editor/background.js`, not here — it calls this folder's `canvas.js`
`setBackground()`/`computeBackgroundCss()` at runtime.
