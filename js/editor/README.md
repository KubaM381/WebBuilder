# js/editor/ — Right-hand properties panel + background editor

Must load after `canvas/elements.js` (parse-time read); `background.js`
must additionally load after `canvas/canvas.js`.

| File | Purpose | API |
|---|---|---|
| `inspector.js` | Right-hand panel for normal canvas elements: selection, CRUD, text content/image/size, text formatting, click actions. `select(id)` ends an open cart focus editor when a real element id is selected — but not on a `null` call from `layout/header-footer-render.js`, which only clears the canvas selection. | `window.WebBuilderInspector` (core) |
| `inspector-special.js` | The "Advanced properties" field group rendered below `inspector.js`'s fields in the same `#inspector-form`: icon frame + color, per-icon hover highlight, shape type/style, modal title/body/footer, message position. Reaches `inspector.js` only through `window.WebBuilderInspector` at runtime — no load-order requirement between the two. | contributes `renderSpecial` to `window.WebBuilderInspector` |
| `background.js` | The background editor form (`#bg-type`, `#bg-color-input`, `#bg-grad-*`, `#bg-image-*`) and its bindings. Calls `canvas/canvas.js`'s `setBackground()` at runtime. Also sets `window.WebBuilderCanvas.refreshBackgroundEditor` as a compatibility alias for existing call sites (`builder.js`, Supabase load). | `window.WebBuilderBackground` |
