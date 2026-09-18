# js/layout/ — Real page header/footer

Three files, one domain, split by concern. `header-footer-data.js` must
load first — the other two read `window.WebBuilderHeaderFooter` at parse
time. `-render.js` and `-inspector.js` have no order requirement relative
to each other (each reaches the other only through
`window.WebBuilderHeaderFooterRuntime` at runtime).

| File | Purpose | API |
|---|---|---|
| `header-footer-data.js` | State: normalization (`normalizeState`, `normalizeItem`, `clampItemsToHeight`), getters (`getHeader`/`getFooter`), mutators (`updateHeader`/`updateFooter`/`addItem`/`removeItem`/`updateItem`). | `window.WebBuilderHeaderFooter` |
| `header-footer-render.js` | Canvas rendering of the bars and their items, the resize handle, and bar-item selection state (`currentSelection`/`selectItem`/`clearSelection`). Drag/click goes through `canvas/alignment.js`'s `attachInteraction()`, not its own copy. | contributes to `window.WebBuilderHeaderFooterRuntime` |
| `header-footer-inspector.js` | Left sidebar element list + background controls, the right-hand inspector panel for a selected bar element, and the master `render()` that ties the whole domain together. | contributes to `window.WebBuilderHeaderFooterRuntime` |

**Note:** header/footer changes do **not** go through `state.notify()`.
This is the one domain that dispatches its own
`webbuilder:header-footer-change` CustomEvent instead
(`emitChange()`/`onChange(cb)` in `header-footer-data.js`) — every other
domain in the project uses the shared pub/sub.

While the cart focus editor is open, the real header/footer is hidden
and non-interactive (see `css/styles.css`
`body.cart-focus-active .builder-bar`).
