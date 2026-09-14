JavaScript Architecture

No bundler, no framework. Every module attaches its public API to
window.WebBuilderXxx. js/builder.js loads all other files in a fixed
order via document.write — the order in builder.js is functionally
relevant, not just cosmetic. Exception: the three type="module" lines
at the end (Supabase) — their actual load order is resolved by the browser
via ES import statements, not by document.write() order.

This file only covers what is cross-cutting (folder layout, load
order, shared event conventions) plus the handful of top-level files that
don't live in a subfolder. For the actual modules, open the README.md
inside the specific subfolder you're working on:





core/README.md — state, utils, storage/history



canvas/README.md — canvas rendering, elements+icons, shared drag/align



editor/README.md — right-hand inspector for normal canvas elements



layout/README.md — header/footer domain



shop/README.md — products + cart (data/rendering/focus editor) — see
also ../docs/CART_EDITOR_TASKS.md for the cart editor's current task
list before touching anything under shop/



ui/README.md — toast, modals, shared inspector markup, sidebar tabs



Supabase/README.md — Supabase client, auth, project/page CRUD, cloud
modal UI



Folder structure

js/
├── builder.js             bootstrap / load order (orchestrator only)
├── toolbar.js              zoom buttons, undo/redo buttons, save
├── export.js                static HTML export
├── preview.js                preview mode + click-action runtime
├── README.md                 this file
│
├── core/                     see core/README.md
│   ├── state.js
│   ├── utils.js
│   └── storage.js
│
├── canvas/                   see canvas/README.md
│   ├── canvas.js
│   ├── alignment.js
│   └── elements.js
│
├── editor/                   see editor/README.md
│   └── inspector.js
│
├── layout/                   see layout/README.md
│   └── header-footer.js
│
├── shop/                     see shop/README.md
│   ├── products.js
│   ├── cart-data.js
│   ├── cart-render.js
│   ├── cart-preview-bars.js
│   └── cart-editor.js
│
├── pages/                       reserved for a future multi-page client
│                              feature (currently only rudimentary support
│                              lives in Supabase/supabase-data.js) — empty
│                              for now
│
├── ui/                        see ui/README.md
│   ├── toast.js
│   ├── modals.js
│   ├── shared-markup.js
│   └── tabs.js
│
└── Supabase/                     see its own README
    ├── supabase-config.js
    ├── supabase-data.js
    ├── supabase-ui.js
    └── README.md



Load order (from builder.js)

core/state.js → core/utils.js → ui/toast.js → core/storage.js
→ canvas/elements.js → shop/products.js → shop/cart-data.js
→ shop/cart-render.js → shop/cart-preview-bars.js → shop/cart-editor.js
→ canvas/alignment.js → canvas/canvas.js → ui/shared-markup.js
→ editor/inspector.js → toolbar.js → layout/header-footer.js → export.js
→ ui/modals.js → preview.js → ui/tabs.js
→ Supabase/supabase-config.js (module)
→ Supabase/supabase-data.js (module)
→ Supabase/supabase-ui.js (module)

Dependencies that matter most (each module reads the ones before it via
window.WebBuilderXxx at top-level parse time, not just at runtime):





core/utils.js before anything that uses window.WebBuilderUtils at
parse time — shop/products.js, shop/cart-data.js,
canvas/canvas.js and layout/header-footer.js all read it immediately
when their script runs (not inside a deferred callback).



canvas/elements.js before canvas/canvas.js and
editor/inspector.js — both read window.WebBuilderElements at
top-level parse time.



shop/products.js before shop/cart-data.js, since cart-data.js
references products exclusively via window.WebBuilderProducts (no own
product data).



shop/cart-data.js before shop/cart-render.js,
shop/cart-preview-bars.js and shop/cart-editor.js — all three read
window.WebBuilderCart and/or window.WebBuilderState at top-level
parse time. shop/cart-preview-bars.js is otherwise fully independent
of the other shop/cart-*.js files (see shop/README.md).



canvas/alignment.js before canvas/canvas.js and
layout/header-footer.js — both call
window.WebBuilderAlignment.attachInteraction()/toLocalCoords() for
drag/click handling and snapping. Not currently used by
shop/cart-editor.js — see ../docs/CART_EDITOR_TASKS.md task T11.



core/storage.js and canvas/canvas.js before toolbar.js —
toolbar.js reads window.WebBuilderCanvas and window.WebBuilderHistory
at top-level parse time.



canvas/canvas.js and layout/header-footer.js before export.js —
export.js reads both at top-level parse time.



ui/shared-markup.js before editor/inspector.js and
layout/header-footer.js: it fills the action-type <select> options
and the text-format toolbar buttons that those two modules read .value
from / bind id-based click listeners to, right after DOMContentLoaded.
Both register their DOMContentLoaded listener, so as long as
shared-markup.js's listener is registered first (i.e. its <script>
tag loads first), its markup is in place before either panel renders or
binds.

ui/toast.js, ui/modals.js and ui/tabs.js have no load-order
requirement of their own — every module only calls
window.WebBuilderToast?.show?.() / window.WebBuilderModals?.open?.()
etc. from inside event handlers or state.subscribe() callbacks (i.e. at
runtime, long after all scripts have loaded), never at top-level parse
time.

Top-level files (no subfolder)



toolbar.js

Top toolbar: zoom controls (delegates to canvas/canvas.js), undo/redo
(uses core/storage.js/history), local save binding. Exposes
refreshAllDomains() — re-renders all affected UI areas after undo/redo
or a cloud load (canvas, header/footer, cart, products).

preview.js

Preview mode (hides editor chrome) plus the runtime for click actions in
preview/live mode (window.WebBuilderActionRuntime.execute(item)):
scrolling, browser history, opening a URL, adding a product to the cart,
opening the cart drawer, opening a modal, showing a message.

export.js

Builds a static HTML document (header/elements/footer) from the current
state for the export button. No own state, no cart/product logic — a pure
snapshot-to-HTML renderer.

Event conventions





Elements/state uniformly use these field names for click actions:
actionType, actionUrl, actionMsg, productId. Legacy names
(action, action_type, product_id, message, …) are migrated once
on load by each domain's normalizeState() (canvas/elements.js,
layout/header-footer.js's normalizeItem) — preview.js/
editor/inspector.js read only the canonical names.



Drag interactions set state.dragLock = true while a move is active
(see canvas/alignment.js). Any module that re-renders on state changes
must respect this flag (see scheduleRender() in canvas/canvas.js and
render() in layout/header-footer.js), otherwise a re-render
mid-drag can replace the DOM node under the cursor and abort the move.
shop/cart-editor.js does not use canvas/alignment.js yet and
implements its own dragging — see ../docs/CART_EDITOR_TASKS.md T11.



Supabase password recovery: Supabase/supabase-data.js dispatches
CustomEvent("webbuilder:supabase-password-recovery"),
Supabase/supabase-ui.js listens and opens the password modal. Same
pattern as webbuilder:state-change in core/state.js.



Known technical debt

See root README.md's "Known technical debt" section — kept there, not
duplicated here, so there's exactly one place to check.
