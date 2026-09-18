# JavaScript Architecture

No bundler, no framework. Every module attaches its public API to
`window.WebBuilderXxx`. `js/builder.js` loads all other files in a fixed
order via `document.write` — **the order in `builder.js` is functionally
relevant**, not just cosmetic. Exception: the three `type="module"` lines
at the end (Supabase) — their actual load order is resolved by the browser
via ES `import` statements, not by `document.write()` order.

> **Structure refactor in progress.** This project is being split into
> smaller, single-responsibility files in phases — see
> `docs/STRUCTURE_PLAN.md` for the target end-state and current phase
> status, and `docs/AI_REFACTOR_GUIDE.md` for the rules to follow when
> continuing it. This file always reflects the current (not the target)
> state.

## Folder structure

```text
js/
├── builder.js             bootstrap / load order (orchestrator only)
├── toolbar.js              zoom buttons, undo/redo buttons, save
├── export.js                static HTML export
├── preview.js                preview mode + click-action runtime
├── README.md                 this file
│
├── core/
│   ├── state.js              window.WebBuilderState + event system
│   ├── utils.js               window.WebBuilderUtils (escapeHtml,
│   │                          buildTextStyleCss, normalizeInPlace)
│   └── storage.js             snapshots, local save, undo/redo service
│
├── canvas/
│   ├── canvas.js              viewport, zoom, rendering of placed
│   │                          elements, palette drag & drop, "Eigene
│   │                          Icons"-palette UI (background editor lives
│   │                          in editor/background.js)
│   ├── alignment.js            shared drag/click controller
│   │                          (window.WebBuilderAlignment) + Canva-style
│   │                          alignment-guide snapping, used by both
│   │                          canvas.js and layout/header-footer-render.js
│   ├── elements.js             canvas-element CRUD only (create, update,
│   │                          remove, duplicate, selection)
│   └── icon-registry.js        icon registry (window.WebBuilderIconRegistry:
│                              register, get, getAll, addCustom,
│                              getCustomNames), incl. "Eigene Icons" upload
│                              support — split out of elements.js since
│                              element CRUD and icon lookup are independent
│                              concerns
│
├── editor/
│   ├── inspector.js            right-hand properties panel for normal
│   │                          canvas elements
│   └── background.js           background editor (solid/gradient/image
│                              form + bindings), split out of
│                              canvas/canvas.js
│
├── layout/
│   ├── header-footer-data.js    header/footer state: normalization,
│   │                          getters (getHeader/getFooter) and mutators
│   │                          (updateHeader/updateFooter/addItem/
│   │                          removeItem/updateItem) — window.WebBuilderHeaderFooter
│   ├── header-footer-render.js  canvas rendering of the bars + bar-item
│   │                          drag/click interaction + bar-item selection
│   │                          state — contributes to
│   │                          window.WebBuilderHeaderFooterRuntime
│   └── header-footer-inspector.js  left sidebar item list/bg controls +
│                              right-hand inspector panel for a selected
│                              bar element + the master render() —
│                              contributes to
│                              window.WebBuilderHeaderFooterRuntime
│
├── shop/
│   ├── products.js             product CRUD + products-tab UI
│   ├── cart-data.js             cart data model: items, config,
│   │                          recommendations, milestones,
│   │                          normalizeState() — window.WebBuilderCart
│   ├── cart-html.js             pure cart HTML building only — no DOM
│   │                          access, no event binding (buildCartHtml,
│   │                          buildCartParts, buildCartItemHTML,
│   │                          wrapLayoutPart/wrapComponent) —
│   │                          window.WebBuilderCartHtml, also
│   │                          contributes buildCartHtml/buildCartParts to
│   │                          window.WebBuilderCartRuntime
│   ├── cart-drawer.js           the real slide-in cart drawer: rendering
│   │                          + open/close + all drawer click/change
│   │                          interactions — contributes render/refresh/
│   │                          open/close to window.WebBuilderCartRuntime
│   ├── cart-sidebar.js          left sidebar cart config UI: discount/
│   │                          recommend/progress toggles, items-list max
│   │                          height, product segments, recommendation
│   │                          list editor, milestone list editor —
│   │                          window.WebBuilderCartConfigRuntime
│   ├── cart-editor-stage.js     cart focus editor: enter/exit focus mode,
│   │                          the on-canvas stage DOM, part/component
│   │                          selection state, and the shared layout
│   │                          data model (get/set/reset a part's or
│   │                          component's pixel offset) — contributes
│   │                          enter/exit/isActive/renderStage plus
│   │                          selection + layout helpers to
│   │                          window.WebBuilderCartFocus
│   ├── cart-editor-drag.js      cart focus editor: all pointer-drag
│   │                          interaction on the stage (article resize,
│   │                          component drag, part drag), reusing
│   │                          canvas/alignment.js's snapping primitives —
│   │                          contributes bindFocusStageInteractions to
│   │                          window.WebBuilderCartFocus
│   ├── cart-editor-panel.js     cart focus editor: renders the right-hand
│   │                          #cart-inspector-form field groups for
│   │                          whichever part/component is selected —
│   │                          contributes renderPartPanel to
│   │                          window.WebBuilderCartFocus
│   └── cart-editor-bindings.js  cart focus editor: every field event
│                              binding for #cart-inspector-form plus the
│                              open/close-editor buttons. See
│                              ../docs/CART_EDITOR_TASKS.md for the
│                              current feature-level task list before
│                              changing any of the four cart-editor-*.js
│                              files.
│
├── pages/                       reserved for a future multi-page client
│                              feature (currently only rudimentary support
│                              lives in Supabase/supabase-data.js) — empty
│                              for now
│
├── ui/
│   ├── toast.js                 toast notifications
│   ├── modals.js                 generic modal + positioned messages
│   ├── shared-markup.js          shared HTML for #prop-*/#bar-prop-* (see
│                              below)
│   └── tabs.js                   sidebar tab switching (Elemente/
│                              Kopf-Fuß/Warenkorb/Produkte)
│
└── Supabase/                     see its own README
    ├── supabase-config.js
    ├── supabase-data.js
    ├── supabase-ui.js
    └── README.md
```

## Load order (from `builder.js`)

```text
core/state.js → core/utils.js → ui/toast.js → core/storage.js
→ canvas/elements.js → canvas/icon-registry.js
→ shop/products.js → shop/cart-data.js
→ shop/cart-html.js → shop/cart-drawer.js → shop/cart-sidebar.js
→ shop/cart-editor-stage.js → shop/cart-editor-drag.js
→ shop/cart-editor-panel.js → shop/cart-editor-bindings.js
→ canvas/alignment.js → canvas/canvas.js → editor/background.js
→ ui/shared-markup.js → editor/inspector.js → toolbar.js
→ layout/header-footer-data.js → layout/header-footer-render.js
→ layout/header-footer-inspector.js → export.js
→ ui/modals.js → preview.js → ui/tabs.js
→ Supabase/supabase-config.js (module)
→ Supabase/supabase-data.js (module)
→ Supabase/supabase-ui.js (module)
```

Dependencies that matter most (each module reads the ones before it via
`window.WebBuilderXxx` at top-level parse time, not just at runtime):

- **`core/utils.js` before anything that uses `window.WebBuilderUtils` at
  parse time** — `shop/products.js`, `shop/cart-data.js`,
  `canvas/canvas.js` and `layout/header-footer-data.js`/
  `-render.js`/`-inspector.js` all read it immediately when their script
  runs (not inside a deferred callback).
- **`canvas/elements.js` before `editor/inspector.js`** — it reads
  `window.WebBuilderElements` at top-level parse time. `canvas/canvas.js`
  also reads it at top-level parse time. `canvas/icon-registry.js` has no
  such requirement (see its own module section below) but is kept
  adjacent to `elements.js` for readability.
- **`shop/products.js` before `shop/cart-data.js`**, since `cart-data.js`
  references products exclusively via `window.WebBuilderProducts` (no own
  product data).
- **`shop/cart-data.js` before `shop/cart-html.js`, `shop/cart-drawer.js`,
  `shop/cart-sidebar.js` and the four `shop/cart-editor-*.js` files** —
  each reads `window.WebBuilderCart` and/or `window.WebBuilderState` at
  top-level parse time (`cart-editor-drag.js` only needs `window.WebBuilderState`,
  the other three also need `window.WebBuilderCart`). `cart-drawer.js` and
  `cart-sidebar.js` only reach into `window.WebBuilderCartHtml` inside
  function bodies (at runtime), so their load order relative to
  `cart-html.js` doesn't strictly matter — `cart-html.js` is listed first
  by convention (data → html → drawer/sidebar → editor).
- **`canvas/alignment.js` before `canvas/canvas.js` and
  `layout/header-footer-render.js`** — both call
  `window.WebBuilderAlignment.attachInteraction()`/`toLocalCoords()` for
  drag/click handling and snapping. The four `shop/cart-editor-*.js` files
  load after it too, but only `cart-editor-drag.js` reuses its exported
  snapping primitives (`collectSnapTargets`/`snapPosition`/guide-layer
  helpers), not `attachInteraction()` itself — see that module's section
  below for why.
- **`canvas/canvas.js` before `editor/background.js`** — `background.js`
  calls `window.WebBuilderCanvas.setBackground()` at runtime (inside its
  form's `commit()` handler).
- **`core/storage.js` and `canvas/canvas.js` before `toolbar.js`** —
  `toolbar.js` reads `window.WebBuilderCanvas` and `window.WebBuilderHistory`
  at top-level parse time.
- **`canvas/canvas.js` and `layout/header-footer-data.js` before
  `export.js`** — `export.js` reads both at top-level parse time (via
  `window.WebBuilderHeaderFooter` for `getHeader()`/`getFooter()`, and
  `window.WebBuilderHeaderFooterRuntime` at runtime for `itemInnerHtml()`).
- **`ui/shared-markup.js` before `editor/inspector.js` and
  `layout/header-footer-inspector.js`**: it fills the action-type `<select>`
  options and the text-format toolbar buttons that those two modules read
  `.value` from / bind id-based click listeners to, right after
  `DOMContentLoaded`. All three register their `DOMContentLoaded`
  listener, so as long as `shared-markup.js`'s listener is registered
  first (i.e. its `<script>` tag loads first), its markup is in place
  before either panel renders or binds.
- **`layout/header-footer-data.js` before `layout/header-footer-render.js`
  and `layout/header-footer-inspector.js`** — both read
  `window.WebBuilderHeaderFooter` at top-level parse time.
  `-render.js` and `-inspector.js` have **no** parse-time requirement
  relative to each other: each only reaches into the other's exports via
  `window.WebBuilderHeaderFooterRuntime` inside function bodies, at
  runtime, long after both have loaded. They are still listed in this
  order in `builder.js` by convention (rendering before the panel that
  reacts to it), not because it's required.
- **The four `shop/cart-editor-*.js` files have no parse-time requirement
  relative to each other** — each only reaches into the others' exports
  via `window.WebBuilderCartFocus` inside function bodies, at runtime.
  They are listed `-stage` → `-drag` → `-panel` → `-bindings` in
  `builder.js` by convention (data/rendering foundation before
  interaction before the panel before its field wiring), not because it's
  required.

`ui/toast.js`, `ui/modals.js`, `ui/tabs.js` and `canvas/icon-registry.js`
have no load-order requirement of their own — every module only calls
`window.WebBuilderToast?.show?.()` / `window.WebBuilderModals?.open?.()` /
`window.WebBuilderIconRegistry?.get?.()` etc. from inside event handlers or
`state.subscribe()` callbacks (i.e. at runtime, long after all scripts
have loaded), never at top-level parse time.

## Core building blocks

### `core/state.js`
Defines `window.WebBuilderState` — the full application state (elements,
products, cart, header/footer, background, zoom, history stacks). Also
provides the event system:

- `state.subscribe(fn)` — register a listener, receives
  `{domain, action, payload, state}`.
- `state.notify(domain, action, payload)` — called by any module when its
  data changes.

Every other module reads/writes exclusively through this `state` object —
no module keeps its own parallel state. `state.cartFocusMode`/
`state.cartFocusSelectedPart` (cart focus editor runtime UI state) and
`state.dragLock` (shared drag-in-progress flag) are **not** persisted —
see `core/storage.js`'s `createSnapshot()` for exactly which fields are.

### `core/utils.js`
Exposes `window.WebBuilderUtils` (`normalizeInPlace`, `escapeHtml`,
`buildTextStyleCss`) as shared, project-wide, stateless helpers. Split out
of `state.js` so pure helpers with no dependency on `WebBuilderState`
itself live separately from the state/event registry. Must load before
any module that reads it at parse time (see "Load order" above).

### `core/storage.js`
Exposes `window.WebBuilderStorage` and `window.WebBuilderHistory`.

- `createSnapshot()` / `applySnapshot()` are the **only** serialization
  form for the whole project — used by local save, undo/redo and Supabase.
  New persistable fields must be added here. Nested fields inside an
  already-covered top-level object (e.g. a new key under
  `state.cartConfig`) do NOT need a separate change here, since
  `cartConfig` is cloned whole — only a genuinely new **top-level**
  `state.*` field does.
- `armHistory()` / `commitHistory()` wrap an undo transaction (arm before a
  change, commit after).
- `WebBuilderHistory.undoSnapshot()` / `.redoSnapshot()` return snapshots
  to restore.
- `normalizeRuntimeState()` calls each domain's own `normalizeState()`
  (elements, products, cart, header/footer, canvas) after every
  load/apply — this is where legacy-field migrations (see
  `canvas/elements.js`) run.

### `ui/toast.js`
`window.WebBuilderToast.show(message, type)` — single place for the
stacked bottom-right notifications. `buildToastNode()` builds the raw
toast markup, also reused by `ui/modals.js` (`openPositionedMessage()`).

### `ui/modals.js`
`window.WebBuilderModals` — generic central modal (`open`, `openMessage`,
`close`) plus `openPositionedMessage()` for freely positioned messages
(top/bottom/left/right/center, configurable in the inspector).

### `ui/shared-markup.js`
Builds and injects HTML that `web.html` would otherwise duplicate verbatim
between the normal element inspector (`#prop-*`) and the header/footer
bar-item inspector (`#bar-prop-*`): the click-action `<select>`, the
font-family `<select>`, and the text-format toolbar (bold/italic/
underline/align buttons + color input + font-family select). Builds
strings only — no event binding, no state access. See "Load order" above
for why this must load before `editor/inspector.js` and
`layout/header-footer-inspector.js`.

### `ui/tabs.js`
Sidebar tab switching (Elemente/Kopf-Fuß/Warenkorb/Produkte). Also ends an
open cart focus editor automatically when switching to any tab other than
"Warenkorb" — a plain, self-initializing module like `toast.js`/`modals.js`.

## Domain modules

### `canvas/elements.js`
Canvas elements (text, headline, button, image, box, shape, icon) as plain
data: CRUD (`add`, `update`, `remove`, `duplicate`), selection
(`setSelected`/`getSelected`). `normalizeState()` migrates legacy
click-action field names (`action`, `action_type`, `url`, `message`,
`product_id`, …) from elements saved before the
`actionType`/`actionUrl`/`actionMsg`/`productId` rename. The icon registry
used to live in this file too — it's now `canvas/icon-registry.js` (see
below), since element CRUD and icon lookup are independent concerns.

### `canvas/icon-registry.js`
The icon registry (`window.WebBuilderIconRegistry`: `register`, `get`,
`getAll`, `getMergedMap`, `addCustom`, `getCustomNames`) — pure
data/registry, no DOM access. Split out of `canvas/elements.js`. Used by
icon canvas elements, header/footer icons
(`layout/header-footer-render.js`) and the "Eigene Icons" upload UI
(`canvas/canvas.js`'s `bindCustomIconForm()`/`renderCustomIconPalette()`).
Custom icons added via `addCustom()` are session-only, never persisted.
No load-order requirement of its own (see "Load order" above).

### `canvas/alignment.js`
Shared click+drag controller (`attachInteraction()`, Pointer Events, with
a movement threshold and `state.dragLock`) plus Canva-style center/edge
alignment-guide snapping (`window.WebBuilderAlignment`). Used by
`canvas/canvas.js` for canvas elements and by
`layout/header-footer-render.js` for bar items — neither of those files
implements its own drag/snap logic. `shop/cart-editor-drag.js` does
**not** use `attachInteraction()` itself — its stage positions parts/
components via a CSS transform offset from their natural flow position on
an unscaled surface, outside the zoom-scaled `#canvas-column`, whereas
`attachInteraction()` assumes absolute left/top positioning inside a
zoom-scaled container. It does reuse this file's exported snapping
primitives directly (`collectSnapTargets`/`snapPosition`/`createGuideLayer`/
`removeGuideLayer`/`updateGuideVisibility`, each accepting an explicit
`zoomOverride` since the cart stage is never zoom-scaled) so cart dragging
shows the same alignment guides without inheriting `canvas.js`'s zoom
assumption. Also exposes `toLocalCoords()`, used for translating
pointer/drop coordinates into the zoom-adjusted canvas coordinate space.

### `canvas/canvas.js`
Rendering of canvas elements, zoom, canvas size, drag-and-drop from the
palette, palette UI for custom icons. Text-style CSS (bold/italic/
underline/font-family) for rendered elements comes from the shared
`WebBuilderUtils.buildTextStyleCss()` helper, also used by `export.js`.
The background editor form/bindings live in `editor/background.js`, which
calls this file's `setBackground()`/`computeBackgroundCss()` at runtime.

### `editor/background.js`
The background editor: solid/gradient/image form controls
(`#bg-type`, `#bg-color-input`, `#bg-grad-*`, `#bg-image-*`) and their
bindings. Split out of `canvas/canvas.js`, which still owns the actual
`setBackground()`/`computeBackgroundCss()` application logic (used by
canvas rendering and `export.js`) — this file only owns the form. Exposes
`window.WebBuilderBackground` (`bind`, `refresh`), and also sets
`window.WebBuilderCanvas.refreshBackgroundEditor` as a backward-compatible
alias for existing call sites (`builder.js`'s initial render,
`Supabase/supabase-data.js` after a cloud load). Must load after
`canvas/canvas.js`.

### `editor/inspector.js`
Right-hand properties panel for normal canvas elements: text content,
image, size, text formatting, click actions
(`actionType`/`actionUrl`/`actionMsg`/`productId`), advanced properties
(icon frame, shape style, modal content, message position),
duplicate/delete. The `<select>` options and toolbar buttons it binds to
are injected by `ui/shared-markup.js` — `inspector.js` itself never builds
that markup. `select(id)` deliberately ends an open cart focus editor
whenever a real canvas element id is selected, but is also called with
`id = null` from `layout/header-footer-render.js`'s `selectItem()` purely
to clear the normal canvas selection — that `null` call must NOT end the
cart editor (gated on `id != null`).

### `layout/header-footer-data.js`
Data layer for the **real page** header/footer: state normalization
(`normalizeState`, `normalizeItem`, `clampItemsToHeight`), getters
(`getHeader`, `getFooter`) and mutators (`updateHeader`, `updateFooter`,
`addItem`, `removeItem`, `updateItem`). Exposes
`window.WebBuilderHeaderFooter`. `state.notify()` is **not** used for
header/footer changes — this module dispatches its own
`webbuilder:header-footer-change` CustomEvent instead (`emitChange()`/
`onChange(cb)`) — see "Event conventions" below.

### `layout/header-footer-render.js`
Canvas rendering of the header/footer bars and their elements
(`buildBarElement`, `renderBars`), the resize handle, and bar-item
selection state (`currentSelection`, `selectItem`, `clearSelection`) since
selection directly drives the bar-item highlight class rendered here.
Drag/click interaction for bar items goes through `canvas/alignment.js`'s
`attachInteraction()` (`window.WebBuilderAlignment`), not its own copy.
Contributes `renderBars`, `selectItem`, `clearSelection`,
`currentSelection`, `itemInnerHtml` to `window.WebBuilderHeaderFooterRuntime`
(the other contributor is `layout/header-footer-inspector.js`, via
`Object.assign` onto the same object so load order between the two
doesn't matter).

### `layout/header-footer-inspector.js`
The left sidebar's header/footer element list + background controls, the
**own right-hand inspector panel** for a selected bar element (separate
from the normal element inspector, since both panels are mutually
exclusive), and the master `render()` that ties the whole domain together
(re-syncs sidebar toggles/lists/bg controls, re-renders the right panel,
and triggers a bar re-render via `window.WebBuilderHeaderFooterRuntime.renderBars()`).
Like `editor/inspector.js`, its `<select>` options and toolbar buttons
come from `ui/shared-markup.js`. Contributes `render` to
`window.WebBuilderHeaderFooterRuntime`. While the cart focus editor is
open, the real header/footer is hidden and non-interactive
(`css/styles.css` `body.cart-focus-active .builder-bar`).

### `shop/products.js`
Product management: CRUD + normalization + rendering/handling of the
product tab (`#product-list`, `#btn-add-product`). `window.WebBuilderProducts`
is the canonical interface used by `editor/inspector.js`,
`layout/header-footer-inspector.js`, `preview.js`, `core/storage.js`,
`shop/cart-*.js`. `window.WebBuilderProductsRuntime.render()` re-renders
the tab.

### `shop/cart-data.js`
Cart data model: items, config (shape, colors, quantity control, price
display), discount code (demo: `DEMO10`), recommendations, milestones/
progress bar. References products only via IDs through
`window.WebBuilderProducts`. No DOM/rendering — exposed as
`window.WebBuilderCart`. `state.cartConfig` is the single nested object
holding almost all cart settings — see the full field list/defaults in
this file's `normalizeState()`. New `cartConfig.*` fields don't need a
`core/storage.js` change, but always add a default in `normalizeState()`
so existing saved projects don't load with `undefined`.
Recommendations are rule objects (`{id, productId, alternativeProductId,
text, condition: {type, value}}`) — `pickRecommendation()` is the single
place deciding which recommendation (if any) to show for a given cart
state.

### `shop/cart-html.js`
Pure cart HTML building — no DOM access, no event binding, no history/
state mutation. Builds the shared cart body (title, dividers, progress
bar, items, product segments, recommendation, discount, totals incl.
shipping, checkout button) used identically by both the real drawer
(`interactive: false`, see `cart-drawer.js`) and the cart focus editor
stage (`interactive: true`, see `cart-editor-stage.js`), so both stay
pixel-identical apart from editing affordances — this invariant must be
preserved by any change here. `wrapComponent()`/`wrapLayoutPart()` are the
two positioning primitives: they wrap a top-level cart block / a
cart-item sub-part in a draggable/selectable span only when `interactive`
is true or a non-zero offset is already stored, so untouched projects
render with zero extra markup. Exposes `window.WebBuilderCartHtml`
(`buildCartHtml`, `buildCartParts`, `buildCartItemHTML`,
`buildRecommendCardContentHtml`, `buildItemsHtml`, `buildTitleHtml`,
`buildCheckoutHtml`, `wrapLayoutPart`, `wrapComponent`), and also
contributes `buildCartHtml`/`buildCartParts` onto
`window.WebBuilderCartRuntime` (the other contributor is
`shop/cart-drawer.js`, via `Object.assign` onto the same object), since
`shop/cart-editor-stage.js` calls
`window.WebBuilderCartRuntime.buildCartParts()` at runtime.

### `shop/cart-drawer.js`
The real slide-in cart drawer (`#cart-drawer`/`#cart-items-list`):
rendering (via `shop/cart-html.js`'s `buildCartHtml()`), open/close, and
every click/change interaction inside it (discount code, add recommended
product, quantity/price/remove per item). Contributes `render`, `refresh`,
`open`, `close` to `window.WebBuilderCartRuntime` (the other contributor
is `shop/cart-html.js`, via `Object.assign` onto the same object so load
order between the two doesn't matter). `refresh()` is the single place
that re-renders both the drawer and — if open — the cart focus editor
stage; other modules call it via `window.WebBuilderCartRuntime.refresh()`
rather than duplicating that logic.

### `shop/cart-sidebar.js`
The left sidebar's cart config UI (`#panel-cart`): the discount/recommend/
progress enable toggles, the items-list max-height field, product-segment
management (create/edit/delete via a picker modal), the recommendation
list editor, and the milestone list editor. None of this ties to
selecting a specific on-canvas part, which is why it lives here rather
than in the right-hand cart editor panel (`shop/cart-editor-panel.js`).
Exposes `window.WebBuilderCartConfigRuntime` (`render`,
`renderRecommendList`, `renderMilestoneList`, `renderSegmentList`). Calls
`window.WebBuilderCartRuntime.refresh()` at runtime after any change here
instead of re-rendering the drawer itself.

### `shop/cart-editor-stage.js`
The cart focus editor's ("Warenkorb-Editor") stage and selection layer.
Owns `state.cartFocusMode`'s lifecycle (`enterFocusMode`/`exitFocusMode`),
the on-canvas stage DOM (`renderFocusStage`, built from
`shop/cart-html.js`'s `buildCartParts()`), which part or component is
currently selected (`state.cartFocusSelectedPart`,
`selectFocusPart`/`selectFocusPartLight`, `applySelectionHighlight`), and
the shared layout data model used by every other cart-editor file:
`getPartLayout`/`setPartLayoutSilent`/`setPartLayout`/`resetPartLayout`
for cart-item/recommend-card sub-parts (`cartConfig.itemDisplay.layout`/
`cartConfig.recommendDisplay.layout`, picked by `resolveLayoutMap()`) and
`getSelectedLayout`/`setSelectedLayout`/`resetSelectedLayout` for
whichever part or top-level component is currently selected (top-level
components use the flat `cartConfig.componentLayout` map instead).
`NON_POSITIONABLE` (the "background"/"itemRepresentation" components,
selectable but never draggable) and the divider key helpers
(`DIVIDER_PREFIX`, `isDividerKey`) also live here since they're part of
this same selection/layout model. Exposes `window.WebBuilderCartFocus`
(`enter`, `exit`, `isActive`, `renderStage`, plus the selection/layout
helpers above) — the other three `cart-editor-*.js` files extend the same
object via `Object.assign` and call back into it at runtime rather than
duplicating any of this.

### `shop/cart-editor-drag.js`
All pointer-event drag handling on the cart editor stage
(`bindFocusStageInteractions`, called by `cart-editor-stage.js`'s
`renderFocusStage()` at runtime): resizing the article representation
("Artikel-Darstellung") via its own drag handle, dragging a top-level
component (progress/discount/recommend/checkout/totals/title/divider),
and dragging a cart-item or recommend-card sub-part. Has its own raw
pointer-event handling instead of `canvas/alignment.js`'s shared
`attachInteraction()` controller — it positions parts/components via a
CSS transform offset from their natural flow position on an unscaled
stage, not `attachInteraction()`'s absolute left/top + zoom-scaled model —
but reuses `alignment.js`'s exported snapping primitives
(`collectSnapTargets`/`snapPosition`/guide-layer helpers, always with
`zoomOverride: 1`) so dragging here shows the same alignment guides as
canvas elements and header/footer bar items. Reads and writes position
exclusively through `window.WebBuilderCartFocus` (`cart-editor-stage.js`'s
layout helpers) — never its own copy of that data model. Contributes
`bindFocusStageInteractions` to `window.WebBuilderCartFocus`.

### `shop/cart-editor-panel.js`
Renders the right-hand `#cart-inspector-form` panel
(`renderFocusPartPanel`): shows the field group for whichever part or
component `state.cartFocusSelectedPart` currently points at (cart title,
checkout button, discount field incl. its milestone-driven extra
discount, progress bar incl. milestones, recommendation, background,
article representation, Kosten-Übersicht incl. shipping, a divider, or a
cart-item sub-part like qty/price/remove), and fills each visible field
with its current value. Read-only — turning user input into
`cart.setConfig()`/`cart.setItemDisplay()` calls is
`shop/cart-editor-bindings.js`'s job, not this file's. Contributes
`renderPartPanel` to `window.WebBuilderCartFocus`.

### `shop/cart-editor-bindings.js`
Every field event listener for the `#cart-inspector-form` panel plus the
"open editor"/"close editor"/"select article representation" buttons and
the divider add/remove buttons — the layer that actually calls
`cart.setConfig()`/`cart.setItemDisplay()`/`cart.setButtonLabel()`/
`cart.addDivider()`/`cart.removeDivider()` in response to user input, then
refreshes the drawer/stage/panel via
`window.WebBuilderCartRuntime.refresh()`. Reads/writes selection and
layout only through `window.WebBuilderCartFocus`
(`cart-editor-stage.js`'s exports). Self-initializing on
`DOMContentLoaded`, like the rest of the project's UI-binding modules.

### `toolbar.js`
Top toolbar: zoom controls (delegates to `canvas/canvas.js`), undo/redo
(uses `core/storage.js`/history), local save binding. Exposes
`refreshAllDomains()` — re-renders all affected UI areas after undo/redo
**or** a cloud load (canvas, header/footer, cart, products).

### `preview.js`
Preview mode (hides editor chrome) plus the runtime for click actions in
preview/live mode (`window.WebBuilderActionRuntime.execute(item)`):
scrolling, browser history, opening a URL, adding a product to the cart,
opening the cart drawer, opening a modal, showing a message.

### `export.js`
Builds a static HTML document (header/elements/footer) from the current
state for the export button. No own state, no cart/product logic — a pure
snapshot-to-HTML renderer.

### `Supabase/` (folder)
Supabase client, auth, project/multi-page management, and the cloud/account
modal UI (`#btn-cloud`). Split into a data layer (`supabase-data.js`) and a
UI layer (`supabase-ui.js`) — **details and rationale in
`js/Supabase/README.md`**. Uses only
`WebBuilderStorage.createSnapshot()`/`applySnapshot()` for save/load.

## Event conventions

- Elements/state uniformly use these field names for click actions:
  `actionType`, `actionUrl`, `actionMsg`, `productId`. Legacy names
  (`action`, `action_type`, `product_id`, `message`, …) are migrated once
  on load by each domain's `normalizeState()` (`canvas/elements.js`,
  `layout/header-footer-data.js`'s `normalizeItem`) — `preview.js`/
  `editor/inspector.js` read only the canonical names.
- Drag interactions set `state.dragLock = true` while a move is active
  (see `canvas/alignment.js`). Any module that re-renders on state changes
  must respect this flag (see `scheduleRender()` in `canvas/canvas.js` and
  `render()` in `layout/header-footer-inspector.js`), otherwise a
  re-render mid-drag can replace the DOM node under the cursor and abort
  the move. `shop/cart-editor-drag.js` uses its own pointer handling (see
  its module section above) and does not set `state.dragLock`.
- Header/footer changes do NOT go through `state.notify()` — see
  `layout/header-footer-data.js` above (`emitChange()`/`onChange()`).
- Supabase password recovery: `Supabase/supabase-data.js` dispatches
  `CustomEvent("webbuilder:supabase-password-recovery")`,
  `Supabase/supabase-ui.js` listens and opens the password modal. Same
  pattern as `webbuilder:state-change` in `core/state.js`.

See root `README.md`'s "Known technical debt" section — kept there, not
duplicated here, so there's exactly one place to check.
