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
├── builder.js            bootstrap / load order
├── state.js               shared state + event system + utils
├── toast.js                toast notifications
├── storage.js              snapshots, local save, undo/redo service
├── elements.js             canvas elements (CRUD) + icon registry
├── products.js             product management (CRUD + tab UI)
├── cart.js                 cart (data + drawer + config UI)
├── canvas.js               rendering, zoom, drag & drop, background
├── ui/
│   └── shared-markup.js    shared HTML for #prop-*/#bar-prop-* (see below)
├── inspector.js            properties panel for canvas elements
├── toolbar.js               zoom buttons, undo/redo buttons, save
├── header-footer.js        header/footer (data + rendering + inspector)
├── export.js                static HTML export
├── modals.js                 generic modal + positioned messages
├── preview.js                preview mode + click-action runtime
├── README.md                 this file
└── Supabase/                 see its own README
    ├── supabase-config.js
    ├── supabase-data.js
    ├── supabase-ui.js
    └── README.md
```

## Load order (from `builder.js`)

```text
state.js → toast.js → storage.js → elements.js → products.js → cart.js
→ canvas.js → ui/shared-markup.js → inspector.js → toolbar.js
→ header-footer.js → export.js → modals.js → preview.js
→ Supabase/supabase-config.js (module)
→ Supabase/supabase-data.js (module)
→ Supabase/supabase-ui.js (module)
```

Two dependencies matter most:

- **`products.js` before `cart.js`**, since `cart.js` references products
  exclusively via `window.WebBuilderProducts` (no own product data).
- **`ui/shared-markup.js` before `inspector.js` and `header-footer.js`**:
  it fills the action-type `<select>` options and the text-format toolbar
  buttons that those two modules read `.value` from / bind id-based click
  listeners to, right after `DOMContentLoaded`. Both register their
  `DOMContentLoaded` listener, so as long as `shared-markup.js`'s listener
  is registered first (i.e. its `<script>` tag loads first), its markup is
  in place before either panel renders or binds.

## Core building blocks

### `state.js`
Defines `window.WebBuilderState` — the full application state (elements,
products, cart, header/footer, background, zoom, history stacks). Also
provides the event system:

- `state.subscribe(fn)` — register a listener, receives
  `{domain, action, payload, state}`.
- `state.notify(domain, action, payload)` — called by any module when its
  data changes.

Every other module reads/writes exclusively through this `state` object —
no module keeps its own parallel state. Also exposes
`window.WebBuilderUtils` (`normalizeInPlace`, `escapeHtml`,
`buildTextStyleCss`) as shared, project-wide helpers.

### `storage.js`
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
  load/apply — this is where legacy-field migrations (see `elements.js`)
  run.

### `toast.js`
`window.WebBuilderToast.show(message, type)` — single place for the
stacked bottom-right notifications. `buildToastNode()` builds the raw
toast markup, also reused by `modals.js` (`openPositionedMessage()`).

### `modals.js`
`window.WebBuilderModals` — generic central modal (`open`, `openMessage`,
`close`) plus `openPositionedMessage()` for freely positioned messages
(top/bottom/left/right/center, configurable in the inspector). Both
message-building paths (`openMessage`'s escaping, `openPositionedMessage`'s
toast markup) reuse the shared `WebBuilderUtils.escapeHtml` /
`WebBuilderToast.buildToastNode` — no own copies.

### `ui/shared-markup.js`
Builds and injects HTML that `web.html` used to duplicate verbatim between
the normal element inspector (`#prop-*`) and the header/footer bar-item
inspector (`#bar-prop-*`): the 10-option click-action `<select>`, the
5-option font-family `<select>`, and the text-format toolbar (bold/
italic/underline/align buttons + color input + font-family select).
Builds strings only — no event binding, no state access. `web.html` now
ships `#prop-text-toolbar`/`#bar-item-text-toolbar` and
`#prop-action-type`/`#bar-prop-action-type` empty; this module fills them
in on load. All ids stay exactly what `inspector.js`/`header-footer.js`
already expect (`ttb-bold`, `prop-color`, `bar-ttb-bold`,
`bar-prop-color`, …), so neither of those two modules needed to change.
See "Load order" above for why this must load before both.

## Domain modules

### `elements.js`
Canvas elements (text, headline, button, image, box, shape, icon) as plain
data: CRUD (`add`, `update`, `remove`, `duplicate`), selection
(`setSelected`/`getSelected`). `normalizeState()` migrates legacy
click-action field names (`action`, `action_type`, `url`, `message`,
`product_id`, …) from elements saved before the
`actionType`/`actionUrl`/`actionMsg`/`productId` rename — same pattern as
`products.js`/`cart.js`/`header-footer.js`. Also contains the **icon
registry** (`window.WebBuilderIconRegistry`: `register`, `get`, `getAll`,
`addCustom`, `getCustomNames`) — pure data/registry, no DOM access.

### `canvas.js`
Rendering of canvas elements, zoom, canvas size, drag-and-drop from the
palette, background-editor binding, palette UI for custom icons. Also owns
the **shared interaction controller** `attachInteraction()` (click + drag
via Pointer Events, with a movement threshold and `state.dragLock`), which
`header-footer.js` reuses for bar elements. Text-style CSS (bold/italic/
underline/font-family) for rendered elements comes from the shared
`WebBuilderUtils.buildTextStyleCss()` helper, also used by `export.js`.

### `inspector.js`
Right-hand properties panel for normal canvas elements: text content,
image, size, text formatting, click actions
(`actionType`/`actionUrl`/`actionMsg`/`productId`), advanced properties
(icon frame, shape style, modal content, message position),
duplicate/delete. The `<select>` options and toolbar buttons it binds to
are injected by `ui/shared-markup.js` (see above) — `inspector.js` itself
never builds that markup.

### `header-footer.js`
Standalone domain for header/footer: state, rendering of the bars with
their elements on the canvas, resize handle, and its **own right-hand
inspector panel** for bar elements (separate from the normal element
inspector, since both panels are mutually exclusive). Like `inspector.js`,
its `<select>` options and toolbar buttons come from `ui/shared-markup.js`.

### `products.js`
Product management: CRUD + normalization + rendering/handling of the
product tab (`#product-list`, `#btn-add-product`). `window.WebBuilderProducts`
is the canonical interface used by `inspector.js`, `header-footer.js`,
`preview.js`, `storage.js`, `cart.js`.
`window.WebBuilderProductsRuntime.render()` re-renders the tab.

### `cart.js`
Cart domain: items, drawer rendering, config editor (shape, colors,
quantity control, price display), discount code (demo: `DEMO10`),
recommendations, milestones/progress bar. References products only via IDs
through `window.WebBuilderProducts`.

> Note: this one domain exposes **three** separate global objects —
> `window.WebBuilderCart` (data CRUD), `window.WebBuilderCartRuntime`
> (`render`, `open`, `close` of the drawer), `window.WebBuilderCartConfigRuntime`
> (`render`, `renderRecommendList`, `renderMilestoneList`,
> `renderCartItemDemo` for the sidebar config tab).

### `toolbar.js`
Top toolbar: zoom controls (delegates to `canvas.js`), undo/redo (uses
`storage.js`/history), local save binding. Exposes `refreshAllDomains()` —
re-renders all affected UI areas after undo/redo **or** a cloud load
(canvas, header/footer, cart, products).

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
  on load by each domain's `normalizeState()` (`elements.js`,
  `header-footer.js`'s `normalizeItem`) — `preview.js`/`inspector.js` read
  only the canonical names.
- Drag interactions set `state.dragLock = true` while a move is active.
  Any module that re-renders on state changes must respect this flag (see
  `scheduleRender()` in `canvas.js` and `render()` in `header-footer.js`),
  otherwise a re-render mid-drag can replace the DOM node under the cursor
  and abort the move.
- Supabase password recovery: `Supabase/supabase-data.js` dispatches
  `CustomEvent("webbuilder:supabase-password-recovery")`,
  `Supabase/supabase-ui.js` listens and opens the password modal. Same
  pattern as `webbuilder:state-change` in `state.js`.

## Known technical debt

- Densely written files (`inspector.js`, `cart.js`, `elements.js`,
  `preview.js`) should eventually match the rest of the project's more
  readable style (multi-line, one statement per line).
