# js/shop/ — Products + cart

## Products

| File | Purpose | API |
|---|---|---|
| `products.js` | Product CRUD + normalization + the products tab UI (`#product-list`). Must load before every cart file below — they reference products only via `window.WebBuilderProducts`. | `window.WebBuilderProducts`, `window.WebBuilderProductsRuntime` |

## Cart data (four files, one shared object)

Load order matters: `cart-items.js` → `cart-recommendations.js` →
`cart-milestones.js` → `cart-config.js` (last — it calls
`normalizeState()` once every other file has attached its part). All four
contribute to `window.WebBuilderCart`.

| File | Purpose |
|---|---|
| `cart-items.js` | Item CRUD, price/quantity mutation, totals. |
| `cart-recommendations.js` | Recommendation rule objects + `pickRecommendation()` (which one to show for a given cart state). |
| `cart-milestones.js` | Progress-bar milestones, product segments, freely placeable dividers. |
| `cart-config.js` | `getConfig`/`setConfig`, currency, discount code, and the orchestrating `normalizeState()`. |

## Cart HTML, drawer, sidebar

| File | Purpose | API |
|---|---|---|
| `cart-html.js` | Pure HTML building only — no DOM access, no event binding. Builds the shared cart body (title, dividers, progress, items, recommendation, discount, totals, checkout) used identically by the real drawer and the cart editor stage. | `window.WebBuilderCartHtml`, plus `buildCartHtml`/`buildCartParts` on `window.WebBuilderCartRuntime` |
| `cart-drawer.js` | The real slide-in drawer: rendering, open/close, all its click/change interactions. `refresh()` re-renders both the drawer and — if open — the cart editor stage. | contributes to `window.WebBuilderCartRuntime` |
| `cart-sidebar.js` | Left sidebar cart config UI (`#panel-cart`): discount/recommend/progress toggles, items-list max height, product segments, recommendation list editor, milestone list editor. | `window.WebBuilderCartConfigRuntime` |

## Cart focus editor ("Warenkorb-Editor")

Read `docs/CART_EDITOR_TASKS.md` before changing any of these files. No
parse-time load-order requirement between the five below — each reaches
the others only through `window.WebBuilderCartFocus` at runtime, which
all five contribute to.

| File | Purpose |
|---|---|
| `cart-editor-markup.js` | Injects the static `#cart-inspector-form` markup. Must load before `ui/shared-markup.js` (which fills the shape `<select>`s this file creates empty). |
| `cart-editor-stage.js` | Enter/exit focus mode, the on-canvas stage DOM, part/component selection state, and the shared layout data model (get/set/reset a part's or component's pixel offset). |
| `cart-editor-drag.js` | All pointer-drag interaction on the stage (article resize, component drag, part drag). Reuses `canvas/alignment.js`'s snapping primitives directly instead of `attachInteraction()`, since the stage positions things via a CSS transform on an unscaled surface. |
| `cart-editor-panel.js` | Renders the right-hand `#cart-inspector-form` fields for whichever part/component is selected. Read-only — turning input into state changes is `cart-editor-bindings.js`'s job. |
| `cart-editor-bindings.js` | Every field event listener for `#cart-inspector-form` plus the open/close-editor buttons. |
