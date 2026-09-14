# JavaScript Architecture

No bundler, no framework. Every module attaches its public API to
`window.WebBuilderXxx`. `js/builder.js` loads all other files in a fixed
order via `document.write` — **the order in `builder.js` is functionally
relevant**, not just cosmetic. Exception: the three `type="module"` lines
at the end (Supabase) — their actual load order is resolved by the browser
via ES `import` statements, not by `document.write()` order.

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
│   │                          elements, background-editor binding,
│   │                          palette drag & drop
│   ├── alignment.js            shared drag/click controller
│   │                          (window.WebBuilderAlignment) + Canva-style
│   │                          alignment-guide snapping, used by both
│   │                          canvas.js and layout/header-footer.js
│   └── elements.js             canvas-element CRUD + icon registry
│                              (window.WebBuilderIconRegistry, incl.
│                              "Eigene Icons" upload)
│
├── editor/
│   └── inspector.js            right-hand properties panel for normal
│                              canvas elements
│   (background.js not yet split out — the background editor still lives
│   inside canvas/canvas.js; move it here once that area needs real growth)
│
├── layout/
│   └── header-footer.js        header/footer domain: data, canvas
│                              rendering, own right-hand inspector panel
│
├── shop/
│   ├── products.js             product CRUD + products-tab UI
│   ├── cart-data.js             cart data model: items, config,
│   │                          recommendations, milestones,
│   │                          normalizeState() — window.WebBuilderCart
│   ├── cart-render.js           shared HTML building for drawer + focus
│   │                          editor (buildCartHtml, buildCartItemHTML,
│   │                          wrapPart/wrapComponent), drawer bindings,
│   │                          base toggles — window.WebBuilderCartRuntime
│   │                          + window.WebBuilderCartConfigRuntime
│   └── cart-editor.js           cart focus editor: stage, drag
│                              interactions, part/component panel,
│                              recommendation/milestone list UI —
│                              window.WebBuilderCartFocus
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
→ canvas/elements.js → shop/products.js → shop/cart-data.js
→ shop/cart-render.js → shop/cart-editor.js → canvas/alignment.js
→ canvas/canvas.js → ui/shared-markup.js → editor/inspector.js
→ toolbar.js → layout/header-footer.js → export.js → ui/modals.js
→ preview.js → ui/tabs.js
→ Supabase/supabase-config.js (module)
→ Supabase/supabase-data.js (module)
→ Supabase/supabase-ui.js (module)
```

Dependencies that matter most (each module reads the ones before it via
`window.WebBuilderXxx` at top-level parse time, not just at runtime):

- **`core/utils.js` before anything that uses `window.WebBuilderUtils` at
  parse time** — `shop/products.js`, `shop/cart-data.js`,
  `canvas/canvas.js` and `layout/header-footer.js` all read it immediately
  when their script runs (not inside a deferred callback).
- **`canvas/elements.js` before `canvas/canvas.js` and
  `editor/inspector.js`** — both read `window.WebBuilderElements` at
  top-level parse time.
- **`shop/products.js` before `shop/cart-data.js`**, since `cart-data.js`
  references products exclusively via `window.WebBuilderProducts` (no own
  product data).
- **`shop/cart-data.js` before `shop/cart-render.js` and
  `shop/cart-editor.js`** — both read `window.WebBuilderCart` at
  top-level parse time.
- **`canvas/alignment.js` before `canvas/canvas.js` and
  `layout/header-footer.js`** — both call
  `window.WebBuilderAlignment.attachInteraction()`/`toLocalCoords()` for
  drag/click handling and snapping.
- **`core/storage.js` and `canvas/canvas.js` before `toolbar.js`** —
  `toolbar.js` reads `window.WebBuilderCanvas` and `window.WebBuilderHistory`
  at top-level parse time.
- **`canvas/canvas.js` and `layout/header-footer.js` before `export.js`** —
  `export.js` reads both at top-level parse time.
- **`ui/shared-markup.js` before `editor/inspector.js` and
  `layout/header-footer.js`**: it fills the action-type `<select>` options
  and the text-format toolbar buttons that those two modules read `.value`
  from / bind id-based click listeners to, right after `DOMContentLoaded`.
  Both register their `DOMContentLoaded` listener, so as long as
  `shared-markup.js`'s listener is registered first (i.e. its `<script>`
  tag loads first), its markup is in place before either panel renders or
  binds.

`ui/toast.js`, `ui/modals.js` and `ui/tabs.js` have no load-order
requirement of their own — every module only calls
`window.WebBuilderToast?.show?.()` / `window.WebBuilderModals?.open?.()`
etc. from inside event handlers or `state.subscribe()` callbacks (i.e. at
runtime, long after all scripts have loaded), never at top-level parse
time.

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
no module keeps its own parallel state.

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
  New persistable fields must be added here.
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
`layout/header-footer.js`.

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
`actionType`/`actionUrl`/`actionMsg`/`productId` rename. Also contains the
**icon registry** (`window.WebBuilderIconRegistry`: `register`, `get`,
`getAll`, `addCustom`, `getCustomNames`) — pure data/registry, no DOM
access.

### `canvas/alignment.js`
Shared click+drag controller (`attachInteraction()`, Pointer Events, with
a movement threshold and `state.dragLock`) plus Canva-style center/edge
alignment-guide snapping (`window.WebBuilderAlignment`). Used by
`canvas/canvas.js` for canvas elements and by `layout/header-footer.js`
for bar items — neither of those files implements its own drag/snap
logic. Also exposes `toLocalCoords()`, used for translating pointer/drop
coordinates into the zoom-adjusted canvas coordinate space.

### `canvas/canvas.js`
Rendering of canvas elements, zoom, canvas size, drag-and-drop from the
palette, background-editor binding (until `editor/background.js` exists,
see folder structure above), palette UI for custom icons. Text-style CSS
(bold/italic/underline/font-family) for rendered elements comes from the
shared `WebBuilderUtils.buildTextStyleCss()` helper, also used by
`export.js`.

### `editor/inspector.js`
Right-hand properties panel for normal canvas elements: text content,
image, size, text formatting, click actions
(`actionType`/`actionUrl`/`actionMsg`/`productId`), advanced properties
(icon frame, shape style, modal content, message position),
duplicate/delete. The `<select>` options and toolbar buttons it binds to
are injected by `ui/shared-markup.js` — `inspector.js` itself never builds
that markup.

### `layout/header-footer.js`
Standalone domain for header/footer: state, rendering of the bars with
their elements on the canvas, resize handle, and its **own right-hand
inspector panel** for bar elements (separate from the normal element
inspector, since both panels are mutually exclusive). Drag/click
interaction for bar items goes through `canvas/alignment.js`'s
`attachInteraction()` (`window.WebBuilderAlignment`), not its own copy.
Like `editor/inspector.js`, its `<select>` options and toolbar buttons
come from `ui/shared-markup.js`.

### `shop/products.js`
Product management: CRUD + normalization + rendering/handling of the
product tab (`#product-list`, `#btn-add-product`). `window.WebBuilderProducts`
is the canonical interface used by `editor/inspector.js`,
`layout/header-footer.js`, `preview.js`, `core/storage.js`, `shop/cart-*.js`.
`window.WebBuilderProductsRuntime.render()` re-renders the tab.

### `shop/cart-data.js`
Cart data model: items, config (shape, colors, quantity control, price
display), discount code (demo: `DEMO10`), recommendations, milestones/
progress bar. References products only via IDs through
`window.WebBuilderProducts`. No DOM/rendering — exposed as
`window.WebBuilderCart`.

### `shop/cart-render.js`
Builds the shared cart HTML (progress bar, items, recommendation,
discount, totals) used by both the real drawer (`interactive: false`) and
the cart focus editor stage (`interactive: true`, see `cart-editor.js`),
so both stay pixel-identical apart from editing affordances. Also owns
the real slide-in drawer and the sidebar's three enable/disable toggles.
Exposes `window.WebBuilderCartRuntime` (`render`, `refresh`, `open`,
`close`, `buildCartHtml`) and `window.WebBuilderCartConfigRuntime`
(`render`, `renderRecommendList`, `renderMilestoneList`).

### `shop/cart-editor.js`
The cart focus editor ("Warenkorb-Editor", `state.cartFocusMode`): a
dedicated editing stage mounted into `.canvas-container`, showing the full
cart body (via `cart-render.js`'s `buildCartHtml()`) centered over the
canvas. Every top-level block (progress bar, discount field,
recommendation, checkout button, totals) is individually
selectable/draggable via `cartConfig.componentLayout`; individual
cart-item sub-parts (icon/name, qty, price, remove, description) via
`cartConfig.itemDisplay.layout`; the article box as a whole ("Artikel-
Darstellung") is selectable via its background and resizable via a drag
handle; the card background is selectable too. Drives the right-hand
`#cart-inspector-form` panel. Exposed as `window.WebBuilderCartFocus`
(`enter`, `exit`, `isActive`, `renderStage`, `renderPartPanel`).

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
  `layout/header-footer.js`'s `normalizeItem`) — `preview.js`/
  `editor/inspector.js` read only the canonical names.
- Drag interactions set `state.dragLock = true` while a move is active
  (see `canvas/alignment.js`). Any module that re-renders on state changes
  must respect this flag (see `scheduleRender()` in `canvas/canvas.js` and
  `render()` in `layout/header-footer.js`), otherwise a re-render
  mid-drag can replace the DOM node under the cursor and abort the move.
- Supabase password recovery: `Supabase/supabase-data.js` dispatches
  `CustomEvent("webbuilder:supabase-password-recovery")`,
  `Supabase/supabase-ui.js` listens and opens the password modal. Same
  pattern as `webbuilder:state-change` in `core/state.js`.

## Known technical debt

- Densely written files (`editor/inspector.js`, `shop/cart-*.js`,
  `canvas/elements.js`, `preview.js`) should eventually match the rest of
  the project's more readable style (multi-line, one statement per line).
- `editor/background.js` doesn't exist yet — the background editor is
  still part of `canvas/canvas.js`. Split it out once that area needs real
  growth.
- `pages/` is currently empty — reserved for future client-side
  multi-page logic once that feature outgrows what
  `Supabase/supabase-data.js` currently handles.
