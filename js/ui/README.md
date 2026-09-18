# js/ui/ — Cross-domain UI helpers

No load-order requirement between these files — every one is only
called from inside event handlers or `state.subscribe()` callbacks, i.e.
at runtime, never at top-level parse time. `sidebar-panels-markup.js` is
the one exception (see below).

| File | Purpose | API |
|---|---|---|
| `toast.js` | Stacked bottom-right toast notifications. `buildToastNode()` builds the raw markup, also reused by `modals.js`. | `window.WebBuilderToast` |
| `modals.js` | Generic central modal (`open`/`openMessage`/`close`) plus `openPositionedMessage()` for freely positioned messages (configurable in the inspector). | `window.WebBuilderModals` |
| `shared-markup.js` | Builds HTML shared between the normal element inspector and the header/footer bar-item inspector: the click-action `<select>`, font-family `<select>`, text-format toolbar, and the "rounded/square/pill" shape select used by the cart editor. Strings only, no event binding. Must load after `shop/cart-editor-markup.js` (which creates the empty shape `<select>`s this fills) and before `editor/inspector.js`/`layout/header-footer-inspector.js`. | `window.WebBuilderSharedMarkup` |
| `sidebar-panels-markup.js` | Injects the markup for the four sidebar tab panels (Elements/Header-Footer/Cart/Products). Must load before `layout/header-footer-inspector.js`, whose `bind()` runs synchronously on `DOMContentLoaded` and needs the header/footer fields immediately. | `window.WebBuilderSidebarPanelsMarkup` |
| `tabs.js` | Sidebar tab switching. Also ends an open cart focus editor when switching to any tab other than "Cart". | `window.WebBuilderTabs` |
