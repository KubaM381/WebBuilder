WebBuilder

Visual drag-and-drop website builder (vanilla JS, no build tool/framework).
Users place elements via drag & drop, style header/footer, manage products
and a cart, and save projects locally or to Supabase.

Project structure

WebBuilder/
├── web.html              single HTML entry page (editor UI)
├── index.html             marketing/landing page — intentionally kept,
│                          not part of the builder app itself (confirmed
│                          by the project owner, not a "maybe delete" item)
├── README.md              this document
├── docs/
│   └── CART_EDITOR_TASKS.md  active task specification for the cart focus
│                          editor rework — read this before touching
│                          js/shop/cart-*.js (see js/shop/README.md)
├── css/
│   ├── README.md          CSS architecture, see there for details
│   └── *.css
└── js/
    ├── README.md          module index + load order + event conventions —
    │                      start here, then open the specific folder's own
    │                      README for the module you're actually touching
    ├── builder.js          bootstrap / load order (orchestrator only)
    ├── toolbar.js          zoom/undo/redo/save toolbar bindings
    ├── export.js            static HTML export
    ├── preview.js            preview mode + click-action runtime
    ├── core/                shared state, utils, storage/history
    │   └── README.md
    ├── canvas/              canvas rendering, drag/alignment, elements+icons
    │   └── README.md
    ├── editor/              right-hand inspector panel for canvas elements
    │   └── README.md
    ├── layout/              header/footer domain
    │   └── README.md
    ├── shop/                products + cart (data / rendering / focus editor)
    │   └── README.md        — see also ../../docs/CART_EDITOR_TASKS.md
    ├── ui/                  cross-domain UI helpers: toast, modals, shared
    │   └── README.md        inspector markup, sidebar-tab switching
    ├── pages/               reserved for future multi-page client logic
    │                        (currently only rudimentary in Supabase/)
    └── Supabase/            Supabase client, auth, project/page CRUD, cloud modal UI
        └── README.md

Every js/<folder>/ subfolder has its own README.md describing only the
modules that live in it. Read js/README.md first (load order + event
conventions are cross-cutting and only documented there), then open the
one or two folder READMEs relevant to the file you're changing — you
should rarely need to read all of them for a single change.

Core architecture at a glance





One central state: js/core/state.js defines window.WebBuilderState —
the single source of truth for elements, products, cart, header/footer,
background, zoom, history. js/core/utils.js provides the shared,
stateless helpers (escapeHtml, buildTextStyleCss, normalizeInPlace).



Pub/sub instead of direct coupling: modules change state and call
state.notify(domain, action, payload); other modules listen via
state.subscribe(fn) for the domains they care about ("elements",
"products", "cart", "preview", "background", "selection").
Header/footer changes are the one exception — see js/README.md's
"Event conventions" section.



One serialization format for everything: js/core/storage.js →
createSnapshot() / applySnapshot(). Shared by local save, undo/redo
and Supabase cloud save. A new persistable property must be added
here, or it's lost on save/load.



Shared drag/click + alignment guides: js/canvas/alignment.js
(window.WebBuilderAlignment) owns the pointer-event drag controller and
Canva-style center/edge alignment-guide snapping (window.WebBuilderAlignment).
Used today by canvas/canvas.js (canvas elements) and
layout/header-footer.js (bar items). The cart focus editor
(shop/cart-editor.js) does not use it yet and currently implements
its own bespoke dragging with no snapping — see
docs/CART_EDITOR_TASKS.md task T11 for the planned fix.



One module per domain, self-initializing on load
(DOMContentLoaded), exposing its API under window.WebBuilderXxx.
Details: see js/README.md and the relevant folder README.



Load order matters: js/builder.js loads all modules in sequence via
document.write. shop/products.js must load before
shop/cart-data.js (cart-data.js references products only via
window.WebBuilderProducts), js/canvas/alignment.js must load
before canvas/canvas.js and layout/header-footer.js, and
js/ui/shared-markup.js must load before editor/inspector.js/
layout/header-footer.js (see js/README.md).



Supabase schema

projects (id, user_id, name, slug, updated_at)
   └── pages (id, project_id, name, slug, content JSON, updated_at)

content in pages is exactly the result of
WebBuilderStorage.createSnapshot() — never build a separate, different
format.

Security





The client (js/Supabase/supabase-config.js) may contain only the
publishable key, never a secret/service-role key.



Access control runs through Supabase Row Level Security (RLS) at the DB
level, not client-side logic.



For further development (including AI assistants)





Before any change: read only the files actually affected. Start at

js/README.md, then open just the specific folder README(s) for the
 module(s) you're touching (see "Project structure" above) — don't read
 every folder README for a single-file change.



If you're picking up cart-focus-editor work, read

docs/CART_EDITOR_TASKS.md first — it is the current, authoritative
 task list for that area (including flagged open questions that need
 product-owner sign-off before implementing).



No drive-by refactors — if a structural improvement seems useful,

propose it instead of doing it unasked (or note it under
 docs/CART_EDITOR_TASKS.md's "Open questions / parking lot" if you're
 already there for other reasons).



Always add new persistable state fields to core/storage.js too

(createSnapshot/applySnapshot) — note that nested fields under
 state.cartConfig/state.background/etc. are already covered since
 those top-level objects are cloned whole; only a genuinely new
 top-level state.* field needs an explicit addition there.



Keep new comments short (why, not bug history). History belongs in

commit messages.



Comments and READMEs are written in English; chat with the developer

stays in German. UI copy shown to end users (labels, button text,
 toasts) stays German, matching the existing app.



Before editing any file, make sure you actually have its complete,

untruncated current content — if you're unsure, say so instead of
 guessing or reconstructing from memory. A truncated file that gets
 pasted back into the repo as-is causes a silent JS syntax error: the
 whole script fails to run, its window.WebBuilderXxx API is never
 defined, and every other module's optional-chaining call into it
 (window.WebBuilderXxx?.method?.()) fails silently with no console
 error.



Known technical debt





editor/inspector.js, shop/cart-*.js, canvas/elements.js,
preview.js are densely written (many statements per line) — harder to
read than the rest of the project; should be unified to the rest of the
codebase's style (multi-line, one statement per line) next time they're
touched.



js/editor/background.js doesn't exist yet — the background editor
still lives inside canvas/canvas.js (bindBackgroundEditor()). Split
it out once that area needs real growth (see js/README.md).



The cart focus editor (shop/cart-editor.js) has a substantial,
actively-tracked list of gaps and bugs — see docs/CART_EDITOR_TASKS.md
instead of duplicating that list here.



Note for future AI sessions: this list reflects only what is genuinely
still open. Items that get fixed should be removed here, not left
marked "done" — completed work stays in git/chat history instead.
